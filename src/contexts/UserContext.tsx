import { useMemo, type ReactNode } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { getUserSummary } from '@/services/account.service';
import { isAdmin, isCoordinator, isInstaller } from '@/lib/role-helpers';
import { UserContext, type UserContextValue } from '@/contexts/user.context';

/**
 * UserProvider — Sprint 7.3.1 (Refinamiento del Módulo de Cuenta de
 * Usuario). Fuente única de verdad del usuario para todo lo que este
 * módulo necesita mostrar -- "usuario autenticado, rol, empresa, sucursal,
 * permisos, preferencias, avatar, nombre, email" (brief textual). El tipo
 * `UserContextValue` completo, con la justificación de cada campo, vive en
 * `user.context.ts` (separado de este archivo por Fast Refresh -- ver su
 * propio JSDoc); el hook público `useUserContext()` vive en
 * `src/hooks/useUserContext.ts` (mismo criterio).
 *
 * **No es un `AuthProvider` nuevo, no lo reemplaza, no lo modifica**: este
 * Sprint tiene expresamente prohibido tocar "Auth" -- `UserProvider` no
 * hace ninguna llamada a Supabase por su cuenta. Es una capa de
 * COMPOSICIÓN/DERIVACIÓN sobre 2 fuentes que ya existían sin cambios:
 * `useAuth()` (`session`/`user`/`profile`, Sprint 4.1.1/4.2.1) y
 * `useUserPreferences()` (`localStorage`, ahora respaldado por
 * `account.service.ts`, Sprint 7.3/7.3.1). Cero queries nuevas a Supabase
 * -- "No repetir consultas" (Regla explícita del brief).
 *
 * **Dónde se monta**: `AppProviders.tsx`, DENTRO de `<AuthProvider>` (para
 * poder llamar `useAuth()` acá adentro) y envolviendo `{children}` de toda
 * la app -- no dentro de `AccountLayout.tsx` ni de `RootLayout.tsx`. Esto
 * es deliberado: `HeaderUserMenu` (dentro de `Header`, montado tanto por
 * `RootLayout.tsx` como por `CoordinatorLayout.tsx`, ambos archivos
 * restringidos en este Sprint) también necesita `useUserContext()` (Regla
 * del brief, sección 5) -- la única forma de lograrlo sin tocar esos 2
 * archivos es que el Provider ya envuelva TODO el árbol desde más arriba
 * (`App.tsx`/`AppProviders.tsx`), no que cada layout lo monte por separado.
 *
 * **`permisos`**: el schema real no tiene ningún sistema de permisos
 * granular (solo 3 roles fijos, ver `types/enums.ts`) -- inventar
 * permisos individuales sin ninguna regla de negocio real que los
 * respalde violaría "No inventar lógica". Se modela honestamente como los
 * 3 flags derivados del rol (`role-helpers.ts`, ya centralizados ahí) --
 * exactamente la granularidad que el sistema real tiene hoy.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const { session, user, profile, loading, profileLoading } = useAuth();
  const { preferences, setPreference } = useUserPreferences(profile?.id ?? 'anon');

  const value = useMemo<UserContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      profileLoading,
      rol: profile?.rol ?? null,
      nombre: profile?.nombre ?? null,
      email: profile?.correo ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      empresaId: profile?.empresaId ?? null,
      empresaNombre: profile?.empresaNombre ?? null,
      tiendaId: profile?.tiendaId ?? null,
      tiendaNombre: profile?.tiendaNombre ?? null,
      estado: profile?.estado ?? null,
      permisos: {
        esAdmin: isAdmin(profile?.rol),
        esCoordinador: isCoordinator(profile?.rol),
        esInstalador: isInstaller(profile?.rol),
      },
      authUser: getUserSummary(user),
      preferences,
      setPreference,
    }),
    [session, user, profile, loading, profileLoading, preferences, setPreference],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
