/**
 * database.service.ts — tipos de fila/inserción/actualización derivados del
 * esquema real de Producción, y las invocaciones RPC reales de Producción
 * (Sprint 4.1.1, Fase 4; primer rediseño en Sprint 4.1.1B; rediseño final en
 * Sprint 4.1.1C tras la auditoría arquitectónica obligatoria de ese Sprint).
 *
 * `Database`/`TableRow`/`TableInsert`/`TableUpdate` importan de
 * `@/types/database.generated`, generado por
 * `supabase gen types typescript --linked --schema public` -- ver
 * `src/types/README.md` para la convención completa.
 *
 * ## Sprint 4.1.1C — auditoría arquitectónica: ¿debe existir un "CRUD
 * genérico" en este archivo?
 *
 * Sprint 4.1.1B ya había eliminado `insertRow`/`updateById`/`callRpc`
 * genéricos (ver historial en `ARCHITECTURE.md §14.8`), pero dejó
 * `selectAll`/`selectById`/`deleteById` genéricos acá, con el argumento de
 * que esas tres sí eran type-safe (no pasan ningún valor de entrada cuya
 * forma dependa de la tabla). Sprint 4.1.1C pidió evaluar explícitamente si,
 * aun siendo type-safe, ese resto de CRUD genérico debía seguir viviendo
 * acá, o si la arquitectura queda más limpia si **todo** el acceso a una
 * tabla (lectura y escritura) vive en el archivo de esa tabla.
 *
 * Se evaluaron las dos alternativas que planteó el brief de este Sprint:
 *
 * 1. Mantener `selectAll`/`selectById`/`deleteById` acá (statu quo de
 *    Sprint 4.1.1B) y solo `create`/`update` en cada repositorio.
 * 2. Que **cada repositorio** (`src/repositories/*.repository.ts`) llame
 *    directamente a `getClient().from(TABLES.<tabla>)` para las 5
 *    operaciones (`getAll`/`getById`/`create`/`update`/`remove`), y que este
 *    archivo deje de tener ninguna función de acceso a tablas -- solo tipos
 *    y RPC.
 *
 * Se adoptó la alternativa 2, por tres motivos concretos:
 *
 * - **Consistencia de estilo**: con el diseño de Sprint 4.1.1B, dos
 *   operaciones (`create`/`update`) vivían en el repositorio de cada tabla
 *   y tres (`getAll`/`getById`/`deleteById`) vivían acá, delegadas a través
 *   de `base.repository.ts`. Esa mezcla -- "unas operaciones son locales,
 *   otras son un passthrough a una función compartida" -- es una
 *   inconsistencia arquitectónica real, aunque ninguna de las dos mitades
 *   tuviera un problema de tipado. Con la alternativa 2, las 5 operaciones
 *   de cada tabla tienen la misma forma en el mismo archivo.
 * - **Coherencia con el motivo original del cambio**: el Sprint 4.1.1B ya
 *   había establecido, para `create`/`update`, que "la única forma de que
 *   `.from()` vea un literal es que la llamada ocurra donde el nombre de
 *   tabla ya es literal, sin indirección genérica en el medio". Ese mismo
 *   argumento aplica en espíritu a `getAll`/`getById`/`deleteById`: aunque
 *   hoy compilen bien como genéricos, mantenerlos así es la única parte de
 *   la capa de datos que todavía depende de que TypeScript reconozca
 *   correctamente un tipo indexado genérico a través de un límite de
 *   función -- innecesario si la alternativa sin ese riesgo cuesta apenas
 *   3 líneas más por tabla.
 * - **`createRepository()` ya no evitaba código repetido real**: una vez
 *   que `create`/`update` viven en cada repositorio (Sprint 4.1.1B),
 *   `base.repository.ts` solo seguía reenviando `getAll`/`getById`/`remove`
 *   a `selectAll`/`selectById`/`deleteById` -- tres líneas de indirección
 *   por tabla, no una fábrica que ahorrara una implementación real. Quitar
 *   esa capa no aumenta la duplicación neta: cada tabla ya tenía que
 *   escribir su propio `create`/`update`; ahora escribe las 5 funciones,
 *   todas con la misma forma trivial (`getClient().from(TABLES.x)...`).
 *
 * Resultado: **este archivo ya no expone ninguna función de acceso a una
 * tabla** (ni siquiera de solo lectura). `src/repositories/base.repository.ts`
 * pasó a contener únicamente el contrato `Repository<T>` (una interfaz, sin
 * lógica en tiempo de ejecución); cada uno de los 8 archivos de
 * `src/repositories/*.repository.ts` implementa las 5 operaciones
 * directamente contra `getClient().from(TABLES.<tabla>)`, con el nombre de
 * tabla como literal concreto en cada uno. Ver `docs/architecture/frontend/SPRINT_4_1_1C_DATABASE_SERVICE_REPORT.md`
 * §2/§3 para el detalle completo de esta decisión y `src/services/supabase.service.ts`
 * para las utilidades verdaderamente transversales (cliente, normalización
 * de errores, `ServiceResult`) que sí siguen siendo compartidas.
 *
 * Lo único que sigue viviendo acá, y por qué:
 *
 * - `TableRow`/`TableInsert`/`TableUpdate`: alias de tipo puro (sin lógica
 *   en tiempo de ejecución) sobre `Database['public']['Tables']`. No son
 *   "CRUD genérico" -- son solo nombres cortos para no repetir
 *   `Database['public']['Tables'][T]['Row']` en los 8 repositorios; indexar
 *   un tipo con un literal concreto (como hace cada repositorio) no tiene
 *   ningún problema de tipado, a diferencia de pasar un valor a través de
 *   una función genérica.
 * - `callAsignarInstalador`/`callSubmitBid`: no son CRUD de tabla -- son
 *   invocaciones de función RPC real de Producción, sin un "repositorio"
 *   natural al que pertenecer (no son una tabla), y siguen siendo
 *   completamente explícitas (nombre de función literal, `Args`/`Returns`
 *   tomados directo de `Database['public']['Functions']`) por el mismo
 *   motivo documentado en Sprint 4.1.1B.
 */
import type { Database } from '@/types/database.generated';

import { getClient, normalizeSupabaseError, type ServiceResult } from '@/services/supabase.service';
import { RPC_FUNCTIONS } from '@/lib/supabase/config';
import type { TableName } from '@/lib/supabase/config';

/** Alias corto al esquema `public` del tipo generado por la Supabase CLI. */
type PublicSchema = Database['public'];

/** Fila completa de una tabla, tal como la devuelve un `select`. */
export type TableRow<T extends TableName> = PublicSchema['Tables'][T]['Row'];

/** Forma esperada para un `insert` en una tabla. */
export type TableInsert<T extends TableName> = PublicSchema['Tables'][T]['Insert'];

/** Forma esperada para un `update` (parcial) en una tabla. */
export type TableUpdate<T extends TableName> = PublicSchema['Tables'][T]['Update'];

/**
 * Invocación tipada de `asignar_instalador` (RPC real de Producción --
 * `docs/database/DATABASE_INVENTORY.md` §5). `Args`/`Returns`
 * provienen directamente de `Database['public']['Functions']['asignar_instalador']`
 * -- si el esquema real cambia (se agrega/quita un parámetro), este helper
 * deja de compilar automáticamente, sin necesidad de mantenerlo a mano.
 *
 * Sin lógica de negocio: no decide cuándo "asignar" un trabajo tiene
 * sentido -- eso es responsabilidad del Sprint funcional que implemente ese
 * flujo (ver nota en `src/repositories/trabajos.repository.ts`).
 */
export async function callAsignarInstalador(
  args: Database['public']['Functions']['asignar_instalador']['Args'],
): Promise<ServiceResult<Database['public']['Functions']['asignar_instalador']['Returns']>> {
  const { data, error } = await getClient().rpc(RPC_FUNCTIONS.asignarInstalador, args);
  if (error) {
    return { ok: false, error: normalizeSupabaseError(error) };
  }
  return { ok: true, data };
}

/**
 * Invocación tipada de `submit_bid` (RPC real de Producción --
 * `docs/database/DATABASE_INVENTORY.md` §5). Ver
 * `callAsignarInstalador` para la justificación del patrón.
 *
 * Nota real de esquema: los 5 argumentos (`p_comentario`, `p_dia`, `p_hora`,
 * `p_precio`, `p_trabajo_id`) son **obligatorios** según
 * `Database['public']['Functions']['submit_bid']['Args']` -- a diferencia
 * de `ofertas.comentario`, que sí es nullable como columna de tabla. Este
 * helper no relaja esa obligatoriedad: quien lo llame debe pasar los 5
 * campos, aunque `p_comentario` sea un string vacío para "sin comentario".
 * Decidir si eso amerita una capa de conveniencia (`p_comentario: string | null`
 * con conversión a `''` internamente) es una decisión de negocio, fuera de
 * alcance de este Sprint de infraestructura.
 */
export async function callSubmitBid(
  args: Database['public']['Functions']['submit_bid']['Args'],
): Promise<ServiceResult<Database['public']['Functions']['submit_bid']['Returns']>> {
  const { data, error } = await getClient().rpc(RPC_FUNCTIONS.submitBid, args);
  if (error) {
    return { ok: false, error: normalizeSupabaseError(error) };
  }
  return { ok: true, data };
}
