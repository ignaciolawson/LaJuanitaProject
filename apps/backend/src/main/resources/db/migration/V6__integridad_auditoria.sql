-- =============================================================================
-- Correcciones de integridad — auditoría adversarial del 2026-08-12
--
-- Todo lo que hay acá se agrega porque una prueba adversarial DEMOSTRÓ que la
-- regla podía violarse con SQL directo, no porque "convenga" o "sea buena
-- práctica". Cada bloque dice qué ataque lo motivó.
--
-- Lo que NO está acá está afuera a propósito: son reglas que necesitan una
-- decisión de negocio de Ignacio antes de codificarse (cuántas clases descuenta
-- una recuperación, si un profesor puede estar en dos salas a la vez, si
-- `sala.activa` debe bloquear reservas). Están listadas en
-- `docs/db/auditoria-2026-08-12.md` §"Pendiente de decisión".
--
-- Momento elegido: la base de desarrollo tiene 2 usuarios y CERO filas de
-- plata. Es el mismo razonamiento que V4 -- agregar CHECKs sobre tablas vacías
-- no puede fallar; hacerlo en diciembre con el Notion adentro, sí.
-- =============================================================================


-- =============================================================================
-- 1. DINERO QUE PODÍA SER NEGATIVO
--
-- Ataque: INSERT INTO inscripcion (...) precio_total = -500000  → PASABA.
--         INSERT INTO venta_equipo (...) precio = -100          → PASABA.
--         INSERT INTO trabajo_mastering (...) precio_acordado=-100 → PASABA.
--
-- `pago` y `egreso` ya tenían su CHECK de monto positivo desde V1. Que estas
-- tres no lo tuvieran no fue una decisión: fue un olvido, y se nota justamente
-- porque las otras dos sí lo tienen. Un precio negativo no da error en ningún
-- lado -- se suma al balance y lo baja.
--
-- Se usa >= 0 y no > 0 porque un curso becado al 100% o un equipo entregado
-- como parte de un acuerdo pueden valer 0 legítimamente. Lo que no existe es
-- un precio NEGATIVO.
-- =============================================================================

ALTER TABLE inscripcion ADD CONSTRAINT inscripcion_precio_no_negativo
    CHECK (precio_total >= 0);

ALTER TABLE venta_equipo ADD CONSTRAINT venta_precio_no_negativo
    CHECK (precio >= 0);

ALTER TABLE trabajo_mastering ADD CONSTRAINT trabajo_precio_no_negativo
    CHECK (precio_acordado IS NULL OR precio_acordado >= 0);


-- =============================================================================
-- 2. COTIZACIÓN DEL DÓLAR EN CERO O NEGATIVA
--
-- Ataque: INSERT INTO pago (... moneda='USD', cotizacion_dolar = 0)   → PASABA.
--         Lo mismo con -1450, y en las cinco tablas que llevan cotización.
--
-- V1 se ocupó de que un importe en USD no pueda entrar SIN cotización, pero no
-- de que la cotización tenga sentido. Con cotización 0, todo reporte que
-- convierta a pesos da 0: cien dólares cobrados desaparecen del balance sin
-- que nada falle. Es el peor tipo de error contable, el que no hace ruido.
-- =============================================================================

ALTER TABLE pago ADD CONSTRAINT pago_cotizacion_positiva
    CHECK (cotizacion_dolar IS NULL OR cotizacion_dolar > 0);

ALTER TABLE egreso ADD CONSTRAINT egreso_cotizacion_positiva
    CHECK (cotizacion_dolar IS NULL OR cotizacion_dolar > 0);

ALTER TABLE inscripcion ADD CONSTRAINT inscripcion_cotizacion_positiva
    CHECK (cotizacion_dolar IS NULL OR cotizacion_dolar > 0);

ALTER TABLE venta_equipo ADD CONSTRAINT venta_cotizacion_positiva
    CHECK (cotizacion_dolar IS NULL OR cotizacion_dolar > 0);

ALTER TABLE trabajo_mastering ADD CONSTRAINT trabajo_cotizacion_positiva
    CHECK (cotizacion_dolar IS NULL OR cotizacion_dolar > 0);


-- =============================================================================
-- 3. REVISIONES CONSUMIDAS POR ENCIMA DE LAS INCLUIDAS
--
-- Ataque: revisiones_incluidas = 3, revisiones_realizadas = 99 → PASABA.
--
-- V1 solo pedía que ninguna de las dos fuera negativa. El dato existe para
-- responder "¿le quedan revisiones a este cliente?", y sin esta regla la
-- respuesta puede ser un número imposible.
-- =============================================================================

ALTER TABLE trabajo_mastering ADD CONSTRAINT trabajo_revisiones_coherentes
    CHECK (revisiones_realizadas <= revisiones_incluidas);


-- =============================================================================
-- 4. UN USUARIO CON DOS FICHAS DE ARTISTA
--
-- Ataque: dos INSERT en `artista` con el mismo id_usuario → PASABA.
--
-- `alumno` y `profesor` llevan UNIQUE en id_usuario desde V1; `artista` no, y
-- no hay razón de dominio para la diferencia -- una persona es un artista, no
-- varios. Con dos fichas, "los releases de Ghezz" devuelve la mitad.
--
-- Parcial porque id_usuario es NULL para los artistas que todavía no tienen
-- cuenta, que hoy son todos.
-- =============================================================================

CREATE UNIQUE INDEX artista_usuario_unico ON artista (id_usuario)
    WHERE id_usuario IS NOT NULL;


-- =============================================================================
-- 5. STRINGS VACÍOS DONDE SE ESPERABA "SIN DATO"
--
-- Ataque: dos usuarios con telefono = '' → el SEGUNDO choca contra
--         `usuario_telefono_unico`, porque '' no es NULL y el índice parcial
--         sí lo indexa. El error que ve la persona es "teléfono duplicado"
--         cuando ninguno de los dos cargó un teléfono.
--
-- `UsuarioService.normalizar()` ya convierte '' en NULL y su comentario
-- describe exactamente esta trampa: el backend ya está bien. Esto es para que
-- la base no dependa de que el backend se acuerde -- que es la regla que sigue
-- todo el resto del esquema.
--
-- Se suman nombre/apellido/email: son NOT NULL desde V1, lo que no impide un
-- string vacío. Un usuario llamado '' pasa todas las validaciones de la base.
-- =============================================================================

ALTER TABLE usuario ADD CONSTRAINT usuario_telefono_no_vacio
    CHECK (telefono IS NULL OR btrim(telefono) <> '');

ALTER TABLE usuario ADD CONSTRAINT usuario_nombre_no_vacio
    CHECK (btrim(nombre) <> '' AND btrim(apellido) <> '');

ALTER TABLE usuario ADD CONSTRAINT usuario_email_no_vacio
    CHECK (btrim(email) <> '');


-- =============================================================================
-- 6. EL CANDADO DEL PREMASTER SE ABRÍA POR ATRÁS
--
-- Ataque, en tres pasos y todos permitidos:
--     1. INSERT pago (estado_pago='PAGADO') contra el trabajo
--     2. UPDATE trabajo_mastering SET premaster_liberado=TRUE   → el trigger
--        de V1 encuentra el pago y deja pasar. Correcto.
--     3. UPDATE pago SET estado_pago='ANULADO'                  → PASABA.
--        (o directamente DELETE FROM pago                       → PASABA.)
--
-- Estado final medido: premaster_liberado = TRUE y el único pago del trabajo
-- ANULADO. El cliente se llevó el premaster y en la base no hay cobro. Es
-- exactamente lo que el Módulo 6 viene a evitar, y el trigger de V1 no lo veía
-- porque solo mira el momento de la liberación, nunca lo que pasa después.
--
-- La salida sigue existiendo, y sigue siendo la misma que eligió Ghezz: marcar
-- `liberado_sin_pago` con motivo. Lo que ya no se puede es borrar el respaldo
-- y dejar el premaster liberado como si nada.
-- =============================================================================

CREATE OR REPLACE FUNCTION proteger_pago_de_premaster()
RETURNS TRIGGER AS $$
DECLARE
    trabajo   RECORD;
    id_pago   BIGINT;
    id_destino BIGINT;
    nuevo_estado TEXT;
BEGIN
    -- Sirve para UPDATE y para DELETE: en DELETE no hay NEW.
    IF TG_OP = 'DELETE' THEN
        id_pago := OLD.id_pago;
        id_destino := OLD.id_trabajo_mastering;
        nuevo_estado := 'ELIMINADO';
    ELSE
        id_pago := NEW.id_pago;
        id_destino := NEW.id_trabajo_mastering;
        nuevo_estado := NEW.estado_pago;
        -- Un UPDATE que deja el pago vigente no toca nada.
        IF NEW.estado_pago = 'PAGADO' AND OLD.id_trabajo_mastering IS NOT DISTINCT FROM NEW.id_trabajo_mastering THEN
            RETURN NEW;
        END IF;
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
    IF EXISTS (
        SELECT 1 FROM pago p
         WHERE p.id_trabajo_mastering = id_destino
           AND p.estado_pago = 'PAGADO'
           AND p.id_pago <> id_pago
    ) THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    RAISE EXCEPTION
        'El pago % es el unico respaldo del premaster ya liberado del trabajo % '
        '(intento dejarlo en %). Para dejarlo sin pago hay que marcar el trabajo '
        'con liberado_sin_pago y su motivo.',
        id_pago, id_destino, nuevo_estado;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER pago_sostiene_premaster
    BEFORE UPDATE OR DELETE ON pago
    FOR EACH ROW EXECUTE FUNCTION proteger_pago_de_premaster();


-- =============================================================================
-- 7. "NADA SE BORRA" NO ESTABA IMPLEMENTADO
--
-- La cabecera de V1 dice, textual: "Nada se borra: se desactiva, se cancela o
-- se marca inválido". Medido: `DELETE FROM pago` y
-- `DELETE FROM trabajo_mastering` funcionaban sin resistencia. Ninguna tabla
-- apunta a `pago`, así que no había ni siquiera una FK que lo frenara de rebote.
--
-- Se bloquea el DELETE SOLO en las dos tablas que ya tienen un mecanismo de
-- anulación documentado, para que la regla no deje a nadie encerrado:
--     · pago              → estado_pago = 'ANULADO'
--     · trabajo_mastering → estado = 'CANCELADO'
--
-- `egreso` y `venta_equipo` quedan AFUERA a propósito: no tienen forma de
-- anularse, así que prohibirles el DELETE dejaría un error de carga grabado
-- para siempre. Darles un estado de anulación es una decisión de negocio
-- pendiente, anotada en la auditoría.
-- =============================================================================

CREATE OR REPLACE FUNCTION prohibir_borrado_historico()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'No se borran filas de %. Es historial de un negocio real: anular la '
        'fila con su estado correspondiente (pago -> ANULADO, '
        'trabajo_mastering -> CANCELADO).', TG_TABLE_NAME;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER pago_no_se_borra
    BEFORE DELETE ON pago
    FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_historico();

CREATE TRIGGER trabajo_no_se_borra
    BEFORE DELETE ON trabajo_mastering
    FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_historico();


-- =============================================================================
-- 8. LA MÁQUINA DE ESTADOS DE MASTERING SE REVERTÍA EN DOS PASOS
--
-- Ataque medido:
--     UPDATE trabajo SET estado='CANCELADO'    -- permitido (y está bien)
--     UPDATE trabajo SET estado='A_CONFIRMAR'  -- PASABA
--
-- El trigger de V1 calcula el orden con un CASE que no incluye 'CANCELADO', y
-- el ELSE lo manda a 0. Saliendo de CANCELADO, el estado anterior valía 0 y
-- cualquier destino era "avanzar". Resultado: la regla "el estado solo puede
-- avanzar" se daba vuelta entera con dos UPDATE, incluido un trabajo ya PAGADO
-- que volvía a A_CONFIRMAR.
--
-- CANCELADO pasa a ser terminal, que es lo que ya decía el comentario de V1
-- ("queda fuera de la escalera") sin que el código lo cumpliera. Un trabajo
-- cancelado por error se rehace como trabajo nuevo: es una fila, no un drama,
-- y deja el rastro de que hubo un error.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_avance_estado_trabajo()
RETURNS TRIGGER AS $$
DECLARE
    orden_anterior INTEGER;
    orden_nuevo    INTEGER;
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    -- CANCELADO es terminal: se entra desde cualquier estado, no se sale nunca.
    IF OLD.estado = 'CANCELADO' THEN
        RAISE EXCEPTION
            'El trabajo % esta CANCELADO y no puede volver a % . '
            'Un trabajo cancelado por error se rehace como trabajo nuevo.',
            NEW.id_trabajo, NEW.estado;
    END IF;

    IF NEW.estado = 'CANCELADO' THEN
        RETURN NEW;
    END IF;

    orden_anterior := CASE OLD.estado
        WHEN 'A_CONFIRMAR' THEN 1 WHEN 'EN_PROCESO' THEN 2
        WHEN 'ENTREGADO'   THEN 3 WHEN 'DEBE'       THEN 3
        WHEN 'PAGADO'      THEN 4 ELSE 0 END;
    orden_nuevo := CASE NEW.estado
        WHEN 'A_CONFIRMAR' THEN 1 WHEN 'EN_PROCESO' THEN 2
        WHEN 'ENTREGADO'   THEN 3 WHEN 'DEBE'       THEN 3
        WHEN 'PAGADO'      THEN 4 ELSE 0 END;

    IF orden_nuevo < orden_anterior THEN
        RAISE EXCEPTION
            'El estado del trabajo no puede retroceder (% -> %)',
            OLD.estado, NEW.estado;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;


-- =============================================================================
-- 9. LOS TRIGGERS DE SALA SOLO FUNCIONAN EN READ COMMITTED
--
-- Este es el hallazgo menos intuitivo de la auditoría, y está MEDIDO con dos
-- sesiones psql en paralelo:
--
--   READ COMMITTED  → sesión A crea un bloqueo, sesión B intenta reservar
--                     adentro: RECHAZADA. La regla se cumple. ✔
--   REPEATABLE READ → misma secuencia: la reserva ENTRA dentro de la sala
--                     bloqueada. ✘
--   SERIALIZABLE    → misma secuencia: la reserva ENTRA. ✘
--
-- El motivo: `PERFORM 1 FROM sala ... FOR UPDATE` serializa a las dos
-- transacciones, pero la fila de `sala` nunca se modifica, así que no hay
-- conflicto de escritura que dispare un error de serialización. Y a partir de
-- REPEATABLE READ el snapshot queda fijado al inicio de la transacción: el
-- SELECT sobre `bloqueo_sala` de adentro del trigger NO VE el bloqueo que la
-- otra sesión acaba de commitear, por más que el lock se haya esperado.
--
-- O sea: acá el nivel de aislamiento MÁS ESTRICTO es el MENOS seguro. Es
-- justo el error que va a cometer quien escriba el servicio de reservas
-- pensando que subir el aislamiento no puede hacer daño.
--
-- Como el trigger no puede leer datos frescos bajo esos niveles, la única
-- respuesta honesta es negarse a correr en vez de dar una garantía falsa.
-- Spring usa READ COMMITTED por defecto, así que esto no cambia nada hoy.
-- =============================================================================

CREATE OR REPLACE FUNCTION exigir_read_committed(regla TEXT)
RETURNS void AS $$
BEGIN
    IF current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION
            'La regla "%" solo se puede garantizar en READ COMMITTED (esta '
            'transaccion corre en %). En niveles mas estrictos el trigger lee '
            'un snapshot viejo y dejaria pasar la violacion en silencio.',
            regla, current_setting('transaction_isolation');
    END IF;
END; $$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION verificar_sala_no_bloqueada()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado IN ('CANCELADA', 'REPROGRAMADA') THEN
        RETURN NEW;
    END IF;

    PERFORM exigir_read_committed('una sala bloqueada no acepta reservas');
    PERFORM 1 FROM sala WHERE id_sala = NEW.id_sala FOR UPDATE;

    IF EXISTS (
        SELECT 1 FROM bloqueo_sala b
        WHERE b.id_sala = NEW.id_sala
          AND NEW.fecha BETWEEN b.fecha_inicio AND b.fecha_fin
          AND NEW.hora_inicio < b.hora_fin
          AND NEW.hora_fin    > b.hora_inicio
    ) THEN
        RAISE EXCEPTION
            'La sala esta bloqueada en ese horario (reserva % %-%)',
            NEW.fecha, NEW.hora_inicio, NEW.hora_fin;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION verificar_bloqueo_sin_reservas()
RETURNS TRIGGER AS $$
DECLARE
    cantidad INTEGER;
BEGIN
    PERFORM exigir_read_committed('no se bloquea una sala con reservas activas');
    PERFORM 1 FROM sala WHERE id_sala = NEW.id_sala FOR UPDATE;

    SELECT count(*) INTO cantidad
    FROM reserva r
    WHERE r.id_sala = NEW.id_sala
      AND r.estado NOT IN ('CANCELADA', 'REPROGRAMADA')
      AND r.fecha BETWEEN NEW.fecha_inicio AND NEW.fecha_fin
      AND r.hora_inicio < NEW.hora_fin
      AND r.hora_fin    > NEW.hora_inicio;

    IF cantidad > 0 THEN
        RAISE EXCEPTION
            'No se puede bloquear: hay % reserva(s) activa(s) en ese rango', cantidad;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;


-- =============================================================================
-- 10. DOS BLOQUEOS SOLAPADOS SOBRE LA MISMA SALA
--
-- Ataque: dos INSERT en bloqueo_sala con rangos que se pisan → PASABA.
--
-- No es tan grave como los anteriores (dos bloqueos superpuestos bloquean lo
-- mismo, no se contradicen), pero deja el calendario mostrando dos motivos
-- distintos para la misma franja y obliga a cualquier consulta a desduplicar.
-- Va como EXCLUDE por la misma razón que en `reserva`: es la única forma que
-- aguanta concurrencia.
-- =============================================================================

ALTER TABLE bloqueo_sala ADD COLUMN periodo tsrange
    GENERATED ALWAYS AS (tsrange(fecha_inicio + hora_inicio, fecha_fin + hora_fin)) STORED;

ALTER TABLE bloqueo_sala ADD CONSTRAINT bloqueo_sin_solapamiento
    EXCLUDE USING gist (id_sala WITH =, periodo WITH &&);


COMMENT ON CONSTRAINT pago_cotizacion_positiva ON pago IS
    'Una cotizacion en 0 hace desaparecer del balance todo importe en USD sin lanzar ningun error.';

COMMENT ON TRIGGER pago_sostiene_premaster ON pago IS
    'Impide anular o borrar el pago que habilito la liberacion de un premaster. Ver V6 §6.';
