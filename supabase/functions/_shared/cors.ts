/**
 * cors.ts — cabeceras CORS compartidas para las Edge Functions de este
 * proyecto (Sprint 6.1, primera Edge Function del repositorio).
 *
 * Este archivo NO es un patrón nuevo inventado por este Sprint: es el
 * boilerplate estándar y públicamente documentado por Supabase para
 * cualquier Edge Function invocada desde un navegador (`supabase.functions
 * .invoke()` hace un preflight `OPTIONS` real, igual que cualquier fetch
 * cross-origin) -- sin esto, el navegador bloquearía la respuesta antes de
 * que el código de la app pueda leerla, incluso si la Edge Function
 * respondiera correctamente.
 *
 * Se deja `Access-Control-Allow-Origin: '*'` (igual que el boilerplate
 * oficial de Supabase) porque esta función NO se autoriza por origen --
 * se autoriza por el JWT del `Authorization` header (ver `index.ts`,
 * `verifyCaller()`), que es la barrera de seguridad real. Restringir el
 * origen sería seguridad ilusoria (cualquier request server-to-server o
 * con un token robado igual pasaría), y agregaría una dependencia de
 * configuración más (la URL real del frontend desplegado) sin beneficio
 * de seguridad genuino.
 */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
