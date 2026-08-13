/**
 * account.service.ts — Sprint 7.3.1 (Refinamiento del Módulo de Cuenta de
 * Usuario). Punto único de acceso a todo lo que el módulo de Cuenta
 * necesita -- antes disperso entre `profile.service.ts` (perfil),
 * `useAuth()` (usuario/acciones de sesión) y un acceso directo a
 * `localStorage` dentro de `useUserPreferences.ts` (preferencias). Ninguna
 * pantalla debe volver a tocar esas 3 fuentes por separado -- todas
 * consumen `UserContext` (`src/contexts/UserContext.tsx`), que a su vez es
 * el único consumidor real de este servicio.
 *
 * **No reimplementa nada de Auth/Supabase** (regla explícita de este
 * Sprint: "No modificar Auth/Edge Functions/Supabase Auth"). `getPerfil`
 * reexporta `resolveProfile()` (`profile.service.ts`, sin cambios) tal
 * cual -- evita que un futuro consumidor importe `profile.service.ts`
 * directamente y termine con 2 puntos de entrada al mismo dato.
 * `changePassword` NO reimplementa `signInWithPassword`/`updateUser` -- los
 * recibe como parámetros (ya vinculados a la sesión real vía
 * `useAuth()`, que es un Hook de React y por lo tanto no se puede invocar
 * desde un módulo de servicio plano) y únicamente orquesta el orden
 * correcto entre ambos + el mapeo de errores. Mismo patrón de inyección de
 * dependencias que ya usaba `resolveProfile(authUserId, authEmail)`
 * (recibe lo que necesita como parámetros, no lee ningún Hook por su
 * cuenta).
 */
import { resolveProfile } from '@/services/profile.service';
import type { AuthActionResult } from '@/providers/auth.context';
import type { SignInWithPasswordParams } from '@/services/auth.service';
import type { HandymaxServiceError, ServiceResult } from '@/services/supabase.service';
import type { Perfil } from '@/types/perfil';
import type { User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------

/** Obtener perfil -- reexporta `resolveProfile()` tal cual, único punto de entrada para el módulo de Cuenta. */
export async function getPerfil(authUserId: string, authEmail: string | null): Promise<ServiceResult<Perfil>> {
  return resolveProfile(authUserId, authEmail);
}

/**
 * Actualizar perfil -- PREPARADO, no implementado (mismo criterio que el
 * botón "Editar perfil", `disabled` desde el Sprint 7.3): no existe
 * todavía ninguna decisión de qué campos son editables por el propio
 * usuario, ni un repositorio de escritura para `admins`/`coordinadores`/
 * `instaladores` desde el cliente (hoy solo `admin-operations`,
 * `service_role`, escribe esas tablas -- ver Sprint 6.1, área de Auth/Edge
 * Functions restringida en este Sprint). Se deja la firma lista para que
 * un Sprint futuro implemente el cuerpo real sin tener que tocar
 * `ProfilePage.tsx` (que ya llama a este mismo punto de entrada, ver su
 * botón "Editar perfil").
 */
export async function updatePerfil(
  authUserId: string,
  patch: Partial<Pick<Perfil, 'nombre' | 'telefono'>>,
): Promise<ServiceResult<never>> {
  // Parámetros de la firma preparada, todavía sin cuerpo real -- ver JSDoc
  // de arriba. Referenciados explícitamente (en vez de omitir sus nombres)
  // para que la firma documente, ya desde ahora, exactamente qué necesitará
  // la implementación real futura.
  void authUserId;
  void patch;
  return {
    ok: false,
    error: {
      message: 'Editar perfil todavía no está disponible -- reservado para un Sprint futuro.',
      code: 'NOT_IMPLEMENTED',
      details: null,
      hint: null,
      cause: null,
    },
  };
}

// ---------------------------------------------------------------------
// Usuario autenticado (Supabase Auth) -- sin queries nuevas, extracción
// pura de un objeto `User` que `useAuth()` ya expone.
// ---------------------------------------------------------------------

export interface AuthUserSummary {
  id: string;
  email: string | null;
  creadoEn: string | null;
  ultimoAcceso: string | null;
}

/** Obtener información del usuario autenticado -- deriva de `useAuth().user`, ya resuelto por Supabase Auth; no ejecuta ninguna consulta nueva. */
export function getUserSummary(user: User | null): AuthUserSummary | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    creadoEn: user.created_at ?? null,
    ultimoAcceso: user.last_sign_in_at ?? null,
  };
}

// ---------------------------------------------------------------------
// Preferencias (localStorage) -- movido tal cual desde
// `useUserPreferences.ts` (Sprint 7.3): mismas claves, mismos defaults,
// mismo comportamiento. El hook ahora es un wrapper de React fino sobre
// estas funciones -- ver su JSDoc actualizado.
// ---------------------------------------------------------------------

export interface UserPreferences {
  notificaciones: boolean;
  sonidos: boolean;
  confirmaciones: boolean;
  recordarSucursal: boolean;
  vistaInicial: 'despacho' | 'trabajos';
  mostrarAyudas: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  notificaciones: true,
  sonidos: true,
  confirmaciones: true,
  recordarSucursal: false,
  vistaInicial: 'despacho',
  mostrarAyudas: true,
};

function preferencesStorageKey(userId: string): string {
  return `handymax:preferencias:${userId}`;
}

/** Obtener preferencias -- única función del módulo que lee `localStorage`; ningún componente debe acceder a `localStorage` directamente. */
export function getPreferences(userId: string): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_USER_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(preferencesStorageKey(userId));
    if (!raw) return DEFAULT_USER_PREFERENCES;
    // Merge sobre el default -- una preferencia nueva agregada en un Sprint
    // futuro llega con su default para un usuario con `localStorage` viejo,
    // en vez de `undefined`.
    return { ...DEFAULT_USER_PREFERENCES, ...(JSON.parse(raw) as Partial<UserPreferences>) };
  } catch {
    // `localStorage` corrupto/deshabilitado (modo privado estricto, cuota
    // llena) -- degrada a los defaults en vez de romper la pantalla.
    return DEFAULT_USER_PREFERENCES;
  }
}

/** Actualizar preferencias -- única función del módulo que escribe `localStorage`. Devuelve el objeto completo ya actualizado (no solo la clave cambiada), listo para setear en el estado de React. */
export function setPreferences(userId: string, preferences: UserPreferences): UserPreferences {
  try {
    window.localStorage.setItem(preferencesStorageKey(userId), JSON.stringify(preferences));
  } catch {
    // Cuota llena/modo privado -- la preferencia sigue funcionando en
    // memoria para esta sesión (el llamador ya tiene `preferences` en su
    // estado de React), simplemente no persiste entre recargas. No se
    // interrumpe al usuario con un error por esto.
  }
  return preferences;
}

/** Actualizar una única preferencia -- conveniencia sobre `getPreferences`/`setPreferences`, mismo par lectura-escritura. */
export function setPreference<K extends keyof UserPreferences>(
  userId: string,
  key: K,
  value: UserPreferences[K],
): UserPreferences {
  const next = { ...getPreferences(userId), [key]: value };
  return setPreferences(userId, next);
}

// ---------------------------------------------------------------------
// Cambiar contraseña -- orquesta reautenticación + actualización real de
// Supabase Auth (ambas ya existentes, ver JSDoc de cabecera). No es una
// implementación propia de autenticación: es composición de 2 acciones
// oficiales ya expuestas por `useAuth()`.
// ---------------------------------------------------------------------

export interface ChangePasswordParams {
  email: string | null;
  currentPassword: string;
  newPassword: string;
  /** `useAuth().login` -- se recibe como parámetro porque este servicio es un módulo plano, no un Hook. */
  login: (params: SignInWithPasswordParams) => Promise<AuthActionResult>;
  /** `useAuth().updatePassword` -- ídem. */
  updatePassword: (password: string) => Promise<AuthActionResult>;
}

function missingEmailError(): HandymaxServiceError {
  return {
    message: 'Tu cuenta no tiene un correo asociado -- contactá a un administrador.',
    code: 'MISSING_EMAIL',
    details: null,
    hint: null,
    cause: null,
  };
}

/** `step` identifica en cuál de las 2 acciones ocurrió el error -- la pantalla lo usa para mostrar el título correcto ("Contraseña actual incorrecta" vs. "No se pudo cambiar la contraseña"), sin tener que re-adivinar la causa a partir del mensaje. */
export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; step: 'missing-email' | 'reauth' | 'update'; error: HandymaxServiceError };

/**
 * Cambiar contraseña -- primero reautentica con la contraseña ACTUAL
 * (`login`, el mismo `signInWithPassword` oficial que ya usa `LoginPage`)
 * para verificarla de verdad (`supabase.auth.updateUser` no lo hace por sí
 * solo, ver JSDoc histórico de `ChangePasswordPage.tsx`); solo si eso
 * confirma la contraseña actual, llama a `updatePassword` con la nueva.
 * Toda la lógica de orquestación vivía antes inline en
 * `ChangePasswordPage.tsx` -- esa pantalla ahora solo llama a esta función
 * y muestra el resultado (Regla del Sprint: "la página debe quedar
 * únicamente como presentación").
 */
export async function changePassword(params: ChangePasswordParams): Promise<ChangePasswordResult> {
  const { email, currentPassword, newPassword, login, updatePassword } = params;

  if (!email) {
    return { ok: false, step: 'missing-email', error: missingEmailError() };
  }

  const reauthResult = await login({ email, password: currentPassword });
  if (!reauthResult.ok) {
    return { ok: false, step: 'reauth', error: reauthResult.error };
  }

  const updateResult = await updatePassword(newPassword);
  if (!updateResult.ok) {
    return { ok: false, step: 'update', error: updateResult.error };
  }

  return { ok: true };
}
