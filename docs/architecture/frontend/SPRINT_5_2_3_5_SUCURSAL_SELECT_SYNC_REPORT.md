# Sprint 5.2.3.5 — Sincronización del selector de sucursal (`SucursalSelect`)

**Fecha**: 2026-07-27
**Rama**: el brief de esta ronda no especificó ninguna rama Git. No se creó ninguna — mismo patrón sin ramas Git nuevas ya vigente desde la Fase 4 (ver rondas anteriores de este mismo Sprint).
**Contexto de entrada**: la política RLS de `public.tiendas` (Sprint 5.2.3.4) ya fue aplicada y validada por el usuario — confirmado por Network que `GET /rest/v1/tiendas?id=eq.<tienda_id>` devuelve la fila real (`"nombre": "Multimax Paitilla"`), y que el badge superior del `Header` ya muestra correctamente ese nombre. El único síntoma restante reportado: el selector de sucursal.

---

## 1. Alcance de la auditoría (los 5 puntos pedidos)

### 1.1 Cómo se construyen las opciones (`<option>`)

`SucursalSelect` (`src/components/shared/sucursal-select.tsx`) es un `<select>`/`<option>` nativo de HTML — no un `<Select>`/`<SelectItem>` de un sistema de componentes (Radix u otro). Antes de esta ronda, las opciones se construían exclusivamente mapeando la constante `SUCURSALES` (`src/constants/index.ts`):

```tsx
{SUCURSALES.map((s) => (
  <option key={s} value={s} disabled={enabledValue !== undefined && s !== enabledValue}>
    {s}
  </option>
))}
```

### 1.2 Qué campo usan como `value` (`id` o `nombre`)

`nombre` (string) — nunca `id`. `SUCURSALES` es una lista literal de 9 **nombres** de sucursal, transcrita verbatim del HTML original (`Multimax_Despacho_v1.3.html`, línea 1116, Sprint 3.4): `'Tumba Muerto', 'Multiplaza', 'Albrook', 'Metromall', 'Los Andes', 'Westland', 'Costa Verde', 'Chiriquí', 'Paso Canoas'`. Cada `<option value={s}>` usa ese mismo string como `value` — consistente con que `sucursalDisplayValue`/`sucursalLockValue` (`CoordinatorLayout.tsx`) también son nombres (`tiendaNombre`), no ids (`tiendaId`). No hay ninguna mezcla `id`/`nombre` en este componente.

### 1.3 Qué valor recibe el `<Select>`

`value={sucursalDisplayValue}` (prop, pasado desde `CoordinatorLayout.tsx`) — para un Coordinador real, `sucursalDisplayValue = tiendaNombre ?? ''`, es decir, exactamente el nombre real ya resuelto por `OperationalContext` (confirmado por el usuario: "Multimax Paitilla").

### 1.4 — Causa raíz encontrada: el `value` NO coincidía con ninguna `<option>`

**Este es el hallazgo central de esta ronda.** `SUCURSALES` es, y sigue siendo, una lista **estática/legacy** de 9 nombres transcritos del prototipo HTML en el Sprint 3.4 — nunca fue reemplazada por datos reales de `tiendas`. Su propio JSDoc ya lo advertía desde entonces (`constants/index.ts`, línea 22-24): *"La lista real de sucursales vendrá de Supabase (tabla `sucursales`...) en una fase de integración futura — no se resuelve aquí."*

Ahora que la policy RLS de `tiendas` está corregida (Sprint 5.2.3.4) y `tiendaNombre` resuelve al nombre **real** de la tienda del Coordinador (`"Multimax Paitilla"`, una fila real de `public.tiendas`), ese nombre **no está entre los 9 nombres literales de `SUCURSALES`** — ninguna de las 9 opciones (`"Tumba Muerto"`, `"Multiplaza"`, `"Albrook"`, `"Metromall"`, `"Los Andes"`, `"Westland"`, `"Costa Verde"`, `"Chiriquí"`, `"Paso Canoas"`) es igual a `"Multimax Paitilla"`.

Consecuencia doble, confirmada leyendo la lógica ya existente antes de esta ronda:
- **Selección visual incorrecta**: un `<select value="Multimax Paitilla">` sin ninguna `<option value="Multimax Paitilla">` no puede reflejar esa selección — el elemento nativo no tiene ninguna opción real que mostrar como seleccionada.
- **Las 9 opciones quedaban deshabilitadas**: `disabled={enabledValue !== undefined && s !== enabledValue}` — como `enabledValue` (`sucursalLockValue = tiendaNombre = "Multimax Paitilla"`) tampoco coincide con ninguna de las 9, la condición es verdadera para las 9 → **las 9 quedaban `disabled`**, sin ninguna habilitada.

Esto explica exactamente el síntoma reportado: *"el badge ya muestra Multimax Paitilla, pero el selector no"*. No es un bug de sincronización de estado en el sentido de "el valor no se propaga" (`sucursalDisplayValue` sí llega correctamente, igual que al badge) — es un problema de **catálogo**: la lista de opciones renderizadas nunca incluyó el dato real.

### 1.5 — Para un Coordinador: carga de tiendas y selección automática

- **Selección automática**: antes de esta ronda, imposible — no había ninguna opción con ese valor. Corregido esta ronda (sección 2).
- **Carga de "todas las tiendas" para el listado**: con la corrección de esta ronda, el listado sigue mostrando las 9 sucursales legacy de `SUCURSALES` (necesarias para el caso Admin-superusuario, que las sigue usando) **más** la tienda real del Coordinador si no está ya entre ellas. **Esto NO es equivalente a cargar el catálogo completo y real de `public.tiendas` desde Supabase** — solo garantiza que la tienda del Coordinador conectado aparezca y quede seleccionada. Ver la limitación explícita en la sección 4.

---

## 2. Corrección implementada (único archivo modificado)

**Archivo**: `src/components/shared/sucursal-select.tsx` — el único de los 3 auditados que necesitó un cambio real.

```tsx
const options: readonly string[] =
  value && !(SUCURSALES as readonly string[]).includes(value) ? [...SUCURSALES, value] : SUCURSALES;
```

Y el `.map()` de renderizado pasa de iterar `SUCURSALES` a iterar `options`. Efecto: si `value` (el nombre real recibido por prop, mismo origen que ya usa el badge) no está entre las 9 opciones legacy, se agrega como una opción adicional al final de la lista — sin tocar `SUCURSALES` en sí (sigue intacta, sin cambios, para `PublishModal`/`MasterCalendar`, que la siguen usando sin modificación), sin ninguna llamada a `tiendasRepository`/Supabase desde este componente, y sin agregar ningún nombre hardcodeado (`"Multimax Paitilla"` no aparece en ningún lugar del código — el valor sigue viniendo, en todos los casos, de la prop `value`).

**Por qué esto resuelve los 5 puntos auditados**:
- El `value` del `<select>` ahora SIEMPRE coincide con exactamente una `<option>` (la agregada, si la tienda real no estaba en la lista legacy) — resuelve el punto 4.
- Para un Coordinador real, esa opción agregada es también la única que coincide con `enabledValue` → queda habilitada; las 9 legacy, al no coincidir, quedan deshabilitadas — resuelve "las no autorizadas permanecen deshabilitadas" (punto 5).
- Como el `<select>` ahora tiene una `<option>` real con ese valor, y es la única habilitada, queda seleccionada automáticamente al cargar la pantalla (mismo mecanismo nativo de HTML: `<select value=X>` con una `<option value=X>` presente la selecciona) — resuelve "la tienda asignada al coordinador queda seleccionada automáticamente" (punto 5).
- Para el caso Admin-superusuario (`sucursalCoord`, siempre uno de los 9 nombres legacy), la condición `!(SUCURSALES...).includes(value)` es `false` → `options = SUCURSALES`, sin ningún cambio de comportamiento.

**`CoordinatorLayout.tsx`/`RootLayout.tsx`**: auditados, sin cambios necesarios. `sucursalLockValue`/`sucursalDisplayValue` (`CoordinatorLayout.tsx`) y la ausencia de estado propio del selector en `RootLayout.tsx` (ya corregido en el Sprint 5.2.3.x) ya eran correctos — el problema nunca estuvo en cómo se calculaba o propagaba el valor, sino en qué opciones estaban disponibles para representarlo dentro de `SucursalSelect`.

---

## 3. Restricciones del brief — cumplimiento verificado

| Restricción | Cumplida |
|---|---|
| No modificar RLS | Sí — cero SQL en esta ronda |
| No modificar Repositorios | Sí — `tiendas.repository.ts` sin cambios, sin ninguna llamada nueva desde `SucursalSelect` |
| No modificar Servicios | Sí — `profile.service.ts`/`supabase.service.ts` sin cambios |
| No modificar `OperationalContext` | Sí — `OperationalContextProvider.tsx` sin cambios |
| No modificar Auth | Sí — sin cambios |
| No modificar Seguridad | Sí — sin cambios |
| Alcance = sincronización del estado del Select | Sí — único archivo tocado: `sucursal-select.tsx`; `CoordinatorLayout.tsx`/`RootLayout.tsx` auditados, sin necesitar cambios |

---

## 4. Hallazgo adicional, fuera del alcance explícito de esta ronda (reportado, no corregido)

Auditando el mismo patrón, se confirmó que **`PublishModal`** (`src/components/shared/publish-modal.tsx`, líneas 242-252) tiene **exactamente el mismo bug**, sin corregir: su propio `<Select>` de "Sucursal que publica" también itera únicamente `SUCURSALES` (línea 243: `{SUCURSALES.map((s) => (...))}`), sin incluir la tienda real del Coordinador. Como `f.sucursal` se sincroniza a `enabledValue` (`= tiendaNombre`, Sprint 5.2.3.2) cuando el modal está bloqueado, el mismo problema aplicaría: para un Coordinador cuya tienda real no esté en las 9 legacy, las opciones del modal también quedarían todas deshabilitadas, aunque `f.sucursal` internamente ya tenga el valor correcto.

**No se modificó `publish-modal.tsx` en esta ronda** porque el brief acotó la auditoría explícitamente a `SucursalSelect`/`CoordinatorLayout`/`RootLayout` ("Audita exclusivamente...") — corregirlo hubiera excedido ese alcance. Se reporta aquí, con evidencia de código exacta, para que el usuario decida si autoriza una ronda futura idéntica en `publish-modal.tsx` (la misma corrección: unión de `SUCURSALES` con el valor real recibido, sin tocar la constante compartida).

**Limitación adicional, también reportada sin resolver**: la corrección de esta ronda garantiza que la tienda **del Coordinador conectado** aparezca y sea seleccionable — no reemplaza `SUCURSALES` por el catálogo completo y real de `public.tiendas`. Si Multimax tiene otras tiendas reales que tampoco coincidan con los 9 nombres legacy, esas NO aparecerán en el listado salvo que sean, en algún momento, el valor de `tiendaNombre` de un Coordinador conectado (o de `sucursalCoord` para el Admin). Reemplazar `SUCURSALES` por una consulta real a `tiendasRepository.getAll()` sería un cambio más amplio (nueva carga de datos dentro de `CoordinatorLayout`/`SucursalSelect`, aunque sin modificar el Repositorio en sí) que el brief no autorizó explícitamente ("el alcance es únicamente corregir la sincronización del estado del componente Select") — se deja fuera de esta ronda y se documenta como decisión pendiente del usuario, no como un supuesto silencioso.

---

## 5. Validaciones obligatorias — estado real

Este entorno de trabajo sigue sin `node_modules/`/acceso de red al registro de npm — no pudo ejecutar `npm run lint`/`typecheck`/`build`/`dev` de forma real (misma limitación estructural declarada en cada ronda anterior). Como mejor esfuerzo:

```
/home/claude/.npm-global/bin/tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0
```

Los únicos errores reportados para `sucursal-select.tsx` son `TS7026`/`TS2875` ("JSX element implicitly has type 'any'"/"requires the module path 'react/jsx-runtime'"), consistentes en todo el proyecto por la ausencia de `@types/react` (sin `node_modules/`) — no hay ningún error de tipos atribuible a la lógica nueva (`options`, `.includes`, la unión de arreglos). No se puede afirmar que `lint`/`typecheck`/`build`/`dev` pasan sin ejecutarlos realmente; se recomienda correrlos en el entorno del usuario.

---

## 6. Verificación de alcance

```
$ find src -newer docs/architecture/backend/SPRINT_5_2_3_4_RLS_TIENDAS_IMPLEMENTATION_REPORT.md -type f
src/components/shared/sucursal-select.tsx
```

Confirmado: único archivo de `src/` tocado en esta ronda.
