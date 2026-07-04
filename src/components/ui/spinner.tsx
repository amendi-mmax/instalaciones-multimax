import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Spinner / Loading — reutiliza la animación `.animate-mx-spin` (keyframe
 * `mxspin`, portado verbatim de `.mx-spin`/`@keyframes mxspin` del
 * prototipo — ver globals.css) aplicada a un ícono `Loader2` de Lucide. El
 * prototipo no tiene un spinner visible en la captura estática analizada,
 * pero sí define la animación de giro reutilizable, que es lo que se porta
 * aquí; el ícono es una adición razonable sobre esa animación existente.
 */
export interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function Spinner({ size = 18, className, label = 'Cargando…' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center">
      <Loader2 size={size} className={cn('animate-mx-spin text-ice', className)} />
    </span>
  );
}

/** Loading — bloque centrado con Spinner + texto, para estados de carga de página/sección. */
export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted">
      <Spinner size={22} />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
