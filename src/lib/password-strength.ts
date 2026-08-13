/**
 * password-strength.ts — Sprint 7.3 (Módulo de Cuenta de Usuario, pantalla
 * "Cambiar contraseña"). Funciones puras, sin estado ni dependencia de
 * React -- reutilizables por cualquier componente futuro que también
 * necesite validar una contraseña (p. ej. un futuro rediseño de
 * `SetPasswordPage.tsx`, NO tocado en este Sprint por ser parte de
 * "autenticación existente", explícitamente restringida).
 *
 * Reglas tomadas del propio brief del Sprint ("Longitud mínima, Mayúsculas,
 * Minúsculas, Número, Carácter especial") -- no se inventa ninguna regla
 * adicional (no se exige, p. ej., ausencia de espacios o un máximo de
 * longitud, que el brief no pidió).
 */
export interface PasswordChecks {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  specialChar: boolean;
}

export type PasswordStrengthLabel = 'Muy débil' | 'Débil' | 'Aceptable' | 'Fuerte' | 'Muy fuerte';

export interface PasswordStrength {
  checks: PasswordChecks;
  /** Cantidad de reglas cumplidas (0-5). */
  score: number;
  label: PasswordStrengthLabel;
}

export const PASSWORD_MIN_LENGTH = 8;

const LABELS: PasswordStrengthLabel[] = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Fuerte', 'Muy fuerte'];

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const checks: PasswordChecks = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-ZÁÉÍÓÚÑ]/.test(password),
    lowercase: /[a-záéíóúñ]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  return { checks, score, label: LABELS[score] };
}

/** Valida que ambos campos de "nueva contraseña" tengan el mismo valor. */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password.length > 0 && password === confirmPassword;
}
