# Sprint 5.2.3.x — Corrección definitiva del contexto operativo del Coordinador

**Fecha**: 2026-07-27
**Rama solicitada por el brief**: `feature/sprint-5.2.3-sucursal-filter`
**Rama real usada**: ninguna — este proyecto no usa ramas Git desde la Fase 4 (ver nota en la sección 8). Todo el trabajo se hizo sobre el árbol de trabajo actual, exactamente igual que en todos los Sprints anteriores de esta serie (5.2.3, 5.2.3.1, 5.2.3.2, 5.2.3.3, 5.2.3.4, 5.2.3.3.1).

---

## 1. Resumen ejecutivo

El brief pedía que la "sucursal activa" tuviera **una sola fuente de verdad** (`OperationalContext`) y que el badge superior, el selector superior, `PublishModal`, "Mis trabajos" y "Despacho en vivo" quedaran sincronizados sin estados intermedios, sin Context nuevo, sin hardcode y sin tocar RLS/Repository/Backend.

La auditoría de esta ronda confirmó que **3 de las 5 superficies ya estaban correctamente sincronizadas** (Mis Trabajos, Despacho en Vivo, KPIs — todas leen `tiendaId`/`tiendaNombre` directo de `OperationalContext`, sin estado propio) y que **2 tenían un bug real y confirmado por evidencia de código**:

1. **Badge superior ("tag superior")**: `CoordinatorLayout.tsx` nunca pasaba la prop `sucursalActiva` a `<Header>`, por lo que `HeaderStatus` usaba siempre su propio valor por defecto hardcodeado (`'Multiplaza'`), sin relación con la tienda real del Coordinador. Este bug estaba **documentado y deliberadamente no corregido** desde el Sprint 3.4 (ver JSDoc histórico "TEMPORARY INTEGRATION" en `RootLayout.tsx`).
2. **Selector superior**: su valor mostrado (`value` de `SucursalSelect`) venía de `sucursalCoord`, un `useState` en `RootLayout.tsx` que nacía con el literal fijo `'Multiplaza'` y se sincronizaba con `profile.tiendaNombre` solo de forma condicional y unidireccional (Sprint 5.2.3.1) — un patrón de "snapshot antiguo" que el propio brief pidió eliminar explícitamente.

Ambos bugs comparten la misma causa estructural: **el valor mostrado no venía de `OperationalContext`, sino de un estado local duplicado en `RootLayout.tsx`.** La corrección de esta ronda elimina esa duplicidad sin crear ningún estado ni Context nuevo.

---

## 2. Archivos modificados

Exactamente 2 archivos, ambos dentro de `src/layouts/` (verificado con `find src -newer <deliverable de la ronda anterior>`, ver sección 7):

- `src/layouts/RootLayout.tsx`
- `src/layouts/CoordinatorLayout.tsx`

Ningún otro archivo de `src/` fue tocado. No se modificó ningún archivo de `Repository`, `services`, `providers` (incluyendo `OperationalContextProvider.tsx`), tipos, RLS, ni ningún componente fuera de estos 2 layouts.

---

## 3. Causa raíz encontrada

### 3.1 Badge superior ("tag superior") — congelado en `'Multiplaza'`

- `src/components/shared/header-status.tsx` declara `sucursalActiva?: string` con default `sucursalActiva = 'Multiplaza'` (línea 39), usado solo dentro de la rama `role === 'coordinador'` (línea 51: `<Badge tone="muted">{sucursalActiva}</Badge>`).
- `src/components/shared/header.tsx` ya reenviaba correctamente esa prop a `HeaderStatus` — el problema nunca estuvo en `Header`/`HeaderStatus`.
- `src/layouts/CoordinatorLayout.tsx` renderizaba `<Header role={profile.rol} profile={profile} onLogout={...} />` **sin la prop `sucursalActiva`**, confirmado leyendo el archivo antes de esta ronda. Sin esa prop, `HeaderStatus` recaía siempre en su propio default hardcodeado.
- Esto coincide exactamente con el JSDoc histórico ya existente en `RootLayout.tsx` (sección "TEMPORARY INTEGRATION — Sprint 3.4"): *"Problema encontrado (reportado, no corregido): `HeaderStatus` ya muestra un badge... pero `RootLayout` no se lo pasa... No se corrige aquí: pasar `sucursalCoord` a `Header` cuenta como modificar su integración fuera del alcance mínimo de este Sprint."* — es decir, este bug llevaba **documentado y deliberadamente diferido desde el Sprint 3.4**, y este Sprint es el primero cuyo alcance explícitamente lo cubre.

### 3.2 Selector superior — estado duplicado con snapshot antiguo

- `sucursalCoord` (`RootLayout.tsx`) nace como `useState('Multiplaza')` — un literal fijo, no derivado de ningún dato real.
- Desde el Sprint 5.2.3.1, un `useEffect` intentaba mantenerlo sincronizado con `profile.tiendaNombre`, pero **solo cuando `profile.tiendaNombre` era verdadero** (`if (profile.tiendaNombre && profile.tiendaNombre !== sucursalCoord) setSucursalCoord(...)`). Mientras `tiendaNombre` resuelve a `null` (la limitación de RLS de `tiendas` documentada desde el Sprint 5.2.3.3/5.2.3.4, ver sección 6), ese efecto nunca corría — `sucursalCoord` quedaba congelado en `'Multiplaza'`, un dato falso, en vez de reflejar honestamente "todavía no resuelto".
- `CoordinatorLayout.tsx` pasaba `value={sucursalCoord}` a `<SucursalSelect>` — es decir, el selector mostraba ese snapshot potencialmente desactualizado, no el valor real de `OperationalContext`.
- Esto es exactamente el patrón de "estado duplicado" y "snapshot antiguo" que el brief pidió eliminar de forma explícita.

---

## 4. Flujo completo corregido

```
Login (Coordinador real)
  → useAuth() resuelve profile (incluye profile.tiendaId, vía coordinadores.tienda_id)
  → profile.service.ts → resolveTiendaNombre(tiendaId) → tiendasRepository.getById()
      → profile.tiendaNombre (string real, o null si la policy de tiendas aún no existe)
  → OperationalContextProvider (rama síncrona: Coordinador real)
      → tiendaId: profile.tiendaId
      → tiendaNombre: profile.tiendaNombre ?? null   (passthrough directo, sin transformación)
  → CoordinatorLayout.tsx consume useOperationalContext()
      → sucursalLockValue  = esSuperusuario ? undefined : (tiendaNombre ?? '')   [ya existía, sin cambios]
      → sucursalDisplayValue = esSuperusuario ? sucursalCoord : (tiendaNombre ?? '')   [NUEVO — única fuente de verdad para lo que se MUESTRA]
  → sucursalDisplayValue se pasa, sin transformación adicional, a:
      • <Header sucursalActiva={sucursalDisplayValue} />         [antes: prop no se pasaba]
      • <SucursalSelect value={sucursalDisplayValue} .../>       [antes: value={sucursalCoord}]
      • <PublishModal sucursal={sucursalDisplayValue} .../>      [antes: sucursal={sucursalCoord}]
```

Para el caso Admin-superusuario en Modo Coordinador (`esSuperusuario === true`), `sucursalCoord` sigue siendo el **insumo legítimo y necesario** (la selección manual del admin, que alimenta `OperationalContextProvider` para resolver `tiendaId`/`tiendaNombre` vía `resolveSuperusuarioTienda(sucursalCoord)`) — no se toca ni se elimina, porque no es un duplicado: es el único caso real donde el usuario elige libremente.

Para un Coordinador real (`esSuperusuario === false`), `sucursalCoord` **deja de leerse** para fines de visualización — `sucursalDisplayValue` usa `tiendaNombre` directo, sin pasar por ningún estado local de `RootLayout.tsx`.

---

## 5. Componentes sincronizados (y verificados sin cambios necesarios)

| Componente / página | Antes | Ahora | Cambio |
|---|---|---|---|
| `Header` (badge superior) | Sin prop `sucursalActiva` → default hardcodeado `'Multiplaza'` | `sucursalActiva={sucursalDisplayValue}` | **Corregido** |
| `SucursalSelect` (selector superior) | `value={sucursalCoord}` (snapshot local) | `value={sucursalDisplayValue}` | **Corregido** |
| `PublishModal` (valor inicial del form) | `sucursal={sucursalCoord}` | `sucursal={sucursalDisplayValue}` | **Corregido** (nota: `enabledValue` ya forzaba `f.sucursal` a coincidir vía el `useEffect` del Sprint 5.2.3.2 — este cambio es de consistencia, no era funcionalmente necesario, pero elimina la última referencia visible a `sucursalCoord` para el caso Coordinador real) |
| `TrabajosPage.tsx` ("Mis Trabajos") | Lee `tiendaId`/`tiendaNombre` directo de `useOperationalContext()`, refetch en cada montaje (`useEffect([tiendaId, contextoLoading, contextoError])`) | Sin cambios | **Ya correcto — verificado, no modificado** |
| `DespachoPage.tsx` ("Despacho en Vivo" + KPIs) | Lee `tiendaId` directo de `useOperationalContext()`; KPIs ya recargan con `activeJob?.id` en dependencias (fix del Sprint 5.2.3.3.1) | Sin cambios | **Ya correcto — verificado, no modificado** |
| `OperationalContextProvider.tsx` | Fuente única de `tiendaId`/`tiendaNombre` | Sin cambios | **No tocado, según regla explícita del brief** |

---

## 6. Validación de duplicidad — los 10 términos del brief

| Término | ¿Existe en el código? | Dónde vive | ¿Es duplicidad? |
|---|---|---|---|
| `tiendaId` | Sí | `OperationalContextValue.tiendaId` (única fuente); consumido directo por `CoordinatorLayout.tsx`, `DespachoPage.tsx`, `TrabajosPage.tsx` | No — un único origen, consumido igual en todos lados |
| `tiendaNombre` | Sí | `OperationalContextValue.tiendaNombre` (única fuente); consumido por `CoordinatorLayout.tsx` para derivar `sucursalLockValue`/`sucursalDisplayValue` | No — un único origen |
| `sucursal` | Sí | (a) prop de `PublishModal` (recibe `sucursalDisplayValue`); (b) `PublishForm.sucursal`/`form.sucursal` (estado interno del formulario, ver más abajo); (c) columna visual `sucursal` de `JobSummaryCardJob` (tomada de `form.sucursal` al publicar, porque `trabajos` no tiene columna de nombre de tienda, solo `tienda_id`) | No — son 3 roles distintos y necesarios (prop de entrada, estado de formulario editable, dato histórico de una tarjeta ya publicada), ninguno duplica la fuente de verdad de "sucursal activa" |
| `sucursalCoord` | Sí | `useState('Multiplaza')` en `RootLayout.tsx` — ahora **exclusivamente** el insumo editable del Admin-superusuario (ya no se lee para mostrar nada a un Coordinador real) | No — tras esta corrección, ya no es un duplicado de la fuente de verdad para el caso Coordinador; sigue siendo el único estado editable legítimo para el caso Admin |
| `selectedSucursal` | No | — (confirmado por grep en todo `src/`, cero resultados) | N/A — no existe en el código |
| `enabledValue` | Sí | Prop de `SucursalSelect`/`PublishModal`; recibe `sucursalLockValue` (ya existía desde el Sprint 5.2.3.1/5.2.3.2, sin cambios este Sprint) | No — gobierna qué opciones están `disabled`, un propósito distinto de `sucursalDisplayValue` (qué se muestra); ambos derivan de las mismas 2 variables (`esSuperusuario`, `tiendaNombre`), sin estado propio |
| `lockValue` | Sí, como `sucursalLockValue` (no existe una variable llamada literalmente `lockValue`) | `CoordinatorLayout.tsx`, sin cambios este Sprint | No — ver arriba |
| `form.sucursal` | Sí | Estado interno de `PublishModal` (`useState<PublishForm>`), sincronizado por su propio `useEffect` cuando `enabledValue !== undefined` (Sprint 5.2.3.2, sin cambios) | No — es el estado de un formulario editable, con su propio ciclo de vida; ya se resincroniza automáticamente al valor bloqueado, y ahora además inicia con `sucursalDisplayValue` en vez de `sucursalCoord` |
| `activeSucursal` | No | — (confirmado por grep, cero resultados) | N/A — no existe en el código |
| `activeStore` | No | — (confirmado por grep, cero resultados) | N/A — no existe en el código |

**Conclusión de la validación**: no se encontró ninguna duplicidad adicional a las 2 ya corregidas (badge superior, `value` del selector). `sucursalCoord` deja de ser un duplicado de la fuente de verdad porque ya no se lee para el caso Coordinador real; se mantiene únicamente como el insumo legítimo del caso Admin-superusuario, que el propio brief no pidió eliminar (el brief pide una sola fuente de verdad para la *sucursal activa de un Coordinador*, no elimina la necesidad de que un Admin pueda elegir libremente qué tienda simular).

`CoordinatorLayoutOutletContext` sigue exponiendo los campos `sucursalCoord`/`setSucursalCoord`, pero se confirmó (grep) que **ningún** componente (`DespachoPage.tsx`, `TrabajosPage.tsx`, `TrabajoDetailPage.tsx`) los consume vía `useOutletContext()` — es exposición muerta, no duplicidad activa. Se decidió no tocar ese tipo/exposición esta ronda por disciplina de alcance mínimo (no forma parte de la duplicidad que el brief señala, y removerlo excedería "no modificar funcionalidades ajenas a este Sprint").

---

## 7. Verificación de alcance

```
$ find src -newer docs/architecture/frontend/SPRINT_5_2_3_3_1_PUBLISH_PERSISTENCE_AUDIT_REPORT.md -type f
src/layouts/RootLayout.tsx
src/layouts/CoordinatorLayout.tsx
```

Confirmado: únicamente estos 2 archivos fueron tocados en `src/` durante esta ronda. Ningún archivo de `Repository`, `services`, `providers`, tipos, ni ningún otro componente fue modificado.

---

## 8. Nota sobre la rama solicitada

El brief pide trabajar "únicamente sobre la rama `feature/sprint-5.2.3-sucursal-filter`". Se verificó con `git branch -a` (comando de solo lectura) que esa rama **no existe** en este repositorio. Esto es consistente con el patrón ya establecido y comunicado repetidamente desde la Fase 4: desde entonces, ningún Sprint de este proyecto se trabaja sobre una rama Git nueva — todo el trabajo vive como cambios no confirmados (uncommitted) en el árbol de trabajo, documentado en cada fila de `docs/SPRINTS_INDEX.md` como *"(sin rama Git — flujo Git manual del usuario)"*. El historial de Git real de este repositorio solo llega hasta el Sprint 3.8 (`feature/sprint-3-8-countdown`, la rama actualmente activa). Este Sprint no es una excepción: el trabajo se realizó sobre el árbol de trabajo actual, sin crear ni cambiar de rama.

---

## 9. Validaciones obligatorias del brief — estado real

El brief exige que `npm run lint`, `npm run typecheck`, `npm run build` y `npm run dev` pasen correctamente antes de cerrar el Sprint. **Este entorno (sandbox) no tiene acceso de red al registro de npm ni tiene `node_modules/` instalado**, por lo que ninguno de esos 4 comandos puede ejecutarse realmente aquí — esto es una limitación estructural del entorno, ya documentada en rondas anteriores, no específica de este Sprint.

Como mejor esfuerzo, se ejecutó la verificación estática ya establecida en este proyecto:

```
/home/claude/.npm-global/bin/tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0
```

El resultado son exclusivamente errores `TS2307` ("Cannot find module...") y `TS2875` ("This JSX tag requires the module path 'react/jsx-runtime'...") — es decir, errores derivados de la ausencia de `node_modules/` (no hay tipos de `react`, `react-router-dom`, `@tanstack/react-query`, `lucide-react` instalados), no errores reales de tipos en el código. Ningún error reportado por `tsc` involucra a `RootLayout.tsx` o `CoordinatorLayout.tsx` de forma específica a los cambios de esta ronda — los errores que sí mencionan estos archivos en ejecuciones previas (antes de esta ronda) eran, igualmente, solo por módulos faltantes.

**No se puede afirmar con evidencia real que `lint`/`typecheck`/`build`/`dev` pasan** — solo se puede afirmar que la verificación estática disponible en este entorno no encontró errores de tipos atribuibles a los cambios de esta ronda. Se recomienda que el usuario corra los 4 comandos en su propio entorno (con `node_modules/` instalado) antes de considerar el Sprint cerrado en el sentido estricto que pide el brief.

---

## 10. Dependencia externa pendiente (no resuelta por este Sprint, ya conocida)

La corrección de esta ronda hace que el badge y el selector reflejen **honestamente** el valor real de `tiendaNombre` — pero ese valor sigue dependiendo de que la policy de `SELECT` para `public.tiendas` (generada en `docs/architecture/backend/SPRINT_5_2_3_4_RLS_TIENDAS_FIX.sql`, Sprint 5.2.3.4) haya sido ejecutada en Producción. Mientras esa policy no se ejecute:

- `tiendaNombre` seguirá resolviendo a `null` para un Coordinador real.
- `sucursalDisplayValue` mostrará `''` (string vacío) — el badge quedará visualmente vacío y el selector mostrará todas las opciones deshabilitadas.
- Esto es el comportamiento **correcto y esperado** en ese escenario: refleja honestamente "todavía no resuelto", en vez de mostrar `'Multiplaza'` como si fuera un dato real (el bug que este Sprint corrige).

No se puede confirmar desde este entorno si esa policy ya fue ejecutada (sin acceso de red a Supabase). Se recomienda que el usuario confirme la ejecución antes de validar visualmente esta corrección con un Coordinador real.
