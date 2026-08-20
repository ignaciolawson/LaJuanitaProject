-- =============================================================================
-- V17 — El disparador automático de avisos
--
-- Tres módulos pidieron la misma pieza y ninguno la construyó: el Módulo 4 para
-- la deuda a los 7 días (§6), el Módulo 6 para la entrega impaga a los 7 días
-- (§9), y el Módulo 7 la va a pedir para el aviso previo al lanzamiento (§10).
-- Cada uno la dejó anotada como "es del módulo que construya notificaciones
-- automáticas". Este es ese módulo.
--
-- La tabla `notificacion` existe desde `V1` y el Módulo 4 le puso su primer
-- escritor. Lo que le falta para que además le escriba una MÁQUINA es una sola
-- cosa, y es la que esta migración agrega.
--
--
-- EL PROBLEMA QUE RESUELVE: QUÉ PASA SI CORRE DOS VECES EL MISMO DÍA
--
-- Es la pregunta que los tres módulos dejaron planteada por escrito, y no es
-- teórica: el cron corre a las 8:00, alguien reinicia el backend a las 8:05
-- porque desplegó algo, y la persona abre el sistema con el mismo aviso cuatro
-- veces. Una bandeja que repite deja de leerse, y entonces el aviso que sí
-- importa pasa desapercibido — que es exactamente lo contrario de para lo que
-- se construyó.
--
-- La forma barata de resolverlo es preguntar antes de insertar. NO ALCANZA, y
-- este proyecto ya lo aprendió midiéndolo: `UsuarioService` preguntaba si el
-- email existía antes de insertar, y seis registros simultáneos de la misma
-- dirección produjeron cuatro 500 — porque entre la pregunta y la respuesta se
-- mete otra transacción. Un doble clic bastaba. La autoridad terminó siendo el
-- índice único de la base, que es lo único que no se puede colar.
--
-- Acá es lo mismo con otro disfraz: dos corridas simultáneas (dos instancias,
-- o un reinicio justo mientras corre) leen las dos que el aviso no está, y las
-- dos lo escriben.
--
--
-- LA CLAVE ES DEL HECHO, NO DE LA CORRIDA
--
-- `clave_evento` no dice "avisos del 2026-08-20". Dice cuál es el hecho que se
-- está avisando, de forma que la MISMA situación produzca siempre la MISMA
-- clave:
--
--     DEUDA:u=42:ARS:desde=2026-08-01
--     ENTREGA_IMPAGA:t=17:entrega=2026-08-10
--
-- Eso da las dos propiedades que se quieren a la vez, y es la razón de que la
-- clave se arme con los datos del hecho y no con la fecha de hoy:
--
--   · Correr diez veces hoy escribe UN aviso, porque la clave no cambia.
--   · Y si la persona salda la deuda y tres meses después vuelve a deber, el
--     `desde` es otro, la clave es otra, y el aviso vuelve a salir. Con una
--     clave por corrida eso sería un aviso por día; con una clave sin fecha
--     nunca volvería a avisarse.
--
-- El destinatario NO va adentro de la clave: va en el índice, junto a ella. Un
-- mismo hecho le llega a cada persona de administración que puede actuar sobre
-- él, y son filas distintas de la misma cosa. Meter el id del destinatario
-- dentro del texto de la clave habría escondido en un string lo que la tabla ya
-- sabe decir en una columna.
--
--
-- NULLABLE, Y EL ÍNDICE ES PARCIAL
--
-- Los avisos que escribe una persona resolviendo algo —los del Módulo 4 y 5:
-- te aprobaron la sala, te movieron la clase— NO llevan clave y no deben
-- llevarla. Ahí el hecho ES la acción de alguien: si administración aprueba dos
-- pedidos parecidos, son dos avisos y los dos tienen que llegar. La
-- deduplicación es una propiedad de lo que se dispara solo, no de la tabla.
--
-- Por eso la columna es NULL-able y el índice es parcial. Un índice único común
-- tampoco habría fallado —en Postgres los NULL no chocan entre sí— pero el
-- índice parcial además NO INDEXA esas filas, que son la enorme mayoría, y deja
-- escrito en el esquema que la regla aplica a un subconjunto.
-- =============================================================================

ALTER TABLE notificacion
    ADD COLUMN clave_evento VARCHAR(200);

CREATE UNIQUE INDEX notificacion_clave_evento_unica
    ON notificacion (id_usuario_destino, clave_evento)
    WHERE clave_evento IS NOT NULL;

COMMENT ON COLUMN notificacion.clave_evento IS
    'Identifica el HECHO avisado, no la corrida: la misma situación da siempre '
    'la misma clave, así el disparador automático puede correr dos veces el '
    'mismo día sin duplicar la bandeja. NULL en los avisos que escribe una '
    'persona al resolver algo (M4, M5): ahí dos acciones parecidas son dos '
    'avisos distintos y los dos tienen que llegar.';

COMMENT ON INDEX notificacion_clave_evento_unica IS
    'La autoridad de la deduplicación. Preguntar antes de insertar no alcanza y '
    'este proyecto ya lo midió con el email de usuario: entre la pregunta y la '
    'respuesta se mete otra corrida. El servicio igual pregunta primero, pero '
    'para no intentar cien inserts que ya están; quien garantiza es este índice.';
