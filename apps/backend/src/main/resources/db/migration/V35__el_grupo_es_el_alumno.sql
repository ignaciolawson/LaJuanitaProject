-- =============================================================================
-- V35 — El grupo ES el alumno: una inscripción es el contrato de 1 a 3 personas
--
-- Fase 1 de la décima barrida (`docs/mejoras.md` §22), decidida en
-- `docs/requirements/platform.md` §28 · P87–P91.
--
--
-- EL PEDIDO
--
-- Ignacio: *"el «Grupo» tal como dice la palabra se mueve como 1, es LA seña de
-- EL grupo, no de cada persona que lo integra; en vez de 1 alumno es 1 grupo de
-- 2 o de 3"*. Precio por tamaño (300 / 380 / 447: no es fórmula, se escribe),
-- una sola seña, misma hora, mismo día, mismo profe; el que no va se lo pierde
-- él; el que se baja, se cancela y se rehace; hasta 3 es regla dura.
--
-- `V23` dejó escrito *"«el curso» no es una entidad compartida en este schema:
-- una `inscripcion` es el contrato de UNA persona"*. Esta migración le cambia
-- una palabra: es el contrato de UN GRUPO DE 1 A 3 PERSONAS, y el alumno solo
-- es un grupo de 1. Todo lo demás de la inscripción —precio, moneda, seña,
-- nivel, clases contratadas, estado, profesor, vencimiento— queda como está y
-- pasa a ser del grupo. `V30`, `V31`, `V33` y Deudores no se tocan: ya trabajan
-- por inscripción.
--
--
-- LO QUE HACE
--
-- §1  `programa.precio_2` y `precio_3`, nullable: el precio de a dos y de a
--     tres. NULL = "no hay precio cargado" (la forma de `V28` para la
--     mentoría), y se cargan desde /admin/programas. La mentoría no admite
--     grupos (P88: P67 la define 1:1) y eso lo dice §4 por disciplina, no por
--     el precio — un NULL no puede significar dos cosas.
--
-- §2  `inscripcion_integrante`: (inscripción, alumno, referente). El referente
--     es quien recibe el WhatsApp de la seña y bajo cuyo nombre está la deuda
--     en Deudores; exactamente uno por inscripción. Y `inscripcion.numero_grupo`,
--     el correlativo propio de los grupos de 2 o 3 (*"Grupo 8"*), NULL para
--     un alumno solo: un alumno solo no es "grupo 12", se muestra por su
--     nombre.
--
-- §3  LA MIGRACIÓN DE DATOS Y EL DROP. Cada inscripción existente recibe un
--     integrante (su alumno, referente) y `inscripcion.id_alumno` SE VA. No se
--     deja nullable al lado de la tabla nueva: sería el par de definiciones
--     que `V23` justamente eliminó (`id_alumno` + `es_grupal`), y que el
--     compilador y las suites digan dónde falta cada cosa es lo que hace
--     seguro un cambio que toca 28 archivos Java.
--
-- §4  LAS REGLAS DEL GRUPO, cuatro triggers:
--     (a) hasta 3, y la mentoría hasta 1 — inmediato, al insertar el que sobra;
--     (b) al COMMIT: al menos uno, exactamente un referente, y el número de
--         grupo si y sólo si son 2 o 3 — diferido como `V10`, porque al
--         insertar la inscripción sus integrantes todavía no están;
--     (c) los integrantes son fijos: ni DELETE ni cambiar de alumno — la forma
--         de `V26` §4: sin esto la regla dura dura lo que dura un DELETE. El
--         camino para un grupo que cambia es cancelar y rehacer (P89);
--     (d) UNA ABIERTA POR ALUMNO Y DISCIPLINA deja de ser el índice único
--         parcial de `V1`/`V30` §3 — el alumno queda en la tabla hija y el
--         estado en la madre, y un índice no cruza tablas — y pasa a ser un
--         trigger EN LAS DOS DIRECCIONES (`V22`): al agregar un integrante, y
--         al cambiar el estado o la disciplina de la inscripción. El mensaje
--         dice quién.
--
-- §5  DOS REGLAS DE `V1` Y `V9` REESCRITAS, que sin esto mentirían:
--     · `V1` §8.2 (la inscripción que se descuenta es del que asiste) buscaba
--       `inscripcion.id_alumno`; ahora busca al participante entre los
--       integrantes.
--     · `V9` §5 (no se consumen más clases que las contratadas) contaba
--       PARTICIPACIONES por inscripción: con tres integrantes en una reserva,
--       una clase de grupo consumía TRES clases. Las dos funciones pasan a
--       contar RESERVAS DISTINTAS. Es la definición que `contarClasesConsumidas`
--       repite en Java, y las dos se mueven juntas (P90).
--
--
-- LO QUE NO HACE, A PROPÓSITO
--
-- · No hay cupo (P60 sigue): el grupo se mueve como uno pero no aparta nada.
-- · No hay "agregar" ni "sacar" integrante, y no lo va a haber.
-- · No decide el 50% de la seña ni qué precio se copia: eso es del servicio,
--   como en `V28` §2 y `V30` §4.
-- · `nota_profesor`, `seguimiento_alumno` y la asistencia siguen por persona:
--   el grupo cursa junto, la nota es de cada uno.
--
--
-- ⚠️ LO QUE ESTO CAMBIA PARA LAS SUITES Y LOS TESTS
--
-- Un `INSERT INTO inscripcion` suelto ya no puede existir: por §4 (b) al
-- COMMIT tiene que tener su integrante, y en psql (autocommit) el rechazo cae
-- AFUERA de `probar()` y el caso desaparece del resumen — la trampa de `V10`.
-- Las suites ganan un helper `inscribir(...)` que inserta las dos filas en una
-- sentencia, el gemelo de `sena()`.
-- =============================================================================


-- =============================================================================
-- 1. EL CATÁLOGO: TRES PRECIOS POR PROGRAMA
-- =============================================================================

ALTER TABLE programa
    ADD COLUMN precio_2 NUMERIC(14,2),
    ADD COLUMN precio_3 NUMERIC(14,2);

ALTER TABLE programa ADD CONSTRAINT programa_precios_de_grupo_no_negativos
    CHECK ((precio_2 IS NULL OR precio_2 >= 0) AND (precio_3 IS NULL OR precio_3 >= 0));

COMMENT ON COLUMN programa.precio_2 IS
    'V35 §1: precio del programa para un grupo de 2 (el total del grupo, no por persona). NULL = sin precio cargado. No es formula sobre `precio`: se escribe (P88).';
COMMENT ON COLUMN programa.precio_3 IS
    'V35 §1: precio del programa para un grupo de 3. NULL = sin precio cargado. La mentoria no admite grupos y lo dice el trigger de integrantes, no este NULL.';

DO $$
BEGIN
    RAISE NOTICE 'V35: los precios de a 2 y de a 3 quedan vacios en DJ y PRODUCCION. Se cargan desde /admin/programas; hasta entonces el alta de un grupo pide el precio a mano.';
END $$;


-- =============================================================================
-- 2. LOS INTEGRANTES, EL REFERENTE Y EL NÚMERO DE GRUPO
-- =============================================================================

CREATE TABLE inscripcion_integrante (
    -- Clave propia y no la compuesta (inscripción, alumno): la compuesta sigue
    -- siendo única abajo, pero una entidad JPA con clave compuesta cuesta más
    -- de lo que vale para una tabla de tres columnas.
    id_integrante    BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_inscripcion   BIGINT      NOT NULL REFERENCES inscripcion (id_inscripcion),
    id_alumno        BIGINT      NOT NULL REFERENCES alumno (id_alumno),

    -- Uno por inscripción: a él le va el WhatsApp de la seña y bajo su nombre
    -- está la deuda del grupo en Deudores. En un alumno solo, es él mismo.
    referente        BOOLEAN     NOT NULL DEFAULT FALSE,

    fecha_creacion   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT integrante_unico_por_inscripcion UNIQUE (id_inscripcion, id_alumno)
);

CREATE UNIQUE INDEX inscripcion_un_solo_referente
    ON inscripcion_integrante (id_inscripcion)
    WHERE referente;

CREATE INDEX integrante_por_alumno ON inscripcion_integrante (id_alumno);

COMMENT ON TABLE inscripcion_integrante IS
    'V35 §2: quienes cursan una inscripcion, de 1 a 3. El alumno solo es un grupo de 1. Fijos al nacer (§4 c): un grupo que cambia se cancela y se rehace (P89).';

ALTER TABLE inscripcion ADD COLUMN numero_grupo INTEGER;

ALTER TABLE inscripcion ADD CONSTRAINT inscripcion_numero_grupo_unico
    UNIQUE (numero_grupo);

CREATE SEQUENCE inscripcion_numero_grupo_seq AS INTEGER START WITH 1;

COMMENT ON COLUMN inscripcion.numero_grupo IS
    'V35 §2: correlativo propio de los grupos de 2 o 3 ("Grupo 8"), de inscripcion_numero_grupo_seq; NULL para un alumno solo. Lo asigna el servicio al nacer y §4 (b) exige que este si y solo si son 2 o mas.';


-- =============================================================================
-- 3. LA MIGRACIÓN DE DATOS, Y EL DROP
-- =============================================================================

INSERT INTO inscripcion_integrante (id_inscripcion, id_alumno, referente)
SELECT id_inscripcion, id_alumno, TRUE
FROM inscripcion;

DO $$
DECLARE
    n INTEGER;
BEGIN
    SELECT count(*) INTO n FROM inscripcion_integrante;
    RAISE NOTICE 'V35: % inscripciones existentes pasaron a tener su integrante (su alumno, referente). Ninguna es un grupo todavia.', n;
END $$;

-- El índice de `V30` §3 se va con la columna; se nombra el DROP para que se
-- lea, porque su regla sigue viva en §4 (d) con otra forma.
DROP INDEX inscripcion_una_activa_por_disciplina;
DROP INDEX inscripcion_por_alumno;

ALTER TABLE inscripcion DROP COLUMN id_alumno;


-- =============================================================================
-- 4. LAS REGLAS DEL GRUPO
-- =============================================================================

-- --- (a) Hasta 3; la mentoría, 1 --------------------------------------------
--
-- Un CHECK no cuenta filas. Inmediato: el que sobra se rechaza al insertarlo,
-- con el mensaje, y no al COMMIT con un error que no dice cuál era.
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
                'La mentoria es 1:1 y no admite grupos (P67, P88).';
        END IF;
        RAISE EXCEPTION
            'Un grupo es de hasta 3 personas; esta inscripcion ya tiene %.',
            v_actuales;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER integrante_hasta_tres
    BEFORE INSERT ON inscripcion_integrante
    FOR EACH ROW EXECUTE FUNCTION verificar_tamanio_del_grupo();

COMMENT ON FUNCTION verificar_tamanio_del_grupo() IS
    'V35 §4 (a): hasta 3 integrantes por inscripcion, 1 en la mentoria. Regla dura (P89).';


-- --- (b) Al COMMIT: al menos uno, un referente, y el número si son 2 o 3 -----
--
-- Diferido como `V10`: al insertar la inscripción los integrantes no existen
-- todavía. Cuelga de las DOS tablas —de `inscripcion` al nacer, de
-- `inscripcion_integrante` al insertar— para que ninguna de las dos mitades
-- pueda quedar coja: una inscripción sin nadie, o un referente de más.
CREATE OR REPLACE FUNCTION verificar_integrantes_al_commit()
RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER inscripcion_con_integrantes
    AFTER INSERT ON inscripcion
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION verificar_integrantes_al_commit();

CREATE CONSTRAINT TRIGGER integrante_deja_el_grupo_coherente
    AFTER INSERT OR UPDATE ON inscripcion_integrante
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION verificar_integrantes_al_commit();

COMMENT ON FUNCTION verificar_integrantes_al_commit() IS
    'V35 §4 (b): al COMMIT una inscripcion tiene entre 1 y 3 integrantes, exactamente un referente, y numero_grupo si y solo si son 2 o 3. Diferido como V10.';


-- --- (c) Los integrantes son fijos -------------------------------------------
--
-- Es la mitad que hace que (a) valga algo (`V26` §4, `V18` §1b): con DELETE
-- libre, "hasta 3" se esquiva sacando uno, metiendo otro y volviendo a poner
-- el primero. Y no hay caso legítimo que lo necesite: el que se baja antes de
-- empezar se resuelve cancelando la inscripción y dando de alta la nueva
-- (P89), y el que deja de venir después, se lo pierde él. Cambiar el
-- referente tampoco: es un dato del contrato, no un estado.
CREATE OR REPLACE FUNCTION prohibir_cambio_de_integrantes()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'Los integrantes de una inscripcion son fijos: no se sacan, no se '
        'cambian y no se agregan despues. Si el grupo cambia, se cancela la '
        'inscripcion y se da de alta la nueva (P89).';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER integrante_no_se_borra
    BEFORE DELETE ON inscripcion_integrante
    FOR EACH ROW EXECUTE FUNCTION prohibir_cambio_de_integrantes();

CREATE TRIGGER integrante_no_se_cambia
    BEFORE UPDATE OF id_inscripcion, id_alumno, referente ON inscripcion_integrante
    FOR EACH ROW EXECUTE FUNCTION prohibir_cambio_de_integrantes();


-- --- (d) Una abierta por alumno y disciplina, en las dos direcciones ---------
--
-- Era `inscripcion_una_activa_por_disciplina` (`V1`, ampliado en `V30` §3):
-- `UNIQUE (id_alumno, disciplina) WHERE estado IN ('ACTIVA','PREINSCRIPTA')`.
-- La regla es la misma y la lista también (`EstadoInscripcion.ABIERTAS`:
-- PAUSADA sigue afuera, "dos vigentes en DJ" sigue siendo posible y el
-- servidor resuelve sólo la ACTIVA). Lo que cambia es dónde vive: un índice
-- no cruza tablas, así que son dos disparos de una función —al sumar un
-- integrante, y al abrir una inscripción (cambio de estado o de disciplina).
--
-- ⚠️ Un índice único también sostenía la regla entre dos transacciones
-- concurrentes; un trigger no. Es el mismo margen que `UsuarioService` tenía
-- con el email antes de apoyarse en el índice, y acá no hay índice posible.
-- Dos altas simultáneas de la misma persona en la misma disciplina son un
-- caso de dos personas cargando al mismo alumno en el mismo segundo; se acepta
-- y queda escrito.
CREATE OR REPLACE FUNCTION verificar_una_abierta_por_disciplina(
    p_id_inscripcion BIGINT, p_id_alumno BIGINT)
RETURNS void AS $$
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
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION verificar_integrante_sin_otra_abierta()
RETURNS TRIGGER AS $$
DECLARE
    v_estado TEXT;
BEGIN
    SELECT estado INTO v_estado
    FROM inscripcion WHERE id_inscripcion = NEW.id_inscripcion;

    IF v_estado IN ('ACTIVA', 'PREINSCRIPTA') THEN
        PERFORM verificar_una_abierta_por_disciplina(NEW.id_inscripcion, NEW.id_alumno);
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER integrante_sin_otra_abierta
    BEFORE INSERT ON inscripcion_integrante
    FOR EACH ROW EXECUTE FUNCTION verificar_integrante_sin_otra_abierta();

CREATE OR REPLACE FUNCTION verificar_inscripcion_al_abrirse()
RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;

-- AFTER y no BEFORE: la función lee `inscripcion` por id para saber la
-- disciplina, y en un BEFORE todavía vería la fila vieja.
CREATE TRIGGER inscripcion_sin_otra_abierta
    AFTER UPDATE OF estado, disciplina ON inscripcion
    FOR EACH ROW EXECUTE FUNCTION verificar_inscripcion_al_abrirse();

COMMENT ON FUNCTION verificar_una_abierta_por_disciplina(BIGINT, BIGINT) IS
    'V35 §4 (d): una persona tiene a lo sumo una inscripcion ACTIVA/PREINSCRIPTA por disciplina (era el indice unico parcial de V1/V30 §3). Dos disparos: al sumar un integrante y al abrirse la inscripcion.';


-- =============================================================================
-- 5. LAS REGLAS DE `V1` §8.2 Y `V9` §5, REESCRITAS
-- =============================================================================

-- --- V1 §8.2: la inscripción que se descuenta es de quien asiste -------------
CREATE OR REPLACE FUNCTION verificar_inscripcion_del_participante()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;


-- --- V9 §5: no se consumen más clases que las contratadas --------------------
--
-- Una clase del grupo es UNA clase: se cuentan reservas distintas. Al anotar
-- al segundo integrante en una clase que ya tiene al primero, la reserva ya
-- está en la cuenta y el +1 la reemplaza, así que el total no se mueve.
CREATE OR REPLACE FUNCTION verificar_clases_contratadas()
RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION verificar_clases_al_reactivar_reserva()
RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verificar_clases_contratadas() IS
    'V9 §5, reescrita en V35 §5: cuenta RESERVAS distintas por inscripcion, no participaciones -- una clase de grupo es una clase. Misma definicion que contarClasesConsumidas en Java.';
