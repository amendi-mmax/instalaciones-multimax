# Sprint 3.1 - Migración del Header

Rama: `feature/sprint-3-1-header`
Estado: 🟡 En revisión — Sprint 3.1.1 aplicó las correcciones de compilación reportadas por el usuario; queda pendiente que el usuario confirme localmente `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` en verde para pasar a ✅ Completado (ver sección "Sprint 3.1.1 — Cierre y validación" más abajo).

## Objetivo

Reconstruir fielmente, componente por componente, el `<header class="mx-top">` de `Multimax_Despacho_v1.3.html` — y únicamente ese elemento. Nada de Sidebar, Top Navigation (subtabs), Coordinator, Installer, Admin, lógica de negocio, Supabase, Auth o React Query en este Sprint.

## Alcance

**Dentro de alcance**: todo lo que está estructuralmente dentro de la etiqueta `<header className="mx-top">...</header>` del componente `App()`.

**Fuera de alcance**: todo lo que está fuera de esa etiqueta, incluido el bloque `mx-subtabs-wrap` que aparece inmediatamente después del `</header>` (pertenece a Coordinator/Top Navigation, Sprint 3.3 o posterior) y cualquier página/feature.

## Análisis del HTML (obligatorio, previo a la implementación)

### Ubicación exacta en el archivo fuente

`Multimax_Despacho_v1.3.html`, función `App()`, líneas **2029–2071** (código fuente `React.createElement`, no minificado — ver método de lectura abajo).

### Bloque del HTML migrado (JSX de referencia, transcrito literalmente)

```jsx
<header className="mx-top">
  <div className="mx-brand">
    <div className="mx-logo">
      <Radio size={18} />
    </div>
    <div>
      <div className="mx-brand-t">MULTIMAX</div>
      <div className="mx-brand-s">Despacho en vivo</div>
    </div>
  </div>

  <div className="mx-roleswitch">
    <button className={role === "coord" ? "on" : ""} onClick={() => setRole("coord")}>
      <Activity size={14} />Coordinador
    </button>
    <button className={role === "inst" ? "on" : ""} onClick={() => setRole("inst")}>
      <User size={14} />Instalador
    </button>
    <button className={role === "admin" ? "on" : ""} onClick={() => setRole("admin")}>
      <Settings size={14} />Admin
    </button>
  </div>

  <div className="mx-topright">
    {role === "admin" && (
      <span className="mx-master-badge"><Zap size={12} />Vista master</span>
    )}
    {role === "coord" && <Pill tone="muted">{sucursalCoord}</Pill>}
    {jobs.length > 0 && role === "coord" && (
      <button className="mx-ghost" onClick={resetAll}>
        <RotateCcw size={13} />Reiniciar
      </button>
    )}
  </div>
</header>
```

### Elementos HTML que contiene

- `<header class="mx-top">` — contenedor raíz, `position: sticky; top: 0`, fondo translúcido con blur.
- `.mx-brand` → `.mx-logo` (ícono `Radio` de Lucide, tamaño 18) + bloque de texto (`.mx-brand-t` "MULTIMAX", `.mx-brand-s` "Despacho en vivo").
- `.mx-roleswitch` → exactamente 3 `<button>`: Coordinador (ícono `Activity`), Instalador (ícono `User`), Admin (ícono `Settings`), todos tamaño 14. Exactamente uno tiene la clase `on` según el rol activo.
- `.mx-topright` → hasta 3 elementos **condicionales, mutuamente no excluyentes entre sí** (pueden combinarse, aunque en la práctica el estado inicial del prototipo solo activa el segundo):
  1. `.mx-master-badge` (ícono `Zap` tamaño 12 + texto "Vista master") — solo si `role === "admin"`.
  2. `Pill tone="muted"` con el texto de `sucursalCoord` — solo si `role === "coord"`.
  3. `.mx-ghost` (ícono `RotateCcw` tamaño 13 + texto "Reiniciar") — solo si `role === "coord"` **y** `jobs.length > 0`.

### Componentes React que surgen de esta sección

| Componente | Responsabilidad | Nuevo/Reutilizado |
| --- | --- | --- |
| `Header` | Contenedor `<header class="mx-top">`, compone los tres siguientes | Nuevo (ya existía un placeholder de Fase 3, se reescribe) |
| `HeaderBrand` | `.mx-brand` (logo + nombre + tagline) — estático, sin props | Nuevo |
| `HeaderRoleSwitch` | `.mx-roleswitch` (3 botones de rol) | Nuevo (extraído del `Header` de Fase 3) |
| `HeaderStatus` | `.mx-topright` (badge master / pill de sucursal / botón reiniciar, condicionales) | Nuevo |

**No se crean** `HeaderUser`, `HeaderAvatar` ni `HeaderNotifications`: se verificó exhaustivamente (`grep -i "notif"`, `grep -i "avatar"`, `grep -i "usuario\|user-menu"` sobre el `<header>`) que el prototipo **no tiene** avatar de usuario, menú de usuario ni centro de notificaciones en el Header. El listado de componentes de ejemplo del Sprint (`HeaderUser`/`HeaderNotifications`) es un template genérico — se sigue la regla del Sprint de "crear únicamente los componentes existentes dentro del Header" y "si un texto no existe en el HTML, no debe aparecer en la aplicación".

### Componentes reutilizables (de fases anteriores, no se recrean)

- `Badge` (`components/ui/badge.tsx`, Fase 3) — se reutiliza para el `Pill tone="muted"` (renombrado a `Badge` en Fase 3, ver `ARCHITECTURE.md` §13.1) y para el `.mx-master-badge` (mismo componente, tono nuevo si aplica — ver "Implementación").

### Dependencias con otras partes del HTML

- `HeaderRoleSwitch` necesita el estado `role` y su setter — ya resuelto en Fase 3 (`RootLayout.tsx` mantiene `useState<Rol>` local como placeholder hasta la Fase de Auth). Sin cambios en esa decisión.
- `HeaderStatus` necesita `sucursalCoord` (estado real del Coordinator, todavía no implementado) y `jobs.length`/`resetAll` (estado real de Despacho en vivo, todavía no implementado). **Resolución para este Sprint**: `HeaderStatus` recibe estos datos como props con valores por defecto fieles al estado inicial del prototipo (`sucursalActiva = "Multiplaza"`, `hasActiveJobs = false`, sin `onReset`). `RootLayout` no implementa lógica de Coordinator — simplemente no pasa esas props y deja que los valores por defecto reproduzcan el estado inicial exacto del prototipo. Cuando el Sprint que implemente el Despacho en vivo exista, conectará estas props a datos reales sin tocar `Header`/`HeaderStatus`.
- El bloque `mx-subtabs-wrap` (subtabs "Despacho en vivo"/"Mis trabajos") es **hermano** de `<header>`, no está anidado dentro — confirmado leyendo el JSX línea por línea. Queda completamente fuera de este Sprint.

### Qué NO será migrado todavía

- `mx-subtabs-wrap`/`mx-subtabs` (Top Navigation del Coordinator) — Sprint 3.3 o el Sprint de Coordinator, a definir.
- `mx-suc-sel` (selector de sucursal activa) — depende de Coordinator.
- Cualquier lógica real de `role`, `jobs`, `resetAll` — depende de Auth (rol) y de Despacho en vivo (jobs/reset).

## Problema encontrado (reportado, no corregido silenciosamente)

El archivo HTML contiene **dos representaciones del Header que no coinciden entre sí**:

1. El **código fuente** (`React.createElement`, líneas 2029–2071, dentro de `<script>`) — tratado como la especificación autoritativa en este Sprint, porque es el código que realmente genera la interfaz.
2. Un **snapshot de DOM ya renderizado**, embebido de forma estática en `<div id="root">` (línea 457), que muestra:
   - Solo **2** botones en `.mx-roleswitch` (Coordinador, Instalador) — falta el botón "Admin" que sí existe en el código fuente.
   - El contenido de `.mx-topright` es `<span class="mx-pill">Sesión local</span>`, un texto que **no aparece en ninguna parte del código fuente** (`grep -i "sesión local"` no encuentra coincidencias fuera de esa línea).

Esto indica que el snapshot de DOM es un artefacto obsoleto (probablemente guardado desde una versión anterior del prototipo, antes de agregarse el rol "Admin" y los badges condicionales de `mx-topright`), no el estado actual de la aplicación. **Se sigue el código fuente como referencia** por ser la especificación ejecutable; se reporta esta discrepancia para que el usuario la confirme o la corrija en el archivo fuente si lo considera necesario — no se modifica el HTML.

## Componentes implementados

- `Header` (`src/components/shared/header.tsx`) — contenedor `<header class="mx-top">`, reescrito para componer los tres siguientes.
- `HeaderBrand` (`src/components/shared/header-brand.tsx`) — `.mx-brand` (logo + nombre + tagline), estático.
- `HeaderRoleSwitch` (`src/components/shared/header-role-switch.tsx`) — `.mx-roleswitch` (3 botones de rol).
- `HeaderStatus` (`src/components/shared/header-status.tsx`) — `.mx-topright` (badge master / pill de sucursal / botón reiniciar, los 3 condicionales exactos del código fuente).

## Componentes reutilizables creados

Ninguno nuevo en `components/ui/` — este Sprint reutiliza `Badge` (creado en Fase 3) para el pill de sucursal. No se creó ningún componente genérico nuevo, conforme a la regla "no crear componentes genéricos innecesarios" del Sprint.

## Archivos creados

- `docs/SPRINTS_INDEX.md`
- `docs/sprints/sprint-3.1.md`
- `src/components/shared/header-brand.tsx`
- `src/components/shared/header-role-switch.tsx`
- `src/components/shared/header-status.tsx`

## Archivos modificados

- `src/components/shared/header.tsx` — reescrito para componer `HeaderBrand`/`HeaderRoleSwitch`/`HeaderStatus` en vez del `rightSlot: ReactNode` genérico de Fase 3.
- `src/layouts/RootLayout.tsx` — ya no pasa `rightSlot`; usa los valores por defecto de `HeaderStatus`.
- `src/routes/AppRouter.tsx` — se quitó la ruta que renderizaba `LayoutShowcasePage`; `/` renderiza `RootLayout` sin contenido de relleno en el `<Outlet/>`.

## Archivos eliminados

- `src/pages/LayoutShowcasePage.tsx` — vitrina de componentes creada en Fase 3, incompatible con la nueva regla explícita "no debes crear una vitrina de componentes". Ver `docs/SPRINTS_INDEX.md`, sección "Notas de alcance".

## Pruebas realizadas

Mismo bloqueo de red que fases anteriores (`registry.npmjs.org` fuera del *allowlist* de este entorno) — no fue posible ejecutar `npm install`/`npm run lint`/`npm run dev` reales aquí. Validación best-effort con herramientas ajenas al proyecto ya presentes en el entorno:

- `tsc --noEmit` con la configuración real del proyecto + declaraciones ambientales stub (mismo método de Fase 3): **cero errores nuevos** introducidos por este Sprint. El conteo total de diagnósticos del stub bajó de 48 a 47 (se eliminó exactamente el que correspondía a `LayoutShowcasePage`, ahora borrado); ninguno de los 47 restantes toca `header*.tsx`, `RootLayout.tsx` ni `AppRouter.tsx`.
- `prettier --check` (sin el plugin de Tailwind, no instalable aquí): cero diferencias de formato en todo `src/`.
- Verificación manual línea por línea del bloque `<header>` del código fuente contra el JSX reconstruido (ver tabla de la sección de análisis).

**Pendiente de confirmar por el usuario en su máquina**: `npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`.

## Problemas encontrados

1. Discrepancia entre el snapshot de DOM estático y el código fuente `React.createElement` del Header — ver sección "Problema encontrado" arriba. Reportado, no corregido (no se modifica el HTML).
2. El `Header` de Fase 3 tenía el ícono del logo equivocado (`RadioTower` en vez de `Radio`).
3. El `Header` de Fase 3 no reconstruía los 3 condicionales reales de `.mx-topright` — mostraba un badge estático "Sesión local" tomado del snapshot de DOM obsoleto (ver problema 1), en vez de la lógica `role === "admin" | "coord"` + `jobs.length > 0` del código fuente.
4. `LayoutShowcasePage.tsx` (Fase 3) violaba directamente la nueva regla "no crear una vitrina de componentes".

## Problemas corregidos

Los 4 anteriores quedaron corregidos en este Sprint: ícono `Radio` correcto, `.mx-topright` reconstruido con sus 3 condicionales exactos y props para desacoplar los datos de Coordinator (no implementados todavía), y `LayoutShowcasePage` eliminado junto con su ruta.

## Riesgos

- `HeaderStatus` depende de datos que hoy son props con valores por defecto (`sucursalActiva`, `hasActiveJobs`, `onReset`). Cuando el Sprint de Despacho en vivo/Coordinator exista, debe conectarlos sin modificar `Header`/`HeaderStatus` — si el nombre o la forma de esos props cambia en ese momento, revisar este Sprint.
- La discrepancia snapshot-vs-código-fuente (problema 1) podría repetirse en otras secciones del HTML todavía no analizadas — se recomienda aplicar el mismo criterio (código fuente como especificación autoritativa) y reportarlo Sprint a Sprint si aparece de nuevo.

## Cobertura del HTML (este Sprint)

Ver `MIGRATION_STATUS.md` para el detalle numérico agregado. Este Sprint migra el 100% del `<header class="mx-top">` (32 líneas de JSX fuente / 12 líneas de CSS de `.mx-top`/`.mx-brand*`/`.mx-roleswitch*`/`.mx-topright`/`.mx-ghost*`/`.mx-master-badge`, ya portadas en Fase 3).

## Sprint 3.1.1 — Cierre y validación (2026-07-03)

Sub-iteración de cierre, solicitada explícitamente por el usuario tras correr las validaciones reales en su máquina y reportar 3 errores de compilación. **No migra ningún componente nuevo, no cambia el alcance del Sprint 3.1, no toca el Header.** Único objetivo: corregir los errores de TypeScript reportados para que el proyecto compile.

### Problema detectado

`npm run typecheck` (real, en la máquina del usuario) falló en tres archivos con el mismo patrón:

- `src/components/shared/sidebar.tsx` (`SidebarCardProps`)
- `src/components/ui/card.tsx` (`CardHeaderProps`)
- `src/components/ui/toast.tsx` (`ToastProps`)

Los tres declaran `interface X extends HTMLAttributes<HTMLDivElement> { ...; title: ReactNode; ... }`. `HTMLAttributes<HTMLDivElement>` (tipos reales de `@types/react`, no el stub de este sandbox) ya define `title?: string` (el atributo HTML nativo de tooltip). Redefinir `title` con el tipo `ReactNode` — más amplio que `string | undefined` — es una extensión de interfaz incompatible, y TypeScript lo rechaza en tiempo de compilación real.

**Nota sobre por qué esto no se detectó en el Sprint 3.1**: la validación best-effort de este sandbox (sin acceso a `registry.npmjs.org`) usa un archivo de declaraciones ambientales `declare module 'react' { export type HTMLAttributes<T = any> = any; export type ReactNode = any; ... }` para simular React sin `node_modules` real. Con `HTMLAttributes`/`ReactNode` aproximados como `any`, el conflicto de tipos desaparece — es un punto ciego conocido de esta metodología de validación, no un error de proceso. Se verificó reintroduciendo temporalmente el código original en un archivo de prueba: efectivamente, el stub no lo detecta, confirmando que solo la validación real del usuario (`@types/react` real) podía encontrarlo — tal como ocurrió.

### Corrección aplicada

Se optó por la estrategia de **renombrar la propiedad** (en vez de `Omit<HTMLAttributes<HTMLDivElement>, 'title'>`) para eliminar el conflicto de forma explícita y auto-documentada, ya que ninguno de los tres componentes tiene todavía consumidores en el código (verificado con `grep` — no hay ningún `<CardHeader`, `<SidebarCard` ni `<Toast` en `src/`), así que el renombre no rompe ningún call-site existente:

- `card.tsx`: `CardHeaderProps.title` → `cardTitle`.
- `sidebar.tsx`: `SidebarCardProps.title` → `sidebarTitle`.
- `toast.tsx`: `ToastProps.title` → `toastTitle`.

En los tres casos se agregó un comentario JSDoc explicando el motivo del renombre, y se actualizó el único lugar donde la variable se usa dentro de cada componente (el `<span>{title}</span>` / `<p>{title}</p>` interno). No se tocó ningún otro prop, clase CSS, texto visible ni comportamiento visual — el JSX renderizado es idéntico al de antes del renombre, solo cambia el nombre de la prop que un futuro consumidor deberá usar.

### Archivos modificados

- `src/components/ui/card.tsx`
- `src/components/ui/toast.tsx`
- `src/components/shared/sidebar.tsx`

Ningún archivo del Header (`header.tsx`, `header-brand.tsx`, `header-role-switch.tsx`, `header-status.tsx`, `RootLayout.tsx`, `AppRouter.tsx`) fue modificado en esta sub-iteración.

### Validaciones

Mismo bloqueo de red de siempre en este sandbox — no fue posible ejecutar aquí `npm install`/`npm run lint`/`npm run dev` reales. Se repitió la validación best-effort ya usada en Fases 2/3 y Sprint 3.1:

- `tsc --noEmit` (config real del proyecto + stubs ambientales): **0 diagnósticos** (bajó de los ~47 reportados al cierre del Sprint 3.1 a 0 — la razón exacta de esa caída no está clara con el stub usado, ver nota de punto ciego arriba; en cualquier caso, cero errores en los tres archivos corregidos ni en el resto del proyecto).
- `prettier --check`: cero diferencias de formato en todo `src/`.
- Verificación estructural: ninguno de los tres archivos corregidos vuelve a declarar una propiedad llamada `title` en una interfaz que extienda `HTMLAttributes<...>`, por lo que el conflicto queda eliminado independientemente de la precisión del stub de validación.

**Sigue pendiente, y es lo único que falta para cerrar formalmente el Sprint 3.1**: que el usuario confirme en su máquina, en verde, las cuatro validaciones reales exigidas —

```
npm run lint
npm run typecheck
npm run build
npm run dev
```

En cuanto el usuario confirme las cuatro en verde, el estado de este Sprint pasa de 🟡 En revisión a ✅ Completado (actualización a aplicar en `docs/SPRINTS_INDEX.md`, `PROJECT_STATUS.md`, `CHANGELOG.md` y este archivo).

## Próximo Sprint

3.2 — Sidebar (pendiente de definir con el usuario cuál es el elemento exacto del HTML: el prototipo no tiene un sidebar de navegación persistente; el único elemento con ese nombre visual es `.mx-instside` del panel del Instalador, ya reconstruido estructuralmente en Fase 3 como `components/shared/sidebar.tsx`). Se recomienda confirmar el alcance antes de iniciar 3.2. **No se inicia bajo ninguna circunstancia hasta que el usuario apruebe explícitamente el cierre del Sprint 3.1 (ver "Sprint 3.1.1" arriba).**
