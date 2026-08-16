# Sistema de gestión — plan y decisiones

> Documento de rumbo, definido con el cliente/desarrollador el **2026-08-10**, al
> cerrar la landing y arrancar el sistema de gestión.
>
> **Esta es la fuente de verdad de "qué sigue y por qué".** Si una decisión de acá
> cambia, se edita este archivo — no se deja la decisión vieja conviviendo con la nueva.
>
> Lo que NO está acá: el detalle funcional de los 8 módulos (pantallas, permisos,
> reglas de negocio). Eso vive en
> [`docs/requirements/platform.md`](requirements/platform.md) —fue la primera tarea de
> la Fase 0 y está hecho—. **Y su §13 gana sobre este documento en todo lo que sea una
> decisión**, porque es posterior.

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

Archivos `.sql` numerados y versionados en el repo. `V1__baseline.sql` crea las 22
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
> Volvieron a ser cuatro porque **el Módulo 8 distingue de verdad entre directivo y
> staff** — *"solo directivos y socios ven el dashboard completo; Micaela ve el resumen
> financiero básico"*—, que es una diferencia real de permisos y no se puede expresar con
> tres valores.
>
> La propuesta comercial también promete *"cuatro roles diferenciados"*, pero **no son
> estos cuatro: coincide el número, no el conjunto** (ella nombra profesor y alumno, que
> acá son relaciones, y no nombra `STAFF`). El detalle está en
> `docs/requirements/platform.md` §2.1, que manda sobre esta tabla. Ya están así en el
> CHECK de `V1__baseline.sql` y en el enum `Rol`.

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
el enum `Rol` de Java y en el tipo `Rol` de TypeScript. **Hoy son seis los lugares que
tienen que moverse juntos**, no tres: se sumaron el DBML, los dos predicados de
`apps/platform/src/layout/menu.ts` y la tabla `NOMBRE_DE_ROL` de `UsuariosPagina.tsx`
(ARQ-05). La lista completa está en `CLAUDE.md` y es la que manda: agregar un rol es una
migración **más cinco archivos**.

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

## 6d. DÓNDE RETOMAR · última actualización 2026-08-16

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

### ⏭️ Si estás retomando: arrancá el Módulo 2

**El Módulo 1 está cerrado hasta donde puede** (2026-08-16): las cuatro pantallas
existen y lo único que le falta depende de módulos que no se construyeron. El
detalle está en el recuadro de [Estado real](#estado-real).

**Lo que sigue es el Módulo 2 — Horarios y salas**, y trae consigo las dos reglas
que quedaron escritas esperándolo. Ver [`Lo próximo`](#lo-próximo-el-módulo-2).

**No hay ninguna decisión tuya pendiente.** La auditoría se cerró el 2026-08-15
con el backlog en cero, la seña está decidida, y el filtro por disciplina se
resolvió el 2026-08-16.

**Y para verificar que arrancás en verde**, los cuatro comandos del CI están al
final de esta sección.

### Estado real

| | |
|---|---|
| **Fase 0** | ✅ cerrada y auditada (§6, §4b) |
| **Módulo 1 — Alumnos** | ✅ **cerrado hasta donde puede** (2026-08-16). Lo que falta depende de los módulos 2, 3 y 5 |
| Módulos 2 a 8 | ⬜ sin empezar |
| **Landing** | ✅ terminada como sitio. No se publica hasta conectar los formularios |
| **Auditoría** | ✅ **CERRADA el 2026-08-15.** 56 de 56, backlog en cero |

**Qué anda hoy:** login, registro público, alta por administración con contraseña
temporal, cambio obligatorio de contraseña, listados de personas y de alumnos con
buscador, alta y baja lógica, la matriz de permisos por los cuatro roles impuesta
en el backend, y **el módulo de inscripciones completo** — alta, listado con
cuatro filtros, edición, cambio de estado, clases restantes y su pantalla.

**Las suites:** 159 casos en el backend, 87 en el front.

| Pantalla del módulo | Estado |
|---|---|
| 1. Listado de alumnos | ✅ pagina, busca, edita, **filtra por disciplina y nivel del curso** y muestra qué cursa cada uno (2026-08-16) |
| 2. Alta / edición | ✅ alta con rol, edición de cuenta y de alumno, y reseteo de contraseña (2026-08-14) |
| 3. Perfil del alumno | ✅ **`/admin/alumnos/:id`** (2026-08-16) — dos de sus seis bloques; ver abajo |
| 4. Alta de inscripción | ✅ **`/admin/inscripciones`** (2026-08-16) |

> **Qué significa "cerrado hasta donde puede".** Dos cosas que el alcance pide de
> este módulo **no se pueden construir todavía**, y no por falta de tiempo:
>
> - **El perfil pide seis bloques** (`platform.md` §4, pantalla 3) y tres de ellos
>   —historial de clases, estado de cuenta, notas y materiales— viven en
>   `reserva`, `pago` y `nota_profesor`. Llegan con los módulos 2, 3 y 5. La
>   pantalla **los dibuja igual, nombrados**, con el módulo que los trae: un
>   bloque ausente se lee como que el sistema perdió el dato, y uno que dice
>   "llega con el Módulo 2" se lee como lo que es. Es la misma decisión que toma
>   `menu.ts` con las secciones todavía no construidas.
> - **El listado pide filtrar por "estado de pago" y marcar "con deuda"** (§4,
>   pantalla 1). Eso es `pago`, o sea el Módulo 3. Y ojo: §3.3 ya dejó dicho que
>   *"el estado de pago de Juan" no es un valor único* — cuando se construya, va
>   por transacción y no como un campo del alumno.
>
> **No queda nada del Módulo 1 que dependa solo de sí mismo.**

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

### ✅ `inscripcion` — cerrada de punta a punta el 2026-08-16

Era la tabla de la que dependen los filtros de la pantalla 1, la disciplina de la
2, el contenido de la 3 y toda la 4. **Está entera**, con 39 casos en el backend
(`InscripcionTest`) y 17 en el front (`InscripcionesPagina.test.tsx`): las suites
pasaron de 108 a 151 y de 55 a 72.

| Pieza | Qué hace |
|---|---|
| `Inscripcion` + `InscripcionRepository` | La entidad y el listado con `JOIN FETCH` de alumno, persona y profesor |
| `InscripcionService` | Alta, listado, edición, cambio de estado |
| `InscripcionController` | `/api/inscripciones`, con `@PuedeLeerAdministracion` / `@PuedeOperar` |
| `Disciplina` · `Nivel` · `Moneda` · `EstadoInscripcion` | Los cuatro CHECK del esquema, del lado de Java |
| `ProfesorController` | `GET /api/profesores`, **la pieza que faltaba** — sin ella la inscripción no podía nombrar a su profe |
| `InscripcionesPagina.tsx` | `/admin/inscripciones`: listado con tres filtros, alta, edición y cambio de estado |
| Tipos y llamadas en el front | `tiposAdmin.ts` y `administracion.ts` — **respuesta y pedido, los dos** (ARQ-09) |

**Tres decisiones de implementación que no se leen del esquema:**

- **Las clases de fábrica las pone el servidor, no el formulario.** Un alta que
  no dice `clasesContratadas` recibe 8 en DJ y 16 en Producción (§13, P34). La
  mentoría no tiene número estándar y ahí el alta exige decirlo. El front tiene la
  misma tabla en `CLASES_ESTANDAR` **para mostrarla**, no para decidirla: si las
  dos se separan, la que vale es la de Java.
- **Las clases restantes se calculan en cada lectura**, con una consulta nativa
  contra `reserva_participante` — `reserva` no tiene entidad hasta el Módulo 2.
  Esa consulta **es la misma definición de "clase consumida" que `V9` §5**, y
  tienen que moverse juntas: si se separan, la pantalla dice que quedan tres
  clases y la base rechaza la siguiente.
- **La firma de una baja de nivel la pone el servidor.** Del pedido viene solo el
  motivo; el autor sale del token y la fecha del reloj. Una firma que el cliente
  pudiera dictar no firma nada. La pantalla pide el motivo **antes** de enviar, no
  para imponer la regla —la impone `V9`— sino para no rebotar un formulario ya
  completo.

**Y dos del lado de la pantalla:**

- **El alumno se elige con un buscador, no con un `<select>`.** Con los ~80 del
  Notion una lista desplegable ya incomoda y con 300 sería inusable *sin que nada
  se rompa*, que es el modo de falla que la auditoría encontró en el listado
  (ARQ-01). Cuando hay más resultados de los que entran, lo dice.
- **`GET /api/profesores` no pagina, a diferencia de todo el resto.** El tamaño de
  los otros listados lo decide el negocio creciendo; el de este, la nómina del
  estudio — y lo consume un `<select>`, donde paginar empeora las cosas. Si algún
  día molesta, lo que corresponde es convertirlo en buscador, no paginarlo.
  Devuelve solo los activos por defecto: ofrecer a alguien que ya no da clases en
  una inscripción nueva es un error de carga que conviene no ofrecer.

**Lo que se creía que había que refactorizar y no hizo falta:** este documento
avisaba que `alumno.disciplina` y `alumno.nivel_actual` eran campos sueltos que
`inscripcion` iba a romper. **No existían** — ni en la entidad `Alumno` ni en
`V1`, que ya dice en un comentario que esos dos campos viven en `inscripcion`. La
decisión estaba tomada desde el baseline y el aviso sobrevivió a la decisión.
`AlumnoTest` sigue siendo la red que hacía falta, por otros motivos.

### ✅ El filtro por disciplina y nivel — decidido el 2026-08-16

Era la última pregunta abierta del módulo, y era de producto. **Las respuestas de
Ignacio, y lo que significan en la consulta:**

| Pregunta | Respuesta | Cómo queda |
|---|---|---|
| ¿Quien cursa DJ y producción aparece en las dos listas? | **Sí** | Un `EXISTS`, no un `JOIN` — con un JOIN el alumno se repetiría una vez por curso y el total de la página mentiría |
| ¿Cuenta una inscripción ya terminada? | A criterio → **no** | Solo `ACTIVA` y `PAUSADA`, en `EstadoInscripcion.VIGENTES` |

**Por qué `PAUSADA` cuenta y `COMPLETADA` no.** El listado de alumnos es la
herramienta del día a día: filtrar por "DJ" tiene que traer a quien está haciendo
DJ, no a quien lo terminó el año pasado. Pero una inscripción **pausada** es un
curso empezado con clases sin dar — esconder a esa persona de la lista la esconde
justo de quien tiene que ir a buscarla. La pregunta histórica (*"¿quién hizo DJ
alguna vez?"*) la contesta la pantalla de Inscripciones, que filtra por estado
explícitamente. Son dos preguntas distintas y cada una tiene su pantalla.

**Y un tercer detalle que nadie preguntó y cambia resultados:** disciplina y nivel
combinados exigen **una misma** inscripción. Quien hace DJ inicial y producción
avanzada *no* hace DJ avanzado, y con un `EXISTS` por filtro aparecería igual —
uno se satisface con una inscripción y el otro con la otra. Está en un test
(`disciplina_y_nivel_juntos_exigen_la_misma_inscripcion`) porque es invisible al
leer la consulta.

El listado además **muestra** lo que cada uno cursa, no solo filtra por eso: una
lista filtrada que no dice de qué es cada fila obliga a confiar en que el filtro
hizo lo que dijo.

### Lo próximo: el Módulo 2

**Horarios y salas** (`platform.md` §5): el calendario semanal por sala, el alta
de reserva, el bloqueo de sala y el historial de uso. Es el corazón operativo del
sistema y el que resuelve el problema que el relevamiento marca como más caro —
Ghezz enterándose tarde de un cambio de sala.

**Tres cosas que ya lo están esperando, todas escritas:**

1. **La migración de la seña (DB-04a).** `V9` deja anotada la herramienta —un
   `CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED` que verifica al COMMIT— y
   la razón por la que no se escribió antes: obliga a que la reserva y su pago
   entren en la misma transacción, que es una condición sobre pantallas que no
   existían. **Va con el arranque del módulo, no antes.**
2. **El orden de horas de la reserva (DB-11).** En `platform.md` §5.
3. **La base ya sabe casi todo.** El EXCLUDE de solapamiento, la matriz
   sala×uso como FK compuesta, los triggers de `bloqueo_sala`, nadie en dos salas
   a la vez (`V9` §1) y no consumir más clases que las contratadas (`V9` §5) ya
   están puestos. **`reserva` y `reserva_participante` no tienen entidad todavía**
   — son lo primero a escribir, y con ellas el `InscripcionRepository
   .contarClasesConsumidas` nativo se puede pasar a JPQL.

**Y algo del Módulo 1 se termina de cerrar recién con el Módulo 3:** el filtro por
estado de pago del listado y el estado de cuenta del perfil. Los dos están
dibujados como pendientes en la pantalla, no olvidados.

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

> **La remediación se cerró el 2026-08-15.** Las ocho tandas hechas, 56 de 56
> resueltos, backlog en cero. De los 61 encontrados, 1 quedó como riesgo
> aceptado y **4 dejaron de ser hallazgos de auditoría para volverse trabajo de
> otro documento**: DOC-08 y QA-07 son el deploy y viven en `operacion.md` §3;
> **DB-04 (la seña) y DB-11 (el orden de las horas) son parte de terminar el
> Módulo 2** y viven en `platform.md` §5. Ninguna de esas cuatro se cierra sola:
> hay que abrir esos dos archivos cuando toque. **Queda un solo hallazgo Alto abierto en todo el proyecto** —DOC-08, la
> sección de deploy— y no se destraba programando: espera el hosting de octubre.
>
> Las tandas **6** (operación, tests y CI) y **7** (la landing) se cerraron
> enteras, y **la 8 también, entera**. De sus catorce:
> la credencial corrupta que pasaba por vigente, el `ESCAPE` que ninguna consulta
> declaraba, los tres tokens de paleta que fallaban AA, la CSP de las dos apps,
> el desagüe de `/error` que seguía contestando en el formato viejo, la lógica de
> autorización copiada en dos controllers, los tipos de pedido que faltaban, los
> dos `package-lock.json` de más, la convención de idioma escrita por primera
> vez, el `LICENSE` que no existía, y los restos de estado superado que quedaban
> en este mismo documento.
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

**Cero.** No queda ningún hallazgo abierto: las ocho tandas están cerradas.

Quedan **4 a medias**, y ninguno es trabajo de código pendiente:

**Nada de la auditoría.** Las dos que quedaban —la seña y el orden de las horas—
**se mudaron al Módulo 2**, que es donde se pueden hacer: las dos necesitan
pantallas que todavía no existen. Están escritas como parte de terminar ese
módulo en [`platform.md` §5](requirements/platform.md), con qué falta y por qué
no se pudo antes.

**La seña, en particular, no se implementó hoy a propósito:** el trigger obliga
a insertar la reserva y su pago en la misma transacción, y sin las pantallas lo
único que se conseguía era que no se pudiera cargar ninguna reserva — incluidas
las 40 que las suites SQL insertan hoy sin pago.

**Eran cuatro. DOC-08 y QA-07 salieron del backlog el 2026-08-15**, por decisión de
Ignacio: los dos son deploy, no se pueden empezar hasta elegir el hosting en octubre, y
tenerlos dos meses en una lista de pendientes no los acerca. **El trabajo sigue escrito
donde se va a usar**, en [`docs/operacion.md`](operacion.md) §3 — el archivo que se abre
el día del deploy — y no en el informe de auditoría.

**La tanda 8 se hizo entera el 2026-08-15**, en tres partes y en ese orden: los
cuatro defectos —QA-08 (la credencial con vencimiento ilegible pasaba por
vigente), SEC-09 (ninguna consulta declaraba su `ESCAPE`), QA-06 (`--page-faint`
en 2,25:1 era el color de las etiquetas de los formularios) y SEC-07 (CSP y
cabeceras)—, después los cinco de código (ARQ-04 y ARQ-06 a ARQ-09), y la
documentación al final, para que registrara todo lo anterior de una vez.

**Seis veces el informe estuvo mal, viejo o incompleto, y las seis se corrigieron
en vez de seguirse:** los dos valores de paleta de QA-06 (0.45 no llega a AA;
`--red-hover` *empeora* el tema papel), la puerta de ARQ-04 (el caso que el
informe midió hoy sale bien; el que sobrevivía era `GET /error`), la regla que
enunciaba ARQ-08, la renumeración de DOC-12 (habría roto cuatro referencias:
se movieron los bloques conservando el número) y dos de los cuatro restos de
DOC-11, que ya no existían. Están documentadas una por una en el informe. El
prompt de remediación dice que *"el informe es una entrada, no una orden"*: la
tanda 8 es la primera que lo ejerce.

### Cómo levantar todo

`docker compose up -d` → `mvn spring-boot:run` en `apps/backend` → `npm run dev:platform`.
Detalle y credenciales en el [README](../README.md).

**Y para verificar que nada se rompió**, los cuatro comandos que corre el CI:

```
cd apps/backend && mvn test     # 108
./scripts/pruebas-sql.sh        # 121 + 50, sobre 9 migraciones
npm run test:platform           # 55
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
