import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { XCircle } from 'lucide-react';

import { CoordinatorKpiRow } from '@/components/shared/coordinator-kpi-row';
import { CoordinatorSubtabs } from '@/components/shared/coordinator-subtabs';
import { CoordinatorEmptyState } from '@/components/shared/coordinator-empty-state';
import { LiveCountdown } from '@/components/shared/live-countdown';
import { Radar, type RadarInstallerState } from '@/components/shared/radar';
import { SucursalSelect } from '@/components/shared/sucursal-select';
import { Loading } from '@/components/ui/spinner';
import { ELIGIBLE_ORDER } from '@/constants';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { getCoordinatorKpis, type CoordinatorKpis } from '@/services';
import type { RootLayoutOutletContext } from '@/layouts/RootLayout';

/**
 * Props mock de `Radar`/`LiveCountdown` -- reubicadas verbatim desde
 * `RootLayout.tsx` (Sprint 3.7/3.9), sin ningún cambio de valores/lógica.
 * Ver JSDoc completo de esta integración temporal más abajo, en el cuerpo
 * de `DespachoPage`.
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
 * **Relocación desde `RootLayout.tsx` (sin cambios de comportamiento)**:
 * `SucursalSelect`, `MxSubtabs` (ahora `CoordinatorSubtabs`, real) y las
 * integraciones temporales `CoordinatorEmptyState`/`Radar`/`LiveCountdown`/
 * botón "Cancelar" vivían inline dentro de `RootLayout.tsx` desde los
 * Sprints 3.3-3.15 (ver el JSDoc histórico completo de esas integraciones
 * en el `RootLayout.tsx` anterior a este Sprint, conservado en el
 * historial de git). Este Sprint las traslada tal cual a esta página --
 * mismos componentes, mismas props mock, mismo orden visual -- para que
 * puedan vivir detrás de una ruta real (`/despacho`) en vez de una rama
 * `role === 'coordinador'` sin URL propia. NO es un cambio funcional: el
 * HTML/CSS resultante es idéntico al que veía un Coordinador antes de este
 * Sprint en `/`.
 *
 * **KPIs (Entregable 4)**: se agrega `CoordinatorKpiRow` como primer
 * elemento del contenido de la página (antes de `CoordinatorEmptyState`),
 * alimentado por `dashboard.service.ts` con datos REALES de `trabajos`
 * filtrados por `tiendaId` -- ver JSDoc de `CoordinatorKpiRow` sobre por
 * qué se integra acá y no como pantalla nueva (decisión explícita del
 * usuario tras la auditoría previa de este Sprint).
 *
 * **Qué NO hace este Sprint**: no conecta `Radar`/`LiveCountdown`/
 * `CoordinatorEmptyState` a datos reales de un trabajo activo -- eso
 * requiere el motor de "Flujo de Ofertas" (bids, radar en tiempo real,
 * `installerRespond`/`confirmAssign`), explícitamente reservado para el
 * Sprint 5.3 por el propio brief de este Sprint ("NO desarrollar
 * todavía: ... Flujo de Ofertas"). Siguen siendo props de demostración
 * fijas, exactamente como en `RootLayout.tsx` antes de este Sprint.
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
  const { sucursalCoord, setSucursalCoord, onOpenPublish, onOpenConfirmCancel } =
    useOutletContext<RootLayoutOutletContext>();

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
    <div>
      <SucursalSelect value={sucursalCoord} onChange={setSucursalCoord} />
      <CoordinatorSubtabs />

      {kpisError ? (
        <p className="mx-sub" style={{ marginBottom: 14 }}>
          {kpisError}
        </p>
      ) : kpis ? (
        <CoordinatorKpiRow kpis={kpis} />
      ) : (
        <Loading label="Cargando indicadores…" />
      )}

      {/* TEMPORARY INTEGRATION — Sprint 3.6 (CoordinatorEmptyState), reubicada
          verbatim desde RootLayout.tsx en el Sprint 5.1: ver JSDoc de la
          función más arriba. */}
      <CoordinatorEmptyState onOpenPublish={onOpenPublish} />
      {/* TEMPORARY INTEGRATION — Sprint 3.7 (Radar), reubicada verbatim. */}
      <Radar
        notified={RADAR_DEMO_NOTIFIED}
        instState={RADAR_DEMO_INST_STATE}
        eligibleIds={ELIGIBLE_ORDER}
      />
      {/* TEMPORARY INTEGRATION — Sprint 3.9 (LiveCountdown), reubicada verbatim. */}
      <LiveCountdown
        publishedAt={LIVECOUNTDOWN_DEMO_PUBLISHED_AT}
        bidMins={LIVECOUNTDOWN_DEMO_BID_MINS}
      />
      {/* TEMPORARY INTEGRATION — Sprint 3.15 (ConfirmCancelDialog trigger),
          reubicada verbatim: el diálogo en sí sigue montado en RootLayout.tsx
          (compartido con el resto del shell), este botón solo lo abre. */}
      <button
        type="button"
        className="mx-btn mx-btn-ghost"
        style={{ flex: 'none', color: 'var(--red)', borderColor: 'rgba(255,92,122,.35)' }}
        onClick={onOpenConfirmCancel}
      >
        <XCircle size={14} />
        Cancelar
      </button>
    </div>
  );
}
