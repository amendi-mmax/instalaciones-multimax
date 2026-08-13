import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Badge — portado de `.mx-pill` (globals.css). El prototipo aplica el color
 * por `style` inline calculado en JS (ver snapshot DOM de v1.3: "Sesión
 * local" con background/color/border-color en rgba derivados del tono). Se
 * modela aquí como un prop `tone` con las mismas paletas del prototipo
 * (--ice/--amber/--red/--green/--violet/--muted), evitando estilos inline.
 */
export type BadgeTone = 'ice' | 'amber' | 'red' | 'green' | 'violet' | 'muted';

const TONE_STYLE: Record<BadgeTone, string> = {
  ice: 'text-ice border-[rgba(52,225,232,0.35)] bg-[rgba(52,225,232,0.1)]',
  amber: 'text-amber border-[rgba(255,178,62,0.35)] bg-[rgba(255,178,62,0.1)]',
  red: 'text-red border-[rgba(255,92,122,0.35)] bg-[rgba(255,92,122,0.1)]',
  green: 'text-green border-[rgba(59,224,138,0.35)] bg-[rgba(59,224,138,0.1)]',
  violet: 'text-violet border-[rgba(169,155,255,0.35)] bg-[rgba(169,155,255,0.1)]',
  muted: 'text-muted border-[rgba(129,144,172,0.25)] bg-[rgba(129,144,172,0.12)]',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = 'muted', ...props }: BadgeProps) {
  return <span className={cn('mx-pill', TONE_STYLE[tone], className)} {...props} />;
}
