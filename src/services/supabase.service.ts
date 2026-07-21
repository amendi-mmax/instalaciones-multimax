/**
 * supabase.service.ts — servicio base de la capa Supabase (Sprint 4.1.1,
 * Fase 4). Punto único de acceso al cliente y a la normalización de
 * errores para el resto de los servicios/repositorios -- ninguno de ellos
 * debe llamar a `getSupabaseClient()` directamente ni interpretar
 * `PostgrestError` por su cuenta.
 *
 * Sin lógica de negocio (Fase 4: "todos los servicios deberán ser
 * reutilizables"): no sabe nada de trabajos/ofertas/instaladores, solo de
 * "cómo hablarle a Supabase de forma consistente".
 */
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.generated';

import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Forma normalizada de error que devuelven los servicios/repositorios de
 * esta capa -- independiente de si el error vino de Postgrest, de una
 * llamada RPC, o de una excepción de red genérica.
 */
export interface HandymaxServiceError {
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
  cause: unknown;
}

export function normalizeSupabaseError(error: unknown): HandymaxServiceError {
  const postgrestError = error as Partial<PostgrestError> | null;

  if (postgrestError && typeof postgrestError === 'object' && 'message' in postgrestError) {
    return {
      message: postgrestError.message ?? 'Error desconocido de Supabase',
      code: postgrestError.code ?? null,
      details: postgrestError.details ?? null,
      hint: postgrestError.hint ?? null,
      cause: error,
    };
  }

  if (error instanceof Error) {
    return { message: error.message, code: null, details: null, hint: null, cause: error };
  }

  return { message: 'Error desconocido', code: null, details: null, hint: null, cause: error };
}

/**
 * Resultado genérico "a la Rust/Go" (ok/error explícito) usado en toda esta
 * capa, en vez de dejar que las excepciones se propaguen sin tipar --
 * fuerza a quien consuma un servicio/repositorio a manejar el caso de error
 * explícitamente.
 */
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: HandymaxServiceError };

export async function toServiceResult<T>(
  promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
): Promise<ServiceResult<T>> {
  const { data, error } = await promise;
  if (error) {
    return { ok: false, error: normalizeSupabaseError(error) };
  }
  // `data` puede ser `null` en selects sin resultados -- se delega al
  // llamador decidir si eso es un error de negocio o un resultado válido
  // (p. ej. "no encontrado"); este servicio base no asume ninguna regla.
  return { ok: true, data: data as T };
}

/**
 * Acceso centralizado al cliente tipado -- el resto de servicios/
 * repositorios lo obtienen de acá, no de `@/lib/supabase/client`
 * directamente, para que este archivo sea el único punto de cambio si en
 * el futuro se necesita instrumentar todas las llamadas (logging, tracing).
 */
export function getClient(): SupabaseClient<Database> {
  return getSupabaseClient();
}
