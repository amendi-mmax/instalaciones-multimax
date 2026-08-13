import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** Input — portado de `.mx-fields input` (ver nota de `.mx-input` en globals.css). */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn('mx-input', className)} {...props} />
  ),
);
Input.displayName = 'Input';
