import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import type { UserPreferences } from '@/services/account.service';
import type { AuthUserSummary } from '@/services/account.service';
import type { Rol } from '@/types/enums';
import type { EstadoPerfil, Perfil } from '@/types/perfil';

/**
 * user.context.ts — objeto de contexto crudo de React para `UserContext`
 * (Sprint 7.3.1). Separado de `UserContext.tsx` (el Provider) y de
 * `useUserContext.ts` (`src/hooks/`, el hook público) por el mismo motivo
 * exacto que ya justifica esta misma división para Auth (`providers/
 * auth.context.ts` + `providers/AuthProvider.tsx` + `hooks/useAuth.ts`,
 * Sprint 4.1.1C): un archivo `.tsx` que exporta un componente (`UserProvider`)
 * junto con un valor que no es un componente (el propio `useUserContext`,
 * o este objeto `UserContext`) rompe la regla de Fast Refresh de
 * `eslint-plugin-react-refresh` -- confirmado en este mismo Sprint (el
 * primer intento, con todo en un único `UserContext.tsx`, sí disparó esa
 * advertencia nueva). Esta separación en 3 archivos no es una preferencia
 * estética: es la misma solución ya validada y sin advertencias que usa
 * Auth en este proyecto.
 */
export interface UserContextValue {
  session: Session | null;
  user: User | null;
  profile: Perfil | null;
  loading: boolean;
  profileLoading: boolean;

  rol: Rol | null;
  nombre: string | null;
  email: string | null;
  avatarUrl: string | null;
  empresaId: string | null;
  empresaNombre: string | null;
  tiendaId: string | null;
  tiendaNombre: string | null;
  estado: EstadoPerfil | null;
  permisos: { esAdmin: boolean; esCoordinador: boolean; esInstalador: boolean };

  authUser: AuthUserSummary | null;

  preferences: UserPreferences;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}

export const UserContext = createContext<UserContextValue | null>(null);
