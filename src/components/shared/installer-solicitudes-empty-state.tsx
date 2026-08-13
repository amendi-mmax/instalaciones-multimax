import { Bell } from 'lucide-react';

/**
 * InstallerSolicitudesEmptyState — reconstruye el único bloque JSX de la
 * pestaña "Solicitudes" de `function Installer(props)` alcanzable sin datos
 * ni lógica de negocio: la rama `if (!j || !notified) body = <div
 * className="mx-phone-empty">...` (`Multimax_Despacho_v1.3.html`, líneas
 * 3216-3223 — Sprint 3.10).
 *
 * En el HTML fuente, `Installer(props)` recibe `job: activeJob` desde
 * `App()` (derivado del motor de trabajos: `jobs`/`jobView`/`activeJob`),
 * que no existe todavía en este proyecto — mismo bloqueo ya documentado
 * para `Coordinator()`/`jobs.length === 0` en el Sprint 3.6
 * (`CoordinatorEmptyState`). Sin `job`, la condición `!j || !notified` es
 * siempre verdadera, así que este es el único estado de "Solicitudes"
 * reconstruible ahora mismo sin inventar datos — las siete ramas restantes
 * (`mx-alert`, `mx-offer`, `mx-phone-sent`, `mx-phone-done` en sus 3
 * variantes) dependen de `job`/`me`/`step` reales, fuera de alcance. Ver
 * "Determinación del bloque pendiente" en docs/sprints/sprint-3.10.md.
 *
 * Sin sub-componentes ni props: el HTML fuente no parametriza este bloque
 * (mensaje fijo, sin variables).
 */
export function InstallerSolicitudesEmptyState() {
  return (
    <div className="mx-phone-empty">
      <Bell size={26} />
      <p>No tienes solicitudes activas.</p>
      <span>Cuando Multimax publique un trabajo en tu zona, recibirás la alerta aquí.</span>
    </div>
  );
}
