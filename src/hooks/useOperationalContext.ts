import { useContext } from 'react';

import {
  OperationalContext,
  type OperationalContextValue,
} from '@/providers/operational-context.context';

/**
 * useOperationalContext — hook público del "Contexto Operativo" (Sprint
 * 5.1.1, "Ajuste final -- Modo Administrador Superusuario (MVP)"). Mismo
 * patrón que `useAuth()`/`useSession()`: lee el `Context` crudo y lanza si
 * se usa fuera de `<OperationalContextProvider>` (montado por
 * `RootLayout.tsx`, envolviendo todo el árbol de rutas -- ver su JSDoc
 * "SPRINT 5.1.1").
 *
 * Reemplaza, en `DespachoPage.tsx`/`TrabajosPage.tsx`, la lectura directa
 * de `profile.tiendaId` vía `useAuth()` -- para un Coordinador real el
 * valor resuelto es idéntico (`tiendaId`/`tiendaNombre` vienen de
 * `profile` sin ningún cambio), pero además cubre correctamente el caso
 * nuevo de un `admin` viendo la vista "Coordinador" (ver
 * `OperationalContextProvider.tsx` para la resolución completa). Las
 * páginas ya no necesitan saber cuál de los dos casos es -- consumen
 * únicamente `tiendaId`/`tiendaNombre`/`loading`/`error`.
 */
export function useOperationalContext(): OperationalContextValue {
  const value = useContext(OperationalContext);
  if (!value) {
    throw new Error(
      '[handymax] useOperationalContext() se usó fuera de un ' +
        '<OperationalContextProvider>. Envolvé el árbol de componentes con ' +
        '<OperationalContextProvider> (ver src/layouts/RootLayout.tsx).',
    );
  }
  return value;
}
