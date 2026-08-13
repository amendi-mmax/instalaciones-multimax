import { Check, X } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { evaluatePasswordStrength, PASSWORD_MIN_LENGTH } from '@/lib/password-strength';

/**
 * PasswordStrengthMeter — Sprint 7.3 (Módulo de Cuenta de Usuario). Reutiliza
 * `Progress` (`ui/progress.tsx`, Fase 3, sin consumidor real hasta ahora) en
 * vez de crear una barra nueva -- la referencia visual pedida por el brief
 * (GitHub/Google/Notion/Slack/Linear/Stripe) es, en todos esos productos,
 * exactamente este patrón: barra de progreso + checklist de reglas, sin
 * ningún elemento gráfico adicional que este proyecto no tenga ya.
 *
 * `Progress` no expone forma de recolorear su barra por prop (el degradado
 * `--ice` está fijo dentro del componente) -- no se modifica ese componente
 * compartido solo para este caso de uso; la señal de "qué tan fuerte es"
 * la da el checklist (ícono + color de texto por regla cumplida/pendiente)
 * y la etiqueta de texto, no el color de la barra.
 */
export interface PasswordStrengthMeterProps {
  password: string;
}

const CHECK_LABELS: { key: keyof ReturnType<typeof evaluatePasswordStrength>['checks']; label: string }[] = [
  { key: 'minLength', label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres` },
  { key: 'uppercase', label: 'Una letra mayúscula' },
  { key: 'lowercase', label: 'Una letra minúscula' },
  { key: 'number', label: 'Un número' },
  { key: 'specialChar', label: 'Un carácter especial' },
];

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { checks, score, label } = evaluatePasswordStrength(password);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Progress value={(score / CHECK_LABELS.length) * 100} className="mr-3" />
        <span className="whitespace-nowrap text-xs font-semibold text-muted">{password ? label : ''}</span>
      </div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {CHECK_LABELS.map(({ key, label: checkLabel }) => {
          const met = checks[key];
          return (
            <li
              key={key}
              className="flex items-center gap-1.5 text-xs"
              style={{ color: met ? 'var(--green)' : 'var(--muted)' }}
            >
              {met ? <Check size={13} /> : <X size={13} />}
              {checkLabel}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
