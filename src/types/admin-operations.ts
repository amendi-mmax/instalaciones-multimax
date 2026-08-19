/**
 * admin-operations.ts — tipos de comunicación con la Edge Function
 * `admin-operations` (Sprint 6.2). Espejo exacto del contrato real definido
 * en `supabase/functions/admin-operations/index.ts` (`InviteInstaladorPayload`/
 * `SuspendReactivateInstaladorPayload`/`ActionRequest`/`jsonResponse`) — no se
 * declara acá ningún campo que la función no lea o no devuelva.
 *
 * Sprint B (Gestión de Administradores y Coordinadores) agrega
 * `InviteAdminPayload`/`SetAdminActivoPayload` — espejo de las acciones
 * `invite_admin`/`set_admin_activo`, ya desplegadas en Producción (Edge
 * Function versión 7). No se agrega ningún tipo para Coordinadores todavía:
 * `admin-operations` no tiene ninguna acción `invite_coordinador`/
 * `set_coordinador_activo` desplegada (Sprint D, pendiente) — declarar un
 * tipo/servicio para una acción que la función respondería con
 * `400 "Acción no reconocida"` sería un contrato falso. Ver
 * `ANALISIS_GESTION_USUARIOS.md` para el detalle completo.
 */

export interface InviteInstaladorPayload {
  nombre: string;
  email: string;
  telefono?: string | null;
  provincia?: string | null;
  zona?: string | null;
  /** Sprint 8.4 -- FK real a `empresas_instaladoras` (migración `0010`). */
  empresa_instaladora_id?: string | null;
}

/** Mismo shape que `SuspendReactivateInstaladorPayload` en la Edge Function. */
export interface SuspendInstaladorPayload {
  instalador_id: string;
}

export interface ReactivateInstaladorPayload {
  instalador_id: string;
}

/**
 * Sprint B -- espejo exacto de `InviteAdminPayload` en la Edge Function
 * (`admin-operations/index.ts`). `empresa_id`/`es_principal`/`activo`/`rol`
 * NUNCA viajan acá -- la función los fuerza server-side (ver su propio
 * JSDoc); el caller nunca los controla, ni siquiera declarándolos en el
 * tipo del payload que arma este archivo.
 */
export interface InviteAdminPayload {
  nombre: string;
  email: string;
  telefono?: string | null;
}

/** Sprint B -- espejo exacto de `SetAdminActivoPayload`. Nunca incluye `es_principal`. */
export interface SetAdminActivoPayload {
  admin_id: string;
  activo: boolean;
}

/**
 * Espejo de `jsonResponse(body, status)` — la Edge Function siempre responde
 * `{ ok: true, data }` (200) o `{ ok: false, error: { message, rollback? } }`
 * (400/401/403/404/500/502).
 */
export type AdminOperationResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string; rollback?: string } };
