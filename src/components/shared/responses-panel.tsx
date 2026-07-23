import { Radio, Users } from 'lucide-react';
import { useState } from 'react';

import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';

/**
 * ResponsesPanel — Sprint 5.1.3. Reconstruye la tarjeta "Respuestas en
 * tiempo real" de `Coordinator(props)` (`Multimax_Despacho_v1.3.html`,
 * líneas ~2337-2356 hasta el inicio de `mx-feed`, rama `jobs.length > 0`):
 * encabezado (ícono + título + `mx-sort`, los 4 tabs de orden) y el estado
 * vacío (`mx-empty`/`mx-empty-ic`, mismo componente `EmptyState` ya
 * reutilizado en `TrabajosPage`/`CoordinatorEmptyState`).
 *
 * **Alcance explícito de este Sprint (por brief e instrucción del
 * usuario)**: "Área de respuestas. Estado vacío." — únicamente eso. NO se
 * reconstruye `mx-feed`/`mx-resp` (la lista de propuestas reales de
 * instaladores, líneas ~2357-2422) ni `AssignedPanel`/`NoResponsePanel`
 * (ya existen como componentes propios desde el Sprint 3.16, ver sus JSDoc
 * — listos para integrarse cuando exista el motor de subasta real, Sprint
 * 5.3). El job de demostración de este Sprint tiene 0 respuestas y fase
 * `live` fija, así que la rama `v.responses.length === 0` del HTML (con el
 * texto "Esperando propuestas…") es la ÚNICA alcanzable — no se agrega el
 * `if (live)`/`else` del HTML porque la otra rama (job no-live) nunca
 * ocurre en este Sprint (instrucción explícita: "sin lógica condicional
 * adicional").
 *
 * **Tabs de orden (`sortBy`)**: se reconstruye el estado local
 * (`useState`, igual que `App()`/`Coordinator()` en el HTML fuente) y las 4
 * etiquetas exactas del script (`Precio`/`Calif.`/`Distancia`/`Tiempo`) —
 * visualmente funcional (alternan `.on`), pero sin ningún efecto sobre
 * datos reales todavía (no hay `v.responses` que ordenar en este Sprint) --
 * no es lógica de negocio nueva, es la misma UI de tabs ya usada en
 * `CoordinatorSubtabs`/`AdminVistaSwitch`, aplicada aquí a un control
 * distinto.
 */
const SORT_TABS = [
  ['precio', 'Precio'],
  ['rating', 'Calif.'],
  ['km', 'Distancia'],
  ['responded', 'Tiempo'],
] as const;

type SortBy = (typeof SORT_TABS)[number][0];

export function ResponsesPanel() {
  const [sortBy, setSortBy] = useState<SortBy>('precio');

  return (
    <Card className="mx-feedcard">
      <CardHeader
        icon={<Users size={14} />}
        cardTitle="Respuestas en tiempo real"
        action={
          <div className="mx-sort">
            {SORT_TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={sortBy === key ? 'on' : ''}
                onClick={() => setSortBy(key)}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      <EmptyState
        size="compact"
        icon={<Radio size={22} />}
        description={
          <>
            Esperando propuestas… Pulsa <b>Simular respuestas</b> o responde desde la vista{' '}
            <b>Instalador</b>.
          </>
        }
      />
    </Card>
  );
}
