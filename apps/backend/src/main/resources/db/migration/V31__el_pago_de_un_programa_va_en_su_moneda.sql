-- =============================================================================
-- V31 — El pago de un programa va en la moneda del contrato
--
-- Fase 3 de la quinta barrida (`docs/mejoras.md` §17 · H4), decidida en
-- `docs/requirements/platform.md` §23 · P74.
--
--
-- EL BUG QUE LO TRAJO, CON DATOS
--
-- Ignacio: *"abono el resto pero no salgo del apartado de deudores"*. No era
-- intermitente: la inscripción 13231 (Mentoría) es de $200 ARS y sus tres
-- pagos fueron USD 100 (SENADO), $100 ARS y USD 100. Deudores cuenta **sólo lo
-- cobrado en la moneda del contrato** (§2.3: el sistema nunca convierte), así
-- que cobrado = $100 de $200 y el saldo es $100. La aritmética tenía razón.
--
--
-- EL BUG DE FONDO: DOS DEFINICIONES DE "LA SEÑA ENTRÓ"
--
-- `V30` §4 (c) activa la preinscripta con *un pago SENADO/PAGADO detrás* y no
-- mira la moneda; Deudores mira sólo la moneda del contrato. Así que la seña en
-- USD **activó** una inscripción cuyo cobrado en su moneda era cero: el estado
-- dice "señada" y la cuenta dice "sin señar". Es el patrón de `V12` —un
-- conjunto escrito por lo que tiene parece el mismo que el escrito por cuánto
-- tiene, y no lo es— ahora entre el estado y la aritmética.
--
-- Las dos salidas eran convertir (con la `cotizacion_dolar` que el pago en USD
-- ya carga) o prohibir. Convertir rompe §2.3 —*"un número que no corresponde a
-- ninguna caja real"*— y todo lo que se apoya en ella (la caja por moneda, el
-- estado de cuenta, el tablero). **Se prohíbe** (P74): un pago que apunta a
-- una inscripción lleva la moneda de esa inscripción. Quien paga en pesos un
-- programa pensado en dólares tiene el contrato cargado en pesos, al cambio
-- del día que se acordó — y el sistema sigue sin convertir nada.
--
-- Con esto las dos preguntas tienen la misma respuesta, porque no puede haber
-- un pago en otra moneda: `V30` §4 (c) no cambia y ya no puede mentir.
--
--
-- POR QUÉ ES UN TRIGGER Y NO UN CHECK, Y POR QUÉ ES DE LA BASE
--
-- Un CHECK no cruza tablas; la moneda del contrato está en `inscripcion`. Y es
-- de la base y no sólo del servicio porque la regla que hoy falla es la de
-- `V30`, que es de la base: una regla de la base sólo se cierra desde la base.
-- El servicio la repite antes para el mensaje (`PagoService.registrar`), y
-- `ManejadorDeErrores` traduce el P0001 a un 409 con este texto.
--
-- Mira INSERT y UPDATE de `moneda` e `id_inscripcion`: editar un pago (`V19` §2)
-- puede cambiarle la moneda, y cambiarle el destino a una inscripción de otra
-- moneda es la misma mentira por otra puerta.
--
--
-- LAS FILAS QUE YA LA VIOLAN NO SE TOCAN
--
-- Se nombran con un NOTICE, como `V21` §2 y `V23` §2: corregirlas sería
-- inventar cobros en una moneda en la que nadie pagó. En la base de desarrollo
-- son tres (7154, 7158, 7159); la 13231 se arregla a mano editando la
-- inscripción a USD, que es lo que Ignacio quiso desde el principio.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- §1. La regla
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verificar_moneda_del_pago_de_inscripcion()
RETURNS TRIGGER AS $$
DECLARE
    moneda_del_contrato VARCHAR(3);
BEGIN
    IF NEW.id_inscripcion IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT moneda INTO moneda_del_contrato
      FROM inscripcion
     WHERE id_inscripcion = NEW.id_inscripcion;

    IF moneda_del_contrato IS DISTINCT FROM NEW.moneda THEN
        RAISE EXCEPTION
            'El pago de un programa va en la moneda del contrato: esta inscripcion '
            'es en % y el pago vino en %. Si se paga en otra moneda, el contrato se '
            'carga en esa moneda (P74).',
            moneda_del_contrato, NEW.moneda;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER pago_en_la_moneda_del_contrato
    BEFORE INSERT OR UPDATE OF moneda, id_inscripcion ON pago
    FOR EACH ROW EXECUTE FUNCTION verificar_moneda_del_pago_de_inscripcion();

COMMENT ON FUNCTION verificar_moneda_del_pago_de_inscripcion() IS
    'V31 §1 (P74): un pago con id_inscripcion lleva la moneda de esa inscripcion. Cierra la contradiccion entre V30 §4 (c) —que activaba con un pago en cualquier moneda— y Deudores, que cuenta solo la moneda del contrato.';


-- -----------------------------------------------------------------------------
-- §2. Las filas que ya la violan: se nombran, no se tocan
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    fila RECORD;
    cuantas INTEGER := 0;
BEGIN
    FOR fila IN
        SELECT p.id_pago, p.id_inscripcion, p.moneda AS moneda_del_pago,
               i.moneda AS moneda_del_contrato, p.monto, p.estado_pago
          FROM pago p
          JOIN inscripcion i ON i.id_inscripcion = p.id_inscripcion
         WHERE p.moneda <> i.moneda
         ORDER BY p.id_pago
    LOOP
        cuantas := cuantas + 1;
        RAISE NOTICE 'V31: el pago % (% %, %) apunta a la inscripcion %, que es en %. '
                     'No cuenta para su saldo y no se corrige solo: revisar a mano.',
            fila.id_pago, fila.moneda_del_pago, fila.monto, fila.estado_pago,
            fila.id_inscripcion, fila.moneda_del_contrato;
    END LOOP;

    IF cuantas > 0 THEN
        RAISE NOTICE 'V31: % pago(s) en otra moneda que su contrato quedaron como estaban.', cuantas;
    END IF;
END $$;
