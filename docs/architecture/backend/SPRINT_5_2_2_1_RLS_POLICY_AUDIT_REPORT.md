# Sprint 5.2.2.1 Fix — Auditoría y corrección de RLS Policies de `trabajos`

## 0. Nota de trazabilidad y limitación de entorno (léase antes que el resto del reporte)

Este entorno de trabajo **no tiene acceso de red al proyecto real de Supabase** (mismo bloqueo documentado en cada Sprint anterior de esta Fase) — no fue posible ejecutar `SELECT * FROM pg_policies WHERE tablename IN ('trabajos','trabajo_instaladores','coordinadores');` contra la base de datos real, y ningún archivo de este repositorio conserva el texto SQL literal (`CREATE POLICY ... USING (...) WITH CHECK (...)`) de las policies REALES actualmente desplegadas.

Lo que sí existe, y es la base de esta auditoría, es `docs/database/DATABASE_INVENTORY.md` — un inventario real (no legacy) generado en un Sprint anterior (Fase 4) a partir de una introspección real de este mismo proyecto de Supabase (`schemaname`/`tablename`/nombres de policy/comando/alcance para las 14 policies reales de `public`, confirmado por su propio encabezado: "todo lo que sigue... fue diseñado específicamente para este proyecto"). Ese documento describe el **nombre, comando y alcance resumido** de cada policy, pero no preserva el texto SQL byte-a-byte de cada `USING`/`WITH CHECK`.

Por lo tanto, esta auditoría identificó la policy y la causa de la recursión **con alta confianza, mediante razonamiento técnico sobre evidencia real y documentada** (sección 3) — no mediante una lectura directa del SQL en vivo, en el momento en que se escribió por primera vez.

**Actualización — confirmación del usuario (misma fecha, ronda siguiente)**: el usuario ejecutó por su cuenta la consulta de solo lectura de la sección 3.1 contra `pg_policies` real y confirmó explícitamente que "el diagnóstico de recursión quedó confirmado". Esto valida la ESTRUCTURA diagnosticada (el ciclo `trabajos` ⇄ `trabajo_instaladores` descrito en las secciones 1-4) contra la base de datos real. Sigue sin haberse compartido en esta sesión el texto `qual`/`with_check` byte-a-byte de la policy "instaladores ven trabajos donde fueron notificados" -- el SQL corregido de la sección 6 reproduce la MISMA condición ya documentada (EXISTS contra `trabajo_instaladores` por `trabajo_id`+`instalador_id`), envuelta en una función `SECURITY DEFINER`. Si la policy real tuviera alguna condición adicional no capturada en el inventario (p. ej. un filtro adicional por `estado`), debe incorporarse dentro del cuerpo de la función de la sección 6 antes de ejecutar -- se señala explícitamente en la sección 8 (Riesgos) para que no pase inadvertido. Se documenta así, en vez de presentar el SQL como una transcripción literal verificada, por el mismo criterio de honestidad ya aplicado en cada Sprint anterior de este proyecto.

**Se descartan como fuente para esta auditoría** (por las mismas razones ya documentadas en el Sprint 5.2.2.1 anterior): `supabase/migrations/0001_initial_schema.sql`/`0002_auth_roles_rls.sql` y `docs/architecture/database/handymax_schema_v3.sql` — los 3 describen un esquema **legacy** (`usuarios` unificada, `sucursales`, `bids`, `trabajos.phase`) que ya no coincide con el esquema real (`trabajos`/`tiendas`/`coordinadores`/`instaladores`/`admins`, confirmado contra `database.generated.ts`). Se usan únicamente como referencia de **patrones de diseño** (ver sección 5), nunca como fuente de la policy real.

## 1. Resumen técnico

El error `42P17 infinite recursion detected in policy for relation "trabajos"` no es un bug de React/Vite/`CoordinatorLayout`/`PublishModal`/`trabajosRepository` (los 4 ya se auditaron y descartaron explícitamente en el Sprint 5.2.2.1 — el INSERT llega correctamente formado hasta Supabase). Es un defecto estructural de las RLS Policies reales de `public`: **existe una dependencia circular de dos vías entre las policies de `trabajos` y las de `trabajo_instaladores`** — una policy de `trabajos` consulta `trabajo_instaladores` para decidir visibilidad, y las policies de `trabajo_instaladores` consultan `trabajos` (unido con `coordinadores`) para decidir la suya. PostgreSQL detecta este ciclo al expandir/planificar las policies aplicables a `trabajos` (necesario incluso para un `INSERT ... RETURNING`, ya que el `RETURNING` requiere aplicar también las policies `SELECT` de la tabla) y aborta con `42P17` en vez de entrar en un bucle infinito real.

## 2. Diagrama del flujo de evaluación RLS

```
INSERT INTO trabajos (...) RETURNING *        [trabajosRepository.create(), sin cambios]
         │
         ▼
Postgres debe planificar el acceso RLS a "trabajos" para:
  (a) el INSERT en sí -> WITH CHECK de las policies FOR INSERT/ALL de "trabajos"
  (b) el RETURNING     -> USING de las policies FOR SELECT/ALL de "trabajos"
         │
         ▼
Para (b), Postgres debe expandir TODAS las policies SELECT de "trabajos",
incluida la política #9 (ver inventario, sección 3):

  Policy #9 "instaladores ven trabajos donde fueron notificados" (trabajos, SELECT)
    USING ( ... EXISTS (SELECT 1 FROM trabajo_instaladores WHERE ...) ... )
         │
         ▼   para planificar ESA subconsulta, Postgres debe aplicar
             las policies RLS de "trabajo_instaladores" (no hay función
             SECURITY DEFINER que evite esto -- confirmado, sección 9 del
             inventario: "0 funciones SECURITY DEFINER de negocio")
         │
         ▼
  Policies #10/#11/#12 "gestión de notificaciones por coordinadores"
  (trabajo_instaladores, UPDATE/INSERT/SELECT)
    USING/WITH CHECK ( ... EXISTS (
        SELECT 1 FROM trabajos t JOIN coordinadores c ON ...
        WHERE t.id = trabajo_instaladores.trabajo_id ...
    ) ... )
         │
         ▼   para planificar ESA subconsulta, Postgres debe volver a
             aplicar las policies RLS de "trabajos"...
         │
         └──────────────► CICLO: de vuelta al punto de partida
                            (expandir "trabajos" otra vez)
         │
         ▼
   PostgreSQL detecta que ya está expandiendo "trabajos" más arriba en la
   misma cadena de planificación → 42P17 "infinite recursion detected in
   policy for relation trabajos" (se reporta sobre "trabajos" porque es la
   relación cuya expansión estaba en curso cuando se detectó el ciclo -- el
   INSERT original).
```

Nota importante: este ciclo se dispara al planificar el acceso a `trabajos`, **antes** de que importe qué rol tiene la sesión actual (coordinador/instalador/admin). Por eso el Coordinador ve exactamente el mismo error `42P17` al publicar (INSERT+RETURNING) que vería cualquier rol al hacer un simple `SELECT * FROM trabajos` — la recursión es un defecto de la definición de las policies, no del permiso específico de un rol.

## 3. Identificación de la Policy problemática

**CONFIRMADO por el usuario** contra `pg_policies` real (ver actualización en la sección 0). Las 2 policies (de 2 tablas distintas) que forman el ciclo:

1. `trabajos` → **"instaladores ven trabajos donde fueron notificados"** (SELECT) — consulta `trabajo_instaladores` (`docs/database/DATABASE_INVENTORY.md`, fila 9 de la tabla de la sección 8, y fila 46 de la sección 1: `ofertas`/`trabajo_instaladores` referencian `trabajos(id)`).
2. `trabajo_instaladores` → **las 3 policies de "gestión de notificaciones por coordinadores"** (UPDATE/INSERT/SELECT, filas 10/11/12 de esa misma tabla) — consultan `trabajos` unido con `coordinadores` ("scoped vía `trabajos → coordinadores` empresa chain").

Ninguna otra combinación de las 14 policies reales forma un ciclo de 2 vías: las demás o bien no tienen subconsulta (`columna = auth.uid()`), o consultan `coordinadores` en una sola dirección (`coordinadores` tiene **0 policies propias** — sección 8 del inventario, "Tablas con RLS habilitado pero cero policies: `admins`, `coordinadores`, `empresas`, `tiendas`" — no hay forma de que una consulta a `coordinadores` regrese a consultar `trabajos`, es un callejón sin salida, no un ciclo).

### 3.1 Consulta de confirmación (ya ejecutada por el usuario)

```sql
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('trabajos', 'trabajo_instaladores', 'coordinadores')
order by tablename, cmd, policyname;
```

Lectura del catálogo del sistema (`pg_policies`), sin efectos secundarios. El usuario la ejecutó contra el proyecto real y confirmó que coincide con el diagnóstico de esta sección.

## 4. Explicación técnica de la recursión

PostgreSQL, al planificar cualquier operación sobre una tabla con RLS, debe combinar (con `OR`) las expresiones `USING`/`WITH CHECK` de **todas** las policies aplicables a esa combinación de comando+rol — esto ocurre en la fase de **reescritura/planificación** de la consulta, antes de que el ejecutor pueda aplicar cortocircuito booleano basado en datos reales (p. ej., "esta sesión es coordinador, no instalador, así que esta rama nunca aplica"). Cuando una de esas expresiones contiene una subconsulta a otra tabla (`trabajo_instaladores`), Postgres debe expandir también las policies de ESA tabla para poder planificar la subconsulta — y si esas policies, a su vez, subconsultan la tabla original (`trabajos`), Postgres detecta que ya tiene una expansión de `trabajos` "en curso" más arriba en la misma cadena de planificación, y aborta con `42P17` en vez de expandir indefinidamente.

Esto explica por qué el error aparece específicamente en un `INSERT ... RETURNING`: el `RETURNING` obliga a Postgres a aplicar también las policies **SELECT** de `trabajos` (para decidir qué columnas/filas de la fila recién insertada puede ver quien la insertó) — y es justamente la policy SELECT #9 ("instaladores ven trabajos...") la que inicia el ciclo. Un `INSERT` sin `RETURNING` (hipotéticamente) podría no disparar este ciclo si ninguna policy de `INSERT`/`WITH CHECK` de `trabajos` subconsultara `trabajo_instaladores` — pero `trabajosRepository.create()` (Sprint 5.2.2.1, sin cambios en este Sprint) sí usa `.select().single()`, por lo que el `RETURNING` es parte necesaria del flujo actual.

No es un problema de datos, de permisos mal configurados, ni de que el Coordinador "no debería" poder publicar — es un defecto puramente estructural en cómo estas 2 policies se definieron, independiente de qué usuario ejecute la operación.

## 5. SQL original

**No disponible como texto literal en este entorno** (ver sección 0). Reconstrucción de la **estructura** (no el texto exacto) a partir del inventario real y del patrón de diseño ya usado en el resto del proyecto para subconsultas correlacionadas (`docs/database/DATABASE_INVENTORY.md` §2.4: "`coordinadores` se usa constantemente en subqueries correlacionadas... típicamente `EXISTS (SELECT 1 FROM coordinadores WHERE coordinadores.id = auth.uid() AND coordinadores.empresa_id = ...)`"):

```sql
-- trabajos -- policy #9 (estructura reconstruida, no el texto literal)
CREATE POLICY "instaladores ven trabajos donde fueron notificados"
    ON trabajos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM trabajo_instaladores ti
            WHERE ti.trabajo_id = trabajos.id
            AND ti.instalador_id = auth.uid()
        )
    );

-- trabajo_instaladores -- policies #10/#11/#12 (estructura reconstruida)
CREATE POLICY "coordinadores gestionan notificaciones de su empresa" -- (nombre real desconocido)
    ON trabajo_instaladores FOR ALL  -- o 3 policies separadas UPDATE/INSERT/SELECT
    USING (
        EXISTS (
            SELECT 1 FROM trabajos t
            JOIN coordinadores c ON c.empresa_id = t.empresa_id
            WHERE t.id = trabajo_instaladores.trabajo_id
            AND c.id = auth.uid()
        )
    );
```

**El defecto estructural, en cualquier variante literal que tengan estas 2 policies**: ambas subconsultan la tabla "del otro lado" del ciclo bajo el régimen de permisos normal del invocador (sin ninguna función `SECURITY DEFINER` de por medio, confirmado — sección 9 del inventario: "0 funciones SECURITY DEFINER de negocio"), lo cual obliga a Postgres a re-expandir esa tabla, cerrando el ciclo.

## 6. SQL corregido (confirmado — listo para ejecutar en producción)

**Estrategia**: romper el ciclo insertando **una única función `SECURITY DEFINER`** en el lado de `trabajos` (policy #9) — la misma técnica que el propio proyecto ya usaba en el esquema legacy para exactamente este propósito ("funciones `SECURITY DEFINER` como `get_my_rol()`/`is_admin()`... permiten checks de policy entre tablas sin volver a disparar RLS", `0002_auth_roles_rls.sql`, sección 5). Una función `SECURITY DEFINER` ejecuta su cuerpo con los privilegios de quien la creó (normalmente el owner de la base, con acceso irrestricto), por lo que la subconsulta interna a `trabajo_instaladores` deja de estar sujeta a las policies de esa tabla — rompe el ciclo en ese único punto, sin tocar el otro lado (las 3 policies de `trabajo_instaladores`, que pueden seguir subconsultando `trabajos` con normalidad, ya que `trabajos` ya no necesita volver a subconsultar `trabajo_instaladores` bajo RLS del invocador).

```sql
-- 1. Función SECURITY DEFINER — única pieza nueva. Sin lógica de negocio
--    nueva: hace exactamente el mismo chequeo que ya hacía la policy,
--    solo que ahora corre sin re-disparar RLS de trabajo_instaladores.
CREATE OR REPLACE FUNCTION public.instalador_fue_notificado(p_trabajo_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM trabajo_instaladores ti
        WHERE ti.trabajo_id = p_trabajo_id
        AND ti.instalador_id = auth.uid()
    );
$$;

-- Restringir quién puede ejecutar la función (buena práctica con
-- SECURITY DEFINER: no dejarla abierta a roles que no la necesitan).
REVOKE ALL ON FUNCTION public.instalador_fue_notificado(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.instalador_fue_notificado(uuid) TO authenticated;

-- 2. Reemplazar la policy #9 de "trabajos" para usar la función en vez
--    de la subconsulta directa -- MISMO alcance/resultado para el
--    instalador, cero cambio de comportamiento visible.
DROP POLICY IF EXISTS "instaladores ven trabajos donde fueron notificados" ON trabajos;
CREATE POLICY "instaladores ven trabajos donde fueron notificados"
    ON trabajos FOR SELECT
    USING ( public.instalador_fue_notificado(id) );

-- Las policies #6/#7/#8 (coordinadores, sobre "trabajos") y #10/#11/#12
-- (coordinadores, sobre "trabajo_instaladores") NO se tocan -- no forman
-- parte del ciclo, y "coordinador únicamente publica trabajos de su
-- tienda" depende exclusivamente de #7 ("coordinadores publican en su
-- tienda"), sin relación con esta corrección.
```

**Verificación previa recomendada (30 segundos, antes de ejecutar)**: comparar la condición `EXISTS (...)` de arriba contra el `qual` real que ya viste en `pg_policies` para "instaladores ven trabajos donde fueron notificados". Si el real tiene alguna condición adicional (p. ej. un filtro por `estado`/vigencia), agrégala dentro del cuerpo de `instalador_fue_notificado()` antes de ejecutar, para que el reemplazo sea 100% equivalente y no una versión más permisiva o más restrictiva que la original.

**Rollback (si algo sale mal)** — revierte la policy a su forma reconstruida original (sin la función) y elimina la función:

```sql
DROP POLICY IF EXISTS "instaladores ven trabajos donde fueron notificados" ON trabajos;
CREATE POLICY "instaladores ven trabajos donde fueron notificados"
    ON trabajos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM trabajo_instaladores ti
            WHERE ti.trabajo_id = trabajos.id
            AND ti.instalador_id = auth.uid()
        )
    );

DROP FUNCTION IF EXISTS public.instalador_fue_notificado(uuid);
```

**Nota**: este rollback restaura el mismo defecto (la recursión), no es una reversión "segura" en el sentido de dejar el sistema mejor — solo es útil si el nuevo SQL introdujera algún otro problema y hiciera falta volver exactamente al punto de partida para depurar.

**Alternativa equivalente** (si resulta más simple envolver el otro lado del ciclo): aplicar el mismo patrón `SECURITY DEFINER` a la subconsulta `trabajos → coordinadores` dentro de las 3 policies de `trabajo_instaladores`, dejando intacta la policy #9 de `trabajos`. Ambas alternativas rompen el mismo ciclo — se recomienda la primera (una sola función, una sola policy reemplazada) por tener el radio de cambio más pequeño.

## 7. Justificación técnica

- **Por qué una función `SECURITY DEFINER` y no reescribir la lógica de negocio**: es exactamente el mecanismo que Postgres/Supabase recomienda para este defecto exacto (dependencia circular entre RLS de 2 tablas) — no cambia QUÉ puede ver cada rol, solo CÓMO Postgres evalúa ese chequeo internamente (con privilegios elevados solo para esa subconsulta puntual, no para toda la sesión). El propio proyecto ya usaba este patrón en el esquema legacy para el mismo propósito general (evitar que un chequeo cruzado entre tablas dispare RLS de nuevo).
- **Por qué se rompe el ciclo en el lado de `trabajos`/instaladores y no en el de `trabajo_instaladores`/coordinadores**: cualquiera de los 2 lados rompe el ciclo (basta con que UNA de las 2 direcciones dejе de re-disparar RLS) — se elige el lado de instaladores porque es una única policy (menor superficie de cambio) contra 3 policies del otro lado.
- **Por qué no se modifica ninguna policy de `coordinadores`/`empresas`/`tiendas`/`admins`**: esas 4 tablas tienen RLS con 0 policies -- ya bloqueadas por completo para `authenticated` (un problema real, distinto, ya documentado como pendiente en `PROJECT_STATUS.md`/`profile.service.ts` desde el Sprint 4.2.1) — no forman parte de ESTE ciclo (no hay ninguna policy en ellas que pueda recursar) y tocarlas está fuera del alcance explícito de este Sprint.
- **Por qué no se usa `DISABLE ROW LEVEL SECURITY` ni un bypass de `service_role`**: prohibido explícitamente por este brief, y además no resuelve el defecto — solo lo oculta (cualquier consulta futura que vuelva a depender de RLS real seguiría teniendo el mismo ciclo latente).
- **Por qué no se cambia el modelo de permisos** ("Coordinador únicamente publica trabajos de su tienda"): la policy de INSERT del Coordinador (#7, "coordinadores publican en su tienda") no se toca — el fix es exclusivamente sobre la policy SELECT de instaladores (#9) y su interacción con `trabajo_instaladores`.

## 8. Riesgos

- **Alcance de `SECURITY DEFINER`**: cualquier función con este atributo ejecuta con privilegios elevados — se mitiga restringiendo `search_path` (evita "search path hijacking") y revocando `EXECUTE` de `public`, dejándolo solo para `authenticated` (mismo criterio ya usado en el `rls_auto_enable()` real de Producción, que también es `SECURITY DEFINER` por necesidad).
- **El SQL de la sección 6 reproduce la estructura ya documentada/confirmada, no una transcripción literal verificada byte-a-byte en esta sesión** — si la policy real tuviera alguna condición adicional no capturada en el inventario (p. ej. un filtro por `estado`/vigencia del trabajo), el reemplazo sería más permisivo o más restrictivo que el original. Mitigado con el paso de "Verificación previa recomendada" de la sección 6 (comparar contra el `qual` real ya visto en `pg_policies` antes de ejecutar).
- **Impacto si el ciclo real involucra una tercera tabla no identificada aquí** (posible pero de baja probabilidad dado el inventario de 14 policies ya documentado, y descartado por el usuario tras revisar `pg_policies` completo): ninguna acción adicional si el diagnóstico ya confirmado (sección 3) es efectivamente el único ciclo presente.
- **Ningún riesgo para el modelo de permisos de Coordinador/Admin** (ver secciones 10/11) — el cambio propuesto no altera ninguna condición de acceso, solo el mecanismo de evaluación de una de ellas.

## 9. Validación esperada

Este entorno de trabajo no tiene acceso de red a Supabase — no es posible ejecutar la función/policy propuestas aquí ni confirmar en vivo que el `42P17` desaparece. Validación esperada, a ejecutar por el usuario tras aplicar el SQL de la sección 6 (una vez confirmado contra el texto real de la sección 3.1):

1. `select public.instalador_fue_notificado('00000000-0000-0000-0000-000000000000'::uuid);` — debe ejecutar sin error (confirma que la función compila y es invocable).
2. Repetir la publicación de un trabajo real con el usuario Coordinador ya sembrado (mismo flujo de `onPublish`/`trabajosRepository.create()`, sin ningún cambio de frontend) — el `INSERT ... RETURNING` debe completar sin `42P17` y devolver la fila creada.
3. Confirmar que un usuario Instalador real (si existe uno de prueba) sigue viendo únicamente los trabajos donde fue notificado (mismo resultado que antes del fix — la función reproduce exactamente el mismo chequeo, solo que sin recursión).
4. `select * from pg_policies where tablename = 'trabajos' and policyname = 'instaladores ven trabajos donde fueron notificados';` — confirmar que la nueva definición quedó activa.

## 10. Impacto sobre Coordinadores

Ninguno. Las 3 policies de Coordinador sobre `trabajos` (#6 SELECT, #7 INSERT, #8 UPDATE, todas "tienda propia") no se modifican. El modelo "Coordinador únicamente publica trabajos de su tienda" queda exactamente igual. El `INSERT` que hoy falla con `42P17` debería completarse con éxito tras este fix, sin ningún cambio en qué coordinador puede publicar qué.

## 11. Impacto sobre Administradores

Ninguno directo de este fix — la rama "si admin" de la policy SELECT #6 (`coordinadores.rol = 'admin'`) no se toca. Se deja constancia (sin resolverlo en este Sprint, fuera de su alcance) de un riesgo YA documentado en Sprints anteriores: un `admin` real (tabla `admins`) que publique un trabajo en "Modo Coordinador" (`AdminVistaSwitch`) seguiría dependiendo de la policy #7 ("coordinadores publican en su tienda"), que exige que `auth.uid()` sea una fila de `coordinadores` — sin relación con la recursión de este Sprint, y sin ninguna decisión tomada todavía sobre ese caso (ver `SPRINT_5_2_2_1_SUPABASE_PUBLISH_REPORT.md`, sección 0).

## 12. Confirmación de que no hubo cambios en el frontend

Confirmado — este Sprint es exclusivamente SQL/documentación. No se tocó ningún archivo de `src/` (`CoordinatorLayout.tsx`, `PublishModal`, `trabajosRepository`, hooks, Contexts, `ActiveJob`, UI, componentes: cero cambios). No se agregó ni removió ninguna instrumentación temporal de diagnóstico en el frontend — el diagnóstico completo de este Sprint se hizo por lectura de documentación real ya existente (`docs/database/DATABASE_INVENTORY.md`) y razonamiento técnico sobre el comportamiento de PostgreSQL, no por instrumentar código React.

**Pendiente para cerrar este Sprint**: que el usuario ejecute el SQL de la sección 6 contra producción (tras el paso de "Verificación previa recomendada" de esa misma sección) y confirme que la publicación de un trabajo real con el Coordinador ya sembrado completa sin `42P17` (ver "Validación esperada", sección 9, puntos 1-4) — esta ejecución/confirmación final corresponde al entorno del usuario, ya que este entorno de trabajo no tiene acceso de red a Supabase para ejecutarla ni verificarla.
