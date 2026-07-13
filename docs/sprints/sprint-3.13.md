# Sprint 3.13 - Migración de `AdminPanel` (panel de Administrador — pestaña "Instaladores")

Rama: `feature/sprint-3-13-admin-dashboard`
Estado: 🟡 En revisión — pendiente de validación real (npm install/lint/typecheck/build/dev), validación visual y aprobación explícita del usuario.

## Objetivo

Reconstruir exactamente el panel de Administrador tal como existe en `Multimax_Despacho_v1.3.html`, sin rediseñar, reinterpretar, simplificar ni modernizar. Sin cambios de arquitectura, Router, Supabase, Context ni Hooks.

## Análisis obligatorio (previo a la implementación)

Análisis realizado sobre el archivo oficial `Multimax_Despacho_v1.3.html` (3.557 líneas), única fuente de verdad. El brief exige explícitamente NO asumir que "Admin Dashboard" es el nombre correcto y confirmar función real, selector, bloque JSX, CSS, dependencias, componentes reutilizables/nuevos, diferencias, riesgos y estrategia de integración antes de escribir código.

### 1. Función encontrada

Verificado con `grep -n "function AdminPanel\|function Admin\|role === \"admin\""` sobre el archivo completo: **no existe ninguna función `AdminDashboard`** — "Admin Dashboard" es un nombre genérico de `docs/SPRINTS_INDEX.md`, igual que "Installer Dashboard" lo fue para el Sprint 3.10 (nunca confirmado por análisis real). La función real y equivalente es:

```
function AdminPanel()     // líneas 3031-3048
```

Es el componente raíz que `App()` monta cuando `role === "admin"` (línea 2121: `role === "admin" && React.createElement(AdminPanel, null)`), análogo a `Coordinator(props)`/`Installer(props)` para los otros roles.

`AdminPanel()` compone internamente dos funciones más, cada una con su propio selector CSS:

| Función | Selector raíz | Líneas | Sprint |
| --- | --- | --- | --- |
| `AdminPanel()` | `.mx-subtabs-wrap`/`.mx-subtabs` (contenedor de tabs) | 3031-3048 | **3.13 (este Sprint)** |
| `MasterCalendar` | (no analizada todavía — fuera de alcance) | no localizada en este Sprint | 3.14 "Calendar" (reservado) |
| `AdminInstaladores()` | `.mx-page`/`.mx-pagehead`/`.mx-admingrid` | 3049-3160 | **3.13 (este Sprint)** |

### 2. Selector HTML

`.mx-subtabs-wrap`/`.mx-subtabs` (contenedor de `AdminPanel`, ya portado en el Sprint 3.3 vía `MxSubtabs`/`MxSubtabButton` — sin CSS nuevo aquí) y `.mx-page`/`.mx-pagehead`/`.mx-admingrid` (contenedor de `AdminInstaladores`).

### 3. Líneas del HTML

- `AdminPanel()`: líneas 3031-3048 (18 líneas de JSX fuente).
- `AdminInstaladores()`: líneas 3049-3160 (112 líneas de JSX fuente) — el bloque más grande reconstruido en un solo componente desde `PublishModal` (Sprint 3.5).
- CSS asociado: líneas 324-342 del `<style>` original (`.mx-admingrid`/`.mx-admintable`/`.mx-adminrow*`/`.mx-admin-act*`/`.mx-invite*`), más la media query combinada de la línea 376 (`@media (max-width:760px){.mx-detail-grid,.mx-admingrid{grid-template-columns:1fr}}`).

### 4. Dependencias

- `INSTALLERS` (constante ya migrada, Sprint 3.7) — fuente de la tabla de instaladores; no se muta, solo se superpone un mapa local de overrides de suspensión (`susp`).
- `ZONAS["Panamá"]` (constante ya migrada, Sprint 3.5) — opciones del `<select>` de zona en el formulario de invitación.
- `Pill` (helper interno del HTML) → `Badge` (`.mx-pill`, Fase 3), mismo criterio que Sprints 3.11/3.12.
- Iconos (`lucide-react`): `Calendar`, `Users` (tabs de `AdminPanel`); `MapPin`, `Star` (con `className="mx-starc"`, ya usado en Sprint 3.2), `ShieldCheck`, `UserPlus`, `CheckCircle2`, `Mail`, `AlertTriangle` (dentro de `AdminInstaladores`).

### 5. Componentes reutilizables

- `MxSubtabs`/`MxSubtabButton` (Sprint 3.3) — su propio JSDoc ya anticipaba este momento exacto: "el Sprint que construya Coordinator/AdminPanel decide cuál de los dos usar". `AdminPanel()` en el HTML fuente usa el mismo markup plano (`.mx-subtabs-wrap`/`.mx-subtabs` + botones con `className` condicional `on`) que `MxSubtabs`/`MxSubtabButton` ya reconstruyen verbatim — se reutilizan sin ninguna modificación.
- `PageContainer`/`PageHead` (Fase 3, `.mx-page`/`.mx-pagehead`/`.mx-sub`) para el encabezado de `AdminInstaladores` — sin `onBack` (el HTML fuente no tiene botón de volver en este bloque).
- `Card`/`CardHeader` (Fase 3, `.mx-card`/`.mx-section-h`) para ambas tarjetas de `.mx-admingrid`.
- `Badge` (Fase 3, `.mx-pill`) para el Pill de estado.
- `Button variant="ice"` (Fase 3, `.mx-btn.mx-btn-ice`) para "Enviar invitación".
- `INSTALLERS`/`ZONAS` (ya migrados) — cero constantes nuevas en este Sprint.

**Decisión de reutilización — NO se usan `Input`/`Select` (`components/ui/`)**: el HTML fuente estiliza los `<input>`/`<select>` del formulario exclusivamente vía el selector descendiente `.mx-invite input,.mx-invite select` (no existe ninguna clase `.mx-input`/`.mx-select-native` en este bloque). Usar los componentes genéricos `Input`/`Select` aplicaría una clase adicional que no está en el HTML y alteraría el estilado real (dependiente únicamente del ancestro `.mx-invite`). Se reconstruyen como elementos nativos `<input>`/`<select>`/`<label>`, igual que el HTML — a diferencia de `PublishModal` (Sprint 3.5), que sí reutiliza `Input`/`Select` porque ese bloque sí usa las clases genéricas `.mx-input`/`.mx-select-native`.

### 6. Componentes nuevos

- `AdminPanel` (`src/components/shared/admin-panel.tsx`) — orquestador de las 2 pestañas.
- `AdminInstaladores` (`src/components/shared/admin-instaladores.tsx`) — pestaña "Instaladores" completa (tabla + formulario de invitación).

### 7. CSS requerido

Bloque de 15 selectores (`.mx-admingrid`, `.mx-admintable`, `.mx-adminrow`, `.mx-adminrow-main`, `.mx-adminrow-top`, `.mx-adminrow-name`, `.mx-adminrow-meta` + `span`/`svg`, `.mx-admin-act` + `:hover`/`.danger:hover`, `.mx-invite label`, `.mx-invite input,.mx-invite select` + `:focus`, `.mx-invite-ok` + `svg`, `.mx-invite-note` + `svg`) más la media query `@media (max-width:760px){.mx-admingrid{grid-template-columns:1fr}}` (se excluye `.mx-detail-grid`, que en el HTML fuente comparte esa misma regla — pertenece a `Coordinator`, todavía no construido; mismo criterio ya aplicado a `.mx-phone-empty` en el Sprint 3.10). Verificado con `grep` sobre `src/styles/globals.css`: ninguno de estos selectores existía antes de este Sprint (`.mx-page`/`.mx-pagehead`/`.mx-sub` ya estaban portados desde Fase 3, sin cambios).

### 8. Diferencias encontradas respecto al documento del Sprint

El nombre "Admin Dashboard" que traía `docs/SPRINTS_INDEX.md` **no corresponde** a ninguna función real del HTML (no existe `function AdminDashboard`) — mismo patrón ya detectado en los Sprints 3.4/3.6/3.9/3.10 para nombres genéricos. El equivalente real es `AdminPanel()`. Dentro de ella, `MasterCalendar` (pestaña "Calendario maestro", activa por defecto) es una función real distinta, no analizada ni construida en este Sprint — queda reservada para el Sprint 3.14 ("Calendar"), mismo criterio ya aplicado en el Sprint 3.10 con `InstallerJobs`/`InstallerProfile`.

### 9. Riesgos

- La pestaña por defecto de `AdminPanel` es "Calendario maestro" (`useState("calendario")`, línea 3032) — como `MasterCalendar` no existe todavía, el contenido inicial visible al entrar como Administrador queda vacío (`null`) hasta que el usuario cambie a la pestaña "Instaladores". Riesgo puramente visual/UX, reportado explícitamente aquí, no corregido (no se invierte el orden de pestañas ni se cambia el estado inicial — eso sería reinterpretar el HTML).
- `AdminInstaladores` es el bloque más grande reconstruido en un solo componente desde `PublishModal` (Sprint 3.5) — mayor superficie de posible desajuste visual; se verificó línea por línea contra el HTML fuente durante la implementación.
- Ninguna dependencia de motor de trabajos (`jobs`/`TRABAJOS`) — a diferencia de `Coordinator()`, este bloque es 100% reconstruible ahora con los mocks ya existentes.

### 10. Estrategia de integración

**Regla de integración del brief**: si el contenedor ya existe, integrar directamente, sin mounts temporales; si no existe (pertenece a un Sprint futuro), documentar e integrar temporalmente como con `CountRing`.

En el HTML fuente, el "contenedor" de `AdminPanel` es simplemente la rama `role === "admin"` de `App()` — hermano directo de `role === "coord"`/`role === "inst"`. En este proyecto, `RootLayout.tsx` **ya es**, desde el Sprint 3.1, el equivalente de `App()`, y ya contiene las ramas `role === 'coordinador'`/`role === 'instalador'` en esa misma posición. Por lo tanto, el contenedor real **ya existe** — se integra `AdminPanel` directamente como un nuevo bloque `{role === 'admin' && <AdminPanel />}`, en la misma posición relativa que el HTML fuente (después de las ramas de `coord`/`inst`, antes de `PublishModal`). **Esto NO es una integración temporal** (a diferencia de `CountRing`/`Radar`/`LiveCountdown`/`InstallerProfile` en su entrega inicial): coincide exactamente con la estructura real del HTML, sin inventar ninguna posición nueva.

## Implementación

### Componentes creados

- `src/components/shared/admin-panel.tsx` — `AdminPanel()`: estado `tab` (`'calendario' | 'instaladores'`, inicial `'calendario'`, igual que el HTML), renderiza `MxSubtabs` con 2 `MxSubtabButton` (Calendar/"Calendario maestro", Users/"Instaladores"), y condicionalmente `AdminInstaladores` cuando `tab === 'instaladores'`; `null` cuando `tab === 'calendario'` (documentado, reservado Sprint 3.14).
- `src/components/shared/admin-instaladores.tsx` — `AdminInstaladores()`: reconstrucción verbatim de la tabla de instaladores (con suspender/reactivar) y el formulario de invitación, sin props, estado interno de UI (`susp`/`form`/`sent`) igual que el HTML fuente.

### CSS portado

Bloque de 15 selectores + 1 media query, verbatim, insertado en `src/styles/globals.css` inmediatamente después de `.mx-myjob-price` (Sprint 3.12) y antes de `.mx-instside`.

### Integración

`src/layouts/RootLayout.tsx`: se agregó `import { AdminPanel } from '@/components/shared/admin-panel'` y el bloque `{role === 'admin' && <AdminPanel />}`, en la misma posición relativa que el HTML fuente (después de las ramas `coordinador`/`instalador`, antes de `PublishModal`). Sin mocks/props nuevos — `AdminPanel` no recibe ninguna prop. Se agregó un nuevo bloque JSDoc "INTEGRACIÓN REAL — Sprint 3.13" explicando por qué esta NO es una integración temporal.

### Reutilización (sin duplicar)

`MxSubtabs`/`MxSubtabButton` (Sprint 3.3, sin modificar), `PageContainer`/`PageHead`/`Card`/`CardHeader`/`Badge`/`Button` (Fase 3, sin modificar), `INSTALLERS`/`ZONAS` (ya migrados, sin modificar). Cero componentes/constantes duplicados.

### Preparación para Supabase

- **Datos mock utilizados**: `INSTALLERS` (Sprint 3.7) y `ZONAS['Panamá']` (Sprint 3.5) — ambos ya existentes, ninguno generado dentro de este Sprint ni dentro de los componentes.
- **Origen de dichos datos**: constantes reutilizables en `src/constants/index.ts`, importadas directamente por `AdminInstaladores` (mismo patrón ya usado por `InstallerDashboard`/`InstallerJobs`).
- **Estado interno no afectado por esta regla**: `susp` (overrides de suspensión), `form` (campos del formulario) y `sent` (aviso de éxito) son estado de interacción de UI —mismo criterio ya aprobado para `PublishModal` (Sprint 3.5)— no colecciones de datos de negocio, por lo que no están sujetos a "no generar objetos/arrays": son análogos al `useState` de cualquier formulario controlado.
- **Cómo podrán sustituirse posteriormente por datos reales**: `INSTALLERS` podrá reemplazarse por una consulta real a la tabla `usuarios`/`instaladores` sin tocar el JSX/estructura/estilos de `AdminInstaladores` — el componente ya es puramente presentacional respecto a esa colección. La acción "Suspender"/"Reactivar" (`setSusp`) y "Enviar invitación" (`enviar`) hoy son solo estado local; en la integración real deberán conectarse a mutaciones reales (`usuarios.set_activo`, invitación por correo) sin cambiar el marcado visual.
- **Qué queda pendiente para la futura Fase de integración**: conectar `susp`/`enviar` a mutaciones reales de Supabase; decidir el mecanismo real de invitación (edge function / servicio de correo); `MasterCalendar` (Sprint 3.14) sigue pendiente por completo.

## Archivos creados

- `src/components/shared/admin-panel.tsx`
- `src/components/shared/admin-instaladores.tsx`
- `docs/sprints/sprint-3.13.md`

## Archivos modificados

- `src/styles/globals.css` — bloque de 15 selectores + 1 media query (`.mx-admingrid`/`.mx-admintable`/`.mx-adminrow*`/`.mx-admin-act*`/`.mx-invite*`).
- `src/layouts/RootLayout.tsx` — import de `AdminPanel`, bloque `{role === 'admin' && <AdminPanel />}`, nuevo JSDoc "INTEGRACIÓN REAL — Sprint 3.13".
- `CHANGELOG.md`, `PROJECT_STATUS.md`, `MIGRATION_STATUS.md`, `TODO.md`, `docs/SPRINTS_INDEX.md` — actualizados en esta misma ronda, per instrucción explícita del brief de este Sprint (a diferencia de los Sprints 3.9-3.12, donde estos archivos se reservaban para una ronda de cierre posterior a la aprobación del usuario).

## Validaciones (best-effort en sandbox; validación real diferida al usuario)

- `tsc --noEmit` con stubs ambientales básicos (`/tmp/ts-stub-check/tsconfig.check.json`): 0 diagnósticos.
- `tsc --noEmit` con stubs ambientales estrictos (`/tmp/ts-stub-check/tsconfig.strict-check.json`, incluye `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`, espejo de `tsconfig.app.json`): 0 diagnósticos.
- `prettier --check` sobre `admin-panel.tsx`, `admin-instaladores.tsx`, `RootLayout.tsx`, `globals.css`: sin problemas de formato.
- `npm install`/`npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` reales: no ejecutables en este entorno sandbox (sin acceso de red a `registry.npmjs.org`). El brief de este Sprint exige estas 4 validaciones obligatoriamente antes de considerar el Sprint terminado — quedan explícitamente pendientes de confirmación en el entorno del usuario; el Sprint **no se marca como cerrado/aprobado** hasta esa confirmación.
- `git status`/`git diff --stat -- src/` (solo lectura): confirma el alcance exacto de archivos tocados en este Sprint, sin ninguna operación Git de escritura ejecutada.

## Cobertura

- `components/shared/`: 25 componentes (se agregan `AdminPanel`/`AdminInstaladores`).
- Clases CSS `.mx-admin*`/`.mx-invite*`: 15/15 selectores portados (100% del bloque de este Sprint).

## Pendientes fuera de alcance de este Sprint

- `MasterCalendar` (pestaña "Calendario maestro" de `AdminPanel`) — Sprint 3.14 "Calendar", ya reservado.
- Conectar `susp`/`enviar` de `AdminInstaladores` a mutaciones reales de Supabase (Fase de integración futura).
- Todo lo ya pendiente de Sprints anteriores (motor de trabajos real, `Coordinator()` completo, resto de "Solicitudes" del Instalador, etc.) — sin cambios en este Sprint.

## Estado al cierre de esta ronda

Implementación y documentación completas, incluida la actualización de los 5 archivos administrativos per instrucción explícita de este brief. Pendiente: validación real (npm install/lint/typecheck/build/dev), validación visual del usuario comparando contra `Multimax_Despacho_v1.3.html`, y su aprobación explícita antes de iniciar el Sprint 3.14. El Sprint permanece en estado 🟡 En revisión en todos los archivos actualizados hasta esa aprobación.
