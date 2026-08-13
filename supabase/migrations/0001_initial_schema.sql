-- ============================================================
-- HANDYMAX · Multimax Despacho
-- Esquema inicial REAL — reconstrucción (Sprint 8.4.1)
-- ============================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor (o `supabase db push`)
-- Proyecto: bdevkryrgmttxnlxaisd
-- Es la PRIMERA migración de la cadena (0001 → 0010). Reemplaza por
-- completo el `0001_initial_schema.sql` anterior (modelo `usuarios`/
-- `sucursales`/`bids`, hoy conservado tal cual en
-- `supabase/migrations/legacy/0001_initial_schema_legacy.sql` -- ESE
-- modelo nunca fue el que se ejecutó contra Producción real).
--
-- ────────────────────────────────────────────────────────────
-- POR QUÉ EXISTE ESTA VERSIÓN (Sprint 8.4.1 — "Reconstrucción de
-- Migraciones Supabase")
-- ────────────────────────────────────────────────────────────
-- Auditoría de Deployment Readiness (previa a este Sprint) detectó que
-- `0001_initial_schema.sql`/`0002_auth_roles_rls.sql`, tal como estaban
-- escritas, eran copias byte a byte de `legacy/0001.../legacy/0002...`
-- (esquema `usuarios`/`sucursales`/`bids`, con ENUMs) -- mientras que
-- `0003_service_role_grants_admins_instaladores.sql` en adelante ya
-- asumen el esquema REAL (`admins`/`coordinadores`/`instaladores`/
-- `tiendas`/`trabajos`.`estado` como `text`, sin ENUMs). Aplicar la
-- carpeta completa en orden sobre un proyecto nuevo fallaba exactamente
-- en `0003` ("relation public.admins does not exist").
--
-- Este archivo se reescribió a partir del esquema REAL de Producción,
-- verificado exhaustivamente vía MCP (no asumido) inmediatamente antes
-- de escribirse: columnas/tipos/nullability/defaults de las 8 tablas
-- reales (`information_schema.columns`), PK/UNIQUE
-- (`information_schema.table_constraints`), FKs y su `delete_rule`
-- (`pg_constraint`/`information_schema.referential_constraints`),
-- índices (`pg_indexes`), las 18 policies RLS que ya existían ANTES de
-- la migración `0003` (`pg_policies`, excluidas explícitamente las que
-- `0004`/`0005`/`0009` agregan más adelante en la cadena -- esas
-- migraciones NO se tocaron), y la definición exacta de las 4 funciones
-- que resultaron estar activas en Producción real sin ningún `CREATE
-- FUNCTION` correspondiente en ninguna migración del repositorio
-- (`pg_get_functiondef`): `set_bid_cierra_at()`, `asignar_instalador()`,
-- `instalador_fue_notificado()`, `submit_bid()` -- más el event trigger
-- `rls_auto_enable`/`ensure_rls` (`pg_event_trigger`), tampoco presente
-- en ninguna migración.
--
-- ────────────────────────────────────────────────────────────
-- GARANTÍA EXPLÍCITA: el esquema actual de Producción NO cambia
-- ────────────────────────────────────────────────────────────
-- Este archivo NO se aplicó contra Producción durante el Sprint 8.4.1
-- (auditoría de solo archivos, sin `db push`/`db reset`/`migration up`,
-- sin aplicar nada vía MCP). Todo objeto que crea (`CREATE TABLE IF NOT
-- EXISTS`, `CREATE POLICY` precedida de `DROP POLICY IF EXISTS`,
-- `CREATE OR REPLACE FUNCTION`, `CREATE INDEX IF NOT EXISTS`) es
-- idempotente por diseño -- si en algún momento se ejecuta contra la
-- base real (que YA tiene estos objetos, creados fuera de banda), no
-- modifica ni un solo dato ni redefine nada distinto de lo que ya existe
-- hoy: es literalmente el mismo esquema, ahora expresado como SQL
-- versionado. Su propósito es exclusivamente reproducibilidad
-- (staging/disaster-recovery/onboarding), no un cambio de modelo.
--
-- ────────────────────────────────────────────────────────────
-- QUÉ SIGUE IGUAL, SIN NINGÚN CAMBIO
-- ────────────────────────────────────────────────────────────
-- `0003` a `0010` NO se modificaron (ver Sprint 8.4.1, Fase 3/4) --
-- siguen siendo exactamente los mismos archivos, aplicables en el mismo
-- orden, sobre este `0001` reconstruido. `0002_auth_roles_rls.sql` pasó
-- a ser un archivo vacío/no-op documentado (su contenido real -- ENUMs,
-- tabla `trabajo_instaladores` del modelo `usuarios` -- ya no aplica; lo
-- que sí era necesario de su intención original ya vive acá, en el
-- modelo correcto) -- se conserva el archivo (no se elimina, no se
-- renumeran `0003`+) para no alterar la numeración que cualquier entorno
-- ya sincronizado pueda estar usando como referencia.
-- ============================================================


-- ============================================================
-- 0. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. TABLAS (orden por dependencia de FK)
-- ============================================================

-- ---- 1.1 empresas (tenant) ----
CREATE TABLE IF NOT EXISTS public.empresas (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre                  text        NOT NULL,
    slug                    text        NOT NULL UNIQUE,
    color_primario          text        DEFAULT '#E4221E',
    contacto_visible_horas  integer     NOT NULL DEFAULT 48,
    activa                  boolean     NOT NULL DEFAULT true,
    created_at              timestamptz NOT NULL DEFAULT now()
);

-- ---- 1.2 tiendas ----
CREATE TABLE IF NOT EXISTS public.tiendas (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id  uuid        NOT NULL REFERENCES public.empresas(id),
    nombre      text        NOT NULL UNIQUE,
    direccion   text,
    provincia   text,
    zona        text,
    activa      boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---- 1.3 admins (id = auth.users.id) ----
CREATE TABLE IF NOT EXISTS public.admins (
    id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id  uuid        NOT NULL REFERENCES public.empresas(id),
    nombre      text        NOT NULL,
    activo      boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    email       text,
    telefono    text
);

-- ---- 1.4 coordinadores (id = auth.users.id) ----
CREATE TABLE IF NOT EXISTS public.coordinadores (
    id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id  uuid        NOT NULL REFERENCES public.empresas(id),
    tienda_id   uuid        NOT NULL REFERENCES public.tiendas(id),
    nombre      text        NOT NULL,
    rol         text        NOT NULL DEFAULT 'coordinador',
    activo      boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---- 1.5 instaladores (id = auth.users.id) ----
-- `empresa_instaladora_id` NO se agrega acá -- la relación real la
-- introduce la migración `0010_instaladores_empresa_instaladora.sql`
-- (Sprint 8.4), que sigue aplicándose sin cambios después de este 0001.
CREATE TABLE IF NOT EXISTS public.instaladores (
    id                  uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id          uuid        NOT NULL REFERENCES public.empresas(id),
    nombre              text        NOT NULL,
    telefono            text,
    email               text,
    provincia           text,
    zona                text,
    rating              numeric     NOT NULL DEFAULT 5.0,
    km                  numeric     DEFAULT 0,
    cumplimiento        numeric     DEFAULT 100,
    aceptacion          numeric     DEFAULT 100,
    prom_respuesta_seg  integer,
    documentos_ok       boolean     NOT NULL DEFAULT true,
    suspendido          boolean     NOT NULL DEFAULT false,
    activo              boolean     NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- ---- 1.6 trabajos ----
CREATE TABLE IF NOT EXISTS public.trabajos (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id              uuid        NOT NULL REFERENCES public.empresas(id),
    tienda_id               uuid        NOT NULL REFERENCES public.tiendas(id),
    coordinador_id          uuid        NOT NULL REFERENCES public.coordinadores(id),
    codigo                  text        NOT NULL,
    tipo                    text        NOT NULL,
    provincia               text        NOT NULL,
    zona                    text        NOT NULL,
    tipo_inmueble           text,
    calle                   text,
    fecha                   text        NOT NULL,
    hora                    text        NOT NULL,
    equipo                  text,
    requisitos              text,
    extra                   text,
    precio_sugerido         numeric,
    urgente                 boolean     NOT NULL DEFAULT false,
    bid_minutos             integer     NOT NULL DEFAULT 5,
    estado                  text        NOT NULL DEFAULT 'live',
    publicado_at            timestamptz NOT NULL DEFAULT now(),
    bid_cierra_at           timestamptz,
    instalador_asignado_id  uuid        REFERENCES public.instaladores(id),
    asignado_at             timestamptz,
    contacto_visible_hasta  timestamptz,
    cliente_nombre          text,
    cliente_telefono        text,
    direccion_exacta        text,
    created_at              timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT trabajos_empresa_id_codigo_key UNIQUE (empresa_id, codigo)
);
-- `estado` es `text` libre (sin CHECK/ENUM) -- confirmado contra Producción
-- real (`information_schema.columns`); valor real observado hasta la fecha:
-- 'live' (los demás -- 'assigned'/'completed'/'cancelled' -- son inferidos
-- del código del frontend, `trabajoEstadoInfo()`, nunca vistos aún en datos
-- reales -- no se fuerza ningún CHECK para no bloquear un valor legítimo
-- todavía no observado).

-- ---- 1.7 trabajo_instaladores ----
CREATE TABLE IF NOT EXISTS public.trabajo_instaladores (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajo_id      uuid        NOT NULL REFERENCES public.trabajos(id) ON DELETE CASCADE,
    instalador_id   uuid        NOT NULL REFERENCES public.instaladores(id),
    estado          text        NOT NULL DEFAULT 'notificado',
    notificado_at   timestamptz NOT NULL DEFAULT now(),
    abierto_at      timestamptz,
    respondido_at   timestamptz,

    CONSTRAINT trabajo_instaladores_trabajo_id_instalador_id_key UNIQUE (trabajo_id, instalador_id)
);

-- ---- 1.8 ofertas ----
CREATE TABLE IF NOT EXISTS public.ofertas (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajo_id      uuid        NOT NULL REFERENCES public.trabajos(id) ON DELETE CASCADE,
    instalador_id   uuid        NOT NULL REFERENCES public.instaladores(id),
    precio          numeric     NOT NULL,
    dia             text        NOT NULL,
    hora            text        NOT NULL,
    comentario      text,
    enviado_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT ofertas_trabajo_id_instalador_id_key UNIQUE (trabajo_id, instalador_id)
);


-- ============================================================
-- 2. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_trabajos_empresa          ON public.trabajos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_trabajos_tienda            ON public.trabajos(tienda_id);
CREATE INDEX IF NOT EXISTS idx_trabajos_estado             ON public.trabajos(estado);
CREATE INDEX IF NOT EXISTS idx_ti_trabajo                  ON public.trabajo_instaladores(trabajo_id);
CREATE INDEX IF NOT EXISTS idx_ti_instalador                ON public.trabajo_instaladores(instalador_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_trabajo              ON public.ofertas(trabajo_id);


-- ============================================================
-- 3. FUNCIONES
-- ============================================================
-- Las 4 funciones de abajo estaban activas en Producción real sin ningún
-- `CREATE FUNCTION` en ninguna migración del repositorio (verificado con
-- `pg_get_functiondef` antes de escribir este archivo) -- se documentan
-- acá, en el punto de la cadena donde realmente pertenecen (antes de
-- cualquier Sprint que las dé por sentado).

-- `set_bid_cierra_at()` -- trigger BEFORE INSERT en `trabajos`.
CREATE OR REPLACE FUNCTION public.set_bid_cierra_at()
RETURNS trigger AS $$
begin
  new.bid_cierra_at := new.publicado_at + (new.bid_minutos * interval '1 minute');
  return new;
end;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_set_bid_cierra_at
    BEFORE INSERT ON public.trabajos
    FOR EACH ROW EXECUTE FUNCTION public.set_bid_cierra_at();

-- `instalador_fue_notificado(uuid)` -- SECURITY DEFINER, usada por la
-- policy de SELECT de `trabajos` para instaladores (sección 5). Rompe,
-- a propósito, la recursión que produciría una subconsulta directa a
-- `trabajo_instaladores` dentro de la policy de `trabajos` combinada con
-- las policies de `trabajo_instaladores` que a su vez consultan `trabajos`.
CREATE OR REPLACE FUNCTION public.instalador_fue_notificado(p_trabajo_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM trabajo_instaladores ti
        WHERE ti.trabajo_id = p_trabajo_id
        AND ti.instalador_id = auth.uid()
    );
$$;

-- `asignar_instalador(uuid, uuid)` -- asigna un instalador a un trabajo:
-- actualiza `trabajos` (estado/instalador_asignado_id/asignado_at/
-- contacto_visible_hasta según `empresas.contacto_visible_horas`) y
-- resuelve el estado del resto de los `trabajo_instaladores` de ese
-- trabajo ('confirmado' para el ganador, 'perdido' para el resto que ya
-- había respondido/sido seleccionado).
CREATE OR REPLACE FUNCTION public.asignar_instalador(p_trabajo_id uuid, p_instalador_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
declare
  v_horas integer;
begin
  select e.contacto_visible_horas into v_horas
  from trabajos t join empresas e on e.id = t.empresa_id
  where t.id = p_trabajo_id;

  update trabajos
  set estado = 'assigned',
      instalador_asignado_id = p_instalador_id,
      asignado_at = now(),
      contacto_visible_hasta = now() + (coalesce(v_horas, 48) * interval '1 hour')
  where id = p_trabajo_id;

  update trabajo_instaladores
  set estado = case when instalador_id = p_instalador_id then 'confirmado' else 'perdido' end
  where trabajo_id = p_trabajo_id
    and estado in ('respondido', 'seleccionado');
end;
$$;

-- `submit_bid(uuid, numeric, text, text, text)` -- crea la oferta del
-- instalador (idempotente vía `ON CONFLICT (trabajo_id, instalador_id) DO
-- NOTHING`, misma constraint real que `ofertas`) y marca su
-- `trabajo_instaladores.estado = 'respondido'`.
CREATE OR REPLACE FUNCTION public.submit_bid(
    p_trabajo_id uuid, p_precio numeric, p_dia text, p_hora text, p_comentario text
)
RETURNS void
LANGUAGE plpgsql
AS $$
begin
  insert into ofertas (trabajo_id, instalador_id, precio, dia, hora, comentario)
  values (p_trabajo_id, auth.uid(), p_precio, p_dia, p_hora, p_comentario)
  on conflict (trabajo_id, instalador_id) do nothing;

  update trabajo_instaladores
  set estado = 'respondido', respondido_at = now()
  where trabajo_id = p_trabajo_id and instalador_id = auth.uid();
end;
$$;

-- `notificar_instaladores_elegibles(uuid)` -- NO se recrea acá: ya está
-- correctamente definida en `0006_notificar_instaladores_elegibles.sql`
-- (Sprint 7.2), que sigue aplicándose sin cambios después de este 0001.
-- `set_updated_at()`/`nombre_empresa_instaladora(uuid)` -- NO se recrean
-- acá: pertenecen a `0009`/`0010` (Sprint 8.3/8.4), que también siguen
-- aplicándose sin cambios.


-- ============================================================
-- 4. ROW LEVEL SECURITY — ACTIVACIÓN
-- ============================================================
-- Producción real tiene, además, un event trigger (`ensure_rls`, función
-- `rls_auto_enable()`) que activa RLS automáticamente en cualquier tabla
-- nueva de `public` -- verificado vía `pg_event_trigger` antes de escribir
-- este archivo, sin ningún `CREATE EVENT TRIGGER` en ninguna migración
-- existente. Se documenta y se crea acá (sección 4.1) porque es
-- infraestructura real del proyecto, no una tabla nueva -- pero además se
-- declara `ENABLE ROW LEVEL SECURITY` explícito por tabla (4.2) para que
-- este archivo sea reproducible incluso en un proyecto Postgres/Supabase
-- sin ese event trigger ya configurado (los permisos para `CREATE EVENT
-- TRIGGER` pueden no estar disponibles en todos los entornos -- el `ALTER
-- TABLE ... ENABLE ROW LEVEL SECURITY` explícito no depende de eso).

-- 4.1 Event trigger real (auto-activa RLS en tablas nuevas de `public`).
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

DO $$ BEGIN
    CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
        WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
        EXECUTE FUNCTION public.rls_auto_enable();
EXCEPTION
    WHEN duplicate_object THEN NULL;
    -- `CREATE EVENT TRIGGER` no admite `IF NOT EXISTS` -- mismo patrón
    -- `DO $$ ... EXCEPTION WHEN duplicate_object` ya usado en este
    -- proyecto para `CREATE TYPE` (ver `legacy/0002...`). Si el entorno
    -- no permite crear event triggers (privilegios insuficientes), esta
    -- sección puede omitirse sin afectar el resto de la migración -- el
    -- 4.2 de abajo ya cubre RLS explícitamente por tabla.
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Sin privilegios para crear el event trigger ensure_rls -- se omite; RLS sigue activándose explícitamente por tabla (sección 4.2).';
END $$;

-- 4.2 RLS explícito por tabla (idempotente, no depende del event trigger).
ALTER TABLE public.empresas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiendas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinadores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instaladores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trabajos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trabajo_instaladores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ofertas                ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. POLICIES RLS BASE
-- ============================================================
-- Únicamente las 18 policies confirmadas vía `pg_policies` como ya
-- existentes ANTES de la migración `0003` -- se excluyen a propósito las
-- que agregan `0004`/`0005`/`0009` más adelante en la cadena (esas
-- migraciones no se tocaron, siguen creándolas ellas mismas).

-- ---- admins ----
DROP POLICY IF EXISTS "admins pueden leer su perfil" ON public.admins;
CREATE POLICY "admins pueden leer su perfil"
    ON public.admins FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- ---- coordinadores ----
DROP POLICY IF EXISTS "coordinadores leen su perfil" ON public.coordinadores;
CREATE POLICY "coordinadores leen su perfil"
    ON public.coordinadores FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- ---- empresas ----
DROP POLICY IF EXISTS "usuarios autenticados pueden leer empresas" ON public.empresas;
CREATE POLICY "usuarios autenticados pueden leer empresas"
    ON public.empresas FOR SELECT
    TO authenticated
    USING (true);

-- ---- tiendas ----
DROP POLICY IF EXISTS "usuarios autenticados pueden leer tiendas" ON public.tiendas;
CREATE POLICY "usuarios autenticados pueden leer tiendas"
    ON public.tiendas FOR SELECT
    TO authenticated
    USING (true);

-- ---- instaladores ----
DROP POLICY IF EXISTS "coordinadores ven instaladores de su empresa" ON public.instaladores;
CREATE POLICY "coordinadores ven instaladores de su empresa"
    ON public.instaladores FOR SELECT
    USING (
        empresa_id IN (SELECT coordinadores.empresa_id FROM coordinadores WHERE coordinadores.id = auth.uid())
    );

DROP POLICY IF EXISTS "instaladores ven su propio perfil" ON public.instaladores;
CREATE POLICY "instaladores ven su propio perfil"
    ON public.instaladores FOR SELECT
    USING (id = auth.uid());

-- ---- trabajos ----
DROP POLICY IF EXISTS "coordinadores ven trabajos de su tienda o de su empresa si admi" ON public.trabajos;
CREATE POLICY "coordinadores ven trabajos de su tienda o de su empresa si admi"
    ON public.trabajos FOR SELECT
    USING (
        (tienda_id IN (SELECT coordinadores.tienda_id FROM coordinadores WHERE coordinadores.id = auth.uid()))
        OR (empresa_id IN (SELECT coordinadores.empresa_id FROM coordinadores WHERE coordinadores.id = auth.uid() AND coordinadores.rol = 'admin'))
    );

DROP POLICY IF EXISTS "coordinadores publican en su tienda" ON public.trabajos;
CREATE POLICY "coordinadores publican en su tienda"
    ON public.trabajos FOR INSERT
    WITH CHECK (
        tienda_id IN (SELECT coordinadores.tienda_id FROM coordinadores WHERE coordinadores.id = auth.uid())
    );

DROP POLICY IF EXISTS "coordinadores actualizan su tienda" ON public.trabajos;
CREATE POLICY "coordinadores actualizan su tienda"
    ON public.trabajos FOR UPDATE
    USING (
        (tienda_id IN (SELECT coordinadores.tienda_id FROM coordinadores WHERE coordinadores.id = auth.uid()))
        OR (empresa_id IN (SELECT coordinadores.empresa_id FROM coordinadores WHERE coordinadores.id = auth.uid() AND coordinadores.rol = 'admin'))
    );

DROP POLICY IF EXISTS "instaladores ven trabajos donde fueron notificados" ON public.trabajos;
CREATE POLICY "instaladores ven trabajos donde fueron notificados"
    ON public.trabajos FOR SELECT
    USING (instalador_fue_notificado(id));

-- ---- trabajo_instaladores ----
DROP POLICY IF EXISTS "coordinadores ven y gestionan notificaciones de su empresa" ON public.trabajo_instaladores;
CREATE POLICY "coordinadores ven y gestionan notificaciones de su empresa"
    ON public.trabajo_instaladores FOR SELECT
    USING (
        trabajo_id IN (SELECT trabajos.id FROM trabajos WHERE trabajos.empresa_id IN (
            SELECT coordinadores.empresa_id FROM coordinadores WHERE coordinadores.id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "coordinadores crean notificaciones de su empresa" ON public.trabajo_instaladores;
CREATE POLICY "coordinadores crean notificaciones de su empresa"
    ON public.trabajo_instaladores FOR INSERT
    WITH CHECK (
        trabajo_id IN (SELECT trabajos.id FROM trabajos WHERE trabajos.empresa_id IN (
            SELECT coordinadores.empresa_id FROM coordinadores WHERE coordinadores.id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "coordinadores actualizan notificaciones de su empresa" ON public.trabajo_instaladores;
CREATE POLICY "coordinadores actualizan notificaciones de su empresa"
    ON public.trabajo_instaladores FOR UPDATE
    USING (
        trabajo_id IN (SELECT trabajos.id FROM trabajos WHERE trabajos.empresa_id IN (
            SELECT coordinadores.empresa_id FROM coordinadores WHERE coordinadores.id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "instaladores ven sus propias notificaciones" ON public.trabajo_instaladores;
CREATE POLICY "instaladores ven sus propias notificaciones"
    ON public.trabajo_instaladores FOR SELECT
    USING (instalador_id = auth.uid());

DROP POLICY IF EXISTS "instaladores actualizan su propio estado" ON public.trabajo_instaladores;
CREATE POLICY "instaladores actualizan su propio estado"
    ON public.trabajo_instaladores FOR UPDATE
    USING (instalador_id = auth.uid())
    WITH CHECK (instalador_id = auth.uid());

-- ---- ofertas ----
DROP POLICY IF EXISTS "coordinadores ven ofertas de su empresa" ON public.ofertas;
CREATE POLICY "coordinadores ven ofertas de su empresa"
    ON public.ofertas FOR SELECT
    USING (
        trabajo_id IN (SELECT trabajos.id FROM trabajos WHERE trabajos.empresa_id IN (
            SELECT coordinadores.empresa_id FROM coordinadores WHERE coordinadores.id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "instaladores ven sus propias ofertas" ON public.ofertas;
CREATE POLICY "instaladores ven sus propias ofertas"
    ON public.ofertas FOR SELECT
    USING (instalador_id = auth.uid());

DROP POLICY IF EXISTS "instaladores envian su propia oferta" ON public.ofertas;
CREATE POLICY "instaladores envian su propia oferta"
    ON public.ofertas FOR INSERT
    WITH CHECK (instalador_id = auth.uid());


-- ============================================================
-- 6. GRANTS BASE
-- ============================================================
-- SELECT en las 8 tablas para `authenticated` -- confirmado real vía
-- `information_schema.role_table_grants` en las 8 tablas (más `INSERT`
-- adicional en `trabajos`, necesario para "coordinadores publican en su
-- tienda"). `REFERENCES`/`TRIGGER`/`TRUNCATE` que Producción real también
-- muestra para `anon`/`authenticated` en todas las tablas son privilegios
-- por defecto de plataforma (Supabase los aplica automáticamente a tablas
-- nuevas vía `ALTER DEFAULT PRIVILEGES` de proyecto) -- no se declaran acá
-- explícitamente porque no otorgan ninguna capacidad funcional real y un
-- proyecto Supabase nuevo los aplica por sí solo.
GRANT SELECT ON public.empresas             TO authenticated;
GRANT SELECT ON public.tiendas              TO authenticated;
GRANT SELECT ON public.admins               TO authenticated;
GRANT SELECT ON public.coordinadores        TO authenticated;
GRANT SELECT ON public.instaladores         TO authenticated;
GRANT SELECT, INSERT ON public.trabajos     TO authenticated;
-- `trabajo_instaladores`/`ofertas`: SELECT/INSERT/UPDATE para
-- `authenticated` se otorgan en `0007_authenticated_grants_sprint72.sql`
-- (Sprint 7.2, sin cambios) -- no se duplican acá para no tocar ese
-- archivo ni su justificación original.
-- `admins`/`instaladores` para `service_role`: se otorgan en
-- `0003_service_role_grants_admins_instaladores.sql` (sin cambios).


-- ============================================================
-- VALIDACIÓN (ejecutar después de aplicar, antes de continuar con 0002+)
-- ============================================================
-- select table_name from information_schema.tables where table_schema='public' order by table_name;
-- -- Debe listar: admins, coordinadores, empresas, instaladores, ofertas, tiendas, trabajo_instaladores, trabajos
--
-- select policyname, tablename from pg_policies where schemaname='public' order by tablename, policyname;
-- -- Debe listar exactamente las 18 policies de la sección 5 (0004/0005/0009/0010 agregan el resto más adelante)
--
-- select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by proname;
-- -- Debe incluir: asignar_instalador, instalador_fue_notificado, rls_auto_enable, set_bid_cierra_at


-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP TABLE IF EXISTS public.ofertas, public.trabajo_instaladores, public.trabajos,
--     public.instaladores, public.coordinadores, public.admins, public.tiendas, public.empresas CASCADE;
-- DROP EVENT TRIGGER IF EXISTS ensure_rls;
-- DROP FUNCTION IF EXISTS public.rls_auto_enable();
-- DROP FUNCTION IF EXISTS public.submit_bid(uuid, numeric, text, text, text);
-- DROP FUNCTION IF EXISTS public.asignar_instalador(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.instalador_fue_notificado(uuid);
-- DROP FUNCTION IF EXISTS public.set_bid_cierra_at();

-- ============================================================
-- FIN DE LA MIGRACIÓN 0001 (reconstruida — Sprint 8.4.1)
-- ============================================================
