-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint B (fix urgente)
-- 0014 — corrige 42P17 (infinite recursion) en la policy de 0013
-- ============================================================
-- Diagnóstico (confirmado en vivo, vía simulación de rol/JWT claim dentro
-- de transacciones con ROLLBACK, sin tocar datos reales):
--
--   ERROR: 42P17: infinite recursion detected in policy for relation "admins"
--
-- Causa raíz: la policy "admins ven administradores de su empresa" (0013)
-- usa `EXISTS (SELECT 1 FROM public.admins a WHERE a.id = auth.uid() ...)`
-- -- una subconsulta contra la MISMA tabla que la policy protege. Postgres
-- necesita reevaluar RLS sobre `admins` para resolver esa subconsulta, lo
-- que exige evaluar la misma policy otra vez -> recursión infinita. Afecta
-- CUALQUIER lectura de `admins` como `authenticated` (incluida la consulta
-- exacta que `profile.service.ts` ejecuta en cada login de un admin,
-- `adminsRepository.getById()`) -- verificado que rompía el login real del
-- Administrador Principal en Producción.
--
-- `service_role` (admin-operations) NUNCA estuvo afectado -- tiene
-- BYPASSRLS=true, nunca evalúa policies. Este fix es exclusivamente para
-- la lectura vía `authenticated`.
--
-- Mismo patrón ya usado en este proyecto para el mismo tipo de bug
-- (PROJECT_STATUS.md, Sprint 5.2.2.1 Fix -- `instalador_fue_notificado()`,
-- creada exactamente para romper un ciclo de recursión equivalente entre
-- `trabajos`/`trabajo_instaladores`): una función `SECURITY DEFINER` hace
-- el lookup por fuera de RLS (corre con los privilegios del dueño de la
-- función, `postgres`, dueño real de las tablas -- confirmado en
-- auditorías previas de este proyecto -- y por lo tanto exento de sus
-- propias RLS policies), rompiendo el ciclo sin cambiar la intención
-- funcional de la policy: sigue siendo "un admin autenticado únicamente
-- puede leer administradores de su misma empresa_id".
--
-- Sin cambios a: es_principal/activo (0011), trigger
-- proteger_ultimo_admin_principal (0012), índice único parcial (0011),
-- ninguna otra tabla. Solo reemplaza el mecanismo de la policy de 0013.
-- ============================================================

create or replace function public.es_admin_de_empresa(target_empresa_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.id = auth.uid()
      and a.empresa_id = target_empresa_id
  );
$$;

comment on function public.es_admin_de_empresa(uuid) is
  'Sprint B (fix 0014) -- SECURITY DEFINER, rompe el ciclo de recursión '
  'RLS de "admins ven administradores de su empresa" (mismo patrón que '
  'instalador_fue_notificado()). Responde exclusivamente "¿auth.uid() es '
  'un admin de esta empresa?", sin exponer ninguna otra fila/columna.';

drop policy if exists "admins ven administradores de su empresa" on public.admins;

create policy "admins ven administradores de su empresa"
on public.admins for select
using (public.es_admin_de_empresa(empresa_id));

-- ============================================================
-- FIN DE LA MIGRACIÓN 0014
-- ============================================================
