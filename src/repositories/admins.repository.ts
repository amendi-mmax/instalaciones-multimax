/**
 * admins.repository.ts — acceso tipado a la tabla real `admins` (Sprint
 * 4.1.1, Fase 6; rediseñado en Sprint 4.1.1C -- ver `base.repository.ts`).
 * Ver `docs/database/DATABASE_INVENTORY.md` §2.3 para el detalle completo
 * de columnas/FKs/RLS de esta tabla.
 *
 * Las 5 operaciones de `Repository<'admins'>` se implementan directamente
 * acá contra `getClient().from(TABLES.admins)` -- `TABLES.admins` es un
 * literal concreto en este archivo, así que no hay ningún parámetro de tipo
 * genérico entre esta llamada y el tipo real de la tabla (ver
 * `src/services/database.service.ts` para la justificación completa de por
 * qué ya no existe un CRUD genérico compartido).
 *
 * Nota de riesgo heredada de la auditoría de base de datos
 * (`docs/database/DATABASE_DIFF.md`): `admins` tiene RLS habilitado pero
 * **cero policies** -- este repositorio quedará operativo tipográficamente,
 * pero cualquier consulta real fallará (0 filas, no error) para los roles
 * `anon`/`authenticated` hasta que se agreguen policies en un Sprint de
 * backend futuro. No es un bug de este repositorio.
 */
import type { Repository } from '@/repositories/base.repository';
import { getClient, toServiceResult, type ServiceResult } from '@/services/supabase.service';
import type { TableInsert, TableRow, TableUpdate } from '@/services/database.service';
import { TABLES } from '@/lib/supabase/config';

async function getAll(): Promise<ServiceResult<TableRow<'admins'>[]>> {
  const query = getClient().from(TABLES.admins).select('*');
  return toServiceResult(query);
}

async function getById(id: string): Promise<ServiceResult<TableRow<'admins'> | null>> {
  const query = getClient().from(TABLES.admins).select('*').eq('id', id).maybeSingle();
  return toServiceResult(query);
}

async function create(row: TableInsert<'admins'>): Promise<ServiceResult<TableRow<'admins'>>> {
  const query = getClient().from(TABLES.admins).insert(row).select().single();
  return toServiceResult(query);
}

async function update(id: string, patch: TableUpdate<'admins'>): Promise<ServiceResult<TableRow<'admins'>>> {
  const query = getClient().from(TABLES.admins).update(patch).eq('id', id).select().single();
  return toServiceResult(query);
}

async function remove(id: string): Promise<ServiceResult<null>> {
  const query = getClient().from(TABLES.admins).delete().eq('id', id).select().maybeSingle();
  const result = await toServiceResult(query);
  if (!result.ok) {
    return result;
  }
  return { ok: true, data: null };
}

/** Filtra `admins` por `empresa_id` -- acceso tipado, sin regla de negocio. */
async function getByEmpresaId(empresaId: string): Promise<ServiceResult<TableRow<'admins'>[]>> {
  const query = getClient().from(TABLES.admins).select('*').eq('empresa_id', empresaId);
  return toServiceResult(query);
}

export const adminsRepository: Repository<'admins'> & {
  getByEmpresaId: typeof getByEmpresaId;
} = {
  getAll,
  getById,
  create,
  update,
  remove,
  getByEmpresaId,
};
