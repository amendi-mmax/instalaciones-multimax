import { Navigate, Route, Routes } from 'react-router-dom';

import { RootLayout } from '@/layouts/RootLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DespachoPage } from '@/pages/coordinator/DespachoPage';
import { TrabajosPage } from '@/pages/coordinator/TrabajosPage';
import { TrabajoDetailPage } from '@/pages/coordinator/TrabajoDetailPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicRoute } from '@/components/auth/PublicRoute';
import { useAuth } from '@/hooks/useAuth';

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
 * ---------------------------------------------------------------------
 * SPRINT 5.1 — primeras rutas hijas reales de `RootLayout`
 * ---------------------------------------------------------------------
 * `/despacho`/`/trabajos`/`/trabajos/:id` son las primeras rutas de
 * `ARCHITECTURE.md §8` que se implementan de verdad (exclusivas del rol
 * `coordinador` -- ver `RootLayout.tsx`, que solo monta `<Outlet/>` cuando
 * `role === 'coordinador'`; para `instalador`/`admin`, esas rutas nunca se
 * alcanzan porque `RootLayout` no les da acceso al `<Outlet/>`, siguen
 * renderizando su contenido inline como antes de este Sprint). No existe
 * todavía un `RoleGate` genérico (`ARCHITECTURE.md §8` lo menciona como
 * pieza futura) -- por ahora el propio `role === 'coordinador'` de
 * `RootLayout` cumple ese rol para estas 3 rutas.
 *
 * `index` (ruta `/`) usa `CoordinatorIndexRedirect`: si el perfil resuelto
 * es `coordinador`, redirige a `/despacho` (Entregable 1: "cargar
 * automáticamente LayoutCoordinator sin intervención del usuario"); para
 * `instalador`, no renderiza nada -- sigue mostrando su contenido
 * directamente desde `RootLayout` en `/`, sin depender del `<Outlet/>` en
 * absoluto.
 *
 * ---------------------------------------------------------------------
 * SPRINT 5.1.1 — `admin` se agrega a esta redirección (Modo de
 * Visualización del Administrador, ver `RootLayout.tsx`)
 * ---------------------------------------------------------------------
 * Este componente solo se monta cuando `RootLayout` decide mostrar el
 * `<Outlet/>` (`showCoordinador`), y para un `admin` real eso únicamente
 * ocurre cuando eligió la vista "Coordinador" en `AdminVistaSwitch` -- por
 * lo tanto, si este componente se ejecuta y `profile.rol === 'admin'`, ya
 * sabemos con certeza que corresponde ir a `/despacho` (no hay ningún caso
 * en que un admin llegue hasta acá sin haber elegido esa vista). Se
 * ensancha el `if` para incluirlo -- mismo patrón que sugiere la propia
 * regla del proyecto (`allowedRoles = ['admin', 'coordinador']`) -- y así
 * se evita depender únicamente del `useEffect` de sincronización de
 * `RootLayout` (que igual sigue existiendo, para el resto de las
 * transiciones) para este caso puntual. No se crea ninguna ruta nueva.
 */
function CoordinatorIndexRedirect() {
  const { profile } = useAuth();
  if (profile?.rol === 'coordinador' || profile?.rol === 'admin') {
    return <Navigate to="/despacho" replace />;
  }
  return null;
}

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
      >
        <Route index element={<CoordinatorIndexRedirect />} />
        <Route path="despacho" element={<DespachoPage />} />
        <Route path="trabajos" element={<TrabajosPage />} />
        <Route path="trabajos/:id" element={<TrabajoDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
