/**
 * profile.service.ts — resolución del perfil autenticado real contra el
 * modelo de datos oficial de Producción (Sprint 4.2.1, "Sistema de
 * Autenticación y Experiencia de Inicio de Sesión").
 *
 * Este servicio es lógica de negocio deliberada (a diferencia de
 * `auth.service.ts`/`supabase.service.ts`, que son genéricos): decide CÓMO
 * se determina el rol de una sesión real, algo que ninguna capa anterior
 * de este proyecto había implementado todavía (`AuthProvider.tsx`/
 * `SessionProvider.tsx`, Sprint 4.1.1, documentan explícitamente que dejan
 * esta decisión pendiente para "un Sprint funcional futuro" -- este es ese
 * Sprint).
 *
 * ## Estrategia de resolución de rol
 *
 * El schema real (`ARCHITECTURE.md §9.9`, `docs/database/
 * DATABASE_INVENTORY.md`) NO tiene una tabla `usuarios` unificada con
 * columna `rol`: tiene 3 tablas separadas (`admins`, `coordinadores`,
 * `instaladores`), cada una con `id` = `auth.users.id` directamente (sin
 * `auth_id` intermedio, confirmado en Sprints anteriores de Fase 4). No
 * existe ninguna columna/tabla que indique de antemano en cuál de las 3
 * vive un usuario dado -- la única forma real de saberlo es consultar cada
 * tabla por ese `id` y ver cuál devuelve una fila.
 *
 * Se consulta en este orden de precedencia, deteniéndose en el primer
 * resultado encontrado: `admins` -> `coordinadores` -> `instaladores`. Este
 * orden es una decisión de este Sprint (documentada aquí y en el informe
 * `SPRINT_4_2_1_AUTH_REPORT.md`): no hay ninguna fuente que indique que un
 * mismo `id` pueda existir simultáneamente en más de una tabla (de hecho
 * sería un dato corrupto si ocurriera), así que el orden solo importa como
 * salvaguarda defensiva ante ese caso corrupto, no como regla de negocio real.
 *
 * ## Limitación crítica conocida, reportada explícitamente (no resuelta acá)
 *
 * Según la propia auditoría de RLS ya documentada en los JSDoc de
 * `admins.repository.ts`/`coordinadores.repository.ts`/`empresas.repository.ts`/
 * `tiendas.repository.ts` (Sprint 4.1.1/4.0.1): esas 4 tablas tienen RLS
 * *habilitado* pero **cero policies** para el rol `authenticated` -- solo
 * `instaladores` (y `trabajos`) tienen policies reales. Esto significa que,
 * bajo la configuración de base de datos actual, `resolveProfile()` para un
 * usuario real de `admins`/`coordinadores` devolverá "no encontrado" (0
 * filas, no un error) aunque la fila exista -- no por un bug de este
 * servicio, sino porque RLS bloquea la lectura antes de que llegue código de
 * aplicación. Es un bloqueador real de backend para probar login de
 * admin/coordinador de punta a punta, fuera del alcance de este Sprint (no
 * se pidió trabajo de RLS/migraciones) -- documentado con máxima visibilidad
 * en `SPRINT_4_2_1_AUTH_REPORT.md` en vez de silenciarlo.
 */
import { adminsRepository } from '@/repositories/admins.repository';
import { coordinadoresRepository } from '@/repositories/coordinadores.repository';
import { instaladoresRepository } from '@/repositories/instaladores.repository';
import { empresasRepository } from '@/repositories/empresas.repository';
import { tiendasRepository } from '@/repositories/tiendas.repository';
import type { ServiceResult, HandymaxServiceError } from '@/services/supabase.service';
import type { EstadoPerfil, Perfil } from '@/types/perfil';

function errorResult(message: string, code: string): { ok: false; error: HandymaxServiceError } {
  return { ok: false, error: { message, code, details: null, hint: null, cause: null } };
}

async function resolveEmpresaNombre(empresaId: string): Promise<string | null> {
  const result = await empresasRepository.getById(empresaId);
  return result.ok ? (result.data?.nombre ?? null) : null;
}

async function resolveTiendaNombre(tiendaId: string): Promise<string | null> {
  const result = await tiendasRepository.getById(tiendaId);
  return result.ok ? (result.data?.nombre ?? null) : null;
}

function estadoDesdeFlags(activo: boolean, suspendido: boolean): EstadoPerfil {
  if (suspendido) return 'suspendido';
  if (!activo) return 'inactivo';
  return 'activo';
}

/**
 * Resuelve el `Perfil` real para un `authUserId` (= `session.user.id`),
 * probando `admins` -> `coordinadores` -> `instaladores` en ese orden.
 * `authEmail` es el correo de la sesión de Supabase Auth, usado como
 * respaldo cuando la tabla del rol no tiene columna `email` propia
 * (`coordinadores`, ver `types/perfil.ts`).
 *
 * Devuelve `ok:false` únicamente ante un error real de Supabase (red, RLS
 * mal configurado devolviendo un error explícito, etc.) -- "ninguna de las
 * 3 tablas tiene una fila para este id" también se modela como `ok:false`
 * con `code: 'PROFILE_NOT_FOUND'`, para que el llamador (`AuthProvider`)
 * pueda distinguirlo de un error de red/permmisos genuino si lo necesita,
 * sin lanzar excepciones.
 */
export async function resolveProfile(
  authUserId: string,
  authEmail: string | null,
): Promise<ServiceResult<Perfil>> {
  const adminResult = await adminsRepository.getById(authUserId);
  if (!adminResult.ok) return adminResult;
  if (adminResult.data) {
    const row = adminResult.data;
    const empresaNombre = await resolveEmpresaNombre(row.empresa_id);
    return {
      ok: true,
      data: {
        id: row.id,
        rol: 'admin',
        nombre: row.nombre,
        correo: row.email ?? authEmail,
        avatarUrl: null,
        estado: estadoDesdeFlags(row.activo, false),
        empresaId: row.empresa_id,
        empresaNombre,
        tiendaId: null,
        tiendaNombre: null,
      },
    };
  }

  const coordResult = await coordinadoresRepository.getById(authUserId);
  if (!coordResult.ok) return coordResult;
  if (coordResult.data) {
    const row = coordResult.data;
    const [empresaNombre, tiendaNombre] = await Promise.all([
      resolveEmpresaNombre(row.empresa_id),
      resolveTiendaNombre(row.tienda_id),
    ]);
    return {
      ok: true,
      data: {
        id: row.id,
        rol: 'coordinador',
        nombre: row.nombre,
        correo: authEmail,
        avatarUrl: null,
        estado: estadoDesdeFlags(row.activo, false),
        empresaId: row.empresa_id,
        empresaNombre,
        tiendaId: row.tienda_id,
        tiendaNombre,
      },
    };
  }

  const instResult = await instaladoresRepository.getById(authUserId);
  if (!instResult.ok) return instResult;
  if (instResult.data) {
    const row = instResult.data;
    const empresaNombre = await resolveEmpresaNombre(row.empresa_id);
    return {
      ok: true,
      data: {
        id: row.id,
        rol: 'instalador',
        nombre: row.nombre,
        correo: row.email ?? authEmail,
        avatarUrl: null,
        estado: estadoDesdeFlags(row.activo, row.suspendido),
        empresaId: row.empresa_id,
        empresaNombre,
        tiendaId: null,
        tiendaNombre: null,
      },
    };
  }

  return errorResult(
    'No se encontró un perfil para este usuario en admins/coordinadores/instaladores.',
    'PROFILE_NOT_FOUND',
  );
}
