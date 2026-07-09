import { ClipboardList, Crosshair } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Footer } from '@/components/shared/footer';
import { Header } from '@/components/shared/header';
import { InstallerSidebar } from '@/components/shared/installer-sidebar';
import { MxSubtabButton } from '@/components/shared/mx-subtab-button';
import { MxSubtabs } from '@/components/shared/mx-subtabs';
import { SucursalSelect } from '@/components/shared/sucursal-select';
import type { Rol } from '@/types/enums';

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
 */
export function RootLayout() {
  const [role, setRole] = useState<Rol>('coordinador');
  const [sucursalCoord, setSucursalCoord] = useState('Multiplaza');

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
        <Outlet context={{ role }} />
      </main>
      <Footer />
    </div>
  );
}
