import { HeaderBrand } from '@/components/shared/header-brand';
import { HeaderStatus } from '@/components/shared/header-status';
import { HeaderUserMenu } from '@/components/shared/header-user-menu';
import type { Rol } from '@/types/enums';
import type { Perfil } from '@/types/perfil';

/**
 * Header — portado verbatim de `<header className="mx-top">` (JSX de
 * referencia: `App()` en Multimax_Despacho_v1.3.html, líneas 2029–2071).
 * Compone `HeaderBrand` (`.mx-brand`), `HeaderUserMenu` (Sprint 4.2.1) y
 * `HeaderStatus` (`.mx-topright`) — ver docs/sprints/sprint-3.1.md para el
 * análisis completo del bloque migrado originalmente.
 *
 * DECISIÓN DE FASE 3, EJECUTADA EN SPRINT 4.2.1 — el selector manual de rol
 * (`HeaderRoleSwitch`, `.mx-roleswitch`) ya anticipaba desde Fase 3 su
 * propio retiro ("se elimina en la fase de Auth, a favor del rol derivado
 * de la sesión de Supabase" — ARCHITECTURE.md §4/§13.2). Este Sprint ejecuta
 * esa decisión: `HeaderRoleSwitch`/`header-role-switch.tsx` se eliminó por
 * completo (sin más consumidores, verificado con `grep`) y se reemplaza por
 * `HeaderUserMenu`, que muestra el usuario autenticado real (`Perfil`
 * resuelto por `useAuth()`, ver `providers/AuthProvider.tsx` y
 * `services/profile.service.ts`) en vez de un `<select>` de rol manual.
 * `role` sigue siendo prop de `Header`/`HeaderStatus` porque `HeaderStatus`
 * todavía necesita saber el rol activo para sus 3 condicionales — ahora lo
 * recibe derivado de `profile.rol` (ver `layouts/RootLayout.tsx`), no de un
 * `useState` local editable.
 */
export interface HeaderProps {
  role: Rol;
  profile: Perfil;
  onLogout: () => void;
  sucursalActiva?: string;
  hasActiveJobs?: boolean;
  onReset?: () => void;
}

export function Header({
  role,
  profile,
  onLogout,
  sucursalActiva,
  hasActiveJobs,
  onReset,
}: HeaderProps) {
  return (
    <header className="mx-top">
      <HeaderBrand />
      <HeaderStatus
        role={role}
        sucursalActiva={sucursalActiva}
        hasActiveJobs={hasActiveJobs}
        onReset={onReset}
      />
      <HeaderUserMenu profile={profile} onLogout={onLogout} />
    </header>
  );
}
