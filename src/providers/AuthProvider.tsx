import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  signInWithPassword,
  signOut,
  refreshSession as refreshSessionService,
  resetPasswordForEmail,
  type SignInWithPasswordParams,
} from '@/services/auth.service';
import { resolveProfile } from '@/services/profile.service';
import type { Perfil } from '@/types/perfil';
import { SessionProvider } from '@/providers/SessionProvider';
import { SessionContext } from '@/providers/session.context';
import { AuthContext, type AuthActionResult } from '@/providers/auth.context';

/**
 * AuthProvider — sesión + perfil real de negocio (Sprint 4.2.1, "Sistema de
 * Autenticación y Experiencia de Inicio de Sesión").
 *
 * Hasta el Sprint 4.1.1C este Provider era deliberadamente genérico ("sin
 * lógica de negocio", sin resolver rol -- ver el JSDoc histórico que este
 * Sprint reemplaza). Este Sprint construye esa resolución *sobre* la misma
 * base (`SessionProvider` sigue intacto, sin cambios) en vez de reescribirla
 * desde cero, tal como esos JSDoc anticipaban.
 *
 * Responsabilidades nuevas de este Sprint:
 * 1. Cuando `session.user` cambia, resolver `profile` real vía
 *    `resolveProfile()` (`admins`/`coordinadores`/`instaladores`) -- ver
 *    `services/profile.service.ts` para la estrategia completa y su
 *    limitación de RLS conocida.
 * 2. Exponer `login`/`logout`/`resetPassword`/`refreshSession` (nombres
 *    pedidos explícitamente por el brief de este Sprint para la superficie
 *    de `AuthProvider`) -- internamente delegan en `auth.service.ts`
 *    (`signInWithPassword`/`signOut`/`resetPasswordForEmail`/
 *    `refreshSession`), sin duplicar esa lógica.
 *
 * `Inner` sigue leyendo `SessionContext` directamente (no el hook público
 * `useSession`) para que `providers/` no dependa de `hooks/` -- mismo
 * criterio ya establecido en Sprint 4.1.1C.
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
  const currentUserId = session?.user?.id ?? null;

  // `profileState.userId` registra para qué usuario es válido
  // `profileState.profile` -- ver más abajo por qué `profileLoading`/
  // `profile` se DERIVAN de esta comparación en vez de mantenerse en su
  // propio `useState` actualizado solo dentro del `useEffect`.
  const [profileState, setProfileState] = useState<{ userId: string | null; profile: Perfil | null }>({
    userId: null,
    profile: null,
  });

  /**
   * `profileLoading`/`profile` se calculan en el render, no en el
   * `useEffect` de abajo -- evita una condición de carrera real: si
   * `profileLoading` fuera únicamente un `useState` seteado a `true` DENTRO
   * del `useEffect`, existiría un primer render (el que monta este
   * Provider/sus consumidores apenas `session.user` deja de ser `null`) en
   * el que `profileLoading` todavía sería `false` y `profile` todavía
   * `null` -- exactamente la misma forma que "perfil no encontrado", que
   * `RootLayout` interpreta como señal para cerrar sesión y redirigir. Al
   * derivar ambos valores comparando `profileState.userId` contra
   * `currentUserId` en cada render, `profileLoading` pasa a ser `true` en
   * el MISMO render en que aparece un `currentUserId` nuevo, sin esperar a
   * que el efecto se dispare.
   */
  const profileLoading = currentUserId !== null && profileState.userId !== currentUserId;
  const profile = profileState.userId === currentUserId ? profileState.profile : null;

  useEffect(() => {
    let active = true;

    if (!currentUserId) {
      setProfileState({ userId: null, profile: null });
      return;
    }
    if (profileState.userId === currentUserId) {
      // Ya resuelto para este usuario -- evita re-consultar en cada render.
      return;
    }

    resolveProfile(currentUserId, session?.user?.email ?? null)
      .then((result) => {
        if (!active) return;
        // `ok:false` cubre tanto un error real de Supabase como
        // "PROFILE_NOT_FOUND" (ver profile.service.ts) -- en ambos casos
        // `profile` queda en `null`, nunca en un valor adivinado. El
        // consumidor (`RootLayout`) es responsable de mostrar el estado
        // correspondiente, no este Provider (sin lógica de negocio de UI acá).
        setProfileState({ userId: currentUserId, profile: result.ok ? result.data : null });
      })
      .catch(() => {
        if (active) {
          setProfileState({ userId: currentUserId, profile: null });
        }
      });

    return () => {
      active = false;
    };
    // Solo se re-resuelve cuando cambia el usuario autenticado (por id), no
    // en cada nuevo objeto `session` (p. ej. un refresh de token no cambia
    // de usuario y no necesita volver a consultar el perfil).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const login = useCallback(async (params: SignInWithPasswordParams): Promise<AuthActionResult> => {
    const result = await signInWithPassword(params);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    // No se actualiza `session`/`profile` acá manualmente: `SessionProvider`
    // ya está suscripto a `onAuthStateChange` y reaccionará solo al evento
    // `SIGNED_IN`, que dispara el `useEffect` de arriba -- evita mantener
    // dos fuentes de verdad de la sesión.
    return { ok: true };
  }, []);

  const logout = useCallback(async (): Promise<AuthActionResult> => {
    const result = await signOut();
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true };
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthActionResult> => {
    const result = await resetPasswordForEmail(email);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true };
  }, []);

  const refreshSession = useCallback(async (): Promise<AuthActionResult> => {
    const result = await refreshSessionService();
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileLoading,
      login,
      logout,
      resetPassword,
      refreshSession,
    }),
    [session, profile, loading, profileLoading, login, logout, resetPassword, refreshSession],
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
