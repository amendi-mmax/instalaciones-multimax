import { useCallback, useEffect, useState } from 'react';

import { getPreferences, setPreference as setPreferenceService, type UserPreferences } from '@/services/account.service';

export type { UserPreferences } from '@/services/account.service';
export { DEFAULT_USER_PREFERENCES } from '@/services/account.service';

/**
 * useUserPreferences — Sprint 7.3 (creación) / Sprint 7.3.1 (refinamiento).
 *
 * **Cambio del Sprint 7.3.1**: este hook ya NO toca `localStorage`
 * directamente -- toda esa lógica se movió a `account.service.ts`
 * (`getPreferences`/`setPreference`, ver su JSDoc) por instrucción
 * explícita del brief ("Toda esa lógica debe vivir únicamente dentro del
 * AccountService. No acceder directamente a localStorage desde los
 * componentes"). Este hook queda como lo que siempre debió ser: el puente
 * de React (estado + reactividad a cambio de usuario) sobre un servicio
 * plano que no sabe nada de Hooks. Comportamiento observable idéntico al
 * Sprint 7.3 -- mismos defaults, misma clave por usuario, mismo manejo de
 * `localStorage` corrupto/deshabilitado (ahora dentro del servicio).
 *
 * Consumido internamente por `UserContext` (`src/contexts/UserContext.tsx`,
 * Sprint 7.3.1) -- las pantallas ya no llaman a este hook directamente,
 * consumen `useUserContext()`. Se mantiene exportado (no se elimina) por si
 * algún consumidor futuro necesita preferencias sin el resto de
 * `UserContext`.
 */
export function useUserPreferences(userId: string) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => getPreferences(userId));

  useEffect(() => {
    setPreferences(getPreferences(userId));
  }, [userId]);

  const setPreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences(setPreferenceService(userId, key, value));
    },
    [userId],
  );

  return { preferences, setPreference };
}
