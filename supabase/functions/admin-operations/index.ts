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
}

interface SuspendReactivateInstaladorPayload {
  instalador_id: string;
}

type ActionRequest =
  | { action: 'invite_instalador'; payload: InviteInstaladorPayload }
  | { action: 'suspend_instalador'; payload: SuspendReactivateInstaladorPayload }
  | { action: 'reactivate_instalador'; payload: SuspendReactivateInstaladorPayload };

interface AdminRow {
  id: string;
  empresa_id: string;
}

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
    .select('id, empresa_id')
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

  const { data: inviteData, error: inviteError } =
    await serviceRoleClient.auth.admin.inviteUserByEmail(email, {
      data: { nombre, rol: 'instalador' },
    });

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
    default:
      return jsonResponse({ ok: false, error: { message: 'Acción no reconocida.' } }, 400);
  }
});
