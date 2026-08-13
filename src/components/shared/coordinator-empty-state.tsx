import { Crosshair, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';

/**
 * CoordinatorEmptyState — reconstruye el primer (y, en este Sprint, único)
 * bloque JSX alcanzable de `function Coordinator(props)`
 * (`Multimax_Despacho_v1.3.html`, líneas 2132-2163 — Sprint 3.6):
 *
 * ```js
 * if (jobs.length === 0) {
 *   return React.createElement("div", { className: "mx-qempty" },
 *     React.createElement("div", { className: "mx-qempty-ic" },
 *       React.createElement(Crosshair, { size: 26 })),
 *     React.createElement("h3", null, "No hay trabajos activos"),
 *     React.createElement("p", null,
 *       "Publica un trabajo para notificar de inmediato a los instaladores de tu zona."),
 *     React.createElement("button", {
 *       className: "mx-btn mx-btn-ice",
 *       style: { flex: "none", padding: "13px 26px" },
 *       onClick: onOpenPublish
 *     }, React.createElement(Plus, { size: 16 }), "Publicar trabajo"));
 * }
 * ```
 *
 * Este NO es el bloque "Job Cards" que `docs/SPRINTS_INDEX.md` asignaba
 * (de forma genérica, nunca confirmada) al Sprint 3.6. `Coordinator(props)`
 * es una función grande de ~290 líneas (2132-2423) que contiene múltiples
 * bloques (QueueBar `mx-qbar-outer`, `mx-jobcard`, Radar, `AssignedPanel`,
 * `NoResponsePanel`, feed de respuestas `mx-feedcard`, indicadores
 * `mx-stats`) — pero **todos** ellos solo se alcanzan cuando `jobs.length >
 * 0`. En el HTML fuente, `jobs` es `useState([])` de `App()` (línea 1898) y
 * no existe ninguna constante `SEED_JOBS`/`MOCK_JOBS`/similar en todo el
 * archivo (verificado con `grep`): la única forma de poblar `jobs` es la
 * lógica de negocio de `publishJob`, explícitamente fuera de alcance de
 * este Sprint ("no debes... crear lógica de negocio", "no mocks
 * adicionales"). Por lo tanto el único bloque de `Coordinator()`
 * reconstruible ahora mismo, sin inventar datos ni lógica, es exactamente
 * este estado vacío — ver "Determinación del bloque pendiente" en
 * docs/sprints/sprint-3.6.md.
 *
 * Reutiliza dos componentes de Fase 3 que no tenían consumidor todavía:
 * `EmptyState` (variante `size="page"`, ya modela `.mx-qempty`/
 * `.mx-qempty-ic` verbatim) y `Button` (variante `ice`, ya modela
 * `.mx-btn`/`.mx-btn-ice`). No se agregó ningún CSS nuevo: `.mx-qempty`/
 * `.mx-qempty-ic` (líneas 411-436 del HTML fuente) y `.mx-btn`/
 * `.mx-btn-ice` (líneas 319-340) ya estaban portados en `globals.css`
 * desde Fase 3.
 *
 * `onOpenPublish` es la misma prop del HTML fuente (línea 2144): en
 * `App()`, `Coordinator` la recibe como `onOpenPublish: () =>
 * setShowPublishModal(true)` (línea 2107). Aquí se replica igual desde
 * `RootLayout` — ver `docs/sprints/sprint-3.6.md` → "Problema encontrado"
 * sobre el reemplazo del `showPublishModal` forzado del Sprint 3.5.
 */
export interface CoordinatorEmptyStateProps {
  onOpenPublish: () => void;
}

export function CoordinatorEmptyState({ onOpenPublish }: CoordinatorEmptyStateProps) {
  return (
    <EmptyState
      size="page"
      icon={<Crosshair size={26} />}
      title="No hay trabajos activos"
      description="Publica un trabajo para notificar de inmediato a los instaladores de tu zona."
      action={
        <Button
          variant="ice"
          style={{ flex: 'none', padding: '13px 26px' }}
          onClick={onOpenPublish}
        >
          <Plus size={16} />
          Publicar trabajo
        </Button>
      }
    />
  );
}
