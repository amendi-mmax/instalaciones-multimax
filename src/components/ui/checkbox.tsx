import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Checkbox — componente nuevo de esta fase. El prototipo no incluye ningún
 * checkbox (todas sus selecciones binarias son botones toggle: `.mx-urg`,
 * `.mx-bidbtn.on`, `.mx-disp-chips button.on`). Se construye sobre
 * `@radix-ui/react-checkbox` reutilizando la paleta de tokens del proyecto
 * (`--ink`/`--line`/`--ice`) para mantener coherencia visual con el resto
 * del sistema. Documentado como adición nueva en MIGRATION_STATUS.md.
 */
export const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'h-5 w-5 shrink-0 rounded-[6px] border border-line bg-ink',
      'data-[state=checked]:border-ice data-[state=checked]:bg-[rgba(52,225,232,0.15)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-ice">
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
