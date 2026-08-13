import {
  Briefcase,
  Building2,
  Calendar,
  Clock,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Store,
  User as UserIcon,
} from 'lucide-react';

import { PageHead } from '@/components/shared/page-container';
import { StatGrid, StatTile } from '@/components/shared/stat-tile';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { useUserContext } from '@/hooks/useUserContext';
import { ESTADO_LABEL, ESTADO_TONE, ROL_LABEL, formatFecha, initialsFrom } from '@/lib/perfil-format';

/**
 * ProfilePage — Sprint 7.3 (creación) / Sprint 7.3.1 (refinamiento), ruta
 * `/perfil`. "Tarjeta moderna tipo Profile Card" pedida por el brief del
 * Sprint 7.3 -- reutiliza `Card`/`CardHeader`, `Avatar`, `Badge`,
 * `StatGrid`/`StatTile` (ver JSDoc original de este archivo en el historial
 * de Sprint 7.3 para el detalle completo de esas reutilizaciones, sin
 * cambios en este Sprint).
 *
 * **Sprint 7.3.1 -- fuente de datos**: `useUserContext()` en vez de
 * `useAuth()` directo (Regla explícita del brief: "las pantallas deben
 * consumir este contexto, no realizar consultas repetidas"). Mismo dato
 * exacto -- `UserContext` deriva de `useAuth()` sin transformarlo (ver su
 * JSDoc) -- cero comportamiento nuevo, cero consultas nuevas.
 *
 * **Sprint 7.3.1 -- separación de información** (Regla explícita del
 * brief: "separar información personal / organizacional / de cuenta",
 * "mantener exactamente el mismo estilo visual"): la única tarjeta de
 * antes se mantiene tal cual (mismo `Card`, mismo `.mx-kv`/`.mx-kv-row`,
 * mismo padding/borde) -- se agregan 3 encabezados de sección internos
 * reutilizando `CardHeader` (el mismo componente que ya usa cada `Card` de
 * esta pantalla para su propio título, aplicado acá 3 veces dentro de la
 * MISMA tarjeta en vez de inventar un separador visual nuevo) delante de
 * cada grupo de filas -- ningún campo cambió de ícono/etiqueta/formato,
 * solo se agrupan visualmente.
 *
 * **"No inventar información" / "Si un dato no existe: mostrar 'No
 * disponible'"** (Regla del Sprint 7.3, sin cambios): cada campo opcional
 * se renderiza con `?? 'No disponible'`.
 *
 * **"Editar perfil"**: botón presente, `disabled`, ahora documentado como
 * preparado para llamar a `accountService.updatePerfil()`
 * (`account.service.ts`, Sprint 7.3.1) en cuanto un Sprint futuro decida
 * qué campos son editables -- la firma ya existe, solo falta conectarla.
 */
export function ProfilePage() {
  const { profile, rol, nombre, email, estado, empresaNombre, tiendaNombre, authUser } = useUserContext();

  if (!profile || !rol || !nombre || !estado) return null;

  const ultimoAcceso = authUser?.ultimoAcceso ? formatFecha(authUser.ultimoAcceso) : 'No disponible';

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Mi perfil" subtitle="Información de tu cuenta en HANDYMAX." />
      <Card>
        <div className="flex flex-col items-center gap-3 border-b border-line pb-5 text-center sm:flex-row sm:items-start sm:text-left">
          <Avatar initials={initialsFrom(nombre)} size="lg" />
          <div className="flex flex-1 flex-col items-center gap-1.5 sm:items-start">
            <p className="font-display text-lg font-bold text-text">{nombre}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge tone="ice">{ROL_LABEL[rol]}</Badge>
              <Badge tone={ESTADO_TONE[estado]}>
                <ShieldCheck size={11} />
                {ESTADO_LABEL[estado]}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            disabled
            title="Disponible en un Sprint futuro (accountService.updatePerfil() ya está preparado)"
          >
            <Pencil size={14} />
            Editar perfil
          </Button>
        </div>

        <div className="pt-4">
          <CardHeader icon={<UserIcon size={14} />} cardTitle="Información personal" />
          <div className="mx-kv">
            <div className="mx-kv-row">
              <Mail size={14} />
              <div>
                <b>CORREO</b>
                {email ?? 'No disponible'}
              </div>
            </div>
            <div className="mx-kv-row">
              <Phone size={14} />
              <div>
                <b>TELÉFONO</b>
                {profile.telefono ?? 'No disponible'}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <CardHeader icon={<Building2 size={14} />} cardTitle="Información organizacional" />
          <div className="mx-kv">
            <div className="mx-kv-row">
              <Building2 size={14} />
              <div>
                <b>EMPRESA</b>
                {empresaNombre ?? 'No disponible'}
              </div>
            </div>
            <div className="mx-kv-row">
              <Store size={14} />
              <div>
                <b>SUCURSAL</b>
                {tiendaNombre ?? 'No disponible'}
              </div>
            </div>
            <div className="mx-kv-row">
              <MapPin size={14} />
              <div>
                <b>PROVINCIA</b>
                {profile.provincia ?? 'No disponible'}
              </div>
            </div>
            <div className="mx-kv-row">
              <MapPin size={14} />
              <div>
                <b>ZONA</b>
                {profile.zona ?? 'No disponible'}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <CardHeader icon={<IdCard size={14} />} cardTitle="Información de cuenta" />
          <div className="mx-kv">
            <div className="mx-kv-row">
              <Calendar size={14} />
              <div>
                <b>FECHA DE CREACIÓN</b>
                {formatFecha(profile.creadoEn)}
              </div>
            </div>
            <div className="mx-kv-row">
              <Clock size={14} />
              <div>
                <b>ÚLTIMO ACCESO</b>
                {ultimoAcceso}
              </div>
            </div>
            {profile.documentosOk !== null ? (
              <div className="mx-kv-row">
                <ShieldCheck size={14} />
                <div>
                  <b>DOCUMENTOS</b>
                  {profile.documentosOk ? 'Verificados' : 'Pendientes de verificación'}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {profile.instaladorInfo ? (
        <Card>
          <CardHeader icon={<Briefcase size={14} />} cardTitle="Desempeño como instalador" />
          <StatGrid>
            <StatTile value={profile.instaladorInfo.rating} label="Calificación" />
            <StatTile
              value={profile.instaladorInfo.cumplimiento != null ? `${profile.instaladorInfo.cumplimiento}%` : 'No disponible'}
              label="Cumplimiento"
            />
            <StatTile
              value={profile.instaladorInfo.aceptacion != null ? `${profile.instaladorInfo.aceptacion}%` : 'No disponible'}
              label="Aceptación"
            />
            <StatTile
              value={profile.instaladorInfo.km != null ? `${profile.instaladorInfo.km} km` : 'No disponible'}
              label="Distancia prom."
            />
          </StatGrid>
        </Card>
      ) : null}
    </div>
  );
}
