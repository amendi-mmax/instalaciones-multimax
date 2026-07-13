# MIGRATION_STATUS.md — HANDYMAX · Multimax Despacho

Seguimiento **exclusivo** de la reconstrucción HTML→React de `Multimax_Despacho_v1.3.html` (3.557 líneas, referencia visual/UX oficial e inmodificable del proyecto). No sustituye a `PROJECT_STATUS.md` (estado general), `TODO.md` (checklist) ni `CHANGELOG.md` (registro de cambios) — se actualiza al final de cada fase con el detalle pantalla por pantalla y componente por componente.

Última actualización: 2026-07-13 — Sprint 3.11 (`InstallerProfile`) — ✅ Completado.

Desde el Sprint 3.1, este archivo se actualiza al cierre de **cada Sprint** (no solo de cada Fase). El detalle de análisis previo + implementación de cada Sprint vive en `docs/sprints/sprint-X.Y.md`; el índice y estado de todos los Sprints planeados vive en `docs/SPRINTS_INDEX.md`. Desde el Sprint 3.2, cada Sprint se identifica por el bloque/selector real del HTML, no por un nombre genérico de sección.

## 0. Seguimiento del Sprint actual

- **Sprint actual**: 3.12 — 🔜 Preparación del Sprint 3.12 (`InstallerJobs`). Sprint 3.11 (`InstallerProfile`) — ✅ Completado (cerrado; validación real y visual confirmadas por el usuario).
- **Bloque HTML**: `function InstallerProfile({ meInfo })` (líneas ~3491-3524 del JSX fuente, selector `.mx-profscreen`) — pantalla "Perfil" dentro del teléfono del Instalador. A diferencia de la mayoría de los Sprints anteriores de esta fase, el nombre "Installer Profile" del brief **sí corresponde exactamente** a esta función real — sin corrección de nombre necesaria.
- **Estado**: ✅ Completado — el usuario confirmó localmente `npm install`/`npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` y la validación visual (comparación contra `Multimax_Despacho_v1.3.html`).
- **Componente React**: `InstallerProfile` (`src/components/shared/installer-profile.tsx`) — reconstrucción verbatim, sin estado ni efectos propios (función pura derivada de `meInfo`). Reutiliza `Badge` (`tone="green"`) para el helper `Pill` del HTML — se descartó `StatusBadge` por agregar una capa semántica no presente en el uso original.
- **Datos/utilidades nuevas**: ninguna constante/mock nuevo — reutiliza `INSTALLERS`/`InstallerMock` (ya migrados desde Fase 3/Sprint 3.7) para el prop `meInfo`.
- **Integración**: entrega inicial como hermano independiente de `InstallerDashboard` en `src/layouts/RootLayout.tsx` (con `meInfo` mock fijo, `INSTALLERS[0]`), porque el brief de este Sprint prohibía modificar `InstallerDashboard`. Ajuste posterior, aprobado explícitamente por el usuario tras la validación visual: la integración se movió a la rama real `instTab === 'perfil'` de `InstallerDashboard` (`src/components/shared/installer-dashboard.tsx`), reutilizando el `meInfo` que ese componente ya deriva de `INSTALLERS`/`meId` — coincide exactamente con el HTML fuente. `RootLayout.tsx` ya no monta `InstallerProfile` directamente: solo renderiza `InstallerDashboard` (más `CountRing`, integración temporal separada del Sprint 3.8, sin relación con este ajuste) dentro de `role === 'instalador'`.
- **CSS nuevo**: bloque `.mx-prof*` (12 reglas: `.mx-profscreen`, `.mx-profhero`, `.mx-profava`, `.mx-profname`, `.mx-profzone`, `.mx-profstats`, `.mx-profstat` + `b`/`span`, `.mx-profblock` + `h4`/`h4 svg`), verbatim de las líneas 363-374 del `<style>` original.
- **Cobertura del HTML**: `InstallerProfile` reconstruye ~34 líneas de JSX fuente (`.mx-profscreen` completo) + 12 selectores CSS nuevos. Agregado global del proyecto ≈26-27% (ver §7).
- **Archivos creados**: `src/components/shared/installer-profile.tsx`, `docs/sprints/sprint-3.11.md`.
- **Archivos modificados**: `src/styles/globals.css` (`.mx-prof*`), `src/components/shared/installer-dashboard.tsx` (rama `instTab === 'perfil'` ahora renderiza `InstallerProfile`, tras el ajuste), `src/layouts/RootLayout.tsx` (retiro del mount temporal independiente, tras el ajuste), `CHANGELOG.md`, `PROJECT_STATUS.md`, este archivo, `TODO.md`, `docs/SPRINTS_INDEX.md`.
- **Problema encontrado / decisión (reportado, resuelto con ajuste aprobado por el usuario)**: la lista "Reglas de prioridad" de este bloque tiene 4 ítems, no 5 (la versión de `mx-instside`, Sprint 3.2, ya migrada) — no se unificaron, cada una se migró tal cual su bloque de origen. Ver `docs/sprints/sprint-3.11.md` → "Diferencias encontradas".
- **Pendientes reales del proyecto** (no bloquean el cierre, ya cerrado, de este Sprint): `InstallerJobs()` (`.mx-myjobs`) queda para el Sprint 3.12; las 7 ramas restantes de "Solicitudes" (`mx-alert`/`mx-offer`/`mx-phone-sent`/`mx-phone-done`×3) y el consumo de `CountRing` dentro de ellas requieren un Sprint futuro con motor de trabajos real; el consumidor real de `LiveCountdown` (`statusPill`/`QueueBar` de `Coordinator`) y el resto de `Coordinator()` requieren esa misma base; conectar `onPublish` de `PublishModal`; resolver la desincronización `SucursalSelect`↔`HeaderStatus.sucursalActiva` (heredado de Sprint 3.4); decidir sobre la posible duplicación `ui/Tabs` vs `MxSubtabs`/`MxSubtabButton`/`MxPhoneTabs` para AdminPanel (heredado, sin resolver); `km`/mock `INSTALLERS` sin campo equivalente unificado en `types/domain.ts`/schema SQL (heredado de Sprint 3.2) — ver notas en `docs/SPRINTS_INDEX.md`. **Sprint 3.11 cerrado (✅ Completado). Sprint 3.12 en preparación, pendiente de su propio análisis previo obligatorio.**

## 1. Estado de cada pantalla

| Pantalla / vista del prototipo | Estado | Fase responsable |
| --- | --- | --- |
| Shell raíz (`mx-top` + contenido + `mx-foot`) | ✅ Reconstruido (`RootLayout`) | Fase 3 |
| Header / role-switch (`mx-top`) | ✅ Reconstruido, fidelidad ajustada en Sprint 3.1 (ver §0) | Fase 3 + Sprint 3.1 |
| Sub-tabs (`mx-subtabs`, usado en Coordinator y AdminPanel) | ✅ Reconstruido y visible en `RootLayout` para `role === 'coordinador'` (instancia Coordinator); integración definitiva a `layouts/CoordinatorLayout.tsx`/AdminPanel queda pendiente de esos Sprints futuros — ver §0 | Sprint 3.3 |
| Selector de sucursal activa (`mx-suc-sel`) | ✅ Reconstruido y visible en `RootLayout` para `role === 'coordinador'`; validación real + visual aprobadas por el usuario (ver §0); badge `sucursalActiva` de `HeaderStatus` desincronizado, reportado sin corregir | Sprint 3.4 |
| Coordinator · Despacho en vivo (`mx-grid`, JobCard, Radar, Rounds, Feed) | 🟡 Estado vacío (`mx-qempty`, ✅ validado), `Radar` (✅ validado) y `LiveCountdown` (✅ validado) reconstruidos, visibles temporalmente en `RootLayout` (ver §0); el resto (`mx-jobcard`, QueueBar, Rounds, Feed) sigue ⛔, depende de `jobs`/`Trabajo` real | Sprint 3.6 (estado vacío) + Sprint 3.7 (`Radar`) + Sprint 3.9 (`LiveCountdown`) / Fase 4 (resto) |
| Coordinator · Publicar trabajo (`PublishModal`) | ✅ Reconstruido y visible en `RootLayout`, ahora abierto mediante el botón real `onOpenPublish` de `CoordinatorEmptyState` (ya no forzado); validación real + visual aprobadas por el usuario para el Sprint 3.5, y la apertura real desde el botón confirmada visualmente en el Sprint 3.6 (ver §0); `onPublish` sin lógica real, reportado sin corregir | Sprint 3.5 (+ integración real validada en Sprint 3.6) |
| Coordinator · Mis trabajos / Detalle (`mx-joblist`/`mx-detail-grid`/Timeline) | ⛔ No iniciado | Fase 4 |
| Coordinator · Calendario maestro (`mx-cal-*`) | ⛔ No iniciado | Fase 4 |
| Installer · Phone shell (`mx-phone`/`mx-phone-bar`/`mx-mesel`/`mx-phonetabs`) | ✅ Reconstruido (`PhoneFrame` + `MxPhoneTabs`), con primer consumidor real (`InstallerDashboard`) e integración temporal en `RootLayout` desde Sprint 3.10 (ver §0) | Fase 3 (estructura) + Sprint 3.10 (consumidor real) |
| Installer · Panel lateral (`mx-instside`: "Tu perfil" + "Reglas de prioridad") | ✅ Reconstruido íntegro (`InstallerSidebar`); desde el Sprint 3.10 vive en su posición estructural real, dentro de `InstallerDashboard`/`TwoColumnLayout` (ver §0) | Sprint 3.2 (+ 3.2.1 + 3.2.2) + Sprint 3.10 (integración real) |
| Installer · Solicitudes (Alert/Offer/Sent/Assigned/Lost/Declined/Closed) | 🟡 `CountRing` (✅ validado) y el estado vacío `mx-phone-empty` (✅ validado, vía `InstallerSolicitudesEmptyState`) reconstruidos, visibles temporalmente en `RootLayout` (ver §0); el resto de las pantallas (`mx-alert`/`mx-offer`/`mx-sentcard`/`mx-phone-done`, flujo real) sigue ⛔, depende de `job`/motor de trabajos real | Sprint 3.8 (`CountRing`) + Sprint 3.10 (estado vacío) / Fase 5 (resto) |
| Installer · Mis trabajos (`mx-myjobs`) | ⛔ No iniciado | Fase 5 |
| Installer · Perfil (`mx-profscreen`, pantalla completa dentro del teléfono) | ✅ Reconstruido (`InstallerProfile`), integrado desde el Sprint 3.11 dentro de `InstallerDashboard` (rama real `instTab === 'perfil'`); distinto de `mx-instside`, incluye su propia versión de 4 ítems de "Reglas de prioridad" — ver §6 | Sprint 3.11 |
| Admin · Instaladores (`mx-admingrid`/tabla/invitación) | ⛔ No iniciado | Fase 6 |
| Admin · Calendario maestro (reutiliza Coordinator) | ⛔ No iniciado | Fase 4/6 |

## 2. Componentes migrados esta fase

### `components/ui/` (27)

| Componente | Clase(s) `mx-*` portada(s) | Notas |
| --- | --- | --- |
| `Button` | `.mx-btn`, `.mx-btn-ice`, `.mx-btn-amber`, `.mx-btn-ghost` | variante `plain` es adición nueva; primer consumidor real: `CoordinatorEmptyState` (`variant="ice"`, Sprint 3.6) — antes solo se usaba la clase literal en `PublishModal` |
| `IconButton` | generaliza `.mx-back`/`.mx-modal-close` | adición nueva |
| `Card`/`CardHeader`/`CardBody`/`CardFooter` | `.mx-card`, `.mx-section-h` | Body/Footer son composición nueva, sin clase propia en el prototipo |
| `Badge` | `.mx-pill` | tonos vía prop, prototipo usaba `style` inline |
| `StatusBadge` | — | envoltorio semántico nuevo sobre Badge |
| `Avatar` | generaliza `.mx-logo`/`.mx-profava` | adición nueva (unifica dos usos duplicados) |
| `Chip` | `.mx-bidbtn`, `.mx-chip` (ver §6), `.mx-urg` | 3 variantes en un componente |
| `Input` | `.mx-input` (variante standalone de `.mx-fields input`, ver §6) | |
| `Textarea` | `.mx-textarea` | sin equivalente directo (prototipo no usa `<textarea>`) |
| `Select` | `.mx-select-native` (variante standalone de `.mx-fields select`) | `<select>` nativo, deliberado (ver ARCHITECTURE.md) |
| `Label` | `.mx-fields label` (tipografía) | sobre `@radix-ui/react-label` |
| `Checkbox` | — | adición nueva (Radix), sin equivalente en el prototipo |
| `Switch` | — | adición nueva (Radix); el toggle real del prototipo es `.mx-urg` (ver `Chip` variant="urg") |
| `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` | `.mx-subtabs*`, `.mx-phonetabs*` | sobre Radix, dos variantes |
| `Dialog`/`DialogTrigger`/`DialogPortal`/`DialogClose` | — | capa base sin estilo (Radix) |
| `Modal`/`ModalOverlay`/`ModalContent`/`ModalHeader` | reutiliza tokens de `.mx-card` | patrón centrado nuevo (ver §6) |
| `Drawer`/`DrawerOverlay`/`DrawerContent`/`DrawerHeader`/`DrawerBody` | `.mx-modal-bg`, `.mx-modal-panel`, `.mx-modal-hd`, `.mx-modal-close`, `.mx-modal-body` | bottom-sheet, ver §6 |
| `Tooltip`/`TooltipContent`/`TooltipProvider`/`TooltipTrigger` | — | adición nueva (Radix) |
| `DropdownMenu` (+Content/Item/Separator/Trigger/Portal) | — | adición nueva (Radix) |
| `Menu`/`MenuItem` | — | adición nueva, lista estática (no popover) |
| `SearchBox` | reutiliza `.mx-input` | adición nueva |
| `Separator` | — | adición nueva |
| `Spinner`/`Loading` | reutiliza `.animate-mx-spin`/`@keyframes mxspin` | ícono es adición sobre animación existente |
| `Skeleton` | — | adición nueva |
| `Progress` | — | adición nueva |
| `Counter` | `.mx-stat-v`/`.mx-stat-l`/`.mx-stat-s` | extraído de `.mx-stat` para reuso suelto |
| `Toast`/`ToastViewport` | — | **estructura solamente**, sin cola/hook/auto-dismiss (ver nota en el archivo) |
| `Notification` | generaliza `.mx-invite-ok`/`.mx-invite-note` | adición nueva |

### `components/shared/` (22)

| Componente | Clase(s) `mx-*` portada(s) | Fase/Sprint |
| --- | --- | --- |
| `Header` | `.mx-top`, `.mx-brand`, `.mx-logo`, `.mx-brand-t`, `.mx-brand-s`, `.mx-roleswitch`, `.mx-topright` | Fase 3 + Sprint 3.1 |
| `Footer` | `.mx-foot` | Fase 3 |
| `PageContainer`/`PageHead` | `.mx-page`, `.mx-pagehead`, `.mx-backbtn` | Fase 3 |
| `TwoColumnLayout` | `.mx-grid`/`.mx-col` (variant="despacho"), `.mx-instwrap` (variant="phone") | Fase 3 (primer consumidor real de `variant="phone"`: `InstallerDashboard`, Sprint 3.10) |
| `PhoneFrame` | `.mx-phone`, `.mx-phone-bar`, `.mx-dot`, `.mx-mesel` | Fase 3 (primer consumidor real: `InstallerDashboard`, Sprint 3.10) |
| `InstallerSidebar` | `.mx-instside` (contenedor) | Sprint 3.2 (reemplaza el `Sidebar` estructural de Fase 3) |
| `InstallerSidebarCard` | `.mx-card.mx-mini`, `.mx-section-h` | Sprint 3.2 (reemplaza el `SidebarCard` estructural de Fase 3) |
| `InstallerProfileSummary` | `.mx-profile` | Sprint 3.2 (nuevo, sin equivalente en Fase 3) |
| `InstallerPriorityRules` | `.mx-rules` (versión de 5 ítems, dentro de `mx-instside`) | Sprint 3.2 (nuevo, sin equivalente en Fase 3) |
| `StatTile`/`StatGrid` | `.mx-stats`, `.mx-stat` | Fase 3 |
| `EmptyState` | `.mx-empty`/`.mx-empty-ic` (compact), `.mx-qempty`/`.mx-qempty-ic` (page) | Fase 3 (primer consumidor real: `CoordinatorEmptyState`, Sprint 3.6) |
| `ConfirmDialog` | `.mx-confirm-bg`, `.mx-confirm-card`, `.mx-confirm-acts`, `.mx-confirm-no`, `.mx-confirm-yes` | Fase 3 |
| `ScrollArea` | — (adición nueva, ítem "Scroll Containers" del listado de Layout) | Fase 3 |
| `MxSubtabs` | `.mx-subtabs-wrap`, `.mx-subtabs` (contenedor) | Sprint 3.3 (nuevo; sin consumidor todavía, ver §0) |
| `MxSubtabButton` | `.mx-subtabs button` (+ `.on`) | Sprint 3.3 (nuevo; sin consumidor todavía, ver §0) |
| `SucursalSelect` | `.mx-suc-sel` (contenedor + `<label>` + `<select>`) | Sprint 3.4 (nuevo; componente controlado, sin `useState` interno) |
| `PublishModal` | `.mx-modal-bg`/`.mx-modal-panel`/`.mx-modal-hd`/`.mx-modal-close`/`.mx-modal-body` (vía `Drawer`) + `.mx-fields`/`.mx-f2`/`.mx-priceinput`/`.mx-datein`/`.mx-bidopts` | Sprint 3.5 (nuevo; primer consumidor real de `Drawer`, formulario completo con estado interno) |
| `CoordinatorEmptyState` | `.mx-qempty`/`.mx-qempty-ic` (vía `EmptyState`) + `.mx-btn`/`.mx-btn-ice` (vía `Button`) | Sprint 3.6 (nuevo; envoltorio delgado, primer consumidor real de `EmptyState` y de `Button`) |
| `Radar` | `.mx-radar-wrap`, `.mx-radar`, `.mx-sweep`, `.mx-ping`, `.mx-radar-legend` | Sprint 3.7 (nuevo; único componente SVG autocontenido, sin sub-componentes propios; integrado temporalmente en `RootLayout`, ver §0) |
| `CountRing` | ninguna (sin clases CSS propias, todo inline en el HTML fuente) | Sprint 3.8 (nuevo; función pura sin estado/efectos/timers propios; integrado temporalmente en `RootLayout` dentro de `role === 'instalador'`, ver §0) |
| `LiveCountdown` | ninguna (sin clases CSS propias, todo inline en el HTML fuente) | Sprint 3.9 (nuevo; `<span>` con `useState`+`useEffect`+`setInterval` propios, sin sub-componentes; integrado temporalmente en `RootLayout` dentro de `role === 'coordinador'`, ver §0) |
| `MxPhoneTabs` | `.mx-phonetabs` (contenedor) | Sprint 3.10 (nuevo; sin wrapper adicional, a diferencia de `MxSubtabs`; reutiliza `MxSubtabButton` para los botones, sin duplicar código) |
| `InstallerSolicitudesEmptyState` | `.mx-phone-empty` | Sprint 3.10 (nuevo; reconstruye la única rama de "Solicitudes" alcanzable sin motor de trabajos, mismo criterio que `CoordinatorEmptyState`) |
| `InstallerDashboard` | ninguna clase propia (orquesta `.mx-instwrap` vía `TwoColumnLayout`) | Sprint 3.10 (nuevo; sin función real homónima — equivalente al subconjunto reconstruible de `Installer(props)`; integrado temporalmente en `RootLayout` dentro de `role === 'instalador'`, reemplaza la integración de Sprint 3.2.1/3.2.2, ver §0). Desde el Sprint 3.11, su rama `instTab === 'perfil'` renderiza `InstallerProfile` (antes `null`) |
| `InstallerProfile` | `.mx-profscreen`, `.mx-profhero`, `.mx-profava`, `.mx-profname`, `.mx-profzone`, `.mx-profstats`, `.mx-profstat`, `.mx-profblock` | Sprint 3.11 (nuevo; función pura sin estado/efectos propios; entrega inicial integrada temporalmente como hermano de `InstallerDashboard` en `RootLayout`, ajuste posterior la mueve a la rama real `instTab === 'perfil'` de `InstallerDashboard`, ver §0) |

### `layouts/`

- `RootLayout.tsx` — equivalente de "AppShell": Header + `<Outlet/>` + Footer.

## 3. Componentes pendientes (por fase)

- **Fase 4 (Coordinator)**: JobCard (`mx-jobcard`), RoundsPanel, ResponsesFeed, AssignedPanel, NoResponsePanel, QueueBar, JobList/JobRow, JobDetail (+Timeline), MasterCalendar, badge master (`mx-master-badge`). Todos estos dependen de `jobs.length > 0` (estado real de `Trabajo`/`publishJob`), todavía inexistente — ver `docs/sprints/sprint-3.6.md`/`docs/sprints/sprint-3.7.md`. (Selector de sucursal, `mx-suc-sel`, ya migrado — Sprint 3.4; `PublishModal`, ya migrado — Sprint 3.5; estado vacío de `Coordinator`, `CoordinatorEmptyState`, ya migrado — Sprint 3.6; `Radar`, ya migrado — Sprint 3.7, integrado temporalmente hasta que exista la tarjeta real "Despacho en vivo"; `LiveCountdown`, ya migrado — Sprint 3.9, ✅ Completado, integrado temporalmente hasta que exista el `QueueBar` real — ver docs/sprints/sprint-3.9.md.)
- **Fase 5 (Installer)**: pantallas de "Solicitudes" (`mx-alert`/`mx-offer`/`mx-sentcard`/`mx-phone-done`, dependen de `job`/motor de trabajos real), "Mis trabajos" (`mx-myjobs`, reservado Sprint 3.12). `CountRing`, ya migrado — Sprint 3.8; `InstallerDashboard` (barra del teléfono, navegación, estado vacío de "Solicitudes"), ya migrado — Sprint 3.10; `InstallerProfile` (Perfil completo, `mx-profscreen`), ya migrado — Sprint 3.11, integrado dentro de la rama real `instTab === 'perfil'` de `InstallerDashboard`; los demás siguen integrados temporalmente en `RootLayout` hasta que exista el flujo real del Instalador.
- **Fase 5 (Installer)**: AlertScreen, OfferForm (+`DisponibilidadChips`), ResponseSentScreen, AssignedScreen (+`RevealCard`), LostScreen, DeclinedScreen, ClosedScreen, MisTrabajosList, PerfilScreen (pantalla completa `mx-profscreen`, con su propia versión de 4 ítems de "Reglas de prioridad" — decidir si reutiliza `InstallerPriorityRules` o crea `PriorityRulesCard`, ya reservado en `ARCHITECTURE.md` §3). Datos reales de `InstallerProfileSummary`/`InstallerSidebar` (ya existente desde Sprint 3.2) conectados vía hook futuro (`useMiPerfil`).
- **Fase 6 (Admin)**: InstallerTable/InstallerRow, InviteForm, reutilización de MasterCalendar.
- **Fase 7 (Auth)**: reemplazo del `useState<Rol>` local del Header/RootLayout por sesión real; eliminación del selector manual de instalador en `PhoneFrame` (`mx-mesel`).

## 4. Dependencias entre módulos

```
RootLayout (Fase 3)
 ├─ Header (Fase 3) ──requiere──> Rol real de Auth (Fase 7, hoy: useState local)
 ├─ <Outlet/> ──lo llenan──> páginas de Fase 4/5/6
 └─ Footer (Fase 3)

DespachoPage (Fase 4) ──usa──> TwoColumnLayout(variant="despacho"), Card, Button, Badge,
                                 StatTile/StatGrid, EmptyState(size="page"), ConfirmDialog,
                                 Chip(variant="bidbtn"/"urg"), Input/Select/Textarea, Modal|Drawer

SolicitudesPage (Fase 5) ──usa──> TwoColumnLayout(variant="phone"), PhoneFrame, InstallerSidebar,
                                    Tabs(variant="phonetabs"), Chip(variant="chip"), StatTile

InstaladoresPage (Fase 6) ──usa──> PageContainer/PageHead, SearchBox, Card, Badge/StatusBadge,
                                     Modal|Drawer (formulario de invitación), ConfirmDialog (suspender)

Todas las páginas de negocio (Fase 4/5/6) ──usan datos mock locales── hasta Fase 7 (Supabase)
                                            ──sin Realtime── hasta Fase 8
```

No hay dependencias circulares. `components/ui/` no depende de `components/shared/`; `components/shared/` compone `components/ui/` (`InstallerSidebarCard`→`Badge` implícito vía tokens de `.mx-card`, `PageHead`→`IconButton` implícito, etc.) y `layouts/` compone `components/shared/`. Las páginas de Fase 4/5/6 consumirán ambas capas sin necesidad de tocar Fase 3/Sprint 3.2.

## 5. Decisión documentada: selector de rol como placeholder

`ARCHITECTURE.md` §4 ya establecía la eliminación del selector manual de rol en favor de Auth real. Esta fase reconstruye `.mx-roleswitch` idéntico visual e interactivamente, respaldado por `useState<Rol>` en `RootLayout` (no por `AuthContext`, que sigue siendo el placeholder tipado de Fase 2). Se resuelve por secuenciación: Fase 7 sustituye el estado por la sesión real sin tocar la apariencia de `Header`. Mismo razonamiento aplica al selector `mx-mesel` de `PhoneFrame` (instalador activo), hoy controlado por props libres (`options`/`selected`/`onSelectedChange`) que la página de negocio alimentará con datos reales en su momento.

## 6. Observaciones sobre diferencias/adaptaciones detectadas

Ninguna de estas adaptaciones cambia la apariencia final — todas están comentadas en el archivo fuente correspondiente:

1. **Selectores descendientes → clases standalone.** `.mx-chips button`, `.mx-fields input`, `.mx-fields select` en el prototipo solo aplican anidados dentro de un contenedor exacto. Para que `Chip`/`Input`/`Select` sean componentes reutilizables fuera de ese contenedor, se agregaron `.mx-chip`, `.mx-input`, `.mx-select-native`, `.mx-textarea` con las mismas declaraciones. `.mx-fields`/`.mx-chips` se conservan intactos como wrappers de layout de formulario.
2. **`data-state="active"` vs `.on`.** `Tabs` se construyó sobre `@radix-ui/react-tabs`, que expone el estado activo vía el atributo `data-state` en vez de una clase `.on` manual. Se agregaron selectores `[data-state='active']` equivalentes en `.mx-subtabs`/`.mx-phonetabs`, conservando `.on` para el role-switch del Header (que sí usa estado manual, sin Radix).
3. **"Modal" del prototipo → `Drawer` en esta librería.** `.mx-modal-bg`/`.mx-modal-panel` (usado para "Publicar otro trabajo") es, en comportamiento, un bottom-sheet — se nombra `Drawer` aquí. El nombre `Modal` se reserva para un patrón centrado nuevo y genérico sin equivalente directo en el prototipo. Ambos nombres estaban pedidos explícitamente en el listado de componentes de esta fase.
4. **Variables de fuente elevadas a `:root`.** `--fd`/`--fb`/`--fm` vivían en la regla `body` del prototipo; se movieron a `:root` para estar disponibles también dentro de portales de Dialog/Drawer/Tooltip (que React renderiza fuera del árbol de `body` normal, vía `createPortal`, pero dentro del mismo documento — la extensión es inocua y no cambia ningún valor).
5. **Componentes nuevos sin equivalente en el prototipo**, documentados individualmente en su archivo: Checkbox, Switch, Tooltip, DropdownMenu, Menu, SearchBox, Separator, Skeleton, Progress, Toast, Notification, Modal, IconButton, Avatar (unifica `.mx-logo`/`.mx-profava` duplicados), Textarea, StatusBadge, ScrollArea.
6. **`CountRing`/`LiveCountdown` y los layouts por rol NO se crearon.** Aunque aparecían en la planificación interna previa a esta fase, tras revisar el alcance ("no Jobs/Radar/Timeline/lógica de negocio") se determinó que son feature-specific (countdown de rondas de bid, temporizador de trabajo activo) y se movieron a Fase 4/5 — ver `TODO.md`.
7. **`PhoneFrame` deja de ser puramente estructural desde el Sprint 3.10** — obtiene su primer consumidor real (`InstallerDashboard`), aunque su contenido (`children`/`tabs`) sigue alimentado por mocks/estado local, sin datos reales. **`Sidebar`/`SidebarCard`** (el par estructural de Fase 3, sin contenido real) **se reemplazó en el Sprint 3.2** por `InstallerSidebar`/`InstallerSidebarCard`/`InstallerProfileSummary`/`InstallerPriorityRules`, que sí reconstruyen el contenido real y literal de `mx-instside` — pero siguen sin datos reales conectados (los 4 valores de "Tu perfil" son props obligatorias sin fuente de datos todavía; ver §0 "Pendientes"). La conexión a datos reales del instalador autenticado sigue siendo trabajo de Fase 5/Supabase.
8. **`km` sin campo de dominio.** El indicador "km al trabajo" de `InstallerProfileSummary` no tiene columna equivalente en `usuarios` (schema SQL) ni en el tipo `Usuario` de `types/domain.ts` — en el prototipo vive solo en el mock `INSTALLERS`. Reportado como gap a resolver antes de conectar datos reales (¿se calcula en tiempo real con la ubicación del trabajo?, ¿se agrega una columna?) — no se modifica el schema, solo se reporta.
9. **Dos versiones de "Reglas de prioridad" en el HTML fuente.** `mx-instside` (`Installer()`, migrado en Sprint 3.2) tiene 5 ítems; `InstallerProfile()` (`mx-profblock`, pantalla completa de perfil, todavía no migrada) tiene solo 4 — le falta "No puedes aceptar dos trabajos con horarios en conflicto." No se unificaron ni se "corrigió" ninguna de las dos; cada una se migra tal cual le corresponda a su propio Sprint.

## 7. Cobertura estimada del HTML

**Metodología** (aproximada, no es un diff automatizado): se cuentan (a) los selectores de componente únicos `.mx-*` del CSS original portados vs. totales, y (b) la correspondencia estructural entre el JSX de referencia (`App()`, wrapper del Header, wrapper del PhoneFrame) y los componentes React creados. No se cuentan como "migrados" los ~1.800 líneas de lógica de negocio JS (`stepJobEngine`, `publishJob`, `selectInstaller`, datos mock `INSTALLERS`/`TRABAJOS`/`MISJOBS`/`REVEAL`/`SCRIPT`, etc.), que están intencionalmente fuera de esta fase.

| Métrica | Valor |
| --- | --- |
| Selectores `.mx-*` únicos en el CSS original | 199 |
| Selectores `.mx-*` únicos portados (acumulado tras Sprint 3.6) | 72 (36%) — sin cambio respecto a Sprint 3.5; `.mx-qempty`/`.mx-qempty-ic`/`.mx-btn`/`.mx-btn-ice` ya estaban portados desde Fase 3, cero CSS nuevo en este Sprint |
| Selectores `.mx-*` únicos portados (acumulado tras Sprint 3.7) | 77 (39%) — +5 nuevos: `.mx-radar-wrap`, `.mx-radar`, `.mx-sweep`, `.mx-ping`, `.mx-radar-legend` (las animaciones `@keyframes mxsweep`/`mxping` ya existían desde Fase 3; lo nuevo son las reglas de clase que las consumen) |
| Selectores `.mx-*` únicos portados (acumulado tras Sprint 3.8) | 77 (39%) — sin cambio; `CountRing` no usa ninguna clase `.mx-*` en el HTML fuente (todo inline) |
| Selectores `.mx-*` únicos portados (acumulado tras Sprint 3.9) | 77 (39%) — sin cambio; `LiveCountdown` tampoco usa ninguna clase `.mx-*` en el HTML fuente (todo inline) |
| Selectores `.mx-*` únicos portados (acumulado tras Sprint 3.10) | 78 (39%) — +1 nuevo: `.mx-phone-empty` (`svg`/`p`/`span` internos no cuentan como selectores de componente adicionales) |
| Selectores `.mx-*` únicos portados (acumulado tras Sprint 3.11) | 88 (44%) — +10 nuevos: `.mx-profscreen`, `.mx-profhero`, `.mx-profava`, `.mx-profname`, `.mx-profzone`, `.mx-profstats`, `.mx-profstat`, `.mx-profblock` (más `b`/`span`/`h4`/`h4 svg`, hijos de los anteriores, no cuentan como selectores de componente adicionales) |
| Líneas HTML original (referencia total) | 3.557 |
| Líneas de CSS original (`<style>` completo) | 454 |
| Líneas de la sección `mx-*` en `globals.css` (incl. comentarios) | 945 — sin cambio en Sprint 3.6 (cero CSS nuevo); +~14 en Sprint 3.7 (bloque `.mx-radar-*` + regla adicional de `prefers-reduced-motion` para clases crudas); sin cambio en Sprint 3.8 (cero CSS nuevo); sin cambio en Sprint 3.9 (cero CSS nuevo); +~31 en Sprint 3.10 (`.mx-phone-empty` + comentario explicativo); +~85 en Sprint 3.11 (bloque `.mx-prof*`, 12 reglas + comentario explicativo) |
| Líneas TSX/TS de componentes React de Fase 3 | 1.847 |
| Líneas TSX de componentes React creados en Sprint 3.2 | 197 (`installer-sidebar.tsx` + `installer-sidebar-card.tsx` + `installer-profile-summary.tsx` + `installer-priority-rules.tsx`) |
| Líneas TSX de componentes React creados en Sprint 3.3 | 83 (`mx-subtabs.tsx` + `mx-subtab-button.tsx`) |
| Líneas TSX de componentes React creados en Sprint 3.4 | 49 (`sucursal-select.tsx`) |
| Líneas TSX de componentes React creados en Sprint 3.5 | 262 (`publish-modal.tsx`) — el bloque JSX/formulario más grande migrado hasta ahora en un solo componente |
| Líneas TSX de componentes React creados en Sprint 3.6 | 35 (`coordinator-empty-state.tsx`) — envoltorio delgado, reutiliza `EmptyState`/`Button` de Fase 3 sin duplicar su markup |
| Líneas TSX de componentes React creados en Sprint 3.7 | 265 (`radar.tsx`) — único componente SVG autocontenido; no se crearon sub-componentes (la arquitectura multi-archivo sugerida en el brief no correspondía a nada real del HTML, ver `docs/sprints/sprint-3.7.md`) |
| Líneas TSX de componentes React creados en Sprint 3.8 | 88 (`countring.tsx`) — función pura, sin sub-componentes; +16 líneas en `src/lib/utils.ts` (reincorporación de `fmt`) |
| Líneas TSX de componentes React creados en Sprint 3.9 | 75 (`live-countdown.tsx`) — `<span>` con estado/efecto/timer propios, sin sub-componentes; +1 línea de JSDoc en `src/lib/utils.ts` (sin cambio de lógica) |
| Líneas TSX de componentes React creados en Sprint 3.10 | 196 (`installer-dashboard.tsx` 138 + `installer-solicitudes-empty-state.tsx` 32 + `mx-phone-tabs.tsx` 26) — orquestador + 2 componentes auxiliares; +~31 líneas en `globals.css` (`.mx-phone-empty`) |
| Líneas TSX de componentes React creados en Sprint 3.11 | 111 (`installer-profile.tsx`) — función pura, sin sub-componentes; +~85 líneas en `globals.css` (`.mx-prof*`); `installer-dashboard.tsx` +2 líneas (rama `instTab === 'perfil'` ya no renderiza `null`) |
| **Cobertura estimada del HTML (agregada, tras Sprint 3.6)** | **≈ 24%** (sin cambio perceptible — bloque pequeño, cero CSS nuevo) |
| **Cobertura estimada del HTML (agregada, tras Sprint 3.7)** | **≈ 25%** (+1 punto — bloque de tamaño medio: 254 líneas JSX fuente + 5 selectores CSS nuevos) |
| **Cobertura estimada del HTML (agregada, tras Sprint 3.8)** | **≈ 25%** (sin cambio perceptible — bloque pequeño, 55 líneas JSX fuente, cero CSS nuevo) |
| **Cobertura estimada del HTML (agregada, tras Sprint 3.9)** | **≈ 25%** (sin cambio perceptible — bloque pequeño, 21 líneas JSX fuente, cero CSS nuevo) |
| **Cobertura estimada del HTML (agregada, tras Sprint 3.10)** | **≈ 26%** (+1 punto — ~43 líneas JSX fuente reconstruidas de `Installer(props)` + primer consumidor real de `TwoColumnLayout`/`PhoneFrame`, ambos de Fase 3) |
| **Cobertura estimada del HTML (agregada, tras Sprint 3.11)** | **≈ 27%** (+1 punto — ~34 líneas JSX fuente de `InstallerProfile`/`.mx-profscreen` + 10 selectores CSS nuevos, con integración real dentro de `InstallerDashboard`) |

Nota: la cifra agregada se mantuvo en ≈24% (igual que al cierre del Sprint 3.5): el Sprint 3.6 migra solo 18 líneas de JSX fuente (`mx-qempty`) sin agregar CSS, un aporte real pero demasiado pequeño para mover la cifra redondeada. El Sprint 3.7 sí mueve la cifra a ≈25%: migra `Radar` (254 líneas de JSX fuente, líneas 1492-1745 del HTML) más 5 selectores CSS nuevos — un bloque autocontenido más grande que el de 3.6, aunque sigue siendo un único componente sin lógica de negocio ni datos reales (todo mock, integración temporal en `RootLayout`, ver §0). El Sprint 3.8 migra `CountRing` (55 líneas de JSX fuente, líneas 1437-1491 del HTML) sin agregar CSS — un aporte real pero demasiado pequeño para mover la cifra redondeada desde el ≈25% del Sprint 3.7. El Sprint 3.9 migra `LiveCountdown` (21 líneas de JSX fuente, líneas 2473-2493 del HTML) sin agregar CSS — el bloque más pequeño migrado hasta ahora, sin impacto perceptible en la cifra redondeada. El Sprint 3.10 migra ~43 líneas de JSX fuente de `Installer(props)` (barra del teléfono, navegación, estado vacío) más 1 selector CSS nuevo, y le da su primer consumidor real a `TwoColumnLayout`/`PhoneFrame` (Fase 3, sin uso hasta ahora) — mueve la cifra a ≈26%. El Sprint 3.11 migra `InstallerProfile` (~34 líneas de JSX fuente, líneas ~3491-3524 del HTML) más 10 selectores CSS nuevos (`.mx-prof*`), con integración real (no solo temporal) dentro de la rama `instTab === 'perfil'` de `InstallerDashboard` — mueve la cifra a ≈27%. Metodología igual de aproximada que en fases anteriores — no es un diff automatizado.

### Desglose por área (según formato solicitado)

- **Layout**: 90% — `RootLayout`, `PageContainer`, `TwoColumnLayout`, `ScrollArea` completos; solo faltan grillas feature-specific (`mx-admingrid`, `mx-detail-grid`) que pertenecen a sus módulos.
- **Header**: 95% — `.mx-top` reconstruido íntegro incl. role-switch; desde el Sprint 3.1, `HeaderStatus` ya reproduce las 3 ramas condicionales exactas del JSX fuente (badge master / pill de sucursal / botón "Reiniciar"), alimentadas por props con los valores por defecto exactos del prototipo. El 5% restante es exclusivamente la conexión a estado real de Coordinator (Sprint futuro), no lógica visual faltante.
- **`mx-instside` (panel lateral del Instalador)**: 100% — las dos tarjetas ("Tu perfil"/"Reglas de prioridad") reconstruidas íntegras desde el Sprint 3.2, incluyendo la lógica condicional/textos exactos. Sin datos reales conectados todavía (props obligatorias sin fuente — ver §0), pero eso es responsabilidad de Fase 5/Supabase, no de reconstrucción visual.
- **Navigation**: 95% — `mx-subtabs` (reconstruido en Sprint 3.3 vía `MxSubtabs`/`MxSubtabButton`, visible temporalmente en `RootLayout` para `role === 'coordinador'` — ver §0), `mx-phonetabs`, `mx-backbtn` completos en CSS; falta `mx-jobfilter`, la integración definitiva de `mx-subtabs` dentro de Coordinator/AdminPanel real, y la navegación interna de Admin.
- **`mx-suc-sel` (selector de sucursal activa)**: 100% en markup/CSS/componente (`SucursalSelect`, Sprint 3.4), visible temporalmente en `RootLayout` para `role === 'coordinador'` — ver §0. Pendiente: sincronización con el badge `sucursalActiva` de `HeaderStatus` (reportado, no corregido) e integración definitiva dentro de `layouts/CoordinatorLayout.tsx` cuando exista.
- **Componentes Compartidos**: 85% — los 27 componentes `ui/` solicitados están creados; resta ajuste fino cuando se conecten a datos reales. `Drawer` tiene ahora su primer consumidor real (`PublishModal`, Sprint 3.5).
- **Coordinator**: `mx-suc-sel` (100%, Sprint 3.4), `PublishModal` (100% en markup/CSS/componente, Sprint 3.5, ahora abierto mediante el botón real `onOpenPublish` desde Sprint 3.6), el estado vacío de `Coordinator` (`mx-qempty`, 100%, Sprint 3.6, vía `CoordinatorEmptyState`), `Radar` (100%, Sprint 3.7, vía `Radar` — único componente SVG, sin sub-componentes; integrado temporalmente en `RootLayout` para validación visual, ver §0) y `LiveCountdown` (100%, Sprint 3.9, ✅ completado, vía `LiveCountdown` — `<span>` con timer propio; integrado temporalmente en `RootLayout`, validación visual y funcional aprobadas, ver §0) ya reconstruidos; el resto (`mx-jobcard`, Rounds, Feed, QueueBar, JobList/JobDetail, MasterCalendar) sigue en 0% — depende de `jobs`/`Trabajo` real, ver `docs/sprints/sprint-3.7.md`. (`CountRing`, distinto de `LiveCountdown`, ya migrado en Sprint 3.8 — ver bullet "Installer" abajo, no pertenece a Coordinator.)
- **Installer**: `mx-instside` (100%, Sprint 3.2), el shell `PhoneFrame` (cuenta en "Layout"), `CountRing` (100%, Sprint 3.8), el estado vacío de "Solicitudes" + navegación del teléfono (100%, Sprint 3.10, vía `InstallerDashboard`/`InstallerSolicitudesEmptyState`/`MxPhoneTabs`) y el Perfil completo (100%, Sprint 3.11, vía `InstallerProfile`, incl. su propia versión de 4 ítems de "Reglas de prioridad", integrado dentro de la rama real `instTab === 'perfil'` de `InstallerDashboard`) ya reconstruidos; el resto (Solicitudes reales — `mx-alert`/`mx-offer`/`mx-sentcard`/`mx-phone-done` —, Mis trabajos — reservado Sprint 3.12) sigue en 0%.
- **Admin**: 0%
