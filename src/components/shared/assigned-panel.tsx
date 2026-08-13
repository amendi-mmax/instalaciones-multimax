import { Calendar, CheckCircle2, MapPin, User } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { REVEAL, type InstallerMock } from '@/constants';

/**
 * AssignedPanel — reconstruye verbatim `function AssignedPanel({ inst, offer,
 * completed })` de `Multimax_Despacho_v1.3.html` (líneas 2424-2452), uno de
 * los dos bloques reales correspondientes al Sprint 3.16 ("Shared
 * Components" en `docs/SPRINTS_INDEX.md` — nombre genérico corregido, ver
 * "Diferencias detectadas" en docs/sprints/sprint-3.16.md).
 *
 * Único consumidor real en el HTML fuente: `Coordinator(props)`, dentro de
 * la columna derecha (`.mx-col`) de la tarjeta de trabajo activo, cuando
 * `assigned` es verdadero (líneas 2357-2360) —
 * `React.createElement(AssignedPanel, { inst: INSTALLERS.find(i =>
 * i.id === job.assignedId), offer: assigned.offer, completed: isCompleted })`.
 * Ese bloque (`mx-jobcard`/`mx-col`) depende de `jobs.length > 0` (motor de
 * trabajos real, todavía no portado) — mismo bloqueo ya documentado para
 * `Radar`/`LiveCountdown`/`ConfirmCancelDialog` (Sprints 3.7/3.9/3.15). Por
 * instrucción explícita de este Sprint ("cierre de la etapa de
 * reconstrucción visual"), NO se crea ningún mount temporal de demostración
 * — el componente queda exportado y documentado, listo para integrarse
 * cuando exista `Coordinator` real (Fase 4).
 *
 * `offer` reproduce el objeto literal `{ precio, dia, hora, comentario? }`
 * del HTML fuente (ver `SCRIPT`, línea 1021, y `installerRespond`, línea
 * 1987) — un tipo local a este componente, no el `Bid` de
 * `types/domain.ts` (ese es el tipo ya mapeado al esquema de Supabase,
 * `fechaDisponible`/`horaDisponible`; `AssignedPanelOffer` reproduce los
 * nombres de campo exactos del prototipo, `dia`/`hora`, mismo criterio ya
 * aplicado a `PublishForm` en `publish-modal.tsx`, Sprint 3.5).
 *
 * `REVEAL` (dirección/cliente revelados tras la asignación) ya existe en
 * `src/constants/index.ts` (agregado en este mismo Sprint) — dato fijo, no
 * dependiente del trabajo/instalador, igual que en el HTML fuente.
 *
 * Reutiliza `Card` (`.mx-card`, Fase 3) vía `className="mx-assigned"` — el
 * HTML fuente no usa aquí el patrón `.mx-section-h`/`CardHeader` (el
 * encabezado `.mx-as-h` es propio de este bloque), mismo criterio ya
 * aplicado en `MasterCalendar`/`.mx-daylist` (Sprint 3.14).
 */
export interface AssignedPanelOffer {
  precio: number;
  dia: string;
  hora: string;
  comentario?: string;
}

export interface AssignedPanelProps {
  inst: InstallerMock | undefined;
  offer: AssignedPanelOffer | null | undefined;
  completed: boolean;
}

export function AssignedPanel({ inst, offer, completed }: AssignedPanelProps) {
  return (
    <Card className="mx-assigned">
      <div className="mx-as-h">
        <CheckCircle2 size={16} />
        {completed ? 'Trabajo completado' : 'Trabajo asignado y confirmado'}
      </div>
      <div className="mx-as-name">
        {inst && inst.nombre} · ${offer && offer.precio} · {offer && offer.dia}{' '}
        {offer && offer.hora}
      </div>
      <div className="mx-reveal">
        <div className="mx-reveal-row">
          <MapPin size={13} />
          <b>Dirección exacta</b>
          <span>{REVEAL.direccion}</span>
        </div>
        <div className="mx-reveal-row">
          <User size={13} />
          <b>Cliente</b>
          <span>
            {REVEAL.cliente.nombre} · {REVEAL.cliente.telefono}
          </span>
        </div>
        <div className="mx-reveal-row">
          <Calendar size={13} />
          <b>Agenda</b>
          <span>Agregado al calendario del instalador. El cliente recibió la confirmación.</span>
        </div>
      </div>
    </Card>
  );
}
