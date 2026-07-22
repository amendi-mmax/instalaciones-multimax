import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AdminPanel } from '@/components/shared/admin-panel';
import { AdminVistaSwitch, type AdminVista } from '@/components/shared/admin-vista-switch';
import { CountRing } from '@/components/shared/countring';
import { Footer } from '@/components/shared/footer';
import { Header } from '@/components/shared/header';
import { InstallerDashboard } from '@/components/shared/installer-dashboard';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';
import { CoordinatorLayout } from '@/layouts/CoordinatorLayout';
import { OperationalContextProvider } from '@/providers/OperationalContextProvider';
import type { ModoVisualizacion } from '@/providers/operational-context.context';

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
 *
 * ---------------------------------------------------------------------
 * INTEGRACIÓN REAL — Sprint 3.13 (`AdminPanel`)
 * ---------------------------------------------------------------------
 * `AdminPanel` reconstruye verbatim `function AdminPanel()` (líneas
 * 3031-3048 del HTML fuente) — la raíz del panel de Administrador. En el
 * HTML fuente, `App()` la monta como `role === "admin" && React.
 * createElement(AdminPanel, null)` (línea 2121), hermano directo de las
 * ramas `role === "coord"`/`role === "inst"` — exactamente la misma
 * posición donde ya viven, en este archivo, los bloques `role ===
 * 'coordinador'`/`role === 'instalador'`.
 *
 * A diferencia de `CountRing`/`Radar`/`LiveCountdown`/`InstallerProfile`
 * (en su entrega inicial), este NO es un mount temporal: `RootLayout.tsx`
 * ya es, desde el Sprint 3.1, el equivalente directo de `App()` — el
 * "contenedor" real de `AdminPanel` (la rama `role === "admin"` de `App()`)
 * ya existe en el proyecto, así que se integra aquí directamente, sin
 * ningún JSDoc de "retirar cuando exista el layout real" — coincide 1:1 con
 * el HTML fuente, no es una solución provisional. Ver "Regla de
 * integración" en `docs/sprints/sprint-3.13.md`.
 *
 * `AdminPanel` no recibe props ni mocks desde aquí: internamente reutiliza
 * `INSTALLERS`/`ZONAS` (ya migrados) a través de `AdminInstaladores`. Ver
 * JSDoc de `admin-panel.tsx`/`admin-instaladores.tsx` para el detalle
 * completo del alcance (incluida la pestaña "Calendario maestro", fuera de
 * alcance de este Sprint — reservada para el Sprint 3.14).
 *
 * ---------------------------------------------------------------------
 * TEMPORARY INTEGRATION — Sprint 3.15 (`ConfirmCancelDialog` / `ConfirmCancel`)
 * ---------------------------------------------------------------------
 * `ConfirmCancelDialog` reconstruye `function ConfirmCancel({ onYes, onNo })`
 * (líneas 3531-3553 del HTML fuente) — ver `docs/sprints/sprint-3.15.md` para
 * el análisis completo y la corrección de nombre ("Shared Dialogs" →
 * `ConfirmCancel`). En el HTML fuente, su único consumidor real es el botón
 * "Cancelar" (`mx-btn mx-btn-ghost`, líneas 2312-2321) dentro de la fila de
 * acciones (`mx-actionsrow`) de un trabajo activo/asignado, que a su vez solo
 * existe dentro de `Coordinator(props)` cuando `jobs.length > 0` — el mismo
 * bloqueo ya documentado para `CoordinatorEmptyState`/`Radar`/`LiveCountdown`
 * (Sprints 3.6/3.7/3.9): `Coordinator` (la variante con tarjetas de trabajo)
 * no existe todavía en el proyecto (`jobs` arranca en `[]`, sin motor de
 * trabajos portado).
 *
 * Para poder validar visualmente el diálogo sin depender de ese motor, se
 * agrega aquí, dentro de `role === 'coordinador'`, un botón disparador
 * temporal que reproduce verbatim la apariencia real del botón "Cancelar" de
 * `Coordinator()` (mismas clases `mx-btn mx-btn-ghost`, mismo `style` en
 * línea con color/borde rojo, mismo ícono `XCircle` de 14px, mismo texto) —
 * mismo criterio que la integración temporal del Sprint 3.9. El estado
 * `confirmCancelOpen`/`setConfirmCancelOpen` reemplaza aquí al `confirmCancel`
 * (string | null, id de trabajo) de `App()` — no hay ningún `job.id` real que
 * rastrear todavía, así que se simplifica a un booleano de solo
 * abrir/cerrar, sin cambiar el comportamiento visible del diálogo en sí.
 * `onYes` no ejecuta ninguna lógica de negocio real todavía (no existe
 * ningún `job`/`jobs` que cancelar) — se documenta como pendiente para el
 * Sprint que implemente el motor de trabajos real de `Coordinator`, mismo
 * criterio ya aplicado a `onPublish` en el Sprint 3.5. Se retirará este botón
 * disparador temporal y se recolocará `ConfirmCancelDialog` dentro de la fila
 * de acciones real en el Sprint que construya `Coordinator`/`QueueBar`.
 *
 * ---------------------------------------------------------------------
 * SPRINT 4.2.1 — `role` deja de ser un `useState` editable a mano
 * ---------------------------------------------------------------------
 * Hasta este Sprint, `role` era `useState<Rol>('coordinador')`, controlado
 * por el selector manual del Header (`HeaderRoleSwitch`, ya retirado — ver
 * `header.tsx`). Esta era una decisión de Fase 3 explícitamente temporal
 * ("se elimina en la fase de Auth, a favor del rol derivado de la sesión de
 * Supabase" — ARCHITECTURE.md §4/§13.2), que este Sprint ejecuta: `role` se
 * deriva ahora de `profile.rol` (`useAuth()`, resuelto contra
 * `admins`/`coordinadores`/`instaladores` reales — ver
 * `services/profile.service.ts`), nunca de un estado local editable.
 *
 * Todo el resto de este componente (los 3 bloques `role === '...'`, sus
 * componentes ya aprobados -- `CoordinatorEmptyState`/`Radar`/
 * `LiveCountdown`/`InstallerDashboard`/`CountRing`/`AdminPanel`/
 * `PublishModal`/`ConfirmCancelDialog` -- y sus mocks/integraciones
 * temporales documentadas arriba) permanece **sin ningún cambio**: la
 * variable `role` sigue llamándose igual y sigue siendo del mismo tipo
 * (`Rol`, reexportado desde `types/perfil.ts`), así que ningún bloque
 * condicional existente necesitó tocarse.
 *
 * Se agregan dos guardas nuevas, antes de renderizar ese contenido: (1)
 * mientras `profileLoading` es `true`, se muestra `Loading` en vez del
 * shell; (2) si terminó de cargar y `profile` sigue siendo `null` (sin fila
 * en ninguna de las 3 tablas -- ver la limitación de RLS documentada en
 * `profile.service.ts` -- o perfil `suspendido`), se cierra la sesión y se
 * redirige a `/login` con el motivo correspondiente, en vez de renderizar
 * el shell con un rol adivinado. Ver `SPRINT_4_2_1_AUTH_REPORT.md` para el
 * detalle completo de esta decisión.
 *
 * ---------------------------------------------------------------------
 * SPRINT 5.1 — el bloque `role === 'coordinador'` pasa a ser rutas reales
 * ---------------------------------------------------------------------
 * Hasta este Sprint, `role === 'coordinador'` renderizaba inline
 * `SucursalSelect` + `MxSubtabs`/`MxSubtabButton` (literales, sin
 * `onClick` real, ver Sprint 3.3 más arriba) + las integraciones
 * temporales `CoordinatorEmptyState`/`Radar`/`LiveCountdown`/botón
 * "Cancelar" (Sprints 3.6/3.7/3.9/3.15). Todo ese contenido se **relocalizó
 * verbatim** (mismos componentes, mismas props mock, mismo orden visual,
 * CERO cambios de comportamiento) a `src/pages/coordinator/DespachoPage.tsx`
 * (ruta `/despacho`, ver `AppRouter.tsx` y `ARCHITECTURE.md §8`), que ahora
 * se monta a través de `<Outlet/>` en el lugar donde antes vivía ese bloque
 * inline. Se agregaron además `src/pages/coordinator/TrabajosPage.tsx`
 * (`/trabajos`, "Cola de Trabajos" real) y `TrabajoDetailPage.tsx`
 * (`/trabajos/:id`), ninguna de las dos existía antes de este Sprint.
 *
 * `role === 'instalador'`/`role === 'admin'` **no se tocan**: siguen
 * renderizando `InstallerDashboard`/`CountRing`/`AdminPanel` exactamente
 * igual que antes, inline, sin rutas propias -- fuera de alcance de este
 * Sprint (exclusivamente "Coordinador").
 *
 * `sucursalCoord`/`setSucursalCoord` (estado de `SucursalSelect`,
 * compartido con `PublishModal`) y las funciones para abrir
 * `PublishModal`/`ConfirmCancelDialog` (ambos diálogos siguen montados acá,
 * a nivel de shell, sin cambios) se exponen a las páginas del Coordinador
 * vía `<Outlet context={...}/>` -- ver `RootLayoutOutletContext` (tipo
 * exportado más abajo) y `useOutletContext()` en `DespachoPage.tsx`/
 * `TrabajosPage.tsx`. No se usa Context de React (`createContext`) para
 * esto porque es estado exclusivamente de este árbol de rutas, no global
 * de la aplicación -- el propio mecanismo de Outlet context de React
 * Router ya cubre ese alcance sin una capa nueva.
 *
 * ---------------------------------------------------------------------
 * SPRINT 5.1.1 — Modo de Visualización del Administrador (superusuario MVP)
 * ---------------------------------------------------------------------
 * Regla metodológica nueva, temporal, vigente mientras el MVP no esté
 * aprobado (ver `PROJECT_STATUS.md`/`README.md`): un usuario real `admin`
 * puede visualizar temporalmente "Administración"/"Coordinador"/
 * "Instalador" **sin cambiar de usuario ni de rol autenticado** -- ninguna
 * llamada a Supabase Auth, ninguna escritura sobre `profile`/`admins`, y
 * ninguna modificación a políticas RLS ocurre por esto. Es exclusivamente
 * un cambio de qué rama de este componente se monta.
 *
 * **Por qué hizo falta código nuevo** (auditoría previa, reportada al
 * usuario antes de escribir nada -- ver
 * `docs/architecture/frontend/SPRINT_5_1_1_ADMIN_SUPERUSER_REPORT.md`):
 * tanto el HTML oficial (`App()`, línea ~2111) como este archivo, hasta este
 * Sprint, renderizan Coordinador/Instalador/Admin como 3 ramas
 * mutuamente excluyentes -- nunca dos a la vez. No existe ningún
 * `RoleGate`/`allowedRoles` genérico que "ampliar" alcance para lograr que
 * una misma sesión vea las 3 a la vez; hace falta un estado nuevo que
 * decida cuál mostrar. `adminVista` (abajo) es ese estado -- solo relevante
 * cuando `profile.rol === 'admin'`, inerte para `coordinador`/`instalador`
 * (mismo patrón ya establecido para `meId`, relevante solo para
 * `instalador`). El control que lo cambia es `AdminVistaSwitch` (nuevo,
 * ver su propio JSDoc para la justificación completa de por qué no
 * reconstruye nada del HTML sino que es, por necesidad, un control nuevo).
 *
 * **Ramas reutilizadas, sin duplicar ninguna**: `adminVista === 'coordinador'`
 * reutiliza exactamente el mismo `<Outlet context={outletContext}/>` y las
 * mismas rutas `/despacho`/`/trabajos`/`/trabajos/:id` del Sprint 5.1 (el
 * `useEffect` de más abajo navega a `/despacho` al entrar a esa vista, y
 * de vuelta a `/` al salir, para mantener la URL consistente con lo que se
 * muestra). `adminVista === 'instalador'` reutiliza exactamente el mismo
 * `InstallerDashboard`/`CountRing` inline que ya usa `role === 'instalador'`
 * -- sin ruta propia, igual que ya sucede hoy para instaladores reales
 * (`/solicitudes`/`/mis-trabajos`/`/perfil` de `ARCHITECTURE.md §8` siguen
 * sin implementarse para nadie, admin incluido). `adminVista ===
 * 'administracion'` (default) reutiliza exactamente el mismo `<AdminPanel/>`
 * que ya renderizaba `role === 'admin'` -- ningún componente "Admin" nuevo.
 *
 * **Ítems del brief sin equivalente real, no inventados** (reportados al
 * usuario, quien confirmó la reinterpretación): "Publicar Trabajo" ya es
 * alcanzable desde la vista Coordinador (`PublishModal`, botón dentro de
 * `DespachoPage`, sin cambios) -- no es una pantalla nueva. "Ofertas" no
 * existe con ese nombre; la pestaña real de `InstallerDashboard` es
 * "Solicitudes" (`instTab === 'solicitudes'`). "Asignaciones" no existe en
 * absoluto todavía -- reservado para el futuro Sprint 5.4 ("Asignación de
 * Instaladores"), no validable en este Sprint.
 *
 * ---------------------------------------------------------------------
 * AJUSTE FINAL (mismo Sprint 5.1.1) — `OperationalContextProvider`
 * ---------------------------------------------------------------------
 * Limitación real detectada tras la primera entrega: la vista
 * "Coordinador" en modo superusuario dependía de `profile.tiendaId`, que
 * es `null` por diseño para `admins` -- `DespachoPage`/`TrabajosPage`
 * solo mostraban "Tu perfil de coordinador no tiene una tienda asignada".
 * Por instrucción explícita del usuario (y como recomendación
 * arquitectónica para no repetir `role === 'admin' && adminVista ===
 * '...'` en cada Sprint futuro), este archivo ahora envuelve todo su
 * árbol con `<OperationalContextProvider modo={modo}
 * sucursalCoord={sucursalCoord}>` -- una única fuente de verdad
 * (`useOperationalContext()`) que resuelve `empresaId`/`empresaNombre`/
 * `tiendaId`/`tiendaNombre` de dos formas distintas según el caso
 * (síncrona desde `profile` para roles reales; asíncrona, vía consulta
 * real a `empresas`/`tiendas`, solo para `admin` viendo "Coordinador") --
 * ver el JSDoc completo de `OperationalContextProvider.tsx` y
 * `operational-context.service.ts`. `DespachoPage`/`TrabajosPage` ya no
 * llaman a `useAuth()` para esto -- consumen únicamente
 * `useOperationalContext()`, sin saber cuál de los dos caminos se usó.
 *
 * **Eliminación futura**: `adminVista`, el `useEffect` de sincronización
 * de URL, `AdminVistaSwitch`, y el ensanchamiento de
 * `CoordinatorIndexRedirect` en `AppRouter.tsx` se retiran íntegramente
 * cuando el MVP sea aprobado, sin dejar lógica temporal residual --
 * documentado también en `PROJECT_STATUS.md`. `OperationalContextProvider`/
 * `useOperationalContext()` en sí **no** se eliminan -- son la
 * abstracción permanente que los Sprints 5.2/5.3/5.4/6.x/7.x deben seguir
 * usando; solo se retira, dentro de ese Provider, la rama de resolución
 * `requiereResolucionSuperusuario` (ver `OperationalContextProvider.tsx`),
 * porque a partir de ahí `esSuperusuario` nunca vuelve a ser `true`.
 *
 * ---------------------------------------------------------------------
 * SPRINT 5.1.2 — Refactor del Layout Operativo del Coordinador
 * ---------------------------------------------------------------------
 * Refactor puramente arquitectónico (sin funcionalidad nueva, sin queries
 * nuevas, sin cambios de comportamiento visible): todo lo que antes vivía
 * aquí y era exclusivo del Coordinador -- `Header`/`Footer`/`PublishModal`/
 * `ConfirmCancelDialog` cuando `showCoordinador` es `true`, más
 * `SucursalSelect`/`CoordinatorSubtabs` (antes duplicados dentro de
 * `DespachoPage.tsx`/`TrabajosPage.tsx`, ver sus JSDoc históricos) -- se
 * relocalizó a un único archivo nuevo, `src/layouts/CoordinatorLayout.tsx`.
 * Ningún componente se modificó ni se duplicó: son los mismos archivos de
 * siempre, solo cambia desde dónde se montan. Ver el JSDoc completo de
 * `CoordinatorLayout.tsx` para la auditoría previa de este Sprint
 * (discrepancias reales encontradas contra la "ESTRUCTURA ESPERADA" del
 * brief -- `CoordinatorSidebar`/`CoordinatorHeader`/`CoordinatorFooter`/
 * `CoordinatorKPIs`/`CoordinatorWorkspace` -- y su resolución, confirmada
 * por el usuario).
 *
 * `sucursalCoord`/`setSucursalCoord` **no** se movieron a
 * `CoordinatorLayout.tsx` -- siguen siendo estado de este archivo, porque
 * también alimentan a `OperationalContextProvider` (`sucursalCoord` es uno
 * de sus 2 props), un sistema que este mismo brief marca explícitamente
 * como "NO MODIFICAR". Moverlos habría exigido remontar
 * `OperationalContextProvider` más abajo en el árbol -- un cambio real a
 * ese sistema. En cambio, se le pasan a `CoordinatorLayout` como props
 * (`sucursalCoord`/`onSucursalCoordChange`) -- mismo dato, ninguna
 * duplicación de fuente de verdad, `OperationalContextProvider` sigue
 * exactamente en la misma posición del árbol que antes de este Sprint.
 *
 * El bloque `role === 'admin' && (<AdminVistaSwitch/>+<Badge/>)` tampoco se
 * movió -- no es lógica del Coordinador, es el control que decide si
 * mostrar `CoordinatorLayout` en absoluto (Sprint 5.1.1); se sigue
 * calculando aquí (`adminSwitchSlot`) y se le pasa a `CoordinatorLayout`
 * como slot, para que ese archivo no necesite conocer `role`/`adminVista`
 * en absoluto y siga siendo EXACTAMENTE el mismo Layout tanto para un
 * Coordinador real como para un admin en modo superusuario (criterio de
 * aceptación explícito de este Sprint).
 *
 * `RootLayoutOutletContext` (más abajo en versiones anteriores de este
 * archivo) se eliminó -- ya no tiene sentido en `RootLayout.tsx`, que ya no
 * monta ningún `<Outlet/>` directamente. Su reemplazo,
 * `CoordinatorLayoutOutletContext`, vive en `CoordinatorLayout.tsx` (mismos
 * 4 campos, sin ningún cambio de forma).
 */
export function RootLayout() {
  const { profile, profileLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sucursalCoord, setSucursalCoord] = useState('Multiplaza');
  const [meId, setMeId] = useState('pty');
  // Sprint 5.1.1 — solo tiene efecto cuando `profile.rol === 'admin'` (ver
  // JSDoc "SPRINT 5.1.1" más arriba); inerte para `coordinador`/`instalador`,
  // mismo criterio ya establecido para `meId` (solo relevante para
  // `instalador`). Default 'administracion': un admin real sigue viendo su
  // propia vista real al entrar, sin sorpresas.
  const [adminVista, setAdminVista] = useState<AdminVista>('administracion');

  useEffect(() => {
    if (profileLoading) return;

    if (!profile) {
      void logout();
      navigate('/login', { replace: true, state: { reason: 'profile-not-found' } });
      return;
    }

    if (profile.estado === 'suspendido') {
      void logout();
      navigate('/login', { replace: true, state: { reason: 'suspended' } });
    }
  }, [profile, profileLoading, logout, navigate]);

  // Sprint 5.1.1 — mantiene la URL consistente con `adminVista` para un
  // admin real (no aplica a `coordinador`/`instalador`, que nunca tienen
  // `adminVista` distinto de su propio default inerte). "Coordinador" vive
  // detrás de rutas reales (`/despacho`/`/trabajos`, Sprint 5.1) -- al
  // entrar a esa vista, navega ahí (reutilizando exactamente esas rutas,
  // sin crear ninguna); al salir, vuelve a `/` para no dejar la URL de
  // Coordinador mostrando contenido de Instalador/Administración.
  // `profile?.rol` (no `role`, todavía sin declarar en este punto) porque
  // este Hook debe ejecutarse siempre, antes del `return` condicional de
  // abajo -- mismo criterio que el resto de los Hooks de este componente.
  useEffect(() => {
    if (profile?.rol !== 'admin') return;

    const enCoordinador =
      location.pathname.startsWith('/despacho') || location.pathname.startsWith('/trabajos');

    if (adminVista === 'coordinador' && !enCoordinador) {
      navigate('/despacho');
    } else if (adminVista !== 'coordinador' && enCoordinador) {
      navigate('/', { replace: true });
    }
  }, [profile?.rol, adminVista, location.pathname, navigate]);

  if (profileLoading || !profile || profile.estado === 'suspendido') {
    return <Loading label="Cargando tu perfil…" />;
  }

  const role = profile.rol;

  // Sprint 5.1.1 — para `coordinador`/`instalador` reales, la vista
  // efectiva es siempre su propio rol (idéntico a antes de este Sprint,
  // `adminVista` nunca se lee). Para `admin`, la vista efectiva la decide
  // `adminVista` (`AdminVistaSwitch`) -- ver JSDoc "SPRINT 5.1.1" arriba.
  const showCoordinador = role === 'coordinador' || (role === 'admin' && adminVista === 'coordinador');
  const showInstalador = role === 'instalador' || (role === 'admin' && adminVista === 'instalador');
  const showAdminPanel = role === 'admin' && adminVista === 'administracion';

  // Sprint 5.1.1 (ajuste final) — "modo" del Contexto Operativo
  // (`OperationalContextProvider`, ver su JSDoc completo): para
  // `coordinador`/`instalador` reales coincide siempre con su propio rol;
  // para `admin`, es la vista elegida en `AdminVistaSwitch`. Exhaustivo:
  // `role` es siempre uno de los 3 valores de `Rol`.
  const modo: ModoVisualizacion = role === 'admin' ? adminVista : role;

  // Sprint 5.1.1 — selector temporal de "modo de visualización", exclusivo
  // de `role === 'admin'` -- ver JSDoc "SPRINT 5.1.1" más arriba y el JSDoc
  // de `AdminVistaSwitch` para la justificación completa. Se elimina
  // íntegramente cuando el MVP sea aprobado.
  //
  // Sprint 5.1.2 — se calcula acá (no dentro de `CoordinatorLayout.tsx`)
  // porque no es lógica del Coordinador: es el control que decide si
  // `CoordinatorLayout` se muestra en absoluto. Se le pasa como slot
  // (`adminSwitchSlot`) tanto a `CoordinatorLayout` como, inline, a la rama
  // Instalador/Admin de abajo -- mismo nodo JSX, sin duplicar su
  // definición.
  const adminSwitchSlot = role === 'admin' && (
    <div className="flex flex-wrap items-center gap-3 px-4 pt-3">
      <AdminVistaSwitch vista={adminVista} onChange={setAdminVista} />
      <Badge tone="amber">Modo temporal · MVP</Badge>
    </div>
  );

  return (
    <OperationalContextProvider modo={modo} sucursalCoord={sucursalCoord}>
      {showCoordinador ? (
        /* Sprint 5.1.2 — todo lo que antes era el bloque `role ===
           'coordinador'` inline de este archivo (Header/Footer/
           PublishModal/ConfirmCancelDialog/SucursalSelect/
           CoordinatorSubtabs/`<Outlet/>`) ahora vive en
           `CoordinatorLayout.tsx` -- ver su JSDoc completo. `RootLayout`
           únicamente decide CUÁNDO mostrarlo (`showCoordinador`, sin
           cambios respecto al Sprint 5.1.1) y le pasa el estado que sigue
           viviendo acá (`sucursalCoord`, compartido con
           `OperationalContextProvider`) más el slot del selector de modo. */
        <CoordinatorLayout
          sucursalCoord={sucursalCoord}
          onSucursalCoordChange={setSucursalCoord}
          adminSwitchSlot={adminSwitchSlot}
        />
      ) : (
        <div className="flex min-h-screen flex-col">
          <Header role={role} profile={profile} onLogout={() => void logout()} />
          <main className="flex-1">
            {adminSwitchSlot}
            {/* TEMPORARY INTEGRATION — Sprint 3.10 (InstallerDashboard, reemplaza la integración de Sprint 3.2.1/3.2.2): ver comentario de la función.
                Sprint 5.1.1: `showInstalador` también es `true` cuando un `admin`
                real eligió la vista "Instalador". */}
            {showInstalador && (
              <>
                <InstallerDashboard meId={meId} onMeIdChange={setMeId} />
                {/* TEMPORARY INTEGRATION — Sprint 3.8 (CountRing): ver comentario de la función. */}
                <CountRing remaining={COUNTRING_DEMO_REMAINING} total={COUNTRING_DEMO_TOTAL} />
              </>
            )}
            {/* Sprint 3.13 (AdminPanel): integración real y directa — ver comentario de la función.
                Sprint 5.1.1: ahora gateado por `showAdminPanel` (`adminVista===
                'administracion'`, el default) en vez de `role==='admin'` directo
                -- mismo resultado para un admin real que no cambió de vista. */}
            {showAdminPanel && <AdminPanel />}
          </main>
          <Footer />
        </div>
      )}
    </OperationalContextProvider>
  );
}
