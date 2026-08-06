# HANDYMAX - Multimax Despacho

## Objetivo

Este proyecto corresponde a la reconstrucción completa de la plataforma HANDYMAX - Multimax Despacho.

La prioridad es mantener la estabilidad del proyecto, reutilizar la arquitectura existente y avanzar Sprint por Sprint sin introducir cambios innecesarios.

Este archivo define las reglas permanentes que Claude Code debe seguir durante todo el desarrollo.

---

# Arquitectura

Stack del proyecto:

- React
- Vite
- TypeScript
- TailwindCSS
- Supabase
- Edge Functions
- PostgreSQL
- MCP Supabase
- Git

La arquitectura ya está definida.

No crear una nueva arquitectura.

No rediseñar componentes existentes.

No cambiar la estructura del proyecto salvo que exista una razón técnica demostrable.

---

## Operaciones Git permitidas

Claude Code puede ejecutar automáticamente durante un Sprint:

- git status
- git diff
- git log
- git show
- git stash
- git stash pop
- git stash apply
- git merge
- git rebase

si dichas operaciones sean necesarias para completar el Sprint o sincronizar ramas de Sprints anteriores.

Solo deberá solicitar confirmación cuando la operación implique:

- git push
- git push --force
- git reset --hard
- git clean -fd
- git rebase --interactive
- git revert
- git tag
- git cherry-pick sobre ramas remotas
- eliminación de ramas

---

## Verificaciones automáticas

Claude Code puede ejecutar automáticamente, sin solicitar aprobación:

- grep
- find
- wc
- head
- tail
- cat
- diff
- git status
- git diff
- git show
- git log
- git reflog
- git stash list
- git branch
- git remote
- git rev-parse

Siempre que dichas operaciones sean exclusivamente de lectura y no modifiquen el repositorio.

---

# Fuente de verdad

La fuente de verdad del proyecto es:

1. Código del repositorio.
2. Estado real de Supabase consultado mediante MCP.
3. Documentación oficial del proyecto.

Nunca asumir el estado de la base de datos.

Siempre consultar el MCP cuando sea necesario.

---

# Uso del MCP

El MCP está completamente operativo.

Utilízalo únicamente cuando sea necesario para:

- consultar tablas
- consultar datos
- revisar esquemas
- revisar migraciones
- desplegar Edge Functions
- revisar Edge Functions
- consultar logs
- generar tipos TypeScript
- validar políticas RLS
- ejecutar SQL de validación

No utilizar el MCP para repetir auditorías completas ya realizadas.

No ejecutar consultas innecesarias.

Antes de asumir cualquier estado de Supabase consulta primero el MCP.

---

# Edge Functions

Antes de modificar cualquier Edge Function:

- obtener primero la versión desplegada
- compararla con el código local
- modificar únicamente si el Sprint lo requiere

Después de modificar una Edge Function:

- validar TypeScript
- validar build
- desplegar únicamente la función modificada

---

# Autenticación — enlaces de Auth

Ningún flujo de autenticación debe depender exclusivamente del Site URL configurado en Supabase.

Todos los enlaces generados desde la aplicación (recuperación de contraseña, invitación, y cualquier flujo de Auth futuro que redirija) deberán enviar explícitamente `redirectTo`.

El Dashboard de Supabase actuará únicamente como allowlist mediante Redirect URLs cuando sea posible.

Ver `ARCHITECTURE.md` §14.10 para el detalle técnico completo (Sprint 7.2).

---

# Módulo de Cuenta de Usuario

Las pantallas de cuenta (`/perfil`, `/configuracion`, `/cambiar-contrasena`) son rutas hermanas de `/` en `AppRouter.tsx`, con su propio layout (`AccountLayout.tsx`) — no dependen de `RootLayout.tsx`/`CoordinatorLayout.tsx` ni de sus ramas por rol.

Cualquier Sprint futuro que agregue una pantalla nueva a este módulo debe seguir el mismo criterio: layout propio, resuelto vía `useAuth()`/`useUserContext()` directamente, sin modificar `RootLayout.tsx`/`CoordinatorLayout.tsx`.

Ninguna preferencia de usuario tiene tabla real en Supabase todavía — se persisten en `localStorage`, exclusivamente vía `account.service.ts` (nunca directamente desde un componente) hasta que exista una migración explícitamente autorizada para eso.

Toda pantalla de este módulo (y `HeaderUserMenu`) debe consumir `useUserContext()` (`src/hooks/useUserContext.ts`) como única fuente del usuario/perfil/preferencias — no llamar a `useAuth()`/`useUserPreferences()` por separado para datos que `UserContext` ya expone. Las acciones de sesión (`login`/`logout`/`updatePassword`) siguen viniendo de `useAuth()` — `UserContext` expone datos derivados, no acciones.

Cualquier ruta "de vuelta al Dashboard" debe usar `getDashboardRoute(rol)` (`src/lib/role-helpers.ts`) — nunca un `Navigate to="/despacho"` hardcodeado nuevo. Excepción documentada: `CoordinatorIndexRedirect` (`AppRouter.tsx`) resuelve una pregunta distinta (ver `ARCHITECTURE.md` §14.12) y no reutiliza este helper a propósito.

Ver `ARCHITECTURE.md` §14.11 (Sprint 7.3) y §14.12 (Sprint 7.3.1) para el detalle técnico completo.

---

# BackOffice de Administración (Dashboard Ejecutivo)

Ningún indicador/KPI de la interfaz debe mostrar jamás mensajes técnicos: nombres de tabla, columnas, SQL, RLS, RPC, mensajes crudos de Supabase/Postgrest, ni stack traces. Esa información vive únicamente en `ARCHITECTURE.md`.

Todo indicador debe soportar exactamente 4 estados (`AdminKpiStatus`, `src/services/admin-dashboard.service.ts`): `ready` (valor real), `loading` (Skeleton), `pending` (badge "Próximamente", sin texto adicional), `error` (mensaje genérico fijo, nunca el mensaje real de Supabase).

Todo KPI del BackOffice se renderiza con `AdminKpiCard` (`src/components/shared/admin-kpi-card.tsx`) — ninguna pantalla debe construir su propia tarjeta de indicador. La capa de datos sigue el patrón de 3 pasos documentado en `admin-dashboard.service.ts` (obtención → transformación → presentación vía `buildAdminKpiViewModels`) para agregar KPIs nuevos sin tocar el componente.

Ver `ARCHITECTURE.md` §14.13 (Sprint 8.1) y §14.14 (Sprint 8.1.1) para el detalle técnico completo, incluida la causa raíz exacta (verificada vía MCP) de por qué "Tiempo promedio de respuesta"/"Tiempo promedio de instalación" siguen en estado `pending`.

---

# Base de datos

Nunca modificar directamente la estructura.

Todos los cambios deben realizarse mediante migraciones versionadas.

Si una tabla cambia:

- crear migración
- validar mediante MCP
- generar nuevamente los tipos TypeScript

No ejecutar SQL destructivo salvo autorización explícita.

No aplicar migraciones directamente mediante MCP sin que previamente exista el archivo SQL versionado dentro del repositorio.

Toda modificación de la base de datos debe seguir este orden:

1. Crear la migración SQL.
2. Revisar su contenido.
3. Actualizar la documentación.
4. Aplicar la migración mediante MCP.
5. Validar el resultado con MCP.

---

# Desarrollo

Trabajar únicamente sobre el Sprint solicitado.

No desarrollar funcionalidades futuras.

No modificar Sprints aprobados.

No refactorizar código estable salvo dependencia técnica demostrable.

Reutilizar siempre componentes existentes antes de crear nuevos.

Mantener consistencia con el diseño actual.

---

# Validaciones obligatorias

Antes de finalizar cualquier Sprint ejecutar:

npm run typecheck

npm run build

Corregir cualquier error antes de continuar.

Nunca dejar errores de compilación.

---

# Git

Realizar cambios mínimos.

No modificar archivos no relacionados.

Mantener commits pequeños y coherentes.

Respetar la estructura de ramas del proyecto.

---

# Documentación

Al finalizar cada Sprint actualizar:

- CHANGELOG.md
- PROJECT_STATUS.md
- docs/SPRINTS_INDEX.md

Registrar:

- archivos modificados
- migraciones creadas
- Edge Functions desplegadas
- validaciones realizadas
- resultado del Sprint

---

# Diagnósticos cerrados

Los siguientes diagnósticos se consideran cerrados y no deben volver a investigarse salvo petición explícita del usuario:

- Auditoría completa del MCP.
- Auditoría de permisos service_role.
- Auditoría de RLS sobre admins.
- Auditoría de RLS sobre instaladores.
- Comparación entre código local y Edge Function desplegada.
- Auditoría de verifyCaller().
- Auditoría de serviceRoleClient.
- Auditoría de callerClient.
- Auditoría de SUPABASE_SERVICE_ROLE_KEY.
- Auditoría de role_table_grants.
- Auditoría de aclexplode().
- Auditoría de pg_policies.
- Auditoría de pg_roles.
- Auditoría de pg_tables.
- Auditoría de pg_class.
- Auditoría de get_logs().
- Auditoría de execute_sql().
- Confirmación de que service_role no posee SELECT sobre public.admins.
- Confirmación de que service_role no posee SELECT sobre public.instaladores.
- Confirmación de que postgres es el propietario de las tablas.
- Confirmación del uso correcto del MCP.

Si alguno de estos temas vuelve a aparecer durante un Sprint, utilizar las conclusiones existentes y continuar el desarrollo sin reiniciar la investigación.

---

# Flujo de trabajo

Cuando se solicite implementar un Sprint:

1. Identificar el Sprint.
2. Revisar únicamente los recursos necesarios.
3. Consultar el MCP únicamente si hace falta validar el estado real.
4. Elaborar un plan mínimo.
5. Implementar.
6. Ejecutar typecheck.
7. Ejecutar build.
8. Actualizar documentación.
9. Finalizar el Sprint.

No reiniciar investigaciones previamente cerradas.

No volver a auditar permisos ya confirmados.

No repetir consultas SQL innecesarias.

---

## Ejecución automática del Sprint

Una vez aprobado el plan técnico de un Sprint, Claude Code deberá ejecutar el Sprint completo de forma autónoma.

Durante la implementación:

- No solicitar confirmaciones entre pasos.
- Ejecutar automáticamente todas las tareas planificadas.
- Resolver dependencias necesarias para completar el Sprint.
- Mantener la arquitectura existente.
- Mantener la coherencia del proyecto.
- Finalizar completamente el Sprint antes de detenerse.

Claude Code únicamente deberá detener la ejecución cuando ocurra alguna de las siguientes situaciones:

- Se requiera una decisión funcional del usuario.
- Sea necesario modificar la arquitectura del proyecto.
- Sea necesario modificar el modelo de datos de forma destructiva.
- Sea necesario aplicar una migración irreversible.
- Sea necesario desplegar recursos sobre producción cuya ejecución no pueda revertirse fácilmente.
- Sea necesario realizar una operación que implique riesgo de pérdida de información.
- Exista una ambigüedad funcional que no pueda resolverse a partir del código, la documentación o el estado del proyecto.

En cualquier otro caso deberá continuar automáticamente hasta finalizar el Sprint.

Un Sprint no se considera terminado hasta que:

- `npm run typecheck` finaliza sin errores.
- `npm run build` finaliza sin errores.
- Las validaciones funcionales previstas para ese Sprint se han ejecutado.
- La documentación (`CHANGELOG.md`, `PROJECT_STATUS.md` y `docs/SPRINTS_INDEX.md`) está actualizada.
- Existe un resumen final con los archivos creados, modificados y las acciones realizadas sobre Supabase.

---

## Automatización del desarrollo

Durante un Sprint Claude Code deberá:

- Ejecutar automáticamente todas las tareas planificadas.
- Ejecutar `npm run typecheck` cuando finalice la implementación.
- Corregir automáticamente los errores de TypeScript encontrados.
- Ejecutar nuevamente `npm run typecheck` hasta obtener un resultado limpio.
- Ejecutar `npm run build`.
- Corregir automáticamente los errores de compilación encontrados.
- Ejecutar nuevamente `npm run build` hasta obtener una compilación correcta.
- Revisar únicamente los logs necesarios si aparece un error relacionado con Supabase.
- Utilizar el MCP únicamente cuando aporte información necesaria para completar el Sprint.
- Evitar consultas repetitivas al MCP.
- Evitar volver a investigar diagnósticos previamente cerrados.

---

## Optimización del flujo

Durante un Sprint:

- Evitar mensajes intermedios indicando "Ahora ejecutaré...", "Compilaré...", "Actualizaré..." o similares.
- Agrupar las tareas relacionadas en una única ejecución cuando sea posible.
- Reducir al mínimo las interrupciones durante el desarrollo.
- Priorizar la finalización completa del Sprint sobre la generación de mensajes de progreso.
- Optimizar el uso del contexto y evitar pasos redundantes.

---

## Niveles de autonomía

Claude Code puede tomar decisiones técnicas autónomas cuando:

- Mejoran la calidad del código.
- Corrigen errores de compilación.
- Corrigen errores de TypeScript.
- Reutilizan componentes existentes.
- Reutilizan servicios existentes.
- Mejoran el tipado.
- Eliminan código muerto.
- Corrigen imports.
- Corrigen errores de lint o build.
- Mejoran el rendimiento sin alterar el comportamiento funcional.

Claude Code NO debe tomar decisiones autónomas cuando:

- Cambien el comportamiento funcional del sistema.
- Cambien reglas de negocio.
- Cambien permisos.
- Cambien RLS.
- Cambien autenticación.
- Cambien la arquitectura.
- Cambien el modelo de datos.
- Cambien contratos públicos de APIs.
- Cambien Edge Functions ya aprobadas.
- Requieran desplegar recursos sobre producción.
- Requieran migraciones destructivas.

---

# Respuesta esperada

Antes de escribir código:

1. Identificar el Sprint solicitado.
2. Explicar brevemente qué se implementará.
3. Indicar qué recursos del MCP serán utilizados.
4. Elaborar un plan mínimo de implementación.
5. Esperar autorización únicamente cuando vaya a aplicar migraciones, desplegar Edge Functions o realizar cambios potencialmente destructivos.

---

# Principios

Priorizar:

- simplicidad
- reutilización
- consistencia
- rendimiento
- mantenibilidad

Evitar:

- duplicación de código
- cambios masivos
- refactorizaciones innecesarias
- asumir estados de Supabase
- crear componentes redundantes

---

# Objetivo principal

El objetivo principal ya no es investigar.

El objetivo es desarrollar el proyecto.

El MCP debe utilizarse como fuente de verdad del estado de Supabase.

Claude Code debe comportarse como un desarrollador senior del proyecto, implementando únicamente los cambios necesarios para completar cada Sprint con el menor impacto posible sobre el código existente.

Cada implementación debe dejar el proyecto compilando correctamente y listo para el siguiente Sprint.
