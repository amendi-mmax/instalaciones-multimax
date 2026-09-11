-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint: Factura Multimax
-- ============================================================
-- Requiere: 0001..0024 ya aplicadas. Es ADITIVA/no destructiva: agrega una
-- única columna NULLABLE a `public.trabajos`. No modifica ninguna columna,
-- policy, función ni tabla existente.
--
-- ────────────────────────────────────────────────────────────
-- CONTEXTO (auditoría previa, ver informe entregado al usuario)
-- ────────────────────────────────────────────────────────────
-- Caso de negocio: un cliente puede pagar el servicio de instalación en
-- una factura Multimax ya existente, emitida en la sucursal. El trabajo
-- debe conservar una referencia a ese número de factura -- texto libre
-- (mismo criterio que el resto de columnas de referencia de `trabajos`,
-- p. ej. `codigo`/`calle`/`requisitos`, todas `text` sin formato impuesto
-- por la base de datos).
--
-- No todos los trabajos publicados tienen por qué tener una factura
-- asociada al momento de publicarse (confirmado: no existe ninguna regla
-- de negocio, documentada ni en código, que obligue a asociar una factura
-- a todo trabajo) -- por eso la columna es NULLABLE y el campo del
-- formulario de publicación es opcional, no obligatorio.
-- ============================================================

ALTER TABLE public.trabajos
    ADD COLUMN IF NOT EXISTS factura_multimax text NULL;

-- ============================================================
-- VALIDACIÓN (ejecutar después de aplicar)
-- ============================================================
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema='public' and table_name='trabajos'
--   and column_name='factura_multimax';
-- -- debe devolver 1 fila, is_nullable='YES'.

-- ============================================================
-- ROLLBACK
-- ============================================================
-- ALTER TABLE public.trabajos DROP COLUMN IF EXISTS factura_multimax;

-- ============================================================
-- FIN DE LA MIGRACIÓN 0025
-- ============================================================
