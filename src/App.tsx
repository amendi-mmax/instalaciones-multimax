import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@/contexts/AuthContext';
import { AppRouter } from '@/routes/AppRouter';

/**
 * Composición raíz de providers (ver ARCHITECTURE.md §3).
 * QueryClientProvider: capa de datos (TanStack Query) para toda la app.
 * AuthProvider: sesión + rol del usuario autenticado (placeholder hasta la fase de Auth).
 * BrowserRouter + AppRouter: enrutamiento por rol (ver ARCHITECTURE.md §8).
 */
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
