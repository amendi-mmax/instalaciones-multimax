import { INSTALLERS } from '@/constants';
import { hashAngle } from '@/lib/utils';

/**
 * Radar — reconstruye `function Radar({ notified, instState, eligibleIds })`
 * de `Multimax_Despacho_v1.3.html` (líneas 1492-1745, Sprint 3.7). Es un
 * único componente SVG autocontenido: círculos concéntricos, líneas de
 * grilla tipo "calle", un sector de sweep animado (`.mx-sweep`), pines de
 * instaladores posicionados de forma determinística (`hashAngle` + distancia
 * en km) y una leyenda de 5 colores. NO hay ningún mapa real ni ninguna
 * librería de mapas — todo el "mapa" es SVG puro, tal como en el HTML
 * fuente.
 *
 * El brief original de este Sprint sugería una arquitectura multi-archivo
 * (`RadarMap`/`RadarMarker`/`RadarLegend`/`RadarOverlay`/`RadarControls`/
 * etc., bajo `src/components/radar/`) que **no corresponde a nada real del
 * HTML** — se descartó tras el análisis obligatorio. Ver "Determinación del
 * bloque pendiente" en `docs/sprints/sprint-3.7.md`. `CountRing` (líneas
 * 1437-1491, vecino en el archivo fuente) también se descartó explícitamente
 * de este Sprint: es un anillo de countdown sin relación visual con el
 * radar, reservado para el Sprint 3.8 ("Countdown").
 *
 * Props idénticas a las del HTML fuente (línea 2291-2295, invocación real
 * dentro de `Coordinator()`): `notified` (ids ya notificados), `instState`
 * (estado de cada instalador por id) y `eligibleIds` (ids elegibles de la
 * zona, en el HTML fuente `ELIGIBLE_ORDER`). Sin `useState` propio — todo el
 * cálculo de posición/color es derivado puro de las props, igual que en el
 * HTML fuente.
 */
export type RadarInstallerStatus =
  | 'notified'
  | 'opened'
  | 'responding'
  | 'responded'
  | 'confirmed'
  | 'selected'
  | 'declined'
  | 'lost';

export interface RadarInstallerState {
  state?: RadarInstallerStatus;
}

export interface RadarProps {
  notified: readonly string[];
  instState: Record<string, RadarInstallerState | undefined>;
  eligibleIds: readonly string[];
}

interface RadarDotStyle {
  fill: string;
  glow: string;
}

function dotFor(st: string): RadarDotStyle {
  switch (st) {
    case 'responded':
    case 'confirmed':
      return { fill: '#3be08a', glow: '#3be08a' };
    case 'selected':
      return { fill: '#a99bff', glow: '#a99bff' };
    case 'responding':
      return { fill: '#ffb23e', glow: '#ffb23e' };
    case 'opened':
      return { fill: '#34e1e8', glow: '#34e1e8' };
    case 'declined':
    case 'lost':
      return { fill: '#ff5c7a', glow: 'transparent' };
    case 'notified':
      return { fill: '#7f8db0', glow: 'transparent' };
    default:
      return { fill: '#3a4663', glow: 'transparent' };
  }
}

const S = 220;
const CX = S / 2;
const CY = S / 2;
const MAX_R = 96;
const GRID_OFFSETS = [-90, -54, -18, 18, 54, 90];
const RING_RADII = [46, 88, MAX_R];

function posFor(installerId: string, km: number): { x: number; y: number } {
  const ang = (hashAngle(installerId) * Math.PI) / 180;
  const rr = Math.min(MAX_R - 14, (km / 14) * (MAX_R - 20) + 22);
  return { x: CX + rr * Math.cos(ang), y: CY + rr * Math.sin(ang) };
}

export function Radar({ notified, instState, eligibleIds }: RadarProps) {
  const center = { x: CX, y: CY };
  const eligible = INSTALLERS.filter((i) => eligibleIds.includes(i.id));

  return (
    <div className="mx-radar-wrap">
      <svg width="100%" viewBox={`0 0 ${S} ${S}`} className="mx-radar">
        <defs>
          <radialGradient id="mxsweep" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(52,225,232,.14)" />
            <stop offset="70%" stopColor="rgba(52,225,232,.03)" />
            <stop offset="100%" stopColor="rgba(52,225,232,0)" />
          </radialGradient>
          <radialGradient id="mxmapfade" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(10,15,28,.9)" />
          </radialGradient>
          <clipPath id="mxmapclip">
            <circle cx={CX} cy={CY} r={MAX_R} />
          </clipPath>
        </defs>
        <circle
          cx={CX}
          cy={CY}
          r={MAX_R}
          fill="rgba(14,21,38,.7)"
          stroke="rgba(52,225,232,.22)"
          strokeWidth="1.5"
        />
        <g clipPath="url(#mxmapclip)" opacity="0.5">
          {GRID_OFFSETS.map((off, i) => (
            <line
              key={'v' + i}
              x1={CX + off}
              y1={CY - MAX_R}
              x2={CX + off}
              y2={CY + MAX_R}
              stroke="rgba(129,144,172,.16)"
              strokeWidth="1"
            />
          ))}
          {GRID_OFFSETS.map((off, i) => (
            <line
              key={'h' + i}
              x1={CX - MAX_R}
              y1={CY + off}
              x2={CX + MAX_R}
              y2={CY + off}
              stroke="rgba(129,144,172,.16)"
              strokeWidth="1"
            />
          ))}
          <line
            x1={CX - MAX_R}
            y1={CY - MAX_R * 0.6}
            x2={CX + MAX_R}
            y2={CY + MAX_R * 0.6}
            stroke="rgba(52,225,232,.12)"
            strokeWidth="2"
          />
          <line
            x1={CX - MAX_R * 0.6}
            y1={CY + MAX_R}
            x2={CX + MAX_R * 0.5}
            y2={CY - MAX_R}
            stroke="rgba(52,225,232,.12)"
            strokeWidth="2"
          />
        </g>
        {RING_RADII.map((r, i) => (
          <circle
            key={i}
            cx={CX}
            cy={CY}
            r={r}
            fill="none"
            stroke="rgba(52,225,232,.14)"
            strokeWidth="1"
            strokeDasharray="2 6"
          />
        ))}
        <g className="mx-sweep" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          <path
            d={`M${CX},${CY} L${CX},${CY - MAX_R} A${MAX_R},${MAX_R} 0 0 1 ${CX + MAX_R * 0.5},${CY - MAX_R * 0.866} Z`}
            fill="url(#mxsweep)"
          />
        </g>
        <g clipPath="url(#mxmapclip)">
          {eligible.map((i) => {
            if (!notified.includes(i.id)) return null;
            const p = posFor(i.id, i.km);
            const st = instState[i.id]?.state || 'notified';
            const active = ['responding', 'opened', 'responded', 'selected', 'confirmed'].includes(
              st,
            );
            return (
              <line
                key={'r' + i.id}
                x1={center.x}
                y1={center.y}
                x2={p.x}
                y2={p.y}
                stroke={active ? 'rgba(52,225,232,.35)' : 'rgba(129,144,172,.15)'}
                strokeWidth="1.4"
                strokeDasharray={active ? 'none' : '3 4'}
              />
            );
          })}
        </g>
        {eligible.map((i) => {
          const st = notified.includes(i.id) ? instState[i.id]?.state || 'notified' : 'idle';
          const d = dotFor(st);
          const active = ['responding', 'opened'].includes(st);
          const big = st === 'selected' || st === 'confirmed';
          if (st === 'idle') return null;
          const p = posFor(i.id, i.km);
          return (
            <g key={i.id}>
              {d.glow !== 'transparent' && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={active ? 11 : 8}
                  fill={d.glow}
                  opacity="0.18"
                  className={active ? 'mx-ping' : ''}
                />
              )}
              <path
                d={`M${p.x},${p.y - 9} C${p.x - 6},${p.y - 9} ${p.x - 6.5},${p.y - 2} ${p.x},${p.y + 4} C${p.x + 6.5},${p.y - 2} ${p.x + 6},${p.y - 9} ${p.x},${p.y - 9} Z`}
                fill={d.fill}
                stroke="#0a0f1c"
                strokeWidth="1.2"
                opacity={big ? 1 : 0.95}
              />
              <circle cx={p.x} cy={p.y - 6.5} r={2.4} fill="#0a0f1c" />
            </g>
          );
        })}
        <circle
          cx={CX}
          cy={CY}
          r={9}
          fill="none"
          stroke="#34e1e8"
          opacity="0.5"
          className="mx-ping"
        />
        <circle cx={CX} cy={CY} r={7} fill="#0a0f1c" stroke="#34e1e8" strokeWidth="2" />
        <circle cx={CX} cy={CY} r={3} fill="#34e1e8" />
        <rect x="0" y="0" width={S} height={S} fill="url(#mxmapfade)" clipPath="url(#mxmapclip)" />
      </svg>
      <div className="mx-radar-legend">
        <span>
          <i style={{ background: '#7f8db0' }} />
          Notificado
        </span>
        <span>
          <i style={{ background: '#34e1e8' }} />
          Abrió
        </span>
        <span>
          <i style={{ background: '#ffb23e' }} />
          Respondiendo
        </span>
        <span>
          <i style={{ background: '#3be08a' }} />
          Respondió
        </span>
        <span>
          <i style={{ background: '#a99bff' }} />
          Seleccionado
        </span>
      </div>
    </div>
  );
}
