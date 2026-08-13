import { Briefcase, Calendar, MapPin } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/spinner';
import { trabajoEstadoInfo } from '@/constants';
import { trabajosParaInstaladorRepository, type TrabajoParaInstaladorRow } from '@/repositories';

/**
 * InstallerJobs — Estabilización del módulo Instalador (post Sprint 8.2).
 * Reemplaza el mock estático `MISJOBS`/`ESTADO` (Sprint 3.12) por los
 * trabajos reales del instalador autenticado.
 *
 * **Fuente de datos**: reutiliza `trabajosParaInstaladorRepository` (vista
 * real `trabajos_para_instalador`, ya filtrada por RLS a `auth.uid()` --
 * mismo repositorio que ya consume `InstallerSolicitudes`, Sprint 7.2). "Mis
 * trabajos" es el subconjunto de esa misma vista donde `gane_yo === true`
 * (columna real `t.instalador_asignado_id = auth.uid()`, ver definición de
 * la vista) -- es decir, los trabajos que este instalador efectivamente
 * ganó/tiene asignados, a diferencia de "Solicitudes" que muestra todas las
 * notificaciones sin filtrar por resultado. No se creó ningún repositorio ni
 * servicio nuevo -- misma fuente, filtro distinto.
 *
 * **Agrupación "Próximos"/"Historial"**: la vista expone `estado_trabajo`
 * (columna real `trabajos.estado`, valores confirmados vía MCP:
 * `'live'|'assigned'|'completed'|'cancelled'`, ver `trabajoEstadoInfo()` en
 * `@/constants`). Se agrupa en "Historial" únicamente `completed`/
 * `cancelled`; cualquier otro valor (incluido `live`, caso límite que en la
 * práctica no debería ocurrir con `gane_yo === true`, y cualquier valor
 * futuro no contemplado) cae en "Próximos" por seguridad -- nunca se oculta
 * un trabajo por un valor de estado inesperado.
 *
 * Verificado vía MCP (2026-08-07): Producción no tiene todavía ningún
 * trabajo con `estado <> 'live'` -- esta pantalla no pudo validarse
 * visualmente con datos reales de "Historial"/"Asignado" por ausencia de
 * esos datos, no por un defecto de la consulta.
 */
type Grupo = 'Próximos' | 'Historial';

const GRUPOS: readonly Grupo[] = ['Próximos', 'Historial'];
const ESTADOS_HISTORIAL = new Set(['completed', 'cancelled']);

function grupoDeTrabajo(estadoTrabajo: string | null): Grupo {
  return estadoTrabajo && ESTADOS_HISTORIAL.has(estadoTrabajo) ? 'Historial' : 'Próximos';
}

export function InstallerJobs() {
  const [trabajos, setTrabajos] = useState<TrabajoParaInstaladorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const misTrabajos = trabajos.filter((trabajo) => trabajo.gane_yo === true);

  if (misTrabajos.length === 0) {
    return (
      <div className="mx-phone-empty">
        <Briefcase size={26} />
        <p>No tienes trabajos asignados.</p>
        <span>Cuando aceptes un trabajo aparecerá aquí.</span>
      </div>
    );
  }

  return (
    <div className="mx-myjobs">
      {GRUPOS.map((grupo) => {
        const items = misTrabajos.filter((trabajo) => grupoDeTrabajo(trabajo.estado_trabajo) === grupo);
        if (items.length === 0) return null;

        return (
          <Fragment key={grupo}>
            <div className="mx-phonehdr">
              <Briefcase size={13} />
              {grupo}
            </div>
            {items.map((trabajo) => {
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
                    {trabajo.precio_sugerido != null ? (
                      <span className="mx-myjob-price">${trabajo.precio_sugerido}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
}
