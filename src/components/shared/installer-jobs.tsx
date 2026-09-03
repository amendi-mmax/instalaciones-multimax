import { Briefcase, Calendar, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/spinner';
import { trabajoEstadoInfo } from '@/constants';
import { categoriaDeTrabajo, type Categoria } from '@/lib/trabajo-categoria';
import { trabajosParaInstaladorRepository, type TrabajoParaInstaladorRow } from '@/repositories';

/**
 * InstallerJobs — Estabilización del módulo Instalador (post Sprint 8.2).
 * Reemplazó el mock estático `MISJOBS`/`ESTADO` (Sprint 3.12) por los
 * trabajos reales del instalador autenticado.
 *
 * **Ajustes funcionales del flujo Instalador ("Mis trabajos" completo)**:
 * hasta esta ronda, esta pantalla mostraba EXCLUSIVAMENTE `gane_yo ===
 * true` (trabajos asignados/completados/cancelados) -- un trabajo donde el
 * instalador ofertó pero todavía no fue decidido no aparecía en ningún
 * lado de la aplicación. Se agrega la categoría real "Ofertados"
 * (`oferta_enviada === true`, columna real nueva de la vista -- migración
 * `0018` -- LEFT JOIN contra `ofertas`, independiente de si hubo o no una
 * notificación previa por zona) y se reorganiza en 4 categorías con chips
 * de filtro (mismo patrón visual `.mx-jobfilter` ya usado por
 * `TrabajosPage.tsx`, Sprint 5.1, sin CSS nuevo):
 * - **Ofertados**: `oferta_enviada && !gane_yo` -- oferta enviada, esperando
 *   decisión (o el trabajo se asignó a otro instalador).
 * - **Asignados**: `gane_yo && estado_trabajo === 'assigned'`.
 * - **Completados**: `gane_yo && estado_trabajo === 'completed'`.
 * - **Cancelados**: `(oferta_enviada || gane_yo) && estado_trabajo === 'cancelled'`
 *   -- "trabajos relacionados con el instalador que fueron cancelados"
 *   (brief textual), no cualquier trabajo cancelado visible.
 *
 * No confunde "ver" (cualquier trabajo `'live'` de la empresa, ahora
 * visible en `InstallerSolicitudes`) con "participar" (ofertó y/o fue
 * asignado) -- esta pantalla es exclusivamente participación real, mismo
 * criterio que ya regía antes de este ajuste, ahora completo.
 *
 * **Fuente de datos**: misma `trabajosParaInstaladorRepository` (vista real
 * `trabajos_para_instalador`) que ya consume `InstallerSolicitudes` -- sin
 * repositorio/servicio nuevo.
 *
 * Verificado vía MCP (2026-08-07, previo a este ajuste): Producción no
 * tenía todavía ningún trabajo con `estado <> 'live'` -- esta pantalla no
 * pudo validarse visualmente con datos reales de "Asignado"/"Completado"/
 * "Cancelado"/"Ofertado" por ausencia de esos datos, no por un defecto de
 * la consulta.
 */
const CATEGORIAS: readonly [Categoria, string][] = [
  ['ofertados', 'Ofertados'],
  ['asignados', 'Asignados'],
  ['completados', 'Completados'],
  ['cancelados', 'Cancelados'],
];

const SIN_TRABAJOS: Record<Categoria, string> = {
  ofertados: 'No tienes trabajos ofertados.',
  asignados: 'No tienes trabajos asignados.',
  completados: 'No tienes trabajos completados.',
  cancelados: 'No tienes trabajos cancelados.',
};

export function InstallerJobs() {
  const [trabajos, setTrabajos] = useState<TrabajoParaInstaladorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<Categoria>('ofertados');

  useEffect(() => {
    let active = true;
    trabajosParaInstaladorRepository.getAll().then((result) => {
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
  }, []);

  if (error) {
    return (
      <div className="mx-phone-empty">
        <Briefcase size={26} />
        <p>No se pudieron cargar tus trabajos.</p>
        <span style={{ color: 'var(--red)' }}>{error}</span>
      </div>
    );
  }

  if (trabajos === null) {
    return <Loading label="Cargando trabajos…" />;
  }

  const misTrabajos = trabajos.filter((trabajo) => categoriaDeTrabajo(trabajo) !== null);

  if (misTrabajos.length === 0) {
    return (
      <div className="mx-phone-empty">
        <Briefcase size={26} />
        <p>No tienes trabajos todavía.</p>
        <span>Cuando ofertes o te asignen un trabajo aparecerá aquí.</span>
      </div>
    );
  }

  const items = misTrabajos.filter((trabajo) => categoriaDeTrabajo(trabajo) === categoria);

  return (
    <div className="mx-myjobs">
      <div className="mx-phonehdr">
        <Briefcase size={13} />
        Mis trabajos
      </div>
      <div className="mx-jobfilter">
        {CATEGORIAS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={categoria === key ? 'on' : ''}
            onClick={() => setCategoria(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="mx-phone-empty">
          <Briefcase size={22} />
          <p>{SIN_TRABAJOS[categoria]}</p>
        </div>
      ) : (
        items.map((trabajo) => {
          const estado = trabajoEstadoInfo(trabajo.estado_trabajo ?? '');

          return (
            <div key={trabajo.trabajo_id} className="mx-myjob">
              <div className="mx-myjob-top">
                <span className="mx-myjob-t">{trabajo.tipo}</span>
                <Badge tone={estado.tone}>{estado.label}</Badge>
              </div>
              <div className="mx-myjob-meta">
                <span>
                  <MapPin size={12} />
                  {trabajo.zona}
                </span>
                <span>
                  <Calendar size={12} />
                  {trabajo.fecha} · {trabajo.hora}
                </span>
                {(trabajo.mi_oferta_precio ?? trabajo.precio_sugerido) != null ? (
                  <span className="mx-myjob-price">
                    ${trabajo.mi_oferta_precio ?? trabajo.precio_sugerido}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
