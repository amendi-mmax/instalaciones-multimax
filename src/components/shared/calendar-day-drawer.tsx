import { CalendarDays } from 'lucide-react';

import { CalendarJobCard } from '@/components/shared/calendar-job-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { DialogPortal } from '@/components/ui/dialog';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerOverlay } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import type { CalendarLoadStatus } from '@/hooks/useCalendarData';
import type { CalendarJobViewModel } from '@/types/calendar';

/**
 * CalendarDayDrawer — Sprint 8.2.3 ("Drawer lateral"). Al hacer clic en
 * un día del calendario: "NO abrir Modal. NO cambiar de pantalla. NO
 * navegar. Debe abrir un Drawer lateral" (brief textual) -- `Drawer`
 * con `variant="lateral"` (`ui/drawer.tsx`, nuevo en este Sprint, ver su
 * JSDoc), no el bottom-sheet que ya usaba `PublishModal`.
 *
 * **4 estados uniformes (Sprint 8.2.8)**: `status` viene de
 * `useCalendarData()` (`'loading' | 'ready' | 'error'`) -- este
 * componente nunca inventa su propio estado de carga. `'loading'` ->
 * `Skeleton` (3 tarjetas fantasma, mismo alto aproximado que
 * `CalendarJobCard`); `'error'` -> mensaje genérico fijo, NUNCA
 * `error.message` de Supabase (el hook tampoco lo guarda -- ver su
 * JSDoc); `'ready'` con 0 trabajos -> `EmptyState` (Fase 3, reutilizado
 * tal cual); `'ready'` con trabajos -> lista de `CalendarJobCard`.
 */
export interface CalendarDayDrawerProps {
  date: string | null;
  jobs: CalendarJobViewModel[];
  status: CalendarLoadStatus;
  onClose: () => void;
}

const ERROR_MESSAGE = 'No fue posible cargar la información.';

function formatFechaLarga(fecha: string): string {
  return new Date(`${fecha}T00:00`).toLocaleDateString('es-PA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function CalendarDayDrawer({ date, jobs, status, onClose }: CalendarDayDrawerProps) {
  return (
    <Drawer open={date !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DrawerOverlay variant="lateral">
          <DrawerContent variant="lateral">
            <DrawerHeader
              icon={<CalendarDays size={15} />}
              title={date ? formatFechaLarga(date) : ''}
            />
            <DrawerBody>
              {status === 'loading' ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : status === 'error' ? (
                <p className="mx-sub" style={{ color: 'var(--red)' }}>
                  {ERROR_MESSAGE}
                </p>
              ) : jobs.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays size={22} />}
                  description="No hay trabajos para este día con los filtros actuales."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  <Badge tone="muted">
                    {jobs.length} trabajo{jobs.length !== 1 ? 's' : ''}
                  </Badge>
                  {jobs.map((job) => (
                    <CalendarJobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </DrawerBody>
          </DrawerContent>
        </DrawerOverlay>
      </DialogPortal>
    </Drawer>
  );
}
