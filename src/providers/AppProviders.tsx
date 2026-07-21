import type { ReactNode } from 'react';

import { SupabaseProvider } from '@/providers/SupabaseProvider';
import { AuthProvider } from '@/providers/AuthProvider';

/**
 * AppProviders — composición recomendada de los 3 Providers de esta capa,
 * en el orden correcto (Sprint 4.1.1, Fase 3):
 *
 *   <SupabaseProvider>       -- expone el cliente (useSupabase)
 *     <AuthProvider>         -- envuelve SessionProvider por dentro
 *       {children}           -- useAuth()/useSession()/useSupabase() disponibles
 *     </AuthProvider>
 *   </SupabaseProvider>
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
      <AuthProvider>{children}</AuthProvider>
    </SupabaseProvider>
  );
}
