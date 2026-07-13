import { Bell, Briefcase, User } from 'lucide-react';
import { useState } from 'react';

import { InstallerJobs } from '@/components/shared/installer-jobs';
import { InstallerProfile } from '@/components/shared/installer-profile';
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
 *   "Mis trabajos" (`InstallerJobs()`, línea 3453) NO se implementó en este
 *   Sprint (3.10) — era una función real, propia, con selector propio
 *   (`.mx-myjobs`), reservada entonces como Sprint numerado independiente
 *   (`docs/SPRINTS_INDEX.md`: 3.12 "Installer Jobs"). ✅ Resuelta en el
 *   Sprint 3.12 — ver bloque "AJUSTE DE INTEGRACIÓN" más abajo.
 *
 * AJUSTE DE INTEGRACIÓN (post-Sprint 3.11): la pestaña "Perfil" SÍ renderiza
 * contenido real desde este ajuste — `InstallerProfile({ meInfo })`
 * (`.mx-profscreen`, Sprint 3.11, componente ya implementado y validado
 * visualmente en ese Sprint sin conexión real todavía). Este componente NO
 * se modifica aquí (ni su lógica, ni sus estilos, ni su estructura): se
 * reutiliza tal cual, reusando el mismo `meInfo` ya derivado arriba (línea
 * `INSTALLERS.find(...) ?? INSTALLERS[0]`) — el mismo dato que ya recibe
 * `InstallerSidebar`. Esto reemplaza la integración temporal previa del
 * Sprint 3.11, que montaba `InstallerProfile` como hermano independiente en
 * `RootLayout.tsx` (con un `meInfo` mock fijo, `INSTALLERS[0]`) por no
 * existir todavía, en ese momento, autorización para modificar este
 * componente. A partir de este ajuste, `RootLayout.tsx` únicamente renderiza
 * `InstallerDashboard` para `role === 'instalador'` — coincide exactamente
 * con `Installer(props)` en el HTML fuente (línea ~3427:
 * `instTab === "perfil" && React.createElement(InstallerProfile, { meInfo })`).
 *
 * AJUSTE DE INTEGRACIÓN (Sprint 3.12): la pestaña "Mis trabajos" ahora
 * también renderiza contenido real — `InstallerJobs()` (`.mx-myjobs`, Sprint
 * 3.12, sin props). Coincide exactamente con el HTML fuente (línea ~3426:
 * `instTab === "trabajos" && React.createElement(InstallerJobs)`). Desde el
 * Sprint 3.12 rige la nueva regla permanente de integración: como
 * `InstallerDashboard` ya existe, todo componente cuyo destino real sea una
 * de sus pestañas se integra directamente aquí, sin ningún mount temporal en
 * `RootLayout.tsx` (a diferencia de `InstallerProfile` en su entrega
 * inicial del Sprint 3.11, que sí tuvo un mount temporal por no existir
 * entonces autorización para modificar este archivo). `InstallerJobs` no
 * recibe ninguna prop — reconstruye la función homónima del HTML, que
 * tampoco las recibe; sus datos (`MISJOBS`/`ESTADO`) son constantes
 * reutilizables importadas directamente desde `@/constants`, no generadas
 * dentro de este componente.
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
          {instTab === 'trabajos' ? <InstallerJobs /> : null}
          {instTab === 'perfil' ? <InstallerProfile meInfo={meInfo} /> : null}
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
