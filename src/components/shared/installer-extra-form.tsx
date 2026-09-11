import { AlertTriangle, ImagePlus, Send, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { DialogPortal } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { trabajoExtrasRepository } from '@/repositories';
import { callSolicitarCostoExtra } from '@/services/database.service';

/**
 * InstallerExtraForm — "Solicitar costo extra" (Sprint "Costos
 * adicionales"). Formulario del instalador para reportar un gasto/costo
 * adicional surgido durante la instalación (monto + motivo/notas + fotos
 * de evidencia), ANTES de marcar el trabajo como terminado -- ver
 * `installer-jobs.tsx` para el botón que abre este `Drawer` y para el
 * bloqueo de "Marcar como completado" mientras exista una solicitud
 * `pendiente`.
 *
 * **Fotos primero, fila después**: las fotos se suben a Storage (bucket
 * privado `trabajo-extras`) usando un `extraId` generado en el cliente
 * (`crypto.randomUUID()`) ANTES de invocar `solicitar_costo_extra()` --
 * las policies de `storage.objects` (migración `0026`) validan la subida
 * contra `trabajos.instalador_asignado_id`, que ya existe en ese momento;
 * la fila de `trabajo_extras` (que reutiliza ese mismo id como PK) se crea
 * recién en la última llamada, con las rutas ya subidas. Si una foto falla
 * al subir, se detiene el envío completo (no se crea una solicitud con
 * evidencia incompleta) -- las fotos que sí llegaron a subirse antes del
 * fallo quedan huérfanas en el bucket privado (sin fila que las referencie,
 * sin exposición ni riesgo real -- solo espacio de Storage sin usar),
 * mismo criterio de "no over-engineering" ya aceptado en otros flujos de
 * compensación de este proyecto (`inviteInstalador()`, Edge Function
 * `admin-operations`).
 *
 * Validaciones: monto obligatorio y > 0; notas obligatorias (el
 * coordinador necesita contexto real para decidir); máximo 5 fotos,
 * solo `image/jpeg`/`image/png`/`image/webp`, máximo 5 MB cada una --
 * mismos límites que el bucket impone del lado del servidor (defensa en
 * profundidad, nunca confiar solo en esta validación de cliente).
 */
const MAX_FOTOS = 5;
const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface InstallerExtraFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trabajoId: string;
  onSubmitted: () => void;
}

export function InstallerExtraForm({ open, onOpenChange, trabajoId, onSubmitted }: InstallerExtraFormProps) {
  const [monto, setMonto] = useState('');
  const [notas, setNotas] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setMonto('');
    setNotas('');
    setFotos([]);
    setError(null);
  };

  const agregarFotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const nuevas: File[] = [];
    for (const file of Array.from(files)) {
      if (!TIPOS_PERMITIDOS.has(file.type)) {
        setError('Solo se permiten fotos en formato JPG, PNG o WEBP.');
        return;
      }
      if (file.size > MAX_FOTO_BYTES) {
        setError('Cada foto debe pesar como máximo 5 MB.');
        return;
      }
      nuevas.push(file);
    }
    setFotos((prev) => {
      const combinadas = [...prev, ...nuevas];
      if (combinadas.length > MAX_FOTOS) {
        setError(`Puedes adjuntar hasta ${MAX_FOTOS} fotos.`);
        return prev;
      }
      return combinadas;
    });
  };

  const quitarFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const enviar = async () => {
    if (enviando) return;
    const montoNum = Number(monto);
    if (!monto || Number.isNaN(montoNum) || montoNum <= 0) {
      setError('Indica un monto extra válido, mayor a $0.');
      return;
    }
    if (!notas.trim()) {
      setError('Indica el motivo del costo extra.');
      return;
    }

    setEnviando(true);
    setError(null);

    const extraId = crypto.randomUUID();
    const rutas: string[] = [];
    for (const foto of fotos) {
      const result = await trabajoExtrasRepository.uploadFoto(trabajoId, extraId, foto);
      if (!result.ok) {
        setEnviando(false);
        setError(`No se pudo subir una foto: ${result.error.message}`);
        return;
      }
      rutas.push(result.data);
    }

    const result = await callSolicitarCostoExtra({
      p_id: extraId,
      p_trabajo_id: trabajoId,
      p_monto: montoNum,
      p_notas: notas.trim(),
      p_fotos: rutas,
    });
    setEnviando(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    if (!result.data) {
      setError('No se pudo enviar la solicitud. Puede que el trabajo ya haya cambiado de estado.');
      return;
    }

    reset();
    onOpenChange(false);
    onSubmitted();
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!enviando) {
          if (!next) reset();
          onOpenChange(next);
        }
      }}
    >
      <DialogPortal>
        <DrawerOverlay>
          <DrawerContent>
            <DrawerHeader icon={<AlertTriangle size={15} />} title="Solicitud de costo adicional" />
            <DrawerBody>
              <p className="mx-sub" style={{ marginBottom: 12 }}>
                Este monto será revisado por el coordinador y no se agrega automáticamente al total.
              </p>
              <div className="mx-fields">
                <label>
                  Monto extra
                  <div className="mx-priceinput" style={{ borderRadius: 10, padding: '2px 12px' }}>
                    <span style={{ fontSize: 18 }}>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      placeholder="0.00"
                      style={{ fontSize: 18, padding: '10px 0' }}
                    />
                  </div>
                </label>
                <label>
                  Motivo / notas
                  <Textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Ej. Se requirió andamio adicional por altura del techo"
                    rows={4}
                  />
                </label>
                <label>
                  Fotos / evidencia (opcional, máximo {MAX_FOTOS})
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) => {
                      agregarFotos(e.target.files);
                      e.target.value = '';
                    }}
                    disabled={fotos.length >= MAX_FOTOS}
                  />
                </label>
                {fotos.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {fotos.map((foto, index) => (
                      <span
                        key={`${foto.name}-${index}`}
                        className="mx-chip"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <ImagePlus size={12} />
                        {foto.name}
                        <button
                          type="button"
                          onClick={() => quitarFoto(index)}
                          aria-label={`Quitar ${foto.name}`}
                          style={{ display: 'inline-flex' }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              {error ? (
                <p className="mx-sub" style={{ color: 'var(--red)', marginTop: 10 }}>
                  {error}
                </p>
              ) : null}
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <Button variant="ghost" style={{ flex: 1 }} onClick={() => onOpenChange(false)} disabled={enviando}>
                  Cancelar
                </Button>
                <Button variant="ice" style={{ flex: 1 }} onClick={() => void enviar()} disabled={enviando}>
                  {enviando ? (
                    <Spinner size={16} />
                  ) : (
                    <>
                      <Send size={14} />
                      Enviar solicitud
                    </>
                  )}
                </Button>
              </div>
            </DrawerBody>
          </DrawerContent>
        </DrawerOverlay>
      </DialogPortal>
    </Drawer>
  );
}
