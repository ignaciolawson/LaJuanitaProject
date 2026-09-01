-- ============================================================================
-- V22 — LA CLASE SE DESCUENTA SOLA
--
-- `mejoras.md` §12 · C1, con sus dos preguntas de negocio ya contestadas en
-- `requirements/platform.md` §17 (P39 y P40).
--
-- EL PROBLEMA, con las palabras de Ignacio: *"uno podría reservar sala para
-- producción y descontar de clase de DJ sin querer"*. Hoy, al anotar a alguien
-- en una clase, un <select> llamado "Descuenta de" ofrece TODAS sus
-- inscripciones vigentes sin mirar para qué es la reserva.
--
-- LO QUE FALTABA NO ERA UNA VALIDACIÓN, ERA UN DATO. La correspondencia
-- tipo de uso → disciplina no vive en ninguna capa: está implícita en los
-- nombres (CLASE_DJ→DJ, PRODUCCION_MUSICAL→PRODUCCION, MENTORIA→MENTORIA) y en
-- la cabeza de quien carga. Es la cuarta vez que este proyecto encuentra una
-- regla del negocio que ninguna capa enuncia — §8 del Módulo 5, V16, y la regla
-- del contrato del Módulo 7 fueron las otras tres— y siempre por el mismo
-- motivo: **una regla que nadie implementa no tiene nada que fallar.**
--
-- VA COMO COLUMNA Y NO COMO UN Map EN JAVA, por el precedente que escribió la
-- propia V1 para la matriz sala×uso: *"es una tabla y no reglas en el código a
-- propósito: el día que compren una tele y una silla para la cabina de
-- grabación, la regla se cambia desde una pantalla, sin migración ni deploy"*.
-- Un Map sería una segunda definición de algo que ya es catálogo, y este
-- proyecto ya paga esa deuda dos veces (contarClasesConsumidas contra V9 §5).
-- ============================================================================


-- --- 1. La disciplina de un tipo de uso --------------------------------------
--
-- NULLABLE, y tiene que serlo: los tres usos que no son clase no tienen
-- disciplina, y ésa es justamente la información. `disciplina IS NULL` significa
-- "no descuenta", que es un hecho del catálogo y no un dato faltante.
ALTER TABLE tipo_uso
    ADD COLUMN disciplina VARCHAR(20);

COMMENT ON COLUMN tipo_uso.disciplina IS
    'De qué curso descuenta una clase de este tipo. NULL = no descuenta. '
    'Es el dato del que sale la inscripción al anotar a alguien (V22).';

ALTER TABLE tipo_uso
    ADD CONSTRAINT tipo_uso_disciplina_valida
        CHECK (disciplina IS NULL OR disciplina IN ('DJ', 'PRODUCCION', 'MENTORIA'));


-- --- 2. Los tres tipos de clase, con su disciplina ---------------------------
--
-- Por `codigo` y no por id: los ids son IDENTITY y un INSERT rechazado consume
-- el valor, así que no son estables ni entre bases (es la regla que las suites
-- SQL de este proyecto aprendieron a golpes).
UPDATE tipo_uso SET disciplina = 'DJ'         WHERE codigo = 'CLASE_DJ';
UPDATE tipo_uso SET disciplina = 'PRODUCCION' WHERE codigo = 'PRODUCCION_MUSICAL';
UPDATE tipo_uso SET disciplina = 'MENTORIA'   WHERE codigo = 'MENTORIA';


-- --- 3. La coherencia entre `es_clase` y `disciplina` ------------------------
--
-- Los dos sentidos, y el segundo es el que importa:
--
--   * Algo que descuenta clases tiene que SER una clase. Sin esto, alguien
--     podría hacer que un alquiler de cabina descuente del curso.
--   * **Y una clase tiene que decir de qué curso descuenta.** Ésta es la mitad
--     que evita el modo de falla silenciosa: un tipo de uso nuevo con
--     `es_clase = TRUE` y la disciplina en NULL no fallaría nunca — se dictarían
--     clases que no le bajan de ningún curso a nadie, que es exactamente la
--     "clase fantasma" que §17 · P39 describe.
--
-- Es el mismo CHECK de dos direcciones que `material_destinatario_definido`.
--
-- ⚠️ Si algún día existe una clase que NO descuenta (una charla abierta, una
-- clase de prueba), esto hay que revisarlo A PROPÓSITO en otra migración. Eso es
-- lo que se quiere: una decisión explícita y no un NULL que alguien se olvidó.
ALTER TABLE tipo_uso
    ADD CONSTRAINT tipo_uso_disciplina_coherente
        CHECK ((es_clase AND disciplina IS NOT NULL)
            OR (NOT es_clase AND disciplina IS NULL));
