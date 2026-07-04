import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Textarea — el prototipo no tiene un `<textarea>` en ningún formulario (los
 * campos multilínea, como "¿Algo más que quieras agregar?", usan `<input>`
 * de texto simple). Se agrega como componente nuevo reutilizando la misma
 * clase visual `.mx-textarea` (idéntica a `.mx-input`) para notas/comentarios
 * largos que sí requerirán varias líneas en fases posteriores.
 */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 3, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn('mx-textarea resize-y', className)} {...props} />
));
Textarea.displayName = 'Textarea';
