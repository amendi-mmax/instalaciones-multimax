import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { TRABAJOS_FILTROS } from '@/constants';
import type { CalendarFilterOptions, CalendarFilterValues } from '@/types/calendar';

/**
 * CalendarFilterBar — Sprint 8.2.1 ("Barra superior de filtros"). Presenta
 * los 6 filtros combinables (empresa/sucursal/coordinador/instalador/
 * estado/prioridad) -- puramente presentacional (Sprint 8.2.9): recibe
 * `filters`/`options` por props, no consulta Supabase ni conoce
 * `calendar.service.ts` -- eso vive en `useCalendarData()`.
 *
 * Reutiliza `Select` (`ui/select.tsx`, ya usado en `PublishModal`/
 * `AdminInstaladores`) en vez de un `<select>` con estilos en línea --
 * corrige, de paso, la inconsistencia que tenía el `MasterCalendar`
 * anterior a este Sprint (su único filtro, "Sucursal", sí usaba un
 * `<select>` con `style={{...}}` propio en vez del componente
 * compartido) -- mismo componente, mismas clases `.mx-select-native`,
 * cero CSS nuevo.
 *
 * **Catálogos todavía cargando** (`options === null`): 4 `Skeleton`
 * (`ui/skeleton.tsx`) del tamaño de un `Select`, en vez de deshabilitar
 * los filtros silenciosamente -- mismo criterio de estados uniformes que
 * `AdminKpiCard` (Sprint 8.1.1), aplicado acá a un caso distinto
 * (catálogo, no indicador).
 *
 * **"Empresa instaladora"/"Prioridad"**: ver `types/calendar.ts` para la
 * justificación completa de por qué "Empresa instaladora" usa el catálogo
 * real `empresas` (sin entidad propia todavía -- Sprint 8.3) y por qué
 * "Prioridad" solo tiene 2 opciones reales (`urgente` es `boolean`, no
 * hay 3 niveles en el schema).
 */
export interface CalendarFilterBarProps {
  filters: CalendarFilterValues;
  onFiltersChange: (next: CalendarFilterValues) => void;
  options: CalendarFilterOptions | null;
}

function FilterSkeleton() {
  return <Skeleton className="h-8 w-[150px]" />;
}

export function CalendarFilterBar({ filters, onFiltersChange, options }: CalendarFilterBarProps) {
  const set = <K extends keyof CalendarFilterValues>(key: K, value: CalendarFilterValues[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {options === null ? (
        <>
          <FilterSkeleton />
          <FilterSkeleton />
          <FilterSkeleton />
          <FilterSkeleton />
        </>
      ) : (
        <>
          <Select
            value={filters.empresaId ?? ''}
            onChange={(e) => set('empresaId', e.target.value || null)}
            className="w-[150px]"
          >
            <option value="">Empresa instaladora: Todas</option>
            {options.empresas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </Select>
          <Select
            value={filters.tiendaId ?? ''}
            onChange={(e) => set('tiendaId', e.target.value || null)}
            className="w-[150px]"
          >
            <option value="">Sucursal: Todas</option>
            {options.tiendas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </Select>
          <Select
            value={filters.coordinadorId ?? ''}
            onChange={(e) => set('coordinadorId', e.target.value || null)}
            className="w-[150px]"
          >
            <option value="">Coordinador: Todos</option>
            {options.coordinadores.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </Select>
          <Select
            value={filters.instaladorId ?? ''}
            onChange={(e) => set('instaladorId', e.target.value || null)}
            className="w-[150px]"
          >
            <option value="">Instalador: Todos</option>
            {options.instaladores.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </Select>
        </>
      )}
      <Select
        value={filters.estado ?? ''}
        onChange={(e) => set('estado', e.target.value || null)}
        className="w-[140px]"
      >
        <option value="">Estado: Todos</option>
        {TRABAJOS_FILTROS.filter(([value]) => value !== 'todos').map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <Select
        value={filters.prioridad ?? ''}
        onChange={(e) => set('prioridad', (e.target.value || null) as CalendarFilterValues['prioridad'])}
        className="w-[140px]"
      >
        <option value="">Prioridad: Todas</option>
        <option value="alta">Alta</option>
        <option value="normal">Normal</option>
      </Select>
    </div>
  );
}
