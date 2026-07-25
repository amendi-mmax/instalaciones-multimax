# Sprint 5.2.3 — Sucursal activa en toda la vista Coordinador

## 0. Nota de trazabilidad

Sprint de auditoría primero, implementación después, tal como exige el brief ("Primero realizar una auditoría completa" / "ÚNICAMENTE si la auditoría confirma que es seguro hacerlo"). Este entorno de trabajo no tiene acceso de red a Supabase ni `node_modules/npm` reales -- toda la auditoría se hizo leyendo el código fuente real del repositorio (`OperationalContextProvider.tsx`, `DespachoPage.tsx`, `TrabajosPage.tsx`, `CoordinatorLayout.tsx`, `header.tsx`/`header-status.tsx`, `dashboard.service.ts`), sin asumir nada no verificado directamente. La verificación de tipos se hizo con la técnica ya establecida (`tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0`) -- ver sección 9. `npm run lint`/`npm run build` no se pudieron ejecutar en este entorno (sin `node_modules`); queda para el usuario, igual que en todos los Sprints anteriores.

## 1. Auditoría — cómo funciona hoy `OperationalContext`

`OperationalContextProvider` (`src/providers/OperationalContextProvider.tsx`) resuelve `empresaId`/`empresaNombre`/`tiendaId`/`tiendaNombre` de **dos formas mutuamente excluyentes**, decididas por `requiereResolucionSuperusuario = esSuperusuario && modo === 'coordinador'`:

- **Coordinador/Instalador real, o `admin` viendo "Administración"/"Instalador"**: síncrona, directamente desde `profile` (`useAuth()`). `tiendaId = profile?.tiendaId ?? null`. Para un Coordinador real este valor **nunca cambia** durante la sesión -- es una columna fija de su fila en `coordinadores`.
- **`admin` viendo "Coordinador"** (Modo de Visualización Superusuario, Sprint 5.1.1): asíncrona, vía `resolveSuperusuarioTienda(sucursalCoord)` -- una consulta real a `empresas`/`tiendas` por nombre. Este es el **único caso** en el que `tiendaId` puede cambiar en tiempo real dentro de una misma sesión, y cambia exactamente cuando `sucursalCoord` cambia (el valor de `SucursalSelect`).

## 2. Quién controla hoy la sucursal activa

El estado `sucursalCoord`/`setSucursalCoord` vive en `RootLayout.tsx` (`useState('Multiplaza')`), se pasa como prop a `CoordinatorLayout.tsx`, que a su vez: (a) lo pasa a `SucursalSelect` (el `<select>` visible); (b) lo pasa a `OperationalContextProvider` como prop `sucursalCoord` (único punto que lo conecta a la resolución de tienda real); (c) lo pasa a `PublishModal` como prop `sucursal` (usado únicamente como valor de texto por defecto del campo `sucursal` del formulario de un trabajo nuevo -- no es `tienda_id`, es un campo de texto libre en `ActiveJob`, no una columna de `trabajos`).

**Hallazgo no anticipado por el brief**: `CoordinatorLayout.tsx` monta `<Header role={profile.rol} profile={profile} onLogout={...}/>` **sin pasarle la prop `sucursalActiva`** (`header.tsx` línea 41, `header-status.tsx` línea 39). `HeaderStatus` renderiza ese badge con su propio valor por defecto (`sucursalActiva = 'Multiplaza'`), que **nunca cambia**, sin importar qué sucursal esté seleccionada. Esto es la continuación de un problema ya documentado y no corregido desde el Sprint 3.4 (ver su "Problema encontrado" en `docs/sprints/sprint-3.4.md` y el JSDoc histórico de `RootLayout.tsx`, línea ~156-163).

## 3. Qué componentes consumen el contexto

Vía `useOperationalContext()`: `DespachoPage.tsx` (`tiendaId`, `loading`, `error`), `TrabajosPage.tsx` (`tiendaId`, `tiendaNombre`, `loading`, `error`), `CoordinatorLayout.tsx` (`activeJob`, `setActiveJob`, `tiendaId`, `empresaId`, para el INSERT de Publish). Ninguna otra página/componente lo consume hoy.

## 4. Qué consultas a Supabase usan `tienda_id`

Exactamente 2, ambas pasando por `trabajosRepository.getByTiendaId(tiendaId)` (`src/repositories/trabajos.repository.ts`, sin cambios):

- `getCoordinatorKpis(tiendaId)` (`dashboard.service.ts`) -- consumida por `DespachoPage.tsx` dentro de un `useEffect([tiendaId, contextoLoading, contextoError])`.
- `getTrabajosByTienda(tiendaId)` (`dashboard.service.ts`) -- consumida por `TrabajosPage.tsx` dentro de un `useEffect([tiendaId, contextoLoading, contextoError])`.

Ninguna otra consulta a Supabase en la vista Coordinador usa `tienda_id` -- `LiveDispatchCard`/`ResponsesPanel` no ejecutan ninguna consulta propia (ver sección 6).

## 5. Qué componentes NO reaccionan al cambio de sucursal

- **El badge de sucursal del Header** (`HeaderStatus`) -- no reacciona porque nunca recibe `sucursalActiva` como prop (ver hallazgo, sección 2). No es que reaccione "solo al badge" como plantea la pregunta 6 del brief -- **ni siquiera el badge reacciona**.
- **`activeJob`** (`JobSummaryCard`/el propio "Despacho en vivo" como bloque, ver sección 6) -- es un `useState` en `OperationalContextProvider`, escrito únicamente por `CoordinatorLayout.tsx` al completarse un Publish exitoso. Ningún efecto lo relacionaba con `tiendaId` antes de este Sprint.
- **`LiveDispatchCard`/`ResponsesPanel`** ("Radar"/"Respuestas") -- reciben props 100 % de demostración fijas (`RADAR_DEMO_NOTIFIED`, `RADAR_DEMO_INST_STATE`, `LIVECOUNTDOWN_DEMO_*`, declaradas como constantes de módulo en `DespachoPage.tsx`, protegidas explícitamente desde el Sprint 5.2.1: "NO modificar Radar", "NO modificar Countdown"). No consultan Supabase, no dependen de `tienda_id` ni de `activeJob` -- son literalmente los mismos valores sin importar qué trabajo o qué sucursal esté activa.

## 6. ¿El selector solo cambia el badge superior derecho?

No -- auditado con evidencia, la premisa es más grave que eso: **el selector no cambia ni siquiera el badge** (ver hallazgo, sección 2). Lo único que el selector cambia hoy, en la práctica, es: (a) el propio texto visible dentro del `<select>`; (b) -- únicamente cuando `esSuperusuario && modo === 'coordinador'` -- el `tiendaId`/`empresaId` real resuelto por el Contexto Operativo (lo que a su vez sí dispara correctamente los KPIs y "Mis trabajos", ver sección 7); (c) el valor de texto por defecto del campo `sucursal` de un trabajo nuevo en `PublishModal`.

**Para un Coordinador real, el selector no tiene ningún efecto real**: `tiendaId` viene fijo de `profile.tiendaId` (la tienda real asignada en `coordinadores`), nunca de `sucursalCoord` -- cambiar el `<select>` no cambia qué tienda ve en KPIs/"Mis trabajos"/RLS. Esto es coherente con el modelo real de datos: un Coordinador real pertenece a **una** tienda fija (columna `tienda_id` de `coordinadores`, FK, no editable desde la UI); el selector solo tiene un efecto observable real en el **Modo de Visualización Superusuario** de `admin` (Sprint 5.1.1), que es la única situación en la que "cambiar de sucursal" tiene sentido operativo hoy (simular distintas tiendas sin tener varios coordinadores reales sembrados). Se documenta esto explícitamente porque cambia el alcance práctico de "toda la vista Coordinador responda al cambio de sucursal": para un Coordinador real, no hay nada que responda porque no hay ningún cambio de tienda que provocar.

## 7-8. Comparación "Despacho en vivo" vs. "Mis trabajos" — por qué uno reacciona y el otro no

| | Mis trabajos (`TrabajosPage.tsx`) | Despacho en vivo (`DespachoPage.tsx`) |
|---|---|---|
| Dato mostrado | `trabajos` (lista completa de la tienda) | `activeJob` (un único trabajo) |
| Origen del dato | `getTrabajosByTienda(tiendaId)`, refetch real | `useOutletContext().activeJob` -- estado en memoria de `OperationalContextProvider` |
| `useEffect` con `tiendaId` en deps | Sí (`[tiendaId, contextoLoading, contextoError]`) | KPIs sí (`getCoordinatorKpis`, mismo patrón); `activeJob` en sí, **no** |
| Efecto de cambiar `sucursalCoord` (modo Superusuario) | `tiendaId` cambia → el `useEffect` vuelve a ejecutar `getTrabajosByTienda` → la lista se actualiza correctamente a la nueva tienda | `tiendaId` cambia → los KPIs sí se refrescan correctamente, pero `activeJob` sigue siendo exactamente el mismo objeto en memoria -- nada lo invalida ni lo refresca |

**Explicación técnica exacta**: "Mis trabajos" reacciona porque su dato (`trabajos`) se **deriva** de `tiendaId` mediante un `useEffect` que lo tiene como dependencia -- cada cambio de `tiendaId` dispara una consulta real nueva. "Despacho en vivo" reacciona parcialmente: sus KPIs siguen exactamente el mismo patrón (por eso sí se actualizan), pero el trabajo mostrado (`activeJob`) **no se deriva de `tiendaId` en absoluto** -- es un `useState` independiente, escrito una única vez por el flujo Publish y nunca más, sin ningún efecto que lo relacione con la sucursal activa. Por eso "Despacho en vivo" sigue mostrando exactamente el mismo trabajo sin importar a qué sucursal se cambie: nada en el código existente le indica que debe olvidarlo.

## 9. Qué modificaciones son necesarias

Dado que la única pieza de "Despacho en vivo" que no reacciona es `activeJob` (los KPIs ya reaccionan correctamente, sin cambios necesarios), y que "Radar"/"Respuestas" no tienen ninguna fuente de datos real por tienda todavía (son demo fijo, protegido, y agregarles una no está permitido este Sprint por "no modificar repositorios todavía"/"no modificar comportamiento de Supabase"), la única modificación segura y suficiente es: **limpiar `activeJob` (`setActiveJob(null)`) cada vez que el `tiendaId` efectivamente resuelto cambia.** Esto se implementa dentro del propio `OperationalContextProvider` (el único Contexto ya autorizado, sin duplicar estado ni crear uno nuevo) y, en cascada, corrige "Despacho en vivo"/"Trabajo activo"/"Radar"/"Respuestas" a la vez, porque los 3 últimos solo se renderizan (en `DespachoPage.tsx`, sin tocarlo) dentro de la rama `activeJob !== null` -- al limpiarse, esa página vuelve automáticamente a `CoordinatorEmptyState` para la nueva sucursal, en vez de arrastrar el trabajo de la sucursal anterior.

## Implementación realizada

Único archivo de código modificado: `src/providers/OperationalContextProvider.tsx`.

1. Se extrajo `tiendaId` (antes calculado inline, duplicado, dentro de las 2 ramas del `useMemo` de `value`) a una única constante calculada una vez por render, con la misma expresión exacta de siempre (`requiereResolucionSuperusuario ? resuelto.tiendaId : (profile?.tiendaId ?? null)`) -- cero cambio de valor resultante, solo se eliminó la duplicación para poder observarlo.
2. Se agregó un nuevo `useEffect(() => { setActiveJob(null); }, [tiendaId])`.
3. Las 2 ramas de `value` (`useMemo`) ahora referencian la constante `tiendaId` en vez de recalcularla -- mismo resultado, sin duplicación.
4. La dependencia `tiendaId` se agregó al arreglo de dependencias del `useMemo` de `value` (ya cubierta transitivamente por `resuelto`/`profile`, agregada explícitamente por prolijidad con `exhaustive-deps`).

**Por qué es seguro para un Coordinador real**: `tiendaId` nunca cambia durante su sesión (viene fijo de `profile.tiendaId`) -- el nuevo `useEffect` se ejecuta una vez al montar (con `activeJob` ya en `null`, un no-op) y nunca más. Cero cambio de comportamiento observable para ese caso, igual que todos los ajustes anteriores a este Provider.

**Por qué no se generan falsos "vaciados" durante la resolución asíncrona del Superusuario**: mientras `resolveSuperusuarioTienda()` está en curso (`loading === true`), `resuelto.tiendaId` **no se resetea a `null`** al iniciar la consulta -- conserva su valor anterior hasta que la nueva respuesta llega, momento en el que pasa directamente del `tiendaId` viejo al nuevo (una única transición limpia, sin parpadeo intermedio a `null`).

## Qué NO se implementó (y por qué)

- **"Radar"/"Respuestas" con datos reales por tienda**: no existe ninguna consulta a Supabase para esto todavía (son demo fijo desde el Sprint 5.2.1, deliberadamente protegido). Agregar una requeriría una consulta/repositorio nuevo -- explícitamente fuera de alcance ("no modificar repositorios todavía"). Se resuelve indirectamente: al limpiarse `activeJob`, estos 2 bloques dejan de mostrarse en absoluto para una sucursal sin trabajo activo (en vez de seguir mostrando el demo fijo de la sucursal anterior), que es el máximo alcance seguro sin nueva plomería de datos.
- **El badge de sucursal del Header**: seguir sin corregirse -- corregirlo exige pasarle `sucursalActiva` a `<Header/>` dentro de `CoordinatorLayout.tsx`, un archivo que este mismo brief prohíbe modificar ("NO modificar componentes"/`Header` está en la lista histórica de "No modificar" de Sprints anteriores). Se documenta como hallazgo, no se corrige.
- Ninguna policy RLS, tabla, repositorio, o comportamiento de Supabase se tocó.

## Archivos modificados

- `src/providers/OperationalContextProvider.tsx` (único archivo de código).
- `PROJECT_STATUS.md`, `CHANGELOG.md`, `docs/SPRINTS_INDEX.md`.
- `docs/architecture/frontend/SPRINT_5_2_3_SUCURSAL_CONTEXT_REPORT.md` (este archivo, nuevo).

## Confirmación de restricciones respetadas

Sin cambios de UI/estilos (`globals.css` sin tocar), sin cambios de componentes (`SucursalSelect`/`Header`/`HeaderStatus`/`JobSummaryCard`/`LiveDispatchCard`/`ResponsesPanel`/`JobIndicadoresCard`/`CoordinatorKpiRow` -- ninguno modificado), sin cambios de comportamiento de Supabase (ninguna query nueva, ninguna existente modificada), sin cambios de RLS/Policies, sin cambios de tablas, sin cambios de repositorios (`trabajos.repository.ts` intacto), sin tocar Instaladores/Admin/Auth. Ningún Context/Provider nuevo -- se reutilizó exclusivamente `OperationalContextProvider` ya existente, sin duplicar estado.

## 10. Validación

`tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0` ejecutado tras el cambio (`/tmp/tsc_5_2_3.log`): los únicos 2 diagnósticos en `OperationalContextProvider.tsx` son `TS2307`/`TS2875` ("Cannot find module 'react'"/JSX runtime) -- artefactos ya conocidos de este entorno sin `node_modules` (idénticos, mismo patrón, en cualquier otro archivo `.tsx` del proyecto). Cero `TS6133` (variable/import sin usar) en todo el proyecto, cero errores de sintaxis (`TS1005`/`TS1128`/`TS1109`/`TS1381`/`TS17008`) -- consistente con la disciplina de verificación ya establecida en Sprints anteriores. `npm run lint`/`npm run typecheck`/`npm run build` reales quedan pendientes de ejecución en el entorno del usuario (sin `node_modules`/red en este entorno de trabajo).

**Pendiente**: que el usuario ejecute `npm run lint && npm run typecheck && npm run build` en su entorno y confirme en verde, y valide visualmente (Modo Superusuario `admin` → "Coordinador" → publicar un trabajo en la sucursal A → cambiar `SucursalSelect` a la sucursal B → confirmar que "Despacho en vivo" vuelve a `CoordinatorEmptyState` en vez de seguir mostrando el trabajo de A).
