import { Radio, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { Loading } from '@/components/ui/spinner';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { instaladoresRepository, ofertasRepository } from '@/repositories';
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
 * **Selección de ganador**: explícitamente fuera de alcance del Sprint 7.2
 * (brief: "selección del instalador ganador... queda explícitamente fuera
 * del Sprint"). Solo lectura.
 */
const SORT_TABS = [
  ['precio', 'Precio'],
  ['rating', 'Calif.'],
  ['km', 'Distancia'],
  ['responded', 'Tiempo'],
] as const;

type SortBy = (typeof SORT_TABS)[number][0];
type OfertaRow = TableRow<'ofertas'>;

export function ResponsesPanel() {
  const { activeJob, empresaId } = useOperationalContext();
  const trabajoId = activeJob?.trabajoId;

  const [sortBy, setSortBy] = useState<SortBy>('precio');
  const [ofertas, setOfertas] = useState<OfertaRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombreById, setNombreById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!trabajoId) {
      setOfertas(null);
      setError(null);
      return;
    }
    let active = true;
    setError(null);
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
    instaladoresRepository.getByEmpresaId(empresaId).then((result) => {
      if (!active) return;
      if (result.ok) {
        const map: Record<string, string> = {};
        for (const instalador of result.data) {
          map[instalador.id] = instalador.nombre;
        }
        setNombreById(map);
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
          {ofertasOrdenadas.map((oferta) => (
            <div key={oferta.id} className="mx-myjob" style={{ cursor: 'default' }}>
              <div className="mx-myjob-top">
                <span className="mx-myjob-t">{nombreById[oferta.instalador_id] ?? 'Instalador'}</span>
                <span className="mx-myjob-price">${oferta.precio}</span>
              </div>
              <div className="mx-myjob-meta">
                <span>{oferta.dia} · {oferta.hora}</span>
                {oferta.comentario ? <span>{oferta.comentario}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
