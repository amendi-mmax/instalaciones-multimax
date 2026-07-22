/**
 * index.ts — barrel de la capa de Providers de infraestructura Supabase
 * (Sprint 4.1.1, Fase 3).
 *
 * Este `AuthProvider` fue, durante los Sprints 4.1.1–4.1.1C, un genérico
 * que coexistía deliberadamente con el `AuthProvider`/`useAuth` legacy de
 * `src/contexts/AuthContext.tsx` (Fase 3 de UI, tipado contra el modelo
 * `usuario`/`rol`/`sucursalId` ya descartado). Sprint 4.2.1 ("Sistema de
 * Autenticación") completó este `AuthProvider` con resolución real de
 * perfil/rol y retiró por completo el legacy -- ver
 * `docs/architecture/frontend/SPRINT_4_2_1_AUTH_REPORT.md`. Este es ahora
 * el único `AuthProvider`/`useAuth` de la aplicación.
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
export {
  OperationalContextProvider,
  type OperationalContextProviderProps,
} from '@/providers/OperationalContextProvider';

export type { SessionContextValue } from '@/providers/session.context';
export type { AuthContextValue } from '@/providers/auth.context';
export type { ModoVisualizacion, OperationalContextValue } from '@/providers/operational-context.context';
