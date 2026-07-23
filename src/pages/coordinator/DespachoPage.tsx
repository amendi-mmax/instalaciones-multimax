import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import { CoordinatorEmptyState } from '@/components/shared/coordinator-empty-state';
import { JobIndicadoresCard } from '@/components/shared/job-indicadores-card';
import { JobSummaryCard, type JobSummaryCardJob } from '@/components/shared/job-summary-card';
import { LiveDispatchCard } from '@/components/shared/live-dispatch-card';
import { ResponsesPanel } from '@/components/shared/responses-panel';
import { TwoColumnLayout } from '@/components/shared/two-column-layout';
import type { RadarInstallerState } from '@/components/shared/radar';
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
 *
 * **Sprint 5.1.4**: este valor ahora se asigna a `activeJob` (ver JSDoc de
 * `DespachoPage` más abajo) en vez de usarse directamente -- el propio
 * nombre `JOB_DEMO` no cambia, sigue siendo el mismo dato de demostración
 * ya aprobado en el Sprint 5.1.3.
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
 * Coordinador"): reemplazó por completo el bloque anterior
 * (`CoordinatorEmptyState`+`Radar`+`LiveCountdown`+botón "Cancelar" sueltos,
 * coexistiendo sin exclusión mutua desde los Sprints 3.6/3.7/3.9/3.15 --
 * una inconsistencia visual respecto al HTML oficial, donde esas 2 ramas
 * (`jobs.length === 0` vs. `jobs.length > 0`) nunca se muestran juntas) por
 * el Workspace real: `TwoColumnLayout` (`variant="despacho"`, YA EXISTENTE
 * desde Fase 3, sin cambios) con `JobSummaryCard`+`LiveDispatchCard`+KPIs
 * en la columna izquierda (`mx-col`, mismo orden de anidación que
 * `Coordinator()` en el HTML oficial: `mx-jobcard` primero, luego "Despacho
 * en vivo", luego "Indicadores") y `ResponsesPanel` en la derecha.
 *
 * **Ajuste Sprint 5.1.4** ("Finalización del Workspace Operativo del
 * Coordinador"): el Sprint 5.1.3 dejó el Workspace SIEMPRE visible, sin
 * ninguna posibilidad estructural de mostrar el estado vacío -- una
 * corrección pendiente detectada por el propio brief de este Sprint
 * ("Actualmente siempre se muestra `CoordinatorWorkspace`. Debe
 * corregirse", Regla 21: "el render deberá estar gobernado por un estado
 * único de control"). Se introduce `activeJob` (`JobSummaryCardJob | null`,
 * ver más abajo) como ese estado de control único: cuando es `null` se
 * renderiza EXCLUSIVAMENTE `CoordinatorEmptyState` (ningún
 * `JobSummaryCard`/`LiveDispatchCard`/`ResponsesPanel`/KPIs); cuando existe,
 * se renderiza el Workspace completo -- ambos estados son mutuamente
 * excluyentes (Regla 19), nunca simultáneos, igual que las 2 ramas reales
 * de `Coordinator(props)` (`jobs.length === 0` vs. `jobs.length > 0`) en el
 * HTML oficial.
 *
 * `activeJob` se fija temporalmente a `JOB_DEMO` (no `null`) -- valor
 * explícitamente admitido por el propio brief como ejemplo válido ("`const
 * activeJob = JOB_DEMO;`") -- para preservar, sin regresión visual, la
 * reconstrucción del Workspace ya aprobada en el Sprint 5.1.3 (el usuario
 * ya había pedido explícitamente reemplazar por completo el estado vacío
 * del flujo principal en esa ronda: "El estado vacío queda eliminado del
 * flujo principal del Coordinador"). `CoordinatorEmptyState` sigue
 * existiendo (no se borra del proyecto) y ahora es estructuralmente
 * alcanzable de nuevo, lista para cuando el Sprint 5.2 reemplace este valor
 * fijo por el trabajo activo real de la sucursal (`trabajos` con
 * `estado='live'`/`'assigned'`, o `null` si no hay ninguno) -- sin tener
 * que modificar de nuevo la estructura de este archivo, solo el origen del
 * valor de `activeJob` (Objetivo 10 de este Sprint: "Este Sprint termina
 * exactamente donde comienza `PublishModal`").
 *
 * **KPIs / "Indicadores"**: `CoordinatorKpiRow` (Sprint 5.1, agregado
 * dashboard sin equivalente en el HTML oficial) permanece SIN NINGÚN
 * CAMBIO -- mismo componente, mismo fetch (`dashboard.service.ts`/
 * `getCoordinatorKpis`), mismo contrato (`{ kpis: CoordinatorKpis }`). Este
 * Sprint lo envuelve con `JobIndicadoresCard` (NUEVO), que reconstruye
 * únicamente el MARCO visual del bloque real "Indicadores" de
 * `Coordinator()` (título/ícono/`mx-goal`) -- decisión explícita del
 * usuario (`AskUserQuestion`) tras la discrepancia real detectada en la
 * auditoría de este Sprint: el HTML oficial no tiene ningún "Dashboard",
 * así que sus 6 métricas reales de `jobView()` (1ª respuesta/3 respuestas/
 * Asignación/Notificados/Abiertos/Respuestas) no tienen ninguna fuente real
 * en este Sprint (dependen del motor de subasta, Sprint 5.3) -- se reutiliza
 * en su lugar el dato real ya existente (`CoordinatorKpiRow`), sin inventar
 * ninguna métrica ni tocar ningún cálculo. Ver JSDoc completo de
 * `job-indicadores-card.tsx`.
 *
 * **Qué NO hace este Sprint** (excluido explícitamente por el propio
 * brief): motor de subasta real, publicación real, asignación real, tiempo
 * real -- `JobSummaryCard`/`LiveDispatchCard`/`ResponsesPanel` siguen
 * usando props de demostración fijas, exactamente como en el Sprint 5.1.3.
 * `PublishModal` sigue sin conectarse a lógica real (pendiente del Sprint
 * 5.2).
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
    // el fallback de `JobIndicadoresCard` (`<Loading/>`) ya cubre este
    // instante, sin mostrar por error "sin tienda asignada" mientras la
    // resolución real sigue en curso. Para un Coordinador real,
    // `contextoLoading` siempre es `false` -- este `if` nunca frena nada
    // para ese caso. Se limpian `kpis`/`kpisError` para no dejar en pantalla
    // el número de la tienda anterior mientras un `admin` cambia de
    // sucursal en `SucursalSelect`.
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

  // Sprint 5.1.4 -- estado único de control (Regla 21) que decide, de forma
  // mutuamente excluyente (Regla 19), entre `CoordinatorEmptyState` (sin
  // trabajo activo) y el Workspace completo (con trabajo activo). Ver el
  // JSDoc completo de este archivo ("Ajuste Sprint 5.1.4") sobre por qué se
  // fija temporalmente a `JOB_DEMO` (no `null`) en esta ronda.
  const activeJob: JobSummaryCardJob | null = JOB_DEMO;

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
          <JobIndicadoresCard kpis={kpis} kpisError={kpisError} bidMins={activeJob.bidMins} />
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
