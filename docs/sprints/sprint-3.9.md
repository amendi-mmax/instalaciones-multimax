# Sprint 3.9 - Migración de `LiveCountdown` (contador en tiempo real de la cola de trabajos)

Rama: `feature/sprint-3-9-live-countdown` (trabajo realizado sobre el checkout actual del sandbox; la creación real de la rama y el commit quedan a cargo del usuario, según la política permanente vigente desde el cierre del Sprint 3.8)
Estado: 🟡 En revisión — implementación y validación best-effort completas; falta que el usuario confirme localmente `npm install`/`npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev` y valide visualmente y funcionalmente en el navegador (timer en vivo).

## Objetivo

Reconstruir únicamente el componente `LiveCountdown` de `Multimax_Despacho_v1.3.html`, idéntico al HTML en estructura, estilos y comportamiento del temporizador, sin reinterpretar ni rediseñar nada.

## Fase de análisis (obligatoria, previa a la implementación)

Análisis realizado sobre el archivo oficial `Multimax_Despacho_v1.3.html` (3.557 líneas), única fuente de verdad.

### 1. Localización exacta

- **Inicio**: línea 2473 — `function LiveCountdown({ publishedAt, bidMins }) {`, precedida por el comentario `/* ===== Contador en tiempo real para trabajos en cola ===== */` (línea 2472).
- **Fin**: línea 2493 (`}` de cierre), inmediatamente antes de `function PublishModal({...})` (línea 2496, Sprint 3.5).
- El componente ocupa **21 líneas** (2473-2493).

### 2. Análisis completo del cuerpo de la función

```js
function LiveCountdown({ publishedAt, bidMins }) {
  const total = bidMins * 60;
  const calc = () => Math.max(0, total - Math.floor((Date.now() - publishedAt) / 1000));
  const [rem, setRem] = useState(calc);
  useEffect(() => {
    const iv = setInterval(() => setRem(calc()), 1000);
    return () => clearInterval(iv);
  }, [publishedAt, total]);
  const col = rem <= 30 ? "var(--red)" : rem <= total * 0.4 ? "var(--amber)" : "var(--ice)";
  return React.createElement("span", {
    style: { fontFamily: "var(--fm)", fontWeight: 700, fontSize: 13, color: col }
  }, fmt(rem), " restante");
}
```

- **HTML/JSX**: un único `<span>`, sin envoltorio adicional, sin clases `.mx-*`. Contenido: `{fmt(rem)} restante` (texto plano, con un espacio literal antes de "restante", igual que el HTML fuente: dos hijos de `React.createElement` — `fmt(rem)` y `" restante"` — que en JSX equivalen a `{fmt(rem)} restante`).
- **JavaScript / lógica**:
  - `total = bidMins * 60` — duración total del bid en segundos.
  - `calc()` — calcula el tiempo restante: `total` menos los segundos transcurridos desde `publishedAt`, usando `Date.now()` **directamente** (no la utilidad `now()` del HTML fuente, línea 877, que sí usa `App()`/`jobView` para la simulación acelerada por `CONF.speed`). Es decir, `LiveCountdown` corre en **tiempo real de reloj de pared**, sin la aceleración de la simulación (`CONF.speed`) que sí aplica `jobView`/`stepJobEngine` al resto del motor de trabajos. Este es un detalle de comportamiento real del HTML, no una decisión de este Sprint — se reproduce tal cual.
  - `Math.max(0, ...)` — nunca negativo, se clampa en 0 cuando el bid ya venció.
  - `[rem, setRem] = useState(calc)` — inicialización perezosa de React (`calc` se ejecuta una sola vez al montar).
  - `useEffect(..., [publishedAt, total])` — arranca un `setInterval` de 1000ms que llama a `setRem(calc())` cada segundo; limpia el intervalo al desmontar o cuando cambian `publishedAt`/`total`.
  - `col` — color condicional: `rem <= 30` → rojo (`var(--red)`); si no, `rem <= total * 0.4` → ámbar (`var(--amber)`); si no, cian/hielo (`var(--ice)`).
- **CSS**: **ninguna clase `.mx-*`**. Todo el estilo es un objeto `style` inline que referencia 4 variables CSS globales ya existentes en `:root` desde Fase 3 (verificado en `src/styles/globals.css`, líneas 22-33): `--ice: #34e1e8`, `--amber: #ffb23e`, `--red: #ff5c7a`, `--fm: 'Space Mono', ui-monospace, monospace`. **Cero CSS nuevo para este Sprint** — mismo caso que `CountRing` (Sprint 3.8).
- **Funciones auxiliares**: `fmt` (línea 878 del HTML) — ya existe en `src/lib/utils.ts` desde el Sprint 3.8. Se reutiliza sin cambios, tal como pedía el brief ("reutilizar fmt si existe en el HTML").
- **Props**: `publishedAt` (number, timestamp en ms — `Date.now()` de cuando se publicó el trabajo) y `bidMins` (number, minutos del bid). Ambas obligatorias, sin valores por defecto en el HTML fuente.
- **Dependencias**: `useState`/`useEffect` de React; `setInterval`/`clearInterval` del navegador; `Date.now()`. Ninguna dependencia externa, ninguna librería de terceros.
- **Utilidades**: solo `fmt` (ver arriba). No usa `hashAngle`, `INSTALLERS`, `ELIGIBLE_ORDER` ni ninguna otra constante del proyecto.
- **Callbacks**: no recibe ningún callback como prop (no hay `onComplete`/`onExpire` ni similar en el HTML fuente — ver "Funcionalidad esperada" abajo, punto sobre "disparar callbacks").
- **Timers**: `setInterval(() => setRem(calc()), 1000)`, limpiado correctamente en el `return` del `useEffect` (`clearInterval(iv)`). Es el **único** componente de los migrados hasta ahora (`Radar`, `CountRing`) que tiene timer propio — `Radar`/`CountRing` son puros/derivados de props, sin `useEffect`.
- **Efectos**: un solo `useEffect`, con dependencias `[publishedAt, total]` — reinicia el intervalo si el trabajo activo cambia o si cambia la duración del bid.
- **Integración**: ver punto 4 abajo.

### 3. Determinación de inicio/fin/consumidores

- **Dónde comienza / termina**: ver punto 1.
- **Quién lo consume**: únicamente `function Coordinator(props)` (líneas 2132-2423), dentro de la función interna `statusPill(jb)` (líneas 2171-2192):
  ```js
  const statusPill = jb => {
    if (jb.phase === "live") return React.createElement(LiveCountdown, {
      publishedAt: jb.publishedAt,
      bidMins: jb.bidMins
    });
    ...
  };
  ```
  `statusPill(jb)` se invoca dentro de `QueueBar` (líneas 2193-2210, el bloque `.mx-qbar-outer`/`.mx-qbar`/`.mx-qjob`), una vez por cada `jb` en `jobs.map(...)` — es decir, `LiveCountdown` es el badge de estado de cada tarjeta de la cola (`mx-qjob`) cuando ese trabajo está en fase `"live"`.
- **Qué componentes utiliza `LiveCountdown`**: ninguno — solo el `<span>` nativo descrito arriba. Sin sub-componentes.
- **Qué componentes lo utilizan a él**: únicamente `Coordinator` (vía `statusPill`/`QueueBar`). Ningún otro componente del HTML fuente lo invoca — confirmado por búsqueda exhaustiva (`grep "LiveCountdown"` sobre el archivo completo: solo 2 resultados — la definición, línea 2473, y este único uso, línea 2172).

### 4. Relación con `CountRing` (Sprint 3.8) — hallazgo importante, reportado

El brief de este Sprint asume que `LiveCountdown` "renderiza `CountRing`" y pide reutilizarlo explícitamente ("Debe reutilizar el componente aprobado: CountRing... NO duplicar código"). **Esto no corresponde a lo que existe en el HTML fuente.** Verificado por lectura directa y repetida del cuerpo completo de `LiveCountdown` (líneas 2473-2493, transcrito íntegro en el punto 2): la función retorna exclusivamente un `<span>` de texto con color dinámico — **no invoca `CountRing` en ningún punto, ni contiene ningún elemento SVG**.

`CountRing` (Sprint 3.8) y `LiveCountdown` (este Sprint) son dos componentes de "countdown" completamente independientes en el HTML fuente, sin ninguna relación de composición entre sí:

| | `CountRing` (Sprint 3.8) | `LiveCountdown` (Sprint 3.9) |
| --- | --- | --- |
| Líneas HTML | 1437-1491 | 2473-2493 |
| Salida visual | Anillo SVG con texto central | `<span>` de texto plano coloreado |
| Estado propio | No (puro, derivado de props) | Sí (`useState` + `useEffect` + `setInterval`) |
| Consumidor real | `Installer(props)` (pantallas "alerta"/"oferta" del teléfono) | `Coordinator(props)` (`statusPill`/`QueueBar`, cola de trabajos) |
| Usa `fmt` | Sí | Sí |

Siguiendo la regla explícita del proyecto ("NO se permite reinterpretar... cada componente debe ser reconstruido exactamente como existe en el HTML original"), **no se fuerza a `LiveCountdown` a renderizar `CountRing`** — eso introduciría una salida visual que no existe en el prototipo. Se reconstruye `LiveCountdown` exactamente como aparece en el HTML: un `<span>` de texto, sin anillo SVG. La única reutilización real entre ambos Sprints es `fmt` (ya existente desde el Sprint 3.8), que sí se reutiliza sin duplicar.

### 5. Funcionalidad esperada — verificación punto por punto contra el HTML fuente

- ✔ "Iniciar la cuenta regresiva": sí, vía `useState(calc)` (valor inicial) + `useEffect` (arranque del intervalo).
- ✔ "Utilizar timer exactamente igual al HTML": `setInterval(..., 1000)`, verbatim.
- ✔ "Actualizar el tiempo restante": `setRem(calc())` cada segundo.
- ✖ "Renderizar CountRing": **no aplica** — el HTML fuente no lo hace (ver punto 4). Se reporta la discrepancia y se reconstruye el `<span>` real.
- ✔ "Reutilizar `fmt` si existe en el HTML": sí, ya existe desde el Sprint 3.8, se reutiliza sin cambios.
- ✔ "Detener el contador correctamente": `return () => clearInterval(iv)` dentro del `useEffect`.
- ✖ "Disparar callbacks cuando termine": **no existe en el HTML fuente**. `LiveCountdown` no recibe ningún prop de tipo función ni invoca ningún callback al llegar a 0 — simplemente sigue mostrando `"0:00 restante"` en rojo (`rem <= 30`, clampado en 0 por `Math.max(0, ...)`). No se inventa un callback que no existe en el HTML — se reporta esta discrepancia con el brief y se reconstruye el comportamiento real (sin callback de expiración).
- ✔ "Mantener exactamente el mismo comportamiento del HTML": logrado mediante transcripción verbatim de la lógica (con una única adaptación técnica no visual, ver punto 6).

### 6. Adaptación técnica (no visual, documentada) — `useCallback` para `calc`

El HTML fuente redefine `calc` en cada render como una función de flecha suelta, y el `useEffect` la usa dentro de su callback sin incluirla en el arreglo de dependencias (`[publishedAt, total]`) — comportamiento válido en JS puro, pero que el linter de este proyecto (`eslint-plugin-react-hooks`, regla `exhaustive-deps`, activa en `eslint.config.js`) marcaría como advertencia, ya que `calc` es una función "inestable" referenciada dentro del efecto sin estar en sus dependencias.

Para no introducir una advertencia nueva de ESLint (regla del proyecto: "sin nuevas advertencias de ESLint") sin cambiar el comportamiento, se envuelve `calc` en `useCallback(calc, [publishedAt, total])` — mismas dependencias exactas que el `useEffect` original — y el efecto depende de esa función memoizada en vez de recrearla implícitamente. El resultado funcional es idéntico: el intervalo se reinicia exactamente cuando `publishedAt` o `total` (derivado de `bidMins`) cambian, ni más ni menos veces que en el HTML fuente. No es una mejora de comportamiento — es una adaptación exigida por las reglas de calidad de este proyecto (mismo criterio que otras adaptaciones documentadas en `MIGRATION_STATUS.md` §6, p. ej. selectores descendientes → clases standalone, `data-state` vs `.on`).

## Componente a crear

`LiveCountdown` — nuevo, en `src/components/shared/live-countdown.tsx` (misma convención que `radar.tsx`/`countring.tsx`), sin sub-componentes.

## Componentes reutilizados

- `fmt` (`src/lib/utils.ts`, Sprint 3.8) — reutilizada sin cambios.
- `CountRing` **no se reutiliza** — ver punto 4 del análisis. Se deja documentado explícitamente para que no se asuma un error de omisión.

## CSS a migrar

Ninguno. `LiveCountdown` no usa ninguna clase `.mx-*`; las 4 variables CSS que consume (`--ice`/`--amber`/`--red`/`--fm`) ya existen en `:root` desde Fase 3 — verificado en `src/styles/globals.css` antes de implementar.

## Problema encontrado / decisión de integración temporal

`LiveCountdown` no tiene todavía consumidor real dentro del flujo de la aplicación: su único uso en el HTML fuente está dentro de `QueueBar`/`statusPill`, parte de `function Coordinator(props)` cuando `jobs.length > 0` — el mismo bloqueo estructural ya documentado desde el Sprint 3.6 (`jobs` arranca en `[]`, sin seed/mock en el HTML fuente, y el motor de trabajos `stepJobEngine`/`jobView` no está portado).

A partir de este Sprint rige la nueva regla permanente instruida por el usuario: la integración temporal en `RootLayout.tsx` ya no requiere pausar a esperar autorización puntual — se aplica directamente, documentada como temporal, siguiendo el mismo patrón ya usado y aprobado en los Sprints 3.7 y 3.8. Se implementa aquí sin detenerse a preguntar.

`LiveCountdown` se integra dentro de `role === 'coordinador'` (su rol real, igual que `Radar`/`CoordinatorEmptyState` — a diferencia de `CountRing`, que pertenece a `role === 'instalador'`), con props mock (`LIVECOUNTDOWN_DEMO_PUBLISHED_AT`, calculado como "hace 60 segundos" al montar, y `LIVECOUNTDOWN_DEMO_BID_MINS = 5`) que permiten ver el timer corriendo en vivo, decreciendo segundo a segundo y cambiando de color exactamente como en el HTML fuente.

## Archivos creados

- `src/components/shared/live-countdown.tsx` (`LiveCountdown`).
- `docs/sprints/sprint-3.9.md` (este archivo).

## Archivos modificados

- `src/lib/utils.ts` — se amplía el JSDoc de `fmt` para documentar su segundo consumidor real (`LiveCountdown`). Sin cambios de código, solo comentario.
- `src/layouts/RootLayout.tsx` — import de `LiveCountdown`, constantes mock, nuevo bloque JSDoc "TEMPORARY INTEGRATION — Sprint 3.9", y el montaje temporal dentro de `role === 'coordinador'`.

## Archivos eliminados

Ninguno.

## Resultado visual

Un `<span>` de texto en fuente monoespaciada (`Space Mono`), peso 700, tamaño 13px, con el tiempo restante formateado `m:ss` seguido de `" restante"`. Color dinámico: cian (`--ice`) cuando falta más del 40% del tiempo, ámbar (`--amber`) cuando queda entre 40% y 30 segundos, rojo (`--red`) cuando quedan 30 segundos o menos. En la integración temporal, decrece en vivo cada segundo, permitiendo validar visual y funcionalmente el timer real (no solo una captura estática).

## Capturas sugeridas

1. Estado inicial (recién montado): texto en cian/ámbar, ejemplo `4:00 restante`.
2. Tras esperar en el navegador hasta que falten ≤30s: texto en rojo, ejemplo `0:25 restante`.
3. Tiempo agotado: `0:00 restante` en rojo, valor clampado en 0 (no negativo).

## Validaciones ejecutadas

Best-effort en este entorno (sandbox sin acceso a `npm install`/registry):

- `tsc -p /tmp/ts-stub-check/tsconfig.check.json --noEmit`: **0 diagnósticos** — cero errores sobre `live-countdown.tsx`, `utils.ts` y `RootLayout.tsx`.
- `prettier --check` sobre `.ts`/`.tsx`: **cero diferencias** en todo `src/`, incluidos los 3 archivos tocados en este Sprint.
- `git diff --stat -- src/`: confirma el alcance exacto — `src/layouts/RootLayout.tsx` (modificado), `src/lib/utils.ts` (modificado, solo JSDoc), `src/components/shared/live-countdown.tsx` (nuevo). Ningún otro archivo de `src/` cambió.
- Pendiente (real, no best-effort): que el usuario confirme en su máquina `npm install`/`npm run lint`/`npm run typecheck`/`npm run build`/`npm run dev`, y la validación visual **y funcional** (timer corriendo en vivo, actualizándose cada segundo, cambiando de color en los umbrales correctos) en el navegador.

## Decisiones tomadas

1. Se reconstruyó `LiveCountdown` exactamente como existe en el HTML (`<span>` de texto con color dinámico), **sin** forzarlo a renderizar `CountRing` — el brief asumía esa relación, pero no corresponde al HTML fuente (ver punto 4 del análisis). Se reporta la discrepancia en vez de reinterpretar el componente.
2. No se implementó ningún callback de expiración ("disparar callbacks cuando termine") — el HTML fuente no lo tiene; se reporta esta segunda discrepancia con el brief en vez de inventar una prop/callback nueva.
3. Se reutiliza `fmt` (Sprint 3.8) sin duplicar código, tal como pedía el brief.
4. Se aplicó una única adaptación técnica no visual (`useCallback` para `calc`, ver punto 6) para cumplir la regla de "sin nuevas advertencias de ESLint" sin alterar el comportamiento del timer.
5. Integración temporal aplicada directamente (sin pausar a pedir autorización), por la nueva regla permanente de este Sprint, dentro de `role === 'coordinador'` — su rol real según el HTML fuente.
6. Cero CSS nuevo — las 4 variables (`--ice`/`--amber`/`--red`/`--fm`) ya existían desde Fase 3.

## Riesgos

- Los valores mock de la integración temporal (`publishedAt` = hace 60s, `bidMins` = 5) son fijos al montar el componente raíz — si el usuario recarga la página, el timer reinicia desde "4:00 restante" otra vez. Esto es intencional para la demo visual; no es el comportamiento real (en el HTML fuente, `publishedAt` viene de un `Trabajo` real y persiste mientras ese trabajo esté activo).
- Cuando exista el Sprint que implemente `jobs`/`QueueBar`/`mx-jobcard` real, `LiveCountdown` deberá recibir `publishedAt`/`bidMins` derivados del `job` activo real, no de estas constantes de demostración — ya documentado como pendiente.

## Porcentaje del HTML reconstruido (este Sprint)

21 líneas de JSX/lógica fuente (`LiveCountdown`, líneas 2473-2493), 0 selectores CSS nuevos (las 4 variables ya existían), 0 utilidades nuevas (`fmt` ya existía). Bloque más pequeño que `CountRing` (55 líneas, Sprint 3.8) pero con una particularidad nueva: es el primer componente migrado con timer/estado propio (`useState`+`useEffect`+`setInterval`).

## Confirmación de alcance respetado

- ✔ No se modificó `Header`, `Sidebar`/`InstallerSidebar`, `mx-subtabs`/`MxSubtabs`/`MxSubtabButton`, `mx-suc-sel`/`SucursalSelect`, `PublishModal`, `CoordinatorEmptyState`, `Radar`, `CountRing`, `Footer` ni `AppRouter.tsx` — verificado con `git diff` (solo inspección).
- ✔ No se creó ninguna ruta nueva ni se modificó React Router.
- ✔ No se implementó `JobCard`/`mx-jobcard`, `Coordinator` completo, ni ninguna pantalla nueva del Instalador.
- ✔ No se integró Supabase ni ninguna API.
- ✔ No se avanzó al Sprint 3.10 (ni se le llamó "4.0"; la numeración del proyecto es 3.x hasta el 3.16 según `docs/SPRINTS_INDEX.md`), no se analizaron bloques posteriores.

## Pendientes

- El consumidor real de `LiveCountdown` (`QueueBar`/`mx-qjob` dentro de `Coordinator`) queda pendiente de un Sprint futuro que implemente `jobs`/`Trabajo` real.
- Retirar la integración temporal de `RootLayout.tsx` cuando exista esa `QueueBar` real.
- Pendientes heredados sin resolver (no bloquean este Sprint): consumidor real de `CountRing` (Sprint 3.8), unificación `INSTALLERS`/`types/domain.ts` (Sprint 3.2), desincronización `SucursalSelect`↔`HeaderStatus.sucursalActiva` (Sprint 3.4), `onPublish` sin lógica real (Sprint 3.5), resto de `Coordinator()` (`mx-jobcard`, `AssignedPanel`, `NoResponsePanel`, respuestas) (Sprint 3.6/3.7).

## Próximo Sprint

**Sprint 3.9 queda detenido en 🟡 En revisión**, a la espera de que el usuario confirme localmente las 4 validaciones reales (`npm install`/`lint`/`typecheck`/`build`/`dev`) y la validación visual **y funcional** (timer en vivo) en el navegador. No se marca `✅ Completado` hasta esa doble confirmación. No se inicia ningún Sprint posterior sin aprobación explícita del usuario.
