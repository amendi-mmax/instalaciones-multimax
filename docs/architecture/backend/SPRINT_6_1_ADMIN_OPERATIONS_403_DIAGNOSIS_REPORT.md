# Sprint 6.1 — Diagnóstico del `403 No autorizado` en `admin-operations`

**Fecha**: 2026-07-27
**Alcance**: exclusivamente diagnóstico + corrección de la validación del JWT en `verifyCaller()` (`supabase/functions/admin-operations/index.ts`). Ninguna otra lógica del Sprint fue tocada — ni las acciones (`invite_instalador`/`suspend_instalador`/`reactivate_instalador`), ni la arquitectura de doble cliente (`callerClient` + `serviceRoleClient`), ni ningún archivo de `src/`.
**Importante**: este entorno de trabajo no tiene acceso de red a Supabase (limitación estructural ya declarada en cada ronda de este proyecto) — no pude desplegar la función corregida ni observar logs reales. Lo que sigue es un diagnóstico por lectura de código, no una confirmación en vivo. El usuario debe redesplegar y confirmar contra los logs reales de Supabase.

---

## 1. Evidencia ya confirmada por el usuario (recibida, no re-derivada)

- El header `Authorization: Bearer ...` llega correctamente (visible en los logs).
- `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` existen (`supabase secrets list`).
- El usuario autenticado ya tiene una fila real en `public.admins`.
- La función responde `403 No autorizado` de todas formas.

Esto descarta, con evidencia directa, 3 de las 4 causas posibles de un `403` en esta función (falta de header, falta de secrets, falta de fila en `admins`) — deja como única causa restante algo dentro de la validación del JWT en sí (`verifyCaller()`), antes incluso de llegar a la consulta a `admins`.

---

## 2. Causa raíz identificada (lectura de código, línea exacta)

**Línea exacta del fallo, versión anterior de `verifyCaller()`**:

```ts
const callerClient = createClient(supabaseUrl, anonKey, {
  global: { headers: { Authorization: authHeader } },
});

const {
  data: { user },
  error: authError,
} = await callerClient.auth.getUser();     // <-- SIN el JWT como argumento
```

`global.headers` (la opción usada al crear `callerClient`) solo afecta las requests HTTP que ese cliente hace hacia PostgREST/Storage/Functions — **no alimenta al módulo `auth` (GoTrue) de `@supabase/supabase-js`**, que mantiene su propia sesión interna, separada. `auth.getUser()` **sin argumento** no lee el header `Authorization` en absoluto: intenta usar una sesión ya establecida en el cliente (vía `persistSession`/`setSession()`), y como `callerClient` se crea nuevo en cada invocación (una Edge Function no tiene estado entre requests), esa sesión interna siempre está vacía.

Resultado: `authError` con un mensaje del tipo `"Auth session missing!"` (o `user: null`), `verifyCaller()` retorna `null`, y el handler principal responde `403 "No autorizado"` — exactamente el síntoma reportado, y perfectamente consistente con que las otras 3 piezas (header, secrets, fila en `admins`) ya estén confirmadas correctas: el fallo nunca llegó a probarlas, ocurre antes.

---

## 3. Corrección aplicada

Extraer el token crudo del header y pasarlo explícitamente a `getUser(token)` — el patrón oficial documentado por Supabase para validar el JWT de un caller dentro de una Edge Function:

```ts
const token = authHeader.replace('Bearer ', '');

const {
  data: { user },
  error: authError,
} = await callerClient.auth.getUser(token);
```

La firma `getUser(jwt?: string)` de `@supabase/supabase-js@2` sí admite este parámetro opcional — no hizo falta conservar la variante sin argumento como *fallback* (no es una limitación de la librería, es un uso incorrecto de la API en la versión anterior de este archivo).

**Se conservó intacta la arquitectura de doble cliente** (`callerClient` con ANON key, exclusivamente para validar el JWT; `serviceRoleClient`, exclusivamente para leer/escribir tablas y ejecutar operaciones de Auth Admin) — la corrección es puntual, dentro de `verifyCaller()`, sin tocar el resto del archivo.

---

## 4. Instrumentación agregada (`console.log`, según lo pedido)

Se agregaron logs en cada paso pedido, todos con el prefijo `[admin-operations:verifyCaller]` (fácil de filtrar en `supabase functions logs admin-operations`):

1. Inicio de `verifyCaller`.
2. Si llegó el `Authorization` header — **sin loguear el JWT completo** (se loguea solo si llegó, su longitud, y un prefijo corto de 15 caracteres) para no exponer el token real en los logs del Dashboard/CLI, legibles por cualquiera con acceso al proyecto. Se documenta esta decisión explícitamente en el propio código.
3. Creación de `callerClient`.
4. Resultado completo de `auth.getUser(token)`: `user.id` (si existe) y `authError.message` (si existe).
5. Retorno temprano si no hay `user`/hay `authError`.
6. Antes de consultar `public.admins` (con el `id` usado).
7. Resultado completo de esa consulta: `adminRow` (serializado) y `adminError.message` (si existe).
8. Retorno temprano si no hay `adminRow`/hay `adminError`.
9. Retorno final exitoso, con el `AdminRow` real.

---

## 5. Qué falta para confirmar (no verificable desde este entorno)

1. Redesplegar: `supabase functions deploy admin-operations --project-ref bdevkryrgmttxnlxaisd`.
2. Repetir la misma invocación que produjo el `403` (ver `README.md` de la función, sección 4, para el `curl` de ejemplo).
3. Revisar `supabase functions logs admin-operations` y confirmar que ahora la secuencia de logs llega hasta "retorno final: AdminRow real" y la respuesta es `200`, no `403`.
4. Si el `403` persiste después de este cambio, los logs nuevos deberían mostrar en qué paso exacto ocurre ahora (por ejemplo, si `authError` sigue apareciendo incluso con el token explícito, indicaría un problema distinto — JWT expirado, `anonKey` incorrecta, o un desfase de reloj — no el mismo bug que este reporte diagnostica).

## 6. Verificación de alcance

```
$ find src -newer docs/architecture/backend/SPRINT_6_1_INSTALADORES_SCHEMA_AUDIT_REPORT.md -type f
(sin resultados)
```

Único archivo modificado: `supabase/functions/admin-operations/index.ts` (función `verifyCaller()` únicamente). Ningún archivo de `src/` tocado; ninguna otra función/acción de este Sprint modificada.
