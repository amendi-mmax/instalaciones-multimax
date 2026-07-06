import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Skeleton — componente nuevo de esta fase (sin equivalente en el
 * prototipo, que no maneja estados de carga). Usa `animate-pulse` de
 * Tailwind sobre el color de superficie del proyecto (`--surf2`) para
 * previsualizar contenido mientras se cargan datos reales de Supabase en
 * fases posteriores. Documentado en MIGRATION_STATUS.md.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-lg bg-surf2', className)} {...props} />;
}
