# syntax=docker/dockerfile:1

# ============================================================================
# La landing (Next).
#
# ⚠️ El contexto de build es LA RAIZ DEL REPO, no esta carpeta:
#
#     docker build -f apps/landing/Dockerfile .
#
# Y no es una molestia evitable -- `package-lock.json` y los dos
# `package.json` de los workspaces viven arriba, y `npm ci` los necesita a los
# tres para reproducir el arbol. El compose de produccion ya lo hace asi.
#
# Corre con `node server.js` y no como archivos estaticos servidos por Caddy,
# aunque las 27 paginas sean estaticas. El motivo es que las cabeceras de
# seguridad del sitio (CSP, Referrer-Policy, Permissions-Policy) estan
# definidas en `next.config.ts` y verificadas contra `next start`: exportarlo
# obligaria a copiarlas al Caddyfile, o sea una SEGUNDA definicion de la misma
# politica, que es exactamente como se desincronizan.
# ============================================================================

FROM node:22-slim AS build
WORKDIR /repo

# Los manifiestos primero, para que la capa de `npm ci` sobreviva a un cambio
# de codigo. Van los dos workspaces aunque solo se buildee uno: sin el
# `package.json` del panel, `npm ci` se planta -- el lockfile lo declara.
COPY package.json package-lock.json ./
COPY apps/landing/package.json apps/landing/
COPY apps/platform/package.json apps/platform/
RUN npm ci --no-audit --no-fund

COPY apps/landing apps/landing
RUN npm run build:landing

# ============================================================================
FROM node:22-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# ⚠️ Sin esto el server de `standalone` escucha en localhost y **desde afuera
# del contenedor no contesta nada**: se ve como si la imagen no arrancara.
ENV HOSTNAME=0.0.0.0

# El `standalone` trae `apps/landing/server.js` y un `node_modules` recortado,
# pero **NO trae `.next/static`** -- los bundles del cliente. Sin la segunda
# linea el sitio carga el HTML y queda sin estilos ni JavaScript, con 404 en la
# consola y ningun error del lado del servidor.
COPY --from=build --chown=node:node /repo/apps/landing/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/landing/.next/static ./apps/landing/.next/static
# `public` hoy ya viaja adentro del standalone; se copia igual porque eso
# depende de la version de Next y el sintoma de que deje de viajar son las
# fotos rotas, no un build fallado.
COPY --from=build --chown=node:node /repo/apps/landing/public ./apps/landing/public

USER node
EXPOSE 3000

CMD ["node", "apps/landing/server.js"]
