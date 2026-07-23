# Sprint 5.1.5 — Corrección definitiva del Coordinator Workspace (Fix Visual + Estados)

## 0. Nota de traza sobre el entorno de esta ronda

Sin ZIP adjunto: se trabajó sobre el estado en disco dejado por el cierre del Sprint 5.1.4. Este entorno de trabajo no tiene `node_modules`/acceso de red — validación técnica realizada con la instalación global de `tsc` (`/home/claude/.npm-global/bin/tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0`), filtrando los diagnósticos a los archivos tocados y clasificándolos contra el mismo patrón de artefactos de entorno ya establecido en Sprints anteriores. `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` reales quedan, como en toda ronda anterior, bajo responsabilidad del usuario en su propio entorno.

## 1. Auditoría previa obligatoria (antes de escribir código)

Se releyeron completos `ARCHITECTURE.md`, `PROJECT_STATUS.md`, `CHANGELOG.md`, `README.md`, `TODO.md`, `docs/SPRINTS_INDEX.md`, `SPRINT_5_1_2_COORDINATOR_LAYOUT_REPORT.md`, `SPRINT_5_1_3_COORDINATOR_WORKSPACE_REPORT.md`, `SPRINT_5_1_4_COORDINATOR_WORKSPACE_COMPLETION_REPORT.md`, y se volvió a auditar completamente el HTML oficial (`Multimax_Despacho_v1.3.html`): el cuerpo íntegro de `function Coordinator(props)` (líneas 2132-2423, ambas ramas), con especial atención al bloque `mx-jobcard-h` (líneas 2216-2233) y al bloque "Indicadores" (líneas 2318-2354). También se re-auditó, per Regla 24 ("no debes asumir que un componente aprobado anteriormente sigue siendo correcto"), el código REAL renderizado (no solo la estructura) de `DespachoPage.tsx`, `job-summary-card.tsx`, `job-indicadores-card.tsx`, `coordinator-empty-state.tsx`.

### Estados mutuamente excluyentes re-verificados (Regla 19, sin cambios respecto a Sprints anteriores)

1. `Coordinator()`: `jobs.length === 0` (`CoordinatorEmptyState`) vs. `jobs.length > 0` (Workspace completo).
2. `job.phase`: `live`/`assigned`/`completed`/`cancelled` — el job de demostración permanece fijo en `live` cuando `DEMO_MODE` está activo; fuera de alcance de este Sprint (dependen del motor de subasta real, Sprint 5.3).

### 3 correcciones reales detectadas (Regla 24: re-verificación activa, no asumida)

**(a) `activeJob` seguía fijado a `JOB_DEMO`.** El Sprint 5.1.4 introdujo la estructura condicional correcta (`if (!activeJob) return <CoordinatorEmptyState/>`), pero asignó `const activeJob = JOB_DEMO` — el Workspace seguía siendo la única vista visible en la práctica, exactamente el síntoma original ("Actualmente siempre se muestra `CoordinatorWorkspace`") con la arquitectura ya lista pero sin usarse. Este brief lo señala explícitamente como Objetivo 1/2: "`activeJob` NO debe inicializarse con `JOB_DEMO`. Debe comenzar como: `null`"; "`JOB_DEMO` debe permanecer en el proyecto únicamente como dato temporal... Nunca debe renderizar automáticamente la vista." Es precisamente el caso que motiva la Regla 23 de este brief ("arquitectura correcta ≠ Sprint terminado").

**(b) Pill real "Urgente"/"Normal" faltante en `mx-jobcard-h`.** Re-auditando línea por línea `Coordinator()` (líneas 2216-2233), el bloque real es:

```js
Pill({tone:"ice"}, Zap, job.id),
job.urgente
  ? Pill({tone:"red", pulse:true}, AlertTriangle, "Urgente")
  : Pill({tone:"muted"}, "Normal"),
Pill({tone:"amber"}, Timer, "Bid ", job.bidMins, " min"),
job.simulate && live && Pill({tone:"violet"}, Play, "Simulación"),
isCompleted && Pill({tone:"green"}, Check, "Completado"),
isCancelled && Pill({tone:"red"}, XCircle, "Cancelado")
```

A diferencia de "Simulación"/"Completado"/"Cancelado" (condicionales, no alcanzables por el job de demostración en fase `live`), el Pill "Urgente"/"Normal" es **incondicional** — siempre se muestra uno de los dos. `job-summary-card.tsx` (Sprint 5.1.3) nunca lo había portado. Se detectó comparando el código real componente por componente contra el HTML oficial, no asumiendo que el Sprint 5.1.3 ya lo cubría.

**(c) Mensaje de error dentro del bloque "Indicadores".** `Coordinator()` (líneas 2318-2354) muestra el bloque "Indicadores" con una estructura fija: encabezado (`mx-section-h`) → `mx-stats` (StatTiles) → `mx-goal` — sin ninguna rama condicional de error. `job-indicadores-card.tsx` (Sprint 5.1.4), en cambio, mostraba `kpisError` (ej. "La sucursal Multiplaza todavía no existe...", generado por `getCoordinatorKpis`/Contexto Operativo — no un texto del HTML oficial, confirmado con `grep` sobre el HTML fuente, sin coincidencias) dentro de ese mismo bloque cuando el fetch fallaba. Esto contradice explícitamente el Objetivo 4/6 de este brief ("Actualmente aparece: Mensaje de sucursal. Eso NO pertenece al componente"; "Eliminar cualquier render incorrecto del mensaje... Ese mensaje no pertenece al bloque Indicadores").

### Puntos re-verificados y confirmados SIN cambios necesarios

- **"Estado" y "Tiempo restante" en `JobSummaryCard`**: el Objetivo 3 de este brief lista explícitamente "estado" y "countdown" como elementos que el bloque superior del trabajo activo debe incluir — confirma, no contradice, la decisión ya tomada (y documentada extensamente) en los Sprints 5.1.3/5.1.4 de añadir estos 2 campos aunque no vivan literalmente dentro de `mx-jobcard-h` en el HTML oficial. Se conservan, solo reordenados después de los campos literales del HTML (ver corrección b).
- **Estructura de 2 columnas (`mx-grid`)**: el Objetivo 8 del brief enumera "JobSummaryCard / LiveDispatchCard / ResponsesPanel / Indicadores" en un único listado, pero el HTML oficial real (re-confirmado en esta auditoría) los distribuye en 2 columnas (`mx-col` izquierda: JobSummaryCard/LiveDispatchCard/Indicadores; `mx-col` derecha: ResponsesPanel/AssignedPanel/NoResponsePanel). Se interpreta ese listado como una enumeración de los 4 componentes requeridos, no como una instrucción de aplanar el layout a una sola columna — interpretación basada en evidencia directa del HTML fuente (fuente de verdad explícita de este mismo brief), no en una suposición.
- **`CoordinatorKpiRow`**: Objetivo 5 reafirma "NO modificar `CoordinatorKpiRow`. Debe reutilizarse." — sin cambios, confirmando la decisión del Sprint 5.1.4.
- **`CoordinatorEmptyState`**: re-auditado contra `mx-qempty` (líneas 2146-2163) — sigue siendo fiel verbatim (Sprint 3.6), sin cambios necesarios.

## 2. Resumen técnico

Se corrigen 3 defectos reales de comportamiento visual, sin agregar funcionalidades nuevas, sin tocar Supabase/`PublishModal`/lógica de negocio:

1. `activeJob` ahora inicia en `null` por defecto (`DEMO_MODE = false`, nuevo flag manual y temporal en `DespachoPage.tsx`) — `CoordinatorEmptyState` es la vista real que ve hoy un Coordinador.
2. `JobSummaryCard` reconstruye el Pill "Urgente"/"Normal" real de `mx-jobcard-h`.
3. `JobIndicadoresCard` deja de aceptar/renderizar `kpisError` — ese mensaje se muestra ahora fuera del bloque "Indicadores", en `DespachoPage.tsx`.

## 3. Componentes creados

Ninguno (per Objetivo 9: "no crear componentes duplicados... solo modificar lo estrictamente necesario").

## 4. Componentes reutilizados (auditados, solo 2 modificados de forma quirúrgica)

`JobSummaryCard` (modificado — Pill agregado, reordenado), `JobIndicadoresCard` (modificado — `kpisError` retirado), `LiveDispatchCard`/`ResponsesPanel`/`CoordinatorKpiRow`/`CoordinatorEmptyState` (auditados, confirmados correctos, **sin ningún cambio**).

## 5. Archivos modificados

- `src/pages/coordinator/DespachoPage.tsx` — se agrega `DEMO_MODE` (constante `false`); `activeJob = DEMO_MODE ? JOB_DEMO : null` (antes: `JOB_DEMO` fijo); `JOB_DEMO.urgente = false` agregado; `kpisError` se renderiza como párrafo independiente en la columna izquierda (antes de `JobIndicadoresCard`) en vez de pasarse como prop.
- `src/components/shared/job-summary-card.tsx` — campo `urgente: boolean` agregado a `JobSummaryCardJob`; Pill "Urgente"/"Normal" agregado en `mx-jobcard-h`, en su posición real (2º); Pills "estado"/"tiempo restante" reordenados al final.
- `src/components/shared/job-indicadores-card.tsx` — se retira `kpisError` de `JobIndicadoresCardProps`; el componente ahora alterna únicamente `CoordinatorKpiRow`/`Loading`.
- `PROJECT_STATUS.md`, `CHANGELOG.md`, `docs/SPRINTS_INDEX.md` — ver secciones correspondientes.

## 6. Archivos NO modificados (confirmación explícita)

`src/components/shared/coordinator-kpi-row.tsx`, `live-dispatch-card.tsx`, `responses-panel.tsx`, `coordinator-empty-state.tsx`, `two-column-layout.tsx`, `RootLayout.tsx`, `CoordinatorLayout.tsx`, `AppRouter.tsx`, `publish-modal.tsx`, `AuthProvider.tsx`, `SessionProvider.tsx`, `operational-context.*`, cualquier `repository`/`service`, cualquier `hook` existente. Ninguna migración, policy, RLS o tabla tocada. `globals.css` no requirió ningún cambio en esta ronda (todas las clases necesarias ya estaban portadas desde los Sprints 5.1.3/5.1.4).

## 7. Justificación arquitectónica

- **Por qué `DEMO_MODE` y no simplemente `const activeJob = null` a secas**: el brief exige simultáneamente que `activeJob` inicie en `null` (Objetivo 1) Y que `JOB_DEMO` "permanezca en el proyecto... utilizado exclusivamente cuando se invoque explícitamente" (Objetivo 2). Fijar `activeJob = null` de forma literal habría dejado `JOB_DEMO` sin ninguna referencia en el código — un `TS6133` real (variable sin usar; `tsconfig.app.json` tiene `noUnusedLocals: true`), y habría eliminado de facto la posibilidad de "invocar explícitamente" el demo sin editar la lógica del componente. `DEMO_MODE` (constante booleana, documentada como manual/temporal) satisface ambos requisitos literalmente: `activeJob` es `null` por defecto, `JOB_DEMO` sigue existiendo y usándose (solo se activa cambiando `DEMO_MODE` a mano), y no se introduce ningún flag persistente, UI, query param ni lógica de negocio nueva — sigue siendo una constante de módulo, igual de "manual" que editar directamente `activeJob = JOB_DEMO` habría sido.
- **Por qué se reordenan (no se eliminan) los Pills "estado"/"tiempo restante" de `JobSummaryCard`**: el Objetivo 3 de este mismo brief los lista explícitamente como elementos requeridos del "bloque superior" — eliminarlos habría contradicho el propio brief y revertido una decisión de producto ya confirmada 2 veces por el usuario (Sprints 5.1.3/5.1.4). Se prioriza únicamente el orden: campos literales del HTML primero (id/urgente-normal/bid), campos añadidos por decisión de producto después — minimiza el cambio visual mientras corrige el gap real (Pill faltante).
- **Por qué `kpisError` se relocaliza en `DespachoPage.tsx` en vez de eliminarse**: es información real de la aplicación (ej. una sucursal mal configurada) — descartarla por completo reduciría la observabilidad de un error genuino sin ninguna instrucción explícita del brief que pida eliminar esa capacidad, solo que no aparezca "dentro del bloque Indicadores". Relocalizarla fuera de `JobIndicadoresCard` satisface literalmente el Objetivo 6 sin perder la información.
- **Por qué no se aplana el layout a una sola columna** (pese al orden lineal del Objetivo 8): ver "Puntos re-verificados" arriba — evidencia directa y reciente del HTML oficial (releído en esta misma auditoría) confirma la estructura de 2 columnas; el HTML oficial es la fuente de verdad explícita de este brief por encima de un diagrama aproximado.

## 8. Confirmación de que no hubo regresiones

- **Admin**: sin cambios en `RootLayout.tsx`/`CoordinatorLayout.tsx` — un admin en Modo Coordinador ve ahora `CoordinatorEmptyState` por defecto (mismo comportamiento que vería un Coordinador real), consistente con el diseño ya establecido desde el Sprint 5.1.1 (misma vista para ambos casos).
- **Instalador**: `InstallerDashboard`/`CountRing` no se tocaron.
- **`TrabajosPage`/`TrabajoDetailPage`**: sin cambios.
- **`PublishModal`/`ConfirmCancelDialog`**: sin cambios de código ni de comportamiento — el botón "Publicar trabajo" de `CoordinatorEmptyState` (ahora visible por defecto) sigue abriendo el mismo `PublishModal` de siempre, vía el mismo `onOpenPublish`.
- **Servicio real de KPIs**: sin ningún cambio de cálculo/contrato — solo cambió DÓNDE se muestra su mensaje de error cuando falla.
- **Auth/Roles/Supabase/RLS/Router**: cero archivos de esas capas tocados.

## 9. Resultado de `tsc`

`tsc --noEmit` (instalación global) ejecutado sobre los 3 archivos modificados (`DespachoPage.tsx`, `job-summary-card.tsx`, `job-indicadores-card.tsx`) — comparado contra el cierre del Sprint 5.1.4:

| Código | Antes (5.1.4) | Después (5.1.5) | Delta |
|---|---|---|---|
| TS7026 | 793 | 793 | 0 |
| TS2307 | 161 | 161 | 0 |
| TS2875 | 87 | 87 | 0 |
| TS7006 | 65 | 65 | 0 |
| TS7031 | 22 | 22 | 0 |
| TS2322 | 21 | 23 | +2 |
| TS2339 | 8 | 8 | 0 |
| TS7053 | 2 | 2 | 0 |
| TS2591 | 2 | 2 | 0 |
| TS2882 | 1 | 1 | 0 |
| TS2688 | 1 | 1 | 0 |

El único delta (+2 `TS2322`) corresponde a las 2 nuevas instancias del componente `Badge` (Pills "Urgente"/"Normal") — mismo patrón ya clasificado en cada ronda anterior (`children`/tipos de React faltantes en este sandbox sin `node_modules`). **Cero categorías nuevas, cero `TS6133` (import/variable sin usar — confirma que `DEMO_MODE`/`JOB_DEMO` quedan correctamente referenciados), cero errores de sintaxis.**

## 10. Resultado esperado de `npm run lint` / `typecheck` / `build` / `dev`

Este entorno de trabajo no tiene `node_modules` ni acceso de red — **no es posible ejecutar estos 4 comandos aquí**, y sus resultados no se fabrican. Expectativa razonada (no un resultado real):

- `npm run lint`: se espera sin errores nuevos.
- `npm run typecheck`: se espera en verde — la validación `tsc` de la sección 9 no encontró ningún diagnóstico fuera del patrón de artefactos ya conocido.
- `npm run build`: se espera exitoso, condicionado a que `typecheck`/`lint` pasen.
- `npm run dev`: se espera que `/despacho` muestre `CoordinatorEmptyState` (botón "Publicar trabajo", sin Workspace/Radar/Job Card/Indicadores) por defecto — y, si un desarrollador cambia manualmente `DEMO_MODE` a `true` en `DespachoPage.tsx`, el Workspace completo (JobSummaryCard con el nuevo Pill "Urgente"/"Normal" + LiveDispatchCard + Indicadores sin mensajes de error ajenos + ResponsesPanel).

**La validación final de estos 4 comandos corresponde ejecutarla en el entorno local del usuario.**

## 11. Documentación

Actualizados en esta misma ronda: `PROJECT_STATUS.md` (nueva sección de estado del Sprint 5.1.5), `CHANGELOG.md` (nueva entrada), `docs/SPRINTS_INDEX.md` (nueva fila 5.1.5), y este reporte técnico (nuevo). No se modificó ningún documento histórico.

## 12. Estado final — criterio de aprobación

Las 8 condiciones simultáneas exigidas por el brief quedan satisfechas: `CoordinatorEmptyState` se muestra cuando no existe trabajo activo (por defecto, `DEMO_MODE = false`); `CoordinatorWorkspace` solo se muestra cuando existe (`DEMO_MODE = true`, invocación manual explícita); el bloque superior del trabajo activo (`JobSummaryCard`) ya incluye el Pill "Urgente"/"Normal" real; el bloque "Indicadores" ya no muestra mensajes ajenos; no hay regresiones en Coordinador/Administrador/Instalador; se generó el reporte técnico completo. Las validaciones `npm run lint`/`typecheck`/`build`/`dev` quedan, como en cada ronda anterior, pendientes de ejecución real en el entorno local del usuario — este entorno de trabajo no puede ejecutarlas.
