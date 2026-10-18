-- =============================================================================
-- V39 — Los mensajes de las reglas, en el idioma de quien los lee
-- =============================================================================
--
-- `ManejadorDeErrores` devuelve el texto de cada RAISE EXCEPTION tal cual, como
-- 409, y la pantalla lo muestra. Esos textos estaban escritos para quien mantiene
-- la base: sin acentos, con nombres de columnas ("marcalo con
-- publicado_sin_contrato"), estados internos ("registrá el pago (SENADO)"),
-- flechas de código ("programa -> activo = FALSE"), ids ("la #1234") y fechas y
-- horas en crudo ("2026-10-21 10:00:00"). Barrida de textos del 2026-10-18.
--
-- Es el método de `V37`, aplicado a todos: cada función se reescribe IGUAL a la
-- versión vigente (la de `docs/db/esquema-actual.sql`) salvo el RAISE. El script
-- que la generó verificó que fuera de los mensajes cada cuerpo quedara idéntico
-- byte a byte. No se toca ningún trigger: `CREATE OR REPLACE FUNCTION` los deja
-- apuntando a la versión nueva, y los COMMENT ON quedan como estaban.
--
-- Los valores internos que el mensaje necesita nombrar (formato de un release,
-- estado, disciplina, moneda) se traducen con un CASE a las mismas palabras que
-- usa el panel (`tiposSello.ts`, `tiposMastering.ts`, `presentacion.ts`). Los
-- importes se arman con `translate` y no con `G`/`D` de `to_char`, para no
-- depender del lc_numeric del servidor.
-- =============================================================================


CREATE OR REPLACE FUNCTION public.exigir_autor_de_la_edicion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.id_usuario_modifico IS NULL THEN
        RAISE EXCEPTION
            'No se pudo guardar el cambio: falta registrar quién lo hizo. Volvé a intentarlo desde la pantalla.';
    END IF;

    NEW.fecha_modificacion := now();
    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.exigir_read_committed(regla text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION
            'No se pudo completar la operación. Probá de nuevo en un momento.';
    END IF;
END; $$;


CREATE OR REPLACE FUNCTION public.material_clase_del_curso() RETURNS trigger
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
            'Esa clase no es de ese curso: el alumno no la tomó con esta inscripción. Elegí una de sus clases, o dejalo para todo el curso.';
    END IF;

    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.programa_no_se_borra() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION
            'Un programa no se borra, porque las inscripciones lo usan. Para dejar de ofrecerlo, desactivalo desde Programas.';
END; $$;


CREATE OR REPLACE FUNCTION public.prohibir_borrado_historico() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION
            '%',
            CASE TG_TABLE_NAME WHEN 'pago' THEN 'Un pago no se borra: si se cargó mal, anulalo y queda registrado con tu nombre y el motivo.' WHEN 'trabajo_mastering' THEN 'Un trabajo de Mix & Mastering no se borra: si no va, cancelalo.' WHEN 'reserva' THEN 'Una reserva no se borra: si no va, cancelala.' WHEN 'reserva_participante' THEN 'Una persona anotada en una clase no se borra: si no viene, dala de baja de la clase.' WHEN 'egreso' THEN 'Un egreso no se borra: si se cargó mal, anulalo.' WHEN 'venta_equipo' THEN 'Una venta no se borra: si se cargó mal, anulala.' WHEN 'solicitud_reserva' THEN 'Un pedido de sala no se borra: si ya no va, cancelalo.' WHEN 'solicitante' THEN 'Una ficha del buzón no se borra: si no va, descartala.' WHEN 'solicitante_companero' THEN 'Los compañeros de una ficha no se borran: son parte de lo que la persona pidió.' WHEN 'comprobante_pago' THEN 'Un comprobante no se borra: si no corresponde, marcalo como inválido.' WHEN 'comprobante_egreso' THEN 'Un comprobante no se borra: si no corresponde, marcalo como inválido.' ELSE 'Esto no se borra: es parte del historial del estudio.' END;
END; $$;


CREATE OR REPLACE FUNCTION public.prohibir_cambio_de_integrantes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION
            'Los integrantes de un grupo no se cambian después de inscribirlo. Si el grupo cambia, cancelá esta inscripción y cargá una nueva.';
END; $$;


CREATE OR REPLACE FUNCTION public.proteger_contrato_de_release_publicado() RETURNS trigger
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
            'Ese contrato es el único respaldo del release %, que ya está publicado. Adjuntá el contrato que lo reemplaza antes de sacar este.',
            v_codigo;
    END IF;

    RETURN COALESCE(NEW, OLD);
END; $$;


CREATE OR REPLACE FUNCTION public.proteger_pago_de_premaster() RETURNS trigger
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
            'Ese pago es el único respaldo del premaster que ya se entregó, así que no se puede anular ni dejar como deuda.';
END; $$;


CREATE OR REPLACE FUNCTION public.proteger_temas_de_release_publicado() RETURNS trigger
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
            'El release % ya está publicado y es un %: sin este tema quedaría con %, y un % lleva por lo menos %. Cargá el que lo reemplaza antes de sacar este.',
            v_codigo,
            CASE v_tipo WHEN 'ALBUM' THEN 'álbum' WHEN 'EP' THEN 'EP' WHEN 'SINGLE' THEN 'single' WHEN 'REMIX' THEN 'remix' ELSE lower(v_tipo::text) END,
            v_temas,
            CASE v_tipo WHEN 'ALBUM' THEN 'álbum' WHEN 'EP' THEN 'EP' WHEN 'SINGLE' THEN 'single' WHEN 'REMIX' THEN 'remix' ELSE lower(v_tipo::text) END,
            v_minimo;
    END IF;

    RETURN COALESCE(NEW, OLD);
END; $$;


CREATE OR REPLACE FUNCTION public.solicitud_resuelta_es_final() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.estado <> 'PENDIENTE' THEN
        RAISE EXCEPTION
            'Ese pedido ya fue respondido y no se puede cambiar. Si hace falta otra cosa, hay que hacer un pedido nuevo.';
    END IF;
    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_avance_estado_release() RETURNS trigger
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
            'El release % está cancelado y no se puede reabrir. Si el lanzamiento se retoma, cargalo como un release nuevo.',
            OLD.codigo_release;
    END IF;

    orden_anterior := CASE OLD.estado
        WHEN 'A_CONFIRMAR'     THEN 1 WHEN 'CONFIRMADO' THEN 2
        WHEN 'EN_DISTRIBUCION' THEN 3 WHEN 'PUBLICADO'  THEN 4 ELSE 0 END;
    orden_nuevo := CASE NEW.estado
        WHEN 'A_CONFIRMAR'     THEN 1 WHEN 'CONFIRMADO' THEN 2
        WHEN 'EN_DISTRIBUCION' THEN 3 WHEN 'PUBLICADO'  THEN 4 ELSE 0 END;

    IF orden_nuevo < orden_anterior THEN
        RAISE EXCEPTION
            'Un release no vuelve para atrás: de «%» no puede pasar a «%».',
            CASE OLD.estado WHEN 'A_CONFIRMAR' THEN 'a confirmar' WHEN 'CONFIRMADO' THEN 'confirmado' WHEN 'EN_DISTRIBUCION' THEN 'en distribución' WHEN 'PUBLICADO' THEN 'publicado' WHEN 'CANCELADO' THEN 'cancelado' ELSE lower(OLD.estado::text) END,
            CASE NEW.estado WHEN 'A_CONFIRMAR' THEN 'a confirmar' WHEN 'CONFIRMADO' THEN 'confirmado' WHEN 'EN_DISTRIBUCION' THEN 'en distribución' WHEN 'PUBLICADO' THEN 'publicado' WHEN 'CANCELADO' THEN 'cancelado' ELSE lower(NEW.estado::text) END;
    END IF;

    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.verificar_avance_estado_trabajo() RETURNS trigger
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
            'Ese trabajo está cancelado y no se puede reabrir. Si se retoma, cargalo como un trabajo nuevo.';
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
            'Un trabajo no vuelve para atrás: de «%» no puede pasar a «%».',
            CASE OLD.estado WHEN 'A_CONFIRMAR' THEN 'a confirmar' WHEN 'EN_PROCESO' THEN 'en proceso' WHEN 'ENTREGADO' THEN 'entregado' WHEN 'PAGADO' THEN 'pagado' WHEN 'DEBE' THEN 'debe' WHEN 'CANCELADO' THEN 'cancelado' ELSE lower(OLD.estado::text) END,
            CASE NEW.estado WHEN 'A_CONFIRMAR' THEN 'a confirmar' WHEN 'EN_PROCESO' THEN 'en proceso' WHEN 'ENTREGADO' THEN 'entregado' WHEN 'PAGADO' THEN 'pagado' WHEN 'DEBE' THEN 'debe' WHEN 'CANCELADO' THEN 'cancelado' ELSE lower(NEW.estado::text) END;
    END IF;

    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.verificar_baja_de_nivel_firmada() RETURNS trigger
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
            'Para bajar el nivel (de % a %) hay que escribir el motivo: queda registrado quién lo decidió y cuándo.',
            lower(OLD.nivel::text),
            lower(NEW.nivel::text);
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_bloqueo_sin_reservas() RETURNS trigger
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
            'No se puede bloquear: hay % reserva(s) en ese período. Movelas o cancelalas primero.',
            cantidad;
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_cambio_de_moneda_con_plata_adentro() RETURNS trigger
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
            'No se puede pasar de % a %: ya tiene % pago(s) cargados en la otra moneda. Si estaba en la moneda equivocada, primero anulá esos pagos y después volvé a cargarlos.',
            CASE OLD.moneda WHEN 'USD' THEN 'dólares' ELSE 'pesos' END,
            CASE NEW.moneda WHEN 'USD' THEN 'dólares' ELSE 'pesos' END,
            en_otra_moneda;
    END IF;

    RETURN NEW;
END; $_$;


CREATE OR REPLACE FUNCTION public.verificar_clases_al_reactivar_reserva() RETURNS trigger
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
            'No se puede reactivar esa clase: el curso quedaría con % clases tomadas de % contratadas.',
            consumidas,
            contratadas;
        END IF;
    END LOOP;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_clases_contratadas() RETURNS trigger
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
            'Este curso tiene % clases contratadas y ya se tomaron %. Para sumar más clases, ampliá la inscripción desde Inscripciones.',
            contratadas,
            consumidas;
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_companero_de_ficha() RETURNS trigger
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
            'Los compañeros solo se pueden sumar en un pedido de curso.';
    END IF;

    IF v_disciplina = 'MENTORIA' THEN
        RAISE EXCEPTION
            'La mentoría es individual: no se puede hacer en grupo.';
    END IF;

    SELECT count(*) INTO v_actuales
    FROM solicitante_companero
    WHERE id_solicitante = NEW.id_solicitante;

    IF v_actuales + 1 > 2 THEN
        RAISE EXCEPTION
            'Un grupo es de hasta 3 personas: quien completa el formulario y hasta dos compañeros.';
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_escalera_de_preconfirmacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    -- (a) No se vuelve a preconfirmar algo que ya salio del plazo.
    IF NEW.estado = 'PRECONFIRMADA' THEN
        RAISE EXCEPTION
            'Esa reserva ya está %, y no puede volver a quedar apartada sin pago.',
            lower(OLD.estado::text);
    END IF;

    -- (b) Del plazo se sale cobrando o cancelando, y por ningun otro lado.
    IF OLD.estado = 'PRECONFIRMADA'
       AND NEW.estado NOT IN ('CONFIRMADA', 'CANCELADA') THEN
        RAISE EXCEPTION
            'Una reserva apartada solo puede confirmarse (cuando se registra el pago) o cancelarse.';
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_escalera_de_preinscripcion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    -- (a) A la preinscripción se entra sólo al nacer.
    IF NEW.estado = 'PREINSCRIPTA' THEN
        RAISE EXCEPTION
            'Esa inscripción ya está % y no puede volver a quedar esperando la seña.',
            lower(OLD.estado::text);
    END IF;

    IF OLD.estado = 'PREINSCRIPTA' THEN
        -- (b) Se sale señando o cancelando, y por ningún otro lado.
        IF NEW.estado NOT IN ('ACTIVA', 'CANCELADA') THEN
            RAISE EXCEPTION
            'Una preinscripción solo puede activarse (cuando se registra la seña) o cancelarse.';
        END IF;

        -- (c) Y a ACTIVA, sólo con plata cobrada detrás.
        IF NEW.estado = 'ACTIVA' AND NOT EXISTS (
                SELECT 1 FROM pago
                 WHERE id_inscripcion = NEW.id_inscripcion
                   AND estado_pago IN ('SENADO', 'PAGADO')) THEN
            RAISE EXCEPTION
            'Para activar la preinscripción tiene que estar registrada la seña. Registrá el pago de la seña y la inscripción se activa sola.';
        END IF;
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_inmutabilidad_del_comprobante() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.id_pago            IS DISTINCT FROM OLD.id_pago
       OR NEW.archivo_path    IS DISTINCT FROM OLD.archivo_path
       OR NEW.nombre_original IS DISTINCT FROM OLD.nombre_original
       OR NEW.id_usuario_carga IS DISTINCT FROM OLD.id_usuario_carga
       OR NEW.fecha_creacion  IS DISTINCT FROM OLD.fecha_creacion THEN
        RAISE EXCEPTION
            'Un comprobante adjunto no se puede cambiar. Si no corresponde, marcalo como inválido con el motivo y adjuntá el correcto: un pago puede tener varios.';
    END IF;

    IF OLD.invalido AND NOT NEW.invalido THEN
        RAISE EXCEPTION
            'Un comprobante marcado como inválido no vuelve a ser válido. Si era el correcto, adjuntá el archivo de nuevo.';
    END IF;

    IF OLD.invalido AND NEW.invalido
       AND (NEW.id_usuario_invalida IS DISTINCT FROM OLD.id_usuario_invalida
            OR NEW.fecha_invalidacion  IS DISTINCT FROM OLD.fecha_invalidacion
            OR NEW.motivo_invalidacion IS DISTINCT FROM OLD.motivo_invalidacion) THEN
        RAISE EXCEPTION
            'Quién marcó el comprobante como inválido, y por qué, no se puede cambiar.';
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_inmutabilidad_del_comprobante_de_egreso() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.id_egreso          IS DISTINCT FROM OLD.id_egreso
       OR NEW.archivo_path    IS DISTINCT FROM OLD.archivo_path
       OR NEW.nombre_original IS DISTINCT FROM OLD.nombre_original
       OR NEW.id_usuario_carga IS DISTINCT FROM OLD.id_usuario_carga
       OR NEW.fecha_creacion  IS DISTINCT FROM OLD.fecha_creacion THEN
        RAISE EXCEPTION
            'Un comprobante adjunto no se puede cambiar. Si no corresponde, marcalo como inválido con el motivo y adjuntá el correcto: un egreso puede tener varios.';
    END IF;

    IF OLD.invalido AND NOT NEW.invalido THEN
        RAISE EXCEPTION
            'Un comprobante marcado como inválido no vuelve a ser válido. Si era el correcto, adjuntá el archivo de nuevo.';
    END IF;

    IF OLD.invalido AND NEW.invalido
       AND (NEW.id_usuario_invalida IS DISTINCT FROM OLD.id_usuario_invalida
            OR NEW.fecha_invalidacion  IS DISTINCT FROM OLD.fecha_invalidacion
            OR NEW.motivo_invalidacion IS DISTINCT FROM OLD.motivo_invalidacion) THEN
        RAISE EXCEPTION
            'Quién marcó el comprobante como inválido, y por qué, no se puede cambiar.';
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_inscripcion_del_participante() RETURNS trigger
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
            'Ese curso es de otra persona: elegí uno de los cursos de quien toma la clase.';
    END IF;

    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.verificar_integrantes_al_commit() RETURNS trigger
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
            'Una inscripción tiene que tener al menos un alumno.';
    END IF;

    IF v_referentes <> 1 THEN
        RAISE EXCEPTION
            'Un grupo tiene que tener exactamente un referente: es a quien se le escribe y a cuyo nombre queda la deuda del grupo.';
    END IF;

    SELECT numero_grupo INTO v_numero
    FROM inscripcion WHERE id_inscripcion = v_id;

    IF (v_cantidad >= 2) <> (v_numero IS NOT NULL) THEN
        RAISE EXCEPTION
            'Solo los grupos de 2 o 3 personas llevan número de grupo.';
    END IF;

    RETURN NULL;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_liberacion_premaster() RETURNS trigger
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
            'No se puede liberar el premaster: el trabajo no tiene precio acordado, así que no hay cobro que lo cubra. Si igual hay que entregarlo, usá «Liberarlo igual, con motivo».';
    END IF;

    SELECT COALESCE(SUM(p.monto), 0) INTO cobrado
      FROM pago p
     WHERE p.id_trabajo_mastering = NEW.id_trabajo
       AND p.estado_pago IN ('SENADO', 'PAGADO')
       AND p.moneda = NEW.moneda;

    IF cobrado < NEW.precio_acordado THEN
        RAISE EXCEPTION
            'No se puede liberar el premaster: lo cobrado (%) no cubre el precio acordado (%). Si igual hay que entregarlo, usá «Liberarlo igual, con motivo».',
            (CASE NEW.moneda WHEN 'USD' THEN 'US$ ' ELSE '$ ' END || translate(to_char(cobrado, 'FM999,999,999,990.00'), ',.', '.,')),
            (CASE NEW.moneda WHEN 'USD' THEN 'US$ ' ELSE '$ ' END || translate(to_char(NEW.precio_acordado, 'FM999,999,999,990.00'), ',.', '.,'));
    END IF;

    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.verificar_moneda_del_pago_de_inscripcion() RETURNS trigger
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
            'El pago tiene que ir en la moneda del curso: el curso es en % y el pago se cargó en %. Si va a pagar en otra moneda, primero cambiá la moneda de la inscripción.',
            CASE moneda_del_contrato WHEN 'USD' THEN 'dólares' ELSE 'pesos' END,
            CASE NEW.moneda WHEN 'USD' THEN 'dólares' ELSE 'pesos' END;
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_moneda_del_pago_de_reserva() RETURNS trigger
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
            'El pago tiene que ir en la moneda de la reserva: la reserva es en % y el pago se cargó en %. Si va a pagar en otra moneda, primero cambiá la moneda de la reserva.',
            CASE moneda_de_la_reserva WHEN 'USD' THEN 'dólares' ELSE 'pesos' END,
            CASE NEW.moneda WHEN 'USD' THEN 'dólares' ELSE 'pesos' END;
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_moneda_del_pago_de_trabajo() RETURNS trigger
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
            'El cobro tiene que ir en la moneda del trabajo: el trabajo es en % y el pago se cargó en %. Si pagan en otra moneda, cargá el monto convertido con la cotización del día.',
            CASE moneda_del_trabajo WHEN 'USD' THEN 'dólares' ELSE 'pesos' END,
            CASE NEW.moneda WHEN 'USD' THEN 'dólares' ELSE 'pesos' END;
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_nota_del_alumno() RETURNS trigger
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
            'Esa clase no es de este alumno: elegí una clase que haya tomado.';
    END IF;

    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.verificar_pago_al_anular() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- La enorme mayoria de los pagos no apunta a una reserva: se sale barato.
    IF NEW.id_reserva IS NULL THEN
        RETURN NEW;
    END IF;

    IF reserva_sin_plata_detras(NEW.id_reserva) THEN
        RAISE EXCEPTION
            'Ese pago es la seña que sostiene una reserva. Si se devuelve la seña, primero cancelá la reserva y después anulá el pago.';
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_participantes_al_mover_reserva() RETURNS trigger
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
            'No se puede mover la clase: alguien anotado ya tiene otra reserva el % de % a %.',
            to_char(choque.fecha, 'DD/MM/YYYY'),
            to_char(choque.hora_inicio, 'HH24:MI'),
            to_char(choque.hora_fin, 'HH24:MI');
        END IF;
    END LOOP;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_persona_sin_solapamiento() RETURNS trigger
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
            'Esa persona ya tiene otra reserva el % de % a %.',
            to_char(choque.fecha, 'DD/MM/YYYY'),
            to_char(choque.hora_inicio, 'HH24:MI'),
            to_char(choque.hora_fin, 'HH24:MI');
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_publicacion_con_contrato() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado <> 'PUBLICADO' OR NEW.publicado_sin_contrato THEN
        RETURN NEW;
    END IF;

    IF NOT release_tiene_contrato(NEW.id_release, NEW.id_artista) THEN
        RAISE EXCEPTION
            'El release % no se puede publicar todavía: no tiene contrato adjunto, ni propio ni general del artista. Adjuntá el contrato, o usá «Publicarlo igual, con motivo».',
            NEW.codigo_release;
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_que_el_release_lleva_temas() RETURNS trigger
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
            'El release % todavía no tiene formato: elegí primero si es un EP o un álbum. Un single o un remix no llevan lista de temas.',
            v_codigo;
    END IF;

    IF v_tipo NOT IN ('EP', 'ALBUM') THEN
        RAISE EXCEPTION
            'El release % es un %: solo un EP o un álbum llevan lista de temas.',
            v_codigo,
            CASE v_tipo WHEN 'ALBUM' THEN 'álbum' WHEN 'EP' THEN 'EP' WHEN 'SINGLE' THEN 'single' WHEN 'REMIX' THEN 'remix' ELSE lower(v_tipo::text) END;
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_que_el_tipo_admite_los_temas() RETURNS trigger
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
            'El release % tiene % tema(s) cargados, así que no puede pasar a %: solo un EP o un álbum llevan lista de temas. Si de verdad cambió de formato, sacale los temas primero.',
            NEW.codigo_release,
            v_temas,
            coalesce(CASE NEW.tipo_release WHEN 'ALBUM' THEN 'álbum' WHEN 'EP' THEN 'EP' WHEN 'SINGLE' THEN 'single' WHEN 'REMIX' THEN 'remix' ELSE lower(NEW.tipo_release::text) END, 'sin formato');
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_rango_de_temas() RETURNS trigger
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
            'El release % es un % y tiene % tema(s) cargados: un % lleva entre % y %. Completá la lista de temas y después publicalo.',
            NEW.codigo_release,
            CASE NEW.tipo_release WHEN 'ALBUM' THEN 'álbum' WHEN 'EP' THEN 'EP' WHEN 'SINGLE' THEN 'single' WHEN 'REMIX' THEN 'remix' ELSE lower(NEW.tipo_release::text) END,
            v_temas,
            CASE NEW.tipo_release WHEN 'ALBUM' THEN 'álbum' WHEN 'EP' THEN 'EP' WHEN 'SINGLE' THEN 'single' WHEN 'REMIX' THEN 'remix' ELSE lower(NEW.tipo_release::text) END,
            v_minimo,
            v_maximo;
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_sala_activa() RETURNS trigger
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
            'Esa sala está desactivada y no acepta reservas nuevas.';
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_sala_no_bloqueada() RETURNS trigger
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
            'Esa sala está bloqueada el % de % a %.',
            to_char(NEW.fecha, 'DD/MM/YYYY'),
            to_char(NEW.hora_inicio, 'HH24:MI'),
            to_char(NEW.hora_fin, 'HH24:MI');
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_sena_al_reactivar_reserva() RETURNS trigger
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
            'Esa reserva no se puede reactivar porque su seña fue devuelta. Para reactivarla, registrá el pago de nuevo.';
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_sena_de_la_reserva() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF reserva_sin_plata_detras(NEW.id_reserva) THEN
        RAISE EXCEPTION
            'No se puede tomar un horario sin pago adelantado. Registrá la seña de la reserva, o anotá al alumno con su curso, que ya la cubre.';
    END IF;
    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_tamanio_del_grupo() RETURNS trigger
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
            'La mentoría es individual: no se puede hacer en grupo.';
        END IF;
        RAISE EXCEPTION
            'Un grupo es de hasta 3 personas, y esta inscripción ya tiene %.',
            v_actuales;
    END IF;

    RETURN NEW;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_una_abierta_por_disciplina(p_id_inscripcion bigint, p_id_alumno bigint) RETURNS void
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
            '% ya tiene un curso de % abierto (activo o esperando la seña). No puede estar en dos a la vez de la misma disciplina: cerrá ese antes.',
            v_nombre,
            CASE v_disciplina WHEN 'DJ' THEN 'DJ' WHEN 'PRODUCCION' THEN 'Producción' WHEN 'MENTORIA' THEN 'Mentoría' ELSE v_disciplina::text END;
    END IF;
END; $$;


CREATE OR REPLACE FUNCTION public.verificar_uso_solicitable() RETURNS trigger
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
            '«%» no se puede pedir desde acá: esa reserva la arma el estudio. Desde acá se pide la cabina para alquilar o para grabar un set.',
            nombre_del_uso;
    END IF;

    RETURN NEW;
END; $$;
