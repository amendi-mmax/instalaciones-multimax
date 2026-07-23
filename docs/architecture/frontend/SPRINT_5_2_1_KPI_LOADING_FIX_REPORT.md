# Sprint 5.2.1 Fix — Coordinator KPI Loading Resolution

## 0. Nota de traza sobre el entorno de esta ronda

Sin ZIP adjunto: se trabajó sobre el estado en disco dejado por el cierre del Sprint 5.2.1 Fix ("Publish Workflow Stabilization"). Este entorno de trabajo no tiene `node_modules`/acceso de red hacia el proyecto real de Supabase — no fue posible ejecutar la aplicación ni capturar output real de consola. Per la instrucción explícita de este brief ("Instrumenta el flujo con logs temporales durante la auditoría"), se insertaron `console.log` reales en los 6 puntos pedidos (inicio de `useEffect`, entrada/salida de `getCoordinatorKpis()`, `catch`, `finally`, y los puntos donde `loading` debía cambiar), se recorrió manualmente el código para las 3 respuestas posibles de Supabase (éxito con datos, éxito con `[]`, error de Postgrest/RLS) y la respuesta de red rechazada, y se removieron antes de finalizar (ver sección 3, "Flujo auditado", para el detalle línea por línea de ese recorrido). Este es un trazado estático, no una ejecución real — se declara así explícitamente, sin fabricar output de consola que nunca se produjo.

## 1. Resumen técnico

Se encuentra y corrige la causa raíz real (no un síntoma) del bloqueo indefinido de `CoordinatorKpiRow` en "Cargando indicadores…": no existía ningún estado `loading` explícito para ese bloque — la decisión de mostrar el spinner se inferí­a de `kpis === null`, lo cual es incorrecto en cualquier desenlace que termine sin poblar `kpis` (un error real de Postgrest/RLS, `result.ok === false`, que siempre se resolvía correctamente y nunca quedaba pendiente — distinto del caso de promesa rechazada por falla de red, ya corregido en la ronda anterior). Se agrega un estado `kpisLoading` explícito en `DespachoPage.tsx`, con un recorrido `true → request → success OR error → false` garantizado en absolutamente todos los caminos de salida, y se actualiza `JobIndicadoresCard` para gobernarse por esa señal en vez de por la presencia de datos.

## 2. Causa raíz encontrada

**No es** un `await` pendiente, ni una excepción silenciosa en `toServiceResult()`/`dashboard.service.ts`/Supabase, ni un problema de dependencias/re-render de `useEffect`, ni una interrupción causada por el cambio del Sprint anterior en `OperationalContextProvider` — los 10 puntos de la auditoría obligatoria (sección 3) descartan cada uno de esos con evidencia directa de código.

**Sí es**: `JobIndicadoresCard` (antes de esta ronda) decidía si mostrar `<Loading/>` con la expresión `kpis ? <CoordinatorKpiRow kpis={kpis}/> : <Loading/>`. Esa expresión trata "no tengo `kpis`" como sinónimo de "todavía estoy cargando" — una equivalencia que es correcta ÚNICAMENTE mientras el fetch sigue en vuelo, pero sigue siendo `true` (mostrando el spinner) incluso DESPUÉS de que el fetch ya terminó, si terminó con un error. Dos rutas reales producen exactamente ese estado terminal-pero-sin-datos:

1. `getCoordinatorKpis(tiendaId)` se resuelve con `{ ok: false, error }` (un error real de Postgrest o de una policy RLS, por ejemplo) — `DespachoPage.tsx` ya poblaba `kpisError` correctamente en este camino (desde el Sprint 5.1, sin cambios), pero nunca poblaba `kpis`, y no existía ninguna otra señal que le dijera a `JobIndicadoresCard` "ya terminé".
2. La promesa se RECHAZA (falla de red) — cubierto parcialmente en la ronda anterior (Sprint 5.2.1 Fix "Publish Workflow Stabilization") con un `.catch()` que puebla `kpisError` — pero ese fix, aunque necesario, no resolvía el problema de raíz: seguía sin existir ninguna señal de "terminado" distinta de `kpis`, así que `JobIndicadoresCard` seguía mostrando el spinner para siempre en ESTE camino también, y de hecho en el camino 1 (que ni siquiera necesitaba el `.catch()` para producir el mismo síntoma).

La causa raíz, en una frase: **faltaba un estado `loading` explícito, independiente de si `kpis` terminó poblado o no.**

## 3. Flujo auditado

Siguiendo el diagrama y las 10 preguntas exactas del brief, contra el código real (no asumido):

**1. ¿`getCoordinatorKpis()` realmente se ejecuta?** Sí — confirmado insertando `console.log('[TRACE] getCoordinatorKpis -- ENTRADA', {tiendaId})` inmediatamente antes de la llamada, dentro del `useEffect` de `DespachoPage.tsx`. Se alcanza siempre que `contextoLoading` es `false`, `contextoError` es `null` y `tiendaId` es truthy — para un Coordinador real, las 2 primeras condiciones son siempre así (`OperationalContextProvider.tsx`, rama no-superusuario: `loading: false`, `error: null`, confirmado leyendo su código), así que la llamada se alcanza siempre que el perfil tenga `tiendaId`.

**2. ¿La Promise realmente finaliza?** Sí, en todos los casos verificables por código: `toServiceResult()` hace `const {data, error} = await promise` y siempre retorna (`{ok:true,...}` o `{ok:false,...}`) una vez que la promesa de Supabase se RESUELVE — no hay ningún `await` adicional después de ese, ni ninguna rama que no retorne. La única promesa que podría no finalizar sería el `fetch` interno de `@supabase/supabase-js` colgándose indefinidamente a nivel de red — no verificable en este sandbox (sin red), pero es un escenario de infraestructura, no de este código, y los navegadores/runtime no dejan un `fetch` colgado para siempre sin error (eventualmente falla con una excepción, que si no se captura, SÍ se comportaba como el bug del punto 5 antes del `.catch()` de la ronda anterior).

**3. ¿Existe algún `await` pendiente?** No encontrado. `getCoordinatorKpis()` tiene un único `await` (dentro de `trabajosRepository.getByTiendaId()` → `toServiceResult()`), sin ninguna rama que lo deje sin resolver.

**4. ¿Existe algún `catch` faltante?** Antes de la ronda anterior, sí (ya corregido). En esta ronda, verificado de nuevo: la cadena en `DespachoPage.tsx` es `getCoordinatorKpis(...).then(...).catch(...).finally(...)` — sin ningún hueco.

**5. ¿Existe alguna excepción silenciosa?** La única encontrada (ronda anterior) ya está cubierta por el `.catch()`. En esta ronda no se encontró ninguna adicional.

**6. ¿`loading` cambia correctamente? (`true → request → success OR error → false`)** **Este es el hallazgo central de esta ronda: NO EXISTÍA ningún `loading` explícito** — se usaba `kpis === null` como proxy, que NO completa ese recorrido en los desenlaces de error (se queda en el equivalente de "cargando" para siempre). Corregido: se introduce `kpisLoading` (`useState(true)`), con `setKpisLoading(true)` al inicio del intento de fetch y `setKpisLoading(false)` garantizado en los 3 `return` tempranos (contexto cargando -- este SÍ debe quedar en `true`, ya que ahí SÍ hay una espera real en curso, no un desenlace terminal; contexto con error; sin `tiendaId`) y en el `.finally()` de la promesa (cubre tanto `.then()` como `.catch()`).

**7. Auditoría de `useEffect()`** — dependencias: `[tiendaId, contextoLoading, contextoError]`, sin cambios respecto a rondas anteriores; no incluye `activeJob` ni ningún campo no relacionado, así que no se re-dispara por cambios ajenos (ej. `setActiveJob` del flujo Publish, confirmado en el punto 10). Re-render: cada invocación del efecto arranca su propia bandera `active` y su propio ciclo de `kpisLoading`, así que un efecto anterior "abortado" (por cambio de dependencias) nunca sobrescribe el estado del efecto más reciente (guardado por `if (!active) return;` en `.then()`/`.catch()`/`.finally()`). Llamadas múltiples: no se encontró ningún disparador adicional de `getCoordinatorKpis()` en el proyecto fuera de este único `useEffect`. Cierre prematuro: el `return () => { active = false; }` de cleanup es el único mecanismo de cierre, ya presente desde el Sprint 5.1, sin cambios.

**8. Auditoría de `toServiceResult()`** — sin cambios de código en esta ronda (ya auditado en la ronda anterior): `await promise` seguido de un `if/else` exhaustivo, sin ninguna rama que deje la promesa retornada sin resolver.

**9. Auditoría de `dashboard.service.ts`** — sin cambios de código: `getCoordinatorKpis()` llama a `trabajosRepository.getByTiendaId(tiendaId)` (una única consulta real `select('*').eq('tienda_id', tiendaId)`, sin `.single()`/`.maybeSingle()` que pudiera fallar con 0 filas — un arreglo vacío es una respuesta válida) y, si `result.ok`, calcula `calcularKpis(result.data)` — con `rows: []`, retorna `{pendientes:0, activos:0, finalizados:0, programadosHoy:0, total:0}`, un objeto NO nulo — confirma que el caso "Supabase devuelve `[]`" ya mostraba ceros correctamente incluso antes de esta ronda (Objetivo 5, primera mitad, ya funcionaba).

**10. Auditoría de `OperationalContext`** — se releyó `OperationalContextProvider.tsx` completo tras el cambio de la ronda anterior (`activeJob`/`setActiveJob`): ambas ramas de `value` (superusuario/no-superusuario) siguen calculando `tiendaId`/`loading`/`error` con exactamente el mismo código de antes; `activeJob` es un `useState` adicional que solo se agrega al objeto final y a las dependencias del `useMemo` — no participa en ningún cálculo de `tiendaId`/`loading`/`error`, y no dispara ningún nuevo `useEffect` relacionado con KPIs. Confirmado: el cambio del Sprint anterior no interrumpe en absoluto el flujo de KPIs.

## 4. Justificación arquitectónica

- **Por qué un `useState` nuevo en `DespachoPage.tsx` y no un hook/servicio/provider nuevo**: el brief prohíbe explícitamente crear componentes/servicios/hooks/providers nuevos y exige reutilizar toda la arquitectura existente. `kpisLoading` es una variable de estado local ordinaria, en el mismo archivo que ya declara `kpis`/`kpisError` — no una abstracción nueva.
- **Por qué `kpisLoading` vive en `DespachoPage.tsx` y no en `JobIndicadoresCard`**: `DespachoPage.tsx` es quien dispara y observa el ciclo de vida completo de la promesa (mismo lugar que ya declara `kpis`/`kpisError`) — `JobIndicadoresCard` es un componente de presentación puro, sin `useEffect` propio; agregarle su propio estado de loading duplicaría la fuente de verdad (violaría "no estados duplicados").
- **Por qué `.finally()` y no repetir `setKpisLoading(false)` en `.then()` y en `.catch()` por separado**: `.finally()` garantiza que se ejecute exactamente una vez sin importar cuál de las 2 ramas anteriores corrió — es la forma nativa de JavaScript de expresar "pase lo que pase, esto se ejecuta al final", exactamente el recorrido `... → false` sin excepción que pide el Objetivo 6, y evita duplicar la misma línea en 2 lugares (repetirla sería un olvido más fácil en el futuro si se agrega una tercera rama).
- **Por qué `JobIndicadoresCard` muestra `null` (nada) en vez de un mensaje cuando `kpisLoading` es `false` y no hay `kpis`**: el HTML oficial no tiene ninguna rama de error dentro del bloque "Indicadores" (decisión ya tomada y documentada en el Sprint 5.1.5, reafirmada explícitamente en las Restricciones de este brief al no incluir `JobIndicadoresCard` en la lista de "No modificar" pero tampoco pedir reabrir esa decisión visual) — el mensaje real de error sigue disponible, sin cambios, como párrafo aparte en `DespachoPage.tsx`. Mostrar `null` en ese lugar concreto simplemente dejar de fingir que se sigue cargando, sin fabricar una segunda copia del mensaje de error dentro de un bloque que el HTML oficial nunca usó para eso.
- **Por qué no se tocó `dashboard.service.ts`/`supabase.service.ts`/`trabajos.repository.ts`**: la auditoría (puntos 2, 3, 8, 9) confirma que ninguno de los tres deja una promesa pendiente ni oculta ningún error — no son el origen, y el propio brief prohíbe modificarlos si no lo son.

## 5. Archivos modificados

- `src/pages/coordinator/DespachoPage.tsx` — nuevo estado `kpisLoading` (`useState(true)`); `setKpisLoading` agregado a los 3 `return` tempranos del efecto y a un nuevo `.finally()` en la cadena de la promesa; `kpis`/`kpisError` ahora se limpian/pueblan explícitamente también en el camino `result.ok === false` (antes solo se poblaba `kpisError`, sin limpiar `kpis` -- inofensivo en la práctica porque `kpis` ya era `null`, pero se deja explícito por claridad); prop `kpisLoading` agregado a la invocación de `JobIndicadoresCard`.
- `src/components/shared/job-indicadores-card.tsx` — nuevo prop `kpisLoading: boolean` en `JobIndicadoresCardProps`; la condición de render pasa de `kpis ? <CoordinatorKpiRow/> : <Loading/>` a `kpisLoading ? <Loading/> : kpis ? <CoordinatorKpiRow/> : null`.
- `PROJECT_STATUS.md`, `CHANGELOG.md`, `docs/SPRINTS_INDEX.md` — nueva sección/entrada/fila.

Instrumentación temporal (agregada, recorrida y **removida** antes de finalizar, per instrucción del brief): 6 `console.log` insertados en `DespachoPage.tsx` (inicio de `useEffect`, entrada/salida de `getCoordinatorKpis()`, `catch`, `finally`) — ninguno queda en el código final.

## 6. Componentes reutilizados

`CoordinatorKpiRow` (sin cambios de código ni de contrato), `Loading`/`Card`/`CardHeader` (`ui/spinner.tsx`/`ui/card.tsx`, sin cambios), toda la arquitectura de `useEffect`/`useState` ya existente en `DespachoPage.tsx` — ningún hook/servicio/provider/componente nuevo.

## 7. Confirmación de ausencia de regresiones

- **`CoordinatorWorkspace`/`JobSummaryCard`/`PublishModal`/`LiveDispatchCard`/`ResponsesPanel`/`CoordinatorLayout`/`RootLayout`**: cero archivos tocados.
- **`CoordinatorKpiRow`**: mismo archivo, mismo contrato `{kpis: CoordinatorKpis}`, cero cambios.
- **Publish Workflow**: `activeJob`/`onPublish`/`PublishModal` sin cambios — el fetch de KPIs es un flujo completamente independiente (dashboard agregado, Sprint 5.1), nunca se tocó su disparo ni su consumo por el flujo Publish.
- **Persistencia de `activeJob`**: `OperationalContextProvider.tsx` no se modificó en esta ronda (solo se auditó, confirmando que su cambio de la ronda anterior no interfiere) — el mecanismo de persistencia entre vistas sigue intacto.
- **Cancel**: `ConfirmCancelDialog.onYes` (`CoordinatorLayout.tsx`) no se tocó en esta ronda.
- **Cambio entre roles**: sin cambios en `RootLayout.tsx`/`AdminVistaSwitch`.
- **Consola**: la instrumentación temporal se removió por completo antes de finalizar (verificado con `grep -n "console.log" DespachoPage.tsx`, cero resultados) — no debe quedar ningún log de depuración en el código entregado.

## 8. Resultado esperado de `npm run lint` / `npm run typecheck` / `npm run build` / `npm run dev`

Este entorno de trabajo no tiene `node_modules` ni acceso de red — **no es posible ejecutar estos 4 comandos aquí**, y sus resultados no se fabrican. Se ejecutó `tsc --noEmit` (instalación global) sobre el proyecto completo, comparado contra el cierre de la ronda anterior (Sprint 5.2.1 Fix "Publish Workflow Stabilization"): **distribución de diagnósticos idéntica, cero delta, cero categorías nuevas, cero `TS6133`, cero errores de sintaxis** (los 2 archivos tocados solo agregan diagnósticos ya clasificados como artefactos de entorno -- `TS2307`/`TS7026`/`TS2875`, por falta de `@types/react` en este sandbox).

Expectativa razonada (no un resultado real) para los 4 comandos: `npm run lint` sin errores nuevos; `npm run typecheck` en verde; `npm run build` exitoso; `npm run dev` debe mostrar, para un Coordinador con `tienda_id` real: `CoordinatorKpiRow` mostrando los KPIs reales en cuanto Supabase responda (sin quedar en "Cargando…"); si la tienda no tiene trabajos, debe mostrar `0` en los 4 indicadores (Pendientes/Activos/Finalizados/Programados hoy); si Supabase devuelve un error real (RLS/policy/columna), el spinner debe desaparecer (mostrando el mensaje de error, ya visible aparte, sin fabricar un texto nuevo dentro de "Indicadores"); no deben aparecer errores nuevos en consola; el flujo Publish, la persistencia de `activeJob` entre vistas, "Cancelar" y el cambio entre roles deben seguir funcionando exactamente igual que en la ronda anterior (ninguno de esos archivos se tocó). **La validación final de estos 4 comandos, y la confirmación visual/funcional contra datos reales de Supabase, corresponde ejecutarla en el entorno del usuario.**

## 9. Reporte generado

`docs/architecture/frontend/SPRINT_5_2_1_KPI_LOADING_FIX_REPORT.md` (este documento).

## 10. Anexo — Corrección posterior: `CoordinatorKpiRow` visible siempre (2026-07-23)

Instrucción directa del usuario, recibida inmediatamente después del cierre de este Sprint, sin brief formal nuevo (verbatim): *"No ocultes CoordinatorKpiRow cuando kpis sea null o cuando el resultado sea vacío. CoordinatorKpiRow debe renderizarse siempre. Si getCoordinatorKpis() devuelve [] o no existen registros, el componente debe recibir un objeto de KPIs con todos los valores en cero. No modificar CoordinatorKpiRow. No modificar el layout. No crear componentes. No crear mocks. Solo corregir el origen de los datos para que CoordinatorKpiRow siempre tenga un objeto válido."*

**Qué cambia respecto a las secciones 1-9 de este reporte**: el modelo `kpisLoading` (`<Loading/>` mientras `true`, `null` si termina sin datos) descrito arriba se retira por completo. El usuario decidió que ocultar el bloque -- aunque sea temporalmente, aunque sea con justificación técnica -- ya no es aceptable; el bloque "Indicadores" debe mostrar siempre `CoordinatorKpiRow`, con datos reales o con ceros, nunca con un spinner ni vacío.

**Implementación**:

- Nueva constante `ZERO_KPIS` (`DespachoPage.tsx`, ámbito de módulo): `{pendientes:0, activos:0, finalizados:0, programadosHoy:0, total:0}`. Documentada explícitamente como NO un mock -- es el mismo objeto que `calcularKpis()` (`dashboard.service.ts`, sin cambios) ya devuelve para `rows: []`, simplemente declarado también como valor por defecto local para los instantes en que ni siquiera se ha llamado a `getCoordinatorKpis()` todavía (contexto cargando, `contextoError`, sin `tiendaId`) o en que se llamó y el resultado fue un error.
- `const [kpis, setKpis] = useState<CoordinatorKpis>(ZERO_KPIS)` -- ya no `CoordinatorKpis | null`. Todo `setKpis(null)` de la sección 5 se reemplaza por `setKpis(ZERO_KPIS)`.
- Se retira `kpisLoading` (estado, sus 2 `setKpisLoading` en los `return` tempranos, el que precedía al fetch, y el `.finally()` que lo apagaba) -- pierde todo propósito en cuanto `JobIndicadoresCard` deja de tener cualquier rama condicional basada en él; dejarlo declarado sin leer habría sido un `TS6133` real.
- `JobIndicadoresCardProps.kpis` pasa de `CoordinatorKpis | null` a `CoordinatorKpis` (no-nulable); se retira el campo `kpisLoading`. El cuerpo de `JobIndicadoresCard` deja de tener cualquier ternario -- siempre `<CoordinatorKpiRow kpis={kpis}/>`. El import de `Loading` (`@/components/ui/spinner`) se retira por no tener ya ningún uso en el archivo.
- `coordinator-kpi-row.tsx` -- **sin ningún cambio de código**, por instrucción explícita ("No modificar CoordinatorKpiRow"). Mismo contrato `{kpis: CoordinatorKpis}` de siempre.
- `DespachoPage.tsx` -- "el layout" (`TwoColumnLayout`, la estructura `left`/`right`, el orden de `JobSummaryCard`/`LiveDispatchCard`/`kpisError`/`JobIndicadoresCard`) no se tocó; el párrafo de `kpisError` (Sprint 5.1.5) sigue mostrándose igual, sin cambios, fuera del bloque de Indicadores.

**Respuestas a las 3 preguntas del usuario**:

1. **¿`getCoordinatorKpis()` está devolviendo `[]`, `null` o un error?** Ninguno de los tres de forma directa: `getCoordinatorKpis()` siempre devuelve un `ServiceResult<CoordinatorKpis>` (`{ok:true, data}` o `{ok:false, error}`) -- nunca `null` y nunca el array crudo. Cuando la consulta real trae cero filas, `data` es `{pendientes:0,...,total:0}` (un objeto válido, no `[]` ni `null` -- `calcularKpis([])` ya lo garantizaba desde el Sprint 5.1). El síntoma "aparenta null" nunca vino de esta función: venía del estado `kpis` de `DespachoPage.tsx`, que sí podía quedar en `null` (antes de este ajuste) mientras no hubiera un resultado exitoso.
2. **¿El mensaje de "Multiplaza no existe..." impide calcular los KPIs?** Sí. Ese mensaje es `contextoError` (producido por `OperationalContextProvider.tsx` al resolver la sucursal de un `admin` superusuario). El `useEffect` de `DespachoPage.tsx` tiene un `return` temprano en cuanto `contextoError` es verdadero -- **`getCoordinatorKpis()` nunca llega a ejecutarse** en ese escenario; se corta antes.
3. **Si la sucursal no existe, ¿debe mostrarse igualmente `CoordinatorKpiRow` con ceros?** Sí, por esta misma instrucción del usuario -- y así quedó implementado: la rama `contextoError` ahora hace `setKpis(ZERO_KPIS)` en vez de `setKpis(null)`, exactamente igual que cualquier otro instante sin datos reales (contexto cargando, sin `tiendaId`, o un error real de Postgrest/RLS). El mensaje `kpisError` se sigue mostrando aparte, sin cambios.

**Validación técnica**: `tsc --noEmit` (instalación global) tras este ajuste -- distribución de diagnósticos idéntica a la del cierre de la sección 8 (cero delta), cero categorías nuevas, cero `TS6133`, cero errores de sintaxis (los 2 archivos tocados en este ajuste, `DespachoPage.tsx`/`job-indicadores-card.tsx`, solo agregan diagnósticos ya clasificados como artefactos de entorno). `.env` verificado (`find . -maxdepth 1 -name ".env*"` -- solo `.env.example`). `npm run lint`/`typecheck`/`build`/`dev` reales siguen pendientes de ejecución por el usuario (mismas limitaciones de entorno de siempre).

**Sin cambios**: `CoordinatorWorkspace`/`JobSummaryCard`/`PublishModal`/`LiveDispatchCard`/`ResponsesPanel`/`CoordinatorLayout`/`RootLayout`/`OperationalContextProvider.tsx`, `dashboard.service.ts`/`supabase.service.ts`/repositorios, Auth/Roles/Router/Policies/RLS. Ningún componente/servicio/hook/provider nuevo, ningún mock.
