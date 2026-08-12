# `admin-operations` — Edge Function administrativa (Sprint 6.1)

Primera Edge Function real de este proyecto. Encapsula toda operación que requiera la `service_role key` (nunca expuesta al navegador). Ver el JSDoc completo en `index.ts` para el diseño de seguridad y el flujo corregido de invitación.

**Generada en este entorno de trabajo, NO desplegada ni probada** — el sandbox donde se generó este código no tiene acceso de red a Supabase ni la Supabase CLI vinculada al proyecto real (`bdevkryrgmttxnlxaisd`). Los pasos de abajo los debe ejecutar el usuario.

## 1. Requisitos previos

```bash
npm install -g supabase   # si todavía no está instalada (ver supabase/README.md §2)
supabase login
supabase link --project-ref bdevkryrgmttxnlxaisd
```

## 2. Variables de entorno — qué hay que configurar (casi nada)

Supabase **inyecta automáticamente**, dentro del runtime de cualquier Edge Function de un proyecto, estas 3 variables — **no hay que configurarlas a mano**:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Esto es distinto del resto de este proyecto (`.env`/`.env.example`, leídos por Vite/Node) — las Edge Functions corren en el runtime propio de Supabase (Deno), no en este repositorio, y Supabase ya conoce esas 3 claves porque es su propio proyecto. Si en el futuro esta función (o una nueva `action` dentro de ella) necesita una variable adicional que **no** sea una de estas 3, se configura con:

```bash
supabase secrets set NOMBRE_VARIABLE=valor --project-ref bdevkryrgmttxnlxaisd
```

**`APP_URL` (Sprint 7.2, ronda de corrección de `redirectTo`)** — sí hay que configurarla a mano, con este mismo mecanismo. `invite_instalador` la usa para armar el `redirectTo` del correo de invitación (`${APP_URL}/nueva-contrasena`), regla arquitectónica permanente descrita en `ARCHITECTURE.md` §14.10/`CLAUDE.md` ("ningún flujo de Auth depende exclusivamente del Site URL del Dashboard"). Sin esta variable configurada, la función sigue funcionando exactamente igual que antes (sin `redirectTo`, dependiente del Site URL) -- no es obligatoria para que `invite_instalador` funcione, pero sí para que el enlace de invitación abra el host correcto:

```bash
# Desarrollo (probar el enlace de invitación contra un Vite local):
supabase secrets set APP_URL=http://localhost:5173 --project-ref bdevkryrgmttxnlxaisd

# Producción (una vez desplegado el frontend):
supabase secrets set APP_URL=https://<dominio-real-de-produccion> --project-ref bdevkryrgmttxnlxaisd
```

Al ser un único valor por proyecto (no por invocación), cambiar de "estoy probando en local" a "esto es Producción" implica volver a correr `secrets set` con el valor correspondiente -- no hay una forma de que la Edge Function reciba el origen del navegador que la invocó (a diferencia de `resetPasswordForEmail()`, que sí corre en el navegador y puede leer `window.location.origin` directamente, ver `auth.service.ts`).

## 3. Desplegar

```bash
supabase functions deploy admin-operations --project-ref bdevkryrgmttxnlxaisd
```

## 4. Probar (después de desplegar)

Desde una sesión real de un Admin ya logueado en la app (para tener un JWT real), o con `curl` pasando manualmente un JWT válido:

```bash
curl -i --location --request POST \
  'https://bdevkryrgmttxnlxaisd.supabase.co/functions/v1/admin-operations' \
  --header 'Authorization: Bearer <JWT real de un Admin logueado>' \
  --header 'Content-Type: application/json' \
  --data '{
    "action": "invite_instalador",
    "payload": {
      "nombre": "Instalador de prueba",
      "email": "instalador.prueba@ejemplo.com"
    }
  }'
```

Respuesta esperada (`200`): `{"ok":true,"data":{...fila real de instaladores...}}`. Confirmar además, en el Dashboard → Authentication → Users, que aparece un usuario nuevo en estado "Invited", y que ese mismo usuario recibió el correo de invitación real.

## 5. Acciones soportadas hoy

| `action` | `payload` | Qué hace |
|---|---|---|
| `invite_instalador` | `{ nombre, email, telefono?, provincia?, zona? }` | Invita un usuario real vía Supabase Auth y crea su fila en `instaladores` (`activo: false`, `suspendido: false`, `documentos_ok: false`) |
| `suspend_instalador` | `{ instalador_id }` | `instaladores.suspendido = true` |
| `reactivate_instalador` | `{ instalador_id }` | `instaladores.suspendido = false` |

Extensible: cualquier operación administrativa futura se agrega como un `case` nuevo en el `switch` de `index.ts`, sin crear una función nueva.

## 6. Seguridad — qué NO hay que hacer nunca

- No exponer `SUPABASE_SERVICE_ROLE_KEY` en ningún archivo bajo `src/` (ver `src/lib/supabase/server.ts`, que ya documentaba esta regla desde el Sprint 4.1.1).
- No quitar la verificación de `verifyCaller()` (`index.ts`) — es la única barrera real entre "cualquiera con la ANON key" y "operaciones con privilegios de `service_role`".
