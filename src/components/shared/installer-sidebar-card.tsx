import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * InstallerSidebarCard — envoltorio `.mx-card.mx-mini` + `.mx-section-h`
 * compartido por las dos tarjetas de `.mx-instside` ("Tu perfil" y
 * "Reglas de prioridad", JSX de referencia: `Installer()` en
 * `Multimax_Despacho_v1.3.html`, líneas 3424-3450 — Sprint 3.2).
 *
 * No es un componente genérico de diseño: `.mx-mini` no aparece en
 * ningún otro lugar del HTML fuente fuera de este bloque (verificado
 * con `grep -n "mx-mini"`). Se factoriza una sola vez porque ambas
 * tarjetas de ESTE bloque comparten exactamente esta misma envoltura
 * — no para anticipar reuso futuro fuera de `mx-instside`.
 */
export interface InstallerSidebarCardProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  /**
   * Contenido del encabezado de la tarjeta. Se llama `cardTitle` y no
   * `title` para no redefinir con un tipo incompatible el atributo HTML
   * nativo `title` (`string`, tooltip) que `HTMLAttributes<HTMLDivElement>`
   * ya declara — mismo criterio aplicado en Sprint 3.1.1 a `CardHeader`.
   */
  cardTitle: ReactNode;
}

export function InstallerSidebarCard({
  className,
  icon,
  cardTitle,
  children,
  ...props
}: InstallerSidebarCardProps) {
  return (
    <div className={cn('mx-card mx-mini', className)} {...props}>
      <div className="mx-section-h">
        <span>
          {icon}
          {cardTitle}
        </span>
      </div>
      {children}
    </div>
  );
}
