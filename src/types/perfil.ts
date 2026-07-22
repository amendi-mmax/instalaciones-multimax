/**
 * perfil.ts — tipo de dominio para el perfil autenticado resuelto (Sprint
 * 4.2.1, "Sistema de Autenticación").
 *
 * El modelo real de Producción (`ARCHITECTURE.md §9.9`, `docs/database/
 * DATABASE_INVENTORY.md`) no tiene una tabla `usuarios` unificada: el rol de
 * la sesión se determina por membresía de fila en una de las 3 tablas
 * `admins`/`coordinadores`/`instaladores` (todas con `id` = `auth.users.id`
 * directamente, sin columna `auth_id` intermedia — ver
 * `src/services/profile.service.ts` para la lógica de resolución completa).
 *
 * `Perfil` es la forma normalizada que expone `useAuth()` una vez resuelto
 * ese rol, independientemente de cuál de las 3 tablas lo originó. Reutiliza
 * el tipo `Rol` ya existente en `types/enums.ts` (mismo literal union que las
 * 3 tablas reales representan) en vez de declarar un tipo paralelo.
 */
import type { Rol } from '@/types/enums';

export type { Rol as RolResuelto } from '@/types/enums';

/**
 * Estado derivado de las columnas booleanas reales (`activo`/`suspendido`) —
 * ninguna de las 3 tablas tiene una columna `estado` literal. `suspendido`
 * solo existe en `instaladores`; para `admins`/`coordinadores` solo puede
 * resultar en `'activo'`/`'inactivo'`.
 */
export type EstadoPerfil = 'activo' | 'suspendido' | 'inactivo';

export interface Perfil {
  /** Mismo valor que `session.user.id` (`auth.users.id`) -- ver nota de cabecera. */
  id: string;
  rol: Rol;
  nombre: string;
  /**
   * `admins`/`instaladores` tienen columna `email` propia; `coordinadores`
   * no la tiene (ver `docs/database/DATABASE_INVENTORY.md` §2.4) -- en ese
   * caso se usa el correo de la sesión de Supabase Auth (`session.user.email`)
   * como respaldo. Puede ser `null` si ninguna de las dos fuentes lo tiene.
   */
  correo: string | null;
  /**
   * Ninguna de las 3 tablas reales tiene columna `avatar`/`avatar_url` hoy
   * (verificado contra `database.generated.ts`) -- queda en `null` hasta que
   * esa columna exista; el consumidor (`HeaderUserMenu`) ya está preparado
   * para usarla cuando aparezca (ver Sprint 4.2.1 report, sección
   * "Decisiones técnicas").
   */
  avatarUrl: string | null;
  estado: EstadoPerfil;
  empresaId: string;
  empresaNombre: string | null;
  /**
   * Solo `coordinadores` tiene `tienda_id` (1:1). `admins`/`instaladores` no
   * están ligados a una tienda específica en el schema real -- queda en
   * `null` para esos dos roles, no es un dato faltante.
   */
  tiendaId: string | null;
  tiendaNombre: string | null;
}
