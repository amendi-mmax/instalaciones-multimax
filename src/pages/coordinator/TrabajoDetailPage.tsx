import { Calendar, CheckCircle2, MapPin, MessageSquare, RotateCcw, Send, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loading, Spinner } from '@/components/ui/spinner';
import { trabajoEstadoInfo } from '@/constants';
import { instaladoresRepository } from '@/repositories';
import { callConfirmarTrabajoCompletado } from '@/services/database.service';
import { getTrabajoDetalle, type TableRow } from '@/services';

/**
 * TrabajoDetailPage — ruta `/trabajos/:id` (planificada desde
 * `ARCHITECTURE.md §8` como `TrabajoDetailPage`; Sprint 5.1 la implementa
 * por primera vez). Reconstruye `JobDetail({ job, onBack })`
 * (`Multimax_Despacho_v1.3.html`, líneas 2729-2823) con datos reales de
 * `trabajos` en vez del mock `TRABAJOS`.
 *
 * Simplificaciones deliberadas respecto al HTML fuente (documentadas, no
 * silenciosas -- ver `SPRINT_5_1_COORDINATOR_REPORT.md`):
 * - El timeline de 4 pasos del HTML fuente incluye "Instaladores
 *   notificados", derivado de `job.inst` (motor de bids del prototipo, sin
 *   respaldo real todavía -- tabla `trabajo_instaladores`, fuera de alcance
 *   de este Sprint). Este timeline usa 3 pasos (Publicado / Asignado /
 *   Completado), derivados únicamente de columnas reales de `trabajos`
 *   (`estado`, `instalador_asignado_id`, `asignado_at`).
 * - Los botones de `.mx-detailacts` ("Ver despacho en vivo"/"Contactar
 *   instalador"/"Duplicar trabajo") no tienen lógica real todavía (motor de
 *   ofertas/mensajería, Sprints 5.3+) -- se muestran `disabled`, mismo
 *   criterio ya establecido en `HeaderUserMenu` (Sprint 4.2.1) para ítems
 *   de menú sin implementación real todavía: visibles para fidelidad
 *   visual, pero sin fingir una funcionalidad que no existe.
 *
 * **Ajustes finales del flujo Instalador** (commit `9dd34f99`): se había
 * agregado acá `ResponsesPanel` cuando `trabajo.estado === 'live'`, como
 * único lugar donde un Admin/Coordinador podía ver las ofertas de
 * cualquier trabajo `live` (no solo del `activeJob` efímero de "Despacho
 * en vivo" de esa época).
 *
 * **AJUSTE SPRINT — Recomposición de Despacho en vivo** (`8ede7a6` en
 * adelante): esa integración se retira de aquí. "Despacho en vivo"
 * (`DespachoPage.tsx`) ahora carga TODOS los trabajos `live` de la tienda
 * (no solo el `activeJob` de la sesión) y permite seleccionar cualquiera
 * desde su propia lista, con `ResponsesPanel` en su sidebar derecho -- ese
 * es, desde este ajuste, el ÚNICO lugar de la aplicación donde se
 * coordinan/visualizan ofertas y se asigna un instalador. Esta página
 * (`/trabajos/:id`, alcanzable desde "Mis trabajos" del Coordinador) vuelve
 * a ser exclusivamente detalle/seguimiento de UN trabajo puntual -- mismo
 * criterio que ya regía antes de `9dd34f99` para `assigned`/`completed`/
 * `cancelled`, ahora extendido también a `live`.
 *
 * **RONDA — Ciclo de vida "Completado"**: por instrucción explícita
 * ("NO agregues la confirmación de completado al Despacho en vivo... la
 * confirmación debe vivir en la parte administrativa/detalle de trabajos
 * existente"), esta página (no `DespachoPage.tsx`) es el único lugar donde
 * el coordinador confirma el cierre de un trabajo `pending_confirmation`.
 * Botón "Confirmar completado" (visible únicamente cuando `trabajo.estado
 * === 'pending_confirmation'`), invoca `callConfirmarTrabajoCompletado()`
 * (RPC real `SECURITY INVOKER`, migración
 * `0024_finalizacion_trabajo.sql`) -- reutiliza las policies de `UPDATE`
 * sobre `trabajos` ya existentes para coordinadores/admins, sin RLS nueva.
 * El RPC devuelve `boolean`: si es `false` (0 filas afectadas -- p. ej. el
 * trabajo ya no está `pending_confirmation`), se muestra un error real en
 * vez de un éxito falso. Tras un éxito real, se vuelve a consultar
 * `getTrabajoDetalle()` (misma función ya existente) para reflejar
 * `estado='completed'` sin recargar la página. Sin Realtime propio en esta
 * página -- el canal de `DespachoPage.tsx` (`trabajos` UPDATE) no aplica
 * acá (esta pantalla no vive en esa página) y no se pidió uno nuevo; el
 * coordinador que confirma ve el cambio de inmediato porque es él mismo
 * quien lo produce, en la misma pestaña.
 */
export function TrabajoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [trabajo, setTrabajo] = useState<TableRow<'trabajos'> | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [instaladorNombre, setInstaladorNombre] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmarError, setConfirmarError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!id) return;
    setTrabajo(undefined);
    setError(null);
    getTrabajoDetalle(id).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setTrabajo(result.data);
      const instaladorId = result.data?.instalador_asignado_id;
      if (instaladorId) {
        instaladoresRepository.getById(instaladorId).then((instRes) => {
          if (active && instRes.ok && instRes.data) {
            setInstaladorNombre(instRes.data.nombre);
          }
        });
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  // RONDA — Ciclo de vida "Completado": ver JSDoc de cabecera. `id` siempre
  // está presente cuando este botón es alcanzable (la ruta `/trabajos/:id`
  // ya requiere el parámetro; si faltara, `trabajo` nunca se resolvería y
  // este bloque no se renderiza).
  const confirmarCompletado = async () => {
    if (!id || confirmando) return;
    setConfirmarError(null);
    setConfirmando(true);
    const result = await callConfirmarTrabajoCompletado({ p_trabajo_id: id });
    setConfirmando(false);

    if (!result.ok) {
      setConfirmarError(result.error.message);
      return;
    }
    if (!result.data) {
      // 0 filas afectadas -- la transición NO ocurrió (el trabajo ya no
      // estaba `pending_confirmation`). No se finge éxito.
      setConfirmarError('No se pudo confirmar. Puede que el trabajo ya haya cambiado de estado.');
      return;
    }
    const refreshed = await getTrabajoDetalle(id);
    if (refreshed.ok) {
      setTrabajo(refreshed.data);
    }
  };

  if (error) {
    return (
      <div className="mx-page">
        <button type="button" className="mx-backbtn" onClick={() => navigate('/trabajos')}>
          ‹ Volver
        </button>
        <p className="mx-sub" style={{ marginTop: 12 }}>
          {error}
        </p>
      </div>
    );
  }

  if (trabajo === undefined) {
    return <Loading label="Cargando trabajo…" />;
  }

  if (trabajo === null) {
    return (
      <div className="mx-page">
        <button type="button" className="mx-backbtn" onClick={() => navigate('/trabajos')}>
          ‹ Volver
        </button>
        <p className="mx-sub" style={{ marginTop: 12 }}>
          No se encontró este trabajo (o no pertenece a tu tienda).
        </p>
      </div>
    );
  }

  const estadoInfo = trabajoEstadoInfo(trabajo.estado);
  const completado = trabajo.estado === 'completed';
  const cancelado = trabajo.estado === 'cancelled';
  // RONDA — Ciclo de vida "Completado".
  const pendienteConfirmacion = trabajo.estado === 'pending_confirmation';

  const steps = [
    { b: 'Publicado', s: `${trabajo.fecha} · solicitud enviada`, cls: 'done' },
    {
      b: instaladorNombre ? 'Asignado' : 'En espera de asignación',
      s: instaladorNombre
        ? `${instaladorNombre} tomó el trabajo`
        : cancelado
          ? 'Sin asignación'
          : 'Esperando ofertas de instaladores',
      cls: instaladorNombre ? 'done' : trabajo.estado === 'live' ? 'act' : '',
    },
    {
      b: 'Completado',
      s: completado
        ? 'Servicio realizado y confirmado'
        : pendienteConfirmacion
          ? 'El instalador marcó el trabajo como terminado -- pendiente de tu confirmación'
          : 'Pendiente',
      cls: completado ? 'done' : pendienteConfirmacion ? 'act' : '',
    },
  ];

  return (
    <div className="mx-page">
      <div className="mx-pagehead">
        <button type="button" className="mx-backbtn" onClick={() => navigate('/trabajos')}>
          ‹ Volver
        </button>
        <div>
          <h2>{trabajo.tipo}</h2>
          <div className="mx-sub">
            {trabajo.codigo} · {trabajo.zona} · {trabajo.provincia}
          </div>
        </div>
        <span style={{ marginLeft: 'auto' }}>
          <Badge tone={estadoInfo.tone}>{estadoInfo.label}</Badge>
        </span>
      </div>

      <div className="mx-detail-grid">
        <Card>
          <div className="mx-section-h">
            <span>Detalle</span>
          </div>
          <div className="mx-kv">
            <div className="mx-kv-row">
              <MapPin size={14} />
              <div>
                <b>UBICACIÓN</b>
                {trabajo.direccion_exacta ?? trabajo.calle ?? `${trabajo.zona} · ${trabajo.provincia}`}
              </div>
            </div>
            <div className="mx-kv-row">
              <Calendar size={14} />
              <div>
                <b>FECHA Y HORA</b>
                {trabajo.fecha} · {trabajo.hora}
              </div>
            </div>
            <div className="mx-kv-row">
              <User size={14} />
              <div>
                <b>INSTALADOR</b>
                {instaladorNombre ?? 'Sin asignar'}
              </div>
            </div>
            {trabajo.cliente_nombre && (
              <div className="mx-kv-row">
                <User size={14} />
                <div>
                  <b>CLIENTE</b>
                  {trabajo.cliente_nombre}
                  {trabajo.cliente_telefono ? ` · ${trabajo.cliente_telefono}` : ''}
                </div>
              </div>
            )}
            {trabajo.precio_sugerido != null && (
              <div className="mx-kv-row">
                <Send size={14} />
                <div>
                  <b>MONTO SUGERIDO</b>${trabajo.precio_sugerido}
                </div>
              </div>
            )}
          </div>
          {pendienteConfirmacion ? (
            <div style={{ marginTop: 4 }}>
              {confirmarError ? (
                <p className="mx-sub" style={{ color: 'var(--red)', marginBottom: 8 }}>
                  {confirmarError}
                </p>
              ) : null}
              <Button
                variant="ice"
                style={{ width: '100%' }}
                disabled={confirmando}
                onClick={() => void confirmarCompletado()}
              >
                {confirmando ? (
                  <Spinner size={16} />
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Confirmar completado
                  </>
                )}
              </Button>
            </div>
          ) : null}
          <div className="mx-detailacts">
            <button type="button" disabled title="Disponible cuando exista el motor de ofertas (Sprint 5.3)">
              <MessageSquare size={14} />
              Contactar instalador
            </button>
            <button type="button" disabled title="Disponible en un Sprint futuro">
              <RotateCcw size={14} />
              Duplicar trabajo
            </button>
          </div>
        </Card>

        <Card>
          <div className="mx-section-h">
            <span>Seguimiento</span>
          </div>
          <div className="mx-timeline">
            {steps.map((step, i) => (
              <div key={i} className={`mx-tl ${step.cls}`}>
                <div className="mx-tl-dot" />
                <div>
                  <div className="mx-tl-b">{step.b}</div>
                  <div className="mx-tl-s">{step.s}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
