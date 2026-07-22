import { Activity, Settings, User } from 'lucide-react';
import type { ReactNode } from 'react';

import { MxSubtabButton } from '@/components/shared/mx-subtab-button';
import { MxSubtabs } from '@/components/shared/mx-subtabs';

/**
 * AdminVistaSwitch — selector temporal de "modo de visualización", exclusivo
 * del rol `admin`, agregado en el Sprint 5.1.1 ("Implementación del modo
 * Administrador Superusuario (MVP)") por instrucción explícita del usuario.
 *
 * CONTEXTO -- por qué este componente es nuevo (no reconstruye nada del HTML
 * oficial): tanto `Multimax_Despacho_v1.3.html` (`App()`, línea ~2111) como
 * este proyecto (`RootLayout.tsx`, antes de este Sprint) renderizan
 * Coordinador/Instalador/Admin como 3 ramas `role === '...'` MUTUAMENTE
 * EXCLUYENTES -- nunca dos a la vez, ni en el HTML fuente ni en el código ya
 * aprobado. El único precedente real del HTML de "ver todo con una sola
 * sesión" era el selector manual `.mx-roleswitch`/`HeaderRoleSwitch` (botones
 * Coordinador/Instalador/Admin, `setRole(...)`, visible para cualquiera sin
 * distinción de permisos reales), retirado a propósito en el Sprint 4.2.1
 * ("se elimina en la fase de Auth, a favor del rol derivado de la sesión de
 * Supabase").
 *
 * La nueva regla metodológica del proyecto ("Modo de Visualización del
 * Administrador", vigente mientras el MVP no esté aprobado -- ver
 * `PROJECT_STATUS.md`/`README.md`, sección de metodología) pide exactamente
 * esa capacidad -- pero restringida a usuarios reales `admin` (nunca a
 * cualquiera, como el selector legacy) y SIN tocar `profile.rol`/Supabase/RLS
 * en absoluto. Como esa capacidad no tiene ningún equivalente reconstruible
 * en el HTML oficial ni en el código ya aprobado, este control es, por
 * necesidad, nuevo -- reportado y documentado aquí con trazabilidad
 * completa (auditoría previa vía `AskUserQuestion`, ver
 * `docs/architecture/frontend/SPRINT_5_1_1_ADMIN_SUPERUSER_REPORT.md`) en
 * vez de fabricarse en silencio, tal como exige la disciplina del proyecto.
 *
 * Es puramente presentacional -- mismo patrón que `CoordinatorSubtabs`
 * (Sprint 5.1): reutiliza `MxSubtabs`/`MxSubtabButton` (Sprint 3.3, sin
 * ningún estilo/markup nuevo) y no tiene estado propio. `vista`/`onChange`
 * son controlados por `RootLayout`, el único lugar que sabe qué rama debe
 * montar (`<Outlet/>` de Coordinador -- rutas reales `/despacho`/`/trabajos`
 * ya existentes desde el Sprint 5.1 -- vs. `InstallerDashboard`/`AdminPanel`
 * inline, igual que ya sucede hoy para `instalador`/`admin` reales). Los
 * íconos (`Activity`/`User`/`Settings`) son los mismos que usaba
 * `.mx-roleswitch` del HTML fuente para "Coordinador"/"Instalador"/"Admin"
 * respectivamente (línea 2042-2058) -- reutilizados aquí por consistencia
 * visual con ese precedente, aunque el control en sí sea nuevo.
 *
 * ELIMINACIÓN FUTURA (documentado también en `PROJECT_STATUS.md`): este
 * componente y el estado que lo alimenta (`RootLayout.adminVista`) se
 * retiran por completo cuando el MVP sea aprobado e implemente el modelo
 * definitivo de permisos (admin ve únicamente "Administración", sin este
 * selector) -- no hay ninguna intención de mantenerlo en producción.
 */
export type AdminVista = 'administracion' | 'coordinador' | 'instalador';

interface AdminVistaOption {
  value: AdminVista;
  label: string;
  icon: ReactNode;
}

const ADMIN_VISTAS: AdminVistaOption[] = [
  { value: 'administracion', label: 'Administración', icon: <Settings size={14} /> },
  { value: 'coordinador', label: 'Coordinador', icon: <Activity size={14} /> },
  { value: 'instalador', label: 'Instalador', icon: <User size={14} /> },
];

export interface AdminVistaSwitchProps {
  vista: AdminVista;
  onChange: (vista: AdminVista) => void;
}

export function AdminVistaSwitch({ vista, onChange }: AdminVistaSwitchProps) {
  return (
    <MxSubtabs>
      {ADMIN_VISTAS.map((option) => (
        <MxSubtabButton
          key={option.value}
          active={vista === option.value}
          icon={option.icon}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </MxSubtabButton>
      ))}
    </MxSubtabs>
  );
}
