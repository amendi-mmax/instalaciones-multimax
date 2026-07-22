# PROJECT_STATUS.md — HANDYMAX · Multimax Despacho

Última actualización: 2026-07-21 — Fase 4, Sprint 4.2.1 ("Sistema de Autenticación y Experiencia de Inicio de Sesión") — 🟡 En revisión. **Corrección sobre el modelo de datos oficial**: la línea original de esta cabecera (`empresas`/`sucursales`/`usuarios`/`zonas_cobertura`/`trabajos`/`bids`/`notificaciones`/`trabajo_instaladores`, confirmada por el usuario en Sprint 4.0.1 tercera ronda) fue posteriormente **superada**: la Auditoría de Sincronización de Base de Datos (Sprint 4.0.2, ver `docs/database/DATABASE_INVENTORY.md`) y toda la infraestructura construida desde Sprint 4.1.1 en adelante (`src/lib/supabase/config.ts`, `README.md` "Esquema oficial de base de datos") confirman contra el `pg_dump` real de Producción que el modelo vigente es el de **8 tablas** `empresas`/`tiendas`/`admins`/`coordinadores`/`instaladores`/`trabajos`/`trabajo_instaladores`/`ofertas` -- no el anterior. Esta cabecera no se había actualizado para reflejarlo hasta ahora; se corrige en esta ronda porque Sprint 4.2.1 no tiene la restricción de "no modificar documentación" de la ronda inmediatamente anterior. Nota: Sprint 3.15 (`ConfirmCancel`) sigue también pendiente de aprobación técnica/visual/funcional del usuario (ver sección correspondiente más abajo); Fase 4 avanzó en paralelo, sin depender de esa aprobación.

**Componentes completados hasta la fecha**: Header, Sidebar (`mx-instside`), Subtabs (`MxSubtabs`/`MxSubtabButton`), Selector de sucursal (`SucursalSelect`), `PublishModal`, `CoordinatorEmptyState`, `Radar`, `CountRing`, `LiveCountdown`, `InstallerDashboard`, `InstallerProfile`, `InstallerJobs`, `AdminPanel`, `AdminInstaladores`, `MasterCalendar`.

## Cambio de metodología (vigente desde el Sprint 3.1)

A partir del Sprint 3.1, el proyecto **deja de desarrollarse por Fases grandes** y pasa a una metodología de **Sprints incrementales**: cada Sprint migra exclusivamente una sección específica de `Multimax_Despacho_v1.3.html`, mantiene el proyecto compilando y estable, es independiente y reversible por Git, y se detiene al finalizar para esperar aprobación explícita antes de iniciar el siguiente. La arquitectura de `ARCHITECTURE.md` no cambia por este ajuste de metodología, solo la forma de secuenciar el trabajo restante (antes correspondiente a "Fase 4 — Módulo Coordinator", "Fase 5 — Módulo Installer", etc.).

El índice oficial de Sprints — con su estado y rama Git — vive ahora en **`docs/SPRINTS_INDEX.md`** y se actualiza al cierre de cada Sprint; el detalle de análisis/implementación de cada uno vive en `docs/sprints/sprint-X.Y.md`. Las secciones "Fase 4/5/6..." de este archivo y de `TODO.md` quedan como **registro histórico** de la planificación previa a este cambio; el trabajo real hacia adelante se rastrea en `docs/SPRINTS_INDEX.md`.

Las Fases 1–3 (arquitectura, scaffold, layout general y componentes compartidos) permanecen tal como se aprobaron y no se re-narran aquí — ver las secciones correspondientes más abajo.

### Actualización de metodología documental (Fase 5, 2026-07-22) — no se crean más archivos `PHASE_X.md`

El usuario formalizó una regla adicional, permanente, sobre la metodología ya vigente desde el Sprint 3.1: **a partir de la Fase 5 no se crean más archivos `PHASE_X.md`** (`PHASE_5.md`, `PHASE_6.md`, `PHASE_7.md`, etc.). Los archivos `PHASE_1.md`–`PHASE_4.md` ya existentes se conservan únicamente como **documentación histórica** de las fases que ya documentan; no se usan como plantilla para fases nuevas y no se modifican salvo correcciones puntuales sobre contenido ya escrito.

De aquí en adelante, toda la planificación y el estado del proyecto se mantienen exclusivamente mediante:

1. **`PROJECT_STATUS.md`** (este archivo) — estado general: fase actual, Sprint actual, módulos terminados/pendientes y próximos Sprints.
2. **`docs/SPRINTS_INDEX.md`** — índice maestro de todas las fases y Sprints, orden cronológico, estado y dependencias. Reemplaza completamente a los futuros `PHASE_X.md`.
3. **`CHANGELOG.md`** — historial completo de cambios.
4. **`README.md`** — se actualiza únicamente cuando cambia arquitectura, instalación, estructura general o el estado del MVP.
5. **Reporte técnico por Sprint** (`docs/architecture/frontend/SPRINT_<fase>_<n>_..._REPORT.md`) — implementación realizada, decisiones técnicas, validaciones, limitaciones, deuda técnica y pendientes de ese Sprint puntual, sin duplicar lo ya cubierto en este archivo.

**Verificación realizada en esta misma ronda**: se buscó (`grep -rn` recursivo sobre todo archivo `.md` del proyecto, incluidos `supabase/README.md` y `docs/`) cualquier referencia existente a `PHASE_5.md`/`PHASE_6.md`/`PHASE_7.md`/`PHASE_X.md` (como archivo a crear o a referenciar a futuro). No se encontró ninguna — todas las menciones a `PHASE_4.md` existentes en el proyecto son referencias legítimas al archivo histórico ya aprobado, no a un `PHASE_5.md` futuro. No hubo, por lo tanto, ninguna referencia que eliminar o sustituir; esta sección deja la regla formalizada hacia adelante, para que ningún Sprint futuro cree ese archivo por asumir la convención antigua.

### Regla permanente del MVP — "Modo de Visualización del Administrador" (Fase 5, Sprint 5.1.1, 2026-07-22)

Mientras el MVP no haya sido aprobado, existe un **"Modo de Visualización del Administrador"**: un usuario real con `rol = admin` puede visualizar temporalmente las 3 experiencias del producto —"Administración" (`AdminPanel`), "Coordinador" (`/despacho`/`/trabajos`, Sprint 5.1) e "Instalador" (`InstallerDashboard`)— **sin cambiar de usuario ni de rol autenticado**. El usuario autenticado sigue siendo siempre `admin`; no se modifica `profile.rol`, la autenticación de Supabase, ni se realiza ninguna forma de impersonación de usuarios. Únicamente cambia qué interfaz se renderiza, mediante un selector temporal (`AdminVistaSwitch`, exclusivo de `admin`) que reutiliza exclusivamente rutas/layouts/páginas/componentes ya existentes — ver el detalle técnico completo, incluida la auditoría previa obligatoria (`AskUserQuestion`, dos rondas) en `docs/architecture/frontend/SPRINT_5_1_1_ADMIN_SUPERUSER_REPORT.md`.

**Por qué existe este mecanismo** (no es un capricho de implementación): ni el HTML oficial ni el código de este proyecto tenían, antes de este Sprint, ninguna forma de que una sola sesión viera más de un rol a la vez — ambos renderizan Coordinador/Instalador/Admin como ramas mutuamente excluyentes. El único precedente del HTML (`.mx-roleswitch`/`HeaderRoleSwitch`) fue retirado a propósito en el Sprint 4.2.1 por ser un toggle de demo sin permisos reales. Este mecanismo lo reintroduce, pero de forma acotada: solo para usuarios `admin` reales, autenticados contra Supabase.

**Eliminación futura (obligatoria cuando el MVP sea aprobado)**: este mecanismo se retira íntegramente —`adminVista`, el `useEffect` de sincronización de URL en `RootLayout.tsx`, el componente `AdminVistaSwitch`, y el ensanchamiento de `CoordinatorIndexRedirect` en `AppRouter.tsx`— sin conservar ninguna lógica temporal. Se implementará entonces el modelo definitivo: Admin ve solo Administración, Coordinador ve solo Coordinador, Instalador ve solo Instalador.

**Limitación real conocida, no corregida en este Sprint** (ver el reporte técnico, sección 6): la vista "Coordinador" en modo superusuario muestra el mensaje ya existente "Tu perfil de coordinador no tiene una tienda asignada" en vez de KPIs/Cola de Trabajos reales, porque `Perfil.tiendaId` es `null` por diseño para `admins` (solo `coordinadores` tiene `tienda_id` en el schema real). No se corrigió por estar fuera del alcance de este Sprint ("no modificar la lógica del Coordinador"); queda pendiente de una decisión de producto futura si se desea resolver.

**ACTUALIZACIÓN — Ajuste final del mismo Sprint 5.1.1 (2026-07-22): limitación anterior RESUELTA.** La limitación de arriba fue corregida en una ronda posterior del mismo Sprint, por instrucción explícita del usuario ("AJUSTE FINAL"). La corrección **no vuelve a usar `profile.tiendaId`** en ningún caso para el `admin` en Modo Coordinador — en su lugar se introdujo una nueva abstracción permanente, el **Contexto Operativo** (`OperationalContextProvider`/`useOperationalContext()`, en `src/providers/` y `src/hooks/`), que resuelve de forma centralizada: empresa activa, sucursal/tienda activa, modo de visualización, y si el usuario opera como Superusuario. Para un Coordinador real el comportamiento es idéntico y síncrono (se limita a reexponer `profile.tiendaId`/`empresaId`/etc., sin tocarlos). Para un `admin` en Modo Coordinador, resuelve la tienda real contra las tablas reales `empresas`/`tiendas` (usando la sucursal ya seleccionada en el `SucursalSelect` existente, sin crear ningún selector nuevo), vía el nuevo `operational-context.service.ts`. Detalle técnico completo, incluida la auditoría previa que detectó la discrepancia de nombre de tabla `sucursales` (stale, en la migración) vs. `tiendas` (real, confirmada por `database.generated.ts`), en `docs/architecture/frontend/SPRINT_5_1_1_ADMIN_SUPERUSER_REPORT.md`, sección 11. **Importante**: a diferencia del selector de vista (`AdminVistaSwitch`), que sí se elimina íntegramente cuando el MVP sea aprobado, el `OperationalContextProvider`/`useOperationalContext()` son una abstracción **permanente** del proyecto — solo se elimina, en ese momento, la rama interna que resuelve el caso Superusuario.

## Regla de validación (vigente desde la corrección de Fase 2, aplica a todo el proyecto y a cada Sprint)

> Ninguna fase podrá darse por aprobada mientras el proyecto no compile correctamente ejecutando satisfactoriamente: `npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`.

Esta sesión no tiene acceso a `registry.npmjs.org` (ver más abajo), así que estas cinco validaciones **siguen pendientes de confirmarse en un entorno local real** antes de que la Fase 2 quede formalmente cerrada.

## Orden de implementación (actualizado en Fase 2)

Por pedido del usuario, a partir de esta fase el orden de implementación cambia para facilitar desarrollo/pruebas locales. **La arquitectura de `ARCHITECTURE.md` no cambia**, solo el orden en que se construye:

1. Fase 2 — Scaffold del proyecto ✅
2. Fase 3 — Layout general, navegación, header, sidebar, componentes compartidos ✅ (esta fase — pendiente validación local, ver abajo)
3. Fase 4 — Módulo Coordinator
4. Fase 5 — Módulo Installer
5. Fase 6 — Módulo Admin
6. Fase 7 — Integración completa con Supabase
7. Fase 8 — Realtime
8. Fase 9 — Eliminación de datos mock
9. Fase 10 — Pruebas finales, optimización, documentación

## Qué quedó implementado

- Proyecto Vite + React 18 + TypeScript inicializado a mano (ver "Problema encontrado — bloqueo de red" abajo, npm no pudo generarlo vía `npm create vite`).
- Tailwind CSS + configuración de shadcn/ui (`components.json`) preparados, con la paleta y tipografías del prototipo ya cableadas como variables CSS y `tailwind.config.ts`.
- React Router, TanStack Query, Supabase JS Client, React Hook Form, Zod, `@hookform/resolvers` y Lucide React agregados a `package.json` (pendientes de instalación real, ver bloqueo abajo).
- ESLint (flat config) + Prettier (con `prettier-plugin-tailwindcss`) configurados.
- Alias de importación `@/` configurado en `tsconfig.app.json` y `vite.config.ts`.
- Estructura completa de carpetas `src/` según `ARCHITECTURE.md` §3 (con `.gitkeep` en las que aún no tienen archivos).
- Archivos base creados: `main.tsx`, `App.tsx`, `routes/AppRouter.tsx` (placeholder), `contexts/AuthContext.tsx` (placeholder tipado, sin conexión real a Supabase Auth), `supabase/client.ts` (cliente preparado, sin queries), `styles/globals.css` (variables, fuentes y keyframes del prototipo, sin las clases `mx-*` todavía), `types/database.ts`, `types/domain.ts`, `types/enums.ts`, `lib/mappers.ts` (conversión snake_case ↔ camelCase), `lib/utils.ts` (helper `cn()` de shadcn), `constants/index.ts` (placeholder).
- `.env.example` creado con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` vacíos.
- `handymax_supabase_schema_v3.sql` copiado **sin ninguna modificación** a `supabase/migrations/0001_initial_schema.sql` (verificado con `diff`, idéntico byte a byte). **[Nota, Fase 4 — Sprint 4.0.1, segunda ronda, 2026-07-15]: esta afirmación ya no es válida.** Por instrucción explícita del brief "Database Infrastructure Baseline", `0001_initial_schema.sql` fue editado para remover los `INSERT`/queries de verificación que tenía embebidos (movidos a `supabase/seed.sql` y `supabase/README.md` respectivamente) — sigue siendo el mismo diseño de schema (mismas tablas/columnas/tipos/relaciones), pero ya no es una copia byte a byte del archivo original. Ver la sección de Sprint 4.0.1 (segunda ronda) más abajo y `PHASE_4.md` para el detalle completo. `TODO.md`/`MIGRATION_STATUS.md` conservan la afirmación original sin corregir (fuera de la lista de archivos permitidos para esa ronda).
- No se migró ningún componente del HTML, no se implementó lógica de negocio, no se conectó Supabase, no se implementó Auth ni Realtime — tal como se pidió para esta fase.

## Problema encontrado — bloqueo de red (crítico, no resuelto)

El entorno donde corre esta sesión tiene una **política de red que no permite acceso al registro de npm** (`registry.npmjs.org` y otros hosts de paquetes están fuera del *allowlist* de salida). Al intentar `npm create vite@latest` y luego `npm install`, ambos fallan con:

```
Host not in allowlist: registry.npmjs.org. Add this host to your network egress settings to allow access.
```

Esto significa que, en esta sesión, **no fue posible ejecutar realmente**:
- `npm create vite@latest`
- `npm install`
- `npx shadcn@latest init` / `npx shadcn@latest add ...`
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`

Como alternativa, se construyó **a mano** todo lo que esos comandos habrían generado (mismo `package.json`, misma configuración de Vite/Tailwind/shadcn/ESLint/Prettier que se habría obtenido con las herramientas oficiales), y se corrió la validación más rigurosa posible sin `node_modules`, usando un compilador TypeScript y Prettier ya presentes en el entorno para otras tareas (no forman parte del proyecto ni de sus dependencias declaradas):

- `tsc --noEmit` sobre todo `src/` con la configuración real del proyecto: **cero errores de sintaxis o de código propio**. Los únicos errores reportados son `Cannot find module 'react'`, `'react-router-dom'`, `'@tanstack/react-query'`, etc. — es decir, exactamente lo esperable sin `node_modules` instalado, no fallas del código.
- `prettier --check` con la configuración real del proyecto (menos el plugin de Tailwind, que tampoco se pudo instalar): **todos los archivos ya cumplen el estilo configurado**, cero diffs.
- Todos los `.json` de configuración (`package.json`, `tsconfig*.json`, `components.json`, `.prettierrc.json`) verificados como JSON válido.
- `handymax_supabase_schema_v3.sql` copiado y comparado con `diff` contra el original: idéntico.

Esto da una confianza razonable de que el proyecto **debería** instalar y compilar sin problemas en un entorno con acceso normal a npm, pero **no reemplaza** la validación real pedida (`npm install && npm run lint/typecheck/build/dev`), que no se pudo ejecutar aquí.

### Cómo desbloquear esto

- Si esta sesión corre sobre el entorno en la nube de Claude Code (infraestructura descrita en la documentación de "Claude Code on the web"), su propietario puede agregar `registry.npmjs.org` (y, si hace falta, `npm.jsr.io`, `unpkg.com`, `cdn.jsdelivr.net`) a la lista de hosts permitidos en la configuración de red del entorno.
- Alternativa: ejecutar `npm install && npm run lint && npm run typecheck && npm run build && npm run dev` en tu propia máquina (tienes el proyecto disponible en tu carpeta "DESARROLLO APLICACIÓN INSTALACIONES") o en un entorno con salida a internet normal, y reportar aquí el resultado para que quede registrado.
- En Claude/Cowork, si tu organización controla el acceso de red desde Admin settings → Capabilities, revisa también esa configuración.

## Corrección de Fase 2 — errores detectados en validación local del usuario

El usuario corrió el scaffold en su máquina y reportó tres errores. Los tres eran reales y ya están corregidos en el código entregado:

1. **`Cannot find module 'node:path'` en `npm run typecheck`.** Causa raíz real: faltaba `@types/node` en `devDependencies` — sin él, ningún módulo `node:*` resuelve, sin importar cuál se use. Corregido: se agregó `"@types/node": "^20.14.0"` a `package.json`, y se restringió explícitamente `"types": ["node"]` en `tsconfig.node.json` (solo para los archivos de configuración) y `"types": []` en `tsconfig.app.json` (para que los tipos de Node — `process`, `Buffer`, `__dirname`, etc. — no se filtren al código de navegador en `src/`, que es el error de aislamiento contrario).
2. **`Cannot find name '__dirname'`.** No era solo un error de tipos: con `"type": "module"` en `package.json`, `vite.config.ts` se carga como ESM nativo, donde `__dirname` no existe en tiempo de ejecución (es un global exclusivo de CommonJS) — es decir, además del error de TypeScript esto habría **roto `vite build`/`vite dev` en tiempo real**, no solo el typecheck. Corregido: `vite.config.ts` ahora resuelve el alias `@/` con el patrón oficial de Vite para ESM: `fileURLToPath(new URL('./src', import.meta.url))`, sin `path.resolve`/`__dirname`.
3. **CSS `@import must precede all other statements`.** `src/styles/globals.css` tenía las directivas `@tailwind` antes del `@import` de Google Fonts, lo cual es CSS inválido (solo `@charset` puede preceder a `@import`). Corregido: el `@import` ahora es la primera declaración del archivo, antes de `@tailwind base/components/utilities`.

### Revisión completa adicional (no limitada a los tres errores reportados)

- `eslint.config.js` aplicaba `globals.browser` (globals de navegador) a **todo** archivo `.ts`/`.tsx` del repo, incluidos `vite.config.ts` y `tailwind.config.ts`, que en realidad corren en Node en tiempo de build. Corregido: se separó en dos bloques — `src/**/*.{ts,tsx}` con `globals.browser` + reglas de React, y `*.config.{ts,js}` con `globals.node`, sin reglas de React (no aplican a archivos de configuración).
- `tsconfig.json` tenía un formato inconsistente con el resto del repo (detectado al re-correr `prettier --check`); se reformateó, sin cambio de contenido/comportamiento.
- Se volvió a correr `prettier --check`/`--write` sobre todo el repo con la configuración real del proyecto: cero diferencias de estilo tras los ajustes.
- Se revisaron uno por uno `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `tailwind.config.ts`, `postcss.config.js`, `globals.css`, el alias `@/`, la configuración ESM (`"type": "module"` + todos los archivos de configuración cargados como ESM: `postcss.config.js`, `tailwind.config.ts`, `eslint.config.js`, `vite.config.ts`) y las variables de entorno (`.env.example` + `vite-env.d.ts`) — no se encontró ningún problema adicional a los ya corregidos.

### Validación best-effort repetida (mismas limitaciones que en el cierre original de Fase 2)

Esta sesión sigue sin acceso a `registry.npmjs.org`, así que de nuevo no fue posible ejecutar `npm install` real ni los scripts `lint`/`typecheck`/`build`/`dev` tal cual. Se repitió la validación estática con las mismas herramientas ajenas al proyecto ya presentes en el entorno:

- `tsc --noEmit -p tsconfig.app.json`: cero errores de código propio (solo `Cannot find module` para paquetes no instalados, como antes).
- `tsc --noEmit -p tsconfig.node.json`: ahora falla con `Cannot find type definition file for 'node'` — **exactamente el comportamiento esperado**, porque `@types/node` tampoco se pudo instalar aquí (mismo bloqueo de red). Esto confirma que la corrección apunta al lugar correcto: en cuanto `npm install` corra de verdad (aquí o en tu máquina), este error debe desaparecer.
- `prettier --check` con la configuración real del proyecto (menos el plugin de Tailwind, no instalable aquí): cero diferencias en todo el repo.
- Todos los `.json` de configuración siguen siendo JSON válido.

**Esto no reemplaza las cinco validaciones obligatorias.** Siguen pendientes de confirmarse corriendo literalmente `npm install && npm run lint && npm run typecheck && npm run build && npm run dev` en un entorno con acceso a npm (tu máquina, o este entorno si se ajusta su política de red — ver sección siguiente).

## Fase 3 — Layout general y componentes compartidos (2026-07-02)

La Fase 2 quedó formalmente aprobada por el usuario tras confirmar en su máquina `npm install`, `npm run typecheck`, `npm run build` y `npm run dev` en verde (solo advertencias menores de ESLint pendientes, no bloqueantes). Esta fase reconstruye el Layout general del sistema y todos los componentes compartidos, sin tocar Coordinator/Installer/Admin ni ninguna lógica de negocio.

### Qué quedó implementado

- **Estilos**: `src/styles/globals.css` extendido con las variables tipográficas `--fd`/`--fb`/`--fm` (existían en el prototipo pero faltaban en el scaffold de Fase 2), el reset `margin:0;padding:0` y `button{border:none;background:none;color:inherit}` (también faltantes), y ~150 clases `mx-*` portadas **verbatim** desde `Multimax_Despacho_v1.3.html` — únicamente las de layout/navegación/header/sidebar/componentes compartidos genéricos. Las de Coordinator/Installer/Admin (job cards, radar, rondas, feed de respuestas, publish-modal completo, calendario maestro, tabla de instaladores, etc.) quedan explícitamente fuera y se portarán en su fase correspondiente — inventario exacto en `MIGRATION_STATUS.md`.
- **`components/ui/`** (27 archivos): Button, IconButton, Card/CardHeader/CardBody/CardFooter, Badge, StatusBadge, Avatar, Chip, Input, Textarea, Select, Label, Checkbox, Switch, Tabs, Dialog, Modal, Drawer, Tooltip, DropdownMenu, Menu, SearchBox, Separator, Spinner/Loading, Skeleton, Progress, Counter, Toast (estructura solamente), Notification. Los que no tienen equivalente en el prototipo (Checkbox, Switch, Tooltip, DropdownMenu, Menu, Skeleton, Progress, Toast, Notification, SearchBox, Separator, Modal) están documentados como adiciones nuevas en cada archivo y en `MIGRATION_STATUS.md`.
- **`components/shared/`**: Header (mx-top, con selector de rol — ver decisión abajo), Footer (mx-foot), PageContainer/PageHead (mx-page/mx-pagehead), TwoColumnLayout (mx-grid + mx-instwrap, dos variantes), PhoneFrame (mx-phone), Sidebar/SidebarCard (mx-instside/mx-mini), StatTile/StatGrid (mx-stats), EmptyState (mx-empty/mx-qempty), ConfirmDialog (mx-confirm-\*), ScrollArea (nuevo).
- **`layouts/RootLayout.tsx`**: equivalente de "AppShell", compone Header + `<Outlet/>` (React Router) + Footer, reproduciendo la estructura raíz exacta de `App()` en el prototipo.
- **`routes/AppRouter.tsx`**: actualizado para envolver la ruta `/` con `RootLayout`, renderizando temporalmente `pages/LayoutShowcasePage.tsx` (vitrina no-funcional, sin lógica de negocio, que prueba visualmente todos los componentes de esta fase con datos estáticos). Se reemplaza en la Fase 4.
- **Nuevas dependencias** (`package.json`): 8 paquetes `@radix-ui/react-*` (dialog, tabs, checkbox, switch, tooltip, dropdown-menu, slot, label) para los primitivos accesibles de Dialog/Modal/Drawer/ConfirmDialog/Tabs/Checkbox/Switch/Tooltip/DropdownMenu/Button(asChild)/Label. Se decidió deliberadamente **no** agregar `@radix-ui/react-select` (el prototipo usa `<select>` nativo en todos sus formularios) ni `@radix-ui/react-separator`/`@radix-ui/react-progress`/`@radix-ui/react-scroll-area` (implementados como `div`s simples para minimizar dependencias — ver ARCHITECTURE.md).

### Decisión de diseño documentada: selector de rol como placeholder temporal

`ARCHITECTURE.md` §4 ya establecía que el selector manual de rol (Coordinador/Instalador/Admin) del prototipo debe eliminarse en la fase de Auth, a favor de un rol derivado de la sesión de Supabase. Esta fase NO implementa Auth, así que `Header`/`RootLayout` reconstruyen el switch **idéntico visual e interactivamente** al prototipo, pero controlado por `useState` local en `RootLayout` — sin lectura de sesión real. Esto cumple a la vez "no cambies nada visualmente" (instrucción de esta fase) y la decisión arquitectónica ya tomada (Fase 7 la reemplaza sin tocar la apariencia). Documentado también en `components/shared/header.tsx` y `MIGRATION_STATUS.md`.

### Adaptaciones CSS necesarias para componentización (no son rediseño)

Algunas clases del prototipo son selectores descendientes (`.mx-chips button`, `.mx-fields input`, `.mx-fields select`) que solo aplican dentro de un contenedor padre exacto. Para que los componentes de `ui/` sean reutilizables fuera de ese contenedor exacto, se agregaron variantes standalone con las **mismas declaraciones** (`.mx-chip`, `.mx-input`, `.mx-textarea`, `.mx-select-native`) y, para Tabs (construido sobre Radix, que expone el estado activo vía `data-state="active"` en vez de una clase `.on` manual), se agregaron selectores `[data-state='active']` equivalentes a `.on`. La apariencia resultante es idéntica en ambos casos — documentado con comentarios en `globals.css` en cada punto.

### Validación de la fase

Igual que en Fase 2, esta sesión no tiene acceso a `registry.npmjs.org`, así que `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` reales **no se pudieron ejecutar aquí**. Validación best-effort realizada con herramientas ajenas al proyecto ya presentes en el entorno:

- `tsc --noEmit` con la configuración real del proyecto (`strict`, `noUnusedLocals`, `noUnusedParameters`) más un conjunto de declaraciones ambientales `declare module '...'` escritas a mano para simular los paquetes no instalables (React, React Router, TanStack Query, Radix, Lucide, clsx, tailwind-merge, etc., todos tipados como `any`/genéricos): **cero errores de sintaxis, imports rotos, variables sin usar o JSX inválido en el código propio.** Los ~48 diagnósticos que sí aparecen (`implicitly has an 'any' type` en los parámetros `className`/`ref` de los componentes `forwardRef` sobre primitivos Radix) son un artefacto conocido y esperado de que las declaraciones-stub tipan Radix como `any` en vez de con sus genéricos reales — el patrón usado en cada archivo (`forwardRef<ElementRef<typeof X>, ComponentPropsWithoutRef<typeof X>>(...)`) es el patrón estándar de shadcn/ui y tipa correctamente en cuanto `node_modules` con los paquetes reales esté instalado. Ninguno de esos 48 diagnósticos señala un error real de lógica.
- `prettier --check`/`--write` (sin el plugin de Tailwind, no instalable aquí): se encontraron y corrigieron 9 archivos con diferencias menores de formato (espaciado de imports/props largas); el resto del repo ya cumplía el estilo. Cero diferencias tras el ajuste.
- `globals.css`: balance de llaves `{}` verificado programáticamente (cero de diferencia) más revisión manual línea por línea contra el `<style>` original del HTML.
- `package.json`: verificado como JSON válido tras agregar las 8 dependencias `@radix-ui/*`.

**Esto no reemplaza las cinco validaciones obligatorias** (`npm install && npm run lint && npm run typecheck && npm run build && npm run dev`), que siguen pendientes de confirmarse en un entorno con acceso real a npm — igual que en Fase 2.

## Sprint 3.1 — Header (2026-07-03) — 🟡 En revisión

Primer Sprint bajo la nueva metodología. Migró exclusivamente `<header className="mx-top">` (Objetivo/Alcance/análisis completo en `docs/sprints/sprint-3.1.md`).

- Componentes creados: `HeaderBrand`, `HeaderRoleSwitch`, `HeaderStatus` (nuevos); `Header` reescrito para componerlos. Ninguno es genérico/no usado — los tres se renderizan de inmediato dentro de `Header`.
- Corrección de fidelidad respecto a Fase 3: el ícono del logo era `RadioTower` (incorrecto) y ahora es `Radio`, verificado contra el JSX fuente y el SVG del snapshot estático del HTML. `.mx-topright` en Fase 3 solo mostraba un placeholder estático (`Badge "Sesión local"`); ahora reproduce la condición real de 3 ramas (`role === "admin"` → badge master, `role === "coord"` → pill de sucursal, `jobs.length > 0 && role === "coord"` → botón "Reiniciar") con props/defaults para el estado de Coordinator que todavía no existe.
- Se detectó y **reportó sin corregir** una discrepancia entre el snapshot estático embebido en el HTML (`<div id="root">`) y el código fuente React (`React.createElement`) del propio archivo: el snapshot muestra solo 2 botones de rol y el texto "Sesión local", que no existen en el código fuente ejecutable. Se implementó según el código fuente (la especificación ejecutable), por ser la fuente de verdad más confiable. Detalle completo en `docs/sprints/sprint-3.1.md` → "Problema encontrado".
- Se eliminó `src/pages/LayoutShowcasePage.tsx` (vitrina de componentes de Fase 3) y su ruta en `AppRouter.tsx`, por ser incompatible con la nueva regla explícita "no crear una vitrina de componentes". No se agregó contenido de relleno en su lugar — el `<Outlet/>` de `RootLayout` queda vacío hasta que un Sprint futuro migre contenido real.
- Validación: misma metodología best-effort de Fase 2/3 (`tsc --noEmit` con stubs ambientales + `prettier --check`), ver `docs/sprints/sprint-3.1.md` → "Pruebas realizadas". Sigue pendiente la validación real (`npm install/lint/typecheck/build/dev`) en el entorno del usuario.
- Detalle completo (análisis previo, componentes, archivos, riesgos, cobertura): `docs/sprints/sprint-3.1.md`. Índice de todos los Sprints planeados: `docs/SPRINTS_INDEX.md`.

## Sprint 3.1.1 — Cierre y validación (2026-07-03)

El usuario corrió las validaciones reales en su máquina y reportó 3 errores de `npm run typecheck`, los tres con el mismo patrón: `src/components/shared/sidebar.tsx`, `src/components/ui/card.tsx` y `src/components/ui/toast.tsx` declaraban una prop `title: ReactNode` en interfaces que extienden `HTMLAttributes<HTMLDivElement>`, que ya define `title?: string` (atributo HTML nativo de tooltip) — una extensión de interfaz incompatible. Corregido renombrando la prop en los tres archivos (`cardTitle`, `sidebarTitle`, `toastTitle` respectivamente), sin tocar el Header ni ningún otro alcance ya aprobado del Sprint 3.1. Ninguno de los tres componentes tenía consumidores todavía, así que el renombre no rompe nada existente. Detalle completo, incluida una nota sobre por qué la validación best-effort de este sandbox no había detectado el problema, en `docs/sprints/sprint-3.1.md` → "Sprint 3.1.1".

Validación best-effort repetida tras la corrección (mismo bloqueo de red de siempre en este entorno): `tsc --noEmit` con stubs ambientales, 0 diagnósticos; `prettier --check`, cero diferencias. **El Sprint 3.1 queda en 🟡 En revisión, no en ✅ Completado**, hasta que el usuario confirme en su máquina que las cuatro validaciones reales (`npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`) terminan en verde — per su propia regla explícita de que el estado no pasa a Completado hasta entonces.

## Sprint 3.1.1 — Validación final (2026-07-03, segunda ronda)

El usuario volvió a validar localmente y reportó que los errores restantes venían principalmente de `src/pages/LayoutShowcasePage.tsx`. Diagnóstico: ese archivo **ya no existe en el proyecto** (se eliminó en el Sprint 3.1 original) ni tiene ninguna referencia en `AppRouter`/`RootLayout`/ningún router — verificado con `grep` y con el historial de Git. Lo que ocurría es que el puente de archivos hacia la máquina del usuario solo puede crear/sobrescribir archivos, no borrarlos de forma remota, así que ese archivo legado seguía físicamente en su carpeta local desde la entrega original del Sprint 3.1; al usar todavía la prop `title` original de `CardHeader`/`SidebarCard`/`Toast`, empezó a fallar el typecheck cuando esa prop se renombró en la primera ronda de Sprint 3.1.1.

Se sobrescribió ese archivo en la máquina del usuario con un stub vacío documentado (`export {};`), ya que no hay forma de borrarlo remotamente con las herramientas disponibles; se le indicó explícitamente que complete el borrado desde su Explorador/editor. Se evaluó también si mantener `cardTitle`/`sidebarTitle`/`toastTitle` (en vez de revertir a `title`, por retrocompatibilidad) rompía algo real: no — el único "consumidor" era precisamente ese archivo legado ya fuera del proyecto, así que se mantienen los nombres nuevos sin cambios. No se modificó ningún archivo del Header ni ningún componente ya aprobado. Detalle completo en `docs/sprints/sprint-3.1.md` → "Sprint 3.1.1 — Validación final".

## Sprint 3.2 — `mx-instside` (2026-07-03) — 🟡 En progreso

A partir de este Sprint, cada Sprint se identifica por el bloque/selector real del HTML (ya no por nombres genéricos de sección como "Sidebar"). Migró exclusivamente `<aside class="mx-instside">` (panel lateral del Instalador, líneas 3422-3449 del JSX fuente): las tarjetas "Tu perfil" y "Reglas de prioridad". Objetivo/análisis/implementación completos en `docs/sprints/sprint-3.2.md`.

- Componentes nuevos: `InstallerSidebar`, `InstallerSidebarCard`, `InstallerProfileSummary`, `InstallerPriorityRules` — reemplazan el `Sidebar`/`SidebarCard` estructural (sin contenido real) creado en Fase 3, exactamente el mismo criterio que la reescritura del `Header` en Sprint 3.1. Ninguno tenía consumidores, verificado con `grep`.
- Se evitó deliberadamente el nombre `InstallerProfile` para la tarjeta "Tu perfil": el HTML fuente ya tiene una función `InstallerProfile()` distinta (pantalla completa de perfil, `ARCHITECTURE.md` §3 → `pages/installer/PerfilPage.tsx`, Sprint futuro) — usar el mismo nombre habría creado una colisión conceptual.
- Se detectó y corrigió una clase CSS faltante desde Fase 3: `.mx-starc` (`color: var(--amber)`, usada por el ícono de calificación) no estaba portada a `globals.css` — agregada verbatim.
- Se detectó y **reportó sin corregir** una inconsistencia real del HTML: existen dos versiones de "Reglas de prioridad" (5 ítems en `mx-instside`, migrados aquí; 4 ítems dentro de `InstallerProfile()`, fuera de alcance) — no se intentó unificarlas.
- `km` (distancia al trabajo, mostrada en "Tu perfil") no tiene campo equivalente en `types/domain.ts` ni en el schema SQL — queda como prop obligatoria sin resolver de dónde saldrá en producción; ver `MIGRATION_STATUS.md`.
- `InstallerSidebar` no se renderiza todavía desde ninguna página/ruta — no existe aún ningún Sprint de `layouts/InstallerLayout.tsx`.
- Validación best-effort (misma metodología de siempre): 0 diagnósticos de `tsc`, cero diferencias de `prettier`. **El Sprint 3.2 queda en 🟡 En progreso, no en ✅ Completado**, hasta que el usuario confirme localmente `npm run lint`/`typecheck`/`build`/`dev` en verde — mismo criterio aplicado desde Sprint 3.1.1.

### Sprint 3.2.1 — Integración visual temporal de `InstallerSidebar` (2026-07-03)

Sub-iteración solicitada por el usuario para hacer visible en el navegador el `InstallerSidebar` del Sprint 3.2, que hasta ahora no tenía ningún layout que lo montara (el navegador solo mostraba Header → main vacío → Footer). **No es el Sprint 3.3, no migra HTML adicional.**

- Único archivo modificado: `src/layouts/RootLayout.tsx` — se agregó `<InstallerSidebar rating={4.9} km={1.8} cumplimiento={98} aceptacion={92} />` dentro de `<main>`, antes de `<Outlet/>`, marcado explícitamente como `TEMPORARY INTEGRATION — Sprint 3.2.1` en comentarios (JSDoc + inline). Se retirará cuando exista `layouts/InstallerLayout.tsx` real.
- No se modificó `InstallerSidebar`/`InstallerSidebarCard`/`InstallerProfileSummary`/`InstallerPriorityRules` ni ningún otro componente — verificado con `git diff`.
- Los 4 valores numéricos pasados son literales fijos en el propio `RootLayout.tsx` (no un mock de datos nuevo), necesarios porque esas props son obligatorias sin default (decisión del Sprint 3.2) y no se podía modificar esa implementación.
- Validación best-effort: `tsc --noEmit` 0 diagnósticos; `prettier --check` cero diferencias. Pendiente de confirmación real del usuario (`npm run lint`/`typecheck`/`build`/`dev`).
- Nota sobre nombre de rama: se pidió trabajar sobre `feature/sprint-3-2-sidebar`; la rama real de este Sprint (creada desde el análisis inicial de `mx-instside`) es `feature/sprint-3-2-mx-instside` — se continuó ahí, no se creó una rama nueva. Ver `docs/sprints/sprint-3.2.md` → "Sprint 3.2.1".

### Sprint 3.2.2 — Corrección de integración de `InstallerSidebar` (2026-07-07)

Sub-iteración para corregir 3 problemas reportados en la integración visual del Sprint 3.2.1. **No es el Sprint 3.3, no migra HTML adicional.** Único archivo modificado: `src/layouts/RootLayout.tsx` (verificado con `git diff --stat`); `InstallerSidebar` y sus subcomponentes no se tocaron.

- **Corrección 1 — rol**: `InstallerSidebar` se renderizaba antes para cualquier `role`. Ahora solo se renderiza cuando `role === 'instalador'`, replicando la condición real del HTML fuente (`role === "inst" && React.createElement(Installer, ...)` en `App()`).
- **Corrección 2 — ancho**: el Sidebar ocupaba el 100% del ancho de `<main>`. Ahora se envuelve en `<div className="mx-instwrap">` (el grid de 2 columnas ya portado a `globals.css` desde Fase 3), que le devuelve su columna angosta (`minmax(240px,300px)`), igual que en el HTML fuente.
- **Corrección 3 — contenedor preparado para el siguiente Sprint**: se agregó un "Phone Placeholder" (`<div />` vacío, sin clase `.mx-phone` ni contenido) como primera columna de `.mx-instwrap`, solo para reservar el espacio (`minmax(320px,400px)`) que ocupará el futuro `layouts/InstallerLayout.tsx`/`PhoneFrame`. No se implementó ningún estilo/contenido de Phone.
- Ningún CSS nuevo: `.mx-instwrap` y su breakpoint responsive (`@media max-width:920px`) ya estaban portados verbatim desde Fase 3.
- Validación best-effort: `tsc --noEmit` 0 diagnósticos; `prettier --check` cero diferencias; `git diff --stat` confirma que `RootLayout.tsx` es el único archivo de código modificado. Pendiente de confirmación real del usuario (`npm run lint`/`typecheck`/`build`/`dev`).
- Detalle completo: `docs/sprints/sprint-3.2.md` → "Sprint 3.2.2".

## Sprint 3.3 — `mx-subtabs` (2026-07-08) — ✅ Completado

Migró exclusivamente `.mx-subtabs-wrap`/`.mx-subtabs` (contenedor + botones de sub-navegación), reutilizado tal cual dos veces en el HTML fuente: dentro de `App()` (rama `role === "coord"`, tabs "Despacho en vivo"/"Mis trabajos" del Coordinator) y dentro de `AdminPanel()` (tabs "Calendario maestro"/"Instaladores"). Objetivo/análisis/implementación completos en `docs/sprints/sprint-3.3.md`.

- Componentes nuevos: `MxSubtabs` (contenedor `.mx-subtabs-wrap > .mx-subtabs`) y `MxSubtabButton` (botón plano con `className` condicional `on`/inactivo, ícono + texto como props). Puramente presentacionales — sin `useState` interno, sin lógica de navegación ni datos mock; `active`/`icon`/`onClick`/el texto del tab son props que deberá proveer el Sprint que construya Coordinator o AdminPanel.
- `.mx-subtabs-wrap`/`.mx-subtabs` ya estaban portadas verbatim en `globals.css` desde Fase 3 — verificado clase por clase contra el HTML fuente, coincide al 100%. No fue necesario ningún cambio de CSS.
- Se detectó y **reportó sin corregir**: `mx-subtabs` tiene dos instancias reales (Coordinator, AdminPanel), y ninguna de las dos pantallas existe todavía en este proyecto — por lo tanto `MxSubtabs`/`MxSubtabButton` no se integraron en ninguna página en este Sprint (integrarlos habría requerido construir Coordinator o AdminPanel, fuera de alcance explícito). Mismo criterio que `InstallerSidebar` en el Sprint 3.2, que tampoco se montó en ningún lugar hasta la sub-iteración 3.2.1 explícitamente solicitada.
- Se detectó y **reportó sin resolver**: ya existe `components/ui/tabs.tsx` (Fase 3, `Tabs`/`TabsList`/`TabsTrigger` sobre `@radix-ui/react-tabs`) apuntando a la misma clase `.mx-subtabs`, sin consumidores. No se modificó ni se eliminó — queda documentada la posible duplicación para que el Sprint que construya Coordinator/AdminPanel decida cuál de los dos usar.
- Validación best-effort (misma metodología de siempre): 0 diagnósticos de `tsc`, cero diferencias de `prettier`.
- Detalle completo: `docs/sprints/sprint-3.3.md`.

### Corrección — Fix de integración visual de `mx-subtabs` (2026-07-08)

El usuario confirmó localmente que `npm run lint`/`typecheck`/`build`/`dev` pasan en verde sobre `feature/sprint-3-3-mx-subtabs`, pero detectó que `MxSubtabs` no se veía renderizado en ningún lugar de la aplicación — el Sprint no podía darse por finalizado sin validación visual (nueva regla explícita del usuario, obligatoria desde ahora para todos los Sprints). Único archivo modificado: `src/layouts/RootLayout.tsx`.

- Se agregó, como primer hijo de `<main>` (antes del bloque `mx-instwrap`/`InstallerSidebar` de Sprint 3.2.1/3.2.2), el renderizado condicional de `<MxSubtabs>` con dos `<MxSubtabButton>` cuando `role === 'coordinador'` — reproduce la posición exacta del HTML fuente (`.mx-subtabs` es el primer elemento de la rama `role === "coord"` de `App()`, antes de `Coordinator`/`CoordinatorJobs`, que no existen todavía).
- "Despacho en vivo" queda activo (estado inicial real del HTML, `coordTab = "despacho"`); "Mis trabajos" inactivo. Íconos y textos son los literales exactos de la instancia Coordinator del HTML — nada inventado.
- Sin `onClick` en ningún botón — no se agregó lógica, eventos, estado real, React Query ni Supabase. No se modificó `MxSubtabs`/`MxSubtabButton` (implementación interna intacta) ni ningún otro componente aprobado.
- Validación best-effort: `tsc --noEmit` 0 diagnósticos; `prettier --check` cero diferencias; `git status --porcelain` confirma que `RootLayout.tsx` es el único archivo de código modificado.
- Detalle completo: `docs/sprints/sprint-3.3.md` → "Corrección — Fix de integración visual".

### Sprint 3.3 finalizado (2026-07-08)

- Validación local completada: el usuario confirmó en su máquina que `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` finalizan las 4 sin errores sobre `feature/sprint-3-3-mx-subtabs`, incluido el fix de integración visual.
- Validación visual completada: el usuario confirmó que `MxSubtabs` es visible en la aplicación, en la posición correspondiente al bloque `mx-subtabs` de `Multimax_Despacho_v1.3.html`.
- No quedan pendientes técnicos del Sprint 3.3. La integración temporal en `RootLayout.tsx` queda aprobada tal cual hasta que exista `layouts/CoordinatorLayout.tsx` en un Sprint futuro.
- **El siguiente Sprint a desarrollar es el Sprint 3.4** — no se inicia sin aprobación explícita del usuario.

## Sprint 3.4 — `mx-suc-sel` (2026-07-08) — ✅ Completado

Análisis directo del HTML (sin asumir de antemano que correspondía a "Main Layout", nombre genérico que traía `docs/SPRINTS_INDEX.md`) determinó que el siguiente bloque estructural pendiente después de `mx-subtabs` es `.mx-suc-sel` — el selector "Sucursal activa", hermano de `.mx-subtabs-wrap` dentro de la rama `role === "coord"` de `App()`, sin CSS ni componente creados hasta ahora. Objetivo/análisis/implementación completos en `docs/sprints/sprint-3.4.md`.

- Componente nuevo: `SucursalSelect` — reconstruye `<div class="mx-suc-sel">` (label + select + 9 opciones), puramente controlado (`value`/`onChange`, sin `useState` interno, mismo criterio que el estado vive en `App()` en el HTML fuente).
- `SUCURSALES` (9 sucursales, transcritas verbatim del HTML fuente) agregada a `src/constants/index.ts` — es el contenido estático necesario para reconstruir las opciones exactas del `<select>`, no lógica de negocio ni un mock nuevo.
- `.mx-suc-sel` (+ `label`/`select`/`select:focus`) agregada a `globals.css`, verbatim — no existía CSS para este bloque antes de este Sprint.
- `RootLayout.tsx`: nuevo estado `sucursalCoord` (mismo nivel que `role`, valor inicial `"Multiplaza"` idéntico al HTML fuente); `SucursalSelect` se renderiza como primer hijo de un nuevo `<div>` (sin clase, igual que el contenedor anónimo del HTML fuente) que ahora envuelve también a `MxSubtabs` (Sprint 3.3, sin tocar su contenido interno).
- Se detectó y **reportó sin corregir**: el badge de sucursal del Header (`sucursalActiva`, default `"Multiplaza"` desde Sprint 3.1) no recibe el nuevo `sucursalCoord` — quedan desincronizados si se cambia la sucursal en el selector. No se modificó la invocación de `Header` porque este Sprint prohíbe explícitamente tocar su integración más allá de lo mínimo necesario para el nuevo bloque.
- Validación best-effort: 0 diagnósticos de `tsc`; `prettier --check` en `.ts`/`.tsx` sin diferencias; en `globals.css` el archivo completo reporta diferencias de estilo preexistentes (comillas, wrapping de gradientes) ajenas a este Sprint — confirmado con `diff` que el bloque nuevo no genera ninguna.
- Detalle completo: `docs/sprints/sprint-3.4.md`.

### Sprint 3.4 finalizado (2026-07-08)

- Validación local completada: el usuario confirmó en su máquina que `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` finalizan las 4 sin errores sobre `feature/sprint-3-4-mx-suc-sel`.
- Validación visual completada: el usuario confirmó que `SucursalSelect` es visible en la aplicación, en la posición correspondiente al bloque `mx-suc-sel` de `Multimax_Despacho_v1.3.html`.
- No quedan pendientes técnicos del Sprint 3.4. La integración temporal en `RootLayout.tsx` queda aprobada tal cual hasta que exista `layouts/CoordinatorLayout.tsx` en un Sprint futuro.
- **El siguiente Sprint a desarrollar es el Sprint 3.5** — no se inicia sin aprobación explícita del usuario.

## Sprint 3.5 — `PublishModal` (2026-07-09) — ✅ Completado

Se verificó que el nombre genérico "Publish Modal" de `docs/SPRINTS_INDEX.md` corresponde al bloque real (función `PublishModal()`, línea 2496 del script) — no hubo que corregirlo, a diferencia del Sprint 3.4. Se detectó y descartó un snapshot DOM obsoleto (`.mx-publishwrap`/`.mx-publish`) que no aparece en ningún `React.createElement` del script vigente. Objetivo/análisis/implementación completos en `docs/sprints/sprint-3.5.md`.

- Componente nuevo: `PublishModal` (`src/components/shared/publish-modal.tsx`) — reconstruye el shell del modal (`.mx-modal-bg`/`.mx-modal-panel`/`.mx-modal-hd`/`.mx-modal-close`/`.mx-modal-body`, vía `Drawer` de Fase 3, primer consumidor real) más el formulario completo `.mx-fields` (14 campos).
- Reutiliza `Drawer`, `Select`, `Input`, `Chip` (variantes `urg`/`bidbtn`) y `DialogPortal` — ningún componente compartido nuevo más allá de `PublishModal` mismo.
- Nuevas constantes en `src/constants/index.ts`: `PROVINCIAS`, `ZONAS`, `BID_OPTIONS` (+ `BidOption`), `buildTimeSlots`/`SLOTS_COORD` — catálogos verbatim del HTML fuente.
- `.mx-priceinput`/`.mx-datein` agregadas a `globals.css`, verbatim — no existían antes de este Sprint.
- `RootLayout.tsx`: nuevo estado `showPublishModal`/`setShowPublishModal` (forzado a `true` temporalmente, ver "Problema encontrado" en `docs/sprints/sprint-3.5.md`); `PublishModal` se renderiza como hermano de los bloques de `role` ya migrados, justo antes de `<Outlet/>`.
- Se detectó y **reportó sin corregir**: el botón "Publicar trabajo" no ejecuta ninguna lógica real (`onPublish` es una función vacía) — no existe todavía ningún `TRABAJOS`/lista de trabajos (Sprint futuro de Job Cards).
- Validación best-effort: 0 diagnósticos de `tsc`; `prettier --check` en `.ts`/`.tsx` sin diferencias. Se detectó y corrigió manualmente una limitación de los stubs ambientales de este sandbox (colapsan tipos de React a `any`, ocultando un error real de indexado estricto en `ZONAS`) — ver `docs/sprints/sprint-3.5.md`.
- Detalle completo: `docs/sprints/sprint-3.5.md`.

### Sprint 3.5 finalizado (2026-07-09)

- Validación local completada: el usuario confirmó en su máquina que `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` finalizan las 4 sin errores sobre `feature/sprint-3-5-publish-modal`.
- Validación visual completada: el usuario confirmó que `PublishModal` coincide con `Multimax_Despacho_v1.3.html`, sin diferencias visuales importantes, y que la integración temporal mediante `showPublishModal=true` es correcta hasta que exista `Coordinator`/`QueueBar`.
- No quedan pendientes técnicos del Sprint 3.5. La integración temporal en `RootLayout.tsx` queda aprobada tal cual hasta que exista `layouts/CoordinatorLayout.tsx`/`Coordinator`/`QueueBar` en un Sprint futuro.
- **El siguiente Sprint a desarrollar es el Sprint 3.6** — no se inicia sin aprobación explícita del usuario.

## Sprint 3.6 — `CoordinatorEmptyState` (2026-07-09) — ✅ Completado

El nombre genérico "Job Cards" que traía `docs/SPRINTS_INDEX.md` para este Sprint **no corresponde** al bloque real reconstruible ahora mismo — corrección de nombre análoga a la del Sprint 3.4. Análisis completo en `docs/sprints/sprint-3.6.md`.

- Análisis previo: se leyó el cuerpo completo de `function Coordinator(props)` (líneas 2132-2423 del script). Solo su primera rama (`if (jobs.length === 0) return <div className="mx-qempty">...`, líneas 2146-2163) es reconstruible sin datos/lógica de negocio — `jobs` arranca en `useState([])` en `App()` y no existe ningún seed/mock en el HTML fuente. El resto de `Coordinator()` (`mx-jobcard`, `QueueBar`, Radar, `AssignedPanel`, respuestas) depende de `jobs.length > 0`, fuera de alcance.
- Componente nuevo: `CoordinatorEmptyState` (`src/components/shared/coordinator-empty-state.tsx`) — reutiliza `EmptyState` (`size="page"`) y `Button` (`variant="ice"`), ambos de Fase 3, sin consumidor real hasta este Sprint.
- Cero CSS nuevo: `.mx-qempty`/`.mx-qempty-ic`/`.mx-btn`/`.mx-btn-ice` ya estaban portados desde Fase 3.
- `RootLayout.tsx`: se integra `CoordinatorEmptyState` después de `MxSubtabs` (misma posición relativa que `Coordinator` en el HTML fuente); se revierte `showPublishModal` de `useState(true)` (forzado, Sprint 3.5) a `useState(false)` (valor real del HTML fuente), conectando `onOpenPublish={() => setShowPublishModal(true)}` — resuelve el pendiente documentado desde el cierre del Sprint 3.5.
- Validación best-effort: 0 diagnósticos de `tsc`; `prettier --check` sin diferencias; `git diff --stat` confirma que solo `RootLayout.tsx` (modificado) y `coordinator-empty-state.tsx` (nuevo) cambiaron, `globals.css` intacto.
- Detalle completo: `docs/sprints/sprint-3.6.md`.

### Sprint 3.6 finalizado (2026-07-09)

- Validación local completada: el usuario confirmó en su máquina que `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` finalizan las 4 sin errores sobre `feature/sprint-3-6-coordinator-empty-state`.
- Validación visual completada: el usuario confirmó que `CoordinatorEmptyState` coincide con `Multimax_Despacho_v1.3.html` y que el botón "Publicar trabajo" abre correctamente `PublishModal`.
- No quedan pendientes técnicos del Sprint 3.6. La integración temporal en `RootLayout.tsx` queda aprobada tal cual hasta que exista `layouts/CoordinatorLayout.tsx`/`Coordinator` real.
- **El siguiente Sprint a desarrollar es el Sprint 3.7** — no se inicia sin aprobación explícita del usuario.

## Sprint 3.7 — `Radar` (2026-07-09) — ✅ Completado

El brief de este Sprint llamaba al bloque "Radar / Mapa de Instaladores" y sugería una arquitectura multi-componente (`RadarMap`/`RadarMarker`/`RadarOverlay`/`RadarControls`/etc.) que **no corresponde a nada real del HTML**. Análisis completo en `docs/sprints/sprint-3.7.md`.

- Análisis previo: se confirmó que `Radar` (líneas 1492-1745 del script) es un único componente SVG autocontenido — círculos concéntricos, sweep animado, pines de instaladores, leyenda — sin ninguna librería de mapas ni sub-componentes propios reutilizables. Se descartó `CountRing` (vecino en el archivo) del alcance: es un anillo de countdown sin relación con el radar, reservado para el Sprint 3.8.
- Componente nuevo: `Radar` (`src/components/shared/radar.tsx`).
- Datos/utilidades agregadas: `INSTALLERS`/`ELIGIBLE_ORDER` (`src/constants/index.ts`, mocks verbatim) y `hashAngle` (`src/lib/utils.ts`, utilidad pura verbatim). `fmt` (vecino en el HTML fuente) se dejó fuera deliberadamente — `Radar` no lo usa.
- CSS agregado: `.mx-radar-wrap`/`.mx-radar`/`.mx-sweep`/`.mx-ping`/`.mx-radar-legend`, verbatim; más un gap de Fase 3 corregido de paso (`prefers-reduced-motion` para las clases planas `.mx-sweep`/`.mx-ping`/`.mx-blink`/`.mx-spin`).
- Integración temporal en `RootLayout.tsx`: `Radar` no tiene todavía consumidor real (depende de la tarjeta "Despacho en vivo" de `Coordinator`, que requiere `jobs.length > 0`, sin datos reales todavía). Se consultó al usuario, que aprobó explícitamente montar `Radar` temporalmente en `RootLayout.tsx` con props mock, sin rutas nuevas ni cambios a React Router, para permitir su validación visual.
- Validación best-effort: 0 diagnósticos de `tsc`; `prettier --check` sin diferencias; `git diff --stat` confirma el alcance exacto.
- Detalle completo: `docs/sprints/sprint-3.7.md`.

### Sprint 3.7 finalizado (2026-07-09)

- Validación local completada: el usuario confirmó en su máquina que `npm install`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` finalizan sin errores sobre `feature/sprint-3-7-radar`.
- Validación visual completada: el usuario confirmó que `Radar` coincide con `Multimax_Despacho_v1.3.html`.
- No quedan pendientes técnicos del Sprint 3.7. La integración temporal en `RootLayout.tsx` queda aprobada tal cual hasta que exista la tarjeta real "Despacho en vivo"/`Coordinator` real.
- **El siguiente Sprint a desarrollar es el Sprint 3.8** (`Countdown`/`CountRing`) — no se inicia sin el análisis previo obligatorio de su propio bloque HTML.

## Sprint 3.8 — `CountRing` (2026-07-10) — ✅ Completado

El brief de este Sprint exigió un análisis previo exhaustivo (20 preguntas obligatorias) y una segunda aprobación explícita del usuario antes de implementar. Análisis completo en `docs/sprints/sprint-3.8.md`.

- Análisis previo: se confirmó que `CountRing` (líneas 1437-1491 del script) es un anillo SVG de countdown, sin ninguna clase CSS propia (todo inline) y sin estado/efectos/timers internos — función pura derivada de sus props (`remaining`/`total`/`size`/`color`). No depende de `Coordinator`, `mx-jobcard`, `Radar` ni "Timeline". Sus dos únicos usos reales están dentro de `Installer(props)` (rol Instalador).
- Hallazgo reportado: existe un segundo componente real de countdown, `LiveCountdown` (línea 2473, con timer propio, usado dentro de `Coordinator`/`mx-jobcard`) — distinto de `CountRing` y fuera de alcance de este Sprint.
- Componente nuevo: `CountRing` (`src/components/shared/countring.tsx`).
- Utilidad reincorporada: `fmt` (`src/lib/utils.ts`) — retirada en el Sprint 3.7, ahora con consumidora real confirmada.
- Cero CSS nuevo: `CountRing` no usa ninguna clase `.mx-*`.
- Integración temporal en `RootLayout.tsx`: `CountRing` no tenía consumidor real disponible (depende del flujo del Instalador — `mx-phone`/`mx-alert`/`mx-offer` — que no existe todavía). Se detuvo el trabajo, se explicó el motivo y se propuso la integración temporal antes de aplicarla, tal como exigía el brief; el usuario la autorizó explícitamente. Se montó dentro de `role === 'instalador'`, con props mock estáticas.
- Validación best-effort: 0 diagnósticos de `tsc`; `prettier --check` sin diferencias; `git diff --stat` confirma el alcance exacto (3 archivos).
- Detalle completo: `docs/sprints/sprint-3.8.md`.

### Sprint 3.8 finalizado (2026-07-10)

- Validación local completada: el usuario confirmó en su máquina que `npm install`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` finalizan sin errores sobre `feature/sprint-3-8-countdown`.
- Validación visual completada: el usuario confirmó que `CountRing` coincide con `Multimax_Despacho_v1.3.html`.
- Sprint 3.8 aprobado por validación técnica y visual del usuario. No quedan pendientes técnicos. La integración temporal en `RootLayout.tsx` queda aprobada tal cual hasta que exista el flujo real del Instalador (`mx-phone`/`mx-alert`/`mx-offer`).
- **El siguiente Sprint a desarrollar es el Sprint 3.9** — no se inicia sin el análisis previo obligatorio de su propio bloque HTML ni sin aprobación explícita del usuario.

## Sprint 3.9 — `LiveCountdown` (2026-07-11) — ✅ Completado

El brief de este Sprint exigió el mismo análisis previo obligatorio de los Sprints anteriores (localización exacta del bloque, análisis completo de HTML/JSX/lógica/props/dependencias, documentación previa a cualquier código). Análisis completo en `docs/sprints/sprint-3.9.md`.

- Análisis previo: se confirmó que `LiveCountdown` (líneas 2473-2493 del script) es un `<span>` de texto con countdown propio (`useState`+`useEffect`+`setInterval`, `Date.now()` en tiempo real, sin la aceleración de `CONF.speed` que sí aplica al motor de `jobView`), sin ninguna clase CSS propia. Su único consumidor real es `statusPill(jb)`, helper interno de `Coordinator(props)`, usado dentro de `QueueBar`.
- Hallazgos reportados (discrepancias entre el brief y el HTML real, no asumidas): (1) `LiveCountdown` **no** renderiza `CountRing` (Sprint 3.8) — son dos componentes de countdown completamente independientes en el HTML fuente, sin relación entre sí, con el único punto en común de reutilizar `fmt`; (2) `LiveCountdown` **no** dispara ningún callback al llegar a cero — no existe ninguna prop de tipo función en su firma real; al expirar simplemente sigue mostrando "0:00 restante" en rojo.
- Componente nuevo: `LiveCountdown` (`src/components/shared/live-countdown.tsx`).
- Utilidad reutilizada, sin duplicar: `fmt` (`src/lib/utils.ts`) — JSDoc actualizado para documentar este segundo consumidor real.
- Cero CSS nuevo: `LiveCountdown` no usa ninguna clase `.mx-*`.
- Adaptación técnica (no visual): `calc` se envuelve en `useCallback` para satisfacer `react-hooks/exhaustive-deps`, sin alterar el comportamiento de reinicio del timer.
- Integración temporal en `RootLayout.tsx`: a partir de este Sprint aplica la nueva regla permanente del proyecto — la integración temporal forma parte del propio Sprint y no requiere pausar para pedir autorización. Se montó directamente dentro de `role === 'coordinador'` (su rol real, distinto de `CountRing`/`role === 'instalador'`), como último elemento del bloque, con props mock estáticas (`LIVECOUNTDOWN_DEMO_PUBLISHED_AT`/`LIVECOUNTDOWN_DEMO_BID_MINS`).
- Validación best-effort: 0 diagnósticos de `tsc`; `prettier --check` sin diferencias; `git diff --stat` confirma el alcance exacto.
- Detalle completo: `docs/sprints/sprint-3.9.md`.

### Sprint 3.9 finalizado (2026-07-11)

- Validación local completada: el usuario confirmó en su máquina que `npm install`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` finalizan sin errores (solo warnings históricos ya aceptados) sobre la rama activa.
- Validación visual completada: el usuario confirmó que `LiveCountdown` coincide con `Multimax_Despacho_v1.3.html`.
- Validación funcional completada: el usuario confirmó el comportamiento del timer en vivo, sin regresiones sobre componentes previamente aprobados.
- Sprint 3.9 aprobado por validación técnica, visual y funcional del usuario. No quedan pendientes técnicos. La integración temporal en `RootLayout.tsx` queda aprobada tal cual hasta que exista el `QueueBar` real de `Coordinator`.
- **El siguiente Sprint a desarrollar es el Sprint 3.10** — no se inicia sin el análisis previo obligatorio de su propio bloque HTML ni sin aprobación explícita del usuario.

## Sprint 3.10 — `InstallerDashboard` (2026-07-13) — ✅ Completado

"Installer Dashboard" (nombre genérico del brief) no corresponde a ninguna función real del HTML — la función real es `Installer(props)` (líneas 3169-3452 del script), montada por `App()` cuando `role === "inst"`. Análisis completo en `docs/sprints/sprint-3.10.md`.

- Análisis previo: `InstallerJobs()` (`.mx-myjobs`) e `InstallerProfile()` (`.mx-profscreen`), ambas funciones reales dentro de `Installer(props)`, ya estaban reservadas como Sprints independientes (3.12 y 3.11) en `docs/SPRINTS_INDEX.md` — no se invadió su alcance. Se reconstruyó únicamente el resto: `.mx-instwrap` completo, la barra del teléfono (`.mx-phone-bar`/`.mx-mesel`) y la navegación `.mx-phonetabs`, más el único estado de "Solicitudes" alcanzable sin motor de trabajos real (`mx-phone-empty`) — mismo criterio ya aplicado a `Coordinator()` en el Sprint 3.6.
- Componentes nuevos: `InstallerDashboard` (`src/components/shared/installer-dashboard.tsx`), `InstallerSolicitudesEmptyState` (reconstruye `mx-phone-empty` verbatim) y `MxPhoneTabs` (contenedor `.mx-phonetabs`).
- Reutilizados sin duplicar: `TwoColumnLayout` y `PhoneFrame` (Fase 3, primer consumidor real de ambos), `InstallerSidebar` (Sprint 3.2, ahora en su posición estructural real por primera vez) y `MxSubtabButton` (Sprint 3.3, reutilizado tal cual para los botones de `.mx-phonetabs`).
- CSS agregado: `.mx-phone-empty` (+ `svg`/`p`/`span`), verbatim — gap no portado desde Fase 3.
- Integración temporal en `RootLayout.tsx`: reemplaza la integración ad-hoc del Sprint 3.2.1/3.2.2 (`InstallerSidebar` con un Phone Placeholder vacío) por la composición real `InstallerDashboard`, aplicada directamente per la regla permanente vigente desde el Sprint 3.9. Nuevo estado `meId`/`setMeId` en `RootLayout` (reproduce el `useState("pty")` real de `App()`). La integración de `CountRing` (Sprint 3.8) no se tocó.
- Se detectó y **reportó sin corregir**: al activar las pestañas "Mis trabajos"/"Perfil", la navegación es real y funcional pero no se renderiza contenido — reservado a los Sprints 3.12/3.11.
- Validación best-effort: 0 diagnósticos de `tsc` (incluida una pasada con `noUnusedLocals`/`noUnusedParameters`); `prettier --check` sin diferencias; `git diff --stat` confirma el alcance exacto.
- Detalle completo: `docs/sprints/sprint-3.10.md`.

### Sprint 3.10 finalizado (2026-07-13)

- Validación local completada: el usuario confirmó en su máquina que `npm install`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` finalizan sin errores (solo warnings históricos ya aceptados) sobre la rama activa.
- Validación visual completada: el usuario confirmó que el layout de `InstallerDashboard` en React coincide con `Multimax_Despacho_v1.3.html`.
- Sprint 3.10 aprobado por validación técnica y visual del usuario. No quedan pendientes técnicos. La integración temporal en `RootLayout.tsx` queda aprobada tal cual hasta que exista `layouts/InstallerLayout.tsx`/una ruta real para el Instalador.
- **El siguiente Sprint a desarrollar es el Sprint 3.11** (`InstallerProfile`) — no se inicia sin el análisis previo obligatorio de su propio bloque HTML ni sin aprobación explícita del usuario.

## Sprint 3.11 — `InstallerProfile` (2026-07-13) — ✅ Completado

"Installer Profile" (nombre del brief) **sí corresponde exactamente** a una función real del HTML — a diferencia de la mayoría de los Sprints anteriores de esta fase, aquí no hubo que corregir el nombre: `function InstallerProfile({ meInfo })` (líneas ~3491-3524 del script, selector `.mx-profscreen`). Análisis completo en `docs/sprints/sprint-3.11.md`.

- Análisis previo: confirmación directa sobre el HTML fuente (no asumida a partir de la documentación) de que el nombre del brief coincide con la función real. Sin discrepancia que reportar como bloqueo — se procedió con la reconstrucción.
- Componente nuevo: `InstallerProfile` (`src/components/shared/installer-profile.tsx`) — reconstrucción verbatim, sin estado ni efectos propios.
- Reutilizados sin duplicar: `Badge` (`tone="green"`, Fase 3) para el helper `Pill` del HTML; `INSTALLERS`/`InstallerMock` (ya existentes) para el prop `meInfo`.
- CSS agregado: bloque `.mx-prof*` (12 reglas), verbatim de las líneas 363-374 del `<style>` original.
- Se detectó y **reportó sin corregir**: la lista "Reglas de prioridad" de este bloque tiene 4 ítems, no 5 (la versión de `mx-instside`, Sprint 3.2, ya migrada) — no se unificaron.
- Integración temporal — entrega inicial: `InstallerProfile` se montó como hermano independiente de `InstallerDashboard` en `RootLayout.tsx` (con `meInfo` mock fijo), porque el brief de este Sprint prohibía modificar `InstallerDashboard`. Ajuste posterior, aprobado explícitamente por el usuario tras la validación visual: la integración se movió a la rama real `instTab === 'perfil'` de `InstallerDashboard`, sin modificar `InstallerProfile` (componente, lógica, estilos y estructura intactos); `RootLayout.tsx` ya no monta `InstallerProfile` directamente.
- Validación best-effort: 0 diagnósticos de `tsc` (básico + estricto), antes y después del ajuste; `prettier --check` sin diferencias; `git diff --stat` confirma el alcance exacto.
- Detalle completo: `docs/sprints/sprint-3.11.md`.

### Sprint 3.11 finalizado (2026-07-13)

- Validación local completada: el usuario confirmó en su máquina que `npm install`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` finalizan sin errores (solo warnings conocidos) sobre la rama activa.
- Validación visual completada: el usuario confirmó que la implementación de `InstallerProfile` en React coincide con `Multimax_Despacho_v1.3.html`.
- Sprint 3.11 aprobado por validación técnica y visual del usuario, incluido el ajuste de punto de integración. No quedan pendientes técnicos.
- **El siguiente Sprint a desarrollar es el Sprint 3.12** (`InstallerJobs`) — no se inicia sin el análisis previo obligatorio de su propio bloque HTML ni sin aprobación explícita del usuario.

## Sprint 3.12 — `InstallerJobs` (2026-07-13) — ✅ Completado

"InstallerJobs" (nombre del brief) **corresponde exactamente** a una función real del HTML: `function InstallerJobs()` (líneas 3453-3484 del script, selector `.mx-myjobs`, sin props). Análisis completo en `docs/sprints/sprint-3.12.md`.

- Análisis previo: confirmación directa sobre el HTML fuente de que el nombre del brief coincide con la función real, sin discrepancia que reportar. Sin relación con `InstallerProfile`, `CountRing` ni `LiveCountdown`.
- Componente nuevo: `InstallerJobs` (`src/components/shared/installer-jobs.tsx`) — reconstrucción verbatim, sin props, sin estado ni efectos propios.
- Constantes agregadas (`src/constants/index.ts`): `ESTADO` (mapeo completo de 6 estados→tono/etiqueta, portado íntegro aunque `MISJOBS` solo use 3, para no reabrir este archivo cuando se migre `Coordinator()`/`TRABAJOS`) y `MISJOBS` (mock de 4 trabajos).
- Reutilizado sin duplicar: `Badge` (Fase 3) para la Pill de estado, en vez de `StatusBadge`.
- CSS agregado: bloque `.mx-phonehdr`/`.mx-myjobs`/`.mx-myjob*` (8 selectores, 10 reglas), verbatim.
- **Nueva regla de integración (vigente desde el Sprint 3.11) aplicada por primera vez sin mount temporal**: `InstallerJobs` se integró directamente dentro de la rama real `instTab === 'trabajos'` de `InstallerDashboard` — `RootLayout.tsx` no requirió ningún cambio.
- **Nueva regla de preparación para Supabase (vigente desde este Sprint)**: `MISJOBS`/`ESTADO` son constantes reutilizables, no datos generados dentro del componente; `InstallerJobs` es puramente de presentación, sin lógica de negocio ni estado innecesario.
- Validación best-effort: 0 diagnósticos de `tsc` (básico + estricto); `prettier --check` sin diferencias; `git diff --stat` confirma el alcance exacto.
- Detalle completo: `docs/sprints/sprint-3.12.md`.

### Sprint 3.12 finalizado (2026-07-13)

- Validación local completada: el usuario confirmó en su máquina que `npm install`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` finalizan sin errores (solo warnings conocidos) sobre la rama activa.
- Validación visual completada: el usuario confirmó que la implementación de `InstallerJobs` en React coincide con `Multimax_Despacho_v1.3.html`.
- Validación funcional completada: el usuario confirmó que no hay regresiones sobre componentes previamente aprobados.
- Sprint 3.12 aprobado por validación técnica, visual y funcional del usuario. No quedan pendientes técnicos.
- **El siguiente Sprint a desarrollar es el Sprint 3.13** (`Admin Dashboard`, nombre genérico pendiente de su propio análisis previo obligatorio) — no se inicia sin aprobación explícita del usuario.

## Sprint 3.13 — `AdminPanel` (2026-07-13) — ✅ Completado

"Admin Dashboard" (nombre genérico del brief) **no corresponde** a ninguna función real del HTML — verificado con `grep -n "function Admin"` sobre el archivo completo. La función real equivalente es `function AdminPanel()` (líneas 3031-3048 del script), montada por `App()` cuando `role === "admin"`. Análisis completo en `docs/sprints/sprint-3.13.md`.

- Análisis previo: `AdminPanel()` compone sub-tabs (`.mx-subtabs-wrap`/`.mx-subtabs`, ya migrado en el Sprint 3.3) con dos pestañas reales: "Calendario maestro" → `MasterCalendar` (función real, no construida, reservada para el Sprint 3.14 "Calendar" — no se invade su alcance) e "Instaladores" → `AdminInstaladores()` (líneas 3049-3160 del script, `.mx-page`/`.mx-pagehead`/`.mx-admingrid`), esta última reconstruible ahora porque solo depende de `INSTALLERS`/`ZONAS`, ya migrados.
- Componentes nuevos: `AdminPanel` (`src/components/shared/admin-panel.tsx`, orquestador de sub-tabs) y `AdminInstaladores` (`src/components/shared/admin-instaladores.tsx`, tabla de instaladores + formulario de invitación).
- Reutilizados sin duplicar: `MxSubtabs`/`MxSubtabButton` (Sprint 3.3, primer consumidor real fuera de Coordinator), `PageContainer`/`PageHead`/`Card`/`CardHeader`/`Badge`/`Button` (Fase 3), `INSTALLERS`/`ZONAS` (Sprints 3.7/3.5) — ninguna constante nueva en este Sprint.
- Decisión documentada: no se usan `Input`/`Select` de `components/ui/` en el formulario de invitación — el HTML fuente estiliza esos campos exclusivamente vía el selector descendiente `.mx-invite input,.mx-invite select`, no vía las clases genéricas `.mx-input`/`.mx-select-native`; se reconstruyeron como elementos nativos para no alterar el estilado real.
- CSS agregado: bloque `.mx-admingrid`/`.mx-admintable`/`.mx-adminrow*`/`.mx-admin-act`/`.mx-invite*` (15 selectores + 1 media query), verbatim.
- **Integración real y directa en `RootLayout.tsx`** (no temporal): se agregó `{role === 'admin' && <AdminPanel />}` en la misma posición estructural que usa el HTML fuente dentro de `App()` — coincide 1:1 con `role === "admin" && React.createElement(AdminPanel, null)`.
- Se detectó y **reportó sin corregir**: la pestaña "Calendario maestro" (activa por defecto) renderiza `null` en este Sprint, ya que `MasterCalendar` está reservado para el Sprint 3.14 — mismo criterio ya usado en `InstallerDashboard` (Sprint 3.10) para sus pestañas pendientes.
- Validación best-effort: 0 diagnósticos de `tsc` (básico + estricto); `prettier --check` sin diferencias tras una corrección de formato/orden de imports; `git diff --stat` confirma el alcance exacto.
- Detalle completo: `docs/sprints/sprint-3.13.md`.

### Sprint 3.13 finalizado (2026-07-13)

- Validación local completada: el usuario confirmó en su máquina que `npm install`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` finalizan sin errores sobre la rama activa.
- Validación visual y funcional completada: el usuario confirmó que la implementación de `AdminPanel`/`AdminInstaladores` en React coincide con `Multimax_Despacho_v1.3.html`, sin regresiones sobre componentes previamente aprobados.
- Sprint 3.13 aprobado por validación técnica, visual y funcional del usuario. No quedan pendientes técnicos. La integración real de `AdminPanel` en `RootLayout.tsx` (`role === 'admin'`) queda aprobada tal cual.
- Sin decisiones arquitectónicas permanentes nuevas que requieran actualizar `ARCHITECTURE.md` — las decisiones de este Sprint (reutilización de `MxSubtabs`, no usar `Input`/`Select` genéricos en el formulario de `AdminInstaladores`) son decisiones de implementación a nivel de componente, ya documentadas en `docs/sprints/sprint-3.13.md`.
- **El siguiente Sprint a desarrollar es el Sprint 3.14** (`MasterCalendar`, "Calendar") — no se inicia sin el análisis previo obligatorio de su propio bloque HTML ni sin aprobación explícita del usuario.

## Sprint 3.14 — `MasterCalendar` (2026-07-14) — ✅ Completado

"Calendar" (nombre del brief) **corresponde exactamente** a una función real del HTML: `function MasterCalendar()` (líneas 2825-3028 del script), ya identificada y reservada desde el análisis del Sprint 3.13. Análisis completo en `docs/sprints/sprint-3.14.md`.

- Análisis previo: confirmación directa sobre el HTML fuente de que el nombre del brief coincide con la función real, sin discrepancia que reportar. Se detectó (no una diferencia de nombre) que el HTML fuente también monta `MasterCalendar` desde `CoordinatorJobs({ isMaster })` (línea 2661) — ese segundo punto de integración queda fuera de alcance porque `CoordinatorJobs()` no está construido todavía.
- Componente nuevo: `MasterCalendar` (`src/components/shared/master-calendar.tsx`) — reconstrucción verbatim: filtro de sucursal, grilla de mes con navegación, puntos de color por trabajo, lista de trabajos del día seleccionado, leyenda de colores por sucursal. Sin sub-componentes propios.
- Constantes agregadas (`src/constants/index.ts`): `SUSCOL` (colores por sucursal, 9 entradas) y `TRABAJOS` (mock de 13 trabajos con fecha real) — ninguna generada dentro del componente, per la regla de preparación para Supabase.
- Reutilizado sin duplicar: `PageContainer`/`PageHead`/`Card`/`Badge` (Fase 3), `SUCURSALES` (Sprint 3.4), `ESTADO` (Sprint 3.12).
- CSS agregado: bloque de 21 selectores (`.mx-cal-*`/`.mx-joblist`/`.mx-jobrow*`/`.mx-suc-badge`/`.mx-daylist*`), verbatim.
- **Integración real y directa** dentro de la rama `tab === 'calendario'` de `AdminPanel` (antes `null`, Sprint 3.13) — sin ningún mount temporal en `RootLayout.tsx`, que no requirió ningún cambio.
- Validación best-effort: 0 diagnósticos de `tsc` (básico + estricto); `prettier --check` sin diferencias; `git diff --stat` confirma el alcance exacto.
- Detalle completo: `docs/sprints/sprint-3.14.md`.

### Sprint 3.14 finalizado (2026-07-14)

- Validación local completada: el usuario confirmó `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` sin errores.
- Validación visual completada: el usuario confirmó que la implementación de `MasterCalendar` en React coincide con `Multimax_Despacho_v1.3.html`.
- Validación funcional completada: sin regresiones sobre componentes previamente aprobados.
- Sprint 3.14 aprobado por validación técnica, visual y funcional del usuario. No quedan pendientes técnicos. La integración real de `MasterCalendar` dentro de `AdminPanel` queda aprobada tal cual.
- Sin cambios de arquitectura — `ARCHITECTURE.md` no se modificó. Sin integración con Supabase.
- **El siguiente Sprint a desarrollar es el Sprint 3.15** (Shared Dialogs) — no se inicia sin el análisis previo obligatorio de su propio bloque HTML ni sin aprobación explícita del usuario.

## Sprint 3.15 — `ConfirmCancel` (2026-07-14) — 🟡 En revisión

"Shared Dialogs" (nombre del brief) **NO corresponde** a ninguna función real del HTML — es un nombre genérico. Se confirmó, por inspección exhaustiva del script (búsqueda de cualquier patrón `function.*Dialog`/`function.*Modal`/`window.confirm`/textos de confirmación), que el único diálogo compartido real es `function ConfirmCancel({ onYes, onNo })` (líneas 3531-3553). Nombre corregido con trazabilidad documentada. Análisis completo en `docs/sprints/sprint-3.15.md`.

- Hallazgo relevante: `ConfirmDialog` (`src/components/shared/confirm-dialog.tsx`) ya existía desde la fase de Baseline (Fases 1-3, previa a la metodología de Sprints), ya wireado a `.mx-confirm-*`, sin consumidor real. Este Sprint lo conecta por primera vez.
- Componente nuevo: `ConfirmCancelDialog` (`src/components/shared/confirm-cancel-dialog.tsx`) — wrapper delgado sobre `ConfirmDialog`, con el contenido literal exacto de `ConfirmCancel` (título, descripción, botones, ícono `XCircle`). Sin datos mock — no aplica preparación para Supabase.
- 2 correcciones de fidelidad en `ConfirmDialog` (componente pre-existente): tamaño de ícono `AlertTriangle` (17→16) y ampliación de tipo `confirmLabel`/`cancelLabel` (`string`→`ReactNode`) — documentadas en `docs/sprints/sprint-3.15.md`.
- CSS: ninguno nuevo — `.mx-confirm-*` (11 reglas) ya portado desde Baseline, verificado sin diferencias.
- **Integración temporal** en `RootLayout.tsx` (mismo criterio que Sprints 3.7/3.8/3.9): estado `confirmCancelOpen`, botón disparador temporal (réplica verbatim del botón "Cancelar" real de `Coordinator`) — el disparador real depende del motor de trabajos, todavía no construido.
- Validación best-effort: 0 diagnósticos de `tsc` (básico + estricto); `prettier --check` sin diferencias; `git status --porcelain -- src/` confirma el alcance exacto.
- Detalle completo: `docs/sprints/sprint-3.15.md`.
- **Pendiente**: validación técnica real (`npm run lint`/`typecheck`/`build`/`dev`), visual y funcional del usuario. `docs/SPRINTS_INDEX.md` no se actualiza en esta ronda.

## Fase 4 — Sprint 4.0.1, primera ronda — Infraestructura de Base de Datos (Supabase) (2026-07-14) — 🟡 En revisión

Cierra la etapa de reconstrucción visual (Fase 3, Sprints 3.1-3.16) e inicia la infraestructura real de backend. Exclusivamente SQL vía `supabase/migrations/0002_auth_roles_rls.sql` (nuevo): 4 ENUMs (`user_role`/`trabajo_estado`/`oferta_estado`/`trabajo_instalador_estado`), conversión de 3 columnas `text`+CHECK a ENUM sin pérdida de datos, tabla nueva `trabajo_instaladores`, 5 índices nuevos, 6 funciones `SECURITY DEFINER` nuevas, y 7 políticas RLS nuevas (cerrando 3 vacíos reales en `empresas`/`sucursales`/`trabajos`/`usuarios`). El brief asumía tablas/columnas que no existen en el schema real (`admins`/`coordinadores`/`instaladores` separadas, `tiendas`, `ofertas`, `trabajos.estado`/`publicado_at`/`instalador_asignado_id`) — se adaptó a la estructura real (`usuarios` unificada, `sucursales`, `bids`, `trabajos.phase`/`published_at`/`assigned_bid_id`), documentado con trazabilidad completa en `PHASE_4.md` (no existía todavía; se creó en esta ronda). Validado con PostgreSQL 16 real (no `npm run lint/typecheck/build/dev`, que no aplican a un Sprint de backend puro): 0 errores en 3 corridas (incluye prueba de idempotencia). Ningún componente React fue modificado. **Pendiente de aprobación explícita del usuario.** Detalle completo: `PHASE_4.md`, `ARCHITECTURE.md §9.7`, `CHANGELOG.md`.

## Fase 4 — Sprint 4.0.1, segunda ronda — Database Infrastructure Baseline (2026-07-15) — 🟡 En revisión

Segundo brief bajo el mismo número de Sprint que la ronda anterior — coincidencia de numeración reportada, sin renumerar nada por cuenta propia. Objetivo: adoptar el flujo oficial de Supabase basado en migraciones (estructura separada de datos), sin rediseñar tablas/columnas/tipos/relaciones/FKs y sin tocar React/Vite/Tailwind/TS/Auth.

- `supabase/migrations/0001_initial_schema.sql` se limpió de datos: se removieron el `INSERT INTO empresas`, el bloque `DO $$` de las 9 sucursales, y 2 queries `SELECT` de verificación manual al final — ahora contiene únicamente sentencias estructurales (`CREATE`/`ALTER`/índices/funciones/vista/RLS). Ningún `CREATE`/`ALTER` de estructura se modificó.
- `supabase/seed.sql` (nuevo): mismos `INSERT`/bloque `DO $$` removidos de `0001`, sin cambios de contenido.
- `supabase/README.md` (nuevo): flujo operativo completo (aplicar migraciones, ejecutar seed, crear migraciones nuevas, buenas prácticas, flujo Git, CLI utilizada), incluye las queries de verificación movidas desde `0001`.
- No se encontró ningún INSERT de "administrador inicial" en el schema real (el brief lo mencionaba) — documentado como discrepancia, no se inventó ese dato.
- **Riesgo real detectado durante la validación** (preexistente, no introducido en esta ronda): el `INSERT` de `sucursales` en el seed no es realmente idempotente (`sucursales` no tiene `UNIQUE` constraint más allá de `id`) — ejecutar `seed.sql` dos veces duplica las 9 sucursales. No se corrigió agregando un constraint nuevo (fuera de alcance sin aprobación); documentado en `supabase/seed.sql`, `supabase/README.md` y `PHASE_4.md`.
- Se corrigió la afirmación, vigente desde Fase 2, de que `0001_initial_schema.sql` era una copia literal sin modificar de `handymax_supabase_schema_v3.sql` — ver nota en "Qué quedó implementado" más arriba. `TODO.md`/`MIGRATION_STATUS.md` no se tocaron (fuera de la lista de archivos permitidos en esta ronda), quedan con la afirmación desactualizada.
- Validado con PostgreSQL 16 real: `0001` (limpio) + `seed.sql` + `0002` aplican sin errores; una segunda ejecución de `seed.sql` confirmó el riesgo de duplicados de arriba.
- Ningún componente React fue modificado. **Pendiente de aprobación explícita del usuario.** Detalle completo: `PHASE_4.md`, `ARCHITECTURE.md §9.8`, `CHANGELOG.md`, `supabase/README.md`.

## Fase 4 — Sprint 4.0.1, tercera ronda — Reconstrucción del baseline de Supabase (2026-07-16) — 🟡 En revisión

Tercer brief bajo el mismo número de Sprint, con lenguaje absoluto, pidiendo reconstruir `0001_initial_schema.sql` hacia un modelo alternativo (`tiendas`/`admins`/`coordinadores`/`instaladores`/`ofertas`) que no coincide con ninguna fuente SQL real del proyecto. Siguiendo la propia "regla final" de ese brief (detenerse y reportar en vez de corregir por cuenta propia), se verificó el modelo pedido contra las dos únicas fuentes reales (`handymax_supabase_schema_v3.sql` original y `0001_initial_schema.sql` actual — idénticos entre sí), se confirmó que ninguna define ese modelo alternativo, y se reportó la discrepancia sin tocar ningún archivo.

**El usuario confirmó por escrito el modelo de datos oficial y definitivo**: `empresas`/`sucursales`/`usuarios`/`zonas_cobertura`/`trabajos`/`bids`/`notificaciones`/`trabajo_instaladores` — el mismo que ya estaba implementado. Esta confirmación queda documentada formalmente en `ARCHITECTURE.md §9.9` como la declaración oficial del modelo de datos del proyecto, para que ningún brief futuro vuelva a asumir el modelo alternativo sin corregirlo primero contra este documento.

Con el modelo confirmado, se completó la estructura de `supabase/` pedida agregando `supabase/config.toml` (nuevo), y se realizó una validación estructural completa y no superficial (tabla por tabla, columna por columna, tipo por tipo, FK por FK, PK por PK, índices, vistas, triggers, funciones, políticas) contra PostgreSQL 16 real, aplicando `0001` + `seed.sql` + `0002` desde una base vacía: **0 errores, 0 diferencias** respecto a lo ya documentado en las rondas anteriores.

Se detectó y reportó (sin resolver unilateralmente) una tensión: el brief exige que `0002` sea "únicamente incremental" sin tocar columnas/tablas existentes, pero `0002` (ya aprobado en la primera ronda) sí convierte 3 columnas a ENUM y agrega una tabla nueva. Se interpretó, dada la instrucción del usuario de "mantener compatibilidad con el esquema existente", que esas conversiones ya forman parte de ese "esquema existente" — no se revirtieron ni se dividieron; se deja explícitamente reportado para que el usuario confirme esa lectura.

Ningún componente React fue modificado (`git status --porcelain -- src/` sin cambios nuevos). **Pendiente de aprobación explícita del usuario**, en particular sobre la tensión de `0002` señalada arriba. Con esta ronda, el repositorio queda preparado, sobre el modelo ya confirmado, para iniciar el Sprint 4.1 (Autenticación). Detalle completo: `PHASE_4.md`, `ARCHITECTURE.md §9.9`, `CHANGELOG.md`, `supabase/README.md`.

## Fase 4 — Auditorías intermedias (Database Synchronization Audit / Frontend Synchronization Audit) — no reflejadas arriba

Entre la ronda de arriba ("tercera ronda — Reconstrucción del baseline de Supabase", 2026-07-16) y el Sprint 4.1.1 de abajo, se ejecutaron 3 rondas de auditoría de solo lectura que **no actualizaron este archivo** (no estaba en su lista de archivos permitidos) pero que cambian sustancialmente lo que dice la ronda de arriba:

1. **"HANDYMAX - Database Synchronization Audit"**: el usuario subió un `pg_dump` real de Producción que reveló que el modelo confirmado en la ronda de arriba (`empresas`/`sucursales`/`usuarios`/`zonas_cobertura`/`trabajos`/`bids`/`notificaciones`) **no es el que gobierna Producción hoy** -- el real es `empresas`/`tiendas`/`admins`/`coordinadores`/`instaladores`/`trabajos`/`trabajo_instaladores`/`ofertas`. Resultado: `docs/database/DATABASE_DIFF.md`, `DATABASE_INVENTORY.md`, `DATABASE_SYNC_PLAN.md` (Estrategia B: nueva línea base desde Producción). Esto resuelve, además, 3 de los 5 puntos de "Problemas encontrados" de más abajo (ver esa sección).
2. **"HANDYMAX - Frontend Synchronization Audit"**: auditó los 76 archivos de `src/` contra ese esquema real. Resultado: `docs/frontend/FRONTEND_AUDIT.md`, `FRONTEND_DIFF.md`, `FRONTEND_COMPATIBILITY_MATRIX.md`, `FRONTEND_SYNC_PLAN.md`, `FRONTEND_IMPACT_REPORT.md`.
3. **Sprint 4.0.2A**: consolidación de esos 5 documentos de frontend (mapeo legacy→Producción, resumen ejecutivo de PM, Fase 0 de generación automática de tipos, columna de origen del dato).

Ver `docs/database/` y `docs/frontend/` para el detalle completo. `ARCHITECTURE.md §9.9` fue formalmente superado por `ARCHITECTURE.md §14` (Sprint 4.1.1, ver más abajo).

## Fase 4 — Sprint 4.1.1 — Supabase Infrastructure Integration, Fase A (2026-07-20) — 🟡 En revisión

Brief: implementar toda la infraestructura Supabase del proyecto (sin lógica de negocio, sin UI nueva), usando exclusivamente el esquema oficial de Producción (`supabase/migrations/0001_initial_schema.sql`) confirmado por las auditorías de arriba.

Antes de escribir código, se auditó el entorno de trabajo contra los puntos "OBLIGATORIOS" del brief y se reportaron 3 bloqueos duros, no de diseño: (1) `supabase/schema_instalaciones_current.sql` (nombre que la Fase 0 original pedía verificar) no existe -- el archivo real es `0001_initial_schema.sql`; (2) el sandbox de este entorno de trabajo bloquea con `403 host_not_allowed` tanto `registry.npmjs.org` como `supabase.com`/`*.supabase.co` -- no es posible instalar la Supabase CLI ni conectarse a Producción real desde acá bajo ninguna circunstancia; (3) no existe `node_modules/` y `npm install` falla por el mismo bloqueo, así que tampoco se puede correr `build`/`lint`/`typecheck` reales.

El usuario confirmó la auditoría y dividió el Sprint en **Fase A** (infraestructura offline, ejecutada en este entorno de trabajo: `src/lib/supabase/`, `.env.example`, Providers, servicios base, repositorios, hooks base, infraestructura de Realtime, documentación) y **Fase B** (a cargo del usuario, fuera de este entorno de trabajo: `npm install`, `supabase gen types typescript`, `build`/`lint`/`typecheck`, validación real de conexión contra Producción).

Fase A completa. **No se generó `database.generated.ts`, no se ejecutó la Supabase CLI, no se corrió `npm install`/`build`/`lint`/`typecheck`, no se validó conexión real** -- instrucción explícita del usuario para esta ronda, no una omisión. Detalle completo de arquitectura, procedimiento de Fase 0 (generación de tipos) y duplicaciones conocidas (dos clientes Supabase, dos `AuthProvider`/`useAuth`) en `ARCHITECTURE.md §14`. Conforme a los propios criterios de aprobación del brief original, **este Sprint no puede declararse aprobado hasta que la Fase B se ejecute y reporte resultados** -- eso es circunstancial al entorno de trabajo, no un defecto de la Fase A.

## Fase 4 — Sprint 4.1.1C — Supabase Infrastructure Stabilization (2026-07-20) — 🟡 En revisión

Brief: el usuario reportó haber ejecutado Fase B localmente (Supabase CLI vinculada, tipos generados) y que esa ejecución real reveló 5 categorías de errores en el código de Fase A (`tsc`/`eslint`). Sprint de **estabilización únicamente** -- sin features nuevas, sin cambios de UI/HTML/migraciones.

Los 5 problemas se corrigieron por lectura/edición manual del código, sin poder ejecutar `npm run lint`/`typecheck`/`build` en este entorno (mismo bloqueo de red que en Fase A, re-confirmado): (1) se ratificó `src/types/database.generated.ts` como única ubicación del tipado generado y se documentó en `src/types/README.md` (nuevo); (2) se eliminaron 6 comentarios `eslint-disable-next-line import/no-unresolved` que silenciaban una regla ESLint inexistente en este proyecto; (3) se reemplazó el tipo de retorno hand-rolled de `removeRealtimeChannel` por el tipo oficial `RealtimeRemoveChannelResponse` de `@supabase/supabase-js`; (4) se agregó `/// <reference types="node" />` en `server.ts` (único archivo Node-exclusivo bajo `src/`) en vez de revertir `"types": []` de `tsconfig.app.json` para todo el proyecto; (5) se extrajeron los 3 objetos `Context` de los Providers a archivos `.ts` nuevos (`supabase.context.ts`/`session.context.ts`/`auth.context.ts`) y se movió la lógica de los hooks internos a los hooks públicos (`useSupabase`/`useSession`/`useAuth`), eliminando la causa de las advertencias `react-refresh/only-export-components`. Detalle completo en `docs/architecture/frontend/SPRINT_4_1_1C_REPORT.md` y `ARCHITECTURE.md §14.7`.

**Hallazgo sin resolver, reportado explícitamente**: pese a que el brief de este Sprint asume que Fase B ya generó `database.generated.ts`, ese archivo **sigue sin existir** en este entorno de trabajo (no fue adjuntado/subido por el usuario). Todo lo demás se corrigió; este punto específico queda pendiente de que el usuario adjunte el contenido real generado por el comando oficial (`supabase gen types typescript --linked --schema public`) para poder cerrarlo. Igual que en Fase A, **no se ejecutaron realmente** `npm run lint`/`typecheck`/`build` en este entorno -- no hay `node_modules/` ni acceso de red; la validación de cada corrección fue por lectura manual del código y de la configuración real del proyecto.

## Fase 4 — Sprint 4.1.1B — Adaptación definitiva al SDK oficial (2026-07-21) — 🟡 En revisión

Brief: el usuario adjuntó el ZIP real del proyecto tras `npm install`/`supabase link`/`supabase gen types` locales -- `database.generated.ts` existe por primera vez, con evidencia cruzada de ser real (`supabase/.temp/postgres-version` = `17.6.1.127`, `rest-version` = `v14.5`, consistentes con la auditoría de Sprint 4.0.1 y con el propio `database.generated.ts`). Objetivo: auditar toda la infraestructura Supabase contra ese tipado real y eliminar cualquier incompatibilidad (`Database`/`Row`/`Insert`/`Update`/`Relationships`/`RPC`/`Realtime`/`createClient`), refactorizando el patrón CRUD genérico si resultara incompatible -- explícitamente autorizado por el brief, sin `any`/casts/`@ts-ignore`/`eslint-disable` no justificados.

Se detectó (por lectura del código propio contra las firmas reales de `.from()`/`.insert()`/`.update()`/`.rpc()`, no por ejecución) que `insertRow`/`updateById`/`callRpc` (genéricos sobre el nombre de tabla/función) dejan de ser type-safe con el `Database` real: la verificación de que un valor (`row`/`patch`/`args`) sea asignable a la forma de una tabla/función concreta requiere que TypeScript resuelva esa tabla/función a un literal, no a un parámetro de tipo genérico todavía abierto dentro del cuerpo de la función -- un límite estable de TypeScript, no un problema de versión. Refactor aplicado: `selectAll`/`selectById`/`deleteById` siguen genéricos (seguros, no dependen de un valor de entrada con forma variable); `create`/`update` se movieron a cada uno de los 8 `src/repositories/*.repository.ts` (donde el nombre de tabla ya es un literal concreto), inyectados a `createRepository(table, writeOps)` sin cambiar el contrato público `Repository<T>`; `callRpc` genérico se reemplazó por `callAsignarInstalador`/`callSubmitBid`, cada una tipada directamente contra `Database['public']['Functions'][<literal>]`. Detalle técnico completo, con justificación de cada decisión, en `docs/architecture/frontend/SPRINT_4_1_1B_REPORT.md` y `ARCHITECTURE.md §14.8`.

Se detectaron además 2 hallazgos fuera del alcance de código, reportados sin modificar (no autorizado por este Sprint): `supabase/config.toml` sigue siendo el archivo escrito a mano en Sprint 4.0.1 (`major_version = 16`, nota de "CLI no instalada") pese a que `supabase/.temp/` prueba que sí se ejecutó un `link` real contra un proyecto en PostgreSQL 17.6 -- no fue realmente regenerado por `supabase init`; y `docs/architecture/database/handymax_schema_v3.sql` contiene el modelo **legacy** (`sucursales`, no `tiendas`), contradiciendo el resto de `docs/architecture/database/`, que es una copia idéntica de `docs/database/` (esquema real de Producción) -- ver `docs/architecture/frontend/SPRINT_4_1_1B_REPORT.md §7` para el detalle.

**No se ejecutaron realmente** `npm run lint`/`typecheck`/`build`/`dev` en este Sprint -- mismo bloqueo de red y ausencia de `node_modules/` que en las rondas anteriores, re-confirmado en este Sprint. El propio `tsconfig.app.tsbuildinfo` incluido en el ZIP del usuario (de su compilación real, no de este entorno) reporta `"errors": true` -- confirmación honesta de que había errores reales antes de este refactor, no una afirmación fabricada por este entorno. La validación real de `lint`/`typecheck`/`build`/`dev` en verde sigue pendiente de que el usuario la ejecute localmente y reporte el resultado.

## Fase 4 — Sprint 4.1.1C (segunda ronda) — Refactorización final de `database.service.ts` (2026-07-21) — 🟡 En revisión

**Nota retroactiva**: esta ronda ya se ejecutó y se cerró (ZIP entregado) antes de este documento actualizarse -- su brief restringía explícitamente "no modificar documentación previamente aprobada", una restricción más estricta que las rondas anteriores, así que `PROJECT_STATUS.md`/`ARCHITECTURE.md`/`MIGRATION_STATUS.md`/`README.md` no se tocaron en su momento. Se documenta aquí ahora porque Sprint 4.2.1 no tiene esa misma restricción.

Brief: evaluar si debía seguir existiendo un CRUD genérico compartido en `database.service.ts`, con una alternativa propuesta explícitamente (repositorios llamando a `getClient().from(...)` directamente). Se adoptó la alternativa: se eliminó **todo** el CRUD genérico restante (`selectAll`/`selectById`/`deleteById`, que Sprint 4.1.1B había mantenido por considerarlos seguros) -- los 8 `src/repositories/*.repository.ts` ahora implementan sus 5 operaciones (`getAll`/`getById`/`create`/`update`/`remove`) directamente contra `TABLES.<tabla>` (literal), sin ningún despacho genérico. `base.repository.ts` se redujo a únicamente el contrato de tipos `Repository<T>` (sin ninguna función en tiempo de ejecución). `database.service.ts` quedó con solo los alias de tipo (`TableRow`/`TableInsert`/`TableUpdate`) y los 2 wrappers RPC ya existentes (`callAsignarInstalador`/`callSubmitBid`). Detalle técnico completo en `docs/architecture/frontend/SPRINT_4_1_1C_DATABASE_SERVICE_REPORT.md`.

**Nota de transparencia** (ya documentada en el propio informe de esa ronda): el ZIP recibido para esta ronda resultó ser **byte-idéntico** a la entrega anterior de este mismo entorno de trabajo (verificado con `diff -rq`), no un build local fresco como sugería la narrativa del brief -- se completó igualmente el trabajo de arquitectura pedido (que se sostiene por mérito técnico propio), mientras se reportaba la discrepancia con máxima visibilidad en vez de aceptar en silencio el estado "lint 0 errores" que el brief daba por hecho.

## Fase 4 — Sprint 4.2.1 — Sistema de Autenticación y Experiencia de Inicio de Sesión (2026-07-21, cerrado 2026-07-22) — ✅ Completado

Primer Sprint que implementa autenticación real de punta a punta (login con correo/contraseña, sesión, resolución de perfil/rol real, recuperación de contraseña, rutas protegidas). Detalle técnico completo en `docs/architecture/frontend/SPRINT_4_2_1_AUTH_REPORT.md` y `ARCHITECTURE.md §14.9`.

Puntos clave: (1) se completó `src/providers/AuthProvider.tsx` (hasta ahora deliberadamente genérico, "sin resolver rol") con `src/services/profile.service.ts` (nuevo), que determina el rol real por membresía de fila en `admins`/`coordinadores`/`instaladores` -- el modelo real no tiene tabla `usuarios` unificada; (2) se retiró por completo el `AuthContext`/`AuthProvider` legacy de `src/contexts/AuthContext.tsx` (montado hasta ahora en `App.tsx`, tipado contra el modelo `usuario`/`rol`/`sucursalId` ya descartado) -- resolviendo la "arquitectura paralela" que el propio proyecto venía señalando desde Sprint 4.1.1; (3) se eliminó el selector manual de rol (`HeaderRoleSwitch`) y se reemplazó por `HeaderUserMenu` (usuario autenticado real); (4) primeras rutas reales de Auth (`/login` pública, `/` protegida) vía `ProtectedRoute`/`PublicRoute` (nuevos); (5) `LoginPage`/`AuthLayout` (nuevos) construidos exclusivamente con componentes/tokens ya aprobados.

### Cierre — validación manual del usuario (2026-07-22)

El usuario ejecutó la validación real contra Producción y reportó explícitamente: **Sprint 4.2.1 COMPLETADO**, con login vía Supabase Auth, `resolveProfile()`, lectura de `admins`, acceso al Dashboard, persistencia de sesión, logout y recarga de página manteniendo la sesión, todos validados correctamente; sin restos de código de depuración.

**Verificación de este entorno de trabajo sobre el proyecto recibido** (ZIP `handymaxdespachosprint4.1.2authupdate.zip`): comparado con `diff -rq` contra la última entrega de este mismo entorno, el código fuente es **idéntico** -- ninguna línea de `src/` cambió. Esto es coherente con la propia descripción del usuario: todo lo corregido ("ajuste de políticas RLS", "otorgamiento de `SELECT` a `authenticated`", "inserción del registro en `admins`", "corrección del flujo de autenticación usando el usuario real de `auth.users`") ocurrió **del lado de Supabase** (Dashboard/SQL), no en el código. Se confirmó además la ausencia de `console.log`/`debugger` en todo `src/` (el único `console.warn` presente, en `src/supabase/client.ts`, ya existía desde Fase 3 -- no es un resto de esta ronda). El `tsconfig.app.tsbuildinfo` incluido refleja el árbol de archivos completo de este Sprint (incluidos `ProtectedRoute`/`PublicRoute`/`LoginPage`/`AuthLayout`/`profile.service.ts`) con rutas normalizadas en minúsculas -- consistente con una ejecución real de `tsc` en un sistema de archivos case-insensitive (Windows/macOS), y sin el campo `"errors"` que sí aparecía en compilaciones previas con errores -- evidencia razonable de una compilación local limpia. **Hallazgo menor, no bloqueante**: el ZIP recibido todavía contiene `src/components/shared/header-role-switch.tsx` y `src/contexts/AuthContext.tsx` -- ambos retirados en la entrega original de este Sprint; son residuos de que el usuario extrajo el ZIP anterior sobre su carpeta existente sin borrarlos manualmente (esperable, ya documentado en Sprints anteriores como limitación de "solo se pueden sobrescribir archivos, no borrarlos" en otros flujos de entrega) -- no se re-entregan esos dos archivos, ya están fuera del proyecto en este entorno.

**Pendiente explícito, por decisión del usuario**: las migraciones SQL que formalicen en el repositorio las policies RLS/GRANTS/triggers creados manualmente en el Dashboard de Supabase **no se generaron en esta ronda** -- el usuario indicó explícitamente no querer una reconstrucción de SQL de seguridad inventada por este entorno de trabajo (sin acceso de red para verificarla contra el estado real). Queda pendiente para una ronda futura, una vez que el usuario exporte el SQL real (p. ej. vía `supabase db diff --linked` o el Dashboard) y lo proporcione. **Hasta que eso ocurra, este repositorio NO puede reconstruir una base de datos nueva únicamente ejecutando sus migraciones** -- las policies/GRANTS que hacen funcionar el login de `admin` hoy existen solo en el proyecto real de Producción, no en `supabase/migrations/`.

## Fase 5 — Sprint 5.1 — Dashboard y Vista Operativa del Coordinador (2026-07-22) — 🟡 En revisión

Primer Sprint de la nueva Fase 5 ("Flujo Operativo"). Detalle técnico completo, incluida la auditoría previa obligatoria, en `docs/architecture/frontend/SPRINT_5_1_COORDINATOR_REPORT.md`.

**Auditoría previa obligatoria (antes de escribir código)**: se comparó el layout actual del Coordinador contra `Multimax_Despacho_v1.3.html` y se detectaron 3 discrepancias reales entre el brief de este Sprint y el diseño oficial, reportadas al usuario (vía `AskUserQuestion`, sin fabricar ninguna) antes de implementar nada:

1. El brief pedía un Sidebar lateral (Dashboard/Trabajos/Calendario/Instaladores/Perfil/Cerrar sesión). El HTML oficial no tiene sidebar en ningún lado (0 coincidencias de "sidebar"/"aside"/clases de menú) -- la navegación real del Coordinador son dos subtabs horizontales bajo el header ("Despacho en vivo"/"Mis trabajos", `MxSubtabs`/`MxSubtabButton`, ya reconstruidas desde el Sprint 3.3 pero nunca conectadas a rutas reales). **Decisión del usuario: no construir el Sidebar** -- se reutiliza la navegación oficial, ahora routeada con React Router.
2. El brief pedía un "Dashboard Principal" con KPIs agregados (trabajos pendientes/activos/finalizados/programados hoy) como entregable explícito. Ese dashboard no existe en el HTML oficial -- el Coordinador solo tiene "Despacho en vivo" (`Coordinator()`, radar de un trabajo activo) y "Mis trabajos" (`CoordinatorJobs()`, lista con filtros). **Decisión del usuario: no crear una pantalla nueva** -- los KPIs se integran como una fila adicional en la parte superior de la vista oficial "Despacho en vivo", sin alterar su estructura visual existente.
3. El brief pedía "Calendario" e "Instaladores" como entradas del menú del Coordinador. En el HTML oficial ambos son exclusivos de Admin (`MasterCalendar`/`AdminInstaladores`, gateados por `isMaster`/`AdminPanel`); además, el propio brief excluye explícitamente "Gestión de Instaladores" de este Sprint, contradiciendo pedirla en el menú. **Decisión del usuario: omitir ambos** por ahora -- quedan pendientes de una decisión de producto futura.

**Construido en este Sprint** (todo real, no mock, salvo donde se indica lo contrario):

- `DespachoPage` (`/despacho`, landing real del Coordinador): `SucursalSelect` + subtabs routeadas (`CoordinatorSubtabs`, nuevo) + KPIs reales (`CoordinatorKpiRow` + `dashboard.service.ts`, contra la tabla `trabajos` real vía `trabajosRepository.getByTiendaId()`, ya con policies RLS reales para coordinadores) + los mismos `CoordinatorEmptyState`/`Radar`/`LiveCountdown`/botón "Cancelar" de los Sprints 3.6/3.7/3.9/3.15, **reubicados verbatim** desde `RootLayout.tsx` (cero cambios de comportamiento).
- `TrabajosPage` (`/trabajos`, "Cola de Trabajos", Entregable 5): tabla real (estilo `.mx-joblist`/`.mx-jobrow` del HTML oficial) con columnas Cliente/Dirección/Instalación/Estado/Fecha/Prioridad/Acciones, filtro por estado, datos reales de `trabajos` scoped a la tienda del coordinador autenticado.
- `TrabajoDetailPage` (`/trabajos/:id`, primera implementación de esta ruta planificada desde `ARCHITECTURE.md §8`): detalle + timeline simplificado (3 pasos, sin el paso "instaladores notificados" que depende de `trabajo_instaladores`, fuera de alcance).
- `RootLayout.tsx`: el bloque `role === 'coordinador'` (antes inline) pasa a `<Outlet/>` con las 3 rutas nuevas montadas debajo -- `role === 'instalador'`/`role === 'admin'` **no se tocaron**.
- Vocabulario de `trabajos.estado` (`live`/`assigned`/`completed`/`cancelled`) documentado explícitamente como **inferido, no verificado contra Producción** (no hay CHECK/ENUM real, solo el default `'live'` confirmado) -- `trabajoEstadoInfo()` degrada de forma segura ante valores inesperados (Pill `muted` con el valor crudo, ningún trabajo queda oculto).

**Qué NO se hizo en este Sprint** (excluido explícitamente por el propio brief): motor de "Flujo de Ofertas" (radar/bids en tiempo real contra un trabajo activo, Sprint 5.3), conexión real de `PublishModal` (Sprint 5.2), Asignación de Instaladores (Sprint 5.4), Gestión de Empresas/Instaladores, CRUD de Coordinadores, Notificaciones.

**Pendiente**: validación real del usuario (`npm run lint`/`typecheck`/`build`/`dev`) -- este entorno de trabajo no tiene `node_modules`/red; se usó la verificación best-effort con `tsc` global (ver metodología en `SPRINT_4_2_1_AUTH_REPORT.md`), sin errores nuevos atribuibles a este Sprint.

## Fase 5 — Sprint 5.1.1 — Implementación del modo Administrador Superusuario (MVP) (2026-07-22) — 🟡 En revisión

Sprint exclusivamente de navegación -- no agrega funcionalidades nuevas, no modifica la lógica de Coordinador/Instalador, Auth, Supabase, RLS ni políticas. Detalle técnico completo, incluida la auditoría previa obligatoria (2 rondas de `AskUserQuestion`), en `docs/architecture/frontend/SPRINT_5_1_1_ADMIN_SUPERUSER_REPORT.md`. Ver también la regla permanente "Modo de Visualización del Administrador" más arriba en este archivo.

**Auditoría previa -- 2 discrepancias reales detectadas y resueltas con el usuario antes de escribir código**:

1. El brief pedía "ampliar `allowedRoles`, no inventar UI" -- pero ni el HTML oficial ni el código tenían un `RoleGate` genérico; Coordinador/Instalador/Admin son 3 ramas mutuamente excluyentes, y ampliar un array de roles no crea por sí solo la capacidad de alternar entre las 3 en una misma sesión. **Decisión del usuario: agregar un selector temporal de modo, exclusivo de `admin`** (aprobado, con precisión adicional del usuario sobre su alcance).
2. Tres ítems del checklist del brief ("Publicar Trabajo"/"Ofertas"/"Asignaciones") no tienen equivalente real exacto. **Decisión (recomendada, no objetada): reinterpretar los dos primeros contra lo real, documentar "Asignaciones" como no validable este Sprint** (no existe, reservada para el Sprint 5.4).

**Construido en este Sprint**: `src/components/shared/admin-vista-switch.tsx` (NUEVO, único componente nuevo -- presentacional, reutiliza `MxSubtabs`/`MxSubtabButton`). `RootLayout.tsx`: estado `adminVista` + 1 `useEffect` de sincronización de URL + 3 booleanos derivados (`showCoordinador`/`showInstalador`/`showAdminPanel`) que amplían las comparaciones de rol existentes. `AppRouter.tsx`: `CoordinatorIndexRedirect` ampliado a `admin` (sin crear ninguna ruta nueva). Ningún componente duplicado, ninguna versión "Admin" de una pantalla existente.

**Limitación real, no corregida** (fuera de alcance -- "no modificar la lógica del Coordinador"): la vista "Coordinador" en modo superusuario no muestra KPIs/Cola de Trabajos reales para el admin (`Perfil.tiendaId` es `null` por diseño para `admins`) -- ver detalle en la sección de metodología más arriba y en el reporte técnico, sección 6.

**AJUSTE FINAL (mismo Sprint 5.1.1, 2026-07-22) — limitación anterior resuelta**: por instrucción explícita del usuario, se corrigió la limitación de arriba sin usar `profile.tiendaId` para el caso admin-en-Modo-Coordinador. Se creó la abstracción **Contexto Operativo** (`src/services/operational-context.service.ts`, `src/providers/operational-context.context.ts`, `src/providers/OperationalContextProvider.tsx`, `src/hooks/useOperationalContext.ts`), que centraliza la resolución de empresa/tienda/modo/Superusuario y evita repetir condiciones `role === 'admin' && adminVista === 'coordinador'` en cada página. `DespachoPage.tsx`/`TrabajosPage.tsx` ahora consumen únicamente `useOperationalContext()` (ya no `useAuth()` para este dato). La empresa se resuelve contra la tabla real `empresas` (slug `'multimax'`, confirmado en `supabase/seed.sql`), la sucursal contra la tabla real `tiendas` (no `sucursales`, que es un nombre de tabla obsoleto en la migración inicial pero superado por el schema real -- ver discrepancia documentada en el reporte técnico, sección 11.1), usando la sucursal ya seleccionada en el `SucursalSelect` existente, sin selector nuevo. Un Coordinador real sigue usando exactamente `profile.tiendaId` (sin cambio de comportamiento). Ver sección 11 completa del reporte técnico. Esta abstracción de Contexto Operativo es **permanente** (no se elimina con el resto del mecanismo temporal cuando el MVP sea aprobado -- ver la nota en la sección de metodología más arriba).

**Pendiente**: validación real del usuario (`npm run lint`/`typecheck`/`build`/`dev`) -- mismas limitaciones de entorno que el resto del proyecto; se usó `tsc` global cruzado contra archivos ya aprobados (`coordinator-subtabs.tsx`/`TrabajoDetailPage.tsx`) para clasificar diagnósticos como artefactos de entorno, sin errores nuevos atribuibles a este Sprint (incluyendo la ronda de ajuste final).

## Qué falta

- **Bloqueante para cerrar el Sprint 5.1**: ejecutar en el entorno del usuario `npm run lint && npm run typecheck && npm run build && npm run dev` en verde, y validación visual/funcional real (login como coordinador, KPIs con datos reales de su tienda, navegación `/despacho`↔`/trabajos`, detalle de un trabajo) -- este entorno de trabajo no tiene `node_modules`/acceso de red para ejecutarlos ni credenciales reales para probar contra Producción.
- **Pendiente para una ronda futura (bloqueante para reconstrucción desde cero)**: generar la(s) migración(es) SQL que formalicen las policies RLS/GRANTS/triggers agregados manualmente en Supabase durante la validación del Sprint 4.2.1 -- requiere que el usuario provea el SQL real (`supabase db diff --linked` o export del Dashboard); este entorno de trabajo no tiene acceso de red al proyecto para generarlo de forma verificada.
- **Bloqueante para cerrar el Sprint 4.1.1**: ejecutar la Fase B completa (`npm install`, `supabase gen types typescript`, `npm run build`/`lint`/`typecheck`, validación de conexión real contra Producción) en un entorno con acceso a la Supabase CLI y a las credenciales reales, y reportar los resultados para adaptar cualquier incompatibilidad que aparezca.
- **Bloqueante para cerrar el Sprint 4.1.1C**: adjuntar/subir el contenido real de `src/types/database.generated.ts`, generado por `supabase gen types typescript --linked --schema public` en el entorno del usuario, y volver a ejecutar `npm run lint`/`typecheck`/`build` para confirmar en verde -- este entorno de trabajo no puede generar ese archivo ni ejecutar esos comandos (sin red, sin `node_modules/`). **Resuelto en Sprint 4.1.1B**: el archivo ya fue adjuntado y es real.
- **Bloqueante para cerrar el Sprint 4.1.1B**: ejecutar en el entorno del usuario `npm run lint && npm run typecheck && npm run build && npm run dev` en verde con el refactor de este Sprint aplicado, y reportar el resultado real -- este entorno de trabajo sigue sin `node_modules/` ni acceso de red para ejecutarlos. Prestar atención particular a `src/lib/supabase/realtime.ts` (tipos de Realtime del SDK real `@supabase/supabase-js@2.110.0`, una versión muy posterior al corte de entrenamiento de este modelo, no verificable contra el código fuente instalado en este entorno). También pendiente: decidir si corregir `supabase/config.toml` (desactualizado, `major_version = 16` vs. PostgreSQL 17.6 real ya confirmado por `supabase/.temp/`) y limpiar la duplicación de `docs/architecture/database/` y `docs/architecture/frontend/` (copias idénticas de `docs/database/`/`docs/frontend/`, más un archivo `handymax_schema_v3.sql` con el modelo legacy mezclado ahí) -- ninguno de los dos se tocó en este Sprint por ser infraestructura de documentación/configuración fuera del alcance explícito (código de `src/`).
- **Sprint 3.15: implementado, pendiente de validación del usuario** (técnica real, visual, funcional) antes de cerrarse formalmente.
- **Bloqueante para cerrar el Sprint 3.2**: confirmar en el entorno del usuario `npm install && npm run lint && npm run typecheck && npm run build && npm run dev` en verde sobre la rama `feature/sprint-3-2-mx-instside`.
- A partir de aquí, el trabajo restante (antes descrito como "Fase 4 — Coordinator", "Fase 5 — Installer", "Fase 6 — Admin", etc.) se ejecuta Sprint a Sprint según `docs/SPRINTS_INDEX.md`, cada uno esperando aprobación explícita antes de iniciar el siguiente. La integración con Supabase, Realtime, eliminación de mocks y pruebas finales (antes Fases 7–10) siguen vigentes como trabajo futuro, a re-planificar en Sprints una vez completado el bloque 3.x.
- Los layouts por rol (`CoordinatorLayout`/`InstallerLayout`/`AdminLayout`) siguen fuera de alcance hasta el Sprint que corresponda. Ver `MIGRATION_STATUS.md`.
- Sincronización pendiente entre `SucursalSelect` y el badge de sucursal del Header (reportado, no corregido) — ver "Problema encontrado" en `docs/sprints/sprint-3.4.md`; queda como trabajo futuro, no bloquea el cierre de ningún Sprint.
- `onPublish` sin lógica real en `PublishModal` (reportado, no corregido) — ver "Problema encontrado" en `docs/sprints/sprint-3.5.md`; pendiente para el Sprint que implemente `jobs`/`Trabajo` real.
- El resto de `Coordinator()` (`mx-jobcard`, `QueueBar`, `AssignedPanel`, `NoResponsePanel`, respuestas, indicadores) queda pendiente de un Sprint que también implemente `jobs`/`publishJob` real — ver "Problema encontrado / decisión" en `docs/sprints/sprint-3.6.md`. `Radar` (Sprint 3.7, ✅ completado) ya está reconstruido pero también depende de esa misma base para su integración definitiva.
- El consumidor real de `CountRing` (Sprint 3.8, ✅ completado) — pantallas "alerta"/"oferta" del teléfono del Instalador — queda pendiente de un Sprint futuro que implemente el resto de "Solicitudes" (`mx-alert`/`mx-offer`) con motor de trabajos real. El consumidor real de `LiveCountdown` (Sprint 3.9, ✅ completado) — `statusPill`/`QueueBar` de `Coordinator` — queda pendiente de un Sprint futuro que implemente el motor de trabajos (`jobs`/`publishJob`) real. Ver `docs/sprints/sprint-3.9.md`.
- `InstallerDashboard` (Sprint 3.10, ✅ completado) reconstruyó únicamente el estado vacío de "Solicitudes" (`mx-phone-empty`) y la navegación del teléfono — el contenido de las pestañas "Perfil" (Sprint 3.11, ✅ completado) y "Mis trabajos" (Sprint 3.12, ✅ completado) ya está resuelto, ambas integradas dentro de sus ramas reales (`instTab === 'perfil'`/`'trabajos'`); las 7 ramas restantes de "Solicitudes" siguen dependiendo del mismo motor de trabajos real que bloquea `Coordinator()`. Ver `docs/sprints/sprint-3.10.md`, `docs/sprints/sprint-3.11.md` y `docs/sprints/sprint-3.12.md`.

## Problemas encontrados (heredados de Fase 1, siguen sin resolver)

Ver `ARCHITECTURE.md` §11 y el `PROJECT_STATUS.md` de Fase 1 para el detalle completo. Resumen de los que siguen pendientes de decisión del usuario:

1. Rotación de la `service_role` key de Supabase (acción del usuario, no bloquea el scaffold pero sí bloqueará Auth/Edge Functions).
2. Confirmación sobre el concepto de "coordinador master".
3. Confirmación sobre columnas potencialmente faltantes en `trabajos` (`fecha`/`hora` sugeridas, `extra`, `urgente`, `assigned_at`).
4. Aprobación de la función Postgres `seleccionar_instalador()`.
5. Aprobación del trigger de vínculo `usuarios.auth_id` ↔ `auth.users`.

Ninguno de estos bloquea el scaffold de esta fase; sí bloquearán las fases 7 (Integración con Supabase) y 8 (Realtime) si no se resuelven antes.

> **Actualización (Database Synchronization Audit + Sprint 4.1.1)**: el `pg_dump` real de Producción resuelve, con datos reales en vez de suposiciones, los puntos 3-5: (3) `trabajos` real sí tiene `codigo`/`fecha`/`hora`/`extra`/`urgente`/`asignado_at` -- ver `docs/database/DATABASE_INVENTORY.md` §2.6; (4) la función real se llama `asignar_instalador()`, no `seleccionar_instalador()`, y no es `SECURITY DEFINER` -- ver §5 del mismo documento; (5) no existe un trigger de vínculo `auth_id` -- en Producción, `id` de `admins`/`coordinadores`/`instaladores` **es** directamente la FK a `auth.users(id)`, sin columna intermedia. El punto 1 (rotación de `service_role`) y 2 (coordinador master) siguen abiertos.

## Recomendaciones

- Resolver el bloqueo de red de esta sesión sigue siendo recomendable a mediano plazo (acelera la iteración), pero ya no es bloqueante fase a fase: el usuario está validando cada fase corriendo `npm install`/`lint`/`typecheck`/`build`/`dev` en su propia máquina, como ya hizo exitosamente para la Fase 2.
- Al correr `npm install` para esta Fase 3, prestar atención a los 8 paquetes `@radix-ui/*` nuevos agregados a `package.json` — es la primera vez que se instalan realmente.

## Próximos pasos

Sprint 3.15 (`ConfirmCancel`) implementado, con validación best-effort en verde. Queda a la espera de la validación técnica real, visual y funcional del usuario antes de poder cerrarse formalmente (✅ Completado). No se avanza al Sprint 3.16 sin esa aprobación explícita. No se ejecuta ninguna operación Git — el flujo Git es exclusivamente manual, a cargo del usuario.
