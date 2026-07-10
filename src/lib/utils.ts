import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Helper estándar de shadcn/ui para combinar clases de Tailwind sin colisiones.
 * Usado por los componentes de src/components/ui (se agregan en Fase 3).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * hashAngle — hash determinístico de un string (id de instalador) a un
 * ángulo entre 0 y 360 (`Multimax_Despacho_v1.3.html`, línea 882: `const
 * hashAngle = id => {...}`), transcrita verbatim. Usada por `Radar` (Sprint
 * 3.7) para posicionar cada pin de forma estable entre renders (no aleatoria
 * — mismo id siempre produce el mismo ángulo). Función pura, sin efectos
 * secundarios.
 */
export function hashAngle(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 360;
  }
  return h;
}
