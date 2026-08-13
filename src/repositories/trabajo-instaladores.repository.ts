/**
 * trabajo-instaladores.repository.ts — acceso tipado a la tabla real
 * `trabajo_instaladores` (Sprint 4.1.1, Fase 6; rediseñado en Sprint 4.1.1C
 * -- ver `base.repository.ts`). Ver `docs/database/DATABASE_INVENTORY.md`
 * §2.7.
 *
 * Sin equivalente 1:1 en el modelo legacy -- reemplaza conceptualmente a
 * `notificaciones` y absorbe parte de lo que antes vivía en `bids.estado`
 * (ver `docs/database/DATABASE_DIFF.md`, "Tablas nuevas").
 *
 * `estado` es `text` libre sin CHECK real (vocabulario observado en el
 * código de `asignar_instalador`/`submit_bid`: `'notificado'`/
 * `'respondido'`/`'seleccionado'`/`'confirmado'`/`'perdido'`, sin garantía
 * de ser exhaustivo) -- mismo criterio que `trabajos.repository.ts`.
 */
import type { Repository } from '@/repositories/base.repository';
import { getClient, toServiceResult, type ServiceResult } from '@/services/supabase.service';
import type { TableInsert, TableRow, TableUpdate } from '@/services/database.service';
import { TABLES } from '@/lib/supabase/config';

async function getAll(): Promise<ServiceResult<TableRow<'trabajo_instaladores'>[]>> {
  const query = getClient().from(TABLES.trabajoInstaladores).select('*');
  return toServiceResult(query);
}

async function getById(id: string): Promise<ServiceResult<TableRow<'trabajo_instaladores'> | null>> {
  const query = getClient().from(TABLES.trabajoInstaladores).select('*').eq('id', id).maybeSingle();
  return toServiceResult(query);
}

async function create(
  row: TableInsert<'trabajo_instaladores'>,
): Promise<ServiceResult<TableRow<'trabajo_instaladores'>>> {
  const query = getClient().from(TABLES.trabajoInstaladores).insert(row).select().single();
  return toServiceResult(query);
}

async function update(
  id: string,
  patch: TableUpdate<'trabajo_instaladores'>,
): Promise<ServiceResult<TableRow<'trabajo_instaladores'>>> {
  const query = getClient().from(TABLES.trabajoInstaladores).update(patch).eq('id', id).select().single();
  return toServiceResult(query);
}

async function remove(id: string): Promise<ServiceResult<null>> {
  const query = getClient().from(TABLES.trabajoInstaladores).delete().eq('id', id).select().maybeSingle();
  const result = await toServiceResult(query);
  if (!result.ok) {
    return result;
  }
  return { ok: true, data: null };
}

async function getByTrabajoId(trabajoId: string): Promise<ServiceResult<TableRow<'trabajo_instaladores'>[]>> {
  const query = getClient().from(TABLES.trabajoInstaladores).select('*').eq('trabajo_id', trabajoId);
  return toServiceResult(query);
}

async function getByInstaladorId(
  instaladorId: string,
): Promise<ServiceResult<TableRow<'trabajo_instaladores'>[]>> {
  const query = getClient().from(TABLES.trabajoInstaladores).select('*').eq('instalador_id', instaladorId);
  return toServiceResult(query);
}

export const trabajoInstaladoresRepository: Repository<'trabajo_instaladores'> & {
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
