# CHANGELOG.md — HANDYMAX · Multimax Despacho

Formato libre, en orden cronológico descendente. Cada entrada corresponde a una sesión/fase de trabajo (desde el Sprint 3.1, a un Sprint).

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
