import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef, ReactNode } from 'react';

import { Dialog, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Modal — patrón nuevo de esta fase: panel centrado (no slide-up) para
 * contenido arbitrario. El prototipo no tiene un modal centrado genérico
 * (su único overlay centrado, `.mx-confirm-*`, es específico de
 * confirmación de una sola acción — ver shared/confirm-dialog.tsx). Se
 * construye reutilizando los mismos tokens de diseño (`--surf`/`--ink2`/
 * `--line`, radios y sombras ya usados en `.mx-card`/`.mx-confirm-card`)
 * para verse consistente con el resto del sistema. Documentado como
 * adición nueva en MIGRATION_STATUS.md.
 */
export { Dialog as Modal, DialogTrigger as ModalTrigger };

export const ModalOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(8,12,24,0.82)] p-5 backdrop-blur-[4px]',
      className,
    )}
    {...props}
  />
));
ModalOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const ModalContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Content
    ref={ref}
    className={cn(
      'w-full max-w-[460px] animate-mx-pop rounded-[18px] border border-line bg-surf p-[22px]',
      className,
    )}
    {...props}
  />
));
ModalContent.displayName = DialogPrimitive.Content.displayName;

export interface ModalHeaderProps {
  title: ReactNode;
}

export function ModalHeader({ title }: ModalHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <DialogPrimitive.Title asChild>
        <h3 className="font-display text-[17px] font-bold text-text">{title}</h3>
      </DialogPrimitive.Title>
      <DialogClose asChild>
        <button
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-surf2 text-muted hover:text-text"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </DialogClose>
    </div>
  );
}
