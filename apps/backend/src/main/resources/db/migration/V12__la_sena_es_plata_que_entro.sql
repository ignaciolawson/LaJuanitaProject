-- =============================================================================
-- UNA DEUDA ANOTADA NO ES UNA SEÑA — corrección de `V10`/`V11`.
--
-- EL AGUJERO, medido sobre el esquema andando el 2026-08-17: se cargaba una
-- reserva de alquiler con un único `pago` en estado **DEBE** apuntándole, y el
-- chequeo de la seña la aceptaba. O sea: **se conseguía el horario anotando una
-- deuda**, que es literalmente lo que la regla existe para impedir.
--
--     INSERT INTO reserva (...);
--     INSERT INTO pago (..., id_reserva = esa, estado_pago = 'DEBE');
--     SET CONSTRAINTS reserva_con_sena IMMEDIATE;   -> pasaba
--
-- POR QUÉ PASÓ. `V10` escribió la condición como `estado_pago <> 'ANULADO'`, que
-- se lee como "el pago sigue vigente" y no lo es: `DEBE` y `VENCIDO` también son
-- distintos de `ANULADO`, y **son la deuda anotada — plata que se esperaba y no
-- llegó**. `V11` heredó la condición al extraer la función compartida.
--
-- La definición correcta ya existía y tiene nombre: **`EstadoPago.ENTRARON` =
-- (SENADO, PAGADO)**, que el propio enum documenta como *"los estados que suman a
-- la caja... se escribe por lo que queda afuera —la deuda y lo anulado— porque es
-- como se piensa la regla"*. La usan `cajaPorMoneda`, `cobradoPorInscripcion` y
-- `ventasConPago`. Esta era la cuarta consulta que necesitaba esa lista y la única
-- que la escribió de otra forma.
--
-- Y `SENADO` es justamente el estado de una seña, así que la lista correcta no es
-- más estricta de lo necesario: una seña del 50% cumple, un curso pagado entero
-- cumple, y una deuda no.
--
-- Es el mismo tipo de error que `V6` §7 documenta para los CHECK que evalúan a
-- NULL: la condición se veía razonable leída sola, y era otra cosa.
-- =============================================================================

CREATE OR REPLACE FUNCTION reserva_sin_plata_detras(p_id_reserva BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    codigo_del_uso TEXT;
BEGIN
    SELECT t.codigo INTO codigo_del_uso
    FROM reserva r
    JOIN tipo_uso t ON t.id_tipo_uso = r.id_tipo_uso
    WHERE r.id_reserva = p_id_reserva
      -- Definicion canonica de V1: una cancelada o una reprogramada no ocupan la
      -- franja y no deben sena (la sena se devuelve, V11).
      AND r.estado NOT IN ('CANCELADA', 'REPROGRAMADA');

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- La unica excepcion, por catalogo y no por estado (§13).
    IF codigo_del_uso = 'MIX_MASTERING' THEN
        RETURN FALSE;
    END IF;

    -- Camino 1: PLATA QUE ENTRO apuntando a la reserva.
    --
    -- `IN ('SENADO','PAGADO')` y no `<> 'ANULADO'`: es EstadoPago.ENTRARON, la
    -- misma lista que usa la caja. DEBE y VENCIDO son deuda anotada -- si contaran,
    -- se consigue el horario sin pagar, que es de lo que trata toda esta regla.
    IF EXISTS (SELECT 1 FROM pago
               WHERE id_reserva = p_id_reserva
                 AND estado_pago IN ('SENADO', 'PAGADO')) THEN
        RETURN FALSE;
    END IF;

    -- Camino 2: la inscripcion que cubre la clase. Misma definicion de
    -- participacion viva que usa V9 §5 para "clase consumida".
    IF EXISTS (SELECT 1 FROM reserva_participante
               WHERE id_reserva = p_id_reserva
                 AND id_inscripcion IS NOT NULL
                 AND estado_asistencia <> 'CANCELADA') THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END; $$ LANGUAGE plpgsql;


COMMENT ON FUNCTION reserva_sin_plata_detras(BIGINT) IS
    'P8/DB-04a: la condicion de la sena, compartida por los tres triggers que la sostienen. Plata que ENTRO (SENADO/PAGADO), no un pago cualquiera: una deuda anotada no es una sena. Una reserva CANCELADA o REPROGRAMADA no ocupa su franja y no debe nada. Ver la cabecera de V12.';
