import { AlertTriangle, Megaphone, MessageSquare, TrendingUp, User, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Card } from '@/components/ui/card';

/**
 * NoResponsePanel — reconstruye verbatim `function NoResponsePanel()` de
 * `Multimax_Despacho_v1.3.html` (líneas 2453-2470), el segundo de los dos
 * bloques reales correspondientes al Sprint 3.16 ("Shared Components" en
 * `docs/SPRINTS_INDEX.md` — nombre genérico corregido, ver "Diferencias
 * detectadas" en docs/sprints/sprint-3.16.md).
 *
 * Único consumidor real en el HTML fuente: `Coordinator(props)`, mismo lugar
 * que `AssignedPanel` (columna derecha `.mx-col` de la tarjeta de trabajo
 * activo), cuando `v.noResponse` es verdadero (línea 2361) —
 * `v.noResponse && React.createElement(NoResponsePanel, null)`. Ese bloque
 * depende de `jobs.length > 0` (motor de trabajos real, todavía no
 * portado) — mismo bloqueo que `AssignedPanel`. Sin props, sin estado — ver
 * JSDoc de `assigned-panel.tsx` para la nota de integración/mount temporal.
 *
 * `acts` (línea 2454 del script: array de tuplas `[Icono, etiqueta]`) es una
 * lista fija de acciones sugeridas, sin `onClick` en ningún caso en el HTML
 * fuente (los 5 botones son literales inertes) — se reproduce aquí como
 * `ACCIONES`, un array de objetos a nivel de módulo (más ergonómico en
 * TypeScript que la tupla `[Icon, label]` original, mismo contenido/orden/
 * salida visual exacta). Es una etiqueta de UI fija, no una colección de
 * datos de negocio — mismo criterio ya aplicado a `MESES`/`DOFW`
 * (`master-calendar.tsx`, Sprint 3.14) y `GRUPOS` (`installer-jobs.tsx`,
 * Sprint 3.12): vive a nivel de módulo en este archivo, no en
 * `src/constants/`.
 *
 * Reutiliza `Card` (`.mx-card`, Fase 3) vía `className="mx-noresp"` — mismo
 * criterio que `AssignedPanel`.
 *
 * Corrección de tipado (reportada por `npm run typecheck` en el entorno del
 * usuario): `Icon` se tipaba como `ComponentType<{ size?: number }>`,
 * incompatible con el tipo real exportado por `lucide-react`. Se corrige a
 * `LucideIcon` (tipo oficial de la librería para sus componentes de ícono,
 * ya incluye `size`/`color`/`strokeWidth`/el resto de `LucideProps`, más
 * preciso que la forma mínima ad-hoc usada antes). Sin cambios de
 * comportamiento, estilos, layout ni JSX — únicamente el tipo.
 */
interface NoResponseAction {
  Icon: LucideIcon;
  label: string;
}

const ACCIONES: readonly NoResponseAction[] = [
  { Icon: Users, label: 'Invitar más instaladores' },
  { Icon: TrendingUp, label: 'Aumentar precio sugerido' },
  { Icon: User, label: 'Asignar manualmente' },
  { Icon: MessageSquare, label: 'Contactar a un instalador' },
  { Icon: Megaphone, label: 'Avisar al cliente que sigue en proceso' },
];

export function NoResponsePanel() {
  return (
    <Card className="mx-noresp">
      <div className="mx-nr-h">
        <AlertTriangle size={15} />
        Tiempo del bid agotado sin respuestas
      </div>
      <div className="mx-nr-sub">Toma una acción para no romper la promesa de servicio.</div>
      <div className="mx-nr-acts">
        {ACCIONES.map(({ Icon, label }) => (
          <button key={label} type="button">
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
}
