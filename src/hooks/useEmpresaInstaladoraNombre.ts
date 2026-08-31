import { useEffect, useState } from 'react';

import { callNombreEmpresaInstaladora } from '@/services/database.service';

/**
 * useEmpresaInstaladoraNombre — Ajustes funcionales del flujo Instalador.
 * Extrae la resolución de nombre de empresa instaladora que ya existía
 * duplicándose en `installer-profile.tsx` (Sprint 8.4) -- misma lógica
 * exacta, ahora en un único lugar reutilizado también por
 * `installer-dashboard.tsx` (encabezado del portal). RLS de
 * `empresas_instaladoras` sigue siendo admin-only (Sprint 8.3, sin
 * cambios) -- por eso sigue resolviéndose vía `nombre_empresa_instaladora()`
 * (RPC `SECURITY DEFINER`, migración `0010`), nunca un `SELECT` directo.
 *
 * `empresaInstaladoraId === null` (instalador sin empresa asignada
 * todavía) devuelve `null` sin invocar el RPC -- mismo criterio que ya
 * tenía `installer-profile.tsx`.
 */
export function useEmpresaInstaladoraNombre(empresaInstaladoraId: string | null): string | null {
  const [nombre, setNombre] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaInstaladoraId) {
      setNombre(null);
      return;
    }
    let active = true;
    callNombreEmpresaInstaladora({ p_empresa_instaladora_id: empresaInstaladoraId }).then((result) => {
      if (!active) return;
      setNombre(result.ok ? (result.data ?? null) : null);
    });
    return () => {
      active = false;
    };
  }, [empresaInstaladoraId]);

  return nombre;
}
