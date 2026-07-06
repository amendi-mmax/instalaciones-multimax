import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Separator — componente nuevo de esta fase. El prototipo resuelve todas
 * sus divisiones con `border-bottom`/`border-top` puntuales sobre el propio
 * contenedor (`.mx-top`, `.mx-phone-bar`, `.mx-modal-hd`, etc.), sin una
 * clase de línea divisoria reutilizable. Se agrega como pieza compartida
 * genérica usando el mismo color de borde (`--line`) del resto del sistema.
 * Se decidió NO usar `@radix-ui/react-separator` para mantener el paquete
 * de dependencias mínimo, dado que no requiere comportamiento accesible
 * adicional (ver ARCHITECTURE.md).
 */
export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ className, orientation = 'horizontal', ...props }: SeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'shrink-0 bg-line',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  );
}
