import type { CalendarDaySummary } from '@/types/calendar';

/**
 * CalendarDayIndicators — Sprint 8.2.2 ("Mejorar visualización del
 * calendario"). Reutiliza el mismo patrón visual `.mx-cal-dots`/
 * `.mx-cal-dot`/`.mx-cal-count` que la celda del día ya usaba (Sprint
 * 3.14, un punto de color por sucursal) -- acá cada punto representa una
 * CATEGORÍA con al menos 1 trabajo ese día (pendiente/asignado/
 * finalizado/cancelado/vencido/crítico), no una sucursal. Cero clases CSS
 * nuevas -- "utilizar únicamente indicadores visuales... limpio y rápido
 * de leer" (brief textual) ya es exactamente lo que este patrón hace.
 *
 * Los colores de cada punto reutilizan las variables ya establecidas para
 * cada concepto en el resto de la app -- `var(--amber)` (pendiente, mismo
 * tono que `TRABAJO_ESTADO_INFO.live`), `var(--violet)` (asignado),
 * `var(--green)` (finalizado), `var(--muted)` (cancelado), `var(--red)`
 * (vencido/crítico) -- ninguna paleta nueva.
 *
 * **Corrección de auditoría (GAP-3)**: se agrega el punto `porConfirmar`
 * (`var(--ice)`, mismo tono que `TRABAJO_ESTADO_INFO.pending_confirmation`
 * en `constants/index.ts`) -- sin esto, un día con un trabajo
 * `pending_confirmation` mostraba menos puntos que trabajos reales tenía.
 */
export interface CalendarDayIndicatorsProps {
  summary: CalendarDaySummary | undefined;
}

interface Dot {
  key: string;
  color: string;
}

export function CalendarDayIndicators({ summary }: CalendarDayIndicatorsProps) {
  if (!summary || summary.total === 0) return null;

  const dots: Dot[] = [];
  if (summary.pendientes > 0) dots.push({ key: 'pendiente', color: 'var(--amber)' });
  if (summary.asignados > 0) dots.push({ key: 'asignado', color: 'var(--violet)' });
  if (summary.porConfirmar > 0) dots.push({ key: 'porConfirmar', color: 'var(--ice)' });
  if (summary.finalizados > 0) dots.push({ key: 'finalizado', color: 'var(--green)' });
  if (summary.cancelados > 0) dots.push({ key: 'cancelado', color: 'var(--muted)' });
  if (summary.vencidos > 0) dots.push({ key: 'vencido', color: 'var(--red)' });
  if (summary.criticos > 0) dots.push({ key: 'critico', color: 'var(--red)' });

  return (
    <div className="mx-cal-dots">
      {dots.slice(0, 5).map((dot) => (
        <span key={dot.key} className="mx-cal-dot" style={{ background: dot.color }} />
      ))}
      {dots.length > 5 ? <span className="mx-cal-count">+{dots.length - 5}</span> : null}
    </div>
  );
}
