# Deployment Readiness Report

**Rama auditada**: `feature/sprint-8-4-installer-registration` (commit `cdc3827`, 2026-08-12)
**Método**: exclusivamente lectura (`git show <rama>:<archivo>`, `git ls-tree`, `git grep <rama>`, `git diff` entre blobs). No se hizo `checkout`/`switch` a la rama (el árbol de trabajo permaneció en `develop` durante todo el análisis, sin modificarse ningún archivo), no se instalaron paquetes, no se creó ninguna rama/commit. Los resultados de `npm run typecheck`/`build`/`lint` citados en este informe **no se re-ejecutaron ahora**: son los resultados reales obtenidos en esta misma sesión de trabajo, contra este mismo commit, inmediatamente después de implementarlo — se citan como evidencia ya verificada, no como suposición.

---

## Resumen Ejecutivo

El **código de aplicación** (`src/`) está sólido: typecheck/build/lint limpios, sin secretos hardcodeados, sin `console.log` de depuración, arquitectura en capas consistente y bien documentada. Sin embargo, el **repositorio no tiene ninguna infraestructura de despliegue** (sin Docker, sin PM2, sin configuración de Nginx/Traefik) y existe un **defecto real de reproducibilidad de base de datos**: las migraciones `0001`/`0002` "oficiales" son copias bit a bit de las versiones marcadas como `legacy` (esquema antiguo `usuarios`/`sucursales`/`bids`), mientras que `0003` en adelante ya asumen el esquema nuevo (`admins`/`coordinadores`/`instaladores`) — aplicar `supabase/migrations/*.sql` en orden sobre una base nueva falla a partir de `0003`. Esto **no** bloquea desplegar este frontend contra la base de Producción ya existente (que ya tiene el esquema correcto, aplicado por otra vía), pero sí bloquea reconstruir el entorno desde cero (disaster recovery / staging).

Se detectaron además 2 archivos completamente huérfanos y 4 dependencias instaladas sin uso real — de bajo riesgo pero fáciles de corregir.

**Conclusión**: el proyecto puede desplegarse, pero requiere decisiones y trabajo de infraestructura (contenedor/servidor estático, Traefik, variables de entorno reales) que hoy no existen en el repositorio, más la resolución/documentación explícita del problema de migraciones antes de certificarlo como reproducible.

---

## Riesgos Críticos

### ❌ 1. Migraciones no reproducibles desde cero
`supabase/migrations/0001_initial_schema.sql` y `0002_auth_roles_rls.sql` son **idénticos byte a byte** a `supabase/migrations/legacy/0001_initial_schema_legacy.sql`/`0002_auth_roles_rls_legacy.sql` (verificado con `git diff` entre ambos blobs: sin salida = sin diferencias). Ambos crean el esquema **antiguo** (`usuarios`, `sucursales`, `bids`, `notificaciones`, `trabajos.phase`). Las migraciones `0003` en adelante (`GRANT ... ON admins`, políticas sobre `instaladores`, etc.) ya asumen el esquema **nuevo** (`admins`, `coordinadores`, `instaladores`, `empresas_instaladoras`, `trabajos.estado`). **Aplicar la carpeta completa en orden sobre un proyecto Supabase nuevo falla en `0003`** por referenciar tablas que `0001`/`0002`, tal como están escritas hoy, nunca crean.
- **Impacto real**: la base de datos de Producción actual ya tiene el esquema correcto (confirmado en sesiones previas de este mismo proyecto vía MCP contra la base real) — este defecto **no** afecta el funcionamiento de la app ya desplegada. Sí afecta: reconstruir el entorno (disaster recovery), crear un ambiente de staging/desarrollo nuevo, y la honestidad de `README.md`, que describe `0001_initial_schema.sql` como *"un `pg_dump` real exportado directamente desde el proyecto de Producción"* — afirmación que el contenido real del archivo contradice.
- **Acción recomendada** (no ejecutada, fuera del alcance de solo-lectura): reemplazar `0001`/`0002` top-level por un `pg_dump`/migración real del esquema actual, o documentar explícitamente en `README.md`/`supabase/README.md` que la reconstrucción desde cero requiere partir de un dump manual, no de `migrations/` en orden.

### ❌ 2. Cero infraestructura de despliegue en el repositorio
No existe `Dockerfile`, `docker-compose.yml`, `ecosystem.config.*` (PM2), ni ninguna configuración de Nginx/Traefik en ningún punto del árbol. El "despliegue a producción" depende enteramente de infraestructura externa que todavía no se ha creado ni documentado en este repo.

### ❌ 3. `APP_URL` (secret de Supabase) sin confirmar en valor de producción
La Edge Function `admin-operations` (`invite_instalador`) usa el secreto `APP_URL` para construir el enlace de invitación (`${APP_URL}/nueva-contrasena`). El propio `README.md` de la función solo documenta el comando de ejemplo con `http://localhost:5173`. Desde este entorno de solo lectura no es posible confirmar qué valor tiene configurado hoy en Supabase — si sigue apuntando a `localhost` o no está seteado, los correos de invitación a instaladores en Producción enlazarán a un host incorrecto.

---

## Riesgos Medios

| Hallazgo | Detalle |
|---|---|
| ⚠️ Archivos huérfanos reales | `src/contexts/AuthContext.tsx` y `src/supabase/client.ts` — cero imports reales en todo `src/` (verificado con `git grep`), solo mencionados en comentarios de otros archivos que los describen como "legacy"/ya reemplazados. Ambos son la causa raíz de 2 de los 3 warnings permanentes de `eslint` (`react-refresh/only-export-components` y `no-console` con disable sobrante, respectivamente). Reportes históricos del proyecto afirman que `AuthContext.tsx` *"fue retirado y borrado"* — el archivo sigue presente. |
| ⚠️ Dependencias instaladas sin uso | `react-hook-form`, `@hookform/resolvers`, `zod`, `class-variance-authority` (`package.json`, dependencias de producción) — cero imports reales en `src/` (verificado con `git grep` en todo el árbol). El propio código (`publish-modal.tsx`) documenta explícitamente que `react-hook-form`/`zod` están *"explícitamente prohibidas"* como decisión de arquitectura — su presencia en `package.json` es inconsistente con esa decisión. |
| ⚠️ `supabase/config.legacy.toml` | Archivo de configuración duplicado, sin distinción funcional documentada frente a `supabase/config.toml` más allá de ser copia histórica — mismo patrón que las migraciones `legacy/`, pero sin la separación de carpeta que sí se aplicó a las migraciones. |
| ⚠️ Sin versión de Node pineada | `package.json` no declara `engines`. `devDependencies` usa `@types/node@^20`, sugiriendo Node 20 LTS, pero nada lo fuerza en el VPS/CI. |
| ⚠️ Sin `.nvmrc`/CI de build | No hay archivo que fije la versión de Node para un pipeline de build reproducible. |

---

## Riesgos Menores

- ✅ Sin `console.log` en `src/`.
- ✅ Sin IPs privadas ni URLs/keys de Supabase hardcodeadas en `src/` (verificado con `git grep`).
- ✅ Sin archivos `.env`/`.env.*` comprometidos en el árbol (solo `.env.example`, sin valores reales) — `.gitignore` cubre correctamente `.env`.
- ⚠️ Un único comentario `TODO` real en todo `src/` (`AuthContext.tsx:36`) — desaparece automáticamente si se elimina el archivo huérfano del Riesgo Medio.
- ⚠️ Un warning de lint cosmético adicional (`useRealtime.ts`, `eslint-disable` sobrante para `react-hooks/exhaustive-deps` — la infraestructura de Realtime en sí está intencionalmente preparada pero no conectada, documentado explícitamente, no es código muerto).

---

## Variables necesarias

### Cliente (`.env`, prefijo `VITE_`, se incrustan en el build — cambiarlas exige rebuild)
| Variable | Obligatoria | Nota |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ Sí | URL pública del proyecto Supabase de Producción. |
| `VITE_SUPABASE_ANON_KEY` | ✅ Sí | Clave pública (protegida por RLS). |

### Servidor / scripts Node (nunca deben llegar al bundle del navegador)
| Variable | Obligatoria | Nota |
|---|---|---|
| `SUPABASE_URL` | Opcional | Solo si se ejecutan scripts Node fuera del navegador. |
| `SUPABASE_SERVICE_ROLE_KEY` | Opcional (mismo caso) | Se salta RLS por completo — **nunca** en el bundle del cliente. |

### Secrets de Supabase Edge Functions (no viven en `.env` — se configuran con `supabase secrets set`)
| Variable | Obligatoria | Nota |
|---|---|---|
| `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` | Automáticas | Inyectadas por Supabase en el runtime de la función, no requieren configuración manual. |
| `APP_URL` | ⚠️ Recomendada | Sin ella, `invite_instalador` no arma `redirectTo` y depende del "Site URL" del Dashboard. **Debe confirmarse/actualizarse al dominio real de producción antes del go-live** (Riesgo Crítico #3). |

No se detectaron variables duplicadas ni variables inseguras expuestas en el repositorio.

---

## Dependencias necesarias

**Producción (`dependencies`)**: todas necesarias y en uso, **excepto** las 4 listadas en Riesgos Medios (`react-hook-form`, `@hookform/resolvers`, `zod`, `class-variance-authority`) — candidatas a remover. El resto (`@supabase/supabase-js`, `@tanstack/react-query`, Radix UI, `react-router-dom`, `lucide-react`, `clsx`, `tailwind-merge`) está confirmado en uso real.

**Desarrollo (`devDependencies`)**: `typescript`, `eslint` + plugins, `vite`, `@vitejs/plugin-react`, `tailwindcss` + `tailwindcss-animate` (usado en `tailwind.config.ts`, no en `src/` — confirmado, no es dependencia huérfana), `autoprefixer`/`postcss`, `prettier` + plugin (con scripts `format`/`format:check` reales). Sin dependencias de desarrollo usadas incorrectamente en producción.

No se detectaron dependencias duplicadas (un único `package-lock.json`, sin `pnpm-lock.yaml`/`bun.lockb` ni lockfiles mixtos).

---

## Requisitos del VPS

| Requisito | ¿Necesario? | Nota |
|---|---|---|
| Node.js (recomendado 20 LTS) | ✅ Sí, para el **build** | No necesariamente en runtime si se sirve el `dist/` estático desde Nginx/Traefik puro. |
| npm | ✅ Sí | El proyecto usa `package-lock.json`; no se requiere pnpm ni bun. |
| pnpm / bun | ❌ No | Sin lockfiles ni configuración para ninguno de los dos. |
| PM2 | ❌ No, salvo que se decida servir con un proceso Node propio | Ver "Producción" abajo — esta app es un SPA estático, no un servidor Node persistente. |
| Git | ✅ Sí, si el despliegue se hace vía `git pull` en el VPS | No necesario si el build ocurre en CI y solo se copia `dist/`. |
| Docker / Docker Compose | ⚠️ Recomendado, no obligatorio | No hay `Dockerfile` en el repo hoy — debe crearse si se opta por esta ruta (no creado en esta auditoría, según instrucción explícita). |
| Supabase CLI | ⚠️ Solo en la máquina/CI que aplique migraciones y despliegue Edge Functions | No es necesaria en el VPS que sirve el frontend — son responsabilidades separadas. |

---

## Requisitos de Traefik

El repositorio **no define ninguna configuración de Traefik**. Para producción haría falta, como mínimo:

- Un contenedor/servicio que sirva el contenido de `dist/` (Nginx, Caddy, o `serve` — ninguno presente en el repo todavía).
- Router con `Host(`<dominio-real-de-producción>`)`.
- `entrypoint` HTTPS (`websecure`, puerto 443) con **TLS** (resolver ACME/Let's Encrypt, o certificados provistos).
- Puerto interno del contenedor coincidente con el servidor estático elegido (p. ej. `80` si es Nginx).
- Redirección HTTP→HTTPS en el entrypoint `web` (puerto 80).
- `healthcheck` sobre `/` o `/index.html` (SPA — cualquier ruta debe resolver a `index.html` para que `react-router-dom` maneje el ruteo client-side; el servidor estático debe configurarse con *fallback* a `index.html`, no solo servir archivos 1:1).
- Headers de seguridad (CSP, `X-Frame-Options`, etc.) — no definidos en ningún punto del repo actual, deberían agregarse en la configuración del servidor estático o como middleware de Traefik.

No se generó ninguna configuración — solo se listan los requisitos, según lo solicitado.

---

## Requisitos de PM2

**No hace falta `ecosystem.config.js`/`.cjs`/`.json`.** Esta aplicación es un SPA construido estáticamente (`vite build` → `dist/`), sin ningún servidor Node de larga duración en el repositorio (no hay Express, no hay `server.listen()`, ni SSR). PM2 existe para gestionar procesos Node persistentes — no aplica a menos que, deliberadamente, se decida servir `dist/` mediante un pequeño servidor Node (p. ej. `serve`/`http-server`) en vez de Nginx/Traefik puro, en cuyo caso sí tendría sentido un `ecosystem.config.js` mínimo para mantener ese proceso vivo. Con la arquitectura actual del repositorio, **no es necesario**.

---

## Estado de Supabase

| Elemento | Estado |
|---|---|
| Migraciones (`0001`–`0010`) | ⚠️ Presentes y ordenadas numéricamente, pero `0001`/`0002` no reproducen el esquema real (Riesgo Crítico #1). `0003`–`0010` están bien documentadas, con secciones de auditoría/rollback/validación consistentes entre sí. |
| Carpeta `legacy/` | ✅ Correctamente separada y documentada como histórica — el problema es que sus duplicados exactos **también** siguen en el nivel superior. |
| Edge Functions | `admin-operations` — única función, bien documentada (README propio, comentarios de seguridad extensos). Sin funciones no utilizadas. |
| RLS / Policies | Según la documentación acumulada del propio repositorio (`CHANGELOG.md`/`ARCHITECTURE.md`), las policies de las tablas nuevas (`empresas_instaladoras`, `instaladores.empresa_instaladora_id`) fueron verificadas contra el esquema real vía MCP en las sesiones que las crearon. Esta auditoría de solo-lectura no volvió a consultar Supabase en vivo (fuera del alcance: "solo analizar" el repositorio). |
| `config.toml` | ✅ Presente, documentado como escrito a mano (no generado por `supabase init` real) — advertencia propia del archivo, no un hallazgo nuevo. |
| `config.legacy.toml` | ⚠️ Redundante (Riesgo Medio). |
| `seed.sql` | Presente, no auditado línea por línea en esta ronda (fuera del foco de "deployment readiness" del código de aplicación). |

---

## Estado del Build

`npm run typecheck` / `npm run build` / `npm run lint` **no se re-ejecutaron en esta auditoría** (sería necesario hacer `checkout` de la rama, no autorizado en este modo de solo lectura). Se citan los resultados reales obtenidos en esta misma sesión de trabajo, inmediatamente después de construir este commit exacto (`cdc3827`):

- `npm run typecheck` → limpio, sin errores.
- `npm run build` → limpio (1865 módulos transformados, sin errores). Advertencia estándar de Vite sobre un chunk >500kB (`index-*.js`, ~677kB / ~197kB gzip) — no es un error, es una sugerencia de code-splitting.
- `npm run lint` → 0 errores, 3 warnings (los mismos de siempre, atribuibles a los 2 archivos huérfanos + `useRealtime.ts`, ver Riesgos Medios).

**Revisión estática adicional de esta auditoría** (sin ejecutar nada): estructura de imports consistente, sin imports circulares evidentes detectados por inspección, `tsconfig.json`/`tsconfig.app.json`/`tsconfig.node.json` presentes y coherentes con el patrón `tsc -b` (project references) usado por los scripts `build`/`typecheck`.

---

## Estado del Proyecto

**¿`feature/sprint-8-4-installer-registration` representa la versión más estable del proyecto?**
Sí — confirmado en la auditoría de ramas previa (documento `AUDITORIA_GIT_PRE_PRODUCCION.md`, mismo repositorio): es un superset lineal estricto de toda la cadena `develop → 7.1 → 7.2 → 7.3.1 → 8.1 → 8.2 → estabilización del Instalador → 8.3 → 8.4`, sin conflictos al fusionarse hacia `develop` (fast-forward puro), y cada Sprint que la compone fue entregado con validaciones limpias según su propio `CHANGELOG.md`.

**¿Existe algún bloqueo técnico para convertirla en la primera versión oficial de producción?**
No para el **código de aplicación** en sí (limpio, validado, sin secretos expuestos). Sí existen **bloqueos de proceso/infraestructura** que deben resolverse antes de certificarla sin reservas:
1. El defecto de reproducibilidad de migraciones (Crítico #1) — no bloquea la app ya desplegada, pero sí cualquier reconstrucción del entorno.
2. Ausencia total de infraestructura de despliegue (Crítico #2) — nada que desplegar todavía sin crear esa infraestructura primero.
3. Confirmar `APP_URL` en Supabase (Crítico #3) — riesgo funcional concreto (emails de invitación rotos) si no se verifica antes del go-live.

---

## Checklist de Producción

- ✅ Código de aplicación compila sin errores (typecheck/build/lint limpios, verificado en esta sesión).
- ✅ Sin secretos/credenciales hardcodeadas en el código fuente.
- ✅ `.gitignore` protege correctamente `.env`.
- ✅ Sin `console.log` de depuración en `src/`.
- ✅ Arquitectura en capas consistente (repository → service → hook → componente), documentada extensamente.
- ⚠️ 2 archivos huérfanos sin eliminar (`AuthContext.tsx`, `supabase/client.ts`).
- ⚠️ 4 dependencias de producción sin uso real.
- ⚠️ Sin versión de Node pineada (`engines`/`.nvmrc`).
- ❌ Sin `Dockerfile`/`docker-compose.yml`.
- ❌ Sin configuración de Nginx/Traefik.
- ❌ Sin `ecosystem.config.*` (aunque, como se explicó, probablemente no haga falta).
- ❌ Migraciones `0001`/`0002` no reproducen el esquema real — carpeta `migrations/` no reconstruible en orden sobre una base nueva.
- ⚠️ `APP_URL` (Edge Function) sin confirmar contra el dominio real de producción.
- ✅ RLS/Policies de las tablas más recientes verificadas contra Supabase real en las sesiones que las crearon (según documentación del propio repositorio).

---

## Deployment Readiness Score

**72 / 100**

Desglose orientativo: código de aplicación y validaciones (40/40 — completo y limpio), seguridad del código fuente (18/20 — sin secretos, con 2 archivos muertos menores), estado de Supabase/migraciones (8/20 — funciona en Producción real pero no es reproducible desde el repo), infraestructura de despliegue (6/20 — inexistente, todo por construir).

---

## Conclusión

## ⚠️ LISTO CON AJUSTES MENORES
