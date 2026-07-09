# TODO.md — HANDYMAX · Multimax Despacho

Checklist vivo. **Desde el Sprint 3.1, el checklist activo para el trabajo restante es `docs/SPRINTS_INDEX.md`** (Sprints 3.1–3.16, uno por sección del HTML, cada uno con su propia rama Git y su `docs/sprints/sprint-X.Y.md`). Las secciones "Fase 4" en adelante de este archivo quedan como **registro histórico** de la planificación previa a la metodología de Sprints — no se marcan como completadas aquí; su trabajo real se rastrea Sprint a Sprint en `docs/SPRINTS_INDEX.md`.

1. Fase 2 — Scaffold del proyecto ✅
2. Fase 3 — Layout general / Navegación / Header / Sidebar / Componentes compartidos ✅ (pendiente validación local)
3. **Sprint 3.1 — Header ✅** (pendiente validación local — ver `docs/sprints/sprint-3.1.md`)
4. **Sprint 3.2 — `mx-instside` 🟡** (pendiente validación local — ver `docs/sprints/sprint-3.2.md`)
5. **Sprint 3.3 — `mx-subtabs` ✅** (validación local + visual aprobadas — ver `docs/sprints/sprint-3.3.md`)
6. **Sprint 3.4 — `mx-suc-sel` ✅** (validación local + visual aprobadas — ver `docs/sprints/sprint-3.4.md`)
7. Sprints 3.5–3.16 — ver `docs/SPRINTS_INDEX.md`
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

## Fase 4 — Módulo Coordinator (no iniciada; ver Sprints 3.5 en adelante en `docs/SPRINTS_INDEX.md`)

- [ ] `DespachoPage` (QueueBar, JobCard, RadarPanel, JobStatsGrid, ResponsesFeed, AssignedPanel, NoResponsePanel) con datos mock locales.
- [ ] `PublishModal` con React Hook Form + Zod.
- [ ] `TrabajosPage` / `TrabajoDetailPage` (historial, filtro, timeline) con datos mock locales.
- [ ] `MasterCalendar` (grid, dots, leyenda) con datos mock locales.
- [ ] `CountRing`/`LiveCountdown` (countdown circular de rondas/bids — movidos desde Fase 3, son feature-specific de Jobs/Radar).
- [ ] `ConfirmDialog` de Fase 3 conectado al flujo real `requestCancel`/`doCancel`.

## Fase 5 — Módulo Installer (no iniciada)

- [ ] `SolicitudesPage` (AlertScreen, OfferForm, DisponibilidadChips, ResponseSentScreen, AssignedScreen, LostScreen, DeclinedScreen, ClosedScreen) con datos mock locales.
- [ ] `MisTrabajosPage` con datos mock locales.
- [ ] `PerfilPage` con datos mock locales.
- [ ] `PhoneFrame`/`Sidebar` de Fase 3 conectados con datos reales del instalador seleccionado.

## Fase 6 — Módulo Admin (no iniciada)

- [ ] `InstaladoresPage` (tabla + suspender/reactivar + formulario de invitación) con datos mock locales.
- [ ] Reutilización de `MasterCalendar` en la ruta de Admin.

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
