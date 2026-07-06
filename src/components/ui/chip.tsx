import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Chip — botón "toggle" reutilizable, portado de tres clases del prototipo
 * que comparten el mismo patrón visual (borde muted, estado activo con
 * acento de color, ver globals.css):
 *  - `bidbtn`: `.mx-bidbtn`/`.mx-bidbtn.on` (opciones de tiempo de bid, grid de 3 columnas del padre).
 *  - `chip`: `.mx-chip`/`.mx-chip.on` (variante standalone de `.mx-chips button`, ancho libre).
 *  - `urg`: `.mx-urg`/`.mx-urg.on` (toggle "Normal"/"Urgente", acento rojo en vez de ice).
 * Se unifican en un solo componente con prop `active`, evitando duplicar
 * lógica de toggle según el contexto visual de uso.
 */
export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: 'bidbtn' | 'chip' | 'urg';
}

const VARIANT_CLASS: Record<NonNullable<ChipProps['variant']>, string> = {
  bidbtn: 'mx-bidbtn',
  chip: 'mx-chip',
  urg: 'mx-urg',
};

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, active = false, variant = 'chip', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(VARIANT_CLASS[variant], active && 'on', className)}
      aria-pressed={active}
      {...props}
    />
  ),
);
Chip.displayName = 'Chip';
