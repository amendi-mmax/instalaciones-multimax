# SPRINTS_INDEX.md — HANDYMAX · Multimax Despacho

Índice oficial del desarrollo por Sprints incrementales (metodología vigente desde el Sprint 3.1). Cada Sprint migra una sección específica de `Multimax_Despacho_v1.3.html`. Este archivo se actualiza automáticamente al finalizar cada Sprint — ver `docs/sprints/sprint-X.Y.md` para el detalle de cada uno.

**Desde el Sprint 3.2**, cada Sprint se identifica por el bloque/selector real del HTML (no por un nombre genérico de sección como "Sidebar"/"Navigation"/"Dashboard"). La columna "Elemento" de los Sprints 3.3 en adelante todavía usa los nombres genéricos originales porque no se ha hecho el análisis previo obligatorio de esos bloques — se actualizarán al selector real del HTML cuando le corresponda su turno, sin adelantar ese análisis ahora.

| Sprint | Estado | Elemento | Rama Git |
|---------|--------|----------|-----------|
| 3.1 | ✅ Completado | Header (`<header class="mx-top">`) | `feature/sprint-3-1-header` |
| 3.2 | 🟡 En progreso (sub-iteración 3.2.2 — corrección de integración visual; pendiente validación local del usuario) | `mx-instside` (panel lateral del Instalador) | `feature/sprint-3-2-mx-instside` |
| 3.3 | ⏳ Pendiente | Top Navigation | `feature/sprint-3-3-top-navigation` |
| 3.4 | ⏳ Pendiente | Main Layout | `feature/sprint-3-4-main-layout` |
| 3.5 | ⏳ Pendiente | Publish Modal | `feature/sprint-3-5-publish-modal` |
| 3.6 | ⏳ Pendiente | Job Cards | `feature/sprint-3-6-job-cards` |
| 3.7 | ⏳ Pendiente | Radar | `feature/sprint-3-7-radar` |
| 3.8 | ⏳ Pendiente | Countdown | `feature/sprint-3-8-countdown` |
| 3.9 | ⏳ Pendiente | Timeline | `feature/sprint-3-9-timeline` |
| 3.10 | ⏳ Pendiente | Installer Dashboard | `feature/sprint-3-10-installer-dashboard` |
| 3.11 | ⏳ Pendiente | Installer Profile | `feature/sprint-3-11-installer-profile` |
| 3.12 | ⏳ Pendiente | Installer Jobs | `feature/sprint-3-12-installer-jobs` |
| 3.13 | ⏳ Pendiente | Admin Dashboard | `feature/sprint-3-13-admin-dashboard` |
| 3.14 | ⏳ Pendiente | Calendar | `feature/sprint-3-14-calendar` |
| 3.15 | ⏳ Pendiente | Shared Dialogs | `feature/sprint-3-15-dialogs` |
| 3.16 | ⏳ Pendiente | Shared Components | `feature/sprint-3-16-shared-components` |

## Notas de alcance detectadas durante Sprint 3.1

- **3.2 (Sidebar → `mx-instside`)**: confirmado y resuelto en el Sprint 3.2. El único elemento visual llamado "sidebar" en el HTML es `.mx-instside` (panel lateral del Instalador, con las tarjetas "Tu perfil" y "Reglas de prioridad"). Detalle completo en `docs/sprints/sprint-3.2.md`.
- **3.3 (Top Navigation)**: el candidato más claro en el HTML es `.mx-subtabs-wrap`/`.mx-subtabs` (tabs "Despacho en vivo" / "Mis trabajos"), que aparece **fuera** de `<header>` pero **dentro** de la rama `role === "coord"` — es decir, depende visualmente de que el Coordinator exista. A confirmar alcance exacto antes de iniciar.

## Resumen — Sprint 3.2.2 (corrección de integración visual)

- **Sprint actual**: 3.2.2 (sub-iteración de corrección; no un Sprint nuevo de migración de HTML, no es el Sprint 3.3).
- **Estado**: Corrección de integración visual — `InstallerSidebar` (Sprint 3.2) ahora solo se renderiza para `role === 'instalador'`, respeta el ancho de columna del HTML (`.mx-instwrap`) y el contenedor queda preparado (Phone Placeholder reservado) para el siguiente Sprint. Pendiente validación local del usuario para pasar a ✅ Completado.
- **Bloques HTML migrados hasta ahora**: Header (`mx-top`, Sprint 3.1), `mx-instside` (panel lateral del Instalador, Sprint 3.2).
- **Pendientes** (sin Sprint asignado todavía en este índice, salvo lo ya listado en la tabla): Phone Layout (`mx-phone`/`mx-phone-bar`/`mx-phonetabs`, `layouts/InstallerLayout.tsx`), Main Layout, Navigation, Coordinator, Jobs, Dialogs.

Detalle completo de las 3 correcciones aplicadas: `docs/sprints/sprint-3.2.md` → "Sprint 3.2.2".

## Notas de alcance detectadas durante Sprint 3.2

- El bloque `mx-instside` migrado en 3.2 es hermano de `.mx-phone` dentro de `.mx-instwrap` — ese wrapper y el teléfono (`mx-phone`/`mx-phone-bar`/`mx-phonetabs`) siguen sin componente propio (`layouts/InstallerLayout.tsx`, según `ARCHITECTURE.md` §3, no existe todavía). Ningún Sprint de los 3.3-3.16 listados originalmente cubre explícitamente ese layout — a confirmar con el usuario cuándo/cómo se planifica.
- El HTML fuente tiene dos versiones de "Reglas de prioridad" (5 ítems en `mx-instside`, ya migrados en 3.2; 4 ítems dentro de `InstallerProfile()`/`mx-profblock`, sin Sprint asignado todavía — candidato natural: Sprint 3.11 "Installer Profile"). Ver `docs/sprints/sprint-3.2.md` → "Dependencias detectadas".
- **Legado de Fase 3**: antes de adoptar esta metodología de Sprints, el proyecto se desarrolló por fases grandes (ver `PROJECT_STATUS.md`/`CHANGELOG.md`, Fases 1–3). La Fase 3 ("Layout general y componentes compartidos") ya había reconstruido gran parte de Header/Sidebar/PhoneFrame/Footer y una librería `components/ui/` completa, pero incluía una página de vitrina (`LayoutShowcasePage`) — eliminada en el Sprint 3.1 por ser incompatible con la nueva regla "no crear una vitrina de componentes". Los componentes reutilizables de Fase 3 que sí corresponden a elementos reales del HTML se mantienen y se van ajustando Sprint a Sprint para llevarlos a fidelidad exacta (ver `MIGRATION_STATUS.md`).
