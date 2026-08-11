-- =============================================================================
-- La Juanita Studio / Music — esquema inicial
--
-- Fuente: docs/db/la_juanita_schema.dbml.txt (modelo corregido) +
--         docs/requirements/platform.md (reglas confirmadas con el cliente)
--
-- Convenciones:
--   · Los estados y tipos van como VARCHAR + CHECK, no como ENUM de Postgres:
--     agregar un valor a un ENUM es una migración; a un CHECK, también, pero
--     mucho más simple de revisar y revertir.
--   · Todo importe lleva moneda. Si es USD, lleva cotización.
--   · Nada se borra: se desactiva, se cancela o se marca inválido.
--   · NINGUNA clave foránea usa ON DELETE CASCADE, a propósito. Todas quedan en
--     NO ACTION: intentar borrar un usuario que tiene reservas o pagos falla en
--     vez de arrastrarse el historial. Es incómodo y está bien que lo sea --
--     acá hay registros de plata de un negocio real. Para dar de baja a alguien
--     está `usuario.activo`.
--   · Las reglas que cruzan dos tablas viven en la sección 8 como triggers,
--     porque no se pueden expresar como CHECK ni como FK. Cada una dice por qué
--     existe.
-- =============================================================================

-- Necesaria para el EXCLUDE que impide dos reservas solapadas en la misma sala.
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- =============================================================================
-- 1. PERSONAS
-- =============================================================================

-- Identidad única de login. Cualquier persona -- alumno, profesor, cliente
-- ocasional -- es primero un usuario.
--
-- `rol` es el eje de PERMISOS (qué puede administrar del sistema). Es
-- independiente de las relaciones de negocio (tener fila en alumno / profesor),
-- que son las que arman el menú del portal. Ghezz es STAFF *y* profesor *y*
-- puede alquilar una cabina para él, sin contradicción.
CREATE TABLE usuario (
    id_usuario        BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_completo   VARCHAR(150) NOT NULL,
    email             VARCHAR(150) NOT NULL,
    telefono          VARCHAR(40),
    password_hash     VARCHAR(255) NOT NULL,
    rol               VARCHAR(20)  NOT NULL DEFAULT 'USUARIO',
    foto_perfil       VARCHAR(500),
    estado_presencia  VARCHAR(20)  NOT NULL DEFAULT 'ACTIVO',
    bio               TEXT,
    especializacion   VARCHAR(150),
    activo            BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    ultimo_acceso     TIMESTAMPTZ,

    CONSTRAINT usuario_rol_valido
        CHECK (rol IN ('ADMIN', 'DIRECTIVO', 'STAFF', 'USUARIO')),
    CONSTRAINT usuario_presencia_valida
        CHECK (estado_presencia IN ('ACTIVO', 'AUSENTE', 'OCUPADO', 'EN_CLASE'))
);

-- El email es la credencial de acceso: único siempre, sin distinguir mayúsculas.
CREATE UNIQUE INDEX usuario_email_unico ON usuario (lower(email));

-- "No se permiten alumnos duplicados por teléfono o email" (propuesta, Módulo 1).
-- El teléfono es opcional, así que el índice solo aplica cuando hay uno cargado.
CREATE UNIQUE INDEX usuario_telefono_unico ON usuario (telefono)
    WHERE telefono IS NOT NULL;


-- Relación formativa de un usuario con el estudio. No todo usuario tiene fila acá:
-- quien solo alquila una cabina o manda un track a mastering nunca es alumno.
CREATE TABLE alumno (
    id_alumno        BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario       BIGINT      NOT NULL UNIQUE REFERENCES usuario (id_usuario),
    nivel_ingreso    VARCHAR(20),
    estado_alumno    VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    fecha_ingreso    DATE        NOT NULL DEFAULT CURRENT_DATE,
    ultimo_contacto  DATE,
    instagram        VARCHAR(100),

    CONSTRAINT alumno_nivel_ingreso_valido
        CHECK (nivel_ingreso IS NULL
               OR nivel_ingreso IN ('INICIAL', 'INTERMEDIO', 'AVANZADO')),
    CONSTRAINT alumno_estado_valido
        CHECK (estado_alumno IN ('ACTIVO', 'INACTIVO', 'SUSPENDIDO'))
);

-- Nota: `disciplina` y `nivel_actual` NO viven acá. Viven en `inscripcion`,
-- porque un alumno puede cursar DJ y producción a la vez, o repetir un curso
-- el año siguiente, y un campo suelto en el alumno pisaría su historial.


CREATE TABLE profesor (
    id_profesor   BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario    BIGINT      NOT NULL UNIQUE REFERENCES usuario (id_usuario),
    especialidad  VARCHAR(150),
    activo        BOOLEAN     NOT NULL DEFAULT TRUE
);


-- =============================================================================
-- 2. ESPACIOS
--
-- Tres salas, y las tres son "cabinas" (lugares donde se toca). Dos de práctica
-- (Sala 1 y Sala 2) y una de grabación, que tiene equipos y cámara pero no
-- tiene silla, tele ni escritorio -- por eso no sirve para todo.
-- =============================================================================

CREATE TABLE sala (
    id_sala      BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_sala  VARCHAR(100) NOT NULL UNIQUE,
    descripcion  TEXT,
    activa       BOOLEAN      NOT NULL DEFAULT TRUE,
    orden        SMALLINT     NOT NULL DEFAULT 0   -- orden en el calendario
);


CREATE TABLE tipo_uso (
    id_tipo_uso  BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo       VARCHAR(40)  NOT NULL UNIQUE,
    nombre       VARCHAR(100) NOT NULL,
    -- Si es TRUE, este uso corresponde a una clase y espera profesor asignado.
    es_clase     BOOLEAN      NOT NULL DEFAULT FALSE,
    color        VARCHAR(20),                        -- color en el calendario
    activo       BOOLEAN      NOT NULL DEFAULT TRUE
);


-- LA MATRIZ. Qué se puede hacer en cada sala.
--
-- Es una tabla y no reglas en el código a propósito: el día que compren una
-- tele y una silla para la cabina de grabación, la regla se cambia desde una
-- pantalla, sin migración ni deploy.
--
-- `advertencia` permite el caso intermedio "se puede, pero ojo": una clase de
-- DJ en la cabina de grabación es válida solo si es una práctica final.
-- Bloquearlo sería rígido de más; no avisar nada dejaría que se mande una clase
-- teórica a una sala sin escritorio.
CREATE TABLE sala_tipo_uso (
    id_sala      BIGINT NOT NULL REFERENCES sala (id_sala),
    id_tipo_uso  BIGINT NOT NULL REFERENCES tipo_uso (id_tipo_uso),
    advertencia  TEXT,

    PRIMARY KEY (id_sala, id_tipo_uso)
);


CREATE TABLE bloqueo_sala (
    id_bloqueo           BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_sala              BIGINT      NOT NULL REFERENCES sala (id_sala),
    id_usuario_registra  BIGINT      REFERENCES usuario (id_usuario),
    fecha_inicio         DATE        NOT NULL,
    fecha_fin            DATE        NOT NULL,
    hora_inicio          TIME        NOT NULL DEFAULT '00:00',
    hora_fin             TIME        NOT NULL DEFAULT '23:59',
    motivo               TEXT        NOT NULL,
    fecha_registro       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT bloqueo_rango_fechas_valido CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT bloqueo_rango_horas_valido  CHECK (hora_fin > hora_inicio)
);


-- =============================================================================
-- 3. FORMACIÓN
-- =============================================================================

-- La pieza que faltaba en el modelo original.
--
-- Acá vive "Juan compró el curso de DJ inicial: 8 clases, $X, con Tomás".
-- Sin esto no se puede saber cuántas clases le quedan, que es justo lo que el
-- relevamiento marca como faltante hoy.
--
-- El curso es CERRADO (8 clases), no un paquete de clases sueltas, y ninguna
-- clase se pierde nunca: si falta el alumno o falta el profesor, se recupera.
-- Por eso no hay fecha de fin comprometida: el curso termina cuando se
-- dictaron las clases contratadas.
CREATE TABLE inscripcion (
    id_inscripcion      BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_alumno           BIGINT       NOT NULL REFERENCES alumno (id_alumno),
    -- Profesor a cargo. Asignación EXPLÍCITA, no deducida de las reservas: que
    -- otro profe cubra una clase suelta no le transfiere el alumno.
    id_profesor         BIGINT       REFERENCES profesor (id_profesor),
    disciplina          VARCHAR(20)  NOT NULL,
    nivel               VARCHAR(20),
    clases_contratadas  SMALLINT     NOT NULL,
    precio_total        NUMERIC(14,2) NOT NULL,
    moneda              VARCHAR(3)   NOT NULL DEFAULT 'ARS',
    cotizacion_dolar    NUMERIC(14,4),
    fecha_inicio        DATE,
    estado              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVA',
    notas               TEXT,
    fecha_creacion      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT inscripcion_disciplina_valida
        CHECK (disciplina IN ('DJ', 'PRODUCCION', 'MENTORIA')),
    CONSTRAINT inscripcion_nivel_valido
        CHECK (nivel IS NULL OR nivel IN ('INICIAL', 'INTERMEDIO', 'AVANZADO')),
    CONSTRAINT inscripcion_estado_valido
        CHECK (estado IN ('ACTIVA', 'COMPLETADA', 'CANCELADA', 'PAUSADA')),
    CONSTRAINT inscripcion_clases_positivas CHECK (clases_contratadas > 0),
    CONSTRAINT inscripcion_moneda_valida    CHECK (moneda IN ('ARS', 'USD')),
    -- Si el precio está en dólares, la cotización del momento es obligatoria.
    CONSTRAINT inscripcion_usd_con_cotizacion
        CHECK (moneda <> 'USD' OR cotizacion_dolar IS NOT NULL)
);

-- "Podés estar haciendo DJ inicial y mentoría; no DJ inicial y DJ avanzado."
-- Una sola inscripción activa por disciplina.
-- (Si algún día alguien necesita dos mentorías simultáneas con profes distintos,
--  se relaja excluyendo 'MENTORIA' de este índice.)
CREATE UNIQUE INDEX inscripcion_una_activa_por_disciplina
    ON inscripcion (id_alumno, disciplina)
    WHERE estado = 'ACTIVA';


-- Una reserva es un bloque de tiempo en una sala. Puede ser una clase, un
-- alquiler, una sesión de mastering o una grabación.
--
-- Quiénes participan NO está acá: está en reserva_participante, porque una
-- clase puede ser grupal y cada alumno viene de su propia inscripción.
CREATE TABLE reserva (
    id_reserva            BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_sala               BIGINT      NOT NULL REFERENCES sala (id_sala),
    id_tipo_uso           BIGINT      NOT NULL REFERENCES tipo_uso (id_tipo_uso),
    id_profesor           BIGINT      REFERENCES profesor (id_profesor),
    fecha                 DATE        NOT NULL,
    hora_inicio           TIME        NOT NULL,
    hora_fin              TIME        NOT NULL,
    estado                VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADA',
    notas                 TEXT,

    -- Ninguna clase se pierde: cuando una se reprograma, la nueva reserva
    -- apunta acá a la que reemplaza. Así queda la trazabilidad completa.
    id_reserva_recupera   BIGINT      REFERENCES reserva (id_reserva),
    motivo_reprogramacion TEXT,

    id_usuario_creo       BIGINT      REFERENCES usuario (id_usuario),
    id_usuario_modifico   BIGINT      REFERENCES usuario (id_usuario),
    fecha_creacion        TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_modificacion    TIMESTAMPTZ,

    -- Período ocupado, derivado. Existe para que el EXCLUDE de abajo pueda
    -- trabajar sobre un rango en vez de sobre tres columnas sueltas.
    periodo tsrange GENERATED ALWAYS AS
        (tsrange(fecha + hora_inicio, fecha + hora_fin)) STORED,

    CONSTRAINT reserva_estado_valido
        CHECK (estado IN ('CONFIRMADA', 'MODIFICADA', 'CANCELADA',
                          'REPROGRAMADA', 'FINALIZADA')),
    CONSTRAINT reserva_horas_validas CHECK (hora_fin > hora_inicio),
    -- Una reserva no puede recuperarse a sí misma.
    CONSTRAINT reserva_no_se_recupera_a_si_misma
        CHECK (id_reserva_recupera IS DISTINCT FROM id_reserva)
);

-- DEFINICIÓN CANÓNICA DE "RESERVA QUE OCUPA LA SALA".
--
-- Una reserva ocupa su franja salvo que esté CANCELADA (no va a pasar) o
-- REPROGRAMADA (se movió a otra fecha; la nueva reserva apunta a esta con
-- id_reserva_recupera). Los tres lugares que necesitan esta definición -- el
-- EXCLUDE de acá abajo y los dos triggers del final -- usan exactamente esta
-- lista. Si cambia, cambia en los tres o la base empieza a contradecirse.
--
-- La regla más importante del sistema: NUNCA dos reservas solapadas en la
-- misma sala. Va como EXCLUDE y no como trigger porque un EXCLUDE es la única
-- forma de que aguante concurrencia: dos personas reservando en el mismo
-- instante son bloqueadas por el índice, mientras que dos triggers leyendo en
-- paralelo no se ven entre sí y dejan pasar las dos.
ALTER TABLE reserva ADD CONSTRAINT reserva_sin_solapamiento
    EXCLUDE USING gist (id_sala WITH =, periodo WITH &&)
    WHERE (estado NOT IN ('CANCELADA', 'REPROGRAMADA'));

-- Una clase se recupera UNA sola vez: dos reservas no pueden decir que
-- reemplazan a la misma clase original.
CREATE UNIQUE INDEX reserva_recupera_una_sola_vez
    ON reserva (id_reserva_recupera) WHERE id_reserva_recupera IS NOT NULL;

-- La matriz de §2.6 aplicada como llave foránea compuesta: si el par
-- (sala, tipo de uso) no está habilitado, la reserva no entra. Grabar un set en
-- la Sala 1, o dar una mentoría en la cabina de grabación, son imposibles.
ALTER TABLE reserva ADD CONSTRAINT reserva_uso_permitido_en_sala
    FOREIGN KEY (id_sala, id_tipo_uso)
    REFERENCES sala_tipo_uso (id_sala, id_tipo_uso);

CREATE INDEX reserva_por_fecha    ON reserva (fecha);
CREATE INDEX reserva_por_profesor ON reserva (id_profesor, fecha);


-- Quiénes asisten a una reserva, y si asistieron.
--
-- Reemplaza a `historial_clase` del modelo original: una clase puede ser
-- grupal, así que la asistencia es por participante, no por reserva.
-- `id_inscripcion` es lo que descuenta la clase del curso contratado; va vacío
-- cuando la reserva no corresponde a un curso (un alquiler, por ejemplo).
CREATE TABLE reserva_participante (
    id_participacion  BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reserva        BIGINT      NOT NULL REFERENCES reserva (id_reserva),
    id_usuario        BIGINT      NOT NULL REFERENCES usuario (id_usuario),
    id_inscripcion    BIGINT      REFERENCES inscripcion (id_inscripcion),
    estado_asistencia VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    observaciones     TEXT,
    fecha_registro    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT participante_asistencia_valida
        CHECK (estado_asistencia IN ('PENDIENTE', 'PRESENTE', 'AUSENTE',
                                     'AUSENTE_JUSTIFICADO', 'CANCELADA')),
    CONSTRAINT participante_unico_por_reserva UNIQUE (id_reserva, id_usuario)
);

CREATE INDEX participante_por_usuario     ON reserva_participante (id_usuario);
CREATE INDEX participante_por_inscripcion ON reserva_participante (id_inscripcion);


-- Notas privadas del profesor sobre un alumno. No las ve el alumno ni otros
-- profesores; administración sí.
CREATE TABLE nota_profesor (
    id_nota            BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_profesor        BIGINT      NOT NULL REFERENCES profesor (id_profesor),
    id_alumno          BIGINT      NOT NULL REFERENCES alumno (id_alumno),
    id_participacion   BIGINT      REFERENCES reserva_participante (id_participacion),
    contenido          TEXT        NOT NULL,
    fecha_creacion     TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_modificacion TIMESTAMPTZ
);

CREATE INDEX nota_por_alumno ON nota_profesor (id_alumno);


CREATE TABLE seguimiento_alumno (
    id_seguimiento       BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_profesor          BIGINT      NOT NULL REFERENCES profesor (id_profesor),
    id_alumno            BIGINT      NOT NULL REFERENCES alumno (id_alumno),
    estado               VARCHAR(30) NOT NULL,
    observaciones        TEXT,
    fecha_actualizacion  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT seguimiento_estado_valido
        CHECK (estado IN ('VA_BIEN', 'REQUIERE_ATENCION', 'EN_PAUSA')),
    CONSTRAINT seguimiento_unico UNIQUE (id_profesor, id_alumno)
);


-- Material de clase. Los archivos pesados no se guardan acá: se guarda el link.
CREATE TABLE material (
    id_material     BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_profesor     BIGINT       NOT NULL REFERENCES profesor (id_profesor),
    id_alumno       BIGINT       REFERENCES alumno (id_alumno),
    es_grupal       BOOLEAN      NOT NULL DEFAULT FALSE,
    titulo          VARCHAR(200) NOT NULL,
    tipo            VARCHAR(50),
    archivo_path    VARCHAR(500),
    url_externa     VARCHAR(500),
    visible_alumno  BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_subida    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- O es para un alumno concreto, o es grupal. No las dos, ni ninguna.
    CONSTRAINT material_destinatario_definido
        CHECK ((es_grupal AND id_alumno IS NULL)
            OR (NOT es_grupal AND id_alumno IS NOT NULL)),
    -- Algo tiene que haber: un archivo subido o un link.
    CONSTRAINT material_tiene_contenido
        CHECK (archivo_path IS NOT NULL OR url_externa IS NOT NULL)
);


CREATE TABLE solicitud_reprogramacion (
    id_solicitud               BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario                 BIGINT      NOT NULL REFERENCES usuario (id_usuario),
    id_reserva                 BIGINT      NOT NULL REFERENCES reserva (id_reserva),
    motivo                     TEXT        NOT NULL,
    fecha_alternativa_solicitada DATE,
    estado                     VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    id_usuario_resuelve        BIGINT      REFERENCES usuario (id_usuario),
    respuesta                  TEXT,
    fecha_solicitud            TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_resolucion           TIMESTAMPTZ,

    CONSTRAINT solicitud_estado_valido
        CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
    -- Una solicitud resuelta tiene que decir quién la resolvió y cuándo. Sin
    -- esto se podía aprobar una reprogramación sin dejar responsable, que es
    -- justo la trazabilidad que el relevamiento marca como faltante hoy.
    CONSTRAINT solicitud_resolucion_completa
        CHECK (estado = 'PENDIENTE'
               OR (id_usuario_resuelve IS NOT NULL AND fecha_resolucion IS NOT NULL))
);


-- =============================================================================
-- 4. DINERO
-- =============================================================================

-- Todo pago dice QUÉ salda. Las cuatro FKs son opcionales pero al menos una
-- tiene que estar: un pago suelto que no se sabe a qué corresponde es
-- exactamente el problema que este sistema viene a resolver.
CREATE TABLE pago (
    id_pago              BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario           BIGINT        NOT NULL REFERENCES usuario (id_usuario),
    id_usuario_registra  BIGINT        REFERENCES usuario (id_usuario),

    id_inscripcion       BIGINT        REFERENCES inscripcion (id_inscripcion),
    id_reserva           BIGINT        REFERENCES reserva (id_reserva),
    id_trabajo_mastering BIGINT,       -- FK más abajo (la tabla se crea después)
    id_venta_equipo      BIGINT,       -- idem

    concepto             VARCHAR(200),
    monto                NUMERIC(14,2) NOT NULL,
    moneda               VARCHAR(3)    NOT NULL DEFAULT 'ARS',
    cotizacion_dolar     NUMERIC(14,4),
    medio_pago           VARCHAR(30)   NOT NULL,

    -- PORCENTAJE (0-100), no un importe. Confirmado con el cliente el
    -- 2026-08-11 y coherente con la propuesta ("Porcentaje de descuento
    -- aplicado"). El nombre lleva la unidad adentro a propósito: `descuento` a
    -- secas, al lado de `monto` y con el mismo tipo, se leía como un importe --
    -- una ambigüedad que ya costó una vuelta de auditoría.
    --
    -- Y la otra mitad de la definición: `monto` es lo EFECTIVAMENTE COBRADO,
    -- con el descuento ya aplicado. Entonces la caja es la suma de `monto`, sin
    -- recalcular nada, y el porcentaje queda como registro de por qué se cobró
    -- menos que la lista.
    descuento_porcentaje NUMERIC(5,2)  NOT NULL DEFAULT 0,
    motivo_descuento     TEXT,
    estado_pago          VARCHAR(20)   NOT NULL DEFAULT 'PAGADO',
    comprobante_path     VARCHAR(500),
    comprobante_invalido BOOLEAN       NOT NULL DEFAULT FALSE,
    fecha_pago           DATE          NOT NULL DEFAULT CURRENT_DATE,
    fecha_registro       TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT pago_moneda_valida CHECK (moneda IN ('ARS', 'USD')),
    CONSTRAINT pago_usd_con_cotizacion
        CHECK (moneda <> 'USD' OR cotizacion_dolar IS NOT NULL),
    CONSTRAINT pago_medio_valido
        CHECK (medio_pago IN ('EFECTIVO', 'TRANSFERENCIA', 'PAYPAL',
                              'CUENTA_EEUU', 'OTRO')),
    CONSTRAINT pago_estado_valido
        CHECK (estado_pago IN ('SENADO', 'PAGADO', 'DEBE', 'VENCIDO', 'ANULADO')),
    CONSTRAINT pago_monto_positivo CHECK (monto > 0),
    -- Un porcentaje vive entre 0 y 100. Sin el tope, un "descuento" de 20000
    -- entra como si fuera un importe y nadie se entera hasta el balance.
    CONSTRAINT pago_descuento_rango
        CHECK (descuento_porcentaje >= 0 AND descuento_porcentaje <= 100),
    -- Todo descuento queda con justificación escrita (propuesta, Módulo 3).
    CONSTRAINT pago_descuento_justificado
        CHECK (descuento_porcentaje = 0 OR motivo_descuento IS NOT NULL),
    -- Un pago salda UNA cosa, exactamente. Antes esto decía `>= 1`, que dejaba
    -- registrar un pago apuntando a la vez a una inscripción y a una venta de
    -- equipo: el monto quedaba contado dos veces en los reportes por línea de
    -- negocio. Si alguien paga dos servicios juntos, son dos filas.
    CONSTRAINT pago_tiene_destino
        CHECK (num_nonnulls(id_inscripcion, id_reserva,
                            id_trabajo_mastering, id_venta_equipo) = 1)
);

CREATE INDEX pago_por_usuario ON pago (id_usuario, fecha_pago);
CREATE INDEX pago_deudores    ON pago (estado_pago) WHERE estado_pago IN ('DEBE', 'VENCIDO');


CREATE TABLE egreso (
    id_egreso            BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario_registra  BIGINT        REFERENCES usuario (id_usuario),
    -- Si el egreso es un pago a un profesor, queda vinculado.
    id_usuario_destino   BIGINT        REFERENCES usuario (id_usuario),
    monto                NUMERIC(14,2) NOT NULL,
    moneda               VARCHAR(3)    NOT NULL DEFAULT 'ARS',
    cotizacion_dolar     NUMERIC(14,4),
    concepto             VARCHAR(200)  NOT NULL,
    destinatario         VARCHAR(150),
    comprobante_path     VARCHAR(500),
    fecha_egreso         DATE          NOT NULL DEFAULT CURRENT_DATE,
    fecha_registro       TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT egreso_moneda_valida CHECK (moneda IN ('ARS', 'USD')),
    CONSTRAINT egreso_usd_con_cotizacion
        CHECK (moneda <> 'USD' OR cotizacion_dolar IS NOT NULL),
    CONSTRAINT egreso_monto_positivo CHECK (monto > 0)
);


-- Venta de equipos. Sin stock propio: se vende contra el stock de Pioneer,
-- así que esto registra la venta, no un inventario.
CREATE TABLE venta_equipo (
    id_venta                 BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario_comprador     BIGINT        REFERENCES usuario (id_usuario),
    nombre_comprador_externo VARCHAR(150),
    contacto_comprador_externo VARCHAR(150),
    id_usuario_vendedor      BIGINT        NOT NULL REFERENCES usuario (id_usuario),
    categoria                VARCHAR(50),
    marca                    VARCHAR(100),
    modelo_equipo            VARCHAR(150)  NOT NULL,
    precio                   NUMERIC(14,2) NOT NULL,
    moneda                   VARCHAR(3)    NOT NULL DEFAULT 'ARS',
    cotizacion_dolar         NUMERIC(14,4),
    fecha_venta              DATE          NOT NULL DEFAULT CURRENT_DATE,
    notas                    TEXT,

    CONSTRAINT venta_moneda_valida CHECK (moneda IN ('ARS', 'USD')),
    CONSTRAINT venta_usd_con_cotizacion
        CHECK (moneda <> 'USD' OR cotizacion_dolar IS NOT NULL),
    -- El comprador tiene cuenta, o se anota su nombre. Alguno de los dos.
    CONSTRAINT venta_comprador_identificado
        CHECK (id_usuario_comprador IS NOT NULL
            OR nombre_comprador_externo IS NOT NULL)
);


-- =============================================================================
-- 5. MIX & MASTERING
--
-- El único servicio que puede quedar en debe: Ghezz entrega primero y cobra
-- después. El sistema no guarda los audios (pesan 80-100 MB cada uno): guarda
-- el link y controla CUÁNDO el cliente puede verlo.
-- =============================================================================

CREATE TABLE trabajo_mastering (
    id_trabajo               BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente_usuario       BIGINT        REFERENCES usuario (id_usuario),
    nombre_cliente_externo   VARCHAR(150),
    contacto_cliente_externo VARCHAR(150),
    id_profesor_asignado     BIGINT        REFERENCES profesor (id_profesor),
    tipo_trabajo             VARCHAR(20)   NOT NULL,
    nombre_track             VARCHAR(200)  NOT NULL,
    precio_acordado          NUMERIC(14,2),
    moneda                   VARCHAR(3)    NOT NULL DEFAULT 'USD',
    cotizacion_dolar         NUMERIC(14,4),
    revisiones_incluidas     SMALLINT      NOT NULL DEFAULT 3,
    revisiones_realizadas    SMALLINT      NOT NULL DEFAULT 0,
    fecha_estimada           DATE,
    fecha_entrega_real       DATE,
    estado                   VARCHAR(20)   NOT NULL DEFAULT 'A_CONFIRMAR',

    -- Los dos entregables, como links. Ghezz entrega el master; retiene el
    -- premaster (el que el cliente necesita para las discográficas) hasta que
    -- el pago esté registrado.
    url_material_cliente     VARCHAR(500),  -- lo que mandó el cliente
    url_master               VARCHAR(500),
    url_premaster            VARCHAR(500),
    premaster_liberado       BOOLEAN       NOT NULL DEFAULT FALSE,

    -- Ghezz cobra con flexibilidad deliberada según el cliente. Si el bloqueo
    -- no tuviera salida, lo esquivaría y volveríamos al WhatsApp. La salida
    -- existe, pero deja rastro.
    liberado_sin_pago        BOOLEAN       NOT NULL DEFAULT FALSE,
    motivo_liberacion        TEXT,
    id_usuario_libera        BIGINT        REFERENCES usuario (id_usuario),

    notas_internas           TEXT,
    fecha_creacion           TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT trabajo_tipo_valido
        CHECK (tipo_trabajo IN ('MIX', 'MASTER', 'MIX_MASTER')),
    CONSTRAINT trabajo_estado_valido
        CHECK (estado IN ('A_CONFIRMAR', 'EN_PROCESO', 'ENTREGADO',
                          'PAGADO', 'DEBE', 'CANCELADO')),
    -- A diferencia de pago/egreso/venta/inscripcion, acá NO se exige cotización
    -- para los montos en USD, y es deliberado: `precio_acordado` es lo pactado
    -- con el cliente al presupuestar, y la cotización que importa es la del día
    -- del cobro, que queda en la fila de `pago`. Exigirla acá obligaría a
    -- inventar un tipo de cambio al presupuestar.
    CONSTRAINT trabajo_moneda_valida CHECK (moneda IN ('ARS', 'USD')),
    CONSTRAINT trabajo_revisiones_no_negativas
        CHECK (revisiones_realizadas >= 0 AND revisiones_incluidas >= 0),
    CONSTRAINT trabajo_cliente_identificado
        CHECK (id_cliente_usuario IS NOT NULL
            OR nombre_cliente_externo IS NOT NULL),
    -- Si se liberó sin pago, hay que decir por qué.
    CONSTRAINT trabajo_liberacion_justificada
        CHECK (NOT liberado_sin_pago OR motivo_liberacion IS NOT NULL)
);

ALTER TABLE pago ADD CONSTRAINT pago_trabajo_mastering_fk
    FOREIGN KEY (id_trabajo_mastering) REFERENCES trabajo_mastering (id_trabajo);
ALTER TABLE pago ADD CONSTRAINT pago_venta_equipo_fk
    FOREIGN KEY (id_venta_equipo) REFERENCES venta_equipo (id_venta);


-- =============================================================================
-- 6. SELLO DISCOGRÁFICO
-- =============================================================================

CREATE TABLE artista (
    id_artista        BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Nullable: los artistas hoy no tienen login. Queda preparado a futuro.
    id_usuario        BIGINT       REFERENCES usuario (id_usuario),
    nombre_artistico  VARCHAR(150) NOT NULL,
    nombre_real       VARCHAR(150),
    email_contacto    VARCHAR(150),
    telefono          VARCHAR(40),
    instagram         VARCHAR(100),
    confirmado        BOOLEAN      NOT NULL DEFAULT FALSE,
    bio               TEXT,
    fecha_alta        TIMESTAMPTZ  NOT NULL DEFAULT now()
);


CREATE TABLE release (
    id_release      BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- ID propio del sello, correlativo: LJ020, LJ021...
    codigo_release  VARCHAR(20)  NOT NULL UNIQUE,
    id_artista      BIGINT       NOT NULL REFERENCES artista (id_artista),
    nombre_release  VARCHAR(200) NOT NULL,
    tipo_release    VARCHAR(20),
    genero          VARCHAR(80),
    portada_path    VARCHAR(500),
    fecha_estimada  DATE,
    fecha_real      DATE,
    estado          VARCHAR(20)  NOT NULL DEFAULT 'A_CONFIRMAR',
    sistema_promo   BOOLEAN      NOT NULL DEFAULT FALSE,
    notas           TEXT,
    fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT release_tipo_valido
        CHECK (tipo_release IS NULL OR tipo_release IN ('SINGLE', 'EP', 'REMIX', 'ALBUM')),
    CONSTRAINT release_estado_valido
        CHECK (estado IN ('A_CONFIRMAR', 'CONFIRMADO', 'EN_DISTRIBUCION', 'PUBLICADO'))
);


CREATE TABLE contrato_sello (
    id_contrato    BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_artista     BIGINT      NOT NULL REFERENCES artista (id_artista),
    -- Nullable: un contrato puede cubrir al artista en general, no un release.
    id_release     BIGINT      REFERENCES release (id_release),
    archivo_path   VARCHAR(500) NOT NULL,
    fecha_firma    DATE,
    observaciones  TEXT,
    fecha_carga    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- 7. SISTEMA
-- =============================================================================

CREATE TABLE notificacion (
    id_notificacion    BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario_destino BIGINT      NOT NULL REFERENCES usuario (id_usuario),
    tipo               VARCHAR(50) NOT NULL,
    titulo             VARCHAR(200),
    contenido          TEXT        NOT NULL,
    -- A dónde lleva la notificación al hacer clic.
    url_destino        VARCHAR(300),
    leida              BOOLEAN     NOT NULL DEFAULT FALSE,
    fecha_creacion     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notificacion_no_leidas
    ON notificacion (id_usuario_destino) WHERE NOT leida;


-- =============================================================================
-- 8. REGLAS CRUZADAS ENTRE TABLAS
--
-- Todo lo que hay acá abajo son invariantes que involucran DOS tablas y que
-- por eso no se pueden expresar como CHECK ni como FK. Van como triggers.
--
-- Cada trigger que compite por el mismo recurso empieza tomando un lock sobre
-- la fila de `sala`. Sin ese lock, dos transacciones simultáneas leen el estado
-- viejo, ninguna ve a la otra, y las dos commitean: así se coló una reserva
-- dentro de una sala bloqueada en la prueba de concurrencia. Serializar por
-- sala es barato -- hablamos de unas pocas reservas por hora, no de un
-- e-commerce -- y es la diferencia entre una regla real y una sugerencia.
-- =============================================================================

-- --- 8.1 Una sala bloqueada no acepta reservas -------------------------------

CREATE OR REPLACE FUNCTION verificar_sala_no_bloqueada()
RETURNS TRIGGER AS $$
BEGIN
    -- Ver la DEFINICIÓN CANÓNICA arriba: estas dos no ocupan la sala.
    IF NEW.estado IN ('CANCELADA', 'REPROGRAMADA') THEN
        RETURN NEW;
    END IF;

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
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reserva_respeta_bloqueos
    BEFORE INSERT OR UPDATE ON reserva
    FOR EACH ROW EXECUTE FUNCTION verificar_sala_no_bloqueada();


-- El camino inverso: no se bloquea una sala que ya tiene reservas activas
-- adentro. Primero se cancelan o se mueven.
CREATE OR REPLACE FUNCTION verificar_bloqueo_sin_reservas()
RETURNS TRIGGER AS $$
DECLARE
    cantidad INTEGER;
BEGIN
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
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bloqueo_sin_reservas_activas
    BEFORE INSERT OR UPDATE ON bloqueo_sala
    FOR EACH ROW EXECUTE FUNCTION verificar_bloqueo_sin_reservas();


-- --- 8.2 La inscripción que se descuenta tiene que ser del que asiste --------
--
-- Sin esto se podía anotar a Juan en una clase descontándole la clase a la
-- inscripción de Ana: el contador de "clases restantes" de las dos quedaba
-- mal y nadie se enteraba hasta el reclamo.
CREATE OR REPLACE FUNCTION verificar_inscripcion_del_participante()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_inscripcion IS NULL THEN
        RETURN NEW;   -- alquiler, grabación, uso suelto: no descuenta clases
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM inscripcion i
        JOIN alumno a ON a.id_alumno = i.id_alumno
        WHERE i.id_inscripcion = NEW.id_inscripcion
          AND a.id_usuario = NEW.id_usuario
    ) THEN
        RAISE EXCEPTION
            'La inscripcion % no pertenece al usuario %',
            NEW.id_inscripcion, NEW.id_usuario;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER participante_inscripcion_coherente
    BEFORE INSERT OR UPDATE ON reserva_participante
    FOR EACH ROW EXECUTE FUNCTION verificar_inscripcion_del_participante();


-- --- 8.3 Una nota va sobre una clase de ese mismo alumno ---------------------
--
-- Las notas del profesor son privadas y sensibles. Colgarlas de la clase de
-- otro alumno no es solo un dato mal ubicado: es la nota de una persona
-- apareciendo en el historial de otra.
CREATE OR REPLACE FUNCTION verificar_nota_del_alumno()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_participacion IS NULL THEN
        RETURN NEW;   -- nota general del alumno, no atada a una clase
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM reserva_participante rp
        JOIN alumno a ON a.id_usuario = rp.id_usuario
        WHERE rp.id_participacion = NEW.id_participacion
          AND a.id_alumno = NEW.id_alumno
    ) THEN
        RAISE EXCEPTION
            'La participacion % no corresponde al alumno %',
            NEW.id_participacion, NEW.id_alumno;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nota_coherente_con_alumno
    BEFORE INSERT OR UPDATE ON nota_profesor
    FOR EACH ROW EXECUTE FUNCTION verificar_nota_del_alumno();


-- --- 8.4 El premaster no se libera sin pago ----------------------------------
--
-- Es LA regla del Módulo 6 y la que le resuelve a Ghezz el "entrego y después
-- ando atrás del pago". Hasta acá vivía solo en la intención: la columna
-- premaster_liberado se podía poner en TRUE sin más.
--
-- La salida de emergencia existe a propósito: Ghezz cobra con flexibilidad
-- según el cliente ("con gente de mucha exposición hay que tener cintura").
-- Si el bloqueo no tuviera excepción, la esquivaría y volveríamos al WhatsApp.
-- Pero la excepción deja rastro: quién liberó y por qué.
CREATE OR REPLACE FUNCTION verificar_liberacion_premaster()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT NEW.premaster_liberado THEN
        RETURN NEW;
    END IF;

    IF NEW.liberado_sin_pago THEN
        RETURN NEW;   -- excepción explícita; el CHECK ya exige el motivo
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pago p
        WHERE p.id_trabajo_mastering = NEW.id_trabajo
          AND p.estado_pago = 'PAGADO'
    ) THEN
        RAISE EXCEPTION
            'No se puede liberar el premaster del trabajo % sin un pago registrado. '
            'Para liberarlo igual, usar liberado_sin_pago con motivo.',
            NEW.id_trabajo;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER premaster_requiere_pago
    BEFORE INSERT OR UPDATE ON trabajo_mastering
    FOR EACH ROW EXECUTE FUNCTION verificar_liberacion_premaster();


-- --- 8.5 Los estados solo avanzan --------------------------------------------
--
-- Regla explícita de la propuesta para Mix & Mastering y para los releases del
-- sello ("El estado solo puede avanzar, no retroceder"). Evita que un trabajo
-- ya cobrado vuelva a "en proceso" y descuadre los reportes de ingresos.
--
-- CANCELADO queda fuera de la escalera: se puede cancelar desde cualquier
-- estado. OJO: esto también impide corregir un estado cargado por error; si en
-- el uso real molesta, se relaja acá y en `docs/requirements/platform.md`.
CREATE OR REPLACE FUNCTION verificar_avance_estado_trabajo()
RETURNS TRIGGER AS $$
DECLARE
    orden_anterior INTEGER;
    orden_nuevo    INTEGER;
BEGIN
    IF NEW.estado = OLD.estado OR NEW.estado = 'CANCELADO' THEN
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
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trabajo_estado_solo_avanza
    BEFORE UPDATE ON trabajo_mastering
    FOR EACH ROW EXECUTE FUNCTION verificar_avance_estado_trabajo();


CREATE OR REPLACE FUNCTION verificar_avance_estado_release()
RETURNS TRIGGER AS $$
DECLARE
    orden_anterior INTEGER;
    orden_nuevo    INTEGER;
BEGIN
    IF NEW.estado = OLD.estado THEN
        RETURN NEW;
    END IF;

    orden_anterior := CASE OLD.estado
        WHEN 'A_CONFIRMAR'     THEN 1 WHEN 'CONFIRMADO' THEN 2
        WHEN 'EN_DISTRIBUCION' THEN 3 WHEN 'PUBLICADO'  THEN 4 ELSE 0 END;
    orden_nuevo := CASE NEW.estado
        WHEN 'A_CONFIRMAR'     THEN 1 WHEN 'CONFIRMADO' THEN 2
        WHEN 'EN_DISTRIBUCION' THEN 3 WHEN 'PUBLICADO'  THEN 4 ELSE 0 END;

    IF orden_nuevo < orden_anterior THEN
        RAISE EXCEPTION
            'El estado del release no puede retroceder (% -> %)',
            OLD.estado, NEW.estado;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER release_estado_solo_avanza
    BEFORE UPDATE ON release
    FOR EACH ROW EXECUTE FUNCTION verificar_avance_estado_release();


-- =============================================================================
-- 9. ÍNDICES DE CONSULTA
--
-- Postgres NO indexa las claves foráneas solo. Acá van únicamente las que
-- respaldan una consulta concreta del sistema: indexar las 46 FK "por las
-- dudas" penalizaría cada escritura sin beneficio, porque muchas de esas
-- tablas se leen siempre por su clave primaria.
-- =============================================================================

-- El calendario de salas: la consulta más frecuente de todo el sistema.
-- (El índice GiST del EXCLUDE sirve para detectar solapamientos, no para
--  listar "qué hay en la Sala 1 esta semana".)
CREATE INDEX reserva_por_sala_fecha ON reserva (id_sala, fecha);

-- Perfil del alumno: todas sus inscripciones, activas o no. El índice único
-- parcial de más arriba solo cubre las ACTIVAS, así que no sirve para esto.
CREATE INDEX inscripcion_por_alumno ON inscripcion (id_alumno);

-- "Mis Alumnos" del portal del profesor.
CREATE INDEX inscripcion_por_profesor ON inscripcion (id_profesor)
    WHERE estado = 'ACTIVA';

-- Estado de cuenta de una inscripción (cuánto se pagó de lo contratado).
CREATE INDEX pago_por_inscripcion ON pago (id_inscripcion)
    WHERE id_inscripcion IS NOT NULL;

-- Tablero de trabajos de M&M pendientes.
CREATE INDEX trabajo_por_estado ON trabajo_mastering (estado);

-- La cola de aprobaciones de Micaela.
CREATE INDEX solicitud_pendientes ON solicitud_reprogramacion (fecha_solicitud)
    WHERE estado = 'PENDIENTE';

-- Materiales visibles de un alumno.
CREATE INDEX material_por_alumno ON material (id_alumno)
    WHERE id_alumno IS NOT NULL;
