/**
 * admin-operations.ts — tipos de comunicación con la Edge Function
 * `admin-operations` (Sprint 6.2). Espejo exacto del contrato real definido
 * en `supabase/functions/admin-operations/index.ts` (`InviteInstaladorPayload`/
 * `SuspendReactivateInstaladorPayload`/`ActionRequest`/`jsonResponse`) — no se
 * declara acá ningún campo que la función no lea o no devuelva.
 */

export interface InviteInstaladorPayload {
  nombre: string;
  email: string;
  telefono?: string | null;
  provincia?: string | null;
  zona?: string | null;
}

/** Mismo shape que `SuspendReactivateInstaladorPayload` en la Edge Function. */
export interface SuspendInstaladorPayload {
  instalador_id: string;
}

export interface ReactivateInstaladorPayload {
  instalador_id: string;
}

/**
 * Espejo de `jsonResponse(body, status)` — la Edge Function siempre responde
 * `{ ok: true, data }` (200) o `{ ok: false, error: { message, rollback? } }`
 * (400/401/403/404/500/502).
 */
export type AdminOperationResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string; rollback?: string } };
