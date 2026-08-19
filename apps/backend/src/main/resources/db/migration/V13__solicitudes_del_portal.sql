-- =============================================================================
-- LAS SOLICITUDES DEL PORTAL  (Módulo 4)
--
-- POR QUÉ EL MÓDULO 4 EMPIEZA CON UNA MIGRACIÓN Y NO CON UNA PANTALLA
--
-- P17 (Ignacio, 2026-08-17) dejó dicho dónde está la línea de la autogestión, y
-- no la marca el rol: la marca **si hay un profesor del otro lado**. La cursada
-- la arma administración; lo que no depende de un profe —alquilar una cabina,
-- grabar un set— lo elige el usuario.
--
-- Pero el usuario NO PUEDE CREAR SU RESERVA, y no por una regla de permisos sino
-- por una de plata: una `reserva` que ocupa su franja no existe sin un pago en
-- SENADO o PAGADO detrás (P8, `V10`–`V12`), y **un USUARIO no tiene cómo poner
-- plata en el sistema** — registrar un pago es `@PuedeOperar`, los cinco medios
-- son de carga manual y no hay pasarela en ningún lado del alcance. Si el portal
-- insertara una `reserva`, el trigger de la seña la rechazaría al COMMIT. Todas
-- las veces.
--
-- Entonces el portal no crea una reserva: **crea una solicitud**. La reserva nace
-- después, cuando administración la aprueba y carga la seña en la misma
-- transacción. El usuario igual elige sala, fecha y horario —no depende de que
-- alguien le arme la agenda—; lo único que no puede es saltear el cobro.
--
--
-- POR QUÉ UNA TABLA NUEVA Y NO GENERALIZAR `solicitud_reprogramacion`
--
-- Era la alternativa que el plan dejó abierta, y se descartó. Esa tabla tiene
-- `id_reserva NOT NULL` y un CHECK que cuelga de eso; generalizarla es aflojar la
-- columna y convertir cada regla suya en condicional —"si es de reprogramación,
-- entonces..."—, que es la forma de excepción por estado que §13 rechazó cuando
-- se escribió la seña.
--
-- Y sobre todo: son dos ciclos de vida distintos. Una reprogramación **pide mover
-- algo que ya existe** y termina en un cambio de estado; una solicitud de reserva
-- **pide crear algo que todavía no existe** y termina pariendo una fila nueva con
-- su plata. Comparten la palabra "solicitud" y nada más.
--
--
-- LO QUE ESTA TABLA NO TIENE, A PROPÓSITO
--
-- No tiene precio ni monto. El precio de un alquiler sale de horas × una tarifa
-- que el sistema todavía no tiene (P13, la única pregunta abierta que queda), así
-- que la seña la escribe administración al aprobar, como ya la escribe hoy en el
-- alta del calendario. Cuando P13 se cierre, la solicitud va a poder mostrar el
-- monto antes de mandarse; hasta entonces no se inventa un número.
-- =============================================================================


-- =============================================================================
-- 1. QUÉ SE PUEDE PEDIR DESDE EL PORTAL — es dato de catálogo, no una lista
--    escrita en el código
-- =============================================================================
--
-- La tentación era escribir `codigo IN ('ALQUILER_CABINA','GRABACION_SET')` en un
-- trigger y otra vez en Java. Son dos copias de una regla que el negocio va a
-- mover: el día que Mix & Mastering se pida desde el portal (Módulo 6) hay que
-- acordarse de las dos. La matriz sala×uso ya resolvió esto mismo siendo datos
-- (`sala_tipo_uso`), y esta columna es la misma idea.
--
-- No alcanzaba con `es_clase = FALSE`, que es lo que P17 describe: MIX_MASTERING
-- tampoco es clase y no se pide por acá — tiene su propio circuito, es el único
-- servicio que puede quedar en debe y la seña la decide Ghezz caso por caso.

ALTER TABLE tipo_uso
    ADD COLUMN solicitable_por_usuario BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN tipo_uso.solicitable_por_usuario IS
    'P17: si un USUARIO puede pedir este uso desde el portal sin que administracion se lo arme. TRUE solo donde no hay un profesor del otro lado.';

UPDATE tipo_uso SET solicitable_por_usuario = TRUE
    WHERE codigo IN ('ALQUILER_CABINA', 'GRABACION_SET');


-- =============================================================================
-- 2. LA TABLA
-- =============================================================================

CREATE TABLE solicitud_reserva (
    id_solicitud_reserva BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Quién pide. Es `usuario` y no `alumno` a propósito: quien alquila una
    -- cabina puede no cursar nada, que es la razón por la que este esquema tiene
    -- a `usuario` como raíz.
    id_usuario           BIGINT      NOT NULL REFERENCES usuario (id_usuario),

    -- Qué pide. Mismas columnas que la reserva que va a nacer de acá, porque lo
    -- que se aprueba es exactamente lo que se pidió (ver §4).
    id_sala              BIGINT      NOT NULL REFERENCES sala (id_sala),
    id_tipo_uso          BIGINT      NOT NULL REFERENCES tipo_uso (id_tipo_uso),
    fecha                DATE        NOT NULL,
    hora_inicio          TIME        NOT NULL,
    hora_fin             TIME        NOT NULL,
    comentario           TEXT,

    estado               VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',

    -- La resolución: quién contestó, qué contestó, y qué reserva salió de acá.
    id_usuario_resuelve  BIGINT      REFERENCES usuario (id_usuario),
    respuesta            TEXT,
    id_reserva           BIGINT      REFERENCES reserva (id_reserva),
    fecha_resolucion     TIMESTAMPTZ,

    -- DB-08: en una tabla nueva el sello de creación se llama así. Hay seis
    -- nombres distintos para esto en el esquema viejo y ese es el costo que se
    -- dejó de pagar.
    fecha_creacion       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT solicitud_reserva_estado_valido
        CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA')),

    -- Misma forma que `reserva_horas_validas`, y sin columna generada de por
    -- medio: DB-11 dejó escrito que una columna generada que revienta se calcula
    -- ANTES que los CHECK y le roba la palabra al que iba a explicar el problema.
    CONSTRAINT solicitud_reserva_horas_validas
        CHECK (hora_fin > hora_inicio),

    -- Toda solicitud que dejó de estar pendiente dice quién la resolvió y cuándo.
    -- Es la misma trazabilidad que `solicitud_reprogramacion` exige desde `V1`, y
    -- vale igual para CANCELADA: ahí el que resuelve es el que pidió.
    CONSTRAINT solicitud_reserva_resolucion_completa
        CHECK (estado = 'PENDIENTE'
               OR (id_usuario_resuelve IS NOT NULL AND fecha_resolucion IS NOT NULL)),

    -- Una aprobación SIN reserva es una mentira: dice que se aprobó y no hay
    -- franja tomada. Y una reserva colgando de algo que no se aprobó es peor,
    -- porque nadie sabe con qué autorización se creó.
    CONSTRAINT solicitud_reserva_aprobada_tiene_reserva
        CHECK ((estado = 'APROBADA' AND id_reserva IS NOT NULL)
               OR (estado <> 'APROBADA' AND id_reserva IS NULL)),

    -- Un rechazo sin motivo no le sirve a quien lo recibe. La aprobación puede no
    -- decir nada: la respuesta es la reserva.
    CONSTRAINT solicitud_reserva_rechazo_explicado
        CHECK (estado <> 'RECHAZADA' OR coalesce(btrim(respuesta), '') <> '')
);

-- La combinación sala×uso vale igual acá que en `reserva` (`V1` §2): sin esto se
-- puede pedir una grabación en la Sala 1, administración la aprueba, y el 409 lo
-- da la FK de `reserva` recién ahí — con la solicitud ya marcada APROBADA en la
-- misma transacción que se cae. Rechazar en el pedido es rechazar donde alguien
-- lo puede leer.
ALTER TABLE solicitud_reserva ADD CONSTRAINT solicitud_reserva_uso_permitido_en_sala
    FOREIGN KEY (id_sala, id_tipo_uso)
    REFERENCES sala_tipo_uso (id_sala, id_tipo_uso);

-- La bandeja de administración abre siempre por lo pendiente, y eso es una
-- fracción chica de la tabla al mes de uso.
CREATE INDEX solicitud_reserva_pendientes
    ON solicitud_reserva (fecha, hora_inicio) WHERE estado = 'PENDIENTE';

CREATE INDEX solicitud_reserva_por_usuario
    ON solicitud_reserva (id_usuario, fecha_creacion DESC);

COMMENT ON TABLE solicitud_reserva IS
    'P17: lo que el portal SI puede crear. Un USUARIO no puede insertar una reserva porque no tiene como poner la plata que V10-V12 le exigen; pide, y administracion aprueba cargando la sena. Ver la cabecera de V13.';


-- =============================================================================
-- 3. SOLO SE PIDE LO QUE EL CATÁLOGO DEJA PEDIR
-- =============================================================================
--
-- Un FK no alcanza: la condición no es "existe el tipo de uso" sino "ese tipo de
-- uso tiene la marca". Se podría forzar con un UNIQUE (id_tipo_uso,
-- solicitable_por_usuario) y una columna generada siempre TRUE de este lado, pero
-- eso deja el catálogo trabado —no se podría desmarcar un uso mientras haya
-- solicitudes viejas apuntándole— y el catálogo se edita.

CREATE OR REPLACE FUNCTION verificar_uso_solicitable()
RETURNS TRIGGER AS $$
DECLARE
    se_puede BOOLEAN;
    nombre_del_uso TEXT;
BEGIN
    SELECT solicitable_por_usuario, nombre INTO se_puede, nombre_del_uso
    FROM tipo_uso WHERE id_tipo_uso = NEW.id_tipo_uso;

    IF NOT se_puede THEN
        RAISE EXCEPTION
            '"%" no se pide desde el portal: esa reserva la arma administracion. '
            'Desde el portal se piden los usos que no dependen de un profesor '
            '(alquiler de cabina y grabacion de set).', nombre_del_uso;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER solicitud_reserva_uso_solicitable
    BEFORE INSERT OR UPDATE OF id_tipo_uso ON solicitud_reserva
    FOR EACH ROW EXECUTE FUNCTION verificar_uso_solicitable();


-- =============================================================================
-- 4. UNA SOLICITUD RESUELTA ES FINAL
-- =============================================================================
--
-- El esquive que esto cierra: aprobar (nace la reserva con su seña), volver la
-- solicitud a PENDIENTE y aprobarla otra vez. Dos reservas, dos señas, y la
-- solicitud apuntando a una sola — la otra queda ocupando una franja sin que
-- nada la explique. Es el mismo criterio con el que `V6` impide que los estados
-- de M&M y de release retrocedan.
--
-- Se prohíbe cualquier UPDATE sobre una fila resuelta, no solo el cambio de
-- estado: editar la fecha de una solicitud ya aprobada haría que diga una cosa y
-- su reserva otra. Lo que se corrige antes de resolver se corrige; lo de después
-- se pide de nuevo.

CREATE OR REPLACE FUNCTION solicitud_resuelta_es_final()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado <> 'PENDIENTE' THEN
        RAISE EXCEPTION
            'Esa solicitud ya fue resuelta (%) y no se modifica. Si hace falta '
            'otra cosa, se pide de nuevo.', OLD.estado;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER solicitud_reserva_resuelta_es_final
    BEFORE UPDATE ON solicitud_reserva
    FOR EACH ROW EXECUTE FUNCTION solicitud_resuelta_es_final();

-- La misma puerta estaba abierta en la tabla que ya existía. Nadie la había
-- escrito nunca —hasta el Módulo 4 no había pantalla que insertara una fila—,
-- así que la regla llega junto con su primer escritor.
CREATE TRIGGER solicitud_reprogramacion_resuelta_es_final
    BEFORE UPDATE ON solicitud_reprogramacion
    FOR EACH ROW EXECUTE FUNCTION solicitud_resuelta_es_final();


-- =============================================================================
-- 5. UNA SOLICITUD NO SE BORRA
-- =============================================================================
--
-- La función de `V6` §7, ampliada por `V7` y por `V9`, ampliada otra vez. Acá lo
-- que se protege es el pedido: una solicitud borrada se lleva puesta la
-- autorización con la que se creó una reserva que sigue existiendo, y del otro
-- lado, la única prueba de que alguien pidió algo y le dijeron que no.
--
-- El que se arrepiente CANCELA, que es un estado y deja registro.

CREATE OR REPLACE FUNCTION prohibir_borrado_historico()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'No se borran filas de %. Es historial de un negocio real: hay que '
        'anular la fila con su estado correspondiente (pago -> ANULADO, '
        'trabajo_mastering -> CANCELADO, reserva -> CANCELADA, '
        'reserva_participante -> CANCELADA, egreso -> anulado = TRUE, '
        'venta_equipo -> anulada = TRUE, solicitud_reserva -> CANCELADA).',
        TG_TABLE_NAME;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER solicitud_reserva_no_se_borra
    BEFORE DELETE ON solicitud_reserva
    FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_historico();
