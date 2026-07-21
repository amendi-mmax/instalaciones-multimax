# ARCHITECTURE.md — HANDYMAX · Multimax Despacho

> Fase 1 — Documento de arquitectura. Sin código de aplicación todavía.
> Fuente de verdad: `Multimax_Despacho_v1.3.html` (UX/flujo), `handymax_supabase_schema_v3.sql` (datos), `Handymax_Documentacion_Tecnica.pdf` (guía de integración).
> Última actualización: 2026-07-01 (Fase 1).

## 0. Cómo leer este documento

Este documento es la referencia arquitectónica que debe mantenerse consistente entre sesiones. Contiene: el árbol de proyecto, el inventario completo de componentes extraído del prototipo, los hooks/servicios/contextos necesarios, las rutas, los tipos TypeScript, las estrategias de integración con Supabase (Auth, Realtime, RLS), el plan de migración detallado del HTML, los riesgos técnicos identificados y el orden recomendado de implementación. Cualquier decisión arquitectónica nueva en sesiones futuras debe añadirse aquí, con su razón, en vez de reestructurar lo ya definido.

---

## 1. Resumen del sistema (según el prototipo)

HANDYMAX / Multimax Despacho es una plataforma de despacho de instaladores con tres roles:

- **Coordinador**: publica trabajos, ve un panel de despacho en vivo (radar + feed de respuestas), asigna instalador, gestiona historial de trabajos de su sucursal, ve el calendario maestro si es coordinador "master".
- **Instalador**: recibe solicitudes (simulado como un teléfono), acepta o rechaza, envía una propuesta (precio/fecha/hora/comentario), ve sus trabajos asignados/historial y su perfil.
- **Admin**: gestiona instaladores (activar/suspender, invitar) y ve el calendario maestro de todas las sucursales.

El modelo de negocio central es una **subasta de una sola ronda**: el coordinador publica un trabajo con un tiempo de bid (2/5/10 min), todos los instaladores elegibles de la zona son notificados simultáneamente, cada uno puede responder con una oferta dentro del tiempo, y el coordinador elige un ganador. Los datos del cliente (nombre/teléfono/dirección) solo se revelan al instalador ganador.

En el prototipo, todo esto corre en memoria de React con datos mock y un "motor de simulación" (`stepJobEngine` + objeto `SCRIPT`) que finge las respuestas de los instaladores. Esa simulación es exactamente lo que se sustituye por Supabase (Auth, Postgres, Realtime).

---

## 2. Stack y decisiones base

| Área | Decisión | Razón |
|---|---|---|
| Build | Vite + React 18 + TypeScript | Pedido explícito. Reemplaza el bundle UMD inline del prototipo. |
| Routing | React Router v6 | Rutas por rol, protegidas. |
| Server state | TanStack Query | Cachea queries a Supabase, maneja invalidación tras mutations e inserts realtime. |
| Forms | React Hook Form + Zod | Reemplaza los `useState` de formulario del prototipo (`PublishModal`, formulario de oferta del instalador, formulario de invitación de admin) con validación tipada. |
| Estilos | Tailwind CSS + shadcn/ui | Las variables CSS (`--ink`, `--ice`, `--amber`, etc.), tipografías (Space Grotesk/Inter/Space Mono) y animaciones (`mxspin`, `mxblink`, `mxsweep`, `mxping`, `mxpop`, `mxup`) se portan **tal cual** a `src/styles/globals.css` como `@layer base` + `@theme`/CSS vars de Tailwind. shadcn se usa para primitivas (Dialog, Select, Input, Button) pero el look final sigue siendo 100% el del prototipo vía className/estilos existentes — shadcn no impone su propio tema aquí. |
| Iconos | lucide-react | El prototipo ya usa paths estilo Lucide dibujados a mano (`mkIcon`). Se reemplaza `mkIcon`/`ICONS` por los componentes reales de `lucide-react` con el mismo `size`/`strokeWidth` (ver tabla de mapeo en §7.2). |
| Backend | Supabase (Auth, Postgres, Realtime, Storage no se usa aún) | Pedido explícito. Edge Functions solo para notificaciones (Twilio). |
| Data access | Capa `services/` con `@supabase/supabase-js` tipado, consumida por hooks de `features/*/hooks` vía TanStack Query | Separa "cómo hablamos con Supabase" de "qué hace cada pantalla". |

---

## 3. Árbol completo del proyecto

```
handymax-despacho/
├── ARCHITECTURE.md
├── PROJECT_STATUS.md
├── TODO.md
├── CHANGELOG.md
├── .env.example
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── supabase/
│   ├── README.md                            # flujo oficial de migraciones/seed (§9.8, Sprint 4.0.1 2ª ronda)
│   ├── seed.sql                             # datos iniciales (empresa Multimax + 9 sucursales) — §9.8
│   └── migrations/
│       ├── 0001_initial_schema.sql          # schema base (originalmente copia literal de handymax_supabase_schema_v3.sql;
│       │                                     # limpiado de datos/queries de verificación en Sprint 4.0.1 2ª ronda, §9.8 — ya no es una copia sin modificar)
│       └── 0002_auth_roles_rls.sql          # Fase 4, Sprint 4.0.1 1ª ronda — ENUMs, funciones, RLS ampliada (§9.7)
└── src/
    ├── main.tsx
    ├── App.tsx                             # <QueryClientProvider><AuthProvider><RouterProvider/></AuthProvider></QueryClientProvider>
    ├── routes/
    │   └── AppRouter.tsx                   # árbol de rutas + guards por rol (ver §8)
    ├── layouts/
    │   ├── RootLayout.tsx                  # mx-top (header, brand, badge de rol/sucursal — sin selector manual)
    │   ├── CoordinatorLayout.tsx           # mx-subtabs: Despacho en vivo / Mis trabajos
    │   ├── AdminLayout.tsx                 # mx-subtabs: Calendario maestro / Instaladores
    │   └── InstallerLayout.tsx             # mx-phone frame + mx-phonetabs + mx-instside
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── coordinator/
    │   │   ├── DespachoPage.tsx            # antes: Coordinator (vista despacho en vivo)
    │   │   ├── TrabajosPage.tsx            # antes: CoordinatorJobs (lista + filtro)
    │   │   └── TrabajoDetailPage.tsx       # antes: JobDetail
    │   ├── installer/
    │   │   ├── SolicitudesPage.tsx         # antes: Installer (tab "solicitudes")
    │   │   ├── MisTrabajosPage.tsx         # antes: InstallerJobs
    │   │   └── PerfilPage.tsx              # antes: InstallerProfile
    │   ├── admin/
    │   │   ├── CalendarioPage.tsx          # antes: MasterCalendar (vía AdminPanel)
    │   │   └── InstaladoresPage.tsx        # antes: AdminInstaladores
    │   └── NotFoundPage.tsx
    ├── features/
    │   ├── despacho/                       # panel de despacho en vivo del coordinador
    │   │   ├── components/
    │   │   │   ├── QueueBar.tsx            # antes: mx-qbar en Coordinator
    │   │   │   ├── JobCard.tsx             # antes: mx-jobcard-h + mx-jobtitle + mx-jobmeta
    │   │   │   ├── RadarPanel.tsx          # antes: Radar()
    │   │   │   ├── JobStatsGrid.tsx        # antes: StatTile x6 + mx-goal
    │   │   │   ├── ResponsesFeed.tsx       # antes: mx-feed + mx-sort
    │   │   │   ├── ResponseRow.tsx         # antes: mx-resp
    │   │   │   ├── AssignedPanel.tsx       # antes: AssignedPanel()
    │   │   │   └── NoResponsePanel.tsx     # antes: NoResponsePanel()
    │   │   └── hooks/
    │   │       ├── useActiveTrabajos.ts    # trabajos 'live'/'assigned' de la sucursal (o todas si master)
    │   │       ├── useTrabajoBidsRealtime.ts # suscripción realtime a bids del trabajo activo
    │   │       ├── useEligibleInstaladores.ts # instaladores por zona/provincia (para el radar)
    │   │       ├── useJobEngagementPresence.ts # Presence/Broadcast: estados "abrió"/"respondiendo" (ver §9.3)
    │   │       └── useSeleccionarInstalador.ts # mutation -> RPC seleccionar_instalador (ver §9.5)
    │   ├── publish-job/
    │   │   ├── components/
    │   │   │   └── PublishModal.tsx        # antes: PublishModal()
    │   │   ├── schema.ts                   # zod: publishJobSchema
    │   │   └── hooks/
    │   │       └── usePublishTrabajo.ts    # mutation -> INSERT trabajos
    │   ├── trabajos-historial/
    │   │   ├── components/
    │   │   │   ├── JobFilterBar.tsx        # antes: mx-jobfilter
    │   │   │   ├── JobList.tsx             # antes: mx-joblist
    │   │   │   ├── JobRow.tsx              # antes: mx-jobrow
    │   │   │   └── JobTimeline.tsx         # antes: mx-timeline dentro de JobDetail
    │   │   └── hooks/
    │   │       ├── useTrabajosHistorial.ts # trabajos de la sucursal, todas las fases
    │   │       └── useTrabajoDetail.ts
    │   ├── calendario-maestro/             # compartido por Coordinador-master y Admin
    │   │   ├── components/
    │   │   │   ├── CalendarGrid.tsx        # antes: grid de MasterCalendar
    │   │   │   ├── CalendarDayCell.tsx
    │   │   │   ├── CalendarLegend.tsx      # antes: leyenda SUSCOL
    │   │   │   └── CalendarDayJobs.tsx     # lista de trabajos del día seleccionado
    │   │   └── hooks/
    │   │       └── useTrabajosDelMes.ts
    │   ├── instalador-solicitudes/
    │   │   ├── components/
    │   │   │   ├── AlertScreen.tsx         # antes: step "alert"
    │   │   │   ├── OfferForm.tsx           # antes: step "offer"
    │   │   │   ├── DisponibilidadChips.tsx # antes: chips "Día disponible"
    │   │   │   ├── ResponseSentScreen.tsx  # antes: "Respuesta enviada"
    │   │   │   ├── AssignedScreen.tsx      # antes: isAssigned -> reveal
    │   │   │   ├── LostScreen.tsx
    │   │   │   ├── DeclinedScreen.tsx
    │   │   │   ├── ClosedScreen.tsx        # antes: phase !== 'live'
    │   │   │   └── EmptyStateScreen.tsx
    │   │   └── hooks/
    │   │       ├── useMiTrabajoActivo.ts   # trabajo 'live' visible para el instalador (RLS + zonas_cobertura)
    │   │       ├── useMiBidEnEsteTrabajo.ts
    │   │       ├── useEnviarBid.ts         # mutation -> INSERT bids
    │   │       ├── useDeclinarBid.ts       # mutation -> INSERT bids estado='rechazado'
    │   │       └── useReportarEngagement.ts # Presence/Broadcast (abrió / respondiendo)
    │   ├── instalador-trabajos/
    │   │   ├── components/
    │   │   │   ├── MisTrabajosList.tsx     # antes: InstallerJobs, agrupado Próximos/Historial
    │   │   │   └── MisTrabajoRow.tsx
    │   │   └── hooks/
    │   │       └── useMisTrabajos.ts       # bids propios + join trabajos_vista
    │   ├── instalador-perfil/
    │   │   ├── components/
    │   │   │   ├── ProfileHero.tsx
    │   │   │   ├── ProfileStats.tsx
    │   │   │   └── PriorityRulesCard.tsx   # antes: mx-rules (texto estático, sin datos)
    │   │   └── hooks/
    │   │       └── useMiPerfil.ts          # usuarios propio (rating, cumplimiento, aceptacion)
    │   ├── admin-instaladores/
    │   │   ├── components/
    │   │   │   ├── InstaladoresTable.tsx   # antes: mx-admintable
    │   │   │   ├── InstaladorRow.tsx       # antes: mx-adminrow
    │   │   │   └── InviteInstaladorForm.tsx # antes: mx-invite
    │   │   └── hooks/
    │   │       ├── useInstaladores.ts
    │   │       ├── useInviteInstalador.ts  # mutation -> supabase.auth.admin.inviteUserByEmail (vía Edge Function, ver §9.4)
    │   │       └── useToggleSuspension.ts  # mutation -> UPDATE usuarios.suspendido
    │   └── auth/
    │       ├── components/
    │       │   ├── LoginForm.tsx           # magic link (coordinador/admin)
    │       │   └── ProtectedRoute.tsx      # exige sesión + rol permitido
    │       └── hooks/
    │           └── useSession.ts
    ├── components/
    │   ├── ui/                             # primitivas shadcn (button, dialog, select, input, badge, ...)
    │   └── shared/
    │       ├── Pill.tsx                    # antes: Pill()
    │       ├── StatTile.tsx                # antes: StatTile()
    │       ├── CountRing.tsx               # antes: CountRing()
    │       ├── LiveCountdown.tsx           # antes: LiveCountdown()
    │       ├── ConfirmDialog.tsx           # antes: ConfirmCancel()
    │       └── PhoneFrame.tsx              # antes: mx-phone + mx-phone-bar wrapper reutilizable
    ├── hooks/                              # hooks genéricos, no atados a una feature
    │   ├── useCountdownSeconds.ts          # antes: lógica compartida por LiveCountdown/CountRing
    │   └── useRealtimeChannel.ts           # wrapper genérico sobre supabase.channel(...)
    ├── services/                           # única capa que llama a supabase-js
    │   ├── trabajos.service.ts
    │   ├── bids.service.ts
    │   ├── usuarios.service.ts
    │   ├── zonasCobertura.service.ts
    │   ├── sucursales.service.ts
    │   ├── empresas.service.ts
    │   ├── notificaciones.service.ts
    │   └── auth.service.ts
    ├── supabase/
    │   └── client.ts                       # createClient(url, anonKey) singleton
    ├── contexts/
    │   └── AuthContext.tsx                 # session + perfil (usuarios row) + rol + sucursal
    ├── types/
    │   ├── database.ts                     # tipos "crudos" 1:1 con el schema (snake_case)
    │   ├── domain.ts                       # modelos de dominio camelCase, fieles a los nombres del prototipo
    │   └── enums.ts                        # Rol, TrabajoPhase, BidEstado, NotificacionCanal, TipoInmueble
    ├── lib/
    │   ├── mappers.ts                      # database.ts <-> domain.ts
    │   ├── datetime.ts                     # antes: fmt(), buildTimeSlots(), getDateFor()
    │   └── radar.ts                        # antes: hashAngle() y geometría del radar
    ├── constants/
    │   ├── panamaGeo.ts                    # antes: PROVINCIAS, ZONAS (catálogo estático, no vive en la DB)
    │   ├── bidOptions.ts                   # antes: BID_OPTIONS
    │   ├── estadoUi.ts                     # antes: ESTADO (tone/label), ahora indexado por trabajos.phase + bids.estado
    │   └── sucursalColors.ts               # antes: SUSCOL
    ├── styles/
    │   └── globals.css                     # variables CSS, fuentes, keyframes portados 1:1 del prototipo
    └── assets/
```

---

## 4. Inventario de componentes (prototipo → React tipado)

Extraído por lectura completa del script de `Multimax_Despacho_v1.3.html` (líneas 765–3554). Cada fila indica el componente original, su reemplazo, y qué cambia (si algo cambia).

| Prototipo (función) | Nuevo componente/archivo | Notas de migración |
|---|---|---|
| `mkIcon`/`ICONS` | `lucide-react` | Mapeo 1:1 por nombre visual (ver §7.2). Mismo `size`, `strokeWidth=2`, `strokeLinecap/Linejoin=round`. |
| `Pill` | `components/ui/badge.tsx` (`Badge`) | Fusionado con Badge en Fase 3 — ver §13.1. Igual, tipado con `tone: 'muted'|'ice'|'amber'|'green'|'red'|'violet'`. |
| `StatTile` | `components/shared/StatTile.tsx` | Igual. |
| `CountRing` | `components/shared/CountRing.tsx` | Igual; `remaining`/`total` ahora derivan de `bid_cierra_at` real, no de simulación. |
| `Radar` | `features/despacho/components/RadarPanel.tsx` | Misma geometría SVG (`hashAngle`, círculos concéntricos, sweep). `instState` ahora viene de: (a) `eligibleIds` por query, (b) `bids` por Realtime, (c) presence/broadcast para "abrió"/"respondiendo" — ver §9.3. |
| `App()` | `App.tsx` + `AppRouter.tsx` + `AuthContext` | El enrutamiento por `if/else` sobre `role` se vuelve rutas de React Router protegidas por rol real de `usuarios.rol`. El **selector manual de rol** (`mx-roleswitch`) se elimina: se reemplaza por sesión autenticada (ver §9.6, cambio explícitamente pedido por REEMPLAZOS/AUTENTICACIÓN en las instrucciones). |
| `Coordinator` | `pages/coordinator/DespachoPage.tsx` (compone `QueueBar`, `JobCard`, `RadarPanel`, `JobStatsGrid`, `ResponsesFeed`) | Misma UI. `sucursalCoord` deja de ser un `<select>` libre: se fija a `usuarios.sucursal_id` del coordinador autenticado (o "todas" si es master — ver §11 riesgo "isMaster"). |
| `AssignedPanel` | `features/despacho/components/AssignedPanel.tsx` | Los datos `REVEAL` (dirección/cliente) pasan a venir de `trabajos_vista` para el `trabajo_id` activo. |
| `NoResponsePanel` | `features/despacho/components/NoResponsePanel.tsx` | Igual visualmente. Los botones de acción del prototipo no tenían `onClick` real; en Fase 5 se decide si se conectan (ver TODO). |
| `LiveCountdown` | `components/shared/LiveCountdown.tsx` | Igual; usa `bid_cierra_at` en vez de `publishedAt + bidMins`. |
| `PublishModal` | `features/publish-job/components/PublishModal.tsx` | Mismos campos exactos (ver §10.1). React Hook Form + Zod en vez de `useState` suelto. `sucursal` preseleccionada y no editable si el coordinador no es master. |
| `CoordinatorJobs` | `pages/coordinator/TrabajosPage.tsx` (+ `JobFilterBar`, `JobList`, `JobRow`) | La rama `isMaster -> MasterCalendar` se separa a nivel de ruta (ver riesgo §11). |
| `JobDetail` | `pages/coordinator/TrabajoDetailPage.tsx` + `JobTimeline.tsx` | Los botones de acción sin handler ("Contactar instalador", "Ver comprobante", "Duplicar trabajo") se documentan en TODO.md como pendientes de decisión de producto, no se inventan. |
| `MasterCalendar` | `features/calendario-maestro/*` usado por `pages/admin/CalendarioPage.tsx` y (si aplica) `pages/coordinator/TrabajosPage.tsx` en modo master | Misma UI de grid + dots + leyenda. Dots ahora por `trabajos.sucursal_id` agrupados por día vía query del mes visible. |
| `AdminPanel` | `layouts/AdminLayout.tsx` (subtabs) | Igual. |
| `AdminInstaladores` | `pages/admin/InstaladoresPage.tsx` (+ `InstaladoresTable`, `InviteInstaladorForm`) | `susp` local se vuelve `UPDATE usuarios SET suspendido=...`. El formulario de invitación llama a una Edge Function que usa `service_role` (nunca se expone en el cliente) para `auth.admin.inviteUserByEmail`. |
| `Installer` | `layouts/InstallerLayout.tsx` + `pages/installer/SolicitudesPage.tsx` + componentes de `features/instalador-solicitudes/*` | El **selector manual de instalador** (`mx-mesel`, dropdown para "actuar como" cualquier instalador) se elimina: cada instalador solo ve su propia sesión. Todo lo demás (fases alert/offer/done, chips de día, CountRing, reveal) se mantiene igual. |
| `InstallerJobs` | `pages/installer/MisTrabajosPage.tsx` + `MisTrabajosList` | Agrupado "Próximos"/"Historial" ahora derivado de `bids` propios + `trabajos_vista.phase`, no de `MISJOBS` mock. |
| `InstallerProfile` | `pages/installer/PerfilPage.tsx` + `ProfileHero`/`ProfileStats` | `rating`/`cumplimiento`/`aceptacion` vienen de la fila `usuarios` propia. |
| `ConfirmCancel` | `components/shared/ConfirmDialog.tsx` | Genérico y reutilizable (no solo para cancelar). |
| `stepJobEngine` + `SCRIPT` | **Eliminado** | Sustituido por Realtime (bids INSERT) + Presence (engagement). Es exactamente el reemplazo `simulateJob() → Realtime` pedido en las instrucciones. |
| `jobView(job, sortBy)` | `features/despacho/hooks/useActiveTrabajos.ts` (cálculo derivado) + utilidades en `lib/` | Misma lógica de ordenar/derivar métricas, ahora sobre datos reales de `bids`. |
| `confirmAssign` | RPC de Postgres `seleccionar_instalador(trabajo_id, bid_id)` (ver §9.5) | Se propone mover la lógica atómica (marcar bid ganador + perdedores + actualizar trabajo) al servidor. |

---

## 5. Hooks necesarios (custom hooks)

> **⚠ Escrito contra el modelo legacy, superado por §14 (Sprint 4.1.1) y `docs/frontend/FRONTEND_SYNC_PLAN.md`.** Nombres como `bids`, `usuarios.rol`, RPC `seleccionar_instalador` no existen en Producción (ver `docs/database/DATABASE_DIFF.md`). Los hooks base reales (sin lógica de negocio todavía) están en `src/hooks/` -- ver §14.2.

Todos con TanStack Query (`useQuery`/`useMutation`) sobre la capa `services/`. Ninguno usa `any`.

- `useSession()` — sesión de Supabase Auth + fila `usuarios` asociada + `rol`. Fuente única de verdad para navegación por rol.
- `useActiveTrabajos(sucursalId | 'todas')` — trabajos `live`/`assigned` para el panel de despacho.
- `useTrabajoBidsRealtime(trabajoId)` — se suscribe a `postgres_changes` INSERT/UPDATE en `bids` filtradas por `trabajo_id`; escribe en la cache de TanStack Query (`setQueryData`) en vez de `setState` local.
- `useEligibleInstaladores(zona, provincia)` — instaladores con cobertura de esa zona/provincia (para poblar el radar antes de que haya bids).
- `useJobEngagementPresence(trabajoId)` — canal de Presence + Broadcast para los estados efímeros "abrió"/"respondiendo" (no persistidos en DB, ver §9.3).
- `useSeleccionarInstalador()` — mutation que llama al RPC `seleccionar_instalador`.
- `usePublishTrabajo()` — mutation `INSERT trabajos`.
- `useTrabajosHistorial(sucursalId, filtro)` / `useTrabajoDetail(id)`.
- `useTrabajosDelMes(year, month, sucursalId | 'todas')` — para el calendario.
- `useMiTrabajoActivo()` — trabajo `live` visible para el instalador autenticado (RLS ya filtra por zona).
- `useMiBidEnEsteTrabajo(trabajoId)` — determina si ya respondió/declinó/fue seleccionado/perdió.
- `useEnviarBid()` / `useDeclinarBid()` — mutations `INSERT bids`.
- `useReportarEngagement(trabajoId)` — emite presence/broadcast cuando el instalador abre la alerta o empieza a llenar la oferta.
- `useMisTrabajos()` — bids propios unidos a `trabajos_vista`.
- `useMiPerfil()`.
- `useInstaladores()` / `useInviteInstalador()` / `useToggleSuspension()`.
- `useCountdownSeconds(target: Date | string)` — hook genérico que reemplaza el patrón `setInterval` repetido en `LiveCountdown` y `CountRing`.
- `useRealtimeChannel(channelName, config)` — wrapper genérico para no repetir boilerplate de `supabase.channel(...).on(...).subscribe()` en cada hook de dominio.

---

## 6. Servicios (`src/services`)

> **⚠ Escrito contra el modelo legacy, superado por §14 (Sprint 4.1.1).** Los servicios base reales (genéricos, sin lógica de negocio) son `src/services/supabase.service.ts`/`auth.service.ts`/`database.service.ts` -- ver §14.2. Los servicios de dominio listados abajo (`trabajos.service.ts`, `bids.service.ts`, etc.) quedan para un Sprint funcional futuro, construidos sobre `database.service.ts`/`repositories/`, con nombres/tablas actualizados al modelo real.

Cada servicio expone funciones puras `async` tipadas que reciben/retornan tipos de `types/domain.ts` (no `types/database.ts` crudo) — la conversión ocurre en `lib/mappers.ts` dentro del propio servicio, así los hooks/components nunca ven `snake_case`.

- `trabajos.service.ts`: `listActivos()`, `listHistorial()`, `getById()`, `getPorMes()`, `publicar(form)`, `marcarCompletado(id)`, `cancelar(id)`. Siempre consulta `trabajos_vista`, nunca `trabajos` directamente para lecturas visibles a instaladores (ver riesgo crítico §11.2).
- `bids.service.ts`: `listPorTrabajo(trabajoId)`, `crear(bid)`, `declinar(trabajoId)`, `seleccionar(trabajoId, bidId)` (llama al RPC).
- `usuarios.service.ts`: `getMiPerfil()`, `listInstaladores()`, `toggleSuspension(id, valor)`.
- `zonasCobertura.service.ts`: `listPorInstalador(id)`, `listElegiblesPara(zona, provincia)`.
- `sucursales.service.ts`: `listActivas()`.
- `empresas.service.ts`: `getActual()`.
- `notificaciones.service.ts`: lectura de auditoría (no envía SMS directamente; eso es de la Edge Function).
- `auth.service.ts`: `enviarMagicLink(email)`, `cerrarSesion()`, `invitarInstalador(datos)` (delega a Edge Function).

---

## 7. Contextos, tipos e iconos

### 7.1 Contextos

> **⚠ `AuthContext` legacy no se modificó (Sprint 4.1.1, §14.4).** Sprint 4.1.1 agregó `SupabaseProvider`/`SessionProvider`/`AuthProvider` nuevos en `src/providers/`, genéricos y sin resolver rol todavía -- coexisten con este `AuthContext` legacy hasta la reconciliación de `docs/frontend/FRONTEND_SYNC_PLAN.md` Fase 3.

- `AuthContext` — únicamente este. Expone `{ session, usuario, rol, sucursalId, isMaster, loading }`. No se necesita un contexto de "trabajo activo" ni de "tema" (el diseño es fijo, sin modo claro/oscuro).

### 7.2 Mapeo de íconos (`ICONS`/`mkIcon` → lucide-react)

| Clave prototipo | Ícono lucide-react |
|---|---|
| bell | Bell |
| clock | Clock |
| mapPin | MapPin |
| star | Star |
| zap | Zap |
| check2 | CheckCircle2 |
| xCircle | XCircle |
| radio | Radio |
| trending | TrendingUp |
| alert | AlertTriangle |
| calendar | Calendar |
| chevR | ChevronRight |
| activity | Activity |
| user | User |
| rotate | RotateCcw |
| play | Play |
| gauge | Gauge |
| nav | Navigation |
| shieldC | ShieldCheck |
| shieldA | ShieldAlert |
| send | Send |
| loader | Loader2 |
| users | Users |
| timer | Timer |
| crosshair | Crosshair |
| msg | MessageSquare |
| mega | Megaphone |
| plus | Plus |
| check | Check |
| arrowUR | ArrowUpRight |
| settings | Settings |
| clipboard | ClipboardList |
| userPlus | UserPlus |
| mail | Mail |
| briefcase | Briefcase |
| home | Home |
| phone | Phone |

### 7.3 Tipos TypeScript

`types/database.ts` — reflejan el schema columna por columna (idealmente generados con `supabase gen types typescript` contra el proyecto ya migrado, y luego ajustados a mano si hace falta):

```ts
export type Rol = 'coordinador' | 'instalador' | 'admin';
export type TrabajoPhase = 'live' | 'assigned' | 'completed' | 'cancelled';
export type BidEstado = 'pendiente' | 'seleccionado' | 'rechazado';
export type NotificacionCanal = 'sms' | 'whatsapp' | 'push' | 'email';

export interface EmpresaRow {
  id: string;
  nombre: string;
  slug: string;
  activa: boolean;
  created_at: string;
}

export interface SucursalRow {
  id: string;
  empresa_id: string;
  nombre: string;
  provincia: string | null;
  direccion: string | null;
  activa: boolean;
  created_at: string;
}

export interface UsuarioRow {
  id: string;
  auth_id: string | null;
  empresa_id: string;
  sucursal_id: string | null;
  rol: Rol;
  nombre: string;
  email: string;
  telefono: string | null;
  empresa_nombre: string | null;
  rating: number;
  cumplimiento: number;
  aceptacion: number;
  activo: boolean;
  suspendido: boolean;
  docs_completos: boolean;
  created_at: string;
  updated_at: string;
}

export interface ZonaCoberturaRow {
  id: string;
  instalador_id: string;
  provincia: string;
  zona: string;
}

export interface TrabajoRow {
  id: string;
  empresa_id: string;
  sucursal_id: string;
  coordinador_id: string;
  tipo: string;
  zona: string;
  provincia: string;
  tipo_inmueble: string | null;
  calle: string | null;
  equipo: string | null;
  requisitos: string | null;
  precio_sugerido: number | null;
  bid_mins: number;
  published_at: string;
  bid_cierra_at: string;
  phase: TrabajoPhase;
  assigned_bid_id: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_direccion: string | null;
  created_at: string;
  updated_at: string;
}

export interface BidRow {
  id: string;
  trabajo_id: string;
  instalador_id: string;
  precio: number;
  fecha_disponible: string;
  hora_disponible: string;
  comentario: string | null;
  estado: BidEstado;
  respondido_at: string;
  created_at: string;
}

export interface NotificacionRow {
  id: string;
  trabajo_id: string;
  destinatario_id: string;
  canal: NotificacionCanal;
  mensaje: string | null;
  enviado: boolean;
  enviado_at: string | null;
  error: string | null;
  created_at: string;
}
```

`types/domain.ts` — modelos camelCase fieles a los nombres que ya usa el prototipo (`bidMins`, `tipoInmueble`, `precioSugerido`, etc.), construidos por `lib/mappers.ts` a partir de las filas de arriba. Ejemplo:

```ts
export interface Trabajo {
  id: string;
  sucursalId: string;
  sucursalNombre: string;
  tipo: string;
  zona: string;
  provincia: string;
  tipoInmueble: string | null;
  calle: string | null;
  equipo: string | null;
  requisitos: string | null;
  precioSugerido: number | null;
  bidMins: number;
  publishedAt: string;
  bidCierraAt: string;
  phase: TrabajoPhase;
  assignedBidId: string | null;
  // presentes solo si RLS/trabajos_vista los expone al usuario actual
  clienteNombre: string | null;
  clienteTelefono: string | null;
  clienteDireccion: string | null;
}

export interface Bid {
  id: string;
  trabajoId: string;
  instaladorId: string;
  precio: number;
  fechaDisponible: string;
  horaDisponible: string;
  comentario: string | null;
  estado: BidEstado;
  respondidoAt: string;
}

export interface Instalador {
  id: string;
  nombre: string;
  telefono: string | null;
  rating: number;
  cumplimiento: number;
  aceptacion: number;
  activo: boolean;
  suspendido: boolean;
  docsCompletos: boolean;
}
```

Nota: no existe en el schema un tipo para el estado "efímero" de radar (idle/notified/opened/responding/responded/selected/confirmed/declined/lost). Se define aparte como `JobEngagementState` (tipo de UI, no de base de datos) en `types/domain.ts`, alimentado por la combinación de `bids` + Presence/Broadcast — ver §9.3.

---

## 8. Rutas

```
/login                          LoginPage (público)

# Coordinador
/despacho                       DespachoPage        (rol: coordinador)
/trabajos                       TrabajosPage         (rol: coordinador)
/trabajos/:id                   TrabajoDetailPage     (rol: coordinador)

# Instalador
/solicitudes                    SolicitudesPage       (rol: instalador)   ← landing por defecto
/mis-trabajos                   MisTrabajosPage       (rol: instalador)
/perfil                         PerfilPage            (rol: instalador)

# Admin
/admin/calendario               CalendarioPage        (rol: admin)        ← landing por defecto
/admin/instaladores             InstaladoresPage      (rol: admin)

*                                NotFoundPage
```

`ProtectedRoute` valida sesión activa; `RoleGate` valida que `usuario.rol` coincida con el permitido para esa rama de rutas, y redirige a la landing correspondiente a su rol si no coincide (equivalente al `if(role==='coord')...` del prototipo, pero gobernado por el rol real de `usuarios`, no por un botón).

---

## 9. Estrategias de integración con Supabase

### 9.1 Las 4 llamadas mínimas (documentadas en el PDF, confirmadas contra el código)

| Función del prototipo | Operación Supabase real |
|---|---|
| `publishJob(form)` | `INSERT trabajos` (trigger `set_bid_cierra_at` calcula `bid_cierra_at`) |
| `stepJobEngine` / `SCRIPT` (simulación) | `supabase.channel('bids-trabajo-'+id).on('postgres_changes', {event:'INSERT', table:'bids', filter:'trabajo_id=eq.'+id}, ...)` |
| `installerRespond(instId, offer)` | `INSERT bids` (estado por defecto `pendiente`) |
| `selectInstaller(id, instId)` / `confirmAssign` | RPC `seleccionar_instalador(trabajo_id, bid_id)` (ver §9.5) — reemplaza el UPDATE doble manual sugerido en el PDF por una transacción atómica |

### 9.2 Realtime — qué SÍ tiene respaldo en la base de datos

- **Nuevas respuestas (`responded`)**: Realtime `postgres_changes` INSERT sobre `bids`, filtrado por `trabajo_id`. 1:1 con el prototipo.
- **Trabajos nuevos visibles para un instalador**: Realtime `postgres_changes` INSERT sobre `trabajos` (o una vista con Realtime habilitado). Supabase Realtime respeta RLS en `postgres_changes`, así que un instalador solo recibirá inserts de trabajos que su política de zona le permite ver — no hace falta lógica de filtrado adicional en el cliente.
- **Cierre de la ronda de bid**: puramente derivado en cliente de `bid_cierra_at` (timestamp ya calculado por el trigger), igual que `LiveCountdown`/`CountRing` en el prototipo. No requiere Realtime ni polling.

### 9.3 Realtime — qué NO tiene respaldo en la base de datos (riesgo, ver §11.1)

Los estados intermedios del radar (`notified` → `opened` → `responding`) no tienen ninguna tabla que los represente en `handymax_supabase_schema_v3.sql`; solo existen como animación en el prototipo (poblados por `SCRIPT`). Para no perder esa fidelidad visual sin tocar el schema, se propone:

- **Presence** en un canal por trabajo (`presence-trabajo-{id}`): cada instalador elegible hace `channel.track({ instaladorId, state: 'opened' })` cuando abre la pantalla de alerta de ese trabajo. El coordinador, suscrito al mismo canal, deriva `notified` (instalador elegible sin presence) vs `opened` (con presence) sin escribir nada en Postgres.
- **Broadcast** (no persistente) en el mismo canal: cuando el instalador empieza a interactuar con el formulario de oferta, se emite `channel.send({ type: 'broadcast', event: 'responding', payload: { instaladorId } })`, throttled (p. ej. cada 3s mientras haya foco en el formulario). El coordinador pinta el punto del radar en ámbar temporalmente al recibirlo.
- Esto no requiere ninguna tabla ni política nueva — Presence/Broadcast no persisten en Postgres, por lo que no viola "no rediseñar la base de datos".

### 9.4 Auth

- **Coordinador/Admin**: `supabase.auth.signInWithOtp({ email })` (magic link), UI en `LoginForm.tsx`.
- **Instalador**: nunca se autoregistra. El admin lo invita desde `InviteInstaladorForm` → una **Edge Function** (`invite-instalador`) que corre en el servidor con `service_role` (nunca en el cliente) y llama a `supabase.auth.admin.inviteUserByEmail(email, { data: { rol: 'instalador', ... } })`.
- **Vínculo `usuarios.auth_id`** (decisión arquitectónica nueva, no cubierta explícitamente por el PDF ni el SQL — documentada aquí por regla del proyecto): el admin crea la fila en `usuarios` (con `auth_id = NULL`) antes o al momento de invitar. Cuando la persona invitada completa el login por primera vez, se necesita enlazar su `auth.users.id` recién creado con esa fila. Se propone un trigger `AFTER INSERT ON auth.users` que ejecute una función `SECURITY DEFINER` que busque en `usuarios` por `email = NEW.email AND auth_id IS NULL` y setee `auth_id = NEW.id`. Es aditivo (no modifica columnas ni políticas existentes) pero es nueva superficie de la base de datos — **se reporta aquí para aprobación antes de implementarla en la fase correspondiente**, tal como piden las instrucciones del proyecto para decisiones arquitectónicas.
- **Sesión del cliente**: `supabase.auth.onAuthStateChange` alimenta `AuthContext`; al iniciar sesión se hace `SELECT * FROM usuarios WHERE auth_id = auth.uid()` para obtener rol/sucursal/perfil.

### 9.5 RLS y la operación de "seleccionar instalador"

El schema define políticas de UPDATE separadas para `trabajos` y `bids`, pero seleccionar un ganador requiere dos escrituras coordinadas (marcar el bid ganador como `seleccionado` + actualizar `trabajos.phase`/`assigned_bid_id`), y en el prototipo real también hace falta marcar los demás bids `pendiente` de ese trabajo como `rechazado` (para que "lost" sea representable). Ejecutar esto como dos `UPDATE` sueltos desde el cliente (como sugiere el PDF) deja una ventana de inconsistencia si el segundo falla. Se propone (nueva decisión arquitectónica, pendiente de aprobación, no implementada aún):

```sql
create or replace function seleccionar_instalador(p_trabajo_id uuid, p_bid_id uuid)
returns void as $$
begin
  update bids set estado = 'seleccionado'
    where id = p_bid_id and trabajo_id = p_trabajo_id;
  update bids set estado = 'rechazado'
    where trabajo_id = p_trabajo_id and id <> p_bid_id and estado = 'pendiente';
  update trabajos set phase = 'assigned', assigned_bid_id = p_bid_id
    where id = p_trabajo_id;
end;
$$ language plpgsql security definer;
```

Se ejecuta como `security definer` para poder tocar `bids` de otros instaladores en la misma transacción, pero se invoca solo vía `supabase.rpc('seleccionar_instalador', ...)` y debe re-validar dentro de la función que quien llama es el coordinador dueño de la sucursal del trabajo (usando `get_my_rol()`/`get_my_sucursal_id()`, ya existentes en el schema) antes de escribir, para no debilitar RLS.

> **Actualización (Fase 4, Sprint 4.0.1):** `bids.estado` dejó de ser `text` con CHECK y ahora es el ENUM `oferta_estado` (`pendiente`/`seleccionado`/`rechazado`/`expirado`) — mismos valores en español que ya usaba el CHECK original, más `expirado` como valor nuevo. Esta propuesta de RPC sigue siendo válida sin cambios: los literales `'seleccionado'`/`'rechazado'`/`'pendiente'` de arriba siguen resolviendo correctamente contra la columna, ahora tipada como ENUM. El RPC en sí **sigue sin implementarse** — solo se preparó la infraestructura de tipos que lo respalda. Ver `PHASE_4.md` para el detalle completo de esa migración.

### 9.6 RLS — columnas del cliente (riesgo crítico, ver §11.2)

Todo el código de la aplicación debe leer trabajos **siempre** desde `trabajos_vista`, nunca desde `trabajos`, para cualquier usuario que no sea coordinador/admin. `trabajos.service.ts` centraliza esto para que sea imposible que un componente "se equivoque" y consulte la tabla base.

### 9.7 Fase 4, Sprint 4.0.1 — Infraestructura de roles/ENUMs/RLS (implementado)

Primer Sprint de Fase 4 (backend), ejecutado íntegramente vía `supabase/migrations/0002_auth_roles_rls.sql`. Resumen (detalle completo, incluyendo desviaciones respecto al brief original y validación real contra PostgreSQL 16, en `PHASE_4.md`):

- **4 ENUMs nuevos**: `user_role` (sobre `usuarios.rol`), `trabajo_estado` (sobre `trabajos.phase`), `oferta_estado` (sobre `bids.estado`, ver nota en §9.5), `trabajo_instalador_estado` (sobre la tabla nueva `trabajo_instaladores.estado`) — todos reemplazan columnas `text` + CHECK preexistentes, sin pérdida de datos.
- **Tabla nueva `trabajo_instaladores`**: registra, por instalador individual, el estado de notificación/oferta sobre un trabajo (`notificado`/`abierto`/`oferta_enviada`/`rechazado`/`expirado`) — no existía ninguna estructura equivalente en 0001.
- **5 índices nuevos** (`idx_trabajos_coordinador`, `idx_trabajos_assigned_bid`, `idx_trabajoinst_trabajo`, `idx_trabajoinst_instalador`, `idx_usuarios_empresa`), más 4 ya existentes re-declarados de forma idempotente.
- **6 funciones `SECURITY DEFINER` nuevas** (`current_user_role()`, `current_profile()`, `current_empresa()`, `is_admin()`, `is_coordinator()`, `is_installer()`), pensadas explícitamente como building blocks para las políticas RLS futuras y para el frontend de Fase 4 en adelante. Las 3 funciones ya existentes de 0001 (`get_my_rol()`, `get_my_sucursal_id()`, `get_my_usuario_id()`) se conservan intactas.
- **7 políticas RLS nuevas**, cerrando 3 vacíos reales detectados en 0001: `empresas`/`sucursales` no tenían política de escritura para admin (solo lectura pública de filas activas); `trabajos` no tenía política de INSERT/DELETE para admin (solo SELECT+UPDATE); ningún usuario podía actualizar su propia fila en `usuarios` (solo admin podía). Más las políticas de la tabla nueva `trabajo_instaladores`.
- **Riesgo abierto, no resuelto en este Sprint**: la política nueva de auto-actualización de perfil es a nivel de fila, no de columna — un usuario podría en teoría editar columnas sensibles de su propia fila (`rol`, `empresa_id`, `activo`, `suspendido`, calificaciones). Ver §11.10.
- Validado con una instancia real de PostgreSQL 16 (no con los scripts `npm run lint/typecheck/build/dev`, que no aplican a este Sprint de backend puro): aplicación limpia de `0001` + `0002`, más una segunda ejecución de `0002` para confirmar idempotencia total (0 errores en las 3 corridas).
- Ningún componente React/Vite/Tailwind/contexto/hook/ruta fue modificado.

### 9.8 Database Infrastructure — flujo oficial de migraciones (Sprint 4.0.1, segunda ronda: "Database Infrastructure Baseline")

Segundo Sprint dentro de "4.0.1" (el brief de esta ronda reutiliza el mismo número de Sprint que la ronda anterior — §9.7 — con un objetivo distinto: "Database Infrastructure Baseline"; se reporta la coincidencia de numeración como una posible confusión a aclarar con el usuario, sin renumerar nada por cuenta propia). Objetivo: reorganizar `supabase/` para seguir el flujo oficial de migraciones de Supabase (estructura separada de datos), sin tocar ni el diseño del schema ni ningún dato existente. Resumen (detalle completo en `PHASE_4.md` y `supabase/README.md`):

- **`supabase/migrations/0001_initial_schema.sql` limpiado de datos**: se removieron el `INSERT INTO empresas` y el bloque `DO $$ ... INSERT INTO sucursales ...`, así como las queries de verificación (`SELECT`) que tenía al final. El archivo ahora contiene **únicamente** estructura (`CREATE TABLE`/`ALTER TABLE`/índices/funciones/vista/RLS) — cero `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`/`SELECT` de nivel superior (los `SELECT` que quedan están dentro de cuerpos de función, políticas y la vista `trabajos_vista`, que sí están permitidos). Ningún `CREATE`/`ALTER` de estructura se tocó — mismas tablas, mismas columnas, mismos tipos, mismas relaciones, mismos constraints que antes de este Sprint.
- **`supabase/seed.sql` (nuevo)**: contiene, sin ningún cambio de contenido, los mismos `INSERT`/bloque `DO $$` removidos de `0001` — la empresa Multimax y sus 9 sucursales.
- **`supabase/README.md` (nuevo)**: documenta el flujo operativo completo — cómo aplicar migraciones (método manual actual vía Dashboard, y el flujo objetivo con Supabase CLI, todavía no instalada/vinculada en este repositorio), cómo y cuándo ejecutar `seed.sql`, cómo crear una migración nueva (incluye los 3 hallazgos reales de PostgreSQL del §9.7 anterior, reformulados como buenas prácticas reutilizables), y el flujo Git (manual, a cargo del usuario, consistente con la regla permanente del proyecto).
- **Riesgo real detectado durante la validación** (no introducido por este Sprint, solo hecho evidente al probar dos veces contra una base real): el `INSERT` de `sucursales` en el seed no es realmente idempotente — `sucursales` no tiene ningún `UNIQUE` constraint más allá de `id` autogenerado, así que su `ON CONFLICT DO NOTHING` no tiene columna de conflicto real y **ejecutar el seed dos veces duplica las 9 sucursales**. Documentado en `supabase/seed.sql` y `supabase/README.md §4`; no se agregó un `UNIQUE` constraint nuevo sin aprobación (fuera de alcance: "no modificar columnas/relaciones" de este Sprint).
- **Invariante documental rota, deliberadamente, por instrucción explícita**: desde la Fase 2, `PROJECT_STATUS.md`/`TODO.md`/este mismo archivo (línea del árbol en §3) documentaban `0001_initial_schema.sql` como "copia literal de `handymax_supabase_schema_v3.sql`, sin modificar, verificada con `diff`". Ese ya no es el caso — el archivo fue editado en este Sprint (y también en el anterior, §9.7). La línea del árbol en §3 se corrigió; `PROJECT_STATUS.md` se actualizó con una nota; `TODO.md`/`MIGRATION_STATUS.md` **no se tocaron** (fuera de la lista de archivos permitidos en el brief de este Sprint) y quedan con la afirmación desactualizada, reportado para decisión futura del usuario.
- Validado igual que en §9.7: instancia real de PostgreSQL 16, aplicación limpia de `0001` (ya limpio) + `seed.sql` + `0002`, más una segunda ejecución de `seed.sql` (que sí reveló el problema de duplicados de arriba) para confirmar/descartar idempotencia.
- Ningún componente React/Vite/Tailwind/contexto/hook/ruta fue modificado; ningún dato existente en el diseño del schema (tablas/columnas/tipos/relaciones/FKs) fue rediseñado — solo se reorganizó dónde vive cada sentencia SQL dentro de los archivos del proyecto.

### 9.9 Modelo de datos oficial — confirmado por el usuario (Sprint 4.0.1, tercera ronda: "Reconstrucción del baseline de Supabase")

> **⚠ Superado por §14 (Sprint 4.1.1).** La confirmación de abajo se basaba en la mejor evidencia disponible en ese momento (dos fuentes SQL, ambas legacy). Una ronda posterior del mismo Sprint 4.0.1 recibió el `pg_dump` real de Producción, que reveló que el modelo vigente es otro. Se conserva este texto por trazabilidad histórica -- ver §14.1 y `docs/database/DATABASE_SYNC_PLAN.md` para la decisión vigente.

**Declaración formal, por instrucción explícita del usuario:** el modelo de datos oficial y definitivo del proyecto es el que ya existe en `supabase/migrations/0001_initial_schema.sql`, con las 8 tablas `empresas`, `sucursales`, `usuarios`, `zonas_cobertura`, `trabajos`, `bids`, `notificaciones`, `trabajo_instaladores` (esta última agregada en `0002_auth_roles_rls.sql`, §9.7). Cualquier brief futuro que asuma tablas separadas `admins`/`coordinadores`/`instaladores`, `tiendas` u `ofertas` debe leerse como una asunción incorrecta a corregir contra este documento, no como una instrucción de rediseño a ejecutar.

Un tercer brief bajo el mismo número "Sprint 4.0.1" ("Reconstrucción del baseline de Supabase") pidió, con lenguaje absoluto ("prohibido cambiar nombres de tablas", "no debes crear una arquitectura distinta"), reconstruir `0001_initial_schema.sql` para que coincidiera EXACTAMENTE con un modelo alternativo (`empresas`/`tiendas`/`admins`/`coordinadores`/`instaladores`/`trabajos`/`trabajo_instaladores`/`ofertas`). Antes de tocar cualquier archivo, se verificó ese modelo alternativo contra las dos únicas fuentes SQL reales del proyecto (el archivo originalmente subido `handymax_supabase_schema_v3.sql` y `0001_initial_schema.sql` actual) — ambas coinciden entre sí (`diff` estructural sin diferencias, más allá de los `INSERT`/`SELECT` ya movidos en §9.8) y ninguna define `tiendas`/`admins`/`coordinadores`/`instaladores`/`ofertas`. Se reportó la discrepancia sin implementarla (siguiendo la propia "regla final" de ese brief: detenerse y reportar en vez de corregir por cuenta propia) y se preguntó al usuario, quien confirmó por escrito que el modelo real (`usuarios`/`sucursales`/`bids`/etc.) es el oficial. Ver `PHASE_4.md` → "Sprint 4.0.1 (tercera ronda)" para la trazabilidad completa de este intercambio.

**Validación estructural completa realizada en esta ronda** (tabla por tabla, columna por columna, tipo por tipo, FK por FK, PK por PK, índices, vistas, triggers, funciones, políticas — contra una base PostgreSQL 16 real, aplicando `0001` + `seed.sql` + `0002` desde cero): confirma que las 8 tablas, sus columnas/tipos, las 15 FKs, las 8 PKs, los 28 índices, la vista `trabajos_vista`, los 4 triggers, las 9 funciones propias y las 30 políticas RLS existen exactamente como están documentadas en §9.7/§9.8 — 0 errores, 0 diferencias. Detalle completo (con cada tabla de comparación) en `PHASE_4.md`.

**Tensión detectada y reportada, no resuelta unilateralmente**: este tercer brief también exige que `0002_auth_roles_rls.sql` sea "únicamente incremental" y prohíbe expresamente que modifique columnas/tablas existentes — pero `0002` (de la primera ronda, ya aprobada en su momento) sí hace `ALTER COLUMN ... TYPE` sobre 3 columnas existentes (`usuarios.rol`, `trabajos.phase`, `bids.estado`) y crea la tabla nueva `trabajo_instaladores`. Dado que el usuario, en esta misma ronda, instruyó explícitamente "mantener la compatibilidad con el esquema existente" — se interpreta que el `esquema existente` ya incluye esas conversiones de `0002` — se decidió **no revertir ni dividir `0002`**, dejándolo como está (ya validado, ya aprobado en principio). Se reporta esta tensión explícitamente para que el usuario confirme si esa lectura es correcta o si prefiere una acción distinta.

**`supabase/config.toml` (nuevo en esta ronda)**: se completó la estructura de `supabase/` pedida (`config.toml`, `README.md`, `seed.sql`, `migrations/0001_...`, `migrations/0002_...`, sin archivos adicionales). El archivo se escribió a mano siguiendo la convención estándar de `supabase init` (la CLI real no está instalada/vinculada en este entorno) — ver `supabase/README.md` para el detalle y la recomendación de regenerarlo/compararlo con un `supabase init` real cuando el usuario tenga la CLI disponible.

**Confirmación de cierre**: ningún componente React/Vite/Tailwind/TS/Auth fue modificado; ninguna tabla/columna/tipo/relación/FK del modelo oficial fue renombrada, eliminada, ni rediseñada en esta ronda. El repositorio queda preparado, sobre este modelo confirmado, para iniciar el Sprint 4.1 (Autenticación).

---

## 10. Plan detallado de migración del HTML

### 10.1 Campos del formulario "Publicar trabajo" → columnas de `trabajos`

| Campo del formulario (prototipo) | Columna `trabajos` |
|---|---|
| `sucursal` | `sucursal_id` (resuelto por nombre → id; ya no editable si el coordinador no es master) |
| `tipo` | `tipo` |
| `provincia` | `provincia` |
| `zona` | `zona` |
| `tipoInmueble` | `tipo_inmueble` |
| `calle` | `calle` |
| `equipo` | `equipo` |
| `fecha` + `hora` | *(no existen columnas directas — ver riesgo §11.4)* |
| `requisitos` | `requisitos` |
| `extra` | *(no existe columna — ver riesgo §11.5)* |
| `precioSugerido` | `precio_sugerido` |
| `urgente` | *(no existe columna — ver riesgo §11.5)* |
| `bidMins` | `bid_mins` |
| — (no está en el form, se agrega en el modal de "cliente" si existe, o en un paso posterior) | `cliente_nombre`, `cliente_telefono`, `cliente_direccion` |

### 10.2 Estados de pantalla del instalador → derivación desde datos reales

| Estado prototipo (`step`/derivados) | Condición real |
|---|---|
| Empty state | No hay `trabajos_vista` con `phase='live'` visible para el instalador (RLS ya filtra por zona) |
| `alert` | Trabajo visible, sin bid propio todavía |
| `offer` | Usuario pulsó "Puedo realizarlo" (estado de UI local, no persiste hasta enviar) |
| Respuesta enviada | Existe `bids` propio con `estado='pendiente'` para ese trabajo |
| Asignado (`isAssigned`) | `bids` propio con `estado='seleccionado'` |
| Perdido (`lost`) | `bids` propio con `estado='rechazado'` Y `trabajos.assigned_bid_id` apunta a otro |
| Rechazado por el instalador (`declined`) | `bids` propio con `estado='rechazado'` Y `trabajos.assigned_bid_id` es null (fue el instalador quien declinó, no el coordinador) — **requiere poder distinguir "yo rechacé" de "me rechazaron"; ver riesgo §11.3** |
| Cerrado | `trabajos_vista.phase !== 'live'` y no hay bid propio |

### 10.3 Historial (`TRABAJOS`/`MISJOBS` mock) → queries reales

- `CoordinatorJobs`/`TrabajosPage`: `SELECT * FROM trabajos_vista WHERE sucursal_id = :miSucursal ORDER BY created_at DESC` (todas las fases), con filtro client-side por `phase` igual que `mx-jobfilter`.
- `InstallerJobs`/`MisTrabajosPage`: `SELECT bids.*, trabajos_vista.* FROM bids JOIN trabajos_vista ON ... WHERE bids.instalador_id = :miId`, agrupado en "Próximos" (`trabajos.phase IN ('live','assigned')`) e "Historial" (`phase IN ('completed','cancelled')`), replicando el agrupamiento por `grupo` del mock.

---

## 11. Riesgos técnicos identificados

1. **Estados efímeros del radar sin respaldo en DB** (`notified`/`opened`/`responding`). Mitigado con Presence/Broadcast (§9.3), pero requiere que el cliente instalador mantenga el canal abierto mientras ve la alerta — si cierra la app, el coordinador simplemente deja de ver "abrió" (comportamiento aceptable, ya que Presence expira automáticamente).
2. **RLS a nivel de fila, no de columna** (ya reportado arriba, §"REGLA MÁS IMPORTANTE" de esta sesión): la tabla base `trabajos` permite a un instalador de zona ver filas `live` completas, incluyendo `cliente_nombre/telefono/direccion`, porque RLS no oculta columnas. Mitigación: **la aplicación nunca debe hacer `SELECT * FROM trabajos` para un instalador**, solo `trabajos_vista`. Se documenta también como recomendación de refuerzo (fuera de alcance de esta fase, no se toca el SQL): revocar `SELECT` directo sobre `trabajos` para el rol `instalador` y forzar el uso de la vista a nivel de base de datos, no solo de convención de código.
3. **Distinguir "instalador rechazó" de "coordinador no lo eligió" usando solo `bids.estado`**: ambos casos terminan en `estado='rechazado'`, pero la UI necesita mostrar mensajes distintos ("Rechazaste esta solicitud" vs. "Asignado a otro instalador"). Se puede derivar sin tocar el schema: si `trabajos.assigned_bid_id IS NOT NULL` y no es el bid propio → "lost"; si es `NULL` y mi bid es `rechazado` → "declined". Documentado para no perder el matiz de UX del prototipo.
4. **Sin columna para `fecha`/`hora` deseada del trabajo en `trabajos`**: el prototipo permite al coordinador sugerir una fecha/hora al publicar, pero el schema v3 no tiene esas columnas en `trabajos` (la fecha/hora "real" del servicio la termina definiendo el instalador vía `bids.fecha_disponible`/`hora_disponible`). Se reporta como posible **pequeño error/omisión del schema**, no se modifica: si el coordinador debe poder sugerir fecha/hora al publicar, harían falta columnas `fecha_sugerida date` y `hora_sugerida text` en `trabajos`. Pendiente de que el usuario confirme si esto es intencional (la fecha la decide siempre el instalador) o un olvido del schema v3.
5. **Campos `extra` y `urgente` del formulario de publicar sin columna en `trabajos`**: mismo caso que el punto anterior — se reporta, no se modifica el SQL sin aprobación.
6. **Ambigüedad de "coordinador master"** (`isMaster` en `CoordinatorJobs`): el schema no tiene ningún campo que distinga a un coordinador "master" (que vería todas las sucursales) de uno normal. Se propone la regla `isMaster = (usuario.rol === 'coordinador' && usuario.sucursal_id === null)`, pero es una interpretación, no algo confirmado por el schema o el PDF — **pendiente de confirmación del usuario** antes de construir esa rama en Fase 4/5.
7. **Falta de `assigned_at` en `trabajos`**: el prototipo guarda `assignedAt` para el timeline; el schema solo tiene `updated_at` (que cambia en cualquier UPDATE, no solo al asignar). Se puede vivir sin él usando `updated_at` en el momento en que `phase` pasa a `assigned` (dado que el RPC de §9.5 es la única vía de escritura para ese cambio), pero es frágil a futuro. Se reporta como posible mejora de schema, no se implementa sin aprobación.
8. **Rotación de `service_role` pendiente** (ver PROJECT_STATUS.md) — bloquea cualquier trabajo real de Auth/Edge Functions hasta que el usuario la rote.
9. **Rol de UI "master"/multi-sucursal vs. RLS actual**: las políticas de `trabajos`/`bids` para coordinador siempre filtran por `sucursal_id = get_my_sucursal_id()`. Si se confirma que existen coordinadores "master" que deben ver todas las sucursales, **las políticas RLS actuales se lo impedirían** — esto sería un cambio real de políticas (no solo de frontend) y debe decidirse explícitamente con el usuario antes de tocarlo, dado que las instrucciones piden no rediseñar RLS sin reportarlo primero.
10. **Política de auto-actualización de perfil sin restricción por columna** (nuevo, Fase 4 — Sprint 4.0.1, ver `PHASE_4.md §7`): la política `"Usuario actualiza su propio perfil (Sprint 4.0.1)"` sobre `usuarios` es a nivel de fila (`auth_id = auth.uid()`), no de columna. Un usuario autenticado podría, en teoría, hacer `UPDATE` sobre su propia fila cambiando no solo datos de contacto sino también `rol`, `empresa_id`, `sucursal_id`, `activo`, `suspendido`, `rating`, `cumplimiento`, `aceptacion` — un riesgo de escalación de privilegios. Corregirlo requiere lógica adicional (un trigger que rechace cambios a columnas específicas, o GRANT/REVOKE por columna), deliberadamente no implementada este Sprint por ser una decisión de producto/negocio ("qué campos puede editar un usuario sobre sí mismo"), no infraestructura pura. **Pendiente de decisión del usuario.**

---

## 12. Orden recomendado de implementación (fases siguientes)

1. **Fase 1** (esta fase): documentación de arquitectura. ✅
2. **Fase 2**: scaffold del proyecto (Vite/React/TS/Tailwind/shadcn, estructura de carpetas de este documento, `types/`, `supabase/client.ts`, `.env.example`) — sin lógica de negocio, debe compilar.
3. **Fase 3**: extracción fiel del HTML a componentes con datos mock locales (no Supabase todavía) para validar 1:1 la fidelidad visual antes de conectar backend.
4. **Fase 4**: Auth real (magic link, roles, `AuthContext`, rutas protegidas) — incluye resolver el vínculo `auth_id` (§9.4) con aprobación del usuario.
5. **Fase 5**: Flujo Coordinador contra Supabase real (publish, Realtime bids, radar con Presence/Broadcast, selección vía RPC).
6. **Fase 6**: Flujo Instalador contra Supabase real (ver trabajos, enviar bid, declinar, mis trabajos, perfil).
7. **Fase 7**: Panel Admin (instaladores, invitación vía Edge Function, calendario maestro).
8. **Fase 8**: Notificaciones (Edge Function + Twilio).
9. **Fase 9**: Pulido, manejo de errores/loading states, y despliegue.

Cada fase debe dejar el proyecto compilando (`npm install && npm run dev` sin errores) antes de pasar a la siguiente, y debe detenerse para aprobación explícita del usuario.

> **Nota (Fase 2):** el orden de fases de arriba es el original de Fase 1. Desde Fase 2, por pedido del usuario, el orden vigente es otro (Scaffold → Layout general → Coordinator → Installer → Admin → Supabase → Realtime → eliminación de mocks → pruebas finales) — ver `PROJECT_STATUS.md`/`TODO.md` para la numeración autoritativa. Este documento no se reescribió en ese momento porque el cambio fue de secuencia, no de arquitectura (decisión ya registrada en `CHANGELOG.md`, `[Fase 2]`).

---

## 13. Adenda — Fase 3 (Layout general y componentes compartidos)

Cambios puntuales respecto al inventario de §3/§4, detectados al construir el Layout general y la librería de componentes compartidos. Ninguno altera el stack, el modelo de datos, ni las estrategias de Supabase/Auth/RLS/Realtime de las secciones anteriores.

1. **`Pill` se fusionó con `Badge`.** §4 preveía `components/shared/Pill.tsx`. Al construir la librería `components/ui/` (shadcn-style), se determinó que `Pill` (`.mx-pill`) y el concepto genérico de "badge" del stack shadcn/ui son el mismo componente — se implementó una sola vez como `components/ui/badge.tsx` (`Badge`, con prop `tone`), evitando duplicar el mismo tratamiento visual bajo dos nombres. Cualquier referencia futura a "Pill" en este documento debe leerse como `Badge`.
2. **`RootLayout.tsx` sí incluye, temporalmente, un selector de rol manual.** §3 lo describía como "sin selector manual", asumiendo Auth ya implementada. La Fase 3 ocurre antes de la Fase de Auth (hoy Fase 7 en el orden vigente) y las instrucciones de esta fase exigen no alterar la apariencia/interactividad del prototipo. Resolución: `Header`/`RootLayout` reconstruyen `.mx-roleswitch` idéntico al original, respaldado por `useState<Rol>` local (no por `AuthContext`). La Fase 7 reemplaza ese estado por la sesión real sin tocar la apariencia — la nota "sin selector manual" de §3 sigue siendo el objetivo final, solo se pospuso su cumplimiento. Ver `MIGRATION_STATUS.md` §5 para el detalle.
3. **Primitivos Radix confirmados para `components/ui/`**: `@radix-ui/react-dialog` (Dialog/Modal/Drawer/ConfirmDialog), `@radix-ui/react-tabs`, `@radix-ui/react-checkbox`, `@radix-ui/react-switch`, `@radix-ui/react-tooltip`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-slot` (Button `asChild`), `@radix-ui/react-label`. Se decidió explícitamente **no** agregar `@radix-ui/react-select` (el prototipo usa `<select>` nativo en todos sus formularios — un primitivo custom cambiaría comportamiento/apariencia nativa) ni `@radix-ui/react-separator`/`@radix-ui/react-progress`/`@radix-ui/react-scroll-area` (implementados como `div`s simples con los tokens del proyecto, para minimizar dependencias donde no se necesita comportamiento accesible adicional).
4. **`Modal` y `Drawer` son dos primitivos nuevos de `components/ui/`**, no mencionados en §4 porque esa sección solo cataloga componentes de *feature* (Coordinator/Installer/Admin). `Drawer` porta verbatim `.mx-modal-bg`/`.mx-modal-panel` (el "modal" slide-up del prototipo, usado hoy por `PublishModal` en Fase 4). `Modal` es un patrón centrado genérico nuevo, sin equivalente en el prototipo. Ver `MIGRATION_STATUS.md` §6.2 para el razonamiento completo del renombre.

---

## 14. Adenda — Sprint 4.1.1 "Supabase Infrastructure Integration" (Fase A)

> **Este Sprint reemplaza la declaración de §9.9 como modelo oficial.** §9.9 (Sprint 4.0.1, tercera ronda) confirmó por escrito el modelo legacy (`empresas`/`sucursales`/`usuarios`/`zonas_cobertura`/`trabajos`/`bids`/`notificaciones`/`trabajo_instaladores`) como oficial, con la mejor evidencia disponible en ese momento. Una ronda posterior del mismo Sprint 4.0.1 (Database Synchronization Audit) recibió un `pg_dump` real de Producción que reveló un modelo distinto y ya vigente (`empresas`/`tiendas`/`admins`/`coordinadores`/`instaladores`/`trabajos`/`trabajo_instaladores`/`ofertas`) — ver `docs/database/DATABASE_DIFF.md`, `docs/database/DATABASE_INVENTORY.md` y la decisión formal en `docs/database/DATABASE_SYNC_PLAN.md` (Estrategia B: nueva línea base a partir de Producción, no incremental desde legacy). Este Sprint 4.1.1 confirma esa decisión como vigente y construye la infraestructura sobre ella. **§9.9 no se reescribe** (se conserva por trazabilidad histórica de cómo se llegó a esa conclusión intermedia) pero queda **superado** por esta sección y por `docs/database/DATABASE_SYNC_PLAN.md`.
>
> Del mismo modo, **§5 (Hooks), §6 (Servicios) y §7.1/§7.3 (Contextos/Tipos) siguen describiendo el modelo legacy** (`bids.service.ts`, `usuarios.service.ts`, `sucursales.service.ts`, RPC `seleccionar_instalador`, `AuthContext` con `{ usuario, rol, sucursalId, isMaster }`, tipos `UsuarioRow`/`TrabajoRow`/etc. de `types/database.ts`) — no se reescribieron en este Sprint (está fuera de su alcance: Fase A es "no modifica la UI/hooks/servicios existentes", solo agrega infraestructura nueva) pero también deben leerse como **superadas** por esta sección y por `docs/frontend/FRONTEND_DIFF.md`/`FRONTEND_SYNC_PLAN.md`, que documentan exhaustivamente cada campo/tabla/RPC afectado y el orden de migración recomendado.

### 14.1 Contexto y decisión (Fase A / Fase B)

Brief: "HANDYMAX - Sprint 4.1.1 - Supabase Infrastructure Integration". Objetivo: implementar la infraestructura Supabase completa (sin lógica de negocio, sin UI nueva), dejando el proyecto listo para que los Sprints funcionales trabajen sobre una base estable. Baseline oficial explícita del propio brief: `supabase/migrations/0001_initial_schema.sql` (el `pg_dump` real) -- consistente con §9.9 de esta sección/`DATABASE_SYNC_PLAN.md`.

Antes de implementar nada, se auditó el entorno de trabajo (sandbox) contra los requisitos "OBLIGATORIOS" del brief original y se detectaron 3 bloqueos de entorno, no de diseño:

1. `supabase/schema_instalaciones_current.sql` (nombre que la Fase 0 original pedía verificar) no existe -- el archivo real es `supabase/migrations/0001_initial_schema.sql`.
2. El sandbox de este entorno de trabajo bloquea con `403 host_not_allowed` tanto `registry.npmjs.org` como `supabase.com`/`*.supabase.co` (confirmado con `curl -I` contra ambos) -- no hay forma de instalar la Supabase CLI ni de conectarse a Producción real desde este entorno, independientemente de qué credenciales se proporcionen.
3. No existe `node_modules/` en el proyecto y `npm install` falla por el mismo bloqueo de red -- tampoco es posible correr `build`/`lint`/`typecheck` reales desde este entorno.

Reportados estos 3 bloqueos, el usuario confirmó la auditoría y dividió el Sprint en dos fases:

- **Fase A (este Sprint, ejecutada acá)**: toda la infraestructura que no requiere red ni conexión real -- estructura `src/lib/supabase/`, `.env.example`, Providers, servicios base, repositorios, hooks base, infraestructura de Realtime, y esta documentación. **No genera `database.generated.ts`, no ejecuta la Supabase CLI, no ejecuta `npm install`, no corre `build`/`lint`/`typecheck`, no valida conexión real** -- instrucción explícita del usuario, no una omisión.
- **Fase B (a cargo del usuario, fuera de este entorno)**: `npm install`, `supabase gen types typescript` (generando `src/types/database.generated.ts`), `npm run build`/`lint`/`typecheck`, y la validación real de conexión contra Producción. El usuario reportará los resultados de vuelta para que se adapte cualquier incompatibilidad que la Fase B detecte.

### 14.2 Infraestructura creada en Fase A

```
src/lib/supabase/
├── environment.ts   # lectura/validación de VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
├── config.ts        # TABLES/VIEWS/RPC_FUNCTIONS (nombres reales de Producción), opciones del cliente
├── client.ts         # singleton del cliente Supabase (navegador), tipado con Database
├── server.ts          # cliente con service role key -- SOLO scripts Node/Edge Functions futuras, nunca el navegador
├── realtime.ts       # infraestructura genérica de canales/Presence/Broadcast (Fase 7 -- sin eventos de negocio)
└── index.ts          # barrel público (NO reexporta server.ts, a propósito)

src/providers/
├── SupabaseProvider.tsx   # expone el cliente vía Context
├── SessionProvider.tsx    # rastrea Session de Supabase Auth (sin resolver rol)
├── AuthProvider.tsx        # signIn/signOut genéricos, envuelve SessionProvider
├── AppProviders.tsx        # composición recomendada de los 3 -- no montado todavía en App.tsx
└── index.ts

src/services/
├── supabase.service.ts    # cliente + normalización de errores (ServiceResult<T>)
├── auth.service.ts         # signInWithPassword/signOut/getCurrentSession/getCurrentUser/onAuthStateChange
├── database.service.ts    # selectAll/selectById/insertRow/updateById/deleteById/callRpc genéricos, tipados
└── index.ts

src/repositories/
├── base.repository.ts             # fábrica createRepository(table) -- CRUD genérico
├── admins.repository.ts
├── coordinadores.repository.ts
├── empresas.repository.ts
├── instaladores.repository.ts
├── tiendas.repository.ts
├── trabajos.repository.ts
├── trabajo-instaladores.repository.ts
├── ofertas.repository.ts
└── index.ts

src/hooks/
├── useSupabase.ts   # cliente vía Context
├── useSession.ts    # sesión cruda
├── useAuth.ts        # acciones de auth genéricas
├── useRealtime.ts   # infraestructura de canal (Fase 7, sin eventos de negocio)
└── index.ts
```

**Cobertura de tablas en `repositories/`**: el brief listaba 5 como "Ejemplo" (`admins`/`coordinadores`/`empresas`/`instaladores`/`trabajos`). Se interpretó "Ejemplo" como no-exhaustivo (mismo criterio ya aplicado y confirmado en Sprint 4.0.2 para "no limitarse a los ejemplos") y se agregaron también `tiendas`, `trabajo_instaladores` y `ofertas` -- las 8 tablas reales completas de `docs/database/DATABASE_INVENTORY.md`. Se documenta esta decisión explícitamente porque no estaba pedida literalmente.

### 14.3 Fase 0 -- procedimiento de generación de tipos (pendiente, Fase B)

Ninguna interfaz de tipo de base de datos se escribió a mano en este Sprint. Todo el código de `client.ts`, `server.ts`, `database.service.ts` y `repositories/` importa `type { Database }` desde `@/types/database.generated` -- un archivo que **todavía no existe** y que este Sprint no genera (instrucción explícita de Fase A). Procedimiento documentado para cuando el usuario ejecute la Fase B:

```bash
npm install
supabase login
supabase link --project-ref bdevkryrgmttxnlxaisd
supabase gen types typescript --linked > src/types/database.generated.ts
```

o, sin `link` previo: `supabase gen types typescript --project-id bdevkryrgmttxnlxaisd > src/types/database.generated.ts`.

Hasta que ese archivo exista, `tsc`/`vite build` fallarán con "Cannot find module '@/types/database.generated'" en cada uno de los archivos de arriba -- **comportamiento esperado de esta Fase A**, no un defecto a corregir.

### 14.4 Duplicaciones conocidas, documentadas (no resueltas en este Sprint)

Este Sprint agrega infraestructura **nueva**, sin modificar la ya existente (fuera de alcance: "NO modificar componentes/hooks/servicios/Auth/React existentes"). Esto deja, deliberadamente, dos pares de módulos con responsabilidades solapadas hasta que un Sprint futuro de reconciliación los unifique:

1. **Dos clientes de Supabase**: `src/supabase/client.ts` (Fase 3, sin tipar, sin validación de entorno estructurada, cero importadores reales según `docs/frontend/FRONTEND_AUDIT.md`) vs. `src/lib/supabase/client.ts` (este Sprint, tipado, singleton, con `environment.ts`). El primero no se tocó.
2. **Dos `AuthProvider`/`useAuth`**: `src/contexts/AuthContext.tsx` (Fase 3 de UI, legacy, expone `{ usuario, rol, sucursalId, isMaster }` tipado contra el modelo legacy) vs. `src/providers/AuthProvider.tsx`/`src/hooks/useAuth.ts` (este Sprint, genérico, expone `{ session, user, signInWithPassword, signOut }` sin resolver rol). El primero no se tocó. No importar ambos `AuthProvider`/`useAuth` en el mismo archivo sin alias explícito.

Ver `docs/frontend/FRONTEND_SYNC_PLAN.md` (Fase 3) para el plan de reconciliación ya documentado, que sigue vigente.

### 14.5 Otras inconsistencias documentales detectadas (fuera de alcance de este Sprint, reportadas)

- `supabase/README.md` §10 y `supabase/config.toml` (ambos bajo `supabase/`, fuera de la lista de archivos permitidos de este Sprint: "NO modificar supabase/") siguen declarando el modelo legacy como oficial y `major_version = 16`, respectivamente -- el segundo además contradice el `pg_dump` real auditado, que reporta PostgreSQL 17.6. Ambos quedan pendientes de corrección en un Sprint futuro con permiso explícito para tocar `supabase/`.
- `TODO.md` y `MIGRATION_STATUS.md` ya arrastraban, desde Sprint 4.0.1, afirmaciones desactualizadas sobre el modelo de datos (ver §9.8); `MIGRATION_STATUS.md` se actualiza en este mismo Sprint (Fase 9, sí está en la lista de archivos permitidos) -- ver su propia sección nueva. `TODO.md` sigue fuera de alcance.

### 14.6 Estado de aprobación de este Sprint

Conforme a los propios criterios de aprobación del brief original ("Validación real de conexión con Producción" y "Build/Typecheck/Lint exitosos" son condiciones obligatorias), **este Sprint no puede declararse aprobado todavía** -- por diseño, no por incumplimiento: esos criterios corresponden a la Fase B, que el usuario ejecutará fuera de este entorno. Fase A queda completa y lista para que Fase B la ejercite.

### 14.7 Adenda — Sprint 4.1.1C "Supabase Infrastructure Stabilization"

Tras ejecutar Fase A/Fase B localmente, el usuario reportó 5 categorías de errores reales detectados por `tsc`/`eslint` contra el código de Fase A. Este Sprint (4.1.1C) es de **estabilización únicamente** -- no agrega features, no cambia arquitectura, no toca UI/HTML/migraciones. Detalle completo en `docs/architecture/frontend/SPRINT_4_1_1C_REPORT.md`; resumen:

1. **Tipos generados**: se ratifica `src/types/database.generated.ts` como única ubicación (ya lo era desde Fase A) y se documenta formalmente en `src/types/README.md` (nuevo). Se confirma que no existen archivos de tipos duplicados.
2. **`import/no-unresolved`**: este proyecto nunca configuró `eslint-plugin-import` (confirmado leyendo `eslint.config.js`) -- los 6 comentarios `eslint-disable-next-line import/no-unresolved` escritos en Fase A silenciaban una regla inexistente, causando el error real "Definition for rule ... was not found". Se eliminaron los 6 comentarios (no se instaló el plugin, por no ser parte de la arquitectura aprobada).
3. **Realtime**: `removeRealtimeChannel` (`src/lib/supabase/realtime.ts`) usaba el tipo de retorno hand-rolled `Promise<'ok' | 'error'>`, incompleto respecto al real `RealtimeRemoveChannelResponse` exportado por `@supabase/supabase-js` (le faltaba `'timed out'`). Se reemplazó por el tipo oficial de la librería.
4. **`server.ts` y `process.env`**: se confirmó que este archivo es, y seguirá siendo, exclusivo de Node (nunca se importa desde código de navegador) -- el error de tipos era porque `tsconfig.app.json` define `"types": []` para excluir deliberadamente los globals de `@types/node` de todo `src/` (evita que APIs de Node se filtren al código de navegador). Se agregó `/// <reference types="node" />` únicamente en `server.ts`, en vez de revertir `"types": []` para todo el proyecto.
5. **Providers y `react-refresh/only-export-components`**: los 3 archivos `Provider.tsx` exportaban, cada uno, un componente + un hook interno (`useXContext`) desde el mismo archivo `.tsx` -- eso es justamente lo que la regla (configurada con `allowConstantExport: true`) señala como riesgoso para Fast Refresh. Se extrajo el objeto `Context` crudo de cada Provider a un archivo `.ts` nuevo (`supabase.context.ts`/`session.context.ts`/`auth.context.ts`), y la lógica de los hooks internos se movió a los hooks públicos correspondientes (`src/hooks/useSupabase.ts`/`useSession.ts`/`useAuth.ts`). Los `.tsx` de `providers/` ahora exportan únicamente el componente + su tipo de props.

Al igual que en Fase A, este entorno de trabajo (Claude Code) no tiene acceso de red a `registry.npmjs.org`/`supabase.com` ni `node_modules/` instalado -- por lo tanto **no se ejecutaron realmente** `npm run lint`/`npm run typecheck`/`npm run build` en este Sprint; la corrección de cada error se validó por lectura manual del código y de la configuración real del proyecto (`eslint.config.js`, `tsconfig.app.json`), no por ejecución. Ver `SPRINT_4_1_1C_REPORT.md §6` para el detalle honesto de este punto, incluyendo el hallazgo de que `database.generated.ts` sigue sin existir en este entorno pese a que el brief de este Sprint asume que Fase B ya lo generó.

### 14.8 Adenda — Sprint 4.1.1B "Adaptación definitiva al SDK oficial"

El usuario adjuntó un ZIP con el estado real del proyecto tras ejecutar localmente `npm install`, `supabase init`, `supabase link` y `supabase gen types typescript --linked --schema public` -- `src/types/database.generated.ts` **existe por primera vez** en este Sprint, con contenido genuino (verificado por forma: incluye `__InternalSupabase.PostgrestVersion: "14.5"`, `Constants`, y coincide exactamente con las 8 tablas + 1 vista + 2 funciones RPC ya documentadas en `docs/database/DATABASE_INVENTORY.md`). `supabase/.temp/postgres-version` (`17.6.1.127`) y `supabase/.temp/rest-version` (`v14.5`) son consistentes entre sí y con el `pg_dump` real auditado en Sprint 4.0.1 -- evidencia cruzada de que el `link` fue real, no simulado.

Con el `Database` real ya disponible, se detectó (por lectura, no por ejecución -- ver más abajo) un problema estructural en el patrón de acceso a datos que Fase A/4.1.1C no podían haber detectado sin el archivo real: los helpers `insertRow`/`updateById`/`callRpc`, genéricos sobre `T extends TableName`, dejan de ser seguros en cuanto `.insert()`/`.update()`/`.rpc()` reciben un valor real que debe verificarse contra la forma exacta de una tabla/función concreta -- esa verificación ocurre dentro del cuerpo de una función genérica, donde TypeScript trata la tabla/función como un parámetro de tipo abierto, no como el literal concreto que cada llamador usa. Es un límite conocido y estable de TypeScript (chequeo de cuerpo genérico una sola vez, no por instanciación), no un bug de una versión particular de `@supabase/supabase-js`.

Refactor aplicado (detalle técnico completo, con justificación línea por línea, en `docs/architecture/frontend/SPRINT_4_1_1B_REPORT.md`):

1. `selectAll`/`selectById`/`deleteById` (`src/services/database.service.ts`) siguen siendo genéricos -- son seguros (no pasan ningún valor cuya forma dependa de la tabla).
2. `insertRow`/`updateById` genéricos se eliminaron. Cada uno de los 8 archivos de `src/repositories/*.repository.ts` implementa ahora su propio `create`/`update`, usando `TABLES.<tabla>` como literal concreto -- sin ningún cast (`as any`/`as never`/`@ts-ignore`).
3. `base.repository.ts` cambia la firma de `createRepository(table, writeOps)` (antes `createRepository(table)`) para recibir esas dos implementaciones inyectadas -- el contrato público `Repository<T>` (`getAll`/`getById`/`create`/`update`/`remove`) no cambió.
4. `callRpc<TArgs, TResult>` genérico (sin ninguna verificación real contra `Database['public']['Functions']`) se reemplazó por dos funciones explícitas, `callAsignarInstalador`/`callSubmitBid`, cada una tipada directamente contra `Database['public']['Functions'][<literal>]['Args'|'Returns']`.

Como en Fase A y en 4.1.1C, este entorno de trabajo sigue sin acceso de red (`registry.npmjs.org`/`supabase.com` responden `403 host_not_allowed`, re-confirmado en este Sprint) y sin `node_modules/` -- por lo tanto tampoco en este Sprint se pudieron ejecutar realmente `npm run lint`/`typecheck`/`build`/`dev`. El propio `tsconfig.app.tsbuildinfo` incluido en el ZIP del usuario (generado por su `tsc` real, no por este entorno) reporta `"errors": true` para la última compilación local conocida -- confirmación honesta, no fabricada, de que había errores reales pendientes al momento de este Sprint. Detalle completo, incluyendo los riesgos de que un aspecto de este refactor (particularmente los tipos de Realtime, dado el salto de versión de `@supabase/supabase-js` a `2.110.0`, muy posterior al corte de entrenamiento de este modelo) no pudo verificarse contra el código fuente real de la librería instalada, en `docs/architecture/frontend/SPRINT_4_1_1B_REPORT.md §7`.
