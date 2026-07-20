# supabase/README.md — Flujo oficial de base de datos (HANDYMAX · Multimax Despacho)

> Creado en **Sprint 4.0.1 (segunda ronda) — "Database Infrastructure Baseline"**, Fase 4. Documenta el flujo con el que se debe trabajar la base de datos de aquí en adelante. No reemplaza `PHASE_4.md` (que documenta las decisiones tomadas Sprint a Sprint) ni `ARCHITECTURE.md` §9/§14 (que documenta el diseño); este archivo es una guía operativa: cómo aplicar, sembrar y crear migraciones.

## 1. Qué hay en esta carpeta

```
supabase/
├── config.toml             # configuración de la Supabase CLI (ver §8 — Sprint 4.0.1, tercera ronda)
├── README.md                # este archivo
├── seed.sql                 # datos iniciales (empresa Multimax + sus 9 sucursales)
└── migrations/
    ├── 0001_initial_schema.sql     # schema base: tablas, triggers, RLS inicial, índices, vista
    └── 0002_auth_roles_rls.sql     # Fase 4, Sprint 4.0.1 (primera ronda): ENUMs, funciones, RLS ampliada
```

**Modelo de datos oficial, confirmado por el usuario (Sprint 4.0.1, tercera ronda — "Reconstrucción del baseline de Supabase"):** las 8 tablas de arriba (`empresas`/`sucursales`/`usuarios`/`zonas_cobertura`/`trabajos`/`bids`/`notificaciones`/`trabajo_instaladores`) son el modelo definitivo del proyecto. Un brief de esa ronda pidió reconstruir el schema hacia un modelo alternativo (`tiendas`/`admins`/`coordinadores`/`instaladores`/`ofertas`) que no coincide con ninguna fuente SQL real del proyecto — se reportó la discrepancia sin implementarla, y el usuario confirmó por escrito que el modelo de arriba es el oficial. Ver `ARCHITECTURE.md §9.9` y `PHASE_4.md` para la trazabilidad completa. Cualquier instrucción futura que asuma `tiendas`/`admins`/`coordinadores`/`instaladores`/`ofertas` debe leerse como una asunción a corregir, no como un rediseño a ejecutar.

Regla de contenido, vigente desde este Sprint: **una migración (`supabase/migrations/*.sql`) no debe contener datos** — ni `INSERT`, ni `UPDATE`, ni `DELETE`, ni `TRUNCATE`, ni queries de verificación (`SELECT`). Solo estructura: `CREATE TYPE`, `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, `CREATE FUNCTION`, `CREATE VIEW`, llaves foráneas/primarias, `CHECK`/otros constraints. Los datos (seed) viven en `supabase/seed.sql`, un archivo aparte que se ejecuta después de las migraciones.

## 2. Cómo aplicar las migraciones

### Método actualmente en uso en este proyecto (manual, Supabase Dashboard)

Hasta este Sprint, las migraciones de este proyecto se han aplicado manualmente, copiando y pegando cada archivo en **Supabase Dashboard → SQL Editor**, en orden numérico (`0001_...`, `0002_...`, etc.), tal como indicaba el encabezado original de `0001_initial_schema.sql`. Este método sigue siendo válido y es el que debe usarse mientras no se adopte formalmente la CLI de Supabase en este repositorio (ver más abajo):

1. Abrir el proyecto (`bdevkryrgmttxnlxaisd`) en el Dashboard de Supabase.
2. Ir a **SQL Editor**.
3. Pegar y ejecutar `supabase/migrations/0001_initial_schema.sql` completo.
4. Pegar y ejecutar `supabase/migrations/0002_auth_roles_rls.sql` completo.
5. Cualquier migración nueva (`0003_...`, etc.) se ejecuta de la misma forma, siempre en orden numérico ascendente, nunca fuera de orden.

### Método recomendado a futuro (Supabase CLI — flujo oficial)

El flujo oficial y recomendado por Supabase para proyectos versionados es la **Supabase CLI**. Este repositorio **todavía no tiene la CLI instalada ni un `supabase/config.toml`** (no se instaló en este Sprint: requiere vincular la CLI al proyecto real `bdevkryrgmttxnlxaisd` con credenciales que este entorno de trabajo no tiene, y esa vinculación es una acción operativa que le corresponde ejecutar al usuario en su propia máquina, no una reorganización de archivos). Se documenta aquí como el flujo objetivo a adoptar:

```bash
# Una sola vez por máquina de desarrollo:
npm install -g supabase          # o: brew install supabase/tap/supabase

# Una sola vez por proyecto (ya vinculado o para vincular):
supabase login
supabase link --project-ref bdevkryrgmttxnlxaisd

# Aplicar todas las migraciones pendientes contra el proyecto vinculado:
supabase db push

# Alternativa: aplicar contra una base local de desarrollo (supabase start)
supabase db reset      # recrea la base local desde cero: migrations + seed.sql
```

`supabase db reset` (entorno local) y `supabase db push` (proyecto remoto) leen automáticamente todo `supabase/migrations/*.sql` en orden, y `supabase db reset` además ejecuta `supabase/seed.sql` al final — por eso es importante que `seed.sql` sea idempotente (ver §4, advertencia sobre `sucursales`).

**Pendiente, no bloqueante para este Sprint**: correr `supabase init` (generaría `supabase/config.toml`) y `supabase link` en un entorno con acceso a las credenciales reales del proyecto, para poder empezar a usar `supabase db push`/`supabase migration up` en lugar del copy-paste manual al Dashboard.

## 3. Cómo verificar que una migración aplicó correctamente

Estas queries vivían antes al final de `0001_initial_schema.sql`; se movieron aquí porque una migración no debe contener `SELECT` (ver §1). Ejecutarlas manualmente en el SQL Editor (o vía `psql`) después de aplicar las migraciones:

```sql
-- Verificar tablas creadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar el trigger bid_cierra_at (requiere datos reales de
-- empresa/sucursal/coordinador; ajustar los <...> antes de correr)
-- INSERT INTO trabajos (empresa_id, sucursal_id, coordinador_id, tipo, zona, bid_mins)
-- VALUES ('<empresa_id>', '<sucursal_id>', '<coordinador_id>', 'Test', 'Paitilla', 10)
-- RETURNING id, published_at, bid_cierra_at;
-- bid_cierra_at debe ser published_at + 10 minutos

-- Verificar sucursales insertadas por seed.sql (deben ser 9, no más)
SELECT nombre, provincia FROM sucursales ORDER BY nombre;
```

## 4. Cómo ejecutar `seed.sql`

Ejecutar **después** de aplicar todas las migraciones pendientes, nunca antes (depende de que `empresas`/`sucursales` ya existan como tablas):

- **Dashboard**: pegar y ejecutar `supabase/seed.sql` en el SQL Editor.
- **CLI** (cuando se adopte, ver §2): `supabase db reset` lo ejecuta automáticamente en un entorno local; contra el proyecto remoto no hay un comando de "seed" dedicado — se ejecuta manualmente igual que una migración, una sola vez.

**Advertencia real, verificada en este Sprint contra una base de datos de prueba (ver `PHASE_4.md`)**: el `INSERT` de `empresas` es idempotente (`ON CONFLICT (slug) DO NOTHING`, con `slug UNIQUE`), pero el bloque de `sucursales` **no lo es de verdad** — no existe ningún `UNIQUE` constraint sobre `sucursales` más allá de `id` (autogenerado), así que el `ON CONFLICT DO NOTHING` de ese bloque no tiene ninguna columna de conflicto real contra la cual comparar, y **ejecutar `seed.sql` dos veces duplica las 9 sucursales**. Este comportamiento ya existía en el `INSERT` original (dentro de `0001_initial_schema.sql`, antes de este Sprint) — no se introdujo aquí, solo se hizo evidente al probarlo. **Recomendación, pendiente de aprobación** (no implementada, ya que este Sprint prohíbe modificar tablas/constraints): agregar `UNIQUE (empresa_id, nombre)` a `sucursales` en una migración futura. Mientras tanto: ejecutar `seed.sql` **una sola vez** por entorno, y si se necesita repetir, primero `TRUNCATE sucursales` (o borrar las filas duplicadas) manualmente.

## 5. Cómo crear una migración nueva

1. Elegir el siguiente número disponible con prefijo de 4 dígitos: `0003_<nombre_descriptivo>.sql` (después de `0002_auth_roles_rls.sql`). No reutilizar ni renumerar migraciones ya aplicadas.
2. El archivo debe contener **solo estructura** (ver §1) — si la migración necesita poblar datos, esos `INSERT` van en un archivo de seed aparte (o se agregan a `supabase/seed.sql` si son datos iniciales del mismo tipo), nunca dentro del archivo de migración.
3. Si la migración modifica una columna usada por una política RLS o una vista (`CREATE VIEW`), hay que hacer `DROP POLICY`/`DROP VIEW` antes del `ALTER`, y recrearlas idénticas después — PostgreSQL no permite `ALTER COLUMN ... TYPE` si hay una política o vista que referencia esa columna directamente. (Encontrado y documentado en Sprint 4.0.1, primera ronda — ver `PHASE_4.md`.)
4. Si la migración modifica una columna con `CHECK constraint`, el `DROP CONSTRAINT` debe ir **antes** del `ALTER COLUMN ... TYPE`, nunca después (si no, PostgreSQL revalida el `CHECK` ya compilado contra el tipo nuevo y falla). (Mismo hallazgo que el punto anterior.)
5. Si la migración agrega políticas RLS nuevas, anteponer siempre `DROP POLICY IF EXISTS "<nombre exacto>" ON <tabla>;` antes de cada `CREATE POLICY` — PostgreSQL no soporta `CREATE POLICY IF NOT EXISTS`, así que sin el `DROP` previo la migración no se puede volver a ejecutar sobre una base ya migrada.
6. Usar siempre variantes idempotentes donde el motor las soporte: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DROP ... IF EXISTS`, bloques `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` para `CREATE TYPE`. El objetivo es que cualquier migración se pueda volver a correr sobre una base ya migrada sin error.
7. Probar la migración de punta a punta contra una base de datos real antes de darla por terminada — este proyecto usa PostgreSQL 16 local (`sudo service postgresql start`, base de prueba `handymax_test`, con un `schema auth` mínimo simulado para satisfacer la referencia a `auth.users`) en lugar de (o además de) `npm run lint/typecheck/build/dev`, que no aplican a cambios puramente SQL. Ver `PHASE_4.md` para el detalle de este método.
8. Documentar la migración: actualizar `PHASE_4.md` (o el documento de fase que corresponda) y `CHANGELOG.md` con lo que la migración cambia, cualquier desviación respecto al brief que la originó, y los riesgos/decisiones pendientes de aprobación.

## 6. Buenas prácticas

- Nunca escribir sobre una migración ya aplicada en producción — los cambios posteriores van en una migración nueva, siguiendo el número siguiente.
- Nunca modificar el contenido de una migración vieja después de que fue aplicada (excepción: correcciones de organización como esta, hechas explícitamente por instrucción y documentadas con trazabilidad completa — ver la nota sobre este mismo Sprint en §7).
- Las migraciones deben ser reversibles cuando sea razonable — documentar el procedimiento de reversión en un bloque comentado al final del archivo (patrón ya usado en `0002_auth_roles_rls.sql`).
- RLS se activa por tabla explícitamente (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) — cualquier tabla nueva con datos sensibles debe activarlo en la misma migración que la crea.
- No usar `SELECT *` dentro de políticas/vistas que expongan columnas sensibles sin querer — seguir el patrón ya usado en `trabajos_vista` (enmascarar columna por columna con `CASE`).

## 7. Flujo Git

Este proyecto sigue una regla permanente: **ninguna operación de Git que modifique el repositorio (`add`/`commit`/`push`/`merge`/`rebase`/`checkout`/`switch`/`branch`/`reset`) se ejecuta por el asistente, nunca** — todo el flujo de Git (crear rama, hacer commit de una migración nueva, abrir PR, mergear) lo ejecuta el usuario manualmente, después de revisar y aprobar el Sprint correspondiente. El asistente solo usa comandos de solo lectura (`git status`, `git diff`, `git diff --stat`) para verificar el alcance exacto de los cambios antes de reportarlos.

Recomendación de flujo (a criterio del usuario, no impuesta por este documento): una rama por migración/Sprint (ej. `feature/sprint-4-0-1-db-baseline`), con el archivo de migración y su documentación (`PHASE_4.md`/`CHANGELOG.md`) en el mismo commit, revisados y aplicados manualmente contra Supabase antes de mergear a la rama principal.

## 8. CLI utilizada

**Supabase CLI** (`supabase`) es la herramienta oficial recomendada para gestionar migraciones de forma versionada (`supabase migration new <nombre>`, `supabase db push`, `supabase db reset`, `supabase db diff`). Ver §2 para el estado actual de adopción en este repositorio (todavía manual vía Dashboard; CLI documentada como flujo objetivo, pendiente de `supabase init`/`supabase link` por parte del usuario con las credenciales reales del proyecto).

Para la **validación local** de las migraciones (no para aplicarlas al proyecto real), este Sprint y el anterior (4.0.1, primera ronda) usaron **PostgreSQL 16 nativo** ya presente en el entorno de trabajo (`psql`, `pg_ctlcluster`/`service postgresql`), no la CLI de Supabase (que internamente also usa Docker + Postgres, pero no está disponible en este entorno sandbox). Ambos métodos son válidos para probar que el SQL es sintácticamente correcto y se comporta como se espera; la CLI de Supabase agrega, además, la generación de tipos TypeScript (`supabase gen types typescript`) y el manejo de Edge Functions, que quedan fuera del alcance de este Sprint.

**`supabase/config.toml` (Sprint 4.0.1, tercera ronda — "Reconstrucción del baseline de Supabase"):** se agregó este archivo para completar la estructura de `supabase/` pedida en esa ronda. Se escribió a mano, siguiendo la convención estándar y pública del archivo que genera `supabase init`, con los valores ya conocidos de este proyecto (`project_id` real, PostgreSQL 16 como versión). **No fue generado ejecutando `supabase init` real** — la CLI no está instalada ni vinculada en este entorno de trabajo (sin credenciales del proyecto real `bdevkryrgmttxnlxaisd`). Antes de usarlo para levantar un entorno local real (`supabase start`), se recomienda que el usuario corra `supabase init` en su propia máquina (con la CLI real) y compare/reemplace este archivo si difiere, especialmente los puertos (`[api]`/`[db]`/`[studio]`/`[inbucket]`), si ya usa Supabase CLI para otros proyectos en la misma máquina.

## 9. Nota sobre este Sprint (trazabilidad)

`0001_initial_schema.sql` estaba documentado en `PROJECT_STATUS.md`/`TODO.md`/`ARCHITECTURE.md` como una **copia literal y sin modificar** de `handymax_supabase_schema_v3.sql` (verificada con `diff`, idéntica byte a byte) desde la Fase 2 del proyecto. Este Sprint **rompe deliberadamente esa invariante**, por instrucción explícita del brief de "Database Infrastructure Baseline": se removieron los `INSERT`/bloque `DO $$` de datos y las queries de verificación, dejando el archivo como una migración de solo-estructura. `PROJECT_STATUS.md` y `ARCHITECTURE.md` se actualizaron en este mismo Sprint para reflejar este cambio (ver `PHASE_4.md` para el detalle completo). `TODO.md`/`MIGRATION_STATUS.md` también contienen la afirmación ahora desactualizada ("copiado sin modificar, verificado con `diff`") pero **no se tocaron**, porque no están en la lista de archivos permitidos para esta ronda (`supabase/`, `docs/`, `ARCHITECTURE.md`, `CHANGELOG.md`, `PROJECT_STATUS.md`, `PHASE_4.md`) — se reporta esta inconsistencia pendiente para que el usuario decida si corregirla en una ronda futura.

## 10. Nota sobre la tercera ronda de Sprint 4.0.1 — confirmación del modelo oficial

Un brief posterior ("Reconstrucción del baseline de Supabase") pidió reconstruir `0001_initial_schema.sql` hacia un modelo distinto (`empresas`/`tiendas`/`admins`/`coordinadores`/`instaladores`/`trabajos`/`trabajo_instaladores`/`ofertas`). Se verificó ese modelo contra las dos únicas fuentes SQL reales del proyecto (`handymax_supabase_schema_v3.sql` original y `0001_initial_schema.sql`, idénticos entre sí en estructura) y ninguna lo respalda. Se reportó la discrepancia sin implementarla, y el usuario confirmó por escrito que el modelo oficial y definitivo es el ya implementado (`empresas`/`sucursales`/`usuarios`/`zonas_cobertura`/`trabajos`/`bids`/`notificaciones`/`trabajo_instaladores`). Ver `ARCHITECTURE.md §9.9` para la declaración formal y `PHASE_4.md` para la trazabilidad completa de este intercambio. En esa misma ronda se agregó `config.toml` (§8) y se realizó una validación estructural completa (tabla por tabla, columna por columna, FK por FK, índices, vistas, triggers, funciones, políticas) contra PostgreSQL 16 real — 0 errores, 0 diferencias respecto a lo documentado.
