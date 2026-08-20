-- =============================================================================
-- V16 — EL CANDADO DEL PREMASTER ESTABA ROTO Y NADIE PODÍA ENTERARSE
--
-- `V6` §6 escribió `proteger_pago_de_premaster()` para tapar el ataque de tres
-- pasos: cobrar → liberar el premaster → anular el pago. La regla funciona en el
-- sentido que importa —el UPDATE se rechaza— pero **no por la razón que dice**.
--
-- QUÉ PASA DE VERDAD, medido al construir el Módulo 6:
--
--     UPDATE pago SET estado_pago='ANULADO' WHERE ...
--     ERROR: column reference "id_pago" is ambiguous
--       Detail: It could refer to either a PL/pgSQL variable or a table column.
--       Where: PL/pgSQL function proteger_pago_de_premaster() line 36 at IF
--
-- La función declara una variable llamada `id_pago` y la compara contra la
-- columna homónima: `AND p.id_pago <> id_pago`. Postgres no sabe cuál de las dos
-- es cuál y aborta con SQLSTATE 42702 — antes de llegar al RAISE que explica el
-- problema. Entonces:
--
--   1. El mensaje redactado para una persona ("El pago X es el unico respaldo
--      del premaster ya liberado...") NUNCA se emitió.
--   2. Como 42702 no es P0001, `ManejadorDeErrores` no lo traduce y la API
--      devuelve **500 "No pudimos completar la operación"** en vez del 409 con la
--      explicación. Desde la pantalla, la regla más importante del módulo se ve
--      como un sistema roto.
--   3. Y la rama que SÍ debía dejar pasar —hay otro pago vigente que sostiene la
--      liberación— también revienta, porque el error ocurre en esa misma línea.
--      O sea que el trigger no solo no explicaba: **rechazaba de más.**
--
-- POR QUÉ NADIE LO VIO, que es la parte que conviene no repetir:
-- las suites SQL tienen los casos D02 y D03 —"anular/borrar el pago que respalda
-- un premaster ya liberado"— marcados como 'FALLA', y **estuvieron en verde todo
-- este tiempo**. `probar(...,'FALLA',...)` comprueba que la sentencia falle, no
-- por qué falla, así que un bug en el trigger es indistinguible de la regla
-- funcionando. Es la contracara exacta de la lección que las suites ya tenían
-- escrita para el otro lado ("un caso 'ANDA' tiene que verificar que afectó
-- filas"): **un caso 'FALLA' tiene que verificar el mensaje.**
-- La suite adversarial gana en esta tanda un `probar_mensaje(...)` para eso, y
-- D02 pasa a usarlo.
--
-- EL ARREGLO: renombrar la variable. `id_pago_tocado` no colisiona con ninguna
-- columna, que es la forma recomendada de resolver un conflicto de nombres en
-- plpgsql (la alternativa, `#variable_conflict`, esconde el problema en vez de
-- sacarlo). El resto de la lógica queda igual, con una sola limpieza señalada
-- abajo.
-- =============================================================================

CREATE OR REPLACE FUNCTION proteger_pago_de_premaster()
RETURNS TRIGGER AS $$
DECLARE
    trabajo        RECORD;
    id_pago_tocado BIGINT;
    id_destino     BIGINT;
    nuevo_estado   TEXT;
BEGIN
    -- Sirve para UPDATE y para DELETE: en DELETE no hay NEW.
    IF TG_OP = 'DELETE' THEN
        id_pago_tocado := OLD.id_pago;
        id_destino     := OLD.id_trabajo_mastering;
        nuevo_estado   := 'ELIMINADO';
    ELSE
        id_pago_tocado := NEW.id_pago;
        nuevo_estado   := NEW.estado_pago;

        -- Un UPDATE que deja el pago vigente no toca nada.
        IF NEW.estado_pago = 'PAGADO'
           AND OLD.id_trabajo_mastering IS NOT DISTINCT FROM NEW.id_trabajo_mastering THEN
            RETURN NEW;
        END IF;

        -- Se mira el destino VIEJO: lo que hay que proteger es el trabajo que el
        -- pago respaldaba hasta recién, no al que lo estén mudando.
        -- (`V6` le asignaba antes el destino NEW y lo pisaba acá sin usarlo; se
        -- saca porque hacía leer la función como si NEW importara.)
        id_destino := OLD.id_trabajo_mastering;
    END IF;

    IF id_destino IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT * INTO trabajo FROM trabajo_mastering
     WHERE id_trabajo = id_destino FOR UPDATE;

    IF NOT FOUND OR NOT trabajo.premaster_liberado OR trabajo.liberado_sin_pago THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- ¿Queda ALGÚN otro pago vigente que sostenga la liberación?
    -- Acá estaba el choque de nombres: `id_pago` era a la vez la variable y la
    -- columna de `pago`.
    IF EXISTS (
        SELECT 1 FROM pago p
         WHERE p.id_trabajo_mastering = id_destino
           AND p.estado_pago = 'PAGADO'
           AND p.id_pago <> id_pago_tocado
    ) THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    RAISE EXCEPTION
        'El pago % es el unico respaldo del premaster ya liberado del trabajo % '
        '(intento dejarlo en %). Para dejarlo sin pago hay que marcar el trabajo '
        'con liberado_sin_pago y su motivo.',
        id_pago_tocado, id_destino, nuevo_estado;
END; $$ LANGUAGE plpgsql;
