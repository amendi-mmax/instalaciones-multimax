/**
 * realtime.ts — infraestructura genérica de Supabase Realtime (Sprint
 * 4.1.1, Fase 7: "Preparar infraestructura para Realtime Channels,
 * Presence, Broadcast, Subscriptions. No desarrollar eventos todavía.
 * Solo infraestructura.").
 *
 * Deliberadamente sin ningún evento/canal específico de HANDYMAX (nada de
 * "trabajo publicado", "nueva oferta", etc. -- eso es lógica de negocio de
 * un Sprint funcional futuro). Este módulo solo expone fábricas y
 * utilidades genéricas y reutilizables sobre `RealtimeChannel` de
 * `@supabase/supabase-js`.
 */
import type {
  RealtimeChannel,
  RealtimeChannelSendResponse,
  RealtimeRemoveChannelResponse,
} from '@supabase/supabase-js';

import { getSupabaseClient } from '@/lib/supabase/client';
import { buildRealtimeChannelName } from '@/lib/supabase/config';

/**
 * Crea (o recupera, si ya existe con el mismo nombre) un canal Realtime.
 * No se suscribe automáticamente -- quien lo use decide cuándo llamar a
 * `.subscribe()`, después de registrar los listeners que necesite
 * (`postgres_changes`/`presence`/`broadcast`), evitando así configurar
 * lógica de negocio dentro de este archivo genérico.
 */
export function createRealtimeChannel(scope: string): RealtimeChannel {
  const client = getSupabaseClient();
  return client.channel(buildRealtimeChannelName(scope));
}

/**
 * Cierra y remueve un canal del cliente. Debe llamarse siempre en la
 * limpieza (`useEffect` cleanup / `unmount`) de quien haya creado el canal
 * con `createRealtimeChannel`, para no acumular suscripciones huérfanas.
 *
 * Tipo de retorno (Sprint 4.1.1C, problema #2): `SupabaseClient.removeChannel`
 * devuelve `Promise<RealtimeRemoveChannelResponse>`, un tipo exportado por
 * `@supabase/supabase-js` -- no el subconjunto `'ok' | 'error'` escrito a
 * mano en Sprint 4.1.1, que le faltaba el caso `'timed out'` y por eso no
 * compilaba contra la versión instalada del SDK. Se usa el tipo oficial de
 * la librería en vez de redeclararlo, para que cualquier cambio futuro de
 * la API real del SDK se detecte en este archivo en vez de silenciarse.
 */
export async function removeRealtimeChannel(
  channel: RealtimeChannel,
): Promise<RealtimeRemoveChannelResponse> {
  const client = getSupabaseClient();
  const status = await client.removeChannel(channel);
  return status;
}

/**
 * Envía un evento de Broadcast genérico por un canal ya suscripto. No
 * define ningún nombre de evento de negocio -- el llamador decide `event`
 * y `payload` (ver Fase 7: "no desarrollar eventos todavía").
 */
export function sendBroadcast(
  channel: RealtimeChannel,
  event: string,
  payload: Record<string, unknown>,
): Promise<RealtimeChannelSendResponse> {
  return channel.send({
    type: 'broadcast',
    event,
    payload,
  });
}

/**
 * Registra el propio estado de Presence del cliente actual en un canal.
 * Genérico: no asume ninguna forma de "quién está presente" específica de
 * HANDYMAX (eso -- p. ej. "instaladores en línea en una zona" -- es lógica
 * de negocio de un Sprint futuro).
 */
export function trackPresence(
  channel: RealtimeChannel,
  state: Record<string, unknown>,
): Promise<RealtimeChannelSendResponse | 'ok' | 'timed out' | 'error'> {
  return channel.track(state);
}

export function untrackPresence(
  channel: RealtimeChannel,
): Promise<RealtimeChannelSendResponse | 'ok' | 'timed out' | 'error'> {
  return channel.untrack();
}

/**
 * Re-exportado para que los consumidores (p. ej. `useRealtime.ts`) no
 * necesiten importar directamente desde `@supabase/supabase-js` solo para
 * tipar el resultado de `createRealtimeChannel`.
 */
export type { RealtimeChannel };
