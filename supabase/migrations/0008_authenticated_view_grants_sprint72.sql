-- Sprint 7.2 — Corrección de privilegios SQL (GRANT) sobre la vista
-- trabajos_para_instalador
--
-- Diagnóstico (confirmado vía MCP, validación funcional extremo a extremo
-- con datos reales persistidos): el Instalador no puede leer sus propias
-- solicitudes -- SELECT sobre trabajos_para_instalador falla con
-- 42501 permission denied for view trabajos_para_instalador.
--
-- Causa raíz: el GRANT de un objeto vista es independiente del GRANT de
-- las tablas subyacentes (trabajos, trabajo_instaladores), ambas ya
-- correctamente concedidas a authenticated. information_schema.role_table_grants
-- confirma que authenticated nunca tuvo SELECT sobre esta vista desde su
-- creación -- mismo defecto de infraestructura ya diagnosticado y
-- corregido dos veces en este incidente (migraciones 0007 y, antes,
-- Sprint 5.2.2.2 sobre trabajos), tercer caso, objeto distinto.
--
-- La vista ya filtra internamente por auth.uid() (join contra
-- trabajo_instaladores ti ON ti.instalador_id = auth.uid()) -- el RLS de
-- las tablas subyacentes ya es correcto y no se modifica; el único hueco
-- es este GRANT SELECT faltante sobre el objeto vista en sí.
--
-- Mismo patrón exacto que 0007/Sprint 5.2.2.2: GRANT aditivo, sin tocar
-- RLS, sin SECURITY DEFINER, sin cambios de frontend/repositorios/servicios,
-- sin modificar el RPC notificar_instaladores_elegibles.
--
-- ────────────────────────────────────────────────────────────
-- AJUSTE — Sprint 8.4.1 ("Reconstrucción de Migraciones Supabase")
-- ────────────────────────────────────────────────────────────
-- Auditoría de reproducibilidad encontró que esta vista NUNCA tuvo un
-- `CREATE VIEW` en ningún archivo de `supabase/migrations/` -- existía en
-- Producción real (creada fuera de banda, igual que otros objetos
-- documentados en el Sprint 8.4.1), y este archivo únicamente le otorgaba
-- el `GRANT`, asumiendo que ya existía. Aplicar la cadena completa sobre
-- una base nueva fallaba acá con "relation trabajos_para_instalador does
-- not exist". Se agrega el `CREATE OR REPLACE VIEW` (definición exacta,
-- obtenida de Producción real vía `pg_get_viewdef`, sin ningún cambio de
-- comportamiento) inmediatamente antes del `GRANT` ya existente -- este es
-- el único archivo de la cadena `0003`-`0010` modificado en el Sprint
-- 8.4.1, precisamente porque es donde esta vista pertenece
-- cronológicamente (Sprint 7.2, junto con 0006/0007).

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
    t.instalador_asignado_id = auth.uid() as gane_yo
from trabajos t
join trabajo_instaladores ti on ti.trabajo_id = t.id and ti.instalador_id = auth.uid();

grant select on public.trabajos_para_instalador to authenticated;
