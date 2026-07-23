import { ShieldCheck, TrendingUp } from 'lucide-react';

import { Card, CardHeader } from '@/components/ui/card';
import { Loading } from '@/components/ui/spinner';
import { CoordinatorKpiRow } from '@/components/shared/coordinator-kpi-row';
import type { CoordinatorKpis } from '@/services';

/**
 * JobIndicadoresCard — Sprint 5.1.4 ("Finalización del Workspace Operativo
 * del Coordinador"). Reconstruye el MARCO visual del bloque real
 * "Indicadores" de `Coordinator(props)` (`Multimax_Despacho_v1.3.html`,
 * líneas ~2318-2354, rama `jobs.length > 0`, nunca portada antes de este
 * Sprint): tarjeta `.mx-card` con encabezado `.mx-section-h` (ícono
 * `TrendingUp` + título "Indicadores") y pie `.mx-goal` ("Meta: una opción
 * de instalación disponible en X minutos o menos.").
 *
 * **Discrepancia real detectada en la auditoría previa de este Sprint,
 * resuelta explícitamente por el usuario vía `AskUserQuestion` antes de
 * escribir código**: el contenido REAL de ese bloque en el HTML oficial son
 * 6 `StatTile` derivados de `jobView()` (1ª respuesta/3 respuestas/
 * Asignación/Notificados/Abiertos/Respuestas) — datos que no pueden existir
 * sin el motor de subasta real (Sprint 5.3), explícitamente fuera de
 * alcance de un Sprint visual ("los Sprints visuales no implementan lógica
 * de negocio", Regla 20 del brief de este Sprint). El `CoordinatorKpiRow`
 * ya existente (Pendientes/Activos/Finalizados/Programados hoy, Sprint 5.1)
 * es una decisión de producto DISTINTA, ya reafirmada dos veces (Sprints
 * 5.1 y 5.1.2: "el HTML oficial no tiene ningún Dashboard" — por eso ese
 * componente no tiene equivalente literal en el HTML), alimentada por datos
 * REALES (`getCoordinatorKpis`, servicio real, no demo).
 *
 * **Decisión del usuario (verbatim)**: "Mantener `CoordinatorKpiRow` como
 * fuente de datos y crear el bloque visual de Indicadores del HTML oficial
 * utilizando esos datos. No reemplazar ni eliminar `CoordinatorKpiRow`...
 * El componente `CoordinatorKpiRow` podrá convertirse posteriormente en un
 * wrapper del bloque Indicadores cuando finalice la Fase 5, pero no debe
 * eliminarse ni cambiar su contrato en este Sprint."
 *
 * Por lo tanto: `coordinator-kpi-row.tsx` **no se modifica** (mismo
 * archivo, mismo contrato `{ kpis: CoordinatorKpis }`, cero cambios de
 * código ni de cálculo) — este componente únicamente lo ENVUELVE con el
 * marco visual real del HTML (título/ícono/`mx-goal`), sin inventar ninguna
 * métrica nueva. `bidMins` reutiliza el mismo valor de demostración ya
 * aprobado en el Sprint 5.1.3 (`JOB_DEMO.bidMins`, pasado como prop desde
 * `DespachoPage.tsx`) para el texto de la meta — no es un dato nuevo.
 *
 * `kpis` se recibe tal cual desde `DespachoPage.tsx` (mismo `useEffect`/
 * `getCoordinatorKpis` del Sprint 5.1, sin cambios) — este componente solo
 * decide el envoltorio visual.
 *
 * CSS: `.mx-goal`/`.mx-goal svg` no estaban portados a `globals.css` (la
 * rama que los usa nunca se había construido) — agregados verbatim en este
 * mismo Sprint (líneas 96-97 del `<style>` original).
 *
 * **Corrección Sprint 5.1.5** ("Corrección definitiva del Coordinator
 * Workspace"): el HTML oficial NUNCA muestra un mensaje de error dentro del
 * bloque "Indicadores" — su estructura real es fija (encabezado → StatTiles
 * → `mx-goal`, sin ninguna rama de error). Este componente ya NO acepta
 * `kpisError` ni lo renderiza — ese mensaje (ej. "la sucursal todavía no
 * existe...") es un estado real de la app (`getCoordinatorKpis`/Contexto
 * Operativo), pero no pertenece visualmente a este bloque; `DespachoPage.tsx`
 * ahora lo muestra, si existe, FUERA de este componente (ver su JSDoc). Sin
 * `kpis` real disponible, este componente solo muestra `<Loading/>` en su
 * lugar — nunca texto de error, igual que el HTML oficial nunca muestra
 * nada distinto de los StatTiles/`mx-goal` en ese bloque.
 */
export interface JobIndicadoresCardProps {
  kpis: CoordinatorKpis | null;
  bidMins: number;
}

export function JobIndicadoresCard({ kpis, bidMins }: JobIndicadoresCardProps) {
  return (
    <Card>
      <CardHeader icon={<TrendingUp size={14} />} cardTitle="Indicadores" />
      {kpis ? <CoordinatorKpiRow kpis={kpis} /> : <Loading label="Cargando indicadores…" />}
      <div className="mx-goal">
        <ShieldCheck size={13} />
        Meta: una opción de instalación disponible en {bidMins} minutos o menos.
      </div>
    </Card>
  );
}
