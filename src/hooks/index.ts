/**
 * index.ts — barrel de la capa de hooks base (Sprint 4.1.1, Fase 5).
 */
export { useSupabase } from '@/hooks/useSupabase';
export { useSession, type UseSessionResult } from '@/hooks/useSession';
export { useAuth } from '@/hooks/useAuth';
export { useRealtime, type RealtimeConnectionStatus, type UseRealtimeResult } from '@/hooks/useRealtime';
export { useOperationalContext } from '@/hooks/useOperationalContext';
