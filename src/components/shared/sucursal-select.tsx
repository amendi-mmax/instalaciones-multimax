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
 */
export interface SucursalSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function SucursalSelect({ value, onChange }: SucursalSelectProps) {
  return (
    <div className="mx-suc-sel">
      <label>Sucursal activa:</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {SUCURSALES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
