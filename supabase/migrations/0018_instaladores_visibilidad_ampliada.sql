-- ============================================================
-- HANDYMAX · Multimax Despacho — Ajustes funcionales del flujo Instalador
-- Visibilidad ampliada de trabajos (todas las zonas) + oferta_enviada real
-- ============================================================
-- Requiere: 0001..0017 ya aplicadas. Es ADITIVA/no destructiva: agrega una
-- policy RLS nueva (no modifica ni elimina ninguna existente) y redefine
-- (`CREATE OR REPLACE VIEW`, mismo objeto) la vista `trabajos_para_instalador`
-- ya existente en Producción -- mismo patrón exacto ya usado en
-- `0008_authenticated_view_grants_sprint72.sql` para esa misma vista.
--
-- ────────────────────────────────────────────────────────────
-- CAUSA RAÍZ (auditoría previa, sin código de aplicación tocado en esta
-- sección -- ver informe de auditoría completo entregado al usuario)
-- ────────────────────────────────────────────────────────────
-- Hoy un instalador SOLO ve un trabajo si existe una fila en
-- `trabajo_instaladores` para él, creada EXCLUSIVAMENTE por
-- `notificar_instaladores_elegibles()` (migración 0006), que filtra por
-- `empresa_id + provincia + zona` -- la única policy real de SELECT sobre
-- `trabajos` para instaladores (`"instaladores ven trabajos donde fueron
-- notificados"`, 0001) depende de esa misma fila
-- (`instalador_fue_notificado()`). Requerimiento nuevo del usuario: "todos
-- los instaladores activos deben poder ver trabajos de todas las zonas,
-- usando la zona únicamente como indicador/prioridad visual, no como
-- filtro excluyente".
--
-- Además, `submit_bid()` (0006) solo actualiza `trabajo_instaladores.estado`
-- (usado hoy por el frontend como "¿ya oferté?") -- para un trabajo de OTRA
-- zona (sin fila de notificación), esa fila nunca existió, así que el
-- indicador de "oferta enviada" quedaría incorrecto (siempre "Nueva
-- solicitud") aunque la oferta sí se guardó correctamente en `ofertas`. Se
-- corrige exponiendo la existencia real de una fila en `ofertas` como
-- columna de la vista, en vez de inferirla de `trabajo_instaladores`.
--
-- ────────────────────────────────────────────────────────────
-- ALCANCE (mínimo necesario, sin tocar nada más)
-- ────────────────────────────────────────────────────────────
-- 1. Policy NUEVA de SELECT sobre `trabajos` para instaladores activos de
--    su propia empresa, únicamente trabajos `estado = 'live'` (abiertos a
--    oferta) -- NO expone trabajos `assigned`/`completed`/`cancelled` de
--    otros instaladores (eso seguiría dependiendo de la policy existente,
--    "fui notificado", sin cambios). Postgres combina policies permisivas
--    del mismo comando con OR -- esta policy se SUMA a la existente, no la
--    reemplaza ni la modifica.
-- 2. `notificar_instaladores_elegibles()` NO se toca -- sigue siendo el
--    mecanismo real de "notificación por zona" (útil como señal futura de
--    "se te avisó proactivamente"), ahora un concepto explícitamente
--    distinto de "visible". No se confunde "ver" con "fui notificado" con
--    "oferté" con "fui asignado" (regla explícita del usuario).
-- 3. La vista se redefine únicamente para (a) usar LEFT JOIN en vez de
--    INNER JOIN contra `trabajo_instaladores` (ya no excluye trabajos sin
--    notificación) y (b) agregar un LEFT JOIN contra `ofertas` para
--    exponer si el instalador autenticado ya ofertó. Ninguna columna
--    existente cambia de significado. RLS de `ofertas` (ya permite a un
--    instalador leer sus propias ofertas, sin cambios) cubre este nuevo
--    JOIN sin necesitar ninguna policy adicional.
--
-- ────────────────────────────────────────────────────────────
-- CORRECCIÓN — orden de columnas (detectada en prueba controlada 0018+0021)
-- ────────────────────────────────────────────────────────────
-- PostgreSQL exige que `CREATE OR REPLACE VIEW` conserve el nombre/orden
-- EXACTO de las columnas ya existentes -- solo permite agregar columnas
-- nuevas al final de la lista. La primera versión de esta migración
-- insertaba `oferta_enviada`/`mi_oferta_precio`/`mi_oferta_enviado_at`
-- ANTES de `cliente_nombre`/`cliente_telefono`/`direccion_exacta`/
-- `gane_yo` (columnas ya existentes desde antes de este Sprint), lo que
-- desplazaba su posición y producía `42P16: cannot change name of view
-- column "cliente_nombre" to "oferta_enviada"` -- reproducido
-- empíricamente contra una copia de prueba de este mismo SQL dentro de
-- una transacción `BEGIN...ROLLBACK` (sin tocar Producción). Corregido
-- moviendo las 3 columnas nuevas al final, después de `gane_yo` -- mismo
-- SELECT, mismos JOINs, mismas condiciones, ningún cambio de lógica ni de
-- nombre de columna existente.
-- ============================================================


-- ============================================================
-- 1. NUEVA POLICY — instaladores ven trabajos 'live' de su empresa
-- ============================================================
DROP POLICY IF EXISTS "instaladores ven trabajos live de su empresa" ON public.trabajos;
CREATE POLICY "instaladores ven trabajos live de su empresa"
    ON public.trabajos FOR SELECT
    TO authenticated
    USING (
        estado = 'live'
        AND EXISTS (
            SELECT 1 FROM public.instaladores i
            WHERE i.id = auth.uid()
              AND i.activo = true
              AND i.suspendido = false
              AND i.empresa_id = trabajos.empresa_id
        )
    );


-- ============================================================
-- 2. VISTA REDEFINIDA — trabajos_para_instalador (mismo objeto)
-- ============================================================
create or replace view public.trabajos_para_instalador as
select
    t.id as trabajo_id,
    t.codigo,
    t.tipo,
    t.zona,
    t.provincia,
    t.tipo_inmueble,
    t.fecha,
    t.hora,
    t.equipo,
    t.requisitos,
    t.extra,
    t.precio_sugerido,
    t.urgente,
    t.bid_minutos,
    t.bid_cierra_at,
    t.estado as estado_trabajo,
    ti.estado as mi_estado,
    case
        when t.instalador_asignado_id = auth.uid() and (t.contacto_visible_hasta is null or now() < t.contacto_visible_hasta) then t.cliente_nombre
        else null::text
    end as cliente_nombre,
    case
        when t.instalador_asignado_id = auth.uid() and (t.contacto_visible_hasta is null or now() < t.contacto_visible_hasta) then t.cliente_telefono
        else null::text
    end as cliente_telefono,
    case
        when t.instalador_asignado_id = auth.uid() and (t.contacto_visible_hasta is null or now() < t.contacto_visible_hasta) then t.direccion_exacta
        else null::text
    end as direccion_exacta,
    t.instalador_asignado_id = auth.uid() as gane_yo,
    o.id is not null as oferta_enviada,
    o.precio as mi_oferta_precio,
    o.enviado_at as mi_oferta_enviado_at
from trabajos t
left join trabajo_instaladores ti on ti.trabajo_id = t.id and ti.instalador_id = auth.uid()
left join ofertas o on o.trabajo_id = t.id and o.instalador_id = auth.uid();

grant select on public.trabajos_para_instalador to authenticated;


-- ============================================================
-- 3. SECURITY_INVOKER — misma migración, misma transacción implícita
-- ============================================================
-- Sin esto, la vista (owner `postgres`, rolbypassrls=true) evalúa RLS
-- como el owner, no como el usuario invocador -- la policy nueva de la
-- sección 1 (y las demás de `trabajos`) NO se aplicarían al consultar a
-- través de esta vista, dejando una ventana real de exposición
-- cross-tenant/cross-estado (hallazgo de seguridad confirmado teórica y
-- empíricamente -- ver `0021_trabajos_para_instalador_security_invoker.sql`
-- para el detalle completo). Se agrega acá, en la MISMA migración que
-- redefine la vista, para que Producción nunca pase por un estado
-- intermedio "vista nueva sin security_invoker" -- `CREATE OR REPLACE
-- VIEW` + `ALTER VIEW` se aplican atómicamente como un único lote (sin
-- `BEGIN`/`COMMIT` explícitos, PostgreSQL trata el lote completo como una
-- transacción implícita: si cualquier sentencia fallara, nada de esta
-- migración quedaría aplicado). `0021` se conserva como migración de
-- reafirmación idempotente (mismo `ALTER VIEW`, sin efecto si ya está en
-- `true`) -- no se elimina, por trazabilidad del hallazgo de seguridad
-- como pieza auditada independientemente.
ALTER VIEW public.trabajos_para_instalador
    SET (security_invoker = true);


-- ============================================================
-- VALIDACIÓN (ejecutar después de aplicar)
-- ============================================================
-- select policyname, cmd, roles, qual
-- from pg_policies
-- where tablename = 'trabajos'
-- order by policyname;
-- -- debe mostrar 3 policies de SELECT: la de coordinadores (sin cambios),
-- -- la de admins (sin cambios, 0005), "fui notificado" (sin cambios) y
-- -- esta nueva de instaladores activos + estado='live'.
--
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='trabajos_para_instalador'
-- order by ordinal_position;
-- -- debe incluir oferta_enviada/mi_oferta_precio/mi_oferta_enviado_at.
--
-- Validación funcional: instalador activo de la empresa, sin fila de
-- notificación para un trabajo 'live' de otra zona -- debe aparecer en
-- `trabajos_para_instalador` con mi_estado NULL, oferta_enviada=false.
-- Tras `submit_bid()` sobre ese mismo trabajo, oferta_enviada debe pasar a
-- true sin que exista ninguna fila nueva en `trabajo_instaladores`.


-- ============================================================
-- ROLLBACK (orden inverso exacto de aplicación)
-- ============================================================
-- ALTER VIEW public.trabajos_para_instalador RESET (security_invoker);
--
-- DROP POLICY IF EXISTS "instaladores ven trabajos live de su empresa" ON public.trabajos;
--
-- create or replace view public.trabajos_para_instalador as
-- select
--     t.id as trabajo_id, t.codigo, t.tipo, t.zona, t.provincia, t.tipo_inmueble,
--     t.fecha, t.hora, t.equipo, t.requisitos, t.extra, t.precio_sugerido,
--     t.urgente, t.bid_minutos, t.bid_cierra_at, t.estado as estado_trabajo,
--     ti.estado as mi_estado,
--     case when t.instalador_asignado_id = auth.uid() and (t.contacto_visible_hasta is null or now() < t.contacto_visible_hasta) then t.cliente_nombre else null::text end as cliente_nombre,
--     case when t.instalador_asignado_id = auth.uid() and (t.contacto_visible_hasta is null or now() < t.contacto_visible_hasta) then t.cliente_telefono else null::text end as cliente_telefono,
--     case when t.instalador_asignado_id = auth.uid() and (t.contacto_visible_hasta is null or now() < t.contacto_visible_hasta) then t.direccion_exacta else null::text end as direccion_exacta,
--     t.instalador_asignado_id = auth.uid() as gane_yo
-- from trabajos t
-- join trabajo_instaladores ti on ti.trabajo_id = t.id and ti.instalador_id = auth.uid();

-- ============================================================
-- FIN DE LA MIGRACIÓN 0018
-- ============================================================
