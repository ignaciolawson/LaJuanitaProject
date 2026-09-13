#!/usr/bin/env bash
#
# Las dos suites SQL contra una base descartable — La Juanita Studio
#
#   ./scripts/pruebas-sql.sh
#
# Aplica TODAS las migraciones sobre una base nueva y corre los dos archivos de
# `apps/backend/src/test/resources/db/`. Sale con codigo distinto de cero si
# algun caso falla, asi que sirve para un pipeline y no solo para mirar.
#
# POR QUE EXISTE (QA-03). Antes esto eran nueve comandos escritos en un
# comentario, que habia que copiar a mano; y la lista de migraciones vivia
# repetida en las cabeceras de los dos .sql, con lo cual agregar una migracion
# era acordarse de editar tres lugares. Ya fallo dos veces: con V4 las pruebas
# se editaron y no se corrieron, y con V6 una cabecera se quedo en V5.
#
# ACA LA LISTA DE MIGRACIONES NO SE ESCRIBE: se lee del directorio. Una
# migracion nueva entra en la corrida sola.
#
# DOS MODOS:
#   - docker (por defecto): usa el contenedor de desarrollo, sin cliente psql
#     instalado en la maquina.
#   - directo: si hay un `psql` en el PATH y PGHOST definido, le pega directo.
#     Es el modo que usa CI, donde Postgres es un servicio y no un contenedor
#     que se pueda `docker exec`.
#
# Variables: LAJUANITA_CONTENEDOR, PGHOST/PGPORT/PGUSER/PGPASSWORD, PGDATABASE.

set -euo pipefail

# En Git Bash, `docker` reescribe /tmp a rutas de Windows sin esto. No la
# exportes en una shell donde tambien corras `mvn`: le rompe el classpath.
export MSYS_NO_PATHCONV=1

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
migraciones="$raiz/apps/backend/src/main/resources/db/migration"
suites="$raiz/apps/backend/src/test/resources/db"

CONTENEDOR="${LAJUANITA_CONTENEDOR:-la_juanita_postgres}"
USUARIO="${PGUSER:-la_juanita}"

if [ -n "${PGHOST:-}" ] && command -v psql > /dev/null 2>&1; then
  MODO=directo
else
  MODO=docker
fi
echo "modo: $MODO"

# Ejecuta un .sql del repo contra una base. En modo docker hay que meter el
# archivo adentro del contenedor primero; en directo se lee de disco.
#   $1 base, $2 archivo, $3 = "estricto" para cortar al primer error
correr_archivo() {
  local base="$1" archivo="$2" estricto="${3:-}"
  local flags=()
  [ "$estricto" = "estricto" ] && flags+=(-v ON_ERROR_STOP=1)
  if [ "$MODO" = directo ]; then
    psql -U "$USUARIO" -d "$base" "${flags[@]}" -f "$archivo" > /dev/null
  else
    docker exec -i "$CONTENEDOR" sh -c "cat > /tmp/corrida.sql" < "$archivo"
    docker exec "$CONTENEDOR" psql -U "$USUARIO" -d "$base" "${flags[@]}" -f /tmp/corrida.sql > /dev/null
  fi
}

# Una consulta que devuelve un valor pelado.
consultar() {
  local base="$1" sql="$2"
  if [ "$MODO" = directo ]; then
    psql -U "$USUARIO" -d "$base" -tA -c "$sql"
  else
    docker exec "$CONTENEDOR" psql -U "$USUARIO" -d "$base" -tA -c "$sql" | tr -d '\r'
  fi
}

administrar() {
  if [ "$MODO" = directo ]; then
    psql -U "$USUARIO" -d postgres -c "$1"  > /dev/null
  else
    docker exec "$CONTENEDOR" psql -U "$USUARIO" -d postgres -c "$1" > /dev/null
  fi
}

# `sort -V` y no `sort`: con orden alfabetico, V10 se aplicaria antes que V2.
mapfile -t archivos_migracion < <(find "$migraciones" -maxdepth 1 -name 'V*.sql' -type f | sort -V)
if [ ${#archivos_migracion[@]} -eq 0 ]; then
  echo "ERROR: no se encontro ninguna migracion en $migraciones" >&2
  exit 1
fi
echo "migraciones encontradas: ${#archivos_migracion[@]}"

# $1 = nombre de la base descartable, $2 = archivo de la suite
correr_suite() {
  local base="$1" suite="$2"
  echo ""
  echo "=============================================================="
  echo "  $(basename "$suite")  ->  base '$base'"
  echo "=============================================================="

  administrar "DROP DATABASE IF EXISTS $base;"
  administrar "CREATE DATABASE $base;"

  for m in "${archivos_migracion[@]}"; do
    echo "  aplicando $(basename "$m")"
    # estricto: una migracion que falla tiene que cortar aca. Correr las
    # pruebas sobre un esquema a medio aplicar da fallas que no significan
    # nada y esconden la real.
    correr_archivo "$base" "$m" estricto
  done

  # La suite NO se corre en estricto: sus casos negativos provocan errores de
  # Postgres a proposito, y `probar()` los atrapa. Con ON_ERROR_STOP cortaria
  # en el primer caso negativo, que es la mayoria.
  correr_archivo "$base" "$suite"

  local pasaron fallaron
  pasaron=$(consultar "$base" "select count(*) from _resultado where ok;")
  fallaron=$(consultar "$base" "select count(*) from _resultado where not ok;")
  echo ""
  echo "  RESULTADO: $pasaron pasaron, $fallaron fallaron"

  if [ "$fallaron" != "0" ]; then
    echo ""
    echo "  CASOS QUE NO SE COMPORTARON COMO SE ESPERABA:"
    consultar "$base" \
      "select '   #'||nro||'  '||caso||'  [esperado: '||esperado||']  '||coalesce(detalle,'') from _resultado where not ok order by nro;"
    return 1
  fi
  return 0
}

fallo=0
correr_suite pruebas_reglas "$suites/pruebas-reglas-negocio.sql" || fallo=1
correr_suite pruebas_adversariales "$suites/pruebas-adversariales.sql" || fallo=1

# Las bases descartables se dejan en pie a proposito cuando algo falla: son la
# evidencia, y la proxima corrida las recrea igual.
if [ "$fallo" = "0" ]; then
  administrar "DROP DATABASE IF EXISTS pruebas_reglas;"
  administrar "DROP DATABASE IF EXISTS pruebas_adversariales;"
  echo ""
  echo "TODO OK — las dos suites pasaron sobre ${#archivos_migracion[@]} migraciones."
else
  echo ""
  echo "HUBO FALLAS. Las bases 'pruebas_reglas' y 'pruebas_adversariales' quedan" >&2
  echo "en pie para poder mirarlas." >&2
fi
exit "$fallo"
