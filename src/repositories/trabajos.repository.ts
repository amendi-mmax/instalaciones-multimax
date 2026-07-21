/**
 * trabajos.repository.ts — acceso tipado a la tabla real `trabajos`
 * (Sprint 4.1.1, Fase 6; rediseñado en Sprint 4.1.1C -- ver
 * `base.repository.ts`). Ver `docs/database/DATABASE_INVENTORY.md` §2.6.
 *
 * No incluye la invocación de `asignar_instalador` (función RPC real que
 * modifica `estado`/`instalador_asignado_id`/`asignado_at`/
 * `contacto_visible_hasta`) -- eso es una regla de negocio ("asignar" un
 * trabajo), no un acceso tipado, y queda para el Sprint funcional que
 * implemente ese flujo. `callAsignarInstalador()`
 * (`src/services/database.service.ts`, Sprint 4.1.1B) ya está preparada,
 * tipada contra `Database['public']['Functions']['asignar_instalador']`,
 * para esa invocación cuando corresponda.
 *
 * Tampoco incluye la vista `trabajos_para_instalador` -- una vista de
 * solo-lectura con columnas propias (`mi_estado`/`estado_trabajo`/
 * `gane_yo`, ver `docs/database/DATABASE_INVENTORY.md` §4), fuera del
 * alcance de "acceso tipado a las 8 tablas" de este Sprint; se puede
 * agregar como `trabajosParaInstaladorRepository` en un Sprint futuro
 * usando `VIEWS.trabajosParaInstalador` (`src/lib/supabase/config.ts`).
 */
import type { Repository } from '@/repositories/base.repository';
import { getClient, toServiceResult, type ServiceResult } from '@/services/supabase.service';
import type { TableInsert, TableRow, TableUpdate } from '@/services/database.service';
import { TABLES } from '@/lib/supabase/config';

async function getAll(): Promise<ServiceResult<TableRow<'trabajos'>[]>> {
  const query = getClient().from(TABLES.trabajos).select('*');
  return toServiceResult(query);
}

async function getById(id: string): Promise<ServiceResult<TableRow<'trabajos'> | null>> {
  const query = getClient().from(TABLES.trabajos).select('*').eq('id', id).maybeSingle();
  return toServiceResult(query);
}

async function create(row: TableInsert<'trabajos'>): Promise<ServiceResult<TableRow<'trabajos'>>> {
  const query = getClient().from(TABLES.trabajos).insert(row).select().single();
  return toServiceResult(query);
}

async function update(id: string, patch: TableUpdate<'trabajos'>): Promise<ServiceResult<TableRow<'trabajos'>>> {
  const query = getClient().from(TABLES.trabajos).update(patch).eq('id', id).select().single();
  return toServiceResult(query);
}

async function remove(id: string): Promise<ServiceResult<null>> {
  const query = getClient().from(TABLES.trabajos).delete().eq('id', id).select().maybeSingle();
  const result = await toServiceResult(query);
  if (!result.ok) {
    return result;
  }
  return { ok: true, data: null };
}

async function getByEmpresaId(empresaId: string): Promise<ServiceResult<TableRow<'trabajos'>[]>> {
  const query = getClient().from(TABLES.trabajos).select('*').eq('empresa_id', empresaId);
  return toServiceResult(query);
}

async function getByTiendaId(tiendaId: string): Promise<ServiceResult<TableRow<'trabajos'>[]>> {
  const query = getClient().from(TABLES.trabajos).select('*').eq('tienda_id', tiendaId);
  return toServiceResult(query);
}

/**
 * Filtra por `estado` (columna `text` libre, sin CHECK real en Producción
 * -- ver `docs/database/DATABASE_DIFF.md`, "Roles legacy / Enums legacy").
 * Se recibe `estado: string`, no una unión de literales, precisamente
 * porque no hay ninguna garantía de base de datos sobre el vocabulario
 * real -- acotar ese tipo es responsabilidad de un Sprint funcional futuro,
 * una vez verificado `SELECT DISTINCT estado FROM trabajos` contra
 * Producción (ver `docs/frontend/FRONTEND_SYNC_PLAN.md`, sección de
 * riesgos).
 */
async function getByEstado(estado: string): Promise<ServiceResult<TableRow<'trabajos'>[]>> {
  const query = getClient().from(TABLES.trabajos).select('*').eq('estado', estado);
  return toServiceResult(query);
}

export const trabajosRepository: Repository<'trabajos'> & {
  getByEmpresaId: typeof getByEmpresaId;
  getByTiendaId: typeof getByTiendaId;
  getByEstado: typeof getByEstado;
} = {
  getAll,
  getById,
  create,
  update,
  remove,
  getByEmpresaId,
  getByTiendaId,
  getByEstado,
};
