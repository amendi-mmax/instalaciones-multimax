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
 */
export interface PhoneFrameOption {
  value: string;
  label: string;
}

export interface PhoneFrameProps {
  /** Opciones del selector "quién soy" (`.mx-mesel`) — datos estáticos/mock en esta fase. */
  options: PhoneFrameOption[];
  selected: string;
  onSelectedChange: (value: string) => void;
  /** Contenido de la pantalla activa del teléfono. */
  children: ReactNode;
  /** Slot para `.mx-phonetabs` (Tabs variant="phonetabs"). */
  tabs?: ReactNode;
}

export function PhoneFrame({
  options,
  selected,
  onSelectedChange,
  children,
  tabs,
}: PhoneFrameProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) =>
    onSelectedChange(event.target.value);

  return (
    <div className="mx-phone">
      <div className="mx-phone-bar">
        <span className="mx-dot" />
        Multimax · Instalador
        <select className="mx-mesel" value={selected} onChange={handleChange}>
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
