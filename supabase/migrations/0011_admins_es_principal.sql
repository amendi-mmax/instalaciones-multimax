-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint A
-- Gestión de Administradores y Coordinadores — "Cierre Arquitectónico"
-- 0011 — public.admins.es_principal (columna + índice único parcial + backfill)
-- ============================================================
-- Ver ANALISIS_GESTION_USUARIOS.md, sección "CIERRE ARQUITECTÓNICO", C1 y C8
-- para el análisis completo y la justificación de diseño (por qué es un
-- boolean en `admins` y no una columna en `empresas`, por qué el índice es
-- parcial y no una columna UNIQUE simple, etc.) -- no se repite aquí.
--
-- Regla de negocio: exactamente un Administrador Principal por
-- `empresa_id` -- "a lo sumo uno" lo garantiza el índice único parcial de
-- este archivo; "al menos uno" lo garantiza el trigger de la migración
-- siguiente (0012_proteger_ultimo_admin_principal.sql) -- ninguna de las
-- dos mitades de la regla se puede expresar completa en un solo objeto.
--
-- Backfill: revisado contra los datos reales de Producción antes de
-- escribir este archivo (consulta de solo lectura vía MCP,
-- `select id, empresa_id, nombre, email, created_at, activo from
-- public.admins order by empresa_id, created_at asc`) -- resultado real:
-- una sola empresa (00996ff0-0945-4245-8900-9ab29b987813), un solo admin
-- (arnulfo.mendieta@multimax.net, nombre "Administrador Principal",
-- created_at 2026-08-19), sin ambigüedad posible sobre a quién le
-- corresponde `es_principal = true`. El `UPDATE` de abajo NO hardcodea
-- ese id (norma explícita de `apply_migration`: "Do not hardcode
-- references to generated IDs in data migrations") -- usa el criterio
-- genérico aprobado ("si no existe indicación distinta, el created_at más
-- antiguo por empresa_id"), válido igual de bien para esta única fila real
-- que para cualquier empresa futura con más de un admin.
-- ============================================================


-- ============================================================
-- 1. Columna nueva
-- ============================================================
alter table public.admins
  add column es_principal boolean not null default false;

comment on column public.admins.es_principal is
  'Sprint A (Gestión de Administradores) -- exactamente TRUE para el '
  'Administrador Principal de la empresa (usuario bootstrap, control '
  'último de la cuenta), FALSE para administradores secundarios. A lo '
  'sumo un TRUE por empresa_id, garantizado por '
  'uq_admins_un_principal_por_empresa (índice único parcial, más abajo). '
  'Al menos un TRUE por empresa_id (mientras existan admins activos en '
  'esa empresa) lo garantiza el trigger '
  'trg_proteger_ultimo_admin_principal (0012_proteger_ultimo_admin_principal.sql) '
  '-- ningún UPDATE/DELETE que dejara una empresa con cero Principales '
  'activos debe poder completarse. Nunca se establece server-side desde '
  'el payload de invite_admin (siempre false para un admin recién '
  'invitado) -- ver admin-operations (Sprint B).';


-- ============================================================
-- 2. Índice único parcial -- "a lo sumo un Principal por empresa"
-- ============================================================
create unique index uq_admins_un_principal_por_empresa
  on public.admins (empresa_id)
  where es_principal = true;


-- ============================================================
-- 3. Backfill -- exactamente un Principal por empresa existente
-- ============================================================
-- Criterio aprobado: el admin de created_at más antiguo por empresa_id
-- (equivalente al usuario bootstrap). `distinct on (empresa_id) ... order
-- by empresa_id, created_at asc` selecciona una sola fila candidata por
-- empresa, sin ambigüedad ante empates de created_at (desempata por `id`
-- de forma determinística, aunque no se espera ningún empate real).
with principal_candidato as (
  select distinct on (empresa_id) id, empresa_id
  from public.admins
  order by empresa_id, created_at asc, id asc
)
update public.admins a
set es_principal = true
from principal_candidato pc
where a.id = pc.id;


-- ============================================================
-- VALIDACIÓN (ejecutar después de la sección 3, antes de continuar)
-- ============================================================
-- 1) Exactamente un Principal por empresa, sin excepciones:
--   select empresa_id, count(*) filter (where es_principal) as principales
--   from public.admins
--   group by empresa_id
--   having count(*) filter (where es_principal) <> 1;
--   -- debe devolver 0 filas.
--
-- 2) Confirmar el resultado real esperado (1 empresa, 1 admin):
--   select id, empresa_id, nombre, email, es_principal, activo
--   from public.admins
--   order by empresa_id, created_at asc;
--   -- debe mostrar es_principal = true para
--   -- arnulfo.mendieta@multimax.net (único admin real hoy).

-- ============================================================
-- FIN DE LA MIGRACIÓN 0011
-- ============================================================
