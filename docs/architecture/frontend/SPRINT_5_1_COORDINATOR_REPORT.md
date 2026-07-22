# Sprint 5.1 — Dashboard y Vista Operativa del Coordinador

Fase 5 ("Flujo Operativo"), primer Sprint. Estado: 🟡 En revisión — implementación completa, pendiente de validación real del usuario (`npm run lint/typecheck/build/dev` + validación visual/funcional contra Producción).

## 0. Nota de traza sobre el entorno de esta ronda

Este entorno de trabajo no tiene `node_modules/` ni acceso de red al proyecto real de Supabase (mismas limitaciones ya documentadas en `SPRINT_4_2_1_AUTH_REPORT.md §0`). La verificación de tipos se hizo con el mismo método ya establecido: un `tsc` global (`/home/claude/.npm-global/bin/tsc`, TypeScript 6.0.3, no forma parte de las dependencias del proyecto) corriendo `tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0` sobre todo `src/`, filtrando los diagnósticos a los archivos tocados por este Sprint y clasificando cada uno como error real o artefacto de la falta de `node_modules` (comparando contra el mismo tipo de diagnóstico en archivos ya aprobados, no tocados en este Sprint). Se encontraron y corrigieron 6 errores reales (`TS18047`, acceso a `profile` sin narrowing en `DespachoPage.tsx`/`TrabajosPage.tsx`); el resto de los diagnósticos restantes en archivos tocados (`TS2307`/`TS2875`/`TS7026`/`TS7006`/`TS2322` sobre `BadgeProps`/`MxSubtabButtonProps`) son artefactos confirmados -- el mismo patrón exacto aparece en archivos ya aprobados (`installer-jobs.tsx`, `master-calendar.tsx`, `admin-instaladores.tsx`, `header-status.tsx`) bajo la misma invocación.

No se ejecutó `npm run lint`/`build`/`dev` real (sin `node_modules`), ni se probó contra la base de datos real de Producción (sin acceso de red) -- ambos quedan como pendiente explícito del usuario, igual que en Sprints anteriores.

## 1. Auditoría previa obligatoria (antes de escribir código)

El brief de este Sprint exige, antes de cualquier implementación, comparar el layout actual del Coordinador contra `Multimax_Despacho_v1.3.html` (ubicado en este entorno en `/root/.claude/uploads/.../7bbb21e9-Multimax_Despacho_v1.3.html`, subido en una sesión anterior) y documentar diferencias/componentes completados/reutilizados/decisiones. Se hizo esa auditoría completa antes de tocar un solo archivo de `src/`, y se detectaron **3 discrepancias reales** entre el brief y el diseño oficial. Por la regla permanente del proyecto ("cuando un brief conflictúa con la realidad, detenerse y reportar, no fabricar"), se presentaron las 3 al usuario vía `AskUserQuestion` (2 rondas) antes de escribir ningún código, con evidencia concreta de cada una. A continuación, el detalle completo.

### 1.1 Discrepancia 1 — Sidebar

El brief (Entregable 2) pide un Sidebar lateral con Dashboard/Trabajos/Calendario/Instaladores/Perfil/Cerrar sesión. Evidencia recogida: `grep -in "sidebar|mx-side|<aside|mx-nav|mx-menu"` sobre el HTML completo → **0 coincidencias**. La navegación real de `App()` para `role === "coord"` es `.mx-subtabs-wrap`/`.mx-subtabs` (dos botones planos, "Despacho en vivo"/"Mis trabajos", líneas 2079-2095 del HTML), ya reconstruida como `MxSubtabs`/`MxSubtabButton` desde el Sprint 3.3 -- pero nunca conectada a navegación real (`RootLayout.tsx` los montaba como literales fijos, sin `onClick`).

**Decisión del usuario** (verbatim, primera ronda): *"Reutilizá la navegación oficial del HTML. No construyas un Sidebar nuevo. [...] No inventar un Sidebar porque rompería la fidelidad del proyecto."*

**Resuelto así**: se construyó `CoordinatorSubtabs` (nuevo), que conecta `MxSubtabs`/`MxSubtabButton` a rutas reales de React Router (`/despacho`/`/trabajos`) vía `useLocation`/`useNavigate` — sin tocar `MxSubtabs`/`MxSubtabButton` en sí (siguen siendo puros, sin estado propio, y `AdminPanel` los sigue usando con su propio `useState` local, sin cambios).

### 1.2 Discrepancia 2 — Dashboard con KPIs

El brief (Entregable 4) pide una pantalla "Dashboard Principal" con KPIs agregados (trabajos pendientes/activos/finalizados/programados hoy), alimentada por un `dashboard.service.ts` explícitamente nombrado. Evidencia recogida: el Coordinador en el HTML oficial solo tiene dos pantallas reales -- `Coordinator()` ("Despacho en vivo", radar de UN trabajo activo con sus propios indicadores de esa ronda de bid) y `CoordinatorJobs()` ("Mis trabajos", lista filtrable). Ninguna de las dos es un dashboard de KPIs agregados sobre el total de trabajos de la tienda; no existe tal pantalla en ningún lugar del HTML.

**Decisión del usuario** (verbatim, segunda ronda, tras confirmar que se mantenía la prioridad de fidelidad): *"No crear una pantalla nueva llamada 'Dashboard' porque no existe en el HTML oficial. El Sprint 5.1 debe reutilizar la vista oficial 'Despacho en vivo' como pantalla principal del Coordinador. Los KPIs solicitados por el brief deberán integrarse dentro de esa misma vista oficial, ubicados en la parte superior del contenido, respetando el diseño visual existente y sin modificar la estructura general."*

**Resuelto así**: `CoordinatorKpiRow` (nuevo) se monta como primer elemento de `DespachoPage` (la vista real de "Despacho en vivo"), reutilizando `StatGrid`/`StatTile` (`.mx-stats`/`.mx-stat`, ya portados desde Fase 3 para los "Indicadores" del propio `Coordinator()`) — ningún estilo/clase nueva, ninguna pantalla nueva.

### 1.3 Discrepancia 3 — Calendario / Instaladores en el menú del Coordinador

El brief (Entregable 2, ejemplo de menú) lista "Calendario"/"Instaladores" como entradas del Coordinador. Evidencia recogida: en el HTML oficial, `MasterCalendar` solo se monta cuando `CoordinatorJobs({isMaster: true})` -- y `isMaster` es una prop fija en `false` para el Coordinador real (`App()`, rama `role === "coord"`); el calendario real es exclusivo de `AdminPanel`. La gestión de instaladores (`AdminInstaladores`) también es exclusiva de Admin. Además, el propio brief de este Sprint lista explícitamente "Gestión de Instaladores" en su sección "NO desarrollar todavía" -- contradiciendo pedirla en el menú del Coordinador dos secciones antes.

**Decisión del usuario**: confirmada implícitamente en el cierre de su respuesta a la primera ronda de preguntas (*"Si durante el Sprint aparecen nuevas vistas (Perfil, Calendario, etc.), se integrarán posteriormente siguiendo la misma navegación oficial o la arquitectura que definamos cuando realmente sea necesaria"*) -- se omiten ambas de este Sprint.

**Resuelto así**: `CoordinatorSubtabs` solo tiene 2 entradas ("Despacho en vivo"/"Mis trabajos"), igual que el HTML oficial. "Perfil"/"Calendario"/"Instaladores" para el Coordinador quedan pendientes de una decisión de producto futura, sin fecha asignada.

## 2. Arquitectura implementada

`ARCHITECTURE.md §8` ya planificaba, desde Fase 2, las rutas `/despacho`/`/trabajos`/`/trabajos/:id` para el Coordinador -- nunca implementadas hasta este Sprint (§14.9 lo confirmaba explícitamente: "el resto de la tabla de §8 [...] sigue sin implementar"). Este Sprint las implementa por primera vez, sin inventar rutas nuevas fuera de esa planificación.

```
/                    CoordinatorIndexRedirect  (redirige a /despacho si role === 'coordinador')
/despacho            DespachoPage              ("Despacho en vivo" + KPIs)
/trabajos            TrabajosPage              ("Cola de Trabajos" / "Mis trabajos")
/trabajos/:id        TrabajoDetailPage         (detalle de un trabajo)
```

Todas cuelgan de `RootLayout` (sin cambios en su rol de shell -- Header/Footer/`PublishModal`/`ConfirmCancelDialog` siguen ahí, compartidos). El bloque `role === 'coordinador'` de `RootLayout`, que antes renderizaba contenido inline, ahora renderiza `<Outlet context={...}/>` -- las 3 páginas nuevas reciben `sucursalCoord`/`setSucursalCoord`/`onOpenPublish`/`onOpenConfirmCancel` vía `useOutletContext<RootLayoutOutletContext>()` (tipo nuevo, exportado desde `RootLayout.tsx`), no vía Context de React (ese estado es exclusivo de este árbol de rutas, no global). `role === 'instalador'`/`role === 'admin'` no se tocaron -- siguen renderizando inline, sin rutas propias (fuera de alcance de este Sprint).

Capas respetadas (Entregable 8): `pages/coordinator/*` (presentación) → `services/dashboard.service.ts` (agregados/orquestación) → `repositories/trabajos.repository.ts` (acceso tipado, Sprint 4.1.1, sin cambios) → Supabase real. Ningún componente nuevo tiene un array de datos hardcodeado -- todos los datos llegan vía `dashboard.service.ts`.

## 3. Componentes/archivos nuevos

- `src/services/dashboard.service.ts` — `getCoordinatorKpis(tiendaId)`, `getTrabajosByTienda(tiendaId)`, `getTrabajoDetalle(id)`. No es un mock: consulta `trabajos` real vía `trabajosRepository`, ya con policies RLS reales para coordinadores (`docs/database/DATABASE_INVENTORY.md §2.6`, policy "coordinadores ven trabajos de su tienda o de su empresa si admin"). El filtrado por estado (chips de `TrabajosPage`) se hace en cliente sobre el mismo resultado, igual que `CoordinatorJobs()` en el HTML fuente.
- `src/components/shared/coordinator-kpi-row.tsx` — `CoordinatorKpiRow`, 4 `StatTile` (pendientes/activos/finalizados/programados hoy).
- `src/components/shared/coordinator-subtabs.tsx` — `CoordinatorSubtabs`, ver §1.1/§2.
- `src/components/shared/trabajo-row.tsx` — `TrabajoRow`, una fila de "Cola de Trabajos".
- `src/pages/coordinator/DespachoPage.tsx` — ruta `/despacho`.
- `src/pages/coordinator/TrabajosPage.tsx` — ruta `/trabajos`.
- `src/pages/coordinator/TrabajoDetailPage.tsx` — ruta `/trabajos/:id`.

## 4. Componentes reutilizados (sin modificar)

`MxSubtabs`/`MxSubtabButton` (Sprint 3.3), `SucursalSelect` (Sprint 3.4), `CoordinatorEmptyState` (Sprint 3.6), `Radar` (Sprint 3.7), `LiveCountdown` (Sprint 3.9), `ConfirmCancelDialog`/`PublishModal` (Sprints 3.15/3.5, sin cambios de posición ni lógica), `StatGrid`/`StatTile` (Fase 3), `Badge`/`Card`/`Button`/`Loading`/`EmptyState` (Fase 3), `trabajosRepository`/`instaladoresRepository` (Sprint 4.1.1), `useAuth()` (Sprint 4.2.1).

## 5. Componentes completados / reubicados

`CoordinatorEmptyState`/`Radar`/`LiveCountdown` y el botón "Cancelar" vivían como integración temporal inline en `RootLayout.tsx` desde los Sprints 3.6/3.7/3.9/3.15 (documentado extensamente en su JSDoc histórico, conservado íntegro en el archivo). Este Sprint los **reubica verbatim** a `DespachoPage.tsx` -- mismos componentes, mismas props mock, mismo orden visual, cero cambios de comportamiento -- para que puedan vivir detrás de una ruta real en vez de una rama de `role` sin URL propia. No se conectan a datos reales de un trabajo activo: eso requiere el motor de "Flujo de Ofertas" (bids en tiempo real, radar dinámico), explícitamente reservado para el Sprint 5.3 por el propio brief de este Sprint ("NO desarrollar todavía: [...] Flujo de Ofertas").

`.mx-jobrow-side`/`.mx-jobrow-price`/`.mx-chevr` (pendientes desde el Sprint 3.14, documentado en su momento como "pertenecen a `CoordinatorJobs()`, sin Sprint asignado") y `.mx-jobfilter`/`.mx-detail-grid`/`.mx-kv*`/`.mx-timeline`/`.mx-tl*`/`.mx-detailacts` (pendientes desde el Sprint 3.10, "`.mx-detail-grid` (Coordinator, no construido todavía)") se portaron verbatim del `<style>` del HTML fuente en este Sprint -- primera vez que tienen un consumidor real.

## 6. Vocabulario de `trabajos.estado` — inferido, no verificado

`trabajos.estado` en Producción es `text` libre, sin CHECK ni ENUM (`docs/database/DATABASE_INVENTORY.md §2.6`: "0 tipos ENUM personalizados en `public`"), con default `'live'` (confirmado). Los otros 3 valores usados por este Sprint (`assigned`/`completed`/`cancelled`) se **infieren** del modelo `job.phase` del prototipo original (`CHECK (phase IN ('live','assigned','completed','cancelled'))`, schema legacy) porque ningún archivo de este repositorio documenta el cuerpo SQL de `asignar_instalador()`/`set_bid_cierra_at()` (las únicas funciones reales que escriben esa columna). No se puede confirmar el vocabulario exacto sin ejecutar `SELECT DISTINCT estado FROM trabajos` contra Producción real -- bloqueado en este entorno (sin red).

`trabajoEstadoInfo()` (`src/constants/index.ts`) es defensiva por diseño: si `estado` no es una de las 4 claves conocidas, no lo oculta ni lo reclasifica -- devuelve un tono `muted` con el valor crudo. Ningún trabajo queda invisible por un valor de `estado` inesperado, pero los conteos de KPIs (`pendientes`/`activos`/`finalizados`) podrían no capturar un trabajo cuyo `estado` real use otro vocabulario. **Recomendación explícita**: correr `SELECT DISTINCT estado FROM trabajos` contra Producción antes de confiar en los KPIs para una decisión operativa real.

## 7. Seam documentado — `sucursalCoord` (demo) vs. `tiendaId` (real)

`SucursalSelect`/`sucursalCoord` (Sprint 3.4) es un selector manual pre-Auth, todavía usado por `PublishModal` (sin lógica real de publicación, Sprint 5.2). Este Sprint usa, para los datos reales de `TrabajosPage`/KPIs, el `tienda_id` real del coordinador autenticado (`profile.tiendaId`, ya scoped por RLS) -- **no** el valor de `sucursalCoord`. El selector sigue visible (fidelidad visual) pero ya no filtra la lista de trabajos real. Esta dualidad queda documentada explícitamente como un seam a reconciliar cuando el Sprint 5.2 conecte `PublishModal` a la tabla `trabajos` real (en ese punto, `sucursalCoord` debería dejar de ser un string libre y pasar a ser el `tienda_id` real, o eliminarse en favor de mostrar directamente `profile.tiendaNombre`).

## 8. Validación técnica realizada

Ver §0. Resumen: 6 errores reales de TypeScript encontrados y corregidos (acceso a `profile` posiblemente `null` sin narrowing, en `DespachoPage.tsx`/`TrabajosPage.tsx` — resuelto con variables locales `tiendaId`/`tiendaNombre` derivadas con `?.`). Cero errores nuevos atribuibles a este Sprint en el resto de diagnósticos (todos son el mismo patrón de artefacto por falta de `node_modules` ya confirmado en Sprints anteriores). Sin `console.log`/`debugger`/código comentado muerto en los archivos nuevos (verificado con `grep`).

## 9. Qué NO se hizo en este Sprint (excluido explícitamente por el propio brief)

Motor de "Flujo de Ofertas" (radar/bids en tiempo real, Sprint 5.3), conexión real de `PublishModal` (Sprint 5.2, "Gestión de Trabajos, CRUD y persistencia"), Asignación de Instaladores (Sprint 5.4), Gestión de Empresas, Gestión de Instaladores, CRUD de Coordinadores, Notificaciones. Ningún archivo de `role === 'instalador'`/`role === 'admin'` se modificó. Ninguna funcionalidad de autenticación (Sprint 4.2.1) se modificó. Ninguna migración de base de datos se creó/modificó.

## 10. Próximos pasos recomendados

- Validación real del usuario: `npm run lint/typecheck/build/dev` + probar como coordinador autenticado contra Producción (login → `/despacho` automático → KPIs con datos reales de su tienda → navegar a `/trabajos` → abrir el detalle de un trabajo).
- Confirmar el vocabulario real de `trabajos.estado` (`SELECT DISTINCT estado FROM trabajos`) para verificar/ajustar `TRABAJO_ESTADO_INFO`.
- Sprint 5.2 ("Gestión de Trabajos, CRUD y persistencia"): conectar `PublishModal` a la tabla `trabajos` real, y en ese momento reconciliar el seam `sucursalCoord`/`tiendaId` documentado en §7.
- Sprint 5.3 ("Publicación de Trabajos, Subasta y Ofertas"): motor real de `Coordinator()` (`QueueBar`/`mx-jobcard`/`AssignedPanel`/`NoResponsePanel`/feed de respuestas) sobre `ofertas`/`trabajo_instaladores`.
- Sprint 5.4 ("Asignación de Instaladores").
- Decisión de producto pendiente (sin Sprint asignado): si el Coordinador debe tener acceso a "Perfil"/"Calendario"/alguna vista de instaladores, y bajo qué navegación (ver §1.3).
