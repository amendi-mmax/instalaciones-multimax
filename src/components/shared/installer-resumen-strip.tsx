import { Badge } from '@/components/ui/badge';

/**
 * InstallerResumenStrip — Ajustes finales del flujo Instalador (bloque
 * superior "QUIÉN SOY → ESTADO → TRABAJOS DISPONIBLES → TRABAJOS EN
 * CURSO"). Se monta en `installer-dashboard.tsx` como primer hijo de
 * `PhoneFrame` (visible en las 3 pestañas -- Solicitudes/Mis trabajos/
 * Perfil -- no solo una), justo debajo de `.mx-phone-bar` (que ya muestra
 * empresa + "Instalador" + badge "Activo", Ajustes finales anteriores).
 * `phone-frame.tsx` NO se toca: este componente es contenido normal de
 * `children`, no parte de su estructura.
 *
 * Reutiliza exclusivamente el primitivo `Badge` (mismo componente ya usado
 * en toda la app) -- sin CSS nuevo, sin librería nueva. Los 2 números se
 * reciben ya calculados por `installer-dashboard.tsx` (misma fuente real,
 * `trabajos_para_instalador` -- ver JSDoc de ese archivo) -- este
 * componente no hace ninguna consulta propia.
 */
export interface InstallerResumenStripProps {
  disponibles: number;
  enCurso: number;
}

export function InstallerResumenStrip({ disponibles, enCurso }: InstallerResumenStripProps) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
      <Badge tone="ice">{disponibles} disponibles</Badge>
      <Badge tone="green">{enCurso} en curso</Badge>
    </div>
  );
}
