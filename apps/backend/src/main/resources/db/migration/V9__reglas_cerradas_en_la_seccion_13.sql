-- =============================================================================
-- Las reglas que §13 cerró — `docs/requirements/platform.md` §13, "Decisiones
-- cerradas el 2026-08-14".
--
-- V6 cerró los agujeros que una prueba adversarial DEMOSTRABA. V7 cerró las
-- reglas que el documento de alcance declaraba confirmadas y el esquema nunca
-- intentó imponer. Esta cierra el tercer grupo: las que no se podían escribir
-- porque **faltaba una decisión**, y que §13 tomó todas juntas.
--
-- Cinco de las que V6 y V7 dejaron anotadas como "reglas sin dueño" en
-- `docs/db/auditoria-2026-08-12.md` §6 salen de esa lista con esta migración.
--
-- MOMENTO, igual que V4, V6 y V7: `reserva`, `reserva_participante`,
-- `inscripcion`, `egreso` y `venta_equipo` tienen CERO filas. Cada constraint
-- de acá es hoy una línea; con los ~80 alumnos del Notion y un cuatrimestre de
-- clases adentro, cada una pasa a ser una decisión sobre qué hacer con las
-- filas viejas. Es la última migración que se puede escribir así: el Módulo 2
-- (salas y reservas) empieza a cargar `reserva` de verdad.
--
-- -----------------------------------------------------------------------------
-- LO QUE **NO** ENTRA ACÁ, Y POR QUÉ
--
-- **La seña (DB-04a).** §13 resolvió la pregunta que estaba abierta —P8: *"no
-- hay excepción, si no se paga la seña no se reserva"*— pero eso responde
-- *cuándo se puede saltear la regla* (nunca), no *a qué reservas alcanza*, y el
-- esquema necesita lo segundo para expresarla. Una clase de un alumno con
-- inscripción ya está paga por la inscripción y no lleva seña propia; un
-- alquiler de cabina sí. Hoy nada en `reserva` distingue esos dos casos salvo
-- `tipo_uso`, y qué usos exigen seña no está decidido.
--
-- Se puede implementar cuando se decida, y la herramienta existe: un
-- CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED sobre `reserva` que al
-- COMMIT exija un `pago` apuntándole. Se deja escrito para no volver a
-- investigarlo. **No se implementa a ciegas**: una constraint que exija seña a
-- toda reserva bloquea el alta de clases del Módulo 2, que es lo próximo que se
-- construye.
--
-- Queda como la única fila viva de la lista de reglas sin dueño.
-- =============================================================================


-- =============================================================================
-- 1. NADIE EN DOS SALAS A LA VEZ — NI PROFESOR NI ALUMNO
--
-- §13: *"Cada profe con su reserva, en su sala, con su alumno."* Más estricto
-- que lo que se había propuesto, donde lo del profesor iba como advertencia.
--
-- Hasta ahora el esquema impedía que una SALA se solapara consigo misma
-- (`reserva_sin_solapamiento`, V1) y nada más. O sea: el mismo profesor podía
-- estar dando clase en Sala 1 y en Sala 2 a las 15:00, y el mismo alumno podía
-- figurar en las dos. Es el error de carga más fácil de cometer en un
-- calendario, y el que más caro sale: alguien se entera el día de la clase.
--
-- SE IMPLEMENTA CON DOS MECANISMOS DISTINTOS, y la diferencia no es capricho:
--
--   · **Profesor → EXCLUDE.** `id_profesor` y `periodo` viven los dos en
--     `reserva`, así que es una constraint de una sola tabla: la base la
--     garantiza incluso con dos transacciones concurrentes.
--   · **Alumno → trigger.** El alumno NO está en `reserva`: está en
--     `reserva_participante`, y el período está en `reserva`. Una EXCLUDE no
--     puede cruzar dos tablas. La alternativa sería copiar `periodo` a
--     `reserva_participante` y mantenerlo sincronizado con otro trigger, que es
--     más maquinaria y una fuente de desincronización más.
--
-- **Consecuencia que hay que saber:** el del alumno tiene el mismo hueco de
-- concurrencia que los triggers de `bloqueo_sala` de V1 —dos inserciones
-- simultáneas pueden no verse—, y el del profesor no. Es una propiedad
-- conocida y ya documentada de este esquema, no una sorpresa nueva.
-- =============================================================================

-- Un `id_profesor` en NULL no choca nunca: en una EXCLUDE, si un valor comparado
-- es NULL el operador da NULL y no hay violación. Es lo que se quiere -- una
-- reserva sin profesor (alquiler de cabina) no ocupa la agenda de nadie.
ALTER TABLE reserva ADD CONSTRAINT reserva_profesor_sin_solapamiento
    EXCLUDE USING gist (id_profesor WITH =, periodo WITH &&)
    WHERE (estado NOT IN ('CANCELADA', 'REPROGRAMADA'));


-- --- 1.b El alumno, por trigger ----------------------------------------------

-- Devuelve la primera reserva que se solapa con la de esta persona, o NULL.
-- La usan los dos triggers de abajo: el que agrega un participante, y el que
-- mueve una reserva que ya tiene participantes.
CREATE OR REPLACE FUNCTION solapamiento_de_persona(
        p_id_reserva      BIGINT,
        p_id_usuario      BIGINT,
        p_id_participacion BIGINT)
RETURNS TABLE (fecha DATE, hora_inicio TIME, hora_fin TIME) AS $$
BEGIN
    RETURN QUERY
    SELECT otra.fecha, otra.hora_inicio, otra.hora_fin
    FROM reserva_participante p
    JOIN reserva otra ON otra.id_reserva = p.id_reserva
    JOIN reserva esta ON esta.id_reserva = p_id_reserva
    WHERE p.id_usuario = p_id_usuario
      -- No chocar contra uno mismo, ni contra la propia fila al editarla.
      AND p.id_reserva      <> p_id_reserva
      AND p.id_participacion IS DISTINCT FROM p_id_participacion
      -- Misma DEFINICIÓN CANÓNICA que el resto del esquema: estos dos estados
      -- no ocupan el horario.
      AND otra.estado NOT IN ('CANCELADA', 'REPROGRAMADA')
      AND esta.estado NOT IN ('CANCELADA', 'REPROGRAMADA')
      AND p.estado_asistencia <> 'CANCELADA'
      AND otra.periodo && esta.periodo
    LIMIT 1;
END; $$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION verificar_persona_sin_solapamiento()
RETURNS TRIGGER AS $$
DECLARE
    choque RECORD;
BEGIN
    -- Sacar a alguien de una clase nunca puede generar un conflicto.
    IF NEW.estado_asistencia = 'CANCELADA' THEN
        RETURN NEW;
    END IF;

    SELECT * INTO choque
    FROM solapamiento_de_persona(NEW.id_reserva, NEW.id_usuario, NEW.id_participacion);

    IF FOUND THEN
        RAISE EXCEPTION
            'Esa persona ya esta en otra sala en ese horario (% %-%)',
            choque.fecha, choque.hora_inicio, choque.hora_fin;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER participante_en_una_sola_sala
    BEFORE INSERT OR UPDATE ON reserva_participante
    FOR EACH ROW EXECUTE FUNCTION verificar_persona_sin_solapamiento();


-- El camino que se olvida: la reserva no se mueve sola, se REPROGRAMA. Mover
-- una clase a un horario donde alguno de sus alumnos ya tiene otra rompe la
-- misma regla sin tocar `reserva_participante`.
CREATE OR REPLACE FUNCTION verificar_participantes_al_mover_reserva()
RETURNS TRIGGER AS $$
DECLARE
    fila   RECORD;
    choque RECORD;
BEGIN
    IF NEW.estado IN ('CANCELADA', 'REPROGRAMADA') THEN
        RETURN NEW;
    END IF;

    FOR fila IN
        SELECT id_participacion, id_usuario
        FROM reserva_participante
        WHERE id_reserva = NEW.id_reserva
          AND estado_asistencia <> 'CANCELADA'
    LOOP
        SELECT * INTO choque
        FROM solapamiento_de_persona(NEW.id_reserva, fila.id_usuario, fila.id_participacion);

        IF FOUND THEN
            RAISE EXCEPTION
                'No se puede mover la clase: un participante ya esta en otra '
                'sala en ese horario (% %-%)',
                choque.fecha, choque.hora_inicio, choque.hora_fin;
        END IF;
    END LOOP;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Solo cuando cambia el horario: un UPDATE que toca `notas` no tiene por qué
-- pagar el recorrido de los participantes.
CREATE TRIGGER reserva_al_moverse_respeta_participantes
    AFTER UPDATE OF fecha, hora_inicio, hora_fin ON reserva
    FOR EACH ROW
    WHEN (OLD.fecha       IS DISTINCT FROM NEW.fecha
       OR OLD.hora_inicio IS DISTINCT FROM NEW.hora_inicio
       OR OLD.hora_fin    IS DISTINCT FROM NEW.hora_fin)
    EXECUTE FUNCTION verificar_participantes_al_mover_reserva();


-- =============================================================================
-- 2. `egreso` Y `venta_equipo` YA SE PUEDEN ANULAR — Y POR ESO YA NO SE BORRAN
--
-- V6 §7 prohibió el DELETE en `pago` y `trabajo_mastering`, y dejó estas dos
-- AFUERA A PROPÓSITO, con esta razón escrita: *"no tienen forma de anularse,
-- así que prohibirles el DELETE dejaría un error de carga grabado para
-- siempre"*. Era la decisión correcta y venía con su condición para levantarse.
--
-- §13 la levanta: *"llevan estado de anulación, mismo patrón que `pago` (autor
-- + fecha + motivo obligatorios). Recién con eso se les puede prohibir el
-- borrado."*
--
-- `pago` usa `estado_pago = 'ANULADO'` porque ya tenía máquina de estados;
-- estas dos no tienen ninguna, así que un booleano es la forma mínima. Lo que
-- importa es lo mismo en las tres: **anular no es gratis, hay que firmarlo.**
-- =============================================================================

ALTER TABLE egreso
    ADD COLUMN anulado          BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN id_usuario_anula BIGINT      REFERENCES usuario (id_usuario),
    ADD COLUMN fecha_anulacion  TIMESTAMPTZ,
    ADD COLUMN motivo_anulacion TEXT;

-- El `coalesce` es la trampa que encontró un caso de V7: **un CHECK que evalúa
-- a NULL no rechaza nada**, solo rechaza en FALSE. Sin él, un motivo en NULL
-- deja pasar la anulación.
ALTER TABLE egreso ADD CONSTRAINT egreso_anulacion_justificada
    CHECK (NOT anulado
           OR (id_usuario_anula IS NOT NULL
               AND fecha_anulacion IS NOT NULL
               AND coalesce(btrim(motivo_anulacion), '') <> ''));

ALTER TABLE venta_equipo
    ADD COLUMN anulada          BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN id_usuario_anula BIGINT      REFERENCES usuario (id_usuario),
    ADD COLUMN fecha_anulacion  TIMESTAMPTZ,
    ADD COLUMN motivo_anulacion TEXT;

ALTER TABLE venta_equipo ADD CONSTRAINT venta_anulacion_justificada
    CHECK (NOT anulada
           OR (id_usuario_anula IS NOT NULL
               AND fecha_anulacion IS NOT NULL
               AND coalesce(btrim(motivo_anulacion), '') <> ''));

-- La función es la de V6 §7, ampliada por V7 y ampliada otra vez acá: el
-- mensaje tiene que nombrar la salida de CADA tabla que protege, o quien lo lee
-- no sabe qué hacer en vez de borrar.
CREATE OR REPLACE FUNCTION prohibir_borrado_historico()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'No se borran filas de %. Es historial de un negocio real: hay que '
        'anular la fila con su estado correspondiente (pago -> ANULADO, '
        'trabajo_mastering -> CANCELADO, reserva -> CANCELADA, '
        'reserva_participante -> CANCELADA, egreso -> anulado = TRUE, '
        'venta_equipo -> anulada = TRUE).', TG_TABLE_NAME;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER egreso_no_se_borra
    BEFORE DELETE ON egreso
    FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_historico();

CREATE TRIGGER venta_no_se_borra
    BEFORE DELETE ON venta_equipo
    FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_historico();


-- =============================================================================
-- 3. EL NIVEL DE UNA INSCRIPCIÓN NO RETROCEDE SIN FIRMA  (DB-04b)
--
-- Regla dura del alcance (`platform.md:281`): *"El nivel actual no puede
-- retroceder sin autorización de un administrador"*. Estaba en la lista de
-- reglas sin dueño porque **"sin autorización" era lo que faltaba definir**: la
-- base sabe expresar la transición, no sabe qué significa autorizarla.
--
-- §13 la define, y con el molde que el esquema ya usa cuatro veces: autor +
-- fecha + motivo. *"Autorizado" no es un permiso que la base consulta, es una
-- firma que la base exige.* La diferencia importa: un permiso se resuelve en el
-- backend y se puede saltear llamando la API de otra forma; una firma queda en
-- la fila.
--
-- Bajar de nivel a alguien es decirle "no estás para intermedio". Que quede
-- quién lo decidió y por qué es exactamente lo mismo que se exige para anular
-- un pago, y por el mismo motivo: es una decisión discutible cara a cara.
-- =============================================================================

ALTER TABLE inscripcion
    ADD COLUMN id_usuario_baja_nivel BIGINT      REFERENCES usuario (id_usuario),
    ADD COLUMN fecha_baja_nivel      TIMESTAMPTZ,
    ADD COLUMN motivo_baja_nivel     TEXT;

CREATE OR REPLACE FUNCTION verificar_baja_de_nivel_firmada()
RETURNS TRIGGER AS $$
DECLARE
    orden_anterior INTEGER;
    orden_nuevo    INTEGER;
BEGIN
    IF NEW.nivel IS NOT DISTINCT FROM OLD.nivel THEN
        RETURN NEW;
    END IF;

    -- Poner o sacar el nivel no es retroceder: es completar una ficha.
    IF OLD.nivel IS NULL OR NEW.nivel IS NULL THEN
        RETURN NEW;
    END IF;

    orden_anterior := CASE OLD.nivel
        WHEN 'INICIAL' THEN 1 WHEN 'INTERMEDIO' THEN 2
        WHEN 'AVANZADO' THEN 3 ELSE 0 END;
    orden_nuevo := CASE NEW.nivel
        WHEN 'INICIAL' THEN 1 WHEN 'INTERMEDIO' THEN 2
        WHEN 'AVANZADO' THEN 3 ELSE 0 END;

    IF orden_nuevo >= orden_anterior THEN
        RETURN NEW;
    END IF;

    -- `fecha_baja_nivel` tiene que ser NUEVA, no la de una baja anterior: si
    -- alcanzara con que estuviera llena, la segunda baja viajaría gratis con la
    -- firma de la primera.
    IF NEW.id_usuario_baja_nivel IS NULL
       OR NEW.fecha_baja_nivel IS NULL
       OR coalesce(btrim(NEW.motivo_baja_nivel), '') = ''
       OR NEW.fecha_baja_nivel IS NOT DISTINCT FROM OLD.fecha_baja_nivel THEN
        RAISE EXCEPTION
            'Bajar el nivel (% -> %) exige decir quien lo decide, cuando y por '
            'que: id_usuario_baja_nivel, fecha_baja_nivel y motivo_baja_nivel.',
            OLD.nivel, NEW.nivel;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER inscripcion_nivel_no_retrocede_sin_firma
    BEFORE UPDATE ON inscripcion
    FOR EACH ROW EXECUTE FUNCTION verificar_baja_de_nivel_firmada();


-- =============================================================================
-- 4. `sala.activa = FALSE` POR FIN SIGNIFICA ALGO
--
-- La columna viene del modelo original del cliente y **no hacía absolutamente
-- nada**: se podía poner en FALSE y la sala seguía aceptando reservas como
-- siempre. Una columna que no hace nada es peor que no tenerla, porque quien la
-- pone en FALSE cree que hizo algo.
--
-- §13 le da significado: *"la sala no acepta reservas NUEVAS A FUTURO; las
-- reservas ya cargadas siguen valiendo"*. Es lo que hace falta para dar de baja
-- una sala sin romper el calendario que ya está armado.
--
-- Dos decisiones que se leen del enunciado y conviene dejar explícitas:
--
--   · **El pasado se puede cargar igual.** Una sala desactivada hoy no impide
--     registrar una clase que se dio el mes pasado. Desactivar mira para
--     adelante.
--   · **Editar una reserva vieja no la vuelve a validar.** Solo se controla
--     cuando la reserva ENTRA o cuando CAMBIA de sala o de fecha. Si no, una
--     reserva legítima en una sala recién desactivada quedaría congelada: no se
--     le podría ni agregar una nota.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_sala_activa()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado IN ('CANCELADA', 'REPROGRAMADA') THEN
        RETURN NEW;
    END IF;

    IF NEW.fecha < CURRENT_DATE THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE'
       AND NEW.id_sala IS NOT DISTINCT FROM OLD.id_sala
       AND NEW.fecha   IS NOT DISTINCT FROM OLD.fecha THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM sala WHERE id_sala = NEW.id_sala AND activa) THEN
        RAISE EXCEPTION
            'Esa sala esta desactivada y no acepta reservas nuevas (% %-%)',
            NEW.fecha, NEW.hora_inicio, NEW.hora_fin;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER reserva_en_sala_activa
    BEFORE INSERT OR UPDATE ON reserva
    FOR EACH ROW EXECUTE FUNCTION verificar_sala_activa();


-- =============================================================================
-- 5. NO SE CONSUMEN MÁS CLASES QUE LAS CONTRATADAS
--
-- `inscripcion.clases_contratadas` existía desde V1 y **nada lo miraba**: se
-- podían cargar 40 clases contra una inscripción de 8. Es la cuenta que el
-- sistema existe para llevar —*"¿cuántas clases le quedan a Juan?"*— y era la
-- única de las cuatro reglas duras del Módulo 1 que no estaba en ningún lado.
--
-- Faltaba definir QUÉ CUENTA COMO CONSUMIDA, y §13 lo cierra: *"una clase solo
-- se consume cuando se toma. Si no se dictó, se recupera y sigue habiendo 8.
-- Cuentan las participaciones cuya reserva no esté CANCELADA ni REPROGRAMADA."*
--
-- **Una lectura que agrego y conviene revisar:** se descuentan también las
-- participaciones con `estado_asistencia = 'CANCELADA'`. §13 no las nombra
-- —habla del estado de la RESERVA—, pero el principio que enuncia es "solo se
-- consume cuando se toma", y un alumno sacado de una clase que sí se dictó para
-- los demás no la tomó. Si la interpretación correcta fuera la contraria, el
-- cambio es sacar una línea de la consulta de abajo.
--
-- Ojo con `AUSENTE`: **el ausente SÍ consume la clase.** No está en ninguna de
-- las dos exclusiones, y es a propósito -- faltar sin avisar no devuelve la
-- clase. Esa es la regla que le da sentido a `AUSENTE_JUSTIFICADO` como estado
-- aparte.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_clases_contratadas()
RETURNS TRIGGER AS $$
DECLARE
    contratadas INTEGER;
    consumidas  INTEGER;
BEGIN
    IF NEW.id_inscripcion IS NULL OR NEW.estado_asistencia = 'CANCELADA' THEN
        RETURN NEW;
    END IF;

    SELECT clases_contratadas INTO contratadas
    FROM inscripcion WHERE id_inscripcion = NEW.id_inscripcion;

    SELECT count(*) INTO consumidas
    FROM reserva_participante p
    JOIN reserva r ON r.id_reserva = p.id_reserva
    WHERE p.id_inscripcion = NEW.id_inscripcion
      AND p.id_participacion IS DISTINCT FROM NEW.id_participacion
      AND p.estado_asistencia <> 'CANCELADA'
      AND r.estado NOT IN ('CANCELADA', 'REPROGRAMADA');

    IF consumidas + 1 > contratadas THEN
        RAISE EXCEPTION
            'Esa inscripcion tiene % clases contratadas y ya se consumieron %. '
            'Para dar mas clases hay que ampliar la inscripcion.',
            contratadas, consumidas;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER participante_no_excede_clases_contratadas
    BEFORE INSERT OR UPDATE ON reserva_participante
    FOR EACH ROW EXECUTE FUNCTION verificar_clases_contratadas();


-- Y el camino de atrás, que es el que se escapa: reactivar una reserva
-- CANCELADA devuelve todas sus participaciones a la cuenta de una sola vez, sin
-- tocar `reserva_participante`. Sin esto, cancelar y descancelar es una forma
-- de pasarse del límite sin que nada mire.
CREATE OR REPLACE FUNCTION verificar_clases_al_reactivar_reserva()
RETURNS TRIGGER AS $$
DECLARE
    fila        RECORD;
    contratadas INTEGER;
    consumidas  INTEGER;
BEGIN
    IF NEW.estado IN ('CANCELADA', 'REPROGRAMADA')
       OR OLD.estado NOT IN ('CANCELADA', 'REPROGRAMADA') THEN
        RETURN NEW;
    END IF;

    FOR fila IN
        SELECT DISTINCT id_inscripcion
        FROM reserva_participante
        WHERE id_reserva = NEW.id_reserva
          AND id_inscripcion IS NOT NULL
          AND estado_asistencia <> 'CANCELADA'
    LOOP
        SELECT clases_contratadas INTO contratadas
        FROM inscripcion WHERE id_inscripcion = fila.id_inscripcion;

        SELECT count(*) INTO consumidas
        FROM reserva_participante p
        JOIN reserva r ON r.id_reserva = p.id_reserva
        WHERE p.id_inscripcion = fila.id_inscripcion
          AND p.estado_asistencia <> 'CANCELADA'
          AND r.estado NOT IN ('CANCELADA', 'REPROGRAMADA');

        IF consumidas > contratadas THEN
            RAISE EXCEPTION
                'Reactivar esa clase deja la inscripcion en % clases sobre % '
                'contratadas.', consumidas, contratadas;
        END IF;
    END LOOP;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER reserva_al_reactivarse_respeta_contratadas
    AFTER UPDATE OF estado ON reserva
    FOR EACH ROW
    WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
    EXECUTE FUNCTION verificar_clases_al_reactivar_reserva();
