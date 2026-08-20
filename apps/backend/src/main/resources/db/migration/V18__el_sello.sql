-- =============================================================================
-- V18 — El sello discográfico: las reglas que `V1` dejó a medias
--
-- Las tres tablas del sello —`artista`, `release`, `contrato_sello`— existen
-- desde `V1`, y también su escalera de estados (§8.5). Lo que no existía es la
-- regla dura del módulo, que el alcance declara CONFIRMADA con el cliente:
--
--     "No se publica un release sin contrato adjunto (o con justificación
--      explícita)."
--
-- Esa frase no estaba en ninguna capa: ni CHECK, ni trigger, ni servicio, ni
-- pantalla. Es la misma forma exacta del hallazgo del Módulo 5 —la mitad de §8
-- que decía "administración sí ve las notas privadas" y no tenía endpoint ni
-- test— y del `V16`: **una regla que nadie implementa no tiene nada que fallar**,
-- así que ninguna suite podía avisar. Aparece releyendo el alcance contra lo
-- construido, no corriendo tests.
--
-- Se contesta acá y no en el servicio por la razón de siempre en este proyecto:
-- la regla que respalda legalmente un lanzamiento no puede depender de que el
-- próximo endpoint se acuerde de llamarla.
--
--
-- LO QUE ESTA MIGRACIÓN NO INVENTA
--
-- Casi todo lo de abajo es la forma que Mix & Mastering ya tiene, aplicada al
-- sello. No es pereza: es que **son la misma regla dos veces** —un entregable
-- que se retiene hasta que se cumple una condición, con una salida registrada
-- porque el cliente avisó que la va a necesitar— y darles formas distintas
-- obligaría a aprender dos veces lo mismo. El mapa:
--
--     trabajo_mastering.premaster_liberado   ~  release.estado = 'PUBLICADO'
--     trabajo_mastering.liberado_sin_pago    ~  release.publicado_sin_contrato
--     trabajo_mastering.motivo_liberacion    ~  release.motivo_publicacion
--     `V1` §8.4 (premaster_requiere_pago)    ~  §2 de acá
--     `V6` §6  (pago_sostiene_premaster)     ~  §3 de acá
--     `V1` §8.5 CANCELADO fuera de escalera  ~  §1 de acá
-- =============================================================================


-- =============================================================================
-- 1. UN RELEASE SE PUEDE CAER  (ratificación 6, 2026-08-20)
--
-- Ignacio: *"Podría, no es lo usual, pero sí."*
--
-- Hasta hoy el estado de un release solo avanzaba y no existía CANCELADO, así
-- que un lanzamiento que se cae no tenía dónde anotarse: quedaba para siempre
-- en 'CONFIRMADO', mintiendo, o alguien lo borraba —que §4 acá abajo pasa a
-- prohibir—. **Que sea raro es el argumento a favor de tenerlo, no en contra:**
-- lo que pasa una vez por año es justamente lo que nadie va a poder registrar el
-- día que pase, porque nadie se acuerda de haberlo previsto.
--
-- CANCELADO va FUERA de la escalera, igual que en `trabajo_mastering`: se
-- cancela desde cualquier estado y no se vuelve. No es un paso atrás en el ciclo
-- de vida, es salirse de él — por eso no tiene número de orden y se atiende
-- antes de comparar.
-- =============================================================================

ALTER TABLE release DROP CONSTRAINT release_estado_valido;

ALTER TABLE release ADD CONSTRAINT release_estado_valido
    CHECK (estado IN ('A_CONFIRMAR', 'CONFIRMADO', 'EN_DISTRIBUCION',
                      'PUBLICADO', 'CANCELADO'));

CREATE OR REPLACE FUNCTION verificar_avance_estado_release()
RETURNS TRIGGER AS $$
DECLARE
    orden_anterior INTEGER;
    orden_nuevo    INTEGER;
BEGIN
    -- Cancelar se puede desde donde sea. Va primero, antes de mirar el orden,
    -- porque CANCELADO no tiene lugar en la escalera y compararlo daría 0 --
    -- o sea, "retrocede" desde cualquier estado.
    IF NEW.estado = OLD.estado OR NEW.estado = 'CANCELADO' THEN
        RETURN NEW;
    END IF;

    -- Y la mitad que falta, que es la que hace que "los estados solo avanzan"
    -- sea cierto: DE cancelado no se sale. Ver §1b.
    IF OLD.estado = 'CANCELADO' THEN
        RAISE EXCEPTION
            'El release % esta cancelado y no vuelve atras (intento pasarlo a %). '
            'Un lanzamiento que se retoma es un release nuevo.',
            OLD.codigo_release, NEW.estado;
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

-- El trigger de `V1` sigue apuntando a esta función: se reemplaza el cuerpo, no
-- el trigger. Y `V1` no se toca -- Flyway le guarda el checksum.


-- =============================================================================
-- 1b. DE CANCELADO NO SE SALE  — y el mismo agujero estaba en Mix & Mastering
--
-- Lo encontró un caso de esta misma migración, escrito esperando que un release
-- cancelado no pudiera volver a 'A_CONFIRMAR'. Volvía.
--
-- El motivo es una consecuencia no buscada de dejar CANCELADO fuera de la
-- escalera: al no tener número de orden cae en el `ELSE 0`, y entonces
-- **cualquier** estado tiene orden mayor que él. La comparación `nuevo <
-- anterior` da falso siempre, así que salir de cancelado nunca se veía como un
-- retroceso. `V1` §8.5 escribió *"se puede cancelar desde cualquier estado"* y
-- nadie escribió la otra mitad, porque desde adentro de esa frase no se ve que
-- falte.
--
-- **Y es exactamente el retroceso en dos pasos que `V6` ya cerró en otras
-- tablas**: no se puede ir para atrás, pero se podía cancelar y volver a entrar
-- por arriba. Con el sello ademas habilitaba una maniobra concreta: cancelar un
-- release publicado -- lo que lo saca de la proteccion de §3 --, sacarle el
-- contrato, y volver a subirlo. La regla dura igual lo frenaria al republicar
-- (§2 corre en cada UPDATE), pero el catalogo quedaria con un release publicado
-- cuyo respaldo se fue y volvio sin que nada lo registre.
--
-- MIX & MASTERING TIENE EL MISMO BUG, POR LA MISMA LINEA
--
-- `verificar_avance_estado_trabajo` de `V1` §8.5 está escrita igual, así que un
-- trabajo CANCELADO puede volver a 'EN_PROCESO' y de ahí caminar hasta PAGADO.
-- Se arregla acá y no en una `V19` propia por una razón práctica: es la misma
-- línea, encontrada por el mismo caso, y separarlas significaría dejar
-- conscientemente abierto un agujero conocido hasta que alguien vuelva.
--
-- El servicio de M&M ya trataba CANCELADO como terminal para las revisiones, o
-- sea que la intención estaba escrita en Java y no en la base -- que es el orden
-- que este proyecto invierte a propósito.
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_avance_estado_trabajo()
RETURNS TRIGGER AS $$
DECLARE
    orden_anterior INTEGER;
    orden_nuevo    INTEGER;
BEGIN
    IF NEW.estado = OLD.estado OR NEW.estado = 'CANCELADO' THEN
        RETURN NEW;
    END IF;

    IF OLD.estado = 'CANCELADO' THEN
        RAISE EXCEPTION
            'El trabajo esta cancelado y no vuelve atras (intento pasarlo a %). '
            'Un trabajo que se retoma se carga de nuevo.', NEW.estado;
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


-- =============================================================================
-- 2. NO SE PUBLICA UN RELEASE SIN CONTRATO ADJUNTO
--
-- La regla dura del módulo, y su excepción, que el alcance escribe entre
-- paréntesis: *"(o con justificación explícita)"*. Las dos mitades van juntas,
-- igual que en el premaster: **un bloqueo sin salida se esquiva por afuera del
-- sistema** —se publica igual y el sistema pasa a mentir— y Ghezz ya avisó que
-- con gente cercana es flexible. La salida existe, cuesta escribir una frase, y
-- queda firmada con autor.
--
-- QUÉ CUENTA COMO "TENER CONTRATO", QUE ES LA PARTE NO OBVIA
--
-- Dos caminos, y no es una excepción inventada para esta regla: es lo que
-- `contrato_sello` modela desde `V1`, donde `id_release` es NULLABLE con este
-- comentario textual -- *"un contrato puede cubrir al artista en general, no un
-- release"*. Entonces respalda a un release:
--
--     · un contrato de ESE release, o
--     · un contrato general de SU artista (id_release IS NULL).
--
-- Es la misma forma que la seña de `V10`: el dinero detrás de una reserva llega
-- por un pago propio **o** por la inscripción que cubre la clase. Exigir un
-- contrato por release cuando ya hay uno que cubre al artista entero sería pedir
-- que se firme dos veces lo mismo.
--
-- POR QUÉ ES INMEDIATO Y NO DIFERIDO
--
-- `V10` tuvo que ser diferido porque al insertar la reserva su participante
-- todavía no existía. Acá no pasa: se publica un release que ya existe, y su
-- contrato se carga antes. Con el trigger inmediato el rechazo llega DENTRO del
-- pedido, como un 409 con este texto; diferido llegaría como un 500 al COMMIT y
-- la regla más importante del módulo se vería como un sistema roto -- que es
-- exactamente lo que `V16` acaba de arreglar del otro lado.
--
-- Cubre INSERT además de UPDATE: nada impide dar de alta un release ya
-- publicado, y por esa puerta la regla no existiría.
-- =============================================================================

ALTER TABLE release
    ADD COLUMN publicado_sin_contrato BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN motivo_publicacion     TEXT,
    ADD COLUMN id_usuario_publica     BIGINT REFERENCES usuario (id_usuario);

-- El `coalesce(btrim(...), '')` no es adorno y `V7` lo aprendió rompiéndolo: un
-- CHECK que evalúa a NULL no rechaza nada, solo FALSE rechaza. Escrito como
-- `btrim(motivo) <> ''`, un motivo en NULL da NULL, la condición entera da NULL,
-- y la fila entra con la excepción marcada y sin ninguna justificación. El
-- CHECK equivalente de `trabajo_mastering` (trabajo_liberacion_justificada) es
-- anterior a esa lección y solo exige `IS NOT NULL`: acepta un motivo de un
-- espacio. No se corrige acá porque no es de esta migración, pero cuando algo
-- toque esa tabla, se corrige ahí.
ALTER TABLE release ADD CONSTRAINT release_publicacion_justificada
    CHECK (NOT publicado_sin_contrato
           OR (coalesce(btrim(motivo_publicacion), '') <> ''
               AND id_usuario_publica IS NOT NULL));

CREATE OR REPLACE FUNCTION release_tiene_contrato(v_id_release BIGINT, v_id_artista BIGINT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM contrato_sello c
         WHERE c.id_release = v_id_release
            OR (c.id_artista = v_id_artista AND c.id_release IS NULL));
$$ LANGUAGE sql STABLE;

-- Los parámetros llevan prefijo `v_` por el bug que `V16` tuvo que arreglar:
-- una variable con el mismo nombre que una columna hace que Postgres aborte con
-- "column reference is ambiguous" ANTES de llegar al RAISE que explica la regla.
-- El agujero no se abre -- fallar por un error también rechaza-- pero el mensaje
-- redactado para una persona no se emite nunca, y como 42702 no es P0001 la API
-- contesta 500 en vez del 409. Nadie lo vio durante meses porque los casos
-- 'FALLA' no miraban el mensaje.
CREATE OR REPLACE FUNCTION verificar_publicacion_con_contrato()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado <> 'PUBLICADO' OR NEW.publicado_sin_contrato THEN
        RETURN NEW;
    END IF;

    IF NOT release_tiene_contrato(NEW.id_release, NEW.id_artista) THEN
        RAISE EXCEPTION
            'El release % no se puede publicar sin un contrato adjunto: no hay '
            'contrato de este release ni contrato general de su artista. Para '
            'publicarlo igual hay que marcarlo con publicado_sin_contrato y '
            'escribir el motivo, que queda firmado.', NEW.codigo_release;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER release_requiere_contrato
    BEFORE INSERT OR UPDATE ON release
    FOR EACH ROW EXECUTE FUNCTION verificar_publicacion_con_contrato();


-- =============================================================================
-- 3. EL CONTRATO QUE RESPALDA UN RELEASE PUBLICADO NO SE SACA
--
-- La contracara de §2, y sin ella la regla dura dura lo que tarda un DELETE.
-- El ataque son tres pasos, calcado del que `V6` §6 cerró para el premaster:
--
--     1. cargar el contrato
--     2. publicar el release            -> pasa, hay contrato
--     3. borrar el contrato             -> el release queda publicado sin nada
--
-- Y la variante silenciosa, que es peor porque no parece un borrado: en vez de
-- borrarlo, moverlo a otro release (UPDATE de id_release). Por eso el trigger
-- atiende UPDATE y DELETE, no solo DELETE.
--
-- **Deja pasar si queda OTRO contrato sosteniendo la publicación**, igual que
-- `V6` §6 con los pagos. Sin esa rama, cargar un segundo contrato correcto y
-- sacar el primero -- que es la forma de corregir un PDF equivocado -- sería
-- imposible, y la regla estaría rechazando de más.
--
-- CONTRATO_SELLO SÍ SE PUEDE BORRAR EN GENERAL, Y ES DELIBERADO
--
-- Es la excepción que `bloqueo_sala` ya tiene, por el mismo razonamiento y con
-- el mismo cuidado. `V6` §7 prohibió el DELETE solo donde hay una anulación
-- documentada que deje una salida (pago -> ANULADO, trabajo -> CANCELADO). Un
-- contrato NO tiene estado de anulación: es un documento, no un asiento. Si se
-- carga el PDF equivocado y no se pudiera borrar, ese error quedaría adjunto
-- para siempre a un artista real. Lo único que no puede perderse es el respaldo
-- de algo YA PUBLICADO, y eso es exactamente lo que este trigger protege.
-- =============================================================================

-- OJO CON EL ORDEN, QUE ES LA TRAMPA DE ESTE TRIGGER
--
-- En un BEFORE DELETE la fila TODAVIA ESTA en la tabla. Un chequeo escrito como
-- "¿este release sigue teniendo contrato?" contesta que sí -- porque encuentra
-- justamente al que se está por borrar -- y la regla no se dispara nunca. La
-- pregunta correcta excluye explícitamente al contrato en cuestión: **¿queda
-- OTRO?**. Es el mismo cuidado que `V6` §6 tiene con `p.id_pago <> id_pago`.
CREATE OR REPLACE FUNCTION proteger_contrato_de_release_publicado()
RETURNS TRIGGER AS $$
DECLARE
    v_id_contrato BIGINT;
    v_codigo      TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_id_contrato := OLD.id_contrato;
    ELSE
        v_id_contrato := NEW.id_contrato;
        -- Un UPDATE que deja el contrato colgado de lo mismo no toca nada: se
        -- pueden corregir la fecha de firma o las observaciones sin despertar
        -- esta regla.
        IF NEW.id_release IS NOT DISTINCT FROM OLD.id_release
           AND NEW.id_artista IS NOT DISTINCT FROM OLD.id_artista THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Lock primero, chequeo después. Sin esto, dos transacciones que sacan dos
    -- contratos del mismo release ven cada una que "queda el otro", las dos
    -- pasan, y el release termina publicado sin ninguno. Es exactamente la
    -- carrera que la prueba de concurrencia de `V1` encontró con las salas, y
    -- por eso `V1` §8 dice que todo trigger que compite por un recurso empieza
    -- tomando el lock.
    PERFORM 1 FROM release r
     WHERE r.id_release = OLD.id_release
        OR (OLD.id_release IS NULL AND r.id_artista = OLD.id_artista)
     FOR UPDATE;

    -- ¿Algún release YA PUBLICADO se queda sin respaldo si este contrato se va?
    -- Un contrato de release mira uno solo; uno general del artista puede estar
    -- sosteniendo varios, y alcanza con que uno quede colgado.
    SELECT r.codigo_release INTO v_codigo
      FROM release r
     WHERE r.estado = 'PUBLICADO'
       AND NOT r.publicado_sin_contrato
       AND (r.id_release = OLD.id_release
            OR (OLD.id_release IS NULL AND r.id_artista = OLD.id_artista))
       AND NOT EXISTS (
           SELECT 1 FROM contrato_sello c
            WHERE c.id_contrato <> v_id_contrato
              AND (c.id_release = r.id_release
                   OR (c.id_artista = r.id_artista AND c.id_release IS NULL)))
     LIMIT 1;

    IF v_codigo IS NOT NULL THEN
        RAISE EXCEPTION
            'El contrato % es el unico respaldo del release %, que ya esta '
            'publicado. Carga el contrato que lo reemplaza antes de sacar este, '
            'o marca el release con publicado_sin_contrato y su motivo.',
            v_id_contrato, v_codigo;
    END IF;

    RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER contrato_sostiene_release
    BEFORE UPDATE OR DELETE ON contrato_sello
    FOR EACH ROW EXECUTE FUNCTION proteger_contrato_de_release_publicado();


-- =============================================================================
-- 4. UN RELEASE NO SE BORRA
--
-- Ahora que se puede cancelar, prohibirlo no deja a nadie encerrado -- que era
-- la condición exacta que `V6` §7 se puso a sí misma para decidir dónde bloquear
-- el DELETE y dónde no. Y acá hay una razón de más que no tienen las otras
-- tablas: **el código de release es único y correlativo**. Borrar el LJ021 deja
-- un hueco permanente en un catálogo que se lee como una lista continua, y peor,
-- deja libre un código que alguien va a reutilizar creyendo que está limpio.
--
-- `contrato_sello` NO entra acá: ver el final de §3.
--
-- LA FUNCION SE EXTIENDE, NO SE GENERALIZA -- y eso lo decidieron los tests
--
-- El primer intento reemplazó el mensaje por uno genérico ("la baja es un estado
-- de la propia fila"), suponiendo que la enumeración de `V6` había quedado vieja.
-- **No había quedado vieja**: `V7`, `V9` y `V13` la fueron extendiendo cada una
-- con su tabla, y dos casos de la suite Java —uno de `solicitud_reserva`, otro de
-- `venta_equipo`— afirman textualmente la salida de SU tabla. Los dos se pusieron
-- en rojo, que es exactamente para lo que estaban.
--
-- Y tenían razón de fondo, no solo de forma: **la enumeración es la parte útil
-- del mensaje.** Quien recibe este error está intentando dar de baja algo y
-- necesita saber cómo se da de baja *eso* -- que no es lo mismo en cada tabla:
-- ANULADO, CANCELADA, `anulado = TRUE`. Un mensaje genérico es más corto y deja
-- a la persona en el mismo lugar donde estaba.
--
-- Así que se agrega `release -> CANCELADO` a la lista, como hicieron las tres
-- migraciones anteriores. El archivo `V6` no se toca -- Flyway le guarda el
-- checksum; lo que se reemplaza es la función, que es estado de la base y no
-- texto de la migración.
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
        'release -> CANCELADO).',
        TG_TABLE_NAME;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER release_no_se_borra
    BEFORE DELETE ON release
    FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_historico();


-- =============================================================================
-- 5. DÓNDE SONÓ  (P25, cerrada el 2026-08-20)
--
-- Ghezz busca a mano si algún DJ tocó los temas: revisa sets, radios,
-- playlists. Confirmado que eso entra al sistema **cargado a mano**, y confirmado
-- con la misma frase lo que NO entra: ninguna conexión a otras plataformas. No
-- hay integración con Spotify ni con SoundCloud ni con nada que busque solo --
-- eso está fuera del alcance y de la propuesta.
--
-- Y una condición de alcance que conviene tener escrita, textual: *"si en el
-- futuro no lo usan, que no lo usen y fue"*. O sea que **esta tabla vacía no es
-- una falla**, y la pantalla tiene que leerse bien con cero filas -- igual que el
-- informe de uso de salas con una sala sin uso.
--
-- EL ORDEN "POR POPULARIDAD" ES UNA COLUMNA GENERADA, Y ESA ES LA DECISIÓN
--
-- Se pidió la lista ordenada por popularidad. Como se carga a mano, "popularidad"
-- tiene que salir de un dato que alguien escribe, y la opción de pedir un número
-- de alcance estimado a ojo se descartó: nadie podría defender ese número
-- después. Sale del TIPO de aparición, con jerarquía fija.
--
-- Va como columna generada y no como un CASE en la consulta porque el Módulo 8
-- va a volver a pedir "actividad del sello" y ahí habría un segundo CASE que
-- puede quedar distinto -- que es la deuda que este proyecto ya paga con
-- `contarClasesConsumidas` contra `V9` §5.
--
-- El ELSE 9 no es defensivo por gusto: `V7` aprendió que **una columna generada
-- se computa ANTES de que corran los CHECK**, así que si la expresión revienta
-- se lleva puesta la constraint que iba a explicar el problema. Un CASE con
-- rama por defecto no puede reventar.
-- =============================================================================

CREATE TABLE aparicion_release (
    id_aparicion     BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_release       BIGINT       NOT NULL REFERENCES release (id_release),
    tipo_aparicion   VARCHAR(20)  NOT NULL,
    -- Dónde sonó: "Radio Metro", "Boiler Room", "playlist Techno Bunker".
    donde            VARCHAR(200) NOT NULL,
    -- Quién lo puso, si se sabe. Nullable: una playlist no tiene autor a la vista.
    quien            VARCHAR(150),
    fecha            DATE,
    url              VARCHAR(500),
    notas            TEXT,
    -- Quién lo cargó. Nullable por la misma razón que el resto del esquema: si
    -- esa cuenta algún día se borrara, el dato no se lleva la fila puesta.
    id_usuario_carga BIGINT       REFERENCES usuario (id_usuario),
    fecha_creacion   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT aparicion_tipo_valido
        CHECK (tipo_aparicion IN ('RADIO', 'SET', 'PLAYLIST', 'OTRO')),

    orden_relevancia SMALLINT GENERATED ALWAYS AS (
        CASE tipo_aparicion
            WHEN 'RADIO'    THEN 1
            WHEN 'SET'      THEN 2
            WHEN 'PLAYLIST' THEN 3
            ELSE 9
        END) STORED
);

COMMENT ON COLUMN aparicion_release.orden_relevancia IS
    'La jerarquia de "popularidad", en un solo lugar. Se ordena por esta columna '
    'y despues por fecha. Vive en la base y no en la consulta para que el tablero '
    'del Modulo 8 no escriba un segundo CASE que pueda quedar distinto.';


-- =============================================================================
-- 6. ÍNDICES
--
-- Postgres no indexa las FK solo, y `V1` §9 no puso ninguno sobre estas tablas
-- porque no había módulo que las consultara. Los cuatro de abajo respaldan
-- consultas concretas y no se agregan "por las dudas":
-- =============================================================================

-- Las dos que mira release_tiene_contrato(), o sea la regla dura, en cada
-- publicación y en cada borrado de contrato.
CREATE INDEX contrato_por_release ON contrato_sello (id_release);
CREATE INDEX contrato_por_artista ON contrato_sello (id_artista);

-- El catálogo agrupado por artista, que es la pantalla del módulo.
CREATE INDEX release_por_artista  ON release (id_artista);

-- "Dónde sonó" de un release, ya en el orden en que se muestra.
CREATE INDEX aparicion_por_release
    ON aparicion_release (id_release, orden_relevancia, fecha DESC);
