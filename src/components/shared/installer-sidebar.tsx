import { ShieldAlert, User } from 'lucide-react';

import { InstallerPriorityRules } from '@/components/shared/installer-priority-rules';
import { InstallerProfileSummary } from '@/components/shared/installer-profile-summary';
import { InstallerSidebarCard } from '@/components/shared/installer-sidebar-card';

/**
 * InstallerSidebar — portado verbatim de `<aside class="mx-instside">`
 * (JSX de referencia: `Installer()` en `Multimax_Despacho_v1.3.html`,
 * líneas 3421-3450 — Sprint 3.2, único bloque HTML de este Sprint).
 * Compone las dos tarjetas exactas del panel lateral del Instalador:
 * "Tu perfil" (`InstallerProfileSummary`) y "Reglas de prioridad"
 * (`InstallerPriorityRules`), cada una envuelta en `InstallerSidebarCard`
 * (`.mx-card.mx-mini` + `.mx-section-h`).
 *
 * Reemplaza el `Sidebar`/`SidebarCard` estructural creado en Fase 3
 * (que solo reconstruía el contenedor, sin contenido real) — mismo
 * criterio aplicado al `Header` en el Sprint 3.1: este Sprint completa
 * exactamente el mismo bloque HTML que Fase 3 dejó pendiente, no un
 * bloque distinto. Ninguno de esos componentes tenía consumidores
 * (verificado con `grep`), así que no hay call-sites que migrar.
 *
 * Este `<aside>` es hermano de `.mx-phone` dentro de `.mx-instwrap`
 * (grid de 2 columnas) en el HTML fuente. Ese wrapper, `.mx-phone`,
 * `.mx-phone-bar` y `.mx-phonetabs` NO se migran en este Sprint —
 * pertenecen al Sprint que reconstruya `layouts/InstallerLayout.tsx`
 * (ver ARCHITECTURE.md §3). `InstallerSidebar` no se renderiza todavía
 * desde ninguna ruta/página: no existe aún ningún Sprint de Installer
 * layout/dashboard que lo monte. Ver "Dependencias/riesgos" en
 * `docs/sprints/sprint-3.2.md`.
 */
export interface InstallerSidebarProps {
  rating: number;
  km: number;
  cumplimiento: number;
  aceptacion: number;
}

export function InstallerSidebar({ rating, km, cumplimiento, aceptacion }: InstallerSidebarProps) {
  return (
    <aside className="mx-instside">
      <InstallerSidebarCard icon={<User size={14} />} cardTitle="Tu perfil">
        <InstallerProfileSummary
          rating={rating}
          km={km}
          cumplimiento={cumplimiento}
          aceptacion={aceptacion}
        />
      </InstallerSidebarCard>
      <InstallerSidebarCard icon={<ShieldAlert size={14} />} cardTitle="Reglas de prioridad">
        <InstallerPriorityRules />
      </InstallerSidebarCard>
    </aside>
  );
}
