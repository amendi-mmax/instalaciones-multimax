import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Helper estándar de shadcn/ui para combinar clases de Tailwind sin colisiones.
 * Usado por los componentes de src/components/ui (se agregan en Fase 3).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
