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

/**
 * Traducciones por código de error de Postgres/PostgREST -- más confiable
 * que el texto (el código no cambia entre versiones/idiomas del mensaje
 * original). Ver https://www.postgresql.org/docs/current/errcodes-appendix.html
 * para los códigos de Postgres; `42501`/`PGRST*` son de PostgREST.
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  '23505': 'Ya existe un registro con estos datos.',
  '23503': 'No se puede completar la operación porque hace referencia a un registro que no existe.',
  '23502': 'Faltan datos obligatorios.',
  '42501': 'No tenés permisos para realizar esta acción.',
  PGRST301: 'Tu sesión expiró. Iniciá sesión nuevamente.',
};

/**
 * Traducciones por coincidencia de texto (case-insensitive, substring) --
 * para errores de Supabase Auth y de red que no traen un código utilizable.
 * Se evalúan en orden; la primera coincidencia gana.
 */
const ERROR_MESSAGE_TRANSLATIONS: Array<[RegExp, string]> = [
  [/user with this email address has already been registered/i, 'Ya existe un usuario registrado con este correo electrónico.'],
  [/user already registered/i, 'Ya existe un usuario registrado con este correo electrónico.'],
  [/invalid login credentials/i, 'Las credenciales ingresadas son incorrectas.'],
  [/email not confirmed/i, 'Tu correo todavía no fue confirmado. Revisá tu bandeja de entrada.'],
  [/user not found/i, 'No se encontró el usuario.'],
  [/password should be at least/i, 'La contraseña es demasiado corta.'],
  [/unable to validate email address/i, 'El formato del correo electrónico no es válido.'],
  [/token has expired or is invalid/i, 'El enlace expiró o no es válido. Solicitá uno nuevo.'],
  [/email rate limit exceeded/i, 'Se enviaron demasiados correos en poco tiempo. Esperá unos minutos e intentá de nuevo.'],
  [/for security purposes, you can only request this after/i, 'Por seguridad, esperá unos segundos antes de volver a intentarlo.'],
  [/jwt expired/i, 'Tu sesión expiró. Iniciá sesión nuevamente.'],
  [/permission denied/i, 'No tenés permisos para realizar esta acción.'],
  [/failed to fetch/i, 'No se pudo conectar con el servidor. Verificá tu conexión a internet.'],
  [/network ?error/i, 'No se pudo conectar con el servidor. Verificá tu conexión a internet.'],
];

/**
 * Traduce al español un mensaje de error proveniente de Supabase (Auth,
 * PostgREST, Supabase JS) o de la Edge Function `admin-operations` (que a
 * veces reenvía tal cual un mensaje de Supabase Auth, p. ej. al invitar un
 * correo ya registrado) -- Issue 2 de la estabilización del Sprint 6.2.
 *
 * No traduce el idioma interno de Supabase (nada se reconfigura del lado
 * del servidor): esto solo reescribe el texto ya recibido, en el cliente,
 * antes de mostrarlo. Si no hay coincidencia conocida, devuelve un mensaje
 * genérico en español -- nunca se muestra el texto en inglés sin traducir.
 */
export function translateSupabaseErrorMessage(message: string, code?: string | null): string {
  if (code && ERROR_CODE_MESSAGES[code]) {
    return ERROR_CODE_MESSAGES[code];
  }
  const match = ERROR_MESSAGE_TRANSLATIONS.find(([pattern]) => pattern.test(message));
  if (match) {
    return match[1];
  }
  return 'Ocurrió un error inesperado. Intentá de nuevo.';
}

export function normalizeSupabaseError(error: unknown): HandymaxServiceError {
  const postgrestError = error as Partial<PostgrestError> | null;

  if (postgrestError && typeof postgrestError === 'object' && 'message' in postgrestError) {
    const originalMessage = postgrestError.message ?? 'Error desconocido de Supabase';
    return {
      message: translateSupabaseErrorMessage(originalMessage, postgrestError.code ?? null),
      code: postgrestError.code ?? null,
      details: postgrestError.details ?? originalMessage,
      hint: postgrestError.hint ?? null,
      cause: error,
    };
  }

  if (error instanceof Error) {
    return {
      message: translateSupabaseErrorMessage(error.message),
      code: null,
      details: error.message,
      hint: null,
      cause: error,
    };
  }

  return { message: 'Ocurrió un error inesperado. Intentá de nuevo.', code: null, details: null, hint: null, cause: error };
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
