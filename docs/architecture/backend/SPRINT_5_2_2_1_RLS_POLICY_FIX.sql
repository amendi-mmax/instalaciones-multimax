-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint 5.2.2.1 Fix
-- Corrección de recursión RLS (42P17) en "trabajos"
-- ============================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor (proyecto real de
-- Producción -- el mismo donde ya corrieron las pruebas del Sprint
-- 5.2.2.1 con el usuario Coordinador sembrado).
--
-- Contexto completo, diagrama de la recursión, justificación técnica y
-- riesgos: ver `docs/architecture/backend/SPRINT_5_2_2_1_RLS_POLICY_AUDIT_REPORT.md`
-- (secciones 1-9). Este archivo es exclusivamente el SQL ejecutable de la
-- sección 6 de ese reporte, para no tener que copiarlo a mano desde el
-- Markdown.
--
-- QUÉ HACE: rompe el ciclo real "trabajos" ⇄ "trabajo_instaladores"
-- (confirmado por el usuario contra `pg_policies` real) insertando una
-- única función SECURITY DEFINER que reemplaza la subconsulta directa de
-- la policy SELECT "instaladores ven trabajos donde fueron notificados"
-- (trabajos). Ninguna otra policy se toca -- ni las 3 de Coordinador sobre
-- "trabajos", ni las 3 de "trabajo_instaladores" (gestión de
-- notificaciones por coordinadores). RLS permanece habilitado en ambas
-- tablas; no se usa `service_role`; no se elimina ninguna policy sin
-- recrearla de inmediato con el mismo nombre y el mismo alcance de acceso.
--
-- VERIFICACIÓN PREVIA RECOMENDADA (antes de ejecutar): comparar el EXISTS
-- de la función de abajo contra el `qual` real ya visto en `pg_policies`
-- para esa policy -- si el real tiene alguna condición adicional (p. ej.
-- un filtro por `estado`/vigencia del trabajo), agregarla dentro del
-- cuerpo de la función antes de ejecutar, para que el reemplazo sea
-- equivalente y no cambie a quién se le muestra qué trabajo.
-- ============================================================


-- 1. Función SECURITY DEFINER ---------------------------------------
-- Mismo chequeo que ya hacía la policy (¿este trabajo tiene una fila en
-- trabajo_instaladores para el instalador autenticado?) -- la diferencia
-- es que, al ser SECURITY DEFINER, esta consulta interna corre con los
-- privilegios del owner de la función, no con los del invocador, por lo
-- que NO vuelve a disparar las policies RLS de "trabajo_instaladores".
-- Eso es lo que rompe el ciclo: sin este cambio, evaluar esta misma
-- condición como una subconsulta directa en la policy obliga a Postgres a
-- expandir las policies de "trabajo_instaladores", que a su vez
-- subconsultan "trabajos" otra vez -- de ahí la recursión.
CREATE OR REPLACE FUNCTION public.instalador_fue_notificado(p_trabajo_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM trabajo_instaladores ti
        WHERE ti.trabajo_id = p_trabajo_id
        AND ti.instalador_id = auth.uid()
    );
$$;

-- Buena práctica con SECURITY DEFINER: no dejarla ejecutable por roles
-- que no la necesitan (PUBLIC incluye anon/authenticated/etc. por
-- defecto). Solo `authenticated` la necesita (es la única audiencia real
-- de la policy que la usa).
REVOKE ALL ON FUNCTION public.instalador_fue_notificado(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.instalador_fue_notificado(uuid) TO authenticated;


-- 2. Reemplazar (DROP + CREATE con el mismo nombre) la única policy que
--    causaba el ciclo -- no se elimina sin recrearla de inmediato, mismo
--    alcance de acceso para instaladores, cero cambio de comportamiento
--    visible.
DROP POLICY IF EXISTS "instaladores ven trabajos donde fueron notificados" ON trabajos;

CREATE POLICY "instaladores ven trabajos donde fueron notificados"
    ON trabajos
    FOR SELECT
    USING ( public.instalador_fue_notificado(id) );


-- Las policies de Coordinador sobre "trabajos" ("coordinadores ven
-- trabajos de su tienda o de su empresa si admin", "coordinadores
-- publican en su tienda", "coordinadores actualizan su tienda") y las 3
-- de "trabajo_instaladores" (gestión de notificaciones por coordinadores)
-- NO se tocan -- no forman parte del ciclo. El modelo "Coordinador
-- únicamente publica trabajos de su tienda" depende exclusivamente de
-- "coordinadores publican en su tienda", sin relación con esta corrección.


-- ============================================================
-- VALIDACIÓN (ejecutar después de lo de arriba)
-- ============================================================
-- select public.instalador_fue_notificado('00000000-0000-0000-0000-000000000000'::uuid);
--   -- debe ejecutar sin error (confirma que la función compila).
--
-- Repetir la publicación de un trabajo real con el Coordinador ya
-- sembrado (mismo flujo de la app, sin ningún cambio de frontend) -- el
-- INSERT ... RETURNING debe completar sin 42P17.
--
-- select schemaname, tablename, policyname, cmd, qual
-- from pg_policies
-- where tablename = 'trabajos'
-- and policyname = 'instaladores ven trabajos donde fueron notificados';
--   -- confirmar que la nueva definición (con la función) quedó activa.


-- ============================================================
-- ROLLBACK (solo si algo sale mal -- restaura el mismo defecto original,
-- no es una reversión "segura" en el sentido de dejar el sistema mejor)
-- ============================================================
-- DROP POLICY IF EXISTS "instaladores ven trabajos donde fueron notificados" ON trabajos;
-- CREATE POLICY "instaladores ven trabajos donde fueron notificados"
--     ON trabajos FOR SELECT
--     USING (
--         EXISTS (
--             SELECT 1 FROM trabajo_instaladores ti
--             WHERE ti.trabajo_id = trabajos.id
--             AND ti.instalador_id = auth.uid()
--         )
--     );
-- DROP FUNCTION IF EXISTS public.instalador_fue_notificado(uuid);

-- ============================================================
-- FIN
-- ============================================================
