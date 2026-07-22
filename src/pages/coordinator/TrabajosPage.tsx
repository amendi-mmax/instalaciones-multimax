import { ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/components/shared/empty-state';
import { TrabajoRow } from '@/components/shared/trabajo-row';
import { Loading } from '@/components/ui/spinner';
import { TRABAJOS_FILTROS, type TrabajoEstadoReal } from '@/constants';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { getTrabajosByTienda, type TableRow } from '@/services';

type FiltroKey = 'todos' | TrabajoEstadoReal;

/**
 * TrabajosPage — "Mis trabajos" / Cola de Trabajos, ruta `/trabajos`
 * (Entregable 5 del Sprint 5.1). Reconstruye `CoordinatorJobs()` cuando
 * `isMaster` es falso (`Multimax_Despacho_v1.3.html`, líneas 2654-2725) --
 * la rama `isMaster` (`MasterCalendar`) es exclusiva de Admin, ya migrada
 * en el Sprint 3.14 vía `AdminPanel`, y no aplica al Coordinador (ver
 * "Diferencias detectadas" en `SPRINT_5_1_COORDINATOR_REPORT.md`).
 *
 * Diferencia deliberada respecto al HTML fuente: el mockup filtraba
 * `TRABAJOS` (mock) por `t.sucursal === sucursalActual`, con
 * `sucursalActual` viniendo del selector manual `SucursalSelect`
 * (`sucursalCoord`, pre-auth). Este Sprint usa datos reales de Supabase,
 * ya scoped por RLS a la tienda real del coordinador autenticado
 * (`tiendaId` real del coordinador autenticado) -- el selector de sucursal
 * sigue mostrándose (por fidelidad visual, y porque `PublishModal`/
 * `sucursalCoord` todavía lo usan para publicar, Sprint 5.2), pero ya NO
 * filtra esta lista: filtrar por un string de sucursal ajeno al
 * `tienda_id` real sería inconsistente con lo que RLS ya garantiza.
 * Documentado también en el informe de este Sprint como un seam a
 * reconciliar en Sprint 5.2.
 *
 * **Ajuste Sprint 5.1.1** ("Ajuste final -- Modo Administrador
 * Superusuario"): `tiendaId`/`tiendaNombre` ya no se leen de `profile`
 * (vía `useAuth()`) directamente -- se leen de `useOperationalContext()`,
 * mismo criterio y misma justificación que `DespachoPage.tsx` (ver su
 * JSDoc). Sin cambio de comportamiento para un Coordinador real.
 *
 * **Ajuste Sprint 5.1.2** ("Refactor del Layout Operativo del
 * Coordinador"): `SucursalSelect`/`CoordinatorSubtabs` (mencionados en el
 * párrafo de arriba) se retiran de esta página -- estaban duplicados
 * (misma llamada independiente también en `DespachoPage.tsx`). Ahora viven
 * una única vez en `CoordinatorLayout.tsx`, por encima del `<Outlet/>` que
 * renderiza esta página -- ver su JSDoc completo. El selector de sucursal
 * sigue mostrándose exactamente igual (misma fidelidad visual descrita
 * arriba), solo movido un nivel más arriba en el árbol -- sin cambio de
 * comportamiento. Esta página ya no necesita `useOutletContext()` en
 * absoluto: no consumía ningún otro campo del contexto del Coordinador.
 */
export function TrabajosPage() {
  const {
    tiendaId,
    tiendaNombre,
    loading: contextoLoading,
    error: contextoError,
  } = useOperationalContext();
  const navigate = useNavigate();

  const [trabajos, setTrabajos] = useState<TableRow<'trabajos'>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroKey>('todos');

  useEffect(() => {
    let active = true;

    // Ver el mismo comentario en `DespachoPage.tsx`: mientras el Contexto
    // Operativo todavía resuelve `tiendaId` (solo para un `admin` viendo
    // "Coordinador"), se limpia la lista en vez de mostrar un error --
    // para un Coordinador real `contextoLoading` siempre es `false`.
    if (contextoLoading) {
      setTrabajos(null);
      setError(null);
      return;
    }

    if (contextoError) {
      setTrabajos(null);
      setError(contextoError);
      return;
    }

    if (!tiendaId) {
      setTrabajos(null);
      setError('Tu perfil de coordinador no tiene una tienda asignada.');
      return;
    }
    setError(null);
    setTrabajos(null);
    getTrabajosByTienda(tiendaId).then((result) => {
      if (!active) return;
      if (result.ok) {
        setTrabajos(result.data);
      } else {
        setError(result.error.message);
      }
    });
    return () => {
      active = false;
    };
  }, [tiendaId, contextoLoading, contextoError]);

  const lista = trabajos
    ? filtro === 'todos'
      ? trabajos
      : trabajos.filter((t) => t.estado === filtro)
    : null;

  return (
    <div>
      <div className="mx-page">
        <div className="mx-pagehead">
          <div>
            <h2>Mis trabajos{tiendaNombre ? ` · ${tiendaNombre}` : ''}</h2>
            <div className="mx-sub">Trabajos publicados por tu tienda.</div>
          </div>
        </div>

        <div className="mx-jobfilter">
          {TRABAJOS_FILTROS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={filtro === key ? 'on' : ''}
              onClick={() => setFiltro(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mx-sub">{error}</p>
        ) : !lista ? (
          <Loading label="Cargando trabajos…" />
        ) : lista.length === 0 ? (
          <EmptyState
            size="compact"
            icon={<ClipboardList size={22} />}
            description="No hay trabajos en esta categoría para tu tienda."
          />
        ) : (
          <div className="mx-joblist">
            {lista.map((trabajo) => (
              <TrabajoRow key={trabajo.id} trabajo={trabajo} onSelect={(id) => navigate(`/trabajos/${id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
