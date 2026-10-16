#!/usr/bin/env bash
#
# Levanta La Juanita en un servidor NUEVO, de cero, en un solo comando.
#
#     ssh root@<IP>
#     curl -fsSL https://raw.githubusercontent.com/ignaciolawson/LaJuanitaProject/main/deploy/preparar-servidor.sh | bash
#
# Pensado para un droplet de DigitalOcean con Ubuntu 24.04 (sirve en cualquier
# Ubuntu con IP publica). Hace, en orden: swap, Docker, firewall, el repo, el
# `.env` con secretos generados, la carpeta de archivos, los builds, el stack
# arriba y -- lo que no se puede saltear -- le cambia la contrasena al admin
# sembrado por `V3`.
#
# Se puede volver a correr: lo que ya esta hecho no se rehace, y en ese caso
# solo actualiza el repo y reconstruye.
#
# ⚠️ El `.env` que genera es de DEMO: dominio `<ip>.sslip.io` y el sitio NO
# indexable (`X_ROBOTS_TAG=noindex, nofollow`). Para produccion se edita el
# `.env` a mano -- ver `docs/operacion.md` §3.

set -euo pipefail

REPO="${REPO:-https://github.com/ignaciolawson/LaJuanitaProject.git}"
DIR="${DIR:-/opt/lajuanita}"

[ "$(id -u)" = 0 ] || { echo "Correlo como root (o con sudo)."; exit 1; }

paso() { printf '\n==> %s\n' "$1"; }

# --- 1 · Swap ----------------------------------------------------------------
# ⚠️ Los tres builds (Maven, Next, Vite) se hacen ACA. Con 1-2 GB de RAM y sin
# swap, el de Next lo mata el OOM killer a mitad de camino y el error que queda
# es un "Killed" sin contexto.
paso "Swap"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile > /dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "2 GB de swap creados."
else
  echo "Ya habia swap."
fi

# --- 2 · Docker --------------------------------------------------------------
paso "Docker"
if ! command -v docker > /dev/null; then
  curl -fsSL https://get.docker.com | sh
else
  echo "Ya estaba instalado."
fi

# --- 3 · Firewall ------------------------------------------------------------
# Solo SSH, 80 y 443. La base NO se publica (el compose no tiene `ports:` en
# postgres) y el backend tampoco: todo entra por Caddy.
paso "Firewall"
ufw allow OpenSSH > /dev/null
ufw allow 80/tcp > /dev/null
ufw allow 443/tcp > /dev/null
ufw --force enable > /dev/null
echo "Abiertos: 22, 80, 443."

# --- 4 · El repo -------------------------------------------------------------
paso "Repo en $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
else
  git clone "$REPO" "$DIR"
fi
cd "$DIR"

# --- 5 · El .env -------------------------------------------------------------
# Se genera UNA vez. Si ya existe no se toca: regenerarlo cambiaria la
# contrasena de una base que ya se inicializo con la anterior, y Postgres solo
# la lee la primera vez -- el backend quedaria afuera de su propia base.
paso ".env"
if [ ! -f .env ]; then
  IP="$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')"
  # Con guiones y no con puntos: `164-90-1-2.sslip.io` resuelve a 164.90.1.2 y
  # Caddy le saca un certificado real de Let's Encrypt. Dominio gratis, HTTPS
  # de verdad, nada que comprar.
  DOMINIO="${DOMINIO:-$(echo "$IP" | tr . -).sslip.io}"

  cp deploy/env.ejemplo .env
  sed -i \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')|" \
    -e "s|^DOMINIO=.*|DOMINIO=$DOMINIO|" \
    -e "s|^CORS_ORIGENES=.*|CORS_ORIGENES=https://$DOMINIO|" \
    -e "s|^X_ROBOTS_TAG=.*|X_ROBOTS_TAG=noindex, nofollow|" \
    -e "s|^JAVA_OPTS=.*|JAVA_OPTS=-Xmx512m|" \
    .env
  chmod 600 .env
  echo "Generado para https://$DOMINIO"
else
  echo "Ya existia; no se toca."
fi
DOMINIO="$(grep '^DOMINIO=' .env | cut -d= -f2-)"

# --- 6 · La carpeta de archivos ----------------------------------------------
# ⚠️ uid 1001 = el usuario `lajuanita` del Dockerfile del backend. Sin el chown
# todo arranca bien y falla la primera subida de un comprobante, no antes.
paso "Carpeta de archivos"
mkdir -p archivos
chown 1001:1001 archivos

# --- 7 · Builds, de a uno ----------------------------------------------------
# De a uno y no con `up --build`, que los corre en paralelo: tres builds a la
# vez en una maquina chica es el OOM de arriba aunque haya swap.
paso "Builds (la primera vez tarda 10-20 minutos)"
docker compose build backend
docker compose build landing
docker compose build proxy

paso "Arriba"
docker compose up -d

# --- 8 · Esperar al backend --------------------------------------------------
paso "Esperando al backend"
for _ in $(seq 1 60); do
  if docker compose exec -T backend curl -fsS http://localhost:8080/actuator/health 2> /dev/null | grep -q UP; then
    echo "UP."
    break
  fi
  sleep 5
done

# --- 9 · La contrasena del admin sembrado ------------------------------------
# ⚠️ ESTE PASO NO ES OPCIONAL. `V3` siembra admin@lajuanita.local con la
# contrasena `lajuanita2026`, y el repo es PUBLICO: apenas el sitio esta en
# internet, cualquiera que lea la migracion entra como ADMIN. Se cambia por la
# API misma (`POST /api/me/password`), no tocando la base a mano, para que pase
# por el mismo BCrypt y el mismo `credenciales_desde` (V38) que cualquier cambio.
#
# Desactivar la cuenta del todo es la migracion `V39`, y va DESPUES de que
# existan los usuarios reales -- al reves te quedas afuera del sistema.
paso "Contrasena del admin"
ARCHIVO_CLAVE=/root/lajuanita-admin.txt
TOKEN="$(docker compose exec -T backend curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@lajuanita.local","password":"lajuanita2026"}' \
  http://localhost:8080/api/auth/login | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || true)"

if [ -n "$TOKEN" ]; then
  NUEVA="$(openssl rand -base64 18 | tr -d '/+=\n')"
  CODIGO="$(docker compose exec -T backend curl -s -o /dev/null -w '%{http_code}' -X POST \
    -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
    -d "{\"passwordActual\":\"lajuanita2026\",\"passwordNueva\":\"$NUEVA\"}" \
    http://localhost:8080/api/me/password)"
  if [ "$CODIGO" = 200 ]; then
    printf 'admin@lajuanita.local\n%s\n' "$NUEVA" > "$ARCHIVO_CLAVE"
    chmod 600 "$ARCHIVO_CLAVE"
    echo "Cambiada. Quedo en $ARCHIVO_CLAVE"
  else
    echo "⚠️  El cambio devolvio $CODIGO. Cambiala A MANO desde el panel YA."
  fi
else
  echo "La de desarrollo ya no entra (ya se habia cambiado). Esta en $ARCHIVO_CLAVE si la genero este script."
fi

# --- Listo -------------------------------------------------------------------
paso "Listo"
cat <<FIN
  Landing:  https://$DOMINIO
  Panel:    https://$DOMINIO/app/
  Admin:    admin@lajuanita.local  /  ver $ARCHIVO_CLAVE

  El certificado HTTPS puede tardar un minuto en salir la primera vez.
  Logs:       cd $DIR && docker compose logs -f backend
  Actualizar: volver a correr este mismo script.
FIN
