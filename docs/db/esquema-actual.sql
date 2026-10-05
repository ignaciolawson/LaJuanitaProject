-- ============================================================================
-- ESQUEMA ACTUAL de la base de La Juanita — ARCHIVO GENERADO, NO EDITAR
--
-- Es el resultado de aplicar todas las migraciones hasta V38__cambiar_la_password_cierra_las_sesiones.sql
-- sobre una base vacia, volcado con pg_dump --schema-only.
-- Generado el 2026-10-05 con ./scripts/esquema-actual.sh
--
-- Sirve para LEER la version final. No se aplica: la fuente de verdad son
-- las migraciones (apps/backend/src/main/resources/db/migration), y el POR
-- QUE de cada regla esta en los comentarios de la migracion que la creo.
-- Los datos iniciales (salas, matriz sala x uso, catalogo, admin de
-- desarrollo) no estan aca: viven en V2, V3 y V28.
-- ============================================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: rango_horario; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rango_horario AS RANGE (
    subtype = time without time zone,
    multirange_type_name = public.rango_horario_multirange
);


--
-- Name: exigir_autor_de_la_edicion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exigir_autor_de_la_edicion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.id_usuario_modifico IS NULL THEN
        RAISE EXCEPTION
            'Editar % exige decir quien lo hizo: id_usuario_modifico no puede '
            'quedar en NULL. Es historial de clases y se edita con auditoria.',
            TG_TABLE_NAME;
    END IF;

    NEW.fecha_modificacion := now();
    RETURN NEW;
END; $$;


--
-- Name: exigir_read_committed(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.exigir_read_committed(regla text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION
            'La regla "%" solo se puede garantizar en READ COMMITTED (esta '
            'transaccion corre en %). En niveles mas estrictos el trigger lee '
            'un snapshot viejo y dejaria pasar la violacion en silencio.',
            regla, current_setting('transaction_isolation');
    END IF;
END; $$;


--
-- Name: material_clase_del_curso(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.material_clase_del_curso() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.id_reserva IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (SELECT 1
                     FROM reserva_participante rp
                    WHERE rp.id_reserva     = NEW.id_reserva
                      AND rp.id_inscripcion = NEW.id_inscripcion) THEN
        RAISE EXCEPTION
            'Esa clase no es de ese curso: el alumno de la inscripcion % no '
            'participo de la reserva % con ella.', NEW.id_inscripcion, NEW.id_reserva;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: programa_no_se_borra(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.programa_no_se_borra() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION
        'No se borra un programa: las inscripciones lo nombran por su disciplina '
        'y el alta lee de acá cuántas clases trae. Para sacarlo de la oferta, '
        'programa -> activo = FALSE.';
END; $$;


--
-- Name: prohibir_borrado_historico(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prohibir_borrado_historico() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION
        'No se borran filas de %. Es historial de un negocio real: hay que '
        'anular la fila con su estado correspondiente (pago -> ANULADO, '
        'trabajo_mastering -> CANCELADO, reserva -> CANCELADA, '
        'reserva_participante -> CANCELADA, egreso -> anulado = TRUE, '
        'venta_equipo -> anulada = TRUE, solicitud_reserva -> CANCELADA, '
        'solicitante -> DESCARTADO, solicitante_companero -> su ficha, '
        'comprobante_pago -> invalido = TRUE, comprobante_egreso -> invalido = TRUE).',
        TG_TABLE_NAME;
END; $$;


--
-- Name: prohibir_cambio_de_integrantes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prohibir_cambio_de_integrantes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION
        'Los integrantes de una inscripcion son fijos: no se sacan, no se '
        'cambian y no se agregan despues. Si el grupo cambia, se cancela la '
        'inscripcion y se da de alta la nueva.';
END; $$;


--
-- Name: proteger_contrato_de_release_publicado(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.proteger_contrato_de_release_publicado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_contrato BIGINT;
    v_codigo      TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_id_contrato := OLD.id_contrato;
    ELSE
        v_id_contrato := NEW.id_contrato;
        -- Un UPDATE que deja el contrato colgado de lo mismo no toca nada: se
        -- pueden corregir la fecha de firma o las observaciones sin despertar
        -- esta regla.
        IF NEW.id_release IS NOT DISTINCT FROM OLD.id_release
           AND NEW.id_artista IS NOT DISTINCT FROM OLD.id_artista THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Lock primero, chequeo después. Sin esto, dos transacciones que sacan dos
    -- contratos del mismo release ven cada una que "queda el otro", las dos
    -- pasan, y el release termina publicado sin ninguno. Es exactamente la
    -- carrera que la prueba de concurrencia de `V1` encontró con las salas, y
    -- por eso `V1` §8 dice que todo trigger que compite por un recurso empieza
    -- tomando el lock.
    PERFORM 1 FROM release r
     WHERE r.id_release = OLD.id_release
        OR (OLD.id_release IS NULL AND r.id_artista = OLD.id_artista)
     FOR UPDATE;

    -- ¿Algún release YA PUBLICADO se queda sin respaldo si este contrato se va?
    -- Un contrato de release mira uno solo; uno general del artista puede estar
    -- sosteniendo varios, y alcanza con que uno quede colgado.
    SELECT r.codigo_release INTO v_codigo
      FROM release r
     WHERE r.estado = 'PUBLICADO'
       AND NOT r.publicado_sin_contrato
       AND (r.id_release = OLD.id_release
            OR (OLD.id_release IS NULL AND r.id_artista = OLD.id_artista))
       AND NOT EXISTS (
           SELECT 1 FROM contrato_sello c
            WHERE c.id_contrato <> v_id_contrato
              AND (c.id_release = r.id_release
                   OR (c.id_artista = r.id_artista AND c.id_release IS NULL)))
     LIMIT 1;

    IF v_codigo IS NOT NULL THEN
        RAISE EXCEPTION
            'El contrato % es el unico respaldo del release %, que ya esta '
            'publicado. Carga el contrato que lo reemplaza antes de sacar este, '
            'o marca el release con publicado_sin_contrato y su motivo.',
            v_id_contrato, v_codigo;
    END IF;

    RETURN COALESCE(NEW, OLD);
END; $$;


--
-- Name: proteger_pago_de_premaster(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.proteger_pago_de_premaster() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    trabajo        RECORD;
    id_pago_tocado BIGINT;
    id_destino     BIGINT;
    nuevo_estado   TEXT;
BEGIN
    -- Sirve para UPDATE y para DELETE: en DELETE no hay NEW.
    IF TG_OP = 'DELETE' THEN
        id_pago_tocado := OLD.id_pago;
        id_destino     := OLD.id_trabajo_mastering;
        nuevo_estado   := 'ELIMINADO';
    ELSE
        id_pago_tocado := NEW.id_pago;
        nuevo_estado   := NEW.estado_pago;

        -- Un UPDATE que deja el pago vigente no toca nada.
        IF NEW.estado_pago = 'PAGADO'
           AND OLD.id_trabajo_mastering IS NOT DISTINCT FROM NEW.id_trabajo_mastering THEN
            RETURN NEW;
        END IF;

        -- Se mira el destino VIEJO: lo que hay que proteger es el trabajo que el
        -- pago respaldaba hasta recién, no al que lo estén mudando.
        -- (`V6` le asignaba antes el destino NEW y lo pisaba acá sin usarlo; se
        -- saca porque hacía leer la función como si NEW importara.)
        id_destino := OLD.id_trabajo_mastering;
    END IF;

    IF id_destino IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT * INTO trabajo FROM trabajo_mastering
     WHERE id_trabajo = id_destino FOR UPDATE;

    IF NOT FOUND OR NOT trabajo.premaster_liberado OR trabajo.liberado_sin_pago THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- ¿Queda ALGÚN otro pago vigente que sostenga la liberación?
    -- Acá estaba el choque de nombres: `id_pago` era a la vez la variable y la
    -- columna de `pago`.
    IF EXISTS (
        SELECT 1 FROM pago p
         WHERE p.id_trabajo_mastering = id_destino
           AND p.estado_pago = 'PAGADO'
           AND p.id_pago <> id_pago_tocado
    ) THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    RAISE EXCEPTION
        'El pago % es el unico respaldo del premaster ya liberado del trabajo % '
        '(intento dejarlo en %). Para dejarlo sin pago hay que marcar el trabajo '
        'con liberado_sin_pago y su motivo.',
        id_pago_tocado, id_destino, nuevo_estado;
END; $$;


--
-- Name: proteger_temas_de_release_publicado(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.proteger_temas_de_release_publicado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_estado TEXT;
    v_tipo   TEXT;
    v_codigo TEXT;
    v_minimo INTEGER;
    v_temas  INTEGER;
BEGIN
    -- Un UPDATE que deja el tema colgado del mismo release no toca nada: se
    -- puede corregir el titulo, la duracion o el ISRC de un tema publicado sin
    -- despertar esta regla.
    IF TG_OP = 'UPDATE' AND NEW.id_release IS NOT DISTINCT FROM OLD.id_release THEN
        RETURN NEW;
    END IF;

    -- Lock primero, chequeo despues: sin esto dos transacciones que sacan dos
    -- temas del mismo EP ven cada una que "quedan 3", las dos pasan, y el
    -- release termina con uno. Es la carrera que `V1` §8 obliga a cerrar en todo
    -- trigger que compite por un recurso, y la misma que `V18` §3 cierra.
    SELECT r.estado, r.tipo_release, r.codigo_release
      INTO v_estado, v_tipo, v_codigo
      FROM release r WHERE r.id_release = OLD.id_release FOR UPDATE;

    IF v_estado <> 'PUBLICADO' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF v_tipo = 'EP' THEN
        v_minimo := 3;
    ELSIF v_tipo = 'ALBUM' THEN
        v_minimo := 8;
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Cuantos quedan si este se va. En un BEFORE DELETE la fila TODAVIA esta en
    -- la tabla, asi que contar sin excluirla contesta de mas y la regla no se
    -- dispara nunca: es exactamente el cuidado que `V18` §3 documenta con su
    -- `c.id_contrato <> v_id_contrato`.
    SELECT count(*) INTO v_temas
      FROM cancion_release c
     WHERE c.id_release = OLD.id_release
       AND c.id_cancion <> OLD.id_cancion;

    IF v_temas < v_minimo THEN
        RAISE EXCEPTION
            'El release % ya esta publicado y es un %: sacar este tema lo dejaria '
            'con % y un % lleva por lo menos %. Cargá el que lo reemplaza antes de '
            'sacar este.', v_codigo, v_tipo, v_temas, v_tipo, v_minimo;
    END IF;

    RETURN COALESCE(NEW, OLD);
END; $$;


--
-- Name: release_tiene_contrato(bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_tiene_contrato(v_id_release bigint, v_id_artista bigint) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM contrato_sello c
         WHERE c.id_release = v_id_release
            OR (c.id_artista = v_id_artista AND c.id_release IS NULL));
$$;


--
-- Name: reserva_sin_plata_detras(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reserva_sin_plata_detras(p_id_reserva bigint) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    codigo_del_uso TEXT;
    estado_reserva TEXT;
BEGIN
    SELECT t.codigo, r.estado INTO codigo_del_uso, estado_reserva
    FROM reserva r
    JOIN tipo_uso t ON t.id_tipo_uso = r.id_tipo_uso
    WHERE r.id_reserva = p_id_reserva
      -- Definicion canonica de V1: una cancelada o una reprogramada no ocupan la
      -- franja y no deben sena (la sena se devuelve, V11).
      AND r.estado NOT IN ('CANCELADA', 'REPROGRAMADA');

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- La unica excepcion por catalogo, y no por estado (§13): lo decide Ghezz.
    IF codigo_del_uso = 'MIX_MASTERING' THEN
        RETURN FALSE;
    END IF;

    -- CAMINO 1 bis (V24): la prereserva. El horario esta apartado con la deuda
    -- anotada, y lo que hace legitimo eso es que §2 y §3 obligan a que tenga
    -- fecha de vencimiento. Un pago ANULADO no cuenta: dejaria la prereserva sin
    -- deuda y sin plata, que es el agujero de V12 sin el plazo.
    IF estado_reserva = 'PRECONFIRMADA' THEN
        RETURN NOT EXISTS (SELECT 1 FROM pago
                           WHERE id_reserva = p_id_reserva
                             AND estado_pago <> 'ANULADO');
    END IF;

    -- CAMINO 1: PLATA QUE ENTRO apuntando a la reserva.
    --
    -- `IN ('SENADO','PAGADO')` y no `<> 'ANULADO'`: es EstadoPago.ENTRARON, la
    -- misma lista que usa la caja. Ver la cabecera de V12.
    IF EXISTS (SELECT 1 FROM pago
               WHERE id_reserva = p_id_reserva
                 AND estado_pago IN ('SENADO', 'PAGADO')) THEN
        RETURN FALSE;
    END IF;

    -- CAMINO 2: la inscripcion que cubre la clase. Misma definicion de
    -- participacion viva que usa V9 §5 para "clase consumida".
    IF EXISTS (SELECT 1 FROM reserva_participante
               WHERE id_reserva = p_id_reserva
                 AND id_inscripcion IS NOT NULL
                 AND estado_asistencia <> 'CANCELADA') THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END; $$;


--
-- Name: FUNCTION reserva_sin_plata_detras(p_id_reserva bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.reserva_sin_plata_detras(p_id_reserva bigint) IS 'P8/DB-04a + V24: toda reserva que ocupa su franja tiene plata detras, cobrada (SENADO/PAGADO) o anotada con vencimiento mientras este PRECONFIRMADA. Compartida por los tres triggers que sostienen la regla. Ver la cabecera de V24.';


--
-- Name: sellar_cambio_de_seguimiento(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sellar_cambio_de_seguimiento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Solo cuando cambia algo que se mira. Tocar las observaciones sin mover el
    -- estado tambien cuenta: es informacion nueva sobre el alumno.
    IF NEW.estado IS DISTINCT FROM OLD.estado
       OR NEW.observaciones IS DISTINCT FROM OLD.observaciones THEN
        NEW.fecha_actualizacion := now();
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: solapamiento_de_persona(bigint, bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.solapamiento_de_persona(p_id_reserva bigint, p_id_usuario bigint, p_id_participacion bigint) RETURNS TABLE(fecha date, hora_inicio time without time zone, hora_fin time without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT otra.fecha, otra.hora_inicio, otra.hora_fin
    FROM reserva_participante p
    JOIN reserva otra ON otra.id_reserva = p.id_reserva
    JOIN reserva esta ON esta.id_reserva = p_id_reserva
    WHERE p.id_usuario = p_id_usuario
      -- No chocar contra uno mismo, ni contra la propia fila al editarla.
      AND p.id_reserva      <> p_id_reserva
      AND p.id_participacion IS DISTINCT FROM p_id_participacion
      -- Misma DEFINICIÓN CANÓNICA que el resto del esquema: estos dos estados
      -- no ocupan el horario.
      AND otra.estado NOT IN ('CANCELADA', 'REPROGRAMADA')
      AND esta.estado NOT IN ('CANCELADA', 'REPROGRAMADA')
      AND p.estado_asistencia <> 'CANCELADA'
      AND otra.periodo && esta.periodo
    LIMIT 1;
END; $$;


--
-- Name: solicitud_resuelta_es_final(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.solicitud_resuelta_es_final() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.estado <> 'PENDIENTE' THEN
        RAISE EXCEPTION
            'Esa solicitud ya fue resuelta (%) y no se modifica. Si hace falta '
            'otra cosa, se pide de nuevo.', OLD.estado;
    END IF;
    RETURN NEW;
END; $$;


--
-- Name: verificar_avance_estado_release(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_avance_estado_release() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    orden_anterior INTEGER;
    orden_nuevo    INTEGER;
BEGIN
    -- Cancelar se puede desde donde sea. Va primero, antes de mirar el orden,
    -- porque CANCELADO no tiene lugar en la escalera y compararlo daría 0 --
    -- o sea, "retrocede" desde cualquier estado.
    IF NEW.estado = OLD.estado OR NEW.estado = 'CANCELADO' THEN
        RETURN NEW;
    END IF;

    -- Y la mitad que falta, que es la que hace que "los estados solo avanzan"
    -- sea cierto: DE cancelado no se sale. Ver §1b.
    IF OLD.estado = 'CANCELADO' THEN
        RAISE EXCEPTION
            'El release % esta cancelado y no vuelve atras (intento pasarlo a %). '
            'Un lanzamiento que se retoma es un release nuevo.',
            OLD.codigo_release, NEW.estado;
    END IF;

    orden_anterior := CASE OLD.estado
        WHEN 'A_CONFIRMAR'     THEN 1 WHEN 'CONFIRMADO' THEN 2
        WHEN 'EN_DISTRIBUCION' THEN 3 WHEN 'PUBLICADO'  THEN 4 ELSE 0 END;
    orden_nuevo := CASE NEW.estado
        WHEN 'A_CONFIRMAR'     THEN 1 WHEN 'CONFIRMADO' THEN 2
        WHEN 'EN_DISTRIBUCION' THEN 3 WHEN 'PUBLICADO'  THEN 4 ELSE 0 END;

    IF orden_nuevo < orden_anterior THEN
        RAISE EXCEPTION
            'El estado del release no puede retroceder (% -> %)',
            OLD.estado, NEW.estado;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: verificar_avance_estado_trabajo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_avance_estado_trabajo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    orden_anterior INTEGER;
    orden_nuevo    INTEGER;
BEGIN
    IF NEW.estado = OLD.estado OR NEW.estado = 'CANCELADO' THEN
        RETURN NEW;
    END IF;

    IF OLD.estado = 'CANCELADO' THEN
        RAISE EXCEPTION
            'El trabajo esta cancelado y no vuelve atras (intento pasarlo a %). '
            'Un trabajo que se retoma se carga de nuevo.', NEW.estado;
    END IF;

    orden_anterior := CASE OLD.estado
        WHEN 'A_CONFIRMAR' THEN 1 WHEN 'EN_PROCESO' THEN 2
        WHEN 'ENTREGADO'   THEN 3 WHEN 'DEBE'       THEN 3
        WHEN 'PAGADO'      THEN 4 ELSE 0 END;
    orden_nuevo := CASE NEW.estado
        WHEN 'A_CONFIRMAR' THEN 1 WHEN 'EN_PROCESO' THEN 2
        WHEN 'ENTREGADO'   THEN 3 WHEN 'DEBE'       THEN 3
        WHEN 'PAGADO'      THEN 4 ELSE 0 END;

    IF orden_nuevo < orden_anterior THEN
        RAISE EXCEPTION
            'El estado del trabajo no puede retroceder (% -> %)',
            OLD.estado, NEW.estado;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: verificar_baja_de_nivel_firmada(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_baja_de_nivel_firmada() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    orden_anterior INTEGER;
    orden_nuevo    INTEGER;
BEGIN
    IF NEW.nivel IS NOT DISTINCT FROM OLD.nivel THEN
        RETURN NEW;
    END IF;

    -- Poner o sacar el nivel no es retroceder: es completar una ficha.
    IF OLD.nivel IS NULL OR NEW.nivel IS NULL THEN
        RETURN NEW;
    END IF;

    orden_anterior := CASE OLD.nivel
        WHEN 'INICIAL' THEN 1 WHEN 'INTERMEDIO' THEN 2
        WHEN 'AVANZADO' THEN 3 ELSE 0 END;
    orden_nuevo := CASE NEW.nivel
        WHEN 'INICIAL' THEN 1 WHEN 'INTERMEDIO' THEN 2
        WHEN 'AVANZADO' THEN 3 ELSE 0 END;

    IF orden_nuevo >= orden_anterior THEN
        RETURN NEW;
    END IF;

    -- `fecha_baja_nivel` tiene que ser NUEVA, no la de una baja anterior: si
    -- alcanzara con que estuviera llena, la segunda baja viajaría gratis con la
    -- firma de la primera.
    IF NEW.id_usuario_baja_nivel IS NULL
       OR NEW.fecha_baja_nivel IS NULL
       OR coalesce(btrim(NEW.motivo_baja_nivel), '') = ''
       OR NEW.fecha_baja_nivel IS NOT DISTINCT FROM OLD.fecha_baja_nivel THEN
        RAISE EXCEPTION
            'Bajar el nivel (% -> %) exige decir quien lo decide, cuando y por '
            'que: id_usuario_baja_nivel, fecha_baja_nivel y motivo_baja_nivel.',
            OLD.nivel, NEW.nivel;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_bloqueo_sin_reservas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_bloqueo_sin_reservas() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    cantidad INTEGER;
BEGIN
    PERFORM exigir_read_committed('no se bloquea una sala con reservas activas');
    PERFORM 1 FROM sala WHERE id_sala = NEW.id_sala FOR UPDATE;

    SELECT count(*) INTO cantidad
    FROM reserva r
    WHERE r.id_sala = NEW.id_sala
      AND r.estado NOT IN ('CANCELADA', 'REPROGRAMADA')
      AND r.fecha BETWEEN NEW.fecha_inicio AND NEW.fecha_fin
      AND r.hora_inicio < NEW.hora_fin
      AND r.hora_fin    > NEW.hora_inicio;

    IF cantidad > 0 THEN
        RAISE EXCEPTION
            'No se puede bloquear: hay % reserva(s) activa(s) en ese rango', cantidad;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_cambio_de_moneda_con_plata_adentro(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_cambio_de_moneda_con_plata_adentro() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    columna_del_pago TEXT   := TG_ARGV[0];
    columna_clave    TEXT   := TG_ARGV[1];
    id_de_la_cosa    BIGINT := (to_jsonb(NEW) ->> columna_clave)::BIGINT;
    en_otra_moneda   INTEGER;
BEGIN
    IF NEW.moneda IS NULL OR NEW.moneda IS NOT DISTINCT FROM OLD.moneda THEN
        RETURN NEW;
    END IF;

    EXECUTE format(
        'SELECT count(*) FROM pago WHERE %I = $1 AND estado_pago <> ''ANULADO'' AND moneda <> $2',
        columna_del_pago)
       INTO en_otra_moneda
      USING id_de_la_cosa, NEW.moneda;

    IF en_otra_moneda > 0 THEN
        RAISE EXCEPTION
            'No se le puede cambiar la moneda de % a %: tiene % pago(s) vivo(s) en otra moneda. '
            'Si esta en la moneda equivocada, primero se anulan esos pagos y se recargan.',
            OLD.moneda, NEW.moneda, en_otra_moneda;
    END IF;

    RETURN NEW;
END; $_$;


--
-- Name: FUNCTION verificar_cambio_de_moneda_con_plata_adentro(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_cambio_de_moneda_con_plata_adentro() IS 'V33 §3 (P83): la moneda de una inscripcion, una reserva o un trabajo no cambia si le quedaria algun pago vivo en otra moneda. Cierra el hueco simetrico de V31/V32 para las tres tablas.';


--
-- Name: verificar_clases_al_reactivar_reserva(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_clases_al_reactivar_reserva() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    fila        RECORD;
    contratadas INTEGER;
    consumidas  INTEGER;
BEGIN
    IF NEW.estado IN ('CANCELADA', 'REPROGRAMADA')
       OR OLD.estado NOT IN ('CANCELADA', 'REPROGRAMADA') THEN
        RETURN NEW;
    END IF;

    FOR fila IN
        SELECT DISTINCT id_inscripcion
        FROM reserva_participante
        WHERE id_reserva = NEW.id_reserva
          AND id_inscripcion IS NOT NULL
          AND estado_asistencia <> 'CANCELADA'
    LOOP
        SELECT clases_contratadas INTO contratadas
        FROM inscripcion WHERE id_inscripcion = fila.id_inscripcion;

        SELECT count(DISTINCT p.id_reserva) INTO consumidas
        FROM reserva_participante p
        JOIN reserva r ON r.id_reserva = p.id_reserva
        WHERE p.id_inscripcion = fila.id_inscripcion
          AND p.estado_asistencia <> 'CANCELADA'
          AND r.estado NOT IN ('CANCELADA', 'REPROGRAMADA');

        IF consumidas > contratadas THEN
            RAISE EXCEPTION
                'Reactivar esa clase deja la inscripcion en % clases sobre % '
                'contratadas.', consumidas, contratadas;
        END IF;
    END LOOP;

    RETURN NEW;
END; $$;


--
-- Name: verificar_clases_contratadas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_clases_contratadas() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    contratadas INTEGER;
    consumidas  INTEGER;
BEGIN
    IF NEW.id_inscripcion IS NULL OR NEW.estado_asistencia = 'CANCELADA' THEN
        RETURN NEW;
    END IF;

    SELECT clases_contratadas INTO contratadas
    FROM inscripcion WHERE id_inscripcion = NEW.id_inscripcion;

    SELECT count(DISTINCT p.id_reserva) INTO consumidas
    FROM reserva_participante p
    JOIN reserva r ON r.id_reserva = p.id_reserva
    WHERE p.id_inscripcion = NEW.id_inscripcion
      AND p.id_reserva <> NEW.id_reserva
      AND p.estado_asistencia <> 'CANCELADA'
      AND r.estado NOT IN ('CANCELADA', 'REPROGRAMADA');

    IF consumidas + 1 > contratadas THEN
        RAISE EXCEPTION
            'Esa inscripcion tiene % clases contratadas y ya se consumieron %. '
            'Para dar mas clases hay que ampliar la inscripcion.',
            contratadas, consumidas;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: FUNCTION verificar_clases_contratadas(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_clases_contratadas() IS 'V9 §5, reescrita en V35 §5: cuenta RESERVAS distintas por inscripcion, no participaciones -- una clase de grupo es una clase. Misma definicion que contarClasesConsumidas en Java.';


--
-- Name: verificar_companero_de_ficha(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_companero_de_ficha() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_interes    TEXT;
    v_disciplina TEXT;
    v_actuales   INTEGER;
BEGIN
    SELECT interes, disciplina INTO v_interes, v_disciplina
    FROM solicitante WHERE id_solicitante = NEW.id_solicitante;

    IF v_interes <> 'CURSO' THEN
        RAISE EXCEPTION
            'Los companeros van solo en una ficha de curso; esta pidio %.', v_interes;
    END IF;

    IF v_disciplina = 'MENTORIA' THEN
        RAISE EXCEPTION
            'La mentoria es 1:1 y no admite grupos.';
    END IF;

    SELECT count(*) INTO v_actuales
    FROM solicitante_companero
    WHERE id_solicitante = NEW.id_solicitante;

    IF v_actuales + 1 > 2 THEN
        RAISE EXCEPTION
            'Un grupo es de hasta 3 personas: quien llena el formulario y hasta '
            'dos companeros. Esta ficha ya tiene %.', v_actuales;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_escalera_de_preconfirmacion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_escalera_de_preconfirmacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    -- (a) No se vuelve a preconfirmar algo que ya salio del plazo.
    IF NEW.estado = 'PRECONFIRMADA' THEN
        RAISE EXCEPTION
            'A la prereserva se entra solo al crearla. Esta reserva ya esta en % y '
            'no puede volver a quedar apartada sin pago.',
            OLD.estado;
    END IF;

    -- (b) Del plazo se sale cobrando o cancelando, y por ningun otro lado.
    IF OLD.estado = 'PRECONFIRMADA'
       AND NEW.estado NOT IN ('CONFIRMADA', 'CANCELADA') THEN
        RAISE EXCEPTION
            'Una prereserva solo puede confirmarse (cuando entra el pago) o '
            'cancelarse. No se puede pasar a %.',
            NEW.estado;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: FUNCTION verificar_escalera_de_preconfirmacion(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_escalera_de_preconfirmacion() IS 'V24 §5: a PRECONFIRMADA se entra solo al nacer y se sale solo a CONFIRMADA o CANCELADA. Sin esto, confirmar y volver atras deja la sala tomada sin plata. Mismo agujero que V18 §1b.';


--
-- Name: verificar_escalera_de_preinscripcion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_escalera_de_preinscripcion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    -- (a) A la preinscripción se entra sólo al nacer.
    IF NEW.estado = 'PREINSCRIPTA' THEN
        RAISE EXCEPTION
            'A la preinscripcion se entra solo al crearla. Esta inscripcion ya esta '
            'en % y no puede volver a quedar pendiente de senia.',
            OLD.estado;
    END IF;

    IF OLD.estado = 'PREINSCRIPTA' THEN
        -- (b) Se sale señando o cancelando, y por ningún otro lado.
        IF NEW.estado NOT IN ('ACTIVA', 'CANCELADA') THEN
            RAISE EXCEPTION
                'Una preinscripcion solo puede activarse (cuando entra la senia) o '
                'cancelarse. No se puede pasar a %.',
                NEW.estado;
        END IF;

        -- (c) Y a ACTIVA, sólo con plata cobrada detrás.
        IF NEW.estado = 'ACTIVA' AND NOT EXISTS (
                SELECT 1 FROM pago
                 WHERE id_inscripcion = NEW.id_inscripcion
                   AND estado_pago IN ('SENADO', 'PAGADO')) THEN
            RAISE EXCEPTION
                'Para activar la preinscripcion tiene que estar cobrada la senia: '
                'registra el pago (SENADO) sobre esta inscripcion y la activa sola.';
        END IF;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: FUNCTION verificar_escalera_de_preinscripcion(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_escalera_de_preinscripcion() IS 'V30 §4: a PREINSCRIPTA se entra solo al nacer, se sale solo a ACTIVA (con un pago SENADO/PAGADO detras) o a CANCELADA. Sin la vuelta de V11 a proposito: no hay cupo, no hay victima (P60).';


--
-- Name: verificar_inmutabilidad_del_comprobante(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_inmutabilidad_del_comprobante() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.id_pago            IS DISTINCT FROM OLD.id_pago
       OR NEW.archivo_path    IS DISTINCT FROM OLD.archivo_path
       OR NEW.nombre_original IS DISTINCT FROM OLD.nombre_original
       OR NEW.id_usuario_carga IS DISTINCT FROM OLD.id_usuario_carga
       OR NEW.fecha_creacion  IS DISTINCT FROM OLD.fecha_creacion THEN
        RAISE EXCEPTION
            'Un comprobante adjunto no se cambia. Si no corresponde, marcalo '
            'invalido con su motivo y adjunta el correcto: el pago admite varios.';
    END IF;

    IF OLD.invalido AND NOT NEW.invalido THEN
        RAISE EXCEPTION
            'Un comprobante marcado invalido no vuelve atras. Quien lo marco '
            'firmo esa decision; si el comprobante era bueno, adjunta el archivo '
            'de nuevo y queda otra fila con su fecha.';
    END IF;

    IF OLD.invalido AND NEW.invalido
       AND (NEW.id_usuario_invalida IS DISTINCT FROM OLD.id_usuario_invalida
            OR NEW.fecha_invalidacion  IS DISTINCT FROM OLD.fecha_invalidacion
            OR NEW.motivo_invalidacion IS DISTINCT FROM OLD.motivo_invalidacion) THEN
        RAISE EXCEPTION
            'La firma de una invalidacion no se reescribe: es el dato, no un '
            'campo del formulario.';
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_inmutabilidad_del_comprobante_de_egreso(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_inmutabilidad_del_comprobante_de_egreso() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.id_egreso          IS DISTINCT FROM OLD.id_egreso
       OR NEW.archivo_path    IS DISTINCT FROM OLD.archivo_path
       OR NEW.nombre_original IS DISTINCT FROM OLD.nombre_original
       OR NEW.id_usuario_carga IS DISTINCT FROM OLD.id_usuario_carga
       OR NEW.fecha_creacion  IS DISTINCT FROM OLD.fecha_creacion THEN
        RAISE EXCEPTION
            'Un comprobante adjunto no se cambia. Si no corresponde, marcalo '
            'invalido con su motivo y adjunta el correcto: el egreso admite varios.';
    END IF;

    IF OLD.invalido AND NOT NEW.invalido THEN
        RAISE EXCEPTION
            'Un comprobante marcado invalido no vuelve atras. Quien lo marco '
            'firmo esa decision; si el comprobante era bueno, adjunta el archivo '
            'de nuevo y queda otra fila con su fecha.';
    END IF;

    IF OLD.invalido AND NEW.invalido
       AND (NEW.id_usuario_invalida IS DISTINCT FROM OLD.id_usuario_invalida
            OR NEW.fecha_invalidacion  IS DISTINCT FROM OLD.fecha_invalidacion
            OR NEW.motivo_invalidacion IS DISTINCT FROM OLD.motivo_invalidacion) THEN
        RAISE EXCEPTION
            'La firma de una invalidacion no se reescribe: es el dato, no un '
            'campo del formulario.';
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_inscripcion_al_abrirse(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_inscripcion_al_abrirse() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    fila RECORD;
BEGIN
    -- Sólo cuando pasa a estar abierta, o cambia de disciplina estando abierta.
    IF NEW.estado NOT IN ('ACTIVA', 'PREINSCRIPTA') THEN
        RETURN NEW;
    END IF;
    IF OLD.estado IN ('ACTIVA', 'PREINSCRIPTA')
       AND OLD.disciplina = NEW.disciplina THEN
        RETURN NEW;
    END IF;

    FOR fila IN
        SELECT id_alumno FROM inscripcion_integrante
        WHERE id_inscripcion = NEW.id_inscripcion
    LOOP
        PERFORM verificar_una_abierta_por_disciplina(NEW.id_inscripcion, fila.id_alumno);
    END LOOP;

    RETURN NEW;
END; $$;


--
-- Name: verificar_inscripcion_del_participante(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_inscripcion_del_participante() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.id_inscripcion IS NULL THEN
        RETURN NEW;   -- alquiler, grabación, uso suelto: no descuenta clases
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM inscripcion_integrante ii
        JOIN alumno a ON a.id_alumno = ii.id_alumno
        WHERE ii.id_inscripcion = NEW.id_inscripcion
          AND a.id_usuario = NEW.id_usuario
    ) THEN
        RAISE EXCEPTION
            'La inscripcion % no pertenece al usuario %',
            NEW.id_inscripcion, NEW.id_usuario;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: verificar_integrante_sin_otra_abierta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_integrante_sin_otra_abierta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_estado TEXT;
BEGIN
    SELECT estado INTO v_estado
    FROM inscripcion WHERE id_inscripcion = NEW.id_inscripcion;

    IF v_estado IN ('ACTIVA', 'PREINSCRIPTA') THEN
        PERFORM verificar_una_abierta_por_disciplina(NEW.id_inscripcion, NEW.id_alumno);
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_integrantes_al_commit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_integrantes_al_commit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id         BIGINT;
    v_cantidad   INTEGER;
    v_referentes INTEGER;
    v_numero     INTEGER;
BEGIN
    v_id := NEW.id_inscripcion;

    SELECT count(*), count(*) FILTER (WHERE referente)
      INTO v_cantidad, v_referentes
    FROM inscripcion_integrante
    WHERE id_inscripcion = v_id;

    IF v_cantidad = 0 THEN
        RAISE EXCEPTION
            'La inscripcion % no tiene ningun integrante. Un grupo es de 1 a 3 '
            'personas, y el alumno solo es un grupo de 1.', v_id;
    END IF;

    IF v_referentes <> 1 THEN
        RAISE EXCEPTION
            'La inscripcion % tiene % referentes y tiene que tener exactamente '
            'uno: a el le va el WhatsApp de la senia y a su nombre esta la '
            'deuda del grupo.', v_id, v_referentes;
    END IF;

    SELECT numero_grupo INTO v_numero
    FROM inscripcion WHERE id_inscripcion = v_id;

    IF (v_cantidad >= 2) <> (v_numero IS NOT NULL) THEN
        RAISE EXCEPTION
            'La inscripcion % tiene % integrantes y numero de grupo %: el numero '
            'lo llevan los grupos de 2 o 3, y solo ellos.',
            v_id, v_cantidad, coalesce(v_numero::TEXT, 'NULL');
    END IF;

    RETURN NULL;
END; $$;


--
-- Name: FUNCTION verificar_integrantes_al_commit(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_integrantes_al_commit() IS 'V35 §4 (b): al COMMIT una inscripcion tiene entre 1 y 3 integrantes, exactamente un referente, y numero_grupo si y solo si son 2 o 3. Diferido como V10.';


--
-- Name: verificar_liberacion_premaster(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_liberacion_premaster() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    cobrado NUMERIC(14,2);
BEGIN
    IF NOT NEW.premaster_liberado THEN
        RETURN NEW;
    END IF;

    IF NEW.liberado_sin_pago THEN
        RETURN NEW;   -- excepción explícita; el CHECK de V1 ya exige el motivo
    END IF;

    IF NEW.precio_acordado IS NULL THEN
        RAISE EXCEPTION
            'No se puede liberar el premaster del trabajo %: no tiene precio acordado, '
            'asi que no hay cobro que lo cubra. Para liberarlo igual, usar '
            'liberado_sin_pago con motivo.',
            NEW.id_trabajo;
    END IF;

    SELECT COALESCE(SUM(p.monto), 0) INTO cobrado
      FROM pago p
     WHERE p.id_trabajo_mastering = NEW.id_trabajo
       AND p.estado_pago IN ('SENADO', 'PAGADO')
       AND p.moneda = NEW.moneda;

    IF cobrado < NEW.precio_acordado THEN
        RAISE EXCEPTION
            'No se puede liberar el premaster del trabajo %: lo cobrado (% %) no cubre '
            'el precio acordado (% %). Para liberarlo igual, usar liberado_sin_pago '
            'con motivo.',
            NEW.id_trabajo, NEW.moneda, cobrado, NEW.moneda, NEW.precio_acordado;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION verificar_liberacion_premaster(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_liberacion_premaster() IS 'V34 (P86): el premaster se libera cuando lo cobrado (SENADO/PAGADO, en la moneda del trabajo) cubre precio_acordado, o con liberado_sin_pago y motivo. Reemplaza a V1 §8.4, que liberaba con cualquier pago PAGADO.';


--
-- Name: verificar_moneda_del_pago_de_inscripcion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_moneda_del_pago_de_inscripcion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    moneda_del_contrato VARCHAR(3);
BEGIN
    IF NEW.id_inscripcion IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT moneda INTO moneda_del_contrato
      FROM inscripcion
     WHERE id_inscripcion = NEW.id_inscripcion;

    IF moneda_del_contrato IS DISTINCT FROM NEW.moneda THEN
        RAISE EXCEPTION
            'El pago de un programa va en la moneda del contrato: esta inscripcion '
            'es en % y el pago vino en %. Si se paga en otra moneda, el contrato se '
            'carga en esa moneda.',
            moneda_del_contrato, NEW.moneda;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: FUNCTION verificar_moneda_del_pago_de_inscripcion(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_moneda_del_pago_de_inscripcion() IS 'V31 §1 (P74): un pago con id_inscripcion lleva la moneda de esa inscripcion. Cierra la contradiccion entre V30 §4 (c) —que activaba con un pago en cualquier moneda— y Deudores, que cuenta solo la moneda del contrato.';


--
-- Name: verificar_moneda_del_pago_de_reserva(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_moneda_del_pago_de_reserva() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    moneda_de_la_reserva VARCHAR(3);
BEGIN
    IF NEW.id_reserva IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT moneda INTO moneda_de_la_reserva
      FROM reserva
     WHERE id_reserva = NEW.id_reserva;

    -- Sin precio no hay moneda que respetar: las reservas de antes de V33.
    IF moneda_de_la_reserva IS NULL THEN
        RETURN NEW;
    END IF;

    IF moneda_de_la_reserva <> NEW.moneda THEN
        RAISE EXCEPTION
            'El pago de una reserva va en la moneda de la reserva: esta reserva '
            'es en % y el pago vino en %. Si se paga en otra moneda, la reserva se '
            'carga en esa moneda.',
            moneda_de_la_reserva, NEW.moneda;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: FUNCTION verificar_moneda_del_pago_de_reserva(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_moneda_del_pago_de_reserva() IS 'V33 §2 (P83): un pago con id_reserva lleva la moneda de esa reserva, si la reserva tiene precio. La tercera gemela de V31 y V32.';


--
-- Name: verificar_moneda_del_pago_de_trabajo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_moneda_del_pago_de_trabajo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    moneda_del_trabajo VARCHAR(3);
BEGIN
    IF NEW.id_trabajo_mastering IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT moneda INTO moneda_del_trabajo
      FROM trabajo_mastering
     WHERE id_trabajo = NEW.id_trabajo_mastering;

    IF moneda_del_trabajo IS DISTINCT FROM NEW.moneda THEN
        RAISE EXCEPTION
            'El cobro de un trabajo va en la moneda del trabajo: este trabajo es '
            'en % y el pago vino en %. Si pagan en otra moneda, el pago se carga '
            'en la del trabajo con la cotizacion del dia.',
            moneda_del_trabajo, NEW.moneda;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: FUNCTION verificar_moneda_del_pago_de_trabajo(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_moneda_del_pago_de_trabajo() IS 'V32 §1 (P81): un pago con id_trabajo_mastering lleva la moneda de ese trabajo. Espejo de V31 para M&M: cierra la contradiccion entre lo cobrado en pantalla —que solo suma la moneda del trabajo— y un pago en la otra moneda que existe igual.';


--
-- Name: verificar_nota_del_alumno(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_nota_del_alumno() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.id_participacion IS NULL THEN
        RETURN NEW;   -- nota general del alumno, no atada a una clase
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM reserva_participante rp
        JOIN alumno a ON a.id_usuario = rp.id_usuario
        WHERE rp.id_participacion = NEW.id_participacion
          AND a.id_alumno = NEW.id_alumno
    ) THEN
        RAISE EXCEPTION
            'La participacion % no corresponde al alumno %',
            NEW.id_participacion, NEW.id_alumno;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: verificar_pago_al_anular(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_pago_al_anular() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- La enorme mayoria de los pagos no apunta a una reserva: se sale barato.
    IF NEW.id_reserva IS NULL THEN
        RETURN NEW;
    END IF;

    IF reserva_sin_plata_detras(NEW.id_reserva) THEN
        RAISE EXCEPTION
            'Esa reserva se quedaria sin la sena que la sostiene. Si la sena se '
            'devuelve, primero hay que cancelar la reserva.';
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_participantes_al_mover_reserva(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_participantes_al_mover_reserva() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    fila   RECORD;
    choque RECORD;
BEGIN
    IF NEW.estado IN ('CANCELADA', 'REPROGRAMADA') THEN
        RETURN NEW;
    END IF;

    FOR fila IN
        SELECT id_participacion, id_usuario
        FROM reserva_participante
        WHERE id_reserva = NEW.id_reserva
          AND estado_asistencia <> 'CANCELADA'
    LOOP
        SELECT * INTO choque
        FROM solapamiento_de_persona(NEW.id_reserva, fila.id_usuario, fila.id_participacion);

        IF FOUND THEN
            RAISE EXCEPTION
                'No se puede mover la clase: un participante ya esta en otra '
                'sala en ese horario (% %-%)',
                choque.fecha, choque.hora_inicio, choque.hora_fin;
        END IF;
    END LOOP;

    RETURN NEW;
END; $$;


--
-- Name: verificar_persona_sin_solapamiento(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_persona_sin_solapamiento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    choque RECORD;
BEGIN
    -- Sacar a alguien de una clase nunca puede generar un conflicto.
    IF NEW.estado_asistencia = 'CANCELADA' THEN
        RETURN NEW;
    END IF;

    SELECT * INTO choque
    FROM solapamiento_de_persona(NEW.id_reserva, NEW.id_usuario, NEW.id_participacion);

    IF FOUND THEN
        RAISE EXCEPTION
            'Esa persona ya esta en otra sala en ese horario (% %-%)',
            choque.fecha, choque.hora_inicio, choque.hora_fin;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_publicacion_con_contrato(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_publicacion_con_contrato() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado <> 'PUBLICADO' OR NEW.publicado_sin_contrato THEN
        RETURN NEW;
    END IF;

    IF NOT release_tiene_contrato(NEW.id_release, NEW.id_artista) THEN
        RAISE EXCEPTION
            'El release % no se puede publicar sin un contrato adjunto: no hay '
            'contrato de este release ni contrato general de su artista. Para '
            'publicarlo igual hay que marcarlo con publicado_sin_contrato y '
            'escribir el motivo, que queda firmado.', NEW.codigo_release;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_que_el_release_lleva_temas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_que_el_release_lleva_temas() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_tipo   TEXT;
    v_codigo TEXT;
BEGIN
    -- Prefijo `v_` en todas las variables por el bug que `V16` tuvo que
    -- arreglar: una variable con el mismo nombre que una columna hace que
    -- Postgres aborte con "column reference is ambiguous" ANTES de llegar al
    -- RAISE que explica la regla, y como 42702 no es P0001 la API contesta 500
    -- en vez del 409 con el texto redactado para una persona.
    SELECT r.tipo_release, r.codigo_release
      INTO v_tipo, v_codigo
      FROM release r WHERE r.id_release = NEW.id_release;

    IF v_tipo IS NULL THEN
        RAISE EXCEPTION
            'El release % todavia no tiene tipo, asi que no se le pueden cargar '
            'temas: elegi primero si es un EP o un album. Un single o un remix no '
            'llevan lista de temas -- el release ya es el tema.', v_codigo;
    END IF;

    IF v_tipo NOT IN ('EP', 'ALBUM') THEN
        RAISE EXCEPTION
            'El release % es un %, y solo un EP o un album llevan lista de temas. '
            'Un single es el release mismo: su nombre ya es el nombre del tema.',
            v_codigo, v_tipo;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_que_el_tipo_admite_los_temas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_que_el_tipo_admite_los_temas() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_temas INTEGER;
BEGIN
    IF NEW.tipo_release IS NOT DISTINCT FROM OLD.tipo_release THEN
        RETURN NEW;
    END IF;

    IF NEW.tipo_release IN ('EP', 'ALBUM') THEN
        RETURN NEW;
    END IF;

    SELECT count(*) INTO v_temas
      FROM cancion_release c WHERE c.id_release = NEW.id_release;

    IF v_temas > 0 THEN
        RAISE EXCEPTION
            'El release % tiene % tema(s) cargados, asi que no puede pasar a %: '
            'solo un EP o un album llevan lista de temas. Sacale los temas primero '
            'si de verdad cambio de formato.',
            NEW.codigo_release, v_temas, coalesce(NEW.tipo_release, 'sin tipo');
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_rango_de_temas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_rango_de_temas() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_minimo INTEGER;
    v_maximo INTEGER;
    v_temas  INTEGER;
BEGIN
    IF NOT (TG_OP = 'INSERT'
            OR OLD.estado IS DISTINCT FROM NEW.estado
            OR OLD.tipo_release IS DISTINCT FROM NEW.tipo_release) THEN
        RETURN NEW;
    END IF;

    IF NEW.estado <> 'PUBLICADO' THEN
        RETURN NEW;
    END IF;

    -- Un release sin tipo, o un single, o un remix, no tienen rango que
    -- verificar. Que no lleven temas ya lo sostiene §2.
    IF NEW.tipo_release = 'EP' THEN
        v_minimo := 3; v_maximo := 6;
    ELSIF NEW.tipo_release = 'ALBUM' THEN
        v_minimo := 8; v_maximo := 15;
    ELSE
        RETURN NEW;
    END IF;

    SELECT count(*) INTO v_temas
      FROM cancion_release c WHERE c.id_release = NEW.id_release;

    IF v_temas < v_minimo OR v_temas > v_maximo THEN
        RAISE EXCEPTION
            'El release % es un % y tiene % tema(s) cargados: un % lleva entre % y %. '
            'Cargalos desde la ficha del release y despues publicalo.',
            NEW.codigo_release, NEW.tipo_release, v_temas,
            NEW.tipo_release, v_minimo, v_maximo;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_sala_activa(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_sala_activa() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado IN ('CANCELADA', 'REPROGRAMADA') THEN
        RETURN NEW;
    END IF;

    IF NEW.fecha < CURRENT_DATE THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE'
       AND NEW.id_sala IS NOT DISTINCT FROM OLD.id_sala
       AND NEW.fecha   IS NOT DISTINCT FROM OLD.fecha THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM sala WHERE id_sala = NEW.id_sala AND activa) THEN
        RAISE EXCEPTION
            'Esa sala esta desactivada y no acepta reservas nuevas (% %-%)',
            NEW.fecha, NEW.hora_inicio, NEW.hora_fin;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_sala_no_bloqueada(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_sala_no_bloqueada() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado IN ('CANCELADA', 'REPROGRAMADA') THEN
        RETURN NEW;
    END IF;

    PERFORM exigir_read_committed('una sala bloqueada no acepta reservas');
    PERFORM 1 FROM sala WHERE id_sala = NEW.id_sala FOR UPDATE;

    IF EXISTS (
        SELECT 1 FROM bloqueo_sala b
        WHERE b.id_sala = NEW.id_sala
          AND NEW.fecha BETWEEN b.fecha_inicio AND b.fecha_fin
          AND NEW.hora_inicio < b.hora_fin
          AND NEW.hora_fin    > b.hora_inicio
    ) THEN
        RAISE EXCEPTION
            'La sala esta bloqueada en ese horario (reserva % %-%)',
            NEW.fecha, NEW.hora_inicio, NEW.hora_fin;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_sena_al_reactivar_reserva(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_sena_al_reactivar_reserva() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Solo cuando la reserva PASA a ocupar la franja. Cancelarla, o editarle la
    -- sala, no puede disparar esto: no es un cambio que le saque la plata.
    IF NEW.estado IN ('CANCELADA', 'REPROGRAMADA')
       OR OLD.estado NOT IN ('CANCELADA', 'REPROGRAMADA') THEN
        RETURN NEW;
    END IF;

    IF reserva_sin_plata_detras(NEW.id_reserva) THEN
        RAISE EXCEPTION
            'Esa reserva no se puede reactivar: su sena fue devuelta. Hay que '
            'registrar el pago de nuevo.';
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: verificar_sena_de_la_reserva(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_sena_de_la_reserva() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF reserva_sin_plata_detras(NEW.id_reserva) THEN
        RAISE EXCEPTION
            'No se aparta un horario sin pago por adelantado. Registra el pago de esa '
            'reserva, o anota al alumno con su inscripcion, que ya la cubre.';
    END IF;
    RETURN NEW;
END; $$;


--
-- Name: FUNCTION verificar_sena_de_la_reserva(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_sena_de_la_reserva() IS 'P8/DB-04a: ninguna reserva existe sin dinero detras, verificado al COMMIT. El dinero llega por pago.id_reserva o por la inscripcion del participante. Unica excepcion: MIX_MASTERING. Ver la cabecera de V10.';


--
-- Name: verificar_tamanio_del_grupo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_tamanio_del_grupo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_disciplina TEXT;
    v_actuales   INTEGER;
    v_maximo     INTEGER;
BEGIN
    SELECT disciplina INTO v_disciplina
    FROM inscripcion WHERE id_inscripcion = NEW.id_inscripcion;

    v_maximo := CASE WHEN v_disciplina = 'MENTORIA' THEN 1 ELSE 3 END;

    SELECT count(*) INTO v_actuales
    FROM inscripcion_integrante
    WHERE id_inscripcion = NEW.id_inscripcion;

    IF v_actuales + 1 > v_maximo THEN
        IF v_maximo = 1 THEN
            RAISE EXCEPTION
                'La mentoria es 1:1 y no admite grupos.';
        END IF;
        RAISE EXCEPTION
            'Un grupo es de hasta 3 personas; esta inscripcion ya tiene %.',
            v_actuales;
    END IF;

    RETURN NEW;
END; $$;


--
-- Name: FUNCTION verificar_tamanio_del_grupo(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_tamanio_del_grupo() IS 'V35 §4 (a): hasta 3 integrantes por inscripcion, 1 en la mentoria. Regla dura (P89).';


--
-- Name: verificar_una_abierta_por_disciplina(bigint, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_una_abierta_por_disciplina(p_id_inscripcion bigint, p_id_alumno bigint) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_disciplina TEXT;
    v_otra       BIGINT;
    v_nombre     TEXT;
BEGIN
    SELECT disciplina INTO v_disciplina
    FROM inscripcion WHERE id_inscripcion = p_id_inscripcion;

    SELECT i.id_inscripcion INTO v_otra
    FROM inscripcion i
    JOIN inscripcion_integrante ii ON ii.id_inscripcion = i.id_inscripcion
    WHERE ii.id_alumno = p_id_alumno
      AND i.disciplina = v_disciplina
      AND i.estado IN ('ACTIVA', 'PREINSCRIPTA')
      AND i.id_inscripcion <> p_id_inscripcion
    LIMIT 1;

    IF v_otra IS NOT NULL THEN
        SELECT u.nombre || ' ' || u.apellido INTO v_nombre
        FROM alumno a JOIN usuario u ON u.id_usuario = a.id_usuario
        WHERE a.id_alumno = p_id_alumno;

        RAISE EXCEPTION
            '% ya tiene una inscripcion abierta en % (la #%). Una persona no '
            'puede estar en dos a la vez en la misma disciplina: hay que '
            'cerrar esa antes.',
            v_nombre, v_disciplina, v_otra;
    END IF;
END; $$;


--
-- Name: FUNCTION verificar_una_abierta_por_disciplina(p_id_inscripcion bigint, p_id_alumno bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_una_abierta_por_disciplina(p_id_inscripcion bigint, p_id_alumno bigint) IS 'V35 §4 (d): una persona tiene a lo sumo una inscripcion ACTIVA/PREINSCRIPTA por disciplina (era el indice unico parcial de V1/V30 §3). Dos disparos: al sumar un integrante y al abrirse la inscripcion.';


--
-- Name: verificar_uso_solicitable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_uso_solicitable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    se_puede BOOLEAN;
    nombre_del_uso TEXT;
BEGIN
    SELECT solicitable_por_usuario, nombre INTO se_puede, nombre_del_uso
    FROM tipo_uso WHERE id_tipo_uso = NEW.id_tipo_uso;

    IF NOT se_puede THEN
        RAISE EXCEPTION
            '"%" no se pide desde el portal: esa reserva la arma administracion. '
            'Desde el portal se piden los usos que no dependen de un profesor '
            '(alquiler de cabina y grabacion de set).', nombre_del_uso;
    END IF;

    RETURN NEW;
END; $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alumno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumno (
    id_alumno bigint NOT NULL,
    id_usuario bigint NOT NULL,
    nivel_ingreso character varying(20),
    estado_alumno character varying(20) DEFAULT 'ACTIVO'::character varying NOT NULL,
    fecha_ingreso date DEFAULT CURRENT_DATE NOT NULL,
    ultimo_contacto date,
    instagram character varying(100),
    CONSTRAINT alumno_estado_valido CHECK (((estado_alumno)::text = ANY ((ARRAY['ACTIVO'::character varying, 'INACTIVO'::character varying, 'SUSPENDIDO'::character varying])::text[]))),
    CONSTRAINT alumno_nivel_ingreso_valido CHECK (((nivel_ingreso IS NULL) OR ((nivel_ingreso)::text = ANY ((ARRAY['INICIAL'::character varying, 'INTERMEDIO'::character varying, 'AVANZADO'::character varying])::text[]))))
);


--
-- Name: alumno_id_alumno_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.alumno ALTER COLUMN id_alumno ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.alumno_id_alumno_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: aparicion_release; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aparicion_release (
    id_aparicion bigint NOT NULL,
    id_release bigint NOT NULL,
    tipo_aparicion character varying(20) NOT NULL,
    donde character varying(200) NOT NULL,
    quien character varying(150),
    fecha date,
    url character varying(500),
    notas text,
    id_usuario_carga bigint,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    orden_relevancia smallint GENERATED ALWAYS AS (
CASE tipo_aparicion
    WHEN 'RADIO'::text THEN 1
    WHEN 'SET'::text THEN 2
    WHEN 'PLAYLIST'::text THEN 3
    ELSE 9
END) STORED,
    CONSTRAINT aparicion_tipo_valido CHECK (((tipo_aparicion)::text = ANY ((ARRAY['RADIO'::character varying, 'SET'::character varying, 'PLAYLIST'::character varying, 'OTRO'::character varying])::text[])))
);


--
-- Name: COLUMN aparicion_release.orden_relevancia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.aparicion_release.orden_relevancia IS 'La jerarquia de "popularidad", en un solo lugar. Se ordena por esta columna y despues por fecha. Vive en la base y no en la consulta para que el tablero del Modulo 8 no escriba un segundo CASE que pueda quedar distinto.';


--
-- Name: aparicion_release_id_aparicion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.aparicion_release ALTER COLUMN id_aparicion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.aparicion_release_id_aparicion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: artista; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artista (
    id_artista bigint NOT NULL,
    id_usuario bigint,
    nombre_artistico character varying(150) NOT NULL,
    nombre_real character varying(150),
    email_contacto character varying(150),
    telefono character varying(40),
    instagram character varying(100),
    confirmado boolean DEFAULT false NOT NULL,
    bio text,
    fecha_alta timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: artista_id_artista_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.artista ALTER COLUMN id_artista ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.artista_id_artista_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bloqueo_sala; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bloqueo_sala (
    id_bloqueo bigint NOT NULL,
    id_sala bigint NOT NULL,
    id_usuario_registra bigint,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    hora_inicio time without time zone DEFAULT '00:00:00'::time without time zone NOT NULL,
    hora_fin time without time zone DEFAULT '23:59:00'::time without time zone NOT NULL,
    motivo text NOT NULL,
    fecha_registro timestamp with time zone DEFAULT now() NOT NULL,
    dias daterange GENERATED ALWAYS AS (
CASE
    WHEN (fecha_fin >= fecha_inicio) THEN daterange(fecha_inicio, fecha_fin, '[]'::text)
    ELSE NULL::daterange
END) STORED,
    franja public.rango_horario GENERATED ALWAYS AS (
CASE
    WHEN (hora_fin > hora_inicio) THEN public.rango_horario(hora_inicio, hora_fin, '[)'::text)
    ELSE NULL::public.rango_horario
END) STORED,
    CONSTRAINT bloqueo_rango_fechas_valido CHECK ((fecha_fin >= fecha_inicio)),
    CONSTRAINT bloqueo_rango_horas_valido CHECK ((hora_fin > hora_inicio))
);


--
-- Name: bloqueo_sala_id_bloqueo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.bloqueo_sala ALTER COLUMN id_bloqueo ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bloqueo_sala_id_bloqueo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cancion_release; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cancion_release (
    id_cancion bigint NOT NULL,
    id_release bigint NOT NULL,
    orden smallint NOT NULL,
    titulo character varying(200) NOT NULL,
    duracion_segundos integer,
    artista_invitado character varying(200),
    isrc character varying(20),
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cancion_duracion_positiva CHECK (((duracion_segundos IS NULL) OR (duracion_segundos > 0))),
    CONSTRAINT cancion_isrc_valido CHECK (((isrc IS NULL) OR (upper(replace(replace((isrc)::text, '-'::text, ''::text), ' '::text, ''::text)) ~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$'::text))),
    CONSTRAINT cancion_orden_positivo CHECK ((orden >= 1)),
    CONSTRAINT cancion_titulo_no_vacio CHECK ((COALESCE(btrim((titulo)::text), ''::text) <> ''::text))
);


--
-- Name: TABLE cancion_release; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cancion_release IS 'Los temas de un EP o de un album (P51-P53). El rango -- EP 3 a 6, album 8 a 15 -- se verifica AL PUBLICAR y no por fila: un EP con un tema ya viola el rango, asi que exigirlo por fila haria imposible cargar el primero.';


--
-- Name: COLUMN cancion_release.isrc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cancion_release.isrc IS 'International Standard Recording Code. Se acepta con o sin guiones. NO es unico a proposito: la misma grabacion sale como single y como tema de un album con el mismo ISRC, que es justamente para lo que sirve.';


--
-- Name: cancion_release_id_cancion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cancion_release ALTER COLUMN id_cancion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cancion_release_id_cancion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: comprobante_egreso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comprobante_egreso (
    id_comprobante bigint NOT NULL,
    id_egreso bigint NOT NULL,
    archivo_path character varying(500) NOT NULL,
    nombre_original character varying(255) NOT NULL,
    id_usuario_carga bigint NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    invalido boolean DEFAULT false NOT NULL,
    id_usuario_invalida bigint,
    fecha_invalidacion timestamp with time zone,
    motivo_invalidacion text,
    CONSTRAINT comprobante_egreso_archivo_no_vacio CHECK (((btrim((archivo_path)::text) <> ''::text) AND (btrim((nombre_original)::text) <> ''::text))),
    CONSTRAINT comprobante_egreso_invalidacion_justificada CHECK (((NOT invalido) OR ((id_usuario_invalida IS NOT NULL) AND (fecha_invalidacion IS NOT NULL) AND (COALESCE(btrim(motivo_invalidacion), ''::text) <> ''::text))))
);


--
-- Name: comprobante_egreso_id_comprobante_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.comprobante_egreso ALTER COLUMN id_comprobante ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.comprobante_egreso_id_comprobante_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: comprobante_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comprobante_pago (
    id_comprobante bigint NOT NULL,
    id_pago bigint NOT NULL,
    archivo_path character varying(500) NOT NULL,
    nombre_original character varying(255) NOT NULL,
    id_usuario_carga bigint NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    invalido boolean DEFAULT false NOT NULL,
    id_usuario_invalida bigint,
    fecha_invalidacion timestamp with time zone,
    motivo_invalidacion text,
    CONSTRAINT comprobante_archivo_no_vacio CHECK (((btrim((archivo_path)::text) <> ''::text) AND (btrim((nombre_original)::text) <> ''::text))),
    CONSTRAINT comprobante_invalidacion_justificada CHECK (((NOT invalido) OR ((id_usuario_invalida IS NOT NULL) AND (fecha_invalidacion IS NOT NULL) AND (COALESCE(btrim(motivo_invalidacion), ''::text) <> ''::text))))
);


--
-- Name: comprobante_pago_id_comprobante_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.comprobante_pago ALTER COLUMN id_comprobante ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.comprobante_pago_id_comprobante_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: contrato_sello; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contrato_sello (
    id_contrato bigint NOT NULL,
    id_artista bigint NOT NULL,
    id_release bigint,
    archivo_path character varying(500) NOT NULL,
    fecha_firma date,
    observaciones text,
    fecha_carga timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contrato_sello_id_contrato_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.contrato_sello ALTER COLUMN id_contrato ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.contrato_sello_id_contrato_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: egreso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.egreso (
    id_egreso bigint NOT NULL,
    id_usuario_registra bigint,
    id_usuario_destino bigint,
    monto numeric(14,2) NOT NULL,
    moneda character varying(3) DEFAULT 'ARS'::character varying NOT NULL,
    cotizacion_dolar numeric(14,4),
    concepto character varying(200) NOT NULL,
    destinatario character varying(150),
    fecha_egreso date DEFAULT CURRENT_DATE NOT NULL,
    fecha_registro timestamp with time zone DEFAULT now() NOT NULL,
    anulado boolean DEFAULT false NOT NULL,
    id_usuario_anula bigint,
    fecha_anulacion timestamp with time zone,
    motivo_anulacion text,
    CONSTRAINT egreso_anulacion_justificada CHECK (((NOT anulado) OR ((id_usuario_anula IS NOT NULL) AND (fecha_anulacion IS NOT NULL) AND (COALESCE(btrim(motivo_anulacion), ''::text) <> ''::text)))),
    CONSTRAINT egreso_cotizacion_positiva CHECK (((cotizacion_dolar IS NULL) OR (cotizacion_dolar > (0)::numeric))),
    CONSTRAINT egreso_moneda_valida CHECK (((moneda)::text = ANY ((ARRAY['ARS'::character varying, 'USD'::character varying])::text[]))),
    CONSTRAINT egreso_monto_positivo CHECK ((monto > (0)::numeric)),
    CONSTRAINT egreso_usd_con_cotizacion CHECK ((((moneda)::text <> 'USD'::text) OR (cotizacion_dolar IS NOT NULL)))
);


--
-- Name: egreso_id_egreso_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.egreso ALTER COLUMN id_egreso ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.egreso_id_egreso_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: inscripcion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inscripcion (
    id_inscripcion bigint NOT NULL,
    id_profesor bigint,
    disciplina character varying(20) NOT NULL,
    nivel character varying(20),
    clases_contratadas smallint NOT NULL,
    precio_total numeric(14,2) NOT NULL,
    moneda character varying(3) DEFAULT 'ARS'::character varying NOT NULL,
    cotizacion_dolar numeric(14,4),
    fecha_inicio date,
    estado character varying(20) DEFAULT 'ACTIVA'::character varying NOT NULL,
    notas text,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    id_usuario_baja_nivel bigint,
    fecha_baja_nivel timestamp with time zone,
    motivo_baja_nivel text,
    vence_preinscripcion timestamp with time zone,
    numero_grupo integer,
    CONSTRAINT inscripcion_clases_positivas CHECK ((clases_contratadas > 0)),
    CONSTRAINT inscripcion_cotizacion_positiva CHECK (((cotizacion_dolar IS NULL) OR (cotizacion_dolar > (0)::numeric))),
    CONSTRAINT inscripcion_disciplina_valida CHECK (((disciplina)::text = ANY ((ARRAY['DJ'::character varying, 'PRODUCCION'::character varying, 'MENTORIA'::character varying])::text[]))),
    CONSTRAINT inscripcion_estado_valido CHECK (((estado)::text = ANY ((ARRAY['PREINSCRIPTA'::character varying, 'ACTIVA'::character varying, 'COMPLETADA'::character varying, 'CANCELADA'::character varying, 'PAUSADA'::character varying])::text[]))),
    CONSTRAINT inscripcion_moneda_valida CHECK (((moneda)::text = ANY ((ARRAY['ARS'::character varying, 'USD'::character varying])::text[]))),
    CONSTRAINT inscripcion_nivel_valido CHECK (((nivel IS NULL) OR ((nivel)::text = ANY ((ARRAY['INICIAL'::character varying, 'INTERMEDIO'::character varying, 'AVANZADO'::character varying])::text[])))),
    CONSTRAINT inscripcion_precio_no_negativo CHECK ((precio_total >= (0)::numeric)),
    CONSTRAINT inscripcion_preinscripta_vence CHECK ((((estado)::text = 'PREINSCRIPTA'::text) = (vence_preinscripcion IS NOT NULL))),
    CONSTRAINT inscripcion_usd_con_cotizacion CHECK ((((moneda)::text <> 'USD'::text) OR (cotizacion_dolar IS NOT NULL)))
);


--
-- Name: COLUMN inscripcion.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inscripcion.estado IS 'PREINSCRIPTA: anotada sin senia, con 24 hs (V30, P59/P60). ACTIVA: cursa. PAUSADA: cursa a medias, conserva sus clases. COMPLETADA / CANCELADA: terminales. VIGENTES (lo que cuenta como alumno) es ACTIVA + PAUSADA; la preinscripta NO esta ahi.';


--
-- Name: COLUMN inscripcion.vence_preinscripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inscripcion.vence_preinscripcion IS 'Hasta cuando puede seniarse (V30, P72: 24 hs). NULL en cualquier estado que no sea PREINSCRIPTA -- lo exige inscripcion_preinscripta_vence. Al vencer NO se cancela sola: avisa (P61).';


--
-- Name: COLUMN inscripcion.numero_grupo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.inscripcion.numero_grupo IS 'V35 §2: correlativo propio de los grupos de 2 o 3 ("Grupo 8"), de inscripcion_numero_grupo_seq; NULL para un alumno solo. Lo asigna el servicio al nacer y §4 (b) exige que este si y solo si son 2 o mas.';


--
-- Name: CONSTRAINT inscripcion_preinscripta_vence ON inscripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT inscripcion_preinscripta_vence ON public.inscripcion IS 'V30: una preinscripta tiene vencimiento y nada mas lo tiene. Las dos direcciones a proposito -- la forma de V24 §3.';


--
-- Name: inscripcion_id_inscripcion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.inscripcion ALTER COLUMN id_inscripcion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.inscripcion_id_inscripcion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: inscripcion_integrante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inscripcion_integrante (
    id_integrante bigint NOT NULL,
    id_inscripcion bigint NOT NULL,
    id_alumno bigint NOT NULL,
    referente boolean DEFAULT false NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE inscripcion_integrante; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inscripcion_integrante IS 'V35 §2: quienes cursan una inscripcion, de 1 a 3. El alumno solo es un grupo de 1. Fijos al nacer (§4 c): un grupo que cambia se cancela y se rehace (P89).';


--
-- Name: inscripcion_integrante_id_integrante_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.inscripcion_integrante ALTER COLUMN id_integrante ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.inscripcion_integrante_id_integrante_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: inscripcion_numero_grupo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inscripcion_numero_grupo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: material; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material (
    id_material bigint NOT NULL,
    id_profesor bigint NOT NULL,
    titulo character varying(200) NOT NULL,
    tipo character varying(50),
    archivo_path character varying(500),
    url_externa character varying(500),
    visible_alumno boolean DEFAULT true NOT NULL,
    fecha_subida timestamp with time zone DEFAULT now() NOT NULL,
    id_inscripcion bigint NOT NULL,
    id_reserva bigint,
    CONSTRAINT material_tiene_contenido CHECK (((archivo_path IS NOT NULL) OR (url_externa IS NOT NULL)))
);


--
-- Name: COLUMN material.id_inscripcion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.material.id_inscripcion IS 'De qué curso es este material. Dice el programa Y el alumno, porque una inscripcion es el contrato de un alumno. NOT NULL: no existe el material sin destinatario (V23).';


--
-- Name: COLUMN material.id_reserva; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.material.id_reserva IS 'De qué clase es, si es de una. NULL = del curso entero, que es material del programa y no de una clase puntual (V23, P41).';


--
-- Name: material_id_material_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.material ALTER COLUMN id_material ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.material_id_material_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: nota_profesor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nota_profesor (
    id_nota bigint NOT NULL,
    id_profesor bigint NOT NULL,
    id_alumno bigint NOT NULL,
    id_participacion bigint,
    contenido text NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_modificacion timestamp with time zone
);


--
-- Name: TABLE nota_profesor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nota_profesor IS 'Notas privadas del profesor sobre un alumno. No las ve ni el alumno ni otro profesor; administracion si. Esa regla vive en el service (M5), no aca: ver la cabecera de V14. Que la nota cuelgue de una clase DE ESE alumno lo sostiene V1 seccion 8.3.';


--
-- Name: nota_profesor_id_nota_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.nota_profesor ALTER COLUMN id_nota ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.nota_profesor_id_nota_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: notificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacion (
    id_notificacion bigint NOT NULL,
    id_usuario_destino bigint NOT NULL,
    tipo character varying(50) NOT NULL,
    titulo character varying(200),
    contenido text NOT NULL,
    url_destino character varying(300),
    leida boolean DEFAULT false NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    clave_evento character varying(200)
);


--
-- Name: COLUMN notificacion.clave_evento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notificacion.clave_evento IS 'Identifica el HECHO avisado, no la corrida: la misma situación da siempre la misma clave, así el disparador automático puede correr dos veces el mismo día sin duplicar la bandeja. NULL en los avisos que escribe una persona al resolver algo (M4, M5): ahí dos acciones parecidas son dos avisos distintos y los dos tienen que llegar.';


--
-- Name: notificacion_id_notificacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.notificacion ALTER COLUMN id_notificacion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.notificacion_id_notificacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pago (
    id_pago bigint NOT NULL,
    id_usuario bigint,
    id_usuario_registra bigint,
    id_inscripcion bigint,
    id_reserva bigint,
    id_trabajo_mastering bigint,
    id_venta_equipo bigint,
    concepto character varying(200),
    monto numeric(14,2) NOT NULL,
    moneda character varying(3) DEFAULT 'ARS'::character varying NOT NULL,
    cotizacion_dolar numeric(14,4),
    medio_pago character varying(30) NOT NULL,
    descuento_porcentaje numeric(5,2) DEFAULT 0 NOT NULL,
    motivo_descuento text,
    estado_pago character varying(20) DEFAULT 'PAGADO'::character varying NOT NULL,
    fecha_pago date DEFAULT CURRENT_DATE NOT NULL,
    fecha_registro timestamp with time zone DEFAULT now() NOT NULL,
    id_usuario_anula bigint,
    fecha_anulacion timestamp with time zone,
    motivo_anulacion text,
    nombre_pagador_externo character varying(150),
    contacto_pagador_externo character varying(150),
    id_usuario_modifico bigint,
    fecha_modificacion timestamp with time zone,
    CONSTRAINT pago_anulacion_justificada CHECK ((((estado_pago)::text <> 'ANULADO'::text) OR ((id_usuario_anula IS NOT NULL) AND (fecha_anulacion IS NOT NULL) AND (COALESCE(btrim(motivo_anulacion), ''::text) <> ''::text)))),
    CONSTRAINT pago_cotizacion_positiva CHECK (((cotizacion_dolar IS NULL) OR (cotizacion_dolar > (0)::numeric))),
    CONSTRAINT pago_descuento_justificado CHECK (((descuento_porcentaje = (0)::numeric) OR (motivo_descuento IS NOT NULL))),
    CONSTRAINT pago_descuento_rango CHECK (((descuento_porcentaje >= (0)::numeric) AND (descuento_porcentaje <= (100)::numeric))),
    CONSTRAINT pago_estado_valido CHECK (((estado_pago)::text = ANY ((ARRAY['SENADO'::character varying, 'PAGADO'::character varying, 'DEBE'::character varying, 'VENCIDO'::character varying, 'ANULADO'::character varying])::text[]))),
    CONSTRAINT pago_medio_valido CHECK (((medio_pago)::text = ANY ((ARRAY['EFECTIVO'::character varying, 'TRANSFERENCIA'::character varying, 'PAYPAL'::character varying, 'CUENTA_EEUU'::character varying, 'OTRO'::character varying])::text[]))),
    CONSTRAINT pago_moneda_valida CHECK (((moneda)::text = ANY ((ARRAY['ARS'::character varying, 'USD'::character varying])::text[]))),
    CONSTRAINT pago_monto_positivo CHECK ((monto > (0)::numeric)),
    CONSTRAINT pago_pagador_identificado CHECK (((id_usuario IS NOT NULL) OR (COALESCE(btrim((nombre_pagador_externo)::text), ''::text) <> ''::text))),
    CONSTRAINT pago_tiene_destino CHECK ((num_nonnulls(id_inscripcion, id_reserva, id_trabajo_mastering, id_venta_equipo) = 1)),
    CONSTRAINT pago_usd_con_cotizacion CHECK ((((moneda)::text <> 'USD'::text) OR (cotizacion_dolar IS NOT NULL)))
);


--
-- Name: COLUMN pago.id_usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pago.id_usuario IS 'Quien pago, cuando tiene cuenta. NULLABLE desde V19: la otra mitad es nombre_pagador_externo. Ver pago_pagador_identificado.';


--
-- Name: COLUMN pago.nombre_pagador_externo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pago.nombre_pagador_externo IS 'Quien pago, cuando NO tiene cuenta. Espeja nombre_comprador_externo de venta_equipo. Ver V19 seccion 1.';


--
-- Name: COLUMN pago.contacto_pagador_externo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pago.contacto_pagador_externo IS 'Telefono o mail del pagador sin cuenta. Opcional: identificar no es poder contactar.';


--
-- Name: COLUMN pago.id_usuario_modifico; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pago.id_usuario_modifico IS 'Quien edito el pago por ultima vez. Lo exige pago_edicion_con_autor. Ver V19 seccion 2.';


--
-- Name: COLUMN pago.fecha_modificacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pago.fecha_modificacion IS 'Cuando. La escribe el trigger y no quien edita: un sello que el cliente elige se puede antedatar (DB-07).';


--
-- Name: CONSTRAINT pago_anulacion_justificada ON pago; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT pago_anulacion_justificada ON public.pago IS 'Anular un pago lo saca del balance: exige autor, fecha y motivo, como toda otra excepcion del esquema. Ver V7 §1.';


--
-- Name: CONSTRAINT pago_cotizacion_positiva ON pago; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT pago_cotizacion_positiva ON public.pago IS 'Una cotizacion en 0 hace desaparecer del balance todo importe en USD sin lanzar ningun error.';


--
-- Name: CONSTRAINT pago_pagador_identificado ON pago; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT pago_pagador_identificado ON public.pago IS 'Un pago dice de quien es: cuenta o nombre escrito. Un pago sin dueño identificable es plata que despues no se le puede atribuir a nadie. Ver V19 seccion 1.';


--
-- Name: pago_id_pago_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pago ALTER COLUMN id_pago ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pago_id_pago_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: profesor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profesor (
    id_profesor bigint NOT NULL,
    id_usuario bigint NOT NULL,
    especialidad character varying(150),
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: profesor_id_profesor_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.profesor ALTER COLUMN id_profesor ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.profesor_id_profesor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: programa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programa (
    id_programa bigint NOT NULL,
    disciplina character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    precio numeric(14,2),
    moneda character varying(3) DEFAULT 'ARS'::character varying NOT NULL,
    cobro character varying(10) NOT NULL,
    clases_estandar smallint,
    duracion_minutos smallint DEFAULT 90 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    precio_2 numeric(14,2),
    precio_3 numeric(14,2),
    CONSTRAINT programa_clases_positivas CHECK (((clases_estandar IS NULL) OR (clases_estandar > 0))),
    CONSTRAINT programa_cobro_valido CHECK (((cobro)::text = ANY ((ARRAY['PAQUETE'::character varying, 'SESION'::character varying])::text[]))),
    CONSTRAINT programa_disciplina_valida CHECK (((disciplina)::text = ANY ((ARRAY['DJ'::character varying, 'PRODUCCION'::character varying, 'MENTORIA'::character varying])::text[]))),
    CONSTRAINT programa_duracion_positiva CHECK ((duracion_minutos > 0)),
    CONSTRAINT programa_moneda_valida CHECK (((moneda)::text = ANY ((ARRAY['ARS'::character varying, 'USD'::character varying])::text[]))),
    CONSTRAINT programa_paquete_con_clases CHECK ((((cobro)::text <> 'PAQUETE'::text) OR (clases_estandar IS NOT NULL))),
    CONSTRAINT programa_precio_no_negativo CHECK (((precio IS NULL) OR (precio >= (0)::numeric))),
    CONSTRAINT programa_precios_de_grupo_no_negativos CHECK ((((precio_2 IS NULL) OR (precio_2 >= (0)::numeric)) AND ((precio_3 IS NULL) OR (precio_3 >= (0)::numeric))))
);


--
-- Name: TABLE programa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.programa IS 'Lo que se vende como curso: una fila por disciplina, con su precio de hoy. La inscripción copia el precio al inscribir y guarda el suyo (P63).';


--
-- Name: COLUMN programa.precio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.programa.precio IS 'NULL = todavía no hay precio (se muestra "a confirmar"). Cero es un precio.';


--
-- Name: COLUMN programa.cobro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.programa.cobro IS 'PAQUETE: precio del curso entero. SESION: precio de cada sesión.';


--
-- Name: COLUMN programa.precio_2; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.programa.precio_2 IS 'V35 §1: precio del programa para un grupo de 2 (el total del grupo, no por persona). NULL = sin precio cargado. No es formula sobre `precio`: se escribe (P88).';


--
-- Name: COLUMN programa.precio_3; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.programa.precio_3 IS 'V35 §1: precio del programa para un grupo de 3. NULL = sin precio cargado. La mentoria no admite grupos y lo dice el trigger de integrantes, no este NULL.';


--
-- Name: programa_id_programa_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.programa ALTER COLUMN id_programa ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.programa_id_programa_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: release; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.release (
    id_release bigint NOT NULL,
    codigo_release character varying(20) NOT NULL,
    id_artista bigint NOT NULL,
    nombre_release character varying(200) NOT NULL,
    tipo_release character varying(20),
    genero character varying(80),
    portada_path character varying(500),
    fecha_estimada date,
    fecha_real date,
    estado character varying(20) DEFAULT 'A_CONFIRMAR'::character varying NOT NULL,
    sistema_promo boolean DEFAULT false NOT NULL,
    notas text,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    publicado_sin_contrato boolean DEFAULT false NOT NULL,
    motivo_publicacion text,
    id_usuario_publica bigint,
    CONSTRAINT release_estado_valido CHECK (((estado)::text = ANY ((ARRAY['A_CONFIRMAR'::character varying, 'CONFIRMADO'::character varying, 'EN_DISTRIBUCION'::character varying, 'PUBLICADO'::character varying, 'CANCELADO'::character varying])::text[]))),
    CONSTRAINT release_publicacion_justificada CHECK (((NOT publicado_sin_contrato) OR ((COALESCE(btrim(motivo_publicacion), ''::text) <> ''::text) AND (id_usuario_publica IS NOT NULL)))),
    CONSTRAINT release_tipo_valido CHECK (((tipo_release IS NULL) OR ((tipo_release)::text = ANY ((ARRAY['SINGLE'::character varying, 'EP'::character varying, 'REMIX'::character varying, 'ALBUM'::character varying])::text[]))))
);


--
-- Name: release_id_release_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.release ALTER COLUMN id_release ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.release_id_release_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: reserva; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reserva (
    id_reserva bigint NOT NULL,
    id_sala bigint NOT NULL,
    id_tipo_uso bigint NOT NULL,
    id_profesor bigint,
    fecha date NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    estado character varying(20) DEFAULT 'CONFIRMADA'::character varying NOT NULL,
    notas text,
    id_reserva_recupera bigint,
    motivo_reprogramacion text,
    id_usuario_creo bigint,
    id_usuario_modifico bigint,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_modificacion timestamp with time zone,
    periodo tsrange GENERATED ALWAYS AS (tsrange((fecha + hora_inicio), (fecha + hora_fin))) STORED,
    vence_preconfirmacion timestamp with time zone,
    precio_total numeric(14,2),
    moneda character varying(3),
    CONSTRAINT reserva_estado_valido CHECK (((estado)::text = ANY ((ARRAY['PRECONFIRMADA'::character varying, 'CONFIRMADA'::character varying, 'MODIFICADA'::character varying, 'CANCELADA'::character varying, 'REPROGRAMADA'::character varying, 'FINALIZADA'::character varying])::text[]))),
    CONSTRAINT reserva_horas_validas CHECK ((hora_fin > hora_inicio)),
    CONSTRAINT reserva_moneda_valida CHECK (((moneda IS NULL) OR ((moneda)::text = ANY ((ARRAY['ARS'::character varying, 'USD'::character varying])::text[])))),
    CONSTRAINT reserva_no_se_recupera_a_si_misma CHECK ((id_reserva_recupera IS DISTINCT FROM id_reserva)),
    CONSTRAINT reserva_precio_con_moneda CHECK (((precio_total IS NULL) = (moneda IS NULL))),
    CONSTRAINT reserva_precio_positivo CHECK (((precio_total IS NULL) OR (precio_total > (0)::numeric))),
    CONSTRAINT reserva_preconfirmada_vence CHECK ((((estado)::text = 'PRECONFIRMADA'::text) = (vence_preconfirmacion IS NOT NULL)))
);


--
-- Name: COLUMN reserva.vence_preconfirmacion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reserva.vence_preconfirmacion IS 'Hasta cuando esta apartado el horario sin pagar (V24). El servidor lo calcula como el menor entre ahora+24hs y el inicio de la reserva (P44). NULL en cualquier estado que no sea PRECONFIRMADA -- lo exige reserva_preconfirmada_vence.';


--
-- Name: COLUMN reserva.precio_total; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reserva.precio_total IS 'V33 (P83): el precio de un alquiler o una grabacion. NULL en las clases (su plata es la inscripcion) y en las reservas anteriores a V33. Con precio, Deudores calcula lo que falta.';


--
-- Name: COLUMN reserva.moneda; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.reserva.moneda IS 'V33 (P83): la moneda del precio. Un pago que apunta a la reserva lleva esta moneda (§2), y no se cambia con pagos vivos en otra (§3).';


--
-- Name: CONSTRAINT reserva_estado_valido ON reserva; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT reserva_estado_valido ON public.reserva IS 'PRECONFIRMADA (V24) es el horario apartado con la deuda anotada y su vencimiento. Ocupa la franja como cualquier otro estado que no sea CANCELADA ni REPROGRAMADA.';


--
-- Name: CONSTRAINT reserva_preconfirmada_vence ON reserva; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT reserva_preconfirmada_vence ON public.reserva IS 'V24: una preconfirmada tiene vencimiento y nada mas lo tiene. Las dos direcciones a proposito -- ver la cabecera de V24 §3.';


--
-- Name: reserva_id_reserva_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.reserva ALTER COLUMN id_reserva ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.reserva_id_reserva_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: reserva_participante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reserva_participante (
    id_participacion bigint NOT NULL,
    id_reserva bigint NOT NULL,
    id_usuario bigint NOT NULL,
    id_inscripcion bigint,
    estado_asistencia character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    observaciones text,
    fecha_registro timestamp with time zone DEFAULT now() NOT NULL,
    id_usuario_modifico bigint,
    fecha_modificacion timestamp with time zone,
    CONSTRAINT participante_asistencia_valida CHECK (((estado_asistencia)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'PRESENTE'::character varying, 'AUSENTE'::character varying, 'AUSENTE_JUSTIFICADO'::character varying, 'CANCELADA'::character varying])::text[])))
);


--
-- Name: reserva_participante_id_participacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.reserva_participante ALTER COLUMN id_participacion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.reserva_participante_id_participacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sala; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sala (
    id_sala bigint NOT NULL,
    nombre_sala character varying(100) NOT NULL,
    descripcion text,
    activa boolean DEFAULT true NOT NULL,
    orden smallint DEFAULT 0 NOT NULL
);


--
-- Name: sala_id_sala_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sala ALTER COLUMN id_sala ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sala_id_sala_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sala_tipo_uso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sala_tipo_uso (
    id_sala bigint NOT NULL,
    id_tipo_uso bigint NOT NULL,
    advertencia text
);


--
-- Name: seguimiento_alumno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seguimiento_alumno (
    id_seguimiento bigint NOT NULL,
    id_profesor bigint NOT NULL,
    id_alumno bigint NOT NULL,
    estado character varying(30) NOT NULL,
    observaciones text,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT seguimiento_estado_valido CHECK (((estado)::text = ANY ((ARRAY['VA_BIEN'::character varying, 'REQUIERE_ATENCION'::character varying, 'EN_PAUSA'::character varying])::text[])))
);


--
-- Name: TABLE seguimiento_alumno; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.seguimiento_alumno IS 'Un estado por profesor y por alumno (VA_BIEN / REQUIERE_ATENCION / EN_PAUSA). fecha_actualizacion la mantiene un trigger, para que "con fecha de cambio" sea cierto.';


--
-- Name: seguimiento_alumno_id_seguimiento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.seguimiento_alumno ALTER COLUMN id_seguimiento ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.seguimiento_alumno_id_seguimiento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: solicitante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitante (
    id_solicitante bigint NOT NULL,
    nombre character varying(80) NOT NULL,
    apellido character varying(80) NOT NULL,
    email character varying(150) NOT NULL,
    telefono character varying(40) NOT NULL,
    interes character varying(30) NOT NULL,
    detalle text,
    mensaje text,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    id_usuario_resuelve bigint,
    id_usuario bigint,
    respuesta text,
    fecha_resolucion timestamp with time zone,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    id_reserva bigint,
    id_inscripcion bigint,
    id_venta_equipo bigint,
    fecha_preferida date,
    hora_preferida time without time zone,
    duracion_minutos integer,
    disciplina character varying(20),
    experiencia character varying(10),
    modalidad character varying(12),
    CONSTRAINT solicitante_atendido_produjo_algo CHECK ((((estado)::text = 'ATENDIDO'::text) = ((id_reserva IS NOT NULL) OR (id_inscripcion IS NOT NULL) OR (id_venta_equipo IS NOT NULL)))),
    CONSTRAINT solicitante_descarte_explicado CHECK ((((estado)::text <> 'DESCARTADO'::text) OR (COALESCE(btrim(respuesta), ''::text) <> ''::text))),
    CONSTRAINT solicitante_disciplina_valida CHECK (((disciplina IS NULL) OR ((disciplina)::text = ANY ((ARRAY['DJ'::character varying, 'PRODUCCION'::character varying, 'MENTORIA'::character varying])::text[])))),
    CONSTRAINT solicitante_duracion_positiva CHECK (((duracion_minutos IS NULL) OR (duracion_minutos > 0))),
    CONSTRAINT solicitante_estado_valido CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'ATENDIDO'::character varying, 'DESCARTADO'::character varying])::text[]))),
    CONSTRAINT solicitante_experiencia_valida CHECK (((experiencia IS NULL) OR ((experiencia)::text = ANY ((ARRAY['CERO'::character varying, 'ALGO'::character varying, 'TOCA'::character varying])::text[])))),
    CONSTRAINT solicitante_interes_valido CHECK (((interes)::text = ANY ((ARRAY['CURSO'::character varying, 'ALQUILER_CABINA'::character varying, 'GRABACION_SET'::character varying, 'EQUIPOS'::character varying, 'OTRO'::character varying])::text[]))),
    CONSTRAINT solicitante_modalidad_valida CHECK (((modalidad IS NULL) OR ((modalidad)::text = ANY ((ARRAY['PRESENCIAL'::character varying, 'VIRTUAL'::character varying])::text[])))),
    CONSTRAINT solicitante_resolucion_completa CHECK ((((estado)::text = 'PENDIENTE'::text) OR ((id_usuario_resuelve IS NOT NULL) AND (fecha_resolucion IS NOT NULL))))
);


--
-- Name: TABLE solicitante; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.solicitante IS 'Hallazgo #7 (mejoras.md 9.4): lo que llega de los formularios de la landing. Es una ficha con ciclo de vida y no una notificacion, porque lo que tiene que garantizar es que quede la lista de a quien no se contesto. La cuenta la crea administracion al convertirla.';


--
-- Name: COLUMN solicitante.interes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitante.interes IS 'A que formulario de la landing corresponde. CURSO y EQUIPOS no son usos de sala; ALQUILER_CABINA y GRABACION_SET coinciden con tipo_uso.codigo a proposito, pero no hay FK.';


--
-- Name: COLUMN solicitante.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitante.estado IS 'PENDIENTE: nadie la atendio. ATENDIDO: produjo una reserva, una inscripcion o una venta -- ver las tres FK. DESCARTADO: se cerro a mano, con motivo. "Tiene cuenta" NO es un estado: es id_usuario (P55).';


--
-- Name: COLUMN solicitante.id_usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitante.id_usuario IS 'La cuenta en la que termino la ficha: la nueva, o la que la persona ya tenia. Para el buzon los dos caminos son el mismo hecho.';


--
-- Name: COLUMN solicitante.id_reserva; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitante.id_reserva IS 'Que produjo esta ficha. Se escribe junto con el estado ATENDIDO y no se vuelve a tocar: `solicitante_resuelto_es_final` (V13 4) congela la fila.';


--
-- Name: COLUMN solicitante.fecha_preferida; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitante.fecha_preferida IS 'Que dia le vendria bien a quien pidio. Es una PREFERENCIA y no una reserva: la landing no ve disponibilidad (6f.5). Opcional -- ver P58.';


--
-- Name: COLUMN solicitante.duracion_minutos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitante.duracion_minutos IS 'Cuanto tiempo, en minutos. La hora de fin la calcula el sistema al precargar el alta: "2 horas" es lo que la persona piensa, no "de 18 a 20".';


--
-- Name: COLUMN solicitante.disciplina; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitante.disciplina IS 'Que programa pidio. Mismo CHECK que inscripcion y programa; no es FK a proposito (V29, punto 5). NULL si el formulario no lo dijo -- no se ata a interes (punto 2).';


--
-- Name: COLUMN solicitante.experiencia; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitante.experiencia IS 'Lo que el formulario pregunta: CERO (arranca de cero), ALGO (algo por su cuenta), TOCA (ya toca o produce). NO es un nivel: el nivel se prellena desde aca al inscribir y quien inscribe lo puede cambiar (P64).';


--
-- Name: COLUMN solicitante.modalidad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitante.modalidad IS 'PRESENCIAL o VIRTUAL. Dato de la ficha, no de la reserva: la sesion virtual se carga igual en una sala (P67).';


--
-- Name: solicitante_companero; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitante_companero (
    id_companero bigint NOT NULL,
    id_solicitante bigint NOT NULL,
    nombre character varying(80) NOT NULL,
    apellido character varying(80) NOT NULL,
    email character varying(150) NOT NULL,
    telefono character varying(40) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT companero_contacto_no_vacio CHECK (((btrim((email)::text) <> ''::text) AND (btrim((telefono)::text) <> ''::text))),
    CONSTRAINT companero_nombre_no_vacio CHECK (((btrim((nombre)::text) <> ''::text) AND (btrim((apellido)::text) <> ''::text)))
);


--
-- Name: TABLE solicitante_companero; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.solicitante_companero IS 'V36 §1: los que vienen con quien lleno el formulario de un curso (hasta 2). Quien lo lleno es la ficha y el referente. Los cuatro datos obligatorios (P92).';


--
-- Name: solicitante_companero_id_companero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.solicitante_companero ALTER COLUMN id_companero ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitante_companero_id_companero_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: solicitante_id_solicitante_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.solicitante ALTER COLUMN id_solicitante ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitante_id_solicitante_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: solicitud_reprogramacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitud_reprogramacion (
    id_solicitud bigint NOT NULL,
    id_usuario bigint NOT NULL,
    id_reserva bigint NOT NULL,
    motivo text NOT NULL,
    fecha_alternativa_solicitada date,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    id_usuario_resuelve bigint,
    respuesta text,
    fecha_solicitud timestamp with time zone DEFAULT now() NOT NULL,
    fecha_resolucion timestamp with time zone,
    CONSTRAINT solicitud_estado_valido CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'APROBADA'::character varying, 'RECHAZADA'::character varying])::text[]))),
    CONSTRAINT solicitud_resolucion_completa CHECK ((((estado)::text = 'PENDIENTE'::text) OR ((id_usuario_resuelve IS NOT NULL) AND (fecha_resolucion IS NOT NULL))))
);


--
-- Name: solicitud_reprogramacion_id_solicitud_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.solicitud_reprogramacion ALTER COLUMN id_solicitud ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitud_reprogramacion_id_solicitud_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: solicitud_reserva; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitud_reserva (
    id_solicitud_reserva bigint NOT NULL,
    id_usuario bigint NOT NULL,
    id_sala bigint NOT NULL,
    id_tipo_uso bigint NOT NULL,
    fecha date NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    comentario text,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    id_usuario_resuelve bigint,
    respuesta text,
    id_reserva bigint,
    fecha_resolucion timestamp with time zone,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT solicitud_reserva_aprobada_tiene_reserva CHECK (((((estado)::text = 'APROBADA'::text) AND (id_reserva IS NOT NULL)) OR (((estado)::text <> 'APROBADA'::text) AND (id_reserva IS NULL)))),
    CONSTRAINT solicitud_reserva_estado_valido CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'APROBADA'::character varying, 'RECHAZADA'::character varying, 'CANCELADA'::character varying])::text[]))),
    CONSTRAINT solicitud_reserva_horas_validas CHECK ((hora_fin > hora_inicio)),
    CONSTRAINT solicitud_reserva_rechazo_explicado CHECK ((((estado)::text <> 'RECHAZADA'::text) OR (COALESCE(btrim(respuesta), ''::text) <> ''::text))),
    CONSTRAINT solicitud_reserva_resolucion_completa CHECK ((((estado)::text = 'PENDIENTE'::text) OR ((id_usuario_resuelve IS NOT NULL) AND (fecha_resolucion IS NOT NULL))))
);


--
-- Name: TABLE solicitud_reserva; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.solicitud_reserva IS 'P17: lo que el portal SI puede crear. Un USUARIO no puede insertar una reserva porque no tiene como poner la plata que V10-V12 le exigen; pide, y administracion aprueba cargando la sena. Ver la cabecera de V13.';


--
-- Name: solicitud_reserva_id_solicitud_reserva_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.solicitud_reserva ALTER COLUMN id_solicitud_reserva ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitud_reserva_id_solicitud_reserva_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tipo_uso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipo_uso (
    id_tipo_uso bigint NOT NULL,
    codigo character varying(40) NOT NULL,
    nombre character varying(100) NOT NULL,
    es_clase boolean DEFAULT false NOT NULL,
    color character varying(20),
    activo boolean DEFAULT true NOT NULL,
    solicitable_por_usuario boolean DEFAULT false NOT NULL,
    disciplina character varying(20),
    CONSTRAINT tipo_uso_disciplina_coherente CHECK (((es_clase AND (disciplina IS NOT NULL)) OR ((NOT es_clase) AND (disciplina IS NULL)))),
    CONSTRAINT tipo_uso_disciplina_valida CHECK (((disciplina IS NULL) OR ((disciplina)::text = ANY ((ARRAY['DJ'::character varying, 'PRODUCCION'::character varying, 'MENTORIA'::character varying])::text[]))))
);


--
-- Name: COLUMN tipo_uso.solicitable_por_usuario; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipo_uso.solicitable_por_usuario IS 'P17: si un USUARIO puede pedir este uso desde el portal sin que administracion se lo arme. TRUE solo donde no hay un profesor del otro lado.';


--
-- Name: COLUMN tipo_uso.disciplina; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tipo_uso.disciplina IS 'De qué curso descuenta una clase de este tipo. NULL = no descuenta. Es el dato del que sale la inscripción al anotar a alguien (V22).';


--
-- Name: tipo_uso_id_tipo_uso_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tipo_uso ALTER COLUMN id_tipo_uso ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tipo_uso_id_tipo_uso_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: trabajo_mastering; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trabajo_mastering (
    id_trabajo bigint NOT NULL,
    id_cliente_usuario bigint,
    nombre_cliente_externo character varying(150),
    contacto_cliente_externo character varying(150),
    id_profesor_asignado bigint,
    tipo_trabajo character varying(20) NOT NULL,
    nombre_track character varying(200) NOT NULL,
    precio_acordado numeric(14,2),
    moneda character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    cotizacion_dolar numeric(14,4),
    revisiones_incluidas smallint DEFAULT 3 NOT NULL,
    revisiones_realizadas smallint DEFAULT 0 NOT NULL,
    fecha_estimada date,
    fecha_entrega_real date,
    estado character varying(20) DEFAULT 'A_CONFIRMAR'::character varying NOT NULL,
    url_material_cliente character varying(500),
    url_master character varying(500),
    url_premaster character varying(500),
    premaster_liberado boolean DEFAULT false NOT NULL,
    liberado_sin_pago boolean DEFAULT false NOT NULL,
    motivo_liberacion text,
    id_usuario_libera bigint,
    notas_internas text,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trabajo_cliente_identificado CHECK (((id_cliente_usuario IS NOT NULL) OR (nombre_cliente_externo IS NOT NULL))),
    CONSTRAINT trabajo_cotizacion_positiva CHECK (((cotizacion_dolar IS NULL) OR (cotizacion_dolar > (0)::numeric))),
    CONSTRAINT trabajo_estado_valido CHECK (((estado)::text = ANY ((ARRAY['A_CONFIRMAR'::character varying, 'EN_PROCESO'::character varying, 'ENTREGADO'::character varying, 'PAGADO'::character varying, 'DEBE'::character varying, 'CANCELADO'::character varying])::text[]))),
    CONSTRAINT trabajo_liberacion_justificada CHECK (((NOT liberado_sin_pago) OR (motivo_liberacion IS NOT NULL))),
    CONSTRAINT trabajo_moneda_valida CHECK (((moneda)::text = ANY ((ARRAY['ARS'::character varying, 'USD'::character varying])::text[]))),
    CONSTRAINT trabajo_precio_no_negativo CHECK (((precio_acordado IS NULL) OR (precio_acordado >= (0)::numeric))),
    CONSTRAINT trabajo_revisiones_no_negativas CHECK (((revisiones_realizadas >= 0) AND (revisiones_incluidas >= 0))),
    CONSTRAINT trabajo_tipo_valido CHECK (((tipo_trabajo)::text = ANY ((ARRAY['MIX'::character varying, 'MASTER'::character varying, 'MIX_MASTER'::character varying])::text[])))
);


--
-- Name: COLUMN trabajo_mastering.revisiones_realizadas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trabajo_mastering.revisiones_realizadas IS 'Cuántas revisiones se hicieron. PUEDE superar a revisiones_incluidas: esa es la alerta de §9, no un error. El techo que ponía V6 §3 se sacó en V15 porque hacía imposible registrar el hecho que la regla pide avisar.';


--
-- Name: trabajo_mastering_id_trabajo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.trabajo_mastering ALTER COLUMN id_trabajo ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.trabajo_mastering_id_trabajo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario (
    id_usuario bigint NOT NULL,
    email character varying(150) NOT NULL,
    telefono character varying(40),
    password_hash character varying(255) NOT NULL,
    rol character varying(20) DEFAULT 'USUARIO'::character varying NOT NULL,
    foto_perfil character varying(500),
    estado_presencia character varying(20) DEFAULT 'ACTIVO'::character varying NOT NULL,
    bio text,
    especializacion character varying(150),
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    ultimo_acceso timestamp with time zone,
    nombre character varying(80) NOT NULL,
    apellido character varying(80) NOT NULL,
    debe_cambiar_password boolean DEFAULT false NOT NULL,
    password_temporal_desde timestamp with time zone,
    credenciales_desde timestamp with time zone,
    CONSTRAINT usuario_email_no_vacio CHECK ((btrim((email)::text) <> ''::text)),
    CONSTRAINT usuario_nombre_no_vacio CHECK (((btrim((nombre)::text) <> ''::text) AND (btrim((apellido)::text) <> ''::text))),
    CONSTRAINT usuario_password_temporal_coherente CHECK ((debe_cambiar_password = (password_temporal_desde IS NOT NULL))),
    CONSTRAINT usuario_presencia_valida CHECK (((estado_presencia)::text = ANY ((ARRAY['ACTIVO'::character varying, 'AUSENTE'::character varying, 'OCUPADO'::character varying, 'EN_CLASE'::character varying])::text[]))),
    CONSTRAINT usuario_rol_valido CHECK (((rol)::text = ANY ((ARRAY['ADMIN'::character varying, 'DIRECTIVO'::character varying, 'STAFF'::character varying, 'USUARIO'::character varying])::text[]))),
    CONSTRAINT usuario_telefono_no_vacio CHECK (((telefono IS NULL) OR (btrim((telefono)::text) <> ''::text)))
);


--
-- Name: COLUMN usuario.debe_cambiar_password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.debe_cambiar_password IS 'TRUE cuando la contraseña la generó administración y la persona todavía no la cambió. Bloquea el resto del sistema hasta que lo haga.';


--
-- Name: COLUMN usuario.password_temporal_desde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.password_temporal_desde IS 'Cuando se genero la contrasena temporal vigente. NULL si la persona ya eligio la suya. Ver V8.';


--
-- Name: COLUMN usuario.credenciales_desde; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuario.credenciales_desde IS 'V38: los tokens firmados antes de este instante no valen. Lo escriben el cambio y el reseteo de la contrasena. NULL = nunca se cerraron sesiones.';


--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.usuario ALTER COLUMN id_usuario ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.usuario_id_usuario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: venta_equipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venta_equipo (
    id_venta bigint NOT NULL,
    id_usuario_comprador bigint,
    nombre_comprador_externo character varying(150),
    contacto_comprador_externo character varying(150),
    id_usuario_vendedor bigint NOT NULL,
    categoria character varying(50),
    marca character varying(100),
    modelo_equipo character varying(150) NOT NULL,
    precio numeric(14,2) NOT NULL,
    moneda character varying(3) DEFAULT 'ARS'::character varying NOT NULL,
    cotizacion_dolar numeric(14,4),
    fecha_venta date DEFAULT CURRENT_DATE NOT NULL,
    notas text,
    fecha_registro timestamp with time zone DEFAULT now() NOT NULL,
    anulada boolean DEFAULT false NOT NULL,
    id_usuario_anula bigint,
    fecha_anulacion timestamp with time zone,
    motivo_anulacion text,
    CONSTRAINT venta_anulacion_justificada CHECK (((NOT anulada) OR ((id_usuario_anula IS NOT NULL) AND (fecha_anulacion IS NOT NULL) AND (COALESCE(btrim(motivo_anulacion), ''::text) <> ''::text)))),
    CONSTRAINT venta_comprador_identificado CHECK (((id_usuario_comprador IS NOT NULL) OR (nombre_comprador_externo IS NOT NULL))),
    CONSTRAINT venta_cotizacion_positiva CHECK (((cotizacion_dolar IS NULL) OR (cotizacion_dolar > (0)::numeric))),
    CONSTRAINT venta_moneda_valida CHECK (((moneda)::text = ANY ((ARRAY['ARS'::character varying, 'USD'::character varying])::text[]))),
    CONSTRAINT venta_precio_no_negativo CHECK ((precio >= (0)::numeric)),
    CONSTRAINT venta_usd_con_cotizacion CHECK ((((moneda)::text <> 'USD'::text) OR (cotizacion_dolar IS NOT NULL)))
);


--
-- Name: venta_equipo_id_venta_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.venta_equipo ALTER COLUMN id_venta ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.venta_equipo_id_venta_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: alumno alumno_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumno
    ADD CONSTRAINT alumno_id_usuario_key UNIQUE (id_usuario);


--
-- Name: alumno alumno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumno
    ADD CONSTRAINT alumno_pkey PRIMARY KEY (id_alumno);


--
-- Name: aparicion_release aparicion_release_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aparicion_release
    ADD CONSTRAINT aparicion_release_pkey PRIMARY KEY (id_aparicion);


--
-- Name: artista artista_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artista
    ADD CONSTRAINT artista_pkey PRIMARY KEY (id_artista);


--
-- Name: bloqueo_sala bloqueo_sala_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bloqueo_sala
    ADD CONSTRAINT bloqueo_sala_pkey PRIMARY KEY (id_bloqueo);


--
-- Name: bloqueo_sala bloqueo_sin_solapamiento; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bloqueo_sala
    ADD CONSTRAINT bloqueo_sin_solapamiento EXCLUDE USING gist (id_sala WITH =, dias WITH &&, franja WITH &&);


--
-- Name: CONSTRAINT bloqueo_sin_solapamiento ON bloqueo_sala; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT bloqueo_sin_solapamiento ON public.bloqueo_sala IS 'Dos dimensiones (rango de fechas Y franja horaria) porque un bloqueo es una franja que se repite cada dia del rango, no un intervalo continuo. Ver V7 §3.';


--
-- Name: cancion_release cancion_orden_unico; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancion_release
    ADD CONSTRAINT cancion_orden_unico UNIQUE (id_release, orden) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: cancion_release cancion_release_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancion_release
    ADD CONSTRAINT cancion_release_pkey PRIMARY KEY (id_cancion);


--
-- Name: comprobante_pago comprobante_archivo_unico; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_pago
    ADD CONSTRAINT comprobante_archivo_unico UNIQUE (archivo_path);


--
-- Name: comprobante_egreso comprobante_egreso_archivo_unico; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_egreso
    ADD CONSTRAINT comprobante_egreso_archivo_unico UNIQUE (archivo_path);


--
-- Name: comprobante_egreso comprobante_egreso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_egreso
    ADD CONSTRAINT comprobante_egreso_pkey PRIMARY KEY (id_comprobante);


--
-- Name: comprobante_pago comprobante_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_pago
    ADD CONSTRAINT comprobante_pago_pkey PRIMARY KEY (id_comprobante);


--
-- Name: contrato_sello contrato_sello_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_sello
    ADD CONSTRAINT contrato_sello_pkey PRIMARY KEY (id_contrato);


--
-- Name: egreso egreso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.egreso
    ADD CONSTRAINT egreso_pkey PRIMARY KEY (id_egreso);


--
-- Name: inscripcion_integrante inscripcion_integrante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscripcion_integrante
    ADD CONSTRAINT inscripcion_integrante_pkey PRIMARY KEY (id_integrante);


--
-- Name: inscripcion inscripcion_numero_grupo_unico; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscripcion
    ADD CONSTRAINT inscripcion_numero_grupo_unico UNIQUE (numero_grupo);


--
-- Name: inscripcion inscripcion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscripcion
    ADD CONSTRAINT inscripcion_pkey PRIMARY KEY (id_inscripcion);


--
-- Name: inscripcion_integrante integrante_unico_por_inscripcion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscripcion_integrante
    ADD CONSTRAINT integrante_unico_por_inscripcion UNIQUE (id_inscripcion, id_alumno);


--
-- Name: material material_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material
    ADD CONSTRAINT material_pkey PRIMARY KEY (id_material);


--
-- Name: nota_profesor nota_profesor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nota_profesor
    ADD CONSTRAINT nota_profesor_pkey PRIMARY KEY (id_nota);


--
-- Name: notificacion notificacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion
    ADD CONSTRAINT notificacion_pkey PRIMARY KEY (id_notificacion);


--
-- Name: pago pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_pkey PRIMARY KEY (id_pago);


--
-- Name: reserva_participante participante_unico_por_reserva; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_participante
    ADD CONSTRAINT participante_unico_por_reserva UNIQUE (id_reserva, id_usuario);


--
-- Name: profesor profesor_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT profesor_id_usuario_key UNIQUE (id_usuario);


--
-- Name: profesor profesor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT profesor_pkey PRIMARY KEY (id_profesor);


--
-- Name: programa programa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa
    ADD CONSTRAINT programa_pkey PRIMARY KEY (id_programa);


--
-- Name: programa programa_una_por_disciplina; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programa
    ADD CONSTRAINT programa_una_por_disciplina UNIQUE (disciplina);


--
-- Name: release release_codigo_release_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release
    ADD CONSTRAINT release_codigo_release_key UNIQUE (codigo_release);


--
-- Name: release release_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release
    ADD CONSTRAINT release_pkey PRIMARY KEY (id_release);


--
-- Name: reserva_participante reserva_participante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_participante
    ADD CONSTRAINT reserva_participante_pkey PRIMARY KEY (id_participacion);


--
-- Name: reserva reserva_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_pkey PRIMARY KEY (id_reserva);


--
-- Name: reserva reserva_profesor_sin_solapamiento; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_profesor_sin_solapamiento EXCLUDE USING gist (id_profesor WITH =, periodo WITH &&) WHERE (((estado)::text <> ALL ((ARRAY['CANCELADA'::character varying, 'REPROGRAMADA'::character varying])::text[])));


--
-- Name: reserva reserva_sin_solapamiento; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_sin_solapamiento EXCLUDE USING gist (id_sala WITH =, periodo WITH &&) WHERE (((estado)::text <> ALL ((ARRAY['CANCELADA'::character varying, 'REPROGRAMADA'::character varying])::text[])));


--
-- Name: sala sala_nombre_sala_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sala
    ADD CONSTRAINT sala_nombre_sala_key UNIQUE (nombre_sala);


--
-- Name: sala sala_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sala
    ADD CONSTRAINT sala_pkey PRIMARY KEY (id_sala);


--
-- Name: sala_tipo_uso sala_tipo_uso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sala_tipo_uso
    ADD CONSTRAINT sala_tipo_uso_pkey PRIMARY KEY (id_sala, id_tipo_uso);


--
-- Name: seguimiento_alumno seguimiento_alumno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimiento_alumno
    ADD CONSTRAINT seguimiento_alumno_pkey PRIMARY KEY (id_seguimiento);


--
-- Name: seguimiento_alumno seguimiento_unico; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimiento_alumno
    ADD CONSTRAINT seguimiento_unico UNIQUE (id_profesor, id_alumno);


--
-- Name: solicitante_companero solicitante_companero_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitante_companero
    ADD CONSTRAINT solicitante_companero_pkey PRIMARY KEY (id_companero);


--
-- Name: solicitante solicitante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitante
    ADD CONSTRAINT solicitante_pkey PRIMARY KEY (id_solicitante);


--
-- Name: solicitud_reprogramacion solicitud_reprogramacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_reprogramacion
    ADD CONSTRAINT solicitud_reprogramacion_pkey PRIMARY KEY (id_solicitud);


--
-- Name: solicitud_reserva solicitud_reserva_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_pkey PRIMARY KEY (id_solicitud_reserva);


--
-- Name: tipo_uso tipo_uso_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_uso
    ADD CONSTRAINT tipo_uso_codigo_key UNIQUE (codigo);


--
-- Name: tipo_uso tipo_uso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipo_uso
    ADD CONSTRAINT tipo_uso_pkey PRIMARY KEY (id_tipo_uso);


--
-- Name: trabajo_mastering trabajo_mastering_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trabajo_mastering
    ADD CONSTRAINT trabajo_mastering_pkey PRIMARY KEY (id_trabajo);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);


--
-- Name: venta_equipo venta_equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_equipo
    ADD CONSTRAINT venta_equipo_pkey PRIMARY KEY (id_venta);


--
-- Name: aparicion_por_release; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aparicion_por_release ON public.aparicion_release USING btree (id_release, orden_relevancia, fecha DESC);


--
-- Name: artista_usuario_unico; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX artista_usuario_unico ON public.artista USING btree (id_usuario) WHERE (id_usuario IS NOT NULL);


--
-- Name: cancion_por_release; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cancion_por_release ON public.cancion_release USING btree (id_release, orden);


--
-- Name: companero_por_ficha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companero_por_ficha ON public.solicitante_companero USING btree (id_solicitante);


--
-- Name: comprobante_egreso_por_egreso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comprobante_egreso_por_egreso ON public.comprobante_egreso USING btree (id_egreso, id_comprobante);


--
-- Name: comprobante_por_pago; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX comprobante_por_pago ON public.comprobante_pago USING btree (id_pago, id_comprobante);


--
-- Name: contrato_por_artista; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contrato_por_artista ON public.contrato_sello USING btree (id_artista);


--
-- Name: contrato_por_release; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contrato_por_release ON public.contrato_sello USING btree (id_release);


--
-- Name: inscripcion_por_profesor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inscripcion_por_profesor ON public.inscripcion USING btree (id_profesor) WHERE ((estado)::text = 'ACTIVA'::text);


--
-- Name: inscripcion_un_solo_referente; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX inscripcion_un_solo_referente ON public.inscripcion_integrante USING btree (id_inscripcion) WHERE referente;


--
-- Name: integrante_por_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integrante_por_alumno ON public.inscripcion_integrante USING btree (id_alumno);


--
-- Name: material_por_inscripcion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX material_por_inscripcion ON public.material USING btree (id_inscripcion);


--
-- Name: material_por_reserva; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX material_por_reserva ON public.material USING btree (id_reserva) WHERE (id_reserva IS NOT NULL);


--
-- Name: nota_por_alumno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nota_por_alumno ON public.nota_profesor USING btree (id_alumno);


--
-- Name: notificacion_clave_evento_unica; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notificacion_clave_evento_unica ON public.notificacion USING btree (id_usuario_destino, clave_evento) WHERE (clave_evento IS NOT NULL);


--
-- Name: INDEX notificacion_clave_evento_unica; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.notificacion_clave_evento_unica IS 'La autoridad de la deduplicación. Preguntar antes de insertar no alcanza y este proyecto ya lo midió con el email de usuario: entre la pregunta y la respuesta se mete otra corrida. El servicio igual pregunta primero, pero para no intentar cien inserts que ya están; quien garantiza es este índice.';


--
-- Name: notificacion_no_leidas; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificacion_no_leidas ON public.notificacion USING btree (id_usuario_destino) WHERE (NOT leida);


--
-- Name: pago_deudores; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pago_deudores ON public.pago USING btree (estado_pago) WHERE ((estado_pago)::text = ANY ((ARRAY['DEBE'::character varying, 'VENCIDO'::character varying])::text[]));


--
-- Name: pago_por_inscripcion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pago_por_inscripcion ON public.pago USING btree (id_inscripcion) WHERE (id_inscripcion IS NOT NULL);


--
-- Name: pago_por_trabajo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pago_por_trabajo ON public.pago USING btree (id_trabajo_mastering) WHERE (id_trabajo_mastering IS NOT NULL);


--
-- Name: pago_por_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pago_por_usuario ON public.pago USING btree (id_usuario, fecha_pago);


--
-- Name: participante_por_inscripcion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX participante_por_inscripcion ON public.reserva_participante USING btree (id_inscripcion);


--
-- Name: participante_por_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX participante_por_usuario ON public.reserva_participante USING btree (id_usuario);


--
-- Name: release_por_artista; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX release_por_artista ON public.release USING btree (id_artista);


--
-- Name: reserva_por_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reserva_por_fecha ON public.reserva USING btree (fecha);


--
-- Name: reserva_por_profesor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reserva_por_profesor ON public.reserva USING btree (id_profesor, fecha);


--
-- Name: reserva_por_sala_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reserva_por_sala_fecha ON public.reserva USING btree (id_sala, fecha);


--
-- Name: reserva_recupera_una_sola_vez; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reserva_recupera_una_sola_vez ON public.reserva USING btree (id_reserva_recupera) WHERE (id_reserva_recupera IS NOT NULL);


--
-- Name: solicitante_abiertos; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX solicitante_abiertos ON public.solicitante USING btree (fecha_creacion) WHERE ((estado)::text <> 'DESCARTADO'::text);


--
-- Name: solicitante_por_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX solicitante_por_email ON public.solicitante USING btree (lower((email)::text));


--
-- Name: solicitud_pendientes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX solicitud_pendientes ON public.solicitud_reprogramacion USING btree (fecha_solicitud) WHERE ((estado)::text = 'PENDIENTE'::text);


--
-- Name: solicitud_reserva_pendientes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX solicitud_reserva_pendientes ON public.solicitud_reserva USING btree (fecha, hora_inicio) WHERE ((estado)::text = 'PENDIENTE'::text);


--
-- Name: solicitud_reserva_por_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX solicitud_reserva_por_usuario ON public.solicitud_reserva USING btree (id_usuario, fecha_creacion DESC);


--
-- Name: trabajo_por_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trabajo_por_estado ON public.trabajo_mastering USING btree (estado);


--
-- Name: usuario_email_unico; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usuario_email_unico ON public.usuario USING btree (lower((email)::text));


--
-- Name: usuario_orden_alfabetico; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usuario_orden_alfabetico ON public.usuario USING btree (lower((apellido)::text), lower((nombre)::text));


--
-- Name: usuario_telefono_unico; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usuario_telefono_unico ON public.usuario USING btree (telefono) WHERE (telefono IS NOT NULL);


--
-- Name: bloqueo_sala bloqueo_sin_reservas_activas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER bloqueo_sin_reservas_activas BEFORE INSERT OR UPDATE ON public.bloqueo_sala FOR EACH ROW EXECUTE FUNCTION public.verificar_bloqueo_sin_reservas();


--
-- Name: cancion_release cancion_solo_en_ep_o_album; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER cancion_solo_en_ep_o_album BEFORE INSERT OR UPDATE ON public.cancion_release FOR EACH ROW EXECUTE FUNCTION public.verificar_que_el_release_lleva_temas();


--
-- Name: cancion_release cancion_sostiene_release_publicado; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER cancion_sostiene_release_publicado BEFORE DELETE OR UPDATE ON public.cancion_release FOR EACH ROW EXECUTE FUNCTION public.proteger_temas_de_release_publicado();


--
-- Name: solicitante_companero companero_hasta_dos_en_un_curso; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER companero_hasta_dos_en_un_curso BEFORE INSERT ON public.solicitante_companero FOR EACH ROW EXECUTE FUNCTION public.verificar_companero_de_ficha();


--
-- Name: solicitante_companero companero_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER companero_no_se_borra BEFORE DELETE ON public.solicitante_companero FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();


--
-- Name: comprobante_egreso comprobante_egreso_es_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER comprobante_egreso_es_inmutable BEFORE UPDATE ON public.comprobante_egreso FOR EACH ROW EXECUTE FUNCTION public.verificar_inmutabilidad_del_comprobante_de_egreso();


--
-- Name: comprobante_egreso comprobante_egreso_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER comprobante_egreso_no_se_borra BEFORE DELETE ON public.comprobante_egreso FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();


--
-- Name: comprobante_pago comprobante_es_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER comprobante_es_inmutable BEFORE UPDATE ON public.comprobante_pago FOR EACH ROW EXECUTE FUNCTION public.verificar_inmutabilidad_del_comprobante();


--
-- Name: comprobante_pago comprobante_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER comprobante_no_se_borra BEFORE DELETE ON public.comprobante_pago FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();


--
-- Name: contrato_sello contrato_sostiene_release; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER contrato_sostiene_release BEFORE DELETE OR UPDATE ON public.contrato_sello FOR EACH ROW EXECUTE FUNCTION public.proteger_contrato_de_release_publicado();


--
-- Name: egreso egreso_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER egreso_no_se_borra BEFORE DELETE ON public.egreso FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();


--
-- Name: inscripcion inscripcion_con_integrantes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER inscripcion_con_integrantes AFTER INSERT ON public.inscripcion DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.verificar_integrantes_al_commit();


--
-- Name: inscripcion inscripcion_escalera_de_preinscripcion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inscripcion_escalera_de_preinscripcion BEFORE UPDATE ON public.inscripcion FOR EACH ROW EXECUTE FUNCTION public.verificar_escalera_de_preinscripcion();


--
-- Name: inscripcion inscripcion_moneda_con_plata_adentro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inscripcion_moneda_con_plata_adentro BEFORE UPDATE OF moneda ON public.inscripcion FOR EACH ROW EXECUTE FUNCTION public.verificar_cambio_de_moneda_con_plata_adentro('id_inscripcion', 'id_inscripcion');


--
-- Name: inscripcion inscripcion_nivel_no_retrocede_sin_firma; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inscripcion_nivel_no_retrocede_sin_firma BEFORE UPDATE ON public.inscripcion FOR EACH ROW EXECUTE FUNCTION public.verificar_baja_de_nivel_firmada();


--
-- Name: inscripcion inscripcion_sin_otra_abierta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER inscripcion_sin_otra_abierta AFTER UPDATE OF estado, disciplina ON public.inscripcion FOR EACH ROW EXECUTE FUNCTION public.verificar_inscripcion_al_abrirse();


--
-- Name: inscripcion_integrante integrante_deja_el_grupo_coherente; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER integrante_deja_el_grupo_coherente AFTER INSERT OR UPDATE ON public.inscripcion_integrante DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.verificar_integrantes_al_commit();


--
-- Name: inscripcion_integrante integrante_hasta_tres; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER integrante_hasta_tres BEFORE INSERT ON public.inscripcion_integrante FOR EACH ROW EXECUTE FUNCTION public.verificar_tamanio_del_grupo();


--
-- Name: inscripcion_integrante integrante_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER integrante_no_se_borra BEFORE DELETE ON public.inscripcion_integrante FOR EACH ROW EXECUTE FUNCTION public.prohibir_cambio_de_integrantes();


--
-- Name: inscripcion_integrante integrante_no_se_cambia; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER integrante_no_se_cambia BEFORE UPDATE OF id_inscripcion, id_alumno, referente ON public.inscripcion_integrante FOR EACH ROW EXECUTE FUNCTION public.prohibir_cambio_de_integrantes();


--
-- Name: inscripcion_integrante integrante_sin_otra_abierta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER integrante_sin_otra_abierta BEFORE INSERT ON public.inscripcion_integrante FOR EACH ROW EXECUTE FUNCTION public.verificar_integrante_sin_otra_abierta();


--
-- Name: material material_clase_del_curso; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER material_clase_del_curso BEFORE INSERT OR UPDATE OF id_reserva, id_inscripcion ON public.material FOR EACH ROW EXECUTE FUNCTION public.material_clase_del_curso();


--
-- Name: nota_profesor nota_coherente_con_alumno; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER nota_coherente_con_alumno BEFORE INSERT OR UPDATE ON public.nota_profesor FOR EACH ROW EXECUTE FUNCTION public.verificar_nota_del_alumno();


--
-- Name: pago pago_edicion_con_autor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pago_edicion_con_autor BEFORE UPDATE ON public.pago FOR EACH ROW WHEN (((old.monto IS DISTINCT FROM new.monto) OR ((old.moneda)::text IS DISTINCT FROM (new.moneda)::text) OR (old.cotizacion_dolar IS DISTINCT FROM new.cotizacion_dolar) OR ((old.medio_pago)::text IS DISTINCT FROM (new.medio_pago)::text) OR (old.descuento_porcentaje IS DISTINCT FROM new.descuento_porcentaje) OR (old.fecha_pago IS DISTINCT FROM new.fecha_pago) OR (old.id_usuario IS DISTINCT FROM new.id_usuario) OR (old.id_inscripcion IS DISTINCT FROM new.id_inscripcion) OR (old.id_reserva IS DISTINCT FROM new.id_reserva) OR (old.id_trabajo_mastering IS DISTINCT FROM new.id_trabajo_mastering) OR (old.id_venta_equipo IS DISTINCT FROM new.id_venta_equipo))) EXECUTE FUNCTION public.exigir_autor_de_la_edicion();


--
-- Name: pago pago_en_la_moneda_de_la_reserva; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pago_en_la_moneda_de_la_reserva BEFORE INSERT OR UPDATE OF moneda, id_reserva ON public.pago FOR EACH ROW EXECUTE FUNCTION public.verificar_moneda_del_pago_de_reserva();


--
-- Name: pago pago_en_la_moneda_del_contrato; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pago_en_la_moneda_del_contrato BEFORE INSERT OR UPDATE OF moneda, id_inscripcion ON public.pago FOR EACH ROW EXECUTE FUNCTION public.verificar_moneda_del_pago_de_inscripcion();


--
-- Name: pago pago_en_la_moneda_del_trabajo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pago_en_la_moneda_del_trabajo BEFORE INSERT OR UPDATE OF moneda, id_trabajo_mastering ON public.pago FOR EACH ROW EXECUTE FUNCTION public.verificar_moneda_del_pago_de_trabajo();


--
-- Name: pago pago_no_deja_la_reserva_sin_plata; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pago_no_deja_la_reserva_sin_plata AFTER UPDATE ON public.pago FOR EACH ROW EXECUTE FUNCTION public.verificar_pago_al_anular();


--
-- Name: pago pago_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pago_no_se_borra BEFORE DELETE ON public.pago FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();


--
-- Name: pago pago_sostiene_premaster; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pago_sostiene_premaster BEFORE DELETE OR UPDATE ON public.pago FOR EACH ROW EXECUTE FUNCTION public.proteger_pago_de_premaster();


--
-- Name: TRIGGER pago_sostiene_premaster ON pago; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER pago_sostiene_premaster ON public.pago IS 'Impide anular o borrar el pago que habilito la liberacion de un premaster. Ver V6 §6.';


--
-- Name: reserva_participante participante_edicion_con_autor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER participante_edicion_con_autor BEFORE UPDATE ON public.reserva_participante FOR EACH ROW WHEN (((old.estado_asistencia)::text IS DISTINCT FROM (new.estado_asistencia)::text)) EXECUTE FUNCTION public.exigir_autor_de_la_edicion();


--
-- Name: TRIGGER participante_edicion_con_autor ON reserva_participante; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TRIGGER participante_edicion_con_autor ON public.reserva_participante IS 'Cambiar la asistencia decide cuantas clases le quedan al alumno: exige autor. Ver V7 §2.';


--
-- Name: reserva_participante participante_en_una_sola_sala; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER participante_en_una_sola_sala BEFORE INSERT OR UPDATE ON public.reserva_participante FOR EACH ROW EXECUTE FUNCTION public.verificar_persona_sin_solapamiento();


--
-- Name: reserva_participante participante_inscripcion_coherente; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER participante_inscripcion_coherente BEFORE INSERT OR UPDATE ON public.reserva_participante FOR EACH ROW EXECUTE FUNCTION public.verificar_inscripcion_del_participante();


--
-- Name: reserva_participante participante_no_excede_clases_contratadas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER participante_no_excede_clases_contratadas BEFORE INSERT OR UPDATE ON public.reserva_participante FOR EACH ROW EXECUTE FUNCTION public.verificar_clases_contratadas();


--
-- Name: reserva_participante participante_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER participante_no_se_borra BEFORE DELETE ON public.reserva_participante FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();


--
-- Name: trabajo_mastering premaster_requiere_pago; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER premaster_requiere_pago BEFORE INSERT OR UPDATE ON public.trabajo_mastering FOR EACH ROW EXECUTE FUNCTION public.verificar_liberacion_premaster();


--
-- Name: programa programa_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER programa_no_se_borra BEFORE DELETE ON public.programa FOR EACH ROW EXECUTE FUNCTION public.programa_no_se_borra();


--
-- Name: release release_estado_solo_avanza; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER release_estado_solo_avanza BEFORE UPDATE ON public.release FOR EACH ROW EXECUTE FUNCTION public.verificar_avance_estado_release();


--
-- Name: release release_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER release_no_se_borra BEFORE DELETE ON public.release FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();


--
-- Name: release release_requiere_contrato; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER release_requiere_contrato BEFORE INSERT OR UPDATE ON public.release FOR EACH ROW EXECUTE FUNCTION public.verificar_publicacion_con_contrato();


--
-- Name: release release_respeta_el_rango_de_temas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER release_respeta_el_rango_de_temas BEFORE INSERT OR UPDATE ON public.release FOR EACH ROW EXECUTE FUNCTION public.verificar_rango_de_temas();


--
-- Name: release release_tipo_admite_los_temas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER release_tipo_admite_los_temas BEFORE UPDATE ON public.release FOR EACH ROW EXECUTE FUNCTION public.verificar_que_el_tipo_admite_los_temas();


--
-- Name: reserva reserva_al_moverse_respeta_participantes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reserva_al_moverse_respeta_participantes AFTER UPDATE OF fecha, hora_inicio, hora_fin ON public.reserva FOR EACH ROW WHEN (((old.fecha IS DISTINCT FROM new.fecha) OR (old.hora_inicio IS DISTINCT FROM new.hora_inicio) OR (old.hora_fin IS DISTINCT FROM new.hora_fin))) EXECUTE FUNCTION public.verificar_participantes_al_mover_reserva();


--
-- Name: reserva reserva_al_reactivarse_respeta_contratadas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reserva_al_reactivarse_respeta_contratadas AFTER UPDATE OF estado ON public.reserva FOR EACH ROW WHEN (((old.estado)::text IS DISTINCT FROM (new.estado)::text)) EXECUTE FUNCTION public.verificar_clases_al_reactivar_reserva();


--
-- Name: reserva reserva_con_sena; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER reserva_con_sena AFTER INSERT ON public.reserva DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.verificar_sena_de_la_reserva();


--
-- Name: reserva reserva_edicion_con_autor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reserva_edicion_con_autor BEFORE UPDATE ON public.reserva FOR EACH ROW WHEN ((((old.estado)::text IS DISTINCT FROM (new.estado)::text) OR (old.fecha IS DISTINCT FROM new.fecha) OR (old.hora_inicio IS DISTINCT FROM new.hora_inicio) OR (old.hora_fin IS DISTINCT FROM new.hora_fin) OR (old.id_sala IS DISTINCT FROM new.id_sala))) EXECUTE FUNCTION public.exigir_autor_de_la_edicion();


--
-- Name: reserva reserva_en_sala_activa; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reserva_en_sala_activa BEFORE INSERT OR UPDATE ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.verificar_sala_activa();


--
-- Name: reserva reserva_escalera_de_preconfirmacion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reserva_escalera_de_preconfirmacion BEFORE UPDATE ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.verificar_escalera_de_preconfirmacion();


--
-- Name: reserva reserva_moneda_con_plata_adentro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reserva_moneda_con_plata_adentro BEFORE UPDATE OF moneda ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.verificar_cambio_de_moneda_con_plata_adentro('id_reserva', 'id_reserva');


--
-- Name: reserva reserva_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reserva_no_se_borra BEFORE DELETE ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();


--
-- Name: reserva reserva_reactivada_con_sena; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reserva_reactivada_con_sena AFTER UPDATE ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.verificar_sena_al_reactivar_reserva();


--
-- Name: reserva reserva_respeta_bloqueos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reserva_respeta_bloqueos BEFORE INSERT OR UPDATE ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.verificar_sala_no_bloqueada();


--
-- Name: seguimiento_alumno seguimiento_sella_su_cambio; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER seguimiento_sella_su_cambio BEFORE UPDATE ON public.seguimiento_alumno FOR EACH ROW EXECUTE FUNCTION public.sellar_cambio_de_seguimiento();


--
-- Name: solicitante solicitante_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER solicitante_no_se_borra BEFORE DELETE ON public.solicitante FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();


--
-- Name: solicitante solicitante_resuelto_es_final; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER solicitante_resuelto_es_final BEFORE UPDATE ON public.solicitante FOR EACH ROW EXECUTE FUNCTION public.solicitud_resuelta_es_final();


--
-- Name: solicitud_reprogramacion solicitud_reprogramacion_resuelta_es_final; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER solicitud_reprogramacion_resuelta_es_final BEFORE UPDATE ON public.solicitud_reprogramacion FOR EACH ROW EXECUTE FUNCTION public.solicitud_resuelta_es_final();


--
-- Name: solicitud_reserva solicitud_reserva_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER solicitud_reserva_no_se_borra BEFORE DELETE ON public.solicitud_reserva FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();


--
-- Name: solicitud_reserva solicitud_reserva_resuelta_es_final; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER solicitud_reserva_resuelta_es_final BEFORE UPDATE ON public.solicitud_reserva FOR EACH ROW EXECUTE FUNCTION public.solicitud_resuelta_es_final();


--
-- Name: solicitud_reserva solicitud_reserva_uso_solicitable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER solicitud_reserva_uso_solicitable BEFORE INSERT OR UPDATE OF id_tipo_uso ON public.solicitud_reserva FOR EACH ROW EXECUTE FUNCTION public.verificar_uso_solicitable();


--
-- Name: trabajo_mastering trabajo_estado_solo_avanza; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trabajo_estado_solo_avanza BEFORE UPDATE ON public.trabajo_mastering FOR EACH ROW EXECUTE FUNCTION public.verificar_avance_estado_trabajo();


--
-- Name: trabajo_mastering trabajo_moneda_con_plata_adentro; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trabajo_moneda_con_plata_adentro BEFORE UPDATE OF moneda ON public.trabajo_mastering FOR EACH ROW EXECUTE FUNCTION public.verificar_cambio_de_moneda_con_plata_adentro('id_trabajo_mastering', 'id_trabajo');


--
-- Name: trabajo_mastering trabajo_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trabajo_no_se_borra BEFORE DELETE ON public.trabajo_mastering FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();


--
-- Name: venta_equipo venta_no_se_borra; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER venta_no_se_borra BEFORE DELETE ON public.venta_equipo FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();


--
-- Name: alumno alumno_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumno
    ADD CONSTRAINT alumno_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: aparicion_release aparicion_release_id_release_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aparicion_release
    ADD CONSTRAINT aparicion_release_id_release_fkey FOREIGN KEY (id_release) REFERENCES public.release(id_release);


--
-- Name: aparicion_release aparicion_release_id_usuario_carga_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aparicion_release
    ADD CONSTRAINT aparicion_release_id_usuario_carga_fkey FOREIGN KEY (id_usuario_carga) REFERENCES public.usuario(id_usuario);


--
-- Name: artista artista_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artista
    ADD CONSTRAINT artista_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: bloqueo_sala bloqueo_sala_id_sala_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bloqueo_sala
    ADD CONSTRAINT bloqueo_sala_id_sala_fkey FOREIGN KEY (id_sala) REFERENCES public.sala(id_sala);


--
-- Name: bloqueo_sala bloqueo_sala_id_usuario_registra_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bloqueo_sala
    ADD CONSTRAINT bloqueo_sala_id_usuario_registra_fkey FOREIGN KEY (id_usuario_registra) REFERENCES public.usuario(id_usuario);


--
-- Name: cancion_release cancion_release_id_release_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancion_release
    ADD CONSTRAINT cancion_release_id_release_fkey FOREIGN KEY (id_release) REFERENCES public.release(id_release);


--
-- Name: comprobante_egreso comprobante_egreso_id_egreso_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_egreso
    ADD CONSTRAINT comprobante_egreso_id_egreso_fkey FOREIGN KEY (id_egreso) REFERENCES public.egreso(id_egreso);


--
-- Name: comprobante_egreso comprobante_egreso_id_usuario_carga_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_egreso
    ADD CONSTRAINT comprobante_egreso_id_usuario_carga_fkey FOREIGN KEY (id_usuario_carga) REFERENCES public.usuario(id_usuario);


--
-- Name: comprobante_egreso comprobante_egreso_id_usuario_invalida_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_egreso
    ADD CONSTRAINT comprobante_egreso_id_usuario_invalida_fkey FOREIGN KEY (id_usuario_invalida) REFERENCES public.usuario(id_usuario);


--
-- Name: comprobante_pago comprobante_pago_id_pago_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_pago
    ADD CONSTRAINT comprobante_pago_id_pago_fkey FOREIGN KEY (id_pago) REFERENCES public.pago(id_pago);


--
-- Name: comprobante_pago comprobante_pago_id_usuario_carga_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_pago
    ADD CONSTRAINT comprobante_pago_id_usuario_carga_fkey FOREIGN KEY (id_usuario_carga) REFERENCES public.usuario(id_usuario);


--
-- Name: comprobante_pago comprobante_pago_id_usuario_invalida_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprobante_pago
    ADD CONSTRAINT comprobante_pago_id_usuario_invalida_fkey FOREIGN KEY (id_usuario_invalida) REFERENCES public.usuario(id_usuario);


--
-- Name: contrato_sello contrato_sello_id_artista_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_sello
    ADD CONSTRAINT contrato_sello_id_artista_fkey FOREIGN KEY (id_artista) REFERENCES public.artista(id_artista);


--
-- Name: contrato_sello contrato_sello_id_release_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contrato_sello
    ADD CONSTRAINT contrato_sello_id_release_fkey FOREIGN KEY (id_release) REFERENCES public.release(id_release);


--
-- Name: egreso egreso_id_usuario_anula_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.egreso
    ADD CONSTRAINT egreso_id_usuario_anula_fkey FOREIGN KEY (id_usuario_anula) REFERENCES public.usuario(id_usuario);


--
-- Name: egreso egreso_id_usuario_destino_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.egreso
    ADD CONSTRAINT egreso_id_usuario_destino_fkey FOREIGN KEY (id_usuario_destino) REFERENCES public.usuario(id_usuario);


--
-- Name: egreso egreso_id_usuario_registra_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.egreso
    ADD CONSTRAINT egreso_id_usuario_registra_fkey FOREIGN KEY (id_usuario_registra) REFERENCES public.usuario(id_usuario);


--
-- Name: inscripcion inscripcion_id_profesor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscripcion
    ADD CONSTRAINT inscripcion_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id_profesor);


--
-- Name: inscripcion inscripcion_id_usuario_baja_nivel_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscripcion
    ADD CONSTRAINT inscripcion_id_usuario_baja_nivel_fkey FOREIGN KEY (id_usuario_baja_nivel) REFERENCES public.usuario(id_usuario);


--
-- Name: inscripcion_integrante inscripcion_integrante_id_alumno_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscripcion_integrante
    ADD CONSTRAINT inscripcion_integrante_id_alumno_fkey FOREIGN KEY (id_alumno) REFERENCES public.alumno(id_alumno);


--
-- Name: inscripcion_integrante inscripcion_integrante_id_inscripcion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscripcion_integrante
    ADD CONSTRAINT inscripcion_integrante_id_inscripcion_fkey FOREIGN KEY (id_inscripcion) REFERENCES public.inscripcion(id_inscripcion);


--
-- Name: material material_id_inscripcion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material
    ADD CONSTRAINT material_id_inscripcion_fkey FOREIGN KEY (id_inscripcion) REFERENCES public.inscripcion(id_inscripcion);


--
-- Name: material material_id_profesor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material
    ADD CONSTRAINT material_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id_profesor);


--
-- Name: material material_id_reserva_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material
    ADD CONSTRAINT material_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reserva(id_reserva);


--
-- Name: nota_profesor nota_profesor_id_alumno_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nota_profesor
    ADD CONSTRAINT nota_profesor_id_alumno_fkey FOREIGN KEY (id_alumno) REFERENCES public.alumno(id_alumno);


--
-- Name: nota_profesor nota_profesor_id_participacion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nota_profesor
    ADD CONSTRAINT nota_profesor_id_participacion_fkey FOREIGN KEY (id_participacion) REFERENCES public.reserva_participante(id_participacion);


--
-- Name: nota_profesor nota_profesor_id_profesor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nota_profesor
    ADD CONSTRAINT nota_profesor_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id_profesor);


--
-- Name: notificacion notificacion_id_usuario_destino_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion
    ADD CONSTRAINT notificacion_id_usuario_destino_fkey FOREIGN KEY (id_usuario_destino) REFERENCES public.usuario(id_usuario);


--
-- Name: pago pago_id_inscripcion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_inscripcion_fkey FOREIGN KEY (id_inscripcion) REFERENCES public.inscripcion(id_inscripcion);


--
-- Name: pago pago_id_reserva_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reserva(id_reserva);


--
-- Name: pago pago_id_usuario_anula_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_usuario_anula_fkey FOREIGN KEY (id_usuario_anula) REFERENCES public.usuario(id_usuario);


--
-- Name: pago pago_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: pago pago_id_usuario_modifico_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_usuario_modifico_fkey FOREIGN KEY (id_usuario_modifico) REFERENCES public.usuario(id_usuario);


--
-- Name: pago pago_id_usuario_registra_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_usuario_registra_fkey FOREIGN KEY (id_usuario_registra) REFERENCES public.usuario(id_usuario);


--
-- Name: pago pago_trabajo_mastering_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_trabajo_mastering_fk FOREIGN KEY (id_trabajo_mastering) REFERENCES public.trabajo_mastering(id_trabajo);


--
-- Name: pago pago_venta_equipo_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_venta_equipo_fk FOREIGN KEY (id_venta_equipo) REFERENCES public.venta_equipo(id_venta);


--
-- Name: profesor profesor_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT profesor_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: release release_id_artista_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release
    ADD CONSTRAINT release_id_artista_fkey FOREIGN KEY (id_artista) REFERENCES public.artista(id_artista);


--
-- Name: release release_id_usuario_publica_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release
    ADD CONSTRAINT release_id_usuario_publica_fkey FOREIGN KEY (id_usuario_publica) REFERENCES public.usuario(id_usuario);


--
-- Name: reserva reserva_id_profesor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id_profesor);


--
-- Name: reserva reserva_id_reserva_recupera_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_id_reserva_recupera_fkey FOREIGN KEY (id_reserva_recupera) REFERENCES public.reserva(id_reserva);


--
-- Name: reserva reserva_id_sala_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_id_sala_fkey FOREIGN KEY (id_sala) REFERENCES public.sala(id_sala);


--
-- Name: reserva reserva_id_tipo_uso_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_id_tipo_uso_fkey FOREIGN KEY (id_tipo_uso) REFERENCES public.tipo_uso(id_tipo_uso);


--
-- Name: reserva reserva_id_usuario_creo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_id_usuario_creo_fkey FOREIGN KEY (id_usuario_creo) REFERENCES public.usuario(id_usuario);


--
-- Name: reserva reserva_id_usuario_modifico_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_id_usuario_modifico_fkey FOREIGN KEY (id_usuario_modifico) REFERENCES public.usuario(id_usuario);


--
-- Name: reserva_participante reserva_participante_id_inscripcion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_participante
    ADD CONSTRAINT reserva_participante_id_inscripcion_fkey FOREIGN KEY (id_inscripcion) REFERENCES public.inscripcion(id_inscripcion);


--
-- Name: reserva_participante reserva_participante_id_reserva_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_participante
    ADD CONSTRAINT reserva_participante_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reserva(id_reserva);


--
-- Name: reserva_participante reserva_participante_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_participante
    ADD CONSTRAINT reserva_participante_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: reserva_participante reserva_participante_id_usuario_modifico_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_participante
    ADD CONSTRAINT reserva_participante_id_usuario_modifico_fkey FOREIGN KEY (id_usuario_modifico) REFERENCES public.usuario(id_usuario);


--
-- Name: reserva reserva_uso_permitido_en_sala; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_uso_permitido_en_sala FOREIGN KEY (id_sala, id_tipo_uso) REFERENCES public.sala_tipo_uso(id_sala, id_tipo_uso);


--
-- Name: sala_tipo_uso sala_tipo_uso_id_sala_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sala_tipo_uso
    ADD CONSTRAINT sala_tipo_uso_id_sala_fkey FOREIGN KEY (id_sala) REFERENCES public.sala(id_sala);


--
-- Name: sala_tipo_uso sala_tipo_uso_id_tipo_uso_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sala_tipo_uso
    ADD CONSTRAINT sala_tipo_uso_id_tipo_uso_fkey FOREIGN KEY (id_tipo_uso) REFERENCES public.tipo_uso(id_tipo_uso);


--
-- Name: seguimiento_alumno seguimiento_alumno_id_alumno_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimiento_alumno
    ADD CONSTRAINT seguimiento_alumno_id_alumno_fkey FOREIGN KEY (id_alumno) REFERENCES public.alumno(id_alumno);


--
-- Name: seguimiento_alumno seguimiento_alumno_id_profesor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguimiento_alumno
    ADD CONSTRAINT seguimiento_alumno_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id_profesor);


--
-- Name: solicitante_companero solicitante_companero_id_solicitante_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitante_companero
    ADD CONSTRAINT solicitante_companero_id_solicitante_fkey FOREIGN KEY (id_solicitante) REFERENCES public.solicitante(id_solicitante);


--
-- Name: solicitante solicitante_id_inscripcion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitante
    ADD CONSTRAINT solicitante_id_inscripcion_fkey FOREIGN KEY (id_inscripcion) REFERENCES public.inscripcion(id_inscripcion);


--
-- Name: solicitante solicitante_id_reserva_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitante
    ADD CONSTRAINT solicitante_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reserva(id_reserva);


--
-- Name: solicitante solicitante_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitante
    ADD CONSTRAINT solicitante_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: solicitante solicitante_id_usuario_resuelve_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitante
    ADD CONSTRAINT solicitante_id_usuario_resuelve_fkey FOREIGN KEY (id_usuario_resuelve) REFERENCES public.usuario(id_usuario);


--
-- Name: solicitante solicitante_id_venta_equipo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitante
    ADD CONSTRAINT solicitante_id_venta_equipo_fkey FOREIGN KEY (id_venta_equipo) REFERENCES public.venta_equipo(id_venta);


--
-- Name: solicitud_reprogramacion solicitud_reprogramacion_id_reserva_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_reprogramacion
    ADD CONSTRAINT solicitud_reprogramacion_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reserva(id_reserva);


--
-- Name: solicitud_reprogramacion solicitud_reprogramacion_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_reprogramacion
    ADD CONSTRAINT solicitud_reprogramacion_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: solicitud_reprogramacion solicitud_reprogramacion_id_usuario_resuelve_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_reprogramacion
    ADD CONSTRAINT solicitud_reprogramacion_id_usuario_resuelve_fkey FOREIGN KEY (id_usuario_resuelve) REFERENCES public.usuario(id_usuario);


--
-- Name: solicitud_reserva solicitud_reserva_id_reserva_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reserva(id_reserva);


--
-- Name: solicitud_reserva solicitud_reserva_id_sala_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_id_sala_fkey FOREIGN KEY (id_sala) REFERENCES public.sala(id_sala);


--
-- Name: solicitud_reserva solicitud_reserva_id_tipo_uso_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_id_tipo_uso_fkey FOREIGN KEY (id_tipo_uso) REFERENCES public.tipo_uso(id_tipo_uso);


--
-- Name: solicitud_reserva solicitud_reserva_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: solicitud_reserva solicitud_reserva_id_usuario_resuelve_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_id_usuario_resuelve_fkey FOREIGN KEY (id_usuario_resuelve) REFERENCES public.usuario(id_usuario);


--
-- Name: solicitud_reserva solicitud_reserva_uso_permitido_en_sala; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_uso_permitido_en_sala FOREIGN KEY (id_sala, id_tipo_uso) REFERENCES public.sala_tipo_uso(id_sala, id_tipo_uso);


--
-- Name: trabajo_mastering trabajo_mastering_id_cliente_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trabajo_mastering
    ADD CONSTRAINT trabajo_mastering_id_cliente_usuario_fkey FOREIGN KEY (id_cliente_usuario) REFERENCES public.usuario(id_usuario);


--
-- Name: trabajo_mastering trabajo_mastering_id_profesor_asignado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trabajo_mastering
    ADD CONSTRAINT trabajo_mastering_id_profesor_asignado_fkey FOREIGN KEY (id_profesor_asignado) REFERENCES public.profesor(id_profesor);


--
-- Name: trabajo_mastering trabajo_mastering_id_usuario_libera_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trabajo_mastering
    ADD CONSTRAINT trabajo_mastering_id_usuario_libera_fkey FOREIGN KEY (id_usuario_libera) REFERENCES public.usuario(id_usuario);


--
-- Name: venta_equipo venta_equipo_id_usuario_anula_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_equipo
    ADD CONSTRAINT venta_equipo_id_usuario_anula_fkey FOREIGN KEY (id_usuario_anula) REFERENCES public.usuario(id_usuario);


--
-- Name: venta_equipo venta_equipo_id_usuario_comprador_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_equipo
    ADD CONSTRAINT venta_equipo_id_usuario_comprador_fkey FOREIGN KEY (id_usuario_comprador) REFERENCES public.usuario(id_usuario);


--
-- Name: venta_equipo venta_equipo_id_usuario_vendedor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_equipo
    ADD CONSTRAINT venta_equipo_id_usuario_vendedor_fkey FOREIGN KEY (id_usuario_vendedor) REFERENCES public.usuario(id_usuario);


--
-- PostgreSQL database dump complete
--


