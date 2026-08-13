import { Slot } from '@radix-ui/react-slot';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Button — variantes `ice` / `amber` / `ghost` portadas verbatim de
 * `.mx-btn`/`.mx-btn-ice`/`.mx-btn-amber`/`.mx-btn-ghost` (ver globals.css).
 * La variante `plain` es una adición nueva de esta fase (sin equivalente en
 * el prototipo) para botones de texto sin el tratamiento visual `mx-btn`,
 * documentada en MIGRATION_STATUS.md.
 *
 * Nota: `.mx-btn` incluye `flex: 1` en el CSS original (los botones se
 * distribuyen equitativamente dentro de una fila de acciones). Se preserva
 * tal cual — no se "corrige" por instrucción explícita del proyecto.
 */
export type ButtonVariant = 'ice' | 'amber' | 'ghost' | 'plain';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  ice: 'mx-btn mx-btn-ice',
  amber: 'mx-btn mx-btn-amber',
  ghost: 'mx-btn mx-btn-ghost',
  plain: 'inline-flex items-center justify-center gap-2 text-sm font-semibold text-text',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'ice', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(VARIANT_CLASS[variant], className)} {...props} />;
  },
);
Button.displayName = 'Button';
