-- =============================================================================
-- V27 — La ficha del buzón guarda qué produjo
--
-- Fases 2 y 4 de la mejora del circuito del buzón (`docs/mejoras.md` §15,
-- decisiones en `docs/requirements/platform.md` §21 · P54–P58).
--
--
-- QUÉ AGUJERO TAPA, Y CÓMO SE ENCONTRÓ
--
-- Ignacio, usando el sistema: *"siento que en este proceso se pierde mucho… una
-- vez que ponés dar cuenta desaparece el coso, entonces quizás ya te olvidaste
-- qué quería"*.
--
-- ⚠️ **El código ya lo sabía y lo había parchado a medias.** El comentario del
-- estado `recienConvertida` en `SolicitantesPagina` dice textual que al convertir
-- *"la ficha deja de estar PENDIENTE y desaparece del filtro por defecto"*, y por
-- eso muestra **la contraseña** aparte, arriba. Alguien vio el problema, rescató
-- lo único que no se puede volver a ver, y dejó hundirse todo lo demás: qué pidió
-- la persona, su teléfono, lo que escribió. **El parche es la evidencia del
-- bug.**
--
-- La causa es que `CONVERTIDO` se usaba como estado terminal y no lo es: crear la
-- cuenta no es atender la ficha. Cuando se apretaba ese botón, la persona seguía
-- sin su reserva — faltaba escribirle, acordar el horario, cobrar la seña — y la
-- ficha ya se había ido de la lista. **Y de las dos listas**: el contador del
-- sidebar (`Pendientes.buzon`) también cuenta sólo `PENDIENTE`.
--
-- O sea que las dos cosas que existen para que no se pierda nadie dejaban de
-- mirar justo en el momento en que todavía faltaba lo principal. Eso contradice
-- lo que `V20` dice de sí misma en su cabecera: que lo único que este buzón tiene
-- que garantizar es **la lista de gente que nadie contestó**.
--
--
-- LO QUE ESTA MIGRACIÓN NO INVENTA
--
-- El mecanismo entero es el que `pago` tiene desde `V1`: una fila que apunta a
-- **qué cosa produjo**, con FK anulables y un CHECK que exige que apunte a algo.
--
--     `pago` (V1)            id_reserva / id_inscripcion / id_trabajo_mastering /
--                            id_venta_equipo + `pago_tiene_destino`
--     `solicitante` (acá)    id_reserva / id_inscripcion / id_venta_equipo +
--                            `solicitante_atendido_produjo_algo`
--
-- La diferencia es la dirección del CHECK: allá es *"apuntá a algo"* y acá es una
-- equivalencia en los dos sentidos (§2), porque el estado y el destino son dos
-- caras del mismo hecho y separarlos deja que uno mienta sobre el otro. Es la
-- misma forma de doble sentido que `V22` le puso a `tipo_uso.disciplina`.
--
--
-- POR QUÉ LAS FASES 2 Y 4 VAN EN UNA SOLA MIGRACIÓN
--
-- Tocan la misma tabla. Es el argumento de `V19`, textual: hacerlas por separado
-- es **dos revisiones de las reglas de `solicitante`** en vez de una, y las
-- migraciones son inmutables y se acumulan.
-- =============================================================================


-- =============================================================================
-- 1. QUÉ PRODUJO LA FICHA  (P56)
--
-- No un booleano "atendida" ni una deducción del tipo *"¿esta persona tiene
-- alguna reserva?"* — esa pregunta no se puede contestar bien (¿una inscripción
-- de hace un año cuenta?) y además contesta otra cosa.
--
-- Una FK escrita **en el mismo movimiento** que crea la reserva, la inscripción o
-- la venta. Eso da las dos cosas que se pidieron de una sola vez: la ficha se
-- cierra sola —no hay botón que alguien se olvide de apretar— y dentro de tres
-- meses se abre y se ve **cuál** reserva salió de ella, no un tilde.
--
-- Las tres, y no una referencia genérica, por lo mismo que `pago` tiene cuatro:
-- una FK de verdad la sostiene la base. Una columna `tipo` + `id` es una FK que
-- nadie verifica, y apunta a la fila borrada del año que viene.
--
-- ⚠️ NO hay FK a `trabajo_mastering`, y no es un olvido: Mix & Mastering **no
-- entra al buzón**. Llega por WhatsApp a Ghezz y se carga a mano — decisión
-- vigente del Módulo 6, ratificada cuando se escribió `V20`.
-- =============================================================================

ALTER TABLE solicitante
    ADD COLUMN id_reserva      BIGINT REFERENCES reserva (id_reserva),
    ADD COLUMN id_inscripcion  BIGINT REFERENCES inscripcion (id_inscripcion),
    -- El nombre espeja el de `pago.id_venta_equipo`, aunque la PK de esa tabla se
    -- llame `id_venta`: la columna se lee junto a las otras dos y la coherencia
    -- entre las dos tablas que apuntan a lo mismo vale más que el eco del nombre
    -- de la clave.
    ADD COLUMN id_venta_equipo BIGINT REFERENCES venta_equipo (id_venta);

COMMENT ON COLUMN solicitante.id_reserva IS
    'Que produjo esta ficha. Se escribe junto con el estado ATENDIDO y no se '
    'vuelve a tocar: `solicitante_resuelto_es_final` (V13 4) congela la fila.';


-- =============================================================================
-- 2. LOS ESTADOS: `CONVERTIDO` SE VA, ENTRA `ATENDIDO`  (P55)
--
-- Ignacio: *"cuando ya se le contactó por wpp y se creó la reserva si está
-- disponible"*. O sea: **crear la cuenta no es atender la ficha.**
--
-- ⚠️ De esas dos mitades, el sistema **sólo puede observar una**. Que se le haya
-- escrito por WhatsApp no es observable: el link de `wa.me` abre otra aplicación
-- y ahí termina. Un checkbox *"ya le escribí"* sería una casilla que se puede
-- marcar sin escribir, o sea un dato que miente. Lo observable es lo que se
-- produjo — y además es lo que le importa a quien abra el buzón dentro de un mes.
--
-- *"Tiene cuenta"* deja de ser un estado y vuelve a ser lo que siempre fue: una
-- columna (`id_usuario IS NOT NULL`).
--
--
-- ⚠️ QUÉ PASA CON LAS FILAS QUE YA ESTÁN EN `CONVERTIDO` — la parte incómoda
--
-- Significan *"se creó una cuenta, y no sabemos si alguna vez se cargó lo que
-- pedían"*. Mapearlas a `ATENDIDO` afirmaría lo que justamente no se sabe, y
-- además ninguna tiene destino que poner, así que romperían el CHECK de abajo.
-- Mapearlas a `DESCARTADO` diría que se las rechazó, que es falso. Y **borrarlas
-- no es opción**: `V20` §3 lo prohíbe.
--
-- Vuelven a `PENDIENTE`, **conservando su `id_usuario`**. Es la única lectura que
-- no inventa nada: *no sabemos si esto se terminó, así que vuelve a la lista para
-- que alguien lo mire*. Y es el error barato de los dos — puede hacer que alguien
-- revise una ficha de más, nunca que se pierda una.
--
-- Es el criterio de `V23` §2 (migrar sólo donde no hay que adivinar, y avisar por
-- NOTICE de lo demás) adaptado a una tabla donde borrar no está permitido.
-- =============================================================================

DO $$
DECLARE
    v_afectadas INTEGER;
    v_ids       TEXT;
BEGIN
    SELECT count(*), string_agg(id_solicitante::text, ', ' ORDER BY id_solicitante)
      INTO v_afectadas, v_ids
      FROM solicitante WHERE estado = 'CONVERTIDO';

    IF v_afectadas > 0 THEN
        RAISE NOTICE
            'V27: % ficha(s) en CONVERTIDO vuelven a PENDIENTE porque no se sabe '
            'si se les cargo lo que pedian. Conservan su id_usuario. Ids: %',
            v_afectadas, v_ids;
    END IF;
END $$;

-- ⚠️ **ESTE DROP VA ANTES DEL UPDATE Y NO DESPUÉS**, y el orden no es prolijidad:
-- `solicitante_convertido_tiene_cuenta` exige `id_usuario IS NULL` fuera de
-- CONVERTIDO, así que devolver a PENDIENTE una ficha **conservando su cuenta** lo
-- viola de frente. Escrito en el otro orden, esta migración no aplica sobre
-- ninguna base que tenga fichas convertidas — o sea sobre la de desarrollo, que
-- tiene ocho.
--
-- Y no se reemplaza por su equivalente, por dos motivos; el segundo es el que
-- decide:
--
--   · Esa exigencia ya no es cierta: las fichas que vuelven a PENDIENTE tienen
--     cuenta, y eso ahora es normal —alguien que ya era cliente y volvió a
--     escribir desde la web llega exactamente así—.
--   · Y **la cuenta dejó de ser un requisito** (P54): *"lo que son servicios no
--     exige cuenta… es más para la comodidad del cliente"*. Una regla que la
--     exija contradice la decisión.
ALTER TABLE solicitante DROP CONSTRAINT solicitante_convertido_tiene_cuenta;

-- El trigger `solicitante_resuelto_es_final` rechaza tocar una ficha que no esté
-- en PENDIENTE, así que **la migración tiene que apagarlo para su propio UPDATE**.
-- Se vuelve a prender abajo: si esto fallara a la mitad, la transacción de Flyway
-- revierte las dos cosas juntas.
ALTER TABLE solicitante DISABLE TRIGGER solicitante_resuelto_es_final;

UPDATE solicitante
   SET estado = 'PENDIENTE',
       -- La firma era de la resolución vieja, que se está deshaciendo. Dejarla
       -- diría que alguien resolvió una ficha que está pendiente, y el CHECK
       -- `solicitante_resolucion_completa` es justamente el que ata las dos.
       id_usuario_resuelve = NULL,
       fecha_resolucion    = NULL
 WHERE estado = 'CONVERTIDO';

ALTER TABLE solicitante ENABLE TRIGGER solicitante_resuelto_es_final;

ALTER TABLE solicitante DROP CONSTRAINT solicitante_estado_valido;

ALTER TABLE solicitante ADD CONSTRAINT solicitante_estado_valido
    CHECK (estado IN ('PENDIENTE', 'ATENDIDO', 'DESCARTADO'));

-- La equivalencia, en los dos sentidos. Cada mitad tapa una mentira distinta:
--
--   ->  Una ficha ATENDIDA sin destino es exactamente el bug que esta migración
--       viene a cerrar: dice que se resolvió y no hay nada que mostrar.
--   <-  Un destino sobre una ficha PENDIENTE dice que se creó algo que nadie
--       autorizó, y la sacaría de la lista sin que su estado lo diga.
--
-- Es la forma de doble sentido de `V22`, y por el mismo motivo: la mitad obvia
-- sola deja pasar la otra.
ALTER TABLE solicitante ADD CONSTRAINT solicitante_atendido_produjo_algo
    CHECK ((estado = 'ATENDIDO') = (id_reserva IS NOT NULL
                                 OR id_inscripcion IS NOT NULL
                                 OR id_venta_equipo IS NOT NULL));

COMMENT ON COLUMN solicitante.estado IS
    'PENDIENTE: nadie la atendio. ATENDIDO: produjo una reserva, una inscripcion '
    'o una venta -- ver las tres FK. DESCARTADO: se cerro a mano, con motivo. '
    '"Tiene cuenta" NO es un estado: es id_usuario (P55).';


-- =============================================================================
-- 3. EL HORARIO QUE LA PERSONA PREFIERE  (P58)
--
-- Hoy eso llega adentro de `detalle`, texto libre armado por el servidor, por una
-- decisión explícita de `V20`: *"ninguno de esos datos se usa para crear nada"*.
--
-- ⚠️ **Esta sección reabre esa decisión, y se hace a propósito.** El argumento de
-- `V20` era cierto **para el sistema** y falso **para la persona**: quien atiende
-- lee *"martes 18hs, 2 horas"* y lo vuelve a tipear en el calendario. Y con el
-- botón *"apartarle la cabina"* esos datos **pasan a usarse para crear algo**, que
-- era la premisa entera del argumento. Cambió la premisa, se revisa la decisión —
-- igual que `V15` revirtió a `V6` §3.
--
-- **Pero acotado, y el criterio para acotarlo es el de `V20`.** Lo que aquella
-- rechazó fueron *"doce columnas anulables cuyo significado depende de
-- `interes`"*: modalidad y experiencia sólo significan algo en el formulario de
-- programas, presupuesto sólo en el de equipos. **Estas tres tienen UN solo
-- significado sin importar qué se pidió** —qué día, a qué hora y por cuánto tiempo
-- le vendría bien a esa persona— y eso vale igual para una cabina que para un
-- curso, donde también hay preferencia de día y horario. Ésa es la diferencia, y
-- es la que hace que sean tres y no doce. Todo lo demás sigue en `detalle`.
--
-- **Los tres son opcionales**, y no por prolijidad: estos formularios existen para
-- captar a alguien con el mínimo esfuerzo —publicar la landing sin ellos era
-- perder clientes reales, que es lo que `V20` dice de sí misma—. **Exigir día y
-- hora pierde a quien sólo quería preguntar cuánto sale.** El que sabe lo que
-- quiere los llena y el botón precarga; el que no, los deja vacíos y la ficha se
-- lee como hoy. Degrada solo.
--
-- **Duración y no hora de fin** (P58): *"2 horas"* es lo que la persona piensa; la
-- hora de fin la calcula el sistema al precargar el alta.
--
-- ⚠️ Y lo que la landing NO hace: mostrar disponibilidad. Se pregunta como
-- **preferencia**, nunca como reserva — el retoque §6f.5 se dio de baja entero con
-- el argumento de que *"quien pide no puede saber si está ocupado"*. Un formulario
-- que parezca una reserva hace creer a la persona que la tiene, y esa mentira es
-- peor que la de hoy. La sala tampoco se pregunta: la decide `sala_tipo_uso`.
-- =============================================================================

ALTER TABLE solicitante
    ADD COLUMN fecha_preferida  DATE,
    ADD COLUMN hora_preferida   TIME,
    ADD COLUMN duracion_minutos INTEGER;

ALTER TABLE solicitante ADD CONSTRAINT solicitante_duracion_positiva
    CHECK (duracion_minutos IS NULL OR duracion_minutos > 0);

COMMENT ON COLUMN solicitante.fecha_preferida IS
    'Que dia le vendria bien a quien pidio. Es una PREFERENCIA y no una reserva: '
    'la landing no ve disponibilidad (6f.5). Opcional -- ver P58.';

COMMENT ON COLUMN solicitante.duracion_minutos IS
    'Cuanto tiempo, en minutos. La hora de fin la calcula el sistema al precargar '
    'el alta: "2 horas" es lo que la persona piensa, no "de 18 a 20".';


-- =============================================================================
-- 4. EL ÍNDICE DEL BUZÓN ABIERTO
--
-- `solicitante_pendientes` (de `V20`) es parcial sobre `estado = 'PENDIENTE'`, y
-- la lista por defecto ahora muestra **dos** cosas: lo que nadie contestó y lo que
-- se apartó y todavía espera la seña. La condición que las junta es la de abajo, y
-- se escribe por lo que **excluye** — igual que `V1` definió "reserva que ocupa la
-- sala" — para que un estado nuevo entre solo en vez de haber que acordarse.
-- =============================================================================

DROP INDEX solicitante_pendientes;

CREATE INDEX solicitante_abiertos
    ON solicitante (fecha_creacion) WHERE estado <> 'DESCARTADO';
