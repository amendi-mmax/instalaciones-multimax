import { ChevronDown, KeyRound, LogOut, Settings, User as UserIcon } from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Perfil } from '@/types/perfil';

/**
 * HeaderUserMenu — reemplaza a `HeaderRoleSwitch` (Sprint 4.2.1, entregable
 * "reemplazar el selector manual de rol por un menú de usuario autenticado
 * real"). `HeaderRoleSwitch`/`header-role-switch.tsx` se eliminó por
 * completo en este Sprint -- ver `SPRINT_4_2_1_AUTH_REPORT.md`.
 *
 * Se renderiza dentro de `.mx-top` (ver `header.tsx`), como hermano de
 * `HeaderStatus` -- ambos quedan alineados a la derecha gracias al
 * `margin-left: auto` ya existente en `.mx-topright` (el propio `<div>` que
 * devuelve `HeaderStatus`), sin necesidad de tocar esa clase.
 *
 * `avatarUrl` de `Perfil` es `null` en Producción hoy (ninguna de las 3
 * tablas reales tiene esa columna todavía, ver `types/perfil.ts`) -- este
 * componente ya está preparado para usarlo (bastaría con condicionar un
 * `<img>` en vez de `Avatar` cuando `avatarUrl` no sea `null`), pero no se
 * implementa ese camino todavía porque no hay ningún valor real que
 * probarlo -- se documenta la intención, no se fabrica el código muerto.
 */
export interface HeaderUserMenuProps {
  profile: Perfil;
  onLogout: () => void;
}

const ROL_LABEL: Record<Perfil['rol'], string> = {
  admin: 'Admin',
  coordinador: 'Coordinador',
  instalador: 'Instalador',
};

const ESTADO_LABEL: Record<Perfil['estado'], string> = {
  activo: 'Activo',
  suspendido: 'Suspendido',
  inactivo: 'Inactivo',
};

function initialsFrom(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function HeaderUserMenu({ profile, onLogout }: HeaderUserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ice">
        <Avatar initials={initialsFrom(profile.nombre)} size="sm" />
        <ChevronDown size={14} className="text-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-text">{profile.nombre}</p>
            {profile.correo ? <p className="truncate text-xs text-muted">{profile.correo}</p> : null}
            <p className="mt-1 text-xs text-muted">
              {ROL_LABEL[profile.rol]} · {ESTADO_LABEL[profile.estado]}
            </p>
            {profile.empresaNombre ? (
              <p className="truncate text-xs text-muted">
                {profile.empresaNombre}
                {profile.tiendaNombre ? ` · ${profile.tiendaNombre}` : ''}
              </p>
            ) : null}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="opacity-50" onSelect={(event) => event.preventDefault()}>
            <UserIcon size={14} />
            Mi perfil
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="opacity-50" onSelect={(event) => event.preventDefault()}>
            <Settings size={14} />
            Configuración
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="opacity-50" onSelect={(event) => event.preventDefault()}>
            <KeyRound size={14} />
            Cambiar contraseña
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red" onSelect={onLogout}>
            <LogOut size={14} />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
