import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

import { Dialog } from '@/components/ui/dialog';

/**
 * ConfirmDialog — portado verbatim de `.mx-confirm-bg`/`.mx-confirm-card`/
 * `.mx-confirm-acts`/`.mx-confirm-no`/`.mx-confirm-yes` (JSX de referencia:
 * `ConfirmCancel` en Multimax_Despacho_v1.3.html, usado en el flujo
 * `requestCancel`/`doCancel` del Coordinator — la lógica de negocio que lo
 * invoca es de Fase 4, pero el componente visual en sí es un shared
 * component pedido explícitamente en el listado de esta fase). Construido
 * sobre los primitivos de `ui/dialog.tsx` (Radix) para accesibilidad
 * (foco atrapado, cierre con Escape).
 *
 * Corrección de fidelidad (Sprint 3.15 — "Shared Dialogs" / `ConfirmCancel`):
 * este componente se creó en la fase de scaffold (Baseline: Fases 1-3),
 * antes de la metodología de Sprints estrictos, y quedó sin ningún consumidor
 * real. Al retomarlo para construir la reconstrucción verbatim de
 * `ConfirmCancel` (líneas 3531-3553 del script fuente) se detectaron 2
 * discrepancias contra el HTML, corregidas aquí a favor del script
 * (autoritativo), sin cambiar la estructura/props existentes: (1) el icono
 * de `<h3>` usaba `size={17}`, el script fuente usa `size:16`
 * (línea 3540-3541); (2) `confirmLabel`/`cancelLabel` eran `string`, lo que
 * no permitía reproducir el ícono `XCircle` dentro del botón "Sí, cancelar"
 * (línea 3547-3552 del script) — se amplían a `ReactNode` (los valores por
 * defecto, ambos strings, siguen siendo válidos, así que esto no rompe
 * ningún uso existente). Ver `docs/sprints/sprint-3.15.md` → sección
 * "Diferencias encontradas".
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Sí, continuar',
  cancelLabel = 'No, volver',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="mx-confirm-bg">
          <DialogPrimitive.Content className="mx-confirm-card">
            <DialogPrimitive.Title asChild>
              <h3>
                <AlertTriangle size={16} />
                {title}
              </h3>
            </DialogPrimitive.Title>
            <DialogPrimitive.Description asChild>
              <p>{description}</p>
            </DialogPrimitive.Description>
            <div className="mx-confirm-acts">
              <DialogPrimitive.Close asChild>
                <button type="button" className="mx-confirm-no">
                  {cancelLabel}
                </button>
              </DialogPrimitive.Close>
              <button
                type="button"
                className="mx-confirm-yes"
                onClick={() => {
                  onConfirm();
                  onOpenChange(false);
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
