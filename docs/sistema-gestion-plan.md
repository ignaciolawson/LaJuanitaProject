# Sistema de gestión — plan y decisiones

> Documento de rumbo, definido con el cliente/desarrollador el **2026-08-10**, al
> cerrar la landing y arrancar el sistema de gestión.
>
> **Esta es la fuente de verdad de "qué sigue y por qué".** Si una decisión de acá
> cambia, se edita este archivo — no se deja la decisión vieja conviviendo con la nueva.
>
> Lo que NO está acá: el detalle funcional de los 8 módulos (pantallas, permisos,
> reglas de negocio). Eso va a `docs/requirements/platform.md`, que todavía no existe
> y es la primera tarea de la Fase 0.

---

## 1. Marco general

| | |
|---|---|
| **Alcance** | Los **8 módulos completos**. No es un subset ni una demo recortada. |
| **Fecha objetivo** | **Diciembre 2026.** Techo absoluto febrero o julio 2027. |
| **Tiempo real disponible** | ~4,5 meses desde el 2026-08-10. |
| **Destino** | **Deploy real. Se va a usar en la vida real**, no corre local para la defensa. |
| **Equipo** | Una persona (Ignacio), cursando en paralelo. |

Los 8 módulos: alumnos · horarios/salas · pagos · portal alumno · portal profesor ·
mix & mastering · sello discográfico · dashboard dirección.

**Consecuencia de "se usa en la vida real":** sube el estándar en tres cosas que un
proyecto de facultad normalmente ignora — backups reales de la base, migración de los
datos que hoy están en Notion/Excel, y capacitación de Micaela. Diciembre tiene que
incluir un **piloto de uso real**, no solo "está deployado".

---

## 2. Estado al 2026-08-10

> **Actualización 2026-08-11:** todo lo que esta sección describe como pendiente del
> lado del sistema **ya está hecho** (Fase 0 completa, ver §6). Lo que sigue vigente
> tal cual es el estado de `apps/landing` y su bloqueo por datos del cliente. Se deja
> el texto original porque es el punto de partida contra el que se mide el avance.

- **`apps/landing`** — terminada. Bloqueada para publicar, pero **no por código**:
  faltan datos que tiene que confirmar el cliente (dirección, teléfono, horarios,
  precios reales, perfiles reales de Instagram/YouTube) y las 6 notas del blog que
  hoy son inventadas y están firmadas con nombres de profesores reales.
- **`apps/platform`** — el template de Vite intacto. 7 archivos, `App.tsx` con el
  contador. Cero trabajo propio.
- **`apps/backend`** — `BackendApplication.java` + `application.properties`. Cero
  entidades, cero migraciones.
- **El schema** — las 22 tablas están definidas y corregidas en
  `docs/db/la_juanita_schema.dbml.txt`, pero **viven solo en un `.txt`**. No existen
  en ninguna base de datos.

~~⚠️ **Bloqueo activo:** `application.properties` tiene `spring.jpa.hibernate.ddl-auto=validate`
y no hay migraciones.~~ **Resuelto el 2026-08-11**: existen `V1`, `V2` y `V3`, y
`ddl-auto=validate` ahora valida las entidades contra un schema real. Se queda en
`validate` para siempre: nada de auto-DDL.

---

## 3. Decisiones técnicas cerradas

### 3.1 Migraciones: Flyway

Archivos `.sql` numerados y versionados en el repo. `V1__baseline.sql` crea las 20
tablas; cada cambio posterior es un archivo nuevo (`V2__`, `V3__`…). **Nunca se edita
un archivo ya aplicado.**

Motivo: con datos reales de La Juanita adentro, esos archivos son la única forma segura
de cambiar la base sin romper nada, y son el registro histórico de qué cambió y cuándo.

**El baseline tiene que agregar lo que al DBML le falta:** índices y constraints de
negocio. El más importante: **impedir dos reservas superpuestas en la misma sala a la
misma hora.** Hoy nada lo impide, y es exactamente el error que el sistema tiene que
evitarle a Micaela.

### 3.2 Roles y menú del portal

El `usuario.rol` original (`'admin / directivo / profesor / alumno / cliente'`) mezclaba
dos ejes distintos en una sola columna, y obligaba a elegir uno solo — se rompía justo
con la gente que hace varias cosas, que en un estudio de 10 personas son casi todos.

Se separa en dos ejes independientes:

**Eje A — qué podés administrar del sistema** (lo que revisa Spring Security).
`usuario.rol` pasa a tener cuatro valores:

> ⚠️ **Corregido el 2026-08-11.** Este plan había colapsado los permisos en tres roles.
> La propuesta comercial promete explícitamente *"cuatro roles diferenciados"* y el
> Módulo 8 distingue de verdad entre directivo y staff. Volvieron a ser cuatro; el
> detalle del porqué está en `docs/requirements/platform.md` §2.1, que manda sobre
> esta tabla. Ya están así en el CHECK de `V1__baseline.sql` y en el enum `Rol`.

| Rol | Quién | Alcance |
|---|---|---|
| `ADMIN` | Ignacio, dirección técnica | Todo, incluida la administración de usuarios y roles |
| `DIRECTIVO` | Socios e inversores | **Lee todo** (dashboard completo, cualquier alumno). **No escribe nada.** |
| `STAFF` | Micaela, Ghezz | Gestión diaria: alumnos, reservas, pagos. Resumen financiero **básico** |
| `USUARIO` | Todos los demás | Solo lo propio |

**Eje B — qué sos para el negocio** (lo que arma el menú del portal): tenés fila en
`alumno`, tenés fila en `profesor`, o ninguna.

Son independientes. **Ghezz es `STAFF` + profesor + puede alquilarse una cabina para
él**, las tres a la vez, sin contradicción. Un profesor accede a "mis alumnos" por la
relación, **no** por el rol.

**Regla del menú dinámico** (dos reglas, no una):

| Tipo de sección | Cuándo aparece | Ejemplos |
|---|---|---|
| Ligada a **quién sos** | Solo si la relación existe | Mis Cursos (solo alumnos); Mis Alumnos, Subir Material (solo profesores) |
| Ligada a **un servicio que cualquiera contrata** | **Siempre** | Reservar cabina, Mix & Mastering, Mis Pagos |

La segunda regla no es un detalle: si solo mostrás lo que la persona ya tiene, quien
nunca reservó **nunca ve el botón de reservar** y no puede hacer su primera reserva jamás.

**Implementación:** un endpoint `GET /api/me` devuelve usuario + rol + qué relaciones
tiene. El front dibuja el menú con esa respuesta. Nada hardcodeado, nada que se
desincronice.

✅ **Aplicado el 2026-08-11** en el CHECK `usuario_rol_valido` de `V1__baseline.sql`, en
el enum `Rol` de Java y en el tipo `Rol` de TypeScript. Las tres definiciones tienen que
moverse juntas: si se agrega un rol, es una migración *más* dos archivos de código.

### 3.3 Login: credencial firmada (JWT)

Al entrar con mail y contraseña el servidor devuelve un texto firmado que dice quién sos
y hasta cuándo vale. Cada pedido lo presenta; el servidor no guarda sesiones, solo
verifica la firma.

La contraseña se guarda **encriptada de forma irreversible**. Nadie —ni el admin— puede
ver la contraseña de nadie. Si alguien se la olvida, **se resetea, no se recupera.**

### 3.4 Archivos

Interfaz `StorageService` desde el día 1, con implementación en **disco local** durante
todo el desarrollo. El código dice "guardá este archivo" y no sabe dónde termina.

"Guardar un archivo" aparece en 5 de los 8 módulos (comprobantes, contratos,
premasters, material de clase, fotos de perfil), así que la interfaz se define temprano
aunque el destino final se decida en el deploy.

### 3.5 Base de datos

**Postgres común, sin funciones exclusivas de ningún proveedor.** Esto es deliberado:
mantiene la decisión de hosting reversible hasta el final.

---

## 4. Infraestructura y deploy

**Presupuesto orientativo del cliente: ~US$10/mes** (estimación provisoria, no confirmada).

Con ese número la forma del deploy queda bastante determinada:

| Pieza | Dónde | Costo |
|---|---|---|
| Landing (Next.js) | Vercel | Gratis |
| Backend + Postgres | **Un solo servidor propio (VPS)** con Docker Compose + proxy con HTTPS | ~US$5–7/mes |
| Archivos | Almacenamiento de objetos con capa gratuita generosa (ej. Cloudflare R2) | Gratis a esta escala |
| Backups | Volcado diario de la base al mismo almacenamiento | Gratis |

**Descartado a este presupuesto:** los servicios administrados (Supabase Pro sale
US$25/mes solo, Render backend + base ronda US$14+). No entran en US$10.

**Sobre Supabase específicamente:** no es "la nube", es un paquete que incluye base de
datos + login + archivos + API automática. Como el proyecto ya tiene Spring Boot
haciendo el login y la API, de Supabase se aprovecharía ~40%. Es una opción válida como
"solo base de datos", pero a US$10/mes su plan pago no entra, y el gratuito **pausa el
proyecto tras 7 días de inactividad** — inaceptable para un negocio en uso real.

⚠️ **La letra chica de los US$10:** ese precio compra el servidor, no el mantenimiento.
Actualizaciones del sistema operativo, renovación del certificado HTTPS, monitoreo, y
levantarse si el servidor se cae un domingo a la noche — eso queda del lado de Ignacio.
Es un costo real que no está en dólares. Si con el tiempo pesa demasiado, la conversación
con el cliente es subir a ~US$25–30/mes y pasar a servicios administrados; el diseño
(sección 3.5) está hecho para que esa mudanza no requiera reescribir nada.

**Cuándo se decide en firme:** octubre, cuando haya algo real corriendo. Antes es
especular.

---

## 5. Calendario hasta diciembre

Es **ajustado pero alcanzable**, con una condición: **cada módulo se hace "real pero
mínimo" primero, y los adornos van al final.** Si cada módulo se hace "completo con todo
lo lindo", no se llega.

| Mes | Trabajo |
|---|---|
| **Agosto** (lo que queda) | **Fase 0.** Base creada, login andando, primera pantalla protegida. Poco visible, pero define cómo se escribe todo lo demás. |
| **Septiembre** | Alumnos + Salas/Reservas/Calendario. **El mes pesado.** |
| **Octubre** | Pagos + portal alumno + portal profesor. |
| **Noviembre** | Mix & Mastering + Sello + Dashboard dirección. |
| **Diciembre** | Deploy, migración de datos reales de Notion/Excel, y uso en paralelo con el sistema viejo. |

**Riesgos identificados:**

1. **El calendario de salas parece fácil y no lo es.** Superposiciones, clases que se
   repiten todas las semanas, reprogramaciones, bloqueos de sala. Es lo que más chance
   tiene de comerse septiembre entero.
2. **Los bugs de pagos duelen distinto.** Es el módulo donde un error no es una molestia,
   es plata mal contada de un negocio real.
3. **"Deployado" no es "funcionando".** Pasar los alumnos reales, que Micaela aprenda, y
   los quince detalles que solo aparecen con datos de verdad: eso lleva semanas, no un
   fin de semana.

**Si diciembre se aprieta, lo que se recorta es Sello + Dashboard (noviembre), NO el mes
de puesta en marcha.**

---

## 6. Orden de construcción y su porqué

**Regla que gobierna el orden: un vertical slice completo antes de modelar las 22 tablas.**

Es decir: la base entera de una (Flyway), pero **solo** las clases de `usuario` + login,
y en `platform` el login funcionando con un layout vacío detrás. Punta a punta:
Postgres → JPA → REST → React → credencial guardada → ruta protegida.

Eso deja la **plantilla** de cómo se escribe todo lo demás. Cuando después toque
`reserva`, ya no se está decidiendo cómo manejar errores, DTOs, CORS o validación: se
copia un patrón que ya funciona. Hacer 30 entidades primero garantiza descubrir en la 30
que el patrón de las primeras 10 estaba mal.

**Fase 0 — la plantilla**

1. ✅ **HECHO (2026-08-11)** — `docs/requirements/platform.md`: los 8 módulos con
   pantallas, permisos por rol y reglas duras, más 37 decisiones numeradas (P1–P37)
   con cuáles están resueltas y qué bloquea cada pendiente.
2. ✅ **HECHO (2026-08-11)** — `V1__baseline.sql` (22 tablas) y
   `V2__datos_iniciales.sql` (salas + matriz de usos). Las reglas de negocio quedaron
   impuestas en la base, no solo en el código.
3. ✅ **HECHO (2026-08-11)** — Postgres con Docker y **el backend arranca**, con las
   dos migraciones aplicadas. *Trampa encontrada: `flyway-core` a secas no ejecuta nada
   en Spring Boot 4; hace falta `spring-boot-starter-flyway`.*
3b. ✅ **AUDITORÍA DE BASE DE DATOS (2026-08-11)** — revisión crítica completa antes
   del commit. Se encontraron y corrigieron 3 fallas críticas (definición inconsistente
   de "reserva que ocupa la sala", inscripción de un alumno descontable a otro,
   premaster liberable sin pago) y 6 importantes, más una **condición de carrera real**
   entre reservas y bloqueos que los triggers no cubrían. La batería de pruebas quedó
   versionada en `apps/backend/src/test/resources/db/pruebas-reglas-negocio.sql`:
   **69 casos, todos pasando**.

   Las tres decisiones de negocio que la auditoría dejó abiertas **ya se resolvieron**:
   - **`pago.descuento_porcentaje` es un PORCENTAJE (0-100)**, no un importe. En
     consecuencia **`monto` es lo efectivamente cobrado**, con el descuento ya
     aplicado: la caja es la suma de `monto` sin recalcular nada.
   - **Usuario administrador inicial**: se siembra en su propia migración junto con el
     paso 4, no en `V2` (ver abajo).
   - **DBML regenerado** a v3 desde el SQL real, con las 7 reglas que el diagrama no
     puede dibujar listadas en la cabecera.
4. ✅ **HECHO (2026-08-11)** — **`usuario` de punta a punta.** Entidades JPA
   (`Usuario`, `Alumno`, `Profesor`), `POST /api/auth/login` con BCrypt, credencial
   firmada con HMAC y `GET /api/me` devolviendo usuario + rol + qué relaciones tiene.
   La firma la hace y la verifica Spring Security con su propio soporte JWT: **no hay
   ningún filtro de autenticación escrito a mano**, y no debería haberlo.

   `V3__usuario_admin_inicial.sql` siembra `admin@lajuanita.local` / `lajuanita2026`.
   El hash se generó con el mismo `BCryptPasswordEncoder` que valida el login, y
   `AutenticacionTest` lo verifica en cada build. **Es credencial de desarrollo: hay
   que desactivarla en una migración nueva antes del deploy real.**

   Tres cosas que costaron y conviene no volver a descubrir:
   - `NimbusJwtEncoder` asume **RS256** si no le pasás el `JwsHeader`, y falla con
     *"Failed to select a JWK signing key"* aunque la clave simétrica esté bien.
   - En Boot 4, `@AutoConfigureMockMvc` vive en `…boot.webmvc.test.autoconfigure`, y
     el JSON es **Jackson 3** (`tools.jackson.*`), no `com.fasterxml.jackson`.
   - `/api/me` **relee el usuario de la base** en vez de confiar en los claims: el
     token vale 8 horas, así que un cambio de rol o una baja tienen que pegar antes
     de que venza.

4b. ✅ **AUDITORÍA DE LA FASE 0 (2026-08-12)** — revisión crítica de todo lo
   anterior antes del commit, atacando el código en vez de confirmarlo. Encontró
   **7 problemas reales**, todos corregidos, y llevó los tests de 10 a 25 casos.

   Los dos que importan de verdad:

   - 🔴 **Se podía averiguar qué emails tienen cuenta, midiendo el tiempo.** Los
     tres rechazos del login devolvían el mismo cuerpo — el test lo verificaba —
     pero con un email inexistente el código salía **antes** de comparar la
     contraseña: ~10 ms contra ~88 ms. Un solo pedido bastaba. Ahora, cuando el
     usuario no existe, igual se compara contra un hash señuelo. **La protección
     de un mensaje idéntico no sirve de nada si el reloj lo delata.**
   - 🔴 **Se aceptaban tokens sin vencimiento.** El validador por defecto de
     Spring solo controla `exp` si está presente; un token forjado sin ese claim
     valía para siempre. Ahora se exigen `exp` e `iss`.

   Y cuatro trampas de configuración que valen para todo lo que venga:
   `@PreAuthorize` sin `@EnableMethodSecurity` **compila y no hace nada**;
   `/error` autenticado convierte cualquier error de un endpoint público en un
   401 vacío que esconde el error real; `@ConfigurationProperties` sin
   `@Validated` ignora las anotaciones de validación; y un `sub` no numérico
   reventaba con un 500 en vez de un 401.

   Del lado del front: el token podía vencer con la app abierta y **nada
   reaccionaba** — la interfaz seguía mostrando el menú de alguien que ya no
   estaba autenticado. Ahora cualquier 401 en un pedido con credencial cierra la
   sesión.

   Se verificó además, contra la base real, que las migraciones se aplican desde
   cero (`V1`→`V3`) y que las entidades JPA coinciden columna por columna.

   *(Nota que sigue vigente para más adelante: la tabla `release` es palabra reservada
   en otros motores. Postgres la acepta sin comillas, pero si Hibernate se queja, se
   resuelve con `@Table(name = "\"release\"")`.)*

5. ✅ **HECHO (2026-08-11)** — En `platform`: se tiró el template de Vite, hay pantalla
   de login real, ruta protegida y menú lateral armado desde `/api/me` (3.2). Las
   secciones de módulos que todavía no existen se dibujan apagadas y no navegan, para
   que se vea hacia dónde va el sistema sin fingir que ya está.

   Decisiones tomadas acá: **react-router** para rutas; **sin librería de caché de
   datos** (TanStack Query y compañía) hasta que haya listas y mutaciones de verdad,
   en septiembre; el token en `localStorage` con header `Authorization`; y en
   desarrollo el **proxy de Vite** manda `/api` al :8080, así el navegador ve un solo
   origen y CORS no entra en juego. Ese último punto tiene una contracara: el bean de
   CORS del backend existe pero **no se ejerce en desarrollo**. Si algún día el front
   y la API viven en dominios distintos, hay que probarlo antes de confiar en él.

✅ **Fase 0 cerrada el 2026-08-11.** Al terminarla el sistema todavía no hacía nada
útil, pero ya **se entraba con mail y contraseña**. De ahí en adelante cada módulo es
repetir un patrón que ya funciona: el que dejó `AutenticacionTest` (DTO como `record` +
servicio transaccional + `ProblemDetail` para los errores + test del endpoint contra la
base real). *El primer módulo construido sobre ese patrón está en §6b.*

**Deuda conocida que dejó la Fase 0**, para saldar antes de que crezca:

- Los tests de JPA corren **contra la base de desarrollo**, no contra una descartable.
  Hoy es inofensivo porque solo leen y tocan `ultimo_acceso`. El día que un test
  necesite INSERT o DELETE de datos de negocio, hay que meter **Testcontainers antes**,
  no después. (Los 69 casos SQL de reglas de negocio sí corren contra una base
  descartable: ese patrón ya está bien.)
- No hay forma de **revocar** un token antes de que venza. Dar de baja a alguien le
  corta `/api/me` enseguida, pero el token sigue siendo válido hasta 8 horas. Si hace
  falta corte inmediato, la solución es una lista de revocados, **no** bajar el
  vencimiento a minutos.
- **El login no tiene límite de intentos.** Nada impide probar diez mil contraseñas
  contra `admin@lajuanita.local`. BCrypt hace que cada intento cueste ~85 ms, lo que
  ayuda pero no alcanza. Corresponde resolverlo antes de exponer el sistema a
  internet, no ahora.
- **El secreto de firma está commiteado.** Hay que definir `JWT_SECRET` —con un valor
  **nuevo**— en el deploy de diciembre. ~~Con aviso por log y bloqueo si hay perfil de
  producción.~~ **Corregido el 2026-08-14** (SEC-01 de la auditoría): ese bloqueo no
  servía, porque nada activa un perfil en este proyecto. Ahora falla cerrado: firmar con
  el secreto commiteado **aborta el arranque** salvo que
  `lajuanita.jwt.permitir-secreto-de-desarrollo=true` esté en el `application.properties`
  local.
- ~~Todavía no hay ninguna autorización por rol en el backend.~~ **Resuelto el
  2026-08-12** (§6b): `@PuedeLeerAdministracion` y `@PuedeOperar` protegen los
  endpoints de administración, con tests por los cuatro roles. Sigue valiendo la
  advertencia de fondo: que el menú esconda una sección **no** protege nada — quien
  autoriza es el backend.
- ~~El primer login del alumno (P18) sigue sin resolver.~~ **Resuelto el 2026-08-12**
  (§6b): registro propio, más alta por administración con contraseña temporal.
- **El registro público también es un endpoint sin límite de intentos**, y encima
  escribe: nada impide crear mil cuentas basura. Mismo tratamiento que el login —
  hay que resolverlo antes de exponer el sistema a internet.

---

## 6b. Módulo 1 — Alumnos · primera tanda (2026-08-12)

**Hecho:**

- **`V4`** parte `usuario.nombre_completo` en `nombre` + `apellido`. Se hizo ahora
  porque la tabla tenía una sola fila y ningún dato real: el listado se ordena y se
  filtra por apellido, y con un campo de texto libre eso no se puede hacer bien nunca.
- **`V5`** agrega `debe_cambiar_password`, que sostiene el flujo de la contraseña
  temporal.
- **Registro público** (`POST /api/auth/registro`) y **alta por administración**
  (`POST /api/usuarios`, `POST /api/alumnos`). Cierra **P18**.
- **CRUD de usuarios y alumnos** con buscador, filtro por estado y baja lógica.
- **El primer control por rol real del sistema.** Hasta ayer el backend solo exigía
  estar autenticado. Ahora `@PuedeLeerAdministracion` y `@PuedeOperar` imponen la
  regla que estaba escrita desde el día uno y no ejercía nadie: **`DIRECTIVO` lee
  todo y no escribe nada.** Verificado con un directivo real contra la API: 200 en
  el listado, 403 al intentar crear.
- Tests: **de 25 a 50**.

**Decisiones tomadas acá:**

- **El registro avisa que un email ya está en uso**, y eso deshace en el registro la
  protección contra enumeración que sí tiene el login. Se eligió a conciencia: lo que
  se filtra es "esta dirección tiene cuenta en un estudio de música de Pilar", y la
  alternativa deja trabada a la persona que se registró hace meses y no se acuerda.
  Está documentado en `DatoDuplicadoException`.
- **El alta de alumno es una sola llamada y una sola transacción**, acepte una
  persona con cuenta (`idUsuario`) o una a crear (`usuarioNuevo`). Hacerlo en dos
  pasos dejaría una cuenta huérfana si el segundo falla.
- **Contraseña mínima: 8 caracteres, sin reglas de complejidad.** Exigir mayúscula,
  número y símbolo empuja a `Password1!` y a anotarla en un papel.
- **Solo ADMIN puede otorgar roles.** Micaela (STAFF) da de alta alumnos todo el día;
  si pide crear un ADMIN, el rol se ignora y la cuenta queda como `USUARIO`.

**Dos trampas que costaron y conviene no repetir:**

- **Un parámetro nulo en un `LIKE` de JPQL revienta contra Postgres** con
  `function lower(bytea) does not exist`: sin valor, el motor no puede deducir el
  tipo y lo liga como binario. Se resuelve no mandando nunca null — `Busqueda.patron()`
  devuelve `"%"` para "traer todo".
- **Editar una migración ya aplicada rompe el arranque.** Se le agregó un comentario
  a `V3` y Flyway se negó a levantar con *"Migration checksum mismatch"*. La regla
  "nunca se edita un archivo ya aplicado" incluye los comentarios.

**Lo que NO entró y es lo próximo:** `inscripcion` (disciplina, nivel, precio,
profesor asignado), notas internas de profesores, estado de cuenta, y "el profesor ve
solo sus alumnos" — esto último porque esa relación vive justamente en `inscripcion`.

### 6c. Auditoría de la primera tanda (2026-08-12)

Se auditó atacando la API corriendo, no revisando el código. **Seis problemas reales,
todos corregidos**, y los tests pasaron de 50 a 57.

**Los tres graves eran el mismo error**, y ninguno existía el día anterior: la
autorización que se escribió hoy leía el rol del **claim del token**, que es una foto
de cuando se emitió y vale 8 horas. Medido contra la API:

- un usuario **dado de baja** siguió listando alumnos y **creó una fila**;
- un ADMIN **degradado a USUARIO** siguió operando como ADMIN;
- alguien con **contraseña temporal sin cambiar** operó por API, porque ese bloqueo
  vivía solo en el frontend.

`usuario.activo = FALSE` es la forma que el sistema documenta desde `V1` para dar de
baja a alguien; tiene que sacarlo en el acto, no dentro de ocho horas. **Ahora la
autorización se resuelve contra la base en cada pedido** (`AutenticacionDesdeBase`).
Cuesta un SELECT por pedido y a esta escala no se nota; el claim `rol` quedó como
informativo y no autoriza nada.

Los otros tres:

- **Un STAFF podía desactivar y editar al ADMIN.** Se comprobó dejando la cuenta de
  administrador bloqueada. Como solo un ADMIN otorga roles, alcanzaba para dejar el
  sistema sin nadie capaz de administrarlo. Ahora las cuentas administrativas solo las
  toca un ADMIN, y nadie puede desactivarse a sí mismo.
- **Seis registros simultáneos con el mismo email daban cuatro 500.** El chequeo previo
  y el INSERT no son atómicos. Lo dispara un doble clic, no hace falta un atacante.
- **Convivían dos formatos de error**, el nuestro y el crudo de Spring, y el front busca
  el mensaje en un solo lugar.

**Una lección de proceso, no de código:** las 69 pruebas SQL de reglas de negocio se
editaron al aplicar `V4` y **no se corrieron**. Corren aparte de `mvn test`, así que
nada avisó. Se corrieron en la auditoría (69/69) y se corrigieron sus instrucciones,
que seguían diciendo de aplicar solo `V1` y `V2`.

---

**Luego, por orden de valor:**

1. **Alumnos** — reemplazo directo del Notion de Micaela; lo más demostrable.
2. **Salas + reservas + calendario** — el corazón operativo, donde más se nota el dolor
   del relevamiento.
3. **Pagos** — se apoya en el anterior. El schema ya tiene las FKs opcionales para saber
   qué salda cada pago.
4. **Portales alumno y profesor** — recién acá tienen sentido: muestran lo de 1/2/3.
5. **Mix & Mastering, sello, dashboard** — los tres más "aparte", los que Ghezz maneja
   hoy en planillas sueltas.

### 6e. Auditoría adversarial de la base (2026-08-12) y su corrección (V6, V7)

El mismo día se hizo una **segunda** auditoría, sobre la base y no sobre la API, y
este plan no la nombraba: quedó como un archivo huérfano hasta el 2026-08-14. Está
completa en **[`docs/db/auditoria-2026-08-12.md`](db/auditoria-2026-08-12.md)**, que
es el documento que dice **qué garantiza realmente la base y qué no**.

Se hizo contra Postgres corriendo, atacando el esquema, no leyendo SQL. **Encontró 10
formas de violar reglas que el proyecto daba por garantizadas**, entre ellas: liberar
un premaster y después anular el pago que lo respaldaba (premaster entregado, cero
cobros); revertir entera la máquina de estados de mastering en dos UPDATE pasando por
`CANCELADO`; borrar filas de `pago`, cuando la cabecera de `V1` declara "nada se
borra" desde el principio; y cotizaciones del dólar en 0, que hacen desaparecer del
balance cualquier importe en USD sin que nada falle. Las diez se corrigieron en
`V6__integridad_auditoria.sql` y quedaron fijadas en una suite nueva,
`pruebas-adversariales.sql`.

El hallazgo menos intuitivo, que conviene no volver a descubrir: **los triggers de
sala solo funcionan en READ COMMITTED**. Bajo `REPEATABLE READ` o `SERIALIZABLE` el
trigger lee un snapshot viejo y deja pasar la violación en silencio — el nivel de
aislamiento *más estricto* es el *menos* seguro. Desde V6 la base se niega a correr
esas reglas fuera de READ COMMITTED en vez de dar una garantía falsa.

**La auditoría técnica del 13/08 le encontró un punto ciego a ésta:** leyó *"nada se
borra"* como una regla **financiera**, y por eso `reserva` y `reserva_participante`
—que son el historial de clases, y la razón de ser del Módulo 1— quedaron sin
protección. Eso, la anulación de un pago sin autor ni motivo, y un `EXCLUDE` de
bloqueos que rechazaba bloqueos legítimos, se corrigieron el 2026-08-14 en
`V7__auditoria_historial_y_bloqueos.sql`.

**Lo que sigue sin dueño está en §6 de ese documento**, y son reglas de negocio, no
deuda técnica: no se puede consumir más clases que las contratadas (la regla que el
relevamiento marca como el problema principal de hoy), un profesor o un alumno pueden
estar en dos salas a la vez, `sala.activa` es decorativa, `egreso` y `venta_equipo` se
pueden borrar, el pagador no tiene que ser el titular de lo que paga, no se exige seña
para reservar, y el nivel de una inscripción puede retroceder. **Cada una necesita una
decisión antes de codificarse**, y ninguna se implementó unilateralmente.

---

## 6d. DÓNDE RETOMAR · última actualización 2026-08-15 (tarde)

> **Empezá acá si estás abriendo el proyecto de nuevo.** Esta sección se
> actualiza al cerrar cada tanda; si contradice a otra parte del documento, gana
> esta y hay que corregir la otra.
>
> **Y para todo lo que sea una DECISIÓN, mirá antes
> [`docs/requirements/platform.md` §13](requirements/platform.md) — "Decisiones
> cerradas el 2026-08-14".** Veinte preguntas contestadas de una sola vez, las
> cinco del cliente incluidas, y es posterior a este documento y al informe de
> auditoría. **Gana sobre los dos.** No estaba enlazada desde ningún lado, y por
> eso el informe pasó un día listando como *"bloqueado por una decisión"* diez
> hallazgos que ya estaban decididos.

### ⏭️ Si estás retomando: las tres cosas que siguen

**En este orden. La primera lleva cinco minutos y las otras dos dependen de vos.**

1. ~~**PUSHEAR.**~~ **Hecho.** `main` local y remoto coinciden (verificado con
   `git fetch`: 0 commits de diferencia). Las tandas 6 y 7 y `V9` ya no viven en
   un solo disco. **Lo que sigue sin confirmarse es el pipeline en Actions**: los
   cuatro pasos se verificaron a mano en local, pero **nadie miró todavía la
   pestaña Actions del repo**. Es un vistazo, no una tarea.
2. **Decidir la seña** (DB-04a). Es la única regla de negocio que quedó sin dueño
   y **bloquea el Módulo 2**: §13 resolvió que no hay excepción, pero no dijo *a
   qué reservas alcanza*. Una clase de un alumno con inscripción ya paga no lleva
   seña propia; un alquiler de cabina sí. La cabecera de
   `V9__reglas_cerradas_en_la_seccion_13.sql` tiene la pregunta exacta y la
   herramienta para implementarla el día que se decida.
3. **Arrancar `inscripcion`** (abajo) **o terminar la tanda 8** (limpieza, quedan
   **9** hallazgos, no bloquea nada). `inscripcion` es lo que mueve la aguja del
   producto; la tanda 8 es lo que se puede hacer sin decidir nada — y **los
   cuatro que cambiaban el comportamiento del sistema ya están hechos**
   (2026-08-15), así que lo que queda ahí no cambia cómo se comporta nada.

### Estado real

| | |
|---|---|
| **Fase 0** | ✅ cerrada y auditada (§6, §4b) |
| **Módulo 1 — Alumnos** | 🟡 **~35%**. Primera tanda hecha, auditada y con tests propios |
| Módulos 2 a 8 | ⬜ sin empezar |
| **Landing** | ✅ terminada como sitio. No se publica hasta conectar los formularios |
| **Auditoría** | 🟡 **46 de 61 resueltos**. Lo que queda es una pasada de limpieza + 3 decisiones |

**Qué anda hoy:** login, registro público, alta por administración con contraseña
temporal, cambio obligatorio de contraseña, listados de personas y de alumnos con
buscador, alta y baja lógica, y la matriz de permisos por los cuatro roles impuesta
en el backend.

**Qué falta del Módulo 1**, casi todo detrás de una sola pieza:

| Pantalla del módulo | Estado |
|---|---|
| Listado de alumnos | 🟡 ya pagina y se puede editar; falta filtrar por disciplina, nivel y "con deuda" |
| Alta / edición | ✅ alta con rol, edición de cuenta y de alumno, y reseteo de contraseña (2026-08-14). Falta la disciplina, que vive en `inscripcion` |
| Perfil del alumno | ❌ |
| Alta de inscripción | ❌ |

**Lo que se destrabó el 2026-08-14** (tanda 5 de la remediación): los listados paginan de
verdad —antes mostraban 20 filas y el encabezado decía el total—, `DIRECTIVO` dejó de ver
botones que el backend le niega, y **ya se puede dar de alta al equipo con su rol desde la
pantalla**: hasta ahora eso exigía llamar la API con `curl`. La migración del Notion deja
de estar bloqueada por el front.

**Y lo que se destrabó con la tanda 6, el mismo día:** `AlumnoService` ahora tiene tests
propios (`AlumnoTest`, 20 casos). Eso importa **justo antes de `inscripcion`**, porque
`inscripcion` se construye encima de `alumno` y obliga a refactorizarlo: hasta ayer ese
refactor se hacía sin red, con la suite en verde porque probaba la autenticación y no el
módulo. El camino `idUsuario` del alta —el que sostiene la decisión de `usuario` como
identidad raíz— no lo ejercitaba **ningún** test.

También existe `docs/operacion.md` con el restore ensayado, que es la red del otro lado:
diciembre incluye migrar el Notion y correr en paralelo con el sistema viejo.

### Lo próximo: `inscripcion`

Es la tabla de la que dependen los filtros de la pantalla 1, la disciplina de la 2,
el contenido de la 3 y toda la 4. También es la que habilita *"el profesor ve solo
sus alumnos"*, porque la relación profesor↔alumno vive ahí.

Ya tiene reglas duras definidas en `docs/requirements/platform.md`: curso cerrado de
8 clases (P1), varias inscripciones activas a la vez pero **nunca dos niveles de la
misma disciplina** (P3, índice único parcial), y profesor asignado explícito (P6).

**Ya no hay nada que preguntar antes de arrancar.** P4 y P5 —las dos que este
párrafo daba por bloqueantes— están contestadas en `platform.md` §13 desde el
2026-08-14: los alumnos informales de Ghezz **entran** al sistema como alumnos
normales, y la nivelación **la hace el formulario de la landing**, con Micaela
pudiendo corregir el nivel después.

Lo que sí conviene cerrar antes de llegar a las reservas es **la seña** (punto 2
de arriba). No frena `inscripcion`, frena el Módulo 2.

**Y `V9` ya dejó escritas en la base tres reglas que este módulo va a necesitar:**
no se consumen más clases que las contratadas, el nivel no retrocede sin firma, y
nadie está en dos salas a la vez. O sea que buena parte de lo que `inscripcion`
tendría que cuidar a mano ya lo impone el esquema.

### ✅ Revisión del desarrollador — cerrada el 2026-08-14

**Ignacio confirmó que NO tiene objeciones a la primera tanda del Módulo 1.**

Del 2026-08-12 al 2026-08-14 esta sección dijo que había cosas que no lo convencían y
que las iba a plantear más adelante. Nunca llegaron a enumerarse —la nota misma decía
*"no están identificadas todavía"*— y al revisarlas no había ninguna. **La tanda está
bendecida: se puede construir encima sin preguntar nada.**

Se deja el registro en vez de borrar la sección, porque `CLAUDE.md` y el informe de
auditoría la citaron durante esos dos días y conviene que se entienda por qué ya no
aparece.

### Auditoría técnica del 2026-08-13 y su remediación

Se auditó el monorepo completo: **60 hallazgos** —hoy **61**, con dos aparecidos
durante la remediación—, con `ruta:línea` y verificados ejecutando. Está en
[`docs/auditoria/informe-auditoria-2026-08.md`](auditoria/informe-auditoria-2026-08.md),
y **§8 de ese informe lleva el estado de los 61 uno por uno y el orden propuesto para
lo que queda** — es la lista que hay que mirar antes de decidir en qué trabajar.

> **Al 2026-08-15: 46 de 61 resueltos**, 1 cerrado como riesgo asumido, y **los 9
> que siguen abiertos son TODOS de la tanda 8**, o sea limpieza que no bloquea
> nada. **Queda un solo hallazgo Alto abierto en todo el proyecto** —DOC-08, la
> sección de deploy— y no se destraba programando: espera el hosting de octubre.
>
> Las tandas **6** (operación, tests y CI) y **7** (la landing) se cerraron
> enteras, y **de la 8 se hicieron los cuatro defectos** (QA-08, SEC-09, QA-06,
> SEC-07): la credencial corrupta que pasaba por vigente, el `ESCAPE` que ninguna
> consulta declaraba, los tres tokens de paleta que fallaban AA y la CSP de las
> dos apps. **Lo que queda de esa tanda no cambia el comportamiento de nada.**
> El párrafo de abajo describe hasta la tanda 5 y se conserva como registro; el
> estado fino, hallazgo por hallazgo, está en §8 del informe.

**Remediado hasta el 2026-08-14: 28 de 61, más EXT-01 cerrado como riesgo asumido.**
El candado del secreto JWT falla cerrado y el secreto se rotó; la auto-degradación de rol
está cerrada; las reglas de la base llegan al usuario como mensajes legibles en vez de
como "email duplicado" o como 500; los errores de Spring salen en español; `V7` cerró los
cinco huecos de base que había que tapar con las tablas vacías; y `V8` + el perímetro de
autenticación cerraron lo que faltaba del login: **límite de intentos, log de eventos,
reseteo de contraseña y vencimiento de la temporal**. La tanda 5 cerró el frontend:
**paginado real, `DIRECTIVO` sin botones de escritura, y las pantallas de alta con rol,
edición y reseteo**.

**La tanda 6 (2026-08-14) cerró operación, tests y CI**, y cambió tres números del
proyecto: `mvn test` pasó de 86 a **106** con `AlumnoTest` —el Módulo 1 no tenía un solo
test propio—, el front pasó de **cero tests a 53**, y las 136 pruebas SQL dejaron de
correrse copiando nueve comandos a mano. Además existe `docs/operacion.md` con **un
restore realmente ensayado** y un pipeline que corre las cuatro cosas en cada push.

**Lo que queda y no es trabajo de código:** cinco preguntas al cliente y seis decisiones
tuyas (§8.3 del informe), más **el hosting de octubre**, del que dependen el deploy y el
destino de los backups. **No queda ningún hallazgo Crítico abierto, y los tres Altos que
siguen abiertos son de esos: ninguno se destraba programando hoy.**

### Deuda que hay que saldar antes del deploy

1. ~~**Sin límite de intentos** en login ni en registro.~~ **Resuelto el 2026-08-14**
   (SEC-02): límite por email y por IP, más un log de eventos de autenticación bajo el
   logger `seguridad`. Antes la aplicación entera tenía **una sola línea de log**.
2. ~~**El secreto JWT está commiteado** (con aviso y bloqueo si hay perfil productivo).~~
   El candado ahora **falla cerrado** (SEC-01) y el secreto de desarrollo se **rotó**
   (2026-08-14). Sigue commiteado a propósito, para que un clone arranque: en producción
   va `JWT_SECRET` con un valor nuevo.
3. **Los tests de JPA corren contra la base de desarrollo** y ahora sí insertan y
   borran. Testcontainers pasó de "conviene" a "hace falta pronto" — y bajó un escalón de
   urgencia el 2026-08-14: las **171** pruebas SQL ya corren solas sobre bases
   descartables (`scripts/pruebas-sql.sh`) y en CI. Lo que falta resolver es esto,
   los tests de JPA.
4. ~~**El frontend no tiene tests.**~~ **Resuelto el 2026-08-14** (QA-05): Vitest +
   Testing Library, 53 casos sobre las piezas donde una regresión es invisible —el menú,
   la credencial, la interpretación de errores, la ruta protegida y el listado—. Es el
   andamio y lo crítico, no cobertura: las pantallas de Usuarios y los formularios de alta
   siguen sin tests.
5. **Sin revocación de tokens.** Ya no hace falta para las bajas —la autorización se
   resuelve contra la base—, pero un token robado sigue valiendo hasta 8 horas.
6. ~~**No hay forma de recuperar una contraseña.**~~ **Resuelto el 2026-08-14** (SEC-03):
   `POST /api/usuarios/{id}/password-temporal`. Falta el botón en la pantalla, que va
   con ARQ-02.
7. ~~**Los listados muestran 20 filas y el contador dice el total** (ARQ-01).~~
   **Resuelto el 2026-08-14**: paginan, y buscar vuelve a la primera página.
8. ~~**Las reglas de negocio sin dueño** de `docs/db/auditoria-2026-08-12.md` §6.~~
   **Cinco de las seis se escribieron en `V9`** (2026-08-14), en cuanto §13 tomó las
   decisiones que faltaban: nadie en dos salas a la vez (profesor y alumno), el nivel
   que no retrocede sin firma, no consumir más clases que las contratadas,
   `sala.activa` con significado, y la anulación de `egreso` y `venta_equipo`.
   **Queda una: la seña**, que es el punto 2 de arriba.
9. ~~**Credenciales de Postgres commiteadas sin override**~~ **Resuelto el 2026-08-14**
   (DOC-07): van por entorno y el README tiene la tabla de variables por ambiente.
   **DOC-08 pasó a parcial**: `docs/operacion.md` ya tiene backup, **restore
   ensayado de punta a punta** y el runbook de fallas de migración, los tres
   probados ejecutándolos. Lo único que falta ahí es el **deploy**, que depende del
   hosting de octubre — y con él el healthcheck del backend (QA-07).
10. **Los PDF del cliente quedan versionados, y está decidido así** (2026-08-14). El
    repositorio ya es privado y el secreto se rotó; lo demás —el historial y el aviso al
    cliente— Ignacio lo asumió como decisión propia. Figura como riesgo aceptado en §5
    del informe de auditoría, no como pendiente.

### Lo que queda del backlog de auditoría, en una línea

**9 hallazgos, todos de la tanda 8, todos limpieza y ninguno bloquea nada:**
EXT-03 (`LICENSE`), DB-08 (seis nombres para "cuándo se creó esta fila"), ARQ-04
(los dos formatos de error que conviven), ARQ-06 (lógica copiada entre los dos
controllers), ARQ-07 (tres `package-lock.json`), ARQ-08 (la convención de idioma
sin escribir) y DOC-10 a DOC-12.

Más **5 a medias**, de los cuales sólo tres esperan algo: QA-07 y DOC-08 (hosting)
y DB-04 (la seña). DB-11 espera al DTO del Módulo 2 y ARQ-09 se barre con la
tanda 8.

**Y los cuatro que sí cambiaban el comportamiento del sistema salieron el
2026-08-15**: QA-08 (la credencial con vencimiento ilegible pasaba por vigente),
SEC-09 (ninguna consulta declaraba su `ESCAPE`), QA-06 (`--page-faint` en 2,25:1
era el color de las etiquetas de los formularios) y SEC-07 (CSP y cabeceras en
las dos apps). Dos de las recomendaciones del informe estaban mal y se
corrigieron en vez de seguirse — los números están en el bloque de QA-06.

### Cómo levantar todo

`docker compose up -d` → `mvn spring-boot:run` en `apps/backend` → `npm run dev:platform`.
Detalle y credenciales en el [README](../README.md).

**Y para verificar que nada se rompió**, los cuatro comandos que corre el CI:

```
cd apps/backend && mvn test     # 107
./scripts/pruebas-sql.sh        # 121 + 50, sobre 9 migraciones
npm run test:platform           # 54
npm run build:landing && npm run build:platform
```

Al 2026-08-15 los cuatro pasan.

---

## 7. La landing espera a la plataforma

**Decidido el 2026-08-10: la landing NO se publica antes que el sistema de gestión.**

Motivo: hoy los formularios (inscripción, reserva de cabina, consulta de equipos)
contestan "listo" y **la solicitud no le llega a nadie**. El cliente pidió sacar el aviso
de "no se envía" el 2026-08-09. Mientras la landing esté sin publicar, eso es inofensivo.
El día que se publique, es plata que se pierde: gente que quiere anotarse, cree que se
anotó, y nadie la contacta nunca.

**Consecuencias:**

- No se hace ningún parche intermedio para los formularios (no hay que armar envío de
  mail ni servicio externo). Se conectan directo al backend cuando el módulo de alumnos
  esté vivo, en septiembre.
- La landing queda terminada y sin publicar ~4 meses. Es aceptable porque **igual no
  podría publicarse**: siguen faltando los datos que debe confirmar el cliente
  (sección 2).
- **Revisar esta decisión si el cliente confirma esos datos y quiere publicar antes.**
  En ese caso el formulario necesita destino sí o sí, y es ~1 día de trabajo.
