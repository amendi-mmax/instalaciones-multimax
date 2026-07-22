# HANDYMAX · Multimax Despacho

Plataforma de despacho de instaladores para Multimax — reconstrucción en producción (React + TypeScript + Vite + Supabase) del prototipo `Multimax_Despacho_v1.3.html`.

> Este archivo no existía antes del Sprint 4.1.1 ("Supabase Infrastructure Integration") -- se crea en este Sprint porque su Fase 9 pide "actualizar README.md" entre los documentos a mantener; al no existir, se crea desde cero en vez de reportarse como discrepancia (es un README estándar de proyecto, no una fuente de verdad técnica en disputa).

## Documentación del proyecto

Este README es un punto de entrada rápido. Para el detalle real, ver:

- **`ARCHITECTURE.md`** — arquitectura completa, stack, decisiones, plan de migración del HTML, y (§14) la infraestructura Supabase de este Sprint.
- **`PROJECT_STATUS.md`** — estado Sprint a Sprint, qué falta, problemas abiertos.
- **`MIGRATION_STATUS.md`** — seguimiento exclusivo de la reconstrucción HTML→React (cobertura por pantalla/componente).
- **`CHANGELOG.md`** — registro cronológico de cambios.
- **`docs/database/`** — auditoría completa del esquema real de Producción (`DATABASE_INVENTORY.md`, `DATABASE_DIFF.md`, `DATABASE_SYNC_PLAN.md`).
- **`docs/frontend/`** — auditoría de compatibilidad del frontend contra ese esquema (`FRONTEND_AUDIT.md`, `FRONTEND_DIFF.md`, `FRONTEND_COMPATIBILITY_MATRIX.md`, `FRONTEND_SYNC_PLAN.md`, `FRONTEND_IMPACT_REPORT.md`).
- **`supabase/README.md`** — flujo operativo de migraciones/seed de base de datos.

## Stack

React 18 + TypeScript + Vite, Tailwind CSS, Radix UI (primitivos accesibles), TanStack Query, React Router, Supabase (`@supabase/supabase-js`). Ver `ARCHITECTURE.md §2` para el detalle y justificación de cada elección.

## Esquema oficial de base de datos

**Baseline oficial**: `supabase/migrations/0001_initial_schema.sql` — un `pg_dump` real exportado directamente desde el proyecto de Producción (PostgreSQL 17.6). Las 8 tablas reales son `empresas`, `tiendas`, `admins`, `coordinadores`, `instaladores`, `trabajos`, `trabajo_instaladores`, `ofertas` — ver `docs/database/DATABASE_INVENTORY.md` para el inventario completo (columnas, FKs, índices, RLS, funciones).

Los archivos bajo `supabase/migrations/legacy/` documentan un modelo de datos anterior, ya no vigente — se conservan únicamente como referencia histórica (ver `ARCHITECTURE.md §14.1` y `docs/database/DATABASE_SYNC_PLAN.md` para la trazabilidad completa de por qué existen dos modelos).

## Puesta en marcha local

```bash
npm install
cp .env.example .env
# completar VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env
# (ver .env.example para el detalle de qué variable va en cada lugar y por qué)
npm run dev
```

Scripts disponibles (`package.json`):

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | `tsc -b` + build de producción |
| `npm run typecheck` | Solo chequeo de tipos, sin emitir (`tsc -b --noEmit`) |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run preview` | Sirve el build de producción localmente |

### Generar los tipos de base de datos

Este proyecto tipa todo su acceso a Supabase contra `src/types/database.generated.ts`, generado automáticamente con la Supabase CLI (nunca escrito a mano — ver `ARCHITECTURE.md §14.3`/`§14.8` y `src/types/README.md`, única fuente de verdad sobre esta convención):

```bash
npm install -g supabase   # una sola vez por máquina
supabase login
supabase link --project-ref bdevkryrgmttxnlxaisd
supabase gen types typescript --linked --schema public > src/types/database.generated.ts
```

Ya generado (Sprint 4.1.1B, 2026-07-21) contra el proyecto real de Producción -- si se regenera, `git diff` sobre este archivo antes de commitear, ya que un cambio de esquema real (columna nueva, función RPC nueva) puede requerir ajustes en `src/services/database.service.ts`/`src/repositories/`.

## Estado del proyecto

Fase 3 (reconstrucción visual del HTML, Sprints 3.1–3.16) completa. Fase 4 (backend) en curso: base de datos auditada y confirmada contra Producción real (Sprint 4.0.1), frontend auditado contra ese esquema (Sprint 4.0.2), infraestructura Supabase implementada offline (Sprint 4.1.1, Fase A), estabilizada tras errores reales de `tsc`/`eslint` (Sprint 4.1.1C), adaptada al SDK oficial con `database.generated.ts` real (Sprint 4.1.1B), con la capa de datos convertida a repositorios explícitos por tabla sin CRUD genérico (Sprint 4.1.1C, segunda ronda), y con autenticación real de punta a punta (login, sesión, resolución de rol/perfil, recuperación de contraseña, rutas protegidas — Sprint 4.2.1, **✅ Completado** tras validación manual del usuario, 2026-07-22) — pendiente de que el usuario ejecute `npm run lint`/`typecheck`/`build`/`dev` en verde en su propio entorno y reporte el resultado (este entorno de trabajo no tiene acceso de red ni `node_modules/` para ejecutarlos).

**Limitación conocida — pendiente de formalizar como migración** (Sprint 4.2.1): `admins`/`coordinadores`/`empresas`/`tiendas` tenían RLS habilitado sin policies de `SELECT` para `authenticated`, lo que bloqueaba el login de `admin`/`coordinador` de punta a punta contra Producción. El usuario **ya resolvió esto manualmente en Supabase** (policies RLS ajustadas, `GRANT SELECT` a `authenticated`, registro correspondiente insertado en `admins`) y validó el flujo completo — ver `docs/architecture/frontend/SPRINT_4_2_1_AUTH_REPORT.md §12`. Punto pendiente: el repositorio todavía **no** puede reconstruir esas policies/GRANTs ejecutando únicamente sus migraciones (`supabase/migrations/`); esa migración de seguridad (RLS/GRANT/Policies/triggers) se generará en un próximo round cuando el usuario exporte el SQL real del proyecto (`supabase db diff --linked` o export del Dashboard). No se generó SQL inventado para esto.

Ver `PROJECT_STATUS.md` para el detalle Sprint a Sprint.

## Reglas del proyecto (permanentes)

- Ningún flujo de Git que modifique el repositorio (`add`/`commit`/`push`/`merge`/`rebase`/`checkout`/`switch`/`branch`/`reset`) se ejecuta de forma automatizada -- todo el flujo de Git lo ejecuta el usuario manualmente.
- Ninguna migración de base de datos se crea/modifica sin aprobación explícita, documentada con trazabilidad completa en `PHASE_4.md`/`CHANGELOG.md`.
- El esquema oficial es el de Producción (`supabase/migrations/0001_initial_schema.sql`) -- ningún código nuevo debe asumir el modelo legacy (`usuarios`/`sucursales`/`bids`/`zonas_cobertura`/`notificaciones`).
