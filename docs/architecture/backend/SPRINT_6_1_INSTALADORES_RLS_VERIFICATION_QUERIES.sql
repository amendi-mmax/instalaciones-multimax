-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint 6.1
-- Verificación EN VIVO de RLS real sobre public.instaladores
-- ============================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor (proyecto real de
-- Producción, bdevkryrgmttxnlxaisd).
--
-- MOTIVO: este entorno de trabajo no tiene acceso de red a Supabase y no
-- puede verificar el estado real de RLS/GRANTs directamente (misma
-- limitación estructural de cada ronda de este proyecto). La única fuente
-- disponible aquí es `docs/database/DATABASE_INVENTORY.md` §2.5 (auditoría
-- de una ronda ANTERIOR de este proyecto, no de esta sesión), que documenta
-- exactamente 2 policies de SELECT sobre `instaladores` y ninguna de
-- INSERT/UPDATE/DELETE -- pero no confirma si la policy #2 ("coordinadores
-- ven instaladores de su empresa") también cubre al rol `admin`.
--
-- Ejecutar las 2 consultas de abajo y reportar el resultado completo antes
-- de que se genere/ejecute cualquier corrección definitiva -- consistente
-- con el mismo patrón ya usado en el Sprint 5.2.3.4 (RLS de `tiendas`).
-- Ambas son de SOLO LECTURA (no modifican nada).
-- ============================================================


-- ------------------------------------------------------------
-- 1. Policies reales actuales sobre `instaladores` (nombre, comando,
--    roles, y el `qual`/`with_check` EXACTOS -- esto es lo que confirma o
--    descarta si `admin` ya está cubierto por alguna policy existente)
-- ------------------------------------------------------------
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename = 'instaladores'
order by policyname;

-- Esperado según `DATABASE_INVENTORY.md` (a confirmar, no asumido):
--   - "instaladores ven su propio perfil"              | SELECT | qual: id = auth.uid()
--   - "coordinadores ven instaladores de su empresa"    | SELECT | qual: (subquery a coordinadores.empresa_id)
-- Prestar especial atención a si el `qual` de la segunda fila menciona
-- `admins` en algún OR/EXISTS adicional, o si es exclusivamente sobre
-- `coordinadores` (en cuyo caso un `admin` real NO puede leer esta tabla
-- hoy, y SPRINT_6_1_INSTALADORES_RLS_FIX.sql sí hace falta ejecutarlo).


-- ------------------------------------------------------------
-- 2. GRANTs de tabla reales para `authenticated` sobre `instaladores`
--    (la capa de privilegios SQL estándar, evaluada ANTES que RLS -- si
--    falta el GRANT de SELECT, ninguna policy alcanza a aplicarse nunca)
-- ------------------------------------------------------------
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'instaladores'
  and grantee = 'authenticated'
order by privilege_type;

-- Esperado (a confirmar): al menos SELECT presente para `authenticated`
-- (ya que las 2 policies de SELECT documentadas no tendrían ningún efecto
-- sin el GRANT correspondiente). Si aparece también INSERT/UPDATE/DELETE
-- para `authenticated` sin ninguna policy que lo respalde, eso NO habilita
-- nada por sí solo (RLS sigue bloqueando sin policy), pero es información
-- útil para decidir si en un Sprint futuro conviene mover más escritura
-- fuera de la Edge Function hacia RLS directo.


-- ------------------------------------------------------------
-- 3. (Opcional, informativo) Confirmar que RLS sigue habilitado sobre
--    `instaladores` (no debería haber cambiado, pero se verifica sin
--    asumir nada)
-- ------------------------------------------------------------
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname = 'instaladores';

-- Esperado: relrowsecurity = true.

-- ============================================================
-- FIN — reportar el resultado completo de las 3 consultas de vuelta antes
-- de ejecutar SPRINT_6_1_INSTALADORES_RLS_FIX.sql.
-- ============================================================
