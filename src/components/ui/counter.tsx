import { cn } from '@/lib/utils';

/**
 * Counter — portado de `.mx-stat-v`/`.mx-stat-l`/`.mx-stat-s` (los
 * "dígitos" grandes en fuente monoespaciada `--fm` usados dentro de
 * `.mx-stat`, ver globals.css). Se extrae como pieza independiente porque
 * el mismo tratamiento tipográfico (valor grande + etiqueta pequeña) se
 * reutiliza fuera de la grilla de StatTile (ej. precios, contadores
 * sueltos). StatTile (shared/stat-tile.tsx) compone Counter dentro de la
 * grilla `.mx-stats`.
 */
export interface CounterProps {
  value: string | number;
  label?: string;
  sublabel?: string;
  className?: string;
}

export function Counter({ value, label, sublabel, className }: CounterProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className="mx-stat-v">{value}</span>
      {label ? <span className="mx-stat-l">{label}</span> : null}
      {sublabel ? <span className="mx-stat-s">{sublabel}</span> : null}
    </div>
  );
}
