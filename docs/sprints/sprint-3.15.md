# Sprint 3.15 - Migración de "Shared Dialogs" → `ConfirmCancel`

Rama: `feature/sprint-3-15-shared-dialogs`
Estado: 🟡 En revisión — pendiente de validación real (npm run lint/typecheck/build/dev), validación visual y aprobación explícita del usuario.

## Objetivo

Reconstruir exclusivamente el bloque "Shared Dialogs" de `Multimax_Despacho_v1.3.html`, sin rediseñar, reinterpretar, simplificar ni modernizar. Sin lógica de negocio real, sin Supabase/Realtime/queries/mutations/hooks de negocio/services/auth/APIs — datos/estado exclusivamente mock/local, igual que el resto de los Sprints de Fase 3.

## Análisis obligatorio (previo a la implementación) — regla nueva de este Sprint

### 1. Función encontrada

`function ConfirmCancel({ onYes, onNo })` (líneas 3531-3553 del script fuente) — es el ÚNICO diálogo de confirmación genérico/compartido que existe en todo el script. Se buscó exhaustivamente cualquier otro patrón de diálogo compartido (`function.*Dialog`, `function.*Modal`, `window.confirm`, textos "¿Seguro...?"/"¿Eliminar...?"/"¿Quieres...?") y no se encontró ningún otro candidato: `PublishModal` (línea 2496) ya fue migrado y aprobado en el Sprint 3.5 (está en la lista de componentes prohibidos de modificar) y no es un "diálogo compartido" genérico sino un formulario específico de publicación.

### 2. Corrección de nombre (obligatoria por el brief de este Sprint)

"Shared Dialogs" NO es el nombre de ninguna función real del script — es un nombre genérico de `docs/SPRINTS_INDEX.md`. Se corrige a `ConfirmCancel`, la única función real que corresponde a esta categoría. Se mantiene trazabilidad: en `docs/SPRINTS_INDEX.md` (actualizado recién tras la aprobación del usuario, no en esta ronda) se documentará como "Sprint 3.15 → `ConfirmCancel` (antes 'Shared Dialogs')".

### 3. Selector HTML

`.mx-confirm-bg` (overlay de fondo) → `.mx-confirm-card` (tarjeta) → `h3` (ícono `AlertTriangle` + título) + `p` (descripción) + `.mx-confirm-acts` (`.mx-confirm-no` / `.mx-confirm-yes`, este último con ícono `XCircle`).

### 4. Líneas del HTML

- `ConfirmCancel()`: líneas 3531-3553 (23 líneas de JSX fuente).
- CSS asociado: líneas 443-453 del `<style>` original (`.mx-confirm-bg`/`.mx-confirm-card`/`.mx-confirm-card h3`/`.mx-confirm-card h3 svg`/`.mx-confirm-card p`/`.mx-confirm-acts`/`.mx-confirm-acts button`/`.mx-confirm-no`/`.mx-confirm-no:hover`/`.mx-confirm-yes`/`.mx-confirm-yes:hover`) — **ya estaba portado íntegro a `globals.css` desde la fase de Baseline (Fases 1-3)**, sin cambios en este Sprint (ver punto 7).
- Datos: ninguno. `ConfirmCancel` no usa ningún mock/constante — solo texto literal fijo.
- Estado/lógica asociada (fuera del componente en sí, en `App()`): `const [confirmCancel, setConfirmCancel] = useState(null)` (línea 1907), `requestCancel` (líneas 1967-1969), `doCancel` (líneas 1970-1981) — todo dentro de `App()`, no de `ConfirmCancel`.

### 5. Componentes hijos

Ninguno. `ConfirmCancel` es una función hoja: solo `div`/`h3`/`p`/`button` nativos + íconos `AlertTriangle`/`XCircle` de Lucide.

### 6. Componentes padres / consumidores

Un único consumidor real en todo el script: `App()`, línea 2125 — `confirmCancel && React.createElement(ConfirmCancel, { onYes: doCancel, onNo: () => setConfirmCancel(null) })`, hermano de `role === "admin" && AdminPanel` / `showPublishModal && PublishModal` / `<footer>`. `doCancel` cierra sobre `confirmCancel` (el id del trabajo a cancelar) y sobre `setJobs` para marcar `phase: "cancelled"`.

`requestCancel(job.id)` (el disparador real) se invoca desde un único punto: el botón "Cancelar" (`mx-btn mx-btn-ghost`, líneas 2312-2321) dentro de `mx-actionsrow`, visible solo cuando `live || isAssigned` es verdadero, dentro de la tarjeta de trabajo activo de `Coordinator(props)` — bloque que requiere `jobs.length > 0` (motor de trabajos real, no portado todavía; mismo bloqueo que `Radar`/`LiveCountdown`/`CoordinatorEmptyState`).

### 7. Hooks utilizados

Ninguno dentro de `ConfirmCancel` en sí (es una función pura de presentación, sin `useState`/`useEffect` propios). El estado (`confirmCancel`) y los callbacks (`requestCancel`/`doCancel`) viven en `App()`.

### 8. Estados

Ninguno local a `ConfirmCancel`. En la reconstrucción de React se introduce el patrón `open`/`onOpenChange` (ver punto 12) por necesidad de adaptación a Radix Dialog — no existe en el HTML fuente.

### 9. Callbacks / props

`onYes: () => void` (confirmar cancelación), `onNo: () => void` (cerrar sin acción). Ninguna otra prop — el título/descripción/etiquetas de botones son literales fijos dentro de la función, no parametrizables en el HTML fuente.

### 10. Utilidades, constantes, arrays, interfaces

Ninguno. Cero datos mock — todo el contenido es texto literal.

### 11. Iconos Lucide

`AlertTriangle` (tamaño 16, en el `h3`, color `var(--red)` heredado de `.mx-confirm-card h3 svg`) y `XCircle` (tamaño 14, dentro del botón "Sí, cancelar").

### 12. Estilos CSS / clases `mx-`

`.mx-confirm-bg`, `.mx-confirm-card`, `.mx-confirm-card h3` (+ `h3 svg`), `.mx-confirm-card p`, `.mx-confirm-acts` (+ `button`), `.mx-confirm-no` (+ `:hover`), `.mx-confirm-yes` (+ `:hover`) — **11 reglas, 5 selectores de clase de nivel superior nuevos para el proyecto en términos de "recién usados" (`.mx-confirm-bg`/`.mx-confirm-card`/`.mx-confirm-acts`/`.mx-confirm-no`/`.mx-confirm-yes`), pero 0 selectores nuevos para `globals.css`**: todo el bloque ya existía, portado desde la fase de Baseline (antes del Sprint 3.1), sin ningún consumidor real hasta este Sprint. Verificado con `grep -n "mx-confirm" src/styles/globals.css` (líneas 1555-1623) — coincide carácter por carácter con las líneas 443-453 del `<style>` original. No se agrega ni modifica CSS en este Sprint.

### 13. Dependencias

Ninguna dependencia nueva de terceros. Se reutiliza `@radix-ui/react-dialog` (ya en uso desde Baseline vía `ui/dialog.tsx`).

### 14. Eventos

`onClick` en overlay (cierra si el click es exactamente sobre el fondo, no sobre la tarjeta — replicado por el comportamiento nativo de "outside click" de Radix `Dialog.Content`), `onClick` en botón "No, volver" (→ `onNo`), `onClick` en botón "Sí, cancelar" (→ `onYes`).

### 15. Integración con RootLayout / Admin / Coordinator / Installer

- **RootLayout**: requiere integración temporal (ver punto 20) — el consumidor real (`App()`, hermano de `AdminPanel`/`PublishModal`) es exactamente el nivel de `RootLayout` en este proyecto, pero el disparador real (botón "Cancelar" de `Coordinator`) no existe todavía.
- **Admin**: sin relación — `ConfirmCancel` nunca se usa dentro de `AdminPanel`/`AdminInstaladores`/`MasterCalendar`.
- **Coordinator**: es su único consumidor real en el HTML fuente (ver punto 6) — bloqueado por la ausencia del motor de trabajos.
- **Installer**: sin relación — `ConfirmCancel` nunca se usa dentro de `Installer()`.

### 16. Posibles reutilizaciones futuras / componentes compartidos

Se detectó que `src/components/shared/confirm-dialog.tsx` (`ConfirmDialog`) **ya existe en el proyecto desde la fase de Baseline (Fases 1-3, previa a la metodología de Sprints)**, ya wireado a las clases `.mx-confirm-*`, con su propio JSDoc declarando explícitamente que es la reconstrucción de `ConfirmCancel`, pendiente de conectar su lógica de negocio ("Fase 4"). Este Sprint reutiliza `ConfirmDialog` tal cual (sin duplicar Overlay/Content/accesibilidad) para construir `ConfirmCancelDialog`, un wrapper delgado que solo aporta el contenido literal exacto de `ConfirmCancel` (ver punto 20).

### 17. Posibles riesgos de migración

- `ConfirmDialog` no tenía consumidores reales; al conectarlo por primera vez se detectaron 2 discrepancias de fidelidad frente al script fuente (ver punto 18) — corregidas.
- El HTML fuente controla la visibilidad por montaje/desmontaje condicional; Radix Dialog (base de `ConfirmDialog`) usa un patrón controlado `open`/`onOpenChange` — adaptación ya aprobada y usada en `PublishModal` (Sprint 3.5), replicada aquí sin nueva decisión de diseño.
- El disparador real (botón "Cancelar" de `Coordinator`) no existe — se requiere integración temporal, con el mismo criterio ya aplicado en los Sprints 3.7/3.8/3.9.

### 18. Diferencias encontradas

Dos discrepancias de fidelidad entre `ConfirmDialog` (construido en Baseline, antes de la metodología de Sprints) y el script fuente, corregidas a favor del script (autoritativo), sin alterar su estructura/props existentes:

1. El ícono de `<h3>` usaba `size={17}`; el script fuente usa `size:16` (línea 3540-3541). Corregido.
2. `confirmLabel`/`cancelLabel` eran de tipo `string`, lo que no permitía reproducir el ícono `XCircle` dentro del botón "Sí, cancelar" (línea 3547-3552 del script). Se amplían a `ReactNode` — los valores por defecto (`'Sí, continuar'`/`'No, volver'`, ambos strings) siguen siendo válidos, sin romper ningún uso existente (no había ninguno).

No se encontró ninguna otra diferencia: overlay-click-fuera-cierra (comportamiento nativo de Radix, equivalente a `e.target === e.currentTarget && onNo()` del script), textos, orden de botones ("No, volver" primero, "Sí, cancelar" segundo) y estructura (`.mx-confirm-bg > .mx-confirm-card > h3 + p + .mx-confirm-acts`) coinciden exactamente.

### 19. Elementos fuera del alcance de este Sprint

- El motor de trabajos real (`jobs`/`jobView`/`stepJobEngine`) y la tarjeta de trabajo activo de `Coordinator` (`mx-actionsrow`, botón "Cancelar" real) — Fase 4, sin Sprint asignado todavía.
- La lógica real de `doCancel` (marcar un trabajo como `phase: "cancelled"`) — depende del motor de trabajos.

### 20. Estrategia de integración

Temporal, en `RootLayout.tsx`, siguiendo el mismo criterio ya establecido en los Sprints 3.7 (`Radar`)/3.8 (`CountRing`)/3.9 (`LiveCountdown`): el contenedor real (`App()`/`RootLayout`, como hermano de `AdminPanel`/`PublishModal`) ya existe, pero el disparador real (botón "Cancelar" de `Coordinator`, que no existe todavía) no. Se agrega:

- Estado local `confirmCancelOpen`/`setConfirmCancelOpen` (booleano) en `RootLayout`, reemplazando al `confirmCancel` (`string | null`, id de trabajo) de `App()` — simplificado porque no hay ningún `job.id` real que rastrear todavía; no cambia el comportamiento visible del diálogo.
- Un botón disparador temporal dentro de `role === 'coordinador'`, que reproduce verbatim la apariencia real del botón "Cancelar" de `Coordinator()` (clases `mx-btn mx-btn-ghost`, mismo `style` inline de color/borde rojo, mismo ícono `XCircle` de 14px, mismo texto "Cancelar").
- El componente `ConfirmCancelDialog` montado como hermano de `PublishModal`, en la misma posición relativa que `App()` le da a `ConfirmCancel` (después de las ramas de `role`, antes de `<Outlet/>`/`<footer>`).

Se retirará el botón disparador temporal (no `ConfirmCancelDialog` en sí) en el Sprint que construya `Coordinator`/el motor de trabajos real, reconectando `ConfirmCancelDialog` a la fila de acciones real (`mx-actionsrow`).

## Implementación

### Componentes creados

- `ConfirmCancelDialog` (`src/components/shared/confirm-cancel-dialog.tsx`) — wrapper delgado sobre `ConfirmDialog`, con el contenido literal exacto de `ConfirmCancel` (título, descripción, etiquetas de botones, ícono `XCircle`). Sin sub-componentes propios, sin datos mock (no aplica preparación para Supabase — cero contenido dinámico).

### Componentes modificados

- `ConfirmDialog` (`src/components/shared/confirm-dialog.tsx`, creado en Baseline/Fases 1-3, sin Sprint propio ni consumidores hasta ahora) — 2 correcciones de fidelidad puntuales (ver punto 18): tamaño del ícono `AlertTriangle` (17→16) y ampliación de tipo `confirmLabel`/`cancelLabel` de `string` a `ReactNode`. Sin cambios de estructura, props obligatorias, ni comportamiento.
- `RootLayout.tsx` — integración temporal (ver punto 20): nuevo estado `confirmCancelOpen`, botón disparador temporal dentro de `role === 'coordinador'`, mount de `ConfirmCancelDialog` como hermano de `PublishModal`.

### CSS portado

Ninguno — el bloque completo (`.mx-confirm-*`, 11 reglas) ya existía en `globals.css` desde la fase de Baseline, verbatim de las líneas 443-453 del `<style>` original. Verificado, sin diferencias.

### Reutilización (sin duplicar)

`ConfirmDialog` (Baseline) reutilizado tal cual como base de `ConfirmCancelDialog` — no se duplicó ninguna lógica de Overlay/Content/Portal/accesibilidad de Radix.

### Preparación para Supabase

No aplica: `ConfirmCancel`/`ConfirmCancelDialog` no tiene ningún dato mock, array, objeto ni colección — es contenido 100% literal/estático. Nada que mover a `src/constants/`.

### Validaciones

Bloqueadas en este sandbox por falta de acceso a red (`registry.npmjs.org`) — no es posible ejecutar `npm install`/`npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` reales en este entorno. Se ejecutó validación best-effort equivalente:

- `tsc -p /tmp/ts-stub-check/tsconfig.check.json --noEmit` → sin errores.
- `tsc -p /tmp/ts-stub-check/tsconfig.strict-check.json --noEmit` (con `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`, espejo de `tsconfig.app.json`) → sin errores.
- `prettier --check` (single-quote/semi/trailing-comma all/print-width 100) sobre `confirm-cancel-dialog.tsx`, `confirm-dialog.tsx`, `RootLayout.tsx` → sin diferencias de formato.

La validación real (`npm run lint/typecheck/build/dev`) queda pendiente y se difiere a la máquina del usuario, igual que en todos los Sprints anteriores.

### Cobertura HTML

`ConfirmCancel` (líneas 3531-3553): 100% del JSX reconstruido. CSS `.mx-confirm-*` (líneas 443-453): 100%, ya portado desde Baseline, sin cambios. Consumidor real (`App()`, línea 2125): reproducido en `RootLayout.tsx` de forma temporal (ver punto 20) — disparador real (`Coordinator`, línea 2319) fuera de alcance, documentado como pendiente.

### Pendientes fuera de alcance (reportados, no implementados)

- Motor de trabajos real de `Coordinator` (`jobs`/`jobView`/`requestCancel`/`doCancel` reales) — Fase 4, sin Sprint asignado.
- Reubicación de `ConfirmCancelDialog` dentro de la fila de acciones real (`mx-actionsrow`) cuando exista `Coordinator`.

### Estado al cierre de esta ronda

Implementación completa del componente `ConfirmCancelDialog`, corrección de fidelidad de `ConfirmDialog`, e integración temporal en `RootLayout.tsx`, siguiendo exactamente el criterio ya aprobado en Sprints anteriores (3.5/3.7/3.8/3.9) para bloques cuyo consumidor real todavía no existe. Validaciones best-effort (tsc básico + estricto, prettier) sin errores. Pendiente: validación técnica real, visual y funcional del usuario. `docs/SPRINTS_INDEX.md` NO se actualiza en esta ronda (se actualizará únicamente después de la aprobación del Sprint, según instrucción explícita del brief).
