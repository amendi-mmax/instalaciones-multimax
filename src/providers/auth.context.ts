/**
 * auth.context.ts — objeto de contexto crudo de React para las
 * acciones/estado de autenticación (Sprint 4.1.1C, problema #5; extendido en
 * Sprint 4.2.1 con `profile`/`profileLoading`/`resetPassword`/
 * `refreshSession`, y con `signInWithPassword`/`signOut` renombrados a
 * `login`/`logout` -- ver `AuthProvider.tsx` para la implementación y el
 * informe `SPRINT_4_2_1_AUTH_REPORT.md` para la justificación del renombre).
 *
 * Este `AuthProvider`/`useAuth()` (distinto del legacy `src/contexts/
 * AuthContext.tsx`, retirado en este mismo Sprint -- ver el informe) no
 * tenía todavía consumidores reales montados en la aplicación (`AppProviders`
 * no se montaba en `App.tsx`, per su propio JSDoc) -- este es el primer
 * Sprint que lo monta y lo consume de verdad, por lo que ampliar su forma de
 * retorno acá no rompe ningún consumidor existente.
 */
import { createContext } from 'react';

import type { Session, User } from '@supabase/supabase-js';

import type { HandymaxServiceError } from '@/services/supabase.service';
import type { SignInWithPasswordParams } from '@/services/auth.service';
import type { Perfil } from '@/types/perfil';

export type AuthActionResult = { ok: true } | { ok: false; error: HandymaxServiceError };

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /**
   * Perfil real resuelto desde `admins`/`coordinadores`/`instaladores`
   * (ver `services/profile.service.ts`). `null` mientras `profileLoading`
   * es `true`, o si la resolución no encontró ninguna fila (ver la
   * limitación de RLS documentada en `profile.service.ts` y en el informe
   * de este Sprint) -- nunca un valor "adivinado" por defecto.
   */
  profile: Perfil | null;
  /** `true` mientras se resuelve la sesión inicial (`SessionProvider`). */
  loading: boolean;
  /** `true` mientras se resuelve `profile` a partir de una sesión ya obtenida. */
  profileLoading: boolean;
  login: (params: SignInWithPasswordParams) => Promise<AuthActionResult>;
  logout: () => Promise<AuthActionResult>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  refreshSession: () => Promise<AuthActionResult>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
