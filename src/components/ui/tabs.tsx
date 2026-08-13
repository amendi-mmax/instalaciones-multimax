import * as TabsPrimitive from '@radix-ui/react-tabs';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Tabs — construido sobre `@radix-ui/react-tabs` (accesibilidad de teclado y
 * ARIA correctos) manteniendo el markup visual del prototipo. Dos variantes,
 * ambas portadas verbatim:
 *  - `subtabs`: `.mx-subtabs-wrap`/`.mx-subtabs`/`.mx-subtabs button(.on)`
 *    — usado en el prototipo para "Despacho en vivo" / "Mis trabajos".
 *  - `phonetabs`: `.mx-phonetabs`/`.mx-phonetabs button(.on)`
 *    — usado en el prototipo para las tabs inferiores del PhoneFrame.
 * TabsPrimitive.Trigger ya renderiza un <button>, así que las reglas CSS
 * `.mx-subtabs button`/`.mx-phonetabs button` (selector descendiente) se
 * satisfacen naturalmente por la estructura DOM sin necesitar clases extra.
 */
export const Tabs = TabsPrimitive.Root;

export interface TabsListProps extends ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  variant?: 'subtabs' | 'phonetabs';
}

export const TabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, TabsListProps>(
  ({ className, variant = 'subtabs', ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(variant === 'subtabs' ? 'mx-subtabs' : 'mx-phonetabs', className)}
      {...props}
    />
  ),
);
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} className={className} {...props} />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = TabsPrimitive.Content;
