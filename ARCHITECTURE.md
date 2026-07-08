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
│   └── migrations/
│       └── 0001_initial_schema.sql        # copia literal de handymax_supabase_schema_v3.sql, sin modificar
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

### 9.6 RLS — columnas del cliente (riesgo crítico, ver §11.2)

Todo el código de la aplicación debe leer trabajos **siempre** desde `trabajos_vista`, nunca desde `trabajos`, para cualquier usuario que no sea coordinador/admin. `trabajos.service.ts` centraliza esto para que sea imposible que un componente "se equivoque" y consulte la tabla base.

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
