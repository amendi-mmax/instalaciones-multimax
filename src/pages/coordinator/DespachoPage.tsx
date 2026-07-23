import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import { CoordinatorKpiRow } from '@/components/shared/coordinator-kpi-row';
import { JobSummaryCard, type JobSummaryCardJob } from '@/components/shared/job-summary-card';
import { LiveDispatchCard } from '@/components/shared/live-dispatch-card';
import { ResponsesPanel } from '@/components/shared/responses-panel';
import { TwoColumnLayout } from '@/components/shared/two-column-layout';
import type { RadarInstallerState } from '@/components/shared/radar';
import { Loading } from '@/components/ui/spinner';
import { ELIGIBLE_ORDER } from '@/constants';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { getCoordinatorKpis, type CoordinatorKpis } from '@/services';
import type { CoordinatorLayoutOutletContext } from '@/layouts/CoordinatorLayout';

/**
 * Job de demostración (MVP) para el Workspace Operativo (Sprint 5.1.3) --
 * ver JSDoc completo de `JobSummaryCard`/`LiveDispatchCard` sobre por qué
 * hace falta uno (no existe ningún seed real para `jobs.length > 0` en el
 * HTML oficial) y por qué vive acá, en el punto de montaje, no dentro de
 * los componentes "compartidos" (mismo criterio que `RADAR_DEMO_*`/
 * `LIVECOUNTDOWN_DEMO_*` de abajo, estos últimos reubicados verbatim desde
 * Sprints 3.7/3.9, sin cambios). Campos tomados del primer registro real de
 * `TRABAJOS` (`Multimax_Despacho_v1.3.html`, línea 1183 -- `JOB-4821`,
 * "Instalación A/A 12,000 BTU", Paitilla/Panamá, 2026-06-22 2:00 p.m.,
 * sucursal Multiplaza) para no inventar datos nuevos -- ese mock es de
 * "Mis trabajos" (`CoordinatorJobs`), no del motor de despacho, pero sus
 * valores de campo son reales del propio HTML, no fabricados.
 */
const JOB_DEMO: JobSummaryCardJob = {
  id: 'JOB-4821',
  tipo: 'Instalación A/A 12,000 BTU',
  zona: 'Paitilla',
  provincia: 'Panamá',
  fecha: '2026-06-22',
  hora: '2:00 p.m.',
  sucursal: 'Multiplaza',
  bidMins: 5,
};

/**
 * `JOB_DEMO_REMAINING_SECONDS` -- valor ESTÁTICO (no ticking), formateado
 * una sola vez por `JobSummaryCard` vía `fmt()`. A diferencia de
 * `LiveCountdown` (que sí seguirá contando en tiempo real dentro de
 * `LiveDispatchCard`, con su propio `useState`/`useInterval`), este valor
 * no se recalcula -- ver la nota de "Consolidación deliberada" en el JSDoc
 * de `JobSummaryCard` sobre por qué existen 2 representaciones distintas de
 * "tiempo restante" en este Workspace, ambas reutilizando datos de
 * demostración ya fijados, ninguna inventando un motor de tiempo real
 * nuevo.
 */
const JOB_DEMO_REMAINING_SECONDS = 240;

/**
 * Props mock de `Radar`/`LiveCountdown` -- reubicadas verbatim desde
 * `RootLayout.tsx` (Sprint 3.7/3.9), sin ningún cambio de valores/lógica.
 * Ahora se pasan a `LiveDispatchCard` (Sprint 5.1.3) en vez de montarse acá
 * directamente -- ver JSDoc completo de esa integración temporal en
 * `live-dispatch-card.tsx`.
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
 * Coordinador"): reemplaza por completo el bloque anterior
 * (`CoordinatorEmptyState`+`Radar`+`LiveCountdown`+botón "Cancelar" sueltos,
 * coexistiendo sin exclusión mutua desde los Sprints 3.6/3.7/3.9/3.15 --
 * una inconsistencia visual respecto al HTML oficial, donde esas 2 ramas
 * (`jobs.length === 0` vs. `jobs.length > 0`) nunca se muestran juntas,
 * documentada como temporal en cada uno de esos Sprints y ya prevista para
 * resolverse "cuando exista la tarjeta real de Despacho en vivo") por el
 * Workspace real: `TwoColumnLayout` (`variant="despacho"`, YA EXISTENTE
 * desde Fase 3, sin cambios) con `JobSummaryCard`+`LiveDispatchCard`+
 * `CoordinatorKpiRow` en la columna izquierda (`mx-col`, mismo orden de
 * anidación que `Coordinator()` en el HTML oficial: `mx-jobcard` primero,
 * luego la tarjeta "Despacho en vivo") y `ResponsesPanel` en la derecha.
 *
 * Por instrucción explícita del usuario para este Sprint, se usa un job de
 * demostración fijo (`JOB_DEMO`, fase `live` implícita, 0 respuestas) --
 * "únicamente con fines de reconstrucción visual del layout", sin ningún
 * flag/condicional para alternar con el estado vacío: `CoordinatorEmptyState`
 * queda **eliminado del flujo principal** de esta página en este Sprint
 * (no borrado del proyecto -- el componente sigue existiendo en
 * `coordinator-empty-state.tsx` para cuando el Sprint 5.2 implemente la
 * publicación real de trabajos y la lista pueda estar genuinamente vacía).
 *
 * **KPIs**: `CoordinatorKpiRow` (Sprint 5.1, agregado dashboard sin
 * equivalente en el HTML oficial) se reubica dentro de la columna
 * izquierda del nuevo grid, como último elemento -- mismo componente, mismo
 * fetch (`dashboard.service.ts`/`getCoordinatorKpis`), sin recalcular ni
 * modificar sus datos, solo su posición visual (instrucción explícita del
 * brief: "Mover los KPIs existentes... únicamente reorganizar el layout").
 *
 * **Qué NO hace este Sprint** (excluido explícitamente por el propio
 * brief): motor de subasta real, publicación real, asignación real, tiempo
 * real -- `JobSummaryCard`/`LiveDispatchCard`/`ResponsesPanel` siguen
 * usando props de demostración fijas, exactamente como sus predecesores
 * sueltos antes de este Sprint.
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
  const { onOpenPublish, onOpenConfirmCancel } = useOutletContext<CoordinatorLayoutOutletContext>();

  const [kpis, setKpis] = useState<CoordinatorKpis | null>(null);
  const [kpisError, setKpisError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Sprint 5.1.1 -- mientras el Contexto Operativo todavía resuelve
    // `tiendaId` (solo ocurre para un `admin` viendo "Coordinador", ver
    // `OperationalContextProvider.tsx`), no se toca `kpisError` todavía --
    // el fallback de más abajo (`<Loading/>`) ya cubre este instante, sin
    // mostrar por error "sin tienda asignada" mientras la resolución real
    // sigue en curso. Para un Coordinador real, `contextoLoading` siempre
    // es `false` -- este `if` nunca frena nada para ese caso. Se limpian
    // `kpis`/`kpisError` para no dejar en pantalla el número de la tienda
    // anterior mientras un `admin` cambia de sucursal en `SucursalSelect`.
    if (contextoLoading) {
      setKpis(null);
      setKpisError(null);
      return;
    }

    // El propio Contexto Operativo puede reportar un error real (ej. la
    // sucursal elegida en `SucursalSelect` todavía no existe en la tabla
    // real `tiendas` para la empresa Multimax) -- se muestra ese mensaje
    // en vez del genérico de "sin tienda asignada", más preciso para el
    // caso de un `admin` en modo superusuario.
    if (contextoError) {
      setKpis(null);
      setKpisError(contextoError);
      return;
    }

    if (!tiendaId) {
      setKpis(null);
      setKpisError('Tu perfil de coordinador no tiene una tienda asignada.');
      return;
    }

    setKpisError(null);
    getCoordinatorKpis(tiendaId).then((result) => {
      if (!active) return;
      if (result.ok) {
        setKpis(result.data);
      } else {
        setKpisError(result.error.message);
      }
    });
    return () => {
      active = false;
    };
  }, [tiendaId, contextoLoading, contextoError]);

  return (
    <TwoColumnLayout
      variant="despacho"
      left={
        <section className="mx-col">
          <JobSummaryCard
            job={JOB_DEMO}
            remainingSeconds={JOB_DEMO_REMAINING_SECONDS}
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
          {kpisError ? (
            <p className="mx-sub" style={{ marginBottom: 14 }}>
              {kpisError}
            </p>
          ) : kpis ? (
            <CoordinatorKpiRow kpis={kpis} />
          ) : (
            <Loading label="Cargando indicadores…" />
          )}
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
