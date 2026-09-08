-- ============================================================
-- HANDYMAX · Multimax Despacho — Ajustes funcionales del flujo Instalador
-- Administradores pueden asignar instaladores (además de Coordinadores)
-- ============================================================
-- Requiere: 0001..0018 ya aplicadas. Es ADITIVA/no destructiva: agrega 2
-- policies RLS nuevas de UPDATE, no modifica ni elimina ninguna existente.
--
-- ────────────────────────────────────────────────────────────
-- CAUSA RAÍZ (auditoría previa)
-- ────────────────────────────────────────────────────────────
-- `asignar_instalador(p_trabajo_id, p_instalador_id)` (RPC real, 0001) es
-- `SECURITY INVOKER` -- se ejecuta bajo la sesión de quien la invoca, y
-- hace `UPDATE trabajos` + `UPDATE trabajo_instaladores`. Hoy solo existe
-- policy de UPDATE para `coordinadores` sobre ambas tablas
-- ("coordinadores actualizan su tienda" / "coordinadores actualizan
-- notificaciones de su empresa", ambas 0001) -- ninguna reconoce
-- `public.admins`, la tabla real de administradores (mismo patrón de hueco
-- ya corregido para SELECT en `0005_admins_select_trabajos.sql`). Sin esta
-- migración, un Administrador real (auth.uid() presente en `admins`, sin
-- fila en `coordinadores`) recibiría `0 rows updated` silenciosamente al
-- intentar asignar -- ni error ni efecto, porque RLS no bloquea con un
-- error explícito, simplemente no encuentra filas que actualizar.
--
-- ────────────────────────────────────────────────────────────
-- ALCANCE
-- ────────────────────────────────────────────────────────────
-- 2 policies nuevas, mismo criterio exacto que "admins ven trabajos de su
-- empresa" (0005): `EXISTS (SELECT 1 FROM admins a WHERE a.id = auth.uid()
-- AND a.empresa_id = <tabla>.empresa_id)`. Sin `WITH CHECK` adicional más
-- allá del scoping por empresa -- misma superficie de permiso que ya tiene
-- un Coordinador sobre estas 2 tablas, solo que ahora también accesible
-- para el rol Administrador real. No se toca INSERT/DELETE en ninguna
-- tabla, no se toca ninguna policy de `coordinadores`/`instaladores`.
-- ============================================================


-- ============================================================
-- 1. admins actualizan trabajos de su empresa (necesario para asignar)
-- ============================================================
DROP POLICY IF EXISTS "admins actualizan trabajos de su empresa" ON public.trabajos;
CREATE POLICY "admins actualizan trabajos de su empresa"
    ON public.trabajos FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admins a
            WHERE a.id = auth.uid() AND a.empresa_id = trabajos.empresa_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admins a
            WHERE a.id = auth.uid() AND a.empresa_id = trabajos.empresa_id
        )
    );


-- ============================================================
-- 2. admins actualizan notificaciones (trabajo_instaladores) de su empresa
-- ============================================================
DROP POLICY IF EXISTS "admins actualizan notificaciones de su empresa" ON public.trabajo_instaladores;
CREATE POLICY "admins actualizan notificaciones de su empresa"
    ON public.trabajo_instaladores FOR UPDATE
    TO authenticated
    USING (
        trabajo_id IN (
            SELECT t.id FROM public.trabajos t
            JOIN public.admins a ON a.empresa_id = t.empresa_id
            WHERE a.id = auth.uid()
        )
    )
    WITH CHECK (
        trabajo_id IN (
            SELECT t.id FROM public.trabajos t
            JOIN public.admins a ON a.empresa_id = t.empresa_id
            WHERE a.id = auth.uid()
        )
    );


-- ============================================================
-- VALIDACIÓN (ejecutar después de aplicar)
-- ============================================================
-- select tablename, policyname, cmd, roles
-- from pg_policies
-- where tablename in ('trabajos','trabajo_instaladores') and cmd = 'UPDATE'
-- order by tablename, policyname;
--
-- Validación funcional: `SET LOCAL ROLE authenticated` simulando un admin
-- real (`request.jwt.claims` con su `sub`), invocar
-- `select asignar_instalador('<trabajo_id>', '<instalador_id>')` dentro de
-- `BEGIN...ROLLBACK` y confirmar que `trabajos.estado` pasa a 'assigned'
-- sin error.


-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP POLICY IF EXISTS "admins actualizan trabajos de su empresa" ON public.trabajos;
-- DROP POLICY IF EXISTS "admins actualizan notificaciones de su empresa" ON public.trabajo_instaladores;

-- ============================================================
-- FIN DE LA MIGRACIÓN 0019
-- ============================================================
