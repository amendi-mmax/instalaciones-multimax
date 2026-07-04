import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * IconButton — componente nuevo de esta fase (sin clase `mx-*` 1:1 en el
 * prototipo). Generaliza el patrón visual de `.mx-back` y `.mx-modal-close`
 * (botón cuadrado/circular, ícono centrado, hover con color de acento) para
 * uso genérico en toda la app. Documentado en MIGRATION_STATUS.md.
 */
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border border-line',
        'text-muted transition-colors hover:border-ice hover:text-text',
        size === 'md' ? 'h-8 w-8' : 'h-7 w-7',
        className,
      )}
      {...props}
    />
  ),
);
IconButton.displayName = 'IconButton';
