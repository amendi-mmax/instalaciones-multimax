import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * EmptyState — portado verbatim de `.mx-empty`/`.mx-empty-ic` (variante
 * compacta, dentro de una Card) y `.mx-qempty`/`.mx-qempty-ic` (variante
 * grande de página completa, JSX de referencia: Coordinator() con
 * `jobs.length === 0`, líneas ~2071-2113). Se unifican en un solo
 * componente con prop `size`, evitando duplicar dos EmptyState casi
 * idénticos.
 */
export interface EmptyStateProps {
  icon: ReactNode;
  title?: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  size?: 'compact' | 'page';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'compact',
}: EmptyStateProps) {
  if (size === 'page') {
    return (
      <div className="mx-qempty">
        <div className="mx-qempty-ic">{icon}</div>
        {title ? <h3>{title}</h3> : null}
        <p>{description}</p>
        {action}
      </div>
    );
  }

  return (
    <div className="mx-empty">
      <div className="mx-empty-ic">{icon}</div>
      {title ? <b>{title}</b> : null}
      <div className={cn(title && 'mt-1')}>{description}</div>
      {action}
    </div>
  );
}
