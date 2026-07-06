# SPRINTS_INDEX.md — HANDYMAX · Multimax Despacho

Índice oficial del desarrollo por Sprints incrementales (metodología vigente desde el Sprint 3.1). Cada Sprint migra una sección específica de `Multimax_Despacho_v1.3.html`. Este archivo se actualiza automáticamente al finalizar cada Sprint — ver `docs/sprints/sprint-X.Y.md` para el detalle de cada uno.

| Sprint | Estado | Elemento | Rama Git |
|---------|--------|----------|-----------|
| 3.1 | ✅ Completado | Header | `feature/sprint-3-1-header` |
| 3.2 | ⏳ Pendiente | Sidebar | `feature/sprint-3-2-sidebar` |
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

- **3.2 (Sidebar)**: el prototipo no tiene un sidebar de navegación persistente (menú lateral de secciones). El único elemento visual llamado "sidebar" en el HTML es `.mx-instside` (panel lateral del Instalador, con las tarjetas "Tu perfil" y "Reglas de prioridad"), cuya estructura ya se reconstruyó en Fase 3 (`components/shared/sidebar.tsx`). Antes de iniciar 3.2 conviene confirmar con el usuario si el Sprint se refiere a ese elemento o a otro que no se haya detectado todavía.
- **3.3 (Top Navigation)**: el candidato más claro en el HTML es `.mx-subtabs-wrap`/`.mx-subtabs` (tabs "Despacho en vivo" / "Mis trabajos"), que aparece **fuera** de `<header>` pero **dentro** de la rama `role === "coord"` — es decir, depende visualmente de que el Coordinator exista. A confirmar alcance exacto antes de iniciar.
- **Legado de Fase 3**: antes de adoptar esta metodología de Sprints, el proyecto se desarrolló por fases grandes (ver `PROJECT_STATUS.md`/`CHANGELOG.md`, Fases 1–3). La Fase 3 ("Layout general y componentes compartidos") ya había reconstruido gran parte de Header/Sidebar/PhoneFrame/Footer y una librería `components/ui/` completa, pero incluía una página de vitrina (`LayoutShowcasePage`) — eliminada en el Sprint 3.1 por ser incompatible con la nueva regla "no crear una vitrina de componentes". Los componentes reutilizables de Fase 3 que sí corresponden a elementos reales del HTML se mantienen y se van ajustando Sprint a Sprint para llevarlos a fidelidad exacta (ver `MIGRATION_STATUS.md`).
