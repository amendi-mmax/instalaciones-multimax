# DATABASE_SYNC_PLAN.md — Plan de Sincronización de Base de Datos

**Contexto**: esta auditoría (Sprint 4.0.1 — "HANDYMAX Database Synchronization Audit") confirmó que el modelo "legacy" (`usuarios`/`sucursales`/`bids`/`zonas_cobertura`/`notificaciones`, con el que se construyeron las rondas previas de Sprint 4.0.1, incluyendo `0002_auth_roles_rls.sql`) y el modelo real de Producción (`admins`/`coordinadores`/`instaladores`/`tiendas`/`ofertas`, obtenido vía `pg_dump` directo de Producción, PostgreSQL 17.6) son **estructuralmente incompatibles en casi su totalidad**. Este documento decide y justifica la estrategia a seguir de aquí en adelante.

---

## 1. Las dos estrategias posibles

### Estrategia A — Mantener legacy + migraciones incrementales

Consistiría en conservar `0001_initial_schema_legacy.sql`/`0002_auth_roles_rls_legacy.sql` como base, y escribir nuevas migraciones incrementales (`0003_...`, `0004_...`) que fueran transformando ese modelo legacy hasta convertirlo, paso a paso, en el modelo real de Producción: renombrar `usuarios` en tres tablas separadas, renombrar columnas, eliminar ENUMs/CHECKs, reescribir todas las funciones y policies, etc.

### Estrategia B — Nueva línea base (baseline) a partir del esquema real de Producción

Consistiría en descartar el uso del legacy como punto de partida activo (conservándolo únicamente como archivo histórico en `supabase/migrations/legacy/`, tal como ya se hizo en esta misma ronda), y adoptar `0001_initial_schema.sql` (el `pg_dump` real) como la única línea base oficial, futuras migraciones (`0002_...`, `0003_...`) partiendo de este esquema real y no del legacy.

---

## 2. Justificación técnica de la decisión

Los datos recogidos en `DATABASE_DIFF.md` y `DATABASE_INVENTORY.md` muestran que la distancia entre ambos modelos no es incremental, sino una reestructuración casi total:

1. **0 de 8 tablas de Producción son idénticas byte-a-byte a ninguna tabla legacy.** Incluso `trabajos`, que existe con el mismo nombre en ambos modelos, tiene columnas renombradas (`sucursal_id→tienda_id`, `phase→estado`, `published_at→publicado_at`), columnas nuevas (`codigo`, `fecha`, `hora`, `extra`, `urgente`, `asignado_at`, `contacto_visible_hasta`) y una columna eliminada (`updated_at`).
2. **5 de las 8 tablas legacy no existen en absoluto en Producción** (`usuarios`, `sucursales`, `bids`, `zonas_cobertura`, `notificaciones`), sustituidas por un conjunto distinto de tablas (`admins`, `coordinadores`, `instaladores`, `tiendas`) cuya correspondencia no es 1:1 sino una redistribución completa de responsabilidades (una tabla `usuarios` con discriminador `rol` se convirtió en 3 tablas físicamente separadas).
3. **9 de las 11 funciones legacy no existen en Producción.** Las funciones de ayuda `SECURITY DEFINER` (`current_user_role()`, `is_admin()`, `is_coordinator()`, `is_installer()`, etc.) fueron reemplazadas por un patrón de RLS completamente distinto basado en subqueries correlacionadas directas contra `coordinadores`/`instaladores`, sin capa de funciones de abstracción de rol.
4. **Las 14 políticas RLS de Producción no tienen ninguna correspondencia textual con las de legacy** — no se trata de policies renombradas, sino de un diseño de seguridad distinto (sin funciones auxiliares, con subqueries inline, y con 4 tablas completamente huérfanas de policies).
5. **Toda la validación de vocabulario a nivel de base de datos desapareció**: los 4 ENUMs y los 3 CHECK constraints de legacy no tienen equivalente en Producción, donde los campos de estado/rol son `text` libre.

Con esta magnitud de diferencias, escribir migraciones incrementales que transformen legacy en Producción (Estrategia A) implicaría, en la práctica, reescribir efectivamente el 100% del esquema mediante una larga cadena de `ALTER TABLE RENAME`/`DROP`/`CREATE`, lo cual no aporta ninguna ventaja real sobre partir directamente del esquema ya vigente en Producción, y además introduce un riesgo adicional: cualquier error de traducción columna-por-columna en esa cadena de migraciones incrementales podría dejar el entorno de desarrollo/staging en un estado que no es ni legacy ni Producción, sino un híbrido inconsistente.

Adicionalmente, Producción **ya existe y ya está en uso** (es el resultado de un `pg_dump` real, no un diseño propuesto) — no se trata de decidir hacia qué modelo migrar en el futuro, sino de reconocer cuál es el modelo que ya gobierna el sistema real hoy. Tratar el legacy como base activa implicaría mantener migraciones que describen un sistema que ya no existe.

---

## 3. Decisión: **Estrategia B — Nueva línea base a partir del esquema real de Producción**

Se recomienda adoptar el `pg_dump` real (`0001_initial_schema.sql` tal como fue subido en esta ronda) como la única línea base activa del proyecto, manteniendo los archivos legacy exclusivamente como referencia histórica archivada en `supabase/migrations/legacy/` (ya realizado), sin que participen en la cadena de migraciones futura.

Esta decisión **no se ejecuta en este Sprint** — conforme a la restricción explícita "IMPORTANTE: no crear migraciones todavía" del brief de esta auditoría, este documento se limita a recomendar y justificar la estrategia. La creación de la migración `0002_...` real (roles, RLS adicional si hiciera falta, corrección de los 3 riesgos detectados) queda para un Sprint posterior, una vez el usuario confirme esta decisión.

---

## 4. Riesgos a resolver antes de continuar (heredados de `DATABASE_DIFF.md`)

Independientemente de la estrategia elegida, existen 3 hallazgos de la auditoría que representan riesgo real en Producción y que deberían abordarse en la primera migración incremental que se escriba sobre la nueva línea base:

1. **4 tablas sin ninguna policy RLS** (`admins`, `coordinadores`, `empresas`, `tiendas`) — actualmente inaccesibles para `anon`/`authenticated`. Debe decidirse si esto es intencional (acceso exclusivo vía `service_role`/backend) o si faltan policies por escribir.
2. **Ausencia total de CHECK/ENUM** sobre columnas de estado y rol (`trabajos.estado`, `trabajo_instaladores.estado`, `coordinadores.rol`) — cualquier valor de texto es aceptado por la base de datos; la integridad de vocabulario depende enteramente de la disciplina del código de aplicación.
3. **Ambigüedad del concepto "admin"**: existe una tabla `admins` y, en paralelo, `coordinadores.rol = 'admin'` referenciado directamente en la policy de `trabajos`. Debe aclararse si son dos mecanismos de administración distintos y deliberados, o si uno de los dos es vestigial.

---

## 5. Próximos pasos sugeridos (fuera del alcance de este Sprint de auditoría)

1. El usuario confirma (o corrige) la Estrategia B como decisión oficial.
2. Se diseña una nueva migración base (`0001_...` ya existe tal cual el dump, o se re-empaqueta como primera migración oficial) más una migración incremental (`0002_...`) que resuelva específicamente los 3 riesgos de la sección 4 — sin alterar nombres de tablas/columnas ya vigentes en Producción.
3. Se audita el código frontend (servicios/tipos TypeScript) generado en Fase 3 contra el esquema real de Producción, dado que probablemente fue construido asumiendo el modelo legacy — este trabajo queda fuera del alcance de esta auditoría (que es exclusivamente de base de datos) y debería ser su propio Sprint.
4. Solo después de (2) y (3), se retoma la construcción de `seed.sql` con datos de prueba coherentes con el modelo real.
