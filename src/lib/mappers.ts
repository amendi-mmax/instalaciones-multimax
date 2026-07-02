import type {
  BidRow,
  EmpresaRow,
  SucursalRow,
  TrabajoRow,
  UsuarioRow,
  ZonaCoberturaRow,
} from '@/types/database';
import type { Bid, Empresa, Sucursal, Trabajo, Usuario, ZonaCobertura } from '@/types/domain';

/**
 * Capa de traducción entre las filas crudas de Supabase (snake_case, database.ts)
 * y los modelos de dominio (camelCase, domain.ts) que consumen componentes y hooks.
 * Ver ARCHITECTURE.md §7.3 y §6. Los servicios (src/services) son los únicos que
 * deben importar estas funciones; ningún componente debe leer un *Row directamente.
 */

export function mapEmpresaRowToDomain(row: EmpresaRow): Empresa {
  return {
    id: row.id,
    nombre: row.nombre,
    slug: row.slug,
    activa: row.activa,
  };
}

export function mapSucursalRowToDomain(row: SucursalRow): Sucursal {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    nombre: row.nombre,
    provincia: row.provincia,
    direccion: row.direccion,
    activa: row.activa,
  };
}

export function mapUsuarioRowToDomain(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    authId: row.auth_id,
    empresaId: row.empresa_id,
    sucursalId: row.sucursal_id,
    rol: row.rol,
    nombre: row.nombre,
    email: row.email,
    telefono: row.telefono,
    empresaNombre: row.empresa_nombre,
    rating: row.rating,
    cumplimiento: row.cumplimiento,
    aceptacion: row.aceptacion,
    activo: row.activo,
    suspendido: row.suspendido,
    docsCompletos: row.docs_completos,
  };
}

export function mapZonaCoberturaRowToDomain(row: ZonaCoberturaRow): ZonaCobertura {
  return {
    id: row.id,
    instaladorId: row.instalador_id,
    provincia: row.provincia,
    zona: row.zona,
  };
}

export function mapTrabajoRowToDomain(row: TrabajoRow): Trabajo {
  return {
    id: row.id,
    empresaId: row.empresa_id,
    sucursalId: row.sucursal_id,
    coordinadorId: row.coordinador_id,
    tipo: row.tipo,
    zona: row.zona,
    provincia: row.provincia,
    tipoInmueble: row.tipo_inmueble,
    calle: row.calle,
    equipo: row.equipo,
    requisitos: row.requisitos,
    precioSugerido: row.precio_sugerido,
    bidMins: row.bid_mins,
    publishedAt: row.published_at,
    bidCierraAt: row.bid_cierra_at,
    phase: row.phase,
    assignedBidId: row.assigned_bid_id,
    clienteNombre: row.cliente_nombre,
    clienteTelefono: row.cliente_telefono,
    clienteDireccion: row.cliente_direccion,
  };
}

export function mapBidRowToDomain(row: BidRow): Bid {
  return {
    id: row.id,
    trabajoId: row.trabajo_id,
    instaladorId: row.instalador_id,
    precio: row.precio,
    fechaDisponible: row.fecha_disponible,
    horaDisponible: row.hora_disponible,
    comentario: row.comentario,
    estado: row.estado,
    respondidoAt: row.respondido_at,
  };
}
