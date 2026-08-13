import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Menu — lista de opciones estática (no flotante), distinta de DropdownMenu
 * (que es un menú tipo popover posicionado sobre un trigger). Componente
 * nuevo de esta fase, sin equivalente directo en el prototipo; pensado para
 * listas de navegación o de acciones que se muestran siempre visibles
 * (ej. dentro de un Sidebar o un Drawer), reutilizando la paleta del
 * proyecto. Documentado en MIGRATION_STATUS.md.
 */
export function Menu({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1', className)} {...props} />;
}

export interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  ({ className, active = false, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition-colors',
        'hover:bg-surf2 hover:text-text',
        active && 'bg-surf2 text-ice',
        className,
      )}
      {...props}
    />
  ),
);
MenuItem.displayName = 'MenuItem';
