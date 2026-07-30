import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  MapPin,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { PageContainer, PageHead } from '@/components/shared/page-container';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Loading, Spinner } from '@/components/ui/spinner';
import { ZONAS } from '@/constants';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { instaladoresRepository } from '@/repositories/instaladores.repository';
import { adminOperationsService } from '@/services/admin-operations.service';
import type { TableRow } from '@/services/database.service';

/**
 * AdminInstaladores — reconstruye `function AdminInstaladores()`
 * (`Multimax_Despacho_v1.3.html`, líneas 3049-3160), la pestaña
 * "Instaladores" dentro de `AdminPanel()` (Sprint 3.13). Mismo markup/CSS
 * que el Sprint 3.13 (`.mx-page`/`.mx-pagehead`/`.mx-admingrid`/
 * `.mx-admintable`/`.mx-adminrow*`/`.mx-invite*`) — este Sprint (6.2) NO
 * rediseña el componente, solo reemplaza su fuente de datos.
 *
 * **Sprint 6.2 — integración real** (reemplaza el mock `INSTALLERS`/`susp`/
 * `sent` de los Sprints 3.13/6.1): el listado viene de
 * `instaladoresRepository.getByEmpresaId()` (lectura, tabla `instaladores`);
 * invitar/suspender/reactivar invocan `adminOperationsService`, que a su vez
 * llama a la Edge Function `admin-operations` (`service_role`) — nunca al
 * revés, ver "Arquitectura" del plan del Sprint (lectura vía repositorio,
 * escritura vía servicio de Edge Function, sin mezclar responsabilidades).
 *
 * `INSTALLERS`/`InstallerMock` (`@/constants`) NO se tocan en este Sprint:
 * siguen siendo consumidos por `Radar` (Sprint 3.7), sin relación con este
 * componente desde ahora.
 */

type InstaladorRow = TableRow<'instaladores'>;

interface InviteForm {
  nombre: string;
  empresa: string;
  zona: string;
  email: string;
  telefono: string;
}

const INITIAL_FORM: InviteForm = {
  nombre: '',
  empresa: '',
  zona: 'Paitilla',
  email: '',
  telefono: '',
};

export function AdminInstaladores() {
  const { empresaId, loading: contextLoading } = useOperationalContext();

  const [instaladores, setInstaladores] = useState<InstaladorRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<InviteForm>(INITIAL_FORM);
  const [sent, setSent] = useState<string | null>(null);

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

  useEffect(() => {
    if (contextLoading) return;
    if (!empresaId) {
      setIsLoading(false);
      setError('No se pudo determinar la empresa activa.');
      return;
    }
    void loadInstaladores();
  }, [contextLoading, empresaId, loadInstaladores]);

  const enviar = async () => {
    const nombre = form.nombre.trim();
    const email = form.email.trim();

    setError(null);
    setIsSending(true);
    const result = await adminOperationsService.inviteInstalador({
      nombre,
      email,
      telefono: form.telefono.trim() || null,
      provincia: 'Panamá',
      zona: form.zona,
    });
    setIsSending(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setSent(nombre || form.empresa.trim() || 'el instalador');
    setForm(INITIAL_FORM);
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

                return (
                  <div key={installer.id} className="mx-adminrow">
                    <div className="mx-adminrow-main">
                      <div className="mx-adminrow-top">
                        <span className="mx-adminrow-name">{installer.nombre}</span>
                        <Badge tone={tone}>{label}</Badge>
                      </div>
                      <div className="mx-adminrow-meta">
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
            <input
              value={form.empresa}
              placeholder="Ej. Instalaciones PTY"
              disabled={isSending}
              onChange={(e) => setField('empresa', e.target.value)}
            />
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
            disabled={isSending || !form.nombre.trim() || !form.email.trim()}
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
    </PageContainer>
  );
}
