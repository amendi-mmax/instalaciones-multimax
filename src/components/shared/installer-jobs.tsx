import { Briefcase, Calendar, MapPin } from 'lucide-react';
import { Fragment } from 'react';

import { Badge } from '@/components/ui/badge';
import { ESTADO, MISJOBS } from '@/constants';

/**
 * InstallerJobs — reconstruye verbatim `function InstallerJobs()`
 * (`Multimax_Despacho_v1.3.html`, líneas 3453-3484, selector raíz
 * `.mx-myjobs`), la pantalla "Mis trabajos" dentro del teléfono del
 * Instalador (Sprint 3.12).
 *
 * Confirmación del nombre del Sprint (brief 3.12 exige NO asumirlo): el
 * nombre "InstallerJobs" de `docs/SPRINTS_INDEX.md` corresponde exactamente
 * a una función real del HTML fuente — `function InstallerJobs()` existe tal
 * cual, sin props, inmediatamente después del cierre de `Installer(props)`
 * (línea 3452) y antes de `InstallerProfile({ meInfo })` (línea 3491,
 * Sprint 3.11). Sin discrepancia que reportar.
 *
 * En `Installer(props)`, este componente se monta cuando `instTab ===
 * "trabajos"` (línea ~3426: `React.createElement(InstallerJobs)`). En el
 * proyecto React, ese mismo lugar es la rama `instTab === 'trabajos'` de
 * `InstallerDashboard` (Sprint 3.10), que hasta este Sprint renderizaba
 * `null` — reservado explícitamente para este Sprint. A partir de este
 * Sprint rige la nueva regla permanente de integración (vigente desde el
 * Sprint 3.11): como `InstallerDashboard` ya existe, `InstallerJobs` se
 * integra directamente en su rama real, sin ningún mount temporal en
 * `RootLayout.tsx`.
 *
 * **Relación con otros componentes ya aprobados** (ver análisis del brief):
 * no usa ni depende de `InstallerProfile` (Sprint 3.11), `CountRing` ni
 * `LiveCountdown` — ninguno de los tres aparece en el cuerpo real de
 * `InstallerJobs()`. Su único vecino compartido es `InstallerDashboard`
 * (contenedor de integración) e, indirectamente, `Installer(props)` como
 * función HTML de origen común.
 *
 * **Sin props, sin estado, sin efectos**: función pura que itera sobre
 * `MISJOBS` (mock estático, `src/constants/index.ts`) agrupando por
 * `grupo`. Se agrupa exactamente igual que el HTML fuente: `grupos =
 * ["Próximos", "Historial"]` (array local de literales, no un catálogo de
 * datos — son los encabezados de sección fijos del HTML, no un mock
 * sustituible); por cada grupo se filtran los `MISJOBS` cuyo `grupo`
 * coincide y, si no hay ninguno, no se renderiza nada para ese grupo
 * (`if (items.length === 0) return null`) — con los 4 registros actuales de
 * `MISJOBS` (2 "Próximos" + 2 "Historial") ambas ramas se ejercitan, pero el
 * `null` de grupo vacío se reconstruye igual por fidelidad 1:1.
 *
 * **Reutilización**: el helper interno `Pill` del HTML (`React.
 * createElement(Pill, { tone: e.tone }, e.label)`) corresponde al componente
 * ya existente `Badge` (`.mx-pill`, Fase 3) — mismo criterio ya aplicado en
 * `InstallerProfile` (Sprint 3.11): se usa `Badge`, no `StatusBadge`, porque
 * el mapeo estado→tono ya lo resuelve `ESTADO` (`src/constants/index.ts`),
 * y `StatusBadge` agregaría una segunda capa semántica redundante.
 *
 * **Preparación para Supabase** (regla vigente desde este Sprint): ni
 * `MISJOBS` ni `ESTADO` se generan dentro de este componente — ambos son
 * constantes reutilizables ya definidas en `src/constants/index.ts` (mismo
 * patrón que `INSTALLERS`, consumido directamente por `InstallerDashboard`
 * sin pasar por props). El componente es puramente de presentación: itera y
 * pinta, sin lógica de negocio ni estado propio. Cuando exista la tabla real
 * `trabajos` filtrada por instalador asignado, `MISJOBS` podrá sustituirse
 * por esa fuente sin tocar este archivo (JSX/estructura/estilos idénticos) —
 * ver "Preparación para integración con Supabase" en
 * `docs/sprints/sprint-3.12.md`.
 */
const GRUPOS = ['Próximos', 'Historial'] as const;

export function InstallerJobs() {
  return (
    <div className="mx-myjobs">
      {GRUPOS.map((grupo) => {
        const items = MISJOBS.filter((job) => job.grupo === grupo);
        if (items.length === 0) return null;

        return (
          <Fragment key={grupo}>
            <div className="mx-phonehdr">
              <Briefcase size={13} />
              {grupo}
            </div>
            {items.map((job, index) => {
              const estado = ESTADO[job.estado];

              return (
                <div key={index} className="mx-myjob">
                  <div className="mx-myjob-top">
                    <span className="mx-myjob-t">{job.tipo}</span>
                    <Badge tone={estado.tone}>{estado.label}</Badge>
                  </div>
                  <div className="mx-myjob-meta">
                    <span>
                      <MapPin size={12} />
                      {job.zona}
                    </span>
                    <span>
                      <Calendar size={12} />
                      {job.fecha} · {job.hora}
                    </span>
                    <span className="mx-myjob-price">${job.precio}</span>
                  </div>
                </div>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
}
