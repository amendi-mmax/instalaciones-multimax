# Sprint 4.1.1C — Supabase Infrastructure Stabilization

**Fecha**: 2026-07-20
**Tipo**: estabilización (sin features nuevas, sin lógica de negocio, sin cambios de UI/HTML, sin migraciones/esquema).
**Alcance**: `src/lib/supabase/`, `src/providers/`, `src/hooks/`, `src/services/` (solo los archivos con errores reportados), `src/types/README.md` (nuevo), documentación de arquitectura/estado.

---

## 1. Archivos modificados

### Modificados

| Archivo | Motivo |
|---|---|
| `src/lib/supabase/client.ts` | Eliminado `eslint-disable-next-line import/no-unresolved`; JSDoc reescrito. |
| `src/lib/supabase/server.ts` | Eliminado `eslint-disable-next-line import/no-unresolved`; agregado `/// <reference types="node" />`; JSDoc ampliado documentando la decisión Node-vs-Vite. |
| `src/lib/supabase/realtime.ts` | `removeRealtimeChannel` ahora devuelve el tipo oficial `RealtimeRemoveChannelResponse` de `@supabase/supabase-js` en vez de `Promise<'ok' \| 'error'>`. |
| `src/lib/supabase/config.ts` | Comentario de `GENERATED_TYPES_PATH` actualizado: comando oficial con `--schema public`, referencia a `src/types/README.md`. |
| `src/providers/SupabaseProvider.tsx` | Ya no exporta `useSupabaseContext` — solo el componente `SupabaseProvider` (+ `SupabaseProviderProps`). El `Context` se movió a `supabase.context.ts`. |
| `src/providers/SessionProvider.tsx` | Ya no exporta `useSessionContext` ni `SessionContextValue` — solo el componente (+ `SessionProviderProps`). `Context`/`SessionContextValue` se movieron a `session.context.ts`. |
| `src/providers/AuthProvider.tsx` | Ya no exporta `useAuthContext` ni `AuthContextValue` — solo el componente (+ `AuthProviderProps`). `Context`/`AuthContextValue` se movieron a `auth.context.ts`. `AuthProviderInner` ahora lee `SessionContext` directamente (`useContext`), no `useSessionContext()`, para no depender de `hooks/` desde `providers/`. |
| `src/providers/index.ts` | Barrel actualizado: ya no re-exporta los hooks removidos de los `.tsx`; agrega re-exportación de `SessionContextValue`/`AuthContextValue` desde los nuevos archivos `.context.ts`. |
| `src/services/supabase.service.ts` | Eliminado `eslint-disable-next-line import/no-unresolved`. |
| `src/services/database.service.ts` | Eliminado `eslint-disable-next-line import/no-unresolved`; comentario del JSDoc actualizado. |
| `src/hooks/useSupabase.ts` | Reescrito: absorbe directamente la lógica de `useContext(SupabaseContext)` + chequeo de `null` (antes delegaba a `useSupabaseContext()`, removido de `SupabaseProvider.tsx`). |
| `src/hooks/useSession.ts` | Reescrito: absorbe directamente la lógica de `useContext(SessionContext)` + chequeo de `null`. |
| `src/hooks/useAuth.ts` | Reescrito: absorbe directamente la lógica de `useContext(AuthContext)` + chequeo de `null`. |
| `README.md` | Comando de generación de tipos actualizado con `--schema public`; referencia agregada a `src/types/README.md`. |
| `ARCHITECTURE.md` | Nueva sección `§14.7` documentando este Sprint. |
| `PROJECT_STATUS.md` | Nueva sección "Fase 4 — Sprint 4.1.1C"; nuevo ítem en "Qué falta" sobre `database.generated.ts`. |
| `MIGRATION_STATUS.md` | Nueva nota de alcance en `§0` (mismo criterio que la de Sprint 4.1.1: cero cambio de cobertura HTML). |

### Creados

| Archivo | Motivo |
|---|---|
| `src/providers/supabase.context.ts` | Objeto `Context` crudo de Supabase, extraído de `SupabaseProvider.tsx`. |
| `src/providers/session.context.ts` | Objeto `Context` crudo + `SessionContextValue`, extraídos de `SessionProvider.tsx`. |
| `src/providers/auth.context.ts` | Objeto `Context` crudo + `AuthContextValue`, extraídos de `AuthProvider.tsx`. |
| `src/types/README.md` | Documentación formal de la fuente única de verdad del tipado generado (requisito obligatorio del problema #1). |
| `docs/architecture/frontend/SPRINT_4_1_1C_REPORT.md` | Este informe. |

### No modificados (fuera del alcance de errores reportados, confirmado por lectura)

`src/repositories/*` (9 archivos), `src/services/auth.service.ts`, `src/services/index.ts`, `src/hooks/useRealtime.ts` (su único `eslint-disable-next-line react-hooks/exhaustive-deps` es legítimo — `eslint-plugin-react-hooks` sí está configurado — se mantiene sin cambios), `src/hooks/index.ts`, `src/providers/AppProviders.tsx` (no exportaba ningún hook, no generaba warning), `.env.example`, `supabase/*`, `src/supabase/client.ts` (legacy), `src/contexts/AuthContext.tsx` (legacy), `eslint.config.js`, `tsconfig.app.json` (deliberadamente no tocado — ver §3.3).

---

## 2. Errores corregidos (clasificados)

### TypeScript

- **`Cannot find module '@/types/database.generated'`** (múltiples archivos): no se "corrige" en el sentido de generar el archivo (fuera de alcance de este entorno — ver §6) — se ratifica que la ubicación/forma de import ya era correcta desde Fase A y se documenta formalmente en `src/types/README.md`.
- **`process.env` no resuelve en `server.ts`**: corregido con `/// <reference types="node" />`.
- **Tipo de retorno incompleto en `removeRealtimeChannel`**: corregido usando `RealtimeRemoveChannelResponse`.

### ESLint

- **"Definition for rule 'import/no-unresolved' was not found"** (6 ocurrencias: `client.ts`, `server.ts`, `SupabaseProvider.tsx`, `supabase.service.ts`, `database.service.ts`, `useSupabase.ts`): corregido eliminando los 6 comentarios `eslint-disable-next-line import/no-unresolved` — la regla no forma parte de la configuración aprobada del proyecto (`eslint-plugin-import` no está instalado ni declarado en `eslint.config.js`).
- **Warnings de `react-refresh/only-export-components`** (3 archivos: `SupabaseProvider.tsx`, `SessionProvider.tsx`, `AuthProvider.tsx`): corregido extrayendo cada `Context` a un archivo `.ts` propio y moviendo los hooks internos a `src/hooks/`.

### Supabase

- Incompatibilidad de tipo en `removeChannel` — ver TypeScript arriba (es la misma corrección, categorizada también acá porque el problema es específico de la API de Realtime del SDK).

### Arquitectura

- Ninguna corrección de esta ronda cambia arquitectura, nombres públicos de API relevantes para consumidores externos, ni agrega dependencias nuevas. El único ajuste "estructural" es puramente interno a `providers/`+`hooks/` (dónde vive cada `Context` vs. cada hook), sin cambiar la forma en que un componente de aplicación consume `useSupabase()`/`useSession()`/`useAuth()` — sus firmas públicas son idénticas a las de Fase A.

---

## 3. Cambios realizados (explicación técnica)

### 3.1 Eliminación de `eslint-disable-next-line import/no-unresolved`

Se leyó `eslint.config.js` completo y se confirmó que no incluye `eslint-plugin-import` en ningún bloque (`plugins: { 'react-hooks', 'react-refresh' }` únicamente). Un comentario `eslint-disable` que referencia una regla no registrada en la configuración activa produce el error real reportado por el usuario ("Definition for rule ... was not found"), no un warning silenciado correctamente. Conforme al propio árbol de decisión del brief ("si la regla no es parte de la arquitectura aprobada: eliminarla"), la corrección es remover el comentario, no instalar el plugin — instalarlo habría sido agregar una dependencia nueva no solicitada, fuera de alcance de una Sprint de estabilización. Sin ese comentario, si `database.generated.ts` no existe, el error aparece correctamente en `tsc` (`Cannot find module`) y no en ESLint — ese es el comportamiento esperado y ya documentado desde Fase A.

### 3.2 `RealtimeRemoveChannelResponse`

`SupabaseClient.removeChannel()` en `@supabase/supabase-js` v2 devuelve `Promise<RealtimeRemoveChannelResponse>`, un tipo exportado por la librería. El código de Fase A declaraba manualmente `Promise<'ok' | 'error'>`, un subconjunto incompleto (falta el caso `'timed out'`), lo que produce un error real de asignación de tipos contra la firma real de `removeChannel`. Se corrigió importando `RealtimeRemoveChannelResponse` desde `@supabase/supabase-js` y usándolo como tipo de retorno de `removeRealtimeChannel`, en vez de mantener una redeclaración manual que puede desincronizarse de la API real de la librería instalada.

### 3.3 `process.env` en `server.ts`

Se verificó primero si `server.ts` pertenece realmente a un entorno servidor: sí — nunca lo importa ningún componente/hook/provider, no pasa por el bundle de Vite, y su propio JSDoc (desde Fase A) ya documentaba esta separación. El error de tipos no era arquitectónico sino de configuración de TypeScript: `tsconfig.app.json` define `"types": []`, que excluye deliberadamente **todos** los paquetes de tipos ambientales globalmente instalados (incluido `@types/node`) de todo lo que compila bajo `include: ["src"]` — esto es intencional para que APIs de Node (`process`, `Buffer`, `require`) no se filtren accidentalmente al código de navegador. Como `server.ts` es la única excepción real dentro de `src/` (necesita `process.env` legítimamente), la solución elegida fue una directiva `/// <reference types="node" />` local a este archivo — habilita los tipos de Node solo en este módulo, sin reabrir `@types/node` a todo el proyecto (lo que sí sería un cambio de arquitectura general, fuera de alcance de esta Sprint). `@types/node` ya es una `devDependency` existente en `package.json` desde antes de este Sprint, así que no se instaló nada nuevo. Se amplió también el JSDoc del archivo documentando explícitamente esta decisión, tal como pedía el problema #3 ("Documentar la decisión tomada").

### 3.4 Extracción de los `Context` fuera de los `.tsx`

La regla `react-refresh/only-export-components` (configurada con `allowConstantExport: true`) espera que un archivo `.tsx` consumido por Fast Refresh exporte únicamente componentes (y constantes) — no funciones de hook. Los 3 Providers de Fase A (`SupabaseProvider.tsx`, `SessionProvider.tsx`, `AuthProvider.tsx`) exportaban cada uno un componente **y** un hook interno (`useXContext`), lo que dispara el warning. La corrección aplicada:

- Se creó un archivo `.ts` (no `.tsx`) por cada Provider — `supabase.context.ts`, `session.context.ts`, `auth.context.ts` — que exporta únicamente el resultado de `createContext(...)` (y, cuando aplica, el tipo de valor del contexto, p. ej. `SessionContextValue`/`AuthContextValue`).
- Los `.tsx` de `providers/` ahora importan ese `Context` ya creado y exportan **solo** el componente Provider (+ su tipo de props) — nada más.
- La lógica que antes vivía en `useXContext()` (un `useContext(...)` + chequeo de `null` con mensaje de error descriptivo) se movió, sin cambios de comportamiento, directamente a los hooks públicos correspondientes (`src/hooks/useSupabase.ts`, `useSession.ts`, `useAuth.ts`), que ya eran el punto de entrada recomendado para el resto de la aplicación.
- `AuthProviderInner` (dentro de `AuthProvider.tsx`) necesitaba leer la sesión de `SessionProvider` sin crear una dependencia circular `providers/ → hooks/ → providers/`; se resolvió leyendo `SessionContext` directamente vía `useContext`, en vez de importar el hook público `useSession()`.
- El barrel `src/providers/index.ts` se actualizó para dejar de re-exportar los hooks removidos, agregando en su lugar la re-exportación de los tipos de valor de contexto (`SessionContextValue`/`AuthContextValue`) desde los nuevos archivos `.context.ts`, por si algún consumidor los necesita para tipar props sin importar el hook completo.

Ningún componente de aplicación consumía todavía estos Providers/hooks (`AppProviders` no está montado en `App.tsx` — ver `ARCHITECTURE.md §14.2`), así que este refactor no tiene consumidores reales que migrar todavía.

---

## 4. Tipos Supabase

- **Ubicación definitiva**: `src/types/database.generated.ts` (sin cambios respecto a Fase A — se ratifica, no se relocaliza).
- **Comando oficial usado** (por el usuario, en su entorno, no en este Sprint): `supabase gen types typescript --linked --schema public > src/types/database.generated.ts`.
- **Motivo de la ubicación**: documentado en detalle en el nuevo `src/types/README.md` (convención ya vigente desde Fase A, ratificada acá; vive junto al resto de `src/types/` por cohesión, separada de `src/lib/supabase/` que es infraestructura/lógica).
- **Confirmación sin duplicados**: se buscó explícitamente (`database.types.ts`, `supabase.types.ts` u otro nombre equivalente) en todo `src/` — no existe ninguno. Los otros 3 archivos de `src/types/` (`database.ts`, `domain.ts`, `enums.ts`) son manuales, de Fase 3, y no compiten con `database.generated.ts` como fuente del tipo `Database`.
- **Confirmación de imports consistentes**: todos los módulos que necesitan `Database` (`src/lib/supabase/client.ts`, `server.ts`, `src/services/supabase.service.ts`, `database.service.ts`, `src/hooks/useSupabase.ts`, `src/providers/supabase.context.ts`) usan exactamente `import type { Database } from '@/types/database.generated';` — verificado con búsqueda exhaustiva sobre `src/`.

---

## 5. Compatibilidad

- El proyecto sigue sin ejecutar la Supabase CLI desde este entorno de trabajo (sandbox sin acceso de red — ver §6); no se puede confirmar acá que "la CLI sigue funcionando" más allá de constatar que ningún archivo tocado en este Sprint invoca la CLI directamente ni depende de un `config.toml` distinto al ya existente.
- `supabase/config.toml` **no fue modificado** en este Sprint (fuera de alcance: no está en la lista de archivos permitidos) — sigue siendo el archivo escrito a mano en una ronda previa (no generado por `supabase init` real), con la inconsistencia ya documentada en `ARCHITECTURE.md §14.5` (`major_version = 16` vs. PG 17.6 real) sin resolver.
- Los tipos siguen previstos para provenir exclusivamente del esquema oficial de Producción (`supabase/migrations/0001_initial_schema.sql`, 8 tablas reales) — ningún archivo de este Sprint introduce un tipo manual que compita con `database.generated.ts`.
- El proyecto sigue "vinculado" en el sentido de que `bdevkryrgmttxnlxaisd` (project_ref real) sigue siendo el único documentado en `config.ts`/`README.md`/`supabase/config.toml` — no se cambió ninguna referencia de proyecto.
- Ninguna lógica de negocio fue modificada: los 5 cambios de este Sprint son de tipado, configuración de ESLint/TypeScript y organización interna de módulos — ningún archivo de `src/repositories/` (que sí tienen lógica de acceso a datos específica por tabla) fue tocado.

---

## 6. Estado final

**No se ejecutaron realmente `npm run lint`, `npm run typecheck` ni `npm run build` en este Sprint.** Motivo, verificado de nuevo en esta ronda (idéntico a Fase A):

- `node_modules/` no existe en este entorno de trabajo.
- `curl -sI https://registry.npmjs.org/react`, `https://supabase.com` y `https://example.supabase.co` devuelven `403` con `x-deny-reason: host_not_allowed` — bloqueo de red categórico del sandbox, no dependiente de credenciales.
- Sin `node_modules/` ni acceso de red, no hay forma de instalar dependencias ni de invocar `eslint`/`tsc`/`vite` realmente en este entorno.

En su lugar, cada corrección de este informe fue validada por **lectura manual** del código propio contra la configuración real y ya existente del proyecto (`eslint.config.js`, `tsconfig.app.json`, `package.json`) y contra el comportamiento documentado de la API real de `@supabase/supabase-js` v2 (`RealtimeRemoveChannelResponse`, `SupabaseClient.removeChannel`). Esto reduce (no elimina) el riesgo de un error de sintaxis o de un caso no contemplado que solo aparecería al compilar de verdad.

**Hallazgo pendiente, reportado explícitamente**: el brief de este Sprint asume que una "Fase 4.1.1B — Integración Local" ya se ejecutó y generó `database.generated.ts` mediante `supabase gen types typescript --linked --schema public`. Se verificó en este entorno (búsqueda por nombre de archivo en todo el repositorio y en el directorio de adjuntos del usuario) que **ese archivo no existe** — no fue generado acá (no hay red) ni fue adjuntado/subido por el usuario en esta conversación. Todo el resto de las 5 categorías de error se corrigió igual, porque ninguna de ellas depende del contenido de ese archivo específico (son errores de configuración/tipado en el código propio). Pero el problema #1 en sentido estricto — "¿el proyecto compila limpio contra el `Database` real?" — no puede declararse cerrado hasta que el usuario adjunte el contenido real de `database.generated.ts` generado por el comando oficial, o confirme y vuelva a correr `npm run lint`/`typecheck`/`build` en su máquina con ese archivo ya presente.

**Warnings que podrían permanecer, y por qué no son deuda técnica crítica**: una vez generado `database.generated.ts`, es posible que aparezcan advertencias menores de TypeScript en los repositorios (`src/repositories/*`) si el esquema real difiere en algún detalle fino (nombres de columnas nullable, etc.) de lo asumido — eso no se puede verificar sin el archivo real, y no es parte de los 5 problemas reportados en este Sprint (esos repositorios no fueron señalados como afectados). El único `eslint-disable` que permanece en todo `src/` es el de `src/hooks/useRealtime.ts` (`react-hooks/exhaustive-deps`), que es legítimo: `eslint-plugin-react-hooks` sí es una dependencia real y configurada del proyecto, y la justificación técnica (dependencias estables a nivel de módulo) ya estaba documentada desde Fase A.

**Conclusión de aprobación**: conforme a los propios criterios del brief ("Todos deben finalizar exitosamente. No entregar el Sprint con errores"), **este Sprint no puede declararse formalmente aprobado todavía** — no por incumplimiento de las correcciones (las 5 categorías reportadas se atendieron), sino porque la validación real (`lint`/`typecheck`/`build` en verde, con `database.generated.ts` real presente) sigue pendiente de ejecutarse fuera de este entorno de trabajo, igual que en Fase A.
