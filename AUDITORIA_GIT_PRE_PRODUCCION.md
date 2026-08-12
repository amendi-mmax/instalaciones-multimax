# Auditoría Git Pre-Producción — HANDYMAX · Multimax Despacho

**Fecha del análisis**: 2026-08-12
**Método**: exclusivamente comandos de lectura (`git fetch --all --prune`, `branch`, `log`, `show`, `diff`, `merge-base`, `rev-list`, `for-each-ref`, `merge-tree`, `status`). No se ejecutó ningún `merge`, `rebase`, `cherry-pick`, `reset`, `commit`, `push`, `pull` ni `checkout`/`switch` que alterara archivos o ramas. `git status` confirma árbol de trabajo limpio antes y después del análisis.

---

## 1. Inventario de ramas

**Locales**: 35. **Remotas (`origin/*`)**: 35 (sin contar `origin/HEAD`). No existe ninguna rama `release/*` ni `hotfix/*` en todo el repositorio (local ni remoto).

### Anomalías de sincronización local↔remoto

| Hallazgo | Detalle |
|---|---|
| Rama solo local | `feature/sprint-3-1-header` no tiene contraparte `origin/feature/sprint-3-1-header`. Ya está fusionada en `develop` (ver §3) — inofensiva, probablemente renombrada antes de su primer push. |
| Rama solo remota | `origin/feature/sprint-3-4-main-layout` no existe localmente. Su commit (`d5ac093`) es idéntico al de `feature/sprint-3-3-mx-subtabs`/`origin/feature/sprint-3-3-mx-subtabs` — es el mismo trabajo bajo un nombre anterior, ya fusionado en `develop`. Sin acción requerida.
| Divergencia real (menor) | `docs/architecture-audit` local (`140bf7f`) vs. `origin/docs/architecture-audit` (`4475940`): el remoto **es** el ancestro común; local tiene **1 commit propio sin pushear** encima. Esa rama ya está fusionada en `develop`, así que no bloquea nada, pero el commit local nunca llegó a `origin`. |
| Rama local adelantada a su remoto | `feature/sprint-5.1.4-coordinator-workspace-completion`: local 1 commit por delante de `origin/feature/sprint-5.1.4-coordinator-workspace-completion`. Ya fusionada en `develop` (el commit adicional no aporta nada nuevo a `develop`). |

Ninguna de estas 4 anomalías afecta la decisión de base para producción — todas corresponden a ramas ya integradas en `develop`.

---

## 2. `main` vs `develop`

```
git rev-list --count main..develop   → 35   (develop tiene 35 commits que main NO tiene)
git rev-list --count develop..main   → 0    (main no tiene ningún commit propio)
```

**`main` es un ancestro directo de `develop`, congelado en el commit `dac0211` ("Se agregan ajustes de fase 2 a main", 2026-07-03)** — el scaffold inicial (Fase 2). Nunca se volvió a actualizar. `main` **no** es utilizable como base de producción tal como está: le faltan 35 commits, es decir, todo el proyecto real (Auth, Coordinador, Instalador, Administración, Dashboard, Calendario, Empresas Instaladoras, etc.).

---

## 3. Ramas ya fusionadas en `develop`

`git branch --merged develop` (30 ramas, además de `develop` misma):

`docs/architecture-audit`, `docs/sprint-6-1-mcp-documentation`, `feature/sprint-3-1-header`, `feature/sprint-3-10-installer-dashboard`, `feature/sprint-3-11-installer-profile`, `feature/sprint-3-12-installer-jobs`, `feature/sprint-3-13-admin-dashboard`, `feature/sprint-3-14-calendar`, `feature/sprint-3-15-dialogs`, `feature/sprint-3-16-shared-components`, `feature/sprint-3-2-sidebar`, `feature/sprint-3-3-mx-subtabs`, `feature/sprint-3-4-mx-suc-sel`, `feature/sprint-3-5-publish-modal`, `feature/sprint-3-6-job-cards`, `feature/sprint-3-7-radar`, `feature/sprint-3-8-countdown`, `feature/sprint-3-9-live-countdown`, `feature/sprint-4-2-1-authentication`, `feature/sprint-5.1.1-super-admin`, `feature/sprint-5.1.2-coordinator-layout`, `feature/sprint-5.1.3-coordinator-workspace`, `feature/sprint-5.1.4-coordinator-workspace-completion`, `feature/sprint-5.1.5-coordinator-layout-fixes`, `feature/sprint-5.2.1-publish-workflow`, `feature/sprint-5.2.3-sucursal-filter`, `feature/sprint-6-2-instaladores-admin`, `feature/sprint-8-5-job-assignment` *(idéntica a `develop`, 0 commits propios — Sprint 8.5 aún no iniciado, es solo un puntero)*, `fix/sprint-5.2.1-publish-workflow-stabilization`, `main`.

Estas 30 ramas **no requieren ninguna acción de integración** — su contenido ya vive en `develop`.

---

## 4. Ramas con commits pendientes de integrar (`--no-merged`)

Dos grupos con naturaleza completamente distinta:

### 4.1 Cadena principal activa (lineal, sin conflictos entre sí)

Verificado con `git merge-base --is-ancestor` **cada rama contiene íntegramente a la anterior** — es una sola línea de desarrollo, no ramas paralelas divergentes:

```
develop (5830be3, Sprint 6.3)
  └─ feature/sprint-7-publicacion-trabajos        (+2)
       └─ feature/sprint-7-3-account-module        (+3 total)
            └─ feature/sprint-8-1-admin-dashboard       (+5 total)
                 └─ feature/sprint-8-2-1-installer-stabilization (+6 total)
                      └─ feature/sprint-8-3-installer-companies      (+7 total)
                           └─ feature/sprint-8-4-installer-registration (+8 total)  ← PUNTA REAL
```

### 4.2 Ramas divergentes / históricas (no forman parte de la línea activa)

`feature/sprint-5.2.2-supabase-publish`, `feature/sprint-5.2.3.4-rls-tiendas`, `feature/sprint-6-1-instaladores-infra`, `fix/sprint-5.2.1-kpi-loading-fix`, `fix/sprint-5.2.2.1-rls-policy-audit`, `fix/sprint-5.2.2.2-sql-grants`.

Cada una tiene **1-2 commits propios** que `develop` no tiene, pero a la vez está **5-7 commits detrás** de `develop` — se ramificaron en un punto antiguo (22-23 jul, Sprints 5.2.x/6.1) y `develop` avanzó después por una línea distinta (con versiones posteriores/rehechas de los mismos archivos: `CoordinatorLayout.tsx`, `DespachoPage.tsx`, `job-indicadores-card.tsx`, `sucursal-select.tsx`). Ver §7 para el detalle de conflictos.

---

## 5. Tabla completa por rama

| Rama | Último commit | Fecha | Autor | Commits por integrar a `develop` | Estado |
|---|---|---|---|---|---|
| `main` | `dac0211` | 2026-07-03 | Arnulfo Mendieta | 0 (0 propios, 35 detrás) | Fusionada (ancestro de develop) |
| `develop` | `5830be3` | 2026-07-30 | Arnulfo Mendieta | — (base) | Base actual |
| `feature/sprint-7-publicacion-trabajos` | `9d8a992` | 2026-08-04 | Arnulfo Mendieta | 2 | Pendiente (cadena activa) |
| `feature/sprint-7-3-account-module` | `dbc0a6d` | 2026-08-05 | Arnulfo Mendieta | 3 | Pendiente (cadena activa) |
| `feature/sprint-8-1-admin-dashboard` | `c26e813` | 2026-08-06 | Arnulfo Mendieta | 5 | Pendiente (cadena activa) |
| `feature/sprint-8-2-1-installer-stabilization` | `0faf4ac` | 2026-08-10 | Arnulfo Mendieta | 6 | Pendiente (cadena activa) |
| `feature/sprint-8-3-installer-companies` | `07d9dd5` | 2026-08-11 | Arnulfo Mendieta | 7 | Pendiente (cadena activa) |
| **`feature/sprint-8-4-installer-registration`** | **`cdc3827`** | **2026-08-12** | **Arnulfo Mendieta** | **8** | **Pendiente — rama más actualizada** |
| `feature/sprint-8-5-job-assignment` | `5830be3` | 2026-07-30 | Arnulfo Mendieta | 0 | Fusionada (idéntica a develop — Sprint 8.5 sin iniciar) |
| `feature/sprint-5.2.2-supabase-publish` | `66194e9` | 2026-07-27 | Arnulfo Mendieta | 2 (7 detrás) | **Divergente** |
| `feature/sprint-5.2.3.4-rls-tiendas` | `c83adac` | 2026-07-27 | Arnulfo Mendieta | 1 (7 detrás) | **Divergente** |
| `feature/sprint-6-1-instaladores-infra` | `df65b78` | 2026-07-27 | Arnulfo Mendieta | 1 (5 detrás) | **Divergente** |
| `fix/sprint-5.2.1-kpi-loading-fix` | `f701426` | 2026-07-23 | Arnulfo Mendieta | 1 (7 detrás) | **Divergente** |
| `fix/sprint-5.2.2.1-rls-policy-audit` | `9c27b3f` | 2026-07-23 | Arnulfo Mendieta | 1 (7 detrás) | **Divergente** |
| `fix/sprint-5.2.2.2-sql-grants` | `b1937ae` | 2026-07-23 | Arnulfo Mendieta | 1 (7 detrás) | **Divergente** |
| *(30 ramas restantes)* | — | — | — | 0 | Fusionadas (ver §3) |

---

## 6. Diferencias `develop` vs. `main` vs. `feature/*` (resumen funcional)

- **`main`**: solo scaffold de Fase 2 (estructura base, sin Auth real, sin ningún módulo funcional).
- **`develop`**: incluye hasta el Sprint 6.3 (onboarding de instaladores) — Auth real, Coordinador, Administración de instaladores básica. **No incluye**: publicación de trabajos con notificaciones (7.1/7.2), módulo de Cuenta de Usuario (7.3.1), Dashboard Ejecutivo (8.1), Master Calendar avanzado (8.2), estabilización de datos reales del Instalador (8.2.1), CRUD de Empresas Instaladoras (8.3), ni el registro de instaladores conectado a ese catálogo (8.4).
- **`feature/sprint-8-4-installer-registration`**: superset estricto de todo lo anterior — es la única rama que contiene el proyecto completo tal como está aprobado hasta la fecha.
- **Ramas divergentes (§4.2)**: versiones más antiguas y ya superadas de `CoordinatorLayout.tsx`/`DespachoPage.tsx`/flujo de publicación — sus mensajes de commit y fechas coinciden con iteraciones de estabilización que el propio `CHANGELOG.md`/`PROJECT_STATUS.md` documentan como corregidas nuevamente en rondas posteriores (ya incorporadas a `develop` por otra vía, con código distinto). **Esto es una lectura basada en fechas/mensajes/diffs, no una confirmación línea por línea de equivalencia funcional** — antes de eliminarlas, confirmar manualmente que ningún cambio único siga siendo necesario.

---

## 7. Conflictos detectados (simulados con `git merge-tree`, sin escribir nada)

| Fusión simulada | Resultado |
|---|---|
| `develop` + `feature/sprint-8-4-installer-registration` | **Sin conflictos** — fast-forward puro (es una cadena lineal). |
| `develop` + `feature/sprint-5.2.2-supabase-publish` | Conflicto en `CHANGELOG.md`, `PROJECT_STATUS.md`, `docs/SPRINTS_INDEX.md`, `src/components/shared/sucursal-select.tsx`, `src/layouts/CoordinatorLayout.tsx`, `src/layouts/RootLayout.tsx`. |
| `develop` + `feature/sprint-5.2.3.4-rls-tiendas` | Conflicto en `CHANGELOG.md`, `PROJECT_STATUS.md`, `docs/SPRINTS_INDEX.md`, `src/components/shared/sucursal-select.tsx` (y más). |
| `develop` + `feature/sprint-6-1-instaladores-infra` | Conflicto en `CHANGELOG.md`, `PROJECT_STATUS.md`, `docs/SPRINTS_INDEX.md`, **conflicto add/add en `supabase/functions/admin-operations/index.ts`** (ambas ramas crean ese archivo de forma independiente y distinta). |
| `develop` + `fix/sprint-5.2.1-kpi-loading-fix` | Conflicto en `CHANGELOG.md`, `PROJECT_STATUS.md`, `docs/SPRINTS_INDEX.md`. |
| `develop` + `fix/sprint-5.2.2.1-rls-policy-audit` / `fix/sprint-5.2.2.2-sql-grants` | Mismo patrón: documentación + archivos de Coordinador. |

**Patrón constante**: los 3 archivos de documentación (`CHANGELOG.md`, `PROJECT_STATUS.md`, `docs/SPRINTS_INDEX.md`) entran en conflicto en TODAS las fusiones no lineales, porque cada rama antigua agrega su propia entrada al principio del archivo mientras `develop` ya avanzó con entradas distintas en el mismo lugar — conflicto esperable y de bajo riesgo técnico (solo texto), pero los conflictos en `CoordinatorLayout.tsx`/`admin-operations/index.ts` sí son de código real y requieren revisión humana antes de intentar cualquier fusión de esas 6 ramas.

---

## 8. Orden de integración propuesto

1. **`feature/sprint-8-4-installer-registration` → `develop`**: única acción necesaria y **fast-forward puro, sin conflictos** (contiene íntegramente 7.1, 7.2, 7.3.1, 8.1, 8.2, la estabilización del Instalador, 8.3 y 8.4). Esto automáticamente pone `develop` al día — no hace falta fusionar 7-publicacion-trabajos/7-3-account-module/8-1/8-2-1/8-3 por separado, ya están contenidas.
2. **`develop` (actualizado) → `main`**: también sería fast-forward (main es ancestro puro de develop). Recomendado recién después del paso 1 y de la aprobación del usuario, como el commit que marca el primer release candidate.
3. **Ramas divergentes (§4.2)**: **no integrar directamente**. Requieren, para cada una: (a) confirmar si su contenido único ya está cubierto funcionalmente por el código actual de `develop`/8.4 (todo indica que sí, por fecha y por área tocada); (b) si se confirma, archivar/eliminar la rama sin fusionar; (c) si se encuentra algo genuinamente no cubierto, extraerlo manualmente (no vía `merge` directo, por los conflictos de código real ya detectados).
4. **Ramas ya fusionadas (§3, 30 ramas)**: candidatas a limpieza (`git branch -d`) una vez confirmada la sincronización — no aportan nada pendiente. Ninguna acción urgente.
5. **Anomalías del §1** (`feature/sprint-3-1-header` sin remoto, `origin/feature/sprint-3-4-main-layout` sin local, `docs/architecture-audit` con 1 commit local sin pushear): de bajo riesgo, ya fusionadas — resolver como limpieza administrativa, sin bloquear el release.

---

## 9. Rama recomendada como primera versión estable de producción

**`feature/sprint-8-4-installer-registration`** (commit `cdc3827`, 2026-08-12).

Razones:
- Es la única rama que contiene el proyecto completo y aprobado hasta la fecha (Auth, Coordinador, Publicación de trabajos con notificaciones, Cuenta de Usuario, Dashboard Ejecutivo, Master Calendar, módulo Instalador con datos 100% reales, CRUD de Empresas Instaladoras, y el registro de instaladores ya conectado a ese catálogo).
- Fusionarla en `develop` es un fast-forward limpio, **sin ningún conflicto** (verificado con `merge-tree`).
- Todas las Sprints que la componen fueron entregadas con `npm run typecheck`/`build`/`lint` limpios en cada ronda (según el propio `CHANGELOG.md` del repositorio).
- `main` y `develop`, tal como están hoy, no son aptas por sí solas: `main` le faltan 35 commits: `develop` le faltan 8, exactamente los de esta rama.

**Camino recomendado**: `feature/sprint-8-4-installer-registration` → fast-forward a `develop` → fast-forward a `main` → tag de versión (`v1.0.0` o equivalente) sobre `main`. Ninguno de estos pasos se ejecutó — quedan a la espera de tu aprobación explícita, tal como pediste.

---

## 10. Resumen ejecutivo

- ✅ 30 ramas ya fusionadas, sin acción pendiente.
- ✅ 1 cadena lineal activa (7.1 → 8.4) sin conflictos entre sí, lista para fast-forward.
- ⚠️ 6 ramas divergentes/históricas (Sprints 5.2.x/6.1) con conflictos reales de código si se intentan fusionar — requieren revisión manual, no integración automática.
- ⚠️ 4 anomalías administrativas menores de sincronización local/remoto, ninguna bloqueante.
- ❌ No existen ramas `release/*` ni `hotfix/*`.
- 🎯 Rama recomendada para producción: **`feature/sprint-8-4-installer-registration`**, vía fast-forward a `develop` y luego a `main`.

Sin cambios realizados en ninguna rama. A la espera de tu aprobación antes de ejecutar cualquier `merge`.
