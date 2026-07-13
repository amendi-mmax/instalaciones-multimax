import { Calendar, Users } from 'lucide-react';
import { useState } from 'react';

import { AdminInstaladores } from '@/components/shared/admin-instaladores';
import { MxSubtabButton } from '@/components/shared/mx-subtab-button';
import { MxSubtabs } from '@/components/shared/mx-subtabs';

/**
 * AdminPanel — reconstruye verbatim `function AdminPanel()`
 * (`Multimax_Despacho_v1.3.html`, líneas 3031-3048), la raíz del panel de
 * Administrador (Sprint 3.13).
 *
 * **Confirmación del nombre del Sprint (brief exige NO asumir "Admin
 * Dashboard")**: no existe ninguna función `AdminDashboard` en el HTML
 * fuente (verificado con `grep -n "function Admin"` sobre el archivo
 * completo). "Admin Dashboard" es un nombre genérico de
 * `docs/SPRINTS_INDEX.md`, igual que "Installer Dashboard" lo fue para el
 * Sprint 3.10 — la función real y equivalente es `function AdminPanel()`,
 * el componente raíz que `App()` monta cuando `role === "admin"` (línea
 * 2121: `role === "admin" && React.createElement(AdminPanel, null)`),
 * análogo a `Coordinator(props)`/`Installer(props)` para los otros roles.
 *
 * `AdminPanel()` compone internamente sub-tabs (`.mx-subtabs-wrap`/
 * `.mx-subtabs`, mismo markup ya reconstruido en el Sprint 3.3 —
 * `MxSubtabs`/`MxSubtabButton`, cuyo propio JSDoc ya anticipaba este
 * momento: "el Sprint que construya Coordinator/AdminPanel decide cuál de
 * los dos usar") con 2 pestañas: "Calendario maestro" (ícono `Calendar`,
 * activa por defecto — `useState("calendario")`, línea 3032) e
 * "Instaladores" (ícono `Users`). Según la pestaña activa, renderiza
 * `MasterCalendar` (tab "calendario") o `AdminInstaladores` (tab
 * "instaladores").
 *
 * **Alcance de este Sprint**: `MasterCalendar` (función real, sin
 * construir todavía, reservada para el Sprint 3.14 "Calendar" — ver
 * `docs/SPRINTS_INDEX.md`) NO se implementa aquí — implementarla invadiría
 * su propio Sprint numerado, mismo criterio ya aplicado en el Sprint 3.10
 * con `InstallerJobs`/`InstallerProfile`. `AdminInstaladores` SÍ es
 * reconstruible ahora (no depende de ningún motor de trabajos, solo de
 * `INSTALLERS`/`ZONAS`, ya migrados) — ver `admin-instaladores.tsx`.
 *
 * **Limitación reportada (no corregida)**: el HTML fuente arranca con
 * `tab === "calendario"` como pestaña activa por defecto — se reconstruye
 * ese mismo estado inicial exacto (`useState('calendario')`), pero como
 * `MasterCalendar` no existe todavía, la rama `tab === 'calendario'`
 * renderiza `null` en este Sprint (mismo patrón ya usado en
 * `InstallerDashboard`, Sprint 3.10, para sus pestañas no implementadas
 * todavía). La navegación (resaltado de pestaña activa, cambio de `tab`)
 * es real y funcional; solo el contenido de "Calendario maestro" queda
 * pendiente del Sprint 3.14.
 *
 * Sin props, sin CSS propio (compone únicamente clases ya portadas:
 * `.mx-subtabs-wrap`/`.mx-subtabs` desde el Sprint 3.3, y las de
 * `AdminInstaladores`).
 */
export function AdminPanel() {
  const [tab, setTab] = useState<'calendario' | 'instaladores'>('calendario');

  return (
    <div>
      <MxSubtabs>
        <MxSubtabButton
          active={tab === 'calendario'}
          icon={<Calendar size={14} />}
          onClick={() => setTab('calendario')}
        >
          Calendario maestro
        </MxSubtabButton>
        <MxSubtabButton
          active={tab === 'instaladores'}
          icon={<Users size={14} />}
          onClick={() => setTab('instaladores')}
        >
          Instaladores
        </MxSubtabButton>
      </MxSubtabs>
      {tab === 'instaladores' ? <AdminInstaladores /> : null}
    </div>
  );
}
