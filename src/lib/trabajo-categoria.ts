import type { TrabajoParaInstaladorRow } from '@/repositories';

/**
 * categoriaDeTrabajo — clasificación real de un trabajo desde la
 * perspectiva del instalador autenticado (Estabilización del módulo
 * Instalador, extendida en Ajustes funcionales del flujo Instalador).
 *
 * Extraída a este archivo (Ajustes finales del flujo Instalador, resumen
 * superior del header) para poder reutilizarla desde
 * `installer-dashboard.tsx` sin mezclar una función pura con un componente
 * React en el mismo archivo (`installer-jobs.tsx` ya exportaba
 * `InstallerJobs`) -- mismo criterio de organización ya aplicado en el
 * resto del proyecto (`react-refresh/only-export-components`).
 *
 * **RONDA — Ciclo de vida "Completado"**: `pending_confirmation` se une a
 * `'asignados'` -- decisión funcional explícita del usuario ("Mientras esté
 * en `pending_confirmation` debe permanecer visible en Mis trabajos →
 * Asignados"), NO una categoría nueva. `InstallerJobs.tsx` distingue el
 * sub-estado dentro de esa misma categoría usando `estado_trabajo`
 * directamente (ya lo recibe por fila) para decidir si muestra el botón
 * "Marcar como completado" o el badge "Pendiente de confirmación" -- esta
 * función solo decide la PESTAÑA, no el contenido de cada tarjeta.
 */
export type Categoria = 'ofertados' | 'asignados' | 'completados' | 'cancelados';

export function categoriaDeTrabajo(trabajo: TrabajoParaInstaladorRow): Categoria | null {
  if (trabajo.gane_yo && (trabajo.estado_trabajo === 'assigned' || trabajo.estado_trabajo === 'pending_confirmation')) {
    return 'asignados';
  }
  if (trabajo.gane_yo && trabajo.estado_trabajo === 'completed') return 'completados';
  if ((trabajo.oferta_enviada || trabajo.gane_yo) && trabajo.estado_trabajo === 'cancelled') {
    return 'cancelados';
  }
  if (trabajo.oferta_enviada && !trabajo.gane_yo) return 'ofertados';
  return null;
}
