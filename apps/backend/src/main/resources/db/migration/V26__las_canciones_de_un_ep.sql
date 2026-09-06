-- =============================================================================
-- V26 — Las canciones de un EP o de un álbum
--
-- Tercera barrida de correcciones (`docs/mejoras.md` §14 · C2). Ignacio, usando
-- el sistema: *"en los releases vi que hay opción de EP o Album y esta bueno,
-- pero podríamos hacer que si selecciona esa opción que puedas cargar las
-- canciones de ese álbum o ep según que tipo sea, ep entre 3 y 6 temas, álbum de
-- 8 a 15"*.
--
-- Las tres decisiones de negocio se tomaron ANTES de escribir una línea
-- (`docs/requirements/platform.md` §20 · P51, P52, P53). Es la sexta vez que ese
-- orden evita que un módulo se trabe a la mitad.
--
--     P51 — el rango se exige AL PUBLICAR, no al cargar cada tema.
--     P52 — sólo EP y ÁLBUM llevan lista de temas.
--     P53 — cada tema lleva duración, artista invitado e ISRC.
--
--
-- POR QUÉ EL RANGO VA AL PUBLICAR Y NO POR FILA
--
-- Un EP con 1 tema ya viola *"entre 3 y 6"*. Exigirlo en cada INSERT hace
-- imposible cargar el primero: nunca se llegaría a los 3. Es la misma forma que
-- ya tiene la regla dura del Módulo 7 —*no se publica un release sin contrato
-- adjunto*—: **la verificación vive en el momento de publicar.**
--
-- ⚠️ Y ACÁ VA LA TRAMPA QUE SE PREVIÓ ANTES DE ESCRIBIRLA. El trigger de `V18`
-- §2 dispara en CUALQUIER UPDATE de un release publicado, y ahí funciona porque
-- un release publicado sí tiene contrato. **Los releases ya publicados hoy tienen
-- cero temas**, así que un trigger con esa forma haría que editarle el nombre a
-- un lanzamiento viejo lo rechace para siempre. Por eso §3 mira la TRANSICIÓN
-- (`TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM NEW.estado`) y no el estado.
--
--
-- LAS TRES MITADES QUE HACEN QUE LAS COLUMNAS VALGAN ALGO
--
-- Es la lección que `V23` dejó escrita y que `V18` §1b había enseñado antes:
-- desde adentro de una regla no se ve por dónde se la esquiva. Acá son tres
-- puertas y las tres están cerradas:
--
--     §2  un tema no cuelga de un release que no sea EP ni ÁLBUM
--         ...y tampoco por el otro lado: un release CON temas no cambia de tipo
--     §3  el rango se verifica al publicar, y también si el tipo cambia
--     §4  no se saca un tema que sostiene el rango de un release ya publicado
--
-- Sin §4 la regla dura dura lo que tarda un DELETE: publicar un EP con 3 temas,
-- borrar 2, y queda un EP publicado con un tema. Es exactamente el ataque que
-- `V18` §3 cerró del lado del contrato y `V6` §6 del lado del premaster.
--
--
-- LO QUE ESTA MIGRACIÓN NO DECIDE
--
-- ⚠️ **No hay salida firmada tipo `publicado_sin_contrato`, y es deliberado.** Se
-- le ofreció a Ignacio la alternativa —el aviso que no frena— y eligió la regla
-- dura sabiendo el costo. La tensión es real: un EP de 2 temas existe en el
-- mundo. **Si aparece un caso legítimo se revisa en otra migración**, no se
-- inventa la excepción sobre la marcha — que es lo que `V15` tuvo que venir a
-- corregir del lado de las revisiones de M&M.
-- =============================================================================


-- =============================================================================
-- 1. LA TABLA
--
-- `orden` y `titulo` son lo mínimo; los otros tres los pidió P53 en una palabra
-- (*"todo"*), con la aclaración de que los que no se marcaran no iban y agregarlos
-- después era otra migración. **Ninguno de los tres es obligatorio**: el ISRC en
-- particular aparece DESPUÉS de la distribución, así que exigirlo al crear el
-- tema haría imposible armar el tracklist antes de mandarlo.
--
-- ⚠️ EL UNIQUE ES DEFERRABLE, Y ESO NO ES UN ADORNO. Reordenar una lista es
-- intercambiar dos posiciones, y con un unique inmediato el primer UPDATE del
-- intercambio choca contra el segundo tema antes de que exista el estado final.
-- Queda `INITIALLY DEFERRED` porque **el orden lo asigna siempre el servidor**
-- (max + 1 al agregar, renumerado al mover): un duplicado sólo puede venir de un
-- bug nuestro, nunca de algo que alguien tipeó, así que que el rechazo llegue al
-- COMMIT no le cuesta nada a nadie. Es el reparto contrario al de `V18` §2, donde
-- el trigger es inmediato justamente porque lo que rechaza lo escribió una
-- persona y tiene que leer por qué.
--
-- El ISRC lleva CHECK de forma y acepta las dos escrituras (con y sin guiones).
-- Es el código que leen las distribuidoras: un ISRC que no es un ISRC se publica
-- como si lo fuera. La salida existe y es dejarlo en blanco, que P53 permite
-- expresamente — o sea que la regla no encierra a nadie.
-- =============================================================================

CREATE TABLE cancion_release (
    id_cancion        BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_release        BIGINT       NOT NULL REFERENCES release (id_release),
    orden             SMALLINT     NOT NULL,
    titulo            VARCHAR(200) NOT NULL,

    -- En segundos. La pantalla escribe y lee "mm:ss"; guardar el texto haría que
    -- sumar la duración de un álbum fuera parsear once cadenas.
    duracion_segundos INTEGER,

    -- Texto libre: el release ya tiene su artista, esto es para el tema que suma
    -- a alguien más. No es una FK a `artista` — un feat. puede ser cualquiera y
    -- casi nunca está firmado por el sello.
    artista_invitado  VARCHAR(200),

    isrc              VARCHAR(20),

    fecha_creacion    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT cancion_orden_positivo CHECK (orden >= 1),

    CONSTRAINT cancion_titulo_no_vacio
        CHECK (coalesce(btrim(titulo), '') <> ''),

    CONSTRAINT cancion_duracion_positiva
        CHECK (duracion_segundos IS NULL OR duracion_segundos > 0),

    CONSTRAINT cancion_isrc_valido
        CHECK (isrc IS NULL
               OR upper(replace(replace(isrc, '-', ''), ' ', ''))
                  ~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$'),

    CONSTRAINT cancion_orden_unico UNIQUE (id_release, orden)
        DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE cancion_release IS
    'Los temas de un EP o de un album (P51-P53). El rango -- EP 3 a 6, album 8 a '
    '15 -- se verifica AL PUBLICAR y no por fila: un EP con un tema ya viola el '
    'rango, asi que exigirlo por fila haria imposible cargar el primero.';

COMMENT ON COLUMN cancion_release.isrc IS
    'International Standard Recording Code. Se acepta con o sin guiones. NO es '
    'unico a proposito: la misma grabacion sale como single y como tema de un '
    'album con el mismo ISRC, que es justamente para lo que sirve.';

-- Los temas de un release, ya en el orden en que se muestran.
CREATE INDEX cancion_por_release ON cancion_release (id_release, orden);


-- =============================================================================
-- 2. SÓLO EP Y ÁLBUM LLEVAN TEMAS  (P52)
--
-- *"Un single es el release mismo"*: su nombre ya es el nombre del tema, y
-- cargarlo de nuevo es escribir lo mismo dos veces. Un remix, lo mismo.
--
-- ⚠️ **`tipo_release` es NULLABLE** (`V1`, `release_tipo_valido` acepta NULL) y
-- P52 pidió decidirlo explícito en vez de que saliera por descarte. **Un release
-- sin tipo tampoco lleva temas**: la lista existe porque el tipo dice cuántos
-- van, así que colgar un tema de un release del que no se sabe qué es produce una
-- fila que nadie puede explicar después. El mensaje dice qué hacer — elegir el
-- tipo primero.
--
-- ⚠️ Y LA OTRA MITAD, que es la que no se ve desde adentro de la primera: sin el
-- segundo trigger, la regla se esquiva **editando el release**. Se carga el tema
-- con el release en EP, se cambia el tipo a SINGLE, y queda un single con seis
-- temas — las dos filas válidas por separado, la situación mintiendo igual. Es
-- literalmente la forma del trigger de `V23`: las columnas no compran nada sin
-- la regla que las cruza.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_que_el_release_lleva_temas()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo   TEXT;
    v_codigo TEXT;
BEGIN
    -- Prefijo `v_` en todas las variables por el bug que `V16` tuvo que
    -- arreglar: una variable con el mismo nombre que una columna hace que
    -- Postgres aborte con "column reference is ambiguous" ANTES de llegar al
    -- RAISE que explica la regla, y como 42702 no es P0001 la API contesta 500
    -- en vez del 409 con el texto redactado para una persona.
    SELECT r.tipo_release, r.codigo_release
      INTO v_tipo, v_codigo
      FROM release r WHERE r.id_release = NEW.id_release;

    IF v_tipo IS NULL THEN
        RAISE EXCEPTION
            'El release % todavia no tiene tipo, asi que no se le pueden cargar '
            'temas: elegi primero si es un EP o un album. Un single o un remix no '
            'llevan lista de temas -- el release ya es el tema.', v_codigo;
    END IF;

    IF v_tipo NOT IN ('EP', 'ALBUM') THEN
        RAISE EXCEPTION
            'El release % es un %, y solo un EP o un album llevan lista de temas. '
            'Un single es el release mismo: su nombre ya es el nombre del tema.',
            v_codigo, v_tipo;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER cancion_solo_en_ep_o_album
    BEFORE INSERT OR UPDATE ON cancion_release
    FOR EACH ROW EXECUTE FUNCTION verificar_que_el_release_lleva_temas();


-- La misma regla desde el release. Sin esto, cambiar el tipo deja los temas
-- colgados de un single, y las dos filas siguen siendo validas por separado.
CREATE OR REPLACE FUNCTION verificar_que_el_tipo_admite_los_temas()
RETURNS TRIGGER AS $$
DECLARE
    v_temas INTEGER;
BEGIN
    IF NEW.tipo_release IS NOT DISTINCT FROM OLD.tipo_release THEN
        RETURN NEW;
    END IF;

    IF NEW.tipo_release IN ('EP', 'ALBUM') THEN
        RETURN NEW;
    END IF;

    SELECT count(*) INTO v_temas
      FROM cancion_release c WHERE c.id_release = NEW.id_release;

    IF v_temas > 0 THEN
        RAISE EXCEPTION
            'El release % tiene % tema(s) cargados, asi que no puede pasar a %: '
            'solo un EP o un album llevan lista de temas. Sacale los temas primero '
            'si de verdad cambio de formato.',
            NEW.codigo_release, v_temas, coalesce(NEW.tipo_release, 'sin tipo');
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER release_tipo_admite_los_temas
    BEFORE UPDATE ON release
    FOR EACH ROW EXECUTE FUNCTION verificar_que_el_tipo_admite_los_temas();


-- =============================================================================
-- 3. EL RANGO SE VERIFICA AL PUBLICAR  (P51)
--
-- EP: entre 3 y 6. Álbum: entre 8 y 15.
--
-- ⚠️ **MIRA LA TRANSICIÓN, NO EL ESTADO**, y ésta es la trampa que se anotó antes
-- de escribir la migración. Escrito con la forma de `V18` §2 —"si NEW.estado =
-- 'PUBLICADO' entonces verificá"— el trigger dispararía en cada UPDATE de un
-- release ya publicado, y **todos los releases publicados que existen hoy tienen
-- cero temas**: corregirle una fecha a un lanzamiento de 2023 sería imposible
-- para siempre. `V18` §2 puede escribirse así porque un publicado sí tiene
-- contrato; acá el mundo anterior a esta migración no cumple la regla nueva.
--
-- La condición cubre además el cambio de tipo: publicar un EP con 3 temas y
-- despues pasarlo a ALBUM dejaria un album publicado con 3 temas, y el §2 de
-- arriba no lo frena porque ALBUM tambien lleva temas.
--
-- El rango vive acá y en un solo lugar. Java tiene los mismos números para que
-- la pantalla pueda avisar ANTES de que alguien apriete publicar, y ahí vale la
-- misma advertencia que en `ContratoRepository`: **la de la base decide y la de
-- Java solo muestra.** Si se separan, la pantalla cuenta mal y el trigger sigue
-- siendo el que manda.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_rango_de_temas()
RETURNS TRIGGER AS $$
DECLARE
    v_minimo INTEGER;
    v_maximo INTEGER;
    v_temas  INTEGER;
BEGIN
    IF NOT (TG_OP = 'INSERT'
            OR OLD.estado IS DISTINCT FROM NEW.estado
            OR OLD.tipo_release IS DISTINCT FROM NEW.tipo_release) THEN
        RETURN NEW;
    END IF;

    IF NEW.estado <> 'PUBLICADO' THEN
        RETURN NEW;
    END IF;

    -- Un release sin tipo, o un single, o un remix, no tienen rango que
    -- verificar. Que no lleven temas ya lo sostiene §2.
    IF NEW.tipo_release = 'EP' THEN
        v_minimo := 3; v_maximo := 6;
    ELSIF NEW.tipo_release = 'ALBUM' THEN
        v_minimo := 8; v_maximo := 15;
    ELSE
        RETURN NEW;
    END IF;

    SELECT count(*) INTO v_temas
      FROM cancion_release c WHERE c.id_release = NEW.id_release;

    IF v_temas < v_minimo OR v_temas > v_maximo THEN
        RAISE EXCEPTION
            'El release % es un % y tiene % tema(s) cargados: un % lleva entre % y %. '
            'Cargalos desde la ficha del release y despues publicalo.',
            NEW.codigo_release, NEW.tipo_release, v_temas,
            NEW.tipo_release, v_minimo, v_maximo;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER release_respeta_el_rango_de_temas
    BEFORE INSERT OR UPDATE ON release
    FOR EACH ROW EXECUTE FUNCTION verificar_rango_de_temas();


-- =============================================================================
-- 4. NO SE SACA UN TEMA QUE SOSTIENE EL RANGO DE UN RELEASE PUBLICADO
--
-- La contracara de §3, y sin ella la regla dura dura lo que tarda un DELETE:
--
--     1. cargar 3 temas
--     2. publicar el EP        -> pasa, hay 3
--     3. borrar 2              -> queda un EP publicado con un tema
--
-- Calcado de `V18` §3 (el contrato que respalda un release publicado) y de `V6`
-- §6 (el pago que respalda un premaster liberado). Es el tercer lugar del
-- esquema donde hace falta el mismo cuidado, y ya son tres veces que el ataque
-- es idéntico: la regla se verifica en un acto y se esquiva editando después.
--
-- **Atiende UPDATE además de DELETE** por la variante silenciosa, que es peor
-- porque no parece un borrado: en vez de sacar el tema, colgarlo de otro release.
--
-- **Sólo protege el MÍNIMO.** Sacar un tema nunca puede violar el máximo, y
-- agregar uno de más a un release publicado tampoco se frena acá — eso sería
-- rechazar de más, que es la mitad que `V16` enseñó a no olvidar. Un álbum
-- publicado al que le agregan un tema decimosexto es un dato mal cargado, no una
-- regla rota; un álbum publicado al que le sacan la mitad es un catálogo que
-- miente.
--
-- ⚠️ Un release publicado ANTES de esta migración tiene cero temas y por lo tanto
-- ninguno que sacar: este trigger no puede molestar a los lanzamientos viejos.
-- =============================================================================

CREATE OR REPLACE FUNCTION proteger_temas_de_release_publicado()
RETURNS TRIGGER AS $$
DECLARE
    v_estado TEXT;
    v_tipo   TEXT;
    v_codigo TEXT;
    v_minimo INTEGER;
    v_temas  INTEGER;
BEGIN
    -- Un UPDATE que deja el tema colgado del mismo release no toca nada: se
    -- puede corregir el titulo, la duracion o el ISRC de un tema publicado sin
    -- despertar esta regla.
    IF TG_OP = 'UPDATE' AND NEW.id_release IS NOT DISTINCT FROM OLD.id_release THEN
        RETURN NEW;
    END IF;

    -- Lock primero, chequeo despues: sin esto dos transacciones que sacan dos
    -- temas del mismo EP ven cada una que "quedan 3", las dos pasan, y el
    -- release termina con uno. Es la carrera que `V1` §8 obliga a cerrar en todo
    -- trigger que compite por un recurso, y la misma que `V18` §3 cierra.
    SELECT r.estado, r.tipo_release, r.codigo_release
      INTO v_estado, v_tipo, v_codigo
      FROM release r WHERE r.id_release = OLD.id_release FOR UPDATE;

    IF v_estado <> 'PUBLICADO' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF v_tipo = 'EP' THEN
        v_minimo := 3;
    ELSIF v_tipo = 'ALBUM' THEN
        v_minimo := 8;
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Cuantos quedan si este se va. En un BEFORE DELETE la fila TODAVIA esta en
    -- la tabla, asi que contar sin excluirla contesta de mas y la regla no se
    -- dispara nunca: es exactamente el cuidado que `V18` §3 documenta con su
    -- `c.id_contrato <> v_id_contrato`.
    SELECT count(*) INTO v_temas
      FROM cancion_release c
     WHERE c.id_release = OLD.id_release
       AND c.id_cancion <> OLD.id_cancion;

    IF v_temas < v_minimo THEN
        RAISE EXCEPTION
            'El release % ya esta publicado y es un %: sacar este tema lo dejaria '
            'con % y un % lleva por lo menos %. Cargá el que lo reemplaza antes de '
            'sacar este.', v_codigo, v_tipo, v_temas, v_tipo, v_minimo;
    END IF;

    RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER cancion_sostiene_release_publicado
    BEFORE UPDATE OR DELETE ON cancion_release
    FOR EACH ROW EXECUTE FUNCTION proteger_temas_de_release_publicado();
