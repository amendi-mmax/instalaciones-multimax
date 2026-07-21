# Sprint 4.1.1C — Refactorización final de `database.service.ts` para compatibilidad total con el SDK oficial de Supabase

**Fecha**: 2026-07-21
**Tipo**: infraestructura (sin lógica de negocio, sin UI, sin esquema/migraciones).
**Alcance tocado**: únicamente `src/services/database.service.ts`, `src/services/index.ts`, `src/repositories/base.repository.ts` y los 8 `src/repositories/*.repository.ts`. Ningún otro archivo del proyecto se modificó en este Sprint.

> **Nota de traza sobre el ZIP recibido**: antes de empezar se comparó el ZIP adjunto en este Sprint contra el estado ya entregado al cierre de Sprint 4.1.1B, y resultó **idéntico byte a byte** (`diff -rq` sin diferencias), incluyendo un `tsconfig.app.tsbuildinfo` también idéntico (`"errors": true`, sin fecha posterior a la última edición de `database.service.ts` en la ronda anterior). Es decir: este ZIP no contiene evidencia de una ejecución local nueva de `npm install`/`npm run lint`/`npm run dev` posterior al Sprint 4.1.1B -- es el mismo entregable repackagado. Esto se reporta por transparencia (no se silencia), pero no cambia el análisis técnico de este Sprint: el brief pide una evaluación arquitectónica de `database.service.ts` que es válida independientemente de qué build local la haya motivado, y se realizó sobre el código real tal como estaba.

---

## 1. Diagnóstico

La implementación previa a este Sprint (heredada de Sprint 4.1.1B) ya había resuelto el problema más grave -- `insertRow`/`updateById`/`callRpc` genéricos, que rompían el tipado real al pasar un valor (`row`/`patch`/`args`) a través de una función genérica sobre el nombre de tabla/función (ver `ARCHITECTURE.md §14.8` para el detalle de ese diagnóstico previo). Lo que quedaba en `database.service.ts` -- `selectAll`/`selectById`/`deleteById`, genéricos sobre `T extends TableName` -- no tenía ese mismo problema de asignabilidad (no pasan ningún valor de entrada dependiente de la forma de la tabla), pero sí dejaba la arquitectura en un estado **mixto e inconsistente**: dos operaciones de cada tabla (`create`/`update`) vivían en el archivo de esa tabla, usando el nombre de tabla como literal; las otras tres (`getAll`/`getById`/`remove`) vivían acá, como funciones genéricas reenviadas a través de `base.repository.ts`. Ese mismo archivo `base.repository.ts` había dejado de ahorrar código real: ya no construía `create`/`update` (movidos a cada repositorio en 4.1.1B), así que su única función seguía siendo reenviar tres llamadas genéricas -- una capa de indirección sin beneficio de tipado adicional y con estilo inconsistente respecto al resto del repositorio.

## 2. Auditoría arquitectónica

Se evaluaron explícitamente las dos alternativas planteadas por el brief de este Sprint:

**Alternativa A (statu quo de Sprint 4.1.1B)**: mantener `selectAll`/`selectById`/`deleteById` genéricos en `database.service.ts`, con solo `create`/`update` explícitos por tabla.

**Alternativa B (adoptada)**: que cada repositorio implemente las 5 operaciones directamente contra `getClient().from(TABLES.<tabla>)`, sin ninguna función compartida de acceso a tablas; `database.service.ts` deja de tener cualquier función de acceso a una tabla y pasa a contener solo tipos (`TableRow`/`TableInsert`/`TableUpdate`) y las invocaciones RPC explícitas (`callAsignarInstalador`/`callSubmitBid`).

**Decisión: Alternativa B**, por estas razones concretas:

1. **Consistencia de estilo real, no solo de tipado**: la Alternativa A seguía siendo type-safe, pero dejaba una asimetría arbitraria (2 operaciones "locales", 3 "delegadas") sin ninguna razón de diseño -- solo inercia histórica de Sprint 4.1.1B. La Alternativa B trata las 5 operaciones de cada tabla de la misma forma.
2. **`createRepository()`/`base.repository.ts` ya no evitaban código real**: con `create`/`update` ya movidos a cada archivo desde 4.1.1B, la fábrica compartida solo reenviaba tres llamadas de una línea cada una -- no una implementación no trivial que valiera la pena centralizar. Quitarla no aumenta la duplicación neta: cada repositorio ya tenía que escribir 2 de 5 funciones a mano; ahora escribe 5, todas con la misma forma trivial (3-6 líneas).
3. **Reduce a cero la superficie que depende de que TypeScript resuelva correctamente un tipo indexado genérico a través de un límite de función** -- el mismo argumento que ya había motivado eliminar `insertRow`/`updateById`/`callRpc` en 4.1.1B aplica en espíritu acá: aunque `selectAll`/`selectById`/`deleteById` compilaban bien, dejar de depender de ese patrón por completo es más robusto a futuros cambios de la librería (nuevas versiones de `@supabase/supabase-js`/`postgrest-js` podrían ser más estrictas en un aspecto que hoy pasa).

Se descartó forzar la Alternativa A con el argumento de "ya funciona" porque el brief pide explícitamente evaluar, no defender el statu quo, y la Alternativa B es objetivamente más consistente sin costo real de mantenibilidad (la duplicación mecánica de 3 líneas por operación por tabla es preferible a una capa de indirección que ya no cumplía su propósito original).

## 3. Nueva arquitectura

**Flujo de acceso a datos** (de arriba hacia abajo):

```
Componente/hook futuro
        │
        ▼
adminsRepository / trabajosRepository / ... (8 objetos, uno por tabla)
  cada uno implementa getAll/getById/create/update/remove
  directamente contra getClient().from(TABLES.<tabla>)
        │
        ▼
supabase.service.ts  →  getClient() / normalizeSupabaseError() / toServiceResult()
        │
        ▼
lib/supabase/client.ts  →  getSupabaseClient() (singleton tipado <Database>)
```

**Responsabilidades finales**:

- **`src/services/supabase.service.ts`** (sin cambios en este Sprint): único punto de acceso al cliente tipado (`getClient()`), normalización de errores (`normalizeSupabaseError`), y el tipo/helper de resultado compartido (`ServiceResult<T>`/`toServiceResult`). Es la única capa verdaderamente "transversal" -- no sabe nada de tablas ni de RPC específicas.
- **`src/services/database.service.ts`** (rediseñado en este Sprint): ya no tiene ninguna función de acceso a una tabla. Contiene únicamente (a) los alias de tipo `TableRow`/`TableInsert`/`TableUpdate` sobre `Database['public']['Tables']` -- tipos puros, sin lógica en tiempo de ejecución, seguros de indexar con un literal concreto; y (b) `callAsignarInstalador`/`callSubmitBid`, las dos únicas invocaciones RPC reales de Producción, cada una tipada directo contra `Database['public']['Functions']`.
- **`src/repositories/base.repository.ts`** (rediseñado en este Sprint): ya no tiene ninguna lógica en tiempo de ejecución -- solo exporta la interfaz `Repository<T>`, el contrato de forma que deben cumplir los 8 objetos `xRepository`.
- **`src/repositories/*.repository.ts`** (los 8, reescritos en este Sprint): cada uno implementa `getAll`/`getById`/`create`/`update`/`remove` directamente contra `getClient().from(TABLES.<tabla>)` -- con el nombre de tabla como literal concreto en cada llamada -- más los métodos específicos de esa tabla que ya existían (`getByEmpresaId`, `getBySlug`, `getByEstado`, etc.). Cada objeto exportado se tipa como `Repository<'<tabla>'> & { <métodos propios> }`.

Ningún componente/hook consume todavía estos repositorios (`AppProviders` sigue sin montarse en `App.tsx`), así que este rediseño no tiene consumidores reales que migrar.

## 4. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/services/database.service.ts` | Se eliminan `selectAll`/`selectById`/`deleteById`. Quedan solo `TableRow`/`TableInsert`/`TableUpdate` y `callAsignarInstalador`/`callSubmitBid`. JSDoc reescrito documentando la auditoría arquitectónica completa. |
| `src/services/index.ts` | Barrel: se quitan `selectAll`/`selectById`/`deleteById` de la re-exportación de `database.service.ts`. |
| `src/repositories/base.repository.ts` | Se elimina la función `createRepository`/`RepositoryWriteOps`. Queda únicamente la interfaz `Repository<T>`. |
| `src/repositories/admins.repository.ts` | `getAll`/`getById`/`remove` pasan de delegar en `base.repository.ts` a implementarse directamente acá (literal `TABLES.admins`). `create`/`update` sin cambios de fondo (ya eran locales desde 4.1.1B). |
| `src/repositories/coordinadores.repository.ts` | Idem, con `TABLES.coordinadores`. |
| `src/repositories/empresas.repository.ts` | Idem, con `TABLES.empresas`. |
| `src/repositories/instaladores.repository.ts` | Idem, con `TABLES.instaladores`. |
| `src/repositories/tiendas.repository.ts` | Idem, con `TABLES.tiendas`. |
| `src/repositories/trabajos.repository.ts` | Idem, con `TABLES.trabajos`. |
| `src/repositories/trabajo-instaladores.repository.ts` | Idem, con `TABLES.trabajoInstaladores`. |
| `src/repositories/ofertas.repository.ts` | Idem, con `TABLES.ofertas`. |
| `docs/architecture/frontend/SPRINT_4_1_1C_DATABASE_SERVICE_REPORT.md` | Nuevo -- este informe. |

Ningún otro archivo del proyecto (UI, componentes, layouts, `config.toml`, `database.generated.ts`, migraciones, `seed.sql`, HTML oficial, ni ninguna documentación previamente aprobada como `ARCHITECTURE.md`/`PROJECT_STATUS.md`/`MIGRATION_STATUS.md`/`README.md`) se tocó en este Sprint, conforme a la restricción explícita del brief.

## 5. Compatibilidad

- **No se modificó lógica de negocio**: ningún repositorio interpreta `estado`/`rol`/roles ni decide reglas -- siguen siendo acceso tipado puro, igual que antes.
- **No se modificó UI**: ningún componente, layout, ni estilo se tocó.
- **No se modificó el esquema SQL ni las migraciones**: `supabase/migrations/`, `supabase/seed.sql` intactos.
- **`database.generated.ts` sigue siendo la única fuente oficial de tipos**: no se editó, y todo el código nuevo sigue importando `Database` exclusivamente desde `@/types/database.generated` -- `TableRow<T>`/`TableInsert<T>`/`TableUpdate<T>` (usados con literales concretos en cada repositorio) y `Database['public']['Functions'][...]` (para las 2 funciones RPC) son las únicas formas de acceder al esquema real.
- **`config.toml` no se tocó** (fuera del alcance explícito de este Sprint).
- Cero `any`, cero `as any`/`as never`, cero `@ts-ignore`/`@ts-expect-error`, cero `eslint-disable` nuevos -- verificado por búsqueda exhaustiva sobre los 12 archivos tocados.

## 6. Validaciones

**No se pudieron ejecutar `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` en este entorno de trabajo.** Se re-verificó explícitamente en este Sprint (no se asumió del estado anterior):

```
$ curl -sI --max-time 8 https://registry.npmjs.org/react
HTTP/2 403
x-deny-reason: host_not_allowed

$ ls node_modules
ls: cannot access 'node_modules': No such file or directory
```

El acceso de red a `registry.npmjs.org` sigue bloqueado de forma categórica y `node_modules/` no existe (el ZIP recibido tampoco lo incluye). Como se documenta en la nota de traza al inicio de este informe, el ZIP adjunto en este Sprint es idéntico al entregable de la ronda anterior, así que tampoco aporta una salida real más reciente de esos comandos que se pueda citar acá.

**Verificación parcial real que sí se ejecutó** (no sustituye a las 4 validaciones obligatorias): `node --experimental-strip-types --check` (Node 22.22) sobre los 12 archivos tocados en este Sprint, confirmando que no tienen errores de sintaxis:

```
$ node --experimental-strip-types --no-warnings --check src/services/database.service.ts
OK
$ node --experimental-strip-types --no-warnings --check src/services/index.ts
OK
$ node --experimental-strip-types --no-warnings --check src/repositories/base.repository.ts
OK
$ node --experimental-strip-types --no-warnings --check src/repositories/index.ts
OK
... (8 repositorios, todos OK)
```

Esto confirma sintaxis válida -- **no** tipos, ni resolución de módulos, ni las reglas de ESLint del proyecto. **Este Sprint no puede declararse aprobado según sus propios criterios** ("Todos deben finalizar correctamente") hasta que el usuario ejecute los 4 comandos reales en su entorno (con `node_modules/` real) y confirme el resultado -- igual que en las rondas 4.1.1, 4.1.1B y 4.1.1C anteriores.

## 7. Recomendaciones

Sí -- **con la salvedad de la validación real pendiente** (punto 6), la infraestructura de acceso a datos queda, por diseño, en un estado que no debería requerir un nuevo refactor estructural antes del Sprint 4.2: las 5 operaciones de las 8 tablas siguen exactamente el mismo patrón (literal concreto + `getClient().from()` directo), sin ninguna capa genérica intermedia que pueda romperse con una versión futura del SDK. Antes de arrancar el Sprint 4.2 se recomienda:

1. Confirmar en un entorno real `npm run lint`/`typecheck`/`build`/`dev` en verde con este código.
2. Si typecheck reporta algún error, es la primera vez que sería genuinamente inesperado dado este diseño -- revisarlo puntualmente en vez de asumir que hace falta otro rediseño de la capa de acceso a datos.
3. Recién entonces montar `AppProviders` en `App.tsx` y empezar el primer consumidor real de estos repositorios.
