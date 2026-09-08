/**
 * calendar.service.ts — servicio del Calendario Maestro (Sprint 8.2,
 * "Master Calendar (Fase 1)"). Mismo criterio arquitectónico en 3 capas ya
 * establecido en `admin-dashboard.service.ts` (Sprint 8.1.1): obtención →
 * transformación → presentación. `MasterCalendar`/`useCalendarData` no
 * llaman a ningún repositorio directamente -- todo pasa por acá (Regla
 * explícita del brief: "toda consulta deberá pasar por Services").
 *
 * Ver `types/calendar.ts` para el detalle completo de cada decisión de
 * modelado (`CalendarPriority` de 2 niveles, `vencido`/`critico`
 * derivados, `tiempoEstimadoMin`/`tiempoRealMin` siempre `null`, "empresa
 * instaladora" = `empresas` hoy) -- no se repite acá.
 */
import {
  coordinadoresRepository,
  empresasRepository,
  instaladoresRepository,
  tiendasRepository,
  trabajosRepository,
} from '@/repositories';
import { hoyComoTexto } from '@/services/dashboard.service';
import type { ServiceResult } from '@/services/supabase.service';
import type { TableRow } from '@/services/database.service';
import type {
  CalendarDaySummary,
  CalendarFilterOptions,
  CalendarFilterValues,
  CalendarJobViewModel,
  CalendarOption,
} from '@/types/calendar';

// ---------------------------------------------------------------------
// 1. OBTENCIÓN -- únicos puntos de este archivo que consultan Supabase
// (vía repositorios, nunca `getClient()` directo).
// ---------------------------------------------------------------------

function toOptions(rows: readonly { id: string; nombre: string }[]): CalendarOption[] {
  return rows.map((row) => ({ id: row.id, nombre: row.nombre }));
}

/**
 * getCalendarFilters — catálogos para la barra de filtros (Sprint 8.2.1).
 * 4 consultas en paralelo, todas ya scoped por RLS a la empresa del admin
 * (mismo patrón que `AdminInstaladores`/`MasterCalendar` desde Sprint
 * 3.13/3.14 -- sin filtrar `empresa_id` a mano en la query). Si alguna
 * falla, las demás igual completan -- un catálogo vacío no debe bloquear
 * los otros 3 (`ok: true` con lista vacía en ese caso, nunca un error que
 * tumbe toda la barra de filtros).
 */
export async function getCalendarFilters(): Promise<ServiceResult<CalendarFilterOptions>> {
  const [empresas, tiendas, coordinadores, instaladores] = await Promise.all([
    empresasRepository.getAll(),
    tiendasRepository.getAll(),
    coordinadoresRepository.getAll(),
    instaladoresRepository.getAll(),
  ]);

  return {
    ok: true,
    data: {
      empresas: empresas.ok ? toOptions(empresas.data) : [],
      tiendas: tiendas.ok ? toOptions(tiendas.data) : [],
      coordinadores: coordinadores.ok ? toOptions(coordinadores.data) : [],
      instaladores: instaladores.ok ? toOptions(instaladores.data) : [],
    },
  };
}

/**
 * getCalendar — trabajos del mes visible + filtros activos (Sprint 8.2.6:
 * "no consultar todos los trabajos"). `prioridad` se traduce a la columna
 * real `urgente` (ver `types/calendar.ts`).
 */
export async function getCalendar(
  yearMonth: string,
  filters: CalendarFilterValues,
): Promise<ServiceResult<TableRow<'trabajos'>[]>> {
  return trabajosRepository.getByMonthAndFilters({
    yearMonth,
    empresaId: filters.empresaId ?? undefined,
    tiendaId: filters.tiendaId ?? undefined,
    coordinadorId: filters.coordinadorId ?? undefined,
    instaladorId: filters.instaladorId ?? undefined,
    estado: filters.estado ?? undefined,
    urgente: filters.prioridad === 'alta' ? true : filters.prioridad === 'normal' ? false : undefined,
  });
}

// ---------------------------------------------------------------------
// 2. TRANSFORMACIÓN -- funciones puras, sin efectos secundarios, sin
// conocimiento de UI/Supabase.
// ---------------------------------------------------------------------

export interface CalendarNameLookups {
  tiendaNombreById: Record<string, string>;
  empresaNombreById: Record<string, string>;
  instaladorNombreById: Record<string, string>;
}

/** Arma los 3 mapas `id → nombre` a partir de los catálogos ya cargados (`getCalendarFilters()`) -- una sola vez por carga de filtros, no por cada trabajo. */
export function buildCalendarNameLookups(options: CalendarFilterOptions): CalendarNameLookups {
  const toMap = (list: CalendarOption[]) => Object.fromEntries(list.map((o) => [o.id, o.nombre]));
  return {
    tiendaNombreById: toMap(options.tiendas),
    empresaNombreById: toMap(options.empresas),
    instaladorNombreById: toMap(options.instaladores),
  };
}

function esVencido(row: TableRow<'trabajos'>): boolean {
  return row.estado === 'live' && row.fecha < hoyComoTexto();
}

function esCritico(row: TableRow<'trabajos'>): boolean {
  return row.urgente && row.estado === 'live';
}

/** Fila real → vista ya resuelta para el Drawer/leyenda (ver `types/calendar.ts#CalendarJobViewModel`). */
export function buildCalendarJobViewModels(
  rows: readonly TableRow<'trabajos'>[],
  lookups: CalendarNameLookups,
): CalendarJobViewModel[] {
  return rows.map((row) => ({
    id: row.id,
    codigo: row.codigo,
    tipo: row.tipo,
    fecha: row.fecha,
    hora: row.hora,
    cliente: row.cliente_nombre,
    sucursal: lookups.tiendaNombreById[row.tienda_id] ?? null,
    empresa: lookups.empresaNombreById[row.empresa_id] ?? null,
    instalador: row.instalador_asignado_id ? (lookups.instaladorNombreById[row.instalador_asignado_id] ?? null) : null,
    direccion: row.direccion_exacta ?? row.calle ?? null,
    estado: row.estado,
    prioridad: row.urgente ? 'alta' : 'normal',
    vencido: esVencido(row),
    critico: esCritico(row),
    tiempoEstimadoMin: null,
    tiempoRealMin: null,
  }));
}

/**
 * getMonthlySummary — un `CalendarDaySummary` por fecha presente en
 * `jobs` (Sprint 8.2.2, indicadores visuales por día). No incluye días
 * sin trabajos -- el componente de grilla trata "sin entrada en el mapa"
 * como 0 en todos los conteos.
 */
export function getMonthlySummary(jobs: readonly CalendarJobViewModel[]): Record<string, CalendarDaySummary> {
  const summary: Record<string, CalendarDaySummary> = {};

  for (const job of jobs) {
    const current = summary[job.fecha] ?? {
      fecha: job.fecha,
      total: 0,
      pendientes: 0,
      asignados: 0,
      porConfirmar: 0,
      finalizados: 0,
      cancelados: 0,
      vencidos: 0,
      criticos: 0,
    };

    current.total += 1;
    if (job.estado === 'live') current.pendientes += 1;
    else if (job.estado === 'assigned') current.asignados += 1;
    else if (job.estado === 'pending_confirmation') current.porConfirmar += 1;
    else if (job.estado === 'completed') current.finalizados += 1;
    else if (job.estado === 'cancelled') current.cancelados += 1;
    if (job.vencido) current.vencidos += 1;
    if (job.critico) current.criticos += 1;

    summary[job.fecha] = current;
  }

  return summary;
}

/**
 * getDayJobs — trabajos de una fecha puntual (Sprint 8.2.3, contenido del
 * Drawer al hacer clic en un día). Deliberadamente una función PURA sobre
 * el mes ya cargado en memoria, no una consulta nueva -- el mes completo
 * ya se trajo una sola vez con `getCalendar()`; abrir el Drawer de un día
 * no dispara ningún roundtrip adicional a Supabase (mismo espíritu de
 * "rendimiento" del Sprint 8.2.6, aplicado también acá aunque el Ajuste
 * 8.2.7 solo mencione `getDayJobs()` como parte del "Service").
 */
export function getDayJobs(jobs: readonly CalendarJobViewModel[], fecha: string): CalendarJobViewModel[] {
  return jobs.filter((job) => job.fecha === fecha);
}
