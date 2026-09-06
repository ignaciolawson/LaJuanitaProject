-- =============================================================================
-- V25 — Un egreso puede tener varios comprobantes
--
-- Tercer barrido de correcciones (`docs/mejoras.md` §14 · C1). Ignacio, usando el
-- sistema: *"en los egresos, slot para adjuntar comprobante de pago hacia esa
-- persona"*, y después la regla entera en una frase — *"todo lo que sea pagos o
-- cobros con slot de comprobante"*.
--
-- Dicho así no son dos features sino una: **toda plata que se mueve tiene dónde
-- adjuntar su papel.** Y el sistema ya tenía media regla cumplida:
--
--     plata que ENTRA  -> `pago`   -> `comprobante_pago`, desde `V21`. Hecho.
--     plata que SALE   -> `egreso` -> ESTO.
--
--
-- LO QUE HABÍA, QUE ERA PEOR QUE NO TENER NADA
--
-- `egreso.comprobante_path VARCHAR(500)` existe desde `V1`. **Es exactamente la
-- columna que `V21` le sacó a `pago`, y por el mismo motivo: era texto que
-- alguien tipeaba.** No hay ninguna subida de archivos en el módulo de egresos,
-- así que lo que haya ahí es una nota, un link o la ruta de la máquina de
-- alguien. La pantalla mostraba respaldo donde no había ninguno.
--
-- Es más grave del lado del egreso que del lado del pago. Un cobro sin
-- comprobante lo reclama el que pagó; **una salida de plata sin comprobante no la
-- reclama nadie** — el que la cobró está contento y el que la firmó es el mismo
-- que la cargó. El papel del egreso es la única prueba de que ese sueldo se pagó.
--
--
-- LO QUE ESTA MIGRACIÓN NO INVENTA
--
-- Nada. Es `V21` aplicada a la otra tabla, y esa simetría es el punto: si las dos
-- se separan, adjuntar un comprobante significa una cosa en Pagos y otra en
-- Egresos. El mapa, para no releer las dos:
--
--     `V21` §1  (la tabla, con la firma de la invalidación)  ~  §1 de acá
--     `V21` §2  (prohibir_borrado_historico)                 ~  §2 de acá
--     `V21` §3  (inmutable, y la marca tampoco se deshace)   ~  §3 de acá
--     `V21` §4  (la columna vieja se va, sin migrar valores) ~  §4 de acá
--
-- ⚠️ La mitad que es fácil no escribir es §3, y `V21` la aprendió de `V18` §1b:
-- **desde adentro de "no se borra, se marca" no se ve que la marca tampoco se
-- borra.** Sin ese trigger la tabla no compra nada — pisar `archivo_path` es la
-- columna de siempre con más pasos, y poner `invalido` en FALSE deshace un acto
-- firmado sin dejar rastro.
--
--
-- POR QUÉ EL EGRESO TIENE TABLA PROPIA Y LA VENTA NO
--
-- Porque la venta no mueve plata: la mueve **su pago**, y ése ya tiene sus
-- comprobantes desde `V21`. La pantalla de ventas adjunta contra el pago de la
-- venta (§14 · B2) y no necesitó ni una línea de SQL. El egreso sí es un
-- movimiento por sí mismo — no hay ningún `pago` detrás de un sueldo — así que
-- es el único que faltaba.
-- =============================================================================


-- =============================================================================
-- 1. LA TABLA
--
-- Espejo de `comprobante_pago`. `id_usuario_carga` es NOT NULL por lo mismo:
-- cargar un egreso es `@PuedeOperar`, siempre hay alguien con nombre del otro
-- lado, y una prueba de pago sin saber quién la adjuntó vale la mitad.
-- =============================================================================

CREATE TABLE comprobante_egreso (
    id_comprobante      BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    id_egreso           BIGINT       NOT NULL REFERENCES egreso (id_egreso),

    -- La clave que devuelve `Almacenamiento.guardar`. Opaca: quien la guarda no
    -- la interpreta ni la construye.
    archivo_path        VARCHAR(500) NOT NULL,

    -- El nombre con el que llegó. NO se usa para guardar —esa clave la elige el
    -- sistema— sino para que la descarga llegue llamándose como se espera.
    nombre_original     VARCHAR(255) NOT NULL,

    id_usuario_carga    BIGINT       NOT NULL REFERENCES usuario (id_usuario),

    -- DB-08: en una tabla nueva el sello de creación se llama así.
    fecha_creacion      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- La reversa: no se borra, se marca, y marcarlo exige autor, fecha y motivo.
    invalido            BOOLEAN      NOT NULL DEFAULT FALSE,
    id_usuario_invalida BIGINT       REFERENCES usuario (id_usuario),
    fecha_invalidacion  TIMESTAMPTZ,
    motivo_invalidacion TEXT,

    -- El `coalesce` no es adorno: sin él un motivo en NULL hace que
    -- `btrim(NULL) <> ''` dé NULL, la condición entera dé NULL, y **un CHECK que
    -- evalúa a NULL no rechaza nada**. Es la trampa que documentó `V7`.
    CONSTRAINT comprobante_egreso_invalidacion_justificada
        CHECK (NOT invalido
               OR (id_usuario_invalida IS NOT NULL
                   AND fecha_invalidacion IS NOT NULL
                   AND coalesce(btrim(motivo_invalidacion), '') <> '')),

    CONSTRAINT comprobante_egreso_archivo_no_vacio
        CHECK (btrim(archivo_path) <> '' AND btrim(nombre_original) <> ''),

    -- Dos filas apuntando al mismo archivo sería poder marcar una inválida
    -- mientras la otra sigue mostrando el mismo PDF como válido. Hoy no puede
    -- pasar —cada subida genera su propio UUID— y por eso la restricción es
    -- gratis: lo único que puede violarla es un error futuro.
    CONSTRAINT comprobante_egreso_archivo_unico UNIQUE (archivo_path)
);

-- Se lee siempre por egreso, y siempre en orden de carga.
CREATE INDEX comprobante_egreso_por_egreso
    ON comprobante_egreso (id_egreso, id_comprobante);


-- =============================================================================
-- 2. UN COMPROBANTE DE EGRESO NO SE BORRA
--
-- La función de `V6` §7, ampliada por `V7`, `V9`, `V13`, `V18`, `V20` y `V21`,
-- ampliada otra vez.
--
-- ⚠️ **La enumeración es la mitad útil del mensaje.** `V18` intentó
-- generalizarla y dos suites lo corrigieron: quien choca con este error necesita
-- saber cómo se retira *esa* tabla, y para ésta es marcarla inválida.
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
        'solicitante -> DESCARTADO, comprobante_pago -> invalido = TRUE, '
        'comprobante_egreso -> invalido = TRUE).',
        TG_TABLE_NAME;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER comprobante_egreso_no_se_borra
    BEFORE DELETE ON comprobante_egreso
    FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_historico();


-- =============================================================================
-- 3. UN COMPROBANTE ADJUNTO NO CAMBIA, Y UNA INVALIDACIÓN NO SE DESHACE
--
-- **Ésta es la mitad que hace que la tabla valga algo**, y es la que no se ve
-- desde adentro del problema. Sin ella:
--
--   · un UPDATE de `archivo_path` es la columna pisada de siempre con más pasos;
--   · un UPDATE de `invalido` a FALSE deja sin efecto la firma, y el egreso
--     vuelve a mostrar como bueno un comprobante que alguien rechazó, sin rastro.
--
-- Lo único que un UPDATE puede hacer acá es marcar inválido un comprobante que no
-- lo estaba, con su firma. Corregir un motivo mal escrito no está previsto a
-- propósito: la firma es el dato, y editarla la vacía.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_inmutabilidad_del_comprobante_de_egreso()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_egreso          IS DISTINCT FROM OLD.id_egreso
       OR NEW.archivo_path    IS DISTINCT FROM OLD.archivo_path
       OR NEW.nombre_original IS DISTINCT FROM OLD.nombre_original
       OR NEW.id_usuario_carga IS DISTINCT FROM OLD.id_usuario_carga
       OR NEW.fecha_creacion  IS DISTINCT FROM OLD.fecha_creacion THEN
        RAISE EXCEPTION
            'Un comprobante adjunto no se cambia. Si no corresponde, marcalo '
            'invalido con su motivo y adjunta el correcto: el egreso admite varios.';
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

CREATE TRIGGER comprobante_egreso_es_inmutable
    BEFORE UPDATE ON comprobante_egreso
    FOR EACH ROW EXECUTE FUNCTION verificar_inmutabilidad_del_comprobante_de_egreso();


-- =============================================================================
-- 4. `egreso` PIERDE `comprobante_path`
--
-- Se va, no se deja al lado. Dos columnas que contestan la misma pregunta —¿este
-- egreso tiene comprobante?— son dos lugares donde mirar y uno que se va a quedar
-- viejo: es la deuda que este proyecto ya paga dos veces y tiene anotada
-- (`contarClasesConsumidas` vs `V9` §5, `ContratoRepository` vs
-- `release_tiene_contrato`).
--
-- LOS VALORES NO SE MIGRAN, por lo mismo que en `V21` §4: era texto libre
-- tipeado, nunca una clave de `Almacenamiento`. Copiarlos crearía filas que dicen
-- "hay un archivo adjunto" apuntando a archivos que el sistema no tiene — el
-- modo de falla que el ensayo de restore del 2026-08-20 probó desde el otro lado:
-- la base sana, el archivo ausente, y nadie se entera hasta que alguien lo pide.
--
-- El NOTICE es para que quien corra la migración vea qué se descartó en vez de
-- que desaparezca en silencio. En una base recién creada no imprime nada.
-- =============================================================================

DO $$
DECLARE
    cuantos INTEGER;
BEGIN
    SELECT count(*) INTO cuantos FROM egreso WHERE comprobante_path IS NOT NULL;

    IF cuantos > 0 THEN
        RAISE NOTICE
            'V25: se descartan % valores de egreso.comprobante_path (texto escrito '
            'a mano, sin archivo detras). Los egresos afectados son: %',
            cuantos,
            (SELECT string_agg(id_egreso::text, ', ' ORDER BY id_egreso)
               FROM egreso WHERE comprobante_path IS NOT NULL);
    END IF;
END $$;

ALTER TABLE egreso DROP COLUMN comprobante_path;
