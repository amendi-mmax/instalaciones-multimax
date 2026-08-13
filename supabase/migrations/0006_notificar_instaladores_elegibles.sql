-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint 7.2
-- RPC — notificar_instaladores_elegibles(p_trabajo_id)
-- ============================================================
-- Requiere: 0001_initial_schema.sql, 0002_auth_roles_rls.sql,
-- 0003_service_role_grants_admins_instaladores.sql,
-- 0004_admins_select_instaladores.sql,
-- 0005_admins_select_trabajos.sql ya aplicados.
-- Es ADITIVA/no destructiva: crea una función nueva. No modifica ninguna
-- policy, GRANT, tabla ni columna existente.
--
-- ────────────────────────────────────────────────────────────
-- OBJETIVO (Sprint 7.2 — "Publicación de trabajos", continuación)
-- ────────────────────────────────────────────────────────────
-- Al publicar un trabajo, crea automáticamente un registro en
-- `trabajo_instaladores` (estado='notificado', notificado_at=NOW()) para
-- cada instalador elegible. Regla de elegibilidad, aprobada explícitamente
-- por el usuario, sin excepciones ni inferencia geográfica (sin distancia,
-- sin PostGIS, sin Google Maps):
--   - instaladores.activo = true
--   - instaladores.suspendido = false
--   - misma empresa (instaladores.empresa_id = trabajos.empresa_id)
--   - misma provincia (instaladores.provincia = trabajos.provincia)
--   - misma zona (instaladores.zona = trabajos.zona)
--
-- ────────────────────────────────────────────────────────────
-- POR QUÉ RPC Y NO UN LOOP DESDE EL CLIENTE (decisión explícita del usuario)
-- ────────────────────────────────────────────────────────────
-- Un loop cliente (N × INSERT secuenciales desde el navegador del
-- Coordinador) no es atómico -- una desconexión a mitad del loop dejaría
-- algunos instaladores notificados y otros no, sin ninguna forma de saberlo
-- ni de reintentar de forma segura. Este RPC hace la búsqueda + inserción
-- masiva dentro de una sola función `plpgsql` (una única transacción
-- implícita), mismo patrón ya usado por `submit_bid`/`asignar_instalador`.
--
-- ────────────────────────────────────────────────────────────
-- SEGURIDAD — por qué NO necesita SECURITY DEFINER ni ningún GRANT/policy
-- nuevo (verificado explícitamente antes de escribir este archivo)
-- ────────────────────────────────────────────────────────────
-- Se ejecuta como SECURITY INVOKER (default, igual que `submit_bid` y
-- `asignar_instalador` -- ninguno de los dos usa SECURITY DEFINER), bajo la
-- sesión del Coordinador que publica. Las 3 operaciones que hace ya están
-- cubiertas por policies RLS reales, existentes antes de esta migración:
--   - SELECT sobre `trabajos`   -> "coordinadores ven trabajos de su tienda o de su empresa si admi"
--   - SELECT sobre `instaladores` -> "coordinadores ven instaladores de su empresa"
--   - INSERT sobre `trabajo_instaladores` -> "coordinadores crean notificaciones de su empresa"
-- Por eso esta migración contiene EXCLUSIVAMENTE la definición de la
-- función -- ningún GRANT, ninguna policy nueva.
--
-- ────────────────────────────────────────────────────────────
-- IDEMPOTENCIA (documentado explícitamente, a pedido del usuario)
-- ────────────────────────────────────────────────────────────
-- `trabajo_instaladores` tiene una constraint real
-- `UNIQUE (trabajo_id, instalador_id)` (verificado contra `pg_constraint`
-- antes de escribir este archivo: `trabajo_instaladores_trabajo_id_instalador_id_key`).
-- El `INSERT ... ON CONFLICT (trabajo_id, instalador_id) DO NOTHING` de
-- abajo se apoya en esa constraint real (mismo patrón defensivo que ya usa
-- `submit_bid` sobre `ofertas`): si este RPC se invoca más de una vez para
-- el mismo `p_trabajo_id` (reintento de red, doble click, etc.), NO genera
-- registros duplicados ni altera los `notificado_at`/`estado` de
-- notificaciones ya existentes -- cada instalador elegible se notifica como
-- máximo una vez por trabajo, sin importar cuántas veces se llame esta
-- función para ese mismo trabajo.
--
-- ────────────────────────────────────────────────────────────
-- VALOR DE RETORNO
-- ────────────────────────────────────────────────────────────
-- `RETURNS integer` -- cantidad de instaladores efectivamente notificados
-- en ESTA invocación (vía `GET DIAGNOSTICS ... ROW_COUNT`, cuenta solo las
-- filas realmente insertadas, no las que ya existían por `ON CONFLICT`).
-- Decisión explícita del usuario, distinta de `submit_bid`/`asignar_instalador`
-- (ambos `RETURNS void`): el frontend necesita saber, sin una consulta
-- adicional, si el resultado fue `0` -- caso válido documentado ("trabajo
-- publicado, pero sin instaladores elegibles"), nunca un error.
-- ============================================================


-- ============================================================
-- 1. FUNCIÓN NUEVA — sin GRANT ni policy adicional (ver justificación arriba)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notificar_instaladores_elegibles(p_trabajo_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
declare
  v_count integer;
begin
  insert into public.trabajo_instaladores (trabajo_id, instalador_id, estado, notificado_at)
  select t.id, i.id, 'notificado', now()
  from public.trabajos t
  join public.instaladores i
    on i.empresa_id = t.empresa_id
   and i.provincia  = t.provincia
   and i.zona       = t.zona
   and i.activo     = true
   and i.suspendido = false
  where t.id = p_trabajo_id
  on conflict (trabajo_id, instalador_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


-- ============================================================
-- VALIDACIÓN (ejecutar después de la sección 1)
-- ============================================================
-- select p.proname, pg_get_functiondef(p.oid)
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname = 'notificar_instaladores_elegibles';
--
-- Validación funcional: publicar un trabajo real desde un Coordinador y
-- confirmar (a) que aparecen filas nuevas en `trabajo_instaladores` con
-- `estado='notificado'` para los instaladores que cumplen la regla de
-- elegibilidad, y (b) que instaladores de otra zona/provincia/empresa, o
-- inactivos/suspendidos, NO aparecen notificados.


-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP FUNCTION IF EXISTS public.notificar_instaladores_elegibles(uuid);

-- ============================================================
-- FIN DE LA MIGRACIÓN 0006
-- ============================================================
