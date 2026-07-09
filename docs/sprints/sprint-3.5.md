# Sprint 3.5 - Migración del bloque `PublishModal`

Rama: `feature/sprint-3-5-publish-modal` (creada desde la punta de `feature/sprint-3-4-mx-suc-sel`, que ya incluye Sprint 3.1, 3.2 + sub-iteraciones + 3.3 + su fix de integración visual + 3.4 + su cierre documental)
Estado: ✅ Completado — el usuario confirmó localmente `npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` en verde sobre `feature/sprint-3-5-publish-modal`, y validó visualmente que `PublishModal` coincide con `Multimax_Despacho_v1.3.html`.

## Objetivo

Continuar la reconstrucción incremental de `Multimax_Despacho_v1.3.html` migrando exclusivamente el bloque "Publish Modal" indicado en `docs/SPRINTS_INDEX.md`, verificando primero — por inspección directa del HTML, no por el nombre genérico — cuál es el selector/componente real al que corresponde.

## Fase de análisis (obligatoria, previa a la implementación)

### Verificación del nombre "Publish Modal" contra el HTML real

Antes de escribir código se inspeccionó `Multimax_Despacho_v1.3.html` completo (3.557 líneas) para confirmar el bloque real:

- El DOM pre-renderizado (snapshot estático, línea 457) muestra un bloque `<div class="mx-publishwrap"><div class="mx-card mx-publish"><div class="mx-pub-h">...` con un formulario de publicación mostrado siempre visible (sin overlay, sin botón de cierre).
- Sin embargo, ese snapshot es una versión **desactualizada** del prototipo: las clases `.mx-publishwrap`/`.mx-publish`/`.mx-pub-h`/`.mx-pub-ic`/`.mx-publishbtn` **no aparecen en ningún `React.createElement` del script** (verificado con `grep -c` sobre las 515 llamadas a `React.createElement` del archivo — cero coincidencias fuera del snapshot y de la declaración CSS). Es decir, el script ya no genera ese markup.
- El componente real y vigente, confirmado en el propio script, es la función `function PublishModal({ sucursal, onPublish, onClose })` (línea 2496), que renderiza `.mx-modal-bg > .mx-modal-panel > .mx-modal-hd (icono Zap + "Publicar trabajo" + botón ×) > .mx-modal-body > .mx-fields (formulario completo) + botón "Publicar trabajo"`.
- Este bloque se activa vía `showPublishModal` (`useState(false)` en `App()`, línea 1905) y se renderiza como **hermano** de las ramas de `role` — no anidado dentro de `role === "coord"` —, justo después de `role === "admin" && AdminPanel` y antes de `confirmCancel && ConfirmCancel`/`<footer>` (línea 2121): `showPublishModal && React.createElement(PublishModal, { sucursal: sucursalCoord, onPublish: publishJob, onClose: () => setShowPublishModal(false) })`.
- Conclusión: el nombre genérico **"Publish Modal" de `docs/SPRINTS_INDEX.md` SÍ corresponde al bloque real** — a diferencia del Sprint 3.4 ("Main Layout"), aquí no hubo que corregir el nombre, solo confirmarlo contra el script y descartar el snapshot obsoleto como referencia.

**El Sprint 3.5 migrará únicamente el bloque `PublishModal` (función `PublishModal()`, clases `.mx-modal-bg`/`.mx-modal-panel`/`.mx-modal-hd`/`.mx-modal-close`/`.mx-modal-body` + el formulario `.mx-fields` que contiene).**

### Ubicación exacta en el archivo fuente

- **JSX**: `Multimax_Despacho_v1.3.html`, líneas 2496-2631 (función `PublishModal`).
- **Invocación/gate**: línea 2121 (`showPublishModal && React.createElement(PublishModal, {...})`, dentro de `App()`).
- **CSS del shell del modal** (ya portado desde Fase 3, sin cambios): líneas 383-391 (`.mx-modal-bg`/`.mx-modal-panel`/`@keyframes mxup`/`.mx-modal-hd`/`.mx-modal-close`/`.mx-modal-body`).
- **CSS del formulario** (ya portado desde Fase 3, sin cambios): líneas 145-157 (`.mx-fields`/`.mx-f2`/inputs/selects), 158-164 (`.mx-bidopts`/`.mx-bidbtn`/`.mx-urg`, ya usados por `Chip`).
- **CSS nuevo en este Sprint**: líneas 222-226 (`.mx-priceinput`) y 229-230 (`.mx-datein`) — no existían en `globals.css` antes de este Sprint.
- **Datos del formulario** (constantes ya existentes en el script, no creadas aquí de cero): `PROVINCIAS`/`ZONAS` (líneas 1084-1097), `BID_OPTIONS` (líneas 1061-1070), `SLOTS_COORD`/`buildTimeSlots` (líneas 1099-1113), `SUCURSALES` (línea 1116, ya en `constants/index.ts` desde el Sprint 3.4).

### Discrepancias detectadas entre el snapshot y el script (resueltas a favor del script, autoritativo)

Mismo criterio aplicado desde el Sprint 3.1 ("Problema encontrado" — snapshot vs. script):

1. **"Tipo de inmueble"**: el snapshot (línea 457) solo lista 2 opciones (`Edificio`/`Casa`); el script (línea ~2570) tiene 3 (`Edificio`/`Casa`/`Comercial`). Se implementaron las 3 del script.
2. **Etiqueta de notas**: el snapshot dice `"¿Algo más que quieras agregar?"`; el script dice `"Notas adicionales (opcional)"`. Se usó el texto del script.

### Estructura del bloque migrado (JSX de referencia, transcrito literalmente)

```jsx
<div className="mx-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
  <div className="mx-modal-panel">
    <div className="mx-modal-hd">
      <h3><Zap size={15}/>Publicar trabajo</h3>
      <button className="mx-modal-close" onClick={onClose}>×</button>
    </div>
    <div className="mx-modal-body">
      <div className="mx-fields">
        <label>Sucursal que publica<select>...SUCURSALES...</select></label>
        <label>Tipo de instalación<input/></label>
        <div className="mx-f2">
          <label>Provincia<select>...PROVINCIAS...</select></label>
          <label>Zona<select>...ZONAS[provincia]...</select></label>
        </div>
        <div className="mx-f2">
          <label>Tipo de inmueble<select>Edificio/Casa/Comercial</select></label>
          <label>Calle / dirección<input placeholder="Ej. Av. Italia, calle 50"/></label>
        </div>
        <label>Equipo<input/></label>
        <div className="mx-f2">
          <label>Fecha<input type="date" className="mx-datein"/></label>
          <label>Hora<select>...SLOTS_COORD...</select></label>
        </div>
        <label>Requisitos especiales<input placeholder="Ej. Cliente en piso 14, requiere andamio"/></label>
        <label>Notas adicionales (opcional)<input placeholder="Notas para el instalador"/></label>
        <div className="mx-f2">
          <label>Precio sugerido (USD)<div className="mx-priceinput"><span>$</span><input type="number"/></div></label>
          <button className="mx-urg">Normal/Urgente</button>
        </div>
        <label>Tiempo del bid (...)<div className="mx-bidopts">[3 botones mx-bidbtn]</div></label>
      </div>
      <button className="mx-btn mx-btn-ice"><Send size={16}/>Publicar trabajo</button>
    </div>
  </div>
</div>
```

## Componentes React

| Componente | Tipo | Clase(s) `mx-*` portada(s) | Notas |
| --- | --- | --- | --- |
| `PublishModal` (`src/components/shared/publish-modal.tsx`) | Nuevo | `.mx-modal-bg`/`.mx-modal-panel`/`.mx-modal-hd`/`.mx-modal-close`/`.mx-modal-body` (vía `Drawer`), `.mx-fields`/`.mx-f2`/`.mx-priceinput`/`.mx-datein`/`.mx-bidopts` | Único componente nuevo de este Sprint. Contiene el formulario completo (no se dividió en sub-componentes: el HTML fuente tampoco lo hace, es una sola función). |

### Componentes reutilizados (sin duplicar)

- `Drawer`/`DrawerOverlay`/`DrawerContent`/`DrawerHeader`/`DrawerBody` (`components/ui/drawer.tsx`, Fase 3) — ya reconstruía exactamente `.mx-modal-bg`/`.mx-modal-panel`/`.mx-modal-hd`/`.mx-modal-close`/`.mx-modal-body`. Primer consumidor real de este componente en el proyecto.
- `Select` (`components/ui/select.tsx`) — reutilizado para los 5 `<select>` del formulario (Sucursal, Provincia, Zona, Tipo de inmueble, Hora).
- `Input` (`components/ui/input.tsx`) — reutilizado para los campos de texto simples (Tipo de instalación, Calle, Equipo, Requisitos, Notas).
- `Chip` (`components/ui/chip.tsx`, variantes `urg`/`bidbtn`) — reutilizado para el toggle "Normal/Urgente" y los 3 botones de "Tiempo del bid". Primer consumidor real de la variante `bidbtn` con datos (`BID_OPTIONS`).
- `DialogPortal` (`components/ui/dialog.tsx`) — reutilizado para envolver `DrawerOverlay`/`DrawerContent`, mismo patrón ya usado en `shared/confirm-dialog.tsx`.

No se creó ningún componente adicional (no se necesitó ningún `PublishModalField`/`PublishModalForm` intermedio): el formulario completo cabe en una sola función, igual que en el HTML fuente.

## Datos: constantes agregadas a `src/constants/index.ts`

Todas transcritas verbatim del script (no son mocks nuevos, son el mismo contenido estático que el prototipo ya usaba):

- `PROVINCIAS` (11 provincias de Panamá, líneas 1084 del HTML fuente).
- `ZONAS` (mapa provincia → lista de corregimientos/zonas, líneas 1085-1097). Tipado `Record<string, readonly string[]>` (no `Record<(typeof PROVINCIAS)[number], ...>`) porque `PublishForm.provincia` es `string` en tiempo de ejecución (viene de un `<select>`) — indexar un `Record` con clave literal-union usando un `string` genérico es un error de TypeScript estricto (`TS7053`); se verificó este caso puntual con un `tsc` aislado antes de fijar el tipo definitivo (ver "Validaciones ejecutadas").
- `BID_OPTIONS` (3 opciones de tiempo de bid, líneas 1061-1070), con su propia interfaz `BidOption`.
- `buildTimeSlots()` + `SLOTS_COORD` (utilidad pura que genera horarios cada 15 min entre las 7:00 a.m. y las 8:00 p.m., líneas 1099-1113) — no es lógica de negocio: no lee ni escribe ningún estado de la aplicación, solo produce una lista estática de strings, igual que en el HTML fuente. `SLOTS_INST` (mismo cálculo para el Instalador) no se agrega — pertenece a un Sprint futuro (OfferForm del Instalador).

## Dependencias con otras partes del HTML

- `SUCURSALES` (ya agregada en el Sprint 3.4) alimenta el `<select>` "Sucursal que publica" — reutilizada tal cual, sin cambios.
- El shell del modal (`Drawer`/`DrawerOverlay`/`DrawerContent`/`DrawerHeader`/`DrawerBody`) y los primitivos de formulario (`Select`/`Input`/`Chip`) ya existían desde Fase 3 — este Sprint es su primer consumidor real.

## Qué NO se migra en este Sprint

- `Coordinator`/`QueueBar`/`onOpenPublish` (el botón real que abre el modal) — no existen todavía, pertenecen a un Sprint futuro (Job Cards/Coordinator).
- `publishJob`/`TRABAJOS` (lógica real de publicar un trabajo, notificar instaladores, agregarlo a una lista) — lógica de negocio explícitamente fuera de alcance.
- `ConfirmCancel`, `AdminPanel`, `Coordinator`, `CoordinatorJobs`, `Installer` — no se tocan, no se implementan.
- `SLOTS_INST`, `.mx-cominput`, `.mx-horasel`, `.mx-sendbtn` (pertenecen al `OfferForm` del Instalador, no al `PublishModal` del Coordinador).

## Problema encontrado (reportado, no corregido silenciosamente)

**Snapshot obsoleto para este mismo bloque.** Ver "Discrepancias detectadas" arriba: el DOM pre-renderizado del HTML (línea 457) no refleja el `PublishModal` real del script — muestra una versión anterior sin overlay/modal (`.mx-publishwrap`). Se documenta para que quede claro por qué la implementación de este Sprint no se parece al snapshot visual del archivo fuente, y se prioriza siempre el script (autoritativo), consistente con el criterio ya aplicado en Sprint 3.1.

**`onPublish` sin lógica real.** El botón "Publicar trabajo" invoca `onPublish(f)`, pero `RootLayout` le pasa una función vacía — no existe todavía ningún `TRABAJOS`/lista de trabajos que actualizar (pertenece a un Sprint futuro de Job Cards). Se documenta como pendiente, no se inventa ninguna lógica de negocio para rellenar el vacío.

**Integración forzada temporalmente abierta.** `showPublishModal` se inicializa en `true` en `RootLayout` (el HTML fuente arranca en `false`) porque no existe todavía el botón real que lo abre (`onOpenPublish` de `Coordinator`/`QueueBar`). Ver comentario "TEMPORARY INTEGRATION — Sprint 3.5" en `RootLayout.tsx`.

## Archivos creados

- `src/components/shared/publish-modal.tsx` (`PublishModal`, `PublishForm`)
- `docs/sprints/sprint-3.5.md`

## Archivos modificados

- `src/constants/index.ts` — agregadas `PROVINCIAS`, `ZONAS`, `BID_OPTIONS` (+ interfaz `BidOption`), `buildTimeSlots`/`SLOTS_COORD`. Ninguna constante existente (`APP_NAME`, `SUCURSALES`) se tocó.
- `src/styles/globals.css` — agregada la sección `.mx-priceinput`/`.mx-datein` (verbatim, líneas 222-226 y 229-230 del HTML fuente), insertada inmediatamente antes de la sección `.mx-suc-sel` (Sprint 3.4) existente. Ninguna otra regla se tocó — verificado con `git diff` que solo hay líneas agregadas.
- `src/layouts/RootLayout.tsx` — se agregó `const [showPublishModal, setShowPublishModal] = useState(true)` y se renderiza `<PublishModal sucursal={sucursalCoord} open={showPublishModal} onOpenChange={setShowPublishModal} onPublish={() => {}} />` como hermano de los bloques de `role` existentes, justo antes de `<Outlet/>` — mismo orden relativo que en `App()`. `Header`/`MxSubtabs`/`SucursalSelect`/`InstallerSidebar` no se modificaron.

## Archivos eliminados

Ninguno.

## Validaciones ejecutadas

Esta sesión en la nube sigue sin acceso a `registry.npmjs.org` (confirmado de nuevo con `npm install --dry-run`, error 403); no fue posible ejecutar aquí `npm install`/`npm run lint`/`npm run dev` reales. Validación best-effort (mismo método de Sprints anteriores):

- `tsc --noEmit` (stubs ambientales, `tsconfig.check.json` recreada para esta corrida): **0 diagnósticos**.
- **Limitación detectada y corregida en esta misma sesión**: los stubs ambientales (`declare module 'react';` sin miembros) hacen que casi todos los tipos de React/props colapsen a `any`, lo que oculta errores reales de indexado estricto. Se detectó manualmente que `ZONAS` tipado como `Record<(typeof PROVINCIAS)[number], readonly string[]>` fallaría el `typecheck` real del usuario al indexarlo con `f.provincia` (tipo `string`) — error `TS7053`. Se verificó este caso aislado con un `tsc` de prueba fuera del stub (reproduciendo el error), y se corrigió tipando `ZONAS` como `Record<string, readonly string[]>` antes de continuar. Documentado aquí porque es una limitación real del método de validación de este sandbox, no del código final.
- `prettier --check` sobre `src/**/*.{ts,tsx}`: cero diferencias (el archivo nuevo `publish-modal.tsx` se formateó una vez con `prettier --write` al ser un archivo nuevo sin formato previo que preservar — no se tocó ningún archivo ya aprobado).
- Balance de llaves `{}` de `globals.css` verificado programáticamente: 165 aperturas / 165 cierres.
- `git status --porcelain`: confirma que los únicos archivos tocados son `src/constants/index.ts`, `src/styles/globals.css`, `src/layouts/RootLayout.tsx` (modificados) y `src/components/shared/publish-modal.tsx` (nuevo).

**Pendiente de confirmar por el usuario en su máquina**: `npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`, y verificación visual directa en el navegador de que `PublishModal` aparece (sobre `role === 'coordinador'` inicial) en la posición correcta, coincide con el HTML oficial (formulario completo, mismo orden de campos) y no rompe ningún Sprint anterior.

## Decisiones tomadas

1. **Nombre del componente**: `PublishModal`, idéntico al nombre de la función en el script — no se usó ningún nombre alternativo ni el genérico "Publish Modal" del índice como identificador técnico; se confirmó independientemente contra el HTML.
2. **Estado del formulario dentro del componente, no lifted**: `useState<PublishForm>` vive dentro de `PublishModal`, igual que en el HTML fuente (el `useState` de `f` está dentro de la función `PublishModal`, no en `App()`) — a diferencia de `sucursalCoord`/`role`, que sí viven en `RootLayout`.
3. **`open`/`onOpenChange` controlados desde `RootLayout`**: mismo patrón ya usado por `ConfirmDialog` (Fase 3), para reutilizar los primitivos de Radix Dialog (foco, Escape, click-outside) sin reinventar esa lógica.
4. **`showPublishModal` forzado a `true` temporalmente**: para cumplir el requisito de este Sprint de que el bloque sea visible de inmediato en `npm run dev`, dado que no existe todavía el botón real (`onOpenPublish`) que lo abriría. Documentado como decisión temporal en `RootLayout.tsx`.
5. **`ZONAS` tipado como `Record<string, readonly string[]>`**: para que `ZONAS[f.provincia]` compile bajo TypeScript estricto sin `noUncheckedIndexedAccess` (no está activado en `tsconfig.app.json`), ya que `f.provincia` es `string` en tiempo de ejecución.

## Riesgos

- `PublishModal` es el primer consumidor real de `Drawer`/`Chip`(`variant="bidbtn"`)/`Select` combinados en un formulario completo — si hay algún desajuste de estilos entre el uso aislado (con el que se diseñaron esos componentes en Fase 3) y este uso real, podría no notarse hasta la validación visual del usuario.
- El formulario no tiene ninguna validación de campos (ni la tiene el HTML fuente) — fidelidad exacta, no es un riesgo introducido por esta migración.
- La limitación de los stubs ambientales (ver "Validaciones ejecutadas") significa que el best-effort de este sandbox es más débil de lo que aparenta para este Sprint en particular (formularios con muchos tipos); se compensó con revisión manual del código nuevo caso por caso, pero no reemplaza el `npm run typecheck` real.

## Porcentaje del HTML reconstruido (este Sprint)

`PublishModal` migrado al 100% en su markup/CSS (135 líneas de JSX fuente, líneas 2496-2631; 2 reglas CSS nuevas agregadas, mx-priceinput + mx-datein, el resto ya portado desde Fase 3) — visible de inmediato en `RootLayout` (forzado abierto), en la posición relativa correcta respecto a los demás bloques ya migrados. Ver `MIGRATION_STATUS.md` para el detalle agregado del proyecto.

## Confirmación de alcance respetado

- ✔ No se modificó `Header`, `mx-top`, `mx-instside`, `InstallerSidebar`, `mx-subtabs`, `MxSubtabs`/`MxSubtabButton`, `SucursalSelect`, `Footer`, `RoleSwitch` ni `AppRouter.tsx` — verificado con `git diff`.
- ✔ `RootLayout.tsx` solo recibió la integración mínima del nuevo bloque (nuevo estado + `<PublishModal>` como hermano), sin alterar el funcionamiento de los bloques ya migrados.
- ✔ No se implementó Job Cards, Radar, Timeline, Countdown, Feed, Admin, Installer Dashboard, lógica realtime, Supabase, navegación real ni llamadas API.
- ✔ No se avanzó al Sprint 3.6, no se analizaron bloques posteriores.

## Próximo Sprint

A definir por el usuario. No se avanza automáticamente al Sprint 3.6.

## Cierre del Sprint

Estado: ✅ Completado

Validaciones aprobadas:
- npm run lint
- npm run typecheck
- npm run build
- npm run dev

Validación visual: Aprobada — `PublishModal` coincide con `Multimax_Despacho_v1.3.html`, sin diferencias visuales importantes; la integración temporal mediante `showPublishModal=true` es correcta hasta que exista `Coordinator`/`QueueBar`.

Aprobado por el usuario.
