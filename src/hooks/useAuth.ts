import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from '@/providers/auth.context';

/**
 * useAuth — hook público canónico de autenticación (Sprint 4.1.1, Fase 5;
 * completado con perfil/rol real en Sprint 4.2.1). Requiere `<AuthProvider>`
 * (o `<AppProviders>`) más arriba en el árbol.
 *
 * Desde Sprint 4.2.1: este es el único `useAuth()`/`AuthProvider` de la
 * aplicación -- el `AuthContext`/`AuthProvider`/`useAuth` legacy que existía
 * en `src/contexts/AuthContext.tsx` (placeholder de Fase 3, tipado contra el
 * modelo `usuario`/`rol`/`sucursalId` ya descartado, ver `ARCHITECTURE.md
 * §9.9`) fue retirado y borrado en este mismo Sprint (`App.tsx` ya no lo
 * importa) --
 * ver `docs/architecture/frontend/SPRINT_4_2_1_AUTH_REPORT.md` para la
 * justificación completa de por qué se resuelve así la "arquitectura
 * paralela" señalada en Sprints anteriores, en vez de mantener ambos.
 *
 * Devuelve `session`/`user`/`profile`/`loading`/`profileLoading` +
 * `login`/`logout`/`resetPassword`/`refreshSession` -- ver
 * `providers/auth.context.ts` para la forma completa.
 *
 * Desde Sprint 4.1.1C (problema #5): absorbe acá la lógica que antes vivía
 * en `useAuthContext()` dentro de `AuthProvider.tsx` -- ver
 * `useSupabase.ts`/`supabase.context.ts` para la justificación completa.
 */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error(
      '[handymax] useAuth() se usó fuera de un <AuthProvider>. ' +
        'Envolvé el árbol de componentes con <AuthProvider> (ver src/providers/index.ts).',
    );
  }
  return value;
}
