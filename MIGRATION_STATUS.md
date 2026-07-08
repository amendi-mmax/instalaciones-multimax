# MIGRATION_STATUS.md — HANDYMAX · Multimax Despacho

Seguimiento **exclusivo** de la reconstrucción HTML→React de `Multimax_Despacho_v1.3.html` (3.557 líneas, referencia visual/UX oficial e inmodificable del proyecto). No sustituye a `PROJECT_STATUS.md` (estado general), `TODO.md` (checklist) ni `CHANGELOG.md` (registro de cambios) — se actualiza al final de cada fase con el detalle pantalla por pantalla y componente por componente.

Última actualización: 2026-07-07 — Sprint 3.2.2 (corrección de integración de `InstallerSidebar`).

Desde el Sprint 3.1, este archivo se actualiza al cierre de **cada Sprint** (no solo de cada Fase). El detalle de análisis previo + implementación de cada Sprint vive en `docs/sprints/sprint-X.Y.md`; el índice y estado de todos los Sprints planeados vive en `docs/SPRINTS_INDEX.md`. Desde el Sprint 3.2, cada Sprint se identifica por el bloque/selector real del HTML, no por un nombre genérico de sección.

## 0. Seguimiento del Sprint actual

- **Sprint actual**: 3.2 (sub-iteración 3.2.2 — corrección de la integración visual de 3.2.1, no una migración de HTML nueva)
- **Elemento migrado**: sin cambios respecto al Sprint 3.2 — `<aside class="mx-instside">` (panel lateral del Instalador: tarjetas "Tu perfil" y "Reglas de prioridad", líneas 3422–3449 del JSX fuente). 3.2.2 no migra HTML adicional; corrige cómo se integra visualmente el componente ya migrado (rol, ancho, contenedor) dentro de `RootLayout`.
- **Estado**: 🟡 En progreso — implementación y validación best-effort completas (incluida la corrección de integración de 3.2.2); pendiente que el usuario confirme en verde `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` para pasar a ✅ Completado (mismo criterio de Sprint 3.1.1).
- **Cobertura estimada del HTML**: sin cambios — `mx-instside` 100% (ver desglose en §7); agregado global del proyecto ≈19-20%. 3.2.2 no migra HTML, solo corrige la integración visual de lo ya migrado.
- **Componentes React creados**: ninguno nuevo en 3.2.2 (los 4 de `mx-instside` — `InstallerSidebar`, `InstallerSidebarCard`, `InstallerProfileSummary`, `InstallerPriorityRules` — se crearon en el Sprint 3.2 original, sin modificaciones en 3.2.1 ni en 3.2.2)
- **Componentes reutilizables**: ninguno nuevo
- **Archivos creados**: ninguno en 3.2.2
- **Archivos modificados (Sprint 3.2.2)**: `src/layouts/RootLayout.tsx` — único archivo modificado (verificado con `git diff --stat`). Se corrigieron 3 problemas de la integración de 3.2.1: (1) `InstallerSidebar` ahora solo se renderiza cuando `role === 'instalador'`; (2) se envuelve en `<div className="mx-instwrap">` (grid de 2 columnas ya portado desde Fase 3) para que ocupe solo su columna angosta (`minmax(240px,300px)`), no el 100% del ancho; (3) se agregó un "Phone Placeholder" (`<div/>` vacío, sin clase `.mx-phone`) como primera columna de `.mx-instwrap`, reservando el espacio para el futuro `layouts/InstallerLayout.tsx`, sin implementar ningún estilo/contenido de Phone. Ningún CSS nuevo — `.mx-instwrap` y su breakpoint ya estaban portados verbatim desde Fase 3.
- **Archivos eliminados**: ninguno en 3.2.2
- **Pendientes**: confirmación real del usuario (`npm install/lint/typecheck/build/dev` sobre `feature/sprint-3-2-mx-instside`, incluyendo ahora la corrección de 3.2.2); retirar la integración temporal de `RootLayout.tsx` (el `<div className="mx-instwrap">` + Phone Placeholder) cuando exista el Sprint de `layouts/InstallerLayout.tsx` real; `km` sin campo equivalente en `types/domain.ts`/schema SQL (ver §6); segunda versión de "Reglas de prioridad" (4 ítems, dentro de `InstallerProfile()`) sin Sprint asignado todavía — ver notas en `docs/SPRINTS_INDEX.md`

## 1. Estado de cada pantalla

| Pantalla / vista del prototipo | Estado | Fase responsable |
| --- | --- | --- |
| Shell raíz (`mx-top` + contenido + `mx-foot`) | ✅ Reconstruido (`RootLayout`) | Fase 3 |
| Header / role-switch (`mx-top`) | ✅ Reconstruido, fidelidad ajustada en Sprint 3.1 (ver §0) | Fase 3 + Sprint 3.1 |
| Coordinator · Despacho en vivo (`mx-grid`, JobCard, Radar, Rounds, Feed) | ⛔ No iniciado | Fase 4 |
| Coordinator · Publicar trabajo (`mx-publishwrap`/`PublishModal`) | ⛔ No iniciado (solo Input/Select/Chip genéricos listos) | Fase 4 |
| Coordinator · Mis trabajos / Detalle (`mx-joblist`/`mx-detail-grid`/Timeline) | ⛔ No iniciado | Fase 4 |
| Coordinator · Calendario maestro (`mx-cal-*`) | ⛔ No iniciado | Fase 4 |
| Installer · Phone shell (`mx-phone`/`mx-phone-bar`) | ✅ Reconstruido (`PhoneFrame`, estructural) | Fase 3 |
| Installer · Panel lateral (`mx-instside`: "Tu perfil" + "Reglas de prioridad") | ✅ Reconstruido íntegro (`InstallerSidebar`); visible temporalmente en `RootLayout` solo para `role === 'instalador'`, dentro de `.mx-instwrap` con espacio reservado para el Phone, desde Sprint 3.2.2 (ver §0) | Sprint 3.2 (+ 3.2.1 + 3.2.2) |
| Installer · Solicitudes (Alert/Offer/Sent/Assigned/Lost/Declined/Closed) | ⛔ No iniciado | Fase 5 |
| Installer · Mis trabajos (`mx-myjobs`) | ⛔ No iniciado | Fase 5 |
| Installer · Perfil (`mx-profscreen`, pantalla completa dentro del teléfono) | ⛔ No iniciado (distinto de `mx-instside`; incluye su propia versión de 4 ítems de "Reglas de prioridad" — ver §6) | Fase 5 |
| Admin · Instaladores (`mx-admingrid`/tabla/invitación) | ⛔ No iniciado | Fase 6 |
| Admin · Calendario maestro (reutiliza Coordinator) | ⛔ No iniciado | Fase 4/6 |

## 2. Componentes migrados esta fase

### `components/ui/` (27)

| Componente | Clase(s) `mx-*` portada(s) | Notas |
| --- | --- | --- |
| `Button` | `.mx-btn`, `.mx-btn-ice`, `.mx-btn-amber`, `.mx-btn-ghost` | variante `plain` es adición nueva |
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

### `components/shared/` (13)

| Componente | Clase(s) `mx-*` portada(s) | Fase/Sprint |
| --- | --- | --- |
| `Header` | `.mx-top`, `.mx-brand`, `.mx-logo`, `.mx-brand-t`, `.mx-brand-s`, `.mx-roleswitch`, `.mx-topright` | Fase 3 + Sprint 3.1 |
| `Footer` | `.mx-foot` | Fase 3 |
| `PageContainer`/`PageHead` | `.mx-page`, `.mx-pagehead`, `.mx-backbtn` | Fase 3 |
| `TwoColumnLayout` | `.mx-grid`/`.mx-col` (variant="despacho"), `.mx-instwrap` (variant="phone") | Fase 3 |
| `PhoneFrame` | `.mx-phone`, `.mx-phone-bar`, `.mx-dot`, `.mx-mesel` | Fase 3 |
| `InstallerSidebar` | `.mx-instside` (contenedor) | Sprint 3.2 (reemplaza el `Sidebar` estructural de Fase 3) |
| `InstallerSidebarCard` | `.mx-card.mx-mini`, `.mx-section-h` | Sprint 3.2 (reemplaza el `SidebarCard` estructural de Fase 3) |
| `InstallerProfileSummary` | `.mx-profile` | Sprint 3.2 (nuevo, sin equivalente en Fase 3) |
| `InstallerPriorityRules` | `.mx-rules` (versión de 5 ítems, dentro de `mx-instside`) | Sprint 3.2 (nuevo, sin equivalente en Fase 3) |
| `StatTile`/`StatGrid` | `.mx-stats`, `.mx-stat` | Fase 3 |
| `EmptyState` | `.mx-empty`/`.mx-empty-ic` (compact), `.mx-qempty`/`.mx-qempty-ic` (page) | Fase 3 |
| `ConfirmDialog` | `.mx-confirm-bg`, `.mx-confirm-card`, `.mx-confirm-acts`, `.mx-confirm-no`, `.mx-confirm-yes` | Fase 3 |
| `ScrollArea` | — (adición nueva, ítem "Scroll Containers" del listado de Layout) | Fase 3 |

### `layouts/`

- `RootLayout.tsx` — equivalente de "AppShell": Header + `<Outlet/>` + Footer.

## 3. Componentes pendientes (por fase)

- **Fase 4 (Coordinator)**: JobCard, RadarPanel (+`CountRing`), RoundsPanel, ResponsesFeed, AssignedPanel, NoResponsePanel, PublishModal (formulario completo con RHF+Zod), QueueBar, JobList/JobRow, JobDetail (+Timeline), MasterCalendar, `LiveCountdown`, selector de sucursal (`mx-suc-sel`), badge master (`mx-master-badge`).
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
7. **`PhoneFrame` sigue siendo estructural, no funcional** (sin cambios este Sprint). **`Sidebar`/`SidebarCard`** (el par estructural de Fase 3, sin contenido real) **se reemplazó en el Sprint 3.2** por `InstallerSidebar`/`InstallerSidebarCard`/`InstallerProfileSummary`/`InstallerPriorityRules`, que sí reconstruyen el contenido real y literal de `mx-instside` — pero siguen sin datos reales conectados (los 4 valores de "Tu perfil" son props obligatorias sin fuente de datos todavía; ver §0 "Pendientes"). La conexión a datos reales del instalador autenticado sigue siendo trabajo de Fase 5/Supabase.
8. **`km` sin campo de dominio.** El indicador "km al trabajo" de `InstallerProfileSummary` no tiene columna equivalente en `usuarios` (schema SQL) ni en el tipo `Usuario` de `types/domain.ts` — en el prototipo vive solo en el mock `INSTALLERS`. Reportado como gap a resolver antes de conectar datos reales (¿se calcula en tiempo real con la ubicación del trabajo?, ¿se agrega una columna?) — no se modifica el schema, solo se reporta.
9. **Dos versiones de "Reglas de prioridad" en el HTML fuente.** `mx-instside` (`Installer()`, migrado en Sprint 3.2) tiene 5 ítems; `InstallerProfile()` (`mx-profblock`, pantalla completa de perfil, todavía no migrada) tiene solo 4 — le falta "No puedes aceptar dos trabajos con horarios en conflicto." No se unificaron ni se "corrigió" ninguna de las dos; cada una se migra tal cual le corresponda a su propio Sprint.

## 7. Cobertura estimada del HTML

**Metodología** (aproximada, no es un diff automatizado): se cuentan (a) los selectores de componente únicos `.mx-*` del CSS original portados vs. totales, y (b) la correspondencia estructural entre el JSX de referencia (`App()`, wrapper del Header, wrapper del PhoneFrame) y los componentes React creados. No se cuentan como "migrados" los ~1.800 líneas de lógica de negocio JS (`stepJobEngine`, `publishJob`, `selectInstaller`, datos mock `INSTALLERS`/`TRABAJOS`/`MISJOBS`/`REVEAL`/`SCRIPT`, etc.), que están intencionalmente fuera de esta fase.

| Métrica | Valor |
| --- | --- |
| Selectores `.mx-*` únicos en el CSS original | 199 |
| Selectores `.mx-*` únicos portados (acumulado tras Sprint 3.2) | 69 (35%) — +1 (`.mx-starc`) sobre los 68 de Fase 3/Sprint 3.1 |
| Líneas HTML original (referencia total) | 3.557 |
| Líneas de CSS original (`<style>` completo) | 454 |
| Líneas de la sección `mx-*` en `globals.css` (incl. comentarios) | 858 (852 de Fase 3 + 6 de `.mx-starc` en Sprint 3.2) |
| Líneas TSX/TS de componentes React de Fase 3 | 1.847 |
| Líneas TSX de componentes React creados en Sprint 3.2 | 197 (`installer-sidebar.tsx` + `installer-sidebar-card.tsx` + `installer-profile-summary.tsx` + `installer-priority-rules.tsx`) |
| **Cobertura estimada del HTML (agregada, tras Sprint 3.2)** | **≈ 20%** |

Nota: la cifra agregada sube de ≈19% (cierre de Sprint 3.1) a ≈20% por el contenido real de `mx-instside` migrado en Sprint 3.2 (antes solo tenía shell estructural) más la clase `.mx-starc` agregada. Metodología igual de aproximada que en fases anteriores — no es un diff automatizado.

### Desglose por área (según formato solicitado)

- **Layout**: 90% — `RootLayout`, `PageContainer`, `TwoColumnLayout`, `ScrollArea` completos; solo faltan grillas feature-specific (`mx-admingrid`, `mx-detail-grid`) que pertenecen a sus módulos.
- **Header**: 95% — `.mx-top` reconstruido íntegro incl. role-switch; desde el Sprint 3.1, `HeaderStatus` ya reproduce las 3 ramas condicionales exactas del JSX fuente (badge master / pill de sucursal / botón "Reiniciar"), alimentadas por props con los valores por defecto exactos del prototipo. El 5% restante es exclusivamente la conexión a estado real de Coordinator (Sprint futuro), no lógica visual faltante.
- **`mx-instside` (panel lateral del Instalador)**: 100% — las dos tarjetas ("Tu perfil"/"Reglas de prioridad") reconstruidas íntegras desde el Sprint 3.2, incluyendo la lógica condicional/textos exactos. Sin datos reales conectados todavía (props obligatorias sin fuente — ver §0), pero eso es responsabilidad de Fase 5/Supabase, no de reconstrucción visual.
- **Navigation**: 90% — `mx-subtabs`, `mx-phonetabs`, `mx-backbtn` completos; falta `mx-jobfilter` y la navegación interna de Admin.
- **Componentes Compartidos**: 85% — los 27 componentes `ui/` solicitados están creados; resta ajuste fino cuando se conecten a datos reales.
- **Coordinator**: 0%
- **Installer**: `mx-instside` (100%, Sprint 3.2) y el shell `PhoneFrame` (cuenta en "Layout") ya reconstruidos; el resto (Solicitudes, Mis trabajos, Perfil completo — incl. su propia versión de 4 ítems de "Reglas de prioridad") sigue en 0%.
- **Admin**: 0%
