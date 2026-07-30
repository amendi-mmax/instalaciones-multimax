-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint 7.1 (validación funcional)
-- RLS — SELECT de `admin` sobre `public.trabajos`
-- ============================================================
-- Requiere: 0001_initial_schema.sql, 0002_auth_roles_rls.sql ya aplicados.
-- Es ADITIVA/no destructiva: agrega una policy nueva, no modifica ni
-- elimina ninguna de las 4 policies existentes de `trabajos`.
--
-- ────────────────────────────────────────────────────────────
-- CAUSA RAÍZ (validación funcional del Sprint 7.1 — "Calendario Maestro
-- no muestra el trabajo recién publicado")
-- ────────────────────────────────────────────────────────────
-- `master-calendar.tsx` (real desde este Sprint, antes 100% mock) llama a
-- `trabajosRepository.getAll()` bajo la sesión del Administrador real
-- (`public.admins`). Las 4 policies existentes de `trabajos` reconocen
-- únicamente `auth.uid()` presente en `public.coordinadores` (incluida la
-- rama "admin", que en este modelo es una fila de `coordinadores` con
-- `rol = 'admin'` -- un concepto DISTINTO de `public.admins`, la tabla que
-- usa el resto de la aplicación para `profile.rol === 'admin'`, Sprint
-- 4.2.1). El usuario real de prueba ("Administrador Principal") existe
-- únicamente en `public.admins`, sin fila en `coordinadores` -- ninguna
-- policy de `trabajos` lo reconoce, RLS devuelve `[]` para el 100% de los
-- trabajos (no solo el más reciente), confirmado contra Producción.
-- `authenticated` ya tiene GRANT SELECT sobre `trabajos` (verificado) --
-- el hueco es exclusivamente de policy, no de privilegios de tabla.
--
-- ALCANCE: exclusivamente una policy nueva de SELECT sobre `trabajos`,
-- scoped por empresa -- mismo criterio ya usado por la policy real de
-- `coordinadores` sobre esta misma tabla, y por la policy ya aprobada
-- "admins ven instaladores de su empresa" (migración 0004). No se tocan
-- INSERT/UPDATE (siguen exclusivos de `coordinadores`, sin cambios en este
-- Sprint -- publicar/actualizar trabajos sigue siendo responsabilidad del
-- Coordinador, no del Administrador). No se toca ninguna otra tabla ni
-- ninguna policy existente.
-- ============================================================


-- ============================================================
-- 1. CORRECCIÓN — única policy nueva, exclusivamente SELECT
-- ============================================================
DROP POLICY IF EXISTS "admins ven trabajos de su empresa" ON public.trabajos;

CREATE POLICY "admins ven trabajos de su empresa"
    ON public.trabajos
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.admins a
            WHERE a.id = auth.uid()
              AND a.empresa_id = trabajos.empresa_id
        )
    );


-- ============================================================
-- VALIDACIÓN (ejecutar después de la sección 1)
-- ============================================================
-- select schemaname, tablename, policyname, permissive, roles, cmd, qual
-- from pg_policies
-- where tablename = 'trabajos'
-- order by policyname;
--
-- Validación funcional: recargar "Calendario Maestro" como Administrador
-- real y confirmar que los trabajos de su empresa (incluido el recién
-- publicado) aparecen en la fecha correspondiente.


-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP POLICY IF EXISTS "admins ven trabajos de su empresa" ON public.trabajos;

-- ============================================================
-- FIN DE LA MIGRACIÓN 0005
-- ============================================================
