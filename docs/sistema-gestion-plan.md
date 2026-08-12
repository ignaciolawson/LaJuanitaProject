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

✅ **Fase 0 cerrada el 2026-08-11.** Hay un sistema que todavía no hace nada útil, pero
**al que entrás con tu mail y tu contraseña**. De ahí en adelante cada módulo es repetir
un patrón que ya funciona: el que dejó `AutenticacionTest` (DTO como `record` +
servicio transaccional + `ProblemDetail` para los errores + test del endpoint contra la
base real).

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
- **El secreto de firma está commiteado** (con aviso por log y bloqueo si hay perfil
  de producción). Hay que definir `JWT_SECRET` en el deploy de diciembre.
- **Todavía no hay ninguna autorización por rol en el backend**, solo "estar
  autenticado" — porque aún no existe ningún endpoint de administración que
  restringir. `@EnableMethodSecurity` ya está activo y las autoridades `ROLE_*` están
  probadas, así que el primer `@PreAuthorize` del módulo de alumnos va a funcionar.
  Hasta entonces, que el menú esconda una sección **no** protege nada.
- El **primer login del alumno** (P18) sigue sin resolver: hoy solo existe la cuenta
  sembrada. Es lo primero que pide el módulo de alumnos.

**Luego, por orden de valor:**

1. **Alumnos** — reemplazo directo del Notion de Micaela; lo más demostrable.
2. **Salas + reservas + calendario** — el corazón operativo, donde más se nota el dolor
   del relevamiento.
3. **Pagos** — se apoya en el anterior. El schema ya tiene las FKs opcionales para saber
   qué salda cada pago.
4. **Portales alumno y profesor** — recién acá tienen sentido: muestran lo de 1/2/3.
5. **Mix & Mastering, sello, dashboard** — los tres más "aparte", los que Ghezz maneja
   hoy en planillas sueltas.

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
