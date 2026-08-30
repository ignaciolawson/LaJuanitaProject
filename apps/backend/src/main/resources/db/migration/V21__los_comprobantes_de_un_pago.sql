-- =============================================================================
-- V21 — Un pago puede tener varios comprobantes
--
-- Primera migración de la deuda más vieja del Módulo 3: la descarga de
-- comprobantes, abierta desde agosto (`docs/pendientes.md` §3.3). Dejó de estar
-- bloqueada el 2026-08-20, cuando el Módulo 7 construyó el `StorageService` que
-- §2.4 declaraba desde el principio y tres módulos habían esquivado.
--
--
-- POR QUÉ UNA TABLA Y NO LA COLUMNA QUE YA EXISTÍA
--
-- `V1` modeló el comprobante como una columna de `pago` —`comprobante_path`— y
-- `V7` le agregó su mecanismo de reversa: no se borra, se marca inválido, y
-- marcarlo exige autor, fecha y motivo, porque **es una decisión sobre la prueba
-- de que alguien pagó**. Las dos cosas están bien y ninguna se toca acá.
--
-- Lo que no cierra es lo que pasa DESPUÉS de marcarlo. Con una sola columna, el
-- comprobante correcto no tiene dónde ir: hay que pisar el que está. Y pisarlo
-- borra la firma de `V7` —quién dijo que el anterior no servía y por qué—, o sea
-- que el mecanismo que existe para dejar rastro se convierte en el que lo borra.
-- Mientras el comprobante fue texto escrito a mano eso no se notaba; con un
-- archivo real, el camino más común de la pantalla es justamente ése: se adjunta
-- el archivo equivocado y hay que adjuntar el que va.
--
-- Con una fila por comprobante, el equivocado queda listado como inválido con su
-- firma y el correcto se suma al lado. Es el mismo criterio con el que en este
-- esquema no se borra ni un pago, ni una clase, ni un contrato que respalda algo
-- publicado: **lo que alguien firmó no lo pisa la operación siguiente.**
--
-- Decidido con Ignacio el 2026-08-30, antes de escribir código, que es la
-- disciplina que el grupo C de `docs/mejoras.md` §4 pide y que ya funcionó cuatro
-- veces (P22, P23, P38, P9).
--
--
-- LO QUE ESTA MIGRACIÓN NO INVENTA
--
-- Casi todo lo de abajo ya tiene forma en el esquema. El mapa, para no aprender
-- dos veces lo mismo:
--
--     `V7` §1b (comprobante inválido con firma)  ~  §1 de acá, por fila
--     `V6` §7  (prohibir_borrado_historico)      ~  §2 de acá
--     `V18` §1b (no se deshace lo que se firmó)  ~  §3 de acá
--     `contrato_sello.archivo_path`              ~  la columna de §1
--
--
-- LO QUE SE PIERDE, DICHO EN VOZ ALTA
--
-- Los valores que hoy tenga `pago.comprobante_path` NO se migran, y §4 explica
-- por qué con el detalle. El resumen: hasta hoy ese campo era texto libre que
-- alguien tipeaba —no había subida de archivos en el Módulo 3—, así que ninguno
-- de esos valores es la clave de un archivo guardado por el sistema. Meterlos en
-- una tabla que significa "hay un archivo adjunto" sería fabricar respaldo que no
-- existe, que es exactamente el modo de falla contra el que `AlmacenamientoEnDisco`
-- eligió su orden de escritura: una fila que apunta a un archivo ausente hace que
-- el sistema dé por cumplida su propia regla sobre algo que no está.
-- =============================================================================


-- =============================================================================
-- 1. LA TABLA
--
-- Una fila por archivo adjunto. `id_usuario_carga` es NOT NULL porque subir un
-- comprobante es `@PuedeOperar`: siempre hay alguien con nombre del otro lado, y
-- una prueba de pago sin saber quién la adjuntó vale la mitad.
-- =============================================================================

CREATE TABLE comprobante_pago (
    id_comprobante      BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_pago             BIGINT       NOT NULL REFERENCES pago (id_pago),

    -- La clave que devuelve `Almacenamiento.guardar`. Es opaca: quien la guarda
    -- no la interpreta ni la construye. Mismo tipo y mismo largo que
    -- `contrato_sello.archivo_path`, que es el otro archivo del sistema.
    archivo_path        VARCHAR(500) NOT NULL,

    -- El nombre con el que llegó. NO se usa para guardar —la clave de arriba la
    -- elige el sistema, ver `AlmacenamientoEnDisco`— sino para que la descarga
    -- llegue llamándose como la persona espera. Acá sí sirve.
    nombre_original     VARCHAR(255) NOT NULL,

    id_usuario_carga    BIGINT       NOT NULL REFERENCES usuario (id_usuario),

    -- DB-08: en una tabla nueva el sello de creación se llama así.
    fecha_creacion      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- La reversa de `V7` §1b, ahora por comprobante y no por pago. Un comprobante
    -- no se borra: se marca, con las mismas tres exigencias.
    invalido            BOOLEAN      NOT NULL DEFAULT FALSE,
    id_usuario_invalida BIGINT       REFERENCES usuario (id_usuario),
    fecha_invalidacion  TIMESTAMPTZ,
    motivo_invalidacion TEXT,

    -- El `coalesce` no es adorno: sin él, un motivo en NULL hace que
    -- `btrim(NULL) <> ''` dé NULL, la condición entera dé NULL, y un CHECK que
    -- evalúa a NULL no rechaza nada. Es la trampa que `V7` documentó y que
    -- `trabajo_liberacion_justificada` todavía tiene sin corregir.
    CONSTRAINT comprobante_invalidacion_justificada
        CHECK (NOT invalido
               OR (id_usuario_invalida IS NOT NULL
                   AND fecha_invalidacion IS NOT NULL
                   AND coalesce(btrim(motivo_invalidacion), '') <> '')),

    CONSTRAINT comprobante_archivo_no_vacio
        CHECK (btrim(archivo_path) <> '' AND btrim(nombre_original) <> ''),

    -- Dos filas apuntando al mismo archivo sería poder marcar una inválida
    -- mientras la otra sigue mostrando el mismo PDF como válido. Hoy no puede
    -- pasar —cada subida genera su propio UUID— y por eso mismo la restricción es
    -- gratis: lo único que puede violarla es un error futuro.
    CONSTRAINT comprobante_archivo_unico UNIQUE (archivo_path)
);

-- Se lee siempre por pago, y siempre en orden de carga.
CREATE INDEX comprobante_por_pago ON comprobante_pago (id_pago, id_comprobante);


-- =============================================================================
-- 2. UN COMPROBANTE NO SE BORRA
--
-- La regla dura de §6 —*"los comprobantes no se eliminan: se marcan como
-- inválidos"*—, que hasta hoy vivía como un CHECK sobre `pago` y no impedía el
-- borrado de nada, porque no había fila que borrar.
--
-- La función de `V6` §7, ampliada por `V7`, `V9`, `V13`, `V18` y `V20`, ampliada
-- otra vez. **La enumeración es la mitad útil del mensaje** —lo aprendió `V18`
-- cuando quiso generalizarla y dos suites lo corrigieron—: quien choca con este
-- error necesita saber cómo se retira *esa* tabla, y para ésta es marcarla
-- inválida.
-- =============================================================================

CREATE OR REPLACE FUNCTION prohibir_borrado_historico()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'No se borran filas de %. Es historial de un negocio real: hay que '
        'anular la fila con su estado correspondiente (pago -> ANULADO, '
        'trabajo_mastering -> CANCELADO, reserva -> CANCELADA, '
        'reserva_participante -> CANCELADA, egreso -> anulado = TRUE, '
        'venta_equipo -> anulada = TRUE, solicitud_reserva -> CANCELADA, '
        'solicitante -> DESCARTADO, comprobante_pago -> invalido = TRUE).',
        TG_TABLE_NAME;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER comprobante_no_se_borra
    BEFORE DELETE ON comprobante_pago
    FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_historico();


-- =============================================================================
-- 3. UN COMPROBANTE ADJUNTO NO CAMBIA, Y UNA INVALIDACIÓN NO SE DESHACE
--
-- Sin esto, la tabla no compra nada: un UPDATE de `archivo_path` es la columna
-- pisada de siempre con más pasos, y un UPDATE de `invalido` a FALSE deja sin
-- efecto la firma que `V7` exige para marcarlo — el pago vuelve a mostrar como
-- bueno un comprobante que alguien rechazó, sin que quede rastro de la vuelta
-- atrás.
--
-- Es la forma exacta de `V18` §1b: allá, CANCELADO fuera de la escalera se podía
-- deshacer porque nadie escribió la otra mitad de la frase. Desde adentro de "no
-- se borra, se marca" tampoco se ve lo que falta — que la marca tampoco se borre.
--
-- Lo único que un UPDATE puede hacer acá es marcar inválido un comprobante que no
-- lo estaba, con su firma. Corregir un motivo mal escrito no está previsto a
-- propósito: la firma es el dato, y editarla la vacía.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_inmutabilidad_del_comprobante()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_pago            IS DISTINCT FROM OLD.id_pago
       OR NEW.archivo_path    IS DISTINCT FROM OLD.archivo_path
       OR NEW.nombre_original IS DISTINCT FROM OLD.nombre_original
       OR NEW.id_usuario_carga IS DISTINCT FROM OLD.id_usuario_carga
       OR NEW.fecha_creacion  IS DISTINCT FROM OLD.fecha_creacion THEN
        RAISE EXCEPTION
            'Un comprobante adjunto no se cambia. Si no corresponde, marcalo '
            'invalido con su motivo y adjunta el correcto: el pago admite varios.';
    END IF;

    IF OLD.invalido AND NOT NEW.invalido THEN
        RAISE EXCEPTION
            'Un comprobante marcado invalido no vuelve atras. Quien lo marco '
            'firmo esa decision; si el comprobante era bueno, adjunta el archivo '
            'de nuevo y queda otra fila con su fecha.';
    END IF;

    IF OLD.invalido AND NEW.invalido
       AND (NEW.id_usuario_invalida IS DISTINCT FROM OLD.id_usuario_invalida
            OR NEW.fecha_invalidacion  IS DISTINCT FROM OLD.fecha_invalidacion
            OR NEW.motivo_invalidacion IS DISTINCT FROM OLD.motivo_invalidacion) THEN
        RAISE EXCEPTION
            'La firma de una invalidacion no se reescribe: es el dato, no un '
            'campo del formulario.';
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER comprobante_es_inmutable
    BEFORE UPDATE ON comprobante_pago
    FOR EACH ROW EXECUTE FUNCTION verificar_inmutabilidad_del_comprobante();


-- =============================================================================
-- 4. `pago` PIERDE SUS CINCO COLUMNAS DE COMPROBANTE
--
-- Se van, no se dejan al lado. Dos columnas que contestan la misma pregunta —
-- ¿este pago tiene comprobante?— son dos lugares donde mirar y uno que se va a
-- quedar viejo: es la deuda que este proyecto ya paga dos veces y tiene anotada
-- (`contarClasesConsumidas` vs `V9` §5, `ContratoRepository` vs
-- `release_tiene_contrato`). No se agrega una tercera de arranque.
--
-- LOS VALORES NO SE MIGRAN, y conviene que esté escrito acá y no en un commit.
-- `comprobante_path` era **texto libre que alguien tipeaba**: hasta hoy el Módulo
-- 3 no tenía subida de archivos —ésa es justamente la deuda que esta migración
-- salda— así que lo que haya ahí es una nota, una ruta de la máquina de alguien o
-- un link, nunca una clave de `Almacenamiento`. Copiarlos a `comprobante_pago`
-- crearía filas que dicen "hay un archivo adjunto" apuntando a archivos que el
-- sistema no tiene: el mismo modo de falla que el ensayo de restore del
-- 2026-08-20 probó desde el otro lado —la base sana, el archivo ausente, y nadie
-- se entera hasta que alguien lo pide.
--
-- El NOTICE es para que quien corra la migración vea qué se descartó en lugar de
-- que desaparezca en silencio. En una base recién creada no imprime nada; en la
-- de desarrollo dice cuántas filas tenían algo escrito.
-- =============================================================================

DO $$
DECLARE
    cuantos INTEGER;
BEGIN
    SELECT count(*) INTO cuantos FROM pago WHERE comprobante_path IS NOT NULL;

    IF cuantos > 0 THEN
        RAISE NOTICE
            'V21: se descartan % valores de pago.comprobante_path (texto escrito '
            'a mano, sin archivo detras). Los pagos afectados son: %',
            cuantos,
            (SELECT string_agg(id_pago::text, ', ' ORDER BY id_pago)
               FROM pago WHERE comprobante_path IS NOT NULL);
    END IF;
END $$;

-- El CHECK de `V7` §1b se va con las columnas que vigilaba. No es una regla que
-- se retira: es la misma regla, ahora en `comprobante_invalidacion_justificada`,
-- una vez por comprobante en vez de una vez por pago.
ALTER TABLE pago DROP CONSTRAINT pago_comprobante_invalido_justificado;

ALTER TABLE pago
    DROP COLUMN comprobante_path,
    DROP COLUMN comprobante_invalido,
    DROP COLUMN id_usuario_invalida,
    DROP COLUMN fecha_invalidacion,
    DROP COLUMN motivo_invalidacion;
