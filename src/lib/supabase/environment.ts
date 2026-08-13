/**
 * environment.ts — punto único de lectura y validación de variables de entorno
 * del cliente (navegador) para Supabase (Sprint 4.1.1, Fase 2/Fase A).
 *
 * Regla de seguridad no negociable: **ninguna variable con secretos reales
 * (service role key, tokens de administración) puede tener el prefijo
 * `VITE_`** — Vite expone al bundle del navegador, en texto plano, cualquier
 * variable de entorno que empiece con `VITE_`. Por eso este archivo solo lee
 * `VITE_SUPABASE_URL` (no es secreta: es pública por diseño, cualquier
 * cliente de Supabase la necesita) y `VITE_SUPABASE_ANON_KEY` (es la clave
 * pública "anon", protegida por RLS, diseñada explícitamente por Supabase
 * para vivir en el navegador — no es equivalente a la service role key).
 *
 * La service role key (si el proyecto la necesita para scripts server-side)
 * se lee por separado en `server.ts`, vía `process.env` (Node), nunca desde
 * este archivo ni desde `import.meta.env` — ver `server.ts` para el detalle.
 *
 * `ImportMetaEnv`/`ImportMeta` ya están declaradas en `src/vite-env.d.ts`
 * (no se modifica ese archivo en este Sprint: ya declara exactamente
 * `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, que es todo lo que este
 * módulo necesita).
 */

export interface ClientEnvironment {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Nombres de las variables de entorno del cliente, centralizados en una sola
 * constante para que no queden strings literales ("VITE_SUPABASE_URL")
 * repetidos por el código — cualquier renombramiento futuro se hace en un
 * solo lugar.
 */
export const CLIENT_ENV_VAR_NAMES = {
  supabaseUrl: 'VITE_SUPABASE_URL',
  supabaseAnonKey: 'VITE_SUPABASE_ANON_KEY',
} as const;

/**
 * Error específico para fallos de configuración de entorno -- permite a
 * quien consuma este módulo distinguir "falta configurar .env" de un error
 * de red o de Supabase en sí.
 */
export class MissingEnvironmentVariableError extends Error {
  constructor(public readonly variableName: string) {
    super(
      `[handymax] Falta la variable de entorno "${variableName}". ` +
        'Copiá .env.example a .env y completá los valores de tu proyecto Supabase ' +
        '(ver supabase/config.toml para el project_ref real, y docs/database/ para el esquema).',
    );
    this.name = 'MissingEnvironmentVariableError';
  }
}

/**
 * Lee y valida las variables de entorno del cliente. Lanza
 * `MissingEnvironmentVariableError` si falta alguna -- se prefiere fallar
 * rápido y explícito (al importar este módulo, típicamente desde
 * `client.ts`) en vez de dejar que `createClient('', '')` falle más tarde
 * con un error críptico de red.
 *
 * No cachea el resultado a nivel de módulo (a diferencia de `client.ts`,
 * que sí memoiza la instancia del cliente) -- leer `import.meta.env` es
 * barato y determinístico, y mantenerlo sin estado facilita testear este
 * archivo de forma aislada.
 */
export function getClientEnvironment(): ClientEnvironment {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new MissingEnvironmentVariableError(CLIENT_ENV_VAR_NAMES.supabaseUrl);
  }
  if (!supabaseAnonKey) {
    throw new MissingEnvironmentVariableError(CLIENT_ENV_VAR_NAMES.supabaseAnonKey);
  }

  return { supabaseUrl, supabaseAnonKey };
}

/**
 * Variante que no lanza -- devuelve `null` si falta alguna variable, junto
 * con la lista de nombres faltantes. Pensada para lugares donde se prefiere
 * degradar visualmente (p. ej. una pantalla de "configuración incompleta")
 * en vez de que la app entera falle al importar el módulo.
 */
export function tryGetClientEnvironment():
  | { ok: true; env: ClientEnvironment }
  | { ok: false; missing: string[] } {
  const missing: string[] = [];
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) missing.push(CLIENT_ENV_VAR_NAMES.supabaseUrl);
  if (!supabaseAnonKey) missing.push(CLIENT_ENV_VAR_NAMES.supabaseAnonKey);

  if (missing.length > 0) {
    return { ok: false, missing };
  }
  return { ok: true, env: { supabaseUrl, supabaseAnonKey } };
}
