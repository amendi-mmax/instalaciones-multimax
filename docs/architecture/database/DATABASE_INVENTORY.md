# DATABASE_INVENTORY.md — Inventario Completo de Producción (Supabase)

**Fuente**: `supabase/migrations/0001_initial_schema.sql` (pg_dump real, PostgreSQL 17.6, pg_dump 18.4, exportado directamente desde Producción).

**Fecha de análisis**: Sprint 4.0.1 — Auditoría de Sincronización de Base de Datos.

**Alcance**: Este documento cubre exclusivamente el schema `public`, que es el único schema propiedad de HANDYMAX. La Sección 0 documenta y separa explícitamente los objetos internos de Supabase, tal como pide la tarea #7 del brief.

---

## 0. Separación de objetos internos de Supabase vs. objetos propios de HANDYMAX

### 0.1 Schemas internos de Supabase (NO son de HANDYMAX)

El dump contiene los siguientes schemas, todos ellos parte del bootstrapping estándar de cualquier proyecto Supabase, no específicos de este proyecto:

| Schema | Propósito | Objetos relevantes |
|---|---|---|
| `auth` | Gestión de usuarios/sesiones de Supabase Auth | `auth.users`, `auth.uid()`, etc. |
| `extensions` | Extensiones de PostgreSQL habilitadas por Supabase | `pgcrypto`, `uuid-ossp`, etc. |
| `graphql` / `graphql_public` | Soporte GraphQL automático de Supabase | funciones internas |
| `pgbouncer` | Pooler de conexiones | `pgbouncer.get_auth()` |
| `realtime` | Motor de subscripciones en tiempo real | tablas/funciones internas |
| `storage` | Almacenamiento de archivos (buckets) | `storage.objects`, `storage.buckets` |
| `vault` | Secretos cifrados | tablas internas |

Ninguno de estos schemas fue creado, modificado ni referenced explícitamente por el diseño de HANDYMAX (más allá del uso estándar de `auth.users` como tabla referenciada por FK y `auth.uid()` como función usada dentro de RLS/funciones propias). No se incluyen en el resto de este inventario.

### 0.2 Objetos propios de HANDYMAX (schema `public`)

Todo lo que sigue en este documento (8 tablas, 1 vista, 4 funciones, 6 índices, 1 trigger + 1 event trigger, 14 políticas RLS) es propiedad exclusiva de HANDYMAX y fue diseñado específicamente para este proyecto.

---

## 1. Resumen de tablas

| Tabla | Nº columnas | Primary Key | Foreign Keys (saliente) | Índices propios | Triggers | Policies | Funciones relacionadas |
|---|---|---|---|---|---|---|---|
| `empresas` | 7 | `id` | — | 0 | 0 | 0 ⚠️ | `asignar_instalador` (lee `contacto_visible_horas`) |
| `tiendas` | 8 | `id` | `empresa_id → empresas(id)` | 0 | 0 | 0 ⚠️ | — |
| `admins` | 7 | `id` | `empresa_id → empresas(id)`; `id → auth.users(id)` ON DELETE CASCADE | 0 | 0 | 0 ⚠️ | — |
| `coordinadores` | 7 | `id` | `empresa_id → empresas(id)`; `tienda_id → tiendas(id)`; `id → auth.users(id)` ON DELETE CASCADE | 0 | 0 | 0 (como destino de policies; sí referenciada en subqueries de otras tablas) ⚠️ | referenciada por `asignar_instalador` indirectamente vía RLS |
| `instaladores` | 16 | `id` | `empresa_id → empresas(id)`; `id → auth.users(id)` ON DELETE CASCADE | 0 | 0 | 2 | `asignar_instalador`, `submit_bid` |
| `trabajos` | 28 | `id` | `empresa_id → empresas(id)`; `tienda_id → tiendas(id)`; `coordinador_id → coordinadores(id)`; `instalador_asignado_id → instaladores(id)` | 3 (`idx_trabajos_empresa`, `idx_trabajos_estado`, `idx_trabajos_tienda`) | 1 (`trg_set_bid_cierra_at`) | 4 | `asignar_instalador`, `set_bid_cierra_at` |
| `trabajo_instaladores` | 7 | `id` | `trabajo_id → trabajos(id)` ON DELETE CASCADE; `instalador_id → instaladores(id)` | 2 (`idx_ti_instalador`, `idx_ti_trabajo`) | 0 | 5 | `asignar_instalador`, `submit_bid` |
| `ofertas` | 8 | `id` | `trabajo_id → trabajos(id)` ON DELETE CASCADE; `instalador_id → instaladores(id)` | 1 (`idx_ofertas_trabajo`) | 0 | 3 | `submit_bid` |

⚠️ = tabla con `ENABLE ROW LEVEL SECURITY` activo pero **cero policies definidas** → tabla completamente inaccesible para los roles `anon`/`authenticated`; solo accesible vía `service_role` o el owner de la tabla (`postgres`). Ver detalle de riesgo en `DATABASE_DIFF.md`, sección "RLS eliminadas".

**Total de columnas en `public`**: 7+8+7+7+16+28+7+8 = **88 columnas** repartidas en 8 tablas.

**Total de Foreign Keys**: 16 (ver detalle completo en la sección 3).

**Total de índices propios (no derivados de PK/UNIQUE)**: 6.

**Total de triggers**: 1 trigger de fila (`trg_set_bid_cierra_at`) + 1 event trigger (`ensure_rls`).

**Total de RLS policies**: 14.

**Total de funciones propias**: 4 (`asignar_instalador`, `submit_bid`, `set_bid_cierra_at`, `rls_auto_enable`).

**Total de vistas**: 1 (`trabajos_para_instalador`).

**Total de tipos/ENUM personalizados**: 0.

**Total de CHECK constraints**: 0.

---

## 2. Detalle por tabla

### 2.1 `empresas`

| Columna | Tipo | Default | Nullable |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | NOT NULL |
| `nombre` | text | — | NOT NULL |
| `slug` | text | — | NOT NULL |
| `color_primario` | text | `'#E4221E'` | NULL |
| `contacto_visible_horas` | integer | `48` | NOT NULL |
| `activa` | boolean | `true` | NOT NULL |
| `created_at` | timestamptz | `now()` | NOT NULL |

- **PK**: `id`
- **UNIQUE**: `empresas_slug_key (slug)`
- **FKs entrantes**: referenciada por `admins`, `coordinadores`, `instaladores`, `tiendas`, `trabajos`
- **Policies**: 0 ⚠️
- **Funciones relacionadas**: `asignar_instalador` lee `contacto_visible_horas`

### 2.2 `tiendas`

| Columna | Tipo | Default | Nullable |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | NOT NULL |
| `empresa_id` | uuid | — | NOT NULL |
| `nombre` | text | — | NOT NULL |
| `direccion` | text | — | NULL |
| `provincia` | text | — | NULL |
| `zona` | text | — | NULL |
| `activa` | boolean | `true` | NOT NULL |
| `created_at` | timestamptz | `now()` | NOT NULL |

- **PK**: `id`
- **FK saliente**: `tiendas_empresa_id_fkey → empresas(id)`
- **FKs entrantes**: referenciada por `coordinadores`, `trabajos`
- **Policies**: 0 ⚠️

### 2.3 `admins`

| Columna | Tipo | Default | Nullable |
|---|---|---|---|
| `id` | uuid | — | NOT NULL |
| `empresa_id` | uuid | — | NOT NULL |
| `nombre` | text | — | NOT NULL |
| `activo` | boolean | `true` | NOT NULL |
| `created_at` | timestamptz | `now()` | NOT NULL |
| `email` | text | — | NULL |
| `telefono` | text | — | NULL |

- **PK**: `id`
- **FKs salientes**: `admins_empresa_id_fkey → empresas(id)`; `admins_id_fkey → auth.users(id) ON DELETE CASCADE`
- **Policies**: 0 ⚠️
- **Nota de riesgo**: coexiste con `coordinadores.rol = 'admin'` como segundo concepto de "administrador" — ver `DATABASE_DIFF.md`.

### 2.4 `coordinadores`

| Columna | Tipo | Default | Nullable |
|---|---|---|---|
| `id` | uuid | — | NOT NULL |
| `empresa_id` | uuid | — | NOT NULL |
| `tienda_id` | uuid | — | NOT NULL |
| `nombre` | text | — | NOT NULL |
| `rol` | text | `'coordinador'` | NOT NULL |
| `activo` | boolean | `true` | NOT NULL |
| `created_at` | timestamptz | `now()` | NOT NULL |

- **PK**: `id`
- **FKs salientes**: `coordinadores_empresa_id_fkey → empresas(id)`; `coordinadores_tienda_id_fkey → tiendas(id)`; `coordinadores_id_fkey → auth.users(id) ON DELETE CASCADE`
- **FKs entrantes**: referenciada por `trabajos.coordinador_id`
- **Policies directas sobre esta tabla**: 0 ⚠️ (no puede leerse su propio registro directamente vía RLS)
- **Uso en policies de otras tablas**: sí — `coordinadores` se usa constantemente en subqueries correlacionadas dentro de las policies de `trabajos`, `trabajo_instaladores`, `instaladores`, `ofertas`, típicamente `EXISTS (SELECT 1 FROM coordinadores WHERE coordinadores.id = auth.uid() AND coordinadores.empresa_id = ...)`
- **`rol` es `text` libre, sin CHECK ni ENUM** — cualquier valor es aceptado por la base de datos; solo la aplicación decide qué hacer con `rol = 'admin'` vs otros valores.

### 2.5 `instaladores`

| Columna | Tipo | Default | Nullable |
|---|---|---|---|
| `id` | uuid | — | NOT NULL |
| `empresa_id` | uuid | — | NOT NULL |
| `nombre` | text | — | NOT NULL |
| `telefono` | text | — | NULL |
| `email` | text | — | NULL |
| `provincia` | text | — | NULL |
| `zona` | text | — | NULL |
| `rating` | numeric(2,1) | `5.0` | NOT NULL |
| `km` | numeric | `0` | NULL |
| `cumplimiento` | numeric | `100` | NULL |
| `aceptacion` | numeric | `100` | NULL |
| `prom_respuesta_seg` | integer | — | NULL |
| `documentos_ok` | boolean | `true` | NOT NULL |
| `suspendido` | boolean | `false` | NOT NULL |
| `activo` | boolean | `true` | NOT NULL |
| `created_at` | timestamptz | `now()` | NOT NULL |

- **PK**: `id`
- **FKs salientes**: `instaladores_empresa_id_fkey → empresas(id)`; `instaladores_id_fkey → auth.users(id) ON DELETE CASCADE`
- **FKs entrantes**: referenciada por `ofertas.instalador_id`, `trabajo_instaladores.instalador_id`, `trabajos.instalador_asignado_id`
- **Policies (2)**:
  1. "instaladores ven su propio perfil" — SELECT, `id = auth.uid()`
  2. "coordinadores ven instaladores de su empresa" — SELECT, scoped vía subquery a `coordinadores.empresa_id`
- **Funciones relacionadas**: `asignar_instalador`, `submit_bid` (ambas usan `instalador_id`/`auth.uid()` contra esta tabla indirectamente)

### 2.6 `trabajos`

| Columna | Tipo | Default | Nullable |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | NOT NULL |
| `empresa_id` | uuid | — | NOT NULL |
| `tienda_id` | uuid | — | NOT NULL |
| `coordinador_id` | uuid | — | NOT NULL |
| `codigo` | text | — | NOT NULL |
| `tipo` | text | — | NOT NULL |
| `provincia` | text | — | NOT NULL |
| `zona` | text | — | NOT NULL |
| `tipo_inmueble` | text | — | NULL |
| `calle` | text | — | NULL |
| `fecha` | text | — | NOT NULL |
| `hora` | text | — | NOT NULL |
| `equipo` | text | — | NULL |
| `requisitos` | text | — | NULL |
| `extra` | text | — | NULL |
| `precio_sugerido` | numeric | — | NULL |
| `urgente` | boolean | `false` | NOT NULL |
| `bid_minutos` | integer | `5` | NOT NULL |
| `estado` | text | `'live'` | NOT NULL |
| `publicado_at` | timestamptz | `now()` | NOT NULL |
| `bid_cierra_at` | timestamptz | — | NULL |
| `instalador_asignado_id` | uuid | — | NULL |
| `asignado_at` | timestamptz | — | NULL |
| `contacto_visible_hasta` | timestamptz | — | NULL |
| `cliente_nombre` | text | — | NULL |
| `cliente_telefono` | text | — | NULL |
| `direccion_exacta` | text | — | NULL |
| `created_at` | timestamptz | `now()` | NOT NULL |

- **PK**: `id`
- **UNIQUE**: `trabajos_empresa_id_codigo_key (empresa_id, codigo)`
- **FKs salientes**: `trabajos_empresa_id_fkey → empresas(id)`; `trabajos_tienda_id_fkey → tiendas(id)`; `trabajos_coordinador_id_fkey → coordinadores(id)`; `trabajos_instalador_asignado_id_fkey → instaladores(id)`
- **FKs entrantes**: referenciada por `ofertas.trabajo_id`, `trabajo_instaladores.trabajo_id`
- **Índices propios**: `idx_trabajos_empresa (empresa_id)`, `idx_trabajos_estado (estado)`, `idx_trabajos_tienda (tienda_id)`
- **Triggers**: `trg_set_bid_cierra_at BEFORE INSERT` → ejecuta `set_bid_cierra_at()`
- **Policies (4)**:
  1. "coordinadores ven trabajos de su tienda o de su empresa si admi" — SELECT (incluye `OR coordinadores.rol = 'admin'`)
  2. "coordinadores publican en su tienda" — INSERT
  3. "coordinadores actualizan su tienda" — UPDATE
  4. "instaladores ven trabajos donde fueron notificados" — SELECT, vía subquery a `trabajo_instaladores`
- **Funciones relacionadas**: `asignar_instalador` (UPDATE de `estado`/`instalador_asignado_id`/`asignado_at`/`contacto_visible_hasta`), `set_bid_cierra_at` (trigger BEFORE INSERT)
- **Nota**: no tiene columna `updated_at`.

### 2.7 `trabajo_instaladores`

| Columna | Tipo | Default | Nullable |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | NOT NULL |
| `trabajo_id` | uuid | — | NOT NULL |
| `instalador_id` | uuid | — | NOT NULL |
| `estado` | text | `'notificado'` | NOT NULL |
| `notificado_at` | timestamptz | `now()` | NOT NULL |
| `abierto_at` | timestamptz | — | NULL |
| `respondido_at` | timestamptz | — | NULL |

- **PK**: `id`
- **UNIQUE**: `(trabajo_id, instalador_id)`
- **FKs salientes**: `→ trabajos(id) ON DELETE CASCADE`; `→ instaladores(id)`
- **Índices propios**: `idx_ti_instalador (instalador_id)`, `idx_ti_trabajo (trabajo_id)`
- **Policies (5)**: gestión de notificaciones por coordinadores (UPDATE/INSERT/SELECT, scoped vía `trabajos → coordinadores` empresa chain), "instaladores actualizan su propio estado" (UPDATE, `instalador_id = auth.uid()`), "instaladores ven sus propias notificaciones" (SELECT)
- **Funciones relacionadas**: `asignar_instalador` (UPDATE de `estado` a `'confirmado'`/`'perdido'`), `submit_bid` (UPDATE de `estado` a `'respondido'`, `respondido_at`)
- **Nota**: `estado` es `text` libre, sin CHECK ni ENUM — vocabulario observado: `'notificado'`, `'respondido'`, `'seleccionado'`, `'confirmado'`, `'perdido'` (inferido del código de las funciones, no garantizado por constraint alguno).

### 2.8 `ofertas`

| Columna | Tipo | Default | Nullable |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | NOT NULL |
| `trabajo_id` | uuid | — | NOT NULL |
| `instalador_id` | uuid | — | NOT NULL |
| `precio` | numeric | — | NOT NULL |
| `dia` | text | — | NOT NULL |
| `hora` | text | — | NOT NULL |
| `comentario` | text | — | NULL |
| `enviado_at` | timestamptz | `now()` | NOT NULL |

- **PK**: `id`
- **UNIQUE**: `ofertas_trabajo_id_instalador_id_key (trabajo_id, instalador_id)`
- **FKs salientes**: `→ trabajos(id) ON DELETE CASCADE`; `→ instaladores(id)`
- **Índices propios**: `idx_ofertas_trabajo (trabajo_id)`
- **Policies (3)**: "coordinadores ven ofertas de su empresa" (SELECT), "instaladores envian su propia oferta" (INSERT, `instalador_id = auth.uid()` — **sin validación de que el trabajo siga abierto**), "instaladores ven sus propias ofertas" (SELECT)
- **Funciones relacionadas**: `submit_bid` (INSERT con `ON CONFLICT (trabajo_id, instalador_id) DO NOTHING`)
- **Nota crítica**: no existe columna `estado` en esta tabla — a diferencia del legacy `bids.estado`, aquí el estado de una oferta no se rastrea en `ofertas`, sino en `trabajo_instaladores.estado`.

---

## 3. Listado completo de Foreign Keys (16)

| # | Tabla origen | Columna | Tabla destino | Columna destino | ON DELETE |
|---|---|---|---|---|---|
| 1 | `admins` | `empresa_id` | `empresas` | `id` | — |
| 2 | `admins` | `id` | `auth.users` | `id` | CASCADE |
| 3 | `coordinadores` | `empresa_id` | `empresas` | `id` | — |
| 4 | `coordinadores` | `tienda_id` | `tiendas` | `id` | — |
| 5 | `coordinadores` | `id` | `auth.users` | `id` | CASCADE |
| 6 | `instaladores` | `empresa_id` | `empresas` | `id` | — |
| 7 | `instaladores` | `id` | `auth.users` | `id` | CASCADE |
| 8 | `tiendas` | `empresa_id` | `empresas` | `id` | — |
| 9 | `trabajos` | `empresa_id` | `empresas` | `id` | — |
| 10 | `trabajos` | `tienda_id` | `tiendas` | `id` | — |
| 11 | `trabajos` | `coordinador_id` | `coordinadores` | `id` | — |
| 12 | `trabajos` | `instalador_asignado_id` | `instaladores` | `id` | — |
| 13 | `trabajo_instaladores` | `trabajo_id` | `trabajos` | `id` | CASCADE |
| 14 | `trabajo_instaladores` | `instalador_id` | `instaladores` | `id` | — |
| 15 | `ofertas` | `trabajo_id` | `trabajos` | `id` | CASCADE |
| 16 | `ofertas` | `instalador_id` | `instaladores` | `id` | — |

---

## 4. Vistas

### 4.1 `trabajos_para_instalador`

Une `trabajos` con `trabajo_instaladores` filtrando por `instalador_id = auth.uid()`. Enmascara `cliente_nombre`/`cliente_telefono`/`direccion_exacta` según si el instalador es el asignado y si `contacto_visible_hasta` no ha expirado. Expone además `gane_yo` (boolean) y `mi_estado`/`estado_trabajo`.

- **Tablas base**: `trabajos`, `trabajo_instaladores`
- **Función usada**: `auth.uid()`, `now()`

---

## 5. Funciones propias (4)

| Función | Tipo | SECURITY DEFINER | Tablas que toca | Propósito |
|---|---|---|---|---|
| `asignar_instalador(p_trabajo_id, p_instalador_id)` | plpgsql, `RETURNS void` | No | `empresas` (lectura), `trabajos` (UPDATE), `trabajo_instaladores` (UPDATE) | Asigna un instalador a un trabajo, calcula `contacto_visible_hasta`, actualiza estados de las ofertas/notificaciones asociadas |
| `submit_bid(p_trabajo_id, p_precio, p_dia, p_hora, p_comentario)` | plpgsql, `RETURNS void` | No | `ofertas` (INSERT), `trabajo_instaladores` (UPDATE) | Registra la oferta de un instalador autenticado (`auth.uid()`) y marca la notificación como respondida |
| `set_bid_cierra_at()` | plpgsql, `RETURNS trigger` | No | `trabajos` (vía trigger BEFORE INSERT) | Calcula `bid_cierra_at = publicado_at + bid_minutos` |
| `rls_auto_enable()` | plpgsql, `RETURNS event_trigger` | **Sí** | cualquier tabla nueva en `public` | Event trigger de seguridad: fuerza `ENABLE ROW LEVEL SECURITY` en toda tabla nueva creada en `public` |

**Nota de diseño**: a diferencia del modelo legacy (funciones `SECURITY DEFINER` como `get_my_rol()`/`is_admin()`), las funciones de negocio de Producción (`asignar_instalador`, `submit_bid`) **no** son `SECURITY DEFINER` — se ejecutan con los privilegios y RLS del rol que las invoca. Solo la función de infraestructura `rls_auto_enable()` (un event trigger de seguridad, no una función de negocio) usa `SECURITY DEFINER`, lo cual es necesario porque los event triggers de DDL requieren privilegios elevados por naturaleza.

---

## 6. Índices propios (6)

| Índice | Tabla | Columna(s) |
|---|---|---|
| `idx_ofertas_trabajo` | `ofertas` | `trabajo_id` |
| `idx_ti_instalador` | `trabajo_instaladores` | `instalador_id` |
| `idx_ti_trabajo` | `trabajo_instaladores` | `trabajo_id` |
| `idx_trabajos_empresa` | `trabajos` | `empresa_id` |
| `idx_trabajos_estado` | `trabajos` | `estado` |
| `idx_trabajos_tienda` | `trabajos` | `tienda_id` |

(Adicionalmente existen los índices implícitos de cada PK y UNIQUE constraint, no listados aquí por ser automáticos.)

---

## 7. Triggers (1 de fila + 1 de evento)

| Trigger | Tabla/Alcance | Momento | Función ejecutada |
|---|---|---|---|
| `trg_set_bid_cierra_at` | `trabajos` | `BEFORE INSERT` | `set_bid_cierra_at()` |
| `ensure_rls` (event trigger) | `ddl_command_end` (global) | tras cualquier DDL | `rls_auto_enable()` |

---

## 8. Políticas RLS (14 total)

| # | Tabla | Nombre | Comando | Alcance (resumen) |
|---|---|---|---|---|
| 1 | `instaladores` | "instaladores ven su propio perfil" | SELECT | `id = auth.uid()` |
| 2 | `instaladores` | "coordinadores ven instaladores de su empresa" | SELECT | subquery `coordinadores.empresa_id` |
| 3 | `ofertas` | "coordinadores ven ofertas de su empresa" | SELECT | subquery vía `trabajos → coordinadores` |
| 4 | `ofertas` | "instaladores envian su propia oferta" | INSERT | `instalador_id = auth.uid()` |
| 5 | `ofertas` | "instaladores ven sus propias ofertas" | SELECT | `instalador_id = auth.uid()` |
| 6 | `trabajos` | "coordinadores ven trabajos de su tienda o de su empresa si admi" | SELECT | tienda propia OR `coordinadores.rol = 'admin'` |
| 7 | `trabajos` | "coordinadores publican en su tienda" | INSERT | tienda propia |
| 8 | `trabajos` | "coordinadores actualizan su tienda" | UPDATE | tienda propia |
| 9 | `trabajos` | "instaladores ven trabajos donde fueron notificados" | SELECT | subquery `trabajo_instaladores` |
| 10 | `trabajo_instaladores` | (gestión de notificaciones por coordinadores) | UPDATE | subquery `trabajos → coordinadores` empresa |
| 11 | `trabajo_instaladores` | (creación de notificaciones por coordinadores) | INSERT | subquery `trabajos → coordinadores` empresa |
| 12 | `trabajo_instaladores` | (visualización de notificaciones por coordinadores) | SELECT | subquery `trabajos → coordinadores` empresa |
| 13 | `trabajo_instaladores` | "instaladores actualizan su propio estado" | UPDATE | `instalador_id = auth.uid()` |
| 14 | `trabajo_instaladores` | "instaladores ven sus propias notificaciones" | SELECT | `instalador_id = auth.uid()` |

**Tablas con RLS habilitado pero cero policies**: `admins`, `coordinadores`, `empresas`, `tiendas` (4 de 8 tablas — inaccesibles para `anon`/`authenticated`).

---

## 9. Ausencias notables (respecto al modelo legacy)

- **0 tipos ENUM personalizados** en `public` (legacy tenía 4: `user_role`, `trabajo_estado`, `oferta_estado`, `trabajo_instalador_estado`).
- **0 CHECK constraints** en `public` (legacy tenía 3).
- **0 funciones `SECURITY DEFINER` de negocio** (legacy tenía 6: `current_user_role()`, `current_profile()`, `current_empresa()`, `is_admin()`, `is_coordinator()`, `is_installer()`).
- **0 tabla `notificaciones`** dedicada (el concepto de notificación por instalador vive dentro de `trabajo_instaladores`, no en una tabla separada).
- **0 tabla `zonas_cobertura`** (el concepto de zona vive como columnas `provincia`/`zona` de texto libre en `instaladores`/`tiendas`/`trabajos`, sin tabla catálogo ni FK).

Ver detalle completo de todas las diferencias en `DATABASE_DIFF.md`.
