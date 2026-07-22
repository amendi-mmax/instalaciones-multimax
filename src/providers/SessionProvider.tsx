import { useEffect, useState, type ReactNode } from 'react';

import type { Session } from '@supabase/supabase-js';

import { getCurrentSession, onAuthStateChange } from '@/services/auth.service';
import { SessionContext } from '@/providers/session.context';

/**
 * SessionProvider — rastrea la sesión cruda de Supabase Auth (Sprint
 * 4.1.1, Fase 3).
 *
 * Deliberadamente mínimo ("sin lógica de negocio", per Fase 3): solo lee
 * `session`/`loading` y se suscribe a `onAuthStateChange`. No consulta
 * `admins`/`coordinadores`/`instaladores` para resolver un rol, no
 * redirige, no decide nada -- eso es responsabilidad de un Sprint
 * funcional futuro (ver `docs/frontend/FRONTEND_SYNC_PLAN.md`, Fase 3,
 * sobre la decisión pendiente "Usuario unificado vs. tipos separados").
 *
 * Nuevo y separado del antiguo `src/contexts/AuthContext.tsx` (legacy, Fase
 * 3 de UI, retirado en Sprint 4.2.1) -- ver nota de `SupabaseProvider.tsx`.
 *
 * Desde Sprint 4.1.1C: `SessionContextValue` y el objeto `Context` viven en
 * `session.context.ts`; este archivo exporta únicamente el componente (+ su
 * tipo de props) -- ver `supabase.context.ts` para el motivo.
 */
export interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getCurrentSession()
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setSession(result.session);
        }
        // Si `result.ok` es `false` (error real de Supabase, no "sin
        // sesión"), se deja `session` en `null` -- este Provider no expone
        // el error en sí (sin lógica de negocio de manejo de errores acá);
        // un consumidor que necesite ese detalle debe llamar a
        // `getCurrentSession()` directamente.
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = onAuthStateChange((nextSession) => {
      if (active) setSession(nextSession);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading }}>{children}</SessionContext.Provider>
  );
}
