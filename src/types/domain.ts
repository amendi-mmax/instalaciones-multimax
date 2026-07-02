import type { BidEstado, NotificacionCanal, Rol, TrabajoPhase } from '@/types/enums';

/**
 * Modelos de dominio (camelCase), fieles a los nombres de campo que ya usaba el
 * prototipo (bidMins, tipoInmueble, precioSugerido, etc.). Son lo único que deben
 * consumir componentes y hooks -- se construyen a partir de los *Row de database.ts
 * vía src/lib/mappers.ts (ver ARCHITECTURE.md §7.3).
 */

export interface Empresa {
  id: string;
  nombre: string;
  slug: string;
  activa: boolean;
}

export interface Sucursal {
  id: string;
  empresaId: string;
  nombre: string;
  provincia: string | null;
  direccion: string | null;
  activa: boolean;
}

export interface Usuario {
  id: string;
  authId: string | null;
  empresaId: string;
  sucursalId: string | null;
  rol: Rol;
  nombre: string;
  email: string;
  telefono: string | null;
  empresaNombre: string | null;
  rating: number;
  cumplimiento: number;
  aceptacion: number;
  activo: boolean;
  suspendido: boolean;
  docsCompletos: boolean;
}

/** Instalador es un Usuario con rol === 'instalador'; alias semántico para las pantallas de despacho. */
export type Instalador = Usuario;

export interface ZonaCobertura {
  id: string;
  instaladorId: string;
  provincia: string;
  zona: string;
}

export interface Trabajo {
  id: string;
  empresaId: string;
  sucursalId: string;
  coordinadorId: string;
  tipo: string;
  zona: string;
  provincia: string;
  tipoInmueble: string | null;
  calle: string | null;
  equipo: string | null;
  requisitos: string | null;
  precioSugerido: number | null;
  bidMins: number;
  publishedAt: string;
  bidCierraAt: string;
  phase: TrabajoPhase;
  assignedBidId: string | null;
  /** Presentes solo si trabajos_vista los expone al usuario actual -- ver ARCHITECTURE.md §9.6. */
  clienteNombre: string | null;
  clienteTelefono: string | null;
  clienteDireccion: string | null;
}

export interface Bid {
  id: string;
  trabajoId: string;
  instaladorId: string;
  precio: number;
  fechaDisponible: string;
  horaDisponible: string;
  comentario: string | null;
  estado: BidEstado;
  respondidoAt: string;
}

export interface Notificacion {
  id: string;
  trabajoId: string;
  destinatarioId: string;
  canal: NotificacionCanal;
  mensaje: string | null;
  enviado: boolean;
  enviadoAt: string | null;
  error: string | null;
}

/**
 * Estado de "enganche" del instalador con un trabajo en el panel de radar del
 * coordinador (antes: job.inst[id].state en el prototipo). No existe como tabla en
 * la base de datos: se deriva de bids (responded/selected/...) combinado con
 * Presence/Broadcast para notified/opened/responding -- ver ARCHITECTURE.md §9.3.
 * Tipo exclusivo de UI, no tiene *Row correspondiente.
 */
export type JobEngagementState =
  | 'idle'
  | 'notified'
  | 'opened'
  | 'responding'
  | 'responded'
  | 'selected'
  | 'confirmed'
  | 'declined'
  | 'lost';
