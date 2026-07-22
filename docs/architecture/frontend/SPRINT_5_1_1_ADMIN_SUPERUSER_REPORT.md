# Sprint 5.1.1 — Implementación del modo Administrador Superusuario (MVP)

## 0. Nota de traza sobre el entorno de esta ronda

Sin ZIP adjunto: se trabajó sobre el estado en disco dejado por el cierre de la ronda anterior (corrección de Hooks/CSS del Sprint 5.1 + actualización de metodología documental de Fase 5). Este entorno de trabajo no tiene `node_modules`/acceso de red — validación técnica realizada con la instalación global de `tsc` (`/home/claude/.npm-global/bin/tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0`), filtrando los diagnósticos a los archivos tocados y clasificándolos contra el mismo patrón de artefactos de entorno ya establecido en Sprints anteriores (`TS2307`/`TS2875`/`TS7026`/`TS2322` causados por la ausencia real de `node_modules`, no por errores de este Sprint). `npm run lint`/`npm run build`/`npm run dev` reales quedan, como en toda ronda anterior, bajo responsabilidad del usuario en su propio entorno.

## 1. Auditoría previa obligatoria (antes de escribir código)

Se leyeron completos `ARCHITECTURE.md` (§8, §14.9), `PROJECT_STATUS.md`, `CHANGELOG.md`, `README.md`, `TODO.md`, `docs/SPRINTS_INDEX.md`, este mismo reporte anterior (`SPRINT_5_1_COORDINATOR_REPORT.md`), el código real de `RootLayout.tsx`/`AppRouter.tsx`/`InstallerDashboard`/`AdminPanel`, y el HTML oficial (`Multimax_Despacho_v1.3.html`, `App()` línea ~1897-2125). Se detectaron discrepancias reales entre el brief y la arquitectura existente, reportadas al usuario vía `AskUserQuestion` (dos preguntas) **antes de escribir ningún código**:

1. **El mecanismo que pide el brief ("ampliar `allowedRoles`, no inventar UI") no alcanza por sí solo.** Ni el HTML oficial (`App()`, `role === 'coord' | 'inst' | 'admin'`, línea ~2111) ni `RootLayout.tsx` (antes de este Sprint) tienen un `RoleGate`/`allowedRoles` genérico — ambos renderizan Coordinador/Instalador/Admin como 3 ramas mutuamente excluyentes, nunca dos a la vez. El único precedente real del HTML de "ver todo con una sola sesión" era el selector manual `.mx-roleswitch`/`HeaderRoleSwitch` (botones que hacían `setRole(...)`, visible para cualquiera), retirado a propósito en el Sprint 4.2.1 por no representar permisos reales. Ampliar un array de roles permitidos no crea, por sí mismo, la capacidad de alternar entre las 3 ramas dentro de la misma sesión — hace falta un estado nuevo. **Decisión del usuario (aprobada, con precisión adicional)**: agregar un selector temporal de modo, exclusivo de `admin`, que cambia únicamente la interfaz renderizada, sin tocar `profile.rol`/Auth/Supabase/RLS.
2. **Tres ítems del checklist del brief no tienen equivalente real**: "Publicar Trabajo" es un modal (`PublishModal`, ya disparable desde la vista Coordinador), no una página propia. "Ofertas" no existe con ese nombre — la pestaña real de `InstallerDashboard` es "Solicitudes" (`instTab === 'solicitudes'`). "Asignaciones" no existe en absoluto todavía — reservada para el futuro Sprint 5.4 ("Asignación de Instaladores"), excluida a propósito del Sprint 5.1. **Decisión (por defecto, opción recomendada, no objetada por el usuario)**: reinterpretar los dos primeros contra lo real y documentar "Asignaciones" como no validable este Sprint.

Auditoría adicional, no bloqueante pero relevante para el alcance real de este Sprint (ver §6): se verificó `src/types/perfil.ts` — `Perfil.tiendaId` es `null` por diseño para `admins`/`instaladores` (solo `coordinadores` tiene `tienda_id`, 1:1). Esto tiene una consecuencia funcional real sobre la vista "Coordinador" en modo superusuario, documentada en §6.

## 2. Mecanismo implementado

- `RootLayout.tsx`: nuevo estado `adminVista: 'administracion' | 'coordinador' | 'instalador'` (default `'administracion'`), declarado como Hook incondicional junto al resto (respeta la corrección de Rules of Hooks de la ronda anterior). Solo tiene efecto para `profile.rol === 'admin'` — inerte para `coordinador`/`instalador` (mismo criterio que `meId`, ya inerte para no-instaladores).
- Tres booleanos derivados (`showCoordinador`/`showInstalador`/`showAdminPanel`) reemplazan las comparaciones directas `role === '...'` que gateaban cada rama, ampliándolas exactamente con la condición `role === 'admin' && adminVista === '...'` — ningún componente nuevo por rama, ningún JSX duplicado.
- Nuevo `useEffect` (Hook incondicional, antes del `return` temprano) que sincroniza la URL con `adminVista` para un `admin` real: al entrar a la vista "Coordinador" navega a `/despacho` (reutilizando exactamente esas rutas, ya existentes desde el Sprint 5.1); al salir, vuelve a `/` para no dejar la URL de Coordinador mostrando contenido de Instalador/Administración.
- `AppRouter.tsx` — `CoordinatorIndexRedirect` se amplía de `profile?.rol === 'coordinador'` a `profile?.rol === 'coordinador' || profile?.rol === 'admin'`. Es seguro: este componente solo se monta cuando `RootLayout` ya decidió mostrar el `<Outlet/>` (`showCoordinador`), y para un `admin` real eso únicamente ocurre cuando ya eligió la vista "Coordinador" — no hay ningún caso en que un admin llegue hasta acá sin haberla elegido. No se crea ninguna ruta nueva.
- `src/components/shared/admin-vista-switch.tsx` (NUEVO): único componente nuevo de este Sprint. Presentacional, sin estado propio, reutiliza `MxSubtabs`/`MxSubtabButton` (Sprint 3.3, sin ningún estilo/markup nuevo) — mismo patrón que `CoordinatorSubtabs` (Sprint 5.1). Es, por necesidad, nuevo: no existe ningún equivalente reconstruible en el HTML oficial (ver auditoría, punto 1); se documenta con trazabilidad completa en su propio JSDoc en vez de fabricarse en silencio.
- El selector (mas una `Badge tone="amber"` con el texto "Modo temporal · MVP", reutilizando el componente `Badge` ya existente) se monta en `RootLayout.tsx`, dentro de `<main>`, únicamente cuando `role === 'admin'` — visible para cualquier vista que el admin elija.

## 3. Componentes/archivos nuevos

- `src/components/shared/admin-vista-switch.tsx` — único archivo nuevo.

## 4. Componentes reutilizados (sin modificar)

`MxSubtabs`/`MxSubtabButton` (Sprint 3.3), `Badge` (Fase 3), `DespachoPage`/`TrabajosPage`/`TrabajoDetailPage`/rutas `/despacho`/`/trabajos`/`/trabajos/:id` (Sprint 5.1), `InstallerDashboard`/`CountRing` (Sprint 3.8/3.10), `AdminPanel`/`MasterCalendar`/`AdminInstaladores` (Sprint 3.13/3.14), `PublishModal`/`ConfirmCancelDialog` (Sprint 3.5/3.15). Ninguno se duplicó ni se creó una versión "Admin" de ninguno.

## 5. Componentes/archivos modificados

- `src/layouts/RootLayout.tsx` — estado `adminVista`, 1 `useEffect` nuevo de sincronización de URL, 3 booleanos derivados (`showCoordinador`/`showInstalador`/`showAdminPanel`) reemplazando las comparaciones directas de rol en el JSX, montaje condicional de `AdminVistaSwitch`+`Badge`. Ninguna lógica de Auth/Supabase/RLS tocada.
- `src/routes/AppRouter.tsx` — `CoordinatorIndexRedirect` ampliado a `admin` (ver §2). Ninguna ruta nueva creada.

## 6. Limitación real encontrada, no corregida en este Sprint (por alcance)

Al usar la vista "Coordinador" en modo superusuario, un `admin` real llega a `/despacho`/`/trabajos` (las páginas montan correctamente, sin error de render), pero **`DespachoPage`/`TrabajosPage` dependen de `profile.tiendaId`** (`getCoordinatorKpis(tiendaId)`/`getTrabajosByTienda(tiendaId)`) para mostrar datos reales — y `Perfil.tiendaId` es `null` por diseño para `admins` (`src/types/perfil.ts`, confirmado contra el schema real: solo `coordinadores` tiene `tienda_id`). En la práctica, el admin verá el mismo mensaje ya existente "Tu perfil de coordinador no tiene una tienda asignada" en vez de KPIs/Cola de Trabajos reales — el mismo mensaje que ve hoy cualquier coordinador sin tienda asignada, no un error nuevo introducido por este Sprint.

**No se corrigió** porque hacerlo requeriría modificar `dashboard.service.ts`/la lógica de scoping del Coordinador (p. ej. una consulta alternativa "por empresa" para admins) — explícitamente fuera de alcance de este Sprint ("NO modifica la lógica del Coordinador", "Únicamente debe ampliarse el acceso de navegación"). El `Radar`/`LiveCountdown`/`CoordinatorEmptyState`/`SucursalSelect`/`CoordinatorSubtabs` de `DespachoPage` sí se ven con normalidad (son props de demostración fijas, no dependen de `tiendaId`).

La vista "Instalador" en modo superusuario **no tiene esta limitación**: `InstallerDashboard`/`InstallerJobs`/`InstallerProfile`/`InstallerSolicitudesEmptyState` son 100% presentacionales/mock (ninguno llama a `useAuth()`/Supabase todavía, ver Sprint 3.10-3.12) — se ven exactamente igual para un admin que para un instalador real.

## 7. Ítems del checklist del brief reinterpretados contra lo real

- **"Publicar Trabajo"**: validado como el `PublishModal` ya existente, abierto desde el botón dentro de `DespachoPage` (vista Coordinador) — no es una página nueva.
- **"Ofertas"**: validado como la pestaña real "Solicitudes" (`instTab === 'solicitudes'`) de `InstallerDashboard` — no existe una pestaña llamada "Ofertas".
- **"Asignaciones"**: **no validable este Sprint** — no existe ninguna funcionalidad de asignación de instaladores implementada todavía (reservada para el Sprint 5.4). No se inventó ninguna pantalla/ruta para poder marcar este ítem.
- **"Administración"**: no es una tercera pantalla distinta de "Calendario Maestro"/"Instaladores" — `AdminPanel` (ya existente, Sprint 3.13) es la raíz que ya contiene esas 2 sub-tabs; la vista "Administración" del selector monta exactamente ese mismo `AdminPanel`, sin cambios.

## 8. Validación técnica realizada

`tsc --noEmit` (instalación global) sobre `RootLayout.tsx`/`AppRouter.tsx`/`admin-vista-switch.tsx`: los únicos diagnósticos son del mismo patrón de artefactos de entorno ya clasificado en Sprints anteriores (`TS2307` por falta real de `node_modules`, y sus cascadas `TS2875`/`TS7026`/`TS2322`) — verificado cruzando contra archivos ya aprobados que usan el mismo patrón (`coordinator-subtabs.tsx` produce el mismo `TS2322` sobre `MxSubtabButton`; `TrabajoDetailPage.tsx` produce el mismo `TS2322` sobre `Badge`). No aparece ningún `TS6133` (import/variable sin usar), ningún error de sintaxis (`TS1005`/`TS1128`/`TS1109`), ni ningún diagnóstico nuevo atribuible a este Sprint. Revisión manual confirma que los Hooks de `RootLayout.tsx` (`useAuth`, `useNavigate`, `useLocation`, 5× `useState`, 2× `useEffect`, `useMemo`) siguen todos antes del `return` condicional, en el mismo orden en cada render — no se reintrodujo el bug de Rules of Hooks corregido en la ronda anterior.

`npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` reales quedan pendientes de ejecución y reporte por parte del usuario en su propio entorno — este entorno de trabajo no tiene `node_modules`/acceso de red para ejecutarlos.

## 9. Confirmación de que no se rompió ningún Sprint anterior

- `coordinador`/`instalador` reales: `showCoordinador`/`showInstalador` son `true` exactamente en los mismos casos que antes (`role === '...'` directo) más el caso nuevo de `admin`+`adminVista` — ningún cambio de comportamiento para esos dos roles.
- `RootLayoutOutletContext`, `DespachoPage`/`TrabajosPage`/`TrabajoDetailPage`, `PublishModal`/`ConfirmCancelDialog`: sin cambios.
- Corrección de Rules of Hooks de la ronda anterior: preservada (ver §8).
- Ninguna migración, política RLS, o llamada de autenticación fue tocada.

## 10. Próximos pasos recomendados (entrega original)

- Ejecutar en el entorno del usuario `npm run lint && npm run typecheck && npm run build && npm run dev`, y validar visualmente el selector con una cuenta `admin` real.
- Cuando el MVP sea aprobado: eliminar `adminVista`, el `useEffect` de sincronización, `AdminVistaSwitch`, y revertir `CoordinatorIndexRedirect` a su condición original — ver nota de eliminación futura en `PROJECT_STATUS.md`.
- Si se desea que la vista "Coordinador" en modo superusuario muestre datos reales (no el mensaje "sin tienda asignada"), se requiere una decisión de producto explícita sobre qué tienda/alcance debería ver un admin ahí (¿todas las tiendas de su empresa? ¿un selector de tienda adicional?) — fuera de alcance de este Sprint, reportado en §6.

---

## 11. Ajuste final (mismo Sprint 5.1.1) — resuelve la limitación de §6 con un Contexto Operativo real

El usuario proveyó la decisión de producto que §10 pedía como pendiente: mientras el MVP administra una sola empresa (Multimax), el `admin` en modo "Coordinador" opera sobre el contexto real de esa empresa (tabla `empresas`, **no** `profile.empresaId` del admin — instrucción explícita) y sobre la sucursal ya elegida en `SucursalSelect`. Además, pidió, como recomendación arquitectónica obligatoria, no repetir `role === 'admin' && adminVista === 'coordinador'` en cada página futura, sino crear una única abstracción reutilizable.

### 11.1 Auditoría previa de este ajuste

Antes de escribir código se verificó contra la fuente real (no se asumió nada):

- `src/types/perfil.ts` confirma `Perfil.tiendaId: string | null` — `null` por diseño para `admins`/`instaladores` (solo `coordinadores` tiene `tienda_id`, 1:1).
- `SucursalSelect`/`sucursalCoord` (`src/constants/index.ts`, `SUCURSALES`) es una lista de **strings literales** (nombres, ej. "Multiplaza"), **no** IDs reales de base de datos — confirmado también en el seam ya documentado en `SPRINT_5_1_COORDINATOR_REPORT.md §7`.
- **Discrepancia real detectada**: `supabase/migrations/0001_initial_schema.sql` define una tabla `sucursales` (con columnas `id`/`empresa_id`/`nombre`/`provincia`/`direccion`/`activa`) — pero esa migración quedó **superada** por la Auditoría de Sincronización de Base de Datos (Sprint 4.0.2) y la infraestructura de Sprint 4.1.1: el schema real, confirmado contra el `pg_dump` de Producción (`src/types/database.generated.ts`, `src/lib/supabase/config.ts` → `TABLES.tiendas`), usa el nombre **`tiendas`**, no `sucursales`. Se verificó `database.generated.ts` directamente: `tiendas` tiene `id`/`empresa_id`/`nombre`/`provincia`/`direccion`/`activa`/`zona`, con `empresa_id` como FK real a `empresas`. Este ajuste usa `tiendas`/`tiendasRepository` (ya existente, Sprint 4.1.1) — **no** `sucursales`/una tabla nueva.
- `empresas.slug` es `UNIQUE` (`empresas.repository.ts`, `getBySlug` ya existía). `supabase/seed.sql §1` confirma el valor real: `INSERT INTO empresas (nombre, slug) VALUES ('Multimax', 'multimax')`. `supabase/seed.sql §2` confirma que las 9 filas reales de `tiendas` (mismos nombres que `SUCURSALES`) están todas ligadas a esa misma empresa.

Con esto confirmado, no hizo falta ninguna pregunta adicional al usuario — la decisión de producto (empresa fija "Multimax", sucursal = selector existente) ya estaba dada, y la fuente real (`empresas`/`tiendas`) ya existía y alcanzaba para implementarla sin inventar nada.

### 11.2 Abstracción nueva — "Contexto Operativo"

- `src/providers/operational-context.context.ts` (NUEVO) — `OperationalContext` (React Context crudo) + tipos `ModoVisualizacion`/`OperationalContextValue` (`modo`, `esSuperusuario`, `empresaId`, `empresaNombre`, `tiendaId`, `tiendaNombre`, `loading`, `error`).
- `src/providers/OperationalContextProvider.tsx` (NUEVO) — resuelve el valor de dos formas: (a) síncrona, directo desde `profile` (`useAuth()`), para Coordinador/Instalador reales o `admin` en "Administración"/"Instalador"; (b) asíncrona, vía `resolveSuperusuarioTienda(sucursalCoord)`, **únicamente** cuando `esSuperusuario && modo === 'coordinador'` (regla temporal pedida explícitamente por el usuario).
- `src/services/operational-context.service.ts` (NUEVO) — `resolveSuperusuarioTienda(sucursalNombre)`: consulta real `empresasRepository.getBySlug(EMPRESA_MVP_SLUG)` y, con esa `empresa.id`, `tiendasRepository.getByEmpresaId(...)`, buscando la fila cuyo `nombre` coincide con la sucursal elegida. Ninguna llamada nueva a Supabase-Auth/RLS/policies — reutiliza `empresasRepository`/`tiendasRepository`, ya existentes desde Sprint 4.1.1, sin modificarlos.
- `src/hooks/useOperationalContext.ts` (NUEVO) — hook público, mismo patrón que `useAuth()`/`useSession()` (lanza si se usa fuera del Provider).
- `src/constants/index.ts` — nueva constante `EMPRESA_MVP_SLUG = 'multimax'` (el slug real, no un UUID, no un mock — ver su JSDoc).
- `src/layouts/RootLayout.tsx` — envuelve todo su árbol con `<OperationalContextProvider modo={modo} sucursalCoord={sucursalCoord}>`, donde `modo = role === 'admin' ? adminVista : role`.
- `src/pages/coordinator/DespachoPage.tsx`/`TrabajosPage.tsx` — ya no llaman a `useAuth()` para `tiendaId`/`tiendaNombre`; consumen `useOperationalContext()`. Para un Coordinador real el valor es idéntico y síncrono (cero cambio de comportamiento). Se agregó manejo de `loading`/`error` del contexto (ver 11.3).

Las páginas **no conocen** cómo se resuelve el valor -- ninguna referencia a `adminVista`/`role === 'admin'`/`sucursalCoord` dentro de `DespachoPage`/`TrabajosPage` para este propósito; toda esa decisión vive únicamente dentro de `OperationalContextProvider`.

### 11.3 Comportamiento resultante

- **Coordinador real**: sin cambios -- mismo `tiendaId`/`tiendaNombre` de siempre, `loading`/`error` del contexto siempre `false`/`null`.
- **Instalador real, o `admin` en "Administración"/"Instalador"**: sin cambios visibles -- ninguno de los dos usa `tiendaId` hoy.
- **`admin` en "Coordinador"** (el caso corregido): al entrar, `loading` es `true` brevemente (consulta real a `empresas`+`tiendas`); luego `tiendaId`/`tiendaNombre` quedan resueltos a la fila real de `tiendas` que coincide con la sucursal elegida en el selector, y `DespachoPage`/`TrabajosPage` cargan KPIs/lista de trabajos reales de esa tienda, en vez de mostrar "Tu perfil de coordinador no tiene una tienda asignada". Si el usuario cambia de sucursal en el selector, se re-resuelve automáticamente (mismo criterio, sin recargar la página). Si la empresa "Multimax" o la sucursal elegida no existen todavía en las tablas reales, se muestra un mensaje de error real y específico (nunca una pantalla en blanco ni un dato inventado).

### 11.4 Validación técnica de este ajuste

`tsc --noEmit` (instalación global) sobre los 9 archivos nuevos/modificados de este ajuste (`operational-context.context.ts`, `OperationalContextProvider.tsx`, `useOperationalContext.ts`, `operational-context.service.ts`, `RootLayout.tsx`, `DespachoPage.tsx`, `TrabajosPage.tsx`, `constants/index.ts`, `services/index.ts`/`providers/index.ts`/`hooks/index.ts`): únicamente el mismo patrón de artefactos de entorno ya clasificado (`TS2307`/`TS2875`/`TS7026`/`TS2322`/`TS7006`, éste último ya presente en `TrabajosPage.tsx` desde el Sprint 5.1 original, sin relación con este ajuste). Sin `TS6133` (import/variable sin usar), sin errores de sintaxis, sin diagnósticos nuevos no clasificados. `npm run lint`/`typecheck`/`build`/`dev` reales quedan, otra vez, pendientes de ejecución por el usuario en su propio entorno.

### 11.5 Confirmaciones pedidas por el checklist de este ajuste

1. El flujo del Coordinador ahora funciona para el Administrador (modo Coordinador) **sin depender de `profile.tiendaId`** -- confirmado: `DespachoPage`/`TrabajosPage` ya no leen `profile.tiendaId` en absoluto, leen `tiendaId` de `useOperationalContext()`, resuelto por `resolveSuperusuarioTienda()` para este caso.
2. Un Coordinador real **continúa utilizando, en la práctica, el mismo `profile.tiendaId`/`profile.empresaId`/`profile.tiendaNombre`/`profile.empresaNombre`** -- ahora leídos indirectamente a través de `OperationalContextProvider` (que para este caso los reexpone tal cual, sin transformarlos), no directamente vía `useAuth()` en cada página. El dato de origen y su valor no cambiaron.
3. **No se modificó**: Auth (`AuthProvider`/`SessionProvider`/`auth.service.ts`), Roles (`profile.rol` nunca se escribe), Supabase (`supabase.service.ts`/`getClient()`), Policies/RLS (ninguna migración tocada), ni las rutas ya existentes (`AppRouter.tsx` no cambió en este ajuste).
4. **Ninguna funcionalidad de Coordinador/Instalador real fue duplicada**: `dashboard.service.ts`/`trabajosRepository` sin cambios; `DespachoPage`/`TrabajosPage` siguen siendo las mismas dos páginas, sin ninguna versión "Admin" nueva.
