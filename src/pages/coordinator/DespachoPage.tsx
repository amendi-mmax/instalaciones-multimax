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
 * valores de campo son reales del propio HTML, no fabricados. `urgente:
 * false` (Sprint 5.1.5) porque ese mock no incluye ese campo -- valor menos
 * presuntuoso, no fabrica una urgencia que no existe.
 *
 * **Sprint 5.1.4**: este valor se asigna a `activeJob` (ver JSDoc de
 * `DespachoPage` más abajo) en vez de usarse directamente.
 *
 * **Sprint 5.1.5** ("Corrección definitiva del Coordinator Workspace"):
 * `JOB_DEMO` permanece en el proyecto ÚNICAMENTE como dato temporal --
 * `activeJob` YA NO se fija a este valor por defecto (Objetivo 1: "activeJob
 * NO debe inicializarse con JOB_DEMO. Debe comenzar como: null"). Ver
 * `DEMO_MODE` más abajo.
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
  urgente: false,
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
 * `DEMO_MODE` -- Sprint 5.1.5. Flag manual, temporal, NO conectado a
 * ninguna fuente real (Supabase/servicio/hook) -- únicamente decide si
 * `activeJob` (más abajo) toma el valor de `JOB_DEMO` o `null`. Permanece en
 * `false` por defecto (Objetivo 1/2 del brief: "`activeJob` NO debe
 * inicializarse con `JOB_DEMO`... debe comenzar como `null`"; "`JOB_DEMO`
 * debe utilizarse exclusivamente cuando se invoque explícitamente. Nunca
 * debe renderizar automáticamente la vista"). Cambiarlo a `true` es la única
 * forma de "invocar explícitamente" el job de demostración -- una edición
 * manual y deliberada de este archivo, nunca un estado que se active solo.
 * El Sprint 5.2 retira este flag por completo, reemplazándolo por el
 * trabajo activo real de la sucursal (`trabajos` con
 * `estado='live'`/`'assigned'`).
 */
const DEMO_MODE = false;

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
 * coexistiendo sin exclusión mutua desde los Sprints 3.6/3.7/3.9/3.15) por
 * el Workspace real: `TwoColumnLayout` (`variant="despacho"`, YA EXISTENTE
 * desde Fase 3, sin cambios) con `JobSummaryCard`+`LiveDispatchCard`+KPIs
 * en la columna izquierda (`mx-col`, mismo orden de anidación que
 * `Coordinator()` en el HTML oficial: `mx-jobcard` primero, luego "Despacho
 * en vivo", luego "Indicadores") y `ResponsesPanel` en la derecha.
 *
 * **Ajuste Sprint 5.1.4**: introdujo `activeJob` como estado único de
 * control (Reglas 19/21) entre `CoordinatorEmptyState` y el Workspace
 * completo -- pero lo fijó a `JOB_DEMO` por defecto, dejando el Workspace
 * visible siempre en la práctica (mismo síntoma original, solo con la
 * estructura condicional ya lista).
 *
 * **Corrección Sprint 5.1.5** ("Corrección definitiva del Coordinator
 * Workspace"): Regla 23 ("un Sprint visual no puede darse por terminado
 * únicamente porque la arquitectura esté preparada... debe reproducir
 * exactamente el comportamiento visual del HTML oficial") y Regla 24 ("no
 * debes asumir que un componente aprobado anteriormente sigue siendo
 * correcto") -- se re-verificó el comportamiento real renderizado, no solo
 * la estructura del código, y se confirmó que `activeJob = JOB_DEMO` violaba
 * el objetivo explícito del brief ("`activeJob` NO debe inicializarse con
 * `JOB_DEMO`. Debe comenzar como: `null`"). Se corrige a `activeJob =
 * DEMO_MODE ? JOB_DEMO : null` (`DEMO_MODE` en `false` por defecto, ver su
 * JSDoc arriba) -- `CoordinatorEmptyState` es ahora la vista real que ve un
 * Coordinador sin trabajo activo, tal como exige el HTML oficial (`jobs.length
 * === 0`). `JOB_DEMO` permanece en el proyecto (no se borra) exactamente
 * como pide el brief: "únicamente como dato temporal... utilizado
 * exclusivamente cuando se invoque explícitamente."
 *
 * **KPIs / "Indicadores"**: `CoordinatorKpiRow` (Sprint 5.1, agregado
 * dashboard sin equivalente en el HTML oficial) permanece SIN NINGÚN
 * CAMBIO -- mismo componente, mismo fetch (`dashboard.service.ts`/
 * `getCoordinatorKpis`), mismo contrato. `JobIndicadoresCard` (Sprint 5.1.4)
 * lo envuelve con el marco visual real de "Indicadores" (título/ícono/
 * `mx-goal`).
 *
 * **Corrección Sprint 5.1.5 (Indicadores)**: `kpisError` (mensaje real,
 * ej. "la sucursal todavía no existe...") se renderizaba hasta este Sprint
 * DENTRO de `JobIndicadoresCard` -- el HTML oficial nunca muestra un mensaje
 * de error dentro del bloque "Indicadores" (su estructura es fija:
 * encabezado → StatTiles → `mx-goal`). Se retira `kpisError` de las props de
 * `JobIndicadoresCard` (ver su JSDoc) y se muestra, si existe, como párrafo
 * independiente en la columna izquierda, ANTES de `JobIndicadoresCard` --
 * misma información real, ya no dentro del bloque visual "Indicadores".
 *
 * **Qué NO hace este Sprint** (excluido explícitamente por el propio
 * brief): motor de subasta real, publicación real, asignación real, tiempo
 * real, conexión de Supabase, modificación de `PublishModal`. `JobSummaryCard`/
 * `LiveDispatchCard`/`ResponsesPanel` siguen usando props de demostración
 * fijas, solo activas cuando `DEMO_MODE` es `true`.
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

  // Sprint 5.1.4/5.1.5 -- estado único de control (Regla 21) que decide, de
  // forma mutuamente excluyente (Regla 19), entre `CoordinatorEmptyState`
  // (sin trabajo activo) y el Workspace completo (con trabajo activo). Ver
  // el JSDoc completo de este archivo ("Corrección Sprint 5.1.5") sobre por
  // qué ya NO se fija a `JOB_DEMO` por defecto.
  const activeJob: JobSummaryCardJob | null = DEMO_MODE ? JOB_DEMO : null;

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
          {/* Sprint 5.1.5 -- `kpisError` ya NO se renderiza dentro de
              `JobIndicadoresCard` (el bloque "Indicadores" del HTML oficial
              no tiene ninguna rama de error). Mismo mensaje real, ahora
              fuera de ese bloque visual. */}
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
