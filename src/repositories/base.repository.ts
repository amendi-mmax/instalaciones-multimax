/**
 * base.repository.ts — contrato compartido de la capa de repositorios
 * (Sprint 4.1.1, Fase 6; rediseñado en Sprint 4.1.1C).
 *
 * Hasta Sprint 4.1.1B, este archivo exportaba también una fábrica en tiempo
 * de ejecución (`createRepository(table, writeOps)`) que construía
 * `getAll`/`getById`/`remove` delegando a `selectAll`/`selectById`/
 * `deleteById` de `database.service.ts`. Sprint 4.1.1C decidió (ver
 * `docs/architecture/frontend/SPRINT_4_1_1C_DATABASE_SERVICE_REPORT.md` §2)
 * que las 5 operaciones de cada tabla deben implementarse directamente en
 * el archivo de esa tabla, contra `getClient().from(TABLES.<tabla>)`, sin
 * ninguna capa intermedia genérica -- por lo que la fábrica ya no tiene
 * ninguna lógica real que aportar y se eliminó.
 *
 * Lo único que queda acá es el **contrato**: la forma que deben tener los 8
 * objetos `xRepository` (`admins.repository.ts`, `trabajos.repository.ts`,
 * etc.), para que todos sean intercambiables desde el punto de vista de
 * quien los consuma. Cada repositorio declara su propio objeto como
 * `Repository<'<tabla>'>` (ver cualquier archivo de `src/repositories/` para
 * el patrón) -- no hay una función `createRepository` que instanciar.
 */
import type { ServiceResult } from '@/services/supabase.service';
import type { TableInsert, TableRow, TableUpdate } from '@/services/database.service';
import type { TableName } from '@/lib/supabase/config';

export interface Repository<T extends TableName> {
  getAll(): Promise<ServiceResult<TableRow<T>[]>>;
  getById(id: string): Promise<ServiceResult<TableRow<T> | null>>;
  create(row: TableInsert<T>): Promise<ServiceResult<TableRow<T>>>;
  update(id: string, patch: TableUpdate<T>): Promise<ServiceResult<TableRow<T>>>;
  remove(id: string): Promise<ServiceResult<null>>;
}
