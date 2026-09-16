-- =============================================================================
-- V33 — El precio de una reserva, y la moneda de lo que tiene plata adentro
--
-- L1 de la novena barrida (`docs/mejoras.md` §21), decidida en
-- `docs/requirements/platform.md` §27 · P83.
--
--
-- EL HALLAZGO
--
-- Ignacio: *"recién señé una cabina y eso fue a pagos y no figura en deudores,
-- todo lo que no está pagado al completo va en deudores"*. Deudores sabe decir
-- "seña abonada, falta el resto" de una inscripción porque le resta lo cobrado
-- a `inscripcion.precio_total`; de una reserva no puede decir nada porque
-- `reserva` NO TIENE PRECIO. Es lo que P72 dejó escrito como *"mismo caso para
-- reservas"* y la §16 no pudo construir: la mitad de P13 que `V28` no cerró.
--
-- Hasta hoy el precio de un alquiler existía sólo en la cabeza de quien
-- cargaba la seña (`AltaSenaRequest`: *"el 50% lo sostiene quien carga"*) y
-- `V10` sólo podía exigir QUE HAYA un pago, no que sea la mitad de algo.
--
--
-- LO QUE HACE
--
-- §1  `reserva.precio_total` + `reserva.moneda`, nullable y atadas: las dos o
--     ninguna. Las reservas anteriores quedan sin precio y no se les inventa
--     uno; una reserva sin precio no reclama deuda (no hay número que
--     reclamar) y la edición lo puede cargar después. Que una clase NO lleve
--     precio —su plata es la inscripción— y que un alquiler SÍ lo lleve al
--     nacer lo sostiene el servicio: no protege plata, protege coherencia, y
--     un trigger cruzando a `tipo_uso` para eso sería más regla que la que
--     hace falta (el criterio de `V14`).
--
-- §2  El pago de una reserva con precio va en la moneda de la reserva. Es la
--     tercera gemela de `V31` (inscripción) y `V32` (trabajo), por el mismo
--     argumento: Deudores cuenta sólo lo cobrado en la moneda de la cosa
--     (§2.3, nunca se convierte), así que una cabina en dólares señada en
--     pesos diría "cobrado cero". Una reserva sin precio no tiene moneda, y
--     su pago sigue libre — el caso 270 de la suite de reglas sigue valiendo.
--
-- §3  NO SE LE CAMBIA LA MONEDA A NADA QUE TENGA PLATA ADENTRO. Es el hueco
--     simétrico que `V31` y `V32` dejaron y `pendientes.md` §4 anotaba: las
--     dos miran el pago que ENTRA, no el contrato que CAMBIA. Un contrato en
--     USD con su seña en USD editado a ARS deja cobrado cero en la moneda del
--     contrato y estado ACTIVA — exactamente la mentira que `V31` vino a
--     evitar, por la otra puerta. Para M&M lo cerraba `MasteringService.editar`
--     en Java; acá lo cierra la base para las tres tablas con UNA función.
--
--     La regla exacta es "después del cambio, ningún pago vivo puede quedar en
--     otra moneda", y no "no se cambia si hay pagos": la segunda dejaría sin
--     arreglo a la inscripción 13231 (`V31` §2 la nombra: contrato en ARS con
--     dos pagos en USD y uno en ARS), que se corrige anulando el pago en pesos
--     y editando el contrato a USD. Con la regla exacta eso pasa; con la
--     gruesa, nunca.
--
--     "Vivo" es `estado_pago <> 'ANULADO'`, y acá ese conjunto es el correcto
--     aunque `V12` enseñe a desconfiar de él: una deuda anotada (DEBE) en la
--     moneda vieja también queda mintiendo si el contrato cambia, así que
--     cuenta. Lo que `V12` corrigió fue "qué es plata que entró"; esto es "qué
--     fila habla de esta moneda", y son preguntas distintas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- §1. El precio y la moneda
-- -----------------------------------------------------------------------------

ALTER TABLE reserva
    ADD COLUMN precio_total NUMERIC(14,2),
    ADD COLUMN moneda       VARCHAR(3);

ALTER TABLE reserva
    ADD CONSTRAINT reserva_moneda_valida
        CHECK (moneda IS NULL OR moneda IN ('ARS', 'USD')),
    -- Mayor a cero y no "mayor o igual": una inscripción a cero es una beca,
    -- pero una reserva a cero es un uso de sala gratuito (P35, "práctica
    -- libre", sin decidir) y `V10` le exigiría igual un pago que no puede
    -- existir. Si algún día hay reservas gratis, es un tipo de uso, no un
    -- precio.
    ADD CONSTRAINT reserva_precio_positivo
        CHECK (precio_total IS NULL OR precio_total > 0),
    -- Las dos o ninguna: un precio sin moneda no se puede comparar con ningún
    -- pago, y una moneda sin precio no dice nada. Es la forma de `V24` §2.
    ADD CONSTRAINT reserva_precio_con_moneda
        CHECK ((precio_total IS NULL) = (moneda IS NULL));

COMMENT ON COLUMN reserva.precio_total IS
    'V33 (P83): el precio de un alquiler o una grabacion. NULL en las clases (su plata es la inscripcion) y en las reservas anteriores a V33. Con precio, Deudores calcula lo que falta.';
COMMENT ON COLUMN reserva.moneda IS
    'V33 (P83): la moneda del precio. Un pago que apunta a la reserva lleva esta moneda (§2), y no se cambia con pagos vivos en otra (§3).';


-- -----------------------------------------------------------------------------
-- §2. El pago de una reserva con precio va en su moneda
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verificar_moneda_del_pago_de_reserva()
RETURNS TRIGGER AS $$
DECLARE
    moneda_de_la_reserva VARCHAR(3);
BEGIN
    IF NEW.id_reserva IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT moneda INTO moneda_de_la_reserva
      FROM reserva
     WHERE id_reserva = NEW.id_reserva;

    -- Sin precio no hay moneda que respetar: las reservas de antes de V33.
    IF moneda_de_la_reserva IS NULL THEN
        RETURN NEW;
    END IF;

    IF moneda_de_la_reserva <> NEW.moneda THEN
        RAISE EXCEPTION
            'El pago de una reserva va en la moneda de la reserva: esta reserva '
            'es en % y el pago vino en %. Si se paga en otra moneda, la reserva se '
            'carga en esa moneda (P83).',
            moneda_de_la_reserva, NEW.moneda;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER pago_en_la_moneda_de_la_reserva
    BEFORE INSERT OR UPDATE OF moneda, id_reserva ON pago
    FOR EACH ROW EXECUTE FUNCTION verificar_moneda_del_pago_de_reserva();

COMMENT ON FUNCTION verificar_moneda_del_pago_de_reserva() IS
    'V33 §2 (P83): un pago con id_reserva lleva la moneda de esa reserva, si la reserva tiene precio. La tercera gemela de V31 y V32.';


-- -----------------------------------------------------------------------------
-- §3. La moneda de una cosa con plata adentro no se cambia
-- -----------------------------------------------------------------------------
--
-- Una función para tres tablas. Cada trigger le dice por argumento qué columna
-- de `pago` apunta a su tabla y cómo se llama su clave; la clave se lee de NEW
-- por nombre, porque una función de trigger no puede escribir `NEW.<variable>`.

CREATE OR REPLACE FUNCTION verificar_cambio_de_moneda_con_plata_adentro()
RETURNS TRIGGER AS $$
DECLARE
    columna_del_pago TEXT   := TG_ARGV[0];
    columna_clave    TEXT   := TG_ARGV[1];
    id_de_la_cosa    BIGINT := (to_jsonb(NEW) ->> columna_clave)::BIGINT;
    en_otra_moneda   INTEGER;
BEGIN
    -- Sin moneda nueva no hay nada contra lo que comparar (una reserva a la
    -- que se le saca el precio). Sacarla y volver a ponerla en otra moneda
    -- no esquiva nada: el segundo UPDATE vuelve a entrar acá con moneda.
    IF NEW.moneda IS NULL OR NEW.moneda IS NOT DISTINCT FROM OLD.moneda THEN
        RETURN NEW;
    END IF;

    EXECUTE format(
        'SELECT count(*) FROM pago WHERE %I = $1 AND estado_pago <> ''ANULADO'' AND moneda <> $2',
        columna_del_pago)
       INTO en_otra_moneda
      USING id_de_la_cosa, NEW.moneda;

    IF en_otra_moneda > 0 THEN
        RAISE EXCEPTION
            'No se le puede cambiar la moneda de % a %: tiene % pago(s) vivo(s) en otra moneda. '
            'Si esta en la moneda equivocada, primero se anulan esos pagos y se recargan (P83).',
            OLD.moneda, NEW.moneda, en_otra_moneda;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER inscripcion_moneda_con_plata_adentro
    BEFORE UPDATE OF moneda ON inscripcion
    FOR EACH ROW EXECUTE FUNCTION verificar_cambio_de_moneda_con_plata_adentro('id_inscripcion', 'id_inscripcion');

CREATE TRIGGER reserva_moneda_con_plata_adentro
    BEFORE UPDATE OF moneda ON reserva
    FOR EACH ROW EXECUTE FUNCTION verificar_cambio_de_moneda_con_plata_adentro('id_reserva', 'id_reserva');

CREATE TRIGGER trabajo_moneda_con_plata_adentro
    BEFORE UPDATE OF moneda ON trabajo_mastering
    FOR EACH ROW EXECUTE FUNCTION verificar_cambio_de_moneda_con_plata_adentro('id_trabajo_mastering', 'id_trabajo');

COMMENT ON FUNCTION verificar_cambio_de_moneda_con_plata_adentro() IS
    'V33 §3 (P83): la moneda de una inscripcion, una reserva o un trabajo no cambia si le quedaria algun pago vivo en otra moneda. Cierra el hueco simetrico de V31/V32 para las tres tablas.';
