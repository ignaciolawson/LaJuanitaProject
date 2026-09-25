# syntax=docker/dockerfile:1

# ============================================================================
# El backend, empaquetado.
#
# El contexto de build es `apps/backend`: este servicio no necesita nada del
# resto del monorepo (el `pom.xml` no es un modulo de un padre agregador, y las
# migraciones de Flyway viajan adentro de `src/main/resources`).
#
# Se buildea EN EL SERVIDOR, no aca. La VM de Oracle es ARM64 y esta maquina es
# x86: una imagen construida en Windows no arranca alla. Por eso el compose de
# produccion usa `build:` y no una imagen de un registry -- que ademas ahorra
# tener que mantener un registry.
# ============================================================================

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# El `.m2` va en una cache de BuildKit en vez de resolverse con un
# `dependency:go-offline` sobre el pom solo. Con Spring Boot 4 ese objetivo
# baja de menos de lo que despues hace falta, asi que la capa "cacheada" se
# invalidaba igual y el primer build honesto tardaba lo mismo dos veces.
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B clean package -DskipTests

# Las pruebas NO corren aca, y es deliberado: `mvn test` de este proyecto
# necesita una base Postgres viva (las 779 del backend corren contra una base
# descartable, ver `scripts/pruebas-backend.sh`). Quien las corre es el CI, en
# cada push. Un build de imagen que las intente termina o fallando siempre o
# arrastrando una base adentro del builder.

# ============================================================================
FROM eclipse-temurin:21-jre
WORKDIR /app

# Ubuntu y no Alpine: musl y ARM64 juntos son el par que menos garantia tiene,
# y este sistema arranca una sola vez por deploy -- los ~150 MB extra de imagen
# no compran nada contra el riesgo de descubrirlo en el servidor.

# `curl` es solo para el healthcheck del compose contra /actuator/health. Sin
# healthcheck no hay reinicio automatico: Docker no puede reiniciar lo que no
# sabe que esta caido.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

# ----------------------------------------------------------------------------
# ⚠️ ESTA LINEA ES `CS-03` Y ES LA RAZON POR LA QUE ESTE ARCHIVO EXISTE.
#
# `SeguridadConfig` se niega a arrancar si detecta que esta firmando los tokens
# con el secreto commiteado en `application.properties` -- salvo que exista el
# permiso `lajuanita.jwt.permitir-secreto-de-desarrollo=true`. Su javadoc
# justifica el candado diciendo que ese permiso "vive en el properties del repo,
# que es exactamente lo que un deploy no copia".
#
# Un jar de Spring Boot SI lo copia:
#
#     $ jar tf target/backend-0.0.1-SNAPSHOT.jar | grep application.properties
#     BOOT-INF/classes/application.properties
#
# O sea que el permiso viaja adentro del artefacto y olvidarse de `JWT_SECRET`
# NO rompia el arranque: la aplicacion levantaba firmando con una clave que esta
# publicada en el repositorio, dejando un WARN entre cientos. Con esa clave se
# fabrica un token de ADMIN sin saber ninguna contrasena.
#
# Una variable de entorno gana sobre el properties empaquetado, asi que esta
# linea cierra el artefacto SIN tocar un archivo versionado -- que era el punto:
# todo el resto de este deploy son variables de entorno, y pedir ademas que
# alguien se acuerde de borrar una linea del repo es justo lo que un deploy se
# olvida. Es el mismo defecto que SEC-01 le marco al candado anterior, con el
# signo cambiado.
#
# ⚠️ BORRAR ESTA LINEA NO FALLA NI AVISA. Deja el sistema arrancando con la
# clave publica. Si alguna vez hay que sacarla, que sea con el hallazgo `CS-03`
# del informe de ciberseguridad de 2026-09 leido, no de memoria.
# ----------------------------------------------------------------------------
ENV LAJUANITA_JWT_PERMITIR_SECRETO_DE_DESARROLLO=false

# Donde viven los contratos del sello y los comprobantes de pago y de egreso.
#
# Es una ruta ABSOLUTA y tiene que estar montada sobre un volumen: un contenedor
# efimero se lleva los archivos en el primer reinicio y la base sigue diciendo
# que estan. No falla nada -- se descubre el dia que alguien abre un contrato.
#
# ⚠️ Y tiene que coincidir con `LAJUANITA_ARCHIVOS_DIR` de `scripts/backup.sh`,
# que es la unica configuracion de este sistema que se mantiene en dos lados. Si
# no coinciden, el script respalda una carpeta vacia y solo lo dice en su log.
ENV ARCHIVOS_RAIZ=/archivos

# Sin esto la JVM en un contenedor con poca memoria calcula su heap contra la
# RAM del host y la mata el OOM killer sin decir por que.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"

# Usuario sin privilegios. El volumen se monta sobre /archivos, asi que el
# chown tiene que existir antes: Docker le da al punto de montaje el dueno del
# directorio que encuentra.
RUN useradd --system --create-home --uid 1001 lajuanita \
 && mkdir -p /archivos \
 && chown -R lajuanita:lajuanita /archivos /app
USER lajuanita

COPY --from=build --chown=lajuanita:lajuanita /build/target/backend-*.jar /app/app.jar

EXPOSE 8080

# `sh -c` para que $JAVA_OPTS se expanda. `exec` para que la JVM sea el PID 1 y
# reciba el SIGTERM de `docker stop` -- sin eso el apagado es a los 10 segundos
# y por SIGKILL, en medio de lo que este haciendo.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
