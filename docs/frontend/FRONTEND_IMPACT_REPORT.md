# FRONTEND_IMPACT_REPORT.md — Resumen Ejecutivo

**Sprint**: 4.0.2 — Frontend Synchronization Audit. Auditoría de solo lectura; ningún archivo de `src/`, `supabase/`, `package.json`, `tsconfig`, `vite.config` ni `tailwind` fue modificado.

---

## 0. Resumen ejecutivo para Project Management (lectura en menos de 1 minuto)

| Indicador | Valor |
|---|---|
| **Estado general del frontend** | Prototipo de interfaz funcional, sin integración real a Supabase todavía. No hay errores estructurales — el desajuste con el Modelo actual de Producción es de nomenclatura/contrato de tipos, no de lógica rota |
| **Archivos auditados** | 76 |
| **Compatibles** (sin acoplamiento al modelo de datos) | 58 (76%) |
| **Parcialmente compatibles** (Mixto — usan `Rol` o mocks con nombres heredados) | 13 (17%) |
| **Incompatibles** (Legacy puro, 100% desalineados de la Producción) | 5 (7%) |
| **Servicios reales existentes** | 0 (`src/services/` vacío) |
| **Hooks reales existentes** | 0 (`src/hooks/` vacío) |
| **Estado de integración con Supabase** | No iniciada — 0 consultas reales (`.from`/`.select`/`.rpc`/etc.) en todo el proyecto; el cliente (`supabase/client.ts`) está instanciado pero no conectado a Auth/Realtime |
| **Nivel general de riesgo** | **Medio-Bajo** para el frontend existente (nada roto hoy, bajo esfuerzo de corrección); **Alto** para el diseño de la futura capa de integración si se construyera sin corregir antes el contrato de tipos |
| **Esfuerzo estimado** | Bajo-Medio para alinear lo ya construido (Fases 0 a 5 de `FRONTEND_SYNC_PLAN.md`, ~20 archivos); Alto para construir la capa de servicios/hooks nueva (Fase 6), trabajo que de todas formas habría que hacer desde cero |
| **Próximos pasos** | Confirmar la decisión de arquitectura de sesión pendiente (Usuario unificado vs. tipos separados por rol) y autorizar el Sprint de implementación de las Fases 0–4 de `FRONTEND_SYNC_PLAN.md` |

---

## 1. Cifras generales

| Métrica | Valor |
|---|---|
| Archivos `.ts`/`.tsx` auditados | 76 |
| Archivos compatibles (sin acoplamiento al modelo de datos) | 58 (76%) |
| Archivos con acoplamiento Medio (Mixto) | 13 (17%) |
| Archivos con acoplamiento Crítico (Legacy puro) | 5 (7%) |
| Directorios de la capa de servicios/hooks ya existentes pero vacíos | 5 (`services`, `hooks`, `features`, `pages`, `utils`) |
| Consultas Supabase reales encontradas en todo el frontend | 0 |

## 2. Servicios afectados

**Ninguno existe todavía** (`src/services/` está vacío). El impacto es sobre el *diseño* que tendrán los futuros servicios, no sobre código existente: deberán construirse directamente contra el esquema real (`admins`/`coordinadores`/`instaladores`/`tiendas`/`ofertas`/`trabajos`/`trabajo_instaladores`/`empresas`) y las 2 funciones RPC reales (`asignar_instalador`, `submit_bid`), sin ningún atajo de compatibilidad legacy que preservar (no hay servicios legacy en producción real de código que migrar).

## 3. Hooks afectados

**Ninguno existe todavía** (`src/hooks/` está vacío). Mismo razonamiento que en la sección anterior.

## 4. Tipos afectados

5 archivos con acoplamiento crítico: `types/database.ts`, `types/domain.ts`, `types/enums.ts`, `lib/mappers.ts`, `contexts/AuthContext.tsx`. Estos deben reescribirse por completo antes de que exista cualquier servicio o hook real. Ninguno tiene dependientes fuera de sí mismos y de `AuthContext.tsx` (que a su vez solo es consumido, hoy, por `header.tsx`/`header-status.tsx`/`header-role-switch.tsx`/`RootLayout.tsx` a través del tipo `Rol`, cuyo vocabulario de 3 strings sigue siendo válido).

## 5. Pantallas afectadas

No existen "pantallas" en el sentido de rutas reales todavía (`src/pages/` vacío; `AppRouter.tsx` solo define `/` → `RootLayout`). Los **componentes de negocio** con dependencia (directa o de nombres) al modelo legacy son 13, agrupados en 3 flujos de UI: selector de sucursal/header (4 archivos), publicación de trabajo/countdown de bid (2 archivos), y paneles de instalador/calendario maestro/radar (7 archivos). El detalle está en `FRONTEND_COMPATIBILITY_MATRIX.md`.

## 6. Consultas afectadas

Cero — no existe ninguna consulta real a Supabase en el proyecto (confirmado por búsqueda exhaustiva de `.from(`/`.select(`/`.insert(`/`.update(`/`.rpc(`/`.upsert(`/`.delete(` en todo `src/`). El impacto es enteramente prospectivo: cualquier consulta que se hubiera escrito basándose en `lib/mappers.ts` o en `types/database.ts` tal como están hoy habría fallado en Producción, pero no existe ese código todavía, por lo que no hay nada que corregir de forma reactiva.

## 7. Estimación de esfuerzo de adaptación

| Fase (ver `FRONTEND_SYNC_PLAN.md`) | Archivos | Esfuerzo relativo |
|---|---|---|
| 0 — Generación automática de tipos (`database.generated.ts`) | 1 (nuevo, generado — reemplaza la escritura manual de `types/database.ts`) | Muy bajo (mecánico vía CLI oficial; no requiere escribir tipos a mano) |
| 1 — Contrato de datos (`types/domain.ts`, `types/enums.ts`) | 2 | Medio (requiere una decisión de arquitectura: Usuario unificado vs. tipos separados por rol) |
| 2 — Mappers | 1 | Bajo (mecánico, sin importadores que romper) |
| 3 — Contexto de sesión | 1 | Bajo–Medio (depende de la decisión de la Fase 1) |
| 4 — Constantes (comentarios) | 1 | Muy bajo |
| 5 — Componentes Medio (renombrado de props/variables) | 13 | Bajo (cosmético mientras sigan usando mocks) |
| 6 — Servicios/hooks reales (no existen) | 0 existentes / construcción nueva | Alto (trabajo nuevo, no una migración) |
| 7 — Resolución de riesgos de backend (RLS de 4 tablas) | N/A (backend) | Bloqueante para ciertas pantallas hasta decidirse |

**Estimación global**: la adaptación de lo que ya existe (Fases 0–5, 20 archivos) es de esfuerzo **bajo-medio** gracias a que el 76% del frontend no tiene ningún acoplamiento al modelo de datos y a que la capa más acoplada (tipos/mappers) no tiene dependientes activos. El esfuerzo grande está en construir la capa de integración real (Fase 6), que de todas formas tendría que construirse desde cero independientemente de cuál fuera el esquema real.

## 8. Riesgos

1. **Riesgo de diseño no resuelto**: si la Fase 1 (tipos) se implementa sin decidir explícitamente el modelo de sesión (Usuario unificado vs. 3 tipos separados), el resto de las fases heredarán una ambigüedad de arquitectura.
2. **Riesgo de vocabulario no verificado**: los valores de `estado` (`trabajos.estado`, `trabajo_instaladores.estado`) se infirieron del código de 2 funciones, no de un CHECK constraint (no existe ninguno en Producción) — el vocabulario real podría ser más amplio. Debe verificarse contra datos reales antes de fijar tipos de UI.
3. **Riesgo de backend bloqueante**: 4 tablas (`admins`, `coordinadores`, `empresas`, `tiendas`) no tienen ninguna policy RLS — cualquier pantalla de perfil de administrador/coordinador o gestión de tiendas quedará bloqueada hasta que se resuelva a nivel de base de datos (ver `docs/database/DATABASE_SYNC_PLAN.md`).
4. **Riesgo de campos NOT NULL no capturados por los formularios actuales**: el `PublishModal` de hoy no captura `codigo`, `fecha` (como string, formato a confirmar) ni algunos otros campos NOT NULL de `trabajos` real — deberá ampliarse antes de poder insertar un trabajo real, no solo renombrarse.
5. **Riesgo bajo (no crítico) de que el prototipo original nunca contempló el modelo de 3 tablas de usuario**: el patrón `HeaderRoleSwitch`/`role` único asume que una sesión puede "cambiar de rol" libremente; en Producción, un `auth.users.id` pertenece de forma fija a una sola tabla. Esto es coherente como herramienta de demostración de UI (mostrar las 3 vistas), pero no debe confundirse con el comportamiento real de sesión una vez haya Auth conectado.

## 9. Recomendaciones

1. Ejecutar las Fases 1 a 4 de `FRONTEND_SYNC_PLAN.md` como un Sprint acotado y de bajo riesgo, antes de empezar cualquier trabajo funcional nuevo — desbloquea que el resto del proyecto ya no arrastre tipos incorrectos.
2. Confirmar explícitamente con el usuario, antes de escribir código, la decisión de arquitectura de sesión (Usuario unificado vs. tipos separados por rol) — no asumir.
3. Verificar contra la base de datos real el vocabulario completo de `estado` en `trabajos` y `trabajo_instaladores` antes de fijar los tipos de UI correspondientes.
4. Resolver (a nivel de backend, en un Sprint de base de datos, no de frontend) la falta de policies RLS en `admins`/`coordinadores`/`empresas`/`tiendas` antes de planear las pantallas que dependan de esas tablas.
5. Diferir el renombrado cosmético de props/variables (Fase 5) hasta el momento de conectar datos reales, para no generar dos rondas de cambios sobre el mismo componente.

## 10. Próximos pasos

Este Sprint (4.0.2) concluye aquí — es exclusivamente de auditoría. El siguiente paso corresponde a que el usuario confirme el plan de `FRONTEND_SYNC_PLAN.md` (o lo corrija) y autorice explícitamente el inicio de la Fase 1 como un nuevo Sprint de implementación (con su propio número, siguiendo la numeración vigente del proyecto).
