/**
 * calendar.ts — tipos de dominio del Calendario Maestro (Sprint 8.2,
 * "Master Calendar (Fase 1)"). Separados de `calendar.service.ts` (Regla
 * explícita del brief, Sprint 8.2.9: "Separar Services/Hooks/Context/
 * Tipos/Helpers/Presentación/Componentes") -- mismo criterio ya aplicado
 * en `types/perfil.ts`/`types/enums.ts` (tipos de dominio en su propio
 * archivo, sin lógica).
 *
 * **`CalendarPriority` -- 2 niveles, no 3** (el brief ejemplifica "Alta/
 * Media/Baja prioridad" para la leyenda): el schema real de `trabajos`
 * solo tiene una columna `urgente boolean` (verificado vía MCP en Sprints
 * 8.1/8.1.1) -- no existe ningún campo de prioridad de 3 niveles. Se
 * modela honestamente con los 2 valores reales que la columna admite
 * (`'alta'` cuando `urgente = true`, `'normal'` cuando `urgente = false`)
 * -- mismo criterio ya usado por `JobSummaryCard` (Sprint 5.1.5, Pill
 * "Urgente"/"Normal" derivado de la misma columna). No se inventa un
 * tercer nivel "Media"/"Baja" que no existe en los datos.
 *
 * **`vencido`/`critico` (`CalendarJobViewModel`) -- derivados, no
 * columnas reales**: no existe ninguna columna `vencido`/`critico` en
 * `trabajos` -- se documentan acá las 2 reglas de derivación exactas
 * (aplicadas en `calendar.service.ts#buildCalendarJobViewModels`, nunca
 * en un componente):
 * - `vencido`: `estado === 'live'` (todavía sin asignar) Y `fecha` (fecha
 *   programada) es anterior a hoy -- un trabajo que debía resolverse y no
 *   se resolvió a tiempo.
 * - `critico`: `urgente === true` Y `estado === 'live'` -- un trabajo
 *   marcado urgente que sigue sin asignación.
 *
 * **`tiempoEstimadoMin`/`tiempoRealMin` -- siempre `null` hoy**: mismo
 * hallazgo ya documentado en `ARCHITECTURE.md` §14.13 (Sprint 8.1) para
 * "Tiempo promedio de instalación" -- `trabajos` no tiene ninguna columna
 * de duración estimada ni de timestamp de finalización real. Se dejan
 * tipados (no se omiten del modelo) para que un Sprint futuro que agregue
 * esas columnas no necesite tocar este contrato, solo su cálculo.
 *
 * **"Empresa instaladora" -- hoy equivale a `empresas` (el tenant real)**:
 * el schema actual no distingue todavía una entidad separada de "empresa
 * instaladora" (subcontratista) de la empresa tenant (`empresas`, p. ej.
 * "Multimax") -- esa distinción es, precisamente, el objeto de estudio
 * del Sprint 8.3 ("Empresas Instaladoras"), no implementado todavía. El
 * filtro/campo `empresaId`/`empresaNombre` de este Sprint usa la relación
 * real ya existente (`trabajos.empresa_id` → `empresas`) -- el mismo dato
 * que ya usan `MasterCalendar`/`AdminInstaladores`/`ProfilePage` para
 * "Empresa". Documentado para que el Sprint 8.3, si introduce una entidad
 * nueva, sepa exactamente qué campo de este módulo debe apuntar a ella.
 */
export type CalendarPriority = 'alta' | 'normal';

/** Catálogo simple `{id, nombre}` -- misma forma para las 4 listas de filtro (empresa/sucursal/coordinador/instalador). */
export interface CalendarOption {
  id: string;
  nombre: string;
}

export interface CalendarFilterOptions {
  empresas: CalendarOption[];
  tiendas: CalendarOption[];
  coordinadores: CalendarOption[];
  instaladores: CalendarOption[];
}

/**
 * Valores de filtro activos -- `null` significa "sin filtrar por este
 * campo" (equivalente a la opción "Todas"/"Todos" de cada `<Select>`).
 * `estado` reutiliza el vocabulario real ya establecido en
 * `constants/index.ts` (`TrabajoEstadoReal`) -- se tipa como `string |
 * null` acá, no como esa unión literal, por el mismo motivo que
 * `trabajosRepository.getByEstado()` ya documenta (columna `text` libre,
 * sin `CHECK` real en Producción).
 */
export interface CalendarFilterValues {
  empresaId: string | null;
  tiendaId: string | null;
  coordinadorId: string | null;
  instaladorId: string | null;
  estado: string | null;
  prioridad: CalendarPriority | null;
}

export const EMPTY_CALENDAR_FILTERS: CalendarFilterValues = {
  empresaId: null,
  tiendaId: null,
  coordinadorId: null,
  instaladorId: null,
  estado: null,
  prioridad: null,
};

/** Vista ya resuelta de un trabajo para el Calendario -- nombres denormalizados (no `_id` crudos), lista para pintar en el Drawer/leyenda sin que el componente resuelva nada. */
export interface CalendarJobViewModel {
  id: string;
  codigo: string;
  tipo: string;
  fecha: string;
  hora: string;
  cliente: string | null;
  sucursal: string | null;
  empresa: string | null;
  instalador: string | null;
  direccion: string | null;
  estado: string;
  prioridad: CalendarPriority;
  vencido: boolean;
  critico: boolean;
  /** Siempre `null` hoy -- ver JSDoc de cabecera. */
  tiempoEstimadoMin: number | null;
  /** Siempre `null` hoy -- ver JSDoc de cabecera. */
  tiempoRealMin: number | null;
}

/** Conteos agregados de un día -- alimenta los indicadores visuales de cada celda del calendario (Sprint 8.2.2), sin texto. */
export interface CalendarDaySummary {
  fecha: string;
  total: number;
  pendientes: number;
  asignados: number;
  finalizados: number;
  cancelados: number;
  vencidos: number;
  criticos: number;
}

/**
 * Placeholders de "Acciones rápidas" (Sprint 8.2.4) -- únicamente la
 * forma de datos que un Sprint futuro necesitará para decidir qué
 * acciones mostrar habilitadas según el rol/estado del trabajo. Ningún
 * componente de este Sprint ejecuta ninguna de estas acciones -- ver
 * `CalendarJobCard`, todos los botones quedan `disabled`.
 */
export type CalendarJobQuickAction = 'ver-detalle' | 'editar' | 'reasignar' | 'cambiar-prioridad' | 'cambiar-estado';
