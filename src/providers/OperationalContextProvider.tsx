import { useEffect, useMemo, useState, type ReactNode } from 'react';

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
    };
  }, [requiereResolucionSuperusuario, modo, esSuperusuario, resuelto, loading, profile]);

  return <OperationalContext.Provider value={value}>{children}</OperationalContext.Provider>;
}
