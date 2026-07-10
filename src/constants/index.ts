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

/**
 * PROVINCIAS / ZONAS — catálogo de provincias y corregimientos/zonas de
 * Panamá (`Multimax_Despacho_v1.3.html`, líneas 1084-1097: `const PROVINCIAS`
 * y `const ZONAS`), transcrito verbatim. Alimenta los `<select>` de
 * "Provincia"/"Zona" del `PublishModal` (Sprint 3.5) — no es lógica de
 * negocio ni un mock nuevo, es el mismo contenido estático del prototipo.
 */
export const PROVINCIAS = [
  'Panamá',
  'Panamá Oeste',
  'Colón',
  'Coclé',
  'Chiriquí',
  'Herrera',
  'Los Santos',
  'Veraguas',
  'Bocas del Toro',
  'Darién',
  'Comarca Guna Yala',
] as const;

export const ZONAS: Record<string, readonly string[]> = {
  Panamá: [
    'San Francisco',
    'Bella Vista',
    'Paitilla',
    'Punta Pacífica',
    'Costa del Este',
    'El Cangrejo',
    'Obarrio',
    'Marbella',
    'Vía España',
    'San Miguelito',
    'Juan Díaz',
    'Tocumen',
    'Pedregal',
    'Las Cumbres',
    'Chilibre',
    'Ancón',
    'Betania',
    'Río Abajo',
    'Parque Lefevre',
    'Pueblo Nuevo',
    'Calidonia',
    'Curundú',
  ],
  'Panamá Oeste': [
    'La Chorrera',
    'Arraiján',
    'Panamá Pacífico',
    'Vista Alegre',
    'Burunga',
    'Veracruz',
    'Capira',
    'Chame',
    'San Carlos',
    'Nueva Gorgona',
  ],
  Colón: ['Colón', 'Sabanitas', 'Cativá', 'Puerto Pilón', 'Buena Vista', 'Portobelo'],
  Coclé: ['Penonomé', 'Aguadulce', 'Antón', 'Natá', 'La Pintada'],
  Chiriquí: ['David', 'Dolega', 'Boquete', 'Bugaba', 'Concepción'],
  Herrera: ['Chitré', 'Los Pozos', 'Ocú', 'Pesé'],
  'Los Santos': ['Las Tablas', 'Guararé', 'Pedasí', 'Macaracas'],
  Veraguas: ['Santiago', 'Soná', 'Atalaya', 'La Mesa'],
  'Bocas del Toro': ['Changuinola', 'Almirante', 'Bocas del Toro (Isla Colón)'],
  Darién: ['La Palma', 'Metetí', 'Yaviza'],
  'Comarca Guna Yala': ['El Porvenir', 'Cartí'],
};

/**
 * BID_OPTIONS — opciones de "tiempo del bid" (`Multimax_Despacho_v1.3.html`,
 * líneas 1061-1070: `const BID_OPTIONS`), transcrito verbatim. Alimenta los
 * botones `Chip` (variant="bidbtn") del `PublishModal` (Sprint 3.5).
 */
export interface BidOption {
  mins: number;
  label: string;
}

export const BID_OPTIONS: readonly BidOption[] = [
  { mins: 2, label: '2 minutos' },
  { mins: 5, label: '5 minutos' },
  { mins: 10, label: '10 minutos' },
];

/**
 * buildTimeSlots / SLOTS_COORD — genera los horarios cada 15 minutos entre
 * `startH` y `endH` en formato 12h con a.m./p.m. (`Multimax_Despacho_v1.3.html`,
 * líneas 1099-1113: `function buildTimeSlots` + `const SLOTS_COORD =
 * buildTimeSlots(7, 20)`), portado verbatim como utilidad pura (no es lógica
 * de negocio: no lee ni escribe ningún estado de la aplicación, solo genera
 * una lista estática de strings). Alimenta el `<select>` de "Hora" del
 * `PublishModal` (Sprint 3.5). `SLOTS_INST` (mismo cálculo, usado por el
 * Instalador) no se agrega todavía — pertenece a un Sprint futuro.
 */
export function buildTimeSlots(startH: number, endH: number): string[] {
  const out: string[] = [];
  for (let h = startH; h <= endH; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === endH && m > 0) break;
      const ampm = h < 12 ? 'a.m.' : 'p.m.';
      let hh = h % 12;
      if (hh === 0) hh = 12;
      out.push(`${hh}:${String(m).padStart(2, '0')} ${ampm}`);
    }
  }
  return out;
}

export const SLOTS_COORD: readonly string[] = buildTimeSlots(7, 20);

/**
 * INSTALLERS / ELIGIBLE_ORDER — mock de instaladores del prototipo
 * (`Multimax_Despacho_v1.3.html`, línea 887: `const INSTALLERS = [...]`, 11
 * instaladores; línea 1020: `const ELIGIBLE_ORDER = [...]`, 9 ids),
 * transcritos verbatim. Alimentan el posicionamiento de pines de `Radar`
 * (Sprint 3.7, `src/components/shared/radar.tsx`): `Radar` itera
 * `INSTALLERS.filter(i => eligibleIds.includes(i.id))` y usa `i.km` para la
 * distancia radial de cada pin.
 *
 * Nota de fidelidad: los campos usan los nombres literales del prototipo
 * (`zona`, `km`, `cumpl`, `acept`, `prom`, `disp`, `docs`, `susp`), distintos
 * de los del tipo de dominio `Usuario`/`Instalador` (`types/domain.ts`:
 * `rating`, `cumplimiento`, `aceptacion`, etc. en camelCase completo) — misma
 * discrepancia ya reportada para `km` en el Sprint 3.2
 * (`InstallerProfileSummary`). No se unifican aquí: `INSTALLERS` es el mock
 * literal del prototipo, no una fuente de verdad de dominio. La fuente real
 * de instaladores en producción vendrá de Supabase (tabla `usuarios`, ver
 * `types/database.ts`) en una fase de integración futura.
 */
export interface InstallerMock {
  id: string;
  nombre: string;
  zona: string;
  rating: number;
  km: number;
  cumpl: number;
  acept: number;
  prom: number;
  disp: 'ahora' | 'hoy' | 'semana' | 'ocupado';
  docs: boolean;
  susp: boolean;
}

export const INSTALLERS: readonly InstallerMock[] = [
  {
    id: 'pty',
    nombre: 'Instalaciones PTY',
    zona: 'Paitilla',
    rating: 4.9,
    km: 1.8,
    cumpl: 98,
    acept: 92,
    prom: 41,
    disp: 'ahora',
    docs: true,
    susp: false,
  },
  {
    id: 'climatech',
    nombre: 'ClimaTech Panamá',
    zona: 'Punta Pacífica',
    rating: 4.8,
    km: 2.6,
    cumpl: 95,
    acept: 88,
    prom: 55,
    disp: 'ahora',
    docs: true,
    susp: false,
  },
  {
    id: 'frio',
    nombre: 'Frío Express PTY',
    zona: 'San Francisco',
    rating: 4.7,
    km: 3.4,
    cumpl: 93,
    acept: 81,
    prom: 70,
    disp: 'hoy',
    docs: true,
    susp: false,
  },
  {
    id: 'airepro',
    nombre: 'AirePro Paitilla',
    zona: 'Paitilla',
    rating: 4.6,
    km: 2.1,
    cumpl: 90,
    acept: 74,
    prom: 62,
    disp: 'hoy',
    docs: true,
    susp: false,
  },
  {
    id: 'cool',
    nombre: 'CoolMaster Panamá',
    zona: 'Costa del Este',
    rating: 4.5,
    km: 4.9,
    cumpl: 88,
    acept: 69,
    prom: 95,
    disp: 'semana',
    docs: true,
    susp: false,
  },
  {
    id: 'servifrio',
    nombre: 'Servifrío',
    zona: 'Bella Vista',
    rating: 4.4,
    km: 5.6,
    cumpl: 86,
    acept: 65,
    prom: 110,
    disp: 'hoy',
    docs: true,
    susp: false,
  },
  {
    id: 'andes',
    nombre: 'Andes Clima',
    zona: 'El Cangrejo',
    rating: 4.3,
    km: 6.8,
    cumpl: 84,
    acept: 60,
    prom: 130,
    disp: 'semana',
    docs: true,
    susp: false,
  },
  {
    id: 'tecno',
    nombre: 'TecnoAire',
    zona: 'Obarrio',
    rating: 4.2,
    km: 7.9,
    cumpl: 82,
    acept: 58,
    prom: 140,
    disp: 'hoy',
    docs: true,
    susp: false,
  },
  {
    id: 'polar',
    nombre: 'Polar Service',
    zona: 'Vía España',
    rating: 4.1,
    km: 9.2,
    cumpl: 80,
    acept: 55,
    prom: 160,
    disp: 'semana',
    docs: true,
    susp: false,
  },
  {
    id: 'susp',
    nombre: 'RapiClima',
    zona: 'Tocumen',
    rating: 3.6,
    km: 11.0,
    cumpl: 61,
    acept: 40,
    prom: 220,
    disp: 'ocupado',
    docs: true,
    susp: true,
  },
  {
    id: 'vencido',
    nombre: 'Aire Total',
    zona: 'Juan Díaz',
    rating: 4.0,
    km: 8.4,
    cumpl: 78,
    acept: 52,
    prom: 150,
    disp: 'hoy',
    docs: false,
    susp: false,
  },
] as const;

export const ELIGIBLE_ORDER: readonly string[] = [
  'pty',
  'climatech',
  'frio',
  'airepro',
  'cool',
  'servifrio',
  'andes',
  'tecno',
  'polar',
] as const;
