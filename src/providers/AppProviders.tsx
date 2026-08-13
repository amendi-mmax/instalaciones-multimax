import type { ReactNode } from 'react';

import { SupabaseProvider } from '@/providers/SupabaseProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { UserProvider } from '@/contexts/UserContext';

/**
 * AppProviders — composición recomendada de los 3 Providers de esta capa,
 * en el orden correcto (Sprint 4.1.1, Fase 3):
 *
 *   <SupabaseProvider>       -- expone el cliente (useSupabase)
 *     <AuthProvider>         -- envuelve SessionProvider por dentro
 *       <UserProvider>       -- Sprint 7.3.1, ver su propio JSDoc
 *         {children}         -- useAuth()/useSession()/useSupabase()/useUserContext() disponibles
 *       </UserProvider>
 *     </AuthProvider>
 *   </SupabaseProvider>
 *
 * **`UserProvider` (Sprint 7.3.1, Módulo de Cuenta de Usuario)** -- se
 * monta acá, DENTRO de `<AuthProvider>` (necesita `useAuth()`) y
 * envolviendo la app ENTERA, no solo el módulo de Cuenta -- ver el JSDoc
 * completo de `UserContext.tsx` para por qué (resumen: `HeaderUserMenu`,
 * montado por `RootLayout.tsx`/`CoordinatorLayout.tsx`, ambos archivos
 * restringidos en ese Sprint, también necesita `useUserContext()`; la
 * única forma de lograrlo sin tocar esos 2 archivos es montar el Provider
 * más arriba en el árbol, acá). No implementa ninguna lógica de Auth --
 * solo compone/deriva sobre `useAuth()`, sin queries nuevas.
 *
 * **No se monta todavía en `src/App.tsx`** -- este Sprint (4.1.1, Fase A)
 * no modifica la UI ni desarrolla pantallas nuevas ("NO modifica la UI"),
 * así que esta composición queda lista para que un Sprint futuro la monte
 * explícitamente alrededor de `<AppRouter />` (o donde corresponda), una
 * vez que: (a) exista `database.generated.ts` (Fase B) y (b) se haya
 * confirmado la decisión de arquitectura de sesión pendiente
 * (`docs/frontend/FRONTEND_SYNC_PLAN.md`, Fase 1/Fase 3).
 *
 * Se exporta igual, ya en este Sprint, porque Fase 1 pide "toda la
 * configuración debe quedar centralizada" -- este componente es esa
 * centralización para el árbol de Providers, aunque nadie lo use todavía.
 */
export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <UserProvider>{children}</UserProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
}
