-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint A
-- Gestión de Administradores y Coordinadores — "Cierre Arquitectónico"
-- 0012 — trigger proteger_ultimo_admin_principal (garantía de "al menos
-- un Principal activo por empresa")
-- ============================================================
-- Ver ANALISIS_GESTION_USUARIOS.md, sección "CIERRE ARQUITECTÓNICO", C3
-- para el análisis completo. Resumen de la regla protegida:
--
--   Nunca debe existir una empresa_id sin al menos un admin con
--   es_principal = true AND activo = true.
--
-- La mitad "a lo sumo uno" ya la garantiza
-- uq_admins_un_principal_por_empresa (0011, índice único parcial). Esta
-- migración cubre la otra mitad, "al menos uno" -- una invariante
-- multi-fila que ningún CHECK/índice de una sola fila puede expresar, así
-- que requiere un trigger.
--
-- Caminos de pérdida cubiertos, todos con el MISMO trigger
-- (BEFORE UPDATE OR DELETE FOR EACH ROW):
--   1) DELETE directo sobre la fila del Principal.
--   2) UPDATE ... SET activo = false (desactivación).
--   3) UPDATE ... SET es_principal = false (despromoción sin promover a
--      otro antes, en la misma transacción).
--   4) auth.admin.deleteUser() sobre el Principal: admins.id references
--      auth.users(id) ON DELETE CASCADE (0001_initial_schema.sql) -- el
--      DELETE en cascada que Postgres ejecuta sobre `admins` al borrar la
--      fila de auth.users SÍ dispara este mismo trigger (los triggers
--      BEFORE DELETE se ejecutan también para deletes en cascada) -- si es
--      el único Principal activo, el trigger aborta la transacción
--      completa, y por lo tanto también falla el deleteUser() en Auth. No
--      queda ninguna de las dos tablas huérfana.
--
-- No cubre (no aplica hoy): "suspensión" como estado distinto de
-- "desactivación" -- `admins` no tiene columna `suspendido` (solo
-- `instaladores` la tiene) -- ver ANALISIS_GESTION_USUARIOS.md C8.
--
-- SECURITY DEFINER: el trigger corre con los privilegios del dueño de la
-- función (postgres), no del rol que dispara la operación -- mismo
-- criterio ya usado en `instalador_fue_notificado()`/
-- `nombre_empresa_instaladora()` (funciones SECURITY DEFINER existentes
-- en este proyecto). Garantiza que el SELECT interno de comprobación
-- ("¿existe otro Principal activo?") nunca queda sujeto a RLS,
-- independientemente de qué rol dispare la escritura -- aunque hoy la
-- única escritura real posible sobre `admins` es vía `service_role`
-- (que ya ignora RLS), se declara explícito por consistencia y para no
-- depender de esa circunstancia actual.
--
-- El trigger corre para CUALQUIER rol que ejecute el UPDATE/DELETE,
-- incluido `service_role` -- los triggers, a diferencia de RLS, no
-- distinguen rol de base de datos. Esto es intencional: es la garantía
-- real "del lado servidor/base de datos" pedida explícitamente (no
-- solo botones deshabilitados en React, ni solo un chequeo dentro de la
-- Edge Function que alguien podría rodear escribiendo SQL directo).
-- ============================================================


-- ============================================================
-- 1. Función del trigger
-- ============================================================
create or replace function public.proteger_ultimo_admin_principal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo interesa cuando la fila afectada ERA el Principal activo antes
  -- de esta operación, y la operación la dejaría de serlo.
  if (tg_op = 'DELETE' and old.es_principal and old.activo)
     or (tg_op = 'UPDATE' and old.es_principal and old.activo
         and (new.es_principal is distinct from true or new.activo is distinct from true)) then

    if not exists (
      select 1
      from public.admins a
      where a.empresa_id = old.empresa_id
        and a.id <> old.id
        and a.es_principal = true
        and a.activo = true
    ) then
      raise exception
        'No es posible eliminar, desactivar ni despromover al único Administrador Principal activo de esta empresa.'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

comment on function public.proteger_ultimo_admin_principal() is
  'Sprint A (Gestión de Administradores) -- BEFORE UPDATE OR DELETE en '
  'public.admins. Bloquea cualquier operación (DELETE directo, '
  'UPDATE activo=false, UPDATE es_principal=false, o el DELETE en '
  'cascada disparado por auth.admin.deleteUser() sobre el Principal) que '
  'dejara empresa_id sin ningún admin con es_principal=true AND '
  'activo=true. Ver ANALISIS_GESTION_USUARIOS.md sección C3.';


-- ============================================================
-- 2. Trigger
-- ============================================================
create trigger trg_proteger_ultimo_admin_principal
  before update or delete on public.admins
  for each row
  execute function public.proteger_ultimo_admin_principal();


-- ============================================================
-- VALIDACIÓN (ver también las 9 pruebas obligatorias del Sprint A,
-- ejecutadas por separado tras aplicar esta migración -- no se repiten
-- aquí como comentario porque ya quedan documentadas como resultado real
-- en el reporte del Sprint)
-- ============================================================
-- select tgname, tgrelid::regclass, tgtype
-- from pg_trigger
-- where tgname = 'trg_proteger_ultimo_admin_principal';

-- ============================================================
-- FIN DE LA MIGRACIÓN 0012
-- ============================================================
