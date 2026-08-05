import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { RootLayout } from '@/layouts/RootLayout';
import { AccountLayout } from '@/layouts/AccountLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SetPasswordPage } from '@/pages/auth/SetPasswordPage';
import { DespachoPage } from '@/pages/coordinator/DespachoPage';
import { TrabajosPage } from '@/pages/coordinator/TrabajosPage';
import { TrabajoDetailPage } from '@/pages/coordinator/TrabajoDetailPage';
import { ProfilePage } from '@/pages/account/ProfilePage';
import { SettingsPage } from '@/pages/account/SettingsPage';
import { ChangePasswordPage } from '@/pages/account/ChangePasswordPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicRoute } from '@/components/auth/PublicRoute';
import { Loading } from '@/components/ui/spinner';
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

/**
 * CoordinatorOnlyRoute — Sprint 6.3 (Onboarding del Instalador, Issue "7.
 * Protección de rutas"). `/despacho`/`/trabajos`/`/trabajos/:id` son las
 * únicas rutas reales exclusivas de un rol (Coordinador, o Admin en Modo
 * Coordinador) -- Administración e Instalador no tienen rutas propias
 * todavía (se renderizan inline en `/` según `profile.rol`, ver
 * `RootLayout.tsx`), así que ya están protegidas de hecho (un Instalador o
 * un Admin en modo "Administración" nunca montan `CoordinatorLayout`/
 * `<Outlet/>`, sin importar la URL). Este guard hace esa protección
 * EXPLÍCITA para las 3 rutas reales, en vez de depender del efecto
 * colateral de que `<Outlet/>` simplemente no se monte -- mismo criterio ya
 * usado por `useAuth()` en `CoordinatorIndexRedirect`, sin ningún Provider
 * ni patrón nuevo.
 */
function CoordinatorOnlyRoute({ children }: { children: ReactNode }) {
  const { profile, profileLoading } = useAuth();

  if (profileLoading) {
    return <Loading label="Verificando acceso…" />;
  }

  if (profile && profile.rol !== 'coordinador' && profile.rol !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
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
      {/*
        Sprint 6.3 -- standalone, deliberadamente fuera de `PublicRoute`
        (redirigiría a `/` apenas `detectSessionInUrl` establece la sesión
        del enlace, antes de poder mostrar el formulario) y de
        `ProtectedRoute` (bloquearía el caso "enlace inválido", que necesita
        mostrarse SIN sesión) -- ver JSDoc completo en `SetPasswordPage.tsx`.
      */}
      <Route
        path="/nueva-contrasena"
        element={
          <AuthLayout>
            <SetPasswordPage />
          </AuthLayout>
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
        <Route
          path="despacho"
          element={
            <CoordinatorOnlyRoute>
              <DespachoPage />
            </CoordinatorOnlyRoute>
          }
        />
        <Route
          path="trabajos"
          element={
            <CoordinatorOnlyRoute>
              <TrabajosPage />
            </CoordinatorOnlyRoute>
          }
        />
        <Route
          path="trabajos/:id"
          element={
            <CoordinatorOnlyRoute>
              <TrabajoDetailPage />
            </CoordinatorOnlyRoute>
          }
        />
      </Route>
      {/*
        Sprint 7.3 (Módulo de Cuenta de Usuario) -- `/perfil`/`/configuracion`/
        `/cambiar-contrasena`, las 3 pantallas del menú de usuario
        (`HeaderUserMenu`, hasta este Sprint deshabilitadas sin destino real).
        Declaradas como rutas HERMANAS de `/` (mismo nivel que `/login`), no
        como hijas de `RootLayout` -- ver el JSDoc completo de
        `AccountLayout.tsx` para la justificación: `RootLayout` no monta un
        `<Outlet/>` para `instalador`/`admin` fuera de "Modo Coordinador", y
        "Mi cuenta" debe funcionar para los 3 roles por igual, sin tocar
        `RootLayout.tsx`/`CoordinatorLayout.tsx` (área restringida de este
        Sprint, dueña de la publicación de trabajos). `AccountLayout` resuelve
        `profile`/`onLogout` por su cuenta vía `useAuth()` -- mismo criterio
        que `RootLayout`, sin depender de contexto compartido con las rutas de
        arriba.
      */}
      <Route
        element={
          <ProtectedRoute>
            <AccountLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/configuracion" element={<SettingsPage />} />
        <Route path="/cambiar-contrasena" element={<ChangePasswordPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
