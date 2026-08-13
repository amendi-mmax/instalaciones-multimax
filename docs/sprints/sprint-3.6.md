# Sprint 3.6 - Migración del estado vacío de `Coordinator` (`mx-qempty`)

Rama: `feature/sprint-3-6-coordinator-empty-state` (creada desde la punta de `feature/sprint-3-5-publish-modal`, que ya incluye Sprint 3.1, 3.2 + sub-iteraciones, 3.3 + fix, 3.4, y 3.5 + su cierre)
Estado: ✅ Completado — el usuario confirmó localmente `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` en verde sobre `feature/sprint-3-6-coordinator-empty-state`, y validó visualmente que `CoordinatorEmptyState` coincide con `Multimax_Despacho_v1.3.html` y que el botón "Publicar trabajo" abre correctamente `PublishModal`.

## Objetivo

Continuar la reconstrucción incremental de `Multimax_Despacho_v1.3.html` migrando exactamente el siguiente bloque estructural pendiente después de `PublishModal` (Sprint 3.5) — determinado por inspección directa del HTML, no asumido del nombre genérico ("Job Cards") que traía `docs/SPRINTS_INDEX.md`.

## Fase de análisis (obligatoria, previa a la implementación)

### Determinación del bloque pendiente

`docs/SPRINTS_INDEX.md` llamaba a este Sprint, de forma genérica y nunca confirmada, "Job Cards". Se descartó esa suposición y se inspeccionó el HTML fuente directamente:

1. Se buscaron declaraciones de función que pudieran corresponder a los candidatos de la lista de pendientes de Fase 4 (`MIGRATION_STATUS.md` §3: JobCard, RadarPanel, RoundsPanel, ResponsesFeed, AssignedPanel, NoResponsePanel, QueueBar, JobList/JobRow, JobDetail, MasterCalendar, LiveCountdown, badge master):

   ```
   grep -n "^function Coordinator\|^function CoordinatorJobs\|^function JobCard\|^function QueueBar\|^function RadarPanel\|^function ResponsesFeed\|^function AssignedPanel\|^function NoResponsePanel\|^function RoundsPanel" Multimax_Despacho_v1.3.html
   ```

   Resultado: solo existen `function Coordinator(props)` (línea 2132), `function AssignedPanel({...})` (línea 2424), `function NoResponsePanel()` (línea 2453) y `function CoordinatorJobs({...})` (línea 2654). `JobCard`, `QueueBar`, `RadarPanel`, `ResponsesFeed`, `RoundsPanel` **no existen como funciones nombradas separadas** — son bloques JSX inline dentro de `Coordinator(props)` (líneas 2132-2423), o no existen en absoluto bajo ese nombre.

2. Se leyó el cuerpo completo de `function Coordinator(props) { ... }` (líneas 2132-2423). Estructura real, en orden de aparición:
   - Destructuring de props: `jobs, activeJob, activeJobId, setActiveJobId, sortBy, setSortBy, simulateJob, selectInstaller, completeJob, requestCancel, onOpenPublish`.
   - **Primera y única rama alcanzable sin datos de trabajos**: `if (jobs.length === 0) { return <div className="mx-qempty">...</div>; }` (líneas 2146-2163).
   - El resto de la función — `const job = activeJob || jobs[0]` (línea 2164) en adelante: `QueueBar` (`mx-qbar-outer`, línea 2193), la grilla `mx-grid`/`mx-col` con `mx-jobcard` (línea 2211+), la tarjeta "Despacho en vivo" (`Radar`, `mx-roundsingle`, `mx-actionsrow`), la tarjeta "Indicadores" (`mx-stats`), `AssignedPanel`/`NoResponsePanel`, y la tarjeta de respuestas (`mx-feedcard`) — **todo esto solo se ejecuta cuando `jobs.length > 0`**.

3. Se verificó de dónde viene `jobs`: en `App()`, línea 1898, `const [jobs, setJobs] = useState([]);` — arranca vacío. Se buscó cualquier constante de datos iniciales (`SEED_JOBS`, `MOCK_JOBS`, `initialJobs`, o un literal `jobs: [...]`) en todo el archivo — **no existe ninguna**. La única forma de poblar `jobs` en el HTML fuente es la función `publishJob` (invocada desde `PublishModal.onPublish`, línea 2123), que es lógica de negocio real.

4. Las instrucciones explícitas de este Sprint prohíben crear lógica de negocio, Supabase, realtime o mocks adicionales ("los datos estáticos se quedan estáticos"). Dado que **todo** el contenido de `Coordinator()` salvo el estado vacío depende de que `jobs.length > 0`, y no hay forma de alcanzar ese estado sin inventar datos o lógica fuera de alcance, el único bloque de `Coordinator()` reconstruible honestamente en este Sprint es el estado vacío (`mx-qempty`).

5. Se cruzó este hallazgo con dos componentes ya existentes desde Fase 3, sin consumidor hasta ahora (verificado con `grep -rn "EmptyState\|from '@/components/ui/button'" src`):
   - `src/components/shared/empty-state.tsx` → `EmptyState`, variante `size="page"`, ya reconstruye `.mx-qempty`/`.mx-qempty-ic` verbatim, con un comentario propio que referencia exactamente `Coordinator()` con `jobs.length === 0`.
   - `src/components/ui/button.tsx` → `Button`, variante `ice`, ya reconstruye `.mx-btn`/`.mx-btn-ice`.
   - El CSS de ambos bloques (`mx-qempty`/`mx-qempty-ic`, líneas 411-436 del HTML; `mx-btn`/`mx-btn-ice`, líneas 319-340) ya estaba portado en `globals.css` desde Fase 3 — verificado con `grep -n`. **No se necesita agregar CSS nuevo en este Sprint.**

**El Sprint 3.6 migra únicamente el estado vacío de `Coordinator` (`mx-qempty`) — NO "Job Cards" (`mx-jobcard`), que pertenece a la rama `jobs.length > 0`, fuera de alcance mientras no exista lógica real de publicación de trabajos.** Esta es una corrección de nombre análoga a la del Sprint 3.4 ("Main Layout" → `mx-suc-sel`).

### Ubicación exacta en el archivo fuente

- **JSX**: `Multimax_Despacho_v1.3.html`, dentro de `function Coordinator(props)`, líneas 2132-2163 (la función arranca en 2132; el bloque `mx-qempty` en sí son las líneas 2146-2163).
- **CSS**: líneas 411-436 (`.mx-qempty`, `.mx-qempty-ic`, `.mx-qempty h3`, `.mx-qempty p`) y líneas 319-340 (`.mx-btn`, `.mx-btn:disabled`, `.mx-btn-ice`, `.mx-btn-ice:hover`) — ambos ya portados en `globals.css` desde Fase 3, sin cambios en este Sprint.
- **Invocación de `Coordinator` en `App()`**: líneas 2096-2107, como rama `coordTab === "despacho"` dentro del mismo contenedor de `role === "coord"` que ya incluye `mx-suc-sel` (Sprint 3.4) y `mx-subtabs-wrap` (Sprint 3.3); `onOpenPublish: () => setShowPublishModal(true)` (línea 2107).

### Bloque del HTML migrado (JSX de referencia, transcrito literalmente)

```jsx
if (jobs.length === 0) {
  return (
    <div className="mx-qempty">
      <div className="mx-qempty-ic">
        <Crosshair size={26} />
      </div>
      <h3>No hay trabajos activos</h3>
      <p>Publica un trabajo para notificar de inmediato a los instaladores de tu zona.</p>
      <button
        className="mx-btn mx-btn-ice"
        style={{ flex: 'none', padding: '13px 26px' }}
        onClick={onOpenPublish}
      >
        <Plus size={16} />
        Publicar trabajo
      </button>
    </div>
  );
}
```

(Reconstruido en JSX legible a partir de los `React.createElement` reales de las líneas 2146-2163 — contenido, orden y props idénticos; solo cambia la notación.)

### Clases CSS involucradas

| Clase | Declarada en (CSS fuente) | Estado antes de este Sprint |
| --- | --- | --- |
| `.mx-qempty` / `.mx-qempty-ic` / `.mx-qempty h3` / `.mx-qempty p` | líneas 411-436 | Ya portada (Fase 3), sin componente que la consumiera |
| `.mx-btn` / `.mx-btn-ice` | líneas 319-340 | Ya portada (Fase 3), consumida solo con clase literal en `PublishModal` (Sprint 3.5), nunca vía el componente `Button` |

Ninguna regla de `globals.css` se modificó en este Sprint — verificado con `git diff -- src/styles/globals.css` (sin salida).

### Estructura HTML / elementos hijos

```
div.mx-qempty
├── div.mx-qempty-ic
│   └── <Crosshair size={26}/>
├── h3 > "No hay trabajos activos"
├── p > "Publica un trabajo para notificar de inmediato a los instaladores de tu zona."
└── button.mx-btn.mx-btn-ice (onClick=onOpenPublish, style={flex:none, padding:"13px 26px"})
    ├── <Plus size={16}/>
    └── "Publicar trabajo"
```

### Componentes React que surgen de esta sección

| Componente | Corresponde a | Nuevo/reutilizado |
| --- | --- | --- |
| `CoordinatorEmptyState` | `div.mx-qempty` completo (icono + h3 + p + botón), primer consumidor real | Nuevo (envoltorio delgado) |
| `EmptyState` (`components/shared/empty-state.tsx`, `size="page"`) | `.mx-qempty`/`.mx-qempty-ic` genérico | Reutilizado (Fase 3, sin consumidor hasta este Sprint) |
| `Button` (`components/ui/button.tsx`, `variant="ice"`) | `.mx-btn`/`.mx-btn-ice` | Reutilizado (Fase 3, sin consumidor hasta este Sprint) |

Se creó únicamente `CoordinatorEmptyState` porque el contenido específico (ícono `Crosshair`, textos en español, botón con `onOpenPublish`) no tiene otro lugar natural — `EmptyState` es intencionalmente genérico (también sirve para la variante `mx-empty` compacta) y no debía ganar contenido específico de Coordinator.

### Qué NO se migra en este Sprint

- `QueueBar` (`mx-qbar-outer`/`mx-qbar`/`mx-qjob`/`mx-qjob-id`/`mx-qjob-t`/`mx-qadd`).
- La tarjeta `mx-jobcard` (header de pills, título, meta, requisitos) — el bloque que el nombre genérico "Job Cards" probablemente intentaba describir.
- La tarjeta "Despacho en vivo" (`Radar`, `mx-roundsingle`, `mx-actionsrow`).
- La tarjeta "Indicadores" (`mx-stats`, `StatTile`/`Counter`).
- `AssignedPanel`, `NoResponsePanel`.
- La tarjeta de respuestas en tiempo real (`mx-feedcard`, `mx-resp`, `mx-sort`).
- `CoordinatorJobs` (pestaña "Mis trabajos").
- Cualquier estado real de `jobs`/`Trabajo`, `publishJob`, Supabase, realtime, o navegación real de `coordTab`.

Todo lo anterior depende de `jobs.length > 0`, fuera de alcance mientras no exista lógica real de publicación.

## Problema encontrado / decisión (reportado, no un fix silencioso fuera de alcance)

**Resolución planeada del pendiente del Sprint 3.5**: desde el cierre del Sprint 3.5, `docs/sprints/sprint-3.5.md`/`MIGRATION_STATUS.md` documentaban como pendiente explícito "sustituir `showPublishModal` forzado por el botón real `onOpenPublish` cuando exista `Coordinator`/`QueueBar`". Este Sprint construye exactamente ese botón real (`CoordinatorEmptyState`'s "Publicar trabajo", que en el HTML fuente es `onOpenPublish` de `Coordinator`, línea 2144, conectado en `App()` como `() => setShowPublishModal(true)`, línea 2107). Por lo tanto se revirtió `showPublishModal` en `RootLayout.tsx` de `useState(true)` (forzado, Sprint 3.5) a `useState(false)` (valor real del HTML fuente, línea 1905) y se conectó `onOpenPublish={() => setShowPublishModal(true)}`. Esto **no es una modificación fuera de alcance de un Sprint anterior** — es la resolución, explícitamente anticipada y documentada desde el propio Sprint 3.5, de una integración temporal que ese mismo Sprint señaló como "a revertir en el Sprint que construya Coordinator/QueueBar". `PublishModal.tsx` (el componente en sí) no se tocó.

No quedan otros problemas nuevos que reportar en este Sprint.

## Archivos creados

- `docs/sprints/sprint-3.6.md`
- `src/components/shared/coordinator-empty-state.tsx` (`CoordinatorEmptyState`)

## Archivos modificados

- `src/layouts/RootLayout.tsx` — se agregó el render de `<CoordinatorEmptyState onOpenPublish={() => setShowPublishModal(true)} />` como último hijo del `<div>` que ya envuelve `SucursalSelect`/`MxSubtabs` (rama `role === 'coordinador'`), mismo orden relativo que el HTML fuente (`mx-suc-sel` → `mx-subtabs-wrap` → `Coordinator`). Se cambió `showPublishModal` de `useState(true)` a `useState(false)` (ver "Problema encontrado / decisión"). Se actualizó el comentario JSDoc de la función para reflejar ambos cambios. No se tocó `Header`, `Footer`, `InstallerSidebar`, `MxSubtabs`/`MxSubtabButton`, `SucursalSelect` ni `PublishModal`.

## Archivos eliminados

Ninguno.

## CSS agregado

Ninguno — `.mx-qempty`/`.mx-qempty-ic`/`.mx-btn`/`.mx-btn-ice` ya estaban portados en `globals.css` desde Fase 3 (verificado con `grep -n` antes de implementar). `globals.css` no se modificó en este Sprint — confirmado con `git diff --stat -- src/styles/globals.css` (sin salida).

## Validaciones ejecutadas

Esta sesión en la nube sigue sin acceso a `registry.npmjs.org` (`npm install --dry-run` reconfirmado con `E403 Forbidden`); no fue posible ejecutar aquí `npm install`/`npm run lint`/`npm run dev` reales. Validación best-effort (mismo método de Sprints anteriores):

- `tsc --noEmit` (stubs ambientales en `/tmp/ts-stub-check/`, `tsconfig.check.json` recreada para esta corrida): **0 diagnósticos**.
- `prettier --check` sobre `src/**/*.{ts,tsx}`: cero diferencias.
- `git status --porcelain` / `git diff --stat`: confirma que los únicos archivos tocados son `src/layouts/RootLayout.tsx` (modificado), `src/components/shared/coordinator-empty-state.tsx` (nuevo) y los 6 archivos de documentación de este cierre — ningún otro componente/Sprint aprobado se modificó, y `globals.css` no cambió.
- Revisión manual de tipos (más allá del stub, por la limitación conocida documentada desde el Sprint 3.5): `CoordinatorEmptyStateProps.onOpenPublish: () => void` es un tipo simple sin genéricos/indexado — no hay riesgo de que los stubs oculten un error real aquí.

**Pendiente de confirmación real por el usuario en su máquina**: `npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev` sobre `feature/sprint-3-6-coordinator-empty-state`, y validación visual de que `CoordinatorEmptyState` aparece en la posición correcta (dentro de `role === 'coordinador'`, después de `mx-subtabs`) y coincide con `Multimax_Despacho_v1.3.html`.

## Decisiones tomadas

1. **Nombre del componente**: `CoordinatorEmptyState` (no `MxQempty` ni "JobCards") — descriptivo de su origen real (el estado vacío de `Coordinator`), siguiendo el mismo criterio que `SucursalSelect` para bloques JSX inline sin función propia en el fuente.
2. **Reutilización de `EmptyState`/`Button`**: ambos ya existían desde Fase 3 sin consumidor; se les dio su primer uso real en vez de duplicar su markup/CSS.
3. **Se corrigió la desincronización planeada del Sprint 3.5** (`showPublishModal` forzado): ver "Problema encontrado / decisión" — cambio explícitamente anticipado, no un fix fuera de alcance.
4. **Render incondicional dentro de `role === 'coordinador'`** (sin condicionar por `coordTab`): `RootLayout` no tiene todavía estado real de pestañas (decisión del Sprint 3.3, sin cambios aquí), y "Despacho en vivo" es la única pestaña visualmente activa — mismo criterio ya usado para integrar `MxSubtabs`/`SucursalSelect`.

## Dependencias detectadas

- `mx-jobcard`/`QueueBar`/`Radar`/`AssignedPanel`/`NoResponsePanel`/`mx-feedcard`/`mx-stats` (el resto de `Coordinator()`) quedan pendientes para un Sprint futuro que también implemente `jobs`/`Trabajo` real (Supabase o, como mínimo, `publishJob` con estado local) — sin esa base de datos no hay forma de alcanzar la rama `jobs.length > 0` sin inventar mocks fuera de alcance.
- `CoordinatorJobs` (pestaña "Mis trabajos") y la navegación real de `coordTab` siguen sin Sprint asignado explícitamente.
- La desincronización `SucursalSelect`↔`HeaderStatus.sucursalActiva` (heredada del Sprint 3.4) sigue sin resolver — no relacionada con este Sprint.

## Riesgos

- `CoordinatorEmptyState` es código nuevo, puro, sin estado propio (solo una prop callback) — riesgo bajo.
- El cambio de `showPublishModal` de `true` a `false` en `RootLayout` es un cambio de comportamiento visual real (el modal ya no se abre solo al cargar `npm run dev`) — es intencional y estaba anticipado desde el Sprint 3.5, pero se señala explícitamente para que el usuario lo valide visualmente: ahora se abre únicamente al pulsar "Publicar trabajo" en `CoordinatorEmptyState`.

## Porcentaje del HTML reconstruido (este Sprint)

`mx-qempty` migrado al 100% en su markup (18 líneas de JSX fuente, líneas 2146-2163); cero CSS nuevo (ya portado). Es una porción pequeña de `Coordinator()` (18 de ~290 líneas de la función) — el resto queda documentado como dependiente de una base de datos de trabajos real. Ver `MIGRATION_STATUS.md` para el detalle agregado del proyecto.

## Confirmación de alcance respetado

- ✔ No se modificó `Header`, `mx-top`, `mx-instside`/`InstallerSidebar`, `mx-subtabs`/`MxSubtabs`/`MxSubtabButton`, `mx-suc-sel`/`SucursalSelect`, `PublishModal`, `Footer`, `RoleSwitch` ni `AppRouter.tsx` — verificado con `git diff`.
- ✔ `RootLayout.tsx` solo recibió la integración mínima del nuevo bloque más la reversión planeada de `showPublishModal` (ver "Problema encontrado / decisión").
- ✔ No se implementó `mx-jobcard`, `QueueBar`, Radar, Countdown, Timeline, Calendar, Installer Dashboard, Installer Profile, Installer Jobs, Admin Dashboard, Shared Dialogs ni Shared Components adicionales.
- ✔ No se avanzó al Sprint 3.7, no se analizaron bloques posteriores.
- ✔ No se creó ningún mock/dato nuevo de trabajos ni lógica de negocio.

## Próximo Sprint

**Sprint 3.6 cerrado formalmente (✅ Completado).** Siguiente Sprint a desarrollar: Sprint 3.7. No se avanza automáticamente — se espera aprobación explícita del usuario.

## Cierre del Sprint

Estado final: ✅ Completado

Validaciones realizadas:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run dev`

Resultado: todas las validaciones fueron ejecutadas correctamente por el usuario en su máquina, sobre `feature/sprint-3-6-coordinator-empty-state`. La validación visual fue aprobada: `CoordinatorEmptyState` coincide con `Multimax_Despacho_v1.3.html`, sin diferencias visuales importantes. El componente `CoordinatorEmptyState` quedó integrado correctamente con `PublishModal` mediante el botón "Publicar trabajo" (`onOpenPublish` → `setShowPublishModal(true)`).

No quedaron pendientes técnicos para este Sprint.

Sprint cerrado. Aprobado por el usuario.
