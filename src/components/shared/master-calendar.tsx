import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { useState } from 'react';

import { PageContainer, PageHead } from '@/components/shared/page-container';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ESTADO, SUCURSALES, SUSCOL, TRABAJOS } from '@/constants';

/**
 * MasterCalendar — reconstruye verbatim `function MasterCalendar()`
 * (`Multimax_Despacho_v1.3.html`, líneas 2825-3028), el calendario de todos
 * los trabajos de todas las sucursales del panel de Administrador (Sprint
 * 3.14). Selector raíz `.mx-page` (vía `PageContainer`), con `.mx-pagehead`
 * (vía `PageHead`, `action` = selector de sucursal), `.mx-cal-outer`
 * (encabezado de mes + grilla de días) y, cuando hay un día seleccionado,
 * `.mx-card.mx-daylist` con la lista de trabajos de ese día; cierra con la
 * leyenda de colores por sucursal.
 *
 * **Integración**: `MasterCalendar` es consumido por `AdminPanel` (Sprint
 * 3.13) en su rama real `tab === "calendario"` — coincide 1:1 con el HTML
 * fuente (`tab === "calendario" ? React.createElement(MasterCalendar, null)
 * : React.createElement(AdminInstaladores, null)`), que hasta este Sprint
 * renderizaba `null` (limitación documentada en el Sprint 3.13). No requiere
 * ningún cambio en `RootLayout.tsx`: el contenedor real (`AdminPanel`) ya
 * existe desde el Sprint 3.13.
 *
 * **Relación con `CoordinatorJobs`/`isMaster` (reportado, fuera de alcance)**:
 * el HTML fuente también renderiza `MasterCalendar` desde
 * `CoordinatorJobs({ isMaster })` (línea 2661: `if (isMaster) return
 * React.createElement(MasterCalendar, null)`) — un segundo punto de montaje
 * para el rol "coordinador master". `CoordinatorJobs()` en sí no está
 * construido todavía (no tiene Sprint asignado), así que ese segundo
 * consumidor queda fuera de alcance; `MasterCalendar` se integra aquí
 * únicamente desde `AdminPanel`, el único contenedor real que ya existe en
 * el proyecto.
 *
 * **Reutilización**: `PageContainer`/`PageHead` (Fase 3), `Card` (Fase 3,
 * sin `CardHeader` — el HTML fuente usa un `.mx-daylist-hd` propio con
 * `h3`+Pill, no el patrón `.mx-section-h`), `Badge` (Fase 3, para el helper
 * `Pill` del HTML — mismo criterio que el resto de Sprints de Fase 3 en
 * adelante), `SUCURSALES` (Sprint 3.4) y `ESTADO` (Sprint 3.12, portado
 * íntegro ese Sprint) — ninguna reconstrucción nueva de esos catálogos.
 * `SUSCOL`/`TRABAJOS` son nuevas constantes agregadas en este Sprint (ver
 * `src/constants/index.ts`), portadas íntegras (9 sucursales / 13 trabajos)
 * aunque el HTML fuente también las reutiliza dentro de `CoordinatorJobs()`
 * (fuera de alcance) — mismo criterio ya aplicado a `ESTADO`.
 *
 * **`MESES`/`DOFW`**: arrays de etiquetas de UI (nombres de mes / días de la
 * semana), no datos de negocio — se definen a nivel de módulo (no dentro del
 * componente, para no recrearlos en cada render) en este mismo archivo, no en
 * `src/constants/`, mismo criterio ya aplicado a `GRUPOS` en `InstallerJobs`
 * (Sprint 3.12): la regla de preparación para Supabase aplica a colecciones
 * de datos de negocio (`TRABAJOS`, `SUSCOL`), no a etiquetas estructurales de
 * UI.
 *
 * **Adaptación técnica documentada (no visual)**: el HTML fuente resuelve el
 * color de sucursal con un fallback defensivo `SUSCOL[sucursal] || {}` (para
 * el caso hipotético de una sucursal sin color asignado). En TypeScript
 * estricto, indexar `Record<string, SucursalColor>` siempre devuelve
 * `SucursalColor` (no `SucursalColor | undefined`, sin `noUncheckedIndexedAccess`
 * en `tsconfig.app.json`), y el fallback `|| {}` produciría un error de tipo
 * (`{}` no tiene `bg`/`fg`) sin aportar ninguna sucursal real que no esté ya
 * en `SUSCOL` (las 13 entradas de `TRABAJOS` solo usan sucursales de las 9 de
 * `SUCURSALES`/`SUSCOL`). Se omite ese fallback — el resto de la lógica
 * (incluidas las comprobaciones `c ? c.fg : ...` / `c.bg || ...` que sí
 * siguen siendo válidas en TS) se mantiene verbatim.
 *
 * Sin props, mismo criterio que `AdminInstaladores`/`InstallerJobs` — el
 * HTML fuente tampoco recibe ninguna.
 */
const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

const DOFW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export function MasterCalendar() {
  const hoy = new Date();
  const [viewYear, setViewYear] = useState(hoy.getFullYear());
  const [viewMonth, setViewMonth] = useState(hoy.getMonth());
  const [selDate, setSelDate] = useState<string | null>(null);
  const [filtroSuc, setFiltroSuc] = useState('Todas');

  const prevM = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextM = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const trabMes = TRABAJOS.filter((t) => {
    const d = new Date(`${t.fecha}T00:00`);
    return (
      d.getFullYear() === viewYear &&
      d.getMonth() === viewMonth &&
      (filtroSuc === 'Todas' || t.sucursal === filtroSuc)
    );
  });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const ds = (d: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const jobsForDay = (d: number) =>
    trabMes.filter((t) => new Date(`${t.fecha}T00:00`).getDate() === d);
  const isToday = (d: number) =>
    d === hoy.getDate() && viewMonth === hoy.getMonth() && viewYear === hoy.getFullYear();

  const selJobs = selDate
    ? TRABAJOS.filter(
        (t) => t.fecha === selDate && (filtroSuc === 'Todas' || t.sucursal === filtroSuc),
      )
    : [];

  return (
    <PageContainer>
      <PageHead
        title="Calendario maestro"
        subtitle="Todos los trabajos de todas las sucursales"
        action={
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Sucursal:</span>
            <select
              value={filtroSuc}
              onChange={(e) => setFiltroSuc(e.target.value)}
              style={{
                background: 'var(--ink)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                color: 'var(--text)',
                padding: '6px 10px',
                fontSize: 13,
              }}
            >
              <option value="Todas">Todas</option>
              {SUCURSALES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        }
      />
      <div className="mx-cal-outer">
        <div className="mx-cal-hd">
          <span className="mx-cal-month">
            {MESES[viewMonth]} {viewYear}
          </span>
          <div className="mx-cal-nav">
            <button type="button" onClick={prevM}>
              ‹
            </button>
            <button type="button" onClick={nextM}>
              ›
            </button>
          </div>
        </div>
        <div className="mx-cal-grid">
          {DOFW.map((d) => (
            <div key={d} className="mx-cal-dow">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const jobs = jobsForDay(day);
            const dstr = ds(day);
            const isSel = selDate === dstr;
            return (
              <div
                key={dstr}
                className={`mx-cal-day${jobs.length ? ' has-jobs' : ''}${isSel ? ' sel' : ''}${isToday(day) ? ' today' : ''}`}
                onClick={() => setSelDate(isSel ? null : dstr)}
              >
                <span className="mx-cal-dn">{day}</span>
                {jobs.length > 0 ? (
                  <div className="mx-cal-dots">
                    {jobs.slice(0, 5).map((t, j) => {
                      const c = SUSCOL[t.sucursal];
                      return (
                        <span
                          key={j}
                          className="mx-cal-dot"
                          style={{ background: c ? c.fg : '#8190ac' }}
                        />
                      );
                    })}
                    {jobs.length > 5 ? (
                      <span className="mx-cal-count">+{jobs.length - 5}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      {selDate ? (
        <Card className="mx-daylist">
          <div className="mx-daylist-hd">
            <h3>
              <Calendar size={15} />
              {new Date(`${selDate}T00:00`).toLocaleDateString('es-PA', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
            <Badge tone="muted">
              {selJobs.length} trabajo{selJobs.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          {selJobs.length === 0 ? (
            <div className="mx-empty" style={{ padding: '20px 0' }}>
              <span>
                No hay trabajos para este día
                {filtroSuc !== 'Todas' ? ` en ${filtroSuc}` : ''}
              </span>
            </div>
          ) : (
            <div className="mx-joblist">
              {selJobs.map((t) => {
                const e = ESTADO[t.estado] ?? ESTADO.pendiente;
                const sc = SUSCOL[t.sucursal];
                return (
                  <div key={t.id} className="mx-jobrow" style={{ cursor: 'default' }}>
                    <div className="mx-jobrow-main">
                      <div className="mx-jobrow-top">
                        <span className="mx-jobrow-id">{t.id}</span>
                        <Badge tone={e.tone}>{e.label}</Badge>
                        {sc.fg ? (
                          <span
                            className="mx-suc-badge"
                            style={{ background: sc.bg, color: sc.fg }}
                          >
                            {t.sucursal}
                          </span>
                        ) : null}
                      </div>
                      <div className="mx-jobrow-t">{t.tipo}</div>
                      <div className="mx-jobrow-meta">
                        <span>
                          <MapPin size={12} />
                          {t.zona}
                        </span>
                        <span>
                          <Clock size={12} />
                          {t.hora}
                        </span>
                        {t.instalador ? (
                          <span>
                            <User size={12} />
                            {t.instalador}
                          </span>
                        ) : null}
                        <span
                          style={{
                            fontFamily: 'var(--fm)',
                            fontWeight: 700,
                            color: 'var(--green)',
                            fontSize: 12,
                          }}
                        >
                          ${t.precio}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
        {SUCURSALES.map((s) => {
          const c = SUSCOL[s];
          return (
            <span
              key={s}
              className="mx-suc-badge"
              style={{
                background: c.bg || 'rgba(129,144,172,.1)',
                color: c.fg || '#8190ac',
                fontSize: 11,
                padding: '3px 9px',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: c.fg,
                  display: 'inline-block',
                  marginRight: 4,
                }}
              />
              {s}
            </span>
          );
        })}
      </div>
    </PageContainer>
  );
}
