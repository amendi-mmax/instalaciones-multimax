import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import { CoordinatorEmptyState } from '@/components/shared/coordinator-empty-state';
import { JobIndicadoresCard } from '@/components/shared/job-indicadores-card';
import { JobSummaryCard } from '@/components/shared/job-summary-card';
import { LiveDispatchCard } from '@/components/shared/live-dispatch-card';
import { ResponsesPanel } from '@/components/shared/responses-panel';
import { TwoColumnLayout } from '@/components/shared/two-column-layout';
import type { RadarInstallerState } from '@/components/shared/radar';
import { ELIGIBLE_ORDER } from '@/constants';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { getCoordinatorKpis, type CoordinatorKpis } from '@/services';
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

  // Sprint 5.2.1 -- `activeJob` ya no se calcula acá: se lee del Outlet
  // Context (fuente real, `CoordinatorLayout.tsx`). Regla 19 (mutuamente
  // excluyente): `CoordinatorEmptyState` si es `null`, Workspace completo si
  // existe.
  if (!activeJob) {
    return <CoordinatorEmptyState onOpenPublish={onOpenPublish} />;
  }

  return (
    <TwoColumnLayout
      variant="despacho"
      left={
        <section className="mx-col">
          <JobSummaryCard
            job={activeJob}
            remainingSeconds={activeJob.bidMins * 60}
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
          {kpisError && (
            <p className="mx-sub" style={{ marginBottom: 14 }}>
              {kpisError}
            </p>
          )}
          <JobIndicadoresCard kpis={kpis} bidMins={activeJob.bidMins} />
        </section>
      }
      right={
        <section className="mx-col">
          <ResponsesPanel />
        </section>
      }
    />
  );
}
