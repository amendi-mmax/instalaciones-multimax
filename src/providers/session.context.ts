/**
 * session.context.ts — objeto de contexto crudo de React para la sesión
 * cruda de Supabase Auth (Sprint 4.1.1C, problema #5 -- ver
 * `supabase.context.ts` para la justificación completa de esta extracción).
 */
import { createContext } from 'react';

import type { Session } from '@supabase/supabase-js';

export interface SessionContextValue {
  session: Session | null;
  loading: boolean;
}

export const SessionContext = createContext<SessionContextValue | null>(null);
