-- =============================================================================
-- Auditoría de la plata y del historial de clases — hallazgos DB-01, DB-02,
-- DB-03, DB-07 y DB-09 de la auditoría técnica del 2026-08-13.
--
-- V6 cerró los agujeros que una prueba adversarial DEMOSTRABA; esta cierra los
-- que la auditoría encontró por el otro lado: reglas que el documento de
-- alcance declara CONFIRMADAS CON EL CLIENTE y que el esquema nunca intentó
-- imponer. No son ataques que funcionan, son reglas que faltan.
--
-- Momento elegido, igual que V4 y V6: `pago`, `reserva`, `reserva_participante`
-- y `venta_equipo` tienen CERO filas. Cada una de estas constraints es hoy una
-- línea; con los ~80 alumnos del Notion adentro, cada una pasa a ser una
-- decisión sobre qué poner en las filas viejas.
--
-- Lo que NO entra acá, y por qué:
--
--   · "No se asigna horario sin seña o pago registrado" (DB-04a). La relación
--     va al revés -- `pago.id_reserva` -- así que la base no tiene por dónde
--     exigirlo en el INSERT: la reserva se crea junto con su seña, en una
--     transacción, y eso es una regla de servicio. Además depende de P8
--     ("¿qué es una autorización explícita?"), que sigue abierta.
--   · "El nivel no retrocede sin autorización de un administrador" (DB-04b).
--     El "sin autorización" es la parte que falta definir: la base sabe
--     expresar la transición, no sabe qué significa autorizarla.
--   · `reserva_horas_validas` no se llega a evaluar nunca (DB-11): la columna
--     generada `periodo` falla antes con un error de dato que no nombra las
--     horas. No se arregla con una constraint sino validando el orden de las
--     horas en el DTO, cuando exista. El CHECK queda como defensa en
--     profundidad, no como la vía de error visible.
--
-- Las tres están anotadas en `docs/db/auditoria-2026-08-12.md` §6, que es la
-- lista de reglas sin dueño.
-- =============================================================================


-- =============================================================================
-- 1. ANULAR UN PAGO ERA LA ÚNICA EXCEPCIÓN QUE NO PEDÍA EXPLICACIÓN
--
-- Medido sobre el esquema completo:
--     INSERT INTO pago (... monto=100000, estado_pago='PAGADO');
--     UPDATE pago SET estado_pago='ANULADO' WHERE id_pago = 1;   -> UPDATE 1
-- Cien mil pesos salen del balance y la fila no dice quién lo hizo, cuándo, ni
-- por qué.
--
-- El esquema ya tiene doctrina sobre esto y se cumple en todos los demás
-- casos: liberar un premaster sin pago exige motivo y autor (V1:566-567,544),
-- cobrar menos que la lista exige `motivo_descuento` (V1:443-444), resolver
-- una reprogramación exige quién y cuándo (V1:382-384). Anular un pago era la
-- única que no exigía nada, y es la operación más sensible del sistema:
-- para el balance, anular tiene el mismo efecto que borrar -- el monto deja de
-- contar. La diferencia es que la fila queda, y esa fila no servía para
-- reconstruir nada porque no decía nada.
--
-- Con STAFF habilitado a escribir y sin ningún log de aplicación, una anulación
-- era completamente anónima. En un negocio donde buena parte se cobra en
-- efectivo, es el hueco por el que se cuela un faltante de caja.
--
-- Molde: `solicitud_resolucion_completa` (V1:382-384).
-- =============================================================================

ALTER TABLE pago
    ADD COLUMN id_usuario_anula BIGINT      REFERENCES usuario (id_usuario),
    ADD COLUMN fecha_anulacion  TIMESTAMPTZ,
    ADD COLUMN motivo_anulacion TEXT;

-- El `coalesce` NO es decorativo, y esto lo encontró un caso de prueba:
-- **un CHECK que evalúa a NULL no rechaza nada** -- solo rechaza cuando da
-- FALSE. Escrito como `btrim(motivo_anulacion) <> ''`, un motivo en NULL daba
-- NULL, la condición entera daba NULL, y una anulación con autor y fecha pero
-- SIN MOTIVO entraba igual. El `coalesce` convierte "no dijo nada" en cadena
-- vacía, que sí da FALSE. Es la misma trampa en las dos constraints de abajo.
ALTER TABLE pago ADD CONSTRAINT pago_anulacion_justificada
    CHECK (estado_pago <> 'ANULADO'
           OR (id_usuario_anula IS NOT NULL
               AND fecha_anulacion IS NOT NULL
               AND coalesce(btrim(motivo_anulacion), '') <> ''));


-- El otro mecanismo de reversa tenía el mismo hueco. La regla que lo justifica
-- es explícita en `docs/requirements/platform.md:283`: "Los comprobantes no se
-- eliminan: se marcan como inválidos". Marcarlo es una decisión sobre la
-- prueba de que alguien pagó, y no dejaba autor ni motivo.
ALTER TABLE pago
    ADD COLUMN id_usuario_invalida BIGINT      REFERENCES usuario (id_usuario),
    ADD COLUMN fecha_invalidacion  TIMESTAMPTZ,
    ADD COLUMN motivo_invalidacion TEXT;

ALTER TABLE pago ADD CONSTRAINT pago_comprobante_invalido_justificado
    CHECK (NOT comprobante_invalido
           OR (id_usuario_invalida IS NOT NULL
               AND fecha_invalidacion IS NOT NULL
               AND coalesce(btrim(motivo_invalidacion), '') <> ''));


-- =============================================================================
-- 2. EL HISTORIAL DE CLASES SE PODÍA BORRAR, Y EDITAR SIN DEJAR AUTOR
--
-- La regla, en la lista de "Reglas duras ✅" del Módulo 1 -- o sea confirmada
-- con el cliente -- `docs/requirements/platform.md:275`:
--     "El historial de clases NO SE ELIMINA; se edita CON AUDITORÍA."
--
-- V6 §7 implementó "nada se borra" para `pago` y `trabajo_mastering`, porque
-- la auditoría del 12/08 leyó la regla como financiera. `reserva` y
-- `reserva_participante` -- que SON el historial de clases -- quedaron afuera.
-- Medido, con las seis migraciones aplicadas:
--     DELETE FROM reserva_participante WHERE id_reserva = 1;  -> DELETE 1
--     DELETE FROM reserva              WHERE id_reserva = 1;  -> DELETE 1
--     UPDATE reserva_participante SET estado_asistencia='AUSENTE';  -> UPDATE 1
--
-- Es la regla que sostiene el módulo entero. El sistema existe para responder
-- "¿cuántas clases le quedan a Juan?", y esa respuesta se calcula sobre
-- `reserva_participante`. Si esas filas se pueden borrar o editar sin
-- auditoría, la respuesta no es verificable, y a diferencia del dinero acá la
-- disputa es cara a cara con un alumno que paga: "yo esa clase la di", "a mí me
-- marcaron ausente y fui".
-- =============================================================================

-- La salida existe y ya es un valor válido del CHECK en las dos tablas:
-- reserva -> CANCELADA (V1:247), reserva_participante -> CANCELADA (V1:305).
-- La función es la de V6 §7; se le amplía el mensaje para que nombre las cuatro
-- tablas en vez de dos.
CREATE OR REPLACE FUNCTION prohibir_borrado_historico()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'No se borran filas de %. Es historial de un negocio real: hay que '
        'anular la fila con su estado correspondiente (pago -> ANULADO, '
        'trabajo_mastering -> CANCELADO, reserva -> CANCELADA, '
        'reserva_participante -> CANCELADA).', TG_TABLE_NAME;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER reserva_no_se_borra
    BEFORE DELETE ON reserva
    FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_historico();

CREATE TRIGGER participante_no_se_borra
    BEFORE DELETE ON reserva_participante
    FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_historico();


-- La segunda mitad de la regla: "se edita CON AUDITORÍA".
--
-- `reserva` ya tenía dónde escribirla desde V1 (`id_usuario_modifico`,
-- `fecha_modificacion`) y nada la escribía ni la exigía: una reserva editada
-- las dejaba en NULL y nadie se enteraba. `reserva_participante` directamente
-- no tenía dónde.
ALTER TABLE reserva_participante
    ADD COLUMN id_usuario_modifico BIGINT REFERENCES usuario (id_usuario),
    ADD COLUMN fecha_modificacion  TIMESTAMPTZ;

-- La fecha la pone la base y no quien edita: un sello de auditoría que el
-- cliente puede elegir se puede antedatar, que es la mitad de DB-07.
--
-- LÍMITE CONOCIDO, escrito acá para que nadie lo descubra creyendo que estaba
-- cubierto: esto exige que la columna NO ESTÉ EN NULL, no que la edición de hoy
-- haya declarado su autor. Después de la primera edición auditada el campo
-- queda cargado, y una segunda edición que no lo toque pasa con el autor de la
-- anterior. Cerrarlo del todo requiere que la aplicación declare quién opera
-- (una variable de sesión tipo `SET LOCAL app.usuario_actual`), que es una
-- decisión de diseño del backend y no de esta migración. Lo que sí queda
-- cerrado es el caso que motivó la regla: una edición hecha desde afuera de la
-- aplicación, o un endpoint que se olvide de pasar el autor, no entra.
CREATE OR REPLACE FUNCTION exigir_autor_de_la_edicion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_usuario_modifico IS NULL THEN
        RAISE EXCEPTION
            'Editar % exige decir quien lo hizo: id_usuario_modifico no puede '
            'quedar en NULL. Es historial de clases y se edita con auditoria.',
            TG_TABLE_NAME;
    END IF;

    NEW.fecha_modificacion := now();
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Solo cuando cambia algo que le importa a alguien. Corregir una nota interna
-- o enganchar la reserva que recupera a esta no es "editar el historial".
CREATE TRIGGER reserva_edicion_con_autor
    BEFORE UPDATE ON reserva
    FOR EACH ROW
    WHEN (OLD.estado      IS DISTINCT FROM NEW.estado
       OR OLD.fecha       IS DISTINCT FROM NEW.fecha
       OR OLD.hora_inicio IS DISTINCT FROM NEW.hora_inicio
       OR OLD.hora_fin    IS DISTINCT FROM NEW.hora_fin
       OR OLD.id_sala     IS DISTINCT FROM NEW.id_sala)
    EXECUTE FUNCTION exigir_autor_de_la_edicion();

-- Esta es la que importa de verdad: cambiar un PRESENTE por un AUSENTE es lo
-- que decide cuántas clases le quedan al alumno.
CREATE TRIGGER participante_edicion_con_autor
    BEFORE UPDATE ON reserva_participante
    FOR EACH ROW
    WHEN (OLD.estado_asistencia IS DISTINCT FROM NEW.estado_asistencia)
    EXECUTE FUNCTION exigir_autor_de_la_edicion();


-- =============================================================================
-- 3. `bloqueo_sala` TENÍA DOS DEFINICIONES INCOMPATIBLES DE "BLOQUEO"
--
-- La misma fila se interpretaba de dos formas según quién la mirara:
--
--   · Los triggers de V1/V6 la leen como UNA FRANJA HORARIA QUE SE REPITE
--     TODOS LOS DÍAS DEL RANGO (`fecha BETWEEN inicio AND fin` AND las horas
--     se pisan).
--   · El EXCLUDE de V6 §10 la leía como UN ÚNICO INTERVALO CONTINUO
--     (`tsrange(fecha_inicio + hora_inicio, fecha_fin + hora_fin)`).
--
-- Coinciden mientras el bloqueo dure un solo día o tome el día completo, que es
-- justo lo que probaban los 109 casos: los cuatro que cargan un `bloqueo_sala`
-- omiten las horas y toman los DEFAULT 00:00/23:59. Ninguno usaba horario
-- parcial en un rango de más de un día, que es la única forma de exponerlo.
--
-- Medido:
--     -- Mantenimiento en Sala 2, del 1 al 10 de septiembre, de 9 a 13.
--     INSERT ... (2,'2026-09-01','2026-09-10','09:00','13:00')  -> INSERT 0 1
--     -- Evento en Sala 2, el 3 y el 4, de 19 a 23. Ningun dia se pisan.
--     INSERT ... (2,'2026-09-03','2026-09-04','19:00','23:00')
--       ERROR: conflicting key value violates exclusion constraint
--
-- Y al mismo tiempo, con ese bloqueo de 9 a 13 cargado, una reserva el 5 de
-- septiembre de 15:00 a 16:00 ENTRA: el sistema considera la sala libre a esa
-- hora y a la vez considera ese instante dentro del bloqueo a los efectos del
-- EXCLUDE.
--
-- LA DEFINICIÓN CORRECTA ES LA DIARIA, y no es una preferencia: es la que
-- justifica que la tabla tenga cuatro columnas (dos fechas + dos horas) en vez
-- de dos timestamps, es la que usan los dos triggers, y es la que el negocio
-- necesita ("de 9 a 13 toda la semana que viene"). La pantalla de bloqueo está
-- especificada POR RANGO DE FECHAS (`platform.md:294`), así que el caso
-- multi-día no es exótico: es el caso principal.
--
-- Entonces el EXCLUDE no puede escribirse sobre un rango continuo. Se pasa a
-- dos dimensiones -- rango de fechas Y franja horaria -- que es exactamente lo
-- que la fila significa. Se conserva el EXCLUDE en vez de bajarlo a un índice
-- de detección porque es la única forma que aguanta concurrencia, que es el
-- mismo argumento por el que existe el de `reserva`.
-- =============================================================================

-- Postgres no trae un range de `time`. Se define, y con eso el EXCLUDE puede
-- usar `&&` sobre la franja igual que sobre las fechas. Todo range type sirve
-- con GiST por `range_ops`, así que no hace falta nada más.
CREATE TYPE rango_horario AS RANGE (subtype = time);

ALTER TABLE bloqueo_sala DROP CONSTRAINT bloqueo_sin_solapamiento;
ALTER TABLE bloqueo_sala DROP COLUMN periodo;

-- El CASE no es defensivo de más: sin él, esta migración le rompía el mensaje
-- de error a los dos CHECK que V1 ya tenía sobre esta tabla.
--
-- Una columna generada se calcula ANTES de evaluar los CHECK, y los
-- constructores de rango explotan con los límites al revés. Con la expresión
-- desnuda, cargar un bloqueo con la hora de fin anterior a la de inicio moría
-- con "range lower bound must be less than or equal to range upper bound" --
-- un error que no nombra las horas, no trae nombre de constraint y por lo tanto
-- no se puede traducir a un mensaje útil-- en vez de con
-- `bloqueo_rango_horas_valido`, que dice exactamente qué está mal.
--
-- Devolviendo NULL, el CHECK vuelve a ser el que habla. Y una fila aceptada
-- nunca tiene estos campos en NULL, justamente porque los CHECK la rechazan
-- antes: el EXCLUDE no pierde nada. Es DB-11 visto de cerca, y acá se pudo
-- evitar; en `reserva` no, porque ahí la columna generada viene de V1.
ALTER TABLE bloqueo_sala
    -- '[]' porque `fecha_fin` es el último día bloqueado, inclusive: es como lo
    -- leen los dos triggers (`BETWEEN`).
    ADD COLUMN dias   daterange     GENERATED ALWAYS AS
        (CASE WHEN fecha_fin >= fecha_inicio
              THEN daterange(fecha_inicio, fecha_fin, '[]') END) STORED,
    -- '[)' porque un bloqueo que termina a las 13:00 no ocupa las 13:00: es
    -- como lo leen los dos triggers (`hora_inicio < b.hora_fin`).
    ADD COLUMN franja rango_horario GENERATED ALWAYS AS
        (CASE WHEN hora_fin > hora_inicio
              THEN rango_horario(hora_inicio, hora_fin, '[)') END) STORED;

ALTER TABLE bloqueo_sala ADD CONSTRAINT bloqueo_sin_solapamiento
    EXCLUDE USING gist (id_sala WITH =, dias WITH &&, franja WITH &&);


-- =============================================================================
-- 4. `venta_equipo` ERA LA ÚNICA TABLA DE DINERO SIN SELLO DE CARGA
--
-- De las cinco tablas que mueven plata, cuatro distinguen la fecha del HECHO de
-- la fecha de CARGA (`pago.fecha_registro`, `egreso.fecha_registro`,
-- `inscripcion.fecha_creacion`, `trabajo_mastering.fecha_creacion`) y esta no
-- tenía ninguna columna de tipo timestamp. `fecha_venta` trae
-- DEFAULT CURRENT_DATE pero es editable: una venta se cargaba hoy con fecha del
-- mes pasado y no quedaba nada que lo contradijera.
--
-- Se agrega la mitad que no depende de una decisión de negocio. La otra mitad
-- -- que `venta_equipo` tampoco tiene forma de anularse, y por eso V6 §7 la
-- dejó fuera de la prohibición de borrado -- sigue pendiente y anotada.
-- =============================================================================

ALTER TABLE venta_equipo
    ADD COLUMN fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now();


-- =============================================================================
-- 5. UN ÍNDICE QUE RESPALDA DOS TRIGGERS YA ESCRITOS
--
-- V1 decide, y bien, que acá van únicamente los índices que respaldan una
-- consulta concreta (V1:911-917). Este entra en esa propia definición: la
-- consulta existe y corre en cada UPDATE y cada DELETE de `pago`, dentro de
-- `proteger_pago_de_premaster()` (V6 §6), que busca "¿queda algún otro pago
-- vigente para este trabajo?".
-- =============================================================================

CREATE INDEX pago_por_trabajo ON pago (id_trabajo_mastering)
    WHERE id_trabajo_mastering IS NOT NULL;


COMMENT ON CONSTRAINT pago_anulacion_justificada ON pago IS
    'Anular un pago lo saca del balance: exige autor, fecha y motivo, como toda otra excepcion del esquema. Ver V7 §1.';

COMMENT ON TRIGGER participante_edicion_con_autor ON reserva_participante IS
    'Cambiar la asistencia decide cuantas clases le quedan al alumno: exige autor. Ver V7 §2.';

COMMENT ON CONSTRAINT bloqueo_sin_solapamiento ON bloqueo_sala IS
    'Dos dimensiones (rango de fechas Y franja horaria) porque un bloqueo es una franja que se repite cada dia del rango, no un intervalo continuo. Ver V7 §3.';
