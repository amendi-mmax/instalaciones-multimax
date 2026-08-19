-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint B
-- Gestión de Administradores y Coordinadores — backend
-- 0013 — RLS: admins ven administradores de su misma empresa
-- ============================================================
-- Ver ANALISIS_GESTION_USUARIOS.md, sección "CIERRE ARQUITECTÓNICO", C7,
-- para el análisis completo. Resumen:
--
-- Estado previo (confirmado vía pg_policies, Sprint 8.4.1): `admins` tenía
-- exactamente 1 policy, "admins pueden leer su perfil" (SELECT,
-- auth.uid() = id) -- un admin solo podía leer SU PROPIA fila, no podía
-- listar a los demás administradores de su empresa. Necesario para que
-- "Ver administradores" (matriz de permisos aprobada, C2 -- Principal y
-- Secundario, ambos con acceso de lectura) funcione mediante una consulta
-- directa (`adminsRepository.getByEmpresaId()`, ya existente sin cambios),
-- mismo patrón ya usado por `instaladores`/`empresas_instaladoras`, en vez
-- de forzar cada lectura a través de `admin-operations`.
--
-- Policy nueva, únicamente SELECT, acotada por empresa_id -- NO
-- "authenticated users can select all" (regla explícita del Sprint B).
-- Mismo molde EXISTS ya usado por "admins ven instaladores de su empresa"
-- (0004) y las 3 policies de `empresas_instaladoras` (0009): el propio
-- `auth.uid()` debe tener una fila en `admins` para poder ver las demás.
--
-- No se otorga NINGÚN privilegio de escritura (INSERT/UPDATE/DELETE) a
-- `authenticated` sobre `admins` en esta migración -- esa capacidad sigue
-- exclusivamente en manos de `service_role`/`admin-operations`
-- (`invite_admin`/`set_admin_activo`, mismo Sprint). `service_role` ya
-- tiene GRANT completo sobre `admins` desde la migración `0003`
-- (`service_role_grants_admins_instaladores.sql`) -- sin cambios acá.
--
-- La policy "admins pueden leer su perfil" (auth.uid() = id) NO se
-- modifica ni se elimina -- queda como caso particular ya cubierto por la
-- nueva policy (empresa_id = empresa_id es trivialmente cierto para la
-- propia fila), se conserva por no tocar código/comportamiento existente
-- sin necesidad.
-- ============================================================

create policy "admins ven administradores de su empresa"
on public.admins for select
using (exists (
  select 1
  from public.admins a
  where a.id = auth.uid()
    and a.empresa_id = admins.empresa_id
));

-- ============================================================
-- VALIDACIÓN (ver reporte del Sprint B para el resultado real, ejecutado
-- vía simulación de rol/JWT claim -- `set local role authenticated` +
-- `set local request.jwt.claims`, sin necesitar un JWT HTTP real)
-- ============================================================
-- select policyname, cmd, qual
-- from pg_policies
-- where schemaname = 'public' and tablename = 'admins'
-- order by policyname;

-- ============================================================
-- FIN DE LA MIGRACIÓN 0013
-- ============================================================
