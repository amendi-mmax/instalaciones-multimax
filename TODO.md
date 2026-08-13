# TODO.md — HANDYMAX · Multimax Despacho

Checklist vivo. **Desde el Sprint 3.1, el checklist activo para el trabajo restante es `docs/SPRINTS_INDEX.md`** (Sprints 3.1–3.16, uno por sección del HTML, cada uno con su propia rama Git y su `docs/sprints/sprint-X.Y.md`). Las secciones "Fase 4" en adelante de este archivo quedan como **registro histórico** de la planificación previa a la metodología de Sprints — no se marcan como completadas aquí; su trabajo real se rastrea Sprint a Sprint en `docs/SPRINTS_INDEX.md`.

1. Fase 2 — Scaffold del proyecto ✅
2. Fase 3 — Layout general / Navegación / Header / Sidebar / Componentes compartidos ✅ (pendiente validación local)
3. **Sprint 3.1 — Header ✅** (pendiente validación local — ver `docs/sprints/sprint-3.1.md`)
4. **Sprint 3.2 — `mx-instside` 🟡** (pendiente validación local — ver `docs/sprints/sprint-3.2.md`)
5. **Sprint 3.3 — `mx-subtabs` ✅** (validación local + visual aprobadas — ver `docs/sprints/sprint-3.3.md`)
6. **Sprint 3.4 — `mx-suc-sel` ✅** (validación local + visual aprobadas — ver `docs/sprints/sprint-3.4.md`)
7. **Sprint 3.5 — `PublishModal` ✅** (validación local + visual aprobadas — ver `docs/sprints/sprint-3.5.md`)
8. **Sprint 3.6 — `CoordinatorEmptyState` ✅** (validación local + visual aprobadas — ver `docs/sprints/sprint-3.6.md`)
9. **Sprint 3.7 — `Radar` ✅** (validación local + visual aprobadas — ver `docs/sprints/sprint-3.7.md`)
10. **Sprint 3.8 — `CountRing` ✅** (validación local + visual aprobadas — ver `docs/sprints/sprint-3.8.md`)
11. **Sprint 3.9 — `LiveCountdown` ✅** (validación local + visual + funcional aprobadas — ver `docs/sprints/sprint-3.9.md`)
12. **Sprint 3.10 — `InstallerDashboard` ✅** (validación local + visual aprobadas — ver `docs/sprints/sprint-3.10.md`)
13. **Sprint 3.11 — `InstallerProfile` ✅** (validación local + visual aprobadas, incluido el ajuste de punto de integración — ver `docs/sprints/sprint-3.11.md`)
14. **Sprint 3.12 — `InstallerJobs` ✅** (validación local + visual + funcional aprobadas — ver `docs/sprints/sprint-3.12.md`)
15. **Sprint 3.13 — `AdminPanel`/`AdminInstaladores` ✅** (validación local + visual + funcional aprobadas — ver `docs/sprints/sprint-3.13.md`)
16. **Sprint 3.14 — `MasterCalendar` ✅** (validación local + visual + funcional aprobadas — ver `docs/sprints/sprint-3.14.md`)
17. **Sprint 3.15 — `ConfirmCancel` (nombre real; "Shared Dialogs" era el nombre genérico del brief) 🟡 En revisión** — implementado, pendiente de validación técnica/visual/funcional del usuario — ver `docs/sprints/sprint-3.15.md`
18. Sprint 3.16 — ver `docs/SPRINTS_INDEX.md`
5. (Futuro, a re-planificar en Sprints) Integración completa con Supabase, Realtime, eliminación de datos mock, pruebas finales

## Fase 1 — Arquitectura (completada)

- [x] Análisis completo de los tres archivos fuente.
- [x] `ARCHITECTURE.md`, `PROJECT_STATUS.md`, `TODO.md`, `CHANGELOG.md`.
- [ ] **Decisiones pendientes de confirmación del usuario** (no bloquean Fases 2–6, sí bloquean Fase 7/8):
  - [ ] ¿Existe el concepto de "coordinador master"? ¿Cómo se identifica sin tocar RLS?
  - [ ] ¿Se agregan columnas `fecha_sugerida`/`hora_sugerida`/`extra`/`urgente`/`assigned_at` a `trabajos`?
  - [ ] ¿Se aprueba la función `seleccionar_instalador(trabajo_id, bid_id)`?
  - [ ] ¿Se aprueba el trigger de vínculo `usuarios.auth_id` ↔ `auth.users`?
- [ ] Rotar `service_role` key en Supabase Dashboard (acción del usuario).

## Fase 2 — Scaffold del proyecto (completada, con una salvedad)

- [x] `package.json` con React, Vite, TypeScript, Tailwind, shadcn/ui (config), React Router, TanStack Query, React Hook Form, Zod, `@hookform/resolvers`, Lucide React, Supabase JS Client, ESLint, Prettier.
- [x] `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` con alias `@/`.
- [x] `vite.config.ts` con alias `@/`.
- [x] `tailwind.config.ts` + `postcss.config.js` + `components.json` (shadcn).
- [x] `eslint.config.js` (flat config) + `.prettierrc.json` + `.prettierignore`.
- [x] `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` vacíos).
- [x] Estructura completa de `src/` según `ARCHITECTURE.md` §3.
- [x] Archivos base: `main.tsx`, `App.tsx`, `routes/AppRouter.tsx`, `contexts/AuthContext.tsx`, `supabase/client.ts`, `styles/globals.css`, `types/database.ts`, `types/domain.ts`, `types/enums.ts`, `lib/mappers.ts`, `constants/index.ts`.
- [x] `supabase/migrations/0001_initial_schema.sql` copiado sin modificar (verificado con `diff`).
- [ ] **Pendiente: ejecutar `npm install && npm run lint && npm run typecheck && npm run build && npm run dev` reales.** Bloqueado en esta sesión por política de red (`registry.npmjs.org` no está en el *allowlist* del entorno). Ver `PROJECT_STATUS.md` → "Problema encontrado — bloqueo de red" para el detalle y cómo desbloquearlo. Se hizo una validación estática best-effort (tsc/prettier ya presentes en el entorno) que no encontró errores de código, pero no reemplaza la validación real pedida.

## Fase 3 — Layout general / Navegación / Header / Sidebar / Componentes compartidos (completada, ver validación pendiente)

- [x] `RootLayout.tsx` (equivalente de "AppShell": Header + `<Outlet/>` + Footer).
- [x] `Header` (mx-top/mx-brand/mx-roleswitch/mx-topright), `Footer` (mx-foot).
- [x] `PageContainer`/`PageHead` (mx-page/mx-pagehead/mx-backbtn), `TwoColumnLayout` (mx-grid + mx-instwrap), `ScrollArea` (nuevo, "Scroll Containers").
- [x] `PhoneFrame` (mx-phone/mx-phone-bar/mx-dot/mx-mesel) + `Sidebar`/`SidebarCard` (mx-instside/mx-mini).
- [x] Componentes compartidos: `StatTile`/`StatGrid` (mx-stats), `EmptyState` (mx-empty/mx-qempty), `ConfirmDialog` (mx-confirm-\*).
- [x] Librería `components/ui/`: Button, IconButton, Card(+Header/Body/Footer), Badge, StatusBadge, Avatar, Chip, Input, Textarea, Select, Label, Checkbox, Switch, Tabs, Dialog, Modal, Drawer, Tooltip, DropdownMenu, Menu, SearchBox, Separator, Spinner/Loading, Skeleton, Progress, Counter, Toast (estructura), Notification.
- [x] Migración de las clases `mx-*` de layout/navegación/compartidos a `globals.css` (verbatim). Las específicas de Coordinator/Installer/Admin quedan pendientes — ver `MIGRATION_STATUS.md`.
- [x] `LayoutShowcasePage` (temporal, no-feature) + `AppRouter` actualizado con `RootLayout`.
- [x] **NO** se crearon `CoordinatorLayout.tsx`/`AdminLayout.tsx`/`InstallerLayout.tsx` ni `CountRing`/`LiveCountdown` — son feature-specific (Jobs/Radar/Timeline) y quedaron fuera de alcance por instrucción explícita de esta fase. Se mueven a Fase 4/5 abajo.
- [ ] No se usó `npx shadcn add ...` (bloqueo de red, igual que Fase 2) — los componentes `ui/` se construyeron a mano replicando exactamente lo que esa CLI habría generado, sobre los primitivos Radix ya declarados en Fase 2.
- [ ] **Pendiente: ejecutar `npm run lint && npm run typecheck && npm run build && npm run dev` reales** sobre el código de esta fase. Ver `PROJECT_STATUS.md`.
- [x] `LayoutShowcasePage.tsx` (vitrina temporal de esta fase) **eliminada en el Sprint 3.1** por incompatible con la nueva regla "no crear una vitrina de componentes" — ver Sprint 3.1 abajo.

## Sprint 3.1 — Header (completada, ver validación pendiente)

Primer Sprint bajo la nueva metodología incremental (ver nota al inicio de este archivo y `docs/SPRINTS_INDEX.md`). Detalle completo del análisis y la implementación en `docs/sprints/sprint-3.1.md`.

- [x] Análisis previo obligatorio del bloque `<header className="mx-top">` (líneas 2029–2071 del JSX fuente) antes de escribir código.
- [x] `HeaderBrand` (`.mx-brand`/`.mx-logo`/`.mx-brand-t`/`.mx-brand-s`), `HeaderRoleSwitch` (`.mx-roleswitch`, 3 botones), `HeaderStatus` (`.mx-topright`, 3 ramas condicionales) — componentes nuevos, todos en uso inmediato dentro de `Header`.
- [x] `Header` reescrito para componer los tres anteriores; eliminado el prop `rightSlot` (placeholder de Fase 3).
- [x] `RootLayout.tsx`/`AppRouter.tsx` actualizados en consecuencia; `LayoutShowcasePage.tsx` y su ruta eliminadas.
- [x] Corrección de fidelidad: ícono `RadioTower` → `Radio` (verificado contra el JSX fuente y el SVG del snapshot del HTML).
- [x] Discrepancia snapshot-vs-código-fuente del HTML detectada y **reportada sin corregir** (ver `docs/sprints/sprint-3.1.md` → "Problema encontrado").
- [x] Validación best-effort (`tsc --noEmit` con stubs + `prettier --check`) — ver `docs/sprints/sprint-3.1.md` → "Pruebas realizadas".
- [ ] **Pendiente: validación real del usuario** (`npm install/lint/typecheck/build/dev`) sobre `feature/sprint-3-1-header`.
- [ ] **Detenido a propósito**: no se avanza a Sprint 3.2 sin aprobación explícita del usuario.

## Sprint 3.2 — `mx-instside` (en progreso, ver validación pendiente)

Desde este Sprint, cada Sprint se identifica por el bloque/selector real del HTML, no por un nombre genérico. Detalle completo en `docs/sprints/sprint-3.2.md`.

- [x] Análisis previo obligatorio del bloque `<aside className="mx-instside">` (líneas 3422–3449 del JSX fuente) antes de escribir código.
- [x] `InstallerSidebar` (compone todo el bloque), `InstallerSidebarCard` (envoltorio `.mx-card.mx-mini` compartido), `InstallerProfileSummary` (`.mx-profile`), `InstallerPriorityRules` (`.mx-rules`, versión de 5 ítems) — componentes nuevos, reemplazan el `Sidebar`/`SidebarCard` estructural de Fase 3 (sin contenido real).
- [x] Evitado a propósito el nombre `InstallerProfile` para la tarjeta "Tu perfil" (colisión con la función `InstallerProfile()` del HTML, reservada para `pages/installer/PerfilPage.tsx` en un Sprint futuro).
- [x] Corrección de fidelidad: clase `.mx-starc` (faltaba en `globals.css` desde Fase 3) agregada verbatim.
- [x] Inconsistencia real del HTML detectada y **reportada sin corregir**: "Reglas de prioridad" tiene 5 ítems en `mx-instside` (migrados aquí) y 4 ítems en `InstallerProfile()` (fuera de alcance) — ver `docs/sprints/sprint-3.2.md` → "Problemas encontrados".
- [x] Validación best-effort (`tsc --noEmit` con stubs + `prettier --check`, más verificación de fidelidad de espaciado JSX transpilando un fragmento aislado) — ver `docs/sprints/sprint-3.2.md` → "Validaciones ejecutadas".
- [ ] **Pendiente: validación real del usuario** (`npm install/lint/typecheck/build/dev`) sobre `feature/sprint-3-2-mx-instside`.
- [ ] **Detenido a propósito**: no se avanza a Sprint 3.3 sin aprobación explícita del usuario.

## Sprint 3.3 — `mx-subtabs` (completado ✅)

Migra exclusivamente `.mx-subtabs-wrap`/`.mx-subtabs` (contenedor + botones de sub-navegación), reutilizado dos veces en el HTML fuente (Coordinator: "Despacho en vivo"/"Mis trabajos"; AdminPanel: "Calendario maestro"/"Instaladores"). Detalle completo en `docs/sprints/sprint-3.3.md`.

- [x] Análisis previo obligatorio de ambas instancias reales de `mx-subtabs` (líneas 2079–2095 y 3032–3047 del JSX fuente) antes de escribir código.
- [x] `MxSubtabs` (contenedor `.mx-subtabs-wrap > .mx-subtabs`), `MxSubtabButton` (botón plano con `className` condicional `on`/inactivo) — componentes nuevos, puramente presentacionales (sin `useState` interno, sin lógica de navegación).
- [x] Confirmado que `.mx-subtabs-wrap`/`.mx-subtabs` ya estaban portadas verbatim en `globals.css` desde Fase 3 — cero cambios de CSS necesarios en este Sprint.
- [x] Detectado y **reportado sin corregir**: `mx-subtabs` tiene 2 instancias reales (Coordinator, AdminPanel), ninguna de las dos pantallas existe todavía — `MxSubtabs`/`MxSubtabButton` no se integran en ninguna página en este Sprint (mismo criterio que `InstallerSidebar` en Sprint 3.2 antes de la sub-iteración 3.2.1). Ver `docs/sprints/sprint-3.3.md` → "Problema encontrado".
- [x] Detectada y **reportada sin resolver**: posible duplicación futura entre `ui/Tabs` (Fase 3, Radix, sin consumidores) y `MxSubtabs`/`MxSubtabButton` (este Sprint, markup plano) — no se elimina ni se modifica `ui/tabs.tsx`.
- [x] Validación best-effort (`tsc --noEmit` con stubs + `prettier --check`) — ver `docs/sprints/sprint-3.3.md` → "Validaciones ejecutadas".
- [x] Validación real del usuario confirmada en verde (`npm run lint`/`typecheck`/`build`/`dev`) — pero detectó que el componente no se veía renderizado en pantalla.
- [x] **Corregido**: fix de integración visual (2026-07-08) — `MxSubtabs` ahora se renderiza en `RootLayout.tsx` cuando `role === 'coordinador'`, en la posición exacta del HTML fuente (primer elemento de la rama Coordinator). Sin lógica/eventos/datos reales agregados; `MxSubtabs`/`MxSubtabButton` no se modificaron. Ver `docs/sprints/sprint-3.3.md` → "Corrección — Fix de integración visual".
- [x] **Re-validación real del usuario confirmada en verde** (`npm run lint`/`typecheck`/`build`/`dev`) tras el fix, más verificación visual directa en el navegador — `mx-subtabs` es visible y coincide con el HTML fuente.
- [x] **Sprint 3.3 cerrado formalmente (✅ Completado)**. Sin pendientes técnicos.
- [ ] **Detenido a propósito**: no se avanza a Sprint 3.4 sin aprobación explícita del usuario.

## Sprint 3.4 — `mx-suc-sel` (completado ✅)

Migra exclusivamente `<div class="mx-suc-sel">` (selector de sucursal activa), líneas 2071-2079 del JSX fuente, hermano de `.mx-subtabs-wrap` (migrado en Sprint 3.3) dentro de la misma rama `role === "coord"` de `App()`. Detalle completo en `docs/sprints/sprint-3.4.md`.

- [x] Análisis previo obligatorio: se descartó explícitamente el nombre genérico "Main Layout" (placeholder original de `docs/SPRINTS_INDEX.md`) tras confirmar que `.mx-grid`/`.mx-col` ya estaban migrados en Fase 3 (`TwoColumnLayout`); se determinó por inspección directa del HTML/CSS que el bloque real pendiente es `.mx-suc-sel`.
- [x] `SucursalSelect` (`src/components/shared/sucursal-select.tsx`) — componente controlado (`value`/`onChange`, sin `useState` interno), mismo patrón que `role` en `RootLayout`.
- [x] Constante `SUCURSALES` agregada a `src/constants/index.ts` (lista verbatim del HTML fuente, línea 1116 — no es dato mock de negocio).
- [x] Bloque CSS `.mx-suc-sel` agregado a `globals.css` verbatim (líneas 412-415 del `<style>` original); no existía antes de este Sprint.
- [x] Integrado visualmente desde el primer commit del Sprint en `RootLayout.tsx`, como primer hijo del `<div>` anónimo que ya contenía `MxSubtabs` (Sprint 3.3), cuando `role === 'coordinador'` — respeta el orden exacto del HTML fuente (`mx-suc-sel` antes de `mx-subtabs`).
- [x] Detectado y **reportado sin corregir**: `HeaderStatus.sucursalActiva` (badge del Header) queda desincronizado del nuevo `sucursalCoord` real, porque pasar el prop a `Header` está fuera del alcance mínimo permitido ("no modificar Header"). Ver `docs/sprints/sprint-3.4.md` → "Problema encontrado".
- [x] Validación best-effort (`tsc --noEmit` con stubs + `prettier --check`) — ver `docs/sprints/sprint-3.4.md` → "Validaciones ejecutadas". Nota transparente: se detectó y corrigió un intento accidental de `prettier --write` sobre todo `globals.css` (revertido con `git checkout --`, solo se re-aplicó a mano el bloque nuevo).
- [x] Validación real del usuario confirmada en verde (`npm run lint`/`typecheck`/`build`/`dev`) sobre `feature/sprint-3-4-mx-suc-sel`.
- [x] Validación visual del usuario confirmada — `SucursalSelect` aparece en la posición correcta y coincide con el HTML oficial.
- [x] **Sprint 3.4 cerrado formalmente (✅ Completado)**. Sin pendientes técnicos.
- [ ] **Detenido a propósito**: no se avanza a Sprint 3.5 sin aprobación explícita del usuario.

## Sprint 3.5 — `PublishModal` (completado ✅)

Migra exclusivamente la función `PublishModal({ sucursal, onPublish, onClose })` (líneas 2496-2631 del JSX fuente) — `.mx-modal-bg`/`.mx-modal-panel`/`.mx-modal-hd`/`.mx-modal-close`/`.mx-modal-body` + el formulario `.mx-fields` completo. Detalle completo en `docs/sprints/sprint-3.5.md`.

- [x] Análisis previo obligatorio: se verificó que el nombre genérico "Publish Modal" de `docs/SPRINTS_INDEX.md` sí corresponde al bloque real (función `PublishModal` confirmada en el propio script) — a diferencia del Sprint 3.4, no hubo que corregir el nombre. Se descartó un snapshot DOM obsoleto (`.mx-publishwrap`/`.mx-publish`) que no aparece en ningún `React.createElement` del script vigente.
- [x] `PublishModal` (`src/components/shared/publish-modal.tsx`) — reutiliza `Drawer` (Fase 3, primer consumidor real), `Select`, `Input`, `Chip` (`urg`/`bidbtn`), `DialogPortal`; estado del formulario interno al componente, igual que en el HTML fuente.
- [x] Constantes `PROVINCIAS`, `ZONAS`, `BID_OPTIONS` (+ `BidOption`), `buildTimeSlots`/`SLOTS_COORD` agregadas a `src/constants/index.ts` (verbatim del HTML fuente — no son mocks de negocio).
- [x] Bloque CSS `.mx-priceinput`/`.mx-datein` agregado a `globals.css` verbatim; no existía antes de este Sprint.
- [x] Integrado visualmente desde el primer commit del Sprint en `RootLayout.tsx`, como hermano de los bloques de `role` ya migrados, justo antes de `<Outlet/>` — mismo orden relativo que en `App()`. Nuevo estado `showPublishModal`/`setShowPublishModal`, forzado a `true` temporalmente para visibilidad inmediata (documentado como decisión temporal).
- [x] Detectado y **reportado sin corregir**: el botón "Publicar trabajo" no ejecuta ninguna lógica real (`onPublish` es una función vacía) — no existe todavía ningún `TRABAJOS`/lista de trabajos (Sprint futuro de Job Cards). Ver `docs/sprints/sprint-3.5.md` → "Problema encontrado".
- [x] Validación best-effort (`tsc --noEmit` con stubs + `prettier --check`) — ver `docs/sprints/sprint-3.5.md` → "Validaciones ejecutadas". Nota transparente: se detectó y corrigió manualmente una limitación de los stubs ambientales (colapsan tipos de React a `any`, ocultando un error real de indexado estricto en `ZONAS`).
- [x] Validación real del usuario confirmada en verde (`npm run lint`/`typecheck`/`build`/`dev`) sobre `feature/sprint-3-5-publish-modal`.
- [x] Validación visual del usuario confirmada — `PublishModal` coincide con el HTML oficial, sin diferencias visuales importantes; la integración temporal `showPublishModal=true` queda aprobada hasta que exista `Coordinator`/`QueueBar`.
- [x] **Sprint 3.5 cerrado formalmente (✅ Completado)**. Sin pendientes técnicos.
- [ ] **Detenido a propósito**: no se avanza a Sprint 3.6 sin aprobación explícita del usuario.

## Sprint 3.6 — `CoordinatorEmptyState` (completado ✅)

Migra exclusivamente el estado vacío de `function Coordinator(props)` (`if (jobs.length === 0) return <div className="mx-qempty">...`, líneas 2146-2163 del JSX fuente). Detalle completo en `docs/sprints/sprint-3.6.md`.

- [x] Análisis previo obligatorio: se descartó explícitamente el nombre genérico "Job Cards" (placeholder original de `docs/SPRINTS_INDEX.md`) tras leer el cuerpo completo de `Coordinator(props)` (líneas 2132-2423) y confirmar que todo su contenido salvo el estado vacío depende de `jobs.length > 0` — y que `jobs` arranca en `[]` sin ningún seed/mock en el HTML fuente.
- [x] `CoordinatorEmptyState` (`src/components/shared/coordinator-empty-state.tsx`) — reutiliza `EmptyState` (`size="page"`) y `Button` (`variant="ice"`), ambos de Fase 3, sin consumidor real hasta este Sprint.
- [x] Cero CSS nuevo: `.mx-qempty`/`.mx-qempty-ic`/`.mx-btn`/`.mx-btn-ice` ya estaban portados en `globals.css` desde Fase 3 — verificado antes de implementar.
- [x] Integrado visualmente desde el primer commit del Sprint en `RootLayout.tsx`, como último hijo del bloque `role === 'coordinador'`, después de `MxSubtabs` — misma posición relativa que `Coordinator` en el HTML fuente.
- [x] Resuelto el pendiente documentado desde el Sprint 3.5: `showPublishModal` revertido de `useState(true)` (forzado) a `useState(false)` (valor real del HTML fuente), conectado a `onOpenPublish` del nuevo botón real — cambio explícitamente anticipado, no un fix fuera de alcance. Ver `docs/sprints/sprint-3.6.md` → "Problema encontrado / decisión".
- [x] Validación best-effort (`tsc --noEmit` con stubs + `prettier --check`) — ver `docs/sprints/sprint-3.6.md` → "Validaciones ejecutadas".
- [x] Validación real del usuario confirmada en verde (`npm run lint`/`typecheck`/`build`/`dev`) sobre `feature/sprint-3-6-coordinator-empty-state`.
- [x] Validación visual del usuario confirmada — `CoordinatorEmptyState` coincide con el HTML oficial y el botón "Publicar trabajo" abre correctamente `PublishModal`.
- [x] **Sprint 3.6 cerrado formalmente (✅ Completado)**. Sin pendientes técnicos.

## Sprint 3.7 — `Radar` (completado ✅)

Migra exclusivamente `function Radar({ notified, instState, eligibleIds })` (líneas 1492-1745 del JSX fuente) — único componente SVG autocontenido (círculos concéntricos, grilla, sector de sweep animado, pines de instaladores, leyenda de 5 colores). Detalle completo en `docs/sprints/sprint-3.7.md`.

- [x] Análisis previo obligatorio: se confirmó que "Radar" es un nombre real (`function Radar`), pero se descartó la arquitectura multi-componente sugerida en el brief (`RadarMap`/`RadarMarker`/`RadarLegend`/`RadarOverlay`/`RadarControls`/etc.) — no corresponde a nada real del HTML fuente, que tiene un único componente sin sub-componentes propios.
- [x] Se excluyó explícitamente `CountRing` (líneas 1437-1491, vecino en el archivo fuente) de este Sprint — es un anillo de countdown sin relación visual con el radar, reservado para el Sprint 3.8 ("Countdown").
- [x] `Radar` (`src/components/shared/radar.tsx`) — componente nuevo, sin sub-componentes; usa datos mock nuevos `INSTALLERS`/`ELIGIBLE_ORDER` (`src/constants/index.ts`) y la utilidad `hashAngle` (`src/lib/utils.ts`).
- [x] CSS agregado en `globals.css`: `.mx-radar-wrap`, `.mx-radar`, `.mx-sweep`, `.mx-ping`, `.mx-radar-legend` (+ nested `span`/`i`), verbatim del HTML fuente; más una regla adicional (aditiva) de `prefers-reduced-motion` para las clases crudas `.mx-sweep`/`.mx-ping`/`.mx-blink`/`.mx-spin` (gap detectado y corregido de Fase 3).
- [x] Excepción explícita del usuario para integración temporal en `RootLayout.tsx` (no App.tsx, no Router, no rutas nuevas, sin lógica de negocio) — documentada en `docs/sprints/sprint-3.7.md`. `Radar` se integró como último hijo del bloque `role === 'coordinador'`, con datos mock de demostración (`RADAR_DEMO_NOTIFIED`/`RADAR_DEMO_INST_STATE`).
- [x] Validación local confirmada por el usuario (`npm install`/`lint`/`typecheck`/`build`/`dev`).
- [x] Validación visual confirmada por el usuario — `Radar` coincide con `Multimax_Despacho_v1.3.html`.
- [x] **Sprint 3.7 cerrado formalmente (✅ Completado)**. Sin pendientes técnicos.

## Sprint 3.8 — `CountRing` (completado ✅)

Migra exclusivamente `function CountRing({ remaining, total, size, color })` (líneas 1437-1491 del JSX fuente) — anillo SVG de countdown, sin clases CSS propias, sin estado/efectos/timers internos. Detalle completo en `docs/sprints/sprint-3.8.md`.

- [x] Análisis previo obligatorio (20 preguntas exigidas por el brief): se confirmó que `CountRing` es un componente puro, sin CSS propio, sin dependencia de `Coordinator`/`mx-jobcard`/`Radar`/Timeline. Se detectó y reportó un segundo componente real distinto, `LiveCountdown` (línea 2473, con timer propio, usado dentro de `Coordinator`/`mx-jobcard`) — fuera de alcance de este Sprint.
- [x] `CountRing` (`src/components/shared/countring.tsx`) — componente nuevo, sin sub-componentes.
- [x] `fmt` reincorporada a `src/lib/utils.ts` (retirada en el Sprint 3.7, ahora con consumidora real confirmada).
- [x] Cero CSS nuevo en `globals.css` — `CountRing` no usa ninguna clase `.mx-*`.
- [x] Autorización explícita del usuario para integración temporal en `RootLayout.tsx` (mismo patrón de Sprints 3.5/3.6/3.7) — documentada en `docs/sprints/sprint-3.8.md`. `CountRing` se integró dentro de `role === 'instalador'` (su rol real, a diferencia de `Radar`/`CoordinatorEmptyState`), con props mock estáticas (`COUNTRING_DEMO_REMAINING`/`COUNTRING_DEMO_TOTAL`).
- [x] Validación local confirmada por el usuario (`npm install`/`lint`/`typecheck`/`build`/`dev`).
- [x] Validación visual confirmada por el usuario — `CountRing` coincide con `Multimax_Despacho_v1.3.html`.
- [x] **Sprint 3.8 cerrado formalmente (✅ Completado)**. Sin pendientes técnicos.

## Sprint 3.9 — `LiveCountdown` (completado ✅)

Migra exclusivamente `function LiveCountdown({ publishedAt, bidMins })` (líneas 2473-2493 del JSX fuente) — `<span>` de countdown con timer propio (`useState`+`useEffect`+`setInterval`), sin clases CSS propias. Detalle completo en `docs/sprints/sprint-3.9.md`.

- [x] Análisis previo obligatorio: se localizó `LiveCountdown` exactamente en el HTML y se analizó su cuerpo completo (JSX, lógica, props, dependencias, timers, efectos) antes de escribir código.
- [x] Se detectaron y **reportaron sin asumir** dos discrepancias del brief contra el HTML real: (1) `LiveCountdown` no renderiza `CountRing` (Sprint 3.8) — son componentes independientes; (2) `LiveCountdown` no dispara ningún callback al expirar — no existe ninguna prop de función en su firma real.
- [x] `LiveCountdown` (`src/components/shared/live-countdown.tsx`) — componente nuevo, sin sub-componentes.
- [x] `fmt` reutilizada sin duplicar (`src/lib/utils.ts`, JSDoc actualizado con el segundo consumidor real).
- [x] Cero CSS nuevo en `globals.css` — `LiveCountdown` no usa ninguna clase `.mx-*`.
- [x] Adaptación técnica documentada (no visual): `calc` envuelto en `useCallback` para satisfacer `react-hooks/exhaustive-deps`.
- [x] Integración temporal aplicada directamente en `RootLayout.tsx` (nueva regla permanente: no requiere pausar para pedir autorización) dentro de `role === 'coordinador'` (su rol real, distinto de `CountRing`), con props mock estáticas.
- [x] Validación best-effort (`tsc --noEmit` con stubs + `prettier --check`) — ver `docs/sprints/sprint-3.9.md` → "Validaciones ejecutadas".
- [x] Validación real del usuario confirmada en verde (`npm run lint`/`typecheck`/`build`/`dev`, solo warnings históricos ya aceptados) sobre la rama activa.
- [x] Validación visual y funcional del usuario confirmada — `LiveCountdown` coincide con `Multimax_Despacho_v1.3.html`, el timer corre en vivo correctamente, sin regresiones sobre componentes previamente aprobados.
- [x] **Sprint 3.9 cerrado formalmente (✅ Completado)**. Sin pendientes técnicos.
- [ ] **Detenido a propósito**: no se avanza al Sprint 3.10 sin aprobación explícita del usuario. No se ejecuta ninguna operación Git — el flujo Git es exclusivamente manual, a cargo del usuario.

## Sprint 3.10 — `InstallerDashboard` (completado ✅)

Migra el subconjunto reconstruible de `function Installer(props)` (líneas 3169-3452 del JSX fuente) — "Installer Dashboard" (nombre genérico del brief) no corresponde a ninguna función real. Detalle completo en `docs/sprints/sprint-3.10.md`.

- [x] Análisis previo obligatorio: se identificó que `Installer(props)` es la función real equivalente; `InstallerJobs()`/`InstallerProfile()`, aunque técnicamente reconstruibles, ya estaban reservadas como Sprints 3.12/3.11 — no se invadió su alcance.
- [x] Se determinó que, sin motor de trabajos real, la única rama de "Solicitudes" reconstruible es `mx-phone-empty` — mismo criterio que `CoordinatorEmptyState` (Sprint 3.6).
- [x] `InstallerDashboard` (`src/components/shared/installer-dashboard.tsx`), `InstallerSolicitudesEmptyState` (`mx-phone-empty`) y `MxPhoneTabs` (`.mx-phonetabs`) — componentes nuevos.
- [x] Reutilizados sin duplicar: `TwoColumnLayout`/`PhoneFrame` (Fase 3, primer consumidor real), `InstallerSidebar` (Sprint 3.2, ahora en su posición estructural real), `MxSubtabButton` (Sprint 3.3).
- [x] CSS agregado: `.mx-phone-empty` (+ `svg`/`p`/`span`), verbatim — gap no portado desde Fase 3.
- [x] Integración temporal aplicada directamente en `RootLayout.tsx` (nueva regla permanente: no requiere pausar para pedir autorización), reemplazando la integración ad-hoc del Sprint 3.2.1/3.2.2; nuevo estado `meId` en `RootLayout`.
- [x] Validación best-effort (`tsc --noEmit` con stubs, incluida una pasada con `noUnusedLocals`/`noUnusedParameters`, + `prettier --check`) — ver `docs/sprints/sprint-3.10.md` → "Validaciones ejecutadas".
- [x] Validación real del usuario confirmada en verde (`npm install`/`lint`/`typecheck`/`build`/`dev`, solo warnings históricos ya aceptados).
- [x] Validación visual del usuario confirmada — el layout de `InstallerDashboard` coincide con `Multimax_Despacho_v1.3.html`.
- [x] **Sprint 3.10 cerrado formalmente (✅ Completado)**. Sin pendientes técnicos.
- [ ] **Detenido a propósito**: no se avanza al Sprint 3.11 sin aprobación explícita del usuario. No se ejecuta ninguna operación Git — el flujo Git es exclusivamente manual, a cargo del usuario.

## Sprint 3.11 — `InstallerProfile` (completado ✅)

Migra `function InstallerProfile({ meInfo })` (líneas ~3491-3524 del JSX fuente, `.mx-profscreen`) — pantalla "Perfil" del teléfono del Instalador. A diferencia de la mayoría de los Sprints anteriores de esta fase, el nombre "Installer Profile" del brief coincide exactamente con esta función real. Detalle completo en `docs/sprints/sprint-3.11.md`.

- [x] Análisis previo obligatorio: se confirmó, por inspección directa del HTML (no asumida a partir de la documentación), que el nombre del brief corresponde exactamente a la función real — sin discrepancia que reportar.
- [x] `InstallerProfile` (`src/components/shared/installer-profile.tsx`) — componente nuevo, reconstrucción verbatim, sin estado ni efectos propios.
- [x] Reutilizados sin duplicar: `Badge` (`tone="green"`, Fase 3) para el helper `Pill` del HTML; `INSTALLERS`/`InstallerMock` (ya existentes) para el prop `meInfo`.
- [x] CSS agregado: bloque `.mx-prof*` (12 reglas), verbatim de las líneas 363-374 del `<style>` original.
- [x] Detectado y **reportado sin corregir**: la lista "Reglas de prioridad" de este bloque tiene 4 ítems, no 5 (versión de `mx-instside`, Sprint 3.2, ya migrada) — no se unificaron.
- [x] Integración temporal — entrega inicial: hermano independiente de `InstallerDashboard` en `RootLayout.tsx` (con `meInfo` mock fijo), porque el brief prohibía modificar `InstallerDashboard`.
- [x] **Ajuste de integración** (aprobado explícitamente por el usuario tras la validación visual): el punto de integración se movió a la rama real `instTab === 'perfil'` de `InstallerDashboard`, sin modificar `InstallerProfile` (componente, lógica, estilos y estructura intactos); `RootLayout.tsx` ya no monta `InstallerProfile` directamente.
- [x] Validación best-effort (`tsc --noEmit` con stubs básico + estricto, + `prettier --check`) — antes y después del ajuste, ambas en verde.
- [x] Validación real del usuario confirmada en verde (`npm install`/`lint`/`typecheck`/`build`/`dev`, solo warnings conocidos).
- [x] Validación visual del usuario confirmada — la implementación de `InstallerProfile` coincide con `Multimax_Despacho_v1.3.html`.
- [x] **Sprint 3.11 cerrado formalmente (✅ Completado)**. Sin pendientes técnicos.
- [ ] **Detenido a propósito**: no se avanza al Sprint 3.12 sin aprobación explícita del usuario. No se ejecuta ninguna operación Git — el flujo Git es exclusivamente manual, a cargo del usuario.

## Sprint 3.12 — `InstallerJobs` (completado ✅)

Migra `function InstallerJobs()` (líneas 3453-3484 del JSX fuente, `.mx-myjobs`, sin props) — pantalla "Mis trabajos" del teléfono del Instalador. El nombre del brief coincide exactamente con esta función real. A partir de este Sprint rige también la nueva regla permanente de "preparación para Supabase". Detalle completo en `docs/sprints/sprint-3.12.md`.

- [x] Análisis previo obligatorio: se confirmó, por inspección directa del HTML, que "InstallerJobs" corresponde exactamente a la función real — sin discrepancia que reportar. Sin relación con `InstallerProfile`/`CountRing`/`LiveCountdown`.
- [x] `InstallerJobs` (`src/components/shared/installer-jobs.tsx`) — componente nuevo, reconstrucción verbatim, sin props/estado/efectos.
- [x] Constantes agregadas (`src/constants/index.ts`): `ESTADO` (mapeo completo de 6 estados, portado íntegro aunque `MISJOBS` solo use 3) y `MISJOBS` (mock de 4 trabajos) — ninguna generada dentro del componente, per la nueva regla de preparación para Supabase.
- [x] Reutilizado sin duplicar: `Badge` (Fase 3) para la Pill de estado, en vez de `StatusBadge`.
- [x] CSS agregado: bloque `.mx-phonehdr`/`.mx-myjobs`/`.mx-myjob*` (8 selectores, 10 reglas), verbatim.
- [x] **Integración real y directa** dentro de la rama `instTab === 'trabajos'` de `InstallerDashboard` (antes `null`) — sin ningún mount temporal en `RootLayout.tsx`, primera aplicación completa de la regla de integración vigente desde el Sprint 3.11.
- [x] Validación best-effort (`tsc --noEmit` con stubs básico + estricto, + `prettier --check`) — en verde.
- [x] Validación real del usuario confirmada en verde (`npm install`/`lint`/`typecheck`/`build`/`dev`, solo warnings conocidos).
- [x] Validación visual del usuario confirmada — la implementación de `InstallerJobs` coincide con `Multimax_Despacho_v1.3.html`.
- [x] Validación funcional del usuario confirmada — sin regresiones sobre componentes previamente aprobados.
- [x] **Sprint 3.12 cerrado formalmente (✅ Completado)**. Sin pendientes técnicos.
- [ ] **Detenido a propósito**: no se avanza al Sprint 3.13 sin aprobación explícita del usuario. No se ejecuta ninguna operación Git — el flujo Git es exclusivamente manual, a cargo del usuario.

## Sprint 3.13 — `AdminPanel` (completado ✅)

Migra `function AdminPanel()` (líneas 3031-3048 del JSX fuente, sub-tabs "Calendario maestro"/"Instaladores") + `function AdminInstaladores()` (líneas 3049-3160, `.mx-page`/`.mx-pagehead`/`.mx-admingrid`) — raíz del panel de Administrador. El nombre "Admin Dashboard" del brief **no corresponde** a ninguna función real. Detalle completo en `docs/sprints/sprint-3.13.md`.

- [x] Análisis previo obligatorio: se confirmó, por inspección directa del HTML (`grep -n "function Admin"`), que "Admin Dashboard" no existe como función — el equivalente real es `AdminPanel()`. Se identificó que `MasterCalendar` (contenido de la pestaña "Calendario maestro") es una función real, sin construir, reservada para el Sprint 3.14 ("Calendar") — no se invadió su alcance.
- [x] `AdminPanel` (`src/components/shared/admin-panel.tsx`) — orquestador de sub-tabs, `useState('calendario')` (valor inicial idéntico al HTML fuente); rama "calendario" renderiza `null` en este Sprint.
- [x] `AdminInstaladores` (`src/components/shared/admin-instaladores.tsx`) — reconstrucción verbatim: tabla de instaladores (Pill de estado dinámico Activo/Docs pendientes/Suspendido, botón Suspender/Reactivar) + formulario "Invitar instalador" (5 campos + aviso de confirmación).
- [x] Reutilizado sin duplicar: `MxSubtabs`/`MxSubtabButton` (Sprint 3.3, primer consumidor real fuera de Coordinator), `PageContainer`/`PageHead`/`Card`/`CardHeader`/`Badge`/`Button` (Fase 3), `INSTALLERS`/`ZONAS` (Sprints 3.7/3.5) — ninguna constante nueva.
- [x] Decisión documentada: no se usan `Input`/`Select` de `components/ui/` en el formulario de invitación (el HTML estiliza esos campos vía `.mx-invite input,.mx-invite select`, no vía las clases genéricas) — se reconstruyeron como elementos nativos.
- [x] CSS agregado: bloque `.mx-admingrid`/`.mx-admintable`/`.mx-adminrow*`/`.mx-admin-act`/`.mx-invite*` (15 selectores + 1 media query), verbatim.
- [x] **Integración real y directa** en `src/layouts/RootLayout.tsx` — `{role === 'admin' && <AdminPanel />}`, misma posición estructural que `App()` en el HTML fuente. No es un mount temporal.
- [x] Detectado y **reportado sin corregir**: la pestaña "Calendario maestro" (activa por defecto) renderiza `null` hasta el Sprint 3.14.
- [x] Validación best-effort (`tsc --noEmit` con stubs básico + estricto, + `prettier --check`) — en verde tras una corrección de formato/orden de imports.
- [x] Validación real del usuario confirmada en verde (`npm install`/`lint`/`typecheck`/`build`/`dev`) sobre `feature/sprint-3-13-admin-dashboard`.
- [x] Validación visual y funcional del usuario confirmada — la implementación de `AdminPanel`/`AdminInstaladores` coincide con `Multimax_Despacho_v1.3.html`.
- [x] Sin decisiones arquitectónicas permanentes nuevas que requieran actualizar `ARCHITECTURE.md` — decisiones a nivel de componente, ya documentadas en `docs/sprints/sprint-3.13.md`.
- [x] **Sprint 3.13 cerrado formalmente (✅ Completado)**. Sin pendientes técnicos.
- [ ] **Detenido a propósito**: no se avanza al Sprint 3.14 sin aprobación explícita del usuario. No se ejecuta ninguna operación Git — el flujo Git es exclusivamente manual, a cargo del usuario.

## Sprint 3.14 — `MasterCalendar` (completado ✅)

Migra `function MasterCalendar()` (líneas 2825-3028 del JSX fuente) — calendario de "todos los trabajos de todas las sucursales" del panel de Administrador. El nombre "Calendar" del brief **corresponde exactamente** a esta función real. Detalle completo en `docs/sprints/sprint-3.14.md`.

- [x] Análisis previo obligatorio: se confirmó, por inspección directa del HTML, que "Calendar" corresponde exactamente a `MasterCalendar()`, ya identificada desde el análisis del Sprint 3.13 — sin discrepancia que reportar. Se detectó un segundo punto de montaje real (`CoordinatorJobs({isMaster:true})`), fuera de alcance porque ese componente no existe todavía.
- [x] `MasterCalendar` (`src/components/shared/master-calendar.tsx`) — reconstrucción verbatim: filtro de sucursal, grilla de mes con navegación y puntos de color por trabajo, lista de trabajos del día seleccionado, leyenda de colores por sucursal.
- [x] Constantes agregadas (`src/constants/index.ts`): `SUSCOL` (colores por sucursal, 9 entradas) y `TRABAJOS` (mock de 13 trabajos con fecha real) — ninguna generada dentro del componente.
- [x] Reutilizado sin duplicar: `PageContainer`/`PageHead`/`Card`/`Badge` (Fase 3), `SUCURSALES` (Sprint 3.4), `ESTADO` (Sprint 3.12).
- [x] CSS agregado: bloque de 21 selectores (`.mx-cal-*`/`.mx-joblist`/`.mx-jobrow*`/`.mx-suc-badge`/`.mx-daylist*`), verbatim.
- [x] **Integración real y directa** dentro de la rama `tab === 'calendario'` de `AdminPanel` (antes `null`, Sprint 3.13) — sin ningún mount temporal en `RootLayout.tsx`.
- [x] Validación best-effort (`tsc --noEmit` con stubs básico + estricto, + `prettier --check`) — en verde.
- [x] Validación real del usuario confirmada en verde (`npm run lint`/`typecheck`/`build`/`dev`) sobre `feature/sprint-3-14-calendar`.
- [x] Validación visual y funcional del usuario confirmada — la implementación de `MasterCalendar` coincide con `Multimax_Despacho_v1.3.html`, sin regresiones.
- [x] Sin cambios de arquitectura — `ARCHITECTURE.md` no se modificó. Sin integración con Supabase.
- [x] **Sprint 3.14 cerrado formalmente (✅ Completado)**. Sin pendientes técnicos.
- [ ] **Detenido a propósito**: no se avanza al Sprint 3.15 sin aprobación explícita del usuario. No se ejecuta ninguna operación Git — el flujo Git es exclusivamente manual, a cargo del usuario.

## Sprint 3.15 — `ConfirmCancel` (implementado, 🟡 en revisión)

Migra `function ConfirmCancel({ onYes, onNo })` (líneas 3531-3553 del JSX fuente) — diálogo de confirmación para cancelar un trabajo. "Shared Dialogs" (nombre genérico del brief/`docs/SPRINTS_INDEX.md`) **se corrige** a `ConfirmCancel`, la única función real de este tipo en todo el script. Detalle completo en `docs/sprints/sprint-3.15.md`.

- [x] Análisis previo obligatorio (20 puntos exigidos por el brief): se confirmó que `ConfirmCancel` es el único diálogo compartido real; se descartó cualquier otro candidato (`PublishModal`, ya migrado y prohibido de modificar, no es un diálogo genérico).
- [x] Se detectó que `ConfirmDialog` (`src/components/shared/confirm-dialog.tsx`) **ya existía desde la fase de Baseline (Fases 1-3)**, ya wireado a `.mx-confirm-*`, sin consumidor real hasta este Sprint — se reutiliza tal cual como base, sin duplicar Overlay/Content/accesibilidad.
- [x] `ConfirmCancelDialog` (`src/components/shared/confirm-cancel-dialog.tsx`, NUEVO) — wrapper delgado sobre `ConfirmDialog` con el contenido literal exacto de `ConfirmCancel` (título, descripción, botones, ícono `XCircle`).
- [x] 2 correcciones de fidelidad en `ConfirmDialog` (componente pre-existente, sin Sprint propio): tamaño del ícono `AlertTriangle` (17→16) y ampliación de tipo `confirmLabel`/`cancelLabel` (`string`→`ReactNode`), documentadas explícitamente.
- [x] CSS: ninguno nuevo — `.mx-confirm-*` (11 reglas) ya estaba portado íntegro desde Baseline, verificado sin diferencias.
- [x] **Integración temporal** en `RootLayout.tsx` (mismo criterio que Sprints 3.7/3.8/3.9): estado local `confirmCancelOpen`, botón disparador temporal (réplica verbatim del botón "Cancelar" real de `Coordinator`) dentro de `role === 'coordinador'`, `ConfirmCancelDialog` montado como hermano de `PublishModal` — el disparador real (`Coordinator`, motor de trabajos) no existe todavía.
- [x] Validación best-effort (`tsc --noEmit` con stubs básico + estricto, + `prettier --check`) — en verde.
- [ ] Validación real del usuario (`npm run lint`/`typecheck`/`build`/`dev`) — pendiente.
- [ ] Validación visual y funcional del usuario — pendiente.
- [ ] **Sprint 3.15 pendiente de cierre formal** — no se marca ✅ Completado hasta la aprobación explícita del usuario.
- [ ] **Detenido a propósito**: no se avanza al Sprint 3.16 sin aprobación explícita del usuario. No se ejecuta ninguna operación Git — el flujo Git es exclusivamente manual, a cargo del usuario.

## Fase 4 — Módulo Coordinator (parcialmente iniciada vía Sprints 3.6/3.7 — estado vacío + Radar; ver Sprints 3.9 en adelante en `docs/SPRINTS_INDEX.md`)

> **Nota de numeración (Sprint 5.1, 2026-07-22)**: esta "Fase 4" es la numeración ANTIGUA de este archivo (por módulo/rol, de la era de reconstrucción visual de Fase 3) -- NO es la "Fase 4"/"Fase 5" de `PROJECT_STATUS.md`/`PHASE_4.md`/`ARCHITECTURE.md` (backend/Auth/Flujo Operativo). Coincidencia de nombre, no la misma fase. Se documenta acá para no confundirlas, sin renumerar este archivo completo (fuera de alcance de este Sprint).

- [x] `DespachoPage` (ruta real `/despacho`, Sprint 5.1) creada: `SucursalSelect`/`CoordinatorSubtabs` (subtabs ahora routeadas) + KPIs reales (`CoordinatorKpiRow`/`dashboard.service.ts`) + los mismos `CoordinatorEmptyState`/`Radar`/`LiveCountdown` de Sprints 3.6/3.7/3.9, reubicados verbatim desde `RootLayout.tsx`. `QueueBar`/`JobCard`/`ResponsesFeed`/`AssignedPanel` con datos reales de un trabajo activo siguen pendientes -- dependen del motor de "Flujo de Ofertas" (Sprint 5.3, explícitamente fuera de alcance del Sprint 5.1).
- [x] Estado vacío de `Coordinator` (`mx-qempty`) reconstruido — Sprint 3.6 (`CoordinatorEmptyState`).
- [x] `Radar` (panel SVG de instaladores) reconstruido — Sprint 3.7, integrado temporalmente en `RootLayout` (Sprint 5.1: reubicado a `DespachoPage`, sin cambios).
- [ ] Conectar `PublishModal` (Sprint 3.5) a lógica real de publicación (`onPublish` → tabla `trabajos` real). Sigue pendiente -- corresponde a Sprint 5.2 ("Gestión de Trabajos, CRUD y persistencia"), explícitamente fuera de alcance del Sprint 5.1.
- [x] `TrabajosPage` (ruta real `/trabajos`, Sprint 5.1) construida con datos REALES de la tabla `trabajos` (vía `dashboard.service.ts`/`trabajosRepository`, scoped por `tienda_id` del coordinador autenticado + RLS) — "Cola de Trabajos" con filtro por estado y columnas Cliente/Dirección/Instalación/Estado/Fecha/Prioridad/Acciones (`TrabajoRow`). `TrabajoDetailPage` (ruta `/trabajos/:id`) también construida, con timeline simplificado (3 pasos, sin el paso "instaladores notificados" que depende de `trabajo_instaladores`/motor de ofertas).
- [x] `MasterCalendar` (grid, dots, leyenda) reconstruido con datos mock (`SUSCOL`/`TRABAJOS`) — Sprint 3.14, ✅ Completado; integrado dentro de `AdminPanel` (Admin). Su segundo consumidor real dentro de Coordinator (`CoordinatorJobs({isMaster:true})`) sigue pendiente — depende de `CoordinatorJobs()`, sin Sprint asignado.
- [x] `LiveCountdown` (countdown de texto con timer propio, usado en `mx-jobcard`/QueueBar — distinto de `CountRing`, ya migrado en Sprint 3.8) reconstruido — Sprint 3.9, ✅ Completado, integrado temporalmente en `RootLayout`.
- [x] `ConfirmDialog` de Fase 3 reconstruido con el contenido literal exacto de `ConfirmCancel` (Sprint 3.15, `ConfirmCancelDialog`) e integrado temporalmente en `RootLayout.tsx` (botón disparador temporal, ver `docs/sprints/sprint-3.15.md`) — pendiente de validación del usuario. Su conexión al flujo real `requestCancel`/`doCancel` (motor de trabajos, `Coordinator` con tarjetas reales) sigue pendiente — depende del mismo Sprint futuro que `DespachoPage`/`TrabajosPage` de arriba.

## Fase 5 — Módulo Installer (parcialmente iniciada vía Sprints 3.8/3.10/3.11/3.12 — `CountRing` + `InstallerDashboard` + `InstallerProfile` + `InstallerJobs`)

- [x] Barra del teléfono, navegación `.mx-phonetabs` y estado vacío de "Solicitudes" (`mx-phone-empty`) reconstruidos — Sprint 3.10 (`InstallerDashboard`), integrado temporalmente en `RootLayout`.
- [ ] `SolicitudesPage` real (AlertScreen, OfferForm, DisponibilidadChips, ResponseSentScreen, AssignedScreen, LostScreen, DeclinedScreen, ClosedScreen) con datos mock locales — depende de motor de trabajos real.
- [x] `CountRing` (anillo de countdown usado en AlertScreen/OfferForm) reconstruido — Sprint 3.8, integrado temporalmente en `RootLayout`.
- [x] `MisTrabajosPage` (`InstallerJobs()`, `.mx-myjobs`) reconstruida — Sprint 3.12 (`InstallerJobs`), integrada dentro de `InstallerDashboard` (rama real `instTab === 'trabajos'`).
- [x] `PerfilPage` (`InstallerProfile()`, `.mx-profscreen`) reconstruida — Sprint 3.11 (`InstallerProfile`), integrada dentro de `InstallerDashboard` (rama real `instTab === 'perfil'`).
- [ ] `PhoneFrame`/`Sidebar` de Fase 3 conectados con datos reales del instalador seleccionado.

## Fase 6 — Módulo Admin (✅ Completado vía Sprints 3.13/3.14 — `AdminPanel`/`AdminInstaladores`/`MasterCalendar`)

- [x] `AdminInstaladores` (tabla + suspender/reactivar + formulario de invitación) con datos mock (`INSTALLERS`/`ZONAS`, ya migrados) — Sprint 3.13, integrada dentro de `AdminPanel` (rama real `tab === 'instaladores'`), validación real, visual y funcional confirmadas por el usuario.
- [x] `MasterCalendar` (calendario maestro) con datos mock (`SUSCOL`/`TRABAJOS`) — Sprint 3.14, integrado dentro de `AdminPanel` (rama real `tab === 'calendario'`), validación técnica, visual y funcional confirmadas por el usuario. Módulo Admin completo en su alcance de reconstrucción visual.

## Fase 7 — Integración completa con Supabase (no iniciada)

- [ ] Resolver decisiones pendientes de Fase 1 antes de empezar (coordinador master, columnas faltantes, RPC `seleccionar_instalador`, trigger `auth_id`).
- [ ] Auth real (magic link, roles, `AuthContext` conectado, rutas protegidas).
- [ ] Servicios (`trabajos.service.ts`, `bids.service.ts`, `usuarios.service.ts`, etc.) reemplazando los datos mock de las Fases 4–6.
- [ ] Reemplazar el `useState<Rol>` local de `RootLayout.tsx`/`Header` (placeholder de Fase 3) por el rol derivado de la sesión real de Supabase Auth — sin cambiar la apariencia del `Header`. Eliminar también el selector manual de instalador de `PhoneFrame` (mx-mesel).

## Fase 8 — Realtime (no iniciada)

- [ ] Realtime de `bids` por trabajo (reemplaza `stepJobEngine`/`SCRIPT`).
- [ ] Presence/Broadcast para estados de radar `opened`/`responding` (ver `ARCHITECTURE.md` §9.3).
- [ ] Realtime de `trabajos` para instaladores (respeta RLS automáticamente).

## Fase 9 — Eliminación de datos mock (no iniciada)

- [ ] Confirmar que no queda ningún `INSTALLERS`, `TRABAJOS`, `MISJOBS`, `REVEAL`, `SCRIPT` ni mock local en el código.
- [ ] Confirmar que todas las pantallas leen exclusivamente de Supabase.

## Fase 10 — Pruebas finales, optimización, documentación (no iniciada)

- [ ] `npm run lint && npm run typecheck && npm run build` limpios.
- [ ] Manejo de errores/loading states en todos los hooks.
- [ ] Decidir sobre los botones sin `onClick` heredados del prototipo (`NoResponsePanel`, `JobDetail`).
- [ ] Edge Function de notificaciones (Twilio) + registro en `notificaciones`.
- [ ] Despliegue del build estático.
- [ ] Actualización final de `ARCHITECTURE.md`/`PROJECT_STATUS.md`/`CHANGELOG.md`.
