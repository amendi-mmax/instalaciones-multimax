/**
 * admin-operations — Edge Function administrativa reutilizable (Sprint 6.1,
 * primera Edge Function real de este proyecto).
 *
 * ---------------------------------------------------------------------
 * POR QUÉ EXISTE (decisión explícita del usuario, Sprint 6.1)
 * ---------------------------------------------------------------------
 * El módulo "Gestión de Instaladores" necesita invitar usuarios reales vía
 * Supabase Auth (`auth.admin.inviteUserByEmail()`), lo que exige la
 * `service_role key` -- una clave que NUNCA debe llegar al navegador (se
 * salta Row Level Security por completo; ver `src/lib/supabase/server.ts`,
 * que ya documentaba esta restricción desde el Sprint 4.1.1, sin ningún
 * consumidor real hasta ahora). Esta es la primera pieza de código de este
 * proyecto que corre en un contexto de confianza real (Supabase Edge
 * Runtime, Deno) en vez de en el navegador del usuario.
 *
 * En vez de crear una función exclusiva para instaladores, el usuario pidió
 * expresamente una **capa administrativa reutilizable**: un único endpoint
 * (`action`-based) que encapsule TODA operación que requiera `service_role`
 * -- invitar, suspender, reactivar instaladores hoy; cualquier operación
 * administrativa futura (ej. invitar coordinadores, desactivar una tienda)
 * se agrega como un `case` nuevo en el mismo `switch`, sin crear una
 * Edge Function nueva por cada acción.
 *
 * ---------------------------------------------------------------------
 * SEGURIDAD -- el contrato que esta función garantiza
 * ---------------------------------------------------------------------
 * 1. El caller debe enviar un JWT real de Supabase Auth (`Authorization:
 *    Bearer <token>`) -- `supabase.functions.invoke()` ya lo adjunta
 *    automáticamente si hay una sesión activa en el cliente; no hace falta
 *    ningún código nuevo del lado del frontend para esto.
 * 2. Ese JWT se valida contra Supabase Auth (`getUser()`, con la ANON key,
 *    NO con service_role) -- si no es válido, `401`.
 * 3. El `auth.uid()` resultante debe corresponder a una fila real de
 *    `public.admins` (consultada con `service_role`, que se salta RLS a
 *    propósito: es la única forma de confirmarlo sin depender de que
 *    exista una policy de SELECT sobre `admins` para el propio admin) --
 *    si no hay fila, `403`. Ningún otro rol (`coordinador`/`instalador`)
 *    puede invocar ninguna acción de esta función.
 * 4. Recién después de 1-3, se ejecuta la acción pedida con el cliente de
 *    `service_role` -- nunca antes.
 *
 * Sin este archivo, la única alternativa segura sería no ofrecer invitación
 * por correo real en absoluto (Supabase no expone esa operación vía la
 * ANON key bajo ninguna circunstancia) -- no es una decisión de "preferencia
 * arquitectónica", es un requisito de seguridad del propio Supabase.
 *
 * ---------------------------------------------------------------------
 * DEPLOY / VARIABLES DE ENTORNO
 * ---------------------------------------------------------------------
 * Ver `README.md` en esta misma carpeta para el comando de despliegue y el
 * detalle de qué variables inyecta Supabase automáticamente (no hace falta
 * configurar `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`
 * a mano -- Supabase ya las provee dentro del runtime de cualquier Edge
 * Function de este proyecto).
 *
 * ---------------------------------------------------------------------
 * LO QUE ESTE ARCHIVO **NO** HACE (alcance de este Sprint)
 * ---------------------------------------------------------------------
 * No se pudo desplegar ni probar contra Supabase real desde este entorno de
 * trabajo (sin acceso de red -- misma limitación estructural declarada en
 * cada ronda de este proyecto). Este código no pasa por `tsc`/`eslint`/
 * `vite build` (corre en Deno, no en el bundle de Vite) -- su única
 * validación real posible es un despliegue real, que le corresponde hacer
 * al usuario.
 */

// @ts-nocheck -- este archivo corre en Deno (Supabase Edge Runtime), no en
// el proyecto Vite/Node de `src/` -- `tsconfig.app.json` (con `"types": []`
// y sin las declaraciones globales de Deno) marcaría como error real
// `Deno.serve`/`Deno.env`/los imports `npm:`/`jsr:` de abajo, que SÍ son
// válidos en su runtime real. Se documenta explícitamente esta directiva en
// vez de intentar hacer que este archivo type-checkee contra un tsconfig
// que nunca lo va a ejecutar -- evita "arreglar" un falso error agregando
// tipos de Deno al proyecto Vite (lo que sí afectaría al bundle real del
// navegador, algo que este Sprint no autoriza).
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------------------
// Tipos mínimos, autocontenidos -- esta función se despliega de forma
// independiente al bundle de `src/` (Supabase Functions no comparte el
// `tsconfig`/`node_modules` del frontend), así que no importa
// `src/types/database.generated.ts` -- solo declara los pocos campos que
// realmente lee/escribe, igual de tipado que si importara el tipo completo.
// ---------------------------------------------------------------------
interface InviteInstaladorPayload {
  nombre: string;
  email: string;
  telefono?: string | null;
  provincia?: string | null;
  zona?: string | null;
  /**
   * Sprint 8.4 -- `instaladores.empresa_instaladora_id` (migración
   * `0010_instaladores_empresa_instaladora.sql`), FK real a
   * `empresas_instaladoras` (Sprint 8.3). Opcional/`null`: un instalador
   * puede quedar sin empresa asignada ("Pendiente de asignación" en la UI)
   * -- no se valida su existencia acá, la FK real de la base de datos ya
   * lo garantiza (un id inexistente hace fallar el INSERT con `23503`,
   * traducido por `normalizeSupabaseError` del lado del cliente).
   */
  empresa_instaladora_id?: string | null;
}

interface SuspendReactivateInstaladorPayload {
  instalador_id: string;
}

/**
 * Sprint B (Gestión de Administradores y Coordinadores, backend) -- ver
 * ANALISIS_GESTION_USUARIOS.md, sección "CIERRE ARQUITECTÓNICO", C6, para
 * el análisis completo. `empresa_id`/`es_principal`/`activo`/`rol` NUNCA se
 * leen de este payload -- el caller no los controla bajo ninguna
 * circunstancia (matriz de permisos aprobada, C2): un admin invitado por
 * `invite_admin` siempre nace `es_principal:false`, `activo:true`,
 * `empresa_id` = la del caller.
 */
interface InviteAdminPayload {
  nombre: string;
  email: string;
  telefono?: string | null;
}

/** Sprint B -- `set_admin_activo` nunca toca `es_principal`, solo `activo`. */
interface SetAdminActivoPayload {
  admin_id: string;
  activo: boolean;
}

/**
 * Sprint 9.3 (Gestión de Coordinadores) -- ver ANALISIS_GESTION_USUARIOS.md,
 * sección "CIERRE ARQUITECTÓNICO", C6/C9 (Sprint D). `empresa_id`/`rol`/
 * `activo` NUNCA se leen de este payload -- se fuerzan server-side, mismo
 * criterio que `InviteAdminPayload`. `coordinadores` no tiene columna
 * `email`/`telefono` (confirmado contra el schema real) -- `email` solo se
 * usa para `inviteUserByEmail()`, nunca se persiste en la tabla.
 */
interface InviteCoordinadorPayload {
  nombre: string;
  email: string;
  tienda_id: string;
}

/** Sprint 9.3 -- `set_coordinador_activo` solo toca `activo`. */
interface SetCoordinadorActivoPayload {
  coordinador_id: string;
  activo: boolean;
}

/**
 * Sprint 9.3 -- `list_coordinadores` no recibe ningún filtro del caller
 * (`empresa_id` siempre es `admin.empresa_id`, igual que el resto de
 * acciones) -- payload vacío, se declara igual por consistencia con el
 * shape `{ action, payload }` que usan todas las demás acciones.
 */
type ListCoordinadoresPayload = Record<string, never>;

type ActionRequest =
  | { action: 'invite_instalador'; payload: InviteInstaladorPayload }
  | { action: 'suspend_instalador'; payload: SuspendReactivateInstaladorPayload }
  | { action: 'reactivate_instalador'; payload: SuspendReactivateInstaladorPayload }
  | { action: 'invite_admin'; payload: InviteAdminPayload }
  | { action: 'set_admin_activo'; payload: SetAdminActivoPayload }
  | { action: 'invite_coordinador'; payload: InviteCoordinadorPayload }
  | { action: 'set_coordinador_activo'; payload: SetCoordinadorActivoPayload }
  | { action: 'list_coordinadores'; payload: ListCoordinadoresPayload };

/**
 * Sprint B -- se agregan `es_principal`/`activo` (antes solo
 * `id`/`empresa_id`) para poder gatear `invite_admin`/`set_admin_activo`
 * sin una segunda consulta a `admins`: `verifyCaller()` ya lee la fila
 * completa que estas 2 acciones nuevas necesitan.
 */
interface AdminRow {
  id: string;
  empresa_id: string;
  es_principal: boolean;
  activo: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Verifica el JWT del caller (con la ANON key, nunca con service_role) y
 * confirma que corresponde a una fila real de `public.admins` (consultada
 * con `service_role`, que se salta RLS -- ver JSDoc de arriba, punto 3).
 * Devuelve la fila de `admins` (para usar su `empresa_id` como límite de
 * seguridad adicional en cada acción) o `null` si no es un Admin real.
 *
 * ---------------------------------------------------------------------
 * DIAGNÓSTICO — Sprint 6.1 (ronda de diagnóstico del 403 "No autorizado")
 * ---------------------------------------------------------------------
 * CAUSA RAÍZ IDENTIFICADA (sin poder ejecutar/observar logs reales desde
 * este entorno de trabajo, que no tiene acceso de red a Supabase -- esto
 * es una lectura de código, no una confirmación en vivo; el usuario debe
 * redesplegar y confirmar contra los logs reales):
 *
 * La versión anterior de esta función creaba `callerClient` pasando el
 * header `Authorization` vía la opción `global.headers`:
 *
 *   const callerClient = createClient(supabaseUrl, anonKey, {
 *     global: { headers: { Authorization: authHeader } },
 *   });
 *   const { data: { user }, error } = await callerClient.auth.getUser();
 *                                                          ^^^^^^^^^^
 *                                                          (SIN argumento)
 *
 * `global.headers` solo afecta las requests HTTP que el cliente hace hacia
 * PostgREST/Storage/Functions -- el módulo `auth` (GoTrue) de
 * `@supabase/supabase-js` mantiene su PROPIA sesión interna, separada, y
 * `auth.getUser()` **sin argumento** no lee ese header en absoluto: intenta
 * usar la sesión ya establecida en el cliente (vía `persistSession`/
 * `setSession()`), que en un cliente recién creado en cada invocación (como
 * este, dentro de una Edge Function sin estado) siempre está vacía. Esto
 * produce `error: "Auth session missing!"` (o `user: null`), y por lo tanto
 * `verifyCaller()` devuelve `null` → el `403 "No autorizado"` reportado,
 * incluso con el header `Authorization` llegando correctamente (confirmado
 * por el usuario en los logs) y con `public.admins` teniendo la fila
 * correcta.
 *
 * **LÍNEA EXACTA DEL FALLO (versión anterior de este archivo)**: la llamada
 * `await callerClient.auth.getUser();` (sin el JWT como argumento) -- no el
 * header, no la consulta a `admins`, no la creación del cliente.
 *
 * **CORRECCIÓN APLICADA**: extraer el token del header (`authHeader.replace
 * ("Bearer ", "")`) y pasarlo explícitamente a `getUser(token)` -- la firma
 * `getUser(jwt?: string)` de `@supabase/supabase-js` v2 SÍ admite este
 * parámetro opcional (es, de hecho, el patrón oficial documentado por
 * Supabase para validar el JWT de un caller dentro de una Edge Function) --
 * no hizo falta conservar la variante sin argumento como fallback.
 */
async function verifyCaller(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  serviceRoleClient: ReturnType<typeof createClient>,
): Promise<AdminRow | null> {
  console.log('[admin-operations:verifyCaller] inicio');

  const authHeader = req.headers.get('Authorization');
  // No se loguea el header completo (expondría el JWT real en los logs de
  // Supabase, legibles por cualquiera con acceso al Dashboard/CLI del
  // proyecto) -- se logea únicamente si llegó y su longitud, suficiente
  // para confirmar "sí llegó, tiene la forma esperada" sin exponer el
  // secreto completo.
  console.log(
    '[admin-operations:verifyCaller] Authorization header recibido:',
    authHeader ? `sí (longitud ${authHeader.length}, prefijo "${authHeader.slice(0, 15)}...")` : 'NO llegó ningún header',
  );

  if (!authHeader) {
    console.log('[admin-operations:verifyCaller] retorno final: null (sin Authorization header)');
    return null;
  }

  // Token crudo, sin el prefijo "Bearer " -- ver DIAGNÓSTICO arriba: hace
  // falta pasarlo explícitamente a `getUser(token)`, `global.headers` no
  // alimenta al módulo `auth` de este cliente.
  const token = authHeader.replace('Bearer ', '');

  // Cliente efímero con la ANON key. `global.headers` se conserva (mismo
  // criterio de "doble cliente" de siempre: este cliente nunca debe usarse
  // para leer/escribir ninguna tabla, solo para `auth.getUser()`) aunque ya
  // no sea estrictamente necesario para la llamada de abajo -- no se quita,
  // por si algún código futuro dentro de este mismo cliente sí dependiera
  // de ese header para otra request HTTP (ninguno lo hace hoy).
  console.log('[admin-operations:verifyCaller] creando callerClient (ANON key)');
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // CORRECCIÓN (ver DIAGNÓSTICO arriba): `getUser(token)`, con el JWT
  // explícito -- no `getUser()` sin argumento.
  const {
    data: { user },
    error: authError,
  } = await callerClient.auth.getUser(token);

  console.log(
    '[admin-operations:verifyCaller] resultado de auth.getUser(token):',
    'user =', user ? `{ id: ${user.id} }` : 'null',
    '| authError =', authError ? authError.message : 'null',
  );

  if (authError || !user) {
    console.log('[admin-operations:verifyCaller] retorno final: null (JWT inválido o sin user)');
    return null;
  }

  console.log('[admin-operations:verifyCaller] consultando public.admins para id =', user.id);
  const { data: adminRow, error: adminError } = await serviceRoleClient
    .from('admins')
    .select('id, empresa_id, es_principal, activo')
    .eq('id', user.id)
    .maybeSingle();

  console.log(
    '[admin-operations:verifyCaller] resultado de la consulta a admins:',
    'adminRow =', adminRow ? JSON.stringify(adminRow) : 'null',
    '| adminError =', adminError ? adminError.message : 'null',
  );

  if (adminError || !adminRow) {
    console.log('[admin-operations:verifyCaller] retorno final: null (sin fila real en admins)');
    return null;
  }

  console.log('[admin-operations:verifyCaller] retorno final: AdminRow real', JSON.stringify(adminRow));
  return adminRow as AdminRow;
}

/**
 * `invite_instalador` — ver flujo corregido completo en
 * `SPRINT_6_1_INSTALADORES_SCHEMA_AUDIT_REPORT.md` §5. Orden real (no el
 * del brief original, invertido por una FK real, no por preferencia):
 * 1) invitar vía Supabase Auth (obtiene el `auth.users.id` real):
 * 2) crear la fila de `instaladores` con ESE `id`.
 * Si el paso 2 falla, se intenta revertir el paso 1 (borrar el usuario de
 * Auth recién creado) para no dejar una cuenta fantasma sin perfil.
 *
 * Sprint 8.4 -- agrega `empresa_instaladora_id` al INSERT (ver JSDoc de
 * `InviteInstaladorPayload`). Sin ningún otro cambio de flujo/orden.
 */
async function inviteInstalador(
  serviceRoleClient: ReturnType<typeof createClient>,
  admin: AdminRow,
  payload: InviteInstaladorPayload,
): Promise<Response> {
  const nombre = payload.nombre?.trim();
  const email = payload.email?.trim();

  if (!nombre) {
    return jsonResponse({ ok: false, error: { message: 'El nombre es obligatorio.' } }, 400);
  }
  if (!email) {
    return jsonResponse({ ok: false, error: { message: 'El correo es obligatorio.' } }, 400);
  }

  // Regla arquitectónica permanente (ver ARCHITECTURE.md §14.10/CLAUDE.md):
  // ningún flujo de Auth depende exclusivamente del "Site URL" del
  // Dashboard -- `redirectTo` explícito, apuntando a `/nueva-contrasena`
  // (`SetPasswordPage`, ya soporta `type=invite`). Esta función no tiene
  // acceso a `window.location.origin` (corre en Deno, no en el navegador)
  // -- se lee de `APP_URL`, un Secret nuevo, mismo mecanismo ya documentado
  // en README.md §2 ("supabase secrets set NOMBRE_VARIABLE=valor") para
  // cualquier variable adicional a las 3 que Supabase inyecta solo. Si
  // `APP_URL` todavía no está configurado, se omite `redirectTo` por
  // completo -- mismo comportamiento exacto que antes de este cambio
  // (depende del Site URL del Dashboard), en vez de fallar la invitación.
  const appUrl = Deno.env.get('APP_URL');
  const inviteOptions: { data: Record<string, string>; redirectTo?: string } = {
    data: { nombre, rol: 'instalador' },
  };
  if (appUrl) {
    inviteOptions.redirectTo = `${appUrl.replace(/\/$/, '')}/nueva-contrasena`;
  }

  const { data: inviteData, error: inviteError } =
    await serviceRoleClient.auth.admin.inviteUserByEmail(email, inviteOptions);

  if (inviteError || !inviteData?.user) {
    return jsonResponse(
      { ok: false, error: { message: inviteError?.message ?? 'No se pudo enviar la invitación.' } },
      502,
    );
  }

  const newUserId = inviteData.user.id;

  // `activo`/`documentos_ok` se fuerzan explícitamente a `false` -- el
  // default real de la columna en `instaladores` es `true` para ambas
  // (ver auditoría de esquema, sección 2 del reporte), pero un instalador
  // recién invitado no debe contar como "Activo" ni con documentos
  // confirmados hasta que complete su perfil. `suspendido: false` coincide
  // con el default, se declara igual por explicitud.
  const { data: instaladorRow, error: insertError } = await serviceRoleClient
    .from('instaladores')
    .insert({
      id: newUserId,
      empresa_id: admin.empresa_id,
      empresa_instaladora_id: payload.empresa_instaladora_id ?? null,
      nombre,
      email,
      telefono: payload.telefono ?? null,
      provincia: payload.provincia ?? null,
      zona: payload.zona ?? null,
      activo: false,
      suspendido: false,
      documentos_ok: false,
    })
    .select()
    .single();

  if (insertError) {
    // Compensación: el usuario de Auth ya existe pero su perfil no se pudo
    // crear -- se intenta borrar para no dejar una cuenta fantasma. Si el
    // borrado también falla, se reporta igual el error original del
    // INSERT (el problema real que el Admin necesita ver), agregando una
    // nota de que además puede haber quedado un usuario de Auth huérfano
    // que requiere limpieza manual en el Dashboard.
    const { error: rollbackError } = await serviceRoleClient.auth.admin.deleteUser(newUserId);

    return jsonResponse(
      {
        ok: false,
        error: {
          message: insertError.message,
          rollback: rollbackError
            ? `Además, no se pudo revertir la invitación de Auth (usuario ${newUserId} puede haber quedado huérfano -- requiere limpieza manual en el Dashboard).`
            : 'La invitación de Auth fue revertida correctamente.',
        },
      },
      500,
    );
  }

  return jsonResponse({ ok: true, data: instaladorRow }, 200);
}

/**
 * `suspend_instalador`/`reactivate_instalador` — comparten la misma
 * validación (el instalador debe pertenecer a la empresa del Admin que
 * invoca, verificado explícitamente aquí como defensa adicional aunque
 * `service_role` ya se salta RLS -- "confiar pero verificar", mismo
 * criterio ya usado en otros repositorios de este proyecto).
 */
async function setSuspendido(
  serviceRoleClient: ReturnType<typeof createClient>,
  admin: AdminRow,
  payload: SuspendReactivateInstaladorPayload,
  suspendido: boolean,
): Promise<Response> {
  const instaladorId = payload.instalador_id;
  if (!instaladorId) {
    return jsonResponse({ ok: false, error: { message: 'instalador_id es obligatorio.' } }, 400);
  }

  const { data: existing, error: fetchError } = await serviceRoleClient
    .from('instaladores')
    .select('id, empresa_id')
    .eq('id', instaladorId)
    .maybeSingle();

  if (fetchError || !existing) {
    return jsonResponse({ ok: false, error: { message: 'Instalador no encontrado.' } }, 404);
  }
  if (existing.empresa_id !== admin.empresa_id) {
    // Nunca debería ocurrir hoy (una sola empresa real, Multimax) -- se
    // valida igual, sin asumir, para cuando exista más de una empresa.
    return jsonResponse(
      { ok: false, error: { message: 'Este instalador no pertenece a tu empresa.' } },
      403,
    );
  }

  const { data: updated, error: updateError } = await serviceRoleClient
    .from('instaladores')
    .update({ suspendido })
    .eq('id', instaladorId)
    .select()
    .single();

  if (updateError) {
    return jsonResponse({ ok: false, error: { message: updateError.message } }, 500);
  }

  return jsonResponse({ ok: true, data: updated }, 200);
}

/**
 * `invite_admin` — Sprint B (Gestión de Administradores y Coordinadores).
 * Ver ANALISIS_GESTION_USUARIOS.md, sección "CIERRE ARQUITECTÓNICO", C6.
 *
 * Gate exclusivo de esta acción (matriz de permisos C2): el caller debe
 * ser el Administrador Principal ACTIVO de su empresa -- un Administrador
 * Secundario, o un Principal cuya propia fila estuviera `activo:false`
 * (caso hoy imposible por el trigger `proteger_ultimo_admin_principal`,
 * pero validado igual, sin asumir), recibe `403` antes de cualquier otra
 * validación.
 *
 * Mismo flujo con rollback que `inviteInstalador()` (Auth invite primero,
 * `INSERT` con el id real después, revertir el Auth User si el `INSERT`
 * falla) -- ningún paso nuevo, misma garantía de "sin auth.users huérfano
 * permanente sin intentar limpiarlo".
 *
 * `empresa_id`/`es_principal`/`activo` se fuerzan server-side, nunca desde
 * `payload` (ver JSDoc de `InviteAdminPayload`) -- por diseño, esta acción
 * JAMÁS puede crear un segundo Principal: `es_principal` es siempre
 * `false` acá, así que ni siquiera llega a ejercitar el índice único
 * parcial (`uq_admins_un_principal_por_empresa`, 0011) como defensa.
 */
async function inviteAdmin(
  serviceRoleClient: ReturnType<typeof createClient>,
  admin: AdminRow,
  payload: InviteAdminPayload,
): Promise<Response> {
  if (!admin.activo || admin.es_principal !== true) {
    return jsonResponse(
      { ok: false, error: { message: 'Solo el Administrador Principal activo puede invitar administradores.' } },
      403,
    );
  }

  const nombre = payload.nombre?.trim();
  const email = payload.email?.trim();

  if (!nombre) {
    return jsonResponse({ ok: false, error: { message: 'El nombre es obligatorio.' } }, 400);
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    return jsonResponse({ ok: false, error: { message: 'El correo es obligatorio y debe tener un formato válido.' } }, 400);
  }

  // Mismo mecanismo de `redirectTo` ya usado por `inviteInstalador()` --
  // apunta a `/nueva-contrasena` (ya soporta `type=invite`), sin ninguna
  // ruta nueva. Ver ARCHITECTURE.md §14.10/CLAUDE.md.
  const appUrl = Deno.env.get('APP_URL');
  const inviteOptions: { data: Record<string, string>; redirectTo?: string } = {
    data: { nombre, rol: 'admin' },
  };
  if (appUrl) {
    inviteOptions.redirectTo = `${appUrl.replace(/\/$/, '')}/nueva-contrasena`;
  }

  const { data: inviteData, error: inviteError } =
    await serviceRoleClient.auth.admin.inviteUserByEmail(email, inviteOptions);

  if (inviteError || !inviteData?.user) {
    return jsonResponse(
      { ok: false, error: { message: inviteError?.message ?? 'No se pudo enviar la invitación.' } },
      502,
    );
  }

  const newUserId = inviteData.user.id;

  // `empresa_id`/`es_principal`/`activo` -- SIEMPRE estos valores exactos,
  // nunca leídos de `payload` (que ni siquiera declara esos campos en su
  // tipo). Un admin invitado por esta acción es SIEMPRE Secundario y
  // arranca activo de inmediato (a diferencia de `instaladores`, que
  // requieren verificación de documentos -- un admin invitado por el
  // propio Principal no tiene ese paso, decisión aprobada explícitamente).
  const { data: adminRow, error: insertError } = await serviceRoleClient
    .from('admins')
    .insert({
      id: newUserId,
      empresa_id: admin.empresa_id,
      nombre,
      email,
      telefono: payload.telefono ?? null,
      activo: true,
      es_principal: false,
    })
    .select()
    .single();

  if (insertError) {
    // Mismo patrón de compensación que `inviteInstalador()` -- ver su
    // JSDoc para el detalle completo del razonamiento.
    const { error: rollbackError } = await serviceRoleClient.auth.admin.deleteUser(newUserId);

    return jsonResponse(
      {
        ok: false,
        error: {
          message: insertError.message,
          rollback: rollbackError
            ? `Además, no se pudo revertir la invitación de Auth (usuario ${newUserId} puede haber quedado huérfano -- requiere limpieza manual en el Dashboard).`
            : 'La invitación de Auth fue revertida correctamente.',
        },
      },
      500,
    );
  }

  return jsonResponse({ ok: true, data: adminRow }, 200);
}

/**
 * `set_admin_activo` — Sprint B. Activa/desactiva un Administrador
 * Secundario. Ver ANALISIS_GESTION_USUARIOS.md C2/C6/C3 para el análisis
 * completo de por qué el rechazo sobre el Principal ocurre en 2 capas
 * independientes (este pre-chequeo + el trigger `proteger_ultimo_admin_
 * principal`, 0012, como garantía final de base de datos -- nunca solo
 * este chequeo de aplicación).
 *
 * Nunca modifica `es_principal` -- el único campo que este `UPDATE` toca
 * es `activo`, ni siquiera cuando el payload trajera otro valor (el tipo
 * `SetAdminActivoPayload` ni siquiera declara ese campo).
 */
async function setAdminActivo(
  serviceRoleClient: ReturnType<typeof createClient>,
  admin: AdminRow,
  payload: SetAdminActivoPayload,
): Promise<Response> {
  if (!admin.activo || admin.es_principal !== true) {
    return jsonResponse(
      {
        ok: false,
        error: { message: 'Solo el Administrador Principal activo puede activar/desactivar administradores.' },
      },
      403,
    );
  }

  const adminId = payload.admin_id;
  if (!adminId) {
    return jsonResponse({ ok: false, error: { message: 'admin_id es obligatorio.' } }, 400);
  }
  if (typeof payload.activo !== 'boolean') {
    return jsonResponse({ ok: false, error: { message: 'activo debe ser un valor booleano.' } }, 400);
  }

  const { data: existing, error: fetchError } = await serviceRoleClient
    .from('admins')
    .select('id, empresa_id, es_principal')
    .eq('id', adminId)
    .maybeSingle();

  if (fetchError || !existing) {
    return jsonResponse({ ok: false, error: { message: 'Administrador no encontrado.' } }, 404);
  }
  if (existing.empresa_id !== admin.empresa_id) {
    return jsonResponse(
      { ok: false, error: { message: 'Este administrador no pertenece a tu empresa.' } },
      403,
    );
  }
  // Rechazo explícito ANTES de tocar la base de datos -- matriz de
  // permisos aprobada: nadie (ni siquiera el propio Principal) puede
  // modificar al Administrador Principal mediante esta acción. El trigger
  // `proteger_ultimo_admin_principal` (0012) es la garantía final e
  // independiente -- este chequeo es el mensaje claro de UX sobre la
  // misma regla, nunca la única barrera real.
  if (existing.es_principal) {
    return jsonResponse(
      { ok: false, error: { message: 'No es posible modificar al Administrador Principal.' } },
      403,
    );
  }

  const { data: updated, error: updateError } = await serviceRoleClient
    .from('admins')
    .update({ activo: payload.activo })
    .eq('id', adminId)
    .select()
    .single();

  if (updateError) {
    return jsonResponse({ ok: false, error: { message: updateError.message } }, 500);
  }

  return jsonResponse({ ok: true, data: updated }, 200);
}

/**
 * `list_coordinadores` — Sprint 9.3 (Gestión de Coordinadores).
 *
 * Por qué existe como acción de la Edge Function (y no un `SELECT` directo
 * del cliente vía `coordinadoresRepository`, como sí hace `AdminAdministradores`
 * con `adminsRepository.getByEmpresaId()`): `public.coordinadores` NO tiene
 * columna `email` (confirmado contra el schema real, `database.generated.ts`)
 * -- a diferencia de `admins`/`instaladores`. El único lugar donde el email
 * de un coordinador existe realmente es `auth.users`, y ninguna tabla
 * `public.*` expone esa relación vía RLS a un cliente `authenticated` (ni
 * debería -- expondría el email de cualquier usuario del proyecto a
 * cualquier admin sin control). La única forma segura de resolverlo es
 * `service_role` + Auth Admin API (`auth.admin.getUserById()`), exactamente
 * el mismo tipo de operación de confianza que ya justifica la existencia de
 * esta Edge Function completa (ver JSDoc de cabecera del archivo). Por eso
 * el listado de Coordinadores se sirve desde acá en vez de un `SELECT`
 * directo -- `coordinadoresRepository.getByEmpresaId()`/`.getByTiendaId()`
 * siguen existiendo sin cambios para cualquier otro consumo que no
 * necesite el email (p. ej. una consulta futura scoped por tienda).
 *
 * Scoped por `admin.empresa_id` (nunca un filtro del payload -- el tipo
 * `ListCoordinadoresPayload` ni siquiera declara campos). Sin gate de
 * `es_principal` -- matriz de permisos C2: ver/gestionar coordinadores es
 * igual para Principal y Secundario.
 */
async function listCoordinadores(
  serviceRoleClient: ReturnType<typeof createClient>,
  admin: AdminRow,
): Promise<Response> {
  if (!admin.activo) {
    return jsonResponse(
      { ok: false, error: { message: 'Tu cuenta de administrador no está activa.' } },
      403,
    );
  }

  const { data: coordinadores, error: fetchError } = await serviceRoleClient
    .from('coordinadores')
    .select('*')
    .eq('empresa_id', admin.empresa_id)
    .order('nombre', { ascending: true });

  if (fetchError) {
    return jsonResponse({ ok: false, error: { message: fetchError.message } }, 500);
  }

  // Auth Admin API no ofrece un "getUsersByIds" en lote -- se resuelve uno
  // por uno vía `getUserById()`. Escala de este proyecto (una empresa real,
  // puñado de coordinadores) hace este patrón aceptable; si el volumen
  // creciera significativamente, sería candidato a revisar (no es el caso
  // hoy, no se optimiza prematuramente).
  const coordinadoresConEmail = await Promise.all(
    (coordinadores ?? []).map(async (coordinador) => {
      const { data: userData } = await serviceRoleClient.auth.admin.getUserById(coordinador.id);
      return { ...coordinador, email: userData?.user?.email ?? null };
    }),
  );

  return jsonResponse({ ok: true, data: coordinadoresConEmail }, 200);
}

/**
 * `invite_coordinador` — Sprint 9.3 (Gestión de Coordinadores). Ver
 * ANALISIS_GESTION_USUARIOS.md, "CIERRE ARQUITECTÓNICO", C6/C9 (Sprint D).
 *
 * A diferencia de `invite_admin` (exclusivo del Principal), esta acción está
 * disponible para cualquier admin activo (Principal o Secundario) -- matriz
 * de permisos C2: "ver y gestionar coordinadores/instaladores/empresas es
 * igual para Principal y Secundario, la única diferencia real es la gestión
 * de administradores". Mismo criterio ya aplicado a `invite_instalador`
 * (sin gate de `es_principal`).
 *
 * `tienda_id` se valida server-side contra `admin.empresa_id` -- nunca se
 * confía en que el `<select>` del frontend solo ofreciera tiendas válidas.
 * Mismo flujo con rollback que `inviteInstalador()`/`inviteAdmin()` (Auth
 * invite primero, `INSERT` con el id real después, revertir el Auth User si
 * el `INSERT` falla).
 *
 * `rol` se fuerza siempre a `'coordinador'` -- nunca se lee del payload (el
 * tipo `InviteCoordinadorPayload` ni siquiera lo declara). `coordinadores`
 * no tiene columna `email`/`telefono` (confirmado contra el schema real) --
 * el correo solo se usa para `inviteUserByEmail()`, nunca se persiste.
 */
async function inviteCoordinador(
  serviceRoleClient: ReturnType<typeof createClient>,
  admin: AdminRow,
  payload: InviteCoordinadorPayload,
): Promise<Response> {
  if (!admin.activo) {
    return jsonResponse(
      { ok: false, error: { message: 'Tu cuenta de administrador no está activa.' } },
      403,
    );
  }

  const nombre = payload.nombre?.trim();
  const email = payload.email?.trim();
  const tiendaId = payload.tienda_id;

  if (!nombre) {
    return jsonResponse({ ok: false, error: { message: 'El nombre es obligatorio.' } }, 400);
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    return jsonResponse({ ok: false, error: { message: 'El correo es obligatorio y debe tener un formato válido.' } }, 400);
  }
  if (!tiendaId) {
    return jsonResponse({ ok: false, error: { message: 'La tienda es obligatoria.' } }, 400);
  }

  // Defensa server-side real (nunca confiar solo en las opciones del
  // <select> del frontend) -- misma validación documentada en
  // ANALISIS_GESTION_USUARIOS.md §6/§14 para invite_coordinador.
  const { data: tienda, error: tiendaError } = await serviceRoleClient
    .from('tiendas')
    .select('id, empresa_id')
    .eq('id', tiendaId)
    .maybeSingle();

  if (tiendaError || !tienda) {
    return jsonResponse({ ok: false, error: { message: 'La tienda seleccionada no existe.' } }, 400);
  }
  if (tienda.empresa_id !== admin.empresa_id) {
    return jsonResponse(
      { ok: false, error: { message: 'La tienda seleccionada no pertenece a tu empresa.' } },
      403,
    );
  }

  // Mismo mecanismo de `redirectTo` ya usado por `inviteInstalador()`/
  // `inviteAdmin()` -- apunta a `/nueva-contrasena`. Ver ARCHITECTURE.md
  // §14.10/CLAUDE.md.
  const appUrl = Deno.env.get('APP_URL');
  const inviteOptions: { data: Record<string, string>; redirectTo?: string } = {
    data: { nombre, rol: 'coordinador' },
  };
  if (appUrl) {
    inviteOptions.redirectTo = `${appUrl.replace(/\/$/, '')}/nueva-contrasena`;
  }

  const { data: inviteData, error: inviteError } =
    await serviceRoleClient.auth.admin.inviteUserByEmail(email, inviteOptions);

  if (inviteError || !inviteData?.user) {
    return jsonResponse(
      { ok: false, error: { message: inviteError?.message ?? 'No se pudo enviar la invitación.' } },
      502,
    );
  }

  const newUserId = inviteData.user.id;

  // `rol` siempre `'coordinador'` -- nunca leído del payload. `activo`
  // arranca en `true` (mismo criterio que `invite_admin`: un coordinador
  // invitado por un admin no tiene un paso de verificación de documentos
  // como los instaladores).
  const { data: coordinadorRow, error: insertError } = await serviceRoleClient
    .from('coordinadores')
    .insert({
      id: newUserId,
      empresa_id: admin.empresa_id,
      tienda_id: tiendaId,
      nombre,
      rol: 'coordinador',
      activo: true,
    })
    .select()
    .single();

  if (insertError) {
    // Mismo patrón de compensación que `inviteInstalador()`/`inviteAdmin()`.
    const { error: rollbackError } = await serviceRoleClient.auth.admin.deleteUser(newUserId);

    return jsonResponse(
      {
        ok: false,
        error: {
          message: insertError.message,
          rollback: rollbackError
            ? `Además, no se pudo revertir la invitación de Auth (usuario ${newUserId} puede haber quedado huérfano -- requiere limpieza manual en el Dashboard).`
            : 'La invitación de Auth fue revertida correctamente.',
        },
      },
      500,
    );
  }

  return jsonResponse({ ok: true, data: { ...coordinadorRow, email } }, 200);
}

/**
 * `set_coordinador_activo` — Sprint 9.3. Activa/desactiva un coordinador.
 * Mismo patrón que `setSuspendido()` (instaladores): valida pertenencia a
 * la empresa del admin que invoca, luego `UPDATE`. Sin gate de
 * `es_principal` -- mismo criterio que `invite_coordinador` (C2).
 */
async function setCoordinadorActivo(
  serviceRoleClient: ReturnType<typeof createClient>,
  admin: AdminRow,
  payload: SetCoordinadorActivoPayload,
): Promise<Response> {
  if (!admin.activo) {
    return jsonResponse(
      { ok: false, error: { message: 'Tu cuenta de administrador no está activa.' } },
      403,
    );
  }

  const coordinadorId = payload.coordinador_id;
  if (!coordinadorId) {
    return jsonResponse({ ok: false, error: { message: 'coordinador_id es obligatorio.' } }, 400);
  }
  if (typeof payload.activo !== 'boolean') {
    return jsonResponse({ ok: false, error: { message: 'activo debe ser un valor booleano.' } }, 400);
  }

  const { data: existing, error: fetchError } = await serviceRoleClient
    .from('coordinadores')
    .select('id, empresa_id')
    .eq('id', coordinadorId)
    .maybeSingle();

  if (fetchError || !existing) {
    return jsonResponse({ ok: false, error: { message: 'Coordinador no encontrado.' } }, 404);
  }
  if (existing.empresa_id !== admin.empresa_id) {
    return jsonResponse(
      { ok: false, error: { message: 'Este coordinador no pertenece a tu empresa.' } },
      403,
    );
  }

  const { data: updated, error: updateError } = await serviceRoleClient
    .from('coordinadores')
    .update({ activo: payload.activo })
    .eq('id', coordinadorId)
    .select()
    .single();

  if (updateError) {
    return jsonResponse({ ok: false, error: { message: updateError.message } }, 500);
  }

  return jsonResponse({ ok: true, data: updated }, 200);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: { message: 'Método no soportado, usar POST.' } }, 405);
  }

  // Inyectadas automáticamente por Supabase en runtime de Edge Functions --
  // ver README.md de esta carpeta. Nunca hardcodeadas.
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(
      { ok: false, error: { message: 'Configuración del servidor incompleta (variables de entorno).' } },
      500,
    );
  }

  const serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const admin = await verifyCaller(req, supabaseUrl, anonKey, serviceRoleClient);
  if (!admin) {
    return jsonResponse({ ok: false, error: { message: 'No autorizado.' } }, 403);
  }

  let body: ActionRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: { message: 'Body inválido, se esperaba JSON.' } }, 400);
  }

  switch (body.action) {
    case 'invite_instalador':
      return inviteInstalador(serviceRoleClient, admin, body.payload);
    case 'suspend_instalador':
      return setSuspendido(serviceRoleClient, admin, body.payload, true);
    case 'reactivate_instalador':
      return setSuspendido(serviceRoleClient, admin, body.payload, false);
    case 'invite_admin':
      return inviteAdmin(serviceRoleClient, admin, body.payload);
    case 'set_admin_activo':
      return setAdminActivo(serviceRoleClient, admin, body.payload);
    case 'list_coordinadores':
      return listCoordinadores(serviceRoleClient, admin);
    case 'invite_coordinador':
      return inviteCoordinador(serviceRoleClient, admin, body.payload);
    case 'set_coordinador_activo':
      return setCoordinadorActivo(serviceRoleClient, admin, body.payload);
    default:
      return jsonResponse({ ok: false, error: { message: 'Acción no reconocida.' } }, 400);
  }
});
