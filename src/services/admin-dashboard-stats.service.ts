/**
 * admin-dashboard-stats.service.ts — segunda capa del Dashboard Ejecutivo
 * (Sprint 9.4, "Extensión con estadísticas operativas por rango/sucursal/
 * instalador"). Mismo criterio de capas ya establecido por
 * `admin-dashboard.service.ts` (obtención -> transformación pura), pero
 * como archivo separado -- este Sprint agrega filtros (rango de fechas +
 * sucursal) y varias secciones (resumen + 2 desgloses), una forma de datos
 * distinta a los 8 KPIs de valor único del archivo original, que
 * permanece sin ningún cambio (Regla del Sprint: "no reemplazar los
 * indicadores actuales").
 *
 * **Auditoría previa (Sprint 9.4, Fase 1/2)**: de las 9 métricas
 * financieras del prototipo de referencia (InstalaMax), solo las
 * operativas (conteos) resultaron IMPLEMENTABLES AHORA con datos reales y
 * confiables. Ingresos/comisión/pagos a instaladores-vendedores/utilidad
 * neta/cobros extra quedaron clasificadas NO IMPLEMENTABLE (falta la
 * regla del 30% en cualquier fuente oficial, falta RLS de `admins` sobre
 * `ofertas`/`trabajo_instaladores`, no existe el concepto "vendedor" ni
 * una tabla de cobros adicionales en las 9 tablas reales de Producción).
 * Este archivo, a propósito, no calcula ninguna de esas 5 métricas.
 *
 * **`publicado_at` como campo de rango** (decisión de producto confirmada
 * con el usuario en este Sprint): timestamptz real, sin la ambigüedad de
 * `fecha` (`text`, representa la fecha PROGRAMADA de instalación, no
 * cuándo se publicó/ocurrió). Mismo campo que ya usa el KPI "Publicados
 * hoy" de `admin-dashboard.service.ts`.
 */
import { instaladoresRepository, tiendasRepository, trabajosRepository } from '@/repositories';
import type { ServiceResult } from '@/services/supabase.service';
import type { TableRow } from '@/services/database.service';
import type {
  AdminDashboardResumen,
  AdminDashboardStatsData,
  AdminDashboardStatsFilter,
  InstaladorStat,
  TiendaStat,
} from '@/types/admin-dashboard-stats';

type TrabajoRow = TableRow<'trabajos'>;

/**
 * `filter.desde`/`filter.hasta` son valores de `<input type="date">`
 * ('YYYY-MM-DD', hora local del navegador) -- se resuelven acá a un ISO
 * completo (inicio/fin de día local) antes de pasarlos al repositorio, que
 * no interpreta formatos de fecha (ver JSDoc de
 * `trabajosRepository.getByRangoPublicado`).
 */
function rangoISO(filter: AdminDashboardStatsFilter): { desde: string; hasta: string } {
  return {
    desde: new Date(`${filter.desde}T00:00:00`).toISOString(),
    hasta: new Date(`${filter.hasta}T23:59:59.999`).toISOString(),
  };
}

function calcularResumen(rows: readonly TrabajoRow[]): AdminDashboardResumen {
  let completados = 0;
  let activos = 0;
  let pendientes = 0;
  let cancelados = 0;

  for (const row of rows) {
    if (row.estado === 'completed') completados += 1;
    else if (row.estado === 'assigned') activos += 1;
    else if (row.estado === 'live') pendientes += 1;
    else if (row.estado === 'cancelled') cancelados += 1;
  }

  return { totalEnRango: rows.length, completados, activos, pendientes, cancelados };
}

function calcularPorSucursal(
  rows: readonly TrabajoRow[],
  tiendas: readonly TableRow<'tiendas'>[],
): TiendaStat[] {
  const stats = new Map<string, TiendaStat>();
  for (const tienda of tiendas) {
    stats.set(tienda.id, {
      tiendaId: tienda.id,
      nombre: tienda.nombre,
      total: 0,
      completados: 0,
      activos: 0,
      pendientes: 0,
      cancelados: 0,
    });
  }

  for (const row of rows) {
    const stat = stats.get(row.tienda_id);
    if (!stat) continue; // tienda fuera del catálogo de la empresa (no debería ocurrir bajo RLS -- degradación segura)
    stat.total += 1;
    if (row.estado === 'completed') stat.completados += 1;
    else if (row.estado === 'assigned') stat.activos += 1;
    else if (row.estado === 'live') stat.pendientes += 1;
    else if (row.estado === 'cancelled') stat.cancelados += 1;
  }

  return Array.from(stats.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Solo instaladores con al menos un trabajo asignado en el rango (Regla
 * del Sprint, Fase 5C: "mostrar... únicamente si existen datos suficientes
 * y confiables" -- listar los ~30 instaladores de la empresa con 0 en todo
 * no aporta información real).
 */
function calcularPorInstalador(
  rows: readonly TrabajoRow[],
  instaladores: readonly TableRow<'instaladores'>[],
): InstaladorStat[] {
  const nombrePorId = new Map(instaladores.map((i) => [i.id, i.nombre] as const));
  const stats = new Map<string, InstaladorStat>();

  for (const row of rows) {
    if (!row.instalador_asignado_id) continue;
    const nombre = nombrePorId.get(row.instalador_asignado_id);
    if (!nombre) continue; // instalador fuera del catálogo de la empresa -- degradación segura

    const stat = stats.get(row.instalador_asignado_id) ?? {
      instaladorId: row.instalador_asignado_id,
      nombre,
      asignados: 0,
      completados: 0,
    };
    stat.asignados += 1;
    if (row.estado === 'completed') stat.completados += 1;
    stats.set(row.instalador_asignado_id, stat);
  }

  return Array.from(stats.values()).sort((a, b) => b.asignados - a.asignados);
}

export async function getAdminDashboardStats(
  empresaId: string,
  filter: AdminDashboardStatsFilter,
): Promise<ServiceResult<AdminDashboardStatsData>> {
  const { desde, hasta } = rangoISO(filter);

  const [trabajosResult, tiendasResult, instaladoresResult] = await Promise.all([
    trabajosRepository.getByRangoPublicado({ desde, hasta, tiendaId: filter.tiendaId ?? undefined }),
    tiendasRepository.getByEmpresaId(empresaId),
    instaladoresRepository.getByEmpresaId(empresaId),
  ]);

  if (!trabajosResult.ok) return trabajosResult;
  if (!tiendasResult.ok) return tiendasResult;
  if (!instaladoresResult.ok) return instaladoresResult;

  return {
    ok: true,
    data: {
      resumen: calcularResumen(trabajosResult.data),
      porSucursal: calcularPorSucursal(trabajosResult.data, tiendasResult.data),
      porInstalador: calcularPorInstalador(trabajosResult.data, instaladoresResult.data),
    },
  };
}
