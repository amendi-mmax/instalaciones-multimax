-- ============================================================
-- HANDYMAX · Multimax Despacho — Ciclo de vida "Completado"
-- Estado intermedio pending_confirmation + 2 RPC de transición
-- ============================================================
-- Requiere: 0001..0023 ya aplicadas. Es ADITIVA/no destructiva:
--   - agrega 2 columnas NULLABLE a `public.trabajos` (sin default
--     obligatorio, sin backfill, sin tocar filas existentes);
--   - agrega 2 funciones nuevas (`CREATE OR REPLACE`, mismo patrón que
--     todas las funciones reales del proyecto);
--   - NO agrega ningún CHECK/ENUM sobre `estado` (esa columna sigue siendo
--     `text` libre, igual que hoy -- confirmado sin restricción alguna
--     vía `pg_constraint`, ver informe de la ronda de análisis);
--   - NO modifica ninguna policy RLS existente;
--   - NO modifica la migración 0023 ni ninguna otra;
--   - NO modifica `trabajo_instaladores` (ver justificación más abajo).
--
-- ────────────────────────────────────────────────────────────
-- CONTEXTO (informe de análisis previo, ya entregado y aprobado)
-- ────────────────────────────────────────────────────────────
-- `trabajos.estado` no tiene CHECK/ENUM -- 'live'/'assigned' son los únicos
-- valores reales observados en Producción hoy; 'completed'/'cancelled'
-- existen solo como convención en el frontend (`TrabajoEstadoReal`), nunca
-- escritos por ningún RPC real hasta esta migración. Se agrega el ciclo:
--
--   live → assigned → pending_confirmation → completed
--
-- Las primeras 2 transiciones ya existen (`asignar_instalador`, sin
-- cambios). Esta migración agrega las 2 restantes.
--
-- ────────────────────────────────────────────────────────────
-- ¿POR QUÉ NO SE TOCA `trabajo_instaladores`?
-- ────────────────────────────────────────────────────────────
-- Analizado explícitamente antes de escribir código: ninguna consulta real
-- del frontend (`categoriaDeTrabajo()`, `trabajos_para_instalador`,
-- `InstallerJobs.tsx`, `TrabajoDetailPage.tsx`) deriva "Asignados"/
-- "Completados" de `trabajo_instaladores.estado` -- todas usan
-- `trabajos.estado` (columna `estado_trabajo` en la vista) + `gane_yo`
-- (`instalador_asignado_id = auth.uid()`, ya resuelto en la vista). Cambiar
-- `trabajo_instaladores` acá sería simetría sin consumidor real -- se deja
-- intacta, tal como se pidió explícitamente.
-- ============================================================


-- ============================================================
-- 1. COLUMNAS NUEVAS -- auditoría temporal (mismo patrón que `asignado_at`,
--    ya existente desde 0001)
-- ============================================================
ALTER TABLE public.trabajos
    ADD COLUMN IF NOT EXISTS finalizado_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS completado_at timestamptz NULL;


-- ============================================================
-- 2. RPC — INSTALADOR: assigned → pending_confirmation
-- ============================================================
-- `SECURITY DEFINER` (mismo patrón ya usado 3 veces en este proyecto --
-- `es_admin_de_empresa`/`instalador_fue_notificado`/
-- `nombre_empresa_instaladora` -- para lógica que valida internamente en
-- vez de depender de una policy RLS ampliada). El instalador NO tiene, ni
-- tendrá, ninguna policy de UPDATE sobre `trabajos` -- toda la protección
-- vive en el `WHERE` de este UPDATE, evaluado con privilegios elevados
-- pero validado explícitamente contra `auth.uid()` real de quien invoca.
--
-- El `WHERE` es la única fuente de verdad de la transición -- atómico,
-- sin SELECT previo (evita condiciones de carrera tipo
-- "verificar-luego-actuar"): dos llamadas simultáneas (doble clic, o dos
-- pestañas) nunca pueden completar ambas -- Postgres serializa el UPDATE
-- por fila; la segunda, cuando se ejecute, ya no encuentra
-- `estado='assigned'` y actualiza 0 filas.
--
-- Devuelve `boolean` (no `void`, a diferencia de `asignar_instalador`):
-- `true` solo si la fila realmente cambió -- el frontend debe usar este
-- valor para no mostrar un éxito falso cuando el `WHERE` no encontró
-- ninguna fila (trabajo ajeno, ya no `assigned`, o inexistente).
CREATE OR REPLACE FUNCTION public.marcar_trabajo_terminado(p_trabajo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_updated integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  update trabajos
  set estado = 'pending_confirmation',
      finalizado_at = now()
  where id = p_trabajo_id
    and estado = 'assigned'
    and instalador_asignado_id = auth.uid();

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;


-- ============================================================
-- 3. RPC — COORDINADOR/ADMIN: pending_confirmation → completed
-- ============================================================
-- `SECURITY INVOKER` (sin cláusula `SECURITY DEFINER` -- default de
-- PostgreSQL, mismo patrón exacto que `asignar_instalador`): corre con los
-- permisos REALES de quien invoca. Funciona sin ninguna policy RLS nueva
-- porque "coordinadores actualizan su tienda"/"admins actualizan trabajos
-- de su empresa" (ambas ya existentes, sin cambios) no restringen QUÉ
-- valor de `estado` se escribe -- ya permiten esta escritura tal cual.
--
-- Si un INSTALADOR intentara invocar este RPC, el UPDATE se ejecutaría
-- bajo su propia sesión -- como no existe (ni se agrega) ninguna policy de
-- UPDATE sobre `trabajos` para instaladores, RLS filtra el `WHERE` a 0
-- filas sin error (comportamiento estándar de RLS: una fila que no
-- satisface ninguna policy USING simplemente no se actualiza) -- segunda
-- capa de protección real, independiente de la UI.
--
-- Mismo `WHERE` defensivo y mismo retorno `boolean` que el RPC anterior --
-- impide saltarse el paso intermedio (`assigned`/`live` → `completed`
-- directo es imposible: el `WHERE` exige `estado='pending_confirmation'`)
-- y hace segura la doble confirmación (la segunda llamada actualiza 0
-- filas).
CREATE OR REPLACE FUNCTION public.confirmar_trabajo_completado(p_trabajo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
declare
  v_updated integer;
begin
  update trabajos
  set estado = 'completed',
      completado_at = now()
  where id = p_trabajo_id
    and estado = 'pending_confirmation';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;


-- ============================================================
-- VALIDACIÓN (ejecutar después de aplicar)
-- ============================================================
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='trabajos'
--   and column_name in ('finalizado_at','completado_at');
-- -- debe devolver las 2 columnas.
--
-- select proname, prosecdef from pg_proc
-- where pronamespace='public'::regnamespace
--   and proname in ('marcar_trabajo_terminado','confirmar_trabajo_completado');
-- -- marcar_trabajo_terminado: prosecdef = true (SECURITY DEFINER)
-- -- confirmar_trabajo_completado: prosecdef = false (SECURITY INVOKER)
--
-- Validación funcional (con datos reales, sin crear ninguno para esta
-- prueba): un trabajo `assigned` real, instalador ganador invoca
-- `marcar_trabajo_terminado` -- debe devolver `true` y `estado` debe pasar
-- a `pending_confirmation`; un instalador DISTINTO invocando el mismo RPC
-- sobre el mismo trabajo debe devolver `false` sin modificar nada. Luego,
-- el coordinador invoca `confirmar_trabajo_completado` -- debe devolver
-- `true` y `estado` debe pasar a `completed`; invocarlo de nuevo debe
-- devolver `false`.


-- ============================================================
-- ROLLBACK (orden inverso exacto de aplicación)
-- ============================================================
-- DROP FUNCTION IF EXISTS public.confirmar_trabajo_completado(uuid);
-- DROP FUNCTION IF EXISTS public.marcar_trabajo_terminado(uuid);
-- ALTER TABLE public.trabajos
--     DROP COLUMN IF EXISTS completado_at,
--     DROP COLUMN IF EXISTS finalizado_at;

-- ============================================================
-- FIN DE LA MIGRACIÓN 0024
-- ============================================================
