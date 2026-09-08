import { ArrowUpRight, Calendar, CheckCircle2, ChevronRight, Radio, RefreshCw, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { Loading, Spinner } from '@/components/ui/spinner';
import { useOperationalContext } from '@/hooks/useOperationalContext';
import { createRealtimeChannel, removeRealtimeChannel } from '@/lib/supabase/realtime';
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
 * `.mx-resp`/`.mx-feed` (el diseño original del HTML para esta lista) no se
 * portaron a `globals.css` hasta la RONDA DE CORRECCIÓN VISUAL -- hasta
 * entonces se reutilizaba `.mx-myjob*` (Sprint 3.12/7.2, el lenguaje visual
 * del listado del Instalador) como sustituto aproximado. Esa ronda inspeccionó
 * directamente `Multimax_Despacho_v1.3.html` (líneas 106-120 del `<style>`
 * y ~2384-2421 del JSX del prototipo) y portó las clases reales
 * (`.mx-feed`/`.mx-resp`/`.mx-resp-main`/`.mx-resp-top`/`.mx-resp-name`/
 * `.mx-resp-grid`/`.mx-price`/`.mx-resp-com`/`.mx-select`) verbatim -- ver
 * el bloque "RONDA DE CORRECCIÓN VISUAL" más abajo para el detalle completo
 * de qué se mantuvo, qué se omitió (por no existir en el modelo real) y qué
 * se conservó como adición real ya autorizada (empresa instaladora).
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
 *
 * **RONDA DE CORRECCIÓN — "no inventar lógica funcional / usar datos
 * reales"**: la ronda anterior ("Corrección estructural del Despacho en
 * vivo") había agregado una simulación 100% en memoria (`simulateTrigger`/
 * `simuladas`) disparada por "Simular respuestas". El usuario identificó
 * correctamente el problema conceptual: eso hacía "parecer" que el panel
 * funcionaba, sin representar el flujo real de ofertas de instaladores.
 * Se retira por completo (`simulateTrigger`/`simuladas`/el `useEffect` que
 * las generaba/el badge "Simulada") -- ver `live-dispatch-card.tsx` para el
 * reporte del gap real detrás de "Simular respuestas" (no existe, en el
 * backend actual, ningún mecanismo de "iniciar/publicar una ronda" distinto
 * de que el trabajo ya esté `estado='live'` -- un instalador puede ofertar
 * en cualquier momento mientras dure ese estado, vía `submit_bid()`
 * (`InstallerSolicitudes` → `callSubmitBid()`, RPC real que inserta en
 * `ofertas` -- `docs/database/DATABASE_INVENTORY.md` §5). El botón vuelve a
 * su estado `disabled` original, con un `title` que reporta ese gap en vez
 * de fingir una funcionalidad).
 *
 * **Ofertas en tiempo real (nuevo, esta ronda)**: además de la carga
 * inicial (`ofertasRepository.getByTrabajoId()`, sin cambios), se agrega
 * una suscripción real de Supabase Realtime a `postgres_changes` (evento
 * `INSERT` sobre `public.ofertas`, filtrado server-side por
 * `trabajo_id=eq.<trabajoId>`) -- verificado por MCP antes de escribir
 * código que `ofertas` YA pertenece a la publicación `supabase_realtime`
 * (junto con `trabajo_instaladores`/`trabajos`), así que esto NO requiere
 * ninguna migración/cambio de configuración de Supabase, solo código de
 * cliente. Reutiliza `createRealtimeChannel`/`removeRealtimeChannel`
 * (`src/lib/supabase/realtime.ts`, infraestructura genérica ya existente
 * desde el Sprint 4.1.1 -- "preparar infraestructura... no desarrollar
 * eventos todavía", ver su JSDoc) -- este componente es, por diseño de esa
 * infraestructura, el primer lugar que registra un listener real de
 * negocio. No se usa el hook `useRealtime()` (`src/hooks/useRealtime.ts`)
 * porque ese hook ya llama a `.subscribe()` internamente sin exponer el
 * canal ANTES de suscribirlo -- el SDK de Supabase exige registrar
 * `.on('postgres_changes', ...)` antes de `.subscribe()`; su propio JSDoc
 * documenta esto como una decisión futura ("un Sprint funcional puede...
 * construir su propio hook de más alto nivel... si necesita registrar
 * listeners antes de suscribirse"), exactamente el caso de este ajuste.
 * Cada nueva fila llega vía el propio evento (`payload.new`, tipado como
 * `OfertaRow`) y se agrega a `ofertas` (dedupe por `id`, por si coincide
 * con una ya cargada) -- sin releer toda la lista, sin polling. Canal
 * dedicado por trabajo (`ofertas:<trabajoId>`), recreado/limpiado en cada
 * cambio de `trabajoId` y al desmontar (mismo patrón de cleanup que
 * `useRealtime()`).
 *
 * **RONDA DE CORRECCIÓN VISUAL** (inspección directa de
 * `Multimax_Despacho_v1.3.html`, no interpretación propia): el markup de
 * cada oferta pasa de `.mx-myjob*` (sustituto aproximado, rondas
 * anteriores) a las clases REALES del prototipo (`.mx-resp`/`.mx-resp-main`/
 * `.mx-resp-top`/`.mx-resp-name`/`.mx-resp-grid`/`.mx-price`/`.mx-resp-com`),
 * portadas verbatim a `globals.css` en esta misma ronda. El botón "Asignar"
 * pasa de un `<Button variant="violet">` (variante `.mx-btn-*` inventada por
 * analogía en una ronda anterior, RETIRADA en esta -- ver JSDoc de
 * `button.tsx`) a un `<button className="mx-select">` -- la clase REAL y
 * dedicada que usa el prototipo para este control (`background: gradient
 * violet→#7d6ef0`, `padding`/`radius`/tipografía propios, sin relación con
 * `.mx-btn`), con el mismo texto "Asignar" + `ChevronRight`. Comportamiento
 * sin cambios -- mismo `onClick`/`disabled`/estado `asignandoId`/
 * `asignadoId`, mismo `callAsignarInstalador()` real.
 *
 * **"Mejor precio"**: se calcula el precio mínimo entre las ofertas REALES
 * visibles -- el prototipo (`best = idx === 0 && sortBy === "precio"`)
 * marca la primera oferta ordenada por precio SIEMPRE, incluso si es la
 * única; se replica ese mismo criterio (una ronda anterior había agregado,
 * por cuenta propia, la condición "solo si hay más de una oferta" -- se
 * retira, no correspondía al prototipo).
 *
 * **Badge "Asignado"**: reemplaza el bloque `.mx-invite-ok` (texto "Instalador
 * asignado a este trabajo.") por el tratamiento real del prototipo -- la
 * tarjeta recibe la clase `.mx-resp.assigned` (borde/fondo verde) y un
 * `Badge tone="green"` "Asignado" en la fila superior, en vez del botón
 * "Asignar" (que deja de renderizarse, igual que antes).
 *
 * **Datos NO mostrados (gap real, no inventado)**: rating/distancia/tiempo
 * de respuesta del instalador no existen en `ofertas` ni se unen desde
 * ningún otro lado en este panel -- el prototipo los muestra (`r.rating`/
 * `r.km`/`fmt(r.responded)`, atributos del `INSTALLERS` mock del prototipo
 * standalone, sin equivalente real) pero esos 3 `<span>` de `.mx-resp-grid`
 * NO se portan -- inventar esos valores violaría la regla explícita de esta
 * ronda ("si un dato no tiene fuente real, no mostrar un valor ficticio").
 * "Empresa instaladora" SÍ se conserva como `<span>` adicional dentro de
 * `.mx-resp-grid` -- es un campo 100% real (`empresaInstaladoraById`, ya
 * resuelto más abajo), agregado en una ronda anterior por pedido explícito;
 * no es parte del prototipo original pero tampoco es un dato inventado.
 * `SORT_TABS` conserva las pestañas `rating`/`km` (visualmente, por
 * fidelidad con la referencia) sin efecto real de ordenamiento --
 * limitación ya documentada, sin cambios en esta ronda.
 *
 * **Corrección de un bug real reportado ("al asignar desaparece el radar")**:
 * la causa NO estaba en este archivo -- `asignar()` nunca ocultó nada acá.
 * Estaba en `DespachoPage.tsx`: al asignar, el trabajo recién asignado sale
 * de `trabajosLive`, pero `selectedTrabajoId` seguía apuntando a ese id
 * inválido, y el efecto de "selección por defecto" de esa página solo
 * actuaba cuando `selectedTrabajoId` era `null` -- nunca revalidaba una
 * selección que se volvió inválida DESPUÉS de la carga inicial. Corregido
 * en `DespachoPage.tsx` (ver su JSDoc) -- ningún cambio necesario en este
 * archivo para ese bug.
 *
 * **RONDA — "Mostrar ofertas" pasa de refresco a bandeja global
 * (`modoGlobal`)**: el botón de `LiveDispatchCard` ya NO dispara un
 * refresco del `trabajoId` seleccionado (`refreshTrigger`, RETIRADO de este
 * componente) -- ahora activa `DespachoPage.modoGlobal`, que este panel
 * recibe como prop. Dos modos, mutuamente excluyentes:
 *
 * - **Modo detalle** (`modoGlobal` falso, comportamiento histórico sin
 *   cambios): ofertas de un único `trabajoId`, cargadas/realtime/refresco
 *   manual exactamente como antes.
 * - **Modo global** (`modoGlobal` verdadero): ofertas de TODOS los trabajos
 *   `live` con ofertas pendientes, agrupadas por `trabajo_id`. Este panel NO
 *   hace ninguna consulta propia para este modo -- recibe `ofertasLive`/
 *   `trabajosLive` ya resueltos por `DespachoPage` (que ya cargaba esas
 *   mismas filas para los KPIs -- `ofertasRepository.getByTrabajoIds()`,
 *   cero consultas nuevas) y solo agrupa/ordena/renderiza (`gruposGlobales`,
 *   más abajo). Mientras `modoGlobal` es verdadero, los efectos de carga
 *   inicial/Realtime del modo detalle se PAUSAN (no hacen fetch ni
 *   mantienen su canal abierto) -- se reanudan solos si `modoGlobal` vuelve
 *   a `false` sin que `trabajoId` haya cambiado (dependencia explícita en
 *   ambos efectos). "Ofertas pendientes" = ofertas cuyo `trabajo_id`
 *   pertenece a un trabajo `estado='live'` -- `ofertas` no tiene columna de
 *   estado propia (confirmado, no se inventa una); `DespachoPage` ya filtra
 *   por trabajos `live` antes de consultar, así que `ofertasLive` nunca
 *   incluye ofertas de trabajos `assigned`/`completed`/`cancelled`.
 *
 * **Ordenamiento del modo global**: dentro de cada grupo, ascendente por
 * `precio` (mismo criterio que "Mejor precio" de siempre -- la primera
 * oferta de cada grupo la recibe). Los GRUPOS se ordenan entre sí por el
 * mejor precio de cada uno (más barato primero) -- viable sin alterar la
 * arquitectura: es la misma comparación de precios ya usada dentro de cada
 * grupo, aplicada una vez más entre los primeros elementos.
 *
 * **`asignadoId`/`asignandoId` → por oferta, no por instalador (corrección
 * necesaria para el modo global)**: en modo detalle, un mismo `trabajoId`
 * nunca tiene dos ofertas del mismo instalador (`submit_bid`, `ON CONFLICT
 * (trabajo_id, instalador_id)`), así que indexar por `instalador_id` era
 * inofensivo. En modo global, el MISMO instalador puede tener ofertas
 * pendientes en varios trabajos distintos a la vez -- indexar por
 * `instalador_id` marcaría INCORRECTAMENTE como "asignada" la oferta de
 * OTRO trabajo del mismo instalador. Se cambia a indexar por `oferta.id`
 * (columna real, única por fila) -- corrige ese caso sin cambiar ningún
 * comportamiento visible en modo detalle.
 *
 * **`asignar()` usa `oferta.trabajo_id`, no el `trabajoId` del panel**:
 * necesario porque en modo global cada tarjeta pertenece a un trabajo
 * distinto -- `oferta.trabajo_id` (columna real, siempre presente) es
 * correcto en AMBOS modos (en modo detalle coincide siempre con `trabajoId`,
 * porque las ofertas se cargan ya filtradas por ese mismo trabajo).
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
  /**
   * RONDA — activa el modo global ("Mostrar ofertas"). Por defecto `false`
   * (modo detalle, comportamiento histórico). Ver JSDoc de cabecera del
   * archivo, sección "'Mostrar ofertas' pasa de refresco a bandeja global".
   */
  modoGlobal?: boolean;
  /**
   * RONDA — trabajos `live` reales de la tienda (mismo array que ya calcula
   * `DespachoPage.trabajosLive`, sin remapear) -- solo se usa en modo
   * global, para el encabezado de cada grupo (código + tipo). En modo
   * detalle no se lee.
   */
  trabajosLive?: TableRow<'trabajos'>[];
  /**
   * RONDA — ofertas reales de TODOS los trabajos `live` (mismo array que ya
   * calcula `DespachoPage.ofertasLive`, vía `ofertasRepository.
   * getByTrabajoIds()` -- la misma consulta que ya alimentaba los KPIs, sin
   * consulta nueva). Solo se usa en modo global.
   */
  ofertasLive?: OfertaRow[];
}

export function ResponsesPanel({
  trabajoId: trabajoIdProp,
  onAsignado,
  modoGlobal = false,
  trabajosLive = [],
  ofertasLive = [],
}: ResponsesPanelProps = {}) {
  const { activeJob, empresaId } = useOperationalContext();
  const trabajoId = trabajoIdProp ?? activeJob?.trabajoId;

  const [sortBy, setSortBy] = useState<SortBy>('precio');
  const [ofertas, setOfertas] = useState<OfertaRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombreById, setNombreById] = useState<Record<string, string>>({});
  const [empresaInstaladoraById, setEmpresaInstaladoraById] = useState<Record<string, string>>({});
  // RONDA -- indexados por `oferta.id` (no por `instalador_id`, ver JSDoc de
  // cabecera "asignadoId/asignandoId → por oferta"): necesario para que el
  // modo global no marque como "asignada" la oferta de OTRO trabajo del
  // mismo instalador.
  const [asignandoOfertaId, setAsignandoOfertaId] = useState<string | null>(null);
  const [asignadoOfertaId, setAsignadoOfertaId] = useState<string | null>(null);
  const [asignarError, setAsignarError] = useState<string | null>(null);
  /**
   * AJUSTE SPRINT — Recomposición de Despacho en vivo: "Actualizar ofertas".
   * `refreshing` distingue la carga inicial (`ofertas === null`, ya
   * mostraba `Loading`) de un refresco manual sobre ofertas ya visibles
   * (no debe ocultar la lista actual mientras llega la respuesta -- solo
   * gira el ícono del botón). Ninguna consulta nueva: reutiliza
   * `ofertasRepository.getByTrabajoId()`, la misma que ya usaba el efecto.
   */
  const [refreshing, setRefreshing] = useState(false);

  /**
   * RONDA DE CORRECCIÓN — causa raíz real de "'Mostrar ofertas' no siempre
   * muestra la oferta nueva" (investigada por código, sin poder reproducir
   * en navegador en este entorno -- ver informe completo entregado al
   * usuario). Esta consulta (`ofertasRepository.getByTrabajoId()`) se
   * dispara desde 3 orígenes independientes que comparten el mismo estado
   * `ofertas`: la carga inicial al cambiar de trabajo, el clic manual en
   * "Mostrar ofertas" (`LiveDispatchCard` → `refreshTrigger`) y el ícono
   * "Actualizar ofertas" de este propio panel. Si dos quedan en vuelo a la
   * vez -- p. ej. la carga inicial todavía no respondía cuando el
   * coordinador ya pulsó "Mostrar ofertas" -- la respuesta MÁS LENTA podía
   * resolver DESPUÉS y sobrescribir (`setOfertas(result.data)`, reemplazo
   * completo del array) el resultado ya correcto y más reciente de la más
   * rápida -- un comportamiento intermitente que depende del timing real de
   * red, exactamente el síntoma reportado ("NO siempre aparece" -- nunca
   * "nunca aparece"). `requestIdRef` es un contador monótono: cada llamada
   * real a Supabase recibe un id creciente; si al resolver esa promesa ya
   * no es la ÚLTIMA emitida por este componente, se descarta -- ninguna
   * respuesta puede pisar a otra más reciente, sin importar el orden real
   * de llegada de la red. Reemplaza el mecanismo anterior (`active`/
   * `opts.isActive()`), que solo protegía la carga inicial contra un
   * cambio de `trabajoId` -- nunca protegía contra una carrera con el
   * refresco manual, que es exactamente el caso reportado.
   */
  const requestIdRef = useRef(0);

  /**
   * Única implementación real de la consulta de ofertas -- consumida tanto
   * por el `useEffect` (carga automática al cambiar `trabajoId`) como por
   * el botón "Actualizar ofertas"/"Mostrar ofertas" (refresco manual), sin
   * duplicar la llamada a `ofertasRepository.getByTrabajoId()`.
   * `opts?.manual` decide si debe mostrarse el ícono girando (`refreshing`)
   * o no (carga inicial, ya cubierta por `ofertas === null` en el render de
   * abajo).
   */
  const cargarOfertas = useCallback(
    (trabajoIdActual: string, opts: { manual?: boolean }) => {
      const requestId = (requestIdRef.current += 1);
      setError(null);
      if (opts.manual) setRefreshing(true);
      ofertasRepository.getByTrabajoId(trabajoIdActual).then((result) => {
        if (requestId !== requestIdRef.current) return;
        if (opts.manual) setRefreshing(false);
        if (result.ok) {
          setOfertas(result.data);
        } else {
          setError(result.error.message);
        }
      });
    },
    [],
  );

  useEffect(() => {
    // RONDA -- en modo global este efecto no aplica (no hay un único
    // `trabajoId` de detalle) -- se pausa por completo mientras
    // `modoGlobal` es verdadero, y se reanuda solo (mismo `trabajoId` o uno
    // nuevo) en cuanto vuelve a `false`, gracias a la dependencia explícita.
    if (modoGlobal) return;
    if (!trabajoId) {
      setOfertas(null);
      setError(null);
      requestIdRef.current += 1;
      return;
    }
    setAsignadoOfertaId(null);
    setAsignarError(null);
    cargarOfertas(trabajoId, {});
    return () => {
      requestIdRef.current += 1;
    };
  }, [trabajoId, modoGlobal, cargarOfertas]);

  const actualizarOfertas = () => {
    if (!trabajoId || refreshing) return;
    cargarOfertas(trabajoId, { manual: true });
  };

  /**
   * Ofertas en tiempo real (ver JSDoc de cabecera del archivo, "Ofertas en
   * tiempo real" -- este es el efecto que registra la suscripción). Un
   * canal dedicado por `trabajoId` (`ofertas:<trabajoId>` -- nombre final
   * real: `handymax:ofertas:<trabajoId>`, vía `buildRealtimeChannelName()`,
   * sin cambios en ese helper), con el listener `postgres_changes`
   * registrado ANTES de `.subscribe()` (orden obligatorio del SDK). Al
   * llegar un `INSERT` real sobre `ofertas` para este trabajo, se agrega la
   * fila (`payload.new`) al estado `ofertas` -- deduplicado por `id` (una
   * respuesta ya cargada por `cargarOfertas()` no se duplica si el evento
   * llega después). Se recrea/limpia en cada cambio de `trabajoId` (mismo
   * criterio que el resto del archivo) y al desmontar. Pausado mientras
   * `modoGlobal` es verdadero (ver el efecto de carga inicial, mismo
   * criterio) -- el modo global tiene su PROPIO canal, en `DespachoPage.tsx`.
   */
  useEffect(() => {
    if (!trabajoId || modoGlobal) return;
    const channel = createRealtimeChannel(`ofertas:${trabajoId}`);
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ofertas', filter: `trabajo_id=eq.${trabajoId}` },
        (payload) => {
          const nuevaOferta = payload.new as OfertaRow;
          setOfertas((prev) => {
            if (!prev) return [nuevaOferta];
            if (prev.some((oferta) => oferta.id === nuevaOferta.id)) return prev;
            return [...prev, nuevaOferta];
          });
        },
      )
      .subscribe();
    return () => {
      void removeRealtimeChannel(channel);
    };
  }, [trabajoId, modoGlobal]);

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

  // "Mejor precio" -- mínimo entre las ofertas REALES visibles. El
  // prototipo (`best = idx === 0 && sortBy === "precio"`) marca la primera
  // oferta ordenada por precio como "Mejor precio" incluso si es la única
  // -- se replica ese mismo criterio (sin el `> 1` que un ajuste anterior
  // había agregado por cuenta propia).
  const mejorPrecio = ofertasOrdenadas.length > 0 ? Math.min(...ofertasOrdenadas.map((oferta) => oferta.precio)) : null;

  // RONDA -- usa `oferta.trabajo_id` (columna real, siempre presente) en vez
  // del `trabajoId` del panel -- correcto en ambos modos (ver JSDoc de
  // cabecera "asignar() usa oferta.trabajo_id").
  const asignar = async (oferta: OfertaRow) => {
    if (asignandoOfertaId) return;
    setAsignarError(null);
    setAsignandoOfertaId(oferta.id);
    const result = await callAsignarInstalador({
      p_trabajo_id: oferta.trabajo_id,
      p_instalador_id: oferta.instalador_id,
    });
    setAsignandoOfertaId(null);

    if (!result.ok) {
      setAsignarError(result.error.message);
      return;
    }
    setAsignadoOfertaId(oferta.id);
    onAsignado?.();
  };

  /**
   * RONDA — Modo global: agrupa `ofertasLive` (ya llegan filtradas a
   * trabajos `live` desde `DespachoPage` -- "ofertas pendientes", ver JSDoc
   * de cabecera) por `trabajo_id`. Dentro de cada grupo, ascendente por
   * precio (mismo criterio que "Mejor precio"). Los GRUPOS se ordenan entre
   * sí por el mejor precio de cada uno -- reutiliza la misma comparación,
   * aplicada una vez más entre los primeros elementos ya ordenados.
   * `trabajosLive` (no `ofertasLive`) decide qué grupos existen -- así un
   * trabajo sin ofertas simplemente no genera un grupo vacío.
   */
  const gruposGlobales = useMemo(() => {
    if (!modoGlobal) return [];
    const porTrabajo = new Map<string, OfertaRow[]>();
    for (const oferta of ofertasLive) {
      const lista = porTrabajo.get(oferta.trabajo_id);
      if (lista) {
        lista.push(oferta);
      } else {
        porTrabajo.set(oferta.trabajo_id, [oferta]);
      }
    }
    const grupos = trabajosLive
      .map((trabajo) => ({
        trabajo,
        ofertas: [...(porTrabajo.get(trabajo.id) ?? [])].sort((a, b) => a.precio - b.precio),
      }))
      .filter((grupo) => grupo.ofertas.length > 0);
    grupos.sort((a, b) => a.ofertas[0].precio - b.ofertas[0].precio);
    return grupos;
  }, [modoGlobal, ofertasLive, trabajosLive]);

  const totalOfertasGlobales = gruposGlobales.reduce((total, grupo) => total + grupo.ofertas.length, 0);

  // Extraído para no duplicar el JSX de la tarjeta entre modo detalle y
  // modo global -- mismo markup exacto (`.mx-resp`/`.mx-resp-main`/...) en
  // ambos casos, ver JSDoc "RONDA DE CORRECCIÓN VISUAL" de cabecera.
  const renderOferta = (oferta: OfertaRow, esMejorPrecio: boolean) => {
    const yaAsignada = asignadoOfertaId === oferta.id;
    return (
      <div key={oferta.id} className={yaAsignada ? 'mx-resp assigned' : 'mx-resp'}>
        <div className="mx-resp-main">
          <div className="mx-resp-top">
            <span className="mx-resp-name">{nombreById[oferta.instalador_id] ?? 'Instalador'}</span>
            {esMejorPrecio && !yaAsignada ? (
              <Badge tone="green">
                <ArrowUpRight size={10} />
                Mejor precio
              </Badge>
            ) : null}
            {yaAsignada ? (
              <Badge tone="green">
                <CheckCircle2 size={10} />
                Asignado
              </Badge>
            ) : null}
          </div>
          <div className="mx-resp-grid">
            <span className="mx-price">${oferta.precio}</span>
            <span>
              <Calendar size={12} />
              {oferta.dia} · {oferta.hora}
            </span>
            <span>{empresaInstaladoraById[oferta.instalador_id] ?? 'Pendiente de asignación'}</span>
          </div>
          {oferta.comentario ? <div className="mx-resp-com">&ldquo;{oferta.comentario}&rdquo;</div> : null}
        </div>
        {!yaAsignada ? (
          <button
            type="button"
            className="mx-select"
            disabled={asignandoOfertaId !== null}
            onClick={() => void asignar(oferta)}
          >
            {asignandoOfertaId === oferta.id ? (
              <Spinner size={14} />
            ) : (
              <>
                Asignar
                <ChevronRight size={14} />
              </>
            )}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <Card className="mx-feedcard">
      <CardHeader
        icon={<Users size={14} />}
        cardTitle={modoGlobal ? 'Ofertas pendientes' : 'Respuestas en tiempo real'}
        action={
          // RONDA -- "Actualizar ofertas"/tabs de orden son acciones del
          // modo detalle (operan sobre un único `trabajoId`) -- no aplican
          // en modo global (`gruposGlobales` ya viene ordenado por precio,
          // ver JSDoc). Se ocultan en vez de dejarlas inertes/confusas.
          modoGlobal ? null : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* AJUSTE SPRINT -- "Actualizar ofertas". Visualmente secundario
                  respecto a "Asignar" (variant="ghost", ícono pequeño, sin
                  texto salvo tooltip) -- pedido explícito. Reutiliza
                  `cargarOfertas()`, la misma consulta del efecto inicial. */}
              <button
                type="button"
                className="mx-btn mx-btn-ghost"
                style={{ flex: 'none', padding: '5px 8px' }}
                disabled={!trabajoId || refreshing}
                title="Actualizar ofertas"
                onClick={actualizarOfertas}
              >
                <RefreshCw size={13} className={refreshing ? 'mx-spin' : undefined} />
              </button>
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
            </div>
          )
        }
      />
      {asignarError ? (
        <p className="mx-sub" style={{ color: 'var(--red)', marginBottom: 8 }}>
          {asignarError}
        </p>
      ) : null}
      {modoGlobal ? (
        <>
          {totalOfertasGlobales > 0 ? (
            <p className="mx-sub" style={{ marginBottom: 8 }}>
              {totalOfertasGlobales} oferta{totalOfertasGlobales === 1 ? '' : 's'} pendiente
              {totalOfertasGlobales === 1 ? '' : 's'} en {gruposGlobales.length} trabajo
              {gruposGlobales.length === 1 ? '' : 's'}
            </p>
          ) : null}
          {gruposGlobales.length === 0 ? (
            <EmptyState
              size="compact"
              icon={<Radio size={22} />}
              description={
                <>
                  No hay ofertas pendientes en ningún trabajo <b>en vivo</b> de tu tienda por el
                  momento.
                </>
              }
            />
          ) : (
            <div className="mx-feed">
              {gruposGlobales.map((grupo) => (
                <div key={grupo.trabajo.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="mx-jobrow-id">{grupo.trabajo.codigo}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{grupo.trabajo.tipo}</span>
                  </div>
                  {grupo.ofertas.map((oferta, index) => renderOferta(oferta, index === 0))}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Evolución de Despacho en vivo -- indicador "N ofertas
              recibidas" pedido explícitamente, mismo dato ya disponible
              (`ofertasOrdenadas.length`), sin consulta adicional. Solo se
              muestra cuando hay un trabajo real consultado y al menos una
              oferta -- para 0 ofertas ya existe el EmptyState de abajo, no
              hace falta repetirlo acá. */}
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
                  Esperando propuestas de instaladores. Las ofertas reales enviadas desde la vista{' '}
                  <b>Instalador</b> aparecen acá automáticamente.
                </>
              }
            />
          ) : (
            <div className="mx-feed">
              {ofertasOrdenadas.map((oferta) =>
                renderOferta(oferta, mejorPrecio !== null && oferta.precio === mejorPrecio),
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
