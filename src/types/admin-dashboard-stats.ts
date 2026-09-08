/**
 * admin-dashboard-stats.ts — tipos de la segunda capa del Dashboard
 * Ejecutivo (Sprint 9.4, "Estadísticas operativas por rango/sucursal/
 * instalador"). Exclusivamente estadísticas de conteo -- ninguna cifra
 * monetaria: la auditoría de este Sprint confirmó que HANDYMAX todavía no
 * tiene datos/reglas de negocio confiables para ingresos, comisiones,
 * pagos a instaladores/vendedores, utilidad neta ni cobros extra (ver
 * `ARCHITECTURE.md` para el detalle completo de la auditoría). Ninguno de
 * esos campos existe acá a propósito -- no se aproxima ni se hardcodea.
 */

/** Filtro elegido por el Administrador -- `desde`/`hasta` en formato `<input type="date">` ('YYYY-MM-DD'). */
export interface AdminDashboardStatsFilter {
  desde: string;
  hasta: string;
  tiendaId: string | null;
}

/** Resumen agregado de todos los trabajos publicados en el rango (todas las sucursales, o solo la filtrada). */
export interface AdminDashboardResumen {
  totalEnRango: number;
  completados: number;
  activos: number;
  pendientes: number;
  /** `estado === 'pending_confirmation'` -- corrección de auditoría (GAP-2). */
  porConfirmar: number;
  cancelados: number;
}

export interface TiendaStat {
  tiendaId: string;
  nombre: string;
  total: number;
  completados: number;
  activos: number;
  pendientes: number;
  /** `estado === 'pending_confirmation'` -- corrección de auditoría (GAP-2). */
  porConfirmar: number;
  cancelados: number;
}

/** Solo instaladores con al menos un trabajo asignado en el rango -- ver JSDoc del servicio. */
export interface InstaladorStat {
  instaladorId: string;
  nombre: string;
  asignados: number;
  completados: number;
}

export interface AdminDashboardStatsData {
  resumen: AdminDashboardResumen;
  porSucursal: TiendaStat[];
  porInstalador: InstaladorStat[];
}
