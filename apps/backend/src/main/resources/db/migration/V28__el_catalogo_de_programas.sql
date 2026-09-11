-- =============================================================================
-- V28 — El catálogo de programas: qué se vende, a cuánto, y cuántas clases trae
--
-- Fase 3 de la cuarta barrida (`docs/mejoras.md` §16 · C1), decidida en
-- `docs/requirements/platform.md` §22 · P63 — que **cierra P13**, la pregunta
-- abierta más vieja del proyecto (*"¿hay lista de precios?"*, un mes sin
-- respuesta) — junto con P65 (la mentoría no tiene estándar) y P59 (los
-- programas se señan, que es lo que la vuelve urgente: para señar el 50% hay
-- que saber el 100%).
--
--
-- QUÉ HABÍA, Y POR QUÉ NO ALCANZABA
--
-- El precio de un curso no existía en ninguna capa del sistema. `inscripcion`
-- tiene `precio_total NOT NULL` desde `V1`, y quien lo llenaba era una persona
-- tipeándolo en cada alta: la lista de precios vivía en la cabeza de Mica y en
-- la landing, que lo publica como placeholder.
--
-- Y la cantidad de clases estándar —DJ 8, Producción 16, mentoría sin estándar
-- (P34)— vivía en DOS lugares: el enum `Disciplina` de Java (que decidía) y la
-- constante `CLASES_ESTANDAR` del front (que mostraba), con un comentario en cada
-- uno diciendo que la otra copia era la que valía. Es la deuda anotada en
-- `pendientes.md` §3.4, pagada acá porque se toca lo mismo.
--
--
-- LO QUE ESTA MIGRACIÓN DECIDE
--
-- 1. **Una tabla `programa`, UNA FILA POR DISCIPLINA**, con precio, moneda,
--    cómo se cobra, cuántas clases trae y cuánto dura cada una. Se edita desde
--    una pantalla (Q9: *"intentemos que sea todo modificable"*): los precios en
--    pesos cambian, y una tabla que sólo edita un desarrollador es un
--    `properties` con extra pasos.
--
-- 2. **La inscripción sigue guardando SU precio.** `inscripcion.precio_total` no
--    cambia ni se vuelve FK: el catálogo dice cuánto sale hoy, la inscripción
--    dice cuánto se acordó ese día. Si el catálogo sube en marzo, la inscripción
--    de febrero no cambia — el mismo criterio por el que la historia de la plata
--    no se reescribe (`V19`, §14 · C3). Por eso NO hay FK de `inscripcion` a
--    `programa`: la unión es por `disciplina`, que las dos tablas tienen con el
--    mismo CHECK, y la inscripción no depende de que la fila del catálogo
--    exista para seguir siendo válida.
--
-- 3. **`cobro` dice cómo se vende: por PAQUETE o por SESION** (P63 ⏳). DJ se
--    vende como paquete de 8, y su precio es el del paquete. La mentoría no
--    tiene estándar (P65), así que *"precio del programa"* no significa nada:
--    se adopta **precio por sesión, total = sesiones × precio**. Si el negocio
--    la vende en paquetes cerrados, se agrega el paquete como fila — no se
--    cambia el modelo.
--
-- 4. **`precio` es NULLABLE, y el NULL significa "todavía no hay precio".** La
--    mentoría nace así (P63: *"precio a confirmar"*). La alternativa era un 0,
--    y 0 en este esquema ya quiere decir otra cosa: en `inscripcion`, una beca
--    (*"cero es válido: una beca es un precio, no una inscripción sin precio"*).
--    Un catálogo que dice $0 donde no se decidió nada es un catálogo que
--    miente; uno que dice "a confirmar" es el que se muestra.
--
-- 5. **Un PAQUETE exige cantidad de clases** (§2). Un precio de paquete sin
--    saber de cuántas clases es el paquete no es un precio. La inversa no se
--    exige: un programa por sesión puede tener un estándar (que sirve de
--    valor por defecto) o no tenerlo.
--
-- 6. **No se borra, se desactiva** (§3). No es historial —es catálogo, como
--    `sala`—, pero `inscripcion.disciplina` lo nombra y el alta lee de acá la
--    cantidad de clases: borrar la fila de DJ deja a la disciplina más vendida
--    sin cómo inscribirse. `activo = FALSE` la saca de la oferta y deja las
--    inscripciones existentes en paz, que es lo que `sala.activa` hace desde
--    `V9`.
--
--
-- LO QUE SE SIEMBRA, Y POR QUÉ ESOS NÚMEROS
--
-- P63: *"la tabla nace con lo que hoy dice la landing —que es placeholder— y
-- Mica los corrige desde la pantalla"*. ⚠️ **La landing publica precios POR
-- MES** (*"Desde $85.000/mes"*) y el catálogo guarda el precio del PAQUETE: son
-- 8 clases semanales (≈ 2 meses) y 16 (≈ 4 meses), así que los totales de acá
-- son 85.000 × 2 y 110.000 × 4. Es una derivación de un placeholder, y está
-- escrita para que nadie la tome por un dato: **son números a reemplazar desde
-- `/admin/programas`**, y ya estaban bloqueando publicar la landing por lo mismo
-- (`pendientes.md` §1).
-- =============================================================================


-- =============================================================================
-- 1. LA TABLA
-- =============================================================================

CREATE TABLE programa (
    id_programa       BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Una fila por disciplina. El CHECK es el mismo de `inscripcion`, y tiene
    -- que seguir siéndolo: es la unión entre las dos tablas.
    disciplina        VARCHAR(20)   NOT NULL,

    nombre            VARCHAR(100)  NOT NULL,
    descripcion       TEXT,

    -- NULL = todavía no hay precio (ver la cabecera, punto 4). Cero es un
    -- precio.
    precio            NUMERIC(14,2),
    moneda            VARCHAR(3)    NOT NULL DEFAULT 'ARS',

    -- PAQUETE: el precio es del curso entero. SESION: el precio es de cada
    -- sesión, y el total sale de sesiones × precio.
    cobro             VARCHAR(10)   NOT NULL,

    -- Cuántas clases trae de fábrica. NULL = sin estándar (la mentoría): quien
    -- inscribe dice cuántas son.
    clases_estandar   SMALLINT,

    -- Cuánto dura cada clase o sesión. Hoy todas son de 1:30 (§13).
    duracion_minutos  SMALLINT      NOT NULL DEFAULT 90,

    activo            BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_creacion    TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT programa_una_por_disciplina UNIQUE (disciplina),
    CONSTRAINT programa_disciplina_valida
        CHECK (disciplina IN ('DJ', 'PRODUCCION', 'MENTORIA')),
    CONSTRAINT programa_moneda_valida
        CHECK (moneda IN ('ARS', 'USD')),
    CONSTRAINT programa_cobro_valido
        CHECK (cobro IN ('PAQUETE', 'SESION')),
    CONSTRAINT programa_precio_no_negativo
        CHECK (precio IS NULL OR precio >= 0),
    CONSTRAINT programa_clases_positivas
        CHECK (clases_estandar IS NULL OR clases_estandar > 0),
    CONSTRAINT programa_duracion_positiva
        CHECK (duracion_minutos > 0)
);

COMMENT ON TABLE programa IS
    'Lo que se vende como curso: una fila por disciplina, con su precio de hoy. '
    'La inscripción copia el precio al inscribir y guarda el suyo (P63).';
COMMENT ON COLUMN programa.precio IS
    'NULL = todavía no hay precio (se muestra "a confirmar"). Cero es un precio.';
COMMENT ON COLUMN programa.cobro IS
    'PAQUETE: precio del curso entero. SESION: precio de cada sesión.';


-- =============================================================================
-- 2. UN PAQUETE SABE DE CUÁNTAS CLASES ES
-- =============================================================================
--
-- Un precio de paquete sin cantidad de clases no es un precio: no se puede
-- señar (¿el 50% de qué?) ni saber cuándo termina el curso. La inversa se deja
-- libre a propósito: un programa por sesión puede traer un estándar —que el
-- alta usa como valor por defecto— o no traerlo.

ALTER TABLE programa ADD CONSTRAINT programa_paquete_con_clases
    CHECK (cobro <> 'PAQUETE' OR clases_estandar IS NOT NULL);


-- =============================================================================
-- 3. NO SE BORRA: SE DESACTIVA
-- =============================================================================
--
-- Con función propia y no con `prohibir_borrado_historico()`: aquella dice
-- *"es historial de un negocio real"* y esto no lo es. El motivo acá es otro y
-- el mensaje lo tiene que decir: la disciplina sigue existiendo en las
-- inscripciones y el alta lee de esta fila.

CREATE OR REPLACE FUNCTION programa_no_se_borra()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'No se borra un programa: las inscripciones lo nombran por su disciplina '
        'y el alta lee de acá cuántas clases trae. Para sacarlo de la oferta, '
        'programa -> activo = FALSE.';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER programa_no_se_borra
    BEFORE DELETE ON programa
    FOR EACH ROW EXECUTE FUNCTION programa_no_se_borra();


-- =============================================================================
-- 4. LA SIEMBRA  (ver la cabecera: números a reemplazar desde la pantalla)
-- =============================================================================

INSERT INTO programa (disciplina, nombre, descripcion, precio, moneda, cobro,
                      clases_estandar, duracion_minutos)
VALUES
    ('DJ', 'Convertite en DJ',
     'El camino completo detrás de las bandejas: 8 clases de 1:30, una por semana.',
     170000.00, 'ARS', 'PAQUETE', 8, 90),
    ('PRODUCCION', 'Producción Musical Electrónica',
     'Diseño de sonido, arreglo y mezcla en DAW: 16 clases de 1:30, una por semana.',
     440000.00, 'ARS', 'PAQUETE', 16, 90),
    ('MENTORIA', 'Mentoría para DJs',
     'Sesiones uno a uno de 1:30 con un DJ de la casa. Se cobra por sesión.',
     NULL, 'ARS', 'SESION', NULL, 90);

DO $$
BEGIN
    RAISE NOTICE 'V28: catálogo sembrado con los precios PLACEHOLDER de la landing '
                 '(DJ 170.000 = 85.000/mes x 2, Producción 440.000 = 110.000/mes x 4, '
                 'mentoría sin precio). Corregirlos desde /admin/programas.';
END $$;
