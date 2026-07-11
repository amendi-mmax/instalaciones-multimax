# Sprint 3.8 - Migración de `CountRing` (anillo de countdown regresivo)

Rama: `feature/sprint-3-8-countdown` (creada desde la punta de `feature/sprint-3-7-radar`, que ya incluye Sprint 3.1 a 3.7 + sus cierres)
Estado: 🟡 En revisión — implementación y validación best-effort completas; falta que el usuario confirme localmente `npm install`/`npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` y valide visualmente en el navegador.

## Objetivo

Reconstruir únicamente el bloque `CountRing` (anillo SVG de countdown regresivo) de `Multimax_Despacho_v1.3.html`, idéntico al HTML, sin asumir nada, sin reutilizar componentes sin comprobar correspondencia real, sin mejoras/simplificaciones/arquitectura nueva, sin mover lógica, sin Supabase, y sin modificar ningún Sprint anterior.

## Fase de análisis (obligatoria, previa a la implementación)

Análisis realizado sobre el archivo oficial `Multimax_Despacho_v1.3.html` (3.557 líneas), única fuente de verdad. A continuación, las 20 preguntas del brief respondidas por inspección directa del script (no por inferencia):

### 1. ¿Dónde inicia exactamente `CountRing`?

Línea 1437: `function CountRing({ remaining, total, size = 132, color = "#ffb23e" }) {`

### 2. ¿Dónde termina?

Línea 1491 (`}` de cierre de la función), inmediatamente antes de `function Radar({...})` en la línea 1492. El componente ocupa **55 líneas** (1437-1491).

### 3. ¿Qué clases CSS utiliza?

**Ninguna.** `CountRing` no usa `className` en ningún punto de su cuerpo. Todo el estilo se resuelve con atributos de presentación SVG inline (`stroke`, `strokeWidth`, `strokeLinecap`, `strokeDasharray`, `strokeDashoffset`, `transform`, `fill`, `fontFamily`, `fontSize`, `fontWeight`, `letterSpacing`, `textAnchor`) y un objeto `style` puntual (`{ display: "block" }` en el `<svg>`, `{ transition: "stroke-dashoffset .25s linear, stroke .3s" }` en el círculo de progreso). No hay ninguna regla `.mx-*` que migrar a `globals.css` para este componente — a diferencia de `Radar` (Sprint 3.7), que sí tenía 5 selectores CSS propios.

### 4. ¿Qué animaciones utiliza?

Ninguna animación CSS por `@keyframes`/clase (no hay equivalente a `.mx-sweep`/`.mx-ping`/`.mx-blink` aquí). El único efecto de movimiento es la transición inline `transition: "stroke-dashoffset .25s linear, stroke .3s"` sobre el círculo de progreso — una transición CSS-in-JS estándar de React, no una animación por keyframes.

### 5. ¿Qué props recibe?

Cuatro props, todas desestructuradas directamente del parámetro de la función:

| Prop | Tipo | Default | Uso |
| --- | --- | --- | --- |
| `remaining` | número (segundos restantes) | — (obligatoria) | determina `pct`, el color de alerta y el texto central |
| `total` | número (segundos totales de la ronda) | — (obligatoria) | denominador de `pct` |
| `size` | número (diámetro en px) | `132` | tamaño del `<svg>` y radio del anillo |
| `color` | string (color CSS) | `"#ffb23e"` | color del arco de progreso cuando `remaining > 5` |

### 6. ¿Qué funciones auxiliares utiliza?

Una sola: **`fmt`** (línea 878: `const fmt = s => { s = Math.max(0, Math.floor(s)); return \`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}\`; };`) — formatea segundos a `m:ss`, usada en la línea 1482 para el texto central (`fmt(remaining)`). **Importante**: en el Sprint 3.7 se agregó y luego se retiró `fmt` de `src/lib/utils.ts` tras confirmar que `Radar` no la usa. `CountRing` sí la usa genuinamente — se vuelve a agregar en este Sprint, verbatim, sin reintroducir el error del Sprint 3.7 (aquí sí está confirmado el uso real, línea 1482).

### 7. ¿Qué constantes utiliza?

Ninguna constante global/compartida (no usa `INSTALLERS`, `ELIGIBLE_ORDER`, `CONF`, `SUCURSALES`, etc.). Todos los valores derivados (`r`, `circ`, `pct`, `col`) son constantes **locales** calculadas dentro del propio cuerpo de la función a partir de las props.

### 8. ¿Depende de `Coordinator`?

**No.** `CountRing` no se invoca ni una sola vez dentro de `function Coordinator(props)` (líneas 2132-2423). Sus dos únicas invocaciones reales en todo el script (líneas 3276 y 3317) están dentro de `function Installer(props)` (líneas 3169-3453) — el rol Instalador, no Coordinador.

### 9. ¿Depende de `JobCard`?

**No.** No existe ninguna función `JobCard` en el script (el propio Sprint 3.6 ya confirmó que el bloque real es `mx-jobcard`, sin componente propio, dentro de `Coordinator`). `CountRing` no tiene relación con `mx-jobcard` en ningún punto del archivo.

### 10. ¿Depende de `Radar`?

**No.** Son vecinos textuales en el archivo fuente (`CountRing` termina en la línea 1491, `Radar` empieza en la 1492) pero no hay ninguna referencia cruzada entre ambos — ni `Radar` invoca `CountRing` ni viceversa. Confirmado también en el Sprint 3.7 al excluir `CountRing` de su alcance.

### 11. ¿Depende de `Timeline`?

**No.** No existe ninguna función `Timeline` en el script todavía (es un nombre genérico de `docs/SPRINTS_INDEX.md`, Sprint 3.9, sin analizar todavía). `CountRing` no hace referencia a nada llamado "Timeline".

### 12. ¿Puede existir como componente independiente?

**Sí.** `CountRing` es una función pura sin `useState`/`useEffect`/contexto: solo consume las 4 props (`remaining`, `total`, `size`, `color`) y devuelve JSX derivado. No requiere ningún estado global, contexto de rol, ni datos de `jobs`/`Trabajo`. Es el candidato más autocontenido de los analizados hasta ahora (incluso más que `Radar`, que sí necesitaba el mock `INSTALLERS`).

### 13. ¿Tiene CSS no migrado?

No aplica — ver pregunta 3: cero clases CSS, nada que migrar a `globals.css`.

### 14. ¿Tiene utilidades no migradas?

Sí: `fmt` (línea 878) no existe actualmente en `src/lib/utils.ts` (se retiró en el Sprint 3.7 tras confirmar que `Radar` no la necesitaba). Se debe volver a agregar en este Sprint, verbatim, ya que `CountRing` sí la usa genuinamente (línea 1482).

### 15. ¿Tiene iconos propios?

No. `CountRing` no importa ni renderiza ningún ícono de `lucide-react` (ni de ninguna otra librería) dentro de su propio cuerpo.

### 16. ¿Tiene estados internos?

No. Cero `useState`. Es 100% derivado de props en cada render (`r`, `circ`, `pct`, `col` se recalculan en cada llamada, sin memoria propia).

### 17. ¿Tiene efectos?

No. Cero `useEffect`. No suscribe ni desuscribe nada, no tiene ciclo de vida propio.

### 18. ¿Tiene timers?

No, **no dentro del propio componente**. `CountRing` no llama a `setInterval`/`setTimeout`. El valor `remaining` que recibe como prop ya viene calculado desde afuera. En el HTML fuente, sus dos consumidores reales (dentro de `Installer(props)`, líneas 3169-3453) obtienen `roundRemaining` de `v.roundRemaining` (línea 3181), que a su vez proviene de `jobView(job, sortBy)` (línea 1853, específicamente `roundRemaining` en la línea 1868: `job.phase === "live" ? Math.max(0, bidSecs - elapsed) : 0`), función que depende de `now()`, `CONF.speed`, `CONF.maxSecs` y del re-render periódico que produce `App()` — es decir, del motor de trabajos (`stepJobEngine`/`jobs`) completo, no portado todavía (mismo bloqueo estructural que encontraron los Sprints 3.6 y 3.7). El componente **hermano** `LiveCountdown` (línea 2473, distinto de `CountRing`, con su propio `useState`/`useEffect`/`setInterval` interno) sí tiene timer propio, pero **no es el mismo componente** y se usa dentro de `Coordinator` (línea 2172, para `mx-jobcard`/QueueBar) — ver "Hallazgo adicional" abajo.

### 19. ¿Tiene cálculos?

Sí, varios, todos verbatim del HTML:

- `r = size / 2 - 9` (radio del anillo, con margen para el trazo).
- `circ = 2 * Math.PI * r` (circunferencia total).
- `pct = total > 0 ? clamp(remaining / total, 0, 1) : 0` (porcentaje restante).
- `col = remaining <= 5 ? "#ff5c7a" : color` (color de alerta cuando quedan ≤5s).
- `strokeDashoffset = circ * (1 - pct)` (desplazamiento del trazo para representar el porcentaje).
- Texto central vía `fmt(remaining)`.

### 20. ¿Tiene dependencias externas?

No. Solo React (`React.createElement`, sin JSX en el HTML fuente pero equivalente a JSX en el port). Ningún ícono, ninguna librería de mapas/gráficos, ninguna llamada a API/Supabase.

## Hallazgo adicional (reportado, no asumido): `LiveCountdown` es un componente distinto y real

Durante el análisis se encontró que el script tiene **dos** componentes de "countdown" con nombres reales, no uno solo:

1. **`CountRing`** (línea 1437-1491) — anillo SVG, sin estado propio, usado en `Installer(props)` (rol Instalador, pantalla de alerta/oferta de un trabajo).
2. **`LiveCountdown`** (línea 2473-2493) — `<span>` de texto con color dinámico, **con `useState`/`useEffect`/`setInterval` propios**, usado en `Coordinator(props)` (línea 2172, dentro del renglón `mx-jobcard`/QueueBar que todavía no existe — depende de `jobs.length > 0`, fuera de alcance desde el Sprint 3.6).

El nombre de este Sprint en `docs/SPRINTS_INDEX.md` es genérico ("Countdown") y el brief de esta ronda nombra explícitamente `CountRing` en las 20 preguntas del análisis obligatorio — por lo tanto, **este Sprint 3.8 reconstruye únicamente `CountRing`**. `LiveCountdown` se deja fuera de alcance, documentado aquí para que no se pierda: es candidato natural para el Sprint que reconstruya `mx-jobcard`/QueueBar dentro de `Coordinator` (Fase 4, sin Sprint numerado todavía en `docs/SPRINTS_INDEX.md`). No se construye en este Sprint para no inventar alcance no pedido explícitamente.

## Componente a crear

`CountRing` — nuevo, en `src/components/shared/countring.tsx` (mismo directorio y convención que `radar.tsx`/`coordinator-empty-state.tsx`), sin sub-componentes, sin reutilización de componentes existentes (no hay ningún componente de Fase 3 que corresponda a un anillo de progreso SVG con texto central — se comprobó que no existe antes de decidir crear uno nuevo).

## Utilidad a reincorporar

`fmt` en `src/lib/utils.ts`, verbatim de la línea 878-881 del HTML, con JSDoc que explique por qué se retiró en el Sprint 3.7 y por qué se reincorpora ahora con una consumidora real confirmada (`CountRing`).

## CSS a migrar

Ninguno. Cero selectores `.mx-*` nuevos en `globals.css` para este Sprint — ver pregunta 3.

## Aprobación del análisis y autorización de integración temporal

El usuario aprobó este análisis y autorizó explícitamente la integración temporal de `CountRing` en `RootLayout.tsx`, únicamente para validación visual, siguiendo la misma metodología ya usada en los Sprints 3.5/3.6/3.7, con las condiciones: no modificar ningún componente ya aprobado (`Header`, `Sidebar`/`InstallerSidebar`, `PublishModal`, `CoordinatorEmptyState`, `Radar`), no modificar Router, no crear rutas nuevas, no integrar Supabase, no implementar lógica del Installer, no implementar `LiveCountdown`, y no avanzar al Sprint 3.9.

## Problema encontrado / decisión de integración temporal (reportado, aprobado explícitamente por el usuario)

`CountRing` no tiene todavía ningún consumidor real disponible en el proyecto: sus dos únicos usos en el HTML (líneas 3276 y 3317) están dentro de las pantallas "alerta de nueva solicitud" y "tu propuesta" del teléfono del Instalador (`Installer(props)`, pasos `step === "alert"`/`else` dentro de `mx-phone`), que **no existen todavía** en el proyecto — Sprint 3.2 solo migró `mx-instside` (el panel lateral), no `mx-phone`/`mx-alert`/`mx-offer` (el propio `RootLayout.tsx` documenta un "Phone Placeholder reservado" en lugar del teléfono real). Tampoco existe todavía el motor de trabajos (`jobs`/`stepJobEngine`/`jobView`) que alimentaría `remaining`/`total` con datos reales.

Por instrucción explícita del brief de este Sprint ("Si el componente no posee todavía consumidor real: detenerse, explicar por qué, proponer integración temporal, esperar aprobación. NO integrar sin autorización."), me detuve antes de tocar `RootLayout.tsx` o cualquier otro archivo de integración, y presenté la propuesta de integración temporal al usuario.

El usuario aprobó explícitamente esta propuesta (ver sección anterior). Se aplicó, siguiendo el mismo patrón ya usado y aprobado en Sprints 3.2.1/3.3-fix/3.4/3.5/3.6/3.7: `CountRing` se integró temporalmente en `src/layouts/RootLayout.tsx`, con props mock estáticas (`COUNTRING_DEMO_REMAINING = 172`, `COUNTRING_DEMO_TOTAL = 300` — sin timer propio, ya que el timer real pertenece al motor de trabajos, fuera de alcance), únicamente para permitir su validación visual. Sin rutas nuevas, sin cambios a React Router, sin lógica de negocio, documentado como integración temporal en el propio archivo.

A diferencia de `Radar`/`CoordinatorEmptyState` (que pertenecen a `role === 'coordinador'`), `CountRing` se montó dentro de `role === 'instalador'` — su rol real según el HTML fuente (`Installer(props)`) — como hermano de `.mx-instwrap`, no dentro de ese grid (no forma parte de `mx-instside`/`InstallerSidebar`, que no se modificó).

## Archivos creados

- `src/components/shared/countring.tsx` (`CountRing`, 88 líneas) — componente nuevo, sin sub-componentes.

## Archivos modificados

- `src/lib/utils.ts` — se reincorpora `fmt` (retirada en el Sprint 3.7), verbatim de la línea 878-881 del HTML, con JSDoc explicando el historial.
- `src/layouts/RootLayout.tsx` — import de `CountRing`, constantes mock `COUNTRING_DEMO_REMAINING`/`COUNTRING_DEMO_TOTAL`, nuevo bloque JSDoc "TEMPORARY INTEGRATION — Sprint 3.8", y la integración temporal dentro de `role === 'instalador'`.

## Archivos eliminados

Ninguno.

## Resultado visual

Un anillo SVG de countdown (132px de diámetro por defecto): dos círculos concéntricos (uno de fondo, tenue, y uno de progreso con `strokeDasharray`/`strokeDashoffset` que representa el porcentaje `remaining/total`), texto central en `Space Mono` con el tiempo restante formateado `m:ss` (`2:52` con los valores mock actuales) y la etiqueta "RESTANTE" debajo, en `Inter`. Visible en la app cuando `role === 'instalador'`, debajo del panel lateral (`InstallerSidebar`)/Phone Placeholder.

## Capturas sugeridas

1. Vista con `role === 'instalador'`: panel lateral (`InstallerSidebar`) + Phone Placeholder vacío + `CountRing` debajo, con los valores mock (`2:52` de `5:00`).
2. Zoom del anillo `CountRing` solo, para comparar proporciones/colores con el HTML de referencia.

## Validaciones ejecutadas

Best-effort en este entorno (sandbox sin acceso a `npm install`/registry):

- `tsc -p /tmp/ts-stub-check/tsconfig.check.json --noEmit` (stubs ambientales que colapsan React/lucide a `any`): 0 diagnósticos.
- `prettier --no-config --check --single-quote --semi --trailing-comma all --print-width 100 "src/**/*.{ts,tsx}"`: cero diferencias, sin necesidad de `--write` (el archivo nuevo ya siguió el estilo).
- `git diff --stat`: confirma que solo cambiaron los 3 archivos esperados (`countring.tsx` nuevo, `utils.ts` y `RootLayout.tsx` modificados) — sin tocar `Header`, `Sidebar`/`InstallerSidebar`, `PublishModal`, `CoordinatorEmptyState`, `Radar`, ni ningún archivo de routing.
- Pendiente (real, no best-effort): que el usuario confirme en su máquina `npm install`/`npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev`, y la validación visual en el navegador.

## Decisiones tomadas

1. Se reconstruyó únicamente `CountRing`, no `LiveCountdown` — el brief nombra explícitamente "CountRing" en las 20 preguntas del análisis obligatorio; `LiveCountdown` es un componente real distinto, documentado como hallazgo pero fuera de alcance de este Sprint.
2. Se reincorporó `fmt` a `src/lib/utils.ts` (retirada por error en el Sprint 3.7) porque esta vez la consumidora real (`CountRing`, línea 1482 del HTML) está confirmada por lectura directa del código fuente, no asumida.
3. No se reutilizó ningún componente existente de `ui/`/`shared/` — se comprobó que ninguno corresponde a un anillo de progreso SVG antes de decidir crear `CountRing` desde cero.
4. La integración temporal se ubicó dentro de `role === 'instalador'` (no `'coordinador'`), respetando el rol real que el HTML fuente le asigna a los dos usos de `CountRing` (dentro de `Installer(props)`), a diferencia de `Radar`/`CoordinatorEmptyState`.
5. Cero CSS nuevo en `globals.css` — `CountRing` no usa ninguna clase `.mx-*` en el HTML fuente (todo es inline).

## Riesgos

- Los valores mock (`remaining=172`, `total=300`) son estáticos — no hay timer, así que el anillo no se "mueve" en la demo temporal. Esto es intencional y está documentado: el timer real pertenece al motor de trabajos (`jobView`), fuera de alcance de este Sprint.
- Cuando exista el Sprint que implemente el flujo del Instalador (`mx-phone`/`mx-alert`/`mx-offer`), habrá que retirar esta integración temporal y recolocar `CountRing` dentro de esas pantallas reales, con `remaining`/`total` derivados del `job` activo — ya documentado como pendiente.

## Porcentaje del HTML reconstruido (este Sprint)

55 líneas de JSX fuente (`CountRing`, líneas 1437-1491), 0 selectores CSS nuevos, 1 utilidad reincorporada (`fmt`, 4 líneas de lógica fuente). Bloque más pequeño que `Radar` (Sprint 3.7, 254 líneas) pero más autocontenido (ninguna dependencia de datos mock nuevos como `INSTALLERS`).

## Confirmación de alcance respetado

- ✔ No se modificó `Header`, `mx-instside`/`InstallerSidebar` (el componente en sí, solo se le agregó un hermano temporal), `mx-subtabs`/`MxSubtabs`/`MxSubtabButton`, `mx-suc-sel`/`SucursalSelect`, `PublishModal`, `CoordinatorEmptyState`, `Radar`, `Footer` ni `AppRouter.tsx` — verificado con `git diff`.
- ✔ No se creó ninguna ruta nueva ni se modificó React Router.
- ✔ No se implementó `LiveCountdown`.
- ✔ No se implementó ninguna lógica real del flujo del Instalador (`mx-phone`/`mx-alert`/`mx-offer`) — solo se montó `CountRing` con props mock estáticas.
- ✔ No se integró Supabase.
- ✔ No se avanzó al Sprint 3.9, no se analizaron bloques posteriores.

## Pendientes

- El consumidor real de `CountRing` (pantallas "alerta"/"oferta" del teléfono del Instalador) queda pendiente de un Sprint futuro que implemente `mx-phone`/`Installer` real.
- `LiveCountdown` queda pendiente, sin Sprint numerado todavía — candidato natural para el Sprint que reconstruya `mx-jobcard`/QueueBar dentro de `Coordinator`.
- Retirar la integración temporal de `RootLayout.tsx` cuando exista ese flujo real del Instalador.
- Pendientes heredados sin resolver (no bloquean este Sprint): unificación `INSTALLERS`/`types/domain.ts` (Sprint 3.2), desincronización `SucursalSelect`↔`HeaderStatus.sucursalActiva` (Sprint 3.4), `onPublish` sin lógica real (Sprint 3.5), resto de `Coordinator()` (`mx-jobcard`, QueueBar, `AssignedPanel`, `NoResponsePanel`, respuestas) (Sprint 3.6/3.7).

## Próximo Sprint

**Sprint 3.8 queda detenido en 🟡 En revisión**, a la espera de que el usuario confirme localmente las 4 validaciones reales (`npm install`/`lint`/`typecheck`/`build`/`dev`) y la validación visual en el navegador. No se marca `✅ Completado` hasta esa doble confirmación. No se inicia el Sprint 3.9 sin aprobación explícita del usuario.
