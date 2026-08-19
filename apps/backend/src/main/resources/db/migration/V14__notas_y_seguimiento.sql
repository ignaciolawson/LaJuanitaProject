-- =============================================================================
-- LO QUE EL PORTAL DEL PROFESOR NECESITA DE LA BASE  (Módulo 5)
--
-- Las tres tablas del módulo —`nota_profesor`, `material` y
-- `seguimiento_alumno`— existen desde `V1` y hasta hoy nadie les escribió una
-- fila. Esta migración no crea ninguna: agrega **la única regla que sus columnas
-- prometen y no sostienen**, que es el sello de "fecha de cambio" del
-- seguimiento. La otra que iba a traer ya estaba en `V1`: ver abajo.
--
--
-- LO QUE ESTA MIGRACIÓN DELIBERADAMENTE NO HACE
--
-- No pone en la base la regla *"un profesor solo accede a sus propios alumnos"*,
-- que es la regla dura más importante del módulo. Y no es por descuido:
--
-- "Mi alumno" tiene DOS caminos —tener una inscripción asignada a mí, o haber
-- participado de una clase que yo di— y expresarlo en SQL significa escribir ese
-- JOIN doble una segunda vez, al lado del que ya vive en Java. Este proyecto ya
-- pagó ese precio: `contarClasesConsumidas` y `V9` §5 son la misma definición
-- escrita dos veces, y su comentario dice textualmente *"al cambiar una, cambiar
-- la otra"*. Duplicar una definición de dos caminos para una regla de LECTURA
-- —que no corrompe datos si falla, solo muestra de más— compra menos de lo que
-- cuesta.
--
-- Entonces la línea de este módulo es: **lo local y barato va a la base; el
-- alcance por identidad vive en el service, y lo prueban los tests en pares.**
-- =============================================================================


-- =============================================================================
-- LO QUE ESTA MIGRACIÓN IBA A TRAER Y NO TRAE  (vale la pena leerlo)
--
-- La primera versión de este archivo agregaba un trigger para que una nota de
-- sesión no pudiera colgarse de la clase de otro alumno. **Esa regla ya existía
-- desde `V1` §8.3** (`verificar_nota_del_alumno`), con la misma lógica y un
-- mensaje mejor, y se descubrió porque un test esperaba el texto del trigger
-- nuevo y recibió el del viejo.
--
-- Se sacó en vez de dejarla: dos triggers para una regla es peor que uno. El día
-- que la regla cambie, el que la edite va a encontrar uno de los dos y va a
-- creer que terminó.
--
-- La lección, que es de este proyecto y no de esta migración: **antes de escribir
-- una regla en la base, buscarla en `V1`.** El baseline tiene 22 tablas y una
-- sección entera —§8, "reglas cruzadas entre tablas"— dedicada justamente a los
-- invariantes que involucran dos tablas, que es la clase de regla que un módulo
-- nuevo siente la tentación de agregar. Buscar por el nombre de la tabla en
-- `V1__baseline.sql` cuesta diez segundos.
-- =============================================================================


-- =============================================================================
-- "CON FECHA DE CAMBIO" TIENE QUE SER VERDAD
-- =============================================================================
--
-- El alcance pide los tres estados de seguimiento **"con fecha de cambio"**
-- (`platform.md` §8). `seguimiento_alumno.fecha_actualizacion` tiene un DEFAULT,
-- y un DEFAULT solo corre en el INSERT: sin esto, la fila diría para siempre
-- cuándo se creó el seguimiento y no cuándo se movió el estado.
--
-- Es un dato que se lee como *"desde cuándo este alumno requiere atención"*, así
-- que estar desactualizado no es un detalle: es la diferencia entre "hace tres
-- días" y "hace cuatro meses".
--
-- Va en la base y no en el service por una razón puntual: el sello no lo exige
-- nadie —no hay CHECK que lo reclame, como sí lo hay para la firma de una
-- anulación— así que un UPDATE que se olvide de escribirlo no falla, pasa. Acá el
-- único que no se puede olvidar es el trigger.

CREATE OR REPLACE FUNCTION sellar_cambio_de_seguimiento()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo cuando cambia algo que se mira. Tocar las observaciones sin mover el
    -- estado tambien cuenta: es informacion nueva sobre el alumno.
    IF NEW.estado IS DISTINCT FROM OLD.estado
       OR NEW.observaciones IS DISTINCT FROM OLD.observaciones THEN
        NEW.fecha_actualizacion := now();
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER seguimiento_sella_su_cambio
    BEFORE UPDATE ON seguimiento_alumno
    FOR EACH ROW EXECUTE FUNCTION sellar_cambio_de_seguimiento();


COMMENT ON TABLE nota_profesor IS
    'Notas privadas del profesor sobre un alumno. No las ve ni el alumno ni otro profesor; administracion si. Esa regla vive en el service (M5), no aca: ver la cabecera de V14. Que la nota cuelgue de una clase DE ESE alumno lo sostiene V1 seccion 8.3.';

COMMENT ON TABLE seguimiento_alumno IS
    'Un estado por profesor y por alumno (VA_BIEN / REQUIERE_ATENCION / EN_PAUSA). fecha_actualizacion la mantiene un trigger, para que "con fecha de cambio" sea cierto.';
