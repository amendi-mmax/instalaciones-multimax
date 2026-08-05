import { useContext } from 'react';

import { UserContext, type UserContextValue } from '@/contexts/user.context';

/**
 * useUserContext — hook público de `UserContext` (Sprint 7.3.1). Mismo
 * patrón que `useAuth()`/`useSession()`: lee el `Context` crudo (`@/
 * contexts/user.context.ts`) y lanza si se usa fuera de `<UserProvider>`
 * (montado en `AppProviders.tsx`, envolviendo toda la aplicación).
 *
 * Único punto de entrada real para las 3 pantallas de "Mi cuenta"
 * (`ProfilePage`/`SettingsPage`/`ChangePasswordPage`) y para
 * `HeaderUserMenu` -- ninguno de los 4 debe volver a llamar `useAuth()`/
 * `useUserPreferences()` por separado para los datos que este hook ya
 * expone (Regla explícita del brief: "no repetir consultas").
 */
export function useUserContext(): UserContextValue {
  const value = useContext(UserContext);
  if (!value) {
    throw new Error(
      '[handymax] useUserContext() se usó fuera de un <UserProvider>. ' +
        'Envolvé el árbol de componentes con <UserProvider> (ver src/providers/AppProviders.tsx).',
    );
  }
  return value;
}
