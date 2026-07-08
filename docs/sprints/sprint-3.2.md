# Sprint 3.2 - Migración del bloque `mx-instside`

Rama: `feature/sprint-3-2-mx-instside`
Estado: 🟡 En progreso — implementación y validación best-effort completas (incluida la integración visual temporal de Sprint 3.2.1 y su corrección en Sprint 3.2.2, ver secciones dedicadas más abajo); falta que el usuario confirme localmente `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` en verde para pasar a ✅ Completado (mismo criterio aplicado en Sprint 3.1.1: el estado no pasa a Completado hasta esa confirmación real).

A partir de este Sprint, cada Sprint representa exclusivamente un bloque real del HTML (identificado por su clase/selector), no un nombre genérico ("Sidebar", "Navigation", etc. quedan retirados como convención de nombrado de Sprints).

## Objetivo

Reconstruir fielmente, componente por componente, el bloque `<aside class="mx-instside">` de `Multimax_Despacho_v1.3.html` — y únicamente ese bloque. Nada de `mx-phone`/`mx-phone-bar`/`mx-phonetabs`, navegación, contenido principal, Coordinator, Admin, lógica de negocio, Supabase, Auth, Realtime o React Query en este Sprint.

## Fase de análisis (obligatoria, previa a la implementación)

### Ubicación exacta en el archivo fuente

`Multimax_Despacho_v1.3.html`, función `Installer(props)` (línea 3169), dentro de su `return`. El bloque `mx-instside` es el **último hijo** de `<div class="mx-instwrap">`, hermano de `<div class="mx-phone">`.

- **Línea donde inicia el bloque**: 3422 (`React.createElement("aside", { className: "mx-instside" }, ...`)
- **Línea donde termina el bloque**: 3449 (cierra `aside` — coincide con el cierre de todo el `return` de `Installer()`; la función termina en la línea 3450)
- **Selector CSS raíz**: `.mx-instside` (declarado en la línea 240 del `<style>`; regla responsive `order:-1` en la línea 256 dentro de `@media (max-width:920px)`)

### Bloque del HTML migrado (JSX de referencia, transcrito literalmente)

```jsx
<aside className="mx-instside">
  <div className="mx-card mx-mini">
    <div className="mx-section-h">
      <span><User size={14} />Tu perfil</span>
    </div>
    <div className="mx-profile">
      <div><Star size={13} className="mx-starc" /><b>{meInfo.rating}</b> calificación</div>
      <div><Navigation size={13} /><b>{meInfo.km} km</b> al trabajo</div>
      <div><ShieldCheck size={13} /><b>{meInfo.cumpl}%</b> cumplimiento</div>
      <div><TrendingUp size={13} /><b>{meInfo.acept}%</b> aceptación</div>
    </div>
  </div>
  <div className="mx-card mx-mini">
    <div className="mx-section-h">
      <span><ShieldAlert size={14} />Reglas de prioridad</span>
    </div>
    <ul className="mx-rules">
      <li>Responder rápido y cumplir <b>sube</b> tu prioridad.</li>
      <li>Ignorar solicitudes <b>baja</b> tu prioridad.</li>
      <li>Cancelar tras aceptar afecta tu calificación.</li>
      <li>El precio más bajo no garantiza la asignación.</li>
      <li>No puedes aceptar dos trabajos con horarios en conflicto.</li>
    </ul>
  </div>
</aside>
```

(Reconstruido en JSX legible a partir de los `React.createElement` reales de las líneas 3422-3449 — el contenido, orden, props e íconos son idénticos; solo se cambió la notación de `React.createElement` a JSX para lectura.)

### Clases CSS involucradas

| Clase | Declarada en (CSS fuente) | Estado antes de este Sprint |
| --- | --- | --- |
| `.mx-instside` | línea 240 (+ `order:-1` en línea 256, `@media max-width:920px`) | Ya portada en Fase 3 (`globals.css`) |
| `.mx-card` | (compartida con Header/Card genérico, ya portada en Fase 3) | Ya portada |
| `.mx-mini` | línea 241 | Ya portada en Fase 3 |
| `.mx-section-h` | (compartida, ya portada en Fase 3 para `Card`/`Header`) | Ya portada |
| `.mx-profile` (+ `> div`, `b`, `svg`) | líneas 242-245 | Ya portada en Fase 3 |
| `.mx-rules` (+ `li`, `li:before`, `b`) | líneas 246-249 | Ya portada en Fase 3 |
| `.mx-starc` | línea 117 | **Faltaba** — agregada en este Sprint (ver "Problemas encontrados") |

Ninguna clase nueva de layout (`.mx-instwrap`, `.mx-phone*`) se toca — ya existían y no son parte de este bloque.

### Estructura HTML / elementos hijos

```
aside.mx-instside
├── div.mx-card.mx-mini                 (tarjeta "Tu perfil")
│   ├── div.mx-section-h
│   │   └── span > [User(14), "Tu perfil"]
│   └── div.mx-profile
│       ├── div > [Star(13, .mx-starc), b(rating), " calificación"]
│       ├── div > [Navigation(13), b(km, " km"), " al trabajo"]
│       ├── div > [ShieldCheck(13), b(cumpl, "%"), " cumplimiento"]
│       └── div > [TrendingUp(13), b(acept, "%"), " aceptación"]
└── div.mx-card.mx-mini                 (tarjeta "Reglas de prioridad")
    ├── div.mx-section-h
    │   └── span > [ShieldAlert(14), "Reglas de prioridad"]
    └── ul.mx-rules
        ├── li > ["Responder rápido y cumplir ", b("sube"), " tu prioridad."]
        ├── li > ["Ignorar solicitudes ", b("baja"), " tu prioridad."]
        ├── li > "Cancelar tras aceptar afecta tu calificación."
        ├── li > "El precio más bajo no garantiza la asignación."
        └── li > "No puedes aceptar dos trabajos con horarios en conflicto."
```

Íconos usados (lucide-react, ya en `package.json`): `User`, `Star`, `Navigation`, `ShieldCheck`, `TrendingUp`, `ShieldAlert`.

### Componentes React que surgen de esta sección

Solo se dividió donde el HTML ya representa componentes claramente diferenciados (dos tarjetas con contenido distinto, envueltas en una estructura común):

| Componente | Corresponde a | Nuevo/reutilizado |
| --- | --- | --- |
| `InstallerSidebar` | `<aside class="mx-instside">` completo (compone los dos siguientes) | Nuevo (reemplaza el `Sidebar` estructural de Fase 3) |
| `InstallerSidebarCard` | `.mx-card.mx-mini` + `.mx-section-h` (envoltorio compartido por las 2 tarjetas) | Nuevo (reemplaza el `SidebarCard` estructural de Fase 3) |
| `InstallerProfileSummary` | `.mx-profile` (contenido de la tarjeta "Tu perfil") | Nuevo |
| `InstallerPriorityRules` | `.mx-rules` (contenido de la tarjeta "Reglas de prioridad", versión de 5 ítems) | Nuevo |

No se crearon `InstallerStats`, `InstallerAvailability`, `InstallerInformation` ni `InstallerActions` (ejemplos del enunciado) porque no existe ningún elemento correspondiente dentro de `mx-instside` — verificado leyendo línea por línea las 3422-3449. Solo existen las dos tarjetas ya descritas.

### Por qué no se llama `InstallerProfile` a la tarjeta "Tu perfil"

El HTML fuente ya tiene una función `InstallerProfile()` (línea 3491) — la pantalla completa de perfil dentro del teléfono (`.mx-profscreen`, con avatar/hero/stats/reglas), que `ARCHITECTURE.md` §3-4 mapea a `pages/installer/PerfilPage.tsx` (Sprint futuro, fuera de `mx-instside`). Usar el mismo nombre para la tarjeta mini de este Sprint habría creado una colisión conceptual con un componente que este proyecto todavía no tiene. Se usa `InstallerProfileSummary` en su lugar.

### Componentes reutilizables (de Sprints/fases anteriores, no se recrean)

Ninguno directamente reutilizado — `InstallerSidebarCard` es de nueva creación en este Sprint (ver arriba por qué no se reutilizó el genérico `SidebarCard`/`CardHeader` de Fase 3: este Sprint reescribe ese mismo bloque, no lo reutiliza desde otro).

### Dependencias con otras partes del HTML

- **`.mx-instwrap`** (grid de 2 columnas que envuelve `.mx-phone` y `.mx-instside` como hermanos) — no se migra en este Sprint; ya estaba portado en Fase 3 como CSS, pero el componente que lo renderiza (`layouts/InstallerLayout.tsx`, según `ARCHITECTURE.md` §3) no existe todavía. `InstallerSidebar` no se monta en ningún lugar por ahora.
- **`meInfo` (`INSTALLERS.find(i => i.id === meId)`)**: en el prototipo, los 4 valores de "Tu perfil" (`rating`, `km`, `cumpl`, `acept`) vienen del instalador activo (`meId`, seleccionado con el dropdown `mx-mesel` de `.mx-phone-bar`, fuera de este Sprint). Aquí se modelan como props obligatorias de `InstallerProfileSummary`/`InstallerSidebar` — sin datos mock ni valores por defecto inventados, ya que no hay ningún consumidor real todavía (ver "Qué NO será migrado todavía").
- **Modelo de dominio (`types/domain.ts`)**: `Usuario` (alias `Instalador`) ya tiene `rating`, `cumplimiento`, `aceptacion` — se usaron esos nombres (no las abreviaturas `cumpl`/`acept` del prototipo) por consistencia con la convención ya establecida en Fase 1. **`km` no existe en `Usuario`** ni en el schema SQL — ver "Problemas encontrados/Riesgos".
- **Segunda ocurrencia de "Reglas de prioridad"**: `InstallerProfile()` (línea 3491, `.mx-profblock`, fuera de este Sprint) tiene su propia lista `.mx-rules` con **solo 4 ítems** (le falta "No puedes aceptar dos trabajos..."). `ARCHITECTURE.md` §3 ya reserva el nombre `PriorityRulesCard` para esa otra ocurrencia (`features/instalador-perfil/components/PriorityRulesCard.tsx`). Este Sprint no toca esa segunda lista ni intenta unificar ambas — ver "Problemas encontrados".

### Qué NO será migrado todavía

- `.mx-instwrap`, `.mx-phone`, `.mx-phone-bar`, `.mx-mesel`, `.mx-phonetabs` (layout/navegación del teléfono del Instalador).
- `InstallerJobs()` (`mx-myjobs`), `InstallerProfile()` (`mx-profscreen`, pantalla completa) y el flujo `alert/offer/done` (`body` de `Installer()`).
- Cualquier página, ruta o `layouts/InstallerLayout.tsx` que monte `InstallerSidebar` — no existe todavía ningún Sprint de layout/dashboard del Instalador.
- Datos reales / hooks / Supabase para alimentar `InstallerProfileSummary` — sigue siendo responsabilidad de un Sprint futuro (`features/instalador-perfil` o similar, ya planificado en `ARCHITECTURE.md`).

## Problema encontrado (reportado, no corregido silenciosamente)

**Clase CSS `.mx-starc` faltante desde Fase 3.** El ícono `Star` de "Tu perfil" usa `className="mx-starc"` (línea 3434 del HTML fuente), que en el `<style>` original se declara en la línea 117 (`color:var(--amber)`) — junto a otros usos no relacionados con este Sprint (`ResponsesFeed` del Coordinator, `AdminInstaladores`, ninguno migrado todavía). Fase 3 portó `.mx-instside`/`.mx-mini`/`.mx-profile`/`.mx-rules` pero **no** `.mx-starc`, probablemente porque en ese momento no se había construido el contenido real de la tarjeta "Tu perfil" (solo el contenedor estructural). Se agregó la declaración verbatim (`color: var(--amber)`) a `globals.css`, con un comentario indicando que también la usarán bloques futuros no relacionados con `mx-instside`.

## Archivos creados

- `docs/sprints/sprint-3.2.md`
- `src/components/shared/installer-sidebar.tsx` (`InstallerSidebar`)
- `src/components/shared/installer-sidebar-card.tsx` (`InstallerSidebarCard`)
- `src/components/shared/installer-profile-summary.tsx` (`InstallerProfileSummary`)
- `src/components/shared/installer-priority-rules.tsx` (`InstallerPriorityRules`)

## Archivos modificados

- `src/styles/globals.css` — agregada la regla `.mx-starc { color: var(--amber); }` (faltante, ver "Problema encontrado"). Ninguna otra clase se tocó.

## Archivos eliminados

- `src/components/shared/sidebar.tsx` — contenía el `Sidebar`/`SidebarCard` estructural de Fase 3 (sin contenido real), completamente reemplazado por los 4 archivos nuevos de arriba. Verificado con `grep` que no tenía ningún consumidor (`<Sidebar`, `<SidebarCard`, ni imports desde `shared/sidebar`) antes de eliminarlo — mismo criterio que la reescritura de `Header` en Sprint 3.1.

No se modificó ningún archivo de Header (`header*.tsx`, `RootLayout.tsx`, `AppRouter.tsx`) ni ningún componente de `components/ui/` — verificado con `git diff` antes de cerrar el Sprint.

## Validaciones ejecutadas

Esta sesión en la nube sigue sin acceso a `registry.npmjs.org`; no fue posible ejecutar aquí `npm install`/`npm run lint`/`npm run dev` reales. Validación best-effort (mismo método de Fases 2-3 y Sprint 3.1):

- `tsc --noEmit` (config real del proyecto + stubs ambientales, actualizados con `ShieldAlert` que faltaba en el stub de `lucide-react`): **0 diagnósticos**.
- `prettier --check` sobre `src/**/*.{ts,tsx}` y `src/styles/globals.css`: cero diferencias.
- Verificación de balance de llaves `{}` de `globals.css`: 154 aperturas / 154 cierres.
- `package.json` re-verificado como JSON válido (no se tocó en este Sprint).
- Reproducción de fidelidad de espaciado JSX: se transpiló con `tsc` un fragmento aislado equivalente a los párrafos de `InstallerProfileSummary`/`InstallerPriorityRules` y se comparó, children por children, contra los `React.createElement(...)` reales del HTML fuente — coincide exactamente (mismo orden, mismos nodos de texto, mismos espacios).

**Pendiente de confirmar por el usuario en su máquina**: `npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`.

## Problemas encontrados

1. `.mx-starc` faltaba en `globals.css` desde Fase 3 — ver sección dedicada arriba.
2. `km` (distancia al trabajo) no tiene campo equivalente en el modelo de dominio `Usuario`/`types/domain.ts` ni en el schema SQL — solo existe en el mock `INSTALLERS` del prototipo.
3. El HTML fuente tiene dos versiones ligeramente distintas de "Reglas de prioridad" (5 ítems en `mx-instside`, 4 ítems en `InstallerProfile()`/`mx-profblock`) — no es un error de este Sprint, pero es una inconsistencia real del HTML a tener en cuenta cuando se migre `InstallerProfile()`.

## Problemas corregidos

Solo el problema 1 (`.mx-starc` faltante) requería corrección en este Sprint y se corrigió (ver "Archivos modificados"). Los problemas 2 y 3 son reportados como riesgos/dependencias para Sprints futuros — no se resuelven aquí porque hacerlo implicaría anticipar trabajo (inventar de dónde sale `km`, o "corregir" la lista de 4 ítems de `InstallerProfile()`) fuera del alcance de `mx-instside`.

## Dependencias detectadas

- `layouts/InstallerLayout.tsx` (no existe todavía) deberá montar `InstallerSidebar` junto a `PhoneFrame` dentro de un contenedor `.mx-instwrap` — Sprint futuro, según `ARCHITECTURE.md` §3.
- Los datos reales de `InstallerProfileSummary` (`rating`, `km`, `cumplimiento`, `aceptacion`) dependerán de un hook futuro (`useMiPerfil`, ya anticipado en `ARCHITECTURE.md` §3 bajo `features/instalador-perfil/`) — no implementado en este Sprint (no hay lógica de negocio ni Supabase).
- La segunda versión de "Reglas de prioridad" (4 ítems, dentro de `InstallerProfile()`) tendrá que decidir, en su propio Sprint, si reutiliza `InstallerPriorityRules` (y en tal caso cuál de las dos listas es la correcta) o si crea su propio componente (`PriorityRulesCard`, ya reservado en `ARCHITECTURE.md`) — no se prejuzga aquí.

## Riesgos

- `InstallerSidebar` no se renderiza desde ninguna ruta/página todavía (no hay Sprint de layout del Instalador aún) — es código nuevo pero no ejecutado en ningún flujo real hasta que exista ese Sprint. Riesgo bajo: los componentes son puros (sin estado, sin efectos), su corrección se verifica por inspección/tipado, no por ejecución en pantalla.
- La falta de `km` en el modelo de dominio deberá resolverse antes de conectar `InstallerProfileSummary` a datos reales (Fase de integración con Supabase) — no bloquea este Sprint, que es solo reconstrucción visual.

## Porcentaje del HTML reconstruido (este Sprint)

`mx-instside` migrado al 100% (28 líneas de JSX fuente, líneas 3422-3449; 3 clases CSS nuevas o completadas — solo `.mx-starc` requirió adición, el resto ya estaba portado en Fase 3). Ver `MIGRATION_STATUS.md` para el detalle agregado del proyecto.

## Sprint 3.2.1 — Integración visual temporal de `InstallerSidebar` (2026-07-03)

Sub-iteración solicitada explícitamente por el usuario. **No es un Sprint nuevo de migración del HTML, no corresponde al Sprint 3.3, no migra ningún bloque adicional.** Único objetivo: hacer visible en el navegador el `InstallerSidebar` construido en el Sprint 3.2, que hasta ahora no tenía ningún layout/página que lo montara.

### Nota sobre el nombre de rama

El usuario pidió trabajar sobre `feature/sprint-3-2-sidebar`. La rama real de este Sprint, creada y usada desde el análisis inicial de `mx-instside`, es `feature/sprint-3-2-mx-instside` (nombre alineado a la convención "identificar por bloque real del HTML" que el propio Sprint 3.2 introdujo, y ya reportada al usuario en la entrega de ese Sprint). No se creó una rama nueva llamada `feature/sprint-3-2-sidebar` — se continuó trabajando sobre `feature/sprint-3-2-mx-instside`, que es la que corresponde a este mismo bloque (`mx-instside`) y ya contiene todo el trabajo previo del Sprint 3.2.

### Qué se hizo

`src/layouts/RootLayout.tsx` es el único archivo modificado. Se agregó una integración explícitamente marcada como **`TEMPORARY INTEGRATION — Sprint 3.2.1`** (en el comentario JSDoc de la función y en un comentario JSX inline) que renderiza `<InstallerSidebar />` dentro de `<main>`, justo antes de `<Outlet/>`:

```tsx
<main className="flex-1">
  {/* TEMPORARY INTEGRATION — Sprint 3.2.1: ver comentario de la función. */}
  <InstallerSidebar rating={4.9} km={1.8} cumplimiento={98} aceptacion={92} />
  <Outlet context={{ role }} />
</main>
```

No se creó ningún componente, layout o página nueva. No se modificó `InstallerSidebar`/`InstallerSidebarCard`/`InstallerProfileSummary`/`InstallerPriorityRules` (verificado con `git diff`: cero cambios en esos 4 archivos). No se tocó `ARCHITECTURE.md`, `TODO.md`, `AppRouter.tsx` ni `Header`.

### Sobre los valores literales pasados (`rating`/`km`/`cumplimiento`/`aceptacion`)

`InstallerProfileSummary` (y por lo tanto `InstallerSidebar`) exige estas 4 props como obligatorias, sin valores por defecto (decisión tomada en el Sprint 3.2 porque el componente no tenía ningún consumidor real todavía). Para renderizarlo visualmente en este Sprint 3.2.1 sin modificar esa implementación (regla explícita: "sin modificar su implementación interna"), fue necesario pasar algún valor. Se usaron 4 números literales fijos, escritos directamente en `RootLayout.tsx`, no un archivo/objeto de mock de datos nuevo — no se creó ningún `MOCK_INSTALLER` ni similar. Estos literales se eliminan junto con el resto de esta integración temporal cuando exista `layouts/InstallerLayout.tsx` real.

### Resultado visual

Antes: `Header` → `<main>` vacío (el `<Outlet/>` no tiene ninguna ruta hija todavía) → `Footer`. Después: `Header` → `<main>` con `InstallerSidebar` visible (tarjetas "Tu perfil" y "Reglas de prioridad") seguido del `<Outlet/>` (sigue vacío) → `Footer`. No se intentó reconstruir el layout completo del Instalador (`.mx-instwrap`/`.mx-phone`) — solo se hizo visible el `aside` ya existente.

### Validaciones ejecutadas

Mismo bloqueo de red de siempre en este sandbox — no fue posible ejecutar aquí `npm run lint`/`npm run dev` reales.

- `tsc --noEmit` (config real del proyecto + stubs ambientales): **0 diagnósticos**.
- `prettier --check`: cero diferencias.
- `git diff --stat` confirmando que el único archivo modificado es `RootLayout.tsx`.

**Pendiente de confirmar por el usuario en su máquina**: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`. Si alguna falla, este Sprint 3.2.1 debe detenerse y reportarse — no se asume éxito sin esa confirmación.

### Confirmación

`InstallerSidebar` ahora es visible en la aplicación (montado temporalmente en `RootLayout`). **No se avanzó al Sprint 3.3** ni se migró ningún bloque adicional del HTML.

## Sprint 3.2.2 — Corrección de integración de `InstallerSidebar` (2026-07-07)

Sub-iteración solicitada explícitamente por el usuario para corregir 3 problemas de la integración visual temporal hecha en el Sprint 3.2.1. **No es un Sprint nuevo de migración del HTML, no corresponde al Sprint 3.3, no migra ningún bloque adicional.** No se modificó `InstallerSidebar`/`InstallerSidebarCard`/`InstallerProfileSummary`/`InstallerPriorityRules` (verificado con `git diff`: cero cambios en esos 4 archivos) — todas las correcciones se hicieron exclusivamente en `src/layouts/RootLayout.tsx`, el único archivo modificado.

### Problemas detectados y corregidos

**1) `InstallerSidebar` se renderizaba para cualquier rol (Coordinador y Admin incluidos).**

En el HTML fuente, `mx-instside` solo existe dentro de `Installer(props)` (línea 3169), y `App()` monta ese componente únicamente cuando `role === "inst"` (línea ~2113: `role === "inst" && React.createElement(Installer, {...})`). La integración de 3.2.1 no reproducía esa condición — el `<InstallerSidebar/>` se renderizaba sin importar el `role` activo del `Header`. Se corrigió envolviendo el bloque en `{role === 'instalador' && (...)}`, usando el mismo tipo `Rol` (`'coordinador' | 'instalador' | 'admin'`) ya definido en `src/types/enums.ts`.

**2) El Sidebar ocupaba todo el ancho disponible de `<main>`.**

En el HTML fuente, `<aside class="mx-instside">` nunca es hijo directo de un contenedor de ancho completo: es el segundo hijo (hermano de `<div class="mx-phone">`) dentro de `<div class="mx-instwrap">`, un grid de 2 columnas (`.mx-instwrap{display:grid;grid-template-columns:minmax(320px,400px) minmax(240px,300px);gap:18px;justify-content:center;padding:22px 16px;align-items:start}` — línea 169 del `<style>` fuente). La integración de 3.2.1 renderizaba `InstallerSidebar` directo dentro de `<main>`, sin ese grid — por eso ocupaba el 100% del ancho. Se corrigió envolviendo `<InstallerSidebar/>` en un `<div className="mx-instwrap">`, que le devuelve su columna angosta (`minmax(240px,300px)`, 240 a 300px según el ancho disponible).

**3) El contenedor principal (`<main>`, "Main Workspace") no reservaba espacio para el futuro Phone.**

Se agregó, como primer hijo de `.mx-instwrap`, un "Phone Placeholder": un `<div />` vacío, sin clase `.mx-phone` ni contenido, cuyo único propósito es ocupar la primera columna del grid (`minmax(320px,400px)`) que un Sprint futuro usará para el teléfono real (`layouts/InstallerLayout.tsx` + `PhoneFrame.tsx`, ya reservados en `ARCHITECTURE.md` §3). **No se implementó ningún estilo/contenido de `.mx-phone`/`.mx-phone-bar`/`.mx-phonetabs`** — eso pertenece explícitamente a un Sprint futuro, fuera del alcance de esta corrección.

Estructura resultante dentro de `<main>` (solo si `role === 'instalador'`):

```tsx
<main className="flex-1">
  {role === 'instalador' && (
    <div className="mx-instwrap">
      {/* Phone Placeholder — reserva la primera columna del grid para
          el futuro layouts/InstallerLayout.tsx (mx-phone). No se
          implementa contenido/estilo de Phone en este Sprint. */}
      <div />
      <InstallerSidebar rating={4.9} km={1.8} cumplimiento={98} aceptacion={92} />
    </div>
  )}
  <Outlet context={{ role }} />
</main>
```

### Sobre padding/gap/alineación/breakpoint

Ninguna clase CSS se agregó ni se modificó en este Sprint. `.mx-instwrap` (`gap:18px`, `padding:22px 16px`, `justify-content:center`, `align-items:start`) y su regla responsive (`@media (max-width:920px){.mx-instwrap{grid-template-columns:1fr;max-width:420px;margin:0 auto}.mx-instside{order:-1}}`) ya estaban portadas verbatim a `globals.css` desde Fase 3 (líneas 700-716 y 962-969 de `globals.css`) — se reutilizan tal cual, sin tocarlas. Al envolver `InstallerSidebar` en `.mx-instwrap`, el padding/gap/ancho/alineación del panel coinciden exactamente con el HTML fuente sin necesidad de ningún cambio de CSS.

### Archivos modificados

- `src/layouts/RootLayout.tsx` — único archivo de código modificado (ver arriba). Verificado con `git diff --stat` que ningún otro archivo de código cambió.

### Validaciones ejecutadas

Mismo bloqueo de red de siempre en este sandbox — no fue posible ejecutar aquí `npm run lint`/`npm run dev` reales.

- `tsc --noEmit` (stubs ambientales, config `tsconfig.check.json` recreada para esta corrida): **0 diagnósticos**.
- `prettier --check` sobre `src/**/*.{ts,tsx}`: cero diferencias.
- `git diff --stat` confirmando que el único archivo modificado es `RootLayout.tsx`.

**Pendiente de confirmar por el usuario en su máquina**: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`. Si alguna falla, este Sprint 3.2.2 debe detenerse y reportarse — no se asume éxito sin esa confirmación.

### Confirmación

✔ `InstallerSidebar` solamente se renderiza cuando `role === 'instalador'` (nunca para `coordinador`/`admin`).
✔ El layout respeta el grid de 2 columnas de `.mx-instwrap` del HTML fuente.
✔ El ancho del panel coincide con el HTML (`minmax(240px,300px)`, ya no 100% del ancho de `<main>`).
✔ El padding/gap del contenedor coincide con el HTML (`.mx-instwrap`, sin cambios de CSS).
✔ El contenedor (`.mx-instwrap` con Phone Placeholder reservado + `InstallerSidebar`) queda preparado para que el siguiente Sprint solo tenga que reemplazar el `<div />` vacío por el `PhoneFrame`/`InstallerLayout` real.
✔ **No se avanzó al Sprint 3.3.**

## Próximo Sprint

A definir por el usuario según el siguiente bloque real del HTML a migrar (la convención de nombrar Sprints por bloque HTML, no por nombre genérico, entra en vigor desde el Sprint 3.2). No se avanza automáticamente. Nota: la integración temporal dentro de `RootLayout.tsx` (Sprints 3.2.1/3.2.2) deberá retirarse cuando se construya el layout real del Instalador (`layouts/InstallerLayout.tsx`).
