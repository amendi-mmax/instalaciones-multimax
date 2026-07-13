# Sprint 3.11 - Migración de `InstallerProfile` (pantalla "Perfil" del Instalador)

Rama: `feature/sprint-3-11-installer-profile`
Estado: 🟡 En revisión — pendiente de validación real (npm install/lint/typecheck/build/dev), validación visual y cierre administrativo por parte del usuario.

## Objetivo

Reconstruir exactamente la pantalla "Perfil" dentro del teléfono del Instalador, tal como existe en `Multimax_Despacho_v1.3.html`, sin rediseñar, reinterpretar, simplificar ni modernizar. Sin cambios de arquitectura.

## Fase de análisis (obligatoria, previa a la implementación)

Análisis realizado sobre el archivo oficial `Multimax_Despacho_v1.3.html` (3.557 líneas), única fuente de verdad. El brief de este Sprint exige explícitamente NO asumir que el nombre "Installer Profile" (el que aparece en `docs/SPRINTS_INDEX.md`) es correcto solo porque aparece en la documentación, y detenerse a reportar si no coincide con el componente real antes de implementar.

### 1. Confirmación del nombre del Sprint

Verificado con `grep -n "function InstallerProfile\|function Installer\b\|function InstallerJobs"` sobre el archivo completo: existe, tal cual, con ese nombre exacto:

```
function InstallerProfile({ meInfo })     // líneas ~3491-3524, selector raíz .mx-profscreen
```

A diferencia de la mayoría de los Sprints anteriores de esta fase (3.4 "Main Layout" → en realidad `mx-suc-sel`; 3.6 "Job Cards" → en realidad `CoordinatorEmptyState`; 3.9 "Timeline" → en realidad `LiveCountdown`; 3.10 "Installer Dashboard" → en realidad un subconjunto de `Installer(props)`), en este caso **el nombre del brief SÍ corresponde exactamente a una función real del HTML fuente, con el mismo nombre literal**. No se detecta ninguna discrepancia que reportar como bloqueo. Conclusión: se procede con la reconstrucción, tal como indica el propio brief ("Si el análisis confirma que corresponde al perfil del instalador, procede con la reconstrucción").

`InstallerProfile({ meInfo })` está ubicada inmediatamente después de `InstallerJobs()` (línea 3453, `.mx-myjobs`, reservada como Sprint 3.12) y antes de `ConfirmCancel` (diálogo de confirmación de cancelación, fuera del alcance de este Sprint).

### 2. Análisis completo del cuerpo de `InstallerProfile({ meInfo })`

**Props recibidas**: únicamente `meInfo` (un `InstallerMock`, ya definido en `src/constants/index.ts` desde Fase 3 — no es un tipo nuevo).

**Estado interno**: ninguno. **Efectos**: ninguno. Es una función pura derivada de `meInfo`.

**Derivados**: `inicial = meInfo && meInfo.nombre ? meInfo.nombre[0] : "M"` (fallback literal `"M"` del HTML fuente).

**Estructura del JSX de retorno** (`.mx-profscreen`):

```
<div class="mx-profscreen">
  <div class="mx-profhero">
    <div class="mx-profava">{inicial}</div>
    <div class="mx-profname">{meInfo.nombre}</div>
    <div class="mx-profzone"><MapPin size={12}/>{meInfo.zona}</div>
    <Pill tone="green"><ShieldCheck size={11}/>Instalador verificado</Pill>
  </div>
  <div class="mx-profstats">
    <div class="mx-profstat"><b>{meInfo.rating}</b><span>Calificación</span></div>
    <div class="mx-profstat"><b>{meInfo.cumpl}%</b><span>Cumplimiento</span></div>
    <div class="mx-profstat"><b>{meInfo.acept}%</b><span>Aceptación</span></div>
    <div class="mx-profstat"><b>{meInfo.km} km</b><span>Distancia prom.</span></div>
  </div>
  <div class="mx-profblock">
    <h4><ShieldAlert size={13}/>Reglas de prioridad</h4>
    <ul class="mx-rules">
      <li>Responder rápido y cumplir <b>sube</b> tu prioridad.</li>
      <li>Ignorar solicitudes <b>baja</b> tu prioridad.</li>
      <li>Cancelar tras aceptar afecta tu calificación.</li>
      <li>El precio más bajo no garantiza la asignación.</li>
    </ul>
  </div>
</div>
```

Nota de fidelidad textual: el HTML fuente construye `<b>{meInfo.cumpl}</b>{"%"}`/`<b>{meInfo.km}</b>{" km"}` como nodos de texto separados (`React.createElement("b", null, meInfo.cumpl, "%")`); en JSX esto se reconstruye como `<b>{meInfo.cumpl}%</b>` — el marcado resultante y el texto renderizado son idénticos, sin cambio visual ni de estructura DOM significativo.

### 3. Dependencia real dentro de `Installer(props)`

En el HTML fuente, `InstallerProfile` se monta cuando `instTab === "perfil"` (dentro de `Installer(props)`, línea ~3427: `React.createElement(InstallerProfile, { meInfo: meInfo })`). En este proyecto, ese mismo lugar corresponde a la rama `instTab === 'perfil'` de `InstallerDashboard` (Sprint 3.10), que hoy renderiza `null` — reservado explícitamente para este Sprint (ver JSDoc de `installer-dashboard.tsx`).

### 4. Componentes/CSS/constantes involucrados

- **CSS**: bloque `.mx-prof*` (líneas 363-374 del `<style>` original del HTML fuente) — 12 reglas: `.mx-profscreen`, `.mx-profhero`, `.mx-profava`, `.mx-profname`, `.mx-profzone`, `.mx-profstats`, `.mx-profstat` (+ `b`/`span`), `.mx-profblock` (+ `h4`/`h4 svg`). Verificado con `grep` sobre `src/styles/globals.css`: ninguna de estas clases existía antes de este Sprint. Importante: **no confundir con `.mx-profile`** (línea 937 de `globals.css`), que es un selector completamente distinto, ya migrado en el Sprint 3.2 (tarjeta resumen dentro de `mx-instside`, `InstallerProfileSummary`).
- **`INSTALLERS`/`InstallerMock`** (`src/constants/index.ts`): ya existentes desde Fase 3, no se modifican. `meInfo` recibe el tipo `InstallerMock` completo.
- **Helper `Pill` del HTML**: corresponde al componente ya existente `Badge` (`src/components/ui/badge.tsx`, `.mx-pill`, Fase 3) con `tone="green"` — confirmado leyendo `badge.tsx` y `status-badge.tsx` completos: `StatusBadge` agrega una capa semántica estado→tono que no existe en este uso crudo (`Pill tone="green"` fijo, sin mapeo de estado alguno), por lo que el componente correcto a reutilizar es `Badge`, no `StatusBadge`.
- **Iconos** (`lucide-react`): `MapPin` (12px), `ShieldCheck` (11px, dentro del Pill), `ShieldAlert` (13px, en el `<h4>`) — mismos tamaños exactos del HTML fuente.
- **`.mx-rules`**: la lista de "Reglas de prioridad" de este bloque tiene únicamente **4 ítems** (verificado leyendo el HTML fuente línea por línea) — le falta el quinto ítem ("No puedes aceptar dos trabajos con horarios en conflicto.") presente en la versión de **5 ítems** ya migrada en el Sprint 3.2 (`InstallerPriorityRules`, dentro de `mx-instside`). Esta discrepancia ya estaba documentada de antemano en el propio JSDoc de `installer-priority-rules.tsx` (escrito en el Sprint 3.2, anticipando este Sprint). **No se unifican los dos textos**: cada uno se reconstruye tal cual aparece en su bloque HTML de origen. Por el mismo motivo, `InstallerProfile` **no reutiliza** `InstallerPriorityRules` (contenido distinto) — la lista de 4 ítems se reconstruye inline, igual que en el HTML fuente (JSX propio de `InstallerProfile`, no una función compartida entre ambos bloques).

### 5. Verificación de no colisión de nombres

Verificado con `grep -rn "InstallerProfile\b" src/` (excluyendo coincidencias de `InstallerProfileSummary`): ningún componente del proyecto define o exporta actualmente algo llamado literalmente `InstallerProfile`. El propio JSDoc de `installer-profile-summary.tsx` (Sprint 3.2) documenta explícitamente que ese componente se nombró `InstallerProfileSummary` (y no `InstallerProfile`) precisamente para reservar el nombre real `InstallerProfile` para este Sprint — confirma que este es el momento correcto de usarlo, sin colisión.

## Implementación

### Componente creado

`src/components/shared/installer-profile.tsx` — `InstallerProfile({ meInfo }: InstallerProfileProps)`, reconstrucción verbatim de la estructura del punto 2. Sin estado, sin efectos. `InstallerMock` importado desde `@/constants` (mismo tipo que ya usa `InstallerDashboard`). `Badge tone="green"` para el Pill de verificación. `ShieldAlert`/`ShieldCheck`/`MapPin` de `lucide-react`.

### CSS portado

Se agregó el bloque de 12 reglas `.mx-prof*` a `src/styles/globals.css`, verbatim (mismos valores, mismo orden), insertado inmediatamente después de `.mx-phone-empty` (Sprint 3.10) y antes de `.mx-instside` — ambos bloques pertenecen a pantallas del teléfono del Instalador. Se agregó un comentario aclarando la diferencia con `.mx-profile` (selector preexistente y no relacionado).

### Integración temporal (regla permanente del proyecto)

El brief exige integración temporal obligatoria en `RootLayout.tsx`, visible en localhost, sin quedar solo documentada — y a la vez prohíbe modificar "InstallerDashboard aprobado en Sprint 3.10". El destino real y fiel de `InstallerProfile` es la rama `instTab === 'perfil'` de `InstallerDashboard`, que hoy renderiza `null`; conectarlo ahí requeriría editar `installer-dashboard.tsx`, lo cual está fuera de lo permitido por este mismo brief.

**Decisión (reportada, no una desviación silenciosa)**: se aplica el mismo criterio ya usado para `CountRing` en el Sprint 3.8 (cuyo destino real —`mx-alert-h`/`mx-offer-h`— tampoco existía todavía dentro del flujo de "Solicitudes"): montar `InstallerProfile` como **hermano independiente** de `InstallerDashboard`, dentro de `role === 'instalador'` en `RootLayout.tsx`, con la prop mock `INSTALLERPROFILE_DEMO_MEINFO` (= `INSTALLERS[0]`, el mismo mock real que `InstallerDashboard` ya usa como fallback de `meInfo` — no un dato inventado). La rama `instTab === 'perfil'` de `InstallerDashboard` permanece intacta, sin ningún cambio. Esta integración se retirará de `RootLayout.tsx` y se recolocará dentro de esa rama real en el Sprint que conecte `InstallerDashboard` con sus 3 pestañas completas.

## Archivos creados

- `src/components/shared/installer-profile.tsx`

## Archivos modificados

- `src/styles/globals.css` — bloque `.mx-prof*` (12 reglas nuevas).
- `src/layouts/RootLayout.tsx` — import de `InstallerProfile`, import de `INSTALLERS` (agregado al import ya existente de `@/constants`), constante mock `INSTALLERPROFILE_DEMO_MEINFO`, nuevo bloque JSDoc "TEMPORARY INTEGRATION — Sprint 3.11", montaje de `<InstallerProfile meInfo={INSTALLERPROFILE_DEMO_MEINFO} />` como hermano de `InstallerDashboard`/`CountRing` dentro de `role === 'instalador'`.

## Decisiones técnicas

1. `Badge` (no `StatusBadge`) para reconstruir el helper `Pill` del HTML — ver punto 4 del análisis.
2. La lista de 4 ítems de "Reglas de prioridad" se reconstruye inline en `InstallerProfile`, sin reutilizar `InstallerPriorityRules` (5 ítems, contenido distinto, componente distinto) — fidelidad 1:1 a cada bloque de origen.
3. `meInfo` tipado con `InstallerMock` (ya existente), sin duplicar el tipo.
4. Integración temporal como hermano independiente de `InstallerDashboard` en `RootLayout.tsx`, no conectada a la rama `instTab === 'perfil'` real — ver justificación completa arriba.

## Diferencias encontradas respecto al brief

Ninguna que constituya un bloqueo o requiera reinterpretación: el nombre "Installer Profile" del brief coincide exactamente con la función real del HTML (`InstallerProfile({ meInfo })`). La única tensión detectada — integración temporal obligatoria vs. prohibición de modificar `InstallerDashboard` — se resolvió con el mismo patrón ya aprobado en el Sprint 3.8 (mount como hermano independiente), documentada aquí de forma explícita, no aplicada en silencio.

## Validaciones (best-effort en sandbox; validación real diferida al usuario)

- `tsc --noEmit` con stubs ambientales básicos (`/tmp/ts-stub-check/tsconfig.check.json`): 0 diagnósticos.
- `tsc --noEmit` con stubs ambientales estrictos (`/tmp/ts-stub-check/tsconfig.strict-check.json`, incluye `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`, espejo de `tsconfig.app.json`): 0 diagnósticos.
- `prettier --check` sobre `installer-profile.tsx`, `RootLayout.tsx`, `globals.css`: sin problemas de formato.
- `npm install`/`npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` reales: no ejecutables en este entorno sandbox (sin acceso de red a `registry.npmjs.org`). Validación real diferida por completo al entorno del usuario, como en todos los Sprints anteriores.
- `git status`/`git diff --stat -- src/` (solo lectura): confirma el alcance exacto de archivos tocados en este Sprint, sin ninguna operación Git de escritura ejecutada.

## Cobertura

- `components/shared/`: 22 componentes (se agrega `InstallerProfile`).
- Clases CSS `.mx-prof*`: 12/12 portadas (100% del bloque).

## Pendientes fuera de alcance de este Sprint

- Conectar `InstallerProfile` a la rama real `instTab === 'perfil'` de `InstallerDashboard` (requiere modificar ese componente, fuera de alcance de este brief).
- `InstallerJobs()` (`.mx-myjobs`) — Sprint 3.12, ya reservado.
- Retirar la integración temporal de `RootLayout.tsx` una vez exista el Sprint que conecte las 3 pestañas reales de `InstallerDashboard`.

## Estado al cierre de esta ronda

Implementación y documentación completas. Pendiente: validación real (npm install/lint/typecheck/build/dev) y validación visual por parte del usuario, comparando contra `Multimax_Despacho_v1.3.html`. No se actualiza ningún archivo de documentación administrativa (`CHANGELOG.md`, `PROJECT_STATUS.md`, `MIGRATION_STATUS.md`, `TODO.md`, `docs/SPRINTS_INDEX.md`) en esta ronda — reservado para el cierre administrativo, tras la aprobación del usuario.
