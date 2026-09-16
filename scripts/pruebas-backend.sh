#!/usr/bin/env bash
#
# La suite Java contra una base VACIA, como la corre CI — La Juanita Studio
#
#   ./scripts/pruebas-backend.sh                       # toda la suite
#   ./scripts/pruebas-backend.sh -Dtest=PagoTest       # lo que le pases va a mvn
#
# Crea una base descartable, corre `mvn test` apuntandole con DB_URL, y la
# borra al salir pase lo que pase. Sale con el codigo de mvn.
#
# POR QUE EXISTE (2026-09-15). `mvn test` a secas corre contra la base de
# desarrollo, que tiene meses de datos. CI corre contra una base recien creada.
# Un caso puede pasar aca POR LOS DATOS DE OTROS y dar rojo alla: paso con
# `PagoTest.sin_solapa_elegida_vienen_todos_los_pagos`, que afirmaba
# `length() > 0` sobre todo el listado — la base de dev lo llenaba con cientos
# de pagos cerrados, y en CI, vacia, daba cero. Tres pushes rojos que nadie vio
# desde esta maquina (`mejoras.md` §21). Este script es la unica forma local
# de ver lo que CI ve; correrlo antes de commitear algo que toque tests o
# consultas es lo que evita que vuelva a pasar.
#
# Ademas prueba, como CI, que TODAS las migraciones apliquen sobre una base
# vacia: Flyway las corre al levantar el contexto.
#
# DOS MODOS, los mismos de pruebas-sql.sh: docker (por defecto, el contenedor
# de desarrollo) o directo (psql en el PATH y PGHOST definido).
#
# Variables: LAJUANITA_CONTENEDOR, PGHOST/PGPORT/PGUSER/PGPASSWORD.

set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTENEDOR="${LAJUANITA_CONTENEDOR:-la_juanita_postgres}"
USUARIO="${PGUSER:-la_juanita}"
CLAVE="${PGPASSWORD:-la_juanita}"
HOST="${PGHOST:-localhost}"
PUERTO="${PGPORT:-5432}"

if [ -n "${PGHOST:-}" ] && command -v psql > /dev/null 2>&1; then
  MODO=directo
else
  MODO=docker
fi

# OJO: MSYS_NO_PATHCONV solo en las llamadas a docker, nunca exportada — en la
# misma shell rompe el classpath del launcher de Maven (ver pruebas-sql.sh).
administrar() {
  if [ "$MODO" = directo ]; then
    psql -U "$USUARIO" -d postgres -c "$1" > /dev/null
  else
    MSYS_NO_PATHCONV=1 docker exec "$CONTENEDOR" psql -U "$USUARIO" -d postgres -c "$1" > /dev/null
  fi
}

BASE="ci_$(date +%Y%m%d_%H%M%S)_$$"
echo "modo: $MODO · base descartable: $BASE"

if ! administrar "CREATE DATABASE $BASE" 2> /dev/null; then
  echo "No pude crear la base. ¿Esta levantado Postgres? (docker compose up -d)" >&2
  exit 1
fi
# Se borra siempre, incluso si mvn falla o lo cortas con Ctrl+C.
trap 'administrar "DROP DATABASE IF EXISTS $BASE" || echo "quedo la base $BASE sin borrar" >&2' EXIT

cd "$raiz/apps/backend"
codigo=0
DB_URL="jdbc:postgresql://$HOST:$PUERTO/$BASE" DB_USER="$USUARIO" DB_PASSWORD="$CLAVE" \
  mvn --batch-mode test "$@" || codigo=$?

if [ "$codigo" -eq 0 ]; then
  echo "backend en verde contra una base vacia, como en CI"
else
  echo "backend en ROJO contra una base vacia: eso es lo que CI va a ver" >&2
fi
exit "$codigo"
