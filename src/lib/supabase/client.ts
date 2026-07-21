/**
 * client.ts — cliente único de Supabase para el navegador (Sprint 4.1.1,
 * Fase 1/Fase A).
 *
 * Reemplaza, como fuente canónica de aquí en adelante, al cliente simple que
 * ya existía en `src/supabase/client.ts` (Fase 3, sin tipar, sin
 * validación de entorno estructurada). Ese archivo **no se modifica ni se
 * borra en este Sprint** (no está en el alcance de Fase A ni en la lista de
 * archivos permitidos) -- queda documentado en `MIGRATION_STATUS.md` como
 * una duplicación conocida a resolver en un Sprint futuro de limpieza,
 * una vez que los componentes que pudieran depender de él (ninguno, hoy --
 * ver `docs/frontend/FRONTEND_AUDIT.md`) se migren a este módulo.
 *
 * Import type de `Database`: apunta a `@/types/database.generated`, la
 * única ubicación oficial acordada para el archivo generado por
 * `supabase gen types typescript --linked --schema public` (Sprint 4.1.1C
 * §4 -- ver también `src/types/README.md`). Este proyecto **no usa**
 * `eslint-plugin-import` (no está en `package.json`/`eslint.config.js` --
 * ver Sprint 4.1.1C, problema #4), así que no corresponde silenciar
 * `import/no-unresolved` con un comentario `eslint-disable`: esa regla no
 * existe en la configuración aprobada de este proyecto. Si el archivo
 * generado todavía no está presente, el error real aparece en `tsc`
 * (`Cannot find module`), no en ESLint -- eso es correcto y esperado hasta
 * que exista `database.generated.ts`.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.generated';

import { SUPABASE_CLIENT_OPTIONS } from '@/lib/supabase/config';
import { getClientEnvironment } from '@/lib/supabase/environment';

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Devuelve la instancia única (singleton) del cliente Supabase para el
 * navegador, tipada contra el esquema real de Producción (`Database`, una
 * vez generado). Crear un solo cliente por sesión de navegador es la
 * recomendación oficial de Supabase (evita múltiples listeners de
 * `onAuthStateChange`/websockets de Realtime duplicados) -- por eso se
 * memoiza en el módulo en vez de exportar `createClient(...)` directamente.
 *
 * No conecta Auth ni Realtime "de más" por sí solo -- `createClient` deja
 * todo listo pero pasivo hasta que algo (un Provider, un hook) se suscriba.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getClientEnvironment();

  cachedClient = createClient<Database>(supabaseUrl, supabaseAnonKey, SUPABASE_CLIENT_OPTIONS);

  return cachedClient;
}

/**
 * Solo para tests/Storybook/escenarios donde se necesita forzar la
 * recreación del cliente (p. ej. simular un cambio de proyecto). No debe
 * usarse en código de aplicación normal.
 */
export function __resetSupabaseClientForTests(): void {
  cachedClient = null;
}
