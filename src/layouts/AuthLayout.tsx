import type { ReactNode } from 'react';
import { Radio } from 'lucide-react';

/**
 * AuthLayout — shell centrado para pantallas públicas de autenticación
 * (Sprint 4.2.1, entregable "Guards": `ProtectedRoute`/`PublicRoute`/
 * `AuthLayout`/`AppLayout`). `RootLayout` ya cumple el rol de "AppLayout"
 * (shell autenticado: Header + `<Outlet/>` + Footer, ver Sprint
 * 4.2.1_AUTH_REPORT.md) -- este archivo es el análogo para el lado público
 * (`/login`), que no existía hasta este Sprint.
 *
 * Construido exclusivamente con los tokens/paleta ya existentes
 * (`--ink`/`--surf`/`--line`/`--ice`, `font-display`/`font-body` vía
 * `--fd`/`--fb`) y el mismo tratamiento de logo que `HeaderBrand`
 * (`.mx-logo`, degradado `--ice`→`#1fb6bd`) -- sin ninguna plantilla externa,
 * sin clases/colores nuevos.
 */
export interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="mx-logo grid h-12 w-12 place-items-center">
            <Radio size={22} />
          </div>
          <div>
            <div className="font-display text-lg font-bold text-text">Multimax Despacho</div>
            <div className="text-xs text-muted">Sistema de Gestión de Instalaciones</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
