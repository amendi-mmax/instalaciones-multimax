/**
 * dashboard.service.ts — servicio de agregados para la Vista Operativa del
 * Coordinador (Sprint 5.1, "Dashboard y Vista Operativa del Coordinador").
 *
 * El brief de este Sprint pide explícitamente un `dashboard.service.ts`
 * "mientras no exista lógica de negocio" para los KPIs del Coordinador
 * (trabajos pendientes/activos/finalizados/programados hoy) y para no
 * "colocar arrays directamente dentro de componentes React". Este archivo
 * es ese punto único: `DespachoPage`/`TrabajosPage`/`TrabajoDetailPage` no
 * llaman a `trabajosRepository` directamente, siempre pasan por acá.
 *
 * A diferencia de lo que el nombre "servicio temporal" podría sugerir, NO
 * es un mock: `trabajos.repository.ts` ya existe (Sprint 4.1.1) y la tabla
 * `trabajos` ya tiene policies RLS reales para coordinadores (SELECT
 * "coordinadores ven trabajos de su tienda o de su empresa si admin" --
 * ver `docs/database/DATABASE_INVENTORY.md` §2.6), así que este servicio
 * consulta Supabase de verdad, con el mismo alcance de datos (`tienda_id`
 * del coordinador autenticado) que ya impone la base de datos. "Temporal"
 * describe la ausencia de la LÓGICA DE NEGOCIO explícitamente fuera de
 * alcance de este Sprint (publicar/asignar/ofertar trabajos -- Sprints
 * 5.2/5.3/5.4), no la fuente de los datos que sí lee.
 *
 * Vocabulario de `estado`: ver el JSDoc de `TRABAJO_ESTADO_INFO`
 * (`src/constants/index.ts`) para la advertencia completa sobre por qué
 * `assigned`/`completed`/`cancelled` son inferidos, no verificados contra
 * Producción. Este servicio hereda esa misma cautela: los conteos de
 * `pendientes`/`activos`/`finalizados` pueden quedar en 0 si el vocabulario
 * real difiere, pero `total` siempre refleja la cantidad real de filas
 * devueltas por RLS, sin importar el valor de `estado`.
 */
import { trabajosRepository } from '@/repositories';
import type { ServiceResult } from '@/services/supabase.service';
import type { TableRow } from '@/services/database.service';

export interface CoordinatorKpis {
  /** `estado === 'live'` -- publicado, esperando asignación. */
  pendientes: number;
  /** `estado === 'assigned'` -- instalador asignado, trabajo en curso. */
  activos: number;
  /** `estado === 'completed'`. */
  finalizados: number;
  /** `fecha` (columna `text`, no `date`/`timestamptz`) coincide con hoy. */
  programadosHoy: number;
  /** Cantidad total de filas devueltas (sin filtrar por `estado`). */
  total: number;
}

/**
 * `fecha` es `text` libre (no un tipo `date` real -- ver
 * `docs/database/DATABASE_INVENTORY.md` §2.6), igual que en el prototipo
 * (`TRABAJOS`, `src/constants/index.ts`, formato `YYYY-MM-DD`). Se compara
 * como string exacto contra la fecha de hoy en el mismo formato -- si
 * Producción llegara a usar otro formato de texto, `programadosHoy` daría
 * 0 en vez de un valor incorrecto (degradación segura, no un dato
 * fabricado).
 */
function hoyComoTexto(): string {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd = String(hoy.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function calcularKpis(rows: readonly TableRow<'trabajos'>[]): CoordinatorKpis {
  const hoy = hoyComoTexto();
  let pendientes = 0;
  let activos = 0;
  let finalizados = 0;
  let programadosHoy = 0;

  for (const row of rows) {
    if (row.estado === 'live') pendientes += 1;
    else if (row.estado === 'assigned') activos += 1;
    else if (row.estado === 'completed') finalizados += 1;

    if (row.fecha === hoy) programadosHoy += 1;
  }

  return { pendientes, activos, finalizados, programadosHoy, total: rows.length };
}

/**
 * getCoordinatorKpis — KPIs agregados de la tienda del coordinador
 * autenticado (Entregable 4 del Sprint 5.1). `tiendaId` viene de
 * `profile.tiendaId` (`useAuth()`) -- ver JSDoc de `Perfil` en
 * `types/perfil.ts` sobre por qué solo `coordinadores` tiene esa columna.
 */
export async function getCoordinatorKpis(tiendaId: string): Promise<ServiceResult<CoordinatorKpis>> {
  const result = await trabajosRepository.getByTiendaId(tiendaId);
  if (!result.ok) {
    return result;
  }
  return { ok: true, data: calcularKpis(result.data) };
}

/**
 * getTrabajosByTienda — lista completa de trabajos de la tienda del
 * coordinador (Entregable 5, "Cola de Trabajos" / `TrabajosPage`). El
 * filtrado por `estado` (chips "Todos"/"En vivo"/"Asignados"/...) se hace
 * en el cliente sobre este mismo resultado, no con una consulta nueva por
 * filtro -- mismo criterio que `CoordinatorJobs()` en el HTML fuente
 * (`lista = filtro === "todos" ? misTrab : misTrab.filter(...)`).
 */
export async function getTrabajosByTienda(
  tiendaId: string,
): Promise<ServiceResult<TableRow<'trabajos'>[]>> {
  return trabajosRepository.getByTiendaId(tiendaId);
}

/**
 * getTrabajoDetalle — un trabajo puntual por `id` (`TrabajoDetailPage`,
 * ruta `/trabajos/:id`). No revalida acá que pertenezca a la tienda del
 * coordinador -- esa validación de alcance ya la impone RLS (la misma
 * policy de SELECT que filtra `getTrabajosByTienda`); si un coordinador
 * pide por URL el `id` de un trabajo fuera de su tienda/empresa, Supabase
 * ya no lo devuelve (`data: null`), no hace falta duplicar esa regla acá.
 */
export async function getTrabajoDetalle(
  id: string,
): Promise<ServiceResult<TableRow<'trabajos'> | null>> {
  return trabajosRepository.getById(id);
}
