import { Badge } from '@/components/ui/badge';

/**
 * CalendarLegend — Sprint 8.2.5 ("Leyenda inferior"). "Utilizar Badges
 * existentes... No crear estilos nuevos" (brief textual) -- reutiliza
 * `Badge` (Fase 3) con los mismos 4 tonos ya usados por
 * `trabajoEstadoInfo()`/`TRABAJO_ESTADO_INFO` (`constants/index.ts`,
 * Sprint 5.1) para estado, más los 2 tonos ya usados por
 * `CalendarJobCard` para prioridad -- ningún tono/color nuevo, la leyenda
 * documenta exactamente el mismo vocabulario visual que ya usan las
 * celdas del calendario (`CalendarDayIndicators`) y las tarjetas del
 * Drawer (`CalendarJobCard`).
 *
 * Solo 2 niveles de prioridad ("Alta"/"Normal"), no 3 -- ver
 * `types/calendar.ts` para la justificación (columna real `urgente`,
 * `boolean`, sin un tercer nivel en el schema).
 */
const ESTADOS = [
  { tone: 'amber', label: 'Pendiente' },
  { tone: 'violet', label: 'Asignado' },
  { tone: 'green', label: 'Finalizado' },
  { tone: 'muted', label: 'Cancelado' },
] as const;

const PRIORIDADES = [
  { tone: 'red', label: 'Alta prioridad' },
  { tone: 'muted', label: 'Prioridad normal' },
] as const;

export function CalendarLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {ESTADOS.map((item) => (
        <Badge key={item.label} tone={item.tone}>
          {item.label}
        </Badge>
      ))}
      {PRIORIDADES.map((item) => (
        <Badge key={item.label} tone={item.tone}>
          {item.label}
        </Badge>
      ))}
    </div>
  );
}
