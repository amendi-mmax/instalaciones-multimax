-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint 5.2.3.4
-- Corrección RLS — falta policy de SELECT en public.tiendas
-- ============================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor (proyecto real de
-- Producción -- el mismo contra el que se corrieron las 3 consultas de
-- auditoría de la ronda anterior de este mismo Sprint).
--
-- CONTEXTO (diagnóstico completo con evidencia de código en
-- `docs/architecture/frontend/SPRINT_5_2_3_3_COORDINATOR_OPERATIONAL_CONTEXT_AUDIT.md`
-- y `docs/architecture/backend/SPRINT_5_2_3_4_RLS_MASTER_TABLES_REPORT.md`;
-- diagnóstico final de esta ronda en
-- `docs/architecture/backend/SPRINT_5_2_3_4_RLS_TIENDAS_REPORT.md`):
-- `profile.service.ts` → `resolveTiendaNombre(tienda_id)` →
-- `tiendasRepository.getById()` ejecuta `SELECT * FROM tiendas WHERE
-- id = $1` como `authenticated`. `tiendas` tiene RLS habilitado
-- (confirmado, resultado 1 de la auditoría) pero, a diferencia de
-- `empresas`/`coordinadores`, NO tiene ninguna policy (confirmado,
-- resultado 2 de la auditoría: "❌ NO EXISTE ninguna policy"). Sin
-- policy que la autorice, esa fila no puede leerse aunque el GRANT de
-- tabla ya exista (confirmado, resultado 3: `authenticated` ya tiene
-- SELECT sobre `tiendas`) -- RLS deniega por defecto cuando está
-- habilitado y ninguna policy aplica, devolviendo 0 filas (no un
-- error). `.maybeSingle()` traduce eso a `null`, y ese `null` se
-- propaga sin transformación hasta `enabledValue = ''`, bloqueando las
-- 9 opciones de `SucursalSelect`/`PublishModal` -- síntoma reportado y
-- ya trazado línea por línea en el Sprint 5.2.3.3.
--
-- ALCANCE DE ESTA RONDA: exclusivamente `public.tiendas`. NO se toca
-- `empresas` (ya tiene su propia policy, confirmada funcional por la
-- auditoría), NO se toca `coordinadores` (ídem), NO se toca ningún
-- GRANT (ya están completos para las 3 tablas, confirmado resultado 3
-- de la auditoría -- este fix es 100% de RLS, no de privilegios de
-- tabla), NO se toca `trabajos`/`trabajo_instaladores`/`admins`/
-- `instaladores`/Auth/frontend.
--
-- DISEÑO DE LA POLICY (justificación, tal como exige el brief antes de
-- usar cualquier variante amplia): se agrega una policy de SELECT sin
-- acotar por fila (`USING (true)`), replicando el mismo patrón que ya
-- tiene la policy real y confirmada de `empresas` ("usuarios
-- autenticados pueden leer empresas", resultado 2 de la auditoría) --
-- no es un modelo de seguridad nuevo, es extender a `tiendas` el mismo
-- modelo que este proyecto ya usa para su tabla hermana. Justificación
-- adicional, independiente de esa consistencia: `tiendas.nombre` ya se
-- consume como catálogo de solo lectura, sin ningún filtro por
-- pertenencia, desde pantallas ya aprobadas y en producción
-- (`MasterCalendar`, `AdminInstaladores`, Sprint 3.13/3.14) -- el
-- límite real de seguridad de este sistema no está en "qué nombres de
-- tienda puede listar un usuario autenticado" (dato no sensible, un
-- catálogo), sino en qué `trabajos` puede ver/publicar cada
-- Coordinador -- ese límite lo siguen aplicando, sin cambios, las
-- policies reales de `trabajos`/`trabajo_instaladores` (auditadas y
-- corregidas en Sprints 5.2.2.1/5.2.2.2, no tocadas aquí).
--
-- NOTA DE VERIFICACIÓN PENDIENTE: la auditoría de la ronda anterior
-- confirmó el NOMBRE de la policy de `empresas` ("usuarios autenticados
-- pueden leer empresas") pero no su `qual` textual exacto (la consulta
-- a `pg_policies` no se pegó completa). Se asume, por el nombre y por
-- el comportamiento observado (empresas SÍ resuelve `empresaNombre`
-- correctamente en los flujos ya probados), que es una policy sin
-- acotar (`USING (true)` o equivalente) -- si al ejecutar la
-- verificación previa de este archivo (sección 0) el resultado real
-- de `qual` para `empresas` fuera distinto (p. ej. acotado por
-- `empresa_id`), este mismo criterio debería aplicarse a `tiendas` en
-- su lugar, y este archivo debería ajustarse antes de ejecutarse.
-- ============================================================


-- ============================================================
-- 0. VERIFICACIÓN PREVIA (ejecutar y revisar el resultado ANTES de
--    correr la sección 1 -- confirma el estado exacto sobre el que se
--    va a actuar, y permite comparar el `qual` real de `empresas`
--    contra el supuesto documentado arriba)
-- ============================================================
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename in ('tiendas', 'empresas')
order by tablename, policyname;
-- Esperado antes de ejecutar la sección 1: ninguna fila con
-- tablename = 'tiendas' (confirma "NO EXISTE ninguna policy", tal como
-- ya reportó la auditoría); al menos una fila con
-- tablename = 'empresas' or policyname = 'usuarios autenticados pueden leer empresas'.


-- ============================================================
-- 1. CORRECCIÓN — única policy nueva, exclusivamente sobre `tiendas`
-- ============================================================
-- `DROP POLICY IF EXISTS` primero, por convención de este repositorio
-- (`supabase/README.md`, punto 5: "toda migración que agregue RLS debe
-- anteponer DROP POLICY IF EXISTS, Postgres no soporta CREATE POLICY
-- IF NOT EXISTS") -- también evita el error "policy already exists" si
-- este archivo se re-ejecuta por error; no hay nada que este DROP
-- pueda romper porque la auditoría ya confirmó que hoy no existe
-- ninguna policy con este nombre (ni ninguna otra) sobre `tiendas`.
DROP POLICY IF EXISTS "usuarios autenticados pueden leer tiendas" ON public.tiendas;

CREATE POLICY "usuarios autenticados pueden leer tiendas"
    ON public.tiendas
    FOR SELECT
    TO authenticated
    USING (true);

-- No se otorga INSERT/UPDATE/DELETE: no hay ningún síntoma reportado
-- ni evidencia de que algún flujo real ya probado los necesite -- se
-- mantiene el mismo criterio de alcance mínimo ya aplicado en el
-- Sprint 5.2.2.2 (GRANT de `trabajos`). Si un Sprint futuro necesita
-- que un Admin cree/edite tiendas desde la UI, se auditará y agregará
-- en ese momento, no antes.


-- ============================================================
-- VALIDACIÓN (ejecutar después de la sección 1)
-- ============================================================
-- 2.1 — confirmar que la policy quedó creada, con el mismo criterio
-- (USING true, FOR SELECT, TO authenticated) que la de `empresas`:
--
-- select schemaname, tablename, policyname, permissive, roles, cmd, qual
-- from pg_policies
-- where tablename = 'tiendas';
--
-- 2.2 — confirmar que un SELECT como `authenticated` ya no devuelve 0
-- filas (ejecutar autenticado como un usuario real, o revisar el
-- resultado desde el SQL Editor si corre con privilegios elevados que
-- no reflejen RLS -- en ese caso, usar el Editor de API/PostgREST de
-- Supabase, o probar directamente desde la app):
--
-- select id, nombre from public.tiendas;
--
-- 2.3 — validación funcional de punta a punta, sin ningún cambio de
-- frontend (per el alcance de este Sprint): iniciar sesión con un
-- Coordinador real → `resolveTiendaNombre()` debe devolver el nombre
-- real de su tienda (ya no `null`) → `profile.tiendaNombre` no nulo →
-- `OperationalContextProvider.tiendaNombre` no nulo →
-- `CoordinatorLayout.sucursalLockValue` igual al nombre real de la
-- tienda (ya no `''`) → `SucursalSelect` muestra únicamente esa
-- tienda habilitada, las demás 8 deshabilitadas → `PublishModal`
-- abre con esa misma tienda preseleccionada y habilitada → el
-- formulario puede enviarse (ya no queda `sucursal: ''` forzado).
-- Ninguno de estos pasos requiere modificar una sola línea de `src/`.


-- ============================================================
-- ROLLBACK (solo si algo sale mal -- restaura exactamente el estado
-- confirmado por la auditoría antes de este Sprint: `tiendas` con RLS
-- habilitado y cero policies, igual que hoy)
-- ============================================================
-- DROP POLICY IF EXISTS "usuarios autenticados pueden leer tiendas" ON public.tiendas;

-- ============================================================
-- FIN
-- ============================================================
