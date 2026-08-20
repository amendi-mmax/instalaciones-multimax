import { AlertTriangle, CheckCircle2, Mail, Store, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { PageContainer, PageHead } from '@/components/shared/page-container';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Loading, Spinner } from '@/components/ui/spinner';
import { Toast, ToastViewport, type ToastTone } from '@/components/ui/toast';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { tiendasRepository } from '@/repositories';
import { adminOperationsService } from '@/services/admin-operations.service';
import type { CoordinadorConEmail } from '@/types/admin-operations';
import type { TableRow } from '@/services/database.service';

/**
 * AdminCoordinadores — módulo CRUD de Coordinadores (Sprint 9.3, "Gestión
 * de Coordinadores" -- ver ANALISIS_GESTION_USUARIOS.md, "CIERRE
 * ARQUITECTÓNICO", C6/C9, Sprint D).
 *
 * Mismo patrón visual/estructural que `admin-administradores.tsx` (tabla +
 * formulario de invitación + toggle de estado + Toast local,
 * `.mx-admintable`/`.mx-adminrow*`/`.mx-admin-act`/`.mx-invite*`, sin CSS
 * nuevo). Diferencias reales frente a Administradores, dictadas por el
 * modelo de datos (no por preferencia de diseño):
 *
 * - El listado NO usa `coordinadoresRepository.getByEmpresaId()` (aunque
 *   ese repositorio existe y sigue disponible sin cambios para cualquier
 *   otro consumo) -- usa `adminOperationsService.listCoordinadores()`
 *   porque `public.coordinadores` no tiene columna `email` (confirmado
 *   contra el schema real); el correo solo existe en `auth.users`, y la
 *   única forma segura de resolverlo es server-side vía Auth Admin API
 *   (`getUserById()`), dentro de la misma Edge Function de confianza que ya
 *   maneja el resto de operaciones administrativas. Ver JSDoc de
 *   `listCoordinadores()` (`admin-operations/index.ts`) para el detalle
 *   completo de esta decisión.
 * - El formulario de invitación agrega un `<Select>` de tienda, poblado con
 *   `tiendasRepository.getByEmpresaId(empresaId)` (ya existente, sin
 *   cambios) -- mismo patrón que el `<Select>` de "Empresa / taller" en
 *   `admin-instaladores.tsx`.
 * - Sin distinción Principal/Secundario: gestionar coordinadores está
 *   disponible para cualquier admin activo (matriz de permisos C2,
 *   ANALISIS_GESTION_USUARIOS.md) -- a diferencia de Administradores, no
 *   hay ningún gate de `esPrincipal` en este componente.
 * - Sin edición (nombre/tienda): el módulo de Administradores, la
 *   referencia explícita de este Sprint, tampoco tiene ningún mecanismo de
 *   edición -- no existe un patrón seguro que copiar. Prioridad del MVP:
 *   listar, invitar, activar/desactivar (documentado como limitación).
 */

type CoordinadorRow = TableRow<'coordinadores'>;
type TiendaRow = TableRow<'tiendas'>;

interface InviteForm {
  nombre: string;
  email: string;
  tiendaId: string;
}

const INITIAL_FORM: InviteForm = { nombre: '', email: '', tiendaId: '' };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormToast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

let toastIdSeq = 0;

export function AdminCoordinadores() {
  const { empresaId, loading: contextLoading } = useOperationalContext();

  const [coordinadores, setCoordinadores] = useState<CoordinadorConEmail[]>([]);
  const [tiendas, setTiendas] = useState<TiendaRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<InviteForm>(INITIAL_FORM);
  const [sent, setSent] = useState<string | null>(null);

  const [toasts, setToasts] = useState<FormToast[]>([]);
  const pushToast = (tone: ToastTone, title: string, description?: string) => {
    const id = (toastIdSeq += 1);
    setToasts((prev) => [...prev, { id, tone, title, description }]);
  };
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const setField = (key: keyof InviteForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadCoordinadores = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await adminOperationsService.listCoordinadores();
    if (result.ok) {
      setCoordinadores(result.data);
    } else {
      setError(result.error.message);
    }
    setIsLoading(false);
  }, []);

  const loadTiendas = useCallback(async () => {
    if (!empresaId) return;
    const result = await tiendasRepository.getByEmpresaId(empresaId);
    setTiendas(result.ok ? result.data : []);
  }, [empresaId]);

  useEffect(() => {
    if (contextLoading) return;
    if (!empresaId) {
      setIsLoading(false);
      setError('No se pudo determinar la empresa activa.');
      return;
    }
    void loadCoordinadores();
    void loadTiendas();
  }, [contextLoading, empresaId, loadCoordinadores, loadTiendas]);

  const tiendaNombre = (tiendaId: string): string => {
    const tienda = tiendas?.find((t) => t.id === tiendaId);
    return tienda?.nombre ?? 'Tienda no disponible';
  };

  const tiendasActivas = (tiendas ?? []).filter((t) => t.activa);
  const sinTiendasActivas = tiendas !== null && tiendasActivas.length === 0;

  const enviar = async () => {
    const nombre = form.nombre.trim();
    const email = form.email.trim();
    const tiendaId = form.tiendaId;

    const problemas: string[] = [];
    if (!nombre) problemas.push('El nombre es obligatorio.');
    if (!EMAIL_PATTERN.test(email)) problemas.push('Indicá un correo electrónico válido.');
    if (!tiendaId) problemas.push('Seleccioná una tienda.');

    if (problemas.length > 0) {
      pushToast('error', 'Revisá el formulario', problemas.join(' '));
      return;
    }

    setError(null);
    setIsSending(true);
    const result = await adminOperationsService.inviteCoordinador({
      nombre,
      email,
      tienda_id: tiendaId,
    });
    setIsSending(false);

    if (!result.ok) {
      setError(result.error.message);
      pushToast('error', 'No se pudo enviar la invitación', result.error.message);
      return;
    }

    setSent(nombre);
    setForm(INITIAL_FORM);
    pushToast('success', 'Invitación enviada', `${nombre} recibirá su enlace de acceso por correo.`);
    await loadCoordinadores();
  };

  const toggleActivo = async (coordinador: CoordinadorRow) => {
    setError(null);
    setUpdatingId(coordinador.id);
    const result = await adminOperationsService.setCoordinadorActivo({
      coordinador_id: coordinador.id,
      activo: !coordinador.activo,
    });
    setUpdatingId(null);

    if (!result.ok) {
      pushToast('error', 'No se pudo actualizar el estado', result.error.message);
      return;
    }

    await loadCoordinadores();
  };

  return (
    <PageContainer>
      <PageHead
        title="Gestión de coordinadores"
        subtitle="Cualquier administrador activo puede invitar o activar/desactivar coordinadores de tienda."
      />
      <div className="mx-admingrid">
        <Card>
          <CardHeader icon={<Users size={14} />} cardTitle={`Coordinadores (${coordinadores.length})`} />
          <div className="mx-admintable">
            {isLoading ? (
              <Loading label="Cargando coordinadores…" />
            ) : error && coordinadores.length === 0 ? (
              <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p>
            ) : coordinadores.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>No hay coordinadores registrados todavía.</p>
            ) : (
              coordinadores.map((coordinador) => {
                const estadoTone: BadgeTone = coordinador.activo ? 'green' : 'red';
                const isRowUpdating = updatingId === coordinador.id;

                return (
                  <div key={coordinador.id} className="mx-adminrow">
                    <div className="mx-adminrow-main">
                      <div className="mx-adminrow-top">
                        <span className="mx-adminrow-name">{coordinador.nombre}</span>
                        <Badge tone={estadoTone}>{coordinador.activo ? 'Activo' : 'Inactivo'}</Badge>
                      </div>
                      <div className="mx-adminrow-meta">
                        <span>
                          <Mail size={11} />
                          {coordinador.email ?? 'Sin correo'}
                        </span>
                        <span>
                          <Store size={11} />
                          {tiendaNombre(coordinador.tienda_id)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`mx-admin-act${coordinador.activo ? ' danger' : ''}`}
                      disabled={isRowUpdating}
                      onClick={() => void toggleActivo(coordinador)}
                    >
                      {isRowUpdating ? <Spinner size={12} /> : coordinador.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </Card>
        <Card className="mx-invite">
          <CardHeader icon={<UserPlus size={14} />} cardTitle="Invitar coordinador" />
          {sent ? (
            <div className="mx-invite-ok">
              <CheckCircle2 size={14} />
              <span>Invitación enviada a {sent}. Recibirá su enlace de acceso por correo.</span>
            </div>
          ) : null}
          <label>
            Nombre
            <input
              value={form.nombre}
              placeholder="Ej. Juan Pérez"
              disabled={isSending}
              onChange={(e) => setField('nombre', e.target.value)}
            />
          </label>
          <label>
            Correo
            <input
              type="email"
              value={form.email}
              placeholder="coordinador@multimax.net"
              disabled={isSending}
              onChange={(e) => setField('email', e.target.value)}
            />
          </label>
          <label>
            Tienda
            {tiendas === null ? (
              <Select disabled value="">
                <option value="">Cargando tiendas…</option>
              </Select>
            ) : sinTiendasActivas ? (
              <div className="mx-invite-note">
                <AlertTriangle size={13} />
                No existen tiendas activas. Debe existir al menos una tienda antes de invitar coordinadores.
              </div>
            ) : (
              <Select
                value={form.tiendaId}
                disabled={isSending}
                onChange={(e) => setField('tiendaId', e.target.value)}
              >
                <option value="">Seleccioná una tienda…</option>
                {tiendasActivas.map((tienda) => (
                  <option key={tienda.id} value={tienda.id}>
                    {tienda.nombre}
                  </option>
                ))}
              </Select>
            )}
          </label>
          <Button
            variant="ice"
            style={{ width: '100%' }}
            disabled={isSending || sinTiendasActivas}
            onClick={() => void enviar()}
          >
            {isSending ? <Spinner size={16} /> : <Mail size={16} />}
            {isSending ? 'Enviando…' : 'Enviar invitación'}
          </Button>
          <div className="mx-invite-note">
            <AlertTriangle size={13} />
            El nuevo coordinador queda activo de inmediato una vez que establezca su contraseña.
          </div>
        </Card>
      </div>
      <ToastViewport>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            tone={toast.tone}
            toastTitle={toast.title}
            description={toast.description}
            onClose={() => dismissToast(toast.id)}
          />
        ))}
      </ToastViewport>
    </PageContainer>
  );
}
