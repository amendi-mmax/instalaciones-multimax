# FRONTEND_DIFF.md — Comparación Frontend vs. Nueva Baseline (Producción)

**Referencia de esquema real**: `docs/database/DATABASE_INVENTORY.md` / `docs/database/DATABASE_DIFF.md`.

**Método**: para cada archivo señalado en `FRONTEND_AUDIT.md` con acoplamiento Medio o Crítico, se contrasta cada campo/tabla/función/enum que el frontend asume contra el inventario real de Producción, y se clasifica el hallazgo.

---

## 1. Tablas que el frontend asume y que **ya no existen** en Producción

| Tabla asumida (frontend) | Dónde se usa | Reemplazo real en Producción |
|---|---|---|
| `usuarios` | `types/database.ts` (`UsuarioRow`), `types/domain.ts` (`Usuario`, alias `Instalador`), `lib/mappers.ts`, `contexts/AuthContext.tsx` (comentario: `SELECT * FROM usuarios WHERE auth_id = auth.uid()`) | Repartida en 3 tablas: `admins`, `coordinadores`, `instaladores` |
| `sucursales` | `types/database.ts` (`SucursalRow`), `types/domain.ts` (`Sucursal`), `lib/mappers.ts`, comentarios en `constants/index.ts` ("la lista real de sucursales vendrá de Supabase, tabla `sucursales`") | `tiendas` |
| `bids` | `types/database.ts` (`BidRow`), `types/domain.ts` (`Bid`), `lib/mappers.ts` | `ofertas` (columnas distintas — ver sección 3) |
| `zonas_cobertura` | `types/database.ts` (`ZonaCoberturaRow`), `types/domain.ts` (`ZonaCobertura`), `lib/mappers.ts` | No existe reemplazo directo — `provincia`/`zona` son ahora columnas de texto libre en `instaladores`/`tiendas`/`trabajos`, sin tabla catálogo |
| `notificaciones` | `types/database.ts` (`NotificacionRow`), `types/domain.ts` (`Notificacion`) | El concepto de notificación por instalador vive dentro de `trabajo_instaladores` (no hay tabla dedicada) |

## 2. Tablas nuevas en Producción que el frontend **no contempla en absoluto**

| Tabla real | Referenciada en algún tipo/mapper/componente del frontend |
|---|---|
| `admins` | No |
| `coordinadores` | No (solo existe el concepto de rol `'coordinador'` como string dentro de `Rol`, no una entidad/tabla propia) |
| `instaladores` | No como tabla — sí existe el alias `Instalador = Usuario` en `domain.ts`, pero apunta a la interfaz `Usuario` (heredera de `usuarios`), no a una tabla `instaladores` independiente |
| `tiendas` | No |
| `trabajo_instaladores` | No — no hay ningún tipo ni mapper que modele esta tabla ni el concepto de "notificación de trabajo a instalador con estado" |

## 3. Columnas específicas: eliminadas / renombradas / no contempladas

### 3.1 En `trabajos`

| Campo que usa el frontend | Fuente en frontend | Estado real en Producción |
|---|---|---|
| `sucursal_id` / `sucursalId` | `TrabajoRow.sucursal_id`, `Trabajo.sucursalId`, `mappers.ts` | Renombrado a `tienda_id` (y la tabla destino es `tiendas`, no `sucursales`) |
| `phase` | `TrabajoRow.phase` (tipo `TrabajoPhase`), `Trabajo.phase` | Renombrado a `estado`, y además dejó de ser un ENUM con CHECK — ahora es `text` libre sin validación en base de datos |
| `published_at` / `publishedAt` | `TrabajoRow.published_at`, `Trabajo.publishedAt`, prop `publishedAt` de `LiveCountdown` | Renombrado a `publicado_at` |
| `bid_mins` / `bidMins` | `TrabajoRow.bid_mins`, `Trabajo.bidMins`, prop `bidMins` de `LiveCountdown`, campo `bidMins` de `PublishForm` (`publish-modal.tsx`), `LIVECOUNTDOWN_DEMO_BID_MINS` en `RootLayout.tsx` | Renombrado a `bid_minutos`, y el valor por defecto cambió de 10 (legacy) a 5 (Producción) — el mock local `bidMins = 5` de `RootLayout`/`publish-modal.tsx` coincide **por casualidad** con el nuevo default, no porque haya sido actualizado a propósito |
| `assigned_bid_id` / `assignedBidId` | `TrabajoRow.assigned_bid_id`, `Trabajo.assignedBidId` | Eliminado. Reemplazado por `instalador_asignado_id`, que además cambia de tipo de relación: ya no apunta a una oferta (`bids`/`ofertas`), apunta **directamente** a `instaladores(id)` |
| `cliente_direccion` / `clienteDireccion` | `TrabajoRow.cliente_direccion`, `Trabajo.clienteDireccion` | Renombrado a `direccion_exacta` |
| `updated_at` | `TrabajoRow.updated_at` | Eliminado — no existe en Producción |
| — (no contemplados) | — | Producción tiene además `codigo`, `fecha`, `hora`, `extra`, `urgente`, `contacto_visible_hasta`, `asignado_at`, que no existen en `TrabajoRow`/`Trabajo` |

### 3.2 En el equivalente de "usuario" (`usuarios` → `admins`/`coordinadores`/`instaladores`)

| Campo que usa el frontend (`UsuarioRow`/`Usuario`) | Estado real en Producción |
|---|---|
| `auth_id` / `authId` | Eliminado como columna separada — en Producción, `id` de `admins`/`coordinadores`/`instaladores` **es** directamente la FK a `auth.users(id)` (no hay una columna `auth_id` adicional) |
| `sucursal_id` / `sucursalId` | Solo existe como `tienda_id`, y únicamente en `coordinadores` (no en `admins` ni en `instaladores`) |
| `empresa_nombre` / `empresaNombre` | No existe en ninguna tabla real — sería un JOIN a `empresas.nombre`, nunca una columna propia |
| `docs_completos` / `docsCompletos` | Renombrado a `documentos_ok`, y solo existe en `instaladores` (no aplica a `admins`/`coordinadores`) |
| `rol` | En Producción no es una columna de una tabla única — es la tabla misma la que determina el rol (`admins`/`coordinadores`/`instaladores`), excepto por `coordinadores.rol` (`text`, default `'coordinador'`, también puede valer `'admin'`), que introduce una ambigüedad adicional ya señalada en `DATABASE_DIFF.md` |
| `rating`, `cumplimiento`, `aceptacion` | Existen en `instaladores` con los mismos nombres — **compatibles**, pero solo aplican a instaladores, no a los otros dos roles como implica la interfaz única `Usuario` |
| `telefono`, `email`, `activo` | Existen con los mismos nombres, repartidos de forma distinta entre `admins`/`coordinadores`/`instaladores` (por ejemplo `coordinadores` no tiene `email` ni `telefono`) |

### 3.3 En `bids` → `ofertas`

| Campo que usa el frontend (`BidRow`/`Bid`) | Estado real en Producción (`ofertas`) |
|---|---|
| `fecha_disponible` / `fechaDisponible` | Renombrado a `dia` |
| `hora_disponible` / `horaDisponible` | Renombrado a `hora` |
| `estado` (tipo `BidEstado`: `'pendiente'\|'seleccionado'\|'rechazado'`) | **Eliminado por completo** — `ofertas` no tiene columna `estado`; el estado de una oferta se rastrea ahora en `trabajo_instaladores.estado`, con un vocabulario distinto (`'notificado'`/`'respondido'`/`'seleccionado'`/`'confirmado'`/`'perdido'`) |
| `respondido_at` / `respondidoAt` | No existe en `ofertas` — existe como `trabajo_instaladores.respondido_at` |

## 4. RPC (funciones) inexistentes vs. nuevas

| RPC que el frontend anticipa | Dónde | Estado real |
|---|---|---|
| Ninguna función RPC está referenciada literalmente en el frontend (no hay llamadas `.rpc(...)` en ningún archivo — confirmado por búsqueda exhaustiva) | — | — |

| RPC real en Producción, no contemplada por el frontend | Impacto |
|---|---|
| `asignar_instalador(p_trabajo_id, p_instalador_id)` | El frontend no tiene ningún flujo/handler que llame a esta función — la futura pantalla de "asignar instalador" del coordinador deberá construirse contra esta firma, no contra un `UPDATE` directo a un campo `assigned_bid_id` |
| `submit_bid(p_trabajo_id, p_precio, p_dia, p_hora, p_comentario)` | El futuro formulario de "enviar oferta" del instalador deberá llamar a esta función (que además usa `auth.uid()` internamente, no recibe `instalador_id` como parámetro) — el `PublishModal`/formularios actuales no anticipan este contrato |

## 5. Queries y JOINs incompatibles

No hay queries reales todavía (ver `FRONTEND_AUDIT.md`, sección 0), por lo que no hay queries "que fallen en ejecución". El riesgo es de **diseño futuro**: si los servicios/hooks que se construyan en el próximo Sprint se basan en `lib/mappers.ts` o en las interfaces de `types/database.ts` tal como están hoy, todas las consultas resultantes fallarían contra Producción (nombres de tabla y columna inexistentes). Este es un riesgo de "incompatibilidad prospectiva", no un bug actual.

## 6. Policies RLS asumidas incorrectamente

El frontend no contiene ninguna lógica que dependa explícitamente de una policy RLS particular (no hay manejo de errores de RLS, ni componentes condicionados a "si tengo permiso"). El único acoplamiento indirecto es conceptual: `AuthContext.tsx` asume un modelo de sesión en el que basta con un `rol` para saber qué puede ver el usuario. En Producción, el acceso real está gobernado por las 14 policies documentadas en `DATABASE_INVENTORY.md`, que:
- No dan ningún acceso a `admins`, `coordinadores`, `empresas`, `tiendas` vía `anon`/`authenticated` (0 policies en esas 4 tablas) — cualquier pantalla futura que intente leer el perfil propio de un coordinador o admin directamente desde esas tablas fallará silenciosamente (0 filas devueltas) hasta que se agreguen policies.
- Dependen de `auth.uid()` coincidiendo exactamente con el `id` de `instaladores`/`coordinadores` — compatible con el enfoque ya usado en el comentario de `AuthContext.tsx` (`auth.uid()`), solo que la tabla de destino cambia.

## 7. Roles legacy / Enums legacy / Checks legacy

| Elemento legacy en el frontend | Archivo | Estado en Producción |
|---|---|---|
| `Rol = 'coordinador' \| 'instalador' \| 'admin'` | `types/enums.ts` | Los 3 valores como concepto siguen siendo válidos, pero ya no provienen de un ENUM de base de datos ni de una columna `usuarios.rol` — provienen de en qué tabla física está la fila (`admins`/`coordinadores`/`instaladores`), salvo la ambigüedad de `coordinadores.rol = 'admin'` |
| `TrabajoPhase = 'live' \| 'assigned' \| 'completed' \| 'cancelled'` | `types/enums.ts` | No existe como ENUM en Producción; `trabajos.estado` es `text` libre con default `'live'` — el valor `'live'` coincide, pero `'assigned'`/`'completed'`/`'cancelled'` no están confirmados como el vocabulario real usado por las funciones de Producción (`asignar_instalador` solo confirma el uso de `'assigned'`) |
| `BidEstado = 'pendiente' \| 'seleccionado' \| 'rechazado'` | `types/enums.ts` | No existe — ni la columna (`ofertas` no tiene `estado`) ni el vocabulario (el vocabulario real vive en `trabajo_instaladores.estado`: `'notificado'`/`'respondido'`/`'seleccionado'`/`'confirmado'`/`'perdido'`, sin ningún valor `'pendiente'` ni `'rechazado'`) |
| `NotificacionCanal = 'sms' \| 'whatsapp' \| 'push' \| 'email'` | `types/enums.ts` | No existe — no hay tabla de notificaciones ni columna de canal en Producción |
| Los 3 CHECK constraints legacy que sustentaban estos ENUMs (ver `DATABASE_DIFF.md`) | (implícitos, no había código de frontend que los referenciara directamente) | 0 CHECK constraints en Producción — ninguno de estos valores está validado a nivel de base de datos |

## 8. Tipos que ya no existen / interfaces obsoletas / mappers obsoletos / constantes obsoletas

| Elemento | Archivo | Motivo |
|---|---|---|
| `EmpresaRow`, `SucursalRow`, `UsuarioRow`, `ZonaCoberturaRow`, `TrabajoRow`, `BidRow`, `NotificacionRow`, `TrabajoVistaRow` | `types/database.ts` | Todas obsoletas frente al esquema real — ninguna coincide columna por columna con su tabla homónima (cuando existe) en Producción |
| `Empresa`, `Sucursal`, `Usuario`, `Instalador` (alias), `ZonaCobertura`, `Trabajo`, `Bid`, `Notificacion` | `types/domain.ts` | Obsoletas por la misma razón (derivan de las `*Row` obsoletas) |
| `mapEmpresaRowToDomain`, `mapSucursalRowToDomain`, `mapUsuarioRowToDomain`, `mapZonaCoberturaRowToDomain`, `mapTrabajoRowToDomain`, `mapBidRowToDomain` | `lib/mappers.ts` | Obsoletas — mapean campo a campo desde columnas que ya no existen. Nota atenuante: **no tienen ningún importador**, por lo que su obsolescencia no afecta a ningún componente hoy |
| `Rol`, `TrabajoPhase`, `BidEstado`, `NotificacionCanal` | `types/enums.ts` | Ver sección 7 |
| Comentarios que documentan la futura fuente de datos como tablas legacy (`usuarios`, `sucursales`, `trabajos` en su forma legacy) | `constants/index.ts` (múltiples JSDoc), `contexts/AuthContext.tsx` | No son código ejecutable, pero orientarían mal a quien implemente los futuros servicios si no se corrigen antes de ese Sprint |
| `InstallerMock`, `MisJobMock`, `TrabajoMock` (en `constants/index.ts`) | `constants/index.ts` | No son "obsoletos" en el sentido de romperse — son mocks locales con su propia forma ad-hoc, no atada a ningún esquema. Se listan aquí solo porque el brief pide detectar "constantes obsoletas": estrictamente no lo son (siguen renderizando la UI actual sin error), pero **deberán ser reemplazadas** cuando se conecten los datos reales, y sus nombres de campo (`bidMins`, `sucursal`, `cumpl`, `acept`, `prom`, `disp`, `docs`, `susp`) no coinciden con los nombres reales de Producción, lo que añade trabajo de mapeo en ese momento |

## 9. Consultas/campos específicos pedidos por el brief — verificación puntual

### 9.1 Términos legacy buscados explícitamente (todos confirmados presentes)

`usuarios`, `sucursales`, `bids`, `zonas_cobertura`, `notificaciones`, `phase`, `published_at`, `assigned_bid_id`, `auth_id`, `empresa_nombre`, `docs_completos`, `updated_at` — **todos** aparecen en `types/database.ts`/`types/domain.ts`/`lib/mappers.ts`/`contexts/AuthContext.tsx`, tal como se detalla en las secciones 1 a 3 de este documento.

### 9.2 Términos de Producción buscados explícitamente (todos confirmados ausentes)

`admins`, `coordinadores` (como tabla), `instaladores` (como tabla), `tiendas`, `ofertas`, `estado` (como reemplazo de `phase`/`BidEstado`), `publicado_at`, `instalador_asignado_id`, `documentos_ok`, `direccion_exacta`, `codigo`, `fecha`, `hora`, `contacto_visible_hasta` — **ninguno** de estos nombres aparece en `src/` (búsqueda exhaustiva por patrón exacto, cero coincidencias). El frontend no anticipa ni un solo nombre del esquema real de Producción todavía.

---

## 10. Resumen de impacto por hallazgo

| # | Qué rompe | Archivo(s) afectado(s) | Componente/pantalla afectada | Servicio afectado | Tipo afectado | Prioridad |
|---|---|---|---|---|---|---|
| 1 | Contrato de datos crudos (`*Row`) no coincide con ninguna tabla real | `types/database.ts` | Ninguna todavía (no conectado) | El futuro servicio de datos que se construya sobre estos tipos | `EmpresaRow`, `SucursalRow`, `UsuarioRow`, `ZonaCoberturaRow`, `TrabajoRow`, `BidRow`, `NotificacionRow` | **Alta** (bloquea cualquier integración real, pero no bloquea nada hoy) |
| 2 | Modelos de dominio derivan de tipos obsoletos | `types/domain.ts` | Ninguna todavía | Igual que #1 | `Empresa`, `Sucursal`, `Usuario`, `Instalador`, `ZonaCobertura`, `Trabajo`, `Bid`, `Notificacion` | **Alta** |
| 3 | Mappers traducen columnas inexistentes | `lib/mappers.ts` | Ninguna (sin importadores) | N/A | 6 funciones `map*RowToDomain` | **Media** (huérfano hoy, pero hay que reescribirlo antes de usarlo) |
| 4 | Vocabulario de estados/roles sin respaldo real | `types/enums.ts` | `HeaderRoleSwitch`, `Header`, `HeaderStatus`, `RootLayout`, `AuthContext` (vía `Rol`); ninguna pantalla usa `TrabajoPhase`/`BidEstado`/`NotificacionCanal` todavía | N/A | `Rol`, `TrabajoPhase`, `BidEstado`, `NotificacionCanal` | **Alta** para `TrabajoPhase`/`BidEstado`/`NotificacionCanal` (0% de correspondencia); **Media** para `Rol` (vocabulario válido, estructura distinta) |
| 5 | Sesión planeada contra tabla/columna inexistente | `contexts/AuthContext.tsx` | Toda pantalla que dependa de sesión (todas, eventualmente) | El futuro servicio de Auth | `Usuario`, `Rol` | **Alta** |
| 6 | Selector de "sucursal activa" apunta a un concepto (`sucursales`) que ya no existe como tabla | `sucursal-select.tsx`, `RootLayout.tsx`, `header-status.tsx`, `header.tsx` | Header, selector de sucursal del Coordinador | N/A (mock hoy) | — | **Media** |
| 7 | `PublishModal`/`LiveCountdown` usan nombres de campo legacy (`bidMins`, `publishedAt`) | `publish-modal.tsx`, `live-countdown.tsx`, `RootLayout.tsx` | Modal de publicar trabajo, contador de bid en vivo | N/A (mock hoy) | `PublishForm`, `LiveCountdownProps` | **Media** |
| 8 | `MasterCalendar` usa `sucursal`/`estado` con vocabulario propio, no el real | `master-calendar.tsx`, `constants/index.ts` (`TRABAJOS`, `SUSCOL`, `ESTADO`) | Calendario maestro del Admin | N/A (mock hoy) | `TrabajoMock` | **Media** |
| 9 | `InstallerJobs`/`AdminInstaladores`/`Radar` usan mocks con nombres propios no alineados a `instaladores` real | `installer-jobs.tsx`, `admin-instaladores.tsx`, `radar.tsx`, `constants/index.ts` (`INSTALLERS`, `MISJOBS`) | Panel de instalador, gestión de instaladores del Admin, radar del Coordinador | N/A (mock hoy) | `InstallerMock`, `MisJobMock` | **Media** |
| 10 | Ninguna función RPC real (`asignar_instalador`, `submit_bid`) está contemplada en ningún flujo | Todo el frontend (ausencia, no un archivo específico) | Futuras pantallas de asignación de instalador y envío de oferta | Futuro servicio de asignación/ofertas | N/A | **Alta** (bloqueante para el Sprint funcional que implemente estos flujos) |
| 11 | 4 tablas sin policies RLS accesibles (`admins`, `coordinadores`, `empresas`, `tiendas`) no contempladas por el frontend | `contexts/AuthContext.tsx` (conceptualmente) | Cualquier pantalla que necesite leer perfil de coordinador/admin o datos de empresa/tienda | Futuro servicio de Auth/perfil | N/A | **Alta** (requiere decisión de backend antes de construir esas pantallas, ver `docs/database/DATABASE_SYNC_PLAN.md` sección 4) |

---

## Mapeo Legacy → Producción

Tabla consolidada de todo elemento (tabla, columna, tipo/enum, o función) donde el Modelo legacy y la Producción difieren, se agrega o se elimina. Es el resumen de referencia rápida de las secciones 1 a 8 de este documento — para el detalle/justificación de cada fila, ver la sección correspondiente.

### Tablas

| Legacy | Producción | Detalle |
|---|---|---|
| `usuarios` | `admins` / `coordinadores` / `instaladores` | Sección 1 y 3.2 — una tabla única con discriminador `rol` se reparte en 3 tablas separadas, cada una con `id` como FK directa a `auth.users(id)` |
| `sucursales` | `tiendas` | Sección 1 |
| `bids` | `ofertas` | Sección 1 y 3.3 — mismo propósito general, columnas distintas (ver más abajo) |
| `zonas_cobertura` | *(sin tabla equivalente)* | Sección 1 — `provincia`/`zona` pasan a ser columnas de texto libre en `instaladores`/`tiendas`/`trabajos`, sin tabla catálogo ni FK |
| `notificaciones` | *(sin tabla equivalente — absorbida por `trabajo_instaladores`)* | Sección 1 |
| *(no existía)* | `trabajo_instaladores` | Sección 2 — tabla nueva, sin equivalente legacy; rastrea la notificación de un trabajo a un instalador y su `estado` |
| *(no existía)* | `admins` (como tabla independiente) | Sección 2 |
| *(no existía)* | `coordinadores` (como tabla independiente) | Sección 2 |
| *(no existía)* | `instaladores` (como tabla independiente) | Sección 2 |
| *(no existía)* | `tiendas` (como tabla independiente) | Sección 2 |

### Columnas de `trabajos`

| Legacy | Producción | Detalle |
|---|---|---|
| `sucursal_id` | `tienda_id` | Sección 3.1 |
| `phase` | `estado` | Sección 3.1 — además pierde el ENUM/CHECK, pasa a `text` libre |
| `published_at` | `publicado_at` | Sección 3.1 |
| `bid_mins` | `bid_minutos` | Sección 3.1 — default cambia de 10 a 5 |
| `assigned_bid_id` | `instalador_asignado_id` | Sección 3.1 — cambia también el destino de la FK: de `bids`/`ofertas` a `instaladores` directamente |
| `cliente_direccion` | `direccion_exacta` | Sección 3.1 |
| `updated_at` | *(eliminada, sin equivalente)* | Sección 3.1 |
| *(no existía)* | `codigo` | Sección 3.1 — columna nueva, NOT NULL |
| *(no existía)* | `fecha` | Sección 3.1 — columna nueva, NOT NULL (`text`) |
| *(no existía)* | `hora` | Sección 3.1 — columna nueva, NOT NULL |
| *(no existía)* | `extra` | Sección 3.1 — columna nueva |
| *(no existía)* | `urgente` | Sección 3.1 — columna nueva, NOT NULL boolean |
| *(no existía)* | `contacto_visible_hasta` | Sección 3.1 — columna nueva |
| *(no existía)* | `asignado_at` | Sección 3.1 — columna nueva |

### Columnas de "usuario" (`usuarios` → `admins`/`coordinadores`/`instaladores`)

| Legacy | Producción | Detalle |
|---|---|---|
| `auth_id` | *(eliminada — `id` mismo es la FK a `auth.users`)* | Sección 3.2 |
| `sucursal_id` | `tienda_id` (solo en `coordinadores`) | Sección 3.2 |
| `empresa_nombre` | *(eliminada — requiere JOIN a `empresas.nombre`)* | Sección 3.2 |
| `docs_completos` | `documentos_ok` (solo en `instaladores`) | Sección 3.2 |
| `rol` (columna única de `usuarios`) | Determinado por la tabla (`admins`/`coordinadores`/`instaladores`); además `coordinadores.rol` persiste como `text` libre con posible valor `'admin'` | Sección 3.2 — ambigüedad señalada también en `docs/database/DATABASE_DIFF.md` |
| `rating`, `cumplimiento`, `aceptacion` | Iguales, pero solo en `instaladores` | Sección 3.2 |
| `telefono`, `email`, `activo` | Iguales, repartidos de forma distinta entre las 3 tablas | Sección 3.2 |

### Columnas de `bids` → `ofertas`

| Legacy | Producción | Detalle |
|---|---|---|
| `fecha_disponible` | `dia` | Sección 3.3 |
| `hora_disponible` | `hora` | Sección 3.3 |
| `estado` (`BidEstado`) | *(eliminada — el estado vive ahora en `trabajo_instaladores.estado`, vocabulario distinto)* | Sección 3.3 |
| `respondido_at` | *(eliminada de `ofertas` — existe como `trabajo_instaladores.respondido_at`)* | Sección 3.3 |

### Tipos/Enums y validación

| Legacy | Producción | Detalle |
|---|---|---|
| `Rol` (`'coordinador'\|'instalador'\|'admin'`) | Vocabulario válido, pero ya no es una columna de ENUM — lo determina la tabla física | Sección 7 |
| `TrabajoPhase` (`'live'\|'assigned'\|'completed'\|'cancelled'`) | *(sin ENUM — `trabajos.estado` es `text` libre; solo `'live'`/`'assigned'` confirmados por el código real)* | Sección 7 |
| `BidEstado` (`'pendiente'\|'seleccionado'\|'rechazado'`) | *(eliminado — reemplazado conceptualmente por `trabajo_instaladores.estado`: `'notificado'`/`'respondido'`/`'seleccionado'`/`'confirmado'`/`'perdido'`)* | Sección 7 |
| `NotificacionCanal` (`'sms'\|'whatsapp'\|'push'\|'email'`) | *(eliminado, sin reemplazo)* | Sección 7 |
| 3 CHECK constraints (respaldo de los ENUMs anteriores) | 0 CHECK constraints | Sección 7 |

### Funciones (RPC)

| Legacy | Producción | Detalle |
|---|---|---|
| *(ninguna función RPC referenciada por el frontend)* | `asignar_instalador(p_trabajo_id, p_instalador_id)` | Sección 4 — función nueva, no contemplada |
| *(ninguna función RPC referenciada por el frontend)* | `submit_bid(p_trabajo_id, p_precio, p_dia, p_hora, p_comentario)` | Sección 4 — función nueva, no contemplada |

### Tipos/interfaces de frontend afectados (referencia cruzada)

| Elemento de frontend | Ubicación | Estado tras este mapeo |
|---|---|---|
| `EmpresaRow`, `SucursalRow`, `UsuarioRow`, `ZonaCoberturaRow`, `TrabajoRow`, `BidRow`, `NotificacionRow`, `TrabajoVistaRow` | `types/database.ts` | Obsoletos — ver sección 8 y `FRONTEND_SYNC_PLAN.md` Fase 0/Fase 1 |
| `Empresa`, `Sucursal`, `Usuario`, `Instalador`, `ZonaCobertura`, `Trabajo`, `Bid`, `Notificacion` | `types/domain.ts` | Obsoletos — ver sección 8 y `FRONTEND_SYNC_PLAN.md` Fase 1 |
| `map*RowToDomain` (6 funciones) | `lib/mappers.ts` | Obsoletos — ver sección 8 y `FRONTEND_SYNC_PLAN.md` Fase 2 |
