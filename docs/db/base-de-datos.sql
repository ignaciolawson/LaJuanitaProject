

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

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

CREATE TYPE public.rango_horario AS RANGE (
    subtype = time without time zone,
    multirange_type_name = public.rango_horario_multirange
);

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

CREATE FUNCTION public.programa_no_se_borra() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION
        'No se borra un programa: las inscripciones lo nombran por su disciplina '
        'y el alta lee de acá cuántas clases trae. Para sacarlo de la oferta, '
        'programa -> activo = FALSE.';
END; $$;

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

CREATE FUNCTION public.prohibir_cambio_de_integrantes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION
        'Los integrantes de una inscripcion son fijos: no se sacan, no se '
        'cambian y no se agregan despues. Si el grupo cambia, se cancela la '
        'inscripcion y se da de alta la nueva.';
END; $$;

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
        IF NEW.id_release IS NOT DISTINCT FROM OLD.id_release
           AND NEW.id_artista IS NOT DISTINCT FROM OLD.id_artista THEN
            RETURN NEW;
        END IF;
    END IF;

    PERFORM 1 FROM release r
     WHERE r.id_release = OLD.id_release
        OR (OLD.id_release IS NULL AND r.id_artista = OLD.id_artista)
     FOR UPDATE;

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

CREATE FUNCTION public.proteger_pago_de_premaster() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    trabajo        RECORD;
    id_pago_tocado BIGINT;
    id_destino     BIGINT;
    nuevo_estado   TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        id_pago_tocado := OLD.id_pago;
        id_destino     := OLD.id_trabajo_mastering;
        nuevo_estado   := 'ELIMINADO';
    ELSE
        id_pago_tocado := NEW.id_pago;
        nuevo_estado   := NEW.estado_pago;

        IF NEW.estado_pago = 'PAGADO'
           AND OLD.id_trabajo_mastering IS NOT DISTINCT FROM NEW.id_trabajo_mastering THEN
            RETURN NEW;
        END IF;

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
    IF TG_OP = 'UPDATE' AND NEW.id_release IS NOT DISTINCT FROM OLD.id_release THEN
        RETURN NEW;
    END IF;

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

CREATE FUNCTION public.release_tiene_contrato(v_id_release bigint, v_id_artista bigint) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM contrato_sello c
         WHERE c.id_release = v_id_release
            OR (c.id_artista = v_id_artista AND c.id_release IS NULL));
$$;

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
      AND r.estado NOT IN ('CANCELADA', 'REPROGRAMADA');

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF codigo_del_uso = 'MIX_MASTERING' THEN
        RETURN FALSE;
    END IF;

    IF estado_reserva = 'PRECONFIRMADA' THEN
        RETURN NOT EXISTS (SELECT 1 FROM pago
                           WHERE id_reserva = p_id_reserva
                             AND estado_pago <> 'ANULADO');
    END IF;

    IF EXISTS (SELECT 1 FROM pago
               WHERE id_reserva = p_id_reserva
                 AND estado_pago IN ('SENADO', 'PAGADO')) THEN
        RETURN FALSE;
    END IF;

    IF EXISTS (SELECT 1 FROM reserva_participante
               WHERE id_reserva = p_id_reserva
                 AND id_inscripcion IS NOT NULL
                 AND estado_asistencia <> 'CANCELADA') THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END; $$;

CREATE FUNCTION public.sellar_cambio_de_seguimiento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado IS DISTINCT FROM OLD.estado
       OR NEW.observaciones IS DISTINCT FROM OLD.observaciones THEN
        NEW.fecha_actualizacion := now();
    END IF;

    RETURN NEW;
END; $$;

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
      AND p.id_reserva      <> p_id_reserva
      AND p.id_participacion IS DISTINCT FROM p_id_participacion
      AND otra.estado NOT IN ('CANCELADA', 'REPROGRAMADA')
      AND esta.estado NOT IN ('CANCELADA', 'REPROGRAMADA')
      AND p.estado_asistencia <> 'CANCELADA'
      AND otra.periodo && esta.periodo
    LIMIT 1;
END; $$;

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

CREATE FUNCTION public.verificar_avance_estado_release() RETURNS trigger
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

CREATE FUNCTION public.verificar_escalera_de_preconfirmacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    IF NEW.estado = 'PRECONFIRMADA' THEN
        RAISE EXCEPTION
            'A la prereserva se entra solo al crearla. Esta reserva ya esta en % y '
            'no puede volver a quedar apartada sin pago.',
            OLD.estado;
    END IF;

    IF OLD.estado = 'PRECONFIRMADA'
       AND NEW.estado NOT IN ('CONFIRMADA', 'CANCELADA') THEN
        RAISE EXCEPTION
            'Una prereserva solo puede confirmarse (cuando entra el pago) o '
            'cancelarse. No se puede pasar a %.',
            NEW.estado;
    END IF;

    RETURN NEW;
END; $$;

CREATE FUNCTION public.verificar_escalera_de_preinscripcion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    IF NEW.estado = 'PREINSCRIPTA' THEN
        RAISE EXCEPTION
            'A la preinscripcion se entra solo al crearla. Esta inscripcion ya esta '
            'en % y no puede volver a quedar pendiente de senia.',
            OLD.estado;
    END IF;

    IF OLD.estado = 'PREINSCRIPTA' THEN
        IF NEW.estado NOT IN ('ACTIVA', 'CANCELADA') THEN
            RAISE EXCEPTION
                'Una preinscripcion solo puede activarse (cuando entra la senia) o '
                'cancelarse. No se puede pasar a %.',
                NEW.estado;
        END IF;

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

CREATE FUNCTION public.verificar_inscripcion_al_abrirse() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    fila RECORD;
BEGIN
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

CREATE FUNCTION public.verificar_inscripcion_del_participante() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.id_inscripcion IS NULL THEN
        RETURN NEW;
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
        RETURN NEW;
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

CREATE FUNCTION public.verificar_nota_del_alumno() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.id_participacion IS NULL THEN
        RETURN NEW;
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

CREATE FUNCTION public.verificar_pago_al_anular() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
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

CREATE FUNCTION public.verificar_persona_sin_solapamiento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    choque RECORD;
BEGIN
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

CREATE FUNCTION public.verificar_que_el_release_lleva_temas() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_tipo   TEXT;
    v_codigo TEXT;
BEGIN
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

CREATE FUNCTION public.verificar_sena_al_reactivar_reserva() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
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

ALTER TABLE public.alumno ALTER COLUMN id_alumno ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.alumno_id_alumno_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.aparicion_release ALTER COLUMN id_aparicion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.aparicion_release_id_aparicion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.artista ALTER COLUMN id_artista ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.artista_id_artista_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.bloqueo_sala ALTER COLUMN id_bloqueo ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bloqueo_sala_id_bloqueo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.cancion_release ALTER COLUMN id_cancion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cancion_release_id_cancion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.comprobante_egreso ALTER COLUMN id_comprobante ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.comprobante_egreso_id_comprobante_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.comprobante_pago ALTER COLUMN id_comprobante ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.comprobante_pago_id_comprobante_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.contrato_sello (
    id_contrato bigint NOT NULL,
    id_artista bigint NOT NULL,
    id_release bigint,
    archivo_path character varying(500) NOT NULL,
    fecha_firma date,
    observaciones text,
    fecha_carga timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.contrato_sello ALTER COLUMN id_contrato ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.contrato_sello_id_contrato_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.egreso ALTER COLUMN id_egreso ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.egreso_id_egreso_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.inscripcion ALTER COLUMN id_inscripcion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.inscripcion_id_inscripcion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.inscripcion_integrante (
    id_integrante bigint NOT NULL,
    id_inscripcion bigint NOT NULL,
    id_alumno bigint NOT NULL,
    referente boolean DEFAULT false NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.inscripcion_integrante ALTER COLUMN id_integrante ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.inscripcion_integrante_id_integrante_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE SEQUENCE public.inscripcion_numero_grupo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

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

ALTER TABLE public.material ALTER COLUMN id_material ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.material_id_material_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.nota_profesor (
    id_nota bigint NOT NULL,
    id_profesor bigint NOT NULL,
    id_alumno bigint NOT NULL,
    id_participacion bigint,
    contenido text NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_modificacion timestamp with time zone
);

ALTER TABLE public.nota_profesor ALTER COLUMN id_nota ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.nota_profesor_id_nota_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.notificacion ALTER COLUMN id_notificacion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.notificacion_id_notificacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.pago ALTER COLUMN id_pago ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pago_id_pago_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.profesor (
    id_profesor bigint NOT NULL,
    id_usuario bigint NOT NULL,
    especialidad character varying(150),
    activo boolean DEFAULT true NOT NULL
);

ALTER TABLE public.profesor ALTER COLUMN id_profesor ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.profesor_id_profesor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.programa ALTER COLUMN id_programa ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.programa_id_programa_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.release ALTER COLUMN id_release ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.release_id_release_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.reserva ALTER COLUMN id_reserva ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.reserva_id_reserva_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.reserva_participante ALTER COLUMN id_participacion ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.reserva_participante_id_participacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.sala (
    id_sala bigint NOT NULL,
    nombre_sala character varying(100) NOT NULL,
    descripcion text,
    activa boolean DEFAULT true NOT NULL,
    orden smallint DEFAULT 0 NOT NULL
);

ALTER TABLE public.sala ALTER COLUMN id_sala ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sala_id_sala_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.sala_tipo_uso (
    id_sala bigint NOT NULL,
    id_tipo_uso bigint NOT NULL,
    advertencia text
);

CREATE TABLE public.seguimiento_alumno (
    id_seguimiento bigint NOT NULL,
    id_profesor bigint NOT NULL,
    id_alumno bigint NOT NULL,
    estado character varying(30) NOT NULL,
    observaciones text,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT seguimiento_estado_valido CHECK (((estado)::text = ANY ((ARRAY['VA_BIEN'::character varying, 'REQUIERE_ATENCION'::character varying, 'EN_PAUSA'::character varying])::text[])))
);

ALTER TABLE public.seguimiento_alumno ALTER COLUMN id_seguimiento ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.seguimiento_alumno_id_seguimiento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.solicitante_companero ALTER COLUMN id_companero ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitante_companero_id_companero_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE public.solicitante ALTER COLUMN id_solicitante ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitante_id_solicitante_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.solicitud_reprogramacion ALTER COLUMN id_solicitud ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitud_reprogramacion_id_solicitud_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.solicitud_reserva ALTER COLUMN id_solicitud_reserva ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitud_reserva_id_solicitud_reserva_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.tipo_uso ALTER COLUMN id_tipo_uso ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tipo_uso_id_tipo_uso_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.trabajo_mastering ALTER COLUMN id_trabajo ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.trabajo_mastering_id_trabajo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.usuario ALTER COLUMN id_usuario ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.usuario_id_usuario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

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

ALTER TABLE public.venta_equipo ALTER COLUMN id_venta ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.venta_equipo_id_venta_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE ONLY public.alumno
    ADD CONSTRAINT alumno_id_usuario_key UNIQUE (id_usuario);

ALTER TABLE ONLY public.alumno
    ADD CONSTRAINT alumno_pkey PRIMARY KEY (id_alumno);

ALTER TABLE ONLY public.aparicion_release
    ADD CONSTRAINT aparicion_release_pkey PRIMARY KEY (id_aparicion);

ALTER TABLE ONLY public.artista
    ADD CONSTRAINT artista_pkey PRIMARY KEY (id_artista);

ALTER TABLE ONLY public.bloqueo_sala
    ADD CONSTRAINT bloqueo_sala_pkey PRIMARY KEY (id_bloqueo);

ALTER TABLE ONLY public.bloqueo_sala
    ADD CONSTRAINT bloqueo_sin_solapamiento EXCLUDE USING gist (id_sala WITH =, dias WITH &&, franja WITH &&);

ALTER TABLE ONLY public.cancion_release
    ADD CONSTRAINT cancion_orden_unico UNIQUE (id_release, orden) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ONLY public.cancion_release
    ADD CONSTRAINT cancion_release_pkey PRIMARY KEY (id_cancion);

ALTER TABLE ONLY public.comprobante_pago
    ADD CONSTRAINT comprobante_archivo_unico UNIQUE (archivo_path);

ALTER TABLE ONLY public.comprobante_egreso
    ADD CONSTRAINT comprobante_egreso_archivo_unico UNIQUE (archivo_path);

ALTER TABLE ONLY public.comprobante_egreso
    ADD CONSTRAINT comprobante_egreso_pkey PRIMARY KEY (id_comprobante);

ALTER TABLE ONLY public.comprobante_pago
    ADD CONSTRAINT comprobante_pago_pkey PRIMARY KEY (id_comprobante);

ALTER TABLE ONLY public.contrato_sello
    ADD CONSTRAINT contrato_sello_pkey PRIMARY KEY (id_contrato);

ALTER TABLE ONLY public.egreso
    ADD CONSTRAINT egreso_pkey PRIMARY KEY (id_egreso);

ALTER TABLE ONLY public.inscripcion_integrante
    ADD CONSTRAINT inscripcion_integrante_pkey PRIMARY KEY (id_integrante);

ALTER TABLE ONLY public.inscripcion
    ADD CONSTRAINT inscripcion_numero_grupo_unico UNIQUE (numero_grupo);

ALTER TABLE ONLY public.inscripcion
    ADD CONSTRAINT inscripcion_pkey PRIMARY KEY (id_inscripcion);

ALTER TABLE ONLY public.inscripcion_integrante
    ADD CONSTRAINT integrante_unico_por_inscripcion UNIQUE (id_inscripcion, id_alumno);

ALTER TABLE ONLY public.material
    ADD CONSTRAINT material_pkey PRIMARY KEY (id_material);

ALTER TABLE ONLY public.nota_profesor
    ADD CONSTRAINT nota_profesor_pkey PRIMARY KEY (id_nota);

ALTER TABLE ONLY public.notificacion
    ADD CONSTRAINT notificacion_pkey PRIMARY KEY (id_notificacion);

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_pkey PRIMARY KEY (id_pago);

ALTER TABLE ONLY public.reserva_participante
    ADD CONSTRAINT participante_unico_por_reserva UNIQUE (id_reserva, id_usuario);

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT profesor_id_usuario_key UNIQUE (id_usuario);

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT profesor_pkey PRIMARY KEY (id_profesor);

ALTER TABLE ONLY public.programa
    ADD CONSTRAINT programa_pkey PRIMARY KEY (id_programa);

ALTER TABLE ONLY public.programa
    ADD CONSTRAINT programa_una_por_disciplina UNIQUE (disciplina);

ALTER TABLE ONLY public.release
    ADD CONSTRAINT release_codigo_release_key UNIQUE (codigo_release);

ALTER TABLE ONLY public.release
    ADD CONSTRAINT release_pkey PRIMARY KEY (id_release);

ALTER TABLE ONLY public.reserva_participante
    ADD CONSTRAINT reserva_participante_pkey PRIMARY KEY (id_participacion);

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_pkey PRIMARY KEY (id_reserva);

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_profesor_sin_solapamiento EXCLUDE USING gist (id_profesor WITH =, periodo WITH &&) WHERE (((estado)::text <> ALL ((ARRAY['CANCELADA'::character varying, 'REPROGRAMADA'::character varying])::text[])));

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_sin_solapamiento EXCLUDE USING gist (id_sala WITH =, periodo WITH &&) WHERE (((estado)::text <> ALL ((ARRAY['CANCELADA'::character varying, 'REPROGRAMADA'::character varying])::text[])));

ALTER TABLE ONLY public.sala
    ADD CONSTRAINT sala_nombre_sala_key UNIQUE (nombre_sala);

ALTER TABLE ONLY public.sala
    ADD CONSTRAINT sala_pkey PRIMARY KEY (id_sala);

ALTER TABLE ONLY public.sala_tipo_uso
    ADD CONSTRAINT sala_tipo_uso_pkey PRIMARY KEY (id_sala, id_tipo_uso);

ALTER TABLE ONLY public.seguimiento_alumno
    ADD CONSTRAINT seguimiento_alumno_pkey PRIMARY KEY (id_seguimiento);

ALTER TABLE ONLY public.seguimiento_alumno
    ADD CONSTRAINT seguimiento_unico UNIQUE (id_profesor, id_alumno);

ALTER TABLE ONLY public.solicitante_companero
    ADD CONSTRAINT solicitante_companero_pkey PRIMARY KEY (id_companero);

ALTER TABLE ONLY public.solicitante
    ADD CONSTRAINT solicitante_pkey PRIMARY KEY (id_solicitante);

ALTER TABLE ONLY public.solicitud_reprogramacion
    ADD CONSTRAINT solicitud_reprogramacion_pkey PRIMARY KEY (id_solicitud);

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_pkey PRIMARY KEY (id_solicitud_reserva);

ALTER TABLE ONLY public.tipo_uso
    ADD CONSTRAINT tipo_uso_codigo_key UNIQUE (codigo);

ALTER TABLE ONLY public.tipo_uso
    ADD CONSTRAINT tipo_uso_pkey PRIMARY KEY (id_tipo_uso);

ALTER TABLE ONLY public.trabajo_mastering
    ADD CONSTRAINT trabajo_mastering_pkey PRIMARY KEY (id_trabajo);

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);

ALTER TABLE ONLY public.venta_equipo
    ADD CONSTRAINT venta_equipo_pkey PRIMARY KEY (id_venta);

CREATE INDEX aparicion_por_release ON public.aparicion_release USING btree (id_release, orden_relevancia, fecha DESC);

CREATE UNIQUE INDEX artista_usuario_unico ON public.artista USING btree (id_usuario) WHERE (id_usuario IS NOT NULL);

CREATE INDEX cancion_por_release ON public.cancion_release USING btree (id_release, orden);

CREATE INDEX companero_por_ficha ON public.solicitante_companero USING btree (id_solicitante);

CREATE INDEX comprobante_egreso_por_egreso ON public.comprobante_egreso USING btree (id_egreso, id_comprobante);

CREATE INDEX comprobante_por_pago ON public.comprobante_pago USING btree (id_pago, id_comprobante);

CREATE INDEX contrato_por_artista ON public.contrato_sello USING btree (id_artista);

CREATE INDEX contrato_por_release ON public.contrato_sello USING btree (id_release);

CREATE INDEX inscripcion_por_profesor ON public.inscripcion USING btree (id_profesor) WHERE ((estado)::text = 'ACTIVA'::text);

CREATE UNIQUE INDEX inscripcion_un_solo_referente ON public.inscripcion_integrante USING btree (id_inscripcion) WHERE referente;

CREATE INDEX integrante_por_alumno ON public.inscripcion_integrante USING btree (id_alumno);

CREATE INDEX material_por_inscripcion ON public.material USING btree (id_inscripcion);

CREATE INDEX material_por_reserva ON public.material USING btree (id_reserva) WHERE (id_reserva IS NOT NULL);

CREATE INDEX nota_por_alumno ON public.nota_profesor USING btree (id_alumno);

CREATE UNIQUE INDEX notificacion_clave_evento_unica ON public.notificacion USING btree (id_usuario_destino, clave_evento) WHERE (clave_evento IS NOT NULL);

CREATE INDEX notificacion_no_leidas ON public.notificacion USING btree (id_usuario_destino) WHERE (NOT leida);

CREATE INDEX pago_deudores ON public.pago USING btree (estado_pago) WHERE ((estado_pago)::text = ANY ((ARRAY['DEBE'::character varying, 'VENCIDO'::character varying])::text[]));

CREATE INDEX pago_por_inscripcion ON public.pago USING btree (id_inscripcion) WHERE (id_inscripcion IS NOT NULL);

CREATE INDEX pago_por_trabajo ON public.pago USING btree (id_trabajo_mastering) WHERE (id_trabajo_mastering IS NOT NULL);

CREATE INDEX pago_por_usuario ON public.pago USING btree (id_usuario, fecha_pago);

CREATE INDEX participante_por_inscripcion ON public.reserva_participante USING btree (id_inscripcion);

CREATE INDEX participante_por_usuario ON public.reserva_participante USING btree (id_usuario);

CREATE INDEX release_por_artista ON public.release USING btree (id_artista);

CREATE INDEX reserva_por_fecha ON public.reserva USING btree (fecha);

CREATE INDEX reserva_por_profesor ON public.reserva USING btree (id_profesor, fecha);

CREATE INDEX reserva_por_sala_fecha ON public.reserva USING btree (id_sala, fecha);

CREATE UNIQUE INDEX reserva_recupera_una_sola_vez ON public.reserva USING btree (id_reserva_recupera) WHERE (id_reserva_recupera IS NOT NULL);

CREATE INDEX solicitante_abiertos ON public.solicitante USING btree (fecha_creacion) WHERE ((estado)::text <> 'DESCARTADO'::text);

CREATE INDEX solicitante_por_email ON public.solicitante USING btree (lower((email)::text));

CREATE INDEX solicitud_pendientes ON public.solicitud_reprogramacion USING btree (fecha_solicitud) WHERE ((estado)::text = 'PENDIENTE'::text);

CREATE INDEX solicitud_reserva_pendientes ON public.solicitud_reserva USING btree (fecha, hora_inicio) WHERE ((estado)::text = 'PENDIENTE'::text);

CREATE INDEX solicitud_reserva_por_usuario ON public.solicitud_reserva USING btree (id_usuario, fecha_creacion DESC);

CREATE INDEX trabajo_por_estado ON public.trabajo_mastering USING btree (estado);

CREATE UNIQUE INDEX usuario_email_unico ON public.usuario USING btree (lower((email)::text));

CREATE INDEX usuario_orden_alfabetico ON public.usuario USING btree (lower((apellido)::text), lower((nombre)::text));

CREATE UNIQUE INDEX usuario_telefono_unico ON public.usuario USING btree (telefono) WHERE (telefono IS NOT NULL);

CREATE TRIGGER bloqueo_sin_reservas_activas BEFORE INSERT OR UPDATE ON public.bloqueo_sala FOR EACH ROW EXECUTE FUNCTION public.verificar_bloqueo_sin_reservas();

CREATE TRIGGER cancion_solo_en_ep_o_album BEFORE INSERT OR UPDATE ON public.cancion_release FOR EACH ROW EXECUTE FUNCTION public.verificar_que_el_release_lleva_temas();

CREATE TRIGGER cancion_sostiene_release_publicado BEFORE DELETE OR UPDATE ON public.cancion_release FOR EACH ROW EXECUTE FUNCTION public.proteger_temas_de_release_publicado();

CREATE TRIGGER companero_hasta_dos_en_un_curso BEFORE INSERT ON public.solicitante_companero FOR EACH ROW EXECUTE FUNCTION public.verificar_companero_de_ficha();

CREATE TRIGGER companero_no_se_borra BEFORE DELETE ON public.solicitante_companero FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();

CREATE TRIGGER comprobante_egreso_es_inmutable BEFORE UPDATE ON public.comprobante_egreso FOR EACH ROW EXECUTE FUNCTION public.verificar_inmutabilidad_del_comprobante_de_egreso();

CREATE TRIGGER comprobante_egreso_no_se_borra BEFORE DELETE ON public.comprobante_egreso FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();

CREATE TRIGGER comprobante_es_inmutable BEFORE UPDATE ON public.comprobante_pago FOR EACH ROW EXECUTE FUNCTION public.verificar_inmutabilidad_del_comprobante();

CREATE TRIGGER comprobante_no_se_borra BEFORE DELETE ON public.comprobante_pago FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();

CREATE TRIGGER contrato_sostiene_release BEFORE DELETE OR UPDATE ON public.contrato_sello FOR EACH ROW EXECUTE FUNCTION public.proteger_contrato_de_release_publicado();

CREATE TRIGGER egreso_no_se_borra BEFORE DELETE ON public.egreso FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();

CREATE CONSTRAINT TRIGGER inscripcion_con_integrantes AFTER INSERT ON public.inscripcion DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.verificar_integrantes_al_commit();

CREATE TRIGGER inscripcion_escalera_de_preinscripcion BEFORE UPDATE ON public.inscripcion FOR EACH ROW EXECUTE FUNCTION public.verificar_escalera_de_preinscripcion();

CREATE TRIGGER inscripcion_moneda_con_plata_adentro BEFORE UPDATE OF moneda ON public.inscripcion FOR EACH ROW EXECUTE FUNCTION public.verificar_cambio_de_moneda_con_plata_adentro('id_inscripcion', 'id_inscripcion');

CREATE TRIGGER inscripcion_nivel_no_retrocede_sin_firma BEFORE UPDATE ON public.inscripcion FOR EACH ROW EXECUTE FUNCTION public.verificar_baja_de_nivel_firmada();

CREATE TRIGGER inscripcion_sin_otra_abierta AFTER UPDATE OF estado, disciplina ON public.inscripcion FOR EACH ROW EXECUTE FUNCTION public.verificar_inscripcion_al_abrirse();

CREATE CONSTRAINT TRIGGER integrante_deja_el_grupo_coherente AFTER INSERT OR UPDATE ON public.inscripcion_integrante DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.verificar_integrantes_al_commit();

CREATE TRIGGER integrante_hasta_tres BEFORE INSERT ON public.inscripcion_integrante FOR EACH ROW EXECUTE FUNCTION public.verificar_tamanio_del_grupo();

CREATE TRIGGER integrante_no_se_borra BEFORE DELETE ON public.inscripcion_integrante FOR EACH ROW EXECUTE FUNCTION public.prohibir_cambio_de_integrantes();

CREATE TRIGGER integrante_no_se_cambia BEFORE UPDATE OF id_inscripcion, id_alumno, referente ON public.inscripcion_integrante FOR EACH ROW EXECUTE FUNCTION public.prohibir_cambio_de_integrantes();

CREATE TRIGGER integrante_sin_otra_abierta BEFORE INSERT ON public.inscripcion_integrante FOR EACH ROW EXECUTE FUNCTION public.verificar_integrante_sin_otra_abierta();

CREATE TRIGGER material_clase_del_curso BEFORE INSERT OR UPDATE OF id_reserva, id_inscripcion ON public.material FOR EACH ROW EXECUTE FUNCTION public.material_clase_del_curso();

CREATE TRIGGER nota_coherente_con_alumno BEFORE INSERT OR UPDATE ON public.nota_profesor FOR EACH ROW EXECUTE FUNCTION public.verificar_nota_del_alumno();

CREATE TRIGGER pago_edicion_con_autor BEFORE UPDATE ON public.pago FOR EACH ROW WHEN (((old.monto IS DISTINCT FROM new.monto) OR ((old.moneda)::text IS DISTINCT FROM (new.moneda)::text) OR (old.cotizacion_dolar IS DISTINCT FROM new.cotizacion_dolar) OR ((old.medio_pago)::text IS DISTINCT FROM (new.medio_pago)::text) OR (old.descuento_porcentaje IS DISTINCT FROM new.descuento_porcentaje) OR (old.fecha_pago IS DISTINCT FROM new.fecha_pago) OR (old.id_usuario IS DISTINCT FROM new.id_usuario) OR (old.id_inscripcion IS DISTINCT FROM new.id_inscripcion) OR (old.id_reserva IS DISTINCT FROM new.id_reserva) OR (old.id_trabajo_mastering IS DISTINCT FROM new.id_trabajo_mastering) OR (old.id_venta_equipo IS DISTINCT FROM new.id_venta_equipo))) EXECUTE FUNCTION public.exigir_autor_de_la_edicion();

CREATE TRIGGER pago_en_la_moneda_de_la_reserva BEFORE INSERT OR UPDATE OF moneda, id_reserva ON public.pago FOR EACH ROW EXECUTE FUNCTION public.verificar_moneda_del_pago_de_reserva();

CREATE TRIGGER pago_en_la_moneda_del_contrato BEFORE INSERT OR UPDATE OF moneda, id_inscripcion ON public.pago FOR EACH ROW EXECUTE FUNCTION public.verificar_moneda_del_pago_de_inscripcion();

CREATE TRIGGER pago_en_la_moneda_del_trabajo BEFORE INSERT OR UPDATE OF moneda, id_trabajo_mastering ON public.pago FOR EACH ROW EXECUTE FUNCTION public.verificar_moneda_del_pago_de_trabajo();

CREATE TRIGGER pago_no_deja_la_reserva_sin_plata AFTER UPDATE ON public.pago FOR EACH ROW EXECUTE FUNCTION public.verificar_pago_al_anular();

CREATE TRIGGER pago_no_se_borra BEFORE DELETE ON public.pago FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();

CREATE TRIGGER pago_sostiene_premaster BEFORE DELETE OR UPDATE ON public.pago FOR EACH ROW EXECUTE FUNCTION public.proteger_pago_de_premaster();

CREATE TRIGGER participante_edicion_con_autor BEFORE UPDATE ON public.reserva_participante FOR EACH ROW WHEN (((old.estado_asistencia)::text IS DISTINCT FROM (new.estado_asistencia)::text)) EXECUTE FUNCTION public.exigir_autor_de_la_edicion();

CREATE TRIGGER participante_en_una_sola_sala BEFORE INSERT OR UPDATE ON public.reserva_participante FOR EACH ROW EXECUTE FUNCTION public.verificar_persona_sin_solapamiento();

CREATE TRIGGER participante_inscripcion_coherente BEFORE INSERT OR UPDATE ON public.reserva_participante FOR EACH ROW EXECUTE FUNCTION public.verificar_inscripcion_del_participante();

CREATE TRIGGER participante_no_excede_clases_contratadas BEFORE INSERT OR UPDATE ON public.reserva_participante FOR EACH ROW EXECUTE FUNCTION public.verificar_clases_contratadas();

CREATE TRIGGER participante_no_se_borra BEFORE DELETE ON public.reserva_participante FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();

CREATE TRIGGER premaster_requiere_pago BEFORE INSERT OR UPDATE ON public.trabajo_mastering FOR EACH ROW EXECUTE FUNCTION public.verificar_liberacion_premaster();

CREATE TRIGGER programa_no_se_borra BEFORE DELETE ON public.programa FOR EACH ROW EXECUTE FUNCTION public.programa_no_se_borra();

CREATE TRIGGER release_estado_solo_avanza BEFORE UPDATE ON public.release FOR EACH ROW EXECUTE FUNCTION public.verificar_avance_estado_release();

CREATE TRIGGER release_no_se_borra BEFORE DELETE ON public.release FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();

CREATE TRIGGER release_requiere_contrato BEFORE INSERT OR UPDATE ON public.release FOR EACH ROW EXECUTE FUNCTION public.verificar_publicacion_con_contrato();

CREATE TRIGGER release_respeta_el_rango_de_temas BEFORE INSERT OR UPDATE ON public.release FOR EACH ROW EXECUTE FUNCTION public.verificar_rango_de_temas();

CREATE TRIGGER release_tipo_admite_los_temas BEFORE UPDATE ON public.release FOR EACH ROW EXECUTE FUNCTION public.verificar_que_el_tipo_admite_los_temas();

CREATE TRIGGER reserva_al_moverse_respeta_participantes AFTER UPDATE OF fecha, hora_inicio, hora_fin ON public.reserva FOR EACH ROW WHEN (((old.fecha IS DISTINCT FROM new.fecha) OR (old.hora_inicio IS DISTINCT FROM new.hora_inicio) OR (old.hora_fin IS DISTINCT FROM new.hora_fin))) EXECUTE FUNCTION public.verificar_participantes_al_mover_reserva();

CREATE TRIGGER reserva_al_reactivarse_respeta_contratadas AFTER UPDATE OF estado ON public.reserva FOR EACH ROW WHEN (((old.estado)::text IS DISTINCT FROM (new.estado)::text)) EXECUTE FUNCTION public.verificar_clases_al_reactivar_reserva();

CREATE CONSTRAINT TRIGGER reserva_con_sena AFTER INSERT ON public.reserva DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.verificar_sena_de_la_reserva();

CREATE TRIGGER reserva_edicion_con_autor BEFORE UPDATE ON public.reserva FOR EACH ROW WHEN ((((old.estado)::text IS DISTINCT FROM (new.estado)::text) OR (old.fecha IS DISTINCT FROM new.fecha) OR (old.hora_inicio IS DISTINCT FROM new.hora_inicio) OR (old.hora_fin IS DISTINCT FROM new.hora_fin) OR (old.id_sala IS DISTINCT FROM new.id_sala))) EXECUTE FUNCTION public.exigir_autor_de_la_edicion();

CREATE TRIGGER reserva_en_sala_activa BEFORE INSERT OR UPDATE ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.verificar_sala_activa();

CREATE TRIGGER reserva_escalera_de_preconfirmacion BEFORE UPDATE ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.verificar_escalera_de_preconfirmacion();

CREATE TRIGGER reserva_moneda_con_plata_adentro BEFORE UPDATE OF moneda ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.verificar_cambio_de_moneda_con_plata_adentro('id_reserva', 'id_reserva');

CREATE TRIGGER reserva_no_se_borra BEFORE DELETE ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();

CREATE TRIGGER reserva_reactivada_con_sena AFTER UPDATE ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.verificar_sena_al_reactivar_reserva();

CREATE TRIGGER reserva_respeta_bloqueos BEFORE INSERT OR UPDATE ON public.reserva FOR EACH ROW EXECUTE FUNCTION public.verificar_sala_no_bloqueada();

CREATE TRIGGER seguimiento_sella_su_cambio BEFORE UPDATE ON public.seguimiento_alumno FOR EACH ROW EXECUTE FUNCTION public.sellar_cambio_de_seguimiento();

CREATE TRIGGER solicitante_no_se_borra BEFORE DELETE ON public.solicitante FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();

CREATE TRIGGER solicitante_resuelto_es_final BEFORE UPDATE ON public.solicitante FOR EACH ROW EXECUTE FUNCTION public.solicitud_resuelta_es_final();

CREATE TRIGGER solicitud_reprogramacion_resuelta_es_final BEFORE UPDATE ON public.solicitud_reprogramacion FOR EACH ROW EXECUTE FUNCTION public.solicitud_resuelta_es_final();

CREATE TRIGGER solicitud_reserva_no_se_borra BEFORE DELETE ON public.solicitud_reserva FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();

CREATE TRIGGER solicitud_reserva_resuelta_es_final BEFORE UPDATE ON public.solicitud_reserva FOR EACH ROW EXECUTE FUNCTION public.solicitud_resuelta_es_final();

CREATE TRIGGER solicitud_reserva_uso_solicitable BEFORE INSERT OR UPDATE OF id_tipo_uso ON public.solicitud_reserva FOR EACH ROW EXECUTE FUNCTION public.verificar_uso_solicitable();

CREATE TRIGGER trabajo_estado_solo_avanza BEFORE UPDATE ON public.trabajo_mastering FOR EACH ROW EXECUTE FUNCTION public.verificar_avance_estado_trabajo();

CREATE TRIGGER trabajo_moneda_con_plata_adentro BEFORE UPDATE OF moneda ON public.trabajo_mastering FOR EACH ROW EXECUTE FUNCTION public.verificar_cambio_de_moneda_con_plata_adentro('id_trabajo_mastering', 'id_trabajo');

CREATE TRIGGER trabajo_no_se_borra BEFORE DELETE ON public.trabajo_mastering FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();

CREATE TRIGGER venta_no_se_borra BEFORE DELETE ON public.venta_equipo FOR EACH ROW EXECUTE FUNCTION public.prohibir_borrado_historico();

ALTER TABLE ONLY public.alumno
    ADD CONSTRAINT alumno_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.aparicion_release
    ADD CONSTRAINT aparicion_release_id_release_fkey FOREIGN KEY (id_release) REFERENCES public.release(id_release);

ALTER TABLE ONLY public.aparicion_release
    ADD CONSTRAINT aparicion_release_id_usuario_carga_fkey FOREIGN KEY (id_usuario_carga) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.artista
    ADD CONSTRAINT artista_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.bloqueo_sala
    ADD CONSTRAINT bloqueo_sala_id_sala_fkey FOREIGN KEY (id_sala) REFERENCES public.sala(id_sala);

ALTER TABLE ONLY public.bloqueo_sala
    ADD CONSTRAINT bloqueo_sala_id_usuario_registra_fkey FOREIGN KEY (id_usuario_registra) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.cancion_release
    ADD CONSTRAINT cancion_release_id_release_fkey FOREIGN KEY (id_release) REFERENCES public.release(id_release);

ALTER TABLE ONLY public.comprobante_egreso
    ADD CONSTRAINT comprobante_egreso_id_egreso_fkey FOREIGN KEY (id_egreso) REFERENCES public.egreso(id_egreso);

ALTER TABLE ONLY public.comprobante_egreso
    ADD CONSTRAINT comprobante_egreso_id_usuario_carga_fkey FOREIGN KEY (id_usuario_carga) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.comprobante_egreso
    ADD CONSTRAINT comprobante_egreso_id_usuario_invalida_fkey FOREIGN KEY (id_usuario_invalida) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.comprobante_pago
    ADD CONSTRAINT comprobante_pago_id_pago_fkey FOREIGN KEY (id_pago) REFERENCES public.pago(id_pago);

ALTER TABLE ONLY public.comprobante_pago
    ADD CONSTRAINT comprobante_pago_id_usuario_carga_fkey FOREIGN KEY (id_usuario_carga) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.comprobante_pago
    ADD CONSTRAINT comprobante_pago_id_usuario_invalida_fkey FOREIGN KEY (id_usuario_invalida) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.contrato_sello
    ADD CONSTRAINT contrato_sello_id_artista_fkey FOREIGN KEY (id_artista) REFERENCES public.artista(id_artista);

ALTER TABLE ONLY public.contrato_sello
    ADD CONSTRAINT contrato_sello_id_release_fkey FOREIGN KEY (id_release) REFERENCES public.release(id_release);

ALTER TABLE ONLY public.egreso
    ADD CONSTRAINT egreso_id_usuario_anula_fkey FOREIGN KEY (id_usuario_anula) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.egreso
    ADD CONSTRAINT egreso_id_usuario_destino_fkey FOREIGN KEY (id_usuario_destino) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.egreso
    ADD CONSTRAINT egreso_id_usuario_registra_fkey FOREIGN KEY (id_usuario_registra) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.inscripcion
    ADD CONSTRAINT inscripcion_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id_profesor);

ALTER TABLE ONLY public.inscripcion
    ADD CONSTRAINT inscripcion_id_usuario_baja_nivel_fkey FOREIGN KEY (id_usuario_baja_nivel) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.inscripcion_integrante
    ADD CONSTRAINT inscripcion_integrante_id_alumno_fkey FOREIGN KEY (id_alumno) REFERENCES public.alumno(id_alumno);

ALTER TABLE ONLY public.inscripcion_integrante
    ADD CONSTRAINT inscripcion_integrante_id_inscripcion_fkey FOREIGN KEY (id_inscripcion) REFERENCES public.inscripcion(id_inscripcion);

ALTER TABLE ONLY public.material
    ADD CONSTRAINT material_id_inscripcion_fkey FOREIGN KEY (id_inscripcion) REFERENCES public.inscripcion(id_inscripcion);

ALTER TABLE ONLY public.material
    ADD CONSTRAINT material_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id_profesor);

ALTER TABLE ONLY public.material
    ADD CONSTRAINT material_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reserva(id_reserva);

ALTER TABLE ONLY public.nota_profesor
    ADD CONSTRAINT nota_profesor_id_alumno_fkey FOREIGN KEY (id_alumno) REFERENCES public.alumno(id_alumno);

ALTER TABLE ONLY public.nota_profesor
    ADD CONSTRAINT nota_profesor_id_participacion_fkey FOREIGN KEY (id_participacion) REFERENCES public.reserva_participante(id_participacion);

ALTER TABLE ONLY public.nota_profesor
    ADD CONSTRAINT nota_profesor_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id_profesor);

ALTER TABLE ONLY public.notificacion
    ADD CONSTRAINT notificacion_id_usuario_destino_fkey FOREIGN KEY (id_usuario_destino) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_inscripcion_fkey FOREIGN KEY (id_inscripcion) REFERENCES public.inscripcion(id_inscripcion);

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reserva(id_reserva);

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_usuario_anula_fkey FOREIGN KEY (id_usuario_anula) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_usuario_modifico_fkey FOREIGN KEY (id_usuario_modifico) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_id_usuario_registra_fkey FOREIGN KEY (id_usuario_registra) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_trabajo_mastering_fk FOREIGN KEY (id_trabajo_mastering) REFERENCES public.trabajo_mastering(id_trabajo);

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_venta_equipo_fk FOREIGN KEY (id_venta_equipo) REFERENCES public.venta_equipo(id_venta);

ALTER TABLE ONLY public.profesor
    ADD CONSTRAINT profesor_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.release
    ADD CONSTRAINT release_id_artista_fkey FOREIGN KEY (id_artista) REFERENCES public.artista(id_artista);

ALTER TABLE ONLY public.release
    ADD CONSTRAINT release_id_usuario_publica_fkey FOREIGN KEY (id_usuario_publica) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id_profesor);

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_id_reserva_recupera_fkey FOREIGN KEY (id_reserva_recupera) REFERENCES public.reserva(id_reserva);

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_id_sala_fkey FOREIGN KEY (id_sala) REFERENCES public.sala(id_sala);

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_id_tipo_uso_fkey FOREIGN KEY (id_tipo_uso) REFERENCES public.tipo_uso(id_tipo_uso);

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_id_usuario_creo_fkey FOREIGN KEY (id_usuario_creo) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_id_usuario_modifico_fkey FOREIGN KEY (id_usuario_modifico) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.reserva_participante
    ADD CONSTRAINT reserva_participante_id_inscripcion_fkey FOREIGN KEY (id_inscripcion) REFERENCES public.inscripcion(id_inscripcion);

ALTER TABLE ONLY public.reserva_participante
    ADD CONSTRAINT reserva_participante_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reserva(id_reserva);

ALTER TABLE ONLY public.reserva_participante
    ADD CONSTRAINT reserva_participante_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.reserva_participante
    ADD CONSTRAINT reserva_participante_id_usuario_modifico_fkey FOREIGN KEY (id_usuario_modifico) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.reserva
    ADD CONSTRAINT reserva_uso_permitido_en_sala FOREIGN KEY (id_sala, id_tipo_uso) REFERENCES public.sala_tipo_uso(id_sala, id_tipo_uso);

ALTER TABLE ONLY public.sala_tipo_uso
    ADD CONSTRAINT sala_tipo_uso_id_sala_fkey FOREIGN KEY (id_sala) REFERENCES public.sala(id_sala);

ALTER TABLE ONLY public.sala_tipo_uso
    ADD CONSTRAINT sala_tipo_uso_id_tipo_uso_fkey FOREIGN KEY (id_tipo_uso) REFERENCES public.tipo_uso(id_tipo_uso);

ALTER TABLE ONLY public.seguimiento_alumno
    ADD CONSTRAINT seguimiento_alumno_id_alumno_fkey FOREIGN KEY (id_alumno) REFERENCES public.alumno(id_alumno);

ALTER TABLE ONLY public.seguimiento_alumno
    ADD CONSTRAINT seguimiento_alumno_id_profesor_fkey FOREIGN KEY (id_profesor) REFERENCES public.profesor(id_profesor);

ALTER TABLE ONLY public.solicitante_companero
    ADD CONSTRAINT solicitante_companero_id_solicitante_fkey FOREIGN KEY (id_solicitante) REFERENCES public.solicitante(id_solicitante);

ALTER TABLE ONLY public.solicitante
    ADD CONSTRAINT solicitante_id_inscripcion_fkey FOREIGN KEY (id_inscripcion) REFERENCES public.inscripcion(id_inscripcion);

ALTER TABLE ONLY public.solicitante
    ADD CONSTRAINT solicitante_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reserva(id_reserva);

ALTER TABLE ONLY public.solicitante
    ADD CONSTRAINT solicitante_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.solicitante
    ADD CONSTRAINT solicitante_id_usuario_resuelve_fkey FOREIGN KEY (id_usuario_resuelve) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.solicitante
    ADD CONSTRAINT solicitante_id_venta_equipo_fkey FOREIGN KEY (id_venta_equipo) REFERENCES public.venta_equipo(id_venta);

ALTER TABLE ONLY public.solicitud_reprogramacion
    ADD CONSTRAINT solicitud_reprogramacion_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reserva(id_reserva);

ALTER TABLE ONLY public.solicitud_reprogramacion
    ADD CONSTRAINT solicitud_reprogramacion_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.solicitud_reprogramacion
    ADD CONSTRAINT solicitud_reprogramacion_id_usuario_resuelve_fkey FOREIGN KEY (id_usuario_resuelve) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reserva(id_reserva);

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_id_sala_fkey FOREIGN KEY (id_sala) REFERENCES public.sala(id_sala);

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_id_tipo_uso_fkey FOREIGN KEY (id_tipo_uso) REFERENCES public.tipo_uso(id_tipo_uso);

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_id_usuario_resuelve_fkey FOREIGN KEY (id_usuario_resuelve) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.solicitud_reserva
    ADD CONSTRAINT solicitud_reserva_uso_permitido_en_sala FOREIGN KEY (id_sala, id_tipo_uso) REFERENCES public.sala_tipo_uso(id_sala, id_tipo_uso);

ALTER TABLE ONLY public.trabajo_mastering
    ADD CONSTRAINT trabajo_mastering_id_cliente_usuario_fkey FOREIGN KEY (id_cliente_usuario) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.trabajo_mastering
    ADD CONSTRAINT trabajo_mastering_id_profesor_asignado_fkey FOREIGN KEY (id_profesor_asignado) REFERENCES public.profesor(id_profesor);

ALTER TABLE ONLY public.trabajo_mastering
    ADD CONSTRAINT trabajo_mastering_id_usuario_libera_fkey FOREIGN KEY (id_usuario_libera) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.venta_equipo
    ADD CONSTRAINT venta_equipo_id_usuario_anula_fkey FOREIGN KEY (id_usuario_anula) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.venta_equipo
    ADD CONSTRAINT venta_equipo_id_usuario_comprador_fkey FOREIGN KEY (id_usuario_comprador) REFERENCES public.usuario(id_usuario);

ALTER TABLE ONLY public.venta_equipo
    ADD CONSTRAINT venta_equipo_id_usuario_vendedor_fkey FOREIGN KEY (id_usuario_vendedor) REFERENCES public.usuario(id_usuario);
