-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint 8.3
-- Administración de Empresas Instaladoras — estructura completa
-- ============================================================
-- Requiere: 0001..0008 ya aplicadas. Es ADITIVA/no destructiva: crea
-- una tabla nueva, no modifica ninguna tabla/policy/función existente.
-- Verificado vía MCP (2026-08-10) contra el schema real de Producción
-- (no contra `0001_initial_schema.sql`, que documenta un modelo anterior
-- ya superado -- ver `supabase/migrations/legacy/`): las 9 tablas/vistas
-- reales son `admins`/`coordinadores`/`empresas`/`instaladores`/`ofertas`/
-- `tiendas`/`trabajo_instaladores`/`trabajos`/`trabajos_para_instalador`;
-- no existe ninguna función `set_updated_at()`/`get_my_rol()` todavía.
--
-- ────────────────────────────────────────────────────────────
-- ALCANCE
-- ────────────────────────────────────────────────────────────
-- Sprint 8.3 ("Administración de Empresas Instaladoras"): catálogo oficial
-- de empresas instaladoras (subcontratistas), gestionado por `admin`. NO
-- implementa todavía el registro de instaladores ni la relación
-- `instaladores -> empresas_instaladoras` (Sprint 8.4) -- esta migración
-- NO toca la tabla `instaladores`.
--
-- `empresa_id` (NUEVO, no pedido explícitamente por el brief pero
-- consistente con el resto del schema real -- `trabajos`/`tiendas`/
-- `instaladores`/`admins`/`coordinadores` son todos tenant-scoped vía
-- `empresa_id uuid REFERENCES empresas(id)`): sin este campo, el catálogo
-- de empresas instaladoras sería global entre tenants, rompiendo el
-- aislamiento multi-tenant que el resto de la arquitectura ya garantiza.
-- Se agrega como columna obligatoria, misma convención exacta.
--
-- Borrado lógico: la columna `activa` (pedida explícitamente por el
-- brief) cumple ese rol -- "activar"/"desactivar" son UPDATE de esa
-- columna, nunca DELETE. No se agrega ninguna policy de DELETE (ver
-- sección 4) -- RLS deniega DELETE por defecto sin una policy explícita,
-- refuerzo a nivel de base de datos del borrado lógico pedido.
--
-- ────────────────────────────────────────────────────────────
-- AUDITORÍA DE CONSISTENCIA (pedida explícitamente antes de aplicar)
-- ────────────────────────────────────────────────────────────
-- Verificado vía MCP contra las 8 tablas reales completas (`list_tables
-- verbose` + `information_schema.referential_constraints`), no contra los
-- archivos de migración 0001/0002 (legacy, ver arriba):
--   - PK `id uuid DEFAULT gen_random_uuid()`: igual que `empresas`/
--     `tiendas`/`trabajos`/`ofertas` (tablas de datos de negocio, no
--     ligadas 1:1 a `auth.users` como `admins`/`coordinadores`/
--     `instaladores`, cuyo `id` SÍ es la FK a Auth sin default propio).
--   - `empresa_id uuid NOT NULL REFERENCES empresas(id)`: **sin**
--     `ON DELETE CASCADE` -- se detectó y corrigió una discrepancia real:
--     el primer borrador de esta migración sí la tenía, pero los 5 FKs
--     `empresa_id` reales (`admins`/`coordinadores`/`instaladores`/
--     `tiendas`/`trabajos`) usan todos `NO ACTION` (default), confirmado
--     vía `referential_constraints.delete_rule`. Corregido para que
--     `empresas_instaladoras` siga exactamente esa misma convención.
--   - `activa boolean NOT NULL DEFAULT true`: idéntico a `empresas.activa`/
--     `tiendas.activa`.
--   - `created_at timestamptz NOT NULL DEFAULT now()`: idéntico a las 8
--     tablas reales.
--   - `updated_at`: NINGUNA de las 8 tablas reales la tiene -- es la única
--     columna de esta migración sin precedente en el schema existente. Se
--     conserva de todas formas porque el propio brief del Sprint 8.3 la
--     pide explícitamente como columna obligatoria (a diferencia de
--     `pais`, tampoco tiene precedente pero tampoco genera ninguna
--     inconsistencia real por ser nueva) -- es una adición deliberada
--     pedida por el usuario, no un patrón inventado por esta migración;
--     se implementa con el mecanismo estándar de Postgres (trigger
--     `BEFORE UPDATE`), no con nada específico de este proyecto.
--   - GRANTs a `authenticated` (SELECT/INSERT/UPDATE, sin DELETE): sigue
--     el patrón de `trabajos` (dato de negocio puro, escritura directa del
--     cliente vía RLS: `coordinadores publican en su tienda`), NO el de
--     `instaladores` (sin INSERT/UPDATE para `authenticated` -- esa tabla
--     solo se escribe vía la Edge Function `admin-operations`/
--     `service_role`, porque cada operación está atada al ciclo de vida de
--     una cuenta real de Supabase Auth: invitar crea el usuario, suspender
--     idealmente bloquea su sesión). `empresas_instaladoras` no tiene
--     ninguna cuenta de Auth asociada -- es un catálogo de datos puro,
--     arquitectónicamente igual a `trabajos`, no a `instaladores` -- por
--     eso el `admin` puede crear/editar/activar/desactivar directamente
--     desde el cliente, con RLS como única barrera, sin Edge Function.
--   - RLS: mismo patrón exacto, verificado vía `pg_policies` en vivo, que
--     `"admins ven trabajos de su empresa"`/`"admins ven instaladores de
--     su empresa"` (migraciones 0004/0005, ambas confirmadas activas en
--     Producción) -- `EXISTS (SELECT 1 FROM admins a WHERE a.id =
--     auth.uid() AND a.empresa_id = <tabla>.empresa_id)`.
--   - Nombres: snake_case, español, tabla en plural -- igual que
--     `admins`/`coordinadores`/`instaladores`/`trabajos`/`tiendas`/`ofertas`.
-- ============================================================


-- ============================================================
-- 1. TABLA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.empresas_instaladoras (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id   uuid        NOT NULL REFERENCES public.empresas(id),
    nombre       text        NOT NULL,
    razon_social text,
    contacto     text,
    email        text,
    telefono     text,
    direccion    text,
    ciudad       text,
    provincia    text,
    pais         text        NOT NULL DEFAULT 'Panamá',
    logo_url     text,
    activa       boolean     NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT empresas_instaladoras_empresa_nombre_unique UNIQUE (empresa_id, nombre)
);

COMMENT ON TABLE public.empresas_instaladoras IS
    'Catálogo de empresas instaladoras (subcontratistas) por tenant. Sprint 8.3. Borrado lógico vía `activa` -- nunca DELETE físico.';


-- ============================================================
-- 2. TRIGGER — actualizar updated_at automáticamente
-- ============================================================
-- `set_updated_at()` no existe todavía en Producción (verificado, ver
-- cabecera) -- se crea acá, reutilizable por futuras tablas que lo
-- necesiten, sin reemplazar ninguna función existente.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_empresas_instaladoras_updated_at
    BEFORE UPDATE ON public.empresas_instaladoras
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 3. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_empresas_instaladoras_empresa ON public.empresas_instaladoras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresas_instaladoras_activa  ON public.empresas_instaladoras(activa);
CREATE INDEX IF NOT EXISTS idx_empresas_instaladoras_nombre  ON public.empresas_instaladoras(nombre);


-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS) + POLICIES
-- ============================================================
-- Mismo patrón ya validado y en uso real (migraciones 0004/0005): un
-- `admin` gestiona el catálogo únicamente de su propia empresa (tenant).
-- `coordinador`/`instalador` NO tienen policy -- este catálogo es
-- exclusivamente administrativo, mismo criterio que `AdminInstaladores`
-- (gestión de instaladores individuales, también admin-only). Sin policy
-- de DELETE -- ver nota de borrado lógico en la cabecera.
ALTER TABLE public.empresas_instaladoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins ven empresas instaladoras de su empresa"
    ON public.empresas_instaladoras
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.admins a
            WHERE a.id = auth.uid()
              AND a.empresa_id = empresas_instaladoras.empresa_id
        )
    );

CREATE POLICY "admins crean empresas instaladoras en su empresa"
    ON public.empresas_instaladoras
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.admins a
            WHERE a.id = auth.uid()
              AND a.empresa_id = empresas_instaladoras.empresa_id
        )
    );

CREATE POLICY "admins actualizan empresas instaladoras de su empresa"
    ON public.empresas_instaladoras
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.admins a
            WHERE a.id = auth.uid()
              AND a.empresa_id = empresas_instaladoras.empresa_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.admins a
            WHERE a.id = auth.uid()
              AND a.empresa_id = empresas_instaladoras.empresa_id
        )
    );


-- ============================================================
-- 5. GRANTS
-- ============================================================
-- Aprendido de los incidentes de los Sprints 5.2.2.2/7.2 (privilegios SQL
-- evaluados ANTES que RLS -- sin GRANT, la policy nunca llega a
-- evaluarse, error 42501). Se incluye desde el inicio, no como fix
-- posterior. Sin GRANT DELETE -- ver nota de borrado lógico.
GRANT SELECT, INSERT, UPDATE ON public.empresas_instaladoras TO authenticated;


-- ============================================================
-- VALIDACIÓN (ejecutar después de aplicar)
-- ============================================================
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'empresas_instaladoras'
-- order by ordinal_position;
--
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where tablename = 'empresas_instaladoras'
-- order by policyname;
--
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_name = 'empresas_instaladoras'
-- order by grantee, privilege_type;


-- ============================================================
-- ROLLBACK
-- ============================================================
-- DROP TABLE IF EXISTS public.empresas_instaladoras CASCADE;
-- -- `set_updated_at()` no se elimina en el rollback: es una función
-- -- genérica reutilizable, sin acoplamiento a esta tabla en particular.

-- ============================================================
-- FIN DE LA MIGRACIÓN 0009
-- ============================================================
