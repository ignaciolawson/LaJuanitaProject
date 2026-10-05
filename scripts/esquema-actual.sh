#!/usr/bin/env bash
#
# Regenera docs/db/esquema-actual.sql y esquema-actual.dbml — La Juanita Studio
#
#   ./scripts/esquema-actual.sh
#
# Aplica TODAS las migraciones sobre una base descartable y vuelca el esquema
# resultante (tablas, CHECKs, triggers, funciones, indices) con pg_dump
# --schema-only. Es un archivo DE CONSULTA: la fuente de verdad siguen siendo
# las migraciones, y Flyway nunca lee este archivo. Correlo despues de agregar
# una migracion, o el archivo queda viejo como le paso al .dbml.
#
# Usa el contenedor de desarrollo (docker compose up -d).

set -euo pipefail
export MSYS_NO_PATHCONV=1

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
migraciones="$raiz/apps/backend/src/main/resources/db/migration"
salida="$raiz/docs/db/esquema-actual.sql"
CONTENEDOR="${LAJUANITA_CONTENEDOR:-la_juanita_postgres}"
USUARIO="${PGUSER:-la_juanita}"
BASE=la_juanita_esquema_actual

admin() {
  docker exec -e PGOPTIONS='-c client_min_messages=warning' "$CONTENEDOR" \
    psql -U "$USUARIO" -d postgres -qc "$1" > /dev/null
}

admin "DROP DATABASE IF EXISTS $BASE"
admin "CREATE DATABASE $BASE"
trap 'admin "DROP DATABASE IF EXISTS $BASE"' EXIT

ultima=""
for archivo in $(ls "$migraciones"/V*__*.sql | sort -V); do
  docker exec -i "$CONTENEDOR" sh -c "cat > /tmp/migracion.sql" < "$archivo"
  docker exec "$CONTENEDOR" psql -U "$USUARIO" -d "$BASE" -q -v ON_ERROR_STOP=1 \
    -f /tmp/migracion.sql > /dev/null 2>&1 \
    || { echo "fallo al aplicar $(basename "$archivo")"; exit 1; }
  ultima="$(basename "$archivo")"
done

{
  echo "-- ============================================================================"
  echo "-- ESQUEMA ACTUAL de la base de La Juanita — ARCHIVO GENERADO, NO EDITAR"
  echo "--"
  echo "-- Es el resultado de aplicar todas las migraciones hasta $ultima"
  echo "-- sobre una base vacia, volcado con pg_dump --schema-only."
  echo "-- Generado el $(date +%Y-%m-%d) con ./scripts/esquema-actual.sh"
  echo "--"
  echo "-- Sirve para LEER la version final. No se aplica: la fuente de verdad son"
  echo "-- las migraciones (apps/backend/src/main/resources/db/migration), y el POR"
  echo "-- QUE de cada regla esta en los comentarios de la migracion que la creo."
  echo "-- Los datos iniciales (salas, matriz sala x uso, catalogo, admin de"
  echo "-- desarrollo) no estan aca: viven en V2, V3 y V28."
  echo "-- ============================================================================"
  echo
  docker exec "$CONTENEDOR" pg_dump -U "$USUARIO" -d "$BASE" --schema-only \
    --no-owner --no-privileges | tr -d '\r' | grep -Ev '^.(un)?restrict '
} > "$salida"

# La misma base, traducida a DBML para pegar en dbdiagram.io (que no entiende
# funciones, triggers ni EXCLUDE del SQL de Postgres).
salida_dbml="$raiz/docs/db/esquema-actual.dbml"
docker exec -i "$CONTENEDOR" sh -c "cat > /tmp/a-dbml.sql" < "$raiz/scripts/esquema-a-dbml.sql"
{
  echo "// ESQUEMA ACTUAL de La Juanita, en DBML — ARCHIVO GENERADO, NO EDITAR"
  echo "// Hasta $ultima. Generado el $(date +%Y-%m-%d) con ./scripts/esquema-actual.sh"
  echo "// Pegalo entero en dbdiagram.io. Trae tablas, columnas y relaciones; los"
  echo "// CHECKs, triggers y EXCLUDE (las reglas de negocio) estan en esquema-actual.sql."
  echo
  docker exec "$CONTENEDOR" psql -U "$USUARIO" -d "$BASE" -tA -v ON_ERROR_STOP=1 \
    -f /tmp/a-dbml.sql | tr -d '\r'
} > "$salida_dbml"

echo "listo: $salida (hasta $ultima)"
echo "listo: $salida_dbml"
