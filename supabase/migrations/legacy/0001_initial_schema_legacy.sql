-- ============================================================
-- HANDYMAX · Supabase Schema v3
-- Multimax Despacho — plataforma de despacho de instaladores
-- ============================================================
-- Proyecto: bdevkryrgmttxnlxaisd
-- Nota: ejecutar en orden, de arriba a abajo, junto con el resto
-- de `supabase/migrations/*.sql` (ver `supabase/README.md` para
-- el flujo oficial de migraciones).
--
-- Sprint 4.0.1 (segunda ronda) — Database Infrastructure Baseline:
-- este archivo se limpió de datos (INSERT/DO de seed) y de las
-- queries de verificación manual que tenía originalmente, para
-- dejarlo como una migración de solo-estructura (CREATE/ALTER/
-- índices/funciones/vistas/RLS). El detalle de qué se movió y
-- adónde está documentado en `PHASE_4.md`. Los datos iniciales
-- (empresa Multimax + sus 9 sucursales) viven ahora en
-- `supabase/seed.sql`; las queries de verificación manual viven
-- en `supabase/README.md`.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 0. EXTENSIONES
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ────────────────────────────────────────────────────────────
-- 1. EMPRESAS (multi-tenant)
-- Permite licenciar la plataforma a otros retailers en el futuro.
-- Multimax = empresa_id que se asigna al hacer el primer INSERT.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empresas (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      text        NOT NULL,
    slug        text        NOT NULL UNIQUE,   -- ej: 'multimax', 'do-it-center'
    activa      boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Dato inicial (empresa Multimax) movido a supabase/seed.sql — Sprint 4.0.1
-- (segunda ronda, "Database Infrastructure Baseline"). Esta migración ya no
-- contiene INSERT/UPDATE/DELETE, únicamente estructura.


-- ────────────────────────────────────────────────────────────
-- 2. SUCURSALES
-- Las 9 sucursales actuales de Multimax.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sucursales (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id  uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre      text        NOT NULL,           -- ej: 'Multiplaza', 'Albrook'
    provincia   text,
    direccion   text,
    activa      boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Datos iniciales (las 9 sucursales de Multimax) movidos a
-- supabase/seed.sql — Sprint 4.0.1 (segunda ronda, "Database
-- Infrastructure Baseline"). Esta migración ya no contiene
-- INSERT/UPDATE/DELETE, únicamente estructura.


-- ────────────────────────────────────────────────────────────
-- 3. USUARIOS
-- Coordinadores, instaladores y admins.
-- Se enlaza con auth.users de Supabase Auth via auth_id.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id         uuid        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    empresa_id      uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    sucursal_id     uuid        REFERENCES sucursales(id) ON DELETE SET NULL,
    rol             text        NOT NULL CHECK (rol IN ('coordinador', 'instalador', 'admin')),
    nombre          text        NOT NULL,
    email           text        NOT NULL,
    telefono        text,
    empresa_nombre  text,       -- nombre de la empresa/taller del instalador
    -- métricas del instalador (actualizadas por triggers o funciones)
    rating          numeric(3,2) DEFAULT 5.0,
    cumplimiento    integer      DEFAULT 100,   -- porcentaje 0-100
    aceptacion      integer      DEFAULT 100,   -- porcentaje 0-100
    -- estado del instalador
    activo          boolean     NOT NULL DEFAULT true,
    suspendido      boolean     NOT NULL DEFAULT false,
    docs_completos  boolean     NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 4. ZONAS DE COBERTURA
-- Qué zonas atiende cada instalador (relación muchos a muchos).
-- Un instalador puede cubrir varias zonas.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zonas_cobertura (
    id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    instalador_id   uuid    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    provincia       text    NOT NULL,
    zona            text    NOT NULL,
    UNIQUE (instalador_id, provincia, zona)
);


-- ────────────────────────────────────────────────────────────
-- 5. TRABAJOS
-- Tabla central. Un trabajo = un job de instalación publicado
-- por un coordinador para ser atendido por un instalador.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trabajos (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id          uuid        NOT NULL REFERENCES empresas(id),
    sucursal_id         uuid        NOT NULL REFERENCES sucursales(id),
    coordinador_id      uuid        NOT NULL REFERENCES usuarios(id),

    -- Descripción del trabajo
    tipo                text        NOT NULL,   -- ej: 'Instalación A/C 12,000 BTU'
    zona                text        NOT NULL,
    provincia           text        NOT NULL DEFAULT 'Panamá',
    tipo_inmueble       text,                   -- 'Edificio' | 'Casa'
    calle               text,                   -- dirección parcial (visible antes de asignar)
    equipo              text,                   -- modelo del equipo a instalar
    requisitos          text,                   -- notas adicionales para el instalador

    -- Precio y tiempo de bid
    precio_sugerido     numeric(10,2),
    bid_mins            integer     NOT NULL DEFAULT 10,  -- minutos para cerrar el bid
    published_at        timestamptz NOT NULL DEFAULT now(),
    bid_cierra_at       timestamptz,            -- calculado por trigger BEFORE INSERT

    -- Estado del trabajo
    -- 'live'      → publicado, esperando bids
    -- 'assigned'  → instalador seleccionado
    -- 'completed' → trabajo completado
    -- 'cancelled' → trabajo cancelado
    phase               text        NOT NULL DEFAULT 'live'
                        CHECK (phase IN ('live', 'assigned', 'completed', 'cancelled')),

    assigned_bid_id     uuid,                   -- FK a bids (se agrega después de crear bids)

    -- Datos del cliente
    -- IMPORTANTE: visibles solo al instalador asignado (controlado por RLS)
    cliente_nombre      text,
    cliente_telefono    text,
    cliente_direccion   text,                   -- dirección exacta completa

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 6. BIDS (ofertas de los instaladores)
-- Un instalador solo puede hacer un bid por trabajo.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bids (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajo_id          uuid        NOT NULL REFERENCES trabajos(id) ON DELETE CASCADE,
    instalador_id       uuid        NOT NULL REFERENCES usuarios(id),

    -- Oferta del instalador
    precio              numeric(10,2) NOT NULL,
    fecha_disponible    date        NOT NULL,
    hora_disponible     text        NOT NULL,   -- ej: '10:00 a.m.'
    comentario          text,

    -- Estado del bid
    -- 'pendiente'    → en espera de decisión del coordinador
    -- 'seleccionado' → este bid fue elegido (instalador asignado)
    -- 'rechazado'    → el coordinador eligió a otro instalador
    estado              text        NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente', 'seleccionado', 'rechazado')),

    respondido_at       timestamptz NOT NULL DEFAULT now(),
    created_at          timestamptz NOT NULL DEFAULT now(),

    UNIQUE (trabajo_id, instalador_id)  -- un instalador, un bid por trabajo
);

-- Ahora que bids existe, agregar FK de trabajos → bids
ALTER TABLE trabajos
    ADD CONSTRAINT fk_trabajos_assigned_bid
    FOREIGN KEY (assigned_bid_id) REFERENCES bids(id) ON DELETE SET NULL;


-- ────────────────────────────────────────────────────────────
-- 7. NOTIFICACIONES
-- Log de alertas enviadas para auditoría y reintentos.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificaciones (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajo_id      uuid        NOT NULL REFERENCES trabajos(id) ON DELETE CASCADE,
    destinatario_id uuid        NOT NULL REFERENCES usuarios(id),
    canal           text        NOT NULL CHECK (canal IN ('sms', 'whatsapp', 'push', 'email')),
    mensaje         text,
    enviado         boolean     NOT NULL DEFAULT false,
    enviado_at      timestamptz,
    error           text,       -- mensaje de error si falló el envío
    created_at      timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TRIGGER: calcular bid_cierra_at al insertar un trabajo
-- NOTA IMPORTANTE: NO usar generated column para esto.
-- Supabase no soporta generated columns que referencien otras
-- columnas al momento del INSERT. Schema v2 tenía este bug.
-- v3 lo resuelve con este trigger BEFORE INSERT.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_bid_cierra_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.bid_cierra_at := NEW.published_at + (NEW.bid_mins || ' minutes')::interval;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_set_bid_cierra_at
    BEFORE INSERT ON trabajos
    FOR EACH ROW
    EXECUTE FUNCTION set_bid_cierra_at();


-- ────────────────────────────────────────────────────────────
-- TRIGGER: actualizar updated_at automáticamente
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_trabajos_updated_at
    BEFORE UPDATE ON trabajos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trigger_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE empresas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE zonas_cobertura   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones    ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- Función auxiliar: obtener el rol del usuario autenticado
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS text AS $$
    SELECT rol FROM usuarios WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Función auxiliar: obtener la sucursal del coordinador autenticado
CREATE OR REPLACE FUNCTION get_my_sucursal_id()
RETURNS uuid AS $$
    SELECT sucursal_id FROM usuarios WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Función auxiliar: obtener el id interno del usuario autenticado
CREATE OR REPLACE FUNCTION get_my_usuario_id()
RETURNS uuid AS $$
    SELECT id FROM usuarios WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- POLÍTICAS: empresas
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Todos pueden ver empresas activas"
    ON empresas FOR SELECT
    USING (activa = true);


-- ────────────────────────────────────────────────────────────
-- POLÍTICAS: sucursales
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Todos pueden ver sucursales activas"
    ON sucursales FOR SELECT
    USING (activa = true);


-- ────────────────────────────────────────────────────────────
-- POLÍTICAS: usuarios
-- ────────────────────────────────────────────────────────────
-- Cada usuario ve su propio perfil
CREATE POLICY "Usuario ve su propio perfil"
    ON usuarios FOR SELECT
    USING (auth_id = auth.uid());

-- Coordinador ve instaladores activos de su empresa
CREATE POLICY "Coordinador ve instaladores de su empresa"
    ON usuarios FOR SELECT
    USING (
        get_my_rol() IN ('coordinador', 'admin')
        AND rol = 'instalador'
        AND activo = true
    );

-- Admin ve todos los usuarios
CREATE POLICY "Admin ve todos los usuarios"
    ON usuarios FOR SELECT
    USING (get_my_rol() = 'admin');

-- Admin puede insertar y actualizar usuarios (para invitar instaladores)
CREATE POLICY "Admin puede crear usuarios"
    ON usuarios FOR INSERT
    WITH CHECK (get_my_rol() = 'admin');

CREATE POLICY "Admin puede actualizar usuarios"
    ON usuarios FOR UPDATE
    USING (get_my_rol() = 'admin');


-- ────────────────────────────────────────────────────────────
-- POLÍTICAS: zonas_cobertura
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Instalador ve sus propias zonas"
    ON zonas_cobertura FOR SELECT
    USING (instalador_id = get_my_usuario_id());

CREATE POLICY "Coordinador y admin ven todas las zonas"
    ON zonas_cobertura FOR SELECT
    USING (get_my_rol() IN ('coordinador', 'admin'));

CREATE POLICY "Admin gestiona zonas de cobertura"
    ON zonas_cobertura FOR ALL
    USING (get_my_rol() = 'admin');


-- ────────────────────────────────────────────────────────────
-- POLÍTICAS: trabajos
-- ────────────────────────────────────────────────────────────

-- Coordinador ve y gestiona trabajos de su sucursal
CREATE POLICY "Coordinador ve trabajos de su sucursal"
    ON trabajos FOR SELECT
    USING (
        get_my_rol() = 'coordinador'
        AND sucursal_id = get_my_sucursal_id()
    );

CREATE POLICY "Coordinador crea trabajos en su sucursal"
    ON trabajos FOR INSERT
    WITH CHECK (
        get_my_rol() = 'coordinador'
        AND sucursal_id = get_my_sucursal_id()
    );

CREATE POLICY "Coordinador actualiza trabajos de su sucursal"
    ON trabajos FOR UPDATE
    USING (
        get_my_rol() = 'coordinador'
        AND sucursal_id = get_my_sucursal_id()
    );

-- Instalador ve trabajos 'live' en sus zonas de cobertura
-- (SIN datos del cliente — eso se controla en la siguiente política)
CREATE POLICY "Instalador ve trabajos live en su zona"
    ON trabajos FOR SELECT
    USING (
        get_my_rol() = 'instalador'
        AND phase = 'live'
        AND EXISTS (
            SELECT 1 FROM zonas_cobertura zc
            WHERE zc.instalador_id = get_my_usuario_id()
            AND zc.zona = trabajos.zona
            AND zc.provincia = trabajos.provincia
        )
    );

-- Admin ve todos los trabajos
CREATE POLICY "Admin ve todos los trabajos"
    ON trabajos FOR SELECT
    USING (get_my_rol() = 'admin');

CREATE POLICY "Admin puede actualizar cualquier trabajo"
    ON trabajos FOR UPDATE
    USING (get_my_rol() = 'admin');


-- ────────────────────────────────────────────────────────────
-- POLÍTICA CRÍTICA: datos del cliente
-- cliente_nombre, cliente_telefono, cliente_direccion solo
-- son accesibles al instalador cuyo bid está seleccionado.
--
-- IMPLEMENTACIÓN: crear una vista que enmascare los campos
-- sensibles para instaladores no asignados.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW trabajos_vista AS
SELECT
    t.id,
    t.empresa_id,
    t.sucursal_id,
    t.coordinador_id,
    t.tipo,
    t.zona,
    t.provincia,
    t.tipo_inmueble,
    t.calle,
    t.equipo,
    t.requisitos,
    t.precio_sugerido,
    t.bid_mins,
    t.published_at,
    t.bid_cierra_at,
    t.phase,
    t.assigned_bid_id,
    -- Datos del cliente: solo visibles si el instalador actual es el asignado
    CASE
        WHEN get_my_rol() IN ('coordinador', 'admin') THEN t.cliente_nombre
        WHEN get_my_rol() = 'instalador' AND EXISTS (
            SELECT 1 FROM bids b
            WHERE b.id = t.assigned_bid_id
            AND b.instalador_id = get_my_usuario_id()
            AND b.estado = 'seleccionado'
        ) THEN t.cliente_nombre
        ELSE NULL
    END AS cliente_nombre,
    CASE
        WHEN get_my_rol() IN ('coordinador', 'admin') THEN t.cliente_telefono
        WHEN get_my_rol() = 'instalador' AND EXISTS (
            SELECT 1 FROM bids b
            WHERE b.id = t.assigned_bid_id
            AND b.instalador_id = get_my_usuario_id()
            AND b.estado = 'seleccionado'
        ) THEN t.cliente_telefono
        ELSE NULL
    END AS cliente_telefono,
    CASE
        WHEN get_my_rol() IN ('coordinador', 'admin') THEN t.cliente_direccion
        WHEN get_my_rol() = 'instalador' AND EXISTS (
            SELECT 1 FROM bids b
            WHERE b.id = t.assigned_bid_id
            AND b.instalador_id = get_my_usuario_id()
            AND b.estado = 'seleccionado'
        ) THEN t.cliente_direccion
        ELSE NULL
    END AS cliente_direccion,
    t.created_at,
    t.updated_at
FROM trabajos t;


-- ────────────────────────────────────────────────────────────
-- POLÍTICAS: bids
-- ────────────────────────────────────────────────────────────

-- Instalador ve solo sus propios bids
CREATE POLICY "Instalador ve sus propios bids"
    ON bids FOR SELECT
    USING (instalador_id = get_my_usuario_id());

-- Instalador puede hacer un bid (INSERT)
CREATE POLICY "Instalador puede hacer bid"
    ON bids FOR INSERT
    WITH CHECK (
        get_my_rol() = 'instalador'
        AND instalador_id = get_my_usuario_id()
        -- solo si el trabajo está en fase 'live' y el bid no cerró
        AND EXISTS (
            SELECT 1 FROM trabajos t
            WHERE t.id = bids.trabajo_id
            AND t.phase = 'live'
            AND t.bid_cierra_at > now()
        )
    );

-- Coordinador ve todos los bids de sus trabajos
CREATE POLICY "Coordinador ve bids de sus trabajos"
    ON bids FOR SELECT
    USING (
        get_my_rol() = 'coordinador'
        AND EXISTS (
            SELECT 1 FROM trabajos t
            WHERE t.id = bids.trabajo_id
            AND t.sucursal_id = get_my_sucursal_id()
        )
    );

-- Coordinador puede actualizar bids (para seleccionar/rechazar)
CREATE POLICY "Coordinador actualiza bids de sus trabajos"
    ON bids FOR UPDATE
    USING (
        get_my_rol() = 'coordinador'
        AND EXISTS (
            SELECT 1 FROM trabajos t
            WHERE t.id = bids.trabajo_id
            AND t.sucursal_id = get_my_sucursal_id()
        )
    );

-- Admin ve y gestiona todos los bids
CREATE POLICY "Admin gestiona todos los bids"
    ON bids FOR ALL
    USING (get_my_rol() = 'admin');


-- ────────────────────────────────────────────────────────────
-- POLÍTICAS: notificaciones
-- ────────────────────────────────────────────────────────────
CREATE POLICY "Coordinador y admin ven notificaciones"
    ON notificaciones FOR SELECT
    USING (get_my_rol() IN ('coordinador', 'admin'));

CREATE POLICY "Instalador ve sus propias notificaciones"
    ON notificaciones FOR SELECT
    USING (destinatario_id = get_my_usuario_id());


-- ============================================================
-- ÍNDICES (para performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_trabajos_sucursal   ON trabajos(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_trabajos_phase       ON trabajos(phase);
CREATE INDEX IF NOT EXISTS idx_trabajos_zona        ON trabajos(zona, provincia);
CREATE INDEX IF NOT EXISTS idx_trabajos_published   ON trabajos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_trabajo         ON bids(trabajo_id);
CREATE INDEX IF NOT EXISTS idx_bids_instalador      ON bids(instalador_id);
CREATE INDEX IF NOT EXISTS idx_bids_estado          ON bids(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol         ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth        ON usuarios(auth_id);
CREATE INDEX IF NOT EXISTS idx_zonas_instalador     ON zonas_cobertura(instalador_id);


-- ============================================================
-- FIN DEL SCHEMA v3
-- ============================================================
-- Las queries de verificación manual que este archivo tenía antes
-- (listar tablas creadas, verificar sucursales insertadas, probar
-- el trigger bid_cierra_at) se movieron a `supabase/README.md`
-- ("Cómo verificar que una migración aplicó correctamente") —
-- Sprint 4.0.1 (segunda ronda). Una migración no debe contener
-- SELECT de verificación, únicamente las sentencias estructurales
-- listadas al inicio de este archivo.
-- ============================================================
