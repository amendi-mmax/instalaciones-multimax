import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Footer } from '@/components/shared/footer';
import { Header } from '@/components/shared/header';
import type { Rol } from '@/types/enums';

/**
 * RootLayout — equivalente de "AppShell" pedido en el listado de Layout de
 * Fase 3. El prototipo no distingue un `<AppShell>` de la raíz de la app:
 * `App()` renderiza directamente `<header className="mx-top">` seguido del
 * contenido de la vista activa (Coordinator/Installer/Admin) y
 * `<footer className="mx-foot">` (líneas ~2029-2071 del código fuente).
 * RootLayout reproduce esa misma composición como el layout raíz de React
 * Router (`<Outlet/>` en el lugar del contenido de vista), sin introducir
 * un nivel de anidamiento extra que no exista en el HTML original.
 *
 * El `role` que alimenta el Header es estado local (`useState`) — ver la
 * nota de decisión arquitectónica en `components/shared/header.tsx` sobre
 * por qué esto es un placeholder temporal hasta la fase de Auth.
 *
 * Sprint 3.1: no se pasan `sucursalActiva`/`hasActiveJobs`/`onReset` al
 * `Header` — el Despacho en vivo (Coordinator) todavía no existe, así que
 * se dejan los valores por defecto de `HeaderStatus`, que reproducen el
 * estado inicial exacto del prototipo (`sucursalCoord` = "Multiplaza",
 * `jobs` = []). Ver docs/sprints/sprint-3.1.md.
 */
export function RootLayout() {
  const [role, setRole] = useState<Rol>('coordinador');

  return (
    <div className="flex min-h-screen flex-col">
      <Header role={role} onRoleChange={setRole} />
      <main className="flex-1">
        <Outlet context={{ role }} />
      </main>
      <Footer />
    </div>
  );
}
