import { RotateCcw, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { Rol } from '@/types/enums';

/**
 * HeaderStatus — portado verbatim de `.mx-topright` (JSX de referencia:
 * `App()` en Multimax_Despacho_v1.3.html, líneas 2059–2071). Tres elementos
 * condicionales, no mutuamente excluyentes:
 *
 *  1. `role === "admin"` → `.mx-master-badge` ("Vista master", ícono `Zap`).
 *  2. `role === "coord"` → `Pill tone="muted"` con `sucursalCoord` (aquí
 *     `Badge tone="muted"`, ver ARCHITECTURE.md §13.1 — Pill se fusionó con
 *     Badge en Fase 3).
 *  3. `jobs.length > 0 && role === "coord"` → `.mx-ghost` ("Reiniciar",
 *     ícono `RotateCcw`).
 *
 * `.mx-ghost` es una clase usada una única vez en todo el prototipo (solo
 * aquí) — no se generalizó como componente `ui/` nuevo, se mantiene inline
 * en este archivo (ver docs/sprints/sprint-3.1.md, "no crear componentes
 * genéricos innecesarios").
 *
 * `sucursalActiva`/`hasActiveJobs`/`onReset` son props porque su estado
 * real (sucursal del coordinador, trabajos activos) pertenece al módulo de
 * Despacho en vivo, todavía no implementado. Los valores por defecto
 * reproducen el estado inicial exacto del prototipo (`sucursalCoord`
 * inicial = `"Multiplaza"`, `jobs` inicial = `[]`) sin implementar esa
 * lógica aquí — ver docs/sprints/sprint-3.1.md, "Dependencias".
 */
export interface HeaderStatusProps {
  role: Rol;
  sucursalActiva?: string;
  hasActiveJobs?: boolean;
  onReset?: () => void;
}

export function HeaderStatus({
  role,
  sucursalActiva = 'Multiplaza',
  hasActiveJobs = false,
  onReset,
}: HeaderStatusProps) {
  return (
    <div className="mx-topright">
      {role === 'admin' && (
        <span className="mx-master-badge">
          <Zap size={12} />
          Vista master
        </span>
      )}
      {role === 'coordinador' && <Badge tone="muted">{sucursalActiva}</Badge>}
      {hasActiveJobs && role === 'coordinador' && (
        <button type="button" className="mx-ghost" onClick={onReset}>
          <RotateCcw size={13} />
          Reiniciar
        </button>
      )}
    </div>
  );
}
