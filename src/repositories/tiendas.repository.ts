/**
 * tiendas.repository.ts — acceso tipado a la tabla real `tiendas` (Sprint
 * 4.1.1, Fase 6; rediseñado en Sprint 4.1.1C -- ver `base.repository.ts`).
 * Ver `docs/database/DATABASE_INVENTORY.md` §2.2.
 *
 * Reemplaza conceptualmente al `sucursales` del modelo legacy -- ver
 * `docs/database/DATABASE_DIFF.md`, tabla "Mapeo Legacy → Producción" en
 * `docs/frontend/FRONTEND_DIFF.md`.
 *
 * Nota heredada de la auditoría: `tiendas` tiene RLS habilitado sin
 * policies propias.
 */
import type { Repository } from '@/repositories/base.repository';
import { getClient, toServiceResult, type ServiceResult } from '@/services/supabase.service';
import type { TableInsert, TableRow, TableUpdate } from '@/services/database.service';
import { TABLES } from '@/lib/supabase/config';

async function getAll(): Promise<ServiceResult<TableRow<'tiendas'>[]>> {
  const query = getClient().from(TABLES.tiendas).select('*');
  return toServiceResult(query);
}

async function getById(id: string): Promise<ServiceResult<TableRow<'tiendas'> | null>> {
  const query = getClient().from(TABLES.tiendas).select('*').eq('id', id).maybeSingle();
  return toServiceResult(query);
}

async function create(row: TableInsert<'tiendas'>): Promise<ServiceResult<TableRow<'tiendas'>>> {
  const query = getClient().from(TABLES.tiendas).insert(row).select().single();
  return toServiceResult(query);
}

async function update(id: string, patch: TableUpdate<'tiendas'>): Promise<ServiceResult<TableRow<'tiendas'>>> {
  const query = getClient().from(TABLES.tiendas).update(patch).eq('id', id).select().single();
  return toServiceResult(query);
}

async function remove(id: string): Promise<ServiceResult<null>> {
  const query = getClient().from(TABLES.tiendas).delete().eq('id', id).select().maybeSingle();
  const result = await toServiceResult(query);
  if (!result.ok) {
    return result;
  }
  return { ok: true, data: null };
}

async function getByEmpresaId(empresaId: string): Promise<ServiceResult<TableRow<'tiendas'>[]>> {
  const query = getClient().from(TABLES.tiendas).select('*').eq('empresa_id', empresaId);
  return toServiceResult(query);
}

export const tiendasRepository: Repository<'tiendas'> & {
  getByEmpresaId: typeof getByEmpresaId;
} = {
  getAll,
  getById,
  create,
  update,
  remove,
  getByEmpresaId,
};
