-- =============================================================================
-- `usuario.nombre_completo` se parte en `nombre` + `apellido`
--
-- Por qué ahora y no después: la pantalla 1 del Módulo 1 es un listado con
-- buscador y filtros, y Micaela va a querer ordenar por apellido. Con un solo
-- campo de texto eso no se puede hacer bien nunca -- "Juan Carlos Pérez García"
-- no se parte después sin adivinar dónde termina el nombre.
--
-- Hoy la tabla tiene UNA fila (la credencial de desarrollo de V3) y ningún dato
-- real: la migración del Notion es en diciembre. Es el momento más barato
-- posible para hacer este cambio; con 80 alumnos adentro sería otra historia.
--
-- SI ESTÁS LEYENDO V3 Y NO TE CIERRA: allá el INSERT usa `nombre_completo`,
-- porque en ese momento la columna existía. Un archivo ya aplicado NO SE EDITA
-- NUNCA -- ni para agregarle un comentario. Flyway guarda un checksum de cada
-- archivo y se niega a arrancar si cambia, que es justo lo que pasó al escribir
-- esta migración: se tocó V3 para aclarar esto mismo y el backend dejó de
-- levantar con "Migration checksum mismatch for migration version 3".
-- =============================================================================

ALTER TABLE usuario
    ADD COLUMN nombre   VARCHAR(80),
    ADD COLUMN apellido VARCHAR(80);


-- La fila conocida: la cuenta sembrada por V3, que no tiene apellido real.
UPDATE usuario
SET nombre   = 'Administrador',
    apellido = 'Sistema'
WHERE email = 'admin@lajuanita.local';

-- Red de seguridad por si alguien creó usuarios a mano probando el login: parte
-- por el primer espacio. Si no hay espacio, repite el valor en apellido -- feo,
-- pero las dos columnas son NOT NULL y es preferible a que la migración falle.
UPDATE usuario
SET nombre   = split_part(nombre_completo, ' ', 1),
    apellido = COALESCE(
                   NULLIF(substr(nombre_completo, position(' ' IN nombre_completo) + 1), ''),
                   nombre_completo)
WHERE nombre IS NULL;


ALTER TABLE usuario
    ALTER COLUMN nombre   SET NOT NULL,
    ALTER COLUMN apellido SET NOT NULL;

ALTER TABLE usuario
    DROP COLUMN nombre_completo;


-- Para el ORDER BY del listado, que siempre es apellido y después nombre.
--
-- No sirve para el buscador: ese filtra con LIKE '%texto%' y ningún índice
-- btree ayuda con un comodín adelante. A esta escala (decenas o cientos de
-- filas) recorrer la tabla entera no cuesta nada. Si algún día molesta, la
-- respuesta es la extensión pg_trgm, no este índice.
--
-- Nota aparte: lower() no saca los acentos, así que buscar "Perez" no encuentra
-- "Pérez". Se resuelve con la extensión unaccent el día que aparezca el reclamo.
CREATE INDEX usuario_orden_alfabetico ON usuario (lower(apellido), lower(nombre));
