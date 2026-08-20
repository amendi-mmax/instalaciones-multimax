-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint 9.3
-- RLS SELECT — admins ven coordinadores de su empresa
-- ============================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor (o `supabase db push`)
-- Proyecto: bdevkryrgmttxnlxaisd
-- Requiere: 0011_admins_es_principal.sql, 0014_fix_admins_select_recursion.sql
-- ya aplicados (reutiliza la función `es_admin_de_empresa()` creada en 0014).
-- Es ADITIVA/no destructiva: no elimina ninguna policy/GRANT existente.
--
-- ────────────────────────────────────────────────────────────
-- ESTADO ACTUAL (confirmado vía MCP durante el análisis previo de este
-- Sprint, sin repetir la auditoría completa aquí)
-- ────────────────────────────────────────────────────────────
-- `public.coordinadores` tiene RLS habilitado con una única policy:
-- `"coordinadores leen su perfil"` (SELECT, `auth.uid() = id`) — un admin
-- no puede listar los coordinadores de su empresa hoy, exactamente el
-- mismo hueco que ya existía para `admins` antes de `0013`.
--
-- ────────────────────────────────────────────────────────────
-- CORRECCIÓN
-- ────────────────────────────────────────────────────────────
-- Mismo molde exacto que `"admins ven administradores de su empresa"`
-- (`0013`, corregida por `0014` para usar `es_admin_de_empresa()` y evitar
-- la recursión infinita `42P17` que causó la versión original con un
-- `EXISTS` inline contra `admins`) -- se reutiliza directamente esa misma
-- función `SECURITY DEFINER` ya existente y ya validada, en vez de duplicar
-- la lógica. Al ser una policy sobre `coordinadores` (no sobre `admins`),
-- no hay riesgo de auto-recursión ni aunque se usara un `EXISTS` inline --
-- se prefiere igual la función ya existente por consistencia y para no
-- introducir un segundo mecanismo de "¿es admin de esta empresa?".
--
-- Únicamente SELECT, acotada por `empresa_id` -- no se otorga
-- INSERT/UPDATE/DELETE a `authenticated` sobre `coordinadores` (esas
-- operaciones siguen exclusivamente en manos de `service_role` vía
-- `admin-operations`, igual que hoy). No se toca la policy existente
-- `"coordinadores leen su perfil"`.
-- ============================================================


-- ============================================================
-- 1. Policy nueva
-- ============================================================
CREATE POLICY "admins ven coordinadores de su empresa"
ON public.coordinadores FOR SELECT
USING (es_admin_de_empresa(empresa_id));


-- ============================================================
-- VALIDACIÓN (ejecutar después de la sección 1)
-- ============================================================
-- select policyname, cmd, qual
-- from pg_policies
-- where schemaname = 'public' and tablename = 'coordinadores'
-- order by policyname;
--
-- Validación funcional recomendada: simular RLS para un admin real
-- (`SET LOCAL ROLE authenticated` + `request.jwt.claims`) y confirmar que
-- ve exactamente los coordinadores de su propia empresa, ninguno de otra.


-- ============================================================
-- ROLLBACK (solo si algo sale mal)
-- ============================================================
-- DROP POLICY IF EXISTS "admins ven coordinadores de su empresa" ON public.coordinadores;

-- ============================================================
-- FIN DE LA MIGRACIÓN 0016
-- ============================================================
