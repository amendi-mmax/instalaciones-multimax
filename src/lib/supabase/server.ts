/**
 * server.ts — cliente Supabase con **service role key**, para contextos de
 * confianza que NO son el navegador (Sprint 4.1.1, Fase 1/Fase A).
 *
 * "(si aplica)" -- criterio usado: este proyecto es hoy una SPA de Vite
 * pura (sin servidor propio, sin SSR, sin Edge Functions todavía -- ver
 * `vite.config.ts`/`src/routes/AppRouter.tsx`), así que **nada en el
 * bundle del navegador debe importar este archivo**. Se incluye de todas
 * formas porque el proyecto sí necesitará, a futuro, un cliente con
 * privilegios elevados para: scripts de administración/backfill corridos
 * con Node (`tsx`/`ts-node`, fuera del bundle de Vite), y/o futuras
 * Supabase Edge Functions. Mientras no exista ninguno de esos contextos,
 * este módulo queda preparado pero sin ningún consumidor real todavía --
 * eso es intencional en este Sprint (Fase 1: "toda la configuración debe
 * quedar centralizada", no "usar la configuración ya").
 *
 * Diferencia de seguridad crítica con `client.ts`:
 * - `client.ts` lee `VITE_SUPABASE_ANON_KEY` vía `import.meta.env` -- una
 *   clave pública, diseñada para el navegador, protegida por RLS.
 * - Este archivo lee `SUPABASE_SERVICE_ROLE_KEY` vía `process.env` -- una
 *   clave que **se salta RLS por completo**. Nunca debe tener prefijo
 *   `VITE_` (Vite expondría su valor en el bundle del navegador en texto
 *   plano) y nunca debe importarse desde ningún archivo bajo
 *   `src/components/`, `src/hooks/`, `src/providers/` ni ningún otro código
 *   que termine en el bundle de Vite.
 *
 * Decisión Node-vs-Vite (Sprint 4.1.1C, problema #3): este archivo vive
 * bajo `src/` (junto al resto de la infraestructura de Supabase, por
 * cohesión del módulo) pero **no es código de navegador**: nunca lo importa
 * ningún componente, hook ni provider, y nunca pasa por el bundle de Vite en
 * runtime -- solo lo ejecutan procesos Node externos (scripts con
 * `tsx`/`ts-node`) o, a futuro, Edge Functions. Por eso usa `process.env` en
 * vez de `import.meta.env` a propósito: es la API correcta para ese
 * contexto, no un error de mezclar entornos. El problema real detectado era
 * de *tipado*, no de arquitectura: `tsconfig.app.json` define `"types": []`
 * para excluir deliberadamente del navegador los tipos ambientales globales
 * de `@types/node` (que si no, filtrarían APIs de Node -- `Buffer`,
 * `require`, etc. -- a todo `src/`, incluido el código que sí es de
 * navegador). Como este archivo es la única excepción real dentro de `src/`,
 * la solución es declarar esa dependencia explícitamente solo aquí, con una
 * directiva triple-slash, en vez de re-habilitar `@types/node` para todo el
 * proyecto (lo que sí sería "cambiar arquitectura" -- fuera de alcance de
 * esta Sprint de estabilización). `@types/node` ya es una devDependency
 * existente (`package.json`), así que no hace falta instalar nada nuevo.
 */
/// <reference types="node" />
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.generated';

export class MissingServerEnvironmentVariableError extends Error {
  constructor(public readonly variableName: string) {
    super(
      `[handymax] Falta la variable de entorno de servidor "${variableName}". ` +
        'Esta variable NUNCA debe llevar el prefijo VITE_ ni definirse en el ' +
        '.env que usa el navegador -- ver .env.example, sección "Solo servidor / scripts".',
    );
    this.name = 'MissingServerEnvironmentVariableError';
  }
}

export interface ServerEnvironment {
  supabaseUrl: string;
  serviceRoleKey: string;
}

/**
 * Lee las variables de entorno de servidor desde `process.env` (Node),
 * nunca desde `import.meta.env` (que no existe fuera del bundle de Vite).
 * Se reutiliza `SUPABASE_URL` (no `VITE_SUPABASE_URL`) a propósito: un
 * script de Node corrido fuera de Vite no tiene garantizado `import.meta.env`,
 * así que la URL también se define como variable de servidor independiente
 * en `.env` (ver `.env.example`) -- ambas deben apuntar al mismo proyecto,
 * pero se mantienen separadas para que este módulo no dependa de Vite.
 */
export function getServerEnvironment(): ServerEnvironment {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new MissingServerEnvironmentVariableError('SUPABASE_URL');
  }
  if (!serviceRoleKey) {
    throw new MissingServerEnvironmentVariableError('SUPABASE_SERVICE_ROLE_KEY');
  }

  return { supabaseUrl, serviceRoleKey };
}

let cachedServerClient: SupabaseClient<Database> | null = null;

/**
 * Cliente con privilegios de `service_role` -- se salta RLS. Solo para
 * scripts server-side de confianza (nunca para código que corre en el
 * navegador del usuario final). No se auto-ejecuta ni se importa desde
 * ningún otro módulo de esta capa (`client.ts`, `services/`, `providers/`,
 * `hooks/`) -- queda aislado a propósito, para que sea imposible arrastrarlo
 * por accidente a un import transitivo del bundle del navegador.
 */
export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (cachedServerClient) {
    return cachedServerClient;
  }

  const { supabaseUrl, serviceRoleKey } = getServerEnvironment();

  cachedServerClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      // Un cliente de servicio no debe persistir sesión de usuario ni
      // intentar refrescar tokens de navegador -- corre en un proceso de
      // Node de corta vida (script) o en una Edge Function sin estado.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedServerClient;
}
