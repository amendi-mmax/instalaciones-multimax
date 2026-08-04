import { useMemo, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { ConfirmCancelDialog } from '@/components/shared/confirm-cancel-dialog';
import { CoordinatorSubtabs } from '@/components/shared/coordinator-subtabs';
import { Footer } from '@/components/shared/footer';
import { Header } from '@/components/shared/header';
import type { JobSummaryCardJob } from '@/components/shared/job-summary-card';
import { PublishModal, type PublishForm } from '@/components/shared/publish-modal';
import { SucursalSelect } from '@/components/shared/sucursal-select';
import { Toast, ToastViewport, type ToastTone } from '@/components/ui/toast';
import { trabajosRepository } from '@/repositories';
import { callNotificarInstaladoresElegibles } from '@/services/database.service';
import type { TableInsert } from '@/services/database.service';
import { useAuth } from '@/hooks/useAuth';
import { useOperationalContext } from '@/hooks/useOperationalContext';

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
 *
 * ---------------------------------------------------------------------
 * Cambio mínimo — Sprint 5.2.1 ("Publish Workflow — Estado Local MVP")
 * ---------------------------------------------------------------------
 * Este Sprint pedía implementar el flujo Publish tocando "preferiblemente
 * únicamente" `DespachoPage.tsx`/`publish-modal.tsx`, y su Regla 12 dice "No
 * modificar `CoordinatorLayout`". Auditoría previa detectó una contradicción
 * real e irresoluble sin excepción: `PublishModal` — y el único callback
 * `onPublish` real que recibe su envío — vive AQUÍ (decisión explícita del
 * Sprint 5.1.2, "`CoordinatorLayout` debe seguir siendo el único propietario
 * de `PublishModal`"), NUNCA dentro de `DespachoPage.tsx` (que solo recibe
 * `onOpenPublish`, para ABRIR el modal, vía este mismo Outlet Context). Sin
 * tocar este archivo, `DespachoPage.tsx` no tenía ninguna forma de recibir
 * el `PublishForm` real al confirmarse. Consultado con el usuario
 * (`AskUserQuestion`) antes de escribir código; resolución explícita
 * (verbatim): "Procede con la opción 1. Autorizo una modificación mínima de
 * `CoordinatorLayout` exclusivamente para conectar el flujo Publish
 * Workflow... Únicamente puedes incorporar el callback necesario para que
 * el resultado de `PublishModal` actualice el estado `activeJob` utilizado
 * por `DespachoPage`. `CoordinatorLayout` debe seguir siendo el único
 * propietario de `PublishModal`."
 *
 * El cambio, y solo este, fue el mínimo indispensable para ese único
 * propósito:
 * 1. Nuevo estado `activeJob`/`setActiveJob` (`JobSummaryCardJob | null`,
 *    mismo tipo YA EXISTENTE que consume `JobSummaryCard`/`DespachoPage` —
 *    "no inventar propiedades nuevas... reutilizar el mismo tipo existente",
 *    instrucción explícita de este Sprint) — mismo patrón que
 *    `showPublishModal`/`confirmCancelOpen`, estado exclusivo del
 *    Coordinador sin dependencia cruzada con ningún otro sistema.
 * 2. El `onPublish` de `PublishModal` (antes un no-op documentado "pendiente
 *    para el Sprint 5.2") ahora construye el Job temporal a partir del
 *    `PublishForm` recibido — reutilizando EXACTAMENTE los mismos campos que
 *    `JobSummaryCardJob` ya define (id generado igual que el HTML oficial:
 *    `"JOB-" + Math.floor(Math.random()*9000+1000)`, `App()` línea 1934) —
 *    y llama a `setActiveJob`/`setShowPublishModal(false)`. Cero lógica de
 *    Supabase/API/persistencia (Reglas 13-16) — 100% estado React en
 *    memoria, se pierde al recargar, igual que `App()` en el HTML oficial.
 * 3. `activeJob` se agrega a `CoordinatorLayoutOutletContext` (mismo patrón
 *    ya usado para `onOpenPublish`/`onOpenConfirmCancel`) para que
 *    `DespachoPage.tsx` lo lea vía `useOutletContext()`.
 *
 * Qué NO cambió en este archivo: `PublishModal` sigue siendo el ÚNICO
 * propietario/instancia (no se duplicó, no se movió — sigue viviendo
 * exactamente aquí, con las mismas props `sucursal`/`open`/`onOpenChange`);
 * su estructura visual no se tocó (Regla 10); `ConfirmCancelDialog`,
 * `Header`/`Footer`/`SucursalSelect`/`CoordinatorSubtabs`, el JSX/estructura
 * visual completa de este Layout, y `sucursalCoord`/`OperationalContext`
 * permanecen exactamente iguales — el único cambio es el estado nuevo y el
 * cuerpo, antes vacío, de `onPublish`.
 *
 * ---------------------------------------------------------------------
 * Cambio — Sprint 5.2.1 Fix ("Publish Workflow Stabilization")
 * ---------------------------------------------------------------------
 * `activeJob`/`setActiveJob` YA NO son un `useState` local de este archivo
 * — se leen/escriben ahora vía `useOperationalContext()`, viven físicamente
 * en `OperationalContextProvider.tsx` (ver su JSDoc "AJUSTE — Sprint 5.2.1
 * Fix" para la auditoría completa de por qué era necesario y por qué se
 * autorizó reutilizar ese Provider en vez de subir el estado a
 * `RootLayout.tsx` o crear un Context nuevo). Motivo: el Objetivo 1 de ese
 * Sprint ("el trabajo activo debe sobrevivir la navegación
 * Coordinador↔Instalador↔Administración") es imposible de cumplir con el
 * estado viviendo aquí, porque `RootLayout.tsx` desmonta por completo este
 * componente (y todo su árbol) cada vez que un `admin` cambia de vista en
 * `AdminVistaSwitch` — cualquier `useState` local de este archivo se pierde
 * en ese momento. `CoordinatorLayoutOutletContext` (más abajo) NO cambió de
 * forma — sigue exponiendo `activeJob` con el mismo tipo de siempre,
 * `DespachoPage.tsx` no necesitó ningún cambio para seguir leyéndolo igual
 * que antes; solo cambió el ORIGEN del valor.
 *
 * También en este Sprint: `onYes` de `ConfirmCancelDialog` (antes un no-op
 * documentado "sin lógica de negocio en este Sprint") ahora llama a
 * `setActiveJob(null)` — Objetivo 2 ("Cancelar" → `activeJob` → `null` →
 * `CoordinatorEmptyState`). El propio `ConfirmDialog` ya cierra el diálogo
 * (`onOpenChange(false)`) después de invocar `onConfirm`/`onYes` — no hace
 * falta ningún cambio adicional acá para eso.
 *
 * ---------------------------------------------------------------------
 * Cambio — Sprint 5.2.2.1 ("Persistencia del trabajo publicado — Supabase")
 * ---------------------------------------------------------------------
 * `onPublish` deja de construir un Job 100% en memoria — ahora persiste el
 * trabajo real en Supabase antes de llamar a `setActiveJob`. Único cambio de
 * arquitectura permitido por este Sprint ("reemplazar el origen del
 * ActiveJob", nada más): el flujo pasa de
 * `PublishForm → objeto temporal → setActiveJob()` a
 * `PublishForm → INSERT en "trabajos" (Supabase) → fila creada →
 * ActiveJob → setActiveJob()`.
 *
 * **Auditoría previa (resumen; ver el reporte técnico completo para el
 * detalle línea por línea, incluida la consulta previa al usuario sobre 3
 * puntos que el propio brief pedía confirmar antes de escribir código)**:
 *
 * - **Tabla real**: `trabajos` (`TABLES.trabajos`,
 *   `trabajos.repository.ts`, `docs/database/DATABASE_INVENTORY.md` §2.6),
 *   coincide con `database.generated.ts` — se reutiliza
 *   `trabajosRepository.create()` TAL CUAL (ya existía desde el Sprint
 *   4.1.1, cero cambios a ese archivo, `Regla: no modificar el
 *   repositorio`).
 * - **Columnas obligatorias del INSERT** (sin `?` en `TableInsert<'trabajos'>`):
 *   `codigo` (generado con el mismo criterio que el HTML oficial,
 *   `"JOB-" + Math.floor(Math.random()*9000+1000)` — ya usado antes de este
 *   Sprint para el `id` del Job temporal), `coordinador_id` (`profile.id`,
 *   el mismo id de `auth.users`/`coordinadores` del Coordinador
 *   autenticado), `empresa_id`/`tienda_id` (`useOperationalContext()`, ya
 *   resueltos por ese mismo Provider para el bloque de KPIs — ninguna
 *   consulta nueva), `fecha`/`hora`/`provincia`/`tipo`/`zona` (directos del
 *   `PublishForm` ya validado por Sprint 5.2.1 Fix). El resto de columnas
 *   (`tipo_inmueble`/`calle`/`equipo`/`requisitos`/`extra`/
 *   `precio_sugerido`/`urgente`/`bid_minutos`) son opcionales/nullable en el
 *   schema real — se envían igual, directas del formulario, sin inventar
 *   ningún valor.
 * - **`ActiveJob` se construye con un único `INSERT...RETURNING`** (el mismo
 *   `.select().single()` que ya usa `trabajosRepository.create()`) — sin
 *   consultas adicionales. Única excepción: `sucursal` (nombre visible de la
 *   tienda, ej. "San Francisco") NO se guarda como columna en `trabajos`
 *   (la tabla solo tiene `tienda_id`, un uuid) — se toma directo de
 *   `form.sucursal` (el mismo string ya tecleado/elegido en el formulario),
 *   igual que el Job temporal anterior ya hacía.
 * - **RLS**: existe una policy real, "coordinadores publican en su tienda"
 *   (INSERT, scope "tienda propia" — `docs/database/DATABASE_INVENTORY.md`
 *   §7, fila 7). Por instrucción explícita del usuario, este Sprint NO
 *   introduce ningún caso especial para el modo Administrador/superusuario
 *   (`esSuperusuario`) — el INSERT se intenta igual para cualquier rol; si
 *   la policy lo rechaza, el mismo manejo de error de abajo lo cubre sin
 *   ninguna rama adicional. La primera prueba real de este flujo se hará
 *   con el usuario Coordinador ya sembrado en Supabase (mismo UUID en
 *   `auth.users`/`coordinadores`) — pendiente de esa prueba para confirmar
 *   si hace falta algún ajuste futuro.
 * - **Mensaje de error ("mostrar mensaje de error existente")**: se
 *   auditó que no existía ningún elemento ya cableado en el flujo Publish
 *   para un error de envío (`FieldError`, Sprint 5.2.1 Fix, es un concepto
 *   distinto — validación de formulario, no fallo de Supabase). Por
 *   instrucción explícita del usuario, se reutiliza el ÚNICO precedente real
 *   de la app (`Toast`/`ToastViewport`, `ui/toast.tsx`, ya existentes,
 *   documentados ahí como "estructura solamente, sin cola/Provider global")
 *   con el MISMO patrón de cola local (`useState`+`pushToast`/`dismissToast`)
 *   ya establecido en `LoginPage.tsx` — ningún componente nuevo, ningún
 *   sistema de mensajes nuevo, segunda aplicación de un patrón ya aprobado.
 *   `FieldError` no se toca -- sigue exclusivamente para validación de
 *   campos.
 *
 * **Qué NO cambió**: `PublishModal` (props/estructura/validaciones,
 * intactas), `ConfirmCancelDialog`, `Header`/`Footer`/`SucursalSelect`/
 * `CoordinatorSubtabs`, `CoordinatorLayoutOutletContext` (misma forma de
 * siempre — `DespachoPage.tsx` no necesitó ningún cambio, sigue leyendo
 * `activeJob` igual que antes; solo cambió CÓMO se produce ese valor).
 * `trabajos.repository.ts`/policies RLS/`OperationalContextProvider.tsx`:
 * cero cambios.
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

/**
 * Toast local de esta capa — Sprint 5.2.2.1. Mismo patrón exacto ya
 * aprobado y en producción en `LoginPage.tsx` (cola `useState` +
 * `pushToast`/`dismissToast`, sin Provider/Context global — ver JSDoc
 * "Cambio — Sprint 5.2.2.1" más arriba para la justificación completa de
 * por qué se replica este patrón en vez de crear uno nuevo). Reservado
 * EXCLUSIVAMENTE para errores de Supabase (RLS/permisos/timeout/conexión/
 * constraint) del flujo Publish -- `FieldError` (`publish-modal.tsx`, Sprint
 * 5.2.1 Fix) sigue siendo el único mecanismo para errores de validación de
 * formulario, sin ningún cambio.
 */
interface CoordinatorLayoutToast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

let coordinatorToastIdSeq = 0;

export function CoordinatorLayout({
  sucursalCoord,
  onSucursalCoordChange,
  adminSwitchSlot,
}: CoordinatorLayoutProps) {
  const { profile, logout } = useAuth();
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  // Sprint 5.2.1 Fix ("Publish Workflow Stabilization") — `activeJob`/
  // `setActiveJob` ya no son un `useState` local de este archivo, ver JSDoc
  // "Cambio — Sprint 5.2.1 Fix" más arriba.
  // Sprint 5.2.2.1 — se agrega `tiendaId`/`empresaId` a esta misma
  // desestructuración (mismo hook ya usado, ningún consumo nuevo del
  // Contexto Operativo): son los valores reales ya resueltos por
  // `OperationalContextProvider` (idénticos a los que ya consume
  // `DespachoPage.tsx` para los KPIs), necesarios para el INSERT real de
  // `trabajos`.
  // Sprint 5.2.3.1 — se agregan `esSuperusuario`/`tiendaNombre` a esta
  // misma desestructuración (ambos campos ya existían en
  // `OperationalContextValue`, sin ningún cambio a ese tipo/Provider):
  // determinan si el selector "Sucursal activa" debe quedar bloqueado a la
  // tienda real del Coordinador (`esSuperusuario === false`) o
  // completamente libre (`admin` en Modo Coordinador, `esSuperusuario ===
  // true`) — ver `sucursalLockValue` más abajo y el JSDoc "AJUSTE — Sprint
  // 5.2.3.1" de `sucursal-select.tsx`.
  const { activeJob, setActiveJob, tiendaId, empresaId, esSuperusuario, tiendaNombre } =
    useOperationalContext();

  // Sprint 5.2.3.1 — `undefined` para un `admin` en Modo Coordinador
  // (selector completamente libre, sin cambio de comportamiento). Para un
  // Coordinador real, se bloquea a `tiendaNombre` (la tienda real resuelta
  // por `resolveProfile()` desde `coordinadores.tienda_id`) -- si todavía
  // no resolvió (`null`, ver la limitación de RLS de `tiendas` documentada
  // desde el Sprint 5.2.3.3/5.2.3.4), se pasa `''` (string vacío): como
  // ninguna opción real de `SUCURSALES` puede tener ese valor, todas quedan
  // deshabilitadas -- una degradación segura, nunca una opción incorrecta
  // marcada como "la tienda real".
  const sucursalLockValue = esSuperusuario ? undefined : (tiendaNombre ?? '');

  // Sprint 5.2.3.x ("Corrección definitiva del contexto operativo del
  // Coordinador — una sola fuente de verdad") — nuevo cálculo, mismo
  // criterio y las mismas dos variables ya en scope que `sucursalLockValue`
  // (ningún estado nuevo). Auditoría de este Sprint (ver su reporte
  // técnico): tanto el `<select>` como el badge superior (`Header`)
  // mostraban, para un Coordinador real, `sucursalCoord` -- un `useState`
  // de `RootLayout.tsx` que nace en el literal fijo `'Multiplaza'` y que,
  // hasta este Sprint, se sincronizaba con `profile.tiendaNombre` mediante
  // un efecto unidireccional que NUNCA corría si `tiendaNombre` era `null`
  // (RLS de `tiendas` sin policy, Sprint 5.2.3.3/5.2.3.4) -- dejando
  // `sucursalCoord` congelado en `'Multiplaza'`, un snapshot obsoleto que
  // no reflejaba honestamente "la tienda real todavía no se resolvió".
  //
  // `sucursalDisplayValue` reemplaza esa fuente para AMBOS lugares que la
  // mostraban: para un Coordinador real (`esSuperusuario === false`) es
  // directamente `tiendaNombre` (`OperationalContext`, sin intermediarios,
  // sin valor por defecto, sin snapshot -- `''` si todavía no resolvió, la
  // misma degradación segura ya usada en `sucursalLockValue`, nunca inventa
  // un nombre). Para un `admin` en Modo Coordinador (`esSuperusuario ===
  // true`) sigue siendo `sucursalCoord` -- ahí SÍ es la fuente correcta,
  // porque es la selección manual del propio admin, el INSUMO que
  // `OperationalContextProvider` usa para resolver la tienda (no tendría
  // sentido "sincronizarlo" con `tiendaNombre`: sería circular). El
  // `useEffect` de `RootLayout.tsx` que antes intentaba esa sincronización
  // para un Coordinador real se retiró en este mismo Sprint -- ver su
  // JSDoc "Sprint 5.2.3.x" en `RootLayout.tsx`.
  const sucursalDisplayValue = esSuperusuario ? sucursalCoord : (tiendaNombre ?? '');

  // Sprint 5.2.2.1 — cola local de Toasts, ver JSDoc de
  // `CoordinatorLayoutToast` arriba.
  const [toasts, setToasts] = useState<CoordinatorLayoutToast[]>([]);
  const pushToast = (tone: ToastTone, title: string, description?: string) => {
    const id = (coordinatorToastIdSeq += 1);
    setToasts((prev) => [...prev, { id, tone, title, description }]);
  };
  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const outletContext: CoordinatorLayoutOutletContext = useMemo(
    () => ({
      sucursalCoord,
      setSucursalCoord: onSucursalCoordChange,
      onOpenPublish: () => setShowPublishModal(true),
      onOpenConfirmCancel: () => setConfirmCancelOpen(true),
      activeJob,
    }),
    [sucursalCoord, onSucursalCoordChange, activeJob],
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
      {/* Sprint 5.2.3.x — `sucursalActiva` (antes NO se pasaba en absoluto:
          hallazgo confirmado de esta ronda, "Problema encontrado" heredado
          y nunca corregido desde el Sprint 3.4 -- ver JSDoc histórico de
          `RootLayout.tsx`, sección "TEMPORARY INTEGRATION — Sprint 3.4").
          Sin este prop, `HeaderStatus` usaba su propio valor por defecto
          (`'Multiplaza'`, hardcodeado en `header-status.tsx`) para CUALQUIER
          Coordinador, sin relación alguna con su tienda real -- el badge
          superior derecho nunca reflejaba la sucursal activa real. Ahora
          recibe exactamente `sucursalDisplayValue`, la misma única fuente
          de verdad que ya gobierna `SucursalSelect`/`PublishModal` más
          abajo -- sin estado nuevo, sin default propio de este archivo. */}
      <Header
        role={profile.rol}
        profile={profile}
        onLogout={() => void logout()}
        sucursalActiva={sucursalDisplayValue}
      />
      <main className="flex-1">
        {adminSwitchSlot}
        {/* Sprint 3.4 (`SucursalSelect`) / Sprint 3.3 (`CoordinatorSubtabs`,
            routeado en Sprint 5.1) — antes duplicados dentro de
            `DespachoPage.tsx`/`TrabajosPage.tsx`, ahora un único punto,
            compartido por las 3 rutas del Coordinador vía `<Outlet/>` (ver
            "Efecto colateral de fidelidad" más arriba). */}
        {/* Sprint 5.2.3.x — `value` pasa de `sucursalCoord` (snapshot de
            `RootLayout.tsx`, podía quedar congelado en `'Multiplaza'` para
            un Coordinador real) a `sucursalDisplayValue` (misma variable
            que ahora también gobierna el badge del `Header` y el `sucursal`
            inicial de `PublishModal`, ver más abajo) -- una sola fuente de
            verdad para las 3 superficies. `onChange` no cambia: sigue
            escribiendo en `sucursalCoord`/`RootLayout.tsx`, relevante
            únicamente para el `admin` en Modo Coordinador (única rama donde
            el usuario puede de verdad elegir); para un Coordinador real
            todas las opciones salvo la propia quedan `disabled`
            (`enabledValue`), así que este `onChange` nunca se dispara. */}
        <SucursalSelect
          value={sucursalDisplayValue}
          onChange={onSucursalCoordChange}
          enabledValue={sucursalLockValue}
        />
        <CoordinatorSubtabs />
        <Outlet context={outletContext} />
      </main>
      <Footer />
      {/* TEMPORARY INTEGRATION — Sprint 3.5 (PublishModal): ver JSDoc
          histórico completo en `RootLayout.tsx`. Sprint 5.1.2: se relocaliza
          aquí (antes vivía en `RootLayout.tsx`) — mismo componente, mismas
          props, ningún cambio de comportamiento. */}
      <PublishModal
        sucursal={sucursalDisplayValue}
        enabledValue={sucursalLockValue}
        open={showPublishModal}
        onOpenChange={setShowPublishModal}
        onPublish={async (form: PublishForm) => {
          // Sprint 5.2.2.1 ("Persistencia del trabajo publicado — Supabase")
          // — reemplaza el Job 100% en memoria del Sprint 5.2.1 por un
          // INSERT real en `trabajos`. Ver JSDoc "Cambio — Sprint 5.2.2.1"
          // arriba para la auditoría completa.
          //
          // Guarda defensiva: `tiendaId`/`empresaId` deberían estar
          // resueltos siempre que un Coordinador real llegó hasta acá (para
          // un Coordinador real, `OperationalContextProvider` los resuelve
          // de forma síncrona desde `profile`, sin ningún `loading`
          // intermedio -- ver ese Provider). Se verifica igual, sin asumir,
          // antes de construir un payload con un valor nulo que Postgres
          // rechazaría de todas formas por las columnas `NOT NULL`.
          if (!tiendaId || !empresaId) {
            pushToast(
              'error',
              'No se pudo publicar el trabajo',
              'Todavía no se resolvió la tienda/empresa desde el Contexto Operativo. Intentá de nuevo en unos segundos.',
            );
            return;
          }

          // Mismo criterio de generación que el HTML oficial (`App()`,
          // línea 1934: `"JOB-" + Math.floor(Math.random()*9000+1000)`) —
          // ya usado antes de este Sprint para el `id` del Job temporal,
          // ahora es el valor real de la columna `codigo` (única columna de
          // texto libre, sin default, que identifica al trabajo de forma
          // legible -- `id`, la PK real, es un uuid autogenerado que este
          // Sprint no necesita superficie en `ActiveJob`).
          const codigo = `JOB-${Math.floor(Math.random() * 9000 + 1000)}`;

          const payload: TableInsert<'trabajos'> = {
            empresa_id: empresaId,
            tienda_id: tiendaId,
            coordinador_id: profile.id,
            codigo,
            tipo: form.tipo,
            provincia: form.provincia,
            zona: form.zona,
            tipo_inmueble: form.tipoInmueble,
            calle: form.calle,
            fecha: form.fecha,
            hora: form.hora,
            equipo: form.equipo,
            requisitos: form.requisitos,
            extra: form.extra,
            precio_sugerido: form.precioSugerido,
            urgente: form.urgente,
            bid_minutos: form.bidMins,
          };

          // `trabajosRepository.create()` ya existía (Sprint 4.1.1, sin
          // ningún cambio en este Sprint -- Regla explícita "no modificar el
          // repositorio"). Se envuelve en try/catch (no solo el `!result.ok`
          // de abajo) por la misma razón ya documentada en
          // `DespachoPage.tsx` (Sprint 5.2.1 Fix, "Publish Workflow
          // Stabilization"): `toServiceResult()` no atrapa una excepción de
          // red genuina (a diferencia de un error normal de Postgrest/RLS,
          // que sí vuelve como `{ok:false}` sin lanzar) -- sin este
          // try/catch, una falla de red dejaría el error sin mostrarse
          // (excepción no controlada) en vez de mostrar el Toast.
          try {
            const result = await trabajosRepository.create(payload);

            if (!result.ok) {
              // Cubre, sin ningún caso especial, tanto un error de
              // Postgrest/constraint normal como un rechazo real de RLS (ej.
              // "coordinadores publican en su tienda" si quien publica no es
              // una fila real de `coordinadores` dueña de esa tienda) -- por
              // instrucción explícita del usuario, este Sprint no distingue
              // ni agrega ninguna rama para el modo Administrador/
              // superusuario: el mismo mensaje de error cubre cualquier
              // motivo de rechazo real de Supabase.
              pushToast('error', 'No se pudo publicar el trabajo', result.error.message);
              return;
            }

            // ActiveJob se construye con la fila real devuelta por el
            // `INSERT ... RETURNING` (mismo `.select().single()` de
            // `trabajosRepository.create()`) -- sin ninguna consulta
            // adicional. Única excepción: `sucursal` (nombre visible de la
            // tienda) no es una columna de `trabajos` (solo existe
            // `tienda_id`, un uuid) -- se toma directo de `form.sucursal`,
            // el mismo string ya elegido en el formulario.
            const row = result.data;
            const newJob: JobSummaryCardJob = {
              id: row.codigo,
              tipo: row.tipo,
              zona: row.zona,
              provincia: row.provincia,
              fecha: row.fecha,
              hora: row.hora,
              sucursal: form.sucursal,
              bidMins: row.bid_minutos,
              urgente: row.urgente,
              trabajoId: row.id,
            };
            setActiveJob(newJob);
            setShowPublishModal(false);

            // Sprint 7.2 ("Publicación de trabajos", continuación) --
            // notifica a los instaladores elegibles (activo/no suspendido/
            // misma empresa/provincia/zona) vía el RPC `notificar_instaladores_
            // elegibles`, en una única transacción del lado del servidor (ver
            // `supabase/migrations/0006_notificar_instaladores_elegibles.sql`
            // para la regla de elegibilidad completa y la justificación de
            // por qué es un RPC y no un loop de `INSERT`s desde el cliente).
            //
            // Paso SEPARADO del `INSERT` de `trabajos` de arriba (el RPC
            // necesita `row.id`, que solo existe después de que el `INSERT`
            // ya se confirmó) -- por diseño, el trabajo YA quedó publicado en
            // este punto sin importar el resultado de este paso. Regla de
            // negocio aprobada explícitamente: `0` instaladores notificados
            // es un resultado VÁLIDO del proceso (trabajo publicado, pero sin
            // cobertura de instaladores para esa empresa/provincia/zona en
            // este momento) -- nunca se revierte ni se elimina el trabajo, y
            // nunca se trata como error técnico. Un fallo real del RPC (red/
            // permisos) sí se distingue con su propio mensaje, para no
            // confundir "no había a quién notificar" con "no se pudo
            // notificar".
            const notificacionResult = await callNotificarInstaladoresElegibles({
              p_trabajo_id: row.id,
            });

            if (!notificacionResult.ok) {
              pushToast(
                'error',
                'Trabajo publicado, pero no se pudo notificar a los instaladores',
                notificacionResult.error.message,
              );
            } else if (notificacionResult.data === 0) {
              // Tono `info` (no `error`): esta situación es un resultado
              // VÁLIDO del proceso, no un error técnico -- Decisión aprobada
              // explícitamente, ver JSDoc de arriba.
              pushToast(
                'info',
                'Trabajo publicado',
                'No existen instaladores elegibles para la empresa, provincia y zona seleccionadas, por lo que no se notificó a ningún instalador.',
              );
            } else {
              // Mejora de UX (Sprint 7.2, ronda posterior al cierre técnico)
              // -- `notificacionResult.data` (`> 0`) ya es el conteo real
              // devuelto por el RPC en esta misma invocación; el mensaje se
              // arma con ese valor directamente, sin ninguna consulta
              // adicional a Supabase. Singular/plural ("instalador"/
              // "instaladores elegible"/"elegibles") calculado en el propio
              // mensaje, sin nuevo estado ni componente.
              const cantidad = notificacionResult.data;
              pushToast(
                'info',
                'Trabajo publicado correctamente.',
                `Se notificó a ${cantidad} instalador${cantidad === 1 ? '' : 'es'} elegible${cantidad === 1 ? '' : 's'}.`,
              );
            }

            // Sprint 7.1, Objetivo 6 ("Tiempo real") -- punto de integración
            // documentado, NO conectado en este Sprint. `setActiveJob`
            // (arriba) ya propaga el nuevo trabajo a "Despacho en vivo"/
            // "Mis trabajos"/Calendario Maestro para ESTA sesión (Objetivo
            // 5, ver `TrabajosPage.tsx`/`master-calendar.tsx`), pero no a
            // otras sesiones (otro Coordinador de la misma tienda, un
            // Instalador elegible) -- eso requiere Realtime real. La
            // infraestructura genérica ya existe (`useRealtime()`,
            // `src/hooks/useRealtime.ts`, Sprint 4.1.1: crea/suscribe/limpia
            // un canal, sin ningún listener de `postgres_changes` registrado
            // -- documentado ahí como deliberado, a la espera de que un
            // Sprint funcional decida qué eventos importan). Conectar solo
            // el caso "nuevo trabajo" sin también cubrir los eventos futuros
            // (asignación, cancelación -- Sprints 7.2+) dejaría una
            // suscripción a medio terminar; por eso este Sprint documenta el
            // punto exacto en vez de implementarlo parcialmente (Regla
            // explícita del brief: "No crear una implementación
            // incompleta"). Integración futura: `useRealtime('trabajos:' +
            // tiendaId)` en `TrabajosPage.tsx`/`DespachoPage.tsx`/
            // `master-calendar.tsx`, registrando `postgres_changes` (INSERT
            // sobre `trabajos`, filtrado por `tienda_id`) sobre el `channel`
            // que el hook ya devuelve, invalidando/recargando la lista
            // correspondiente en el callback.
          } catch (err: unknown) {
            pushToast(
              'error',
              'No se pudo publicar el trabajo',
              err instanceof Error
                ? err.message
                : 'Error de red inesperado al publicar el trabajo.',
            );
          }
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
          // Sprint 5.2.1 Fix ("Publish Workflow Stabilization") — Objetivo 2:
          // activeJob → null → CoordinatorEmptyState. `ConfirmDialog` ya
          // cierra el diálogo (`onOpenChange(false)`) después de llamar a
          // este callback, sin necesidad de hacerlo acá también.
          setActiveJob(null);
        }}
      />
      {/* Sprint 5.2.2.1 — Toast local exclusivo para errores de Supabase del
          flujo Publish (ver JSDoc `CoordinatorLayoutToast` arriba). `Toast`/
          `ToastViewport` ya existían (`ui/toast.tsx`); ningún componente
          nuevo. */}
      <ToastViewport>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            tone={toast.tone}
            toastTitle={toast.title}
            description={toast.description}
            onClose={() => dismissToast(toast.id)}
          />
        ))}
      </ToastViewport>
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
 *
 * Sprint 5.2.1 — se agrega el campo `activeJob` (único campo nuevo, ver
 * JSDoc "Cambio mínimo" de `CoordinatorLayout` arriba): expone el Job
 * temporal creado por el flujo Publish para que `DespachoPage.tsx` decida
 * entre `CoordinatorEmptyState`/`CoordinatorWorkspace` (Regla 18/19 de ese
 * Sprint: "toda la UI debe depender únicamente del estado `activeJob`").
 */
export interface CoordinatorLayoutOutletContext {
  sucursalCoord: string;
  setSucursalCoord: (value: string) => void;
  onOpenPublish: () => void;
  onOpenConfirmCancel: () => void;
  activeJob: JobSummaryCardJob | null;
}
