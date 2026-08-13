import { XCircle } from 'lucide-react';

import { ConfirmDialog } from '@/components/shared/confirm-dialog';

/**
 * ConfirmCancelDialog — reconstruye verbatim `function ConfirmCancel({ onYes,
 * onNo })` de `Multimax_Despacho_v1.3.html` (líneas 3531-3553), el bloque
 * real correspondiente al Sprint 3.15 ("Shared Dialogs" en
 * `docs/SPRINTS_INDEX.md` — nombre genérico corregido a `ConfirmCancel`, ver
 * "Diferencias encontradas" en docs/sprints/sprint-3.15.md).
 *
 * Reutiliza `ConfirmDialog` (`components/shared/confirm-dialog.tsx`, creado
 * en el scaffold de Baseline/Fases 1-3, ya wireado a las clases
 * `.mx-confirm-*`) en vez de duplicar la lógica de Overlay/Content/
 * accesibilidad — este componente solo aporta el contenido literal exacto de
 * `ConfirmCancel`: título, descripción y etiquetas de los 2 botones,
 * incluido el ícono `XCircle` del botón "Sí, cancelar" (línea 3547-3552).
 *
 * Adaptación de props (mismo criterio ya aprobado para `PublishModal`,
 * Sprint 3.5): el HTML fuente controla la visibilidad por
 * montaje/desmontaje condicional (`confirmCancel && React.createElement(
 * ConfirmCancel, {...})`, línea 2125 de `App()`) y no tiene prop `open` —
 * aquí se usa el patrón controlado `open`/`onOpenChange` ya establecido para
 * todos los diálogos/modales del proyecto (`ui/dialog.tsx`, sobre Radix).
 * `onNo` del HTML (`() => setConfirmCancel(null)`) se pliega en
 * `onOpenChange(false)` — mismo cierre, sin acción — en vez de mantenerse
 * como callback aparte; `onYes` se conserva con su nombre literal del HTML,
 * ya que representa una acción real (confirmar cancelación), no un simple
 * cierre.
 */
export interface ConfirmCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onYes: () => void;
}

export function ConfirmCancelDialog({ open, onOpenChange, onYes }: ConfirmCancelDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="¿Cancelar este trabajo?"
      description="El trabajo quedará marcado como cancelado y dejará de recibir propuestas. Esta acción no se puede deshacer."
      cancelLabel="No, volver"
      confirmLabel={
        <>
          <XCircle size={14} />
          Sí, cancelar
        </>
      }
      onConfirm={onYes}
    />
  );
}
