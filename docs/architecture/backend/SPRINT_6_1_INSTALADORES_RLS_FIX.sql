-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint 6.1
-- Corrección candidata de RLS — SELECT de `admin` sobre `instaladores`
-- ============================================================
-- ⚠️ CONDICIONADO: ejecutar ÚNICAMENTE si la consulta 1 de
-- `SPRINT_6_1_INSTALADORES_RLS_VERIFICATION_QUERIES.sql` confirma que
-- NINGUNA policy existente de `instaladores` cubre al rol `admin`. Si el
-- `qual` real de "coordinadores ven instaladores de su empresa" YA incluye
-- a `admin` (ej. vía `EXISTS (... WHERE rol IN ('coordinador','admin') ...)`
-- o una policy separada no documentada en `DATABASE_INVENTORY.md`), este
-- archivo NO hace falta ejecutarlo -- ejecutarlo de todas formas no
-- rompería nada (agrega una policy adicional, no reemplaza ninguna), pero
-- sería una policy redundante innecesaria.
--
-- CONTEXTO: `docs/database/DATABASE_INVENTORY.md` §2.5 documenta 2
-- policies de SELECT sobre `instaladores`:
--   1. "instaladores ven su propio perfil"           -- id = auth.uid()
--   2. "coordinadores ven instaladores de su empresa" -- scoped a coordinadores.empresa_id
-- Ninguna de las 2 cubre inequívocamente al rol `admin` (la tabla `admins`
-- es una tabla real separada de `coordinadores` en este modelo -- no hay
-- columna `rol` compartida). Sin esta policy, un Admin real no podría ver
-- el listado de instaladores desde el navegador (ni recibir eventos
-- Realtime de esta tabla, que también respeta RLS).
--
-- ALCANCE: exclusivamente una policy nueva de SELECT sobre `instaladores`,
-- scoped por empresa (mismo criterio que la policy #2 ya existente, que
-- no se modifica ni se elimina). NO se tocan INSERT/UPDATE/DELETE -- toda
-- escritura administrativa pasa por la Edge Function `admin-operations`
-- (`service_role`, se salta RLS por completo) -- ver
-- `SPRINT_6_1_INSTALADORES_SCHEMA_AUDIT_REPORT.md` §4. NO se toca
-- `empresas`/`coordinadores`/`tiendas`/`trabajos`/GRANTs/Auth/`src/`.
-- ============================================================


-- ============================================================
-- 0. VERIFICACIÓN PREVIA (repetir antes de aplicar -- confirma que no
--    existe ya una policy con este nombre exacto, y muestra el estado
--    completo actual para comparar antes/después)
-- ============================================================
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename = 'instaladores'
order by policyname;


-- ============================================================
-- 1. CORRECCIÓN — única policy nueva, exclusivamente SELECT
-- ============================================================
DROP POLICY IF EXISTS "admins ven instaladores de su empresa" ON public.instaladores;

CREATE POLICY "admins ven instaladores de su empresa"
    ON public.instaladores
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.admins a
            WHERE a.id = auth.uid()
              AND a.empresa_id = instaladores.empresa_id
        )
    );

-- No se otorga INSERT/UPDATE/DELETE para `authenticated` -- ver "ALCANCE"
-- arriba. Si un Sprint futuro decide que el propio instalador debe poder
-- actualizar su perfil (ej. `activo = true` tras completar su primer
-- login, ver SPRINT_6_1_INSTALADORES_SCHEMA_AUDIT_REPORT.md §3) o que
-- ciertas escrituras administrativas deban moverse de la Edge Function a
-- RLS directo, eso se audita y agrega en ese Sprint, no en este.


-- ============================================================
-- VALIDACIÓN (ejecutar después de la sección 1)
-- ============================================================
-- 2.1 — confirmar que la policy quedó creada:
--
-- select schemaname, tablename, policyname, permissive, roles, cmd, qual
-- from pg_policies
-- where tablename = 'instaladores' and policyname = 'admins ven instaladores de su empresa';
--
-- 2.2 — validación funcional (requiere que el Admin real ya tenga una fila
-- en `admins` con `empresa_id` igual a la de al menos un instalador real):
-- iniciar sesión como ese Admin y confirmar que un SELECT sobre
-- `instaladores` (vía el cliente `authenticated`, no el SQL Editor con
-- privilegios elevados) devuelve las filas de su empresa, no una lista
-- vacía.


-- ============================================================
-- ROLLBACK (solo si algo sale mal -- restaura el estado confirmado antes
-- de este Sprint: sin esta policy, exactamente como hoy)
-- ============================================================
-- DROP POLICY IF EXISTS "admins ven instaladores de su empresa" ON public.instaladores;

-- ============================================================
-- FIN
-- ============================================================
