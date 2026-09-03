import { Card, CardHeader } from '@/components/ui/card';
import { LayoutGrid } from 'lucide-react';
import { StatGrid, StatTile } from '@/components/shared/stat-tile';

/**
 * DespachoKpiRow — evolución de "Despacho en vivo" hacia un centro
 * operativo real (Ajustes finales del flujo Instalador, ronda de
 * Despacho/Ofertas/Header). Reutiliza `StatGrid`/`StatTile`
 * (`.mx-stats`/`.mx-stat`, ya usados por `CoordinatorKpiRow`) — CERO CSS
 * nuevo, mismo lenguaje visual.
 *
 * Deliberadamente DISTINTO de `CoordinatorKpiRow` (Pendientes/Activos/
 * Finalizados/Programados hoy, `getCoordinatorKpis()`) — por instrucción
 * explícita del usuario, ese componente NO se modifica ni se reemplaza
 * (sigue mostrándose, sin cambios, dentro de `JobIndicadoresCard` para el
 * trabajo actualmente destacado). Este es un resumen NUEVO y adicional,
 * agregado sobre TODOS los trabajos `live` de la tienda (no solo el
 * destacado) — de ahí el nombre distinto y el encabezado propio, para que
 * nunca se lean como el mismo número aunque ambos usen la palabra
 * "Activos" en contextos distintos (uno = "con instalador asignado" en
 * `CoordinatorKpiRow`; este = "trabajos live abiertos").
 *
 * Todos los valores se reciben ya calculados por `DespachoPage.tsx` a
 * partir de los mismos datos que ya cargó (`getTrabajosByTienda()` +
 * conteo de `ofertas` por lote) — este componente no hace ninguna
 * consulta propia.
 */
export interface DespachoKpis {
  activos: number;
  conOfertas: number;
  porAsignar: number;
  asignadosHoy: number;
}

export interface DespachoKpiRowProps {
  kpis: DespachoKpis;
}

export function DespachoKpiRow({ kpis }: DespachoKpiRowProps) {
  return (
    <Card>
      <CardHeader icon={<LayoutGrid size={14} />} cardTitle="Resumen de despacho" />
      <StatGrid>
        <StatTile value={kpis.activos} label="Activos" sublabel="Trabajos live abiertos" />
        <StatTile value={kpis.conOfertas} label="Con ofertas" sublabel="Con al menos 1 oferta" />
        <StatTile value={kpis.porAsignar} label="Por asignar" sublabel="Requieren selección" />
        <StatTile value={kpis.asignadosHoy} label="Asignados hoy" />
      </StatGrid>
    </Card>
  );
}
