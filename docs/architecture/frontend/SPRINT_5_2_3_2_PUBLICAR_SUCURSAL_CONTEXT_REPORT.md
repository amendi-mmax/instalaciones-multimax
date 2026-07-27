# Sprint 5.2.3.2 — Consistencia completa del selector de sucursal para Coordinador

## 0. Nota de trazabilidad

El Sprint 5.2.3.1 corrigió el selector principal "Sucursal activa" (`CoordinatorLayout`/`SucursalSelect`). Este Sprint audita, por instrucción explícita del usuario, el resto de la vista Coordinador en busca de una segunda fuente de verdad para la sucursal -- específicamente el modal "Publicar trabajo", ya señalado en el brief como sospechoso. La auditoría **sí confirmó** la sospecha (sección 2); se documenta antes de cualquier cambio, tal como exige el brief.

## 1. Auditoría — cómo obtiene hoy el modal la sucursal

`PublishModal` (`src/components/shared/publish-modal.tsx`) recibe `sucursal: string` como prop (desde `CoordinatorLayout.tsx`, `sucursal={sucursalCoord}`), pero **no la usa reactivamente** -- solo la lee UNA VEZ, como valor inicial de su propio `useState<PublishForm>`:

```ts
const [f, setF] = useState<PublishForm>({
  sucursal: sucursal || SUCURSALES[0],
  ...
});
```

El campo "Sucursal que publica" del formulario (`<Select value={f.sucursal} onChange={...}>`) itera las 9 opciones de la constante `SUCURSALES` sin ninguna restricción -- exactamente el mismo patrón "todas seleccionables" que tenía `SucursalSelect` antes del Sprint 5.2.3.1.

## 2. Duplicación de estado confirmada (segunda fuente de verdad)

`PublishModal` **nunca se desmonta** -- `CoordinatorLayout.tsx` lo monta siempre (`<PublishModal .../>`, sin `{showPublishModal && ...}`), y alterna su visibilidad internamente vía la prop `open` del `Drawer` (portal). Como el `useState` inicial de React solo se evalúa en el primer montaje, `f.sucursal` queda congelado al valor que tenía la prop `sucursal` la primera vez que el Coordinador entró a la vista -- **ningún efecto lo sincronizaba después** con cambios posteriores a `sucursalCoord`/`tiendaNombre`. Esto es, con evidencia directa de código, la "segunda fuente de verdad" que el brief sospechaba: `f.sucursal` (estado local de `PublishModal`) vs. `sucursalCoord`/`tiendaNombre` (Contexto Operativo, ya corregido en el Sprint 5.2.3.1).

**Por qué esto es observable incluso después del Sprint 5.2.3.1**: la sincronización de `sucursalCoord` con `profile.tiendaNombre` (nuevo `useEffect` de `RootLayout.tsx`, Sprint 5.2.3.1) corre DESPUÉS del primer render -- si `PublishModal` monta antes de que ese efecto corrija `sucursalCoord`, su `useState` inicial puede capturar el valor por defecto (`'Multiplaza'`) en vez de la tienda real, y quedarse así para siempre, sin relación con lo que el selector principal ya muestra correctamente.

**`PublishModal` no reutiliza `useOperationalContext()`** -- no lo importa ni lo consulta; solo recibe `sucursal` (string) como prop. No hay valores hardcodeados nuevos más allá de la ya conocida `SUCURSALES` (limitación documentada desde el Sprint 3.4, sin cambios). No se encontraron otros estados locales innecesarios en el resto del formulario relacionados con sucursal -- el resto de campos (`tipo`/`zona`/`fecha`/etc.) no tienen relación con este hallazgo.

## 3. Unificación (sin Context nuevo, sin duplicar lógica del Sprint 5.2.3.1)

`CoordinatorLayout.tsx` **ya calculaba** `sucursalLockValue` (Sprint 5.2.3.1) para bloquear `SucursalSelect`:

```ts
const sucursalLockValue = esSuperusuario ? undefined : (tiendaNombre ?? '');
```

Este Sprint reutiliza exactamente esa misma variable, sin recalcularla, pasándola también a `PublishModal` como nueva prop `enabledValue` (mismo nombre/semántica ya usada en `sucursal-select.tsx`):

```tsx
<PublishModal sucursal={sucursalCoord} enabledValue={sucursalLockValue} ... />
```

Dentro de `PublishModal`:

1. Nueva prop `enabledValue?: string`.
2. Las opciones del `<Select>` de "Sucursal que publica" quedan `disabled` salvo la que coincide con `enabledValue` (idéntico criterio a `sucursal-select.tsx`; `undefined` → sin cambios, todas habilitadas).
3. Nuevo `useEffect(() => { if (enabledValue !== undefined && f.sucursal !== enabledValue) set('sucursal', enabledValue); }, [enabledValue])` -- mantiene `f.sucursal` sincronizado a la única fuente de verdad mientras el modal está bloqueado. Para Admin en Modo Coordinador (`enabledValue === undefined`) este efecto nunca corre -- cero cambio de comportamiento.

**Única fuente de verdad resultante**: `esSuperusuario`/`tiendaNombre` (`OperationalContextValue`, sin cambios de tipo) → `sucursalLockValue` (`CoordinatorLayout.tsx`, ya existía) → consumido por **ambos** componentes (`SucursalSelect` y `PublishModal`) de la misma manera, con el mismo prop, sin ninguna lógica duplicada ni recalculada dos veces.

## 4. Comportamiento resultante

**Coordinador real**: al abrir el modal, "Sucursal que publica" muestra automáticamente su tienda real, con las demás 8 opciones deshabilitadas -- no puede publicar para otra sucursal, ni siquiera manipulando el `<select>` directamente (un `<option disabled>` no es seleccionable en ningún navegador).

**Admin → Modo Coordinador**: `enabledValue` es `undefined` -- el modal sigue 100% libre, exactamente como antes de este Sprint. No se introdujo ninguna rama de código específica para `admin` -- la condición ya existente (`esSuperusuario`) es la misma que decide el comportamiento del selector principal desde el Sprint 5.2.3.1.

## 5. Confirmaciones (validaciones pedidas)

- Selector principal y selector del modal muestran siempre la misma tienda para un Coordinador real -- ambos derivan del mismo `sucursalLockValue`.
- Un Coordinador real no puede cambiar de sucursal en ningún punto de la vista (selector principal, Sprint 5.2.3.1; modal, este Sprint).
- Admin conserva el comportamiento 100% dinámico en ambos selectores.
- `onPublish`/`trabajosRepository.create()` sin tocar -- el INSERT sigue usando `payload.tienda_id`/`empresa_id` del Contexto Operativo (no de `f.sucursal`, que solo alimenta el campo de texto `sucursal` de la fila, sin relación con el filtrado RLS) -- no se rompe la publicación de trabajos.
- "Mis trabajos"/"Despacho en vivo"/KPIs no se tocaron en este Sprint (ninguno de los 3 archivos modificados les pertenece) -- sin regresión.

## Archivos modificados

- `src/components/shared/publish-modal.tsx` — nueva prop `enabledValue`, `disabled` por opción, nuevo `useEffect` de sincronización.
- `src/layouts/CoordinatorLayout.tsx` — una línea: pasa `enabledValue={sucursalLockValue}` (ya calculado) a `PublishModal`.
- `PROJECT_STATUS.md`, `CHANGELOG.md`, `docs/SPRINTS_INDEX.md`.
- Este reporte (nuevo).

Sin cambios a Supabase, base de datos, RLS, Policies, SQL, repositorios, servicios, backend, Auth, ni a `SucursalSelect`/`OperationalContextProvider`/`OperationalContext` (tipo sin cambios, mismos 2 campos ya existentes reutilizados).

## Validación

`tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0` (`/tmp/tsc_5_2_3_2.log`): mismas cantidades exactas de diagnósticos que la línea base del Sprint 5.2.3.1 -- todos artefactos ya conocidos de este entorno sin `node_modules` (`TS2307`/`TS2875`/`TS7026`/`TS7006`/`TS2322`, etc.). Cero `TS6133`, cero errores de sintaxis. `npm run lint`/`npm run typecheck`/`npm run build` reales quedan pendientes del entorno del usuario.

**Pendiente**: validación visual real (Coordinador real → abrir "Publicar trabajo" → confirmar que solo su tienda aparece habilitada y coincide con el selector principal; Admin en Modo Coordinador → confirmar que ambos selectores siguen libres y el trabajo se publica con la sucursal elegida). El escenario de Admin sigue sujeto a la misma limitación ya reportada en el Sprint 5.2.3.1 (RLS de `empresas`/`tiendas` sin policies para `authenticated`), no resuelta en este Sprint por estar fuera de su alcance.
