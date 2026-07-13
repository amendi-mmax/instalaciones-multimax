import { useCallback, useEffect, useState } from 'react';

import { fmt } from '@/lib/utils';

/**
 * Props de `LiveCountdown` — reconstruye la firma exacta de
 * `function LiveCountdown({ publishedAt, bidMins })`
 * (`Multimax_Despacho_v1.3.html`, línea 2473). Ambas props son obligatorias
 * y numéricas en el HTML fuente: `publishedAt` es un timestamp en
 * milisegundos (`Date.now()`-compatible) y `bidMins` es la duración de la
 * ronda de bid, en minutos.
 */
export interface LiveCountdownProps {
  publishedAt: number;
  bidMins: number;
}

/**
 * LiveCountdown — cuenta regresiva en tiempo real para trabajos en cola
 * (`Multimax_Despacho_v1.3.html`, líneas 2473-2493, comentario fuente:
 * `/* ===== Contador en tiempo real para trabajos en cola ===== *\/`),
 * transcrita verbatim. Único consumidor real: `statusPill(jb)`, helper
 * interno de `Coordinator(props)` (líneas 2171-2192), usado una vez por
 * trabajo dentro de `QueueBar` (líneas 2193-2210) — ver análisis completo
 * en docs/sprints/sprint-3.9.md.
 *
 * Discrepancias confirmadas contra el HTML real (documentadas en el
 * análisis del Sprint 3.9, no asumidas del brief):
 * - NO renderiza `CountRing` (Sprint 3.8) — ambos son componentes de
 *   countdown independientes y sin relación en el HTML fuente. `CountRing`
 *   es un anillo SVG puro sin estado propio; `LiveCountdown` es un `<span>`
 *   de texto con su propio `useState`/`useEffect`/`setInterval`. El único
 *   punto en común es que ambos reutilizan `fmt`.
 * - NO dispara ningún callback al llegar a cero — no existe ninguna prop de
 *   tipo función en la firma real. Al expirar, simplemente sigue mostrando
 *   "0:00 restante" en rojo (clamp con `Math.max(0, ...)`).
 *
 * Usa `Date.now()` directamente (no el helper `now()` de línea 877, que sí
 * aplica `CONF.speed` para la simulación de `jobView`/`stepJobEngine`) — el
 * temporizador de `LiveCountdown` corre siempre en tiempo real, sin
 * aceleración, tal como en el HTML fuente.
 *
 * Adaptación técnica (no visual): `calc` se envuelve en `useCallback` con
 * las mismas dependencias que el `useEffect` original del HTML
 * (`[publishedAt, total]`) para satisfacer la regla de ESLint
 * `react-hooks/exhaustive-deps` (activa en este proyecto desde Fase 3), sin
 * alterar el comportamiento de reinicio del timer — ver "Adaptación
 * técnica" en docs/sprints/sprint-3.9.md.
 */
export function LiveCountdown({ publishedAt, bidMins }: LiveCountdownProps) {
  const total = bidMins * 60;

  const calc = useCallback(
    () => Math.max(0, total - Math.floor((Date.now() - publishedAt) / 1000)),
    [publishedAt, total],
  );

  const [rem, setRem] = useState(calc);

  useEffect(() => {
    const iv = setInterval(() => setRem(calc()), 1000);
    return () => clearInterval(iv);
  }, [calc]);

  const col = rem <= 30 ? 'var(--red)' : rem <= total * 0.4 ? 'var(--amber)' : 'var(--ice)';

  return (
    <span style={{ fontFamily: 'var(--fm)', fontWeight: 700, fontSize: 13, color: col }}>
      {fmt(rem)} restante
    </span>
  );
}
