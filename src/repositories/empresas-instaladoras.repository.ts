/**
 * empresas-instaladoras.repository.ts — acceso tipado a la tabla real
 * `empresas_instaladoras` (Sprint 8.3, migración `0009_empresas_
 * instaladoras.sql`).
 *
 * No implementa `Repository<T>` (`base.repository.ts`) a propósito: esa
 * interfaz usa nombres en inglés (`getAll`/`getById`/`create`/`update`/
 * `remove`); el brief de este Sprint pide explícitamente los 6 métodos de
 * abajo, con esos nombres exactos, y "únicamente" esos -- mismo criterio ya
 * usado por `trabajosParaInstaladorRepository` (tampoco implementa
 * `Repository<T>` por no encajar con su propósito). Sin lógica de UI --
 * únicamente lectura/escritura contra Supabase.
 *
 * `listar()` recibe `empresaId` (tenant activo) como parámetro obligatorio
 * en vez de traer todas las filas sin filtrar -- mismo criterio de scoping
 * por tenant ya usado por `instaladoresRepository.getByEmpresaId()`/
 * `tiendasRepository.getByEmpresaId()`; RLS ya lo garantizaría de todas
 * formas (ver migración 0009), pero filtrar explícitamente evita depender
 * únicamente de RLS para la corrección funcional del query.
 *
 * `activar`/`desactivar` son azúcar sintáctica sobre `actualizar(id,
 * { activa })` -- no existe ningún DELETE: la migración 0009 no otorga
 * privilegio `DELETE` a `authenticated` ni define policy de `DELETE`
 * (borrado lógico exigido por el brief, reforzado a nivel de base de
 * datos, no solo de UI).
 */
import { TABLES } from '@/lib/supabase/config';
import { getClient, toServiceResult, type ServiceResult } from '@/services/supabase.service';
import type {
  ActualizarEmpresaInstaladoraInput,
  CrearEmpresaInstaladoraInput,
  EmpresaInstaladoraRow,
} from '@/types/empresa-instaladora';

async function listar(empresaId: string): Promise<ServiceResult<EmpresaInstaladoraRow[]>> {
  const query = getClient()
    .from(TABLES.empresasInstaladoras)
    .select('*')
    .eq('empresa_id', empresaId)
    .order('nombre', { ascending: true });
  return toServiceResult(query);
}

async function obtenerPorId(id: string): Promise<ServiceResult<EmpresaInstaladoraRow | null>> {
  const query = getClient().from(TABLES.empresasInstaladoras).select('*').eq('id', id).maybeSingle();
  return toServiceResult(query);
}

async function crear(
  input: CrearEmpresaInstaladoraInput,
): Promise<ServiceResult<EmpresaInstaladoraRow>> {
  const query = getClient().from(TABLES.empresasInstaladoras).insert(input).select().single();
  return toServiceResult(query);
}

async function actualizar(
  id: string,
  patch: ActualizarEmpresaInstaladoraInput,
): Promise<ServiceResult<EmpresaInstaladoraRow>> {
  const query = getClient()
    .from(TABLES.empresasInstaladoras)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  return toServiceResult(query);
}

async function activar(id: string): Promise<ServiceResult<EmpresaInstaladoraRow>> {
  return actualizar(id, { activa: true });
}

async function desactivar(id: string): Promise<ServiceResult<EmpresaInstaladoraRow>> {
  return actualizar(id, { activa: false });
}

export const empresasInstaladorasRepository = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  activar,
  desactivar,
};
