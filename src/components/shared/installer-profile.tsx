import { MapPin, ShieldAlert, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { InstallerMock } from '@/constants';

/**
 * InstallerProfile — reconstruye verbatim `function InstallerProfile({
 * meInfo })` (`Multimax_Despacho_v1.3.html`, líneas ~3491-3524, selector
 * raíz `.mx-profscreen`), la pantalla de "Perfil" dentro del teléfono del
 * Instalador (Sprint 3.11).
 *
 * Confirmación del nombre del Sprint (brief 3.11 exige NO asumirlo): el
 * nombre "Installer Profile" de `docs/SPRINTS_INDEX.md` SÍ corresponde
 * exactamente a una función real del HTML fuente — `function
 * InstallerProfile({ meInfo })` existe tal cual, con ese nombre exacto,
 * inmediatamente después de `InstallerJobs()` (línea 3453, Sprint 3.12) y
 * antes de `ConfirmCancel`. A diferencia de la mayoría de los Sprints
 * anteriores (3.4/3.6/3.9/3.10), aquí NO hubo que corregir el nombre.
 *
 * En `Installer(props)`, este componente se monta cuando `instTab ===
 * "perfil"` (línea ~3427: `React.createElement(InstallerProfile, { meInfo:
 * meInfo })`). En el proyecto React, ese mismo lugar corresponde a la rama
 * `instTab === 'perfil'` de `InstallerDashboard` (Sprint 3.10), que hoy
 * renderiza `null` — ver JSDoc de `installer-dashboard.tsx`, que reserva
 * explícitamente ese contenido para este Sprint. Por la regla del brief de
 * NO modificar "InstallerDashboard aprobado en Sprint 3.10", este componente
 * NO se conecta aquí a esa rama — ver la integración temporal como hermano
 * independiente documentada en `RootLayout.tsx` (mismo criterio ya usado
 * para `CountRing` en el Sprint 3.8, cuyo destino real tampoco existía
 * todavía dentro del flujo de "Solicitudes").
 *
 * Reutilización: el helper interno `Pill` del HTML (usado aquí como
 * `React.createElement(Pill, { tone: "green" }, ...)`) corresponde al
 * componente ya existente `Badge` (`.mx-pill`, Fase 3) con `tone="green"` —
 * NO a `StatusBadge`, que agrega una capa semántica estado→tono que no
 * existe en este uso crudo (`Pill tone="green"` fijo, sin mapeo de estado).
 *
 * Diferencia intencional (NO corregida, reportada): la lista `.mx-rules`
 * "Reglas de prioridad" de este bloque tiene únicamente 4 ítems — le falta
 * el quinto ítem ("No puedes aceptar dos trabajos con horarios en
 * conflicto.") presente en la versión de 5 ítems de `mx-instside`
 * (`InstallerPriorityRules`, Sprint 3.2, ya documentado allí mismo). Ambas
 * listas se migran tal cual, sin unificarlas, por fidelidad 1:1 al HTML.
 * Por el mismo motivo, esta lista NO reutiliza `InstallerPriorityRules`
 * (tiene contenido distinto) — se reconstruye inline, igual que en el HTML
 * fuente (JSX propio de `InstallerProfile`, no una función compartida).
 *
 * `inicial` reconstruye `meInfo && meInfo.nombre ? meInfo.nombre[0] : "M"`
 * (línea ~3492) — fallback literal `"M"` del HTML fuente, no inventado.
 *
 * Sin estado propio, sin efectos: función pura derivada de `meInfo`, igual
 * que en el HTML fuente.
 */
export interface InstallerProfileProps {
  meInfo: InstallerMock;
}

export function InstallerProfile({ meInfo }: InstallerProfileProps) {
  const inicial = meInfo && meInfo.nombre ? meInfo.nombre[0] : 'M';

  return (
    <div className="mx-profscreen">
      <div className="mx-profhero">
        <div className="mx-profava">{inicial}</div>
        <div className="mx-profname">{meInfo.nombre}</div>
        <div className="mx-profzone">
          <MapPin size={12} />
          {meInfo.zona}
        </div>
        <Badge tone="green">
          <ShieldCheck size={11} />
          Instalador verificado
        </Badge>
      </div>
      <div className="mx-profstats">
        <div className="mx-profstat">
          <b>{meInfo.rating}</b>
          <span>Calificación</span>
        </div>
        <div className="mx-profstat">
          <b>{meInfo.cumpl}%</b>
          <span>Cumplimiento</span>
        </div>
        <div className="mx-profstat">
          <b>{meInfo.acept}%</b>
          <span>Aceptación</span>
        </div>
        <div className="mx-profstat">
          <b>{meInfo.km} km</b>
          <span>Distancia prom.</span>
        </div>
      </div>
      <div className="mx-profblock">
        <h4>
          <ShieldAlert size={13} />
          Reglas de prioridad
        </h4>
        <ul className="mx-rules">
          <li>
            Responder rápido y cumplir <b>sube</b> tu prioridad.
          </li>
          <li>
            Ignorar solicitudes <b>baja</b> tu prioridad.
          </li>
          <li>Cancelar tras aceptar afecta tu calificación.</li>
          <li>El precio más bajo no garantiza la asignación.</li>
        </ul>
      </div>
    </div>
  );
}
