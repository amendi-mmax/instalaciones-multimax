# Sprint 3.12 - Migración de `InstallerJobs` ("Mis trabajos" del Instalador)

Rama: `feature/sprint-3-12-installer-jobs`
Estado: 🟡 En revisión — pendiente de validación real (npm install/lint/typecheck/build/dev), validación visual y cierre administrativo por parte del usuario.

## Objetivo

Reconstruir exactamente la pantalla "Mis trabajos" dentro del teléfono del Instalador, tal como existe en `Multimax_Despacho_v1.3.html`, sin rediseñar, reinterpretar, simplificar ni modernizar. Sin cambios de arquitectura.

## Fase de análisis (obligatoria, previa a la implementación)

Análisis realizado sobre el archivo oficial `Multimax_Despacho_v1.3.html` (3.557 líneas), única fuente de verdad. El brief de este Sprint exige explícitamente NO asumir que el nombre "InstallerJobs" coincide con el HTML, y confirmar nombre real, selector, bloque JSX completo, CSS, dependencias, utilidades, componentes hijos/reutilizados, props, callbacks, estado, y relación con `InstallerDashboard`/`InstallerProfile`/`CountRing`/`LiveCountdown`/futuras pantallas.

### 1. Confirmación del nombre del Sprint

Verificado con `grep -n "function InstallerJobs\|function InstallerProfile\|function Installer\b"` sobre el archivo completo: existe, tal cual, con ese nombre exacto:

```
function InstallerJobs()     // líneas 3453-3484, selector raíz .mx-myjobs
```

El nombre "InstallerJobs" **sí corresponde exactamente** a esta función real — sin discrepancia que reportar como bloqueo. Está ubicada inmediatamente después del cierre de `Installer(props)` (línea 3452) y antes de `InstallerProfile({ meInfo })` (línea 3491, Sprint 3.11).

### 2. Bloque JSX completo

```
function InstallerJobs() {
  const grupos = ["Próximos", "Historial"];
  return React.createElement("div", { className: "mx-myjobs" },
    grupos.map(g => {
      const items = MISJOBS.filter(m => m.grupo === g);
      if (items.length === 0) return null;
      return React.createElement(React.Fragment, { key: g },
        React.createElement("div", { className: "mx-phonehdr" },
          React.createElement(Briefcase, { size: 13 }), g),
        items.map((m, i) => {
          const e = ESTADO[m.estado] || ESTADO.pendiente;
          return React.createElement("div", { key: i, className: "mx-myjob" },
            React.createElement("div", { className: "mx-myjob-top" },
              React.createElement("span", { className: "mx-myjob-t" }, m.tipo),
              React.createElement(Pill, { tone: e.tone }, e.label)),
            React.createElement("div", { className: "mx-myjob-meta" },
              React.createElement("span", null, React.createElement(MapPin, { size: 12 }), m.zona),
              React.createElement("span", null, React.createElement(Calendar, { size: 12 }), m.fecha, " · ", m.hora),
              React.createElement("span", { className: "mx-myjob-price" }, "$", m.precio)));
        }));
    }));
}
```

**Props**: ninguna. **Callbacks**: ninguno. **Estado propio**: ninguno (función pura). **Efectos**: ninguno.

### 3. Selector HTML y CSS asociado

Selector raíz: `.mx-myjobs`. CSS encontrado (líneas 351-360 del `<style>` original), 8 selectores (10 reglas contando los hijos `svg`/`span`): `.mx-phonehdr` (+ `svg`), `.mx-myjobs`, `.mx-myjob`, `.mx-myjob-top`, `.mx-myjob-t`, `.mx-myjob-meta` (+ `span`/`svg`), `.mx-myjob-price`. Verificado con `grep` sobre `src/styles/globals.css`: ninguno existía antes de este Sprint.

### 4. Dependencias / constantes

- **`MISJOBS`** (línea 1327 del script): mock estático de 4 registros (`tipo`/`zona`/`fecha`/`hora`/`precio`/`estado`/`grupo`), sin `id`. No existía en el proyecto — se agregó a `src/constants/index.ts`.
- **`ESTADO`** (línea 1155 del script): mapeo `estado → { tone, label }` para las Pill — catálogo transversal del prototipo, también usado por `TRABAJOS`/`Coordinator()` (fuera de alcance de este Sprint). No existía en el proyecto — se portó **completo** (los 6 estados: `en_vivo`/`asignado`/`completado`/`cancelado`/`confirmado`/`pendiente`), no solo el subconjunto usado por `MISJOBS` (`confirmado`/`pendiente`/`completado`), para no tener que reabrir este archivo ni duplicar el mapeo cuando llegue el Sprint que migre `Coordinator()`. `ARCHITECTURE.md` §3 ya reserva este catálogo como `constants/estadoUi.ts` en la arquitectura final; por ahora vive junto al resto de constantes de Fase 3 en `src/constants/index.ts`.
- **`grupos`** (`["Próximos", "Historial"]`): array local de literales dentro del componente — son los encabezados de sección fijos del HTML (no datos de negocio ni mock sustituible), se mantiene como constante módulo-local (`GRUPOS`), igual que el HTML fuente.

### 5. Componentes hijos / reutilizados

- **`Pill` (helper interno del HTML)** → reutiliza `Badge` (`.mx-pill`, Fase 3), mismo criterio ya aplicado en `InstallerProfile` (Sprint 3.11): el mapeo estado→tono ya lo resuelve `ESTADO`, así que se usa `Badge` directamente (no `StatusBadge`, que agregaría una segunda capa semántica redundante).
- **Iconos** (`lucide-react`): `Briefcase` (13px, encabezado de grupo — mismo ícono ya usado como ícono de tab "Mis trabajos" en `InstallerDashboard`, Sprint 3.10, sin relación funcional entre ambos usos), `MapPin` (12px), `Calendar` (12px, primer uso real en el proyecto).
- Sin componentes hijos nuevos: la estructura completa (encabezado de grupo + tarjetas) se reconstruye dentro de un único componente `InstallerJobs`, igual que en el HTML fuente (una sola función, sin sub-componentes).

### 6. Relación con otros componentes ya aprobados

- **`InstallerDashboard` (Sprint 3.10)**: es el contenedor real — `InstallerJobs` se monta en su rama `instTab === 'trabajos'`, que hasta este Sprint renderizaba `null`.
- **`InstallerProfile` (Sprint 3.11)**: sin relación directa; ambos son hermanos dentro de las pestañas de `InstallerDashboard`, sin dependencias cruzadas.
- **`CountRing`**: sin relación — no aparece en el cuerpo de `InstallerJobs()`.
- **`LiveCountdown`**: sin relación — no aparece en el cuerpo de `InstallerJobs()`.
- **Futuras pantallas del Instalador**: ninguna dependencia detectada; `InstallerJobs()` es una función autocontenida en el HTML fuente.

## Implementación

### Componente creado

`src/components/shared/installer-jobs.tsx` — `InstallerJobs()`, sin props, reconstrucción verbatim. Itera `GRUPOS` (`["Próximos", "Historial"]`), filtra `MISJOBS` por `grupo`, omite el grupo si está vacío (`items.length === 0`), y por cada trabajo resuelve `ESTADO[job.estado]` para pintar la Pill de estado.

### Constantes agregadas (`src/constants/index.ts`)

- `EstadoUiTone`, `EstadoUiInfo`, `EstadoUiKey`, `ESTADO` — mapeo completo de 6 estados, verbatim del HTML fuente. `tone` reutiliza los mismos 6 valores literales de `BadgeTone` (`components/ui/badge.tsx`) sin importar ese tipo (capa `constants/` no depende de `components/`); el componente consumidor es responsable de pasarlo a `Badge`.
- `MisJobMock`, `MISJOBS` — mock de 4 registros, verbatim del HTML fuente.

### CSS portado

Se agregó el bloque de 8 selectores (10 reglas) `.mx-phonehdr`/`.mx-myjobs`/`.mx-myjob*` a `src/styles/globals.css`, verbatim, insertado inmediatamente después de `.mx-profblock h4 svg` (Sprint 3.11) y antes de `.mx-instside`.

### Integración (regla permanente vigente desde el Sprint 3.11)

Como `InstallerDashboard` ya existe, `InstallerJobs` se integra **directamente dentro de su rama real** `instTab === 'trabajos'` (antes `null`) — sin ningún mount temporal en `RootLayout.tsx`. `RootLayout.tsx` no requirió ningún cambio en este Sprint: sigue renderizando únicamente `InstallerDashboard` (más `CountRing`, integración temporal separada del Sprint 3.8, sin relación con este Sprint) dentro de `role === 'instalador'`.

## Archivos creados

- `src/components/shared/installer-jobs.tsx`
- `docs/sprints/sprint-3.12.md`

## Archivos modificados

- `src/constants/index.ts` — `ESTADO`/`EstadoUiTone`/`EstadoUiInfo`/`EstadoUiKey`, `MISJOBS`/`MisJobMock`.
- `src/styles/globals.css` — bloque `.mx-phonehdr`/`.mx-myjobs`/`.mx-myjob*` (8 selectores, 10 reglas).
- `src/components/shared/installer-dashboard.tsx` — import de `InstallerJobs`; la rama `instTab === 'trabajos'` (antes `null`) ahora renderiza `<InstallerJobs />`; JSDoc actualizado (nota "✅ Resuelta en el Sprint 3.12" + nuevo bloque "AJUSTE DE INTEGRACIÓN").

## Diferencias encontradas respecto al brief

Ninguna que constituya un bloqueo: el nombre "InstallerJobs" coincide exactamente con la función real del HTML. Única decisión a documentar (no una desviación silenciosa): se portó el objeto `ESTADO` **completo** (6 estados) en vez de solo el subconjunto usado por `MISJOBS` (3 estados), para evitar una migración parcial que tendría que reabrirse cuando se migre `Coordinator()`/`TRABAJOS` — ver punto 4 del análisis.

## Limitaciones

- `ESTADO` se porta completo, pero sus 3 estados no usados por `MISJOBS` (`en_vivo`/`asignado`/`cancelado`) no tienen consumidor real todavía en el proyecto — quedarán sin ejercitar hasta el Sprint que migre `Coordinator()`/`TRABAJOS`.
- `.mx-phonehdr` se reconstruye únicamente para este consumidor (`InstallerJobs`); no se anticipa ningún otro uso, aunque el HTML podría reutilizarlo en otras listas agrupadas fuera de alcance de este Sprint.

## Preparación para integración con Supabase

- **Datos mock utilizados**: `MISJOBS` (4 registros estáticos, `src/constants/index.ts`) y `ESTADO` (mapeo de 6 estados, `src/constants/index.ts`).
- **Origen de dichos datos**: ambos son constantes reutilizables portadas verbatim del HTML fuente (`const MISJOBS`, línea 1327; `const ESTADO`, línea 1155) — no se generó ningún dato mock dentro del componente `InstallerJobs`; este solo los importa y los recorre. Mismo patrón ya establecido para `INSTALLERS` (consumido directamente por `InstallerDashboard`).
- **Cómo podrán sustituirse posteriormente por datos reales**: `MISJOBS` podrá reemplazarse por una consulta real a la tabla `trabajos` (filtrada por el instalador autenticado, agrupada por una fecha/fase equivalente a "Próximos"/"Historial") sin tocar el JSX, la estructura ni los estilos de `InstallerJobs` — únicamente cambiaría la fuente del arreglo que se itera. `ESTADO` podrá migrarse a `constants/estadoUi.ts` (ya reservado en `ARCHITECTURE.md` §3) indexado por `trabajos.phase`/`bids.estado` reales, sin cambiar su forma (`tone`/`label`) ni los puntos donde se consume.
- **Qué queda pendiente para la futura Fase de integración**: definir la consulta real (tabla/columnas/filtro por instalador), decidir el criterio real de agrupación "Próximos"/"Historial" (hoy son solo 2 literales fijos, no derivados de una fecha), y mover `ESTADO` a `constants/estadoUi.ts` cuando se reorganice la carpeta `constants/` según `ARCHITECTURE.md` §3. Ninguna de estas decisiones se tomó en este Sprint — sigue siendo exclusivamente visual, con datos mock.

## Validaciones (best-effort en sandbox; validación real diferida al usuario)

- `tsc --noEmit` con stubs ambientales básicos (`/tmp/ts-stub-check/tsconfig.check.json`): 0 diagnósticos.
- `tsc --noEmit` con stubs ambientales estrictos (`/tmp/ts-stub-check/tsconfig.strict-check.json`, incluye `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`, espejo de `tsconfig.app.json`): 0 diagnósticos.
- `prettier --check` sobre `installer-jobs.tsx`, `installer-dashboard.tsx`, `constants/index.ts`, `globals.css`: sin problemas de formato.
- `npm install`/`npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` reales: no ejecutables en este entorno sandbox (sin acceso de red a `registry.npmjs.org`). Validación real diferida por completo al entorno del usuario, como en todos los Sprints anteriores.
- `git status`/`git diff --stat -- src/` (solo lectura): confirma el alcance exacto de archivos tocados en este Sprint, sin ninguna operación Git de escritura ejecutada.

## Cobertura

- `components/shared/`: 23 componentes (se agrega `InstallerJobs`).
- Clases CSS `.mx-myjob*`/`.mx-phonehdr`: 8/8 selectores portados (100% del bloque).

## Pendientes fuera de alcance de este Sprint

- Definir la consulta real de Supabase que reemplace `MISJOBS` (Fase de integración futura).
- Mover `ESTADO` a `constants/estadoUi.ts` cuando corresponda la reorganización de `constants/` (`ARCHITECTURE.md` §3).
- Migrar `Coordinator()`/`TRABAJOS`, único otro consumidor real de `ESTADO` en el HTML fuente (Sprint futuro, sin numerar todavía).

## Estado al cierre de esta ronda

Implementación y documentación completas. Pendiente: validación real (npm install/lint/typecheck/build/dev) y validación visual por parte del usuario, comparando contra `Multimax_Despacho_v1.3.html`. No se actualiza ningún archivo de documentación administrativa (`CHANGELOG.md`, `PROJECT_STATUS.md`, `MIGRATION_STATUS.md`, `TODO.md`, `docs/SPRINTS_INDEX.md`) en esta ronda — reservado para el cierre administrativo, tras la aprobación del usuario.
