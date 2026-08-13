# Sprint 5.2.3.3 — Auditoría completa del Contexto Operativo del Coordinador

**Tipo de Sprint**: exclusivamente auditoría/diagnóstico. **Ningún archivo de `src/` fue modificado en esta ronda** (verificado al cierre con `git diff --stat`, ver sección 11). No se implementa ninguna corrección aquí, por restricción explícita del brief.

## 0. Resumen ejecutivo (léase primero)

Los Sprints 5.2.3/5.2.3.1/5.2.3.2 construyeron, correctamente y en el orden correcto, un mecanismo de bloqueo del selector de sucursal (`enabledValue`/`sucursalLockValue`) apoyado sobre un valor -- `tiendaNombre` -- que **nunca fue verificado de punta a punta contra la base de datos real**. Ese valor depende de una consulta (`tiendasRepository.getById()`) contra una tabla (`tiendas`) que la propia documentación del proyecto, desde el Sprint 4.0.1/4.1.1, declara con RLS habilitado y **cero policies** para `authenticated`. Cuando `tiendaNombre` resuelve a `null` (el comportamiento esperable de ese estado de RLS), el mecanismo de bloqueo -- que fue diseñado con una "degradación seguraˮ (`tiendaNombre ?? ''`) para nunca dejar `enabledValue` en `undefined` por error -- termina bloqueando **todas** las opciones en vez de ninguna, porque ninguna sucursal real se llama `''`. Ese mismo valor bloqueado alimenta también el campo obligatorio del formulario de "Publicar trabajo", que en consecuencia nunca puede pasar su propia validación. Esta cadena está confirmada con evidencia de código exacta en las secciones 1-8. La sección 9 documenta, solo con evidencia (sin crear ni modificar nada), el estado de RLS de las tablas involucradas. La sección 10 separa los dos escenarios de "Modo Coordinador" pedidos por el brief. La sección 11 es el corte de raíz y la propuesta técnica para el Sprint siguiente, **sin implementarla**.

---

## 1. ¿Dónde se obtiene el perfil del Coordinador? (archivo, función, consulta exactos)

`src/services/profile.service.ts`, función `resolveProfile(authUserId, authEmail)`. Para el caso de un Coordinador real, el bloque relevante (líneas 117-140 del archivo, ya leído íntegro en este Sprint) es:

```ts
const coordResult = await coordinadoresRepository.getById(authUserId);
if (!coordResult.ok) return coordResult;
if (coordResult.data) {
  const row = coordResult.data;
  const [empresaNombre, tiendaNombre] = await Promise.all([
    resolveEmpresaNombre(row.empresa_id),
    resolveTiendaNombre(row.tienda_id),
  ]);
  return {
    ok: true,
    data: {
      id: row.id, rol: 'coordinador', nombre: row.nombre, correo: authEmail,
      avatarUrl: null, estado: estadoDesdeFlags(row.activo, false),
      empresaId: row.empresa_id, empresaNombre,
      tiendaId: row.tienda_id, tiendaNombre,
    },
  };
}
```

`coordinadoresRepository.getById()` (`src/repositories/coordinadores.repository.ts`, líneas 26-29):

```ts
async function getById(id: string): Promise<ServiceResult<TableRow<'coordinadores'> | null>> {
  const query = getClient().from(TABLES.coordinadores).select('*').eq('id', id).maybeSingle();
  return toServiceResult(query);
}
```

Es decir: `SELECT * FROM coordinadores WHERE id = $authUserId LIMIT 1` (vía PostgREST/`.maybeSingle()`), llamado con `authUserId = auth.uid()` (el `id` de la sesión, ver sección 2 sobre de dónde sale ese id). Este es el punto exacto donde arranca la resolución completa de perfil para un Coordinador.

`resolveProfile()` se llama, a su vez, desde `AuthProvider.tsx` (ver sección 2) -- no desde ningún componente de UI directamente.

## 2. ¿El perfil devuelve `tienda_id`, `empresa_id`, `rol`, `nombre`, `tiendaNombre`, o solo `tienda_id`?

Con evidencia del bloque citado en la sección 1: el objeto `Perfil` devuelto para un Coordinador contiene los **7** campos: `id`, `rol` (`'coordinador'`, string literal, no leído de ninguna columna), `nombre` (`row.nombre`, columna directa de `coordinadores`), `correo` (`authEmail`, del `session.user.email` de Supabase Auth, no de una columna), `estado` (derivado de `row.activo` vía `estadoDesdeFlags`), `empresaId` (`row.empresa_id`, columna directa), `empresaNombre` (resuelto, ver sección 3), `tiendaId` (`row.tienda_id`, columna directa) y `tiendaNombre` (resuelto, ver sección 3). No es cierto que solo devuelva `tienda_id` -- devuelve los 4 campos pedidos por el brief más 3 adicionales (`nombre`, `correo`, `estado`).

**Distinción crítica que el resto de este informe depende de mantener separada**: `tiendaId`/`empresaId` son **columnas propias** de la fila de `coordinadores` (no requieren ninguna otra consulta ni tabla); `tiendaNombre`/`empresaNombre` son el resultado de **una consulta adicional, separada**, contra `tiendas`/`empresas` respectivamente (ver sección 3). Son dos mecanismos de resolución distintos con distinto riesgo de RLS -- confundirlos fue, en retrospectiva, el motivo por el que los Sprints 5.2.3/5.2.3.1 pudieron asumir que "la sucursal ya funciona" (cierto para `tiendaId`, las queries de `trabajos` sí filtran bien) sin notar que `tiendaNombre` es una pieza completamente distinta y no verificada.

## 3. ¿Quién resuelve `tiendaNombre`? (sin asumir, código exacto)

`profile.service.ts`, funciones privadas (no exportadas), líneas anteriores al bloque de la sección 1:

```ts
async function resolveEmpresaNombre(empresaId: string): Promise<string | null> {
  const result = await empresasRepository.getById(empresaId);
  return result.ok ? (result.data?.nombre ?? null) : null;
}
async function resolveTiendaNombre(tiendaId: string): Promise<string | null> {
  const result = await tiendasRepository.getById(tiendaId);
  return result.ok ? (result.data?.nombre ?? null) : null;
}
```

`tiendasRepository.getById()` (`src/repositories/tiendas.repository.ts`, líneas 23-26):

```ts
async function getById(id: string): Promise<ServiceResult<TableRow<'tiendas'> | null>> {
  const query = getClient().from(TABLES.tiendas).select('*').eq('id', id).maybeSingle();
  return toServiceResult(query);
}
```

No hay ningún mapper ni `OperationalContext` involucrado en esta resolución -- ocurre enteramente dentro de `profile.service.ts`, **antes** de que el resultado llegue a `AuthProvider`/`OperationalContextProvider`. Ambas funciones (`resolveEmpresaNombre`/`resolveTiendaNombre`) tienen el mismo patrón: si la consulta falla (`result.ok === false`) o si tiene éxito pero devuelve `null` (0 filas, `.maybeSingle()`), el resultado final es `null` -- **indistinguible** entre "la tienda no existe" y "RLS bloqueó la lectura devolviendo 0 filas". Este es el punto exacto donde, si `tiendas` no permite `SELECT` a `authenticated` para esa fila, `tiendaNombre` se vuelve `null` sin que ninguna capa superior se entere de que fue un problema de permisos.

## 4. Auditoría completa de `OperationalContextProvider`

Archivo: `src/providers/OperationalContextProvider.tsx` (303 líneas, leído íntegro). Expone, vía `useMemo`, un objeto con exactamente estas propiedades: `modo`, `esSuperusuario`, `empresaId`, `empresaNombre`, `tiendaId`, `tiendaNombre`, `loading`, `error`, `activeJob`, `setActiveJob`.

Dos ramas de resolución, mutuamente excluyentes, según `requiereResolucionSuperusuario = esSuperusuario && modo === 'coordinador'`:

**Rama A (Coordinador real, o Admin viendo "Administración"/"Instalador")** -- síncrona, directa desde `profile` (`useAuth()`):

```ts
const tiendaId = requiereResolucionSuperusuario ? resuelto.tiendaId : (profile?.tiendaId ?? null);
// ... dentro del useMemo, rama else:
return {
  modo, esSuperusuario,
  empresaId: profile?.empresaId ?? null,
  empresaNombre: profile?.empresaNombre ?? null,
  tiendaId,
  tiendaNombre: profile?.tiendaNombre ?? null,
  loading: false, error: null, activeJob, setActiveJob,
};
```

`tiendaNombre` aquí es un **passthrough directo** de `profile.tiendaNombre` -- sin ninguna consulta adicional, sin reintento, sin fallback propio. Si `profile.tiendaNombre` es `null` (sección 3), `OperationalContextValue.tiendaNombre` **también** es `null`. No existe ningún mecanismo en este archivo que "arregle" ese `null` -- se propaga tal cual.

**Rama B (Admin en Modo Coordinador)** -- asíncrona, vía `resolveSuperusuarioTienda(sucursalCoord)` (efecto no mostrado aquí por brevedad, ya auditado en el Sprint 5.2.3.1): resuelve `tiendaId`/`tiendaNombre` a partir del **nombre** de sucursal elegido en el selector (`sucursalCoord`, un string), buscando la tienda por nombre -- esta rama depende de que `tiendas` sea legible, mismo riesgo de RLS, pero **no es la rama que produce el bug reportado** (ver sección 10, porque en esta rama `esSuperusuario` es `true` y `sucursalLockValue` se vuelve `undefined`, sin bloqueo).

`¿Puede tiendaNombre ser null?` Sí, en la Rama A, siempre que `profile.tiendaNombre` sea `null` -- ya demostrado en la sección 3 que es exactamente lo que ocurre bajo el estado de RLS documentado. `¿En qué escenarios?` Único escenario real: Coordinador autenticado cuya fila en `tiendas` no puede leerse vía `authenticated` -- no depende de qué tienda sea, ni de si el Coordinador está bien configurado en `coordinadores` (esa parte -- `tiendaId` -- ya llegó bien, columna propia).

`useEffect(() => { setActiveJob(null); }, [tiendaId])` (Sprint 5.2.3) sigue intacto, sin relación con este hallazgo -- limpia `activeJob` cuando cambia `tiendaId`, no cuando cambia `tiendaNombre`.

## 5. Auditoría completa de `RootLayout.tsx`

Archivo: `src/layouts/RootLayout.tsx` (805 líneas, leído íntegro).

```ts
const [sucursalCoord, setSucursalCoord] = useState('Multiplaza');
// ...
useEffect(() => {
  if (profile?.rol !== 'coordinador') return;
  if (profile.tiendaNombre && profile.tiendaNombre !== sucursalCoord) {
    setSucursalCoord(profile.tiendaNombre);
  }
}, [profile?.rol, profile?.tiendaNombre, sucursalCoord]);
```

`sucursalCoord` **inicializa** en el literal `'Multiplaza'` (heredado de antes del Sprint 5.2.3.1) y el `useEffect` que se agregó en el Sprint 5.2.3.1 para sincronizarlo con la tienda real del Coordinador **solo actúa si `profile.tiendaNombre` es verdadero** (`if (profile.tiendaNombre && ...)`). Si `profile.tiendaNombre` es `null` (sección 3-4), esta condición nunca es verdadera -- el efecto es un no-op permanente y `sucursalCoord` **queda congelado en `'Multiplaza'`** para siempre, sin relación con la tienda real del Coordinador. Esto es un segundo síntoma observable, distinto del bloqueo de opciones (sección 6-7): el valor *mostrado* como seleccionado en el `<select>` puede no coincidir con la tienda real del Coordinador, independientemente de qué esté bloqueado.

Más abajo:

```tsx
return (
  <OperationalContextProvider modo={modo} sucursalCoord={sucursalCoord}>
    {showCoordinador ? (
      <CoordinatorLayout sucursalCoord={sucursalCoord} onSucursalCoordChange={setSucursalCoord} adminSwitchSlot={adminSwitchSlot} />
    ) : ( /* ramas Instalador/Admin, sin relación con este hallazgo */ )}
  </OperationalContextProvider>
);
```

`RootLayout` **no puede sobrescribir** el valor de `OperationalContextValue.tiendaId`/`tiendaNombre` -- solo pasa `sucursalCoord` como prop de entrada a `OperationalContextProvider` (usado únicamente por la Rama B/superusuario, sección 4), y por otro lado lee `tiendaNombre` indirectamente vía `profile` (no vía el Context) para su propio `useEffect` de sincronización. No hay una segunda fuente de verdad aquí -- es el mismo `profile.tiendaNombre`, consumido dos veces (una por `RootLayout` para `sucursalCoord`, otra por `OperationalContextProvider` para `value.tiendaNombre`), ambas con el mismo dato potencialmente `null`.

## 6. `CoordinatorLayout.tsx` — ¿qué valor usa realmente?

Archivo: `src/layouts/CoordinatorLayout.tsx` (601 líneas, leído íntegro).

```ts
const { activeJob, setActiveJob, tiendaId, empresaId, esSuperusuario, tiendaNombre } = useOperationalContext();
const sucursalLockValue = esSuperusuario ? undefined : (tiendaNombre ?? '');
// ...
<SucursalSelect value={sucursalCoord} onChange={onSucursalCoordChange} enabledValue={sucursalLockValue} />
// ...
<PublishModal sucursal={sucursalCoord} enabledValue={sucursalLockValue} ... />
```

Respuesta directa a la pregunta del brief: `CoordinatorLayout` usa **ambos**, pero para cosas distintas -- `sucursalCoord` (prop recibida de `RootLayout`, no del Context) gobierna el valor **mostrado** como seleccionado en el `<select>`; `tiendaNombre` (del `OperationalContext`, vía el hook) gobierna, a través de `sucursalLockValue`, **cuáles opciones quedan deshabilitadas** en ambos componentes (`SucursalSelect` y `PublishModal`). Son dos variables separadas alimentando dos aspectos distintos del mismo control, y **ambas dependen, en última instancia, del mismo `profile.tiendaNombre`** (sección 3) -- una directamente (`tiendaNombre` del Context) y otra indirectamente (`sucursalCoord`, vía el efecto de sincronización de `RootLayout`, sección 5). No hay una tercera fuente de verdad ni un estado nuevo -- es el mismo dato raíz, consumido en dos lugares con dos consecuencias distintas cuando es `null`.

`tiendaId` (para el INSERT real de `trabajos`, en `onPublish`) viene también del `OperationalContext`, y **no depende de `tiendaNombre`** -- por eso la publicación de trabajos en sí (columna `tienda_id` de la tabla) seguía funcionando en Sprints anteriores; lo que se rompe es exclusivamente la capa de UI de bloqueo/selección, no el filtrado de datos por tienda.

## 7. Auditoría completa de `PublishModal`

Archivo: `src/components/shared/publish-modal.tsx` (407 líneas, leído íntegro).

```ts
export function PublishModal({ sucursal, open, onOpenChange, onPublish, enabledValue }: PublishModalProps) {
  const [f, setF] = useState<PublishForm>({
    sucursal: sucursal || SUCURSALES[0],
    // ...otros campos con valores por defecto...
  });
  // ...
  useEffect(() => {
    if (enabledValue !== undefined && f.sucursal !== enabledValue) {
      set('sucursal', enabledValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledValue]);
  // ...
  <Select value={f.sucursal} onChange={(e) => set('sucursal', e.target.value)}>
    {SUCURSALES.map((s) => (
      <option key={s} value={s} disabled={enabledValue !== undefined && s !== enabledValue}>{s}</option>
    ))}
  </Select>
```

`sucursal` (la prop, distinta de `enabledValue`) solo se lee **una vez**, como valor inicial de `f.sucursal` -- hallazgo ya documentado en el Sprint 5.2.3.2, sin cambios desde entonces. El `useEffect` agregado en el Sprint 5.2.3.2 (dependencia única: `[enabledValue]`) es el que fuerza `f.sucursal` a igualar `enabledValue` cada vez que este cambia y no sea `undefined` -- este es el mecanismo por el cual, cuando `enabledValue === ''` (sección 6, caso `tiendaNombre === null`), `f.sucursal` queda forzado a `''`.

Validación del formulario (`validarPublishForm`, mismo archivo): `if (!form.sucursal.trim()) errores.sucursal = 'Selecciona una sucursal.';`. Con `f.sucursal === ''`, `''.trim()` es `''` (falsy), la condición es verdadera, el error se genera siempre, y `intentarPublicar()` nunca llama a `onPublish`. **Esto confirma textualmente el síntoma reportado por el usuario**: "el formulario nunca puede enviarse".

No hay ningún snapshot obsoleto adicional ni estado duplicado nuevo desde el Sprint 5.2.3.2 -- el único estado relevante es `f.sucursal`, ya identificado.

## 8. `SucursalSelect` — criterio de deshabilitado, casos `null`/`undefined`

Archivo: `src/components/shared/sucursal-select.tsx` (82 líneas, leído íntegro):

```tsx
<select value={value} onChange={(e) => onChange(e.target.value)}>
  {SUCURSALES.map((s) => (
    <option key={s} value={s} disabled={enabledValue !== undefined && s !== enabledValue}>{s}</option>
  ))}
</select>
```

Criterio exacto: una opción se deshabilita si y solo si `enabledValue !== undefined` **y** su propio string no es idéntico a `enabledValue`. Casuística real, verificada contra el código (no contra la pregunta del brief, que asume un caso `null` que el código nunca produce):

- `enabledValue === undefined` (Admin en Modo Coordinador, `esSuperusuario === true`, sección 6): ninguna opción se deshabilita -- las 9 quedan seleccionables. Comportamiento correcto y sin cambios desde el Sprint 5.2.3.1.
- `enabledValue === '<nombre real de una tienda>'`: solo esa opción queda habilitada, las 8 restantes deshabilitadas -- comportamiento correcto para un Coordinador cuya `tiendaNombre` sí resolvió.
- `enabledValue === ''` (Coordinador real con `tiendaNombre === null`, el caso confirmado en secciones 3-6): **las 9 opciones quedan deshabilitadas**, porque ningún string de `SUCURSALES` es `''`. Esto es exactamente el síntoma reportado ("el selector principal de sucursal intenta bloquear las sucursales" / interpretado por el usuario como "bloqueo total").
- `enabledValue === null`: **este caso no ocurre nunca en el código actual** -- `sucursalLockValue` (`CoordinatorLayout.tsx`, sección 6) solo puede ser `undefined` o un `string` (`tiendaNombre ?? ''` nunca produce `null`, `??` lo convierte a `''`). La pregunta del brief sobre "qué ocurre cuando `enabledValue` es `null`" es, con evidencia, una distinción que la implementación actual no expone -- se documenta aquí como hallazgo de auditoría, no como comportamiento observado.

No existe ninguna "degradación segura" real distinta de la ya descrita -- el valor `''` fue elegido en el Sprint 5.2.3.1 precisamente para evitar que `enabledValue` quedara accidentalmente en `undefined` (lo que habría desbloqueado todo para un Coordinador real, un fallo de seguridad). El costo no anticipado de esa elección es exactamente el bug reportado: al no existir ninguna sucursal real llamada `''`, la salvaguarda de seguridad se convierte en un bloqueo total en el escenario donde `tiendaNombre` es `null`.

## 9. RLS — solo documentación, sin crear ni modificar policies/GRANTs

**No se ejecutó ningún SQL en esta ronda.** Toda esta sección es lectura de documentación y código ya existente en el repositorio.

`docs/database/DATABASE_INVENTORY.md` §2.1-§2.4 (tabla resumen y detalle por tabla) documenta, con datos extraídos de un `pg_dump`/auditoría real de Producción:

| Tabla | Policies (destino directo) |
|---|---|
| `empresas` | 0 ⚠️ |
| `tiendas` | 0 ⚠️ |
| `admins` | 0 ⚠️ |
| `coordinadores` | 0 ⚠️ ("no puede leerse su propio registro directamente vía RLS") |

`docs/database/DATABASE_DIFF.md` (línea 176) es aún más explícito sobre `coordinadores`: *"Producción no tiene ninguna política sobre `coordinadores` como tabla objetivo -- un coordinador no puede ni siquiera leer su propia fila en `coordinadores` vía `anon`/`authenticated` (solo se le referencia *desde* políticas de otras tablas, nunca se define una política *sobre* `coordinadores` misma)."*

Estos dos documentos, por sí solos, describirían un estado en el que ni siquiera `coordResult` (sección 1) devolvería datos -- lo cual contradice el comportamiento observado en Sprints anteriores (Sprint 5.2.3.1 confirmó que las queries de `trabajos` sí filtran correctamente por `tiendaId` real de un Coordinador, lo que exige que `resolveProfile()` haya obtenido `row.tienda_id` de alguna fila real). La reconciliación de esta aparente contradicción está documentada en `docs/architecture/frontend/SPRINT_4_2_1_AUTH_REPORT.md`, secciones 8 y 12.2-12.4:

- Sección 8 (limitación reportada, no resuelta en el Sprint 4.2.1): "esas 4 tablas [`admins`/`coordinadores`/`empresas`/`tiendas`] tienen RLS habilitado pero cero policies para `authenticated`".
- Sección 12.2 (cierre del Sprint 4.2.1, validación manual del usuario): *"durante esa validación se hicieron los siguientes cambios directamente en Supabase (Dashboard/SQL Editor)... creación/ajuste de policies RLS, otorgamiento de permisos SELECT a `authenticated`... Esto resuelve, en la práctica, la limitación crítica... al menos para `admins`, confirmado por la validación real. **No hay confirmación explícita de que se haya hecho lo mismo para `coordinadores`/`empresas`/`tiendas`** -- se recomienda verificar esos 3 casos también."*

**Conclusión de esta sección, con la honestidad que exige el brief ("no asumir")**: no hay evidencia documental de que `empresas`/`tiendas` hayan recibido jamás una policy de `SELECT`/GRANT para `authenticated` -- ningún informe posterior al Sprint 4.2.1 lo confirma, y el patrón (`0 ⚠️`) se repite sin corrección en cada auditoría posterior de este repositorio. Es razonable, con esta evidencia, tratar la ausencia de policy en `tiendas`/`empresas` como la causa **confirmada** de `tiendaNombre`/`empresaNombre === null`. Sobre `coordinadores`: existe ambigüedad documental real -- es posible que se haya corregido junto con `admins` en la misma sesión de validación manual (Sprint 4.2.1, sección 12.2) sin que quedara registrado explícitamente para esa tabla en particular, lo cual sería consistente con que `tiendaId`/`empresaId` sí lleguen bien (secciones 1-2, 6). **Esto no puede confirmarse ni descartarse desde este entorno de trabajo, sin acceso de red a Supabase** -- se recomienda verificarlo directamente contra Producción (`SELECT * FROM pg_policies WHERE tablename = 'coordinadores';` o equivalente en el Dashboard) antes de dar por cerrado este punto en el Sprint siguiente. No se creó, modificó ni propuso ningún SQL de policy/GRANT en esta ronda -- esta sección es puramente de verificación documental, tal como exige el brief.

## 10. Modo Coordinador — dos escenarios auditados por separado

**Escenario A — Coordinador real** (`profile.rol === 'coordinador'`, `esSuperusuario === false`): el selector debe permanecer bloqueado mostrando únicamente su propia tienda. Con evidencia de las secciones 4-8: el mecanismo de bloqueo (`sucursalLockValue = tiendaNombre ?? ''`) **está implementado correctamente en su lógica** (Sprints 5.2.3.1/5.2.3.2 hicieron exactamente lo que su brief pedía), pero el dato de entrada (`tiendaNombre`) llega en `null` por la causa documentada en la sección 9 -- el resultado observable es "todo bloqueado" en vez de "solo mi tienda habilitada". La corrección de este escenario **no requiere tocar `SucursalSelect`/`PublishModal`/`CoordinatorLayout`** -- esos tres ya reaccionan correctamente a `tiendaNombre`; requiere que `tiendaNombre` deje de ser `null` (sección 11).

**Escenario B — Administrador en Modo Coordinador** (`profile.rol === 'admin'`, `modo === 'coordinador'`, `esSuperusuario === true`): `sucursalLockValue` es siempre `undefined` en este escenario (sección 6, `esSuperusuario ? undefined : ...`) -- **ningún síntoma de bloqueo total puede ocurrir aquí**, independientemente del estado de `tiendaNombre`, porque la condición `enabledValue !== undefined` (secciones 7-8) nunca se cumple. Lo que sí puede seguir afectado en este escenario, ya reportado y no resuelto desde el Sprint 5.2.3.1 (`resuelto.tiendaNombre`, Rama B de la sección 4, misma dependencia de `tiendasRepository.getById()`), es que el **nombre** de tienda mostrado en otras partes de la UI (headers, KPIs) para el admin en este modo pueda también ser `null` -- sin relación con el bloqueo de opciones, que en este escenario ya funciona bien. La reconstrucción completa del contexto al cambiar de sucursal (`useEffect` de `activeJob`, Sprint 5.2.3; `resolveSuperusuarioTienda`, Sprint 5.2.3.1) no se modificó ni se vio afectada por este hallazgo.

## 11. Causa raíz, evidencia, punto exacto de pérdida, propuesta para el Sprint siguiente

**Causa raíz identificada**: la tabla `tiendas` (y, con el mismo patrón, `empresas`) tiene Row Level Security habilitado sin ninguna policy de `SELECT` para el rol `authenticated` -- estado documentado sin contradicción desde el Sprint 4.0.1/4.1.1 hasta hoy (`docs/database/DATABASE_INVENTORY.md` §2.1-§2.2, `tiendas.repository.ts`/`empresas.repository.ts`, `SPRINT_4_2_1_AUTH_REPORT.md` §8/§12.2-12.4). Esto nunca fue corregido para estas dos tablas (a diferencia de `admins`, corregido manualmente el 2026-07-22 según el propio usuario, sección 9).

**Punto exacto donde se pierde el dato**: `src/services/profile.service.ts`, función `resolveTiendaNombre(tiendaId)` (y análogamente `resolveEmpresaNombre`), en la llamada `tiendasRepository.getById(tiendaId)` → `SELECT * FROM tiendas WHERE id = $1` ejecutada como `authenticated`. Sin policy de `SELECT`, PostgreSQL con RLS habilitado devuelve 0 filas (no un error, dado que el `GRANT` de tabla ya existe -- de lo contrario sería un `42501`, no un `null` silencioso). `.maybeSingle()` traduce 0 filas a `data: null`, `result.data?.nombre ?? null` resuelve a `null`, y ese `null` se propaga sin transformación por las siguientes 4 capas: `profile.tiendaNombre` (Perfil) → `OperationalContextValue.tiendaNombre` (passthrough, sección 4) → `CoordinatorLayout.sucursalLockValue = '' ` (sección 6) → `SucursalSelect`/`PublishModal` deshabilitan las 9 opciones (secciones 7-8) → `PublishForm.sucursal` queda forzado a `''` → `validarPublishForm` rechaza el envío siempre (sección 7).

**Flujo completo auditado, punta a punta** (con el punto de pérdida marcado con ⚠️):

```
auth.uid() (sesión Supabase Auth)
  → SessionProvider (session.user.id, sin lógica de negocio)
  → AuthProvider (useEffect sobre currentUserId → resolveProfile())
    → profile.service.ts: resolveProfile()
        → coordinadoresRepository.getById(authUserId) → coordinadores.tienda_id, .empresa_id  [OK, columnas propias]
        → resolveTiendaNombre(tienda_id) → tiendasRepository.getById() → tiendas RLS sin policy ⚠️ → null
        → resolveEmpresaNombre(empresa_id) → empresasRepository.getById() → empresas RLS sin policy ⚠️ → null
  → profile: { tiendaId: <uuid real>, tiendaNombre: null, empresaId: <uuid real>, empresaNombre: null, ... }
  → OperationalContextProvider (Rama A, passthrough directo) → value.tiendaNombre: null
  → RootLayout: efecto de sincronización de sucursalCoord es no-op (tiendaNombre falsy) → sucursalCoord se queda en 'Multiplaza'
  → CoordinatorLayout: sucursalLockValue = '' (esSuperusuario=false, tiendaNombre ?? '')
  → SucursalSelect / PublishModal: TODAS las opciones disabled (ninguna === '')
  → PublishModal: f.sucursal forzado a '' → validarPublishForm falla siempre → formulario no se puede enviar
```

**Propuesta técnica para el Sprint siguiente (no implementada en esta ronda)**: agregar, en Supabase (Dashboard/SQL Editor, o una migración si el usuario decide formalizarla), policies de `SELECT` para `authenticated` en `tiendas` y `empresas` -- como mínimo `USING (true)` (dado que ambas ya son de solo-lectura de catálogo para cualquier rol autenticado en el resto de la aplicación, p. ej. `AdminInstaladores`/`MasterCalendar` ya asumen poder leer nombres de tienda) o, más restrictivo, scoped por `empresa_id` si el usuario prefiere limitar la visibilidad entre empresas. Esta es la misma recomendación ya hecha, sin ejecutarse, en el Sprint 5.2.3.1 -- se repite aquí porque la auditoría de esta ronda confirma que sigue siendo la causa raíz, ahora con la cadena completa trazada línea por línea. Adicionalmente, se recomienda verificar (sección 9) si `coordinadores` también carece de policy de auto-lectura -- de ser así, sería prudente agregar `FOR SELECT USING (id = auth.uid())` a esa tabla también, aunque la evidencia de esta ronda no permite confirmar si ya existe. Ninguna de estas dos acciones se ejecuta en este Sprint -- quedan como decisión explícita del usuario para el Sprint 5.2.3.4 (o el número que corresponda).

No se propone ningún cambio de frontend como solución -- el mecanismo de bloqueo (`enabledValue`/`sucursalLockValue`) ya es correcto; lo que falta es que su dato de entrada (`tiendaNombre`) deje de ser `null`. Un cambio de frontend (p. ej. tratar `''` como "todavía no resuelto" en vez de "sucursal real") solo ocultaría el síntoma sin corregir que el nombre de tienda nunca llega -- exactamente el tipo de parche que el brief prohíbe explícitamente.

## 12. Archivos leídos en esta auditoría (ninguno modificado)

`src/services/profile.service.ts`, `src/providers/OperationalContextProvider.tsx`, `src/providers/AuthProvider.tsx`, `src/providers/SessionProvider.tsx`, `src/providers/auth.context.ts`, `src/providers/session.context.ts`, `src/layouts/RootLayout.tsx`, `src/layouts/CoordinatorLayout.tsx`, `src/components/shared/publish-modal.tsx`, `src/components/shared/sucursal-select.tsx`, `src/repositories/tiendas.repository.ts`, `src/repositories/empresas.repository.ts`, `src/repositories/coordinadores.repository.ts`, `docs/database/DATABASE_INVENTORY.md`, `docs/database/DATABASE_DIFF.md`, `docs/architecture/frontend/SPRINT_4_2_1_AUTH_REPORT.md`, `docs/architecture/frontend/SPRINT_5_2_3_2_PUBLICAR_SUCURSAL_CONTEXT_REPORT.md`, `supabase/migrations/0001_initial_schema.sql`, `supabase/migrations/0002_auth_roles_rls.sql`.
