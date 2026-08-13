import { AlertTriangle, Loader2, Send, Timer, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

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
 *
 * ---------------------------------------------------------------------
 * AJUSTE — Sprint 5.2.3.2 ("Consistencia completa del selector de
 * sucursal para Coordinador")
 * ---------------------------------------------------------------------
 * Auditoría de este Sprint encontró una segunda fuente de verdad real para
 * la sucursal: el campo "Sucursal que publica" (`f.sucursal`) vive en el
 * `useState<PublishForm>` local de este componente, inicializado UNA SOLA
 * VEZ (`sucursal || SUCURSALES[0]`) a partir de la prop `sucursal` en el
 * momento del primer montaje -- como este componente nunca se desmonta
 * (`CoordinatorLayout.tsx` lo monta siempre, alternando visibilidad vía la
 * prop `open` del `Drawer`), cambios posteriores a la prop `sucursal`
 * jamás volvían a sincronizarse con `f.sucursal`, y su `<Select>` iteraba
 * las 9 opciones de `SUCURSALES` sin ninguna restricción -- exactamente el
 * mismo patrón "todas seleccionables" que tenía `SucursalSelect` antes del
 * Sprint 5.2.3.1.
 *
 * Corrección (única fuente de verdad, sin Context nuevo, sin duplicar la
 * lógica ya escrita en el Sprint 5.2.3.1): nueva prop `enabledValue`,
 * misma forma y mismo significado que la ya usada en `sucursal-select.tsx`
 * -- `CoordinatorLayout.tsx` le pasa el MISMO valor ya calculado
 * (`sucursalLockValue`, reutilizado tal cual, sin recalcularlo) que ya usa
 * para `SucursalSelect`. `undefined` → sin cambios de comportamiento
 * (Admin en Modo Coordinador, selector 100% libre, igual que siempre). Un
 * string → (a) las opciones del `<Select>` de "Sucursal que publica" se
 * deshabilitan salvo esa, mismo criterio que `sucursal-select.tsx`; (b) un
 * nuevo `useEffect` mantiene `f.sucursal` sincronizado a ese valor mientras
 * el modal está bloqueado -- elimina la segunda fuente de verdad para el
 * caso de un Coordinador real, sin tocar el resto del formulario ni
 * `onPublish`.
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
  /**
   * Sprint 7.1 -- ahora awaited (antes `void`, disparado sin esperar). El
   * `onPublish` real (`CoordinatorLayout.tsx`) ya era `async` (hace un
   * `INSERT` real en `trabajos`) desde el Sprint 5.2.2.1, pero este
   * componente nunca esperaba esa promesa -- el botón quedaba interactivo
   * durante todo el `INSERT`, permitiendo doble publicación con clicks
   * repetidos. Ver `isSubmitting` más abajo.
   */
  onPublish: (form: PublishForm) => void | Promise<void>;
  /** Ver JSDoc "AJUSTE — Sprint 5.2.3.2" arriba. Mismo significado que la prop homónima de `SucursalSelect`. */
  enabledValue?: string;
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

export function PublishModal({
  sucursal,
  open,
  onOpenChange,
  onPublish,
  enabledValue,
}: PublishModalProps) {
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

  // Sprint 5.2.3.2 — único efecto nuevo de este Sprint, ver JSDoc "AJUSTE
  // — Sprint 5.2.3.2" arriba. Solo actúa cuando el modal está bloqueado a
  // una única sucursal (`enabledValue !== undefined`, Coordinador real) --
  // mantiene `f.sucursal` sincronizado a esa única fuente de verdad en vez
  // de conservar el snapshot inicial. Para Admin en Modo Coordinador
  // (`enabledValue === undefined`), este efecto nunca corre -- cero cambio
  // de comportamiento respecto a antes de este Sprint.
  useEffect(() => {
    if (enabledValue !== undefined && f.sucursal !== enabledValue) {
      set('sucursal', enabledValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledValue]);

  // Sprint 5.2.1 Fix ("Publish Workflow Stabilization") — Objetivo 3, ver
  // JSDoc "Validaciones" arriba. `submitAttempted` solo se activa tras un
  // primer intento fallido de "Publicar trabajo"; antes de eso no se
  // muestra ningún mensaje (evita ruido sobre un formulario recién abierto
  // con valores por defecto).
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const errores = validarPublishForm(f);
  const mostrarErrores = submitAttempted;

  // Sprint 7.1 ("Publicación de trabajos") — bloquea el botón durante el
  // `INSERT` real y evita doble publicación/submit múltiple (Regla
  // explícita del Sprint). `onPublish` real ya maneja sus propios errores
  // internamente (Toast, `try/catch` en `CoordinatorLayout.tsx`) y nunca
  // relanza -- el `finally` acá es una defensa adicional, no la vía
  // principal de manejo de errores, para que `isSubmitting` nunca quede
  // trabado en `true` si algo inesperado ocurriera.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const intentarPublicar = async () => {
    if (isSubmitting) return;
    if (Object.keys(validarPublishForm(f)).length > 0) {
      setSubmitAttempted(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await onPublish(f);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sprint 7.1 (validación funcional, Issue 1 bloqueante) — mismo patrón ya
  // establecido en `sucursal-select.tsx` (Sprint 5.2.3.5), nunca aplicado
  // acá: `SUCURSALES` es la lista LITERAL de 9 nombres del HTML original,
  // sin la tienda real "Multimax Paitilla" (u otra tienda real futura que
  // tampoco esté ahí) -- un `<select value={f.sucursal}>` sin ninguna
  // `<option>` que coincida aparece vacío en el navegador, aunque `f.sucursal`
  // ya tenga internamente el valor correcto (mismo `tiendaNombre` que ya
  // muestra bien el badge "Sucursal activa" -- confirmado, no es un problema
  // de dónde se obtiene el dato, sino de qué opciones renderiza este
  // `<select>` en particular). Unión, no reemplazo: las 9 opciones legacy
  // siguen siempre presentes (necesarias para Admin-superusuario, que sigue
  // usando `sucursalCoord`/las 9 sucursales); se agrega `f.sucursal`
  // únicamente si es un valor real todavía no representado ahí. No se toca
  // `SUCURSALES` en sí (sigue igual para `SucursalSelect`/`MasterCalendar`).
  const sucursalOptions: readonly string[] =
    f.sucursal && !(SUCURSALES as readonly string[]).includes(f.sucursal)
      ? [...SUCURSALES, f.sucursal]
      : SUCURSALES;

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
                    {sucursalOptions.map((s) => (
                      <option
                        key={s}
                        value={s}
                        disabled={enabledValue !== undefined && s !== enabledValue}
                      >
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
                onClick={() => void intentarPublicar()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-mx-spin" />
                    Publicando…
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Publicar trabajo
                  </>
                )}
              </button>
            </DrawerBody>
          </DrawerContent>
        </DrawerOverlay>
      </DialogPortal>
    </Drawer>
  );
}
