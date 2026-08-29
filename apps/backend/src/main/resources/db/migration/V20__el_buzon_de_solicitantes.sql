-- =============================================================================
-- EL BUZÓN DE SOLICITANTES  (etapa de mejoras, hallazgo #7 · `mejoras.md` §9.4)
--
-- QUÉ AGUJERO TAPA
--
-- Los cuatro formularios de la landing —anotarse a un programa, pedir la cabina,
-- consultar por equipos, grabar un set— contestan *"listo, lo recibimos"* y no le
-- llegan a nadie. Está escrito en el propio código desde el 2026-08-09, cuando se
-- sacó por pedido el cartel de "todavía no se envía": el formulario quedó diciendo
-- que sí sin que la solicitud saliera del navegador. Mientras eso siga así **la
-- landing no se puede publicar**, porque publicarla es perder clientes reales.
--
--
-- POR QUÉ ES UNA TABLA Y NO UNA NOTIFICACIÓN — la corrección de diseño que importa
--
-- Una notificación se lee y se va. Un solicitante es **una ficha con ciclo de
-- vida**: pendiente → convertido en cuenta → o descartado. Como notificación, el
-- día que Micaela la lee y no puede actuar en ese momento se le va en el scroll y
-- no queda **ninguna lista de "gente que no contesté"**, que es exactamente lo
-- único que este buzón tiene que garantizar.
--
-- El sistema ya tenía resuelta esa distinción y este es el mismo par:
-- `solicitud_reserva` es la tabla con estados y la notificación es lo que la
-- **anuncia**.
--
--
-- POR QUÉ UN SOLO BUZÓN Y NO UNO POR SERVICIO
--
-- Los flujos son idénticos hasta el final: formulario → ficha → Micaela crea la
-- cuenta. Lo único que cambia es el último paso, y **ese ya está construido**:
-- carga la inscripción en `/admin/inscripciones`, la reserva en `/admin/reservas`
-- o la venta en `/admin/ventas`, con las pantallas que ya usa. La ficha solo tiene
-- que decir **qué pidió** para que sepa a cuál ir.
--
-- Mix & Mastering no entra: llega por WhatsApp a Ghezz y se carga a mano después,
-- que es la decisión vigente del Módulo 6 y no un olvido.
--
--
-- LO QUE ESTA TABLA NO TIENE, A PROPÓSITO
--
-- **No tiene una columna por cada campo de cada formulario.** Los cuatro piden
-- cosas distintas —modalidad y experiencia el de programas; fecha, hora, duración
-- y cantidad de personas el de cabina; categorías, nivel y presupuesto el de
-- equipos— y meterlos acá serían doce columnas anulables cuyo significado depende
-- de `interes`: la excepción por estado que §13 rechazó cuando se escribió la
-- seña. Van todos a `detalle`, en texto legible.
--
-- Y no se pierde nada, porque **ninguno de esos datos se usa para crear nada**: la
-- reserva la carga Micaela con su seña (el usuario no puede ponerla, `V10`–`V12`),
-- la inscripción también. El detalle es para que ella sepa de qué le van a hablar
-- cuando llame, no un formulario que el sistema procesa.
-- =============================================================================


-- =============================================================================
-- 1. LA TABLA
-- =============================================================================

CREATE TABLE solicitante (
    id_solicitante   BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Nombre y apellido separados, no un `nombre_completo`. Es la lección de `V4`
    -- del lado correcto del tiempo: allá hubo que partir una columna adivinando
    -- dónde terminaba el nombre, y quedó escrito que con un solo campo *"no se
    -- parte después sin adivinar"*. Acá la ficha nace para convertirse en un
    -- `usuario`, que los tiene separados, así que se piden separados desde el
    -- formulario. Mismos largos que `usuario`.
    nombre           VARCHAR(80)  NOT NULL,
    apellido         VARCHAR(80)  NOT NULL,
    email            VARCHAR(150) NOT NULL,

    -- Obligatorio, y es el único campo donde este formulario es más exigente que
    -- el registro público. El motivo es el canal: la contraseña temporal se manda
    -- por WhatsApp (no hay infraestructura de correo y está decidido que no la va
    -- a haber), así que una ficha sin teléfono es una ficha que no se puede
    -- convertir.
    telefono         VARCHAR(40)  NOT NULL,

    -- Qué pidió. Lo único que la ficha necesita decir para que quien la lee sepa
    -- a qué pantalla ir.
    interes          VARCHAR(30)  NOT NULL,

    -- El resto del formulario, en texto armado por el servidor: "Programa DJ ·
    -- presencial · sin experiencia previa". Ver la cabecera.
    detalle          TEXT,

    -- Lo que la persona escribió con sus palabras. Separado de `detalle` porque
    -- una cosa la eligió de una lista y la otra la escribió: al llamarla, lo que
    -- sirve es lo segundo.
    mensaje          TEXT,

    estado           VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',

    -- La resolución: quién contestó, cuándo, y en qué terminó.
    id_usuario_resuelve BIGINT    REFERENCES usuario (id_usuario),

    -- La cuenta en la que terminó esta ficha. Es una sola columna para los dos
    -- caminos de la conversión —cuenta nueva, o la cuenta que esa persona ya
    -- tenía— porque para el buzón son el mismo hecho: la ficha ya está adentro del
    -- sistema y hay a quién cargarle el curso.
    id_usuario       BIGINT       REFERENCES usuario (id_usuario),

    respuesta        TEXT,
    fecha_resolucion TIMESTAMPTZ,

    -- DB-08: en una tabla nueva el sello de creación se llama así.
    fecha_creacion   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT solicitante_estado_valido
        CHECK (estado IN ('PENDIENTE', 'CONVERTIDO', 'DESCARTADO')),

    -- Un CHECK y no una tabla de catálogo, al revés que `sala_tipo_uso` y que
    -- `tipo_uso.solicitable_por_usuario`. La diferencia: aquellas son reglas que
    -- el negocio mueve —qué se puede hacer en qué sala—, y esto es **la lista de
    -- formularios que tiene la landing**. Un valor nuevo acá significa un
    -- formulario nuevo, o sea código de la landing y una pantalla: la migración es
    -- lo barato de ese cambio, no lo caro.
    --
    -- Dos de los cinco coinciden con `tipo_uso.codigo` a propósito, para que la
    -- ficha se lea igual que el calendario. **No es un FK**: los otros tres no son
    -- usos de una sala.
    CONSTRAINT solicitante_interes_valido
        CHECK (interes IN ('CURSO', 'ALQUILER_CABINA', 'GRABACION_SET', 'EQUIPOS', 'OTRO')),

    -- Misma trazabilidad que exige `solicitud_reserva` desde `V13`, y que `V7`
    -- impuso sobre la plata: lo que deja de estar pendiente dice quién y cuándo.
    CONSTRAINT solicitante_resolucion_completa
        CHECK (estado = 'PENDIENTE'
               OR (id_usuario_resuelve IS NOT NULL AND fecha_resolucion IS NOT NULL)),

    -- Misma forma que `solicitud_reserva_aprobada_tiene_reserva`, y por el mismo
    -- motivo de los dos lados: una ficha CONVERTIDA sin cuenta miente —dice que la
    -- persona entró al sistema y no hay dónde cargarle nada—, y una cuenta colgando
    -- de una ficha que nadie convirtió no tiene autorización que la explique.
    CONSTRAINT solicitante_convertido_tiene_cuenta
        CHECK ((estado = 'CONVERTIDO' AND id_usuario IS NOT NULL)
               OR (estado <> 'CONVERTIDO' AND id_usuario IS NULL)),

    -- Un descarte dice por qué. Acá el motivo NO viaja a ninguna persona —el
    -- solicitante no tiene cuenta, así que no hay bandeja donde dejárselo—: es para
    -- el que abre el buzón la semana que viene y ve una ficha cerrada. Sin el
    -- motivo, "spam" y "llamé tres veces y no atiende" se ven exactamente igual, y
    -- son decisiones opuestas.
    --
    -- `coalesce(btrim(x), '')` y no `btrim(x) <> ''`: la lección de `V7`, un CHECK
    -- que evalúa a NULL no rechaza nada, y con la segunda forma un motivo NULL
    -- pasaba.
    CONSTRAINT solicitante_descarte_explicado
        CHECK (estado <> 'DESCARTADO' OR coalesce(btrim(respuesta), '') <> '')
);

COMMENT ON TABLE solicitante IS
    'Hallazgo #7 (mejoras.md 9.4): lo que llega de los formularios de la landing. Es una ficha con ciclo de vida y no una notificacion, porque lo que tiene que garantizar es que quede la lista de a quien no se contesto. La cuenta la crea administracion al convertirla.';

COMMENT ON COLUMN solicitante.interes IS
    'A que formulario de la landing corresponde. CURSO y EQUIPOS no son usos de sala; ALQUILER_CABINA y GRABACION_SET coinciden con tipo_uso.codigo a proposito, pero no hay FK.';

COMMENT ON COLUMN solicitante.id_usuario IS
    'La cuenta en la que termino la ficha: la nueva, o la que la persona ya tenia. Para el buzon los dos caminos son el mismo hecho.';

-- El buzón abre siempre por lo pendiente, y a los seis meses eso es una fracción
-- chica de la tabla. Lo más viejo primero: lo que apura una ficha es cuánto hace
-- que nadie la contesta — al revés que `solicitud_reserva`, que ordena por la
-- fecha pedida porque lo que la apura es que la franja se acerca.
CREATE INDEX solicitante_pendientes
    ON solicitante (fecha_creacion) WHERE estado = 'PENDIENTE';

-- Para saber si esta persona ya escribió antes, que es la primera pregunta de
-- quien atiende una ficha repetida. `lower()` porque el email lo escribe una
-- persona en un teléfono, igual que `usuario_email_unico`. **No es único**: la
-- misma persona puede pedir la cabina en marzo y anotarse a un curso en agosto, y
-- son dos fichas.
CREATE INDEX solicitante_por_email ON solicitante (lower(email));


-- =============================================================================
-- 2. UNA FICHA RESUELTA ES FINAL
-- =============================================================================
--
-- Se reusa la función de `V13` §4 **sin tocarla**: mira `OLD.estado <> 'PENDIENTE'`
-- y nada más, así que ya servía para cualquier tabla con esa forma. Es el mismo
-- criterio con el que `V19` reusó `exigir_autor_de_la_edicion()` de `V7`.
--
-- El esquive que cierra es el mismo de allá, con otra cosa al final: convertir
-- —lo que crea una cuenta con su contraseña temporal—, volver la ficha a
-- PENDIENTE y convertirla otra vez. Dos cuentas para la misma persona, la segunda
-- sin nada que la explique, y el buzón apuntando a una sola.

CREATE TRIGGER solicitante_resuelto_es_final
    BEFORE UPDATE ON solicitante
    FOR EACH ROW EXECUTE FUNCTION solicitud_resuelta_es_final();


-- =============================================================================
-- 3. UNA FICHA NO SE BORRA
-- =============================================================================
--
-- La función de `V6` §7, ampliada por `V7`, `V9` y `V13`, ampliada otra vez. **La
-- enumeración es la mitad útil del mensaje** —lo aprendió `V18` cuando quiso
-- generalizarla y dos suites lo corrigieron—: quien choca con este error necesita
-- saber cómo se retira *esa* tabla, y para esta es DESCARTADO.
--
-- El contraargumento existe y se anota, porque este es el único caso del proyecto
-- donde una tabla la escribe un endpoint público: **esto va a juntar spam de
-- bots**, y sin borrado el spam se acumula para siempre. Se acepta igual por dos
-- razones. El buzón filtra por estado, así que el spam descartado no molesta a
-- nadie; y del otro lado, borrar deja a un lead real perdido sin ninguna forma de
-- saber que existió, que es el error caro de los dos. Si algún día el volumen
-- molesta, lo que corresponde es una limpieza decidida y fechada, no una puerta
-- abierta.

CREATE OR REPLACE FUNCTION prohibir_borrado_historico()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'No se borran filas de %. Es historial de un negocio real: hay que '
        'anular la fila con su estado correspondiente (pago -> ANULADO, '
        'trabajo_mastering -> CANCELADO, reserva -> CANCELADA, '
        'reserva_participante -> CANCELADA, egreso -> anulado = TRUE, '
        'venta_equipo -> anulada = TRUE, solicitud_reserva -> CANCELADA, '
        'solicitante -> DESCARTADO).',
        TG_TABLE_NAME;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER solicitante_no_se_borra
    BEFORE DELETE ON solicitante
    FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_historico();
