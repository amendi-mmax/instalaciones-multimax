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
 *
 * **Ajustes funcionales del flujo Instalador** (migración `0018`): la
 * vista ahora también expone `oferta_enviada`/`mi_oferta_precio`/
 * `mi_oferta_enviado_at` (LEFT JOIN contra `ofertas`, señal real de "¿este
 * instalador ya ofertó?", independiente de `mi_estado`/`trabajo_instaladores`
 * -- ver JSDoc de la migración para la causa raíz completa) y ya no
 * excluye trabajos sin fila de notificación (INNER JOIN -> LEFT JOIN,
 * visibilidad ampliada a todas las zonas, misma migración). `TableRow<T>`
 * (`database.service.ts`) sigue sin cubrir `Views` -- se extiende acá el
 * tipo generado con las 3 columnas nuevas, sin tocar
 * `database.generated.ts` (archivo regenerado por el usuario vía Supabase
 * CLI, no por este entorno -- ver `src/lib/supabase/config.ts`), hasta que
 * se regenere y ya las incluya de forma nativa.
 */
import type { Database } from '@/types/database.generated';

import { getClient, toServiceResult, type ServiceResult } from '@/services/supabase.service';
import { VIEWS } from '@/lib/supabase/config';

export type TrabajoParaInstaladorRow = Database['public']['Views']['trabajos_para_instalador']['Row'] & {
  oferta_enviada: boolean;
  mi_oferta_precio: number | null;
  mi_oferta_enviado_at: string | null;
};

// Los `as unknown as ...` de abajo son exclusivamente por el desfase
// documentado arriba (`database.generated.ts` todavía no regenerado con
// las 3 columnas nuevas de la migración `0018`) -- la forma real que
// devuelve Supabase en tiempo de ejecución sí las incluye (columnas reales
// de la vista ya redefinida), no es un dato inventado ni un `any` real.
async function getAll(): Promise<ServiceResult<TrabajoParaInstaladorRow[]>> {
  const query = getClient().from(VIEWS.trabajosParaInstalador).select('*');
  return toServiceResult(query) as unknown as Promise<ServiceResult<TrabajoParaInstaladorRow[]>>;
}

async function getByTrabajoId(
  trabajoId: string,
): Promise<ServiceResult<TrabajoParaInstaladorRow | null>> {
  const query = getClient()
    .from(VIEWS.trabajosParaInstalador)
    .select('*')
    .eq('trabajo_id', trabajoId)
    .maybeSingle();
  return toServiceResult(query) as unknown as Promise<ServiceResult<TrabajoParaInstaladorRow | null>>;
}

export const trabajosParaInstaladorRepository = {
  getAll,
  getByTrabajoId,
};
