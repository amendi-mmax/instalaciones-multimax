import { ChevronDown, KeyRound, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserContext } from '@/hooks/useUserContext';
import { ESTADO_LABEL, ROL_LABEL, initialsFrom } from '@/lib/perfil-format';
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
 *
 * **Sprint 7.3 (Módulo de Cuenta de Usuario)**: los 3 ítems "Mi perfil"/
 * "Configuración"/"Cambiar contraseña" -- `disabled` desde su creación en
 * el Sprint 4.2.1, sin destino real -- ahora navegan a `/perfil`/
 * `/configuracion`/`/cambiar-contrasena` (`AccountLayout`, nuevo).
 *
 * **Sprint 7.3.1 (Refinamiento)**: los datos mostrados (nombre/correo/
 * rol/estado/empresa/sucursal) ya NO se leen de la prop `profile` -- se
 * leen exclusivamente de `useUserContext()` (Regla explícita del brief:
 * "El menú del Header debe obtener la información únicamente desde
 * UserContext"). La prop `profile` se conserva en la interfaz (`Header.tsx`
 * sigue pasándola, y `Header.tsx`/`RootLayout.tsx`/`CoordinatorLayout.tsx`
 * están fuera de alcance de este Sprint -- no se tocan) pero ya no se lee
 * dentro de este componente -- `UserContext` deriva de exactamente el mismo
 * `profile` (vía `useAuth()`, ver `UserContext.tsx`), así que el dato
 * mostrado es idéntico, sin duplicar ninguna consulta.
 */
export interface HeaderUserMenuProps {
  profile: Perfil;
  onLogout: () => void;
}

export function HeaderUserMenu({ onLogout }: HeaderUserMenuProps) {
  const navigate = useNavigate();
  const { profile, rol, nombre, email, estado, empresaNombre, tiendaNombre } = useUserContext();

  if (!profile || !rol || !nombre || !estado) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ice">
        <Avatar initials={initialsFrom(nombre)} size="sm" />
        <ChevronDown size={14} className="text-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-text">{nombre}</p>
            {email ? <p className="truncate text-xs text-muted">{email}</p> : null}
            <p className="mt-1 text-xs text-muted">
              {ROL_LABEL[rol]} · {ESTADO_LABEL[estado]}
            </p>
            {empresaNombre ? (
              <p className="truncate text-xs text-muted">
                {empresaNombre}
                {tiendaNombre ? ` · ${tiendaNombre}` : ''}
              </p>
            ) : null}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate('/perfil')}>
            <UserIcon size={14} />
            Mi perfil
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/configuracion')}>
            <Settings size={14} />
            Configuración
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/cambiar-contrasena')}>
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
