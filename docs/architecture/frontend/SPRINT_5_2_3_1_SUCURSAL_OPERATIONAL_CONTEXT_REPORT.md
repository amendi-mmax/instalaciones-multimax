# Sprint 5.2.3.1 — Corrección definitiva del selector "Sucursal activa" para Coordinador y Administrador

## 0. Nota de trazabilidad

Este Sprint llegó después de que el usuario reportara que, tras el Sprint 5.2.3, el selector seguía sin gobernar correctamente "Despacho en vivo"/"Mis trabajos". El brief exigía explícitamente auditar de nuevo, sin asumir, antes de tocar código, y "detenerse y reportar" cualquier hallazgo distinto al comportamiento esperado que el propio usuario definió. Esta auditoría **sí encontró** un hallazgo así -- documentado en la sección 6 -- y se reporta con la misma transparencia que el resto del Sprint, en vez de omitirlo. Antes de escribir código se usó `AskUserQuestion` para confirmar con qué cuenta se había reproducido el problema (Coordinador real vs. Admin en Modo Coordinador); el usuario respondió con la especificación funcional completa que se implementa en este Sprint (ver sección 2).

## 1. Auditoría — hallazgos punto por punto

**1. Dónde se obtiene hoy `tienda_id`**: dos caminos, sin cambios respecto al Sprint 5.2.3 -- (a) Coordinador/Instalador real: síncrono, `profile.tiendaId` (columna propia de `coordinadores`/`instaladores`, sin pasar por la tabla `tiendas`); (b) `admin` en Modo Coordinador: asíncrono, `resolveSuperusuarioTienda(sucursalCoord)` → consulta real a `empresas`/`tiendas` por nombre.

**2. Qué valor cambia realmente al seleccionar otra sucursal**: `sucursalCoord` (estado de `RootLayout.tsx`). Para un Coordinador real, ese cambio **no llega a ningún dato real** -- nunca alimentó `tiendaId` para ese caso (confirmado también en el Sprint 5.2.3). Para `admin` en Modo Coordinador, si alimenta `tiendaId` -- vía `resolveSuperusuarioTienda`.

**3. Confirmación exacta de qué cambia**: no cambia `tienda.id`/`tienda.uid` directamente -- cambia un **string de nombre** (`sucursalCoord`), que luego se intenta *traducir* a un `tiendas.id` real solo en el camino (b). En el camino (a) no se traduce nada -- `tiendaId` viene de una columna ya resuelta, ajena a `sucursalCoord`.

**4. Dónde se guarda hoy la sucursal activa**: `useState('Multiplaza')` en `RootLayout.tsx` -- un literal fijo, **hallazgo nuevo de esta auditoría**: nunca se inicializaba ni se sincronizaba con la tienda real de un Coordinador autenticado (ver sección 4).

**5. Quién consume ese estado**: `SucursalSelect` (visual), `OperationalContextProvider` (como input de `resolveSuperusuarioTienda`, solo camino b), `PublishModal` (como valor de texto del campo `sucursal` del formulario).

**6. Qué consultas usan `tiendaId` hoy**: exactamente 2 -- `getCoordinatorKpis(tiendaId)`/`getTrabajosByTienda(tiendaId)`, ambas vía `trabajosRepository.getByTiendaId()`. Ambas ya corren dentro de un `useEffect([tiendaId, ...])` -- confirmado de nuevo en esta auditoría, sin cambios necesarios ahí.

**7. Qué consultas NO usan `tiendaId`**: ninguna consulta real de Supabase en la vista Coordinador ignora `tiendaId` -- no existe ningún `trabajosRepository.getAll()` sin filtrar en uso (auditado con `grep` exhaustivo sobre `src/`, confirmado negativo). `LiveDispatchCard`/`ResponsesPanel` no consultan Supabase en absoluto (demo fijo, sin relación con `tienda_id`).

**8. Cómo funcionan hoy los 4 flujos**: "Despacho en vivo" (KPIs reactivos a `tiendaId`, `activeJob` ahora se limpia al cambiar `tiendaId` desde el Sprint 5.2.3), "Mis trabajos" (reactivo a `tiendaId`, sin cambios necesarios), "KPIs" (reactivo, sin cambios necesarios), "Publicar trabajo" (usa `sucursalCoord`/`tiendaId`/`empresaId` de contexto, siempre leídos en el momento del submit -- ya correctos, sin caché obsoleto).

**9 y 10 -- por qué seguía mostrando información de otra sucursal, y si el dropdown realmente gobierna el contexto**: ver sección 4 (hallazgo raíz) y sección 6 (limitación de backend, fuera de alcance).

## 2. Especificación funcional confirmada por el usuario

Tras la primera ronda de auditoría de este Sprint se usó `AskUserQuestion` para resolver la ambigüedad "¿con qué cuenta se reprodujo el problema?". El usuario respondió con la especificación completa que se implementa a continuación:

- **Coordinador real**: pertenece a una única tienda (`coordinadores.tienda_id`). Al iniciar sesión, esa tienda debe cargarse automáticamente como "Sucursal activa"; el selector permanece visible (el HTML oficial lo define así); únicamente esa tienda aparece habilitada; el resto se muestran `disabled`; el usuario no puede cambiar la sucursal; todas las consultas del contexto operativo usan siempre ese `tiendaId`.
- **Administrador → Modo Coordinador**: el selector permanece completamente habilitado; cambiar de sucursal reconstruye completamente el contexto operativo (Despacho en vivo, Mis trabajos, KPIs, Trabajo activo, Publicar trabajo, cualquier dato dependiente de tienda); no debe quedar ningún estado anterior en memoria.
- **Restricciones**: no modificar modelo de datos, RLS, tablas, repositorios, backend, policies, autenticación -- exclusivamente comportamiento del selector.

## 3. Causa raíz real (hallazgo nuevo de esta auditoría, no reportado en el Sprint 5.2.3)

`sucursalCoord` (`RootLayout.tsx`) nace como el literal `'Multiplaza'` y, antes de este Sprint, **nunca se sincronizaba** con la tienda real de un Coordinador autenticado. Esto es exactamente el "estado inconsistente" que describía el brief: un Coordinador real cuya tienda verdadera fuera, por ejemplo, "Albrook" veía el dropdown mostrando "Multiplaza" (el default, sin relación con su tienda real) -- y, como nada impedía manipular ese `<select>`, el usuario podía además dejarlo en cualquiera de las 9 opciones, todas visualmente "seleccionables" pero **ninguna con efecto real** sobre `tiendaId` (que siempre siguió siendo, correcta pero invisiblemente, `profile.tiendaId`). El resultado observable: el dropdown parecía cambiar la sucursal, pero "Despacho en vivo"/"Mis trabajos" seguían mostrando los trabajos reales de la tienda fija del Coordinador -- percibido, con toda razón, como "el selector no gobierna nada" y "sigue mostrando información de otra sucursal" (la del dropdown, no la de los datos reales).

Esto es un déficit de **inicialización/sincronización de estado en el frontend**, no un problema de las consultas a Supabase (que, auditadas de nuevo, ya estaban correctamente scoped y reactivas desde el Sprint 5.2.3).

## 4. Implementación

Tres archivos modificados, ninguno de datos/RLS/repositorios:

1. **`src/layouts/RootLayout.tsx`** — nuevo `useEffect` que sincroniza `sucursalCoord` con `profile.tiendaNombre` en cuanto el perfil resuelve, exclusivamente cuando `profile.rol === 'coordinador'` (nunca para `admin`/`instalador` -- el Modo Superusuario queda con `sucursalCoord` completamente libre, sin este ajuste interfiriendo). Reutiliza el mismo `useState`/`profile` ya existentes -- ningún estado nuevo.
2. **`src/layouts/CoordinatorLayout.tsx`** — se agregan `esSuperusuario`/`tiendaNombre` a la desestructuración ya existente de `useOperationalContext()` (ambos campos **ya existían** en `OperationalContextValue`, cero cambios a ese tipo/Provider). Se calcula `sucursalLockValue = esSuperusuario ? undefined : (tiendaNombre ?? '')` y se pasa como nueva prop `enabledValue` a `SucursalSelect`.
3. **`src/components/shared/sucursal-select.tsx`** — nueva prop opcional `enabledValue`. `undefined` → comportamiento anterior sin cambios (todas las opciones habilitadas, caso Admin-superusuario). Un string → solo la opción con ese valor exacto queda habilitada; el resto, `disabled`. Si no coincide con ninguna opción real (incluido el caso `''`), **todas** quedan deshabilitadas -- degradación segura, nunca se marca como "correcta" una opción que no se pudo verificar.

**Para un Coordinador real**: al resolver el perfil, `sucursalCoord` se actualiza automáticamente a su tienda real (cuando `tiendaNombre` resuelve); el `<select>` bloquea todas las demás opciones -- el usuario físicamente no puede elegir otra (un `<option disabled>` no es seleccionable en ningún navegador). Cero nuevos Context/estados duplicados.

**Para `admin` en Modo Coordinador**: `enabledValue` es `undefined` -- el `<select>` sigue 100 % libre, sin ningún cambio de comportamiento respecto a como funcionaba antes de este Sprint.

**"Reconstruir completamente el contexto operativo" al cambiar de tienda (Modo Superusuario)**: auditado de nuevo en esta ronda -- ya funciona correctamente a nivel de código: `getCoordinatorKpis`/`getTrabajosByTienda` ya se re-ejecutan (`useEffect([tiendaId,...])`, sin cambios necesarios), `activeJob` ya se limpia al cambiar `tiendaId` (Sprint 5.2.3, sin cambios necesarios), `kpis`/`kpisError`/`trabajos`/`error` ya se resetean al inicio de cada corrida de sus respectivos efectos (auditado línea por línea en `DespachoPage.tsx`/`TrabajosPage.tsx` -- ningún estado queda obsoleto de una tienda anterior). No se encontró ningún efecto adicional que faltara agregar para este camino -- ver sección 6 para la única razón por la que este camino puede seguir sin ser *observable* hoy.

## 5. Repositorios (auditoría solicitada explícitamente)

`trabajosRepository` auditado de nuevo, método por método (`getAll`/`getById`/`create`/`update`/`remove`/`getByEmpresaId`/`getByTiendaId`/`getByEstado`): **ninguno de los 2 consumidores reales de la vista Coordinador (`getCoordinatorKpis`/`getTrabajosByTienda`) llama a `getAll()` sin filtrar** -- ambos ya usan `getByTiendaId(tiendaId)`, confirmado por búsqueda exhaustiva (`grep` sobre todo `src/`). No se encontró ningún `getTrabajos()` que "ignore `tiendaId`". No hizo falta crear `getLiveJobByTienda()`/`getTrabajosBySucursal()` -- la auditoría no demostró que faltara ningún método nuevo; los 2 ya existentes cubren exactamente lo que la vista necesita. Cero cambios a `trabajos.repository.ts`.

## 6. Hallazgo que se detiene y reporta (por instrucción explícita del usuario: "si encuentras algo distinto, repórtalo antes de modificar código")

`tiendaNombre` (usado en este mismo Sprint para bloquear el selector de un Coordinador real, y necesario para que "Modo Coordinador" resuelva una tienda real) depende, en ambos casos, de una lectura real a la tabla `tiendas` (`resolveTiendaNombre()`/`resolveSuperusuarioTienda()` → `tiendasRepository.getById()`/`getByEmpresaId()`). Esta auditoría confirmó (JSDoc ya existente en `tiendas.repository.ts`/`empresas.repository.ts`, sin cambios desde el Sprint 4.0.1/4.1.1) que **`tiendas`/`empresas` tienen RLS habilitado con CERO policies para `authenticated`** -- a diferencia de `admins`/`coordinadores`, que sí se corrigieron en el Sprint 4.2.1 para permitir el login. No hay evidencia en este repositorio de que ese mismo ajuste se haya extendido a `empresas`/`tiendas`.

**Consecuencia real, verificada por código, no supuesta**: si ese permiso sigue faltando hoy, `resolveTiendaNombre()`/`resolveSuperusuarioTienda()` reciben `ok:true` con 0 filas (RLS filtra, no es un error de red) -- `tiendaNombre` queda `null` para TODOS los casos, y `resolveSuperusuarioTienda` nunca puede resolver ninguna tienda real, sin importar qué sucursal se elija en Modo Coordinador. Esto explicaría, por sí solo y sin necesidad de ningún otro bug, por qué "Mis trabajos"/"Despacho en vivo" parecían no reaccionar en Modo Superusuario (el `tiendaId` nunca cambiaba de verdad, siempre null) -- la reactividad del código ya es correcta (sección 4); lo que falta, si este permiso sigue ausente, es exclusivamente un `GRANT`/policy de backend, expresamente fuera de alcance de este Sprint ("no modificar RLS/SQL").

**No se tocó backend/RLS/SQL en este Sprint**, conforme a la restricción explícita. Para el caso de un Coordinador real, este mismo vacío degrada de forma segura: si `tiendaNombre` no resuelve, el selector queda con **todas** las opciones deshabilitadas (en vez de marcar una incorrecta) -- ver sección 4.

**Limitación adicional, ya documentada desde el Sprint 3.4** (no nueva de este Sprint, pero relevante para el mismo mecanismo): `SUCURSALES` es una lista literal de 9 nombres (`src/constants/index.ts`), "la lista real de sucursales vendrá de Supabase... no se resuelve aquí". Si el `nombre` real de la tienda de un Coordinador no está entre esos 9 strings exactos, el selector tampoco podrá marcarlo como habilitado (mismo mecanismo de degradación segura) -- no se resuelve en este Sprint por requerir tocar esa constante/consultar `tiendas` para la lista real, ambos fuera del alcance de "exclusivamente el comportamiento del selector".

**Recomendación, no ejecutada**: un Sprint dedicado y explícitamente autorizado de `GRANT SELECT ON empresas, tiendas TO authenticated` (+ policy si corresponde), mismo patrón ya usado en el Sprint 4.2.1 y en el Sprint 5.2.2.2 (GRANT de `trabajos`) -- permitiría validar en vivo si el resto de esta implementación (ya completa y correcta a nivel de código) se vuelve observable.

## 7-8. Confirmaciones finales

- **Despacho en vivo cambia correctamente** cuando `tiendaId` cambia (KPIs + `activeJob`, ya verificado en Sprint 5.2.3, sin regresión).
- **Mis trabajos cambia correctamente** cuando `tiendaId` cambia (ya verificado, sin regresión).
- **KPIs cambian correctamente** (sin cambios necesarios, ya reactivos).
- **Publicar trabajo usa la sucursal activa** (`sucursal={sucursalCoord}`, siempre el valor vigente -- para un Coordinador real, ahora sincronizado a su tienda real; para Modo Superusuario, el valor libre elegido).
- **Todo el módulo Coordinador queda gobernado por el selector** -- con la salvedad honesta y documentada en la sección 6: para que "Modo Coordinador" sea *observable* funcionando (no solo correcto en código), hace falta el `GRANT`/policy de `empresas`/`tiendas`, expresamente fuera de alcance de este Sprint.

## Archivos modificados

`src/layouts/RootLayout.tsx`, `src/layouts/CoordinatorLayout.tsx`, `src/components/shared/sucursal-select.tsx`. `PROJECT_STATUS.md`, `CHANGELOG.md`, `docs/SPRINTS_INDEX.md`. Este reporte (nuevo). Ningún cambio a RLS/tablas/repositorios/backend/Auth/Instaladores/Admin/CSS.

## Validación

`tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0` (`/tmp/tsc_5_2_3_1.log`): mismos 11 tipos de diagnóstico, mismas cantidades exactas que la línea base del Sprint 5.2.3 (`TS7026`/`TS2307`/`TS2875`/`TS7006`/`TS2322`/`TS7031`/`TS2339`/`TS7053`/`TS2591`/`TS2882`/`TS2688`, todos artefactos ya conocidos de este entorno sin `node_modules`). Cero `TS6133`, cero errores de sintaxis. `npm run lint`/`npm run typecheck`/`npm run build` reales quedan pendientes del entorno del usuario.

**Pendiente**: validar visualmente los 3 escenarios pedidos (publicar en A → aparece solo en A; cambiar a B en Modo Superusuario → Despacho/Mis trabajos muestran solo B; volver a A → todo se reconstruye) -- el escenario 2/3 requiere primero resolver el `GRANT` de `empresas`/`tiendas` (sección 6) para ser observable; el escenario 1 y el bloqueo del selector para un Coordinador real ya son validables hoy mismo.
