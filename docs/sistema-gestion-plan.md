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
> la Fase 0 y está hecho—. **Y sus §13 y §14 ganan sobre este documento en todo lo que sea una
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

## 6f. PENDIENTES TÉCNICOS ACUMULADOS · abierta el 2026-08-19

> **Esta lista crece; no se reescribe.** Está deliberadamente **antes** de §6d y no
> adentro, porque §6d se reescribe entera al cerrar cada módulo —pasó hoy mismo— y
> una lista que sobrevive varios módulos no puede vivir en la sección que se pisa.
>
> **Qué entra acá:** lo que Ignacio decidió el 2026-08-19 posponer a propósito.
> El criterio de trabajo que acompaña a esta lista es **"MVP del módulo primero,
> retoques después"**, y se sostiene por una razón concreta del proyecto: **las
> reglas de negocio viven en la base, no en las pantallas.** Un rediseño del front
> no puede romper que una reserva necesite seña ni que nadie esté en dos salas a la
> vez. Lo caro ya está donde no se toca al maquetar.
>
> **El triage que sí hay que respetar:** si un pendiente **toca el esquema o una
> regla**, se hace en su módulo y no se pospone — las migraciones son inmutables y
> se acumulan, así que cambiar el modelo después de tres módulos que ya dependen de
> él cuesta un orden de magnitud más. Si es pantalla, texto, menú o flujo, va a esta
> lista. **De los cinco primeros, ninguno necesita migración**, y por eso posponerlos
> no acumula deuda estructural.

### 📋 Los cinco de la primera tanda (Ignacio, 2026-08-19)

**1 · El admin no debería poder cambiarse el nombre ni el mail** → *ya medio hecho,
y la otra mitad quizás no haga falta.*

El **mail ya no lo cambia nadie** (`EdicionPerfilRequest`, M4): es la credencial de
acceso y no hay forma de verificar una dirección nueva, así que un tipeo mal deja a
la persona afuera de su cuenta. Sobre el nombre queda una pregunta antes de
codificar: **¿la regla es sobre el rol o sobre esa cuenta?** Un ADMIN real es una
persona que puede cambiarse el apellido; lo que no es una persona es la cuenta
sembrada por `V3`, que **ya está agendada para desactivarse antes del deploy real**.
Si el problema es esa cuenta, el arreglo ya existe y no hace falta una regla nueva.

**2 · Que el rol ADMIN no pueda usar los servicios** → *hacerlo como MENÚ, no como
permiso. Esta es la recomendación más importante de la lista.*

Como permiso **rompe una decisión de arquitectura**: los dos ejes —permisos (`rol`)
y relaciones de negocio— están separados a propósito, y el caso testigo del propio
proyecto es *"Ghezz es STAFF **y** profesor **y** puede alquilarse una cabina, sin
contradicción"*. Si el rol empieza a decidir qué servicios se pueden contratar, los
dos ejes se vuelven uno solo.

Pero la necesidad es real y se vio al probar el M4: **es raro que el admin se pida
una cabina a sí mismo y se la apruebe**. La causa no es que no pueda usar el
servicio, es que **administración no necesita pedir** — carga la reserva directo en
el calendario, que para eso tiene permiso. Entonces: ocultar *Reservar cabina* y
*Mis pedidos* a quien `puedeOperar`, y dejarle *Mis reservas* y *Mis pagos*, que sí
le corresponden si participó o pagó algo. **Es un cambio en `menu.ts` y en ningún
otro lado.** Misma necesidad, un décimo del costo, y los dos ejes quedan en pie.

**3 · Que el usuario pueda modificar una reserva** → *es una pantalla que el M4 se
debe, no una idea nueva.*

*"Solicitar reprogramación"* está en la lista de pantallas del Módulo 4 en
[`platform.md` §7](requirements/platform.md) **y no se construyó**. La tabla
`solicitud_reprogramacion` existe desde `V1` y el M4 hasta le agregó el trigger de
"resuelta es final", así que **falta el endpoint y la pantalla, no el modelo**.

Y la forma es la misma que el pedido de sala: **el usuario pide, administración
resuelve.** No puede ser una edición directa — mover una franja vuelve a chequear el
solapamiento y arrastra la seña.

**4 · Cotización del dólar automática por API** → *sí, pero solo como prellenado.*

La cotización se guarda **por pago** y es la del momento del cobro (§2.3),
justamente porque cada cobro se tomó a un valor distinto. Entonces la API **solo
puede prellenar el campo**: nunca ser la fuente de verdad, nunca tocar filas
viejas. Y como es una dependencia externa que se puede caer, el campo tiene que
seguir siendo editable y el guardado no puede depender de que la consulta responda.

**Una pregunta que es del negocio y no técnica: ¿qué cotización?** Oficial, blue o
MEP. Para un estudio que cobra en dólares en efectivo, eso lo decide el cliente.

**5 · Que no se pueda pedir un horario ya tomado** → *la más barata de las cinco: la
maquinaria ya está.*

`GET /api/me/disponibilidad` ya devuelve las franjas ocupadas y `ReservarPagina` ya
las dibuja. Falta el chequeo al mandar el pedido. Dos cuidados:

- **Es un pre-chequeo, nunca la autoridad.** Dos personas pueden pedir la misma
  franja en el mismo segundo y un pedido no reserva nada: quien decide sigue siendo
  el EXCLUDE al aprobar. Esto baja el ruido de la bandeja, no previene conflictos.
- **Avisar, no bloquear.** Una franja tomada hoy puede liberarse mañana si esa clase
  se cancela; bloquear duro pierde ese pedido. *"Esa franja ya está pedida"* alcanza.

### 🎨 Y el rediseño del front, que va al final de todo

**Decidido el 2026-08-19: la plataforma se rediseña entera cuando estén los ocho
módulos, no de a un módulo por vez.** Un sistema de diseño aplicado a todas las
pantallas de una vez sale coherente; aplicado de a poco, deriva. (La **landing no se
toca**: quedó cerrada.)

Tres cosas para ese momento:

- **No arranca de cero.** `index.css` ya tiene los tokens y una decisión tomada: la
  landing es oscura y teatral porque vende, la plataforma es clara y densa porque se
  mira ocho horas por día.
- **El grueso está en `componentes/`**, no en las páginas — `Boton`, `Campo`,
  `CampoSelect`, `PedirMotivo`, `Paginado`, `DetalleDeCuenta`. Casi todas las
  pantallas se componen de ahí.
- **Va a romper tests del front, y está bien.** Los casos preguntan por texto visible
  —"Confirmar y cobrar", "Esperando respuesta", "Faltaste"— porque prueban
  *decisiones*, no píxeles: renombrar un botón obliga a decidir el nombre nuevo a
  conciencia. **No lo esquives escribiendo tests por `data-testid`.**

> ⚠️ **Lo único que el rediseño no puede borrar:** en varias pantallas hay texto que
> no es decoración sino **la explicación de una regla** — *"Todavía no reserva la
> sala: primero lo confirmamos"*, *"no se aparta un horario sin pago por
> adelantado"*, los bloques *"todavía no disponible"* con el módulo que los trae. Se
> puede cambiar cada color y cada tipografía; esas frases se reescriben, no se
> eliminan, o el sistema pasa a hacer cosas que el usuario no entiende.

---

## 6d. DÓNDE RETOMAR · última actualización 2026-08-19 (cuarta tanda)

> **Empezá acá si estás abriendo el proyecto de nuevo.** Esta sección se
> actualiza al cerrar cada tanda; si contradice a otra parte del documento, gana
> esta y hay que corregir la otra.
>
> **Y mirá también [§6f](#6f-pendientes-técnicos-acumulados--abierta-el-2026-08-19),
> que es la lista de retoques técnicos pospuestos a propósito.** Está justo arriba y
> fuera de esta sección porque esto se reescribe entero cada vez y esa lista no.
>
> **Y para todo lo que sea una DECISIÓN, mirá antes
> [`docs/requirements/platform.md` §13 y §14](requirements/platform.md) — "Decisiones
> cerradas el 2026-08-14" y su segunda tanda del 2026-08-19, que cierra las tres del
> Módulo 6.** Veinte preguntas contestadas de una sola vez, las
> cinco del cliente incluidas, y es posterior a este documento y al informe de
> auditoría. **Gana sobre los dos.** No estaba enlazada desde ningún lado, y por
> eso el informe pasó un día listando como *"bloqueado por una decisión"* diez
> hallazgos que ya estaban decididos.

### ⏭️ SI ESTÁS RETOMANDO, EMPEZÁ ACÁ — al 2026-08-19, cierre de la cuarta tanda

## ✅ MÓDULO 6 CERRADO: seis de ocho módulos, y el esquema volvió a hablar

Mix & Mastering está entero —tablero de administración, portal del cliente, dos
migraciones y 33 casos nuevos— y **cerrarlo destapó dos problemas que llevaban
meses en la base sin que ninguna suite pudiera verlos.** Esa es la parte que
conviene leer antes que el resto.

**Suites al cierre: 390 backend · 330 front · 162 + 51 SQL.**

### 🟢 Para arrancar en verde

```
docker compose up -d                     # Postgres. Si Docker Desktop no está
                                         # abierto, esto falla con un error de
                                         # named pipe: hay que lanzarlo primero.
cd apps/backend  && mvn spring-boot:run  # :8080 — aplica Flyway al arrancar
cd apps/platform && npm run dev:platform # :5173 — el proxy manda /api al 8080
```

Se entra con **`admin@lajuanita.local` / `lajuanita2026`**. Las cuatro suites:
`mvn test` (390 casos), `npm test` en `apps/platform` (330) y
`./scripts/pruebas-sql.sh` (162 + 51, y esas dos NO las corre `mvn test`).

> **La base de desarrollo, para no confundir "vacío" con "roto"**: 10 usuarios,
> 6 alumnos, 6 inscripciones, 9 reservas viejas de principios de agosto (el
> calendario abre en la semana actual y **se ve vacío**, hay que retroceder), los
> datos de demo del M4 —tres solicitudes, la reserva 1556 con su seña— y **cero
> filas en `trabajo_mastering`**: la pantalla nueva arranca vacía y se llena desde
> ahí. `egreso`, `venta_equipo`, `nota_profesor`, `material` y `seguimiento_alumno`
> también siguen en cero.

### 🕳️ LO QUE ENCONTRÓ ESTE MÓDULO, QUE ES LO MÁS IMPORTANTE DE LA TANDA

**1 · El candado del premaster estaba roto desde `V6` y las suites no podían
avisar.**

`proteger_pago_de_premaster()` declaraba una variable `id_pago` y la comparaba
contra la columna homónima. Postgres aborta con *"column reference id_pago is
ambiguous"* **antes** de llegar al `RAISE` que explica el problema. Consecuencias
medidas:

- El mensaje redactado para una persona **nunca se emitió**.
- Como 42702 no es P0001, la API contestaba **500** en vez del 409 con la
  explicación: desde la pantalla, la regla más importante del módulo se veía como
  un sistema roto.
- Y la rama que **debía dejar pasar** —que quede otro pago sosteniendo la
  liberación— reventaba también. O sea que además de no explicar, **rechazaba de
  más**.

`V16` lo arregla renombrando la variable. Lo arreglado no es "el agujero": el
agujero nunca estuvo abierto, porque fallar por un error también rechaza.

**Y por qué nadie lo vio: `probar(...,'FALLA',...)` verifica que la sentencia
falle, no por qué falla.** Los casos D02 y D03 —"anular/borrar el pago que
respalda un premaster liberado"— estuvieron en verde todo este tiempo. **Un caso
'FALLA' que no mira el mensaje no distingue una regla que funciona de un bug que
revienta antes**, y es la contracara exacta de la lección que la suite ya tenía
escrita para el otro lado: *un 'ANDA' tiene que verificar que afectó filas*.

La suite adversarial gana `probar_mensaje(nro, caso, fragmento, sentencia)` y D02
pasa a exigir el texto del trigger. **Cuando escribas un caso 'FALLA' sobre un
trigger, usá ese.**

**2 · Dos reglas del proyecto se contradecían: `V15`.**

§9 pide *"alerta al superar las revisiones incluidas"* y `V6` §3 lo hacía imposible
con un CHECK. Gana §9 —regla confirmada con el cliente— sobre la inferencia de la
auditoría, igual que P22 ganó sobre la propuesta comercial. El detalle y el
razonamiento están en `platform.md` §14.

### 🖥️ LO QUE SE CONSTRUYÓ

| Qué | Dónde |
|---|---|
| Tablero de trabajos, con filtro por estado y búsqueda | `/admin/mix-mastering` |
| Alta, edición del expediente, estado, revisiones, premaster y cobro | la misma pantalla, al abrir un trabajo |
| Mis trabajos (cliente) | `/mix-mastering` |
| Backend | `com.lajuanita.backend.mastering` (dos controllers) |

**Cinco operaciones de escritura y ninguna es un PUT genérico**: editar el
expediente, mover el estado, sumar una revisión, liberar el premaster y cobrar son
cinco hechos distintos. Metidos en un solo guardado, **liberar un premaster sería
un checkbox más del formulario** — sin motivo, sin autor, y sin nada que distinga
"lo entregué" de "guardé la ficha". Por lo mismo **cargar el link del premaster no
es entregarlo**: cargarlo es edición, liberarlo es un acto.

### 🧩 LAS DECISIONES DEL MÓDULO

- **La regla dura tiene una sola forma en pantalla, y el orden es la decisión.** Se
  aprieta *Entregar premaster*; si no hay pago el backend rechaza y la pantalla
  muestra **sus palabras**; recién debajo aparece *"Liberarlo igual, con motivo"*.
  Primero se ve la regla, después la salida — y la salida cuesta escribir una frase
  que queda firmada. Al revés sería una sugerencia.
- **El cobro sale de la propia pantalla** (`POST /api/mastering/{id}/cobro`,
  delegado a `PagoService`), como la seña de una reserva y el cobro de una venta.
  `/admin/pagos` sigue saldando solo inscripciones y no hubo que rehacerlo.
- **Cobrar mueve el estado a PAGADO con tres condiciones**: que ya esté entregado,
  que haya precio, y que lo cobrado **en la moneda del trabajo** lo alcance. Un pago
  en pesos contra un trabajo en dólares no se convierte —no hay cotización que el
  sistema pueda inventar— y sumarlos daría un número que no es plata de ninguna de
  las dos.
- **El pago necesita cuenta y el trabajo no.** `pago.id_usuario` es NOT NULL y la
  mitad de los clientes de M&M son externos; el formulario de cobro lo dice y pide
  a nombre de quién queda, en vez de mandar un pedido que la base rechaza.
- **`TrabajoDelPortal` esconde el premaster en el mapeo, no en la pantalla.** Un
  link escondido con un `if` en el front viaja igual en la respuesta HTTP y se lee
  con las herramientas del navegador.

### ⏭️ MAÑANA, EN ORDEN

**1 · El Módulo 6 ya está commiteado** (`35fe3d0 Modulo 6`). Lo único suelto al
cortar es la documentación de esa misma sesión —`CLAUDE.md`, este archivo,
`platform.md` y el archivo de preguntas nuevo—, que se commitea y listo.

> ⚠️ **`V15` y `V16` están aplicadas Y commiteadas: no se editan nunca más.**
> Flyway les guarda el checksum y la app no arranca si cambian. Cualquier cosa que
> haya que corregir de esas dos va en una `V17`. Es la regla que este proyecto ya
> aprendió rompiéndola una vez, con un comentario agregado a `V3`.

**2 · Verificar que arrancás en verde**, que con dos migraciones nuevas conviene
hacerlo de entrada:

```
docker compose up -d
cd apps/backend  && mvn test              # 390
cd apps/platform && npm test              # 330
./scripts/pruebas-sql.sh                  # 162 + 51, sobre 16 migraciones
```

**3 · Mandarle las preguntas a Ghezz antes de escribir una línea del Módulo 7.**

Están redactadas y listas en
**[`docs/relevamiento/preguntas-abiertas-modulos-7-y-8.md`](relevamiento/preguntas-abiertas-modulos-7-y-8.md)**,
con lo que cambia cada respuesta. **Son cuatro que traban y cuatro ratificaciones.**

Esto es lo que hizo que el Módulo 6 no se frenara nunca, y hay una que no estaba en
ningún índice de pendientes y es la más cara de todas:

> 🔴 **El contrato del sello: ¿archivo o link?** `contrato_sello.archivo_path` es
> `VARCHAR(500) NOT NULL` y la regla dura del módulo es *"no se publica un release
> sin contrato adjunto"*. Si es un archivo, **el Módulo 7 es el que finalmente
> obliga a construir el `StorageService` de §2.4**, y eso hay que saberlo antes de
> planificar el módulo, no a mitad de camino. Y a diferencia de M&M, acá el
> argumento para esquivarlo es flojo: un contrato es el respaldo legal de un
> lanzamiento, y un link al Drive de otro se cae sin avisar.

Las otras tres que traban: **P24** (¿los artistas tienen login? — se espera que no,
y con confirmarlo alcanza), **P25** (¿el seguimiento post-lanzamiento entra?) y
**P26** (¿cómo se define la tasa de retención? — es el único indicador del Módulo 8
que no se puede construir sin una definición del negocio).

**4 · Mientras esperás las respuestas**, hay dos cosas que no dependen de nadie:

- **§6f**, los cinco retoques técnicos pospuestos. Ninguno necesita migración y el
  segundo —ocultarle *Reservar cabina* y *Mis pedidos* a quien administra— es un
  cambio en `menu.ts` y en ningún otro lado.
- **El disparador automático de avisos**, que **ya lo piden tres módulos**: la deuda
  a 7 días (M4), la entrega impaga a 7 días (M6) y el aviso 7 días antes de un
  lanzamiento (M7). Es una pieza de infraestructura —un scheduler, y decidir qué
  pasa si corre dos veces el mismo día— y conviene construirla una sola vez para
  los tres. `PagoService.DIAS_PARA_VENCER` ya guarda el número que dos de ellos
  miran. **Es el trabajo mejor amortizado que queda pendiente.**

**5 · Y el orden del final**, para no perderlo de vista: quedan los módulos **7 y 8**
y después **el rediseño del front entero, en una sola pasada** (§6f). La landing no
se toca.

## 📚 EL MÓDULO 5, PARA CONSULTA (cerrado el 2026-08-19, tanda anterior)


## ✅ MÓDULO 5 CERRADO: backend, front y el bloque que le debía a la ficha del alumno

El módulo estuvo **medio día partido al medio** —backend entero, cero pantallas— y
esa mitad ya no existe: están **las seis pantallas**, el menú, las rutas y los
casos. Y de paso se cerró algo que ninguna de las dos mitades tenía: **la regla de
§8 que dice que administración sí ve las notas privadas.**

**Suites al cierre: 372 backend · 315 front · 162 + 50 SQL.**
(El front sumó 36 casos; el backend, 5. Ninguna migración: este módulo ya tenía la
suya, `V14`, y nada de lo que faltaba era una regla de la base.)

### 🟢 Para arrancar en verde

```
docker compose up -d                     # Postgres. Si Docker Desktop no está
                                         # abierto, esto falla con un error de
                                         # named pipe: hay que lanzarlo primero.
cd apps/backend  && mvn spring-boot:run  # :8080 — aplica Flyway al arrancar
cd apps/platform && npm run dev:platform # :5173 — el proxy manda /api al 8080
```

Se entra con **`admin@lajuanita.local` / `lajuanita2026`**. Las cuatro suites:
`mvn test` (372 casos; surefire reporta 374 corridas), `npm test` en `apps/platform` (315) y `./scripts/pruebas-sql.sh`
(162 + 50, y esas dos NO las corre `mvn test`).

> **Qué tiene la base de desarrollo, para no confundir "vacío" con "roto"**
> (verificado el 2026-08-19):
>
> - 10 usuarios, 6 alumnos, 6 inscripciones y **9 reservas viejas, todas entre el
>   1 y el 15 de agosto**: el calendario abre en la semana actual y **se ve
>   vacío**, hay que retroceder. Lo mismo *Mi agenda* del profesor.
> - **Datos de demo del Módulo 4**: tres `solicitud_reserva`, la **reserva 1556**
>   que nació de la aprobada, su **seña de $18.000 en `SENADO`** y dos
>   notificaciones.
> - `egreso`, `venta_equipo`, `nota_profesor`, `material` y `seguimiento_alumno`
>   **siguen en cero**: ninguna pantalla las había llenado nunca. Las tres últimas
>   ya tienen quién las llene — se cargan desde las pantallas nuevas del M5.
>
> ⚠️ **Esos datos de demo ya rompieron un test una vez** —
> `ReservaTest.una_grabacion_con_su_sena_tiene_plata_detras` asumía que había un
> solo pago con reserva en toda la base. Ya está arreglado, pero **si aparece un
> test que falla sin que el código haya cambiado, mirá si no está asumiendo una
> base vacía.**
>
> Y **ojo con las reservas viejas**: se cargaron antes de `V10`, así que no tienen
> seña detrás. Si cancelás una no vas a poder descancelarla, porque `V11` le va a
> pedir la plata que nunca tuvo. Es correcto.

### 🖥️ LAS SEIS PANTALLAS, Y DÓNDE QUEDÓ CADA UNA

| Pantalla | Ruta | Archivo |
|---|---|---|
| Mi agenda + **historial de clases dictadas** | `/mi-agenda` | `MiAgendaPagina.tsx` |
| Mis alumnos (con semáforo) | `/mis-alumnos` | `MisAlumnosPagina.tsx` |
| Ficha de un alumno mío — notas, semáforo y su material | `/mis-alumnos/:idAlumno` | `FichaDeAlumnoPagina.tsx` |
| Subir material | `/material` | `SubirMaterialPagina.tsx` |
| Mis materiales (del **alumno**) | `/mis-materiales` | `MisMaterialesPagina.tsx` |
| Notas y materiales en la ficha de administración | `/admin/alumnos/:id` | dentro de `AlumnoPerfilPagina.tsx` |

**El historial de clases dictadas quedó como sección de Mi agenda y no como
pantalla propia**, que era una de las dos opciones que este documento dejaba
abiertas: son la misma pregunta mirada desde los dos lados del día de hoy —qué
tengo esta semana, cuántas di— y separarlas obligaba a elegir dos veces el mismo
período. El resumen pide **el mismo rango que la lista**, así que no pueden
discrepar; hay un caso que lo sostiene.

### 🧩 LO QUE EL FRONT DECIDIÓ, Y NO ES VISUAL

- **El semáforo sin marcar es gris y dice "Sin marcar".** `null` no es `VA_BIEN`:
  un verde que nadie puso miente sobre un alumno que nadie miró, y encontrar a los
  que nadie miró es para lo que se abre el listado. Vive en
  `componentes/Semaforo.tsx` —lo dibujan dos pantallas— y hay casos en las dos.
- **La nota viaja con el id de la PARTICIPACIÓN, y el desplegable lo esconde.** El
  profesor elige *"12/08 10:00 · Clase de DJ"*, no un número. Las clases salen de
  la agenda de los últimos 60 días **cruzadas por `idUsuario`, no por `idAlumno`**:
  la participación cuelga del usuario, y `AlumnoDelProfesor` trae los dos ids
  justamente para poder hacer ese cruce. Una clase cancelada no se ofrece — no se
  dictó, así que no hay nada que anotar sobre ella.
- **La ficha saca al alumno de la lista de Mis alumnos y no de un endpoint
  propio.** No falta ninguno: la lista ya trae todo lo del encabezado, y buscar
  ahí adentro tiene la propiedad de que **un id que no es mío no aparece** — la
  misma respuesta que da el backend por su lado.
- **Un solo control de destinatario en Subir material.** "¿Para quién? → todos / un
  alumno". Dos controles permiten un pedido contradictorio que la base rechaza y
  que el formulario no debería haber dejado escribir.
- **Los alumnos de la agenda se nombran y no se enlazan.** La participación trae
  `idUsuario` y la ficha se abre por `idAlumno`: son dos cosas distintas. Se entra
  desde Mis alumnos.
- **`rangoLegible()` no se usó**: indexa `[6]` y da por hecho una semana de siete.
  El encabezado se arma con `diaYMes(desde)` / `diaYMes(hasta)`, como avisaba la
  tanda anterior.

### 🕳️ EL AGUJERO QUE ENCONTRÓ ESTA TANDA: media regla de §8

**§8 dice, textual: *"sus notas privadas no las ven ni el alumno ni otros
profesores. Administración sí"*. La primera mitad estaba; la segunda no existía en
ninguna capa** — no había endpoint, y la ficha del alumno seguía dibujando
*"Todavía no disponible — Módulo 5"*. Cerrar el módulo así habría dejado una regla
escrita a medias con todos los tests en verde.

Se cerró con lo mínimo: `GET /api/alumnos/{id}/notas` y `/materiales`, los dos
`@PuedeLeerAdministracion`, y el bloque 6 de la ficha. Cuatro cosas que decidió:

- **Clase aparte, `DocenciaDelAlumnoService`, y no dos métodos más en
  `DocenciaService`.** Aquella tiene una propiedad escrita en su cabecera y
  sostenida por veinte casos: *todo* pasa por `miDocencia` y
  `verificarQueEsMiAlumno`. Estos dos métodos tienen que saltearlos
  —administración no es profesor de nadie— y meterlos ahí convertía esa frase en
  una casi-verdad, que es la clase de comentario que después nadie relee.
- **Consulta nueva y explícita, no la vieja con el profesor en `null`.** Lo pedía
  el propio comentario de `NotaProfesorRepository`, escrito el día anterior: una
  consulta que se saltea el filtro cuando le pasan null **se puede llamar sin
  querer desde el portal del profesor y nadie se entera**. `todasSobreElAlumno` no
  acepta un profesor, así que no tiene forma de usarse por accidente.
- **`NotaDeAlumno` es un DTO nuevo y no `NotaResumen` con un campo más.** Son dos
  lecturas del mismo registro: el autor ya sabe que la nota es suya; en la ficha,
  donde conviven las notas de tres profesores, **el autor es el dato**. Mismo
  precedente que `ReservaDelPortal`.
- **Es de solo lectura y va a seguir siéndolo.** Corregir una nota es del autor —la
  firma *es* el dato— y publicar un material es del profesor que lo subió. Un PUT
  ahí le saca el sentido a las dos reglas.

**Con esto la ficha del alumno construye los seis bloques de §4 y no queda ninguno
dicho como pendiente.** El caso que exigía el cartel —*"nombra la única sección que
falta y el módulo que la trae"*— fue justamente lo que avisó, al construirse el
módulo, que había que reemplazarlo; se cambió por casos del bloque real.

### ⏭️ LO PRÓXIMO

**Módulo 6 — Mix & Mastering, y ya no lo traba ninguna decisión.** Sus tres preguntas
abiertas se cerraron el 2026-08-19 y están en **`platform.md` §14**: se entrega el
master y se retiene el premaster (**P22**, gana la entrevista sobre la propuesta), los
**audios no pasan por el sistema** (**P23**: siguen por WeTransfer/Drive y se guarda el
link) y **la excepción para liberar sin pago existe**, con motivo escrito y autor
registrado (**P28**), disponible para administración y no solo para un ADMIN. Se
ratificaron además las tres apuestas del esquema: 3 revisiones incluidas, cotización en
USD y los tres tipos de trabajo.

**Ninguna necesita migración: `V1` había apostado por todas y acertó.** Lo que queda es
construcción.

**Y P23 le sacó de encima al módulo lo que lo hacía caro:** el `StorageService` de §2.4
**deja de ser un prerrequisito**. Sigue debiéndose —lo necesitan la descarga de
comprobantes del M3 y, algún día, el material de clase del M5— pero el M6 entero se
puede construir sin él, y tampoco depende ya de la decisión de hosting de octubre,
porque no hay audio que almacenar. De paso, esa respuesta **corrigió una contradicción
que nadie había marcado**: §2.4 decía que las entregas de M&M pasan por el
`StorageService` y `V1` las modela como `VARCHAR(500)` desde el primer día.

**Lo único que el M6 pide y todavía no existe** es el disparador automático de la alerta
a los 7 días de la entrega sin pago: corre sin que nadie pida nada, necesita un
scheduler y decidir qué pasa si corre dos veces el mismo día. **Es la misma pieza que el
M4 dejó anotada** para el aviso de deuda — la segunda vez que un módulo la pide, así que
conviene que este la construya. La otra alerta, la de revisiones excedidas, no la
necesita: se dispara al registrar una revisión.

Y antes de eso, **§6f**: cinco retoques técnicos pospuestos a propósito, ninguno de
los cuales necesita migración.

### 🧠 LO QUE EL BACKEND DEL M5 DECIDIÓ, y que el front respetó

- **`/api/me/profesor/**` — el tramo `/profesor` es la decisión de diseño.** Una
  misma persona puede ser alumna y profesora (Ghezz da clases y alquila cabina),
  así que `/api/me/materiales` sería ambiguo: ¿los que subí o los que me dieron? El
  tramo dice **desde qué relación estoy mirando**. El del alumno no lo lleva.
- **"Mi alumno" son dos caminos**, y es la misma forma que "mi reserva" del M4:
  tener una inscripción asignada a mí, **o** haber estado en una clase que yo di.
  El segundo es **el suplente** — quien toma una clase ajena necesita poder dejar
  la nota de esa sesión, que es cuando más falta hace.
- **Esa regla vive en Java y no en la base, a propósito** (la razón está en la
  cabecera de `V14`): son dos caminos, y escribir ese JOIN doble en SQL sería la
  segunda copia de una definición. La consecuencia a tener presente: **si un
  endpoint nuevo se olvida del chequeo, nada falla** — la pantalla anda y muestra
  de más. Por eso `DocenciaTest` está escrito en pares.
- **Ser profesor es una relación y no un rol**: no hay `@PreAuthorize` que lo
  decida, `DocenciaService` va a buscar la fila. Un ADMIN sin fila en `profesor` no
  entra, y está bien.
- **El profesor no modifica reservas** (regla dura de §8): no hay ni un endpoint
  que escriba sobre `reserva` en todo el módulo.
- **El material va por link, no por archivo subido.** `material.archivo_path`
  existe y espera al `StorageService` de §2.4; el CHECK de `V1` acepta link o
  archivo, así que **el módulo entra entero sin arrastrar la infraestructura de
  archivos**. Cuando esa pieza se construya —la necesita el M6 para retener el
  premaster— se agrega el campo y nada más cambia.
- **`RESERVA_MOVIDA`**: el aviso de cambio de sala u horario ya sale solo
  (`ReservaService.editar`), **al profesor y a los alumnos**, y solo si de verdad
  se movió — un aviso por cada edición entrena a la gente a ignorarlos.

### 🕳️ DOS COSAS QUE ESTA TANDA ENCONTRÓ Y CONVIENE NO REPETIR

**1. `V14` casi duplica una regla que `V1` ya tenía.** Iba a traer un trigger para
que una nota no se cuelgue de la clase de otro alumno; **eso ya estaba en `V1`
§8.3** y se descubrió porque un test esperaba el mensaje del trigger nuevo y
recibió el del viejo. Se sacó. **Antes de escribir una regla en la base, buscarla
en `V1`** — su §8 es justamente "reglas cruzadas entre tablas", que es la clase de
regla que un módulo nuevo siente la tentación de agregar.

> `V14` se editó **después** de haberse aplicado a la base de desarrollo, que es lo
> que el proyecto prohíbe. Se hizo a conciencia porque el archivo se escribió ese
> mismo día y no había salido de esta máquina; hubo que borrar su fila de
> `flyway_schema_history` y sus objetos a mano. **Si `V14` ya está commiteada
> cuando leas esto, la regla vuelve a valer: no se toca.**

**2. Un test asumía que la base estaba vacía.**
`ReservaTest.una_grabacion_con_su_sena_tiene_plata_detras` preguntaba por *"el pago
que tenga `id_reserva`"* y funcionó hasta que la base de desarrollo tuvo su primera
reserva con seña cargada de verdad (los datos de demo del M4): devolvió tres filas
y reventó **sin que el código hubiera cambiado**. Ya está atado a su propia reserva.
Es la misma trampa que las suites SQL describen para las fechas.

### 🚪 LO QUE EL MÓDULO 4 DEJÓ CONSTRUIDO, Y LAS DOS PIEZAS QUE HEREDA EL M5

**El módulo empezó con una migración, `V13`, y no con una pantalla.** La razón es
la consecuencia de P17 que el propio documento anotó: el portal **no puede crear
una `reserva`** —no existe sin plata en SENADO/PAGADO detrás y un `USUARIO` no
tiene cómo poner plata en el sistema—, así que crea una **solicitud** y la reserva
nace cuando administración la aprueba cargando la seña, en la misma transacción.

De las dos decisiones que estaban abiertas:

1. **Tabla nueva, `solicitud_reserva`**, no una generalización de
   `solicitud_reprogramacion`. Esa tiene `id_reserva NOT NULL` y un CHECK que
   cuelga de eso; aflojarla convertía cada regla suya en condicional, que es la
   forma de excepción por estado que §13 rechazó. Y son dos ciclos de vida: una
   pide **mover** algo que existe, la otra pide **crear** algo que no.
2. **El alcance "solo lo mío" es un `WHERE`, no una anotación**, y esa es la
   pieza que el M5 y el M6 heredan. Un permiso por rol se concede; un alcance por
   identidad es un filtro que no se puede omitir, así que no hay
   `@PuedeVerLoSuyo` —sugeriría que autoriza algo— sino: todo el portal cuelga de
   `/api/me/**`, **ningún endpoint de ahí recibe una identidad**, el id sale del
   `sub` del token, y `PortalService` no tiene una sola consulta capaz de
   devolver lo de otro. El STAFF que mira la ficha ajena usa el endpoint
   administrativo de siempre: **ningún endpoint cambia de significado según quién
   llama**. `PortalTest` está escrito casi todo en pares —uno mira lo suyo, el
   otro mira lo del vecino con el mismo endpoint— porque un filtro que falta no se
   ve nunca: la pantalla anda igual, y de más.

**Ocho pantallas**: siete del portal (`/mis-reservas`, `/reservar`,
`/mis-solicitudes`, `/mis-cursos`, `/mis-pagos`, `/notificaciones`, `/mi-perfil`)
y **una de administración, `/admin/solicitudes`**, que es la que cierra el
circuito. Esa octava no es un extra: sin alguien que lea los pedidos, el portal
escribe en una tabla que nadie mira, que es la lección del cierre del Módulo 2 —
*preguntá de dónde sale el primer dato de cada tabla que toca, y quién lo lee*.

**Cuatro cosas que conviene no deshacer:**

- **Aprobar es cobrar.** El "sí" es un formulario de seña, no un botón: la reserva
  no puede existir sin plata detrás. Y **se aprueba tal como se pidió** — no se
  puede aprobar "pero a las 18". Si la franja no sirve se rechaza diciendo por
  qué; así lo aprobado es siempre algo que alguien eligió.
- **Al que pide se lo anota como participante de la reserva**, aunque un alquiler
  no sea una clase. Es cierto —está ocupando la sala— y hace que "mis reservas"
  tenga una sola definición. De regalo entra en la regla de `V9`: nadie en dos
  salas a la vez.
- **"Mía" es participar o haber pagado**, escrito una sola vez
  (`ReservaRepository.deLaPersona`). Son los mismos dos caminos con los que `V12`
  busca la plata detrás de una reserva, y con la misma lista de estados:
  `EstadoPago.ENTRARON`. Una deuda anotada no hace tuya una reserva.
- **Lo que falta se dibuja con nombre.** Materiales (Módulo 5), comprobantes
  descargables (necesitan el `StorageService` de §2.4) y el aviso automático de los
  7 días. Ese último **no es un tipo de notificación que falte**: es otra máquina
  —corre sin request, necesita scheduler e idempotencia— y va con el módulo que
  construya notificaciones automáticas.

### 🧨 Y una regla dura de §6 que sigue sin estar entera

*"Alerta automática si alguien lleva más de 7 días en estado 'debe'"*. Lo que **sí**
está: `DIAS_PARA_VENCER = 7`, `/admin/deudores` marcando quién pasó el umbral, y
desde el M4 **la tabla `notificacion` con su bandeja y su primer escritor**. Lo que
falta es solo el disparador automático, con las tres preguntas que trae: cada
cuánto corre, a quién le avisa (¿al alumno, a administración, a los dos?) y qué
pasa cuando corre dos veces el mismo día.

### 🚦 LAS DOS DECISIONES DEL M4 · tomadas el 2026-08-19 · se dejan por el razonamiento

> **Las dos están resueltas** —tabla nueva y alcance por `WHERE`, ver arriba—. Se
> deja el planteo porque el razonamiento vale para el M5 y el M6, que heredan el
> mismo eje de permisos.

**No arranques por una pantalla.** Las dos piezas más caras del módulo estaban al
principio y las dos eran de diseño, no de tipeo. Ninguna estaba bloqueada esperando
al cliente — P17 y P19 se contestaron el 2026-08-17 y están en
[`platform.md` §7](requirements/platform.md).

**1. ¿Dónde vive una solicitud de reserva?** El portal no puede crear una
`reserva`: no existe sin plata detrás en estado `SENADO`/`PAGADO` (P8, `V10`–`V12`)
y **un `USUARIO` no tiene cómo poner plata en el sistema** — registrar un pago es
`@PuedeOperar`, los cinco medios son de carga manual y no hay pasarela en ningún
lado del alcance. Entonces el portal genera una **solicitud**, y la reserva nace
cuando administración confirma y carga la seña.

  La única tabla de solicitudes que existe es `solicitud_reprogramacion`. Hay que
  decidir entre **crear una `solicitud_reserva`** o **generalizar la que hay** (que
  hoy tiene `id_reserva NOT NULL`, así que generalizarla es aflojar esa columna y
  agregarle los datos del pedido: sala, tipo de uso, fecha y horas). **Sea cual
  sea, el M4 empieza con una migración.**

**2. El eje de permisos "solo lo mío", que hoy no existe en ninguna forma.** Todo
endpoint administrativo se autoriza por **rol** (`@PuedeLeerAdministracion` /
`@PuedeOperar`). El portal necesita algo distinto: alcance por **identidad**. Es un
patrón nuevo y transversal —lo van a usar los módulos 4, 5 y 6— así que conviene
diseñarlo una vez y bien. Las dos preguntas concretas: dónde se aplica el filtro
(¿en el service, con el id del token? ¿un `@PuedeVerLoSuyo`?) y qué pasa cuando un
STAFF mira la ficha de otro, que es el mismo endpoint con otro alcance.

> **Y lo que ya está decidido, para no volver a abrirlo (2026-08-17, Ignacio):**
>
> - **La cursada la decide administración.** El alumno no elige clase, horario ni
>   profesor. **Lo que no depende de un profe sí lo elige el usuario**: alquiler de
>   cabina y grabación. La línea no la marca el rol, la marca si hay un profesor
>   del otro lado (P17).
> - **Nadie pierde nunca su cuenta** (P19). Dar de baja al alumno no da de baja a
>   la persona: `alumno.estado_alumno = INACTIVO` es "terminó de cursar",
>   `usuario.activo = FALSE` es una baja real. El portal se le sigue mostrando —
>   sus materiales, su historial, y poder alquilar una cabina.

### 📌 Lo único que el Módulo 3 dejó abierto a propósito

**Una venta cargada sin cobro no tiene después por dónde cobrarse.** El cobro entra
junto con la venta; `/admin/pagos` solo salda inscripciones y aceptar el otro
destino es rehacer ese formulario (hoy es alumno → sus inscripciones). Se decidió
no hacerlo: con la anulación andando, se anula y se vuelve a cargar con el cobro, y
P33 ya dejó dicho que el negocio cobra por adelantado y no en cuotas. **Si aparece
una venta en cuotas real, ahí se rediseña con el caso a la vista.**

### 🧨 Y una regla dura de §6 que NO está entera

*"Alerta automática si alguien lleva más de 7 días en estado 'debe'"*. Lo que **sí**
está: `DIAS_PARA_VENCER = 7` y `/admin/deudores` marcando quién pasó el umbral. Lo
que **no**: el aviso que salta solo. No hay maquinaria de notificaciones en ningún
lado — la tabla `notificacion` existe desde `V1` y nadie la escribe. Aparece con el
portal (M4 lista "Mis notificaciones" entre sus pantallas), así que **es del M4 o
del que construya notificaciones, no una deuda del M3.**

> **Lo que la seña le cambió al calendario, por si lo tocás:** el alta ya no crea
> una reserva vacía. Una **clase** entra con su alumno y su inscripción; un
> **alquiler o una grabación** entran con su seña. Los dos campos son opcionales en
> el DTO y ninguno lo es en la práctica — el que corresponde según el tipo de uso
> lo exige la pantalla, y el que falte lo rechaza `V10` al COMMIT.

> **De las tres cosas que el Módulo 3 dejaba abiertas, dos se cerraron el
> 2026-08-17** y queda una sola, a propósito:
>
> - ✅ **`egreso` y `venta_equipo` ya se anulan** (`PATCH /{id}/anulacion`, mismo
>   patrón y mismo `MotivoRequest` que `pago`). Corregir uno mal cargado es
>   anularlo y volver a cargarlo. **Lo caro no fue la anulación sino la caja:** ver
>   abajo.
> - ✅ **La seña ya no se puede romper anulando el pago** (`V11`). Ver abajo.
> - ⏳ **Una venta cargada sin cobro no tiene después por dónde cobrarse.** El cobro
>   entra junto con la venta; `/admin/pagos` sigue saldando solo inscripciones y
>   aceptar el otro destino es rehacer ese formulario (hoy es alumno → sus
>   inscripciones). **Se decidió no hacerlo**: con la anulación andando, una venta
>   sin cobro se anula y se vuelve a cargar con el cobro, y P33 ya dejó dicho que
>   el negocio cobra por adelantado y no en cuotas. Si algún día aparece una venta
>   en cuotas real, ahí se rediseña ese formulario con el caso a la vista.

### 🧾 La anulación de egresos y ventas · 2026-08-17

El patrón ya existía entero en `pago` y se copió: entidad + `anular()` con las
tres firmas juntas, service con el pre-chequeo de "ya está anulado" (sin él la
segunda anulación pisa al autor de la primera), endpoint, y `PedirMotivo` que salió
de `PagosPagina` a `componentes/` para que las tres anulaciones se expliquen igual.

**Lo que casi sale mal, y es lo único no obvio de toda la tanda:**
`EgresoRepository.porMoneda` sumaba **todos** los egresos del período sin mirar
`anulado` — y estaba bien, porque no se podían anular. En cuanto se pudo, sin
agregarle la condición **anular deja de sacar el monto del balance y la caja miente
sin ningún error a la vista**. Lo que lo hacía fácil de pasar por alto es que la
mitad de los ingresos ya lo hacía bien (`EstadoPago.ENTRARON`), así que la caja
*parecía* contemplar anulaciones. Lo pinea
`CajaTest.un_egreso_anulado_deja_de_estar_en_la_caja`.

**Una decisión más:** no se anula una venta que todavía tiene su cobro vivo —
primero se anula el pago. Cascadear habría hecho que una acción firmada por una
persona diera de baja una fila firmada por otra. Es el criterio con el que `V6`
protege, del otro lado, el pago que respalda un premaster liberado.

### 💸 La seña se devuelve · `V11`, 2026-08-17

**Decidido por Ignacio: si se cancela una reserva, la seña se devuelve.** Era lo
único que faltaba para poder terminar de escribir la regla, y `V10` lo había
anotado como *"una decisión del Módulo 3 sobre devoluciones"*.

**La regla completa queda: toda reserva que OCUPA SU FRANJA tiene dinero detrás.**
Parece la excepción por estado que §13 rechazó y no lo es: §13 rechazó *"salvo que
esté vacía"* y *"salvo que sea una clase"* —dos categorías inventadas para esta
regla sola—, mientras que `NOT IN ('CANCELADA','REPROGRAMADA')` es la **definición
canónica de `V1`** que ya usan el EXCLUDE de solapamiento, los triggers de bloqueo,
el de "nadie en dos salas a la vez" y el informe de uso. Es la sexta vez que se
aplica. Y la prueba de que es la lectura correcta: **con la otra, cancelar sería
imposible** — la base te obligaría a no devolver nunca, decidiendo por su cuenta
una política comercial que el cliente decidió al revés.

**Tres triggers, tres momentos, y el momento es lo que se pensó:**

| Cuándo | Momento | Por qué |
|---|---|---|
| INSERT de `reserva` (`V10`) | **Diferido** | Al insertar, su participante todavía no existe |
| UPDATE de `pago` (`V11`) | **Inmediato** | Ya existe todo lo que hay que mirar; diferirlo convertiría el 409 con el texto del trigger en un 500 al cerrar |
| UPDATE de `reserva` (`V11`) | **Inmediato** | Ídem. Es el esquive: cancelo, me devuelven la seña, y descancelo |

El orden natural queda **cancelar primero, devolver después**; al revés el trigger
lo rechaza y el mensaje dice qué hacer. Y `ReservaService.cambiarEstado` llevó un
`flush()` explícito, para que el trigger inmediato hable en el request y no
depender del flush incidental de una consulta ajena.

### 🕳️ Y un agujero de `V10` que se encontró el mismo día · `V12`

**Se conseguía el horario anotando una deuda.** `V10` escribió la condición del
dinero como `estado_pago <> 'ANULADO'`, que se lee como "el pago sigue vigente" y
no lo es: `DEBE` y `VENCIDO` también son distintos de ANULADO, y son **plata que se
esperaba y no llegó**. `V11` heredó la condición al extraer la función compartida.
Se comprobó sobre el esquema andando: una reserva de alquiler con un único `pago`
en `DEBE` pasaba el chequeo.

La definición correcta ya existía y tiene nombre: **`EstadoPago.ENTRARON` =
(SENADO, PAGADO)**, la misma que usan `cajaPorMoneda`, `cobradoPorInscripcion` y
`ventasConPago`. Era la cuarta consulta que necesitaba esa lista y la única que la
escribió de otra forma — y el comentario de `ventasConPago` advertía textualmente
contra hacer justo eso.

**La lección, que es la que conviene llevarse:** una lista de estados escrita "por
lo que queda afuera" (`<> 'ANULADO'`) parece la misma que la escrita por lo que
entra, y no lo es. Cuando exista un nombre para el conjunto —acá lo había— hay que
usarlo. Lo pinean los casos 133-136 de la suite de reglas.

> **Lo que la seña le cambió al calendario, por si lo tocás:** el alta ya no crea
> una reserva vacía. Una **clase** entra con su alumno y su inscripción; un
> **alquiler o una grabación** entran con su seña. Los dos campos son opcionales en
> el DTO y ninguno lo es en la práctica — el que corresponde según el tipo de uso
> lo exige la pantalla, y el que falte lo rechaza `V10` al COMMIT. La base de desarrollo tiene datos de ejemplo pero **`pago` está vacía** —
ninguna pantalla podía crear filas hasta hoy—, así que Caja, Deudores y Estado
de cuenta arrancan en cero hasta que cargues algún pago desde `/admin/pagos`.

> **Dos cosas que esta sesión aprendió a los golpes y conviene no repetir:**
>
> - **Un módulo no está cerrado porque las dos mitades tengan tests.** El Módulo
>   2 se dio por cerrado con el backend probado y el front probado, y **no se
>   podía anotar a nadie en una clase**: el endpoint existía, la pantalla no lo
>   llamaba, y ningún caso cruzaba el puente. Antes de cerrar un módulo,
>   preguntá de dónde sale el primer dato de cada tabla que toca.
> - **Mirá `platform.md` §13 antes de decir que algo está bloqueado.** Pasó otra
>   vez: los cinco pendientes de §6 figuraban abiertos y tres ya estaban
>   contestados. Van cuatro veces que este proyecto pierde tiempo con lo mismo.

---

**El Módulo 2 está cerrado** (2026-08-16): backend, sus **cuatro pantallas**
—`/admin/reservas`, `/admin/bloqueos`, `/admin/uso-salas`— y **anotar alumnos en
una clase**, que faltaba y se detectó tarde. La seña se movió al Módulo 3.

**Las dos pantallas que faltaban, en corto:**

- **`/admin/bloqueos`** — sacar una sala de servicio. Lo caro de esta pantalla
  no es cargarla, es **cómo se lee**: una fila es *una franja horaria que se
  repite todos los días del rango*, no un intervalo continuo. Es la lectura que
  `V6` perdió y `V7` tuvo que rescatar en la base, y la pantalla la dice con
  todas las letras ("09:00 a 13:00, **todos los días**"). El día entero es el
  default y las horas ni se muestran hasta pedirlas.
- **`/admin/uso-salas`** — cuánto se usó cada sala, con desglose por tipo de
  uso. **Una sala sin uso sale en cero, no desaparece**: el cero es justo el
  número que se viene a buscar. Lo cancelado y lo reprogramado se cuentan aparte
  y **no suman horas** — una sala con veinte clases dictadas y una con veinte
  canceladas no se usaron igual.

**Lo que trajo el Módulo 3 desde acá:** la seña (DB-04a / P8), que es **la
última regla del sistema que vive en un documento y no en el código**. La ficha
completa está en `platform.md` §13 y la herramienta, en la cabecera de `V9`.

### 💰 Módulo 3 — Pagos · empezado el 2026-08-16, **cerrado el 2026-08-17**

**Backend completo** (`backend/pago`) y **cinco de sus seis pantallas**:
`/admin/pagos`, `/admin/estado-de-cuenta/:idUsuario`, `/admin/caja`,
`/admin/deudores` y `/admin/egresos`. Suites al empezar el módulo: **278 backend,
210 front**; al cerrar la seña quedaron en **288 · 217 · 127 + 50**.

**Lo primero que se hizo fue revisar los cinco pendientes de §6, y ninguno
bloqueaba.** Tres ya estaban contestados —P12 en §13, P15 en `V6`/`V7`, P16 en
un comentario de `V1`— y esa lista no se había actualizado; P14 no cambia lo que
hay que construir. **El único abierto de verdad es P13 (la lista de precios), y
§13 ya había decidido cómo seguir sin él.** Es el mismo patrón que con P11 y que
con los diez hallazgos que la auditoría listó como trabados: la respuesta estaba
escrita en otro lado. Los cuatro quedaron tachados en §6 y en el índice.

**Tres decisiones que no se leen del esquema:**

- **`Moneda` se mudó a un paquete `dinero`.** El archivo tenía escrito que se
  mudara *"cuando exista el segundo usuario"*, y el segundo usuario apareció con
  `pago` y `egreso`. Copiarla habrían sido dos enums que se separan el día que
  alguien agregue una tercera moneda.
- **Nunca se resta entre monedas** (§2.3). Un curso en pesos con un pago en
  dólares no tiene saldo: tiene dos renglones. Vale para el estado de cuenta, la
  caja y los deudores.
- **La antigüedad de una deuda se cuenta desde el renglón más viejo** (`MIN`, no
  `MAX`). Con `MAX`, anotarle una cuota nueva a quien debe hace dos meses le
  rejuvenecería la deuda a cero días.

**Y un hueco del esquema que apareció leyendo:** `pago.id_usuario` y
`pago.id_inscripcion` son dos columnas sueltas y **ninguna FK las ata**. Se
podía acreditar el pago de Juan contra el curso de Ana y las dos cuentas
quedaban mal en silencio. Lo tapa `PagoService`; es el mismo hueco que `V1` §8.2
tapó del lado de las clases, con un trigger.

**Dos cosas que encontraron los tests:**

1. **El mismo importe se serializaba de tres formas.** Recién creado salía
   `90000` (el `BigDecimal` del JSON del pedido, escala 0), releído de la base
   `90000.00`, y las sumas agregadas traían una tercera. Para el front son tres
   formatos para la misma cosa. Se normaliza en `dinero/Importe.java`.
2. **Anular no escribía hasta el commit**, así que la respuesta describía una
   fila que la base todavía no había aceptado y `pago_anulacion_justificada`
   hablaba al final de la transacción. `flush()` en las dos excepciones.

**Cerrado el 2026-08-17** con la seña (`V10`) y la **venta de equipos**
(`/admin/ventas`). Tres cosas de esa última pantalla que no se leen del esquema:

- **No es un inventario.** No hay stock propio —se vende contra el de Pioneer
  (§1)— así que no hay unidades que descontar ni artículos que dar de alta antes
  de venderlos: es el registro de una operación que ya pasó.
- **El comprador puede no tener cuenta**, y por eso el formulario tiene los dos
  caminos en vez de obligar a crear un usuario. Es la contracara de `usuario` como
  raíz: tener cuenta y ser cliente son cosas distintas. Lo que **sí** exige una
  cuenta es el cobro, porque `pago.id_usuario` es NOT NULL — la pantalla lo dice
  antes en vez de mandar un pedido que la base rechaza.
- **El listado marca lo que falta, no lo normal:** una venta sin cobrar se señala
  y una cobrada no lleva etiqueta. Una venta sin cobrar que no se ve es una venta
  que nadie reclama.

### ⚠️ Un agujero del Módulo 2 que se tapó el 2026-08-16

**Se lo había dado por cerrado y no se podía anotar a nadie en una clase.** El
backend expone `POST /api/reservas/{id}/participantes` desde que se construyó el
módulo, pero **ninguna pantalla lo llamaba** — `administracion.ts` ni siquiera
tenía la función. Consecuencia en cadena: no se podía tomar lista, las clases
restantes nunca bajaban de las contratadas, y el historial del alumno iba a estar
vacío para siempre. Ahora está en el detalle de la clase, en el calendario.

**Cómo se coló:** el backend tenía su test (`ReservaTest` anota participantes por
la API) y el front tenía el suyo (la grilla dibuja participantes y toma lista),
pero **ningún caso cruzaba los dos**: nadie preguntó *de dónde sale el primer
participante*. Cada mitad probaba su lado de un puente que no existía.

### ⛔ La seña (`V10`) tiene un problema de diseño, no de implementación

**§13 asume que la reserva y su pago entran en la misma transacción**, y el
Módulo 2 **no** se construyó así: el alta crea la `reserva` sin participantes, y
la gente se anota después, en otro pedido. Está decidido y escrito así en
`AltaReservaRequest` —*"cargar la reserva y anotar a la gente son dos gestos
distintos también en la pantalla"*—.

Entonces un `CONSTRAINT TRIGGER … DEFERRABLE` que al COMMIT exija dinero detrás
de la reserva **rechaza todas las altas de clase**: en ese momento no hay
participante, y por lo tanto no hay inscripción que la cubra ni pago que la
apunte. Las tres salidas posibles, para decidir antes de escribir nada:

1. **Que el alta de una clase cree la reserva y su participante juntos.** Es la
   que respeta §13 tal como está escrita, y cambia el flujo del calendario.
2. **Que el trigger corra al anotar al participante, no al crear la reserva.**
   Deja existir una reserva vacía sin plata detrás, que en la práctica es un
   horario apartado — y eso puede ser exactamente lo que Micaela hace.
3. **Que la seña se exija solo a los usos que no son clase** (alquiler,
   grabación), donde el pago sí apunta a la reserva y no hay inscripción de por
   medio.

**✅ Se eligió la 1 el 2026-08-16** (Ignacio, y coincide el análisis): **se
adapta el flujo, no la regla.** Las otras dos convierten la invariante en
condicional —*"toda reserva tiene plata detrás, salvo que esté vacía"* / *"salvo
que sea una clase"*— y una regla con excepciones que dependen del estado es la
que después nadie sabe si se está cumpliendo. Esta regla existe justamente
porque el cliente dijo que **no hay excepción** (P8).

La ficha completa, con el orden de implementación, está en
[`platform.md` §13](requirements/platform.md) bajo *"P8 / DB-04 — La seña"*.
**Empezá por ahí, no por la migración.**

### ⏭️ Lo próximo, concreto

Los tres pasos, en este orden y ninguno antes que el anterior:

1. **✅ HECHO el 2026-08-17. `AltaReservaRequest` acepta una lista de
   participantes opcional**, y `ReservaService.alta` los inserta en la misma
   transacción. Opcional: un alquiler de cabina no tiene participantes y su plata
   llega por `pago.id_reserva`. `agregarParticipante` y el alta comparten un solo
   `ReservaService.anotar` — las reglas que se disparan al anotar son de la base y
   no distinguen por dónde se entró. 5 casos nuevos.
2. **✅ HECHO el 2026-08-17. El alta del calendario carga alumno + inscripción
   junto con la clase.** El selector salió de `FormularioParticipante` a un
   `useParticipante`, que ahora usan los dos formularios. **Solo pide alumno si el
   tipo de uso es clase y solo en el alta**: una grabación de set no tiene a quién
   anotar, y mover una reserva no toca participantes. 5 casos nuevos.
   > **Y el paso 2 destapó el mismo agujero que el 2026-08-16:** `altaReserva`
   > estaba mockeado y **ningún caso lo ejercía** — el formulario de alta no tenía
   > una sola prueba que lo enviara. Van dos veces que aparece el mismo patrón en
   > este módulo. Los cinco casos nuevos cruzan el puente.
3. **✅ HECHO el 2026-08-17. `V10__sena_obligatoria.sql`**, el `CONSTRAINT TRIGGER
   … DEFERRABLE INITIALLY DEFERRED` sobre `reserva`. **La seña ya no vive en un
   documento: vive en la base.**

### ✅ La seña, cerrada el 2026-08-17 — y lo que costó de más

La migración en sí es corta. Lo caro fue todo lo demás, y son cuatro cosas que
conviene no volver a descubrir:

1. **Un trigger diferido no se dispara en una transacción que se revierte.**
   `ReservaTest` es `@Transactional`, así que `V10` habría quedado **escrita y sin
   verificar, con la suite en verde** — el peor resultado posible. Se fuerza con
   `SET CONSTRAINTS reserva_con_sena IMMEDIATE` después de un `flush()`. El
   `flush()` no es opcional: sin él no hay nada encolado y el caso pasa sin haber
   probado nada.
2. **Las suites SQL tienen el problema espejo.** psql está en autocommit, así que
   cada `SELECT probar(...)` es su propia transacción y el trigger salta **afuera**
   del `EXCEPTION` de `probar()`, llevándose puesto el `INSERT INTO _resultado`. El
   caso no falla: *desaparece del resumen*. **Se midió en vivo:** al aplicar `V10`
   sin tocar nada, la suite adversarial pasó de 50 casos a 44 y **8 casos
   acusaron *"EL AGUJERO VOLVIO"* sobre reglas intactas**. Un resultado peor que un
   fallo: uno que apunta al lugar equivocado.
3. **Se adaptaron 21 sentencias** (opción A, decidida con Ignacio): toda reserva
   que sobrevive al COMMIT entra con su pago en un CTE, vía una función `sena()`
   que cada suite define en su semilla. El CTE tiene la reserva adentro y el
   `SELECT` final afuera **a propósito**, para que el ROW_COUNT que ve `probar()`
   siga saliendo de la reserva y la regla de "un `'ANDA'` tiene que afectar filas"
   siga en pie. Los `'FALLA'` no se tocaron: los rechaza un EXCLUDE o un trigger
   `BEFORE` antes del COMMIT, así que no dejan fila.
4. **⚠️ Y lo que casi se escapa: `V10` dejaba incargable la mitad del calendario.**
   Una clase la cubre la inscripción del alumno, pero **un alquiler de cabina o una
   grabación de set no tienen inscripción ninguna**: su plata es un `pago`
   apuntando a la reserva, y un pago no puede apuntar a una reserva que todavía no
   existe. Sin resolverlo, el alta de todo lo que no es clase se rechazaba al
   COMMIT. La salida es simétrica al paso 2: **`AltaReservaRequest` acepta también
   una `sena`**, `ReservaService` la delega en `PagoService.registrar` con el
   `id_reserva` recién creado, y la pantalla la pide cuando el tipo de uso no es
   clase. Entra como `SENADO`, que es el estado que existe justamente para esto.

**Cómo quedó la regla**, para no tener que leer la migración: ninguna `reserva`
existe sin dinero detrás, verificado al COMMIT, y el dinero llega por **dos
caminos que cuentan igual** — un `pago` apuntando a la reserva, o la inscripción
del participante. Un pago `ANULADO` no cuenta. La **única** excepción es
`MIX_MASTERING`, y va por `tipo_uso.codigo` y no por estado de la fila.

**Hueco deliberado, documentado en la cabecera de `V10` al estilo de `V6` y `V7`:**
el trigger corre **solo al INSERT de `reserva`**, así que la invariante se
establece al crear y se puede romper después anulando el pago. Cerrarlo es una
decisión del Módulo 3 sobre devoluciones —anular para corregir y anular para
quedarse sin seña son el mismo UPDATE— y no de esta migración.

**El 50% sigue sin verificarse en la base, y no es un olvido:** `reserva` no tiene
precio, porque el de un alquiler sale de las horas por una tarifa que no está en el
sistema (P13). Esa mitad la sostiene la pantalla hasta que exista.

**Y lo otro que le falta al Módulo 3 no depende de esto:** la sub-sección de
venta de equipos.

**El calendario, en corto:** días en columnas y horas en filas, con filtro por
sala. El alcance pedía salas en columnas; con tres salas entraba, pero la vista
quedaba de un día y lo que hay que ver para no pisarse es la semana. La sala va
dentro de cada bloque y el filtro da la vista "la semana de la Sala 1". Un clic
en un hueco abre el alta con esa fecha y esa hora puestas.

> **Corregido el 2026-08-16 (segunda pasada).** La primera versión de la grilla
> se veía como si **no dejara cargar más de una reserva por día**. No era el
> backend —la API acepta las dos, hay caso— sino dos defectos de la pantalla que
> se sumaban, y los dos fallaban **en silencio**:
>
> - **Una celda era un día por una hora, pero adentro hay tres salas.** Con
>   cualquier sala ocupada, la celda dejaba de ofrecer el alta: no había forma de
>   cargar la Sala 2 a las 10:00 si la Sala 1 ya estaba tomada. Ahora la celda se
>   cierra solo cuando **no queda ninguna sala libre a esa hora**, y cuando queda
>   una sola, viene puesta en el formulario —la misma idea que `permitidos` con
>   la matriz de §2.6: no ofrecer lo que la base va a rechazar—.
> - **Una clase de 1:30 se dibujaba solo en la fila donde arranca.** La de
>   10:00–11:30 dejaba la fila 11 con pinta de libre, y esa celda ofrecía una
>   franja que el EXCLUDE iba a rechazar. Ahora la reserva se dibuja en **todas**
>   las filas que ocupa: entera en la suya, y como continuación (`↳ Sala 1 ·
>   sigue`) en las demás. Es el mismo principio que ya sostenía `filasDeHoras` —
>   una reserva que existe y no se ve es el peor error del calendario—, aplicado
>   al eje que faltaba.
>
> Y una tercera, de React, que es la que más se parecía al síntoma reportado:
> **el formulario de alta no se reapuntaba.** Con el formulario abierto, clickear
> otro hueco cambiaba el estado pero no la pantalla —`useState` solo corre su
> inicializador al montar—, así que al guardar se volvía a apuntar a la franja
> del primer clic y la base rechazaba por solapamiento. Se arregla con un `key`
> por franja; el de edición tenía el mismo agujero y lleva `key` también.
>
> El hueco pasó de ser un `onClick` sobre el `<div>` de la celda a un `<button>`
> con nombre accesible (`Cargar reserva el 24/08 a las 15:00`), que además se
> puede alcanzar con el teclado. Los tres defectos quedan fijados por tests
> (`CalendarioPagina.test.tsx`, front **103 → 110**).

**Cuatro decisiones se cerraron el 2026-08-16** y están en `platform.md`:
P7 (las clases se cargan **a mano**, no se generan), P37 (una clase **no** exige
profesor asignado), DB-11 (hecho) y la seña (**pasa al Módulo 3**).

**No hay ninguna decisión tuya pendiente.** La auditoría se cerró el 2026-08-15
con el backlog en cero, y las cuatro preguntas que quedaban de producto se
contestaron el 2026-08-16.

### 📋 Qué pasó el 2026-08-16 (fue un día largo)

Se cerró el Módulo 1 entero y casi todo el Módulo 2. En orden:

| # | Qué se hizo | Dónde |
|---|---|---|
| 1 | **`inscripcion`, backend** — alta, listado con 4 filtros, edición, estado, clases restantes calculadas | `backend/inscripcion` |
| 2 | **Pantalla de inscripciones** + `GET /api/profesores`, que faltaba para poder asignar profe | `/admin/inscripciones` |
| 3 | **Filtro por disciplina y nivel** en el listado de alumnos, y la columna "Cursa" | `AlumnosPagina` |
| 4 | **Perfil del alumno** | `/admin/alumnos/:id` |
| 5 | **Módulo 2, backend** — salas, tipos de uso, reservas, participantes, toma de lista | `backend/reserva`, `backend/sala` |
| 6 | **Calendario semanal** | `/admin/reservas` |
| 7 | **Tres arreglos de la grilla** (ver el recuadro de arriba) | `CalendarioPagina` |
| 8 | **Bloqueo de sala**, backend y pantalla | `backend/sala`, `/admin/bloqueos` |
| 9 | **Historial de uso por sala** | `GET /api/reservas/uso`, `/admin/uso-salas` |

**Las suites pasaron de 108 → 229 (backend) y de 55 → 139 (front).** Las dos SQL
siguen en 121 y 50.

**Tres cosas que salieron mal cerrando el Módulo 2, todas de Hibernate y todas
la misma familia:**

1. **`@Column(insertable = false)` no alcanza para devolver un DEFAULT de la
   base.** Hibernate no relee la columna después del INSERT, así que el alta de
   un bloqueo contestaba con `fechaRegistro` en null. Va con
   `@Generated(event = INSERT)`. Las otras cuatro entidades con sello de carga
   tienen el mismo `insertable = false` y **no** están rotas: ninguna lo expone
   en un DTO, por eso nunca se notó.
2. **Los INSERT van antes que los UPDATE** (otra vez). Cancelar una clase y
   bloquear la sala en la misma transacción rechazaba el bloqueo por la clase
   recién cancelada: el trigger lee SQL, no la sesión. `BloqueoSalaService.alta`
   hace `flush()` antes de insertar.
3. **Y los DELETE van al final, después de los INSERT** — la mitad que faltaba.
   Desbloquear y cargar la clase que estaba esperando, en la misma transacción,
   insertaba la reserva con el bloqueo todavía en la base. `eliminar` hace
   `flush()` después de borrar.

**Decisiones que tomó Ignacio ese día**, todas escritas en `platform.md`:

- **P7 — las clases se cargan a mano, de a una.** Se descartó que el sistema
  generara las ocho semanales al inscribir, que era la recomendación del propio
  documento. El costo queda anotado: 8 cargas por alumno y ~80 alumnos en
  diciembre. Agregar la generación después es barato; sacarla no.
- **P37 — una clase no exige profesor asignado.**
- **La seña pasa al Módulo 3.** Su trigger necesita un `pago` que ningún módulo
  puede crear todavía; activarlo ahora dejaba sin poder cargar alquileres de
  cabina.
- **El filtro por disciplina mira las inscripciones vigentes** (`ACTIVA` +
  `PAUSADA`), y quien cursa dos disciplinas aparece en las dos listas.

**Cuatro cosas que salieron mal y conviene no repetir:**

1. **`npx tsc --noEmit` no chequea nada acá.** El `tsconfig.json` raíz es un
   archivo de solución (`files: []`), así que sin `-b` no tiene entrada y sale 0
   siempre. Se usó como verificación durante horas y era humo. **Usar `npx tsc -b`.**
2. **Hibernate ordena los INSERT antes que los UPDATE.** Rompía la reprogramación
   al correr una clase una hora. `ReservaService` hace `flush()`; hay test.
3. **Una consulta nativa vacía la sesión entera; una JPQL no.** Al convertir
   `contarClasesConsumidas` a JPQL, un 409 se volvió 200 en silencio. Arreglado
   con `InscripcionService.empujarALaBase()`, no volviendo atrás.
4. **Un `catch` que muestra el error y después recarga, borra el error.** `cargar()`
   arranca con `setError(null)`. Hay que recargar primero y mostrar después.

**Y una corrección al propio plan:** este documento avisaba que `inscripcion`
obligaba a refactorizar `alumno.disciplina` y `alumno.nivel_actual`. **No
existían** — `V1` ya decía en un comentario que viven en `inscripcion`. El aviso
le sobrevivió a la decisión.

### 🟢 Para verificar que arrancás en verde

```
cd apps/backend && mvn test          # 278
cd apps/platform && npm test         # 231
cd apps/platform && npx tsc -b       # NO `--noEmit`
./scripts/pruebas-sql.sh             # 127 + 50
```

**Para ver el sistema andando** hacen falta los tres, en este orden:
`docker compose up -d`, `mvn spring-boot:run` en `apps/backend`, y
`npm run dev:platform`. Entrás por **http://localhost:5173** con
`admin@lajuanita.local` / `lajuanita2026`.

> **Hay datos de ejemplo cargados en la base de desarrollo**, todos con email
> `demo-*@lajuanita.local`: dos profesores, cinco alumnos, seis inscripciones y
> unas clases dictadas. Están elegidos para que se vea cada regla — alguien que
> cursa dos disciplinas, uno con el curso terminado, uno pausado, y un alumno sin
> nada. Se borran con un `DELETE ... WHERE email LIKE 'demo-%'` o con
> `docker compose down -v`.

### Estado real

| | |
|---|---|
| **Fase 0** | ✅ cerrada y auditada (§6, §4b) |
| **Módulo 1 — Alumnos** | ✅ **cerrado**, y el perfil pasó de 2 a **5 de sus 6 bloques** al llegar los módulos 2 y 3. El sexto espera el Módulo 5 |
| **Módulo 2 — Horarios y salas** | ✅ **cerrado** (2026-08-16). Backend, sus cuatro pantallas y **anotar alumnos en una clase**, que faltaba. La seña se fue al Módulo 3 |
| Módulo 3 — Pagos | ✅ **CERRADO el 2026-08-17.** Las seis pantallas, la seña (`V10`) y la venta de equipos |
| Módulos 4 a 8 | ⬜ sin empezar |
| **Landing** | ✅ terminada como sitio. No se publica hasta conectar los formularios |
| **Auditoría** | ✅ **CERRADA el 2026-08-15.** 56 de 56, backlog en cero |

**Qué anda hoy:** login, registro público, alta por administración con contraseña
temporal, cambio obligatorio de contraseña, listados de personas y de alumnos con
buscador, alta y baja lógica, la matriz de permisos por los cuatro roles impuesta
en el backend, y **el módulo de inscripciones completo** — alta, listado con
cuatro filtros, edición, cambio de estado, clases restantes y su pantalla.

**Las suites al cierre del día:** 192 casos en el backend, 103 en el front, más
las dos SQL (121 + 50). *(Este bloque describe el Módulo 1; los números son del
proyecto entero.)*

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

### ✅ Módulo 2 — el backend, cerrado el 2026-08-16

Salas y tipos de uso (`/api/salas`, `/api/tipos-uso`, con la matriz de §2.6),
reservas (`/api/reservas`: agenda por rango, alta, edición, cambio de estado) y
participantes (anotar y tomar lista). **33 casos** en `ReservaTest`; la suite del
backend pasó de 159 a 192.

**Casi ninguna regla del módulo está en Java, y ese es el punto.** El
solapamiento lo impide un EXCLUDE, la combinación sala×uso una FK compuesta, los
bloqueos y "nadie en dos salas a la vez" unos triggers. Lo que `ReservaTest`
verifica no es que las reglas existan —para eso están las suites SQL— sino que
**lleguen a la pantalla** con el estado HTTP correcto y un mensaje legible. Una
regla que la base cumple y que sale como 500 no sirve.

**Tres cosas que vive en el servicio porque la base no puede hacerlas:** declarar
el autor de una edición (`V7` lo exige y solo lo sabe la aplicación), acotar el
rango de la agenda, y cerrar el círculo de la reprogramación.

**Dos hallazgos del orden de escritura de Hibernate**, los dos encontrados por
tests y los dos con la misma raíz:

- **Hibernate ordena los INSERT antes que los UPDATE.** Al crear una recuperación,
  la reserva nueva se insertaba mientras la original todavía figuraba ocupando su
  franja, y el EXCLUDE la rechazaba. No se nota moviendo una clase a otra semana;
  se nota **corriéndola una hora**, que es el caso más común. `ReservaService`
  hace `flush()` antes de insertar, y hay un test que lo pinea.
- **Una consulta nativa vacía la sesión entera; una JPQL no.** Al pasar
  `contarClasesConsumidas` a JPQL, el índice único de "una inscripción activa por
  disciplina" dejó de hablar durante el pedido y la reactivación devolvía 200. El
  arreglo no fue volver atrás sino dejar de depender de un efecto colateral:
  `InscripcionService.empujarALaBase()`, con el porqué escrito.

### ✅ El calendario — hecho el 2026-08-16

`/admin/reservas`. Grilla semanal, navegación entre semanas, filtro por sala,
detalle de cada reserva con sus participantes y toma de lista, alta y "mover".
16 casos propios; la suite del front pasó de 87 a 103.

**Dos cosas que se pueden romper en silencio, y por eso tienen tests aparte** en
`componentes/semana.ts`:

- **Una reserva fuera del horario del estudio se dibuja igual.** Las filas
  arrancan en 10–18 (§13, P11) pero se estiran para cubrir lo que haya. Una
  reserva que existe y no aparece es el peor error posible acá: nadie reporta lo
  que no ve, y el resultado son dos personas en la misma sala.
- **Ninguna fecha pasa por UTC.** `new Date('2026-08-16')` se interpreta como UTC
  y en Argentina devuelve el día anterior; todas las cuentas componen el `Date`
  por partes. Un calendario corrido un día no avisa.

### Lo próximo: las otras dos pantallas del Módulo 2

- **Bloqueo de sala.** `bloqueo_sala` existe desde `V1` —con sus dos triggers y
  el EXCLUDE que `V7` arregló— y **no tiene endpoint todavía**. Es lo más chico
  que queda del módulo.
- **Historial de uso por sala y período.** La agenda ya acepta `idSala` y
  `incluirCanceladas`; falta la pantalla que lo presente como reporte.

Después de eso, el **Módulo 3 — Pagos**, que además se lleva dos deudas anotadas:
la **seña** (la única regla del sistema que todavía vive en un documento) y el
filtro por estado de pago del listado de alumnos.

### Referencia: cómo se planteaba el Módulo 2 antes de empezarlo

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
./scripts/pruebas-sql.sh        # 127 + 50, sobre 10 migraciones
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
