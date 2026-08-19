import { AlertTriangle, CheckCircle2, Crown, Mail, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { PageContainer, PageHead } from '@/components/shared/page-container';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Loading, Spinner } from '@/components/ui/spinner';
import { Toast, ToastViewport, type ToastTone } from '@/components/ui/toast';
import { useAuth } from '@/hooks/useAuth';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { adminsRepository } from '@/repositories';
import { adminOperationsService } from '@/services/admin-operations.service';
import type { TableRow } from '@/services/database.service';

/**
 * AdminAdministradores — módulo CRUD de Administradores (Gestión de
 * Administradores y Coordinadores, cierre del Sprint C -- ver
 * ANALISIS_GESTION_USUARIOS.md).
 *
 * Reutiliza exclusivamente los contratos ya validados en el Sprint C:
 * `adminsRepository.getByEmpresaId()` (repositorio ya existente, sin
 * cambios) para el listado, y `adminOperationsService.inviteAdmin()`/
 * `.setAdminActivo()` (Edge Function `admin-operations` v7, ya desplegada y
 * validada extremo a extremo) para las acciones de escritura. Ningún RLS,
 * migración ni Edge Function se toca en este Sprint.
 *
 * Mismo patrón visual/estructural que `admin-instaladores.tsx` (tabla +
 * formulario de invitación + toggle de estado + Toast local,
 * `.mx-admintable`/`.mx-adminrow*`/`.mx-admin-act`/`.mx-invite*`, sin CSS
 * nuevo) -- "reutilizar el lenguaje visual actual", mismo criterio ya
 * establecido en el proyecto.
 *
 * **Matriz de permisos aprobada (ANALISIS_GESTION_USUARIOS.md, C2)**: ver
 * y gestionar coordinadores/instaladores/empresas es igual para Principal y
 * Secundario -- la ÚNICA diferencia real es la gestión de administradores.
 * Por eso "Ver administradores" siempre se muestra (RLS ya lo permite para
 * cualquier admin de la misma empresa, `0013`/`0014`), pero "Invitar
 * administrador"/"Activar-desactivar" solo se muestran cuando
 * `profile.esPrincipal === true` -- **esto es únicamente UX**: la
 * autorización real vive en `admin-operations` (gate
 * `caller.activo && caller.es_principal`), que rechaza con `403` a
 * cualquier Secundario que intente invocarlas igual, con o sin este botón
 * visible. La fila del propio Principal nunca muestra el botón de
 * activar/desactivar (`admin.es_principal`) -- mismo criterio: la Edge
 * Function ya lo rechaza (`existing.es_principal` → 403) y el trigger
 * `proteger_ultimo_admin_principal` (0012) es la garantía final de base de
 * datos: esto solo evita mostrar un botón que siempre fallaría.
 */

type AdminRow = TableRow<'admins'>;

interface InviteForm {
  nombre: string;
  email: string;
  telefono: string;
}

const INITIAL_FORM: InviteForm = { nombre: '', email: '', telefono: '' };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormToast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

let toastIdSeq = 0;

export function AdminAdministradores() {
  const { profile } = useAuth();
  const { empresaId, loading: contextLoading } = useOperationalContext();
  const esPrincipal = profile?.esPrincipal === true;

  const [admins, setAdmins] = useState<AdminRow[]>([]);
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

  const loadAdmins = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);
    setError(null);
    const result = await adminsRepository.getByEmpresaId(empresaId);
    if (result.ok) {
      setAdmins(result.data);
    } else {
      setError(result.error.message);
    }
    setIsLoading(false);
  }, [empresaId]);

  useEffect(() => {
    if (contextLoading) return;
    if (!empresaId) {
      setIsLoading(false);
      setError('No se pudo determinar la empresa activa.');
      return;
    }
    void loadAdmins();
  }, [contextLoading, empresaId, loadAdmins]);

  const enviar = async () => {
    const nombre = form.nombre.trim();
    const email = form.email.trim();
    const telefono = form.telefono.trim();

    const problemas: string[] = [];
    if (!nombre) problemas.push('El nombre es obligatorio.');
    if (!EMAIL_PATTERN.test(email)) problemas.push('Indicá un correo electrónico válido.');

    if (problemas.length > 0) {
      pushToast('error', 'Revisá el formulario', problemas.join(' '));
      return;
    }

    setError(null);
    setIsSending(true);
    const result = await adminOperationsService.inviteAdmin({
      nombre,
      email,
      telefono: telefono || null,
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
    await loadAdmins();
  };

  const toggleActivo = async (admin: AdminRow) => {
    setError(null);
    setUpdatingId(admin.id);
    const result = await adminOperationsService.setAdminActivo({
      admin_id: admin.id,
      activo: !admin.activo,
    });
    setUpdatingId(null);

    if (!result.ok) {
      pushToast('error', 'No se pudo actualizar el estado', result.error.message);
      return;
    }

    await loadAdmins();
  };

  return (
    <PageContainer>
      <PageHead
        title="Gestión de administradores"
        subtitle="Solo el Administrador Principal puede invitar o activar/desactivar administradores."
      />
      <div className="mx-admingrid">
        <Card>
          <CardHeader icon={<Users size={14} />} cardTitle={`Administradores (${admins.length})`} />
          <div className="mx-admintable">
            {isLoading ? (
              <Loading label="Cargando administradores…" />
            ) : error && admins.length === 0 ? (
              <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p>
            ) : admins.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>No hay administradores registrados todavía.</p>
            ) : (
              admins.map((admin) => {
                const estadoTone: BadgeTone = admin.activo ? 'green' : 'red';
                const isRowUpdating = updatingId === admin.id;
                const puedeModificar = esPrincipal && !admin.es_principal;

                return (
                  <div key={admin.id} className="mx-adminrow">
                    <div className="mx-adminrow-main">
                      <div className="mx-adminrow-top">
                        <span className="mx-adminrow-name">{admin.nombre}</span>
                        {admin.es_principal ? (
                          <Badge tone="amber">
                            <Crown size={11} style={{ marginRight: 4 }} />
                            Principal
                          </Badge>
                        ) : (
                          <Badge tone="ice">Secundario</Badge>
                        )}
                        <Badge tone={estadoTone}>{admin.activo ? 'Activo' : 'Inactivo'}</Badge>
                      </div>
                      <div className="mx-adminrow-meta">
                        <span>
                          <Mail size={11} />
                          {admin.email ?? 'Sin correo'}
                        </span>
                      </div>
                    </div>
                    {puedeModificar ? (
                      <button
                        type="button"
                        className={`mx-admin-act${admin.activo ? ' danger' : ''}`}
                        disabled={isRowUpdating}
                        onClick={() => void toggleActivo(admin)}
                      >
                        {isRowUpdating ? <Spinner size={12} /> : admin.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </Card>
        <Card className="mx-invite">
          <CardHeader icon={<UserPlus size={14} />} cardTitle="Invitar administrador" />
          {!esPrincipal ? (
            <div className="mx-invite-note">
              <AlertTriangle size={13} />
              Solo el Administrador Principal puede invitar nuevos administradores.
            </div>
          ) : (
            <>
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
                  placeholder="Ej. María Gómez"
                  disabled={isSending}
                  onChange={(e) => setField('nombre', e.target.value)}
                />
              </label>
              <label>
                Correo
                <input
                  type="email"
                  value={form.email}
                  placeholder="admin@multimax.net"
                  disabled={isSending}
                  onChange={(e) => setField('email', e.target.value)}
                />
              </label>
              <label>
                Teléfono (opcional)
                <input
                  value={form.telefono}
                  placeholder="+507 6000-0000"
                  disabled={isSending}
                  onChange={(e) => setField('telefono', e.target.value)}
                />
              </label>
              <Button variant="ice" style={{ width: '100%' }} disabled={isSending} onClick={() => void enviar()}>
                {isSending ? <Spinner size={16} /> : <Mail size={16} />}
                {isSending ? 'Enviando…' : 'Enviar invitación'}
              </Button>
              <div className="mx-invite-note">
                <AlertTriangle size={13} />
                El nuevo administrador queda activo de inmediato una vez que establezca su contraseña.
              </div>
            </>
          )}
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
