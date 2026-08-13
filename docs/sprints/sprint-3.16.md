# Sprint 3.16 - Migración de "Shared Components" → `AssignedPanel` + `NoResponsePanel`

Rama: `feature/sprint-3-16-shared-components`
Estado: 🟡 En revisión — pendiente de validación real (npm run lint/typecheck/build/dev), validación visual y aprobación explícita del usuario.

## Objetivo

Reconstruir exclusivamente el/los bloque(s) real(es) correspondientes a "Shared Components" de `Multimax_Despacho_v1.3.html`, sin rediseñar, reinterpretar, modernizar ni mejorar UX. Sin mounts temporales, sin rutas/páginas de demostración/showcases — este Sprint cierra la etapa de reconstrucción visual: los componentes quedan exportados y documentados, listos para su integración futura dentro del módulo Coordinator.

## Análisis obligatorio (previo a la implementación)

### 1. Determinación del bloque real

"Shared Components" (nombre de `docs/SPRINTS_INDEX.md`) es un nombre genérico plural — no corresponde a ninguna función única del script. Se inspeccionó el listado completo de funciones del script (`grep -n "^function "`, ya usado en Sprints anteriores) y se identificaron los últimos bloques reales pendientes de reconstrucción que **no** dependen del motor de trabajos para su propia definición (a diferencia de `CoordinatorJobs`/`JobDetail`, pantallas completas que sí lo requieren):

- `function AssignedPanel({ inst, offer, completed })` (líneas 2424-2452) — panel "trabajo asignado/completado" con los datos revelados del cliente.
- `function NoResponsePanel()` (líneas 2453-2470) — panel de acciones sugeridas cuando el bid se agota sin respuestas.

Ambos son componentes **puros, presentacionales, sin `useState`/`useEffect` propios**, que reciben o no reciben props y no generan ningún dato: son exactamente el tipo de bloque "compartido" (reutilizable, sin lógica de negocio embebida) que el nombre "Shared Components" describe — plural, dos componentes, mismo criterio de corrección de nombre ya aplicado en Sprints anteriores (3.6, 3.9, 3.10, 3.13).

### 2. Corrección de nombre (obligatoria por el brief de este Sprint)

"Shared Components" **no** es el nombre de ninguna función real. Se corrige a `AssignedPanel` + `NoResponsePanel`, los dos bloques reales identificados en el punto 1. Trazabilidad: `docs/SPRINTS_INDEX.md` (actualizado únicamente tras la aprobación del usuario) documentará "Sprint 3.16 → `AssignedPanel`/`NoResponsePanel` (antes 'Shared Components')".

### 3. Selector HTML

- `AssignedPanel`: `.mx-card.mx-assigned` (vía `Card`) → `.mx-as-h` (ícono + título) + `.mx-as-name` (resumen instalador/precio/fecha) + `.mx-reveal` (`.mx-reveal-row` × 3: dirección, cliente, agenda).
- `NoResponsePanel`: `.mx-card.mx-noresp` (vía `Card`) → `.mx-nr-h` (ícono + título) + `.mx-nr-sub` (subtítulo) + `.mx-nr-acts` (grid de 5 botones).

### 4. Líneas del HTML

- `AssignedPanel()`: líneas 2424-2452 (29 líneas de JSX fuente).
- `NoResponsePanel()`: líneas 2453-2470 (18 líneas de JSX fuente).
- CSS asociado: líneas 128-143 del `<style>` original (`.mx-assigned`/`.mx-as-h`/`.mx-as-name`/`.mx-reveal`/`.mx-reveal-row` (+`svg`/`b`/`span`) / `.mx-noresp`/`.mx-nr-h`/`.mx-nr-sub`/`.mx-nr-acts` (+`button`/`button:hover`/`svg`)) + línea 265 (regla responsive `.mx-nr-acts{grid-template-columns:1fr}` dentro de `@media (max-width:560px)`).
- Datos mock asociados: `const REVEAL` (línea 1075) — no estaba migrado al proyecto todavía.

### 5. Componentes hijos

Ninguno en ninguno de los dos. Ambos son funciones hoja: solo `div`/`h3` (implícito vía `.mx-as-h`/`.mx-nr-h`, en realidad `div`)/`b`/`span`/`button` nativos + íconos de Lucide.

### 6. Componentes padres / consumidores

Un único consumidor real para ambos: `Coordinator(props)`, dentro de la columna derecha (`.mx-col`) de la tarjeta de trabajo activo (líneas 2355-2361):

```
assigned && React.createElement(AssignedPanel, {
  inst: INSTALLERS.find(i => i.id === job.assignedId),
  offer: assigned.offer,
  completed: isCompleted
}),
v.noResponse && React.createElement(NoResponsePanel, null),
```

Ese bloque (`mx-jobcard`, con `AssignedPanel`/`NoResponsePanel`/`ResponsesFeed` como hijos de `.mx-col`) depende de `jobs.length > 0` — el mismo bloqueo ya documentado repetidamente desde el Sprint 3.6 (`jobs` arranca en `[]`, sin ningún seed/mock en el HTML fuente, motor de trabajos real todavía no portado).

### 7. Hooks utilizados

Ninguno en ninguno de los dos — ambas son funciones puras de presentación.

### 8. Estados

Ninguno local. Todo el estado relevante (`assigned`, `v.noResponse`, `isCompleted`) vive en `Coordinator(props)` (derivado de `jobs`/`jobView`), fuera de alcance de este Sprint.

### 9. Callbacks / props

- `AssignedPanel`: `inst: InstallerMock | undefined`, `offer: { precio, dia, hora, comentario? } | null | undefined`, `completed: boolean`. Sin callbacks.
- `NoResponsePanel`: sin props.

### 10. Utilidades, constantes, arrays, interfaces

- `REVEAL` (línea 1075 del script) — dato mock fijo (dirección + cliente), agregado en este Sprint a `src/constants/index.ts` (`RevealMock`/`RevealCliente`).
- `acts` (línea 2454, array de tuplas `[Icono, etiqueta]` dentro de `NoResponsePanel`) — lista fija de acciones sugeridas, sin `onClick` en el HTML fuente. Se reconstruye como `ACCIONES` (array de objetos, mismo contenido/orden), a nivel de módulo dentro de `no-response-panel.tsx` — etiqueta de UI fija, no colección de datos de negocio, mismo criterio ya aplicado a `MESES`/`DOFW` (Sprint 3.14) y `GRUPOS` (Sprint 3.12).
- `AssignedPanelOffer` (interfaz nueva, local a `assigned-panel.tsx`) — reproduce el objeto literal `{ precio, dia, hora, comentario? }` del HTML fuente; no se reutiliza el `Bid` de `types/domain.ts` porque ese tipo ya está mapeado al esquema de Supabase (`fechaDisponible`/`horaDisponible`, con `id`/`trabajoId`/`instaladorId`/`estado` que no aplican aquí) — mismo criterio ya aplicado a `PublishForm` (Sprint 3.5) y a `TrabajoMock` vs. `Trabajo` (Sprint 3.14).

### 11. Iconos Lucide

- `AssignedPanel`: `CheckCircle2` (16, header), `MapPin` (13), `User` (13), `Calendar` (13) — en las 3 filas de `.mx-reveal-row`.
- `NoResponsePanel`: `AlertTriangle` (15, header), `Users`/`TrendingUp`/`User`/`MessageSquare`/`Megaphone` (13 cada uno, en los 5 botones de `.mx-nr-acts`).

### 12. Estilos CSS / clases `mx-`

`.mx-assigned`, `.mx-as-h`, `.mx-as-name`, `.mx-reveal` (+ `.mx-reveal-row`, `svg`/`b`/`span` descendientes), `.mx-noresp`, `.mx-nr-h`, `.mx-nr-sub`, `.mx-nr-acts` (+ `button`, `button:hover`, `svg` descendientes) — **9 selectores de clase de nivel superior nuevos**, verbatim de las líneas 128-143 del `<style>` original, más la regla responsive `.mx-nr-acts{grid-template-columns:1fr}` (línea 265) agregada dentro del media query `@media (max-width: 560px)` ya existente (portado desde Baseline). `.mx-revealc` (líneas 193-197, variante compacta usada dentro de `Installer()`/`AssignedScreen`) **no se porta** — pertenece a un bloque distinto (Installer, Fase 5), no usado por `AssignedPanel`/`NoResponsePanel`.

### 13. Dependencias

Ninguna dependencia nueva de terceros.

### 14. Eventos

Ninguno con `onClick` real en ninguno de los dos componentes — los 5 botones de `NoResponsePanel` son literales inertes en el HTML fuente (sin `onClick`), reproducidos igual (con `type="button"`, convención ya usada en `admin-instaladores.tsx`, sin efecto visual).

### 15. Integración con RootLayout / Admin / Coordinator / Installer

- **RootLayout**: **sin cambios en este Sprint** — regla nueva explícita: no se crean mounts temporales de demostración. `RootLayout.tsx` no se modifica.
- **Admin**: sin relación — ninguno de los dos componentes se usa dentro de `AdminPanel`/`AdminInstaladores`/`MasterCalendar`.
- **Coordinator**: único consumidor real (ver punto 6) — bloqueado por la ausencia del motor de trabajos; documentado como pendiente para el Sprint que construya `Coordinator`/`jobs`/`QueueBar` real.
- **Installer**: sin relación directa — `REVEAL` es compartido con la pantalla "Asignado" de `Installer()` (línea ~3233), pero `AssignedPanel`/`NoResponsePanel` en sí no se usan ahí.

### 16. Posibles reutilizaciones futuras / componentes compartidos

Ambos son candidatos directos de reutilización cuando se construya `Coordinator`/`mx-jobcard` real (Fase 4) — se importarán tal cual, sin cambios, pasando `inst`/`offer`/`completed` derivados de `jobs`/`INSTALLERS` reales. No se detectó ningún otro consumidor potencial en el resto del script.

### 17. Posibles riesgos de migración

- `REVEAL` es consumido también por la pantalla "Asignado" de `Installer()` en el HTML fuente (fuera de alcance) — se portó completo, no un subconjunto, mismo criterio ya aplicado a `ESTADO`/`SUSCOL`/`TRABAJOS` en Sprints anteriores.
- Ninguna decisión de tipado estricto adicional: a diferencia de `SUSCOL` (Sprint 3.14), aquí no hay ningún fallback defensivo que reproducir — `inst`/`offer` ya son opcionales en el HTML fuente (`inst &&`/`offer &&`) y se tipan como tales (`| undefined`/`| null | undefined`).

### 18. Diferencias encontradas

Ninguna respecto al contenido/estructura/CSS. Única adaptación no visual: `acts` (array de tuplas `[Icon, label]`) se reconstruye como `ACCIONES` (array de objetos `{ Icon, label }`) por legibilidad/tipado en TypeScript — mismo contenido, mismo orden, misma salida visual exacta (documentado en el JSDoc de `no-response-panel.tsx`).

### 19. Elementos fuera del alcance de este Sprint

- El motor de trabajos real de `Coordinator` (`jobs`/`jobView`/`assigned`/`v.noResponse`/`isCompleted` reales) — Fase 4, sin Sprint asignado.
- El resto de `Coordinator()` (`mx-jobcard`, `QueueBar`, `ResponsesFeed`, `mx-round`) — mismo bloqueo.
- `.mx-revealc` (variante compacta de `.mx-reveal`, usada en `Installer()`/`AssignedScreen`) — Fase 5, sin Sprint asignado.
- `CoordinatorJobs()`/`JobDetail()` — pantallas completas del módulo Coordinator, dependen igualmente del motor de trabajos, sin Sprint asignado.

### 20. Estrategia de integración

**Ninguna integración en esta ronda**, por instrucción explícita del brief de este Sprint ("cierre de la etapa de reconstrucción visual"): no se crean mounts temporales, no se modifica `RootLayout.tsx`, no se agregan rutas/páginas de demostración. Ambos componentes quedan exportados desde `src/components/shared/` (`assigned-panel.tsx`/`no-response-panel.tsx`), documentados con su punto de integración real futuro (`Coordinator`, Fase 4), listos para importarse sin cambios cuando ese Sprint exista.

## Implementación

### Componentes creados

- `AssignedPanel` (`src/components/shared/assigned-panel.tsx`) — reconstrucción verbatim: encabezado (ícono + "Trabajo asignado y confirmado"/"Trabajo completado" según `completed`), resumen de instalador/precio/fecha/hora, y 3 filas de datos revelados (dirección, cliente, agenda).
- `NoResponsePanel` (`src/components/shared/no-response-panel.tsx`) — reconstrucción verbatim: encabezado de alerta, subtítulo, grid de 5 botones de acciones sugeridas (inertes, sin `onClick`, igual que el HTML fuente).

### CSS portado

Bloque de 9 selectores (ver punto 12) agregado a `src/styles/globals.css`, justo después del bloque del Sprint 3.14 (`.mx-daylist-hd h3`) y antes de `.mx-instside`. Regla responsive `.mx-nr-acts{grid-template-columns:1fr}` agregada dentro del media query `@media (max-width: 560px)` ya existente. `.mx-revealc` (líneas 193-197 del HTML, pertenece a `Installer()`) documentado explícitamente como NO portado.

### Constantes agregadas

`REVEAL` (`RevealMock`/`RevealCliente`) en `src/constants/index.ts` — dato mock fijo, no generado dentro de ningún componente.

### Integración

Ninguna en esta ronda (ver punto 20). `RootLayout.tsx` no se modificó.

### Reutilización (sin duplicar)

`Card` (Fase 3, `.mx-card`, sin `CardHeader` — ambos bloques usan encabezados propios `.mx-as-h`/`.mx-nr-h`, no el patrón `.mx-section-h`), `InstallerMock` (`src/constants/index.ts`, ya existente) para el tipo de `inst`.

### Preparación para Supabase

Ambos componentes son completamente presentacionales: ningún array/objeto de negocio generado dentro del componente. `REVEAL` (nuevo) vive en `src/constants/index.ts`. `ACCIONES` (`no-response-panel.tsx`) es una etiqueta de UI fija, no un dato de negocio — mismo criterio ya aplicado a `MESES`/`DOFW`/`GRUPOS`.

### Validaciones

Bloqueadas en este sandbox por falta de acceso a red (`registry.npmjs.org`) — no es posible ejecutar `npm install`/`npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` reales en este entorno, igual que en todos los Sprints anteriores. Se ejecutó validación best-effort equivalente:

- `tsc -p /tmp/ts-stub-check/tsconfig.check.json --noEmit` → sin errores.
- `tsc -p /tmp/ts-stub-check/tsconfig.strict-check.json --noEmit` (con `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch`, espejo de `tsconfig.app.json`) → sin errores.
- `prettier --check` (single-quote/semi/trailing-comma all/print-width 100) sobre `assigned-panel.tsx`, `no-response-panel.tsx`, `constants/index.ts`, `globals.css` → sin diferencias de formato.
- `git status --porcelain -- src/` → confirma que únicamente se tocaron los archivos de este Sprint (`assigned-panel.tsx`, `no-response-panel.tsx`, `constants/index.ts`, `globals.css`); `RootLayout.tsx` no aparece modificado por esta ronda (su estado "M" preexistente corresponde al Sprint 3.15).

La validación real (`npm run lint/typecheck/build/dev`) queda pendiente y se difiere a la máquina del usuario, igual que en todos los Sprints anteriores.

### Cobertura HTML

`AssignedPanel` (líneas 2424-2452) + `NoResponsePanel` (líneas 2453-2470): 100% del JSX reconstruido. CSS asociado (líneas 128-143 y 265): 100%. Consumidor real (`Coordinator`, líneas 2357-2361): documentado, fuera de alcance (depende del motor de trabajos, Fase 4).

### Pendientes fuera de alcance (reportados, no implementados)

- Motor de trabajos real de `Coordinator` — Fase 4, sin Sprint asignado.
- Integración real de `AssignedPanel`/`NoResponsePanel` dentro de la tarjeta de trabajo activo de `Coordinator`, cuando ese Sprint exista.
- `.mx-revealc`/`AssignedScreen` del módulo Installer — Fase 5, sin Sprint asignado.

### Estado al cierre de esta ronda

Implementación completa de `AssignedPanel` y `NoResponsePanel`, con `REVEAL` agregado a `src/constants/index.ts` y el bloque CSS correspondiente portado a `globals.css`. Sin ninguna integración/mount en `RootLayout.tsx`, por instrucción explícita de este Sprint. Validaciones best-effort (tsc básico + estricto, prettier) sin errores. Pendiente: validación técnica real, visual y funcional del usuario (esta última limitada a inspección de código/estructura, ya que los componentes no están montados en ninguna pantalla visible todavía — comportamiento esperado y documentado, no un defecto). `docs/SPRINTS_INDEX.md`, `PROJECT_STATUS.md`, `TODO.md`, `CHANGELOG.md` y `MIGRATION_STATUS.md` **NO** se actualizan en esta ronda, según instrucción explícita del brief — se actualizarán únicamente después de la aprobación del Sprint.
