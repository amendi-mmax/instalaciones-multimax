# Sprint 4.2.1 — Sistema de Autenticación y Experiencia de Inicio de Sesión

**Fecha:** 2026-07-21. **Estado:** 🟡 En revisión — pendiente de validación local del usuario (`npm run lint`/`typecheck`/`build`/`dev`, ver sección 6) y de confirmación explícita sobre la limitación crítica de RLS descrita en la sección 8.

## 0. Nota de traza sobre el entorno de esta ronda

Esta ronda no llegó con ningún ZIP adjunto — el brief pedía trabajar "sobre el baseline ya aprobado", que es exactamente el estado en disco dejado por el cierre de Sprint 4.1.1C ("Refactorización final de `database.service.ts`"), verificado al inicio de esta ronda con `find src -type f`/lectura directa de los archivos relevantes antes de tocar nada, siguiendo la instrucción explícita del propio brief ("Antes de modificar cualquier archivo: analiza completamente el proyecto, lee nuevamente `ARCHITECTURE.md`/`docs/architecture/`/`PROJECT_STATUS.md`/`PHASE_4.md`, comprendé la arquitectura existente, no crear una arquitectura paralela"). Esa lectura completa (incluida esta vez `PHASE_4.md`, no abierto en ninguna ronda anterior de esta sesión) es la que sustenta todas las decisiones de las secciones siguientes.

## 1. Arquitectura implementada

Esta ronda **construye sobre** la infraestructura ya aprobada de Sprint 4.1.1/4.1.1B/4.1.1C — no crea ninguna capa paralela:

- `src/lib/supabase/client.ts`/`server.ts`/`config.ts` — **sin cambios**.
- `src/services/supabase.service.ts` — **sin cambios**.
- `src/services/auth.service.ts` — **extendido** (2 funciones nuevas: `refreshSession`, `resetPasswordForEmail`; las 5 ya existentes intactas).
- `src/services/profile.service.ts` — **nuevo**. Única pieza de lógica de negocio real de esta ronda: resuelve el perfil/rol real de una sesión autenticada contra las 3 tablas reales (ver sección 3).
- `src/providers/SessionProvider.tsx`/`session.context.ts` — **sin cambios**.
- `src/providers/AuthProvider.tsx`/`auth.context.ts` — **completados**: pasan de ser un genérico "sin lógica de negocio, no resuelve rol" (así estaban documentados explícitamente desde Sprint 4.1.1) a resolver `profile` real y exponer `login`/`logout`/`resetPassword`/`refreshSession` (nombres pedidos por este brief).
- `src/hooks/useAuth.ts`/`useSession.ts`/`useSupabase.ts` — **sin cambios de lógica** (`useAuth.ts` solo actualiza su JSDoc).
- `src/contexts/AuthContext.tsx` (legacy) — **eliminado**. Ver sección 7.
- `src/repositories/*` — **sin cambios**; `admins`/`coordinadores`/`instaladores`/`empresas`/`tiendas` se consumen tal cual desde `profile.service.ts`.

## 2. Flujo de autenticación (login)

1. `LoginPage` (`src/pages/auth/LoginPage.tsx`, nueva) captura correo/contraseña y llama a `login({ email, password })` (`useAuth()`).
2. `login()` delega en `signInWithPassword()` (`auth.service.ts`, ya existente) → `supabase.auth.signInWithPassword()`.
3. Si Supabase acepta las credenciales, dispara el evento `SIGNED_IN`; `SessionProvider` (sin cambios) ya está suscripto vía `onAuthStateChange` y actualiza `session` en contexto.
4. `AuthProvider` (extendido) reacciona a ese cambio de `session.user.id` con un `useEffect` que llama a `resolveProfile()` (`profile.service.ts`) y publica el resultado en `profile`/`profileLoading`.
5. `PublicRoute` (nuevo, envuelve `/login`) redirige automáticamente en cuanto `session` deja de ser `null` — sin navegación manual desde `LoginPage`.
6. `RootLayout` (bajo `ProtectedRoute`) espera a que `profileLoading` termine; si `profile` es `null` o `profile.estado === 'suspendido'`, cierra la sesión (`logout()`) y redirige de vuelta a `/login` con un motivo (`state.reason`) que `LoginPage` traduce a un toast — ver sección 4.

Credenciales inválidas, correo no confirmado y errores genéricos de Supabase se traducen a español en `LoginPage` (`mapLoginError`, usa tanto `error.code` como `error.message`).

## 3. Resolución de perfil/rol (`profile.service.ts`)

El schema real (`ARCHITECTURE.md §9.9`) no tiene tabla `usuarios` unificada ni columna `rol` central: el rol se determina por membresía de fila en `admins`/`coordinadores`/`instaladores` (las 3 con `id = auth.users.id` directamente). `resolveProfile(userId, authEmail)` consulta, en este orden, `admins` → `coordinadores` → `instaladores`, deteniéndose en la primera fila encontrada, y enriquece el resultado con el nombre de `empresas`/`tiendas` correspondiente. `estado` (`activo`/`suspendido`/`inactivo`) se deriva de las columnas booleanas reales (`activo`, y `suspendido` solo en `instaladores`) — ninguna tabla real tiene una columna `estado` literal.

`correo`: `admins`/`instaladores` tienen columna `email` propia; `coordinadores` no la tiene (verificado contra `database.generated.ts`) — en ese caso se usa `session.user.email` como respaldo.

`avatarUrl`: siempre `null` hoy — ninguna de las 3 tablas tiene columna `avatar`/`avatar_url` en Producción (verificado). `HeaderUserMenu` ya está preparado para usarla en cuanto exista.

## 4. Flujo de sesión y estados de `LoginPage`

| Estado | Disparador | Cómo se muestra |
|---|---|---|
| Autenticando | `submitting=true` durante `login()` | Botón "Ingresar" → spinner + "Autenticando…" |
| Credenciales inválidas | `login()` devuelve `ok:false` con code/mensaje de Supabase | Toast de error |
| Sesión expirada | `ProtectedRoute` detecta que `session` pasó de no-nula a nula | Redirección a `/login` con `state.reason='session-expired'` → toast informativo |
| Usuario suspendido | `RootLayout` detecta `profile.estado === 'suspendido'` tras cargar perfil | `logout()` automático + redirección con `state.reason='suspended'` → toast de error |
| Perfil no encontrado | `RootLayout` detecta `profile === null` tras `profileLoading` | `logout()` automático + redirección con `state.reason='profile-not-found'` → toast de error (ver limitación crítica, sección 8) |

Los toasts se implementan con una cola local dentro de `LoginPage` sobre los componentes ya existentes `Toast`/`ToastViewport` (`ui/toast.tsx`, Fase 3, deliberadamente "solo estructura" — sin Provider global). No se construyó un sistema de Toast global nuevo: no fue pedido como entregable y habría excedido el alcance de esta ronda; el patrón queda documentado en el propio archivo para generalizarse si un Sprint futuro lo necesita.

## 5. Recuperación de contraseña

Únicamente vía `supabase.auth.resetPasswordForEmail()` (`resetPasswordForEmail()`, nuevo en `auth.service.ts`), sin flujo SMTP propio (deferido explícitamente a un Sprint futuro de Notificaciones con Amazon SES, per el brief). "¿Olvidaste tu contraseña?" abre un panel dentro de la misma tarjeta de `LoginPage` (sin modal/ruta nueva) pidiendo el correo; éxito/; error se muestran vía la misma cola de toasts. **Limitación documentada**: no se pasa `redirectTo` explícito porque no existe, en esta ronda, ninguna pantalla de "definir nueva contraseña" a la que redirigir tras el enlace del correo (no estaba en la lista de entregables) — Supabase usa el "Site URL" configurado en el Dashboard. Construir esa pantalla es el próximo paso natural (sección 9).

## 6. Componentes/archivos nuevos

- `src/types/perfil.ts` — tipo `Perfil`/`EstadoPerfil` (reexporta `Rol` de `types/enums.ts`, sin duplicar el tipo).
- `src/services/profile.service.ts` — `resolveProfile()`.
- `src/components/auth/ProtectedRoute.tsx`, `PublicRoute.tsx` — guards de ruta.
- `src/layouts/AuthLayout.tsx` — shell centrado para `/login` (logo + tarjeta), construido solo con tokens/paleta ya existentes.
- `src/pages/auth/LoginPage.tsx` — pantalla de login completa (correo, contraseña con mostrar/ocultar, "Recordar sesión", recuperación de contraseña, toasts).
- `src/components/shared/header-user-menu.tsx` — menú de usuario autenticado (Avatar + iniciales, nombre/correo/rol/estado/empresa/tienda, "Mi perfil"/"Configuración"/"Cambiar contraseña" deshabilitados — sin pantallas propias en esta ronda —, "Cerrar sesión" funcional).
- `src/components/shared/header-role-switch.tsx` — **eliminado** (ver sección 7).
- `src/contexts/AuthContext.tsx` — **eliminado** (ver sección 7).

## 7. Reconciliación de arquitectura paralela (retiro de duplicados legacy)

Desde Sprint 4.1.1, este proyecto documentaba explícitamente **dos** pares Provider/hook de autenticación coexistiendo a propósito: el legacy `src/contexts/AuthContext.tsx` (Fase 3, placeholder tipado contra el modelo `usuario`/`rol`/`sucursalId` ya descartado por el usuario en `ARCHITECTURE.md §9.9`) y el nuevo `src/providers/AuthProvider.tsx`/`useAuth` (genérico, sin resolver rol). `App.tsx` montaba el legacy; el nuevo no se montaba en ningún lugar todavía.

Esta ronda es la primera que necesita un `AuthProvider` real con rol/perfil — construirlo habría significado, de mantener ambos, tener efectivamente 2 arquitecturas de autenticación activas en simultáneo, exactamente lo que el brief prohíbe ("no crear una arquitectura paralela"). Se resolvió así:

- El `AuthProvider`/`useAuth` **nuevo** (`src/providers/`) se completó con perfil/rol real y es ahora el único.
- `App.tsx` se actualizó para montar `AppProviders` (`SupabaseProvider` + `AuthProvider` nuevo) en vez del legacy.
- `src/contexts/AuthContext.tsx` se **eliminó** (era un placeholder sin ningún consumidor más allá de `App.tsx`, verificado con `grep` antes de borrar — no rompe nada).
- `header-role-switch.tsx` también se eliminó: su propio JSDoc, desde Fase 3, ya anticipaba su retiro exacto en "la fase de Auth" — esta es esa fase.

También se retira, de facto, `RootLayout`'s `useState<Rol>` editable a mano — `role` ahora se deriva de `profile.rol` (ver `layouts/RootLayout.tsx`, comentario "SPRINT 4.2.1"). Ningún componente ya aprobado (`CoordinatorEmptyState`/`Radar`/`LiveCountdown`/`InstallerDashboard`/`CountRing`/`AdminPanel`/`PublishModal`/`ConfirmCancelDialog`) fue modificado — los 3 bloques condicionales `role === '...'` siguen exactamente igual, solo cambió de dónde viene el valor de `role`.

## 8. Limitación crítica de backend, reportada (no resuelta en esta ronda)

**Bloqueador real para probar login de punta a punta con roles `admin`/`coordinador`.** Según la propia auditoría de RLS ya documentada en los JSDoc de `admins.repository.ts`/`coordinadores.repository.ts`/`empresas.repository.ts`/`tiendas.repository.ts` (Sprints 4.0.1/4.1.1): esas 4 tablas tienen RLS **habilitado** pero **cero policies** para el rol `authenticated` — solo `instaladores` (y `trabajos`) tienen policies reales.

Consecuencia directa: `resolveProfile()`, para un `admin`/`coordinador` real, recibirá 0 filas de `admins`/`coordinadores` (bloqueadas por RLS, no un error) y terminará devolviendo "perfil no encontrado" — el usuario iniciará sesión correctamente (credenciales válidas) pero será expulsado de inmediato con el toast "Perfil no encontrado" (sección 4), **no por un bug de este Sprint**, sino porque la base de datos no tiene todavía las policies de lectura necesarias para esos 2 roles.

No se agregaron esas policies en esta ronda: no fue pedido como entregable (el brief solo pidió Auth/frontend, ninguna migración/RLS), y añadir policies de RLS por cuenta propia sería una decisión de seguridad de backend que este proyecto, consistentemente, ha tratado como algo que requiere aprobación explícita antes de ejecutarse (mismo criterio aplicado en Sprint 4.0.1 con la política de auto-actualización de perfil). **Se reporta con máxima visibilidad para que el usuario decida**: la recomendación técnica es una migración nueva (p. ej. `000X_admin_coordinador_select_policies.sql`) agregando, como mínimo, `FOR SELECT USING (id = auth.uid())` en `admins`/`coordinadores` (y probablemente en `empresas`/`tiendas`, para que el nombre de empresa/tienda se resuelva) — pero esa decisión y su implementación quedan fuera de esta ronda.

Con la configuración actual, **solo el login de `instalador` puede probarse de punta a punta contra Producción real**.

## 9. Otras limitaciones y decisiones documentadas

- **"Recordar sesión"** no cambia el mecanismo real de persistencia de Supabase (`persistSession: true` ya es el comportamiento fijo de `client.ts`, sin tocar en esta ronda) — solo recuerda el último correo usado en `localStorage`. Documentado en el propio `LoginPage.tsx`.
- **Recuperación de contraseña** no tiene todavía una pantalla de "definir nueva contraseña" post-enlace de correo (sección 5) — el siguiente paso natural, no pedido explícitamente en esta ronda.
- **"Mi perfil"/"Configuración"/"Cambiar contraseña"** en `HeaderUserMenu` están presentes visualmente pero deshabilitados — no se inventaron pantallas para ellos, fuera del alcance pedido ("NO modificar... publicación de trabajos" y ninguna mención a pantallas de perfil/configuración en la lista de entregables).
- **`coordinadores.rol`** (columna `text`, puede valer `'coordinador'` o `'admin'` según su propio JSDoc heredado) no se usa para anular el rol determinado por membresía de tabla — se documenta como una posible fuente de confusión futura si esa columna alguna vez se usa con otro propósito, pero no se reinterpreta aquí sin instrucción explícita.
- **Orden de precedencia `admins → coordinadores → instaladores`** en `resolveProfile()` es una decisión de esta ronda, documentada en el JSDoc de `profile.service.ts` — no hay ninguna fuente que indique que un mismo `id` pueda existir en más de una tabla; el orden es una salvaguarda defensiva, no una regla de negocio real conocida.

## 10. Validación técnica realizada

Sin acceso a `registry.npmjs.org` en este entorno (bloqueo de red constante en toda esta sesión, `node_modules/` inexistente) — `npm install`/`npm run lint`/`typecheck`/`build`/`dev` reales **no pudieron ejecutarse aquí**, igual que en todas las rondas anteriores de Fase 4.

Validación best-effort realizada:

- `tsc --noEmit -p tsconfig.app.json` con una instalación **global** de TypeScript 6.0.3 disponible en este entorno (`/home/claude/.npm-global/bin/tsc`, no forma parte de las dependencias del proyecto) — se ejecutó sobre todo `src/`, filtrando luego solo los 19 archivos nuevos/modificados de esta ronda. Los únicos diagnósticos encontrados en esos 19 archivos son de las categorías `TS2307` ("Cannot find module") por paquetes no instalados (`react`, `react-router-dom`, `lucide-react`, `@supabase/supabase-js`), `TS2875`/`TS7026` (JSX/`react/jsx-runtime` no encontrado, por falta de `@types/react`), y `TS7006`/`TS2322` en cascada de esos mismos módulos faltantes (parámetros de callback tipados `any` porque su tipo real vendría de un paquete no resuelto). **Se verificó cruzando contra el resto del repositorio** (`admin-instaladores.tsx`, `header-status.tsx`, `installer-jobs.tsx`, `master-calendar.tsx`, `status-badge.tsx`, todos ya aprobados) que exhiben exactamente el mismo patrón de diagnósticos bajo esta misma invocación — confirma que es un artefacto conocido de este entorno sin `node_modules`, no un error introducido por esta ronda. Ningún diagnóstico de otra categoría (lógica, tipos propios, JSX mal formado) apareció en ninguno de los 19 archivos.
- `package.json` — no se modificó (esta ronda no agrega dependencias nuevas: Radix `dropdown-menu`/`checkbox`/`label`/`dialog` y `lucide-react` ya estaban en `package.json` desde Fase 3).

**Esto no reemplaza las validaciones obligatorias** (`npm run lint`/`typecheck`/`build`/`dev`), que siguen pendientes de confirmarse en el entorno local del usuario.

## 11. Próximos pasos recomendados

1. Decisión del usuario sobre la limitación crítica de RLS (sección 8) — sin ella, el login de `admin`/`coordinador` no puede probarse de punta a punta contra Producción.
2. Pantalla de "definir nueva contraseña" para completar el flujo de recuperación (sección 9).
3. Pantallas reales para "Mi perfil"/"Configuración"/"Cambiar contraseña" (hoy deshabilitadas en `HeaderUserMenu`).
4. Cuando exista una columna `avatar_url` real en alguna de las 3 tablas, `HeaderUserMenu`/`Perfil` ya están preparados para consumirla sin refactor.
5. Reconciliar la documentación legacy de Auth en `ARCHITECTURE.md` (§7.1/§8/§9.4/§9.5, magic link + Edge Function + `usuarios.auth_id`) — atendido parcialmente en esta misma ronda vía una nueva adenda `§14.9` que las marca como superadas (ver `ARCHITECTURE.md`), sin reescribir esas secciones históricas.
