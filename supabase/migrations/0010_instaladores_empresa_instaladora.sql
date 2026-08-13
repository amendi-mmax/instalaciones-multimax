-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint 8.4
-- Registro de Instaladores utilizando Empresas Instaladoras reales
-- ============================================================
-- Requiere: 0001..0009 ya aplicadas (0009 crea `empresas_instaladoras`,
-- Sprint 8.3). Es ADITIVA/no destructiva: agrega una columna nullable +
-- un índice + una función de solo lectura. NO modifica ninguna policy
-- RLS existente (regla explícita del brief de este Sprint), NO modifica
-- `empresas_instaladoras` (tabla/RLS ya aprobadas en el Sprint 8.3, sin
-- ningún cambio acá), NO crea ninguna tabla nueva.
--
-- ────────────────────────────────────────────────────────────
-- ALCANCE
-- ────────────────────────────────────────────────────────────
-- El Sprint 8.3 creó el catálogo `empresas_instaladoras` pero
-- explícitamente NO implementó la relación `instaladores ->
-- empresas_instaladoras` ("Sprint 8.4, fuera de alcance"). Este Sprint
-- es ese Sprint 8.4 -- agrega la columna real que faltaba.
--
-- `empresa_instaladora_id` (NUEVO) -- nullable a propósito: un
-- instalador puede no tener empresa asignada todavía (el brief pide
-- explícitamente mostrar "Pendiente de asignación" en ese caso, tanto en
-- el listado como en el Perfil) -- no es un dato obligatorio del alta.
-- Nombre deliberadamente DISTINTO de la columna ya existente
-- `instaladores.empresa_id` (FK a `empresas`, el TENANT -- Multimax --
-- sin relación con este Sprint) para no colisionar con esa columna real
-- ni redefinir su significado.
--
-- `nombre_empresa_instaladora(uuid)` (NUEVA función, SECURITY DEFINER) --
-- el Perfil del Instalador (Parte 6 del brief) necesita mostrar el
-- nombre de SU PROPIA empresa instaladora, pero la RLS de
-- `empresas_instaladoras` (Sprint 8.3, sin tocar en este Sprint) es
-- admin-only -- un instalador autenticado no puede hacer `SELECT`
-- directo sobre esa tabla. En vez de agregar una policy nueva (el brief
-- prohíbe explícitamente "NO modificar RLS"), se resuelve con el mismo
-- patrón ya usado y probado en este proyecto para cruzar una frontera de
-- RLS de forma controlada y mínima (`instalador_fue_notificado()`,
-- migración `0002`): una función `SECURITY DEFINER` de solo lectura que
-- responde EXCLUSIVAMENTE "¿cuál es el nombre de la empresa instaladora
-- con este id?" -- no expone ninguna otra columna, no permite listar,
-- no otorga ningún privilegio adicional sobre la tabla. RLS de
-- `empresas_instaladoras` queda exactamente como el Sprint 8.3 la dejó.
-- ============================================================


-- ============================================================
-- 1. COLUMNA + ÍNDICE
-- ============================================================
ALTER TABLE public.instaladores
    ADD COLUMN IF NOT EXISTS empresa_instaladora_id uuid REFERENCES public.empresas_instaladoras(id);

CREATE INDEX IF NOT EXISTS idx_instaladores_empresa_instaladora
    ON public.instaladores(empresa_instaladora_id);

COMMENT ON COLUMN public.instaladores.empresa_instaladora_id IS
    'Relación real instaladores -> empresas_instaladoras (Sprint 8.4). Nullable: "Pendiente de asignación" cuando es NULL. Distinta de instaladores.empresa_id (tenant).';


-- ============================================================
-- 2. FUNCIÓN DE SOLO LECTURA (SECURITY DEFINER) — ver ALCANCE arriba
-- ============================================================
CREATE OR REPLACE FUNCTION public.nombre_empresa_instaladora(p_empresa_instaladora_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT nombre
    FROM public.empresas_instaladoras
    WHERE id = p_empresa_instaladora_id;
$$;

GRANT EXECUTE ON FUNCTION public.nombre_empresa_instaladora(uuid) TO authenticated;


-- ============================================================
-- VALIDACIÓN (ejecutar después de aplicar)
-- ============================================================
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'instaladores'
--   and column_name = 'empresa_instaladora_id';
--
-- select routine_name, security_type
-- from information_schema.routines
-- where routine_schema = 'public' and routine_name = 'nombre_empresa_instaladora';
--
-- select policyname from pg_policies where tablename = 'empresas_instaladoras';
-- -- (debe seguir mostrando exactamente las 3 policies del Sprint 8.3, sin cambios)


-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP FUNCTION IF EXISTS public.nombre_empresa_instaladora(uuid);
-- ALTER TABLE public.instaladores DROP COLUMN IF EXISTS empresa_instaladora_id;

-- ============================================================
-- FIN DE LA MIGRACIÓN 0010
-- ============================================================
