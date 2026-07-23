# Sprint 5.2.2.1 — Persistencia del trabajo publicado (Supabase)

## 0. Nota de trazabilidad — consultas previas a escribir código

Antes de tocar cualquier archivo, y siguiendo la Metodología Oficial de este brief y la "Observación adicional" (confirmar 3 puntos concretos, o detenerse), se realizó una auditoría completa (sección 2) y se consultó al usuario dos veces vía `AskUserQuestion`, antes de escribir ninguna línea de código:

1. **Primera consulta** — se presentaron los 3 puntos pedidos (tabla correcta, si `ActiveJob` puede construirse con un único `INSERT...RETURNING`, si existe alguna policy RLS que pueda bloquear el INSERT) más un hallazgo real de la auditoría: la policy real "coordinadores publican en su tienda" exige que `auth.uid()` sea una fila real de `coordinadores` dueña de la tienda — un `admin` en `AdminVistaSwitch → "Modo Coordinador"` no lo es, así que ese caso específico sería rechazado por RLS. **Respuesta del usuario (verbatim, resumida)**: no tomar ninguna decisión arquitectónica todavía; ya existe un Coordinador real sembrado (mismo UUID en `auth.users`/`coordinadores`, empresa/tienda válidas), pero **todavía no se probó ese login ni ese INSERT real**; no implementar ninguna restricción para el modo Administrador, no deshabilitar el botón Publicar, no modificar las Policies, no cambiar el repositorio; este Sprint debe continuar preparando el flujo para que la **primera prueba real** se haga con el Coordinador autenticado; cualquier ajuste pequeño adicional necesario debe describirse y consultarse antes de implementarlo.
2. **Segunda consulta** — se detectó que el brief pide, para el caso de fallo, "mostrar mensaje de error existente" Y "NO modificar la UI" a la vez, pero no existe HOY ningún elemento visual ya cableado en el flujo Publish para un error de envío (distinto de `FieldError`, que es validación de formulario). **Respuesta del usuario (verbatim, resumida)**: autoriza reutilizar el sistema de Toast ya existente en el proyecto (`Toast`/`ToastViewport`, `ui/toast.tsx`) con el mismo patrón de cola local ya usado en `LoginPage.tsx`; no crear un sistema de mensajes nuevo; no extender `FieldError` para errores de servidor (ese componente sigue siendo exclusivo de validación de formulario); no crear componentes nuevos; no modificar el diseño de `PublishModal`; reutilizar exclusivamente infraestructura existente.

Este Sprint se implementó siguiendo exactamente esas 2 resoluciones explícitas. **No se ha realizado ninguna prueba real contra Supabase en este entorno de trabajo** (sin `node_modules`/acceso de red, ver nota de siempre) — el código queda preparado para que la primera prueba real ocurra con el usuario Coordinador ya sembrado, tal como pidió el usuario.

## 1. Resumen técnico

Se reemplaza el origen del `ActiveJob` del flujo Publish: antes de este Sprint, `onPublish` (`CoordinatorLayout.tsx`) construía un objeto 100% en memoria (Sprint 5.2.1); ahora inserta una fila real en la tabla `trabajos` de Supabase (`trabajosRepository.create()`, ya existente, sin cambios), espera la fila creada (`INSERT ... RETURNING`), la mapea al mismo tipo `JobSummaryCardJob` de siempre, y solo entonces llama a `setActiveJob()`. Si el INSERT falla (RLS, red, constraint, timeout), se muestra un Toast con el mensaje real de error, `activeJob` no cambia y `CoordinatorWorkspace` no aparece — el Coordinador permanece en `CoordinatorEmptyState`. Ningún otro archivo del flujo (`PublishModal`, `DespachoPage.tsx`, `JobSummaryCard`, `OperationalContextProvider`, `trabajos.repository.ts`, policies RLS) se modificó.

## 2. Auditoría realizada

Antes de escribir código se releyeron/verificaron (sin asumir nada de reportes anteriores):

- `ARCHITECTURE.md`, `PROJECT_STATUS.md`, `CHANGELOG.md`, `README.md`, `TODO.md`, `docs/SPRINTS_INDEX.md` — sin ningún dato que contradijera lo de abajo.
- `docs/architecture/frontend/SPRINT_5_2_1_PUBLISH_WORKFLOW_FIX_REPORT.md` y `SPRINT_5_2_1_KPI_LOADING_FIX_REPORT.md` — confirmaron el estado exacto de `CoordinatorLayout.tsx`/`OperationalContextProvider.tsx` antes de este Sprint.
- `src/components/shared/publish-modal.tsx` — `PublishForm` (14 campos), validación de 7 obligatorios (Sprint 5.2.1 Fix) sin cambios; `onPublish: (form: PublishForm) => void` acepta también una función `async` (TypeScript trata un retorno `Promise<void>` como asignable a un tipo de retorno `void`) sin que el propio archivo necesite ningún cambio.
- `src/layouts/CoordinatorLayout.tsx` — único dueño real de `PublishModal`/`onPublish` (confirmado, sin cambios, desde el Sprint 5.1.2/5.2.1).
- `src/providers/OperationalContextProvider.tsx`/`operational-context.context.ts` — confirmado que ya resuelve `tiendaId`/`empresaId` (además de `activeJob`/`setActiveJob`, agregados en el Sprint 5.2.1 Fix) de forma síncrona para un Coordinador real, y asíncrona para un `admin` superusuario — mismos valores que ya consume `DespachoPage.tsx` para los KPIs, sin ninguna consulta nueva.
- `src/services/dashboard.service.ts`, `src/services/profile.service.ts`, `src/services/database.service.ts`, `src/services/supabase.service.ts` — confirmado el patrón `ServiceResult`/`toServiceResult()` (nunca deja una promesa pendiente si la promesa subyacente se resuelve; SÍ puede lanzar una excepción de red genuina antes de eso, sin capturarla — de ahí el `try/catch` agregado en el sitio de la llamada, no en el servicio).
- `src/repositories/trabajos.repository.ts` y `src/repositories/base.repository.ts` — confirmado que `create()` ya existe, ya hace `insert(row).select().single()`, y ya está tipado contra `TableInsert<'trabajos'>`/`TableRow<'trabajos'>` — cero cambios necesarios a este archivo.
- `src/types/database.generated.ts` (líneas 343-434, tabla `trabajos`) — esquema real generado por `supabase gen types typescript --linked` (autoritativo, más reciente que las migraciones locales — ver más abajo).
- `supabase/migrations/0001_initial_schema.sql`/`0002_auth_roles_rls.sql` — **discrepancia real detectada y descartada como no autoritativa**: estos 2 archivos describen un esquema DISTINTO y más antiguo (`usuarios` unificada con columna `rol`, `sucursales`, `bids`, `trabajos.phase`) que NO coincide con `database.generated.ts` ni con `docs/database/DATABASE_INVENTORY.md` (que sí usa `trabajos`/`tiendas`/`coordinadores`/`instaladores`/`admins`, exactamente como el código real). Esto ya estaba documentado como pendiente en `PROJECT_STATUS.md` ("generar la(s) migración(es) SQL que formalicen... requiere que el usuario provea el SQL real") — se confirma aquí, no se intenta reconciliar esos 2 archivos SQL en este Sprint (fuera de alcance, es infraestructura de documentación de migraciones, no código de `src/`), y no se usan como fuente de verdad para las policies reales.
- `docs/database/DATABASE_INVENTORY.md` §2.6/§7 — fuente real utilizada para el esquema/policies de `trabajos` (coincide con `database.generated.ts`, a diferencia de las migraciones locales).
- Componentes listados en "Integridad del modelo" (`JobSummaryCard`, `LiveDispatchCard`, `ResponsesPanel`, `CoordinatorWorkspace`, `InstallerView`): se confirmó que **`InstallerView` (el `Installer(props)` del HTML fuente) todavía no existe como componente real que consuma `activeJob`** — el único artefacto relacionado (`installer-solicitudes-empty-state.tsx`) documenta explícitamente que ese bloqueo sigue vigente (motor de trabajos real, fuera de alcance de varios Sprints, incluido este). No hay ningún consumidor real de `ActiveJob` del lado Instalador todavía — nada que romper ahí.

### Confirmación de los 3 puntos pedidos explícitamente ("Observación adicional")

1. **Tabla correcta**: `trabajos` (`TABLES.trabajos`, `src/lib/supabase/config.ts`; `trabajos.repository.ts`; `docs/database/DATABASE_INVENTORY.md` §2.6; coincide con `database.generated.ts`).
2. **`ActiveJob` construible con un único `INSERT ... RETURNING`**: sí, exactamente el que ya ejecuta `trabajosRepository.create()` (`insert(row).select().single()`). Única salvedad (no una consulta adicional, un dato ya disponible): `sucursal` (nombre visible de la tienda) no es una columna de `trabajos` — se toma de `form.sucursal`, el mismo string ya presente en el formulario.
3. **Policy RLS que puede bloquear el INSERT**: sí, "coordinadores publican en su tienda" (INSERT, scope "tienda propia" — `DATABASE_INVENTORY.md` §7, fila 7). Por decisión explícita del usuario, este Sprint no introduce ningún caso especial para el modo Administrador/superusuario — se deja que el INSERT se intente igual para cualquier rol, y que la policy decida; el manejo de error (sección 5) cubre cualquier rechazo sin ninguna rama adicional. La primera prueba real, con el Coordinador ya sembrado (mismo UUID en `auth.users`/`coordinadores`), queda pendiente de que el usuario la ejecute — sin esa prueba, no hay evidencia todavía de que el INSERT falle ni de que funcione.

## 3. Tabla utilizada

**Nombre real**: `trabajos` (`public.trabajos`).

| Columna | Uso en este Sprint | Obligatoria en el INSERT | Opcional/nullable |
|---|---|---|---|
| `codigo` | Generada por el frontend (`"JOB-" + Math.floor(Math.random()*9000+1000)`, mismo criterio ya usado antes de este Sprint) | ✅ (sin default) | — |
| `coordinador_id` | `profile.id` (Coordinador autenticado) | ✅ (sin default) | — |
| `empresa_id` | `useOperationalContext().empresaId` | ✅ (sin default) | — |
| `tienda_id` | `useOperationalContext().tiendaId` | ✅ (sin default) | — |
| `fecha` | `form.fecha` | ✅ (sin default) | — |
| `hora` | `form.hora` | ✅ (sin default) | — |
| `provincia` | `form.provincia` | ✅ (sin default) | — |
| `tipo` | `form.tipo` | ✅ (sin default) | — |
| `zona` | `form.zona` | ✅ (sin default) | — |
| `tipo_inmueble` | `form.tipoInmueble` | — | ✅ nullable |
| `calle` | `form.calle` | — | ✅ nullable |
| `equipo` | `form.equipo` | — | ✅ nullable |
| `requisitos` | `form.requisitos` | — | ✅ nullable |
| `extra` | `form.extra` | — | ✅ nullable |
| `precio_sugerido` | `form.precioSugerido` | — | ✅ nullable |
| `urgente` | `form.urgente` | — | ✅ default `false` |
| `bid_minutos` | `form.bidMins` | — | ✅ default `5` |
| `id` | no enviado — `gen_random_uuid()` | — | ✅ default |
| `estado` | no enviado — default real `'live'` | — | ✅ default |
| `publicado_at` | no enviado — default real `now()` | — | ✅ default |
| `bid_cierra_at` | no enviado — trigger `trg_set_bid_cierra_at` lo calcula (`publicado_at + bid_minutos`) | — | ✅ (trigger) |
| `created_at` | no enviado — default real `now()` | — | ✅ default |
| `instalador_asignado_id`, `asignado_at`, `contacto_visible_hasta`, `cliente_nombre`, `cliente_telefono`, `direccion_exacta` | no enviadas (fuera de alcance de este Sprint) | — | ✅ nullable |

## 4. Justificación arquitectónica

- **Por qué el cambio vive en `CoordinatorLayout.tsx` y en ningún otro archivo**: es el único dueño real de `PublishModal`/`onPublish` desde el Sprint 5.1.2 (decisión ya tomada y reafirmada en 2 Sprints anteriores) — el flujo del brief (`PublishModal → validaciones → INSERT → registro → ActiveJob → setActiveJob → CoordinatorWorkspace`) pasa completo por ese único callback.
- **Por qué se reutiliza `trabajosRepository.create()` sin ningún cambio**: ya existe desde el Sprint 4.1.1, ya hace exactamente `insert(row).select().single()` (INSERT + RETURNING en una sola llamada), ya está tipado contra el esquema real (`TableInsert<'trabajos'>`) — instrucción explícita del usuario de no modificar el repositorio, y no había ninguna razón técnica para hacerlo (auditado, cumple el contrato necesario tal cual).
- **Por qué `tiendaId`/`empresaId` vienen de `useOperationalContext()` y no de `profile` directamente**: `DespachoPage.tsx` ya usa esos mismos 2 campos del mismo Provider para los KPIs — son la fuente ya establecida y correcta tanto para un Coordinador real (resolución síncrona desde `profile`) como para un `admin` superusuario (resolución asíncrona real contra `empresas`/`tiendas`) — leer `profile.tiendaId` directamente aquí habría reintroducido la misma inconsistencia que el Sprint 5.1.1 ya corrigió en `DespachoPage`/`TrabajosPage`.
- **Por qué el Toast es una cola local en `CoordinatorLayout.tsx`, no un sistema global**: instrucción explícita del usuario ("reutilizar exclusivamente la infraestructura existente", "no crear un nuevo sistema de mensajes") — el único precedente real en el proyecto (`LoginPage.tsx`) es, por diseño documentado en `ui/toast.tsx`, una cola local sin Provider/Context global; replicar ese mismo patrón (mismos componentes `Toast`/`ToastViewport`, misma forma de estado) es la única forma de "reutilizar exclusivamente" sin inventar una arquitectura de mensajes nueva.
- **Por qué `FieldError` no se toca**: instrucción explícita del usuario — sigue siendo exclusivamente para validación de formulario (campos vacíos/formato), un concepto distinto de un fallo de Supabase (RLS/red/constraint), que ocurre DESPUÉS de que la validación de formulario ya pasó.
- **Por qué no se agrega ningún caso especial para `esSuperusuario`/modo Administrador**: instrucción explícita del usuario en la primera consulta — el INSERT se intenta igual para cualquier rol; si la policy real lo rechaza, el manejo de error genérico (Toast con el mensaje real de Postgrest/RLS) ya lo cubre sin necesitar ninguna rama nueva. No se asume que fallará ni que funcionará — queda pendiente de la primera prueba real que el usuario decidió hacer con el Coordinador ya sembrado.
- **Por qué se envuelve la llamada en `try/catch` además de revisar `result.ok`**: `toServiceResult()` (auditado, sin cambios) no atrapa una excepción de red genuina que rechace la promesa antes de resolver `{data, error}` — mismo patrón ya validado y aprobado en `DespachoPage.tsx` (Sprint 5.2.1 Fix, "Publish Workflow Stabilization") para el mismo tipo de falla.
- **Por qué `ActiveJob.id` usa `codigo` (no el `id` uuid real de la fila)**: preserva exactamente la misma fidelidad visual del Job (badge `"JOB-XXXX"`) que ya mostraba el Job temporal — usar el uuid real ahí sería un cambio visual no pedido («Todo el flujo visual existente debe permanecer exactamente igual»). El uuid real (`row.id`) no se necesita todavía en ningún flujo existente (asignación/bid engine son Sprints futuros) — no se descarta, simplemente no se agrega a `JobSummaryCardJob` sin que ningún Sprint lo pida.

## 5. Flujo implementado

```
PublishModal (validaciones existentes, sin cambios)
  ↓
CoordinatorLayout.onPublish(form) [async, Sprint 5.2.2.1]
  ↓
guarda: tiendaId/empresaId resueltos? → si no, Toast de error, return
  ↓
payload: TableInsert<'trabajos'> (codigo generado + form + contexto operativo)
  ↓
trabajosRepository.create(payload)  [sin cambios, ya existía]
  ↓
  ├─ error (RLS/constraint/red) → Toast('error', ...) · NO setActiveJob · NO cambia CoordinatorWorkspace
  └─ éxito → fila real devuelta (INSERT...RETURNING)
       ↓
     mapeo a JobSummaryCardJob (fila real + form.sucursal)
       ↓
     setActiveJob(newJob) · setShowPublishModal(false)
       ↓
     CoordinatorWorkspace (sin cambios — lee `activeJob` igual que siempre)
```

## 6. Archivos modificados

- `src/layouts/CoordinatorLayout.tsx` — único archivo de código modificado:
  - Imports nuevos: `Toast`/`ToastViewport`/`ToastTone` (`@/components/ui/toast`, ya existente), `trabajosRepository` (`@/repositories`, ya existente), `type TableInsert` (`@/services/database.service`, ya existente).
  - `useOperationalContext()` ahora también desestructura `tiendaId`/`empresaId` (mismo hook ya usado, ningún consumo nuevo).
  - Nueva cola local de Toast (`toasts`/`pushToast`/`dismissToast`, interfaz `CoordinatorLayoutToast`) — mismo patrón de `LoginPage.tsx`.
  - `onPublish` de `PublishModal` pasa de síncrono (Job en memoria) a `async` (INSERT real + mapeo + `setActiveJob`, o Toast de error).
  - `<ToastViewport>` agregado al final del JSX ya existente de este Layout.
- `PROJECT_STATUS.md`, `CHANGELOG.md`, `docs/SPRINTS_INDEX.md` — nueva sección/entrada/fila para este Sprint.

## 7. Componentes reutilizados

`trabajosRepository.create()` (sin cambios), `useOperationalContext()` (sin cambios a el Provider — solo se leen 2 campos ya existentes), `Toast`/`ToastViewport` (`ui/toast.tsx`, sin cambios, mismo patrón de uso que `LoginPage.tsx`), `PublishModal` (sin cambios, ni de props ni visuales), `JobSummaryCardJob` (mismo tipo de siempre, sin cambios de forma), `ConfirmCancelDialog`/`Header`/`Footer`/`SucursalSelect`/`CoordinatorSubtabs` (sin cambios). Ningún componente/hook/servicio/Provider/Context nuevo.

## 8. Confirmación de ausencia de regresiones

- **`PublishModal` visualmente**: cero cambios — mismas props, misma estructura, mismas validaciones de campo (`FieldError`/`submitAttempted`, Sprint 5.2.1 Fix, intactas).
- **`CoordinatorWorkspace`/`JobSummaryCard`/`LiveDispatchCard`/`ResponsesPanel`/`CoordinatorKpiRow`/`JobIndicadoresCard`**: cero archivos tocados.
- **`Header`/`Sidebar`/`Footer`**: cero archivos tocados (`Sidebar` de Coordinador nunca existió, decisión ya reafirmada en Sprints anteriores).
- **Roles/Router/Auth/Policies**: cero archivos tocados — ninguna policy RLS modificada, ninguna ruta nueva, `useAuth()` se sigue leyendo igual que antes (mismo Context ya cacheado).
- **Objetivo 1/2 del Sprint 5.2.1 Fix (persistencia de `activeJob` entre vistas / botón Cancelar)**: sin cambios — `activeJob`/`setActiveJob` se siguen leyendo/escribiendo exactamente igual desde `OperationalContextProvider`; `ConfirmCancelDialog.onYes` sigue llamando a `setActiveJob(null)`, sin tocar.
- **KPIs (`DespachoPage.tsx`)**: cero cambios — ese flujo es completamente independiente del origen de `activeJob`.
- **`trabajos.repository.ts`/policies RLS/`OperationalContextProvider.tsx`**: cero cambios, por instrucción explícita.

## 9. Resultado esperado de `npm run lint` / `npm run typecheck` / `npm run build` / `npm run dev`

Este entorno de trabajo no tiene `node_modules` ni acceso de red — no es posible ejecutar estos 4 comandos aquí, y sus resultados no se fabrican. Se ejecutó `tsc --noEmit` (instalación global) sobre el proyecto completo: el único delta respecto al cierre del ajuste anterior ("CoordinatorKpiRow visible siempre") son diagnósticos nuevos en `CoordinatorLayout.tsx`, todos de las mismas categorías ya clasificadas como artefactos de entorno (`TS2307`/`TS7006`/`TS7026`/`TS2875`/`TS2322` — este último idéntico, línea por línea, al que ya produce el `<Toast/>` de `LoginPage.tsx` en este mismo sandbox, confirmando que no es un error nuevo de este Sprint sino la misma falta de `@types/react` de siempre). Cero `TS6133`, cero errores de sintaxis.

Expectativa razonada (no un resultado real) para los 4 comandos: `npm run lint`/`typecheck`/`build` en verde; `npm run dev`, con el usuario Coordinador real ya sembrado (mismo UUID en `auth.users`/`coordinadores`) autenticado, debería: al completar y confirmar `PublishModal`, insertar una fila real en `trabajos`, mostrar `CoordinatorWorkspace` con los datos reales de esa fila (más `sucursal` del formulario) — o, si Supabase rechaza el INSERT por cualquier motivo (RLS/constraint/red), mostrar un Toast de error y permanecer en `CoordinatorEmptyState`, sin ningún cambio de UI adicional. **Esta es exactamente la prueba pendiente que el usuario decidió hacer a continuación** — la primera vez que este flujo se ejecuta contra Supabase real, con el Coordinador autenticado — y su resultado real corresponde reportarlo desde el entorno del usuario.

## 10. Reporte generado

`docs/architecture/frontend/SPRINT_5_2_2_1_SUPABASE_PUBLISH_REPORT.md` (este documento).
