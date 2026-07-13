import { Bell, Briefcase, User } from 'lucide-react';
import { useState } from 'react';

import { InstallerSidebar } from '@/components/shared/installer-sidebar';
import { InstallerSolicitudesEmptyState } from '@/components/shared/installer-solicitudes-empty-state';
import { MxPhoneTabs } from '@/components/shared/mx-phone-tabs';
import { MxSubtabButton } from '@/components/shared/mx-subtab-button';
import { PhoneFrame, type PhoneFrameOption } from '@/components/shared/phone-frame';
import { TwoColumnLayout } from '@/components/shared/two-column-layout';
import { INSTALLERS } from '@/constants';

/**
 * InstallerDashboard — reconstruye el subconjunto reconstruible de
 * `function Installer(props)` (`Multimax_Despacho_v1.3.html`, líneas
 * 3169-3452 — Sprint 3.10): la composición raíz `.mx-instwrap` (teléfono +
 * panel lateral), la barra del teléfono con el selector "quién soy"
 * (`.mx-mesel`), la navegación inferior de 3 pestañas (`.mx-phonetabs`,
 * `instTab`) y el único contenido de la pestaña "Solicitudes" alcanzable
 * sin motor de trabajos (`mx-phone-empty`, ver `InstallerSolicitudesEmptyState`).
 *
 * "Installer Dashboard" (nombre genérico del brief de este Sprint) NO es el
 * nombre de ninguna función real del HTML — no existe `function
 * InstallerDashboard`. La función real y equivalente es `Installer(props)`,
 * el componente raíz que `App()` monta cuando `role === "inst"` (línea
 * 2113), análogo a como `Coordinator(props)` es la raíz de `role ===
 * "coord"`. Se documenta esta correspondencia en vez de asumirla — mismo
 * criterio aplicado en los Sprints 3.4/3.6 para nombres genéricos que no
 * coincidían exactamente con una función real.
 *
 * Alcance de este Sprint dentro de `Installer(props)`:
 * - SÍ reconstruido aquí: `.mx-instwrap` (vía `TwoColumnLayout
 *   variant="phone"`, Fase 3, primer consumidor real), `.mx-phone`/
 *   `.mx-phone-bar`/`.mx-mesel` (vía `PhoneFrame`, Fase 3, primer
 *   consumidor real), `.mx-phonetabs` (vía `MxPhoneTabs`, nuevo, + botones
 *   `MxSubtabButton` reutilizados de Sprint 3.3), `.mx-instside` (vía
 *   `InstallerSidebar`, Sprint 3.2, ahora en su posición estructural real
 *   por primera vez), y el estado vacío de "Solicitudes" (`mx-phone-empty`,
 *   vía `InstallerSolicitudesEmptyState`, nuevo).
 * - NO reconstruido aquí (fuera de alcance, con motivo documentado): el
 *   resto de la pestaña "Solicitudes" (`mx-alert`/`mx-offer`/
 *   `mx-phone-sent`/`mx-phone-done` en sus 3 variantes) depende de
 *   `job`/`me`/`step` — motor de trabajos real, todavía inexistente, mismo
 *   bloqueo que `Coordinator()` (Sprint 3.6). El contenido de la pestaña
 *   "Mis trabajos" (`InstallerJobs()`, línea 3453) y de la pestaña "Perfil"
 *   (`InstallerProfile()`, línea 3491) NO se implementan en este Sprint —
 *   son funciones reales, propias, con selector propio (`.mx-myjobs`/
 *   `.mx-profscreen`), ya reservadas como Sprints numerados independientes
 *   (`docs/SPRINTS_INDEX.md`: 3.11 "Installer Profile", 3.12 "Installer
 *   Jobs") — implementarlas aquí invadiría su alcance. Al activar esas dos
 *   pestañas, `InstallerDashboard` no renderiza ningún contenido (`null`) —
 *   la navegación (resaltado de la pestaña activa) sí es real y funcional,
 *   pero su destino queda pendiente de esos Sprints futuros. Ver "Problema
 *   encontrado / decisiones de alcance" en docs/sprints/sprint-3.10.md.
 *
 * Estado: `instTab` reconstruye el `useState("solicitudes")` real, interno
 * de `Installer(props)` en el HTML fuente. `meId`/`onMeIdChange` NO son
 * estado interno de este componente — en el HTML fuente, `meId`/`setMeId`
 * son `useState` de `App()` (línea 1901: `useState("pty")`), pasados a
 * `Installer` como props; aquí se replica exactamente ese mismo reparto de
 * responsabilidades, recibiéndolos como props desde `RootLayout` (nuestro
 * equivalente de `App()`), igual que ya hacen `role`/`sucursalCoord`.
 *
 * `meInfo` reconstruye `INSTALLERS.find(i => i.id === meId)` (línea 3204).
 * Se agrega un fallback a `INSTALLERS[0]` — adaptación técnica no visual
 * para satisfacer TypeScript estricto ante el resultado potencialmente
 * `undefined` de `.find()`; en la práctica `meId` siempre coincide con una
 * opción real del propio `<select>` (`options`, ver abajo), igual que en el
 * HTML fuente, así que el fallback nunca se activa en uso normal.
 *
 * `onChange` del selector `.mx-mesel` en el HTML fuente también reinicia
 * `step` a `"alert"` (línea 3405: `setMeId(e.target.value); setStep("alert")`).
 * `step` no existe en este subconjunto reconstruido (pertenece a la rama
 * `mx-alert`/`mx-offer`, fuera de alcance) — se omite esa parte del handler
 * sin alterar el resto; reportado como limitación conocida, no corregida en
 * silencio.
 */
export interface InstallerDashboardProps {
  meId: string;
  onMeIdChange: (id: string) => void;
}

export function InstallerDashboard({ meId, onMeIdChange }: InstallerDashboardProps) {
  const [instTab, setInstTab] = useState<'solicitudes' | 'trabajos' | 'perfil'>('solicitudes');

  const meInfo = INSTALLERS.find((installer) => installer.id === meId) ?? INSTALLERS[0];

  const mesElOptions: PhoneFrameOption[] = INSTALLERS.filter(
    (installer) => !installer.susp && installer.docs,
  ).map((installer) => ({ value: installer.id, label: installer.nombre }));

  return (
    <TwoColumnLayout
      variant="phone"
      left={
        <PhoneFrame
          options={mesElOptions}
          selected={meId}
          onSelectedChange={onMeIdChange}
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
          {instTab === 'solicitudes' ? <InstallerSolicitudesEmptyState /> : null}
        </PhoneFrame>
      }
      right={
        <InstallerSidebar
          rating={meInfo.rating}
          km={meInfo.km}
          cumplimiento={meInfo.cumpl}
          aceptacion={meInfo.acept}
        />
      }
    />
  );
}
