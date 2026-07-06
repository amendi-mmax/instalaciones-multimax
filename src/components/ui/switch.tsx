import * as SwitchPrimitive from '@radix-ui/react-switch';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Switch — componente nuevo de esta fase. El prototipo resuelve sus toggles
 * binarios con botones de estado (`.mx-urg`/`.mx-urg.on`), no con un switch
 * estilo iOS; ese patrón de botón se mantiene disponible vía Chip
 * (`ui/chip.tsx`) para reconstruir `.mx-urg` sin cambios visuales en la fase
 * de negocio correspondiente. Este Switch es una pieza genérica adicional
 * construida sobre `@radix-ui/react-switch`, útil para configuraciones
 * futuras (ej. Admin) que no tienen equivalente directo en el HTML.
 */
export const Switch = forwardRef<
  ElementRef<typeof SwitchPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-6 w-11 shrink-0 rounded-full border border-line bg-ink transition-colors',
      'data-[state=checked]:border-ice data-[state=checked]:bg-[rgba(52,225,232,0.25)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'block h-4 w-4 translate-x-1 rounded-full bg-muted transition-transform',
        'data-[state=checked]:translate-x-6 data-[state=checked]:bg-ice',
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;
