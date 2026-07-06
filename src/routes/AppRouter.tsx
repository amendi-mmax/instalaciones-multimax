import { Navigate, Route, Routes } from 'react-router-dom';

import { RootLayout } from '@/layouts/RootLayout';

/**
 * Árbol de rutas por rol (ver ARCHITECTURE.md §8: /despacho, /trabajos,
 * /solicitudes, /mis-trabajos, /perfil, /admin/calendario, /admin/instaladores, /login).
 *
 * Metodología de Sprints incrementales (desde Sprint 3.1, ver
 * docs/SPRINTS_INDEX.md): cada Sprint migra únicamente una sección del
 * HTML, sin crear páginas de demostración ni vitrinas de componentes. La
 * ruta `/` renderiza `RootLayout` (Header + `<Outlet/>` + Footer); el
 * `<Outlet/>` no tiene todavía ninguna ruta hija — el contenido principal
 * (Main Layout / Coordinator / Installer / Admin) se agrega Sprint a
 * Sprint, en el suyo correspondiente. No se inventa contenido de relleno.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
