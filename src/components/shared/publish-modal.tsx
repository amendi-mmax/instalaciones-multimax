import { AlertTriangle, Send, Timer, Zap } from 'lucide-react';
import { useState } from 'react';

import { Chip } from '@/components/ui/chip';
import { DialogPortal } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { BID_OPTIONS, PROVINCIAS, SLOTS_COORD, SUCURSALES, ZONAS } from '@/constants';

/**
 * PublishModal — reconstruye la función `PublishModal({ sucursal, onPublish,
 * onClose })` de `Multimax_Despacho_v1.3.html` (líneas 2496-2631). Este es el
 * ÚNICO bloque real correspondiente al Sprint 3.5 ("Publish Modal" en
 * `docs/SPRINTS_INDEX.md`): el DOM pre-renderizado del HTML (línea 457)
 * muestra un bloque distinto, `.mx-publishwrap`/`.mx-publish`/`.mx-pub-h`/
 * `.mx-pub-ic`/`.mx-publishbtn`, pero esas clases NO aparecen en ningún
 * `React.createElement` del script — son un snapshot desactualizado de una
 * versión anterior del prototipo (antes de que "publicar trabajo" se
 * convirtiera en un modal). El componente real, vigente, es exactamente
 * `PublishModal` (nombre de función confirmado en el propio script, no
 * asumido), usando `.mx-modal-bg`/`.mx-modal-panel`/`.mx-modal-hd`/
 * `.mx-modal-close`/`.mx-modal-body` — CSS ya portado en Fase 3 vía
 * `components/ui/drawer.tsx` (`Drawer`/`DrawerOverlay`/`DrawerContent`/
 * `DrawerHeader`/`DrawerBody`), reutilizado aquí tal cual. Ver
 * docs/sprints/sprint-3.5.md.
 *
 * El estado del formulario (`f`/`setF`) vive dentro de este componente,
 * igual que en el HTML fuente (el `useState` está dentro de la función
 * `PublishModal`, no en `App()`) — a diferencia de `role`/`sucursalCoord`/
 * `showPublishModal`, que sí viven en `App()`/`RootLayout`.
 *
 * Nota de fidelidad: se detectaron 2 discrepancias entre el snapshot y el
 * script para este mismo bloque, resueltas siempre a favor del script
 * (autoritativo): (1) "Tipo de inmueble" tiene 3 opciones en el script
 * (Edificio/Casa/Comercial), el snapshot solo mostraba 2; (2) la etiqueta de
 * notas es "Notas adicionales (opcional)" en el script, el snapshot decía
 * "¿Algo más que quieras agregar?". Ver "Problema encontrado" en
 * docs/sprints/sprint-3.5.md.
 *
 * ---------------------------------------------------------------------
 * Validaciones — Sprint 5.2.1 Fix ("Publish Workflow Stabilization")
 * ---------------------------------------------------------------------
 * El HTML oficial no define ninguna regla de validación para este
 * formulario (confirmado en la auditoría de este Sprint) -- por instrucción
 * explícita del brief se definen aquí reglas razonables de UX, sin
 * `alert()`/`confirm()`/validación nativa del navegador/librerías externas
 * (`react-hook-form`/`zod`/`yup`/`formik` explícitamente prohibidas) --
 * únicamente React + TypeScript, estado local (`errors`/`submitAttempted`),
 * mensajes integrados visualmente con el diseño existente (texto en
 * `var(--red)`, el mismo tono ya usado en el resto de la aplicación para
 * error/urgente -- ver `globals.css`).
 *
 * Mapeo de los 8 campos obligatorios del brief a los campos REALES de
 * `PublishForm` (ninguno inventado -- "No agregar nuevos campos"):
 * "Categoría"/"Tipo de instalación" -- el brief los lista como 2 ítems
 * distintos, pero `PublishForm` (y el HTML oficial) solo tienen UN campo
 * para ese concepto, `tipo` (texto libre, ej. "Instalación de aire
 * acondicionado 12,000 BTU") -- se validan como el mismo campo, una sola
 * regla, no dos. "Ciudad" -- no existe ningún campo `ciudad`; el campo real
 * más cercano es `zona` (Paitilla/San Francisco/etc., dentro de una
 * `provincia`) -- se mapea ahí. "Dirección" → `calle`. "Sucursal"/"Fecha"/
 * "Hora"/"Tiempo de subasta" → `sucursal`/`fecha`/`hora`/`bidMins`,
 * directos, sin ambigüedad. Campos resultantes obligatorios: `sucursal`,
 * `tipo`, `zona`, `calle`, `fecha`, `hora`, `bidMins`.
 *
 * `submitAttempted` evita mostrar errores sobre un formulario recién
 * abierto (varios campos ya vienen con un valor por defecto no vacío --
 * `tipo`/`zona`/`fecha`/`hora`/`sucursal`/`bidMins` -- solo `calle` arranca
 * vacía) -- los mensajes solo aparecen después de un primer intento de
 * "Publicar trabajo" con algún campo obligatorio vacío, y se actualizan en
 * vivo mientras el usuario corrige. El botón de envío sigue siempre
 * habilitado (sin usar `disabled`, que dispara validación nativa en algunos
 * navegadores para ciertos tipos de input) -- en su lugar, el propio
 * `onClick` revalida y bloquea la llamada a `onPublish` si quedan campos
 * obligatorios vacíos.
 */
export interface PublishForm {
  sucursal: string;
  tipo: string;
  provincia: string;
  zona: string;
  fecha: string;
  hora: string;
  equipo: string;
  tipoInmueble: string;
  calle: string;
  requisitos: string;
  extra: string;
  precioSugerido: number;
  urgente: boolean;
  bidMins: number;
}

export interface PublishModalProps {
  sucursal: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublish: (form: PublishForm) => void;
}

/**
 * Campos obligatorios reales -- ver "Validaciones — Sprint 5.2.1 Fix" en el
 * JSDoc de arriba para el mapeo completo contra los 8 nombres del brief.
 */
type CampoObligatorio = 'sucursal' | 'tipo' | 'zona' | 'calle' | 'fecha' | 'hora' | 'bidMins';

function validarPublishForm(form: PublishForm): Partial<Record<CampoObligatorio, string>> {
  const errores: Partial<Record<CampoObligatorio, string>> = {};
  if (!form.sucursal.trim()) errores.sucursal = 'Selecciona una sucursal.';
  if (!form.tipo.trim()) errores.tipo = 'Indica el tipo de instalación.';
  if (!form.zona.trim()) errores.zona = 'Selecciona una zona.';
  if (!form.calle.trim()) errores.calle = 'Indica la dirección.';
  if (!form.fecha.trim()) errores.fecha = 'Selecciona una fecha.';
  if (!form.hora.trim()) errores.hora = 'Selecciona una hora.';
  if (!form.bidMins || form.bidMins <= 0) errores.bidMins = 'Selecciona el tiempo de subasta.';
  return errores;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span style={{ color: 'var(--red)', fontSize: 12, marginTop: 4, display: 'block' }}>
      {message}
    </span>
  );
}

export function PublishModal({ sucursal, open, onOpenChange, onPublish }: PublishModalProps) {
  const [f, setF] = useState<PublishForm>({
    sucursal: sucursal || SUCURSALES[0],
    tipo: 'Instalación de aire acondicionado 12,000 BTU',
    provincia: 'Panamá',
    zona: 'Paitilla',
    fecha: new Date().toISOString().slice(0, 10),
    hora: '10:00 a.m.',
    equipo: 'Split 12,000 BTU · Inverter',
    tipoInmueble: 'Edificio',
    calle: '',
    requisitos: '',
    extra: '',
    precioSugerido: 130,
    urgente: false,
    bidMins: 5,
  });

  const set = <K extends keyof PublishForm>(k: K, v: PublishForm[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
  };

  const setProvincia = (p: string) => {
    setF((prev) => ({ ...prev, provincia: p, zona: ZONAS[p]?.[0] ?? '' }));
  };

  const zonas = ZONAS[f.provincia] ?? [];

  // Sprint 5.2.1 Fix ("Publish Workflow Stabilization") — Objetivo 3, ver
  // JSDoc "Validaciones" arriba. `submitAttempted` solo se activa tras un
  // primer intento fallido de "Publicar trabajo"; antes de eso no se
  // muestra ningún mensaje (evita ruido sobre un formulario recién abierto
  // con valores por defecto).
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const errores = validarPublishForm(f);
  const mostrarErrores = submitAttempted;

  const intentarPublicar = () => {
    if (Object.keys(validarPublishForm(f)).length > 0) {
      setSubmitAttempted(true);
      return;
    }
    onPublish(f);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DrawerOverlay>
          <DrawerContent>
            <DrawerHeader icon={<Zap size={15} />} title="Publicar trabajo" />
            <DrawerBody>
              <div className="mx-fields">
                <label>
                  Sucursal que publica
                  <Select value={f.sucursal} onChange={(e) => set('sucursal', e.target.value)}>
                    {SUCURSALES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                  {mostrarErrores && <FieldError message={errores.sucursal} />}
                </label>
                <label>
                  Tipo de instalación
                  <Input value={f.tipo} onChange={(e) => set('tipo', e.target.value)} />
                  {mostrarErrores && <FieldError message={errores.tipo} />}
                </label>
                <div className="mx-f2">
                  <label>
                    Provincia
                    <Select value={f.provincia} onChange={(e) => setProvincia(e.target.value)}>
                      {PROVINCIAS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label>
                    Zona
                    <Select value={f.zona} onChange={(e) => set('zona', e.target.value)}>
                      {zonas.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </Select>
                    {mostrarErrores && <FieldError message={errores.zona} />}
                  </label>
                </div>
                <div className="mx-f2">
                  <label>
                    Tipo de inmueble
                    <Select
                      value={f.tipoInmueble}
                      onChange={(e) => set('tipoInmueble', e.target.value)}
                    >
                      <option value="Edificio">Edificio</option>
                      <option value="Casa">Casa</option>
                      <option value="Comercial">Comercial</option>
                    </Select>
                  </label>
                  <label>
                    Calle / dirección
                    <Input
                      value={f.calle}
                      placeholder="Ej. Av. Italia, calle 50"
                      onChange={(e) => set('calle', e.target.value)}
                    />
                    {mostrarErrores && <FieldError message={errores.calle} />}
                  </label>
                </div>
                <label>
                  Equipo
                  <Input value={f.equipo} onChange={(e) => set('equipo', e.target.value)} />
                </label>
                <div className="mx-f2">
                  <label>
                    Fecha
                    <input
                      type="date"
                      className="mx-datein"
                      value={f.fecha}
                      onChange={(e) => set('fecha', e.target.value)}
                    />
                    {mostrarErrores && <FieldError message={errores.fecha} />}
                  </label>
                  <label>
                    Hora
                    <Select value={f.hora} onChange={(e) => set('hora', e.target.value)}>
                      {SLOTS_COORD.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </Select>
                    {mostrarErrores && <FieldError message={errores.hora} />}
                  </label>
                </div>
                <label>
                  Requisitos especiales
                  <Input
                    value={f.requisitos}
                    placeholder="Ej. Cliente en piso 14, requiere andamio"
                    onChange={(e) => set('requisitos', e.target.value)}
                  />
                </label>
                <label>
                  Notas adicionales (opcional)
                  <Input
                    value={f.extra}
                    placeholder="Notas para el instalador"
                    onChange={(e) => set('extra', e.target.value)}
                  />
                </label>
                <div className="mx-f2">
                  <label>
                    Precio sugerido (USD)
                    <div
                      className="mx-priceinput"
                      style={{ borderRadius: 10, padding: '2px 12px' }}
                    >
                      <span style={{ fontSize: 18 }}>$</span>
                      <input
                        type="number"
                        value={f.precioSugerido}
                        onChange={(e) => set('precioSugerido', Number(e.target.value) || 0)}
                        style={{ fontSize: 18, padding: '10px 0' }}
                      />
                    </div>
                  </label>
                  <Chip
                    variant="urg"
                    active={f.urgente}
                    style={{ alignSelf: 'flex-end' }}
                    onClick={() => set('urgente', !f.urgente)}
                  >
                    <AlertTriangle size={14} />
                    {f.urgente ? 'Urgente' : 'Normal'}
                  </Chip>
                </div>
                <label>
                  Tiempo del bid (cuánto tiempo tienen para responder y aceptar)
                  <div className="mx-bidopts">
                    {BID_OPTIONS.map((o) => (
                      <Chip
                        key={o.mins}
                        variant="bidbtn"
                        active={f.bidMins === o.mins}
                        onClick={() => set('bidMins', o.mins)}
                      >
                        <Timer size={14} />
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                  {mostrarErrores && <FieldError message={errores.bidMins} />}
                </label>
              </div>
              <button
                className="mx-btn mx-btn-ice"
                style={{ width: '100%', marginTop: 18 }}
                onClick={intentarPublicar}
              >
                <Send size={16} />
                Publicar trabajo
              </button>
            </DrawerBody>
          </DrawerContent>
        </DrawerOverlay>
      </DialogPortal>
    </Drawer>
  );
}
