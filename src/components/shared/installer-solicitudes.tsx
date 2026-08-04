import { Bell, Briefcase, Calendar, CheckCircle2, ChevronLeft, Loader2, MapPin, Send } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/spinner';
import { InstallerSolicitudesEmptyState } from '@/components/shared/installer-solicitudes-empty-state';
import { callSubmitBid } from '@/services/database.service';
import {
  trabajosParaInstaladorRepository,
  type TrabajoParaInstaladorRow,
} from '@/repositories';

/**
 * InstallerSolicitudes — Sprint 7.2 (continuación del Sprint 7.1). Reemplaza
 * el estado vacío fijo (`InstallerSolicitudesEmptyState`, Sprint 3.10) por
 * el listado real de trabajos notificados al instalador autenticado, con
 * detalle y envío de oferta -- las 7 ramas de la pestaña "Solicitudes"
 * originalmente fuera de alcance (`mx-alert`/`mx-offer`/...) siguen sin
 * reconstruirse verbatim (ese diseño depende de datos que el HTML original
 * modelaba distinto -- `job`/`me`/`step` en memoria, no una tabla real);
 * en su lugar, se construye el equivalente funcional pedido por el brief
 * de este Sprint, reutilizando el lenguaje visual ya existente de
 * `InstallerJobs` (`.mx-myjobs`/`.mx-myjob*`, Sprint 3.12) en vez de
 * inventar una convención nueva.
 *
 * **Patrón maestro-detalle**: mismo criterio que `MasterCalendar` (`selDate`,
 * Sprint 3.14) -- un solo estado local (`selectedTrabajoId`) alterna entre
 * lista y detalle dentro de la MISMA pantalla, sin ruta ni página nueva
 * (Decisión aprobada explícitamente para este Sprint). Sin Drawer/Modal --
 * el detalle reemplaza la lista dentro del propio marco del teléfono
 * (`PhoneFrame`), consistente con que toda la navegación de
 * `InstallerDashboard` ya ocurre así (`instTab`).
 *
 * **Fuente de datos**: `trabajosParaInstaladorRepository` (vista real
 * `trabajos_para_instalador`, ya filtrada por RLS a `auth.uid()` -- no
 * depende de `meId`/`INSTALLERS` mock, que sigue siendo exclusivamente el
 * selector "quién soy" de demostración, sin relación con la sesión real).
 *
 * **Oferta única**: `submit_bid` ya garantiza una sola oferta por
 * instalador por trabajo (`ON CONFLICT ... DO NOTHING`, ver migración
 * `0006`); acá se refuerza en la UI ocultando el formulario cuando
 * `mi_estado !== 'notificado'` (ya respondió), para no ofrecer una acción
 * que el backend silenciosamente ignoraría.
 */
type Vista = { tipo: 'lista' } | { tipo: 'detalle'; trabajoId: string };

interface OfertaForm {
  precio: string;
  dia: string;
  hora: string;
  comentario: string;
}

const INITIAL_OFERTA_FORM: OfertaForm = { precio: '', dia: '', hora: '', comentario: '' };

export function InstallerSolicitudes() {
  const [trabajos, setTrabajos] = useState<TrabajoParaInstaladorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' });

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
        <Bell size={26} />
        <p>No se pudieron cargar tus solicitudes.</p>
        <span style={{ color: 'var(--red)' }}>{error}</span>
      </div>
    );
  }

  if (trabajos === null) {
    return <Loading label="Cargando solicitudes…" />;
  }

  if (vista.tipo === 'detalle') {
    const trabajo = trabajos.find((t) => t.trabajo_id === vista.trabajoId);
    if (!trabajo) {
      // El trabajo ya no está en la lista cargada (caso límite, no
      // esperado en uso normal) -- vuelve a la lista en vez de mostrar una
      // pantalla vacía sin salida.
      return (
        <div className="mx-myjobs">
          <button type="button" className="mx-backbtn" onClick={() => setVista({ tipo: 'lista' })}>
            <ChevronLeft size={15} />
            Volver
          </button>
        </div>
      );
    }
    return (
      <SolicitudDetalle trabajo={trabajo} onVolver={() => setVista({ tipo: 'lista' })} />
    );
  }

  if (trabajos.length === 0) {
    return <InstallerSolicitudesEmptyState />;
  }

  return (
    <div className="mx-myjobs">
      <div className="mx-phonehdr">
        <Briefcase size={13} />
        Solicitudes
      </div>
      {trabajos.map((trabajo) => (
        <div
          key={trabajo.trabajo_id}
          className="mx-myjob"
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
          onClick={() => setVista({ tipo: 'detalle', trabajoId: trabajo.trabajo_id! })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setVista({ tipo: 'detalle', trabajoId: trabajo.trabajo_id! });
            }
          }}
        >
          <div className="mx-myjob-top">
            <span className="mx-myjob-t">{trabajo.tipo}</span>
            {trabajo.mi_estado === 'respondido' ? (
              <Badge tone="green">Oferta enviada</Badge>
            ) : (
              <Badge tone="amber">Nueva solicitud</Badge>
            )}
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
      ))}
    </div>
  );
}

function SolicitudDetalle({
  trabajo,
  onVolver,
}: {
  trabajo: TrabajoParaInstaladorRow;
  onVolver: () => void;
}) {
  const yaEnviada = trabajo.mi_estado !== 'notificado';

  const [form, setForm] = useState<OfertaForm>(INITIAL_OFERTA_FORM);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof OfertaForm>(key: K, value: OfertaForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const precioNumero = Number(form.precio);
  const errores = {
    precio: !form.precio.trim() || precioNumero <= 0 ? 'Indicá un precio válido.' : undefined,
    dia: !form.dia.trim() ? 'Seleccioná un día disponible.' : undefined,
    hora: !form.hora.trim() ? 'Indicá una hora disponible.' : undefined,
  };
  const mostrarErrores = submitAttempted;

  const enviarOferta = async () => {
    if (isSubmitting) return;
    if (Object.values(errores).some(Boolean)) {
      setSubmitAttempted(true);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const result = await callSubmitBid({
      p_trabajo_id: trabajo.trabajo_id!,
      p_precio: precioNumero,
      p_dia: form.dia,
      p_hora: form.hora,
      p_comentario: form.comentario.trim(),
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setEnviada(true);
  };

  return (
    <div className="mx-myjobs">
      <button type="button" className="mx-backbtn" onClick={onVolver}>
        <ChevronLeft size={15} />
        Volver
      </button>

      <div className="mx-myjob" style={{ cursor: 'default' }}>
        <div className="mx-myjob-top">
          <span className="mx-myjob-t">{trabajo.tipo}</span>
        </div>
        <div className="mx-myjob-meta">
          <span>
            <MapPin size={12} />
            {trabajo.zona}, {trabajo.provincia}
          </span>
          <span>
            <Calendar size={12} />
            {trabajo.fecha} · {trabajo.hora}
          </span>
          {trabajo.precio_sugerido != null ? (
            <span className="mx-myjob-price">Sugerido: ${trabajo.precio_sugerido}</span>
          ) : null}
        </div>
        {trabajo.equipo ? <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{trabajo.equipo}</p> : null}
        {trabajo.requisitos ? (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{trabajo.requisitos}</p>
        ) : null}
        {/* `direccion_exacta`/`cliente_nombre`/`cliente_telefono` solo llegan
            no nulos si `gane_yo` -- ya resuelto por la vista real
            (`trabajos_para_instalador`), no por lógica de este componente. */}
        {trabajo.gane_yo && trabajo.direccion_exacta ? (
          <p style={{ fontSize: 12, color: 'var(--green)', marginTop: 6 }}>
            Dirección exacta: {trabajo.direccion_exacta}
          </p>
        ) : null}
      </div>

      {yaEnviada || enviada ? (
        <div className="mx-invite-ok">
          <CheckCircle2 size={14} />
          <span>Ya enviaste tu oferta para este trabajo. El Coordinador la está revisando.</span>
        </div>
      ) : (
        <div className="mx-fields">
          <label>
            Precio (USD)
            <Input
              type="number"
              value={form.precio}
              placeholder="Ej. 130"
              disabled={isSubmitting}
              onChange={(e) => set('precio', e.target.value)}
            />
            {mostrarErrores && errores.precio ? (
              <span style={{ color: 'var(--red)', fontSize: 12, display: 'block', marginTop: 4 }}>
                {errores.precio}
              </span>
            ) : null}
          </label>
          <label>
            Día disponible
            <input
              type="date"
              className="mx-datein"
              value={form.dia}
              disabled={isSubmitting}
              onChange={(e) => set('dia', e.target.value)}
            />
            {mostrarErrores && errores.dia ? (
              <span style={{ color: 'var(--red)', fontSize: 12, display: 'block', marginTop: 4 }}>
                {errores.dia}
              </span>
            ) : null}
          </label>
          <label>
            Hora disponible
            <Input
              value={form.hora}
              placeholder="Ej. 10:00 a.m."
              disabled={isSubmitting}
              onChange={(e) => set('hora', e.target.value)}
            />
            {mostrarErrores && errores.hora ? (
              <span style={{ color: 'var(--red)', fontSize: 12, display: 'block', marginTop: 4 }}>
                {errores.hora}
              </span>
            ) : null}
          </label>
          <label>
            Comentario (opcional)
            <Input
              value={form.comentario}
              placeholder="Ej. Puedo llegar antes si hace falta"
              disabled={isSubmitting}
              onChange={(e) => set('comentario', e.target.value)}
            />
          </label>
          {error ? (
            <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p>
          ) : null}
          <Button
            variant="ice"
            style={{ width: '100%' }}
            disabled={isSubmitting}
            onClick={() => void enviarOferta()}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-mx-spin" />
                Enviando…
              </>
            ) : (
              <>
                <Send size={16} />
                Enviar oferta
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
