# PHASE_4.md — Fase 4: Infraestructura de backend (Supabase)

> Ubicación de este archivo: raíz del proyecto, junto a `ARCHITECTURE.md`/`CHANGELOG.md`/`PROJECT_STATUS.md`/`TODO.md`/`MIGRATION_STATUS.md` (el brief de este Sprint pedía `docs/PHASE_4.md`; se corrige a la raíz por el mismo motivo documentado abajo en "Diferencias detectadas" — `docs/` solo contiene `SPRINTS_INDEX.md` y `sprints/`, nunca los documentos de seguimiento de fase/proyecto).

## Sprint 4.0.1 — Infraestructura de Base de Datos (Supabase)

**Estado:** 🟡 En revisión — pendiente de aprobación explícita del usuario antes de avanzar a Sprint 4.0.2.

**Archivo de la migración:** `supabase/migrations/0002_auth_roles_rls.sql` (nuevo).

Este Sprint marca el cierre de la reconstrucción visual (Fase 3, Sprints 3.1-3.16) y el inicio de la infraestructura real de backend. Todo lo hecho aquí es exclusivamente SQL: no se tocó ningún componente React, hook, contexto, ruta, ni configuración de Vite/Tailwind. Ver confirmación explícita en la sección 6 de este documento.

---

## 1. Diferencias detectadas entre el brief y el schema real

Siguiendo la disciplina de este proyecto ("verificar contra la fuente real antes de implementar, documentar cualquier discrepancia con trazabilidad"), se inspeccionó directamente `supabase/migrations/0001_initial_schema.sql` (el schema real y ya aprobado) antes de escribir la migración. El brief de este Sprint asumía una estructura distinta a la real en varios puntos:

| Asunción del brief | Realidad en `0001_initial_schema.sql` | Decisión tomada |
|---|---|---|
| Ruta `database/migrations/002_auth_roles_rls.sql` | Las migraciones reales viven en `supabase/migrations/NNNN_nombre.sql` (prefijo numérico de 4 dígitos, ej. `0001_initial_schema.sql`) | Se usa la convención real: `supabase/migrations/0002_auth_roles_rls.sql` |
| Documentación en `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`, `docs/PHASE_4.md` | `ARCHITECTURE.md`/`CHANGELOG.md`/`PROJECT_STATUS.md`/`TODO.md`/`MIGRATION_STATUS.md` viven en la **raíz** del proyecto; `docs/` solo contiene `SPRINTS_INDEX.md` y la carpeta `sprints/` | Se actualizan los archivos reales de la raíz; `PHASE_4.md` se crea también en la raíz |
| Tablas separadas `admins`, `coordinadores`, `instaladores` | Una única tabla `usuarios`, con columna discriminadora `rol` (`CHECK IN ('coordinador','instalador','admin')`) | El ENUM `user_role` se aplica sobre `usuarios.rol`; no se crean tablas nuevas por rol (habría sido una migración destructiva y desproporcionada, contraria a "no eliminar datos existentes") |
| Tabla `tiendas` | La tabla real de sucursales/tiendas se llama `sucursales` | Los índices e instrucciones de RLS sobre "tiendas" se aplican sobre `sucursales` |
| Tabla `ofertas` | La tabla real de ofertas de instaladores se llama `bids` | El ENUM `oferta_estado` y los índices sobre "ofertas" se aplican sobre `bids` |
| Columna `trabajos.estado` | La columna real equivalente es `trabajos.phase` | El ENUM `trabajo_estado` se aplica sobre `trabajos.phase` |
| Columna `trabajos.publicado_at` | La columna real equivalente es `trabajos.published_at` | El índice solicitado se crea sobre `trabajos.published_at` (ya existía desde 0001, re-declarado de forma idempotente) |
| Columna `trabajos.instalador_asignado_id` | No existe esa columna. La asignación se rastrea vía `trabajos.assigned_bid_id → bids.id → bids.instalador_id` | No se agregó una columna denormalizada nueva (requeriría un trigger de sincronización, es decir lógica de negocio, fuera de alcance de este Sprint). Se indexó en su lugar la columna real `assigned_bid_id` |
| Valores en inglés para `oferta_estado` (`pending/accepted/rejected/expired`) | `bids.estado` ya usa valores en español (`pendiente`/`seleccionado`/`rechazado`, vía CHECK), y el tipo TypeScript `BidEstado` (`src/types/enums.ts`) y la vista `trabajos_vista` (0001) ya dependen literalmente de esos valores en español; además `ARCHITECTURE.md §9.5` ya documenta (como propuesta pendiente de aprobación) un RPC `seleccionar_instalador` que usa esos mismos valores | Se mantienen los valores en español para `oferta_estado`, agregando únicamente `'expirado'` como valor nuevo. Cambiar a inglés habría roto la vista existente y el tipo TS, además de invalidar la propuesta ya documentada en `ARCHITECTURE.md` — **desviación deliberada del brief, documentada aquí para revisión del usuario** |
| Función `current_role()` | — | `CURRENT_ROLE` es una palabra reservada de PostgreSQL (pseudo-constante estilo `CURRENT_USER`); no puede usarse como nombre de función. Se renombró a `current_user_role()` (ver sección 5) |

Ninguna de estas correcciones se hizo "en silencio": cada una está documentada aquí y en los comentarios del propio archivo de migración, para que el usuario pueda revisarlas y, si alguna no es la interpretación correcta, redirigir antes del Sprint 4.0.2.

---

## 2. ENUMs creados

| ENUM | Valores | Columna(s) convertida(s) |
|---|---|---|
| `user_role` | `admin`, `coordinador`, `instalador` | `usuarios.rol` (antes `text` + CHECK) |
| `trabajo_estado` | `live`, `assigned`, `cancelled`, `completed`, `expired` | `trabajos.phase` (antes `text` + CHECK) |
| `oferta_estado` | `pendiente`, `seleccionado`, `rechazado`, `expirado` | `bids.estado` (antes `text` + CHECK) |
| `trabajo_instalador_estado` | `notificado`, `abierto`, `oferta_enviada`, `rechazado`, `expirado` | Columna `estado` de la tabla nueva `trabajo_instaladores` (ver sección 4) |

Los primeros 3 ENUMs incluyen todos los valores del CHECK original de 0001 (sin pérdida de datos posible) más, donde aplica, el valor nuevo `expired`/`expirado` solicitado por el brief.

Verificado por consulta directa a `pg_enum` contra una base de datos de prueba real (ver sección 7): 17 valores en total repartidos en los 4 tipos, coincidiendo exactamente con la tabla de arriba.

---

## 3. Conversión de columnas (sin pérdida de datos)

Para cada una de las 3 columnas (`usuarios.rol`, `trabajos.phase`, `bids.estado`) se siguió esta secuencia, validada mediante ejecución real (ver sección 7 y "Problemas encontrados" más abajo):

1. `DROP POLICY`/`DROP VIEW` de los objetos que referencian la columna directamente en su expresión (3 políticas + la vista `trabajos_vista`).
2. `ALTER TABLE ... DROP CONSTRAINT IF EXISTS <check original>` (antes del cambio de tipo).
3. `ALTER TABLE ... ALTER COLUMN ... DROP DEFAULT`.
4. `ALTER TABLE ... ALTER COLUMN ... TYPE <enum> USING <columna>::<enum>`.
5. `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT '<valor>'::<enum>`.
6. Recreación **verbatim** (mismo nombre, mismo texto de `USING`/`WITH CHECK`) de las 3 políticas + la vista.

Ningún dato existente se pierde: `USING <columna>::<enum>` reutiliza los valores de texto ya presentes en cada fila, y todos esos valores ya estaban restringidos por el CHECK original al mismo conjunto que ahora define el ENUM.

---

## 4. Tabla nueva: `trabajo_instaladores`

No existía ninguna tabla que registrara, por instalador individual, el estado de una notificación/oferta sobre un trabajo específico (el brief la pedía explícitamente como infraestructura para RLS futura). Se creó:

```sql
CREATE TABLE trabajo_instaladores (
    id              uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajo_id      uuid                        NOT NULL REFERENCES trabajos(id) ON DELETE CASCADE,
    instalador_id   uuid                        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    estado          trabajo_instalador_estado   NOT NULL DEFAULT 'notificado',
    notificado_at   timestamptz                 NOT NULL DEFAULT now(),
    updated_at      timestamptz                 NOT NULL DEFAULT now(),
    UNIQUE (trabajo_id, instalador_id)
);
```

Reutiliza el trigger genérico `set_updated_at()` ya existente desde 0001 (no se duplicó lógica). Los valores del ENUM `trabajo_instalador_estado` se mapean conceptualmente a los estados en memoria del prototipo (`job.inst[instId].state`): `notified→notificado`, `opened→abierto`, `responding→oferta_enviada`, `declined→rechazado`, mas `expirado` (nuevo).

---

## 5. Índices creados

| Índice | Tabla/columna | Nota |
|---|---|---|
| `idx_trabajos_phase` | `trabajos(phase)` | Ya existía en 0001; re-declarado de forma idempotente (`IF NOT EXISTS`) — corresponde al pedido "trabajos.estado" |
| `idx_trabajos_published` | `trabajos(published_at DESC)` | Ya existía en 0001; re-declarado — corresponde al pedido "trabajos.publicado_at" |
| `idx_trabajos_coordinador` | `trabajos(coordinador_id)` | **Nuevo** |
| `idx_trabajos_assigned_bid` | `trabajos(assigned_bid_id)` | **Nuevo** — sustituye al pedido "trabajos.instalador_asignado_id" (columna inexistente, ver sección 1) |
| `idx_bids_trabajo` | `bids(trabajo_id)` | Ya existía en 0001; re-declarado — corresponde a "ofertas.trabajo_id" |
| `idx_bids_instalador` | `bids(instalador_id)` | Ya existía en 0001; re-declarado — corresponde a "ofertas.instalador_id" |
| `idx_trabajoinst_trabajo` | `trabajo_instaladores(trabajo_id)` | **Nuevo** |
| `idx_trabajoinst_instalador` | `trabajo_instaladores(instalador_id)` | **Nuevo** |
| `idx_usuarios_empresa` | `usuarios(empresa_id)` | **Nuevo** — un solo índice cubre los 3 pedidos del brief ("coordinadores.empresa_id"/"instaladores.empresa_id"/"admins.empresa_id"), ya que las 3 son la misma columna en la tabla unificada `usuarios` |

Confirmado por consulta directa a `pg_indexes` (sección 7): los 9 índices existen, cada uno en la tabla correcta.

---

## 6. Funciones SQL creadas

| Función | Retorna | Descripción |
|---|---|---|
| `current_user_role()` | `user_role` | Rol del usuario autenticado actual (renombrada desde `current_role()`, palabra reservada de PostgreSQL — ver sección 1) |
| `current_profile()` | `uuid` | `id` de `usuarios` del usuario autenticado actual |
| `current_empresa()` | `uuid` | `empresa_id` del usuario autenticado actual |
| `is_admin()` | `boolean` | `current_user_role() = 'admin'` |
| `is_coordinator()` | `boolean` | `current_user_role() = 'coordinador'` |
| `is_installer()` | `boolean` | `current_user_role() = 'instalador'` |
| `get_my_rol()` | `text` | Ya existía en 0001; redefinida únicamente para agregar un cast explícito `rol::text` (defensivo, sin cambio de comportamiento observable) tras la conversión de `usuarios.rol` a ENUM |

Todas son `SECURITY DEFINER`, `STABLE`, y consultan `usuarios WHERE auth_id = auth.uid()` — mismo patrón que las 3 funciones ya existentes de 0001 (`get_my_rol()`, `get_my_sucursal_id()`, `get_my_usuario_id()`), que se dejaron intactas (no se eliminaron ni renombraron, siguen siendo usadas por las políticas ya aprobadas).

Confirmado por consulta directa a `pg_proc` (sección 7): las 7 funciones existen con el tipo de retorno correcto.

---

## 7. Activación de RLS y políticas

RLS ya estaba activo desde 0001 en `empresas`, `sucursales`, `usuarios`, `trabajos`, `bids` — se re-declaró `ENABLE ROW LEVEL SECURITY` de forma idempotente sobre esas 5 (sin efecto, ya estaban activas) y se activó por primera vez sobre la tabla nueva `trabajo_instaladores`.

### Políticas nuevas creadas en este Sprint

| Política | Tabla | Efecto |
|---|---|---|
| `Admin gestiona empresas (Sprint 4.0.1)` | `empresas` | `FOR ALL`, `is_admin()` — cierra un vacío real: 0001 solo tenía una política pública de SELECT (`activa = true`), ningún admin podía escribir |
| `Admin gestiona sucursales (Sprint 4.0.1)` | `sucursales` | `FOR ALL`, `is_admin()` — mismo vacío que arriba |
| `Admin gestiona trabajos (Sprint 4.0.1)` | `trabajos` | `FOR ALL`, `is_admin()` — 0001 solo daba a admin SELECT + UPDATE, sin INSERT/DELETE |
| `Admin gestiona trabajo_instaladores` | `trabajo_instaladores` | `FOR ALL`, `is_admin()` |
| `Coordinador gestiona trabajo_instaladores de su sucursal` | `trabajo_instaladores` | `FOR ALL`, scoping vía `EXISTS (... trabajos.sucursal_id = get_my_sucursal_id())` — mismo criterio de scoping por sucursal ya usado en todas las políticas existentes de coordinador |
| `Instalador ve sus propios trabajo_instaladores` | `trabajo_instaladores` | Solo `SELECT`, `is_installer() AND instalador_id = current_profile()` — de solo lectura; las transiciones de estado se consideran lógica de negocio, fuera de alcance |
| `Usuario actualiza su propio perfil (Sprint 4.0.1)` | `usuarios` | `FOR UPDATE`, `auth_id = auth.uid()` en ambos `USING`/`WITH CHECK` — cierra un vacío real: 0001 solo permitía UPDATE al admin, ningún usuario podía editar su propio perfil |

**Riesgo señalado, no resuelto en este Sprint** (política de auto-actualización de perfil): la política es a nivel de fila, no de columna — un usuario autenticado podría, en teoría, editar también columnas sensibles de su propia fila (`rol`, `empresa_id`, `activo`, `suspendido`, `rating`, `cumplimiento`, `aceptacion`) además de sus datos de contacto. Corregir esto requiere lógica adicional (un trigger que rechace cambios a columnas específicas, o una separación GRANT/REVOKE por columna) — se reporta como pendiente de decisión de producto/negocio, explícitamente fuera de alcance de "solo infraestructura" de este Sprint.

Confirmado por consulta directa a `pg_policies` y `pg_class.relrowsecurity` (ver más abajo): las 7 políticas nuevas existen sobre la tabla correcta, y RLS está activo en las 6 tablas relevantes.

---

## 8. Validación técnica realizada

Este Sprint es exclusivamente de infraestructura SQL — los comandos `npm run lint`/`typecheck`/`build`/`dev` no aplican (no tocan nada de frontend) y, de cualquier forma, siguen bloqueados en este entorno sandbox por falta de acceso de red a `registry.npmjs.org` (`node_modules/` no existe).

En su lugar, se usó un método de validación **más fuerte y directo**: se levantó una instancia real de PostgreSQL 16 en el entorno (`sudo service postgresql start`, cluster confirmado vía `pg_lsclusters`), se creó una base de datos de prueba (`handymax_test`, con un `schema auth` y una función `auth.uid()` mínimos para satisfacer la referencia a `auth.users` de 0001), y se aplicó la migración real de punta a punta:

1. `0001_initial_schema.sql` → aplicado, **0 errores**.
2. `0002_auth_roles_rls.sql` (primera ejecución) → aplicado, **0 errores**.
3. `0002_auth_roles_rls.sql` (segunda ejecución, sobre la misma base ya migrada) → aplicado, **0 errores** — confirma que la migración es completamente idempotente/re-ejecutable.

Además, se verificó el contenido real creado (no solo la ausencia de errores), contra los catálogos del sistema:

- `pg_enum`: 17 valores repartidos en los 4 ENUMs, coincidiendo exactamente con la sección 2.
- `pg_indexes`: los 9 índices de la sección 5, cada uno en la tabla correcta.
- `pg_proc`: las 7 funciones de la sección 6, con el tipo de retorno correcto.
- `pg_class.relrowsecurity`: RLS activo en las 6 tablas (`empresas`, `sucursales`, `usuarios`, `trabajos`, `bids`, `trabajo_instaladores`).
- `pg_policies`: las 7 políticas nuevas de la sección 7, cada una en la tabla correcta.
- Llamada directa a las 7 funciones (`SELECT get_my_rol(), current_user_role(), current_profile(), current_empresa(), is_admin(), is_coordinator(), is_installer();`) sin errores de ejecución.

### Problemas reales encontrados y corregidos durante esta validación

1. **Palabra reservada**: `current_role()` falló con error de sintaxis (`CURRENT_ROLE` es un pseudo-constante reservado de PostgreSQL, como `CURRENT_USER`). Corregido renombrando a `current_user_role()`.
2. **Dependencia de DDL**: `ALTER COLUMN ... TYPE` falló en las 3 columnas porque 3 políticas y 1 vista (`trabajos_vista`) las referencian directamente en su expresión. Corregido: se hace `DROP POLICY`/`DROP VIEW` antes del cambio de tipo, y se recrean idénticas después.
3. **Orden de eliminación del CHECK**: eliminar el CHECK constraint *después* del `ALTER COLUMN TYPE` producía `operator does not exist: <enum> = text` (PostgreSQL revalida el CHECK ya compilado, con literales tipados como `text`, contra el nuevo tipo de columna). Corregido invirtiendo el orden: `DROP CONSTRAINT` siempre antes del `ALTER COLUMN TYPE`.
4. **Idempotencia de `CREATE POLICY`**: al volver a ejecutar la migración completa una segunda vez, las 7 políticas nuevas fallaban con "ya existe" (`CREATE POLICY` no admite `IF NOT EXISTS` en PostgreSQL). Corregido agregando `DROP POLICY IF EXISTS` inmediatamente antes de cada una de las 7 políticas nuevas — verificado con una segunda ejecución completa, limpia, 0 errores (ver punto 3 de la lista de validación arriba).

---

## 9. Reversibilidad

El archivo `supabase/migrations/0002_auth_roles_rls.sql` incluye, en un bloque comentado al final (no se ejecuta automáticamente), el procedimiento completo de reversión en orden inverso:

1. Eliminar las 7 políticas nuevas.
2. Desactivar RLS solo en `trabajo_instaladores` (las demás tablas ya tenían RLS activo antes de este Sprint, no se desactiva).
3. Restaurar la definición original de `get_my_rol()` y eliminar las 6 funciones nuevas.
4. Eliminar los 5 índices nuevos (dejando intactos los 4 originales de 0001).
5. Eliminar la tabla `trabajo_instaladores`.
6. Revertir `bids.estado`/`trabajos.phase`/`usuarios.rol` de vuelta a `text`, restaurando los CHECK constraints originales.
7. Eliminar los 4 tipos ENUM nuevos.

**Advertencia documentada en el propio bloque de reversión**: si alguna fila ya usa los valores nuevos `expired`/`expirado` (no existentes en los CHECK originales) antes de revertir, el paso 6 fallaría al intentar volver a `text` con el CHECK original — esas filas deberían migrarse a un valor válido del conjunto original antes de ejecutar la reversión.

---

## 10. Confirmación: ningún componente React fue modificado

No se tocó ningún archivo bajo `src/` en este Sprint. Se puede verificar con:

```
git status --porcelain -- src/
```

(comando de solo lectura, permitido por la regla del proyecto de no ejecutar operaciones de git que modifiquen el repositorio). El único archivo nuevo de este Sprint es `supabase/migrations/0002_auth_roles_rls.sql`, más las actualizaciones de documentación (`ARCHITECTURE.md`, `CHANGELOG.md`, este mismo `PHASE_4.md`).

No se implementó autenticación real, ni lógica de negocio (por ejemplo, el RPC `seleccionar_instalador` sigue siendo solo una propuesta documentada en `ARCHITECTURE.md §9.5`, no implementada), ni ninguna consulta desde React — tal como exigía el brief.

---

## 11. Pendiente / próximos pasos

- Aprobación explícita del usuario sobre las desviaciones documentadas en la sección 1 (en particular: mantener `oferta_estado` en español, no crear tablas separadas por rol, sustituir "trabajos.instalador_asignado_id" por índice sobre `assigned_bid_id`).
- Decisión pendiente sobre el riesgo de la política de auto-actualización de perfil (sección 7): ¿qué columnas de `usuarios` debe poder editar un usuario sobre su propia fila?
- No avanzar a Sprint 4.0.2 hasta recibir aprobación explícita.

---

## Sprint 4.0.1 (segunda ronda) — Database Infrastructure Baseline

**Estado:** 🟡 En revisión — pendiente de aprobación explícita del usuario antes de avanzar a Sprint 4.1.

**Nota sobre numeración:** este brief llegó identificado también como "Sprint 4.0.1", con un objetivo distinto ("Database Infrastructure Baseline") al de la ronda anterior de este mismo documento ("Infraestructura de Base de Datos (Supabase)"). Se reporta la coincidencia de numeración tal cual llegó, sin renumerar nada por cuenta propia — si el usuario quería decir "Sprint 4.0.2", puede indicarlo para corregir la numeración en la próxima actualización de `docs/SPRINTS_INDEX.md`/`CHANGELOG.md`.

Este Sprint **no implementa autenticación, no modifica React, no modifica componentes**. Su único objetivo es reorganizar `supabase/` para adoptar el flujo oficial de Supabase basado en migraciones (separar estructura de datos), sin rediseñar tablas, sin cambiar nombres, tipos, relaciones, llaves foráneas, columnas, ni modificar ningún dato existente en el diseño del schema.

### 1. Decisiones tomadas y diferencias detectadas

| Punto | Decisión / hallazgo |
|---|---|
| `supabase/migrations/0001_initial_schema.sql` contenía `INSERT INTO empresas` y un bloque `DO $$ ... INSERT INTO sucursales ...` | Se extrajeron **sin cambiar su contenido** a `supabase/seed.sql` (archivo nuevo). El archivo de migración queda con únicamente sentencias estructurales. |
| `0001_initial_schema.sql` contenía 2 `SELECT` de verificación manual al final (listar tablas, verificar sucursales) | Se movieron a `supabase/README.md §3` ("Cómo verificar que una migración aplicó correctamente"), ya que `SELECT` no es una sentencia estructural permitida en una migración limpia según el brief. |
| Brief menciona mover un "Administrador inicial" al seed | **No existe** ningún `INSERT` de un usuario admin inicial en `0001_initial_schema.sql` — se revisó el archivo completo antes de escribir el seed. No se inventó ese dato sin una fuente real que lo respalde. Documentado como discrepancia en `supabase/seed.sql`; queda como decisión de producto pendiente (requeriría además un `auth.users` real vía Supabase Auth, no solo una fila en `usuarios`). |
| Brief pide documentar "CLI utilizada" en `supabase/README.md` | Este repositorio **no tiene la Supabase CLI instalada ni vinculada** (no existe `supabase/config.toml`, y este entorno de trabajo no tiene las credenciales del proyecto real `bdevkryrgmttxnlxaisd` para vincularla). Se documentó la CLI de Supabase como el flujo oficial recomendado a futuro, junto con el método manual (Dashboard → SQL Editor) que es el que efectivamente se ha usado en este proyecto hasta ahora — sin fingir que la CLI ya está configurada. Ver `supabase/README.md §2`/`§8`. |
| Invariante previa: `0001_initial_schema.sql` = "copia literal, sin modificar, verificada con `diff`" (documentada en `PROJECT_STATUS.md`/`TODO.md`/`ARCHITECTURE.md` desde Fase 2) | Este Sprint **rompe esa invariante deliberadamente**, por instrucción explícita del brief. Se corrigió la afirmación en `ARCHITECTURE.md` (árbol de proyecto §3) y en `PROJECT_STATUS.md`. `TODO.md`/`MIGRATION_STATUS.md` **no se tocaron** por no estar en la lista de archivos permitidos para esta ronda (`supabase/`, `docs/`, `ARCHITECTURE.md`, `CHANGELOG.md`, `PROJECT_STATUS.md`, `PHASE_4.md`) — quedan con la afirmación desactualizada, reportado para decisión futura. |
| Ruta `docs/PHASE_4.md` (el brief, igual que la ronda anterior, asume documentación bajo `docs/`) | Se mantiene la corrección ya establecida en la primera ronda: este archivo vive en la raíz del proyecto. |

### 2. Archivos modificados/creados en esta ronda

**Creados:**
- `supabase/seed.sql` — datos iniciales (empresa Multimax + 9 sucursales), extraídos de `0001_initial_schema.sql` sin cambios de contenido; incluye advertencia sobre el riesgo de duplicados (ver sección 4 abajo).
- `supabase/README.md` — flujo operativo completo (aplicar migraciones, ejecutar seed, crear migraciones nuevas, buenas prácticas, flujo Git, CLI utilizada, queries de verificación movidas desde `0001`).

**Modificados:**
- `supabase/migrations/0001_initial_schema.sql` — se removieron el `INSERT` de `empresas`, el bloque `DO $$` de `sucursales`, y las 2 queries `SELECT` de verificación final; se ajustó el comentario de encabezado. Cero cambios en cualquier `CREATE`/`ALTER` de estructura (mismas tablas, columnas, tipos, relaciones, FKs, constraints, índices, funciones, triggers, vista y políticas RLS que antes de esta ronda).
- `ARCHITECTURE.md` — nueva subsección `§9.8`; corrección de la línea del árbol de proyecto en `§3`.
- `CHANGELOG.md` — nueva entrada al inicio, en orden cronológico descendente.
- `PROJECT_STATUS.md` — nota de corrección sobre la invariante rota, más dos nuevas secciones de Sprint (esta ronda y, retroactivamente, la ronda anterior, que no había quedado documentada ahí).
- `PHASE_4.md` — esta misma sección.

**No modificados** (fuera de la lista de archivos permitidos en el brief de esta ronda, o simplemente fuera de alcance): cualquier archivo bajo `src/`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig*.json`, `package.json`, `TODO.md`, `MIGRATION_STATUS.md`, `docs/SPRINTS_INDEX.md`, `docs/sprints/*`.

### 3. Explicación técnica

`0001_initial_schema.sql` mezclaba, en un solo archivo, DDL de estructura con `INSERT`s de datos semilla y queries de verificación manual — un patrón común en scripts SQL "de una sola pasada" pero que no sigue el flujo de migraciones versionadas que usan Supabase/Postgres en proyectos maduros (donde cada migración debe ser aplicable de forma predecible y repetible, y los datos semilla se manejan aparte porque no son "cambios de schema"). Esta ronda separa esas dos responsabilidades sin tocar ninguna sentencia de estructura: se hizo una lectura completa del archivo, se identificaron las 2 secciones de datos (empresas, sucursales) y la sección de verificación, y se extrajeron verbatim a los archivos nuevos, dejando comentarios de trazabilidad en el lugar donde vivían antes.

### 4. Riesgos encontrados

1. **`seed.sql` no es realmente idempotente en `sucursales`** (real, verificado con PostgreSQL 16, no teórico): el `ON CONFLICT DO NOTHING` del bloque de sucursales no tiene ninguna columna de conflicto real contra la cual comparar, porque `sucursales` no tiene ningún `UNIQUE` constraint más allá de `id` (autogenerado por `gen_random_uuid()`, nunca choca). Al reejecutar `seed.sql` una segunda vez sobre la misma base, las 9 sucursales se duplicaron a 18. Este comportamiento **ya existía** en el `INSERT` original dentro de `0001_initial_schema.sql`, antes de esta ronda — no es un bug introducido aquí, solo se hizo evidente al probarlo dos veces. No se corrigió agregando un `UNIQUE` constraint nuevo porque el brief de esta ronda prohíbe modificar columnas/relaciones sin aprobación. **Recomendación pendiente de aprobación**: agregar `UNIQUE (empresa_id, nombre)` a `sucursales` en una migración futura (`0003_...`).
2. **Documentación desactualizada en `TODO.md`/`MIGRATION_STATUS.md`**: ambos afirman que `0001_initial_schema.sql` es una copia sin modificar del schema original — ya no es cierto tras esta ronda (ni tras la anterior, que ya lo había modificado para agregar ENUMs/RLS). No se corrigieron por estar fuera de la lista de archivos permitidos en este brief. Riesgo bajo (son documentos de registro histórico/checklist, no fuente de verdad operativa), pero se reporta para que el usuario decida si vale la pena corregirlos en una ronda futura.
3. **CLI de Supabase no adoptada operativamente**: se documentó el flujo oficial recomendado en `supabase/README.md`, pero no se instaló/vinculó realmente — requiere credenciales del proyecto real que este entorno no tiene, y es una acción que le corresponde al usuario ejecutar en su propia máquina.

### 5. Validación técnica realizada

Igual que en la ronda anterior: se usó la instancia real de PostgreSQL 16 del entorno de trabajo (`sudo service postgresql start`, base de prueba `handymax_test` recreada desde cero con un `schema auth` mínimo). Secuencia ejecutada y resultado:

1. `0001_initial_schema.sql` (ya limpio de datos) → aplicado, **0 errores**.
2. `supabase/seed.sql` → aplicado, **0 errores**; verificado con `SELECT` directo: 1 fila en `empresas` (Multimax), 9 filas en `sucursales` (las correctas, sin duplicados en esta primera ejecución).
3. `supabase/migrations/0002_auth_roles_rls.sql` → aplicado sobre la base ya sembrada, **0 errores** (confirma que separar los datos no rompe nada de la migración de roles/RLS de la ronda anterior).
4. `supabase/seed.sql` (segunda ejecución, prueba de idempotencia) → aplicado sin errores de SQL, pero reveló el riesgo real documentado en la sección 4.1: las sucursales pasaron de 9 a 18 filas.

`npm run lint/typecheck/build/dev` no aplican a esta ronda (cero cambios en `src/`/`package.json`/configuración de build) y siguen bloqueados en este sandbox por falta de red — no es necesario ejecutarlos porque no hay superficie de frontend afectada; se confirma esto con `git status --porcelain -- src/` (sin salida, ver sección 6).

### 6. Confirmación: ningún componente React fue modificado

```
git status --porcelain -- src/
```

No produce ninguna línea nueva atribuible a esta ronda (los cambios preexistentes bajo `src/` son de Sprints anteriores de Fase 3, ya reportados, no tocados aquí). Tampoco se modificó `vite.config.ts`, `tailwind.config.ts`, `tsconfig*.json` ni `package.json`. No se implementó autenticación ni lógica de negocio nueva — el alcance de esta ronda es exclusivamente la reorganización de `supabase/`.

### 7. Confirmación: el diseño del schema no fue rediseñado

Ninguna sentencia `CREATE TABLE`, `CREATE TYPE`, `ALTER TABLE ... ADD/DROP COLUMN`, `ALTER TABLE ... ADD CONSTRAINT`, `CREATE INDEX`, `CREATE FUNCTION`, `CREATE VIEW`, política RLS o llave foránea fue agregada, eliminada ni modificada en `0001_initial_schema.sql` durante esta ronda — se puede verificar comparando el archivo antes/después de esta ronda: la única diferencia es la ausencia de los 2 bloques `INSERT`/`DO $$` y las 2 queries `SELECT` finales, más los comentarios de trazabilidad que las reemplazan. `0002_auth_roles_rls.sql` (de la ronda anterior) tampoco se tocó en esta ronda.

### 8. Pendiente / próximos pasos

- Aprobación explícita del usuario sobre esta ronda (y, si aún no se dio, sobre la ronda anterior — ver sección "Sprint 4.0.1 — Infraestructura de Base de Datos (Supabase)" arriba en este mismo documento).
- Aclaración sobre la numeración duplicada de "Sprint 4.0.1" (¿la próxima ronda debería llamarse "4.0.2" o "4.1"? el brief de esta ronda dice explícitamente "No avanzar al Sprint 4.1", así que se asume que la numeración objetivo es `4.1`, pero se reporta para confirmación).
- Decisión pendiente sobre agregar `UNIQUE (empresa_id, nombre)` a `sucursales` (sección 4.1).
- Decisión pendiente sobre corregir `TODO.md`/`MIGRATION_STATUS.md` (sección 4.2).
- Decisión pendiente sobre instalar/vincular la Supabase CLI de forma operativa (sección 4.3) — acción del usuario, no de este entorno.
- No avanzar al Sprint 4.1 hasta recibir aprobación explícita.

---

## Sprint 4.0.1 (tercera ronda) — Reconstrucción del baseline de Supabase (confirmación del modelo oficial)

**Estado:** 🟡 En revisión — el usuario ya confirmó el modelo de datos oficial (ver punto 1); queda pendiente su aprobación final de esta ronda antes de iniciar el Sprint 4.1 (Autenticación).

### 1. El bloqueo detectado y su resolución

Este brief, con lenguaje absoluto ("prohibido cambiar nombres de tablas", "no debes crear una arquitectura distinta", "no debes reinterpretarlo"), pedía reconstruir `0001_initial_schema.sql` para que representara EXACTAMENTE un modelo con las tablas `empresas`, `tiendas`, `admins`, `coordinadores`, `instaladores`, `trabajos`, `trabajo_instaladores`, `ofertas`.

Antes de tocar cualquier archivo, siguiendo la disciplina de este proyecto (y la propia "regla final" de ese brief: "si detectas una diferencia entre el modelo aprobado y el SQL generado, no la corrijas por tu cuenta — detente y repórtala"), se verificó ese modelo contra las dos únicas fuentes SQL reales que existen en el proyecto:

- El archivo originalmente subido `handymax_supabase_schema_v3.sql` (documentado desde la Fase 2 como la fuente oficial, "copiado sin ninguna modificación... verificado con `diff`").
- `supabase/migrations/0001_initial_schema.sql`.

Un `diff` estructural completo (ignorando comentarios) entre ambos mostró que son idénticos salvo por los bloques `INSERT`/`SELECT` ya movidos a `seed.sql`/`README.md` en la ronda anterior — ninguna diferencia de tablas, columnas, tipos ni relaciones. Ninguno de los dos define `tiendas`, `admins`, `coordinadores`, `instaladores` ni `ofertas`. No existe, en ningún archivo del proyecto (subido o del repositorio), una fuente real para ese modelo alternativo.

Se detuvo la implementación (no se tocó ningún archivo) y se reportó al usuario: la diferencia encontrada, el archivo afectado (`0001_initial_schema.sql`, y en cascada `seed.sql`/`0002`/toda la documentación), el motivo (el modelo pedido no tiene ninguna fuente real que lo respalde — construirlo sería fabricar columnas/tipos/FKs, no "representar exactamente" nada), y por qué no era posible continuar sin aprobación (reescribirlo habría sido una decisión arquitectónica destructiva e irreversible, tomada unilateralmente, exactamente lo que la regla final del propio brief prohíbe).

**El usuario confirmó por escrito**: *"El modelo oficial y definitivo será el que ya existe actualmente en el repositorio... empresas, sucursales, usuarios, zonas_cobertura, trabajos, bids, notificaciones... No debes reconstruir el proyecto hacia el modelo anterior de tiendas/admins/coordinadores/instaladores/ofertas."* Esta confirmación se trata, de aquí en adelante, como la declaración oficial del modelo de datos del proyecto (documentada formalmente en `ARCHITECTURE.md §9.9`).

### 2. Qué se ejecutó en esta ronda, sobre el modelo ya confirmado

Con el modelo confirmado, se ejecutaron las partes del brief que sí aplican sin conflicto:

1. **`supabase/config.toml` (nuevo)** — completa la estructura de `supabase/` pedida (`config.toml`, `README.md`, `seed.sql`, `migrations/0001_...`, `migrations/0002_...`, sin archivos adicionales — confirmado con `ls -la supabase/ supabase/migrations/`). Escrito a mano siguiendo la convención estándar de `supabase init`, ya que la CLI real no está instalada/vinculada en este entorno (sin credenciales del proyecto real `bdevkryrgmttxnlxaisd`). Usa PostgreSQL 16 (`major_version = 16`), la misma versión usada para validar. Incluye nota de trazabilidad explícita sobre esto en el propio archivo.
2. **Validación estructural completa** (no superficial — tabla por tabla, columna por columna, tipo por tipo, FK por FK, PK por PK, índices, vistas, triggers, funciones, políticas), ver sección 3.
3. **Validación de ejecución de punta a punta** contra PostgreSQL 16 real, desde una base vacía: `0001` → `seed.sql` → `0002`, ver sección 4.
4. Documentación actualizada (únicamente en los 5 archivos permitidos por este brief): `ARCHITECTURE.md` (§9.9, nueva), `CHANGELOG.md` (nueva entrada), `PROJECT_STATUS.md` (nueva sección), `PHASE_4.md` (esta sección), `supabase/README.md` (nota sobre `config.toml` y sobre la confirmación del modelo oficial).

No se modificó ninguna sentencia `CREATE`/`ALTER` dentro de `0001_initial_schema.sql` ni de `0002_auth_roles_rls.sql` en esta ronda — ambos archivos quedan exactamente como estaban al final de la ronda anterior.

### 3. Validación estructural completa (tabla por tabla)

Ejecutada contra una base PostgreSQL 16 recién creada, con `0001` + `seed.sql` + `0002` ya aplicados (ver sección 4). Resultado: **coincide exactamente con lo documentado en `ARCHITECTURE.md §9.7`/`§9.8` — 0 diferencias.**

**Tablas (8):** `empresas`, `sucursales`, `usuarios`, `zonas_cobertura`, `trabajos`, `bids`, `notificaciones`, `trabajo_instaladores` — las 7 originales de `0001` más `trabajo_instaladores` (nueva desde `0002`). Confirmado con `\dt`.

**Columnas y tipos:** verificadas contra `information_schema.columns` para las 8 tablas — 92 columnas en total, cada una con su tipo/nullability/default esperado (destaca: `usuarios.rol` es `user_role` (antes `text`+CHECK), `trabajos.phase` es `trabajo_estado`, `bids.estado` es `oferta_estado`, `trabajo_instaladores.estado` es `trabajo_instalador_estado` — las 4 conversiones/creaciones de `0002`; el resto son `uuid`/`text`/`timestamptz`/`numeric`/`boolean`/`integer`/`date` sin cambios respecto a `0001`).

**Primary keys (8):** una por tabla, todas `id uuid`. Confirmado contra `information_schema.table_constraints`/`key_column_usage`.

**Foreign keys (15):** `sucursales.empresa_id→empresas.id` (CASCADE), `usuarios.auth_id→auth.users.id` (SET NULL), `usuarios.empresa_id→empresas.id` (CASCADE), `usuarios.sucursal_id→sucursales.id` (SET NULL), `zonas_cobertura.instalador_id→usuarios.id` (CASCADE), `trabajos.empresa_id→empresas.id`, `trabajos.sucursal_id→sucursales.id`, `trabajos.coordinador_id→usuarios.id` (las 3 sin acción), `trabajos.assigned_bid_id→bids.id` (SET NULL), `bids.trabajo_id→trabajos.id` (CASCADE), `bids.instalador_id→usuarios.id` (sin acción), `notificaciones.trabajo_id→trabajos.id` (CASCADE), `notificaciones.destinatario_id→usuarios.id` (sin acción), `trabajo_instaladores.trabajo_id→trabajos.id` (CASCADE), `trabajo_instaladores.instalador_id→usuarios.id` (CASCADE). Las 13 primeras ya existían en `0001`; las últimas 2 son de la tabla nueva de `0002`. Ninguna FK fue renombrada ni redirigida.

**Check constraints:** solo queda 1 (`notificaciones_canal_check`) — los 3 CHECK originales de `usuarios.rol`/`trabajos.phase`/`bids.estado` fueron reemplazados por los ENUMs correspondientes en `0002` (comportamiento esperado y ya documentado en §9.7, no una pérdida de validación: el tipo ENUM impone la misma restricción de valores permitidos, de forma más fuerte que un CHECK).

**Unique constraints (5):** `empresas.slug`, `usuarios.auth_id`, `zonas_cobertura(instalador_id, provincia, zona)`, `bids(trabajo_id, instalador_id)`, `trabajo_instaladores(trabajo_id, instalador_id)` — sin cambios respecto al diseño documentado.

**Índices (28 en total):** 8 PK + 5 UNIQUE (ya contados arriba, Postgres los indexa automáticamente) + 15 índices explícitos: los 10 originales de `0001` (`idx_trabajos_sucursal`, `idx_trabajos_phase`, `idx_trabajos_zona`, `idx_trabajos_published`, `idx_bids_trabajo`, `idx_bids_instalador`, `idx_bids_estado`, `idx_usuarios_rol`, `idx_usuarios_auth`, `idx_zonas_instalador`) más los 5 nuevos de `0002` (`idx_trabajos_coordinador`, `idx_trabajos_assigned_bid`, `idx_trabajoinst_trabajo`, `idx_trabajoinst_instalador`, `idx_usuarios_empresa`). Ninguno fue renombrado.

**Vistas (1):** `trabajos_vista` — recreada idéntica en `0002` tras el `DROP` temporal necesario para la conversión de `bids.estado` (ver §9.7). Mismo nombre, misma lógica de enmascarado de columnas del cliente.

**Triggers (4):** `trigger_set_bid_cierra_at` (trabajos, BEFORE INSERT, de `0001`), `trigger_trabajos_updated_at` (trabajos, BEFORE UPDATE, de `0001`), `trigger_usuarios_updated_at` (usuarios, BEFORE UPDATE, de `0001`), `trigger_trabajo_instaladores_updated_at` (trabajo_instaladores, BEFORE UPDATE, nuevo de `0002`, reutiliza `set_updated_at()`). Ninguno renombrado.

**Funciones propias (9):** `get_my_rol()`, `get_my_sucursal_id()`, `get_my_usuario_id()` (de `0001`, sin renombrar) + `current_user_role()`, `current_profile()`, `current_empresa()`, `is_admin()`, `is_coordinator()`, `is_installer()` (nuevas de `0002`) + `set_bid_cierra_at()`, `set_updated_at()` (triggers, de `0001`). (Se excluyen de este conteo las 12 funciones de la extensión `uuid-ossp`, que no son del proyecto.)

**RLS activo (8 tablas):** todas — `empresas`, `sucursales`, `usuarios`, `zonas_cobertura`, `trabajos`, `bids`, `notificaciones` (las 7 desde `0001`) + `trabajo_instaladores` (desde `0002`).

**Políticas RLS (30 en total):** 23 de `0001` (sin tocar) + 7 nuevas de `0002` (`Admin gestiona empresas (Sprint 4.0.1)`, `Admin gestiona sucursales (Sprint 4.0.1)`, `Admin gestiona trabajos (Sprint 4.0.1)`, `Admin gestiona trabajo_instaladores`, `Coordinador gestiona trabajo_instaladores de su sucursal`, `Instalador ve sus propios trabajo_instaladores`, `Usuario actualiza su propio perfil (Sprint 4.0.1)`). Ninguna política de `0001` fue eliminada permanentemente ni modificada en su lógica — las 3 que se recrean en `0002 §2.4` (`Coordinador ve instaladores de su empresa`, `Instalador ve trabajos live en su zona`, `Instalador puede hacer bid`) usan exactamente el mismo texto `USING`/`WITH CHECK` que en `0001`.

### 4. Resultado de la validación SQL (ejecución completa desde una base vacía)

Se usó PostgreSQL 16 real (no el sandbox de `tsc`/`prettier`, que no aplica a SQL): `sudo service postgresql start`, base de prueba `handymax_test` **recreada desde cero** (`DROP DATABASE IF EXISTS` + `CREATE DATABASE`), con un `schema auth`/`auth.users`/`auth.uid()` mínimos para satisfacer la única referencia externa que tiene el schema (`usuarios.auth_id → auth.users.id`).

1. `supabase/migrations/0001_initial_schema.sql` sobre la base vacía → **0 errores**.
2. `supabase/seed.sql` → **0 errores** (empresa Multimax + 9 sucursales insertadas correctamente).
3. `supabase/migrations/0002_auth_roles_rls.sql` → **0 errores**.

Resultado final: **0 errores** en las 3 aplicaciones, ejecutadas en el orden real que usaría un entorno nuevo. (La idempotencia de `0002` y el riesgo de duplicados de `seed.sql` en reejecuciones ya se habían validado y documentado en las rondas anteriores — no se repite esa prueba aquí porque no es el foco de esta ronda, que es la confirmación estructural del modelo.)

### 5. Confirmación explícita: NO hubo reinterpretación del modelo

**`supabase/migrations/0001_initial_schema.sql` es una representación exacta del modelo oficial aprobado** (el modelo confirmado por el usuario en esta ronda: `empresas`/`sucursales`/`usuarios`/`zonas_cobertura`/`trabajos`/`bids`/`notificaciones`). No se cambió ningún nombre de tabla, columna, llave foránea, relación, tipo, constraint, índice, vista ni función existente. La única "reconstrucción" que tuvo lugar en `0001` ocurrió en la ronda anterior (separar los `INSERT`/`SELECT` de verificación, ver §9.8) — en esta ronda no se tocó ninguna línea de `0001`.

### 6. Confirmación explícita: 0002 es incremental (con una tensión reportada, no resuelta unilateralmente)

`0002_auth_roles_rls.sql` agrega infraestructura de roles/autenticación (4 ENUMs, 6 funciones, 1 tabla nueva, 5 índices nuevos, 7 políticas nuevas) sin eliminar ni renombrar ningún objeto de `0001`. **Tensión detectada y reportada** (no resuelta por cuenta propia): este brief exige que `0002` sea "únicamente incremental" y prohíbe expresamente modificar columnas/tablas existentes — pero `0002` sí hace `ALTER COLUMN ... TYPE` sobre 3 columnas ya existentes (`usuarios.rol`, `trabajos.phase`, `bids.estado`, convirtiéndolas de `text`+CHECK a ENUM) y crea la tabla nueva `trabajo_instaladores`. Esto ya estaba implementado y aprobado en la primera ronda de este mismo Sprint (antes de este brief), y el usuario, en su confirmación de esta ronda, instruyó explícitamente "mantener la compatibilidad con el esquema existente" — se interpretó que el "esquema existente" ya incluye esas conversiones (no son negociables sin deshacer trabajo ya aprobado y validado). **No se revirtió ni se dividió `0002`** — se documenta esta interpretación aquí, explícitamente, para que el usuario la confirme o la corrija.

### 7. Confirmación: React no fue modificado

`git status --porcelain -- src/` no muestra ningún cambio nuevo atribuible a esta ronda. No se tocó `vite.config.ts`, `tailwind.config.ts`, `tsconfig*.json`, `package.json`, ningún componente, hook, contexto, página, ni el cliente de Supabase (`src/lib/supabase.ts` o equivalente). No se implementó autenticación real ni lógica de negocio.

### 8. Confirmación: el repositorio queda preparado para el Sprint 4.1 (Autenticación)

Con el modelo de datos confirmado como oficial (§9.9 de `ARCHITECTURE.md`), la estructura de `supabase/` completa (`config.toml`, `README.md`, `seed.sql`, `migrations/0001_...`, `migrations/0002_...`), y la infraestructura de roles/RLS ya validada (funciones `is_admin()`/`is_coordinator()`/`is_installer()`/`current_profile()`/`current_empresa()`/`current_user_role()` listas para ser consumidas desde el frontend), el proyecto tiene la base necesaria para que el Sprint 4.1 implemente el flujo real de Auth (magic link para coordinador/admin, invitación vía Edge Function para instalador, vínculo `usuarios.auth_id ↔ auth.users`, `AuthContext` real) sin necesitar más cambios de infraestructura de base de datos previos.

### 9. Pendiente / próximos pasos

- Aprobación explícita del usuario sobre esta ronda, en particular sobre la tensión reportada en la sección 6 (¿es correcto interpretar que "mantener compatibilidad con el esquema existente" incluye las conversiones ENUM de `0002`?).
- Decisiones ya pendientes de rondas anteriores, sin resolver todavía: `UNIQUE (empresa_id, nombre)` en `sucursales` (idempotencia del seed), corrección de `TODO.md`/`MIGRATION_STATUS.md`, instalación/vinculación real de la Supabase CLI, columnas auto-editables en la política de perfil propio.
- No avanzar al Sprint 4.1 hasta recibir aprobación explícita de esta ronda.

---

## Nota de corrección — el modelo confirmado arriba fue posteriormente superado

Todo lo documentado arriba en esta sección (migraciones `0001_initial_schema.sql`/`0002_auth_roles_rls.sql`, modelo `empresas`/`sucursales`/`usuarios`/`zonas_cobertura`/`trabajos`/`bids`/`notificaciones`/`trabajo_instaladores`) refleja la confirmación por escrito del usuario **en el momento de esa ronda** (2026-07-16). La Auditoría de Sincronización de Base de Datos (Sprint 4.0.2, `docs/database/DATABASE_INVENTORY.md`) y toda la infraestructura construida desde Sprint 4.1.1 en adelante confirman, contra el `pg_dump` real de Producción, que el modelo vigente hoy es el de **8 tablas** `empresas`/`tiendas`/`admins`/`coordinadores`/`instaladores`/`trabajos`/`trabajo_instaladores`/`ofertas` -- exactamente el modelo que esta sección (§ "Sprint 4.0.1 tercera ronda", punto 1) documenta como rechazado por el usuario en esa fecha. Esta sección no se reescribe (es un registro histórico válido de esa decisión, tomada con la información disponible en ese momento) -- se agrega esta nota, en vez de "corregir" retroactivamente el historial, siguiendo el mismo criterio de trazabilidad usado en toda la documentación de este proyecto. Ver `PROJECT_STATUS.md` (cabecera) y `ARCHITECTURE.md §9.9`/`§14.9` para el mismo señalamiento.

---

## Sprint 4.2.1 — Sistema de Autenticación y Experiencia de Inicio de Sesión (2026-07-21, cerrado 2026-07-22)

**Estado:** ✅ Completado — el usuario validó manualmente contra Producción y confirmó por escrito el cierre del Sprint (ver "Cierre — validación manual" más abajo). La limitación de RLS descrita originalmente abajo (bloqueante para `admin`/`coordinador`) fue resuelta por el usuario directamente en Supabase durante esa validación -- **pendiente formalizarla como migración** (ver cierre).

Primer Sprint de Fase 4 que implementa autenticación real (los anteriores fueron exclusivamente infraestructura de base de datos/tipos). Detalle técnico completo en `docs/architecture/frontend/SPRINT_4_2_1_AUTH_REPORT.md` y `ARCHITECTURE.md §14.9`; resumen:

1. **Resolución de rol/perfil real** (`src/services/profile.service.ts`, nuevo): el modelo real de 8 tablas no tiene una tabla `usuarios` unificada con columna `rol` -- el rol se determina consultando `admins`/`coordinadores`/`instaladores` por `id = auth.users.id` hasta encontrar una fila.
2. **`AuthProvider` completado** (`src/providers/AuthProvider.tsx`): expone `session`/`user`/`profile`/`login`/`logout`/`resetPassword`/`refreshSession`. El `AuthContext` legacy (`src/contexts/AuthContext.tsx`) se retiró.
3. **Rutas/guards reales**: `ProtectedRoute`/`PublicRoute` (nuevos), `/login` (público) y `/` (protegido).
4. **`LoginPage`/`AuthLayout`** (nuevos): correo/contraseña, mostrar/ocultar contraseña, "Recordar sesión" (solo recuerda el correo, no cambia la persistencia real de Supabase), recuperación de contraseña vía `supabase.auth.resetPasswordForEmail()` únicamente.
5. **`HeaderUserMenu`** reemplaza al selector manual de rol (`HeaderRoleSwitch`, eliminado).

**Limitación crítica reportada, no resuelta en esta ronda**: `admins`/`coordinadores`/`empresas`/`tiendas` tienen RLS habilitado sin policies de `SELECT` para `authenticated` (auditado desde Sprint 4.0.1/4.1.1) -- un `admin`/`coordinador` real autentica correctamente pero `resolveProfile()` no puede leer su fila (0 filas, no error) y es expulsado con "perfil no encontrado". Requiere una migración nueva (fuera del alcance de este Sprint, no fue pedida) agregando como mínimo `FOR SELECT USING (id = auth.uid())` en esas tablas.

Sin acceso a `registry.npmjs.org`/sin `node_modules/` en este entorno, igual que en toda Fase 4 -- `npm run lint`/`typecheck`/`build`/`dev` no se pudieron ejecutar aquí. Se usó una instalación global de TypeScript 6.0.3 (`tsc --noEmit`, no forma parte de las dependencias del proyecto) para verificar los 19 archivos nuevos/modificados; los únicos diagnósticos son artefactos conocidos de la falta de `node_modules` (mismo patrón verificado en archivos ya aprobados del repositorio).

### Cierre — validación manual del usuario (2026-07-22)

El usuario reportó, tras validar manualmente contra Producción, que el Sprint debe considerarse **COMPLETADO**: login vía Supabase Auth, `resolveProfile()`, lectura de `admins`, acceso al Dashboard, persistencia de sesión, logout y recarga de página manteniendo la sesión, todos validados correctamente; sin restos de código de depuración.

Los cambios que hicieron esto posible se realizaron **directamente en Supabase, fuera de este repositorio**: creación/ajuste de policies RLS, otorgamiento de `SELECT` a `authenticated`, inserción del registro real en `admins` (con `id` = el `auth.users.id` real, consistente con el diseño de `profile.service.ts` -- sin columna `auth_id` intermedia), y corrección del flujo de autenticación para usar ese usuario real. El usuario indicó explícitamente que estos cambios **no deben revertirse**.

Este entorno de trabajo verificó el proyecto recibido (`handymaxdespachosprint4.1.2authupdate.zip`) contra su propia última entrega: el código de `src/` es **idéntico**, byte a byte -- coherente con que todo lo corregido fue del lado de Supabase, no del código. Se confirmó también la ausencia de código de depuración nuevo (`console.log`/`debugger`) y se encontraron indicios razonables de una compilación local real y limpia (`tsconfig.app.tsbuildinfo` con el árbol de archivos completo del Sprint, rutas normalizadas en minúsculas -- típico de una ejecución de `tsc` en Windows/macOS -- y sin el campo `"errors"` que sí aparecía en compilaciones previas con errores reales). Detalle completo de esta verificación en `docs/architecture/frontend/SPRINT_4_2_1_AUTH_REPORT.md`.

**Pendiente explícito, por decisión del usuario**: no se generaron migraciones SQL para formalizar las policies/GRANTS/triggers creados manualmente -- el usuario pidió explícitamente no reconstruir SQL de seguridad sin poder verificarlo contra el estado real (este entorno de trabajo no tiene acceso de red al proyecto Supabase). Se hará en una ronda futura cuando el usuario exporte el SQL real (`supabase db diff --linked` o el Dashboard). **Hasta entonces, este repositorio no puede reconstruir una base de datos nueva únicamente ejecutando `supabase/migrations/`** -- las policies/GRANTS que hacen funcionar el login de `admin` hoy solo existen en el proyecto real, no en las migraciones versionadas.

### Pendiente / próximos pasos

- **Generar la(s) migración(es) SQL real(es)** de las policies RLS/GRANTS/triggers agregados manualmente en Supabase -- requiere que el usuario provea el SQL real primero (ver "Pendiente explícito" arriba).
- Validación real de `npm run lint`/`typecheck`/`build`/`dev` en el entorno del usuario (no confirmada explícitamente línea por línea, aunque los indicios del `tsbuildinfo` son consistentes con una compilación limpia).
- Pantalla de "definir nueva contraseña" para completar el flujo de recuperación.
- Pantallas reales para "Mi perfil"/"Configuración"/"Cambiar contraseña" (hoy deshabilitadas en `HeaderUserMenu`).
- Continuar con el siguiente Sprint de Fase 4 (a definir por el usuario).
