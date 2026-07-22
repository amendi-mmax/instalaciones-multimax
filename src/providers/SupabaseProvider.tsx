import { useMemo, type ReactNode } from 'react';

import { getSupabaseClient } from '@/lib/supabase/client';
import { SupabaseContext } from '@/providers/supabase.context';

/**
 * SupabaseProvider — provee el cliente único de Supabase (navegador) al
 * árbol de componentes vía React Context (Sprint 4.1.1, Fase 3).
 *
 * Nuevo, separado deliberadamente del antiguo `src/contexts/AuthContext.tsx`
 * (Fase 3 del proyecto, Sprints 3.1–3.16, basado en tipos legacy per
 * `docs/frontend/FRONTEND_AUDIT.md`) -- ese archivo fue retirado por
 * completo en Sprint 4.2.1 ("Sistema de Autenticación"), que reconcilió
 * ambas capas a favor de esta (ver
 * `docs/architecture/frontend/SPRINT_4_2_1_AUTH_REPORT.md`).
 *
 * Sin lógica de negocio: solo expone el cliente en sí, no sesión ni rol
 * (eso es responsabilidad de `SessionProvider`/`AuthProvider`, que
 * consumen este mismo cliente por debajo).
 *
 * Desde Sprint 4.1.1C: este archivo exporta *únicamente* el componente
 * (+ su tipo de props) -- el objeto `Context` vive en `supabase.context.ts`
 * y el hook público de lectura (`useSupabase`) vive en
 * `src/hooks/useSupabase.ts`, no acá. Ver `supabase.context.ts` para el
 * motivo (regla ESLint `react-refresh/only-export-components`).
 */
export interface SupabaseProviderProps {
  children: ReactNode;
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  // `useMemo` con dependencias vacías: `getSupabaseClient()` ya es un
  // singleton a nivel de módulo (ver client.ts) -- este `useMemo` solo evita
  // volver a invocar la función (y su chequeo de variables de entorno) en
  // cada render, no crea un cliente nuevo.
  const client = useMemo(() => getSupabaseClient(), []);

  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>;
}
