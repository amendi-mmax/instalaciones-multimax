import { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationalContext } from '@/hooks/useOperationalContext';
import { empresasInstaladorasRepository } from '@/repositories';
import type { ServiceResult } from '@/services/supabase.service';
import type {
  ActualizarEmpresaInstaladoraInput,
  CrearEmpresaInstaladoraInput,
  EmpresaInstaladoraRow,
  EmpresaInstaladoraSort,
} from '@/types/empresa-instaladora';

export type EmpresasInstaladorasStatus = 'loading' | 'ready' | 'error';

const PAGE_SIZE = 8;

/**
 * useEmpresasInstaladoras — Sprint 8.3. Única fuente de estado de la
 * pantalla "Administración → Empresas Instaladoras": mismo criterio ya
 * establecido por `useCalendarData` (Sprint 8.2) -- la lógica de negocio
 * vive en el Hook, `admin-empresas-instaladoras.tsx` es puramente
 * presentacional.
 *
 * **Carga**: `empresasInstaladorasRepository.listar(empresaId)` trae TODO
 * el catálogo del tenant activo en una sola consulta -- no una consulta
 * por letra tecleada en el buscador. Se justifica porque este catálogo es
 * inherentemente pequeño (empresas subcontratistas de un tenant, no
 * `trabajos`), mismo criterio ya usado por `AdminInstaladores`
 * (`instaladoresRepository.getByEmpresaId`, sin paginación server-side).
 * Búsqueda/orden/paginación (8.3, "Listado/Búsqueda/Ordenamiento/
 * Paginación") se resuelven 100% en cliente sobre ese arreglo ya cargado,
 * vía `useMemo`.
 */
export function useEmpresasInstaladoras() {
  const { empresaId, loading: contextLoading } = useOperationalContext();

  const [rows, setRows] = useState<EmpresaInstaladoraRow[]>([]);
  const [status, setStatus] = useState<EmpresasInstaladorasStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<EmpresaInstaladoraSort>({ campo: 'nombre', direccion: 'asc' });
  const [page, setPage] = useState(1);

  const cargar = useCallback(async () => {
    if (!empresaId) return;
    setStatus('loading');
    setError(null);
    const result = await empresasInstaladorasRepository.listar(empresaId);
    if (result.ok) {
      setRows(result.data);
      setStatus('ready');
    } else {
      setError(result.error.message);
      setStatus('error');
    }
  }, [empresaId]);

  useEffect(() => {
    if (contextLoading) return;
    if (!empresaId) {
      setStatus('error');
      setError('No se pudo determinar la empresa activa.');
      return;
    }
    void cargar();
  }, [contextLoading, empresaId, cargar]);

  // Búsqueda -- reinicia a la página 1 para no quedar "varado" en una
  // página que ya no tiene resultados tras filtrar.
  const setSearchAndResetPage = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const setSortAndResetPage = useCallback((value: EmpresaInstaladoraSort) => {
    setSort(value);
    setPage(1);
  }, []);

  const filtradas = useMemo(() => {
    const texto = search.trim().toLowerCase();
    if (!texto) return rows;
    return rows.filter((row) =>
      [row.nombre, row.razon_social, row.contacto, row.ciudad]
        .filter((value): value is string => value != null)
        .some((value) => value.toLowerCase().includes(texto)),
    );
  }, [rows, search]);

  const ordenadas = useMemo(() => {
    const factor = sort.direccion === 'asc' ? 1 : -1;
    return [...filtradas].sort((a, b) => {
      const campo = sort.campo;
      if (campo === 'activa') {
        return (Number(a.activa) - Number(b.activa)) * factor;
      }
      const valorA = (a[campo] ?? '').toString().toLowerCase();
      const valorB = (b[campo] ?? '').toString().toLowerCase();
      return valorA.localeCompare(valorB) * factor;
    });
  }, [filtradas, sort]);

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / PAGE_SIZE));
  const paginaSegura = Math.min(page, totalPaginas);
  const paginadas = useMemo(
    () => ordenadas.slice((paginaSegura - 1) * PAGE_SIZE, paginaSegura * PAGE_SIZE),
    [ordenadas, paginaSegura],
  );

  const crear = useCallback(
    async (
      input: Omit<CrearEmpresaInstaladoraInput, 'empresa_id'>,
    ): Promise<ServiceResult<EmpresaInstaladoraRow>> => {
      if (!empresaId) {
        return {
          ok: false,
          error: { message: 'No se pudo determinar la empresa activa.', code: null, details: null, hint: null, cause: null },
        };
      }
      const result = await empresasInstaladorasRepository.crear({ ...input, empresa_id: empresaId });
      if (result.ok) await cargar();
      return result;
    },
    [empresaId, cargar],
  );

  const actualizar = useCallback(
    async (
      id: string,
      patch: ActualizarEmpresaInstaladoraInput,
    ): Promise<ServiceResult<EmpresaInstaladoraRow>> => {
      const result = await empresasInstaladorasRepository.actualizar(id, patch);
      if (result.ok) await cargar();
      return result;
    },
    [cargar],
  );

  const activar = useCallback(
    async (id: string): Promise<ServiceResult<EmpresaInstaladoraRow>> => {
      const result = await empresasInstaladorasRepository.activar(id);
      if (result.ok) await cargar();
      return result;
    },
    [cargar],
  );

  const desactivar = useCallback(
    async (id: string): Promise<ServiceResult<EmpresaInstaladoraRow>> => {
      const result = await empresasInstaladorasRepository.desactivar(id);
      if (result.ok) await cargar();
      return result;
    },
    [cargar],
  );

  return {
    status,
    error,
    total: rows.length,
    totalFiltradas: ordenadas.length,
    empresas: paginadas,
    search,
    setSearch: setSearchAndResetPage,
    sort,
    setSort: setSortAndResetPage,
    page: paginaSegura,
    totalPaginas,
    setPage,
    crear,
    actualizar,
    activar,
    desactivar,
  };
}
