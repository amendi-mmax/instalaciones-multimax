# Sprint 5.2.3.4 — Corrección de acceso RLS para tablas maestras (`tiendas`/`empresas`)

## 0. Resultado de esta ronda: auditoría entregada, SQL de corrección **detenido** por falta de evidencia en vivo

Este Sprint pedía, en orden: (1) auditar el estado real de `public.tiendas`/`public.empresas` en Supabase antes de escribir una sola línea de SQL; (2) diseñar la solución mínima; (3) generar `SPRINT_5_2_3_4_RLS_MASTER_TABLES_FIX.sql`. El propio brief incluye una condición de parada explícita: *"Si desde este entorno no puedes inspeccionar las policies reales de Supabase porque no tienes acceso al proyecto, DETENTE después de generar el reporte de auditoría."*

Esa condición se cumple: este entorno de trabajo no tiene acceso de red al proyecto de Supabase (restricción de sandbox vigente durante toda esta sesión, confirmada en cada Sprint anterior que involucró SQL/RLS). No existe ningún `pg_dump`/export de policies posterior al Sprint 4.2.1 en este repositorio que cubra específicamente `tiendas`/`empresas` con certeza actualizada -- lo único disponible es documentación (secciones 1-2 de este informe) que es **anterior** a los cambios manuales que el propio usuario hizo directamente en el Dashboard de Supabase durante el cierre del Sprint 4.2.1, y esos cambios manuales solo están confirmados para `admins`.

**En consecuencia: no se generó `SPRINT_5_2_3_4_RLS_MASTER_TABLES_FIX.sql` en esta ronda.** Generar ese SQL ahora, sin conocer el estado real de policies/GRANTs, sería exactamente lo que el brief prohíbe ("no ejecutar ninguna corrección a ciegas", "no inventes policies", "no supongas el estado de la base de datos"). La sección 3 de este informe da las consultas exactas que hay que correr en el SQL Editor de Supabase; con esos resultados, el Sprint puede continuar directamente hacia el SQL de corrección, sin repetir esta auditoría.

---

## 1. Auditoría previa — qué puede responderse desde este repositorio (sin acceso en vivo)

### 1.1 ¿RLS está habilitado en `tiendas`/`empresas`?

**Documentado que sí, en ambos casos**, desde hace varios Sprints:

- `src/repositories/tiendas.repository.ts` (JSDoc, líneas 10-11): *"Nota heredada de la auditoría: `tiendas` tiene RLS habilitado sin policies propias."*
- `src/repositories/empresas.repository.ts` (JSDoc, líneas 6-9): *"Nota heredada de la auditoría: `empresas` tiene RLS habilitado sin policies propias... este repositorio queda listo tipográficamente, pendiente de esa decisión de backend."*
- `docs/database/DATABASE_INVENTORY.md` §2.1 (`empresas`) y §2.2 (`tiendas`): ambas tablas listadas con **"Policies: 0 ⚠️"**, en el contexto de un inventario que sí confirma RLS habilitado tabla por tabla contra un `pg_dump` real de Producción.

Esta parte de la pregunta 1 (RLS habilitado = sí) se considera confirmada con evidencia documental consistente y repetida, sin ninguna fuente que la contradiga.

### 1.2 / 1.3 ¿Qué policies existen hoy, y qué comandos cubren?

**No verificable con certeza desde este entorno.** La evidencia disponible (`DATABASE_INVENTORY.md`) dice "0 policies" para ambas tablas -- pero esa auditoría es anterior al cierre del Sprint 4.2.1, en el que el propio usuario confirmó (`SPRINT_4_2_1_AUTH_REPORT.md` §12.2) haber hecho cambios manuales de RLS/GRANT directamente en el Dashboard de Supabase, **confirmados solo para `admins`**, con la nota explícita: *"No hay confirmación explícita de que se haya hecho lo mismo para `coordinadores`/`empresas`/`tiendas` -- se recomienda verificar esos 3 casos también."* Ningún informe posterior a esa fecha (incluida la auditoría exhaustiva del Sprint 5.2.3.3, que llegó a la misma causa raíz) encontró evidencia de que esa verificación se haya hecho. **Por lo tanto: el estado real de policies sobre `tiendas`/`empresas` hoy es desconocido con certeza -- puede seguir en cero, o puede haberse corregido sin que quedara documentado.** No se asume ninguna de las dos posibilidades.

### 1.4 ¿Qué rol puede ejecutarlas?

No aplica de forma independiente -- depende de la respuesta 1.2/1.3 (no hay policies confirmadas que auditar por rol). Lo que sí es evidencia firme: el flujo real de la aplicación (`profile.service.ts` → `resolveTiendaNombre()`/`resolveEmpresaNombre()`) siempre consulta con el rol Postgres `authenticated` (JWT de sesión vía `anon` key + `supabase.auth`, nunca `service_role` en el frontend -- confirmado por búsqueda en `src/` en el Sprint 5.2.2.2). Los roles `anon`/`service_role`/`postgres` no son relevantes para este Sprint: `anon` porque ningún flujo de Coordinador opera sin sesión; `service_role` porque nunca se usa desde `src/`; `postgres` porque es el owner del esquema, con privilegios implícitos.

### 1.5 ¿Existe algún GRANT faltante?

**Tampoco verificable con certeza.** Mismo razonamiento que 1.2/1.3: ninguna migración de este repositorio (`0001_initial_schema.sql`, `0002_auth_roles_rls.sql`, ni sus versiones `legacy/`) contiene jamás un `GRANT`/`REVOKE` para ninguna tabla -- confirmado por búsqueda exhaustiva en el Sprint 5.2.2.2 (mismo patrón: los privilegios de tabla para `authenticated` se aplican manualmente en el Dashboard, nunca se formalizan como migración). Es decir: **incluso si no hiciera falta ninguna policy nueva, tampoco hay ninguna fuente en este repositorio que confirme que el GRANT de tabla (`SELECT ON tiendas/empresas TO authenticated`) ya existe** -- el error observado (`tiendaNombre = null`, sin ningún `42501` reportado por el usuario) es consistente con "hay GRANT pero no hay policy" (0 filas devueltas, sin error), pero no permite descartar por sí solo "no hay GRANT tampoco" salvo por el hecho de que no se reportó ningún error 42501 en esa consulta específica -- solo un valor `null` silencioso, que es exactamente el comportamiento esperado de RLS sin policy con GRANT ya presente. Esta inferencia se documenta como razonable, no como certeza.

### Nota adicional, fuera del alcance directo de este Sprint pero relevante para no repetir esta misma auditoría dos veces

El Sprint 5.2.3.3 dejó abierta la misma pregunta para `coordinadores` (¿tiene policy de auto-lectura `id = auth.uid()`, o no?) -- necesaria para saber si `tiendaId`/`empresaId` (columnas propias, no dependientes de `tiendas`/`empresas`) son en verdad confiables o si su funcionamiento observado en Sprints anteriores depende de algo no documentado. Este Sprint, por alcance explícito ("NO modificar `coordinadores`"), no propone ningún cambio ahí -- pero la consulta de auditoría (sección 3) se ofrece también para esa tabla, solo para lectura/confirmación, sin proponer ninguna corrección sobre ella en esta ronda.

---

## 2. Diseño de la solución — preliminar, condicionado a los resultados de la sección 3, **no ejecutable todavía**

Sin conocer el estado real de policies, no se puede finalizar el SQL. Se documentan aquí, solo como análisis preparatorio (para no perder tiempo en una segunda ronda de razonamiento), las dos familias de solución posibles según el patrón de negocio ya confirmado por el código real:

**Opción A -- policy con alcance ("scoped"), no `USING (true)`.** El único consumo real de `tiendasRepository.getById()`/`empresasRepository.getById()` desde `profile.service.ts` es: *"un Coordinador/Admin/Instalador autenticado necesita leer el nombre de su propia tienda/empresa, nunca de otra."* Esto sugiere una policy `FOR SELECT` con `USING` acotado a las filas donde el `id` de la tienda/empresa coincide con la de alguna fila propia del usuario en `coordinadores`/`admins`/`instaladores` -- por ejemplo (**boceto, no confirmado, no ejecutar**):

```sql
-- BOCETO -- requiere confirmar contra el modelo real antes de usarse
create policy "usuario lee su propia tienda"
  on public.tiendas for select
  to authenticated
  using (
    exists (select 1 from coordinadores where coordinadores.id = auth.uid() and coordinadores.tienda_id = tiendas.id)
  );
```

**Opción B -- catálogo de lectura abierta (`USING (true)`), con justificación documental.** Existe evidencia de que otras pantallas ya aprobadas (`MasterCalendar`, `AdminInstaladores`, Sprint 3.13/3.14) asumen poder listar/mostrar nombres de tienda sin ningún filtro por pertenencia -- es decir, el modelo de negocio de este proyecto, hasta donde el frontend ya construido lo revela, trata `tiendas`/`empresas` como catálogos de solo lectura, visibles para cualquier usuario autenticado, no como datos sensibles por fila. Si esto se confirma como la intención real de negocio, `USING (true)` sería la solución más simple y consistente con el resto de la aplicación ya construida -- pero el brief exige justificarlo explícitamente antes de usarlo, no asumirlo por conveniencia; esa confirmación debe venir del usuario, no inferirse unilateralmente aquí.

**Ninguna de las dos opciones se ejecuta en esta ronda.** La elección entre A y B, y el SQL final exacto, se completan en la continuación de este Sprint una vez conocido el resultado real de las consultas de la sección 3 (en particular, si ya existe alguna policy parcial que deba respetarse/no duplicarse -- el propio brief prohíbe crear policies nuevas "por intuición" y exige no eliminar ninguna existente).

---

## 3. Consultas SQL exactas a ejecutar en el SQL Editor de Supabase

Copiar y ejecutar tal cual, contra el proyecto real de Producción. Ninguna de estas consultas modifica nada (solo lectura de catálogo) -- son seguras de ejecutar sin riesgo.

```sql
-- 3.1 — ¿RLS habilitado? (confirma/refuta la sección 1.1 contra el estado actual)
select relname as tabla, relrowsecurity as rls_habilitado, relforcerowsecurity as rls_forzado
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('tiendas', 'empresas', 'coordinadores');

-- 3.2 — Policies existentes (nombre, comando, roles, condición) — responde 1.2/1.3/1.4
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename in ('tiendas', 'empresas', 'coordinadores')
order by tablename, policyname;

-- 3.3 — GRANTs de tabla por rol — responde 1.5
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('tiendas', 'empresas', 'coordinadores')
order by table_name, grantee, privilege_type;
```

Con el resultado de estas 3 consultas (puede ser una captura de pantalla o el resultado pegado como texto/CSV), este Sprint puede continuar directamente hacia el diseño final y `SPRINT_5_2_3_4_RLS_MASTER_TABLES_FIX.sql`, sin necesidad de repetir la auditoría.

---

## 4. Validaciones que documentará la corrección final (una vez exista el SQL)

Sin variación respecto a lo ya anticipado por el brief -- se listan aquí para que la continuación del Sprint no tenga que re-derivarlas:

- `SELECT` directo contra `tiendas`/`empresas` como `authenticated` (antes/después del fix, igual que el patrón ya usado en `SPRINT_5_2_2_2_SQL_GRANTS_FIX.sql`).
- `resolveTiendaNombre()`/`resolveEmpresaNombre()` (`profile.service.ts`) devolviendo un string real, no `null`, para un Coordinador real.
- `resolveProfile()` completo devolviendo `tiendaNombre`/`empresaNombre` no nulos.
- Inicio de sesión de un Coordinador real, sin ningún cambio de código adicional.
- Selector "Sucursal activa" -- debe mostrar únicamente la tienda real habilitada, ya no las 9 deshabilitadas (mecanismo ya correcto desde los Sprints 5.2.3.1/5.2.3.2, sección 0 de este informe y `SPRINT_5_2_3_3_COORDINATOR_OPERATIONAL_CONTEXT_AUDIT.md`).
- Modal "Publicar trabajo" -- debe permitir el envío con la tienda real preseleccionada.

Ninguna de estas validaciones debería requerir tocar `OperationalContextProvider`/`RootLayout`/`CoordinatorLayout`/`SucursalSelect`/`PublishModal` -- si al validar apareciera la necesidad de tocar alguno de ellos, este Sprint se detendría de nuevo y lo reportaría antes de modificar nada, tal como exige el brief.

---

## 5. Confirmación de restricciones respetadas en esta ronda

✓ No se modificó ningún archivo de `src/`. ✓ No se modificó `OperationalContextProvider`/`CoordinatorLayout`/`PublishModal`/`SucursalSelect`. ✓ No se creó ninguna policy "por intuición". ✓ No se usó `USING (true)` de forma ejecutada (solo se documentó como opción B, sin ejecutar, sujeta a confirmación explícita del usuario). ✓ No se eliminó ninguna policy existente (no se tocó SQL alguno). ✓ No se modificó `trabajos`/`trabajo_instaladores`/`coordinadores`/Auth. ✓ No se generó SQL de corrección sin evidencia en vivo -- se detuvo exactamente donde el propio brief lo exige.
