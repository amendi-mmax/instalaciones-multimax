import { Crosshair, Play, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { LiveCountdown } from '@/components/shared/live-countdown';
import { Radar, type RadarInstallerState } from '@/components/shared/radar';

/**
 * LiveDispatchCard — Sprint 5.1.3. Reconstruye la tarjeta "Despacho en
 * vivo" de `Coordinator(props)` (`Multimax_Despacho_v1.3.html`, líneas
 * ~2267-2318, rama `jobs.length > 0`): encabezado (ícono + título + Pill
 * de tiempo restante), `Radar` (con su propia leyenda interna, sin
 * cambios), el bloque informativo "Ronda única" (`.mx-roundsingle`/
 * `.mx-round`), y la fila de acciones (`.mx-actionsrow`: "Simular
 * respuestas" / "Cancelar").
 *
 * **Relocación, no reescritura**: `Radar`/`LiveCountdown`/el botón
 * "Cancelar" ya existían y ya estaban montados (como hermanos sueltos
 * dentro de `DespachoPage.tsx`, integraciones temporales de los Sprints
 * 3.7/3.9/3.15) — este componente únicamente los reagrupa en su ubicación
 * real dentro de la tarjeta "Despacho en vivo", sin cambiar sus props, su
 * lógica interna ni su comportamiento. "Cancelar" sigue disparando
 * exactamente el mismo `onOpenConfirmCancel` que ya exponía
 * `CoordinatorLayoutOutletContext` (Sprint 5.1.2) — el diálogo en sí sigue
 * viviendo en `CoordinatorLayout.tsx`, sin cambios.
 *
 * **"Simular respuestas" (nuevo, inerte)**: el HTML oficial lo dispara
 * contra `simulateJob(job.id)`, parte del motor de subasta (Sprint 5.3,
 * explícitamente fuera de alcance — "no debe implementarse el motor de
 * subasta"). Se muestra `disabled`, con el mismo criterio ya establecido
 * en `TrabajoDetailPage`/`HeaderUserMenu` para acciones reales todavía sin
 * lógica: visible para fidelidad visual, sin fingir una funcionalidad que
 * no existe.
 *
 * **"Ronda única" con estado fijo `act`**: el HTML alterna
 * `.mx-round.act`/`.mx-round.done` según `job.phase`; el job de
 * demostración de este Sprint está siempre en fase `live` (por instrucción
 * explícita del usuario, "sin lógica condicional adicional"), así que solo
 * se reproduce la variante `act` — no existe ninguna rama `done` alcanzable
 * en este Sprint, y agregar el `if` para una rama inalcanzable violaría esa
 * misma instrucción.
 *
 * **No incluida (fuera de alcance, por diseño)**: la tarjeta real
 * "Indicadores" (`.mx-stats`/`.mx-goal` con métricas por-trabajo —
 * 1ª respuesta/3 respuestas/asignación/notificados/abiertos/respuestas,
 * derivadas de `jobView()`) NO se reconstruye acá. El brief de este Sprint
 * mapea "CoordinatorKPIs" a los KPIs YA EXISTENTES (`CoordinatorKpiRow`,
 * agregado dashboard del Sprint 5.1, sin relación con esta tarjeta real) —
 * "no crear indicadores nuevos" descarta explícitamente portar esta tarjeta
 * distinta. Ver JSDoc de `CoordinatorKpiRow` y el reporte técnico de este
 * Sprint, sección de auditoría.
 */
export interface LiveDispatchCardProps {
  notified: readonly string[];
  instState: Record<string, RadarInstallerState>;
  eligibleIds: readonly string[];
  publishedAt: number;
  bidMins: number;
  onCancel: () => void;
}

export function LiveDispatchCard({
  notified,
  instState,
  eligibleIds,
  publishedAt,
  bidMins,
  onCancel,
}: LiveDispatchCardProps) {
  return (
    <Card>
      <CardHeader
        icon={<Crosshair size={14} />}
        cardTitle="Despacho en vivo"
        action={<LiveCountdown publishedAt={publishedAt} bidMins={bidMins} />}
      />
      <Radar notified={notified} instState={instState} eligibleIds={eligibleIds} />
      <div className="mx-roundsingle">
        <div className="mx-round act">
          <b>Ronda única</b>
          <span>
            Todos los instaladores elegibles de la zona reciben la solicitud al mismo tiempo ·{' '}
            {bidMins} min para responder
          </span>
        </div>
      </div>
      <div className="mx-actionsrow">
        <Button
          variant="amber"
          disabled
          title="Disponible cuando exista el motor de subasta (Sprint 5.3)"
        >
          <Play size={14} />
          Simular respuestas
        </Button>
        <button
          type="button"
          className="mx-btn mx-btn-ghost"
          style={{ flex: 'none', color: 'var(--red)', borderColor: 'rgba(255,92,122,.35)' }}
          onClick={onCancel}
        >
          <XCircle size={14} />
          Cancelar
        </button>
      </div>
    </Card>
  );
}
