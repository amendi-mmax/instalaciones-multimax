import { AlertTriangle, Briefcase, Calendar, CheckCircle2, MapPin, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading, Spinner } from '@/components/ui/spinner';
import { trabajoEstadoInfo } from '@/constants';
import { createRealtimeChannel, removeRealtimeChannel } from '@/lib/supabase/realtime';
import { categoriaDeTrabajo, type Categoria } from '@/lib/trabajo-categoria';
import { trabajoExtrasRepository, trabajosParaInstaladorRepository, type TrabajoParaInstaladorRow } from '@/repositories';
import { callMarcarTrabajoTerminado } from '@/services/database.service';
import type { TableRow } from '@/services/database.service';
import type { Perfil } from '@/types/perfil';
import { InstallerExtraForm } from '@/components/shared/installer-extra-form';

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
 * - **Asignados**: `gane_yo && estado_trabajo === 'assigned'` (también
 *   `'pending_confirmation'` desde la RONDA "Ciclo de vida Completado" --
 *   ver `categoriaDeTrabajo()`).
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
 * **RONDA — Ciclo de vida "Completado"**: se agrega `profile: Perfil` como
 * prop obligatoria (mismo patrón ya usado por `InstallerSolicitudes`/
 * `InstallerProfile` -- necesaria acá para 2 cosas reales: el filtro
 * Realtime, que necesita el `auth.uid()` del instalador, y la validación
 * visual de "es mi trabajo" antes de mostrar el botón). `installer-
 * dashboard.tsx` pasa a invocar `<InstallerJobs profile={profile} />` en
 * vez de `<InstallerJobs />` -- único cambio necesario ahí.
 *
 * **Botón "Marcar como completado"** (`estado_trabajo === 'assigned'`):
 * invoca `callMarcarTrabajoTerminado()` (RPC real `SECURITY DEFINER`,
 * migración `0024_finalizacion_trabajo.sql`) -- transición atómica
 * `assigned → pending_confirmation`, validada DENTRO del RPC (no solo en
 * este componente). El RPC devuelve `boolean`: si es `false` (0 filas
 * afectadas -- p. ej. otra pestaña ya lo marcó, o ya no es `assigned`), se
 * muestra un error real en vez de fingir éxito -- nunca se asume éxito solo
 * porque la llamada HTTP no falló. Tras un éxito real, se refresca la lista
 * (misma consulta ya existente, sin duplicar lógica) -- el trabajo
 * reaparece con `estado_trabajo='pending_confirmation'`, badge actualizado
 * (`trabajoEstadoInfo()`, ya extendido) y sin el botón (oculto para
 * cualquier estado que no sea `assigned`). El instalador NO tiene ninguna
 * ruta, ni en este componente ni en el RPC, para producir `completed`
 * directamente -- esa transición es exclusiva del coordinador
 * (`TrabajoDetailPage.tsx`).
 *
 * **Sprint "Costos adicionales"**: se agrega "Solicitar costo extra"
 * (`estado_trabajo === 'assigned'`) -- abre `InstallerExtraForm`, que
 * invoca `solicitar_costo_extra()`. Mientras exista una solicitud
 * `pendiente` para un trabajo, "Marcar como completado" se OCULTA para
 * ese trabajo (reemplazado por una nota informativa) -- coherente con la
 * misma regla ya aplicada en `marcar_trabajo_terminado()` (redefinida en
 * la migración `0026_trabajo_extras.sql` para rechazar la transición si
 * hay un extra pendiente); esta ocultación en UI es una segunda capa, no
 * la única -- el RPC sigue siendo la fuente real de verdad. Extras propios
 * cargados vía `trabajoExtrasRepository.getAll()` (RLS ya los scoped a
 * `instalador_id = auth.uid()`, sin filtro adicional acá) + un canal
 * Realtime nuevo (`trabajo_extras`, filtrado por `instalador_id`) para
 * recibir el resultado de la revisión del coordinador sin recargar.
 *
 * **Realtime (nuevo, esta ronda)**: hasta ahora esta pantalla solo
 * consultaba una vez al montar, sin Realtime -- gap detectado y diferido en
 * una ronda de análisis anterior. Se agrega un canal `postgres_changes`
 * `UPDATE` sobre `public.trabajos`, filtrado por `instalador_asignado_id=
 * eq.<profile.id>` (mismo scope que ya autoriza la policy RLS real
 * "instaladores ven trabajos donde fueron asignados", migración `0023`,
 * sin cambios). A diferencia del canal equivalente en `DespachoPage.tsx`
 * (que reemplaza la fila directamente en su propio estado `trabajos`, una
 * tabla real), acá NO se puede mergear el payload -- esta pantalla lee de
 * la VISTA `trabajos_para_instalador` (columnas adicionales como
 * `oferta_enviada`/`cliente_nombre` condicional, que no vienen en el evento
 * de la tabla base), y Realtime no puede suscribirse a vistas. El patrón
 * correcto acá es: el evento UPDATE es solo una SEÑAL -- dispara un
 * refetch de `trabajosParaInstaladorRepository.getAll()` (la misma consulta
 * ya existente), no un polling (no hay temporizador, solo reacciona a
 * eventos reales). Mismo criterio de limpieza que el resto del proyecto
 * (`removeRealtimeChannel` en el cleanup del efecto).
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

export interface InstallerJobsProps {
  profile: Perfil;
}

export function InstallerJobs({ profile }: InstallerJobsProps) {
  const [trabajos, setTrabajos] = useState<TrabajoParaInstaladorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<Categoria>('ofertados');
  const [marcandoId, setMarcandoId] = useState<string | null>(null);
  const [marcarError, setMarcarError] = useState<string | null>(null);

  // Sprint "Costos adicionales" -- ver JSDoc de cabecera.
  const [extras, setExtras] = useState<TableRow<'trabajo_extras'>[]>([]);
  const [extraModalTrabajoId, setExtraModalTrabajoId] = useState<string | null>(null);

  const cargarExtras = () => {
    trabajoExtrasRepository.getAll().then((result) => {
      if (result.ok) setExtras(result.data);
    });
  };

  const cargarTrabajos = () => {
    trabajosParaInstaladorRepository.getAll().then((result) => {
      if (result.ok) {
        setTrabajos(result.data);
      } else {
        setError(result.error.message);
      }
    });
  };

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

  // Realtime -- ver JSDoc de cabecera ("Realtime (nuevo, esta ronda)").
  // Señal + refetch, no merge directo (la fuente es una vista, no una
  // tabla). Sin `profile.id` no tiene sentido crear el canal -- nunca
  // ocurre en la práctica (`Perfil` siempre trae `id`), guard defensivo.
  useEffect(() => {
    if (!profile.id) return;
    const channel = createRealtimeChannel(`trabajos-instalador:${profile.id}`);
    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trabajos',
          filter: `instalador_asignado_id=eq.${profile.id}`,
        },
        () => {
          cargarTrabajos();
        },
      )
      .subscribe();
    return () => {
      void removeRealtimeChannel(channel);
    };
  }, [profile.id]);

  // Sprint "Costos adicionales" -- carga inicial + Realtime (mismo patrón
  // señal + refetch que el canal de arriba). INSERT+UPDATE: el INSERT
  // cubre una solicitud creada desde otra pestaña/sesión del mismo
  // instalador; el UPDATE cubre el resultado de la revisión del
  // coordinador.
  useEffect(() => {
    cargarExtras();
  }, []);

  useEffect(() => {
    if (!profile.id) return;
    const channel = createRealtimeChannel(`trabajo-extras-instalador:${profile.id}`);
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trabajo_extras', filter: `instalador_id=eq.${profile.id}` },
        () => cargarExtras(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trabajo_extras', filter: `instalador_id=eq.${profile.id}` },
        () => cargarExtras(),
      )
      .subscribe();
    return () => {
      void removeRealtimeChannel(channel);
    };
  }, [profile.id]);

  const marcarTerminado = async (trabajoId: string) => {
    if (marcandoId) return;
    setMarcarError(null);
    setMarcandoId(trabajoId);
    const result = await callMarcarTrabajoTerminado({ p_trabajo_id: trabajoId });
    setMarcandoId(null);

    if (!result.ok) {
      setMarcarError(result.error.message);
      return;
    }
    if (!result.data) {
      // RPC respondió sin error de red/Postgrest, pero devolvió `false` --
      // la transición NO ocurrió (0 filas afectadas). No se finge éxito.
      setMarcarError('No se pudo marcar este trabajo como completado. Puede que ya haya cambiado de estado.');
      return;
    }
    cargarTrabajos();
  };

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
      {marcarError ? (
        <p className="mx-sub" style={{ color: 'var(--red)' }}>
          {marcarError}
        </p>
      ) : null}
      {items.length === 0 ? (
        <div className="mx-phone-empty">
          <Briefcase size={22} />
          <p>{SIN_TRABAJOS[categoria]}</p>
        </div>
      ) : (
        items.map((trabajo) => {
          const estado = trabajoEstadoInfo(trabajo.estado_trabajo ?? '');
          const extrasDelTrabajo = extras.filter((extra) => extra.trabajo_id === trabajo.trabajo_id);
          const tienePendiente = extrasDelTrabajo.some((extra) => extra.estado === 'pendiente');
          const asignado = trabajo.estado_trabajo === 'assigned' && trabajo.trabajo_id;
          const puedeMarcarTerminado = asignado && !tienePendiente;
          const totalExtrasAprobados = extrasDelTrabajo
            .filter((extra) => extra.estado === 'aprobado')
            .reduce((total, extra) => total + (extra.monto_aprobado ?? extra.monto_solicitado), 0);

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
                    {totalExtrasAprobados > 0 ? ` + $${totalExtrasAprobados} extra` : ''}
                  </span>
                ) : null}
              </div>
              {extrasDelTrabajo.length > 0 && (
                <p className="mx-sub" style={{ marginTop: 6 }}>
                  {tienePendiente ? (
                    <span style={{ color: 'var(--amber)' }}>
                      <AlertTriangle size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                      Costo extra pendiente de aprobación -- no puedes marcar como completado todavía.
                    </span>
                  ) : (
                    `${extrasDelTrabajo.length} solicitud${extrasDelTrabajo.length === 1 ? '' : 'es'} de costo extra registrada${extrasDelTrabajo.length === 1 ? '' : 's'}.`
                  )}
                </p>
              )}
              {asignado ? (
                <Button
                  variant="ghost"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => setExtraModalTrabajoId(trabajo.trabajo_id!)}
                >
                  <Plus size={14} />
                  Solicitar costo extra
                </Button>
              ) : null}
              {puedeMarcarTerminado ? (
                <Button
                  variant="ice"
                  style={{ width: '100%', marginTop: 8 }}
                  disabled={marcandoId !== null}
                  onClick={() => void marcarTerminado(trabajo.trabajo_id!)}
                >
                  {marcandoId === trabajo.trabajo_id ? (
                    <Spinner size={16} />
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Marcar como completado
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          );
        })
      )}
      {extraModalTrabajoId ? (
        <InstallerExtraForm
          open={extraModalTrabajoId !== null}
          onOpenChange={(open) => {
            if (!open) setExtraModalTrabajoId(null);
          }}
          trabajoId={extraModalTrabajoId}
          onSubmitted={() => {
            cargarExtras();
            setExtraModalTrabajoId(null);
          }}
        />
      ) : null}
    </div>
  );
}
