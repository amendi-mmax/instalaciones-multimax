import type { BidEstado, NotificacionCanal, Rol, TrabajoPhase } from '@/types/enums';

/**
 * Tipos "crudos" 1:1 con las columnas de handymax_supabase_schema_v3.sql (snake_case).
 * Ningún componente ni hook debe consumir estos tipos directamente -- pasan siempre
 * por src/lib/mappers.ts hacia los modelos de dominio de src/types/domain.ts
 * (ver ARCHITECTURE.md §7.3).
 *
 * TODO: cuando el schema esté migrado en un proyecto Supabase real, considerar
 * regenerar estos tipos con `supabase gen types typescript` y conciliar con este
 * archivo en vez de mantenerlos solo a mano.
 */

export interface EmpresaRow {
  id: string;
  nombre: string;
  slug: string;
  activa: boolean;
  created_at: string;
}

export interface SucursalRow {
  id: string;
  empresa_id: string;
  nombre: string;
  provincia: string | null;
  direccion: string | null;
  activa: boolean;
  created_at: string;
}

export interface UsuarioRow {
  id: string;
  auth_id: string | null;
  empresa_id: string;
  sucursal_id: string | null;
  rol: Rol;
  nombre: string;
  email: string;
  telefono: string | null;
  empresa_nombre: string | null;
  rating: number;
  cumplimiento: number;
  aceptacion: number;
  activo: boolean;
  suspendido: boolean;
  docs_completos: boolean;
  created_at: string;
  updated_at: string;
}

export interface ZonaCoberturaRow {
  id: string;
  instalador_id: string;
  provincia: string;
  zona: string;
}

export interface TrabajoRow {
  id: string;
  empresa_id: string;
  sucursal_id: string;
  coordinador_id: string;
  tipo: string;
  zona: string;
  provincia: string;
  tipo_inmueble: string | null;
  calle: string | null;
  equipo: string | null;
  requisitos: string | null;
  precio_sugerido: number | null;
  bid_mins: number;
  published_at: string;
  bid_cierra_at: string;
  phase: TrabajoPhase;
  assigned_bid_id: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_direccion: string | null;
  created_at: string;
  updated_at: string;
}

export interface BidRow {
  id: string;
  trabajo_id: string;
  instalador_id: string;
  precio: number;
  fecha_disponible: string;
  hora_disponible: string;
  comentario: string | null;
  estado: BidEstado;
  respondido_at: string;
  created_at: string;
}

export interface NotificacionRow {
  id: string;
  trabajo_id: string;
  destinatario_id: string;
  canal: NotificacionCanal;
  mensaje: string | null;
  enviado: boolean;
  enviado_at: string | null;
  error: string | null;
  created_at: string;
}

/**
 * trabajos_vista expone las mismas columnas que TrabajoRow, con cliente_nombre /
 * cliente_telefono / cliente_direccion ya enmascarados por rol dentro de la propia
 * vista (ver handymax_supabase_schema_v3.sql y ARCHITECTURE.md §9.6). Se modela
 * como alias por ahora; si la vista llega a exponer columnas adicionales, se separa
 * de TrabajoRow.
 */
export type TrabajoVistaRow = TrabajoRow;
