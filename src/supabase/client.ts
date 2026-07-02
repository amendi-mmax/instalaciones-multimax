import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no están configuradas. ' +
      'Copia .env.example a .env y completa los valores de tu proyecto Supabase.',
  );
}

/**
 * Cliente único de Supabase para todo el frontend. Ningún componente ni servicio debe
 * llamar a createClient() por su cuenta -- siempre importar `supabase` desde aquí
 * (ver ARCHITECTURE.md §6).
 *
 * En esta fase solo se prepara la conexión: no se ejecuta ninguna consulta, ni se
 * conecta Auth ni Realtime todavía (eso empieza en la fase de integración con Supabase).
 */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
