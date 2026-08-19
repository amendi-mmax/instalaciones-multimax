/**
 * admin-operations.service.ts — único punto de invocación de la Edge
 * Function `admin-operations` (Sprint 6.2). Ninguna consulta SQL directa:
 * toda operación administrativa (invitar/suspender/reactivar instalador)
 * pasa por `supabase.functions.invoke('admin-operations', ...)`, nunca por
 * `.from(...)` — esa responsabilidad es exclusiva de los repositorios
 * (`instaladores.repository.ts`, solo lectura para este módulo).
 *
 * Reutiliza `getClient()`/`ServiceResult`/`normalizeSupabaseError`/
 * `HandymaxServiceError` de `supabase.service.ts` — no se crea ningún
 * sistema de errores nuevo.
 *
 * Nota sobre `functions.invoke()` (primer consumidor de este método en el
 * proyecto): a diferencia de `PostgrestError`, el SDK de Supabase NO
 * parsea automáticamente el body JSON de una respuesta no-2xx — para un
 * error de negocio de esta Edge Function (`{ ok: false, error }`, siempre
 * con status >= 400) el SDK devuelve `error: FunctionsHttpError` con
 * `data: null`, y el body real solo es accesible vía
 * `error.context.json()` (`context` es el `Response` crudo). Por eso este
 * archivo lee `error.context` explícitamente en vez de asumir que
 * `normalizeSupabaseError(error)` ya contiene el mensaje real.
 *
 * `businessError()` traduce el mensaje (Issue 2, estabilización Sprint 6.2)
 * porque la Edge Function a veces reenvía tal cual un mensaje de Supabase
 * Auth sin traducir (p. ej. `inviteError.message` de
 * `auth.admin.inviteUserByEmail`, "A user with this email address has
 * already been registered") -- se traduce acá, del lado del cliente, sin
 * tocar el código de la Edge Function ya desplegada.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';

import type { TableRow } from '@/services/database.service';
import {
  getClient,
  normalizeSupabaseError,
  translateSupabaseErrorMessage,
  type HandymaxServiceError,
  type ServiceResult,
} from '@/services/supabase.service';
import type {
  AdminOperationResponse,
  InviteAdminPayload,
  InviteInstaladorPayload,
  ReactivateInstaladorPayload,
  SetAdminActivoPayload,
  SuspendInstaladorPayload,
} from '@/types/admin-operations';

type InstaladorRow = TableRow<'instaladores'>;
type AdminRow = TableRow<'admins'>;

function businessError(message: string, rollback?: string): HandymaxServiceError {
  return {
    message: translateSupabaseErrorMessage(message),
    code: null,
    details: rollback ?? message,
    hint: null,
    cause: null,
  };
}

async function invokeAdminOperation<T>(
  action:
    | 'invite_instalador'
    | 'suspend_instalador'
    | 'reactivate_instalador'
    | 'invite_admin'
    | 'set_admin_activo',
  payload: unknown,
): Promise<ServiceResult<T>> {
  const { data, error } = await getClient().functions.invoke('admin-operations', {
    body: { action, payload },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const body = (await error.context.json()) as AdminOperationResponse<T>;
        if (!body.ok) {
          return { ok: false, error: businessError(body.error.message, body.error.rollback) };
        }
        // Respuesta 2xx con `ok:false` no ocurre en el contrato real, pero
        // si el body sí trae `data`, se prioriza sobre reportar un error.
        return { ok: true, data: body.data };
      } catch {
        // El body no era el JSON esperado (p. ej. error de red disfrazado
        // de HTTP) -- se cae al `normalizeSupabaseError` genérico de abajo.
      }
    }
    return { ok: false, error: normalizeSupabaseError(error) };
  }

  const body = data as AdminOperationResponse<T>;
  if (!body.ok) {
    return { ok: false, error: businessError(body.error.message, body.error.rollback) };
  }
  return { ok: true, data: body.data };
}

export async function inviteInstalador(
  payload: InviteInstaladorPayload,
): Promise<ServiceResult<InstaladorRow>> {
  return invokeAdminOperation<InstaladorRow>('invite_instalador', payload);
}

export async function suspendInstalador(
  payload: SuspendInstaladorPayload,
): Promise<ServiceResult<InstaladorRow>> {
  return invokeAdminOperation<InstaladorRow>('suspend_instalador', payload);
}

export async function reactivateInstalador(
  payload: ReactivateInstaladorPayload,
): Promise<ServiceResult<InstaladorRow>> {
  return invokeAdminOperation<InstaladorRow>('reactivate_instalador', payload);
}

/**
 * Sprint B -- `invite_admin`, ya desplegada (Edge Function versión 7).
 * Mismo criterio que `inviteInstalador`: el caller nunca controla
 * `empresa_id`/`es_principal`/`activo` (ver JSDoc de `InviteAdminPayload`) --
 * la Edge Function los fuerza server-side y rechaza con `403` si quien
 * invoca no es el Administrador Principal activo de su empresa.
 */
export async function inviteAdmin(payload: InviteAdminPayload): Promise<ServiceResult<AdminRow>> {
  return invokeAdminOperation<AdminRow>('invite_admin', payload);
}

/**
 * Sprint B -- `set_admin_activo`, ya desplegada. Rechaza con `403` si el
 * caller no es Principal activo, si el target no pertenece a su empresa, o
 * si el target es el propio Administrador Principal (ver JSDoc de la
 * acción en `admin-operations/index.ts`).
 */
export async function setAdminActivo(payload: SetAdminActivoPayload): Promise<ServiceResult<AdminRow>> {
  return invokeAdminOperation<AdminRow>('set_admin_activo', payload);
}

export const adminOperationsService = {
  inviteInstalador,
  suspendInstalador,
  reactivateInstalador,
  inviteAdmin,
  setAdminActivo,
};
