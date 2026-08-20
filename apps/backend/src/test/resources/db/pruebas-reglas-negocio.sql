-- =============================================================================
-- Pruebas de las reglas de negocio de la base — La Juanita Studio
--
-- CÓMO EJECUTARLO (base descartable, no toca la de desarrollo):
--
--   docker compose up -d
--   ./scripts/pruebas-sql.sh
--
-- Ese script corre ESTE archivo y el adversarial, cada uno sobre una base nueva
-- con todas las migraciones aplicadas, y **sale con código distinto de cero si
-- algún caso falla**. Corre también en CI (`.github/workflows/ci.yml`).
--
-- Última corrida: 2026-08-19, 157/157 sobre el esquema V1..V13.
--
-- ESTA CABECERA YA NO LLEVA LA LISTA DE MIGRACIONES, y es a propósito. Antes
-- estaban acá los nueve comandos con las ocho migraciones nombradas una por
-- una, repetidos en el archivo hermano: agregar una migración era acordarse de
-- editar tres lugares, y ya falló dos veces —con V4 las pruebas se editaron y
-- no se corrieron, y con V6 esta cabecera se quedó en V5 mientras la otra ya
-- decía V6—. El script lee el directorio de migraciones y las aplica en orden
-- de versión, así que **una migración nueva entra en la corrida sola** y no hay
-- lista que se pueda desactualizar. Correr estos casos contra un esquema que no
-- es el del proyecto no prueba nada, y no avisa.
--
-- Al final imprime el resumen y la lista de casos que no se comportaron como
-- se esperaba. Si esa lista sale vacía, pasaron todos.
--
-- -----------------------------------------------------------------------------
-- DOS DECISIONES DE DISEÑO DE ESTAS PRUEBAS, APRENDIDAS A LOS GOLPES:
--
-- 1) NO se hardcodean IDs. Un INSERT rechazado igual consume el número de la
--    secuencia, así que después de unos cuantos casos negativos los IDs dejan
--    de ser correlativos. Todo se busca por clave natural (email, fecha+sala,
--    nombre del track).
--
-- 2) Un caso 'ANDA' exige que haya cambiado AL MENOS UNA FILA. Sin esto, un
--    UPDATE que no encuentra nada no lanza error y el test pasa sin haber
--    probado absolutamente nada: el falso positivo más fácil de comerse.
-- =============================================================================

\set ON_ERROR_STOP off
\pset pager off

CREATE TABLE IF NOT EXISTS _resultado (
    nro       text,
    caso      text,
    esperado  text,
    ok        boolean,
    detalle   text
);

CREATE OR REPLACE FUNCTION probar(nro text, caso text, esperado text, sentencia text)
RETURNS void AS $fn$
DECLARE
    hubo_error boolean := false;
    filas      integer := 0;
    msg        text    := '';
BEGIN
    BEGIN
        EXECUTE sentencia;
        GET DIAGNOSTICS filas = ROW_COUNT;
    EXCEPTION WHEN others THEN
        hubo_error := true;
        msg := SQLERRM;
    END;

    IF esperado = 'ANDA' THEN
        -- Tiene que no fallar Y haber tocado algo.
        INSERT INTO _resultado VALUES (
            nro, caso, esperado,
            (NOT hubo_error AND filas > 0),
            CASE WHEN hubo_error THEN 'ERROR: '||msg
                 WHEN filas = 0  THEN 'no afecto ninguna fila (falso positivo)'
                 ELSE filas||' fila(s)' END);
    ELSE
        INSERT INTO _resultado VALUES (
            nro, caso, esperado, hubo_error,
            CASE WHEN hubo_error THEN 'rechazado ok'
                 ELSE 'PASO cuando deberia haber fallado' END);
    END IF;
END; $fn$ LANGUAGE plpgsql;


-- =============================================================================
-- SEMILLA
-- =============================================================================
INSERT INTO usuario (nombre,apellido,email,password_hash,rol) VALUES
 ('Micaela','Prueba','mica@test.local','x','STAFF'),
 ('Ghezz','Prueba','ghezz@test.local','x','STAFF'),
 ('Juan','Prueba','juan@test.local','x','USUARIO'),
 ('Ana','Prueba','ana@test.local','x','USUARIO');

INSERT INTO profesor (id_usuario) SELECT id_usuario FROM usuario WHERE email='ghezz@test.local';
INSERT INTO alumno (id_usuario)   SELECT id_usuario FROM usuario WHERE email IN ('juan@test.local','ana@test.local');

-- Inscripción de Juan a DJ, y de Ana a DJ.
INSERT INTO inscripcion (id_alumno,id_profesor,disciplina,clases_contratadas,precio_total)
SELECT a.id_alumno, (SELECT id_profesor FROM profesor LIMIT 1), 'DJ', 8, 400000
FROM alumno a JOIN usuario u ON u.id_usuario=a.id_usuario WHERE u.email='juan@test.local';

INSERT INTO inscripcion (id_alumno,id_profesor,disciplina,clases_contratadas,precio_total)
SELECT a.id_alumno, (SELECT id_profesor FROM profesor LIMIT 1), 'DJ', 8, 400000
FROM alumno a JOIN usuario u ON u.id_usuario=a.id_usuario WHERE u.email='ana@test.local';

-- Atajos legibles para el resto del archivo.
CREATE VIEW v AS SELECT
 (SELECT id_usuario FROM usuario WHERE email='juan@test.local')  AS u_juan,
 (SELECT id_usuario FROM usuario WHERE email='ana@test.local')   AS u_ana,
 (SELECT id_usuario FROM usuario WHERE email='mica@test.local')  AS u_mica,
 (SELECT id_profesor FROM profesor LIMIT 1)                      AS prof,
 (SELECT a.id_alumno FROM alumno a JOIN usuario u USING(id_usuario) WHERE u.email='juan@test.local') AS al_juan,
 (SELECT a.id_alumno FROM alumno a JOIN usuario u USING(id_usuario) WHERE u.email='ana@test.local')  AS al_ana,
 (SELECT i.id_inscripcion FROM inscripcion i JOIN alumno a USING(id_alumno) JOIN usuario u USING(id_usuario) WHERE u.email='juan@test.local' AND i.disciplina='DJ') AS ins_juan,
 (SELECT i.id_inscripcion FROM inscripcion i JOIN alumno a USING(id_alumno) JOIN usuario u USING(id_usuario) WHERE u.email='ana@test.local'  AND i.disciplina='DJ') AS ins_ana,
 (SELECT id_sala FROM sala WHERE nombre_sala='Sala 1')              AS sala1,
 (SELECT id_sala FROM sala WHERE nombre_sala='Sala 2')              AS sala2,
 (SELECT id_sala FROM sala WHERE nombre_sala='Cabina de grabación') AS cabina,
 (SELECT id_tipo_uso FROM tipo_uso WHERE codigo='CLASE_DJ')         AS u_clase,
 (SELECT id_tipo_uso FROM tipo_uso WHERE codigo='MENTORIA')         AS u_mentoria,
 (SELECT id_tipo_uso FROM tipo_uso WHERE codigo='ALQUILER_CABINA')  AS u_alquiler,
 (SELECT id_tipo_uso FROM tipo_uso WHERE codigo='GRABACION_SET')    AS u_grabacion;


-- -----------------------------------------------------------------------------
-- LA SEÑA, Y POR QUÉ CASI TODA RESERVA DE ESTE ARCHIVO LA LLEVA  (V10)
--
-- Desde `V10` ninguna reserva existe sin dinero detrás, y se verifica **al
-- COMMIT** con un CONSTRAINT TRIGGER diferido. Acá eso pega de una forma que hay
-- que entender antes de agregar un caso:
--
-- psql está en autocommit, así que **cada `SELECT probar(...)` es su propia
-- transacción**. El chequeo diferido corre al cerrarla, o sea AFUERA del bloque
-- EXCEPTION de `probar()` — y el error se lleva puesto también el
-- `INSERT INTO _resultado`. El caso no falla: **desaparece del resumen**, y los
-- que dependían de su fila reportan agujeros que no existen. Se midió: 8 casos
-- de la suite adversarial acusaron *"EL AGUJERO VOLVIO"* por esto.
--
-- Entonces: **toda reserva que se espera que ANDE entra con su seña, en la misma
-- sentencia**, con un CTE. Las que se esperan FALLA no la necesitan — las rechaza
-- un EXCLUDE o un trigger BEFORE antes del COMMIT, así que no dejan fila y al
-- diferido no le queda nada que mirar.
--
-- El CTE tiene la reserva ADENTRO y el `SELECT` final afuera a propósito: así el
-- ROW_COUNT que ve `probar()` sigue saliendo de la reserva. Si el INSERT no
-- afecta nada, `nueva` queda vacía, el SELECT devuelve 0 filas y el caso 'ANDA'
-- falla como debe — la regla 2 de la cabecera de este archivo sigue en pie.
--
-- La seña EN SÍ se prueba en la sección "LA SEÑA" del final, donde el chequeo se
-- fuerza con `SET CONSTRAINTS ... IMMEDIATE` para poder verlo dentro de un caso.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sena(p_id_reserva BIGINT) RETURNS BIGINT AS $$
    INSERT INTO pago (id_usuario, id_reserva, monto, medio_pago, concepto)
    SELECT (SELECT u_mica FROM v), p_id_reserva, 1, 'EFECTIVO', 'sena de prueba'
    RETURNING id_reserva;
$$ LANGUAGE sql;


-- =============================================================================
-- SALAS Y RESERVAS — la regla más crítica del sistema
-- =============================================================================
SELECT probar('01','reserva normal en Sala 1','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,id_profesor,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,prof,'2026-09-01','10:00','11:30' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

SELECT probar('02','otra reserva SOLAPADA en la misma sala','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,'2026-09-01','11:00','12:00' FROM v$q$);

SELECT probar('03','misma hora en otra sala','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_clase,'2026-09-01','11:00','12:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

SELECT probar('04','reserva pegada, sin solapar (11:30-13:00)','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,'2026-09-01','11:30','13:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

SELECT probar('05','grabar un set en la Sala 1','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_grabacion,'2026-09-02','15:00','17:00' FROM v$q$);

SELECT probar('06','mentoria en la cabina de grabacion','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT cabina,u_mentoria,'2026-09-02','15:00','17:00' FROM v$q$);

SELECT probar('07','alquiler de cabina en la cabina de grabacion','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT cabina,u_alquiler,'2026-09-02','15:00','17:00' FROM v$q$);

SELECT probar('08','grabar un set en la cabina','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT cabina,u_grabacion,'2026-09-02','15:00','17:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

SELECT probar('09','hora_fin anterior a hora_inicio','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_clase,'2026-09-03','12:00','10:00' FROM v$q$);

SELECT probar('10','sala inexistente','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT 9999,u_clase,'2026-09-03','10:00','12:00' FROM v$q$);


-- =============================================================================
-- REPROGRAMACIÓN — ninguna clase se pierde
-- =============================================================================
-- Desde V7 §2, cambiar el estado de una reserva exige decir quién lo hizo.
SELECT probar('11','marcar una clase como REPROGRAMADA','ANDA',
 $q$UPDATE reserva SET estado='REPROGRAMADA',
                      id_usuario_modifico=(SELECT u_mica FROM v)
    WHERE fecha='2026-09-01' AND hora_inicio='10:00'
      AND id_sala=(SELECT sala1 FROM v)$q$);

SELECT probar('12','la franja reprogramada queda libre','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,id_profesor,fecha,hora_inicio,hora_fin,id_reserva_recupera)
    SELECT v.sala1,v.u_clase,v.prof,'2026-09-08','10:00','11:30',
           (SELECT id_reserva FROM reserva WHERE estado='REPROGRAMADA' LIMIT 1) FROM v
    RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

SELECT probar('13','dos reservas recuperan la MISMA clase','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin,id_reserva_recupera)
    SELECT v.sala2,v.u_clase,'2026-09-20','10:00','11:30',
           (SELECT id_reserva FROM reserva WHERE estado='REPROGRAMADA' LIMIT 1) FROM v$q$);

SELECT probar('14','una reserva que se recupera a si misma','FALLA',
 $q$UPDATE reserva SET id_reserva_recupera=id_reserva WHERE fecha='2026-09-08'$q$);


-- =============================================================================
-- BLOQUEOS DE SALA
-- =============================================================================
SELECT probar('15','bloquear una sala libre','ANDA',
 $q$INSERT INTO bloqueo_sala (id_sala,fecha_inicio,fecha_fin,motivo)
    SELECT sala2,'2026-10-05','2026-10-05','Mantenimiento' FROM v$q$);

SELECT probar('16','reservar dentro de una sala bloqueada','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_clase,'2026-10-05','10:00','11:30' FROM v$q$);

SELECT probar('17','bloquear una sala que ya tiene reserva activa','FALLA',
 $q$INSERT INTO bloqueo_sala (id_sala,fecha_inicio,fecha_fin,motivo)
    SELECT cabina,'2026-09-02','2026-09-02','Obra' FROM v$q$);


-- =============================================================================
-- INSCRIPCIONES
-- =============================================================================
SELECT probar('18','segunda inscripcion de DJ activa para el mismo alumno','FALLA',
 $q$INSERT INTO inscripcion (id_alumno,disciplina,clases_contratadas,precio_total)
    SELECT al_juan,'DJ',8,500000 FROM v$q$);

SELECT probar('19','mentoria en paralelo al curso de DJ','ANDA',
 $q$INSERT INTO inscripcion (id_alumno,id_profesor,disciplina,clases_contratadas,precio_total)
    SELECT al_juan,prof,'MENTORIA',4,200000 FROM v$q$);

SELECT probar('20','inscripcion con 0 clases','FALLA',
 $q$INSERT INTO inscripcion (id_alumno,disciplina,clases_contratadas,precio_total)
    SELECT al_ana,'PRODUCCION',0,100000 FROM v$q$);

SELECT probar('21','inscripcion en USD sin cotizacion','FALLA',
 $q$INSERT INTO inscripcion (id_alumno,disciplina,clases_contratadas,precio_total,moneda)
    SELECT al_ana,'PRODUCCION',8,1000,'USD' FROM v$q$);

SELECT probar('22','disciplina inexistente','FALLA',
 $q$INSERT INTO inscripcion (id_alumno,disciplina,clases_contratadas,precio_total)
    SELECT al_ana,'CANTO',8,100000 FROM v$q$);


-- =============================================================================
-- PARTICIPANTES / CLASES GRUPALES
-- =============================================================================
SELECT probar('23','clase grupal con dos alumnos','ANDA',
 $q$INSERT INTO reserva_participante (id_reserva,id_usuario,id_inscripcion)
    SELECT (SELECT id_reserva FROM reserva WHERE fecha='2026-09-08'), v.u_juan, v.ins_juan FROM v
    UNION ALL
    SELECT (SELECT id_reserva FROM reserva WHERE fecha='2026-09-08'), v.u_ana,  v.ins_ana  FROM v$q$);

SELECT probar('24','el mismo alumno anotado dos veces en la clase','FALLA',
 $q$INSERT INTO reserva_participante (id_reserva,id_usuario)
    SELECT (SELECT id_reserva FROM reserva WHERE fecha='2026-09-08'), u_juan FROM v$q$);

SELECT probar('25','descontarle la clase a la inscripcion de OTRO alumno','FALLA',
 $q$INSERT INTO reserva_participante (id_reserva,id_usuario,id_inscripcion)
    SELECT (SELECT id_reserva FROM reserva WHERE fecha='2026-09-01' AND hora_inicio='11:00'), u_juan, ins_ana FROM v$q$);

SELECT probar('26','participante sin inscripcion (caso alquiler)','ANDA',
 $q$INSERT INTO reserva_participante (id_reserva,id_usuario)
    SELECT (SELECT id_reserva FROM reserva WHERE fecha='2026-09-01' AND hora_inicio='11:00'), u_ana FROM v$q$);

SELECT probar('27','estado de asistencia invalido','FALLA',
 $q$INSERT INTO reserva_participante (id_reserva,id_usuario,estado_asistencia)
    SELECT (SELECT id_reserva FROM reserva WHERE fecha='2026-09-02'), u_juan,'QUIZAS' FROM v$q$);


-- =============================================================================
-- NOTAS PRIVADAS DEL PROFESOR
-- =============================================================================
SELECT probar('28','nota sobre una clase del propio alumno','ANDA',
 $q$INSERT INTO nota_profesor (id_profesor,id_alumno,id_participacion,contenido)
    SELECT v.prof, v.al_juan, rp.id_participacion, 'Avanza bien con el beatmatching'
    FROM v JOIN reserva_participante rp ON rp.id_usuario=v.u_juan AND rp.id_inscripcion=v.ins_juan LIMIT 1$q$);

SELECT probar('29','nota de un alumno colgada de la clase de otro','FALLA',
 $q$INSERT INTO nota_profesor (id_profesor,id_alumno,id_participacion,contenido)
    SELECT v.prof, v.al_juan, rp.id_participacion, 'nota cruzada'
    FROM v JOIN reserva_participante rp ON rp.id_usuario=v.u_ana AND rp.id_inscripcion=v.ins_ana LIMIT 1$q$);

SELECT probar('30','nota general, sin clase asociada','ANDA',
 $q$INSERT INTO nota_profesor (id_profesor,id_alumno,contenido)
    SELECT prof,al_juan,'Nota general de seguimiento' FROM v$q$);


-- =============================================================================
-- PAGOS
-- =============================================================================
SELECT probar('31','registrar la sena de un curso','ANDA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,monto,medio_pago,estado_pago,concepto)
    SELECT u_juan,ins_juan,150000,'TRANSFERENCIA','SENADO','Sena curso DJ' FROM v$q$);

SELECT probar('32','pago que no dice que salda','FALLA',
 $q$INSERT INTO pago (id_usuario,monto,medio_pago) SELECT u_juan,100000,'EFECTIVO' FROM v$q$);

SELECT probar('33','pago apuntando a DOS destinos a la vez','FALLA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,id_reserva,monto,medio_pago)
    SELECT v.u_juan,v.ins_juan,(SELECT id_reserva FROM reserva LIMIT 1),50000,'EFECTIVO' FROM v$q$);

SELECT probar('34','pago en USD sin cotizacion','FALLA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,monto,moneda,medio_pago)
    SELECT u_juan,ins_juan,100,'USD','PAYPAL' FROM v$q$);

SELECT probar('35','pago en USD con cotizacion','ANDA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,monto,moneda,cotizacion_dolar,medio_pago)
    SELECT u_juan,ins_juan,100,'USD',1450.50,'PAYPAL' FROM v$q$);

SELECT probar('36','descuento sin justificacion escrita','FALLA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,monto,medio_pago,descuento_porcentaje)
    SELECT u_juan,ins_juan,100000,'EFECTIVO',20 FROM v$q$);

SELECT probar('37','descuento negativo','FALLA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,monto,medio_pago,descuento_porcentaje,motivo_descuento)
    SELECT u_juan,ins_juan,100000,'EFECTIVO',-5,'x' FROM v$q$);

-- El descuento es un PORCENTAJE: cargar 20000 ahí es el error clásico de
-- confundirlo con un importe. Tiene que rebotar.
SELECT probar('38','descuento mayor a 100 (cargado como si fuera importe)','FALLA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,monto,medio_pago,descuento_porcentaje,motivo_descuento)
    SELECT u_juan,ins_juan,80000,'EFECTIVO',20000,'Ex alumno' FROM v$q$);

SELECT probar('38b','descuento del 20% con motivo','ANDA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,monto,medio_pago,descuento_porcentaje,motivo_descuento)
    SELECT u_juan,ins_juan,80000,'EFECTIVO',20,'Ex alumno' FROM v$q$);

SELECT probar('38c','descuento del 100% (beca completa)','ANDA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,monto,medio_pago,descuento_porcentaje,motivo_descuento)
    SELECT u_juan,ins_juan,1,'EFECTIVO',100,'Beca' FROM v$q$);

SELECT probar('39','monto en cero','FALLA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,monto,medio_pago)
    SELECT u_juan,ins_juan,0,'EFECTIVO' FROM v$q$);

SELECT probar('40','medio de pago inexistente','FALLA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,monto,medio_pago)
    SELECT u_juan,ins_juan,1000,'CRIPTO' FROM v$q$);


-- =============================================================================
-- MIX & MASTERING — el candado del premaster
-- =============================================================================
INSERT INTO trabajo_mastering (nombre_cliente_externo,tipo_trabajo,nombre_track,estado)
 VALUES ('Bob Tosh','MASTER','Vente','EN_PROCESO');
INSERT INTO trabajo_mastering (nombre_cliente_externo,tipo_trabajo,nombre_track,estado)
 VALUES ('Joe','MIX','Segundo Track','ENTREGADO');

SELECT probar('41','trabajo sin cliente identificado','FALLA',
 $q$INSERT INTO trabajo_mastering (tipo_trabajo,nombre_track) VALUES ('MIX','Anonimo')$q$);

SELECT probar('42','liberar el premaster SIN pago registrado','FALLA',
 $q$UPDATE trabajo_mastering SET premaster_liberado=TRUE WHERE nombre_track='Vente'$q$);

SELECT probar('43','liberar sin pago pero SIN motivo','FALLA',
 $q$UPDATE trabajo_mastering SET premaster_liberado=TRUE, liberado_sin_pago=TRUE
    WHERE nombre_track='Vente'$q$);

SELECT probar('44','liberar sin pago CON motivo (la excepcion de Ghezz)','ANDA',
 $q$UPDATE trabajo_mastering SET premaster_liberado=TRUE, liberado_sin_pago=TRUE,
        motivo_liberacion='Cliente historico, arreglo a 30 dias'
    WHERE nombre_track='Vente'$q$);

-- Ahora el camino normal: se registra el pago y recién ahí se libera.
INSERT INTO pago (id_usuario,id_trabajo_mastering,monto,medio_pago,estado_pago)
SELECT v.u_juan, t.id_trabajo, 50000,'EFECTIVO','PAGADO'
FROM v, trabajo_mastering t WHERE t.nombre_track='Segundo Track';

SELECT probar('45','liberar el premaster CON pago registrado','ANDA',
 $q$UPDATE trabajo_mastering SET premaster_liberado=TRUE WHERE nombre_track='Segundo Track'$q$);

SELECT probar('46','el estado del trabajo retrocede','FALLA',
 $q$UPDATE trabajo_mastering SET estado='EN_PROCESO' WHERE nombre_track='Segundo Track'$q$);

SELECT probar('47','el estado del trabajo avanza','ANDA',
 $q$UPDATE trabajo_mastering SET estado='PAGADO' WHERE nombre_track='Segundo Track'$q$);

SELECT probar('48','cancelar desde cualquier estado','ANDA',
 $q$UPDATE trabajo_mastering SET estado='CANCELADO' WHERE nombre_track='Vente'$q$);

SELECT probar('49','tipo de trabajo invalido','FALLA',
 $q$INSERT INTO trabajo_mastering (nombre_cliente_externo,tipo_trabajo,nombre_track)
    VALUES ('X','REMASTER','T')$q$);


-- =============================================================================
-- SELLO DISCOGRÁFICO
-- =============================================================================
INSERT INTO artista (nombre_artistico) VALUES ('Ghezz');

SELECT probar('50','alta de release','ANDA',
 $q$INSERT INTO release (codigo_release,id_artista,nombre_release,estado)
    SELECT 'LJ020',id_artista,'Horizonte','CONFIRMADO' FROM artista WHERE nombre_artistico='Ghezz'$q$);

SELECT probar('51','codigo de release duplicado','FALLA',
 $q$INSERT INTO release (codigo_release,id_artista,nombre_release)
    SELECT 'LJ020',id_artista,'Otro' FROM artista WHERE nombre_artistico='Ghezz'$q$);

SELECT probar('52','el estado del release retrocede','FALLA',
 $q$UPDATE release SET estado='A_CONFIRMAR' WHERE codigo_release='LJ020'$q$);

SELECT probar('53','el estado del release avanza','ANDA',
 $q$UPDATE release SET estado='PUBLICADO' WHERE codigo_release='LJ020'$q$);

SELECT probar('54','estado de release invalido','FALLA',
 $q$UPDATE release SET estado='CANCELADO' WHERE codigo_release='LJ020'$q$);


-- =============================================================================
-- SOLICITUDES DE REPROGRAMACIÓN
-- =============================================================================
SELECT probar('55','crear una solicitud','ANDA',
 $q$INSERT INTO solicitud_reprogramacion (id_usuario,id_reserva,motivo)
    SELECT v.u_juan,(SELECT id_reserva FROM reserva LIMIT 1),'No puedo ese dia' FROM v$q$);

SELECT probar('56','aprobar sin dejar quien la resolvio','FALLA',
 $q$UPDATE solicitud_reprogramacion SET estado='APROBADA' WHERE estado='PENDIENTE'$q$);

SELECT probar('57','aprobar con responsable y fecha','ANDA',
 $q$UPDATE solicitud_reprogramacion SET estado='APROBADA',
        id_usuario_resuelve=(SELECT u_mica FROM v), fecha_resolucion=now()
    WHERE estado='PENDIENTE'$q$);


-- =============================================================================
-- USUARIOS, MATERIAL, VENTAS, BORRADOS
-- =============================================================================
SELECT probar('58','email duplicado con otra capitalizacion','FALLA',
 $q$INSERT INTO usuario (nombre,apellido,email,password_hash)
    VALUES ('Impostor','Prueba','JUAN@TEST.LOCAL','x')$q$);

SELECT probar('59','telefono duplicado','FALLA',
 $q$INSERT INTO usuario (nombre,apellido,email,telefono,password_hash) VALUES
    ('Uno','Prueba','uno@test.local','1155550000','x'),
    ('Dos','Prueba','dos@test.local','1155550000','x')$q$);

SELECT probar('60','rol inexistente','FALLA',
 $q$INSERT INTO usuario (nombre,apellido,email,password_hash,rol)
    VALUES ('X','Prueba','x@test.local','x','JEFE')$q$);

SELECT probar('61','material marcado grupal pero con alumno','FALLA',
 $q$INSERT INTO material (id_profesor,id_alumno,es_grupal,titulo,url_externa)
    SELECT prof,al_juan,TRUE,'Guia','http://x' FROM v$q$);

SELECT probar('62','material sin archivo ni link','FALLA',
 $q$INSERT INTO material (id_profesor,id_alumno,titulo)
    SELECT prof,al_juan,'Vacio' FROM v$q$);

SELECT probar('63','material grupal correcto','ANDA',
 $q$INSERT INTO material (id_profesor,es_grupal,titulo,url_externa)
    SELECT prof,TRUE,'Guia de armonicos','http://x' FROM v$q$);

SELECT probar('64','venta sin comprador identificado','FALLA',
 $q$INSERT INTO venta_equipo (id_usuario_vendedor,modelo_equipo,precio)
    SELECT u_mica,'CDJ-3000',2000000 FROM v$q$);

SELECT probar('65','venta a un comprador externo sin cuenta','ANDA',
 $q$INSERT INTO venta_equipo (id_usuario_vendedor,nombre_comprador_externo,modelo_equipo,precio)
    SELECT u_mica,'Cliente suelto','CDJ-3000',2000000 FROM v$q$);

SELECT probar('66','borrar un usuario que tiene historial','FALLA',
 $q$DELETE FROM usuario WHERE email='juan@test.local'$q$);

SELECT probar('67','borrar una sala en uso','FALLA',
 $q$DELETE FROM sala WHERE nombre_sala='Sala 1'$q$);


-- =============================================================================
-- BLOQUEOS CON HORARIO PARCIAL SOBRE VARIOS DÍAS  (V7 §3)
--
-- Es el agujero por el que se coló DB-03: los cuatro casos que cargaban un
-- `bloqueo_sala` en este archivo omitían las horas, así que tomaban los DEFAULT
-- 00:00/23:59 -- justo la combinación donde las dos definiciones de "bloqueo"
-- coincidían. Estos cuatro usan franja parcial en un rango de varios días, que
-- es el caso principal de la pantalla de bloqueo y el único que las distingue.
-- =============================================================================
SELECT probar('68','bloquear una sala de 9 a 13 toda una semana','ANDA',
 $q$INSERT INTO bloqueo_sala (id_sala,fecha_inicio,fecha_fin,hora_inicio,hora_fin,motivo)
    SELECT sala2,'2026-11-02','2026-11-08','09:00','13:00','Mantenimiento de manana' FROM v$q$);

SELECT probar('69','otro bloqueo en esos mismos dias pero de 19 a 23','ANDA',
 $q$INSERT INTO bloqueo_sala (id_sala,fecha_inicio,fecha_fin,hora_inicio,hora_fin,motivo)
    SELECT sala2,'2026-11-04','2026-11-05','19:00','23:00','Evento a la noche' FROM v$q$);

SELECT probar('70','un bloqueo que SI pisa dias y franja','FALLA',
 $q$INSERT INTO bloqueo_sala (id_sala,fecha_inicio,fecha_fin,hora_inicio,hora_fin,motivo)
    SELECT sala2,'2026-11-05','2026-11-06','10:00','12:00','Se pisa de verdad' FROM v$q$);

SELECT probar('71','reservar un dia bloqueado, pero fuera de la franja','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_clase,'2026-11-03','15:00','16:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

SELECT probar('72','reservar dentro de la franja bloqueada','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_clase,'2026-11-03','10:00','11:00' FROM v$q$);


-- =============================================================================
-- ANULAR UN PAGO DEJA RASTRO  (V7 §1)
-- =============================================================================
SELECT probar('73','pago para anular despues','ANDA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,monto,medio_pago,concepto)
    SELECT u_juan,ins_juan,120000,'EFECTIVO','pago que se va a anular' FROM v$q$);

SELECT probar('74','anular ese pago sin decir quien ni por que','FALLA',
 $q$UPDATE pago SET estado_pago='ANULADO' WHERE concepto='pago que se va a anular'$q$);

SELECT probar('75','anular con autor pero sin motivo','FALLA',
 $q$UPDATE pago SET estado_pago='ANULADO',
                  id_usuario_anula=(SELECT u_mica FROM v), fecha_anulacion=now()
    WHERE concepto='pago que se va a anular'$q$);

SELECT probar('76','anular con autor, fecha y motivo','ANDA',
 $q$UPDATE pago SET estado_pago='ANULADO',
                  id_usuario_anula=(SELECT u_mica FROM v), fecha_anulacion=now(),
                  motivo_anulacion='Cobrado dos veces por error'
    WHERE concepto='pago que se va a anular'$q$);

SELECT probar('77','marcar un comprobante invalido sin justificar','FALLA',
 $q$UPDATE pago SET comprobante_invalido=TRUE
    WHERE concepto='pago que se va a anular'$q$);


-- =============================================================================
-- EL HISTORIAL DE CLASES NO SE BORRA Y SE EDITA CON AUDITORÍA  (V7 §2)
--
-- La regla dura del Módulo 1 (`platform.md:275`). Es la que sostiene la
-- respuesta a "¿cuántas clases le quedan a Juan?".
-- =============================================================================
SELECT probar('78','borrar una participacion en una clase','FALLA',
 $q$DELETE FROM reserva_participante
    WHERE id_usuario=(SELECT u_juan FROM v)$q$);

SELECT probar('79','borrar una reserva entera','FALLA',
 $q$DELETE FROM reserva WHERE fecha='2026-09-08'$q$);

SELECT probar('80','cambiar la asistencia sin decir quien la cambio','FALLA',
 $q$UPDATE reserva_participante SET estado_asistencia='AUSENTE'
    WHERE id_usuario=(SELECT u_juan FROM v)$q$);

SELECT probar('81','cambiar la asistencia diciendo quien la cambio','ANDA',
 $q$UPDATE reserva_participante SET estado_asistencia='AUSENTE',
                                  id_usuario_modifico=(SELECT u_mica FROM v)
    WHERE id_usuario=(SELECT u_juan FROM v)$q$);

-- El sello de la edición lo pone la base, no quien edita: si lo eligiera el
-- cliente se podría antedatar, que es la mitad de lo que DB-07 señala.
SELECT probar('82','la edicion quedo sellada con fecha por la base','ANDA',
 $q$UPDATE reserva_participante SET observaciones='verificado'
    WHERE id_usuario=(SELECT u_juan FROM v)
      AND estado_asistencia='AUSENTE' AND fecha_modificacion IS NOT NULL$q$);

-- Tocar un campo que no es el historial no exige autor: corregir una nota
-- interna no es "editar el historial".
SELECT probar('83','editar solo las notas de una reserva, sin autor','ANDA',
 $q$UPDATE reserva SET notas='Traer pendrive' WHERE fecha='2026-09-08'$q$);


-- =============================================================================
-- SELLO DE CARGA EN LA VENTA DE EQUIPOS  (V7 §4)
-- =============================================================================
SELECT probar('84','toda venta queda con su fecha de carga','ANDA',
 $q$UPDATE venta_equipo SET notas='revisada'
    WHERE fecha_registro IS NOT NULL$q$);


-- =============================================================================
-- V9 — LAS REGLAS QUE CERRO LA §13 DE `platform.md`
--
-- Fechas 2027 a proposito: los casos de arriba usan 2026-09 a 2026-11 y estos
-- no tienen que pisarlas.
--
-- Recordatorio de V7 que cuesta caro olvidar: TODO UPDATE de `reserva` que
-- toque estado, fecha, horas o sala exige `id_usuario_modifico`. Sin eso el
-- trigger de auditoria rechaza el UPDATE ANTES de llegar a la regla que se
-- quiere probar, y el caso "pasa" por el motivo equivocado.
-- =============================================================================

-- --- 1. Un profesor no esta en dos salas a la vez (EXCLUDE) ------------------

SELECT probar('85','clase del profe en Sala 1','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,id_profesor,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,prof,'2027-03-01','10:00','12:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

SELECT probar('86','el MISMO profe en otra sala a la misma hora','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,id_profesor,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_clase,prof,'2027-03-01','11:00','13:00' FROM v$q$);

SELECT probar('87','el mismo profe mas tarde, en otra sala','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,id_profesor,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_clase,prof,'2027-03-01','15:00','16:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

-- Una reserva sin profesor -- un alquiler de cabina -- no ocupa la agenda de
-- nadie: si el NULL contara como un valor mas, dos reservas sin profesor
-- chocarian entre si. Son dos casos porque hacen falta las dos filas.
SELECT probar('88','reserva SIN profesor en la Sala 2','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_alquiler,'2027-03-01','08:00','09:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

SELECT probar('89','otra SIN profesor en la cabina, a la MISMA hora','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT cabina,u_grabacion,'2027-03-01','08:00','09:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

-- La otra sala ocupada a las 10, para los dos casos del alumno. La cabina solo
-- admite CLASE_DJ y GRABACION_SET: la matriz sala x uso sigue rigiendo.
SELECT probar('90','clase en la cabina a las 10','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT cabina,u_clase,'2027-03-01','10:00','12:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);


-- --- 1.b Un alumno tampoco (trigger, porque cruza dos tablas) ---------------

SELECT probar('91','Juan participa de la clase de las 10','ANDA',
 $q$INSERT INTO reserva_participante (id_reserva,id_usuario,id_inscripcion)
    SELECT r.id_reserva, v.u_juan, v.ins_juan FROM v, reserva r
    WHERE r.fecha='2027-03-01' AND r.hora_inicio='10:00' AND r.id_sala=v.sala1$q$);

SELECT probar('92','el MISMO Juan en otra sala a la misma hora','FALLA',
 $q$INSERT INTO reserva_participante (id_reserva,id_usuario)
    SELECT r.id_reserva, v.u_juan FROM v, reserva r
    WHERE r.fecha='2027-03-01' AND r.hora_inicio='10:00' AND r.id_sala=v.cabina$q$);

SELECT probar('93','OTRA alumna si puede estar en esa otra sala','ANDA',
 $q$INSERT INTO reserva_participante (id_reserva,id_usuario)
    SELECT r.id_reserva, v.u_ana FROM v, reserva r
    WHERE r.fecha='2027-03-01' AND r.hora_inicio='10:00' AND r.id_sala=v.cabina$q$);

-- El camino que se olvida: la clase no se mueve sola, se REPROGRAMA encima de
-- otra clase del mismo alumno. Sin el segundo trigger, esto entraba.
-- En la Sala 2, que a las 10:30 esta LIBRE. Si estuviera ocupada, el UPDATE de
-- abajo lo rechazaria el EXCLUDE de sala y el caso probaria otra cosa.
SELECT probar('94','clase suelta a las 18, en la Sala 2','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_clase,'2027-03-01','18:00','19:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

SELECT probar('95','Juan participa de la de las 18','ANDA',
 $q$INSERT INTO reserva_participante (id_reserva,id_usuario)
    SELECT r.id_reserva, v.u_juan FROM v, reserva r
    WHERE r.fecha='2027-03-01' AND r.hora_inicio='18:00'$q$);

SELECT probar('96','MOVER la de las 18 encima de la de las 10 de Juan','FALLA',
 $q$UPDATE reserva SET hora_inicio='10:30', hora_fin='11:30',
        id_usuario_modifico=(SELECT u_mica FROM v)
    WHERE fecha='2027-03-01' AND hora_inicio='18:00'$q$);

SELECT probar('97','moverla a un hueco libre si anda','ANDA',
 $q$UPDATE reserva SET hora_inicio='20:00', hora_fin='21:00',
        id_usuario_modifico=(SELECT u_mica FROM v)
    WHERE fecha='2027-03-01' AND hora_inicio='18:00'$q$);


-- --- 2. `egreso` y `venta_equipo` se anulan, y por eso ya no se borran ------

SELECT probar('98','un egreso cualquiera','ANDA',
 $q$INSERT INTO egreso (monto,concepto) VALUES (15000,'Luz de agosto')$q$);

SELECT probar('99','anular el egreso SIN motivo','FALLA',
 $q$UPDATE egreso SET anulado=TRUE,
        id_usuario_anula=(SELECT u_mica FROM v), fecha_anulacion=now()
    WHERE concepto='Luz de agosto'$q$);

SELECT probar('100','anular el egreso con autor, fecha y motivo','ANDA',
 $q$UPDATE egreso SET anulado=TRUE,
        id_usuario_anula=(SELECT u_mica FROM v), fecha_anulacion=now(),
        motivo_anulacion='Cargado dos veces'
    WHERE concepto='Luz de agosto'$q$);

SELECT probar('101','borrar un egreso','FALLA',
 $q$DELETE FROM egreso WHERE concepto='Luz de agosto'$q$);

SELECT probar('102','anular una venta con firma completa','ANDA',
 $q$UPDATE venta_equipo SET anulada=TRUE,
        id_usuario_anula=(SELECT u_mica FROM v), fecha_anulacion=now(),
        motivo_anulacion='La venta se cayo'
    WHERE id_venta=(SELECT min(id_venta) FROM venta_equipo)$q$);

SELECT probar('103','borrar una venta','FALLA',
 $q$DELETE FROM venta_equipo WHERE id_venta=(SELECT min(id_venta) FROM venta_equipo)$q$);


-- --- 3. El nivel no retrocede sin firma -------------------------------------

SELECT probar('104','poner el nivel de una inscripcion que no lo tenia','ANDA',
 $q$UPDATE inscripcion SET nivel='INTERMEDIO'
    WHERE id_inscripcion=(SELECT ins_juan FROM v)$q$);

SELECT probar('105','SUBIR de nivel no exige firma','ANDA',
 $q$UPDATE inscripcion SET nivel='AVANZADO'
    WHERE id_inscripcion=(SELECT ins_juan FROM v)$q$);

SELECT probar('106','BAJAR de nivel sin firma','FALLA',
 $q$UPDATE inscripcion SET nivel='INICIAL'
    WHERE id_inscripcion=(SELECT ins_juan FROM v)$q$);

SELECT probar('107','bajar con motivo en blanco','FALLA',
 $q$UPDATE inscripcion SET nivel='INICIAL',
        id_usuario_baja_nivel=(SELECT u_mica FROM v),
        fecha_baja_nivel=now(), motivo_baja_nivel='   '
    WHERE id_inscripcion=(SELECT ins_juan FROM v)$q$);

SELECT probar('108','bajar con autor, fecha y motivo','ANDA',
 $q$UPDATE inscripcion SET nivel='INICIAL',
        id_usuario_baja_nivel=(SELECT u_mica FROM v),
        fecha_baja_nivel=now(), motivo_baja_nivel='No alcanzo el nivel'
    WHERE id_inscripcion=(SELECT ins_juan FROM v)$q$);


-- --- 4. Una sala desactivada no acepta reservas nuevas a futuro -------------

SELECT probar('109','desactivar la Sala 2','ANDA',
 $q$UPDATE sala SET activa=FALSE WHERE id_sala=(SELECT sala2 FROM v)$q$);

SELECT probar('110','reserva NUEVA a futuro en una sala desactivada','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_clase,'2027-06-01','10:00','11:00' FROM v$q$);

-- Desactivar mira para adelante: cargar una clase que ya se dio no se impide.
SELECT probar('111','reserva PASADA en una sala desactivada','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_clase,'2020-06-01','10:00','11:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

-- Y una reserva legitima que ya estaba cargada no queda congelada.
SELECT probar('112','editar una reserva ya cargada en la sala desactivada','ANDA',
 $q$UPDATE reserva SET notas='confirmada por WhatsApp'
    WHERE fecha='2027-03-01' AND hora_inicio='15:00'$q$);

SELECT probar('113','volver a activar la Sala 2','ANDA',
 $q$UPDATE sala SET activa=TRUE WHERE id_sala=(SELECT sala2 FROM v)$q$);


-- --- 5. No se consumen mas clases que las contratadas -----------------------

-- Inscripcion corta a proposito: con 8 harian falta nueve casos para llegar al
-- limite. Con 1, el limite se prueba en dos.
SELECT probar('114','inscripcion de Ana a PRODUCCION, UNA sola clase','ANDA',
 $q$INSERT INTO inscripcion (id_alumno,disciplina,clases_contratadas,precio_total)
    SELECT al_ana,'PRODUCCION',1,50000 FROM v$q$);

SELECT probar('115','primera clase de esa inscripcion','ANDA',
 $q$INSERT INTO reserva_participante (id_reserva,id_usuario,id_inscripcion)
    SELECT r.id_reserva, v.u_ana,
           (SELECT id_inscripcion FROM inscripcion
            WHERE id_alumno=v.al_ana AND disciplina='PRODUCCION')
    FROM v, reserva r WHERE r.fecha='2027-03-01' AND r.hora_inicio='15:00'$q$);

SELECT probar('116','SEGUNDA clase contra una inscripcion de una','FALLA',
 $q$INSERT INTO reserva_participante (id_reserva,id_usuario,id_inscripcion)
    SELECT r.id_reserva, v.u_ana,
           (SELECT id_inscripcion FROM inscripcion
            WHERE id_alumno=v.al_ana AND disciplina='PRODUCCION')
    FROM v, reserva r WHERE r.fecha='2027-03-01' AND r.hora_inicio='20:00'$q$);

-- El camino de atras: cancelar libera la clase y volver a activarla la reclama.
-- Sin el segundo trigger, cancelar y descancelar era la forma de pasarse del
-- limite sin que nada mirara.
SELECT probar('117','cancelar la clase de las 15 libera la unica contratada','ANDA',
 $q$UPDATE reserva SET estado='CANCELADA',
        id_usuario_modifico=(SELECT u_mica FROM v)
    WHERE fecha='2027-03-01' AND hora_inicio='15:00'$q$);

SELECT probar('118','ahora si entra la otra clase','ANDA',
 $q$INSERT INTO reserva_participante (id_reserva,id_usuario,id_inscripcion)
    SELECT r.id_reserva, v.u_ana,
           (SELECT id_inscripcion FROM inscripcion
            WHERE id_alumno=v.al_ana AND disciplina='PRODUCCION')
    FROM v, reserva r WHERE r.fecha='2027-03-01' AND r.hora_inicio='20:00'$q$);

SELECT probar('119','DESCANCELAR la de las 15 dejaria 2 sobre 1','FALLA',
 $q$UPDATE reserva SET estado='CONFIRMADA',
        id_usuario_modifico=(SELECT u_mica FROM v)
    WHERE fecha='2027-03-01' AND hora_inicio='15:00'$q$);


-- =============================================================================
-- LA SEÑA — P8 / DB-04a  (V10)
--
-- La última regla que vivía en un documento y no en el código. "Todo se seña
-- antes, todo" no significa un pago por reserva: significa que **ninguna reserva
-- existe sin dinero detrás**, y ese dinero llega por dos caminos que cuentan
-- igual — un `pago` apuntando a la reserva, o la inscripción que cubre la clase.
--
-- CÓMO SE PRUEBA UN CHEQUEO DIFERIDO, que es lo no obvio de esta sección: el
-- trigger corre al COMMIT, o sea afuera de `probar()`. `SET CONSTRAINTS
-- reserva_con_sena IMMEDIATE` ejecuta en el momento lo que está pendiente, y así
-- el rechazo cae adentro del EXCEPTION y el caso se puede contar.
--
-- Los casos 'ANDA' terminan con un `SELECT` sobre `reserva` a propósito: sin él
-- el ROW_COUNT que ve `probar()` saldría del `SET CONSTRAINTS` (cero filas) y el
-- caso fallaría sin motivo. Y de paso el SELECT afirma lo que importa — que la
-- fila siguió ahí después de que el chequeo corriera.
-- =============================================================================

-- Un alumno propio: las inscripciones de Juan y Ana ya consumieron clases más
-- arriba, y una que se queda sin cupo haría fallar estos casos por `V9` §5 en vez
-- de por la seña.
INSERT INTO usuario (nombre,apellido,email,password_hash,rol)
VALUES ('Sena','Prueba','sena@test.local','x','USUARIO');
INSERT INTO alumno (id_usuario) SELECT id_usuario FROM usuario WHERE email='sena@test.local';
INSERT INTO inscripcion (id_alumno,id_profesor,disciplina,clases_contratadas,precio_total)
SELECT a.id_alumno,(SELECT id_profesor FROM profesor LIMIT 1),'DJ',8,400000
FROM alumno a JOIN usuario u USING(id_usuario) WHERE u.email='sena@test.local';

CREATE VIEW s AS SELECT
 (SELECT id_usuario FROM usuario WHERE email='sena@test.local') AS u_sena,
 (SELECT i.id_inscripcion FROM inscripcion i JOIN alumno a USING(id_alumno)
    JOIN usuario u USING(id_usuario) WHERE u.email='sena@test.local') AS ins_sena,
 (SELECT id_tipo_uso FROM tipo_uso WHERE codigo='MIX_MASTERING') AS u_mix;


SELECT probar('120','reservar sin NADA de plata detras','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,'2029-04-02','10:00','11:30' FROM v;
    SET CONSTRAINTS reserva_con_sena IMMEDIATE$q$);

-- Camino 1: el pago apunta a la reserva. Es el alquiler de cabina y la grabación.
SELECT probar('121','reservar con un pago apuntando a la reserva','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_alquiler,'2029-04-03','10:00','11:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva;
    SET CONSTRAINTS reserva_con_sena IMMEDIATE;
    SELECT 1 FROM reserva WHERE fecha='2029-04-03'$q$);

-- Camino 2: la inscripción cubre la clase. **El alumno que ya pagó su curso no
-- paga una seña por cada clase**: sería cobrarle dos veces.
SELECT probar('122','clase cubierta por la inscripcion del que asiste','ANDA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,'2029-04-04','10:00','11:30' FROM v;
    INSERT INTO reserva_participante (id_reserva,id_usuario,id_inscripcion)
    SELECT r.id_reserva,s.u_sena,s.ins_sena FROM s, reserva r WHERE r.fecha='2029-04-04';
    SET CONSTRAINTS reserva_con_sena IMMEDIATE;
    SELECT 1 FROM reserva WHERE fecha='2029-04-04'$q$);

-- Y el que no alcanza: participar no es pagar. Sin inscripción detrás, esa clase
-- no tiene plata -- es justo el alumno al que habría que cobrarle.
SELECT probar('123','clase con participante pero SIN inscripcion','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,'2029-04-05','10:00','11:30' FROM v;
    INSERT INTO reserva_participante (id_reserva,id_usuario)
    SELECT r.id_reserva,s.u_sena FROM s, reserva r WHERE r.fecha='2029-04-05';
    SET CONSTRAINTS reserva_con_sena IMMEDIATE$q$);

-- La única excepción, y va por catálogo y no por estado: lo decide Ghezz caso por
-- caso, y el relevamiento ya lo mostraba fiado.
SELECT probar('124','MIX_MASTERING sin sena (la excepcion de Ghezz)','ANDA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT v.sala1,s.u_mix,'2029-04-06','10:00','11:00' FROM v, s;
    SET CONSTRAINTS reserva_con_sena IMMEDIATE;
    SELECT 1 FROM reserva WHERE fecha='2029-04-06'$q$);

-- Un pago anulado no es plata. Si contara, anular la seña dejaría la reserva sin
-- nada detrás y el chequeo diría que sí la tiene.
SELECT probar('125','la reserva cuyo unico pago esta ANULADO','FALLA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_alquiler,'2029-04-07','10:00','11:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva;
    UPDATE pago SET estado_pago='ANULADO',
                    id_usuario_anula=(SELECT u_mica FROM v), fecha_anulacion=now(),
                    motivo_anulacion='Nunca entro la transferencia'
     WHERE id_reserva=(SELECT id_reserva FROM reserva WHERE fecha='2029-04-07');
    SET CONSTRAINTS reserva_con_sena IMMEDIATE$q$);


-- -----------------------------------------------------------------------------
-- LA SEÑA SE DEVUELVE  (V11)
--
-- `V10` cerraba solo el nacimiento de la reserva: la invariante se establecía al
-- crear y se rompía después anulando el pago. `V11` la termina, con la política
-- que decidió Ignacio el 2026-08-17: **si se cancela una reserva, la seña se
-- devuelve**. La regla completa queda "toda reserva que OCUPA SU FRANJA tiene
-- plata detrás", con la definición canónica de `V1`.
--
-- Los tres casos son las tres puntas: no se puede sacar la plata de abajo de una
-- reserva viva; sí se puede devolver una vez cancelada; y no se puede después
-- descancelar para entrar por la ventana.
-- -----------------------------------------------------------------------------

SELECT probar('126','anular la sena de una reserva que sigue vigente','FALLA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_alquiler,'2029-05-02','10:00','11:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva;
    UPDATE pago SET estado_pago='ANULADO',
                    id_usuario_anula=(SELECT u_mica FROM v), fecha_anulacion=now(),
                    motivo_anulacion='Devolucion'
     WHERE id_reserva=(SELECT id_reserva FROM reserva WHERE fecha='2029-05-02')$q$);

-- El orden que la política habilita: primero se cancela, después se devuelve.
SELECT probar('127','cancelar la reserva y RECIEN AHI devolver la sena','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_alquiler,'2029-05-03','10:00','11:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

SELECT probar('128','la devolucion, con la reserva ya cancelada','ANDA',
 $q$UPDATE reserva SET estado='CANCELADA', id_usuario_modifico=(SELECT u_mica FROM v)
     WHERE fecha='2029-05-03';
    UPDATE pago SET estado_pago='ANULADO',
                    id_usuario_anula=(SELECT u_mica FROM v), fecha_anulacion=now(),
                    motivo_anulacion='Se cancelo la reserva y se devolvio la sena'
     WHERE id_reserva=(SELECT id_reserva FROM reserva WHERE fecha='2029-05-03')$q$);

-- El esquive: dos pasos legales que juntos rompen la regla.
SELECT probar('129','ESQUIVE: descancelar la reserva cuya sena ya se devolvio','FALLA',
 $q$UPDATE reserva SET estado='CONFIRMADA', id_usuario_modifico=(SELECT u_mica FROM v)
     WHERE fecha='2029-05-03'$q$);

-- Y que no se vuelva contra sí misma: cancelar nunca puede quedar bloqueado, y
-- una reserva pagada se reactiva sin problema.
SELECT probar('130','cancelar una reserva con su sena puesta','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_alquiler,'2029-05-04','10:00','11:00' FROM v RETURNING id_reserva)
    SELECT sena(id_reserva) FROM nueva$q$);

SELECT probar('131','esa cancelacion no la bloquea nada','ANDA',
 $q$UPDATE reserva SET estado='CANCELADA', id_usuario_modifico=(SELECT u_mica FROM v)
     WHERE fecha='2029-05-04'$q$);

SELECT probar('132','y se puede descancelar porque la sena sigue viva','ANDA',
 $q$UPDATE reserva SET estado='CONFIRMADA', id_usuario_modifico=(SELECT u_mica FROM v)
     WHERE fecha='2029-05-04'$q$);


-- -----------------------------------------------------------------------------
-- UNA DEUDA ANOTADA NO ES UNA SEÑA  (V12)
--
-- El agujero que `V10` dejó y `V12` cerró: la condición decía "un pago distinto
-- de ANULADO", y `DEBE` es distinto de ANULADO. **Se conseguía el horario
-- anotando una deuda**, que es justo lo que la regla existe para impedir.
--
-- Los tres casos cubren la lista entera de `EstadoPago`: lo que entró alcanza, lo
-- que se debe no.
-- -----------------------------------------------------------------------------

SELECT probar('133','reservar con un pago en DEBE (deuda anotada, no sena)','FALLA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_alquiler,'2029-06-01','10:00','11:00' FROM v RETURNING id_reserva)
    INSERT INTO pago (id_usuario,id_reserva,monto,medio_pago,estado_pago,concepto)
    SELECT (SELECT u_mica FROM v),id_reserva,1,'EFECTIVO','DEBE','deuda' FROM nueva;
    SET CONSTRAINTS reserva_con_sena IMMEDIATE$q$);

SELECT probar('134','reservar con un pago VENCIDO tampoco','FALLA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_alquiler,'2029-06-02','10:00','11:00' FROM v RETURNING id_reserva)
    INSERT INTO pago (id_usuario,id_reserva,monto,medio_pago,estado_pago,concepto)
    SELECT (SELECT u_mica FROM v),id_reserva,1,'EFECTIVO','VENCIDO','vencida' FROM nueva;
    SET CONSTRAINTS reserva_con_sena IMMEDIATE$q$);

-- Y el estado que la regla nombra: SENADO es exactamente una seña.
SELECT probar('135','reservar con la sena en estado SENADO','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_alquiler,'2029-06-03','10:00','11:00' FROM v RETURNING id_reserva)
    INSERT INTO pago (id_usuario,id_reserva,monto,medio_pago,estado_pago,concepto)
    SELECT (SELECT u_mica FROM v),id_reserva,1,'EFECTIVO','SENADO','sena' FROM nueva;
    SET CONSTRAINTS reserva_con_sena IMMEDIATE;
    SELECT 1 FROM reserva WHERE fecha='2029-06-03'$q$);

-- Y el espejo del lado de la devolucion: pasar la sena a DEBE la vacia igual que
-- anularla, asi que tampoco puede dejar viva una reserva sin plata.
SELECT probar('136','degradar la sena a DEBE con la reserva vigente','FALLA',
 $q$UPDATE pago SET estado_pago='DEBE'
     WHERE id_reserva=(SELECT id_reserva FROM reserva WHERE fecha='2029-06-03')$q$);



-- =============================================================================
-- LAS SOLICITUDES DEL PORTAL  (V13)
--
-- La tabla que el Módulo 4 necesitó antes que cualquier pantalla: un USUARIO no
-- puede insertar una `reserva` —no tiene cómo poner la plata que `V10`–`V12` le
-- exigen—, así que pide, y administración aprueba cargando la seña.
--
-- Ojo con el orden: los casos de acá abajo se apoyan unos en otros (la solicitud
-- que 137 crea es la que 147 aprueba). Cada uno usa su propia fecha para poder
-- encontrarse sin hardcodear ids, que es la regla 1 de la cabecera.
-- =============================================================================

SELECT probar('137','pedir un alquiler de cabina desde el portal','ANDA',
 $q$INSERT INTO solicitud_reserva (id_usuario,id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin,comentario)
    SELECT u_juan,sala1,u_alquiler,'2029-07-10','15:00','17:00','quiero practicar' FROM v$q$);

-- Lo que P17 dejó del lado de administración: si hay un profesor del otro lado,
-- no se pide, se arma. La marca vive en el catálogo (`tipo_uso`), no en una lista
-- escrita en un trigger.
SELECT probar('138','pedir una clase de DJ desde el portal','FALLA',
 $q$INSERT INTO solicitud_reserva (id_usuario,id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT u_juan,sala1,u_clase,'2029-07-20','15:00','17:00' FROM v$q$);

-- Y el caso que muestra por qué no alcanzaba con `es_clase = FALSE`: M&M tampoco
-- es una clase, y tampoco se pide por acá.
SELECT probar('139','pedir mix & mastering desde el portal','FALLA',
 $q$INSERT INTO solicitud_reserva (id_usuario,id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT u_juan,sala1,(SELECT id_tipo_uso FROM tipo_uso WHERE codigo='MIX_MASTERING'),
           '2029-07-21','15:00','17:00' FROM v$q$);

-- La matriz sala×uso vale igual en el pedido que en la reserva. Sin esto se pide
-- una grabación en la Sala 1, administración la aprueba, y el rechazo llega en la
-- transacción que ya marcó la solicitud como aprobada.
SELECT probar('140','pedir una grabacion de set en la Sala 1','FALLA',
 $q$INSERT INTO solicitud_reserva (id_usuario,id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT u_juan,sala1,u_grabacion,'2029-07-22','15:00','17:00' FROM v$q$);

SELECT probar('141','pedir una franja que termina antes de empezar','FALLA',
 $q$INSERT INTO solicitud_reserva (id_usuario,id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT u_juan,sala1,u_alquiler,'2029-07-23','17:00','15:00' FROM v$q$);

SELECT probar('142','pedir una grabacion en la cabina de grabacion','ANDA',
 $q$INSERT INTO solicitud_reserva (id_usuario,id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT u_juan,cabina,u_grabacion,'2029-07-11','15:00','17:00' FROM v$q$);

-- -----------------------------------------------------------------------------
-- La resolución: quién, cuándo, y qué salió de ahí
-- -----------------------------------------------------------------------------

SELECT probar('143','aprobar sin decir quien resolvio','FALLA',
 $q$UPDATE solicitud_reserva SET estado='APROBADA' WHERE fecha='2029-07-10'$q$);

-- Una aprobación sin reserva dice que se aprobó y no hay franja tomada.
SELECT probar('144','aprobar sin la reserva que nacio del pedido','FALLA',
 $q$UPDATE solicitud_reserva SET estado='APROBADA',
     id_usuario_resuelve=(SELECT u_mica FROM v), fecha_resolucion=now()
     WHERE fecha='2029-07-10'$q$);

-- Un rechazo sin motivo no le sirve a quien lo recibe.
SELECT probar('145','rechazar sin decir por que','FALLA',
 $q$UPDATE solicitud_reserva SET estado='RECHAZADA',
     id_usuario_resuelve=(SELECT u_mica FROM v), fecha_resolucion=now()
     WHERE fecha='2029-07-11'$q$);

SELECT probar('146','rechazar explicando','ANDA',
 $q$UPDATE solicitud_reserva SET estado='RECHAZADA', respuesta='esa tarde hay mantenimiento',
     id_usuario_resuelve=(SELECT u_mica FROM v), fecha_resolucion=now()
     WHERE fecha='2029-07-11'$q$);

-- El esquive que cierra el trigger de §4: volver la solicitud a pendiente para
-- resolverla otra vez. En la aprobada serían dos reservas y dos señas, con la
-- solicitud apuntando a una sola.
SELECT probar('147','devolver a PENDIENTE una solicitud ya resuelta','FALLA',
 $q$UPDATE solicitud_reserva SET estado='PENDIENTE' WHERE fecha='2029-07-11'$q$);

-- La aprobación de verdad: la reserva nace con su seña y la solicitud la apunta,
-- todo en la misma transacción. Es exactamente lo que hace `SolicitudService`.
SELECT probar('148','aprobar: nace la reserva con su sena y la solicitud la apunta','ANDA',
 $q$WITH nueva AS (INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_alquiler,'2029-07-10','15:00','17:00' FROM v RETURNING id_reserva),
    pagada AS (SELECT sena(id_reserva) AS id_reserva FROM nueva)
    UPDATE solicitud_reserva SET estado='APROBADA',
        id_usuario_resuelve=(SELECT u_mica FROM v), fecha_resolucion=now(),
        id_reserva=(SELECT id_reserva FROM pagada)
    WHERE fecha='2029-07-10' AND estado='PENDIENTE'$q$);

-- Y una vez resuelta no se edita ningún campo, no solo el estado: cambiarle la
-- fecha haría que la solicitud diga una cosa y su reserva otra.
SELECT probar('149','mover la fecha de una solicitud ya aprobada','FALLA',
 $q$UPDATE solicitud_reserva SET fecha='2029-07-19' WHERE fecha='2029-07-10'$q$);

-- -----------------------------------------------------------------------------
-- Cancelar es un estado; borrar no es nada
-- -----------------------------------------------------------------------------

SELECT probar('150','pedir otra franja para poder cancelarla','ANDA',
 $q$INSERT INTO solicitud_reserva (id_usuario,id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT u_juan,sala1,u_alquiler,'2029-07-12','15:00','17:00' FROM v$q$);

-- El que se arrepiente cancela, y ahí el que resuelve es el que pidió.
SELECT probar('151','el que pidio cancela su propia solicitud','ANDA',
 $q$UPDATE solicitud_reserva SET estado='CANCELADA',
     id_usuario_resuelve=(SELECT u_juan FROM v), fecha_resolucion=now()
     WHERE fecha='2029-07-12'$q$);

SELECT probar('152','borrar una solicitud','FALLA',
 $q$DELETE FROM solicitud_reserva WHERE fecha='2029-07-12'$q$);

-- -----------------------------------------------------------------------------
-- La misma puerta estaba abierta en la tabla de reprogramaciones desde `V1`
-- -----------------------------------------------------------------------------

SELECT probar('153','pedir la reprogramacion de una reserva','ANDA',
 $q$INSERT INTO solicitud_reprogramacion (id_usuario,id_reserva,motivo,fecha_alternativa_solicitada)
    SELECT (SELECT u_juan FROM v),
           (SELECT id_reserva FROM reserva WHERE fecha='2029-07-10'),
           'me sale un viaje','2029-07-17'$q$);

SELECT probar('154','administracion la resuelve','ANDA',
 $q$UPDATE solicitud_reprogramacion SET estado='APROBADA', respuesta='te movemos al 17',
     id_usuario_resuelve=(SELECT u_mica FROM v), fecha_resolucion=now()
     WHERE motivo='me sale un viaje'$q$);

SELECT probar('155','y despues ya no se vuelve a tocar','FALLA',
 $q$UPDATE solicitud_reprogramacion SET estado='PENDIENTE' WHERE motivo='me sale un viaje'$q$);


-- =============================================================================
-- EL SEGUIMIENTO DEL ALUMNO SELLA SU PROPIO CAMBIO  (V14)
--
-- El alcance pide los tres estados **"con fecha de cambio"**, y el DEFAULT de la
-- columna solo corre en el INSERT: sin el trigger, la fila diría para siempre
-- cuándo se creó el seguimiento y no cuándo se movió. Es un dato que se lee como
-- "desde cuándo este alumno requiere atención".
-- =============================================================================

SELECT probar('156','crear el seguimiento de un alumno','ANDA',
 $q$INSERT INTO seguimiento_alumno (id_profesor,id_alumno,estado)
    SELECT prof,al_juan,'VA_BIEN' FROM v$q$);

SELECT probar('157','un seguimiento repetido para el mismo par','FALLA',
 $q$INSERT INTO seguimiento_alumno (id_profesor,id_alumno,estado)
    SELECT prof,al_juan,'EN_PAUSA' FROM v$q$);

-- Se ensucia la fecha a mano en vez de actualizar dos veces: `now()` es la hora
-- de la TRANSACCION, asi que dos updates seguidos darian el mismo valor y el caso
-- pasaria sin haber probado nada.
SELECT probar('158','cambiar el estado mueve la fecha','ANDA',
 $q$UPDATE seguimiento_alumno SET fecha_actualizacion='2020-01-01'
     WHERE id_alumno=(SELECT al_juan FROM v);
    UPDATE seguimiento_alumno SET estado='REQUIERE_ATENCION'
     WHERE id_alumno=(SELECT al_juan FROM v);
    SELECT 1 FROM seguimiento_alumno
     WHERE id_alumno=(SELECT al_juan FROM v)
       AND fecha_actualizacion > '2021-01-01'$q$);

-- Y el otro lado: un UPDATE que no cambia nada no mueve el sello. Si el trigger
-- empezara a sellar cualquier UPDATE, "desde cuando esta asi" pasaria a decir
-- "desde la ultima vez que alguien guardo la pantalla", que no es lo mismo.
--
-- El UPDATE es `estado = estado` a proposito: escrito con el valor literal, este
-- caso pasaria solo porque el 158 lo dejo en ese mismo estado, y estaria probando
-- el orden de los casos en vez de la regla.
SELECT probar('159','un UPDATE que no cambia nada no mueve la fecha','ANDA',
 $q$UPDATE seguimiento_alumno SET fecha_actualizacion='2020-01-01'
     WHERE id_alumno=(SELECT al_juan FROM v);
    UPDATE seguimiento_alumno SET estado=estado
     WHERE id_alumno=(SELECT al_juan FROM v);
    SELECT 1 FROM seguimiento_alumno
     WHERE id_alumno=(SELECT al_juan FROM v)
       AND fecha_actualizacion < '2021-01-01'$q$);

-- Y la regla que YA estaba desde V1 (seccion 8.3), que el Modulo 5 casi duplica:
-- una nota no se cuelga de la clase de otro alumno.
SELECT probar('160','una nota sobre la clase de otro alumno','FALLA',
 $q$INSERT INTO nota_profesor (id_profesor,id_alumno,id_participacion,contenido)
    SELECT prof, al_ana,
           (SELECT rp.id_participacion FROM reserva_participante rp
            WHERE rp.id_usuario=(SELECT u_juan FROM v) LIMIT 1),
           'nota mal colgada' FROM v$q$);



-- -----------------------------------------------------------------------------
-- LOS AVISOS AUTOMATICOS  (V17)
--
-- La regla que agrega V17 es una sola y es la que los modulos 4, 6 y 7 dejaron
-- planteada por escrito sin resolver: que el disparador pueda correr dos veces
-- el mismo dia sin duplicar la bandeja. Vive en un indice unico PARCIAL, y por
-- eso hacen falta los tres casos y no uno: el indice tiene que rechazar lo
-- repetido, dejar pasar lo que solo se le parece, y no tocar las filas que
-- quedan fuera de su WHERE.
-- -----------------------------------------------------------------------------

SELECT probar('161','el mismo aviso automatico dos veces a la misma persona','FALLA',
 $q$INSERT INTO notificacion (id_usuario_destino,tipo,contenido,clave_evento)
    SELECT u_mica,'DEUDA_VENCIDA','Juan debe hace 12 dias','DEUDA:u=1:ARS:desde=2026-08-01' FROM v;
    INSERT INTO notificacion (id_usuario_destino,tipo,contenido,clave_evento)
    SELECT u_mica,'DEUDA_VENCIDA','Juan debe hace 12 dias','DEUDA:u=1:ARS:desde=2026-08-01' FROM v$q$);

-- El mismo hecho le llega a CADA persona de administracion, y son filas
-- distintas de la misma cosa. Si el indice fuera solo sobre la clave, el aviso
-- le llegaria a una sola y el resto no se enteraria nunca -- un agujero que no
-- se ve, porque la pantalla de quien lo recibio anda bien.
SELECT probar('162','el mismo hecho avisado a DOS personas distintas','ANDA',
 $q$INSERT INTO notificacion (id_usuario_destino,tipo,contenido,clave_evento)
    SELECT u_juan,'DEUDA_VENCIDA','x','DEUDA:u=9:ARS:desde=2026-08-02' FROM v;
    INSERT INTO notificacion (id_usuario_destino,tipo,contenido,clave_evento)
    SELECT u_ana,'DEUDA_VENCIDA','x','DEUDA:u=9:ARS:desde=2026-08-02' FROM v
    RETURNING id_notificacion$q$);

-- Y la contracara, que es lo que justifica el WHERE del indice: los avisos que
-- escribe una PERSONA al resolver algo no llevan clave, y dos parecidos son dos
-- hechos distintos. Aprobar dos pedidos de la misma persona tiene que producir
-- dos avisos.
SELECT probar('163','dos avisos sin clave a la misma persona','ANDA',
 $q$INSERT INTO notificacion (id_usuario_destino,tipo,contenido)
    SELECT u_juan,'SOLICITUD_APROBADA','Tu pedido del lunes fue aprobado' FROM v;
    INSERT INTO notificacion (id_usuario_destino,tipo,contenido)
    SELECT u_juan,'SOLICITUD_APROBADA','Tu pedido del martes fue aprobado' FROM v
    RETURNING id_notificacion$q$);


-- =============================================================================
-- RESUMEN
-- =============================================================================
\echo ''
\echo '================= RESUMEN ================='
SELECT count(*) FILTER (WHERE ok)     AS "pasaron",
       count(*) FILTER (WHERE NOT ok) AS "fallaron",
       count(*)                       AS "total"
FROM _resultado;

\echo ''
\echo '=== CASOS QUE NO SE COMPORTARON COMO SE ESPERABA ==='
\echo '(vacio = pasaron todos)'
SELECT nro, caso, esperado, detalle FROM _resultado WHERE NOT ok ORDER BY nro;
