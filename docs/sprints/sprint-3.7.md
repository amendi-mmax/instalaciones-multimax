# Sprint 3.7 - Migración de `Radar` (visualización de instaladores notificados)

Rama: `feature/sprint-3-7-radar` (creada desde la punta de `feature/sprint-3-6-coordinator-empty-state`, que ya incluye Sprint 3.1 a 3.6 + sus cierres)
Estado: ✅ Completado — validación real (`npm install`/`lint`/`typecheck`/`build`/`dev`) y validación visual confirmadas por el usuario.

## Objetivo

Continuar la reconstrucción incremental de `Multimax_Despacho_v1.3.html` migrando exactamente el siguiente bloque estructural pendiente después de `CoordinatorEmptyState` (Sprint 3.6) — determinado por inspección directa del HTML, no asumido del brief.

## Fase de análisis (obligatoria, previa a la implementación)

### Determinación del bloque pendiente

El brief de este Sprint llamaba a este trabajo "Radar / Mapa de Instaladores" y sugería una arquitectura de múltiples componentes (`RadarMap`, `RadarContainer`, `RadarMarker`, `RadarLegend`, `RadarOverlay`, `RadarControls`, `RadarInstallerCard`, `RadarStatusBadge`, `RadarInfoPanel`) dentro de `src/components/radar/`. Se descartó esa estructura especulativa y se inspeccionó el HTML fuente directamente:

1. Se buscaron declaraciones de función que pudieran corresponder a "Radar"/"mapa":

   ```
   grep -n "^function Radar\|^function CountRing\|^function.*Radar" Multimax_Despacho_v1.3.html
   ```

   Resultado: `function CountRing({...})` (línea 1437) y `function Radar({...})` (línea 1492). **Ninguna otra función** (`RadarMap`, `RadarMarker`, `RadarOverlay`, `RadarControls`, etc.) existe en el script — la arquitectura multi-archivo sugerida por el brief no corresponde a ninguna estructura real del HTML.

2. Se leyó el cuerpo completo de `function Radar({ notified, instState, eligibleIds })` (líneas 1492-1745). Es **un único componente SVG autocontenido**, sin sub-componentes propios: un `<div class="mx-radar-wrap">` que envuelve un `<svg class="mx-radar">` (círculos concéntricos, líneas de grilla tipo "calle", un sweep animado con gradiente radial, pines de instaladores posicionados con una función de hash determinística por `id` + distancia en km, líneas de "ruta" desde el centro a cada instalador notificado, un punto central pulsante) seguido de un `<div class="mx-radar-legend">` con 5 ítems de leyenda de color. **No hay ningún mapa real** (no Google Maps/Leaflet/Mapbox/OSM en ningún lugar del HTML — confirmado también por el propio brief, que lo prohíbe explícitamente).

3. Se identificaron las dependencias de datos/utilidades que `Radar` necesita para renderizar exactamente igual que el HTML fuente:
   - `const hashAngle = id => {...}` (línea 882) — hash determinístico de un string a un ángulo 0-360, usado por `Radar` (`posFor`) para posicionar cada pin de forma estable (no aleatoria en cada render). Es la única utilidad de función que `Radar` invoca directamente.
   - `const INSTALLERS = [...]` (línea 887, 11 instaladores) y `const ELIGIBLE_ORDER = [...]` (línea 1020, 9 ids) — `Radar` itera `INSTALLERS.filter(i => eligibleIds.includes(i.id))` y usa `i.km` para calcular la distancia radial de cada pin.
   - `const fmt = s => {...}` (línea 878) — formatea segundos a `m:ss`. Se verificó línea por línea el cuerpo completo de `Radar` (1492-1745) y **`fmt` no se usa dentro de esta función** — se usa en `CountRing` (línea 1437) y en `Coordinator()` (`fmt(v.roundRemaining)`, etc.), ninguno de los dos en alcance de este Sprint. **No se agrega `fmt` en este Sprint** — se agregará cuando se migre el bloque que realmente lo necesite (`CountRing`/Sprint 3.8, o la tarjeta "Despacho en vivo" de `Coordinator`).
   - Ninguna de las 3 piezas necesarias (`hashAngle`, `INSTALLERS`, `ELIGIBLE_ORDER`) estaba portada al proyecto todavía (verificado con `grep -rn "INSTALLERS|hashAngle|ELIGIBLE_ORDER" src`, cero resultados antes de este Sprint).

4. Se descartó explícitamente `CountRing` (líneas 1437-1491) del alcance de este Sprint: es un anillo de progreso circular (SVG con `strokeDasharray`) para countdowns de tiempo restante, usado en las pantallas de teléfono del Instalador (líneas 3276, 3317, dentro de `OfferForm`/pantallas de oferta — Fase 5, todavía no migradas) — **no tiene relación visual ni funcional con el radar de instaladores**, solo comparte vecindad en el archivo fuente. `docs/SPRINTS_INDEX.md` ya reserva el Sprint 3.8 ("Countdown") para este componente — se deja intacto para ese Sprint.

**El Sprint 3.7 migra únicamente `Radar` (líneas 1492-1745) — no una arquitectura de "mapa" con marcadores/overlays/controles independientes, que no existe en el HTML.** Esta es una corrección de expectativas análoga a la de Sprint 3.6 ("Job Cards" no era el bloque real): a diferencia de 3.6, aquí el nombre general "Radar" del Sprint sí correspondía a la función real (`Radar`), pero la estructura interna multi-componente sugerida por el brief no correspondía a nada del HTML.

### Ubicación exacta en el archivo fuente

- **JSX**: `Multimax_Despacho_v1.3.html`, `function Radar({ notified, instState, eligibleIds })`, líneas 1492-1745.
- **CSS**: líneas 60-68 (`.mx-radar-wrap`, `.mx-radar`, `.mx-sweep` + `@keyframes mxsweep`, `.mx-ping` + `@keyframes mxping`, `.mx-radar-legend` + `span` + `i`). Las `@keyframes mxsweep`/`mxping` ya estaban portadas en `globals.css` desde Fase 3 (como utilidades Tailwind `animate-mx-sweep`/`animate-mx-ping`, anticipando reuso) — solo faltaban las clases planas `.mx-sweep`/`.mx-ping` que el JSX realmente usa vía `className` literal (no las utilidades Tailwind).
- **Datos/utilidades**: `fmt` (línea 878), `hashAngle` (línea 882), `INSTALLERS` (línea 887), `ELIGIBLE_ORDER` (línea 1020).
- **Invocación real en `Coordinator()`** (no migrada en este Sprint, ver "Qué NO se migra"): líneas 2291-2295, dentro de la tarjeta `mx-card` "Despacho en vivo", entre el header de sección y `mx-roundsingle`/`mx-actionsrow`.

### Bloque del HTML migrado (JSX de referencia, transcrito literalmente)

```jsx
function Radar({ notified, instState, eligibleIds }) {
  const S = 220, cx = S / 2, cy = S / 2, maxR = 96;
  const dotFor = (st) => { /* mapa estado -> color de pin */ };
  const posFor = (i) => {
    const ang = (hashAngle(i.id) * Math.PI) / 180;
    const rr = Math.min(maxR - 14, (i.km / 14) * (maxR - 20) + 22);
    return { x: cx + rr * Math.cos(ang), y: cy + rr * Math.sin(ang) };
  };
  return (
    <div className="mx-radar-wrap">
      <svg width="100%" viewBox={`0 0 ${S} ${S}`} className="mx-radar">
        <defs>{/* radialGradient mxsweep, radialGradient mxmapfade, clipPath mxmapclip */}</defs>
        <circle cx={cx} cy={cy} r={maxR} fill="rgba(14,21,38,.7)" stroke="rgba(52,225,232,.22)" strokeWidth="1.5" />
        <g clipPath="url(#mxmapclip)" opacity="0.5">{/* líneas de grilla tipo "calle" */}</g>
        {[46, 88, maxR].map((r) => <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(52,225,232,.14)" strokeDasharray="2 6" />)}
        <g className="mx-sweep" style={{ transformOrigin: `${cx}px ${cy}px` }}>{/* sector de sweep con gradiente */}</g>
        <g clipPath="url(#mxmapclip)">{/* líneas de "ruta" centro -> instalador notificado */}</g>
        {/* pines de instaladores notificados (path en forma de gota + glow condicional) */}
        <circle cx={cx} cy={cy} r={9} className="mx-ping" /* punto central pulsante */ />
        <circle cx={cx} cy={cy} r={7} fill="#0a0f1c" stroke="#34e1e8" strokeWidth="2" />
        <circle cx={cx} cy={cy} r={3} fill="#34e1e8" />
        <rect width={S} height={S} fill="url(#mxmapfade)" clipPath="url(#mxmapclip)" /> {/* fade circular */}
      </svg>
      <div className="mx-radar-legend">
        <span><i style={{ background: '#7f8db0' }} />Notificado</span>
        <span><i style={{ background: '#34e1e8' }} />Abrió</span>
        <span><i style={{ background: '#ffb23e' }} />Respondiendo</span>
        <span><i style={{ background: '#3be08a' }} />Respondió</span>
        <span><i style={{ background: '#a99bff' }} />Seleccionado</span>
      </div>
    </div>
  );
}
```

(Reconstruido en JSX legible a partir de los `React.createElement` reales de las líneas 1492-1745 — contenido, orden, fórmulas de posicionamiento y colores idénticos; solo cambia la notación y se resumen los bloques repetitivos con comentarios.)

### Clases CSS involucradas

| Clase | Declarada en (CSS fuente) | Estado antes de este Sprint |
| --- | --- | --- |
| `.mx-radar-wrap` | línea 60 | Faltaba por completo |
| `.mx-radar` | línea 61 | Faltaba por completo |
| `.mx-sweep` (+ `@keyframes mxsweep`) | línea 62-63 | La clase plana faltaba; el keyframe ya existía (Fase 3, como `animate-mx-sweep`) |
| `.mx-ping` (+ `@keyframes mxping`) | línea 64-65 | La clase plana faltaba; el keyframe ya existía (Fase 3, como `animate-mx-ping`) |
| `.mx-radar-legend` / `span` / `i` | línea 66-68 | Faltaba por completo |

Se agregaron únicamente las 2 clases planas (`.mx-sweep`, `.mx-ping`) que referencian los keyframes ya existentes — no se duplicó ningún `@keyframes`.

**Gap adicional detectado y corregido de paso**: el HTML fuente (línea 267-269) aplica `@media (prefers-reduced-motion: reduce)` a las clases planas `.mx-sweep`/`.mx-ping`/`.mx-blink`/`.mx-spin`, pero `globals.css` solo tenía esa regla para las utilidades Tailwind (`animate-mx-sweep`/etc., Fase 3) — las clases planas `.mx-blink`/`.mx-spin` (también ya portadas desde Fase 3) se quedaron sin esta cobertura. Se agregó un segundo bloque `@media (prefers-reduced-motion: reduce)` verbatim para las 4 clases planas que ya existen en el archivo — es una adición pura (nuevo bloque, cero líneas existentes modificadas/eliminadas), no una reinterpretación de ninguna regla aprobada. `.mx-resp` (también en la regla fuente) no se agrega — esa clase no existe todavía en el proyecto.

### Estructura HTML / elementos hijos

```
div.mx-radar-wrap
├── svg.mx-radar (viewBox 0 0 220 220)
│   ├── defs (radialGradient mxsweep, radialGradient mxmapfade, clipPath mxmapclip)
│   ├── circle (fondo del radar)
│   ├── g[clipPath] (líneas de grilla tipo calle, opacity .5)
│   ├── circle × 3 (anillos concéntricos punteados)
│   ├── g.mx-sweep (sector de sweep, gradiente mxsweep)
│   ├── g[clipPath] (líneas de "ruta" centro→instalador, por instalador notificado)
│   ├── g × N (pin de instalador: glow condicional + path "gota" + punto central), por instalador notificado (no idle)
│   ├── circle.mx-ping (punto central pulsante)
│   ├── circle × 2 (punto central sólido)
│   └── rect (fade circular, clipPath)
└── div.mx-radar-legend
    └── span × 5 (i + texto: Notificado / Abrió / Respondiendo / Respondió / Seleccionado)
```

### Componentes React que surgen de esta sección

| Componente | Corresponde a | Nuevo/reutilizado |
| --- | --- | --- |
| `Radar` | `function Radar(...)` completo (líneas 1492-1745) | Nuevo — nombre idéntico a la función fuente, sin dividir en sub-componentes que no existen en el HTML |

Se evaluó explícitamente dividir `Radar` en piezas más pequeñas (`RadarLegend`, `RadarMarker`, etc., como sugería el brief) y se descartó: ninguna de esas piezas se reutiliza en otro lugar del HTML (la leyenda y los pines solo existen dentro de esta función), así que dividir habría creado componentes sin consumidor adicional, violando la regla de "crear únicamente los componentes estrictamente necesarios, con consumidor inmediato".

### Datos y utilidades agregadas (no son lógica de negocio)

- `INSTALLERS` (`src/constants/index.ts`) — arreglo literal de 11 instaladores, transcrito verbatim de la línea 887 del HTML fuente. **Nota de fidelidad**: usa nombres de campo propios del prototipo (`zona`, `km`, `cumpl`, `acept`, `prom`, `disp`, `docs`, `susp`), distintos de los del tipo de dominio `Usuario`/`Instalador` (`types/domain.ts`: `rating`, `cumplimiento`, `aceptacion`, etc.) — mismo tipo de discrepancia ya reportada para `km` en el Sprint 3.2 (`InstallerProfileSummary`). No se intenta unificar ambos esquemas aquí; `INSTALLERS` es el mock literal del prototipo, no una fuente de verdad de dominio.
- `ELIGIBLE_ORDER` (`src/constants/index.ts`) — arreglo literal de 9 ids, transcrito verbatim de la línea 1020.
- `hashAngle` (`src/lib/utils.ts`) — función pura, hash determinístico de un string a un ángulo 0-360 (línea 882). Sin efectos secundarios, sin leer/escribir estado de la aplicación — mismo criterio ya aplicado a `buildTimeSlots` (Sprint 3.5): utilidad pura necesaria para reconstruir el markup exacto, no lógica de negocio. `fmt` (línea 878) **no se agrega en este Sprint** — no lo usa `Radar`, ver punto 3 de "Determinación del bloque pendiente".

### Qué NO se migra en este Sprint

- `CountRing` (líneas 1437-1491) — ver "Determinación del bloque pendiente", punto 4. Candidato natural del Sprint 3.8 ("Countdown").
- La tarjeta "Despacho en vivo" completa (`mx-card` que envuelve a `Radar` dentro de `Coordinator()`) — `mx-section-h`, `mx-roundsingle`, `mx-actionsrow` no se migran; pertenecen al Sprint que construya `Coordinator`/la tarjeta real.
- `mx-jobcard`, `QueueBar`, Indicadores (`mx-stats` con datos reales), `AssignedPanel`, `NoResponsePanel`, respuestas (`mx-feedcard`) — todo el resto de `Coordinator()`, sin cambios respecto a lo documentado en el Sprint 3.6.
- Cualquier lógica real de notificación/bids/estado de instaladores — los props `notified`/`instState`/`eligibleIds` siguen siendo puramente estructurales (recibidos, no calculados por lógica de negocio).

## Problema encontrado / decisión de integración temporal (reportado, aprobado explícitamente por el usuario)

**`Radar` no tiene todavía un consumidor real dentro del flujo de la aplicación.** En el HTML fuente, `Radar` solo se monta dentro de la tarjeta "Despacho en vivo" de `Coordinator()` (líneas 2291-2295), que a su vez solo se alcanza cuando `jobs.length > 0` — y `jobs` sigue arrancando en `useState([])` sin ningún seed/mock (mismo bloqueo ya documentado en el Sprint 3.6 para `mx-qempty`). Construir la tarjeta real de "Despacho en vivo" está fuera de alcance de este Sprint (pertenece a un Sprint futuro que también implemente `jobs`/`publishJob`).

Se consultó al usuario explícitamente cómo proceder (el brief de este Sprint prohibía crear "navegación temporal" y sugería usar una página de showcase existente, que ya no existe desde el Sprint 3.1). El usuario aprobó una excepción explícita: **permitir integración temporal en `RootLayout.tsx` exclusivamente para validación visual**, sin crear rutas nuevas, sin modificar React Router, sin alterar la arquitectura y sin lógica de negocio, documentada como temporal. Se aplicó ese criterio, exactamente el mismo patrón ya usado en los Sprints 3.2.1, 3.3 (fix), 3.4, 3.5 y 3.6: `Radar` se monta en `RootLayout.tsx`, dentro de `role === 'coordinador'`, después de `CoordinatorEmptyState`, con props mock estáticas (`notified`/`instState` con una mezcla de estados para mostrar los 5 colores de la leyenda; `eligibleIds={ELIGIBLE_ORDER}`). Se retirará de ahí (y se moverá a su posición real dentro de la tarjeta "Despacho en vivo") en el Sprint que construya `Coordinator`/esa tarjeta real.

## Archivos creados

- `docs/sprints/sprint-3.7.md`
- `src/components/shared/radar.tsx` (`Radar`)

## Archivos modificados

- `src/constants/index.ts` — agregadas `INSTALLERS` y `ELIGIBLE_ORDER` (verbatim del HTML fuente). Ninguna otra constante existente se tocó.
- `src/lib/utils.ts` — agregada `hashAngle` (función pura, verbatim). `cn()` no se tocó; `fmt` no se agrega en este Sprint (no lo usa `Radar`, ver "Determinación del bloque pendiente").
- `src/styles/globals.css` — agregada la sección `.mx-radar-wrap`/`.mx-radar`/`.mx-sweep`/`.mx-ping`/`.mx-radar-legend` (+ `span`/`i`), verbatim (líneas 60-68 del HTML fuente), insertada inmediatamente después de la sección `.mx-qempty` existente (Sprint 3.6). Ninguna otra regla se tocó — verificado que el resto del archivo permanece intacto.
- `src/layouts/RootLayout.tsx` — se agrega el render temporal de `<Radar notified={...} instState={...} eligibleIds={ELIGIBLE_ORDER} />` como último hijo del bloque `role === 'coordinador'`, después de `CoordinatorEmptyState`, con la excepción de integración temporal aprobada explícitamente por el usuario para este Sprint (ver "Problema encontrado / decisión de integración temporal").

## Archivos eliminados

Ninguno.

## Resultado visual

`Radar` se ve, en `role === 'coordinador'`, inmediatamente después del estado vacío de `Coordinator` (`CoordinatorEmptyState`): un panel circular tipo radar con anillos concéntricos punteados, una línea de sweep animada girando, 4-5 pines de colores representando instaladores en distintos estados (notificado/gris, abrió/celeste, respondiendo/ámbar, respondió/verde, seleccionado/violeta) conectados al centro por líneas de "ruta", y debajo una leyenda de 5 ítems con los mismos colores. Coincide con la sección "Despacho en vivo" del HTML fuente, sin el resto de esa tarjeta (título, rondas, botones de acción), que queda fuera de alcance.

## Capturas sugeridas

- Vista de `role === 'coordinador'` completa (Header + `SucursalSelect` + `MxSubtabs` + `CoordinatorEmptyState` + `Radar`), para comparar el orden y espaciado contra el HTML.
- Zoom del `Radar` solo, comparado lado a lado con el bloque "Despacho en vivo" del HTML oficial (mismos colores/posiciones de pines, mismo sweep, misma leyenda).

## Validaciones ejecutadas

Esta sesión en la nube sigue sin acceso a `registry.npmjs.org`; no fue posible ejecutar aquí `npm install`/`npm run lint`/`npm run dev` reales. Validación best-effort (mismo método de Sprints anteriores):

- `tsc --noEmit` (stubs ambientales, `tsconfig.check.json` recreada para esta corrida): ver resultado en el resumen de entrega.
- `prettier --check` sobre `src/**/*.{ts,tsx}`: ver resultado en el resumen de entrega.
- `git status --porcelain` / `git diff --stat`: confirma el alcance exacto de archivos tocados.

**Pendiente de confirmación real por el usuario en su máquina**: `npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev` sobre `feature/sprint-3-7-radar`, y validación visual de que `Radar` coincide con `Multimax_Despacho_v1.3.html`.

## Decisiones tomadas

1. **Un solo componente `Radar`**, sin dividir en `RadarMap`/`RadarMarker`/`RadarLegend`/etc. — ninguna de esas piezas existe como estructura reutilizable en el HTML fuente.
2. **Se descartó `CountRing`** del alcance — pertenece conceptualmente al Sprint 3.8 ("Countdown"), no al Radar.
3. **`INSTALLERS`/`ELIGIBLE_ORDER` como mocks literales**, sin intentar unificarlos con `types/domain.ts` — mismo criterio que `km` (Sprint 3.2, sin resolver).
4. **Integración temporal en `RootLayout.tsx`**, aprobada explícitamente por el usuario para este Sprint tras consulta directa (ver "Problema encontrado / decisión de integración temporal").
5. **`hashAngle` en `src/lib/utils.ts`**, junto a `cn()` — es una utilidad pura de propósito general, no un catálogo de datos (a diferencia de `buildTimeSlots`, que sí vive en `constants/index.ts` junto a los datos que genera). `fmt` se deja fuera de alcance deliberadamente — no lo usa `Radar`.

## Riesgos

- `Radar` es código nuevo, puro, sin estado propio (recibe todo por props) — riesgo bajo.
- La integración temporal en `RootLayout.tsx` usa props mock estáticas que no reflejan ningún estado real de trabajos — documentado explícitamente, sin lógica de negocio.
- `hashAngle`/`posFor` dependen de `Math`, deterministas por `id` — sin aleatoriedad real, mismo comportamiento que el HTML fuente.

## Porcentaje del HTML reconstruido (este Sprint)

`Radar` migrado al 100% en su markup/CSS/componente (254 líneas de JSX fuente, líneas 1492-1745; 5 reglas CSS nuevas más 3 piezas de datos/utilidades: `hashAngle`, `INSTALLERS`, `ELIGIBLE_ORDER`). Ver `MIGRATION_STATUS.md` para el detalle agregado del proyecto.

## Confirmación de alcance respetado

- ✔ No se modificó `Header`, `mx-instside`/`InstallerSidebar`, `mx-subtabs`/`MxSubtabs`/`MxSubtabButton`, `mx-suc-sel`/`SucursalSelect`, `PublishModal`, `CoordinatorEmptyState`, `Footer` ni `AppRouter.tsx` — verificado con `git diff`.
- ✔ No se creó ninguna ruta nueva ni se modificó React Router.
- ✔ `RootLayout.tsx` solo recibió la integración temporal mínima del nuevo bloque, con la excepción aprobada explícitamente por el usuario.
- ✔ No se implementó `CountRing`, `mx-jobcard`, `QueueBar`, Indicadores con datos reales, `AssignedPanel`, `NoResponsePanel`, respuestas, Timeline, Calendar, ni ningún módulo de Installer/Admin.
- ✔ No se creó ninguna librería de mapas ni se conectó ninguna API/Supabase.
- ✔ No se avanzó al Sprint 3.8, no se analizaron bloques posteriores.

## Pendientes

- La tarjeta real "Despacho en vivo" (que envolverá a `Radar` en su posición definitiva) queda pendiente de un Sprint futuro que también implemente `jobs`/`Trabajo` real.
- `CountRing` queda pendiente para el Sprint 3.8.
- Retirar la integración temporal de `RootLayout.tsx` cuando exista esa tarjeta real.
- Unificación (o no) entre `INSTALLERS`/mock y `types/domain.ts` — sin resolver, heredado de Sprint 3.2.

## Próximo Sprint

**Sprint 3.7 cerrado (✅ Completado)**. El usuario confirmó las validaciones reales (`npm install`/`lint`/`typecheck`/`build`/`dev`) y la validación visual — `Radar` coincide con `Multimax_Despacho_v1.3.html`. El próximo Sprint a desarrollar es el 3.8 (`Countdown`/`CountRing`), que no se inicia sin el análisis previo obligatorio de su propio bloque HTML.

## Cierre del Sprint

Estado final: ✅ Completado

Validaciones realizadas:

- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run dev`

Resultado: todas las validaciones fueron ejecutadas correctamente por el usuario en su máquina, sobre `feature/sprint-3-7-radar`. La validación visual fue aprobada: `Radar` coincide con `Multimax_Despacho_v1.3.html`, sin diferencias visuales importantes. La integración temporal en `RootLayout.tsx` (última en el bloque `role === 'coordinador'`) queda documentada como temporal — se retirará cuando exista la tarjeta real "Despacho en vivo" en un Sprint futuro.

No quedaron pendientes técnicos para este Sprint. Los pendientes de alcance (tarjeta real "Despacho en vivo", `CountRing`, unificación `INSTALLERS`/`types/domain.ts`) siguen documentados en "Pendientes" arriba y se heredan a Sprints futuros, sin bloquear el cierre de este Sprint.

Sprint cerrado. Aprobado por el usuario.
