-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint 6.2 (estabilización)
-- RLS — SELECT de `admin` sobre `public.instaladores`
-- ============================================================
-- Requiere: 0001_initial_schema.sql, 0002_auth_roles_rls.sql,
-- 0003_service_role_grants_admins_instaladores.sql ya aplicados.
-- Es ADITIVA/no destructiva: agrega una policy nueva, no modifica ni
-- elimina ninguna de las 2 policies existentes de `instaladores`.
--
-- ────────────────────────────────────────────────────────────
-- CAUSA RAÍZ (Issue 1, validación funcional del Sprint 6.2)
-- ────────────────────────────────────────────────────────────
-- El listado de `AdminInstaladores` (`instaladoresRepository.getByEmpresaId`,
-- vía el cliente `authenticated` del navegador) devuelve `[]` aunque:
--   - el registro existe en `public.instaladores` (confirmado por SQL directo)
--   - `empresa_id` es correcto
--   - `authenticated` SÍ tiene GRANT SELECT sobre la tabla
--     (`information_schema.role_table_grants`, verificado)
-- `pg_policies` confirma que `instaladores` solo tiene 2 policies de SELECT:
--   1. "coordinadores ven instaladores de su empresa" -- auth.uid() debe
--      existir en `coordinadores`
--   2. "instaladores ven su propio perfil" -- auth.uid() = instaladores.id
-- Ninguna cubre a un usuario `admin` (fila en `public.admins`, no en
-- `coordinadores` ni en `instaladores`) -- RLS filtra el 100% de las filas
-- para esa sesión, y PostgREST responde `200 []`, no un error. Esta policy
-- ya estaba diseñada (no aplicada) en
-- `docs/architecture/backend/SPRINT_6_1_INSTALADORES_RLS_FIX.sql`.
--
-- ALCANCE: exclusivamente una policy nueva de SELECT sobre `instaladores`,
-- scoped por empresa (mismo criterio que la policy ya existente de
-- `coordinadores`). No se tocan INSERT/UPDATE/DELETE (siguen exclusivos de
-- la Edge Function `admin-operations`, `service_role`). No se toca ninguna
-- otra tabla.
-- ============================================================


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


-- ============================================================
-- VALIDACIÓN (ejecutar después de la sección 1)
-- ============================================================
-- select schemaname, tablename, policyname, permissive, roles, cmd, qual
-- from pg_policies
-- where tablename = 'instaladores'
-- order by policyname;
--
-- Validación funcional: recargar `AdminInstaladores` en el navegador (como
-- Admin real) y confirmar que el listado ya no muestra "Instaladores (0)".


-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP POLICY IF EXISTS "admins ven instaladores de su empresa" ON public.instaladores;

-- ============================================================
-- FIN DE LA MIGRACIÓN 0004
-- ============================================================
