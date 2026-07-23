# Sprint 5.1.4 — Finalización del Workspace Operativo del Coordinador (MVP)

## 0. Nota de traza sobre el entorno de esta ronda

Sin ZIP adjunto: se trabajó sobre el estado en disco dejado por el cierre del Sprint 5.1.3. Este entorno de trabajo no tiene `node_modules`/acceso de red — validación técnica realizada con la instalación global de `tsc` (`/home/claude/.npm-global/bin/tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0`), filtrando los diagnósticos a los archivos tocados y clasificándolos contra el mismo patrón de artefactos de entorno ya establecido en Sprints anteriores. `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` reales quedan, como en toda ronda anterior, bajo responsabilidad del usuario en su propio entorno.

## 1. Auditoría previa obligatoria (antes de escribir código)

Se leyeron completos `ARCHITECTURE.md`, `PROJECT_STATUS.md`, `CHANGELOG.md`, `README.md`, `TODO.md`, `docs/SPRINTS_INDEX.md`, `SPRINT_5_1_1_ADMIN_SUPERUSER_REPORT.md`, `SPRINT_5_1_2_COORDINATOR_LAYOUT_REPORT.md`, `SPRINT_5_1_3_COORDINATOR_WORKSPACE_REPORT.md`, y el HTML oficial (`Multimax_Despacho_v1.3.html`): cuerpo completo de `function Coordinator(props)` (líneas 2132-2423, ambas ramas `jobs.length===0`/`jobs.length>0`), con especial atención a la rama `jobs.length>0` completa (`mx-jobcard-h`/`mx-jobtitle`/`mx-jobmeta`, la tarjeta "Despacho en vivo", la tarjeta "Indicadores" -`mx-stats`/`mx-goal`-, y "Respuestas en tiempo real" -`mx-feedcard`/`mx-sort`/`mx-empty`/`mx-feed`-). También se auditó el código real existente: `DespachoPage.tsx`, `job-summary-card.tsx`, `live-dispatch-card.tsx`, `responses-panel.tsx`, `coordinator-empty-state.tsx`, `coordinator-kpi-row.tsx`, `CoordinatorLayout.tsx`, y `globals.css` completo (verificación `grep -c` de las clases `mx-goal`/`mx-stats`/`mx-stat`/`mx-qbar`/`mx-qjob`/`mx-qadd`/`mx-feed`/`mx-select`/`mx-price`, entre otras).

### Estados mutuamente excluyentes identificados (Regla 19)

1. `Coordinator()`: `jobs.length === 0` (estado vacío, `CoordinatorEmptyState`) vs. `jobs.length > 0` (Workspace completo) — nunca simultáneos.
2. Dentro de `job.phase` (rama Workspace): `live`/`assigned`/`completed`/`cancelled` — el job de demostración de este Sprint permanece fijo en `live` (heredado del Sprint 5.1.3, sin cambios), así que las otras 3 ramas siguen sin ser alcanzables en este Sprint — no se agregó ninguna lógica condicional nueva para ellas (fuera de alcance, dependen del motor de subasta real, Sprint 5.3).

### Discrepancia real detectada y resuelta con el usuario (`AskUserQuestion`, 1 pregunta) antes de escribir código

El punto 6 del brief pedía "completar `CoordinatorKpiRow`... debe contener todos los indicadores presentes en el HTML oficial". Al auditar `Coordinator()` (líneas 2318-2354), el bloque real "Indicadores" resultó ser un componente **distinto** al `CoordinatorKpiRow` existente:

| | HTML oficial ("Indicadores") | `CoordinatorKpiRow` existente |
|---|---|---|
| Campos | 1ª respuesta, 3 respuestas, Asignación, Notificados, Abiertos, Respuestas | Pendientes, Activos, Finalizados, Programados hoy |
| Fuente de datos | `jobView(job, sortBy)` — requiere bids reales del motor de subasta | `getCoordinatorKpis(tiendaId)` — servicio real ya implementado (Sprint 5.1) |
| Origen | Bloque real de `Coordinator()`, nunca portado | Decisión de producto explícita (Sprints 5.1/5.1.2): "el HTML oficial no tiene ningún Dashboard" |

Modificar el contenido de `CoordinatorKpiRow` para que "coincida con el HTML oficial" habría revertido una decisión arquitectónica ya reafirmada dos veces y habría requerido datos (`jobView()`) que no pueden existir sin el motor de subasta real — explícitamente fuera de alcance de un Sprint visual (Regla 20: "los Sprints visuales no implementan lógica de negocio"). Se presentaron 3 opciones al usuario vía `AskUserQuestion`; resolución elegida (verbatim):

> "Mantener `CoordinatorKpiRow` como fuente de datos y crear el bloque visual de Indicadores del HTML oficial utilizando esos datos. No reemplazar ni eliminar `CoordinatorKpiRow`. Este Sprint busca completar la reconstrucción visual del HTML sin romper componentes ya aprobados. El componente `CoordinatorKpiRow` podrá convertirse posteriormente en un wrapper del bloque Indicadores cuando finalice la Fase 5, pero no debe eliminarse ni cambiar su contrato en este Sprint."

## 2. Resumen técnico

Se cierra la serie 5.1.x con 2 cambios:

1. **Estado único de control (`activeJob`)** en `DespachoPage.tsx`: corrige el bug estructural señalado por el propio brief ("Actualmente siempre se muestra `CoordinatorWorkspace`. Debe corregirse") — antes de este Sprint no existía ninguna posibilidad de renderizar `CoordinatorEmptyState` (retirado del flujo desde el Sprint 5.1.3). Ahora `activeJob: JobSummaryCardJob | null` decide, de forma mutuamente excluyente, entre `CoordinatorEmptyState` (si `null`) y el Workspace completo (si existe). Se fija temporalmente a `JOB_DEMO` — valor explícitamente admitido por el propio brief ("`const activeJob = JOB_DEMO;`") — para no revertir la reconstrucción visual ya aprobada en el Sprint 5.1.3.
2. **`JobIndicadoresCard` (nuevo)**: envuelve `CoordinatorKpiRow` (sin ningún cambio) con el marco visual real del bloque "Indicadores" (`Card`+`CardHeader` con ícono `TrendingUp`+título "Indicadores", y pie `.mx-goal` reutilizando `activeJob.bidMins`).

Adicionalmente se verificó, campo por campo contra el HTML oficial y contra el checklist explícito del brief, que `JobSummaryCard` y `ResponsesPanel` ya estaban completos desde el Sprint 5.1.3 — **cero cambios** en ninguno de los dos.

## 3. Componentes nuevos creados

- `src/components/shared/job-indicadores-card.tsx` — `JobIndicadoresCard`. Envuelve `CoordinatorKpiRow` con el marco visual real de "Indicadores" (título/ícono/`mx-goal`).

## 4. Componentes reutilizados (sin ningún cambio en su propio código)

`CoordinatorKpiRow` (Sprint 5.1 — **contrato y contenido intactos**, per decisión explícita del usuario), `CoordinatorEmptyState` (Sprint 3.6 — reincorporado al flujo de `DespachoPage`, sin cambios de código), `JobSummaryCard`/`LiveDispatchCard`/`ResponsesPanel` (Sprint 5.1.3 — verificados completos, sin cambios), `Card`/`CardHeader` (Fase 3), `Loading` (Fase 3).

## 5. Archivos modificados

- `src/pages/coordinator/DespachoPage.tsx` — se agrega `activeJob` (estado único de control) con `if (!activeJob) return <CoordinatorEmptyState .../>`; se reincorpora el import de `CoordinatorEmptyState`; se reemplaza el render directo de `CoordinatorKpiRow`/`Loading`/mensaje de error por `<JobIndicadoresCard kpis={kpis} kpisError={kpisError} bidMins={activeJob.bidMins}/>` (mismo `useEffect`/estado `kpis`/`kpisError`, sin ningún cambio de lógica de fetch).
- `src/styles/globals.css` — se agregan (sin modificar ninguna regla existente) las clases `.mx-goal`/`.mx-goal svg`, portadas verbatim de las líneas 96-97 del `<style>` original.
- `PROJECT_STATUS.md`, `CHANGELOG.md`, `docs/SPRINTS_INDEX.md` — ver secciones correspondientes.

## 6. Archivos NO modificados (confirmación explícita)

`src/components/shared/coordinator-kpi-row.tsx` (mismo archivo, mismo contrato `{ kpis: CoordinatorKpis }`, cero cambios de código ni de cálculo — per decisión explícita del usuario), `job-summary-card.tsx`, `live-dispatch-card.tsx`, `responses-panel.tsx`, `coordinator-empty-state.tsx`, `RootLayout.tsx`, `CoordinatorLayout.tsx`, `AppRouter.tsx`, `TrabajosPage.tsx`, `TrabajoDetailPage.tsx`, `AuthProvider.tsx`, `SessionProvider.tsx`, `operational-context.*`, cualquier `repository`/`service`, cualquier `hook` existente. Ninguna migración, policy, RLS o tabla tocada.

## 7. Justificación arquitectónica

- **Por qué `activeJob` se fija a `JOB_DEMO` y no a `null`**: ambos valores son ejemplos explícitamente válidos según el propio brief. Fijarlo a `null` habría revertido, sin ninguna instrucción nueva que lo pida, la decisión explícita del usuario en el Sprint 5.1.3 ("Reemplaza completamente el estado vacío... El estado vacío queda eliminado del flujo principal"). Fijarlo a `JOB_DEMO` preserva esa decisión mientras corrige el bug real señalado por este Sprint (la falta de la rama condicional en sí, no el valor concreto que toma hoy). El Sprint 5.2 solo necesitará cambiar el origen de este valor (de una constante fija a datos reales de `trabajos`), no la estructura de este archivo — cumpliendo el Objetivo 10 de este Sprint.
- **Por qué no se modifica `CoordinatorKpiRow`**: decisión explícita del usuario (sección 1), que además preserva la Regla 6 (no modificar componentes ya aprobados salvo necesidad estricta) y evita depender de datos (`jobView()`) que no existen sin el motor de subasta real (Sprint 5.3) — ver discrepancia detectada en la sección 1.
- **Por qué se crea `JobIndicadoresCard` como archivo nuevo, en vez de envolver `CoordinatorKpiRow` inline en `DespachoPage.tsx`**: sigue el mismo patrón ya establecido por el proyecto para cada bloque real del HTML oficial (`JobSummaryCard`/`LiveDispatchCard`/`ResponsesPanel`, Sprint 5.1.3) — un componente presentacional propio por bloque, no lógica de composición embebida en la página. También satisface Regla 9 ("solo crear componentes nuevos si la auditoría demuestra que realmente no existen") — no existía previamente ningún componente que reconstruyera el marco visual real de "Indicadores" (título/ícono/`mx-goal`).
- **Por qué se portó CSS nuevo (`mx-goal`) pese al alcance "solo reconstrucción visual"**: es un port mecánico y verbatim de una clase que el HTML oficial siempre tuvo pero que ningún Sprint anterior había necesitado copiar (la rama que la usa nunca se había construido) — mismo criterio ya aplicado en el Sprint 5.1.3 para `.mx-jobcard-h`/`.mx-jobtitle`/etc.
- **Por qué no se tocan `JobSummaryCard`/`ResponsesPanel`**: se compararon campo por campo contra el checklist explícito del brief (sección 5: código JOB/estado/tipo/ubicación/fecha/sucursal/tiempo restante/Publicar otro; sección 7: coincidencia con el HTML oficial para el alcance ya construido) y ambos ya estaban completos desde el Sprint 5.1.3 — modificarlos sin necesidad habría violado la Regla 6.

## 8. Confirmación de que no hubo regresiones

- **Admin**: `RootLayout.tsx`/`CoordinatorLayout.tsx` no se tocaron — un admin en Modo Coordinador ve el mismo Workspace de siempre, ahora con el marco "Indicadores" añadido.
- **Instalador**: `InstallerDashboard`/`CountRing` no se tocaron en absoluto.
- **`TrabajosPage`/`TrabajoDetailPage`**: sin cambios.
- **`PublishModal`/`ConfirmCancelDialog`**: sin cambios de código; `activeJob` no altera en absoluto su comportamiento — siguen usando `JOB_DEMO`/no-op tal como en el Sprint 5.1.3, per Objetivo 10 ("Este Sprint termina exactamente donde comienza `PublishModal`").
- **Servicio real de KPIs (`getCoordinatorKpis`)**: sin ningún cambio de cálculo, contrato o comportamiento — sigue alimentando exactamente los mismos 4 valores reales, ahora mostrados dentro del marco visual "Indicadores" en vez de sueltos.
- **Auth/Roles/Supabase/RLS/Router**: cero archivos de esas capas tocados.

## 9. Resultado de `tsc`

`tsc --noEmit` (instalación global) ejecutado sobre el conjunto completo de archivos nuevos/modificados (`job-indicadores-card.tsx`, `DespachoPage.tsx`) — distribución de diagnósticos comparada contra el run del cierre del Sprint 5.1.3:

| Código | Antes (5.1.3) | Después (5.1.4) | Delta |
|---|---|---|---|
| TS7026 | 791 | 793 | +2 |
| TS2307 | 160 | 161 | +1 |
| TS2875 | 86 | 87 | +1 |
| TS7006 | 65 | 65 | 0 |
| TS7031 | 22 | 22 | 0 |
| TS2322 | 21 | 21 | 0 |
| TS2339 | 8 | 8 | 0 |
| TS7053 | 2 | 2 | 0 |
| TS2591 | 2 | 2 | 0 |
| TS2882 | 1 | 1 | 0 |
| TS2688 | 1 | 1 | 0 |

Los únicos deltas (+2 TS7026, +1 TS2307, +1 TS2875) corresponden íntegramente al único archivo nuevo (`job-indicadores-card.tsx`: 1 import de `lucide-react` sin tipos, 1 JSX sin `react/jsx-runtime`, JSX intrínsecos sin tipar), todos del mismo patrón de artefacto de entorno ya clasificado en cada ronda anterior (ausencia de `node_modules` en este sandbox). **Cero categorías nuevas, cero `TS6133` (import/variable sin usar), cero errores de sintaxis** en los 2 archivos tocados.

## 10. Resultado esperado de `npm run lint` / `typecheck` / `build` / `dev`

Este entorno de trabajo no tiene `node_modules` ni acceso de red — **no es posible ejecutar estos 4 comandos aquí**, y sus resultados no se fabrican. Expectativa razonada (no un resultado real):

- `npm run lint`: se espera sin errores nuevos — el código sigue las mismas convenciones ya usadas en el resto del proyecto.
- `npm run typecheck`: se espera en verde — la validación `tsc` de la sección 9 no encontró ningún diagnóstico fuera del patrón de artefactos ya conocido.
- `npm run build`: se espera exitoso, condicionado a que `typecheck`/`lint` pasen.
- `npm run dev`: se espera que cargue correctamente `/despacho` mostrando el Workspace completo (JobSummaryCard + Despacho en vivo + Indicadores envolviendo los KPIs reales, Respuestas en tiempo real vacío) — o, si `activeJob` se fijara a `null` en una ronda futura, `CoordinatorEmptyState` en su lugar.

**La validación final de estos 4 comandos corresponde ejecutarla en el entorno local del usuario.**

## 11. Documentación

Actualizados en esta misma ronda: `PROJECT_STATUS.md` (nueva sección de estado del Sprint 5.1.4), `CHANGELOG.md` (nueva entrada), `docs/SPRINTS_INDEX.md` (nueva fila 5.1.4), y este reporte técnico (nuevo). No se modificó ningún documento histórico.

## 12. Estado final — preparación para el Sprint 5.2

El `CoordinatorWorkspace` queda estabilizado: la estructura visual (`JobSummaryCard`/`LiveDispatchCard`/`JobIndicadoresCard`/`ResponsesPanel`, gobernada por el estado único `activeJob`) ya reconstruye fielmente el HTML oficial y no debería requerir un nuevo refactor de interfaz. El Sprint 5.2 ("Publicación de Trabajos") puede concentrarse únicamente en lógica de negocio:

- Reemplazar el origen de `activeJob` (hoy `JOB_DEMO` fijo) por el trabajo activo real de la sucursal (`trabajos` con `estado='live'`/`'assigned'`, o `null` si no hay ninguno) — sin tocar la estructura de `DespachoPage.tsx` más allá de esa fuente de datos.
- Conectar `onPublish` de `PublishModal` a un `INSERT` real contra `trabajos`.
- `AssignedPanel`/`NoResponsePanel` (Sprint 3.16) ya existen y solo esperan datos reales del motor de subasta (Sprint 5.3).
- `JobIndicadoresCard` seguirá funcionando sin cambios (sigue envolviendo `CoordinatorKpiRow`, alimentado por datos reales) hasta que una decisión de producto futura (mencionada explícitamente por el usuario) decida convertirlo en un wrapper del bloque "Indicadores" real del HTML — fuera de alcance de este Sprint.
