import { Crosshair, RefreshCw, XCircle } from 'lucide-react';

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
 * **"Simular respuestas" → "Mostrar ofertas"** (RONDA DE VALIDACIÓN): el
 * HTML oficial dispara este botón contra `simulateJob(job.id)`, parte del
 * motor de subasta del prototipo standalone (nunca existió en la
 * aplicación React real). Dos rondas anteriores ya cerraron esa discusión:
 * (1) conectarlo a una simulación 100% en memoria era incorrecto ("hacía
 * parecer" que el panel funcionaba sin representar el flujo real de
 * ofertas); (2) el gap real reportado entonces sigue siendo cierto -- la
 * aplicación no tiene, hoy, ningún mecanismo backend de "iniciar/publicar
 * una ronda de ofertas" distinto de que el trabajo ya esté `estado='live'`
 * (mientras dure ese estado, cualquier instalador elegible ya puede ofertar
 * en cualquier momento vía `submit_bid()` -- `InstallerSolicitudes` →
 * `callSubmitBid()`, RPC real que inserta en `ofertas`).
 *
 * Esta ronda identificó que ESE gap no es lo único que puede vivir en esta
 * posición del layout: el prototipo también necesita, en la práctica, una
 * forma de recargar manualmente las ofertas reales del trabajo
 * seleccionado (p. ej. si Realtime tardó, o para confirmar el estado
 * actual sin esperar). Esa acción SÍ existe realmente -- es la misma
 * consulta que ya usa `ResponsesPanel` (`ofertasRepository.
 * getByTrabajoId()`, vía su función interna `cargarOfertas()`, la misma que
 * ya alimenta su propio botón "Actualizar ofertas"). Se renombra el botón a
 * "Mostrar ofertas" y se conecta a `onMostrarOfertas` -- un segundo punto
 * de entrada a la MISMA consulta real, sin infraestructura paralela: este
 * componente no sabe nada de ofertas, solo reenvía el click (mismo patrón
 * que `onCancel`); `ResponsesPanel` decide qué hacer con la señal. Cero
 * datos ficticios, cero mocks -- ver su JSDoc completo.
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
  /**
   * RONDA DE VALIDACIÓN — dispara una recarga real de las ofertas del
   * trabajo seleccionado (ver JSDoc de "Mostrar ofertas" arriba y de
   * `ResponsesPanel.refreshTrigger`). Al igual que `onCancel`, este
   * componente no genera ni conoce las ofertas -- solo reenvía el click.
   */
  onMostrarOfertas: () => void;
  /**
   * AJUSTE SPRINT — Recomposición de Despacho en vivo: este bloque ahora se
   * muestra para CUALQUIER trabajo `live` seleccionado (antes, solo para el
   * `activeJob` recién publicado en la sesión). `onCancel` (vía
   * `CoordinatorLayoutOutletContext`/`ConfirmCancelDialog`) solo tiene
   * sentido real para ESE `activeJob` -- confirmarlo hace `setActiveJob(null)`
   * en `CoordinatorLayout.tsx`, sin relación con ningún otro trabajo. Para
   * un trabajo `live` distinto (elegido desde el selector/lista), no existe
   * ningún flujo real de cancelación en este alcance -- se deshabilita el
   * botón (con `title` explicativo) en vez de fingir una acción que no
   * cancela realmente ese trabajo. Default `false` -- comportamiento
   * histórico sin cambios para el único consumidor real hasta ahora.
   */
  cancelDisabled?: boolean;
}

export function LiveDispatchCard({
  notified,
  instState,
  eligibleIds,
  publishedAt,
  bidMins,
  onCancel,
  cancelDisabled = false,
  onMostrarOfertas,
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
        <Button variant="amber" onClick={onMostrarOfertas}>
          <RefreshCw size={14} />
          Mostrar ofertas
        </Button>
        <button
          type="button"
          className="mx-btn mx-btn-ghost"
          style={{
            flex: 'none',
            color: 'var(--red)',
            borderColor: 'rgba(255,92,122,.35)',
            opacity: cancelDisabled ? 0.5 : 1,
          }}
          disabled={cancelDisabled}
          title={cancelDisabled ? 'Disponible únicamente para el trabajo recién publicado en esta sesión' : undefined}
          onClick={onCancel}
        >
          <XCircle size={14} />
          Cancelar
        </button>
      </div>
    </Card>
  );
}
