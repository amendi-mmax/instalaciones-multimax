# CHANGELOG.md — HANDYMAX · Multimax Despacho

Formato libre, en orden cronológico descendente. Cada entrada corresponde a una sesión/fase de trabajo (desde el Sprint 3.1, a un Sprint).

## [Fase 5 — Corrección — CoordinatorKpiRow visible siempre] — 2026-07-23 — 🟡 En revisión

Corrección puntual, instrucción directa del usuario (sin brief de Sprint nuevo), inmediatamente posterior al cierre de "Coordinator KPI Loading Resolution": **"No ocultes CoordinatorKpiRow... debe renderizarse siempre"**. Detalle técnico completo en el Anexo (sección 10) de `docs/architecture/frontend/SPRINT_5_2_1_KPI_LOADING_FIX_REPORT.md`.

**Motivo**: el modelo `kpisLoading` (`<Loading/>` mientras carga, `null` si termina sin datos) recién introducido seguía "ocultando" el bloque de Indicadores en algunos desenlaces — el usuario decidió que `CoordinatorKpiRow` no debe ocultarse nunca, y que el fix debe vivir únicamente en el origen de los datos.

### Añadido

- `ZERO_KPIS` (constante local, `DespachoPage.tsx`) — objeto `CoordinatorKpis` con los 5 campos en cero; no es un mock, es el mismo objeto que `calcularKpis()` ya devuelve para `rows: []`. Es ahora el valor por defecto de `kpis` en todo instante sin datos reales.

### Modificado

- `src/pages/coordinator/DespachoPage.tsx` — `kpis` pasa de `CoordinatorKpis | null` a `CoordinatorKpis` (no-nulable), inicializado en `ZERO_KPIS`; todos los `setKpis(null)` se reemplazan por `setKpis(ZERO_KPIS)`; se retira el estado `kpisLoading` y su `.finally()` (sin más propósito); se retira el prop `kpisLoading` de la invocación de `JobIndicadoresCard`.
- `src/components/shared/job-indicadores-card.tsx` — `JobIndicadoresCardProps.kpis` pasa a `CoordinatorKpis` (no-nulable); se retira `kpisLoading` del contrato; el render deja de tener cualquier rama condicional — siempre `<CoordinatorKpiRow kpis={kpis}/>`; se retira el import de `Loading` (sin más uso en el archivo).

### Sin cambios

`src/components/shared/coordinator-kpi-row.tsx` (instrucción explícita del usuario — mismo contrato `{kpis: CoordinatorKpis}`, cero cambios de código), `CoordinatorWorkspace`/`JobSummaryCard`/`PublishModal`/`LiveDispatchCard`/`ResponsesPanel`/`CoordinatorLayout`/`RootLayout`, `dashboard.service.ts`/`supabase.service.ts`/repositorios, `OperationalContextProvider.tsx`. Ningún componente/servicio/hook/provider nuevo, ningún mock.

**Validación técnica**: `tsc --noEmit` (instalación global) — distribución de diagnósticos idéntica al cierre de la ronda anterior (cero delta), cero categorías nuevas, cero `TS6133`, cero errores de sintaxis. `npm run lint`/`typecheck`/`build`/`dev` reales quedan pendientes de ejecución por el usuario (sin `node_modules`/red en este entorno de trabajo).

## [Fase 5 — Sprint 5.2.1 Fix — Coordinator KPI Loading Resolution] — 2026-07-23 — 🟡 En revisión

Sprint de responsabilidad única (sin funcionalidades nuevas): resolver por completo el bloqueo indefinido de `CoordinatorKpiRow` en "Cargando indicadores…". Detalle técnico completo en `docs/architecture/frontend/SPRINT_5_2_1_KPI_LOADING_FIX_REPORT.md`.

**Causa raíz encontrada (instrumentación temporal con logs, removida antes de finalizar)**: no existía ningún estado `loading` explícito para este bloque — `JobIndicadoresCard` inferí­a "cargando" de `kpis === null`, incorrecto para cualquier desenlace terminado sin datos (un error real de Postgrest/RLS, `result.ok === false`, que siempre se resolvía correctamente y nunca quedaba pendiente — no solo la promesa rechazada ya cubierta en la ronda anterior). `getCoordinatorKpis()`/`toServiceResult()` se re-auditaron y se reconfirmó que no son el origen.

### Añadido

- `docs/architecture/frontend/SPRINT_5_2_1_KPI_LOADING_FIX_REPORT.md` (NUEVO).
- `kpisLoading` (nuevo `useState<boolean>`, `DespachoPage.tsx`) — recorrido `true→request→success OR error→false` garantizado en los 3 `return` tempranos del efecto y en el `.finally()` de la promesa.
- Prop `kpisLoading: boolean` en `JobIndicadoresCardProps`.

### Modificado

- `src/pages/coordinator/DespachoPage.tsx` — `kpisLoading` agregado; `.finally()` agregado a la cadena de la promesa; `kpis`/`kpisError` se limpian/pueblan explícitamente también en el camino `result.ok === false`.
- `src/components/shared/job-indicadores-card.tsx` — `<Loading/>` ahora gobernado por `kpisLoading`, no por `kpis === null`; si `kpisLoading` es `false` y no hay `kpis` (error), no se muestra nada en ese lugar (sin reabrir la decisión del Sprint 5.1.5 de no mostrar errores dentro de "Indicadores").
- `PROJECT_STATUS.md` — nueva sección de estado.
- `docs/SPRINTS_INDEX.md` — nueva fila.

### Sin cambios

`CoordinatorWorkspace`/`JobSummaryCard`/`PublishModal`/`LiveDispatchCard`/`ResponsesPanel`/`CoordinatorLayout`/`RootLayout`/`CoordinatorKpiRow`, `dashboard.service.ts`/`supabase.service.ts`/repositorios (re-auditados, no son el origen), `OperationalContextProvider.tsx` (auditado explícitamente — Objetivo 10 — el cambio de la ronda anterior, `activeJob`/`setActiveJob`, es ortogonal y no interrumpe el flujo de KPIs), Auth/Roles/Router/Policies/RLS. Ningún componente/servicio/hook/provider nuevo, ningún estado duplicado.

**Validación técnica**: `tsc --noEmit` (instalación global) — distribución de diagnósticos idéntica al cierre de la ronda anterior (cero delta), cero categorías nuevas, cero `TS6133`, cero errores de sintaxis. `npm run lint`/`typecheck`/`build`/`dev` reales quedan pendientes de ejecución por el usuario (sin `node_modules`/red en este entorno de trabajo).

## [Fase 5 — Sprint 5.2.1 Fix — Publish Workflow Stabilization] — 2026-07-23 — 🟡 En revisión

Sprint exclusivamente de estabilización del flujo Publish (Sprint 5.2.1) — sin funcionalidades nuevas. Detalle técnico completo en `docs/architecture/frontend/SPRINT_5_2_1_PUBLISH_WORKFLOW_FIX_REPORT.md`.

**Auditoría y consultas previas (2 decisiones explícitas del usuario)**:

- `activeJob` no sobrevivía la navegación Coordinador↔Instalador↔Administración porque `CoordinatorLayout.tsx` se desmonta de verdad en ese escenario (`RootLayout.tsx` alterna tipos de elemento distintos vía ternario). Tras 2 rondas de `AskUserQuestion` (el usuario rechazó subir el estado a `RootLayout.tsx` y rechazó mantener `CoordinatorLayout` siempre montado), se audita `OperationalContextProvider` (envuelve el ternario completo, nunca se desmonta) y se confirma viable sin romper su responsabilidad ni a sus consumidores existentes. **Decisión del usuario (verbatim): "Si después de la auditoría concluyes que OperationalContextProvider puede asumir ese estado sin romper la arquitectura existente, implementa esa solución."**
- Mapeo de los 8 campos de validación del brief contra los campos reales de `PublishForm` (no existe "categoría" distinta de "tipo de instalación" ni "ciudad") — resuelto vía la propia regla del brief ("No agregar nuevos campos").

### Añadido

- `docs/architecture/frontend/SPRINT_5_2_1_PUBLISH_WORKFLOW_FIX_REPORT.md` (NUEVO).
- Validaciones de `PublishModal`: 7 campos obligatorios (`sucursal`/`tipo`/`zona`/`calle`/`fecha`/`hora`/`bidMins`), estado local `errors`/`submitAttempted`, sin librerías externas.
- `.catch()` en la promesa de `getCoordinatorKpis()` dentro de `DespachoPage.tsx` — corrige la causa real del bloqueo indefinido en "Cargando indicadores…".
- Campos `activeJob`/`setActiveJob` en `OperationalContextValue` (`operational-context.context.ts`) y su implementación (`useState`) en `OperationalContextProvider.tsx`.

### Modificado

- `src/providers/operational-context.context.ts` / `OperationalContextProvider.tsx` — nuevo estado `activeJob`/`setActiveJob`, ortogonal a la resolución de empresa/tienda existente (sin cambios ahí).
- `src/layouts/CoordinatorLayout.tsx` — `activeJob`/`setActiveJob` dejan de ser `useState` local, se leen/escriben vía `useOperationalContext()`; `ConfirmCancelDialog.onYes` ahora llama a `setActiveJob(null)` (antes no-op).
- `src/components/shared/publish-modal.tsx` — validaciones agregadas (ver "Añadido"), sin cambios visuales fuera de los mensajes de error integrados al diseño existente.
- `src/pages/coordinator/DespachoPage.tsx` — `.catch()` agregado a la promesa de KPIs; sin cambios en cómo lee `activeJob` (sigue siendo `useOutletContext<CoordinatorLayoutOutletContext>()`, forma sin cambios).
- `PROJECT_STATUS.md` — nueva sección de estado.
- `docs/SPRINTS_INDEX.md` — nueva fila "5.2.1 Fix".

### Sin cambios

`PublishModal` (visual), `CoordinatorWorkspace`/`JobSummaryCard`/`LiveDispatchCard`/`ResponsesPanel`/`JobIndicadoresCard`/`CoordinatorKpiRow` (ningún bug demostrado, ninguna modificación), `Header`/`Footer`/`Sidebar`/`TwoColumnLayout`, `RootLayout.tsx`, `AppRouter.tsx`, `dashboard.service.ts`/`supabase.service.ts`/repositorios, Auth/Roles/Policies/Router/Supabase.

**Validación técnica**: `tsc --noEmit` (instalación global) — delta de +2 `TS7026` respecto al cierre del Sprint 5.2.1, atribuible a la nueva JSX de mensajes de validación, cero categorías nuevas, cero `TS6133`, cero errores de sintaxis. `npm run lint`/`typecheck`/`build`/`dev` reales quedan pendientes de ejecución por el usuario (sin `node_modules`/red en este entorno de trabajo).

## [Fase 5 — Sprint 5.2.1 — Publish Workflow (Estado Local MVP)] — 2026-07-23 — 🟡 En revisión

Primer Sprint de lógica de negocio real de la Fase 5: flujo completo de publicación de un trabajo, 100% en memoria React (sin Supabase/API/persistencia, Reglas 13-16 de este brief). Detalle técnico completo en `docs/architecture/frontend/SPRINT_5_2_1_PUBLISH_WORKFLOW_REPORT.md`.

**Auditoría previa — contradicción real detectada y resuelta con el usuario (`AskUserQuestion`) antes de escribir código**:

- El brief esperaba tocar "preferiblemente únicamente" `DespachoPage.tsx`/`PublishModal.tsx` y su Regla 12 decía "No modificar `CoordinatorLayout`" — pero `PublishModal`/su único callback `onPublish` viven exclusivamente en `CoordinatorLayout.tsx` desde el Sprint 5.1.2, nunca en `DespachoPage.tsx`. Sin tocar `CoordinatorLayout.tsx` no había forma de que el `PublishForm` confirmado llegara a `activeJob`. **Decisión del usuario (verbatim): "Procede con la opción 1. Autorizo una modificación mínima de `CoordinatorLayout` exclusivamente para conectar el flujo Publish Workflow... `CoordinatorLayout` debe seguir siendo el único propietario de `PublishModal`. La modificación debe ser la mínima indispensable..."**

### Añadido

- `docs/architecture/frontend/SPRINT_5_2_1_PUBLISH_WORKFLOW_REPORT.md` (NUEVO).
- `activeJob`/`setActiveJob` (estado nuevo, `src/layouts/CoordinatorLayout.tsx`) — `JobSummaryCardJob | null`, mismo tipo ya existente.
- Campo `activeJob: JobSummaryCardJob | null` en `CoordinatorLayoutOutletContext`.

### Modificado

- `src/layouts/CoordinatorLayout.tsx` — `onPublish` de `PublishModal` (antes no-op) ahora construye el Job temporal desde el `PublishForm` recibido (mismo criterio de `id` que el HTML oficial: `"JOB-" + Math.floor(Math.random()*9000+1000)`) y llama a `setActiveJob`/`setShowPublishModal(false)`; `activeJob` expuesto vía `CoordinatorLayoutOutletContext`.
- `src/pages/coordinator/DespachoPage.tsx` — se retiran por completo `JOB_DEMO`/`JOB_DEMO_REMAINING_SECONDS`/`DEMO_MODE` (Regla 17); `activeJob` ahora se lee del Outlet Context; `remainingSeconds` se deriva como `activeJob.bidMins * 60`.
- `PROJECT_STATUS.md` — nueva sección de estado del Sprint 5.2.1.
- `docs/SPRINTS_INDEX.md` — nueva fila 5.2.1.

### Sin cambios

`PublishModal` (mismo archivo, misma instancia única, mismas props, sin cambio visual — Regla 10), `CoordinatorEmptyState` (Regla 11), estructura visual completa de `CoordinatorLayout.tsx` (Header/Footer/SucursalSelect/CoordinatorSubtabs/`ConfirmCancelDialog`/`adminSwitchSlot` — Regla 12 salvo la excepción mínima autorizada), `job-summary-card.tsx`, `job-indicadores-card.tsx`, `coordinator-kpi-row.tsx`, `live-dispatch-card.tsx`, `responses-panel.tsx`, `TwoColumnLayout`, `RootLayout.tsx`, `AppRouter.tsx`, Auth/Roles/RLS/Policies/Providers/`OperationalContext`/Servicios/Hooks/Repositories/Supabase/Router.

**Validación técnica**: `tsc --noEmit` (instalación global) — distribución de diagnósticos idéntica al cierre del Sprint 5.1.5 (cero delta), cero categorías nuevas, cero `TS6133`, cero errores de sintaxis. `npm run lint`/`typecheck`/`build`/`dev` reales quedan pendientes de ejecución por el usuario (sin `node_modules`/red en este entorno de trabajo).

## [Fase 5 — Sprint 5.1.5 — Corrección definitiva del Coordinator Workspace (Fix Visual + Estados)] — 2026-07-23 — 🟡 En revisión

Sprint exclusivamente correctivo — el Sprint 5.1.4 dejó la arquitectura lista (`activeJob` como estado único de control) pero el comportamiento VISUAL renderizado seguía sin coincidir con el HTML oficial. Regla 23 ("un Sprint visual no puede darse por terminado únicamente porque la arquitectura esté preparada") y Regla 24 ("no debes asumir que un componente aprobado anteriormente sigue siendo correcto") de este brief. Detalle técnico completo en `docs/architecture/frontend/SPRINT_5_1_5_COORDINATOR_LAYOUT_FIX_REPORT.md`.

**Re-auditoría obligatoria — 3 correcciones reales confirmadas contra el HTML oficial**:

- `activeJob` se fijaba a `JOB_DEMO` por defecto (Sprint 5.1.4) — el Workspace seguía visible siempre en la práctica, contradiciendo el Objetivo 1/2 explícito de este brief ("`activeJob` NO debe inicializarse con `JOB_DEMO`. Debe comenzar como `null`"; "`JOB_DEMO` debe utilizarse exclusivamente cuando se invoque explícitamente").
- `mx-jobcard-h` de `JobSummaryCard`: faltaba el Pill real incondicional `job.urgente ? "Urgente" : "Normal"` (líneas 2216-2233 del HTML oficial) — nunca se había portado.
- `JobIndicadoresCard` renderizaba `kpisError` (mensaje real, ej. "la sucursal todavía no existe...") dentro del bloque "Indicadores" — el HTML oficial nunca muestra ninguna rama de error ahí.

### Añadido

- `docs/architecture/frontend/SPRINT_5_1_5_COORDINATOR_LAYOUT_FIX_REPORT.md` (NUEVO).
- `DEMO_MODE` (constante, `src/pages/coordinator/DespachoPage.tsx`) — flag manual temporal (`false` por defecto) que decide si `activeJob` toma `JOB_DEMO` o `null`; no conectado a ninguna fuente real.
- Campo `urgente: boolean` en `JobSummaryCardJob` + Pill "Urgente"/"Normal" en `JobSummaryCard` (`mx-jobcard-h`), en su posición real (2º, tras el ID).

### Modificado

- `src/pages/coordinator/DespachoPage.tsx` — `activeJob = DEMO_MODE ? JOB_DEMO : null` (antes: fijo a `JOB_DEMO`); `JOB_DEMO.urgente = false` agregado; el mensaje `kpisError` se renderiza ahora como párrafo independiente en la columna izquierda, antes de `JobIndicadoresCard`, en vez de pasarse como prop a ese componente.
- `src/components/shared/job-summary-card.tsx` — Pill "Urgente"/"Normal" agregado; reordenados los Pills "añadidos por decisión de producto" (`estado`/`tiempo restante`) al final, después de los 3 campos literales del HTML (id/urgente-normal/bid).
- `src/components/shared/job-indicadores-card.tsx` — se retira `kpisError` de sus props; ahora alterna únicamente `CoordinatorKpiRow`/`Loading`, nunca texto de error.
- `PROJECT_STATUS.md` — nueva sección de estado del Sprint 5.1.5.
- `docs/SPRINTS_INDEX.md` — nueva fila 5.1.5.

### Sin cambios

`coordinator-kpi-row.tsx` (mismo archivo, mismo contrato, per instrucción explícita del brief: "NO modificar `CoordinatorKpiRow`. Debe reutilizarse."), `live-dispatch-card.tsx`, `responses-panel.tsx`, `coordinator-empty-state.tsx` (ahora es la vista real por defecto, sin cambios de código), `RootLayout.tsx`, `CoordinatorLayout.tsx`, `AppRouter.tsx`, `PublishModal`, Auth/Roles/RLS/Policies/Providers/`OperationalContext`/Servicios/Hooks/Repositories/Supabase/Router.

**Validación técnica**: `tsc --noEmit` (instalación global) — delta de +2 `TS2322` respecto al cierre del Sprint 5.1.4, atribuible íntegramente a las 2 nuevas instancias del Pill "Urgente"/"Normal" (mismo patrón Badge ya clasificado en rondas anteriores), cero categorías nuevas, cero `TS6133`, cero errores de sintaxis. `npm run lint`/`typecheck`/`build`/`dev` reales quedan pendientes de ejecución por el usuario (sin `node_modules`/red en este entorno de trabajo).

## [Fase 5 — Sprint 5.1.4 — Finalización del Workspace Operativo del Coordinador (MVP)] — 2026-07-23 — 🟡 En revisión

Sprint exclusivamente de reconstrucción visual: sin lógica de negocio nueva, sin motor de subasta, sin Supabase. Cierra la serie 5.1.x — deja el `CoordinatorWorkspace` estabilizado para que el Sprint 5.2 ("Publicación de Trabajos") se concentre únicamente en lógica de negocio. Detalle técnico completo en `docs/architecture/frontend/SPRINT_5_1_4_COORDINATOR_WORKSPACE_COMPLETION_REPORT.md`.

**Auditoría previa (obligatoria por brief) — 1 discrepancia real resuelta con el usuario (`AskUserQuestion`) antes de escribir código**:

- El brief pedía "completar `CoordinatorKpiRow`... debe contener todos los indicadores presentes en el HTML oficial". El bloque real "Indicadores" de `Coordinator()` (líneas 2318-2354 del HTML oficial) son 6 `StatTile` derivados de `jobView()` (1ª respuesta/3 respuestas/Asignación/Notificados/Abiertos/Respuestas) — un componente DISTINTO al `CoordinatorKpiRow` existente (Pendientes/Activos/Finalizados/Programados hoy), decisión de producto ya reafirmada en los Sprints 5.1/5.1.2 ("el HTML oficial no tiene ningún Dashboard"), alimentado por datos REALES (`getCoordinatorKpis`). **Decisión del usuario (verbatim): "Mantener `CoordinatorKpiRow` como fuente de datos y crear el bloque visual de Indicadores del HTML oficial utilizando esos datos. No reemplazar ni eliminar `CoordinatorKpiRow`... podrá convertirse posteriormente en un wrapper del bloque Indicadores cuando finalice la Fase 5, pero no debe eliminarse ni cambiar su contrato en este Sprint."**
- Se verificó que `JobSummaryCard`/`ResponsesPanel` ya satisfacían íntegramente los requisitos de "completar"/"revisar" del brief (campos y comportamiento comparados uno a uno contra el HTML oficial y contra el propio checklist del brief) — cero cambios necesarios en ninguno de los dos.
- Se identificó y corrigió el bug estructural señalado por el propio brief: `DespachoPage` no tenía ninguna posibilidad de mostrar el estado vacío (`CoordinatorEmptyState` había quedado fuera del flujo desde el Sprint 5.1.3) — se introduce `activeJob` como estado único de control (Reglas 19/21), mutuamente excluyente entre estado vacío y Workspace.

### Añadido

- `src/components/shared/job-indicadores-card.tsx` (NUEVO) — `JobIndicadoresCard`, reconstruye el marco visual real del bloque "Indicadores" (`Card`+`CardHeader` con ícono/título + `.mx-goal`), envolviendo `CoordinatorKpiRow` sin modificarlo.
- `docs/architecture/frontend/SPRINT_5_1_4_COORDINATOR_WORKSPACE_COMPLETION_REPORT.md` (NUEVO).
- `src/styles/globals.css` — clases `.mx-goal`/`.mx-goal svg`, portadas verbatim (líneas 96-97 del `<style>` original, nunca portadas antes).

### Modificado

- `src/pages/coordinator/DespachoPage.tsx` — se introduce `activeJob: JobSummaryCardJob | null` (fijado temporalmente a `JOB_DEMO`, valor explícitamente admitido por el brief) con `if (!activeJob) return <CoordinatorEmptyState .../>` antes del Workspace; se reincorpora el import de `CoordinatorEmptyState`; se reemplaza el render directo de `CoordinatorKpiRow`/`Loading`/mensaje de error por `JobIndicadoresCard` (mismo estado `kpis`/`kpisError`, mismo `useEffect`, sin cambios de lógica).
- `PROJECT_STATUS.md` — nueva sección de estado del Sprint 5.1.4.
- `docs/SPRINTS_INDEX.md` — nueva fila 5.1.4.

### Sin cambios

`coordinator-kpi-row.tsx` (mismo archivo, mismo contrato `{ kpis: CoordinatorKpis }`, cero modificaciones de código ni de cálculo), `job-summary-card.tsx`, `live-dispatch-card.tsx`, `responses-panel.tsx`, `coordinator-empty-state.tsx` (reincorporado al flujo, sin cambios de código), `RootLayout.tsx`, `CoordinatorLayout.tsx`, `AppRouter.tsx`, `TrabajosPage.tsx`, `TrabajoDetailPage.tsx`, `Auth`/`Session`/`OperationalContext` providers, repositories, services, hooks existentes, `Router`/`Roles`/`Policies`/`RLS`. Sin regresiones en Admin/Instalador.

**Validación técnica**: `tsc --noEmit` (instalación global) sobre los archivos nuevos/modificados — distribución de diagnósticos idéntica al patrón de artefactos de entorno ya clasificado (`TS2307`/`TS2875`/`TS7026`/`TS7006`/`TS2322`), cero categorías nuevas, cero `TS6133`, cero errores de sintaxis. `npm run lint`/`typecheck`/`build`/`dev` reales quedan pendientes de ejecución por el usuario (sin `node_modules`/red en este entorno de trabajo).

## [Fase 5 — Sprint 5.1.3 — Implementación del Workspace Operativo del Coordinador (MVP)] — 2026-07-22 — 🟡 En revisión

Sprint exclusivamente de reconstrucción visual: sin lógica de negocio nueva, sin motor de subasta, sin publicación real, sin asignación real, sin tiempo real. Objetivo: reconstruir el Workspace Operativo del Coordinador (rama `jobs.length>0` de `Coordinator()`) para que coincida visual y estructuralmente con `Multimax_Despacho_v1.3.html`. Detalle técnico completo en `docs/architecture/frontend/SPRINT_5_1_3_COORDINATOR_WORKSPACE_REPORT.md`.

**Auditoría previa (obligatoria por brief) — hallazgo principal y 1 discrepancia real resuelta con el usuario antes de escribir código**:

- Gran parte de lo pedido ya existía sin montar: `TwoColumnLayout` (`variant="despacho"`) ya modela el grid principal (`.mx-grid`); `AssignedPanel`/`NoResponsePanel` (Sprint 3.16) ya existen, documentados como listos para el Sprint 5.3; `EmptyState`/`trabajoEstadoInfo` ya cubren el estado vacío y el badge de estado real. Ningún componente nuevo se creó donde ya existía uno reutilizable (Regla 7 del brief).
- El CSS de la rama `jobs.length>0` (`.mx-jobcard-h`, `.mx-jobtitle`, `.mx-jobmeta`, `.mx-jobreq`, `.mx-roundsingle`/`.mx-round`, `.mx-actionsrow`, `.mx-feedcard`, `.mx-sort`) nunca se había portado a `globals.css` — se agregó verbatim desde el `<style>` del HTML oficial, sin modificar ninguna regla existente.
- `Coordinator()` real tiene 2 ramas mutuamente excluyentes (vacío vs. Workspace completo); `DespachoPage` mostraba ambas a la vez sin exclusión desde los Sprints 3.6/3.7/3.9. **Decisión del usuario (verbatim): "Reemplaza completamente el estado vacío del Coordinador por el Workspace Operativo del HTML oficial... asume un trabajo de demostración (MVP) únicamente con fines de reconstrucción visual del layout... El estado vacío queda eliminado del flujo principal... se recuperará posteriormente... en el Sprint 5.2."**
- Contradicción textual real detectada en el propio brief: la sección 1 pide "Tiempo restante" en `JobSummaryCard`; la sección 3 pide "conservar: contador" en `LiveDispatchCard` — el HTML oficial solo tiene un lugar real para esto. Resuelta documentando 2 representaciones distintas y no redundantes: valor estático en `JobSummaryCard`, contador real (`LiveCountdown`, sin cambios) en `LiveDispatchCard`.

### Añadido

- `src/components/shared/job-summary-card.tsx` (NUEVO) — `JobSummaryCard`, reconstruye `.mx-card.mx-jobcard`.
- `src/components/shared/live-dispatch-card.tsx` (NUEVO) — `LiveDispatchCard`, reconstruye la tarjeta "Despacho en vivo" completa, reagrupa `Radar`/`LiveCountdown`/botón "Cancelar" ya existentes.
- `src/components/shared/responses-panel.tsx` (NUEVO) — `ResponsesPanel`, reconstruye "Respuestas en tiempo real" (tabs de orden + estado vacío).
- `docs/architecture/frontend/SPRINT_5_1_3_COORDINATOR_WORKSPACE_REPORT.md` (NUEVO).

### Modificado

- `src/pages/coordinator/DespachoPage.tsx` — reescrito: retira `CoordinatorEmptyState`/`Radar`/`LiveCountdown`/botón "Cancelar" sueltos; monta `TwoColumnLayout` (YA EXISTENTE) con `JobSummaryCard`+`LiveDispatchCard`+`CoordinatorKpiRow` (columna izquierda) y `ResponsesPanel` (columna derecha). El fetch de KPIs no se modificó, solo su posición.
- `src/styles/globals.css` — se agregan las clases CSS listadas arriba, portadas verbatim; ninguna regla existente se modificó.
- `PROJECT_STATUS.md` — nueva sección de estado del Sprint 5.1.3.
- `docs/SPRINTS_INDEX.md` — nueva fila 5.1.3.

**Sin cambios**: `RootLayout.tsx`, `CoordinatorLayout.tsx`, `AppRouter.tsx`, `TrabajosPage.tsx`, `TrabajoDetailPage.tsx`, `Auth`/`Session`/`OperationalContext` providers, repositories, services, hooks existentes, `coordinator-empty-state.tsx`/`assigned-panel.tsx`/`no-response-panel.tsx` (quedan sin montar, listos para el Sprint 5.3). Sin regresiones en Admin/Instalador (confirmado en el reporte técnico, sección 8).

**Validación técnica**: `tsc --noEmit` (instalación global) sobre los 4 archivos nuevos/modificados — únicamente diagnósticos del mismo patrón de artefactos de entorno ya clasificado (`TS2307`/`TS2875`/`TS7026`/`TS7006`/`TS2322`), cero `TS6133`, cero errores de sintaxis. `npm run lint`/`typecheck`/`build`/`dev` reales quedan pendientes de ejecución por el usuario (sin `node_modules`/red en este entorno de trabajo).

## [Fase 5 — Sprint 5.1.2 — Refactor del Layout Operativo del Coordinador (MVP)] — 2026-07-22 — 🟡 En revisión

Sprint exclusivamente arquitectónico: sin funcionalidades nuevas, sin queries/repositories/Supabase/Auth/roles/RLS/`OperationalContextProvider` modificados. Objetivo: dejar preparado un único `CoordinatorLayout` como contenedor de toda la operación futura del Coordinador (Sprints 5.2/5.3/5.4). Detalle técnico completo en `docs/architecture/frontend/SPRINT_5_1_2_COORDINATOR_LAYOUT_REPORT.md`.

**Auditoría previa (obligatoria por brief) — 3 discrepancias reales detectadas y resueltas con el usuario antes de escribir código**:

1. `CoordinatorSidebar` (pedido en la "ESTRUCTURA ESPERADA" del brief): el HTML oficial no tiene ningún sidebar para el Coordinador — ya confirmado en el Sprint 5.1. **Decisión del usuario (verbatim): "No crear ningún `CoordinatorSidebar`... El HTML oficial... es la fuente de verdad"** — ni siquiera como contenedor vacío/placeholder. Por la misma instrucción, tampoco se agregan placeholders para Auction Engine/Timeline/Assignment Panel en este Sprint (se incorporan cuando exista un Sprint específico para cada uno).
2. `CoordinatorHeader`/`CoordinatorFooter`: `Header`/`Footer` son componentes reales ya existentes y globales (compartidos por los 3 roles vía `App()`, no exclusivos de Coordinador). **Decisión: reutilizarlos tal cual** en la nueva posición del árbol — cero archivos nuevos con esos nombres, cero duplicación.
3. `CoordinatorKPIs`: el brief sugería visibilidad en todas las páginas del Coordinador (hermano de `CoordinatorWorkspace`); el Sprint 5.1 ya había decidido explícitamente integrar `CoordinatorKpiRow` únicamente en `DespachoPage`. **Decisión: no cambiar ese alcance** — elevarlo habría sido un cambio de comportamiento real, prohibido explícitamente por este mismo brief.

El usuario confirmó además extender a `ConfirmCancelDialog` (no mencionado por nombre en el brief) el mismo criterio explícito que el brief da para `PublishModal` ("deberá depender del CoordinatorLayout, no de RootLayout").

### Añadido

- `src/layouts/CoordinatorLayout.tsx` (NUEVO) — único punto de entrada de toda la operación del Coordinador. Compone `Header`/`Footer`/`SucursalSelect`/`CoordinatorSubtabs`/`<Outlet/>`/`PublishModal`/`ConfirmCancelDialog`, todos reutilizados sin ningún cambio en su propio código. Exporta `CoordinatorLayoutOutletContext` (reemplaza a `RootLayoutOutletContext`, misma forma exacta).
- `docs/architecture/frontend/SPRINT_5_1_2_COORDINATOR_LAYOUT_REPORT.md` (NUEVO).

### Modificado

- `src/layouts/RootLayout.tsx` — se retira el bloque `role === 'coordinador'` inline (Header/Footer/PublishModal/ConfirmCancelDialog cuando `showCoordinador` es `true`); en su lugar se monta `<CoordinatorLayout/>`. `sucursalCoord`/`setSucursalCoord` **permanecen** en este archivo (no se movieron) porque también alimentan a `OperationalContextProvider` (`sucursalCoord` es uno de sus 2 props), marcado "NO MODIFICAR" por este brief — se le pasan a `CoordinatorLayout` como props en vez de duplicar la fuente de verdad. Se elimina `RootLayoutOutletContext`, el `useMemo` de `outletContext`, y el estado `showPublishModal`/`confirmCancelOpen` (movidos a `CoordinatorLayout`). Ningún cambio a `showCoordinador`/`showInstalador`/`showAdminPanel`/`adminVista`/Auth/Supabase/RLS.
- `src/pages/coordinator/DespachoPage.tsx` / `TrabajosPage.tsx` — se retira el render duplicado de `SucursalSelect`/`CoordinatorSubtabs` (antes una llamada independiente en cada página); ahora viven una única vez en `CoordinatorLayout`, por encima del `<Outlet/>` compartido. `TrabajosPage.tsx` ya no necesita `useOutletContext()` en absoluto. Tipo del outlet context actualizado de `RootLayoutOutletContext` a `CoordinatorLayoutOutletContext`.
- `PROJECT_STATUS.md` — nueva sección de estado del Sprint 5.1.2.
- `docs/SPRINTS_INDEX.md` — nueva fila 5.1.2.

**Efecto colateral de fidelidad, documentado (no una regresión ni una funcionalidad inventada)**: en el HTML oficial, el selector de sucursal y las subtabs son siempre visibles mientras se ve al Coordinador, incluido el detalle de un trabajo (`JobDetail` reemplaza solo el contenido de la lista, no a sus hermanos). Antes de este Sprint, `TrabajoDetailPage.tsx` no mostraba `SucursalSelect`/`CoordinatorSubtabs`. Al hoistear ambos componentes a `CoordinatorLayout`, `TrabajoDetailPage` pasa a mostrarlos también — un aumento de fidelidad respecto al HTML oficial, consecuencia directa de eliminar la duplicación de estructura que pedía este Sprint.

**Validación técnica**: `tsc --noEmit` (instalación global) sobre los 4 archivos nuevos/modificados de este Sprint — únicamente diagnósticos del mismo patrón de artefactos de entorno ya clasificado (`TS2307`/`TS2875`/`TS7026`/`TS7006`/`TS2322`), cero `TS6133`, cero errores de sintaxis. `npm run lint`/`typecheck`/`build`/`dev` reales quedan pendientes de ejecución por el usuario (sin `node_modules`/red en este entorno de trabajo).

## [Fase 5 — Sprint 5.1.1 — AJUSTE FINAL — Contexto Operativo real para el Administrador Superusuario] — 2026-07-22

Ronda de ajuste sobre el mismo Sprint 5.1.1 (no un Sprint nuevo), por instrucción explícita del usuario, que resuelve la "Limitación real, no corregida" documentada en la entrada anterior de este mismo archivo (ver abajo): la vista "Coordinador" en Modo de Visualización superusuario mostraba "Tu perfil de coordinador no tiene una tienda asignada" en vez de datos reales, porque `Perfil.tiendaId` es `null` por diseño para `admins`.

**Regla temporal del ajuste (obligatoria, respetada)**: la nueva lógica solo corre cuando `role === 'admin'` **y** el selector temporal indica `adminVista === 'coordinador'`. Un Coordinador real continúa usando exactamente `profile.tiendaId`, sin ningún cambio de comportamiento.

**Auditoría previa — 1 discrepancia real detectada y resuelta antes de escribir código** (no requirió `AskUserQuestion`, se resolvió cruzando fuentes de verdad ya existentes en el proyecto): `supabase/migrations/0001_initial_schema.sql` define una tabla `sucursales`, pero esa migración está **stale/superada** -- el schema real confirmado por pg_dump (`src/types/database.generated.ts`, generado vía `supabase gen types typescript --linked`), el `TABLES` de `src/lib/supabase/config.ts`, y el repositorio ya existente `src/repositories/tiendas.repository.ts` (Sprint 4.1.1) confirman que la tabla real es **`tiendas`**, no `sucursales`. Esta tensión es preexistente y ya documentada en el proyecto (las migraciones nunca se regeneraron contra el pg_dump real); no se corrigió la migración en este ajuste por estar fuera de alcance -- solo se evitó el error de escribir código nuevo contra la tabla equivocada.

**Nueva abstracción permanente — "Contexto Operativo"** (recomendación arquitectónica obligatoria del propio brief: no distribuir `role === 'admin' && adminVista === 'coordinador'` en múltiples archivos): sigue el patrón ya establecido en el proyecto para contextos de React (`AuthContext`/`AuthProvider`/`useAuth`, `SessionContext`/`SessionProvider`/`useSession`):

- `src/providers/operational-context.context.ts` (NUEVO) — `OperationalContext`, tipos `ModoVisualizacion` y `OperationalContextValue` (`modo`, `esSuperusuario`, `empresaId`, `empresaNombre`, `tiendaId`, `tiendaNombre`, `loading`, `error`).
- `src/providers/OperationalContextProvider.tsx` (NUEVO) — recibe `modo`/`sucursalCoord`/`children`. Para un Coordinador/Instalador real (o un admin fuera de Modo Coordinador), reexpone síncronamente los datos ya existentes de `profile` (`empresaId`/`empresaNombre`/`tiendaId`/`tiendaNombre`), sin tocarlos. Solo cuando `esSuperusuario && modo === 'coordinador'`, resuelve de forma asíncrona y real la tienda activa contra las tablas reales `empresas`/`tiendas`, usando la sucursal ya seleccionada en el `SucursalSelect` existente (sin crear ningún selector nuevo).
- `src/services/operational-context.service.ts` (NUEVO) — `resolveSuperusuarioTienda(sucursalNombre)`: `empresasRepository.getBySlug('multimax')` (empresa real Multimax, único tenant activo del proyecto, slug confirmado en `supabase/seed.sql`) → `tiendasRepository.getByEmpresaId(empresa.id)` → busca la fila cuyo `nombre` coincide con la sucursal seleccionada. Reutiliza únicamente repositorios ya existentes (`empresasRepository`/`tiendasRepository`, Sprint 4.1.1); ningún mock, ninguna constante duplicada, ningún UUID hardcodeado.
- `src/hooks/useOperationalContext.ts` (NUEVO) — hook público, mismo patrón exacto que `useAuth.ts`.
- `src/constants/index.ts` — agregado `EMPRESA_MVP_SLUG = 'multimax'` (el slug real sembrado, no un mock ni un UUID).

### Modificado

- `src/layouts/RootLayout.tsx` — envuelve el árbol renderizado en `<OperationalContextProvider modo={modo} sucursalCoord={sucursalCoord}>`, con `modo = role === 'admin' ? adminVista : role`. Ningún cambio a `adminVista`/`AdminVistaSwitch`/las 3 rutas ya existentes.
- `src/pages/coordinator/DespachoPage.tsx` — ya no lee `profile.tiendaId` (vía `useAuth()`); lee `tiendaId`/`loading`/`error` de `useOperationalContext()`. Limpia `kpis`/`kpisError` mientras el contexto resuelve, para no dejar en pantalla datos de la tienda anterior al cambiar de sucursal.
- `src/pages/coordinator/TrabajosPage.tsx` — mismo cambio, para `tiendaId`/`tiendaNombre`.
- `src/services/index.ts`, `src/providers/index.ts`, `src/hooks/index.ts` — nuevos exports de barrel para lo anterior.
- `PROJECT_STATUS.md` — addendum "ACTUALIZACIÓN — Ajuste final..." en la sección de metodología y en el estado del Sprint 5.1.1, marcando la limitación anterior como resuelta (sin borrar la narrativa original).
- `docs/SPRINTS_INDEX.md` — fila `5.1.1` actualizada con una nota del ajuste.
- `docs/architecture/frontend/SPRINT_5_1_1_ADMIN_SUPERUSER_REPORT.md` — nueva sección 11 ("Ajuste final...") agregada al final, sin modificar las secciones 0-10 originales.

**Confirmaciones explícitas**: NO se modificó Autenticación, Roles, Supabase, Policies ni RLS -- `AuthProvider.tsx`/`SessionProvider.tsx`/`auth.service.ts`/`supabase.service.ts`/migraciones/escrituras de `profile.rol` permanecen intactos. Un Coordinador real sigue usando exactamente `profile.tiendaId` (comportamiento idéntico, cero regresión). El admin autenticado sigue siendo `admin` en todo momento -- no hay impersonación.

**Validación técnica**: `tsc --noEmit` (instalación global) ejecutado 3 veces durante este ajuste (tras crear el Provider, tras actualizar las páginas, y una corrida final consolidada) sobre los 13 archivos nuevos/modificados de este ajuste -- únicamente diagnósticos del mismo patrón de artefactos de entorno ya clasificado (`TS2307`/`TS2875`/`TS7026`/`TS2322`/`TS7006`), cero `TS6133` (import/variable sin usar), cero errores de sintaxis. `npm run lint`/`typecheck`/`build`/`dev` reales quedan pendientes de ejecución por el usuario en su propio entorno (sin `node_modules`/red en este entorno de trabajo).

## [Fase 5 — Sprint 5.1.1 — Implementación del modo Administrador Superusuario (MVP)] — 2026-07-22 — 🟡 En revisión

Sprint exclusivamente de navegación, sin funcionalidades nuevas, sin modificar la lógica de Coordinador/Instalador, Auth, Supabase, RLS ni políticas (por instrucción explícita del usuario). Detalle técnico completo en `docs/architecture/frontend/SPRINT_5_1_1_ADMIN_SUPERUSER_REPORT.md`.

**Auditoría previa (obligatoria por brief) — 2 discrepancias detectadas y resueltas con el usuario antes de escribir código**:

1. El brief pedía "ampliar `allowedRoles`, no inventar UI" -- ni el HTML oficial ni el código tenían un `RoleGate` genérico; Coordinador/Instalador/Admin son 3 ramas mutuamente excluyentes en ambos, y ampliar un array de roles no alcanza para alternar entre las 3 en una misma sesión. **Decisión del usuario: selector temporal de modo, exclusivo de `admin`**, sin tocar `profile.rol`/Auth/Supabase/RLS.
2. "Publicar Trabajo"/"Ofertas"/"Asignaciones" del checklist del brief no tienen equivalente real exacto. **Decisión: reinterpretar los dos primeros contra lo real** (`PublishModal` ya existente / pestaña real "Solicitudes"), **"Asignaciones" documentada como no validable** (no existe, reservada para Sprint 5.4).

### Añadido

- `src/components/shared/admin-vista-switch.tsx` (NUEVO, único componente nuevo de este Sprint) — selector presentacional "Administración/Coordinador/Instalador", reutiliza `MxSubtabs`/`MxSubtabButton` (Sprint 3.3) sin estilos/markup nuevos.
- `docs/architecture/frontend/SPRINT_5_1_1_ADMIN_SUPERUSER_REPORT.md` (NUEVO).

### Modificado

- `src/layouts/RootLayout.tsx` — nuevo estado `adminVista` (inerte para `coordinador`/`instalador`), 1 `useEffect` de sincronización de URL (navega a `/despacho` al entrar a la vista Coordinador, vuelve a `/` al salir), y 3 booleanos derivados (`showCoordinador`/`showInstalador`/`showAdminPanel`) que amplían las comparaciones de rol existentes con `role === 'admin' && adminVista === '...'`. Montaje condicional de `AdminVistaSwitch` + `Badge` ("Modo temporal · MVP"), visible solo para `role === 'admin'`.
- `src/routes/AppRouter.tsx` — `CoordinatorIndexRedirect` ampliado de `profile?.rol === 'coordinador'` a incluir `admin` (seguro: solo se monta cuando `RootLayout` ya decidió mostrar el `Outlet` de Coordinador). Ninguna ruta nueva creada.
- `PROJECT_STATUS.md` — nueva sección "Regla permanente del MVP — Modo de Visualización del Administrador" + estado del Sprint 5.1.1.
- `docs/SPRINTS_INDEX.md` — nueva fila 5.1.1.

**Limitación real, no corregida (fuera de alcance de este Sprint)**: la vista "Coordinador" en modo superusuario no muestra KPIs/Cola de Trabajos reales para el admin -- `Perfil.tiendaId` es `null` por diseño para `admins` (solo `coordinadores` tiene `tienda_id` en el schema real), así que se ve el mismo mensaje ya existente "Tu perfil de coordinador no tiene una tienda asignada". Corregirlo requeriría modificar `dashboard.service.ts`/la lógica de scoping del Coordinador, explícitamente fuera de alcance ("no modificar la lógica del Coordinador"). La vista "Instalador" no tiene esta limitación (100% presentacional/mock, sin dependencia de `profile` todavía).

**Validación técnica**: `tsc --noEmit` (instalación global) sobre los 3 archivos tocados/nuevos -- únicamente diagnósticos del mismo patrón de artefactos de entorno ya clasificado (`TS2307`/`TS2875`/`TS7026`/`TS2322`, verificado cruzando contra `coordinator-subtabs.tsx`/`TrabajoDetailPage.tsx`, ya aprobados, que producen el mismo patrón). Sin `TS6133` (imports/variables sin usar), sin errores de sintaxis, sin diagnósticos nuevos atribuibles a este Sprint. Revisión manual confirma que el orden de Hooks de `RootLayout.tsx` (corregido en la ronda anterior) se mantiene intacto. `npm run lint`/`typecheck`/`build`/`dev` reales quedan pendientes de ejecución por el usuario (sin `node_modules`/red en este entorno de trabajo).

## [Actualización de metodología documental — no más archivos PHASE_X.md] — 2026-07-22

Ronda exclusivamente documental, sin cambios de código fuente, componentes, rutas, Supabase ni permisos (por instrucción explícita del usuario). Formaliza una regla permanente adicional sobre la metodología ya vigente desde el Sprint 3.1: **a partir de la Fase 5 no se crean más archivos `PHASE_X.md`** (`PHASE_5.md`, `PHASE_6.md`, `PHASE_7.md`, etc.).

**Verificación previa realizada**: se buscó (`grep -rn` recursivo sobre todo `.md` del proyecto, incluidos `supabase/README.md` y `docs/`) cualquier referencia a `PHASE_5.md`/`PHASE_6.md`/`PHASE_7.md`/`PHASE_X.md`. No se encontró ninguna — no había ninguna referencia futura que eliminar o sustituir.

**Regla formalizada**: `PHASE_1.md`–`PHASE_4.md` (ya existentes) se conservan únicamente como documentación histórica de las fases que documentan; no se modifican salvo correcciones puntuales de contenido ya escrito, y no sirven de plantilla para fases nuevas. Toda la planificación y el estado del proyecto se mantienen de aquí en adelante mediante: `PROJECT_STATUS.md` (estado general), `docs/SPRINTS_INDEX.md` (índice maestro de fases/Sprints, reemplaza a los futuros `PHASE_X.md`), `CHANGELOG.md` (historial de cambios), `README.md` (solo cuando cambie arquitectura/instalación/estructura general/estado del MVP) y un reporte técnico por Sprint (`docs/architecture/frontend/SPRINT_<fase>_<n>_..._REPORT.md`).

### Modificado

- `PROJECT_STATUS.md` — nueva sección "Actualización de metodología documental (Fase 5, 2026-07-22)".
- `docs/SPRINTS_INDEX.md` — nueva nota formalizando este archivo como índice maestro, reemplazo de los futuros `PHASE_X.md`.
- `README.md` — nueva regla permanente documentando que no se crean más archivos `PHASE_X.md` a partir de la Fase 5.

**Hallazgo reportado, no corregido en esta ronda** (fuera del alcance "exclusivamente documental" de este brief, que pedía aplicar la metodología, no auditar/backfillear contenido de Sprints ya cerrados): la sección "Estado del proyecto" de `README.md` sigue sin mencionar la Fase 5/Sprint 5.1 — quedó desactualizada desde el cierre de Sprint 4.2.1 y no se actualizó cuando se implementó el Sprint 5.1. Se deja reportado para que el usuario decida si se corrige en una ronda futura.

## [Fase 5 — Sprint 5.1 — Dashboard y Vista Operativa del Coordinador] — 2026-07-22 — 🟡 En revisión

Primer Sprint de la nueva Fase 5 ("Flujo Operativo"). Construye la Vista Operativa real del Coordinador sobre la infraestructura de Auth de Fase 4 (`useAuth()`/`profile.tiendaId`) y los componentes visuales ya aprobados de Fase 3 (`Radar`/`LiveCountdown`/`CoordinatorEmptyState`/`MxSubtabs`/`SucursalSelect`/`StatTile`). Detalle técnico completo, incluida la auditoría previa obligatoria contra `Multimax_Despacho_v1.3.html`, en `docs/architecture/frontend/SPRINT_5_1_COORDINATOR_REPORT.md`.

**Auditoría previa (obligatoria por brief) — 3 discrepancias detectadas y resueltas con el usuario antes de escribir código** (ver el reporte completo para el detalle y la evidencia de cada una):

1. El brief pedía un Sidebar lateral -- el HTML oficial no tiene ninguno (navegación real: 2 subtabs horizontales). **Decisión del usuario: no crear Sidebar**, reutilizar `MxSubtabs`/`MxSubtabButton` (Sprint 3.3) con routing real.
2. El brief pedía una pantalla "Dashboard" con KPIs -- no existe en el HTML oficial. **Decisión del usuario: integrar los KPIs como fila superior de la vista oficial "Despacho en vivo"**, sin crear una pantalla nueva.
3. El brief pedía "Calendario"/"Instaladores" en el menú del Coordinador -- ambos son Admin-only en el HTML oficial, y el propio brief excluye "Gestión de Instaladores" de este Sprint. **Decisión del usuario: omitir ambos** por ahora.

### Añadido

- `src/services/dashboard.service.ts` (NUEVO) — `getCoordinatorKpis`/`getTrabajosByTienda`/`getTrabajoDetalle`, capa de servicio real (no mock) sobre `trabajosRepository`, ya con policies RLS reales para coordinadores.
- `src/components/shared/coordinator-kpi-row.tsx` (NUEVO) — KPIs (pendientes/activos/finalizados/programados hoy) reutilizando `StatGrid`/`StatTile` (Fase 3).
- `src/components/shared/coordinator-subtabs.tsx` (NUEVO) — conecta `MxSubtabs`/`MxSubtabButton` (Sprint 3.3, antes sin `onClick`) a rutas reales `/despacho`/`/trabajos`.
- `src/components/shared/trabajo-row.tsx` (NUEVO) — fila de "Cola de Trabajos" (Cliente/Dirección/Instalación/Estado/Fecha/Prioridad/Acciones), extiende `.mx-jobrow` (Sprint 3.14).
- `src/pages/coordinator/DespachoPage.tsx` (NUEVO) — ruta `/despacho`, landing real del Coordinador.
- `src/pages/coordinator/TrabajosPage.tsx` (NUEVO) — ruta `/trabajos`, "Cola de Trabajos" real.
- `src/pages/coordinator/TrabajoDetailPage.tsx` (NUEVO) — ruta `/trabajos/:id`, primera implementación de esta ruta planificada desde `ARCHITECTURE.md §8`.
- `docs/architecture/frontend/SPRINT_5_1_COORDINATOR_REPORT.md` (NUEVO).
- `src/constants/index.ts` — `TRABAJO_ESTADO_INFO`/`trabajoEstadoInfo`/`TRABAJOS_FILTROS` (vocabulario real de `trabajos.estado`, documentado como inferido/no verificado contra Producción).
- `src/styles/globals.css` — `.mx-jobrow-side`/`.mx-jobrow-price`/`.mx-chevr`/`.mx-jobfilter`/`.mx-detail-grid`/`.mx-kv*`/`.mx-timeline`/`.mx-tl*`/`.mx-detailacts`, portadas verbatim del HTML fuente (pendientes desde los Sprints 3.10/3.14).

### Modificado

- `src/layouts/RootLayout.tsx` — el bloque `role === 'coordinador'` (antes inline: `SucursalSelect`+subtabs estáticas+`CoordinatorEmptyState`/`Radar`/`LiveCountdown`/botón "Cancelar") pasa a `<Outlet context={...}/>`, con ese mismo contenido reubicado verbatim a `DespachoPage.tsx` (cero cambios de comportamiento). `role === 'instalador'`/`role === 'admin'` sin cambios.
- `src/routes/AppRouter.tsx` — rutas hijas de `/` (`index`, `/despacho`, `/trabajos`, `/trabajos/:id`); `CoordinatorIndexRedirect` redirige `/` a `/despacho` cuando `profile.rol === 'coordinador'`.
- `src/services/index.ts` — exporta las nuevas funciones de `dashboard.service.ts`.
- `PROJECT_STATUS.md`/`TODO.md`/`docs/SPRINTS_INDEX.md` — nuevas secciones/filas de Sprint 5.1; corrección de 2 filas desactualizadas en `SPRINTS_INDEX.md` (Sprints 3.15/3.16 ya estaban completados, seguían marcados "⏳ Pendiente").

### Qué NO se hizo (excluido explícitamente por el propio brief de este Sprint)

Motor de "Flujo de Ofertas" (radar/bids en tiempo real contra un trabajo activo -- Sprint 5.3), conexión real de `PublishModal` a la tabla `trabajos` (Sprint 5.2), Asignación de Instaladores (Sprint 5.4), Gestión de Empresas, Gestión de Instaladores, CRUD de Coordinadores, Notificaciones. Ningún código de autenticación validado (Sprint 4.2.1) fue modificado.

## [Fase 4 — Sprint 4.2.1 — Sistema de Autenticación y Experiencia de Inicio de Sesión] — 2026-07-21, cerrado 2026-07-22 — ✅ Completado

Primer Sprint de Fase 4 con autenticación real de punta a punta: login con correo/contraseña, sesión, resolución de perfil/rol real, recuperación de contraseña, rutas protegidas. Detalle técnico completo en `docs/architecture/frontend/SPRINT_4_2_1_AUTH_REPORT.md` y `ARCHITECTURE.md §14.9`.

**Cierre (2026-07-22)**: el usuario validó manualmente contra Producción (login, `resolveProfile()`, lectura de `admins`, Dashboard, persistencia de sesión, logout, recarga con sesión) y confirmó el Sprint como **COMPLETADO**. Los ajustes que lo permitieron (policies RLS, `GRANT SELECT` a `authenticated`, registro real en `admins`, corrección del flujo de Auth) se hicieron directamente en Supabase, fuera de este repositorio -- **no deben revertirse**. El código de `src/` recibido en esa ronda es idéntico al de esta entrega (verificado con `diff`), consistente con que ningún ajuste fue de código.

### Añadido

- `src/types/perfil.ts` (NUEVO) — tipo `Perfil`/`EstadoPerfil`.
- `src/services/profile.service.ts` (NUEVO) — resolución real de rol/perfil contra `admins`/`coordinadores`/`instaladores`.
- `src/components/auth/ProtectedRoute.tsx`, `PublicRoute.tsx` (NUEVOS) — guards de ruta.
- `src/layouts/AuthLayout.tsx` (NUEVO) — shell centrado para `/login`.
- `src/pages/auth/LoginPage.tsx` (NUEVO) — pantalla de login completa.
- `src/components/shared/header-user-menu.tsx` (NUEVO) — menú de usuario autenticado, reemplaza al selector manual de rol.
- `docs/architecture/frontend/SPRINT_4_2_1_AUTH_REPORT.md` (NUEVO).

### Modificado

- `src/services/auth.service.ts` — agregadas `refreshSession`/`resetPasswordForEmail`.
- `src/providers/auth.context.ts`/`AuthProvider.tsx` — completados con `profile`/`profileLoading`/`login`/`logout`/`resetPassword`/`refreshSession`.
- `src/hooks/useAuth.ts` — JSDoc actualizado (ya no hay un `useAuth` legacy paralelo).
- `src/services/index.ts` — barrel actualizado con las nuevas exportaciones.
- `src/components/shared/header.tsx` — reemplaza `HeaderRoleSwitch` por `HeaderUserMenu`.
- `src/layouts/RootLayout.tsx` — `role` se deriva de `profile.rol` (ya no es `useState` editable); nuevas guardas de `profileLoading`/perfil no encontrado/suspendido.
- `src/routes/AppRouter.tsx` — nuevas rutas `/login` (pública) y `/` (protegida).
- `src/App.tsx` — monta `AppProviders` (Sprint 4.1.1/4.2.1) en vez del `AuthProvider` legacy.
- `ARCHITECTURE.md` — nueva adenda `§14.9`; pointers "⚠ SUPERADO" agregados en §7.1/§8/§9.4/§9.5 (secciones legacy de Auth, sin reescribirlas).
- `PROJECT_STATUS.md`/`PHASE_4.md` — nuevas secciones de Sprint; corrección de la cabecera de `PROJECT_STATUS.md` sobre el modelo de datos oficial (ver nota en `PHASE_4.md`).

### Eliminado

- `src/contexts/AuthContext.tsx` (legacy, Fase 3) — reemplazado por el `AuthProvider`/`useAuth` de `src/providers/`/`src/hooks/`, ya completado con rol/perfil real.
- `src/components/shared/header-role-switch.tsx` — selector manual de rol, retirado según lo ya anticipado desde Fase 3 ("se elimina en la fase de Auth").

### Limitación crítica — resuelta manualmente en Supabase, pendiente de formalizar como migración

`admins`/`coordinadores`/`empresas`/`tiendas` tenían RLS habilitado sin policies de `SELECT` para `authenticated`, bloqueando la resolución de perfil real para `admin`/`coordinador`. El usuario agregó las policies/GRANTS necesarios directamente en Supabase durante la validación de cierre (2026-07-22) -- **no se generó, por decisión explícita del usuario, ninguna migración SQL que lo formalice en el repositorio todavía** (este entorno de trabajo no tiene acceso de red para verificar el SQL real contra el proyecto). Pendiente para una ronda futura, cuando el usuario provea ese SQL (`supabase db diff --linked` o export del Dashboard). Ver `SPRINT_4_2_1_AUTH_REPORT.md §8` y `PHASE_4.md` (cierre) para el detalle completo.

> **Nota de trazabilidad**: este `CHANGELOG.md` no tiene entradas para los Sprints 4.1.1, 4.1.1B, 4.1.1C (dos rondas) ni el Database Synchronization/Frontend Compatibility Audit intermedios -- ninguno de esos briefs incluyó `CHANGELOG.md` en su lista de archivos permitidos (a diferencia de `PROJECT_STATUS.md`/`ARCHITECTURE.md`, sí actualizados en casi todas esas rondas). Reconstruir esas entradas retroactivamente no fue pedido en esta ronda -- se reporta el hueco en vez de rellenarlo sin instrucción explícita. Ver `PROJECT_STATUS.md` para el registro completo Sprint a Sprint de ese período.

## [Fase 4 — Sprint 4.0.1 (tercera ronda) — Reconstrucción del baseline de Supabase] — 2026-07-16 — 🟡 En revisión

Tercer brief bajo el mismo número de Sprint, con lenguaje absoluto ("prohibido cambiar nombres de tablas", "no debes crear una arquitectura distinta"), pidiendo reconstruir `0001_initial_schema.sql` para representar exactamente un modelo con las tablas `empresas`/`tiendas`/`admins`/`coordinadores`/`instaladores`/`trabajos`/`trabajo_instaladores`/`ofertas`. Antes de tocar cualquier archivo, se verificó ese modelo contra las dos únicas fuentes SQL reales del proyecto (`handymax_supabase_schema_v3.sql`, el archivo originalmente subido, y `0001_initial_schema.sql` actual) — ambas coinciden entre sí y ninguna define esas tablas. Siguiendo la propia "regla final" de ese brief ("si detectas una diferencia, no la corrijas, detente y repórtala"), se detuvo la implementación sin tocar ningún archivo y se reportó la discrepancia al usuario.

**El usuario confirmó por escrito que el modelo oficial y definitivo es el que ya existe en el repositorio**: `empresas`/`sucursales`/`usuarios`/`zonas_cobertura`/`trabajos`/`bids`/`notificaciones` (más `trabajo_instaladores`, agregada en la primera ronda de este Sprint) — instruyendo explícitamente no reconstruir hacia el modelo de `tiendas`/`admins`/`coordinadores`/`instaladores`/`ofertas`. Esta confirmación queda documentada formalmente como la declaración oficial del modelo de datos del proyecto (`ARCHITECTURE.md §9.9`).

Con el modelo confirmado, se ejecutó la parte del brief compatible con él: se completó la estructura de `supabase/` pedida agregando `config.toml` (nuevo — no existía ningún archivo de configuración de la Supabase CLI en el proyecto), y se realizó una validación estructural completa y no superficial (tabla por tabla, columna por columna, tipo por tipo, FK por FK, PK por PK, índices, vistas, triggers, funciones, políticas) contra una base PostgreSQL 16 real, aplicando `0001` + `seed.sql` + `0002` desde cero — resultado: 0 errores, 0 diferencias respecto a lo ya documentado.

Se detectó y reportó (sin resolver unilateralmente) una tensión entre este brief y el trabajo ya aprobado: el brief exige que `0002_auth_roles_rls.sql` sea "únicamente incremental" sin modificar columnas/tablas existentes, pero `0002` (de la primera ronda) sí convierte 3 columnas existentes a ENUM y agrega una tabla nueva. Se interpretó, dada la instrucción del usuario de "mantener compatibilidad con el esquema existente", que esas conversiones ya forman parte del esquema existente — no se revirtieron ni se dividieron; se documenta la interpretación para confirmación del usuario.

### Añadido

- `supabase/config.toml` (NUEVO) — configuración estándar de Supabase CLI, escrita a mano (la CLI real no está instalada/vinculada en este entorno), documentando explícitamente esa limitación. Completa la estructura de `supabase/` pedida por el brief (`config.toml`, `README.md`, `seed.sql`, `migrations/0001_...`, `migrations/0002_...`, sin archivos adicionales).

### Modificado

- `ARCHITECTURE.md` — nueva subsección `§9.9`: declaración formal del modelo de datos oficial confirmado por el usuario, trazabilidad completa del bloqueo/confirmación, resumen de la validación estructural, y la tensión reportada sobre `0002`.
- `PROJECT_STATUS.md` — nueva entrada de Sprint documentando esta ronda.
- `PHASE_4.md` — nueva sección extensa: el bloqueo detectado, la confirmación del usuario, la validación estructural completa (tabla por tabla), el resultado de la validación SQL de punta a punta, las confirmaciones explícitas pedidas por el brief (no reinterpretación del modelo, `0002` incremental con la tensión reportada, React no modificado, repositorio listo para Sprint 4.1).
- `supabase/README.md` — nota sobre `config.toml` (nuevo) y sobre la confirmación del modelo oficial.

### No modificado (por diseño)

- `supabase/migrations/0001_initial_schema.sql` — cero cambios en esta ronda (ya había quedado limpio de datos en la ronda anterior; el modelo ya coincidía exactamente con la única fuente real).
- `supabase/migrations/0002_auth_roles_rls.sql` — cero cambios en esta ronda (ver tensión reportada arriba).
- Cualquier archivo bajo `src/`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig*.json`, `package.json`.

### Pendiente

- Aprobación explícita del usuario sobre esta ronda, en particular sobre la tensión reportada respecto a `0002`.
- Decisiones ya pendientes de rondas anteriores (ver entradas siguientes de este archivo): `UNIQUE (empresa_id, nombre)` en `sucursales`, corrección de `TODO.md`/`MIGRATION_STATUS.md`, instalación real de la Supabase CLI, columnas auto-editables en la política de perfil propio.
- No se avanza al Sprint 4.1 hasta esa aprobación.

## [Fase 4 — Sprint 4.0.1 (segunda ronda) — Database Infrastructure Baseline] — 2026-07-15 — 🟡 En revisión

Segundo brief recibido bajo el mismo número de Sprint ("4.0.1") que la ronda anterior (`Infraestructura de Base de Datos (Supabase)`, entrada siguiente de este mismo archivo) — se reporta la coincidencia de numeración, sin renumerar nada por cuenta propia. Objetivo de esta ronda: adoptar el flujo oficial de Supabase basado en migraciones, separando estructura de datos, **sin rediseñar tablas, columnas, tipos, relaciones ni FKs**, y sin modificar React/Vite/Tailwind/TS/Auth.

`supabase/migrations/0001_initial_schema.sql` tenía, embebidos, un `INSERT INTO empresas` y un bloque `DO $$ ... INSERT INTO sucursales ...` (datos de Multimax y sus 9 sucursales), más 2 queries `SELECT` de verificación manual al final — ninguno de estos es una sentencia estructural permitida en una migración limpia. Se extrajeron, sin cambiar su contenido, a dos archivos nuevos: `supabase/seed.sql` (los `INSERT`) y `supabase/README.md` (las queries de verificación, como parte de una guía de "cómo verificar que una migración aplicó correctamente"). El archivo de migración quedó con únicamente `CREATE`/`ALTER`/índices/funciones/vista/RLS — cero sentencias de datos.

No se encontró ningún `INSERT` de un "administrador inicial" en el schema real (el brief lo mencionaba) — se documenta como discrepancia: los `usuarios` nunca se sembraron por seed en este proyecto, se crean vía Auth. No se inventó ese INSERT sin una fuente real; queda como decisión de producto pendiente si se desea.

Validado de punta a punta contra una instancia real de PostgreSQL 16 (mismo método que la ronda anterior): `0001` (limpio) + `seed.sql` + `0002_auth_roles_rls.sql` aplican sin errores. Al re-ejecutar `seed.sql` una segunda vez (prueba de idempotencia) se descubrió un problema real, preexistente: el `INSERT` de `sucursales` no es realmente idempotente (no hay `UNIQUE` constraint sobre esa tabla más allá de `id`), y una segunda ejecución **duplica** las 9 sucursales. No se corrige agregando un constraint nuevo (fuera de alcance, requiere aprobación) — se documenta como riesgo en `supabase/seed.sql`, `supabase/README.md` y `PHASE_4.md`.

Se rompió, deliberadamente y por instrucción explícita de este brief, la invariante documentada desde Fase 2 de que `0001_initial_schema.sql` era una "copia literal, sin modificar, verificada con `diff`" de `handymax_supabase_schema_v3.sql`. Se corrigió esa afirmación en `ARCHITECTURE.md` (árbol de proyecto, §3) y en `PROJECT_STATUS.md`. `TODO.md`/`MIGRATION_STATUS.md` contienen la misma afirmación ahora desactualizada pero **no se tocaron**, por no estar en la lista de archivos permitidos para esta ronda — reportado para decisión futura.

### Añadido

- `supabase/seed.sql` (NUEVO) — datos iniciales (empresa Multimax + sus 9 sucursales), extraídos de `0001_initial_schema.sql` sin cambios de contenido. Incluye advertencia documentada sobre el riesgo de duplicados en `sucursales` al re-ejecutar.
- `supabase/README.md` (NUEVO) — flujo operativo completo: cómo aplicar migraciones (método manual actual vía Dashboard + flujo objetivo con Supabase CLI, no instalada/vinculada todavía), cómo y cuándo correr `seed.sql`, cómo crear una migración nueva (incluye los hallazgos reales de PostgreSQL de la ronda anterior, reformulados como checklist reutilizable), buenas prácticas, flujo Git (manual, regla permanente del proyecto), CLI utilizada, y las queries de verificación movidas desde `0001`.

### Modificado

- `supabase/migrations/0001_initial_schema.sql` — se removieron el `INSERT` de `empresas`, el bloque `DO $$` de `sucursales`, y las 2 queries `SELECT` de verificación final. Cero cambios en cualquier sentencia estructural (`CREATE`/`ALTER`/índices/funciones/vista/RLS) — mismas tablas, columnas, tipos, relaciones y constraints que antes.
- `ARCHITECTURE.md` — nueva subsección `§9.8` documentando esta ronda; corrección de la línea del árbol de proyecto en `§3` (`0001_initial_schema.sql` ya no se describe como "copia literal sin modificar").
- `PROJECT_STATUS.md` — nueva entrada de Sprint + nota de corrección sobre la invariante rota (ver arriba).

### Pendiente

- Aprobación explícita del usuario sobre esta ronda y sobre la de `§9.7`/entrada anterior, si aún no se dio.
- Decisión pendiente sobre agregar `UNIQUE (empresa_id, nombre)` a `sucursales` para que el seed sea realmente idempotente.
- Decisión pendiente sobre corregir `TODO.md`/`MIGRATION_STATUS.md` (afirmación desactualizada, fuera del alcance de esta ronda).
- No se avanza a Sprint 4.1 hasta esa aprobación.

## [Fase 4 — Sprint 4.0.1 — Infraestructura de Base de Datos (Supabase)] — 2026-07-14 — 🟡 En revisión

Primer Sprint de Fase 4 (backend real), cerrando la etapa de reconstrucción visual (Fase 3). Exclusivamente infraestructura SQL: no se modificó ningún componente React, hook, contexto, ruta, ni configuración de Vite/Tailwind — confirmado por revisión de `git status --porcelain -- src/` (comando de solo lectura).

El brief asumía tablas/columnas que no existen en el schema real (`admins`/`coordinadores`/`instaladores` separadas, `tiendas`, `ofertas`, `trabajos.estado`, `trabajos.publicado_at`, `trabajos.instalador_asignado_id`, ruta `database/migrations/002_...`, documentación bajo `docs/`) — se verificó directamente contra `supabase/migrations/0001_initial_schema.sql` (la fuente real) y se adaptó la migración a la estructura real existente (`usuarios` unificada con columna `rol`, `sucursales`, `bids`, `trabajos.phase`/`published_at`/`assigned_bid_id`, convención real `supabase/migrations/NNNN_nombre.sql`, documentación en la raíz del proyecto), documentando cada desviación con trazabilidad completa. Ver `PHASE_4.md` (nuevo, raíz del proyecto) para el detalle exhaustivo.

Validado con una instancia real de PostgreSQL 16 levantada en el entorno (no con `npm run lint/typecheck/build/dev`, que no aplican a un Sprint de backend puro y siguen bloqueados en el sandbox por falta de red): aplicación limpia de `0001_initial_schema.sql` + `0002_auth_roles_rls.sql`, y una segunda ejecución de `0002` para confirmar idempotencia total. Durante esta validación se encontraron y corrigieron 4 problemas reales de PostgreSQL (palabra reservada `current_role()`, dependencias de DDL bloqueando `ALTER COLUMN TYPE`, orden de eliminación de CHECK constraints, no-idempotencia de `CREATE POLICY`) — ver detalle en `PHASE_4.md §8`.

### Añadido

- `supabase/migrations/0002_auth_roles_rls.sql` (NUEVO) — 4 ENUMs (`user_role`, `trabajo_estado`, `oferta_estado`, `trabajo_instalador_estado`), conversión de 3 columnas `text`+CHECK a ENUM sin pérdida de datos, tabla nueva `trabajo_instaladores`, 5 índices nuevos (+4 re-declarados de forma idempotente), 6 funciones SQL nuevas (`current_user_role()`, `current_profile()`, `current_empresa()`, `is_admin()`, `is_coordinator()`, `is_installer()`) más redefinición defensiva de `get_my_rol()`, activación de RLS en `trabajo_instaladores`, y 7 políticas RLS nuevas (cerrando 3 vacíos reales en `empresas`/`sucursales`/`trabajos`/`usuarios` detectados durante este Sprint). Incluye bloque de reversión completo comentado.
- `PHASE_4.md` (NUEVO, raíz del proyecto) — reporte técnico completo del Sprint: diferencias detectadas, ENUMs, índices, funciones, políticas RLS, validación real contra PostgreSQL 16, reversibilidad, confirmación de no-modificación de React.

### Modificado

- `ARCHITECTURE.md` — nueva subsección `§9.7` documentando lo implementado en este Sprint; nota de actualización en `§9.5` (el RPC `seleccionar_instalador`, todavía propuesto/no implementado, sigue siendo válido sin cambios contra el nuevo ENUM `oferta_estado`); nuevo riesgo `§11.10` (política de auto-actualización de perfil sin restricción por columna, pendiente de decisión del usuario). Sin restructuración ni eliminación de contenido existente.

### Pendiente

- Aprobación explícita del usuario sobre las desviaciones documentadas (ver `PHASE_4.md §1`) y sobre el riesgo de auto-actualización de perfil (`PHASE_4.md §7` / `ARCHITECTURE.md §11.10`).
- No se avanza a Sprint 4.0.2 hasta esa aprobación.

## [Sprint 3.15 — `ConfirmCancel`] — 2026-07-14 — 🟡 En revisión

Continúa la migración incremental. El brief llamaba a este Sprint "Shared Dialogs" (nombre genérico de `docs/SPRINTS_INDEX.md`) y exigía explícitamente, con una regla nueva, un análisis completo del HTML antes de escribir código. Verificado por inspección directa del script: no existe ninguna función/patrón de "diálogos compartidos" en plural — el único diálogo de confirmación real es `function ConfirmCancel({ onYes, onNo })` (líneas 3531-3553), usado por `App()` para confirmar la cancelación de un trabajo. Se corrige el nombre del Sprint a `ConfirmCancel`, con trazabilidad documentada.

Hallazgo relevante: `src/components/shared/confirm-dialog.tsx` (`ConfirmDialog`) ya existía en el proyecto desde la fase de Baseline (Fases 1-3, previa a la metodología de Sprints), ya wireado a las clases `.mx-confirm-*`, con su propio JSDoc declarando que era la reconstrucción pendiente de `ConfirmCancel` — pero sin ningún consumidor real. Este Sprint lo conecta por primera vez, reutilizándolo (sin duplicar) como base de un nuevo componente `ConfirmCancelDialog`, que aporta el contenido literal exacto del bloque real (título, descripción, botones, ícono). Al conectarlo se detectaron y corrigieron 2 discrepancias de fidelidad menores en `ConfirmDialog` frente al script fuente (tamaño de ícono, tipo de las etiquetas de botón) — documentadas en `docs/sprints/sprint-3.15.md`.

Como el disparador real (botón "Cancelar" dentro de la tarjeta de trabajo activo de `Coordinator`) depende del motor de trabajos, todavía no construido, se aplicó el mismo criterio de integración temporal ya usado en los Sprints 3.7/3.8/3.9 (`Radar`/`CountRing`/`LiveCountdown`): un botón disparador temporal en `RootLayout.tsx`, documentado, a retirar cuando exista `Coordinator` real.

### Añadido

- `src/components/shared/confirm-cancel-dialog.tsx` (`ConfirmCancelDialog`, NUEVO) — reconstrucción verbatim del contenido de `ConfirmCancel`, sobre la base de `ConfirmDialog` ya existente.
- `docs/sprints/sprint-3.15.md` — análisis obligatorio ampliado (20 puntos, según la regla nueva de este Sprint), implementación, preparación para Supabase (no aplica, sin datos), validaciones.

### Modificado

- `src/components/shared/confirm-dialog.tsx` (`ConfirmDialog`) — 2 correcciones de fidelidad puntuales (tamaño de ícono `AlertTriangle` 17→16; `confirmLabel`/`cancelLabel` ampliados de `string` a `ReactNode`), sin cambios de estructura ni de props obligatorias.
- `src/layouts/RootLayout.tsx` — integración temporal de `ConfirmCancelDialog` (estado `confirmCancelOpen`, botón disparador temporal dentro de `role === 'coordinador'`, mount como hermano de `PublishModal`).

### Pendiente

- Validación técnica real (`npm run lint`/`typecheck`/`build`/`dev`), visual y funcional del usuario.
- `docs/SPRINTS_INDEX.md` no se actualiza en esta ronda — se actualizará únicamente después de la aprobación del Sprint.

## Sprint 3.14 — Cierre del Sprint

- Validación técnica aprobada por el usuario (`npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`).
- Validación visual aprobada — la implementación de `MasterCalendar` en React coincide con `Multimax_Despacho_v1.3.html`.
- Validación funcional aprobada.
- `MasterCalendar` integrado correctamente dentro de `AdminPanel` (rama real `tab === 'calendario'`) — sin ningún mount temporal en `RootLayout.tsx`.
- Sin incidencias bloqueantes.
- No hubo cambios de arquitectura — `ARCHITECTURE.md` no se modificó.
- No hubo integración con Supabase — exclusivamente visual, con datos mock (`SUSCOL`/`TRABAJOS`).
- Sprint 3.14 oficialmente completado (✅ Completado).
- Próximo Sprint: Sprint 3.15 — Shared Dialogs.

## Sprint 3.13 — Cierre del Sprint

- Validación técnica aprobada por el usuario (`npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`).
- Validación visual y funcional aprobada — la implementación de `AdminPanel`/`AdminInstaladores` en React coincide con `Multimax_Despacho_v1.3.html`.
- Integración real de `AdminPanel` dentro de `RootLayout.tsx` (`role === 'admin'`) aprobada — misma posición estructural que `App()` en el HTML fuente, sin ningún mount temporal.
- Sin incidencias bloqueantes.
- Sin decisiones arquitectónicas permanentes nuevas que requieran actualizar `ARCHITECTURE.md` — las decisiones de este Sprint (reutilización de `MxSubtabs`, no usar `Input`/`Select` genéricos en `AdminInstaladores`) son decisiones de implementación a nivel de componente, ya documentadas en `docs/sprints/sprint-3.13.md` y en este mismo archivo, no cambios al diseño arquitectónico general del proyecto.
- Sprint 3.13 oficialmente completado (✅ Completado).
- Próximo Sprint: Sprint 3.14 (`MasterCalendar`, "Calendar").

## [Sprint 3.13 — `AdminPanel`] — 2026-07-13 — ✅ Completado

Continúa la migración incremental. El brief llamaba a este Sprint "Admin Dashboard" (nombre genérico de `docs/SPRINTS_INDEX.md`) y exigía explícitamente **no asumir** que ese nombre correspondía a una función real. Verificado por inspección directa del HTML (`grep -n "function Admin"`): no existe ninguna función `AdminDashboard`; el componente raíz real es `function AdminPanel()` (líneas 3031-3048 del script), montado por `App()` cuando `role === "admin"` (línea 2121). `AdminPanel()` compone sub-tabs (`.mx-subtabs-wrap`/`.mx-subtabs`, ya migrado en el Sprint 3.3) con dos pestañas: "Calendario maestro" → `MasterCalendar` (función real, no construida, reservada para el Sprint 3.14 "Calendar") e "Instaladores" → `AdminInstaladores()` (líneas 3049-3160, `.mx-page`/`.mx-pagehead`/`.mx-admingrid`), esta última sí reconstruible ahora (solo depende de `INSTALLERS`/`ZONAS`, ya migrados).

Este Sprint aplica también, por primera vez en un componente del rol Admin, la regla de "preparación para Supabase" (vigente desde el Sprint 3.12): ninguna colección de datos se genera dentro del componente, todo proviene de constantes ya existentes (`INSTALLERS`/`ZONAS`).

**Actualización de cierre**: el usuario confirmó la validación real (`npm install`/`lint`/`typecheck`/`build`/`dev`) y la validación visual/funcional contra `Multimax_Despacho_v1.3.html` — ver "Sprint 3.13 — Cierre del Sprint" arriba.

### Añadido

- `src/components/shared/admin-panel.tsx` (`AdminPanel`) — raíz del panel de Administrador: sub-tabs "Calendario maestro"/"Instaladores" (`useState('calendario')`, valor inicial idéntico al HTML fuente). La rama "Calendario maestro" renderiza `null` en este Sprint (`MasterCalendar` no existe todavía, reservado para el Sprint 3.14) — misma limitación documentada ya usada en `InstallerDashboard` (Sprint 3.10) para sus pestañas no implementadas.
- `src/components/shared/admin-instaladores.tsx` (`AdminInstaladores`) — reconstrucción verbatim de la pestaña "Instaladores": tabla de instaladores (nombre, Pill de estado dinámico Activo/Docs pendientes/Suspendido, zona, rating, cumplimiento, botón Suspender/Reactivar) + formulario "Invitar instalador" (nombre, empresa, zona, correo, teléfono, aviso de confirmación tras enviar).
- `docs/sprints/sprint-3.13.md` — análisis obligatorio de 10 puntos (función encontrada, selector HTML, líneas del HTML, dependencias, componentes reutilizables/nuevos, CSS requerido, diferencias encontradas, riesgos, estrategia de integración), implementación, preparación para Supabase, validaciones.

### Cambiado

- `src/styles/globals.css`: se agregó el bloque `.mx-admingrid`/`.mx-admintable`/`.mx-adminrow*`/`.mx-admin-act`/`.mx-invite*` (15 selectores + 1 media query), verbatim de las líneas 324-342 y 376 del `<style>` original.
- `src/layouts/RootLayout.tsx`: se agregó `import { AdminPanel } from '@/components/shared/admin-panel';` y `{role === 'admin' && <AdminPanel />}`, en la misma posición relativa que usa el HTML fuente dentro de `App()` (después del bloque `role === 'instalador'`, antes de `PublishModal`). **Integración real y directa, no temporal**: `RootLayout.tsx` es el equivalente de `App()` desde el Sprint 3.1, y ya contiene las ramas `role === 'coordinador'`/`role === 'instalador'` en esa misma posición estructural — agregar `role === 'admin'` ahí coincide 1:1 con `role === "admin" && React.createElement(AdminPanel, null)` del script fuente.

### Reutilizado (sin duplicar)

- `MxSubtabs`/`MxSubtabButton` (Sprint 3.3) para las sub-tabs de `AdminPanel` — su propio JSDoc ya anticipaba este momento ("el Sprint que construya Coordinator/AdminPanel decide cuál de los dos usar").
- `PageContainer`/`PageHead`, `Card`/`CardHeader`, `Badge`, `Button` (Fase 3) y `INSTALLERS`/`ZONAS` (Sprints 3.7/3.5) para `AdminInstaladores` — ninguna constante nueva en este Sprint.

### Decisión de reutilización documentada

- **No se usan `Input`/`Select` (`components/ui/`) en `AdminInstaladores`**: el HTML fuente estiliza los `<input>`/`<select>` del formulario de invitación exclusivamente vía el selector descendiente `.mx-invite input,.mx-invite select` (no existe ninguna clase `.mx-input`/`.mx-select-native` en este bloque) — usar los componentes genéricos habría aplicado una clase adicional ausente en el HTML. Se reconstruyeron como elementos nativos, a diferencia de `PublishModal` (Sprint 3.5), que sí usa `Input`/`Select` porque ese bloque sí usa las clases genéricas.
- `susp`/`form`/`sent` (estado interno de `AdminInstaladores`) son estado de interacción de UI, no datos de negocio — mismo criterio ya aplicado a `PublishModal` (Sprint 3.5), no sujetos a la regla de preparación para Supabase.

### Preparación para Supabase (regla vigente desde el Sprint 3.12)

- `AdminPanel`/`AdminInstaladores` son puramente de presentación respecto a datos de negocio: `INSTALLERS`/`ZONAS` ya vivían en `src/constants/index.ts`, ninguna colección nueva se generó dentro de los componentes.
- Detalle completo en `docs/sprints/sprint-3.13.md` → "Preparación para integración con Supabase".

### Sin cambios

- No se modificó `Header`, `Sidebar`, `InstallerSidebar`, `InstallerDashboard`, `InstallerProfile`, `InstallerJobs`, `Coordinator`, `CoordinatorEmptyState`, `PublishModal`, `Radar`, `CountRing`, `LiveCountdown`, `MxSubtabs`/`MxSubtabButton` (reutilizados tal cual). No se creó ninguna ruta nueva ni se modificó React Router/Context/Hooks. No se integró Supabase (fetch/servicios/queries/mutations/realtime/auth/storage) — exclusivamente visual, con datos mock.

### Validación

- `tsc --noEmit` (stubs ambientales, básico + estricto): 0 diagnósticos. `prettier --check` sobre `.ts`/`.tsx`/`.css`: cero diferencias tras una corrección de formato en `admin-instaladores.tsx`. `git diff --stat` confirma el alcance exacto.
- **Sprint 3.13 — ✅ Completado** — validación real (`npm install`/`lint`/`typecheck`/`build`/`dev`) y validación visual/funcional (comparación contra `Multimax_Despacho_v1.3.html`) confirmadas por el usuario (ver "Sprint 3.13 — Cierre del Sprint" arriba). Sin pendientes técnicos para cerrar este Sprint.

## Sprint 3.12 — Cierre del Sprint

- Validación técnica aprobada por el usuario (`npm install`, `npm run lint` [únicamente warnings conocidos], `npm run typecheck`, `npm run build`, `npm run dev`).
- Validación visual aprobada — la implementación de `InstallerJobs` en React coincide con `Multimax_Despacho_v1.3.html`.
- Validación funcional aprobada — sin regresiones sobre componentes previamente aprobados.
- Integración real de `InstallerJobs` dentro de la rama `instTab === 'trabajos'` de `InstallerDashboard` aprobada — sin ningún mount temporal en `RootLayout.tsx`, per la regla de integración vigente desde el Sprint 3.11.
- Sin incidencias bloqueantes.
- Sprint 3.12 oficialmente completado (✅ Completado).
- Próximo Sprint: Sprint 3.13.

## [Sprint 3.12 — `InstallerJobs`] — 2026-07-13

Continúa la migración incremental. El brief exigió confirmar, antes de escribir código, que el nombre "InstallerJobs" correspondiera a una función real — coincide exactamente: `function InstallerJobs()` (líneas 3453-3484 del script, selector `.mx-myjobs`, sin props). A partir de este Sprint rige además la nueva regla permanente de "preparación para Supabase": los datos deben provenir de props o constantes reutilizables, nunca generados dentro del componente.

### Añadido

- `src/components/shared/installer-jobs.tsx` (`InstallerJobs`) — reconstrucción verbatim de la pantalla "Mis trabajos" del teléfono del Instalador (agrupación "Próximos"/"Historial", tarjetas con tipo, Pill de estado, zona, fecha/hora y precio).
- `docs/sprints/sprint-3.12.md`.

### Cambiado

- `src/constants/index.ts`: se agregaron `ESTADO` (mapeo completo de 6 estados→tono/etiqueta, verbatim de `const ESTADO`, línea 1155 del script — se portó completo, no solo el subconjunto usado por `MISJOBS`, para no reabrir este archivo cuando se migre `Coordinator()`/`TRABAJOS`) y `MISJOBS` (mock de 4 trabajos, verbatim de `const MISJOBS`, línea 1327).
- `src/styles/globals.css`: se agregó el bloque `.mx-phonehdr`/`.mx-myjobs`/`.mx-myjob*` (8 selectores, 10 reglas), verbatim.
- `src/components/shared/installer-dashboard.tsx`: la rama `instTab === 'trabajos'` (antes `null`) ahora renderiza `<InstallerJobs />`. Integración real y directa dentro del contenedor existente — a diferencia de `InstallerProfile` en su entrega inicial (Sprint 3.11), `InstallerJobs` no requirió ningún mount temporal en `RootLayout.tsx`, ya que la nueva regla de integración (vigente desde el Sprint 3.11) exige integrar directamente en el contenedor real cuando este ya existe.

### Reutilizado (sin duplicar)

- `Badge` (`.mx-pill`, Fase 3) para la Pill de estado — mismo criterio que `InstallerProfile` (Sprint 3.11): el mapeo estado→tono ya lo resuelve `ESTADO`, así que no hace falta `StatusBadge`.
- `MISJOBS`/`ESTADO` como constantes reutilizables (no generadas dentro del componente), mismo patrón que `INSTALLERS`.

### Preparación para Supabase (regla vigente desde este Sprint)

- `InstallerJobs` es puramente de presentación: sin estado, sin efectos, sin lógica de negocio.
- `MISJOBS`/`ESTADO` viven en `src/constants/index.ts`, no como literales dentro del componente — podrán sustituirse por datos reales de la tabla `trabajos` sin tocar JSX/estructura/estilos. Detalle completo en `docs/sprints/sprint-3.12.md` → "Preparación para integración con Supabase".

### Sin cambios

- No se modificó `Header`, `Sidebar`, `InstallerSidebar`, `InstallerDashboard` (más allá de activar su rama `trabajos`), `InstallerProfile`, `Coordinator`, `CoordinatorEmptyState`, `PublishModal`, `Radar`, `CountRing`, `LiveCountdown`, `MxSubtabs`, `SucursalSelect`. `RootLayout.tsx` no requirió ningún cambio. No se creó ninguna ruta nueva ni se modificó React Router. No se integró Supabase (fetch/servicios/queries/mutations/realtime/auth/storage) — exclusivamente visual, con datos mock.

### Validación

- `tsc --noEmit` (stubs ambientales, básico + estricto): 0 diagnósticos. `prettier --check` sobre `.ts`/`.tsx`/`.css`: cero diferencias. `git diff --stat` confirma el alcance exacto.
- **Sprint 3.12 — ✅ Completado** — validación real (`npm install`/`lint`/`typecheck`/`build`/`dev`) y validación visual y funcional (comparación contra `Multimax_Despacho_v1.3.html`, sin regresiones) confirmadas por el usuario (ver "Sprint 3.12 — Cierre del Sprint" arriba).

## Sprint 3.11 — Cierre del Sprint

- Validación técnica aprobada por el usuario (`npm install`, `npm run lint` [únicamente warnings conocidos], `npm run typecheck`, `npm run build`, `npm run dev`).
- Validación visual aprobada — la implementación de `InstallerProfile` en React coincide con `Multimax_Despacho_v1.3.html`.
- Integración temporal de `InstallerProfile` aprobada, con un ajuste posterior: el punto de integración se movió de un mount independiente en `RootLayout.tsx` a la rama real `instTab === 'perfil'` de `InstallerDashboard` (Sprint 3.10), sin modificar el componente `InstallerProfile` (misma implementación, misma lógica, mismos estilos, misma estructura).
- Sin incidencias bloqueantes.
- Sprint 3.11 oficialmente completado (✅ Completado).
- Próximo Sprint: Sprint 3.12.

## [Sprint 3.11 — `InstallerProfile`] — 2026-07-13

Continúa la migración incremental. El brief exigió confirmar, antes de escribir código, que el nombre "Installer Profile" de `docs/SPRINTS_INDEX.md` correspondiera a una función real — a diferencia de la mayoría de los Sprints anteriores de esta fase, aquí el nombre **sí coincide exactamente**: `function InstallerProfile({ meInfo })` (líneas ~3491-3524 del script, selector `.mx-profscreen`).

### Añadido

- `src/components/shared/installer-profile.tsx` (`InstallerProfile`) — reconstrucción verbatim de la pantalla "Perfil" del teléfono del Instalador (avatar, nombre, zona, Pill "Instalador verificado", 4 estadísticas, "Reglas de prioridad" de 4 ítems).
- `docs/sprints/sprint-3.11.md`.

### Cambiado

- `src/styles/globals.css`: se agregó el bloque `.mx-prof*` (12 reglas: `.mx-profscreen`, `.mx-profhero`, `.mx-profava`, `.mx-profname`, `.mx-profzone`, `.mx-profstats`, `.mx-profstat` + `b`/`span`, `.mx-profblock` + `h4`/`h4 svg`), verbatim.
- `src/components/shared/installer-dashboard.tsx`: la rama `instTab === 'perfil'` (antes `null`) ahora renderiza `<InstallerProfile meInfo={meInfo} />`, reutilizando el mismo `meInfo` que ese componente ya deriva de `INSTALLERS`/`meId` — integración real, coincide exactamente con el HTML fuente (`instTab === "perfil" && InstallerProfile({ meInfo })`). Ajuste solicitado por el usuario tras la validación visual inicial (ver "Integración temporal" abajo).
- `src/layouts/RootLayout.tsx`: se retiró el mount temporal independiente de `InstallerProfile` (import, constante mock `INSTALLERPROFILE_DEMO_MEINFO`, JSX) — ya no es necesario porque `InstallerDashboard` lo renderiza internamente. El bloque JSDoc que documentaba esa integración se marcó `[SUPERSEDIDA]`, conservando el razonamiento original como registro histórico.

### Reutilizado (sin duplicar)

- `Badge` (`.mx-pill`, Fase 3) con `tone="green"` — reconstruye el helper interno `Pill` del HTML; se descartó `StatusBadge` por agregar una capa semántica que no existe en el uso original.
- `INSTALLERS`/`InstallerMock` (`src/constants/index.ts`, ya existentes) para el prop `meInfo`.

### Reportado (sin corregir)

- La lista "Reglas de prioridad" de este bloque tiene 4 ítems, no 5 — no se unificó con la versión de 5 ítems de `mx-instside` (`InstallerPriorityRules`, Sprint 3.2); ambas se mantienen tal cual su bloque de origen en el HTML.

### Integración temporal

- Entrega inicial: `InstallerProfile` se montó como hermano independiente de `InstallerDashboard` en `RootLayout.tsx` (con `meInfo` mock fijo, `INSTALLERS[0]`), porque el brief de este Sprint prohibía modificar `InstallerDashboard` — mismo criterio ya usado para `CountRing` en el Sprint 3.8.
- Ajuste posterior (mismo día, aprobado explícitamente por el usuario tras la validación visual): el punto de integración se movió a la rama real `instTab === 'perfil'` de `InstallerDashboard`, sin modificar `InstallerProfile` (componente, lógica, estilos y estructura intactos). `RootLayout.tsx` ya no monta `InstallerProfile` directamente — solo renderiza `InstallerDashboard` (más `CountRing`, integración temporal separada del Sprint 3.8) dentro de `role === 'instalador'`.

### Sin cambios

- No se modificó `Header`, `Footer`, `SucursalSelect`, `MxSubtabs`, `PublishModal`, `CoordinatorEmptyState`, `Radar`, `CountRing`, `LiveCountdown`. No se creó ninguna ruta nueva ni se modificó React Router. No se usaron datos reales ni se integró Supabase.

### Validación

- `tsc --noEmit` (stubs ambientales, básico + estricto): 0 diagnósticos, tanto en la entrega inicial como tras el ajuste de integración. `prettier --check` sobre `.ts`/`.tsx`: cero diferencias. `git diff --stat` confirma el alcance exacto.
- **Sprint 3.11 — ✅ Completado** — validación real (`npm install`/`lint`/`typecheck`/`build`/`dev`) y validación visual (comparación contra `Multimax_Despacho_v1.3.html`) confirmadas por el usuario (ver "Sprint 3.11 — Cierre del Sprint" arriba).

## Sprint 3.10 — Cierre del Sprint

- Validación técnica aprobada por el usuario (`npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`).
- Validación visual aprobada — el layout de `InstallerDashboard` en React coincide con `Multimax_Despacho_v1.3.html`.
- Integración temporal de `InstallerDashboard` en `RootLayout.tsx` aprobada.
- Sprint 3.10 oficialmente completado (✅ Completado).
- Próximo Sprint: Sprint 3.11.

## [Sprint 3.10 — `InstallerDashboard`] — 2026-07-13

Continúa la migración incremental. "Installer Dashboard" (nombre genérico del brief) no corresponde a ninguna función real del HTML — la función real y equivalente es `function Installer(props)` (líneas 3169-3452), montada por `App()` cuando `role === "inst"`. Dentro de ella, `InstallerJobs()` (`.mx-myjobs`) e `InstallerProfile()` (`.mx-profscreen`) son funciones reales con selector propio, ya reservadas como Sprints independientes (3.12 y 3.11 respectivamente) — este Sprint reconstruye únicamente el resto: la composición `.mx-instwrap`, la barra del teléfono (`.mx-phone-bar`/`.mx-mesel`), la navegación `.mx-phonetabs` y el único estado de "Solicitudes" alcanzable sin motor de trabajos real (`mx-phone-empty`), mismo criterio ya aplicado a `Coordinator()` en el Sprint 3.6.

### Añadido

- `src/components/shared/installer-dashboard.tsx` (`InstallerDashboard`) — orquestador de la pantalla principal del Instalador.
- `src/components/shared/installer-solicitudes-empty-state.tsx` (`InstallerSolicitudesEmptyState`) — reconstruye `mx-phone-empty` verbatim.
- `src/components/shared/mx-phone-tabs.tsx` (`MxPhoneTabs`) — contenedor `.mx-phonetabs`.
- `docs/sprints/sprint-3.10.md`.

### Cambiado

- `src/styles/globals.css`: se agregó `.mx-phone-empty` (+ `svg`/`p`/`span`), verbatim (gap no portado desde Fase 3).
- `src/layouts/RootLayout.tsx`: nuevo estado `meId`/`setMeId` (reproduce el `useState("pty")` real de `App()`); la integración temporal de `InstallerSidebar` del Sprint 3.2.1/3.2.2 (ad-hoc, con un Phone Placeholder vacío) se reemplaza por la composición real `<InstallerDashboard meId={meId} onMeIdChange={setMeId} />`, dentro de `role === 'instalador'`. `InstallerSidebar` no se modifica — solo cambia su contexto de integración.

### Reutilizado (sin duplicar)

- `TwoColumnLayout` y `PhoneFrame` (Fase 3) — primer consumidor real de ambos.
- `InstallerSidebar` (Sprint 3.2) — ahora en su posición estructural real por primera vez.
- `MxSubtabButton` (Sprint 3.3) — reutilizado tal cual para los botones de `.mx-phonetabs` (implementación agnóstica de la clase del contenedor padre).

### Reportado (sin corregir)

- Al activar las pestañas "Mis trabajos"/"Perfil", la navegación es real y funcional (resaltado de la pestaña activa), pero no se renderiza contenido — `InstallerJobs`/`InstallerProfile` están reservados a los Sprints 3.12/3.11.
- Las 7 ramas restantes de "Solicitudes" (`mx-alert`/`mx-offer`/`mx-phone-sent`/`mx-phone-done`×3) y el consumo de `CountRing` dentro de ellas dependen del motor de trabajos real, todavía inexistente.
- El `onChange` de `.mx-mesel` en el HTML fuente también reinicia `step` a `"alert"` — `step` no existe en este subconjunto reconstruido (pertenece a las ramas fuera de alcance); se omite esa parte del handler.

### Sin cambios

- No se modificó `Header`, `Footer`, `SucursalSelect`, `MxSubtabs` (versión "subtabs"), `PublishModal`, `CoordinatorEmptyState`, `Radar`, `CountRing`, `LiveCountdown`. No se creó ninguna ruta nueva ni se modificó React Router. No se usaron datos reales ni se integró Supabase.

### Validación

- `tsc --noEmit` (stubs ambientales, incluida una pasada con `noUnusedLocals`/`noUnusedParameters`): 0 diagnósticos. `prettier --check` sobre `.ts`/`.tsx`: cero diferencias. `git diff --stat` confirma el alcance exacto (3 archivos nuevos, 2 modificados en `src/`).
- **Sprint 3.10 — ✅ Completado** — validación real (`npm install`/`lint`/`typecheck`/`build`/`dev`) y validación visual (comparación contra `Multimax_Despacho_v1.3.html`) confirmadas por el usuario (ver "Sprint 3.10 — Cierre del Sprint" arriba).

## Sprint 3.9 — Cierre del Sprint

- Validación técnica aprobada por el usuario (`npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`).
- Validación visual aprobada — `LiveCountdown` coincide con `Multimax_Despacho_v1.3.html`.
- Integración temporal de `LiveCountdown` en `RootLayout.tsx` aprobada.
- Sprint 3.9 oficialmente completado (✅ Completado).
- Próximo Sprint: Sprint 3.10.

## [Sprint 3.9 — `LiveCountdown`] — 2026-07-11

Continúa la migración incremental. El brief de este Sprint exigió, como los anteriores, un análisis previo obligatorio antes de escribir código (localización exacta, análisis completo del cuerpo de la función, determinación de consumidores, documentación en `docs/sprints/sprint-3.9.md`). `LiveCountdown` (líneas 2473-2493 del script) es un `<span>` de texto con countdown propio (`useState`+`useEffect`+`setInterval`), sin ninguna clase CSS propia. Se detectaron y reportaron dos discrepancias entre el brief y el HTML real: (1) `LiveCountdown` NO renderiza `CountRing` (Sprint 3.8) — son dos componentes de countdown independientes y sin relación en el HTML fuente; (2) `LiveCountdown` NO dispara ningún callback al expirar — no existe ninguna prop de tipo función en su firma real. A partir de este Sprint aplica la nueva regla permanente del proyecto: la integración temporal en `RootLayout.tsx` forma parte del propio Sprint y no requiere autorización adicional antes de aplicarla.

### Añadido

- `src/components/shared/live-countdown.tsx` (`LiveCountdown`) — `<span>` de countdown con timer propio, sin sub-componentes.
- `docs/sprints/sprint-3.9.md`.

### Cambiado

- `src/lib/utils.ts`: JSDoc de `fmt` actualizado para documentar a `LiveCountdown` como su segundo consumidor real (sin cambio de lógica).
- `src/layouts/RootLayout.tsx`: integración TEMPORAL de `LiveCountdown` (props mock `LIVECOUNTDOWN_DEMO_PUBLISHED_AT`/`LIVECOUNTDOWN_DEMO_BID_MINS`) dentro de `role === 'coordinador'`, como último elemento del bloque — su rol real en el HTML fuente (`statusPill`/`QueueBar` de `Coordinator`), a diferencia de `CountRing` (`role === 'instalador'`).

### Adaptación técnica (no visual)

- `calc` se envuelve en `useCallback(calc, [publishedAt, total])` para satisfacer la regla de ESLint `react-hooks/exhaustive-deps` (activa en este proyecto desde Fase 3), sin alterar el comportamiento de reinicio del timer del HTML original.

### Reportado (sin corregir)

- `LiveCountdown` no tiene todavía consumidor real dentro del flujo de la aplicación: su único uso real (`statusPill(jb)` dentro de `QueueBar`, dentro de `Coordinator`) depende de `jobs.length > 0`, sin datos reales todavía (mismo bloqueo documentado para `CoordinatorEmptyState`/`Radar` en los Sprints 3.6/3.7). Integración temporal aplicada directamente en `RootLayout.tsx`, sin pausa de aprobación, per la nueva regla permanente de este Sprint.
- El brief asumía que `LiveCountdown` renderiza `CountRing` y que dispara callbacks al expirar — ambas asunciones son falsas contra el HTML real; se implementó la versión verificada, no la asumida. Ver `docs/sprints/sprint-3.9.md` → "Funcionalidad esperada — verificación punto por punto".

### Sin cambios

- No se modificó `Header`, `Sidebar`, `Main Layout`, `PublishModal`, `Radar`, `CountRing`, `MxSubtabs`/`MxSubtabButton`, `SucursalSelect` ni ningún otro componente previamente aprobado. No se reconstruyó `JobCard`, `Coordinator` (más allá de la integración temporal ya existente), `Installer` ni ninguna pantalla nueva. No se integró Supabase. Cero CSS nuevo en `globals.css`.

### Validación

- `tsc --noEmit` (stubs ambientales): 0 diagnósticos. `prettier --check` sobre `.ts`/`.tsx`: cero diferencias. `git diff --stat` confirma el alcance exacto (1 archivo nuevo de componente, 2 archivos de código modificados).
- **Sprint 3.9 — ✅ Completado** — validación real (`npm install`/`lint`/`typecheck`/`build`/`dev`) y validación visual y funcional (timer corriendo en vivo) confirmadas por el usuario (ver "Sprint 3.9 — Cierre del Sprint" arriba).

## Sprint 3.8 — Cierre del Sprint

- Validación técnica aprobada por el usuario (`npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`).
- Validación visual aprobada — `CountRing` coincide con `Multimax_Despacho_v1.3.html`.
- Integración temporal de `CountRing` en `RootLayout.tsx` aprobada.
- Sprint 3.8 oficialmente completado (✅ Completado).
- Próximo Sprint: Sprint 3.9.

## [Sprint 3.8 — `CountRing`] — 2026-07-10

Continúa la migración incremental. El brief de este Sprint exigió un análisis previo exhaustivo (20 preguntas) antes de escribir cualquier código, y una segunda aprobación explícita del usuario antes de implementar. `CountRing` (líneas 1437-1491 del script) es un anillo SVG de countdown, sin ninguna clase CSS propia (todo inline) y sin estado/efectos/timers internos — función pura derivada de sus props. Se detectó y reportó un hallazgo adicional: el script tiene un segundo componente real de countdown, `LiveCountdown` (línea 2473, con timer propio, usado dentro de `Coordinator`/`mx-jobcard`), distinto de `CountRing` y fuera de alcance de este Sprint.

### Añadido

- `src/components/shared/countring.tsx` (`CountRing`) — anillo SVG de countdown, sin sub-componentes.
- `docs/sprints/sprint-3.8.md`.

### Cambiado

- `src/lib/utils.ts`: se reincorpora `fmt` (retirada en el Sprint 3.7 tras confirmar que `Radar` no la usaba; `CountRing` sí la usa genuinamente, línea 1482 del HTML).
- `src/layouts/RootLayout.tsx`: integración TEMPORAL de `CountRing` (props mock estáticas, aprobada explícitamente por el usuario) dentro de `role === 'instalador'`, como hermano de `.mx-instwrap`.

### Reportado (sin corregir)

- `CountRing` no tiene todavía consumidor real: sus dos usos reales en el HTML están dentro de las pantallas "alerta"/"oferta" del teléfono del Instalador (`mx-phone`), que no existen en el proyecto. Se deja documentado, con integración temporal aprobada para validación visual — ver `docs/sprints/sprint-3.8.md`.
- `LiveCountdown` (componente real distinto, línea 2473) no se implementó — queda para el Sprint que reconstruya `mx-jobcard`/QueueBar dentro de `Coordinator`, sin número asignado todavía.

### Sin cambios

- No se modificó `Header`, `mx-instside`/`InstallerSidebar`, `mx-subtabs`, `SucursalSelect`, `PublishModal`, `CoordinatorEmptyState`, `Radar`, `Footer` ni `AppRouter.tsx`. No se creó ninguna ruta nueva ni se modificó React Router. No se implementó `LiveCountdown` ni ninguna lógica real del flujo del Instalador. No se integró Supabase. Cero CSS nuevo en `globals.css`.

### Validación

- `tsc --noEmit` (stubs ambientales): 0 diagnósticos. `prettier --check` sobre `.ts`/`.tsx`: cero diferencias. `git diff --stat` confirma el alcance exacto (solo 3 archivos: 1 nuevo, 2 modificados).
- **Sprint 3.8 — ✅ Completado** — validación real (`npm install`/`lint`/`typecheck`/`build`/`dev`) y validación visual confirmadas por el usuario (ver "Sprint 3.8 — Cierre del Sprint" arriba).

## [Sprint 3.7 — Cierre del Sprint] — 2026-07-09

Cierre administrativo. Sin cambios de código en esta entrada — únicamente documentación.

- ✅ Validación local aprobada por el usuario (`npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`) sobre `feature/sprint-3-7-radar`.
- ✅ Validación visual aprobada por el usuario: `Radar` coincide con `Multimax_Despacho_v1.3.html`.
- ✅ Sprint 3.7 cerrado.
- Siguiente Sprint a desarrollar: **Sprint 3.8** (`Countdown`/`CountRing`) (no se inicia sin el análisis previo obligatorio de su propio bloque HTML).

## [Sprint 3.7 — `Radar`] — 2026-07-09

Continúa la migración incremental. El brief de este Sprint llamaba al bloque "Radar / Mapa de Instaladores" y sugería una arquitectura multi-componente (`RadarMap`/`RadarMarker`/`RadarOverlay`/`RadarControls`/etc.) que **no corresponde a nada real del HTML**: el análisis obligatorio confirmó que `Radar` es un único componente SVG autocontenido (líneas 1492-1745 del script), sin librería de mapas ni sub-componentes propios. Se descartó explícitamente `CountRing` (vecino en el archivo, líneas 1437-1491) — es un anillo de countdown sin relación con el radar, reservado para el Sprint 3.8.

### Añadido

- `src/components/shared/radar.tsx` (`Radar`) — reconstruye el panel SVG completo: círculos concéntricos, grilla, sweep animado, pines de instaladores (posición determinística vía `hashAngle` + km), líneas de "ruta" y leyenda de 5 colores.
- `INSTALLERS` (11 instaladores) y `ELIGIBLE_ORDER` (9 ids) en `src/constants/index.ts` — mocks verbatim del HTML fuente.
- `hashAngle` en `src/lib/utils.ts` — utilidad pura de hash determinístico, verbatim.
- `.mx-radar-wrap`/`.mx-radar`/`.mx-sweep`/`.mx-ping`/`.mx-radar-legend` en `src/styles/globals.css`, verbatim; más un segundo bloque `@media (prefers-reduced-motion: reduce)` para las clases planas `.mx-sweep`/`.mx-ping`/`.mx-blink`/`.mx-spin` (gap de Fase 3 detectado y corregido de paso, adición pura).
- `docs/sprints/sprint-3.7.md`.

### Cambiado

- `src/layouts/RootLayout.tsx`: integración TEMPORAL de `Radar` (props mock, aprobada explícitamente por el usuario tras consulta directa) como último hijo del bloque `role === 'coordinador'`, después de `CoordinatorEmptyState`.

### Reportado (sin corregir)

- `Radar` no tiene todavía consumidor real: en el HTML fuente solo se monta dentro de la tarjeta "Despacho en vivo" de `Coordinator()`, que requiere `jobs.length > 0` (sin datos reales todavía). Se deja documentado, con integración temporal aprobada para validación visual — ver `docs/sprints/sprint-3.7.md`.

### Sin cambios

- No se modificó `Header`, `mx-instside`/`InstallerSidebar`, `mx-subtabs`, `SucursalSelect`, `PublishModal`, `CoordinatorEmptyState`, `Footer` ni `AppRouter.tsx`. No se creó ninguna ruta nueva ni se modificó React Router. No se implementó `CountRing`, `mx-jobcard`, QueueBar, Indicadores reales, Timeline, Calendar, ni ningún módulo de Installer/Admin. No se integró ninguna librería de mapas ni API/Supabase.

### Validación

- `tsc --noEmit` (stubs ambientales): 0 diagnósticos. `prettier --check` sobre `.ts`/`.tsx`: cero diferencias (tras `--write` sobre el archivo nuevo). `git diff --stat` confirma el alcance exacto.
- **Sprint 3.7 queda en 🟡 En revisión** — pendiente de que el usuario confirme localmente las 4 validaciones reales y la validación visual.

## [Sprint 3.6 — Cierre del Sprint] — 2026-07-09

Cierre administrativo. Sin cambios de código en esta entrada — únicamente documentación.

- ✅ Validación local aprobada por el usuario (`npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`) sobre `feature/sprint-3-6-coordinator-empty-state`.
- ✅ Validación visual aprobada por el usuario: `CoordinatorEmptyState` coincide con `Multimax_Despacho_v1.3.html`, y el botón "Publicar trabajo" abre correctamente `PublishModal`.
- ✅ Sprint 3.6 cerrado.
- Siguiente Sprint a desarrollar: **Sprint 3.7** (no se inicia sin aprobación explícita).

## [Sprint 3.6 — `CoordinatorEmptyState`] — 2026-07-09

Continúa la migración incremental. El nombre genérico "Job Cards" que traía `docs/SPRINTS_INDEX.md` para este Sprint **no corresponde** al bloque real reconstruible ahora mismo: `mx-jobcard` y el resto de `function Coordinator(props)` (QueueBar, Radar, AssignedPanel, respuestas) solo se alcanzan cuando `jobs.length > 0`, y `jobs` arranca en `[]` sin ningún seed/mock en el HTML fuente — poblarlo requeriría lógica de negocio o mocks fuera de alcance de este Sprint. El único bloque de `Coordinator()` reconstruible honestamente es su estado vacío (`mx-qempty`, líneas 2146-2163 del script). Corrección de nombre análoga a la del Sprint 3.4 ("Main Layout" → `mx-suc-sel`).

### Añadido

- `src/components/shared/coordinator-empty-state.tsx` (`CoordinatorEmptyState`) — reconstruye `div.mx-qempty` (icono `Crosshair`, "No hay trabajos activos", texto, botón "Publicar trabajo"), reutilizando `EmptyState` (`size="page"`) y `Button` (`variant="ice"`), ambos de Fase 3 y sin consumidor real hasta este Sprint.
- `docs/sprints/sprint-3.6.md`.

### Cambiado

- `src/layouts/RootLayout.tsx`: se agrega `<CoordinatorEmptyState onOpenPublish={() => setShowPublishModal(true)} />` como último hijo del bloque `role === 'coordinador'`, después de `MxSubtabs` — misma posición relativa que `Coordinator` en el HTML fuente. Se revierte `showPublishModal` de `useState(true)` (forzado, Sprint 3.5) a `useState(false)` (valor real del HTML fuente), ya que ahora existe el botón real `onOpenPublish` que lo abre — resuelve el pendiente documentado desde el cierre del Sprint 3.5.

### Sin CSS nuevo

- `.mx-qempty`/`.mx-qempty-ic`/`.mx-btn`/`.mx-btn-ice` ya estaban portados en `globals.css` desde Fase 3 — verificado antes de implementar. `globals.css` no se tocó en este Sprint.

### Sin cambios

- No se modificó `Header`, `mx-instside`/`InstallerSidebar`, `mx-subtabs`/`MxSubtabs`/`MxSubtabButton`, `SucursalSelect`, `PublishModal` (el componente en sí), `Footer` ni `AppRouter.tsx`. No se implementó `mx-jobcard`, `QueueBar`, Radar, `AssignedPanel`, `NoResponsePanel`, feed de respuestas, `CoordinatorJobs`, ni ninguna lógica de negocio/Supabase/realtime/mock de trabajos.

### Validación

- `tsc --noEmit` (stubs ambientales): 0 diagnósticos. `prettier --check` sobre `.ts`/`.tsx`: cero diferencias (tras `--write` sobre el único archivo nuevo). `git diff --stat`: solo `RootLayout.tsx` modificado + `coordinator-empty-state.tsx` nuevo, `globals.css` sin cambios.
- **Sprint 3.6 queda en 🟡 En revisión** — pendiente de que el usuario confirme localmente `npm install`/`lint`/`typecheck`/`build`/`dev` y la validación visual.

## [Sprint 3.5 — Cierre del Sprint] — 2026-07-09

Cierre administrativo. Sin cambios de código en esta entrada — únicamente documentación.

- ✅ Validación local aprobada por el usuario (`npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`) sobre `feature/sprint-3-5-publish-modal`.
- ✅ Validación visual aprobada por el usuario: `PublishModal` coincide con `Multimax_Despacho_v1.3.html`, sin diferencias visuales importantes. La integración temporal mediante `showPublishModal=true` queda aprobada tal cual hasta que exista `Coordinator`/`QueueBar`.
- ✅ Sprint 3.5 cerrado.
- Siguiente Sprint a desarrollar: **Sprint 3.6** (no se inicia sin aprobación explícita).

## [Sprint 3.5 — `PublishModal`] — 2026-07-09

Continúa la migración incremental. Se verificó que el nombre genérico "Publish Modal" de `docs/SPRINTS_INDEX.md` corresponde al bloque real (función `PublishModal()`, línea 2496 del script) — a diferencia del Sprint 3.4, aquí no hubo que corregir el nombre. Se detectó y descartó un snapshot DOM obsoleto (`.mx-publishwrap`/`.mx-publish`) que no aparece en ningún `React.createElement` del script vigente.

### Añadido

- `src/components/shared/publish-modal.tsx` (`PublishModal`, `PublishForm`) — reconstruye `.mx-modal-bg`/`.mx-modal-panel`/`.mx-modal-hd`/`.mx-modal-close`/`.mx-modal-body` (vía `Drawer`, Fase 3, primer consumidor real) + el formulario completo `.mx-fields` (14 campos, líneas 2496-2631 del HTML fuente).
- `PROVINCIAS`, `ZONAS`, `BID_OPTIONS` (+ interfaz `BidOption`), `buildTimeSlots`/`SLOTS_COORD` en `src/constants/index.ts` — catálogos verbatim del HTML fuente (líneas 1061-1113).
- `.mx-priceinput`/`.mx-datein` en `src/styles/globals.css` — CSS verbatim de las líneas 222-226 y 229-230 del HTML fuente, no portado antes de este Sprint.
- `docs/sprints/sprint-3.5.md`.

### Cambiado

- `src/layouts/RootLayout.tsx`: nuevo estado `showPublishModal`/`setShowPublishModal` (forzado a `true` temporalmente — el HTML fuente arranca en `false` — para que el bloque sea visible sin esperar al botón real `onOpenPublish` de `Coordinator`/`QueueBar`, todavía inexistente); `PublishModal` se renderiza como hermano de los bloques de `role` ya migrados, justo antes de `<Outlet/>`, mismo orden relativo que en `App()`.

### Reportado (sin corregir)

- El botón "Publicar trabajo" invoca `onPublish(f)`, pero se le pasa una función vacía — no existe todavía ningún `TRABAJOS`/lista de trabajos que actualizar (Sprint futuro de Job Cards).
- Snapshot DOM obsoleto detectado para este mismo bloque (ver arriba) — documentado, no se usó como referencia de implementación.

### Sin cambios

- No se modificó `Header`, `mx-instside`/`InstallerSidebar`, `mx-subtabs`/`MxSubtabs`/`MxSubtabButton`, `SucursalSelect`, `Footer`, `AppRouter.tsx` ni `ARCHITECTURE.md`. No se implementó Job Cards, Radar, Timeline, Countdown, Feed, Admin, Installer Dashboard, lógica realtime, Supabase ni navegación real.

### Validación

- `tsc --noEmit` (stubs ambientales): 0 diagnósticos. `prettier --check` sobre `.ts`/`.tsx`: cero diferencias. Balance de llaves de `globals.css`: 165/165.
- Limitación detectada en los stubs ambientales de este sandbox (colapsan tipos de React a `any`) que ocultaba un error real de indexado estricto (`ZONAS` vs. `f.provincia: string`) — corregido manualmente antes de continuar (ver `docs/sprints/sprint-3.5.md`).
- Las cuatro validaciones reales (`npm run lint`/`typecheck`/`build`/`dev`) y la validación visual siguen pendientes de confirmación del usuario en su máquina.

## [Sprint 3.4 — Cierre del Sprint] — 2026-07-08

Cierre administrativo. Sin cambios de código en esta entrada — únicamente documentación.

- ✅ Validación local aprobada por el usuario (`npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`) sobre `feature/sprint-3-4-mx-suc-sel`.
- ✅ Validación visual aprobada por el usuario: `SucursalSelect` es visible en la posición correcta y coincide con `Multimax_Despacho_v1.3.html`.
- ✅ Sprint 3.4 cerrado.
- Siguiente Sprint a desarrollar: **Sprint 3.5** (no se inicia sin aprobación explícita).

## [Sprint 3.4 — `mx-suc-sel`] — 2026-07-08

Continúa la migración incremental. Análisis directo del HTML (no asumido) determinó que el siguiente bloque estructural pendiente después de `mx-subtabs` es `.mx-suc-sel` (Selector de "Sucursal activa"), hermano de `.mx-subtabs-wrap` dentro de la rama `role === "coord"` de `App()`.

### Añadido

- `src/components/shared/sucursal-select.tsx` (`SucursalSelect`) — reconstruye `<div class="mx-suc-sel">` (label + select + 9 options), componente único y puramente controlado (`value`/`onChange`, sin `useState` interno).
- `SUCURSALES` en `src/constants/index.ts` — arreglo literal de 9 sucursales, transcrito verbatim del HTML fuente (línea 1116).
- `.mx-suc-sel` (+ `label`, `select`, `select:focus`) en `src/styles/globals.css` — CSS verbatim de las líneas 412-415 del HTML fuente, no portado antes de este Sprint.
- `docs/sprints/sprint-3.4.md`.

### Cambiado

- `src/layouts/RootLayout.tsx`: nuevo estado `sucursalCoord`/`setSucursalCoord` (mismo nivel que `role`, valor inicial `"Multiplaza"` idéntico al HTML fuente); `SucursalSelect` se renderiza como primer hijo de un nuevo `<div>` (sin clase, igual que el contenedor anónimo del HTML fuente) que ahora envuelve también a `MxSubtabs` (Sprint 3.3, sin modificar su contenido).

### Reportado (sin corregir)

- El badge de sucursal del Header (`HeaderStatus`, prop `sucursalActiva`, default `"Multiplaza"` desde Sprint 3.1) no recibe el nuevo `sucursalCoord` — quedan desincronizados si el usuario cambia la sucursal en `SucursalSelect`. No se pasó la prop a `Header` porque este Sprint prohíbe explícitamente modificar su integración más allá de lo mínimo.

### Sin cambios

- No se modificó `Header`, `mx-instside`/`InstallerSidebar`, `mx-subtabs`/`MxSubtabs`/`MxSubtabButton`, `Footer`, `AppRouter.tsx` ni `ARCHITECTURE.md`. No se implementó Coordinator, Job Cards, Publish Modal ni ningún otro bloque de Sprints posteriores.

### Validación

- `tsc --noEmit` (stubs ambientales): 0 diagnósticos. `prettier --check` sobre `.ts`/`.tsx`: cero diferencias. `prettier --check` sobre `globals.css`: el archivo completo reporta diferencias de estilo preexistentes (comillas, wrapping de gradientes) ajenas a este Sprint — verificado con `diff` que el bloque nuevo `.mx-suc-sel` no genera ninguna de esas diferencias.
- Las cuatro validaciones reales (`npm run lint`/`typecheck`/`build`/`dev`) y la validación visual siguen pendientes de confirmación del usuario en su máquina.

## [Sprint 3.3 — Cierre del Sprint] — 2026-07-08

Cierre administrativo. Sin cambios de código en esta entrada — únicamente documentación.

- ✅ Validación visual aprobada por el usuario.
- ✅ Validación local aprobada por el usuario (`npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`).
- ✅ Sprint 3.3 cerrado.
- Siguiente Sprint a desarrollar: **Sprint 3.4** (no se inicia sin aprobación explícita).

## [Sprint 3.3 — Fix de integración visual de `mx-subtabs`] — 2026-07-08

**No es un Sprint nuevo.** Corrección del Sprint 3.3: el usuario confirmó que las 4 validaciones reales pasan, pero `MxSubtabs` no se veía renderizado en ninguna pantalla. Nueva regla explícita del usuario, vigente para todos los Sprints futuros: un componente que compila pero no es visible no permite dar el Sprint por finalizado.

### Corregido

- `src/layouts/RootLayout.tsx` (único archivo modificado): se agregó el renderizado de `<MxSubtabs>` con dos `<MxSubtabButton>` ("Despacho en vivo" activo, "Mis trabajos" inactivo — íconos/textos literales de la instancia Coordinator del HTML) como primer hijo de `<main>`, visible cuando `role === 'coordinador'`. Reproduce la posición exacta del HTML fuente: `.mx-subtabs` es el primer elemento de la rama `role === "coord"` de `App()`, antes de `Coordinator`/`CoordinatorJobs` (que no existen todavía).

### Sin cambios

- No se modificó `MxSubtabs`/`MxSubtabButton` (implementación interna intacta desde el Sprint 3.3 original). Sin `onClick` en los botones — no se agregó lógica, eventos, estado real, React Query ni Supabase. No se tocó `Header`, `mx-instside`/`InstallerSidebar`, `AppRouter.tsx`, `ARCHITECTURE.md` ni ningún otro bloque.

### Validación

- `tsc --noEmit` (stubs ambientales): 0 diagnósticos. `prettier --check`: cero diferencias. `git status --porcelain`: único archivo modificado, `RootLayout.tsx`.
- Pendiente: re-confirmación real del usuario (`npm run lint`/`typecheck`/`build`/`dev`) y verificación visual directa en el navegador tras este fix.

## [Sprint 3.3 — `mx-subtabs`] — 2026-07-08

Migra exclusivamente `.mx-subtabs-wrap`/`.mx-subtabs` (contenedor + botones de sub-navegación), reutilizado tal cual dos veces en el HTML fuente: Coordinator ("Despacho en vivo"/"Mis trabajos") y AdminPanel ("Calendario maestro"/"Instaladores").

### Añadido

- `src/components/shared/mx-subtabs.tsx` (`MxSubtabs`) — contenedor `.mx-subtabs-wrap > .mx-subtabs`.
- `src/components/shared/mx-subtab-button.tsx` (`MxSubtabButton`) — botón plano con `className` condicional `on`/inactivo, ícono + texto como props. Ambos puramente presentacionales: sin `useState` interno, sin lógica de navegación, sin datos mock.
- `docs/sprints/sprint-3.3.md`.

### Sin cambios

- `.mx-subtabs-wrap`/`.mx-subtabs` ya estaban portadas verbatim en `globals.css` desde Fase 3 — cero cambios de CSS. No se tocó `Header`, `mx-instside`/`InstallerSidebar`, `RootLayout.tsx`, `AppRouter.tsx`, `ARCHITECTURE.md` ni `components/ui/tabs.tsx`.

### Reportado (sin corregir)

- `mx-subtabs` tiene dos instancias reales en el HTML (Coordinator, AdminPanel); ninguna de las dos pantallas existe todavía en este proyecto, así que `MxSubtabs`/`MxSubtabButton` no se integraron en ninguna página en este Sprint (integrarlos habría requerido construir Coordinator o AdminPanel, fuera de alcance).
- Ya existe `components/ui/tabs.tsx` (Fase 3, Radix, sin consumidores) apuntando a la misma clase CSS — posible duplicación futura con `MxSubtabs`/`MxSubtabButton`, no resuelta aquí; queda para que el Sprint que construya Coordinator/AdminPanel decida cuál usar.

### Validación

- `tsc --noEmit` (stubs ambientales): 0 diagnósticos. `prettier --check`: cero diferencias. `git status`/`git diff --stat`: solo 3 archivos nuevos (2 componentes + `docs/sprints/sprint-3.3.md`), ningún archivo existente modificado.
- Las cuatro validaciones reales (`npm run lint`/`typecheck`/`build`/`dev`) siguen pendientes de confirmación del usuario en su máquina.

## [Sprint 3.2.2 — Corrección de integración de `InstallerSidebar`] — 2026-07-07

Sub-iteración solicitada por el usuario para corregir 3 problemas de la integración visual hecha en el Sprint 3.2.1. **No es el Sprint 3.3; no migra ningún bloque adicional del HTML.** No se modificó `InstallerSidebar`/`InstallerSidebarCard`/`InstallerProfileSummary`/`InstallerPriorityRules` — todas las correcciones se hicieron únicamente en el Layout donde se integra.

### Corregido

- `src/layouts/RootLayout.tsx`:
  1. `InstallerSidebar` se renderizaba para cualquier `role`; ahora se envuelve en `{role === 'instalador' && (...)}`, reproduciendo la condición real del HTML fuente (`role === "inst"` en `App()`).
  2. El Sidebar ocupaba el 100% del ancho de `<main>`; ahora se envuelve en `<div className="mx-instwrap">` (grid de 2 columnas, `minmax(320px,400px) minmax(240px,300px)`, ya portado a `globals.css` desde Fase 3), que le devuelve su columna angosta (240–300px).
  3. Se agregó un "Phone Placeholder" (`<div />` vacío, sin clase `.mx-phone` ni contenido) como primera columna de `.mx-instwrap`, para reservar el espacio que ocupará el futuro `layouts/InstallerLayout.tsx`/`PhoneFrame` — sin implementar ningún estilo/contenido de Phone en este Sprint.

### Sin cambios

- No se agregó ni modificó ningún CSS (`.mx-instwrap`/`.mx-instside` y su breakpoint responsive ya estaban portados verbatim desde Fase 3). No se creó ningún componente/layout/página nueva. No se tocó `ARCHITECTURE.md`, `AppRouter.tsx`, `Header` ni ningún componente de `InstallerSidebar`. No se migró ningún bloque HTML adicional. No se avanzó al Sprint 3.3.

### Validación

- `tsc --noEmit` (stubs ambientales, config recreada para esta corrida): 0 diagnósticos. `prettier --check`: cero diferencias. `git diff --stat`: único archivo modificado, `RootLayout.tsx`.
- Las cuatro validaciones reales (`npm run lint`/`typecheck`/`build`/`dev`) siguen pendientes de confirmación del usuario en su máquina.

## [Sprint 3.2.1 — Integración visual temporal de `InstallerSidebar`] — 2026-07-03

Sub-iteración solicitada por el usuario. **No es el Sprint 3.3; no migra ningún bloque adicional del HTML.** Objetivo exclusivo: hacer visible `InstallerSidebar` (Sprint 3.2) en el navegador, ya que no existía todavía ningún layout/página que lo montara.

### Cambiado

- `src/layouts/RootLayout.tsx`: se agregó, dentro de `<main>` y antes de `<Outlet/>`, el renderizado de `<InstallerSidebar rating={4.9} km={1.8} cumplimiento={98} aceptacion={92} />`, marcado explícitamente en comentarios como `TEMPORARY INTEGRATION — Sprint 3.2.1`. Los 4 valores son literales fijos (no un mock de datos nuevo), necesarios porque esas props son obligatorias sin valor por defecto y no se podía modificar la implementación interna de `InstallerSidebar`/`InstallerProfileSummary`.

### Sin cambios

- No se creó ningún componente, layout ni página nueva. No se modificó `InstallerSidebar`, `InstallerSidebarCard`, `InstallerProfileSummary`, `InstallerPriorityRules`, `Header`, `AppRouter.tsx` ni `ARCHITECTURE.md`. No se implementó lógica de negocio, Supabase, React Query, estados nuevos ni mocks de datos. No se migró ningún bloque HTML adicional. No se avanzó al Sprint 3.3.

### Nota sobre la rama de trabajo

Se pidió trabajar sobre `feature/sprint-3-2-sidebar`; la rama real del Sprint 3.2 (existente desde su análisis inicial) es `feature/sprint-3-2-mx-instside`. No se creó una rama nueva — se continuó sobre esa misma rama, que corresponde al mismo bloque (`mx-instside`).

### Validación

- `tsc --noEmit` (stubs ambientales): 0 diagnósticos. `prettier --check`: cero diferencias. `git diff --stat`: único archivo modificado, `RootLayout.tsx`.
- Las cuatro validaciones reales (`npm run lint`/`typecheck`/`build`/`dev`) siguen pendientes de confirmación del usuario en su máquina.

## [Sprint 3.2 — `mx-instside`] — 2026-07-03

Desde este Sprint, cada Sprint se identifica por el bloque/selector real del HTML (ya no por nombres genéricos de sección). Migra exclusivamente `<aside class="mx-instside">` (panel lateral del Instalador, líneas 3422–3449 del JSX fuente de `Multimax_Despacho_v1.3.html`).

### Añadido

- `src/components/shared/installer-sidebar.tsx` (`InstallerSidebar`), `installer-sidebar-card.tsx` (`InstallerSidebarCard`), `installer-profile-summary.tsx` (`InstallerProfileSummary`), `installer-priority-rules.tsx` (`InstallerPriorityRules`) — reconstruyen íntegramente las dos tarjetas de `mx-instside` ("Tu perfil" y "Reglas de prioridad").
- `docs/sprints/sprint-3.2.md`.

### Corregido

- `src/styles/globals.css`: agregada la regla `.mx-starc { color: var(--amber); }`, faltante desde Fase 3 (usada por el ícono de calificación en "Tu perfil").

### Eliminado

- `src/components/shared/sidebar.tsx` — el `Sidebar`/`SidebarCard` estructural de Fase 3 (sin contenido real), reemplazado por los 4 archivos nuevos de arriba. Sin consumidores (verificado con `grep`), mismo criterio que la reescritura de `Header` en Sprint 3.1.

### Decisiones documentadas

- Se evitó el nombre `InstallerProfile` para la tarjeta "Tu perfil": el HTML fuente ya tiene una función `InstallerProfile()` distinta (pantalla completa de perfil, `ARCHITECTURE.md` §3 → `pages/installer/PerfilPage.tsx`, Sprint futuro) — usar el mismo nombre habría creado una colisión conceptual. Se usó `InstallerProfileSummary` en su lugar.
- `km` (distancia al trabajo) no tiene campo equivalente en `types/domain.ts`/schema SQL — queda como prop obligatoria de `InstallerProfileSummary`/`InstallerSidebar`, sin valor por defecto inventado.

### Reportado (sin corregir)

- El HTML fuente tiene dos versiones de "Reglas de prioridad": 5 ítems dentro de `mx-instside` (migrados en este Sprint) y 4 ítems dentro de `InstallerProfile()`/`mx-profblock` (fuera de alcance). No se unificaron ni se "corrigió" ninguna de las dos — se documenta para cuando le corresponda su propio Sprint.

### Validación

- `tsc --noEmit` (stubs ambientales, actualizados con el ícono `ShieldAlert` que faltaba): 0 diagnósticos. `prettier --check` (incluyendo `globals.css`): cero diferencias. Verificación adicional: se transpiló un fragmento aislado equivalente a los párrafos con texto+`<b>` embebido y se comparó, nodo por nodo, contra los `React.createElement(...)` reales del HTML fuente — coincide exactamente.
- Las cuatro validaciones reales (`npm run lint`/`typecheck`/`build`/`dev`) siguen pendientes de confirmación del usuario en su máquina — el Sprint 3.2 permanece en 🟡 En progreso, no ✅ Completado, hasta esa confirmación (mismo criterio de Sprint 3.1.1).

### Sin cambios

- No se tocó ningún archivo de Header (`header*.tsx`, `RootLayout.tsx`, `AppRouter.tsx`) ni ningún componente de `components/ui/`. No se implementó `layouts/InstallerLayout.tsx`, `.mx-instwrap`, `.mx-phone*`, lógica de negocio, Supabase, Auth, Realtime ni React Query.

## [Sprint 3.1.1 — Header, validación final] — 2026-07-03 (segunda ronda)

El usuario reportó que los errores restantes de su validación local venían principalmente de `src/pages/LayoutShowcasePage.tsx`.

### Diagnosticado

- Confirmado con `grep` y con el historial de Git que ese archivo **no existe en el proyecto** desde el Sprint 3.1 (commit `86d4b4a`) y que ningún archivo lo referencia (`AppRouter.tsx` no lo enruta desde entonces).
- Causa raíz real: el puente de archivos hacia la máquina del usuario solo puede crear/sobrescribir archivos, no borrarlos remotamente — el archivo legado seguía físicamente en su copia local desde la entrega original del Sprint 3.1, todavía con la prop `title` original, y empezó a fallar el typecheck local al renombrarse esa prop en la primera ronda de Sprint 3.1.1.

### Corregido

- Se sobrescribió `src/pages/LayoutShowcasePage.tsx` en la máquina del usuario con un stub vacío y documentado (no fue posible borrarlo remotamente); se le pidió al usuario completar el borrado manualmente.

### Evaluado y sin cambios

- Se evaluó revertir `cardTitle`/`sidebarTitle`/`toastTitle` a `title` por retrocompatibilidad; no era necesario, porque el único "consumidor" de esas props era precisamente el archivo legado ya eliminado del proyecto. Revertir habría reintroducido el conflicto de tipos real corregido en la primera ronda de Sprint 3.1.1.
- No se tocó `header.tsx`, `header-brand.tsx`, `header-role-switch.tsx`, `header-status.tsx`, `RootLayout.tsx`, `AppRouter.tsx` ni ningún componente ya aprobado.
- No se modificó `docs/SPRINTS_INDEX.md`, `MIGRATION_STATUS.md` ni `TODO.md` (fuera del listado de documentación a actualizar en esta ronda, según instrucción explícita).

### Validación

- `tsc --noEmit` (stubs ambientales): 0 diagnósticos. `prettier --check`: cero diferencias.
- Las cuatro validaciones reales (`npm run lint`/`typecheck`/`build`/`dev`) siguen pendientes de confirmación del usuario en su máquina, ahora con el archivo legado neutralizado — el Sprint 3.1 permanece en 🟡 En revisión hasta esa confirmación.

## [Sprint 3.1.1 — Header, cierre y validación] — 2026-07-03

Sub-iteración de cierre solicitada tras validación local real del usuario. No migra componentes nuevos, no cambia el alcance del Sprint 3.1, no toca el Header.

### Corregido

- `src/components/ui/card.tsx`: `CardHeaderProps.title` renombrado a `cardTitle`.
- `src/components/ui/toast.tsx`: `ToastProps.title` renombrado a `toastTitle`.
- `src/components/shared/sidebar.tsx`: `SidebarCardProps.title` renombrado a `sidebarTitle`.

Causa raíz real, la misma en los tres: cada interfaz extiende `HTMLAttributes<HTMLDivElement>` (que ya define `title?: string`, el atributo HTML nativo de tooltip) y redefinía `title` con el tipo `ReactNode`, más amplio que `string | undefined` — una extensión de interfaz incompatible que `npm run typecheck` real detectó y el `tsc` best-effort de este sandbox no, porque su stub aproxima `HTMLAttributes`/`ReactNode` como `any` (punto ciego documentado en `docs/sprints/sprint-3.1.md`). Ninguno de los tres componentes tenía consumidores todavía, así que el renombre no afecta ningún call-site existente ni cambia el comportamiento visual.

### Validación

- `tsc --noEmit` (stubs ambientales, mismo método de siempre): 0 diagnósticos.
- `prettier --check`: cero diferencias.
- Las cuatro validaciones reales (`npm run lint`/`typecheck`/`build`/`dev`) siguen pendientes de confirmación del usuario en su máquina — el Sprint 3.1 permanece en estado 🟡 En revisión, no ✅ Completado, hasta esa confirmación.

### Sin cambios

- No se tocó `header.tsx`, `header-brand.tsx`, `header-role-switch.tsx`, `header-status.tsx`, `RootLayout.tsx` ni `AppRouter.tsx`. No se migró ningún componente nuevo. No se modificó `docs/SPRINTS_INDEX.md` (fuera del listado de documentación a actualizar en esta sub-iteración, según instrucción explícita).

## [Sprint 3.1 — Header] — 2026-07-03

### Cambio de metodología

- El proyecto pasa de desarrollarse por Fases grandes a Sprints incrementales, uno por sección del HTML, cada uno en su propia rama Git, independiente, reversible y detenido al cierre hasta aprobación explícita. Nueva documentación: `docs/SPRINTS_INDEX.md` (índice oficial, tabla Sprint/Estado/Elemento/Rama Git con los 16 Sprints planeados) y `docs/sprints/sprint-X.Y.md` (análisis previo + reporte de cada Sprint).
- Se inicializó el repositorio Git del proyecto (no existía hasta ahora): commit baseline `d03324e` en `main` con el estado de Fases 1–3, y rama `feature/sprint-3-1-header` para este Sprint.

### Añadido

- `src/components/shared/header-brand.tsx`, `header-role-switch.tsx`, `header-status.tsx` — nuevos, portados verbatim del bloque `<header className="mx-top">` (líneas 2029–2071 del JSX fuente de `Multimax_Despacho_v1.3.html`). Ninguno es genérico ni está sin usar; los tres se consumen de inmediato desde `Header`.
- `docs/SPRINTS_INDEX.md`, `docs/sprints/sprint-3.1.md`.

### Corregido

- Ícono del logo del Header: `RadioTower` (usado por error en Fase 3) → `Radio`, verificado contra el JSX fuente (`React.createElement(Radio, { size: 18 })`) y el path SVG del snapshot estático del HTML.
- `.mx-topright`: en Fase 3 solo se renderizaba un placeholder estático (`Badge tone="muted"` con texto "Sesión local"). Ahora `HeaderStatus` reproduce la condición real de 3 ramas del JSX fuente (badge master si `role === "admin"`, pill de sucursal si `role === "coord"`, botón "Reiniciar" si `jobs.length > 0 && role === "coord"`), con props/defaults que reproducen el estado inicial exacto del prototipo mientras Coordinator no exista.

### Eliminado

- `src/pages/LayoutShowcasePage.tsx` y su ruta en `AppRouter.tsx` — vitrina de componentes de Fase 3, incompatible con la nueva regla explícita del Sprint 3.1 ("no crear una vitrina de componentes"). No se agregó contenido de relleno en su lugar; el `<Outlet/>` de `RootLayout` queda vacío hasta que un Sprint futuro migre contenido real para esa zona.
- El prop `rightSlot` de `Header` (placeholder de Fase 3) y su uso en `RootLayout.tsx`.

### Reportado (sin corregir)

- Discrepancia entre el snapshot estático embebido en `Multimax_Despacho_v1.3.html` (`<div id="root">`) y su propio código fuente React (`React.createElement`): el snapshot muestra solo 2 botones de rol y el texto literal "Sesión local", ausentes del código fuente ejecutable, que define 3 botones y la lógica condicional descrita arriba. Se implementó según el código fuente, por ser la especificación ejecutable; no se modificó el HTML. Detalle completo en `docs/sprints/sprint-3.1.md`.

### Validación

- Misma metodología best-effort de Fases 2/3 (`tsc --noEmit` con stubs ambientales actualizados con los íconos `Radio`/`Zap`/`RotateCcw`, más `prettier --check`): diagnósticos totales bajaron de 48 a 47 (exactamente el error de la página eliminada), ninguno nuevo en archivos de Header/RootLayout/AppRouter; cero diferencias de formato.
- Las cinco validaciones obligatorias (`npm install`/`lint`/`typecheck`/`build`/`dev` reales) siguen pendientes de confirmación del usuario en su entorno local, ahora sobre la rama `feature/sprint-3-1-header`.

### Sin cambios

- No se tocó ningún otro bloque del HTML (Sidebar, Top Navigation/subtabs, Coordinator, Installer, Admin). No se implementó lógica de negocio, conexión a Supabase, Auth ni React Query. No se modificó `ARCHITECTURE.md`.

## [Fase 3] — 2026-07-02

### Añadido

- `src/styles/globals.css`: variables tipográficas `--fd`/`--fb`/`--fm` y reset `margin/padding:0` + `button{border:none;background:none;color:inherit}` (existían en el prototipo, faltaban desde el scaffold de Fase 2). ~150 clases `mx-*` de layout/navegación/header/sidebar/componentes compartidos portadas verbatim del `<style>` de `Multimax_Despacho_v1.3.html`, más variantes standalone (`.mx-chip`, `.mx-input`, `.mx-textarea`, `.mx-select-native`) y selectores `[data-state='active']` necesarios para componentizar selectores descendientes del prototipo sin cambiar la apariencia (ver PROJECT_STATUS.md).
- `src/components/ui/`: 27 componentes (Button, IconButton, Card+CardHeader+CardBody+CardFooter, Badge, StatusBadge, Avatar, Chip, Input, Textarea, Select, Label, Checkbox, Switch, Tabs, Dialog, Modal, Drawer, Tooltip, DropdownMenu, Menu, SearchBox, Separator, Spinner/Loading, Skeleton, Progress, Counter, Toast [estructura solamente], Notification).
- `src/components/shared/`: Header, Footer, PageContainer/PageHead, TwoColumnLayout, PhoneFrame, Sidebar/SidebarCard, StatTile/StatGrid, EmptyState, ConfirmDialog, ScrollArea.
- `src/layouts/RootLayout.tsx` (Header + `<Outlet/>` + Footer, equivalente de "AppShell").
- `src/pages/LayoutShowcasePage.tsx`: vitrina temporal no-funcional que demuestra todos los componentes de esta fase con datos estáticos; reemplaza el placeholder de Fase 2 en la ruta `/` (vía `RootLayout`).
- `MIGRATION_STATUS.md` (nuevo archivo, dedicado exclusivamente al seguimiento de la migración HTML→React, separado de PROJECT_STATUS.md/TODO.md/CHANGELOG.md/ARCHITECTURE.md).
- `package.json`: 8 dependencias `@radix-ui/react-*` (dialog, tabs, checkbox, switch, tooltip, dropdown-menu, slot, label).

### Decisiones documentadas

- Selector de rol del Header reconstruido idéntico al prototipo pero respaldado por `useState` local en `RootLayout` (placeholder temporal hasta Auth en Fase 7) — ya previsto en `ARCHITECTURE.md` §4, ver PROJECT_STATUS.md para el detalle.
- `CoordinatorLayout`/`AdminLayout`/`InstallerLayout` y `CountRing`/`LiveCountdown` NO se crearon en esta fase (son feature-specific de Jobs/Radar/Timeline) — movidos a Fase 4/5 en `TODO.md`.
- `Modal` (nuevo patrón centrado genérico) y `Drawer` (bottom-sheet, portado verbatim de `.mx-modal-*`) se separaron como dos componentes distintos construidos sobre los mismos primitivos base de `ui/dialog.tsx` — ver comentarios en cada archivo y `MIGRATION_STATUS.md`.

### Validación

- `tsc --noEmit` (config real del proyecto + declaraciones ambientales stub para los paquetes no instalables en este sandbox): cero errores de código propio; ver PROJECT_STATUS.md para el detalle de los ~48 diagnósticos esperados por el stub (no señalan errores reales).
- `prettier --check`/`--write`: 9 archivos con diferencias menores de formato corregidas; cero diferencias tras el ajuste.
- Las cinco validaciones obligatorias (`npm install`/`lint`/`typecheck`/`build`/`dev` reales) siguen pendientes de confirmación del usuario en su entorno local — misma limitación de red que en Fase 2.

### Sin cambios

- No se tocó `ARCHITECTURE.md` (ninguna decisión de esta fase alteró la arquitectura aprobada; el placeholder de rol y la separación Modal/Drawer ya eran consistentes con lo documentado en Fase 1).
- No se implementó Coordinator/Installer/Admin, Jobs/Radar/Timeline, lógica de negocio, consultas a Supabase, servicios, hooks específicos, formularios funcionales ni botones conectados — tal como exigía el alcance de esta fase.

## [Fase 2 — corrección] — 2026-07-01

### Corregido
- `package.json`: agregado `@types/node` (faltaba; causa raíz de `Cannot find module 'node:path'` en `npm run typecheck`).
- `vite.config.ts`: reemplazado `path.resolve(__dirname, ...)` por el patrón oficial de Vite para ESM, `fileURLToPath(new URL('./src', import.meta.url))`. `__dirname` no existe en tiempo de ejecución con `"type": "module"`, así que esto era también un bug real de runtime, no solo de tipos.
- `src/styles/globals.css`: el `@import` de Google Fonts ahora precede a `@tailwind base/components/utilities` (CSS inválido si no es así).
- `tsconfig.app.json`: agregado `"types": []` para que los tipos de Node no se filtren al código de navegador.
- `tsconfig.node.json`: agregado `"types": ["node"]` para los archivos de configuración (`vite.config.ts`, `tailwind.config.ts`).
- `eslint.config.js`: separado en dos bloques (`src/**/*.{ts,tsx}` con globals de navegador + reglas de React; `*.config.{ts,js}` con globals de Node, sin reglas de React) — antes se aplicaban globals de navegador también a los archivos de configuración que corren en Node.
- `tsconfig.json`: reformateado con Prettier (sin cambio de contenido).

### Regla nueva del proyecto
- Ninguna fase se da por aprobada sin `npm install && npm run lint && npm run typecheck && npm run build && npm run dev` en verde, ejecutados en un entorno con acceso real a npm.

### Sin cambios
- No hubo cambios funcionales ni arquitectónicos. No se tocó `ARCHITECTURE.md`. No se creó ningún componente ni lógica de negocio nueva. `TODO.md` no se modificó (no fue estrictamente necesario).
- El bloqueo de red de este entorno hacia `registry.npmjs.org` sigue vigente — ver `PROJECT_STATUS.md`. La validación real de las cinco pruebas obligatorias sigue pendiente de confirmarse fuera de esta sesión.

## [Fase 2] — 2026-07-01

### Añadido
- Scaffold completo del proyecto: `package.json` (React, Vite, TypeScript, Tailwind, shadcn/ui, React Router, TanStack Query, React Hook Form, Zod, `@hookform/resolvers`, Lucide React, Supabase JS Client, ESLint, Prettier).
- Configuración: `tsconfig.json`/`tsconfig.app.json`/`tsconfig.node.json` con alias `@/`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `components.json` (shadcn), `eslint.config.js` (flat config), `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.env.example`.
- Estructura completa de `src/` según `ARCHITECTURE.md` §3.
- Archivos base: `main.tsx`, `App.tsx`, `routes/AppRouter.tsx` (placeholder), `contexts/AuthContext.tsx` (placeholder tipado), `supabase/client.ts` (cliente sin queries), `styles/globals.css` (variables/fuentes/keyframes del prototipo), `types/database.ts`, `types/domain.ts`, `types/enums.ts`, `lib/mappers.ts`, `lib/utils.ts`, `constants/index.ts`.
- `supabase/migrations/0001_initial_schema.sql`: copia verbatim de `handymax_supabase_schema_v3.sql` (verificada con `diff`, sin diferencias).

### Cambiado
- Orden de implementación de las fases siguientes (Fase 3 en adelante), a pedido del usuario: Layout general → Coordinator → Installer → Admin → Integración Supabase → Realtime → Eliminación de mocks → Pruebas finales. La arquitectura de `ARCHITECTURE.md` no cambió, solo la secuencia.
- `PROJECT_STATUS.md` y `TODO.md` reestructurados para reflejar el nuevo orden.

### Reportado (sin resolver)
- **Bloqueo de red**: el entorno de esta sesión no permite acceso a `registry.npmjs.org` (política de red del entorno), por lo que `npm create vite`, `npm install`, `npx shadcn`, `npm run lint/typecheck/build/dev` no pudieron ejecutarse realmente. Se construyó el scaffold a mano y se corrió una validación estática best-effort (TypeScript y Prettier ya presentes en el entorno, ajenos a las dependencias del proyecto) que no encontró errores de código propio — solo los `Cannot find module` esperables sin `node_modules`. Ver `PROJECT_STATUS.md` para el detalle y las opciones para desbloquear.

## [Fase 1] — 2026-07-01

### Añadido
- Recepción y análisis completo de los tres archivos fuente del proyecto (`Multimax_Despacho_v1.3.html`, `handymax_supabase_schema_v3.sql`, `Handymax_Documentacion_Tecnica.pdf`).
- `ARCHITECTURE.md`: arquitectura propuesta completa (stack, árbol de carpetas, inventario de componentes, hooks, servicios, contextos, rutas, tipos TypeScript, estrategias de Auth/RLS/Realtime, plan de migración del HTML, riesgos técnicos, orden de implementación).
- `PROJECT_STATUS.md`, `TODO.md`, `CHANGELOG.md` iniciales.
- Carpeta de proyecto creada en el entorno de trabajo (`handymax-despacho/`).

### Reportado (sin modificar)
- Alerta de seguridad: `service_role` key expuesta en conversación anterior, pendiente de rotación por el usuario.
- Posible fuga de datos del cliente por RLS a nivel de fila (no de columna) si se consulta `trabajos` en vez de `trabajos_vista`.
- Ambigüedad del concepto "coordinador master" frente al schema y las políticas RLS actuales.
- Columnas potencialmente faltantes en `trabajos` (`fecha`/`hora` sugeridas, `extra`, `urgente`) y ausencia de `assigned_at`.
- Propuesta (no implementada) de función Postgres `seleccionar_instalador` para hacer atómica la asignación de instalador.
- Propuesta (no implementada) de trigger para vincular `usuarios.auth_id` con `auth.users` en el primer login.

### Sin cambios
- No se modificó ni se ejecutó ningún cambio sobre `handymax_supabase_schema_v3.sql`.
- No se escribió código de aplicación (React, hooks, servicios) — solo documentación, según lo solicitado para esta fase.
