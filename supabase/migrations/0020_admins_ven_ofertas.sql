-- ============================================================
-- HANDYMAX · Multimax Despacho — Ajustes funcionales del flujo Instalador
-- Administradores pueden ver ofertas de trabajos de su empresa
-- ============================================================
-- Requiere: 0001..0019 ya aplicadas. Es ADITIVA/no destructiva: agrega 1
-- policy RLS nueva de SELECT, no modifica ni elimina ninguna existente.
--
-- ────────────────────────────────────────────────────────────
-- CAUSA RAÍZ (auditoría de seguridad previa, confirmada vía MCP en vivo
-- contra `pg_policies` -- no asumida)
-- ────────────────────────────────────────────────────────────
-- `public.ofertas` tiene exactamente 3 policies reales, ninguna reconoce
-- `public.admins`:
--   - "coordinadores ven ofertas de su empresa" (SELECT, scoped vía
--     `coordinadores.empresa_id`)
--   - "instaladores ven sus propias ofertas" (SELECT, `instalador_id = auth.uid()`)
--   - "instaladores envian su propia oferta" (INSERT, `instalador_id = auth.uid()`)
-- `authenticated` sí tiene el GRANT de tabla `SELECT` (verificado), pero
-- sin una policy que lo cubra, RLS devuelve `0` filas para un Admin real
-- -- sin error, silenciosamente (mismo patrón de hueco ya diagnosticado y
-- corregido para `trabajos` en `0005_admins_select_trabajos.sql`).
--
-- Consecuencia funcional: `ResponsesPanel` (`ofertasRepository.getByTrabajoId()`)
-- no puede mostrarle ofertas reales a un Administrador -- sin esta policy,
-- el flujo "Admin ve ofertas → selecciona instalador → asigna" (ya
-- habilitado a nivel de escritura por `0019`) queda incompleto: el Admin
-- podría asignar, pero nunca ver a quién.
--
-- ────────────────────────────────────────────────────────────
-- ALCANCE (mínimo privilegio, sin ampliar nada más)
-- ────────────────────────────────────────────────────────────
-- 1 policy nueva, exclusivamente `SELECT`, mismo criterio scoped-por-empresa
-- ya usado en `0005`/`0019` (`EXISTS`/`JOIN` contra `admins` filtrado por
-- `a.id = auth.uid()` y `a.empresa_id = <tabla>.empresa_id`). Sin
-- `INSERT`/`UPDATE`/`DELETE` -- un Admin evalúa ofertas para decidir a
-- quién asignar (vía `asignar_instalador()`, ya cubierto por `0019`), pero
-- nunca crea/edita/borra una oferta directamente. Sin acceso cross-tenant:
-- el `JOIN`/subconsulta exige la MISMA empresa entre el trabajo de la
-- oferta y el Admin autenticado.
-- ============================================================


-- ============================================================
-- 1. NUEVA POLICY — admins ven ofertas de su empresa
-- ============================================================
DROP POLICY IF EXISTS "admins ven ofertas de su empresa" ON public.ofertas;
CREATE POLICY "admins ven ofertas de su empresa"
    ON public.ofertas FOR SELECT
    TO authenticated
    USING (
        trabajo_id IN (
            SELECT t.id
            FROM public.trabajos t
            JOIN public.admins a ON a.empresa_id = t.empresa_id
            WHERE a.id = auth.uid()
        )
    );


-- ============================================================
-- VALIDACIÓN (ejecutar después de aplicar)
-- ============================================================
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where tablename = 'ofertas'
-- order by policyname;
-- -- debe mostrar 4 policies: las 3 ya existentes (sin cambios) + esta nueva.
--
-- Validación funcional: `SET LOCAL ROLE authenticated` simulando un Admin
-- real (`request.jwt.claims` con su `sub`), `SELECT * FROM ofertas WHERE
-- trabajo_id = '<trabajo real de su empresa>'` dentro de `BEGIN...ROLLBACK`
-- -- debe devolver filas. Repetir con un `trabajo_id` de OTRA empresa --
-- debe devolver `0` filas (aislamiento cross-tenant).


-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP POLICY IF EXISTS "admins ven ofertas de su empresa" ON public.ofertas;

-- ============================================================
-- FIN DE LA MIGRACIÓN 0020
-- ============================================================
