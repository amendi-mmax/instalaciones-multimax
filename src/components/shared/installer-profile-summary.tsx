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
 * `km` (distancia al trabajo activo) no es un campo del modelo de
 * dominio `Usuario` (`types/domain.ts`): en el prototipo vive
 * únicamente en el mock `INSTALLERS`, no en `handymax_supabase_schema_v3.sql`.
 * Se deja como prop obligatoria de este componente; de dónde saldrá ese
 * dato en producción queda pendiente para cuando se conecte el módulo
 * Installer a Supabase — reportado, no resuelto aquí.
 */
export interface InstallerProfileSummaryProps {
  rating: number;
  km: number;
  cumplimiento: number;
  aceptacion: number;
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
        <b>{rating}</b> calificación
      </div>
      <div>
        <Navigation size={13} />
        <b>{km} km</b> al trabajo
      </div>
      <div>
        <ShieldCheck size={13} />
        <b>{cumplimiento}%</b> cumplimiento
      </div>
      <div>
        <TrendingUp size={13} />
        <b>{aceptacion}%</b> aceptación
      </div>
    </div>
  );
}
