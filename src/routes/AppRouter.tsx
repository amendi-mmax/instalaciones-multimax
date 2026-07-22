import { Navigate, Route, Routes } from 'react-router-dom';

import { RootLayout } from '@/layouts/RootLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicRoute } from '@/components/auth/PublicRoute';

/**
 * Árbol de rutas por rol (ver ARCHITECTURE.md §8: /despacho, /trabajos,
 * /solicitudes, /mis-trabajos, /perfil, /admin/calendario, /admin/instaladores, /login
 * -- esa tabla describe el modelo de rutas LEGACY, ver §14.9 para la
 * reconciliación; esta es la primera ronda real de rutas de Auth).
 *
 * Desde Sprint 4.2.1: `/login` es la única ruta pública (envuelta en
 * `PublicRoute` -- redirige a `/` si ya hay sesión -- y `AuthLayout`, el
 * shell centrado nuevo de este Sprint). `/` (y, en cascada, cualquier ruta
 * futura que cuelgue de `RootLayout`) está protegida por `ProtectedRoute`
 * -- sin sesión de Supabase Auth, no hay acceso a ningún contenido de la
 * aplicación. Cualquier ruta desconocida redirige a `/`, que a su vez
 * redirige a `/login` si no hay sesión (mismo criterio que antes de este
 * Sprint, ahora con el guard real).
 *
 * Metodología de Sprints incrementales (desde Sprint 3.1, ver
 * docs/SPRINTS_INDEX.md): el `<Outlet/>` de `RootLayout` no tiene todavía
 * ninguna ruta hija — el contenido principal se agrega Sprint a Sprint. No
 * se inventa contenido de relleno.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RootLayout />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
