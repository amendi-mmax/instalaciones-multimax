# FRONTEND_COMPATIBILITY_MATRIX.md — Matriz de Compatibilidad

Leyenda de **Estado**: `Legacy` (modela exclusivamente el esquema antiguo) · `Producción` (ya alineado con el esquema real) · `Mixto` (partes en cada modelo) · `N/A` (sin relación con el modelo de datos).

Leyenda de **Prioridad** (para el Sprint de adaptación futuro): `Crítica` · `Alta` · `Media` · `Baja` · `N/A`.

Leyenda de **Origen del dato**: `Generado automáticamente` (producto de una herramienta, p. ej. `supabase gen types`) · `Manual` (código escrito a mano) · `Mock` (datos estáticos locales sin conexión a la base de datos) · `Legacy` (modela el esquema antiguo) · `Producción` (modela el esquema real vigente) · `Mixto` (combina más de uno de los anteriores). Esta columna permite identificar, de cara al Sprint funcional, qué archivos deberán reemplazarse por artefactos generados o por datos reales, y cuáles seguirán siendo código manual permanente.

---

## 1. Capa de contrato de datos (`types/`, `lib/mappers.ts`, `contexts/`)

| Archivo | Modelo Legacy | Modelo Producción | Estado | Origen del dato | Acción requerida | Prioridad |
|---|---|---|---|---|---|---|
| `types/database.ts` | 100% (7 interfaces `*Row` + 1 alias) | 0% | Legacy | Manual (debería pasar a Generado automáticamente — ver `FRONTEND_SYNC_PLAN.md` Fase 0) | Reemplazar por `types/database.generated.ts` vía `supabase gen types typescript` contra las 8 tablas reales | Crítica |
| `types/domain.ts` | 100% (8 interfaces + 1 tipo de UI) | 0% | Legacy | Manual | Reescribir íntegramente; decidir si se mantiene el patrón `*Row`→dominio o se simplifica dado el nuevo modelo de 3 tablas de usuario | Crítica |
| `types/enums.ts` | 80% (`TrabajoPhase`, `BidEstado`, `NotificacionCanal` sin respaldo; `Rol` con vocabulario válido pero estructura distinta) | 0% explícito | Legacy | Manual | Eliminar `TrabajoPhase`/`BidEstado`/`NotificacionCanal` (no tienen ENUM real); revisar si `Rol` sigue teniendo sentido como tipo de UI (sí, como discriminador de vista) aunque ya no exista como columna | Crítica |
| `lib/mappers.ts` | 100% (6 funciones) | 0% | Legacy | Manual | Reescribir contra las nuevas `*Row`/dominio, una vez definidas | Alta (no bloqueante hoy por falta de importadores) |
| `contexts/AuthContext.tsx` | Tipo (`Usuario`) 100% legacy; lógica aún no implementada | 0% | Legacy | Manual | Redefinir la forma de sesión: decidir si `usuario` sigue siendo un objeto único o si se modela como unión discriminada por tabla (`AdminSession \| CoordinadorSession \| InstaladorSession`) | Crítica |
| `supabase/client.ts` | N/A | N/A | N/A | Manual | Ninguna | N/A |

## 2. Constantes y mocks

| Archivo | Modelo Legacy | Modelo Producción | Estado | Origen del dato | Acción requerida | Prioridad |
|---|---|---|---|---|---|---|
| `constants/index.ts` | Conceptual (nombres de tabla en comentarios: `sucursales`, `usuarios`, `trabajos` en su forma legacy); datos en sí son mocks con forma propia | 0% | Mixto | Mock | Actualizar comentarios que prometen "vendrá de la tabla X" para referenciar los nombres reales; al conectar datos reales, mapear `INSTALLERS`/`MISJOBS`/`TRABAJOS` a las formas reales de `instaladores`/`trabajo_instaladores`/`trabajos` | Media |

## 3. Layout y enrutamiento

| Archivo | Modelo Legacy | Modelo Producción | Estado | Origen del dato | Acción requerida | Prioridad |
|---|---|---|---|---|---|---|
| `layouts/RootLayout.tsx` | `Rol` (ver arriba) + constantes de demo con nombres legacy (`LIVECOUNTDOWN_DEMO_BID_MINS`) | 0% | Mixto | Mixto (Manual + Mock) | Revisar si el estado único `role` sigue siendo el modelo correcto de sesión una vez haya Auth real (un usuario ya no "cambia de rol", pertenece de forma fija a una tabla) | Media |
| `routes/AppRouter.tsx` | N/A | N/A | N/A | Manual | Ninguna por ahora — cuando se agreguen rutas por rol, alinear con el modelo de 3 tablas | N/A |
| `App.tsx`, `main.tsx`, `vite-env.d.ts` | N/A | N/A | N/A | Manual | Ninguna | N/A |

## 4. Componentes de negocio (`components/shared/`)

| Archivo | Modelo Legacy | Modelo Producción | Estado | Origen del dato | Acción requerida | Prioridad |
|---|---|---|---|---|---|---|
| `header.tsx` | `Rol` | — | Mixto | Manual | Ninguna urgente (vocabulario de rol sigue siendo válido) | Baja |
| `header-role-switch.tsx` | `Rol` | — | Mixto | Manual | Ninguna urgente | Baja |
| `header-status.tsx` | `Rol` + `sucursalActiva` (concepto legacy) | — | Mixto | Mixto (Manual + Mock) | Renombrar conceptualmente `sucursalActiva` → `tiendaActiva` cuando se conecte a datos reales | Media |
| `sucursal-select.tsx` | Nombre del componente y prop, `SUCURSALES` | — | Legacy (nombre) | Mock | Renombrar a `TiendaSelect`/`tiendaId` cuando se conecte a la tabla real `tiendas` | Media |
| `master-calendar.tsx` | Campo `sucursal` de `TrabajoMock`, `SUSCOL` indexado por nombre de sucursal | — | Legacy (nombre) | Mock | Migrar a `tienda_id`/join con `tiendas` cuando haya datos reales | Media |
| `publish-modal.tsx` | Campo `bidMins`, `sucursal` en `PublishForm` | — | Legacy (nombre) | Mock | Renombrar a `bidMinutos`/`tiendaId`; el formulario deberá llamar en el futuro a `submit_bid`/inserción directa en `trabajos` con las columnas reales (`codigo`, `fecha`, `hora`, etc., no solo las actuales) | Alta (el formulario actual no captura varios campos NOT NULL reales: `codigo`, `fecha` con formato texto, `hora`) |
| `live-countdown.tsx` | Props `publishedAt`/`bidMins` | — | Legacy (nombre) | Mock | Renombrar props a `publicadoAt`/`bidMinutos` cuando se conecte a `trabajos` real | Media |
| `installer-jobs.tsx` | Consume `MISJOBS` (mock, campos propios) + `ESTADO` | — | Mixto | Mock | Migrar a datos reales de `trabajos_para_instalador` (la vista ya expone `mi_estado`/`estado_trabajo`/`gane_yo`) | Media |
| `admin-instaladores.tsx` | Consume `INSTALLERS` (mock) | — | Mixto | Mock | Migrar a `instaladores` real; campos como `docs`/`susp` deben mapearse a `documentos_ok`/`suspendido` | Media |
| `radar.tsx` | Consume `INSTALLERS`, `ELIGIBLE_ORDER` (mock) | — | Mixto | Mock | Migrar a `instaladores` real filtrados por proximidad/zona | Media |
| `installer-profile-summary.tsx` | Props genéricas (`rating`, `km`, `cumplimiento`, `aceptacion`) ya alineadas por nombre con `instaladores` real (excepto `km`, que ninguno de los dos modelos tiene como columna de tabla — es un cálculo derivado en ambos) | Parcialmente alineado | Mixto | Mock (props recibidas; el consumidor real hoy es `INSTALLERS`) | Ninguna urgente — es el archivo con menor esfuerzo de adaptación de todo el grupo Medio | Baja |
| Resto de `components/shared/` (23 archivos: `admin-panel`, `assigned-panel`, `confirm-cancel-dialog`, `confirm-dialog`, `coordinator-empty-state`, `countring`, `empty-state`, `footer`, `header-brand`, `installer-dashboard`, `installer-priority-rules`, `installer-profile`, `installer-sidebar-card`, `installer-sidebar`, `installer-solicitudes-empty-state`, `mx-phone-tabs`, `mx-subtab-button`, `mx-subtabs`, `no-response-panel`, `page-container`, `phone-frame`, `scroll-area`, `stat-tile`, `two-column-layout`) | N/A | N/A | N/A | Manual | Ninguna | N/A |

## 5. Primitivos de UI (`components/ui/`, 25 archivos)

| Archivo(s) | Modelo Legacy | Modelo Producción | Estado | Origen del dato | Acción requerida | Prioridad |
|---|---|---|---|---|---|---|
| Los 25 archivos de `components/ui/` (`avatar`, `badge`, `button`, `card`, `checkbox`, `chip`, `counter`, `dialog`, `drawer`, `dropdown-menu`, `icon-button`, `input`, `label`, `menu`, `modal`, `notification`, `progress`, `search-box`, `select`, `separator`, `skeleton`, `spinner`, `status-badge`, `switch`, `tabs`, `textarea`, `toast`, `tooltip`) | N/A | N/A | N/A | Manual | Ninguna | N/A |

---

## 6. Resumen numérico de la matriz

| Estado | Cantidad de archivos |
|---|---|
| Legacy | 5 |
| Mixto | 13 |
| N/A (compatible) | 58 |
| Producción (ya alineado) | 0 |
| **Total** | **76** |

| Prioridad asignada | Cantidad de archivos |
|---|---|
| Crítica | 4 |
| Alta | 2 |
| Media | 9 |
| Baja | 3 |
| N/A | 58 |
