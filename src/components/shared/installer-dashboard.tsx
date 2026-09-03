import { Bell, Briefcase, Building2, User } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { InstallerJobs } from '@/components/shared/installer-jobs';
import { InstallerProfile } from '@/components/shared/installer-profile';
import { InstallerResumenStrip } from '@/components/shared/installer-resumen-strip';
import { InstallerSidebar } from '@/components/shared/installer-sidebar';
import { InstallerSolicitudes } from '@/components/shared/installer-solicitudes';
import { MxPhoneTabs } from '@/components/shared/mx-phone-tabs';
import { MxSubtabButton } from '@/components/shared/mx-subtab-button';
import { PhoneFrame, type PhoneFrameOption } from '@/components/shared/phone-frame';
import { TwoColumnLayout } from '@/components/shared/two-column-layout';
import { useEmpresaInstaladoraNombre } from '@/hooks/useEmpresaInstaladoraNombre';
import { categoriaDeTrabajo } from '@/lib/trabajo-categoria';
import { trabajosParaInstaladorRepository } from '@/repositories';
import type { Perfil } from '@/types/perfil';

/**
 * InstallerDashboard — reconstruye el subconjunto reconstruible de
 * `function Installer(props)` (`Multimax_Despacho_v1.3.html`, líneas
 * 3169-3452 — Sprint 3.10). Ver historial completo de integración en
 * `RootLayout.tsx` (Sprints 3.10/3.11/3.12/7.2).
 *
 * **Estabilización del módulo Instalador (post Sprint 8.2)**: hasta esta
 * ronda, `meId`/`onMeIdChange` (estado de `RootLayout.tsx`) permitían elegir
 * entre varias identidades mock (`INSTALLERS`, cada una una "empresa
 * instaladora" de demostración distinta) — comportamiento incorrecto para
 * producción: un instalador real solo pertenece a su propia empresa
 * (`instaladores.empresa_id`), nunca la elige ni la cambia. Se retira por
 * completo ese mecanismo: `InstallerDashboard` ahora recibe el `Perfil` real
 * ya resuelto por `RootLayout.tsx` (mismo patrón ya usado por `<Header
 * profile={profile}/>`, sin duplicar ninguna llamada a `useAuth()`), y el
 * selector `.mx-mesel` de `PhoneFrame` pasa a mostrar una única opción fija,
 * deshabilitada (`disabled`, ver JSDoc de `phone-frame.tsx`) — visualmente
 * el mismo control, ya no editable.
 *
 * **Corrección posterior (pedida explícitamente por el usuario en su
 * momento)**: la primera versión de este ajuste mostraba
 * `profile.empresaNombre` en esa opción — resuelve al *tenant* real
 * (`empresas`, p. ej. "Multimax"), NO a una empresa instaladora
 * (subcontratista) real, relación que en ese momento todavía no existía en
 * el schema (la introdujo el Sprint 8.3/8.4). Se corrigió entonces a la
 * etiqueta fija "Pendiente de asignación".
 *
 * **Ajustes funcionales del flujo Instalador**: esa relación
 * (`instaladores.empresa_instaladora_id`) ya existe desde el Sprint 8.4 y
 * ya se resuelve correctamente en `InstallerProfile` -- pero este
 * encabezado nunca se actualizó para usarla, seguía mostrando el literal
 * fijo `"Multimax · Instalador"` (hardcodeado dentro de `PhoneFrame`) y
 * "Pendiente de asignación" siempre, sin importar si el instalador ya
 * tenía empresa asignada. Corregido: `headerLabel` ahora usa el nombre
 * real de la empresa instaladora (mismo hook `useEmpresaInstaladoraNombre`
 * que ya usa `InstallerProfile`, sin duplicar la resolución), con
 * `profile.empresaNombre` (el tenant real, "Multimax") como respaldo
 * mientras no haya empresa instaladora asignada -- nunca un texto
 * inventado. El selector (`empresaOptions`, sigue deshabilitado, con una
 * única opción fija) ahora muestra la zona real del instalador en vez de
 * repetir el mismo texto de "Pendiente de asignación".
 *
 * `InstallerProfile`/`InstallerSidebar`/`InstallerSolicitudes` reciben datos
 * derivados de ese mismo `profile` en vez de `meInfo` (mock) — ver sus
 * propios JSDoc para el detalle de qué campos son reales y cuáles quedan
 * como placeholder documentado por ausencia estructural en el schema.
 *
 * **Ajustes finales del flujo Instalador — cabecera del portal**: se
 * reemplaza el `headerLabel` de una sola línea ("Empresa · Instalador") por
 * un bloque de 2 líneas (empresa como elemento principal, "Instalador"
 * como subtítulo) + badge de estado a la derecha (`Badge tone="green"`,
 * mismo componente ya usado en `AdminInstaladores`/`TrabajoDetailPage`, sin
 * introducir ningún primitivo visual nuevo). Se compone enteramente acá,
 * como contenido de `headerLabel` (`ReactNode`, ya lo admitía) -- NO se
 * toca `phone-frame.tsx`: su estructura (`.mx-phone-bar`/`.mx-dot`/
 * `.mx-mesel`) permanece exactamente igual, incluida la información de
 * zona/badges "EN TU ZONA"/"OTRA ZONA" dentro de `InstallerSolicitudes`
 * (sin relación con este cambio, no se toca). `profile.estado` ya modela
 * "Activo" (ver `estadoDesdeFlags()`, `profile.service.ts`) -- se reutiliza
 * ese mismo valor, no se inventa un estado nuevo.
 */
export interface InstallerDashboardProps {
  profile: Perfil;
}

export function InstallerDashboard({ profile }: InstallerDashboardProps) {
  const [instTab, setInstTab] = useState<'solicitudes' | 'trabajos' | 'perfil'>('solicitudes');

  /**
   * Ajustes finales del flujo Instalador -- resumen superior
   * ("X disponibles" / "Y en curso"). Misma fuente real que ya consumen
   * `InstallerSolicitudes`/`InstallerJobs` (`trabajos_para_instalador`,
   * RLS-scoped al instalador autenticado) -- una consulta adicional
   * dedicada al resumen, deliberada: se mantiene aislada de
   * `InstallerSolicitudes`/`InstallerJobs` (cero cambios en esos 2
   * archivos, cero riesgo de regresión sobre componentes ya validados en
   * Producción) en vez de forzar un refactor de "elevar el fetch" no
   * relacionado con el resto de este ajuste.
   *
   * "Disponibles" = trabajos `live` visibles para este instalador
   * (visibilidad ampliada, migración `0018` -- cualquier `estado_trabajo
   * === 'live'` de su empresa, no solo los notificados). "En curso" =
   * misma categoría `'asignados'` que ya usa `InstallerJobs`
   * (`categoriaDeTrabajo()`, reutilizada sin duplicar su lógica).
   */
  const [disponibles, setDisponibles] = useState(0);
  const [enCurso, setEnCurso] = useState(0);

  useEffect(() => {
    let active = true;
    trabajosParaInstaladorRepository.getAll().then((result) => {
      if (!active || !result.ok) return;
      setDisponibles(result.data.filter((trabajo) => trabajo.estado_trabajo === 'live').length);
      setEnCurso(result.data.filter((trabajo) => categoriaDeTrabajo(trabajo) === 'asignados').length);
    });
    return () => {
      active = false;
    };
  }, []);

  const empresaInstaladoraNombre = useEmpresaInstaladoraNombre(profile.empresaInstaladoraId);
  const nombreEmpresaMostrado = empresaInstaladoraNombre ?? profile.empresaNombre ?? 'Multimax';
  const headerLabel = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
      <Building2 size={16} style={{ flexShrink: 0, color: 'var(--ice)' }} />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {nombreEmpresaMostrado}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--muted)' }}>Instalador</span>
      </span>
      {profile.estado === 'activo' ? (
        <Badge tone="green" style={{ marginLeft: 'auto', flexShrink: 0 }}>
          ● Activo
        </Badge>
      ) : null}
    </span>
  );
  const empresaOptions: PhoneFrameOption[] = [
    { value: profile.id, label: profile.zona ?? 'Sin zona asignada' },
  ];

  const info = profile.instaladorInfo;

  return (
    <TwoColumnLayout
      variant="phone"
      left={
        <PhoneFrame
          headerLabel={headerLabel}
          options={empresaOptions}
          selected={profile.id}
          onSelectedChange={() => undefined}
          disabled
          tabs={
            <MxPhoneTabs>
              <MxSubtabButton
                active={instTab === 'solicitudes'}
                icon={<Bell size={16} />}
                onClick={() => setInstTab('solicitudes')}
              >
                Solicitudes
              </MxSubtabButton>
              <MxSubtabButton
                active={instTab === 'trabajos'}
                icon={<Briefcase size={16} />}
                onClick={() => setInstTab('trabajos')}
              >
                Mis trabajos
              </MxSubtabButton>
              <MxSubtabButton
                active={instTab === 'perfil'}
                icon={<User size={16} />}
                onClick={() => setInstTab('perfil')}
              >
                Perfil
              </MxSubtabButton>
            </MxPhoneTabs>
          }
        >
          <InstallerResumenStrip disponibles={disponibles} enCurso={enCurso} />
          {instTab === 'solicitudes' ? <InstallerSolicitudes profile={profile} /> : null}
          {instTab === 'trabajos' ? <InstallerJobs /> : null}
          {instTab === 'perfil' ? <InstallerProfile profile={profile} /> : null}
        </PhoneFrame>
      }
      right={
        <InstallerSidebar
          rating={info?.rating ?? null}
          km={info?.km ?? null}
          cumplimiento={info?.cumplimiento ?? null}
          aceptacion={info?.aceptacion ?? null}
        />
      }
    />
  );
}
