/**
 * InstallerPriorityRules — portado verbatim del contenido de la segunda
 * tarjeta `.mx-card.mx-mini` dentro de `.mx-instside`: la lista
 * `.mx-rules` de 5 ítems estáticos (JSX de referencia: `Installer()`
 * en `Multimax_Despacho_v1.3.html`, líneas 3443-3450 — Sprint 3.2). El
 * encabezado "Reglas de prioridad" (`.mx-section-h`) vive en
 * `InstallerSidebarCard`, que envuelve a este componente. Sin props:
 * los 5 textos son literales fijos del HTML, no datos de negocio.
 *
 * Nota importante (reportada, no corregida): el HTML fuente contiene
 * una SEGUNDA lista `.mx-rules` de "Reglas de prioridad", dentro de
 * `InstallerProfile()` (la pantalla completa de perfil, `.mx-profblock`,
 * líneas ~3526), con solo 4 ítems — le falta el quinto ("No puedes
 * aceptar dos trabajos con horarios en conflicto."). Este Sprint migra
 * ÚNICAMENTE la versión de `.mx-instside` (5 ítems, la de este
 * componente); la versión de 4 ítems dentro de `InstallerProfile()`
 * queda fuera de alcance de 3.2 y se migrará tal cual (con sus propios
 * 4 ítems, sin "corregirla" para que coincida con esta) cuando le
 * corresponda su propio Sprint. Ver "Dependencias/riesgos" en
 * `docs/sprints/sprint-3.2.md`.
 */
export function InstallerPriorityRules() {
  return (
    <ul className="mx-rules">
      <li>
        Responder rápido y cumplir <b>sube</b> tu prioridad.
      </li>
      <li>
        Ignorar solicitudes <b>baja</b> tu prioridad.
      </li>
      <li>Cancelar tras aceptar afecta tu calificación.</li>
      <li>El precio más bajo no garantiza la asignación.</li>
      <li>No puedes aceptar dos trabajos con horarios en conflicto.</li>
    </ul>
  );
}
