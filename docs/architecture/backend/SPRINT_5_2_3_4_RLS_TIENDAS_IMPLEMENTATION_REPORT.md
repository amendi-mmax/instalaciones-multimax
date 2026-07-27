# Sprint 5.2.3.4 (implementación) — Corrección de política RLS para `public.tiendas`

**Fecha**: 2026-07-27
**Rama solicitada por el brief**: `feature/sprint-5.2.3.4-rls-tiendas`
**Rama real usada**: ninguna — ver sección 7.
**Alcance de esta ronda**: exclusivamente `public.tiendas` (RLS/SQL). Cero archivos de `src/` modificados (verificado, sección 6).

---

## 1. Evidencia aportada por el usuario (recibida, no re-derivada)

1. `SELECT id, nombre FROM public.tiendas WHERE id='1a1b06e0-df65-4797-8790-1cc4aed7dbe4'` (ejecutada por el usuario, con privilegios que evaden RLS — SQL Editor/`postgres`) devuelve `Multimax Paitilla`: la fila existe.
2. `GET /rest/v1/tiendas?id=eq.1a1b06e0-df65-4797-8790-1cc4aed7dbe4` (la misma consulta, pero vía PostgREST como `authenticated`, sujeta a RLS) devuelve `HTTP 200` con `[]`: cero filas, sin error — el patrón exacto de "RLS habilitado, ninguna policy aplica" (a diferencia de un `42501`, que indicaría falta de GRANT).
3. `coordinadores` con la policy `(auth.uid() = id)` funciona correctamente — descartado como causa.
4. `OperationalContext` recibe `profile.tienda_id` correctamente; únicamente `profile.tiendaNombre` queda `null`, porque la consulta a `tiendas` no devuelve filas.
5. Ya se determinó (Sprints 5.2.3.3/5.2.3.x) que React solo consume el dato recibido — no hay bug en `CoordinatorLayout`/`RootLayout`/`Header`/`PublishModal`/`SucursalSelect`/`OperationalContext`.

Esta evidencia es exactamente consistente con el diagnóstico ya documentado en `docs/architecture/backend/SPRINT_5_2_3_4_RLS_TIENDAS_REPORT.md` (ronda anterior de este mismo Sprint): `tiendas` tiene RLS habilitado, GRANT de `SELECT` presente para `authenticated`, pero **cero policies** — la combinación exacta que produce "0 filas sin error".

---

## 2. Auditoría previa a implementar (exigida por el brief, realizada antes de tocar cualquier SQL)

Se releyeron los 4 puntos pedidos, confirmando que no hay ninguna diferencia respecto al diagnóstico ya documentado:

- **`src/services/profile.service.ts`**, función `resolveTiendaNombre` (línea 66-69):
  ```ts
  async function resolveTiendaNombre(tiendaId: string): Promise<string | null> {
    const result = await tiendasRepository.getById(tiendaId);
    return result.ok ? (result.data?.nombre ?? null) : null;
  }
  ```
  Sin cambios desde el Sprint 5.2.3.3/5.2.3.4 original. Llamada desde `resolveProfile()` (línea 123) para la rama `coordinador`, con `row.tienda_id` (la columna real de `coordinadores`).

- **`src/repositories/tiendas.repository.ts`**, función `getById` (línea 23-26):
  ```ts
  async function getById(id: string): Promise<ServiceResult<TableRow<'tiendas'> | null>> {
    const query = getClient().from(TABLES.tiendas).select('*').eq('id', id).maybeSingle();
    return toServiceResult(query);
  }
  ```
  Sin cambios. Genera exactamente `SELECT * FROM tiendas WHERE id = $1` a través de PostgREST.

- **Consulta REST generada**: el patrón `.from('tiendas').select('*').eq('id', id).maybeSingle()` del SDK de Supabase se traduce a `GET /rest/v1/tiendas?id=eq.<id>&select=*` — coincide exactamente con la petición que el usuario reportó en el punto 2 de la evidencia (`GET /rest/v1/tiendas?id=eq.1a1b06e0-df65-4797-8790-1cc4aed7dbe4`).

- **Nota ya presente en el propio archivo** (línea 10-11 de `tiendas.repository.ts`, JSDoc del Sprint 4.1.1C): *"Nota heredada de la auditoría: `tiendas` tiene RLS habilitado sin policies propias."* — el propio código ya documentaba, desde antes de este Sprint, la causa raíz que la evidencia de esta ronda vuelve a confirmar.

**Conclusión de la auditoría**: no hay ninguna diferencia que documentar. El código de frontend (`profile.service.ts`, `tiendas.repository.ts`, la consulta REST resultante) es idéntico al ya auditado en la ronda anterior de este Sprint — el problema sigue siendo exclusivamente la ausencia de policy de `SELECT` en `public.tiendas`.

---

## 3. SQL de implementación

El SQL necesario **ya fue generado** en la ronda anterior de este mismo Sprint (`docs/architecture/backend/SPRINT_5_2_3_4_RLS_TIENDAS_FIX.sql`) y cumple, sin ningún cambio, con **todas** las restricciones de esta ronda:

| Restricción del brief | ¿La cumple el SQL ya generado? |
|---|---|
| Mantener RLS habilitado | Sí — no incluye `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` |
| Mantener el resto del modelo de seguridad | Sí — no toca ninguna policy de `empresas`/`coordinadores`/`trabajos`/`trabajo_instaladores`/`admins`/`instaladores` |
| No modificar `public.empresas` | Sí — cero sentencias sobre `empresas` (solo se la referencia en el `SELECT` de verificación, de solo lectura) |
| No modificar `public.coordinadores` | Sí — cero sentencias sobre `coordinadores` |
| Solo `SELECT`, no `INSERT`/`UPDATE`/`DELETE` | Sí — `FOR SELECT` únicamente; el propio archivo lo deja explícito en su comentario final |

Por lo tanto, **no se generó un archivo `.sql` nuevo ni distinto** — hacerlo hubiera creado una segunda fuente de verdad para el mismo cambio, exactamente el tipo de duplicidad que este proyecto evita. El SQL ejecutable de esta implementación es, verbatim, el ya entregado:

```sql
-- Verificación previa (confirma el estado exacto antes de corregir)
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename in ('tiendas', 'empresas')
order by tablename, policyname;

-- Corrección — única policy nueva, exclusivamente sobre `tiendas`
DROP POLICY IF EXISTS "usuarios autenticados pueden leer tiendas" ON public.tiendas;

CREATE POLICY "usuarios autenticados pueden leer tiendas"
    ON public.tiendas
    FOR SELECT
    TO authenticated
    USING (true);
```

(Bloques completos de verificación/validación/rollback: ver `docs/architecture/backend/SPRINT_5_2_3_4_RLS_TIENDAS_FIX.sql`, sin cambios.)

**Nota de diseño ya documentada, reafirmada**: `USING (true)` replica el mismo patrón ya confirmado y funcional de la policy real de `empresas` ("usuarios autenticados pueden leer empresas") — no es un modelo de seguridad nuevo. `tiendas.nombre` es un catálogo de solo lectura sin dato sensible; el límite real de seguridad de este sistema lo siguen aplicando, sin cambios, las policies de `trabajos`/`trabajo_instaladores`.

---

## 4. Validación — limitación real de este entorno (no se puede omitir ni fabricar)

El criterio de éxito del brief exige demostrar **con evidencia** que `GET /rest/v1/tiendas?id=...` deja de devolver `[]` y empieza a devolver la fila correspondiente. **Este entorno de trabajo no tiene acceso de red a Supabase** (limitación estructural ya documentada en rondas anteriores de este mismo Sprint) — no puede ejecutar el SQL de la sección 3 contra Producción, ni volver a emitir la petición `GET /rest/v1/tiendas?id=eq.1a1b06e0-df65-4797-8790-1cc4aed7dbe4` para observar el resultado real después del cambio.

**Esto significa que el criterio de éxito del brief no puede cerrarse desde este entorno.** Es necesario que el usuario:

1. Ejecute el bloque "0. VERIFICACIÓN PREVIA" de `SPRINT_5_2_3_4_RLS_TIENDAS_FIX.sql` y confirme que, antes del cambio, no hay ninguna fila con `tablename = 'tiendas'`.
2. Ejecute el bloque "1. CORRECCIÓN" (el `DROP POLICY IF EXISTS` + `CREATE POLICY` de la sección 3 de este reporte).
3. Repita la misma petición reportada en la evidencia de este Sprint: `GET /rest/v1/tiendas?id=eq.1a1b06e0-df65-4797-8790-1cc4aed7dbe4` (con un token de un usuario `authenticated` real, no con la `service_role` key) y confirme que la respuesta ya no es `[]`, sino la fila `{"id": "1a1b06e0-df65-4797-8790-1cc4aed7dbe4", "nombre": "Multimax Paitilla", ...}`.
4. Inicie sesión en la app como el Coordinador real dueño de esa tienda y confirme visualmente: badge superior = "Multimax Paitilla" (ya no vacío), selector superior con esa única opción habilitada, `PublishModal` preseleccionado con esa misma tienda.
5. Reporte el resultado de estos 4 pasos de vuelta, para poder cerrar formalmente este Sprint con evidencia real (no asumida).

Esto es consistente con la limitación ya declarada en la ronda anterior de este mismo Sprint (`SPRINT_5_2_3_4_RLS_MASTER_TABLES_REPORT.md`) y con la disciplina general de este proyecto: este entorno no fabrica resultados de comandos que no puede ejecutar.

---

## 5. Validaciones obligatorias del brief (`lint`/`typecheck`/`build`/`dev`)

Como en toda ronda de este proyecto, este entorno de trabajo no tiene `node_modules/` instalado ni acceso de red al registro de npm — no puede ejecutar `npm run lint`, `npm run typecheck`, `npm run build` ni `npm run dev` de forma real. Esta limitación es la misma ya declarada en cada ronda anterior.

En este caso concreto, el impacto es mínimo por diseño: esta ronda **no modifica ningún archivo de `src/`** (ver sección 6) — es exclusivamente un cambio de RLS en Supabase, fuera del árbol de código fuente que esos 4 comandos analizan. No hay ningún cambio de TypeScript/React que pudiera introducir un error de tipos, lint o build. Aun así, no se puede afirmar que esos comandos "pasan" sin haberlos ejecutado realmente — se recomienda que el usuario los corra en su entorno como parte de su propio checklist de cierre, aunque no se espera ningún error atribuible a esta ronda (cero cambios de código).

---

## 6. Verificación de alcance (cero cambios en `src/`)

```
$ find src -newer docs/architecture/frontend/SPRINT_5_2_3_X_OPERATIONAL_CONTEXT_SYNC_REPORT.md -type f
(sin resultados)
```

Confirmado: ningún archivo de `src/` fue tocado en esta ronda — ni componentes React, ni Context, ni repositorios, ni servicios, ni Providers, ni `OperationalContext`, ni `CoordinatorLayout`/`RootLayout`/`PublishModal`/`Header`/`SucursalSelect`, tal como exige explícitamente el brief.

---

## 7. Nota sobre la rama solicitada

El brief pide trabajar exclusivamente sobre `feature/sprint-5.2.3.4-rls-tiendas`. Se verificó con `git branch -a` (solo lectura) que esa rama no existe en este repositorio:

```
feature/sprint-3-1-header
feature/sprint-3-2-mx-instside
feature/sprint-3-3-mx-subtabs
feature/sprint-3-4-mx-suc-sel
feature/sprint-3-5-publish-modal
feature/sprint-3-6-coordinator-empty-state
feature/sprint-3-7-radar
* feature/sprint-3-8-countdown
main
```

Esto es consistente con el patrón ya vigente y comunicado repetidamente desde la Fase 4: ningún Sprint desde entonces se trabaja sobre una rama Git nueva; todo el trabajo (incluyendo el SQL, que no vive en `src/` de todas formas) se documenta en `docs/SPRINTS_INDEX.md` como *"(sin rama Git — flujo Git manual del usuario)"*. No se creó ninguna rama para esta ronda, tal como también exige el propio brief ("No crear otra rama").

---

## 8. Resumen de estado

| Punto | Estado |
|---|---|
| Causa raíz | Confirmada, sin cambios respecto a la ronda anterior: `tiendas` con RLS habilitado y cero policies de `SELECT` |
| Auditoría de frontend (4 puntos pedidos) | Completa — sin diferencias, nada que documentar como cambio |
| SQL de corrección | Ya generado (ronda anterior), verificado que cumple todas las restricciones de esta ronda, sin cambios |
| Ejecución del SQL en Producción | **No realizada desde este entorno** (sin acceso de red a Supabase) — pendiente del usuario |
| Validación del criterio de éxito (`GET` deja de devolver `[]`) | **No verificable desde este entorno** — pendiente de que el usuario ejecute los 4 pasos de la sección 4 y reporte el resultado |
| Cambios en `src/` | Ninguno (verificado) |
| `lint`/`typecheck`/`build`/`dev` | No ejecutables en este entorno; sin cambios de código que pudieran afectarlos |
