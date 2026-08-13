import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { AppProviders } from '@/providers';
import { AppRouter } from '@/routes/AppRouter';

/**
 * Composición raíz de providers (ver ARCHITECTURE.md §3, actualizado en
 * Sprint 4.2.1 §14.9).
 *
 * QueryClientProvider: capa de datos (TanStack Query) para toda la app.
 * AppProviders (`SupabaseProvider` + `AuthProvider` reales de Sprint
 * 4.1.1/4.2.1, `src/providers/`): sesión + perfil real del usuario
 * autenticado -- reemplaza acá al `AuthProvider`/`AuthContext` LEGACY de
 * `src/contexts/AuthContext.tsx` (placeholder de Fase 3, tipado contra el
 * modelo `usuario`/`rol`/`sucursalId` ya descartado por el usuario en
 * `ARCHITECTURE.md §9.9`), que se retira en este mismo Sprint -- ver
 * `docs/architecture/frontend/SPRINT_4_2_1_AUTH_REPORT.md` para la
 * justificación completa. Este es el primer Sprint que monta esta capa de
 * verdad (antes existía pero no se usaba desde `App.tsx`, per el JSDoc
 * histórico de `AppProviders.tsx`).
 * BrowserRouter + AppRouter: enrutamiento, ahora con guards reales de
 * autenticación (`ProtectedRoute`/`PublicRoute`, ver `routes/AppRouter.tsx`).
 */
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AppProviders>
    </QueryClientProvider>
  );
}
