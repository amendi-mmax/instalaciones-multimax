import { useContext } from 'react';

import type { Session } from '@supabase/supabase-js';

import { SessionContext } from '@/providers/session.context';

export interface UseSessionResult {
  session: Session | null;
  loading: boolean;
}

/**
 * useSession — hook público de solo-lectura sobre la sesión de Supabase
 * Auth (Sprint 4.1.1, Fase 5). Requiere `<SessionProvider>` (o
 * `<AuthProvider>`/`<AppProviders>`, que lo envuelven) más arriba en el
 * árbol. Sin lógica específica todavía -- ver JSDoc de `SessionProvider.tsx`.
 *
 * Desde Sprint 4.1.1C (problema #5): absorbe acá la lógica que antes vivía
 * en `useSessionContext()` dentro de `SessionProvider.tsx` -- ver
 * `useSupabase.ts`/`supabase.context.ts` para la justificación completa.
 */
export function useSession(): UseSessionResult {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error(
      '[handymax] useSession() se usó fuera de un <SessionProvider>. ' +
        'Envolvé el árbol de componentes con <SessionProvider> (ver src/providers/index.ts).',
    );
  }
  return value;
}
