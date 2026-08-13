/**
 * operational-context.context.ts — objeto de contexto crudo de React para
 * el "Contexto Operativo" (Sprint 5.1.1, "Ajuste final -- Modo
 * Administrador Superusuario (MVP)"), mismo criterio ya establecido para
 * `auth.context.ts`/`session.context.ts` (Sprint 4.1.1C): el `Context`
 * crudo vive en un `.ts` separado del Provider/hook público, para uso
 * interno de `providers/`/`hooks/` solamente.
 *
 * QUÉ ES este contexto (recomendación arquitectónica explícita del
 * usuario, para no repetir `role === 'admin' && adminVista === '...'` en
 * cada página que necesite saber "para qué empresa/tienda estoy
 * operando"): una única fuente de verdad, consumible por cualquier
 * página futura (Sprints 5.2/5.3/5.4/6.x/7.x) sin que esa página necesite
 * saber si el operador es un Coordinador real o un `admin` en modo
 * superusuario -- ver `OperationalContextProvider.tsx` para la resolución
 * completa de cada campo.
 */
import { createContext } from 'react';

import type { JobSummaryCardJob } from '@/components/shared/job-summary-card';

/**
 * Modo de visualización actual -- para `coordinador`/`instalador` reales,
 * siempre coincide con su propio `profile.rol`; para `admin`, es el valor
 * elegido en `AdminVistaSwitch` (`RootLayout.tsx`).
 */
export type ModoVisualizacion = 'administracion' | 'coordinador' | 'instalador';

export interface OperationalContextValue {
  modo: ModoVisualizacion;
  /**
   * `true` si el usuario autenticado es `admin` (independientemente de qué
   * `modo` esté viendo en este momento) -- `profile.rol` nunca cambia, esto
   * solo indica que la sesión real es de un Administrador operando el
   * Modo de Visualización temporal del Sprint 5.1.1.
   */
  esSuperusuario: boolean;
  /**
   * `null` únicamente si todavía no se resolvió (ver `loading`) o si la
   * resolución real falló -- nunca un valor adivinado.
   */
  empresaId: string | null;
  empresaNombre: string | null;
  /** `null` para `admin`/`instalador` reales (no tienen tienda propia) o mientras `loading` es `true`. */
  tiendaId: string | null;
  tiendaNombre: string | null;
  /**
   * `true` únicamente mientras se resuelve el contexto operativo de forma
   * asíncrona -- exclusivo del caso `esSuperusuario && modo === 'coordinador'`
   * (ver `operational-context.service.ts`). Para un Coordinador/Instalador
   * real, o para `admin` en cualquier otro modo, siempre es `false` -- la
   * resolución es síncrona, directamente desde `profile`.
   */
  loading: boolean;
  /**
   * Mensaje real si la resolución del contexto superusuario falló (error de
   * Supabase, o la sucursal seleccionada no existe todavía en la tabla real
   * `tiendas` para la empresa Multimax) -- `null` en cualquier otro caso,
   * incluido el caso ya existente y sin cambios de "Coordinador real sin
   * tienda asignada" (ese mensaje lo sigue mostrando la propia página, no
   * este contexto).
   */
  error: string | null;
  /**
   * Sprint 5.2.1 Fix ("Publish Workflow Stabilization") -- único par de
   * campos nuevos de esta ronda, agregados aquí (y no a un nivel superior,
   * `RootLayout.tsx`, ni a un Context/Provider nuevo) tras auditoría
   * explícita solicitada y autorizada por el usuario -- ver el JSDoc
   * "AJUSTE — Sprint 5.2.1 Fix" de `OperationalContextProvider.tsx` para la
   * evidencia completa (por qué `CoordinatorLayout` se desmonta al cambiar
   * de vista, por qué este Provider es el único nodo del árbol que
   * sobrevive esa transición sin ser `RootLayout`, y por qué agregar estos
   * 2 campos no altera su responsabilidad documentada de "empresa/tienda
   * actual"). `activeJob` es el trabajo temporal publicado por el flujo
   * `PublishModal` (Sprint 5.2.1) -- vive en memoria únicamente, nunca en
   * Supabase/`localStorage`/`sessionStorage` (Reglas del Sprint 5.2.1/
   * 5.2.1 Fix).
   */
  activeJob: JobSummaryCardJob | null;
  setActiveJob: (job: JobSummaryCardJob | null) => void;
}

export const OperationalContext = createContext<OperationalContextValue | null>(null);
