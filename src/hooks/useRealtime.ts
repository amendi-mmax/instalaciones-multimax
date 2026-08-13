import { useEffect, useRef, useState } from 'react';

import type { RealtimeChannel } from '@supabase/supabase-js';

import { createRealtimeChannel, removeRealtimeChannel } from '@/lib/supabase/realtime';

export type RealtimeConnectionStatus = 'idle' | 'subscribing' | 'subscribed' | 'error' | 'closed';

export interface UseRealtimeResult {
  channel: RealtimeChannel | null;
  status: RealtimeConnectionStatus;
}

/**
 * useRealtime — hook público de infraestructura de Supabase Realtime
 * (Sprint 4.1.1, Fase 5/Fase 7: "Preparar infraestructura para Realtime
 * Channels, Presence, Broadcast, Subscriptions. No desarrollar eventos
 * todavía. Solo infraestructura.").
 *
 * Crea un canal con nombre `scope` al montar, lo suscribe, y lo limpia
 * (`removeRealtimeChannel`) al desmontar. **No registra ningún listener de
 * `postgres_changes`/`presence`/`broadcast` por sí solo** -- eso requeriría
 * decidir qué eventos de negocio importan (p. ej. "nuevo trabajo publicado
 * en mi zona"), que es responsabilidad de un Sprint funcional futuro. Ese
 * Sprint puede usar `channel` (devuelto por este hook, antes de que se
 * llame a `.subscribe()` internamente sería ideal, pero por simplicidad de
 * infraestructura este hook ya suscribe) como base, o construir su propio
 * hook de más alto nivel sobre `src/lib/supabase/realtime.ts` directamente
 * si necesita registrar listeners antes de suscribirse.
 *
 * `scope` debe ser estable entre renders (o memoizado por el llamador) --
 * si cambia, este hook desmonta el canal anterior y crea uno nuevo.
 */
export function useRealtime(scope: string): UseRealtimeResult {
  const [status, setStatus] = useState<RealtimeConnectionStatus>('idle');
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    setStatus('subscribing');
    const channel = createRealtimeChannel(scope);
    channelRef.current = channel;

    channel.subscribe((subscriptionStatus) => {
      if (subscriptionStatus === 'SUBSCRIBED') {
        setStatus('subscribed');
      } else if (subscriptionStatus === 'CHANNEL_ERROR' || subscriptionStatus === 'TIMED_OUT') {
        setStatus('error');
      } else if (subscriptionStatus === 'CLOSED') {
        setStatus('closed');
      }
    });

    return () => {
      void removeRealtimeChannel(channel);
      channelRef.current = null;
      setStatus('closed');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `scope` es la
    // única dependencia real; `createRealtimeChannel`/`removeRealtimeChannel`
    // son funciones puras de módulo, no cambian entre renders.
  }, [scope]);

  return { channel: channelRef.current, status };
}
