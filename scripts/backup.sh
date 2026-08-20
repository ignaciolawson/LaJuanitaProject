#!/usr/bin/env bash
#
# Backup de la base — La Juanita Studio
#
# DOS COSAS, no una: el volcado de la base (-Fc, con la fecha, con retencion) y
# un tar de los archivos que se subieron al sistema. Desde el Modulo 7 hay
# contratos en disco, y `pg_dump` no los ve -- restaurar solo la base deja cada
# `contrato_sello` apuntando a un PDF que no existe.
#
# La ruta de los archivos tiene que coincidir con `lajuanita.archivos.raiz` del
# backend. Es la unica configuracion que hay que mantener en dos lados.
# Pensado para correr desde cron:
#
#   0 3 * * *  cd /ruta/al/repo && ./scripts/backup.sh >> /var/log/lajuanita-backup.log 2>&1
#
# El procedimiento completo -- que contiene el dump, cada cuanto, donde va, y
# como se restaura -- esta en docs/operacion.md. Este archivo es solo el
# comando, para que el cron tenga algo que llamar.
#
# CORRE UN RESTORE DE PRUEBA DE VEZ EN CUANDO. Un backup que nunca se restauro
# es una intencion, no un respaldo. docs/operacion.md §2 tiene el ensayo hecho
# y el procedimiento.

set -euo pipefail

# En Git Bash, `docker` reescribe las rutas /tmp a rutas de Windows si no esta
# esta variable. No la exportes en una shell donde tambien corras `mvn`: le
# rompe el classpath al launcher.
export MSYS_NO_PATHCONV=1

CONTENEDOR="${LAJUANITA_CONTENEDOR:-la_juanita_postgres}"
DB="${POSTGRES_DB:-la_juanita}"
USUARIO="${POSTGRES_USER:-la_juanita}"
DESTINO="${LAJUANITA_BACKUP_DIR:-./backups}"

# Los archivos que sube el sistema: contratos del sello, y mas adelante los
# comprobantes. Tiene que ser la MISMA ruta que `lajuanita.archivos.raiz` del
# backend -- si no, este script respalda una carpeta vacia todos los dias y nadie
# se entera hasta el restore.
ARCHIVOS="${LAJUANITA_ARCHIVOS_DIR:-./apps/backend/archivos}"

# Retencion. 7 diarios + 4 semanales: un dump de esta base pesa ~105 KB, asi
# que el limite no es el espacio sino cuanto tarda en descubrirse un daño.
DIARIOS_A_CONSERVAR="${LAJUANITA_BACKUP_DIARIOS:-7}"
SEMANALES_A_CONSERVAR="${LAJUANITA_BACKUP_SEMANALES:-4}"

# Un dump valido de esta base no baja de ~50 KB ni con las tablas vacias: el
# esquema solo (23 tablas, 139 constraints, 14 triggers) ya ocupa eso. Un
# archivo mas chico es un dump truncado, y el punto de este umbral es que el
# cron se entere HOY y no el dia que haya que restaurar.
MINIMO_BYTES="${LAJUANITA_BACKUP_MINIMO:-50000}"

fecha=$(date +%F)
mkdir -p "$DESTINO/diarios" "$DESTINO/semanales"
archivo="$DESTINO/diarios/lajuanita-$fecha.dump"

echo "[$(date +'%F %T')] volcando $DB desde $CONTENEDOR -> $archivo"

# -T no es opcional cuando esto lo llama un cron: sin el, Compose intenta
# asignar una TTY, no hay terminal, y el comando falla.
if docker compose ps --status running --services 2>/dev/null | grep -qx postgres; then
  docker compose exec -T postgres pg_dump -U "$USUARIO" -d "$DB" -Fc > "$archivo"
else
  docker exec "$CONTENEDOR" pg_dump -U "$USUARIO" -d "$DB" -Fc > "$archivo"
fi

bytes=$(wc -c < "$archivo" | tr -d ' ')
if [ "$bytes" -lt "$MINIMO_BYTES" ]; then
  echo "ERROR: el dump pesa $bytes bytes, menos que el minimo de $MINIMO_BYTES." >&2
  echo "       Se conserva como .sospechoso para poder mirarlo; NO cuenta como backup." >&2
  mv "$archivo" "$archivo.sospechoso"
  exit 1
fi

# Verificar que el archivo es legible, no solo que existe. `pg_restore -l` lee
# el indice del dump sin tocar ninguna base: si esta corrupto, falla aca y no
# el dia que haga falta.
docker exec -i "$CONTENEDOR" sh -c 'cat > /tmp/verificar.dump' < "$archivo"
if ! docker exec "$CONTENEDOR" pg_restore -l /tmp/verificar.dump > /dev/null 2>&1; then
  echo "ERROR: el dump no se puede leer con pg_restore -l. Archivo corrupto." >&2
  docker exec "$CONTENEDOR" rm -f /tmp/verificar.dump || true
  mv "$archivo" "$archivo.corrupto"
  exit 1
fi
docker exec "$CONTENEDOR" rm -f /tmp/verificar.dump

echo "[$(date +'%F %T')] ok: $bytes bytes, indice legible"

# ---------------------------------------------------------------------------
# LOS ARCHIVOS SUBIDOS
#
# Desde el Modulo 7 el sistema guarda archivos fuera de la base -- los contratos
# del sello, que son el respaldo LEGAL de un lanzamiento-- y `pg_dump` no los ve.
#
# Sin esto el modo de falla es de los peores que hay: el backup corre verde
# todos los dias, la base se restaura perfecta, y cada `contrato_sello` apunta a
# un PDF que no existe. La regla dura del modulo -- "no se publica un release sin
# contrato adjunto"-- se seguiria dando por cumplida sobre un archivo que no
# esta. Se descubre el dia que alguien abre un contrato, que es tarde.
#
# Va como un tar aparte y no adentro del dump: son dos cosas con formas
# distintas, y separadas se puede restaurar una sin la otra.
#
# Si la carpeta no existe todavia (una instalacion donde nadie subio nada) NO es
# un error: se avisa y se sigue. Lo que si seria un error es no decirlo.
# ---------------------------------------------------------------------------
tar_archivos="$DESTINO/diarios/lajuanita-archivos-$fecha.tar.gz"

if [ -d "$ARCHIVOS" ]; then
  # `-C` para que el tar guarde rutas relativas: sin eso el restore las
  # reconstruye desde la raiz del sistema de archivos del que hizo el backup.
  tar -czf "$tar_archivos" -C "$(dirname "$ARCHIVOS")" "$(basename "$ARCHIVOS")"
  cuantos=$(find "$ARCHIVOS" -type f | wc -l | tr -d ' ')
  echo "[$(date +'%F %T')] archivos: $cuantos en $tar_archivos"
else
  echo "[$(date +'%F %T')] AVISO: no existe $ARCHIVOS, no hay archivos que respaldar."
  echo "       Si el sistema ya tiene contratos cargados, esta ruta esta mal y el"
  echo "       respaldo esta INCOMPLETO. Ver LAJUANITA_ARCHIVOS_DIR."
  tar_archivos=""
fi

# Los domingos, una copia a semanales.
if [ "$(date +%u)" = "7" ]; then
  cp "$archivo" "$DESTINO/semanales/lajuanita-$fecha.dump"
  [ -n "$tar_archivos" ] && cp "$tar_archivos" "$DESTINO/semanales/"
  echo "  + copia semanal"
fi

# Retencion: borrar los mas viejos que excedan el limite. Se ordena por NOMBRE,
# no por fecha del archivo: el nombre lleva la fecha en ISO, asi que orden
# alfabetico es orden cronologico, y copiar los dumps a otro disco no cambia el
# orden como si lo haria un mtime.
# `patron` es el segundo parametro desde que hay dos tipos de archivo: el dump y
# el tar de los subidos. Con un solo patron hardcodeado, los tar se acumulaban
# para siempre -- que es la forma de que el disco se llene sin que nadie mire.
podar() {
  local dir="$1" conservar="$2" patron="${3:-lajuanita-*.dump}"
  local viejos=()
  # `find | sort` y no `ls`: con el directorio vacio, `ls patron*` sale con
  # codigo 2 y `set -e` mata el script DESPUES de haber hecho el backup bien.
  while IFS= read -r f; do viejos+=("$f"); done < <(
    find "$dir" -maxdepth 1 -name "$patron" -type f | sort
  )
  local total=${#viejos[@]}
  if [ "$total" -gt "$conservar" ]; then
    local i
    for ((i = 0; i < total - conservar; i++)); do
      echo "  - borrando ${viejos[$i]}"
      rm -f "${viejos[$i]}"
    done
  fi
}

podar "$DESTINO/diarios" "$DIARIOS_A_CONSERVAR"
podar "$DESTINO/semanales" "$SEMANALES_A_CONSERVAR"
podar "$DESTINO/diarios" "$DIARIOS_A_CONSERVAR" 'lajuanita-archivos-*.tar.gz'
podar "$DESTINO/semanales" "$SEMANALES_A_CONSERVAR" 'lajuanita-archivos-*.tar.gz'

echo "[$(date +'%F %T')] listo"
