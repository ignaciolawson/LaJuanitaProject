-- =============================================================================
-- Pruebas ADVERSARIALES — La Juanita Studio
--
-- Compañero de `pruebas-reglas-negocio.sql`. Aquel verifica que las reglas
-- QUE SE QUISIERON escribir funcionen. Éste hace lo contrario: ataca el
-- esquema buscando la forma de violarlas.
--
-- Nació de la auditoría del 2026-08-12, que encontró 10 formas de romper
-- reglas que el proyecto daba por garantizadas. Cada caso de acá corresponde a
-- un ataque que ANTES DE V6 —o, los de la tanda nueva, antes de V7—
-- FUNCIONABA. Si alguno vuelve a pasar, se reintrodujo un agujero real, no una
-- hipótesis.
--
-- CÓMO EJECUTARLO (base descartable):
--
--   docker compose up -d
--   ./scripts/pruebas-sql.sh
--
-- Ese script corre este archivo y `pruebas-reglas-negocio.sql`, cada uno sobre
-- una base nueva con todas las migraciones aplicadas, y **sale con código
-- distinto de cero si algún caso falla**. Corre también en CI
-- (`.github/workflows/ci.yml`).
--
-- Última corrida: 2026-08-14, 50/50 sobre el esquema V1..V9.
--
-- ESTA CABECERA YA NO LLEVA LA LISTA DE MIGRACIONES: el script lee el
-- directorio y las aplica en orden de versión, así que una migración nueva
-- entra en la corrida sola. Ver la explicación completa en la cabecera de
-- `pruebas-reglas-negocio.sql` — la lista duplicada en las dos cabeceras ya se
-- desactualizó dos veces, y correr los casos contra un esquema que no es el del
-- proyecto no prueba nada y no avisa.
--
-- LO QUE ESTE ARCHIVO **NO** CUBRE, a propósito: la concurrencia. Los dos
-- ataques concurrentes de la auditoría (dos reservas solapadas simultáneas, y
-- bloqueo+reserva simultáneos) necesitan dos sesiones psql en paralelo y no se
-- pueden expresar acá. Están documentados en `docs/db/auditoria-2026-08-12.md`
-- §5 con el comando exacto para reproducirlos.
-- =============================================================================

\set ON_ERROR_STOP off
\pset pager off

CREATE TABLE IF NOT EXISTS _resultado (
    nro text, caso text, esperado text, ok boolean, detalle text
);

CREATE OR REPLACE FUNCTION probar(nro text, caso text, esperado text, sentencia text)
RETURNS void AS $fn$
DECLARE
    hubo_error boolean := false;
    filas      integer := 0;
    msg        text    := '';
BEGIN
    BEGIN
        EXECUTE sentencia; GET DIAGNOSTICS filas = ROW_COUNT;
    EXCEPTION WHEN others THEN hubo_error := true; msg := SQLERRM;
    END;

    IF esperado = 'ANDA' THEN
        INSERT INTO _resultado VALUES (nro, caso, esperado,
            (NOT hubo_error AND filas > 0),
            CASE WHEN hubo_error THEN 'ERROR: '||msg
                 WHEN filas = 0  THEN 'no afecto ninguna fila (falso positivo)'
                 ELSE filas||' fila(s)' END);
    ELSE
        INSERT INTO _resultado VALUES (nro, caso, esperado, hubo_error,
            CASE WHEN hubo_error THEN 'rechazado ok'
                 ELSE '*** PASO: EL AGUJERO VOLVIO ***' END);
    END IF;
END; $fn$ LANGUAGE plpgsql;


-- =============================================================================
-- SEMILLA
-- =============================================================================
INSERT INTO usuario (nombre,apellido,email,password_hash,rol) VALUES
 ('Mica','Adv','mica@adv.local','x','STAFF'),
 ('Ghezz','Adv','ghezz@adv.local','x','STAFF'),
 ('Juan','Adv','juan@adv.local','x','USUARIO'),
 ('Ana','Adv','ana@adv.local','x','USUARIO');

INSERT INTO profesor (id_usuario) SELECT id_usuario FROM usuario WHERE email='ghezz@adv.local';
INSERT INTO alumno (id_usuario)   SELECT id_usuario FROM usuario WHERE email IN ('juan@adv.local','ana@adv.local');

INSERT INTO inscripcion (id_alumno,disciplina,clases_contratadas,precio_total)
SELECT a.id_alumno,'DJ',8,400000 FROM alumno a JOIN usuario u USING(id_usuario)
WHERE u.email='juan@adv.local';

CREATE VIEW v AS SELECT
 (SELECT id_usuario FROM usuario WHERE email='juan@adv.local') AS u_juan,
 (SELECT id_usuario FROM usuario WHERE email='mica@adv.local') AS u_mica,
 (SELECT p.id_profesor FROM profesor p JOIN usuario u USING(id_usuario) WHERE u.email='ghezz@adv.local') AS prof,
 (SELECT a.id_alumno FROM alumno a JOIN usuario u USING(id_usuario) WHERE u.email='juan@adv.local') AS al_juan,
 (SELECT i.id_inscripcion FROM inscripcion i JOIN alumno a USING(id_alumno)
    JOIN usuario u USING(id_usuario) WHERE u.email='juan@adv.local' AND i.disciplina='DJ') AS ins_juan,
 (SELECT id_sala FROM sala WHERE nombre_sala='Sala 1') AS sala1,
 (SELECT id_sala FROM sala WHERE nombre_sala='Sala 2') AS sala2,
 (SELECT id_sala FROM sala WHERE nombre_sala='Cabina de grabación') AS cabina,
 (SELECT id_tipo_uso FROM tipo_uso WHERE codigo='CLASE_DJ')        AS u_clase,
 (SELECT id_tipo_uso FROM tipo_uso WHERE codigo='MENTORIA')        AS u_ment,
 (SELECT id_tipo_uso FROM tipo_uso WHERE codigo='ALQUILER_CABINA') AS u_alq;


-- =============================================================================
-- A. GEOMETRÍA DEL EXCLUDE
--
-- Los 69 originales probaban solape parcial y reservas pegadas. Faltaban las
-- otras cuatro formas en que dos intervalos se pisan.
-- =============================================================================
INSERT INTO reserva (id_sala,id_tipo_uso,id_profesor,fecha,hora_inicio,hora_fin)
SELECT sala1,u_clase,prof,'2027-03-01','14:00','18:00' FROM v;

SELECT probar('A01','reserva CONTENIDA dentro de otra (15-16 en 14-18)','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,'2027-03-01','15:00','16:00' FROM v$q$);

SELECT probar('A02','reserva que CONTIENE a otra (13-19 sobre 14-18)','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,'2027-03-01','13:00','19:00' FROM v$q$);

SELECT probar('A03','reserva IDENTICA','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,'2027-03-01','14:00','18:00' FROM v$q$);

SELECT probar('A04','solape de UN MINUTO (17:59-19:00)','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,'2027-03-01','17:59','19:00' FROM v$q$);

SELECT probar('A05','borde exacto: termina donde la otra empieza','ANDA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_clase,'2027-03-01','12:00','14:00' FROM v$q$);

SELECT probar('A06','reserva de duracion CERO','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala2,u_clase,'2027-03-01','16:00','16:00' FROM v$q$);

-- El esquive más obvio: cancelo (libera la franja), otro la ocupa, resucito.
INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin,estado)
SELECT sala2,u_clase,'2027-03-02','10:00','12:00','CANCELADA' FROM v;
INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
SELECT sala2,u_clase,'2027-03-02','10:00','12:00' FROM v;

-- Desde V7 §2 estos UPDATE llevan `id_usuario_modifico`. NO es decoración: sin
-- él fallarían por falta de autor y no por la regla que este caso ataca, y un
-- caso que falla por el motivo equivocado es un caso que dejó de probar algo.
SELECT probar('A07','ESQUIVE: resucitar una CANCELADA sobre franja ya ocupada','FALLA',
 $q$UPDATE reserva SET estado='CONFIRMADA', id_usuario_modifico=(SELECT u_mica FROM v)
    WHERE fecha='2027-03-02' AND estado='CANCELADA'$q$);

SELECT probar('A08','UPDATE que mueve una MENTORIA a la cabina (uso no permitido)','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,id_profesor,fecha,hora_inicio,hora_fin)
      SELECT sala1,u_ment,prof,'2028-01-10','10:00','11:00' FROM v;
    UPDATE reserva SET id_sala=(SELECT cabina FROM v),
                       id_usuario_modifico=(SELECT u_mica FROM v)
     WHERE fecha='2028-01-10'$q$);


-- =============================================================================
-- B. BLOQUEOS DE SALA  (V6 §10)
-- =============================================================================
INSERT INTO bloqueo_sala (id_sala,fecha_inicio,fecha_fin,motivo)
SELECT sala2,'2027-05-10','2027-05-12','Obra' FROM v;

SELECT probar('B01','DOS BLOQUEOS SOLAPADOS en la misma sala','FALLA',
 $q$INSERT INTO bloqueo_sala (id_sala,fecha_inicio,fecha_fin,motivo)
    SELECT sala2,'2027-05-11','2027-05-15','Otra obra' FROM v$q$);

INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin,estado)
SELECT sala2,u_alq,'2027-05-11','10:00','11:00','CANCELADA' FROM v;

SELECT probar('B02','ESQUIVE: resucitar una CANCELADA dentro de un bloqueo','FALLA',
 $q$UPDATE reserva SET estado='CONFIRMADA', id_usuario_modifico=(SELECT u_mica FROM v)
    WHERE fecha='2027-05-11' AND estado='CANCELADA'$q$);

INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
SELECT sala1,u_alq,'2027-06-01','10:00','11:00' FROM v;

SELECT probar('B03','ESQUIVE: bloqueo chico y despues EXTENDERLO sobre reservas','FALLA',
 $q$INSERT INTO bloqueo_sala (id_sala,fecha_inicio,fecha_fin,motivo)
      SELECT sala1,'2027-06-20','2027-06-21','chico' FROM v;
    UPDATE bloqueo_sala SET fecha_inicio='2027-06-01'
     WHERE motivo='chico'$q$);

SELECT probar('B04','ESQUIVE: MOVER una reserva existente adentro de un bloqueo','FALLA',
 $q$UPDATE reserva SET id_sala=(SELECT sala2 FROM v), fecha='2027-05-11',
                    id_usuario_modifico=(SELECT u_mica FROM v)
    WHERE fecha='2027-06-01' AND id_sala=(SELECT sala1 FROM v)$q$);


-- B05 y B06 son DB-03: hasta V7, el EXCLUDE de V6 leía la fila como un
-- intervalo continuo y los dos triggers la leen como una franja que se repite
-- cada día del rango. Las dos lecturas coinciden mientras el bloqueo dure un
-- día o tome el día completo -- que es lo único que probaban los 109 casos
-- anteriores, porque todos omitían las horas.
SELECT probar('B05','bloqueo de manana y bloqueo de noche en la misma semana','ANDA',
 $q$INSERT INTO bloqueo_sala (id_sala,fecha_inicio,fecha_fin,hora_inicio,hora_fin,motivo)
      SELECT sala1,'2027-08-02','2027-08-08','09:00','13:00','Obra de manana' FROM v;
    INSERT INTO bloqueo_sala (id_sala,fecha_inicio,fecha_fin,hora_inicio,hora_fin,motivo)
      SELECT sala1,'2027-08-04','2027-08-05','19:00','23:00','Evento de noche' FROM v$q$);

SELECT probar('B06','ESQUIVE: bloqueo que pisa los mismos dias Y la misma franja','FALLA',
 $q$INSERT INTO bloqueo_sala (id_sala,fecha_inicio,fecha_fin,hora_inicio,hora_fin,motivo)
    SELECT sala1,'2027-08-05','2027-08-06','12:00','14:00','Se pisa de verdad' FROM v$q$);


-- =============================================================================
-- C. DINERO  (V6 §1 y §2)
--
-- `pago` y `egreso` tenían monto positivo desde V1; estas tres tablas no.
-- =============================================================================
SELECT probar('C01','inscripcion con precio_total NEGATIVO','FALLA',
 $q$INSERT INTO inscripcion (id_alumno,disciplina,clases_contratadas,precio_total)
    SELECT al_juan,'PRODUCCION',8,-500000 FROM v$q$);

SELECT probar('C02','venta_equipo con precio NEGATIVO','FALLA',
 $q$INSERT INTO venta_equipo (id_usuario_vendedor,nombre_comprador_externo,modelo_equipo,precio)
    SELECT u_mica,'X','CDJ-3000',-100 FROM v$q$);

SELECT probar('C03','trabajo_mastering con precio_acordado NEGATIVO','FALLA',
 $q$INSERT INTO trabajo_mastering (nombre_cliente_externo,tipo_trabajo,nombre_track,precio_acordado)
    VALUES ('X','MIX','Negativo',-100)$q$);

-- Cotización 0: no lanza error en ningún lado y hace desaparecer del balance
-- todo importe en USD.
SELECT probar('C04','pago en USD con cotizacion CERO','FALLA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,monto,moneda,cotizacion_dolar,medio_pago)
    SELECT u_juan,ins_juan,100,'USD',0,'PAYPAL' FROM v$q$);

SELECT probar('C05','pago en USD con cotizacion NEGATIVA','FALLA',
 $q$INSERT INTO pago (id_usuario,id_inscripcion,monto,moneda,cotizacion_dolar,medio_pago)
    SELECT u_juan,ins_juan,100,'USD',-1450,'PAYPAL' FROM v$q$);

SELECT probar('C06','inscripcion en USD con cotizacion CERO','FALLA',
 $q$INSERT INTO inscripcion (id_alumno,disciplina,clases_contratadas,precio_total,moneda,cotizacion_dolar)
    SELECT al_juan,'MENTORIA',8,1000,'USD',0 FROM v$q$);

SELECT probar('C07','egreso con cotizacion NEGATIVA','FALLA',
 $q$INSERT INTO egreso (monto,concepto,moneda,cotizacion_dolar)
    VALUES (100,'X','USD',-1)$q$);

SELECT probar('C08','curso becado al 100% (precio 0) sigue siendo valido','ANDA',
 $q$INSERT INTO inscripcion (id_alumno,disciplina,clases_contratadas,precio_total)
    SELECT al_juan,'PRODUCCION',8,0 FROM v$q$);


-- =============================================================================
-- D. MIX & MASTERING  (V6 §3, §6, §8)
-- =============================================================================
SELECT probar('D01','revisiones_realizadas por encima de las incluidas','FALLA',
 $q$INSERT INTO trabajo_mastering (nombre_cliente_externo,tipo_trabajo,nombre_track,
        revisiones_incluidas,revisiones_realizadas)
    VALUES ('X','MIX','Revisiones',3,99)$q$);

-- El candado del premaster, atacado por atrás: pago → libero → anulo el pago.
INSERT INTO trabajo_mastering (nombre_cliente_externo,tipo_trabajo,nombre_track,estado)
VALUES ('Cliente','MASTER','Candado','ENTREGADO');
INSERT INTO pago (id_usuario,id_trabajo_mastering,monto,medio_pago,estado_pago)
SELECT v.u_juan,t.id_trabajo,50000,'EFECTIVO','PAGADO'
FROM v, trabajo_mastering t WHERE t.nombre_track='Candado';
UPDATE trabajo_mastering SET premaster_liberado=TRUE WHERE nombre_track='Candado';

-- Desde V7 §1 toda anulación lleva autor, fecha y motivo. Van acá para que el
-- caso siga fallando por el trigger del premaster, que es lo que ataca, y no
-- por la constraint nueva.
SELECT probar('D02','ANULAR el pago que respalda un premaster ya liberado','FALLA',
 $q$UPDATE pago SET estado_pago='ANULADO',
                  id_usuario_anula=(SELECT u_mica FROM v), fecha_anulacion=now(),
                  motivo_anulacion='Intento de esquive'
    WHERE id_trabajo_mastering=(SELECT id_trabajo FROM trabajo_mastering WHERE nombre_track='Candado')$q$);

SELECT probar('D03','BORRAR el pago que respalda un premaster ya liberado','FALLA',
 $q$DELETE FROM pago
    WHERE id_trabajo_mastering=(SELECT id_trabajo FROM trabajo_mastering WHERE nombre_track='Candado')$q$);

SELECT probar('D04','anular el pago SI el trabajo se marco liberado_sin_pago','ANDA',
 $q$UPDATE trabajo_mastering SET liberado_sin_pago=TRUE,
        motivo_liberacion='Arreglo a 30 dias' WHERE nombre_track='Candado';
    UPDATE pago SET estado_pago='ANULADO',
                   id_usuario_anula=(SELECT u_mica FROM v), fecha_anulacion=now(),
                   motivo_anulacion='El trabajo quedo liberado sin pago, con motivo'
     WHERE id_trabajo_mastering=(SELECT id_trabajo FROM trabajo_mastering WHERE nombre_track='Candado')$q$);

-- La máquina de estados, revertida en dos pasos vía CANCELADO.
INSERT INTO trabajo_mastering (nombre_cliente_externo,tipo_trabajo,nombre_track,estado)
VALUES ('C','MASTER','Retroceso','PAGADO');

SELECT probar('D05','PAGADO -> CANCELADO (sigue permitido: es la salida)','ANDA',
 $q$UPDATE trabajo_mastering SET estado='CANCELADO' WHERE nombre_track='Retroceso'$q$);

SELECT probar('D06','ESQUIVE: CANCELADO -> A_CONFIRMAR (revierte la maquina)','FALLA',
 $q$UPDATE trabajo_mastering SET estado='A_CONFIRMAR' WHERE nombre_track='Retroceso'$q$);

SELECT probar('D07','ESQUIVE: CANCELADO -> EN_PROCESO','FALLA',
 $q$UPDATE trabajo_mastering SET estado='EN_PROCESO' WHERE nombre_track='Retroceso'$q$);


-- =============================================================================
-- E. "NADA SE BORRA"  (V6 §7)
--
-- La cabecera de V1 lo declaraba desde el principio; nada lo implementaba.
-- =============================================================================
INSERT INTO trabajo_mastering (nombre_cliente_externo,tipo_trabajo,nombre_track,estado)
VALUES ('C','MASTER','Borrable','ENTREGADO');
INSERT INTO pago (id_usuario,id_inscripcion,monto,medio_pago,estado_pago,concepto)
SELECT u_juan,ins_juan,999999,'TRANSFERENCIA','PAGADO','borrable' FROM v;

SELECT probar('E01','BORRAR un pago (historial financiero)','FALLA',
 $q$DELETE FROM pago WHERE concepto='borrable'$q$);

SELECT probar('E02','BORRAR un trabajo de mastering entregado','FALLA',
 $q$DELETE FROM trabajo_mastering WHERE nombre_track='Borrable'$q$);

SELECT probar('E03','ANULAR el pago si es la salida documentada','ANDA',
 $q$UPDATE pago SET estado_pago='ANULADO',
                  id_usuario_anula=(SELECT u_mica FROM v), fecha_anulacion=now(),
                  motivo_anulacion='Cargado por duplicado'
    WHERE concepto='borrable'$q$);

-- V7 §1: la salida existe, pero no es gratis. Anular es, para el balance, lo
-- mismo que borrar -- el monto deja de contar -- y era la única excepción del
-- esquema que no pedía explicación.
--
-- El INSERT va AFUERA de probar() a propósito: el bloque EXCEPTION de esa
-- función es un savepoint, así que un caso que falla revierte también lo que
-- preparó, y los tres casos siguientes se quedarían sin fila que atacar --
-- pasando por UPDATE de cero filas, que es el falso positivo que la cabecera
-- de estas suites advierte.
INSERT INTO pago (id_usuario,id_inscripcion,monto,medio_pago,estado_pago,concepto)
SELECT u_juan,ins_juan,777777,'EFECTIVO','PAGADO','anonimo' FROM v;

SELECT probar('E04','ESQUIVE: anular sin decir quien ni por que','FALLA',
 $q$UPDATE pago SET estado_pago='ANULADO' WHERE concepto='anonimo'$q$);

-- El NULL es el esquive fino: un CHECK que evalúa a NULL no rechaza nada. Sin
-- el `coalesce` de V7 §1, este caso pasaba.
SELECT probar('E05','ESQUIVE: anular con autor y fecha pero motivo en NULL','FALLA',
 $q$UPDATE pago SET estado_pago='ANULADO',
                  id_usuario_anula=(SELECT u_mica FROM v), fecha_anulacion=now()
    WHERE concepto='anonimo'$q$);

SELECT probar('E06','ESQUIVE: motivo en blanco','FALLA',
 $q$UPDATE pago SET estado_pago='ANULADO',
                  id_usuario_anula=(SELECT u_mica FROM v), fecha_anulacion=now(),
                  motivo_anulacion='    '
    WHERE concepto='anonimo'$q$);

SELECT probar('E07','ESQUIVE: invalidar el comprobante sin dejar autor','FALLA',
 $q$UPDATE pago SET comprobante_invalido=TRUE WHERE concepto='anonimo'$q$);


-- =============================================================================
-- E2. EL HISTORIAL DE CLASES  (V7 §2)
--
-- V6 §7 implementó "nada se borra" solo para `pago` y `trabajo_mastering`: la
-- auditoría del 12/08 leyó la regla como financiera. `reserva` y
-- `reserva_participante` -- que SON el historial de clases y sostienen la
-- respuesta a "¿cuántas clases le quedan?" -- quedaron afuera.
-- =============================================================================
INSERT INTO reserva (id_sala,id_tipo_uso,id_profesor,fecha,hora_inicio,hora_fin)
SELECT sala1,u_clase,prof,'2027-09-14','10:00','11:30' FROM v;
INSERT INTO reserva_participante (id_reserva,id_usuario,estado_asistencia)
SELECT r.id_reserva, v.u_juan, 'PRESENTE'
FROM v, reserva r WHERE r.fecha='2027-09-14';

SELECT probar('E08','BORRAR la asistencia a una clase','FALLA',
 $q$DELETE FROM reserva_participante
    WHERE id_reserva=(SELECT id_reserva FROM reserva WHERE fecha='2027-09-14')$q$);

SELECT probar('E09','BORRAR la clase entera','FALLA',
 $q$DELETE FROM reserva WHERE fecha='2027-09-14'$q$);

SELECT probar('E10','ESQUIVE: cambiar un PRESENTE por AUSENTE sin dejar autor','FALLA',
 $q$UPDATE reserva_participante SET estado_asistencia='AUSENTE'
    WHERE id_reserva=(SELECT id_reserva FROM reserva WHERE fecha='2027-09-14')$q$);

SELECT probar('E11','cambiarlo declarando el autor si es la salida','ANDA',
 $q$UPDATE reserva_participante SET estado_asistencia='AUSENTE',
                                  id_usuario_modifico=(SELECT u_mica FROM v)
    WHERE id_reserva=(SELECT id_reserva FROM reserva WHERE fecha='2027-09-14')$q$);


-- =============================================================================
-- F. IDENTIDAD  (V6 §4 y §5)
-- =============================================================================
SELECT probar('F01','dos fichas de ARTISTA sobre el mismo usuario','FALLA',
 $q$INSERT INTO artista (id_usuario,nombre_artistico) SELECT u_juan,'Alias1' FROM v;
    INSERT INTO artista (id_usuario,nombre_artistico) SELECT u_juan,'Alias2' FROM v$q$);

SELECT probar('F02','dos artistas SIN usuario (sigue permitido)','ANDA',
 $q$INSERT INTO artista (nombre_artistico) VALUES ('Sin cuenta 1'),('Sin cuenta 2')$q$);

-- '' no es NULL: el índice parcial lo indexa, así que el SEGUNDO usuario sin
-- teléfono chocaba con un "teléfono duplicado" que no existía.
SELECT probar('F03','usuario con telefono = string vacio','FALLA',
 $q$INSERT INTO usuario (nombre,apellido,email,telefono,password_hash)
    VALUES ('V','Adv','vacio@adv.local','','x')$q$);

SELECT probar('F04','usuario con telefono de solo espacios','FALLA',
 $q$INSERT INTO usuario (nombre,apellido,email,telefono,password_hash)
    VALUES ('V','Adv','espacios@adv.local','   ','x')$q$);

SELECT probar('F05','usuario con nombre y apellido en blanco','FALLA',
 $q$INSERT INTO usuario (nombre,apellido,email,password_hash)
    VALUES ('','','blanco@adv.local','x')$q$);

SELECT probar('F06','dos usuarios SIN telefono (NULL) conviven','ANDA',
 $q$INSERT INTO usuario (nombre,apellido,email,password_hash) VALUES
    ('N1','Adv','n1@adv.local','x'),('N2','Adv','n2@adv.local','x')$q$);


-- =============================================================================
-- G. AISLAMIENTO  (V6 §9)
--
-- Los triggers de sala leen `bloqueo_sala` / `reserva` en pleno vuelo. A partir
-- de REPEATABLE READ el snapshot está congelado y NO VEN lo que otra sesión
-- acaba de commitear: la regla se viola en silencio. Medido con dos sesiones
-- paralelas antes de V6. Ahora la transacción se niega a seguir.
-- =============================================================================
-- OJO: el nivel se cambia con SET SESSION CHARACTERISTICS y no con
-- `BEGIN ISOLATION LEVEL ...` adentro del $q$. Un BEGIN dentro de plpgsql
-- revienta con "EXECUTE of transaction commands is not implemented", o sea que
-- el caso daría "rechazado ok" sin haber probado el aislamiento: el falso
-- positivo exacto contra el que advierte la cabecera del otro archivo.
SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL REPEATABLE READ;

SELECT probar('G01','reservar con la sesion en REPEATABLE READ','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_alq,'2027-11-01','10:00','11:00' FROM v$q$);

SELECT probar('G02','bloquear una sala con la sesion en REPEATABLE READ','FALLA',
 $q$INSERT INTO bloqueo_sala (id_sala,fecha_inicio,fecha_fin,motivo)
    SELECT sala1,'2027-12-01','2027-12-02','X' FROM v$q$);

SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL SERIALIZABLE;

SELECT probar('G03','reservar con la sesion en SERIALIZABLE','FALLA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_alq,'2027-11-02','10:00','11:00' FROM v$q$);

SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL READ COMMITTED;

SELECT probar('G04','la misma reserva en READ COMMITTED (el modo soportado)','ANDA',
 $q$INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
    SELECT sala1,u_alq,'2027-11-01','10:00','11:00' FROM v$q$);


-- =============================================================================
-- RESUMEN
-- =============================================================================
\echo ''
\echo '================= ADVERSARIALES ================='
SELECT count(*) FILTER (WHERE ok)     AS "se defendio",
       count(*) FILTER (WHERE NOT ok) AS "AGUJEROS",
       count(*)                       AS "total"
FROM _resultado;

\echo ''
\echo '=== AGUJEROS: la base NO se defendio ==='
\echo '(vacio = se defendio de todos los ataques)'
SELECT nro, caso, esperado, detalle FROM _resultado WHERE NOT ok ORDER BY nro;
