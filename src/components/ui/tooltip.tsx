import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Tooltip — componente nuevo de esta fase. El prototipo no usa tooltips en
 * ninguna pantalla; se agrega como pieza compartida genérica (pedida
 * explícitamente en el listado de componentes) construida sobre
 * `@radix-ui/react-tooltip`, con la misma paleta oscura del resto del
 * sistema. Documentado en MIGRATION_STATUS.md.
 */
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
  ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 rounded-lg border border-line bg-surf2 px-3 py-1.5',
      'text-xs font-medium text-text shadow-[0_6px_20px_rgba(0,0,0,0.35)]',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
