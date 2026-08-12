import { ChevronLeft, ChevronRight, KeyRound, Settings, User as UserIcon } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Footer } from '@/components/shared/footer';
import { Header } from '@/components/shared/header';
import { MxSubtabButton } from '@/components/shared/mx-subtab-button';
import { MxSubtabs } from '@/components/shared/mx-subtabs';
import { PageContainer } from '@/components/shared/page-container';
import { Loading } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';
import { useUserContext } from '@/hooks/useUserContext';
import { getDashboardRoute } from '@/lib/role-helpers';

/**
 * AccountLayout — Sprint 7.3 (creación) / Sprint 7.3.1 (refinamiento). Shell
 * ÚNICO para `/perfil`/`/configuracion`/`/cambiar-contrasena` -- Header,
 * breadcrumb, botón "Volver", subtabs y contenido viven acá una sola vez;
 * ninguna de las 3 pantallas repite navegación propia (Regla explícita del
 * brief de este Sprint: "No duplicar navegación entre páginas").
 *
 * **Por qué un layout nuevo y no reutilizar `RootLayout`/`CoordinatorLayout`
 * directamente**: ver el JSDoc histórico completo de la sección de abajo --
 * sigue vigente sin cambios en este Sprint (`RootLayout.tsx`/
 * `CoordinatorLayout.tsx` continúan fuera de alcance, ahora explícitamente
 * bajo el nombre "Sprint 7.2 congelado").
 *
 * **Sprint 7.3.1 -- fuente de datos**: `profile`/`rol` se leen de
 * `useUserContext()` (antes, `useAuth()` directo) -- mismo dato exacto
 * (`UserContext` deriva de `useAuth()` sin transformarlo, ver su JSDoc),
 * pero ahora es el mismo punto de entrada único que usan `HeaderUserMenu`/
 * `ProfilePage`/`SettingsPage`/`ChangePasswordPage`. `logout` sigue
 * viniendo de `useAuth()` -- es una ACCIÓN (llama a Supabase), no un dato;
 * `UserContext` expone estado derivado, no acciones de sesión (ver su
 * propio JSDoc, "no reemplaza a `useAuth()`").
 *
 * **Sprint 7.3.1 -- navegación nueva**: breadcrumb ("Dashboard / Mi
 * cuenta / {pestaña activa}") + botón "Volver al Dashboard" -- el destino
 * se calcula con `getDashboardRoute(rol)` (`lib/role-helpers.ts`, nuevo),
 * NUNCA una ruta hardcodeada acá. Único lugar de toda la aplicación donde
 * "Mi cuenta" decide a dónde vuelve un usuario -- ninguna de las 3
 * pantallas hijas necesita saberlo.
 */
const ACCOUNT_TABS = [
  { path: '/perfil', label: 'Mi perfil', icon: <UserIcon size={16} /> },
  { path: '/configuracion', label: 'Configuración', icon: <Settings size={16} /> },
  { path: '/cambiar-contrasena', label: 'Cambiar contraseña', icon: <KeyRound size={16} /> },
] as const;

export function AccountLayout() {
  const { logout } = useAuth();
  const { profile, profileLoading, rol } = useUserContext();
  const navigate = useNavigate();
  const location = useLocation();

  if (profileLoading || !profile) {
    return <Loading label="Cargando tu cuenta…" />;
  }

  const activeTab = ACCOUNT_TABS.find((tab) => tab.path === location.pathname);
  const dashboardRoute = getDashboardRoute(rol);

  return (
    <div className="flex min-h-screen flex-col">
      <Header role={profile.rol} profile={profile} onLogout={() => void logout()} />
      <main className="flex-1">
        <PageContainer>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <nav aria-label="Ruta de navegación" className="flex items-center gap-1.5 text-xs text-muted">
              <button type="button" className="hover:text-text" onClick={() => navigate(dashboardRoute)}>
                Dashboard
              </button>
              <ChevronRight size={12} />
              <span>Mi cuenta</span>
              {activeTab ? (
                <>
                  <ChevronRight size={12} />
                  <span className="text-text">{activeTab.label}</span>
                </>
              ) : null}
            </nav>
            <button type="button" className="mx-backbtn" onClick={() => navigate(dashboardRoute)}>
              <ChevronLeft size={15} />
              Volver al Dashboard
            </button>
          </div>

          <MxSubtabs>
            {ACCOUNT_TABS.map((tab) => (
              <MxSubtabButton
                key={tab.path}
                active={location.pathname === tab.path}
                icon={tab.icon}
                onClick={() => navigate(tab.path)}
              >
                {tab.label}
              </MxSubtabButton>
            ))}
          </MxSubtabs>
          <div className="mt-4">
            <Outlet />
          </div>
        </PageContainer>
      </main>
      <Footer />
    </div>
  );
}
