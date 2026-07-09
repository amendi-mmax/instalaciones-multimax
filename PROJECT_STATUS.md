# PROJECT_STATUS.md — HANDYMAX · Multimax Despacho

Última actualización: 2026-07-09 — Sprint 3.6 (`CoordinatorEmptyState`) — ✅ Completado

## Cambio de metodología (vigente desde el Sprint 3.1)

A partir del Sprint 3.1, el proyecto **deja de desarrollarse por Fases grandes** y pasa a una metodología de **Sprints incrementales**: cada Sprint migra exclusivamente una sección específica de `Multimax_Despacho_v1.3.html`, mantiene el proyecto compilando y estable, es independiente y reversible por Git, y se detiene al finalizar para esperar aprobación explícita antes de iniciar el siguiente. La arquitectura de `ARCHITECTURE.md` no cambia por este ajuste de metodología, solo la forma de secuenciar el trabajo restante (antes correspondiente a "Fase 4 — Módulo Coordinator", "Fase 5 — Módulo Installer", etc.).

El índice oficial de Sprints — con su estado y rama Git — vive ahora en **`docs/SPRINTS_INDEX.md`** y se actualiza al cierre de cada Sprint; el detalle de análisis/implementación de cada uno vive en `docs/sprints/sprint-X.Y.md`. Las secciones "Fase 4/5/6..." de este archivo y de `TODO.md` quedan como **registro histórico** de la planificación previa a este cambio; el trabajo real hacia adelante se rastrea en `docs/SPRINTS_INDEX.md`.

Las Fases 1–3 (arquitectura, scaffold, layout general y componentes compartidos) permanecen tal como se aprobaron y no se re-narran aquí — ver las secciones correspondientes más abajo.

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
- `handymax_supabase_schema_v3.sql` copiado **sin ninguna modificación** a `supabase/migrations/0001_initial_schema.sql` (verificado con `diff`, idéntico byte a byte).
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

## Qué falta

- **Sprint 3.6: cerrado, sin pendientes técnicos** (ver "Sprint 3.6 finalizado" arriba).
- **Bloqueante para cerrar el Sprint 3.2**: confirmar en el entorno del usuario `npm install && npm run lint && npm run typecheck && npm run build && npm run dev` en verde sobre la rama `feature/sprint-3-2-mx-instside`.
- A partir de aquí, el trabajo restante (antes descrito como "Fase 4 — Coordinator", "Fase 5 — Installer", "Fase 6 — Admin", etc.) se ejecuta Sprint a Sprint según `docs/SPRINTS_INDEX.md`, cada uno esperando aprobación explícita antes de iniciar el siguiente. La integración con Supabase, Realtime, eliminación de mocks y pruebas finales (antes Fases 7–10) siguen vigentes como trabajo futuro, a re-planificar en Sprints una vez completado el bloque 3.x.
- `CountRing`/`LiveCountdown` (countdown circular de rondas/bids) y los layouts por rol (`CoordinatorLayout`/`InstallerLayout`/`AdminLayout`) siguen fuera de alcance hasta el Sprint que corresponda. Ver `MIGRATION_STATUS.md`.
- Sincronización pendiente entre `SucursalSelect` y el badge de sucursal del Header (reportado, no corregido) — ver "Problema encontrado" en `docs/sprints/sprint-3.4.md`; queda como trabajo futuro, no bloquea el cierre de ningún Sprint.
- `onPublish` sin lógica real en `PublishModal` (reportado, no corregido) — ver "Problema encontrado" en `docs/sprints/sprint-3.5.md`; pendiente para el Sprint que implemente `jobs`/`Trabajo` real.
- El resto de `Coordinator()` (`mx-jobcard`, `QueueBar`, Radar, `AssignedPanel`, `NoResponsePanel`, respuestas, indicadores) queda pendiente de un Sprint que también implemente `jobs`/`publishJob` real — ver "Problema encontrado / decisión" en `docs/sprints/sprint-3.6.md`.

## Problemas encontrados (heredados de Fase 1, siguen sin resolver)

Ver `ARCHITECTURE.md` §11 y el `PROJECT_STATUS.md` de Fase 1 para el detalle completo. Resumen de los que siguen pendientes de decisión del usuario:

1. Rotación de la `service_role` key de Supabase (acción del usuario, no bloquea el scaffold pero sí bloqueará Auth/Edge Functions).
2. Confirmación sobre el concepto de "coordinador master".
3. Confirmación sobre columnas potencialmente faltantes en `trabajos` (`fecha`/`hora` sugeridas, `extra`, `urgente`, `assigned_at`).
4. Aprobación de la función Postgres `seleccionar_instalador()`.
5. Aprobación del trigger de vínculo `usuarios.auth_id` ↔ `auth.users`.

Ninguno de estos bloquea el scaffold de esta fase; sí bloquearán las fases 7 (Integración con Supabase) y 8 (Realtime) si no se resuelven antes.

## Recomendaciones

- Resolver el bloqueo de red de esta sesión sigue siendo recomendable a mediano plazo (acelera la iteración), pero ya no es bloqueante fase a fase: el usuario está validando cada fase corriendo `npm install`/`lint`/`typecheck`/`build`/`dev` en su propia máquina, como ya hizo exitosamente para la Fase 2.
- Al correr `npm install` para esta Fase 3, prestar atención a los 8 paquetes `@radix-ui/*` nuevos agregados a `package.json` — es la primera vez que se instalan realmente.

## Próximos pasos

Esperar aprobación explícita del usuario antes de iniciar el Sprint 3.7. No se avanza automáticamente a ningún Sprint siguiente.
