/**
 * trabajo-extras.repository.ts — acceso tipado a la tabla real
 * `trabajo_extras` y al bucket de Storage `trabajo-extras` (Sprint "Costos
 * adicionales" -- `supabase/migrations/0026_trabajo_extras.sql`). Primer
 * repositorio de este proyecto que combina Postgres + Storage.
 *
 * **A diferencia de los demás repositorios de este archivo, este NO
 * implementa `create`/`update`** (mismo criterio ya documentado en
 * `ofertas.repository.ts`/`trabajos.repository.ts` para `submit_bid`/
 * `asignar_instalador`: una regla de negocio que combina validación +
 * escritura no es "acceso tipado a una tabla"). La creación de una
 * solicitud ocurre exclusivamente vía `callSolicitarCostoExtra()`
 * (`services/database.service.ts`, RPC `SECURITY DEFINER`); la revisión
 * (aprobar/rechazar) exclusivamente vía `callRevisarCostoExtra()` (RPC
 * `SECURITY INVOKER`) -- ninguna de las dos transiciones debe ejecutarse
 * como un `UPDATE`/`INSERT` de tabla suelto desde un componente.
 */
import { getClient, toServiceResult, type ServiceResult } from '@/services/supabase.service';
import type { TableRow } from '@/services/database.service';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/config';

async function getAll(): Promise<ServiceResult<TableRow<'trabajo_extras'>[]>> {
  const query = getClient().from(TABLES.trabajoExtras).select('*').order('created_at', { ascending: false });
  return toServiceResult(query);
}

async function getByTrabajoId(trabajoId: string): Promise<ServiceResult<TableRow<'trabajo_extras'>[]>> {
  const query = getClient()
    .from(TABLES.trabajoExtras)
    .select('*')
    .eq('trabajo_id', trabajoId)
    .order('created_at', { ascending: false });
  return toServiceResult(query);
}

/**
 * Variante en lote de `getByTrabajoId()` -- evita N+1 cuando se necesita
 * saber, para una lista de trabajos, cuáles tienen algún extra (p. ej.
 * "Mis trabajos" del instalador, marcando qué trabajos tienen una
 * solicitud pendiente que bloquea "Marcar como completado").
 */
async function getByTrabajoIds(trabajoIds: string[]): Promise<ServiceResult<TableRow<'trabajo_extras'>[]>> {
  if (trabajoIds.length === 0) {
    return { ok: true, data: [] };
  }
  const query = getClient().from(TABLES.trabajoExtras).select('*').in('trabajo_id', trabajoIds);
  return toServiceResult(query);
}

/**
 * Sube una fotografía de evidencia al bucket privado `trabajo-extras`,
 * bajo la ruta `"<trabajoId>/<extraId>/<archivo>"` -- la misma convención
 * validada por las policies de `storage.objects` (migración `0026`), que
 * comprueban `instalador_asignado_id = auth.uid()` sobre `trabajos`
 * directamente (la fila de `trabajo_extras` todavía no existe en este
 * punto -- las fotos se suben ANTES de invocar `solicitar_costo_extra()`,
 * usando un `extraId` generado en el cliente). Devuelve la ruta guardada
 * (no una URL -- el bucket es privado, cualquier URL debe generarse bajo
 * demanda vía `getFotoSignedUrl()`).
 */
async function uploadFoto(
  trabajoId: string,
  extraId: string,
  file: File,
): Promise<ServiceResult<string>> {
  const extension = file.name.split('.').pop() ?? 'jpg';
  const path = `${trabajoId}/${extraId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await getClient()
    .storage.from(STORAGE_BUCKETS.trabajoExtras)
    .upload(path, file, { contentType: file.type });
  if (error) {
    return { ok: false, error: { message: error.message, code: null, details: error.message, hint: null, cause: error } };
  }
  return { ok: true, data: path };
}

/**
 * URL firmada de una fotografía ya subida (bucket privado -- nunca
 * accesible por URL pública). `expiresInSeconds` por defecto: 5 minutos,
 * suficiente para que la imagen cargue en la UI sin dejar una URL válida
 * indefinidamente.
 */
async function getFotoSignedUrl(path: string, expiresInSeconds = 300): Promise<ServiceResult<string>> {
  const { data, error } = await getClient()
    .storage.from(STORAGE_BUCKETS.trabajoExtras)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    return {
      ok: false,
      error: { message: error?.message ?? 'No se pudo generar el enlace de la foto.', code: null, details: null, hint: null, cause: error },
    };
  }
  return { ok: true, data: data.signedUrl };
}

export const trabajoExtrasRepository = {
  getAll,
  getByTrabajoId,
  getByTrabajoIds,
  uploadFoto,
  getFotoSignedUrl,
};
