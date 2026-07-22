import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Loader2, Mail } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Toast, ToastViewport, type ToastTone } from '@/components/ui/toast';

/**
 * LoginPage — pantalla de inicio de sesión real (Sprint 4.2.1, entregable
 * principal). Construida exclusivamente con componentes/tokens ya
 * existentes (`Card`, `Input`, `Label`, `Button`, `Checkbox`, `Toast`,
 * paleta `--ink`/`--surf`/`--line`/`--ice` de `globals.css`) -- sin ninguna
 * plantilla externa, sin clases/colores nuevos.
 *
 * ## Sistema de Toast usado aquí
 *
 * `ui/toast.tsx` (Fase 3) es, por diseño explícito de esa fase, "solo
 * estructura": define `Toast`/`ToastViewport` sin cola de mensajes ni
 * Provider global (ver su propio JSDoc). Este Sprint no construye esa
 * infraestructura global (no fue pedida como entregable) -- en su lugar,
 * esta página mantiene su propia cola local (`toasts`, `pushToast`/
 * `dismissToast`) usando esos mismos componentes ya aprobados. Documentado
 * explícitamente como una decisión de alcance en
 * `SPRINT_4_2_1_AUTH_REPORT.md`: si una pantalla futura necesita toasts
 * globales, ese Sprint puede generalizar este mismo patrón a un
 * `ToastProvider` real sin tener que rehacer `ui/toast.tsx`.
 *
 * ## "Recordar sesión"
 *
 * Supabase ya persiste la sesión en `localStorage` siempre
 * (`SUPABASE_CLIENT_OPTIONS.auth.persistSession: true`,
 * `src/lib/supabase/config.ts`, infraestructura ya aprobada que este Sprint
 * no modifica) -- por lo tanto este checkbox NO cambia el mecanismo real de
 * persistencia de sesión de Supabase (hacerlo requeriría reconfigurar el
 * `storage` adapter del cliente en `client.ts`, fuera del alcance de este
 * Sprint). Lo que sí controla, honestamente, es una conveniencia propia de
 * esta página: si está marcado, se recuerda el último correo usado
 * (`localStorage['handymax:rememberedEmail']`) para precargarlo la próxima
 * vez. Documentado también en el informe de este Sprint.
 */
const REMEMBERED_EMAIL_KEY = 'handymax:rememberedEmail';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface LocationState {
  reason?: 'session-expired' | 'suspended' | 'profile-not-found';
}

let toastIdSeq = 0;

function mapLoginError(message: string, code: string | null): string {
  const normalized = message.toLowerCase();
  const normalizedCode = (code ?? '').toLowerCase();
  if (
    normalizedCode === 'invalid_credentials' ||
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid_credentials')
  ) {
    return 'Credenciales inválidas. Verificá tu correo y contraseña.';
  }
  if (normalizedCode === 'email_not_confirmed' || normalized.includes('email not confirmed')) {
    return 'Tu correo todavía no fue confirmado. Revisá tu bandeja de entrada.';
  }
  return 'Ocurrió un error al iniciar sesión. Intentá de nuevo.';
}

export function LoginPage() {
  const { login, resetPassword } = useAuth();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (tone: ToastTone, title: string, description?: string) => {
    const id = (toastIdSeq += 1);
    setToasts((prev) => [...prev, { id, tone, title, description }]);
  };
  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (remembered) {
      setEmail(remembered);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    const state = location.state as LocationState | null;
    const reason = state?.reason;
    if (reason === 'session-expired') {
      pushToast('info', 'Sesión expirada', 'Tu sesión anterior expiró — iniciá sesión nuevamente.');
    } else if (reason === 'suspended') {
      pushToast('error', 'Cuenta suspendida', 'Tu cuenta está suspendida. Contactá a un administrador.');
    } else if (reason === 'profile-not-found') {
      pushToast(
        'error',
        'Perfil no encontrado',
        'No encontramos un perfil asociado a tu cuenta. Contactá a un administrador.',
      );
    }
    // Solo se evalúa una vez al montar -- `location.state` no cambia
    // mientras la página permanece montada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    if (remember) {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } else {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }

    const result = await login({ email, password });
    setSubmitting(false);

    if (!result.ok) {
      pushToast('error', 'No se pudo iniciar sesión', mapLoginError(result.error.message, result.error.code));
      return;
    }
    // Sin navegación manual: `PublicRoute` redirige solo en cuanto `session`
    // se actualiza vía `onAuthStateChange` (ver `AuthProvider.tsx`). Si el
    // perfil resuelto resulta suspendido o no encontrado, `RootLayout`
    // cierra la sesión y rebota a `/login` con el motivo correspondiente
    // (ver su propio comentario) -- este handler no necesita saberlo.
  };

  const handleRecoverySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (recoverySubmitting) return;
    setRecoverySubmitting(true);
    const result = await resetPassword(recoveryEmail);
    setRecoverySubmitting(false);

    if (!result.ok) {
      pushToast('error', 'No se pudo enviar el correo', result.error.message);
      return;
    }
    pushToast(
      'success',
      'Revisá tu correo',
      'Si el correo existe en el sistema, te enviamos instrucciones para restablecer tu contraseña.',
    );
    setShowRecovery(false);
  };

  return (
    <>
      <Card>
        {!showRecovery ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="mx-fields">
              <label>
                Correo electrónico
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nombre@multimax.com"
                />
              </label>
              <label>
                Contraseña
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    style={{ paddingRight: '2.25rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted">
                <Checkbox checked={remember} onCheckedChange={(checked) => setRemember(checked === true)} />
                Recordar sesión
              </label>
              <button
                type="button"
                onClick={() => {
                  setRecoveryEmail(email);
                  setShowRecovery(true);
                }}
                className="font-semibold text-ice hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <Button type="submit" variant="ice" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-mx-spin" />
                  Autenticando…
                </>
              ) : (
                'Ingresar'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRecoverySubmit} className="flex flex-col gap-4">
            <div>
              <p className="mb-1 flex items-center gap-2 font-display text-sm font-bold text-text">
                <KeyRound size={16} className="text-ice" />
                Recuperar contraseña
              </p>
              <p className="text-xs text-muted">
                Ingresá tu correo y te enviaremos instrucciones para restablecer tu contraseña.
              </p>
            </div>
            <div className="mx-fields">
              <label>
                Correo electrónico
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  value={recoveryEmail}
                  onChange={(event) => setRecoveryEmail(event.target.value)}
                  placeholder="nombre@multimax.com"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowRecovery(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="ice" disabled={recoverySubmitting}>
                {recoverySubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-mx-spin" />
                    Enviando…
                  </>
                ) : (
                  <>
                    <Mail size={16} />
                    Enviar instrucciones
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <ToastViewport>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            tone={toast.tone}
            toastTitle={toast.title}
            description={toast.description}
            onClose={() => dismissToast(toast.id)}
          />
        ))}
      </ToastViewport>
    </>
  );
}
