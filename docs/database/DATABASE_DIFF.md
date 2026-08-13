# DATABASE_DIFF.md — HANDYMAX · Auditoría de sincronización de base de datos

> Generado en el Sprint "Database Synchronization Audit". Documento de solo análisis — no se ejecutó ninguna migración, no se modificó ningún archivo SQL existente, no se movió ni eliminó ningún archivo. Compara el esquema **legacy** (`supabase/migrations/legacy/0001_initial_schema.sql` + `supabase/migrations/legacy/0002_auth_roles_rls.sql`, el diseño sobre el que se construyó el proyecto hasta ahora) contra el esquema **real de Producción** (`supabase/migrations/0001_initial_schema.sql`, un `pg_dump` completo exportado directamente de Supabase Producción, PostgreSQL 17.6, `pg_dump` 18.4).

## Nota metodológica

El archivo de Producción es un `pg_dump` completo del clúster, e incluye — además del esquema `public` propio de HANDYMAX — los esquemas internos que Supabase gestiona automáticamente (`auth`, `storage`, `realtime`, `vault`, `graphql`, `graphql_public`, `pgbouncer`, `extensions`). Esta comparación se limita exclusivamente al **esquema `public`** (las tablas/funciones/vistas propias de HANDYMAX) — ver `DATABASE_INVENTORY.md` §"Objetos internos de Supabase" para el detalle de lo que se excluyó y por qué.

El esquema legacy nunca tuvo columnas `updated_at`/triggers de auditoría más allá de lo ya documentado; el esquema de Producción tampoco los tiene (ver "Columnas eliminadas"). Ninguno de los dos define secuencias (`SEQUENCE`) propias en `public` — todas las claves primarias usan `uuid`.

---

# Tablas nuevas

Tablas que existen en Producción y no tienen ninguna tabla homónima en legacy:

- **`admins`** — perfil de administrador, con `id` como FK directa a `auth.users.id` (no existía como tabla separada; en legacy, "admin" era un valor del campo `usuarios.rol`).
- **`coordinadores`** — perfil de coordinador, `id` FK directa a `auth.users.id` (en legacy, otro valor de `usuarios.rol`).
- **`instaladores`** — perfil de instalador, `id` FK directa a `auth.users.id` (en legacy, otro valor de `usuarios.rol`).
- **`tiendas`** — conceptualmente el reemplazo de `sucursales` (ver "Tablas eliminadas"), con una columna nueva (`zona`).
- **`ofertas`** — conceptualmente el reemplazo de `bids` (ver "Tablas eliminadas"), con una estructura más delgada (sin columna de estado propia — ver "Columnas eliminadas").

No se listan aquí `trabajos` ni `trabajo_instaladores` porque ya existían con ese mismo nombre en legacy — sus diferencias internas están en las secciones de columnas más abajo, no en esta sección.

# Tablas eliminadas

Tablas que existen en legacy y no tienen ningún equivalente en Producción:

- **`usuarios`** — la tabla unificada de legacy (admin/coordinador/instalador discriminados por `rol`) no existe en Producción; su rol fue reemplazado por 3 tablas separadas (`admins`/`coordinadores`/`instaladores`, ver "Tablas nuevas" y la sección dedicada más abajo, "Migración `usuarios` → `admins`/`coordinadores`/`instaladores`").
- **`sucursales`** — reemplazada conceptualmente por `tiendas` (mismo propósito: sucursal física de la empresa).
- **`bids`** — reemplazada conceptualmente por `ofertas` (mismo propósito: oferta de un instalador sobre un trabajo), con un diseño más delgado.
- **`zonas_cobertura`** — sin equivalente como tabla independiente. Su función (qué zonas cubre un instalador, relación muchos-a-muchos) fue **absorbida y simplificada** dentro de `instaladores.provincia`/`instaladores.zona` (columnas simples, un instalador cubre una sola zona/provincia en Producción, no varias).
- **`notificaciones`** — sin ningún equivalente en Producción. El log de notificaciones enviadas (SMS/WhatsApp/push/email) no existe como tabla — no hay evidencia de que esta funcionalidad se haya migrado a otro lugar del esquema.

## Migración `usuarios` → `admins`/`coordinadores`/`instaladores` (detalle columna por columna)

| Columna en `usuarios` (legacy) | ¿Sobrevive? | Dónde y cómo |
|---|---|---|
| `id` | Sí, transformada | Sigue siendo PK en las 3 tablas nuevas, pero ya no es un uuid interno independiente — ahora **es directamente** `auth.users.id` (FK `ON DELETE CASCADE`), no una fila con su propio `auth_id` separado. |
| `auth_id` | No | Ya no hace falta: `id` cumple ese rol directamente en las 3 tablas nuevas. |
| `empresa_id` | Sí | Presente en `admins`, `coordinadores`, `instaladores`. |
| `sucursal_id` | Parcial | Sobrevive como `tienda_id`, pero **solo en `coordinadores`** — `admins` e `instaladores` no tienen columna de tienda/sucursal. |
| `rol` (CHECK admin/coordinador/instalador) | Parcial | La tabla en la que vive una fila ya discrimina el rol (estar en `admins` = ser admin). Sin embargo, `coordinadores` **también conserva una columna `rol` propia** (`text DEFAULT 'coordinador'`), usada por las políticas RLS para distinguir coordinador normal vs `rol = 'admin'` — ver hallazgo de diseño en el resumen ejecutivo, sección de riesgos. |
| `nombre` | Sí | Presente en las 3 tablas. |
| `email` | Parcial | Presente en `admins` e `instaladores`; **ausente en `coordinadores`**. |
| `telefono` | Parcial | Presente en `admins` e `instaladores`; **ausente en `coordinadores`**. |
| `empresa_nombre` | No | No sobrevive en ninguna de las 3 tablas nuevas. |
| `rating` | Parcial | Solo en `instaladores` (tiene sentido: es una métrica de instalador). |
| `cumplimiento` | Parcial | Solo en `instaladores`. |
| `aceptacion` | Parcial | Solo en `instaladores`. |
| `activo` | Sí | Presente en las 3 tablas. |
| `suspendido` | Parcial | Solo en `instaladores`. |
| `docs_completos` | Parcial (renombrada) | Sobrevive como `instaladores.documentos_ok` — mismo propósito, nombre distinto. |
| `created_at` | Sí | Presente en las 3 tablas. |
| `updated_at` | No | No existe en ninguna de las 3 tablas nuevas (ver "Columnas eliminadas"). |

Columnas **nuevas** en `instaladores` sin equivalente en `usuarios`: `provincia`, `zona` (reemplazan a la tabla `zonas_cobertura`, ver arriba), `km`, `prom_respuesta_seg`.

---

# Columnas nuevas

Columnas que aparecen en Producción sobre tablas que ya existían con ese nombre en legacy:

**`empresas`**: `color_primario` (text, default `'#E4221E'`, nullable), `contacto_visible_horas` (integer, default `48`, NOT NULL — cuántas horas después de asignar un trabajo el instalador puede ver los datos del cliente).

**`trabajos`**: `codigo` (text NOT NULL, con UNIQUE compuesto `(empresa_id, codigo)` — un identificador de trabajo legible, no existía en legacy), `fecha` (text NOT NULL — fecha del servicio sugerida por el coordinador; en legacy esta fecha solo la definía el instalador vía `bids.fecha_disponible`, nunca el coordinador), `hora` (text NOT NULL, mismo caso que `fecha`), `extra` (text, nullable), `urgente` (boolean NOT NULL default false), `asignado_at` (timestamptz, nullable), `contacto_visible_hasta` (timestamptz, nullable — ligada a `empresas.contacto_visible_horas`).

**`trabajo_instaladores`**: `abierto_at` (timestamptz, nullable), `respondido_at` (timestamptz, nullable) — reemplazan conceptualmente a `updated_at` con timestamps específicos por transición de estado, más granular que legacy.

**`instaladores`** (columnas nuevas respecto a `usuarios`, ver tabla de migración arriba): `provincia`, `zona`, `km`, `prom_respuesta_seg`.

**`coordinadores`** (columna nueva respecto a `usuarios`): `tienda_id` NOT NULL — en legacy, `usuarios.sucursal_id` era nullable; en Producción, todo coordinador pertenece obligatoriamente a una tienda.

# Columnas modificadas (renombradas o con cambio de tipo/semántica)

| Tabla | Columna legacy | Columna Producción | Qué cambió |
|---|---|---|---|
| `trabajos` | `sucursal_id` | `tienda_id` | Renombrada; FK ahora apunta a `tiendas` en vez de `sucursales`. |
| `trabajos` | `phase` (ENUM `trabajo_estado` en legacy 0002; `text`+CHECK en legacy 0001) | `estado` (`text`, **sin CHECK ni ENUM**) | Renombrada, y **pierde toda validación a nivel de base de datos** — ver riesgo en el resumen ejecutivo. |
| `trabajos` | `published_at` | `publicado_at` | Renombrada, mismo tipo (`timestamptz NOT NULL DEFAULT now()`). |
| `trabajos` | `bid_mins` (default 10) | `bid_minutos` (default 5) | Renombrada; el valor por defecto también cambió (10 → 5 minutos). |
| `trabajos` | `assigned_bid_id` (FK → `bids.id`) | `instalador_asignado_id` (FK → `instaladores.id`) | Cambio de semántica, no solo de nombre: en legacy la asignación se resolvía indirectamente vía el bid ganador (`assigned_bid_id → bids.instalador_id`); en Producción `trabajos` apunta **directamente** al instalador asignado, sin pasar por `ofertas`. |
| `trabajos` | `cliente_direccion` | `direccion_exacta` | Renombrada, mismo tipo. |
| `trabajo_instaladores` | `estado` (ENUM `trabajo_instalador_estado`: `notificado`/`abierto`/`oferta_enviada`/`rechazado`/`expirado` — legacy 0002, **nunca llegó a desplegarse en Producción**) | `estado` (`text DEFAULT 'notificado'`, sin ENUM ni CHECK) | Incompatible en tipo y en vocabulario: la función real `asignar_instalador()` de Producción usa los valores `'respondido'`/`'seleccionado'`/`'confirmado'`/`'perdido'` — ninguno de los 5 valores del ENUM legacy aparece en el código real de Producción. |

# Columnas eliminadas

- **`trabajos.updated_at`** — existía en legacy (con su propio trigger `trigger_trabajos_updated_at`); no existe en Producción, y no hay ningún trigger de actualización automática para `trabajos` más allá del que calcula `bid_cierra_at` al insertar.
- **`usuarios.*`** — toda la tabla fue eliminada; ver la tabla de migración columna por columna más arriba para el detalle de qué campo sobrevivió en cuál de las 3 tablas nuevas y cuál se perdió sin reemplazo (`auth_id`, `empresa_nombre`, `updated_at`, y — parcialmente — `rating`/`cumplimiento`/`aceptacion`/`suspendido`, que solo sobreviven en `instaladores`).
- **`bids.estado`** — la tabla `ofertas` (su reemplazo conceptual) **no tiene ninguna columna de estado**. En Producción, el estado de una oferta/enganche vive exclusivamente en `trabajo_instaladores.estado` — una oferta (`ofertas`) es puramente el contenido económico (precio/día/hora/comentario), desacoplado de su estado de aceptación/rechazo.
- **`bids.respondido_at`** → no está en `ofertas` (tiene en cambio `enviado_at`, con otro nombre y otro momento semántico — cuándo se envió la oferta, no cuándo se respondió a ella).
- Todas las columnas de **`zonas_cobertura`** (tabla eliminada por completo, ver arriba).
- Todas las columnas de **`notificaciones`** (tabla eliminada por completo, ver arriba).

---

# Índices nuevos

Índices explícitos (no cuentan los automáticos de PK/UNIQUE) presentes en Producción:

- `idx_ofertas_trabajo` — `ofertas(trabajo_id)` (equivalente conceptual de `idx_bids_trabajo` de legacy).
- `idx_ti_instalador` — `trabajo_instaladores(instalador_id)`.
- `idx_ti_trabajo` — `trabajo_instaladores(trabajo_id)`.
- `idx_trabajos_empresa` — `trabajos(empresa_id)` (no existía en legacy — legacy solo indexaba `sucursal_id`, no `empresa_id`, en `trabajos`).
- `idx_trabajos_estado` — `trabajos(estado)` (equivalente conceptual de `idx_trabajos_phase`).
- `idx_trabajos_tienda` — `trabajos(tienda_id)` (equivalente conceptual de `idx_trabajos_sucursal`).

# Índices eliminados

Índices que existían en legacy y no tienen ningún equivalente en Producción:

- `idx_trabajos_zona` — `trabajos(zona, provincia)` compuesto. Producción no tiene ningún índice sobre `zona`/`provincia` de `trabajos`.
- `idx_trabajos_published`/`idx_bids_estado`/`idx_usuarios_rol`/`idx_usuarios_auth`/`idx_zonas_instalador` — sin equivalente (las tablas/columnas que indexaban ya no existen o cambiaron de nombre sin que se haya creado un índice nuevo sobre el nuevo nombre): no hay índice sobre `trabajos.publicado_at`, ni sobre `ofertas` sin columna de estado (n/a), ni sobre `coordinadores.rol`/`instaladores`, ni sobre `admins.empresa_id`/`coordinadores.empresa_id`/`instaladores.empresa_id` (a diferencia de legacy 0002, que sí había agregado `idx_usuarios_empresa` — Producción no tiene ningún índice equivalente sobre las 3 tablas nuevas).
- `idx_trabajos_coordinador`/`idx_trabajos_assigned_bid`/`idx_trabajoinst_trabajo`/`idx_trabajoinst_instalador` (agregados en legacy 0002) — de estos 4, `idx_trabajoinst_trabajo` e `idx_trabajoinst_instalador` sí tienen equivalente en Producción (`idx_ti_trabajo`/`idx_ti_instalador`, ya contados en "Índices nuevos"); `idx_trabajos_coordinador` e `idx_trabajos_assigned_bid` (renombrado a `instalador_asignado_id`) **no tienen ningún índice en Producción**.

# Funciones nuevas

Funciones en el esquema `public` de Producción sin ninguna función de nombre/propósito equivalente en legacy:

- **`asignar_instalador(p_trabajo_id uuid, p_instalador_id uuid)`** — RPC de negocio: asigna un instalador ganador a un trabajo (actualiza `trabajos.estado`/`instalador_asignado_id`/`asignado_at`/`contacto_visible_hasta`, y marca en `trabajo_instaladores` al ganador como `'confirmado'` y a los demás con oferta pendiente como `'perdido'`). Es el equivalente funcional — pero con nombres de columnas distintos y ya **implementado y desplegado** — de la función `seleccionar_instalador()` que `ARCHITECTURE.md §9.5` documentaba como **propuesta, nunca implementada**.
- **`submit_bid(p_trabajo_id uuid, p_precio numeric, p_dia text, p_hora text, p_comentario text)`** — RPC de negocio: inserta la oferta en `ofertas` y marca `trabajo_instaladores.estado = 'respondido'` en una sola transacción. No tiene equivalente en legacy (legacy dejaba el `INSERT INTO bids` como una operación directa del cliente, protegida solo por RLS, sin RPC).
- **`rls_auto_enable()`** — función de infraestructura (event trigger `ensure_rls`, ver más abajo) que activa automáticamente RLS en cualquier tabla nueva creada en el esquema `public`. No existe ningún equivalente en legacy — es una red de seguridad a nivel de base de datos para que nunca se cree una tabla sin RLS por descuido.

# Funciones modificadas

- **`set_bid_cierra_at()`** — incluida en ambos esquemas con el mismo propósito (calcular `bid_cierra_at` al insertar un trabajo), pero el cuerpo cambió para usar los nombres de columna reales de Producción: `new.publicado_at + (new.bid_minutos * interval '1 minute')` en vez de `NEW.bid_cierra_at := NEW.published_at + (NEW.bid_mins || ' minutes')::interval` (legacy). Mismo propósito, sintaxis de cálculo de intervalo también distinta (`*` vs concatenación `||`), pero funcionalmente equivalente.

# Funciones eliminadas

(Sección agregada además de las pedidas explícitamente, porque el hallazgo es demasiado significativo para omitirlo — ver resumen ejecutivo.)

Todas las funciones auxiliares de rol/RLS de ambos archivos legacy **no existen en Producción**:

- `get_my_rol()`, `get_my_sucursal_id()`, `get_my_usuario_id()` (legacy 0001).
- `set_updated_at()` (legacy 0001) — coherente con que ninguna tabla de Producción tiene columna `updated_at` ni trigger asociado.
- `current_user_role()`, `current_profile()`, `current_empresa()`, `is_admin()`, `is_coordinator()`, `is_installer()` (legacy 0002 — Sprint 4.0.1, primera ronda).

**Esto tiene una implicación de diseño importante**: las políticas RLS de Producción no usan ninguna función auxiliar `SECURITY DEFINER` — comparan `auth.uid()` directamente contra `coordinadores.id`/`instaladores.id`/`admins.id` en subqueries correlacionadas dentro de cada política. Es un patrón distinto pero internamente consistente (ver resumen ejecutivo).

# Triggers nuevos

Ninguno, estrictamente — el único trigger de `public` en Producción (`trg_set_bid_cierra_at`) tiene un equivalente directo en legacy (ver "Triggers modificados").

# Triggers modificados

- **`trigger_set_bid_cierra_at`** (legacy) → **`trg_set_bid_cierra_at`** (Producción) — mismo propósito (BEFORE INSERT en `trabajos`), nombre distinto, ejecuta la versión modificada de `set_bid_cierra_at()` (ver "Funciones modificadas").

# Triggers eliminados

- `trigger_trabajos_updated_at` (BEFORE UPDATE en `trabajos`) — sin equivalente, coherente con la eliminación de `trabajos.updated_at`.
- `trigger_usuarios_updated_at` (BEFORE UPDATE en `usuarios`) — sin equivalente, tabla `usuarios` eliminada.
- `trigger_trabajo_instaladores_updated_at` (legacy 0002, BEFORE UPDATE en `trabajo_instaladores`) — sin equivalente; `trabajo_instaladores` en Producción no tiene columna `updated_at` (tiene en cambio `abierto_at`/`respondido_at`, actualizados explícitamente por `submit_bid()`, no por un trigger genérico).

---

# RLS nuevas

Todas las 14 políticas RLS de Producción son, en sentido estricto, "nuevas" frente a legacy (ningún texto de política coincide literalmente, dado el cambio de nombres de tabla/columna) — se listan agrupadas por tabla, con su equivalente conceptual en legacy cuando existe:

**`instaladores`** (2): `"instaladores ven su propio perfil"` (SELECT, `id = auth.uid()` — equivalente conceptual de `"Usuario ve su propio perfil"` en legacy); `"coordinadores ven instaladores de su empresa"` (SELECT, scoped por `empresa_id` — equivalente conceptual de `"Coordinador ve instaladores de su empresa"`, pero legacy escaneaba por *empresa* igual, no por sucursal).

**`ofertas`** (3): `"instaladores envian su propia oferta"` (INSERT — equivalente de `"Instalador puede hacer bid"`, pero **sin la validación de que el trabajo siga `'live'`/dentro del tiempo de bid** que legacy sí tenía en el `WITH CHECK`); `"instaladores ven sus propias ofertas"` (SELECT — equivalente de `"Instalador ve sus propios bids"`); `"coordinadores ven ofertas de su empresa"` (SELECT, scoped por empresa vía `trabajos` — equivalente de `"Coordinador ve bids de sus trabajos"`, pero legacy escaneaba por *sucursal*, Producción por *empresa completa*).

**`trabajos`** (4): `"coordinadores ven trabajos de su tienda o de su empresa si admi"` (SELECT — equivalente de `"Coordinador ve trabajos de su sucursal"` + `"Admin ve todos los trabajos"` fusionadas en una sola política con un `OR`); `"coordinadores publican en su tienda"` (INSERT — equivalente de `"Coordinador crea trabajos en su sucursal"`); `"coordinadores actualizan su tienda"` (UPDATE — equivalente de `"Coordinador actualiza trabajos de su sucursal"` + parte de `"Admin puede actualizar cualquier trabajo"`); `"instaladores ven trabajos donde fueron notificados"` (SELECT — **modelo de visibilidad distinto**: legacy mostraba al instalador todo trabajo `live` en su zona vía `zonas_cobertura`; Producción solo muestra los trabajos donde ya existe una fila en `trabajo_instaladores` para ese instalador — es decir, la notificación/selección de a quién mostrarle un trabajo ya no la decide una zona de cobertura genérica, sino un proceso explícito de "engagement" por trabajo).

**`trabajo_instaladores`** (5): `"instaladores ven sus propias notificaciones"` (SELECT), `"instaladores actualizan su propio estado"` (UPDATE — este último **no existía como concepto en legacy 0002**, que solo daba SELECT al instalador sobre esta tabla, nunca UPDATE), `"coordinadores ven y gestionan notificaciones de su empresa"` (SELECT), `"coordinadores crean notificaciones de su empresa"` (INSERT), `"coordinadores actualizan notificaciones de su empresa"` (UPDATE) — el conjunto es más permisivo para coordinador que legacy 0002 (que solo daba `FOR ALL` scoped por *sucursal*, aquí se reparte explícitamente en 3 políticas separadas, scoped por *empresa completa*).

# RLS eliminadas

Todas las políticas de legacy, sin excepción, están ausentes literalmente de Producción (los nombres, tablas y columnas cambiaron). Los casos **sin ningún equivalente conceptual** (no solo "renombrada", sino con una capacidad que ya no existe en absoluto) son los más relevantes para el riesgo de sincronización:

- **`admins`**: **cero políticas en Producción.** Legacy no tenía una tabla `admins` separada, así que no aplica una comparación directa, pero el efecto neto es que hoy, en Producción, la tabla `admins` es completamente inaccesible por `anon`/`authenticated` (RLS activo + 0 políticas = deniega todo) — ver riesgo crítico en el resumen ejecutivo.
- **`empresas`**: legacy tenía `"Todos pueden ver empresas activas"` (SELECT público) + (en legacy 0002) `"Admin gestiona empresas (Sprint 4.0.1)"` (FOR ALL). **Producción no tiene ninguna política sobre `empresas`** — ni siquiera la lectura pública básica. Mismo efecto: tabla inaccesible vía `anon`/`authenticated`.
- **`tiendas`** (equivalente a `sucursales`): legacy tenía `"Todos pueden ver sucursales activas"` (SELECT público) + `"Admin gestiona sucursales (Sprint 4.0.1)"`. **Producción no tiene ninguna política sobre `tiendas`.** Mismo efecto.
- **`coordinadores`** (parcialmente equivalente a una porción de `usuarios`): legacy daba a cualquier usuario `"Usuario ve su propio perfil"` y a coordinador/admin ver otros usuarios. **Producción no tiene ninguna política sobre `coordinadores` como tabla objetivo** — un coordinador no puede ni siquiera leer su propia fila en `coordinadores` vía `anon`/`authenticated` (solo se le referencia *desde* políticas de otras tablas, nunca se define una política *sobre* `coordinadores` misma).
- `"Coordinador y admin ven todas las zonas"`/`"Instalador ve sus propias zonas"`/`"Admin gestiona zonas de cobertura"` — sin equivalente, tabla `zonas_cobertura` eliminada.
- `"Coordinador y admin ven notificaciones"`/`"Instalador ve sus propias notificaciones"` (sobre la tabla `notificaciones` de log de envíos, no confundir con las políticas de `trabajo_instaladores` que en Producción también se llaman coloquialmente "notificaciones" en el texto de la política) — sin equivalente, tabla `notificaciones` eliminada.

# Constraints nuevas

- `trabajos_empresa_id_codigo_key` — UNIQUE `(empresa_id, codigo)`, nueva (columna `codigo` no existía en legacy).
- Las FKs de `id → auth.users.id` en `admins`/`coordinadores`/`instaladores` (`ON DELETE CASCADE`) — no existían en legacy en esa forma (legacy tenía `usuarios.auth_id UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL`, una FK sobre una columna *distinta* de la PK, con una acción de borrado distinta: `SET NULL` en vez de `CASCADE`).
- `trabajos_instalador_asignado_id_fkey` (→ `instaladores.id`) — nueva, reemplaza conceptualmente a `fk_trabajos_assigned_bid` (→ `bids.id`), pero apunta a una tabla distinta (ver "Columnas modificadas").
- `coordinadores_tienda_id_fkey` (NOT NULL) — en legacy, `usuarios.sucursal_id` era nullable y sin esta restricción de NOT NULL a nivel de columna.

# Constraints eliminadas

- **Los 3 CHECK de vocabulario controlado de legacy 0001** (`usuarios_rol_check`, `trabajos_phase_check`, `bids_estado_check`) y **los 4 tipos ENUM de legacy 0002** que los reemplazaban (`user_role`, `trabajo_estado`, `oferta_estado`, `trabajo_instalador_estado`) — **ninguno tiene equivalente en Producción.** Las columnas correspondientes (`coordinadores.rol`, `trabajos.estado`, `trabajo_instaladores.estado`) son `text` libre, sin ninguna restricción de valores a nivel de base de datos. Ver riesgo crítico en el resumen ejecutivo.
- `notificaciones_canal_check` — sin equivalente, tabla eliminada.
- `zonas_cobertura_instalador_id_provincia_zona_key` (UNIQUE) — sin equivalente, tabla eliminada.
- `bids_trabajo_id_instalador_id_key` (UNIQUE) — reemplazada por `ofertas_trabajo_id_instalador_id_key` (mismo propósito, tabla renombrada).
- `usuarios_auth_id_key` (UNIQUE) — sin equivalente directo (ya no aplica: `id` de las 3 tablas nuevas ya es único por ser PK y FK 1:1 a `auth.users.id`).

---

# Resumen ejecutivo

**Porcentaje de diferencias**: de las 8 tablas de Producción, **0 son idénticas byte-a-byte** a su análogo legacy más cercano — incluso `empresas` y `trabajos` (los 2 nombres de tabla que sobreviven literalmente) tienen columnas nuevas/renombradas. De las 8 tablas de legacy, **5 desaparecieron o se fusionaron** (`usuarios` dividida en 3, `zonas_cobertura` y `notificaciones` eliminadas sin reemplazo). De las 11 funciones legacy, **9 no existen en Producción** (todo el sistema de funciones auxiliares `get_my_*`/`is_*`/`current_*` fue reemplazado por subqueries inline en las políticas). En términos de superficie total (tablas + columnas + funciones + índices + políticas + constraints), **la coincidencia estructural exacta entre legacy y Producción es prácticamente nula** — esto no es una evolución incremental del mismo diseño, es un **rediseño completo** del modelo de datos, aunque conceptualmente cubre el mismo dominio de negocio (empresas, tiendas, roles de usuario, trabajos, ofertas, notificación de instaladores).

**Riesgo de sincronización: ALTO.** Razones concretas:

1. **Cuatro tablas completamente inaccesibles vía RLS** (`admins`, `empresas`, `tiendas`, `coordinadores`): RLS está activo pero no existe ninguna política sobre ellas. Cualquier consulta desde el cliente (`anon`/`authenticated`, es decir, la app real) a estas tablas devuelve cero filas siempre, incluso para su propio dueño. Si el frontend ya depende de leer `empresas`/`tiendas` (por ejemplo, para mostrar el nombre de la empresa o un selector de tiendas) o de que un coordinador lea su propia fila en `coordinadores`, esas funcionalidades están rotas en Producción tal como está hoy, salvo que se accedan exclusivamente con `service_role` (mala práctica de seguridad si ocurre desde el cliente).
2. **Pérdida total de validación de vocabulario a nivel de base de datos**: ni `coordinadores.rol` ni `trabajos.estado` ni `trabajo_instaladores.estado` tienen CHECK ni ENUM en Producción — cualquier valor de texto es aceptado. Toda la validación de estos campos depende hoy exclusivamente de la disciplina del código de aplicación (o de las 2 funciones RPC, que si se usan correctamente mantienen valores consistentes, pero nada impide un `UPDATE` directo con un valor arbitrario).
3. **Ambigüedad de diseño entre `admins` y `coordinadores.rol = 'admin'`**: existen dos representaciones distintas del concepto "administrador" (una tabla dedicada, sin ninguna política RLS que la haga usable; y un valor de texto dentro de `coordinadores`, que sí es el que efectivamente usan las políticas reales de `trabajos`/`trabajo_instaladores`). No queda claro, solo con el `pg_dump`, cuál de las dos es la fuente de verdad vigente, o si `admins` es una tabla en desuso/en transición.
4. **El diseño legacy (`bids`+ENUMs+funciones auxiliares) y el de Producción (`ofertas` sin estado propio+RLS inline) son incompatibles de fusionar con una migración incremental simple** — no se trata de agregar/quitar columnas sueltas, sino de una reestructuración de relaciones (`trabajos.assigned_bid_id → bids` vs `trabajos.instalador_asignado_id → instaladores`) que cambia qué tabla es la fuente de verdad de la asignación.

**Estrategia recomendada**: ver `DATABASE_SYNC_PLAN.md` para la justificación completa — se recomienda la **Opción B (nueva baseline)**, no migraciones incrementales sobre legacy.

**Impacto esperado**: si el frontend (`src/types/database.ts`, `src/types/domain.ts`, `src/lib/mappers.ts`, servicios de Supabase) fue construido asumiendo el modelo legacy (`usuarios`/`sucursales`/`bids`/`phase`/`published_at`/`assigned_bid_id`), **ese código no es compatible con el esquema real de Producción** y requerirá una revisión completa de tipos y queries antes de poder conectarse — esto no se evaluó en este Sprint (fuera de alcance: "no modificar código React/TypeScript"), pero se reporta como el impacto más directo y urgente a anticipar.

**Próximos pasos** (no ejecutados en este Sprint, pendientes de aprobación):

1. Decidir, con el usuario, cuál de los dos esquemas es la fuente de verdad definitiva hacia adelante (dado que Producción ya está desplegada y en uso real, la recomendación técnica es adoptar el esquema de Producción como base — ver `DATABASE_SYNC_PLAN.md`).
2. Resolver los 3 hallazgos de riesgo (tablas sin políticas, columnas sin validación, ambigüedad `admins`/`coordinadores.rol`) con el usuario antes de construir cualquier capa nueva sobre este esquema.
3. Recién después de (1) y (2), planear la migración/reescritura del código de tipos/servicios de Supabase del frontend — explícitamente fuera de alcance de este Sprint.
