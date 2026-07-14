# CHANGELOG.md — HANDYMAX · Multimax Despacho

Formato libre, en orden cronológico descendente. Cada entrada corresponde a una sesión/fase de trabajo (desde el Sprint 3.1, a un Sprint).

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
