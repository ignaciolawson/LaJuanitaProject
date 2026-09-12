-- =============================================================================
-- V30 — La preinscripción: anotado, con 24 hs para señar, y todavía no cursa
--
-- Fase 5 de la cuarta barrida (`docs/mejoras.md` §16 · C3), decidida en
-- `docs/requirements/platform.md` §22 — P59 (los programas se señan: 50% para
-- inscribirse), P60 (no hay cupo: la preinscripción es un ESTADO, no una
-- reserva), P61 (vencida, avisa y no se cancela sola) y P72 (la seña tiene 24
-- horas; el saldo restante no tiene fecha; las dos situaciones se ven en
-- Deudores como inscripciones, no como pagos anotados).
--
--
-- QUÉ HABÍA, Y POR QUÉ NO ALCANZABA
--
-- Una inscripción nacía `ACTIVA` y punto. P33 decía "todo se paga de una vez",
-- así que no hacía falta más. P59 lo supera: **una inscripción tiene dos
-- pagos** —la seña que la hace formal y el saldo antes de la primera clase—, y
-- entre que la persona dice "me anoto" y paga la seña hay un estado que el
-- esquema no podía escribir. La alternativa barata —que nazca `ACTIVA` con una
-- deuda anotada— es el agujero que `V12` cerró del otro lado, y además haría
-- mentir al contador de alumnos del tablero (P60).
--
--
-- POR QUÉ NO ES "LO MISMO QUE LA CABINA", AUNQUE SE PAREZCA
--
-- `V24` apartó un HORARIO: algo que alguien más podía pedir, así que hubo que
-- retenerlo (el `EXCLUDE` ya lo hacía) y devolverlo al vencer (la prereserva se
-- cancela sola). Acá no hay cupo (P60): **nadie le saca el lugar a nadie**, así
-- que no hay nada que retener ni que devolver. La preinscripción es la
-- inscripción diciendo "todavía no es formal". Por eso:
--
--   - Al vencer NO se cancela sola (P61): no hay horario que liberar. Se avisa a
--     administración y Mica llama.
--   - NO lleva la vuelta de `V11` (anular la seña después de activar). Allá el
--     rodeo dejaba una sala tomada con cero plata; acá anular la seña deja una
--     inscripción activa cuyo estado de cuenta dice que debe el 100%, que es
--     la verdad y se ve. No hay víctima, y la historia de la plata queda igual.
--
--
-- LO QUE ESTA MIGRACIÓN DECIDE
--
-- 1. **`PREINSCRIPTA` es un estado más de `inscripcion`** (§1). Se nace así
--    cuando no hay seña, y `ACTIVA` cuando la hay — el alta sigue pudiendo
--    nacer activa: la carga de los alumnos que ya pagaron (los 80 del Notion)
--    no puede exigir un pago por fila.
--
-- 2. **Tiene vencimiento, con el CHECK en los dos sentidos** (§2), la forma de
--    `V24` §3: una preinscripta sin plazo es un permiso, y un plazo que
--    sobrevive en una activa se lee como un reloj que no corre.
--
-- 3. **Entra al índice único parcial** (§3): "una por disciplina" pasa a ser
--    ACTIVA **o** PREINSCRIPTA. Sin esto, tres preinscripciones a DJ de la
--    misma persona son legales, y al señar una las otras dos quedan huérfanas.
--    `VIGENTES` (ACTIVA + PAUSADA) NO cambia: una preinscripta no cursa, no
--    cuenta como alumno en el listado ni en el tablero (P60).
--
-- 4. **La escalera** (§4), la forma de `V24` §5 con una regla más:
--      a) A PREINSCRIPTA se entra SOLO al nacer.
--      b) De PREINSCRIPTA se sale SOLO a ACTIVA o a CANCELADA.
--      c) A ACTIVA se sale SOLO con un pago cobrado (SENADO/PAGADO) detrás.
--    La (c) es la que `V24` no necesitaba, porque allá la plata la vigilaba
--    `reserva_sin_plata_detras`; una inscripción nunca tuvo esa condición
--    (sus clases se respaldan solas) y ésta es la única puerta que la pide.
--
-- 5. **Sin fila de `pago` al preinscribir** (P72). La seña se registra cuando
--    llega, como SENADO, y ése es el pago que (c) busca. Deudores muestra la
--    preinscripta calculando desde la inscripción, no desde una deuda anotada
--    — porque una deuda anotada "vence" a los 7 días por la regla de `V17`, y
--    el saldo de un programa no tiene fecha.
-- =============================================================================


-- =============================================================================
-- 1. EL ESTADO
-- =============================================================================

ALTER TABLE inscripcion DROP CONSTRAINT inscripcion_estado_valido;

ALTER TABLE inscripcion ADD CONSTRAINT inscripcion_estado_valido
    CHECK (estado IN ('PREINSCRIPTA', 'ACTIVA', 'COMPLETADA', 'CANCELADA', 'PAUSADA'));

COMMENT ON COLUMN inscripcion.estado IS
    'PREINSCRIPTA: anotada sin senia, con 24 hs (V30, P59/P60). ACTIVA: cursa. '
    'PAUSADA: cursa a medias, conserva sus clases. COMPLETADA / CANCELADA: '
    'terminales. VIGENTES (lo que cuenta como alumno) es ACTIVA + PAUSADA; la '
    'preinscripta NO esta ahi.';


-- =============================================================================
-- 2. EL VENCIMIENTO, Y EL CHECK EN LOS DOS SENTIDOS
--
-- Las 24 horas las pone el servidor (`lajuanita.preinscripcion.vigencia`), no
-- la base: es el número que P59 dejó como ajustable en un solo lugar.
-- =============================================================================

ALTER TABLE inscripcion ADD COLUMN vence_preinscripcion TIMESTAMPTZ;

COMMENT ON COLUMN inscripcion.vence_preinscripcion IS
    'Hasta cuando puede seniarse (V30, P72: 24 hs). NULL en cualquier estado '
    'que no sea PREINSCRIPTA -- lo exige inscripcion_preinscripta_vence. Al '
    'vencer NO se cancela sola: avisa (P61).';

ALTER TABLE inscripcion ADD CONSTRAINT inscripcion_preinscripta_vence
    CHECK ((estado = 'PREINSCRIPTA') = (vence_preinscripcion IS NOT NULL));

COMMENT ON CONSTRAINT inscripcion_preinscripta_vence ON inscripcion IS
    'V30: una preinscripta tiene vencimiento y nada mas lo tiene. Las dos direcciones a proposito -- la forma de V24 §3.';


-- =============================================================================
-- 3. EL ÍNDICE ÚNICO, AMPLIADO
--
-- `V1` lo escribió `WHERE estado = 'ACTIVA'`. Se recrea con la preinscripta
-- adentro. Lo que NO cambia: PAUSADA sigue afuera, así que "dos vigentes en DJ"
-- sigue siendo posible (§12 · C1 lo encontró y el servidor resuelve sólo la
-- ACTIVA); este índice no es la definición de "vigente", es la de "una sola
-- abierta a la vez".
-- =============================================================================

DROP INDEX inscripcion_una_activa_por_disciplina;

CREATE UNIQUE INDEX inscripcion_una_activa_por_disciplina
    ON inscripcion (id_alumno, disciplina)
    WHERE estado IN ('ACTIVA', 'PREINSCRIPTA');


-- =============================================================================
-- 4. LA ESCALERA
--
-- El rodeo que (a) y (b) cierran es el de `V24` §5 y `V18` §1b: activar, volver
-- a preinscripta, y quedar con un plazo nuevo sobre algo que ya cursó. El que
-- (c) cierra es más simple: pasar a ACTIVA a mano desde el `<select>` de
-- estados, sin que haya entrado un peso — que es exactamente lo que P59 vino a
-- impedir y que hoy la pantalla de inscripciones permite con un clic.
--
-- (c) mira `pago.id_inscripcion` con `EstadoPago.ENTRARON` (SENADO, PAGADO) — la
-- lista con nombre, no `<> 'ANULADO'`, que es la lección de `V12`.
--
-- No se chequea el 50%: la base no sabe el monto de la seña (el precio puede
-- haberse acordado distinto al del catálogo, y la seña la cobra una persona).
-- Que exista plata cobrada es lo que la base sostiene; la mitad la pide la
-- pantalla, igual que `V10` con la reserva.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_escalera_de_preinscripcion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    -- (a) A la preinscripción se entra sólo al nacer.
    IF NEW.estado = 'PREINSCRIPTA' THEN
        RAISE EXCEPTION
            'A la preinscripcion se entra solo al crearla. Esta inscripcion ya esta '
            'en % y no puede volver a quedar pendiente de senia.',
            OLD.estado;
    END IF;

    IF OLD.estado = 'PREINSCRIPTA' THEN
        -- (b) Se sale señando o cancelando, y por ningún otro lado.
        IF NEW.estado NOT IN ('ACTIVA', 'CANCELADA') THEN
            RAISE EXCEPTION
                'Una preinscripcion solo puede activarse (cuando entra la senia) o '
                'cancelarse. No se puede pasar a %.',
                NEW.estado;
        END IF;

        -- (c) Y a ACTIVA, sólo con plata cobrada detrás.
        IF NEW.estado = 'ACTIVA' AND NOT EXISTS (
                SELECT 1 FROM pago
                 WHERE id_inscripcion = NEW.id_inscripcion
                   AND estado_pago IN ('SENADO', 'PAGADO')) THEN
            RAISE EXCEPTION
                'Para activar la preinscripcion tiene que estar cobrada la senia: '
                'registra el pago (SENADO) sobre esta inscripcion y la activa sola.';
        END IF;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER inscripcion_escalera_de_preinscripcion
    BEFORE UPDATE ON inscripcion
    FOR EACH ROW EXECUTE FUNCTION verificar_escalera_de_preinscripcion();

COMMENT ON FUNCTION verificar_escalera_de_preinscripcion() IS
    'V30 §4: a PREINSCRIPTA se entra solo al nacer, se sale solo a ACTIVA (con un pago SENADO/PAGADO detras) o a CANCELADA. Sin la vuelta de V11 a proposito: no hay cupo, no hay victima (P60).';
