/**
 * index.ts — barrel de la capa de servicios base (Sprint 4.1.1, Fase 4).
 */
export {
  getClient,
  normalizeSupabaseError,
  toServiceResult,
  type HandymaxServiceError,
  type ServiceResult,
} from '@/services/supabase.service';
export {
  signInWithPassword,
  signOut,
  getCurrentSession,
  getCurrentUser,
  onAuthStateChange,
  refreshSession,
  resetPasswordForEmail,
  type SignInWithPasswordParams,
} from '@/services/auth.service';
export {
  callAsignarInstalador,
  callSubmitBid,
  type TableRow,
  type TableInsert,
  type TableUpdate,
} from '@/services/database.service';
export { resolveProfile } from '@/services/profile.service';
export {
  getCoordinatorKpis,
  getTrabajosByTienda,
  getTrabajoDetalle,
  type CoordinatorKpis,
} from '@/services/dashboard.service';
export {
  resolveSuperusuarioTienda,
  type SuperusuarioTiendaContexto,
} from '@/services/operational-context.service';
