/**
 * empresa-instaladora.ts — tipos de dominio para el catálogo de Empresas
 * Instaladoras (Sprint 8.3, "Administración de Empresas Instaladoras").
 *
 * `EmpresaInstaladoraRow`/`CrearEmpresaInstaladoraInput`/
 * `ActualizarEmpresaInstaladoraInput` son alias con nombre de dominio sobre
 * `TableRow`/`TableInsert`/`TableUpdate<'empresas_instaladoras'>`
 * (`database.service.ts`, derivados del schema real generado -- Sprint
 * 8.3) -- mismo criterio ya usado en el resto del proyecto (p. ej.
 * `TrabajoParaInstaladorRow`): no se duplica la forma de la fila a mano,
 * solo se le da un nombre más legible para este módulo.
 */
import type { TableInsert, TableRow, TableUpdate } from '@/services/database.service';

export type EmpresaInstaladoraRow = TableRow<'empresas_instaladoras'>;
export type CrearEmpresaInstaladoraInput = TableInsert<'empresas_instaladoras'>;
export type ActualizarEmpresaInstaladoraInput = TableUpdate<'empresas_instaladoras'>;

/**
 * Campos de texto libre editables desde el formulario de Crear/Editar --
 * todos `string` (los `<input>`/`<textarea>` del navegador nunca devuelven
 * otra cosa); el mapeo a `CrearEmpresaInstaladoraInput`/
 * `ActualizarEmpresaInstaladoraInput` (recorte de espacios, `'' -> null`
 * para columnas opcionales) vive en `useEmpresasInstaladoras.ts`, no en la
 * UI ni en el repositorio.
 */
export interface EmpresaInstaladoraFormValues {
  nombre: string;
  razonSocial: string;
  contacto: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  pais: string;
  logoUrl: string;
}

export const EMPRESA_INSTALADORA_FORM_INICIAL: EmpresaInstaladoraFormValues = {
  nombre: '',
  razonSocial: '',
  contacto: '',
  email: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  provincia: '',
  pais: 'Panamá',
  logoUrl: '',
};

/** Campos por los que se puede ordenar el listado (8.3, "Ordenamiento"). */
export type EmpresaInstaladoraSortField = 'nombre' | 'ciudad' | 'activa' | 'created_at';
export type SortDirection = 'asc' | 'desc';

export interface EmpresaInstaladoraSort {
  campo: EmpresaInstaladoraSortField;
  direccion: SortDirection;
}
