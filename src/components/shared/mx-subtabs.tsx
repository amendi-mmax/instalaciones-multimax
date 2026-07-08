import type { ReactNode } from 'react';

/**
 * MxSubtabs — reconstruye `<div class="mx-subtabs-wrap"><div class="mx-subtabs">`
 * (JSX de referencia: `Multimax_Despacho_v1.3.html`, Sprint 3.3, único bloque
 * HTML de este Sprint). Es el contenedor exacto de `.mx-subtabs`, reutilizado
 * tal cual dos veces en el HTML fuente:
 *  - Dentro de `App()`, rama `role === "coord"` — líneas 2079-2095 (tabs
 *    "Despacho en vivo" / "Mis trabajos" del Coordinator).
 *  - Dentro de `AdminPanel()` — líneas 3032-3047 (tabs "Calendario maestro" /
 *    "Instaladores").
 *
 * Ambas instancias usan exactamente la misma estructura de botones planos
 * con `className` condicional (`on`/""), sin ningún primitivo de
 * accesibilidad tipo Radix Tabs — ver `MxSubtabButton` (mismo Sprint).
 *
 * Este componente NO se integra todavía en ninguna página: ni `Coordinator`
 * ni `AdminPanel` existen en este proyecto (ambos son Sprints futuros), así
 * que montarlo en cualquiera de los dos lugares donde el HTML lo usa
 * implicaría construir esas pantallas — fuera de alcance explícito de este
 * Sprint ("No modificar Coordinator", "No crear navegación funcional"). Ver
 * "Problema encontrado" en `docs/sprints/sprint-3.3.md`.
 *
 * No confundir con `components/ui/tabs.tsx` (`Tabs`/`TabsList`/`TabsTrigger`),
 * un primitivo genérico ya creado en Fase 3 sobre `@radix-ui/react-tabs`
 * para la misma clase CSS pero con semántica ARIA de tabs, sin consumidores
 * todavía. Este Sprint no lo modifica ni lo elimina — queda documentada la
 * posible duplicación para que el Sprint que construya Coordinator/AdminPanel
 * decida cuál de los dos usar.
 */
export interface MxSubtabsProps {
  children: ReactNode;
}

export function MxSubtabs({ children }: MxSubtabsProps) {
  return (
    <div className="mx-subtabs-wrap">
      <div className="mx-subtabs">{children}</div>
    </div>
  );
}
