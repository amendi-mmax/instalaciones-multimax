import { HeaderBrand } from '@/components/shared/header-brand';
import { HeaderRoleSwitch } from '@/components/shared/header-role-switch';
import { HeaderStatus } from '@/components/shared/header-status';
import type { Rol } from '@/types/enums';

/**
 * Header — portado verbatim de `<header className="mx-top">` (JSX de
 * referencia: `App()` en Multimax_Despacho_v1.3.html, líneas 2029–2071).
 * Compone `HeaderBrand` (`.mx-brand`), `HeaderRoleSwitch` (`.mx-roleswitch`)
 * y `HeaderStatus` (`.mx-topright`) — ver docs/sprints/sprint-3.1.md para el
 * análisis completo del bloque migrado.
 *
 * Reescrito en el Sprint 3.1 sobre la base creada en Fase 3: el `Header` de
 * Fase 3 exponía un `rightSlot: ReactNode` genérico para `.mx-topright`
 * (placeholder que solo mostraba un badge estático "Sesión local", tomado
 * del snapshot de DOM). Este Sprint reemplaza ese placeholder por la
 * reconstrucción fiel de los 3 condicionales reales de `.mx-topright`
 * definidos en el código fuente — ver `header-status.tsx` y la nota sobre
 * la discrepancia snapshot-vs-código-fuente en docs/sprints/sprint-3.1.md.
 *
 * DECISIÓN DE FASE 3 (vigente, sin cambios) — selector de rol como estado
 * local temporal: ARCHITECTURE.md §4 establece que el selector manual de
 * rol se elimina en la fase de Auth, a favor del rol derivado de la sesión
 * de Supabase. Hasta entonces, `role`/`onRoleChange` los controla el padre
 * (`RootLayout`) con `useState` puro. Ver ARCHITECTURE.md §13.2.
 */
export interface HeaderProps {
  role: Rol;
  onRoleChange: (role: Rol) => void;
  sucursalActiva?: string;
  hasActiveJobs?: boolean;
  onReset?: () => void;
}

export function Header({
  role,
  onRoleChange,
  sucursalActiva,
  hasActiveJobs,
  onReset,
}: HeaderProps) {
  return (
    <header className="mx-top">
      <HeaderBrand />
      <HeaderRoleSwitch role={role} onRoleChange={onRoleChange} />
      <HeaderStatus
        role={role}
        sucursalActiva={sucursalActiva}
        hasActiveJobs={hasActiveJobs}
        onReset={onReset}
      />
    </header>
  );
}
