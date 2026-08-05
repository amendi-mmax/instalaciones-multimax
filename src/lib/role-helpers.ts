import type { Rol } from '@/types/enums';

/**
 * role-helpers.ts — Sprint 7.3.1 (Refinamiento del Módulo de Cuenta de
 * Usuario). Centraliza 2 cosas que antes vivían repetidas/dispersas:
 *
 * 1. Comparaciones de rol (`profile.rol === 'admin'`, etc.) -- ya se
 *    repetían inline en varios archivos (`RootLayout.tsx`,
 *    `AppRouter.tsx`, `CoordinatorLayout.tsx`) antes de este Sprint. Este
 *    Sprint NO reescribe esos archivos restringidos (`RootLayout.tsx`/
 *    `CoordinatorLayout.tsx` quedan intactos, ver `CLAUDE.md`) -- estos
 *    helpers quedan disponibles para que ese código, y todo código nuevo
 *    del módulo de Cuenta de Usuario, los reutilice desde ahora en
 *    adelante, sin duplicar la comparación de string.
 * 2. `getDashboardRoute(rol)` -- la ruta "de vuelta al Dashboard" para cada
 *    rol, antes hardcodeada de forma ad hoc en `AppRouter.tsx`
 *    (`CoordinatorIndexRedirect`, ver su propio JSDoc actualizado). Único
 *    punto de verdad para esta decisión.
 *
 * **Por qué `coordinador` e `instalador`/`admin` no van todos a rutas
 * "propias"**: `coordinador` (y `admin` en "Modo Coordinador") sí tiene una
 * ruta real, `/despacho` (Sprint 5.1). `instalador` y `admin` (fuera de
 * "Modo Coordinador") NO tienen ninguna ruta propia todavía --
 * `InstallerDashboard`/`AdminPanel` se renderizan inline dentro de
 * `RootLayout.tsx` en `/`, sin URL dedicada (ver `ARCHITECTURE.md` §14.11).
 * Por eso `getDashboardRoute('instalador')`/`getDashboardRoute('admin')`
 * devuelven `'/'` -- es la ruta real donde esos 2 casos se renderizan hoy,
 * no una simplificación. Para un `admin` que estaba en "Modo Coordinador"
 * (viendo `/despacho`), navegar a `'/'` no lo saca de esa vista: el
 * `useEffect` ya existente de `RootLayout.tsx` (sin modificar en este
 * Sprint) lo devuelve automáticamente a `/despacho` mientras
 * `adminVista === 'coordinador'` -- comportamiento ya construido, este
 * helper no necesita duplicarlo ni conocerlo.
 */
export function isAdmin(rol: Rol | null | undefined): boolean {
  return rol === 'admin';
}

export function isCoordinator(rol: Rol | null | undefined): boolean {
  return rol === 'coordinador';
}

export function isInstaller(rol: Rol | null | undefined): boolean {
  return rol === 'instalador';
}

export function getDashboardRoute(rol: Rol | null | undefined): string {
  if (isCoordinator(rol)) return '/despacho';
  return '/';
}
