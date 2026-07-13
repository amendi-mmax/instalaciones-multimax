import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  MapPin,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import { PageContainer, PageHead } from '@/components/shared/page-container';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { INSTALLERS, ZONAS } from '@/constants';

/**
 * AdminInstaladores — reconstruye verbatim `function AdminInstaladores()`
 * (`Multimax_Despacho_v1.3.html`, líneas 3049-3160), la pestaña "Instaladores"
 * dentro de `AdminPanel()` (Sprint 3.13). Selector raíz `.mx-page` (vía
 * `PageContainer`), con `.mx-pagehead` (vía `PageHead`, sin `onBack` — el HTML
 * fuente no tiene botón de volver en este bloque) y `.mx-admingrid` (2
 * columnas: tabla de instaladores + formulario de invitación).
 *
 * **Reutilización**: `PageContainer`/`PageHead` (Fase 3, `.mx-page`/
 * `.mx-pagehead`/`.mx-sub`), `Card`/`CardHeader` (Fase 3, `.mx-card`/
 * `.mx-section-h`) para ambas tarjetas, `Badge` (Fase 3, `.mx-pill`) para el
 * Pill de estado (tone dinámico rojo/ámbar/verde), `Button variant="ice"`
 * (Fase 3, `.mx-btn.mx-btn-ice`) para "Enviar invitación", `INSTALLERS`
 * (Sprint 3.7) y `ZONAS` (Sprint 3.5) — ninguna constante nueva en este
 * Sprint, 100% reutilización de mocks ya migrados.
 *
 * **Decisión de reutilización — NO se usan `Input`/`Select` (`components/
 * ui/`)**: a diferencia de `PublishModal` (Sprint 3.5), que sí usa esos
 * componentes genéricos, aquí el HTML fuente estiliza los `<input>`/
 * `<select>` crudos exclusivamente vía el selector descendiente `.mx-invite
 * input,.mx-invite select` (no existe ninguna clase `.mx-input`/
 * `.mx-select-native` en este bloque) — usar los componentes `Input`/
 * `Select` aplicaría una clase adicional (`mx-input`/`mx-select-native`) que
 * no está en el HTML y alteraría el estilado real (que depende únicamente
 * del ancestro `.mx-invite`, aplicado aquí sobre la `Card`). Se reconstruyen
 * como elementos nativos `<input>`/`<select>`/`<label>`, igual que el HTML.
 *
 * **Estado interno** (mismo criterio ya aprobado para `PublishModal`, Sprint
 * 3.5: estado de interacción de UI, no un mock de datos de negocio — no cae
 * bajo la regla de "preparación para Supabase", que aplica a colecciones
 * como `INSTALLERS`, no a `useState` de formularios):
 * - `susp`: `Record<string, boolean>` — overrides locales de suspensión por
 *   id (el HTML no muta `INSTALLERS`, solo superpone un mapa de excepciones;
 *   `isSusp` resuelve `id in susp ? susp[id] : installer.susp`).
 * - `form`: campos del formulario de invitación (`nombre`/`empresa`/`zona`/
 *   `email`/`telefono`), inicial `zona: "Paitilla"` — mismo valor literal del
 *   HTML fuente (línea 3053).
 * - `sent`: `string | null` — nombre/empresa mostrado en el aviso de éxito
 *   tras "enviar".
 *
 * **`enviar()`**: reconstruye el callback del HTML (línea 3059) — no hace
 * ninguna llamada real (sin fetch/Supabase/servicios), solo fija `sent` y
 * limpia `form` a sus valores iniciales, exactamente igual que el HTML
 * fuente (que tampoco persiste nada real).
 *
 * Sin props: mismo criterio que `InstallerJobs` (Sprint 3.12) — el HTML
 * fuente tampoco recibe ninguna.
 */
export function AdminInstaladores() {
  const [susp, setSusp] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    nombre: '',
    empresa: '',
    zona: 'Paitilla',
    email: '',
    telefono: '',
  });
  const [sent, setSent] = useState<string | null>(null);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const enviar = () => {
    const nombre = form.nombre.trim() || form.empresa.trim() || 'el instalador';
    setSent(nombre);
    setForm({ nombre: '', empresa: '', zona: 'Paitilla', email: '', telefono: '' });
  };

  const isSusp = (installerId: string, defaultSusp: boolean) =>
    installerId in susp ? susp[installerId] : defaultSusp;

  return (
    <PageContainer>
      <PageHead
        title="Gestión de instaladores"
        subtitle="Multimax crea las cuentas e invita a los instaladores autorizados."
      />
      <div className="mx-admingrid">
        <Card>
          <CardHeader
            icon={<Users size={14} />}
            cardTitle={`Instaladores (${INSTALLERS.length})`}
          />
          <div className="mx-admintable">
            {INSTALLERS.map((installer) => {
              const suspendido = isSusp(installer.id, installer.susp);
              const tone: BadgeTone = suspendido ? 'red' : !installer.docs ? 'amber' : 'green';
              const label = suspendido
                ? 'Suspendido'
                : !installer.docs
                  ? 'Docs pendientes'
                  : 'Activo';

              return (
                <div key={installer.id} className="mx-adminrow">
                  <div className="mx-adminrow-main">
                    <div className="mx-adminrow-top">
                      <span className="mx-adminrow-name">{installer.nombre}</span>
                      <Badge tone={tone}>{label}</Badge>
                    </div>
                    <div className="mx-adminrow-meta">
                      <span>
                        <MapPin size={11} />
                        {installer.zona}
                      </span>
                      <span>
                        <Star size={11} className="mx-starc" />
                        {installer.rating}
                      </span>
                      <span>
                        <ShieldCheck size={11} />
                        {installer.cumpl}% cumpl.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`mx-admin-act${suspendido ? '' : ' danger'}`}
                    onClick={() => setSusp((prev) => ({ ...prev, [installer.id]: !suspendido }))}
                  >
                    {suspendido ? 'Reactivar' : 'Suspender'}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="mx-invite">
          <CardHeader icon={<UserPlus size={14} />} cardTitle="Invitar instalador" />
          {sent ? (
            <div className="mx-invite-ok">
              <CheckCircle2 size={14} />
              <span>Invitación enviada a {sent}. Recibirá su enlace de acceso por correo.</span>
            </div>
          ) : null}
          <label>
            Nombre del contacto
            <input
              value={form.nombre}
              placeholder="Ej. Juan Pérez"
              onChange={(e) => setField('nombre', e.target.value)}
            />
          </label>
          <label>
            Empresa / taller
            <input
              value={form.empresa}
              placeholder="Ej. Instalaciones PTY"
              onChange={(e) => setField('empresa', e.target.value)}
            />
          </label>
          <label>
            Zona principal
            <select value={form.zona} onChange={(e) => setField('zona', e.target.value)}>
              {ZONAS['Panamá'].map((zona) => (
                <option key={zona} value={zona}>
                  {zona}
                </option>
              ))}
            </select>
          </label>
          <label>
            Correo
            <input
              type="email"
              value={form.email}
              placeholder="instalador@correo.com"
              onChange={(e) => setField('email', e.target.value)}
            />
          </label>
          <label>
            Teléfono / WhatsApp
            <input
              value={form.telefono}
              placeholder="+507 6000-0000"
              onChange={(e) => setField('telefono', e.target.value)}
            />
          </label>
          <Button variant="ice" style={{ width: '100%' }} onClick={enviar}>
            <Mail size={16} />
            Enviar invitación
          </Button>
          <div className="mx-invite-note">
            <AlertTriangle size={13} />
            La cuenta queda pendiente hasta que el instalador confirme sus datos.
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
