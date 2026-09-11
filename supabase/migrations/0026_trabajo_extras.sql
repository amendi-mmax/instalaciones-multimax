-- ============================================================
-- HANDYMAX · Multimax Despacho — Sprint: Costos adicionales (extras)
-- ============================================================
-- Requiere: 0001..0025 ya aplicadas. Es ADITIVA/no destructiva:
--   - crea 1 tabla nueva (`trabajo_extras`), sin tocar ninguna existente;
--   - crea 1 bucket de Storage nuevo (`trabajo-extras`), privado;
--   - crea 2 RPC nuevas (`solicitar_costo_extra`/`revisar_costo_extra`);
--   - crea policies RLS nuevas, exclusivamente sobre la tabla/bucket nuevos;
--   - redefine (`CREATE OR REPLACE`, mismo mecanismo ya usado en 0018 para
--     `trabajos_para_instalador`) `marcar_trabajo_terminado()` -- MISMA
--     firma/mismo nombre/mismo tipo de retorno, solo se agrega una
--     condición adicional al WHERE del UPDATE (ver sección 5). No se
--     modifica el archivo `0024_finalizacion_trabajo.sql` -- esa migración
--     queda intacta en el historial, como corresponde.
--
-- ────────────────────────────────────────────────────────────
-- CONTEXTO (auditoría previa, ver informe entregado al usuario)
-- ────────────────────────────────────────────────────────────
-- Durante una instalación pueden surgir costos no contemplados en la
-- oferta original (andamio, material adicional, mano de obra extra, etc.).
-- El instalador debe poder reportarlo (monto + notas + fotos) ANTES de
-- marcar el trabajo como terminado; el coordinador/admin revisa y
-- aprueba/rechaza. Mientras exista una solicitud `pendiente`, el
-- instalador NO puede finalizar el trabajo (ver sección 5).
--
-- No existía ninguna tabla/modelo reutilizable para esto -- `ofertas`
-- representa la puja original del instalador por el trabajo (otra
-- entidad de negocio, con su propio ciclo de vida vía `submit_bid`), no
-- costos adicionales durante la ejecución. Se crea una entidad dedicada.
-- ============================================================


-- ============================================================
-- 1. TABLA — trabajo_extras
-- ============================================================
-- `fotos text[]` -- rutas de Storage (bucket `trabajo-extras`), no URLs
-- firmadas (esas se generan bajo demanda desde el cliente, con la sesión
-- real del usuario que las solicita -- nunca se persiste una URL firmada,
-- que expira). Array en la misma tabla (no una tabla de fotos aparte):
-- las fotos no tienen ciclo de vida propio, siempre pertenecen 1:1 a la
-- solicitud que las originó -- una tabla adicional sería complejidad sin
-- necesidad real (mismo criterio de "diseño mínimo necesario" ya aplicado
-- en el resto del proyecto).
--
-- `revisado_por uuid` -- SIN foreign key: puede ser tanto `coordinadores.id`
-- como `admins.id` (ambos roles pueden revisar, mismo criterio de paridad
-- de permisos ya usado en `trabajos` -- ver policies "coordinadores
-- actualizan su tienda"/"admins actualizan trabajos de su empresa"). Una
-- FK a una sola tabla sería incorrecta la mitad de las veces -- se deja
-- como uuid libre, documentado, en vez de forzar una relación que no
-- siempre es cierta.
--
-- `estado text` -- SIN CHECK/ENUM, mismo criterio ya establecido para
-- `trabajos.estado`/`trabajo_instaladores.estado` (confirmado sin
-- restricción real en Producción vía `pg_constraint`, ver rondas
-- anteriores) -- la máquina de estados vive en las 2 RPC de abajo, no en
-- la base de datos. Valores usados: 'pendiente' (default) / 'aprobado' /
-- 'rechazado'.
CREATE TABLE IF NOT EXISTS public.trabajo_extras (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    trabajo_id        uuid        NOT NULL REFERENCES public.trabajos(id),
    instalador_id     uuid        NOT NULL REFERENCES public.instaladores(id),
    monto_solicitado  numeric     NOT NULL,
    notas             text        NOT NULL,
    fotos             text[]      NOT NULL DEFAULT '{}',
    estado            text        NOT NULL DEFAULT 'pendiente',
    monto_aprobado    numeric,
    revision_nota     text,
    revisado_por      uuid,
    created_at        timestamptz NOT NULL DEFAULT now(),
    reviewed_at       timestamptz
);

ALTER TABLE public.trabajo_extras ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. RLS — trabajo_extras
-- ============================================================
-- SELECT: mismo criterio exacto de scoping ya usado en `trabajos` (mismos
-- 3 roles, mismas condiciones de tienda/empresa) -- ver policies
-- "admins ven trabajos de su empresa"/"coordinadores ven trabajos de su
-- tienda o de su empresa si admin"/instaladores por auth.uid() directo.
CREATE POLICY "instaladores ven sus propios extras"
    ON public.trabajo_extras FOR SELECT
    TO authenticated
    USING (instalador_id = auth.uid());

CREATE POLICY "coordinadores ven extras de su tienda o de su empresa si admin"
    ON public.trabajo_extras FOR SELECT
    TO authenticated
    USING (
        trabajo_id IN (
            SELECT t.id FROM public.trabajos t
            WHERE t.tienda_id IN (SELECT c.tienda_id FROM public.coordinadores c WHERE c.id = auth.uid())
               OR t.empresa_id IN (
                    SELECT c.empresa_id FROM public.coordinadores c
                    WHERE c.id = auth.uid() AND c.rol = 'admin'
               )
        )
    );

CREATE POLICY "admins ven extras de su empresa"
    ON public.trabajo_extras FOR SELECT
    TO authenticated
    USING (
        trabajo_id IN (
            SELECT t.id FROM public.trabajos t
            JOIN public.admins a ON a.empresa_id = t.empresa_id
            WHERE a.id = auth.uid()
        )
    );

-- UPDATE: exclusivamente coordinadores/admins (revisión). NINGUNA policy
-- de UPDATE para instaladores -- una vez enviada, la solicitud es
-- inmutable desde su lado (mismo criterio que el brief pide
-- explícitamente: "no debe poder modificar una solicitud después de
-- enviada"). El instalador tampoco puede aprobar la suya propia: no tiene
-- ninguna policy de UPDATE, sin importar de quién sea el trabajo.
CREATE POLICY "coordinadores revisan extras de su tienda o de su empresa si admin"
    ON public.trabajo_extras FOR UPDATE
    TO authenticated
    USING (
        trabajo_id IN (
            SELECT t.id FROM public.trabajos t
            WHERE t.tienda_id IN (SELECT c.tienda_id FROM public.coordinadores c WHERE c.id = auth.uid())
               OR t.empresa_id IN (
                    SELECT c.empresa_id FROM public.coordinadores c
                    WHERE c.id = auth.uid() AND c.rol = 'admin'
               )
        )
    );

CREATE POLICY "admins revisan extras de su empresa"
    ON public.trabajo_extras FOR UPDATE
    TO authenticated
    USING (
        trabajo_id IN (
            SELECT t.id FROM public.trabajos t
            JOIN public.admins a ON a.empresa_id = t.empresa_id
            WHERE a.id = auth.uid()
        )
    )
    WITH CHECK (
        trabajo_id IN (
            SELECT t.id FROM public.trabajos t
            JOIN public.admins a ON a.empresa_id = t.empresa_id
            WHERE a.id = auth.uid()
        )
    );

-- GRANT de tabla -- SEGUNDA capa obligatoria además de RLS (lección ya
-- aprendida en este proyecto: 0007/0022, el GRANT de tabla se evalúa
-- ANTES que cualquier policy; sin él, Postgres nunca llega a evaluar RLS).
-- SIN INSERT: la creación ocurre exclusivamente vía `solicitar_costo_extra()`
-- (`SECURITY DEFINER`, corre con los privilegios del dueño de la función,
-- no necesita que `authenticated` tenga INSERT de tabla). SIN DELETE:
-- ninguna policy contempla borrado -- el historial de solicitudes
-- (aprobadas o rechazadas) se conserva siempre.
GRANT SELECT, UPDATE ON public.trabajo_extras TO authenticated;


-- ============================================================
-- 3. STORAGE — bucket trabajo-extras (privado)
-- ============================================================
-- Primer uso de Supabase Storage en este proyecto (auditado antes de
-- crear: no existe ningún bucket previo). Privado (`public = false`) --
-- las fotos NUNCA deben quedar públicamente expuestas (requisito
-- explícito) -- el acceso real es vía URL firmada (`createSignedUrl`,
-- generada del lado del cliente con la sesión real del usuario, sujeta a
-- las policies de `storage.objects` de abajo -- nunca con `service_role`).
--
-- Límites a nivel de bucket (defensa adicional, además de la validación
-- de tipo/tamaño ya hecha en el cliente antes de subir): 5 MB por
-- archivo, solo imágenes (jpeg/png/webp) -- evita que un tipo de archivo
-- arbitrario o un archivo excesivamente grande llegue a almacenarse
-- aunque el frontend fallara en validarlo.
--
-- Convención de rutas: "<trabajo_id>/<extra_id>/<archivo>" -- permite que
-- las policies de abajo validen pertenencia consultando `trabajos`
-- directamente (existe siempre, incluso ANTES de que exista la fila de
-- `trabajo_extras`, ya que las fotos se suben antes de invocar
-- `solicitar_costo_extra()` -- ver JSDoc del repositorio frontend).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'trabajo-extras',
    'trabajo-extras',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "instaladores suben fotos de extras de sus trabajos asignados"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'trabajo-extras'
        AND EXISTS (
            SELECT 1 FROM public.trabajos t
            WHERE t.id::text = (storage.foldername(name))[1]
              AND t.instalador_asignado_id = auth.uid()
        )
    );

CREATE POLICY "instaladores leen fotos de sus propios trabajos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'trabajo-extras'
        AND EXISTS (
            SELECT 1 FROM public.trabajos t
            WHERE t.id::text = (storage.foldername(name))[1]
              AND t.instalador_asignado_id = auth.uid()
        )
    );

CREATE POLICY "coordinadores leen fotos de extras de su tienda o de su empresa si admin"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'trabajo-extras'
        AND EXISTS (
            SELECT 1 FROM public.trabajos t
            WHERE t.id::text = (storage.foldername(name))[1]
              AND (
                    t.tienda_id IN (SELECT c.tienda_id FROM public.coordinadores c WHERE c.id = auth.uid())
                 OR t.empresa_id IN (
                        SELECT c.empresa_id FROM public.coordinadores c
                        WHERE c.id = auth.uid() AND c.rol = 'admin'
                    )
              )
        )
    );

CREATE POLICY "admins leen fotos de extras de su empresa"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'trabajo-extras'
        AND EXISTS (
            SELECT 1 FROM public.trabajos t
            JOIN public.admins a ON a.empresa_id = t.empresa_id
            WHERE t.id::text = (storage.foldername(name))[1]
              AND a.id = auth.uid()
        )
    );


-- ============================================================
-- 4. RPC — INSTALADOR: crear solicitud de costo extra
-- ============================================================
-- `SECURITY DEFINER` (mismo patrón ya usado 4 veces en este proyecto --
-- `es_admin_de_empresa`/`instalador_fue_notificado`/
-- `nombre_empresa_instaladora`/`marcar_trabajo_terminado`). El `id` lo
-- genera el CLIENTE (`crypto.randomUUID()`, disponible en todo navegador
-- moderno) -- se usa como nombre de carpeta de Storage ANTES de que la
-- fila exista (las fotos se suben primero, la fila se crea después con
-- ese mismo id) -- evita una segunda operación para "adjuntar" fotos a
-- una fila ya creada.
--
-- El `WHERE` del INSERT (vía `SELECT ... FROM trabajos WHERE ...`) es la
-- única fuente de verdad -- exige `estado = 'assigned'` (una solicitud
-- solo tiene sentido MIENTRAS el trabajo sigue asignado, antes de que el
-- instalador lo marque como terminado -- ver también el punto 5) y
-- `instalador_asignado_id = auth.uid()` (nunca un trabajo ajeno).
--
-- Validaciones de negocio (monto > 0, notas no vacías, máximo 5 fotos)
-- se repiten aquí aunque el frontend ya las aplique -- nunca confiar
-- solo en el cliente para una operación que persiste datos reales.
CREATE OR REPLACE FUNCTION public.solicitar_costo_extra(
    p_id uuid,
    p_trabajo_id uuid,
    p_monto numeric,
    p_notas text,
    p_fotos text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_inserted integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  if p_monto is null or p_monto <= 0 then
    return false;
  end if;

  if p_notas is null or length(trim(p_notas)) = 0 then
    return false;
  end if;

  if p_fotos is not null and array_length(p_fotos, 1) > 5 then
    return false;
  end if;

  insert into trabajo_extras (id, trabajo_id, instalador_id, monto_solicitado, notas, fotos)
  select p_id, t.id, auth.uid(), p_monto, trim(p_notas), coalesce(p_fotos, '{}')
  from trabajos t
  where t.id = p_trabajo_id
    and t.estado = 'assigned'
    and t.instalador_asignado_id = auth.uid();

  get diagnostics v_inserted = row_count;
  return v_inserted > 0;
end;
$$;


-- ============================================================
-- 5. RPC — COORDINADOR/ADMIN: revisar (aprobar/rechazar) un extra
-- ============================================================
-- `SECURITY INVOKER` (sin cláusula -- default de PostgreSQL, mismo patrón
-- exacto que `confirmar_trabajo_completado`): corre con los permisos
-- REALES de quien invoca -- funciona sin ninguna policy adicional porque
-- las 2 policies de UPDATE de la sección 2 ya autorizan exactamente esta
-- escritura. Si un INSTALADOR intentara invocarlo (incluso sobre su
-- propia solicitud), no tiene ninguna policy de UPDATE -- RLS filtra el
-- `WHERE` a 0 filas, sin error -- nunca puede aprobar/rechazar su propia
-- solicitud ni la de nadie.
--
-- `p_monto_aprobado` es opcional (`NULL` -- se aprueba el monto
-- solicitado tal cual, `monto_aprobado = monto_solicitado`, sin
-- complejidad adicional para el caso simple); si el coordinador ajusta el
-- monto antes de aprobar, se pasa explícito y prevalece.
--
-- Mismo `WHERE` defensivo que el resto de RPC de este proyecto -- exige
-- `estado = 'pendiente'`, así que una segunda revisión (doble clic, dos
-- pestañas) sobre la misma solicitud ya resuelta actualiza 0 filas.
--
-- ────────────────────────────────────────────────────────────
-- CORRECCIÓN DE AUDITORÍA (gap MEDIO) -- validación de `p_monto_aprobado`
-- ────────────────────────────────────────────────────────────
-- La versión original de esta función (primera redacción de este mismo
-- Sprint, nunca aplicada a Producción) escribía
-- `coalesce(p_monto_aprobado, monto_solicitado)` directamente en el
-- `UPDATE`, sin validar el resultado -- permitía aprobar $0, un monto
-- negativo, o un monto mayor al solicitado. Corregido ANTES de la primera
-- aplicación a Producción (nunca estuvo desplegada con el gap).
--
-- La validación ocurre en 2 pasos, solo cuando `p_aprobado = true` (el
-- camino de rechazo nunca necesita validar ningún monto -- `monto_aprobado`
-- queda `NULL` igual que antes):
-- 1. Un `SELECT ... FOR UPDATE` de la fila real (sujeto a las mismas RLS de
--    SELECT ya existentes -- `SECURITY INVOKER`, sin ampliar superficie de
--    acceso) resuelve `monto_solicitado` real y confirma que la solicitud
--    sigue `pendiente` -- si no existe o ya no está pendiente, `return
--    false` (mismo contrato ya establecido, sin cambios). `FOR UPDATE`
--    bloquea la fila hasta el commit, evitando que 2 revisiones
--    concurrentes lean el mismo `monto_solicitado` antes de que cualquiera
--    escriba -- cierra, de paso, la misma clase de condición de carrera
--    que ya se prevenía con el `WHERE estado='pendiente'` del UPDATE.
-- 2. `v_monto_final := coalesce(p_monto_aprobado, v_monto_solicitado)` se
--    valida explícitamente: `<= 0` o `> v_monto_solicitado` → `RAISE
--    EXCEPTION` (mensaje claro, distinto del `false` silencioso que ya se
--    usa para "la solicitud no existe o ya fue resuelta" -- son 2 tipos de
--    rechazo conceptualmente distintos, cada uno con la señal que le
--    corresponde).
--
-- La autorización NO cambia: sigue siendo exclusivamente RLS (las 2
-- policies UPDATE ya existentes, sección 2) la que decide quién puede
-- llegar a ejecutar el `UPDATE` final -- esta corrección solo restringe
-- QUÉ VALOR puede escribirse, nunca QUIÉN puede escribirlo. Un instalador
-- que invocara esta función sobre su propia solicitud pendiente sí puede
-- ejecutar el `SELECT ... FOR UPDATE` (tiene policy SELECT sobre sus
-- propios extras) pero el `UPDATE` final sigue devolviendo 0 filas para
-- él (sin policy UPDATE) -- ningún cambio de comportamiento ahí.
CREATE OR REPLACE FUNCTION public.revisar_costo_extra(
    p_extra_id uuid,
    p_aprobado boolean,
    p_monto_aprobado numeric DEFAULT NULL,
    p_nota text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
declare
  v_updated integer;
  v_monto_solicitado numeric;
  v_monto_final numeric;
begin
  if p_aprobado then
    select monto_solicitado into v_monto_solicitado
    from trabajo_extras
    where id = p_extra_id
      and estado = 'pendiente'
    for update;

    if v_monto_solicitado is null then
      -- No existe, ya no está `pendiente`, o RLS no autoriza a este
      -- caller a verla -- mismo contrato de "false = no ocurrió" ya
      -- establecido, sin distinguir el motivo exacto (igual que el resto
      -- de RPC de este proyecto).
      return false;
    end if;

    v_monto_final := coalesce(p_monto_aprobado, v_monto_solicitado);

    if v_monto_final <= 0 then
      raise exception 'monto_aprobado debe ser mayor a 0 (recibido: %)', v_monto_final;
    end if;

    if v_monto_final > v_monto_solicitado then
      raise exception 'monto_aprobado (%) no puede ser mayor al monto solicitado (%)', v_monto_final, v_monto_solicitado;
    end if;
  end if;

  update trabajo_extras
  set estado = case when p_aprobado then 'aprobado' else 'rechazado' end,
      monto_aprobado = case when p_aprobado then v_monto_final else null end,
      revision_nota = p_nota,
      revisado_por = auth.uid(),
      reviewed_at = now()
  where id = p_extra_id
    and estado = 'pendiente';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;


-- ============================================================
-- 6. REDEFINICIÓN — marcar_trabajo_terminado(): bloquear finalización
--    con extras pendientes
-- ============================================================
-- MISMO nombre/firma/tipo de retorno que la versión de
-- `0024_finalizacion_trabajo.sql` -- `CREATE OR REPLACE`, no se toca ese
-- archivo. Único cambio: se agrega `AND NOT EXISTS (... trabajo_extras
-- WHERE estado='pendiente')` al WHERE del UPDATE -- si existe al menos
-- una solicitud de extra pendiente para este trabajo, el UPDATE no
-- encuentra ninguna fila y la función devuelve `false` (mismo contrato de
-- "false = la transición no ocurrió" ya establecido, sin inventar un
-- código de error nuevo). El resto del cuerpo es idéntico -- no se
-- relaja ni se agrega ninguna otra condición.
CREATE OR REPLACE FUNCTION public.marcar_trabajo_terminado(p_trabajo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_updated integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  update trabajos
  set estado = 'pending_confirmation',
      finalizado_at = now()
  where id = p_trabajo_id
    and estado = 'assigned'
    and instalador_asignado_id = auth.uid()
    and not exists (
      select 1 from trabajo_extras te
      where te.trabajo_id = p_trabajo_id
        and te.estado = 'pendiente'
    );

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;


-- ============================================================
-- 7. REALTIME — publicación de trabajo_extras
-- ============================================================
-- Tabla nueva -- a diferencia de `trabajos`/`ofertas`/`trabajo_instaladores`
-- (ya estaban en la publicación antes de que este proyecto empezara a
-- versionar ese paso en SQL), esta migración sí lo declara explícitamente
-- -- forma correcta y auditable de habilitar Realtime sobre una tabla
-- nueva.
ALTER PUBLICATION supabase_realtime ADD TABLE public.trabajo_extras;


-- ============================================================
-- VALIDACIÓN (ejecutar después de aplicar)
-- ============================================================
-- select policyname, cmd from pg_policies where tablename='trabajo_extras' order by cmd, policyname;
-- -- debe mostrar 3 SELECT + 2 UPDATE, ninguna INSERT/DELETE.
--
-- select grantee, privilege_type from information_schema.role_table_grants
-- where table_name='trabajo_extras' and grantee='authenticated';
-- -- debe mostrar exactamente SELECT y UPDATE (más REFERENCES/TRIGGER
-- -- implícitos de Postgres) -- nunca INSERT/DELETE.
--
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id='trabajo-extras';
-- -- public debe ser false.
--
-- select proname, prosecdef from pg_proc
-- where pronamespace='public'::regnamespace
--   and proname in ('solicitar_costo_extra','revisar_costo_extra','marcar_trabajo_terminado');
-- -- solicitar_costo_extra: prosecdef=true; revisar_costo_extra: prosecdef=false;
-- -- marcar_trabajo_terminado: prosecdef=true (sin cambio respecto a 0024).
--
-- Validación funcional (con datos reales, sin crear ninguno para esta
-- prueba): un instalador con un trabajo `assigned` invoca
-- `solicitar_costo_extra` -- debe devolver `true` y crear la fila; el
-- mismo instalador invoca `marcar_trabajo_terminado` sobre ese trabajo --
-- debe devolver `false` (extra pendiente); un coordinador de su
-- tienda invoca `revisar_costo_extra` con `p_aprobado=true` -- debe
-- devolver `true`, `estado='aprobado'`, `monto_aprobado` registrado;
-- ahora `marcar_trabajo_terminado` debe devolver `true` (ya no hay
-- extras pendientes).
--
-- Validación específica de la corrección de auditoría (gap MEDIO), con
-- una solicitud real `pendiente` de `monto_solicitado=20`:
--   revisar_costo_extra(id, true, NULL, null)   -> true, monto_aprobado=20
--   revisar_costo_extra(id, true, 20, null)     -> true, monto_aprobado=20
--   revisar_costo_extra(id, true, 0, null)      -> excepción (<=0)
--   revisar_costo_extra(id, true, -5, null)     -> excepción (<=0)
--   revisar_costo_extra(id, true, 21, null)     -> excepción (>solicitado)
--   revisar_costo_extra(id, true, 20, null) otra vez -> false (ya no `pendiente`)

-- ============================================================
-- ROLLBACK (orden inverso exacto de aplicación)
-- ============================================================
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.trabajo_extras;
-- -- (revertir marcar_trabajo_terminado a la versión de 0024, ver ese archivo)
-- DROP FUNCTION IF EXISTS public.revisar_costo_extra(uuid, boolean, numeric, text);
-- DROP FUNCTION IF EXISTS public.solicitar_costo_extra(uuid, uuid, numeric, text, text[]);
-- DROP POLICY IF EXISTS "admins leen fotos de extras de su empresa" ON storage.objects;
-- DROP POLICY IF EXISTS "coordinadores leen fotos de extras de su tienda o de su empresa si admin" ON storage.objects;
-- DROP POLICY IF EXISTS "instaladores leen fotos de sus propios trabajos" ON storage.objects;
-- DROP POLICY IF EXISTS "instaladores suben fotos de extras de sus trabajos asignados" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id='trabajo-extras';
-- DROP TABLE IF EXISTS public.trabajo_extras;

-- ============================================================
-- FIN DE LA MIGRACIÓN 0026
-- ============================================================
