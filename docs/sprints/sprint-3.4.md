# Sprint 3.4 - Migración del bloque `mx-suc-sel`

Rama: `feature/sprint-3-4-mx-suc-sel` (creada desde la punta de `feature/sprint-3-3-mx-subtabs`, que ya incluye Sprint 3.1, 3.2 + sub-iteraciones + 3.3 + su fix de integración visual)
Estado: ✅ Completado — el usuario confirmó localmente `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` en verde sobre `feature/sprint-3-4-mx-suc-sel`, y validó visualmente que `SucursalSelect` aparece en la posición correcta y coincide con `Multimax_Despacho_v1.3.html` (mismo criterio aplicado desde Sprint 3.1.1, reforzado con la regla de validación visual obligatoria del Sprint 3.3).

## Objetivo

Continuar la reconstrucción incremental de `Multimax_Despacho_v1.3.html` migrando exactamente el siguiente bloque estructural pendiente después de `mx-subtabs` (Sprint 3.3) — determinado por inspección directa del HTML, no asumido de antemano.

## Fase de análisis (obligatoria, previa a la implementación)

### Determinación del siguiente bloque pendiente

Se descartó la suposición previa de `docs/SPRINTS_INDEX.md` (que llamaba genéricamente al Sprint 3.4 "Main Layout") y se inspeccionó el HTML fuente directamente:

- Dentro de `App()`, rama `role === "coord"`, el primer hijo de la rama es `<div class="mx-suc-sel">` (selector "Sucursal activa"), **hermano** de `<div class="mx-subtabs-wrap">` (que le sigue inmediatamente) — ambos comparten un `<div>` contenedor anónimo, sin clase.
- `.mx-suc-sel` no tenía ninguna regla en `globals.css` (verificado con `grep -n "mx-suc-sel" src/styles/globals.css`, cero resultados antes de este Sprint) ni ningún componente React que lo reconstruyera — a diferencia de `.mx-subtabs`, que sí tenía su CSS ya portado desde Fase 3.
- El propio CSS fuente confirma que es un bloque nombrado explícitamente en un comentario propio: `/* Selector de sucursal */` (línea 411, justo antes de la declaración `.mx-suc-sel`).
- Único hermano pendiente en ese nivel: no hay ningún otro bloque estructural (no-feature) entre `mx-suc-sel` y `mx-subtabs-wrap` — el siguiente elemento después de `mx-subtabs-wrap` es directamente `Coordinator`/`CoordinatorJobs` (contenido de feature, explícitamente fuera de alcance de este Sprint).

**El Sprint 3.4 migrará únicamente el bloque `mx-suc-sel` (Selector de sucursal activa).**

### Ubicación exacta en el archivo fuente

- **CSS**: `Multimax_Despacho_v1.3.html`, líneas 412-415 (bajo el comentario `/* Selector de sucursal */`, línea 411).
- **JSX**: dentro de `App()`, líneas 2071-2079 (arranca en el `React.createElement("div", { className: "mx-suc-sel" }, ...)`; el `<div>` contenedor anónimo que lo envuelve arranca en la línea 2071, y el bloque `mx-suc-sel` cierra en la línea 2079, justo antes de que comience `mx-subtabs-wrap`).

### Bloque del HTML migrado (JSX de referencia, transcrito literalmente)

```jsx
<div>
  <div className="mx-suc-sel">
    <label>Sucursal activa:</label>
    <select value={sucursalCoord} onChange={e => setSucursalCoord(e.target.value)}>
      {SUCURSALES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  </div>
  <div className="mx-subtabs-wrap">{/* ... Sprint 3.3, sin cambios ... */}</div>
</div>
```

(Reconstruido en JSX legible a partir de los `React.createElement` reales de las líneas 2071-2079 — el contenido, orden y props son idénticos; solo se cambió la notación para lectura.)

### Clases CSS involucradas

| Clase | Declarada en (CSS fuente) | Estado antes de este Sprint |
| --- | --- | --- |
| `.mx-suc-sel` (+ `label`, `select`, `select:focus`) | líneas 412-415 | **Faltaba por completo** — no portada ni en Fase 3 ni en ningún Sprint posterior |

Verificado línea por línea contra `globals.css` (nueva sección agregada, ver "Archivos modificados"): `display:flex;align-items:center;gap:10px;padding:10px 16px;max-width:1240px;margin:0 auto;border-bottom:1px solid var(--line);background:rgba(10,15,28,.4)` en `.mx-suc-sel`; `font-size:11.5px;color:var(--muted);font-weight:600;white-space:nowrap` en `label`; `background:var(--ink);border:1px solid var(--line);border-radius:8px;color:var(--text);font-size:13px;padding:7px 10px;flex:1;max-width:240px` en `select`; `outline:none;border-color:var(--ice)` en `select:focus` — **coincide al 100% con el HTML fuente**.

### Estructura HTML / elementos hijos

```
div (anónimo, sin clase — envuelve mx-suc-sel y mx-subtabs-wrap como hermanos)
├── div.mx-suc-sel
│   ├── label > "Sucursal activa:"
│   └── select (value=sucursalCoord, onChange=setSucursalCoord)
│       └── option × 9 (una por cada valor de SUCURSALES)
└── div.mx-subtabs-wrap (Sprint 3.3, sin cambios en este Sprint)
```

No hay íconos en este bloque (a diferencia de Header/`mx-instside`/`mx-subtabs`).

### Componentes React que surgen de esta sección

| Componente | Corresponde a | Nuevo/reutilizado |
| --- | --- | --- |
| `SucursalSelect` | `<div class="mx-suc-sel">` completo (label + select + options) | Nuevo |

Un único componente — el bloque no tiene sub-elementos claramente diferenciados que ameriten dividirlo más (a diferencia de `mx-instside`, que sí tenía dos tarjetas distintas). No se creó ningún Design System ni componente reutilizable genérico de "select" — `SucursalSelect` es específico de este bloque.

### Constante de datos: `SUCURSALES`

El `<select>` fuente itera sobre `const SUCURSALES = [...]` (línea 1116 del HTML fuente), un arreglo literal de 9 nombres de sucursal. Se agregó verbatim a `src/constants/index.ts` como `SUCURSALES` (con `as const`). **No es lógica de negocio ni un mock de datos nuevo**: es el mismo contenido estático que el HTML fuente ya usa para renderizar las 9 `<option>` de este bloque exacto — sin esta lista, el `<select>` no podría reconstruir "mismo markup" (requisito explícito de este Sprint). La fuente real de sucursales en producción vendrá de Supabase (tabla `sucursales`, `types/database.ts` → `SucursalRow`) en una fase de integración futura — no se resuelve aquí, se documenta como dependencia pendiente.

### Dependencias con otras partes del HTML

- **`sucursalCoord`/`setSucursalCoord`**: en el HTML fuente son `useState` de `App()`, al mismo nivel que `role`. Se replicó ese mismo criterio: el estado vive en `RootLayout` (mismo nivel que `role`), no dentro de `SucursalSelect` — mismo patrón ya usado para `role` (Sprint 3.1) y para el estado de "Despacho en vivo"/"Mis trabajos" de `MxSubtabButton` (que, a diferencia de este bloque, se dejó como literales fijos sin estado real — ver diferencia en "Decisiones tomadas").
- **`HeaderStatus` / badge de sucursal**: `Header` ya expone una prop opcional `sucursalActiva` (con default `"Multiplaza"`, fijado en el Sprint 3.1) que muestra un badge de sucursal en `.mx-topright` cuando `role === "coord"`. `RootLayout` no se la pasa. Ver "Problema encontrado" abajo.
- **`.mx-subtabs-wrap`** (Sprint 3.3): hermano inmediato de este bloque — no se modifica, solo se reordena su posición relativa dentro de un nuevo `<div>` contenedor anónimo que ahora envuelve a ambos, igual que en el HTML fuente.

### Qué NO será migrado todavía

- `Coordinator`/`CoordinatorJobs` (contenido que sigue a `mx-subtabs-wrap` en el HTML fuente) — fuera de alcance explícito de este Sprint.
- Conexión real de `sucursalCoord` a Supabase / lógica de negocio de sucursales — Sprint futuro de integración.
- Sincronización del badge de sucursal del Header con el nuevo selector — ver "Problema encontrado".

## Problema encontrado (reportado, no corregido silenciosamente)

**Desincronización entre `SucursalSelect` y el badge de sucursal del Header.** `HeaderStatus` (Sprint 3.1) ya muestra un `Badge` con la sucursal activa cuando `role === "coord"`, pero como prop opcional con valor por defecto fijo `"Multiplaza"` — `RootLayout` nunca le pasó un valor real porque, hasta este Sprint, no existía ningún estado real de sucursal en la aplicación. Ahora que `SucursalSelect` introduce `sucursalCoord`/`setSucursalCoord` en `RootLayout`, cambiar la sucursal en el selector **no actualiza** el badge del Header — quedan visualmente desincronizados (el selector puede decir "Albrook" mientras el badge sigue diciendo "Multiplaza"). Esto reproduce, en cierta forma, cómo el HTML fuente sí mantiene ambos sincronizados (porque ambos leen del mismo `sucursalCoord` de `App()`), pero aquí se decidió **no** pasar `sucursalCoord` a `Header` porque las instrucciones de este Sprint son explícitas: "No modificar: Header ... RootLayout (excepto la integración mínima del nuevo bloque)". Pasarle una prop nueva a la invocación de `Header` se consideró fuera de esa integración mínima. Se documenta la inconsistencia para que un Sprint futuro (que sí tenga permiso de tocar `Header`/`RootLayout` de forma más amplia, o que construya el layout real de Coordinator) decida cómo sincronizarlos.

## Archivos creados

- `docs/sprints/sprint-3.4.md`
- `src/components/shared/sucursal-select.tsx` (`SucursalSelect`)

## Archivos modificados

- `src/constants/index.ts` — agregada la constante `SUCURSALES` (arreglo literal de 9 sucursales, verbatim del HTML fuente, línea 1116). Ninguna otra constante existente se tocó.
- `src/styles/globals.css` — agregada la sección `.mx-suc-sel`/`label`/`select`/`select:focus` (verbatim, líneas 412-415 del HTML fuente), insertada inmediatamente antes de la sección `.mx-subtabs-wrap` existente (mismo orden relativo que en el HTML fuente). Ninguna otra regla se tocó — verificado que el resto del archivo permanece byte-idéntico (`git diff` solo muestra líneas agregadas, cero líneas eliminadas/modificadas).
- `src/layouts/RootLayout.tsx` — se agregó `const [sucursalCoord, setSucursalCoord] = useState('Multiplaza')` (mismo nivel que `role`, mismo valor inicial que el HTML fuente) y se renderiza `<SucursalSelect value={sucursalCoord} onChange={setSucursalCoord} />` como primer hijo de un nuevo `<div>` (sin clase, igual que el contenedor anónimo del HTML fuente) que ahora envuelve tanto a `SucursalSelect` como a `MxSubtabs` (Sprint 3.3, sin modificar su contenido interno). `Header` se sigue invocando exactamente igual que antes (`<Header role={role} onRoleChange={setRole} />`, sin nuevas props) — ver "Problema encontrado".

## Archivos eliminados

Ninguno.

## Validaciones ejecutadas

Esta sesión en la nube sigue sin acceso a `registry.npmjs.org`; no fue posible ejecutar aquí `npm install`/`npm run lint`/`npm run dev` reales. Validación best-effort (mismo método de Sprints anteriores):

- `tsc --noEmit` (stubs ambientales, `tsconfig.check.json` recreada para esta corrida): **0 diagnósticos**.
- `prettier --check` sobre `src/**/*.{ts,tsx}`: cero diferencias.
- `prettier --check` sobre `src/styles/globals.css`: el archivo completo reporta diferencias de estilo bajo esta invocación ad-hoc del sandbox (comillas simples vs. dobles, envoltura de `linear-gradient`/`radial-gradient` en múltiples líneas) — **pero se verificó con `diff` que ninguna de esas diferencias cae dentro del bloque nuevo `.mx-suc-sel` agregado en este Sprint**: son características preexistentes de todo el archivo, ya presentes antes de este Sprint, no introducidas aquí. No se ejecutó `prettier --write` sobre el archivo completo para no reformatear código fuera de alcance ("no modificar CSS" más allá del bloque nuevo).
- Balance de llaves `{}` de `globals.css` verificado programáticamente: 158 aperturas / 158 cierres (sin cambio de balance más allá de las 5 nuevas reglas agregadas, cada una con su apertura/cierre correspondiente).
- `git status --porcelain`: confirma que los únicos archivos tocados son `src/constants/index.ts`, `src/styles/globals.css`, `src/layouts/RootLayout.tsx` (modificados) y `src/components/shared/sucursal-select.tsx` (nuevo) — ningún otro Sprint/componente aprobado se modificó.

**Confirmado por el usuario en su máquina**: `npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev` — las 4 exitosas sobre `feature/sprint-3-4-mx-suc-sel` — y verificación visual directa en el navegador de que `SucursalSelect` aparece en la posición correcta, coincide con el HTML oficial y no rompe ningún Sprint anterior.

## Decisiones tomadas

1. **Nombre del componente**: `SucursalSelect` (no `MxSucSel` ni un nombre genérico) — se prefirió un nombre descriptivo del dominio, consistente con `InstallerSidebar`/`HeaderRoleSwitch`, ya que el bloque tiene un propósito de negocio claro (seleccionar la sucursal activa del Coordinador), a diferencia de `MxSubtabs`/`MxSubtabButton` (genuinamente genéricos, reutilizados en dos contextos distintos del HTML).
2. **Estado controlado, no interno**: `SucursalSelect` recibe `value`/`onChange` como props puras (sin `useState` propio), replicando que en el HTML fuente el estado vive en `App()`, no en el bloque mismo.
3. **No se pasó `sucursalCoord` a `Header`**: para no modificar la integración de un componente explícitamente protegido en este Sprint — ver "Problema encontrado".
4. **No se envolvió el nuevo `<div>` contenedor en una clase o estilo propio**: el HTML fuente usa un `<div>` completamente anónimo (sin `className`) para agrupar `mx-suc-sel` y `mx-subtabs-wrap` — se reprodujo igual, sin inventar ninguna clase nueva de layout.

## Dependencias detectadas

- La sincronización del badge de sucursal del Header con `sucursalCoord` real (ver "Problema encontrado") queda pendiente para un Sprint que tenga permiso de ajustar esa integración, o para el Sprint que construya `layouts/CoordinatorLayout.tsx` real.
- `SUCURSALES` deberá reemplazarse por datos reales de Supabase (`sucursales`) en una fase de integración futura — no bloquea este Sprint, que es solo reconstrucción visual.

## Riesgos

- `SucursalSelect` y `sucursalCoord` son código nuevo, puro y sin efectos secundarios (aparte de local `useState`) — riesgo bajo, verificable por inspección/tipado.
- La desincronización documentada con el badge del Header es un riesgo puramente visual/de consistencia (no rompe nada funcionalmente), y solo es observable cuando `role === 'coordinador'` y el usuario cambia la sucursal manualmente.

## Porcentaje del HTML reconstruido (este Sprint)

`.mx-suc-sel` migrado al 100% en su markup/CSS (9 líneas de JSX fuente, líneas 2071-2079; 4 reglas CSS agregadas, todas nuevas) — visible de inmediato en `RootLayout` para `role === 'coordinador'`, en la posición exacta del HTML fuente (antes de `mx-subtabs`). Ver `MIGRATION_STATUS.md` para el detalle agregado del proyecto.

## Confirmación de alcance respetado

- ✔ No se modificó `Header`, `mx-top`, `mx-instside`, `InstallerSidebar`, `mx-subtabs`, `MxSubtabs`/`MxSubtabButton`, `Footer`, `RoleSwitch` ni `AppRouter.tsx` — verificado con `git diff`.
- ✔ `RootLayout.tsx` solo recibió la integración mínima del nuevo bloque (nuevo estado + nuevo `<div>` contenedor + `SucursalSelect`), sin alterar el funcionamiento de `Header`/`MxSubtabs`/`InstallerSidebar` ya migrados.
- ✔ No se implementó Job Cards, Publish Modal, Timeline, Radar, Countdown, Calendar, Installer Profile, Installer Jobs, Admin Dashboard, Phone Layout, Dialogs ni Shared Components.
- ✔ No se avanzó al Sprint 3.5, no se analizaron bloques posteriores.

## Próximo Sprint

**Sprint 3.4 cerrado formalmente (✅ Completado).** Siguiente Sprint a desarrollar: Sprint 3.5. No se avanza automáticamente — se espera aprobación explícita del usuario.
