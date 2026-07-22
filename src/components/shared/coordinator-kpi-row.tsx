import { StatGrid, StatTile } from '@/components/shared/stat-tile';
import type { CoordinatorKpis } from '@/services';

/**
 * CoordinatorKpiRow — Entregable 4 del Sprint 5.1 ("Dashboard Principal /
 * KPIs": trabajos pendientes/activos/finalizados/programados hoy).
 *
 * Decisión de producto de este Sprint (confirmada explícitamente por el
 * usuario tras la auditoría previa obligatoria, ver
 * `SPRINT_5_1_COORDINATOR_REPORT.md` §"Diferencias detectadas"): el HTML
 * oficial (`Multimax_Despacho_v1.3.html`) NO tiene ninguna pantalla de
 * "Dashboard" separada -- el Coordinador solo tiene "Despacho en vivo"
 * (`Coordinator()`) y "Mis trabajos" (`CoordinatorJobs()`). Para no romper
 * la fidelidad del proyecto creando una pantalla sin equivalente en el
 * mockup, estos KPIs se integran como una fila ADICIONAL en la parte
 * superior de la vista real "Despacho en vivo" (`DespachoPage`), sin
 * alterar la estructura/JSX/estilos de ningún bloque ya aprobado de esa
 * vista (`CoordinatorEmptyState`/`Radar`/`LiveCountdown`/etc., que siguen
 * exactamente igual, debajo de esta fila).
 *
 * Reutiliza `StatGrid`/`StatTile` (`.mx-stats`/`.mx-stat`, ya portados
 * desde Fase 3 para el resumen de "Indicadores" de `Coordinator()` y el
 * panel "Tu perfil" del Instalador) -- ningún estilo/clase CSS nuevo, tal
 * como pidió el usuario ("respetando el diseño visual existente").
 */
export interface CoordinatorKpiRowProps {
  kpis: CoordinatorKpis;
}

export function CoordinatorKpiRow({ kpis }: CoordinatorKpiRowProps) {
  return (
    <StatGrid>
      <StatTile value={kpis.pendientes} label="Pendientes" sublabel="En vivo, sin asignar" />
      <StatTile value={kpis.activos} label="Activos" sublabel="Con instalador asignado" />
      <StatTile value={kpis.finalizados} label="Finalizados" sublabel="Completados" />
      <StatTile value={kpis.programadosHoy} label="Programados hoy" />
    </StatGrid>
  );
}
