import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from '@/providers/auth.context';

/**
 * useAuth — hook público de acciones/estado genéricos de autenticación
 * (Sprint 4.1.1, Fase 5). Requiere `<AuthProvider>` (o `<AppProviders>`)
 * más arriba en el árbol.
 *
 * **Aviso de nomenclatura duplicada**: existe otro `useAuth()` en
 * `src/contexts/AuthContext.tsx` (Fase 3 de UI, legacy, no tocado en este
 * Sprint por instrucción explícita -- "NO modificar Auth"). Son dos hooks
 * distintos, en dos módulos distintos, con dos formas de retorno distintas
 * (`AuthContextValue` legacy expone `usuario`/`rol`/`sucursalId`/
 * `isMaster` tipados contra el modelo legacy; este `useAuth` expone
 * `session`/`user`/`signInWithPassword`/`signOut` genéricos de Supabase
 * Auth, sin resolver rol todavía). No importar ambos sin alias explícito
 * en el mismo archivo. Ver `docs/frontend/FRONTEND_SYNC_PLAN.md` Fase 3
 * para el plan de reconciliación futura.
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
