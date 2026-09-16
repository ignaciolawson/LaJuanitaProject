-- =============================================================================
-- V34 — El premaster se libera cuando lo cobrado cubre el precio
--
-- L4 de la novena barrida (`docs/mejoras.md` §21), decidida en
-- `docs/requirements/platform.md` §27 · P86.
--
--
-- LO QUE HABÍA
--
-- `V1` §8.4 libera el premaster con *cualquier* pago en PAGADO apuntando al
-- trabajo. Era la regla de Ghezz al pie de la letra (*"cuando me pagan"*), y
-- con cobros parciales —que en M&M son un caso real— USD 10 sobre USD 300
-- liberaban el archivo. `pendientes.md` §4 lo dejó como decisión de Ghezz;
-- Ignacio la tomó el 2026-09-15: *"que lo pueda liberar cuando se cubre todo
-- el pago"*.
--
--
-- LO QUE HACE
--
-- Reemplaza la función del trigger (el trigger `premaster_requiere_pago` de
-- `V1` queda y la llama igual). La condición pasa a ser LA MISMA CUENTA que
-- `MasteringService.cobradoDe` y que P79 usa para pasar el trabajo a PAGADO:
-- la suma de lo que entró (`EstadoPago.ENTRARON` = SENADO, PAGADO — la lista
-- de `V12`, por su nombre y no por lo que excluye) EN LA MONEDA DEL TRABAJO,
-- comparada con `precio_acordado`. Desde `V32` un pago sobre un trabajo va en
-- su moneda, así que la restricción por moneda no descarta nada nuevo: existe
-- para que la cuenta sea la misma que la de Java aunque alguna fila anterior
-- a `V32` esté en la otra.
--
-- Un trabajo SIN precio acordado no tiene nada que cubrir y no se libera por
-- esta vía — es el trabajo A_CONFIRMAR, y liberarle el premaster antes de
-- cerrar el presupuesto es exactamente el "entrego y después ando atrás del
-- pago" que el candado existe para evitar.
--
-- LA SALIDA CON MOTIVO QUEDA. `liberado_sin_pago` + `motivo_liberacion` +
-- `id_usuario_libera` siguen siendo la cintura de Ghezz con quien la necesita,
-- firmada. No cambia el CHECK que exige el motivo.
--
-- El mensaje cambia y dos cosas lo leían: `MasteringTest` (afirma sobre el
-- fragmento) y la pantalla, que muestra el texto del 409 tal cual y sólo
-- entonces ofrece "Liberarlo igual, con motivo". La pantalla no busca ningún
-- fragmento; el test sí, y se actualiza con esta migración.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_liberacion_premaster()
RETURNS TRIGGER AS $$
DECLARE
    cobrado NUMERIC(14,2);
BEGIN
    IF NOT NEW.premaster_liberado THEN
        RETURN NEW;
    END IF;

    IF NEW.liberado_sin_pago THEN
        RETURN NEW;   -- excepción explícita; el CHECK de V1 ya exige el motivo
    END IF;

    IF NEW.precio_acordado IS NULL THEN
        RAISE EXCEPTION
            'No se puede liberar el premaster del trabajo %: no tiene precio acordado, '
            'asi que no hay cobro que lo cubra. Para liberarlo igual, usar '
            'liberado_sin_pago con motivo.',
            NEW.id_trabajo;
    END IF;

    SELECT COALESCE(SUM(p.monto), 0) INTO cobrado
      FROM pago p
     WHERE p.id_trabajo_mastering = NEW.id_trabajo
       AND p.estado_pago IN ('SENADO', 'PAGADO')
       AND p.moneda = NEW.moneda;

    IF cobrado < NEW.precio_acordado THEN
        RAISE EXCEPTION
            'No se puede liberar el premaster del trabajo %: lo cobrado (% %) no cubre '
            'el precio acordado (% %). Para liberarlo igual, usar liberado_sin_pago '
            'con motivo.',
            NEW.id_trabajo, NEW.moneda, cobrado, NEW.moneda, NEW.precio_acordado;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verificar_liberacion_premaster() IS
    'V34 (P86): el premaster se libera cuando lo cobrado (SENADO/PAGADO, en la moneda del trabajo) cubre precio_acordado, o con liberado_sin_pago y motivo. Reemplaza a V1 §8.4, que liberaba con cualquier pago PAGADO.';
