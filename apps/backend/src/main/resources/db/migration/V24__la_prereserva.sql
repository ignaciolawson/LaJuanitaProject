-- =============================================================================
-- LA PRERESERVA — `mejoras.md` §13 · C1, con P43 a P46 de `platform.md` §19.
--
-- El planteo, textual de Ignacio (2026-09-01): *"Cuando alguien manda para
-- reservar una sala o cabina, al admin le llega esa solicitud. Pero el admin
-- está obligado a tener ya el cobro para ponerle 'confirmar y cobrar', entonces
-- va a tener eso ahí en pendiente. Lo que se me ocurrió es que cuando le llegue
-- la solicitud ponga confirmar sala, el monto, todo, pero que no sea ahí cuando
-- se cobra. Como que 'preconfirma' la reserva. Como ese usuario todavía no pagó
-- iría a la pestaña de DEUDORES hasta que el admin sí cobre. El usuario se
-- 'prereserva': tiene 24hs para abonar o hasta que el admin lo cancele, y ahí sí
-- se confirma del todo."*
--
-- -----------------------------------------------------------------------------
-- ⚠️ ESTO REABRE, A PROPOSITO Y CON PLAZO, EL AGUJERO QUE CERRO `V12`
--
-- Hay que decirlo de frente porque el proximo que lea `V12` lo va a preguntar.
-- El 2026-08-17 se verifico contra el esquema corriendo que **se conseguia un
-- horario anotando una deuda** —un alquiler cuyo unico `pago` estaba en 'DEBE'
-- pasaba el chequeo— y se cerro. La prereserva ES eso.
--
-- Lo que la hace legitima es UNA sola diferencia, y es toda la migracion:
-- **aquella deuda no vencia nunca y esta muere en 24hs**, con monto, moneda,
-- duenio y una fecha que la base misma obliga a poner. La excepcion no es un
-- permiso, es un plazo.
--
-- La regla nueva, entera, en una linea:
--
--     Toda reserva que ocupa su franja tiene plata detras: COBRADA, o ANOTADA
--     CON VENCIMIENTO mientras este preconfirmada.
--
-- -----------------------------------------------------------------------------
-- ⚠️ SI, ES UNA EXCEPCION POR ESTADO. POR QUE NO ES LA QUE §13 RECHAZO
--
-- `platform.md` §13 rechazo las excepciones INVENTADAS PARA UNA REGLA —"salvo
-- que este vacia", "salvo que sea una clase"— con el argumento de que una regla
-- cuyas excepciones dependen del estado es la que despues nadie sabe si se esta
-- cumpliendo. `V10` lo repite al elegir que la excepcion de MIX_MASTERING vaya
-- por catalogo.
--
-- 'PRECONFIRMADA' no es una categoria inventada para zafar de esta regla: es un
-- estado del ciclo de vida de la propia reserva, **que se vence solo** y que la
-- base obliga a fechar (§2 y §3 de aca abajo). Cualquiera puede preguntarle a la
-- base cuantas prereservas hay vencidas; no se puede decir lo mismo de "salvo
-- que este vacia". La excepcion tiene plazo, no criterio.
--
-- -----------------------------------------------------------------------------
-- LO QUE NO HAY QUE TOCAR, Y ES UN REGALO DE COMO `V1` ESCRIBIO LA DEFINICION
--
-- 'PRECONFIRMADA' **ocupa la franja** —ese es el punto entero: el que pidio
-- primero se queda con el horario— y del lado SQL no hay que cambiar NADA.
-- `V1` escribio la definicion canonica por lo que queda AFUERA
-- (`NOT IN ('CANCELADA','REPROGRAMADA')`) y asi la repiten el EXCLUDE de
-- solapamiento, los dos triggers de bloqueo y los dos usos de `V9`. Un estado
-- nuevo que ocupa entra solo en los cinco.
--
-- Del lado de Java si hay que tocarlo: `EstadoReserva.OCUPAN_LA_SALA` esta
-- escrito por enumeracion.
-- =============================================================================


-- =============================================================================
-- 1. EL ESTADO NUEVO
-- =============================================================================

ALTER TABLE reserva DROP CONSTRAINT reserva_estado_valido;

ALTER TABLE reserva ADD CONSTRAINT reserva_estado_valido
    CHECK (estado IN ('PRECONFIRMADA', 'CONFIRMADA', 'MODIFICADA',
                      'CANCELADA', 'REPROGRAMADA', 'FINALIZADA'));

COMMENT ON CONSTRAINT reserva_estado_valido ON reserva IS
    'PRECONFIRMADA (V24) es el horario apartado con la deuda anotada y su vencimiento. Ocupa la franja como cualquier otro estado que no sea CANCELADA ni REPROGRAMADA.';


-- =============================================================================
-- 2. EL VENCIMIENTO
--
-- Es TIMESTAMPTZ y no DATE porque el plazo se cuenta en horas y puede caer a
-- cualquier hora del dia. P44: **el plazo es el MENOR entre 24hs y el inicio de
-- la reserva**, y ese calculo lo hace el servidor -- la base guarda el resultado.
--
-- El motivo de P44, para que nadie lo "simplifique" a 24hs planas: se
-- preconfirma hoy a las 15 una cabina de maniana a las 10, y con 24hs el
-- vencimiento cae maniana a las 15, CINCO HORAS DESPUES de que la franja paso.
-- O sea: se usa la cabina sin pagar y el sistema se entera al otro dia.
-- =============================================================================

ALTER TABLE reserva ADD COLUMN vence_preconfirmacion TIMESTAMPTZ;

COMMENT ON COLUMN reserva.vence_preconfirmacion IS
    'Hasta cuando esta apartado el horario sin pagar (V24). El servidor lo calcula como el menor entre ahora+24hs y el inicio de la reserva (P44). NULL en cualquier estado que no sea PRECONFIRMADA -- lo exige reserva_preconfirmada_vence.';


-- =============================================================================
-- 3. EL CHECK VA EN LOS DOS SENTIDOS, Y LA SEGUNDA MITAD ES LA QUE IMPORTA
--
-- Que una preconfirmada no pueda quedarse sin vencimiento es la mitad obvia: sin
-- fecha, el plazo no existe y la excepcion de §4 se vuelve un permiso.
--
-- La mitad que se olvida es la otra: **que un vencimiento no sobreviva en una
-- reserva ya confirmada**, donde leeria como un plazo vivo que no lo es --
-- alguien mirando la pantalla veria "vence en 3hs" en una reserva paga. Es el
-- mismo razonamiento con el que `V22` escribio su CHECK en los dos sentidos.
-- =============================================================================

ALTER TABLE reserva ADD CONSTRAINT reserva_preconfirmada_vence
    CHECK ((estado = 'PRECONFIRMADA') = (vence_preconfirmacion IS NOT NULL));

COMMENT ON CONSTRAINT reserva_preconfirmada_vence ON reserva IS
    'V24: una preconfirmada tiene vencimiento y nada mas lo tiene. Las dos direcciones a proposito -- ver la cabecera de V24 §3.';


-- =============================================================================
-- 4. LA CONDICION DE LA PLATA, REESCRITA
--
-- Es la cuarta version de esta funcion: `V10` la escribio, `V11` la extrajo para
-- compartirla entre tres triggers, `V12` le corrigio la lista de estados
-- —`<> 'ANULADO'` no es lo mismo que ENTRARON— y esta le agrega el unico camino
-- nuevo.
--
-- Lo que cambia: si la reserva esta PRECONFIRMADA, alcanza con un `pago`
-- apuntandole que **no este anulado** (o sea DEBE, VENCIDO, SENADO o PAGADO).
-- En cualquier otro estado sigue exigiendo `EstadoPago.ENTRARON`, igual que
-- desde `V12`.
--
-- ⚠️ Que el pago no este ANULADO no es un detalle: una preconfirmada cuya deuda
-- se anulo no tiene NADA detras -- ni plata ni compromiso-- y entonces es
-- exactamente el agujero de `V12` sin el plazo que lo justifica.
-- =============================================================================

CREATE OR REPLACE FUNCTION reserva_sin_plata_detras(p_id_reserva BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    codigo_del_uso TEXT;
    estado_reserva TEXT;
BEGIN
    SELECT t.codigo, r.estado INTO codigo_del_uso, estado_reserva
    FROM reserva r
    JOIN tipo_uso t ON t.id_tipo_uso = r.id_tipo_uso
    WHERE r.id_reserva = p_id_reserva
      -- Definicion canonica de V1: una cancelada o una reprogramada no ocupan la
      -- franja y no deben sena (la sena se devuelve, V11).
      AND r.estado NOT IN ('CANCELADA', 'REPROGRAMADA');

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- La unica excepcion por catalogo, y no por estado (§13): lo decide Ghezz.
    IF codigo_del_uso = 'MIX_MASTERING' THEN
        RETURN FALSE;
    END IF;

    -- CAMINO 1 bis (V24): la prereserva. El horario esta apartado con la deuda
    -- anotada, y lo que hace legitimo eso es que §2 y §3 obligan a que tenga
    -- fecha de vencimiento. Un pago ANULADO no cuenta: dejaria la prereserva sin
    -- deuda y sin plata, que es el agujero de V12 sin el plazo.
    IF estado_reserva = 'PRECONFIRMADA' THEN
        RETURN NOT EXISTS (SELECT 1 FROM pago
                           WHERE id_reserva = p_id_reserva
                             AND estado_pago <> 'ANULADO');
    END IF;

    -- CAMINO 1: PLATA QUE ENTRO apuntando a la reserva.
    --
    -- `IN ('SENADO','PAGADO')` y no `<> 'ANULADO'`: es EstadoPago.ENTRARON, la
    -- misma lista que usa la caja. Ver la cabecera de V12.
    IF EXISTS (SELECT 1 FROM pago
               WHERE id_reserva = p_id_reserva
                 AND estado_pago IN ('SENADO', 'PAGADO')) THEN
        RETURN FALSE;
    END IF;

    -- CAMINO 2: la inscripcion que cubre la clase. Misma definicion de
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
    'P8/DB-04a + V24: toda reserva que ocupa su franja tiene plata detras, cobrada (SENADO/PAGADO) o anotada con vencimiento mientras este PRECONFIRMADA. Compartida por los tres triggers que sostienen la regla. Ver la cabecera de V24.';


-- =============================================================================
-- 5. LA ESCALERA DE LA PRECONFIRMACION
--
-- Sin esto, la mitad de arriba no vale nada. El rodeo, que es exactamente el que
-- `V18` §1b encontro en el sello:
--
--     preconfirmar -> cobrar (pasa a CONFIRMADA) -> volver a PRECONFIRMADA ->
--     anular el pago
--
-- Resultado: sala tomada, cero plata, y ningun trigger se quejo -- porque
-- volver a PRECONFIRMADA hace que §4 acepte una deuda, y anular la deuda ya no
-- vuelve a chequearse.
--
-- ⚠️ **Desde adentro de "a la prereserva se entra al nacer" no se ve que la
-- salida tambien hay que cerrarla.** Es la misma leccion que `V18` §1b escribio
-- para CANCELADO, y es la segunda vez que este proyecto la aprende.
--
-- Las dos reglas:
--   a) A PRECONFIRMADA se entra SOLO al nacer. Ningun UPDATE la puede poner.
--   b) De PRECONFIRMADA se sale SOLO a CONFIRMADA (se cobro) o a CANCELADA (se
--      vencio, o el admin la dio de baja).
--
-- MODIFICADA no esta en (b) a proposito: hoy ningun servicio escribe ese estado
-- —editar una reserva no lo toca— asi que permitirlo seria abrir una puerta que
-- nadie usa y por la que se sale del plazo sin haber pagado.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_escalera_de_preconfirmacion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    -- (a) No se vuelve a preconfirmar algo que ya salio del plazo.
    IF NEW.estado = 'PRECONFIRMADA' THEN
        RAISE EXCEPTION
            'A la prereserva se entra solo al crearla. Esta reserva ya esta en % y '
            'no puede volver a quedar apartada sin pago.',
            OLD.estado;
    END IF;

    -- (b) Del plazo se sale cobrando o cancelando, y por ningun otro lado.
    IF OLD.estado = 'PRECONFIRMADA'
       AND NEW.estado NOT IN ('CONFIRMADA', 'CANCELADA') THEN
        RAISE EXCEPTION
            'Una prereserva solo puede confirmarse (cuando entra el pago) o '
            'cancelarse. No se puede pasar a %.',
            NEW.estado;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER reserva_escalera_de_preconfirmacion
    BEFORE UPDATE ON reserva
    FOR EACH ROW EXECUTE FUNCTION verificar_escalera_de_preconfirmacion();

COMMENT ON FUNCTION verificar_escalera_de_preconfirmacion() IS
    'V24 §5: a PRECONFIRMADA se entra solo al nacer y se sale solo a CONFIRMADA o CANCELADA. Sin esto, confirmar y volver atras deja la sala tomada sin plata. Mismo agujero que V18 §1b.';
