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
 * resto del proyecto (`react-refresh/only-export-components`). Ningún
 * cambio de lógica respecto a la función original.
 */
export type Categoria = 'ofertados' | 'asignados' | 'completados' | 'cancelados';

export function categoriaDeTrabajo(trabajo: TrabajoParaInstaladorRow): Categoria | null {
  if (trabajo.gane_yo && trabajo.estado_trabajo === 'assigned') return 'asignados';
  if (trabajo.gane_yo && trabajo.estado_trabajo === 'completed') return 'completados';
  if ((trabajo.oferta_enviada || trabajo.gane_yo) && trabajo.estado_trabajo === 'cancelled') {
    return 'cancelados';
  }
  if (trabajo.oferta_enviada && !trabajo.gane_yo) return 'ofertados';
  return null;
}
