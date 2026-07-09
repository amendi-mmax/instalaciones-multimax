/**
 * Punto de entrada único para constantes compartidas de la aplicación.
 *
 * Los catálogos migrados del prototipo (PROVINCIAS, ZONAS, BID_OPTIONS, mapeo de
 * estado/tono para las Pill, colores por sucursal, etc. -- ver ARCHITECTURE.md §3
 * y §10) se agregan durante la migración de componentes, junto con cada feature
 * que los consume. Este archivo existe desde ya para que la ruta de import
 * `@/constants` esté disponible y estable entre fases.
 */

export const APP_NAME = 'Multimax Despacho' as const;

/**
 * SUCURSALES — lista literal de sucursales del prototipo (`Multimax_Despacho_v1.3.html`,
 * línea 1116: `const SUCURSALES = [...]`), transcrita verbatim. Alimenta el
 * `<select>` de `mx-suc-sel` (Sprint 3.4, `SucursalSelect`) para reconstruir
 * exactamente las 9 opciones del HTML fuente — no es lógica de negocio ni un
 * mock de datos nuevo, es el mismo contenido estático que ya tenía el
 * prototipo para este bloque. En el HTML fuente esta misma constante también
 * alimenta el badge de sucursal del Header (`sucursalCoord`, mostrado vía
 * `Pill`) y otros bloques de Coordinator/Admin todavía no migrados; aquí solo
 * se usa para `SucursalSelect`. La lista real de sucursales vendrá de
 * Supabase (tabla `sucursales`, ver `types/database.ts` → `SucursalRow`) en
 * una fase de integración futura — no se resuelve aquí.
 */
export const SUCURSALES = [
  'Tumba Muerto',
  'Multiplaza',
  'Albrook',
  'Metromall',
  'Los Andes',
  'Westland',
  'Costa Verde',
  'Chiriquí',
  'Paso Canoas',
] as const;
