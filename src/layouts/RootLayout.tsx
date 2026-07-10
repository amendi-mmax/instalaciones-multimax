import { ClipboardList, Crosshair } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { CoordinatorEmptyState } from '@/components/shared/coordinator-empty-state';
import { Footer } from '@/components/shared/footer';
import { Header } from '@/components/shared/header';
import { InstallerSidebar } from '@/components/shared/installer-sidebar';
import { MxSubtabButton } from '@/components/shared/mx-subtab-button';
import { MxSubtabs } from '@/components/shared/mx-subtabs';
import { PublishModal } from '@/components/shared/publish-modal';
import { Radar, type RadarInstallerState } from '@/components/shared/radar';
import { SucursalSelect } from '@/components/shared/sucursal-select';
import { ELIGIBLE_ORDER } from '@/constants';
import type { Rol } from '@/types/enums';

/**
 * Props mock de `Radar` para la integración temporal del Sprint 3.7 (ver
 * bloque de documentación más abajo). NO son datos reales de trabajos/bids
 * — son valores fijos de ejemplo, uno por cada color de la leyenda
 * ("Notificado"/"Abrió"/"Respondiendo"/"Respondió"/"Seleccionado"), para
 * poder validar visualmente el componente sin depender de `jobs`/lógica de
 * negocio real (que no existe todavía — ver docs/sprints/sprint-3.7.md).
 */
const RADAR_DEMO_NOTIFIED = ['pty', 'climatech', 'frio', 'airepro', 'cool'] as const;
const RADAR_DEMO_INST_STATE: Record<string, RadarInstallerState> = {
  pty: { state: 'notified' },
  climatech: { state: 'opened' },
  frio: { state: 'responding' },
  airepro: { state: 'responded' },
  cool: { state: 'selected' },
};

/**
 * RootLayout — equivalente de "AppShell" pedido en el listado de Layout de
 * Fase 3. El prototipo no distingue un `<AppShell>` de la raíz de la app:
 * `App()` renderiza directamente `<header className="mx-top">` seguido del
 * contenido de la vista activa (Coordinator/Installer/Admin) y
 * `<footer className="mx-foot">` (líneas ~2029-2071 del código fuente).
 * RootLayout reproduce esa misma composición como el layout raíz de React
 * Router (`<Outlet/>` en el lugar del contenido de vista), sin introducir
 * un nivel de anidamiento extra que no exista en el HTML original.
 *
 * El `role` que alimenta el Header es estado local (`useState`) — ver la
 * nota de decisión arquitectónica en `components/shared/header.tsx` sobre
 * por qué esto es un placeholder temporal hasta la fase de Auth.
 *
 * Sprint 3.1: no se pasan `sucursalActiva`/`hasActiveJobs`/`onReset` al
 * `Header` — el Despacho en vivo (Coordinator) todavía no existe, así que
 * se dejan los valores por defecto de `HeaderStatus`, que reproducen el
 * estado inicial exacto del prototipo (`sucursalCoord` = "Multiplaza",
 * `jobs` = []). Ver docs/sprints/sprint-3.1.md.
 *
 * ---------------------------------------------------------------------
 * TEMPORARY INTEGRATION — Sprint 3.2.1 (corregida en Sprint 3.2.2)
 * ---------------------------------------------------------------------
 * `InstallerSidebar` (creado en el Sprint 3.2, `mx-instside`) todavía no
 * tiene ningún layout/página real que lo monte (`layouts/InstallerLayout.tsx`
 * no existe — ver ARCHITECTURE.md §3 y docs/sprints/sprint-3.2.md). Para
 * poder validarlo visualmente en el navegador sin esperar a ese Sprint
 * futuro, se renderiza aquí temporalmente dentro de `<main>`, con valores
 * literales de ejemplo (no un mock de datos nuevo: solo números fijos para
 * esta prueba visual, ya que `InstallerProfileSummary` no admite props
 * opcionales/por defecto — ver docs/sprints/sprint-3.2.md §"riesgos").
 * No reemplaza ni anticipa el layout completo del Instalador. Debe
 * eliminarse de aquí en cuanto exista el Sprint que construya
 * `layouts/InstallerLayout.tsx` real.
 *
 * Sprint 3.2.2 corrige 3 problemas de la integración de 3.2.1, sin tocar
 * `InstallerSidebar` (ver docs/sprints/sprint-3.2.md §"Sprint 3.2.2"):
 *
 * 1) Antes se renderizaba para cualquier `role`. En el HTML fuente,
 *    `mx-instside` solo existe dentro de `Installer()`, que `App()` monta
 *    únicamente cuando `role === "inst"` (línea ~2113). Aquí se traduce
 *    como `role === 'instalador'` — nunca para `coordinador`/`admin`.
 *
 * 2) Antes se renderizaba como bloque de ancho completo, directo dentro de
 *    `<main>`. En el HTML fuente `<aside class="mx-instside">` es hermano
 *    de `<div class="mx-phone">` dentro de `<div class="mx-instwrap">`, un
 *    grid de 2 columnas (`.mx-instwrap{grid-template-columns:minmax(320px,
 *    400px) minmax(240px,300px);...}` — línea 169 del HTML fuente, ya
 *    portado a `globals.css` desde Fase 3, sin cambios en este Sprint).
 *    Envolver `InstallerSidebar` en `.mx-instwrap` le devuelve su columna
 *    angosta (240-300px) en vez de ocupar todo el ancho de `<main>`.
 *
 * 3) El contenedor "Main Workspace" (este `<main>`) no reservaba espacio
 *    para el futuro Phone. Se agrega un "Phone Placeholder" — un `<div>`
 *    vacío, sin clase `.mx-phone` ni contenido — como primer hijo de
 *    `.mx-instwrap`, únicamente para ocupar la primera columna del grid
 *    (`minmax(320px,400px)`) que el layout final usará para el teléfono.
 *    No se implementa aquí ningún estilo/contenido de `.mx-phone` —
 *    corresponde al Sprint que construya `layouts/InstallerLayout.tsx` /
 *    `PhoneFrame.tsx` (ver ARCHITECTURE.md §3).
 *
 * Estructura temporal resultante dentro de `<main>` (solo si
 * `role === 'instalador'`):
 *   <main> (Main Workspace)
 *     <div class="mx-instwrap">
 *       <div />               ← Phone Placeholder (reservado, vacío)
 *       <InstallerSidebar />   ← ya renderiza su propio <aside class="mx-instside">
 *     </div>
 *     <Outlet/>
 *
 * Padding/gap/alineación del grid (`.mx-instwrap`: gap 18px, padding
 * 22px 16px, justify-content:center, align-items:start) y el breakpoint
 * responsive (`@media (max-width:920px)`, ya portado en `globals.css`)
 * se toman tal cual del HTML — no se agregó ni modificó CSS en este
 * Sprint.
 *
 * ---------------------------------------------------------------------
 * TEMPORARY INTEGRATION — Sprint 3.3 (fix de integración visual)
 * ---------------------------------------------------------------------
 * `MxSubtabs`/`MxSubtabButton` (creados en el Sprint 3.3, `mx-subtabs`)
 * quedaron sin renderizarse en ningún lugar al cerrar ese Sprint — el
 * usuario confirmó que `npm run lint/typecheck/build/dev` pasan, pero
 * el bloque no era visible en pantalla, así que el Sprint no podía darse
 * por aprobado (ver docs/sprints/sprint-3.3.md → sección de corrección).
 *
 * En el HTML fuente, `.mx-subtabs` solo existe dentro de `App()`, rama
 * `role === "coord"` (línea ~2079), como el segundo elemento después del
 * selector "Sucursal activa" (`mx-suc-sel`, migrado en el Sprint 3.4) y
 * antes de `Coordinator`/`CoordinatorJobs` (no existen todavía). Aquí se
 * monta cuando `role === 'coordinador'`, como primer hijo de `<main>` —
 * mismo criterio que `InstallerSidebar` para `role === 'instalador'`: no
 * hay ninguna otra pieza de Coordinator que preceda a este bloque en este
 * proyecto todavía, así que no hay nada más que anteponerle sin salirse
 * de alcance.
 *
 * "Despacho en vivo" queda con `active` (coincide con el estado inicial
 * real del HTML, `useState("despacho")` — línea 1903) y "Mis trabajos"
 * inactivo. Ninguno de los dos botones recibe `onClick`: no se agrega
 * lógica de navegación ni estado real en este Sprint — son literales
 * fijos, igual que los valores de `InstallerSidebar` en el Sprint 3.2.1.
 * Se retira de aquí en cuanto exista el Sprint que construya
 * `Coordinator`/`layouts/CoordinatorLayout.tsx` real.
 *
 * ---------------------------------------------------------------------
 * TEMPORARY INTEGRATION — Sprint 3.4 (`mx-suc-sel`)
 * ---------------------------------------------------------------------
 * `SucursalSelect` reconstruye `<div class="mx-suc-sel">` (líneas 2071-2079
 * del HTML fuente), hermano de `.mx-subtabs-wrap` dentro de la misma rama
 * `role === "coord"` de `App()` — precede a `mx-subtabs`, exactamente el
 * mismo orden reproducido aquí. En el HTML fuente ambos hermanos comparten
 * un `<div>` contenedor anónimo (sin clase); se reproduce aquí con un
 * `<div>` sin clase envolviendo ambos, por fidelidad exacta de jerarquía.
 *
 * El estado (`sucursalCoord`/`setSucursalCoord`) vive en `RootLayout`, al
 * mismo nivel que `role` — igual que en el HTML fuente, donde ambos son
 * `useState` de `App()`. Valor inicial `"Multiplaza"`, idéntico al del
 * HTML fuente (línea 1906).
 *
 * Problema encontrado (reportado, no corregido): `HeaderStatus` ya muestra
 * un badge de sucursal (`sucursalActiva`, prop opcional con default
 * `"Multiplaza"` fijado en el Sprint 3.1 — ver `components/shared/header-
 * status.tsx`), pero `RootLayout` no se lo pasa. Ahora que existe un
 * `sucursalCoord` real, cambiar el `SucursalSelect` NO actualiza ese badge
 * — quedan desincronizados. No se corrige aquí: pasar `sucursalCoord` a
 * `Header` cuenta como modificar su integración fuera del alcance mínimo
 * de este Sprint ("No modificar Header"). Ver docs/sprints/sprint-3.4.md.
 *
 * ---------------------------------------------------------------------
 * TEMPORARY INTEGRATION — Sprint 3.5 (`PublishModal`)
 * ---------------------------------------------------------------------
 * `PublishModal` reconstruye la función `PublishModal()` del HTML fuente
 * (líneas 2496-2631). En `App()`, este bloque es un HERMANO de las ramas de
 * `role` (no está anidado dentro de `role === "coord"`): se renderiza
 * `showPublishModal && React.createElement(PublishModal, {...})` justo
 * después de `role === "admin" && AdminPanel` y antes de `confirmCancel &&
 * ConfirmCancel`/`<footer>` (línea 2121). Aquí se reproduce esa misma
 * posición: `PublishModal` se monta como hermano de los dos bloques
 * condicionados por `role` de arriba, sin condicionarlo por `role` (igual
 * que en el HTML fuente), justo antes de `<Outlet/>`.
 *
 * El nombre "Publish Modal" de `docs/SPRINTS_INDEX.md` SÍ corresponde al
 * bloque real — confirmado en el propio script (`function PublishModal(...)`,
 * línea 2496) — pero el DOM pre-renderizado (línea 457 del HTML) muestra un
 * bloque distinto y obsoleto (`.mx-publishwrap`/`.mx-publish`/`.mx-pub-h`),
 * que no aparece en ningún `React.createElement` del script. Ver "Problema
 * encontrado" en docs/sprints/sprint-3.5.md.
 *
 * `showPublishModal`/`setShowPublishModal` reproduce el estado homónimo de
 * `App()` (línea 1905). En el Sprint 3.5 se **forzó su valor inicial a
 * `true`** (el HTML fuente arranca en `false`) porque todavía no existía
 * ningún botón real "Publicar trabajo"/`onOpenPublish` que lo abriera. El
 * Sprint 3.6 revierte esa integración temporal (ver bloque de abajo): ahora
 * `showPublishModal` arranca en `false`, igual que el HTML fuente.
 *
 * `onPublish` no ejecuta ninguna lógica de negocio real todavía (no existe
 * ningún listado de trabajos/`TRABAJOS` que actualizar) — se sigue pasando
 * una función vacía, documentada como pendiente para el Sprint que
 * implemente la lógica real de `publishJob`.
 *
 * ---------------------------------------------------------------------
 * TEMPORARY INTEGRATION — Sprint 3.6 (`CoordinatorEmptyState`)
 * ---------------------------------------------------------------------
 * `CoordinatorEmptyState` reconstruye el único bloque JSX de
 * `function Coordinator(props)` alcanzable sin datos/lógica de negocio: el
 * `if (jobs.length === 0) return <div className="mx-qempty">...</div>`
 * (líneas 2146-2163 del HTML fuente). "Job Cards", el nombre genérico que
 * `docs/SPRINTS_INDEX.md` asignaba a este Sprint, NO corresponde a este
 * bloque — `mx-jobcard` y el resto de `Coordinator()` (QueueBar, Radar,
 * `AssignedPanel`, respuestas) solo existen cuando `jobs.length > 0`, y
 * `jobs` arranca en `[]` sin ningún seed/mock en el HTML fuente. Ver
 * "Determinación del bloque pendiente" en docs/sprints/sprint-3.6.md.
 *
 * En `App()`, `Coordinator` se renderiza como hermano de `mx-suc-sel`/
 * `mx-subtabs-wrap`, dentro de la misma rama `role === "coord"`, cuando
 * `coordTab === "despacho"` (línea 2096). Como `RootLayout` todavía no
 * tiene estado real de `coordTab` (Sprint 3.3 dejó "Despacho en vivo"/"Mis
 * trabajos" como literales fijos, sin `onClick`), `CoordinatorEmptyState`
 * se renderiza aquí de forma incondicional dentro de `role ===
 * 'coordinador'`, inmediatamente después de `MxSubtabs` — misma posición
 * relativa que el HTML fuente le da a `Coordinator`.
 *
 * `onOpenPublish` se conecta exactamente igual que en el HTML fuente
 * (línea 2107: `onOpenPublish: () => setShowPublishModal(true)`): esto
 * resuelve el pendiente documentado en el Sprint 3.5 ("sustituir
 * showPublishModal forzado por el botón real onOpenPublish cuando exista
 * Coordinator/QueueBar") — por eso `showPublishModal` vuelve a arrancar en
 * `false` en este Sprint.
 *
 * ---------------------------------------------------------------------
 * TEMPORARY INTEGRATION — Sprint 3.7 (`Radar`)
 * ---------------------------------------------------------------------
 * `Radar` reconstruye `function Radar({ notified, instState, eligibleIds })`
 * (líneas 1492-1745 del HTML fuente) — un único componente SVG (círculos
 * concéntricos, sweep animado, pines de instaladores, leyenda), sin ninguna
 * librería de mapas. En el HTML fuente, `Radar` solo se monta dentro de la
 * tarjeta "Despacho en vivo" de `Coordinator()` (líneas 2291-2295), que a su
 * vez solo se alcanza cuando `jobs.length > 0` — el mismo bloqueo ya
 * documentado en el Sprint 3.6 para `CoordinatorEmptyState` (`jobs` arranca
 * en `[]`, sin ningún seed/mock en el HTML fuente).
 *
 * Como esa tarjeta real todavía no existe, `Radar` no tiene consumidor real
 * dentro del flujo de la aplicación. Se consultó explícitamente al usuario
 * cómo proceder dado que el brief de este Sprint prohibía crear "navegación
 * temporal" y no existe ninguna página de showcase (eliminada en el Sprint
 * 3.1) — el usuario aprobó una excepción explícita: integrar temporalmente
 * en `RootLayout.tsx`, sin crear rutas nuevas, sin modificar React Router,
 * sin alterar arquitectura ni introducir lógica de negocio, documentado como
 * temporal. Aquí se aplica ese criterio: `Radar` se monta dentro de `role
 * === 'coordinador'`, después de `CoordinatorEmptyState`, con las props mock
 * `RADAR_DEMO_NOTIFIED`/`RADAR_DEMO_INST_STATE` definidas arriba (una
 * combinación fija que ejercita los 5 colores de la leyenda) y
 * `eligibleIds={ELIGIBLE_ORDER}` (constante real del HTML fuente, no
 * inventada). Se retirará de aquí — junto con `CoordinatorEmptyState` — en
 * el Sprint que construya la tarjeta real "Despacho en vivo" de
 * `Coordinator`, donde `Radar` recibirá props derivadas del `job` activo en
 * vez de este mock. Ver "Problema encontrado / decisión de integración
 * temporal" en docs/sprints/sprint-3.7.md.
 */
export function RootLayout() {
  const [role, setRole] = useState<Rol>('coordinador');
  const [sucursalCoord, setSucursalCoord] = useState('Multiplaza');
  const [showPublishModal, setShowPublishModal] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Header role={role} onRoleChange={setRole} />
      <main className="flex-1">
        {/* TEMPORARY INTEGRATION — Sprint 3.3 (fix de integración visual) + Sprint 3.4 (mx-suc-sel): ver comentario de la función. */}
        {role === 'coordinador' && (
          <div>
            <SucursalSelect value={sucursalCoord} onChange={setSucursalCoord} />
            <MxSubtabs>
              <MxSubtabButton active icon={<Crosshair size={14} />}>
                Despacho en vivo
              </MxSubtabButton>
              <MxSubtabButton active={false} icon={<ClipboardList size={14} />}>
                Mis trabajos
              </MxSubtabButton>
            </MxSubtabs>
            {/* TEMPORARY INTEGRATION — Sprint 3.6 (CoordinatorEmptyState): ver comentario de la función. */}
            <CoordinatorEmptyState onOpenPublish={() => setShowPublishModal(true)} />
            {/* TEMPORARY INTEGRATION — Sprint 3.7 (Radar): ver comentario de la función. */}
            <Radar
              notified={RADAR_DEMO_NOTIFIED}
              instState={RADAR_DEMO_INST_STATE}
              eligibleIds={ELIGIBLE_ORDER}
            />
          </div>
        )}
        {/* TEMPORARY INTEGRATION — Sprint 3.2.1, corregida en 3.2.2: ver comentario de la función. */}
        {role === 'instalador' && (
          <div className="mx-instwrap">
            {/* Phone Placeholder — reserva la primera columna del grid para
                el futuro `layouts/InstallerLayout.tsx` (mx-phone). No se
                implementa contenido/estilo de Phone en este Sprint. */}
            <div />
            <InstallerSidebar rating={4.9} km={1.8} cumplimiento={98} aceptacion={92} />
          </div>
        )}
        {/* TEMPORARY INTEGRATION — Sprint 3.5 (PublishModal): ver comentario de la función. */}
        <PublishModal
          sucursal={sucursalCoord}
          open={showPublishModal}
          onOpenChange={setShowPublishModal}
          onPublish={() => {
            /* Sin lógica de negocio en este Sprint — ver comentario de la función. */
          }}
        />
        <Outlet context={{ role }} />
      </main>
      <Footer />
    </div>
  );
}
