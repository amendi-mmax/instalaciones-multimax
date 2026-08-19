# HANDYMAX — Análisis técnico: módulo "Gestión de usuarios" (Administradores + Coordinadores)

**Tipo de documento**: análisis técnico, sin implementación. Ningún archivo de aplicación, migración ni Edge Function fue modificado para producir este documento — solo lectura de código (`src/`, `supabase/`) ya presente en el repositorio.

**Alcance**: diseñar cómo el Administrador Principal podría gestionar `public.admins` y `public.coordinadores`. El módulo de Instaladores (`public.instaladores`) **no se toca** — se usa únicamente como referencia de patrón ya aprobado.

---

# CIERRE ARQUITECTÓNICO — Gestión de Administradores y Coordinadores

**Estado**: conclusión arquitectónica, aprobada como base de decisión. **No implementado.** Ningún archivo de aplicación, migración, RLS o Edge Function fue modificado para producir esta sección — es análisis puro sobre el modelo real ya verificado en el resto de este documento (ver "Anexo — Análisis original" más abajo).

Esta sección es la versión definitiva a partir de la cual se autorizará el Sprint A. Donde esta sección y el análisis original (ahora Anexo) difieran, **esta sección prevalece**.

## C1. Decisión sobre `es_principal`

**Veredicto: aprobable.** Es la solución correcta para el modelo actual — es un flag de negocio adicional sobre una fila ya existente de `public.admins`, no introduce ninguna tabla nueva, ningún `auth_id`, ningún modelo paralelo de roles. Respeta el patrón ya establecido en el proyecto de que cada tabla de negocio se autoescopa por su propia columna `empresa_id` (igual que `instaladores`, `coordinadores`, `tiendas`, `empresas_instaladoras`).

**Diseño recomendado**: columna en `admins`, no en `empresas`. Se descartó explícitamente la alternativa `empresas.admin_principal_id uuid references admins(id)` porque: (a) obligaría a tocar `empresas`, tabla de datos maestros que el brief pide no modificar/eliminar — agregar una columna no es destructivo, pero sí amplía innecesariamente el alcance; (b) crearía una referencia bidireccional (`admins.empresa_id` ↔ `empresas.admin_principal_id`) con riesgo real de quedar desincronizada; (c) rompe el patrón ya consistente del proyecto de autoescopar cada tabla hija por su propia `empresa_id`, sin que la tabla padre necesite saber nada de sus hijos.

### Cambio de schema

```sql
alter table public.admins
  add column es_principal boolean not null default false;
```

### Default recomendado

`false`. Nunca `true` por defecto — ningún `INSERT` (ni manual, ni vía `admin-operations`) debe crear un admin como principal salvo el caso explícito de bootstrap de una empresa nueva, que hoy ya se hace manualmente en Supabase (igual que se creó el primer Administrador Principal real, según el propio contexto del brief: "fue creado inicialmente de forma manual en Supabase porque era el usuario bootstrap del sistema"). `invite_admin` (Edge Function) **siempre** debe insertar `es_principal: false` — no puede haber otro caso: para que `invite_admin` sea invocable, `verifyCaller()` ya exige que el caller sea un admin real de esa empresa, es decir, la empresa ya tiene al menos un Principal antes de que exista la posibilidad de invitar a nadie más. El caso "primer admin de una empresa nueva" queda, como hoy, fuera del flujo de `admin-operations` (creación manual/bootstrap), sin necesitar ningún cambio.

**Backfill de datos existentes** (obligatorio, parte de la misma migración, NO delegable a "se decide después"): al agregar la columna con default `false`, todo admin existente queda como secundario — ninguna empresa tendría Principal tras aplicar la migración tal cual, violando la regla de negocio desde el primer segundo. La migración debe incluir un `UPDATE` que marque exactamente un admin como `es_principal = true` por cada `empresa_id` existente. **Decisión pendiente de confirmación del usuario, no asumida aquí**: qué criterio usar para elegir cuál admin existente es "el Principal" cuando hay más de uno por empresa (recomendación: el de `created_at` más antiguo, por ser definicionalmente el usuario bootstrap) — dado que hoy en Producción existe una sola empresa (Multimax), este backfill debe validarse contra los datos reales vía MCP (`SELECT id, nombre, email, created_at FROM admins ORDER BY created_at`) antes de escribir el `UPDATE` final, en el Sprint que aplique esta migración — no se ejecuta esa consulta en este documento por ser un paso de implementación, no de análisis.

### Constraint / índice recomendado

```sql
create unique index uq_admins_un_principal_por_empresa
  on public.admins (empresa_id)
  where es_principal = true;
```

Índice único parcial: garantiza que **nunca puede haber dos filas con `es_principal = true` en la misma `empresa_id`** — cualquier `INSERT`/`UPDATE` que lo intente falla con `23505` a nivel de base de datos, sin depender de ningún chequeo de aplicación. Esto cubre la mitad "a lo sumo uno" de la regla ("no debe ser posible tener dos administradores principales"). La otra mitad ("no debe ser posible quedarse sin ninguno") no es expresable con un `UNIQUE INDEX` — requiere el trigger de C3.

### Impacto sobre RLS

Ninguno estructural. `es_principal` es una columna más dentro de las mismas filas que ya cubren las policies de SELECT (propia fila + la nueva policy "misma empresa" de C7) — `select('*')` ya la trae sin cambios de policy. Ninguna policy de `UPDATE` existe hoy para `authenticated` sobre `admins` (todo el control de escritura sigue exclusivamente vía `service_role`/Edge Function) — esto no cambia: ningún usuario autenticado puede modificar `es_principal` directamente por RLS, tampoco antes ni después de este cambio.

### Impacto sobre `admin-operations`

- `AdminRow` (interfaz interna de `verifyCaller()`) debe ampliarse a `{ id, empresa_id, es_principal }` — un solo campo más en el `select('id, empresa_id, es_principal')` ya existente.
- Nuevas acciones que dependen de este campo para autorizar (ver C6): `invite_admin`, `set_admin_activo` deben verificar `caller.es_principal === true` antes de ejecutar — devolviendo `403` traducible ("Solo el Administrador Principal puede...") si no lo es.
- `set_admin_activo` (y cualquier futura acción que pudiera tocar `es_principal`/eliminar la fila) debe, además de su propio chequeo, confiar en que el trigger de C3 es la barrera final — "confiar pero verificar", mismo criterio ya aplicado en `setSuspendido()` hoy.

### Impacto sobre AuthContext (real: `AuthProvider`/`profile.service.ts`)

`profile.service.ts`, rama `admins` (líneas ~95-123 del archivo real), debe incluir `esPrincipal: row.es_principal` al construir el `Perfil`. Ningún otro cambio: `AuthProvider`/`SessionProvider`/`ProtectedRoute` no necesitan saber nada de `es_principal` — es un dato de negocio expuesto en `Perfil`, no una decisión de sesión/autenticación.

### Impacto sobre TypeScript types

- `src/types/database.generated.ts`: se regenera automáticamente (`supabase gen types typescript --linked --schema public`) tras aplicar la migración — `TableRow<'admins'>` incluye `es_principal: boolean` sin edición manual.
- `src/types/perfil.ts`: agregar `esPrincipal: boolean | null` a la interfaz `Perfil` (`null` para `coordinador`/`instalador`, mismo criterio ya usado para campos que solo aplican a un rol — p. ej. `documentosOk`).
- `src/types/admin-operations.ts`: ningún campo de payload nuevo relacionado a `es_principal` — nunca se envía desde el frontend (se decide server-side, ver arriba); si en el futuro se agrega una acción "transferir Principal" (fuera de alcance de este cierre, ver nota en C6), ahí sí tendría su propio payload.

### Impacto sobre el módulo de "Gestión de usuarios"

- El listado de Administradores debe mostrar un badge "Principal"/"Secundario" (`Badge` ya existente, mismo patrón que estados de instaladores).
- El formulario de invitar administrador **no expone** `es_principal` como campo editable — siempre se crea como secundario (ver default arriba).
- Los botones "Invitar administrador"/"Desactivar administrador" deben ocultarse o deshabilitarse en la UI cuando `profile.esPrincipal !== true` — **esto es solo UX**, la protección real vive en el servidor (Edge Function + trigger), nunca solo en el botón deshabilitado (ver C3).

## C2. Matriz de permisos — **DEFINITIVA, aprobada**

> Actualizado tras la ronda de ajuste "AJUSTE Y CONFIRMACIÓN DE MATRIZ DE PERMISOS — ADMINISTRADORES". Esta versión reemplaza la propuesta inicial de C2 (que restringía "Invitar/Desactivar coordinador" y "Gestionar instaladores/empresas/Calendario maestro" — en realidad esas nunca estuvieron restringidas, la propuesta inicial ya las dejaba en Sí/Sí; lo que cambia acá es que queda **explícitamente cerrado y aprobado**, sin margen de interpretación, y se agregan 2 filas nuevas: "Modificar Principal" y "Transferir Principal").

**Regla de fondo, ahora aprobada de forma explícita**: Administrador Principal y Administradores Secundarios tienen **las mismas capacidades operativas** en HANDYMAX. La **única** diferencia de autorización entre ambos es la **administración de cuentas de administradores** — no se construye ningún sistema granular de permisos más allá de eso (decisión explícita del usuario, punto 8 del ajuste: "No crear un sistema granular de permisos para diferenciar las operaciones normales entre Principal y Secundario").

| Acción | Admin Principal | Admin Secundario | Coordinador | Instalador |
|---|---|---|---|---|
| Gestión operativa general | ✅ | ✅ | No | No |
| Trabajos | ✅ | ✅ | No | No |
| Calendario maestro | ✅ | ✅ | No | No |
| Instaladores | ✅ | ✅ | No | No |
| Coordinadores (ver/gestionar) | ✅ | ✅ | No | No |
| Invitar coordinadores | ✅ | ✅ | No | No |
| Activar/desactivar coordinadores | ✅ | ✅ | No | No |
| Empresas | ✅ | ✅ | No | No |
| Ver administradores | ✅ | ✅ | No | No |
| Invitar administradores | ✅ | ❌ | No | No |
| Activar/desactivar administradores (secundarios) | ✅ | ❌ | No | No |
| Modificar otros administradores | ✅ | ❌ | No | No |
| Modificar/desactivar al Administrador Principal | ❌ | ❌ | No | No |
| Transferir el rol de Principal | ❌ (no implementado en este MVP) | ❌ | No | No |

**Notas sobre las 2 filas nuevas** (no estaban en la propuesta original de C2):

- **"Modificar/desactivar al Administrador Principal" → ❌ para ambos, incluido el propio Principal**: dado que por diseño existe como máximo un `es_principal = true` por `empresa_id` (índice único parcial, C1/§0011), el objetivo de cualquier intento de `set_admin_activo`/similar contra el Principal **siempre** coincide con "el único Principal activo de esta empresa" — por lo tanto el trigger `proteger_ultimo_admin_principal` (C3/§0012, ya aprobado y sin cambios) lo bloquea **en el 100% de los casos**, no como un caso límite ocasional. No hace falta ningún mecanismo nuevo: esta fila es una consecuencia directa de una protección ya aprobada, documentada acá de forma explícita para que quede clara en la matriz. El pre-chequeo de `admin-operations` (C3, punto 3) debe, además, rechazar explícitamente cualquier intento de invocar `set_admin_activo` con un `admin_id` cuyo `es_principal = true`, devolviendo un mensaje claro ("No es posible modificar al Administrador Principal") antes de siquiera intentar el `UPDATE` — mejora de UX sobre la misma regla, no una segunda fuente de verdad.
- **"Transferir el rol de Principal" → ❌, fuera de alcance de este MVP** (punto 7 del ajuste, ya lo anticipaba la nota de C1/C8 sobre una futura acción "transferir Principal" fuera de alcance). No existe ningún flujo (ni Edge Function action, ni UI) para mover `es_principal` de un admin a otro — la única forma de cambiar quién es el Principal de una empresa sigue siendo manual, vía Supabase, exactamente igual que la creación del primer Administrador Principal.

**Justificación de las filas ya aprobadas antes de este ajuste** (sin cambios respecto a la versión original de C2):

- **Coordinador/Instalador → No en todo**: ya garantizado hoy, sin cambios — `verifyCaller()` rechaza con `403` a cualquier `auth.uid()` sin fila en `public.admins`; ninguna policy de RLS permite a `coordinador`/`instalador` leer `admins`/`coordinadores`.
- **"Ver administradores" → Sí/Sí**: se resuelve enteramente con la policy RLS de C7 (acotada por `empresa_id`, sin distinguir `es_principal`) — no requiere ninguna lógica adicional en `admin-operations`.
- **"Invitar administrador"/"Activar-desactivar administrador (secundario)"/"Modificar otros administradores" → Solo Principal**: son las únicas operaciones que alteran quién más tiene control administrativo total del sistema.
- **Todo lo demás (coordinadores, instaladores, empresas, calendario, trabajos) → Sí para ambos tipos de admin**: mismo nivel de autoridad operativa, sin distinción — es el comportamiento ya existente hoy (`verifyCaller()` nunca distinguió nada dentro de `admins` para estas acciones) y ahora queda además explícitamente aprobado como decisión de producto, no solo como "lo que ya hacía el código".

**Aislamiento por `empresa_id`** (punto 9 del ajuste, ya cubierto por el diseño existente, reafirmado explícitamente): todas las acciones de la tabla de arriba están además acotadas a `caller.empresa_id` — un admin (Principal o Secundario) nunca opera sobre recursos de otra empresa, sin excepción. Esto ya es el criterio de `setSuspendido()` hoy y se mantiene idéntico para todas las acciones nuevas.

**Aplicación server-side, no solo UI** (punto 10 del ajuste, ya era el criterio de diseño de C3/C6/C7, reafirmado explícitamente): toda restricción de esta matriz se implementa en `admin-operations` (gate por `caller.es_principal`) y/o en el trigger de base de datos (C3) — nunca únicamente ocultando/deshabilitando un botón en React. La UI oculta/deshabilita botones solo como mejora de experiencia, nunca como el mecanismo de protección real.

Matriz **aprobada, definitiva** — no requiere una ronda adicional de confirmación antes de Sprint B.

## C3. Regla del último Administrador Principal

**Regla**: nunca debe existir una `empresa_id` sin al menos un `admins` con `es_principal = true AND activo = true`.

**Mecanismo recomendado: combinación, no uno solo** — exactamente como el brief anticipa:

1. **Índice único parcial** (ya definido en C1) — cubre "nunca dos Principales para la misma empresa". No cubre "nunca cero".
2. **Trigger `BEFORE UPDATE OR DELETE` sobre `public.admins`** (obligatorio, es la única pieza que puede garantizar "nunca cero" a nivel de base de datos, porque esa es una invariante multi-fila que ningún `CHECK`/índice de una sola fila puede expresar):

```sql
create or replace function public.proteger_ultimo_admin_principal()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Solo interesa cuando la fila afectada ERA el Principal activo.
  if (tg_op = 'DELETE' and old.es_principal and old.activo)
     or (tg_op = 'UPDATE' and old.es_principal and old.activo
         and (new.es_principal is distinct from true or new.activo is distinct from true)) then

    if not exists (
      select 1 from public.admins a
      where a.empresa_id = old.empresa_id
        and a.id <> old.id
        and a.es_principal = true
        and a.activo = true
    ) then
      raise exception
        'No es posible eliminar/desactivar/despromover al único Administrador Principal activo de esta empresa.'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_proteger_ultimo_admin_principal
  before update or delete on public.admins
  for each row
  execute function public.proteger_ultimo_admin_principal();
```

   Esta única función cubre, en un solo lugar, **todos** los caminos de pérdida listados en el brief:
   - `DELETE` directo sobre la fila.
   - `UPDATE activo = false` (desactivación).
   - `UPDATE es_principal = false` (despromoción sin promover a otro antes, en la misma transacción).
   - **Eliminación del Auth User** (`auth.admin.deleteUser()`): `admins.id references auth.users(id) on delete cascade` — el `DELETE` en cascada que Postgres ejecuta sobre `admins` cuando se borra la fila de `auth.users` **sí dispara este mismo trigger** (los triggers `BEFORE DELETE` se ejecutan también para deletes en cascada), así que si la fila es el único Principal activo, el trigger aborta la transacción completa — y por lo tanto también falla, de forma atómica, el `deleteUser()` en Auth. No queda ni la fila de `admins` borrada a medias ni el usuario de Auth borrado con la empresa huérfana.
   - "Suspensión" no aplica como caso adicional: `admins` no tiene columna `suspendido` (ver C8) — "desactivación" (`activo=false`) es el único estado degradado real que existe hoy para un admin, y ya está cubierto arriba.

   El trigger corre **incluso para escrituras hechas con `service_role`** (los triggers no distinguyen rol de base de datos, a diferencia de RLS) — protege tanto a un intento accidental desde `admin-operations` como a cualquier operación manual futura vía SQL Editor/otro cliente, que es exactamente el requisito del brief ("del lado servidor/base de datos, no solo botones deshabilitados en React").

3. **Pre-chequeo en `admin-operations` (`set_admin_activo`)** — recomendado, no obligatorio (el trigger ya es la garantía real): antes de intentar el `UPDATE`, hacer el mismo `COUNT` y devolver un `400`/`409` con mensaje traducido ("No podés desactivar al único Administrador Principal activo") en vez de dejar que el error crudo del trigger (un `raise exception` de Postgres) llegue sin traducir al frontend. Es una mejora de UX sobre la misma regla, no una segunda fuente de verdad independiente.

**No se necesita ningún RPC nuevo** para esta protección — el trigger es automático, no requiere que nadie lo invoque explícitamente. Un RPC de solo lectura (`hay_mas_de_un_admin_activo(empresa_id)`) podría agregarse más adelante como optimización de UX (para deshabilitar el botón sin esperar el error del servidor), pero no es necesario para que la regla de negocio quede protegida — se puede posponer sin riesgo.

## C4. Flujo definitivo de invitación

```
Administrador (Principal, para invite_admin — o cualquier admin, para invite_coordinador)
        ↓  (JWT de sesión, adjuntado automáticamente por supabase.functions.invoke)
HANDYMAX (frontend) → admin-operations.service.ts → functions.invoke('admin-operations', {action, payload})
        ↓
Edge Function admin-operations
        ↓ verifyCaller(): valida JWT (ANON key, auth.getUser(token)) + confirma fila real en public.admins
        ↓                  (incluye es_principal, para gatear invite_admin/set_admin_activo)
        ↓ (con service_role, recién después de pasar verifyCaller)
        ├─ 1) auth.admin.inviteUserByEmail(email, { data, redirectTo: `${APP_URL}/nueva-contrasena` })
        │       → obtiene el auth.users.id REAL (newUserId)
        ↓
        ├─ 2) INSERT en public.admins (id = newUserId, es_principal:false) / public.coordinadores (id = newUserId, tienda_id validado)
        │       → si falla: auth.admin.deleteUser(newUserId) (rollback) — ver C5
        ↓
correo de invitación real (Supabase Auth), con enlace a /nueva-contrasena?...type=invite...
        ↓
Usuario abre el enlace → detectSessionInUrl crea sesión real desde el enlace
        ↓
/nueva-contrasena (SetPasswordPage, YA EXISTE, sin cambios) → isRecoveryLink()=false → "Creá tu contraseña"
        ↓
updatePassword(password) → sesión válida se mantiene → navigate('/', replace:true)
        ↓
AuthProvider: session.user.id cambia → resolveProfile() → prueba admins → (match) construye Perfil{ rol:'admin', esPrincipal:false, ... }
        ↓
RootLayout: profile.rol === 'admin' → showAdminPanel → <AdminPanel/> (mismo tab-based de siempre)
```

**Ningún paso de este flujo requiere una ruta nueva ni una pantalla nueva** — es exactamente el mismo flujo, con las mismas piezas, que ya usa `invite_instalador` hoy; la única diferencia real es la tabla destino del `INSERT` (paso 2) y el valor de `rol`/`es_principal` en los metadatos.

## C5. Manejo de fallos parciales

**`auth.users` sin perfil correspondiente** (invitación de Auth exitosa, `INSERT` en `admins`/`coordinadores` falla): mismo patrón exacto que `inviteInstalador()` ya implementa — `invite_admin`/`invite_coordinador` deben, ante un `insertError`, llamar `serviceRoleClient.auth.admin.deleteUser(newUserId)` y reportar en la respuesta tanto el error original como si el rollback tuvo éxito (`rollback: 'revertida correctamente' | 'requiere limpieza manual...'`). Sin este paso, un fallo de `INSERT` (p. ej. `tienda_id` inválido, violación de la policy de `es_principal`, error de red) dejaría un usuario de Auth activo sin ningún perfil de negocio — capaz de autenticarse pero sin que `resolveProfile()` encuentre ninguna fila, cayendo en el camino ya existente de `RootLayout` ("perfil no encontrado" → cierra sesión y redirige a `/login`) — no es un crash, pero es una cuenta huérfana que debería limpiarse.

**`public.admins`/`coordinadores` sin usuario Auth correspondiente**: estructuralmente casi imposible en el flujo normal, porque la fila siempre se crea usando el `id` real devuelto por una invitación de Auth ya exitosa (nunca se genera un `id` de antemano). El único camino real hacia este estado inverso es el borrado del lado de Auth después de que la fila ya existe — cubierto por el `ON DELETE CASCADE` existente (borrar el `auth.users` borra automáticamente la fila de `admins`/`coordinadores` en la misma transacción) y, para el caso del último Principal, bloqueado enteramente por el trigger de C3 (la transacción completa falla, ninguna de las dos tablas queda huérfana).

**Fallos de red/timeout durante la invitación** (el cliente no sabe si el paso 1 llegó a completarse): mismo riesgo estructural que ya existe hoy para `invite_instalador`, sin agravarse por este cierre. Reintentar con el mismo email es seguro: si la primera invitación sí se completó, Supabase Auth rechaza el segundo intento ("ya registrado"), traducido por `translateSupabaseErrorMessage()` — el admin ve un error claro en vez de una duplicación silenciosa, y puede verificar el roster (`Ver administradores`/`Ver coordinadores`) para confirmar el estado real antes de reintentar.

**Evitar duplicados**: no requiere una validación adicional contra `admins`/`coordinadores` — el rechazo de email duplicado de Supabase Auth ya lo cubre en el 100% de los casos posibles bajo este flujo (todo `id` de estas tablas proviene siempre de un `auth.users.id` real y único).

## C6. Actions definitivas de `admin-operations`

Se mantiene la convención de nombres ya existente (`snake_case`, como `invite_instalador`/`suspend_instalador`) — **no** `invite-admin` en kebab-case como aparece literalmente en el brief, para no introducir una segunda convención en el mismo `switch`.

| Action | Payload | Gate (`verifyCaller` + extra) | Comportamiento |
|---|---|---|---|
| `invite_admin` | `{ nombre, email, telefono? }` | `caller.es_principal === true` (403 si no) | Igual a `inviteInstalador()`: Auth invite → `INSERT admins` (`es_principal:false` siempre, `activo:true` siempre — aprobado, ver C8 —, `empresa_id: caller.empresa_id`) → rollback si falla. |
| `invite_coordinador` | `{ nombre, email, tienda_id }` | Cualquier admin real | Igual patrón; valida server-side que `tienda_id` pertenece a `caller.empresa_id` antes de invitar (`404`/`403` si no); `INSERT coordinadores` con `rol:'coordinador'` (default, no editable desde el payload — ver riesgo de confundir con el sub-flag interno de `coordinadores.rol`, Anexo §13) y `activo:true` (aprobado, ver C8). |
| `set_admin_activo` | `{ admin_id, activo: boolean }` | `caller.es_principal === true` (403 si no) | Valida `empresa_id` igual (`existing.empresa_id !== caller.empresa_id` → 403, mismo criterio que `setSuspendido()`); **rechaza explícitamente si `existing.es_principal === true`** ("No es posible modificar al Administrador Principal" — matriz C2, fila "Modificar/desactivar al Administrador Principal") antes de cualquier otro chequeo; pre-chequeo de "último Principal" (C3, punto 3) como defensa adicional; el trigger de C3 es la garantía final en cualquier caso. |
| `set_coordinador_activo` | `{ coordinador_id, activo: boolean }` | Cualquier admin real | Mismo patrón que `set_admin_activo`, sin el chequeo de "último Principal" (no aplica a coordinadores). |

Notas sobre el naming del brief (`suspend-admin`/`reactivate-admin`/`suspend-coordinator`/`reactivate-coordinator`): se consolidan en una sola acción por entidad (`set_admin_activo`/`set_coordinador_activo`, booleano `activo`), no en 4 acciones separadas — porque, a diferencia de `instaladores` (que tiene **dos** columnas independientes, `activo` y `suspendido`), ni `admins` ni `coordinadores` tienen columna `suspendido` (ver C8) — "suspender" y "reactivar" son, en el schema real, exactamente la misma operación que "desactivar"/"activar". Mantener 4 acciones separadas describiría un estado que la base de datos no tiene.

Ninguna acción nueva requiere una Edge Function distinta — todas se agregan como `case` nuevos al mismo `switch` de `admin-operations/index.ts`, tal como el propio archivo ya anticipa.

## C7. RLS necesarias

Confirmado (Sprint 8.4.1, MCP): hoy `admins` y `coordinadores` tienen exactamente una policy cada una (`SELECT`, `auth.uid() = id` — cada quien lee solo su propia fila). Ninguna permite listar filas de otros usuarios. Se proponen exactamente **2 policies nuevas, ambas `SELECT`, ambas acotadas por `empresa_id`** — no se propone ninguna policy abierta tipo "authenticated users can select all":

```sql
create policy "admins ven administradores de su empresa"
on public.admins for select
using (exists (
  select 1 from public.admins a
  where a.id = auth.uid() and a.empresa_id = admins.empresa_id
));

create policy "admins ven coordinadores de su empresa"
on public.coordinadores for select
using (exists (
  select 1 from public.admins a
  where a.id = auth.uid() and a.empresa_id = coordinadores.empresa_id
));
```

**Cómo se identifica al usuario autenticado como administrador**: exactamente el mismo mecanismo que ya usa el resto del proyecto (`"admins ven instaladores de su empresa"`, `0004`; las 3 policies de `empresas_instaladoras`, `0009`) — un `EXISTS` contra `public.admins` filtrado por `auth.uid() = id`. No se introduce ningún mecanismo de identificación nuevo (no JWT claims custom, no columna de rol adicional) — sigue siendo "¿existe una fila en `admins` para este uid?", igual que `verifyCaller()` en la Edge Function.

Ninguna policy de `INSERT`/`UPDATE`/`DELETE` se otorga a `authenticated` sobre `admins`/`coordinadores` — toda escritura (incluida cualquier cosa que toque `es_principal`) sigue exclusivamente a través de `service_role`/`admin-operations`, sin cambios respecto al modelo actual.

## C8. Cambios de schema (consolidado)

1. **`admins.es_principal boolean not null default false`** (nueva, C1) + `UPDATE` de backfill (un Principal por empresa existente, criterio a confirmar) + índice único parcial (C1).
2. **`GRANT SELECT, INSERT, UPDATE, DELETE ON public.coordinadores TO service_role`** (gap real confirmado — `0003` solo cubre `admins`/`instaladores`; sin este GRANT, `invite_coordinador`/`set_coordinador_activo` fallan con `permission denied for table coordinadores`, igual que ya ocurrió con `admins`/`instaladores` antes del Sprint 6.2).
3. **Trigger `proteger_ultimo_admin_principal()` + `trg_proteger_ultimo_admin_principal`** sobre `public.admins` (C3) — nuevo, sin análogo previo en el proyecto.
4. **2 policies RLS nuevas** (C7) — `admins`/`coordinadores`, ambas `SELECT`, acotadas por `empresa_id`.
5. **Confirmado, NO se agrega en este cierre**: ninguna columna `suspendido` en `admins`/`coordinadores` (ninguna de las dos la tiene hoy — solo `instaladores`); ninguna columna `telefono`/`email` en `coordinadores` (la tabla real no las tiene — ver nota abajo). Si el usuario decide más adelante que hacen falta, son cambios de schema independientes que requieren su propia aprobación explícita, fuera de este cierre.

**Nota sobre datos mínimos de invitación de coordinador** (responde directamente al punto 9 del pedido del usuario): el brief pide confirmar `nombre`, `email`, `teléfono`, `empresa_id`, `tienda_id`, `activo` como datos mínimos. La tabla real `public.coordinadores` **no tiene columnas `email` ni `telefono`** (confirmado, ver Anexo §2/§9) — a diferencia de `admins`/`instaladores`. Por lo tanto:
- `email` sí es un dato necesario para la operación (se usa para `auth.admin.inviteUserByEmail()`), pero **no se guarda** en `coordinadores` — igual que hoy `Perfil.correo` para un coordinador siempre proviene de `authEmail` (la sesión de Auth), nunca de una columna de la tabla (`profile.service.ts`, rama `coordinadores`).
- `telefono` **no tiene dónde guardarse hoy**. Se recomienda **omitirlo del formulario de invitación de coordinador en v1** (no inventar un campo que la base de datos no puede persistir) — si el usuario lo necesita, es una columna nueva a aprobar en un Sprint aparte, no algo que deba agregarse silenciosamente junto con `es_principal`.
- `empresa_id` no viaja en el payload del frontend — se toma de `caller.empresa_id` (mismo criterio que `invite_instalador` hoy, nunca confiar en un `empresa_id` que mande el cliente).
- `activo`: se fuerza server-side (no es un campo del formulario) — recomendación por defecto `true` para admins/coordinadores invitados por un Principal/admin (a diferencia de instaladores, que arrancan `false` porque tienen un paso adicional de verificación de documentos que admins/coordinadores no tienen) — a confirmar explícitamente antes de implementar (ver Anexo §14).
- No se crea ninguna tabla nueva — `tienda_id` se selecciona desde `public.tiendas` ya existente, vía `tiendasRepository.getByEmpresaId(caller.empresa_id)`.

## C9. División final en sprints

1. **Sprint A — Fundamentos de schema (Administradores)**: migración `es_principal` (columna + backfill + índice único parcial) + migración del trigger `proteger_ultimo_admin_principal`. Sin Edge Function ni frontend todavía — validable 100% vía MCP (`INSERT`/`UPDATE`/`DELETE` de prueba contra el trigger).
2. **Sprint B — Administradores (backend)**: extender `admin-operations` con `invite_admin` + `set_admin_activo` (gate `es_principal`, pre-chequeo de C3); migración RLS `"admins ven administradores de su empresa"`; extender tipos (`AdminRow` con `es_principal`, `Perfil.esPrincipal`) y `admin-operations.service.ts`.
3. **Sprint C — Administradores (frontend)**: pestaña "Usuarios" en `AdminPanel`, sub-vista "Administradores" (listar con badge Principal/Secundario, invitar, activar/desactivar condicionado a `profile.esPrincipal`), siguiendo la plantilla de `admin-instaladores.tsx`.
4. **Sprint D — Coordinadores (backend)**: migración `GRANT service_role` sobre `coordinadores`; migración RLS `"admins ven coordinadores de su empresa"`; extender `admin-operations` con `invite_coordinador` (con validación de `tienda_id`) + `set_coordinador_activo`; extender tipos/servicio.
5. **Sprint E — Coordinadores (frontend)**: sub-vista "Coordinadores" en la misma pestaña "Usuarios" (listar con su tienda, invitar con `Select` de tienda, activar/desactivar).
6. **Sprint F (opcional, condicionado a decisión del usuario)**: columnas nuevas si se confirman necesarias (`admins.suspendido` como estado distinto de `activo`; `coordinadores.telefono`/`email`) — cada una requiere su propia aprobación explícita por ser cambio de schema independiente de este cierre.

Cada Sprint cierra con `npm run typecheck`/`npm run build` limpios y actualización de `CHANGELOG.md`/`PROJECT_STATUS.md`/`docs/SPRINTS_INDEX.md`.

---

**No se implementó nada de lo anterior.** Se espera aprobación explícita del usuario antes de iniciar el Sprint A — en particular sobre: el criterio de backfill de `es_principal` (C1), la matriz de permisos propuesta en C2 (especialmente restringir "invitar/desactivar administrador" a solo el Principal), y el valor inicial de `activo` para admins/coordinadores recién invitados (C8).

---

# Anexo — Análisis original

Lo que sigue es el análisis técnico original (arquitectura, tablas, RLS, flujos, riesgos) que sirvió de base para el cierre arquitectónico de arriba. Se conserva íntegro como referencia de contexto — donde haya discrepancia con la sección "CIERRE ARQUITECTÓNICO", esta última es la vigente.

## 1. Arquitectura actual relevante

- **Capas**: `repositories/` (acceso tipado 1:1 a una tabla, sin lógica de negocio) → `services/` (lógica de negocio + `ServiceResult<T>`/`HandymaxServiceError`, `supabase.service.ts`) → hooks/estado local por componente → componentes. Ningún componente llama a Supabase directamente.
- **No existe `pages/admin/` ni `AdminLayout.tsx`**. Confirmado por listado completo de `src/pages/**` y `src/layouts/**`: solo existen `src/pages/auth/`, `src/pages/coordinator/`, `src/pages/account/`, y los layouts `AccountLayout`, `AuthLayout`, `CoordinatorLayout`, `RootLayout`. El panel de Administrador **no está montado por rutas** — es contenido renderizado inline dentro de `RootLayout.tsx` cuando `profile.rol === 'admin'`, mostrando `<AdminPanel/>` (`src/components/shared/admin-panel.tsx`), que a su vez es un **selector de pestañas** (`MxSubtabs`/`MxSubtabButton` + `useState<'dashboard'|'calendario'|'instaladores'|'empresas'>`), no un árbol de rutas.
- **Rutas reales** (`src/routes/AppRouter.tsx`): `/login` (público), `/nueva-contrasena` (standalone, fuera de guards — ver §11), `/` (protegida, monta `RootLayout`, única ruta índice; `/despacho`, `/trabajos`, `/trabajos/:id` cuelgan de ahí y son exclusivas de Coordinador/admin-en-modo-Coordinador), `/perfil`, `/configuracion`, `/cambiar-contrasena` (protegidas, `AccountLayout`). No hay ninguna ruta `/admin/*`.
- **`ProtectedRoute`/`PublicRoute`** (`src/components/auth/`) gatean únicamente por `session` (nivel autenticación), nunca por `profile`/rol. La responsabilidad de "sin perfil → cerrar sesión" es de `RootLayout` (`useEffect`, líneas 656-669), no de los guards.
- **`role-helpers.ts`** (`isAdmin`/`isCoordinator`/`isInstaller`/`getDashboardRoute`) ya existe y es directamente reutilizable; no requiere cambios.
- **TanStack Query**: `QueryClientProvider` está montado en `App.tsx`, pero es el **único** uso real en todo el repositorio (`grep "from '@tanstack/react-query'"` → 1 archivo). Ningún hook usa `useQuery`/`useMutation` — el patrón real y consistente en todo el proyecto es `useState` + `useEffect` + llamada directa a un repositorio/servicio (ver `admin-instaladores.tsx`, `useEmpresasInstaladoras.ts`, etc.). **El brief de este análisis asume un stack (`shadcn/ui`, `React Hook Form + Zod`, hooks de TanStack Query) que no coincide con el código real** — `react-hook-form`/`@hookform/resolvers`/`zod` están instalados pero sin ningún import real en `src/` (confirmado en auditorías previas de este proyecto), y no existe ningún primitivo `shadcn/ui` — el proyecto usa sus propios primitivos (`src/components/ui/*`) sobre Radix. Recomendación: el nuevo módulo debe seguir el patrón real y consistente ya usado 100% del tiempo (formularios nativos controlados + `useState`/`useEffect` + repositorio/servicio), no el que describe el brief — mismo criterio que este proyecto ya aplicó en rondas anteriores (corregir el brief contra el código real en vez de asumirlo).

## 2. Tablas involucradas

| Tabla | Columnas reales relevantes |
|---|---|
| `public.admins` | `id` (PK = `auth.users.id`), `empresa_id`, `nombre`, `activo` (bool, default `true`), `email` (nullable), `telefono` (nullable), `created_at`. **No tiene columna `suspendido`.** |
| `public.coordinadores` | `id` (PK = `auth.users.id`), `empresa_id`, `tienda_id` (**NOT NULL**), `nombre`, `rol` (text, default `'coordinador'`; también puede valer `'admin'` como sub-flag interno — ver §13), `activo` (bool, default `true`), `created_at`. No tiene `email`/`telefono`. |
| `public.tiendas` | `id`, `empresa_id`, `nombre` (UNIQUE), `direccion`, `provincia`, `zona`, `activa`, `created_at`. |
| `public.empresas` | `id`, `nombre`, `slug` (UNIQUE), `color_primario`, `contacto_visible_horas`, `activa`, `created_at`. |
| `public.instaladores` | (sin cambios — referencia de patrón, no se modifica). |

No existe (ni debe crearse) una tabla `usuarios` unificada, ni una columna `auth_id` — el `id` de cada tabla de rol **es** el `auth.users.id` directamente. Esto ya es así hoy y el análisis lo respeta sin proponer ningún cambio a este modelo.

## 3. Relaciones entre tablas

```
auth.users.id ──────┬──► public.admins.id           (PK = FK, 1:1)
                     ├──► public.coordinadores.id    (PK = FK, 1:1)
                     └──► public.instaladores.id     (PK = FK, 1:1, sin cambios)

public.empresas.id ◄── admins.empresa_id
                    ◄── coordinadores.empresa_id
                    ◄── tiendas.empresa_id
                    ◄── instaladores.empresa_id (sin cambios)

public.tiendas.id  ◄── coordinadores.tienda_id  (NOT NULL — todo coordinador pertenece a exactamente una tienda)
```

`profile.service.ts` asume implícitamente que un mismo `auth.users.id` nunca aparece en más de una de las 3 tablas de rol (resuelve `admins → coordinadores → instaladores`, deteniéndose en el primer match) — el nuevo módulo debe preservar esa invariante (ver Caso límite en §14).

## 4. Flujo actual de autenticación

1. `SessionProvider` (`src/providers/SessionProvider.tsx`) se suscribe a `onAuthStateChange` de Supabase y expone `session`/`loading`.
2. `AuthProvider` (`src/providers/AuthProvider.tsx`) observa `session.user.id`; cuando cambia, llama a `resolveProfile(authUserId, authEmail)` (`profile.service.ts`), que consulta `admins.getById` → `coordinadores.getById` → `instaladores.getById` en ese orden, deteniéndose en el primer resultado, y arma un `Perfil` normalizado (`types/perfil.ts`).
3. `ProtectedRoute` bloquea por `session` (no por `profile`). `RootLayout` es quien, si `profile` termina en `null` o `estado === 'suspendido'`, cierra sesión y redirige a `/login`.
4. `RootLayout` deriva `role = profile.rol` y decide qué renderizar (`showCoordinador`/`showInstalador`/`showAdminPanel`) — sin ningún componente de ruta dedicado por rol.

Este flujo **no requiere ningún cambio** para soportar el nuevo módulo: ya resuelve correctamente `admin`/`coordinador` en cuanto exista la fila correspondiente y RLS se lo permita leer (ver §10).

## 5. Flujo actual de invitación de instaladores

Único mecanismo real de invitación en el proyecto, vía la Edge Function `admin-operations` (`supabase/functions/admin-operations/index.ts`, desplegada, `action`-based, diseñada explícitamente como capa reutilizable — su propio encabezado documenta: *"cualquier operación administrativa futura (ej. invitar coordinadores...) se agrega como un case nuevo en el mismo switch, sin crear una Edge Function nueva"*):

1. `verifyCaller()`: valida el JWT del caller contra Supabase Auth (`callerClient.auth.getUser(token)`, con ANON key, nunca con `service_role`), luego confirma que `auth.uid()` tiene fila real en `public.admins` (consultado con `service_role`, salta RLS a propósito) → `403` si no.
2. `inviteInstalador()`: valida `nombre`/`email`; calcula `redirectTo = ${APP_URL}/nueva-contrasena` (si el secret `APP_URL` está configurado); llama `serviceRoleClient.auth.admin.inviteUserByEmail(email, {data, redirectTo})`; con el `id` real devuelto por Auth, hace `INSERT` en `instaladores` usando ese mismo `id`; si el `INSERT` falla, revierte con `auth.admin.deleteUser(newUserId)` para no dejar una cuenta huérfana.
3. `setSuspendido()`: valida que el recurso objetivo pertenezca a la `empresa_id` del admin que llama (defensa adicional, aunque `service_role` ya ignora RLS), luego actualiza `suspendido`.

Frontend: `admin-operations.service.ts` (único punto de invocación), `functions.invoke('admin-operations', {body:{action,payload}})`, con manejo especial de `FunctionsHttpError` (el body de error debe leerse vía `error.context.json()`).

## 6. Cómo reutilizar dicho flujo

**No crear una Edge Function nueva.** Extender `admin-operations/index.ts` con casos nuevos en el mismo `switch`, replicando exactamente el patrón ya usado:

- `invite_admin` → mismo orden que `inviteInstalador()`: 1) `auth.admin.inviteUserByEmail()` con el mismo `redirectTo` a `/nueva-contrasena`; 2) `INSERT` en `admins` usando el `id` devuelto; 3) rollback (`auth.admin.deleteUser`) si el `INSERT` falla.
- `invite_coordinador` → igual, pero además valida server-side que `tienda_id` pertenezca a la `empresa_id` del admin que invita (nunca confiar solo en las opciones del `<select>` del frontend).
- `set_admin_activo` / `set_coordinador_activo` → mismo patrón que `setSuspendido()` (valida pertenencia a la empresa, luego `UPDATE`), más la guardia nueva de "último Administrador Principal" (ver §8/§13, sin analog previo).

`verifyCaller()` **no necesita cambios** — ya gatea correctamente "solo un `admins` real puede invocar cualquier acción de este endpoint", que es exactamente el requisito de seguridad del nuevo módulo también.

## 7. Cambios necesarios en frontend

- **`src/types/admin-operations.ts`**: agregar `InviteAdminPayload`, `InviteCoordinadorPayload`, `SetAdminActivoPayload`, `SetCoordinadorActivoPayload` — espejo exacto del contrato nuevo de la Edge Function, mismo criterio ya documentado en ese archivo.
- **`src/services/admin-operations.service.ts`**: agregar `inviteAdmin`/`inviteCoordinador`/`setAdminActivo`/`setCoordinadorActivo`, extendiendo el union type de `invokeAdminOperation<T>()`. No se crea un servicio nuevo — se reutiliza el mismo archivo (mismo criterio que la propia Edge Function).
- **Lectura (listado)**: usar directamente `adminsRepository.getByEmpresaId(empresaId)` / `coordinadoresRepository.getByEmpresaId(empresaId)` (ambos métodos **ya existen**, sin cambios de código) — condicionado a agregar las policies de RLS de §10. Es el mismo patrón que ya usa `admin-instaladores.tsx` con `instaladoresRepository.getByEmpresaId()`, evitando que cada listado dependa de un round-trip a la Edge Function.
- **Componente nuevo**: una quinta pestaña "Usuarios" en `AdminPanel` (`src/components/shared/admin-panel.tsx`), con dos sub-vistas (Administradores / Coordinadores) construidas siguiendo la forma exacta de `admin-instaladores.tsx` (tabla + formulario de invitación + `Select`/toggle de estado + toasts locales).

## 8. Cambios necesarios en Supabase

1. **Migración — GRANT `service_role` sobre `coordinadores`** (gap real, confirmado): `0003_service_role_grants_admins_instaladores.sql` otorga `SELECT, INSERT, UPDATE, DELETE` a `service_role` solo sobre `admins`/`instaladores`. `coordinadores` **no tiene ningún GRANT a `service_role` hoy** — sin esta migración, `invite_coordinador`/`set_coordinador_activo` fallarían con `permission denied for table coordinadores` exactamente como ya ocurrió y se documentó para `admins`/`instaladores` en el Sprint 6.2. Migración aditiva, mismo patrón exacto que `0003`.
2. **Migración — RLS SELECT nuevas** (ver detalle en §10).
3. **Sin cambios de columnas** en esta fase (ver "último Administrador Principal" y "suspendido" como decisiones pendientes en §13/§14 — no se inventa ninguna columna nueva sin aprobación explícita).

## 9. Edge Functions necesarias

Ninguna nueva. Extender `admin-operations` (ver §6) con 4 acciones nuevas: `invite_admin`, `invite_coordinador`, `set_admin_activo`, `set_coordinador_activo`. El listado no necesita pasar por la Edge Function (ver §7/§10).

## 10. Cambios necesarios en RLS

**Estado actual verificado (MCP, Sprint 8.4.1 — 22 policies reales):**
- `admins`: única policy `"admins pueden leer su perfil"` (SELECT, `auth.uid() = id`) — un admin **solo puede leer su propia fila**, no puede listar otros admins.
- `coordinadores`: única policy `"coordinadores leen su perfil"` (SELECT, `auth.uid() = id`) — mismo caso, ningún admin puede listar coordinadores hoy.
- Ninguna de las dos tablas tiene policy de INSERT/UPDATE/DELETE — toda escritura ocurre exclusivamente vía `service_role` en `admin-operations`.

**Respuesta directa a las preguntas de seguridad del brief:**
| Pregunta | Respuesta actual |
|---|---|
| ¿Quién puede listar administradores? | Nadie vía RLS directo (cada admin solo ve su propia fila). |
| ¿Quién puede crear/invitar administradores? | Nadie — no existe la acción todavía. |
| ¿Quién puede listar coordinadores? | Nadie vía RLS directo. |
| ¿Quién puede crear/invitar coordinadores? | Nadie — no existe la acción todavía. |
| ¿Qué puede hacer hoy un Administrador Principal? | Ver su propia fila en `admins`; gestionar instaladores/empresas instaladoras vía Edge Function + policies ya aprobadas. |
| ¿Qué no debe poder hacer un coordinador? | Ver o modificar `admins`/`coordinadores` de otros usuarios, ni invocar ninguna acción de `admin-operations` (`verifyCaller()` ya lo bloquea con `403`, porque exige fila en `admins`). |

**Cambio propuesto (mínimo, escrito siguiendo el patrón ya aprobado en `instaladores`/`empresas_instaladoras`, no uno nuevo):**

```sql
-- admins: un admin puede ver a los demás admins de SU MISMA empresa (no de otras)
create policy "admins ven administradores de su empresa"
on public.admins for select
using (exists (
  select 1 from public.admins a
  where a.id = auth.uid() and a.empresa_id = admins.empresa_id
));

-- coordinadores: un admin puede ver los coordinadores de SU MISMA empresa
create policy "admins ven coordinadores de su empresa"
on public.coordinadores for select
using (exists (
  select 1 from public.admins a
  where a.id = auth.uid() and a.empresa_id = coordinadores.empresa_id
));
```

Ambas son **SELECT únicamente**, exclusivas de `admins` (nunca `coordinadores`/`instaladores`), acotadas por `empresa_id` — exactamente el mismo molde de `"admins ven instaladores de su empresa"` (`0004`) y de las 3 policies admin-only de `empresas_instaladoras` (`0009`). No se toca ninguna policy existente. No se otorga INSERT/UPDATE/DELETE a `authenticated` sobre ninguna de las dos tablas — esas operaciones siguen exclusivamente en manos de `service_role` vía Edge Function, igual que hoy.

## 11. Nuevas rutas necesarias

**Ninguna.** Esto incluye la pregunta explícita del brief sobre `/auth/callback` / `/aceptar-invitacion` / `/nueva-contrasena`:

- `SetPasswordPage.tsx`, montada en `/nueva-contrasena` (`AppRouter.tsx`), ya es una pantalla **compartida** entre invitación y recuperación de contraseña. Detecta `type=recovery` en la URL (`isRecoveryLink()`); si no lo encuentra, trata el enlace como invitación por diseño ("el default más seguro"). Ya está deliberadamente fuera de `ProtectedRoute` (para poder mostrar "enlace inválido/vencido" sin sesión) y de `PublicRoute` (para no redirigir apenas `detectSessionInUrl` crea la sesión del enlace, antes de que el usuario pueda definir su contraseña).
- El flujo de instalador ya usa exactamente este mecanismo end-to-end: `inviteUserByEmail()` con `redirectTo: ${APP_URL}/nueva-contrasena`. Extender `admin-operations` con `invite_admin`/`invite_coordinador` usando el mismo `redirectTo` reutiliza esta ruta sin ningún cambio de código en `SetPasswordPage.tsx` ni en `AppRouter.tsx`.
- Verificación operativa recomendada (no requiere cambio de código): confirmar, vía MCP o Dashboard, que el secret `APP_URL` de la Edge Function está efectivamente configurado a `https://instalaciones.multimax.net` en Producción — si no lo está, la invitación cae al "Site URL" del Dashboard como fallback (comportamiento documentado, no roto, pero debe confirmarse antes de habilitar invitaciones de admin/coordinador).
- El único elemento de UI nuevo es una pestaña dentro de `AdminPanel` (estado local `tab`), no una ruta — consistente con que ni Instaladores ni Empresas tienen URL propia hoy.

## 12. Componentes que pueden reutilizarse

- `admin-instaladores.tsx` — plantilla estructural directa (tabla + formulario de invitación + `Select` + toggle de estado + toasts locales + `PageContainer`/`PageHead`).
- `Modal`/`ModalOverlay`/`ModalContent`/`ModalHeader`, `SearchBox`, `Select`, `ConfirmDialog` (`src/components/ui/`).
- Patrón de Toast local (`useState<Toast[]>` + `pushToast`/`dismissToast`) — ya repetido en `CoordinatorLayout.tsx`, `admin-empresas-instaladoras.tsx`, `admin-instaladores.tsx`.
- Clases CSS `.mx-admintable`/`.mx-adminrow*`/`.mx-admin-act`, `.mx-invite*` — mismo lenguaje visual, sin CSS nuevo.
- `MxSubtabs`/`MxSubtabButton` — para la pestaña "Usuarios" nueva dentro de `AdminPanel`.
- `role-helpers.ts` (`isAdmin`) y `useOperationalContext()` (para obtener `empresaId` sin repetir lógica).

## 13. Riesgos

1. **`coordinadores` sin GRANT a `service_role`** — bloqueante real si no se aplica la migración de §8 antes de intentar `invite_coordinador`; riesgo bajo (mismo patrón ya resuelto una vez para `admins`/`instaladores`).
2. **"Último Administrador Principal" no tiene ningún analog previo en el código** — debe construirse desde cero dentro de `set_admin_activo` (y opcionalmente dentro de cualquier baja lógica futura): `COUNT(*) FROM admins WHERE empresa_id = admin.empresa_id AND activo = true` antes de permitir desactivar; bloquear si el objetivo es el único activo. Riesgo de implementarlo mal = un admin puede quedar sin ningún admin activo en su empresa (lockout real).
3. **`coordinadores.rol` puede valer `'admin'` como sub-flag interno**, usado en la policy `"coordinadores ven trabajos de su tienda o de su empresa si admi"` sobre `trabajos` — **no relacionado con `public.admins`**. El formulario nuevo de coordinadores no debe exponer este campo como editable en v1 (dejarlo en el default `'coordinador'`), para no confundir "Coordinador con rol interno admin" con "fila real en `public.admins`" — son conceptos distintos y el brief no pide tocar esa policy.
4. **Asimetría de schema `admins` vs `instaladores`**: `admins` no tiene columna `suspendido` (solo `activo`); "suspender" un admin en el sentido de `instaladores` requeriría una migración de columna nueva — cambio de schema que, según `CLAUDE.md`, necesita decisión explícita del usuario antes de proponerse siquiera como migración. Ver §14 para la recomendación de alcance v1.
5. **Desalineación del brief con el stack real** (§1) — construir este módulo con `shadcn/ui`/`React Hook Form`+`Zod`/`useQuery` introduciría el primer patrón inconsistente del proyecto; se recomienda explícitamente no hacerlo.
6. **No afecta datos maestros** (`empresas`/`tiendas`/`instaladores`) — ninguna de las migraciones/acciones propuestas los modifica ni los referencia con escritura.

## 14. Casos límite

- **Email ya registrado con otro rol** (p. ej. ya es instalador): `auth.admin.inviteUserByEmail()` fallará con el mensaje ya traducido por `translateSupabaseErrorMessage()` ("ya registrado") — comportamiento correcto y ya existente, no requiere lógica nueva. `resolveProfile()` asume 1 rol por `id`; no se debe intentar crear una segunda fila de rol para el mismo `id`.
- **Rollback simétrico**: si el `INSERT` en `admins`/`coordinadores` falla tras una invitación de Auth exitosa, aplicar el mismo `auth.admin.deleteUser(newUserId)` que ya usa `inviteInstalador()`.
- **`tienda_id` de un coordinador nuevo debe pertenecer a la misma `empresa_id`** del admin que invita — validar server-side dentro de la Edge Function, no confiar en las opciones que el frontend le muestra al usuario.
- **Alcance de "último Administrador Principal"**: el schema soporta múltiples empresas (`admins.empresa_id`), aunque hoy solo existe una (Multimax). Se recomienda que el conteo sea **por `empresa_id`**, coherente con el resto del código (`setSuspendido()` ya valida por empresa) — esto es una decisión funcional a confirmar explícitamente con el usuario antes de implementar, no algo que deba asumirse.
- **Estado inicial de un admin/coordinador recién invitado**: ¿nace `activo:true` (acceso inmediato tras aceptar) o `activo:false` como hoy hacen los instaladores (requiere activación manual posterior)? El brief no lo especifica — recomendación: `activo:true` por defecto para admins/coordinadores (a diferencia de instaladores, que requieren verificación de documentos — un admin/coordinador invitado por el propio Administrador Principal no tiene ese paso de verificación externo), pero es una decisión funcional que debe confirmarse, no asumirse.
- **Evitar duplicados**: ya cubierto naturalmente por el rechazo de Supabase Auth ante un email repetido — no se necesita una validación adicional contra `admins`/`coordinadores` por separado.

## 15. Propuesta de división en sprints

1. **Sprint A — Administradores (backend)**: migración RLS (`admins ven administradores de su empresa`); extender `admin-operations` con `invite_admin` + `set_admin_activo` (incluye guardia "último Administrador Principal"); extender tipos y `admin-operations.service.ts`. Sin frontend visible todavía — validable vía MCP/logs.
2. **Sprint B — Administradores (frontend)**: pestaña "Usuarios" en `AdminPanel` con sub-vista "Administradores" (listar vía `adminsRepository.getByEmpresaId`, invitar, activar/desactivar), siguiendo la plantilla de `admin-instaladores.tsx`.
3. **Sprint C — Coordinadores (backend)**: migración `GRANT service_role` sobre `coordinadores` (mirror de `0003`); migración RLS (`admins ven coordinadores de su empresa`); extender `admin-operations` con `invite_coordinador` (con validación de `tienda_id`) + `set_coordinador_activo`; extender tipos/servicio.
4. **Sprint D — Coordinadores (frontend)**: sub-vista "Coordinadores" dentro de la misma pestaña "Usuarios" (listar con su tienda, invitar con `Select` de tienda, activar/desactivar).
5. **Sprint E (opcional, condicionado a decisión del usuario)** — únicamente si se decide que los Administradores necesitan un estado "suspendido" real y distinto de "inactivo": migración de columna nueva `admins.suspendido` + ajustes de `profile.service.ts`/UI. Requiere aprobación explícita por ser cambio de schema.

Cada Sprint cierra con `npm run typecheck`/`npm run build` limpios y actualización de `CHANGELOG.md`/`PROJECT_STATUS.md`/`docs/SPRINTS_INDEX.md`, según las reglas permanentes del proyecto.

---

**No se implementó nada de lo anterior.** Este documento queda a la espera de revisión y aprobación antes de iniciar el Sprint A.
