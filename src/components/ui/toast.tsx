import { X } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Toast — ESTRUCTURA SOLAMENTE, según lo solicitado explícitamente para
 * esta fase ("Toast: estructura solamente"). Este archivo define únicamente
 * la forma visual de un toast individual y su contenedor de posicionamiento
 * (`ToastViewport`); NO incluye cola de mensajes, hook `useToast`,
 * temporizador de auto-cierre ni Context Provider — esa lógica de estado es
 * business logic y queda fuera del alcance de "Layout general y
 * componentes compartidos". Sin equivalente directo en el prototipo (no
 * usa toasts); estilizado con los tokens del proyecto. Pendiente de
 * conectar en una fase posterior — ver TODO.md / MIGRATION_STATUS.md.
 */
export type ToastTone = 'success' | 'error' | 'info';

const TONE_BORDER: Record<ToastTone, string> = {
  success: 'border-green',
  error: 'border-red',
  info: 'border-ice',
};

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  tone?: ToastTone;
  /**
   * Título del toast (texto/nodo). Se llama `toastTitle` y no `title` para
   * no redefinir con un tipo incompatible el atributo HTML nativo `title`
   * (`string`, tooltip) que `HTMLAttributes<HTMLDivElement>` ya declara —
   * error real detectado en validación local (Sprint 3.1.1).
   */
  toastTitle: ReactNode;
  description?: ReactNode;
  onClose?: () => void;
}

export function Toast({
  className,
  tone = 'info',
  toastTitle,
  description,
  onClose,
  ...props
}: ToastProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border bg-surf p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)]',
        'animate-mx-pop',
        TONE_BORDER[tone],
        className,
      )}
      role="status"
      {...props}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text">{toastTitle}</p>
        {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      </div>
      {onClose ? (
        <button
          onClick={onClose}
          aria-label="Cerrar notificación"
          className="shrink-0 text-muted hover:text-text"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

/** Contenedor de posicionamiento fijo para apilar Toasts — sin lógica de cola. */
export function ToastViewport({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[400] flex w-full max-w-sm flex-col gap-2',
        className,
      )}
      {...props}
    />
  );
}
