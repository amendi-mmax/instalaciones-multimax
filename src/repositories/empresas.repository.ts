/**
 * empresas.repository.ts — acceso tipado a la tabla real `empresas`
 * (Sprint 4.1.1, Fase 6; rediseñado en Sprint 4.1.1C -- ver
 * `base.repository.ts`). Ver `docs/database/DATABASE_INVENTORY.md` §2.1.
 *
 * Nota heredada de la auditoría: `empresas` tiene RLS habilitado sin
 * policies propias (ver `docs/database/DATABASE_DIFF.md`) -- este
 * repositorio queda listo tipográficamente, pendiente de esa decisión de
 * backend.
 */
import type { Repository } from '@/repositories/base.repository';
import { getClient, toServiceResult, type ServiceResult } from '@/services/supabase.service';
import type { TableInsert, TableRow, TableUpdate } from '@/services/database.service';
import { TABLES } from '@/lib/supabase/config';

async function getAll(): Promise<ServiceResult<TableRow<'empresas'>[]>> {
  const query = getClient().from(TABLES.empresas).select('*');
  return toServiceResult(query);
}

async function getById(id: string): Promise<ServiceResult<TableRow<'empresas'> | null>> {
  const query = getClient().from(TABLES.empresas).select('*').eq('id', id).maybeSingle();
  return toServiceResult(query);
}

async function create(row: TableInsert<'empresas'>): Promise<ServiceResult<TableRow<'empresas'>>> {
  const query = getClient().from(TABLES.empresas).insert(row).select().single();
  return toServiceResult(query);
}

async function update(id: string, patch: TableUpdate<'empresas'>): Promise<ServiceResult<TableRow<'empresas'>>> {
  const query = getClient().from(TABLES.empresas).update(patch).eq('id', id).select().single();
  return toServiceResult(query);
}

async function remove(id: string): Promise<ServiceResult<null>> {
  const query = getClient().from(TABLES.empresas).delete().eq('id', id).select().maybeSingle();
  const result = await toServiceResult(query);
  if (!result.ok) {
    return result;
  }
  return { ok: true, data: null };
}

/** `empresas.slug` es `UNIQUE` (`empresas_slug_key`) -- acceso tipado directo. */
async function getBySlug(slug: string): Promise<ServiceResult<TableRow<'empresas'> | null>> {
  const query = getClient().from(TABLES.empresas).select('*').eq('slug', slug).maybeSingle();
  return toServiceResult(query);
}

export const empresasRepository: Repository<'empresas'> & {
  getBySlug: typeof getBySlug;
} = {
  getAll,
  getById,
  create,
  update,
  remove,
  getBySlug,
};
