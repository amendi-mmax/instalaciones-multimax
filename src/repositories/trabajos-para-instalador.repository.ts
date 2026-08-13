/**
 * trabajos-para-instalador.repository.ts — acceso tipado, exclusivamente de
 * lectura, a la vista real `trabajos_para_instalador` (Sprint 7.2).
 * Anticipado desde Sprint 4.1.1 (JSDoc de `trabajos.repository.ts`): "se
 * puede agregar como `trabajosParaInstaladorRepository` en un Sprint futuro
 * usando `VIEWS.trabajosParaInstalador`" -- este es ese Sprint.
 *
 * No implementa `Repository<T>` (`base.repository.ts`): esa interfaz exige
 * `create`/`update`/`remove`, que no tienen sentido sobre una vista de solo
 * lectura -- mismo criterio ya documentado en `lib/supabase/config.ts` para
 * `VIEWS`. `TrabajoParaInstaladorRow` se toma directo de
 * `Database['public']['Views']`, ya que `TableRow<T>` (`database.service.ts`)
 * está tipado únicamente contra `Tables`, no `Views`.
 *
 * La vista ya filtra por `instalador_id = auth.uid()` en su propia
 * definición (join contra `trabajo_instaladores`) -- `getAll()` no necesita
 * ningún filtro adicional de "instalador actual": RLS + la vista ya
 * garantizan que un instalador solo vea sus propias notificaciones.
 */
import type { Database } from '@/types/database.generated';

import { getClient, toServiceResult, type ServiceResult } from '@/services/supabase.service';
import { VIEWS } from '@/lib/supabase/config';

export type TrabajoParaInstaladorRow = Database['public']['Views']['trabajos_para_instalador']['Row'];

async function getAll(): Promise<ServiceResult<TrabajoParaInstaladorRow[]>> {
  const query = getClient().from(VIEWS.trabajosParaInstalador).select('*');
  return toServiceResult(query);
}

async function getByTrabajoId(
  trabajoId: string,
): Promise<ServiceResult<TrabajoParaInstaladorRow | null>> {
  const query = getClient()
    .from(VIEWS.trabajosParaInstalador)
    .select('*')
    .eq('trabajo_id', trabajoId)
    .maybeSingle();
  return toServiceResult(query);
}

export const trabajosParaInstaladorRepository = {
  getAll,
  getByTrabajoId,
};
