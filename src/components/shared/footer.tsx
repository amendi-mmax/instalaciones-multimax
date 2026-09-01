/**
 * Footer — portado verbatim de `.mx-foot`. Compartido por Coordinador
 * (`CoordinatorLayout.tsx`) e Instalador/Admin (`RootLayout.tsx`) — ver
 * JSDoc histórico de ambos archivos, que ya documentaba este componente
 * como global desde el Sprint 5.1.2.
 *
 * Ajustes finales del flujo de Instaladores: se agrega una segunda línea de
 * copyright debajo del disclaimer existente (que se mantiene sin cambios,
 * mismo texto/posición) — misma clase `.mx-foot` (`text-align:center`,
 * `line-height:1.6`, `color:var(--muted)`), sin CSS nuevo: un `<div>`
 * adicional dentro del `<footer>` hereda esos mismos estilos, se ve como
 * una segunda línea del mismo bloque, no como una alerta separada.
 */
export function Footer() {
  return (
    <footer className="mx-foot">
      <div>Las dos vistas — Coordinador e Instalador — comparten el mismo trabajo en vivo.</div>
      <div style={{ marginTop: 4, opacity: 0.7 }}>© 2026 Multimax.net · Hecho con ❤️ por Multimax.net</div>
    </footer>
  );
}
