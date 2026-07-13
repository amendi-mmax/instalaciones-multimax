import type { ReactNode } from 'react';

/**
 * MxPhoneTabs — reconstruye `<div class="mx-phonetabs">` (JSX de
 * referencia: `Installer()` en `Multimax_Despacho_v1.3.html`, línea
 * ~3410-3452 — Sprint 3.10). A diferencia de `.mx-subtabs`, que en el HTML
 * fuente está envuelto en un contenedor adicional (`.mx-subtabs-wrap`),
 * `.mx-phonetabs` es un único `<div>` sin wrapper — se reconstruye aquí tal
 * cual, sin agregar ningún nivel extra que no exista en el HTML fuente.
 *
 * Los botones hijos reutilizan `MxSubtabButton` (Sprint 3.3) sin
 * modificarlo: su implementación (`<button className={active ? 'on' : ''}
 * onClick={onClick}>{icon}{children}</button>`) no depende de ninguna clase
 * propia — `.mx-subtabs button`/`.mx-phonetabs button` son selectores
 * descendientes del HTML fuente que aplican igual sin importar el nombre
 * del contenedor padre. Reutilizarlo aquí evita duplicar código idéntico
 * (instrucción explícita del Sprint 3.10: "No duplicar componentes"). Ver
 * "Componentes reutilizados" en docs/sprints/sprint-3.10.md.
 */
export interface MxPhoneTabsProps {
  children: ReactNode;
}

export function MxPhoneTabs({ children }: MxPhoneTabsProps) {
  return <div className="mx-phonetabs">{children}</div>;
}
