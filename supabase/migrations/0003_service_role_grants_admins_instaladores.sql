-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint 6.2
-- GRANT de tabla para `service_role` — `admins` / `instaladores`
-- ============================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor (o `supabase db push`)
-- Proyecto: bdevkryrgmttxnlxaisd
-- Requiere: 0001_initial_schema.sql, 0002_auth_roles_rls.sql ya aplicados.
-- Es ADITIVA/no destructiva: no elimina tablas, columnas, filas, policies
-- ni privilegios existentes de ningún otro rol — ver "ROLLBACK" al final.
--
-- ────────────────────────────────────────────────────────────
-- CAUSA RAÍZ (diagnosticada y confirmada en vivo contra Producción,
-- Sprint 6.1 → auditoría de permisos vía MCP de Supabase, sin repetir aquí)
-- ────────────────────────────────────────────────────────────
-- `serviceRoleClient.from('admins')` dentro de la Edge Function
-- `admin-operations` (`supabase/functions/admin-operations/index.ts`,
-- `verifyCaller()`) devuelve `permission denied for table admins` en vez de
-- evaluar RLS. Confirmado con consultas reales:
--   - `pg_roles`: `service_role` → `rolsuper = false`, `rolbypassrls = true`.
--   - `pg_tables`/`pg_class`: dueño real de `admins`/`instaladores` es
--     `postgres`, no `service_role`.
--   - `information_schema.role_table_grants` / `aclexplode(relacl)`: NINGUNA
--     de las 9 tablas de `public` tiene `SELECT`/`INSERT`/`UPDATE`/`DELETE`
--     otorgado a `service_role` — solo `REFERENCES`/`TRIGGER`/`TRUNCATE`/
--     `MAINTAIN` (privilegios que nunca requiere una query normal).
-- En Postgres, el chequeo de privilegios `GRANT` a nivel de tabla ocurre
-- ANTES de evaluar RLS. `BYPASSRLS` únicamente salta la evaluación de
-- *policies* — no sustituye al `GRANT` de objeto. Como `service_role` no es
-- superusuario ni dueño de estas tablas, necesita el `GRANT` explícito igual
-- que cualquier rol no privilegiado.
--
-- ────────────────────────────────────────────────────────────
-- ALCANCE de esta migración (mínimo necesario para Sprint 6.2)
-- ────────────────────────────────────────────────────────────
-- Únicamente las 2 tablas que `admin-operations` toca hoy:
--   - `public.admins`       -- `verifyCaller()`: SELECT (confirmar admin real)
--   - `public.instaladores` -- `inviteInstalador()`/`setSuspendido()`:
--                               SELECT + INSERT + UPDATE
-- `DELETE` se incluye por completitud/simetría con el resto de la capa de
-- repositorios (`instaladores.repository.ts` ya expone `remove()`), aunque
-- la Edge Function no lo usa todavía -- evita tener que volver a tocar este
-- GRANT si un Sprint futuro lo necesita.
-- No se otorga ningún privilegio a `anon`/`authenticated` en esta migración
-- (eso es responsabilidad de RLS/policies, no de este archivo). No se tocan
-- las 7 tablas restantes de `public` (`empresas`, `tiendas`, `coordinadores`,
-- `trabajos`, `trabajo_instaladores`, `ofertas`) -- mismo hueco de GRANT
-- confirmado en ellas, pero fuera del alcance de este Sprint; queda
-- documentado para una corrección futura si algún flujo de `service_role`
-- llega a necesitarlas.
-- ============================================================


-- ============================================================
-- 1. CORRECCIÓN — GRANT explícito para `service_role`
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instaladores TO service_role;


-- ============================================================
-- VALIDACIÓN (ejecutar después de la sección 1)
-- ============================================================
-- select grantee, table_name, string_agg(privilege_type, ', ' order by privilege_type) as privileges
-- from information_schema.role_table_grants
-- where grantee = 'service_role'
--   and table_schema = 'public'
--   and table_name in ('admins', 'instaladores')
-- group by grantee, table_name
-- order by table_name;
--
-- Validación funcional: invocar `admin-operations` (`action: 'invite_instalador'`
-- o cualquier acción) con un JWT real de un Admin existente y confirmar que
-- ya no responde `403`/`permission denied` -- ver logs (`get_logs`,
-- servicio `edge-function`) tras la invocación.


-- ============================================================
-- ROLLBACK (solo si algo sale mal -- restaura el estado confirmado antes de
-- este Sprint: sin estos GRANT, exactamente como hoy)
-- ============================================================
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON public.admins FROM service_role;
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON public.instaladores FROM service_role;

-- ============================================================
-- FIN DE LA MIGRACIÓN 0003
-- ============================================================
