import { Building2, Calendar, LayoutDashboard, ShieldCheck, UserCog, Users } from 'lucide-react';
import { useState } from 'react';

import { AdminAdministradores } from '@/components/shared/admin-administradores';
import { AdminCoordinadores } from '@/components/shared/admin-coordinadores';
import { AdminEmpresasInstaladoras } from '@/components/shared/admin-empresas-instaladoras';
import { AdminInstaladores } from '@/components/shared/admin-instaladores';
import { AdminKpiDashboard } from '@/components/shared/admin-kpi-dashboard';
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
 * **AJUSTE DE INTEGRACIÓN (Sprint 8.1, "Evolución del BackOffice de
 * Administración")**: se agrega una tercera pestaña, "Dashboard" (ícono
 * `LayoutDashboard`), AHORA ACTIVA POR DEFECTO -- "Convertir la pantalla
 * principal del Administrador en un Dashboard Ejecutivo" (brief textual).
 * Renderiza `AdminKpiDashboard` (nuevo, ver su propio JSDoc para el detalle
 * completo de los 8 indicadores). Sin equivalente en
 * `Multimax_Despacho_v1.3.html` (este Sprint ya no migra HTML del
 * prototipo -- es evolución del BackOffice, fase posterior a la
 * reconstrucción 1:1) -- se integra con el mismo patrón de pestañas
 * `MxSubtabs`/`MxSubtabButton` ya usado por las otras 2, sin CSS/markup de
 * navegación nuevo. `MasterCalendar`/`AdminInstaladores` permanecen sin
 * ningún cambio, ahora accesibles como segunda/tercera pestaña en vez de
 * primera/segunda.
 *
 * **AJUSTE DE INTEGRACIÓN (Sprint 8.3, "Administración de Empresas
 * Instaladoras")**: se agrega una cuarta pestaña, "Empresas" (ícono
 * `Building2`), al final -- renderiza `AdminEmpresasInstaladoras` (NUEVO).
 * Mismo patrón `MxSubtabs`/`MxSubtabButton`, sin CSS/markup de navegación
 * nuevo. `AdminKpiDashboard`/`MasterCalendar`/`AdminInstaladores`
 * permanecen sin ningún cambio.
 *
 * **AJUSTE DE INTEGRACIÓN (Gestión de Administradores y Coordinadores,
 * cierre del Sprint C)**: se agrega una quinta pestaña, "Administradores"
 * (ícono `ShieldCheck`), al final -- renderiza `AdminAdministradores`
 * (NUEVO). Mismo patrón `MxSubtabs`/`MxSubtabButton`, sin CSS/markup de
 * navegación nuevo. Reutiliza exclusivamente los contratos ya validados en
 * el Sprint C (`adminsRepository`/`adminOperationsService.inviteAdmin`/
 * `.setAdminActivo`) -- sin tocar RLS/migraciones/Edge Functions. No se
 * agrega ninguna pestaña de "Coordinadores" todavía -- no existe backend
 * real para esa entidad (ver `ANALISIS_GESTION_USUARIOS.md`).
 * `AdminKpiDashboard`/`MasterCalendar`/`AdminInstaladores`/
 * `AdminEmpresasInstaladoras` permanecen sin ningún cambio.
 *
 * **AJUSTE DE INTEGRACIÓN (Sprint 9.3, "Gestión de Coordinadores")**: se
 * agrega una sexta pestaña, "Coordinadores" (ícono `UserCog`, para
 * distinguirla de "Instaladores"), al final -- renderiza
 * `AdminCoordinadores` (NUEVO). Mismo patrón `MxSubtabs`/`MxSubtabButton`,
 * sin CSS/markup de navegación nuevo. Reutiliza el mismo mecanismo de
 * `admin-operations` ya validado para Administradores (`invite_coordinador`/
 * `set_coordinador_activo`), sin tocar RLS/migraciones adicionales más allá
 * de las 2 ya aplicadas para este Sprint (`0015`/`0016`).
 * `AdminKpiDashboard`/`MasterCalendar`/`AdminInstaladores`/
 * `AdminEmpresasInstaladoras`/`AdminAdministradores` permanecen sin ningún
 * cambio.
 *
 * Sin props, sin CSS propio (compone únicamente clases ya portadas:
 * `.mx-subtabs-wrap`/`.mx-subtabs` desde el Sprint 3.3, y las de
 * `AdminKpiDashboard`/`MasterCalendar`/`AdminInstaladores`/
 * `AdminEmpresasInstaladoras`/`AdminAdministradores`/`AdminCoordinadores`).
 */
export function AdminPanel() {
  const [tab, setTab] = useState<
    'dashboard' | 'calendario' | 'instaladores' | 'empresas' | 'administradores' | 'coordinadores'
  >('dashboard');

  return (
    <div>
      <MxSubtabs>
        <MxSubtabButton
          active={tab === 'dashboard'}
          icon={<LayoutDashboard size={14} />}
          onClick={() => setTab('dashboard')}
        >
          Dashboard
        </MxSubtabButton>
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
        <MxSubtabButton
          active={tab === 'empresas'}
          icon={<Building2 size={14} />}
          onClick={() => setTab('empresas')}
        >
          Empresas
        </MxSubtabButton>
        <MxSubtabButton
          active={tab === 'administradores'}
          icon={<ShieldCheck size={14} />}
          onClick={() => setTab('administradores')}
        >
          Administradores
        </MxSubtabButton>
        <MxSubtabButton
          active={tab === 'coordinadores'}
          icon={<UserCog size={14} />}
          onClick={() => setTab('coordinadores')}
        >
          Coordinadores
        </MxSubtabButton>
      </MxSubtabs>
      {tab === 'dashboard' ? <AdminKpiDashboard /> : null}
      {tab === 'calendario' ? <MasterCalendar /> : null}
      {tab === 'instaladores' ? <AdminInstaladores /> : null}
      {tab === 'empresas' ? <AdminEmpresasInstaladoras /> : null}
      {tab === 'administradores' ? <AdminAdministradores /> : null}
      {tab === 'coordinadores' ? <AdminCoordinadores /> : null}
    </div>
  );
}
