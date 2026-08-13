/**
 * admin-dashboard.service.ts — servicio de KPIs para el "Dashboard
 * Ejecutivo" del Administrador (Sprint 8.1; refactorizado en el Sprint
 * 8.1.1, "Refinamiento del Dashboard Ejecutivo"). Mismo criterio ya
 * establecido por `dashboard.service.ts` (Sprint 5.1, KPIs del
 * Coordinador): las páginas/componentes no llaman a los repositorios
 * directamente para agregados, siempre pasan por un servicio.
 *
 * ## Arquitectura en 3 capas (Sprint 8.1.1, Ajuste 4 del brief: "separar
 * claramente obtención de datos / transformación / presentación")
 *
 * 1. **OBTENCIÓN** -- `trabajosRepository.getAll()`/
 *    `instaladoresRepository.getAll()` (sin envoltorio adicional acá: ya
 *    son la capa de obtención real, mismo patrón que `MasterCalendar`/
 *    `AdminInstaladores` -- sin filtrar por `empresa_id` en la query,
 *    porque las policies reales `"admins ven trabajos de su empresa"`/
 *    `"admins ven instaladores de su empresa"` ya limitan el resultado del
 *    lado del servidor).
 * 2. **TRANSFORMACIÓN** -- funciones puras (`calcularKpisDeTrabajos`/
 *    `calcularInstaladoresActivos`/`calcularTiempoPromedioRespuestaMin`),
 *    sin ningún efecto secundario, que convierten filas reales en
 *    `AdminKpiData` -- ninguna sabe nada de UI/Badges/Skeletons.
 *    `getAdminKpiData()` orquesta obtención + transformación (Promise.all
 *    + cálculo), sin ninguna decisión de presentación.
 * 3. **PRESENTACIÓN** -- `buildAdminKpiViewModels()` (nueva en este
 *    Sprint) traduce `AdminKpiData` (o su ausencia, ante un error real) a
 *    `AdminKpiViewModel[]` -- la única capa que decide qué `status`
 *    (`'ready'`/`'loading'`/`'pending'`/`'error'`) tiene cada indicador, y
 *    la única que conoce los 8 KPIs como conjunto ordenado. Consumida
 *    únicamente por `AdminKpiDashboard`, que ya no arma ningún texto ni
 *    decide ningún estado por su cuenta -- solo itera este arreglo y
 *    renderiza `AdminKpiCard` por cada elemento.
 *
 * ## Por qué ya no existen los campos `...Motivo` (Sprint 8.1, retirados
 * en este Sprint)
 *
 * El Sprint 8.1 exponía `tiempoPromedioRespuestaMotivo`/
 * `tiempoPromedioInstalacionMotivo` -- strings con nombres reales de
 * tabla/columna/RLS, pensados para mostrarse en la UI como nota
 * explicativa. Regla explícita de este Sprint: "el Dashboard nunca debe
 * exponer tablas/SQL/RLS/RPC/columnas/mensajes de Supabase -- toda esa
 * información únicamente documentada en ARCHITECTURE.md". Esos 2 motivos
 * técnicos completos (con la evidencia exacta verificada vía MCP) quedan
 * documentados en `ARCHITECTURE.md` (Sprint 8.1.1) -- este archivo ya no
 * los expone como dato: `buildAdminKpiViewModels()` simplemente marca esos
 * 2 indicadores como `status: 'pending'`, sin ningún texto adjunto (el
 * propio `AdminKpiCard` decide mostrar el badge "Próximamente" para ese
 * estado, sin necesitar ningún motivo).
 *
 * ## Preparación para KPIs futuros (Ajuste 5 del brief -- Sprints
 * 8.2/8.4/8.6/8.7/8.8/8.9: "trabajos por sucursal", "instaladores más
 * rápidos", "horas pico", "cancelaciones", "calificaciones", "empresas
 * instaladoras", etc.)
 *
 * Agregar un KPI nuevo, cuando corresponda, sigue siempre el mismo
 * patrón de 3 pasos, sin tocar `AdminKpiCard` ni el componente de
 * dashboard:
 * 1. Agregar el campo crudo a `AdminKpiData` (si hace falta un dato
 *    nuevo) + su función de transformación pura.
 * 2. Agregar su `AdminKpiId` a la unión de abajo.
 * 3. Agregar su entrada a `buildAdminKpiViewModels()` (label + `status`
 *    según si el dato ya es real, todavía no, o falló).
 * No se crea ninguna infraestructura adicional (registro dinámico,
 * plugins, etc.) -- sería complejidad sin necesidad real todavía
 * (Principio del proyecto: "evitar refactorizaciones/abstracciones
 * innecesarias").
 */
import { instaladoresRepository, trabajosRepository } from '@/repositories';
import type { ServiceResult } from '@/services/supabase.service';
import type { TableRow } from '@/services/database.service';

// ---------------------------------------------------------------------
// 1. OBTENCIÓN + 2. TRANSFORMACIÓN
// ---------------------------------------------------------------------

/** Datos crudos ya calculados -- sin ninguna decisión de presentación (sin `status`, sin texto para UI). */
export interface AdminKpiData {
  /** `trabajos.publicado_at` (timestamptz real) cae en la fecha de hoy. */
  publicadosHoy: number;
  /** `estado === 'assigned'`. */
  activos: number;
  /** `estado === 'live'`. */
  pendientes: number;
  /** `estado === 'completed'`. */
  finalizados: number;
  /** `estado === 'cancelled'`. */
  cancelados: number;
  /** `instaladores.activo === true && suspendido === false`. */
  instaladoresActivos: number;
}

function esHoy(iso: string): boolean {
  const fecha = new Date(iso);
  const hoy = new Date();
  return (
    fecha.getFullYear() === hoy.getFullYear() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getDate() === hoy.getDate()
  );
}

function calcularKpisDeTrabajos(rows: readonly TableRow<'trabajos'>[]) {
  let publicadosHoy = 0;
  let activos = 0;
  let pendientes = 0;
  let finalizados = 0;
  let cancelados = 0;

  for (const row of rows) {
    if (esHoy(row.publicado_at)) publicadosHoy += 1;
    if (row.estado === 'assigned') activos += 1;
    else if (row.estado === 'live') pendientes += 1;
    else if (row.estado === 'completed') finalizados += 1;
    else if (row.estado === 'cancelled') cancelados += 1;
  }

  return { publicadosHoy, activos, pendientes, finalizados, cancelados };
}

function calcularInstaladoresActivos(rows: readonly TableRow<'instaladores'>[]): number {
  return rows.filter((row) => row.activo && !row.suspendido).length;
}

/**
 * Cálculo completo, ya implementado y listo para usarse en cuanto exista
 * la policy RLS necesaria sobre `trabajo_instaladores` (documentado en
 * `ARCHITECTURE.md`, Sprint 8.1/8.1.1) -- no se invoca todavía en
 * `getAdminKpiData()`. Promedio en minutos de `respondido_at -
 * notificado_at` sobre las filas que ya tienen respuesta (`respondido_at`
 * no nulo) -- mismo criterio de "solo promediar lo que realmente ocurrió"
 * que `calcularKpis()` en `dashboard.service.ts`.
 */
export function calcularTiempoPromedioRespuestaMin(
  rows: readonly TableRow<'trabajo_instaladores'>[],
): number | null {
  const respondidas = rows.filter((row) => row.respondido_at !== null);
  if (respondidas.length === 0) return null;

  const totalMs = respondidas.reduce((acc, row) => {
    const notificado = new Date(row.notificado_at).getTime();
    const respondido = new Date(row.respondido_at as string).getTime();
    return acc + Math.max(0, respondido - notificado);
  }, 0);

  return Math.round(totalMs / respondidas.length / 60000);
}

/**
 * getAdminKpiData — orquesta obtención + transformación (capas 1 y 2).
 * Único punto que ejecuta consultas reales a Supabase en este archivo.
 */
export async function getAdminKpiData(): Promise<ServiceResult<AdminKpiData>> {
  const [trabajosResult, instaladoresResult] = await Promise.all([
    trabajosRepository.getAll(),
    instaladoresRepository.getAll(),
  ]);

  if (!trabajosResult.ok) return trabajosResult;
  if (!instaladoresResult.ok) return instaladoresResult;

  return {
    ok: true,
    data: {
      ...calcularKpisDeTrabajos(trabajosResult.data),
      instaladoresActivos: calcularInstaladoresActivos(instaladoresResult.data),
    },
  };
}

// ---------------------------------------------------------------------
// 3. PRESENTACIÓN -- único punto que conoce `status`/orden/etiquetas.
// Nunca contiene un mensaje de error real de Supabase ni un nombre de
// tabla/columna -- ver JSDoc de cabecera.
// ---------------------------------------------------------------------

export type AdminKpiStatus = 'ready' | 'loading' | 'pending' | 'error';

export type AdminKpiId =
  | 'publicadosHoy'
  | 'activos'
  | 'pendientes'
  | 'finalizados'
  | 'cancelados'
  | 'instaladoresActivos'
  | 'tiempoPromedioRespuesta'
  | 'tiempoPromedioInstalacion';

export interface AdminKpiViewModel {
  id: AdminKpiId;
  label: string;
  sublabel?: string;
  status: AdminKpiStatus;
  value?: string | number;
}

/**
 * buildAdminKpiViewModels — arma los 8 KPIs del Dashboard Ejecutivo en un
 * orden fijo, con el `status` correcto para cada uno:
 * - `data === undefined` (todavía no respondió la consulta) -> los 6 KPIs
 *   reales quedan en `'loading'`.
 * - `data === null` (la consulta terminó con error real) -> los 6 KPIs
 *   reales quedan en `'error'`.
 * - `data` presente -> los 6 KPIs reales quedan en `'ready'` con su valor.
 * - Los últimos 2 (tiempos promedio) SIEMPRE quedan en `'pending'`,
 *   cualquiera sea `data` -- no son un dato que pueda fallar o cargar,
 *   simplemente no están implementados todavía (ver JSDoc de cabecera).
 */
export function buildAdminKpiViewModels(data: AdminKpiData | null | undefined): AdminKpiViewModel[] {
  const status: AdminKpiStatus = data === undefined ? 'loading' : data === null ? 'error' : 'ready';

  return [
    { id: 'publicadosHoy', label: 'Publicados hoy', status, value: data?.publicadosHoy },
    {
      id: 'activos',
      label: 'Activos',
      sublabel: 'Con instalador asignado',
      status,
      value: data?.activos,
    },
    {
      id: 'pendientes',
      label: 'Pendientes',
      sublabel: 'En vivo, sin asignar',
      status,
      value: data?.pendientes,
    },
    { id: 'finalizados', label: 'Finalizados', sublabel: 'Completados', status, value: data?.finalizados },
    { id: 'cancelados', label: 'Cancelados', status, value: data?.cancelados },
    { id: 'instaladoresActivos', label: 'Instaladores activos', status, value: data?.instaladoresActivos },
    { id: 'tiempoPromedioRespuesta', label: 'Tiempo prom. de respuesta', status: 'pending' },
    { id: 'tiempoPromedioInstalacion', label: 'Tiempo prom. de instalación', status: 'pending' },
  ];
}
