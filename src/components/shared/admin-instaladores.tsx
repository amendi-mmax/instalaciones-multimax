import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PageContainer, PageHead } from '@/components/shared/page-container';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Loading, Spinner } from '@/components/ui/spinner';
import { Toast, ToastViewport, type ToastTone } from '@/components/ui/toast';
import { ZONAS } from '@/constants';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { empresasInstaladorasRepository, instaladoresRepository } from '@/repositories';
import { adminOperationsService } from '@/services/admin-operations.service';
import type { TableRow } from '@/services/database.service';
import type { EmpresaInstaladoraRow } from '@/types/empresa-instaladora';

/**
 * AdminInstaladores — reconstruye `function AdminInstaladores()`
 * (`Multimax_Despacho_v1.3.html`, líneas 3049-3160), la pestaña
 * "Instaladores" dentro de `AdminPanel()` (Sprint 3.13). Mismo markup/CSS
 * base desde el Sprint 6.2 (`.mx-page`/`.mx-pagehead`/`.mx-admingrid`/
 * `.mx-admintable`/`.mx-adminrow*`/`.mx-invite*`) — este Sprint (8.4) NO
 * rediseña el componente ni sus estilos, solo conecta "Empresa / taller"
 * con el catálogo real.
 *
 * **Sprint 8.4 — "Registro de Instaladores utilizando Empresas
 * Instaladoras reales"**: el campo "Empresa / taller" del formulario de
 * invitación deja de ser un `<input>` de texto libre (nunca se guardaba en
 * ningún lado -- `form.empresa` solo se usaba para el mensaje de éxito) y
 * pasa a ser un `Select` (`ui/select.tsx`, ya existente) que consume
 * `empresasInstaladorasRepository.listar()` (Sprint 8.3), filtrado a
 * `activa === true` y ordenado por nombre (el repositorio ya ordena por
 * nombre; el filtro de `activa` se hace acá porque `listar()` no lo hace
 * -- ver su propio JSDoc, Sprint 8.3, sin modificar). El formulario ahora
 * guarda únicamente `empresa_instaladora_id` (FK real, migración `0010`),
 * nunca un nombre en texto plano. El listado resuelve "Empresa
 * Instaladora" vía el mismo catálogo (mapa `id -> nombre`), nunca texto
 * hardcodeado.
 *
 * `INSTALLERS`/`InstallerMock` (`@/constants`) NO se tocan en este Sprint:
 * siguen siendo consumidos por `Radar`/`AssignedPanel` (Coordinador,
 * explícitamente restringido este Sprint) -- verificado con `grep` antes
 * de cerrar el Sprint que ningún dato mock de "empresa instaladora"
 * permanece dentro de este módulo (Instaladores/Perfil).
 */

type InstaladorRow = TableRow<'instaladores'>;

interface InviteForm {
  nombre: string;
  empresaInstaladoraId: string;
  zona: string;
  email: string;
  telefono: string;
}

const INITIAL_FORM: InviteForm = {
  nombre: '',
  empresaInstaladoraId: '',
  zona: 'Paitilla',
  email: '',
  telefono: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormToast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

let formToastIdSeq = 0;

export function AdminInstaladores() {
  const { empresaId, loading: contextLoading } = useOperationalContext();

  const [instaladores, setInstaladores] = useState<InstaladorRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [empresasInstaladoras, setEmpresasInstaladoras] = useState<EmpresaInstaladoraRow[] | null>(null);

  const [form, setForm] = useState<InviteForm>(INITIAL_FORM);
  const [sent, setSent] = useState<string | null>(null);

  const [toasts, setToasts] = useState<FormToast[]>([]);
  const pushToast = (tone: ToastTone, title: string, description?: string) => {
    const id = (formToastIdSeq += 1);
    setToasts((prev) => [...prev, { id, tone, title, description }]);
  };
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const setField = (key: keyof InviteForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadInstaladores = useCallback(async () => {
    if (!empresaId) return;
    setIsLoading(true);
    setError(null);
    const result = await instaladoresRepository.getByEmpresaId(empresaId);
    if (result.ok) {
      setInstaladores(result.data);
    } else {
      setError(result.error.message);
    }
    setIsLoading(false);
  }, [empresaId]);

  const loadEmpresasInstaladoras = useCallback(async () => {
    if (!empresaId) return;
    const result = await empresasInstaladorasRepository.listar(empresaId);
    setEmpresasInstaladoras(result.ok ? result.data : []);
  }, [empresaId]);

  useEffect(() => {
    if (contextLoading) return;
    if (!empresaId) {
      setIsLoading(false);
      setError('No se pudo determinar la empresa activa.');
      return;
    }
    void loadInstaladores();
    void loadEmpresasInstaladoras();
  }, [contextLoading, empresaId, loadInstaladores, loadEmpresasInstaladoras]);

  // Parte 3/5 del Sprint 8.4: únicamente empresas activas, ordenadas por
  // nombre (el repositorio ya ordena -- `listar()`, Sprint 8.3, sin
  // modificar), y un mapa id -> nombre para resolver el listado de
  // instaladores sin texto hardcodeado.
  const empresasActivas = useMemo(
    () => (empresasInstaladoras ?? []).filter((empresa) => empresa.activa),
    [empresasInstaladoras],
  );
  const nombreEmpresaInstaladora = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const empresa of empresasInstaladoras ?? []) {
      mapa.set(empresa.id, empresa.nombre);
    }
    return mapa;
  }, [empresasInstaladoras]);

  const sinEmpresasActivas = empresasInstaladoras !== null && empresasActivas.length === 0;

  const enviar = async () => {
    const nombre = form.nombre.trim();
    const email = form.email.trim();
    const telefono = form.telefono.trim();

    // Parte 8: validaciones -- ninguna de las 4 puede quedar vacía/inválida.
    const problemas: string[] = [];
    if (!nombre) problemas.push('El nombre del contacto es obligatorio.');
    if (!EMAIL_PATTERN.test(email)) problemas.push('Indicá un correo electrónico válido.');
    if (!telefono) problemas.push('El teléfono es obligatorio.');
    if (!form.empresaInstaladoraId) problemas.push('Seleccioná una empresa instaladora.');

    if (problemas.length > 0) {
      pushToast('error', 'Revisá el formulario', problemas.join(' '));
      return;
    }

    setError(null);
    setIsSending(true);
    const result = await adminOperationsService.inviteInstalador({
      nombre,
      email,
      telefono,
      provincia: 'Panamá',
      zona: form.zona,
      empresa_instaladora_id: form.empresaInstaladoraId,
    });
    setIsSending(false);

    if (!result.ok) {
      setError(result.error.message);
      pushToast('error', 'No se pudo enviar la invitación', result.error.message);
      return;
    }

    setSent(nombre);
    setForm((prev) => ({ ...INITIAL_FORM, zona: prev.zona }));
    pushToast('success', 'Invitación enviada', `${nombre} recibirá su enlace de acceso por correo.`);
    await loadInstaladores();
  };

  const toggleSuspendido = async (installer: InstaladorRow) => {
    setError(null);
    setUpdatingId(installer.id);
    const result = installer.suspendido
      ? await adminOperationsService.reactivateInstalador({ instalador_id: installer.id })
      : await adminOperationsService.suspendInstalador({ instalador_id: installer.id });
    setUpdatingId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    await loadInstaladores();
  };

  return (
    <PageContainer>
      <PageHead
        title="Gestión de instaladores"
        subtitle="Multimax crea las cuentas e invita a los instaladores autorizados."
      />
      <div className="mx-admingrid">
        <Card>
          <CardHeader icon={<Users size={14} />} cardTitle={`Instaladores (${instaladores.length})`} />
          <div className="mx-admintable">
            {isLoading ? (
              <Loading label="Cargando instaladores…" />
            ) : instaladores.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                No hay instaladores registrados todavía.
              </p>
            ) : (
              instaladores.map((installer) => {
                const suspendido = installer.suspendido;
                const tone: BadgeTone = suspendido ? 'red' : !installer.documentos_ok ? 'amber' : 'green';
                const label = suspendido
                  ? 'Suspendido'
                  : !installer.documentos_ok
                    ? 'Docs pendientes'
                    : 'Activo';
                const isRowUpdating = updatingId === installer.id;
                // Parte 5: nombre resuelto mediante la relación real
                // (mapa id -> nombre del catálogo), nunca texto plano.
                const empresaInstaladoraNombre = installer.empresa_instaladora_id
                  ? (nombreEmpresaInstaladora.get(installer.empresa_instaladora_id) ?? 'Pendiente de asignación')
                  : 'Pendiente de asignación';

                return (
                  <div key={installer.id} className="mx-adminrow">
                    <div className="mx-adminrow-main">
                      <div className="mx-adminrow-top">
                        <span className="mx-adminrow-name">{installer.nombre}</span>
                        <Badge tone={tone}>{label}</Badge>
                      </div>
                      <div className="mx-adminrow-meta">
                        <span>
                          <Building2 size={11} />
                          {empresaInstaladoraNombre}
                        </span>
                        <span>
                          <MapPin size={11} />
                          {installer.zona ?? 'Sin zona'}
                        </span>
                        <span>
                          <Star size={11} className="mx-starc" />
                          {installer.rating}
                        </span>
                        <span>
                          <ShieldCheck size={11} />
                          {installer.cumplimiento ?? 0}% cumpl.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`mx-admin-act${suspendido ? '' : ' danger'}`}
                      disabled={isRowUpdating}
                      onClick={() => void toggleSuspendido(installer)}
                    >
                      {isRowUpdating ? (
                        <Spinner size={12} />
                      ) : suspendido ? (
                        'Reactivar'
                      ) : (
                        'Suspender'
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </Card>
        <Card className="mx-invite">
          <CardHeader icon={<UserPlus size={14} />} cardTitle="Invitar instalador" />
          {sent ? (
            <div className="mx-invite-ok">
              <CheckCircle2 size={14} />
              <span>Invitación enviada a {sent}. Recibirá su enlace de acceso por correo.</span>
            </div>
          ) : null}
          {error ? (
            <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{error}</p>
          ) : null}
          <label>
            Nombre del contacto
            <input
              value={form.nombre}
              placeholder="Ej. Juan Pérez"
              disabled={isSending}
              onChange={(e) => setField('nombre', e.target.value)}
            />
          </label>
          <label>
            Empresa / taller
            {empresasInstaladoras === null ? (
              <Select disabled value="">
                <option value="">Cargando empresas…</option>
              </Select>
            ) : sinEmpresasActivas ? (
              <div className="mx-invite-note">
                <AlertTriangle size={13} />
                No existen empresas instaladoras registradas. Debe crear una empresa antes de registrar
                instaladores.
              </div>
            ) : (
              <Select
                value={form.empresaInstaladoraId}
                disabled={isSending}
                onChange={(e) => setField('empresaInstaladoraId', e.target.value)}
              >
                <option value="">Seleccioná una empresa…</option>
                {empresasActivas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </option>
                ))}
              </Select>
            )}
          </label>
          <label>
            Zona principal
            <select
              value={form.zona}
              disabled={isSending}
              onChange={(e) => setField('zona', e.target.value)}
            >
              {ZONAS['Panamá'].map((zona) => (
                <option key={zona} value={zona}>
                  {zona}
                </option>
              ))}
            </select>
          </label>
          <label>
            Correo
            <input
              type="email"
              value={form.email}
              placeholder="instalador@correo.com"
              disabled={isSending}
              onChange={(e) => setField('email', e.target.value)}
            />
          </label>
          <label>
            Teléfono / WhatsApp
            <input
              value={form.telefono}
              placeholder="+507 6000-0000"
              disabled={isSending}
              onChange={(e) => setField('telefono', e.target.value)}
            />
          </label>
          <Button
            variant="ice"
            style={{ width: '100%' }}
            disabled={isSending || sinEmpresasActivas || empresasInstaladoras === null}
            onClick={() => void enviar()}
          >
            {isSending ? <Spinner size={16} /> : <Mail size={16} />}
            {isSending ? 'Enviando…' : 'Enviar invitación'}
          </Button>
          <div className="mx-invite-note">
            <AlertTriangle size={13} />
            La cuenta queda pendiente hasta que el instalador confirme sus datos.
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
