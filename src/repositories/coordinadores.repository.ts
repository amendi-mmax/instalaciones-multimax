/**
 * coordinadores.repository.ts — acceso tipado a la tabla real
 * `coordinadores` (Sprint 4.1.1, Fase 6; rediseñado en Sprint 4.1.1C -- ver
 * `base.repository.ts`). Ver `docs/database/DATABASE_INVENTORY.md` §2.4.
 *
 * Nota heredada de la auditoría: `coordinadores` también tiene RLS
 * habilitado sin policies propias como tabla destino -- solo se lee
 * indirectamente desde policies de otras tablas (`trabajos`,
 * `trabajo_instaladores`, `ofertas`, `instaladores`). Ver
 * `docs/database/DATABASE_DIFF.md`.
 *
 * `rol` (columna `text`, default `'coordinador'`, también puede valer
 * `'admin'`) se expone tal cual -- este repositorio no interpreta ese
 * valor (eso sería lógica de negocio).
 */
import type { Repository } from '@/repositories/base.repository';
import { getClient, toServiceResult, type ServiceResult } from '@/services/supabase.service';
import type { TableInsert, TableRow, TableUpdate } from '@/services/database.service';
import { TABLES } from '@/lib/supabase/config';

async function getAll(): Promise<ServiceResult<TableRow<'coordinadores'>[]>> {
  const query = getClient().from(TABLES.coordinadores).select('*');
  return toServiceResult(query);
}

async function getById(id: string): Promise<ServiceResult<TableRow<'coordinadores'> | null>> {
  const query = getClient().from(TABLES.coordinadores).select('*').eq('id', id).maybeSingle();
  return toServiceResult(query);
}

async function create(row: TableInsert<'coordinadores'>): Promise<ServiceResult<TableRow<'coordinadores'>>> {
  const query = getClient().from(TABLES.coordinadores).insert(row).select().single();
  return toServiceResult(query);
}

async function update(
  id: string,
  patch: TableUpdate<'coordinadores'>,
): Promise<ServiceResult<TableRow<'coordinadores'>>> {
  const query = getClient().from(TABLES.coordinadores).update(patch).eq('id', id).select().single();
  return toServiceResult(query);
}

async function remove(id: string): Promise<ServiceResult<null>> {
  const query = getClient().from(TABLES.coordinadores).delete().eq('id', id).select().maybeSingle();
  const result = await toServiceResult(query);
  if (!result.ok) {
    return result;
  }
  return { ok: true, data: null };
}

async function getByEmpresaId(empresaId: string): Promise<ServiceResult<TableRow<'coordinadores'>[]>> {
  const query = getClient().from(TABLES.coordinadores).select('*').eq('empresa_id', empresaId);
  return toServiceResult(query);
}

async function getByTiendaId(tiendaId: string): Promise<ServiceResult<TableRow<'coordinadores'>[]>> {
  const query = getClient().from(TABLES.coordinadores).select('*').eq('tienda_id', tiendaId);
  return toServiceResult(query);
}

export const coordinadoresRepository: Repository<'coordinadores'> & {
  getByEmpresaId: typeof getByEmpresaId;
  getByTiendaId: typeof getByTiendaId;
} = {
  getAll,
  getById,
  create,
  update,
  remove,
  getByEmpresaId,
  getByTiendaId,
};
