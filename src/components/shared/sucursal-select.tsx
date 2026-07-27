import { SUCURSALES } from '@/constants';

/**
 * SucursalSelect — reconstruye `<div class="mx-suc-sel">` (JSX de referencia:
 * `Multimax_Despacho_v1.3.html`, `App()`, líneas 2071-2079 — Sprint 3.4, único
 * bloque HTML de este Sprint). Es el selector de "Sucursal activa" que
 * `App()` renderiza como primer elemento de la rama `role === "coord"`,
 * hermano de `.mx-subtabs-wrap` (que le sigue inmediatamente, migrado en el
 * Sprint 3.3). CSS declarado en el `<style>` fuente bajo el comentario propio
 * `/* Selector de sucursal *\/` (líneas 412-415) — no tenía CSS ni componente
 * migrado hasta este Sprint (verificado con `grep`).
 *
 * Estructura reconstruida exactamente:
 * ```jsx
 * <div className="mx-suc-sel">
 *   <label>Sucursal activa:</label>
 *   <select value={value} onChange={e => onChange(e.target.value)}>
 *     {SUCURSALES.map(s => <option key={s} value={s}>{s}</option>)}
 *   </select>
 * </div>
 * ```
 *
 * `value`/`onChange` son props controladas — en el HTML fuente, el estado
 * (`sucursalCoord`/`setSucursalCoord`) vive en `App()` (el mismo nivel que el
 * `role` del Header), no dentro de este bloque. Aquí se replica ese mismo
 * criterio: el estado vive en `RootLayout` (mismo nivel que `role`), no
 * dentro de `SucursalSelect` — ver `src/layouts/RootLayout.tsx` y
 * `docs/sprints/sprint-3.4.md` → "Problema encontrado" sobre la
 * inconsistencia resultante con el badge de sucursal del Header.
 *
 * ---------------------------------------------------------------------
 * AJUSTE — Sprint 5.2.3.1 ("Corrección definitiva del selector 'Sucursal
 * activa' para Coordinador y Administrador")
 * ---------------------------------------------------------------------
 * Único cambio de este Sprint a este archivo: nueva prop opcional
 * `enabledValue`. Comportamiento funcional exigido por el usuario tras la
 * auditoría de este Sprint: un Coordinador real pertenece a una única
 * tienda (`coordinadores.tienda_id`, fija) — el `<select>` debe seguir
 * siendo visible (así lo define el HTML oficial, no se retira), pero solo
 * la opción de su propia tienda debe quedar habilitada; el resto deben
 * mostrarse `disabled`, para que el usuario no pueda, ni siquiera
 * visualmente, dejar el dropdown en un valor que no corresponde a los
 * datos reales que está viendo. Para un `admin` en Modo Coordinador
 * (superusuario, Sprint 5.1.1), el selector debe seguir completamente
 * habilitado -- `enabledValue` se omite (`undefined`) para ese caso, sin
 * cambio de comportamiento respecto a como funcionaba antes de este Sprint.
 *
 * `enabledValue === undefined` → comportamiento anterior, sin cambios
 * (todas las opciones habilitadas). `enabledValue` es un string → solo la
 * opción cuyo valor coincide exactamente queda habilitada; el resto,
 * `disabled`. Si `enabledValue` no coincide con ninguna opción de
 * `SUCURSALES` (ver limitación conocida de esa constante, JSDoc de
 * `constants/index.ts`: es una lista literal, todavía no viene de
 * Supabase), **todas** las opciones quedan deshabilitadas -- degradación
 * segura: nunca se marca como "habilitada" una opción que no es
 * verificablemente la tienda real del Coordinador. Quién decide qué pasar
 * en `enabledValue` (y por qué) vive en `CoordinatorLayout.tsx`, no aquí —
 * este componente sigue siendo puramente presentacional, sin lógica de
 * roles/Contexto Operativo.
 *
 * ---------------------------------------------------------------------
 * AJUSTE — Sprint 5.2.3.5 ("Sincronización del selector de sucursal")
 * ---------------------------------------------------------------------
 * Causa raíz encontrada esta ronda (auditoría con datos reales ya
 * corregidos por el Sprint 5.2.3.4): `SUCURSALES` (`constants/index.ts`)
 * sigue siendo la lista LITERAL de 9 nombres del HTML original (Sprint
 * 3.4: "Tumba Muerto", "Multiplaza", "Albrook", ...), transcrita del
 * prototipo y nunca reemplazada por datos reales de `tiendas` -- su
 * propio JSDoc ya lo advertía ("La lista real de sucursales vendrá de
 * Supabase ... en una fase de integración futura -- no se resuelve
 * aquí"). Ahora que `tiendaNombre` resuelve al nombre REAL de la tienda
 * (ej. "Multimax Paitilla", una fila real de `public.tiendas`, Sprint
 * 5.2.3.4), ese nombre no aparece entre esas 9 opciones estáticas -- un
 * `<select value="Multimax Paitilla">` sin ninguna `<option
 * value="Multimax Paitilla">` no puede mostrar esa selección
 * correctamente, y como tampoco hay ninguna opción cuyo valor coincida
 * con `enabledValue` ("Multimax Paitilla"), las 9 quedaban deshabilitadas
 * -- exactamente el síntoma reportado ("el badge ya muestra Multimax
 * Paitilla, pero el selector no").
 *
 * Corrección (solo en este componente, sin tocar `SUCURSALES` -- sigue
 * siendo la misma constante compartida sin cambios para
 * `PublishModal`/`MasterCalendar`, y sin ninguna llamada a
 * repositorios/servicios/Supabase desde aquí): si `value` es una tienda
 * real que todavía no está en `SUCURSALES`, se agrega como una opción
 * adicional al final de la lista renderizada -- garantiza que el `value`
 * del `<select>` SIEMPRE coincida con exactamente una `<option>` real,
 * sin inventar ni hardcodear ningún nombre (el nombre viene, en todos los
 * casos, del mismo `value`/`enabledValue` ya recibidos por props, con el
 * mismo origen -- `OperationalContext.tiendaNombre` -- que ya gobierna el
 * badge del `Header`). Si `value` es `''` (todavía no resuelto) o ya está
 * en `SUCURSALES` (caso Admin-superusuario, que sigue usando las 9
 * sucursales legacy vía `sucursalCoord`), el comportamiento es idéntico
 * al de antes de este Sprint -- cero cambios para ese caso.
 */
export interface SucursalSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Ver JSDoc "AJUSTE — Sprint 5.2.3.1" arriba. */
  enabledValue?: string;
}

export function SucursalSelect({ value, onChange, enabledValue }: SucursalSelectProps) {
  // Sprint 5.2.3.5 — ver JSDoc "AJUSTE — Sprint 5.2.3.5" arriba. Unión,
  // no reemplazo: las 9 opciones legacy de `SUCURSALES` siempre están
  // presentes (necesarias para el caso Admin-superusuario); se agrega
  // `value` únicamente si es una tienda real todavía no representada ahí.
  const options: readonly string[] =
    value && !(SUCURSALES as readonly string[]).includes(value) ? [...SUCURSALES, value] : SUCURSALES;

  return (
    <div className="mx-suc-sel">
      <label>Sucursal activa:</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((s) => (
          <option key={s} value={s} disabled={enabledValue !== undefined && s !== enabledValue}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
