# Sprint 3.10 - Migración de `InstallerDashboard` (pantalla principal del Instalador)

Rama: `feature/sprint-3-10-installer-dashboard`
Estado: ✅ Completado — validación real y visual confirmadas por el usuario. Ver "Cierre del Sprint" al final de este documento.

## Objetivo

Reconstruir la pantalla principal del Instalador ("Installer Dashboard", nombre genérico del brief) exactamente como existe en `Multimax_Despacho_v1.3.html`, sin rediseñar, reinterpretar ni mejorar la UI, usando únicamente mocks (sin Supabase, sin datos reales).

## Fase de análisis (obligatoria, previa a la implementación)

Análisis realizado sobre el archivo oficial `Multimax_Despacho_v1.3.html` (3.557 líneas), única fuente de verdad.

### 1. Ubicación exacta

No existe ninguna función `InstallerDashboard` en el HTML fuente — "Installer Dashboard" es un nombre genérico del brief, no una función real (verificado con `grep -n "function Installer"` sobre todo el archivo). La función real que compone la pantalla principal del Instalador es:

```
function Installer(props)     // líneas 3169-3452 (284 líneas)
```

Es el componente raíz que `App()` monta cuando `role === "inst"` (línea 2113: `role === "inst" && React.createElement(Installer, {...})`) — análogo a como `Coordinator(props)` es la raíz de `role === "coord"`. Esta correspondencia se documenta explícitamente en vez de asumirse, siguiendo el mismo criterio aplicado en los Sprints 3.4/3.6 para nombres genéricos que no coincidían con una función real.

`Installer(props)` internamente compone/referencia tres funciones más, cada una con su propio selector CSS raíz y ya identificadas por separado en `docs/SPRINTS_INDEX.md`:

| Función | Selector raíz | Líneas | Sprint |
| --- | --- | --- | --- |
| `Installer(props)` | `.mx-instwrap` (+ `.mx-phone`/`.mx-phone-bar`/`.mx-mesel`/`.mx-phonetabs`/`.mx-alert`/`.mx-offer`/`.mx-phone-empty`/`.mx-phone-done`/`.mx-phone-sent`) | 3169-3452 | **3.10 (este Sprint)** |
| `InstallerJobs()` | `.mx-myjobs` | 3453-3484 | 3.12 "Installer Jobs" (reservado) |
| `InstallerProfile({ meInfo })` | `.mx-profscreen` | 3491-3550 | 3.11 "Installer Profile" (reservado) |

`InstallerSidebar` (`.mx-instside`, líneas 3421-3450 dentro de `Installer()`) y `CountRing` (líneas 1437-1491, usado dentro de `Installer()` en `mx-alert-h`/`mx-offer-h`) ya fueron migrados en los Sprints 3.2 y 3.8 respectivamente — no se tocan en este Sprint.

### 2. Análisis completo del cuerpo de `Installer(props)`

**Props recibidas** (desde `App()`, línea 2113-2120): `job` (=`activeJob`, derivado del motor de trabajos), `meId`/`setMeId` (`useState("pty")` de `App()`, línea 1901), `sortBy`, `installerRespond`/`installerDecline`/`installerConfirm` (callbacks del motor de trabajos).

**Estado interno** (`useState` propios de `Installer()`, no recibidos como props): `step` ("alert"|"offer"), `instTab` ("solicitudes"|"trabajos"|"perfil"), `precio`, `dia`, `fechaCal`, `hora`, `com`.

**Derivados**: `v = jobView(job, sortBy)`, `roundRemaining`, `me = job ? job.inst[meId] : null`, `meInfo = INSTALLERS.find(i => i.id === meId)`, `notified`, `isAssigned`, `lost`, `alreadyResponded`, `declined`, `diaFinal`.

**Efecto**: `useEffect(() => { if (j) setPrecio(...) }, [j && j.id])` — depende de `job`, fuera de alcance sin motor de trabajos.

**Estructura del JSX de retorno** (`.mx-instwrap`):
```
<div class="mx-instwrap">
  <div class="mx-phone">
    <div class="mx-phone-bar"> ● Multimax · Instalador <select class="mx-mesel">...</select> </div>
    {instTab === "solicitudes" && body}          // body: 8 ramas condicionales (ver punto 5)
    {instTab === "trabajos" && <InstallerJobs/>}
    {instTab === "perfil" && <InstallerProfile meInfo={meInfo}/>}
    <div class="mx-phonetabs"> [Solicitudes] [Mis trabajos] [Perfil] </div>
  </div>
  <aside class="mx-instside"> ...Tu perfil / Reglas de prioridad... </aside>  // ya migrado, Sprint 3.2
</div>
```

**Las 8 ramas de `body`** (pestaña "Solicitudes", en orden de evaluación): (1) `!j || !notified` → `mx-phone-empty`; (2) `isAssigned` → `mx-phone-done ok`; (3) `lost` → `mx-phone-done`; (4) `declined` → `mx-phone-done`; (5) `alreadyResponded` → `mx-phone-sent`; (6) `j.phase !== "live"` → `mx-phone-done`; (7) `step === "alert"` → `mx-alert` (usa `CountRing`); (8) `else` (`step === "offer"`) → `mx-offer` (usa `CountRing`, formulario completo).

### 3. Determinación del bloque reconstruible sin motor de trabajos

Igual que `Coordinator()` en el Sprint 3.6: `job` (=`activeJob`) depende enteramente del motor de trabajos (`jobs`/`jobView`/`activeJob`), que no existe todavía en este proyecto. Sin `job`, la condición de la rama 1 (`!j || !notified`) es **siempre verdadera** — es la única de las 8 ramas de `body` reconstruible ahora mismo sin inventar datos ni lógica. Las 7 ramas restantes dependen de `job`/`me`/`step` reales.

`InstallerJobs()` y `InstallerProfile()` SÍ son técnicamente reconstruibles sin motor de trabajos (usan `MISJOBS`/`ESTADO`/`INSTALLERS`, mocks estáticos del HTML, no `jobs`) — pero son funciones reales con su propio selector (`.mx-myjobs`/`.mx-profscreen`) ya reservadas como Sprints numerados independientes en `docs/SPRINTS_INDEX.md` (3.12 y 3.11 respectivamente). Implementarlas en este Sprint invadiría ese alcance ya planificado — se dejan explícitamente fuera, reportado, no una limitación técnica sino una decisión de alcance.

### 4. Componentes involucrados

- `Installer(props)` (real, HTML) → `InstallerDashboard` (nombre de este Sprint, subconjunto reconstruible).
- `InstallerJobs()` (real, HTML) → fuera de alcance, reservado Sprint 3.12.
- `InstallerProfile()` (real, HTML) → fuera de alcance, reservado Sprint 3.11.
- `CountRing` (Sprint 3.8) → usado dentro de las ramas `mx-alert`/`mx-offer`, fuera de alcance de este Sprint (no se integra dentro de `InstallerDashboard`; su mount temporal de Sprint 3.8 permanece intacto y separado).

### 5. Dependencias

- `INSTALLERS` (`src/constants/index.ts`, ya migrado en Sprint 3.7) — alimenta `meInfo` y las opciones del `<select class="mx-mesel">` (`INSTALLERS.filter(i => !i.susp && i.docs)`).
- Ninguna dependencia nueva de paquetes externos.

### 6. Utilidades

Ninguna utilidad nueva. No se usa `fmt`/`hashAngle` (ninguno de los dos aplica a este bloque).

### 7. Estado

- `instTab` (`useState("solicitudes")`) — estado genuinamente interno de `Installer()` en el HTML fuente; se reconstruye como estado interno de `InstallerDashboard`.
- `meId`/`setMeId` — en el HTML fuente es estado de `App()` (línea 1901), pasado a `Installer` como prop; se reconstruye respetando ese mismo reparto: vive en `RootLayout` (nuestro equivalente de `App()`), no dentro de `InstallerDashboard`.
- `step`/`precio`/`dia`/`fechaCal`/`hora`/`com` — pertenecen exclusivamente a las ramas `mx-alert`/`mx-offer`, fuera de alcance de este Sprint; no se reconstruyen.

### 8. Funciones

`getDateFor`, el `useEffect` de `precio`, `installerRespond`/`installerDecline`/`installerConfirm` — todas pertenecen a las ramas fuera de alcance (alert/offer/motor de trabajos); no se reconstruyen. El único handler reconstruido es `onChange` del `<select class="mx-mesel">`, con una diferencia reportada (ver "Diferencias respecto al HTML").

### 9. Posibles reutilizaciones (componentes ya aprobados)

- `TwoColumnLayout` (Fase 3, variant="phone" → `.mx-instwrap`) — sin consumidor real hasta este Sprint.
- `PhoneFrame` (Fase 3 → `.mx-phone`/`.mx-phone-bar`/`.mx-dot`/`.mx-mesel`) — sin consumidor real hasta este Sprint.
- `InstallerSidebar` (Sprint 3.2 → `.mx-instside`) — ya migrado y validado; hasta ahora solo tenía un mount temporal ad-hoc (Sprint 3.2.1/3.2.2) fuera de su contexto estructural real.
- `MxSubtabButton` (Sprint 3.3) — su implementación (`<button className={active ? 'on' : ''} onClick={onClick}>{icon}{children}</button>`) no depende de ninguna clase propia (`.mx-subtabs button`/`.mx-phonetabs button` son selectores descendientes del contenedor padre) — reutilizable tal cual para los botones de `.mx-phonetabs`, sin duplicar código.
- `ui/Tabs` (Fase 3, Radix, variant="phonetabs") — **no** se usa: el HTML fuente implementa `.mx-phonetabs` con botones planos y estado manual (`instTab`/`.on`), igual que `.mx-subtabs` (Sprint 3.3 ya tomó esta misma decisión por el mismo motivo) — no con Radix. Se mantiene sin consumidor, misma duplicación ya documentada desde Sprint 3.3.

### 10. Integración necesaria

`Installer(props)` no tiene todavía ningún flujo de navegación real hacia él en este proyecto (no existe `layouts/InstallerLayout.tsx` ni ruta dedicada) — mismo bloqueo que motivó las integraciones temporales de los Sprints 3.2.1/3.2.2/3.7/3.8/3.9. Por la regla permanente vigente desde el Sprint 3.9, la integración temporal se aplica directamente, sin pausar a pedir autorización.

## Implementación

### Componentes creados

- **`MxPhoneTabs`** (`src/components/shared/mx-phone-tabs.tsx`) — contenedor `<div className="mx-phonetabs">`, sin wrapper adicional (a diferencia de `.mx-subtabs-wrap > .mx-subtabs`, `.mx-phonetabs` es un único `<div>` en el HTML fuente).
- **`InstallerSolicitudesEmptyState`** (`src/components/shared/installer-solicitudes-empty-state.tsx`) — reconstruye verbatim la rama `mx-phone-empty` (líneas 3216-3223): ícono `Bell` (26px), `<p>No tienes solicitudes activas.</p>`, `<span>Cuando Multimax publique un trabajo en tu zona, recibirás la alerta aquí.</span>`. Sin props (el HTML fuente no parametriza este bloque).
- **`InstallerDashboard`** (`src/components/shared/installer-dashboard.tsx`) — componente orquestador: compone `TwoColumnLayout`+`PhoneFrame`+`MxPhoneTabs`+`MxSubtabButton`×3+`InstallerSolicitudesEmptyState`+`InstallerSidebar`. Props: `meId: string`, `onMeIdChange: (id: string) => void`.

### Componentes reutilizados (sin modificar)

`TwoColumnLayout`, `PhoneFrame`, `InstallerSidebar`, `MxSubtabButton`, constante `INSTALLERS`.

### Componentes explícitamente NO tocados

`Header`, `Footer`, `SucursalSelect`, `MxSubtabs` (la versión "subtabs", distinta de `MxPhoneTabs`), `PublishModal`, `CoordinatorEmptyState`, `Radar`, `CountRing`, `LiveCountdown`, `Coordinator` (no existe todavía).

### Archivos modificados

- `src/layouts/RootLayout.tsx`: import de `InstallerDashboard` (reemplaza el de `InstallerSidebar`, que ya no se referencia directamente aquí); nuevo estado `meId`/`setMeId` (`useState('pty')`); el bloque `role === 'instalador'` reemplaza la integración ad-hoc del Sprint 3.2.1/3.2.2 (`<div className="mx-instwrap"><div/>(placeholder)<InstallerSidebar/></div>`) por `<InstallerDashboard meId={meId} onMeIdChange={setMeId} />`; el mount de `CountRing` (Sprint 3.8) permanece intacto, como hermano independiente. Se agregó un nuevo bloque JSDoc "TEMPORARY INTEGRATION — Sprint 3.10" y se marcó el bloque histórico de Sprint 3.2.1/3.2.2 como superseído (sin borrar su contenido).
- `src/styles/globals.css`: se agregó `.mx-phone-empty` (+ `svg`/`p`/`span`), verbatim (líneas 181-184 del HTML fuente, aisladas del selector combinado original `.mx-phone-empty,.mx-phone-done,.mx-phone-sent{...}` porque las otras dos clases no tienen consumidor todavía).

### Integración temporal realizada

Aplicada directamente en `src/layouts/RootLayout.tsx`, sin pausar a pedir autorización (regla permanente desde el Sprint 3.9). `InstallerDashboard` se monta dentro de `role === 'instalador'`, reemplazando la integración ad-hoc anterior. Es fácilmente removible: basta con quitar el import y las 1 línea de JSX cuando exista `layouts/InstallerLayout.tsx`/una ruta real para el Instalador — no altera `AppRouter.tsx` ni la arquitectura de rutas.

### Decisiones técnicas

1. Se reconstruyó únicamente la rama `mx-phone-empty` de "Solicitudes" — la única alcanzable sin motor de trabajos, mismo criterio que `CoordinatorEmptyState` (Sprint 3.6).
2. Se decidió NO reutilizar `EmptyState` (Fase 3) para `mx-phone-empty`: su estructura JSX (icono envuelto en `.mx-empty-ic`/`.mx-qempty-ic`, título en `<h3>`/`<b>`) no coincide con la de `mx-phone-empty` (icono directo, `<p>`+`<span>`, sin wrapper de icono) — forzar el encaje habría alterado el markup real. Se construyó `InstallerSolicitudesEmptyState` como bloque dedicado, mismo criterio que llevó a crear `CoordinatorEmptyState` en vez de reusar `EmptyState` a la fuerza.
3. Se reutilizó `MxSubtabButton` (Sprint 3.3) para los botones de `.mx-phonetabs`, sin duplicar código: su implementación es agnóstica de la clase del contenedor padre.
4. `meInfo = INSTALLERS.find(...) ?? INSTALLERS[0]` — fallback no-nulo agregado únicamente para satisfacer TypeScript estricto (`.find()` retorna `T | undefined`); no altera el comportamiento visual porque `meId` siempre coincide con una opción real del propio `<select>`.
5. Se reemplazó la integración ad-hoc del Sprint 3.2.1/3.2.2 (`mx-instwrap` con Phone Placeholder vacío) por la composición real, ahora que existe el Sprint que construye el teléfono — anticipado explícitamente por los propios comentarios de esos Sprints ("Debe eliminarse de aquí en cuanto exista el Sprint que construya el flujo real del Instalador").
6. La integración de `CountRing` (Sprint 3.8) NO se movió ni se tocó — su lugar real (`mx-alert-h`/`mx-offer-h`) sigue fuera de alcance.

### Limitaciones encontradas / diferencias respecto al HTML (reportadas, no corregidas en silencio)

- Al activar las pestañas "Mis trabajos"/"Perfil", `InstallerDashboard` no renderiza ningún contenido (la navegación y el resaltado de la pestaña activa SÍ son reales y funcionales, igual que en el HTML). El HTML fuente sí renderiza `InstallerJobs()`/`InstallerProfile()` en esos casos — pero esas dos funciones son bloques reales, ya reservados como Sprints 3.12/3.11 independientes; implementarlas aquí se saldría del alcance de este Sprint.
- El `onChange` de `.mx-mesel` en el HTML fuente también reinicia `step` a `"alert"` (línea 3405). `step` no existe en este subconjunto (pertenece a `mx-alert`/`mx-offer`, fuera de alcance) — se omite esa parte del handler.
- Las 7 ramas restantes de "Solicitudes" (`mx-alert`, `mx-offer`, `mx-phone-sent`, `mx-phone-done`×3) y el consumo de `CountRing` dentro de ellas quedan pendientes de un Sprint futuro con motor de trabajos real.

## Validaciones ejecutadas

Best-effort en este entorno (sandbox sin acceso a `npm install`/registry):

- `tsc -p /tmp/ts-stub-check/tsconfig.check.json --noEmit`: **0 diagnósticos**.
- `tsc --noEmit` con `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch` habilitados (para acercarse a `tsconfig.app.json` real del proyecto): **0 diagnósticos** — confirma que no quedan imports/variables sin usar tras el reemplazo de la integración de `InstallerSidebar`.
- `prettier --check` sobre `.ts`/`.tsx`: **cero diferencias**.
- `git diff --stat -- src/`: confirma el alcance exacto — 3 archivos nuevos (`installer-dashboard.tsx`, `installer-solicitudes-empty-state.tsx`, `mx-phone-tabs.tsx`), 2 archivos modificados (`RootLayout.tsx`, `globals.css`; `utils.ts` modificado pertenece al Sprint 3.9, no a este Sprint).
- Pendiente (real, no best-effort): que el usuario confirme en su máquina `npm install`/`npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev`, y la validación visual en el navegador contra `Multimax_Despacho_v1.3.html`.

## Decisiones tomadas

1. "Installer Dashboard" (nombre genérico del brief) no corresponde a ninguna función real — se documenta su correspondencia con `Installer(props)` en vez de asumirla.
2. Se reconstruye únicamente el subconjunto de `Installer(props)` alcanzable sin motor de trabajos ni invasión del alcance ya reservado de los Sprints 3.11/3.12.
3. Se retira la integración ad-hoc del Sprint 3.2.1/3.2.2, reemplazándola por la composición estructural real, tal como esos mismos Sprints anticipaban.
4. `CountRing` (Sprint 3.8) no se toca ni se mueve — sigue sin lugar real hasta que exista la rama `mx-alert`/`mx-offer`.
5. No se usa `ui/Tabs` (Radix) para `.mx-phonetabs` — mismo criterio ya aplicado a `.mx-subtabs` en el Sprint 3.3.

## Riesgos

- Al implementar en un Sprint futuro el motor de trabajos y las 7 ramas restantes de "Solicitudes", `InstallerDashboard` deberá aceptar `job`/`me`/`step` y sus callbacks — cambio de API esperado, ya anticipado en el análisis (punto 2).
- Cuando se implementen los Sprints 3.11 (`InstallerProfile`)/3.12 (`InstallerJobs`), `InstallerDashboard` deberá conectarlos en las ramas `instTab === 'perfil'`/`'trabajos'`, hoy vacías.

## Porcentaje del HTML reconstruido

`Installer(props)`: de las 284 líneas de JSX fuente, se reconstruyen la barra del teléfono (~15 líneas), la navegación `.mx-phonetabs` (~20 líneas) y la rama `mx-phone-empty` (~8 líneas) — ~43 líneas (~15% de la función). El resto depende de motor de trabajos (ramas 2-8 de `body`, ~200 líneas) o está reservado a Sprints 3.11/3.12 (`InstallerJobs`/`InstallerProfile`, funciones aparte). CSS nuevo: 4 selectores (`.mx-phone-empty` + 3 hijos); el resto de clases usadas (`.mx-instwrap`/`.mx-phone`/`.mx-phone-bar`/`.mx-dot`/`.mx-mesel`/`.mx-phonetabs`) ya estaban portadas desde Fase 3.

## Confirmación de alcance respetado

No se modificó `Header`, `Sidebar` (`InstallerSidebar` se reutiliza sin cambios), `Main Layout` (`RootLayout` solo cambia su integración temporal, no su estructura), `Coordinator` (no existe todavía), `PublishModal`, `Radar`, `CountRing`, `LiveCountdown`. No se usaron datos reales ni se conectó Supabase. No se creó ninguna ruta nueva ni se modificó React Router.

## Pendientes

- Validación real del usuario (`npm install`/`lint`/`typecheck`/`build`/`dev`) y validación visual en el navegador.
- Las 7 ramas restantes de "Solicitudes" y el consumo de `CountRing` — Sprint futuro con motor de trabajos real.
- `InstallerJobs`/`InstallerProfile` — Sprints 3.12/3.11 respectivamente, ya reservados.

## Próximo Sprint

Sprint 3.10 cerrado (✅ Completado). El siguiente Sprint a desarrollar es el 3.11 (`InstallerProfile`), que requiere su propio análisis previo obligatorio antes de escribir cualquier código. No se inicia sin aprobación explícita del usuario.

## Cierre del Sprint (2026-07-13)

El usuario aprobó el desarrollo, la implementación, la validación técnica y la validación visual de este Sprint. Quedó confirmado:

- Validación técnica: `npm install`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` finalizan correctamente (solo warnings históricos ya aceptados).
- Validación visual: el layout de `InstallerDashboard` en React coincide con `Multimax_Despacho_v1.3.html`.
- La integración temporal en `RootLayout.tsx` queda aprobada tal cual, hasta que exista `layouts/InstallerLayout.tsx`/una ruta real para el Instalador.
- **Sprint 3.10 queda oficialmente cerrado (✅ Completado).** No quedan pendientes técnicos.
- **El siguiente Sprint a desarrollar es el Sprint 3.11** (`InstallerProfile`) — no se inicia sin el análisis previo obligatorio de su propio bloque HTML ni sin aprobación explícita del usuario.
