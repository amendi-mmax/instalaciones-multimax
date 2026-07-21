import { useContext } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.generated';

import { SupabaseContext } from '@/providers/supabase.context';

/**
 * useSupabase — hook público de acceso al cliente Supabase (Sprint 4.1.1,
 * Fase 5). Requiere un `<SupabaseProvider>` (o `<AuthProvider>`, que lo
 * envuelve indirectamente vía `SessionProvider` -- ver
 * `docs/`/`ARCHITECTURE.md` para el árbol de Providers recomendado) más
 * arriba en el árbol de componentes.
 *
 * Sin lógica específica todavía (Fase 5: "Aún sin lógica específica") --
 * es un pasamanos delgado sobre el Context, para que componentes no
 * importen el objeto `Context` (interno de `providers/`) directamente.
 *
 * Desde Sprint 4.1.1C (problema #5): antes este hook delegaba en
 * `useSupabaseContext()`, que vivía dentro de `SupabaseProvider.tsx` (un
 * `.tsx`). Se movió la lógica de `useContext` + chequeo de `null`
 * directamente acá, y el objeto `Context` en sí a `supabase.context.ts`,
 * para que `SupabaseProvider.tsx` deje de exportar un hook además del
 * componente (causa de la advertencia ESLint
 * `react-refresh/only-export-components` -- ver `supabase.context.ts`).
 */
export function useSupabase(): SupabaseClient<Database> {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error(
      '[handymax] useSupabase() se usó fuera de un <SupabaseProvider>. ' +
        'Envolvé el árbol de componentes con <SupabaseProvider> (ver src/providers/index.ts).',
    );
  }
  return client;
}
