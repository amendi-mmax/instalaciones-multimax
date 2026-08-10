import type { ChangeEvent, ReactNode } from 'react';

/**
 * PhoneFrame — portado verbatim de `.mx-phone`/`.mx-phone-bar`/`.mx-dot`/
 * `.mx-mesel` (JSX de referencia: Installer() en Multimax_Despacho_v1.3.html,
 * líneas ~3169-3453). Se usa como hijo `left` de
 * `<TwoColumnLayout variant="phone">`, que aporta el wrapper `.mx-instwrap`
 * y su breakpoint responsivo — ver two-column-layout.tsx.
 *
 * El contenido de la pantalla (`body`) y las tabs inferiores (`.mx-phonetabs`,
 * ver ui/tabs.tsx variant="phonetabs") son responsabilidad de quien use
 * PhoneFrame — este componente es puramente estructural, sin lógica de
 * negocio, tal como exige el alcance de esta fase.
 *
 * `disabled` (Estabilización del módulo Instalador, post Sprint 8.2): el
 * `.mx-mesel` original dejaba elegir entre varias identidades mock
 * (`INSTALLERS`, distintas "empresas instaladoras" de demostración) — un
 * instalador real solo pertenece a una única empresa (`empresa_id`, RLS), no
 * debe poder cambiarla. En vez de reemplazar el `<select>` por un
 * `label`/`badge` (habría alterado el markup/CSS de `.mx-phone-bar`, fuera
 * de alcance de esa ronda: "mantener exactamente el diseño visual actual"),
 * se agrega este prop opcional (default `false`, sin cambio de
 * comportamiento para ningún otro caso hipotético futuro) que deshabilita el
 * control nativo — mismo criterio ya usado en `sucursal-select.tsx`/
 * `publish-modal.tsx` (Sprint 5.2.3.1/5.2.3.2) para bloquear un `<select>`
 * sin dejar de reutilizar el mismo componente.
 */
export interface PhoneFrameOption {
  value: string;
  label: string;
}

export interface PhoneFrameProps {
  /** Opciones del selector "quién soy" (`.mx-mesel`). */
  options: PhoneFrameOption[];
  selected: string;
  onSelectedChange: (value: string) => void;
  /** Contenido de la pantalla activa del teléfono. */
  children: ReactNode;
  /** Slot para `.mx-phonetabs` (Tabs variant="phonetabs"). */
  tabs?: ReactNode;
  /** Deshabilita el `<select>` — ver JSDoc de cabecera. Default `false`. */
  disabled?: boolean;
}

export function PhoneFrame({
  options,
  selected,
  onSelectedChange,
  children,
  tabs,
  disabled = false,
}: PhoneFrameProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) =>
    onSelectedChange(event.target.value);

  return (
    <div className="mx-phone">
      <div className="mx-phone-bar">
        <span className="mx-dot" />
        Multimax · Instalador
        <select
          className="mx-mesel"
          value={selected}
          onChange={handleChange}
          disabled={disabled}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {children}
      {tabs}
    </div>
  );
}
