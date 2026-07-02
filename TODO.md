# TODO.md — HANDYMAX · Multimax Despacho

Checklist vivo. Orden de implementación actualizado en Fase 2 (la arquitectura de `ARCHITECTURE.md` no cambió, solo el orden):

1. Fase 2 — Scaffold del proyecto
2. Fase 3 — Layout general / Navegación / Header / Sidebar / Componentes compartidos
3. Fase 4 — Módulo Coordinator
4. Fase 5 — Módulo Installer
5. Fase 6 — Módulo Admin
6. Fase 7 — Integración completa con Supabase
7. Fase 8 — Realtime
8. Fase 9 — Eliminación de datos mock
9. Fase 10 — Pruebas finales, optimización, documentación

## Fase 1 — Arquitectura (completada)

- [x] Análisis completo de los tres archivos fuente.
- [x] `ARCHITECTURE.md`, `PROJECT_STATUS.md`, `TODO.md`, `CHANGELOG.md`.
- [ ] **Decisiones pendientes de confirmación del usuario** (no bloquean Fases 2–6, sí bloquean Fase 7/8):
  - [ ] ¿Existe el concepto de "coordinador master"? ¿Cómo se identifica sin tocar RLS?
  - [ ] ¿Se agregan columnas `fecha_sugerida`/`hora_sugerida`/`extra`/`urgente`/`assigned_at` a `trabajos`?
  - [ ] ¿Se aprueba la función `seleccionar_instalador(trabajo_id, bid_id)`?
  - [ ] ¿Se aprueba el trigger de vínculo `usuarios.auth_id` ↔ `auth.users`?
- [ ] Rotar `service_role` key en Supabase Dashboard (acción del usuario).

## Fase 2 — Scaffold del proyecto (completada, con una salvedad)

- [x] `package.json` con React, Vite, TypeScript, Tailwind, shadcn/ui (config), React Router, TanStack Query, React Hook Form, Zod, `@hookform/resolvers`, Lucide React, Supabase JS Client, ESLint, Prettier.
- [x] `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` con alias `@/`.
- [x] `vite.config.ts` con alias `@/`.
- [x] `tailwind.config.ts` + `postcss.config.js` + `components.json` (shadcn).
- [x] `eslint.config.js` (flat config) + `.prettierrc.json` + `.prettierignore`.
- [x] `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` vacíos).
- [x] Estructura completa de `src/` según `ARCHITECTURE.md` §3.
- [x] Archivos base: `main.tsx`, `App.tsx`, `routes/AppRouter.tsx`, `contexts/AuthContext.tsx`, `supabase/client.ts`, `styles/globals.css`, `types/database.ts`, `types/domain.ts`, `types/enums.ts`, `lib/mappers.ts`, `constants/index.ts`.
- [x] `supabase/migrations/0001_initial_schema.sql` copiado sin modificar (verificado con `diff`).
- [ ] **Pendiente: ejecutar `npm install && npm run lint && npm run typecheck && npm run build && npm run dev` reales.** Bloqueado en esta sesión por política de red (`registry.npmjs.org` no está en el *allowlist* del entorno). Ver `PROJECT_STATUS.md` → "Problema encontrado — bloqueo de red" para el detalle y cómo desbloquearlo. Se hizo una validación estática best-effort (tsc/prettier ya presentes en el entorno) que no encontró errores de código, pero no reemplaza la validación real pedida.

## Fase 3 — Layout general / Navegación / Header / Sidebar / Componentes compartidos (no iniciada)

- [ ] Ejecutar `npm install` real (primera vez que corre de verdad) y confirmar que el scaffold de Fase 2 compila.
- [ ] `RootLayout.tsx` (mx-top: header, brand, badge de rol/sucursal).
- [ ] `CoordinatorLayout.tsx`, `AdminLayout.tsx`, `InstallerLayout.tsx` (subtabs / phone frame / phonetabs).
- [ ] Componentes compartidos: `Pill`, `StatTile`, `CountRing`, `LiveCountdown`, `ConfirmDialog`, `PhoneFrame`.
- [ ] Mapeo de íconos `mkIcon`/`ICONS` → `lucide-react` (ver `ARCHITECTURE.md` §7.2).
- [ ] Migración de las clases `mx-*` restantes del prototipo a `globals.css`/Tailwind.
- [ ] Primeros componentes `ui/` de shadcn instalados vía `npx shadcn add ...` (button, dialog, input, select, badge).

## Fase 4 — Módulo Coordinator (no iniciada)

- [ ] `DespachoPage` (QueueBar, JobCard, RadarPanel, JobStatsGrid, ResponsesFeed, AssignedPanel, NoResponsePanel) con datos mock locales.
- [ ] `PublishModal` con React Hook Form + Zod.
- [ ] `TrabajosPage` / `TrabajoDetailPage` (historial, filtro, timeline) con datos mock locales.
- [ ] `MasterCalendar` (grid, dots, leyenda) con datos mock locales.

## Fase 5 — Módulo Installer (no iniciada)

- [ ] `SolicitudesPage` (AlertScreen, OfferForm, DisponibilidadChips, ResponseSentScreen, AssignedScreen, LostScreen, DeclinedScreen, ClosedScreen) con datos mock locales.
- [ ] `MisTrabajosPage` con datos mock locales.
- [ ] `PerfilPage` con datos mock locales.

## Fase 6 — Módulo Admin (no iniciada)

- [ ] `InstaladoresPage` (tabla + suspender/reactivar + formulario de invitación) con datos mock locales.
- [ ] Reutilización de `MasterCalendar` en la ruta de Admin.

## Fase 7 — Integración completa con Supabase (no iniciada)

- [ ] Resolver decisiones pendientes de Fase 1 antes de empezar (coordinador master, columnas faltantes, RPC `seleccionar_instalador`, trigger `auth_id`).
- [ ] Auth real (magic link, roles, `AuthContext` conectado, rutas protegidas).
- [ ] Servicios (`trabajos.service.ts`, `bids.service.ts`, `usuarios.service.ts`, etc.) reemplazando los datos mock de las Fases 4–6.
- [ ] Eliminar el selector manual de rol y el selector manual de instalador del prototipo.

## Fase 8 — Realtime (no iniciada)

- [ ] Realtime de `bids` por trabajo (reemplaza `stepJobEngine`/`SCRIPT`).
- [ ] Presence/Broadcast para estados de radar `opened`/`responding` (ver `ARCHITECTURE.md` §9.3).
- [ ] Realtime de `trabajos` para instaladores (respeta RLS automáticamente).

## Fase 9 — Eliminación de datos mock (no iniciada)

- [ ] Confirmar que no queda ningún `INSTALLERS`, `TRABAJOS`, `MISJOBS`, `REVEAL`, `SCRIPT` ni mock local en el código.
- [ ] Confirmar que todas las pantallas leen exclusivamente de Supabase.

## Fase 10 — Pruebas finales, optimización, documentación (no iniciada)

- [ ] `npm run lint && npm run typecheck && npm run build` limpios.
- [ ] Manejo de errores/loading states en todos los hooks.
- [ ] Decidir sobre los botones sin `onClick` heredados del prototipo (`NoResponsePanel`, `JobDetail`).
- [ ] Edge Function de notificaciones (Twilio) + registro en `notificaciones`.
- [ ] Despliegue del build estático.
- [ ] Actualización final de `ARCHITECTURE.md`/`PROJECT_STATUS.md`/`CHANGELOG.md`.
