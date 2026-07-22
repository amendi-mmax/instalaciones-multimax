# Sprint 5.1.2 — Refactor del Layout Operativo del Coordinador (MVP)

## 0. Nota de traza sobre el entorno de esta ronda

Sin ZIP adjunto: se trabajó sobre el estado en disco dejado por el cierre del Sprint 5.1.1 (incluido su "ajuste final" — Contexto Operativo real). Este entorno de trabajo no tiene `node_modules`/acceso de red — validación técnica realizada con la instalación global de `tsc` (`/home/claude/.npm-global/bin/tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0`), filtrando los diagnósticos a los archivos tocados y clasificándolos contra el mismo patrón de artefactos de entorno ya establecido en Sprints anteriores (`TS2307`/`TS2875`/`TS7026`/`TS7031`/`TS7006`/`TS2322`/`TS2339`/`TS2591`/`TS2688`/`TS2882`, todos causados por la ausencia real de `node_modules`, no por errores de este Sprint). `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` reales quedan, como en toda ronda anterior, bajo responsabilidad del usuario en su propio entorno.

## 1. Auditoría previa obligatoria (antes de escribir código)

Se leyeron completos `ARCHITECTURE.md` (§3, §8, §13, §14.9), `PROJECT_STATUS.md`, `README.md`, `CHANGELOG.md`, `TODO.md`, `docs/SPRINTS_INDEX.md`, `SPRINT_5_1_COORDINATOR_REPORT.md`, `SPRINT_5_1_1_ADMIN_SUPERUSER_REPORT.md` (incluida su sección 11, "ajuste final"), y el código real de `RootLayout.tsx`, `AppRouter.tsx`, `DespachoPage.tsx`, `TrabajosPage.tsx`, `TrabajoDetailPage.tsx`, `coordinator-subtabs.tsx`, `coordinator-kpi-row.tsx`, `coordinator-empty-state.tsx`, `publish-modal.tsx`, `confirm-cancel-dialog.tsx`, `header.tsx`, `footer.tsx`, `sidebar.tsx` (archivo obsoleto, stub vacío) y el HTML oficial (`Multimax_Despacho_v1.3.html`, `App()` líneas ~2060-2132, `CoordinatorJobs`/`JobDetail` líneas 2654-2730).

Se detectaron **3 discrepancias reales** entre la "ESTRUCTURA ESPERADA" del brief y la arquitectura/HTML oficial existente, reportadas al usuario vía `AskUserQuestion` (3 preguntas) antes de escribir ningún código:

1. **`CoordinatorSidebar`**: el HTML oficial no tiene ningún sidebar para el Coordinador (0 coincidencias de "sidebar"/"aside" en todo el script) — hecho ya confirmado explícitamente en el Sprint 5.1 ("Decisión del usuario: no construir el Sidebar", ver `PROJECT_STATUS.md`). El brief lo incluía en el árbol esperado sin la etiqueta "(placeholder)" que sí usa para Auction Engine/Timeline/Assignment Panel. **Decisión del usuario (verbatim): "No crear ningún `CoordinatorSidebar`... El HTML oficial... es la fuente de verdad."** — reafirmando la misma decisión de Sprint 5.1. El usuario extendió además la instrucción: tampoco agregar placeholders visuales para Auction Engine/Timeline/Assignment Panel en este Sprint — se incorporarán únicamente cuando exista un Sprint específico para cada uno.
2. **`CoordinatorHeader`/`CoordinatorFooter`**: `Header`/`Footer` son componentes reales ya existentes y **globales**, compartidos por los 3 roles (`<header class="mx-top">`/`<footer class="mx-foot">` de `App()` — el propio texto literal del Footer, "Las dos vistas — Coordinador e Instalador — comparten el mismo trabajo en vivo", confirma que nunca fueron exclusivos de Coordinador). Siguiendo la instrucción explícita del usuario de "priorizar siempre el HTML oficial", estos 2 nodos del árbol se satisficieron reutilizando `Header`/`Footer` tal cual, en la nueva posición del árbol (dentro de `CoordinatorLayout`) — ningún archivo nuevo `coordinator-header.tsx`/`coordinator-footer.tsx`.
3. **`CoordinatorKPIs`**: el brief lo ubica como hermano de `CoordinatorWorkspace`, lo que sugeriría visibilidad en todas las páginas del Coordinador. El HTML oficial no tiene ningún "Dashboard" — el Sprint 5.1 ya había tomado una decisión de producto explícita y puntual: los KPIs (`CoordinatorKpiRow`) se integran únicamente como fila adicional de `DespachoPage` ("Despacho en vivo"), no como elemento persistente. Elevarlo a este Layout habría sido un cambio de comportamiento real (visible también en `TrabajosPage`/`TrabajoDetailPage`), prohibido explícitamente por este mismo brief ("No cambia el comportamiento funcional"). **Resuelto sin bloquear**: se dejó `CoordinatorKpiRow` exactamente donde estaba, sin ningún cambio.

Adicionalmente, el usuario confirmó explícitamente mover `ConfirmCancelDialog` (no mencionado por nombre en el brief, que solo pide mover `PublishModal`) a `CoordinatorLayout` junto con `PublishModal`, por el mismo criterio arquitectónico ("RootLayout nunca debe contener lógica específica del Coordinador").

## 2. Mecanismo implementado

- **`src/layouts/CoordinatorLayout.tsx` (NUEVO)** — único punto de entrada de toda la operación del Coordinador. Compone, sin duplicar: `Header`/`Footer` (reutilizados tal cual), `SucursalSelect`/`CoordinatorSubtabs` (antes duplicados en `DespachoPage.tsx`/`TrabajosPage.tsx`, ahora un único punto), `<Outlet context={outletContext}/>` (mismas 3 rutas de siempre: `/despacho`, `/trabajos`, `/trabajos/:id` — sin cambios en `AppRouter.tsx`), y `PublishModal`/`ConfirmCancelDialog` (antes en `RootLayout.tsx`).
- **Reparto de estado, decidido con precisión** (ver JSDoc completo del archivo): `sucursalCoord`/`setSucursalCoord` **permanecen en `RootLayout.tsx`** — no se movieron, porque también alimentan a `OperationalContextProvider` (`sucursalCoord` es uno de sus 2 props), un sistema marcado explícitamente "NO MODIFICAR" por este brief. Moverlos habría exigido remontar ese Provider más abajo en el árbol. En cambio, `CoordinatorLayout` los recibe como props (`sucursalCoord`/`onSucursalCoordChange`). `showPublishModal`/`confirmCancelOpen` sí se movieron íntegramente (estado exclusivo de 2 diálogos del Coordinador, sin dependencia cruzada).
- `RootLayout.tsx`: el bloque `showCoordinador ? ... : ...` reemplaza el antiguo `<div>{Header}{main}{Footer}</div>` único — ahora, cuando `showCoordinador` es `true`, se monta `<CoordinatorLayout sucursalCoord={...} onSucursalCoordChange={...} adminSwitchSlot={...}/>`; en caso contrario (Instalador/Admin), se sigue montando el shell inline de siempre, sin ningún cambio de comportamiento. `adminSwitchSlot` (el selector `AdminVistaSwitch`+`Badge` del Sprint 5.1.1) se calcula una sola vez en `RootLayout` y se reutiliza en ambas ramas — sin duplicar su JSX.
- `RootLayoutOutletContext` se eliminó (ya no tiene sentido: `RootLayout` no monta ningún `<Outlet/>` directamente). Su reemplazo, `CoordinatorLayoutOutletContext` (misma forma exacta, 4 campos), vive en `CoordinatorLayout.tsx`.
- `DespachoPage.tsx`/`TrabajosPage.tsx`: se retiraron las llamadas duplicadas a `SucursalSelect`/`CoordinatorSubtabs`. `TrabajosPage.tsx` ya no necesita `useOutletContext()` en absoluto (no consumía ningún otro campo). `DespachoPage.tsx` sigue consumiendo `onOpenPublish`/`onOpenConfirmCancel`, ahora tipados contra `CoordinatorLayoutOutletContext`.

**Efecto colateral de fidelidad (documentado, no pedido explícitamente)**: en el HTML oficial, `mx-suc-sel`/`mx-subtabs-wrap` son hermanos del contenido de `coordTab` (`Coordinator`/`CoordinatorJobs`), siempre visibles — incluido cuando se muestra `JobDetail` (el reemplazo ocurre dentro de `CoordinatorJobs`, no afecta a sus hermanos). Antes de este Sprint, `TrabajoDetailPage.tsx` no mostraba `SucursalSelect`/`CoordinatorSubtabs`. Al hoistear ambos componentes a `CoordinatorLayout` (por encima del `<Outlet/>` compartido por las 3 rutas), `TrabajoDetailPage` pasa a mostrarlos también — un AUMENTO de fidelidad respecto al HTML oficial, consecuencia directa y deseable de eliminar la duplicación de estructura, no una funcionalidad nueva inventada.

## 3. Archivos nuevos

- `src/layouts/CoordinatorLayout.tsx`
- `docs/architecture/frontend/SPRINT_5_1_2_COORDINATOR_LAYOUT_REPORT.md` (este archivo)

## 4. Archivos modificados

- `src/layouts/RootLayout.tsx` — se retiran `showPublishModal`/`confirmCancelOpen` (estado) y el `useMemo` de `outletContext`; el bloque `role === 'coordinador'` inline se reemplaza por el montaje condicional de `CoordinatorLayout`; se retira la interfaz `RootLayoutOutletContext`; imports ajustados (`Outlet`, `useMemo`, `PublishModal`, `ConfirmCancelDialog` ya no se usan aquí). Sin cambios a Auth/Supabase/RLS/roles.
- `src/pages/coordinator/DespachoPage.tsx` — se retira el render duplicado de `SucursalSelect`/`CoordinatorSubtabs`; el tipo del outlet context pasa de `RootLayoutOutletContext` a `CoordinatorLayoutOutletContext`.
- `src/pages/coordinator/TrabajosPage.tsx` — mismo cambio; además se retira `useOutletContext()` por completo (ya no consume ningún campo).
- `PROJECT_STATUS.md`, `CHANGELOG.md`, `docs/SPRINTS_INDEX.md` — nuevas secciones/entradas para este Sprint (ver más abajo).

## 5. Archivos eliminados

Ninguno. (`RootLayoutOutletContext` se eliminó como interfaz de código, no como archivo — vivía dentro de `RootLayout.tsx`.)

## 6. Componentes reutilizados, sin modificar

`Header`, `Footer`, `SucursalSelect`, `CoordinatorSubtabs`, `PublishModal`, `ConfirmCancelDialog`, `CoordinatorKpiRow`, `CoordinatorEmptyState`, `Radar`, `LiveCountdown`, `AdminVistaSwitch`, `Badge`, `OperationalContextProvider`/`useOperationalContext` — ninguno de estos archivos cambió su propio código; solo cambió, para los primeros 6, desde dónde se montan.

## 7. Justificación técnica de cada cambio

- **Por qué un archivo nuevo (`CoordinatorLayout.tsx`) y no una carpeta de componentes**: el brief pide explícitamente "Diseñar un único `CoordinatorLayout`", y el proyecto ya tiene la carpeta `src/layouts/` para este tipo de componente (`RootLayout.tsx`, `AuthLayout.tsx`) — mismo patrón, misma carpeta.
- **Por qué `sucursalCoord` no se movió**: es el único punto de la refactorización donde 2 instrucciones explícitas del mismo brief entraban en conflicto directo ("el modal... deberá depender del CoordinatorLayout, no de RootLayout" vs. "NO MODIFICAR: ... OperationalContext"). Se resolvió sin tocar ninguna de las dos: `OperationalContextProvider` sigue exactamente en la misma posición del árbol, con el mismo prop, y `CoordinatorLayout` reutiliza ese mismo dato vía prop en vez de duplicar una segunda fuente de verdad.
- **Por qué no se crearon `CoordinatorHeader`/`CoordinatorFooter`/`CoordinatorSidebar`/`CoordinatorWorkspace` como archivos**: crear wrappers o componentes nuevos sin contraparte real en el HTML oficial habría violado dos reglas permanentes explícitas de este mismo brief ("Nunca duplicar componentes" / "Siempre reutilizar componentes existentes") y la instrucción específica del usuario de priorizar el HTML oficial ante cualquier ambigüedad.
- **Por qué no se rediseñó `AppRouter.tsx`**: el brief exige "no crear rutas nuevas" — las 3 rutas del Coordinador siguen siendo hijas directas de la misma `<Route path="/">` de siempre; `CoordinatorLayout` es un componente de composición interno a `RootLayout`, no un elemento de enrutamiento nuevo.

## 8. Validación técnica

- **Impacto en otros módulos**: ninguno. `role === 'instalador'`/`role === 'admin'` (rama `showAdminPanel`) siguen renderizando exactamente `InstallerDashboard`/`CountRing`/`AdminPanel` inline en `RootLayout.tsx`, sin ningún cambio de código ni de comportamiento.
- **Cambios en rutas**: ninguno. `AppRouter.tsx` no se tocó — mismas 3 rutas (`/despacho`, `/trabajos`, `/trabajos/:id`), mismo `CoordinatorIndexRedirect`.
- **Cambios en Supabase**: ninguno. Ningún repository/query/migración/RLS tocado.
- **Cambios en autenticación**: ninguno. `AuthProvider.tsx`/`SessionProvider.tsx`/`auth.service.ts`/`useAuth.ts` no se tocaron. `CoordinatorLayout` llama a `useAuth()` como lectura adicional del mismo Context ya resuelto por `AuthProvider` (mismo patrón que otros componentes del proyecto) — no es una llamada nueva a Supabase.
- **Cambios en permisos**: ninguno. `profile.rol`/RLS/policies sin cambios. El criterio `showCoordinador` (quién ve `CoordinatorLayout`) es exactamente el mismo del Sprint 5.1.1, sin modificar.
- **`tsc --noEmit`** (instalación global) ejecutado sobre el conjunto completo de archivos nuevos/modificados de este Sprint (`CoordinatorLayout.tsx`, `RootLayout.tsx`, `DespachoPage.tsx`, `TrabajosPage.tsx`) — todos los diagnósticos corresponden al mismo patrón de artefactos de entorno ya clasificado en rondas anteriores (falta de `node_modules`/tipos de React/React Router/lucide-react en este sandbox): `TS2307` (módulos no encontrados), `TS2875`/`TS7026` (JSX sin tipos), `TS7006` (parámetros de callback implícitos, en los mismos `map`/`filter` ya aprobados), `TS2322` (el mismo patrón ya clasificado para `Badge`/`TrabajoRow`, causado por la cascada de `any` de los tipos faltantes). **Cero `TS6133`** (import/variable sin usar) y **cero errores de sintaxis** en los 4 archivos — ambos indicadores de un error real, ninguno presente.

## 9. Validación local (best effort)

- `npm run lint`: **no ejecutado** — este entorno de trabajo no tiene `node_modules`/acceso de red. Pendiente de que el usuario lo ejecute en su entorno.
- `npm run typecheck`: **no ejecutado literalmente** (ese script probablemente invoca `tsc` vía `node_modules/.bin`, inexistente aquí) — se usó el equivalente best-effort descrito en la sección 8 (`tsc` global, mismo binario y misma metodología que todas las rondas anteriores del proyecto). Sin errores nuevos atribuibles a este Sprint.
- `npm run build`: **no ejecutado** — sin `node_modules`/Vite disponible en este entorno.
- `npm run dev`: **no ejecutado** — sin `node_modules`/servidor de desarrollo disponible en este entorno; tampoco hay credenciales reales de Supabase ni acceso de red para una validación visual/funcional en vivo.

Ninguno de estos 4 resultados se fabrica: quedan explícitamente pendientes de que el usuario los corra en su propio entorno, tal como en cada ronda anterior de este proyecto.

## 10. Documentación

Actualizados en esta misma ronda: `PROJECT_STATUS.md` (nueva sección de estado del Sprint 5.1.2), `CHANGELOG.md` (nueva entrada), `docs/SPRINTS_INDEX.md` (nueva fila 5.1.2), y este reporte técnico (nuevo). No se modificó ningún documento histórico (`PHASE_1.md`–`PHASE_4.md`, entradas anteriores de `CHANGELOG.md`, secciones previas de `PROJECT_STATUS.md`/`docs/SPRINTS_INDEX.md`) — todo lo anterior permanece intacto, solo se agregó contenido nuevo.

## 11. Estado final

El Sprint queda **listo para revisión del usuario**, sujeto a la validación local pendiente (sección 9). Deja preparada la arquitectura para el Sprint 5.2 ("Publicación de Trabajos"): `PublishModal` ya vive dentro de `CoordinatorLayout` (el único cambio que ese Sprint necesitará es conectar `onPublish` a una lógica real de escritura contra `trabajos`, sin tener que tocar de nuevo `RootLayout.tsx`/la ubicación del modal). `CoordinatorWorkspace` (el área de `<Outlet/>`) queda como el único punto donde Sprints futuros (Auction Engine, Timeline, Assignment Panel) deberán integrarse cuando les corresponda su turno — sin necesidad de otro refactor de layout para hacerlo.
