import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalContent, ModalHeader, ModalOverlay } from '@/components/ui/modal';
import { DialogPortal } from '@/components/ui/dialog';
import {
  EMPRESA_INSTALADORA_FORM_INICIAL,
  type EmpresaInstaladoraFormValues,
  type EmpresaInstaladoraRow,
} from '@/types/empresa-instaladora';

/**
 * EmpresaInstaladoraFormDialog — Sprint 8.3. Formulario de Crear/Editar
 * empresa instaladora, dentro del `Modal` genérico ya existente
 * (`ui/modal.tsx`, Fase 3 -- panel centrado, sin consumidor real hasta este
 * Sprint). Reutiliza `Input`/`Button` (ya existentes) y el mismo patrón de
 * campos `.mx-fields`/`<label>`/`FieldError` inline ya usado por
 * `PublishModal` -- ningún componente/CSS nuevo.
 *
 * Un único componente para Crear y Editar (no dos formularios separados):
 * `empresa` (prop) es `null` en modo creación, o la fila real en modo
 * edición -- mismo criterio de "un solo punto de entrada por
 * responsabilidad" ya aplicado en el resto del proyecto (p. ej.
 * `AdminKpiCard`).
 */
export interface EmpresaInstaladoraFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: EmpresaInstaladoraRow | null;
  isSaving: boolean;
  error: string | null;
  onSubmit: (values: EmpresaInstaladoraFormValues) => void;
}

function valuesFromRow(row: EmpresaInstaladoraRow | null): EmpresaInstaladoraFormValues {
  if (!row) return EMPRESA_INSTALADORA_FORM_INICIAL;
  return {
    nombre: row.nombre,
    razonSocial: row.razon_social ?? '',
    contacto: row.contacto ?? '',
    email: row.email ?? '',
    telefono: row.telefono ?? '',
    direccion: row.direccion ?? '',
    ciudad: row.ciudad ?? '',
    provincia: row.provincia ?? '',
    pais: row.pais,
    logoUrl: row.logo_url ?? '',
  };
}

export function EmpresaInstaladoraFormDialog({
  open,
  onOpenChange,
  empresa,
  isSaving,
  error,
  onSubmit,
}: EmpresaInstaladoraFormDialogProps) {
  const [form, setForm] = useState<EmpresaInstaladoraFormValues>(() => valuesFromRow(empresa));
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Resincroniza el formulario cada vez que el diálogo se abre -- evita que
  // quede el valor de una edición anterior si se abre para crear, o
  // viceversa (mismo problema, y misma solución, ya resuelto para
  // `PublishModal`/`sucursal` en el Sprint 5.2.3.2).
  useEffect(() => {
    if (open) {
      setForm(valuesFromRow(empresa));
      setSubmitAttempted(false);
    }
  }, [open, empresa]);

  const set = <K extends keyof EmpresaInstaladoraFormValues>(
    key: K,
    value: EmpresaInstaladoraFormValues[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const nombreVacio = !form.nombre.trim();

  const submit = () => {
    if (isSaving) return;
    if (nombreVacio) {
      setSubmitAttempted(true);
      return;
    }
    onSubmit(form);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <ModalOverlay>
          <ModalContent>
            <ModalHeader title={empresa ? 'Editar empresa instaladora' : 'Nueva empresa instaladora'} />
            <div className="mx-fields">
              <label>
                Nombre
                <Input
                  value={form.nombre}
                  placeholder="Ej. Instalaciones PTY"
                  disabled={isSaving}
                  onChange={(e) => set('nombre', e.target.value)}
                />
                {submitAttempted && nombreVacio ? (
                  <span style={{ color: 'var(--red)', fontSize: 12, marginTop: 4, display: 'block' }}>
                    Indicá el nombre de la empresa.
                  </span>
                ) : null}
              </label>
              <label>
                Razón social
                <Input
                  value={form.razonSocial}
                  placeholder="Ej. Instalaciones PTY, S.A."
                  disabled={isSaving}
                  onChange={(e) => set('razonSocial', e.target.value)}
                />
              </label>
              <label>
                Contacto
                <Input
                  value={form.contacto}
                  placeholder="Ej. Juan Pérez"
                  disabled={isSaving}
                  onChange={(e) => set('contacto', e.target.value)}
                />
              </label>
              <label>
                Correo
                <Input
                  type="email"
                  value={form.email}
                  placeholder="contacto@empresa.com"
                  disabled={isSaving}
                  onChange={(e) => set('email', e.target.value)}
                />
              </label>
              <label>
                Teléfono
                <Input
                  value={form.telefono}
                  placeholder="+507 6000-0000"
                  disabled={isSaving}
                  onChange={(e) => set('telefono', e.target.value)}
                />
              </label>
              <label>
                Dirección
                <Input
                  value={form.direccion}
                  placeholder="Ej. Calle 50, Local 12"
                  disabled={isSaving}
                  onChange={(e) => set('direccion', e.target.value)}
                />
              </label>
              <label>
                Ciudad
                <Input
                  value={form.ciudad}
                  placeholder="Ej. Panamá"
                  disabled={isSaving}
                  onChange={(e) => set('ciudad', e.target.value)}
                />
              </label>
              <label>
                Provincia
                <Input
                  value={form.provincia}
                  placeholder="Ej. Panamá"
                  disabled={isSaving}
                  onChange={(e) => set('provincia', e.target.value)}
                />
              </label>
              <label>
                País
                <Input
                  value={form.pais}
                  disabled={isSaving}
                  onChange={(e) => set('pais', e.target.value)}
                />
              </label>
              <label>
                Logo (URL, opcional)
                <Input
                  value={form.logoUrl}
                  placeholder="https://…"
                  disabled={isSaving}
                  onChange={(e) => set('logoUrl', e.target.value)}
                />
              </label>
              {error ? <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p> : null}
              <Button variant="ice" style={{ width: '100%' }} disabled={isSaving} onClick={submit}>
                {isSaving ? <Loader2 size={16} className="animate-mx-spin" /> : <Save size={16} />}
                {isSaving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </ModalContent>
        </ModalOverlay>
      </DialogPortal>
    </Modal>
  );
}
