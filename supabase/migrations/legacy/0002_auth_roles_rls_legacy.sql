-- ============================================================
-- HANDYMAX · Fase 4 — Sprint 4.0.1
-- Infraestructura de Auth/Roles/RLS sobre el schema v3 existente
-- ============================================================
-- Ejecutar en: Supabase Dashboard → SQL Editor (o `supabase db push`)
-- Proyecto: bdevkryrgmttxnlxaisd
-- Requiere: 0001_initial_schema.sql ya aplicado.
-- Nota: ejecutar en orden, de arriba a abajo. Es ADITIVA/no destructiva:
-- no elimina tablas, columnas ni filas existentes (ver "REVERSIÓN" al
-- final para el procedimiento de rollback documentado).
--
-- ────────────────────────────────────────────────────────────
-- NOTA DE TRAZABILIDAD — nombre y ruta de este archivo
-- ────────────────────────────────────────────────────────────
-- El brief de este Sprint pedía literalmente `database/migrations/
-- 002_auth_roles_rls.sql`. Ese directorio no existe en el proyecto: la
-- convención real, ya establecida desde Fase 1/2 y usada por
-- `0001_initial_schema.sql`, es `supabase/migrations/NNNN_nombre.sql`
-- (prefijo numérico de 4 dígitos, carpeta `supabase/`, no `database/`).
-- Se sigue la convención real existente en vez de crear una carpeta nueva
-- no usada por el resto del proyecto — mismo criterio de "verificar contra
-- la fuente real, corregir con trazabilidad" aplicado en todos los Sprints
-- de Fase 3. Ver docs/PHASE_4.md → "Diferencias detectadas" para el detalle
-- completo de esta y otras correcciones de nombres/columnas de este Sprint.
-- ============================================================


-- ============================================================
-- 1. ENUMS
-- ============================================================
-- Todos los ENUM se crean con DO $$ ... EXCEPTION WHEN duplicate_object
-- para que la migración sea segura de re-ejecutar (idempotente), ya que
-- `CREATE TYPE` no admite `IF NOT EXISTS` en las versiones de Postgres
-- que usa Supabase.

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'coordinador', 'instalador');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
-- Coincide exactamente con los 3 valores ya usados por `usuarios.rol`
-- (CHECK (rol IN ('coordinador','instalador','admin')), 0001) y con el tipo
-- TypeScript `Rol` (`src/types/enums.ts`) — sin corrección de valores
-- necesaria, solo se tipa formalmente lo que ya existía como texto+CHECK.

DO $$ BEGIN
    CREATE TYPE trabajo_estado AS ENUM ('live', 'assigned', 'cancelled', 'completed', 'expired');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
-- Los primeros 4 valores coinciden exactamente con `trabajos.phase`
-- (CHECK (phase IN ('live','assigned','completed','cancelled')), 0001) y con
-- `TrabajoPhase` (`src/types/enums.ts`). `expired` es un estado NUEVO — no
-- existía en el schema v3 ni en el prototipo HTML original — solicitado
-- explícitamente por este Sprint para representar un trabajo cuyo bid se
-- agotó sin ninguna oferta seleccionada (hoy sin representación en el
-- schema; el prototipo solo modelaba esto como un panel de UI efímero,
-- `NoResponsePanel`, Sprint 3.16, sin persistirlo). Se agrega el valor al
-- ENUM (aditivo); ninguna fila existente puede tener 'expired' todavía
-- porque no había forma de escribirlo antes de este Sprint.

DO $$ BEGIN
    CREATE TYPE oferta_estado AS ENUM ('pendiente', 'seleccionado', 'rechazado', 'expirado');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
-- ⚠️ DIFERENCIA DEL BRIEF, DOCUMENTADA (ver docs/PHASE_4.md →
-- "Diferencias detectadas" para el detalle completo): el brief pedía los
-- valores en inglés (pending/accepted/rejected/expired). Se usan en su
-- lugar los valores en ESPAÑOL ya existentes de `bids.estado`
-- (CHECK (estado IN ('pendiente','seleccionado','rechazado')), 0001),
-- más 'expirado' (nuevo, mismo criterio que 'expired' arriba), por 3
-- razones concretas verificadas contra el código real:
--   1. `trabajos_vista` (vista creada en 0001) compara literalmente
--      `b.estado = 'seleccionado'` (dos veces) para decidir si revela los
--      datos del cliente al instalador asignado — cambiar el vocabulario a
--      inglés rompería esa vista en silencio (siempre evaluaría falso) a
--      menos que también se reescribiera la vista, fuera del alcance de
--      "no implementar lógica de negocio" de este Sprint.
--   2. `ARCHITECTURE.md` §9.5 ya documenta (pendiente de aprobación, no
--      implementada todavía) una función `seleccionar_instalador(...)` que
--      usa exactamente los valores `'seleccionado'`/`'rechazado'`/
--      `'pendiente'` — cambiar el vocabulario invalidaría ese diseño ya
--      documentado sin que el usuario lo haya aprobado en esta ronda.
--   3. El tipo TypeScript `BidEstado` (`src/types/enums.ts`) ya usa
--      exactamente estos 3 valores en español — este Sprint tiene
--      explícitamente prohibido tocar tipos/componentes de React.
-- Se prioriza "no romper nada existente/aprobado" sobre seguir el
-- vocabulario literal (en inglés) sugerido por el brief.

DO $$ BEGIN
    CREATE TYPE trabajo_instalador_estado AS ENUM (
        'notificado', 'abierto', 'oferta_enviada', 'rechazado', 'expirado'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
-- Sin equivalente previo en el schema v3 (tabla nueva, ver sección 3 más
-- abajo) — mapea al estado efímero por-instalador-por-trabajo que el
-- prototipo HTML modelaba solo en memoria (`job.inst[instId].state`:
-- 'notified'/'opened'/'responding'/'responded'/'declined', ver
-- `Multimax_Despacho_v1.3.html` línea ~1994 y ARCHITECTURE.md §9.3):
--   notificado      ~ 'notified'
--   abierto         ~ 'opened'
--   oferta_enviada  ~ 'responding'/'responded' (el instalador ya envió su
--                     bid — la oferta en sí vive en la fila de `bids`,
--                     este estado solo marca que el instalador llegó a
--                     enviarla)
--   rechazado       ~ 'declined' (el instalador rechazó la solicitud)
--   expirado        ~ estado nuevo, sin ofrecer respuesta antes de que
--                     cierre el bid.


-- ============================================================
-- 2. CONVERSIÓN DE COLUMNAS EXISTENTES A LOS ENUM
-- ============================================================
-- Ninguna de estas conversiones elimina datos: se convierte el TIPO de la
-- columna, preservando cada valor ya almacenado (todos los valores usados
-- hoy por los CHECK existentes están incluidos en el ENUM nuevo). Se quita
-- el DEFAULT antes de cambiar el tipo y se vuelve a fijar después,
-- siguiendo el procedimiento recomendado por Postgres para evitar el error
-- "default for column ... cannot be cast automatically to type ...".
--
-- ⚠️ Hallazgo verificado con una ejecución real contra Postgres 16 (ver
-- docs/PHASE_4.md → "Problemas encontrados"): Postgres NO permite
-- `ALTER COLUMN ... TYPE` mientras exista una política RLS o una vista que
-- referencie esa columna directamente en su expresión (`ERROR: cannot
-- alter type of a column used in a policy definition` / "... used by a
-- view or rule"). Esto afecta a 3 objetos ya existentes y aprobados desde
-- 0001, que dependen directamente (no vía función) de las columnas que
-- este Sprint convierte a ENUM:
--   - Política "Coordinador ve instaladores de su empresa" (usuarios) → usa `rol = 'instalador'`
--   - Política "Instalador ve trabajos live en su zona" (trabajos)     → usa `phase = 'live'`
--   - Política "Instalador puede hacer bid" (bids)                    → usa `t.phase = 'live'` en subquery
--   - Vista `trabajos_vista`                                          → usa `b.estado = 'seleccionado'` (x3)
-- Se eliminan estos 4 objetos justo antes de la conversión y se
-- RECREAN a continuación de forma IDÉNTICA (mismo texto exacto de 0001,
-- ningún cambio de lógica/alcance) — es la única forma de aplicar la
-- conversión de tipo sin modificar el comportamiento de políticas ya
-- aprobadas. Encaja en la excepción explícita del proyecto: "si algún
-- componente aprobado requiere una modificación para permitir la
-- integración correcta, explicar claramente el motivo" — el motivo aquí es
-- puramente una restricción de Postgres (DDL), no una decisión de diseño.
-- (`get_my_rol()`/`get_my_sucursal_id()`/`get_my_usuario_id()`, que también
-- leen estas columnas, NO bloquean el ALTER — las funciones SQL no generan
-- esta clase de dependencia dura sobre columnas, solo vistas/políticas.)

-- 2.0 Eliminar temporalmente los objetos dependientes (se recrean idénticos
--     más abajo, después de las 3 conversiones).
DROP POLICY IF EXISTS "Coordinador ve instaladores de su empresa" ON usuarios;
DROP POLICY IF EXISTS "Instalador ve trabajos live en su zona" ON trabajos;
DROP POLICY IF EXISTS "Instalador puede hacer bid" ON bids;
DROP VIEW IF EXISTS trabajos_vista;

-- 2.1 usuarios.rol → user_role
-- ⚠️ Orden verificado con una ejecución real (ver docs/PHASE_4.md →
-- "Problemas encontrados"): el CHECK existente debe eliminarse ANTES de
-- cambiar el tipo de columna, no después. Si se elimina después, Postgres
-- intenta revalidar ese CHECK (ya compilado con literales de tipo `text`,
-- de cuando la columna todavía era `text`) contra el nuevo tipo `user_role`
-- durante el propio `ALTER COLUMN TYPE`, y falla con "operator does not
-- exist: user_role = text".
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ALTER COLUMN rol TYPE user_role USING rol::user_role;
-- (usuarios.rol no tenía DEFAULT en 0001, no aplica drop/set default)

-- 2.2 trabajos.phase → trabajo_estado
-- (El brief se refiere a esta columna como "trabajos.estado" — el nombre
-- real de la columna, confirmado contra 0001_initial_schema.sql y contra
-- `TrabajoRow`/`Trabajo` en el frontend, es `phase`. No se renombra la
-- columna: renombrarla rompería `types/database.ts`/`types/domain.ts`/
-- `lib/mappers.ts`, fuera de alcance — "NO modificar componentes/tipos de
-- React" de este Sprint. Se documenta la corrección de nombre y se aplica
-- el ENUM sobre la columna real, `phase`. Mismo orden CHECK-antes-que-TYPE
-- que 2.1, por la misma razón.)
ALTER TABLE trabajos DROP CONSTRAINT IF EXISTS trabajos_phase_check;
ALTER TABLE trabajos ALTER COLUMN phase DROP DEFAULT;
ALTER TABLE trabajos ALTER COLUMN phase TYPE trabajo_estado USING phase::trabajo_estado;
ALTER TABLE trabajos ALTER COLUMN phase SET DEFAULT 'live'::trabajo_estado;

-- 2.3 bids.estado → oferta_estado
-- (El brief se refiere a esta tabla como "ofertas" — el nombre real de la
-- tabla, confirmado contra 0001_initial_schema.sql, es `bids`. No se
-- renombra la tabla por la misma razón que en 2.2 — ver docs/PHASE_4.md.
-- Mismo orden CHECK-antes-que-TYPE que 2.1/2.2.)
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_estado_check;
ALTER TABLE bids ALTER COLUMN estado DROP DEFAULT;
ALTER TABLE bids ALTER COLUMN estado TYPE oferta_estado USING estado::oferta_estado;
ALTER TABLE bids ALTER COLUMN estado SET DEFAULT 'pendiente'::oferta_estado;

-- 2.4 Recrear, IDÉNTICOS a 0001_initial_schema.sql (mismo texto, mismo
--     nombre, misma lógica — cero cambios de comportamiento), los 3
--     objetos eliminados en 2.0. Ahora sí compilan contra las columnas ya
--     convertidas a ENUM (la comparación `columna_enum = 'texto'` sigue
--     funcionando igual: Postgres resuelve el literal sin tipo contra el
--     ENUM automáticamente, igual que antes lo resolvía contra `text`).
CREATE POLICY "Coordinador ve instaladores de su empresa"
    ON usuarios FOR SELECT
    USING (
        get_my_rol() IN ('coordinador', 'admin')
        AND rol = 'instalador'
        AND activo = true
    );

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


-- ============================================================
-- 3. TABLA NUEVA: trabajo_instaladores
-- ============================================================
-- El brief pide índices y RLS para `trabajo_instaladores`, pero esa tabla
-- no existía en 0001_initial_schema.sql — no hay ningún equivalente real
-- que corregir (a diferencia de "ofertas"/"tiendas"/etc., que sí mapean a
-- tablas reales existentes, ver docs/PHASE_4.md). Es infraestructura
-- genuinamente nueva y aditiva: no reemplaza ninguna tabla ni columna
-- existente. Modela, por instalador y por trabajo, el estado de "enganche"
-- (`job.inst[instId]` del prototipo, hoy solo en memoria — ver ENUM
-- `trabajo_instalador_estado` arriba y ARCHITECTURE.md §9.3).
CREATE TABLE IF NOT EXISTS trabajo_instaladores (
    id              uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajo_id      uuid                        NOT NULL REFERENCES trabajos(id) ON DELETE CASCADE,
    instalador_id   uuid                        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    estado          trabajo_instalador_estado   NOT NULL DEFAULT 'notificado',
    notificado_at   timestamptz                 NOT NULL DEFAULT now(),
    updated_at      timestamptz                 NOT NULL DEFAULT now(),

    UNIQUE (trabajo_id, instalador_id)  -- un instalador, un estado de enganche por trabajo
);

-- Reutiliza el trigger genérico `set_updated_at()` ya creado en 0001 — no
-- se duplica lógica.
CREATE OR REPLACE TRIGGER trigger_trabajo_instaladores_updated_at
    BEFORE UPDATE ON trabajo_instaladores
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 4. ÍNDICES
-- ============================================================
-- Todos con IF NOT EXISTS: seguros de re-ejecutar. Se documenta, para cada
-- uno pedido por el brief, si ya existía desde 0001 (nombre de columna real
-- distinto o índice ya creado) o si es nuevo en este Sprint. Ver
-- docs/PHASE_4.md → "Índices" para la tabla completa de correspondencias.

-- trabajos.estado → trabajos.phase: YA INDEXADO desde 0001
-- (idx_trabajos_phase). Se re-declara igual, sin cambios, por completitud.
CREATE INDEX IF NOT EXISTS idx_trabajos_phase ON trabajos(phase);

-- trabajos.publicado_at → trabajos.published_at: YA INDEXADO desde 0001
-- (idx_trabajos_published). Se re-declara igual, sin cambios.
CREATE INDEX IF NOT EXISTS idx_trabajos_published ON trabajos(published_at DESC);

-- trabajos.coordinador_id: NUEVO — no estaba indexado en 0001.
CREATE INDEX IF NOT EXISTS idx_trabajos_coordinador ON trabajos(coordinador_id);

-- trabajos.instalador_asignado_id: esa columna NO EXISTE en el schema real
-- (`trabajos` no tiene ningún FK directo a un instalador; la asignación se
-- modela vía `assigned_bid_id → bids.id → bids.instalador_id`). No se
-- agrega una columna denormalizada nueva sin aprobación explícita (eso
-- requeriría además un trigger de sincronización para mantenerla al día —
-- lógica de negocio, fuera de alcance de "EXCLUSIVAMENTE infraestructura
-- SQL" de este Sprint). Se indexa en su lugar la columna real equivalente,
-- `assigned_bid_id` (tampoco estaba indexada en 0001):
CREATE INDEX IF NOT EXISTS idx_trabajos_assigned_bid ON trabajos(assigned_bid_id);

-- ofertas.trabajo_id → bids.trabajo_id: YA INDEXADO desde 0001
-- (idx_bids_trabajo). Se re-declara igual, sin cambios.
CREATE INDEX IF NOT EXISTS idx_bids_trabajo ON bids(trabajo_id);

-- ofertas.instalador_id → bids.instalador_id: YA INDEXADO desde 0001
-- (idx_bids_instalador). Se re-declara igual, sin cambios.
CREATE INDEX IF NOT EXISTS idx_bids_instalador ON bids(instalador_id);

-- trabajo_instaladores.trabajo_id / .instalador_id: NUEVOS (tabla nueva,
-- ver sección 3).
CREATE INDEX IF NOT EXISTS idx_trabajoinst_trabajo    ON trabajo_instaladores(trabajo_id);
CREATE INDEX IF NOT EXISTS idx_trabajoinst_instalador ON trabajo_instaladores(instalador_id);

-- coordinadores.empresa_id / instaladores.empresa_id / admins.empresa_id:
-- las 3 mapean a la MISMA columna real, `usuarios.empresa_id` (no existen
-- tablas separadas `coordinadores`/`instaladores`/`admins` — ver sección 5
-- y docs/PHASE_4.md). NUEVO — no estaba indexado en 0001. Un solo índice
-- cubre los 3 pedidos del brief.
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios(empresa_id);


-- ============================================================
-- 5. FUNCIONES SQL REUTILIZABLES
-- ============================================================
-- 0001_initial_schema.sql ya define `get_my_rol()`, `get_my_sucursal_id()`
-- y `get_my_usuario_id()`, usadas por las políticas RLS ya existentes — NO
-- se eliminan ni se renombran (romperían esas políticas). Este Sprint
-- AGREGA las 6 funciones pedidas por el brief, con nombres nuevos que no
-- colisionan con las existentes; donde el concepto ya existía, la función
-- nueva reutiliza/delega en la existente en vez de duplicar la consulta SQL.

-- current_user_role(): equivalente tipado (ENUM en vez de texto) de
-- get_my_rol(), ya existente. Se define de forma independiente (misma
-- consulta) para devolver directamente `user_role`, útil en comparaciones
-- fuertemente tipadas desde RLS/frontend.
--
-- ⚠️ Corrección de nombre, verificada contra un intento real de ejecución
-- (ver docs/PHASE_4.md → "Problemas encontrados"): el brief pedía
-- literalmente `current_role()`, pero `CURRENT_ROLE` es una palabra
-- reservada del estándar SQL/Postgres (pseudo-constante equivalente a
-- `CURRENT_USER`, el rol de LOGIN de la base de datos — un concepto
-- totalmente distinto del rol de aplicación que esta función expone).
-- `CREATE FUNCTION current_role()` falla con "syntax error at or near
-- current_role" porque el parser trata `CURRENT_ROLE` como un token
-- especial que no admite paréntesis, incluso dentro del cuerpo de otra
-- función. Se renombra a `current_user_role()` para evitar la colisión —
-- sin cambiar su propósito ni su firma de retorno.
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
    SELECT rol FROM usuarios WHERE auth_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- current_profile(): equivalente de get_my_usuario_id(), ya existente
-- (mismo valor, nombre pedido por este Sprint).
CREATE OR REPLACE FUNCTION current_profile()
RETURNS uuid AS $$
    SELECT id FROM usuarios WHERE auth_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- current_empresa(): NUEVA — no existía ningún helper para la empresa del
-- usuario autenticado. Necesaria para políticas futuras multi-empresa
-- (multi-tenant, ver ARCHITECTURE.md §1) y para los 3 índices de
-- "empresa_id" de la sección 4.
CREATE OR REPLACE FUNCTION current_empresa()
RETURNS uuid AS $$
    SELECT empresa_id FROM usuarios WHERE auth_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- is_admin() / is_coordinator() / is_installer(): NUEVOS helpers booleanos,
-- construidos sobre current_user_role() (sin duplicar la consulta a
-- `usuarios`).
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
    SELECT current_user_role() = 'admin'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_coordinator()
RETURNS boolean AS $$
    SELECT current_user_role() = 'coordinador'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_installer()
RETURNS boolean AS $$
    SELECT current_user_role() = 'instalador'
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Nota de compatibilidad: get_my_rol() (0001) no se modifica en su
-- definición — sigue funcionando igual (RETURNS text, con una conversión
-- explícita implícita desde el ahora-ENUM `usuarios.rol`, soportada por
-- Postgres vía el cast `enum → text` de todo tipo ENUM). Se re-declara
-- aquí, sin cambiar su comportamiento observable, únicamente para dejar
-- explícito el cast y evitar cualquier ambigüedad de coerción de tipos
-- tras la conversión de la sección 2.1 — ver "Riesgos" en docs/PHASE_4.md.
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS text AS $$
    SELECT rol::text FROM usuarios WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;


-- ============================================================
-- 6. ROW LEVEL SECURITY — ACTIVACIÓN
-- ============================================================
-- El brief pide activar RLS para: admins, coordinadores, instaladores,
-- empresas, tiendas, trabajos, ofertas, trabajo_instaladores. Ninguna tabla
-- separada `admins`/`coordinadores`/`instaladores`/`tiendas` existe en el
-- schema real (ver docs/PHASE_4.md → "Diferencias detectadas"):
--   admins/coordinadores/instaladores → usuarios (una sola tabla,
--     discriminada por la columna `rol`, ya tipada como user_role arriba)
--   tiendas                           → sucursales
--   ofertas                           → bids
-- Las 5 tablas reales (empresas, sucursales, usuarios, trabajos, bids) YA
-- tienen RLS activo desde 0001_initial_schema.sql. Se re-declara
-- `ENABLE ROW LEVEL SECURITY` para todas (operación idempotente, sin
-- efecto si ya estaba activo) más la tabla nueva `trabajo_instaladores`,
-- por completitud y para que este archivo sea auto-contenido.
ALTER TABLE empresas               ENABLE ROW LEVEL SECURITY;  -- ya activo (0001)
ALTER TABLE sucursales             ENABLE ROW LEVEL SECURITY;  -- ya activo (0001) — "tiendas" del brief
ALTER TABLE usuarios               ENABLE ROW LEVEL SECURITY;  -- ya activo (0001) — admins/coordinadores/instaladores del brief
ALTER TABLE trabajos               ENABLE ROW LEVEL SECURITY;  -- ya activo (0001)
ALTER TABLE bids                   ENABLE ROW LEVEL SECURITY;  -- ya activo (0001) — "ofertas" del brief
ALTER TABLE trabajo_instaladores   ENABLE ROW LEVEL SECURITY;  -- NUEVO


-- ============================================================
-- 7. POLÍTICAS RLS NUEVAS
-- ============================================================
-- No se modifica ni se elimina ninguna política ya existente de 0001. Se
-- agregan únicamente las políticas que faltaban para cumplir lo pedido por
-- el brief (ADMIN lee/escribe todo; COORDINADOR administra su propia
-- sucursal/empresa; INSTALADOR accede solo a lo suyo y puede actualizar su
-- perfil) sin duplicar ninguna política ya aprobada. Usan las funciones
-- nuevas de la sección 5 (is_admin()/is_coordinator()/is_installer()/
-- current_profile()) tal como pide el brief ("serán utilizadas
-- posteriormente por RLS").

-- ---- 7.1 ADMIN: lee y escribe TODA la información ----
-- `usuarios` (admins/coordinadores/instaladores) y `bids` (ofertas) ya
-- tenían cobertura ADMIN completa (SELECT+INSERT+UPDATE en usuarios;
-- FOR ALL en bids, ambas desde 0001) — no se tocan. `empresas`/
-- `sucursales` ("tiendas") y `trabajos` SÍ tenían huecos (solo SELECT
-- público/parcial, sin ninguna política de escritura para admin) — se
-- cierran aquí:
DROP POLICY IF EXISTS "Admin gestiona empresas (Sprint 4.0.1)" ON empresas;
CREATE POLICY "Admin gestiona empresas (Sprint 4.0.1)"
    ON empresas FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin gestiona sucursales (Sprint 4.0.1)" ON sucursales;
CREATE POLICY "Admin gestiona sucursales (Sprint 4.0.1)"
    ON sucursales FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin gestiona trabajos (Sprint 4.0.1)" ON trabajos;
CREATE POLICY "Admin gestiona trabajos (Sprint 4.0.1)"
    ON trabajos FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- ---- 7.2 trabajo_instaladores (tabla nueva, sección 3) ----

-- Admin: lee y escribe todo (igual criterio que 7.1).
DROP POLICY IF EXISTS "Admin gestiona trabajo_instaladores" ON trabajo_instaladores;
CREATE POLICY "Admin gestiona trabajo_instaladores"
    ON trabajo_instaladores FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Coordinador: administra únicamente el enganche de los trabajos de SU
-- sucursal (mismo criterio de alcance ya usado por todas las políticas de
-- `trabajos`/`bids` para coordinador desde 0001 — sucursal, no empresa
-- completa; ver "Diferencias detectadas" en docs/PHASE_4.md sobre por qué
-- no se amplía a nivel de empresa sin aprobación explícita).
DROP POLICY IF EXISTS "Coordinador gestiona trabajo_instaladores de su sucursal" ON trabajo_instaladores;
CREATE POLICY "Coordinador gestiona trabajo_instaladores de su sucursal"
    ON trabajo_instaladores FOR ALL
    USING (
        is_coordinator()
        AND EXISTS (
            SELECT 1 FROM trabajos t
            WHERE t.id = trabajo_instaladores.trabajo_id
            AND t.sucursal_id = get_my_sucursal_id()
        )
    )
    WITH CHECK (
        is_coordinator()
        AND EXISTS (
            SELECT 1 FROM trabajos t
            WHERE t.id = trabajo_instaladores.trabajo_id
            AND t.sucursal_id = get_my_sucursal_id()
        )
    );

-- Instalador: puede ACCEDER (leer) únicamente a los trabajos enviados a él
-- — exactamente lo pedido por el brief. Sin UPDATE/DELETE: cambiar su
-- propio estado de enganche (p. ej. 'notificado' → 'abierto') es lógica de
-- negocio (motor de trabajos), fuera de alcance de este Sprint — ver
-- "Pendientes" en docs/PHASE_4.md.
DROP POLICY IF EXISTS "Instalador ve sus propios trabajo_instaladores" ON trabajo_instaladores;
CREATE POLICY "Instalador ve sus propios trabajo_instaladores"
    ON trabajo_instaladores FOR SELECT
    USING (
        is_installer()
        AND instalador_id = current_profile()
    );

-- ---- 7.3 INSTALADOR: puede actualizar únicamente su perfil ----
-- No existía, en 0001, ninguna política que permitiera a un usuario
-- autenticado (instalador, pero también coordinador/admin) actualizar SU
-- PROPIA fila de `usuarios` — solo un admin podía hacer UPDATE. Se agrega:
DROP POLICY IF EXISTS "Usuario actualiza su propio perfil (Sprint 4.0.1)" ON usuarios;
CREATE POLICY "Usuario actualiza su propio perfil (Sprint 4.0.1)"
    ON usuarios FOR UPDATE
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());
-- ⚠️ Riesgo reportado (documentado también en docs/PHASE_4.md → "Riesgos",
-- sin resolver en este Sprint por ser lógica de negocio/decisión de
-- producto, no infraestructura pura): esta política es a nivel de FILA, no
-- de COLUMNA — un usuario autenticado podría, con esta política, intentar
-- actualizar CUALQUIER columna de su propia fila, incluidas `rol`,
-- `empresa_id`, `activo`, `suspendido`, `rating`, `cumplimiento`,
-- `aceptacion` (auto-escalación de privilegios / auto-aprobación). Antes de
-- exponer esta política a un cliente real, se recomienda restringir las
-- columnas editables por el propio usuario (vía trigger BEFORE UPDATE que
-- rechace cambios a esas columnas cuando quien escribe no es admin, o vía
-- GRANT/REVOKE por columna) — pendiente de que el usuario confirme qué
-- columnas deben ser auto-editables (nombre/teléfono/empresa_nombre, muy
-- probablemente) antes de implementarlo, para no adivinar una decisión de
-- producto.


-- ============================================================
-- REVERSIÓN (rollback documentado, NO se ejecuta automáticamente)
-- ============================================================
-- Esta migración es reversible. Para deshacerla por completo, ejecutar en
-- este orden (de abajo hacia arriba respecto a las secciones de arriba):
--
-- -- 7. Políticas nuevas
-- DROP POLICY IF EXISTS "Usuario actualiza su propio perfil (Sprint 4.0.1)" ON usuarios;
-- DROP POLICY IF EXISTS "Instalador ve sus propios trabajo_instaladores" ON trabajo_instaladores;
-- DROP POLICY IF EXISTS "Coordinador gestiona trabajo_instaladores de su sucursal" ON trabajo_instaladores;
-- DROP POLICY IF EXISTS "Admin gestiona trabajo_instaladores" ON trabajo_instaladores;
-- DROP POLICY IF EXISTS "Admin gestiona trabajos (Sprint 4.0.1)" ON trabajos;
-- DROP POLICY IF EXISTS "Admin gestiona sucursales (Sprint 4.0.1)" ON sucursales;
-- DROP POLICY IF EXISTS "Admin gestiona empresas (Sprint 4.0.1)" ON empresas;
--
-- -- 6. RLS activado en trabajo_instaladores (las otras 5 tablas ya tenían
-- --    RLS activo desde 0001 y no deben desactivarse al revertir este
-- --    Sprint — solo la tabla nueva):
-- ALTER TABLE trabajo_instaladores DISABLE ROW LEVEL SECURITY;
--
-- -- 5. Funciones nuevas (get_my_rol() se restaura a su forma original de
-- --    0001; las demás son nuevas y se eliminan):
-- CREATE OR REPLACE FUNCTION get_my_rol() RETURNS text AS $$
--     SELECT rol FROM usuarios WHERE auth_id = auth.uid()
-- $$ LANGUAGE sql SECURITY DEFINER;
-- DROP FUNCTION IF EXISTS is_installer();
-- DROP FUNCTION IF EXISTS is_coordinator();
-- DROP FUNCTION IF EXISTS is_admin();
-- DROP FUNCTION IF EXISTS current_empresa();
-- DROP FUNCTION IF EXISTS current_profile();
-- DROP FUNCTION IF EXISTS current_user_role();
--
-- -- 4. Índices nuevos (los que ya existían desde 0001 -- idx_trabajos_phase,
-- --    idx_trabajos_published, idx_bids_trabajo, idx_bids_instalador -- se
-- --    dejan, son de 0001, no de este Sprint):
-- DROP INDEX IF EXISTS idx_usuarios_empresa;
-- DROP INDEX IF EXISTS idx_trabajoinst_instalador;
-- DROP INDEX IF EXISTS idx_trabajoinst_trabajo;
-- DROP INDEX IF EXISTS idx_trabajos_assigned_bid;
-- DROP INDEX IF EXISTS idx_trabajos_coordinador;
--
-- -- 3. Tabla nueva:
-- DROP TABLE IF EXISTS trabajo_instaladores;
--
-- -- 2. Revertir columnas a `text` con sus CHECK originales (preserva los
-- --    datos: el valor de cada fila vuelve a su representación de texto
-- --    original vía el cast enum→text, ya soportado nativamente):
-- ALTER TABLE bids ALTER COLUMN estado DROP DEFAULT;
-- ALTER TABLE bids ALTER COLUMN estado TYPE text USING estado::text;
-- ALTER TABLE bids ALTER COLUMN estado SET DEFAULT 'pendiente';
-- ALTER TABLE bids ADD CONSTRAINT bids_estado_check
--     CHECK (estado IN ('pendiente', 'seleccionado', 'rechazado'));
--
-- ALTER TABLE trabajos ALTER COLUMN phase DROP DEFAULT;
-- ALTER TABLE trabajos ALTER COLUMN phase TYPE text USING phase::text;
-- ALTER TABLE trabajos ALTER COLUMN phase SET DEFAULT 'live';
-- ALTER TABLE trabajos ADD CONSTRAINT trabajos_phase_check
--     CHECK (phase IN ('live', 'assigned', 'completed', 'cancelled'));
--
-- ALTER TABLE usuarios ALTER COLUMN rol TYPE text USING rol::text;
-- ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
--     CHECK (rol IN ('coordinador', 'instalador', 'admin'));
--
-- -- 1. ENUMs (solo se pueden eliminar después de que ninguna columna los
-- --    use -- ya garantizado por los pasos anteriores):
-- DROP TYPE IF EXISTS trabajo_instalador_estado;
-- DROP TYPE IF EXISTS oferta_estado;
-- DROP TYPE IF EXISTS trabajo_estado;
-- DROP TYPE IF EXISTS user_role;
--
-- NOTA: cualquier fila que ya tenga `phase = 'expired'` (nuevo) o
-- `estado = 'expirado'` (nuevo) antes de revertir causará un error en el
-- cast de vuelta a los CHECK originales (esos valores no estaban permitidos
-- antes de este Sprint) — es el único caso no trivialmente reversible, y
-- solo aplica si esos valores nuevos ya se usaron en producción.
--
-- ============================================================
-- FIN DE LA MIGRACIÓN 0002
-- ============================================================
