import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef, ReactNode } from 'react';

import { Dialog, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Drawer — portado verbatim de `.mx-modal-bg`/`.mx-modal-panel`/
 * `.mx-modal-hd`/`.mx-modal-close`/`.mx-modal-body` (el "modal" slide-up del
 * prototipo, usado para "Publicar otro trabajo"). Se renombra a Drawer en
 * esta librería de componentes porque su comportamiento real es el de un
 * bottom-sheet (entra desde el borde inferior con la animación `mxup`), y
 * el nombre "Modal" se reserva para un patrón centrado nuevo y genérico
 * (ver ui/modal.tsx) — ambos nombres estaban pedidos en el listado de
 * componentes compartidos de esta fase. Ver MIGRATION_STATUS.md.
 */
export { Dialog as Drawer, DialogTrigger as DrawerTrigger };

export const DrawerOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} className={cn('mx-modal-bg', className)} {...props} />
));
DrawerOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DrawerContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Content ref={ref} className={cn('mx-modal-panel', className)} {...props} />
));
DrawerContent.displayName = DialogPrimitive.Content.displayName;

export interface DrawerHeaderProps {
  icon?: ReactNode;
  title: ReactNode;
}

/** Portado de `.mx-modal-hd` + `.mx-modal-close`. */
export function DrawerHeader({ icon, title }: DrawerHeaderProps) {
  return (
    <div className="mx-modal-hd">
      <DialogPrimitive.Title asChild>
        <h3>
          {icon}
          {title}
        </h3>
      </DialogPrimitive.Title>
      <DialogClose asChild>
        <button className="mx-modal-close" aria-label="Cerrar">
          <X size={16} />
        </button>
      </DialogClose>
    </div>
  );
}

export function DrawerBody({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('mx-modal-body', className)} {...props} />;
}
