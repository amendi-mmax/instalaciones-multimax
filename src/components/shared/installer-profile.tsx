import { Building2, Calendar, Mail, MapPin, Phone, ShieldAlert, ShieldCheck, Store } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useEmpresaInstaladoraNombre } from '@/hooks/useEmpresaInstaladoraNombre';
import { formatFecha } from '@/lib/perfil-format';
import type { Perfil } from '@/types/perfil';

/**
 * InstallerProfile — reconstruye verbatim `function InstallerProfile({
 * meInfo })` (`Multimax_Despacho_v1.3.html`, líneas ~3491-3524, selector
 * raíz `.mx-profscreen`), la pantalla de "Perfil" dentro del teléfono del
 * Instalador (Sprint 3.11).
 *
 * **Estabilización del módulo Instalador (post Sprint 8.2)**: reemplaza por
 * completo el mock `meInfo: InstallerMock` (`INSTALLERS`, `@/constants`) por
 * el `Perfil` real del instalador autenticado (`useAuth()`, resuelto por
 * `profile.service.ts` contra la fila real de `instaladores`) — mismo tipo
 * ya usado por `ProfilePage.tsx` (Sprint 7.3, Módulo de Cuenta de Usuario),
 * sin duplicar ninguna lógica de resolución.
 *
 * Campos estructurales que el brief pide y NO existen en el schema real de
 * `instaladores` (verificado vía `database.generated.ts`/MCP — columnas
 * reales: `aceptacion`/`activo`/`created_at`/`cumplimiento`/`documentos_ok`/
 * `email`/`empresa_id`/`id`/`km`/`nombre`/`prom_respuesta_seg`/`provincia`/
 * `rating`/`suspendido`/`telefono`/`zona`), documentados en vez de
 * fabricados:
 * - **Sucursal**: solo `coordinadores` tiene `tienda_id` en el schema real
 *   — un instalador no está ligado a una tienda específica. Se muestra "No
 *   disponible" (mismo texto que `ProfilePage.tsx` usa para el mismo caso).
 * - **Empresa instaladora** (Sprint 8.4, "Registro de Instaladores
 *   utilizando Empresas Instaladoras reales"): `profile.empresaInstaladoraId`
 *   (FK real, migración `0010_instaladores_empresa_instaladora.sql`) es
 *   solo un `id` -- el NOMBRE se resuelve vía `useEmpresaInstaladoraNombre()`
 *   (Ajustes funcionales del flujo Instalador -- extrae esta resolución,
 *   antes local a este archivo, a un hook compartido con
 *   `installer-dashboard.tsx`), que internamente sigue usando
 *   `callNombreEmpresaInstaladora()` (RPC `SECURITY DEFINER`) porque
 *   `empresas_instaladoras` tiene RLS admin-only (Sprint 8.3, sin cambios)
 *   y un instalador autenticado no puede hacer `SELECT` directo sobre esa
 *   tabla. Si `empresaInstaladoraId` es `null` se muestra "Pendiente de
 *   asignación" sin llamar al RPC.
 * - **Avatar**: ninguna de las 3 tablas de perfil tiene columna
 *   `avatar`/`avatar_url` (confirmado desde Sprint 4.2.1) — se conserva el
 *   avatar de iniciales ya existente (`mx-profava`), que no es un dato mock,
 *   es un fallback visual derivado del nombre real.
 * - **Ciudad**: no existe como columna distinta — `provincia`/`zona` (reales)
 *   son el dato geográfico más cercano; ya se mostraban como `meInfo.zona`,
 *   ahora `profile.zona`/`profile.provincia` reales.
 * - **Estado de verificación**: no existe una columna `verificado` — se
 *   deriva de `documentos_ok` (real): `true` → "Instalador verificado"
 *   (`tone="green"`, antes fijo sin condición); `false` → "Documentos
 *   pendientes" (`tone="amber"`); `null` (rol distinto de instalador, p. ej.
 *   un `admin` en "Modo Instalador") → no se renderiza el badge.
 *
 * Métricas (`rating`/`cumplimiento`/`aceptacion`/`km`, dentro de
 * `profile.instaladorInfo`): SÍ son columnas reales de `instaladores` (no
 * "todavía no existen" como asume literalmente el brief) — `rating` siempre
 * tiene un valor real; `cumplimiento`/`aceptacion`/`km` son nullable
 * (`null` hasta que el instalador acumule historial, no un dato faltante
 * del schema). Se muestra el valor real cuando existe y `—` cuando es
 * `null` para ESTE instalador — nunca un número inventado. Para un `admin`
 * en "Modo Instalador" (`profile.instaladorInfo === null`, no tiene fila
 * propia en `instaladores`), las 4 métricas se muestran como `—`.
 *
 * Único estado/efecto propio de este componente (el resto sigue siendo
 * derivación pura de `profile`): la resolución del nombre de la empresa
 * instaladora, ver JSDoc de cabecera.
 */
export interface InstallerProfileProps {
  profile: Perfil;
}

function iniciales(nombre: string): string {
  return nombre ? nombre[0] : 'M';
}

/** Único lugar que decide qué mostrar en "Empresa instaladora". */
function resolveEmpresaInstaladoraLabel(empresaInstaladoraNombre: string | null): string {
  return empresaInstaladoraNombre ?? 'Pendiente de asignación';
}

export function InstallerProfile({ profile }: InstallerProfileProps) {
  const info = profile.instaladorInfo;
  const rating = info?.rating ?? null;
  const cumplimiento = info?.cumplimiento ?? null;
  const aceptacion = info?.aceptacion ?? null;
  const km = info?.km ?? null;

  const empresaInstaladoraNombre = useEmpresaInstaladoraNombre(profile.empresaInstaladoraId);
  const empresaInstaladoraLabel = resolveEmpresaInstaladoraLabel(empresaInstaladoraNombre);

  return (
    <div className="mx-profscreen">
      <div className="mx-profhero">
        <div className="mx-profava">{iniciales(profile.nombre)}</div>
        <div className="mx-profname">{profile.nombre}</div>
        <div className="mx-profzone">
          <MapPin size={12} />
          {profile.zona ?? 'No disponible'}
        </div>
        {profile.documentosOk === true ? (
          <Badge tone="green">
            <ShieldCheck size={11} />
            Instalador verificado
          </Badge>
        ) : null}
        {profile.documentosOk === false ? (
          <Badge tone="amber">
            <ShieldAlert size={11} />
            Documentos pendientes
          </Badge>
        ) : null}
      </div>
      <div className="mx-profstats">
        <div className="mx-profstat">
          <b>{rating ?? '—'}</b>
          <span>Calificación</span>
        </div>
        <div className="mx-profstat">
          <b>{cumplimiento != null ? `${cumplimiento}%` : '—'}</b>
          <span>Cumplimiento</span>
        </div>
        <div className="mx-profstat">
          <b>{aceptacion != null ? `${aceptacion}%` : '—'}</b>
          <span>Aceptación</span>
        </div>
        <div className="mx-profstat">
          <b>{km != null ? `${km} km` : '—'}</b>
          <span>Distancia prom.</span>
        </div>
      </div>
      <div className="mx-profblock">
        <h4>
          <Building2 size={13} />
          Información
        </h4>
        <div className="mx-kv">
          <div className="mx-kv-row">
            <Building2 size={14} />
            <div>
              <b>EMPRESA INSTALADORA</b>
              {empresaInstaladoraLabel}
            </div>
          </div>
          <div className="mx-kv-row">
            <Store size={14} />
            <div>
              <b>SUCURSAL</b>
              No disponible
            </div>
          </div>
          <div className="mx-kv-row">
            <Mail size={14} />
            <div>
              <b>CORREO</b>
              {profile.correo ?? 'No disponible'}
            </div>
          </div>
          <div className="mx-kv-row">
            <Phone size={14} />
            <div>
              <b>TELÉFONO</b>
              {profile.telefono ?? 'No disponible'}
            </div>
          </div>
          <div className="mx-kv-row">
            <Calendar size={14} />
            <div>
              <b>REGISTRADO</b>
              {formatFecha(profile.creadoEn)}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-profblock">
        <h4>
          <ShieldAlert size={13} />
          Reglas de prioridad
        </h4>
        <ul className="mx-rules">
          <li>
            Responder rápido y cumplir <b>sube</b> tu prioridad.
          </li>
          <li>
            Ignorar solicitudes <b>baja</b> tu prioridad.
          </li>
          <li>Cancelar tras aceptar afecta tu calificación.</li>
          <li>El precio más bajo no garantiza la asignación.</li>
        </ul>
      </div>
    </div>
  );
}
