import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import { CoordinatorEmptyState } from '@/components/shared/coordinator-empty-state';
import { DespachoKpiRow, type DespachoKpis } from '@/components/shared/despacho-kpi-row';
import { JobIndicadoresCard } from '@/components/shared/job-indicadores-card';
import { JobSummaryCard } from '@/components/shared/job-summary-card';
import { LiveDispatchCard } from '@/components/shared/live-dispatch-card';
import { ResponsesPanel } from '@/components/shared/responses-panel';
import { SearchBox } from '@/components/ui/search-box';
import { TrabajoRow } from '@/components/shared/trabajo-row';
import { TwoColumnLayout } from '@/components/shared/two-column-layout';
import { EmptyState } from '@/components/shared/empty-state';
import { Search } from 'lucide-react';
import type { RadarInstallerState } from '@/components/shared/radar';
import { ELIGIBLE_ORDER } from '@/constants';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { ofertasRepository } from '@/repositories';
import { getCoordinatorKpis, getTrabajosByTienda, type CoordinatorKpis, type TableRow } from '@/services';
import type { CoordinatorLayoutOutletContext } from '@/layouts/CoordinatorLayout';

/**
 * Props mock de `Radar`/`LiveCountdown` -- reubicadas verbatim desde
 * `RootLayout.tsx` (Sprint 3.7/3.9), sin ningún cambio de valores/lógica.
 * Se pasan a `LiveDispatchCard` (Sprint 5.1.3) -- ver JSDoc completo de esa
 * integración temporal en `live-dispatch-card.tsx`.
 *
 * **Sprint 5.2.1** ("Publish Workflow"): siguen siendo valores fijos, sin
 * relación con el `activeJob` real creado por el flujo de publicación --
 * por instrucción explícita de este Sprint ("NO modificar Radar", "NO
 * modificar Countdown", Regla 20: "este Sprint únicamente implementa el
 * flujo Publish"), no se conectan a datos reales del Job publicado. Quedan
 * para un Sprint futuro (motor de subasta, Sprint 5.3).
 */
const RADAR_DEMO_NOTIFIED = ['pty', 'climatech', 'frio', 'airepro', 'cool'] as const;
const RADAR_DEMO_INST_STATE: Record<string, RadarInstallerState> = {
  pty: { state: 'notified' },
  climatech: { state: 'opened' },
  frio: { state: 'responding' },
  airepro: { state: 'responded' },
  cool: { state: 'selected' },
};
const LIVECOUNTDOWN_DEMO_PUBLISHED_AT = Date.now() - 60_000;
const LIVECOUNTDOWN_DEMO_BID_MINS = 5;

/**
 * ZERO_KPIS — corrección puntual posterior a "Coordinator KPI Loading
 * Resolution" (instrucción directa del usuario, sin brief formal de Sprint
 * nuevo): "`CoordinatorKpiRow` debe renderizarse siempre... si
 * `getCoordinatorKpis()` devuelve `[]` o no existen registros, el componente
 * debe recibir un objeto de KPIs con todos los valores en cero." No es un
 * mock ni un dato inventado: es el mismo objeto `CoordinatorKpis` real que
 * `calcularKpis()` (`dashboard.service.ts`) ya devuelve para `rows = []`
 * (`{pendientes:0, activos:0, finalizados:0, programadosHoy:0, total:0}`) --
 * aquí se declara localmente como el valor por defecto de `kpis` (nunca
 * `null`) para cubrir, con ese mismo valor legítimo, cualquier instante en
 * que todavía no exista una respuesta real de Supabase (`tiendaId`
 * resolviéndose, error de Postgrest/RLS, tienda inexistente, o el instante
 * inicial antes del primer fetch). `CoordinatorKpiRow` no cambia su
 * contrato (`{kpis: CoordinatorKpis}`) ni se modifica en este ajuste.
 */
const ZERO_KPIS: CoordinatorKpis = {
  pendientes: 0,
  activos: 0,
  finalizados: 0,
  programadosHoy: 0,
  total: 0,
};

/**
 * DespachoPage — "Despacho en vivo", ruta `/despacho` (Sprint 5.1, primera
 * ruta real de `ARCHITECTURE.md §8` para el Coordinador). Es el landing
 * real del Coordinador autenticado (Entregable 1: "cuando rol=coordinador,
 * cargar automáticamente sin intervención del usuario" -- ver
 * `AppRouter.tsx`, redirección desde `/`).
 *
 * **Ajuste Sprint 5.1.2** ("Refactor del Layout Operativo del
 * Coordinador"): `SucursalSelect`/`CoordinatorSubtabs` se retiraron de aquí
 * -- viven una única vez en `CoordinatorLayout.tsx`. Ver su JSDoc completo.
 *
 * **Ajuste Sprint 5.1.3** ("Implementación del Workspace Operativo del
 * Coordinador"): reemplazó por completo el bloque anterior
 * (`CoordinatorEmptyState`+`Radar`+`LiveCountdown`+botón "Cancelar" sueltos)
 * por el Workspace real: `TwoColumnLayout` (`variant="despacho"`, YA
 * EXISTENTE desde Fase 3, sin cambios) con `JobSummaryCard`+
 * `LiveDispatchCard`+KPIs en la columna izquierda (`mx-col`, mismo orden de
 * anidación que `Coordinator()` en el HTML oficial) y `ResponsesPanel` en
 * la derecha.
 *
 * **Ajuste Sprint 5.1.4/5.1.5**: `activeJob` (`JobSummaryCardJob | null`)
 * se estableció como el único estado de control (Reglas 19/21) entre
 * `CoordinatorEmptyState` y el Workspace completo -- inicialmente vivía en
 * este archivo, fijado a un job de demostración (`JOB_DEMO`) detrás de un
 * flag manual (`DEMO_MODE`).
 *
 * **Sprint 5.2.1** ("Publish Workflow — Estado Local MVP"): `JOB_DEMO`/
 * `DEMO_MODE` se RETIRAN por completo de este archivo (Regla 17: "`JOB_DEMO`
 * debe desaparecer completamente del flujo normal... nunca controlar la UI
 * mediante `JOB_DEMO`") -- ya no hacen falta, porque `activeJob` ahora es
 * estado React REAL (Regla 18: "toda la UI debe depender únicamente del
 * estado `activeJob`"), producido por el flujo de publicación real
 * (`CoordinatorEmptyState` → `PublishModal` → confirmar → Job temporal →
 * `activeJob`). Ese estado, por una contradicción real detectada en la
 * auditoría de este Sprint (`PublishModal`/su único callback `onPublish`
 * viven en `CoordinatorLayout.tsx`, nunca en este archivo -- decisión
 * explícita del Sprint 5.1.2), no puede vivir aquí: vive en
 * `CoordinatorLayout.tsx` (cambio mínimo autorizado explícitamente por el
 * usuario tras consulta previa, ver su JSDoc completo "Cambio mínimo —
 * Sprint 5.2.1") y se consume acá vía `CoordinatorLayoutOutletContext`,
 * igual que `onOpenPublish`/`onOpenConfirmCancel` ya se consumían desde el
 * Sprint 5.1.2. Este archivo no crea ningún estado nuevo para el Job en sí
 * -- solo LEE `activeJob` del contexto y deriva de él lo que ya derivaba
 * antes (`remainingSeconds` = `activeJob.bidMins * 60`, en vez del valor fijo
 * `JOB_DEMO_REMAINING_SECONDS` anterior -- mismo campo real ya existente en
 * `JobSummaryCardJob`, ninguna lógica de subasta nueva).
 *
 * **KPIs / "Indicadores"**: `CoordinatorKpiRow` (Sprint 5.1, agregado
 * dashboard sin equivalente en el HTML oficial) permanece SIN NINGÚN
 * CAMBIO -- mismo componente, mismo fetch (`dashboard.service.ts`/
 * `getCoordinatorKpis`), mismo contrato. `JobIndicadoresCard` (Sprint 5.1.4)
 * lo envuelve con el marco visual real de "Indicadores" (título/ícono/
 * `mx-goal`). `kpisError` (Sprint 5.1.5) se sigue mostrando fuera de ese
 * bloque, sin cambios en esta ronda.
 *
 * **Qué NO hace este Sprint** (excluido explícitamente por el propio
 * brief): conexión de Supabase, persistencia, API, motor de subasta real,
 * asignación real, modificación visual de `PublishModal`/`CoordinatorLayout`.
 * `LiveDispatchCard`/`ResponsesPanel` siguen usando props de demostración
 * fijas (Radar/Countdown, explícitamente protegidos) -- únicamente el Job
 * en sí (`JobSummaryCard`) refleja datos reales del formulario publicado.
 *
 * **Ajuste Sprint 5.1.1** ("Ajuste final -- Modo Administrador
 * Superusuario"): `tiendaId` ya no se lee de `profile.tiendaId` (vía
 * `useAuth()`) directamente -- se lee de `useOperationalContext()` (ver
 * `OperationalContextProvider.tsx`). Para un Coordinador real el valor es
 * idéntico y síncrono (cero cambio de comportamiento); para un `admin`
 * viendo esta vista en Modo de Visualización superusuario, se resuelve de
 * forma real (no mock) contra la empresa/tienda reales -- ver ese Provider
 * para el detalle completo. Esta página ya no necesita saber cuál de los
 * dos casos es.
 */
export function DespachoPage() {
  const { tiendaId, loading: contextoLoading, error: contextoError } = useOperationalContext();
  const { onOpenPublish, onOpenConfirmCancel, activeJob } =
    useOutletContext<CoordinatorLayoutOutletContext>();

  /**
   * Evolución de Despacho en vivo hacia un centro operativo real (Ajustes
   * finales del flujo Instalador, ronda de Despacho/Ofertas/Búsqueda/KPIs).
   *
   * **Problema real detectado (auditoría previa, confirmada por el
   * usuario)**: hasta esta ronda, "Despacho en vivo" dependía
   * EXCLUSIVAMENTE de `activeJob` -- estado en memoria de
   * `OperationalContextProvider`, poblado únicamente por el flujo de
   * publicación de ESTA sesión. Recargar la página, o simplemente no haber
   * publicado nada en la sesión activa, mostraba `CoordinatorEmptyState`
   * aunque existieran trabajos `live` reales con ofertas esperando revisión
   * -- la única forma de verlas era navegar a "Mis trabajos" → detalle.
   *
   * **Solución**: se agrega una fuente de datos real independiente de
   * `activeJob` -- `getTrabajosByTienda()` (mismo servicio ya usado por
   * `TrabajosPage.tsx`, sin duplicar lógica), de la que se derivan tanto la
   * lista de trabajos `live` como los 4 KPIs nuevos (`DespachoKpiRow`), sin
   * ninguna consulta adicional por indicador. `activeJob` se mantiene 100%
   * compatible: sigue siendo la selección por defecto al publicar (mismo
   * `JobSummaryCard`/`LiveDispatchCard` de siempre, sin cambios visuales),
   * y el trabajo recién publicado aparece de inmediato en la lista general
   * (mismo `activeJob?.id` como dependencia de recarga, patrón ya
   * establecido por el efecto de KPIs de arriba).
   *
   * `CoordinatorKpiRow`/`JobIndicadoresCard` NO se modifican -- siguen
   * mostrando exactamente lo mismo que antes, para el trabajo destacado.
   */
  const [trabajos, setTrabajos] = useState<TableRow<'trabajos'>[] | null>(null);
  const [ofertasCountByTrabajoId, setOfertasCountByTrabajoId] = useState<Record<string, number>>({});
  const [selectedTrabajoId, setSelectedTrabajoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Ajuste posterior a "Coordinator KPI Loading Resolution" (instrucción
  // directa del usuario): `kpis` deja de ser `CoordinatorKpis | null` --
  // ahora es SIEMPRE un objeto válido, nunca `null`, con `ZERO_KPIS` como
  // valor por defecto. Esto elimina la necesidad de cualquier señal de
  // "cargando" para decidir si se muestra `CoordinatorKpiRow`: ya no se
  // oculta nunca, se renderiza siempre con el `kpis` disponible en cada
  // instante (cero mientras no haya datos reales, poblado en cuanto los
  // haya). Por eso el estado `kpisLoading` introducido en la ronda anterior
  // (y el `<Loading/>` que gobernaba en `JobIndicadoresCard`) se retiran por
  // completo en este ajuste -- ya no tienen ningún consumidor real, y
  // dejarlos declarados sin leer sería un `TS6133` real (no un artefacto de
  // entorno).
  const [kpis, setKpis] = useState<CoordinatorKpis>(ZERO_KPIS);
  const [kpisError, setKpisError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Sprint 5.1.1 -- mientras el Contexto Operativo todavía resuelve
    // `tiendaId` (solo ocurre para un `admin` viendo "Coordinador", ver
    // `OperationalContextProvider.tsx`), no se toca `kpisError` todavía.
    // `kpis` se deja en `ZERO_KPIS` (nunca `null`) -- `CoordinatorKpiRow` se
    // sigue mostrando, con ceros, mientras la resolución real está en
    // curso, en vez de ocultarse. Para un Coordinador real, `contextoLoading`
    // siempre es `false` -- este `if` nunca frena nada para ese caso.
    if (contextoLoading) {
      setKpis(ZERO_KPIS);
      setKpisError(null);
      return;
    }

    // El propio Contexto Operativo puede reportar un error real (ej. la
    // sucursal elegida en `SucursalSelect` todavía no existe en la tabla
    // real `tiendas` para la empresa Multimax) -- se muestra ese mensaje
    // en vez del genérico de "sin tienda asignada", más preciso para el
    // caso de un `admin` en modo superusuario. Por instrucción explícita del
    // usuario, este caso NO impide que `CoordinatorKpiRow` se muestre: se
    // muestra igual, con `ZERO_KPIS`, en vez de ocultarse -- el mensaje de
    // `kpisError` se sigue mostrando aparte, fuera de ese bloque (sin
    // cambios respecto de Sprint 5.1.5).
    if (contextoError) {
      setKpis(ZERO_KPIS);
      setKpisError(contextoError);
      return;
    }

    if (!tiendaId) {
      setKpis(ZERO_KPIS);
      setKpisError('Tu perfil de coordinador no tiene una tienda asignada.');
      return;
    }

    setKpisError(null);
    getCoordinatorKpis(tiendaId)
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setKpis(result.data);
        } else {
          // Un error real de Postgrest/RLS (`result.ok === false`) tampoco
          // oculta `CoordinatorKpiRow`: se muestra con `ZERO_KPIS` (nunca
          // queda un valor obsoleto de una tienda anterior) y `kpisError` se
          // puebla para el mensaje que se muestra aparte.
          setKpis(ZERO_KPIS);
          setKpisError(result.error.message);
        }
      })
      // Sprint 5.2.1 Fix ("Publish Workflow Stabilization", ronda anterior)
      // — Objetivo 4: si `getCoordinatorKpis(tiendaId)` rechaza (p. ej. una
      // falla de red, distinta de un error normal de Postgrest, que ya se
      // maneja arriba vía `result.ok === false`), este `.catch()` sigue
      // siendo necesario para que `kpisError` se puebre en vez de quedar en
      // `null` para siempre. `getCoordinatorKpis()`/
      // `trabajosRepository.getByTiendaId()`/`toServiceResult()` en sí NO
      // son el origen de ningún bloqueo (auditados de nuevo en esta ronda,
      // sin cambios: si la promesa que reciben SE RESUELVE -- con datos o
      // con un error de Postgrest -- siempre entregan un `ServiceResult`
      // explícito, nunca queda pendiente).
      .catch((err: unknown) => {
        if (!active) return;
        setKpis(ZERO_KPIS);
        setKpisError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los indicadores (error de red inesperado).',
        );
      });
    return () => {
      active = false;
    };
    // `activeJob?.id` -- Sprint 5.2.3.3.1 ("Persistencia real del flujo
    // Publish"). Hallazgo de auditoría (no relacionado con el INSERT en sí,
    // ya confirmado correcto -- ver el reporte técnico de este Sprint): este
    // efecto nunca dependía de `activeJob`, por lo que un `INSERT` real y
    // exitoso en `trabajos` (Sprint 5.2.2.1, sin cambios) no disparaba una
    // nueva consulta a `getCoordinatorKpis()` -- "Despacho en vivo" mostraba
    // el trabajo recién publicado (estado de React, `activeJob`) mientras
    // "Indicadores" seguía mostrando los valores de ANTES de publicar, hasta
    // que `tiendaId` cambiara o la página se remontara. Se agrega `activeJob
    // ?.id` (no el objeto completo, para no depender de su identidad de
    // referencia) para que los KPIs se recarguen cada vez que cambia el
    // trabajo activo (al publicar -- `null` → id real -- y al cancelar --
    // id real → `null`), sin duplicar la llamada a `getCoordinatorKpis()`
    // (misma función, mismo servicio, ya existente) ni tocar
    // `CoordinatorLayout.tsx`/`trabajosRepository`/`OperationalContextProvider`.
  }, [tiendaId, contextoLoading, contextoError, activeJob?.id]);

  // Todos los trabajos de la tienda (cualquier estado) -- misma consulta
  // real que ya usa `TrabajosPage.tsx`. `activeJob?.id` como dependencia
  // adicional: un publish real (INSERT ya confirmado en Supabase, ver
  // `CoordinatorLayout.tsx`) debe reflejarse acá de inmediato, sin esperar
  // a que cambie `tiendaId`.
  useEffect(() => {
    if (!tiendaId) {
      setTrabajos(null);
      return;
    }
    let active = true;
    getTrabajosByTienda(tiendaId).then((result) => {
      if (!active) return;
      if (result.ok) {
        setTrabajos(result.data);
      }
    });
    return () => {
      active = false;
    };
  }, [tiendaId, activeJob?.id]);

  const trabajosLive = useMemo(
    () => (trabajos ?? []).filter((trabajo) => trabajo.estado === 'live'),
    [trabajos],
  );

  // Conteo de ofertas por trabajo, en lote (una sola consulta para todos
  // los `live`, no N+1) -- `liveIds` (string estable) en vez de
  // `trabajosLive` (nuevo array en cada render) como dependencia real.
  const liveIds = trabajosLive.map((trabajo) => trabajo.id).join(',');
  useEffect(() => {
    const ids = liveIds ? liveIds.split(',') : [];
    if (ids.length === 0) {
      setOfertasCountByTrabajoId({});
      return;
    }
    let active = true;
    ofertasRepository.getByTrabajoIds(ids).then((result) => {
      if (!active) return;
      if (result.ok) {
        const counts: Record<string, number> = {};
        for (const oferta of result.data) {
          counts[oferta.trabajo_id] = (counts[oferta.trabajo_id] ?? 0) + 1;
        }
        setOfertasCountByTrabajoId(counts);
      }
    });
    return () => {
      active = false;
    };
  }, [liveIds]);

  // Selección por defecto: el trabajo recién publicado en esta sesión
  // (`activeJob`, comportamiento histórico preservado -- mismo criterio que
  // antes, cuando era el único trabajo visible) si todavía no hay ninguna
  // selección explícita; si no existe, el primero de la lista `live`.
  useEffect(() => {
    if (selectedTrabajoId) return;
    if (activeJob?.trabajoId) {
      setSelectedTrabajoId(activeJob.trabajoId);
      return;
    }
    if (trabajosLive.length > 0) {
      setSelectedTrabajoId(trabajosLive[0].id);
    }
  }, [activeJob?.trabajoId, trabajosLive, selectedTrabajoId]);

  // Búsqueda -- filtrado 100% client-side sobre los trabajos `live` ya
  // cargados (volumen real verificado vía MCP: unas pocas unidades por
  // tienda hoy) -- sin consulta a Supabase por cada tecla. Campos
  // existentes reales de `trabajos`, ninguno inventado.
  const trabajosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return trabajosLive;
    return trabajosLive.filter((trabajo) =>
      [trabajo.codigo, trabajo.cliente_nombre, trabajo.direccion_exacta, trabajo.calle, trabajo.tipo, trabajo.zona]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(q)),
    );
  }, [trabajosLive, busqueda]);

  /**
   * `DespachoKpiRow` -- ver JSDoc de ese componente para la definición
   * exacta de cada contador (coincide verbatim con la aprobada):
   * "Con ofertas" = trabajos `live` con >= 1 oferta real. "Por asignar" =
   * mismo conjunto (un trabajo `live` con ofertas es exactamente el que
   * requiere selección/asignación manual -- no se inventa un estado de
   * negocio nuevo que los distinga). "Asignados hoy" = `estado='assigned'`
   * cuyo `asignado_at` cae en la fecha de hoy.
   */
  const despachoKpis: DespachoKpis = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const conOfertas = trabajosLive.filter((trabajo) => (ofertasCountByTrabajoId[trabajo.id] ?? 0) > 0).length;
    return {
      activos: trabajosLive.length,
      conOfertas,
      porAsignar: conOfertas,
      asignadosHoy: (trabajos ?? []).filter(
        (trabajo) => trabajo.estado === 'assigned' && (trabajo.asignado_at ?? '').slice(0, 10) === hoy,
      ).length,
    };
  }, [trabajos, trabajosLive, ofertasCountByTrabajoId]);

  // Se invoca desde `ResponsesPanel` (`onAsignado`) justo después de una
  // asignación exitosa -- el trabajo recién asignado deja de ser `live`,
  // así que debe desaparecer de esta lista sin esperar a un remount/cambio
  // de tienda. No es Realtime real (ningún canal/suscripción nueva) --
  // mismo criterio ya aplicado en `AuthProvider.tsx` para el caso análogo
  // de `documentos_ok`: reutilizar el mecanismo de consulta ya existente en
  // vez de crear infraestructura de push nueva sin autorización explícita.
  const recargarTrabajos = () => {
    if (!tiendaId) return;
    getTrabajosByTienda(tiendaId).then((result) => {
      if (result.ok) setTrabajos(result.data);
    });
  };

  // Regla 19 (mutuamente excluyente), extendida: `CoordinatorEmptyState`
  // únicamente si YA se resolvió la consulta (`trabajos !== null`, evita un
  // parpadeo del estado vacío mientras carga) y no existe absolutamente
  // ningún trabajo `live` -- ni siquiera el recién publicado en esta sesión
  // (`activeJob`, que técnicamente ya debería estar incluido en `trabajos`
  // tras el recargo por `activeJob?.id`, pero se conserva la condición
  // explícita como defensa adicional, cero costo).
  if (trabajos !== null && trabajosLive.length === 0 && !activeJob) {
    return <CoordinatorEmptyState onOpenPublish={onOpenPublish} />;
  }

  // El "trabajo destacado" (`JobSummaryCard`/`LiveDispatchCard`, con su
  // countdown/radar reales) sigue siendo EXCLUSIVAMENTE el publicado en
  // esta sesión (`activeJob`) -- mismo alcance exacto de siempre, sin
  // extender ese bloque a cualquier trabajo de la lista (no hay datos
  // reales de notificación/radar para un trabajo `live` antiguo, inventarlos
  // violaría "no fingir una funcionalidad que no existe").
  const trabajoDestacado = activeJob && selectedTrabajoId === activeJob.trabajoId ? activeJob : null;

  return (
    <TwoColumnLayout
      variant="despacho"
      left={
        <section className="mx-col">
          {trabajoDestacado ? (
            <>
              <JobSummaryCard
                job={trabajoDestacado}
                remainingSeconds={trabajoDestacado.bidMins * 60}
                onOpenPublish={onOpenPublish}
              />
              <LiveDispatchCard
                notified={RADAR_DEMO_NOTIFIED}
                instState={RADAR_DEMO_INST_STATE}
                eligibleIds={ELIGIBLE_ORDER}
                publishedAt={LIVECOUNTDOWN_DEMO_PUBLISHED_AT}
                bidMins={LIVECOUNTDOWN_DEMO_BID_MINS}
                onCancel={onOpenConfirmCancel}
              />
            </>
          ) : null}
          {kpisError && (
            <p className="mx-sub" style={{ marginBottom: 14 }}>
              {kpisError}
            </p>
          )}
          <JobIndicadoresCard kpis={kpis} bidMins={activeJob?.bidMins ?? 5} />
          <DespachoKpiRow kpis={despachoKpis} />
          <SearchBox
            placeholder="Buscar por JOB, cliente, dirección, zona…"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
          {trabajosFiltrados.length === 0 ? (
            <EmptyState
              size="compact"
              icon={<Search size={22} />}
              description={busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay trabajos live en este momento.'}
            />
          ) : (
            <div className="mx-joblist">
              {trabajosFiltrados.map((trabajo) => (
                <TrabajoRow
                  key={trabajo.id}
                  trabajo={trabajo}
                  selected={trabajo.id === selectedTrabajoId}
                  ofertasCount={ofertasCountByTrabajoId[trabajo.id]}
                  onSelect={setSelectedTrabajoId}
                />
              ))}
            </div>
          )}
        </section>
      }
      right={
        <section className="mx-col">
          <ResponsesPanel trabajoId={selectedTrabajoId ?? undefined} onAsignado={recargarTrabajos} />
        </section>
      }
    />
  );
}
