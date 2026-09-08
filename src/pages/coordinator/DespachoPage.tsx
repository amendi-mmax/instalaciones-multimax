import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import { Crosshair, Plus, ShieldCheck, TrendingUp } from 'lucide-react';
import { CoordinatorEmptyState } from '@/components/shared/coordinator-empty-state';
import type { DespachoKpis } from '@/components/shared/despacho-kpi-row';
import { EmptyState } from '@/components/shared/empty-state';
import { JobSummaryCard, type JobSummaryCardJob } from '@/components/shared/job-summary-card';
import { LiveDispatchCard } from '@/components/shared/live-dispatch-card';
import type { RadarInstallerState } from '@/components/shared/radar';
import { ResponsesPanel } from '@/components/shared/responses-panel';
import { StatTile } from '@/components/shared/stat-tile';
import { TwoColumnLayout } from '@/components/shared/two-column-layout';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { ELIGIBLE_ORDER, trabajoEstadoInfo } from '@/constants';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { createRealtimeChannel, removeRealtimeChannel } from '@/lib/supabase/realtime';
import { ofertasRepository } from '@/repositories';
import { getTrabajosByTienda, type TableRow } from '@/services';
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
 * dashboard sin equivalente en el HTML oficial) gobernó este bloque hasta
 * la ronda "Recomposición de Despacho en vivo".
 *
 * **AJUSTE SPRINT — Recomposición de Despacho en vivo (3ª corrección,
 * consolidación de Indicadores)**: `getCoordinatorKpis()`/`CoordinatorKpiRow`
 * dejan de usarse EN ESTA PÁGINA (no se eliminan del código -- siguen
 * intactos y sin cambios de contrato para cualquier otro consumidor futuro).
 * `JobIndicadoresCard` (Sprint 5.1.4) tampoco se usa más aquí. Existían 2
 * tarjetas de KPIs distintas en este dashboard (`JobIndicadoresCard` sobre
 * el trabajo destacado + `DespachoKpiRow` sobre todos los `live`) -- decisión
 * explícita del usuario, confirmada contra una captura real del prototipo:
 * consolidarlas en UNA sola tarjeta "Indicadores", reutilizando el marco
 * visual de `JobIndicadoresCard` (ícono `TrendingUp`+título+`mx-goal`) con
 * el contenido de `DespachoKpiRow` (Activos/Con ofertas/Por asignar/
 * Asignados hoy, derivados 100% de `getTrabajosByTienda()`+conteo de
 * `ofertas`, ver `despachoKpis` más abajo) en una grilla 2×2 (`.mx-stats`
 * con `gridTemplateColumns` local, en vez del 3+1 por defecto de
 * `StatGrid`). Se construye inline en este archivo (reutilizando
 * `Card`/`CardHeader`/`StatTile`, todos primitivos ya existentes) en vez de
 * modificar `job-indicadores-card.tsx`/`despacho-kpi-row.tsx` -- ambos
 * archivos quedan intactos por si algún Sprint futuro los vuelve a
 * necesitar tal cual.
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
  const { tiendaId, tiendaNombre } = useOperationalContext();
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
   * `getCoordinatorKpis()`/`CoordinatorKpiRow`/`JobIndicadoresCard` ya NO se
   * usan en esta página (consolidación de Indicadores, ver JSDoc del
   * componente más arriba) -- se retira por completo el efecto que los
   * poblaba, junto con `kpis`/`kpisError`/`ZERO_KPIS`.
   */
  const [trabajos, setTrabajos] = useState<TableRow<'trabajos'>[] | null>(null);
  const [ofertasCountByTrabajoId, setOfertasCountByTrabajoId] = useState<Record<string, number>>({});
  const [selectedTrabajoId, setSelectedTrabajoId] = useState<string | null>(null);
  /**
   * RONDA — "Mostrar ofertas" cambia de significado: ya NO es un refresco
   * del trabajo seleccionado (`refreshOfertasTrigger`, retirado) -- ahora
   * abre una bandeja GLOBAL con las ofertas pendientes de TODOS los
   * trabajos `live` de la tienda, agrupadas por trabajo (ver JSDoc completo
   * de `ResponsesPanel.modoGlobal`). `modoGlobal` es el único estado nuevo
   * que este archivo necesita para ese cambio: un booleano de UI, sin datos
   * de oferta. Se desactiva automáticamente al seleccionar un trabajo
   * puntual desde el selector superior (ver su `onClick` más abajo) -- así
   * ambos conceptos ("ver un JOB" / "ver todas las ofertas pendientes")
   * quedan mutuamente excluyentes, nunca mezclados.
   */
  const [modoGlobal, setModoGlobal] = useState(false);
  /**
   * Filas reales de `ofertas` de TODOS los trabajos `live` -- alimentan
   * exclusivamente el modo global de `ResponsesPanel` (agrupación por
   * trabajo). Se obtienen extendiendo el efecto YA EXISTENTE de abajo
   * (`ofertasRepository.getByTrabajoIds(liveIds)`, hasta ahora usado solo
   * para contar hacia `despachoKpis`) -- cero consultas nuevas: la misma
   * respuesta que ya llegaba se guarda también aquí, además de agregarse en
   * `ofertasCountByTrabajoId`.
   */
  const [ofertasLive, setOfertasLive] = useState<TableRow<'ofertas'>[]>([]);

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

  /**
   * RONDA — Realtime de asignación. Causa raíz confirmada por código (no
   * asumida): `asignar_instalador()` (RPC real) NUNCA modifica
   * `public.ofertas` -- solo hace `UPDATE` sobre `public.trabajos`
   * (`estado`/`instalador_asignado_id`/`asignado_at`/
   * `contacto_visible_hasta`) y `public.trabajo_instaladores`. Por eso una
   * asignación realizada en OTRA sesión (otra pestaña/otro coordinador)
   * nunca podía reflejarse en tiempo real -- los únicos canales existentes
   * escuchaban `INSERT` sobre `ofertas`, una tabla que este flujo jamás
   * modifica. `trabajos` ya pertenece a la publicación `supabase_realtime`
   * (verificado por MCP antes de escribir este efecto) -- no hace falta
   * ninguna migración ni cambio de RLS (la misma policy de `SELECT` que ya
   * usa `getTrabajosByTienda()` autoriza también la suscripción Realtime).
   *
   * Al llegar un `UPDATE` real, se reemplaza esa fila dentro del ÚNICO
   * estado `trabajos` ya existente -- NO es una segunda fuente de verdad.
   * Todo lo que ya deriva de `trabajos` (`trabajosLive`, `liveIds`,
   * `ofertasLive`/`ofertasCountByTrabajoId` vía el efecto de abajo, la
   * reselección de `selectedTrabajoId`, y `gruposGlobales` dentro de
   * `ResponsesPanel`, que recibe `trabajosLive`/`ofertasLive` como props) se
   * actualiza solo, sin ningún cambio en `ResponsesPanel.tsx`: en cuanto el
   * trabajo asignado deja de tener `estado='live'`, sale de `trabajosLive`
   * → `liveIds` cambia → `ofertasLive` se recalcula sin sus ofertas → el
   * grupo desaparece de la bandeja global y, si estaba seleccionado en modo
   * detalle, la reselección automática (ya corregida en una ronda anterior)
   * elige otro trabajo `live` sin ocultar el dashboard.
   *
   * `public.ofertas` NO necesita ningún listener adicional para este caso
   * -- nunca cambia en la asignación, así que no hay ningún evento de esa
   * tabla que "faltara" escuchar.
   */
  useEffect(() => {
    if (!tiendaId) return;
    const channel = createRealtimeChannel(`trabajos:${tiendaId}`);
    channel
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trabajos', filter: `tienda_id=eq.${tiendaId}` },
        (payload) => {
          const trabajoActualizado = payload.new as TableRow<'trabajos'>;
          setTrabajos((prev) =>
            prev
              ? prev.map((trabajo) => (trabajo.id === trabajoActualizado.id ? trabajoActualizado : trabajo))
              : prev,
          );
        },
      )
      .subscribe();
    return () => {
      void removeRealtimeChannel(channel);
    };
  }, [tiendaId]);

  const trabajosLive = useMemo(
    () => (trabajos ?? []).filter((trabajo) => trabajo.estado === 'live'),
    [trabajos],
  );

  // Conteo de ofertas por trabajo, en lote (una sola consulta para todos
  // los `live`, no N+1) -- `liveIds` (string estable) en vez de
  // `trabajosLive` (nuevo array en cada render) como dependencia real.
  //
  // RONDA — se extiende para además guardar las FILAS completas
  // (`setOfertasLive`), no solo el conteo -- misma respuesta de
  // `getByTrabajoIds()`, ninguna consulta adicional. Esas filas alimentan
  // el modo global de `ResponsesPanel` (agrupación por trabajo).
  const liveIds = trabajosLive.map((trabajo) => trabajo.id).join(',');
  useEffect(() => {
    const ids = liveIds ? liveIds.split(',') : [];
    if (ids.length === 0) {
      setOfertasCountByTrabajoId({});
      setOfertasLive([]);
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
        setOfertasLive(result.data);
      }
    });
    return () => {
      active = false;
    };
  }, [liveIds]);

  /**
   * Realtime del modo global -- solo se suscribe mientras `modoGlobal` está
   * activo (evita mantener una suscripción de fondo permanente cuando el
   * coordinador nunca abre la bandeja). Un ÚNICO canal para todos los
   * trabajos `live` a la vez (filtro `trabajo_id=in.(id1,id2,...)`,
   * soportado por Realtime de Supabase) -- opción más simple que suscribir
   * un canal por trabajo, y evita multiplicar suscripciones/limpiezas. Al
   * llegar un `INSERT` real, se agrega a `ofertasLive` -- deduplicado por
   * `id` (mismo criterio que el canal de detalle en `ResponsesPanel`). Se
   * recrea si cambia el conjunto de trabajos `live` (`liveIds`) mientras la
   * bandeja sigue abierta -- p. ej. un trabajo nuevo se publica y pasa a
   * `live` con la bandeja ya abierta.
   */
  useEffect(() => {
    if (!modoGlobal || !liveIds) return;
    const channel = createRealtimeChannel(`ofertas-global:${liveIds}`);
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ofertas', filter: `trabajo_id=in.(${liveIds})` },
        (payload) => {
          const nuevaOferta = payload.new as TableRow<'ofertas'>;
          setOfertasLive((prev) => {
            if (prev.some((oferta) => oferta.id === nuevaOferta.id)) return prev;
            return [...prev, nuevaOferta];
          });
        },
      )
      .subscribe();
    return () => {
      void removeRealtimeChannel(channel);
    };
  }, [modoGlobal, liveIds]);

  /**
   * Selección por defecto (comportamiento histórico preservado): el trabajo
   * recién publicado en esta sesión (`activeJob`) si todavía no hay ninguna
   * selección explícita; si no existe, el primero de la lista `live`.
   *
   * RONDA DE VALIDACIÓN — corrección de un bug real reportado ("al asignar
   * una oferta desaparece el bloque del trabajo seleccionado y el radar").
   * Causa raíz: `asignar()` (`ResponsesPanel`) dispara `onAsignado()` →
   * `recargarTrabajos()` → el trabajo recién asignado pasa a `estado=
   * 'assigned'` → sale de `trabajosLive` -- pero `selectedTrabajoId` seguía
   * apuntando a ese id, ahora inexistente en `trabajosLive`. Como este
   * efecto ANTES solo actuaba `if (selectedTrabajoId) return`, nunca
   * corregía una selección que se volvió inválida DESPUÉS de la carga
   * inicial: `selectedTrabajo` quedaba `null` → `jobSummaryData` quedaba
   * `null` → se mostraba el `EmptyState` genérico en vez de
   * `JobSummaryCard`/`LiveDispatchCard` -- el radar completo desaparecía,
   * aunque otros trabajos `live` siguieran existiendo.
   *
   * Corrección mínima: en vez de "salir si ya hay una selección", el efecto
   * ahora valida que esa selección siga siendo real -- o el `activeJob`
   * destacado (que sigue siendo válido mientras exista, mismo criterio que
   * `trabajoDestacado` más abajo -- no se toca esa lógica), o un id
   * presente en `trabajosLive`. Si no es ninguno de los dos (el caso del
   * bug), reselecciona automáticamente otro trabajo `live` disponible --
   * sin ocultar el dashboard mientras existan otros trabajos activos.
   */
  useEffect(() => {
    if (selectedTrabajoId) {
      if (selectedTrabajoId === activeJob?.trabajoId) return;
      if (trabajosLive.some((trabajo) => trabajo.id === selectedTrabajoId)) return;
    }
    if (activeJob?.trabajoId) {
      setSelectedTrabajoId(activeJob.trabajoId);
      return;
    }
    setSelectedTrabajoId(trabajosLive[0]?.id ?? null);
  }, [activeJob?.trabajoId, trabajosLive, selectedTrabajoId]);

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

  // El "trabajo destacado" es EXCLUSIVAMENTE el publicado en esta sesión
  // (`activeJob`) -- distinción que solo importa para 2 cosas reales: (a)
  // el botón "Publicar otro" de `JobSummaryCard` reutiliza `onOpenPublish`
  // igual para cualquier caso, sin diferencia; (b) "Cancelar"
  // (`LiveDispatchCard`) SÍ depende de esta distinción -- ver
  // `cancelDisabled` más abajo, porque ese flujo (`ConfirmCancelDialog` →
  // `setActiveJob(null)`) solo tiene sentido real para el `activeJob`.
  const trabajoDestacado = activeJob && selectedTrabajoId === activeJob.trabajoId ? activeJob : null;
  const selectedTrabajo = trabajosLive.find((trabajo) => trabajo.id === selectedTrabajoId) ?? null;

  /**
   * AJUSTE SPRINT — Recomposición de Despacho en vivo (2ª corrección).
   *
   * Hallazgo del usuario, correcto: el bloque "Despacho en vivo" (radar +
   * `LiveDispatchCard`) es y siempre fue 100% visual/demo incluso para
   * `activeJob` (`RADAR_DEMO_*`/`LIVECOUNTDOWN_DEMO_*`, constantes fijas
   * desde el Sprint 3.7/3.9 -- nunca dependieron de datos reales de
   * notificación). Lo único que SÍ era real en el bloque "destacado" era
   * `JobSummaryCard` (código/tipo/zona/fecha/hora/monto/urgencia del
   * trabajo). Por lo tanto, restringir el despacho completo únicamente al
   * `activeJob` era más conservador de lo necesario -- se unifica acá: se
   * arma un `JobSummaryCardJob` con datos 100% reales de CUALQUIER trabajo
   * `live` seleccionado (no solo `activeJob`), reutilizando las mismas
   * columnas reales ya usadas en `TrabajoRow`/`TrabajoDetailPage`
   * (`codigo`/`tipo`/`zona`/`provincia`/`fecha`/`hora`/`bid_minutos`/
   * `urgente`). `sucursal` usa `tiendaNombre` (Contexto Operativo, ya
   * resuelto) -- todos los trabajos de `trabajosLive` pertenecen a la
   * misma tienda (`getTrabajosByTienda(tiendaId)`), así que es válido para
   * cualquiera de ellos.
   *
   * El radar/countdown de `LiveDispatchCard` sigue siendo el mismo mock de
   * siempre para AMBOS casos -- nunca finge ser distinto por trabajo (ya
   * era así antes de este ajuste). Lo único condicionado por
   * `trabajoDestacado` es el botón "Cancelar" (`cancelDisabled`), porque
   * ese es el único control con una acción real de backend detrás.
   */
  const jobSummaryData: JobSummaryCardJob | null = trabajoDestacado
    ? trabajoDestacado
    : selectedTrabajo
      ? {
          id: selectedTrabajo.codigo,
          tipo: selectedTrabajo.tipo,
          zona: selectedTrabajo.zona,
          provincia: selectedTrabajo.provincia,
          fecha: selectedTrabajo.fecha,
          hora: selectedTrabajo.hora,
          sucursal: tiendaNombre ?? '',
          bidMins: selectedTrabajo.bid_minutos ?? 5,
          urgente: selectedTrabajo.urgente,
          trabajoId: selectedTrabajo.id,
        }
      : null;

  return (
    <div className="mx-col">
      {/* AJUSTE SPRINT -- Selector compacto de trabajos, corregido contra una
          captura real del prototipo (`Multimax_Despacho_v1.3.html`): en vez
          de chips de una sola línea (`.mx-jobfilter button`), cada trabajo
          se muestra como una mini-tarjeta de 2 líneas (código JOB + tipo
          truncado) con su badge de estado, reutilizando primitivos ya
          existentes (`.mx-card`/`.mx-jobrow-id`/`Badge`/`trabajoEstadoInfo`
          -- mismo vocabulario visual que `TrabajoRow`) en vez de CSS nuevo.
          El contenedor sigue siendo `.mx-jobfilter` (fila horizontal con
          scroll, ya existente) -- solo cambia el contenido de cada botón.
          Borde cian (mismo tono `var(--ice)` que usaba `TrabajoRow.selected`
          en la lista ya retirada de este archivo -- ver más abajo) marca la
          tarjeta seleccionada. Alcance deliberado: solo trabajos `live`
          (mismo criterio ya establecido -- "Despacho en vivo" es sobre
          trabajos activos, no sobre el historial completo).

          RONDA DE CORRECCIÓN -- "no inventar lógica funcional / usar datos
          reales": la lista completa de trabajos (`SearchBox`+`mx-joblist`+
          `TrabajoRow`, con conteo de ofertas por fila) que existía debajo
          del dashboard se RETIRA de este archivo -- hallazgo correcto del
          usuario: conceptualmente pertenece a "Mis trabajos"
          (`TrabajosPage.tsx`, ruta `/trabajos`), que YA tiene esa misma
          lista completa con filtros por estado (`TRABAJOS_FILTROS` --
          Todos/En vivo/Asignados/Completados/Cancelados), sin ninguna
          pérdida de funcionalidad real. "Despacho en vivo" vuelve a
          mostrar EXCLUSIVAMENTE el selector compacto + el dashboard de 2
          columnas del trabajo seleccionado -- nada debajo.
          `ofertasCountByTrabajoId`/su efecto (`ofertasRepository.
          getByTrabajoIds()`) NO se retiran -- siguen siendo necesarios para
          `despachoKpis` ("Con ofertas"/"Por asignar"), su único consumidor
          real ahora.

          AJUSTE SPRINT -- Corrección estructural: `.mx-jobfilter` (a
          diferencia de `.mx-grid`, usado por `TwoColumnLayout` más abajo)
          no tenía ningún `max-width`/`margin:auto` propio en globals.css --
          por eso se estiraba al ancho completo de `<main>` (sin límite
          propio) mientras el dashboard, que sí usa `.mx-grid`, se
          autocentraba en 1240px. Se agrega el mismo `maxWidth`/`margin`
          exactos que ya usa `.mx-grid` (y `.mx-suc-sel`/`.mx-subtabs-wrap`/
          `.mx-page`, la misma constante repetida en todo `globals.css`) vía
          `style` local -- sin tocar la clase `.mx-jobfilter` compartida
          (la reutilizan `TrabajosPage.tsx`/`InstallerJobs.tsx`, con
          contenedores propios distintos que no deben verse afectados).

          RONDA DE VALIDACIÓN -- espacio vertical entre `CoordinatorSubtabs`
          ("Despacho en vivo"/"Mis trabajos", `CoordinatorLayout.tsx`) y este
          selector: `.mx-subtabs-wrap` no tiene padding inferior (`padding:
          16px 16px 0`) y `.mx-col` (este contenedor) no agrega margen antes
          de su primer hijo (`gap` solo aplica ENTRE hermanos) -- quedaban
          pegados. Se agrega `marginTop: 16` (mismo valor que ya usa `.mx-col`
          como `gap` y `.mx-page`/`.mx-subtabs-wrap` como padding -- la
          misma escala de espaciado ya establecida, sin inventar un valor
          nuevo). */}
      <div
        className="mx-jobfilter"
        style={{ height: 'auto', flexWrap: 'wrap', maxWidth: 1240, width: '100%', margin: '16px auto 0' }}
      >
        {trabajosLive.map((trabajo) => {
          const estadoInfo = trabajoEstadoInfo(trabajo.estado);
          // RONDA -- mientras `modoGlobal` está activo ningún JOB puntual
          // está "seleccionado" en el sentido visual (la bandeja muestra
          // todos a la vez) -- se oculta el borde cian para no sugerir una
          // selección que ya no gobierna lo que se ve en el panel derecho.
          const seleccionado = !modoGlobal && trabajo.id === selectedTrabajoId;
          return (
            <button
              key={trabajo.id}
              type="button"
              className="mx-card"
              onClick={() => {
                // RONDA -- clic en un JOB puntual SIEMPRE sale del modo
                // global (Sección "Dos modos distintos": ambos conceptos
                // deben quedar mutuamente excluyentes).
                setSelectedTrabajoId(trabajo.id);
                setModoGlobal(false);
              }}
              style={{
                flex: '0 0 auto',
                width: 168,
                padding: '10px 12px',
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: seleccionado ? 'var(--ice)' : undefined,
                background: seleccionado ? 'rgba(52,225,232,0.06)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span className="mx-jobrow-id">{trabajo.codigo}</span>
                <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{trabajo.hora}</span>
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  margin: '4px 0 6px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {trabajo.tipo}
              </div>
              <Badge tone={estadoInfo.tone}>{estadoInfo.label}</Badge>
            </button>
          );
        })}
        <button
          type="button"
          className="mx-card"
          style={{ flex: '0 0 auto', width: 120, padding: '10px 12px', cursor: 'pointer' }}
          onClick={onOpenPublish}
        >
          <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          Publicar otro
        </button>
      </div>

      <TwoColumnLayout
        variant="despacho"
        left={
          <section className="mx-col">
            {jobSummaryData ? (
              <>
                <JobSummaryCard
                  job={jobSummaryData}
                  remainingSeconds={jobSummaryData.bidMins * 60}
                  onOpenPublish={onOpenPublish}
                />
                <LiveDispatchCard
                  notified={RADAR_DEMO_NOTIFIED}
                  instState={RADAR_DEMO_INST_STATE}
                  eligibleIds={ELIGIBLE_ORDER}
                  publishedAt={LIVECOUNTDOWN_DEMO_PUBLISHED_AT}
                  bidMins={LIVECOUNTDOWN_DEMO_BID_MINS}
                  onCancel={onOpenConfirmCancel}
                  cancelDisabled={!trabajoDestacado}
                  onMostrarOfertas={() => setModoGlobal(true)}
                />
              </>
            ) : (
              <EmptyState
                size="compact"
                icon={<Crosshair size={22} />}
                description="Selecciona un trabajo del selector para ver su despacho."
              />
            )}
            {/* AJUSTE SPRINT -- Consolidación de Indicadores: UNA sola
                tarjeta (antes eran 2: `JobIndicadoresCard` +
                `DespachoKpiRow`), con el marco visual de la primera
                (ícono+título+`mx-goal`) y el contenido real de la segunda
                (Activos/Con ofertas/Por asignar/Asignados hoy, derivados de
                `despachoKpis` -- ver su JSDoc), en grilla 2×2 (`.mx-stats`
                con `gridTemplateColumns` local, en vez del 3+1 por defecto
                de `StatGrid`). Se muestra siempre, independiente de si hay
                un trabajo seleccionado (mismo criterio que ya tenía
                `DespachoKpiRow`) -- el texto de la meta usa el `bidMins` del
                trabajo seleccionado si existe, o el valor por defecto (5,
                mismo fallback ya usado en `jobSummaryData` más arriba). */}
            <Card>
              <CardHeader icon={<TrendingUp size={14} />} cardTitle="Indicadores" />
              <div className="mx-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <StatTile value={despachoKpis.activos} label="Activos" sublabel="Trabajos live abiertos" />
                <StatTile value={despachoKpis.conOfertas} label="Con ofertas" sublabel="Con al menos 1 oferta" />
                <StatTile value={despachoKpis.porAsignar} label="Por asignar" sublabel="Requieren selección" />
                <StatTile value={despachoKpis.asignadosHoy} label="Asignados hoy" />
              </div>
              <div className="mx-goal">
                <ShieldCheck size={13} />
                Meta: una opción de instalación disponible en {jobSummaryData?.bidMins ?? 5} minutos o menos.
              </div>
            </Card>
          </section>
        }
        right={
          <section className="mx-col">
            <ResponsesPanel
              trabajoId={selectedTrabajoId ?? undefined}
              onAsignado={recargarTrabajos}
              modoGlobal={modoGlobal}
              trabajosLive={trabajosLive}
              ofertasLive={ofertasLive}
            />
          </section>
        }
      />
    </div>
  );
}
