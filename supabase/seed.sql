-- ============================================================
-- HANDYMAX · Seed data
-- Multimax Despacho — plataforma de despacho de instaladores
-- ============================================================
-- Datos iniciales del entorno Multimax (empresa base + sus 9
-- sucursales reales). Se ejecuta DESPUÉS de aplicar todas las
-- migraciones de `supabase/migrations/` (ver `supabase/README.md`
-- para el orden completo y los distintos métodos de ejecución).
--
-- Origen: este archivo es exactamente el mismo INSERT/DO $$ que
-- vivía embebido en `supabase/migrations/0001_initial_schema.sql`
-- (Sprint 1) — se extrajo aquí, sin ningún cambio de contenido,
-- como parte de Sprint 4.0.1 (segunda ronda, "Database
-- Infrastructure Baseline"), cuyo objetivo es que las migraciones
-- contengan únicamente estructura (CREATE/ALTER/índices/funciones/
-- vistas/RLS) y que los datos vivan separados, en este archivo.
--
-- Idempotencia — RIESGO REAL DETECTADO (Sprint 4.0.1, segunda
-- ronda, validado con PostgreSQL 16 real, ver PHASE_4.md): el
-- INSERT de `empresas` SÍ es idempotente (`ON CONFLICT (slug) DO
-- NOTHING`, y `slug` tiene UNIQUE en el schema). El INSERT de
-- `sucursales`, en cambio, usa `ON CONFLICT DO NOTHING` SIN
-- columna de conflicto porque `sucursales` no tiene ningún UNIQUE
-- constraint (solo `id`, generado por `gen_random_uuid()`, nunca
-- choca) — en la práctica esa cláusula no evita nada, y ejecutar
-- este archivo dos veces DUPLICA las 9 sucursales. Esto ya era así
-- en el bloque original dentro de `0001_initial_schema.sql`, no es
-- un bug introducido por este Sprint — se documenta aquí porque
-- solo se hizo evidente al probarlo con una base de datos real dos
-- veces seguidas. No se agrega un UNIQUE constraint nuevo sin
-- aprobación (el brief de este Sprint prohíbe modificar tablas/
-- columnas/relaciones); queda reportado como riesgo pendiente de
-- decisión en `PHASE_4.md`.
--
-- NOTA (discrepancia detectada, documentada en PHASE_4.md): el
-- brief de este Sprint menciona mover también un "Administrador
-- inicial" a este archivo. Se revisó `0001_initial_schema.sql` en
-- su totalidad y NO existe ningún INSERT de un usuario admin
-- inicial — la tabla `usuarios` nunca tuvo datos sembrados en el
-- schema real (los usuarios se crean vía Auth + la política "Admin
-- puede crear usuarios", no por seed). No se inventó un INSERT de
-- admin sin una fuente real que lo respalde; si se desea sembrar un
-- admin inicial, es una decisión de producto pendiente de
-- aprobación explícita del usuario (requiere, además, un
-- `auth.users` real vía Supabase Auth, no solo una fila en
-- `usuarios`).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. EMPRESA BASE: Multimax
-- ────────────────────────────────────────────────────────────
INSERT INTO empresas (nombre, slug)
VALUES ('Multimax', 'multimax')
ON CONFLICT (slug) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 2. SUCURSALES: las 9 sucursales actuales de Multimax
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
    mx_id uuid;
BEGIN
    SELECT id INTO mx_id FROM empresas WHERE slug = 'multimax';

    INSERT INTO sucursales (empresa_id, nombre, provincia) VALUES
        (mx_id, 'Tumba Muerto',  'Panamá'),
        (mx_id, 'Multiplaza',    'Panamá'),
        (mx_id, 'Albrook',       'Panamá'),
        (mx_id, 'Metromall',     'Panamá'),
        (mx_id, 'Los Andes',     'Panamá'),
        (mx_id, 'Westland',      'Panamá'),
        (mx_id, 'Costa Verde',   'Panamá'),
        (mx_id, 'Chiriquí',      'Chiriquí'),
        (mx_id, 'Paso Canoas',   'Chiriquí')
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- FIN DEL SEED
-- ============================================================
