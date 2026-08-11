import { Building2, Calendar, Mail, MapPin, Phone, ShieldAlert, ShieldCheck, Store } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
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
 * - **Empresa instaladora** (corrección posterior a la primera entrega de
 *   la estabilización, pedida explícitamente por el usuario): `profile.
 *   empresaNombre` resuelve al *tenant* real (`empresas`, p. ej.
 *   "Multimax") vía `empresa_id` — NO es la empresa instaladora
 *   (subcontratista) que el negocio necesita. El Sprint 8.3 creó el
 *   catálogo (`empresas_instaladoras`, `AdminEmpresasInstaladoras`) pero
 *   TODAVÍA no existe la relación `instaladores -> empresas_instaladoras`
 *   (`empresa_id`/`empresa_instaladora_id`, tabla `instaladores` sin
 *   cambios en este Sprint) ni el registro de instaladores que la
 *   completaría -- eso es explícitamente el Sprint 8.4, fuera de alcance.
 *   Preparación mínima (Sprint 8.3, sección 7 del brief, "que
 *   automáticamente muestre el nombre de la empresa" una vez exista la
 *   relación): `empresaInstaladoraNombre` de abajo es el ÚNICO lugar que
 *   decide qué mostrar en esa fila -- hoy siempre `null` (la relación no
 *   existe todavía en `Perfil`), así que cae en el fallback "Pendiente de
 *   asignación"; el Sprint 8.4 solo necesita reemplazar ese `null` por el
 *   campo real una vez lo agregue a `Perfil`/`profile.service.ts`, sin
 *   tocar el JSX de abajo.
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
 * Sin estado propio, sin efectos: función pura derivada de `profile`, igual
 * que en el HTML fuente (antes derivada de `meInfo`).
 */
export interface InstallerProfileProps {
  profile: Perfil;
}

function iniciales(nombre: string): string {
  return nombre ? nombre[0] : 'M';
}

/**
 * Punto único de preparación para el Sprint 8.4 (ver JSDoc de cabecera).
 * `empresaInstaladoraNombre` es `string | null` -- hoy siempre `null`
 * porque `Perfil` todavía no expone esa relación; cuando el Sprint 8.4 la
 * agregue, basta con pasar el valor real como argumento acá, sin tocar el
 * resto de este archivo.
 */
function resolveEmpresaInstaladoraLabel(empresaInstaladoraNombre: string | null): string {
  return empresaInstaladoraNombre ?? 'Pendiente de asignación';
}

export function InstallerProfile({ profile }: InstallerProfileProps) {
  const info = profile.instaladorInfo;
  const rating = info?.rating ?? null;
  const cumplimiento = info?.cumplimiento ?? null;
  const aceptacion = info?.aceptacion ?? null;
  const km = info?.km ?? null;
  // Sprint 8.4: sustituir `null` por el campo real una vez `Perfil` lo exponga.
  const empresaInstaladoraNombre: string | null = null;
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
