/**
 * HeaderBrand — portado verbatim de `.mx-brand` (JSX de referencia: `App()`
 * en Multimax_Despacho_v1.3.html, líneas 2031–2041). Estático, sin props:
 * el prototipo no tiene ningún dato dinámico en esta sección (logo, nombre
 * y tagline son siempre los mismos).
 *
 * Corrección de fidelidad (Sprint 3.1): en Fase 3 este bloque se había
 * reconstruido con el ícono `RadioTower` de lucide-react por error. El
 * código fuente usa `Radio` (`React.createElement(Radio, { size: 18 })`,
 * línea 2035) — el path del SVG estático embebido en el HTML (círculo +
 * arcos concéntricos) corresponde al ícono `Radio`, no a una torre. Corregido.
 *
 * **Ajuste de branding**: el ícono genérico `Radio` se reemplaza por el
 * emblema oficial de MULTIMAX (`public/multimax-emblem.png` -- recorte
 * directo, sin redibujar, del archivo fuente proporcionado por el usuario,
 * `Logo Multimax_1920 px_Vert_Color.png`, aislando únicamente el gráfico
 * M+swoosh y descartando la palabra "MULTIMAX" incluida en el logo
 * vertical completo -- el texto `.mx-brand-t` de abajo ya la muestra,
 * evitar la duplicación visual). `.mx-logo` deja de ser una caja cuadrada
 * con gradiente/sombra (esos estilos eran del ícono plano `Radio`) -- ver
 * `globals.css` para el detalle del ajuste de tamaño/proporción.
 */
export function HeaderBrand() {
  return (
    <div className="mx-brand">
      <div className="mx-logo">
        <img src="/multimax-emblem.png" alt="Multimax" />
      </div>
      <div>
        <div className="mx-brand-t">MULTIMAX</div>
        <div className="mx-brand-s">Despacho en vivo</div>
      </div>
    </div>
  );
}
