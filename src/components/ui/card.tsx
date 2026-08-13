import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Card / SectionHeader — portados verbatim de `.mx-card` y `.mx-section-h`
 * (globals.css). CardBody y CardFooter no existen como clases separadas en
 * el prototipo (el contenido va directo dentro de `.mx-card`); se agregan
 * aquí como subcomponentes de composición para cumplir la lista de
 * "Componentes compartidos" solicitada, sin introducir estilos nuevos: son
 * simples `div`s con espaciado en flujo normal, no alteran la apariencia.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-card', className)} {...props} />;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  /**
   * Contenido del encabezado (texto/nodo). Se llama `cardTitle` y no
   * `title` para no redefinir con un tipo incompatible el atributo HTML
   * nativo `title` (`string`, tooltip) que `HTMLAttributes<HTMLDivElement>`
   * ya declara — error real detectado en validación local (Sprint 3.1.1).
   */
  cardTitle: ReactNode;
  action?: ReactNode;
}

/** Portado de `.mx-section-h` / `.mx-section-h > span` / `.mx-section-h svg`. */
export function CardHeader({ className, icon, cardTitle, action, ...props }: CardHeaderProps) {
  return (
    <div className={cn('mx-section-h', className)} {...props}>
      <span>
        {icon}
        {cardTitle}
      </span>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-3 flex items-center gap-2', className)} {...props} />;
}
