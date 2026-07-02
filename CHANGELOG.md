# CHANGELOG.md — HANDYMAX · Multimax Despacho

Formato libre, en orden cronológico descendente. Cada entrada corresponde a una sesión/fase de trabajo.

## [Fase 2 — corrección] — 2026-07-01

### Corregido
- `package.json`: agregado `@types/node` (faltaba; causa raíz de `Cannot find module 'node:path'` en `npm run typecheck`).
- `vite.config.ts`: reemplazado `path.resolve(__dirname, ...)` por el patrón oficial de Vite para ESM, `fileURLToPath(new URL('./src', import.meta.url))`. `__dirname` no existe en tiempo de ejecución con `"type": "module"`, así que esto era también un bug real de runtime, no solo de tipos.
- `src/styles/globals.css`: el `@import` de Google Fonts ahora precede a `@tailwind base/components/utilities` (CSS inválido si no es así).
- `tsconfig.app.json`: agregado `"types": []` para que los tipos de Node no se filtren al código de navegador.
- `tsconfig.node.json`: agregado `"types": ["node"]` para los archivos de configuración (`vite.config.ts`, `tailwind.config.ts`).
- `eslint.config.js`: separado en dos bloques (`src/**/*.{ts,tsx}` con globals de navegador + reglas de React; `*.config.{ts,js}` con globals de Node, sin reglas de React) — antes se aplicaban globals de navegador también a los archivos de configuración que corren en Node.
- `tsconfig.json`: reformateado con Prettier (sin cambio de contenido).

### Regla nueva del proyecto
- Ninguna fase se da por aprobada sin `npm install && npm run lint && npm run typecheck && npm run build && npm run dev` en verde, ejecutados en un entorno con acceso real a npm.

### Sin cambios
- No hubo cambios funcionales ni arquitectónicos. No se tocó `ARCHITECTURE.md`. No se creó ningún componente ni lógica de negocio nueva. `TODO.md` no se modificó (no fue estrictamente necesario).
- El bloqueo de red de este entorno hacia `registry.npmjs.org` sigue vigente — ver `PROJECT_STATUS.md`. La validación real de las cinco pruebas obligatorias sigue pendiente de confirmarse fuera de esta sesión.

## [Fase 2] — 2026-07-01

### Añadido
- Scaffold completo del proyecto: `package.json` (React, Vite, TypeScript, Tailwind, shadcn/ui, React Router, TanStack Query, React Hook Form, Zod, `@hookform/resolvers`, Lucide React, Supabase JS Client, ESLint, Prettier).
- Configuración: `tsconfig.json`/`tsconfig.app.json`/`tsconfig.node.json` con alias `@/`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `components.json` (shadcn), `eslint.config.js` (flat config), `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.env.example`.
- Estructura completa de `src/` según `ARCHITECTURE.md` §3.
- Archivos base: `main.tsx`, `App.tsx`, `routes/AppRouter.tsx` (placeholder), `contexts/AuthContext.tsx` (placeholder tipado), `supabase/client.ts` (cliente sin queries), `styles/globals.css` (variables/fuentes/keyframes del prototipo), `types/database.ts`, `types/domain.ts`, `types/enums.ts`, `lib/mappers.ts`, `lib/utils.ts`, `constants/index.ts`.
- `supabase/migrations/0001_initial_schema.sql`: copia verbatim de `handymax_supabase_schema_v3.sql` (verificada con `diff`, sin diferencias).

### Cambiado
- Orden de implementación de las fases siguientes (Fase 3 en adelante), a pedido del usuario: Layout general → Coordinator → Installer → Admin → Integración Supabase → Realtime → Eliminación de mocks → Pruebas finales. La arquitectura de `ARCHITECTURE.md` no cambió, solo la secuencia.
- `PROJECT_STATUS.md` y `TODO.md` reestructurados para reflejar el nuevo orden.

### Reportado (sin resolver)
- **Bloqueo de red**: el entorno de esta sesión no permite acceso a `registry.npmjs.org` (política de red del entorno), por lo que `npm create vite`, `npm install`, `npx shadcn`, `npm run lint/typecheck/build/dev` no pudieron ejecutarse realmente. Se construyó el scaffold a mano y se corrió una validación estática best-effort (TypeScript y Prettier ya presentes en el entorno, ajenos a las dependencias del proyecto) que no encontró errores de código propio — solo los `Cannot find module` esperables sin `node_modules`. Ver `PROJECT_STATUS.md` para el detalle y las opciones para desbloquear.

## [Fase 1] — 2026-07-01

### Añadido
- Recepción y análisis completo de los tres archivos fuente del proyecto (`Multimax_Despacho_v1.3.html`, `handymax_supabase_schema_v3.sql`, `Handymax_Documentacion_Tecnica.pdf`).
- `ARCHITECTURE.md`: arquitectura propuesta completa (stack, árbol de carpetas, inventario de componentes, hooks, servicios, contextos, rutas, tipos TypeScript, estrategias de Auth/RLS/Realtime, plan de migración del HTML, riesgos técnicos, orden de implementación).
- `PROJECT_STATUS.md`, `TODO.md`, `CHANGELOG.md` iniciales.
- Carpeta de proyecto creada en el entorno de trabajo (`handymax-despacho/`).

### Reportado (sin modificar)
- Alerta de seguridad: `service_role` key expuesta en conversación anterior, pendiente de rotación por el usuario.
- Posible fuga de datos del cliente por RLS a nivel de fila (no de columna) si se consulta `trabajos` en vez de `trabajos_vista`.
- Ambigüedad del concepto "coordinador master" frente al schema y las políticas RLS actuales.
- Columnas potencialmente faltantes en `trabajos` (`fecha`/`hora` sugeridas, `extra`, `urgente`) y ausencia de `assigned_at`.
- Propuesta (no implementada) de función Postgres `seleccionar_instalador` para hacer atómica la asignación de instalador.
- Propuesta (no implementada) de trigger para vincular `usuarios.auth_id` con `auth.users` en el primer login.

### Sin cambios
- No se modificó ni se ejecutó ningún cambio sobre `handymax_supabase_schema_v3.sql`.
- No se escribió código de aplicación (React, hooks, servicios) — solo documentación, según lo solicitado para esta fase.
