import { Bell, Briefcase, User } from 'lucide-react';
import { useState } from 'react';

import { InstallerJobs } from '@/components/shared/installer-jobs';
import { InstallerProfile } from '@/components/shared/installer-profile';
import { InstallerSidebar } from '@/components/shared/installer-sidebar';
import { InstallerSolicitudes } from '@/components/shared/installer-solicitudes';
import { MxPhoneTabs } from '@/components/shared/mx-phone-tabs';
import { MxSubtabButton } from '@/components/shared/mx-subtab-button';
import { PhoneFrame, type PhoneFrameOption } from '@/components/shared/phone-frame';
import { TwoColumnLayout } from '@/components/shared/two-column-layout';
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
 * **Corrección posterior (pedida explícitamente por el usuario)**: la
 * primera versión de este ajuste mostraba `profile.empresaNombre` en esa
 * opción — resuelve al *tenant* real (`empresas`, p. ej. "Multimax"), NO a
 * una empresa instaladora (subcontratista) real, relación que todavía no
 * existe en el schema (la introducirá el Sprint 8.3). Mostrar el nombre del
 * tenant ahí era un valor real pero de la pregunta equivocada — se corrige a
 * la etiqueta fija "Pendiente de asignación" (mismo texto usado en
 * `installer-profile.tsx`), honesta mientras esa relación no exista.
 *
 * `InstallerProfile`/`InstallerSidebar` reciben datos derivados de ese mismo
 * `profile` en vez de `meInfo` (mock) — ver sus propios JSDoc para el detalle
 * de qué campos son reales y cuáles quedan como placeholder documentado por
 * ausencia estructural en el schema.
 */
export interface InstallerDashboardProps {
  profile: Perfil;
}

export function InstallerDashboard({ profile }: InstallerDashboardProps) {
  const [instTab, setInstTab] = useState<'solicitudes' | 'trabajos' | 'perfil'>('solicitudes');

  const empresaOptions: PhoneFrameOption[] = [{ value: profile.id, label: 'Pendiente de asignación' }];

  const info = profile.instaladorInfo;

  return (
    <TwoColumnLayout
      variant="phone"
      left={
        <PhoneFrame
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
          {instTab === 'solicitudes' ? <InstallerSolicitudes /> : null}
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
