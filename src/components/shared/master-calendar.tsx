import { CalendarDayDrawer } from '@/components/shared/calendar-day-drawer';
import { CalendarDayIndicators } from '@/components/shared/calendar-day-indicators';
import { CalendarFilterBar } from '@/components/shared/calendar-filter-bar';
import { CalendarLegend } from '@/components/shared/calendar-legend';
import { PageContainer, PageHead } from '@/components/shared/page-container';
import { Loading } from '@/components/ui/spinner';
import { useCalendarData } from '@/hooks/useCalendarData';

/**
 * MasterCalendar — reconstruye verbatim `function MasterCalendar()`
 * (`Multimax_Despacho_v1.3.html`, líneas 2825-3028) hasta el Sprint 7.1;
 * evolucionado en el Sprint 8.2 ("Master Calendar (Fase 1)") a una
 * herramienta operativa real, manteniendo intacta la grilla de mes/día
 * original (`.mx-cal-outer`/`.mx-cal-hd`/`.mx-cal-grid`/`.mx-cal-day`,
 * sin ningún cambio de esas clases).
 *
 * **Sprint 8.2 -- qué cambió**: toda la lógica de negocio (filtros,
 * consulta del mes, resumen por día, trabajos del día seleccionado) se
 * movió a `useCalendarData()` (Sprint 8.2.9: "no mezclar lógica de
 * negocio con UI") -- este componente quedó puramente presentacional,
 * compone 4 piezas nuevas + la grilla original:
 * - `CalendarFilterBar` (Sprint 8.2.1) reemplaza el único `<select>` de
 *   sucursal (con estilos en línea) que tenía este archivo -- ahora 6
 *   filtros combinables, con estado persistente entre meses (vive en el
 *   Hook, no en este componente, así que cambiar de mes nunca lo
 *   resetea).
 * - `CalendarDayIndicators` (Sprint 8.2.2) reemplaza los puntos de color
 *   por sucursal (`SUSCOL`) de cada celda -- ahora puntos por categoría
 *   real (pendiente/asignado/finalizado/cancelado/vencido/crítico).
 * - `CalendarDayDrawer` (Sprint 8.2.3) reemplaza la `Card.mx-daylist`
 *   inline que aparecía debajo de la grilla al seleccionar un día -- un
 *   Drawer LATERAL (nunca un Modal, nunca una navegación -- brief
 *   textual), con cada trabajo en su propia `CalendarJobCard`
 *   reutilizable (Sprint 8.2.4, acciones rápidas preparadas como
 *   placeholders).
 * - `CalendarLegend` (Sprint 8.2.5) reemplaza la leyenda de colores por
 *   sucursal -- ahora Badges de estado/prioridad, mismo vocabulario que
 *   `CalendarDayIndicators`/`CalendarJobCard`.
 *
 * **Rendimiento (Sprint 8.2.6)**: `useCalendarData()` ya no hace
 * `trabajosRepository.getAll()` (todos los trabajos de la empresa,
 * filtrados 100% en cliente, como hacía este archivo desde el Sprint
 * 7.1) -- consulta únicamente el mes visible + filtros activos
 * (`trabajosRepository.getByMonthAndFilters()`, Sprint 8.2, nuevo). Abrir
 * el Drawer de un día no dispara ninguna consulta adicional.
 *
 * **Integración**: sin cambios -- sigue siendo consumido por `AdminPanel`
 * en su pestaña "Calendario maestro", sin tocar `RootLayout.tsx`/
 * `CoordinatorLayout.tsx` (ambos fuera de alcance de este Sprint).
 */
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

const DOFW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export function MasterCalendar() {
  const {
    viewYear,
    viewMonth,
    goToPreviousMonth,
    goToNextMonth,
    filters,
    setFilters,
    filterOptions,
    status,
    monthlySummary,
    selectedDate,
    selectedDayJobs,
    selectDay,
    closeDrawer,
  } = useCalendarData();

  const hoy = new Date();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const ds = (d: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const isToday = (d: number) =>
    d === hoy.getDate() && viewMonth === hoy.getMonth() && viewYear === hoy.getFullYear();

  return (
    <PageContainer>
      <PageHead title="Calendario maestro" subtitle="Todos los trabajos de todas las sucursales" />
      <CalendarFilterBar filters={filters} onFiltersChange={setFilters} options={filterOptions} />

      {status === 'loading' && filterOptions === null ? (
        <Loading label="Cargando calendario…" />
      ) : (
        <div className="mx-cal-outer">
          <div className="mx-cal-hd">
            <span className="mx-cal-month">
              {MESES[viewMonth]} {viewYear}
            </span>
            <div className="mx-cal-nav">
              <button type="button" onClick={goToPreviousMonth}>
                ‹
              </button>
              <button type="button" onClick={goToNextMonth}>
                ›
              </button>
            </div>
          </div>
          <div className="mx-cal-grid">
            {DOFW.map((d) => (
              <div key={d} className="mx-cal-dow">
                {d}
              </div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} />;
              const dstr = ds(day);
              const summary = monthlySummary[dstr];
              const isSel = selectedDate === dstr;
              return (
                <div
                  key={dstr}
                  className={`mx-cal-day${summary ? ' has-jobs' : ''}${isSel ? ' sel' : ''}${isToday(day) ? ' today' : ''}`}
                  onClick={() => selectDay(dstr)}
                >
                  <span className="mx-cal-dn">{day}</span>
                  <CalendarDayIndicators summary={summary} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CalendarLegend />

      <CalendarDayDrawer date={selectedDate} jobs={selectedDayJobs} status={status} onClose={closeDrawer} />
    </PageContainer>
  );
}
