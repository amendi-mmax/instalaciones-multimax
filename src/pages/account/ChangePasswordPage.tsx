import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { PageHead } from '@/components/shared/page-container';
import { PasswordStrengthMeter } from '@/components/shared/password-strength-meter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Toast, ToastViewport, type ToastTone } from '@/components/ui/toast';
import { useUserContext } from '@/hooks/useUserContext';
import { useAuth } from '@/hooks/useAuth';
import { evaluatePasswordStrength, passwordsMatch } from '@/lib/password-strength';
import { changePassword } from '@/services/account.service';

/**
 * ChangePasswordPage — Sprint 7.3 (Módulo de Cuenta de Usuario), ruta
 * `/cambiar-contrasena`. Distinta de `SetPasswordPage.tsx` (Sprint 6.3,
 * "autenticación existente", NO tocada en este Sprint): esa pantalla
 * atiende un enlace de invitación/recuperación (sesión ya establecida por
 * `detectSessionInUrl`, sin contraseña actual que verificar); esta pantalla
 * es para un usuario YA autenticado que decide cambiar su contraseña de
 * forma proactiva desde su cuenta -- por eso, a diferencia de aquella, SÍ
 * pide la contraseña actual (mismo criterio que GitHub/Google/Notion/
 * Slack/Linear/Stripe, pedido explícitamente por el brief).
 *
 * **"Usar la API oficial de Supabase para updatePassword. NO crear una
 * implementación propia."** -- `supabase.auth.updateUser({password})` (ya
 * envuelto como `useAuth().updatePassword`, Sprint 6.3, sin cambios) no
 * verifica ninguna contraseña actual por sí solo -- por diseño de Supabase,
 * cualquier sesión activa puede llamarlo. Para ofrecer una verificación
 * real de "Contraseña actual" (no una casilla decorativa), esta pantalla
 * reautentica primero con `useAuth().login({ email, password })` -- el
 * mismo `signInWithPassword` oficial que ya usa `LoginPage.tsx`, reutilizado
 * tal cual, sin ninguna implementación propia de verificación de
 * contraseña. Si la reautenticación falla, el error ya viene traducido al
 * español (`normalizeSupabaseError()`) -- "Las credenciales ingresadas son
 * incorrectas." es exactamente el mensaje que necesita "Contraseña actual
 * incorrecta".
 *
 * **Sistema de Toast**: mismo patrón de cola local que `LoginPage.tsx`/
 * `CoordinatorLayout.tsx` (`ui/toast.tsx` es solo estructura, sin Provider
 * global -- ver JSDoc de `LoginPage.tsx`), reutilizado tal cual acá.
 *
 * **Fortaleza/validaciones en tiempo real**: `PasswordStrengthMeter`
 * (Sprint 7.3) + `evaluatePasswordStrength`/`passwordsMatch`
 * (`lib/password-strength.ts`, funciones puras) -- ver sus propios JSDoc.
 *
 * **Sprint 7.3.1 (Refinamiento)**: la orquestación completa (reautenticar
 * → recién entonces actualizar → mapear el error correcto de cada paso)
 * se movió a `accountService.changePassword()` (`account.service.ts`) --
 * esta página quedó "únicamente como presentación" (Regla explícita del
 * brief): arma el `handleSubmit`, muestra el Toast según el resultado, y
 * nada más. `login`/`updatePassword` (las 2 acciones reales de Supabase
 * Auth) se siguen obteniendo de `useAuth()` -- son ACCIONES vinculadas a
 * la sesión, no datos, así que no viven en `UserContext` (ver su propio
 * JSDoc) -- se le pasan al servicio como parámetros, que es un módulo
 * plano y no puede invocar Hooks por su cuenta. `email` (para la
 * reautenticación) sí se lee de `useUserContext()`.
 */
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

let toastIdSeq = 0;

export function ChangePasswordPage() {
  const { login, updatePassword } = useAuth();
  const { profile, email } = useUserContext();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = (tone: ToastTone, title: string, description?: string) => {
    const id = (toastIdSeq += 1);
    setToasts((prev) => [...prev, { id, tone, title, description }]);
  };
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  if (!profile) return null;

  const { score } = evaluatePasswordStrength(newPassword);
  const strongEnough = score === 5;
  const match = passwordsMatch(newPassword, confirmPassword);

  const errores = {
    currentPassword: !currentPassword.trim() ? 'Ingresá tu contraseña actual.' : undefined,
    newPassword: !strongEnough ? 'La nueva contraseña no cumple con todas las reglas.' : undefined,
    confirmPassword: !match ? 'Las contraseñas no coinciden.' : undefined,
  };
  const mostrarErrores = submitAttempted;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (Object.values(errores).some(Boolean)) {
      setSubmitAttempted(true);
      return;
    }

    setSubmitting(true);

    const result = await changePassword({
      email,
      currentPassword,
      newPassword,
      login,
      updatePassword,
    });

    setSubmitting(false);

    if (!result.ok) {
      const title =
        result.step === 'missing-email'
          ? 'No se pudo verificar tu contraseña actual'
          : result.step === 'reauth'
            ? 'Contraseña actual incorrecta'
            : 'No se pudo cambiar la contraseña';
      pushToast('error', title, result.error.message);
      return;
    }

    pushToast('success', 'Contraseña actualizada', 'Tu contraseña se cambió correctamente.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSubmitAttempted(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Cambiar contraseña" subtitle="Actualizá la contraseña de tu cuenta." />

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="mx-fields">
            <label>
              Contraseña actual
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  disabled={submitting}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: '2.25rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                  aria-label={showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mostrarErrores && errores.currentPassword ? (
                <span style={{ color: 'var(--red)', fontSize: 12 }}>{errores.currentPassword}</span>
              ) : null}
            </label>

            <label>
              Nueva contraseña
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  disabled={submitting}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: '2.25rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                  aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mostrarErrores && errores.newPassword ? (
                <span style={{ color: 'var(--red)', fontSize: 12 }}>{errores.newPassword}</span>
              ) : null}
            </label>

            {newPassword ? <PasswordStrengthMeter password={newPassword} /> : null}

            <label>
              Confirmar nueva contraseña
              <Input
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                disabled={submitting}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="••••••••"
              />
              {confirmPassword && match ? (
                <span
                  className="flex items-center gap-1"
                  style={{ color: 'var(--green)', fontSize: 12, marginTop: 4 }}
                >
                  <ShieldCheck size={13} />
                  Las contraseñas coinciden.
                </span>
              ) : null}
              {mostrarErrores && errores.confirmPassword ? (
                <span style={{ color: 'var(--red)', fontSize: 12 }}>{errores.confirmPassword}</span>
              ) : null}
            </label>
          </div>

          <Button type="submit" variant="ice" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-mx-spin" />
                Actualizando…
              </>
            ) : (
              <>
                <KeyRound size={16} />
                Cambiar contraseña
              </>
            )}
          </Button>
        </form>
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
    </div>
  );
}
