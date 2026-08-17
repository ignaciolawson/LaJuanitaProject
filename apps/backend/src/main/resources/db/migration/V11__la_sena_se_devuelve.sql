-- =============================================================================
-- LA SEÑA SE DEVUELVE — la puerta que `V10` dejó abierta a propósito.
--
-- `V10` cerró la mitad de la regla: ninguna reserva NACE sin dinero detrás. Su
-- propia cabecera anotó la otra mitad como hueco deliberado — el trigger corre
-- solo al INSERT, así que la invariante se establecía al crear y se podía romper
-- después anulando el pago. Ahí decía, textual, que cerrarlo era *"una decisión
-- del Módulo 3 sobre devoluciones"*.
--
-- **Esa decisión se tomó el 2026-08-17 (Ignacio): si se cancela una reserva, la
-- seña SE DEVUELVE.** Con eso la regla se puede terminar de escribir.
--
-- -----------------------------------------------------------------------------
-- LA REGLA COMPLETA, Y POR QUÉ NO ES LA EXCEPCIÓN QUE §13 RECHAZÓ
--
-- Queda así: **toda reserva que OCUPA SU FRANJA tiene dinero detrás.** Una
-- cancelada y una reprogramada no ocupan nada, así que no deben nada.
--
-- Parece la excepción por estado que §13 descartó, y no lo es. Lo que §13 rechazó
-- fue *"salvo que esté vacía"* y *"salvo que sea una clase"*: dos categorías
-- inventadas para esta regla sola, que nadie más en el esquema conoce. Acá no se
-- inventa nada — `NOT IN ('CANCELADA','REPROGRAMADA')` es la **DEFINICIÓN
-- CANÓNICA DE "RESERVA QUE OCUPA LA SALA"** que `V1` escribió con todas las
-- letras y que ya usan el EXCLUDE de solapamiento, los dos triggers de bloqueo,
-- el de "nadie en dos salas a la vez" de `V9` y el informe de uso. Es la sexta
-- vez que se aplica, no la primera.
--
-- La prueba de que es la lectura correcta: **con la otra, cancelar sería
-- imposible.** Cancelás la clase, querés devolver la seña, y la base te dice que
-- la reserva se queda sin plata detrás. La regla obligaría a no devolver nunca —
-- decidiendo por su cuenta una política comercial que el cliente ya decidió al
-- revés.
--
-- -----------------------------------------------------------------------------
-- TRES TRIGGERS, TRES MOMENTOS. Y el momento es lo que se piensa acá.
--
--   1. `reserva_con_sena` (V10, INSERT) — **sigue DIFERIDO**, y tiene que
--      seguirlo: al insertar la reserva su `reserva_participante` todavía no
--      existe, así que el chequeo tiene que esperar al COMMIT.
--   2. `pago_no_deja_la_reserva_sin_plata` (UPDATE de `pago`) — **INMEDIATO**.
--      Al anular un pago ya existe todo lo que hay que mirar, así que no hay nada
--      que esperar; y diferirlo tendría un costo concreto: el rechazo llegaría en
--      el COMMIT, o sea después de que `PagoService.anular` respondió, y saldría
--      como un 500 en vez del 409 con el texto del trigger.
--   3. `reserva_reactivada_con_sena` (UPDATE de `reserva`) — **INMEDIATO**, por
--      lo mismo. Es el esquive: cancelo, me devuelven la seña, y descancelo.
--      Sin él la regla se saltea en dos pasos legales, que es exactamente la
--      familia de ataques que `V6` y las pruebas adversariales persiguen.
--
-- El orden natural queda: **primero se cancela la reserva, después se anula el
-- pago.** Al revés, el trigger 2 rechaza y el mensaje dice qué hacer. Los dos en
-- una misma transacción también andan, sin importar el orden.
-- =============================================================================


-- =============================================================================
-- 1. LA CONDICIÓN, UNA SOLA VEZ
--
-- `V10` la tenía escrita adentro de su función. Ahora la miran tres triggers, así
-- que se extrae: tres copias de "qué es tener plata detrás" son tres lugares
-- donde se despegan, y el día que se despeguen la base va a estar
-- contradiciéndose consigo misma sin que nadie se entere.
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
      -- La definicion canonica de V1: una cancelada o una reprogramada no ocupan
      -- la franja, y por lo tanto no deben nada.
      AND r.estado NOT IN ('CANCELADA', 'REPROGRAMADA');

    -- Sin fila: o no existe, o no ocupa nada. En los dos casos no debe seña.
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- La unica excepcion, por catalogo y no por estado (§13): lo decide Ghezz.
    IF codigo_del_uso = 'MIX_MASTERING' THEN
        RETURN FALSE;
    END IF;

    -- Camino 1: un pago vigente apuntando a la reserva.
    IF EXISTS (SELECT 1 FROM pago
               WHERE id_reserva = p_id_reserva
                 AND estado_pago <> 'ANULADO') THEN
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


-- =============================================================================
-- 2. EL TRIGGER DE V10, AHORA DELEGANDO
--
-- Misma firma, mismo trigger, mismo momento (diferido, al COMMIT). Lo unico que
-- cambia es que la condicion sale de la funcion compartida -- y con eso hereda la
-- exencion de las canceladas, que antes no tenia.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_sena_de_la_reserva()
RETURNS TRIGGER AS $$
BEGIN
    IF reserva_sin_plata_detras(NEW.id_reserva) THEN
        RAISE EXCEPTION
            'No se aparta un horario sin pago por adelantado. Registra el pago de esa '
            'reserva, o anota al alumno con su inscripcion, que ya la cubre.';
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;


-- =============================================================================
-- 3. ANULAR UN PAGO NO PUEDE DEJAR UNA RESERVA VIGENTE SIN PLATA
--
-- El agujero que este archivo viene a tapar. El mensaje nombra la salida, que es
-- justamente la politica que se decidio: **cancelar la reserva primero**, y ahi
-- la devolucion es legitima.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_pago_al_anular()
RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER pago_no_deja_la_reserva_sin_plata
    AFTER UPDATE ON pago
    FOR EACH ROW EXECUTE FUNCTION verificar_pago_al_anular();


-- =============================================================================
-- 4. EL ESQUIVE: CANCELO, ME DEVUELVEN LA SEÑA, Y DESCANCELO
--
-- Dos pasos legales que juntos rompen la regla. Es la misma familia que las
-- pruebas adversariales ya persiguen en `bloqueo_sala` y en el solapamiento
-- (#A07, #B02): resucitar una CANCELADA para entrar por la ventana.
--
-- Va sobre UPDATE y no sobre INSERT porque de la creacion ya se ocupa `V10`.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_sena_al_reactivar_reserva()
RETURNS TRIGGER AS $$
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
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER reserva_reactivada_con_sena
    AFTER UPDATE ON reserva
    FOR EACH ROW EXECUTE FUNCTION verificar_sena_al_reactivar_reserva();


COMMENT ON FUNCTION reserva_sin_plata_detras(BIGINT) IS
    'P8/DB-04a: la condicion de la sena, compartida por los tres triggers que la sostienen. Una reserva CANCELADA o REPROGRAMADA no ocupa su franja y no debe sena -- la sena se devuelve (decidido 2026-08-17). Ver la cabecera de V11.';
