import { ClipboardList, Crosshair } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { MxSubtabs } from '@/components/shared/mx-subtabs';
import { MxSubtabButton } from '@/components/shared/mx-subtab-button';

/**
 * CoordinatorSubtabs — conecta `MxSubtabs`/`MxSubtabButton` (Sprint 3.3,
 * puros/sin estado propio -- ver sus JSDoc) a navegación real de React
 * Router (Entregable 1/7 del Sprint 5.1), reemplazando los dos botones
 * `MxSubtabButton` estáticos ("Despacho en vivo" siempre `active`, "Mis
 * trabajos" siempre inactivo, sin `onClick`) que `RootLayout.tsx` montaba
 * como integración temporal desde el Sprint 3.3.
 *
 * Decisión de navegación de este Sprint (confirmada explícitamente por el
 * usuario tras la auditoría previa obligatoria): el HTML oficial no tiene
 * Sidebar -- la única navegación real del Coordinador son estas dos
 * subtabs (`ARCHITECTURE.md §8`: rutas `/despacho`/`/trabajos`, planificadas
 * desde Fase 2, nunca implementadas hasta este Sprint). No se crea ningún
 * Sidebar nuevo.
 *
 * `AdminPanel` reutiliza el mismo `MxSubtabs`/`MxSubtabButton` con su
 * propio `useState` local (Calendario maestro / Instaladores, Sprint 3.13)
 * -- este componente NO lo toca ni lo reemplaza, es un wrapper adicional
 * exclusivo del Coordinador, mismo patrón de "cada consumidor de
 * MxSubtabs administra su propio estado de tab" ya establecido.
 */
const TABS = [
  { path: '/despacho', label: 'Despacho en vivo', icon: <Crosshair size={14} /> },
  { path: '/trabajos', label: 'Mis trabajos', icon: <ClipboardList size={14} /> },
] as const;

export function CoordinatorSubtabs() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <MxSubtabs>
      {TABS.map((tab) => (
        <MxSubtabButton
          key={tab.path}
          active={location.pathname.startsWith(tab.path)}
          icon={tab.icon}
          onClick={() => navigate(tab.path)}
        >
          {tab.label}
        </MxSubtabButton>
      ))}
    </MxSubtabs>
  );
}
