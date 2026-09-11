import type { ReactNode } from 'react';

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
 * `--fd`/`--fb`) -- sin ninguna plantilla externa, sin clases/colores
 * nuevos.
 *
 * **Sprint "Branding login"**: se reemplaza el ícono genérico `Radio` por
 * el emblema oficial MULTIMAX (`public/multimax-emblem.png`) -- el mismo
 * asset ya usado en `HeaderBrand.tsx` (Ajuste de branding, ronda
 * anterior), reutilizado tal cual (auditoría previa confirmó que no
 * existía ningún otro asset de branding "de login" distinto -- se evita
 * duplicar el archivo). No se reutiliza la clase `.mx-logo` en sí: esa
 * clase quedó dimensionada para el contenedor de 34px del header
 * (`globals.css`, misma ronda) -- un contexto de tamaño distinto al de
 * esta pantalla (originalmente 48x48px, `h-12 w-12`); se usa `h-12 w-auto`
 * inline (Tailwind) para conservar el mismo alto que tenía el ícono
 * anterior sin forzar el ancho (evita deformar el logo, que no es
 * cuadrado). `alt="Multimax"` para accesibilidad, mismo texto ya usado en
 * `HeaderBrand`.
 */
export interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/multimax-emblem.png" alt="Multimax" className="h-12 w-auto" />
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
