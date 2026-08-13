# Sprint 6.1 — Auditoría de esquema: `public.instaladores` vs. flujo de invitación

**Fecha**: 2026-07-27
**Fase**: Fase 6 — Módulo Administrador, "Gestión de Instaladores"
**Alcance de esta entrega**: auditoría de esquema/RLS + scripts SQL (no ejecutados) + código de la Edge Function administrativa. **No incluye todavía el módulo de frontend** — el propio brief pidió expresamente detenerse aquí ("Una vez validada la infraestructura y el esquema, continúa con la implementación del módulo").
**Rama**: el brief pide trabajar "únicamente sobre la rama actual". No se creó ninguna rama nueva — mismo patrón sin ramas Git ya vigente desde la Fase 4.

---

## 1. Resumen ejecutivo

Se auditó la tabla real `public.instaladores` (16 columnas, confirmadas contra `docs/database/DATABASE_INVENTORY.md` §2.5 y `src/types/database.generated.ts`) contra lo que el flujo de invitación de la Fase 6 necesita. Hallazgos principales:

1. **No falta ninguna columna** para que el flujo funcione — el estado "Pendiente" se puede derivar de las columnas booleanas ya existentes (`activo`/`suspendido`/`documentos_ok`), sin migración de esquema.
2. **El orden del flujo del brief es técnicamente imposible tal como está escrito**: `instaladores.id` tiene una Foreign Key real hacia `auth.users(id)` (`instaladores_id_fkey`, `ON DELETE CASCADE`) — no se puede insertar una fila en `instaladores` con un `id` que todavía no existe en `auth.users`. El orden correcto es el inverso: invitar primero (Supabase Auth crea el usuario y devuelve su `id`), y usar ese mismo `id` para crear la fila en `instaladores` después.
3. **RLS de `instaladores` tiene un hueco real, pero acotado**: solo existen 2 policies, ambas de `SELECT` — ninguna de `INSERT`/`UPDATE`/`DELETE`. Con el diseño elegido (toda escritura administrativa pasa por la Edge Function con `service_role`, que **se salta RLS por completo**), esto deja de ser un bloqueante: no hace falta ninguna policy nueva de escritura. El único hueco real que sigue en pie es de **lectura**: no hay evidencia de que la policy existente de `SELECT` cubra al rol `admin` (ver sección 4).
4. **Hallazgo colateral, fuera del alcance de este Sprint pero reportado por disciplina de "no fabricar/ignorar"**: `supabase/README.md` (§9-10) documenta, por escrito, un modelo de datos ("`usuarios`/`sucursales`/`bids`/`zonas_cobertura`/`notificaciones`") que **contradice directamente** el modelo real confirmado por absolutamente toda la evidencia de este proyecto (`tiendas`/`admins`/`coordinadores`/`instaladores`/`ofertas` — confirmado por `database.generated.ts`, `TABLES` en `config.ts`, y evidencia en vivo de Sprints anteriores, ej. la fila real "Multimax Paitilla" en `public.tiendas`). Esta auditoría usa exclusivamente `docs/database/DATABASE_INVENTORY.md`/`DATABASE_DIFF.md` (que sí coinciden con el modelo real) como fuente de verdad — **no se tocó `supabase/migrations/`** en esta ronda, evitando esa contradicción por completo (los scripts de este Sprint viven en `docs/architecture/backend/`, tal como pidió el brief).

---

## 2. Esquema actual de `public.instaladores` (16 columnas, confirmadas)

| Columna | Tipo | Default | Nullable | Rol en el flujo de invitación |
|---|---|---|---|---|
| `id` | uuid | — | NOT NULL | **= `auth.users.id`** (FK real, `ON DELETE CASCADE`) — se conoce recién después de invitar, no antes |
| `empresa_id` | uuid | — | NOT NULL | fija, siempre la empresa del Admin que invita (Multimax, única empresa real hoy) |
| `nombre` | text | — | NOT NULL | provisto por el Admin al invitar |
| `telefono` | text | — | NULL | opcional al invitar; el instalador puede completarlo en su primer login |
| `email` | text | — | NULL | **requerido** al invitar (es el destino del correo de Supabase Auth) |
| `provincia` | text | — | NULL | opcional al invitar |
| `zona` | text | — | NULL | opcional al invitar |
| `rating` | numeric(2,1) | `5.0` | NOT NULL | no se toca al invitar (usa el default) |
| `km` | numeric | `0` | NULL | no se toca al invitar (usa el default) |
| `cumplimiento` | numeric | `100` | NULL | no se toca al invitar (usa el default) |
| `aceptacion` | numeric | `100` | NULL | no se toca al invitar (usa el default) |
| `prom_respuesta_seg` | integer | — | NULL | no se toca al invitar |
| `documentos_ok` | boolean | `true` | NOT NULL | **se fuerza a `false`** al crear (ver §3 — un instalador recién invitado no ha subido ningún documento todavía, aunque el default de la tabla sea `true`) |
| `suspendido` | boolean | `false` | NOT NULL | `false` al crear (sin cambios respecto al default) |
| `activo` | boolean | `true` | NOT NULL | **se fuerza a `false`** al crear (ver §3 — el default de la tabla es `true`, pero un recién invitado no debe contar como "activo" hasta completar su perfil) |
| `created_at` | timestamptz | `now()` | NOT NULL | no se toca (usa el default) |

**Conclusión**: las 16 columnas ya existentes son suficientes. No se requiere ningún `ALTER TABLE ... ADD COLUMN`.

---

## 3. Cómo se representa "Pendiente" sin tocar el esquema

No existe ninguna columna de "estado" en `instaladores` — solo 3 booleans (`activo`, `suspendido`, `documentos_ok`). Se deriva el estado visible en la UI así:

| `suspendido` | `activo` | Estado mostrado |
|---|---|---|
| `true` | (cualquiera) | **Suspendido** |
| `false` | `false` | **Pendiente** (invitado, todavía no completó su primer login/perfil) |
| `false` | `true` | **Activo** |

Esto requiere que, al **crear** el registro (dentro de la Edge Function, ver sección 5), se inserte explícitamente `activo: false` — no se puede dejar el default de la tabla (`true`), porque produciría un instalador recién invitado marcado como "Activo" antes de aceptar la invitación. Este es el único punto donde la Edge Function se aparta de los defaults de columna, y está documentado explícitamente en su código (sección 5).

**Quién pone `activo = true`**: un Sprint funcional futuro (fuera de este alcance, mencionado aquí solo para trazabilidad) deberá decidir el mecanismo exacto — lo más consistente con el flujo del brief ("Define contraseña → Primer login → Completa perfil → Estado = active") es que el propio instalador, al completar su perfil por primera vez desde su vista (`InstallerProfile`, ya existente), dispare una actualización de `activo: true` vía su propia sesión autenticada (RLS ya permitiría esto si se agrega, en un Sprint futuro, una policy de `UPDATE` para "instalador actualiza su propio perfil", que hoy tampoco existe — no confirmado en este Sprint, ver sección 4).

---

## 4. RLS de `instaladores` — estado documentado vs. verificación en vivo pendiente

`docs/database/DATABASE_INVENTORY.md` §2.5 (auditoría de una ronda anterior de este proyecto, no de esta sesión) documenta exactamente 2 policies sobre `instaladores`, ambas de `SELECT`:

1. **"instaladores ven su propio perfil"** — SELECT, `id = auth.uid()`.
2. **"coordinadores ven instaladores de su empresa"** — SELECT, scoped vía subquery a `coordinadores.empresa_id`.

**No hay ninguna policy de `INSERT`/`UPDATE`/`DELETE` documentada.** Esto, en principio, bloquearía cualquier escritura desde el navegador (`authenticated`) — pero con el diseño de este Sprint (toda escritura administrativa pasa por la Edge Function, que usa `service_role` y **se salta RLS por completo**), esto deja de ser un problema: la Edge Function puede insertar/actualizar `instaladores` sin necesitar ninguna policy nueva de escritura.

**El hueco real que queda es de lectura**: la policy #2 está descrita como "coordinadores ven instaladores de su empresa" — no hay evidencia documentada de que también cubra al rol `admin`. Si su `USING` real fuera, por ejemplo, `EXISTS (SELECT 1 FROM coordinadores c WHERE c.id = auth.uid() AND c.empresa_id = instaladores.empresa_id)` (sin mencionar `admins`), un Admin real **no podría ver el listado de instaladores en absoluto** — ni por la policy #1 (no es su propio perfil) ni por la #2 (no es una fila de `coordinadores`). Esto también bloquearía Supabase Realtime para el Admin (Realtime respeta RLS).

**Esta documentación (`DATABASE_INVENTORY.md`) es de una auditoría anterior, no verificada en vivo en esta sesión** — este entorno de trabajo no tiene acceso de red a Supabase (limitación estructural ya declarada en cada ronda de este proyecto). Antes de ejecutar cualquier policy nueva, es necesario confirmar el estado real y actual con las 2 consultas de solo lectura de `SPRINT_6_1_INSTALADORES_RLS_VERIFICATION_QUERIES.sql` (entregado junto a este reporte).

**Candidato de corrección** (generado, NO ejecutado, condicionado al resultado de la verificación): `SPRINT_6_1_INSTALADORES_RLS_FIX.sql` agrega una policy nueva de `SELECT` para `admin`, sin tocar ni eliminar las 2 policies existentes — si la verificación confirma que el `admin` ya está cubierto por la policy #2, este archivo no hace falta ejecutarlo (se indica explícitamente en el propio script).

---

## 5. Corrección del orden del flujo (FK real, no es una preferencia de diseño)

El brief describe:

```
Crear Instalador → Crear registro en tabla instaladores → Invitar usuario mediante Supabase Auth → Estado = pending
```

`instaladores_id_fkey` (`instaladores.id → auth.users(id) ON DELETE CASCADE`) hace que este orden sea **imposible de ejecutar tal cual** — Postgres rechazaría el `INSERT` en `instaladores` con un error de violación de FK si el `id` no existe todavía en `auth.users`. El flujo real, implementado en la Edge Function (sección 6), es:

```
Admin (autenticado)
  ↓
Frontend llama a la Edge Function `admin-operations` (action: invite_instalador)
  ↓
Edge Function verifica que el caller es un Admin real (tabla `admins`, vía service_role)
  ↓
Edge Function invita al usuario: auth.admin.inviteUserByEmail(email) → devuelve auth.users.id real
  ↓
Edge Function crea la fila en `instaladores` usando ESE MISMO id (activo=false, suspendido=false, documentos_ok=false)
  ↓
Estado visible = "Pendiente" (ver sección 3)
  ↓
El instalador recibe el correo de invitación de Supabase Auth
  ↓
Define contraseña → Primer login → Completa perfil
  ↓
(Sprint futuro) activo=true → Estado visible = "Activo"
```

Ningún paso de este flujo corregido cambia el objetivo funcional del brief — solo invierte 2 pasos por una razón estrictamente técnica (constraint real de la base de datos), documentada aquí con evidencia (no es una sustitución silenciosa).

---

## 6. Edge Function administrativa (`admin-operations`) — entregada, no desplegada/probada

Por decisión explícita del usuario, se construyó una Edge Function **reutilizable**, no exclusiva de instaladores: `supabase/functions/admin-operations/index.ts`. Encapsula toda operación que requiera `service_role` (invitar, suspender, reactivar; extensible a futuras operaciones administrativas vía el campo `action`). Detalle completo de diseño, seguridad y contrato en el `README.md` dentro de esa misma carpeta.

**No se pudo desplegar ni probar desde este entorno** — este sandbox no tiene acceso de red a Supabase (misma limitación estructural declarada en cada ronda de este proyecto) ni la Supabase CLI vinculada al proyecto real. El código se entrega completo y documentado, listo para que el usuario lo despliegue (`supabase functions deploy admin-operations`) y lo pruebe contra Producción.

---

## 7. Qué falta para que el flujo funcione de punta a punta (fuera del alcance de esta entrega)

Por instrucción explícita del brief ("Una vez validada la infraestructura y el esquema, continúa con la implementación del módulo"), esta entrega se detiene aquí. Quedan pendientes, para la siguiente ronda:

1. Que el usuario ejecute las 2 consultas de `SPRINT_6_1_INSTALADORES_RLS_VERIFICATION_QUERIES.sql` y confirme si la policy nueva de `SPRINT_6_1_INSTALADORES_RLS_FIX.sql` hace falta o no.
2. Que el usuario despliegue la Edge Function (`supabase functions deploy admin-operations`) y confirme que Supabase la sirve correctamente (los secrets `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY` los inyecta Supabase automáticamente en runtime de Edge Functions — no hace falta configurarlos a mano, ver el `README.md` de la función).
3. Recién después: el módulo de frontend (repository/servicios/hooks/UI: listado, búsqueda, filtros, Realtime, formulario de invitación, suspender/reactivar, loading/errores/toasts/confirmaciones) que consume esta infraestructura ya validada — el propio brief pidió no adelantar esta parte todavía.

## 8. Validaciones obligatorias del brief — estado real

Esta entrega no modifica ningún archivo de `src/` (0 componentes/repositorios/servicios de frontend tocados) — ver verificación de alcance en la sección 9. `npm run lint`/`typecheck`/`build` no aplican todavía a un Sprint que no tocó `src/`, y de todas formas este entorno de trabajo sigue sin `node_modules/`/acceso de red para ejecutarlos de forma real (limitación ya declarada en cada ronda). El código de la Edge Function corre en Deno (runtime de Supabase Edge Functions), un entorno completamente distinto al de Vite/Node del frontend — no pasa por `tsc`/`eslint`/`vite build` en absoluto; su única validación real posible es desplegarla contra el proyecto real de Supabase, algo que este entorno no puede hacer.

## 9. Verificación de alcance

```
$ find src -newer docs/architecture/frontend/SPRINT_5_2_3_5_SUCURSAL_SELECT_SYNC_REPORT.md -type f
(sin resultados)
```

Confirmado: cero archivos de `src/` tocados en esta entrega — consistente con la instrucción del brief de detenerse en la infraestructura/esquema antes de continuar con el módulo de frontend.
