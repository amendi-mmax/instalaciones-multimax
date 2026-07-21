/**
 * index.ts — barrel de la capa de Providers de infraestructura Supabase
 * (Sprint 4.1.1, Fase 3).
 *
 * Aviso de nomenclatura duplicada (documentado también en el informe de
 * este Sprint y en `MIGRATION_STATUS.md`): este barrel exporta un
 * `AuthProvider` **nuevo**, distinto del `AuthProvider`/`useAuth` ya
 * existentes en `src/contexts/AuthContext.tsx` (Fase 3 de UI, legacy, no
 * tocado en este Sprint). Ambos coexisten temporalmente -- no importar los
 * dos en el mismo archivo sin alias explícito
 * (`import { AuthProvider as LegacyAuthProvider } from '@/contexts/AuthContext'`).
 * La reconciliación entre ambos es un Sprint futuro (ver
 * `docs/frontend/FRONTEND_SYNC_PLAN.md`, Fase 3).
 *
 * Desde Sprint 4.1.1C (problema #5): los hooks públicos de lectura
 * (`useSupabaseContext`/`useSessionContext`/`useAuthContext`) ya no viven en
 * los archivos `.tsx` de este directorio -- se movieron a los hooks
 * públicos de `src/hooks/` (`useSupabase`/`useSession`/`useAuth`), que son
 * los que debe importar el resto de la aplicación. Este barrel ya no los
 * re-exporta desde acá; para el objeto `Context` crudo (uso interno de
 * `providers/`/`hooks/` solamente), importar directamente de
 * `supabase.context.ts`/`session.context.ts`/`auth.context.ts`.
 */
export { SupabaseProvider, type SupabaseProviderProps } from '@/providers/SupabaseProvider';
export { SessionProvider, type SessionProviderProps } from '@/providers/SessionProvider';
export { AuthProvider, type AuthProviderProps } from '@/providers/AuthProvider';
export { AppProviders, type AppProvidersProps } from '@/providers/AppProviders';

export type { SessionContextValue } from '@/providers/session.context';
export type { AuthContextValue } from '@/providers/auth.context';
