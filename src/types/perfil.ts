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
  /**
   * Sprint 6.3 (Onboarding del Instalador) -- espejo de `instaladores.documentos_ok`.
   * Solo `instalador` tiene este concepto en el schema real; `null` para
   * `admin`/`coordinador` (no es un dato faltante, no aplica).
   */
  documentosOk: boolean | null;
  /**
   * Sprint 7.3 (Módulo de Cuenta de Usuario) -- campos adicionales para "Mi
   * Perfil", sin ninguna consulta nueva a Supabase: `resolveProfile()` ya
   * hacía `select('*')` sobre la fila real de `admins`/`coordinadores`/
   * `instaladores` (ver `profile.service.ts`), estos valores ya viajaban en
   * esa misma respuesta -- este Sprint solo los expone en `Perfil`, no los
   * obtiene de ningún lado nuevo.
   *
   * `telefono`: columna propia en `admins`/`instaladores`; `coordinadores`
   * no la tiene -- `null` para ese rol (no es un dato faltante).
   * `provincia`/`zona`: columnas propias únicamente de `instaladores` --
   * `null` para `admin`/`coordinador` (esos roles no tienen ubicación
   * propia en el schema real; la "Sucursal" de un coordinador ya se expone
   * arriba como `tiendaNombre`).
   * `creadoEn`: `created_at` de la fila real (`admins`/`coordinadores`/
   * `instaladores`), presente en las 3 tablas -- fecha de alta del PERFIL,
   * no de la cuenta de Supabase Auth (`auth.users.created_at`, distinta,
   * expuesta aparte por `useAuth().user.created_at` cuando haga falta).
   */
  telefono: string | null;
  provincia: string | null;
  zona: string | null;
  creadoEn: string;
  /**
   * Métricas reales exclusivas de `instaladores` (columnas propias:
   * `rating`/`cumplimiento`/`aceptacion`/`km`) -- `null` para `admin`/
   * `coordinador`, que no tienen ningún concepto equivalente en el schema
   * real. Agrupadas en un sub-objeto (en vez de 4 campos sueltos en
   * `Perfil`) para dejar explícito que son un conjunto que solo existe
   * junto, nunca parcial.
   */
  instaladorInfo: {
    rating: number;
    /** `cumplimiento`/`aceptacion`/`km` son nullable en el schema real (`database.generated.ts`) -- `null` hasta que el instalador acumule historial suficiente. */
    cumplimiento: number | null;
    aceptacion: number | null;
    km: number | null;
  } | null;
  /**
   * Sprint 8.4 -- espejo de `instaladores.empresa_instaladora_id` (FK real
   * a `empresas_instaladoras`, migración `0010_instaladores_empresa_
   * instaladora.sql`). Solo `instalador` tiene este concepto -- `null` para
   * `admin`/`coordinador` (no aplica) y también `null` para un instalador
   * real sin empresa asignada todavía ("Pendiente de asignación" en la UI,
   * mismo criterio que `documentosOk`). El NOMBRE de la empresa no viaja
   * acá -- `InstallerProfile` lo resuelve por separado vía
   * `callNombreEmpresaInstaladora` (RLS de `empresas_instaladoras` es
   * admin-only, Sprint 8.3, sin cambios) porque `resolveProfile()` no debe
   * empezar a conocer una tabla ajena a `admins`/`coordinadores`/
   * `instaladores`.
   */
  empresaInstaladoraId: string | null;
  /**
   * Sprint C (Gestión de Administradores y Coordinadores) -- espejo de
   * `admins.es_principal` (migración `0011`). Solo `admin` tiene este
   * concepto -- `null` para `coordinador`/`instalador` (no aplica), mismo
   * criterio que `documentosOk`/`empresaInstaladoraId`. Determina si la UI
   * puede mostrar las acciones "Invitar administrador"/"Activar-desactivar
   * administrador" -- la autorización real vive exclusivamente en
   * `admin-operations` (`invite_admin`/`set_admin_activo`), esto es solo
   * para no mostrar botones que el servidor va a rechazar igual.
   */
  esPrincipal: boolean | null;
}
