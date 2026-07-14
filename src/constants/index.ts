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

/**
 * `ESTADO` — mapeo estado→(tono/etiqueta) para las Pill de estado de trabajo,
 * portado verbatim de `const ESTADO` (`Multimax_Despacho_v1.3.html`, línea
 * 1155). Es un catálogo transversal del prototipo (no exclusivo del
 * Instalador): además de `MISJOBS`/`InstallerJobs()` (Sprint 3.12, único
 * consumidor real por ahora), el HTML fuente también lo usa para `TRABAJOS`
 * dentro de `Coordinator()` — fuera de alcance de este Sprint, pero se porta
 * el objeto completo (los 6 estados) en vez de solo el subconjunto usado por
 * `MISJOBS` (`confirmado`/`pendiente`/`completado`) para no tener que volver
 * a tocar este archivo ni duplicar el mapeo cuando llegue el Sprint que migre
 * `Coordinator()`/`TRABAJOS`. `ARCHITECTURE.md` §3 ya reserva este catálogo
 * como `constants/estadoUi.ts` para la arquitectura final (indexado por
 * `trabajos.phase`/`bids.estado` reales); aquí vive junto al resto de
 * constantes de Fase 3 hasta que corresponda esa reorganización.
 *
 * `tone` reutiliza los mismos 6 valores de `BadgeTone` (`components/ui/
 * badge.tsx`) sin importar ese tipo aquí (capa `constants/` no depende de
 * `components/`) — el componente consumidor (`InstallerJobs`) es responsable
 * de pasarlo a `Badge`.
 */
export type EstadoUiTone = 'ice' | 'amber' | 'red' | 'green' | 'violet' | 'muted';

export interface EstadoUiInfo {
  tone: EstadoUiTone;
  label: string;
}

export type EstadoUiKey =
  | 'en_vivo'
  | 'asignado'
  | 'completado'
  | 'cancelado'
  | 'confirmado'
  | 'pendiente';

export const ESTADO: Record<EstadoUiKey, EstadoUiInfo> = {
  en_vivo: { tone: 'amber', label: 'En vivo' },
  asignado: { tone: 'violet', label: 'Asignado' },
  completado: { tone: 'green', label: 'Completado' },
  cancelado: { tone: 'red', label: 'Cancelado' },
  confirmado: { tone: 'green', label: 'Confirmado' },
  pendiente: { tone: 'muted', label: 'Pendiente' },
};

/**
 * `MISJOBS` — mock estático de "Mis trabajos" del Instalador, portado
 * verbatim de `const MISJOBS` (`Multimax_Despacho_v1.3.html`, líneas
 * 1327-1352) — 4 registros fijos, sin `id` (a diferencia de `TRABAJOS`, que sí
 * tiene `id`; el HTML fuente no le asigna uno a estos). Único consumidor
 * real: `InstallerJobs` (Sprint 3.12), que agrupa por `grupo` ("Próximos"/
 * "Historial") y resuelve cada `estado` contra `ESTADO` de arriba.
 *
 * Se define como constante reutilizable en vez de un literal dentro del
 * componente, por la regla de preparación para Supabase vigente desde el
 * Sprint 3.12: esta colección podrá sustituirse más adelante por datos reales
 * (tabla `trabajos` filtrada por instalador asignado) sin tocar el JSX/
 * estructura/estilos de `InstallerJobs` — solo la fuente de datos.
 */
export interface MisJobMock {
  tipo: string;
  zona: string;
  fecha: string;
  hora: string;
  precio: number;
  estado: EstadoUiKey;
  grupo: 'Próximos' | 'Historial';
}

export const MISJOBS: readonly MisJobMock[] = [
  {
    tipo: 'Instalación A/A 12,000 BTU',
    zona: 'Paitilla',
    fecha: 'Mañana',
    hora: '10:00 a.m.',
    precio: 120,
    estado: 'confirmado',
    grupo: 'Próximos',
  },
  {
    tipo: 'Mantenimiento de Split',
    zona: 'Costa del Este',
    fecha: 'Hoy',
    hora: '2:00 p.m.',
    precio: 90,
    estado: 'pendiente',
    grupo: 'Próximos',
  },
  {
    tipo: 'Instalación A/A 18,000 BTU',
    zona: 'San Francisco',
    fecha: 'Ayer',
    hora: '3:30 p.m.',
    precio: 160,
    estado: 'completado',
    grupo: 'Historial',
  },
  {
    tipo: 'Reparación de condensador',
    zona: 'Bella Vista',
    fecha: '19 jun',
    hora: '9:00 a.m.',
    precio: 80,
    estado: 'completado',
    grupo: 'Historial',
  },
] as const;

/**
 * `SUSCOL` — mapeo sucursal→color (`bg`/`fg`), portado verbatim de `const
 * SUSCOL` (`Multimax_Despacho_v1.3.html`, línea 1117) — mismas 9 sucursales
 * de `SUCURSALES` (Sprint 3.4), cada una con su color de acento (puntos del
 * calendario, badges `mx-suc-badge`). Único consumidor real: `MasterCalendar`
 * (Sprint 3.14). El HTML fuente también lo usa dentro de `Coordinator()`/
 * `CoordinatorJobs()` (`isMaster` renderiza `MasterCalendar`, rama no-master
 * fuera de alcance de este Sprint) — se porta el objeto completo (las 9
 * sucursales) en vez de solo un subconjunto, mismo criterio ya aplicado a
 * `ESTADO` en el Sprint 3.12, para no reabrir este archivo cuando se migre
 * `CoordinatorJobs()`.
 */
export interface SucursalColor {
  bg: string;
  fg: string;
}

export const SUSCOL: Record<string, SucursalColor> = {
  'Tumba Muerto': { bg: 'rgba(52,225,232,.13)', fg: '#34e1e8' },
  Multiplaza: { bg: 'rgba(169,155,255,.13)', fg: '#a99bff' },
  Albrook: { bg: 'rgba(59,224,138,.13)', fg: '#3be08a' },
  Metromall: { bg: 'rgba(255,178,62,.13)', fg: '#ffb23e' },
  'Los Andes': { bg: 'rgba(255,92,122,.13)', fg: '#ff5c7a' },
  Westland: { bg: 'rgba(93,190,255,.13)', fg: '#5dbbff' },
  'Costa Verde': { bg: 'rgba(100,230,140,.13)', fg: '#64e68c' },
  Chiriquí: { bg: 'rgba(255,160,40,.13)', fg: '#ffa028' },
  'Paso Canoas': { bg: 'rgba(200,100,255,.13)', fg: '#c864ff' },
};

/**
 * `TRABAJOS` — mock estático de "todos los trabajos de todas las sucursales",
 * portado verbatim de `const TRABAJOS` (`Multimax_Despacho_v1.3.html`, líneas
 * 1183-1326) — 13 registros fijos, con fechas `YYYY-MM-DD` reales (a
 * diferencia de `MISJOBS`, que usa etiquetas relativas como "Hoy"/"Mañana").
 * Único consumidor real: `MasterCalendar` (Sprint 3.14), que agrupa por
 * `fecha` para pintar los puntos del calendario y filtra por `sucursal`. El
 * HTML fuente también usa esta misma constante dentro de `Coordinator()`/
 * `CoordinatorJobs()` (lista "Mis trabajos" del coordinador, filtrada por
 * `sucursalActual`) — ese consumidor queda fuera de alcance de este Sprint
 * (`CoordinatorJobs` no está construido todavía), pero no se porta un
 * subconjunto: se transcribe el array completo tal cual el HTML fuente, para
 * no reabrir este archivo cuando le corresponda su propio Sprint.
 *
 * Se define como constante reutilizable en vez de un literal dentro del
 * componente, por la regla de preparación para Supabase vigente desde el
 * Sprint 3.12: esta colección podrá sustituirse más adelante por datos reales
 * (tabla `trabajos`) sin tocar el JSX/estructura/estilos de `MasterCalendar`
 * — solo la fuente de datos.
 */
export interface TrabajoMock {
  id: string;
  tipo: string;
  zona: string;
  provincia: string;
  fecha: string;
  hora: string;
  estado: EstadoUiKey;
  instalador: string | null;
  precio: number;
  sucursal: string;
}

export const TRABAJOS: readonly TrabajoMock[] = [
  {
    id: 'JOB-4821',
    tipo: 'Instalación A/A 12,000 BTU',
    zona: 'Paitilla',
    provincia: 'Panamá',
    fecha: '2026-06-22',
    hora: '2:00 p.m.',
    estado: 'en_vivo',
    instalador: null,
    precio: 130,
    sucursal: 'Multiplaza',
  },
  {
    id: 'JOB-4815',
    tipo: 'Mantenimiento de Split',
    zona: 'Costa del Este',
    provincia: 'Panamá',
    fecha: '2026-06-22',
    hora: '10:00 a.m.',
    estado: 'asignado',
    instalador: 'ClimaTech Panamá',
    precio: 145,
    sucursal: 'Albrook',
  },
  {
    id: 'JOB-4812',
    tipo: 'Instalación A/A 9,000 BTU',
    zona: 'San Miguelito',
    provincia: 'Panamá',
    fecha: '2026-06-22',
    hora: '8:00 a.m.',
    estado: 'completado',
    instalador: 'AirePro',
    precio: 110,
    sucursal: 'Los Andes',
  },
  {
    id: 'JOB-4802',
    tipo: 'Instalación A/A 18,000 BTU',
    zona: 'San Francisco',
    provincia: 'Panamá',
    fecha: '2026-06-21',
    hora: '3:30 p.m.',
    estado: 'completado',
    instalador: 'PTY',
    precio: 160,
    sucursal: 'Metromall',
  },
  {
    id: 'JOB-4793',
    tipo: 'Reparación de condensador',
    zona: 'Bella Vista',
    provincia: 'Panamá',
    fecha: '2026-06-21',
    hora: '9:00 a.m.',
    estado: 'completado',
    instalador: 'Frío Express',
    precio: 90,
    sucursal: 'Tumba Muerto',
  },
  {
    id: 'JOB-4781',
    tipo: 'Instalación A/A 24,000 BTU',
    zona: 'Obarrio',
    provincia: 'Panamá',
    fecha: '2026-06-20',
    hora: '11:00 a.m.',
    estado: 'cancelado',
    instalador: null,
    precio: 210,
    sucursal: 'Multiplaza',
  },
  {
    id: 'JOB-4774',
    tipo: 'Mantenimiento de Split',
    zona: 'Punta Pacífica',
    provincia: 'Panamá',
    fecha: '2026-06-23',
    hora: '4:00 p.m.',
    estado: 'pendiente',
    instalador: null,
    precio: 85,
    sucursal: 'Albrook',
  },
  {
    id: 'JOB-4770',
    tipo: 'Instalación A/A 9,000 BTU',
    zona: 'La Chorrera',
    provincia: 'Panamá Oeste',
    fecha: '2026-06-23',
    hora: '9:00 a.m.',
    estado: 'pendiente',
    instalador: null,
    precio: 110,
    sucursal: 'Westland',
  },
  {
    id: 'JOB-4765',
    tipo: 'Instalación A/A 12,000 BTU',
    zona: 'David',
    provincia: 'Chiriquí',
    fecha: '2026-06-24',
    hora: '8:00 a.m.',
    estado: 'pendiente',
    instalador: null,
    precio: 130,
    sucursal: 'Chiriquí',
  },
  {
    id: 'JOB-4760',
    tipo: 'Mantenimiento de Split',
    zona: 'Santiago',
    provincia: 'Veraguas',
    fecha: '2026-06-24',
    hora: '2:00 p.m.',
    estado: 'pendiente',
    instalador: null,
    precio: 85,
    sucursal: 'Costa Verde',
  },
  {
    id: 'JOB-4755',
    tipo: 'Instalación A/A 18,000 BTU',
    zona: 'Paitilla',
    provincia: 'Panamá',
    fecha: '2026-06-25',
    hora: '10:00 a.m.',
    estado: 'pendiente',
    instalador: null,
    precio: 155,
    sucursal: 'Tumba Muerto',
  },
  {
    id: 'JOB-4750',
    tipo: 'Reparación de condensador',
    zona: 'El Cangrejo',
    provincia: 'Panamá',
    fecha: '2026-06-18',
    hora: '3:00 p.m.',
    estado: 'completado',
    instalador: 'CoolMaster',
    precio: 95,
    sucursal: 'Metromall',
  },
  {
    id: 'JOB-4745',
    tipo: 'Mantenimiento de Split',
    zona: 'Paso Canoas',
    provincia: 'Chiriquí',
    fecha: '2026-06-19',
    hora: '9:00 a.m.',
    estado: 'completado',
    instalador: 'Servifrío',
    precio: 80,
    sucursal: 'Paso Canoas',
  },
] as const;
