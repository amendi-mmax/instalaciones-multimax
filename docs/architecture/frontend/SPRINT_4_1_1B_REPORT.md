# Sprint 4.1.1B — Adaptación definitiva de la infraestructura Supabase al SDK oficial

**Fecha**: 2026-07-21
**Tipo**: infraestructura (sin lógica de negocio, sin cambios de UI/layouts/estilos/flujo de autenticación).
**Punto de partida**: ZIP adjuntado por el usuario con el estado real del proyecto tras `npm install`, `supabase init`, `supabase link --project-ref bdevkryrgmttxnlxaisd` y `supabase gen types typescript --linked --schema public` ejecutados localmente. Este ZIP reemplazó por completo el contexto de trabajo anterior, conforme a la instrucción explícita del brief.

---

## 1. Resumen técnico de la auditoría realizada

Antes de modificar cualquier archivo se auditó, por lectura completa, todo lo listado en el brief como mínimo obligatorio: `src/lib/supabase/client.ts`, `server.ts`, `realtime.ts`, `config.ts`, `environment.ts`, `index.ts`; los 3 `src/providers/*.tsx` + sus 3 `*.context.ts`; los 4 `src/hooks/*.ts`; los 4 `src/services/*.ts`; los 8 `src/repositories/*.repository.ts` + `base.repository.ts`; `src/types/database.generated.ts` y el resto de `src/types/`; `supabase/config.toml`.

Primero se verificó la autenticidad de `database.generated.ts` (nunca visto en este entorno de trabajo hasta este Sprint), por tres vías independientes: (a) su forma coincide exactamente con lo que emite hoy la Supabase CLI real (`__InternalSupabase.PostgrestVersion`, `Constants`, los helpers `Tables`/`TablesInsert`/`TablesUpdate`/`Enums`/`CompositeTypes`); (b) su contenido (8 tablas, 1 vista, 2 funciones RPC, con columnas/FKs exactas) coincide con `docs/database/DATABASE_INVENTORY.md`, auditado en Sprint 4.0.1 a partir de un `pg_dump` real independiente; (c) `supabase/.temp/rest-version` (`v14.5`) y `supabase/.temp/postgres-version` (`17.6.1.127`) -- artefactos que solo produce un `supabase link` real -- son mutuamente consistentes entre sí y con el propio `database.generated.ts`. Se concluyó que el archivo es real y se usó tal cual, sin editarlo.

Con el `Database` real disponible, la auditoría de `src/services/database.service.ts` y `src/repositories/base.repository.ts` identificó un problema estructural: los helpers genéricos `insertRow`/`updateById`/`callRpc` (parametrizados sobre `T extends TableName` o sobre un `functionName`/`args` sin relación con `Database['public']['Functions']`) no ofrecen ninguna garantía real de tipado al invocar `.insert()`/`.update()`/`.rpc()` -- ver el punto 3 para el detalle técnico completo. El resto de la infraestructura auditada (`client.ts`, `server.ts`, `environment.ts`, `config.ts`, providers, hooks, `auth.service.ts`, `supabase.service.ts`, los 6 métodos de lectura/borrado de los repositorios) se revisó línea por línea contra `Database` real y no presenta incompatibilidades nuevas más allá de las ya corregidas en Sprint 4.1.1C.

También se auditó `supabase/config.toml` (explícitamente listado en el brief) y se encontró una inconsistencia documental que se reporta en la sección 7, sin modificarla (no forma parte del alcance de código de este Sprint).

---

## 2. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/services/database.service.ts` | Reescrito: se elimina `insertRow`, `updateById`, `callRpc` genéricos y `RpcFunctionName`. Se mantienen `selectAll`/`selectById`/`deleteById`/`TableRow`/`TableInsert`/`TableUpdate`. Se agregan `callAsignarInstalador`/`callSubmitBid`, tipadas directamente contra `Database['public']['Functions']`. |
| `src/repositories/base.repository.ts` | `createRepository<T>(table: T)` → `createRepository<T>(table: T, writeOps: RepositoryWriteOps<T>)`. Se agrega la interfaz `RepositoryWriteOps<T>`. `Repository<T>` (contrato público) no cambia. |
| `src/repositories/admins.repository.ts` | Se agregan `create`/`update` explícitos (literal `TABLES.admins`); se pasan como `writeOps` a `createRepository`. |
| `src/repositories/coordinadores.repository.ts` | Idem, con `TABLES.coordinadores`. |
| `src/repositories/empresas.repository.ts` | Idem, con `TABLES.empresas`. |
| `src/repositories/instaladores.repository.ts` | Idem, con `TABLES.instaladores`. |
| `src/repositories/tiendas.repository.ts` | Idem, con `TABLES.tiendas`. |
| `src/repositories/trabajos.repository.ts` | Idem, con `TABLES.trabajos`; JSDoc actualizado para referenciar `callAsignarInstalador` en vez de `callRpc`. |
| `src/repositories/trabajo-instaladores.repository.ts` | Idem, con `TABLES.trabajoInstaladores`. |
| `src/repositories/ofertas.repository.ts` | Idem, con `TABLES.ofertas`; JSDoc actualizado para referenciar `callSubmitBid`. |
| `src/services/index.ts` | Barrel: se quitan `insertRow`/`updateById`/`callRpc`; se agregan `callAsignarInstalador`/`callSubmitBid`. |
| `src/lib/supabase/config.ts` | Comentario de `GENERATED_TYPES_PATH` actualizado: ya no dice "pendiente de Fase B", documenta que el archivo ya existe y es real (Sprint 4.1.1B). |
| `src/types/README.md` | Tabla de `src/types/` y sección "Estado actual" actualizadas: `database.generated.ts` ya no es "pendiente", se documenta la evidencia de autenticidad. |
| `README.md` | Sección de generación de tipos y "Estado del proyecto" actualizadas para reflejar que el archivo ya existe y que el Sprint pendiente es la validación real de lint/typecheck/build/dev. |
| `ARCHITECTURE.md` | Nueva sección `§14.8` con el detalle completo de este Sprint. |
| `PROJECT_STATUS.md` | Nueva sección "Fase 4 — Sprint 4.1.1B"; actualización de "Qué falta". |
| `MIGRATION_STATUS.md` | Nueva nota de alcance en `§0` (mismo criterio que 4.1.1/4.1.1C: cero cambio de cobertura HTML). |

### No modificados (auditados, sin cambios necesarios)

`src/lib/supabase/client.ts`, `server.ts`, `realtime.ts`, `environment.ts`, `index.ts`; los 3 `src/providers/*.tsx` + `*.context.ts`; los 4 `src/hooks/*.ts`; `src/services/supabase.service.ts`, `auth.service.ts`; `src/types/database.generated.ts` (nunca se edita a mano); `src/types/database.ts`/`domain.ts`/`enums.ts` (legacy/manual, fuera de alcance); `supabase/config.toml` (auditado, inconsistencia reportada en §7, no corregida -- fuera del alcance de código de este Sprint); `supabase/README.md`, `supabase/seed.sql`, `supabase/migrations/`; ningún componente, layout, estilo ni el flujo de `src/contexts/AuthContext.tsx` (legacy).

---

## 3. Explicación de cada refactor importante

### 3.1 Por qué `insertRow`/`updateById` genéricos dejaron de ser seguros

`PostgrestQueryBuilder.insert(values)`/`.update(values)` verifican, en tiempo de compilación, que `values` sea asignable al tipo `Insert`/`Update` de la tabla concreta que `.from()` resolvió. Cuando `.from(table)` se llama con `table: T` (un parámetro de tipo genérico, no un literal), TypeScript chequea el **cuerpo** de la función genérica una sola vez, tratando `T` como una tabla abstracta todavía no resuelta -- no la sustituye por cada literal real en cada instanciación. El resultado: `Database['public']['Tables'][T]['Insert']` (el tipo que nuestro propio alias `TableInsert<T>` computa) y el tipo que `.insert()` espera internamente para esa misma "tabla genérica" no siempre se reconocen como el mismo tipo dentro de ese cuerpo genérico, así que `.insert(row)`/`.update(patch)` pueden fallar a compilar incluso si cada llamador real siempre pasa un literal concreto. Esto es una característica estable del sistema de tipos de TypeScript (chequeo de cuerpo genérico una única vez), no un defecto de una versión particular de `@supabase/supabase-js` -- y es un problema ampliamente documentado en la comunidad de Supabase/PostgREST para exactamente este patrón ("repositorio CRUD genérico sobre nombre de tabla").

Las únicas dos salidas para ese error, sin cambiar el diseño, hubieran sido un cast (`as any`/`as never`) -- **prohibido explícitamente** en este Sprint -- o dejar el error sin resolver. Se optó por una tercera vía, autorizada por el propio brief ("reemplázalo por una implementación más explícita y completamente type-safe"): eliminar el `.insert()`/`.update()` de dentro de cualquier función genérica.

### 3.2 Por qué `selectAll`/`selectById`/`deleteById` sí pueden seguir siendo genéricos

Estas tres funciones no le pasan a Postgrest ningún valor cuya forma dependa de la tabla: `.select('*')` solo *devuelve* `Row` (en posición de salida, sin verificación de asignabilidad de un valor de entrada), `.delete()` no recibe ningún valor, y `.eq('id', id)` compara siempre contra `string` (las 8 tablas reales usan `uuid`, tipado como `string`). No hay ninguna verificación de asignabilidad de un valor externo contra un tipo dependiente de tabla, así que el mismo problema de 3.1 no aplica acá -- se mantuvieron sin cambios.

### 3.3 Dónde viven ahora `create`/`update`

Cada uno de los 8 `src/repositories/*.repository.ts` implementa su propio `create`/`update`, en un contexto donde `TABLES.<tabla>` ya es un **literal** concreto (p. ej. `TABLES.trabajos` tiene el tipo literal `'trabajos'`, no `string`). Ahí, `.from(TABLES.trabajos).insert(row)` resuelve `Table` a un tipo concreto (no genérico), y la verificación de asignabilidad de `row`/`patch` ocurre de forma directa y sin ambigüedad. `base.repository.ts` recibe esas dos implementaciones como `writeOps` (inyección de dependencias) y las expone bajo el mismo contrato público `Repository<T>` (`getAll`/`getById`/`create`/`update`/`remove`) que ya existía -- ningún consumidor externo (hoy, ninguno real -- ver §5) necesita cambiar una sola línea.

### 3.4 `callRpc` genérico → `callAsignarInstalador`/`callSubmitBid` explícitas

El `callRpc<TArgs, TResult>(functionName, args)` de Fase A tenía el mismo problema estructural que 3.1, agravado por el hecho de que `TArgs`/`TResult` eran completamente genéricos y sin relación real con `Database['public']['Functions']` -- es decir, ni siquiera ofrecía la garantía parcial que sí tenían `insertRow`/`updateById`. Con solo 2 funciones RPC reales en Producción, se reemplazó por dos funciones explícitas, cada una invocando `.rpc(<literal>, args)` con el nombre de función como literal concreto y `Args`/`Returns` tomados directamente de `Database['public']['Functions'][<literal>]` -- sin ningún tipo intermedio hand-rolled. Si el esquema real de una función cambia (se agrega/quita un argumento), estas dos funciones dejan de compilar automáticamente, en vez de aceptar silenciosamente un `args` incorrecto como hacía el `callRpc` genérico.

---

## 4. Justificación de las decisiones de arquitectura adoptadas

- **Se priorizó eliminar por completo la superficie de "generic dispatch sobre nombre de tabla/función sobre operaciones de escritura"**, en vez de intentar forzarla a compilar con un cast -- exactamente lo que el brief autoriza explícitamente ("si el patrón CRUD genérico actual resulta incompatible... reemplázalo por una implementación más explícita y completamente type-safe") y lo que prohíbe hacer con casts ("no cast innecesarios", "no usar `any`/`unknown` para ocultar errores").
- **Se mantuvo la arquitectura de capas** (`services/` sin lógica de negocio → `repositories/` con acceso tipado por tabla → futuros Sprints funcionales encima) -- el cambio es interno a cómo se construye cada repositorio, no a la separación de responsabilidades ya establecida.
- **Se mantuvo el contrato público `Repository<T>`** intacto -- no hay consumidores reales todavía (`AppProviders` no está montado en `App.tsx`, confirmado por búsqueda), pero es la interfaz que los próximos Sprints funcionales (Auth, Trabajos, Bids) van a consumir, y el brief exige explícitamente no romper "las APIs públicas utilizadas por el resto del proyecto".
- **Se descartó una alternativa más "compacta"** (un único `makeInsertRow<T>(table: T)` que devuelva una función especializada) porque el cuerpo de esa función seguiría siendo genérico -- TypeScript chequea el cuerpo de una función genérica una sola vez, sin importar cuántas veces se invoque con un literal distinto en cada call site; la única forma de que `.from()` vea un literal es que la llamada ocurra textualmente donde el nombre de tabla ya es literal, sin ningún nivel de indirección genérica en el medio. Por eso el `create`/`update` de cada tabla vive directamente en su propio archivo, con algo de repetición mecánica (3 líneas por función, 8 tablas) a cambio de tipado 100% real sin casts.
- **Se mantuvieron `RPC_FUNCTIONS`/`TABLES`/`VIEWS`** en `src/lib/supabase/config.ts` sin cambios -- siguen siendo la fuente centralizada de nombres reales, y ahora `RPC_FUNCTIONS.asignarInstalador`/`.submitBid` se usan directamente como los literales que se pasan a `.rpc()`.

---

## 5. Confirmación de compatibilidad con el SDK oficial de Supabase

- **`Database`/`Row`/`Insert`/`Update`**: todo el acceso a datos (`selectAll`/`selectById`/`deleteById`/`create`/`update` de los 8 repositorios) usa `TableRow`/`TableInsert`/`TableUpdate`, alias directos sobre `Database['public']['Tables'][T]`, sin ningún tipo hand-rolled paralelo.
- **`Relationships`**: no se usa todavía en ningún query (no hay joins/embeds en este Sprint) -- no hay incompatibilidad porque no hay uso; queda disponible para cuando un Sprint funcional lo necesite.
- **`RPC`**: `callAsignarInstalador`/`callSubmitBid` tipadas directamente contra `Database['public']['Functions']` (ver §3.4).
- **`Realtime`**: sin cambios respecto a Sprint 4.1.1C (`removeRealtimeChannel` ya usa el tipo oficial `RealtimeRemoveChannelResponse`, no un tipo hand-rolled). **Riesgo declarado en §7**: no se pudo re-verificar este tipo contra el código fuente real de `@supabase/supabase-js@2.110.0` (la versión efectivamente resuelta en `package-lock.json`), por no tener acceso a `node_modules/` en este entorno.
- **`createClient`**: `client.ts`/`server.ts` siguen llamando `createClient<Database>(url, key, options)` -- consistente con el comentario del propio `database.generated.ts` sobre el nuevo patrón de un solo parámetro de tipo (`__InternalSupabase.PostgrestVersion` se infiere automáticamente); no requiere el segundo parámetro de tipo `{ PostgrestVersion: 'XX' }` que versiones anteriores del SDK pedían pasar a mano.

Todos los repositorios (8) y ambos servicios base (`database.service.ts`, `supabase.service.ts`) fueron auditados uno por uno contra `database.generated.ts` real; no se detectaron incompatibilidades adicionales a las corregidas en la sección 3.

---

## 6. Resultado completo de `npm run lint` / `npm run typecheck` / `npm run build` / `npm run dev`

**No se ejecutó ninguno de los cuatro comandos en este entorno de trabajo.** Se verificó explícitamente, de nuevo en este Sprint (no se asumió del estado anterior):

```
$ curl -sI --max-time 8 https://registry.npmjs.org/react
HTTP/2 403
x-deny-reason: host_not_allowed

$ curl -sI --max-time 8 https://supabase.com
HTTP/1.1 403 Forbidden

$ npm install --offline --no-audit --no-fund
npm error code ENOTCACHED
npm error request to https://registry.npmjs.org/zod/-/zod-3.25.76.tgz failed:
npm error cache mode is 'only-if-cached' but no cached response is available.
```

`node_modules/` no existe en este entorno (el ZIP, correctamente, no lo incluye) y el acceso de red a `registry.npmjs.org`/`supabase.com` sigue bloqueado de forma categórica (`403 host_not_allowed`), igual que en Sprint 4.1.1 y 4.1.1C. Existe un `tsc` global en este entorno (de otra instalación, `/home/claude/.npm-global/bin/tsc`), pero correrlo contra este proyecto sin sus dependencias reales (`react`, `@supabase/supabase-js@2.110.0`, etc.) no validaría nada real -- solo produciría errores de "Cannot find module" para cada import, sin relación con la calidad del código de este Sprint. Se decidió no ejecutarlo para no producir una lectura de "validación" engañosa.

**Verificación parcial real que sí se ejecutó** (no sustituye a `npm run lint`/`typecheck`/`build`/`dev`, y se reporta con ese límite explícito): se usó `node --experimental-strip-types --check` (Node 22.22, disponible en este entorno) sobre los 12 archivos `.ts` tocados en este Sprint, para confirmar que no tienen errores de *sintaxis* (llaves/paréntesis desbalanceados, TypeScript no borrable, etc.) tras las ediciones manuales:

```
$ node --experimental-strip-types --no-warnings --check src/services/database.service.ts
OK
$ node --experimental-strip-types --no-warnings --check src/services/index.ts
OK
$ node --experimental-strip-types --no-warnings --check src/repositories/base.repository.ts
OK
... (8 repositorios más, todos OK)
$ node --experimental-strip-types --no-warnings --check src/lib/supabase/config.ts
OK
```

Esto confirma que el código parsea correctamente como TypeScript/JavaScript válido -- **no** confirma tipos, resolución de módulos, ni las reglas de ESLint del proyecto. Se incluye por transparencia, no como sustituto de las validaciones obligatorias.

**Evidencia real disponible, no fabricada por este entorno**: el propio `tsconfig.app.tsbuildinfo` incluido en el ZIP del usuario (producido por su `tsc` real, contra sus dependencias reales, antes de este Sprint) reporta:

```json
{ "errors": true, "version": "5.9.3" }
```

Es decir: la última compilación real conocida, previa a este refactor, tenía errores -- consistente con el motivo por el que se pidió este Sprint. Este informe no puede confirmar que los errores reales *después* de este refactor sean cero, porque no se pudo recompilar en este entorno. **La validación real de los 4 comandos, en verde, queda pendiente de que el usuario los ejecute en su propio entorno** (que sí tiene `node_modules/` real y acceso de red) y reporte el resultado -- igual que en las rondas anteriores de este mismo Sprint.

---

## 7. Riesgos detectados

1. **`supabase/config.toml` desactualizado**: sigue siendo el archivo escrito a mano en Sprint 4.0.1 (`major_version = 16`, con una nota de cabecera que dice literalmente "la CLI de Supabase no está instalada"), pese a que `supabase/.temp/` prueba que el usuario sí ejecutó un `supabase link`/`init` real contra un proyecto en PostgreSQL 17.6. No fue corregido en este Sprint (no forma parte del alcance de código de `src/`, y tocar `supabase/` ha sido tratado como fuera de alcance en todas las rondas anteriores salvo permiso explícito) -- se recomienda que el usuario confirme si su `supabase init` realmente sobrescribió `config.toml` o si el archivo en el ZIP es el preexistente sin tocar.
2. **`docs/architecture/database/handymax_schema_v3.sql`**: este archivo, presente en el ZIP dentro de `docs/architecture/database/` (una carpeta que, en el resto de su contenido, es una copia idéntica de `docs/database/` -- el esquema real de Producción), describe en realidad el **modelo legacy** (usa `sucursales`, no `tiendas`; no incluye `admins`/`coordinadores`/`trabajo_instaladores`/`ofertas`) -- contradice directamente al resto de la carpeta donde vive y al `database.generated.ts` real de este mismo Sprint. No se modificó ni se borró (no autorizado por este Sprint, que es de código en `src/`) -- se recomienda que el usuario confirme si ese archivo llegó ahí por error antes de que alguien lo use como referencia.
3. **Realtime (`src/lib/supabase/realtime.ts`) no se pudo re-verificar contra el código fuente real instalado**: `@supabase/supabase-js` resuelve, según `package-lock.json`, a la versión `2.110.0` -- muy posterior al corte de entrenamiento de este modelo (mayo de 2025) y a cualquier versión de esa librería que este modelo haya podido ver en detalle. El tipo `RealtimeRemoveChannelResponse` usado (desde Sprint 4.1.1C) se basa en conocimiento de entrenamiento sobre la forma pública de la API de esa librería, no en una lectura directa de su código fuente en este entorno (no hay `node_modules/`). Es el punto de mayor incertidumbre remanente de todo este Sprint -- se recomienda que sea el primer archivo que el usuario revise si `npm run typecheck` reporta algún error en este Sprint.
4. **Ningún repositorio tiene todavía consumidores reales** (`AppProviders` no está montado en `src/App.tsx`) -- esto significa que ningún error de integración end-to-end (p. ej. un componente pasando un `row` con una forma sutilmente incorrecta) puede detectarse todavía por el simple hecho de que nada invoca estos repositorios en la aplicación real. Este riesgo es heredado, no nuevo de este Sprint.

---

## 8. Recomendaciones para el siguiente Sprint

1. Ejecutar `npm run lint && npm run typecheck && npm run build && npm run dev` en el entorno real del usuario con este refactor aplicado, y reportar el resultado exacto -- es el único paso que falta para declarar este Sprint aprobado.
2. Si `typecheck` reporta algún error en `realtime.ts`, tratarlo como prioritario dado el riesgo #3 de la sección anterior.
3. Decidir y resolver los 2 hallazgos documentales de la sección 7 (`config.toml` desactualizado, `handymax_schema_v3.sql` legacy mezclado en `docs/architecture/database/`) en un Sprint de limpieza de documentación, antes de que alguien los use como referencia por error.
4. Recién con lint/typecheck/build/dev en verde y confirmados por el usuario, considerar montar `AppProviders` en `src/App.tsx` y empezar el primer Sprint funcional real (Autenticación, según el orden que indica el propio brief de este Sprint) sobre esta infraestructura ya estabilizada.
