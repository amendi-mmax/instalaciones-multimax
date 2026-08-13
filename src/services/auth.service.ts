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
 * URL a la que Supabase redirige tras el click en el correo de recuperación
 * (o de invitación, ver `admin-operations/index.ts` -- misma regla, otro
 * runtime). Regla arquitectónica permanente (ver `ARCHITECTURE.md` §14.10 /
 * `CLAUDE.md`): ningún flujo de Auth depende exclusivamente del "Site URL"
 * del Dashboard -- se envía `redirectTo` explícito, calculado en runtime con
 * `window.location.origin` (nunca un host hardcodeado), para que el mismo
 * código funcione sin cambios tanto en `localhost:5173` (desarrollo) como en
 * el dominio real de Producción. El Dashboard solo actúa como *allowlist*
 * (Redirect URLs) cuando esté disponible -- no como única fuente del
 * destino.
 */
function buildAuthRedirectTo(): string {
  return `${window.location.origin}/nueva-contrasena`;
}

/**
 * Envía el correo de recuperación de contraseña vía
 * `supabase.auth.resetPasswordForEmail()` -- únicamente ese mecanismo, per
 * el brief del Sprint 4.2.1 ("NO el flujo SMTP propio, eso queda para un
 * Sprint futuro de Notificaciones con Amazon SES"). Pasa `redirectTo`
 * explícito (`buildAuthRedirectTo()`) apuntando a `/nueva-contrasena`
 * (`SetPasswordPage`, Sprint 6.3, ya soporta el caso `type=recovery`) --
 * corrige la limitación documentada originalmente en este mismo Sprint
 * (dependía únicamente del "Site URL" del Dashboard, que en la práctica
 * seguía apuntando a un host/puerto sin nada corriendo).
 */
export async function resetPasswordForEmail(
  email: string,
): Promise<{ ok: true } | { ok: false; error: HandymaxServiceError }> {
  const { error } = await getClient().auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthRedirectTo(),
  });
  if (error) {
    return { ok: false, error: normalizeSupabaseError(error) };
  }
  return { ok: true };
}

/**
 * Define/actualiza la contraseña de la sesión actualmente activa (Sprint
 * 6.3, Onboarding del Instalador) -- envuelve `supabase.auth.updateUser()`.
 * Requiere que ya exista una sesión real: el caso de uso es siempre
 * "el usuario llegó acá con una sesión establecida por un enlace de
 * invitación/recuperación" (`detectSessionInUrl`, ver `SetPasswordPage.tsx`),
 * nunca un cambio de contraseña arbitrario sin sesión.
 */
export async function updatePassword(
  password: string,
): Promise<{ ok: true } | { ok: false; error: HandymaxServiceError }> {
  const { error } = await getClient().auth.updateUser({ password });
  if (error) {
    return { ok: false, error: normalizeSupabaseError(error) };
  }
  return { ok: true };
}
