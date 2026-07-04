import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * TwoColumnLayout — abstrae las dos grillas de dos columnas responsivas del
 * prototipo, que comparten el mismo patrón (colapsan a una columna en
 * `max-width:920px`) pero con proporciones distintas:
 *  - variant="despacho": `.mx-grid` (`minmax(340px,1fr) minmax(360px,1.05fr)`),
 *    usado en la vista de despacho del Coordinator.
 *  - variant="phone": `.mx-instwrap` (`minmax(320px,400px) minmax(240px,300px)`),
 *    usado en PhoneFrame + panel lateral del Instalador.
 * Ambas clases ya están portadas verbatim en globals.css (incluido su
 * `@media (max-width:920px)`); este componente solo decide cuál aplicar.
 * Se optó por dos clases fijas en vez de columnas dinámicas por inline-style
 * porque en todo el prototipo únicamente existen estas dos proporciones, y
 * los overrides responsivos del prototipo son reglas CSS reales que un
 * `grid-template-columns` inline no podría sobreescribir sin `!important`.
 */
export interface TwoColumnLayoutProps {
  variant: 'despacho' | 'phone';
  left: ReactNode;
  right: ReactNode;
  className?: string;
}

export function TwoColumnLayout({ variant, left, right, className }: TwoColumnLayoutProps) {
  return (
    <div className={cn(variant === 'despacho' ? 'mx-grid' : 'mx-instwrap', className)}>
      {left}
      {right}
    </div>
  );
}
