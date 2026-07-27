# Sprint 5.2.3.4 — Corrección RLS únicamente para `public.tiendas`

**Tipo de Sprint**: corrección de backend (RLS), exclusivamente sobre `public.tiendas`. **Ningún archivo de `src/` fue tocado.** SQL ejecutable en `docs/architecture/backend/SPRINT_5_2_3_4_RLS_TIENDAS_FIX.sql` -- este documento explica esa corrección; el SQL no fue ejecutado desde este entorno (sin acceso de red a Supabase, igual que en todos los Sprints anteriores) y queda pendiente de que el usuario lo corra en el SQL Editor.

## 1. Auditoría obligatoria previa (confirmación de los 5 puntos pedidos por el brief)

Basado exclusivamente en la evidencia que el usuario obtuvo directamente de Producción (3 consultas ejecutadas por el usuario, resultado pegado en el brief de esta ronda) -- no se re-audita nada que ya venga confirmado con evidencia real, tal como pide el brief ("Revisar nuevamente toda la evidencia entregada").

1. **RLS habilitado** -- confirmado en las 3 tablas relevantes: `coordinadores` (`RLS = true`), `empresas` (`RLS = true`), `tiendas` (`RLS = true`). Coincide con la documentación previa del repositorio (`DATABASE_INVENTORY.md`), sin contradicción.
2. **`empresas` NO requiere cambios** -- confirmado: la auditoría en vivo encontró una policy real y activa ("usuarios autenticados pueden leer empresas"). Este Sprint no la toca.
3. **`coordinadores` NO requiere cambios** -- confirmado: la auditoría en vivo encontró una policy real y activa ("coordinadores leen su perfil") -- esto también resuelve, de paso, la ambigüedad documental que había quedado abierta desde el Sprint 5.2.3.3 sobre si un Coordinador podía leer su propia fila: **sí puede**, hay policy vigente. Este Sprint no la toca.
4. **GRANT NO requiere cambios** -- confirmado: `authenticated` ya tiene `SELECT` sobre las 3 tablas (`coordinadores`, `empresas`, `tiendas`). El problema nunca fue de privilegios de tabla (capa evaluada antes que RLS, como ya se documentó para el caso de `trabajos` en el Sprint 5.2.2.2) -- es exclusivamente de RLS. Este Sprint no toca ningún GRANT.
5. **El único cambio necesario es sobre `public.tiendas`** -- confirmado: es la única de las 3 tablas donde la auditoría en vivo encontró "❌ NO EXISTE ninguna policy", a pesar de tener RLS habilitado y el GRANT ya presente. Esa combinación (RLS habilitado + GRANT presente + cero policies) es exactamente la que produce "0 filas devueltas, sin error" -- el comportamiento observado (`tiendaNombre = null`, sin ningún `42501` reportado por el usuario en ningún momento de esta serie de Sprints).

## 2. Causa raíz (confirmada, no repetida desde cero -- ver también Sprint 5.2.3.3)

`profile.service.ts` → `resolveTiendaNombre(tienda_id)` → `tiendasRepository.getById()` ejecuta `SELECT * FROM tiendas WHERE id = $1` como `authenticated`. Con RLS habilitado y sin ninguna policy que autorice ese `SELECT`, Postgres deniega por defecto -- no lanza error (el GRANT de tabla ya está presente, por eso nunca se vio un `42501` en este punto), simplemente no devuelve filas. `.maybeSingle()` traduce eso a `data: null`, y ese `null` se propaga sin ninguna transformación por las capas ya trazadas en el Sprint 5.2.3.3: `profile.tiendaNombre` → `OperationalContextValue.tiendaNombre` (passthrough) → `CoordinatorLayout.sucursalLockValue = ''` → `SucursalSelect`/`PublishModal` deshabilitan las 9 opciones → `PublishForm.sucursal` forzado a `''` → validación rechaza el envío siempre. Confirmado el diagnóstico: el problema nunca estuvo en React/`OperationalContext`/`CoordinatorLayout`/`PublishModal`/los Providers -- exclusivamente en la ausencia de esta policy.

## 3. Evidencia utilizada

Evidencia en vivo (Producción, aportada por el usuario en el brief de esta ronda): resultado de `RLS habilitado` (`pg_class.relrowsecurity`), resultado de `Policies existentes` (equivalente a `pg_policies`, por nombre) y resultado de `GRANTS` (equivalente a `information_schema.role_table_grants`), para `coordinadores`/`empresas`/`tiendas`. Evidencia de código, ya citada línea por línea en el Sprint 5.2.3.3: `profile.service.ts`, `tiendas.repository.ts`, `OperationalContextProvider.tsx`, `CoordinatorLayout.tsx`, `sucursal-select.tsx`, `publish-modal.tsx` -- no se vuelve a citar aquí en extenso para no duplicar ese informe; ver `SPRINT_5_2_3_3_COORDINATOR_OPERATIONAL_CONTEXT_AUDIT.md` para el detalle completo.

## 4. SQL generado

`docs/architecture/backend/SPRINT_5_2_3_4_RLS_TIENDAS_FIX.sql` -- contiene: (0) verificación previa (`pg_policies` filtrado a `tiendas`/`empresas`, para confirmar el estado exacto y comparar contra `empresas` antes de actuar); (1) la corrección -- una única policy nueva `"usuarios autenticados pueden leer tiendas"`, `FOR SELECT TO authenticated USING (true)`, antecedida por `DROP POLICY IF EXISTS` del mismo nombre (convención de este repositorio, `supabase/README.md`, para que el archivo sea re-ejecutable sin error); (2) validación (confirmar la policy creada, confirmar que `SELECT` ya no devuelve 0 filas, y la validación funcional de punta a punta del flujo del Coordinador); (3) rollback (`DROP POLICY IF EXISTS`, restaura el estado exacto confirmado por la auditoría antes de este Sprint).

**Diseño elegido y su justificación** (el brief exige justificar documentalmente cualquier `USING (true)`, no usarlo por conveniencia): se replica el mismo patrón que ya tiene, confirmado y funcionando, la policy real de `empresas` ("usuarios autenticados pueden leer empresas") -- no es un modelo de seguridad nuevo ni inventado, es extender a la tabla hermana (`tiendas`) el modelo que este proyecto ya usa. Se refuerza con evidencia de frontend ya aprobada: `MasterCalendar`/`AdminInstaladores` (Sprint 3.13/3.14) ya asumen poder listar nombres de tienda sin ningún filtro de pertenencia -- el catálogo de tiendas nunca fue tratado como dato sensible por fila en este proyecto. El límite de seguridad real (qué `trabajos` puede ver/publicar cada Coordinador) sigue exclusivamente a cargo de las policies de `trabajos`/`trabajo_instaladores`, no tocadas aquí.

**Nota de verificación pendiente, documentada con honestidad**: la auditoría en vivo de la ronda anterior confirmó el *nombre* de la policy de `empresas`, no su `qual` (condición) textual exacto -- no se pegó el resultado completo de esa columna. Se asume razonablemente, por el nombre y por el comportamiento ya observado (`empresaNombre` sí resuelve correctamente), que es una policy sin acotar por fila. La sección 0 del SQL incluye la consulta para confirmar esto mismo justo antes de ejecutar la corrección -- si el `qual` real de `empresas` resultara estar acotado (por ejemplo, por `empresa_id` del usuario), ese sería el criterio a replicar en `tiendas` en su lugar, y el archivo debería ajustarse antes de correr la sección 1.

## 5. Validaciones (resumen -- detalle completo dentro del propio SQL)

`pg_policies` post-fix debe mostrar la nueva policy sobre `tiendas`. Un `SELECT` real como `authenticated` ya no debe devolver 0 filas. De punta a punta, sin tocar `src/`: login de Coordinador real → `resolveTiendaNombre()` devuelve el nombre real → `profile.tiendaNombre` no nulo → `OperationalContext.tiendaNombre` no nulo → `sucursalLockValue` igual al nombre real → `SucursalSelect` con solo esa tienda habilitada → `PublishModal` con esa misma tienda preseleccionada y habilitada → formulario enviable.

## 6. Rollback

`DROP POLICY IF EXISTS "usuarios autenticados pueden leer tiendas" ON public.tiendas;` -- restaura exactamente el estado confirmado por la auditoría de la ronda anterior (RLS habilitado, cero policies), sin afectar `empresas`/`coordinadores`/`trabajos`/GRANTs, todos intactos.

## 7. Riesgos

**Riesgo de exposición de datos**: bajo. `tiendas` no tiene columnas sensibles más allá de `direccion`/`provincia`/`zona` (visibles ya hoy, sin RLS, dentro del propio HTML fuente/mocks de Fase 3, y consumidas activamente por pantallas ya aprobadas como `MasterCalendar`). No se expone ningún dato de `trabajos`/clientes -- esa capa sigue protegida por sus propias policies, no tocadas. **Riesgo de inconsistencia con `empresas`**: bajo pero no nulo -- ver la nota de verificación pendiente de la sección 4; el propio SQL incluye el paso para confirmarlo antes de aplicar el cambio. **Riesgo de regresión funcional**: ninguno esperado -- este cambio solo agrega acceso (SELECT) donde antes no existía ninguno; no elimina ni reduce ningún permiso/policy existente sobre ninguna tabla.

## 8. Impacto esperado

Una vez ejecutado el SQL: `resolveTiendaNombre()` deja de devolver `null` para un Coordinador real, y toda la cadena ya construida y correcta en los Sprints 5.2.3.1/5.2.3.2/5.2.3.3 (bloqueo del selector, sincronización de `sucursalCoord`, `PublishModal` con su tienda preseleccionada) empieza a funcionar como se diseñó, sin ningún cambio adicional de código. El Modo Coordinador de un Administrador (Escenario B del Sprint 5.2.3.3) también deja de depender de un `tiendaNombre` nulo para la Rama B de `OperationalContextProvider` (`resolveSuperusuarioTienda`), que usa la misma tabla.

## 9. Archivos modificados / creados en esta ronda

**Creados**:
- `docs/architecture/backend/SPRINT_5_2_3_4_RLS_TIENDAS_FIX.sql` (SQL ejecutable, pendiente de que el usuario lo corra en Producción).
- `docs/architecture/backend/SPRINT_5_2_3_4_RLS_TIENDAS_REPORT.md` (este documento).

**Modificados** (solo los 3 pedidos explícitamente por el brief):
- `PROJECT_STATUS.md`
- `CHANGELOG.md`
- `docs/SPRINTS_INDEX.md`

**Confirmación**: ningún archivo dentro de `src/` fue modificado. Ninguna tabla fuera de `public.tiendas` fue tocada por el SQL generado (no se generó ni un solo `ALTER`/`CREATE`/`DROP`/`GRANT`/`REVOKE` sobre `empresas`/`coordinadores`/`trabajos`/`trabajo_instaladores`/`admins`/`instaladores`/Auth). No se ejecutó ningún SQL contra Supabase desde este entorno -- sigue pendiente de que el usuario lo corra.
