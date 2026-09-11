/**
 * config.ts — configuración no sensible y centralizada de la capa de
 * infraestructura Supabase (Sprint 4.1.1, Fase 1/Fase A).
 *
 * Nada de lo que vive en este archivo es secreto: URLs/keys reales se leen
 * en `environment.ts` (cliente) / `server.ts` (server), nunca hardcodeadas
 * aquí. Este archivo solo centraliza nombres de tabla, opciones de
 * queries/realtime y la ruta de los tipos generados, para que el resto de
 * la capa de infraestructura (client.ts, services/, repositories/, hooks/)
 * no repita strings literales.
 */

/**
 * Nombres de las tablas reales de Producción (schema `public`), tal como
 * fueron auditadas y documentadas en `docs/database/DATABASE_INVENTORY.md`
 * (Sprint 4.0.1 — Database Synchronization Audit) a partir del `pg_dump`
 * real en `supabase/migrations/0001_initial_schema.sql`, que es la baseline
 * oficial de este proyecto. **No usar nombres del modelo legacy** (
 * `usuarios`/`sucursales`/`bids`/`zonas_cobertura`/`notificaciones`) en
 * ningún código nuevo -- ver `docs/database/DATABASE_DIFF.md` para el
 * mapeo completo legacy → Producción.
 *
 * `empresasInstaladoras` (Sprint 8.3) -- tabla nueva, `supabase/migrations/
 * 0009_empresas_instaladoras.sql`, verificada vía MCP tras aplicarse.
 */
export const TABLES = {
  admins: 'admins',
  coordinadores: 'coordinadores',
  empresas: 'empresas',
  empresasInstaladoras: 'empresas_instaladoras',
  instaladores: 'instaladores',
  tiendas: 'tiendas',
  trabajos: 'trabajos',
  trabajoInstaladores: 'trabajo_instaladores',
  ofertas: 'ofertas',
  /** Sprint "Costos adicionales" -- tabla nueva, `supabase/migrations/0026_trabajo_extras.sql`. */
  trabajoExtras: 'trabajo_extras',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];

/**
 * Buckets reales de Supabase Storage (Sprint "Costos adicionales" --
 * primer uso de Storage en este proyecto, `supabase/migrations/
 * 0026_trabajo_extras.sql`). Bucket privado (`public: false`) -- el
 * acceso real es siempre vía URL firmada (`createSignedUrl`, generada del
 * lado del cliente con la sesión real del usuario, sujeta a las policies
 * de `storage.objects` ya aplicadas), nunca vía URL pública.
 */
export const STORAGE_BUCKETS = {
  trabajoExtras: 'trabajo-extras',
} as const;

/**
 * Vista real de Producción (`docs/database/DATABASE_INVENTORY.md` §4). Se
 * declara aparte de `TABLES` porque una vista no admite `insert`/`update`/
 * `delete` como una tabla normal -- los repositorios que la usen deben
 * tratarla como solo-lectura.
 */
export const VIEWS = {
  trabajosParaInstalador: 'trabajos_para_instalador',
} as const;

/**
 * Funciones RPC reales de Producción (`docs/database/DATABASE_INVENTORY.md`
 * §5). Se centralizan los nombres aquí -- ningún servicio/repositorio debe
 * escribir el string del RPC a mano.
 */
export const RPC_FUNCTIONS = {
  asignarInstalador: 'asignar_instalador',
  submitBid: 'submit_bid',
  notificarInstaladoresElegibles: 'notificar_instaladores_elegibles',
  /**
   * Sprint 8.4 -- función `SECURITY DEFINER` de solo lectura (migración
   * `0010_instaladores_empresa_instaladora.sql`). Permite que un
   * instalador resuelva el nombre de SU PROPIA empresa instaladora sin
   * necesitar una policy de `SELECT` sobre `empresas_instaladoras` (RLS
   * admin-only, Sprint 8.3, sin cambios).
   */
  nombreEmpresaInstaladora: 'nombre_empresa_instaladora',
  /**
   * RONDA — Ciclo de vida "Completado" (migración
   * `0024_finalizacion_trabajo.sql`). `SECURITY DEFINER` -- el instalador
   * declara que terminó físicamente el trabajo (`assigned` →
   * `pending_confirmation`). Nunca puede escribir `completed` -- ver JSDoc
   * de la migración.
   */
  marcarTrabajoTerminado: 'marcar_trabajo_terminado',
  /**
   * RONDA — Ciclo de vida "Completado" (migración
   * `0024_finalizacion_trabajo.sql`). `SECURITY INVOKER` -- el coordinador/
   * admin confirma el cierre (`pending_confirmation` → `completed`),
   * reutilizando las policies de UPDATE ya existentes sobre `trabajos`.
   */
  confirmarTrabajoCompletado: 'confirmar_trabajo_completado',
  /**
   * Sprint "Costos adicionales" (migración `0026_trabajo_extras.sql`).
   * `SECURITY DEFINER` -- el instalador reporta un costo extra surgido
   * durante la instalación (monto + notas + fotos ya subidas a Storage).
   */
  solicitarCostoExtra: 'solicitar_costo_extra',
  /**
   * Sprint "Costos adicionales" (migración `0026_trabajo_extras.sql`).
   * `SECURITY INVOKER` -- el coordinador/admin aprueba o rechaza una
   * solicitud, reutilizando las policies de UPDATE nuevas sobre
   * `trabajo_extras`.
   */
  revisarCostoExtra: 'revisar_costo_extra',
} as const;

/**
 * Ruta (como comentario, no como import -- ver nota más abajo) donde debe
 * quedar el archivo generado por la Supabase CLI:
 *
 *   src/types/database.generated.ts
 *
 * Generado con:
 *
 *   supabase gen types typescript --linked --schema public > src/types/database.generated.ts
 *
 * (`bdevkryrgmttxnlxaisd` es el project_ref real de Producción, ya
 * documentado en `supabase/config.toml` desde Sprint 4.0.1 -- no es un
 * secreto, es el identificador público del proyecto que aparece en su URL).
 *
 * Ejecutado por el usuario en su entorno local, no por este entorno de
 * trabajo (Sprint 4.1.1B, 2026-07-21) -- ya existe y es real (ver
 * `src/types/README.md` y `ARCHITECTURE.md §14.8` para la evidencia de
 * autenticidad). Toda la infraestructura (`client.ts`, `services/`,
 * `repositories/`) lo consume vía
 * `import type { Database } from '@/types/database.generated'`.
 */
export const GENERATED_TYPES_PATH = 'src/types/database.generated.ts' as const;

/**
 * Opciones por defecto para el cliente de Supabase (`client.ts`). Nada aquí
 * es sensible -- son solo defaults de comportamiento.
 */
export const SUPABASE_CLIENT_OPTIONS = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    // Límite conservador de eventos/segundo por canal -- valor recomendado
    // por la documentación oficial de Supabase Realtime como punto de
    // partida; se puede ajustar por canal específico más adelante (Fase 7 /
    // Sprints funcionales futuros), no es una decisión de negocio.
    params: {
      eventsPerSecond: 10,
    },
  },
} as const;

/**
 * Prefijo de nombre de canal Realtime, para evitar colisiones si en el
 * futuro conviven canales de distintas features bajo el mismo proyecto
 * Supabase. Sin lógica de negocio: es solo una convención de nombres (Fase
 * 7 -- "solo infraestructura").
 */
export function buildRealtimeChannelName(scope: string): string {
  return `handymax:${scope}`;
}
