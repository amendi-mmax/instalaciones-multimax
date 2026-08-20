-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint 9.3
-- GRANT de tabla para `service_role` — `coordinadores`
-- ============================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor (o `supabase db push`)
-- Proyecto: bdevkryrgmttxnlxaisd
-- Requiere: 0001_initial_schema.sql, 0003_service_role_grants_admins_
-- instaladores.sql ya aplicados.
-- Es ADITIVA/no destructiva: no elimina tablas, columnas, filas, policies
-- ni privilegios existentes de ningún otro rol — ver "ROLLBACK" al final.
--
-- ────────────────────────────────────────────────────────────
-- CAUSA RAÍZ (mismo patrón ya diagnosticado y resuelto en `0003` para
-- `admins`/`instaladores` — confirmado en vivo vía MCP para `coordinadores`
-- durante el análisis previo de este Sprint, sin repetir la auditoría
-- completa aquí)
-- ────────────────────────────────────────────────────────────
-- `service_role` tiene `rolbypassrls = true` pero NO es superusuario ni
-- dueño de `public.coordinadores` (dueño real: `postgres`) — el chequeo de
-- privilegios `GRANT` a nivel de tabla ocurre ANTES de evaluar RLS, así que
-- `BYPASSRLS` no sustituye al `GRANT` de objeto. Confirmado vía
-- `information_schema.role_table_grants`: `service_role` solo tenía
-- `REFERENCES`/`TRIGGER`/`TRUNCATE` sobre `coordinadores` (sin
-- `SELECT`/`INSERT`/`UPDATE`/`DELETE`) — mismo hueco ya documentado y
-- dejado pendiente explícitamente en `0003` para esta tabla.
--
-- ────────────────────────────────────────────────────────────
-- ALCANCE de esta migración (mínimo necesario para Sprint 9.3)
-- ────────────────────────────────────────────────────────────
-- Habilita que la Edge Function `admin-operations` (acciones nuevas
-- `invite_coordinador`/`set_coordinador_activo`) pueda leer/escribir
-- `public.coordinadores` con `service_role`, exactamente igual que ya
-- puede hacerlo con `admins`/`instaladores` desde `0003`.
-- No se otorga ningún privilegio a `anon`/`authenticated` en esta
-- migración (eso es responsabilidad de RLS/policies, no de este archivo).
-- ============================================================


-- ============================================================
-- 1. CORRECCIÓN — GRANT explícito para `service_role`
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coordinadores TO service_role;


-- ============================================================
-- VALIDACIÓN (ejecutar después de la sección 1)
-- ============================================================
-- select grantee, table_name, string_agg(privilege_type, ', ' order by privilege_type) as privileges
-- from information_schema.role_table_grants
-- where grantee = 'service_role'
--   and table_schema = 'public'
--   and table_name = 'coordinadores'
-- group by grantee, table_name;


-- ============================================================
-- ROLLBACK (solo si algo sale mal -- restaura el estado confirmado antes de
-- este Sprint: sin este GRANT, exactamente como hoy)
-- ============================================================
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON public.coordinadores FROM service_role;

-- ============================================================
-- FIN DE LA MIGRACIÓN 0015
-- ============================================================
