/**
 * operational-context.service.ts — resolución real (no mock) de la
 * "empresa activa"/"tienda activa" para el Modo de Visualización del
 * Administrador (Sprint 5.1.1, "Ajuste final -- Modo Administrador
 * Superusuario (MVP)").
 *
 * PROBLEMA QUE RESUELVE ESTE ARCHIVO: cuando un `admin` real usa el
 * selector temporal `AdminVistaSwitch` (Sprint 5.1.1) para ver la vista
 * "Coordinador", `DespachoPage`/`TrabajosPage` necesitan un `tienda_id`
 * real para consultar `trabajos` (`dashboard.service.ts`) -- pero
 * `Perfil.tiendaId` es `null` por diseño para `admins` (solo
 * `coordinadores` tiene `tienda_id`, ver `src/types/perfil.ts`), así que
 * antes de este ajuste el admin solo veía el mensaje "Tu perfil de
 * coordinador no tiene una tienda asignada".
 *
 * SOLUCIÓN, por instrucción explícita del usuario: mientras el MVP
 * administra una sola empresa (Multimax), el admin en modo "Coordinador"
 * opera sobre el contexto real de esa empresa (tabla `empresas`, NO el
 * `profile.empresaId` del admin -- ver JSDoc de `EMPRESA_MVP_SLUG`) y sobre
 * la sucursal que ya elige en `SucursalSelect` (`sucursalCoord`, un string
 * libre -- ver el seam documentado en `SPRINT_5_1_COORDINATOR_REPORT.md
 * §7`). Este servicio traduce ese nombre a un `tiendas.id` real,
 * consultando la tabla real `tiendas` (NO `sucursales` -- esa tabla existe
 * en `supabase/migrations/0001_initial_schema.sql` pero quedó superada por
 * la auditoría de Sprint 4.0.2/4.1.1 contra el `pg_dump` real de
 * Producción, que confirma `tiendas` como el nombre vigente -- ver
 * `ARCHITECTURE.md §9.9`/`§14.9` y `src/lib/supabase/config.ts`
 * `TABLES.tiendas`). Ningún mock, ninguna constante duplicada, ningún UUID
 * hardcodeado -- ambas tablas se consultan de verdad vía
 * `empresasRepository`/`tiendasRepository` (Sprint 4.1.1, ya existentes,
 * sin modificar).
 *
 * ALCANCE: este servicio SOLO se invoca cuando `role === 'admin'` y el
 * modo de visualización elegido es `'coordinador'` (ver
 * `OperationalContextProvider.tsx`) -- un Coordinador real nunca lo llama,
 * sigue resolviendo su tienda directamente desde `profile.tiendaId`/
 * `profile.empresaId`, sin ningún cambio de comportamiento ni de origen de
 * datos.
 */
import { empresasRepository, tiendasRepository } from '@/repositories';
import { EMPRESA_MVP_SLUG } from '@/constants';
import type { TableRow } from '@/services/database.service';
import type { ServiceResult } from '@/services/supabase.service';

export interface SuperusuarioTiendaContexto {
  /** `null` únicamente si `empresas.slug = 'multimax'` todavía no existe en Supabase (ver `error` en el consumidor). */
  empresa: TableRow<'empresas'> | null;
  /** `null` si la empresa se resolvió pero ninguna fila de `tiendas` tiene `nombre === sucursalNombre` para esa empresa. */
  tienda: TableRow<'tiendas'> | null;
}

/**
 * resolveSuperusuarioTienda — dado el nombre de sucursal seleccionado en
 * `SucursalSelect` (`sucursalCoord`), resuelve la fila real de `empresas`
 * (`slug = EMPRESA_MVP_SLUG`) y, dentro de ella, la fila real de `tiendas`
 * cuyo `nombre` coincide exactamente con ese string -- ambas consultas
 * reales contra Supabase, ninguna simulada.
 *
 * Devuelve `ok: true` incluso cuando `empresa`/`tienda` resultan `null`
 * (fila no encontrada) -- eso no es un error de red/Supabase, es un dato
 * real ausente; el consumidor (`OperationalContextProvider`) decide cómo
 * comunicarlo (mensaje explícito, nunca una pantalla en blanco).
 */
export async function resolveSuperusuarioTienda(
  sucursalNombre: string,
): Promise<ServiceResult<SuperusuarioTiendaContexto>> {
  const empresaResult = await empresasRepository.getBySlug(EMPRESA_MVP_SLUG);
  if (!empresaResult.ok) {
    return empresaResult;
  }

  const empresa = empresaResult.data;
  if (!empresa) {
    return { ok: true, data: { empresa: null, tienda: null } };
  }

  const tiendasResult = await tiendasRepository.getByEmpresaId(empresa.id);
  if (!tiendasResult.ok) {
    return tiendasResult;
  }

  const tienda = tiendasResult.data.find((fila) => fila.nombre === sucursalNombre) ?? null;
  return { ok: true, data: { empresa, tienda } };
}
