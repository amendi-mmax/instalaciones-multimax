# Sprint 5.1.3 — Implementación del Workspace Operativo del Coordinador (MVP)

## 0. Nota de traza sobre el entorno de esta ronda

Sin ZIP adjunto: se trabajó sobre el estado en disco dejado por el cierre del Sprint 5.1.2. Este entorno de trabajo no tiene `node_modules`/acceso de red — validación técnica realizada con la instalación global de `tsc` (`/home/claude/.npm-global/bin/tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0`), filtrando los diagnósticos a los archivos tocados y clasificándolos contra el mismo patrón de artefactos de entorno ya establecido en Sprints anteriores. `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` reales quedan, como en toda ronda anterior, bajo responsabilidad del usuario en su propio entorno.

## 1. Auditoría previa obligatoria (antes de escribir código)

Se leyeron completos `ARCHITECTURE.md`, `PROJECT_STATUS.md`, `TODO.md`, `README.md`, `CHANGELOG.md`, `docs/SPRINTS_INDEX.md`, `SPRINT_5_1_1_ADMIN_SUPERUSER_REPORT.md`, `SPRINT_5_1_2_COORDINATOR_LAYOUT_REPORT.md`, y el HTML oficial (`Multimax_Despacho_v1.3.html`): `function Coordinator(props)` completa (líneas 2132-2423, ambas ramas `jobs.length===0`/`jobs.length>0`), `jobView()` (línea 1853), `AssignedPanel`/`NoResponsePanel` (líneas 2424-2470), `Pill`/`StatTile` (líneas 1371-1436), y el bloque `<style>` completo (líneas 7-454). También se auditó el código real existente: `RootLayout.tsx`, `CoordinatorLayout.tsx`, `DespachoPage.tsx`, `TrabajosPage.tsx`, `coordinator-empty-state.tsx`, `assigned-panel.tsx`, `no-response-panel.tsx`, `two-column-layout.tsx`, `stat-tile.tsx`, `card.tsx`, `badge.tsx`, `button.tsx`, `empty-state.tsx`, y `globals.css` completo.

**Hallazgo clave de la auditoría (reutilización, Regla 7)**: gran parte de lo pedido por este Sprint YA EXISTE, construido en Sprints anteriores pero nunca montado (porque `jobs.length` siempre fue `0`, sin motor de trabajos real):
- `TwoColumnLayout` (`variant="despacho"`) ya modela `.mx-grid` exacto — no hacía falta crear "WorkspaceGrid" como archivo nuevo.
- `AssignedPanel`/`NoResponsePanel` (Sprint 3.16) ya reconstruyen sus bloques reales, documentados como "listos para integrarse cuando exista `Coordinator` real" — no necesitan tocarse en este Sprint (el job de demostración es de fase `live` con 0 respuestas, ninguno de los dos se alcanza).
- `EmptyState` (variante `compact`) ya modela `.mx-empty`/`.mx-empty-ic`, exactamente lo que pide el estado vacío de `ResponsesPanel`.
- `trabajoEstadoInfo()` (Sprint 5.1) ya modela tono/etiqueta para el vocabulario `live`/`assigned`/`completed`/`cancelled`.
- `Radar`/`LiveCountdown` (Sprints 3.7/3.9) ya existían, montados como hermanos sueltos en `DespachoPage.tsx` — este Sprint los reubica dentro de `LiveDispatchCard`, sin tocar su código.

**Discrepancia real detectada y reportada al usuario antes de escribir código (`AskUserQuestion`, 3 preguntas)**:

1. `Coordinator()` real tiene 2 ramas mutuamente excluyentes (`jobs.length===0` → estado vacío; `jobs.length>0` → Workspace completo). Antes de este Sprint, `DespachoPage` mostraba **ambas a la vez, sin exclusión** (`CoordinatorEmptyState`+`Radar`+`LiveCountdown` simultáneos) — una inconsistencia ya documentada como temporal desde los Sprints 3.6/3.7/3.9 ("se retira cuando exista la tarjeta real"). **Decisión del usuario (verbatim): "Reemplaza completamente el estado vacío del Coordinador por el Workspace Operativo del HTML oficial... el estado vacío queda eliminado del flujo principal... se recuperará posteriormente cuando se implemente la lógica real de publicación (Sprint 5.2)."**
2. El job de demostración necesario no tiene seed real en el HTML (`jobs` arranca en `[]`). **Decisión del usuario: "asume un trabajo de demostración (MVP) únicamente con fines de reconstrucción visual del layout"** — confirmando además, implícitamente, el alcance mínimo propuesto (fase `live`, 1 solo job, sin `QueueBar`/`AssignedPanel`/`NoResponsePanel`) al instruir "no agregues flags, placeholders ni lógica condicional adicional".
3. **Contradicción textual real dentro del propio brief de este Sprint, no resuelta explícitamente por el usuario** (no bloqueante, resuelta con criterio documentado): la sección 1 pide que `JobSummaryCard` contenga "Tiempo restante"; la sección 3 pide que `LiveDispatchCard` "conserve: contador". En el HTML oficial solo existe UN lugar real para esto (el encabezado de la tarjeta "Despacho en vivo", nunca dentro de `mx-jobcard`). **Resolución aplicada**: el contador EN VIVO real (`LiveCountdown`, con su propio timer) permanece en `LiveDispatchCard` (fidelidad exacta al HTML, y coincide con su instrucción explícita "no modificar lógica"); `JobSummaryCard` satisface su propio requisito con un valor ESTÁTICO (`remainingSeconds`, formateado una sola vez con `fmt()`, sin timer propio) — ninguno de los 2 duplica el motor de tiempo real del otro. Documentado con trazabilidad completa en el JSDoc de `job-summary-card.tsx`.

Adicionalmente, se detectó que buena parte del CSS necesario (`.mx-jobcard-h`, `.mx-jobtitle`, `.mx-jobmeta`, `.mx-jobreq`, `.mx-roundsingle`/`.mx-round`, `.mx-actionsrow`, `.mx-feedcard`, `.mx-sort`) **nunca había sido portado a `globals.css`** (la rama `jobs.length>0` nunca se había construido). Se portó verbatim desde el `<style>` del HTML oficial (líneas 7-454) — mecánico, no un rediseño, mismo criterio ya aplicado en cada Sprint anterior que construyó un bloque nuevo del HTML (ej. `.mx-detail-grid`/`.mx-timeline` en el Sprint 5.1).

## 2. Resumen técnico

Se reconstruyó el Workspace real de `Coordinator()` (rama `jobs.length > 0`) dentro de `DespachoPage.tsx`, usando un job de demostración fijo (fase `live`, 0 respuestas). Estructura final:

```
CoordinatorLayout (Sprint 5.1.2, sin cambios)
  Header / SucursalSelect / CoordinatorSubtabs (sin cambios)
  <Outlet/> → DespachoPage
    TwoColumnLayout (variant="despacho", YA EXISTENTE)
      left → <section className="mx-col">
        JobSummaryCard   (NUEVO)
        LiveDispatchCard (NUEVO, envuelve Radar/LiveCountdown ya existentes)
        CoordinatorKpiRow (YA EXISTENTE, reubicado)
      right → <section className="mx-col">
        ResponsesPanel   (NUEVO)
  PublishModal / ConfirmCancelDialog (Sprint 5.1.2, sin cambios)
  Footer (sin cambios)
```

`CoordinatorSidebar`/`AuctionEngine`/`Timeline`/`AssignmentPanel`/`JobPublicationEngine`/`LiveEngine`/`NotificationPanel`: **ninguno creado**, ninguno tiene equivalente real en el HTML oficial ni fue solicitado por el usuario para este Sprint.

## 3. Componentes nuevos creados

- `src/components/shared/job-summary-card.tsx` — `JobSummaryCard`. Reconstruye el encabezado/título/meta de `.mx-card.mx-jobcard`.
- `src/components/shared/live-dispatch-card.tsx` — `LiveDispatchCard`. Reconstruye la tarjeta "Despacho en vivo" completa (encabezado + Radar + "Ronda única" + acciones), reagrupando `Radar`/`LiveCountdown`/botón "Cancelar" ya existentes.
- `src/components/shared/responses-panel.tsx` — `ResponsesPanel`. Reconstruye la tarjeta "Respuestas en tiempo real" (encabezado + tabs de orden + estado vacío).
- `docs/architecture/frontend/SPRINT_5_1_3_COORDINATOR_WORKSPACE_REPORT.md` (este archivo).

## 4. Componentes reutilizados (sin ningún cambio en su propio código)

`TwoColumnLayout` (Fase 3, `variant="despacho"`), `Radar` (Sprint 3.7), `LiveCountdown` (Sprint 3.9), `CoordinatorKpiRow` (Sprint 5.1), `Card`/`CardHeader` (Fase 3), `Badge` (Fase 3), `Button` (Fase 3), `EmptyState` (Fase 3), `trabajoEstadoInfo`/`fmt` (Sprint 5.1/Fase 3). `AssignedPanel`/`NoResponsePanel` (Sprint 3.16) quedan **sin usar en este Sprint** (job de demostración siempre `live`, 0 respuestas) — no requieren ningún cambio, siguen listos para el Sprint 5.3.

## 5. Archivos modificados

- `src/pages/coordinator/DespachoPage.tsx` — reescrito: retira el render de `CoordinatorEmptyState`/`Radar`/`LiveCountdown`/botón "Cancelar" sueltos; monta el nuevo Workspace (`TwoColumnLayout` + `JobSummaryCard` + `LiveDispatchCard` + `CoordinatorKpiRow` + `ResponsesPanel`). El fetch de KPIs (`useEffect`/`getCoordinatorKpis`) no se tocó, solo su posición en el JSX.
- `src/styles/globals.css` — se agregan (sin modificar ninguna regla existente) las clases `.mx-jobcard-h`, `.mx-jobtitle`, `.mx-jobmeta`(+`svg`), `.mx-jobreq`(+`svg`), `.mx-roundsingle`, `.mx-round`(+`.act`/`.done`), `.mx-actionsrow`, `.mx-feedcard`, `.mx-sort`(+`button`/`button.on`) — portadas verbatim del `<style>` del HTML oficial.
- `PROJECT_STATUS.md`, `CHANGELOG.md`, `docs/SPRINTS_INDEX.md` — ver sección 10.

## 6. Archivos NO modificados (confirmación explícita)

`RootLayout.tsx`, `CoordinatorLayout.tsx`, `AppRouter.tsx`, `TrabajosPage.tsx`, `TrabajoDetailPage.tsx`, `AuthProvider.tsx`, `SessionProvider.tsx`, `operational-context.*`, cualquier `repository`/`service`, cualquier `hook` existente, `coordinator-empty-state.tsx`, `assigned-panel.tsx`, `no-response-panel.tsx`, `radar.tsx`, `live-countdown.tsx`, `coordinator-kpi-row.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `empty-state.tsx`, `two-column-layout.tsx`. Ninguna migración, policy, RLS o tabla tocada.

## 7. Justificación arquitectónica

- **Por qué no se crea "WorkspaceGrid"**: `TwoColumnLayout` (`variant="despacho"`) ya es ese componente exacto, desde Fase 3 — crear uno nuevo habría sido una duplicación directa, prohibida por Regla 2 de este mismo brief y por la Regla 7 ("la reutilización tiene prioridad").
- **Por qué `JobSummaryCard` vive dentro de la columna izquierda de `WorkspaceGrid` y no como hermano por encima de él** (a diferencia del árbol "aproximado" del propio brief): el HTML oficial anida `mx-jobcard` como PRIMER elemento de `mx-col` (columna izquierda), nunca como bloque de ancho completo por encima del grid. El propio brief califica su árbol como "aproximadamente así" y declara al HTML oficial como "FUENTE ÚNICA DE VERDAD" — ante esa tensión, se priorizó la estructura real del HTML.
- **Por qué "Publicar otro" se consolida en `JobSummaryCard` pero no se construye `QueueBar`**: el brief lista "Publicar otro" como campo explícito de `JobSummaryCard`; `QueueBar` (el selector de múltiples trabajos del HTML) no aparece en ningún lugar del árbol/lista de componentes de este Sprint y no tiene ninguna función real con un solo job de demostración — construirlo habría sido código sin propósito alcanzable, violando "no agregues... lógica condicional adicional".
- **Por qué `AssignedPanel`/`NoResponsePanel` no se tocan**: ya existen, ya están documentados como listos para el motor de subasta real (Sprint 5.3); el job de demostración (fase `live`, 0 respuestas) nunca alcanza ninguna de esas 2 ramas — modificarlos sin necesidad habría violado la Regla 6 ("no modificar componentes ya aprobados salvo estrictamente necesario").
- **Por qué se portó CSS nuevo pese a "no modificar estilos"**: esa instrucción aplica al contenido/markup de `JobSummaryCard` (no agregar información nueva, no cambiar su apariencia inventándola) — no impide completar el port, ya mecánico y verbatim, de clases CSS que el HTML oficial siempre tuvo pero que ningún Sprint anterior había necesitado copiar (la rama que las usa nunca se había construido). No modificar CSS existente; solo se **agregó** lo que faltaba, verbatim.

## 8. Confirmación de que no hubo regresiones

- **Admin**: `RootLayout.tsx` no se tocó — `AdminPanel`/`AdminVistaSwitch`/el selector de modo siguen exactamente igual. Un admin en Modo Coordinador ve el mismo `CoordinatorLayout` de siempre, ahora con el Workspace nuevo (mismo comportamiento para admin que para un Coordinador real, por diseño desde el Sprint 5.1.1).
- **Instalador**: `InstallerDashboard`/`CountRing` no se tocaron en absoluto.
- **`TrabajosPage`**: sin cambios — sigue reutilizando `CoordinatorLayout` (Outlet), sin depender de nada de lo nuevo.
- **`PublishModal`/`ConfirmCancelDialog`**: sin cambios de código; siguen viviendo en `CoordinatorLayout.tsx` (Sprint 5.1.2) y se siguen abriendo con los mismos `onOpenPublish`/`onOpenConfirmCancel` de siempre — verificado que `JobSummaryCard`/`LiveDispatchCard` los consumen sin alterar su firma.
- **Auth/Roles/Supabase/RLS/Router**: cero archivos de esas capas tocados.

## 9. Resultado de `tsc`

`tsc --noEmit` (instalación global) ejecutado sobre el conjunto completo de archivos nuevos/modificados (`job-summary-card.tsx`, `live-dispatch-card.tsx`, `responses-panel.tsx`, `DespachoPage.tsx`) — todos los diagnósticos corresponden al mismo patrón de artefactos de entorno ya clasificado en Sprints anteriores: `TS2307` (módulos no encontrados, sin `node_modules`), `TS2875`/`TS7026` (JSX sin tipos), `TS7006` (parámetros de callback implícitos, patrón preexistente), `TS2322` (el mismo patrón ya clasificado del prop `children` de `Badge`, causado por la cascada de `any` de los tipos de React faltantes — 4 nuevas ocurrencias, todas de esta misma clase, verificadas una por una). **Cero `TS6133`** (import/variable sin usar) y **cero errores de sintaxis** en los 4 archivos.

## 10. Resultado esperado de `npm run lint` / `typecheck` / `build` / `dev`

Este entorno de trabajo no tiene `node_modules` ni acceso de red — **no es posible ejecutar estos 4 comandos aquí**, y sus resultados no se fabrican. Expectativa razonada (no un resultado real):
- `npm run lint`: se espera sin errores nuevos — el código sigue las mismas convenciones ya usadas en el resto del proyecto (imports ordenados, componentes tipados, sin `any` explícito).
- `npm run typecheck`: se espera en verde — la validación `tsc` de la sección 9, aunque corrida en un entorno sin `node_modules` real, no encontró ningún diagnóstico fuera del patrón de artefactos ya conocido.
- `npm run build`: se espera exitoso, condicionado a que `typecheck`/`lint` pasen.
- `npm run dev`: se espera que cargue correctamente `/despacho` mostrando el nuevo Workspace (JobSummaryCard + Despacho en vivo con Radar + KPIs a la izquierda, Respuestas en tiempo real vacío a la derecha).

**La validación final de estos 4 comandos corresponde ejecutarla en el entorno local del usuario.**

## 11. Documentación

Actualizados en esta misma ronda: `PROJECT_STATUS.md` (nueva sección de estado del Sprint 5.1.3), `CHANGELOG.md` (nueva entrada), `docs/SPRINTS_INDEX.md` (nueva fila 5.1.3), y este reporte técnico (nuevo). No se modificó ningún documento histórico.

## 12. Estado final

El Sprint queda **listo para revisión del usuario**, sujeto a la validación local pendiente (sección 10). `DespachoPage` ahora reconstruye fielmente el Workspace Operativo real del HTML oficial, con datos de demostración explícitos y removibles cuando el Sprint 5.2 (Publicación de Trabajos) y el Sprint 5.3 (Motor de Subasta) implementen la lógica real: `onOpenPublish` ya está conectado al `PublishModal` real; `AssignedPanel`/`NoResponsePanel` ya existen y solo esperan datos reales; `ResponsesPanel` ya tiene su estructura de tabs lista para recibir una lista real de respuestas.
