# `src/types/` — tipos y fuente única de verdad de Supabase

Este documento existe para satisfacer el requisito obligatorio del Sprint 4.1.1C ("Sprint 4.1.1C - Supabase Infrastructure Stabilization"), problema #1: dejar establecida, en un único lugar, la ubicación definitiva del tipado generado por Supabase, antes de que ningún archivo lo importe.

## Ubicación definitiva del tipado generado

```
src/types/database.generated.ts
```

Esta es la **única** ubicación aprobada. Todo el código de este proyecto que necesite el tipo `Database` (servicios, repositorios, providers, hooks, `lib/supabase/`) debe importarlo exclusivamente así:

```ts
import type { Database } from '@/types/database.generated';
```

No existen ni deben crearse archivos alternativos como `database.types.ts` o `supabase.types.ts`. Se verificó (Sprint 4.1.1C) que ningún archivo del proyecto define un tipo alternativo con ese propósito — los únicos archivos hoy presentes en `src/types/` son:

| Archivo | Origen | Rol |
|---|---|---|
| `database.generated.ts` | Generado con el comando oficial (ver abajo) por el usuario en su entorno local, Sprint 4.1.1B (2026-07-21). Real -- ver "Estado actual" más abajo para la evidencia de autenticidad. | Fuente única de verdad del esquema real de Producción. Nunca editado a mano. |
| `database.ts` | Manual, Fase 3 (legacy) | Tipos manuales tipados contra el modelo legacy (`usuarios`/`sucursales`/etc.) — huérfano, sin importadores reales (ver `docs/frontend/FRONTEND_AUDIT.md`). No se relaciona con `database.generated.ts`; no se modifica en este Sprint. |
| `domain.ts` | Manual | DTOs/tipos de dominio de la UI (Fase 3) — capa de personalización, no generada. |
| `enums.ts` | Manual | Enumeraciones de UI (Fase 3) — capa de personalización, no generada. |

## Comando oficial de generación

```bash
supabase gen types typescript --linked --schema public > src/types/database.generated.ts
```

Ejecutado por el usuario en su entorno local (Fase B / Sprint 4.1.1C), con el proyecto ya vinculado (`supabase link --project-ref bdevkryrgmttxnlxaisd`). Este comando es la **única** forma admitida de producir este archivo:

- No se copia manualmente su contenido.
- No se edita el archivo generado a mano bajo ningún concepto.
- No se reemplaza por una versión "aproximada" escrita por Claude Code.

## Motivo de esta ubicación

- Es la ubicación que ya documentaba `ARCHITECTURE.md §14.3` y `README.md` desde Sprint 4.1.1 (Fase A) — no se introduce una ubicación nueva en 4.1.1C, se ratifica la existente.
- Vive junto a los demás archivos de `src/types/` por convención del proyecto (todo tipo compartido de la aplicación vive ahí), sin mezclarse con `src/lib/supabase/` (que es infraestructura/lógica, no definiciones de tipos).
- `GENERATED_TYPES_PATH` en `src/lib/supabase/config.ts` documenta esta misma ruta en código, para que quede trazable desde la infraestructura que la consume.

## Confirmación — sin duplicados

Se verificó (Sprint 4.1.1C) que no existe ningún otro archivo de tipos generados/derivados de Supabase en el repositorio (ni `database.types.ts`, ni `supabase.types.ts`, ni copias bajo otro nombre). El único artefacto pendiente es `database.generated.ts` en la ruta indicada arriba.

## Confirmación — imports consistentes

Todos los módulos de `src/lib/supabase/`, `src/services/`, `src/providers/`, `src/hooks/` que necesitan `Database` lo importan con la misma forma exacta:

```ts
import type { Database } from '@/types/database.generated';
```

Ver el detalle archivo por archivo en `docs/architecture/frontend/SPRINT_4_1_1C_REPORT.md`, sección 4.

## Estado actual (honesto)

`database.generated.ts` **existe desde Sprint 4.1.1B** (2026-07-21) -- el usuario lo adjuntó como parte de un ZIP con el estado real de su entorno local tras `npm install`/`supabase link`/`supabase gen types`. Este entorno de trabajo (Claude Code) no generó el archivo (sigue sin acceso de red a `supabase.com`/registries, re-confirmado en Sprint 4.1.1B — ver `ARCHITECTURE.md §14.1`/`§14.8`), pero sí lo auditó por contenido. Evidencia de que es real y no aproximado/fabricado:

- Tiene la forma exacta que genera hoy la Supabase CLI real (`__InternalSupabase.PostgrestVersion`, `Constants`, los tipos utilitarios `Tables`/`TablesInsert`/`TablesUpdate`/`Enums`/`CompositeTypes`), no algo que se pudiera reconstruir a mano de forma plausible.
- Coincide exactamente, tabla por tabla y columna por columna, con `docs/database/DATABASE_INVENTORY.md` (auditado en Sprint 4.0.1 a partir de un `pg_dump` real independiente).
- `supabase/.temp/rest-version` (`v14.5`) coincide con `__InternalSupabase.PostgrestVersion: "14.5"` dentro del propio archivo, y `supabase/.temp/postgres-version` (`17.6.1.127`) coincide con el PostgreSQL 17.6 ya confirmado en Sprint 4.0.1 -- dos fuentes independientes del mismo `supabase link` real, consistentes entre sí.

Sigue sin poder ejecutarse `npm run lint`/`typecheck`/`build` en este entorno de trabajo (sin `node_modules/`, sin acceso de red) -- la validación real en verde de todo el código que consume este archivo queda a cargo del usuario, en su propio entorno.
