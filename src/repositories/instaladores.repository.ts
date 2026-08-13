/**
 * instaladores.repository.ts — acceso tipado a la tabla real `instaladores`
 * (Sprint 4.1.1, Fase 6; rediseñado en Sprint 4.1.1C -- ver
 * `base.repository.ts`). Ver `docs/database/DATABASE_INVENTORY.md` §2.5.
 *
 * Esta es una de las 2 tablas (junto con `trabajos`) que sí tienen policies
 * RLS reales para `authenticated` -- ver `docs/database/DATABASE_DIFF.md`,
 * "RLS nuevas".
 */
import type { Repository } from '@/repositories/base.repository';
import { getClient, toServiceResult, type ServiceResult } from '@/services/supabase.service';
import type { TableInsert, TableRow, TableUpdate } from '@/services/database.service';
import { TABLES } from '@/lib/supabase/config';

async function getAll(): Promise<ServiceResult<TableRow<'instaladores'>[]>> {
  const query = getClient().from(TABLES.instaladores).select('*');
  return toServiceResult(query);
}

async function getById(id: string): Promise<ServiceResult<TableRow<'instaladores'> | null>> {
  const query = getClient().from(TABLES.instaladores).select('*').eq('id', id).maybeSingle();
  return toServiceResult(query);
}

async function create(row: TableInsert<'instaladores'>): Promise<ServiceResult<TableRow<'instaladores'>>> {
  const query = getClient().from(TABLES.instaladores).insert(row).select().single();
  return toServiceResult(query);
}

async function update(
  id: string,
  patch: TableUpdate<'instaladores'>,
): Promise<ServiceResult<TableRow<'instaladores'>>> {
  const query = getClient().from(TABLES.instaladores).update(patch).eq('id', id).select().single();
  return toServiceResult(query);
}

async function remove(id: string): Promise<ServiceResult<null>> {
  const query = getClient().from(TABLES.instaladores).delete().eq('id', id).select().maybeSingle();
  const result = await toServiceResult(query);
  if (!result.ok) {
    return result;
  }
  return { ok: true, data: null };
}

async function getByEmpresaId(empresaId: string): Promise<ServiceResult<TableRow<'instaladores'>[]>> {
  const query = getClient().from(TABLES.instaladores).select('*').eq('empresa_id', empresaId);
  return toServiceResult(query);
}

export const instaladoresRepository: Repository<'instaladores'> & {
  getByEmpresaId: typeof getByEmpresaId;
} = {
  getAll,
  getById,
  create,
  update,
  remove,
  getByEmpresaId,
};
