/**
 * index.ts — barrel público de la capa de infraestructura Supabase
 * (Sprint 4.1.1, Fase 1/Fase A).
 *
 * Deliberadamente **no reexporta `server.ts`** -- ese módulo usa la
 * service role key y no debe quedar a un `import` de distancia de código
 * de navegador vía este barrel de conveniencia. Quien realmente necesite el
 * cliente de servidor (un script de Node) debe importarlo explícitamente
 * desde `@/lib/supabase/server`, nunca desde aquí.
 */
export { getSupabaseClient, __resetSupabaseClientForTests } from '@/lib/supabase/client';
export {
  getClientEnvironment,
  tryGetClientEnvironment,
  MissingEnvironmentVariableError,
  CLIENT_ENV_VAR_NAMES,
  type ClientEnvironment,
} from '@/lib/supabase/environment';
export {
  TABLES,
  VIEWS,
  RPC_FUNCTIONS,
  GENERATED_TYPES_PATH,
  SUPABASE_CLIENT_OPTIONS,
  buildRealtimeChannelName,
  type TableName,
} from '@/lib/supabase/config';
export {
  createRealtimeChannel,
  removeRealtimeChannel,
  sendBroadcast,
  trackPresence,
  untrackPresence,
  type RealtimeChannel,
} from '@/lib/supabase/realtime';
