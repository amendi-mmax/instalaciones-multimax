import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { Loading } from '@/components/ui/spinner';

/**
 * PublicRoute — inverso de `ProtectedRoute` (Sprint 4.2.1, entregable
 * "Guards"): envuelve rutas que no tiene sentido ver ya autenticado
 * (`/login`). Si ya hay `session`, redirige a la ruta de la que venía el
 * usuario (`location.state.from`, si `ProtectedRoute` lo dejó al rebotarlo
 * hacia acá) o a `/` por defecto -- nunca deja el formulario de login
 * visible con una sesión ya válida.
 */
export interface PublicRouteProps {
  children: ReactNode;
}

interface LocationState {
  from?: { pathname: string };
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading label="Verificando sesión…" />;
  }

  if (session) {
    const state = location.state as LocationState | null;
    const destino = state?.from?.pathname ?? '/';
    return <Navigate to={destino} replace />;
  }

  return <>{children}</>;
}
