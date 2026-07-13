import { ClipboardList, Crosshair } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { CoordinatorEmptyState } from '@/components/shared/coordinator-empty-state';
import { CountRing } from '@/components/shared/countring';
import { Footer } from '@/components/shared/footer';
import { Header } from '@/components/shared/header';
import { InstallerDashboard } from '@/components/shared/installer-dashboard';
import { LiveCountdown } from '@/components/shared/live-countdown';
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
 * Props mock de `CountRing` para la integración temporal del Sprint 3.8 (ver
 * bloque de documentación más abajo). NO son datos reales de una ronda de
 * bid — en el HTML fuente `remaining`/`total` provienen de `jobView` (motor
 * de trabajos, todavía no portado). `COUNTRING_DEMO_TOTAL` reproduce el
 * default real `(j.bidMins || 5) * 60` con `bidMins = 5`; `COUNTRING_DEMO_
 * REMAINING` es un valor fijo intermedio (no crítico, no vencido) solo para
 * poder validar visualmente el anillo sin depender de ningún timer/estado.
 */
const COUNTRING_DEMO_TOTAL = 300;
const COUNTRING_DEMO_REMAINING = 172;

/**
 * Props mock de `LiveCountdown` para la integración temporal del Sprint 3.9
 * (ver bloque de documentación más abajo). NO son datos reales de una ronda
 * de bid — en el HTML fuente `publishedAt`/`bidMins` provienen de cada
 * `job` de `jobs` dentro de `QueueBar` (motor de trabajos, todavía no
 * portado). `LIVECOUNTDOWN_DEMO_PUBLISHED_AT` se calcula una única vez, al
 * cargar este módulo, como "hace 60 segundos" (`Date.now() - 60_000`), para
 * que el countdown arranque a mitad de camino en vez de en el valor inicial;
 * `LIVECOUNTDOWN_DEMO_BID_MINS` reproduce el default real `j.bidMins || 5`
 * con `bidMins = 5` (mismo valor usado por `COUNTRING_DEMO_TOTAL` arriba).
 */
const LIVECOUNTDOWN_DEMO_PUBLISHED_AT = Date.now() - 60_000;
const LIVECOUNTDOWN_DEMO_BID_MINS = 5;

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
 * SUPERSEDIDO por el Sprint 3.10 (`InstallerDashboard`, ver bloque más
 * abajo): la estructura `<div className="mx-instwrap"><div/>
 * (placeholder)<InstallerSidebar/></div>` descrita en este bloque ya NO
 * existe en el código — se reemplazó por la composición real `.mx-instwrap`
 * (teléfono + panel lateral) que este mismo Sprint 3.2.1/3.2.2 anticipaba.
 * Se conserva este comentario histórico íntegro, sin editarlo, como registro
 * de la decisión original; `InstallerSidebar` en sí NO se modificó en el
 * Sprint 3.10, solo cambió su contexto de integración en este archivo.
 *
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
 *
 * ---------------------------------------------------------------------
 * TEMPORARY INTEGRATION — Sprint 3.8 (`CountRing`)
 * ---------------------------------------------------------------------
 * `CountRing` reconstruye `function CountRing({ remaining, total, size,
 * color })` (líneas 1437-1491 del HTML fuente) — un anillo SVG de countdown
 * sin ninguna clase CSS propia y sin estado/efectos/timers internos (función
 * pura derivada de sus props). En el HTML fuente, sus dos únicos usos reales
 * (líneas 3276 y 3317) están dentro de `Installer(props)` — pasos "alerta de
 * nueva solicitud" y "tu propuesta" del teléfono del Instalador (`mx-phone`/
 * `mx-alert`/`mx-offer`) — no dentro de `Coordinator`.
 *
 * Ese teléfono todavía no existe en el proyecto: el Sprint 3.2 solo migró
 * `mx-instside` (el panel lateral); el "Phone Placeholder" de
 * `.mx-instwrap` (ver bloque Sprint 3.2.1/3.2.2 arriba) sigue vacío a
 * propósito. Tampoco existe el motor de trabajos (`jobs`/`jobView`) que
 * alimentaría `remaining`/`total` con datos reales.
 *
 * Se consultó al usuario, que autorizó explícitamente esta integración
 * temporal (mismo criterio ya aprobado en los Sprints 3.5/3.6/3.7): montar
 * `CountRing` en `RootLayout.tsx`, sin rutas nuevas, sin cambios a React
 * Router, sin lógica de negocio ni implementación del flujo del Instalador,
 * únicamente para validación visual. Se monta dentro de `role ===
 * 'instalador'` (su rol real en el HTML fuente, a diferencia de `Radar`/
 * `CoordinatorEmptyState`, que sí pertenecen a `role === 'coordinador'`),
 * como hermano de `.mx-instwrap` — no dentro de ese grid, ya que `CountRing`
 * no forma parte de `mx-instside`/`InstallerSidebar` (que no se modifica) ni
 * de su layout de 2 columnas; su posición real está dentro del futuro
 * `mx-phone`, todavía no construido. Props mock `COUNTRING_DEMO_REMAINING`/
 * `COUNTRING_DEMO_TOTAL` definidas arriba (valores fijos, sin timer propio —
 * el timer real pertenece al motor de trabajos, fuera de alcance). Se
 * retirará de aquí y se recolocará dentro del `mx-phone` real en el Sprint
 * que implemente el flujo del Instalador. Ver "Problema encontrado /
 * propuesta de integración temporal" en docs/sprints/sprint-3.8.md.
 *
 * ---------------------------------------------------------------------
 * TEMPORARY INTEGRATION — Sprint 3.9 (`LiveCountdown`)
 * ---------------------------------------------------------------------
 * `LiveCountdown` reconstruye `function LiveCountdown({ publishedAt,
 * bidMins })` (líneas 2473-2493 del HTML fuente) — un `<span>` de texto con
 * su propio `useState`/`useEffect`/`setInterval`, sin ninguna clase CSS
 * propia. En el HTML fuente su único uso real es dentro de `statusPill(jb)`,
 * helper interno de `Coordinator(props)` (líneas 2171-2192), llamado una vez
 * por trabajo dentro de `QueueBar` (líneas 2193-2210) — no dentro de
 * `Installer`, a diferencia de `CountRing` (Sprint 3.8).
 *
 * Ese `QueueBar`/`statusPill` todavía no existe en el proyecto: el motor de
 * trabajos (`jobs`/`jobView`) que lo alimentaría no ha sido portado (mismo
 * bloqueo ya documentado para `CoordinatorEmptyState`/`Radar` en los
 * Sprints 3.6/3.7 — `jobs` arranca en `[]`, sin ningún seed/mock en el HTML
 * fuente).
 *
 * A partir de este Sprint aplica la nueva regla permanente del proyecto: la
 * integración temporal forma parte del propio Sprint y no requiere
 * autorización adicional (ver docs/sprints/sprint-3.9.md). Se monta aquí,
 * dentro de `role === 'coordinador'` (su rol real en el HTML fuente, igual
 * que `CoordinatorEmptyState`/`Radar`), como último elemento del bloque,
 * con las props mock `LIVECOUNTDOWN_DEMO_PUBLISHED_AT`/
 * `LIVECOUNTDOWN_DEMO_BID_MINS` definidas arriba — sin timer externo propio,
 * el temporizador real es interno al propio componente (`setInterval` de
 * 1000ms, tal como en el HTML fuente). Se retirará de aquí y se recolocará
 * dentro del `QueueBar` real en el Sprint que implemente el motor de
 * trabajos de `Coordinator`. Ver "Problema encontrado / decisión de
 * integración temporal" en docs/sprints/sprint-3.9.md.
 *
 * ---------------------------------------------------------------------
 * TEMPORARY INTEGRATION — Sprint 3.10 (`InstallerDashboard`)
 * ---------------------------------------------------------------------
 * `InstallerDashboard` reconstruye el subconjunto reconstruible de
 * `function Installer(props)` (líneas 3169-3452 del HTML fuente): la
 * composición `.mx-instwrap` completa (teléfono + panel lateral), la barra
 * del teléfono con el selector `.mx-mesel`, la navegación `.mx-phonetabs`
 * y el estado vacío de "Solicitudes" (`mx-phone-empty`) — ver JSDoc de
 * `installer-dashboard.tsx` y `docs/sprints/sprint-3.10.md` para el detalle
 * completo del alcance.
 *
 * Esta integración REEMPLAZA la del Sprint 3.2.1/3.2.2 (ver bloque
 * superseído más arriba): `InstallerDashboard` ya compone `InstallerSidebar`
 * internamente en su posición estructural real (columna derecha de
 * `.mx-instwrap`, junto al teléfono), así que el `<div className="mx-
 * instwrap">` ad-hoc con el Phone Placeholder vacío deja de ser necesario.
 * `InstallerSidebar` en sí no se modifica — solo cambia desde dónde se
 * monta.
 *
 * `meId`/`setMeId` reconstruyen el `useState("pty")` real de `App()` (línea
 * 1901) — en el HTML fuente este estado vive en `App()`, no dentro de
 * `Installer()`, y se pasa como prop; aquí se replica ese mismo reparto,
 * exactamente igual que `role`/`sucursalCoord`.
 *
 * La integración de `CountRing` (Sprint 3.8) NO se modifica ni se mueve en
 * este Sprint: su lugar real (`mx-alert-h`/`mx-offer-h`, dentro de la rama
 * `mx-alert`/`mx-offer` de "Solicitudes") sigue fuera de alcance — depende
 * del motor de trabajos real, igual que antes. Permanece como hermano
 * independiente de `InstallerDashboard`, con sus mismas props mock del
 * Sprint 3.8, hasta que exista esa rama real.
 *
 * Alcance NO cubierto por este Sprint, documentado y reportado: el resto de
 * "Solicitudes" (`mx-alert`/`mx-offer`/`mx-phone-sent`/`mx-phone-done`,
 * requieren `job`/motor de trabajos real) y el contenido de las pestañas
 * "Mis trabajos"/"Perfil" (`InstallerJobs()`/`InstallerProfile()`, Sprints
 * 3.12/3.11 respectivamente, ya reservados en `docs/SPRINTS_INDEX.md`) — ver
 * "Problema encontrado / decisiones de alcance" en `docs/sprints/sprint-3.10.md`.
 *
 * ---------------------------------------------------------------------
 * TEMPORARY INTEGRATION — Sprint 3.11 (`InstallerProfile`) [SUPERSEDIDA]
 * ---------------------------------------------------------------------
 * SUPERSEDIDA por un ajuste posterior al cierre visual del Sprint 3.11: el
 * mount independiente de `InstallerProfile` que este bloque describía ya NO
 * existe en el código — se retiró de `RootLayout.tsx`. El componente
 * (implementación, lógica, estilos y estructura, todos sin cambios) ahora
 * se renderiza directamente dentro de `InstallerDashboard`, en su rama real
 * `instTab === 'perfil'` (ver JSDoc de `installer-dashboard.tsx`, sección
 * "AJUSTE DE INTEGRACIÓN"), reutilizando el `meInfo` que ese componente ya
 * deriva de `INSTALLERS`/`meId` — en vez del `meInfo` mock fijo
 * (`INSTALLERS[0]`) que usaba este mount temporal.
 *
 * Se conserva íntegro el razonamiento original de esta decisión, como
 * registro histórico de por qué en el momento del Sprint 3.11 se optó por
 * un hermano independiente en `RootLayout.tsx` en vez de la integración
 * real: `InstallerProfile` reconstruye verbatim `function InstallerProfile({
 * meInfo })` (líneas ~3491-3524 del HTML fuente, `.mx-profscreen`). En el
 * HTML fuente, su único uso real es dentro de `Installer(props)`, cuando
 * `instTab === "perfil"` (línea ~3427) — el mismo lugar que, en este
 * proyecto, corresponde a la rama `instTab === 'perfil'` de
 * `InstallerDashboard` (Sprint 3.10). En ese momento, el brief del Sprint
 * 3.11 exigía integración temporal obligatoria en `RootLayout.tsx` para
 * validación visual, pero también prohibía modificar "InstallerDashboard
 * aprobado en Sprint 3.10" — por lo que conectar `InstallerProfile` a su
 * destino real habría requerido editar `installer-dashboard.tsx`, fuera de
 * lo permitido en ese brief. Se resolvió entonces con el mismo criterio ya
 * aplicado a `CountRing` (Sprint 3.8): montar `InstallerProfile` como
 * hermano independiente de `InstallerDashboard`. Tras la validación visual
 * del Sprint 3.11, el usuario autorizó explícitamente mover el punto de
 * integración al contenedor real (este ajuste), sin modificar el
 * componente en sí. Ver "Problema encontrado / decisión de integración
 * temporal" en `docs/sprints/sprint-3.11.md` para el detalle original.
 */
export function RootLayout() {
  const [role, setRole] = useState<Rol>('coordinador');
  const [sucursalCoord, setSucursalCoord] = useState('Multiplaza');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [meId, setMeId] = useState('pty');

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
            {/* TEMPORARY INTEGRATION — Sprint 3.9 (LiveCountdown): ver comentario de la función. */}
            <LiveCountdown
              publishedAt={LIVECOUNTDOWN_DEMO_PUBLISHED_AT}
              bidMins={LIVECOUNTDOWN_DEMO_BID_MINS}
            />
          </div>
        )}
        {/* TEMPORARY INTEGRATION — Sprint 3.10 (InstallerDashboard, reemplaza la integración de Sprint 3.2.1/3.2.2): ver comentario de la función. */}
        {role === 'instalador' && (
          <>
            <InstallerDashboard meId={meId} onMeIdChange={setMeId} />
            {/* TEMPORARY INTEGRATION — Sprint 3.8 (CountRing): ver comentario de la función. */}
            <CountRing remaining={COUNTRING_DEMO_REMAINING} total={COUNTRING_DEMO_TOTAL} />
          </>
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
