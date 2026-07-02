/**
 * Enums/uniones tomados literalmente de los CHECK constraints de
 * handymax_supabase_schema_v3.sql. No modificar sin actualizar el schema real.
 */

export type Rol = 'coordinador' | 'instalador' | 'admin';

export type TrabajoPhase = 'live' | 'assigned' | 'completed' | 'cancelled';

export type BidEstado = 'pendiente' | 'seleccionado' | 'rechazado';

export type NotificacionCanal = 'sms' | 'whatsapp' | 'push' | 'email';

/**
 * tipo_inmueble no tiene CHECK constraint en el schema (columna text libre),
 * pero el formulario "Publicar trabajo" del prototipo solo ofrece estas tres
 * opciones -- ver ARCHITECTURE.md §10.1.
 */
export type TipoInmueble = 'Edificio' | 'Casa' | 'Comercial';
