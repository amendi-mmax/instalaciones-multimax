import { CheckCircle2, Radio, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { Loading, Spinner } from '@/components/ui/spinner';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { empresasInstaladorasRepository, instaladoresRepository, ofertasRepository } from '@/repositories';
import { callAsignarInstalador } from '@/services/database.service';
import type { TableRow } from '@/services/database.service';

/**
 * ResponsesPanel — Sprint 5.1.3 (estado vacío) + Sprint 7.2 (ofertas
 * reales). Reconstruye la tarjeta "Respuestas en tiempo real" de
 * `Coordinator(props)` (encabezado + `mx-sort` + lista/estado vacío).
 *
 * **Sprint 7.2**: ya no asume un job de demostración -- lee `activeJob`
 * (`useOperationalContext()`, el mismo trabajo recién publicado que ya
 * consumen `TrabajosPage`/`master-calendar.tsx` desde el Sprint 7.1) y, si
 * tiene `trabajoId` real, consulta `ofertasRepository.getByTrabajoId()`
 * (Objetivo 5 del Sprint: "el Coordinador deberá visualizar todas las
 * ofertas recibidas"). Sin `activeJob`/`trabajoId` (caso demo/sin trabajo
 * activo), el comportamiento es idéntico al de antes de este Sprint --
 * estado vacío fijo, cero regresión.
 *
 * `.mx-resp`/`.mx-feed` (el diseño original del HTML para esta lista) nunca
 * se portaron a `globals.css` (documentado desde el Sprint 5.1.3, "no se
 * agrega todavía") -- se reutiliza en su lugar el lenguaje visual ya
 * existente de `.mx-myjob*` (Sprint 3.12/7.2), consistente con el resto de
 * la UI nueva de este mismo Sprint, en vez de inventar una clase nueva.
 *
 * **Nombre del instalador**: `ofertas.instalador_id` es un uuid sin nombre
 * denormalizado (mismo patrón ya resuelto para `tienda_id` en
 * `master-calendar.tsx`, Sprint 7.1) -- se resuelve con un mapa
 * `instaladoresRepository.getByEmpresaId(empresaId)`, una sola consulta,
 * no N+1.
 *
 * **Orden (`sortBy`)**: `precio`/`responded` (por `enviado_at`) ya ordenan
 * datos reales. `rating`/`km` quedan tal como estaban (visualmente
 * funcionales, sin efecto) -- son atributos del instalador, no de la
 * oferta; unirlos requeriría una consulta adicional fuera del alcance
 * mínimo de este Sprint ("visualizar las ofertas", no "ordenar por
 * calidad del instalador") -- limitación conocida, documentada, no
 * silenciada.
 *
 * **Selección de ganador** (Ajustes funcionales del flujo Instalador):
 * explícitamente fuera de alcance del Sprint 7.2 -- implementada acá por
 * primera vez en todo el proyecto. Botón "Asignar" por oferta, invoca
 * `callAsignarInstalador()` (RPC real `asignar_instalador`, ya existente
 * desde Sprint 4.1.1B, nunca consumido por ningún componente hasta ahora
 * -- confirmado por auditoría previa). Requiere las policies RLS nuevas de
 * UPDATE sobre `trabajos`/`trabajo_instaladores` para `admins` (migración
 * `0019` -- `coordinadores` ya tenía las suyas desde `0001`), para que
 * tanto un Coordinador real como un Administrador en "Modo Coordinador"
 * puedan ejecutar la asignación bajo su propia sesión (el RPC es
 * `SECURITY INVOKER`, corre con los permisos reales de quien lo invoca).
 * Tras una asignación exitosa, el estado local `asignadoId` deshabilita el
 * resto de los botones de esta lista (ya no tiene sentido asignar dos
 * veces el mismo trabajo) -- el `trabajo.estado` real pasa a `'assigned'`
 * en la base de datos, visible de inmediato en "Mis trabajos" del
 * instalador ganador en su próxima carga (vía `trabajos_para_instalador`,
 * columna `gane_yo`, sin ningún cambio adicional necesario ahí).
 *
 * **Ajustes finales del flujo Instalador**: hasta esta ronda, este panel
 * solo podía mostrar ofertas del `activeJob` en memoria de
 * `OperationalContextProvider` -- un Admin/Coordinador que recargaba la
 * página o entraba a un trabajo `live` distinto desde "Mis trabajos"
 * (`TrabajoDetailPage.tsx`) no tenía forma de ver sus ofertas reales
 * (seguían existiendo en `ofertas`, solo dejaban de ser visibles). Se
 * agrega el prop opcional `trabajoId`: si se recibe, tiene prioridad sobre
 * `activeJob?.trabajoId` -- `DespachoPage.tsx` sigue invocando
 * `<ResponsesPanel />` sin props, cero cambio de comportamiento ahí.
 * `TrabajoDetailPage.tsx` pasa el `id` real del trabajo consultado.
 *
 * También se agrega "Empresa instaladora" por oferta (pedido explícito del
 * ajuste) -- mismo patrón ya usado en `AdminInstaladores`
 * (`empresasInstaladorasRepository.listar(empresaId)` + mapa id -> nombre),
 * sin duplicar esa lógica: una sola consulta adicional, no N+1.
 */
const SORT_TABS = [
  ['precio', 'Precio'],
  ['rating', 'Calif.'],
  ['km', 'Distancia'],
  ['responded', 'Tiempo'],
] as const;

type SortBy = (typeof SORT_TABS)[number][0];
type OfertaRow = TableRow<'ofertas'>;

export interface ResponsesPanelProps {
  /** Si se omite, usa `activeJob?.trabajoId` (comportamiento histórico). */
  trabajoId?: string;
  /**
   * Evolución de Despacho en vivo — se invoca justo después de una
   * asignación exitosa (mismo punto donde ya se hace `setAsignadoId`), para
   * que el contenedor (`DespachoPage.tsx`) pueda refrescar su lista de
   * trabajos `live` (el trabajo recién asignado deja de ser `live`). No
   * reemplaza ni modifica el comportamiento ya existente de ocultar el
   * botón "Asignar" (`asignadoId`) -- es un aviso adicional, opcional.
   */
  onAsignado?: () => void;
}

export function ResponsesPanel({ trabajoId: trabajoIdProp, onAsignado }: ResponsesPanelProps = {}) {
  const { activeJob, empresaId } = useOperationalContext();
  const trabajoId = trabajoIdProp ?? activeJob?.trabajoId;

  const [sortBy, setSortBy] = useState<SortBy>('precio');
  const [ofertas, setOfertas] = useState<OfertaRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombreById, setNombreById] = useState<Record<string, string>>({});
  const [empresaInstaladoraById, setEmpresaInstaladoraById] = useState<Record<string, string>>({});
  const [asignandoId, setAsignandoId] = useState<string | null>(null);
  const [asignadoId, setAsignadoId] = useState<string | null>(null);
  const [asignarError, setAsignarError] = useState<string | null>(null);

  useEffect(() => {
    if (!trabajoId) {
      setOfertas(null);
      setError(null);
      return;
    }
    let active = true;
    setError(null);
    setAsignadoId(null);
    setAsignarError(null);
    ofertasRepository.getByTrabajoId(trabajoId).then((result) => {
      if (!active) return;
      if (result.ok) {
        setOfertas(result.data);
      } else {
        setError(result.error.message);
      }
    });
    return () => {
      active = false;
    };
  }, [trabajoId]);

  useEffect(() => {
    if (!empresaId) return;
    let active = true;
    Promise.all([
      instaladoresRepository.getByEmpresaId(empresaId),
      empresasInstaladorasRepository.listar(empresaId),
    ]).then(([instaladoresResult, empresasResult]) => {
      if (!active) return;

      const nombresEmpresasInstaladoras: Record<string, string> = {};
      if (empresasResult.ok) {
        for (const empresa of empresasResult.data) {
          nombresEmpresasInstaladoras[empresa.id] = empresa.nombre;
        }
      }

      if (instaladoresResult.ok) {
        const nombres: Record<string, string> = {};
        const empresasPorInstalador: Record<string, string> = {};
        for (const instalador of instaladoresResult.data) {
          nombres[instalador.id] = instalador.nombre;
          empresasPorInstalador[instalador.id] = instalador.empresa_instaladora_id
            ? (nombresEmpresasInstaladoras[instalador.empresa_instaladora_id] ?? 'Pendiente de asignación')
            : 'Pendiente de asignación';
        }
        setNombreById(nombres);
        setEmpresaInstaladoraById(empresasPorInstalador);
      }
    });
    return () => {
      active = false;
    };
  }, [empresaId]);

  const ofertasOrdenadas = ofertas
    ? [...ofertas].sort((a, b) => {
        if (sortBy === 'precio') return a.precio - b.precio;
        if (sortBy === 'responded') {
          return new Date(a.enviado_at).getTime() - new Date(b.enviado_at).getTime();
        }
        // 'rating'/'km': sin datos reales de instalador unidos en esta
        // consulta -- orden inerte, ver JSDoc arriba.
        return 0;
      })
    : [];

  const asignar = async (oferta: OfertaRow) => {
    if (!trabajoId || asignandoId) return;
    setAsignarError(null);
    setAsignandoId(oferta.instalador_id);
    const result = await callAsignarInstalador({
      p_trabajo_id: trabajoId,
      p_instalador_id: oferta.instalador_id,
    });
    setAsignandoId(null);

    if (!result.ok) {
      setAsignarError(result.error.message);
      return;
    }
    setAsignadoId(oferta.instalador_id);
    onAsignado?.();
  };

  return (
    <Card className="mx-feedcard">
      <CardHeader
        icon={<Users size={14} />}
        cardTitle="Respuestas en tiempo real"
        action={
          <div className="mx-sort">
            {SORT_TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={sortBy === key ? 'on' : ''}
                onClick={() => setSortBy(key)}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />
      {/* Evolución de Despacho en vivo -- indicador "N ofertas recibidas"
          pedido explícitamente, mismo dato ya disponible (`ofertasOrdenadas.
          length`), sin consulta adicional. Solo se muestra cuando hay un
          trabajo real consultado y al menos una oferta -- para 0 ofertas ya
          existe el EmptyState de abajo, no hace falta repetirlo acá. */}
      {trabajoId && ofertasOrdenadas.length > 0 ? (
        <p className="mx-sub" style={{ marginBottom: 8 }}>
          {ofertasOrdenadas.length} oferta{ofertasOrdenadas.length === 1 ? '' : 's'} recibida
          {ofertasOrdenadas.length === 1 ? '' : 's'}
        </p>
      ) : null}
      {trabajoId && error ? (
        <p className="mx-sub" style={{ color: 'var(--red)' }}>
          {error}
        </p>
      ) : trabajoId && ofertas === null ? (
        <Loading label="Cargando ofertas…" />
      ) : ofertasOrdenadas.length === 0 ? (
        <EmptyState
          size="compact"
          icon={<Radio size={22} />}
          description={
            <>
              Esperando propuestas… Pulsa <b>Simular respuestas</b> o responde desde la vista{' '}
              <b>Instalador</b>.
            </>
          }
        />
      ) : (
        <div className="mx-myjobs">
          {asignarError ? (
            <p className="mx-sub" style={{ color: 'var(--red)' }}>
              {asignarError}
            </p>
          ) : null}
          {ofertasOrdenadas.map((oferta) => (
            <div key={oferta.id} className="mx-myjob" style={{ cursor: 'default' }}>
              <div className="mx-myjob-top">
                <span className="mx-myjob-t">{nombreById[oferta.instalador_id] ?? 'Instalador'}</span>
                <span className="mx-myjob-price">${oferta.precio}</span>
              </div>
              <div className="mx-myjob-meta">
                <span>{empresaInstaladoraById[oferta.instalador_id] ?? 'Pendiente de asignación'}</span>
                <span>{oferta.dia} · {oferta.hora}</span>
                {oferta.comentario ? <span>{oferta.comentario}</span> : null}
              </div>
              <div style={{ marginTop: 4 }}>
                <Badge tone="ice">Oferta enviada</Badge>
              </div>
              {asignadoId === oferta.instalador_id ? (
                <div className="mx-invite-ok" style={{ marginTop: 6 }}>
                  <CheckCircle2 size={14} />
                  <span>Instalador asignado a este trabajo.</span>
                </div>
              ) : (
                <Button
                  variant="ice"
                  style={{ width: '100%', marginTop: 6 }}
                  disabled={asignandoId !== null || asignadoId !== null}
                  onClick={() => void asignar(oferta)}
                >
                  {asignandoId === oferta.instalador_id ? <Spinner size={16} /> : 'Asignar'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
