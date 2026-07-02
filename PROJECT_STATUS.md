# PROJECT_STATUS.md — HANDYMAX · Multimax Despacho

Última actualización: 2026-07-01 — Fase 2 (Scaffold del proyecto), corrección post-validación local

## Regla de validación (vigente desde la corrección de Fase 2, aplica a todo el proyecto)

> Ninguna fase podrá darse por aprobada mientras el proyecto no compile correctamente ejecutando satisfactoriamente: `npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`.

Esta sesión no tiene acceso a `registry.npmjs.org` (ver más abajo), así que estas cinco validaciones **siguen pendientes de confirmarse en un entorno local real** antes de que la Fase 2 quede formalmente cerrada.

## Orden de implementación (actualizado en Fase 2)

Por pedido del usuario, a partir de esta fase el orden de implementación cambia para facilitar desarrollo/pruebas locales. **La arquitectura de `ARCHITECTURE.md` no cambia**, solo el orden en que se construye:

1. Fase 2 — Scaffold del proyecto ✅ (esta fase)
2. Fase 3 — Layout general, navegación, header, sidebar, componentes compartidos
3. Fase 4 — Módulo Coordinator
4. Fase 5 — Módulo Installer
5. Fase 6 — Módulo Admin
6. Fase 7 — Integración completa con Supabase
7. Fase 8 — Realtime
8. Fase 9 — Eliminación de datos mock
9. Fase 10 — Pruebas finales, optimización, documentación

## Qué quedó implementado

- Proyecto Vite + React 18 + TypeScript inicializado a mano (ver "Problema encontrado — bloqueo de red" abajo, npm no pudo generarlo vía `npm create vite`).
- Tailwind CSS + configuración de shadcn/ui (`components.json`) preparados, con la paleta y tipografías del prototipo ya cableadas como variables CSS y `tailwind.config.ts`.
- React Router, TanStack Query, Supabase JS Client, React Hook Form, Zod, `@hookform/resolvers` y Lucide React agregados a `package.json` (pendientes de instalación real, ver bloqueo abajo).
- ESLint (flat config) + Prettier (con `prettier-plugin-tailwindcss`) configurados.
- Alias de importación `@/` configurado en `tsconfig.app.json` y `vite.config.ts`.
- Estructura completa de carpetas `src/` según `ARCHITECTURE.md` §3 (con `.gitkeep` en las que aún no tienen archivos).
- Archivos base creados: `main.tsx`, `App.tsx`, `routes/AppRouter.tsx` (placeholder), `contexts/AuthContext.tsx` (placeholder tipado, sin conexión real a Supabase Auth), `supabase/client.ts` (cliente preparado, sin queries), `styles/globals.css` (variables, fuentes y keyframes del prototipo, sin las clases `mx-*` todavía), `types/database.ts`, `types/domain.ts`, `types/enums.ts`, `lib/mappers.ts` (conversión snake_case ↔ camelCase), `lib/utils.ts` (helper `cn()` de shadcn), `constants/index.ts` (placeholder).
- `.env.example` creado con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` vacíos.
- `handymax_supabase_schema_v3.sql` copiado **sin ninguna modificación** a `supabase/migrations/0001_initial_schema.sql` (verificado con `diff`, idéntico byte a byte).
- No se migró ningún componente del HTML, no se implementó lógica de negocio, no se conectó Supabase, no se implementó Auth ni Realtime — tal como se pidió para esta fase.

## Problema encontrado — bloqueo de red (crítico, no resuelto)

El entorno donde corre esta sesión tiene una **política de red que no permite acceso al registro de npm** (`registry.npmjs.org` y otros hosts de paquetes están fuera del *allowlist* de salida). Al intentar `npm create vite@latest` y luego `npm install`, ambos fallan con:

```
Host not in allowlist: registry.npmjs.org. Add this host to your network egress settings to allow access.
```

Esto significa que, en esta sesión, **no fue posible ejecutar realmente**:
- `npm create vite@latest`
- `npm install`
- `npx shadcn@latest init` / `npx shadcn@latest add ...`
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`

Como alternativa, se construyó **a mano** todo lo que esos comandos habrían generado (mismo `package.json`, misma configuración de Vite/Tailwind/shadcn/ESLint/Prettier que se habría obtenido con las herramientas oficiales), y se corrió la validación más rigurosa posible sin `node_modules`, usando un compilador TypeScript y Prettier ya presentes en el entorno para otras tareas (no forman parte del proyecto ni de sus dependencias declaradas):

- `tsc --noEmit` sobre todo `src/` con la configuración real del proyecto: **cero errores de sintaxis o de código propio**. Los únicos errores reportados son `Cannot find module 'react'`, `'react-router-dom'`, `'@tanstack/react-query'`, etc. — es decir, exactamente lo esperable sin `node_modules` instalado, no fallas del código.
- `prettier --check` con la configuración real del proyecto (menos el plugin de Tailwind, que tampoco se pudo instalar): **todos los archivos ya cumplen el estilo configurado**, cero diffs.
- Todos los `.json` de configuración (`package.json`, `tsconfig*.json`, `components.json`, `.prettierrc.json`) verificados como JSON válido.
- `handymax_supabase_schema_v3.sql` copiado y comparado con `diff` contra el original: idéntico.

Esto da una confianza razonable de que el proyecto **debería** instalar y compilar sin problemas en un entorno con acceso normal a npm, pero **no reemplaza** la validación real pedida (`npm install && npm run lint/typecheck/build/dev`), que no se pudo ejecutar aquí.

### Cómo desbloquear esto

- Si esta sesión corre sobre el entorno en la nube de Claude Code (infraestructura descrita en la documentación de "Claude Code on the web"), su propietario puede agregar `registry.npmjs.org` (y, si hace falta, `npm.jsr.io`, `unpkg.com`, `cdn.jsdelivr.net`) a la lista de hosts permitidos en la configuración de red del entorno.
- Alternativa: ejecutar `npm install && npm run lint && npm run typecheck && npm run build && npm run dev` en tu propia máquina (tienes el proyecto disponible en tu carpeta "DESARROLLO APLICACIÓN INSTALACIONES") o en un entorno con salida a internet normal, y reportar aquí el resultado para que quede registrado.
- En Claude/Cowork, si tu organización controla el acceso de red desde Admin settings → Capabilities, revisa también esa configuración.

## Corrección de Fase 2 — errores detectados en validación local del usuario

El usuario corrió el scaffold en su máquina y reportó tres errores. Los tres eran reales y ya están corregidos en el código entregado:

1. **`Cannot find module 'node:path'` en `npm run typecheck`.** Causa raíz real: faltaba `@types/node` en `devDependencies` — sin él, ningún módulo `node:*` resuelve, sin importar cuál se use. Corregido: se agregó `"@types/node": "^20.14.0"` a `package.json`, y se restringió explícitamente `"types": ["node"]` en `tsconfig.node.json` (solo para los archivos de configuración) y `"types": []` en `tsconfig.app.json` (para que los tipos de Node — `process`, `Buffer`, `__dirname`, etc. — no se filtren al código de navegador en `src/`, que es el error de aislamiento contrario).
2. **`Cannot find name '__dirname'`.** No era solo un error de tipos: con `"type": "module"` en `package.json`, `vite.config.ts` se carga como ESM nativo, donde `__dirname` no existe en tiempo de ejecución (es un global exclusivo de CommonJS) — es decir, además del error de TypeScript esto habría **roto `vite build`/`vite dev` en tiempo real**, no solo el typecheck. Corregido: `vite.config.ts` ahora resuelve el alias `@/` con el patrón oficial de Vite para ESM: `fileURLToPath(new URL('./src', import.meta.url))`, sin `path.resolve`/`__dirname`.
3. **CSS `@import must precede all other statements`.** `src/styles/globals.css` tenía las directivas `@tailwind` antes del `@import` de Google Fonts, lo cual es CSS inválido (solo `@charset` puede preceder a `@import`). Corregido: el `@import` ahora es la primera declaración del archivo, antes de `@tailwind base/components/utilities`.

### Revisión completa adicional (no limitada a los tres errores reportados)

- `eslint.config.js` aplicaba `globals.browser` (globals de navegador) a **todo** archivo `.ts`/`.tsx` del repo, incluidos `vite.config.ts` y `tailwind.config.ts`, que en realidad corren en Node en tiempo de build. Corregido: se separó en dos bloques — `src/**/*.{ts,tsx}` con `globals.browser` + reglas de React, y `*.config.{ts,js}` con `globals.node`, sin reglas de React (no aplican a archivos de configuración).
- `tsconfig.json` tenía un formato inconsistente con el resto del repo (detectado al re-correr `prettier --check`); se reformateó, sin cambio de contenido/comportamiento.
- Se volvió a correr `prettier --check`/`--write` sobre todo el repo con la configuración real del proyecto: cero diferencias de estilo tras los ajustes.
- Se revisaron uno por uno `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `tailwind.config.ts`, `postcss.config.js`, `globals.css`, el alias `@/`, la configuración ESM (`"type": "module"` + todos los archivos de configuración cargados como ESM: `postcss.config.js`, `tailwind.config.ts`, `eslint.config.js`, `vite.config.ts`) y las variables de entorno (`.env.example` + `vite-env.d.ts`) — no se encontró ningún problema adicional a los ya corregidos.

### Validación best-effort repetida (mismas limitaciones que en el cierre original de Fase 2)

Esta sesión sigue sin acceso a `registry.npmjs.org`, así que de nuevo no fue posible ejecutar `npm install` real ni los scripts `lint`/`typecheck`/`build`/`dev` tal cual. Se repitió la validación estática con las mismas herramientas ajenas al proyecto ya presentes en el entorno:

- `tsc --noEmit -p tsconfig.app.json`: cero errores de código propio (solo `Cannot find module` para paquetes no instalados, como antes).
- `tsc --noEmit -p tsconfig.node.json`: ahora falla con `Cannot find type definition file for 'node'` — **exactamente el comportamiento esperado**, porque `@types/node` tampoco se pudo instalar aquí (mismo bloqueo de red). Esto confirma que la corrección apunta al lugar correcto: en cuanto `npm install` corra de verdad (aquí o en tu máquina), este error debe desaparecer.
- `prettier --check` con la configuración real del proyecto (menos el plugin de Tailwind, no instalable aquí): cero diferencias en todo el repo.
- Todos los `.json` de configuración siguen siendo JSON válido.

**Esto no reemplaza las cinco validaciones obligatorias.** Siguen pendientes de confirmarse corriendo literalmente `npm install && npm run lint && npm run typecheck && npm run build && npm run dev` en un entorno con acceso a npm (tu máquina, o este entorno si se ajusta su política de red — ver sección siguiente).

## Qué falta

- **Bloqueante para cerrar la Fase 2**: ejecutar `npm install && npm run lint && npm run typecheck && npm run build && npm run dev` en un entorno con acceso real a npm, y confirmar los cinco en verde.
- Fase 3 en adelante: layout general, navegación, header, sidebar, componentes compartidos, y luego los módulos Coordinator / Installer / Admin, integración con Supabase, Realtime, eliminación de mocks, y pruebas finales (ver nuevo orden arriba). No se inicia hasta que la Fase 2 quede formalmente validada.

## Problemas encontrados (heredados de Fase 1, siguen sin resolver)

Ver `ARCHITECTURE.md` §11 y el `PROJECT_STATUS.md` de Fase 1 para el detalle completo. Resumen de los que siguen pendientes de decisión del usuario:

1. Rotación de la `service_role` key de Supabase (acción del usuario, no bloquea el scaffold pero sí bloqueará Auth/Edge Functions).
2. Confirmación sobre el concepto de "coordinador master".
3. Confirmación sobre columnas potencialmente faltantes en `trabajos` (`fecha`/`hora` sugeridas, `extra`, `urgente`, `assigned_at`).
4. Aprobación de la función Postgres `seleccionar_instalador()`.
5. Aprobación del trigger de vínculo `usuarios.auth_id` ↔ `auth.users`.

Ninguno de estos bloquea el scaffold de esta fase; sí bloquearán las fases 7 (Integración con Supabase) y 8 (Realtime) si no se resuelven antes.

## Recomendaciones

- Resolver el bloqueo de red antes de dar por cerrada formalmente la Fase 2 (o aceptar cerrarla con la validación best-effort documentada arriba, a criterio del usuario).
- Aprovechar la Fase 3 (layout/navegación/componentes compartidos) para, en cuanto haya `node_modules`, correr por primera vez `npm install` real y confirmar que todo el scaffold de la Fase 2 efectivamente compila antes de agregar componentes nuevos.

## Próximos pasos

Esperar decisión del usuario sobre el bloqueo de red y aprobación para iniciar la Fase 3 (Layout general / Navegación / Header / Sidebar / Componentes compartidos). No se avanza automáticamente.
