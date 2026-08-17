-- =============================================================================
-- LA SEÑA — P8 / DB-04a. La última regla del sistema que vivía en un documento
-- y no en el código.
--
-- La regla, textual de Ignacio (2026-08-15): *"Todo se debe señar antes, todo.
-- Menos mix y mastering, que eso lo va decidiendo Ghezz. La seña es el 50% del
-- total."* Coincide con lo que §1 ya traía confirmado del relevamiento —"sin
-- seña no hay horario"— y con P8: **no hay excepción, ninguna autorización la
-- saltea.**
--
-- `V9` dejó esto afuera a propósito y escribió por qué: la pregunta abierta no
-- era *cuándo se puede saltear* (nunca) sino *a qué reservas alcanza*, y sin eso
-- el esquema no podía expresarla. §13 lo cerró.
--
-- -----------------------------------------------------------------------------
-- "TODO SE SEÑA" NO SIGNIFICA UN PAGO POR RESERVA
--
-- Significa que ninguna `reserva` existe sin dinero detrás, y ese dinero llega
-- por DOS caminos que cuentan igual:
--
--   1. Un `pago` que apunta a la reserva (`pago.id_reserva`). Es el caso del
--      alquiler de cabina y de la grabación de set.
--   2. La **inscripción que cubre esa clase**, vía
--      `reserva_participante.id_inscripcion`. **Un alumno que ya pagó su curso
--      no paga una seña por cada clase**: sería cobrarle dos veces, y contradice
--      que el curso se paga entero por adelantado. La plata entró antes, que es
--      lo que la regla pide.
--
-- LA EXCEPCIÓN, la única: `MIX_MASTERING`. Lo decide Ghezz caso por caso y el
-- sistema no exige seña para ese tipo de uso (§13; el relevamiento ya lo
-- mostraba fiado). Es una excepción por CATÁLOGO, no por estado de la fila —
-- ver más abajo por qué eso importa.
--
-- -----------------------------------------------------------------------------
-- EL 50% NO SE PUEDE VERIFICAR ACÁ, Y NO ES UN OLVIDO
--
-- `inscripcion.precio_total` existe, así que del lado del curso el 50% es una
-- cuenta. **`reserva` NO tiene precio**: el de un alquiler sale de las horas por
-- una tarifa que todavía no está en el sistema (P13, la lista de precios, lo
-- único que sigue abierto del Módulo 3). Hasta que exista, la base puede exigir
-- *que haya un pago* y no *que sea la mitad*. Esa mitad la impone la pantalla, y
-- la base la toma el día que `reserva` tenga su precio.
--
-- -----------------------------------------------------------------------------
-- POR QUÉ UN CONSTRAINT TRIGGER DIFERIDO, Y NO UN CHECK
--
-- Un CHECK no puede mirar otras tablas, y las dos rutas del dinero están en dos
-- tablas distintas. Y un trigger normal (`AFTER INSERT` inmediato) tampoco
-- sirve: en el instante en que se inserta la `reserva`, su `reserva_participante`
-- todavía no existe. `DEFERRABLE INITIALLY DEFERRED` corre al COMMIT, y entonces
-- **no le importa en qué orden Hibernate escriba la reserva y su
-- participante** — un orden que en este módulo ya mordió cuatro veces.
--
-- Eso es lo que hizo implementable la decisión del 2026-08-16: en vez de relajar
-- la regla, se adaptó el flujo. El alta de una clase carga la reserva y su
-- participante en la misma transacción (`AltaReservaRequest.participantes`).
--
-- -----------------------------------------------------------------------------
-- ⚠️ LO QUE ESTO CAMBIA EN LAS PRUEBAS, Y HAY QUE SABERLO
--
-- **Un trigger diferido no se dispara en una transacción que se revierte.**
-- `ReservaTest` es `@Transactional` y revierte cada caso, así que esta regla es
-- INVISIBLE para `mvn test` salvo que se la fuerce con:
--
--     SET CONSTRAINTS reserva_con_sena IMMEDIATE;
--
-- que ejecuta en el momento los chequeos pendientes. Sin eso, la suite queda en
-- verde con la seña sin verificar — el peor resultado posible, y el motivo por el
-- que esta migración no se escribió el día que se decidió.
--
-- Las suites SQL tienen el problema espejo: psql está en autocommit, así que
-- cada `SELECT probar(...)` es su propia transacción y el rechazo salta AFUERA
-- del `EXCEPTION` de `probar()`, llevándose puesto el `INSERT INTO _resultado`.
-- El caso no fallaría: desaparecería del resumen. Por eso las reservas que
-- sobreviven al COMMIT ahora entran con su pago, en un CTE, en la misma
-- sentencia.
--
-- -----------------------------------------------------------------------------
-- ⚠️ HUECO DELIBERADO, al estilo de V6 §7 y V7
--
-- El trigger corre **solo al INSERT de `reserva`**. O sea: la invariante se
-- establece al crear y se puede romper después, anulando el pago
-- (`estado_pago = 'ANULADO'`) o cancelando la participación. Queda abierto a
-- propósito y no por descuido:
--
--   · Anular un pago mal cargado y volver a registrarlo es un flujo real del
--     Módulo 3, y con el trigger del lado de `pago` habría que distinguir "anular
--     para corregir" de "anular y quedarse sin seña" — que es estado, no forma.
--   · Cancelar una reserva y anular su seña es una operación normal.
--
-- Cerrarlo es una decisión del Módulo 3 sobre devoluciones, no de esta migración.
-- Lo que sí hace el trigger es lo que la regla pide: **no se aparta un horario
-- sin plata**.
--
-- Y por eso la excepción de `MIX_MASTERING` va por `tipo_uso.codigo` y no por un
-- estado de la reserva: una regla cuyas excepciones dependen del estado es la que
-- después nadie sabe si se está cumpliendo (§13, el mismo argumento con el que se
-- descartaron las otras dos salidas).
-- =============================================================================


CREATE OR REPLACE FUNCTION verificar_sena_de_la_reserva()
RETURNS TRIGGER AS $$
DECLARE
    codigo_del_uso TEXT;
BEGIN
    SELECT t.codigo INTO codigo_del_uso
    FROM reserva r
    JOIN tipo_uso t ON t.id_tipo_uso = r.id_tipo_uso
    WHERE r.id_reserva = NEW.id_reserva;

    -- La fila puede no estar: el trigger es diferido, así que corre al COMMIT y
    -- para entonces la reserva pudo haberse ido. Hoy no puede -- `V7` prohíbe
    -- borrar `reserva` con un trigger -- pero sin esta guarda un NULL haría que
    -- la condición de abajo no se cumpla y el rechazo hablaría de una seña
    -- faltante cuando el problema es otro.
    IF codigo_del_uso IS NULL THEN
        RETURN NEW;
    END IF;

    -- La única excepción, por catálogo (§13).
    IF codigo_del_uso = 'MIX_MASTERING' THEN
        RETURN NEW;
    END IF;

    -- Camino 1: un pago apuntando a la reserva. Los anulados no cuentan -- si
    -- contaran, anular la seña dejaría la reserva sin plata detrás y el chequeo
    -- diría que sí la tiene.
    IF EXISTS (SELECT 1 FROM pago
               WHERE id_reserva = NEW.id_reserva
                 AND estado_pago <> 'ANULADO') THEN
        RETURN NEW;
    END IF;

    -- Camino 2: la inscripción que cubre la clase. `estado_asistencia` excluido
    -- con la MISMA definición que usa `V9` §5 para "clase consumida": una
    -- participación cancelada no consume clase y por lo tanto tampoco aporta la
    -- plata. Si las dos definiciones se separan, la pantalla y la base dejan de
    -- contar lo mismo.
    IF EXISTS (SELECT 1 FROM reserva_participante
               WHERE id_reserva = NEW.id_reserva
                 AND id_inscripcion IS NOT NULL
                 AND estado_asistencia <> 'CANCELADA') THEN
        RETURN NEW;
    END IF;

    -- El mensaje nombra las DOS salidas, porque son dos situaciones distintas y
    -- quien lo lee está en una de las dos. Sin acentos, como el resto de los
    -- mensajes del esquema: llegan tal cual a la pantalla vía `ManejadorDeErrores`.
    RAISE EXCEPTION
        'No se aparta un horario sin pago por adelantado. Registra el pago de esa '
        'reserva, o anota al alumno con su inscripcion, que ya la cubre.';

    RETURN NEW;
END; $$ LANGUAGE plpgsql;


CREATE CONSTRAINT TRIGGER reserva_con_sena
    AFTER INSERT ON reserva
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION verificar_sena_de_la_reserva();


COMMENT ON FUNCTION verificar_sena_de_la_reserva() IS
    'P8/DB-04a: ninguna reserva existe sin dinero detras, verificado al COMMIT. El dinero llega por pago.id_reserva o por la inscripcion del participante. Unica excepcion: MIX_MASTERING. Ver la cabecera de V10.';
