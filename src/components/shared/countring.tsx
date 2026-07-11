import { fmt } from '@/lib/utils';

/**
 * CountRing — reconstruye `function CountRing({ remaining, total, size,
 * color })` de `Multimax_Despacho_v1.3.html` (líneas 1437-1491, Sprint 3.8):
 * un anillo SVG de countdown regresivo, sin ninguna clase CSS (todo el
 * estilo del HTML fuente es inline/atributos de presentación SVG, no hay
 * nada que migrar a `globals.css`), sin sub-componentes, sin estado propio
 * (`useState`/`useEffect`) ni timers — es una función pura derivada de sus
 * props en cada render, igual que en el HTML fuente.
 *
 * Confirmado por el análisis obligatorio (ver docs/sprints/sprint-3.8.md):
 * no depende de `Coordinator`, `JobCard`(`mx-jobcard`), `Radar` ni
 * "Timeline". Sus dos únicos consumidores reales en el HTML fuente (líneas
 * 3276 y 3317) están dentro de `Installer(props)` (rol Instalador, pasos
 * "alerta de nueva solicitud" y "tu propuesta" del teléfono), no dentro de
 * `Coordinator`. El componente hermano `LiveCountdown` (línea 2473 del HTML
 * fuente, con timer propio, usado dentro de `Coordinator`/`mx-jobcard`) es
 * un componente DISTINTO y NO se implementa en este Sprint — ver "Hallazgo
 * adicional" en docs/sprints/sprint-3.8.md.
 *
 * Props idénticas a las del HTML fuente: `remaining`/`total` (segundos,
 * obligatorias), `size` (default 132) y `color` (default "#ffb23e"). El
 * valor de `remaining` en un uso real vendría del motor de trabajos
 * (`jobView`/`stepJobEngine`, no portado todavía) — aquí se recibe tal cual
 * como prop, sin timer propio, igual que en el HTML fuente.
 */
export interface CountRingProps {
  remaining: number;
  total: number;
  size?: number;
  color?: string;
}

export function CountRing({ remaining, total, size = 132, color = '#ffb23e' }: CountRingProps) {
  const r = size / 2 - 9;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const col = remaining <= 5 ? '#ff5c7a' : color;

  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(255,255,255,.07)"
        strokeWidth="9"
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={col}
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset .25s linear, stroke .3s' }}
      />
      <text
        x="50%"
        y="48%"
        textAnchor="middle"
        fontFamily="'Space Mono', monospace"
        fontSize={size * 0.26}
        fontWeight="700"
        fill="#eaf0fb"
      >
        {fmt(remaining)}
      </text>
      <text
        x="50%"
        y="66%"
        textAnchor="middle"
        fontFamily="'Inter',sans-serif"
        fontSize="10"
        letterSpacing="1.5"
        fill="#8190ac"
      >
        RESTANTE
      </text>
    </svg>
  );
}
