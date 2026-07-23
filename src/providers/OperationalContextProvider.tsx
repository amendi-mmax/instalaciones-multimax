import { useEffect, useMemo, useState, type ReactNode } from 'react';

import type { JobSummaryCardJob } from '@/components/shared/job-summary-card';
import { useAuth } from '@/hooks/useAuth';
import { resolveSuperusuarioTienda } from '@/services/operational-context.service';
import {
  OperationalContext,
  type ModoVisualizacion,
  type OperationalContextValue,
} from '@/providers/operational-context.context';

/**
 * OperationalContextProvider — "Contexto Operativo" único de la
 * aplicación (Sprint 5.1.1, "Ajuste final -- Modo Administrador
 * Superusuario (MVP)"), consumido vía `useOperationalContext()`
 * (`src/hooks/useOperationalContext.ts`).
 *
 * POR QUÉ EXISTE (recomendación arquitectónica explícita del usuario, no
 * una preferencia de este entorno de trabajo): antes de este ajuste, cada
 * página que necesitara "para qué tienda/empresa estoy operando" tendría
 * que repetir `role === 'admin' && adminVista === 'coordinador'` y
 * resolver la tienda a mano -- deuda técnica que crecería en cada Sprint
 * futuro (5.2/5.3/5.4/6.x/7.x). Esta única abstracción resuelve una vez
 * `empresaId`/`empresaNombre`/`tiendaId`/`tiendaNombre`/`modo`/
 * `esSuperusuario`, y las páginas (`DespachoPage`/`TrabajosPage`) ya no
 * conocen CÓMO se obtiene ese valor -- solo lo consumen.
 *
 * MONTAJE: `RootLayout.tsx` envuelve todo su árbol con este Provider,
 * pasándole `modo` (`role === 'admin' ? adminVista : role`) y
 * `sucursalCoord` (el mismo estado que ya usa `SucursalSelect`/
 * `PublishModal`, sin duplicarlo) -- ver su JSDoc "SPRINT 5.1.1" para el
 * detalle completo.
 *
 * RESOLUCIÓN, dos caminos distintos:
 *
 * 1. **Coordinador/Instalador real, o `admin` viendo "Administración"/
 *    "Instalador"** -- síncrona, directamente desde `profile` (`useAuth()`,
 *    ya resuelto por `AuthProvider`, sin tocarlo). `tiendaId` es `null`
 *    para `admin`/`instalador` -- correcto, no es un error (ninguno tiene
 *    tienda propia en el schema real). `loading` siempre `false` acá --
 *    cero cambio de comportamiento respecto a como `DespachoPage`/
 *    `TrabajosPage` leían `profile.tiendaId` directamente antes de este
 *    ajuste.
 * 2. **`admin` viendo "Coordinador"** (el único caso nuevo) -- asíncrona,
 *    vía `resolveSuperusuarioTienda(sucursalCoord)` (consulta real a
 *    `empresas`/`tiendas`, ver ese servicio). `loading` es `true` mientras
 *    se resuelve; si la sucursal elegida no existe todavía en `tiendas`
 *    para la empresa Multimax, o si la consulta falla, `error` lleva el
 *    mensaje real -- nunca se inventa un `tiendaId`.
 *
 * Ningún Provider existente (`AuthProvider`/`SessionProvider`/
 * `SupabaseProvider`) fue modificado -- este es aditivo, se monta por
 * encima de ellos (ya montados más arriba en `App.tsx`), consumiendo
 * `useAuth()` como cualquier otro componente de la aplicación.
 *
 * ---------------------------------------------------------------------
 * AJUSTE — Sprint 5.2.1 Fix ("Publish Workflow Stabilization")
 * ---------------------------------------------------------------------
 * Este Sprint agrega `activeJob`/`setActiveJob` (único cambio de esta
 * ronda a este archivo) — el trabajo temporal creado por el flujo Publish
 * (Sprint 5.2.1), antes `useState` local de `CoordinatorLayout.tsx`.
 *
 * **Por qué se movió (auditoría solicitada explícitamente por el usuario
 * antes de tocar código, con autorización condicionada al resultado)**:
 * el Objetivo 1 de este brief exige que el trabajo activo sobreviva la
 * navegación Coordinador↔Instalador↔Administración (solo alcanzable, en la
 * práctica, por un `admin` usando `AdminVistaSwitch` — un Coordinador/
 * Instalador real nunca cambia de vista). Se auditó `RootLayout.tsx` línea
 * por línea para responder las 5 preguntas exactas del usuario:
 *
 * 1. **¿`CoordinatorLayout` se destruye o solo cambia su contenido?**
 *    Se DESTRUYE de verdad. `RootLayout.tsx` retorna
 *    `{showCoordinador ? <CoordinatorLayout .../> : <div>...</div>}` — un
 *    ternario de JavaScript que alterna entre 2 TIPOS de elemento
 *    distintos en la misma posición del árbol. React desmonta el subárbol
 *    completo (limpia efectos, descarta todo `useState` local) cada vez
 *    que `showCoordinador` cambia de `true` a `false` o viceversa — no es
 *    un cambio de contenido interno, es un unmount/mount real.
 * 2. **¿Quién decide el cambio de vista?** `RootLayout.tsx` mismo, vía su
 *    propio estado `adminVista` (`useState`, alimentado por
 *    `AdminVistaSwitch.onChange`) — el cálculo de `showCoordinador`/
 *    `showInstalador`/`showAdminPanel` ocurre ahí, no en el Router ni en
 *    `<Outlet/>`. El `useEffect` que sincroniza la URL es un efecto
 *    secundario de esa decisión, no la causa del unmount.
 * 3. **¿Existe ya un componente padre del módulo Despacho que sobreviva sin
 *    subir a `RootLayout`?** No. El árbol es
 *    `RootLayout` → `OperationalContextProvider` → (ternario) →
 *    `CoordinatorLayout` → `<Outlet/>` → `DespachoPage`. Cualquier estado
 *    dentro de la rama `showCoordinador` (incluido el propio
 *    `CoordinatorLayout`) se destruye junto con ella. Los ÚNICOS 2 nodos
 *    que sobreviven el cambio de `adminVista` son `RootLayout` (dueño del
 *    estado que causa el cambio) y `OperationalContextProvider` (envuelve
 *    el ternario, montado una sola vez, nunca dentro de él) — ninguno vive
 *    "dentro" del módulo Despacho en el sentido de estar más abajo que
 *    `CoordinatorLayout`.
 * 4. **¿Puede mantenerse `CoordinatorLayout` montado, solo cambiando su
 *    contenido interno?** Técnicamente sí, pero exige restructurar el
 *    render condicional de `RootLayout.tsx` (montar los 3 bloques de rol
 *    siempre, alternando visibilidad por CSS) — una modificación real y no
 *    trivial a la arquitectura de layout (Header/Footer duplicados en el
 *    DOM oculto, `useEffect`s de KPIs/PublishModal quedarían "vivos" en
 *    segundo plano). El usuario evaluó esta alternativa explícitamente y
 *    **no la autorizó**.
 * 5. **¿Existe ya un Context del módulo Despacho reutilizable?** Sí:
 *    `OperationalContext` (este archivo) — es, de los 2 nodos que
 *    sobreviven (pregunta 3), el único que no es `RootLayout` y el único
 *    que el usuario autorizó tocar. Su responsabilidad documentada
 *    ("para qué empresa/tienda estoy operando") es distinta de `activeJob`
 *    ("qué trabajo está activo en el flujo de Despacho"), pero ambos son,
 *    en los hechos, "estado operativo compartido del Coordinador" — se
 *    verificó que agregar estos 2 campos NO requiere ningún cambio a la
 *    lógica de resolución de empresa/tienda existente (`activeJob` es
 *    completamente independiente de `resolveSuperusuarioTienda`/
 *    `esSuperusuario`/`modo`), no introduce ningún Context/Provider nuevo
 *    (Regla arquitectónica permanente), y no rompe a ninguno de sus 2
 *    consumidores reales existentes (`DespachoPage.tsx`/`TrabajosPage.tsx`,
 *    ninguno de los 2 desestructura `activeJob`/`setActiveJob` hoy, así
 *    que agregar estos campos es aditivo, no rompe nada existente).
 *
 * **Qué NO cambió por este ajuste**: la resolución de
 * `empresaId`/`empresaNombre`/`tiendaId`/`tiendaNombre`/`loading`/`error`
 * (arriba) permanece exactamente igual, mismo código, mismas 2 ramas.
 * `activeJob`/`setActiveJob` es un `useState` adicional, ortogonal, que no
 * participa en ningún cálculo de `useMemo` existente salvo para incluirse
 * en el objeto final. `CoordinatorLayout.tsx` deja de declarar su propio
 * `useState(null)` para `activeJob` y pasa a leerlo/escribirlo de aquí
 * vía `useOperationalContext()` -- ver su JSDoc "Cambio mínimo — Sprint
 * 5.2.1 Fix" para el detalle de ese lado del cambio.
 */
export interface OperationalContextProviderProps {
  modo: ModoVisualizacion;
  sucursalCoord: string;
  children: ReactNode;
}

export function OperationalContextProvider({
  modo,
  sucursalCoord,
  children,
}: OperationalContextProviderProps) {
  const { profile } = useAuth();
  const esSuperusuario = profile?.rol === 'admin';
  // Única condición bajo la cual se ejecuta la resolución real de
  // empresa/tienda por nombre -- instrucción explícita del usuario ("Esta
  // lógica deberá ejecutarse únicamente cuando: role == admin y adminVista
  // == coordinador").
  const requiereResolucionSuperusuario = esSuperusuario && modo === 'coordinador';

  const [resuelto, setResuelto] = useState<{
    empresaId: string | null;
    empresaNombre: string | null;
    tiendaId: string | null;
    tiendaNombre: string | null;
    error: string | null;
  }>({ empresaId: null, empresaNombre: null, tiendaId: null, tiendaNombre: null, error: null });
  const [loading, setLoading] = useState(false);
  // Sprint 5.2.1 Fix — único estado nuevo de esta ronda, ver JSDoc "AJUSTE
  // — Sprint 5.2.1 Fix" más arriba. Independiente de `resuelto`/`loading`
  // (empresa/tienda) -- ninguna de las 2 ramas de `value` (abajo) necesita
  // condicionar su lectura/escritura.
  const [activeJob, setActiveJob] = useState<JobSummaryCardJob | null>(null);

  useEffect(() => {
    if (!requiereResolucionSuperusuario) {
      // Vista "Administración"/"Instalador" (admin), o Coordinador/Instalador
      // real -- no hay nada que resolver de forma asíncrona; `resuelto`
      // queda inerte, el `value` de más abajo usa directamente `profile`.
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    resolveSuperusuarioTienda(sucursalCoord).then((result) => {
      if (!active) return;
      setLoading(false);

      if (!result.ok) {
        setResuelto({
          empresaId: null,
          empresaNombre: null,
          tiendaId: null,
          tiendaNombre: null,
          error: result.error.message,
        });
        return;
      }

      const { empresa, tienda } = result.data;
      setResuelto({
        empresaId: empresa?.id ?? null,
        empresaNombre: empresa?.nombre ?? null,
        tiendaId: tienda?.id ?? null,
        tiendaNombre: tienda?.nombre ?? null,
        error: !empresa
          ? `La empresa "Multimax" (slug real esperado) todavía no existe en Supabase -- ver EMPRESA_MVP_SLUG en src/constants/index.ts.`
          : !tienda
            ? `La sucursal "${sucursalCoord}" todavía no existe en la tabla real "tiendas" para la empresa Multimax.`
            : null,
      });
    });

    return () => {
      active = false;
    };
  }, [requiereResolucionSuperusuario, sucursalCoord]);

  const value: OperationalContextValue = useMemo(() => {
    if (requiereResolucionSuperusuario) {
      return {
        modo,
        esSuperusuario,
        empresaId: resuelto.empresaId,
        empresaNombre: resuelto.empresaNombre,
        tiendaId: resuelto.tiendaId,
        tiendaNombre: resuelto.tiendaNombre,
        loading,
        error: resuelto.error,
        activeJob,
        setActiveJob,
      };
    }

    return {
      modo,
      esSuperusuario,
      empresaId: profile?.empresaId ?? null,
      empresaNombre: profile?.empresaNombre ?? null,
      tiendaId: profile?.tiendaId ?? null,
      tiendaNombre: profile?.tiendaNombre ?? null,
      loading: false,
      error: null,
      activeJob,
      setActiveJob,
    };
  }, [
    requiereResolucionSuperusuario,
    modo,
    esSuperusuario,
    resuelto,
    loading,
    profile,
    activeJob,
  ]);

  return <OperationalContext.Provider value={value}>{children}</OperationalContext.Provider>;
}
