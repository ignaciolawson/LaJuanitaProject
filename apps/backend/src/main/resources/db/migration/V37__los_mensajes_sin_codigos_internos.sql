-- =============================================================================
-- V37 — Los mensajes de las reglas, sin códigos internos
-- =============================================================================
--
-- Siete mensajes de trigger terminaban con el número de la decisión que los
-- originó —"(P74)", "(P67, P88)"— y ese texto llega tal cual a la pantalla
-- (`ManejadorDeErrores` devuelve el RAISE como 409). A quien lo lee no le dice
-- nada: la referencia es para el que mantiene el sistema, y ya vive en el
-- COMMENT ON de cada función y en la cabecera de su migración.
--
-- Cada función se reescribe IGUAL a la original salvo el texto del mensaje.
-- No se toca ningún trigger: `CREATE OR REPLACE FUNCTION` los deja apuntando
-- a la versión nueva. Los COMMENT ON quedan como estaban, con sus códigos.
-- =============================================================================


-- V31 §1
CREATE OR REPLACE FUNCTION verificar_moneda_del_pago_de_inscripcion()
RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;


-- V32 §1
CREATE OR REPLACE FUNCTION verificar_moneda_del_pago_de_trabajo()
RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;


-- V33 §2
CREATE OR REPLACE FUNCTION verificar_moneda_del_pago_de_reserva()
RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;


-- V33 §3
CREATE OR REPLACE FUNCTION verificar_cambio_de_moneda_con_plata_adentro()
RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;


-- V35 §4 (a)
CREATE OR REPLACE FUNCTION verificar_tamanio_del_grupo()
RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;


-- V35 §4 (c)
CREATE OR REPLACE FUNCTION prohibir_cambio_de_integrantes()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'Los integrantes de una inscripcion son fijos: no se sacan, no se '
        'cambian y no se agregan despues. Si el grupo cambia, se cancela la '
        'inscripcion y se da de alta la nueva.';
END; $$ LANGUAGE plpgsql;


-- V36 §2 (a)
CREATE OR REPLACE FUNCTION verificar_companero_de_ficha()
RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;
