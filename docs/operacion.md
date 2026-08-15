# Operación — La Juanita Studio

Qué hacer cuando el sistema está corriendo y algo hay que hacerle: respaldarlo,
restaurarlo, desplegarlo, o sacarlo de una migración que falló.

**Todo lo que dice este archivo se ejecutó.** Los comandos son copias de los que
se corrieron, no reconstrucciones de memoria; donde algo no se probó, lo dice
con esas palabras. Un procedimiento de restore que nadie corrió no es un
procedimiento: es una intención, y se descubre que estaba mal el día que hace
falta.

> **Estado al 2026-08-14.** Las secciones 1 (backup), 2 (restore) y 4 (fallas de
> migración) están probadas y son de uso inmediato. La sección 3 (deploy) tiene
> lo que ya está decidido y **no** el procedimiento cerrado: falta elegir el
> hosting, que es una decisión de octubre. Está marcado adentro.

---

## 0. Por qué esto existe ahora y no en diciembre

El plan nombra los backups como uno de los tres puntos donde este proyecto sube
el estándar respecto de un trabajo académico (`sistema-gestion-plan.md:29`) y
después nunca los define. *"Volcado diario de la base"* es una línea de
presupuesto, no un procedimiento.

Diciembre incluye **migrar el Notion de Micaela y correr en paralelo con el
sistema viejo**. El día que haga falta restaurar va a haber datos reales de un
negocio en uso del otro lado, y ese no es el día para averiguar si el dump sirve.

---

## 1. Backup

### El comando

Volcado en formato *custom* (`-Fc`), que es el que `pg_restore` puede leer
selectivamente y viene comprimido:

```bash
docker exec la_juanita_postgres pg_dump -U la_juanita -d la_juanita -Fc > lajuanita-$(date +%F).dump
```

En el VPS, con el nombre del servicio en vez del contenedor de desarrollo:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > ...
```

**`-T` no es opcional** cuando lo llama un cron: sin él, Compose intenta asignar
una TTY, no hay terminal, y el comando falla o —peor— mete caracteres de control
en el dump.

### Qué contiene y qué no

Un dump de `-Fc` de esta base trae el esquema completo (23 tablas, 139
constraints, 14 triggers, 55 índices), los datos, **y la tabla
`flyway_schema_history`**, que es la que le dice a la aplicación qué migraciones
están aplicadas. Trae también el `CREATE EXTENSION btree_gist` —la extensión que
hacen falta para los dos `EXCLUDE`—, aunque no los objetos internos de la
extensión, que Postgres recrea solo.

**No trae** los archivos que se suben (material de clase, comprobantes). Cuando
el módulo de archivos exista, el backup son dos cosas y esta sección se parte en
dos.

### Frecuencia, retención, destino

| Qué | Decisión |
|---|---|
| Frecuencia | Diaria, de madrugada (el negocio no opera a esa hora) |
| Retención | 7 diarios + 4 semanales. Un dump de esta base pesa **105 KB** con datos de desarrollo; aun con años de operación no es un problema de espacio, y la retención larga es lo que salva de un daño que se descubre tarde |
| Destino | **Fuera del VPS.** Un backup en el mismo disco que la base no es un backup: cubre "borré una tabla" y no cubre "el disco murió" |

El destino concreto depende del hosting (§3). Hasta que eso se decida, **el
respaldo se corre a mano antes de cualquier operación riesgosa** — que es
exactamente lo que hay que hacer igual, aunque el cron exista.

### El script

`scripts/backup.sh` hace el volcado, lo nombra con la fecha y aplica la
retención. Para el cron diario:

```
0 3 * * *  cd /ruta/al/repo && ./scripts/backup.sh >> /var/log/lajuanita-backup.log 2>&1
```

**Un backup que nadie mira es un backup que no existe.** El script sale con
código distinto de cero si el dump falla o si sale sospechosamente chico, para
que el cron pueda avisar.

---

## 2. Restore

### Ensayo del 2026-08-14 — hecho, y qué probó

Se volcó la base de desarrollo, se restauró en una base descartable
(`ensayo_restore`) y se verificó **contra el catálogo, no a ojo**:

| Verificación | Origen | Restaurada |
|---|---|---|
| Tablas | 23 | **23** |
| Constraints | 139 | **139** |
| Triggers | 14 | **14** |
| Índices | 55 | **55** |
| Migraciones en `flyway_schema_history` | 8 | **8** |
| Filas (`usuario` / `sala` / `sala_tipo_uso` / `alumno`) | 2 / 3 / 12 / 1 | **iguales** |
| Extensión `btree_gist` | presente | **presente** |

Contar filas y tablas **no alcanza**, porque el modo de falla que importa es que
el esquema vuelva sin las reglas. Así que sobre la base restaurada se ejercitaron
tres reglas de las tres clases que usa el proyecto, y las tres rechazaron:

- **`EXCLUDE`** — una reserva solapada en la misma sala →
  `conflicting key value violates exclusion constraint "reserva_sin_solapamiento"`.
- **FK compuesta** (la matriz sala × tipo de uso) — grabación en una sala que no
  graba → `violates foreign key constraint "reserva_uso_permitido_en_sala"`.
- **Trigger de V7** — borrar historial de clases → *"No se borran filas de
  reserva. Es historial de un negocio real…"*.

Y el cierre, que es el único que prueba el conjunto: **se levantó la aplicación
real apuntada a la base restaurada** y arrancó —
`Successfully validated 8 migrations`, `Started BackendApplication`. Flyway no
quiso re-aplicar nada, que es la prueba de que la historia de migraciones viajó
entera.

**Próximo ensayo: cuando haya datos reales** (después de migrar el Notion), y
después una vez por cuatrimestre. Un restore probado sobre 2 usuarios de
desarrollo prueba el procedimiento, no el volumen.

### El procedimiento

```bash
# 1. La base destino tiene que estar VACÍA. pg_restore no limpia por su cuenta:
#    restaurar encima de una base con datos deja una mezcla de las dos.
docker exec la_juanita_postgres psql -U la_juanita -d postgres \
  -c "DROP DATABASE IF EXISTS la_juanita_restore;" -c "CREATE DATABASE la_juanita_restore;"

# 2. Meter el dump en el contenedor y restaurar.
docker exec -i la_juanita_postgres sh -c 'cat > /tmp/restore.dump' < lajuanita-2026-08-14.dump
docker exec la_juanita_postgres pg_restore -U la_juanita -d la_juanita_restore --exit-on-error /tmp/restore.dump

# 3. Verificar antes de creerle.
docker exec la_juanita_postgres psql -U la_juanita -d la_juanita_restore -c \
  "select count(*) from information_schema.tables where table_schema='public';"
docker exec la_juanita_postgres psql -U la_juanita -d la_juanita_restore -c \
  "select version, success from flyway_schema_history order by installed_rank;"
```

**`--exit-on-error` es lo que separa un restore de una ilusión.** Por defecto
`pg_restore` informa los errores y sigue, y termina con código 0: se puede
quedar sin la mitad de las constraints y el comando "salió bien". Con el flag,
el primer error corta.

**Restaurar en una base nueva, no encima de la que falló.** La que falló es la
evidencia de qué pasó, y mientras exista se puede comparar contra ella. Recién
cuando la restaurada está verificada se apunta la aplicación (`DB_URL`) y se
renombra la vieja.

### Trampas de esta máquina

- **Git Bash reescribe las rutas `/tmp` a rutas de Windows.** Antepone
  `MSYS_NO_PATHCONV=1` a los `docker` — y **no** la dejes exportada en una shell
  donde después corras `mvn`, porque le rompe el classpath al launcher. Es la
  misma trampa que ya está anotada para las pruebas SQL.
- **Redirigir el dump a un archivo (`>`) funciona igual en Git Bash y en
  PowerShell 7** — se verificó: mismos 107218 bytes, mismos bytes mágicos
  `PGDMP`, y `pg_restore -l` lo lee en los dos casos.

---

## 3. Deploy

> ⚠️ **Esta sección está incompleta a propósito, y es la única.** El hosting se
> decide en octubre. Lo que sigue es lo que ya está decidido y verificado; lo
> que falta está listado al final como lo que falta, no disfrazado de
> procedimiento. Escribir pasos de un deploy que nadie corrió sería el mismo
> error que este documento vino a corregir.

### Forma decidida

VPS con Docker Compose y los tres servicios (Postgres, backend, panel) en la
misma red interna. El compose de desarrollo (`docker-compose.yml`) levanta
**solo la base**: el backend corre con `mvn spring-boot:run` y el front con
Vite. El del deploy es otro archivo.

### Lo que hay que cambiar sí o sí — y falla si no

La tabla completa de variables por ambiente está en el README, sección *"Antes
de desplegar esto en algún lado"*, y es la fuente. Lo que importa repetir acá es
**qué pasa si te olvidás de cada una**:

| Si te olvidás de… | Qué pasa |
|---|---|
| `JWT_SECRET` (valor **nuevo**) y borrar `lajuanita.jwt.permitir-secreto-de-desarrollo` | **La aplicación no arranca.** Es a propósito y falla cerrado: el secreto commiteado es público y con él se fabrica un token de `ADMIN` sin saber ninguna contraseña |
| `DB_PASSWORD` / `POSTGRES_PASSWORD` | Arranca perfecto con la contraseña pública `la_juanita`. **No avisa nada** |
| Sacar el `ports: 5432:5432` del compose | La base queda publicada al mundo. Con la contraseña por defecto, es la combinación estándar de base comprometida |
| `CORS_ORIGENES` | El panel no puede llamar a la API desde el navegador |
| Desactivar `admin@lajuanita.local` (migración nueva, después de crear los usuarios reales) | Queda una cuenta de administrador con contraseña publicada en el README |

Las tres primeras están ordenadas por lo que cuesta descubrirlas: la primera se
descubre sola, la segunda no se descubre nunca, y la tercera se descubre cuando
ya es tarde.

### Orden de arranque

Postgres primero y **sano**, después el backend. No es preferencia: el backend
corre las migraciones al arrancar y contra una base que todavía se está
inicializando falla el arranque entero. Por eso el healthcheck de Postgres tiene
`start_period: 30s` — la primera vez tarda, y sin eso los reintentos se consumen
antes de que llegue a estar lista.

### Lo que falta para cerrar esta sección

1. **Decidir el hosting** (octubre). De ahí salen el destino de los backups y el
   procedimiento de HTTPS.
2. **Un `Dockerfile` para el backend y otro para el panel.** Hoy no existen: en
   desarrollo el backend lo levanta Maven y el front lo levanta Vite.
3. **`docker-compose.prod.yml`** con los tres servicios, `restart:
   unless-stopped` y healthcheck del backend contra `/actuator/health` —el
   endpoint ya existe y es público—. **Sin healthcheck no hay reinicio
   automático: Docker no puede reiniciar lo que no sabe que está caído.** Es la
   mitad que le falta a QA-07.
4. **Proxy HTTPS por delante.** Cuando esté, hay que definir
   `server.forward-headers-strategy`, o el log de seguridad va a registrar la IP
   del proxy en cada evento en vez de la del cliente, y con eso el registro de
   intentos de login no sirve para nada.

---

## 4. Cuando falla una migración

### Caso A — checksum mismatch

**Cómo se ve.** La aplicación no arranca:

```
Validate failed: Migrations have failed validation
Migration checksum mismatch for migration version 7
```

**Qué significa.** Un archivo de migración **ya aplicado** cambió después de
aplicarse. Flyway le guarda un checksum a cada uno y se niega a seguir si no
coincide: no sabe si el que cambió es el archivo o la base. Ya pasó en este
proyecto, en desarrollo, por agregarle **un comentario** a `V3`.

**Qué hacer, en este orden:**

1. **Averiguar por qué cambió.** `git log -p` sobre el archivo de esa versión.
   Casi siempre alguien editó una migración aplicada, que en este repo está
   prohibido justamente por esto.
2. **Si el archivo se editó por error → revertirlo.** `git checkout <archivo>`
   y arrancar de nuevo. **Esta es la salida correcta en el 90% de los casos**, y
   deja la base intacta.
3. **Si el archivo tiene que quedar como está** (raro; solo si el cambio es
   cosmético y ya está commiteado en otro lado), recalcular el checksum:

```bash
cd apps/backend
mvn org.flywaydb:flyway-maven-plugin:12.4.0:repair \
  -Dflyway.url="jdbc:postgresql://localhost:5432/la_juanita" \
  -Dflyway.user=la_juanita -Dflyway.password=la_juanita \
  -Dflyway.locations=filesystem:src/main/resources/db/migration
```

**Probado el 2026-08-14**, el ciclo completo: se corrompió a mano el checksum de
`V7` en una base descartable, la aplicación **no arrancó** con el error de
arriba, el `repair` recalculó el checksum desde el archivo
(`123456789` → `456173863`), y la aplicación arrancó — `Successfully validated 8
migrations`, `Current version of schema "public": 8`.

> El plugin no está en el `pom.xml` y **no hace falta que esté**: se invoca por
> coordenadas y Maven se lo baja. La versión (`12.4.0`) tiene que coincidir con
> la de `flyway-core` que trae el proyecto — `mvn dependency:list | grep flyway`
> la dice. Ponerlo en el pom sería agregar una herramienta de emergencia al
> build de todos los días.

**`repair` no ejecuta ni deshace SQL**: solo toca la tabla de historial. Es
seguro en ese sentido, y peligroso en otro — si el archivo *sí* cambió de
contenido real, después del repair la base y el archivo dicen cosas distintas y
Flyway ya no se va a quejar nunca más. Por eso el paso 1 es averiguar, no
reparar.

### Caso B — una migración falló a medio aplicar

**Cómo se ve.** Una fila con `success = false` en `flyway_schema_history`, y la
aplicación se niega a arrancar hasta que se resuelva.

```sql
select version, description, success, installed_on from flyway_schema_history order by installed_rank;
```

**Postgres tiene DDL transaccional**, así que una migración que falla se
deshace entera y en general no queda nada a medias — pero **la fila fallida sí
queda**. La salida es:

1. Arreglar el `.sql` (todavía no está aplicado, así que editarlo es legítimo:
   la regla de no tocar migraciones aplicadas no rige acá).
2. `repair`, que además de checksums **borra las filas fallidas**.
3. Arrancar.

**No probado**, a diferencia del caso A. El comando es el mismo `repair` de
arriba.

### Caso C — la migración aplicó y estuvo mal

No hay rollback, y **no se inventa uno**: se escribe una migración nueva que
corrige. Es la misma regla que rige todo el esquema —`V6` corrige a `V1`, `V7`
corrige a `V6`— y la razón por la que las migraciones aplicadas no se editan.

Si el daño es a los datos y no al esquema, ahí es donde entra §2, y ahí es donde
se agradece que el backup sea diario y que el restore esté probado.

---

## Referencias

- Variables por ambiente y checklist de pre-deploy → `README.md`, *"Antes de
  desplegar esto en algún lado"*.
- Qué garantiza la base y qué no → `docs/db/auditoria-2026-08-12.md`.
- Las dos suites SQL y cómo correrlas → `scripts/pruebas-sql.sh`.
- Decisiones de infraestructura y hosting → `docs/sistema-gestion-plan.md`.
