# SPRINTS_INDEX.md — HANDYMAX · Multimax Despacho

Índice oficial del desarrollo por Sprints incrementales (metodología vigente desde el Sprint 3.1). Cada Sprint migra una sección específica de `Multimax_Despacho_v1.3.html`. Este archivo se actualiza al finalizar cada Sprint — ver `docs/sprints/sprint-X.Y.md` para el detalle de cada uno.

**Desde el Sprint 3.2**, cada Sprint se identifica por el bloque/selector real del HTML (no por un nombre genérico de sección como "Sidebar"/"Navigation"/"Dashboard"). La columna "Elemento" de los Sprints 3.5 en adelante todavía usa los nombres genéricos originales porque no se ha hecho el análisis previo obligatorio de esos bloques — se actualizarán al selector real del HTML cuando le corresponda su turno, sin adelantar ese análisis ahora. El Sprint 3.4 confirmó, por inspección directa del HTML (no por el nombre genérico que tenía esta tabla, "Main Layout"), que el bloque real pendiente era `mx-suc-sel` — ver nota abajo.

| Sprint | Estado | Elemento | Rama Git |
|---------|--------|----------|-----------|
| 3.1 | ✅ Completado | Header (`<header class="mx-top">`) | `feature/sprint-3-1-header` |
| 3.2 | 🟡 En progreso — pendiente validación local del usuario | `mx-instside` (panel lateral del Instalador) | `feature/sprint-3-2-mx-instside` |
| 3.3 | ✅ Completado | `mx-subtabs` (Top Navigation) | `feature/sprint-3-3-mx-subtabs` |
| 3.4 | ✅ Completado | `mx-suc-sel` (selector de sucursal activa) | `feature/sprint-3-4-mx-suc-sel` |
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

## Estado real del proyecto (resumen, actualizado 2026-07-08)

- **Bloques HTML migrados y visibles en la aplicación**: Header (`mx-top`, Sprint 3.1, ✅), `mx-suc-sel` (Sprint 3.4, ✅ — visible en `RootLayout` cuando `role === 'coordinador'`), `mx-subtabs` (Sprint 3.3, ✅ — visible en `RootLayout` cuando `role === 'coordinador'`, en ese orden: `mx-suc-sel` antes de `mx-subtabs`, igual que en el HTML fuente).
- **Bloque migrado pero pendiente de cierre formal**: `mx-instside` / `InstallerSidebar` (Sprint 3.2 + sub-iteraciones 3.2.1/3.2.2). El código está construido, ajustado y visible en `RootLayout` cuando `role === 'instalador'`; la validación best-effort de este sandbox (`tsc`/`prettier`) está en verde, y el mismo código ya viajó, sin cambios adicionales, dentro de la rama `feature/sprint-3-3-mx-subtabs` cuyas 4 validaciones reales (`lint`/`typecheck`/`build`/`dev`) el usuario confirmó en verde. Aun así, el Sprint 3.2 **no se marca ✅ Completado** porque el usuario nunca dio la confirmación explícita puntual para ese Sprint — la regla del proyecto exige aprobación explícita por Sprint, no una inferencia a partir de la validación de un Sprint posterior.
- **Sprint 3.4 (`mx-suc-sel`, selector de sucursal activa) — ✅ Completado.** Análisis, componente (`SucursalSelect`), constante `SUCURSALES`, CSS e integración visual completos; validación real (`npm install/lint/typecheck/build/dev`) y validación visual confirmadas por el usuario. Sin pendientes técnicos para cerrar este Sprint.
- **Próximo Sprint a desarrollar**: 3.5 (Publish Modal, nombre genérico pendiente de análisis real del bloque HTML). **No se inicia sin aprobación explícita del usuario.**
- **Integraciones temporales activas en `src/layouts/RootLayout.tsx`** (a retirar cuando existan los layouts reales por rol): `SucursalSelect` + `MxSubtabs` (en ese orden) para `role === 'coordinador'` (Sprint 3.4 + 3.3) y `mx-instwrap`/`InstallerSidebar` (con Phone Placeholder reservado) para `role === 'instalador'` (Sprint 3.2.1/3.2.2). Nunca se renderizan a la vez — son ramas mutuamente excluyentes, igual que en el HTML fuente.
- **Componentes creados sin consumidor todavía**: ninguno pendiente de `mx-subtabs`/`mx-instside`/`mx-suc-sel` (los tres ya integrados); sigue pendiente de decisión la posible duplicación entre `ui/Tabs` (Fase 3, Radix, sin consumidores) y `MxSubtabs`/`MxSubtabButton` para cuando se construya AdminPanel.
- **Problema conocido, reportado sin corregir**: el badge de sucursal de `HeaderStatus` (`sucursalActiva`, default `"Multiplaza"` desde Sprint 3.1) no recibe el `sucursalCoord` real que ahora controla `SucursalSelect` (Sprint 3.4) — quedan desincronizados. No se corrige porque requeriría modificar la invocación de `Header`, fuera del alcance mínimo permitido en el Sprint 3.4. Ver `docs/sprints/sprint-3.4.md`.

## Notas de alcance detectadas

- **3.2 (Sidebar → `mx-instside`)**: confirmado y resuelto en el Sprint 3.2. El único elemento visual llamado "sidebar" en el HTML es `.mx-instside` (panel lateral del Instalador, con las tarjetas "Tu perfil" y "Reglas de prioridad"). Detalle completo en `docs/sprints/sprint-3.2.md`.
- **3.3 (Top Navigation → `mx-subtabs`)**: confirmado y resuelto en el Sprint 3.3 (✅ Completado). El candidato era `.mx-subtabs-wrap`/`.mx-subtabs`, que en realidad tiene **dos** instancias reales en el HTML (Coordinator: "Despacho en vivo"/"Mis trabajos"; AdminPanel: "Calendario maestro"/"Instaladores"), ambas dependientes de pantallas que todavía no existen. Se reconstruyó el markup/CSS (`MxSubtabs`/`MxSubtabButton`) y se integró en `RootLayout` (visible para `role === 'coordinador'`) hasta que exista `layouts/CoordinatorLayout.tsx` real — ver `docs/sprints/sprint-3.3.md`.
- **3.4 (nombre genérico "Main Layout" → `mx-suc-sel`)**: el nombre original de esta tabla para el Sprint 3.4 era un placeholder especulativo ("Main Layout"), nunca confirmado por análisis real. Al hacer el análisis obligatorio se determinó que `.mx-grid`/`.mx-col` (candidato natural de "Main Layout") ya estaban migrados desde Fase 3 (`TwoColumnLayout`), y que el verdadero bloque pendiente, sin ningún avance previo (ni CSS ni componente), era `.mx-suc-sel` (selector de sucursal activa), hermano de `.mx-subtabs-wrap` dentro de la misma rama `role === "coord"` de `App()`. Se reconstruyó markup/CSS/componente (`SucursalSelect`) y se integró en `RootLayout` (visible para `role === 'coordinador'`, antes de `MxSubtabs`, mismo orden del HTML fuente) — ver `docs/sprints/sprint-3.4.md`.
- El bloque `mx-instside` migrado en 3.2 es hermano de `.mx-phone` dentro de `.mx-instwrap` — ese wrapper y el teléfono (`mx-phone`/`mx-phone-bar`/`mx-phonetabs`) siguen sin componente propio (`layouts/InstallerLayout.tsx`, según `ARCHITECTURE.md` §3, no existe todavía). Ningún Sprint de los 3.5-3.16 listados originalmente cubre explícitamente ese layout — a confirmar con el usuario cuándo/cómo se planifica.
- El HTML fuente tiene dos versiones de "Reglas de prioridad" (5 ítems en `mx-instside`, ya migrados en 3.2; 4 ítems dentro de `InstallerProfile()`/`mx-profblock`, sin Sprint asignado todavía — candidato natural: Sprint 3.11 "Installer Profile"). Ver `docs/sprints/sprint-3.2.md` → "Dependencias detectadas".
- **Legado de Fase 3**: antes de adoptar esta metodología de Sprints, el proyecto se desarrolló por fases grandes (ver `PROJECT_STATUS.md`/`CHANGELOG.md`, Fases 1–3). La Fase 3 ("Layout general y componentes compartidos") ya había reconstruido gran parte de Header/Sidebar/PhoneFrame/Footer y una librería `components/ui/` completa, pero incluía una página de vitrina (`LayoutShowcasePage`) — eliminada en el Sprint 3.1 por ser incompatible con la nueva regla "no crear una vitrina de componentes". Los componentes reutilizables de Fase 3 que sí corresponden a elementos reales del HTML se mantienen y se van ajustando Sprint a Sprint para llevarlos a fidelidad exacta (ver `MIGRATION_STATUS.md`).

## Detalle por Sprint (histórico completo)

Para el análisis previo, implementación, correcciones y validaciones línea por línea de cada Sprint (incluidas sus sub-iteraciones 3.2.1, 3.2.2, y el fix de integración visual de 3.3), ver:

- `docs/sprints/sprint-3.1.md`
- `docs/sprints/sprint-3.2.md` (incluye 3.2.1 y 3.2.2)
- `docs/sprints/sprint-3.3.md` (incluye el fix de integración visual)
- `docs/sprints/sprint-3.4.md`
