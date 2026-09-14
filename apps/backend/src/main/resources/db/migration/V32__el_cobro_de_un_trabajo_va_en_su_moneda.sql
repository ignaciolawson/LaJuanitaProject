-- =============================================================================
-- V32 — El cobro de un trabajo de Mix & Mastering va en la moneda del trabajo
--
-- Fase 3 de la octava barrida (`docs/mejoras.md` §20 · K6), decidida en
-- `docs/requirements/platform.md` §26 · P81. Es el espejo de `V31` sobre
-- `id_trabajo_mastering`, y conviene leer aquélla primero: el argumento es el
-- mismo y acá sólo se dice lo que cambia.
--
--
-- EL BUG, Y POR QUÉ ES EL MISMO DE `V31`
--
-- `MasteringService.cobradoDe` suma lo que entró contra un trabajo **en la
-- moneda del trabajo** y descarta el resto — no es que el pago no exista, es
-- que sin cotización no se puede comparar con el precio (§2.3: el sistema
-- nunca convierte). Hasta esta barrida el formulario de cobro dejaba elegir
-- la moneda, así que un trabajo en USD cobrado en ARS quedaba **invisible**:
-- "sin cobrar" en pantalla, PAGADO nunca, y el aviso de los 7 días sonando
-- sobre plata que estaba en la caja. Dos definiciones de "está pagado" —una en
-- el estado, otra en la aritmética— exactamente lo que `V31` cerró para las
-- inscripciones.
--
--
-- POR QUÉ ES UN TRIGGER Y NO SÓLO EL SERVICIO
--
-- `CobroRequest` ya no trae moneda: el cobro desde `/api/mastering/{id}/cobro`
-- no puede disentir. Pero el pago también entra por `/api/pagos` (alta y
-- edición, `V19` §2), y ahí la moneda se elige. Si la regla viviera en la base
-- para las inscripciones (`V31`) y en Java para los trabajos, "pagar en la
-- moneda del contrato" significaría una cosa en Pagos y otra en M&M — el
-- argumento de `V25` con `V21`. Mira INSERT y UPDATE de `moneda` e
-- `id_trabajo_mastering`, como su gemela.
--
-- Lo que este trigger NO cubre, y lo cubre el servicio: editar la **moneda
-- del trabajo** con pagos adentro. Acá se mira el pago que entra, no el
-- trabajo que cambia; `MasteringService.editar` rechaza ese cambio mientras
-- haya cobros. (`V31` tiene el mismo hueco del lado de `inscripcion`, y queda
-- anotado en la §20 para la barrida siguiente.)
--
--
-- LAS FILAS QUE YA LA VIOLAN NO SE TOCAN
--
-- Se nombran con un NOTICE, como `V31` §2. En la base de desarrollo no hay
-- ninguna al día de hoy; en producción no puede haberla porque no hay
-- producción todavía. El bloque queda igual: la migración corre una vez y en
-- una base que no es ésta.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- §1. La regla
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verificar_moneda_del_pago_de_trabajo()
RETURNS TRIGGER AS $$
DECLARE
    moneda_del_trabajo VARCHAR(3);
BEGIN
    IF NEW.id_trabajo_mastering IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT moneda INTO moneda_del_trabajo
      FROM trabajo_mastering
     WHERE id_trabajo = NEW.id_trabajo_mastering;

    IF moneda_del_trabajo IS DISTINCT FROM NEW.moneda THEN
        RAISE EXCEPTION
            'El cobro de un trabajo va en la moneda del trabajo: este trabajo es '
            'en % y el pago vino en %. Si pagan en otra moneda, el pago se carga '
            'en la del trabajo con la cotizacion del dia (P81).',
            moneda_del_trabajo, NEW.moneda;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER pago_en_la_moneda_del_trabajo
    BEFORE INSERT OR UPDATE OF moneda, id_trabajo_mastering ON pago
    FOR EACH ROW EXECUTE FUNCTION verificar_moneda_del_pago_de_trabajo();

COMMENT ON FUNCTION verificar_moneda_del_pago_de_trabajo() IS
    'V32 §1 (P81): un pago con id_trabajo_mastering lleva la moneda de ese trabajo. Espejo de V31 para M&M: cierra la contradiccion entre lo cobrado en pantalla —que solo suma la moneda del trabajo— y un pago en la otra moneda que existe igual.';


-- -----------------------------------------------------------------------------
-- §2. Las filas que ya la violan: se nombran, no se tocan
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    fila RECORD;
    cuantas INTEGER := 0;
BEGIN
    FOR fila IN
        SELECT p.id_pago, p.id_trabajo_mastering, p.moneda AS moneda_del_pago,
               t.moneda AS moneda_del_trabajo, p.monto, p.estado_pago
          FROM pago p
          JOIN trabajo_mastering t ON t.id_trabajo = p.id_trabajo_mastering
         WHERE p.moneda <> t.moneda
         ORDER BY p.id_pago
    LOOP
        cuantas := cuantas + 1;
        RAISE NOTICE 'V32: el pago % (% %, %) apunta al trabajo %, que es en %. '
                     'No cuenta como cobrado y no se corrige solo: revisar a mano.',
            fila.id_pago, fila.moneda_del_pago, fila.monto, fila.estado_pago,
            fila.id_trabajo_mastering, fila.moneda_del_trabajo;
    END LOOP;

    IF cuantas > 0 THEN
        RAISE NOTICE 'V32: % pago(s) en otra moneda que su trabajo quedaron como estaban.', cuantas;
    END IF;
END $$;
