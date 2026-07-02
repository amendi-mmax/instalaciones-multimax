import { createContext, useContext, type ReactNode } from 'react';

import type { Usuario } from '@/types/domain';
import type { Rol } from '@/types/enums';

/**
 * Forma del contexto de autenticación (ver ARCHITECTURE.md §7.1 y §9.4).
 *
 * En esta fase el Provider NO se conecta todavía a Supabase Auth: solo expone la
 * forma final de los datos con valores por defecto, para que el resto del scaffold
 * (rutas, layouts) pueda tipar contra ella desde ya. La conexión real con
 * `supabase.auth.onAuthStateChange` + `SELECT * FROM usuarios WHERE auth_id = auth.uid()`
 * llega en la fase de Autenticación.
 */
export interface AuthContextValue {
  session: null;
  usuario: Usuario | null;
  rol: Rol | null;
  sucursalId: string | null;
  isMaster: boolean;
  loading: boolean;
}

const defaultAuthValue: AuthContextValue = {
  session: null,
  usuario: null,
  rol: null,
  sucursalId: null,
  isMaster: false,
  loading: false,
};

const AuthContext = createContext<AuthContextValue>(defaultAuthValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  // TODO(fase de Autenticación): reemplazar el valor fijo por sesión real de Supabase.
  return <AuthContext.Provider value={defaultAuthValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
