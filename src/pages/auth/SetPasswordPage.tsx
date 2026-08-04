import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';

/**
 * SetPasswordPage — Sprint 6.3 (Onboarding del Instalador). Pantalla
 * compartida a la que Supabase Auth redirige después de un enlace de
 * **invitación** (`inviteUserByEmail`, `admin-operations`) o de
 * **recuperación de contraseña** (`resetPasswordForEmail`, `LoginPage`) --
 * ambos flujos terminan en el mismo estado real: una sesión ya establecida
 * por `detectSessionInUrl` (`SUPABASE_CLIENT_OPTIONS`, ya configurado desde
 * Sprint 4.1.1) a la que le falta/hay que redefinir la contraseña. No se
 * duplica lógica entre los dos casos -- solo cambia qué ocurre DESPUÉS de
 * guardar la contraseña (ver `isRecovery` más abajo).
 *
 * Montada como ruta standalone en `AppRouter.tsx` (`/nueva-contrasena`),
 * fuera de `ProtectedRoute` (bloquearía a un usuario sin `session` previa,
 * exactamente el caso de "enlace inválido/vencido" que esta página debe
 * poder mostrar) y fuera de `PublicRoute` (redirige a `/` apenas hay
 * `session`, y acá SIEMPRE hay `session` una vez que `detectSessionInUrl`
 * procesa el enlace -- nunca se llegaría a ver el formulario).
 *
 * **Distinción invitación vs. recuperación**: Supabase no expone esa
 * distinción en `session`/`user` de forma directa -- el enlace real trae
 * `type=invite` o `type=recovery` en la URL (hash o query, según el flujo).
 * Se lee una sola vez al montar (`isRecoveryLink()`), sin depender de
 * ningún evento de `onAuthStateChange` adicional. Si no se puede determinar
 * (URL ya limpia, o un caso no contemplado), se trata como invitación --
 * el default más seguro para "no dejar a alguien recién invitado en una
 * pantalla de login sin saber qué hacer" (Regla del Sprint: "no mostrar
 * pantallas intermedias").
 *
 * **Actualización (Sprint 7.2, corrección de `redirectTo`)**: el origen del
 * enlace ya no depende únicamente del "Site URL" del Dashboard (limitación
 * documentada originalmente acá, Issue 3 de la estabilización del Sprint
 * 6.2) -- tanto `resetPasswordForEmail()` (`auth.service.ts`, calcula
 * `window.location.origin` en runtime) como `inviteUserByEmail()`
 * (`admin-operations/index.ts`, Edge Function, vía el Secret `APP_URL`)
 * pasan ahora `redirectTo` explícito apuntando a esta misma ruta
 * (`/nueva-contrasena`) -- regla arquitectónica permanente, ver
 * `ARCHITECTURE.md` §14.10/`CLAUDE.md`. Esta página no necesitó ningún
 * cambio de lógica: `type=recovery`/`type=invite` siguen llegando en el
 * fragmento de la URL exactamente igual, sin importar el host.
 */
function isRecoveryLink(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');
}

const MIN_PASSWORD_LENGTH = 6;

export function SetPasswordPage() {
  const { session, loading, updatePassword, logout } = useAuth();
  const navigate = useNavigate();

  const [isRecovery] = useState(isRecoveryLink);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    const result = await updatePassword(password);

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error.message);
      return;
    }

    if (isRecovery) {
      // "Recuperación de contraseña": cierra la sesión creada por el enlace
      // y devuelve al login -- ahí inicia sesión de nuevo con la contraseña
      // recién definida (Regla del Sprint: "regresar al login").
      await logout();
      navigate('/login', { replace: true });
      return;
    }

    // "Primer inicio de sesión" (invitación): la sesión ya es válida, se
    // continúa directo al Dashboard -- `RootLayout` decide cuál según
    // `profile.rol`, sin ninguna pantalla intermedia.
    navigate('/', { replace: true });
  };

  if (loading) {
    return <Loading label="Verificando enlace…" />;
  }

  if (!session) {
    return (
      <Card>
        <div className="flex flex-col gap-3 text-center">
          <p className="font-display text-sm font-bold text-text">Enlace inválido o vencido</p>
          <p className="text-xs text-muted">
            Este enlace de invitación o recuperación ya no es válido. Solicitá uno nuevo a un administrador, o
            recuperá tu contraseña desde el inicio de sesión.
          </p>
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Volver al inicio de sesión
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <p className="mb-1 flex items-center gap-2 font-display text-sm font-bold text-text">
            <KeyRound size={16} className="text-ice" />
            {isRecovery ? 'Definí tu nueva contraseña' : 'Creá tu contraseña'}
          </p>
          <p className="text-xs text-muted">
            {isRecovery
              ? 'Ingresá una nueva contraseña para tu cuenta.'
              : 'Creá una contraseña para activar tu cuenta y acceder al sistema.'}
          </p>
        </div>
        <div className="mx-fields">
          <label>
            Nueva contraseña
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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
          <label>
            Confirmar contraseña
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>
        </div>
        {error ? <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p> : null}
        <Button type="submit" variant="ice" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-mx-spin" />
              Guardando…
            </>
          ) : (
            'Guardar contraseña'
          )}
        </Button>
      </form>
    </Card>
  );
}
