import type { ReactNode } from 'react';

import { Counter } from '@/components/ui/counter';

/**
 * StatTile / StatGrid — portados verbatim de `.mx-stats`/`.mx-stat` (grilla
 * de 3 columnas de métricas, usada en el panel "Tu perfil" del Instalador y
 * en el resumen del Coordinator). Compone Counter (ui/counter.tsx) dentro
 * de la celda `.mx-stat`.
 */
export interface StatTileProps {
  value: string | number;
  label: string;
  sublabel?: string;
}

export function StatTile({ value, label, sublabel }: StatTileProps) {
  return (
    <div className="mx-stat">
      <Counter value={value} label={label} sublabel={sublabel} />
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="mx-stats">{children}</div>;
}
