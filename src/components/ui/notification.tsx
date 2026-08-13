import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Notification — componente nuevo de esta fase. Generaliza el patrón visual
 * de banners informativos en línea que el prototipo repite puntualmente
 * (`.mx-invite-ok` en verde, `.mx-invite-note`/`.mx-alert-req` en ámbar —
 * ambos específicos de Admin/Coordinator y fuera de alcance), como una
 * pieza reutilizable con `tone` para uso genérico (confirmaciones, avisos)
 * en cualquier pantalla. Documentado en MIGRATION_STATUS.md.
 */
export type NotificationTone = 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASS: Record<NotificationTone, string> = {
  success: 'border-[rgba(59,224,138,0.25)] bg-[rgba(59,224,138,0.08)] text-green',
  warning: 'border-[rgba(255,178,62,0.2)] bg-[rgba(255,178,62,0.06)] text-amber',
  danger: 'border-[rgba(255,92,122,0.25)] bg-[rgba(255,92,122,0.08)] text-red',
  info: 'border-[rgba(52,225,232,0.2)] bg-[rgba(52,225,232,0.06)] text-ice',
};

export interface NotificationProps extends HTMLAttributes<HTMLDivElement> {
  tone?: NotificationTone;
  icon?: ReactNode;
}

export function Notification({
  className,
  tone = 'info',
  icon,
  children,
  ...props
}: NotificationProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-[10px] border p-2.5 text-xs leading-relaxed',
        TONE_CLASS[tone],
        className,
      )}
      {...props}
    >
      {icon}
      <span className="text-muted">{children}</span>
    </div>
  );
}
