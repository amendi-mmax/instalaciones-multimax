/**
 * auth.service.ts — acciones genéricas de Supabase Auth (Sprint 4.1.1,
 * Fase 4). Envuelve `supabase.auth.*` con la forma de resultado normalizada
 * de `supabase.service.ts` -- no decide roles, no consulta
 * `admins`/`coordinadores`/`instaladores`, no redirige ni asume ninguna
 * pantalla. Esa lógica (determinar el rol real de la sesión, redirigir
 * según tabla) es de un Sprint funcional futuro -- ver
 * `docs/frontend/FRONTEND_SYNC_PLAN.md` Fase 3.
 */
import type { Session, User } from '@supabase/supabase-js';

import { getClient, normalizeSupabaseError, type HandymaxServiceError } from '@/services/supabase.service';

export interface SignInWithPasswordParams {
  email: string;
  password: string;
}

export async function signInWithPassword(
  params: SignInWithPasswordParams,
): Promise<{ ok: true; session: Session | null; user: User | null } | { ok: false; error: HandymaxServiceError }> {
  const { data, error } = await getClient().auth.signInWithPassword(params);
  if (error) {
    return { ok: false, error: normalizeSupabaseError(error) };
  }
  return { ok: true, session: data.session, user: data.user };
}

export async function signOut(): Promise<{ ok: true } | { ok: false; error: HandymaxServiceError }> {
  const { error } = await getClient().auth.signOut();
  if (error) {
    return { ok: false, error: normalizeSupabaseError(error) };
  }
  return { ok: true };
}

export async function getCurrentSession(): Promise<
  { ok: true; session: Session | null } | { ok: false; error: HandymaxServiceError }
> {
  const { data, error } = await getClient().auth.getSession();
  if (error) {
    return { ok: false, error: normalizeSupabaseError(error) };
  }
  return { ok: true, session: data.session };
}

export async function getCurrentUser(): Promise<
  { ok: true; user: User | null } | { ok: false; error: HandymaxServiceError }
> {
  const { data, error } = await getClient().auth.getUser();
  if (error) {
    return { ok: false, error: normalizeSupabaseError(error) };
  }
  return { ok: true, user: data.user };
}

/**
 * Suscribe un callback a los cambios de sesión de Supabase Auth. Devuelve
 * la función de `unsubscribe` directamente (no un objeto envoltorio), para
 * que quien lo use pueda pasarla tal cual a la limpieza de un `useEffect`.
 * Sin lógica de negocio: no interpreta el `AuthChangeEvent`, solo reenvía
 * `session` al callback -- eso lo hace `SessionProvider`.
 */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const {
    data: { subscription },
  } = getClient().auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
}

/**
 * Fuerza un refresco del token de la sesión actual (Sprint 4.2.1). Envuelve
 * `supabase.auth.refreshSession()` tal cual -- Supabase ya refresca el token
 * automáticamente en segundo plano (`SUPABASE_CLIENT_OPTIONS.auth.
 * autoRefreshToken`, `src/lib/supabase/config.ts`); esta función existe para
 * el caso explícito en que `AuthProvider` necesite forzarlo (p. ej. tras
 * detectar un error 401 en una llamada de datos).
 */
export async function refreshSession(): Promise<
  { ok: true; session: Session | null; user: User | null } | { ok: false; error: HandymaxServiceError }
> {
  const { data, error } = await getClient().auth.refreshSession();
  if (error) {
    return { ok: false, error: normalizeSupabaseError(error) };
  }
  return { ok: true, session: data.session, user: data.user };
}

/**
 * Envía el correo de recuperación de contraseña vía
 * `supabase.auth.resetPasswordForEmail()` -- únicamente ese mecanismo, per
 * el brief de este Sprint ("NO el flujo SMTP propio, eso queda para un
 * Sprint futuro de Notificaciones con Amazon SES"). No se pasa `redirectTo`
 * explícito: no existe todavía, en este Sprint, ninguna pantalla de
 * "definir nueva contraseña" a la que redirigir tras el click en el correo
 * (fuera de la lista de entregables pedidos) -- Supabase usa el "Site URL"
 * ya configurado en el Dashboard del proyecto como destino por defecto.
 * Documentado como limitación conocida en `SPRINT_4_2_1_AUTH_REPORT.md`.
 */
export async function resetPasswordForEmail(
  email: string,
): Promise<{ ok: true } | { ok: false; error: HandymaxServiceError }> {
  const { error } = await getClient().auth.resetPasswordForEmail(email);
  if (error) {
    return { ok: false, error: normalizeSupabaseError(error) };
  }
  return { ok: true };
}
