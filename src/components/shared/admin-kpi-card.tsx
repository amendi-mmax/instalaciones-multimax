import { StatTile } from '@/components/shared/stat-tile';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminKpiStatus } from '@/services/admin-dashboard.service';

/**
 * AdminKpiCard — Sprint 8.1.1 (Refinamiento del Dashboard Ejecutivo);
 * consolidado en una ronda posterior del mismo Sprint tras una auditoría
 * explícita de duplicación. Componente ÚNICO y reutilizable para TODO
 * indicador del "Dashboard Ejecutivo" del Administrador.
 *
 * **Auditoría de duplicación (ronda de consolidación)**: la primera
 * versión de este archivo reconstruía a mano, para el estado `'ready'`,
 * exactamente el mismo markup que `StatTile`/`Counter` (`ui/counter.tsx`,
 * `shared/stat-tile.tsx`, Fase 3) ya encapsulan -- `.mx-stat` +
 * `.mx-stat-v` + `.mx-stat-l` + `.mx-stat-s`, byte a byte el mismo
 * resultado que `<StatTile value label sublabel/>` ya producía (y sigue
 * produciendo para `CoordinatorKpiRow`, sin cambios). Eso era lógica
 * duplicada real, no solo reutilización de clases CSS -- corregido acá:
 * el caso `'ready'` ahora delega 100% en `StatTile`, sin reconstruir
 * ningún markup propio. `StatTile`/`Counter` NO se modificaron (su tipo
 * `value: string | number` sigue igual) -- ensanchar `value` a `ReactNode`
 * para que también aceptara un `Skeleton`/`Badge` habría envuelto ese
 * contenido dentro de `.mx-stat-v` (un `<span>`), un anidado inválido para
 * un `<div>` (`Skeleton`) y una alteración real de estructura -- se evitó
 * a propósito para no modificar el comportamiento visual actual de
 * ningún consumidor existente de esos 2 componentes compartidos.
 *
 * **4 estados, un único punto de entrada, la etiqueta (`label`) siempre en
 * la misma posición del layout**:
 * 1. `'ready'` -- delega en `<StatTile value label sublabel/>` (sin
 *    duplicar su markup).
 * 2. `'loading'` ("Calculándose") -- `Skeleton` (`ui/skeleton.tsx`, Fase 3,
 *    sin consumidor real hasta este Sprint) del mismo tamaño aproximado
 *    que el valor, en vez de un loader nuevo.
 * 3. `'pending'` ("Pendiente de implementación") -- únicamente `Badge
 *    tone="muted"` "Próximamente" (mismo componente/tono ya usado por
 *    `SettingsPage.tsx`, Sprint 7.3) -- sin texto adicional.
 * 4. `'error'` -- únicamente el texto genérico fijo "No fue posible cargar
 *    este indicador." -- nunca `error.message` de Supabase/Postgrest,
 *    nunca un stack trace.
 *
 * Los estados 2-4 comparten un único wrapper local (`.mx-stat`/
 * `.mx-stat-l`, las mismas 2 clases que `StatTile` ya usa para su propio
 * wrapper/etiqueta) porque ninguno de los 3 tiene equivalente en
 * `StatTile`/`Counter` -- no es lógica duplicada, es la única extensión
 * real que este Sprint necesitaba, centralizada en un solo lugar (antes
 * de esta consolidación ya estaba en un solo lugar; ahora, además, ya no
 * compite con la rama `'ready'`, que dejó de reimplementarla).
 *
 * **Preparado para Sprints futuros** (Ajuste 5 del brief -- Sprints
 * 8.2/8.4/8.6/8.7/8.8/8.9): cualquier KPI nuevo se agrega llamando a este
 * mismo componente con su propio `label`/`status`/`value` -- nunca se
 * crea una variante nueva de tarjeta. Ver `admin-dashboard.service.ts`
 * (`AdminKpiViewModel`/`buildAdminKpiViewModels`) para el patrón de datos
 * que alimenta este componente.
 */
export interface AdminKpiCardProps {
  label: string;
  status: AdminKpiStatus;
  value?: string | number;
  sublabel?: string;
}

const ERROR_MESSAGE = 'No fue posible cargar este indicador.';

export function AdminKpiCard({ label, status, value, sublabel }: AdminKpiCardProps) {
  if (status === 'ready') {
    return <StatTile value={value ?? '—'} label={label} sublabel={sublabel} />;
  }

  return (
    <div className="mx-stat">
      {status === 'loading' ? <Skeleton className="h-5 w-12" /> : null}
      {status === 'pending' ? <Badge tone="muted">Próximamente</Badge> : null}
      {status === 'error' ? (
        <span style={{ fontSize: 11.5, color: 'var(--red)', lineHeight: 1.4, display: 'block' }}>
          {ERROR_MESSAGE}
        </span>
      ) : null}
      <span className="mx-stat-l mt-1 block">{label}</span>
    </div>
  );
}
