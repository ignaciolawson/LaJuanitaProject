# Informe de ciberseguridad — La Juanita Studio, septiembre 2026

> **Alcance:** monorepo completo (`apps/backend`, `apps/platform`, `apps/landing`),
> 36 migraciones, 28 controllers, 147 mappings. **Estática**: se leyó el código y
> se midió la configuración; no se probó con dos cuentas contra la aplicación
> levantada. Lo que sólo se podía afirmar en caliente está en *No verificado*.
>
> El estado paso a paso, con la evidencia de cada verificación, está en
> [`barrida-ciberseguridad-2026-09.md`](barrida-ciberseguridad-2026-09.md). El
> encargo es `prompt-ciberseguridad-lajuanita.md`, en la raíz del repo.

---

## 1. Resumen ejecutivo

El sistema está **mejor de lo que un proyecto de este tamaño suele estar**, y los
siete hallazgos lo dicen tanto como las verificaciones: **no hay inyección SQL
posible** —no queda un solo lugar donde se arme SQL en runtime—, **el IDOR está
tapado** en los siete endpoints del portal que reciben un id, **el manejo de
archivos es correcto de punta a punta**, y **la matriz de permisos se sostiene en
los 147 mappings** sin una sola escritura protegida por una regla de lectura.

**Las nueve fases están cerradas.** **Ninguno de los siete hallazgos es
explotable hoy contra el sistema como está corriendo en desarrollo.** Dos son Altos y **los dos aparecen recién al
desplegar**, que es exactamente para lo que esta barrida se hizo antes del deploy
de octubre.

**Lo más importante es `CS-03`**: el candado que impide firmar tokens con el
secreto público **falla abierto en el artefacto que se despliega**, porque el
permiso que debería quedarse en el repo viaja adentro del jar. Se confirmó
empaquetando. Olvidar una variable de entorno alcanza para que cualquiera que lea
el repositorio fabrique un token de ADMIN. **Bloquea el deploy y se arregla con
una línea en un `Dockerfile` que todavía no existe.**

Después va **`CS-01`**: la contraseña temporal —que viaja por WhatsApp y vale 7
días— abre **los 32 endpoints del portal** y no los dos que su propia
documentación promete. Los otros cinco son deuda de despliegue y de cumplimiento.

**Cinco de los siete se arreglan en archivos que todavía no se escribieron**
—el `Dockerfile`, el `docker-compose.prod.yml` y la configuración del proxy—, así
que el momento de resolverlos es ahora, mientras siguen siendo gratis.

---

## 2. Conteo por fase y severidad

| Fase | Crítico | Alto | Medio | Bajo | Info |
|---|:--:|:--:|:--:|:--:|:--:|
| 1 · Autenticación y sesión | — | **1** | — | — | — |
| 2 · Autorización e IDOR | — | **1** | — | — | — |
| 3 · Archivos | — | — | — | — | 1 |
| 4 · Inyección | — | — | — | 1 | 1 |
| 5 · Entrada y superficie pública | — | — | **1** | — | — |
| 6 · Transporte y cabeceras | — | — | **1** | — | 1 |
| 7 · Secretos, dependencias y PII | — | — | **2** | — | — |
| 8 · Operación | — | — | **1** | — | — |
| 9 · Fuera de categoría | — | — | — | — | 1 |
| **Total** | **0** | **2** | **5** | **1** | **5** |

---

## 3. Relación con la auditoría de agosto

De los nueve `SEC-nn` de `informe-auditoria-2026-08.md`, **ocho siguen mitigados
y se verificó cada mitigación viva**, no sólo su existencia:

| | Estado en septiembre |
|---|---|
| **SEC-01** · candado del secreto JWT | 🔴 **REGRESIÓN → `CS-03`.** Ver §4.1 |
| **SEC-02** · límite de intentos y registro | ✅ Vivo. Las 4 rutas vigiladas son **exactamente** las 3 públicas + el cambio de contraseña. ⚠️ Pero `CS-04` lo desarma detrás del proxy |
| **SEC-03** · reseteo de contraseña | ✅ Vivo, y sigue pasando por `verificarQuePuedeTocarEstaCuenta` |
| **SEC-04** · un ADMIN podía quitarse el rol | ✅ Vivo, y **las dos mitades**: `UsuarioService:192` (rol) y `:208` (desactivación) |
| **SEC-05** · el front no tenía eje de escritura | ✅ Vivo (`puedeOperar` / `puedeAdministrar` en `menu.ts`) |
| **SEC-06** · el registro confirma el teléfono | ⚠️ **Sigue siendo el único SEC sin bloque de "Remediado"**, y sigue igual. No se reabre: es el mismo trade-off documentado que el del email, que agosto dejó asumido |
| **SEC-07** · CSP y cabeceras | ✅ Vivo en las dos apps. `frame-ancestors` y HSTS siguen correctamente diferidos al proxy |
| **SEC-08** · BCrypt 10 y temporal eterna | ✅ Vivo: `BCryptPasswordEncoder(12)` y vencimiento a 7 días (`V8`). ⚠️ Pero `CS-01` muestra que el estado *"debe cambiarla"* no acota lo que decía acotar |
| **SEC-09** · comodines de `LIKE` | ✅ Vivo (`Busqueda.patron` escapa en el orden correcto). Matiz en `CS-08` |

**Los riesgos que agosto dejó explícitamente asumidos no se reabren** —secreto
commiteado, comparación BCrypt señuelo, `/error` y `/actuator/health` abiertos,
sin CSRF, token en `localStorage`, el registro confirmando el email, y que nada
se borre físicamente—. ⚠️ **Dos de ellos cambiaron de naturaleza y por eso
aparecen acá con otro nombre**: el secreto commiteado dejó de estar contenido por
su candado (`CS-03`), y *"nada se borra"* pasó de ser una virtud del diseño a
tener un costo legal que nadie había nombrado (`CS-06`).

---

## 4. Hallazgos

### 4.1 · 🔴 `CS-03` — El candado del secreto JWT falla ABIERTO en el artefacto desplegado

**Severidad: Alto · BLOQUEANTE DEL DEPLOY · Esfuerzo: XS · Fase 1**

**Evidencia.** `config/SeguridadConfig.java:110-113` justifica el candado así:

> *"el secreto commiteado solo se acepta si alguien lo autorizó explícitamente, y
> ese permiso vive en el `application.properties` del repo — **que es exactamente
> lo que un deploy no copia**."*

Esa última frase es falsa para un jar de Spring Boot. Empaquetado
(`mvn package -DskipTests`):

```
$ jar tf target/backend-0.0.1-SNAPSHOT.jar | grep application.properties
BOOT-INF/classes/application.properties

$ unzip -p ... BOOT-INF/classes/application.properties | grep jwt
lajuanita.jwt.secreto=${JWT_SECRET:QwlFr0vrNFMCnzl24JRPUyKC/bVZ+R9c...}
lajuanita.jwt.permitir-secreto-de-desarrollo=true
```

**Qué pasa hoy.** El permiso viaja adentro del artefacto, así que la rama de
`SeguridadConfig:136-144` no se toma:

| `JWT_SECRET` | `permitir-secreto-de-desarrollo` | Resultado |
|---|---|---|
| definido | presente o borrada | firma con secreto propio — bien |
| **sin definir** | borrada | no arranca — el caso que la defensa busca |
| **sin definir** | **presente (lo que trae el jar)** | **arranca y firma con la clave pública**, con un WARN entre cientos |

**El ataque.** El secreto está commiteado en el repositorio. Con él se firma un
HS256 con cualquier `sub` y se entra como esa persona **sin saber ninguna
contraseña**. Que la autorización relea el rol de la base
(`AutenticacionDesdeBase`) no salva: eso protege contra un claim viejo, no contra
una firma válida — se resuelve el usuario del `sub`, y si es el admin, el
atacante es el admin.

**Por qué es regresión.** SEC-01 criticó el candado anterior con esta frase: *"el
escenario que hay que atrapar es el del que se olvidó de configurar algo, y el
candado exige haber configurado otra cosa"*. El nuevo **exige desconfigurar**
algo. Mismo defecto, signo cambiado. ⚠️ Y el olvido que deja pasar es el
probable: todo el resto del deploy son variables de entorno; **ésta es la única
fila de la tabla del README que además pide editar un archivo versionado**.

⚠️ **La documentación lo empeora.** `operacion.md:358` junta los dos olvidos en
una fila y describe la consecuencia del caso bueno (*"no arranca… falla
cerrado"*), y el párrafo siguiente afirma que *"la primera se descubre sola"*. No
se descubre. **Y la fila de al lado, la de la contraseña de la base, describe su
propio modo de falla con precisión** (*"arranca perfecto… no avisa nada"*): no es
que no supieran pensarlo, es esa fila.

**Recomendación.** El `Dockerfile` del backend **no existe todavía**
(`operacion.md:382-384`), así que esto no toca el repo de desarrollo:

```dockerfile
ENV LAJUANITA_JWT_PERMITIR_SECRETO_DE_DESARROLLO=false
```

Una variable de entorno gana sobre el properties empaquetado: el artefacto viaja
cerrado, un clone fresco sigue arrancando con `mvn spring-boot:run`, y la defensa
deja de depender de que alguien se acuerde de borrar una línea. **Y corregir la
fila de `operacion.md`**, que hoy promete un fallo que no ocurre.

---

### 4.2 · 🔴 `CS-01` — La contraseña temporal abre los 32 endpoints del portal, no dos

**Severidad: Alto · Esfuerzo: S · Fase 2**

**Evidencia.** `config/AutenticacionDesdeBase.java:52-58`:

> *"Al no tener `ROLE_ADMIN` ni ninguno de los otros, no pasa ningún
> `@PreAuthorize` — pero sigue autenticada, así que puede usar `/api/me` para
> saber quién es y `/api/me/password` para arreglarlo. **Justo lo necesario para
> salir del estado, y nada más.**"*

**Qué pasa hoy.** Las dos primeras frases son ciertas; la última no. El catch-all
es `anyRequest().authenticated()` (`SeguridadConfig:220`), **ningún matcher cubre
`/api/me/**`**, y los 32 mappings de ese prefijo no llevan ninguna de las tres
meta-anotaciones. Un token con `ROLE_PASSWORD_PENDIENTE` está autenticado, así
que los alcanza todos. **Quedan 30 alcanzables de más, 11 de ellos de
escritura**:

- **Lee lo suyo**: estado de cuenta (pagos, deudas, saldos), cursos, reservas,
  trabajos de M&M, comprobantes, notificaciones.
- **Escribe lo suyo**: perfil, pedir sala, pedir mover una clase, cancelar
  solicitudes.
- ⚠️ **Si además es profesor**: la lista de sus alumnos con nivel y semáforo, y
  **escribir notas privadas sobre ellos**, fijar seguimiento, subir material y
  cambiarle la visibilidad.

**El impacto, y por qué no alcanza con *"total es su propia cuenta"*.** La
temporal es **deliberadamente una credencial débil**: la genera administración,
la ve Micaela, **viaja por WhatsApp** y vale 7 días. Todo el sentido de
`debe_cambiar_password` es que no valga como acceso real hasta ser reemplazada.
Hoy vale, por siete días, para todo el portal — **y por el tramo `/profesor`
alcanza datos de terceros**: quien intercepte el WhatsApp de un profesor nuevo
lee la lista de sus alumnos y escribe notas privadas sobre ellos, que es
exactamente lo que §8 del alcance protege.

**No es una regresión de agosto.** Agosto encontró que el bloqueo vivía sólo en
el front y que la temporal operaba en **todo** el sistema; la corrección redujo
la superficie a los 32 del portal. Es una mejora real. Lo que quedó es **una
corrección parcial cuyo docstring se declara completa**.

⚠️ **Y los tests la dejan pasar sin estar mal escritos.**
`CredencialVigenteTest.con_password_temporal_sin_cambiar_no_se_puede_operar_ni_por_api`
prueba `GET /api/alumnos` y el alta de alumno: **las dos del eje de
administración**, donde el candado sí funciona. Ninguno de sus dos casos mira los
otros 30, así que el nombre —*"ni por API"*— promete más de lo que prueba.

**Recomendación.** Una regla de ruta antes del `anyRequest()`, **no 32
anotaciones** (el propio Módulo 4 argumentó que *"un alcance que se puede olvidar
no es un alcance"*):

```java
.requestMatchers(HttpMethod.GET,  "/api/me").authenticated()
.requestMatchers(HttpMethod.POST, "/api/me/password").authenticated()
.requestMatchers("/api/me/**").access((auth, ctx) -> new AuthorizationDecision(
        auth.get().getAuthorities().stream().noneMatch(a -> a.getAuthority()
                .equals(AutenticacionDesdeBase.AUTORIDAD_PASSWORD_PENDIENTE))))
```

⚠️ **Por la AUSENCIA de la autoridad y no enumerando los cuatro roles**:
enumerarlos haría de `SeguridadConfig` el **séptimo** lugar a tocar para agregar
un rol, y `CLAUDE.md` ya lleva la cuenta de los seis. Las dos rutas abiertas van
**exactas y no por prefijo** — `/api/me/perfil` también cuelga de `MeController`
y **no** va abierta. Más ampliar el caso de `CredencialVigenteTest` con un
endpoint del portal; `GET /api/me/estado-de-cuenta` es el más elocuente.

> **Remediado el 2026-09-24 (commit `5ca3684`) — RESUELTO.** Tres
> `requestMatchers` en `SeguridadConfig`, antes del `anyRequest()`: las dos
> rutas que sacan del estado van **exactas** y el resto de `/api/me/**` se le
> cierra a quien tenga la autoridad. Se pide **por la ausencia de
> `ROLE_PASSWORD_PENDIENTE`**, no enumerando los cuatro roles. El javadoc de
> `AutenticacionDesdeBase` quedó corregido: hoy su frase vuelve a ser cierta, y
> dice que la otra mitad de la razón vive en `SeguridadConfig`.
>
> **El caso nuevo iba en rojo antes del arreglo** (`expected:<403> but
> was:<200>`) y va en pareja, con la mitad que espera 200 para que un 403 no
> pueda ser un endpoint roto:
> `CredencialVigenteTest.con_password_temporal_sin_cambiar_tampoco_se_abre_el_portal`.
> Suite 777/777, y verde **contra base vacía** (`scripts/pruebas-backend.sh`).

---

### 4.3 · 🟠 `CS-02` — Ningún techo para el cuerpo de un pedido

**Severidad: Medio · Esfuerzo: S + M · Fase 5**

Dos hechos que por separado no molestan: **(1)** el único límite configurado es
el de multipart (`application.properties:146-147`); un cuerpo JSON no tiene
techo, y se deserializa **entero en memoria antes** de que corra un solo `@Size`.
**(2)** 33 de los 103 componentes `String` de los DTOs de entrada no tienen
`@Size`, y sus columnas son `TEXT`.

**El peor caso es público**: `POST /api/solicitantes`. El límite por IP acota
cuántos pedidos, no cuán grandes. **El segundo es de adentro**: un `notas` de
tamaño arbitrario que **no se borra nunca** y crece la base y los backups.

**Recomendación.** El techo va **en el proxy** —`client_max_body_size 15m;`—
porque cualquier chequeo en Java ya pagó la memoria; el 15 deja pasar el
multipart de 13 con aire. Y `@Size` en los 33, para que un texto largo se
rechace con un mensaje en vez de con un 500.

---

### 4.4 · 🟠 `CS-04` — Sin `forward-headers-strategy`, el límite por IP deja de ser por IP

**Severidad: Medio (aplica el día del deploy) · Esfuerzo: S · Fase 6**

`server.forward-headers-strategy` no está configurado, y los dos lugares que
miran quién pide usan `getRemoteAddr()`: `FiltroDeFrecuencia:85` y
`RegistroDeEventos:90`. Detrás del proxy previsto, eso devuelve **la IP del
proxy para todos**.

La consecuencia de auditoría **ya está documentada** (`RegistroDeEventos:82`).
⚠️ **La que no está documentada en ninguna parte es peor: el límite por IP se
convierte en un balde global.** Los 120 por ventana dejan de ser por visitante y
pasan a ser del sitio entero, lo que **da vuelta el control**: quien quiera dejar
a todo el estudio afuera del login sólo tiene que gastar el balde compartido
desde una máquina. **Lo que existe para frenar fuerza bruta pasa a ser el arma.**
Atenúa —y no alcanza— que el límite **por email** siga funcionando, porque la
dirección viene del cuerpo y no de la red.

**Recomendación.** `server.forward-headers-strategy=framework` **más** un proxy
que mande y **sanee** `X-Forwarded-For`. ⚠️ **Las dos mitades juntas o ninguna**:
con la propiedad puesta y un proxy que no sanea, cualquiera elige su IP por
pedido y evade el límite — peor que el problema original. Es tarea del deploy.

---

### 4.5 · 🟠 `CS-05` — Dos dependencias del front con CVE conocida

**Severidad: Medio · Esfuerzo: S · Fase 7**

`npm audit --omit=dev`, 2026-09-24: **`next` 16.3.0** (rango vulnerable
16.0.0–16.3.2; RCE no autenticada en servidores Windows y en la Image
Optimization API con AVIF) y **`sharp` 0.35.3** (vulnerable `< 0.35.4`, libheif).

⚠️ **Baja de Crítico a Medio porque se midió si el repo toca el camino
vulnerable, y en producción no lo toca**: AVIF está deshabilitado
(`next.config.ts:148`, `formats: ["image/webp"]`) y **no hay un solo archivo AVIF
ni HEIC** en `public/`; la RCE de Windows no aplica a un VPS Linux; `sharp` sólo
procesa locales y no hay `remotePatterns`.

⚠️ **Pero hay un camino vivo: la máquina de desarrollo es Windows**, y
`pendientes.md` le indica a Ignacio **exponer el front a la red** (`--host`,
entrar por la IP) para la verificación en dispositivo que quedó pendiente. Eso
pone un Next vulnerable a una RCE no autenticada de Windows escuchando en la
Wi-Fi de la casa.

**Recomendación.** `npm update next sharp` (16.3.6 y 0.35.4) y **rehacer el
lockfile con `python scripts/completar-lockfile.py`**, obligatorio en este repo o
`npm ci` se cae en el runner de Linux. **Antes de la próxima sesión de
verificación en dispositivo.**

> **Remediado el 2026-09-24 (commit `c019f3d`) — RESUELTO.** `next` a 16.3.6
> y `sharp` a 0.35.4 (transitiva, sigue a next). ⚠️ `npm update` no alcanzaba:
> `package.json` fijaba la versión exacta, así que hubo que moverla a mano.
>
> Verificado: `npm audit --omit=dev` pasó de 2 vulnerabilidades a **0**, el
> build de la landing compila y genera sus 27 páginas, y **`npm ci` en
> `node:22` sobre Linux resuelve `@img/sharp-linux-x64` y
> `@next/swc-linux-x64-gnu`** — que es exactamente la trampa del lockfile
> escrito en Windows que hace caer al runner. `completar-lockfile.py`: 0
> faltantes.

---

### 4.6 · 🟠 `CS-06` — Ley 25.326: sin aviso de privacidad ni vía de supresión

**Severidad: Medio · Esfuerzo: S + M · Fase 7** · *Se nombra la obligación, no se
dictamina.*

Cuatro formularios públicos piden **nombre, apellido, email y teléfono** —y desde
`V36`, los mismos datos de hasta dos compañeros, o sea **de terceros que no
completaron nada**—. Un alumno además acumula pagos, deudas, asistencias y notas
privadas de sus profesores.

1. **No hay aviso de privacidad**: no existe página legal en la landing ni
   aparece *privacidad* o *datos personales* en ningún archivo. Los formularios
   no dicen para qué se usan los datos ni qué derechos tiene quien los deja.
2. **No hay forma de suprimir**, y no es un olvido sino **una tensión de diseño
   que nadie escribió**: el esquema no borra nada a propósito —y por buenas
   razones— y `solicitante` lo lleva al extremo con un trigger que rechaza todo
   DELETE (`V20` §3). La salida que ofrece es `DESCARTADO`, que es **un estado,
   no una supresión**. Que borrar una ficha en desarrollo haya exigido **apagar
   un trigger a mano** (`pendientes.md` §3.8) es la medida del problema.

⚠️ **Lo que hay que decidir es de negocio: hasta dónde llega "no se borra
nada".** Una salida razonable es separar los dos casos —*el historial de plata y
clases no se toca; una ficha del buzón que nunca produjo nada se anonimiza a los
N meses*—, que además resuelve por el otro lado el crecimiento de `CS-02`.

**Mínimo accionable ya:** una página de privacidad y una línea en los cuatro
formularios, **con una dirección que exista** — ⚠️ `hola@lajuanitastudio.com`
**no existe** (`platform.md` §13), y un contacto que nadie lee es peor que
ninguno.

---

### 4.7 · 🟠 `CS-07` — El rastro de auditoría no sobrevive al despliegue

**Severidad: Medio · Esfuerzo: S · Fase 8**

`application.properties` **no tiene una sola línea de `logging.*`**. Sin
`logging.file.name`, Spring escribe sólo a stdout; en Docker Compose eso lo
captura `json-file`, que **por defecto no rota ni tiene límite**. De ahí:

1. **El log crece hasta llenar el disco**, con un acelerador propio:
   `RegistroDeEventos` escribe una línea por login y `FiltroDeFrecuencia` una por
   límite excedido — o sea que **un ataque de fuerza bruta escribe el log que
   llena el disco**.
2. **El rastro no es durable**: recrear el contenedor —cualquier actualización—
   se lo lleva, y `backup.sh` no lo respalda (correctamente: un log no va en un
   `pg_dump`).

⚠️ **Se combina con `CS-04` de la peor manera: el rastro queda equivocado Y
efímero.** Después de un incidente no hay con qué contestar ni *desde dónde* ni
*cuándo*.

**Recomendación.** En el compose de producción,
`logging: {driver: json-file, options: {max-size: "10m", max-file: "5"}}` cierra
el punto 1. Para el 2, `logging.file.name` con rotación sobre un volumen, y **que
el logger `seguridad` salga a su propio archivo**: hoy sus ocho eventos están
mezclados con todo lo que loguea Spring.

---

### 4.8 · Bajo e informativos

| ID | | Qué |
|---|---|---|
| `CS-08` | **Bajo** | **29 de 53 cláusulas `LIKE` no declaran `ESCAPE '\'`.** Todas ligan `Busqueda.patron()`, que escapa bien; funciona porque **la barra invertida es el escape por defecto de `LIKE` en Postgres**. No es un agujero: es una dependencia de un default, y el javadoc de `Busqueda` ya lo explica, incluido por qué se borró la constante |
| `CS-09` | Info · ✅ **RESUELTO 2026-09-24** (`9b34324`) | **La validación de la URL del material cierra `javascript:` de rebote.** `AltaMaterialRequest.isUrlConEsquema` exige `http(s)://`, pero su javadoc dice que está para atajar a quien pega un nombre de archivo. **Nadie escribió que además es la defensa contra un `javascript:` almacenado** que el portal del alumno renderiza en un `<a href>`. No hay que cambiar código: hay que cambiar el comentario |
| `CS-10` | Info · ✅ **RESUELTO 2026-09-24** (`4560a97`) | **Las cabeceras de la API son los defaults de Spring Security** — `SeguridadConfig` no toca `.headers(...)`. Incluye `nosniff`, que es lo que cierra el caso de un archivo políglota servido `inline`. Funciona y **depende de no tocarlo**: un `.headers(h -> h.disable())` futuro lo apaga sin que falle nada. Conviene declararlas |
| `CS-11` | Info | **No hay regla de escapado para un CSV futuro.** Hoy no hace falta —no existe exportación CSV y el xlsx usa celdas tipadas—, pero el día que se agregue, `informe/Celda.Texto` necesita prefijar `'` ante `= + - @` |
| `CS-12` | Info | **El `src` de los iframes del blog es seguro por dónde vienen sus datos, no por cómo está escrito.** Es origen fijo + id, así que el id no puede cambiar el origen; pero **el blog está hecho para mudarse a un CMS**, y cuando ese id lo escriba un editor conviene validarlo como alfanumérico |

> **Remediados el 2026-09-24.** `CS-09` es sólo javadoc —cero líneas de
> lógica— y dice ahora que ampliar los esquemas aceptados no es una mejora de
> usabilidad sino abrir un XSS. `CS-10` declara las tres cabeceras en
> `SeguridadConfig` **sin cambiar el resultado observable**, y eso se probó en
> ese orden: `CabecerasDeSeguridadTest` se escribió primero, ya pasaba contra
> los defaults, y sigue pasando después de declararlas. Ese caso es la mitad
> que hace que declararlas sirva: sin él se podían volver a borrar en silencio.
>
> **`CS-08`, `CS-11` y `CS-12` siguen abiertos** — son del bloque 3.

---

## 5. Verificado y correcto

*El encargo lo pide con la misma claridad que un hallazgo, porque dice qué **no**
hay que volver a mirar.*

**Autorización (la fase de máxima prioridad).**

- **Los 7 endpoints de `/api/me/**` que reciben un id están bien acotados**, cada
  uno seguido hasta su query: `mioPorId` pone la propiedad en el `WHERE`;
  `cancelar` y `marcarLeida` filtran por dueño **antes** de tocar nada; los
  cuatro de `docencia` pasan por `miDocencia` + `verificarQueEsMiAlumno` o por
  una consulta acotada (`suya`, `suyo`).
- ⚠️ **El orden importa y está bien**: en `cancelar`, el filtro de propiedad va
  antes del `estaPendiente()`. Invertido, pedir cancelar la solicitud de otro
  contestaría *"ya fue resuelta"* — un **oráculo de existencia**. Los tres
  contestan *"no existe"*.
- **`mioPorId` deja afuera los pagos sin cuenta y está bien**: `c.pago.usuario.id`
  es un INNER JOIN implícito, y desde `V19` un pago puede no tener cuenta. **El
  javadoc ya lo dice**, o sea que no es una coincidencia afortunada.
- **La matriz se sostiene en los 147**: ninguna escritura protegida sólo por
  `@PuedeLeerAdministracion` —o sea que *"DIRECTIVO lee todo y no escribe nada"*
  se cumple entero—, ninguna lectura sobre-restringida, y ningún
  `@PuedeVerElTableroCompleto` fuera de `tablero/`. El único desvío,
  `GET /api/tablero/resumen`, **es la regla de §11** y devuelve un DTO propio.
- **La excepción documentada está bien puesta**: `DocenciaDelAlumnoController`
  vive fuera de `/api/me/**` y sus dos mappings llevan
  `@PuedeLeerAdministracion`.
- **`@EnableMethodSecurity` está** (`SeguridadConfig:60`) —sin ella los 112
  `@PreAuthorize` compilan y no hacen nada—, las tres meta-anotaciones listan los
  roles correctos, y el prefijo `ROLE_` coincide. **Y no hay un solo
  `@PreAuthorize` suelto en código**: la única ocurrencia es javadoc.

**Autenticación y sesión — el único bloque verificado EJECUTANDO los casos.**

- **El algoritmo del JWT está fijado** (`withSecretKey(...).macAlgorithm(HS256)`),
  y **`exp` e `iss` son obligatorios** por tres validadores. `auth/TokenJwtTest`
  tiene un caso por cada ataque del encargo y **los diez pasan**: `alg: none`
  armado a mano, token firmado con otra clave, sin vencimiento, vencido, de otro
  emisor, y basura. Más `CredencialVigenteTest` (5/5) y `AutenticacionTest`
  (14/14).
- **El claim `rol` no autoriza nada**, y hay un caso que lo prueba **firmando un
  token válido que miente**: dice `rol: USUARIO` para el `sub` del admin, y la
  autoridad que sale es `ROLE_ADMIN`, la de la base.
- **El token no lleva nada de más**: `containsOnlyKeys("iss","iat","exp","sub","rol")`.
  Un JWT va firmado pero **no encriptado**, y ese caso es lo que impide que con
  el tiempo alguien le agregue el email.
- ⚠️ **Corrección al encargo: dar de baja a alguien NO deja un token vivo 8 h.**
  `AutenticacionDesdeBase` relee al usuario en cada pedido y corta si
  `!activo`, así que **pega en el pedido siguiente**. La ventana de 8 h que sí
  existe es la de un token robado de una cuenta activa — la decisión que agosto
  dejó asumida, que no se reabre.
- **El modelo stateless se sostiene**: cero `HttpSession`,
  `@SessionAttributes`, `SecurityContextRepository` o `setSession` en todo el
  backend. Ningún portal guarda estado de sesión.
- **El vencimiento de la contraseña temporal no se puede esquivar.** Se aplica en
  el login y **después** de comparar la contraseña (así no le informa nada a un
  desconocido); y el escenario que lo anularía —`debeCambiarPassword` sin fecha—
  **no se puede construir**: hay **cero** escrituras directas a esas dos
  columnas, los cinco caminos que crean cuentas delegan todos en
  `UsuarioService.altaPorAdministracion`, y `V8` rechazaría una fila incoherente.
  **Nada loguea la contraseña**: los eventos anotan sólo ids.

**Inyección.** **La superficie de SQLi es cero, no "está parametrizada"**: 0
`createNativeQuery`, 0 `createQuery`, 0 `EntityManager`, 0 `JdbcTemplate` en
`src/main`. Todo pasa por `@Query`, y **el valor de una anotación en Java tiene
que ser constante de compilación**, así que un dato del usuario no se puede
concatenar aunque alguien quiera. **Sin inyección de fórmulas**: 0
`setCellFormula`, 0 CSV, celdas tipadas. **Sin XSS**: 2
`dangerouslySetInnerHTML` en todo el monorepo, las dos en la landing y las dos
correctas (`JSON.stringify(...).replace(/</g,"\\u003c")` y un literal); el panel
tiene cero.

**Archivos.** Path traversal cerrado con el patrón canónico
(`resolve`+`normalize`+`startsWith`); **la clave la genera el servidor**
(`carpeta/AAAA-MM/UUID.ext`); el tipo sale de los **primeros bytes** y son tres
(PDF/PNG/JPEG), así que no hay SVG ni HTML que servir `inline`; el nombre
original pasa por una **allowlist** que hace imposible inyectar en
`Content-Disposition`; tamaño limitado en dos capas; descargas acotadas a su
padre, **nunca un `findById` suelto**. Zip-slip no aplica.

**Superficie pública.** **Sin mass assignment**: el alta pública hace
`setRol(Rol.USUARIO)` en duro, con el comentario al lado. Todos los campos del
DTO del formulario tienen techo. **CORS sin comodín**, `allowCredentials(false)`,
métodos y headers enumerados. Las 4 rutas del límite por IP son exactamente las
3 públicas + el cambio de contraseña: **no falta ninguna**.

**Operación.** El backup cubre **la base y los archivos subidos** y tiene
retención; **el restore fue ensayado, no escrito** (`operacion.md` §2, rehecho el
2026-08-20), verificando que la base restaurada conserva **sus reglas**, que la
aplicación real arranca contra ella, y **probando el modo de falla desde el otro
lado**. Hay rastro de seguridad y cubre los ocho hechos correctos.

**Fuera de categoría.** Sin sourcemaps publicados. **Sin scripts de terceros** —
no hay SRI que falte porque no hay nada que integrar. Sin open redirect.
`/actuator` expone sólo `health` con `show-details=never`.

---

## 6. No verificado

*Lo que esta barrida no puede afirmar. Con el procedimiento para cubrirlo.*

1. ~~La Fase 1 quedó parcial.~~ ✅ **CERRADA el 2026-09-24**, y su mitad JWT es
   la **única del informe verificada CORRIENDO los casos** y no leyéndolos
   (`TokenJwtTest` 10/10, `CredencialVigenteTest` 5/5, `AutenticacionTest`
   14/14). Ver §5.
2. **Ningún IDOR se probó con dos cuentas.** Se siguió cada uno hasta su query
   leyendo el código, que para las siete es concluyente, pero **la confirmación
   en caliente es otra sesión**. *Procedimiento:* dos cuentas de alumno, pedir
   con el token de A el `id` de B en los siete endpoints de §5; los siete tienen
   que contestar *"no existe"*.
3. **`CS-01` no se ejecutó, se leyó.** La cadena estática es concluyente.
   *Procedimiento, 2 minutos:* crear una cuenta desde `/admin/usuarios` (nace con
   temporal), loguearse y pedir `GET /api/me/estado-de-cuenta`. **Hoy tiene que
   contestar 200**; con el arreglo, 403.
4. **`CS-04` y `CS-07` no se pueden probar hasta que el proxy exista.**
5. **No se corrió un escáner de CVE contra Maven.** Se listan las versiones
   —Spring Boot 4.1.1, `poi-ooxml` 5.4.1, `openpdf` 2.0.3, todas recientes— y se
   deja anotado, **sin inventar números**.
6. **No hay plan de respuesta a incidentes** y no se evalúa acá: `operacion.md`
   cubre backup, restore y fallos de migración —que es el grueso—, pero
   *"nos entraron"* no es un caso que ese documento contemple. No es un hallazgo
   técnico; se deja nombrado.

---

## 7. Backlog priorizado

### 🔴 Bloque 1 — Bloquea el deploy

| | Qué | Esfuerzo |
|---|---|:--:|
| **`CS-03`** | `ENV LAJUANITA_JWT_PERMITIR_SECRETO_DE_DESARROLLO=false` en el `Dockerfile`, y corregir la fila de `operacion.md:358` | XS |
| ~~**`CS-01`**~~ | ✅ **RESUELTO 2026-09-24** (`5ca3684`) | — |
| — | **Desactivar el admin sembrado** — ⚠️ **BLOQUEADO en una decisión**: `admin@lajuanita.local` es **la única cuenta con rol ADMIN**, así que desactivarla deja al sistema sin nadie que pueda otorgar roles ni tocar cuentas administrativas. Ver la nota al pie de esta sección | XS |

### 🟡 Bloque 2 — Antes de exponer a internet

| | Qué | Esfuerzo |
|---|---|:--:|
| **`CS-04`** | `forward-headers-strategy=framework` **y** un proxy que sanee `X-Forwarded-For` — **las dos mitades juntas** | S |
| **`CS-02`** | `client_max_body_size 15m` en el proxy | S |
| ~~**`CS-05`**~~ | ✅ **RESUELTO 2026-09-24** (`c019f3d`) | — |
| **`CS-07`** | Rotación de logs en el compose de producción | S |
| **`CS-06`** | Página de privacidad y la línea en los cuatro formularios | S |

⚠️ **Cuatro de estos cinco se arreglan en archivos que todavía no se
escribieron** —el `Dockerfile`, el `docker-compose.prod.yml` y la configuración
del proxy—. Hacerlos ahora cuesta lo que cuesta escribirlos; después, cuesta una
migración de configuración en producción.

### 🟢 Bloque 3 — Endurecimiento posterior

| | Qué | Esfuerzo |
|---|---|:--:|
| **`CS-02`** (2ª mitad) | `@Size` en los 33 componentes sin techo | M |
| **`CS-06`** (2ª mitad) | **La decisión de negocio**: hasta dónde llega *"no se borra nada"*, y la retención del buzón | M |
| **`CS-08`** | Declarar `ESCAPE '\'` en las 29 cláusulas que lo omiten | S |
| ~~**`CS-10`**~~ | ✅ **RESUELTO 2026-09-24** (`4560a97`) | — |
| ~~**`CS-09`**~~ | ✅ **RESUELTO 2026-09-24** (`9b34324`) | — |
| **`CS-11`**, **`CS-12`** | Dos comentarios y una validación, cada uno donde corresponde | XS |
| — | Completar la Fase 1 y la confirmación en caliente de los IDOR (§6) | M |

⚠️ **Sobre el admin sembrado, que quedó bloqueado el 2026-09-24.**
`pendientes.md` §1.4 y `operacion.md:366` coinciden en el camino —**una
migración nueva**, nunca editar `V3`, y *"después de crear los usuarios
reales"*—. Lo que ninguno de los dos anticipa es que **hoy
`admin@lajuanita.local` es la única fila con `rol = ADMIN`** (las otras cuatro
cuentas administrativas son STAFF y DIRECTIVO). Desactivarla sin más deja al
sistema **sin nadie que pueda otorgar roles ni editar una cuenta
administrativa**, que es justo el bloqueo que `UsuarioService` prohíbe desde
arriba —*"no podés desactivar tu propia cuenta"*, *"no podés cambiarte el rol a
vos mismo"*— y que una migración haría desde abajo, saltándose el guardia que
existe para evitarlo. **Necesita una decisión antes de escribirse.**

---

## 8. Una observación sobre el código, que no es un hallazgo

**Tres de las defensas que esta barrida encontró vivas existen por otro motivo y
nadie lo anotó.** La validación de la URL del material cierra un `javascript:`
almacenado y su comentario habla de atajar nombres de archivo; la configuración
de imágenes cierra la RCE de AVIF y su comentario habla de velocidad de
codificación; las cabeceras de la API incluyen `nosniff` porque nadie tocó los
defaults de Spring Security.

**Las tres funcionan. Las tres se pueden perder en un cambio que parezca una
mejora**, porque el que lo haga va a leer el motivo escrito y no el que importa.
Es el mismo patrón que este proyecto ya documentó cinco veces desde el otro lado
—una regla de negocio que no vive en ninguna capa— y acá aparece dado vuelta:
**una defensa que vive en el código y no en el razonamiento**. Cuesta tres
comentarios (`CS-09`, `CS-10`, `CS-12`) y es lo más barato de todo este informe.
