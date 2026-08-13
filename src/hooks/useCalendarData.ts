import { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationalContext } from '@/hooks/useOperationalContext';
import {
  buildCalendarJobViewModels,
  buildCalendarNameLookups,
  getCalendar,
  getCalendarFilters,
  getDayJobs,
  getMonthlySummary,
} from '@/services/calendar.service';
import {
  EMPTY_CALENDAR_FILTERS,
  type CalendarDaySummary,
  type CalendarFilterOptions,
  type CalendarFilterValues,
  type CalendarJobViewModel,
} from '@/types/calendar';

export type CalendarLoadStatus = 'loading' | 'ready' | 'error';

function yearMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * useCalendarData — Sprint 8.2 (Ajuste 8.2.9: "separar Hooks de
 * Componentes/Presentación"). Toda la lógica de negocio del Calendario
 * Maestro vive acá -- `MasterCalendar` y sus 5 sub-componentes
 * (`CalendarFilterBar`/`CalendarDayIndicators`/`CalendarJobCard`/
 * `CalendarDayDrawer`/`CalendarLegend`) son puramente presentacionales,
 * reciben todo por props.
 *
 * **Filtros persistentes entre meses** (Sprint 8.2.1: "no perder el
 * estado"): `filters` es un único `useState` independiente de
 * `viewYear`/`viewMonth` -- navegar de mes nunca resetea `filters` (no
 * hay ningún efecto que lo haga). El refetch ocurre por el `useEffect`
 * de abajo, cuyas dependencias incluyen AMBOS (`yearMonth` y cada campo
 * de `filters`) -- cambiar cualquiera de los dos dispara una sola
 * consulta combinada (Sprint 8.2.6), nunca dos separadas.
 *
 * **Rendimiento** (Sprint 8.2.6): una sola consulta por combinación
 * mes+filtros (`getCalendar()`, ya scoped server-side -- ver
 * `trabajosRepository.getByMonthAndFilters`). Abrir/cerrar el Drawer de
 * un día (`selectedDate`) NO dispara ningún refetch -- `getDayJobs()` es
 * una función pura sobre `jobs`, ya en memoria.
 */
export function useCalendarData() {
  const hoy = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(hoy.getFullYear());
  const [viewMonth, setViewMonth] = useState(hoy.getMonth());
  const [filters, setFilters] = useState<CalendarFilterValues>(EMPTY_CALENDAR_FILTERS);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [filterOptions, setFilterOptions] = useState<CalendarFilterOptions | null>(null);
  const [jobs, setJobs] = useState<CalendarJobViewModel[]>([]);
  const [status, setStatus] = useState<CalendarLoadStatus>('loading');

  // Catálogos de filtro -- una sola vez al montar, no dependen del mes.
  useEffect(() => {
    let active = true;
    getCalendarFilters().then((result) => {
      if (!active) return;
      setFilterOptions(result.ok ? result.data : { empresas: [], tiendas: [], coordinadores: [], instaladores: [] });
    });
    return () => {
      active = false;
    };
  }, []);

  const yearMonth = yearMonthKey(viewYear, viewMonth);

  // Sprint 7.1 (Objetivo 5, "actualización inmediata sin recargar") ya
  // exigía que el Calendario Maestro se refrescara al publicar un trabajo
  // nuevo, sin depender de recargar la página -- `activeJob?.id` cambia
  // cada vez que `onPublish` (`CoordinatorLayout.tsx`, sin tocar en este
  // Sprint) confirma un `INSERT` real. Se preserva acá como una
  // dependencia más del mismo `useEffect` de carga -- mismo criterio ya
  // usado por el `MasterCalendar` anterior a este Sprint, para no
  // introducir una regresión.
  const { activeJob } = useOperationalContext();

  useEffect(() => {
    if (!filterOptions) return; // espera los catálogos, necesarios para resolver nombres.

    let active = true;
    setStatus('loading');

    getCalendar(yearMonth, filters).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setStatus('error');
        setJobs([]);
        return;
      }
      const lookups = buildCalendarNameLookups(filterOptions);
      setJobs(buildCalendarJobViewModels(result.data, lookups));
      setStatus('ready');
    });

    return () => {
      active = false;
    };
  }, [yearMonth, filters, filterOptions, activeJob?.id]);

  const monthlySummary = useMemo<Record<string, CalendarDaySummary>>(() => getMonthlySummary(jobs), [jobs]);

  const selectedDayJobs = useMemo(
    () => (selectedDate ? getDayJobs(jobs, selectedDate) : []),
    [jobs, selectedDate],
  );

  const goToPreviousMonth = useCallback(() => {
    setViewMonth((month) => {
      if (month === 0) {
        setViewYear((year) => year - 1);
        return 11;
      }
      return month - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((month) => {
      if (month === 11) {
        setViewYear((year) => year + 1);
        return 0;
      }
      return month + 1;
    });
  }, []);

  const selectDay = useCallback((fecha: string) => {
    setSelectedDate((current) => (current === fecha ? null : fecha));
  }, []);

  const closeDrawer = useCallback(() => setSelectedDate(null), []);

  return {
    viewYear,
    viewMonth,
    goToPreviousMonth,
    goToNextMonth,
    filters,
    setFilters,
    filterOptions,
    status,
    jobs,
    monthlySummary,
    selectedDate,
    selectedDayJobs,
    selectDay,
    closeDrawer,
  };
}
