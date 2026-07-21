import { useMemo, type ReactNode } from 'react';

import { getSupabaseClient } from '@/lib/supabase/client';
import { SupabaseContext } from '@/providers/supabase.context';

/**
 * SupabaseProvider — provee el cliente único de Supabase (navegador) al
 * árbol de componentes vía React Context (Sprint 4.1.1, Fase 3).
 *
 * Nuevo, separado deliberadamente de `src/contexts/AuthContext.tsx`
 * (Fase 3 del proyecto, Sprints 3.1–3.16, todavía basado en tipos legacy
 * per `docs/frontend/FRONTEND_AUDIT.md`) -- este Sprint no modifica ese
 * archivo (está fuera de la lista de archivos permitidos: "NO modificar
 * Auth"). `AuthContext.tsx` sigue existiendo tal cual hasta que un Sprint
 * futuro (`docs/frontend/FRONTEND_SYNC_PLAN.md`, Fase 3) decida
 * reconciliarlo con esta nueva capa.
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
