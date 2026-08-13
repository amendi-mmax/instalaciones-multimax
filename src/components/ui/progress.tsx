import { cn } from '@/lib/utils';

/**
 * Progress — componente nuevo de esta fase (sin equivalente en el
 * prototipo). Barra de progreso simple sobre los tokens del proyecto,
 * pensada para procesos como envío de fotos/evidencias en fases futuras de
 * Installer. Se decidió NO usar `@radix-ui/react-progress` para mantener el
 * paquete de dependencias mínimo (no requiere comportamiento accesible
 * adicional más allá de `role="progressbar"`, que se declara a mano).
 */
export interface ProgressProps {
  value: number;
  className?: string;
}

export function Progress({ value, className }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-ink', className)}
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(135deg,var(--ice),#22b9c0)] transition-[width]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
