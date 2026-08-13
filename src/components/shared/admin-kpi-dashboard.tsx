import { LayoutDashboard } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AdminKpiCard } from '@/components/shared/admin-kpi-card';
import { PageContainer } from '@/components/shared/page-container';
import { StatGrid } from '@/components/shared/stat-tile';
import { Card, CardHeader } from '@/components/ui/card';
import { buildAdminKpiViewModels, getAdminKpiData, type AdminKpiData } from '@/services/admin-dashboard.service';

/**
 * AdminKpiDashboard — "Dashboard Ejecutivo" del Administrador (Sprint 8.1;
 * refactorizado en el Sprint 8.1.1, "Refinamiento del Dashboard
 * Ejecutivo"). Primera pestaña de `AdminPanel`.
 *
 * **Sprint 8.1.1 -- qué cambió respecto al Sprint 8.1**:
 * 1. (Ajuste 1) Envuelto en `PageContainer` (`.mx-page`, mismo componente
 *    que ya usan sus 2 pestañas hermanas, `MasterCalendar`/
 *    `AdminInstaladores`) -- antes este componente devolvía el `<Card>`
 *    directo, sin el `padding: 16px` superior que `.mx-page` ya aporta,
 *    dejando muy poco espacio entre el título de la tarjeta y la barra de
 *    tabs de arriba. Mismo sistema de espaciado de siempre, sin ningún
 *    valor nuevo inventado.
 * 2. (Ajuste 2/3) Ya no arma NINGÚN texto explicativo con nombres de
 *    tabla/columna/RLS (`kpis.tiempoPromedioRespuestaMotivo`, del Sprint
 *    8.1) -- ese detalle técnico ahora vive exclusivamente en
 *    `ARCHITECTURE.md`. Este componente ya ni siquiera conoce esos
 *    textos: solo recibe `status: 'pending'` para esos 2 indicadores (ver
 *    `admin-dashboard.service.ts#buildAdminKpiViewModels`) y deja que
 *    `AdminKpiCard` decida cómo se ve ese estado (badge "Próximamente",
 *    sin texto adicional).
 * 3. (Ajuste 3.1) Ya no llama a `StatTile` directamente -- itera
 *    `AdminKpiViewModel[]` y renderiza `AdminKpiCard` (nuevo) por cada
 *    uno, el único componente de tarjeta KPI de todo el Dashboard. Los 8
 *    KPIs (los 6 reales y los 2 "Próximamente") pasan por exactamente el
 *    mismo camino -- cero lógica de presentación duplicada entre ellos.
 * 4. (Ajuste 7) `useMemo` sobre el cálculo de los view models -- no se
 *    recalculan en cada render, solo cuando cambia `kpiData` (referencia
 *    nueva únicamente tras una respuesta real de `getAdminKpiData()`).
 *
 * **Estados de carga/error, centralizados**: `kpiData` es
 * `AdminKpiData | null | undefined` -- `undefined` (valor inicial)
 * significa "todavía no respondió" (-> los 6 KPIs reales se ven
 * `'loading'`, `Skeleton`); `null` significa "la consulta terminó con un
 * error real" (-> los 6 quedan `'error'`, mensaje genérico fijo); un
 * objeto real significa éxito (-> los 6 quedan `'ready'` con su valor).
 * Ningún mensaje de error de Supabase (`result.error.message`) se guarda
 * ni se muestra en ningún lado de este componente -- se descarta a
 * propósito (Regla del Sprint: "el Dashboard nunca debe exponer mensajes
 * de Supabase").
 */
export function AdminKpiDashboard() {
  const [kpiData, setKpiData] = useState<AdminKpiData | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getAdminKpiData().then((result) => {
      if (!active) return;
      setKpiData(result.ok ? result.data : null);
    });
    return () => {
      active = false;
    };
  }, []);

  const kpiViewModels = useMemo(() => buildAdminKpiViewModels(kpiData), [kpiData]);

  return (
    <PageContainer>
      <Card>
        <CardHeader icon={<LayoutDashboard size={14} />} cardTitle="Dashboard Ejecutivo" />
        <StatGrid>
          {kpiViewModels.map((kpi) => (
            <AdminKpiCard key={kpi.id} label={kpi.label} status={kpi.status} value={kpi.value} sublabel={kpi.sublabel} />
          ))}
        </StatGrid>
      </Card>
    </PageContainer>
  );
}
