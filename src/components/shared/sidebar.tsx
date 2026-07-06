import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Sidebar / SidebarCard — portados verbatim de `.mx-instside`/`.mx-mini`
 * (JSX de referencia: aside del Instalador, `Multimax_Despacho_v1.3.html`
 * líneas ~3169-3453 — dos tarjetas `.mx-card.mx-mini`: "Tu perfil" y
 * "Reglas de prioridad"). Se generaliza como panel lateral reutilizable:
 * Sidebar es el contenedor (`.mx-instside`), SidebarCard es cada tarjeta
 * compacta dentro de él (`.mx-card.mx-mini`, compone Card + CardHeader de
 * ui/card.tsx). El contenido interno de cada tarjeta (perfil/reglas reales
 * del instalador) es datos de negocio y se conecta en la fase de Installer
 * — aquí solo se reconstruye el contenedor estructural.
 */
export function Sidebar({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <aside className={cn('mx-instside', className)} {...props} />;
}

export interface SidebarCardProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  /**
   * Contenido del encabezado de la tarjeta (texto/nodo). Se llama
   * `sidebarTitle` y no `title` para no redefinir con un tipo incompatible
   * el atributo HTML nativo `title` (`string`, tooltip) que
   * `HTMLAttributes<HTMLDivElement>` ya declara — error real detectado en
   * validación local (Sprint 3.1.1).
   */
  sidebarTitle: ReactNode;
}

export function SidebarCard({
  className,
  icon,
  sidebarTitle,
  children,
  ...props
}: SidebarCardProps) {
  return (
    <div className={cn('mx-card mx-mini', className)} {...props}>
      <div className="mx-section-h">
        <span>
          {icon}
          {sidebarTitle}
        </span>
      </div>
      {children}
    </div>
  );
}
