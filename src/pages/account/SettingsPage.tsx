import { Bell, Globe, LayoutDashboard, Monitor, Palette, ShieldQuestion, Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { PageHead } from '@/components/shared/page-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUserContext } from '@/hooks/useUserContext';
import { formatFecha } from '@/lib/perfil-format';

/**
 * SettingsPage — Sprint 7.3 (Módulo de Cuenta de Usuario), ruta
 * `/configuracion`. "Pantalla moderna inspirada en aplicaciones SaaS" --
 * reutiliza `Card`/`CardHeader` (una tarjeta por sección: Preferencias/
 * Dashboard/Seguridad, mismo patrón que el resto del Dashboard del
 * Coordinador) y los primitivos `Switch`/`Select` (`ui/switch.tsx`/
 * `ui/select.tsx`, Fase 3, ambos sin consumidor real hasta este Sprint --
 * `Switch` incluso documenta en su propio JSDoc que existe "para
 * configuraciones futuras... que no tienen equivalente directo en el
 * HTML", exactamente este caso).
 *
 * **Qué es real y qué es "Próximamente"** (Regla explícita del brief:
 * "Todo aquello que aún no tenga backend deberá mostrarse deshabilitado
 * con badge 'Próximamente'. No inventar lógica."):
 *
 * - Ninguna preferencia tiene una tabla real en Supabase todavía (verificado
 *   contra `database.generated.ts` -- ninguna de las 8 tablas reales tiene
 *   columnas de preferencias de usuario). Persistirlas en el propio
 *   Supabase queda fuera de este Sprint ("No modificar Supabase").
 * - Notificaciones/Sonidos/Confirmaciones/Recordar sucursal/Vista
 *   inicial/Mostrar ayudas SÍ son reales en el sentido honesto que permite
 *   este Sprint: se guardan de verdad (`useUserPreferences`, `localStorage`
 *   por usuario) y sobreviven a recargar la página -- pero explícitamente
 *   NINGUNA está conectada todavía a otro módulo de la aplicación (p. ej.
 *   "Recordar sucursal" no alimenta `OperationalContextProvider` -- eso
 *   requeriría tocar `CoordinatorLayout.tsx`/`RootLayout.tsx`, fuera de
 *   alcance de este Sprint y adyacente al área restringida de publicación
 *   de trabajos). Se documenta con una nota visible bajo cada tarjeta, no
 *   en silencio.
 * - Tema/Idioma: el brief las pide explícitamente "(preparado para
 *   futuro)" -- se muestran, deshabilitadas, con badge "Próximamente", sin
 *   ningún `useState`/persistencia real detrás (a diferencia de las de
 *   arriba, acá el brief no pide que funcionen).
 * - Sesiones activas: el brief la pide explícitamente "(placeholder)" --
 *   mismo criterio, deshabilitada con badge.
 * - Último login/Dispositivo: datos REALES de solo lectura -- `authUser.
 *   ultimoAcceso` (`UserContext`, deriva de Supabase Auth sin cambios, ver
 *   `account.service.ts#getUserSummary`) y `navigator.userAgent` (API del
 *   navegador, sin librería nueva). No son preferencias editables, son
 *   información -- no llevan `Switch`.
 *
 * **Sprint 7.3.1 (Refinamiento)**: `profile`/`preferences`/`setPreference`
 * ya no vienen de `useAuth()`/`useUserPreferences()` por separado -- se
 * leen de `useUserContext()` (Regla explícita del brief: "toda pantalla
 * deberá consumir únicamente [el] servicio [vía `UserContext`]. No
 * duplicar llamadas."). La lectura/escritura real de `localStorage` sigue
 * viviendo exclusivamente en `account.service.ts` (`getPreferences`/
 * `setPreference`) -- este componente nunca toca `localStorage`
 * directamente, ni antes ni ahora.
 */
function ProximamenteBadge() {
  return <Badge tone="muted">Próximamente</Badge>;
}

interface SettingRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  control: ReactNode;
}

function SettingRow({ icon, title, description, control }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-ice">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-text">{title}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export function SettingsPage() {
  const { profile, preferences, setPreference, authUser } = useUserContext();

  if (!profile) return null;

  const dispositivo =
    typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'No disponible';
  const ultimoLogin = authUser?.ultimoAcceso ? formatFecha(authUser.ultimoAcceso) : 'No disponible';

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Configuración" subtitle="Preferencias de tu cuenta en HANDYMAX." />

      <Card>
        <CardHeader icon={<Palette size={14} />} cardTitle="Preferencias" />
        <SettingRow
          icon={<Palette size={15} />}
          title="Tema"
          description="Claro, oscuro o automático."
          control={
            <div className="flex items-center gap-2">
              <Select disabled defaultValue="oscuro" className="w-[120px] opacity-50">
                <option value="oscuro">Oscuro</option>
                <option value="claro">Claro</option>
                <option value="auto">Automático</option>
              </Select>
              <ProximamenteBadge />
            </div>
          }
        />
        <SettingRow
          icon={<Globe size={15} />}
          title="Idioma"
          description="Idioma de la interfaz."
          control={
            <div className="flex items-center gap-2">
              <Select disabled defaultValue="es" className="w-[120px] opacity-50">
                <option value="es">Español</option>
              </Select>
              <ProximamenteBadge />
            </div>
          }
        />
        <SettingRow
          icon={<Bell size={15} />}
          title="Notificaciones"
          description="Recibir avisos de nuevos trabajos/ofertas dentro de la app."
          control={
            <Switch
              checked={preferences.notificaciones}
              onCheckedChange={(checked) => setPreference('notificaciones', checked)}
            />
          }
        />
        <SettingRow
          icon={<Volume2 size={15} />}
          title="Sonidos"
          description="Reproducir un sonido junto con las notificaciones."
          control={
            <Switch
              checked={preferences.sonidos}
              onCheckedChange={(checked) => setPreference('sonidos', checked)}
            />
          }
        />
        <SettingRow
          icon={<ShieldQuestion size={15} />}
          title="Confirmaciones"
          description="Pedir confirmación antes de acciones importantes."
          control={
            <Switch
              checked={preferences.confirmaciones}
              onCheckedChange={(checked) => setPreference('confirmaciones', checked)}
            />
          }
        />
        <p className="mt-3 text-xs text-muted">
          Estas 3 preferencias se guardan en este dispositivo. Todavía no están conectadas a otros módulos de la
          aplicación (p. ej. las notificaciones dentro de la app) -- arquitectura preparada para un Sprint futuro.
        </p>
      </Card>

      <Card>
        <CardHeader icon={<LayoutDashboard size={14} />} cardTitle="Dashboard" />
        <SettingRow
          icon={<LayoutDashboard size={15} />}
          title="Recordar sucursal utilizada"
          description="Preseleccionar la última sucursal usada al volver a entrar."
          control={
            <Switch
              checked={preferences.recordarSucursal}
              onCheckedChange={(checked) => setPreference('recordarSucursal', checked)}
            />
          }
        />
        <SettingRow
          icon={<LayoutDashboard size={15} />}
          title="Vista inicial"
          description="Pantalla que se muestra primero al iniciar sesión."
          control={
            <Select
              value={preferences.vistaInicial}
              onChange={(event) => setPreference('vistaInicial', event.target.value as 'despacho' | 'trabajos')}
              className="w-[160px]"
            >
              <option value="despacho">Despacho en vivo</option>
              <option value="trabajos">Mis trabajos</option>
            </Select>
          }
        />
        <SettingRow
          icon={<ShieldQuestion size={15} />}
          title="Mostrar ayudas"
          description="Mostrar textos de ayuda contextual en las pantallas."
          control={
            <Switch
              checked={preferences.mostrarAyudas}
              onCheckedChange={(checked) => setPreference('mostrarAyudas', checked)}
            />
          }
        />
        <p className="mt-3 text-xs text-muted">
          "Recordar sucursal" y "Vista inicial" se guardan, pero todavía no cambian el comportamiento real de
          "Despacho en vivo"/el selector de sucursal -- esa conexión queda para un Sprint futuro.
        </p>
      </Card>

      <Card>
        <CardHeader icon={<Monitor size={14} />} cardTitle="Seguridad" />
        <SettingRow
          icon={<Monitor size={15} />}
          title="Sesiones activas"
          description="Ver y cerrar sesiones abiertas en otros dispositivos."
          control={<ProximamenteBadge />}
        />
        <SettingRow
          icon={<Monitor size={15} />}
          title="Último login"
          description="Fecha y hora del último inicio de sesión."
          control={<span className="text-xs text-text">{ultimoLogin}</span>}
        />
        <SettingRow
          icon={<Monitor size={15} />}
          title="Dispositivo"
          description="Navegador/dispositivo de la sesión actual."
          control={<span className="max-w-[220px] truncate text-right text-xs text-text">{dispositivo}</span>}
        />
      </Card>
    </div>
  );
}
