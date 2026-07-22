import { Calendar, ChevronRight, MapPin, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { trabajoEstadoInfo } from '@/constants';
import type { TableRow } from '@/services';

/**
 * TrabajoRow — una fila de la "Cola de Trabajos" (Entregable 5 del Sprint
 * 5.1). Extiende `.mx-jobrow`/`.mx-jobrow-main`/`.mx-jobrow-side` (JSX de
 * referencia: `CoordinatorJobs()`, `Multimax_Despacho_v1.3.html` líneas
 * 2695-2724) con las columnas que pide el brief (Cliente/Dirección/
 * Instalación/Estado/Fecha/Prioridad/Acciones) mapeadas a columnas reales
 * de `trabajos` (`docs/database/DATABASE_INVENTORY.md` §2.6):
 *
 * - Cliente     → `cliente_nombre` (nueva línea de meta, no existía en el
 *                 HTML original porque ese dato no estaba disponible ahí)
 * - Dirección   → `direccion_exacta` si ya se reveló, si no `calle` (visible
 *                 antes de asignar), si no `zona`/`provincia` como respaldo
 * - Instalación → `tipo`
 * - Estado      → `estado` real vía `trabajoEstadoInfo()` (ver su JSDoc en
 *                 `constants/index.ts` sobre el vocabulario inferido)
 * - Fecha       → `fecha` + `hora`
 * - Prioridad   → derivada de `urgente` (boolean real) -- mismo criterio
 *                 visual que el HTML fuente usa en `Coordinator()` (Pill
 *                 roja "Urgente" vs. Pill muted "Normal", línea 2223-2230)
 * - Acciones    → la fila entera es el botón (`onSelect`), igual que
 *                 `CoordinatorJobs()` (`onClick: () => setJobSel(t.id)`);
 *                 no se agregan botones de acción adicionales (asignar/
 *                 cancelar) porque esa lógica pertenece a Sprints 5.3/5.4
 *                 ("Flujo de Ofertas"/"Asignación de Instaladores"),
 *                 explícitamente fuera de alcance de este Sprint.
 *
 * `.mx-jobrow-side`/`.mx-jobrow-price`/`.mx-chevr` se portaron a
 * `globals.css` en este mismo Sprint (quedaban pendientes desde el
 * Sprint 3.14 -- ver comentario en esa hoja de estilos).
 */
export interface TrabajoRowProps {
  trabajo: TableRow<'trabajos'>;
  onSelect: (id: string) => void;
}

export function TrabajoRow({ trabajo, onSelect }: TrabajoRowProps) {
  const estadoInfo = trabajoEstadoInfo(trabajo.estado);
  const direccion = trabajo.direccion_exacta ?? trabajo.calle ?? `${trabajo.zona} · ${trabajo.provincia}`;

  return (
    <button type="button" className="mx-jobrow" onClick={() => onSelect(trabajo.id)}>
      <div className="mx-jobrow-main">
        <div className="mx-jobrow-top">
          <span className="mx-jobrow-id">{trabajo.codigo}</span>
          <Badge tone={estadoInfo.tone}>{estadoInfo.label}</Badge>
          <Badge tone={trabajo.urgente ? 'red' : 'muted'}>
            {trabajo.urgente ? 'Urgente' : 'Normal'}
          </Badge>
        </div>
        <div className="mx-jobrow-t">{trabajo.tipo}</div>
        <div className="mx-jobrow-meta">
          {trabajo.cliente_nombre && (
            <span>
              <User size={12} />
              {trabajo.cliente_nombre}
            </span>
          )}
          <span>
            <MapPin size={12} />
            {direccion}
          </span>
          <span>
            <Calendar size={12} />
            {trabajo.fecha} · {trabajo.hora}
          </span>
        </div>
      </div>
      <div className="mx-jobrow-side">
        {trabajo.precio_sugerido != null && (
          <span className="mx-jobrow-price">${trabajo.precio_sugerido}</span>
        )}
        <ChevronRight size={18} className="mx-chevr" />
      </div>
    </button>
  );
}
