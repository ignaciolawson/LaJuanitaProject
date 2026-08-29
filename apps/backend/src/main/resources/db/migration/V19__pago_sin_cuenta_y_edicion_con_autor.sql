-- =============================================================================
-- V19 · LAS DOS REGLAS DE `pago` QUE LA ETAPA DE MEJORAS PIDIÓ
--
-- Las dos vienen de `docs/mejoras.md` §9.1 y §9.3, decididas con Ignacio el
-- 2026-08-28, y van juntas EN UNA SOLA MIGRACIÓN a propósito: tocan la misma
-- tabla, así que hacerlas juntas significa una revisión de las reglas de `pago`
-- en vez de dos, y una migración en vez de dos. En un esquema donde las
-- migraciones son inmutables y se acumulan, eso no es prolijidad.
--
-- ⚠️ ANTES DE EDITAR ESTE ARCHIVO: si ya se aplicó, no se toca. Flyway guarda el
-- checksum y la aplicación no arranca si no coincide. `V18` lo enseñó a un costo
-- real: se editó después de aplicado y hubo que reparar la fila de
-- `flyway_schema_history` a mano para no perder los datos de demostración.
-- =============================================================================


-- =============================================================================
-- 1. UN PAGO PUEDE SER DE ALGUIEN QUE NO TIENE CUENTA
--
-- El hallazgo que la motiva (`mejoras.md` §8 #1): una venta de equipo a un
-- comprador sin cuenta **no se podía cobrar nunca**. No era un botón que
-- faltaba: `pago.id_usuario` era NOT NULL, así que la plata de alguien que no
-- está en el sistema no tenía dónde colgarse. Las tres capas coincidían en
-- rechazarlo —el formulario, el `@AssertTrue` del DTO y el NOT NULL—, y la
-- salida prevista por el Módulo 3 (anular la venta y recargarla con su cobro)
-- solo funciona si el comprador tiene cuenta.
--
-- Y no es un caso de borde: las ventas van contra el stock de Pioneer (§1) y el
-- que compra un CDJ no se registra en un estudio de música para hacerlo.
--
-- **POR QUÉ EL COBRO SIGUE SIENDO UN `pago` Y NO OTRA COSA.** La alternativa
-- —que el cobro de una venta dejara de ser un `pago`— se descartó por una razón
-- del negocio, no técnica: **el Tablero (Módulo 8) calcula los ingresos por
-- línea de negocio leyendo `pago`.** Si el cobro de una venta no fuera un pago,
-- la venta de equipamiento desaparecería de los ingresos del tablero, que es
-- justamente el número por el que se abre esa pantalla.
--
-- La forma es la que el esquema ya usa dos veces: **identificado por uno de dos
-- caminos.** `venta_comprador_identificado` (V1) lo hace con el comprador, y
-- `V10`/`V12` lo hacen con la plata detrás de una reserva (pago propio o
-- inscripción del participante). Acá: cuenta, o nombre escrito.
--
-- ⚠️ CINCO CONSULTAS ASUMÍAN QUE TODO PAGO TIENE DUEÑO. Están listadas en
-- `mejoras.md` §9.1 y se revisan en el backend, no acá:
--   1. `PagoRepository.deLaPersona`  — la definición de "mío" del portal
--   2. El estado de cuenta            3. La pantalla de deudores
--   4. El agrupamiento del Tablero    5. La clave de dedup del scheduler de avisos
-- El riesgo no es que sean difíciles: es olvidarse de una y que un pago sin
-- dueño se caiga en silencio de un total.
-- =============================================================================

ALTER TABLE pago ALTER COLUMN id_usuario DROP NOT NULL;

ALTER TABLE pago
    ADD COLUMN nombre_pagador_externo   VARCHAR(150),
    ADD COLUMN contacto_pagador_externo VARCHAR(150);

COMMENT ON COLUMN pago.id_usuario IS
    'Quien pago, cuando tiene cuenta. NULLABLE desde V19: la otra mitad es nombre_pagador_externo. Ver pago_pagador_identificado.';
COMMENT ON COLUMN pago.nombre_pagador_externo IS
    'Quien pago, cuando NO tiene cuenta. Espeja nombre_comprador_externo de venta_equipo. Ver V19 seccion 1.';
COMMENT ON COLUMN pago.contacto_pagador_externo IS
    'Telefono o mail del pagador sin cuenta. Opcional: identificar no es poder contactar.';

-- El `coalesce` NO es decorativo y la lección ya está pagada en V7 §1: **un
-- CHECK que evalúa a NULL no rechaza nada** —solo rechaza cuando da FALSE—, así
-- que `btrim(x) <> ''` con `x` en NULL deja pasar la fila. `venta_equipo` usa
-- `IS NOT NULL` a secas y por eso acepta un nombre que es una cadena vacía; acá
-- se escribe bien desde el principio en vez de heredar el agujero.
ALTER TABLE pago ADD CONSTRAINT pago_pagador_identificado
    CHECK (id_usuario IS NOT NULL
           OR coalesce(btrim(nombre_pagador_externo), '') <> '');

COMMENT ON CONSTRAINT pago_pagador_identificado ON pago IS
    'Un pago dice de quien es: cuenta o nombre escrito. Un pago sin dueño identificable es plata que despues no se le puede atribuir a nadie. Ver V19 seccion 1.';

-- NO se agrega un índice para `id_usuario IS NULL`, y se escribe acá para que no
-- parezca un olvido: **ninguna consulta busca hoy los pagos sin dueño.** Un
-- índice que nada usa se paga en cada INSERT y en la primera lectura de quien lo
-- encuentre y se pregunte para qué está. Si esa consulta aparece —una revisión de
-- calidad de datos, por ejemplo— viene con su propia migración.


-- =============================================================================
-- 2. EDITAR UN PAGO EXIGE DECIR QUIÉN LO HIZO
--
-- El hallazgo (`mejoras.md` §8 #6): un pago mal cargado solo se podía anular y
-- recargar. Ignacio pidió edición directa, y la decisión quedó en §9.3.
--
-- **La base NUNCA prohibió editar un pago.** `V6` §7 bloquea el DELETE, no el
-- UPDATE; lo que faltaba era la pantalla. Así que esta sección no destraba nada
-- que estuviera cerrado: le pone la condición con la que se abre.
--
-- **Y la condición es la de `V7` §2, con el mismo argumento.** Ahí se escribió
-- que cambiar un PRESENTE por un AUSENTE decide cuántas clases le quedan a un
-- alumno, y por eso exige autor. Acá: **cambiar un monto decide la caja.** Es la
-- misma clase de edición —una que mueve un número que alguien va a leer como
-- verdad— y merece la misma auditoría.
--
-- Se reutiliza `exigir_autor_de_la_edicion()` de V7 TAL CUAL, sin tocarla: ya
-- hace exactamente esto y ya está probada. Lo que hace falta es que `pago` tenga
-- dónde escribir, que es lo que `reserva_participante` tampoco tenía.
--
-- ⚠️ HEREDA EL LÍMITE CONOCIDO DE V7, y se repite acá para que nadie lo
-- descubra creyendo que estaba cubierto: el trigger exige que la columna NO ESTÉ
-- EN NULL, no que la edición de hoy haya declarado su autor. Después de la
-- primera edición auditada el campo queda cargado, y una segunda que no lo toque
-- pasa con el autor de la anterior. Cerrarlo del todo pide que la aplicación
-- declare quién opera (`SET LOCAL app.usuario_actual`), que es una decisión de
-- diseño del backend y no de una migración. Lo que sí queda cerrado es el caso
-- que motiva la regla: una edición desde afuera de la aplicación, o un endpoint
-- que se olvide de pasar el autor, no entra.
-- =============================================================================

ALTER TABLE pago
    ADD COLUMN id_usuario_modifico BIGINT REFERENCES usuario (id_usuario),
    ADD COLUMN fecha_modificacion  TIMESTAMPTZ;

COMMENT ON COLUMN pago.id_usuario_modifico IS
    'Quien edito el pago por ultima vez. Lo exige pago_edicion_con_autor. Ver V19 seccion 2.';
COMMENT ON COLUMN pago.fecha_modificacion IS
    'Cuando. La escribe el trigger y no quien edita: un sello que el cliente elige se puede antedatar (DB-07).';

-- Solo cuando cambia algo que le importa a alguien, igual que `reserva_edicion_
-- con_autor`. Corregir el concepto o adjuntar el comprobante no es "editar la
-- plata"; cambiar el monto, la moneda, la cotización, el medio, el descuento, la
-- fecha o de quién es el pago, sí.
--
-- `estado_pago` NO está en esta lista **a propósito**: la anulación ya tiene su
-- propia regla (`pago_anulacion_justificada`, V7 §1), que exige autor, fecha Y
-- motivo escrito — más que esta. Ponerlo acá le daría dos condiciones a la misma
-- transición y la más débil sería la que se lee primero.
CREATE TRIGGER pago_edicion_con_autor
    BEFORE UPDATE ON pago
    FOR EACH ROW
    WHEN (OLD.monto                IS DISTINCT FROM NEW.monto
       OR OLD.moneda               IS DISTINCT FROM NEW.moneda
       OR OLD.cotizacion_dolar     IS DISTINCT FROM NEW.cotizacion_dolar
       OR OLD.medio_pago           IS DISTINCT FROM NEW.medio_pago
       OR OLD.descuento_porcentaje IS DISTINCT FROM NEW.descuento_porcentaje
       OR OLD.fecha_pago           IS DISTINCT FROM NEW.fecha_pago
       OR OLD.id_usuario           IS DISTINCT FROM NEW.id_usuario
       OR OLD.id_inscripcion       IS DISTINCT FROM NEW.id_inscripcion
       OR OLD.id_reserva           IS DISTINCT FROM NEW.id_reserva
       OR OLD.id_trabajo_mastering IS DISTINCT FROM NEW.id_trabajo_mastering
       OR OLD.id_venta_equipo      IS DISTINCT FROM NEW.id_venta_equipo)
    EXECUTE FUNCTION exigir_autor_de_la_edicion();
