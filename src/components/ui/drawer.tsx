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
 *
 * **`variant` (Sprint 8.2, "Master Calendar (Fase 1)")** -- el Calendario
 * Maestro necesita explícitamente un "Drawer LATERAL" (brief: "NO abrir
 * Modal... Debe abrir un Drawer lateral"), distinto del bottom-sheet de
 * arriba (que, pese al nombre `Drawer`, entra desde ABAJO, no desde el
 * costado). Ningún componente de este design system era, hasta este
 * Sprint, un panel lateral real -- se agrega `variant?: 'sheet' |
 * 'lateral'` (default `'sheet'`, sin ningún cambio de comportamiento para
 * `PublishModal`, el único consumidor existente) en vez de crear un
 * componente `Drawer` paralelo -- misma lógica de accesibilidad de Radix
 * (foco/Escape/aria-*), mismo `DrawerHeader`/`DrawerBody`, la única
 * diferencia real es la clase CSS del overlay/panel. Ver
 * `globals.css` (`.mx-drawer-lateral-bg`/`.mx-drawer-lateral-panel`,
 * mismos tokens de color/timing de animación que `.mx-modal-*`, solo con
 * la dirección de entrada y el anclaje cambiados).
 */
export { Dialog as Drawer, DialogTrigger as DrawerTrigger };

export type DrawerVariant = 'sheet' | 'lateral';

export interface DrawerOverlayProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {
  variant?: DrawerVariant;
}

export const DrawerOverlay = forwardRef<ElementRef<typeof DialogPrimitive.Overlay>, DrawerOverlayProps>(
  ({ className, variant = 'sheet', ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(variant === 'lateral' ? 'mx-drawer-lateral-bg' : 'mx-modal-bg', className)}
      {...props}
    />
  ),
);
DrawerOverlay.displayName = DialogPrimitive.Overlay.displayName;

export interface DrawerContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  variant?: DrawerVariant;
}

export const DrawerContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, DrawerContentProps>(
  ({ className, variant = 'sheet', ...props }, ref) => (
    <DialogPrimitive.Content
      ref={ref}
      className={cn(variant === 'lateral' ? 'mx-drawer-lateral-panel' : 'mx-modal-panel', className)}
      {...props}
    />
  ),
);
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
