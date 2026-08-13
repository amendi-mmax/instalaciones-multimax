/**
 * ofertas.repository.ts — acceso tipado a la tabla real `ofertas` (Sprint
 * 4.1.1, Fase 6; rediseñado en Sprint 4.1.1C -- ver `base.repository.ts`).
 * Ver `docs/database/DATABASE_INVENTORY.md` §2.8.
 *
 * Reemplaza conceptualmente a `bids` del modelo legacy -- sin columna
 * `estado` (a diferencia de `bids.estado`): el estado de una oferta vive en
 * `trabajo_instaladores.estado` (ver `trabajo-instaladores.repository.ts`
 * y `docs/database/DATABASE_DIFF.md`, sección 3.3).
 *
 * No incluye la invocación de `submit_bid` (función RPC real que inserta
 * en `ofertas` y actualiza `trabajo_instaladores` en la misma operación) --
 * eso combina dos tablas bajo una regla de negocio ("enviar una oferta"),
 * fuera del alcance de un repositorio de acceso tipado. Ver
 * `src/services/database.service.ts` → `callSubmitBid` (Sprint 4.1.1B).
 */
import type { Repository } from '@/repositories/base.repository';
import { getClient, toServiceResult, type ServiceResult } from '@/services/supabase.service';
import type { TableInsert, TableRow, TableUpdate } from '@/services/database.service';
import { TABLES } from '@/lib/supabase/config';

async function getAll(): Promise<ServiceResult<TableRow<'ofertas'>[]>> {
  const query = getClient().from(TABLES.ofertas).select('*');
  return toServiceResult(query);
}

async function getById(id: string): Promise<ServiceResult<TableRow<'ofertas'> | null>> {
  const query = getClient().from(TABLES.ofertas).select('*').eq('id', id).maybeSingle();
  return toServiceResult(query);
}

async function create(row: TableInsert<'ofertas'>): Promise<ServiceResult<TableRow<'ofertas'>>> {
  const query = getClient().from(TABLES.ofertas).insert(row).select().single();
  return toServiceResult(query);
}

async function update(id: string, patch: TableUpdate<'ofertas'>): Promise<ServiceResult<TableRow<'ofertas'>>> {
  const query = getClient().from(TABLES.ofertas).update(patch).eq('id', id).select().single();
  return toServiceResult(query);
}

async function remove(id: string): Promise<ServiceResult<null>> {
  const query = getClient().from(TABLES.ofertas).delete().eq('id', id).select().maybeSingle();
  const result = await toServiceResult(query);
  if (!result.ok) {
    return result;
  }
  return { ok: true, data: null };
}

async function getByTrabajoId(trabajoId: string): Promise<ServiceResult<TableRow<'ofertas'>[]>> {
  const query = getClient().from(TABLES.ofertas).select('*').eq('trabajo_id', trabajoId);
  return toServiceResult(query);
}

async function getByInstaladorId(instaladorId: string): Promise<ServiceResult<TableRow<'ofertas'>[]>> {
  const query = getClient().from(TABLES.ofertas).select('*').eq('instalador_id', instaladorId);
  return toServiceResult(query);
}

export const ofertasRepository: Repository<'ofertas'> & {
  getByTrabajoId: typeof getByTrabajoId;
  getByInstaladorId: typeof getByInstaladorId;
} = {
  getAll,
  getById,
  create,
  update,
  remove,
  getByTrabajoId,
  getByInstaladorId,
};
