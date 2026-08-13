# Sprint 5.2.3.3.1 — Persistencia real del flujo Publish

## 0. Resumen ejecutivo (léase primero)

**Hallazgo principal, con evidencia de código exacta (secciones 1-6): el flujo Publish de este entorno de trabajo YA está conectado a `trabajosRepository.create()` con un `INSERT` real en `public.trabajos`, desde el Sprint 5.2.2.1.** No se encontró ningún punto donde el flujo siga usando un Job 100% en memoria -- ese comportamiento (`setActiveJob(newJob)` sin ningún `await`/consulta a Supabase) fue el diseño original del Sprint 5.2.1/5.2.1 Fix, pero fue reemplazado explícitamente por un `INSERT ... RETURNING` real en el Sprint 5.2.2.1, con manejo de error que **impide** cerrar el modal o actualizar `activeJob` si el `INSERT` no tuvo éxito (sección 3).

**Antes de escribir este informe se auditó también el ZIP que llegó adjunto a este mismo mensaje** (`handymaxdespachofixpublishwoks.zip`) -- resultó ser una copia del proyecto congelada en el Sprint 5.2.1 Fix (23 de julio), es decir, **anterior** al Sprint 5.2.2.1 que agregó la persistencia real. Consultado explícitamente por este hallazgo (`AskUserQuestion`), el usuario confirmó ignorar ese ZIP y auditar el entorno de trabajo actual -- este informe es exactamente esa auditoría, sobre el código real de este entorno, no sobre el ZIP.

**Por instrucción explícita del propio brief** ("Si durante la auditoría descubres que el flujo ya está conectado al repository, demostrarlo con evidencia del código antes de modificar nada"): no se modificó `CoordinatorLayout.tsx`/`trabajos.repository.ts`/`publish-modal.tsx` -- ya están correctos, con evidencia. **Sí se corrigió un hallazgo secundario, real y menor**, dentro del alcance explícito de "recargar KPIs" del propio brief: `DespachoPage.tsx` no recargaba los KPIs automáticamente después de un `Publish`/`Cancelar` exitoso dentro de la misma sesión de navegación (sección 7) -- único cambio de código de esta ronda.

Dado que el código de persistencia ya es correcto, **la explicación más consistente con la evidencia para el síntoma reportado ("aparece en la UI pero no se inserta nada") es que la prueba se haya hecho contra una build/copia del proyecto anterior al Sprint 5.2.2.1** -- el propio ZIP adjunto a este mensaje es una prueba directa de que existe, en manos del usuario, al menos una copia con exactamente ese comportamiento. La sección 8 da los pasos concretos para confirmar o descartar esto contra el entorno real donde se está probando.

## 1. Componente que ejecuta el INSERT

`src/layouts/CoordinatorLayout.tsx`, prop `onPublish` de `<PublishModal>` (líneas 430-537). `PublishModal` en sí (`src/components/shared/publish-modal.tsx`) **no ejecuta ningún INSERT** -- solo valida el formulario (`validarPublishForm`) y, si es válido, invoca `onPublish(f)` (línea 177 de ese archivo) -- el callback completo, incluida la llamada a Supabase, vive en `CoordinatorLayout.tsx`, no en el modal.

## 2. Repository que utiliza

`trabajosRepository.create()` (`src/repositories/trabajos.repository.ts`, líneas 37-40):

```ts
async function create(row: TableInsert<'trabajos'>): Promise<ServiceResult<TableRow<'trabajos'>>> {
  const query = getClient().from(TABLES.trabajos).insert(row).select().single();
  return toServiceResult(query);
}
```

Llamado directamente en `CoordinatorLayout.tsx` línea 492: `const result = await trabajosRepository.create(payload);`. No existe ningún repository nuevo -- este es el mismo `trabajosRepository` que ya existía desde el Sprint 4.1.1, sin ningún cambio en este archivo (confirmado, `git diff` de esta ronda no lo toca).

## 3. Payload que envía

`CoordinatorLayout.tsx`, líneas 461-479:

```ts
const payload: TableInsert<'trabajos'> = {
  empresa_id: empresaId,
  tienda_id: tiendaId,
  coordinador_id: profile.id,
  codigo,
  tipo: form.tipo,
  provincia: form.provincia,
  zona: form.zona,
  tipo_inmueble: form.tipoInmueble,
  calle: form.calle,
  fecha: form.fecha,
  hora: form.hora,
  equipo: form.equipo,
  requisitos: form.requisitos,
  extra: form.extra,
  precio_sugerido: form.precioSugerido,
  urgente: form.urgente,
  bid_minutos: form.bidMins,
};
```

`empresaId`/`tiendaId` vienen de `useOperationalContext()` (línea 354-355, mismo Provider ya usado por los KPIs); `profile.id` de `useAuth()` (línea 334); el resto, directo del `PublishForm` ya validado por `PublishModal`. Antes de construir este objeto hay una guarda explícita (líneas 443-450): si `tiendaId`/`empresaId` todavía no resolvieron, se muestra un Toast de error y se hace `return` -- el `INSERT` ni siquiera se intenta con un valor nulo.

## 4. Qué devuelve Supabase, y qué pasa con cada resultado

`trabajosRepository.create()` ejecuta `.insert(row).select().single()` -- un único `INSERT ... RETURNING`, resuelto por `toServiceResult()` (`src/services/supabase.service.ts`, líneas 61-72):

```ts
export async function toServiceResult<T>(
  promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
): Promise<ServiceResult<T>> {
  const { data, error } = await promise;
  if (error) {
    return { ok: false, error: normalizeSupabaseError(error) };
  }
  return { ok: true, data: data as T };
}
```

Cualquier error real de Postgrest -- incluido un rechazo de RLS (policy "coordinadores publican en su tienda") o un `42501`/constraint -- vuelve como `{ok: false, error: ...}`, NUNCA como un éxito silencioso. En `CoordinatorLayout.tsx` (líneas 494-505):

```ts
if (!result.ok) {
  pushToast('error', 'No se pudo publicar el trabajo', result.error.message);
  return;
}
```

Este `return` ocurre **antes** de `setActiveJob`/`setShowPublishModal(false)` -- si el `INSERT` falla, el modal permanece abierto y `activeJob` no cambia. La llamada completa está además envuelta en un `try/catch` (líneas 491-536) para cubrir una excepción de red genuina (no un error normal de Postgrest, que ya vuelve como `{ok:false}` sin lanzar) -- mismo criterio ya usado en `DespachoPage.tsx` desde el Sprint 5.2.1 Fix.

**Conclusión de esta sección, la más importante del informe**: no existe ningún camino de código en el que el modal se cierre o `activeJob` se actualice sin que `trabajosRepository.create()` haya devuelto `{ok: true, data: <fila real>}` -- es decir, sin que Supabase haya confirmado un `INSERT` real con una fila devuelta.

## 5. Dónde se actualiza `activeJob`

Mismo bloque, líneas 514-527, **solo dentro de la rama de éxito**, construido a partir de la fila devuelta por Supabase (`result.data`), no de `form`:

```ts
const row = result.data;
const newJob: JobSummaryCardJob = {
  id: row.codigo,
  tipo: row.tipo,
  zona: row.zona,
  provincia: row.provincia,
  fecha: row.fecha,
  hora: row.hora,
  sucursal: form.sucursal,
  bidMins: row.bid_minutos,
  urgente: row.urgente,
};
setActiveJob(newJob);
setShowPublishModal(false);
```

Única excepción, ya documentada desde el Sprint 5.2.2.1: `sucursal` no es columna de `trabajos` (solo existe `tienda_id`, uuid) -- se toma del `form` ya enviado, no de la fila. `setActiveJob` es el `setActiveJob` de `useOperationalContext()` (`OperationalContextProvider.tsx`, sin cambios en esta ronda) -- no un `useState` local.

## 6. Dónde se recargan "Mis trabajos" y los KPIs (auditoría, antes de cualquier cambio)

**"Mis trabajos"** (`src/pages/coordinator/TrabajosPage.tsx`, líneas 65-102): consulta `getTrabajosByTienda(tiendaId)` dentro de un `useEffect` cuyas dependencias son `[tiendaId, contextoLoading, contextoError]`. Este efecto se ejecuta en **cada montaje** del componente -- como el Coordinador navega a `/trabajos` (una ruta distinta de `/despacho`, donde vive `PublishModal`), `TrabajosPage` se monta de nuevo cada vez que se visita, disparando una consulta fresca a Supabase. **Confirmado, sin necesitar ningún cambio**: un trabajo recién publicado (persistido de verdad, sección 4) SÍ aparece en "Mis trabajos" en cuanto el Coordinador navega ahí -- no hay ningún caché ni dato obsoleto involucrado.

**KPIs** (`src/pages/coordinator/DespachoPage.tsx`, antes de esta ronda): el mismo tipo de `useEffect`, pero con dependencias `[tiendaId, contextoLoading, contextoError]` -- **sin `activeJob`**. Como `PublishModal`/`onPublish` viven en la misma página (`/despacho`) donde ya está montado `DespachoPage`, publicar un trabajo **no remonta** este componente -- el efecto de KPIs simplemente no se volvía a ejecutar. Esto es un hallazgo real, confirmado con evidencia, distinto del "no persiste" reportado: el `INSERT` sí ocurre, pero el bloque "Indicadores" seguía mostrando los valores de antes de publicar hasta que `tiendaId` cambiara o la página se recargara -- corregido en la sección 7.

## 7. Único cambio de código de esta ronda

`src/pages/coordinator/DespachoPage.tsx` -- se agrega `activeJob?.id` al arreglo de dependencias del `useEffect` que llama a `getCoordinatorKpis()` (antes `[tiendaId, contextoLoading, contextoError]`, ahora `[tiendaId, contextoLoading, contextoError, activeJob?.id]`). Se usa `activeJob?.id`, no el objeto `activeJob` completo, para no depender de su identidad de referencia (un objeto nuevo en cada publish/cancel igual dispararía el efecto, pero comparar por `id` es más explícito sobre la intención: "recargar cuando cambia CUÁL es el trabajo activo, no cuando cambia la referencia del objeto"). Ningún otro archivo fue tocado -- no se creó ningún repository/Context nuevo, no se llamó a ninguna función nueva (`getCoordinatorKpis` ya existía, mismo import, misma firma), `CoordinatorLayout.tsx`/`trabajosRepository`/`OperationalContextProvider.tsx`/RLS/Auth: cero cambios.

Con este cambio, el flujo completo pedido por el brief queda así, de punta a punta:

```
PublishModal (valida) → onPublish(form)
  → CoordinatorLayout.tsx: trabajosRepository.create(payload)
    → INSERT ... RETURNING real en public.trabajos
    → si falla: Toast de error, modal permanece abierto, activeJob sin cambios
    → si tiene éxito: activeJob = fila real devuelta por Supabase, modal se cierra
  → DespachoPage.tsx: "Despacho en vivo" ya mostraba activeJob (sin cambios)
  → DespachoPage.tsx: KPIs se recargan (getCoordinatorKpis) -- CORREGIDO en esta ronda
  → TrabajosPage.tsx: "Mis trabajos" ya se recarga solo con navegar a /trabajos (sin cambios, ya funcionaba)
```

## 8. Sobre el síntoma reportado ("no se inserta ningún registro") -- hipótesis y verificación recomendada

La evidencia de las secciones 1-6 no deja ningún hueco de código plausible para el síntoma exacto descrito ("aparece en la UI, el modal se cierra, pero `public.trabajos` no cambia") -- ese comportamiento requeriría que `trabajosRepository.create()` devolviera `{ok: true}` sin haber insertado nada, algo que `toServiceResult()`/PostgREST no hacen (un `INSERT ... RETURNING` sin filas afectadas no es un resultado "exitoso vacío": si RLS/una policy lo bloquea, Postgrest devuelve un error real, capturado como `{ok:false}`).

**Hipótesis más consistente con la evidencia disponible**: la prueba se hizo contra una copia del proyecto anterior al Sprint 5.2.2.1 -- el propio ZIP adjunto a este mensaje (`handymaxdespachofixpublishwoks.zip`) es evidencia directa de que existe, del lado del usuario, al menos una copia exactamente en ese estado (Sprint 5.2.1 Fix, `onPublish` sin ninguna llamada a Supabase). No se puede confirmar esto con certeza absoluta desde este entorno de trabajo (sin acceso a lo que el usuario realmente tiene desplegado/corriendo) -- se documenta como hipótesis, no como conclusión, siguiendo la misma disciplina de "no asumir" del resto de esta sesión.

**Verificación recomendada, en orden de rapidez**:
1. Confirmar que la build que se está probando incluye el bloque `async (form: PublishForm) => { ... trabajosRepository.create(payload) ... }` de `CoordinatorLayout.tsx` (sección 3 de este informe) -- si el archivo real que corre no tiene ese `await trabajosRepository.create(...)`, la build es vieja.
2. Durante una publicación real, abrir la pestaña Red/Network del navegador y confirmar que aparece un `POST` a `.../rest/v1/trabajos` con status `201` (éxito) -- su ausencia confirmaría una build vieja; un `4xx`/`5xx` en esa llamada activaría el Toast de error (que debería ser visible, no un cierre silencioso del modal).
3. Confirmar que `VITE_SUPABASE_URL` del `.env` real usado para correr la app apunta exactamente al mismo proyecto de Supabase donde se ejecuta la consulta SQL de verificación (`SELECT * FROM trabajos ORDER BY created_at DESC LIMIT 5;`) -- un proyecto/entorno distinto explicaría el mismo síntoma sin ningún bug de código.

## 9. Confirmaciones finales (validaciones pedidas por el brief)

- **Archivos modificados**: `src/pages/coordinator/DespachoPage.tsx` (único cambio de código, sección 7); `PROJECT_STATUS.md`, `CHANGELOG.md`, `docs/SPRINTS_INDEX.md` (tracking); este informe (nuevo).
- **Archivos NO modificados, verificados con evidencia de que ya estaban correctos**: `src/layouts/CoordinatorLayout.tsx`, `src/components/shared/publish-modal.tsx`, `src/repositories/trabajos.repository.ts`, `src/services/supabase.service.ts`, `src/lib/supabase/client.ts`, `src/providers/OperationalContextProvider.tsx`, `src/pages/coordinator/TrabajosPage.tsx`.
- **`src/` fuera de `DespachoPage.tsx`**: sin cambios.
- **Ningún repository/Context nuevo, ningún cambio de modelo de datos/RLS/Auth.**
- **Causa raíz del síntoma reportado**: no encontrada en el código de este entorno (que ya persiste correctamente desde el Sprint 5.2.2.1); la hipótesis más consistente con la evidencia disponible es una build/copia desactualizada del lado del usuario (anterior al Sprint 5.2.2.1) -- ver sección 8 para cómo confirmarlo.
- **Hallazgo secundario real, corregido**: los KPIs de "Despacho en vivo" no se recargaban automáticamente tras un Publish/Cancelar exitoso dentro de la misma sesión de navegación -- corregido con un único cambio de una línea en `DespachoPage.tsx` (sección 7).
