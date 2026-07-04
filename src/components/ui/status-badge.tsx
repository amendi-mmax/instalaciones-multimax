import type { ReactNode } from 'react';

import { Badge, type BadgeTone } from '@/components/ui/badge';

/**
 * StatusBadge — envoltorio semántico sobre Badge. El prototipo no tiene una
 * clase `mx-status-*` propia: los estados de trabajo/bid se pintan con
 * combinaciones puntuales de `.mx-round.act`/`.mx-round.done`,
 * `.mx-resp.assigned`, etc., que son específicas de Coordinator/Installer y
 * quedan fuera de esta fase. StatusBadge define únicamente el mapeo
 * genérico status→tono (reutilizando la paleta ya portada) para que las
 * fases de negocio lo usen sin repetir esa lógica de color.
 */
export type StatusBadgeStatus = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const STATUS_TONE: Record<StatusBadgeStatus, BadgeTone> = {
  success: 'green',
  warning: 'amber',
  danger: 'red',
  info: 'ice',
  neutral: 'muted',
};

export interface StatusBadgeProps {
  status: StatusBadgeStatus;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <Badge tone={STATUS_TONE[status]} className={className}>
      {children}
    </Badge>
  );
}
