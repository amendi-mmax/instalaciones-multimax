import {
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Plus,
  Power,
} from 'lucide-react';
import { useState } from 'react';

import { PageContainer, PageHead } from '@/components/shared/page-container';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmpresaInstaladoraFormDialog } from '@/components/shared/empresa-instaladora-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { SearchBox } from '@/components/ui/search-box';
import { Select } from '@/components/ui/select';
import { Loading } from '@/components/ui/spinner';
import { Toast, ToastViewport, type ToastTone } from '@/components/ui/toast';
import { useEmpresasInstaladoras } from '@/hooks/useEmpresasInstaladoras';
import type {
  EmpresaInstaladoraFormValues,
  EmpresaInstaladoraRow,
  EmpresaInstaladoraSortField,
} from '@/types/empresa-instaladora';

/**
 * AdminEmpresasInstaladoras — Sprint 8.3 ("Administración de Empresas
 * Instaladoras"). Pantalla `Administración → Empresas Instaladoras`,
 * integrada como cuarta pestaña de `AdminPanel` (ver su propio JSDoc),
 * mismo patrón `MxSubtabs`/`MxSubtabButton` que las 3 pestañas existentes
 * -- sin CSS/markup de navegación nuevo.
 *
 * Reutiliza exactamente el lenguaje visual de `AdminInstaladores`
 * (`.mx-page`/`.mx-admingrid`/`.mx-admintable`/`.mx-adminrow*`/
 * `.mx-admin-act`, Sprint 3.13/6.2) para el listado, `SearchBox` (Fase 3,
 * sin consumidor real hasta este Sprint) para la búsqueda, `Select`
 * nativo para el ordenamiento, `Modal` (vía `EmpresaInstaladoraFormDialog`)
 * para crear/editar y `ConfirmDialog` para activar/desactivar -- ningún
 * componente ni clase CSS nueva. Paginación: controles `Button
 * variant="ghost"` + indicador de página, sin componente nuevo (no existe
 * precedente de paginación en el proyecto; se resuelve con los mismos
 * átomos ya existentes, ver JSDoc de `useEmpresasInstaladoras`).
 *
 * Toda la lógica de negocio (carga/búsqueda/orden/paginación/CRUD) vive en
 * `useEmpresasInstaladoras` -- este componente es orquestación de UI +
 * estado puramente local de diálogos/Toast, mismo criterio que
 * `MasterCalendar`/`useCalendarData` (Sprint 8.2).
 */
const SORT_OPTIONS: Array<[EmpresaInstaladoraSortField, string]> = [
  ['nombre', 'Nombre'],
  ['ciudad', 'Ciudad'],
  ['activa', 'Estado'],
  ['created_at', 'Fecha de alta'],
];

interface EmpresaToast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

let toastIdSeq = 0;

export function AdminEmpresasInstaladoras() {
  const {
    status,
    error,
    totalFiltradas,
    empresas,
    search,
    setSearch,
    sort,
    setSort,
    page,
    totalPaginas,
    setPage,
    crear,
    actualizar,
    activar,
    desactivar,
  } = useEmpresasInstaladoras();

  const [formOpen, setFormOpen] = useState(false);
  const [formEmpresa, setFormEmpresa] = useState<EmpresaInstaladoraRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<EmpresaInstaladoraRow | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const [toasts, setToasts] = useState<EmpresaToast[]>([]);
  const pushToast = (tone: ToastTone, title: string, description?: string) => {
    const id = (toastIdSeq += 1);
    setToasts((prev) => [...prev, { id, tone, title, description }]);
  };
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const abrirCrear = () => {
    setFormEmpresa(null);
    setFormError(null);
    setFormOpen(true);
  };

  const abrirEditar = (empresa: EmpresaInstaladoraRow) => {
    setFormEmpresa(empresa);
    setFormError(null);
    setFormOpen(true);
  };

  const guardar = async (values: EmpresaInstaladoraFormValues) => {
    setIsSaving(true);
    setFormError(null);

    const patch = {
      nombre: values.nombre.trim(),
      razon_social: values.razonSocial.trim() || null,
      contacto: values.contacto.trim() || null,
      email: values.email.trim() || null,
      telefono: values.telefono.trim() || null,
      direccion: values.direccion.trim() || null,
      ciudad: values.ciudad.trim() || null,
      provincia: values.provincia.trim() || null,
      pais: values.pais.trim() || 'Panamá',
      logo_url: values.logoUrl.trim() || null,
    };

    const result = formEmpresa
      ? await actualizar(formEmpresa.id, patch)
      : await crear(patch);

    setIsSaving(false);

    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }

    setFormOpen(false);
    pushToast(
      'success',
      formEmpresa ? 'Empresa actualizada' : 'Empresa creada',
      `${result.data.nombre} se guardó correctamente.`,
    );
  };

  const confirmarToggle = async () => {
    if (!confirmTarget) return;
    setIsToggling(true);
    const result = confirmTarget.activa
      ? await desactivar(confirmTarget.id)
      : await activar(confirmTarget.id);
    setIsToggling(false);
    setConfirmTarget(null);

    if (!result.ok) {
      pushToast('error', 'No se pudo actualizar el estado', result.error.message);
      return;
    }
    pushToast(
      'success',
      result.data.activa ? 'Empresa activada' : 'Empresa desactivada',
      result.data.nombre,
    );
  };

  return (
    <PageContainer>
      <PageHead
        title="Empresas instaladoras"
        subtitle="Catálogo oficial de empresas subcontratistas -- utilizado por el Sprint 8.4 para el registro de instaladores."
        action={
          <Button variant="ice" onClick={abrirCrear}>
            <Plus size={16} />
            Nueva empresa
          </Button>
        }
      />
      <Card>
        <CardHeader icon={<Building2 size={14} />} cardTitle={`Empresas (${totalFiltradas})`} />
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3 pt-1">
          <div className="min-w-[220px] flex-1">
            <SearchBox
              value={search}
              placeholder="Buscar por nombre, contacto o ciudad…"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={sort.campo}
            onChange={(e) =>
              setSort({ campo: e.target.value as EmpresaInstaladoraSortField, direccion: sort.direccion })
            }
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                Ordenar por {label}
              </option>
            ))}
          </Select>
          <Select
            value={sort.direccion}
            onChange={(e) => setSort({ campo: sort.campo, direccion: e.target.value as 'asc' | 'desc' })}
          >
            <option value="asc">Ascendente</option>
            <option value="desc">Descendente</option>
          </Select>
        </div>

        <div className="mx-admintable">
          {status === 'loading' ? (
            <Loading label="Cargando empresas instaladoras…" />
          ) : status === 'error' ? (
            <p style={{ fontSize: 12, color: 'var(--red)' }}>
              No se pudieron cargar las empresas instaladoras.
              {error ? ` ${error}` : ''}
            </p>
          ) : empresas.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              {search
                ? 'Ninguna empresa coincide con la búsqueda.'
                : 'No hay empresas instaladoras registradas todavía.'}
            </p>
          ) : (
            empresas.map((empresa) => (
              <div key={empresa.id} className="mx-adminrow">
                <div className="mx-adminrow-main">
                  <div className="mx-adminrow-top">
                    <span className="mx-adminrow-name">{empresa.nombre}</span>
                    <Badge tone={empresa.activa ? 'green' : 'muted'}>
                      {empresa.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <div className="mx-adminrow-meta">
                    <span>
                      <MapPin size={11} />
                      {empresa.ciudad ?? empresa.provincia ?? 'Sin ubicación'}
                    </span>
                    {empresa.contacto ? <span>{empresa.contacto}</span> : null}
                    {empresa.telefono ? (
                      <span>
                        <Phone size={11} />
                        {empresa.telefono}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" className="mx-admin-act" onClick={() => abrirEditar(empresa)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`mx-admin-act${empresa.activa ? ' danger' : ''}`}
                    onClick={() => setConfirmTarget(empresa)}
                  >
                    <Power size={12} />
                    {empresa.activa ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {status === 'ready' && totalPaginas > 1 ? (
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-2">
            <Button
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={14} />
              Anterior
            </Button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Página {page} de {totalPaginas}
            </span>
            <Button
              variant="ghost"
              disabled={page >= totalPaginas}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
              <ChevronRight size={14} />
            </Button>
          </div>
        ) : null}
      </Card>

      <EmpresaInstaladoraFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        empresa={formEmpresa}
        isSaving={isSaving}
        error={formError}
        onSubmit={(values) => void guardar(values)}
      />

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
        title={confirmTarget?.activa ? 'Desactivar empresa instaladora' : 'Activar empresa instaladora'}
        description={
          confirmTarget?.activa
            ? `${confirmTarget?.nombre} dejará de estar disponible para nuevas asignaciones. No se elimina ningún dato.`
            : `${confirmTarget?.nombre} volverá a estar disponible para nuevas asignaciones.`
        }
        confirmLabel={isToggling ? 'Guardando…' : confirmTarget?.activa ? 'Sí, desactivar' : 'Sí, activar'}
        cancelLabel="No, volver"
        onConfirm={() => void confirmarToggle()}
      />

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
