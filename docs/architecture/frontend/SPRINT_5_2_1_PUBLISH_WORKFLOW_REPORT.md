# Sprint 5.2.1 — Publish Workflow (Estado Local MVP)

## 0. Nota de traza sobre el entorno de esta ronda

Sin ZIP adjunto: se trabajó sobre el estado en disco dejado por el cierre del Sprint 5.1.5. Este entorno de trabajo no tiene `node_modules`/acceso de red — validación técnica realizada con la instalación global de `tsc` (`/home/claude/.npm-global/bin/tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0`), comparando la distribución completa de diagnósticos contra el cierre del Sprint 5.1.5 (`/tmp/tsc_5_1_5_final.log`). `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` reales quedan, como en toda ronda anterior, bajo responsabilidad del usuario en su propio entorno.

## 1. Auditoría previa obligatoria (antes de escribir código)

Se releyeron completos `ARCHITECTURE.md`, `README.md`, `PROJECT_STATUS.md`, `CHANGELOG.md`, `TODO.md`, `docs/SPRINTS_INDEX.md`, `SPRINT_5_1_2_COORDINATOR_LAYOUT_REPORT.md`, `SPRINT_5_1_3_COORDINATOR_WORKSPACE_REPORT.md`, y se re-auditó contra el HTML oficial (`Multimax_Despacho_v1.3.html`) el flujo real de publicación completo: `App()` (líneas 1897-1990+, incluido el `useState` de `jobs`/`activeJobId` y el callback real `publishJob`), `function PublishModal({sucursal, onPublish, onClose})` (línea 2496) y su `onClick` de envío, y el cuerpo completo de `Coordinator(props)`/`CoordinatorEmptyState`/`CoordinatorLayout.tsx`/`OperationalContext`/`RootLayout.tsx`/`DespachoPage.tsx` ya existentes en el proyecto.

Confirmado en el HTML oficial: `App()` define `const [jobs, setJobs] = useState([])`, `const [activeJobId, setActiveJobId] = useState(null)`, `const activeJob = jobs.find(j => j.id === activeJobId) || null`, y `publishJob(form)` construye `nj = {...form, id: "JOB-"+Math.floor(Math.random()*9000+1000), publishedAt: now(), phase: "live", inst: {}, assignedId: null, assignedAt: null, simulate: false}`, luego `setJobs(p=>[...p,nj]); setActiveJobId(nj.id); setShowPublishModal(false)`. Se confirmó que `publish-modal.tsx` (ya existente, Sprint 3.5, sin cambios desde entonces) ya exporta `PublishForm` (14 campos, coincide exactamente con el `f` real de `PublishModal()` del HTML) y `PublishModalProps { sucursal; open; onOpenChange; onPublish: (form: PublishForm) => void }` — fidelidad ya completa, cero cambios requeridos en ese archivo. Se verificó vía `grep -rn "onOpenPublish"` que ese callback solo se usa en `DespachoPage.tsx`, no en `TrabajosPage.tsx`.

### Contradicción real detectada y resuelta con el usuario (`AskUserQuestion`) antes de escribir código

El brief esperaba tocar "preferiblemente únicamente" `DespachoPage.tsx`/`PublishModal.tsx` ("Algún hook/context existente únicamente si es estrictamente necesario. No crear Providers nuevos. No crear Context nuevos."), y su Regla 12 decía, sin ninguna calificación adicional (a diferencia de la Regla 10, que sí dice "No modificar **visualmente** `PublishModal`"): "No modificar `CoordinatorLayout`."

Auditoría real: desde el Sprint 5.1.2, `PublishModal` — y el único callback `onPublish` real que recibe su envío — vive exclusivamente dentro de `CoordinatorLayout.tsx` ("`CoordinatorLayout` debe seguir siendo el único propietario de `PublishModal`", decisión explícita de ese Sprint). `DespachoPage.tsx` nunca tuvo, ni tiene hoy, ningún acceso a ese callback — solo recibe `onOpenPublish` (una función que únicamente ABRE el modal) vía `CoordinatorLayoutOutletContext`. Sin modificar `CoordinatorLayout.tsx`, no existía ninguna forma de que el `PublishForm` confirmado por el usuario llegara a un estado `activeJob` legible por `DespachoPage.tsx` — la arquitectura aprobada en el Sprint 5.1.2 y la Regla 12 de este brief son mutuamente incompatibles tal como estaban escritas.

Se presentaron 3 opciones al usuario vía `AskUserQuestion` antes de escribir código: (1) modificar `CoordinatorLayout.tsx` de forma mínima, exclusivamente para este flujo; (2) montar un segundo `PublishModal` local dentro de `DespachoPage.tsx`; (3) detener el Sprint y esperar más contexto. **Decisión del usuario (verbatim):** *"Procede con la opción 1. Autorizo una modificación mínima de `CoordinatorLayout` exclusivamente para conectar el flujo Publish Workflow. Aclaración metodológica: NO debes cambiar la arquitectura aprobada. NO debes mover `PublishModal`. NO debes duplicar `PublishModal`. NO debes crear un segundo `PublishModal` en `DespachoPage`. NO debes modificar la estructura visual de `CoordinatorLayout`. Únicamente puedes incorporar el callback necesario para que el resultado de `PublishModal` actualice el estado `activeJob` utilizado por `DespachoPage`. `CoordinatorLayout` debe seguir siendo el único propietario de `PublishModal`. La modificación debe ser la mínima indispensable... Documenta exactamente qué cambio mínimo fue necesario realizar y por qué era imprescindible para preservar la arquitectura aprobada en el Sprint 5.1.2."*

### Estados mutuamente excluyentes re-verificados (Reglas 18/19, sin cambios de criterio respecto a Sprints anteriores)

`activeJob === null` → `CoordinatorEmptyState` (única vista); `activeJob !== null` → `CoordinatorWorkspace` completo (`JobSummaryCard`+`LiveDispatchCard`+`kpisError`+`JobIndicadoresCard`+`ResponsesPanel`). Sin cambios de criterio respecto al Sprint 5.1.5 — lo que cambia en este Sprint es únicamente el ORIGEN de `activeJob` (antes: `DEMO_MODE ? JOB_DEMO : null`, un flag manual en `DespachoPage.tsx`; ahora: estado React real en `CoordinatorLayout.tsx`, poblado por el flujo Publish real).

## 2. Resumen técnico

Se implementó el flujo local completo de publicación de un trabajo (`CoordinatorEmptyState` → botón "Publicar trabajo" → `PublishModal` → completar formulario → confirmar → Job temporal en memoria → `activeJob` → cierre del modal → `CoordinatorWorkspace`), sin Supabase, sin persistencia, sin backend — 100% estado React en memoria (Reglas 13-16), se pierde al recargar la página, igual que en `App()` del HTML oficial. `JOB_DEMO`/`DEMO_MODE` se retiran por completo del flujo normal (Regla 17). Toda la UI de `DespachoPage.tsx` sigue dependiendo únicamente de `activeJob` (Regla 18), ahora sourced desde `CoordinatorLayout.tsx` vía el Outlet Context ya existente.

## 3. Archivos creados

- `docs/architecture/frontend/SPRINT_5_2_1_PUBLISH_WORKFLOW_REPORT.md` (este reporte).

Ningún componente nuevo — el Sprint reutiliza en su totalidad la arquitectura y los tipos ya existentes, per instrucción explícita del brief ("no inventar propiedades nuevas... reutilizar el mismo tipo existente").

## 4. Archivos modificados

- `src/layouts/CoordinatorLayout.tsx` — cambio mínimo autorizado (ver sección 6 "Justificación arquitectónica" para el detalle completo): nuevo estado `activeJob`/`setActiveJob` (`JobSummaryCardJob | null`); el `onPublish` de `PublishModal` (antes un no-op documentado "pendiente para el Sprint 5.2") ahora construye el Job temporal a partir del `PublishForm` recibido y llama a `setActiveJob`/`setShowPublishModal(false)`; `activeJob` agregado a `CoordinatorLayoutOutletContext`. Extenso JSDoc nuevo documentando la contradicción detectada, la consulta al usuario y su autorización verbatim.
- `src/pages/coordinator/DespachoPage.tsx` — reescrito: se retiran por completo `JOB_DEMO`, `JOB_DEMO_REMAINING_SECONDS` y `DEMO_MODE` (Regla 17); `activeJob` ahora se lee de `useOutletContext<CoordinatorLayoutOutletContext>()` en vez de calcularse localmente; `remainingSeconds` pasado a `JobSummaryCard` se deriva como `activeJob.bidMins * 60` (antes: constante fija `JOB_DEMO_REMAINING_SECONDS`).
- `PROJECT_STATUS.md` — nueva sección de estado del Sprint 5.2.1.
- `CHANGELOG.md` — nueva entrada al inicio.
- `docs/SPRINTS_INDEX.md` — nueva fila 5.2.1.

## 5. Componentes reutilizados

`PublishModal` (mismo archivo, misma instancia única dentro de `CoordinatorLayout.tsx`, mismas props `sucursal`/`open`/`onOpenChange`/`onPublish`, cero cambio visual — Regla 10; `PublishForm` ya coincidía en fidelidad completa con `PublishModal()`/`App()` del HTML oficial desde el Sprint 3.5), `CoordinatorEmptyState` (sin cambios — Regla 11), `JobSummaryCard`/`JobIndicadoresCard`/`CoordinatorKpiRow`/`LiveDispatchCard`/`ResponsesPanel`/`TwoColumnLayout` (sin cambios de código, solo pasan a recibir un `activeJob` real en vez de uno fijo), `ConfirmCancelDialog`/`Header`/`Footer`/`SucursalSelect`/`CoordinatorSubtabs` (sin cambios), `JobSummaryCardJob` (tipo ya existente, reutilizado tal cual como la estructura del Job temporal — ver justificación abajo).

## 6. Justificación arquitectónica

- **Por qué la excepción a la Regla 12 era imprescindible**: `PublishModal` y su único callback real `onPublish` viven exclusivamente en `CoordinatorLayout.tsx` desde el Sprint 5.1.2 (decisión arquitectónica ya aprobada, "único propietario"). `DespachoPage.tsx` solo puede ABRIR el modal (`onOpenPublish`), nunca recibir su resultado directamente — no comparten ningún ancestro común más cercano que `CoordinatorLayout.tsx` que pudiera alojar ese puente de datos sin, a su vez, ser una modificación de ese mismo archivo. Cualquier alternativa que evitara tocar `CoordinatorLayout.tsx` habría requerido mover o duplicar `PublishModal` — ambas acciones prohibidas explícitamente por el propio brief y por la autorización del usuario. La modificación se limitó estrictamente a lo mínimo indispensable: un `useState` nuevo, el cuerpo (antes vacío) de un callback ya existente, y un campo nuevo en una interfaz ya existente — cero cambios de JSX/estructura visual, cero componentes movidos o duplicados.
- **Por qué se reutiliza `JobSummaryCardJob` y no `PublishForm` como tipo del Job temporal**: el brief exige textualmente "reutilizar el mismo tipo existente" para el Job temporal, y el tipo que consumen tanto `DespachoPage.tsx` como `JobSummaryCard` (los renderizadores reales del `activeJob`) es `JobSummaryCardJob`, no `PublishForm` (que es exclusivamente la forma de los datos capturados por el formulario, un superconjunto que incluye campos como `equipo`/`tipoInmueble`/`calle`/`requisitos`/`extra`/`precioSugerido` que ningún componente del Workspace consume hoy). Construir el Job temporal como `JobSummaryCardJob` — no como `PublishForm` ni como un tipo nuevo — es la única lectura consistente con "no inventar propiedades nuevas" y con el tipo real que gobierna el render del Workspace.
- **Por qué el `id` se genera con `"JOB-" + Math.floor(Math.random()*9000+1000)`**: es exactamente el mismo criterio que usa `publishJob()` en `App()` del HTML oficial (línea 1934) — ninguna lógica nueva, solo el mismo patrón ya validado por la fuente de verdad de este proyecto.
- **Por qué `remainingSeconds` se deriva como `activeJob.bidMins * 60`**: es el mismo campo real (`bidMins`, ya parte de `JobSummaryCardJob` desde el Sprint 5.1.3) que antes alimentaba el valor fijo `JOB_DEMO_REMAINING_SECONDS` — ninguna lógica de subasta nueva, solo se sustituye una constante de demostración por el dato real ya disponible del Job recién creado.
- **Por qué los datos de demostración de `Radar`/`LiveCountdown` (`RADAR_DEMO_*`/`LIVECOUNTDOWN_DEMO_*`) NO se conectan al Job real**: el brief de este Sprint prohíbe explícitamente modificar Radar/Countdown/lógica de subasta ("Un Sprint = una única responsabilidad. Este Sprint únicamente implementa el flujo Publish.") — conectarlos habría requerido el motor de subasta real (notificaciones, respuestas de instaladores en tiempo real), fuera de alcance, reservado para un Sprint futuro (5.3).

## 7. Confirmación de ausencia de regresiones

- **`PublishModal`**: misma instancia única, mismas props, mismo comportamiento visual — el único cambio es que su `onPublish` ahora tiene un cuerpo real en vez de estar vacío.
- **`CoordinatorEmptyState`**: sin cambios de código; sigue siendo la vista por defecto cuando `activeJob` es `null` (comportamiento ya establecido en el Sprint 5.1.5, sin alterar).
- **`ConfirmCancelDialog`/`Header`/`Footer`/`SucursalSelect`/`CoordinatorSubtabs`**: sin cambios de código ni de posición en el árbol.
- **`sucursalCoord`/`OperationalContextProvider`**: sin cambios — siguen exactamente en la misma posición y relación que antes de este Sprint.
- **Instalador/Administrador/`TrabajosPage`/`ResponsesPanel`/KPIs/Radar/Countdown/lógica de subasta**: cero archivos de esos módulos tocados.
- **Auth/Roles/RLS/Policies/Router**: cero archivos de esas capas tocados.

## 8. Resultado de `npm run lint` / `npm run typecheck` / `npm run build` / `npm run dev`

Este entorno de trabajo no tiene `node_modules` ni acceso de red — **no es posible ejecutar estos 4 comandos aquí**, y sus resultados no se fabrican. En su lugar se ejecutó `tsc --noEmit` (instalación global) sobre el proyecto completo, comparando la distribución total de diagnósticos contra el cierre del Sprint 5.1.5:

| Código | Antes (5.1.5, final) | Después (5.2.1) | Delta |
|---|---|---|---|
| TS7026 | 793 | 793 | 0 |
| TS2307 | 161 | 161 | 0 |
| TS2875 | 87 | 87 | 0 |
| TS7006 | 65 | 65 | 0 |
| TS2322 | 23 | 23 | 0 |
| TS7031 | 22 | 22 | 0 |
| TS2339 | 8 | 8 | 0 |
| TS7053 | 2 | 2 | 0 |
| TS2591 | 2 | 2 | 0 |
| TS2882 | 1 | 1 | 0 |
| TS2688 | 1 | 1 | 0 |

**Cero delta en toda la distribución, cero categorías nuevas, cero `TS6133` (import/variable sin usar — confirma que el retiro de `JOB_DEMO`/`DEMO_MODE` no dejó ninguna referencia huérfana), cero errores de sintaxis.** Los únicos diagnósticos que aparecen dentro de los 2 archivos tocados (`CoordinatorLayout.tsx`/`DespachoPage.tsx`) son `TS2307` (módulos `react`/`react-router-dom` no resueltos) y `TS7026`/`TS2875` (tipos JSX faltantes) — el mismo patrón de artefactos de entorno (falta de `node_modules`/`@types/react`) clasificado y documentado desde el Sprint 2.

Expectativa razonada (no un resultado real) para los 4 comandos: `npm run lint` sin errores nuevos; `npm run typecheck` en verde (consistente con el `tsc` de arriba); `npm run build` exitoso, condicionado a que `typecheck`/`lint` pasen; `npm run dev` debe mostrar `/despacho` con `CoordinatorEmptyState` al cargar (sin trabajo activo), y al pulsar "Publicar trabajo" → completar el formulario → confirmar, debe cerrarse el modal y mostrarse inmediatamente el `CoordinatorWorkspace` completo con los datos reales del formulario recién enviado, sin recargar la página. **La validación final de estos 4 comandos corresponde ejecutarla en el entorno local del usuario.**

## 9. Reporte técnico generado

Este mismo documento (`docs/architecture/frontend/SPRINT_5_2_1_PUBLISH_WORKFLOW_REPORT.md`).

## 10. Preparación del Sprint 5.2.2

El flujo Publish local queda funcionalmente completo y aislado en memoria — listo como base para que el Sprint 5.2.2 (o el que corresponda) conecte persistencia real: reemplazar `setActiveJob(newJob)` por una llamada real a Supabase (`INSERT` en `trabajos`, vía un futuro `publishJob.service.ts`) y sincronizar `activeJob` con el resultado real de esa inserción (o con una suscripción Realtime), sin requerir ningún otro cambio de arquitectura en `CoordinatorLayout.tsx` — el punto de entrada (`onPublish`) y el punto de consumo (`CoordinatorLayoutOutletContext.activeJob`) ya están en su posición final. Quedan también, sin tocar en este Sprint, el motor de subasta real (notificación a instaladores, respuestas, asignación) y la conexión real de `LiveDispatchCard`/`ResponsesPanel` al Job publicado — ambos fuera de la responsabilidad única de este Sprint (Regla 20).
