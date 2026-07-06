import { Activity, Settings, User } from 'lucide-react';

import type { Rol } from '@/types/enums';

/**
 * HeaderRoleSwitch — portado verbatim de `.mx-roleswitch` (JSX de
 * referencia: `App()` en Multimax_Despacho_v1.3.html, líneas 2041–2058).
 * Exactamente 3 botones (Coordinador/Instalador/Admin), iconos tamaño 14,
 * clase `on` en el botón cuyo valor coincide con el rol activo.
 *
 * El prototipo usa las claves de estado internas `"coord"`/`"inst"`/
 * `"admin"` (su propio `useState`). Aquí se usa el tipo de dominio `Rol`
 * (`'coordinador' | 'instalador' | 'admin'`, definido a partir del schema
 * SQL en `types/enums.ts`) en vez de esas claves literales del prototipo,
 * porque este selector eventualmente se alimentará del rol real de sesión
 * (`usuarios.rol`) — decisión ya tomada en Fase 3 (ver `header.tsx`) y
 * ARCHITECTURE.md §13.2. El comportamiento visual/interactivo es idéntico;
 * solo cambian los identificadores internos, que no son visibles en la UI.
 */
export interface HeaderRoleSwitchProps {
  role: Rol;
  onRoleChange: (role: Rol) => void;
}

const ROLE_OPTIONS: Array<{ value: Rol; label: string; icon: typeof Activity }> = [
  { value: 'coordinador', label: 'Coordinador', icon: Activity },
  { value: 'instalador', label: 'Instalador', icon: User },
  { value: 'admin', label: 'Admin', icon: Settings },
];

export function HeaderRoleSwitch({ role, onRoleChange }: HeaderRoleSwitchProps) {
  return (
    <div className="mx-roleswitch">
      {ROLE_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          className={role === value ? 'on' : ''}
          onClick={() => onRoleChange(value)}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
