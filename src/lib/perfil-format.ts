import type { BadgeTone } from '@/components/ui/badge';
import type { Perfil } from '@/types/perfil';

/**
 * perfil-format.ts — Sprint 7.3 (Módulo de Cuenta de Usuario). Extrae
 * `ROL_LABEL`/`ESTADO_LABEL`, que ya existían duplicados como constantes
 * locales dentro de `header-user-menu.tsx` (Sprint 4.2.1) -- este Sprint
 * necesita exactamente los mismos 2 mapeos para "Mi Perfil"
 * (`ProfilePage.tsx`), así que se centralizan acá en vez de copiarlos de
 * nuevo (Regla del brief: "si detectas lógica repetida, extraer helpers").
 * `header-user-menu.tsx` se actualiza para importar de acá -- mismo
 * comportamiento exacto, sin cambios visuales, solo elimina la duplicación.
 *
 * `estadoTone`/`formatFecha` son nuevos de este Sprint, sin equivalente
 * previo en el proyecto (no existe ningún formateador de fecha reutilizable
 * -- `fmt()` de `lib/utils.ts` formatea segundos de countdown, no fechas,
 * ver su propio JSDoc).
 */
export const ROL_LABEL: Record<Perfil['rol'], string> = {
  admin: 'Admin',
  coordinador: 'Coordinador',
  instalador: 'Instalador',
};

export const ESTADO_LABEL: Record<Perfil['estado'], string> = {
  activo: 'Activo',
  suspendido: 'Suspendido',
  inactivo: 'Inactivo',
};

export const ESTADO_TONE: Record<Perfil['estado'], BadgeTone> = {
  activo: 'green',
  suspendido: 'red',
  inactivo: 'amber',
};

/**
 * Formatea una fecha ISO (`created_at`/`last_sign_in_at`, siempre en UTC
 * desde Supabase) a `es-PA` -- misma localización que el resto de la UI en
 * español. `null`/`undefined`/fecha inválida -> `'No disponible'` (Regla
 * explícita del brief: "si un dato no existe, mostrar 'No disponible'" --
 * nunca una fecha adivinada ni un string vacío silencioso).
 */
export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return 'No disponible';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'No disponible';
  return new Intl.DateTimeFormat('es-PA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Iniciales para `Avatar` -- extraído de `header-user-menu.tsx` (Sprint
 * 4.2.1, función local idéntica) porque `ProfilePage.tsx` (Sprint 7.3)
 * necesita exactamente la misma lógica para su propio `Avatar`.
 */
export function initialsFrom(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
