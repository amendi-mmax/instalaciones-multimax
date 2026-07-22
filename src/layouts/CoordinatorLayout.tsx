import { useMemo, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { ConfirmCancelDialog } from '@/components/shared/confirm-cancel-dialog';
import { CoordinatorSubtabs } from '@/components/shared/coordinator-subtabs';
import { Footer } from '@/components/shared/footer';
import { Header } from '@/components/shared/header';
import { PublishModal } from '@/components/shared/publish-modal';
import { SucursalSelect } from '@/components/shared/sucursal-select';
import { useAuth } from '@/hooks/useAuth';

/**
 * CoordinatorLayout — Sprint 5.1.2 ("Refactor del Layout Operativo del
 * Coordinador"). Único punto de entrada de TODA la operación del
 * Coordinador -- reutiliza, sin duplicar, exactamente los mismos
 * componentes ya aprobados que hasta este Sprint vivían repartidos entre
 * `RootLayout.tsx` (Header/Footer/PublishModal/ConfirmCancelDialog, cuando
 * `showCoordinador` era `true` -- ver su JSDoc histórico completo, Sprints
 * 3.1/3.5/3.15/4.2.1/5.1/5.1.1, NINGUNO modificado en su propio código,
 * solo relocalizados) y `DespachoPage.tsx`/`TrabajosPage.tsx`
 * (`SucursalSelect`/`CoordinatorSubtabs`, antes duplicados -- una llamada
 * independiente en cada página -- ahora un único punto, resolviendo
 * exactamente el "PROBLEMA ACTUAL" que describe el brief de este Sprint:
 * "Hay duplicación parcial de estructura").
 *
 * ---------------------------------------------------------------------
 * Auditoría previa de este Sprint (discrepancias reales, reportadas y
 * resueltas con el usuario vía `AskUserQuestion` antes de escribir código)
 * ---------------------------------------------------------------------
 * 1. **`CoordinatorSidebar`** (nodo de la "ESTRUCTURA ESPERADA" del brief):
 *    el HTML oficial (`Multimax_Despacho_v1.3.html`) no tiene ningún
 *    sidebar para el Coordinador — 0 coincidencias de "sidebar"/"aside" en
 *    todo el script. Esto ya se había confirmado explícitamente en el
 *    Sprint 5.1 ("el brief pedía un Sidebar lateral... Decisión del
 *    usuario: no construir el Sidebar", ver `PROJECT_STATUS.md`). El
 *    usuario reafirmó la misma decisión para este Sprint, en sus propias
 *    palabras: "No crear ningún `CoordinatorSidebar`. El HTML oficial...
 *    es la fuente de verdad y no contiene un sidebar para el Coordinador."
 *    — NO se crea, ni siquiera como contenedor vacío/placeholder. Por la
 *    misma instrucción explícita ("No agregues placeholders visuales para
 *    Sidebar, Auction Engine, Timeline ni Assignment Panel en este
 *    Sprint"), tampoco se agrega ningún placeholder para esos otros 3
 *    módulos — se incorporarán únicamente cuando exista un Sprint
 *    específico para cada uno.
 * 2. **`CoordinatorHeader`/`CoordinatorFooter`** (nodos de la "ESTRUCTURA
 *    ESPERADA"): `Header`/`Footer` son componentes reales YA EXISTENTES,
 *    globales — `<header class="mx-top">`/`<footer class="mx-foot">` de
 *    `App()`, compartidos por los 3 roles (el propio texto literal del
 *    `Footer`, "Las dos vistas — Coordinador e Instalador — comparten el
 *    mismo trabajo en vivo", confirma que nunca fueron exclusivos de
 *    Coordinador). Siguiendo la instrucción explícita del usuario de
 *    priorizar siempre el HTML oficial, estos 2 nodos del árbol del brief
 *    se satisfacen REUTILIZANDO `Header`/`Footer` tal cual, en esta nueva
 *    posición del árbol — ningún archivo nuevo `coordinator-header.tsx`/
 *    `coordinator-footer.tsx`, cero componentes duplicados.
 * 3. **`CoordinatorKPIs`** (nodo de la "ESTRUCTURA ESPERADA", hermano de
 *    `CoordinatorWorkspace` — sugiere visibilidad en TODAS las páginas del
 *    Coordinador): el HTML oficial no tiene ningún "Dashboard" — esto ya
 *    se había resuelto explícitamente en el Sprint 5.1 con una decisión de
 *    producto puntual: los KPIs (`CoordinatorKpiRow`) se integran
 *    ÚNICAMENTE como fila adicional de `DespachoPage` ("Despacho en
 *    vivo"), no como elemento persistente en toda página del Coordinador.
 *    Elevar `CoordinatorKpiRow` a este Layout (visible también en
 *    `TrabajosPage`/`TrabajoDetailPage`) sería un CAMBIO DE COMPORTAMIENTO
 *    real, prohibido explícitamente por este mismo brief ("No cambia el
 *    comportamiento funcional... Solo cambia la arquitectura"). Por lo
 *    tanto `CoordinatorKpiRow` se deja exactamente donde está, dentro de
 *    `DespachoPage.tsx`, sin ningún cambio — no se representa como nodo de
 *    este Layout.
 * 4. **`CoordinatorWorkspace`**: no se crea ningún wrapper `<div>` nuevo
 *    sin contraparte real en `globals.css`/el HTML oficial (verificado —
 *    ninguna clase `mx-workspace` existe en el proyecto). El "workspace" es
 *    literalmente el área que ya intercambia `DespachoPage`/`TrabajosPage`/
 *    `TrabajoDetailPage` vía `<Outlet/>`, exactamente las mismas 3 rutas de
 *    `AppRouter.tsx` de siempre, sin ningún cambio ("no crear rutas
 *    nuevas").
 * 5. **`sucursalCoord`**: sigue viviendo en `RootLayout.tsx` (NO se movió
 *    aquí) — es estado compartido entre este Layout (`PublishModal`,
 *    `SucursalSelect`) Y `OperationalContextProvider` (`sucursalCoord` es
 *    uno de sus 2 props, ver `OperationalContextProvider.tsx`,
 *    explícitamente "NO MODIFICAR" por este mismo brief). Moverlo a este
 *    archivo habría exigido remontar `OperationalContextProvider` más
 *    abajo en el árbol — un cambio real a ESE sistema, prohibido. En
 *    cambio, este Layout lo recibe como prop (`sucursalCoord`/
 *    `onSucursalCoordChange`) — mismo dato, ninguna duplicación de fuente
 *    de verdad, `OperationalContextProvider` sigue exactamente en la misma
 *    posición del árbol que antes de este Sprint (ver JSDoc "SPRINT 5.1.2"
 *    de `RootLayout.tsx`).
 * 6. **`showPublishModal`/`confirmCancelOpen`**: SÍ se mueven aquí (a
 *    diferencia de `sucursalCoord`) — son estado exclusivo de 2 diálogos
 *    exclusivos del Coordinador, sin ninguna dependencia cruzada con
 *    `OperationalContextProvider` ni ningún otro sistema. El brief pide
 *    explícitamente mover `PublishModal` ("deberá depender del
 *    CoordinatorLayout. No de RootLayout"); `ConfirmCancelDialog` no está
 *    mencionado por nombre en el brief, pero el usuario confirmó
 *    explícitamente extender el mismo criterio por consistencia (ambos
 *    son, en los hechos, exactamente el mismo tipo de estado — un diálogo
 *    exclusivo del Coordinador, controlado por un booleano de
 *    abrir/cerrar).
 *
 * ---------------------------------------------------------------------
 * Efecto colateral de fidelidad (no pedido explícitamente, documentado)
 * ---------------------------------------------------------------------
 * En el HTML oficial, `mx-suc-sel`/`mx-subtabs-wrap` se renderizan como
 * hermanos del contenido de `coordTab` (`Coordinator`/`CoordinatorJobs`),
 * SIEMPRE visibles mientras `role === "coord"` — incluido cuando
 * `CoordinatorJobs` muestra `JobDetail` (`jobSel` no nulo), porque ese
 * reemplazo ocurre DENTRO de `CoordinatorJobs`, no afecta a sus hermanos.
 * Antes de este Sprint, `TrabajoDetailPage.tsx` (`/trabajos/:id`) NO
 * mostraba `SucursalSelect`/`CoordinatorSubtabs` (nunca las importó). Al
 * hoistear ambos componentes a este Layout (por encima del `<Outlet/>`
 * compartido por las 3 rutas), `TrabajoDetailPage` pasa a mostrarlos
 * también — esto es un AUMENTO de fidelidad respecto al HTML oficial, no
 * una regresión ni una funcionalidad nueva inventada: es exactamente el
 * comportamiento real de `App()`, que este Sprint corrige como
 * consecuencia directa (y deseable) de eliminar la duplicación de
 * estructura.
 *
 * ---------------------------------------------------------------------
 * Qué NO cambia (criterio de aceptación de este Sprint)
 * ---------------------------------------------------------------------
 * Ningún componente fue reescrito ni duplicado — `Header`/`Footer`/
 * `SucursalSelect`/`CoordinatorSubtabs`/`PublishModal`/`ConfirmCancelDialog`
 * son EXACTAMENTE los mismos archivos que antes de este Sprint, sin ningún
 * cambio en su propio código — solo cambió DESDE DÓNDE se montan. Ninguna
 * ruta nueva, ninguna llamada nueva a Supabase, ningún cambio a
 * repositories/queries/RLS/Auth/roles/`OperationalContextProvider`. El
 * `useAuth()` de aquí es una lectura adicional del mismo Context ya usado
 * en `RootLayout.tsx` (mismo patrón ya establecido en el proyecto, ej.
 * `DespachoPage.tsx` antes del "ajuste final" del Sprint 5.1.1) — no una
 * llamada nueva a Supabase (`AuthProvider` ya resolvió la sesión una sola
 * vez; este Layout solo lee el valor ya cacheado del Context).
 *
 * Cuando el SuperAdministrador elige "Modo Coordinador" (`AdminVistaSwitch`,
 * Sprint 5.1.1), `RootLayout.tsx` monta este mismo `CoordinatorLayout` —
 * ningún componente "Admin" alternativo, cumpliendo el criterio de
 * aceptación explícito de este Sprint ("deberá renderizar EXACTAMENTE el
 * mismo CoordinatorLayout").
 */
export interface CoordinatorLayoutProps {
  sucursalCoord: string;
  onSucursalCoordChange: (value: string) => void;
  /**
   * Slot opcional para contenido que debe mostrarse encima del contenido
   * operativo del Coordinador pero que NO es lógica del Coordinador — hoy,
   * únicamente el selector `AdminVistaSwitch`/badge "Modo temporal · MVP"
   * (Sprint 5.1.1). `RootLayout.tsx` sigue decidiendo si mostrarlo (depende
   * de `role`/`adminVista`, ninguno de los dos es dato del Coordinador).
   * Mantiene este Layout reutilizable EXACTAMENTE igual para un
   * Coordinador real y para un admin en modo superusuario, sin que este
   * archivo necesite conocer `role`/`adminVista` en absoluto.
   */
  adminSwitchSlot?: ReactNode;
}

export function CoordinatorLayout({
  sucursalCoord,
  onSucursalCoordChange,
  adminSwitchSlot,
}: CoordinatorLayoutProps) {
  const { profile, logout } = useAuth();
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const outletContext: CoordinatorLayoutOutletContext = useMemo(
    () => ({
      sucursalCoord,
      setSucursalCoord: onSucursalCoordChange,
      onOpenPublish: () => setShowPublishModal(true),
      onOpenConfirmCancel: () => setConfirmCancelOpen(true),
    }),
    [sucursalCoord, onSucursalCoordChange],
  );

  // `profile` está garantizado no-nulo en este punto: `RootLayout.tsx` solo
  // monta este Layout después de su propio guard (`if (profileLoading ||
  // !profile || profile.estado === 'suspendido') return <Loading/>`) —
  // mismo criterio ya usado en `RootLayout.tsx` para el resto del shell.
  // Este `if` es solo una guarda defensiva de tipos (TypeScript no puede
  // ver la garantía del componente padre); nunca debería alcanzarse en la
  // práctica.
  if (!profile) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header role={profile.rol} profile={profile} onLogout={() => void logout()} />
      <main className="flex-1">
        {adminSwitchSlot}
        {/* Sprint 3.4 (`SucursalSelect`) / Sprint 3.3 (`CoordinatorSubtabs`,
            routeado en Sprint 5.1) — antes duplicados dentro de
            `DespachoPage.tsx`/`TrabajosPage.tsx`, ahora un único punto,
            compartido por las 3 rutas del Coordinador vía `<Outlet/>` (ver
            "Efecto colateral de fidelidad" más arriba). */}
        <SucursalSelect value={sucursalCoord} onChange={onSucursalCoordChange} />
        <CoordinatorSubtabs />
        <Outlet context={outletContext} />
      </main>
      <Footer />
      {/* TEMPORARY INTEGRATION — Sprint 3.5 (PublishModal): ver JSDoc
          histórico completo en `RootLayout.tsx`. Sprint 5.1.2: se relocaliza
          aquí (antes vivía en `RootLayout.tsx`) — mismo componente, mismas
          props, ningún cambio de comportamiento. */}
      <PublishModal
        sucursal={sucursalCoord}
        open={showPublishModal}
        onOpenChange={setShowPublishModal}
        onPublish={() => {
          /* Sin lógica de negocio en este Sprint — pendiente para el Sprint 5.2. */
        }}
      />
      {/* TEMPORARY INTEGRATION — Sprint 3.15 (ConfirmCancelDialog): ver JSDoc
          histórico completo en `RootLayout.tsx`. Sprint 5.1.2: se relocaliza
          aquí (antes vivía en `RootLayout.tsx`) — mismo componente, mismas
          props, ningún cambio de comportamiento. */}
      <ConfirmCancelDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        onYes={() => {
          /* Sin lógica de negocio en este Sprint — ver comentario histórico. */
        }}
      />
    </div>
  );
}

/**
 * CoordinatorLayoutOutletContext — forma del `<Outlet context={...}/>` que
 * `CoordinatorLayout` expone a las rutas anidadas del Coordinador
 * (`/despacho`, `/trabajos`, `/trabajos/:id` — sin cambios de
 * `AppRouter.tsx` en este Sprint). Consumido vía
 * `useOutletContext<CoordinatorLayoutOutletContext>()` en
 * `DespachoPage.tsx`/`TrabajosPage.tsx`.
 *
 * Sprint 5.1.2 — reemplaza a `RootLayoutOutletContext` (eliminado de
 * `RootLayout.tsx`, que ya no monta ningún `<Outlet/>` directamente).
 * Misma forma exacta (4 campos, sin cambios) que su predecesor del
 * Sprint 5.1 — solo cambia el archivo donde vive, consistente con que el
 * estado que describe (`sucursalCoord`/`showPublishModal`/
 * `confirmCancelOpen`) ahora se resuelve/expone desde este Layout.
 */
export interface CoordinatorLayoutOutletContext {
  sucursalCoord: string;
  setSucursalCoord: (value: string) => void;
  onOpenPublish: () => void;
  onOpenConfirmCancel: () => void;
}
