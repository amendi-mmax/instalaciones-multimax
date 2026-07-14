import { Calendar, Users } from 'lucide-react';
import { useState } from 'react';

import { AdminInstaladores } from '@/components/shared/admin-instaladores';
import { MasterCalendar } from '@/components/shared/master-calendar';
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
 * "instaladores") — ternario verbatim del HTML fuente (línea 3047:
 * `tab === "calendario" ? React.createElement(MasterCalendar, null) :
 * React.createElement(AdminInstaladores, null)`).
 *
 * **AJUSTE DE INTEGRACIÓN (Sprint 3.14)**: hasta el Sprint 3.13, la rama
 * `tab === 'calendario'` renderizaba `null` porque `MasterCalendar` no
 * existía todavía (limitación documentada en ese Sprint, mismo patrón usado
 * en `InstallerDashboard`, Sprint 3.10, para sus pestañas pendientes). El
 * Sprint 3.14 construyó `MasterCalendar` (`src/components/shared/
 * master-calendar.tsx`) y esta rama ahora la renderiza — integración real y
 * directa dentro del contenedor que ya existía (`AdminPanel`), sin ningún
 * mount temporal en `RootLayout.tsx`, que no requirió ningún cambio. Se
 * reemplazó el ternario `tab === 'instaladores' ? <AdminInstaladores/> :
 * null` (Sprint 3.13) por el ternario verbatim del HTML fuente (arriba),
 * ahora que ambas ramas tienen componente real.
 *
 * Sin props, sin CSS propio (compone únicamente clases ya portadas:
 * `.mx-subtabs-wrap`/`.mx-subtabs` desde el Sprint 3.3, y las de
 * `MasterCalendar`/`AdminInstaladores`).
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
      {tab === 'calendario' ? <MasterCalendar /> : <AdminInstaladores />}
    </div>
  );
}
