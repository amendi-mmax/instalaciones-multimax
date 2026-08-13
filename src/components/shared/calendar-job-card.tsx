import {
  Building2,
  Calendar,
  Clock,
  Eye,
  Flag,
  MapPin,
  Pencil,
  RefreshCw,
  Store,
  Timer,
  User,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { trabajoEstadoInfo } from '@/constants';
import type { CalendarJobViewModel } from '@/types/calendar';

/**
 * CalendarJobCard — Sprint 8.2.3/8.2.4 ("Drawer lateral"/"Acciones
 * rápidas"). Card reutilizable para UN trabajo dentro del Drawer del
 * Calendario Maestro -- "Cada trabajo deberá mostrarse dentro de una Card
 * reutilizable" (brief textual). Reutiliza `Card` (Fase 3) + el mismo
 * patrón `.mx-kv`/`.mx-kv-row` ya usado por `TrabajoDetailPage`/
 * `ProfilePage` para listas de campo+valor -- cero markup nuevo para esa
 * parte.
 *
 * **Acciones rápidas (Sprint 8.2.4) -- solo placeholders**: reutiliza
 * `.mx-detailacts` (`TrabajoDetailPage`, Sprint 5.1) para la fila de
 * botones -- los 5 pedidos por el brief ("Ver detalle"/"Editar"/
 * "Reasignar"/"Cambiar prioridad"/"Cambiar estado"), todos `disabled`,
 * ninguno con lógica real todavía (mismo criterio que "Contactar
 * instalador"/"Duplicar trabajo" en esa misma pantalla). Primer
 * consumidor real de `Tooltip` (`ui/tooltip.tsx`, Fase 3, sin consumidor
 * hasta este Sprint) -- explica por qué cada acción está deshabilitada,
 * en vez del atributo `title` nativo ya usado en otros lugares (aporta
 * más contexto por acción, justifica el componente pedido explícitamente
 * en el listado de reutilización del brief).
 *
 * **`tiempoEstimadoMin`/`tiempoRealMin`**: siempre `null` hoy (ver
 * `types/calendar.ts`) -- se muestran como "No disponible", nunca se
 * oculta la fila (mismo criterio "no ocultar el dato, mostrar su estado
 * real" ya establecido en `ProfilePage`, Sprint 7.3).
 */
export interface CalendarJobCardProps {
  job: CalendarJobViewModel;
}

function formatMinutos(min: number | null): string {
  return min === null ? 'No disponible' : `${min} min`;
}

export function CalendarJobCard({ job }: CalendarJobCardProps) {
  const estadoInfo = trabajoEstadoInfo(job.estado);

  return (
    <Card>
      <div className="mx-jobrow-top" style={{ marginBottom: 10 }}>
        <span className="mx-jobrow-id">{job.codigo}</span>
        <Badge tone={estadoInfo.tone}>{estadoInfo.label}</Badge>
        <Badge tone={job.prioridad === 'alta' ? 'red' : 'muted'}>
          {job.prioridad === 'alta' ? 'Alta prioridad' : 'Prioridad normal'}
        </Badge>
      </div>

      <div className="mx-kv">
        <div className="mx-kv-row">
          <User size={14} />
          <div>
            <b>CLIENTE</b>
            {job.cliente ?? 'No disponible'}
          </div>
        </div>
        <div className="mx-kv-row">
          <Store size={14} />
          <div>
            <b>SUCURSAL</b>
            {job.sucursal ?? 'No disponible'}
          </div>
        </div>
        <div className="mx-kv-row">
          <Building2 size={14} />
          <div>
            <b>EMPRESA INSTALADORA</b>
            {job.empresa ?? 'No disponible'}
          </div>
        </div>
        <div className="mx-kv-row">
          <Users size={14} />
          <div>
            <b>INSTALADOR ASIGNADO</b>
            {job.instalador ?? 'Sin asignar'}
          </div>
        </div>
        <div className="mx-kv-row">
          <Calendar size={14} />
          <div>
            <b>HORARIO</b>
            {job.fecha} · {job.hora}
          </div>
        </div>
        <div className="mx-kv-row">
          <MapPin size={14} />
          <div>
            <b>DIRECCIÓN</b>
            {job.direccion ?? 'No disponible'}
          </div>
        </div>
        <div className="mx-kv-row">
          <Timer size={14} />
          <div>
            <b>TIEMPO ESTIMADO</b>
            {formatMinutos(job.tiempoEstimadoMin)}
          </div>
        </div>
        <div className="mx-kv-row">
          <Clock size={14} />
          <div>
            <b>TIEMPO REAL</b>
            {formatMinutos(job.tiempoRealMin)}
          </div>
        </div>
      </div>

      <TooltipProvider>
        <div className="mx-detailacts">
          {(
            [
              ['ver-detalle', 'Ver detalle', Eye],
              ['editar', 'Editar', Pencil],
              ['reasignar', 'Reasignar', Users],
              ['cambiar-prioridad', 'Cambiar prioridad', Flag],
              ['cambiar-estado', 'Cambiar estado', RefreshCw],
            ] as const
          ).map(([action, label, Icon]) => (
            <Tooltip key={action}>
              <TooltipTrigger asChild>
                <button type="button" disabled>
                  <Icon size={14} />
                  {label}
                </button>
              </TooltipTrigger>
              <TooltipContent>Disponible en un Sprint futuro</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </Card>
  );
}
