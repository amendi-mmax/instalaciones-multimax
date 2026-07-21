import { useCallback, useContext, useMemo, type ReactNode } from 'react';

import { signInWithPassword, signOut, type SignInWithPasswordParams } from '@/services/auth.service';
import { SessionProvider } from '@/providers/SessionProvider';
import { SessionContext } from '@/providers/session.context';
import { AuthContext } from '@/providers/auth.context';

/**
 * AuthProvider — acciones genéricas de autenticación sobre la sesión de
 * `SessionProvider` (Sprint 4.1.1, Fase 3).
 *
 * "Sin lógica de negocio": expone `signIn`/`signOut`/`user`/`session`
 * genéricos de Supabase Auth. **No determina rol** (`admin`/`coordinador`/
 * `instalador`) ni consulta las tablas correspondientes -- eso depende de
 * la decisión de arquitectura de sesión todavía pendiente de confirmación
 * explícita del usuario (`docs/frontend/FRONTEND_SYNC_PLAN.md`, Fase 1 y
 * Fase 3, riesgo #1). Cuando esa decisión se tome, un Sprint funcional
 * futuro construye esa resolución de rol *sobre* este Provider, sin
 * necesidad de reescribirlo.
 *
 * Envuelve `SessionProvider` internamente -- quien use `<AuthProvider>` no
 * necesita además envolver `<SessionProvider>` a mano, pero puede seguir
 * usando `useSession()` (Fase 5) directamente si solo necesita la sesión
 * cruda sin las acciones de `AuthProvider`.
 *
 * Desde Sprint 4.1.1C: `AuthContextValue` y el objeto `Context` viven en
 * `auth.context.ts`; este archivo exporta únicamente el componente (+ su
 * tipo de props) -- ver `supabase.context.ts` para el motivo. `Inner` lee
 * `SessionContext` directamente (en vez del hook público `useSession`) para
 * que `providers/` no dependa de `hooks/` -- evita una dependencia
 * circular entre ambas capas.
 */
function AuthProviderInner({ children }: { children: ReactNode }) {
  const sessionValue = useContext(SessionContext);
  if (!sessionValue) {
    throw new Error(
      '[handymax] <AuthProvider> requiere que <SessionProvider> ya esté montado más arriba ' +
        'en el árbol -- esto no debería ocurrir porque AuthProvider envuelve SessionProvider ' +
        'internamente (ver más abajo). Si ves este error, revisá que no se esté usando ' +
        '<AuthProviderInner> fuera de <AuthProvider>.',
    );
  }
  const { session, loading } = sessionValue;

  const handleSignIn = useCallback(async (params: SignInWithPasswordParams) => {
    const result = await signInWithPassword(params);
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    // No se actualiza `session` acá manualmente: `SessionProvider` ya está
    // suscripto a `onAuthStateChange` y reaccionará solo al evento
    // `SIGNED_IN` disparado por `signInWithPassword` -- evita mantener dos
    // fuentes de verdad de la sesión.
    return { ok: true as const };
  }, []);

  const handleSignOut = useCallback(async () => {
    const result = await signOut();
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    return { ok: true as const };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signInWithPassword: handleSignIn,
      signOut: handleSignOut,
    }),
    [session, loading, handleSignIn, handleSignOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}
