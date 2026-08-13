import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { Loading } from '@/components/ui/spinner';

/**
 * ProtectedRoute — bloquea el acceso a rutas de la aplicación sin sesión
 * real de Supabase Auth (Sprint 4.2.1, entregable "Guards").
 *
 * Solo depende de `session`/`loading` (nivel de autenticación) -- NO
 * bloquea sobre `profile`/`profileLoading` (nivel de perfil de negocio):
 * un usuario con sesión válida pero sin fila en `admins`/`coordinadores`/
 * `instaladores` (ver la limitación de RLS documentada en
 * `services/profile.service.ts`) sigue estando "autenticado" -- es
 * responsabilidad de `RootLayout` mostrar el estado "perfil no encontrado"
 * en ese caso, no de este guard rechazar el acceso. Mezclar ambos niveles
 * aquí dejaría a un admin/coordinador real completamente bloqueado por un
 * problema de RLS que no le compete a este componente resolver.
 *
 * Heurística de "sesión expirada" vs. "nunca inició sesión": se guarda en
 * un `ref` si en algún render anterior hubo `session` no nula; si luego
 * `session` pasa a `null` (evento `SIGNED_OUT`/token vencido sin refresh
 * posible) se redirige a `/login` con `state.reason = 'session-expired'`,
 * que `LoginPage` usa para mostrar el toast correspondiente -- distinto de
 * un `Navigate` "silencioso" para quien simplemente nunca inició sesión.
 */
export interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const hadSession = useRef(false);

  useEffect(() => {
    if (session) {
      hadSession.current = true;
    }
  }, [session]);

  if (loading) {
    return <Loading label="Verificando sesión…" />;
  }

  if (!session) {
    const reason = hadSession.current ? 'session-expired' : undefined;
    return <Navigate to="/login" replace state={{ from: location, reason }} />;
  }

  return <>{children}</>;
}
