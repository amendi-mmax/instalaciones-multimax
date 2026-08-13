import type { ReactNode } from 'react';

/**
 * MxSubtabButton — reconstruye cada `<button>` hijo de `.mx-subtabs` (JSX de
 * referencia: `Multimax_Despacho_v1.3.html`, Sprint 3.3). En el HTML fuente,
 * ambas instancias de `.mx-subtabs` (Coordinator y AdminPanel) usan el mismo
 * patrón exacto:
 *
 * ```
 * React.createElement("button", {
 *   className: estadoActivo === "x" ? "on" : "",
 *   onClick: () => setEstadoActivo("x")
 * }, React.createElement(Icono, { size: 14 }), "Texto del tab")
 * ```
 *
 * Este componente reconstruye únicamente esa estructura (botón plano,
 * `className` condicional `on`/"", ícono + texto como children) — sin
 * ningún estado interno ni lógica de navegación: `active`/`icon`/`onClick`
 * son props puras que un Sprint futuro (Coordinator o AdminPanel) deberá
 * proveer con su propio `useState` real, tal como hace el HTML fuente. No
 * se conecta ningún estado ni mock de datos en este Sprint.
 *
 * El HTML fuente no define reglas `:hover`/`:focus` propias para
 * `.mx-subtabs button` (verificado con `grep` sobre el `<style>` original) —
 * solo existe el estado `.on` (activo) vs. sin clase (inactivo). No se
 * inventa ningún estilo de hover/focus que no esté en el HTML.
 */
export interface MxSubtabButtonProps {
  active: boolean;
  icon: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}

export function MxSubtabButton({ active, icon, onClick, children }: MxSubtabButtonProps) {
  return (
    <button className={active ? 'on' : ''} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}
