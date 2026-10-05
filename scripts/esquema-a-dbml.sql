-- Traduce el esquema de la base conectada a DBML, el formato de dbdiagram.io.
-- Lo usa ./scripts/esquema-actual.sh; no se corre a mano.
--
-- Salen tablas, columnas (tipo, not null, default, pk, unique) y relaciones.
-- NO salen los CHECKs, triggers ni EXCLUDE: DBML no tiene donde ponerlos, y
-- son justamente las reglas de negocio — estan en esquema-actual.sql.

WITH tablas AS (
  SELECT c.oid, c.relname
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> 'flyway_schema_history'
),
columnas AS (
  SELECT t.relname, a.attnum,
    format('  %s %s%s', a.attname,
      replace(replace(replace(replace(replace(format_type(a.atttypid, a.atttypmod),
        'timestamp with time zone', 'timestamptz'),
        'timestamp without time zone', 'timestamp'),
        'time without time zone', 'time'),
        'character varying', 'varchar'),
        'double precision', 'float8'),
      CASE WHEN cardinality(opc) > 0 THEN ' [' || array_to_string(opc, ', ') || ']' ELSE '' END
    ) AS linea
  FROM tablas t
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d ON d.adrelid = t.oid AND d.adnum = a.attnum
  CROSS JOIN LATERAL (
    SELECT array_remove(ARRAY[
      CASE WHEN EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conrelid = t.oid
                        AND k.contype = 'p' AND k.conkey = ARRAY[a.attnum]) THEN 'pk' END,
      CASE WHEN a.attidentity <> '' OR pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval(%'
           THEN 'increment' END,
      CASE WHEN a.attnotnull AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conrelid = t.oid
                        AND k.contype = 'p' AND k.conkey = ARRAY[a.attnum]) THEN 'not null' END,
      CASE WHEN EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conrelid = t.oid
                        AND k.contype = 'u' AND k.conkey = ARRAY[a.attnum]) THEN 'unique' END,
      -- Una columna generada lleva su expresion como nota, en una sola linea
      -- (un string de DBML entre comillas simples no puede cortarse).
      CASE WHEN a.attgenerated = 's' THEN 'note: ''generada: '
             || regexp_replace(replace(pg_get_expr(d.adbin, d.adrelid), '''', '"'), '\s+', ' ', 'g')
             || '''' END,
      -- Un literal va pelado o entre comillas; una expresion (now(), ...) entre
      -- backticks. Postgres le agrega casteos ('ACTIVO'::character varying) que
      -- DBML no lee y no dicen nada que el tipo de la columna no diga.
      CASE WHEN d.adbin IS NOT NULL AND a.attgenerated = '' AND a.attidentity = ''
             AND pg_get_expr(d.adbin, d.adrelid) NOT LIKE 'nextval(%' THEN
        'default: ' || CASE
          WHEN lit ~ '^''.*''$' THEN lit
          WHEN lit ~ '^-?[0-9.]+$' OR lit IN ('true', 'false') THEN lit
          ELSE '`' || lit || '`' END
      END
    ], NULL) AS opc
    FROM (SELECT regexp_replace(regexp_replace(pg_get_expr(d.adbin, d.adrelid),
            '^(''.*'')::[a-z ]+$', '\1'), '^\((-?[0-9.]+)\)::[a-z ]+$', '\1') AS lit) l
  ) o
),
-- Claves primarias y unicas de mas de una columna: van al bloque indexes.
compuestas AS (
  SELECT t.relname,
    format('    (%s) [%s]',
      (SELECT string_agg(a.attname, ', ' ORDER BY u.ord)
       FROM unnest(k.conkey) WITH ORDINALITY u(num, ord)
       JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = u.num),
      CASE k.contype WHEN 'p' THEN 'pk' ELSE 'unique' END) AS linea
  FROM tablas t JOIN pg_constraint k ON k.conrelid = t.oid
  WHERE k.contype IN ('p', 'u') AND cardinality(k.conkey) > 1
),
bloques AS (
  SELECT t.relname,
    format(E'Table %s {\n%s%s\n}', t.relname,
      (SELECT string_agg(c.linea, E'\n' ORDER BY c.attnum) FROM columnas c WHERE c.relname = t.relname),
      coalesce(E'\n\n  indexes {\n'
        || (SELECT string_agg(x.linea, E'\n') FROM compuestas x WHERE x.relname = t.relname)
        || E'\n  }', '')
    ) AS texto
  FROM tablas t
),
referencias AS (
  SELECT format('Ref: %s.%s > %s.%s', o.relname, co.lista, d.relname, cd.lista) AS texto
  FROM pg_constraint k
  JOIN tablas o ON o.oid = k.conrelid
  JOIN tablas d ON d.oid = k.confrelid
  CROSS JOIN LATERAL (
    SELECT CASE WHEN count(*) > 1 THEN '(' || string_agg(a.attname, ', ' ORDER BY u.ord) || ')'
                ELSE min(a.attname) END AS lista
    FROM unnest(k.conkey) WITH ORDINALITY u(num, ord)
    JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = u.num
  ) co
  CROSS JOIN LATERAL (
    SELECT CASE WHEN count(*) > 1 THEN '(' || string_agg(a.attname, ', ' ORDER BY u.ord) || ')'
                ELSE min(a.attname) END AS lista
    FROM unnest(k.confkey) WITH ORDINALITY u(num, ord)
    JOIN pg_attribute a ON a.attrelid = k.confrelid AND a.attnum = u.num
  ) cd
  WHERE k.contype = 'f'
)
SELECT string_agg(texto, E'\n\n' ORDER BY relname) FROM bloques
UNION ALL
SELECT string_agg(texto, E'\n' ORDER BY texto) FROM referencias;
