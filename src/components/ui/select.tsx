import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Select — portado de `.mx-fields select` (ver nota de `.mx-select-native`
 * en globals.css). Se implementa sobre el `<select>` nativo del navegador,
 * exactamente como en el prototipo — se decidió deliberadamente NO agregar
 * `@radix-ui/react-select` (ver ARCHITECTURE.md) porque el HTML de
 * referencia usa `<select>` nativo en todos los formularios (provincia,
 * zona, tipo de inmueble, hora, etc.) y un primitivo custom cambiaría el
 * comportamiento/apariencia nativa que el prototipo exhibe.
 */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn('mx-select-native', className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
