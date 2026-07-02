import { Navigate, Route, Routes } from 'react-router-dom';

/**
 * Árbol de rutas por rol (ver ARCHITECTURE.md §8: /despacho, /trabajos,
 * /solicitudes, /mis-trabajos, /perfil, /admin/calendario, /admin/instaladores, /login).
 *
 * En esta fase (scaffold) todavía no existen las páginas reales, los layouts por rol,
 * ni ProtectedRoute/RoleGate -- solo una ruta placeholder para que el proyecto compile
 * y arranque. Se completa en la fase "Layout general / Navegación" y en los módulos
 * Coordinator / Installer / Admin.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<ScaffoldPlaceholder />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ScaffoldPlaceholder() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Multimax Despacho</h1>
        <p className="mt-2 text-sm text-muted">
          Scaffold del proyecto (Fase 2). Las pantallas reales se agregan en las siguientes fases.
        </p>
      </div>
    </main>
  );
}
