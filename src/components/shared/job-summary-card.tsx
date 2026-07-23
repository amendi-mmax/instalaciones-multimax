import { AlertTriangle, Calendar, Home, MapPin, Plus, Timer, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { trabajoEstadoInfo } from '@/constants';
import { fmt } from '@/lib/utils';

/**
 * JobSummaryCard — Sprint 5.1.3 ("Implementación del Workspace Operativo
 * del Coordinador"). Reconstruye la porción de encabezado de
 * `.mx-card.mx-jobcard` de `Coordinator(props)`
 * (`Multimax_Despacho_v1.3.html`, líneas ~2211-2266, rama `jobs.length > 0`
 * — nunca portada hasta este Sprint, ver "Auditoría previa" en
 * `docs/architecture/frontend/SPRINT_5_1_3_COORDINATOR_WORKSPACE_REPORT.md`).
 *
 * **Consolidación deliberada, documentada (no silenciosa)**: el brief de
 * este Sprint pide explícitamente que `JobSummaryCard` incluya "Tiempo
 * restante" y el botón "Publicar otro" — en el HTML oficial, ninguno de los
 * 2 vive dentro de `mx-jobcard`: "Tiempo restante" es la Pill del
 * encabezado de la tarjeta "Despacho en vivo" (ver `LiveDispatchCard`, que
 * también reclama ese contenido explícitamente en el mismo brief — una
 * contradicción textual real, reportada en el reporte técnico) y "Publicar
 * otro" pertenece a `QueueBar` (fuera de alcance de este Sprint: solo tiene
 * sentido con más de 1 trabajo simultáneo, y el brief no lo menciona en el
 * árbol esperado). Resolución aplicada: el botón "Publicar otro" SÍ se
 * consolida acá (reutiliza el mismo `onOpenPublish` ya existente, sin
 * lógica nueva); "Tiempo restante" se resuelve con un valor ESTÁTICO
 * (`remainingSeconds`, formateado una sola vez con `fmt()`, ya usado por
 * `LiveCountdown`/`CountRing`) para no duplicar el contador EN VIVO real
 * (`LiveCountdown`), que permanece, tal como pide su propia sección del
 * brief, dentro de `LiveDispatchCard`.
 *
 * **"Estado"** (campo pedido explícitamente, sin equivalente literal en
 * `mx-jobcard-h` — el HTML solo tiene ahí un Pill "Urgente"/"Normal", no
 * "Estado"): se reutiliza `trabajoEstadoInfo('live')` (ya existente,
 * `src/constants/index.ts`, Sprint 5.1 — mismo vocabulario `live`/
 * `assigned`/`completed`/`cancelled` usado por `TrabajoDetailPage`/
 * `TrabajoRow`) en vez de inventar un nuevo mapeo tono/etiqueta — Regla 7
 * ("la reutilización tiene prioridad sobre la creación de nuevos
 * componentes").
 *
 * **Corrección Sprint 5.1.5** ("Corrección definitiva del Coordinator
 * Workspace"): re-auditado el bloque real `mx-jobcard-h`
 * (`Multimax_Despacho_v1.3.html`, líneas ~2216-2233) y se detectó un Pill
 * real faltante: `job.urgente ? Pill(tone:"red",pulse:true,"Urgente") :
 * Pill(tone:"muted","Normal")` — a diferencia de "Simulación"/"Completado"/
 * "Cancelado" (sí condicionales, no aplican al job de demostración en fase
 * `live`), esta rama SIEMPRE muestra uno de los 2 Pills. Se agrega el campo
 * `urgente` (booleano) y el Pill correspondiente, en su posición real (2º,
 * justo después del ID) — los 2 Pills "añadidos por decisión de producto"
 * (`estado`/`remainingSeconds`, pedidos explícitamente por el usuario en
 * los Sprints 5.1.3/5.1.4, ver arriba) se reordenan al final, después de
 * los 3 campos literales del HTML (id/urgente-normal/bid), para no mezclar
 * campos reales con campos añadidos.
 *
 * **Job de demostración (MVP)**: no existe ningún seed real para la rama
 * `jobs.length > 0` en el HTML oficial (`jobs` arranca en `[]`, sin mock —
 * ver auditoría de Sprint 3.6). Por instrucción explícita del usuario para
 * este Sprint ("asume un trabajo de demostración únicamente con fines de
 * reconstrucción visual"), `job`/`remainingSeconds` se reciben como props
 * — el valor demo concreto vive en `DespachoPage.tsx`, mismo criterio ya
 * establecido para `RADAR_DEMO_*`/`LIVECOUNTDOWN_DEMO_*` (Sprints 3.7/3.9):
 * ningún componente "compartido" esconde datos de demostración en su
 * propio código, quedan visibles en el punto de montaje para facilitar su
 * retiro futuro (Sprint 5.2/5.3).
 */
export interface JobSummaryCardJob {
  id: string;
  tipo: string;
  zona: string;
  provincia: string;
  fecha: string;
  hora: string;
  sucursal: string;
  bidMins: number;
  /**
   * Sprint 5.1.5 — campo real de `mx-jobcard-h` (`job.urgente`), sin
   * equivalente confirmado en el mock `TRABAJOS` del HTML oficial (línea
   * 1183, `JOB-4821` no lo incluye — ese mock es de "Mis trabajos", no del
   * motor de despacho). `DespachoPage.tsx` usa `false` en el job de
   * demostración por ser el valor menos presuntuoso (no fabricar una
   * urgencia que no existe), documentado explícitamente ahí.
   */
  urgente: boolean;
}

export interface JobSummaryCardProps {
  job: JobSummaryCardJob;
  remainingSeconds: number;
  onOpenPublish: () => void;
}

export function JobSummaryCard({ job, remainingSeconds, onOpenPublish }: JobSummaryCardProps) {
  const estadoInfo = trabajoEstadoInfo('live');

  return (
    <Card className="mx-jobcard">
      <div className="mx-jobcard-h">
        <Badge tone="ice">
          <Zap size={11} />
          {job.id}
        </Badge>
        {job.urgente ? (
          <Badge tone="red" className="mx-blink">
            <AlertTriangle size={11} />
            Urgente
          </Badge>
        ) : (
          <Badge tone="muted">Normal</Badge>
        )}
        <Badge tone="amber">
          <Timer size={11} />
          Bid {job.bidMins} min
        </Badge>
        <Badge tone={estadoInfo.tone}>{estadoInfo.label}</Badge>
        <Badge tone="amber" className="mx-blink">
          <Timer size={11} />
          {fmt(remainingSeconds)} restante
        </Badge>
      </div>
      <h2 className="mx-jobtitle">{job.tipo}</h2>
      <div className="mx-jobmeta">
        <span>
          <MapPin size={13} />
          {job.zona} · {job.provincia}
        </span>
        <span>
          <Calendar size={13} />
          {job.fecha} · {job.hora}
        </span>
        <span>
          <Home size={13} />
          {job.sucursal}
        </span>
      </div>
      <div className="mx-actionsrow">
        <Button variant="ice" onClick={onOpenPublish}>
          <Plus size={16} />
          Publicar otro
        </Button>
      </div>
    </Card>
  );
}
