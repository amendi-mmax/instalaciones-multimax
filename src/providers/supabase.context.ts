/**
 * supabase.context.ts — objeto de contexto crudo de React para el cliente
 * Supabase (Sprint 4.1.1C, problema #5).
 *
 * Extraído de `SupabaseProvider.tsx` para que ese archivo `.tsx` exporte
 * únicamente el componente `SupabaseProvider` (+ su tipo de props) y así
 * dejar de disparar la advertencia `react-refresh/only-export-components`
 * de ESLint (`eslint.config.js`): esa regla, configurada con
 * `allowConstantExport: true`, exige que un archivo `.tsx` consumido por
 * Fast Refresh exporte *solo* componentes (y constantes) -- exportar además
 * una función de hook (`useSupabaseContext`, antes en este mismo archivo)
 * rompe esa garantía y por eso generaba warning.
 *
 * Este archivo es deliberadamente `.ts` (no `.tsx`): no define JSX, solo el
 * objeto `Context` en sí, que ahora consumen tanto `SupabaseProvider.tsx`
 * (para el `.Provider`) como `src/hooks/useSupabase.ts` (para `useContext`),
 * sin que ninguno de los dos necesite re-exportar un hook desde un `.tsx`.
 */
import { createContext } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.generated';

export const SupabaseContext = createContext<SupabaseClient<Database> | null>(null);
