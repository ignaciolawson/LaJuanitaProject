-- =============================================================================
-- Datos iniciales — La Juanita Studio
--
-- Va separado del baseline a propósito: V1 es la ESTRUCTURA, esto son DATOS.
-- Las salas y la matriz de usos son datos reales del negocio, confirmados por
-- el cliente el 2026-08-11, y están pensados para editarse desde el sistema.
-- =============================================================================


-- --- Tipos de uso de sala -----------------------------------------------------
INSERT INTO tipo_uso (codigo, nombre, es_clase, color) VALUES
    ('CLASE_DJ',           'Clase de DJ',         TRUE,  '#e63946'),
    ('PRODUCCION_MUSICAL', 'Producción musical',  TRUE,  '#457b9d'),
    ('MENTORIA',           'Mentoría',            TRUE,  '#2a9d8f'),
    ('MIX_MASTERING',      'Mix & Mastering',     FALSE, '#8d5a97'),
    ('ALQUILER_CABINA',    'Alquiler de cabina',  FALSE, '#f4a261'),
    ('GRABACION_SET',      'Grabación de set',    FALSE, '#264653');


-- --- Salas --------------------------------------------------------------------
-- Las tres son "cabinas" (lugares donde se toca). Dos de práctica y una de
-- grabación.
INSERT INTO sala (nombre_sala, descripcion, orden) VALUES
    ('Sala 1', 'Cabina de práctica. Equipada para clases, mentorías, producción y mix & mastering.', 1),
    ('Sala 2', 'Cabina de práctica. Equipada para clases, mentorías, producción y mix & mastering.', 2),
    ('Cabina de grabación', 'Cabina con equipos y cámara para grabar sets. No tiene silla, tele ni escritorio: es solo para tocar y grabarse.', 3);


-- --- La matriz: qué se puede hacer en cada sala --------------------------------
--
--   Tipo de uso          | Sala 1 | Sala 2 | Cabina de grabación
--   ---------------------|--------|--------|--------------------
--   Clase de DJ          |   si   |   si   |  si (solo prácticas)
--   Producción musical   |   si   |   si   |        no
--   Mentoría             |   si   |   si   |        no
--   Mix & Mastering      |   si   |   si   |        no
--   Alquiler de cabina   |   si   |   si   |        no
--   Grabación de set     |   no   |   no   |        si

-- Salas 1 y 2: sirven para todo menos grabar.
INSERT INTO sala_tipo_uso (id_sala, id_tipo_uso)
SELECT s.id_sala, t.id_tipo_uso
FROM sala s
CROSS JOIN tipo_uso t
WHERE s.nombre_sala IN ('Sala 1', 'Sala 2')
  AND t.codigo IN ('CLASE_DJ', 'PRODUCCION_MUSICAL', 'MENTORIA',
                   'MIX_MASTERING', 'ALQUILER_CABINA');

-- Cabina de grabación: grabar sets, y clases de DJ solo si son de práctica.
INSERT INTO sala_tipo_uso (id_sala, id_tipo_uso, advertencia)
SELECT s.id_sala, t.id_tipo_uso, NULL
FROM sala s, tipo_uso t
WHERE s.nombre_sala = 'Cabina de grabación'
  AND t.codigo = 'GRABACION_SET';

INSERT INTO sala_tipo_uso (id_sala, id_tipo_uso, advertencia)
SELECT s.id_sala, t.id_tipo_uso,
       'Esta cabina no tiene silla, tele ni escritorio. Solo apta para clases de práctica.'
FROM sala s, tipo_uso t
WHERE s.nombre_sala = 'Cabina de grabación'
  AND t.codigo = 'CLASE_DJ';
