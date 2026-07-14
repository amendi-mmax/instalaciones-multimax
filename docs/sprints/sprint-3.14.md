# Sprint 3.14 - Migración de `MasterCalendar` (Calendario maestro del panel de Administrador)

Rama: `feature/sprint-3-14-calendar`
Estado: 🟡 En revisión — pendiente de validación real (npm run lint/typecheck/build/dev), validación visual y aprobación explícita del usuario.

## Objetivo

Reconstruir exclusivamente el componente `MasterCalendar` del módulo Admin, tal como existe en `Multimax_Despacho_v1.3.html`, sin rediseñar, reinterpretar, simplificar ni modernizar. Sin lógica de negocio, sin Supabase/Realtime/queries/mutations/hooks de negocio/services/auth/APIs — exclusivamente visual, con datos mock.

## Análisis obligatorio (previo a la implementación)

### 1. Función encontrada

`function MasterCalendar()` (líneas 2825-3028 del script fuente) — confirmada como la función real reservada por el Sprint 3.13 (ver `docs/sprints/sprint-3.13.md` → tabla de la sección "1. Función encontrada", fila `MasterCalendar` marcada "no analizada todavía"). El nombre "Calendar"/"MasterCalendar" del brief y de `docs/SPRINTS_INDEX.md` coincide exactamente con esta función real — sin corrección de nombre necesaria.

### 2. Selector HTML

`.mx-page` (vía `PageContainer`, ya portado en Fase 3) como raíz, con `.mx-pagehead` (vía `PageHead`), `.mx-cal-outer` (`.mx-cal-hd`/`.mx-cal-month`/`.mx-cal-nav`/`.mx-cal-grid`/`.mx-cal-dow`/`.mx-cal-day`/`.mx-cal-dn`/`.mx-cal-dots`/`.mx-cal-dot`/`.mx-cal-count`), `.mx-card.mx-daylist` (`.mx-daylist-hd`/`.mx-joblist`/`.mx-jobrow*`) condicional a un día seleccionado, y `.mx-suc-badge` (leyenda de sucursales).

### 3. Líneas del HTML

- `MasterCalendar()`: líneas 2825-3028 (204 líneas de JSX fuente).
- CSS asociado: líneas 288-300 (`.mx-joblist`/`.mx-jobrow*`/`.mx-suc-badge`, compartido con `CoordinatorJobs()`, fuera de alcance) y líneas 419-440 (`.mx-cal-*`/`.mx-daylist*`, exclusivo de `MasterCalendar`) del `<style>` original.
- Datos mock asociados: `const SUSCOL` (línea 1117) y `const TRABAJOS` (línea 1183, 13 registros) — ninguno de los dos estaba migrado al proyecto todavía.

### 4. Dependencias

- `SUCURSALES` (`src/constants/index.ts`, Sprint 3.4) — alimenta el `<select>` del filtro de sucursal y la leyenda final.
- `ESTADO` (`src/constants/index.ts`, Sprint 3.12, portado íntegro) — resuelve el tono/etiqueta de cada Pill de estado en la lista de trabajos del día.
- `SUSCOL`/`TRABAJOS` (nuevas, agregadas en este Sprint a `src/constants/index.ts`) — colores por sucursal y mock de "todos los trabajos de todas las sucursales", verbatim del HTML fuente.
- Helper `Pill` del HTML → `Badge` (`components/ui/badge.tsx`, Fase 3), mismo criterio que el resto de los Sprints desde Fase 3.

### 5. Componentes reutilizables

`PageContainer`/`PageHead` (Fase 3, `.mx-page`/`.mx-pagehead`/`.mx-sub` — `PageHead` recibe `action` para el selector de sucursal, igual patrón que otros bloques), `Card` (Fase 3, `.mx-card`, sin `CardHeader` — el HTML fuente usa aquí un `.mx-daylist-hd` propio con `h3`+Pill, no el patrón `.mx-section-h`), `Badge` (Fase 3).

### 6. Componentes nuevos

`MasterCalendar` (`src/components/shared/master-calendar.tsx`) — único componente nuevo de este Sprint, sin sub-componentes propios (mismo criterio ya aplicado a `Radar`/`InstallerJobs`/`AdminInstaladores`: el HTML fuente no descompone este bloque en funciones internas).

### 7. CSS requerido

21 selectores nuevos (`.mx-joblist`, `.mx-jobrow`, `.mx-jobrow-main`, `.mx-jobrow-top`, `.mx-jobrow-id`, `.mx-jobrow-t`, `.mx-jobrow-meta` (+`span`/`svg`), `.mx-suc-badge`, `.mx-cal-outer`, `.mx-cal-hd`, `.mx-cal-month`, `.mx-cal-nav` (+`button`/`button:hover`), `.mx-cal-grid`, `.mx-cal-dow`, `.mx-cal-day` (+`:hover`/`.has-jobs`/`.sel`/`.today .mx-cal-dn`), `.mx-cal-dn`, `.mx-cal-dots`, `.mx-cal-dot`, `.mx-cal-count`, `.mx-daylist`, `.mx-daylist-hd` (+`h3`)), verbatim de las líneas 288-300 y 419-440 del `<style>` original. `@keyframes mxpop` (usado por `.mx-daylist`) ya existía en `globals.css` desde Fase 3 — no se redefine.

### 8. Diferencias encontradas respecto al documento del Sprint

Ninguna: el nombre "Calendar"/"MasterCalendar" reservado por `docs/SPRINTS_INDEX.md` y confirmado en el Sprint 3.13 coincide exactamente con `function MasterCalendar()`. Se detectó (no una diferencia de nombre, sino un dato adicional relevante para la integración) que el HTML fuente monta `MasterCalendar` en **dos** puntos distintos: (1) `AdminPanel()` cuando `tab === "calendario"` (línea 3047 — el contenedor real que ya existe en el proyecto desde el Sprint 3.13) y (2) `CoordinatorJobs({ isMaster })` cuando `isMaster` es verdadero (línea 2661 — `CoordinatorJobs()` no está construido todavía, sin Sprint asignado). Este Sprint integra `MasterCalendar` únicamente en el primer punto (`AdminPanel`), el único contenedor real existente; el segundo queda documentado y fuera de alcance, para cuando le corresponda su propio Sprint.

### 9. Riesgos

- `SUSCOL`/`TRABAJOS` son consumidos también por `CoordinatorJobs()` en el HTML fuente (fuera de alcance) — se portaron completos (9 sucursales / 13 trabajos), no un subconjunto, para no reabrir `src/constants/index.ts` cuando le corresponda su Sprint a `CoordinatorJobs`, mismo criterio ya aplicado a `ESTADO` en el Sprint 3.12.
- El fallback defensivo `SUSCOL[sucursal] || {}` del HTML fuente no es reproducible verbatim en TypeScript estricto sin introducir un error de tipo (`Record<string, SucursalColor>` sin `noUncheckedIndexedAccess` siempre devuelve `SucursalColor`, nunca `undefined`) — se omite ese fallback puntual; no cambia el comportamiento visual porque las 13 sucursales usadas en `TRABAJOS` están todas en `SUSCOL`. Documentado como adaptación técnica en el JSDoc de `master-calendar.tsx`.
- `AdminPanel` (contenedor) no está en la lista de componentes prohibidos de modificar de este Sprint — se actualizó su rama `tab === 'calendario'` (antes `null`, Sprint 3.13) para renderizar `MasterCalendar`, reemplazando el ternario `tab === 'instaladores' ? <AdminInstaladores/> : null` por el ternario verbatim del HTML fuente. No se tocó `AdminInstaladores` (componente en sí, prohibido) ni su lógica.

### 10. Estrategia de integración

Directa y real dentro del contenedor que ya existe (`AdminPanel`, Sprint 3.13) — no un mount temporal. `RootLayout.tsx` no requiere ningún cambio: `AdminPanel` ya se renderiza ahí desde el Sprint 3.13 (`role === 'admin'`).

## Implementación

### Componentes creados

- `MasterCalendar` (`src/components/shared/master-calendar.tsx`) — reconstrucción verbatim: encabezado con filtro de sucursal, grilla de mes (navegación ‹/›, puntos de color por trabajo, día de hoy resaltado, día seleccionado), lista de trabajos del día seleccionado (Pill de estado, badge de sucursal, zona/hora/instalador/precio) y leyenda final de colores por sucursal.

### CSS portado

Bloque de 21 selectores (ver punto 7) agregado a `src/styles/globals.css`, justo después del bloque del Sprint 3.13 (`.mx-admingrid`/.../`.mx-invite-note` + media query) y antes de `.mx-instside`. `.mx-jobrow-side`/`.mx-jobrow-price` (líneas 298-300 del HTML, pertenecen a `CoordinatorJobs()`) y `.mx-cal-day.other-month` (línea 431, nunca aplicada por `MasterCalendar`) se documentaron explícitamente como NO portadas — `MasterCalendar` no las usa.

### Integración

`src/components/shared/admin-panel.tsx`: la rama `tab === 'calendario'` (antes `null`, Sprint 3.13) ahora renderiza `<MasterCalendar />`; se reemplazó el ternario `tab === 'instaladores' ? <AdminInstaladores/> : null` por `tab === 'calendario' ? <MasterCalendar/> : <AdminInstaladores/>`, verbatim del HTML fuente. `RootLayout.tsx` no se modificó — no fue necesario.

### Reutilización (sin duplicar)

`PageContainer`/`PageHead`/`Card`/`Badge` (Fase 3), `SUCURSALES` (Sprint 3.4), `ESTADO` (Sprint 3.12) — ninguna reconstrucción nueva.

### Preparación para Supabase

`MasterCalendar` es puramente de presentación: sin generar arrays/objetos de negocio dentro del componente. `SUSCOL`/`TRABAJOS` (nuevas) viven en `src/constants/index.ts`, no como literales dentro del componente — podrán sustituirse por datos reales de la tabla `trabajos` sin tocar el JSX/estructura/estilos, solo la fuente de datos. `MESES`/`DOFW` (nombres de mes/día de la semana) son etiquetas de UI, no datos de negocio — se definen a nivel de módulo dentro de `master-calendar.tsx`, mismo criterio ya aplicado a `GRUPOS` en `InstallerJobs` (Sprint 3.12).

## Archivos creados

- `src/components/shared/master-calendar.tsx`
- `docs/sprints/sprint-3.14.md`

## Archivos modificados

- `src/constants/index.ts` (`SUSCOL`, `TrabajoMock`, `TRABAJOS`)
- `src/styles/globals.css` (bloque `.mx-joblist`/`.mx-jobrow*`/`.mx-suc-badge`/`.mx-cal-*`/`.mx-daylist*`, 21 selectores)
- `src/components/shared/admin-panel.tsx` (rama `tab === 'calendario'` ahora renderiza `MasterCalendar`)
- `MIGRATION_STATUS.md` (este archivo de seguimiento, per instrucción de este Sprint)

Sin cambios en `RootLayout.tsx`, `Header`, `Sidebar`, `Top Navigation`, `Coordinator`, `Installer`, `AdminInstaladores`, `InstallerDashboard`, `InstallerProfile`, `InstallerJobs`, `LiveCountdown`, `CountRing`, `Radar`, `PublishModal`, rutas ni Router/Supabase/Context/Hooks.

## Validaciones (best-effort en sandbox; validación real diferida al usuario)

- `tsc --noEmit` (stubs ambientales, básico + estricto): 0 diagnósticos.
- `prettier --check` sobre `.ts`/`.tsx`/`.css` de los archivos tocados: cero diferencias (tras una corrección de formato automática en `master-calendar.tsx`).
- `git status`/`git diff --stat -- src/` (solo lectura) confirman el alcance exacto: 1 componente nuevo, 3 archivos modificados, ningún componente de la lista prohibida tocado.
- Pendiente de confirmación del usuario: `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` reales, y validación visual/funcional contra `Multimax_Despacho_v1.3.html`.

## Cobertura

`components/shared/`: 26 componentes (+1, `MasterCalendar`). CSS `.mx-cal-*`/`.mx-joblist`/`.mx-jobrow*`/`.mx-suc-badge`: 21/21 selectores nuevos portados (más `@keyframes mxpop`, ya existente). Cobertura estimada agregada del HTML: ≈30% (+1 punto sobre el ≈29% del Sprint 3.13) — ver detalle en `MIGRATION_STATUS.md` §7.

## Pendientes fuera de alcance de este Sprint

- `CoordinatorJobs()` (líneas 2654-2822 del HTML fuente) — segundo consumidor real de `MasterCalendar`/`SUSCOL`/`TRABAJOS` (rama `isMaster`), y consumidor real de `ESTADO` para su propia lista "Mis trabajos" del coordinador; sin Sprint asignado todavía.
- El resto de `Coordinator()` (`mx-jobcard`, `QueueBar`, `AssignedPanel`, `NoResponsePanel`, respuestas) sigue dependiendo de un motor de trabajos real (`jobs`/`publishJob`), no de `TRABAJOS` (que es un mock estático distinto, de solo lectura).
- Sincronización `SucursalSelect`↔`HeaderStatus.sucursalActiva` (heredado de Sprint 3.4) y `onPublish` sin lógica real en `PublishModal` (heredado de Sprint 3.5) — sin cambios en este Sprint.

## Estado al cierre de esta ronda

Análisis e implementación completos. Validación best-effort (`tsc`/`prettier`) en verde. Por instrucción explícita de este Sprint, en esta ronda se actualiza únicamente este documento (`docs/sprints/sprint-3.14.md`) y `MIGRATION_STATUS.md` — `CHANGELOG.md`, `PROJECT_STATUS.md`, `TODO.md` y `docs/SPRINTS_INDEX.md` se actualizarán únicamente después de la aprobación explícita del usuario. El Sprint permanece 🟡 En revisión hasta esa confirmación; no se inicia el Sprint 3.15.
