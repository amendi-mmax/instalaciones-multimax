# FRONTEND_SYNC_PLAN.md — Plan de Migración del Frontend

**Estado de este documento**: propuesta de orden de trabajo para un Sprint futuro. **No se modifica ningún archivo de código en este Sprint** (4.0.2 es una auditoría de solo lectura). Este plan se limita a proponer la secuencia más segura para cuando el usuario autorice la adaptación.

---

## 1. Punto de partida

Gracias al hallazgo estructural documentado en `FRONTEND_AUDIT.md` (sección 0), la adaptación **no requiere tocar la mayoría del frontend**: 58 de 76 archivos son compatibles sin cambios (primitivos de UI y componentes sin acoplamiento al modelo de datos), y la capa activamente riesgosa (`types/`, `lib/mappers.ts`, `contexts/AuthContext.tsx`) todavía no está conectada a ningún componente real. Esto permite planear la migración por capas, de adentro hacia afuera, sin "big bang".

## 2. Orden de trabajo propuesto

# Fase 0 — Generación automática de tipos TypeScript

**Principio rector de esta fase**: los tipos de base de datos **no deben escribirse manualmente**. El punto de partida de todo el Sprint de adaptación debe ser el esquema oficial de Producción (la baseline oficial, `supabase/migrations/0001_initial_schema.sql`), leído directamente desde el proyecto Supabase real mediante herramientas automáticas — nunca transcrito a mano como se hizo en Fase 3 (de donde proviene toda la desalineación documentada en `FRONTEND_DIFF.md`).

**Flujo recomendado**:

1. Generar automáticamente los tipos desde Supabase utilizando la CLI oficial. Ejemplo de comando (documentado únicamente; **no se ejecuta en este Sprint** — requiere un proyecto Supabase vinculado, fuera del alcance de esta auditoría/documentación):
   ```
   supabase gen types typescript --linked > src/types/database.generated.ts
   ```
   (Alternativa sin CLI vinculada: `supabase gen types typescript --project-id <id> > src/types/database.generated.ts`, usando el `project-id` real del proyecto de Producción.)
2. Mantener `src/types/database.generated.ts` como archivo **generado automáticamente**: su contenido es un espejo fiel del esquema real en todo momento, y se **regenera** (no se edita) cada vez que cambie el esquema de Producción.
3. Crear, por separado, `src/types/domain.ts` como la adaptación del dominio del proyecto (camelCase, agrupaciones semánticas, tipos derivados como `JobEngagementState`) — construida **a partir de** `database.generated.ts`, nunca reemplazándolo.
4. **Nunca modificar manualmente `database.generated.ts`.** Cualquier edición manual se perderá en la siguiente regeneración y, mientras tanto, generará una divergencia silenciosa entre lo que el archivo dice y lo que Producción realmente tiene.
5. Toda personalización (nombres de dominio, validaciones adicionales, tipos de UI derivados, uniones discriminadas, etc.) debe vivir únicamente en `domain.ts`, `mappers.ts`, DTOs y Adapters — nunca en el archivo generado.

**Ventajas de este enfoque frente a la transcripción manual usada en Fase 3**:
- Elimina errores humanos de transcripción (la causa raíz de buena parte de las incompatibilidades documentadas en `FRONTEND_DIFF.md` fue transcribir a mano un esquema que luego cambió).
- Sincronización automática con el esquema real en cada regeneración.
- Evita divergencias silenciosas entre el tipo TypeScript y la columna real de la base de datos.
- Facilita futuras migraciones: al cambiar el esquema en Producción, basta con volver a ejecutar el comando y revisar los errores de compilación resultantes (en vez de auditar manualmente el diff, como fue necesario en este Sprint 4.0.2).
- Permite regenerar los tipos tras cualquier cambio en Producción sin depender de que una persona recuerde actualizar un archivo escrito a mano.

**Relación con la Fase 1**: el paso 1 de la Fase 1 (reescribir `types/database.ts` a mano) queda **superado** por este enfoque — el archivo resultante de la Fase 0 (`database.generated.ts`) reemplaza esa reescritura manual. Ver la nota al inicio de la Fase 1.

### Fase 1 — Contrato de datos (`types/`)

> **Nota de coherencia con la Fase 0**: el paso 1 de esta fase (antes descrito como "reescribir `types/database.ts` a mano") se resuelve en la práctica ejecutando la Fase 0 (`supabase gen types typescript --linked > src/types/database.generated.ts`) y no escribiendo las interfaces manualmente. Se conserva aquí la referencia a las 8 tablas/columnas esperadas únicamente como criterio de verificación de que la generación automática produjo lo esperado, no como instrucción de escritura manual.

1. Verificar que `database.generated.ts` (Fase 0) contiene las 8 tablas reales (`admins`, `coordinadores`, `instaladores`, `empresas`, `tiendas`, `trabajos`, `trabajo_instaladores`, `ofertas`) con los nombres de columna exactos documentados en `docs/database/DATABASE_INVENTORY.md` sección 2, más un tipo para la vista `trabajos_para_instalador`.
2. Reescribir `types/domain.ts` en camelCase equivalente. Decisión de diseño a tomar explícitamente con el usuario antes de escribir código: ¿se mantiene una interfaz `Usuario` unificada con un campo discriminador, o se modelan `Admin`/`Coordinador`/`Instalador` como tipos separados (más fiel a la estructura real de 3 tablas)? Se recomienda esta segunda opción por fidelidad al esquema, pero es una decisión de arquitectura de frontend que debe confirmarse, no asumirse.
3. Reescribir `types/enums.ts`: eliminar `TrabajoPhase`/`BidEstado`/`NotificacionCanal` (sin respaldo real); documentar el vocabulario real de `trabajos.estado` y `trabajo_instaladores.estado` como uniones de string (no ENUMs de base de datos, pero sí útiles como tipo de UI), inferido del código de las funciones `asignar_instalador`/`submit_bid` (ver `DATABASE_INVENTORY.md` sección 5) — señalando explícitamente que, al no haber CHECK constraint, este vocabulario es una convención de aplicación, no una garantía de base de datos.

**Motivo de empezar aquí**: es la capa de menor superficie (3 archivos) y de la que dependen todas las demás decisiones (Fase 2 en adelante no puede empezar sin esto).

### Fase 2 — Mappers (`lib/mappers.ts`)

4. Reescribir las funciones `map*RowToDomain` contra los tipos nuevos de la Fase 1. Como no tienen importadores hoy, este cambio es aislado y no requiere tocar ningún componente.

### Fase 3 — Contexto de sesión (`contexts/AuthContext.tsx`)

5. Redefinir `AuthContextValue` conforme a la decisión tomada en el paso 2 (Usuario unificado vs. tipos separados). Actualizar el comentario que referencia `SELECT * FROM usuarios WHERE auth_id = auth.uid()` para reflejar la consulta real contra `admins`/`coordinadores`/`instaladores`. Esta fase sigue sin conectar Auth de verdad (eso es una fase de integración posterior, fuera de alcance de este plan) — solo alinea la forma de los tipos.

### Fase 4 — Constantes y mocks (`constants/index.ts`)

6. Actualizar los comentarios JSDoc que prometen datos futuros de tablas legacy (`sucursales`, `usuarios`) para referenciar los nombres reales (`tiendas`, `admins`/`coordinadores`/`instaladores`).
7. No es necesario renombrar los campos de los mocks (`InstallerMock`, `MisJobMock`, `TrabajoMock`) en esta fase — solo cuando se conecten a datos reales (Fase 6).

### Fase 5 — Componentes con acoplamiento Medio (13 archivos, ver `FRONTEND_COMPATIBILITY_MATRIX.md`)

8. Renombrar props/variables internas que calcan nombres legacy sin romper la UI visual: `sucursalActiva`→(mantener temporalmente o renombrar a `tiendaActiva`), `bidMins`→`bidMinutos` en `publish-modal.tsx`/`live-countdown.tsx`, `publishedAt`→`publicadoAt`. Este paso es opcional y de bajo riesgo — puede diferirse hasta que se conecten datos reales (Fase 6), ya que hoy son solo nombres internos sin efecto funcional.

### Fase 6 — Capa de servicios/hooks (no existe todavía)

9. Crear `src/services/` con los primeros servicios reales (`admins.service.ts`, `coordinadores.service.ts`, `instaladores.service.ts`, `trabajos.service.ts`, `ofertas.service.ts`), usando los tipos de la Fase 1 y llamando a las funciones RPC reales (`asignar_instalador`, `submit_bid`) donde corresponda en vez de `UPDATE`/`INSERT` directos.
10. Crear `src/hooks/` con los hooks de TanStack Query que consuman esos servicios.
11. Conectar `constants/index.ts` → reemplazar `TRABAJOS`/`MISJOBS`/`INSTALLERS` por los hooks reales, componente por componente (mismo criterio incremental que Fase 3 del proyecto).

### Fase 7 — Resolución de riesgos de backend (bloqueante para ciertas pantallas)

12. Antes de construir cualquier pantalla que dependa de leer `admins`, `coordinadores`, `empresas` o `tiendas` directamente, debe resolverse el hallazgo de `DATABASE_DIFF.md`/`DATABASE_SYNC_PLAN.md`: esas 4 tablas no tienen ninguna policy RLS — hoy son inaccesibles vía `anon`/`authenticated`. Esto es un bloqueante de backend, no de frontend, pero condiciona el orden: las pantallas de perfil de coordinador/admin y de gestión de tiendas no deben empezarse hasta que ese punto se resuelva.

## 3. Justificación del orden

El orden prioriza primero los archivos con más "radio de explosión" en términos de tipos (Fase 1) antes que los de UI (Fase 5), porque cualquier decisión de forma de datos tomada después de escribir componentes obligaría a retrabajo. A la vez, se deja la Fase 5 (componentes) como de prioridad baja/opcional en el corto plazo, precisamente porque hoy no está conectada a datos reales — no hay urgencia funcional, solo prolijidad de nombres.

Las Fases 0 a 4 (7 archivos, más el flujo de generación automática de la Fase 0) son las únicas estrictamente necesarias para que el contrato de datos quede alineado con la Producción. Las Fases 5 a 7 dependen de que el usuario autorice avanzar hacia la integración real de Supabase (fuera del alcance de esta auditoría).

## 4. Riesgos a mitigar durante la migración

- **No usar memoria/documentación previa como fuente de verdad** — cada campo debe verificarse contra `docs/database/DATABASE_INVENTORY.md` en el momento de escribirlo, no contra este plan ni contra la memoria de sprints anteriores (mismo principio de verificación que ya rigió esta auditoría).
- **No asumir que el vocabulario de `estado` inferido de las funciones (`'notificado'`, `'respondido'`, etc.) es exhaustivo** — al no haber CHECK constraint, Producción podría aceptar (o ya contener) valores no vistos en el código de las 2 funciones auditadas. Se recomienda consultar `SELECT DISTINCT estado FROM trabajo_instaladores` / `SELECT DISTINCT estado FROM trabajos` contra la base real antes de fijar los tipos de UI como definitivos.
- **Decisión de arquitectura pendiente de confirmación explícita del usuario**: unificar `Usuario` vs. separar `Admin`/`Coordinador`/`Instalador` (paso 2). No se debe decidir unilateralmente al implementar — este plan solo la señala, no la resuelve.
