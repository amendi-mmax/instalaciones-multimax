import * as LabelPrimitive from '@radix-ui/react-label';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Label — portado de `.mx-fields label` (tipografía/color; el `display:flex
 * flex-direction:column gap:6px` de layout se conserva vía `.mx-fields` como
 * wrapper del campo completo, no en el label suelto). Implementado sobre
 * `@radix-ui/react-label` por accesibilidad (asociación correcta con
 * inputs custom como Checkbox/Switch, que no son un `<input>` nativo).
 */
export const Label = forwardRef<
  ElementRef<typeof LabelPrimitive.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-xs font-semibold text-muted', className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;
