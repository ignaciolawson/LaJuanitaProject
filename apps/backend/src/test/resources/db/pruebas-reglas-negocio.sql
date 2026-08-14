-- =============================================================================
-- Pruebas de las reglas de negocio de la base — La Juanita Studio
--
-- CÓMO EJECUTARLO (base descartable, no toca la de desarrollo):
--
--   docker compose up -d
--   # TODAS las migraciones, en orden. No alcanza con V1+V2: desde V4 el
--   # esquema tiene `nombre` y `apellido` en vez de `nombre_completo`, y estas
--   # pruebas insertan con las columnas nuevas.
--   for v in V1__baseline V2__datos_iniciales V3__usuario_admin_inicial \
--            V4__separar_nombre_apellido V5__cambio_de_password_obligatorio \
--            V6__integridad_auditoria; do
--     docker cp apps/backend/src/main/resources/db/migration/$v.sql la_juanita_postgres:/tmp/$v.sql
--   done
--   docker cp apps/backend/src/test/resources/db/pruebas-reglas-negocio.sql la_juanita_postgres:/tmp/pruebas.sql
--   docker exec la_juanita_postgres psql -U la_juanita -d postgres -c "DROP DATABASE IF EXISTS pruebas;" -c "CREATE DATABASE pruebas;"
--   for v in V1__baseline V2__datos_iniciales V3__usuario_admin_inicial \
--            V4__separar_nombre_apellido V5__cambio_de_password_obligatorio \
--            V6__integridad_auditoria; do
--     docker exec la_juanita_postgres psql -U la_juanita -d pruebas -v ON_ERROR_STOP=1 -f /tmp/$v.sql
--   done
--   docker exec la_juanita_postgres psql -U la_juanita -d pruebas -f /tmp/pruebas.sql
--
-- Última corrida: 2026-08-14, 69/69 sobre el esquema V1..V6.
--
-- TODA MIGRACIÓN NUEVA ACTUALIZA ESTA CABECERA Y LA DE `pruebas-adversariales.sql`,
-- en el mismo commit. Ya pasó dos veces que no: con V4 las pruebas se editaron y
-- no se corrieron, y con V6 la cabecera se quedó en V5 mientras el archivo
-- hermano ya decía V6. Correr 69 casos contra un esquema que no es el del
-- proyecto no prueba nada, y no avisa.
--
-- (En Git Bash, anteponer MSYS_NO_PATHCONV=1 a los `docker` para que no
--  convierta las rutas /tmp a rutas de Windows.)
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


-- =============================================================================
-- SALAS Y RESERVAS — la regla más crítica del sistema
-- =============================================================================
SELECT probar('01','reserva normal en Sala 1','ANDA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,id_profesor,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,prof,'2026-09-01','10:00','11:30' FROM v$q$);

SELECT probar('02','otra reserva SOLAPADA en la misma sala','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,'2026-09-01','11:00','12:00' FROM v$q$);

SELECT probar('03','misma hora en otra sala','ANDA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_clase,'2026-09-01','11:00','12:00' FROM v$q$);

SELECT probar('04','reserva pegada, sin solapar (11:30-13:00)','ANDA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,'2026-09-01','11:30','13:00' FROM v$q$);

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
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT cabina,u_grabacion,'2026-09-02','15:00','17:00' FROM v$q$);

SELECT probar('09','hora_fin anterior a hora_inicio','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_clase,'2026-09-03','12:00','10:00' FROM v$q$);

SELECT probar('10','sala inexistente','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT 9999,u_clase,'2026-09-03','10:00','12:00' FROM v$q$);


-- =============================================================================
-- REPROGRAMACIÓN — ninguna clase se pierde
-- =============================================================================
SELECT probar('11','marcar una clase como REPROGRAMADA','ANDA',
 $q$UPDATE reserva SET estado='REPROGRAMADA'
    WHERE fecha='2026-09-01' AND hora_inicio='10:00'
      AND id_sala=(SELECT sala1 FROM v)$q$);

SELECT probar('12','la franja reprogramada queda libre','ANDA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,id_profesor,fecha,hora_inicio,hora_fin,id_reserva_recupera)
    SELECT v.sala1,v.u_clase,v.prof,'2026-09-08','10:00','11:30',
           (SELECT id_reserva FROM reserva WHERE estado='REPROGRAMADA' LIMIT 1) FROM v$q$);

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
