-- ============================================================================
-- V23 — EL MATERIAL ES DE UN CURSO, Y PUEDE SER DE UNA CLASE
--
-- `mejoras.md` §12 · C2, con su pregunta de negocio contestada en
-- `requirements/platform.md` §18 · P41: *"el profe sube el material para su
-- alumno de su programa de esa clase, punto"*, y puede ser del curso entero.
--
-- LO QUE HABÍA, Y ERA PEOR QUE "FALTA UNA COLUMNA". `material` colgaba de
-- `profesor` y de `alumno`, sin ninguna columna de curso ni de clase, y el
-- material "grupal" (id_alumno NULL) NO SE FILTRABA POR NADA: la consulta
-- `paraElAlumno` lo daba a TODOS los alumnos del estudio, incluidos los que
-- nunca tuvieron a ese profesor. Y las tres pantallas decían tres cosas
-- distintas —"Todos mis alumnos", "Para todos", "para todo el curso"— y ninguna
-- era ésa.
--
-- ⚠️ Nadie mintió a propósito: NADIE DECIDIÓ NUNCA QUÉ SIGNIFICABA. Es la quinta
-- vez que este proyecto encuentra una regla del negocio que ninguna capa enuncia
-- (§8 del Módulo 5, V16, la del contrato del Módulo 7, la correspondencia
-- tipo_uso→disciplina de V22) y la primera en que las capas además se
-- contradicen entre sí.
--
-- LA FORMA ES LA MISMA QUE ESTRENÓ V22: el profesor elige la clase y el sistema
-- deriva el resto, en vez de un control que deja elegir mal.
--
-- ⚠️ Y "EL CURSO" NO ES UNA ENTIDAD COMPARTIDA EN ESTE ESQUEMA. `inscripcion` es
-- el contrato de UN alumno (id_alumno + disciplina + nivel + clases + precio):
-- no hay comisiones ni grupos. Por eso el material cuelga de la INSCRIPCIÓN y no
-- de un "curso": "material de todo el curso" significa "de todo el curso DE ESE
-- ALUMNO", que es exactamente su inscripción sin clase puntual.
-- ============================================================================


-- --- 1. Las dos columnas nuevas ---------------------------------------------
--
-- Entra nullable para poder mirar lo que ya está cargado; el NOT NULL se pone
-- en el paso 3, después de resolver esas filas.
ALTER TABLE material
    ADD COLUMN id_inscripcion BIGINT REFERENCES inscripcion (id_inscripcion),
    ADD COLUMN id_reserva     BIGINT REFERENCES reserva (id_reserva);

COMMENT ON COLUMN material.id_inscripcion IS
    'De qué curso es este material. Dice el programa Y el alumno, porque una '
    'inscripcion es el contrato de un alumno. NOT NULL: no existe el material '
    'sin destinatario (V23).';

COMMENT ON COLUMN material.id_reserva IS
    'De qué clase es, si es de una. NULL = del curso entero, que es material '
    'del programa y no de una clase puntual (V23, P41).';


-- --- 2. Lo que ya estaba cargado --------------------------------------------
--
-- Se migra SOLO lo que se puede resolver sin adivinar: un material que apunta a
-- un alumno que tiene EXACTAMENTE UNA inscripcion. Con dos, elegir seria
-- inventar de que curso es -- que es el mismo error que V22 vino a eliminar del
-- otro lado, y el precedente de V21 §2 es no fabricar datos que no existen.
UPDATE material m
   SET id_inscripcion = (SELECT i.id_inscripcion
                           FROM inscripcion i
                          WHERE i.id_alumno = m.id_alumno)
 WHERE m.id_alumno IS NOT NULL
   AND (SELECT count(*) FROM inscripcion i WHERE i.id_alumno = m.id_alumno) = 1;

-- El resto no es reconstruible: un material "grupal" no tiene destinatario que
-- recuperar, y uno de un alumno con dos cursos no dice de cual es. Se borran y
-- se dice cuales, en vez de dejarlos con la columna en NULL -- que obligaria a
-- que la regla naciera floja para siempre.
--
-- `material` no es historial protegido: las tablas que este esquema prohibe
-- borrar son las de la plata y las de las clases dictadas (V6 §7, V7, V9).
DO $$
DECLARE
    huerfanos TEXT;
BEGIN
    SELECT string_agg(id_material::TEXT || ' (' || titulo || ')', ', ')
      INTO huerfanos
      FROM material
     WHERE id_inscripcion IS NULL;

    IF huerfanos IS NOT NULL THEN
        RAISE NOTICE 'V23: se borran % material(es) sin curso derivable: %',
            (SELECT count(*) FROM material WHERE id_inscripcion IS NULL), huerfanos;
        DELETE FROM material WHERE id_inscripcion IS NULL;
    END IF;
END $$;


-- --- 3. Ahora sí, obligatoria -----------------------------------------------
ALTER TABLE material
    ALTER COLUMN id_inscripcion SET NOT NULL;


-- --- 4. Se van el destinatario viejo y su regla ------------------------------
--
-- `id_alumno` y `es_grupal` eran EL PAR que definia el destinatario, y la
-- inscripcion los reemplaza a los dos: dice de quien es y de que curso. Dejarlos
-- seria tener dos definiciones del destinatario, que es la deuda que este
-- proyecto ya paga en otros lados y no hace falta sumarle una.
ALTER TABLE material
    DROP CONSTRAINT material_destinatario_definido;

DROP INDEX IF EXISTS material_por_alumno;

ALTER TABLE material
    DROP COLUMN id_alumno,
    DROP COLUMN es_grupal;


-- --- 5. La clase tiene que ser de ese curso ---------------------------------
--
-- ⚠️ ESTA ES LA REGLA QUE HACE QUE LAS COLUMNAS SIRVAN. Sin ella se puede colgar
-- material de la inscripcion de Juan sobre una clase de Ana: las dos columnas
-- serian validas por separado y la fila mentiria igual. Es el mismo agujero que
-- `V1` §8.2 cierra en `reserva_participante`, y se cierra igual.
--
-- Y se pide UNA sola condicion, no tres: que exista la participacion de esa
-- inscripcion en esa reserva. Eso garantiza de una vez que la clase sea de ese
-- alumno Y de ese curso -- porque `reserva_participante.id_inscripcion` es,
-- desde V22, la que sale del tipo de uso de la reserva.
CREATE OR REPLACE FUNCTION material_clase_del_curso() RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER material_clase_del_curso
    BEFORE INSERT OR UPDATE OF id_reserva, id_inscripcion ON material
    FOR EACH ROW EXECUTE FUNCTION material_clase_del_curso();


-- --- 6. Los indices de lo que se consulta ------------------------------------
--
-- Las dos preguntas de las pantallas: "que material tiene este alumno" (por
-- inscripcion) y "que material es de esta clase".
CREATE INDEX material_por_inscripcion ON material (id_inscripcion);
CREATE INDEX material_por_reserva     ON material (id_reserva) WHERE id_reserva IS NOT NULL;
