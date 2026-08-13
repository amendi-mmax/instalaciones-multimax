import { Navigation, ShieldCheck, Star, TrendingUp } from 'lucide-react';

/**
 * InstallerProfileSummary — portado verbatim del contenido de la
 * primera tarjeta `.mx-card.mx-mini` dentro de `.mx-instside`: el grid
 * `.mx-profile` con los 4 indicadores del instalador activo (JSX de
 * referencia: `Installer()` en `Multimax_Despacho_v1.3.html`, líneas
 * 3430-3441 — Sprint 3.2). El encabezado "Tu perfil" (`.mx-section-h`)
 * vive en `InstallerSidebarCard`, que envuelve a este componente.
 *
 * Nombrado `InstallerProfileSummary` y no `InstallerProfile` a
 * propósito: el HTML fuente ya tiene una función `InstallerProfile()`
 * distinta — la pantalla completa de perfil dentro del teléfono
 * (`.mx-profscreen`, con avatar/hero/stats), que `ARCHITECTURE.md` §3
 * mapea a `pages/installer/PerfilPage.tsx` (Sprint futuro, fuera de
 * alcance de 3.2). Usar el mismo nombre aquí habría creado una
 * colisión conceptual con un componente que este proyecto todavía no
 * tiene. Ver "Dependencias/riesgos" en `docs/sprints/sprint-3.2.md`.
 *
 * **Estabilización del módulo Instalador (post Sprint 8.2)**: `rating`/
 * `km`/`cumplimiento`/`aceptacion` dejaron de alimentarse del mock
 * `INSTALLERS` — son columnas reales de `instaladores` (confirmadas vía
 * `database.generated.ts`/MCP: `rating` siempre tiene un valor real para un
 * instalador real; `km`/`cumplimiento`/`aceptacion` son nullable — `null`
 * hasta que el instalador acumule historial suficiente, no un dato faltante
 * del schema). Las 4 props pasan a ser `number | null`; `null` se muestra
 * como `—` en vez de fabricar un cero o un porcentaje inventado — `rating`
 * también puede llegar `null` cuando quien ve esta pantalla es un `admin`
 * en "Modo Instalador" (sin fila propia en `instaladores`, ver
 * `installer-dashboard.tsx`).
 */
export interface InstallerProfileSummaryProps {
  rating: number | null;
  km: number | null;
  cumplimiento: number | null;
  aceptacion: number | null;
}

export function InstallerProfileSummary({
  rating,
  km,
  cumplimiento,
  aceptacion,
}: InstallerProfileSummaryProps) {
  return (
    <div className="mx-profile">
      <div>
        <Star size={13} className="mx-starc" />
        <b>{rating ?? '—'}</b> calificación
      </div>
      <div>
        <Navigation size={13} />
        <b>{km != null ? `${km} km` : '—'}</b> al trabajo
      </div>
      <div>
        <ShieldCheck size={13} />
        <b>{cumplimiento != null ? `${cumplimiento}%` : '—'}</b> cumplimiento
      </div>
      <div>
        <TrendingUp size={13} />
        <b>{aceptacion != null ? `${aceptacion}%` : '—'}</b> aceptación
      </div>
    </div>
  );
}
