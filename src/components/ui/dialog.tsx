import * as DialogPrimitive from '@radix-ui/react-dialog';

/**
 * Dialog — capa base sin estilos, re-exporta los primitivos de
 * `@radix-ui/react-dialog` (Root/Trigger/Portal/Close) tal cual. Modal,
 * Drawer y ConfirmDialog se construyen encima de estos mismos primitivos,
 * cada uno con su propio Overlay/Content estilizado según la clase `mx-*`
 * que le corresponde en el prototipo (ver ui/modal.tsx, ui/drawer.tsx y
 * shared/confirm-dialog.tsx). Mantener esta capa separada evita duplicar la
 * lógica de accesibilidad (foco, Escape, aria-*) entre los tres.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;
