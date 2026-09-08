import { BarChart3, Building2, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Loading } from '@/components/ui/spinner';
import { StatGrid, StatTile } from '@/components/shared/stat-tile';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { tiendasRepository } from '@/repositories';
import { getAdminDashboardStats } from '@/services/admin-dashboard-stats.service';
import type { TableRow } from '@/services/database.service';
import type { AdminDashboardStatsData, AdminDashboardStatsFilter } from '@/types/admin-dashboard-stats';

/**
 * AdminDashboardStats — segunda capa del Dashboard Ejecutivo (Sprint 9.4,
 * "Extensión con estadísticas operativas"). Se monta debajo del `StatGrid`
 * de KPIs ya existente en `AdminKpiDashboard` -- no reemplaza ningún
 * indicador, no crea una pestaña nueva.
 *
 * **Alcance confirmado con el usuario tras la auditoría de este Sprint**:
 * solo estadísticas de conteo (rango de fechas + sucursal, resumen,
 * desglose por sucursal y por instalador). Ninguna cifra monetaria --
 * "Ingresos"/"Comisión"/"Pagado a instaladores"/"Pagado a vendedores"/
 * "Utilidad neta"/"Cobros extra pendientes" del prototipo de referencia
 * (InstalaMax) quedaron todas clasificadas NO IMPLEMENTABLE (ver informe
 * del Sprint): no existe una regla de comisión definida en ninguna fuente
 * oficial, no existe el concepto "vendedor" en el modelo de datos, no
 * existe tabla de cobros adicionales, y `admins` todavía no tiene policy
 * RLS de SELECT sobre `ofertas`/`trabajo_instaladores` (mismo hueco ya
 * documentado y corregido para `trabajos` en el Sprint 7.1). Ninguno de
 * esos cambios se aplicó en este Sprint -- fuera de alcance sin
 * autorización explícita.
 *
 * Sigue el mismo patrón de estados que `AdminKpiCard`
 * (`admin-dashboard.service.ts`): `stats === undefined` -> cargando,
 * `null` -> error genérico, objeto real -> listo. Reutiliza únicamente
 * componentes ya existentes (`Card`/`CardHeader`/`StatGrid`/`StatTile`/
 * `Select`/`Input`/`Button`/`Badge`) y las clases `.mx-admintable`/
 * `.mx-adminrow*` ya portadas para `AdminInstaladores` -- sin CSS nuevo.
 */

function toDateInputValue(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function diasAtras(dias: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d;
}

function inicioDeMes(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function filtroInicial(): AdminDashboardStatsFilter {
  return { desde: toDateInputValue(diasAtras(29)), hasta: toDateInputValue(new Date()), tiendaId: null };
}

const ERROR_MESSAGE = 'No fue posible cargar las estadísticas del rango seleccionado.';

export function AdminDashboardStats() {
  const { empresaId, loading: contextLoading } = useOperationalContext();

  const [filter, setFilter] = useState<AdminDashboardStatsFilter>(filtroInicial);
  const [tiendas, setTiendas] = useState<TableRow<'tiendas'>[] | null>(null);
  const [stats, setStats] = useState<AdminDashboardStatsData | null | undefined>(undefined);

  useEffect(() => {
    if (!empresaId) return;
    tiendasRepository.getByEmpresaId(empresaId).then((result) => {
      setTiendas(result.ok ? result.data : []);
    });
  }, [empresaId]);

  useEffect(() => {
    if (contextLoading || !empresaId) return;
    let active = true;
    setStats(undefined);
    getAdminDashboardStats(empresaId, filter).then((result) => {
      if (!active) return;
      setStats(result.ok ? result.data : null);
    });
    return () => {
      active = false;
    };
  }, [contextLoading, empresaId, filter]);

  const aplicarAtajo = useCallback((desde: Date, hasta: Date) => {
    setFilter((prev) => ({ ...prev, desde: toDateInputValue(desde), hasta: toDateInputValue(hasta) }));
  }, []);

  const tiendasActivas = useMemo(() => (tiendas ?? []).filter((t) => t.activa), [tiendas]);

  return (
    <Card className="mt-4">
      <CardHeader icon={<BarChart3 size={14} />} cardTitle="Estadísticas operativas" />

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Desde
          <Input
            type="date"
            value={filter.desde}
            max={filter.hasta}
            onChange={(e) => setFilter((prev) => ({ ...prev, desde: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Hasta
          <Input
            type="date"
            value={filter.hasta}
            min={filter.desde}
            max={toDateInputValue(new Date())}
            onChange={(e) => setFilter((prev) => ({ ...prev, hasta: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Sucursal
          <Select
            value={filter.tiendaId ?? ''}
            onChange={(e) => setFilter((prev) => ({ ...prev, tiendaId: e.target.value || null }))}
            className="w-[160px]"
          >
            <option value="">Todas</option>
            {tiendasActivas.map((tienda) => (
              <option key={tienda.id} value={tienda.id}>
                {tienda.nombre}
              </option>
            ))}
          </Select>
        </label>
        <Button variant="ghost" onClick={() => aplicarAtajo(diasAtras(6), new Date())}>
          Últimos 7 días
        </Button>
        <Button variant="ghost" onClick={() => aplicarAtajo(diasAtras(29), new Date())}>
          Últimos 30 días
        </Button>
        <Button variant="ghost" onClick={() => aplicarAtajo(inicioDeMes(), new Date())}>
          Este mes
        </Button>
      </div>

      {stats === undefined ? (
        <Loading label="Calculando estadísticas…" />
      ) : stats === null ? (
        <p style={{ color: 'var(--red)', fontSize: 12 }}>{ERROR_MESSAGE}</p>
      ) : (
        <>
          <StatGrid>
            <StatTile value={stats.resumen.totalEnRango} label="Trabajos en el rango" />
            <StatTile value={stats.resumen.completados} label="Completados" />
            <StatTile value={stats.resumen.activos} label="Activos" sublabel="Con instalador asignado" />
            <StatTile value={stats.resumen.pendientes} label="Pendientes" sublabel="En vivo, sin asignar" />
            <StatTile
              value={stats.resumen.porConfirmar}
              label="Por confirmar"
              sublabel="Instalador marcó terminado"
            />
            <StatTile value={stats.resumen.cancelados} label="Cancelados" />
          </StatGrid>

          <div className="mt-4">
            <CardHeader icon={<Building2 size={13} />} cardTitle="Por sucursal" />
            <div className="mx-admintable">
              {stats.porSucursal.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>No hay sucursales para mostrar.</p>
              ) : (
                stats.porSucursal.map((tienda) => (
                  <div key={tienda.tiendaId} className="mx-adminrow">
                    <div className="mx-adminrow-main">
                      <div className="mx-adminrow-top">
                        <span className="mx-adminrow-name">{tienda.nombre}</span>
                        <Badge tone="ice">{tienda.total} en el rango</Badge>
                      </div>
                      <div className="mx-adminrow-meta">
                        <span>{tienda.completados} completados</span>
                        <span>{tienda.activos} activos</span>
                        <span>{tienda.pendientes} pendientes</span>
                        <span>{tienda.porConfirmar} por confirmar</span>
                        <span>{tienda.cancelados} cancelados</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4">
            <CardHeader icon={<Users size={13} />} cardTitle="Por instalador" />
            <div className="mx-admintable">
              {stats.porInstalador.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Ningún instalador tiene trabajos asignados en este rango.
                </p>
              ) : (
                stats.porInstalador.map((instalador) => (
                  <div key={instalador.instaladorId} className="mx-adminrow">
                    <div className="mx-adminrow-main">
                      <div className="mx-adminrow-top">
                        <span className="mx-adminrow-name">{instalador.nombre}</span>
                        <Badge tone="green">{instalador.asignados} asignados</Badge>
                      </div>
                      <div className="mx-adminrow-meta">
                        <span>{instalador.completados} completados</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
