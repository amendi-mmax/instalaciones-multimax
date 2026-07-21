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
