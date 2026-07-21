/**
 * auth.context.ts — objeto de contexto crudo de React para las
 * acciones/estado genéricos de autenticación (Sprint 4.1.1C, problema #5 --
 * ver `supabase.context.ts` para la justificación completa de esta
 * extracción).
 */
import { createContext } from 'react';

import type { Session, User } from '@supabase/supabase-js';

import type { HandymaxServiceError } from '@/services/supabase.service';
import type { SignInWithPasswordParams } from '@/services/auth.service';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithPassword: (
    params: SignInWithPasswordParams,
  ) => Promise<{ ok: true } | { ok: false; error: HandymaxServiceError }>;
  signOut: () => Promise<{ ok: true } | { ok: false; error: HandymaxServiceError }>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
