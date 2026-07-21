# FRONTEND_AUDIT.md — Inventario Completo del Frontend

**Sprint**: 4.0.2 — Frontend Synchronization Audit (auditoría de solo lectura, sin modificaciones de código).

**Fuente de verdad utilizada**: `supabase/migrations/0001_initial_schema.sql` (esquema real de Producción, ya aprobado como baseline oficial — Estrategia B, ver `docs/database/DATABASE_SYNC_PLAN.md`), y los documentos de la auditoría de base de datos previa (`docs/database/DATABASE_DIFF.md`, `docs/database/DATABASE_INVENTORY.md`).

**Alcance recorrido**: `src/` completo (76 archivos `.ts`/`.tsx`). El brief pedía revisar además `src/services`, `src/api`, `src/hooks`, `src/pages`, `src/features`, `src/utils` — estos directorios **existen pero están vacíos** (contienen únicamente un `.gitkeep`); se documenta explícitamente en la sección 0 en vez de omitirlos en silencio.

---

## 0. Hallazgo estructural previo (condiciona toda la lectura del resto del documento)

Antes de listar archivo por archivo, es indispensable dejar constancia de un hecho que cambia la interpretación de todo lo que sigue:

**El frontend (Fase 3, Sprints 3.1–3.16) es un prototipo de interfaz sin integración real a Supabase.** Se verificó de forma exhaustiva:

- `src/services/`, `src/hooks/`, `src/features/`, `src/pages/`, `src/utils/` existen como carpetas pero solo contienen `.gitkeep` — **cero archivos de código**.
- Búsqueda de `.from(`, `.select(`, `.insert(`, `.update(`, `.rpc(`, `.upsert(`, `.delete(` en todo `src/`: **cero resultados**. No existe ni una sola consulta real a Supabase en todo el proyecto.
- Solo 5 archivos mencionan la palabra "supabase" en todo `src/`, y de ellos solo `src/supabase/client.ts` instancia el cliente (sin conectarlo a Auth ni Realtime todavía, según su propio comentario).
- Toda la UI ya migrada (Sprints 3.1–3.16) consume **datos mock locales** definidos en `src/constants/index.ts` (`TRABAJOS`, `MISJOBS`, `INSTALLERS`, `SUSCOL`, `ESTADO`, `REVEAL`, etc.), con formas de datos propias y ad-hoc, **no** tipadas contra `src/types/database.ts` ni `src/types/domain.ts`.

En consecuencia, existen dos capas completamente distintas dentro de `src/`, con niveles de riesgo muy diferentes:

| Capa | Archivos | Conectada a componentes reales | Acoplamiento al modelo de datos |
|---|---|---|---|
| **Capa de UI activa** (componentes ya migrados, Sprints 3.1–3.16) | ~45 archivos en `components/`, `layouts/`, `routes/` | Sí — es lo que se renderiza | Bajo: consume mocks locales con nombres de campo propios, no los tipos `*Row`/dominio |
| **Capa de contrato de datos futura** (scaffold preparado, aún no conectado) | `types/database.ts`, `types/domain.ts`, `types/enums.ts`, `lib/mappers.ts`, `supabase/client.ts`, `contexts/AuthContext.tsx` | No — `lib/mappers.ts` no tiene ningún importador en todo el proyecto; `types/database.ts` solo lo importa `mappers.ts` | **Crítico**: modelado 100% sobre el esquema legacy (`usuarios`, `sucursales`, `bids`, `phase`, `assigned_bid_id`, etc.) |

Esta distinción es la razón por la que el impacto real de sincronizar el frontend con Producción es **mucho menor de lo que parecería** con una lectura superficial: la mayoría de los componentes no necesitan cambios porque no dependen de los tipos legacy — solo la capa de contrato de datos (that scaffold) sí, y esa capa aún no está conectada a nada, por lo que corregirla no toca ningún componente visual.

La única excepción real de acoplamiento activo es el tipo `Rol` (`src/types/enums.ts`), usado por 5 archivos de la capa de UI activa para el selector de rol (`HeaderRoleSwitch`, `RootLayout`, `Header`, `HeaderStatus`, `AuthContext`) — ver detalle en la sección 3 y en `FRONTEND_DIFF.md`.

**Nota sobre "servicios"/"hooks" vs. lógica de negocio ya existente**: es importante no confundir "no existen servicios ni hooks reales" (cierto, ver arriba) con "no existe lógica de negocio". Sí existe, distribuida fuera de las carpetas convencionales `services`/`hooks`: en `src/lib` (`mappers.ts`, la capa de traducción Row→dominio; `utils.ts`, utilidades como `fmt`/`cn`), en `src/contexts` (`AuthContext.tsx`, la forma prevista de la sesión), en `src/constants` (`index.ts`, los catálogos/mocks que hoy alimentan toda la UI) y en `src/supabase` (`client.ts`, el punto único de acceso al cliente). Estos 4 archivos/carpetas **ya fueron auditados** en la sección 1 de este documento (1.1 a 1.5) y representan, en conjunto, la capa inicial de integración del proyecto — el andamiaje sobre el que se construirán los futuros `services`/`hooks` (Fase 6 de `FRONTEND_SYNC_PLAN.md`), no un vacío total como podría sugerir la ausencia de esas dos carpetas.

---

## 1. Inventario por directorio

### 1.1 `src/types/` (3 archivos — capa de contrato, 100% legacy)

| Archivo | Descripción | Modelo utilizado | Incompatibilidad |
|---|---|---|---|
| `database.ts` | 7 interfaces `*Row` (1:1 con columnas snake_case): `EmpresaRow`, `SucursalRow`, `UsuarioRow`, `ZonaCoberturaRow`, `TrabajoRow`, `BidRow`, `NotificacionRow`, más `TrabajoVistaRow` | Legacy | **Crítico** |
| `domain.ts` | Modelos de dominio camelCase equivalentes: `Empresa`, `Sucursal`, `Usuario` (con alias `Instalador = Usuario`), `ZonaCobertura`, `Trabajo`, `Bid`, `Notificacion`, más `JobEngagementState` (tipo de UI derivado, sin tabla) | Legacy | **Crítico** |
| `enums.ts` | `Rol`, `TrabajoPhase`, `BidEstado`, `NotificacionCanal`, `TipoInmueble` | Legacy | **Crítico** (`TrabajoPhase`/`BidEstado`/`NotificacionCanal` no existen en Producción) / **Medio** para `Rol` (los 3 valores de string siguen siendo válidos como concepto, pero en Producción no son un ENUM de una tabla única sino 3 tablas separadas) |

### 1.2 `src/lib/` (2 archivos)

| Archivo | Descripción | Modelo utilizado | Incompatibilidad |
|---|---|---|---|
| `mappers.ts` | 6 funciones `map*RowToDomain` que traducen `*Row` → dominio, campo por campo | Legacy | **Crítico** (pero sin ningún importador — huérfano) |
| `utils.ts` | Utilidades genéricas (`cn`, `fmt`, etc.), sin relación con el modelo de datos | N/A | Ninguna |

### 1.3 `src/supabase/` (1 archivo)

| Archivo | Descripción | Modelo utilizado | Incompatibilidad |
|---|---|---|---|
| `client.ts` | Instancia única de `createClient()`. No ejecuta consultas ni conecta Auth/Realtime todavía | N/A (agnóstico al esquema) | Ninguna |

### 1.4 `src/contexts/` (1 archivo)

| Archivo | Descripción | Modelo utilizado | Incompatibilidad |
|---|---|---|---|
| `AuthContext.tsx` | Contexto de sesión placeholder. Tipa `usuario: Usuario \| null` (dominio legacy) y `rol: Rol \| null`. Comentario interno documenta la futura consulta real como `SELECT * FROM usuarios WHERE auth_id = auth.uid()` | Legacy | **Crítico** (tanto el tipo `Usuario` como la consulta planeada en el comentario referencian directamente la tabla `usuarios` y la columna `auth_id`, inexistentes en Producción) |

### 1.5 `src/constants/` (1 archivo, 693 líneas)

| Archivo | Descripción | Modelo utilizado | Incompatibilidad |
|---|---|---|---|
| `index.ts` | Catálogos y mocks estáticos transcritos verbatim del prototipo HTML: `SUCURSALES`, `PROVINCIAS`, `ZONAS`, `BID_OPTIONS`, `INSTALLERS` (`InstallerMock`), `ELIGIBLE_ORDER`, `ESTADO`, `MISJOBS` (`MisJobMock`), `SUSCOL`, `TRABAJOS` (`TrabajoMock`), `REVEAL` | Mixto (datos ad-hoc del prototipo, no tipados contra `database.ts`/`domain.ts`, pero **conceptualmente** legacy: usa `sucursal` como string libre en vez de relación a `tiendas`, `bidMins`/`bid_mins` como nombre, catálogo `SUCURSALES` que no corresponde a ninguna tabla en Producción) | **Medio** — los datos son mocks locales (no rompen nada hoy, no hay queries), pero su forma anticipa erróneamente el modelo legacy; varios comentarios internos dicen explícitamente "la lista real vendrá de Supabase (tabla `sucursales`)" / "tabla `usuarios`" — referencias a tablas que ya no existen en Producción |

### 1.6 `src/routes/` (1 archivo)

| Archivo | Descripción | Modelo utilizado | Incompatibilidad |
|---|---|---|---|
| `AppRouter.tsx` | Define únicamente `/` → `RootLayout` y catch-all → `/`. Comentario documental sobre rutas futuras por rol | N/A | Ninguna |

### 1.7 `src/layouts/` (1 archivo, 565 líneas)

| Archivo | Descripción | Modelo utilizado | Incompatibilidad |
|---|---|---|---|
| `RootLayout.tsx` | Composición raíz de Header/Footer + ramas condicionales por `role` (`useState<Rol>('coordinador')`) y `sucursalCoord` (`useState('Multiplaza')`). Usa constantes de demo (`LIVECOUNTDOWN_DEMO_BID_MINS`, etc.) | Legacy (vía `Rol`) + mocks propios | **Medio** — el estado central `role` tipado como `Rol` asume el modelo de un único usuario con "rol" intercambiable; en Producción, un `auth.users.id` pertenece de forma fija a una de tres tablas (`admins`/`coordinadores`/`instaladores`), no a un rol "cambiable" desde la sesión |

### 1.8 `src/components/shared/` (34 archivos)

Componentes de negocio ya migrados. Se agrupan por nivel de exposición al modelo de datos:

**Acoplados a `Rol` (tipo legacy, pero con vocabulario aún válido en Producción) — Incompatibilidad Media:**
`header.tsx`, `header-role-switch.tsx`, `header-status.tsx`

**Acoplados a mocks locales de `constants/index.ts` con nombres/forma heredados del prototipo legacy — Incompatibilidad Media (dato mock, no query real, pero nombres de campo no alinean con Producción):**
`master-calendar.tsx` (usa `TRABAJOS`, `SUSCOL`, `ESTADO`, campo `sucursal`), `publish-modal.tsx` (usa `SUCURSALES`, `BID_OPTIONS`, campo `bidMins`), `sucursal-select.tsx` (usa `SUCURSALES`), `installer-jobs.tsx` (usa `MISJOBS`, `ESTADO`), `admin-instaladores.tsx` (usa `INSTALLERS`), `radar.tsx` (usa `INSTALLERS`, `ELIGIBLE_ORDER`), `live-countdown.tsx` (props `publishedAt`/`bidMins`, nombres calcados de `trabajos.published_at`/`trabajos.bid_mins` legacy — hoy `publicado_at`/`bid_minutos` en Producción), `installer-profile-summary.tsx` (props `rating`/`km`/`cumplimiento`/`aceptacion`, alineadas por nombre con columnas de `instaladores` en ambos modelos, bajo riesgo real)

**Sin acoplamiento al modelo de datos (props genéricas, contenido estático, o sin datos de negocio) — Compatible:**
`admin-panel.tsx`, `assigned-panel.tsx`, `confirm-cancel-dialog.tsx`, `confirm-dialog.tsx`, `coordinator-empty-state.tsx`, `countring.tsx`, `empty-state.tsx`, `footer.tsx`, `header-brand.tsx`, `installer-dashboard.tsx`, `installer-priority-rules.tsx`, `installer-profile.tsx`, `installer-sidebar-card.tsx`, `installer-sidebar.tsx`, `installer-solicitudes-empty-state.tsx`, `mx-phone-tabs.tsx`, `mx-subtab-button.tsx`, `mx-subtabs.tsx`, `no-response-panel.tsx`, `page-container.tsx`, `phone-frame.tsx`, `scroll-area.tsx`, `stat-tile.tsx`, `two-column-layout.tsx`

### 1.9 `src/components/ui/` (25 archivos)

Primitivos visuales puros (`avatar`, `badge`, `button`, `card`, `checkbox`, `chip`, `counter`, `dialog`, `drawer`, `dropdown-menu`, `icon-button`, `input`, `label`, `menu`, `modal`, `notification`, `progress`, `search-box`, `select`, `separator`, `skeleton`, `spinner`, `status-badge`, `switch`, `tabs`, `textarea`, `toast`, `tooltip`). **Ninguno** tiene relación con el modelo de datos — reciben props genéricas (`tone`, `variant`, `active`, `children`, etc.). Compatibles en su totalidad.

*Nota*: `chip.tsx` usa el nombre de variante `"bidbtn"` (clase CSS heredada del prototipo `.mx-bidbtn`) — es un identificador puramente visual/CSS, no un campo de datos; no se clasifica como incompatibilidad.

### 1.10 Raíz de `src/` (3 archivos)

| Archivo | Descripción | Modelo utilizado | Incompatibilidad |
|---|---|---|---|
| `App.tsx` | Composición de providers (`QueryClientProvider`, `AuthProvider`, `BrowserRouter`) | N/A | Ninguna |
| `main.tsx` | Punto de entrada de React | N/A | Ninguna |
| `vite-env.d.ts` | Declaraciones de tipos de Vite | N/A | Ninguna |

---

## 2. Totales del inventario

| Categoría | Cantidad |
|---|---|
| Archivos `.ts`/`.tsx` auditados en `src/` | 76 |
| Directorios revisados que existen pero están vacíos (`services`, `hooks`, `features`, `pages`, `utils`) | 5 |
| Archivos con acoplamiento **Crítico** al modelo legacy | 5 (`types/database.ts`, `types/domain.ts`, `types/enums.ts`, `lib/mappers.ts`, `contexts/AuthContext.tsx`) |
| Archivos con acoplamiento **Medio** | 13 (`constants/index.ts`, `layouts/RootLayout.tsx`, `header.tsx`, `header-role-switch.tsx`, `header-status.tsx`, `master-calendar.tsx`, `publish-modal.tsx`, `sucursal-select.tsx`, `installer-jobs.tsx`, `admin-instaladores.tsx`, `radar.tsx`, `live-countdown.tsx`, `installer-profile-summary.tsx`) |
| Archivos **Compatibles** (sin acoplamiento al modelo de datos) | 58 |
| Consultas Supabase reales encontradas (`.from`/`.select`/etc.) | 0 |

(El desglose exacto y la clasificación fila-por-fila con "Estado" y "Acción requerida" está en `FRONTEND_COMPATIBILITY_MATRIX.md`; el detalle de qué se rompe y por qué está en `FRONTEND_DIFF.md`.)
