# Informe de auditoría técnica — LaJuanitaProject

**Fecha:** 2026-08-13
**Alcance:** monorepo completo (`apps/landing`, `apps/platform`, `apps/backend`, `docs/`)
**Encargo:** `prompt-auditoria-lajuanita.md` (raíz)
**Estado del informe:** ✅ **COMPLETO — las 8 fases del encargo, ejecutadas.**
**Sesiones:** 2026-08-13 (Fases 0, 2 y 7; después 4, 1, 5, 3 y 6).

---

> ## Lea esto antes que nada
>
> **Las ocho fases del encargo están ejecutadas.** Se hicieron en varias sesiones del
> 2026-08-13: primero la 0 (contexto), la 2 (documentación) y la 7 (fuera de
> categoría), y después la 4 (seguridad), la 1 (base de datos), la 5 (consistencia
> entre capas), la 3 (SEO y GEO) y la 6 (calidad, tests y operación).
>
> **Nada de lo que sigue es inferencia.** Todo hallazgo lleva `ruta:línea`, y lo que
> no se pudo verificar está enumerado en §6 fase por fase — es una sección larga a
> propósito. Buena parte del informe **se verificó ejecutando**: `mvn test`
> (**57/57**), las dos suites SQL sobre las seis migraciones (**69/69** y **40/40**),
> ataques propios contra el esquema real, **la API corriendo** interrogada endpoint por
> endpoint, **el build de la landing** auditado sobre los 20 HTML generados, y los
> contrastes de la paleta calculados sobre sus valores reales (§6.2).
>
> Lo que **no** se hizo, y conviene tenerlo presente al leer: no se abrió ninguna de
> las dos aplicaciones en un navegador, no se midió rendimiento, y no se probó
> concurrencia. Ver §6.3.
>
> **Remediación en curso desde el 2026-08-14.** Los hallazgos ya resueltos llevan un
> bloque *"Remediado el ..."* al pie, y **§8 lleva el estado y el orden propuesto para
> lo que queda**. Un hallazgo sin ese bloque sigue abierto.
>
> **Leer junto con `docs/requirements/platform.md` §13**, *"Decisiones cerradas el
> 2026-08-14"*: veinte preguntas contestadas de una sola vez, entre ellas las cinco del
> cliente que este informe daba por abiertas. **En todo lo que sea una decisión, §13 gana
> sobre este documento.** §8 ya está sincronizada con ella; el cuerpo de los hallazgos
> conserva el diagnóstico original, que es lo que se midió.
>
> **Al cerrarse la tanda 6 (2026-08-14) las cifras de arriba quedaron viejas, y de la
> mejor manera:** `mvn test` va por **106/106**, las suites SQL por **86/86 y 50/50** sobre
> **ocho** migraciones, el front pasó de no tener tests a tener **53**, y las tres cosas
> corren solas en un pipeline. Las cifras originales se dejan como estaban porque son el
> estado que la auditoría midió; el actual está en §8.

---

## 1. Resumen ejecutivo

El repositorio **es público en GitHub** y publica material confidencial del cliente:
la propuesta comercial firmada, la transcripción de la entrevista y las cifras de
facturación del negocio, además del secreto de firma JWT y la contraseña del
administrador sembrado. Es el hallazgo de mayor impacto de todo lo auditado y no está
mencionado en ningún documento del proyecto.

Debajo de eso, el cuadro es el de un proyecto **técnicamente sólido y
documentalmente desincronizado**. La documentación es densa, honesta y en varios
puntos ejemplar —los cuatro roles coinciden en las cuatro capas, la tabla de 14
endpoints es exacta uno por uno, los conteos de tests son reales—, pero la auditoría
de base del 12/08 y la migración `V6` que la corrige **no existen para la fuente de
verdad**: `CLAUDE.md` sigue enumerando cinco migraciones y las pruebas SQL se
instruyen a correr sobre un esquema que ya no es el del proyecto.

En paralelo, **dos días de trabajo —todo el Módulo 1, `V4`, `V5`, `V6` y la auditoría
de base— viven sin commitear en un solo disco**, en un proyecto de un desarrollador
con entrega en diciembre.

La Fase 4 encontró un backend **sólido en el núcleo de autenticación** —el token, la
resolución de permisos contra la base y la protección de las cuentas administrativas
resisten los ataques que se les probaron, y 57 tests lo sostienen— y **débil en el
perímetro**: no hay límite de intentos, no hay registro de eventos, no hay forma de
recuperar una contraseña, y el candado que debería impedir arrancar en producción con
el secreto público **solo se activa si alguien se acuerda de nombrar el perfil `prod`**.

La Fase 1 confirmó que la base es la capa mejor construida del proyecto —las 109 pruebas
SQL pasan sobre el esquema real y las reglas que declara, las cumple— y encontró el
mismo patrón que la Fase 4: **lo que falta no es lo que se hizo, es lo que quedó fuera
del recorte.** El "nada se borra" se implementó para el dinero y no para el historial de
clases, que es la regla dura del Módulo 1; anular un pago es la única excepción del
esquema que no pide explicación; y las reglas de la base, todas bien escritas, llegan al
usuario final como un mensaje sobre emails duplicados o como un 500.

La Fase 5 cerró el mismo patrón desde el otro extremo, con la API corriendo: **el
contrato de datos entre el backend y el front es exacto**, y sin embargo cinco de los
catorce endpoints no se pueden llamar desde ninguna pantalla y el listado se queda en
las primeras veinte filas mientras el encabezado anuncia el total. Con dos usuarios no
se nota; con los ochenta de diciembre, sí.

Y la Fase 3 lo encontró una vez más, esta vez en la capa que más cuesta corregir después.
La landing aplica su regla de veracidad con rigor real —en los 20 HTML generados no hay
un solo precio, teléfono, horario ni rating publicado sin confirmar— **y esa regla nunca
cubrió el catálogo**: se publica, en los títulos, en el `llms.txt` y en datos
estructurados, un curso que el cliente ya dijo que no existe y tres duraciones que
contradicen lo que confirmó.

La Fase 6 cierra con el mismo diagnóstico dicho de la forma más corta posible: **los 57
tests prueban a fondo el login y no prueban el módulo que se está construyendo**, las 109
pruebas de base no están en ningún build, y no hay pipeline que corra nada. Lo que este
proyecto tiene de sobra es criterio; lo que le falta es que ese criterio quede
enganchado a algo automático.

**Los que bloquean entrega** *(estado al 2026-08-14; el detalle vive en §8)*:

1. ~~**EXT-01** — Repositorio público con material confidencial del cliente y secretos.~~ **Cerrado**: repo privado y secreto rotado; el resto quedó como riesgo asumido (§5).
2. ~~**DOC-09 / EXT-02** — Todo el Módulo 1 y las migraciones `V4`–`V6` sin commitear.~~ **Resuelto** (commit `870b0da`).
3. ~~**SEC-01** — El bloqueo que impide firmar con el secreto público depende de un nombre de perfil que el deploy previsto no usa.~~ **Resuelto**: falla cerrado.
4. **DOC-07 / DOC-08** — Credenciales de Postgres commiteadas sin override, y cero procedimiento de backup, restore o deploy.
5. **SEO-01** — La landing publica un curso inexistente y duraciones que contradicen lo confirmado, en los títulos, el `llms.txt` y el JSON-LD. Bloquea la publicación, y el propio proyecto ya lo sabía (P34, P31).
6. **QA-02** — Precios inventados publicados sin salvedad en los dos programas, y cuatro notas técnicas inventadas firmadas —también en datos estructurados— con los nombres de Ghezz, Najles y Chapa Castelo.
7. **DB-01 / DB-02 / SEC-02 / SEC-03 / ARQ-01** — Cinco huecos que hay que cerrar antes de que entren los ochenta alumnos: el historial de clases se puede borrar, anular un pago no deja autor, el login no tiene límite de intentos ni logs, no hay forma de recuperar una contraseña, y el listado solo muestra veinte filas.

**Una frase por área:** *Base de datos* — la capa más cuidada del proyecto; lo que falta
está afuera del recorte, no adentro. *Seguridad* — el núcleo está bien construido y
probado; lo que falta es todo lo que rodea al login. *Consistencia entre capas* — el
contrato es exacto; lo que falla es cuánto de la API llega efectivamente a la pantalla.
*SEO y GEO* — la capa técnica es de las mejores del repo; el problema es qué se afirma,
no cómo. *Documentación* — excelente en decisiones, atrasada en estado. *Repositorio y
proceso* — el eslabón más débil y el menos vigilado. *Calidad, tests y operación* — la
autenticación está probada como pocas cosas; el resto no lo prueba nadie, y nada corre
solo.

---

## 2. Tabla de conteo

| Área | Crítico | Alto | Medio | Bajo | Info | Total |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| DB — Base de datos | 0 | 2 | 3 | 4 | 1 | 10 |
| DOC — Documentación | 0 | 5 | 5 | 2 | 1 | 13 |
| SEO — SEO y GEO | 0 | 1 | 1 | 4 | 0 | 6 |
| SEC — Seguridad | 0 | 3 | 2 | 4 | 0 | 9 |
| ARQ — Consistencia entre capas | 0 | 1 | 3 | 5 | 1 | 10 |
| QA — Calidad, tests y operación | 0 | 2 | 4 | 1 | 0 | 7 |
| EXT — Fuera de categoría | 1 | 1 | 1 | 1 | 0 | 4 |
| **Total verificado** | **1** | **15** | **19** | **21** | **3** | **59** |

> **Al 2026-08-14 son 60**: la remediación agregó **DB-11** (Bajo), encontrado mientras
> se arreglaba DB-05. El estado de los 60, uno por uno, está en **§8.1**.

Sin hallazgos críticos en seguridad, y no por falta de búsqueda: los tres vectores que
suelen darlos —token manipulado, escalada de privilegios por el cuerpo de un pedido, y
autorización que confía en el claim— **están cerrados y con test que lo prueba** (ver
el Anexo). Lo que queda son ausencias del perímetro, no agujeros en el núcleo.

Tampoco los hay en base de datos, y también se buscaron: se atacó el esquema real con
casos propios además de correr sus 109 pruebas. **Ninguna de las reglas que el esquema
declara se pudo violar.** Los dos hallazgos Altos son reglas que el esquema **nunca
intentó** imponer, aunque el documento de alcance las declare confirmadas.

Y ninguno en el contrato entre capas: los seis tipos de respuesta coinciden campo por
campo con el JSON real. El único Alto de esa fase no es una diferencia de contrato sino
**una mitad del contrato que el front no usa** — el paginado.

---

## 3. Hallazgos

### 3.1 EXT — Fuera de las categorías del encargo

---

#### EXT-01 — El repositorio es público y publica material confidencial del cliente, el secreto JWT y la credencial del administrador

**Severidad: Crítico**

**Evidencia**

- Remoto: `git remote -v` → `origin https://github.com/ignaciolawson/LaJuanitaProject.git`. La página del repositorio **renderiza con badge "Public"**, con el listado de archivos y los 20 commits visibles sin autenticación (verificado el 2026-08-13).
- Material confidencial rastreado (`git ls-files docs/relevamiento docs/propuesta`):
  ```
  docs/propuesta/entrega-final-acumulativa.pdf          (1,04 MB)
  docs/relevamiento/transcripcion-entrevista-2026-04-17.pdf
  docs/relevamiento/estudio-prefactibilidad.pdf
  ```
  `docs/requirements/platform.md:3-5` los describe: *"relevamiento + propuesta técnica + propuesta comercial, **entregado y firmado con el cliente**"*.
- Cifras y frases del negocio, en un `.md` rastreado y público:
  - `docs/requirements/platform.md:46`: *"M&M — potencial | **5–6 trabajos por día, USD 200–300 diarios por sala**, costo casi nulo."*
  - `:40`: *"Mix & Mastering sí puede quedar en debe. Ghezz entrega primero y cobra después (**'básicamente estoy fiando el servicio'**)."*
  - `docs/requirements/platform.md:429`: *"**'con clientes con mucha exposición no les podés exigir el pago de la misma forma, ahí tenés que tener cintura'**"*.
  - `:32`: nombres completos del equipo y de la dirección.
- Secreto de firma, en la versión **commiteada** (`git show HEAD:apps/backend/src/main/resources/application.properties:26`):
  `lajuanita.jwt.secreto=${JWT_SECRET:/zMQejZCLzic/mq1/t7FtpUcOsj+h0NVWf/ndnfXs6146QEfzCdoiWOFasioULoq}`
- Credencial del admin sembrado, en claro (`git show HEAD:.../V3__usuario_admin_inicial.sql:17-19`):
  *"email: `admin@lajuanita.local` · contraseña: `lajuanita2026`"*, más el hash BCrypt (`:44`).
- Fotos identificables de personas reales rastreadas: `docs/branding/fotos-artistas/{ghezz,najles,chapa-castelo}.png`, `docs/branding/otras-fotos/team-entero.jpg`.
- **Ningún documento del repo menciona que el repositorio sea público.** `CLAUDE.md:157` formula el riesgo del secreto como *"anyone with **repo access** can forge an ADMIN token"* — una frase escrita para un repositorio privado.

**Qué pasa hoy.** Cualquiera con la URL descarga la propuesta comercial firmada del
cliente, la transcripción de la entrevista y el estudio de prefactibilidad; lee la
facturación potencial por sala, la política real de cobranza de Ghezz y los nombres del
equipo; y se lleva el secreto con el que se firman las credenciales del sistema y la
contraseña del administrador inicial. No hace falta explotar nada: está publicado.

**Impacto concreto.** Tres capas, y la primera no es técnica. **(a) Confidencialidad
del cliente:** los términos comerciales y las cifras de un negocio real identificado
con nombre y dirección quedaron expuestos por una decisión de la que el cliente no
participó ni fue informado. Ese material no es del desarrollador. **(b) Seguridad al
deployar:** el día que el sistema salga a internet, quien tenga ese secreto fabrica un
token `ADMIN` válido sin conocer ninguna contraseña, y la mitigación documentada
—definir `JWT_SECRET`— solo funciona si además **se rota** el valor, cosa que ningún
documento pide. **(c) Mapa para un atacante:** la propia documentación enumera, en
público, que no hay límite de intentos en login ni en registro, que hay una credencial
sembrada y cuál es.

**Recomendación.** En este orden, hoy:

1. **Pasar el repositorio a privado.** Es una acción de un minuto y detiene el sangrado.
2. **Sacar `docs/propuesta/` y `docs/relevamiento/` del control de versiones** (`git rm --cached` + `.gitignore`), y guardarlos donde corresponda. Son documentos del cliente, no artefactos de build. Nótese que **borrarlos de `HEAD` no los borra del historial**: siguen recuperables desde cualquier commit anterior, así que si el repositorio vuelve a ser público alguna vez, hace falta reescribir el historial (`git filter-repo`) o crear un repositorio nuevo.
3. **Rotar el secreto JWT** al valor de desarrollo que sea, asumiendo que el actual es público para siempre, y dejar escrito en `README.md:173-181` que `JWT_SECRET` en producción **debe ser un valor nuevo**, no el del repo.
4. **Avisarle al cliente.** Es material suyo; la decisión de cómo se guarda le corresponde.
5. Revisar con el cliente si las fotos del equipo tienen autorización para estar publicadas.

**Esfuerzo: S** (el punto 2 con reescritura de historial: **M**)

> **2026-08-14 — PARCIAL. El punto 1 está hecho: Ignacio pasó el repositorio a
> privado.** Eso detiene el sangrado y es lo que más urgía. No se verificó desde acá
> (no hay `gh` CLI en esta máquina); queda registrado como lo informó él.
>
> **Sigue abierto, y conviene no darlo por cerrado por inercia:**
>
> - **Punto 2** — `git ls-files docs/propuesta docs/relevamiento` sigue devolviendo los
>   tres PDF del cliente. Y aunque se saquen de `HEAD`, **siguen en el historial**: entre
>   el 13 y el 14 de agosto el repositorio estuvo público con dos commits más encima
>   (`0c65e9c` y `870b0da`), así que hay que asumir que lo publicado ya se pudo copiar.
>   Si el repositorio vuelve a ser público alguna vez, hace falta reescribir el historial
>   o crear uno nuevo.
> - **Punto 3** — el secreto JWT sigue sin rotar. Pasar el repo a privado **no lo
>   despublica**: el valor estuvo accesible sin autenticación y hay que darlo por
>   conocido. Es un cambio de una línea.
> - **Puntos 4 y 5** — avisarle al cliente, y confirmar la autorización de las fotos del
>   equipo. No son trabajo de código.

---

#### EXT-02 — Dos días de trabajo, incluidas tres migraciones, existen solo en el working tree

**Severidad: Alto** · *converge con DOC-09, que lo mira desde el eje documental*

**Evidencia**

- `git status --porcelain | wc -l` → **61** archivos pendientes: 29 modificados, **32 sin rastrear**.
- `git log -1` → `0c65e9c 2026-08-12 00:15:46 -0300 "Fase 1 Backend + Auditoria inicial + Documentacion al dia"`. Es de la **medianoche** del 12/08: todo el trabajo de ese día es posterior.
- Sin rastrear, entre otros:
  ```
  apps/backend/src/main/resources/db/migration/V4__separar_nombre_apellido.sql
  apps/backend/src/main/resources/db/migration/V5__cambio_de_password_obligatorio.sql
  apps/backend/src/main/resources/db/migration/V6__integridad_auditoria.sql
  apps/backend/.../config/AutenticacionDesdeBase.java · PuedeOperar.java · PuedeLeerAdministracion.java
  apps/backend/.../usuario/UsuarioController.java · UsuarioService.java · dto/
  apps/backend/.../alumno/AlumnoController.java · AlumnoService.java · dto/
  apps/backend/src/test/java/.../config/ · .../usuario/         (4 archivos de test)
  apps/backend/src/test/resources/db/pruebas-adversariales.sql
  apps/platform/src/paginas/{Alumnos,Registro,Usuarios}Pagina.tsx · api/administracion.ts · componentes/
  docs/db/auditoria-2026-08-12.md
  ```
- Una sola rama (`main`), un solo remoto. No hay tags: los hitos que la documentación nombra ("Fase 0 cerrada", "primera tanda del Módulo 1") no tienen ningún punto recuperable asociado.

**Qué pasa hoy.** Un `git clone` de `main` produce el proyecto al 2026-08-11: sin
Módulo 1, sin autorización por rol, sin `V4`–`V6`. Todo lo que la documentación
describe como hecho —incluida la migración que impide que un premaster se libere sin
pago y que un pago se anule después— vive en un único disco, sin copia remota.

**Impacto concreto.** Un `git clean -fd` mal tipeado, un disco que falla o una máquina
robada borran dos días de trabajo, la auditoría adversarial completa de la base y las
tres migraciones que protegen la plata. No hay backup: el remoto está dos días atrás.
En un proyecto de un desarrollador con entrega comprometida en diciembre, es el riesgo
de continuidad más barato de eliminar que tiene el repositorio.

**Recomendación.** Commitear y pushear hoy, aunque sea en un commit grande. Después,
dos reglas: **(a)** la actualización documental va en el **mismo** commit que el código
que describe —el mensaje "Documentacion al dia" sobre un árbol donde el código no está
commiteado es exactamente lo que hace que la afirmación no se pueda verificar—; **(b)**
un tag por hito cerrado (`fase-0`, `modulo-1-tanda-1`), para que "volver a como estaba
cuando funcionaba" sea una operación y no una arqueología.

**Esfuerzo: XS**

---

#### EXT-03 — Sin `LICENSE` ni nota de titularidad, en un proyecto académico que se entrega a un cliente real para uso comercial

**Severidad: Medio**

**Evidencia**

- `ls LICENSE*` → no existe. `package.json` raíz declara `"private": true` y ninguna clave `license`.
- `README.md:3`: *"**Proyecto académico** desarrollado por Ignacio Lawson."*
- Contra: `docs/sistema-gestion-plan.md:22`: *"**Deploy real. Se va a usar en la vida real**, no corre local para la defensa."* Y `:29-31`: el proyecto se compromete a migrar los datos reales de Notion/Excel y a capacitar a la administrativa.
- `docs/requirements/platform.md:7`: *"**La propuesta es contractual.** Lo que promete se entrega."*

**Qué pasa hoy.** El repositorio no dice quién es dueño del código, bajo qué términos
el cliente puede usarlo, qué pasa si el desarrollador se va, ni qué soporte existe
después de la entrega. La única caracterización escrita —"proyecto académico"— es la
que menos se corresponde con el destino declarado.

**Impacto concreto.** El sistema va a administrar pagos, contratos y datos personales
de un negocio en funcionamiento. Cuando alguien pregunte quién responde por un cobro
mal registrado, quién puede modificar el código, o qué pasa después de diciembre, la
respuesta no está en ningún lado. No es un problema de código, pero es el tipo de hueco
que aparece cuando ya hay dinero real adentro.

**Recomendación.** Agregar un `LICENSE` (o una nota de titularidad explícita si el
código no se licencia) y una sección corta en `README.md` con tres líneas: quién es el
titular, qué se entrega, y qué mantenimiento existe después de la entrega. Si eso está
resuelto en la propuesta firmada, alcanza con referenciarlo.

**Esfuerzo: XS**

---

#### EXT-04 — `V3` afirma que un test lo verifica en cada build; ese test no existe

**Severidad: Bajo**

**Evidencia**

- `apps/backend/src/main/resources/db/migration/V3__usuario_admin_inicial.sql:11-13`: *"El test **UsuarioAdminInicialTest** lo verifica en cada build: si alguien cambia el encoder o el costo, el test falla acá y no en producción un lunes."*
- `grep -rn "UsuarioAdminInicialTest"` sobre todo el repo devuelve **dos** resultados: la propia migración y su copia compilada en `target/`. **No existe la clase.**
- Los siete archivos de test reales son `AutenticacionTest`, `TokenJwtTest`, `BackendApplicationTests`, `CredencialVigenteTest`, `PermisosPorRolTest`, `PasswordTemporalTest`, `RegistroTest` (57 `@Test` en total, verificado).

**Qué pasa hoy.** La migración documenta una garantía por nombre propio y esa garantía
no tiene implementación con ese nombre. Puede que la cubra `AutenticacionTest` —el
plan lo sugiere en `docs/sistema-gestion-plan.md:262-263`—, pero eso no está verificado
y el comentario apunta a un archivo inexistente.

**Impacto concreto.** Bajo hoy. El costo es de confianza: es una afirmación falsable
del repo que resultó falsa, en un archivo que **no se puede editar** (Flyway calcula el
checksum). La corrección tiene que ir en otro lado.

**Recomendación.** No tocar `V3` —rompería el arranque, como ya pasó una vez
(`docs/sistema-gestion-plan.md:399-401`)—. Verificar si `AutenticacionTest` realmente
cubre el hash sembrado; si sí, dejar constancia en `CLAUDE.md`; si no, escribir el test.

**Esfuerzo: XS**

> **Actualización 2026-08-13 (Fase 4) — resuelto a medias, baja a Informativo.** El test
> existe con otro nombre: `AutenticacionTest.java:80`,
> `el_hash_sembrado_en_V3_lo_valida_el_encoder_de_la_aplicacion`, y **pasa** (corrida de
> esta sesión, §6.2). La garantía que `V3` promete es real; lo único falso es el nombre
> de la clase. Queda una línea de `CLAUDE.md` por escribir, no un test.

> **Remediado el 2026-08-14 — RESUELTO.** Esa línea está escrita, con el nombre real de
> la clase y del método, y diciendo por qué la corrección vive ahí y no en `V3` (Flyway
> le calcula el checksum). Nombre del método verificado contra el archivo.

---

### 3.2 DB — Base de datos

Alcance verificado **contra el esquema real**, no solo contra el SQL: se levantó
Postgres, se aplicaron las seis migraciones sobre una base vacía y se interrogó el
catálogo (`pg_constraint`, `pg_indexes`, `information_schema`). Se corrieron las dos
suites SQL —**69/69 y 40/40 sobre V1..V6**— y se atacó el esquema con casos propios,
todos dentro de transacciones revertidas. Lo que no se cubrió está en §6.5.

El punto de partida es que **este esquema está muy por encima de lo habitual**: 55
CHECK, 46 FK todas en `NO ACTION`, 7 UNIQUE, 2 EXCLUDE y 10 triggers, con el motivo de
cada regla escrito al lado. El desarrollador ya se auditó a sí mismo el 12/08 y su
informe es honesto —incluida una lista de lo que decidió no arreglar—. Los hallazgos de
abajo son, casi todos, **cosas que esa auditoría no miró**.

| ID | Título | Sev | Esf |
|---|---|:--:|:--:|
| DB-01 | "El historial de clases no se elimina" es una regla dura confirmada con el cliente y no existe en ningún lado | Alto | M |
| DB-02 | Anular un pago no deja autor, motivo ni fecha, en un esquema donde toda otra excepción sí los exige | Alto | S |
| DB-03 | `bloqueo_sala` tiene dos definiciones incompatibles de "bloqueo", y rechaza bloqueos legítimos | Medio | S |
| DB-04 | Otras dos reglas duras de la propuesta sin constraint y ausentes de la lista de faltantes | Medio | M |
| DB-05 | Las reglas de la base son inusables desde la API: el trigger sale 500 y el CHECK sale como "email duplicado" | Medio | S |
| DB-06 | El DBML advierte sobre diferencias con el esquema que ya no existen | Bajo | XS |
| DB-07 | `venta_equipo` es la única tabla de dinero sin sello de carga: una venta se puede antedatar sin rastro | Bajo | S |
| DB-08 | Seis nombres distintos para "cuándo se creó esta fila" | Bajo | S |
| DB-09 | Tres de los cuatro destinos de `pago` no tienen índice, y uno respalda dos triggers activos | Bajo | XS |
| DB-10 | El esquema ya cerró por construcción una pregunta que el relevamiento tiene abierta | Info | — |
| DB-11 | `reserva_horas_validas` no se llega a evaluar nunca: la columna generada falla antes | Bajo | XS |

---

#### DB-01 — "El historial de clases no se elimina; se edita con auditoría" es una regla dura confirmada con el cliente, y no existe en ningún lado

**Severidad: Alto**

**Evidencia**

- La regla, en la lista de **"Reglas duras ✅"** del Módulo 1:
  `docs/requirements/platform.md:275` — *"El historial de clases **no se elimina**; se
  edita **con auditoría**."* El ✅ del encabezado significa confirmada con el cliente.
- V6 §7 implementó "nada se borra" **solo para dos tablas**:
  `V6__integridad_auditoria.sql:238-244` crea `pago_no_se_borra` y
  `trabajo_no_se_borra`. `reserva` y `reserva_participante` —que **son** el historial de
  clases— no tienen nada.
- Medido sobre una base con las seis migraciones aplicadas, dentro de una transacción
  revertida:
  ```
  === 1. Borrar una PARTICIPACION (historial de clase) ===
  DELETE FROM reserva_participante WHERE id_reserva = 1;   -> DELETE 1
  === 2. Borrar la RESERVA entera ===
  DELETE FROM reserva WHERE id_reserva = 1;                -> DELETE 1
  === 3. Cambiar la asistencia de PRESENTE a AUSENTE ===
  UPDATE reserva_participante SET estado_asistencia='AUSENTE';  -> UPDATE 1
  ```
- Y la segunda mitad de la regla —*"se edita con auditoría"*— tampoco está:
  `reserva_participante` **no tiene ninguna columna de autor ni de modificación**
  (`V1__baseline.sql:294-307`: solo `fecha_registro`). `reserva` sí tiene
  `id_usuario_modifico` y `fecha_modificacion` (`:237,239`), pero **nada las escribe ni
  las exige**: no hay trigger que las complete y no son NOT NULL, así que una reserva
  editada las deja en `NULL` y nadie se entera.
- **No figura en la lista de faltantes del propio desarrollador.**
  `docs/db/auditoria-2026-08-12.md:62` enuncia la regla como *"El historial
  **financiero** no se borra 🟢 `pago` y `trabajo_mastering`"* — la acotó a dinero. Las
  cinco reglas 🔴 de su §6 son otras cinco; ésta no está entre ellas.

**Qué pasa hoy.** Cualquiera con acceso a la base borra la asistencia de una clase, o la
clase entera, sin dejar rastro. Y cuando exista el endpoint de edición, cambiar un
"presente" por un "ausente" no va a registrar quién lo cambió.

**Impacto concreto.** Es la regla que sostiene el módulo entero. El sistema existe para
responder *"¿cuántas clases le quedan a Juan?"*, y esa respuesta se calcula sobre
`reserva_participante`. Si esas filas se pueden borrar o editar sin auditoría, la
respuesta no es verificable: ante un reclamo —*"yo esa clase la di"*, *"a mí me
marcaron ausente y fui"*— no hay a qué recurrir. Y a diferencia del dinero, acá la
disputa es con un alumno que paga, cara a cara. El agravante es que la protección
análoga **ya se escribió** para `pago` en V6: falta aplicar el mismo patrón a las dos
tablas que el requerimiento nombra explícitamente.

**Recomendación.** Tres piezas, en orden de valor:

1. Extender `prohibir_borrado_historico()` —la función ya existe,
   `V6__integridad_auditoria.sql:229-236`— a `reserva_participante`, con la misma
   lógica de salida documentada: la asistencia se marca `CANCELADA`, que ya es un valor
   válido del CHECK (`V1:305`). Para `reserva` la salida ya existe (`CANCELADA`).
2. Agregar `id_usuario_modifico` + `fecha_modificacion` a `reserva_participante`, para
   que exista dónde escribir la auditoría.
3. Un trigger `BEFORE UPDATE` que **exija** las dos columnas cuando cambia
   `estado_asistencia`, siguiendo el molde de `solicitud_resolucion_completa`
   (`V1:382-384`), que es la misma idea ya resuelta en este esquema.

Y sumar la regla a la lista de faltantes de `docs/db/auditoria-2026-08-12.md` §6, para
que no se pierda otra vez por estar clasificada como "financiera".

**Esfuerzo: M**

> **Remediado el 2026-08-14 (V7 §2) — RESUELTO, y un poco más de lo recomendado.** Las
> tres piezas: `prohibir_borrado_historico()` ahora cubre `reserva` y
> `reserva_participante` (con el mensaje ampliado para nombrar las cuatro tablas y sus
> salidas); `reserva_participante` tiene `id_usuario_modifico` y `fecha_modificacion`; y
> un trigger exige el autor cuando cambia `estado_asistencia`.
>
> **Además se enforzó la auditoría de `reserva`**, que el hallazgo señalaba como hueco
> sin pedir arreglo: sus columnas existían desde V1 y nada las exigía. Ahora un cambio de
> estado, fecha, hora o sala pide autor; tocar solo las notas, no.
> **La fecha la pone la base**, no quien edita: un sello que el cliente elige se puede
> antedatar, que es la mitad de DB-07.
>
> **Límite conocido, escrito en la migración:** el trigger exige que la columna no quede
> en NULL, no que la edición de hoy haya declarado su autor. Después de la primera
> edición auditada el campo queda cargado y una segunda que no lo toque pasa con el autor
> de la anterior. Cerrarlo del todo pide que la aplicación declare quién opera
> (`SET LOCAL app.usuario_actual`), que es una decisión de diseño del backend.
>
> **Verificado:** 6 casos nuevos en `pruebas-reglas-negocio.sql` (78-83) y 4 en
> `pruebas-adversariales.sql` (E08-E11). La regla quedó agregada a
> `docs/db/auditoria-2026-08-12.md` §2, con la aclaración de por qué se había perdido.

---

#### DB-02 — Anular un pago no deja autor, motivo ni fecha, en un esquema donde toda otra excepción sí los exige

**Severidad: Alto**

**Evidencia**

- Medido, sobre el esquema completo:
  ```
  INSERT INTO pago (... monto=100000, medio_pago='EFECTIVO', estado_pago='PAGADO');
  UPDATE pago SET estado_pago='ANULADO' WHERE id_pago = 1;   -> UPDATE 1
   estado_pago |   monto
  -------------+-----------
   ANULADO     | 100000.00
  ```
  Cien mil pesos salen del balance y la fila no dice quién lo hizo, cuándo, ni por qué.
- Las columnas no existen: `pago` (`V1__baseline.sql:395-452`) tiene
  `id_usuario_registra` y `fecha_registro` **del alta**, y nada del mismo tipo para la
  anulación. `estado_pago` admite `'ANULADO'` desde V1 (`:436`).
- Lo mismo con el otro mecanismo de reversa: `comprobante_invalido BOOLEAN` (`:425`) no
  lleva motivo ni autor, aunque la regla que lo justifica es explícita —
  `docs/requirements/platform.md:283`: *"**Los comprobantes no se eliminan: se marcan
  como inválidos.**"*
- **Y el esquema tiene una doctrina clara al respecto, que se cumple en todos los demás
  casos.** Cada excepción a una regla exige quién y/o por qué:
  | Excepción | Qué exige | Dónde |
  |---|---|---|
  | Liberar un premaster sin pago | motivo obligatorio + `id_usuario_libera` | `V1:566-567,544` |
  | Cobrar menos que la lista | `motivo_descuento` obligatorio | `V1:443-444` |
  | Resolver una reprogramación | quién resolvió **y** cuándo | `V1:382-384` |
  | Reprogramar una clase | `motivo_reprogramacion` + `id_usuario_modifico` | `V1:234,237` |
  | **Anular un pago** | **nada** | — |
- La auditoría del 12/08 tampoco lo vio: `ANULADO` aparece en ese documento solo como
  *ataque* (`:87`, anular el pago que respalda un premaster) y como *salida* (`:239`),
  nunca como operación que deba dejar rastro.

**Qué pasa hoy.** La operación más sensible de todo el sistema —hacer desaparecer plata
ya registrada del balance— es la única que no pide explicación.

**Impacto concreto.** V6 se escribió, entre otras cosas, para que un pago no se pudiera
borrar; el razonamiento textual era *"es historial de un negocio real"*. Pero anular
tiene, para el balance, el mismo efecto que borrar: el monto deja de contar. La
diferencia es que la fila queda, y esa fila **no sirve para reconstruir nada** porque no
dice nada. Con el rol `STAFF` habilitado a escribir (`@PuedeOperar`) y sin ningún log de
aplicación (SEC-02), una anulación hoy es completamente anónima. En un negocio donde
buena parte se cobra en efectivo, es exactamente el hueco por el que se cuela un
faltante de caja sin explicación.

**Recomendación.** Una migración chica que replique el patrón que el propio esquema ya
usa tres veces:

```sql
ALTER TABLE pago
    ADD COLUMN id_usuario_anula  BIGINT REFERENCES usuario (id_usuario),
    ADD COLUMN fecha_anulacion   TIMESTAMPTZ,
    ADD COLUMN motivo_anulacion  TEXT,
    ADD CONSTRAINT pago_anulacion_justificada
        CHECK (estado_pago <> 'ANULADO'
               OR (id_usuario_anula IS NOT NULL
                   AND fecha_anulacion IS NOT NULL
                   AND btrim(motivo_anulacion) <> ''));
```

Es el molde exacto de `solicitud_resolucion_completa`. Hacerlo **ahora**, mientras
`pago` tiene cero filas: con el Notion adentro habría que decidir qué poner en las filas
viejas. Y aplicar la misma idea a `comprobante_invalido`, que hoy tiene el mismo hueco.

**Esfuerzo: S**

> **Remediado el 2026-08-14 (V7 §1) — RESUELTO**, con las dos mitades: la anulación y el
> comprobante inválido, cada una con autor, fecha y motivo obligatorios.
>
> **Con una corrección al SQL propuesto, que un caso de prueba encontró:** escrito como
> `... AND btrim(motivo_anulacion) <> ''`, **la constraint no cerraba**. Un CHECK rechaza
> solo cuando evalúa a FALSE, y con el motivo en NULL `btrim(NULL) <> ''` da NULL, la
> condición entera da NULL, y una anulación con autor y fecha pero **sin motivo** pasaba
> igual. Va `coalesce(btrim(x), '') <> ''`. El caso que lo detectó quedó en las dos
> suites (75 y E05), porque es el tipo de error que se reintroduce sin que nadie lo note.
>
> **Verificado:** 5 casos en `pruebas-reglas-negocio.sql` (73-77) y 4 en
> `pruebas-adversariales.sql` (E04-E07). Y los tres casos que ya anulaban un pago
> (D02, D04, E03) se actualizaron para pasar autor y motivo: sin eso seguirían "fallando"
> pero por la constraint nueva y no por el trigger que atacan, que es el falso positivo
> que la cabecera de esas suites advierte.

---

#### DB-03 — `bloqueo_sala` tiene dos definiciones incompatibles de "bloqueo", y la más nueva rechaza bloqueos legítimos

**Severidad: Medio**

**Evidencia.** La misma fila se interpreta de dos formas distintas según quién la mire:

- **El trigger de V1 la lee como una franja horaria que se repite todos los días del
  rango.** `V1__baseline.sql:676-682` (y su reemplazo en `V6:358-364`):
  ```sql
  WHERE b.id_sala = NEW.id_sala
    AND NEW.fecha BETWEEN b.fecha_inicio AND b.fecha_fin
    AND NEW.hora_inicio < b.hora_fin
    AND NEW.hora_fin    > b.hora_inicio
  ```
- **El EXCLUDE de V6 la lee como un único intervalo continuo.**
  `V6__integridad_auditoria.sql:411-415`:
  ```sql
  ALTER TABLE bloqueo_sala ADD COLUMN periodo tsrange
      GENERATED ALWAYS AS (tsrange(fecha_inicio + hora_inicio, fecha_fin + hora_fin)) STORED;
  ALTER TABLE bloqueo_sala ADD CONSTRAINT bloqueo_sin_solapamiento
      EXCLUDE USING gist (id_sala WITH =, periodo WITH &&);
  ```

Las dos lecturas coinciden mientras el bloqueo dure **un solo día** o tome el día
completo. Divergen en cuanto hay rango de fechas *y* franja horaria parcial. Medido, en
una transacción revertida:

```
-- Mantenimiento en Sala 2, del 1 al 10 de septiembre, de 9 a 13.
INSERT INTO bloqueo_sala (...) VALUES (2,'2026-09-01','2026-09-10','09:00','13:00',...);
INSERT 0 1

-- Evento en Sala 2, el 3 y el 4, de 19 a 23. Ningun dia comparten franja.
INSERT INTO bloqueo_sala (...) VALUES (2,'2026-09-03','2026-09-04','19:00','23:00',...);
ERROR:  conflicting key value violates exclusion constraint "bloqueo_sin_solapamiento"
DETAIL:  Key (id_sala, periodo)=(2, ["2026-09-03 19:00:00","2026-09-04 23:00:00"))
         conflicts with existing key (2, ["2026-09-01 09:00:00","2026-09-10 13:00:00")).
```

Y que la lectura del trigger es la diaria también está medido: con ese mismo bloqueo de
9 a 13 cargado, una reserva **el 5 de septiembre de 15:00 a 16:00 entra** (`INSERT 0 1`)
y una de 10:00 a 11:00 se rechaza (*"La sala esta bloqueada en ese horario"*). O sea: el
sistema considera la sala libre a las 15:00 del día 5, y al mismo tiempo considera que
ese instante está dentro del bloqueo a los efectos del EXCLUDE.

**Por qué las 109 pruebas no lo ven.** Los cuatro casos que cargan un `bloqueo_sala`
—`pruebas-reglas-negocio.sql:196,204` y `pruebas-adversariales.sql:157-162,175-177`—
**omiten `hora_inicio` y `hora_fin` en todos los casos**, así que toman los DEFAULT
`00:00`/`23:59` (día completo), que es justo la combinación donde las dos definiciones
coinciden. El único caso multi-día (`B01`, 10–12 vs 11–15 de mayo) también es de día
completo. **Ninguno de los 109 casos usa un bloqueo con horario parcial en un rango de
más de un día**, que es la única forma de exponer la contradicción.

**Impacto concreto.** El pantallazo de "Bloqueo de sala" está especificado *"por rango
de fechas"* (`docs/requirements/platform.md:294`), así que el caso multi-día no es
exótico: es el caso principal de esa pantalla. El primer bloqueo parcial que Micaela
cargue sobre una semana ya bloqueada en otra franja va a ser rechazado por una regla que
no se está violando. Y —por DB-05— el mensaje que va a ver no dice nada de salas.
Ninguna de las dos definiciones corrompe datos; el costo es una operación legítima
imposible y un error incomprensible.

**Recomendación.** Elegir una definición y que la base entera la use. **La correcta es
la diaria**: es la que justifica que la tabla tenga cuatro columnas
(`fecha_inicio`/`fecha_fin` + `hora_inicio`/`hora_fin`) en vez de dos timestamps, y es
la que el negocio necesita (*"de 9 a 13 toda la semana que viene"*). Entonces el
EXCLUDE de V6 §10 no puede escribirse sobre un `tsrange` continuo. Dos salidas:

- **Simple:** restringir el EXCLUDE a solaparse solo cuando comparten rango de fechas
  *y* franja horaria, con `daterange(fecha_inicio, fecha_fin, '[]') WITH &&` **y**
  `timerange`-equivalente (Postgres no trae `timerange`; se arma con
  `CREATE TYPE ... AS RANGE (subtype = time)`, que es una línea de migración).
- **Más simple todavía, y probablemente suficiente:** aceptar que dos bloqueos
  superpuestos no rompen nada —el propio comentario de V6 §10 lo dice: *"no es tan grave
  como los anteriores... bloquean lo mismo, no se contradicen"*— y **bajar la regla a un
  índice de detección**, dejando la deduplicación a la consulta del calendario.

Cualquiera de las dos, más un caso de prueba con bloqueo multi-día y horario parcial en
cada una de las dos suites: es el agujero por el que se coló esto.

**Esfuerzo: S**

> **Remediado el 2026-08-14 (V7 §3) — RESUELTO por la salida "simple", no por la más
> simple.** Se eligió la definición diaria, como recomienda el hallazgo, y se reescribió
> el `EXCLUDE` sobre **dos dimensiones**: `daterange(fecha_inicio, fecha_fin, '[]')` y una
> `rango_horario(hora_inicio, hora_fin, '[)')`, con el tipo de rango de `time` creado en
> la migración. Los corchetes no son cosméticos: replican exactamente cómo leen la fila
> los dos triggers (`BETWEEN` para las fechas, `<` para las horas).
>
> **No se bajó a índice de detección** —la otra salida que ofrecía el hallazgo— porque el
> `EXCLUDE` es la única forma que aguanta concurrencia, que es el mismo argumento por el
> que existe el de `reserva`. Perder eso para arreglar un falso rechazo era pagar de más.
>
> **Un efecto que hubo que evitar sobre la marcha:** con las expresiones desnudas, las
> columnas generadas nuevas explotaban con los límites al revés y le robaban el mensaje a
> `bloqueo_rango_horas_valido` —el mismo fenómeno de DB-11—. Devuelven NULL vía `CASE`,
> así que los CHECK de V1 siguen siendo los que hablan.
>
> **Verificado con el escenario exacto del hallazgo:** el bloqueo de 9 a 13 del 1 al 10
> de septiembre y el evento de 19 a 23 del 3 al 4 **ahora conviven**; uno que sí pisa días
> y franja se rechaza; y la reserva del 5 a las 15:00 sigue entrando, que es donde las dos
> lecturas se contradecían. Casos 68-72 en `pruebas-reglas-negocio.sql` y B05-B06 en
> `pruebas-adversariales.sql`.

---

#### DB-04 — Otras dos reglas duras de la propuesta no tienen constraint, y tampoco figuran en la lista de faltantes

**Severidad: Medio**

**Evidencia.** Las dos están en la misma lista de **"Reglas duras ✅"** que DB-01, o sea
confirmadas con el cliente, y las dos se verificaron ausentes ejecutando:

**(a) "No se asigna horario sin seña o pago registrado"** — `docs/requirements/platform.md:274`,
reforzada en `:39` con la frase textual del cliente: *"Si no hay seña, el horario queda
libre."* Es la regla de cobro del negocio.
```
INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
VALUES (2,1,'2027-03-02','10:00','11:30');   -> INSERT 0 1
```
Sin ningún pago asociado. No hay constraint, no hay trigger, y la relación va al revés
(`pago.id_reserva`, `V1:401`), así que la base no tiene por dónde exigirlo en el INSERT.

**(b) "El nivel actual no puede retroceder sin autorización de un administrador"** —
`docs/requirements/platform.md:276`.
```
UPDATE inscripcion SET nivel='AVANZADO' ...   -> UPDATE 1
UPDATE inscripcion SET nivel='INICIAL'  ...   -> UPDATE 1
```
`inscripcion_nivel_valido` (`V1:195-196`) valida el **valor**, no la **transición**. El
esquema ya sabe expresar transiciones —lo hace dos veces, en
`verificar_avance_estado_trabajo` y `verificar_avance_estado_release`— y esta se quedó
afuera.

**Ninguna de las dos está en `docs/db/auditoria-2026-08-12.md` §6**, cuya lista de
reglas sin implementar tiene cinco entradas y son otras cinco. La fila más cercana
—*"Los estados de reserva/pago/inscripción solo avanzan | 🟡 No existe tal regla"*
(`:71`)— habla de `estado`, no de `nivel`, y concluye que la regla no existe; acá la
regla sí existe y está confirmada.

**Impacto concreto.** (a) es la que le da sentido comercial al Módulo 2: hoy nada impide
ocupar una franja sin seña, que es el problema que el relevamiento describe. Realista
imponerla en la base es discutible —el orden de inserción no lo permite—, pero entonces
tiene que quedar escrito **dónde** vive, y hoy no vive en ningún lado ni figura como
pendiente. (b) es menor en plata y directa en confianza: un nivel que baja sin
autorización cambia lo que el alumno cursa.

**Recomendación.** No implementarlas a ciegas: **agregarlas primero a la lista de reglas
sin dueño** de `docs/db/auditoria-2026-08-12.md` §6, junto con las cinco que ya están y
con las de DB-01. Después, por separado: (b) sale con un trigger del mismo molde que los
dos que ya existen; (a) es una regla de servicio, no de base —la reserva se crea junto
con su seña en una transacción—, y lo que hay que decidir antes es P8 (*"autorización
explícita"*), que sigue abierto.

**Esfuerzo: M**

> **Remediado el 2026-08-14 — la parte que correspondía hacer. Sigue ABIERTO como regla.**
> Las dos entran ahora en `docs/db/auditoria-2026-08-12.md` §6 (entradas 6 y 7) y en su
> tabla de garantías, con lo que falta decidir escrito al lado: para (a), que **no va a
> vivir en la base** —la relación va al revés y la reserva se crea junto con su seña, en
> una transacción— y que depende de P8; para (b), que la mitad mecánica es un trigger del
> molde que ya existe y lo que falta definir es qué significa "sin autorización de un
> administrador", porque la base no sabe quién opera.
>
> `V7` las deja explícitamente afuera, con el motivo escrito en su cabecera. Se
> implementan cuando esas dos decisiones estén tomadas, no antes.

---

#### DB-05 — Las reglas de la base son inusables desde la API: el trigger sale 500 y el CHECK sale como "email o teléfono duplicado"

**Severidad: Medio** · *hoy no se observa; se vuelve visible con el primer endpoint del Módulo 2*

**Evidencia**

- La base rechaza con tres mecanismos distintos, y cada uno llega a Java con un SQLSTATE
  distinto: CHECK → `23514`, EXCLUDE → `23P01`, FK → `23503`, y **`RAISE EXCEPTION` de
  plpgsql → `P0001`**.
- Spring traduce por clase de SQLSTATE. La clase `23` cae en
  `DataIntegrityViolationException`; la clase `P0` no está en ninguna de las listas de
  `SQLStateSQLExceptionTranslator` y termina en `UncategorizedSQLException`.
- `apps/backend/.../web/ManejadorDeErrores.java:92-98` tiene **un solo handler** para
  todo el grupo `23`, con el mensaje fijo:
  ```java
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ProblemDetail choqueDeUnicidad(DataIntegrityViolationException e) {
      ... HttpStatus.CONFLICT, "Ese email o ese teléfono ya están registrados.");
  ```
  y **ningún** handler para `UncategorizedSQLException`.
- O sea: los **55 CHECK, 2 EXCLUDE y 46 FK** de la base salen como *"Ese email o ese
  teléfono ya están registrados"*, y los **10 triggers** —donde vive lo más importante:
  sala bloqueada, premaster sin pago, estados que no retroceden, historial que no se
  borra— salen como **500**.

**Qué pasa hoy.** Nada, y por eso hay que anotarlo ahora: los únicos endpoints que
escriben tocan `usuario` y `alumno`, donde la única violación alcanzable es justamente
la de email/teléfono repetido, así que el mensaje fijo acierta. Se revisó si algún otro
CHECK es alcanzable por la API y no lo es: `usuario_nombre_no_vacio` y
`usuario_email_no_vacio` los ataja antes Bean Validation (`@NotBlank`),
`usuario_telefono_no_vacio` lo ataja `UsuarioService.normalizar()` (`:201-207`), y los
enums los ataja Jackson con un 400.

**Impacto concreto.** El Módulo 2 —el corazón operativo, septiembre— es el primero que
escribe en `reserva`. El día que exista, *"esa sala ya está ocupada a esa hora"* le va a
llegar a Micaela como **"Ese email o ese teléfono ya están registrados"**, y *"la sala
está bloqueada por mantenimiento"* como un **500** sin mensaje. Las dos son operaciones
diarias, no casos de borde. Y el efecto de segundo orden es peor: el mensaje útil existe
—los triggers están escritos con textos claros y específicos, *"La sala esta bloqueada
en ese horario (reserva 2026-09-05 10:00-11:00)"*— y se pierde entero en la traducción.
Todo el trabajo de escribir buenos errores en la base queda invisible.

**Recomendación.** Dos handlers en `ManejadorDeErrores`, antes de que exista el primer
endpoint que los necesite:

1. Separar el grupo `23` por SQLSTATE y por nombre de constraint. El nombre viaja en la
   excepción de pgjdbc (`PSQLException.getServerErrorMessage().getConstraint()`), y las
   constraints de este esquema están **muy bien nombradas** justamente para esto
   (`reserva_sin_solapamiento`, `reserva_uso_permitido_en_sala`, `pago_tiene_destino`…):
   un mapa `nombre → mensaje` cubre los casos que el usuario puede provocar y deja el
   texto genérico solo como último recurso.
2. Un handler para `UncategorizedSQLException` que, cuando el SQLSTATE sea `P0001`,
   devuelva **el mensaje del trigger** con un 409 en vez de un 500. Los mensajes ya están
   redactados para que los lea una persona; conviene revisarlos con esa idea antes de
   exponerlos.

**Esfuerzo: S**

> **Remediado el 2026-08-14 — RESUELTO, con una corrección al diagnóstico.**
> `violacionDeIntegridad` resuelve el mensaje por nombre de constraint (mapa de 16
> entradas, que crece con cada módulo) y elige el estado por SQLSTATE: 409 para `23505`
> y `23P01` —chocar con algo que ya existe—, 400 para el resto —un dato que la base
> rechaza no es un conflicto—. Sin traducción no inventa: dice lo único que sabe y manda
> el detalle al log.
>
> **La corrección:** el handler para los triggers no se registró sobre
> `UncategorizedSQLException` sino sobre `DataAccessException`. Por el camino de JPA —que
> es el que usan los repositorios, y por lo tanto el real— un `P0001` **no** llega como
> `UncategorizedSQLException`: Hibernate lo convierte en `GenericJDBCException` y Spring
> en `JpaSystemException`. Las dos son `DataAccessException`, así que el handler más
> general las cubre a las dos, y Spring sigue eligiendo el específico para las
> violaciones de integridad. El nombre de la constraint se le pregunta primero a
> Hibernate (que lo trae tipado) y si no, se lee del texto de Postgres, que es el camino
> de `JdbcTemplate`. **No hizo falta compilar contra pgjdbc**, que sigue en `runtime`.
>
> **Verificado ejecutando contra la base real** (`ErroresDeLaBaseTest`, 5 casos, dentro
> de transacciones que se descartan): sala bloqueada → 409 con el texto del trigger y sin
> el `Where: PL/pgSQL function` que agrega el driver; dos reservas solapadas → *"Esa sala
> ya está ocupada en ese horario"*; un CHECK → 400 con su mensaje; un rechazo sin
> constraint nombrada → texto genérico honesto en vez de uno sobre emails; y el choque de
> email por el camino de Hibernate → *"Ya existe una cuenta con ese email"*.
> Los cuatro primeros fallaban antes del arreglo.

---

#### DB-06 — El DBML advierte sobre diferencias con el esquema que ya no existen

**Severidad: Bajo** · *corrige una afirmación del Anexo de la Fase 2*

**Evidencia.** `docs/db/la_juanita_schema.dbml.txt:8-13` encabeza con:

> *"⚠️ ESTE DIAGRAMA NO REFLEJA V3..V6. Las diferencias que importan para leer el
> diagrama son: · **V4**: `nombre_completo` se partió en `nombre` + `apellido`.
> · **V5**: se agregó `usuario.debe_cambiar_password`. · V6: 12 CHECK nuevos…"*

Pero el diagrama **ya las incorpora**. `:76-78,88` — la tabla `usuario` del DBML tiene
`nombre varchar(80)`, `apellido varchar(80) [note: 'Separado del nombre (V4)…']` y
`debe_cambiar_password boolean [note: '…(V5)']`, y **no** tiene `nombre_completo`.

Se comparó **tabla por tabla y columna por columna** el DBML contra el catálogo de la
base con las seis migraciones aplicadas: **22 tablas de un lado y 22 del otro, sin
sobrantes ni faltantes de ninguno de los dos lados**, y una sola diferencia de columna
en todo el modelo: `bloqueo_sala.periodo`, la columna generada que V6 agregó para el
EXCLUDE, que el diagrama no tiene y la cabecera tampoco menciona (nombra el EXCLUDE,
no la columna).

**Qué pasa hoy.** El documento se subestima. Está al día salvo por una columna generada,
y su cabecera le dice al lector que no confíe en él para dos cosas en las que sí puede.

**Impacto concreto.** Bajo, pero con dirección: la cabecera invita a "corregir" el
diagrama volviendo a `nombre_completo`, que es el error opuesto al que quiso prevenir.
Y en el balance de esta auditoría corrige una afirmación propia: **el Anexo de la Fase 2
elogió este archivo por "saber que quedó atrás y decirlo bien"** — esa conclusión salió
de leer la cabecera, no de comparar el contenido. La cabecera dice más de lo que
corresponde.

**Recomendación.** Reescribir `:8-13` con lo que la comparación arroja: el diagrama
refleja el esquema hasta V6 salvo `bloqueo_sala.periodo`; lo que no puede mostrar son
las constraints y los triggers, que es lo que las líneas `:20-30` ya explican bien.

**Esfuerzo: XS**

> **Remediado el 2026-08-14 — RESUELTO.** Comparación confirmada de forma independiente
> antes de tocar nada (el informe es una entrada, no una orden): el DBML ya trae
> `nombre`/`apellido` y `debe_cambiar_password`, y no tiene `nombre_completo`. Cabecera
> reescrita, y **se agregó `bloqueo_sala.periodo`** —una línea— en vez de dejar la
> excepción escrita: el archivo ya declara `reserva.periodo`, así que era la
> inconsistencia y no una limitación.

---

#### DB-07 — `venta_equipo` es la única tabla de dinero sin sello de carga: una venta se puede antedatar sin dejar rastro

**Severidad: Bajo**

**Evidencia.** De las cinco tablas que mueven plata, cuatro distinguen la **fecha del
hecho** de la **fecha de carga**, y una no:

| Tabla | Fecha del hecho | Sello de carga |
|---|---|---|
| `pago` | `fecha_pago DATE` | `fecha_registro TIMESTAMPTZ` (`V1:427`) |
| `egreso` | `fecha_egreso DATE` | `fecha_registro TIMESTAMPTZ` (`V1:470`) |
| `inscripcion` | `fecha_inicio DATE` | `fecha_creacion TIMESTAMPTZ` (`V1:191`) |
| `trabajo_mastering` | `fecha_entrega_real DATE` | `fecha_creacion TIMESTAMPTZ` (`V1:547`) |
| **`venta_equipo`** | `fecha_venta DATE` | **ninguna** (`V1:481-503`) |

Verificado contra el catálogo: `venta_equipo` no tiene **ninguna** columna
`timestamp`/`timestamptz`.

**Qué pasa hoy.** `fecha_venta` tiene `DEFAULT CURRENT_DATE`, pero es editable: una venta
se puede cargar hoy con fecha del mes pasado y no queda nada que lo contradiga.

**Impacto concreto.** Chico en volumen —la venta de equipos es la línea más chica del
negocio— y con una particularidad que lo empeora: `venta_equipo` es también una de las
dos tablas que V6 §7 dejó **fuera** de la prohibición de borrado, decisión declarada y
pendiente (`V6:222-226`, `auditoria-2026-08-12.md:236-240`). Entre las dos cosas, es la
tabla de dinero con menos garantías del esquema: se puede antedatar y se puede borrar.

**Recomendación.** `ADD COLUMN fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now()`, en la
misma migración que resuelva la anulación pendiente de esa tabla. Es una línea y cierra
la mitad del hueco sin esperar la decisión de negocio.

**Esfuerzo: S**

> **Remediado el 2026-08-14 (V7 §4) — RESUELTO la mitad que no depende de una decisión.**
> La columna existe. **Sigue abierta la otra mitad**: `venta_equipo` no tiene forma de
> anularse, que es por lo que V6 §7 la dejó fuera de la prohibición de borrado, y darle un
> estado de anulación es una decisión de negocio. Queda anotada en
> `docs/db/auditoria-2026-08-12.md` §6.4, donde ya estaba.
> **Verificado:** caso 84 en `pruebas-reglas-negocio.sql`.

---

#### DB-08 — Seis nombres distintos para "cuándo se creó esta fila"

**Severidad: Bajo**

**Evidencia.** Del catálogo, las columnas `timestamptz` que registran el alta de la fila:

| Nombre | Tablas |
|---|---|
| `fecha_creacion` | `usuario`, `inscripcion`, `reserva`, `nota_profesor`, `notificacion`, `release`, `trabajo_mastering` |
| `fecha_registro` | `bloqueo_sala`, `pago`, `egreso`, `reserva_participante` |
| `fecha_alta` | `artista` |
| `fecha_carga` | `contrato_sello` |
| `fecha_subida` | `material` |
| `fecha_actualizacion` | `seguimiento_alumno` |

Y cinco tablas no tienen ninguna: `alumno`, `profesor`, `sala`, `tipo_uso`,
`sala_tipo_uso` (las tres últimas son catálogo semiestático, así que ahí es razonable;
`alumno` y `profesor` no tienen fecha de creación de la relación — `alumno.fecha_ingreso`
es un `DATE` de negocio, editable).

**Impacto concreto.** Ninguno funcional. Cuesta cuando se escriba el módulo 8: cualquier
consulta de "qué se cargó este mes" tiene que acordarse de qué columna usa cada tabla, y
es el tipo de detalle que produce un reporte incompleto sin ningún error a la vista.

**Recomendación.** No vale una migración de renombre sobre tablas ya creadas. Sí vale
**fijar `fecha_creacion` como el nombre para toda tabla nueva** en `CLAUDE.md`, junto a
las convenciones del esquema, y dejar anotada la equivalencia de las cinco excepciones.
Si en algún momento hay otra migración sobre esas tablas, se renombran de paso.

**Esfuerzo: S**

> **Remediado el 2026-08-15 (tanda 8) — RESUELTO tal cual la recomendación: sin migración
> de renombre.** `CLAUDE.md` fija **`fecha_creacion`** (`TIMESTAMPTZ NOT NULL DEFAULT
> now()`) para toda tabla nueva, con la tabla de equivalencias de las cinco excepciones y
> la regla de qué hacer si otra migración toca alguna de ellas.
>
> **Verificado contra las migraciones y no contra el informe** (`grep` sobre
> `db/migration/*.sql`): 10 usos de `fecha_creacion`, 7 de `fecha_registro`, y uno de cada
> uno de los otros cuatro. El inventario del hallazgo estaba bien.
>
> Se dejó anotado además lo que el hallazgo señala al pasar y es lo único con filo:
> **`alumno` y `profesor` no tienen sello de creación de la relación**, y
> `alumno.fecha_ingreso` **no** sirve para eso — es un `DATE` de negocio, editable, que
> contesta otra pregunta.

---

#### DB-09 — Tres de los cuatro destinos de `pago` no tienen índice, y uno de ellos respalda dos triggers activos

**Severidad: Bajo**

**Evidencia.** `pago_tiene_destino` (`V1:449-451`) obliga a que todo pago apunte a
exactamente uno de cuatro destinos. Solo uno de los cuatro está indexado:

- `pago_por_inscripcion` existe (`V1:933-934`), con su motivo escrito.
- `pago (id_reserva)`, `pago (id_trabajo_mastering)` y `pago (id_venta_equipo)` no
  existen — verificado en `pg_indexes`.

De los tres, **`id_trabajo_mastering` no es hipotético**: lo consultan dos triggers que
ya están activos, `verificar_liberacion_premaster` (`V1:815-818`) y
`proteger_pago_de_premaster` (`V6:189-194`), el segundo en **cada UPDATE y cada DELETE de
`pago`**. Sin índice, cada uno de esos triggers recorre `pago` entera.

Un detalle aparte, del mismo orden: `pago_deudores` (`V1:455`) indexa `estado_pago`
filtrando por `estado_pago`, así que la clave del índice no aporta información —todas sus
filas tienen el mismo puñado de valores—. Con `id_usuario` o `fecha_pago` como clave, el
mismo índice parcial serviría además para "las deudas de esta persona" y "las vencidas
más viejas", que son las dos consultas que el Módulo 3 va a hacer.

**Impacto concreto.** Hoy, ninguno: `pago` tiene cero filas y va a tener cientos por año,
no millones. La decisión general de V1 —*"acá van únicamente las que respaldan una
consulta concreta"* (`:911-917`)— es la correcta y no hay que revertirla. Lo que se
señala es la excepción: un índice que respalda dos triggers **ya escritos** entra en esa
propia definición.

**Recomendación.** Agregar `CREATE INDEX pago_por_trabajo ON pago (id_trabajo_mastering)
WHERE id_trabajo_mastering IS NOT NULL`, con el mismo comentario de motivo que los demás.
Los otros dos, cuando existan los módulos que los consulten. Y evaluar cambiar la clave
de `pago_deudores`.

**Esfuerzo: XS**

> **Remediado el 2026-08-14 (V7 §5) — RESUELTO el índice; la clave de `pago_deudores`
> queda abierta.** El índice está, con el motivo escrito: la consulta que respalda no es
> hipotética, corre en cada UPDATE y cada DELETE de `pago` dentro de
> `proteger_pago_de_premaster()`. Los otros dos destinos siguen sin índice a propósito,
> hasta que existan los módulos que los consulten — que es la doctrina de `V1:911-917` y
> está bien.

---

#### DB-10 — El esquema ya cerró por construcción una pregunta que el relevamiento tiene abierta

**Severidad: Informativo**

`reserva_horas_validas` (`V1:249`) exige `hora_fin > hora_inicio`, y `reserva` guarda
`fecha DATE` + dos `TIME`. La consecuencia es que **ninguna reserva puede cruzar la
medianoche**: una cabina alquilada de 22:00 a 02:00 no se puede cargar como una fila.

`docs/requirements/platform.md:322` tiene abierta la pregunta **P11 — *"¿Horario de
apertura del estudio? El calendario necesita saber de qué hora a qué hora se puede
reservar. Ghezz llega 8–9 AM; **hay profes hasta la noche**"***. La base ya respondió una
parte de esa pregunta sin que nadie la decidiera.

No es un defecto: para una academia que cierra a la noche es exactamente lo que se
quiere, y el modelo `DATE` + `TIME` es el correcto para agendar en hora de pared. Se
anota porque cuando P11 se le pregunte al cliente, **la respuesta "sí, a veces se usa
después de las 12" implica una migración**, no un ajuste de pantalla: habría que permitir
`hora_fin < hora_inicio` y rehacer `periodo`, el EXCLUDE y los dos triggers de sala.
Conviene incluir la pregunta explícitamente cuando se cierre P11.

---

#### DB-11 — `reserva_horas_validas` es una constraint que no se llega a evaluar nunca

**Severidad: Bajo** · *encontrado el 2026-08-14, remediando DB-05*

**Evidencia.** `reserva` tiene una columna generada y un CHECK que hablan de lo mismo:

- `V1__baseline.sql:243-244`: `periodo tsrange GENERATED ALWAYS AS (tsrange(fecha + hora_inicio, fecha + hora_fin)) STORED`
- `V1__baseline.sql:249`: `CONSTRAINT reserva_horas_validas CHECK (hora_fin > hora_inicio)`

Postgres computa la columna generada **antes** de evaluar los CHECK, y `tsrange()`
rechaza un rango invertido por su cuenta. Medido, en una transacción revertida:

```
INSERT INTO reserva (id_sala,id_tipo_uso,fecha,hora_inicio,hora_fin)
VALUES (1,1,DATE '2027-04-07',TIME '20:00',TIME '19:00');
ERROR:  range lower bound must be less than or equal to range upper bound
```

El CHECK nunca se dispara: el error que llega es un `data_exception` (SQLSTATE clase
`22`), **sin nombre de constraint y sin mencionar las horas**. Lo mismo pasa con
`bloqueo_sala` desde que V6 le agregó su propia columna generada, pero solo cuando
`fecha_inicio = fecha_fin`; con un rango de más de un día el CHECK sí se evalúa
(verificado: un bloqueo del 3 al 4 de mayo de 13:00 a 09:00 lo rechaza
`bloqueo_rango_horas_valido`).

**Impacto concreto.** Bajo hoy, molesto en septiembre. Sin nombre de constraint, el mapa
de `ManejadorDeErrores` no lo puede traducir y sale el texto genérico: cargar mal un
horario en el Módulo 2 va a contestar *"Esa operación no cumple una regla del sistema"*
en vez de *"la hora de fin tiene que ser posterior a la de inicio"*. El mensaje bueno
existe y es inalcanzable, que es exactamente el patrón de DB-05 una capa más abajo.

**Recomendación.** No es una migración: validar el orden de las horas en Bean Validation,
antes de que el INSERT salga, cuando exista el DTO de reserva. Y anotar en `V1` —en un
comentario nuevo, no editando la migración— que el CHECK es defensa en profundidad y no
la vía de error visible.

**Esfuerzo: XS**

> **Remediado el 2026-08-14 — PARCIAL, y a propósito.** Documentado en la cabecera de `V7`
> y en `docs/db/auditoria-2026-08-12.md` §6.8, y **evitado donde todavía se podía**: las
> dos columnas generadas que V7 agrega a `bloqueo_sala` devuelven NULL vía `CASE` en vez
> de explotar, así que ahí los CHECK de V1 siguen siendo los que dan el mensaje. En
> `reserva` no se puede: la columna generada viene de V1 y no se edita una migración
> aplicada. **Queda pendiente** validar el orden de las horas en el DTO, que no existe
> hasta el Módulo 2.

---

### 3.3 SEC — Seguridad

Alcance verificado: emisión y validación del JWT, resolución de autoridades, matriz de
permisos endpoint por endpoint, secretos y su mitigación, superficie de login, DTO y
validación de entrada, manejo de errores, consultas, dependencias, y el lado del
frontend (almacenamiento del token, cierre de sesión, superficie de XSS). Se corrió
`mvn test` (57/57) y `npm audit`. Lo que no se cubrió está en §6.2.

| ID | Título | Sev | Esf |
|---|---|:--:|:--:|
| SEC-01 | El bloqueo que impide firmar con el secreto público depende de un nombre de perfil que el deploy previsto no usa | Alto | XS |
| SEC-02 | Login y registro sin límite de intentos **y sin ningún registro de eventos**: no hay defensa ni rastro | Alto | M |
| SEC-03 | No existe ningún camino para recuperar una contraseña; el que la documentación describe no está implementado | Alto | S |
| SEC-04 | Un ADMIN puede quitarse el rol a sí mismo y dejar el sistema sin administrador | Medio | S |
| SEC-05 | El frontend no implementa el eje de escritura: `DIRECTIVO` ve y clickea botones que el backend le niega | Medio | S |
| SEC-06 | El registro público confirma si un teléfono ya tiene cuenta, y esa filtración nunca se decidió | Bajo | XS |
| SEC-07 | Ninguna de las dos apps declara CSP ni cabeceras de seguridad propias | Bajo | S |
| SEC-08 | BCrypt en el costo mínimo, y la contraseña temporal no vence nunca | Bajo | S |
| SEC-09 | `Busqueda` escapa los comodines de `LIKE` y ninguna consulta declara `ESCAPE` | Bajo | XS |

---

#### SEC-01 — El bloqueo que impide arrancar con el secreto público depende de un nombre de perfil que el deploy previsto no usa

**Severidad: Alto** · *depende de EXT-01: con el repositorio público, el secreto no es
"conocido por quien tiene acceso al repo", es conocido por cualquiera*

**Evidencia**

- `apps/backend/src/main/java/com/lajuanita/backend/config/SeguridadConfig.java:101-118`:
  ```java
  if (SECRETO_DE_DESARROLLO.equals(propiedades.secreto())) {
      boolean pareceProduccion = Arrays.stream(ambiente.getActiveProfiles())
              .anyMatch(perfil -> perfil.equalsIgnoreCase("prod")
                      || perfil.equalsIgnoreCase("produccion"));
      if (pareceProduccion) { throw new IllegalStateException(...); }
      log.warn("⚠️  Firmando los tokens con el secreto JWT de DESARROLLO...");
  }
  ```
- **Sin perfil activo, solo advierte.** Verificado en la corrida de esta sesión: la
  aplicación arrancó y firmó tokens con el secreto commiteado, dejando únicamente
  `WARN c.l.backend.config.SeguridadConfig : Firmando los tokens con el secreto JWT
  de DESARROLLO` (log de `mvn test`, 22:23:40.189).
- **Nada en el repo activa un perfil.** `ls src/main/resources/` → un solo
  `application.properties`; no existe `application-prod.properties` ni ningún
  `spring.profiles.active`. El deploy previsto (`docs/sistema-gestion-plan.md:159`,
  *"Un solo servidor propio (VPS) con Docker Compose + proxy con HTTPS"*) no menciona
  perfiles en ningún lado.
- La documentación presenta la mitigación como completa: `README.md:175-181` y
  `CLAUDE.md:157` — *"se niega a arrancar si detecta un perfil de producción activo"*.
  Es literalmente cierto y **operativamente vacío**: el escenario que hay que atrapar
  es el del que se olvidó de configurar algo, y el candado exige haber configurado otra cosa.
- El secreto del repo es **el único que existió**: se revisaron los 20 commits
  (`git rev-list --all` sobre `application.properties`) y aparece un solo valor. Rotar
  es rotar uno.

**Qué pasa hoy.** Un `docker compose up` del backend en el VPS, sin variables de
entorno, arranca perfectamente, firma tokens con la clave publicada en GitHub y deja
una línea de `WARN` entre cientos de líneas de arranque de Spring. El sistema queda en
producción con una clave que cualquiera puede leer y nadie se entera.

**Impacto concreto.** Con esa clave se fabrica un token con `sub` = 1 y se entra como
el `ADMIN` sembrado sin conocer ninguna contraseña — y como la autorización se resuelve
contra la base (que es lo correcto), el token falso hereda el rol real de ese id. A
partir de ahí: listado completo de alumnos con nombre, apellido, email y teléfono, alta
y baja de cuentas, y en cuanto existan los módulos de dinero, los pagos. **La única
barrera hoy es que Ignacio se acuerde de exportar `JWT_SECRET` el día del deploy** — y
el mecanismo que existe justamente para cubrir ese olvido no lo cubre.

**Recomendación.** Invertir el default: **fallar cerrado**. El secreto de desarrollo se
acepta solo si alguien lo pide explícitamente, y ese permiso vive en el
`application.properties` del repo, que es lo que un deploy no copia:

```properties
# Solo desarrollo local. Ningún entorno accesible desde afuera debe tener esta línea.
lajuanita.jwt.permitir-secreto-de-desarrollo=true
```

y en `SeguridadConfig:101`, si el secreto es el de desarrollo y la propiedad no está en
`true`, lanzar la excepción que hoy solo se lanza con perfil `prod`. Así, cualquier
entorno que no haya copiado ese archivo tal cual —o que lo haya copiado y se olvide de
borrar la línea, que es un olvido visible— falla al arrancar en vez de fallar en
silencio. Complementario, no sustituto: rotar el secreto (EXT-01, punto 3).

**Esfuerzo: XS**

> **Remediado el 2026-08-14 — RESUELTO.** Implementado tal cual: `PropiedadesJwt` toma
> `permitirSecretoDeDesarrollo`, `SeguridadConfig.claveDeFirma` lanza si el secreto es el
> commiteado y esa propiedad no está en `true`, y se borró la rama del perfil `prod`, que
> ya no aportaba nada. El permiso quedó en `application.properties` con el porqué escrito
> al lado. **Verificado:** `SecretoDeDesarrolloTest`, 4 casos, incluido el que fallaba
> antes del arreglo. Documentación corregida en `README.md`, `CLAUDE.md` y `plan:344`.
> **Sigue pendiente lo que no es código: rotar el secreto** (EXT-01, punto 3).

---

#### SEC-02 — Login y registro sin límite de intentos, y sin ningún registro de eventos de autenticación

**Severidad: Alto** · *la falta de límite está declarada como deuda; la falta de logs no*

**Evidencia**

- No existe ningún control de frecuencia: `grep -rn "RateLimit\|Bucket\|bucket4j\|Resilience"`
  sobre `apps/backend/src` no devuelve nada, `pom.xml` no declara ninguna dependencia
  de ese tipo, y `SeguridadConfig.java:156-185` no registra ningún filtro propio.
- **La aplicación entera tiene una sola línea de log**: `SeguridadConfig.java:114`, la
  advertencia del secreto. Verificado con
  `grep -rn "log\.\(info\|debug\|warn\|error\)" apps/backend/src/main/java` → un solo
  resultado. No hay `@Slf4j` en ninguna otra clase.
- Un login fallido no deja ningún rastro: `SesionService.java:79-90` lanza
  `CredencialesInvalidasException` sin registrar nada. `usuario.ultimoAcceso` se escribe
  **solo en el camino exitoso** (`:92`).
- `POST /api/auth/registro` es público (`SeguridadConfig.java:168`) y **escribe filas**
  (`UsuarioService.java:52-71`).
- Declarado como deuda en `docs/sistema-gestion-plan.md:510`: *"Sin límite de intentos
  en login ni en registro. El registro además escribe."* — la deuda de logging no está
  en esa lista ni en ninguna otra.

**Qué pasa hoy.** Un script puede probar contraseñas contra `/api/auth/login` a la
velocidad que aguante el servidor —BCrypt en costo 10 pone el techo en unos 11 intentos
por segundo por núcleo, no en cero— y **no queda constancia de nada**. Contra
`/api/auth/registro`, el mismo script crea usuarios hasta llenar el disco.

**Impacto concreto.** Dos cosas distintas, y la segunda es la peor. **(a)** El día que
el sistema esté en internet, la contraseña más débil de las ~80 cuentas migradas del
Notion es la puerta de entrada, y no hay nada que frene el intento número diez mil.
**(b)** Sin logs, si mañana alguien pregunta *"¿entraron a la cuenta de Micaela?"*, la
respuesta que el sistema puede dar es **ninguna**: no hay registro de intentos fallidos,
ni de intentos exitosos con IP, ni de cambios de rol, ni de bajas de cuenta. Eso también
choca con el deber de seguridad y confidencialidad que la Ley 25.326 le impone a quien
administra datos personales de terceros (arts. 9 y 10) — y acá se van a administrar los
de ~80 alumnos con nombre, teléfono y, más adelante, historial de pagos.

**Recomendación.** Dos piezas, en este orden:

1. **Un filtro de frecuencia** delante de `/api/auth/login`, `/api/auth/registro` y
   `/api/me/password`, con contador por IP **y** por email (solo por IP no sirve: un
   ataque distribuido lo esquiva; solo por email tampoco: permite barrer direcciones).
   A esta escala alcanza un `ConcurrentHashMap` con ventana deslizante o una caché de
   Caffeine: no hace falta Redis ni Bucket4j. Devolver 429 con el mismo `ProblemDetail`
   del resto de la API.
2. **Un log de eventos de autenticación**: login exitoso, login fallido, cambio de
   contraseña, cambio de rol y baja de cuenta, cada uno con timestamp, IP y el id del
   usuario afectado. **Nunca la contraseña, nunca el token, nunca la contraseña temporal**
   de `UsuarioCreado` (`dto/UsuarioCreado.java:11` ya lo advierte). Si se quiere que
   sobreviva a un reinicio del contenedor, una tabla `evento_seguridad` — pero
   empezar por el log.

**Esfuerzo: M**

> **Remediado el 2026-08-14 — RESUELTO.** Las dos piezas, en el orden que pedía.
>
> **El límite quedó partido en dos, y no por comodidad:** el de IP en
> `FiltroDeFrecuencia`, que corre **antes** de la cadena de Spring Security —una avalancha
> no tiene por qué llegar a validar tokens para recién ahí ser rechazada—; el de email en
> `SesionService`, porque el email viaja en el cuerpo y leerlo desde un filtro obliga a
> envolver el request a cambio de nada. Un login exitoso limpia el contador del email, así
> que quien sabe su contraseña nunca lo ve. `ConcurrentHashMap` con ventana deslizante,
> sin Redis ni Bucket4j: a esta escala el problema era que no hubiera ninguno.
>
> **Contracara documentada en el código:** quien conoce el email de otro puede dejarlo
> bloqueado 15 minutos fallando a propósito. Es el precio de la regla y se eligió pagarlo.
>
> **El log de eventos** cubre los cinco que pedía el hallazgo más el límite excedido, bajo
> el logger `seguridad`, con IP y sin contraseñas ni tokens. La aplicación pasó de **una
> línea de log en total** a registrar todo lo que le pasa a una cuenta.
>
> **Verificado:** `LimiteDeIntentosTest`, 5 casos, incluido que un email inexistente se
> frena igual —si el 429 solo apareciera para cuentas reales, sería la forma de averiguar
> quién tiene cuenta— y que un login exitoso devuelve el margen completo.
>
> **Un efecto que hubo que resolver:** con el límite por IP puesto, la suite entera pasó a
> devolver 429 — es una sola máquina haciendo cientos de logins contra 127.0.0.1, que para
> el filtro es exactamente un ataque. Se apaga **solo el límite por IP** durante `mvn test`,
> desde el `pom.xml`; el de email queda activo. No se usó un `application.properties` de
> test porque un archivo con ese nombre **tapa** al de `src/main` en vez de completarlo, y
> se llevaría puesta la configuración de la base.

---

#### SEC-03 — No existe ningún camino para recuperar una contraseña, y el que la documentación describe no está implementado

**Severidad: Alto**

**Evidencia**

- Tres lugares del repo afirman que existe:
  - `README.md:129`: *"La contraseña se guarda solo como hash BCrypt; es
    irreversible, y **si alguien la olvida se resetea**, no se recupera."*
  - `apps/backend/.../usuario/dto/EdicionUsuarioRequest.java:12-14`: *"No incluye
    contraseña a propósito: nadie cambia la contraseña de otro. **Si alguien la pierde,
    administración le da una nueva temporal, que es un camino distinto** y deja registro
    en `debe_cambiar_password`."*
  - `apps/backend/.../usuario/DatoDuplicadoException.java:33`: el mensaje que ve el
    usuario final — *"Iniciá sesión, o **pedile a administración que te resetee la
    contraseña**."*
- **Ese camino distinto no existe.** Los 14 endpoints (`README.md:96-111`, verificados
  uno por uno en la Fase 2) incluyen un solo endpoint de contraseña:
  `POST /api/me/password` (`auth/MeController.java:48`), que **exige la contraseña
  actual** (`auth/SesionService.java:122-124`). `UsuarioController` no tiene ningún
  método de reseteo, y `EdicionUsuarioRequest` no tiene campo de contraseña.
- No hay salida alternativa: no hay infraestructura de mail y está decidido que no la
  habrá pronto (`CLAUDE.md:129`, *"No activation email — there is no mail infrastructure
  and there won't be soon"*). El botón "Olvidé mi contraseña" de la landing
  (`apps/landing/src/components/forms/LoginForm.tsx:58-60`) es un `<button type="button">`
  sin `onClick`.

**Qué pasa hoy.** Quien olvida su contraseña queda afuera **de forma permanente**. No es
un caso de borde: el flujo principal del sistema es que Micaela crea la cuenta, manda
una contraseña temporal de diez caracteres aleatorios por WhatsApp
(`usuario/GeneradorDePassword.java:22-23`) y la persona la usa una vez. Entre que la
recibe y que entra, la pierde en el scroll del chat.

**Impacto concreto.** Diciembre es la migración de los ~80 alumnos del Notion, todos con
contraseña temporal. Cada uno que no la encuentre es un caso que Micaela **no puede
resolver con el sistema**, y las dos salidas que quedan son las dos malas: un `UPDATE`
manual sobre `password_hash` en la base de producción, o compartir la cuenta de alguien
que sí entra. Es además la clase de agujero funcional que se descubre en el peor
momento —el día de la puesta en marcha, con gente esperando— y que hace que la
administrativa vuelva al Notion, que es exactamente lo que este módulo existe para
evitar.

**Recomendación.** `POST /api/usuarios/{id}/password-temporal`, con `@PuedeOperar`, que
reutilice lo que ya está escrito: `GeneradorDePassword.generar()`, el mismo
`UsuarioCreado` como respuesta (contraseña visible una sola vez) y
`debeCambiarPassword = true`. **Tiene que pasar por
`UsuarioService.verificarQuePuedeTocarEstaCuenta()`** (`UsuarioService.java:150-155`):
sin ese guardia, un STAFF resetea la contraseña de un ADMIN y se queda con el sistema —
sería reabrir por otra puerta el agujero que la auditoría del 12/08 cerró. Test gemelo
del que ya existe en `PermisosPorRolTest:159`. Del lado del front, el botón va en la
fila de `UsuariosPagina.tsx` junto al de activar/desactivar.

**Esfuerzo: S**

> **Remediado el 2026-08-14 — RESUELTO del lado del backend.**
> `POST /api/usuarios/{id}/password-temporal`, con `@PuedeOperar`, reutilizando
> `GeneradorDePassword` y devolviendo el mismo `UsuarioCreado` del alta: la contraseña se
> ve una sola vez. Pasa por `verificarQuePuedeTocarEstaCuenta()`, que era la parte
> imprescindible.
>
> **Verificado:** tres casos nuevos en `PermisosPorRolTest` —un STAFF **no** puede
> resetearle la contraseña a un ADMIN, sí puede a un usuario común, y un DIRECTIVO no
> puede resetear nada— más el circuito completo en `PasswordTemporalTest`: se resetea,
> la contraseña que la persona había elegido deja de servir, y la nueva entra marcada
> para cambio obligatorio.
>
> **Queda pendiente el botón en `UsuariosPagina.tsx`**, que es ARQ-02 (tanda 5). Hasta
> entonces el endpoint existe y se llama por API — que ya es la diferencia entre "hay
> camino" y "no hay ninguno".

---

#### SEC-04 — Un ADMIN puede quitarse el rol a sí mismo y dejar el sistema sin nadie capaz de administrarlo

**Severidad: Medio**

**Evidencia**

- `apps/backend/.../usuario/UsuarioService.java:115-117`:
  ```java
  if (solicitud.rol() != null && puedeAsignarRoles) {
      usuario.setRol(solicitud.rol());
  }
  ```
  No hay ninguna comparación con quién está pidiendo. `editar()` (`:104`) **ni siquiera
  recibe el id del solicitante**, a diferencia de `cambiarActivo()` (`:127`), que sí lo
  recibe y lo usa.
- El guardia hermano existe, para el otro campo: `:133-135`,
  *"No podés desactivar tu propia cuenta."*, con su test
  (`PermisosPorRolTest.java:177`, `un_admin_no_puede_desactivarse_a_si_mismo`).
- La regla está escrita como principio en `docs/requirements/platform.md:100`:
  *"**Nadie puede desactivarse a sí mismo.**"* — redactada sobre `activo`, no sobre `rol`.
- Ningún test cubre la auto-degradación: los 11 casos de `PermisosPorRolTest` no la
  tocan (verificado nombre por nombre).

**Qué pasa hoy — medido contra la API corriendo en la Fase 5**, con el único ADMIN del
sistema y su propia credencial:

```
PUT /api/usuarios/1   {"nombre":"Administrador","apellido":"Sistema",
                       "email":"admin@lajuanita.local","rol":"USUARIO"}
  -> HTTP 200   {"id":1, …, "rol":"USUARIO", "activo":true}

GET /api/usuarios     (mismo token, pedido siguiente)
  -> HTTP 403   {"detail":"No tenés permiso para hacer esto."}
```

Se aceptó con un 200 y el pedido siguiente ya vino 403: `AutenticacionDesdeBase.java:97`
lee el rol de la base —que es lo correcto y es la razón de ser de esa clase— y devuelve
`ROLE_USUARIO`. **El sistema quedó sin ningún administrador**: el único otro usuario es
`USUARIO`, y como solo un ADMIN otorga roles (`UsuarioController.java:104-107`), no
quedaba nadie capaz de deshacerlo. Se restauró con un `UPDATE` directo a la base, que es
exactamente la recuperación que este hallazgo describe.

**Impacto concreto.** El mismo estado final que la auditoría del 12/08 midió y cerró
—*"un STAFF desactivó al ADMIN y lo dejó sin poder entrar... eso alcanzaba para dejar el
sistema sin nadie capaz de administrarlo"* (`Rol.java:37-41`)— alcanzado por otra puerta.
La recuperación es un `UPDATE` a mano en la base de producción, y hay **un solo ADMIN**.

**Una precisión que baja la probabilidad, no la severidad** (encontrada en la Fase 5,
ARQ-02): hoy **no existe ninguna pantalla de edición**, así que este endpoint solo se
alcanza llamando la API directamente — que es como se midió. No es una mitigación: es
que la pantalla que lo dispararía todavía no se construyó. El día que exista un
formulario de edición con selector de rol, un clic distraído sobre la propia fila
alcanza. Por eso conviene cerrarlo **antes** de esa pantalla, no después.

**Recomendación.** Pasar el id del solicitante a `editar()` —como ya hace
`cambiarActivo()`— y rechazar el cambio de rol sobre uno mismo:

```java
if (usuario.getId().equals(idDeQuienPide) && solicitud.rol() != null
        && solicitud.rol() != usuario.getRol()) {
    throw new OperacionNoPermitidaException("No podés cambiarte el rol a vos mismo.");
}
```

Y, ya que la invariante real es *"siempre tiene que quedar al menos un ADMIN activo"*,
conviene expresarla como tal: un chequeo compartido por `editar` y `cambiarActivo` que
cuente los ADMIN activos restantes. Sumar el test al lado de
`un_admin_no_puede_desactivarse_a_si_mismo`, y corregir
`docs/requirements/platform.md:100` para que la regla hable de "sacarse a sí mismo del
sistema", no solo de desactivarse.

**Esfuerzo: S**

> **Remediado el 2026-08-14 — RESUELTO.** `editar()` ahora recibe el id del solicitante,
> como `cambiarActivo()`, y rechaza el cambio de rol sobre uno mismo.
> **No se agregó el conteo de ADMIN activos, y no hace falta**: con las dos puertas
> cerradas la invariante *"siempre queda al menos un ADMIN activo"* se sostiene sola —
> se puede degradar o desactivar a otro, nunca a uno mismo, así que el último no se
> puede ir. Contar filas habría sido una segunda regla diciendo lo mismo.
> **Verificado:** tres casos nuevos en `PermisosPorRolTest` (11 → 14): la degradación
> propia da 403, editarse los datos reenviando el propio rol sigue dando 200, y degradar
> a **otro** ADMIN sigue permitido. `docs/requirements/platform.md:100` reescrito.

---

#### SEC-05 — El frontend no implementa el eje de escritura: `DIRECTIVO` ve y clickea botones que el backend le va a negar

**Severidad: Medio**

**Evidencia**

- `apps/platform/src/paginas/AlumnosPagina.tsx:66`:
  `<Boton onClick={() => setMostrandoAlta(true)}>Nuevo alumno</Boton>` — sin ninguna
  condición de rol.
- `apps/platform/src/paginas/UsuariosPagina.tsx:126-133`: el botón de activar/desactivar
  se dibuja para toda fila salvo la propia (`u.id !== yo.id`). El rol de quien mira no
  entra en la decisión.
- `apps/platform/src/layout/menu.ts:91`: el **único** filtro por rol de todo el front es
  `usuario.rol !== 'USUARIO'`, que es la línea de lectura. El propio archivo lo dice en
  `:71-72`: *"DIRECTIVO ve estas pantallas pero no escribe nada; **eso lo impone el**
  backend"*.
- `apps/platform/src/App.tsx:33-34`: `/admin/alumnos` y `/admin/usuarios` cuelgan de
  `<RutaProtegida>`, que verifica sesión y contraseña temporal
  (`auth/RutaProtegida.tsx:21-34`) pero **no rol**.
- El backend sí niega, y está probado: `PermisosPorRolTest.java:88`,
  `un_directivo_puede_leer_pero_NO_puede_escribir_nada` — pasa.

**Qué pasa hoy.** Un `DIRECTIVO` —Chapa & Castelo, la familia Oppel, Najles: socios e
inversores reales, según `docs/requirements/platform.md:80`— entra a Alumnos, ve
"Nuevo alumno", completa el formulario y recibe *"No tenés permiso para hacer esto."*.
Un `STAFF` que intenta desactivar la cuenta de un ADMIN recibe el 403 de
`OperacionNoPermitida`. Un `USUARIO` que escribe `/admin/usuarios` en la barra de
direcciones ve el marco de la pantalla y una tabla que nunca carga.

**Impacto concreto.** **No es un agujero de seguridad**: el servidor autoriza, y esa
separación está bien hecha y bien probada. Es el costo de UX de la decisión de cuatro
roles cayendo justo sobre las personas que menos tolerancia tienen a un sistema que
parece roto — los socios que financian el estudio, que van a entrar a mirar el dashboard
y se van a encontrar con un error. Y erosiona la regla que el `README.md:161-164`
formula bien: *ocultar una opción del menú no es un mecanismo de seguridad* — cierto,
pero de ahí no se sigue que el menú deba mentir sobre lo que se puede hacer.

**Recomendación.** Derivar del `/api/me` que ya llega un único predicado, al lado de
las tres reglas que ya viven en `menu.ts`:

```ts
export const puedeOperar = (u: UsuarioActual) => u.rol === 'ADMIN' || u.rol === 'STAFF'
```

y usarlo para (a) no dibujar los botones de escritura de `AlumnosPagina` y
`UsuariosPagina`, y (b) gatear las rutas `/admin/*`, devolviendo a la home a quien no
corresponda. **El backend sigue siendo la autoridad**: esto es cosmética honesta, y así
conviene comentarlo en el código para que nadie confunda una cosa con la otra. Un cuarto
predicado en el archivo que ya concentra las reglas del menú, no una condición suelta
por pantalla.

**Esfuerzo: S**

> **Remediado el 2026-08-14 — RESUELTO**, tal cual la recomendación: `puedeOperar` vive en
> `menu.ts`, al lado de las tres reglas del menú, y `puedeAdministrar` pasó a exportarse
> para gatear las rutas. Las dos pantallas dejaron de dibujar alta, edición, reseteo y
> baja para quien no escribe; `/admin/*` devuelve a la home a quien no administra —antes
> mostraba el marco y una tabla que nunca cargaba—.
>
> **Se usa el mismo predicado para el menú y para la ruta**, así no puede existir una
> sección visible que la ruta rechace. Y está comentado en el código, como pedía el
> hallazgo, que **esto no autoriza nada**: borrarlo no abriría ningún agujero, solo
> volvería a mentirle al usuario.
>
> Lo que **no** cambió: `DIRECTIVO` sigue viendo las pantallas de administración. Ese era
> el punto — lee todo y no escribe nada.

---

#### SEC-06 — El registro público confirma si un teléfono ya tiene cuenta, y esa filtración nunca se decidió

**Severidad: Bajo** · *se agrava con SEC-02: sin límite de intentos, la enumeración es masiva*

**Evidencia**

- `apps/backend/.../usuario/dto/RegistroRequest.java:34-36`: el teléfono es
  **obligatorio** en el registro público (`@NotBlank`).
- `UsuarioService.java:186-193` lo busca antes de insertar y
  `DatoDuplicadoException.java:36-39` responde con 409 y el texto
  *"Ya existe una cuenta con ese teléfono."*
- La decisión documentada cubre **solo el email**:
  `DatoDuplicadoException.java:11-18` argumenta que lo que se filtra es *"esta dirección
  tiene cuenta en un estudio de música de Pilar"*. `CLAUDE.md:131` y
  `docs/sistema-gestion-plan.md:380-384` repiten el argumento, siempre sobre el email.
  Ninguno menciona el teléfono.

**Qué pasa hoy.** Cualquiera prueba un número y averigua si esa persona tiene cuenta en
La Juanita, sin límite. Y en el otro sentido: alguien que se equivoca de un dígito al
registrarse recibe un mensaje sobre la cuenta de un tercero y no puede completar el
registro.

**Impacto concreto.** Chico, pero el razonamiento que lo justifica no se hizo. Un
teléfono es más identificante que un email y, en este negocio, es **el canal**: WhatsApp
es por donde se anota la gente y por donde Micaela manda las contraseñas temporales. La
frase que hace tolerable la filtración del email —"es información de sensibilidad
baja"— no se traslada sola.

**Recomendación.** Decidir, no heredar. Dos salidas razonables: (a) extender
explícitamente la decisión documentada a `telefono` en el javadoc de
`DatoDuplicadoException`, con su propio argumento; o (b) hacer genérico el mensaje del
teléfono —*"No pudimos usar ese teléfono. Si ya tenés cuenta, iniciá sesión"*— y dejar
el confirmatorio solo para el email, que es el que tiene el argumento escrito. Lo que no
conviene es que la única filtración deliberada del sistema tenga un polizón.

**Esfuerzo: XS**

---

#### SEC-07 — Ninguna de las dos apps declara CSP ni cabeceras de seguridad propias

**Severidad: Bajo**

**Evidencia**

- `grep -rn "Content-Security-Policy"` sobre `apps/*/src`, `apps/landing/next.config.ts`
  y `apps/platform/index.html` → **cero resultados**.
- `apps/landing/next.config.ts` no define `headers()`: solo `images`.
- La API sí queda cubierta, y por omisión: `SeguridadConfig.java` **no** llama a
  `.headers(...)` (verificado), así que rigen los defaults de Spring Security
  —`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cache-Control`, y HSTS
  cuando el transporte es HTTPS—. Es un caso donde no configurar fue lo correcto.
- El token vive en `localStorage`: `apps/platform/src/auth/credencial.ts:1-9`, con la
  contracara ya escrita ahí y la mitigación elegida (vencimiento de 8 h).

**Qué pasa hoy.** La superficie de XSS del panel es genuinamente chica —se verificó:
**cero** `dangerouslySetInnerHTML` en `apps/platform`, y el único del repo es
`apps/landing/src/components/seo/JsonLd.tsx:19`, cuyo
`JSON.stringify(data).replace(/</g, ...)` reemplaza cada `<` por su escape Unicode,
justamente para que un cierre de `script` dentro de un string no corte la etiqueta antes
de tiempo—. Pero la segunda capa no existe: si algún
día entra un script en la página, nada le impide leer el token y mandarlo afuera.

**Impacto concreto.** Preventivo, no un agujero abierto. Vale escribirlo ahora porque la
CSP se pone barata mientras el sitio no depende de scripts de terceros, y se vuelve cara
después: el día que entren un pixel de Instagram o un chat, escribir la política es
negociar con cada uno.

**Recomendación.** Un bloque `headers()` en `next.config.ts` con `Content-Security-Policy`
(`default-src 'self'`, y lo que la capa GSAP realmente necesite),
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff` y
`Permissions-Policy` restrictiva; y las mismas cabeceras en el reverse proxy que sirva
la SPA, donde además va la HSTS. Verificarlo con el sitio corriendo, no de memoria: una
CSP mal escrita rompe el preloader y las animaciones sin decir por qué.

**Esfuerzo: S**

> **Remediado el 2026-08-15 (tanda 8) — RESUELTO en las dos apps, con una diferencia entre
> ellas que vale entender.**
>
> **Landing**: bloque `headers()` en `next.config.ts` con CSP, `Referrer-Policy`,
> `X-Content-Type-Options`, `X-Frame-Options` y `Permissions-Policy`. **`script-src` lleva
> `'unsafe-inline'` y es deliberado**: Next mete el payload de RSC en un script inline por
> página, y la alternativa —un nonce por respuesta— exige middleware, o sea render
> dinámico, en un sitio que es 100% estático. Lo que la política igual impide es cargar un
> script de otro origen y **mandar datos afuera** (`connect-src 'self'`), que es lo que
> buscaba el hallazgo. `'unsafe-eval'` entra sólo en desarrollo, porque estas cabeceras
> también corren en `next dev` y el HMR lo necesita.
>
> **Panel**: la CSP va en un `<meta>` del `index.html`, **inyectado sólo en el build** por
> un plugin de doce líneas en `vite.config.ts` — en desarrollo Vite inyecta el preámbulo de
> React Refresh como script inline, así que una política fija en el HTML rompería
> `npm run dev` sin decir por qué. Ahí `script-src` **no** necesita `'unsafe-inline'`: el
> build de Vite deja todos los scripts en archivos aparte (verificado: cero scripts inline
> en `dist/index.html`). Lo que un `<meta>` no puede llevar —`frame-ancestors` y HSTS—
> quedó escrito como punto 5 de la sección de deploy de `docs/operacion.md`, que es donde
> se va a configurar el proxy.
>
> **Verificación, y en qué se quedó corta.** Las cinco cabeceras se leyeron de un
> `next start` real (`Invoke-WebRequest` a `/contacto`), no del archivo de configuración, y
> se confirmó que `'unsafe-eval'` **no** sale en el build de producción. La verificación en
> navegador que pide el hallazgo **no se pudo hacer**: Edge headless no devuelve el DOM en
> esta máquina. En su lugar se atacó lo mismo por el otro lado — se enumeraron **todos** los
> orígenes externos de las páginas generadas (sólo enlaces, el iframe del mapa y los dos
> reproductores del blog: los tres están en `frame-src`; ningún script, estilo, fuente ni
> imagen de afuera) y se buscó en el bundle de producción lo único que esta política podría
> romper: **`eval(` 0, `new Function(` 0, `new Worker(` 0, y ninguna fuente `data:` en el
> CSS**. O sea que la capa de movimiento no puede estar violando la CSP. Aun así, **el día
> que alguien abra el sitio con la consola abierta, mírela**: es la comprobación que falta.

---

#### SEC-08 — BCrypt en el costo mínimo, y la contraseña temporal no vence nunca

**Severidad: Bajo**

**Evidencia**

- `SeguridadConfig.java:89`: `return new BCryptPasswordEncoder();` — el constructor sin
  argumentos usa **strength 10**, el piso de lo que hoy se considera aceptable.
  Confirmado en el hash sembrado: `V3__usuario_admin_inicial.sql:34`,
  `$2a$10$3RgFcMtU7XoJIEhTxokRre...`. El propio proyecto midió el costo: ~85 ms por
  comparación (`auth/SesionService.java:66-67`).
- Nada hace vencer la contraseña temporal: `usuario.debeCambiarPassword`
  (`usuario/Usuario.java:93-94`) es un booleano sin fecha asociada, y el único lugar que
  lo apaga es el cambio de contraseña (`SesionService.java:127`). No hay tarea ni
  chequeo que lo caduque.
- La contraseña generada sí es fuerte: `GeneradorDePassword.java:22-23`, 10 caracteres
  sobre un alfabeto de 55 con `SecureRandom` ≈ 58 bits. El problema no es su calidad.

**Qué pasa hoy.** Las contraseñas se hashean al costo mínimo, y una contraseña temporal
que Micaela mandó por WhatsApp sigue siendo válida indefinidamente si la persona nunca
entra. Cualquiera que lea ese chat —el teléfono prestado, la sesión de WhatsApp Web
abierta en la compu del estudio— puede iniciar sesión y **cambiar la contraseña**, que
es justamente lo único que ese estado habilita: se queda con la cuenta.

**Impacto concreto.** Bajo hoy y creciente en diciembre, cuando se den de alta ~80
cuentas de golpe y buena parte no entre en semanas. El costo de BCrypt, por su lado, es
lo que separa un volcado de la base robado de un volcado de la base **útil**.

**Recomendación.** Dos cambios chicos e independientes: (1) `new BCryptPasswordEncoder(12)`
— los hashes viejos siguen validando, porque el costo viaja adentro del hash, así que no
hay migración; el login pasa de ~85 ms a ~350 ms, invisible a este volumen (y conviene
anotar el número medido al lado del cambio, como ya se hizo con el señuelo). (2) Darle
vencimiento a la temporal: comparar `debeCambiarPassword` contra `fechaCreacion` y
rechazar el login pasados N días, obligando a regenerarla — que es exactamente el
endpoint que pide SEC-03, así que conviene hacer las dos juntas.

> **Remediado el 2026-08-14 — RESUELTO**, las dos, y juntas como recomendaba.
>
> **(1) BCrypt en costo 12**, con el número **medido acá y no estimado**: 10 → 78 ms,
> 12 → 253 ms (el informe estimaba ~350). No hay migración de hashes: el costo viaja
> adentro del hash, así que el admin sembrado por `V3` sigue validando con su 10 y se
> rehashea solo cuando alguien cambie su contraseña.
>
> **(2) La temporal vence a los 7 días.** No se comparó contra `fecha_creacion` como
> sugería el hallazgo: un reseteo genera una temporal nueva sobre una cuenta vieja, y ahí
> `fecha_creacion` daría "vencida" al instante. Va una columna propia,
> `password_temporal_desde` (`V8`), que se escribe en los dos lugares que generan una
> temporal y se borra al elegir la propia. Las dos columnas son un solo hecho en dos
> campos y **la base impide que se contradigan**
> (`usuario_password_temporal_coherente`) — lo cual ya atajó un test que ponía el
> booleano sin la fecha.
>
> El rechazo va **después** de comparar la contraseña, con mensaje propio: quien llega ahí
> ya demostró conocerla, así que decirle que venció no le informa nada a un desconocido
> y le evita a la persona correcta reintentar diez veces lo mismo.
>
> **Verificado:** 4 casos en `PasswordTemporalTest` — vence a los 8 días, a los 6 todavía
> entra, resetear la destraba, y una contraseña elegida por la persona no vence nunca.

**Esfuerzo: S**

---

#### SEC-09 — `Busqueda` escapa los comodines de `LIKE` y ninguna consulta declara `ESCAPE`

**Severidad: Bajo**

**Evidencia**

- `apps/backend/.../usuario/Busqueda.java:24-25`: *"Carácter de escape que hay que
  declarar en la consulta con ESCAPE."* + `public static final char ESCAPE = '\\';`
- `grep -rn "ESCAPE" apps/backend/src/main/java` → **solo esas dos líneas**. Las dos
  consultas que usan el patrón, `UsuarioRepository.java:42-49` y
  `AlumnoRepository.java:30-38`, no declaran cláusula `ESCAPE`. La constante **nunca se
  referencia**.

**Qué pasa hoy.** Funciona, por casualidad: el carácter de escape por defecto de `LIKE`
en Postgres ya es la barra invertida, así que el escapado de `Busqueda.patron()` surte
efecto igual. **No hay riesgo de inyección** —el patrón viaja como parámetro ligado, no
concatenado— y se verificó que no existe ninguna consulta nativa en todo el backend.

**Impacto concreto.** Mínimo y diferido: una instrucción escrita en el código que nadie
cumplió, sostenida por un default del motor. Si alguna consulta futura se escribe con
`ESCAPE ''`, o si el proyecto tocara otro motor, buscar "100%" empieza a devolver
cualquier cosa y el bug va a parecer del buscador.

**Recomendación.** Agregar `ESCAPE '\\'` a las dos consultas y usar la constante, o
—si se prefiere apoyarse en el default— borrar la constante y cambiar el comentario por
"se confía en el escape por defecto de Postgres". Cualquiera de las dos; lo que no puede
quedar es la instrucción sin cumplir.

**Esfuerzo: XS**

> **Remediado el 2026-08-15 (tanda 8) — RESUELTO, con las dos mitades.** Las seis
> cláusulas `LIKE` de las dos consultas declaran `ESCAPE '\'`, y la constante se **borró**:
> una anotación `@Query` no puede interpolarla sin partir el bloque de texto en seis
> concatenaciones, así que dejarla habría sido volver a escribir una instrucción que nadie
> cumple. Lo que decía pasó al javadoc de `Busqueda`, junto con el motivo por el que esto
> funcionaba igual.
>
> **Verificado en el SQL generado**, no en el JPQL: con
> `-Dlogging.level.org.hibernate.SQL=DEBUG`, la consulta sale
> `… lower(u1_0.nombre) like ? escape '\' or …`. Y hay un caso nuevo en `AlumnoTest`
> —`un_buscador_con_barra_invertida_no_rompe_la_consulta`— porque es el único que
> ejercita el carácter de escape en sí: los otros dos comodines se escapan *con* la barra,
> así que buscarla a ella es lo único que la pone a prueba. `mvn test` **107/107** (eran
> 106).
>
> **Esto no cambia ningún comportamiento hoy** y conviene decirlo: el default de Postgres
> ya era la barra invertida, y los dos casos que protegían a `Busqueda` pasaban antes y
> después. Lo que cambia es de qué depende que sigan pasando.

---

### 3.4 ARQ — Consistencia entre capas y arquitectura

Alcance verificado **contra la API corriendo**: se levantó el backend y se le pidieron
las respuestas reales para comparar el JSON con los tipos de TypeScript campo por campo,
y para provocar cada código de error (400, 401, 403, 404, 405, 409) y ver qué le llega
al front. Además se leyeron los 21 archivos de `apps/platform/src` y se revisó la
estructura del monorepo. Lo que quedó afuera está en §6.3.

**El contrato de datos está bien.** Los seis records de respuesta y sus tipos de TS
coinciden exactamente, campo por campo, nombre por nombre, incluida la opcionalidad —
verificado contra el JSON real, no contra el código. Lo que falla es lo de alrededor:
la mitad de la API no se puede llamar desde la pantalla, el listado se queda en las
primeras 20 filas, y los errores que Spring genera por su cuenta llegan al usuario en
inglés.

| ID | Título | Sev | Esf |
|---|---|:--:|:--:|
| ARQ-01 | El listado pagina en el servidor y no en el cliente: se ven 20 filas y el contador dice el total | Alto | S |
| ARQ-02 | Cinco de los catorce endpoints no se pueden llamar desde la interfaz, incluidos los dos de edición | Medio | M |
| ARQ-03 | Los errores que genera Spring llegan al usuario en inglés | Medio | S |
| ARQ-04 | Los dos formatos de error que `application.properties` dice haber unificado siguen conviviendo | Medio | S |
| ARQ-05 | Hay un quinto y un sexto lugar que razonan sobre los cuatro roles, y la lista dice que son cuatro | Bajo | XS |
| ARQ-06 | Lógica copiada literalmente entre los dos controllers, incluida una decisión de autorización | Bajo | S |
| ARQ-07 | Tres `package-lock.json` conviviendo, los tres versionados | Bajo | XS |
| ARQ-08 | La convención de idioma existe, funciona, y no está escrita en ningún lado | Bajo | S |
| ARQ-09 | Solo los tipos de respuesta están en TypeScript; los de pedido son objetos sueltos | Bajo | S |
| ARQ-10 | `landing` y `platform` no comparten nada, y en septiembre las dos hablan con la misma API | Info | — |

---

#### ARQ-01 — El listado pagina en el servidor y no en el cliente: se ven las primeras 20 filas y el contador dice el total

**Severidad: Alto**

**Evidencia**

- El backend pagina bien y el contrato funciona. Medido contra la API corriendo:
  ```
  GET /api/usuarios?tamanio=1
  { "contenido": [ … ], "pagina": 0, "tamanio": 1,
    "totalElementos": 2, "totalPaginas": 2 }
  ```
- El front **nunca manda `pagina`**: `administracion.ts:25-29` la acepta como parámetro
  opcional, y las dos pantallas la omiten —`UsuariosPagina.tsx:37`,
  `listarUsuarios({ buscar })`, y `AlumnosPagina.tsx:31`,
  `listarAlumnos({ buscar, estado })`—. Sin ese parámetro el backend usa
  `@RequestParam(defaultValue = "0") int pagina` y `tamanio = 20`
  (`UsuarioController.java:56-57`, `AlumnoController.java:52-53`).
- **`totalPaginas` está declarado en el tipo y no se usa en ningún lado**:
  `grep -rn "totalPaginas" apps/platform/src` devuelve una sola línea, la del propio
  tipo (`tiposAdmin.ts:9`). No hay ningún control de paginado en las dos pantallas.
- Y el contador que sí se muestra sale de la otra cifra: `UsuariosPagina.tsx:66`,
  `` `${total} ${total === 1 ? 'cuenta' : 'cuentas'}` ``, con
  `setTotal(pagina.totalElementos)` en `:38`.

**Qué pasa hoy.** Nada: hay dos usuarios y cero alumnos, así que las 20 filas alcanzan
y sobran. Por eso está escrito acá y no se descubre solo.

**Impacto concreto.** En diciembre entran los ~80 alumnos del Notion. La pantalla de
Alumnos va a decir **"80 alumnos"** en el encabezado y va a listar **20**, sin ningún
control para ver el resto y sin ningún error: se ve como una lista corta, no como una
lista rota. Es la pantalla principal del Módulo 1, el módulo que existe para reemplazar
ese Notion, y el 75% de los datos migrados va a quedar invisible. El único camino a la
fila 21 es acertarle al buscador. Es además el tipo de falla que aparece justo el día
de la puesta en marcha, con Micaela mirando.

**Recomendación.** Lo mínimo que cierra el agujero, sin construir un paginador completo:
llevar `pagina` a estado en las dos pantallas, pasarla a `listarUsuarios` /
`listarAlumnos`, y renderizar dos botones con `totalPaginas`, que ya viene en la
respuesta y ya está en el tipo. Resetear `pagina` a 0 cuando cambia el buscador o el
filtro —si no, buscar desde la página 3 devuelve vacío y parece que no hay resultados—.
Es la misma pieza para las dos pantallas, así que conviene que salga como un componente
desde el principio: las de Reservas y Pagos van a necesitarla igual.

**Esfuerzo: S**

> **Remediado el 2026-08-14 — RESUELTO.** `componentes/Paginado.tsx`, usado por las dos
> pantallas: `pagina` es estado, se manda a `listarUsuarios` / `listarAlumnos`, y los dos
> botones se dibujan con `totalPaginas`, que ya venía en la respuesta y ya estaba en el
> tipo sin que nadie lo leyera. El control **no se dibuja con una sola página**: hoy no
> aporta nada y ocupa lugar.
>
> Y lo que el hallazgo marcaba como la trampa: **buscar o filtrar resetea a la página 0**
> en las dos pantallas. Sin eso, filtrar desde la página 3 devuelve vacío y parece que no
> hay resultados.

---

#### ARQ-02 — Cinco de los catorce endpoints no se pueden llamar desde la interfaz, y entre ellos están los dos de edición y el único que crea cuentas con rol

**Severidad: Medio**

**Evidencia.** Cruzando la tabla de endpoints de `README.md:96-111` contra
`apps/platform/src/api/administracion.ts`:

| Endpoint | ¿Función en el cliente? | ¿Usada? |
|---|---|---|
| `GET /api/usuarios` | `listarUsuarios` | ✅ |
| `GET /api/usuarios/{id}` | **no existe** | — |
| `POST /api/usuarios` | `altaUsuario` (`:31-39`) | ❌ **cero usos** |
| `PUT /api/usuarios/{id}` | **no existe** | — |
| `PATCH /api/usuarios/{id}/activo` | `cambiarActivoUsuario` | ✅ |
| `GET /api/alumnos/{id}` | **no existe** | — |
| `PUT /api/alumnos/{id}` | **no existe** | — |

`grep -rn "\baltaUsuario\b" apps/platform/src --include=*.tsx` → **0 resultados**: la
función está exportada y no la llama nadie. Los otros nueve endpoints sí se usan.

**Qué pasa hoy.** Dos consecuencias operativas concretas, no estéticas:

1. **No hay forma de crear una cuenta con rol desde la pantalla.** `altaUsuario` es la
   única que acepta `rol` (`:36`), y no está conectada. Para que Micaela exista como
   `STAFF` hay que llamar la API a mano con `curl` o equivalente — que es exactamente lo
   que se hizo para auditar esto.
2. **No hay forma de editar nada.** Ni el nivel de ingreso o el Instagram de un alumno,
   ni los datos de contacto de una cuenta. Los DTO (`EdicionUsuarioRequest`,
   `EdicionAlumnoRequest`), los métodos de servicio (`UsuarioService.editar:104`,
   `AlumnoService.editar:96`) y los endpoints existen, están probados y son
   inalcanzables.

**Impacto concreto.** La migración de diciembre necesita las dos cosas: dar de alta al
equipo con su rol, y corregir los datos que vengan mal del Notion. Hoy las dos exigen
tocar la API por fuera del sistema. Y hay un efecto secundario que conviene registrar:
**es lo que hoy hace poco probable el escenario de SEC-04** —la auto-degradación de un
ADMIN— porque el formulario que lo dispararía no existe todavía. Es una mitigación por
accidente, no por diseño, y desaparece el día que se construya la pantalla de edición.

**Recomendación.** Al construir la edición, salen las cinco juntas: un formulario de
alta en `UsuariosPagina` que use `altaUsuario` (ya escrita), uno de edición por fila en
las dos pantallas, y `porId` si hace falta una vista de detalle. Antes de conectar el
`PUT` de usuarios, cerrar SEC-04 — si no, el primer formulario de edición trae el
agujero puesto.

**Esfuerzo: M**

> **Remediado el 2026-08-14 — RESUELTO, y en el orden correcto:** SEC-04 se cerró en la
> tanda 1, así que el formulario de edición nació sin el agujero. Además, el selector de
> rol viene **deshabilitado sobre la propia fila**, con la explicación al lado: el backend
> lo rechaza igual, pero el clic distraído ni siquiera existe.
>
> Quedaron conectados: **alta de cuenta con rol** (`altaUsuario`, que estaba escrita y no
> la llamaba nadie — dar de alta a Micaela como STAFF exigía `curl`), **edición de
> usuario**, **edición de alumno** y, de paso, el **reseteo de contraseña** de SEC-03, que
> comparte el cartel de "contraseña generada" con el alta porque es el mismo hecho.
>
> **Los dos `GET /{id}` siguen sin usarse, y a propósito**: la fila del listado ya trae
> todos los campos que muestran los formularios, así que una vista de detalle sería un
> pedido de más para mostrar lo mismo. Se conectan cuando exista algo que el listado no
> traiga —el perfil del alumno con sus inscripciones, que es el Módulo 1 pendiente—. Son
> de lectura: no dejan ninguna operación fuera de alcance.
>
> **Verificado:** `npm run build:platform` (tsc + vite) y `oxlint`, los dos limpios.
> ⚠️ **Sin verificación en navegador**: el frontend no tiene tests (QA-05, tanda 6), así
> que lo que está probado es que compila y tipa, no que se ve bien.

---

#### ARQ-03 — Los errores que genera Spring por su cuenta llegan al usuario en inglés

**Severidad: Medio**

**Evidencia.** Cuatro respuestas reales de la API corriendo:

```
POST /api/auth/login  (JSON cortado)
  {"detail":"Failed to read request", "status":400, "title":"Bad Request"}

GET /api/auth/registro  (método equivocado)
  {"detail":"Method 'GET' is not supported.", "status":405, "title":"Method Not Allowed"}

GET /api/alumnos?estado=NOEXISTE
  {"detail":"Failed to convert 'estado' with value: 'NOEXISTE'", "status":400}

GET /api/alumnos/abc
  {"detail":"Failed to convert 'id' with value: 'abc'", "status":400}
```

Y ese texto llega tal cual a la pantalla: `cliente.ts:95` hace
`if (typeof cuerpo?.detail === 'string') detalle = cuerpo.detail`, y las pantallas
muestran `e.message` sin filtrar (`UsuariosPagina.tsx:41`, `AlumnosPagina.tsx:35`,
`RegistroPagina.tsx:51`, `CambioPasswordObligatorio.tsx:51`).

Los mensajes propios sí están en español y son buenos —*"No existe el alumno 9999."*,
*"No tenés permiso para hacer esto."*, *"Ya existe una cuenta con ese email. Iniciá
sesión, o pedile a administración que te resetee la contraseña."*—. La mezcla es lo que
llama la atención.

**Qué pasa hoy.** Un sistema íntegramente en español rioplatense, hecho para una
administrativa que no es técnica, le muestra *"Failed to convert 'estado' with value"*
cuando algo sale mal.

**Impacto concreto.** No rompe nada y no es frecuente hoy, porque el front manda datos
bien formados. Se vuelve visible en cuanto haya filtros y parámetros en la URL —el
calendario del Módulo 2 va a tener fechas y salas en la query— y ahí un enlace mal
copiado devuelve un mensaje en inglés que además nombra parámetros internos. Es la
misma clase de problema que DB-05: la API tiene mensajes buenos y los pierde en los
bordes.

**Recomendación.** `ManejadorDeErrores` ya tiene `@Order(HIGHEST_PRECEDENCE)`
(`:38`), así que gana sobre el advice de Spring: alcanza con agregarle tres handlers
—`HttpMessageNotReadableException`, `HttpRequestMethodNotSupportedException`,
`MethodArgumentTypeMismatchException`— con textos en español y sin nombrar internals
(*"No pudimos leer los datos del formulario."*, *"Ese dato no tiene un valor válido."*).
Conviene hacerlo junto con DB-05, que es el mismo archivo y el mismo problema.

**Esfuerzo: S**

> **Remediado el 2026-08-14 — RESUELTO.** Los tres handlers, con los textos propuestos y
> sin nombrar parámetros internos. Se hizo junto con DB-05, mismo archivo.
> **Verificado:** `ErroresEnEspanolTest`, 3 casos de punta a punta contra la API.
>
> **Un detalle del informe que no se sostuvo:** el segundo ejemplo,
> `GET /api/auth/registro → 405`, en realidad devuelve **401**. La cadena de seguridad
> abre solo el `POST` de esa ruta y corta antes de que el pedido llegue al dispatcher —
> que es deliberado y está comentado en `SeguridadConfig`: abrir la ruta entera expondría
> métodos que no existen. El 405 se probó contra una ruta autenticada
> (`DELETE /api/usuarios/{id}`), donde sí es alcanzable. El handler hacía falta igual;
> lo que no era exacto era el ejemplo.

---

#### ARQ-04 — Los dos formatos de error que `application.properties` declara haber unificado siguen conviviendo

**Severidad: Medio**

**Evidencia.** El comentario de `apps/backend/src/main/resources/application.properties:10-16`
explica por qué se activó `spring.mvc.problemdetails.enabled`:

> *"Sin esto conviven **DOS formatos de error**: el nuestro (RFC 7807, con `detail` y
> `errores`) y el crudo de Spring, con `timestamp` y `error`. El front busca el mensaje
> en `detail` y con el segundo formato **no encuentra nada que mostrar**."*

Medido contra la API corriendo, un POST sin cabecera `Content-Type`:

```
POST /api/usuarios   (con credencial válida, cuerpo JSON, sin Content-Type)
  {"timestamp":"2026-08-14T02:04:39.134Z","status":400,"error":"Bad Request","path":"/api/usuarios"}
```

Es exactamente el segundo formato, sin `detail`. La causa es que ese error no lo resuelve
ningún `@ExceptionHandler`: se resuelve por el reenvío interno a `/error`, que sirve el
`BasicErrorController` de Spring Boot y que `SeguridadConfig.java:176` deja
`permitAll` —correctamente, por otro motivo—.

Y del lado del front el resultado es el peor de los dos posibles:
`cliente.ts:93-102` **parsea bien** ese JSON (es JSON válido), no encuentra `detail`,
y por lo tanto **no entra al `catch`** que existe justamente para poner un mensaje
razonable cuando el cuerpo no sirve. Queda el texto por defecto,
*"No se pudo completar la operación."*

**Qué pasa hoy.** Poco: el cliente propio siempre manda `Content-Type` cuando hay cuerpo
(`cliente.ts:60`), así que este camino se alcanza con un pedido mal armado. Lo que
importa es que la afirmación del archivo de configuración **es más fuerte de lo que el
sistema cumple**, y que el camino existe.

**Impacto concreto.** Todo error que escape a la cadena de advice sale por acá y llega
sin mensaje. Es el mismo desagüe por el que va a salir el 500 de un trigger cuando exista
el Módulo 2 (DB-05): dos hallazgos distintos que terminan en el mismo lugar y con el
mismo síntoma —el usuario ve un cartel genérico y el motivo real se pierde—.

**Recomendación.** Dos cambios chicos e independientes: **(a)** en el front, tratar un
cuerpo sin `detail` como cuerpo inservible y caer al mensaje por status, que es lo que
el `catch` ya sabe hacer —hoy solo se activa si el JSON no parsea—; **(b)** en el
backend, un `ErrorController` propio que devuelva `ProblemDetail`, o —si se prefiere no
agregar código— corregir el comentario de `application.properties` para que diga qué
queda afuera. Lo que no conviene es dejar escrito que el problema está resuelto.

**Esfuerzo: S**

> **Remediado el 2026-08-15 (tanda 8) — RESUELTO las dos mitades, y también la tercera
> opción: el comentario ahora dice la verdad.**
>
> **Lo primero fue volver a medir, y el hallazgo cambió de puerta.** El caso exacto que
> el informe reprodujo —`POST` sin `Content-Type`— **hoy sale bien**: contesta un 415 con
> `detail`. Lo que sigue vivo, medido contra la API corriendo, es el propio desagüe:
>
> ```
> GET /error   →   {"timestamp":"…","status":999,"error":"None"}     HTTP 500
> ```
>
> Sin `detail`, con un status inventado, y **alcanzable por cualquiera**: `/error` es
> `permitAll`, y tiene que serlo porque es un reenvío interno, no un endpoint. O sea que la
> afirmación del `application.properties` seguía siendo más fuerte que lo que el sistema
> cumplía, exactamente como decía el hallazgo.
>
> - **Backend**: `web/ErrorPorDefecto` atiende `/error` y devuelve `ProblemDetail`. El
>   mensaje sale **del código de estado y de ningún lado más** — ni de la excepción, ni del
>   `jakarta.servlet.error.message` que Spring deja en la petición, que puede traer texto
>   interno—, y son los mismos textos que ya da `ManejadorDeErrores` para el mismo caso.
> - **Front**: `interpretarError` trata un cuerpo **sin `detail`** (o con un `detail` en
>   blanco) igual que un cuerpo que no parsea, y cae a un mensaje por status. Antes ese era
>   el peor de los dos casos: el JSON crudo parseaba bien, no encontraba `detail` y por eso
>   **no entraba al `catch`** que existía para esto.
> - **`application.properties`**: el comentario dice qué cubre esa línea y qué no, y
>   apunta a la clase que cierra la otra mitad.
>
> **Verificado en los dos niveles.** Con la API corriendo, `GET /error` ahora contesta
> `{"detail":"Hubo un error inesperado. Probá de nuevo en un momento.","instance":"/error",`
> `"status":500,"title":"Error inesperado"}`. Y quedó pinchado en tests: `mvn test`
> **108/108** (era 107) con un caso que exige `detail` y `title` y que **`timestamp` y
> `error` no estén**, más `npm run test:platform` **55/55** (era 54), donde los dos casos
> que fijaban el comportamiento viejo se reescribieron — estaban ahí como registro de este
> hallazgo, y ahora fijan el nuevo.
>
> **Encontrado de paso, y NO arreglado** (queda anotado, no es este hallazgo): dos mensajes
> de Spring que salen **en inglés** y con vocabulario interno —
> *"No static resource api/noexiste."* (404) y
> *"Content-Type 'application/octet-stream' is not supported."* (415)—. Ya tienen el
> formato correcto, así que ARQ-04 está cerrado; el idioma es de la familia de ARQ-03, que
> tradujo otros tres. Son dos entradas más en `ManejadorDeErrores`.

---

#### ARQ-05 — Hay un quinto y un sexto lugar que razonan sobre los cuatro roles, y la lista oficial dice que son cuatro

**Severidad: Bajo**

**Evidencia.** `CLAUDE.md:139` fija la regla: *"Four places now carry the four roles and
must move together: the CHECK in `V1__baseline.sql`, the `Rol` enum in Java, the `Rol`
type in TypeScript, and `docs/db/la_juanita_schema.dbml.txt`."* Los cuatro están al día
(verificado en la Fase 1). Pero hay dos lugares más que deciden en función del rol y no
figuran:

- **Quinto:** `apps/platform/src/layout/menu.ts:90-92`
  ```ts
  function puedeAdministrar(usuario: UsuarioActual): boolean {
    return usuario.rol !== 'USUARIO'
  }
  ```
  Está escrito **por negación**. Hoy equivale exactamente a
  `hasAnyRole('ADMIN','DIRECTIVO','STAFF')` de `PuedeLeerAdministracion.java:25`, pero
  por coincidencia: un quinto rol futuro entraría al menú de administración
  automáticamente del lado del front, y recibiría 403 del lado del backend.
- **Sexto:** `apps/platform/src/paginas/UsuariosPagina.tsx:9-14`
  ```ts
  const NOMBRE_DE_ROL: Record<string, string> = { ADMIN: …, DIRECTIVO: …, STAFF: …, USUARIO: … }
  ```
  Está tipado `Record<string, string>` y no `Record<Rol, string>`, así que **agregar un
  rol no produce ningún error de compilación**: la tabla cae al `?? u.rol` de `:112` y
  muestra el valor crudo del enum en pantalla.

**Impacto concreto.** Bajo mientras los roles sean cuatro, y el propio repo dice que
agregar uno *"es una migración más tres ediciones"* — son cinco, y una de las dos que
faltan no avisa. El costo real no es el rol nuevo: es que la lista de `CLAUDE.md` da la
sensación de estar completa.

**Recomendación.** Cambiar `Record<string, string>` por `Record<Rol, string>` —es la
corrección más barata y la única que se defiende sola, porque a partir de ahí el
compilador exige completar la tabla—; reescribir `puedeAdministrar` en positivo
(`['ADMIN','DIRECTIVO','STAFF'].includes(u.rol)`), que además deja el paralelo con la
anotación de Java a la vista; y sumar los dos archivos a la lista de `CLAUDE.md:139`.

**Esfuerzo: XS**

> **Remediado el 2026-08-14 — RESUELTO**, adelantado de la tanda 8 porque la tanda 5
> tocaba los dos archivos y dejarlo a medias era peor. `NOMBRE_DE_ROL` es
> `Record<Rol, string>`; los dos predicados (`puedeAdministrar` y el nuevo `puedeOperar`)
> enumeran sus roles en un `Rol[]` en vez de negar `USUARIO`; y `CLAUDE.md` dice ahora
> **seis** lugares, no cuatro, con el porqué de la enumeración escrito al lado.

---

#### ARQ-06 — Lógica copiada literalmente entre los dos controllers, incluida una decisión de autorización

**Severidad: Bajo**

**Evidencia.** Tres bloques idénticos, carácter por carácter, en dos archivos:

| Qué | Dónde |
|---|---|
| `esAdmin(Authentication)` — recorre las autoridades buscando `ROLE_ADMIN` | `UsuarioController.java:104-107` y `AlumnoController.java:93-96` |
| `acotar(int)` + `TAMANIO_MAXIMO = 100` | `UsuarioController.java:44,114-119` y `AlumnoController.java:39,98-103` |
| `normalizar(String)` — string vacío a `null` | `UsuarioService.java:201-207` y `AlumnoService.java:121-127` |

**Impacto concreto.** El que importa es el primero: `esAdmin` es una **decisión de
autorización** —determina si se puede otorgar un rol y si se puede tocar una cuenta
administrativa— y está copiada a mano. El proyecto ya tomó la decisión opuesta para el
resto de la autorización, y la argumentó bien: `PuedeOperar.java:16-18` explica que las
reglas viven en un solo lugar *"para que la regla viva en UN lugar. Si mañana cambia
quién puede mirar, se cambia acá y no en veinte controllers, que es donde se cuelan las
omisiones"*. `esAdmin` es exactamente el caso que ese comentario describe, y quedó del
otro lado. Con dos copias no pasa nada; el Módulo 2 agrega el tercero y el cuarto.

`normalizar` tiene además una tercera copia conceptual: el CHECK
`usuario_telefono_no_vacio` que agregó V6. Ahí las tres son deliberadas y están
argumentadas (la base no depende de que el backend se acuerde), así que esa no se toca.

**Recomendación.** Mover `esAdmin` y `acotar` a donde ya viven sus hermanas: `esAdmin`
como método estático al lado de `PuedeOperar` / `PuedeLeerAdministracion` en `config`, y
`acotar` + `TAMANIO_MAXIMO` como método estático de `Pagina`, que es el record que
representa ese concepto. Las dos son mudanzas mecánicas y hay tests que las cubren
(`PermisosPorRolTest`).

**Esfuerzo: S**

> **Remediado el 2026-08-15 (tanda 8) — RESUELTO las dos mudanzas que pedía, y ninguna
> más.**
>
> - **`esAdmin`** vive en `config/Autoridades.java`, al lado de `@PuedeOperar` y
>   `@PuedeLeerAdministracion` — una clase nueva porque un `@interface` no puede llevar
>   métodos estáticos. Su javadoc dice lo que el hallazgo señala: es una **pregunta**, no
>   un guardia; quien autoriza es el servicio. Y deja anotado por qué compara con `equals`
>   contra `"ROLE_ADMIN"` y no por prefijo — Spring Security 7 suma sus propias autoridades
>   a la lista.
> - **`acotar` + `TAMANIO_MAXIMO`** son `Pagina.acotarTamanio(int)` y
>   `Pagina.TAMANIO_MAXIMO`. De paso el `20` mágico que estaba escrito dos veces pasó a ser
>   `TAMANIO_POR_DEFECTO`, al lado del techo.
>
> **`normalizar` NO se tocó, a propósito.** El hallazgo lo lista como tercer bloque
> duplicado pero su recomendación pide mover sólo los otros dos, y mudarlo obligaría a
> decidir dónde vive un helper de dominio compartido entre dos servicios — que es una
> decisión de arquitectura, no una limpieza. Queda como duplicación conocida de dos copias.
>
> **Verificado con `mvn test`: 107/107**, sin tocar un solo test. Que la matriz de permisos
> (`PermisosPorRolTest`, 18 casos) siga en verde es la comprobación que importa: `esAdmin`
> decide si se puede otorgar un rol y si se puede resetear la contraseña de una cuenta
> administrativa.

---

#### ARQ-07 — Tres `package-lock.json` conviviendo, los tres versionados

**Severidad: Bajo**

**Evidencia.**
```
package-lock.json               141 KB   11 ago 23:23
apps/landing/package-lock.json  235 KB    6 ago 19:15
apps/platform/package-lock.json  61 KB    6 ago 19:16
```
Los tres están en `git ls-files`. El raíz es el del workspace (`package.json` raíz
declara `"workspaces": ["apps/landing", "apps/platform"]`); los dos de las apps son
anteriores a que el workspace existiera y **están cinco días atrasados**.

**Impacto concreto.** Con npm workspaces manda el lock de la raíz: `npm install` y
`npm ci` desde arriba lo usan y los otros dos quedan ignorados. El problema aparece
cuando alguien entra a `apps/landing` y corre `npm ci` ahí —cosa razonable de hacer, y
que el README de esa app además sugiere—: instala un árbol de dependencias distinto y
más viejo que el que usa el build real, y cualquier diferencia de comportamiento va a
parecer un misterio.

**Recomendación.** `git rm apps/landing/package-lock.json apps/platform/package-lock.json`
y agregarlos a `.gitignore`. Un solo lock, el de la raíz, que es el que refleja cómo se
instala de verdad.

**Esfuerzo: XS**

> **Remediado el 2026-08-15 (tanda 8) — RESUELTO**, tal cual la recomendación: los dos
> locks de las apps salieron del repo y `apps/*/package-lock.json` entró al `.gitignore`,
> con el porqué escrito ahí.
>
> **Verificado que el lock de la raíz resuelve el workspace entero** (`npm ci --dry-run`
> desde la raíz, sin errores) y que el CI no se apoyaba en los otros dos: su paso de
> instalación es un `npm ci` desde la raíz.
>
> **Un dato que salió de esa corrida y no es de este hallazgo:** el `node_modules` de esta
> máquina **no coincide con el lock de la raíz** — un `npm ci` agregaría 69 paquetes y
> sacaría 20. No lo causa este cambio (borrar un lock ignorado no mueve nada instalado) y
> no rompe nada hoy, pero conviene correr `npm ci` una vez para quedar igual que el CI.

---

#### ARQ-08 — La convención de idioma existe, funciona, y no está escrita en ningún lado

**Severidad: Bajo**

**Evidencia.** El patrón real es claro: **infraestructura y autenticación en inglés,
dominio en español.** Paquetes `auth`, `config`, `web` contra `usuario`, `alumno`,
`profesor`; clases `AuthController`, `TokenService`, `LoginRequest` contra
`SesionService`, `UsuarioService`, `SeguridadConfig`. Se cumple casi siempre. Las
excepciones son las que muestran que la regla no está escrita:

- `LoginRequest` / `LoginResponse` viven en `auth/` y están en inglés;
  **`RegistroRequest` vive en `usuario/dto/` y está en español** — son el mismo concepto
  (el cuerpo de un pedido a un endpoint de `/api/auth`), en dos idiomas y en dos
  paquetes.
- `AuthController` tiene los métodos `login()` y `registro()`, uno en cada idioma, en
  la misma clase y a quince líneas de distancia.
- En el front, `Layout.tsx`, `App.tsx` y `AuthProvider.tsx` están en inglés, rodeados de
  `RutaProtegida.tsx`, `contexto.ts`, `credencial.ts`, `cliente.ts`, `menu.ts` y
  `tipos.ts`.
- `grep -in "convenci|naming|español|english"` sobre `CLAUDE.md`, el plan y los README
  devuelve **una sola línea**, y es sobre el idioma en el que está *escrito* el plan, no
  sobre cómo nombrar el código.

**Impacto concreto — y acá conviene ser preciso: no causó ni un solo bug de mapeo.** Se
verificó el JSON real de las seis respuestas contra los seis tipos de TypeScript y no
hay una sola diferencia de nombre. Los DTO son `record` de Java y Jackson serializa el
nombre del componente tal cual, así que el idioma nunca entra en juego. El costo es de
decisión: cada archivo nuevo obliga a mirar alrededor y adivinar, y ya hay tres casos
donde la adivinanza salió distinta.

**Recomendación.** Escribir la regla que ya se sigue, en tres líneas en `CLAUDE.md`:
dominio en español, infraestructura en inglés, y qué hacer en la frontera. No renombrar
nada de lo que existe —`LoginRequest` con dos tests encima no vale una mudanza—, salvo
que alguna de esas clases se toque por otro motivo.

**Esfuerzo: S**

> **Remediado el 2026-08-15 (tanda 8) — RESUELTO: la regla está escrita en `CLAUDE.md`**,
> como tabla de seis filas más la regla de la frontera. **No se renombró nada**, tal cual
> la recomendación.
>
> **Y al escribirla apareció que la regla no era la que el hallazgo enunciaba.** *"Infra en
> inglés, dominio en español"* describe bien los **nombres de paquete** (`auth`, `config`,
> `web`, `dto` contra `usuario`, `alumno`, `profesor`) y **falla con las clases**: dentro de
> esos mismos paquetes de infraestructura, casi todo está en español —`SeguridadConfig`,
> `AutenticacionDesdeBase`, `ManejadorDeErrores`, `LimitadorDeIntentos`,
> `RespuestaDeNoAutenticado`, `SesionService`—. La regla real es más simple y explica más:
> **inglés sólo donde lo impone el framework o la URL; todo lo demás, español.**
>
> Con eso, las tres "excepciones" que el hallazgo lista dejan de serlo y pasan a ser la
> regla aplicada: `LoginRequest` y `AuthController` se llaman como el endpoint que sirven
> (`/api/auth/login`), y `RegistroRequest` está en español porque `/api/auth/registro`
> también lo está. `App.tsx` y `main.tsx` los impone Vite. **Escribir una convención sirve
> para eso: obliga a mirar si la que uno creía tener es la que hay.**
>
> Los archivos que esta misma tanda creó salieron consistentes con la regla escrita:
> `Autoridades`, `ErrorPorDefecto`.

---

#### ARQ-09 — Solo los tipos de respuesta están en TypeScript; los de pedido son objetos sueltos

**Severidad: Bajo**

**Evidencia.** `tipos.ts` y `tiposAdmin.ts` cubren los seis records de respuesta
(`UsuarioActual`, `LoginResponse`, `Pagina`, `UsuarioResumen`, `UsuarioCreado`,
`AlumnoResumen`, `AltaAlumnoResultado`) y **ninguno de los siete de pedido**
(`LoginRequest`, `RegistroRequest`, `AltaUsuarioRequest`, `EdicionUsuarioRequest`,
`AltaAlumnoRequest`, `EdicionAlumnoRequest`, `CambioPasswordRequest`). Las formas viven
como literales dentro de las funciones: `administracion.ts:31-37`, `:68-73`, `:86`, más
`DatosDeRegistro` en `contexto.ts:18-24`, que es el único que sí tiene nombre.

**Impacto concreto.** La asimetría va en la dirección equivocada. Una respuesta mal
tipada **explota en el front** —se ve—; un pedido mal tipado **no explota en ningún
lado**: Jackson ignora los campos que no conoce, así que un `nivelIngresso` con dos
eses se manda, el backend lo descarta y el alumno queda sin nivel, sin error en ninguna
capa. Hoy hay poco expuesto porque solo hay tres formularios y el mapeo se verificó a
mano; con el Módulo 2, cada reserva es un cuerpo con sala, tipo de uso, fecha y dos
horas.

Un detalle a favor, para no exagerar el hallazgo: la única trampa que este tipado suelto
sí podía provocar —mandar `nivelIngreso: ''` a un enum de Java, que devolvería un 400
incomprensible— **está resuelta**: `AlumnosPagina.tsx:229` hace
`nivelIngreso: datos.nivelIngreso || undefined` antes de enviar.

**Recomendación.** Declarar los tipos de pedido al lado de los de respuesta, en el mismo
archivo y con el mismo nombre que el record de Java, y tiparlos en las funciones de
`administracion.ts`. Es trabajo mecánico y conviene hacerlo ahora, mientras son siete.

**Esfuerzo: S**

> **Remediado el 2026-08-14 — PARCIAL: los cuatro de administración, que son los que la
> tanda 5 tocaba.** `AltaUsuario`, `EdicionUsuario`, `AltaAlumno` y `EdicionAlumno` están
> declarados y exportados en `administracion.ts`, con una nota de qué record de Java
> espeja cada uno. Se declararon **antes** de escribir los formularios nuevos, así que los
> cuerpos de edición y de alta con rol nacieron tipados.
>
> **Quedan tres**, los de autenticación: `LoginRequest`, `RegistroRequest` y
> `CambioPasswordRequest`. Viven en `contexto.ts` y en `CambioPasswordObligatorio.tsx`, que
> esta tanda no tocó; van con la limpieza de la tanda 8, para no mezclar un cambio
> mecánico con uno funcional en el mismo commit.

> **Remediado el 2026-08-15 (tanda 8) — RESUELTO los tres que faltaban.** `LoginRequest`,
> `RegistroRequest` y `CambioPasswordRequest` están declarados en `tipos.ts`, al lado de
> `LoginResponse` y con el mismo nombre que el record de Java, y aplicados en los tres
> lugares que arman el cuerpo (`satisfies` en los dos literales, y el `useState` del
> formulario de registro tipado con el contrato en vez de inferido del literal).
>
> **Y se borró un cuarto tipo que era el mismo contrato con otro nombre:**
> `DatosDeRegistro`, en `contexto.ts`, tenía exactamente los cinco campos de
> `RegistroRequest` — existía porque los tipos de pedido no vivían en ningún lado. Ahora
> el contrato tiene un solo nombre y un solo lugar donde cambiarlo.
>
> **Verificado que el tipado agarra el error que el hallazgo describe**, no sólo que
> compila: escribiendo `passwordNuevaa` en el cuerpo, `tsc` falla con
> *"'passwordNuevaa' does not exist in type 'CambioPasswordRequest'"* — que es exactamente
> el campo que antes se mandaba, Jackson descartaba en silencio y nadie rechazaba. Build,
> `oxlint` y los **54** tests del panel, en verde.

---

#### ARQ-10 — `landing` y `platform` no comparten nada, y en septiembre las dos van a hablar con la misma API

**Severidad: Informativo**

Las dos apps **no tienen un solo archivo en común**: comparando los nombres de archivo de
`apps/landing/src` y `apps/platform/src`, la intersección es vacía. No hay carpeta
`packages/`, ni workspace compartido más allá de los dos declarados en el `package.json`
raíz. Y hoy eso está bien: la landing es estática, no llama a ninguna API y no tiene
nada que compartir.

Se anota porque la decisión del 2026-08-10 dice que los formularios de la landing se
conectan al backend cuando el módulo de alumnos esté vivo, ~septiembre. Ese día la
landing va a necesitar lo mismo que ya existe en `platform`: el envoltorio de `fetch`,
la clase `ApiError`, el parseo de `ProblemDetail` y los tipos de pedido (ARQ-09). Van a
ser dos copias o un paquete compartido, y conviene que sea una decisión y no lo que
salga. Sin recomendación fuerte: con dos consumidores y cuatro formularios, duplicar
también es defendible — lo que no conviene es que la segunda copia aparezca sin que
nadie lo haya notado.

---

### 3.5 SEO — SEO y GEO

Alcance verificado **sobre el HTML generado**, no sobre el código que lo genera: se
corrió `npm run build` (27 páginas, sin errores) y se auditaron los 20 documentos HTML
resultantes — metadata ruta por ruta, canonicals, los 60 bloques de JSON-LD, el
`sitemap.xml` y el `robots.txt` reales, la jerarquía de encabezados, las imágenes y el
texto que queda en el HTML inicial. Lo que no se pudo medir está en §6.3.

**La capa técnica está muy bien hecha.** Las 20 URLs tienen title, description,
canonical, OG y Twitter card; ninguna se repite; hay exactamente un `H1` por página; el
sitemap y el `robots.txt` no se contradicen; el JSON-LD es un grafo real con `@id`
estables. **Y la regla de veracidad se cumple donde el archivo que la declara la
enumera**: en los 20 documentos no hay un solo `price`, `offers`, `aggregateRating`,
`telephone`, `openingHours`, `foundingDate` ni `geo`. Los campos sin confirmar se omiten
de verdad.

El problema está en lo que esa lista no enumeraba.

| ID | Título | Sev | Esf |
|---|---|:--:|:--:|
| SEO-01 | La regla de veracidad se aplicó a la identidad del negocio y no al producto: se publica un curso que no existe y duraciones que contradicen lo confirmado | Alto | M |
| SEO-02 | El email del negocio se publica como hecho verificado en el `LocalBusiness`, y `contact.ts` lo declara placeholder | Medio | XS |
| SEO-03 | El `Disallow` de `/ingresar` impide leer el `noindex` de `/ingresar`, y 21 páginas la enlazan | Bajo | XS |
| SEO-04 | Los conteos de rutas y de URLs están mal en cinco lugares, y ninguno coincide con otro | Bajo | XS |
| SEO-05 | Con JavaScript deshabilitado el sitio es un rectángulo negro | Bajo | XS |
| SEO-06 | Los Core Web Vitals no se midieron, y hay tres factores concretos que los ponen en riesgo | Bajo | M |

---

#### SEO-01 — La regla de veracidad se aplicó a la identidad del negocio y no al producto: se publica un curso que no existe y duraciones que contradicen lo que el cliente confirmó

**Severidad: Alto** · *el ítem de mayor impacto de esta capa, y el que el encargo pedía buscar*

**Evidencia.** El proyecto sabe que estos datos están mal. Está escrito, fechado y
marcado como bloqueante:

- `docs/requirements/platform.md:525` — **❓P34**: *"La duración de los cursos no
  coincide. Relevamiento y confirmación de Ignacio: **DJ = 2 meses, 8 clases, 1 por
  semana**. Landing: **DJ = 6 meses, 2 clases semanales**. Producción: 4 meses vs. 8
  meses. Alguno de los dos está mal y **hay que corregirlo antes de publicar la
  landing**, porque son números que un cliente lee y sobre los que decide."*
- `docs/requirements/platform.md:521` — **✅P31, RESUELTO el 2026-08-11**: *"El curso de
  Mix & Mastering **no existe**: es un servicio y nada más. **La landing lo inventó como
  programa de 3 meses.**"*
- `:512` lo llama *"el más urgente"* de los 37 pendientes.

Lo que la Fase 3 agrega es **dónde terminaron publicados esos números**. No solo en el
texto de la página: en las cuatro capas que un buscador y un motor de respuesta leen
primero.

1. **En el `<title>` de tres páginas** — la cadena que Google copia literalmente al
   resultado de búsqueda:
   ```
   Convertite en DJ — 6 meses en Pilar | La Juanita Studio
   Producción Musical Electrónica — 8 meses en Pilar | La Juanita Studio
   Mix & Mastering — 3 meses en Pilar | La Juanita Studio
   ```
2. **En un `Course` de schema.org, en dos páginas**, para el programa que P31 declara
   inexistente (`/programas/mix-mastering.html` y `/programas`):
   ```json
   { "@type": "Course",
     "@id": "https://lajuanitastudio.com/programas/mix-mastering#course",
     "name": "Mix & Mastering",
     "provider": { "@id": "https://lajuanitastudio.com/#organization" },
     "hasCourseInstance": { "@type": "CourseInstance", "courseMode": "onsite", … } }
   ```
   `Course` con `hasCourseInstance` no describe una intención: declara un curso que se
   dicta, en un lugar, con instancias.
3. **En la respuesta de una `FAQPage`** — que `lib/seo.ts:299-305` describe, con razón,
   como *"el schema de mayor rendimiento del sitio para motores de respuesta… la unidad
   que un LLM extrae y cita"*:
   > *"¿Cuánto duran los programas?"* → *"Convertite en DJ dura **6 meses** con dos
   > clases semanales. Producción Musical Electrónica dura **8 meses**, también con dos
   > clases por semana. **Mix & Mastering es un intensivo de 3 meses** con una clase
   > semanal…"*
4. **En `public/llms.txt:22-28`**, en el formato más extraíble que existe, con las tres
   duraciones y el programa inexistente entre ellas — y en un archivo cuya sección
   *"Pendiente de confirmación"* (`:79-88`) enumera dirección, teléfono, horarios, año
   de fundación y **precios**, pero no las duraciones ni la existencia de los programas.

**Qué pasa hoy.** Nada: la landing no está publicada, y la decisión del 2026-08-10 dice
que no se publica hasta que la plataforma pueda recibir los formularios. Por eso esto es
Alto y no Crítico.

**Impacto concreto.** La asimetría es lo que hay que ver. `data/business.ts` razona con
mucho cuidado sobre un teléfono placeholder —*"no es un TODO cosmético: es un número
equivocado publicado como dato verificado, que Google puede levantar y que después
cuesta muchísimo corregir"*— y el mismo razonamiento aplica, más fuerte, a **la
existencia y la duración de lo que se vende**. Un teléfono equivocado hace que no te
llamen; un curso de tres meses que no existe hace que alguien consulte por él, y una
duración de 6 meses cuando son 2 es la diferencia entre lo que la persona cree que
compra y lo que recibe.

Y corregirlo después no es simétrico. El texto de una página se cambia y en dos semanas
Google reindexa; **una respuesta de `FAQPage` y un `llms.txt` que ya fueron ingeridos por
un motor de respuesta se repiten mucho más tiempo**, sin que exista un botón para
corregirlos. Es exactamente el argumento que el propio proyecto usa para no publicar el
teléfono, aplicado a la información que más pesa comercialmente.

Hay un detalle que muestra que la regla se pensó a medias en este punto:
`lib/seo.ts:236-242` decide **no** publicar `offers` porque *"los precios están marcados
como inventados… un precio en JSON-LD es una promesa"*. El razonamiento es correcto y se
detuvo en el precio: el curso al que se le ocultó el precio se publicó igual.

**Recomendación.** Antes de tocar nada de SEO, cerrar P34 y P31 con el cliente — son una
pregunta de cinco minutos y bloquean todo lo demás. Con la respuesta:

1. **Si Mix & Mastering no es un programa** (que es lo que P31 ya resolvió): sacar
   `/programas/mix-mastering` del sitio, del sitemap, del `llms.txt` y de la respuesta de
   la FAQ, y dejarlo únicamente como servicio en `/servicios`, donde ya tiene su `Service`
   correctamente declarado.
2. **Corregir las duraciones en los tres lugares a la vez** — `data/programs.ts`,
   `data/faq.ts` y `public/llms.txt` — y verificar después del build que el `<title>`, la
   `FAQPage` y el `llms.txt` digan lo mismo.
3. **Agregar a la lista "Pendiente de confirmación" de `llms.txt` todo lo que hoy se
   publica sin confirmar**, no solo los precios.
4. Y la corrección de fondo: la regla dura de `data/business.ts` habla de *"datos del
   local"*. Extenderla explícitamente al catálogo —qué programas existen, cuánto duran,
   qué incluyen— que es donde vive el riesgo comercial.

**Esfuerzo: M**

---

#### SEO-02 — El email del negocio se publica como hecho verificado en el `LocalBusiness`, y el archivo del que sale lo declara placeholder

**Severidad: Medio**

**Evidencia.** En el JSON-LD de **las 20 páginas** del sitio:

```json
{ "@type": ["LocalBusiness","EducationalOrganization"],
  "@id": "https://lajuanitastudio.com/#organization",
  …
  "email": "hola@lajuanitastudio.com",
```

Sale de `lib/seo.ts:172` (`email: CONTACT.email`), y `src/data/contact.ts:1` encabeza el
archivo entero con: *"// Placeholder — reemplazar por los datos reales del local."*

El mecanismo que debería haberlo atajado **no cubre emails**: `isPlaceholder()`
(`data/business.ts:127-137`) detecta exactamente dos cosas, el teléfono de ejemplo
`1100000000` y los dominios sociales pelados. Y funciona: se verificó que `sameAs`
publica **solo** la URL real de Spotify, y que el Instagram y el YouTube placeholder
quedaron afuera. El email nunca pasa por ese filtro; `compact()` solo descarta `null`,
`undefined` y arrays vacíos, y un string llega entero.

Del mismo archivo sale un segundo detalle menor: el `sameAs` de Spotify se publica con
el token de sesión de compartir pegado
(`…/artist/5OtyxNQ58Q3rvKLj9ezi0s?si=3LHrxDroTemhR6tfMVNn0Q`). Un `sameAs` debería ser
la URL canónica del perfil; el `?si=` es el sufijo que agrega el botón "compartir".

**Qué pasa hoy.** El sitio no está publicado. Cuando lo esté, `hola@lajuanitastudio.com`
queda declarado como el email del negocio en los datos estructurados de las 20 páginas.

**Impacto concreto.** Es el mismo escenario que el archivo describe para el teléfono, con
el mismo desenlace: Google puede mostrarlo en la ficha del lugar, un asistente de IA lo
dicta cuando le preguntan cómo contactar al estudio, y quien escriba ahí no le escribe a
nadie si esa casilla no existe. La diferencia con el teléfono es que el email **es
plausible** —está en el dominio propio— y por eso es más probable que nadie lo revise.
Un lead perdido no deja rastro: no rebota en la pantalla de nadie.

**Recomendación.** Tres líneas, y conviene hacerlas juntas: **(a)** confirmar con el
cliente si esa casilla existe y funciona; **(b)** hasta que lo confirme, pasar el email
por la misma puerta que todo lo demás —moverlo a `business.ts` con su marca
`VERIFICADO`/`PENDIENTE`, o extender `isPlaceholder()` para que reconozca las casillas
genéricas (`hola@`, `info@`, `contacto@`) sobre el dominio propio—; **(c)** limpiar el
`?si=` del enlace de Spotify. Lo que hay que corregir de fondo es que
`isPlaceholder()` reconoce **dos** placeholders concretos y `contact.ts` declara que
**todo** el archivo lo es.

**Esfuerzo: XS**

---

#### SEO-03 — El `Disallow` de `/ingresar` impide leer el `noindex` de `/ingresar`, y las 21 páginas la enlazan

**Severidad: Bajo**

**Evidencia.** Los tres hechos, medidos sobre el build:

- `robots.txt` generado: `Disallow: /ingresar`, en los tres grupos de agentes.
- `/ingresar.html`: `<meta name="robots" content="noindex, nofollow">`.
- **21 de las 21 páginas generadas enlazan a `/ingresar`**, y ninguno de los tres
  enlaces lleva `rel="nofollow"`: están en la barra de navegación, en el menú móvil y en
  el pie, o sea en el layout.

`src/app/robots.ts:30-32` describe las dos primeras como piezas complementarias: *"La
página además ya declara `robots: { index: false }`; esto es **la otra mitad**, que
ahorra el rastreo."*

**Qué pasa hoy.** No son dos mitades: **una anula a la otra.** Para obedecer un `noindex`
hay que leerlo, y para leerlo hay que descargar la página — que es justo lo que el
`Disallow` prohíbe. Con 21 enlaces internos apuntando ahí, Google descubre la URL, ve que
no puede rastrearla, no llega nunca al `noindex`, y puede indexarla igual **sin
contenido**: es el caso que Search Console reporta como *"Indexada aunque bloqueada por
robots.txt"*.

**Impacto concreto.** Chico: lo peor que pasa es un resultado feo con la URL pelada para
una página sin valor de búsqueda, más un aviso permanente en Search Console. Se anota
porque el comentario del código afirma lo contrario de lo que ocurre, y porque la
solución es elegir una de las dos, no sumarlas.

**Recomendación.** Quedarse con el `noindex` y **sacar el `Disallow`**: es la
combinación que efectivamente saca la página del índice, y el costo de rastreo de una
URL es irrelevante en un sitio de 20. Si además se quiere ahorrar el rastreo, agregar
`rel="nofollow"` a los tres enlaces del layout. Y corregir el comentario de `robots.ts`,
que hoy enseña el patrón equivocado.

**Esfuerzo: XS**

---

#### SEO-04 — Los conteos de rutas y de URLs están mal en cinco lugares, y ninguno coincide con otro

**Severidad: Bajo** · *incluye una corrección a la Fase 2 de este mismo informe*

**Evidencia.** Los números reales, contados sobre el árbol y sobre el build:
**13 archivos de ruta** (`find src/app -name page.tsx | wc -l` → 13), **20 URLs de
contenido** generadas, **19 en el sitemap** (las 20 menos `/ingresar`).

| Dónde | Qué dice | Realidad |
|---|---|---|
| `CLAUDE.md:83` y `README.md:7` | *"Catorce rutas"* / *"Fourteen routes"* | **13** archivos de ruta |
| `src/app/sitemap.ts:10` | *"En un sitio de **21 URLs**"* | **19** en el sitemap, 20 en el sitio |
| `src/app/robots.ts:10` | *"que un buscador descubra las **21 URLs** de una"* | ídem |
| `src/lib/seo.ts:75` | *"**22 páginas** generadas, cero canonical"* | 20 de contenido (27 entradas contando iconos, `robots.txt`, `sitemap.xml`, `opengraph-image` y `_not-found`) |
| `public/llms.txt:11` | *"sin tener que rastrear **catorce páginas** de HTML"* | 20 |
| `apps/landing/CLAUDE.md:485` | 19 | ✅ **el único correcto**, y es el del sitemap |

**Impacto concreto.** Ninguno funcional. Vale por dos motivos. El primero es que
`sitemap.ts` y `robots.ts` son los dos archivos cuyo trabajo es declarar cuántas URLs
tiene el sitio, y los dos tienen el número mal en el comentario. El segundo es de
proceso: son seis lugares que había que actualizar cuando se agregó el blog, y se
actualizó uno.

**Corrección a este informe.** La Fase 2 verificó *"catorce rutas"* como **correcto**
(matriz, fila 10, y Anexo) contando mal. Son 13. La conclusión de esa fila —que
`requirements/landing.md` omite el blog— sigue en pie; el número al que se la comparó,
no.

**Recomendación.** Corregir los cinco, y de paso dejar de contar a mano: el número de
URLs sale de `sitemap().length`, y en un comentario conviene escribir "las URLs del
sitemap" en vez de una cifra que envejece con cada página nueva.

**Esfuerzo: XS**

---

#### SEO-05 — Con JavaScript deshabilitado el sitio es un rectángulo negro

**Severidad: Bajo**

**Evidencia.** El preloader se emite en el HTML inicial como un telón opaco:

```html
<div class="pointer-events-none fixed inset-0 z-[100] …" aria-hidden="true">
  <div class="absolute inset-0 flex">
    <div data-curtain="true" class="h-full flex-1 bg-ink"></div> … (×N)
```

Son paneles `bg-ink` (el negro de la marca) a pantalla completa, que **solo se corren
cuando GSAP los anima**: `grep "data-intro" src/app/globals.css` no devuelve nada, o sea
que no hay ninguna regla CSS que los saque sin JavaScript. Y no hay un solo `<noscript>`
en todo el documento.

**Lo importante primero, porque es lo que más pesa para esta fase:** el contenido **sí**
está en el HTML del servidor. Medido: **7.664 caracteres** de texto en la home, 4.104 en
una página de programa, 3.565 en la FAQ, con la jerarquía de encabezados completa y los
9 pares pregunta/respuesta de la FAQ presentes en el marcado. Un extractor de texto —que
es lo que usan los motores de respuesta, y casi ninguno ejecuta JavaScript ni aplica
CSS— se lleva la página entera. **El GEO no está comprometido.**

**Qué pasa hoy.** Un navegador que aplica CSS pero no ejecuta JavaScript —JS
deshabilitado, una extensión que bloquea el bundle, o simplemente el chunk de GSAP que
no llega— muestra la página completa **tapada por un telón negro**, sin ningún mensaje.

**Impacto concreto.** Bajo en volumen: la gente con JavaScript apagado es marginal. Lo
que lo hace anotable es el modo de falla: no se degrada, se apaga. Cualquier error que
impida correr la animación deja el sitio en negro en vez de dejarlo feo pero usable, y
eso incluye el caso más probable de todos, que es un error de JavaScript en producción.

**Recomendación.** Una regla de una línea:

```html
<noscript><style>[data-curtain]{display:none!important}</style></noscript>
```

Y, ya que el `Preloader` tiene una red de seguridad para el Hero cuando la intro nunca
emite su evento (`Preloader.tsx:19-22`), conviene que el telón tenga la suya: un
`setTimeout` que lo saque pase lo que pase.

**Esfuerzo: XS**

---

#### SEO-06 — Los Core Web Vitals no se midieron, y hay tres factores concretos que los ponen en riesgo

**Severidad: Bajo** · *el hallazgo es sobre todo el hueco de medición; ver §6.3*

**Evidencia — lo que sí se midió, sobre el build de producción:**

- **1,1 MB de JavaScript** en `.next/static/chunks` sin comprimir, con el chunk más
  grande en 224 KB. GSAP, sus plugins y el smooth scroll cargan en **todas** las rutas.
- **El preloader tapa la pantalla ~2 s** en la primera visita de cada sesión
  (`Preloader.tsx:19`). Está bien construido —corre una vez por sesión, respeta
  `prefers-reduced-motion` y usa `sessionStorage`—, pero durante esos dos segundos hay un
  telón opaco sobre el contenido, que es el intervalo en el que se mide el LCP.
- **Las 16 imágenes de la home están bien resueltas para CLS**: todas usan el modo `fill`
  de `next/image` con el contenedor dimensionado (`position:absolute; height:100%;
  width:100%`), así que la falta de `width`/`height` en el `<img>` **no** genera
  desplazamiento. Las 15 que no son el hero van `loading="lazy"`. Ninguna imagen del
  sitio carece de `alt` — las 8 con `alt=""` son texturas de fondo con opacidad 0,16, que
  es el uso correcto de un alt vacío.
- **La imagen del hero se carga eager pero sin `fetchpriority="high"`**, que es el único
  ajuste de rendimiento concreto que salió de esta revisión.
- Las fuentes se sirven self-hosted con `next/font` (5 `<link rel="preload" as="font">`),
  que es la estrategia correcta y evita el bloqueo por CSS externo.

**Qué no se pudo medir.** No se corrió Lighthouse ni se tomó ninguna métrica de campo.
**LCP, INP y CLS de este sitio son, hoy, desconocidos** — lo de arriba son las entradas
del problema, no el resultado.

**Impacto concreto.** Los tres factores apuntan al mismo lado: el LCP. Un telón de dos
segundos y un bundle de animación que carga en todas las rutas son, cada uno, capaces de
empujar el LCP por encima del umbral de 2,5 s en un celular de gama media con datos
móviles — que es el dispositivo desde el que alguien busca "clases de dj en pilar". Y a
diferencia del resto de esta capa, no es algo que se pueda dictaminar leyendo: hay que
medirlo.

**Recomendación.** Antes de publicar, correr Lighthouse en modo móvil sobre `/`,
`/programas/convertite-en-dj` y `/faq`, con la caché fría y con `sessionStorage` limpio
para que el preloader corra. Con esos tres números se decide si el preloader se acorta,
si el bundle de motion se carga diferido en las rutas interiores, o si no hay nada que
hacer. Mientras tanto, agregar `priority` a la imagen del hero, que cuesta una línea y no
depende de ninguna medición.

**Esfuerzo: M**

---

### 3.6 QA — Calidad, tests y operación

Alcance verificado: se mapearon los 57 tests de Java contra los 14 endpoints uno por
uno, se comprobó qué corre y qué no en el build, se corrieron los dos linters, se
calcularon los contrastes de la paleta en sus dos temas, y se revisaron los formularios,
el acordeón y el menú por accesibilidad. Lo que no se cubrió está en §6.3.

| ID | Título | Sev | Esf |
|---|---|:--:|:--:|
| QA-01 | Los 57 tests cubren la autenticación de punta a punta y la lógica del módulo que se está construyendo, nada | Alto | M |
| QA-02 | Precios inventados publicados sin salvedad y seis notas técnicas firmadas con los nombres de tres personas reales | Alto | M |
| QA-03 | Las 109 pruebas SQL no están en el build: se corren a mano copiando nueve comandos de un comentario | Medio | M |
| QA-04 | No hay pipeline: nada corre nada salvo que alguien se acuerde | Medio | M |
| QA-05 | El frontend no tiene tests, ni infraestructura para tenerlos | Medio | S |
| QA-06 | Cuatro combinaciones de la paleta fallan el contraste AA, y una es el borde de los campos de formulario | Medio | S |
| QA-07 | No hay forma de saber si el sistema está vivo | Bajo | S |

---

#### QA-01 — Los 57 tests cubren la autenticación de punta a punta y la lógica del módulo que se está construyendo, nada

**Severidad: Alto**

**Evidencia.** Los siete archivos de test son todos `@SpringBootTest` con `MockMvc`, así
que la forma correcta de medir su cobertura es por endpoint ejercitado, no por clase
nombrada. Contando las llamadas HTTP de los 57 casos:

| Endpoint | Veces que lo llama un test |
|---|---|
| `GET /api/me` | 8 |
| `GET /api/alumnos` | 8 |
| `POST /api/me/password` | 5 |
| `POST /api/usuarios` | 4 |
| `POST /api/auth/login` | 4 |
| `POST /api/auth/registro` | 3 |
| `GET /api/usuarios` | 3 |
| `POST /api/alumnos` | 2 |
| `PATCH /api/usuarios/{id}/activo` | 3 |
| `PUT /api/usuarios/{id}` | 2 |
| **`GET /api/usuarios/{id}`** | **0** |
| **`GET /api/alumnos/{id}`** | **0** |
| **`PUT /api/alumnos/{id}`** | **0** |
| **`PATCH /api/alumnos/{id}/estado`** | **0** |

Cuatro de los catorce endpoints no los toca ningún test. Tres de esos cuatro tampoco los
llama la interfaz (ARQ-02), así que hoy son código que nada ejercita; **el cuarto,
`PATCH /api/alumnos/{id}/estado`, sí lo usa la pantalla** (`administracion.ts:77-79`,
llamado desde `AlumnosPagina`) y no tiene un solo test.

Y lo más importante no es el conteo de endpoints sino **qué queda sin probar del módulo
que se está construyendo**. Las dos únicas llamadas a `POST /api/alumnos` están dentro de
`CredencialVigenteTest:163` y `PermisosPorRolTest:210`, y en las dos el alta es un
**medio para probar permisos**, no el objeto de la prueba. De `AlumnoService` no hay test
de:

- **La regla del camino excluyente** (`AltaAlumnoRequest.tieneExactamenteUnCamino()`): que
  mandar `idUsuario` y `usuarioNuevo` a la vez, o ninguno de los dos, dé 400.
- **El camino `idUsuario`** — inscribir a alguien que ya tiene cuenta, que es el caso que
  el modelo `usuario`-raíz existe para soportar. **Ningún test lo ejecuta nunca.**
- **El guardia de alumno duplicado** (`AlumnoService.java:72-74`).
- **La promesa transaccional**, escrita en el javadoc: *"si el alta del alumno falla, la
  cuenta recién creada se deshace con ella y no queda un usuario huérfano"*
  (`AlumnoService.java:43-45`). Es una afirmación falsable y nada la falsea.
- `editar` y `cambiarEstado`.

Y un caso que merece nombre propio: **ningún test pasa `?buscar=`, `?estado=` ni
`?pagina=`** (`grep` sobre todo `src/test/java` → cero resultados). O sea que
`Busqueda.patron()` **nunca se ejecuta con un patrón real**. Esa clase existe por dos
bugs encontrados a los golpes y documentados en su propio javadoc: el `function
lower(bytea) does not exist` cuando el parámetro llega nulo, y el escapado de `%` y `_`.
Los dos pueden volver sin que nada se ponga rojo.

**Qué pasa hoy.** `mvn test` da 57/57 y esa cifra se cita en el README y en el plan como
señal de salud. Lo que garantiza es que el login, el token, los permisos por rol y la
contraseña temporal funcionan —y lo garantiza muy bien, con casos adversariales—. No
garantiza nada del Módulo 1.

**Impacto concreto.** La próxima tanda es `inscripcion`, que se construye encima de
`alumno`. Cualquier refactor de `AlumnoService` —y va a haber uno, porque hay que
agregarle inscripciones— se hace sin red: los tests van a seguir en verde porque prueban
otra cosa. Es el momento más barato para cerrar el hueco, porque el módulo tiene ocho
métodos y no ochenta.

**Recomendación.** Un `AlumnoTest` con el mismo formato que los que ya existen (mismo
`@SpringBootTest`, mismo `MockMvc`), con seis casos que cubren lo que falta: los dos
caminos del alta, el caso de los dos caminos juntos, el alumno duplicado, `cambiarEstado`
y **un caso de buscador con un patrón que incluya un `%`**, que es el que protege
`Busqueda`. Es media jornada y deja el módulo con la misma red que tiene la autenticación.

**Esfuerzo: M**

> **Remediado el 2026-08-14 — RESUELTO, con 20 casos en vez de los 6 recomendados.**
> `AlumnoTest`, mismo formato que el resto de la suite (`@SpringBootTest`, `MockMvc`,
> `@Transactional`). `mvn test` **106/106**, eran 86.
>
> Los seis de la recomendación, más los que aparecieron al escribirlos:
>
> - **El camino `idUsuario`**, que ningún test ejecutaba nunca. Verifica además que no se
>   cree una segunda cuenta y que no venga contraseña temporal: es el caso que justifica
>   que `usuario` sea la identidad raíz.
> - Los dos caminos juntos, ninguno de los dos, y el usuario inexistente (404).
> - El guardia de alumno duplicado.
> - **La promesa transaccional** del javadoc, que era una afirmación falsable que nada
>   falseaba. Con una salvedad honesta: se fuerza el fallo con un email ya tomado, que es
>   **el único modo de falla que el endpoint puede producir hoy** por ese camino. Cuando
>   `inscripcion` agregue pasos posteriores a la creación de la cuenta va a hacer falta un
>   caso que falle más tarde.
> - `editar` (incluido el recorte de espacios y el instagram vacío → `null`),
>   `cambiarEstado` —el único endpoint que la pantalla usa y ningún test tocaba—,
>   `GET /{id}`, el filtro por estado y el acotado del tamaño de página.
> - **Y el buscador**: `?buscar=` con un `%`, con un `_`, y vacío. Los tres casos de
>   `Busqueda`, que nunca se había ejecutado con un patrón real.
>
> Dos casos fallaron al escribirlos, por un error propio que vale anotar: `comoStaff()`
> crea su propio usuario, así que pedir la credencial **después** de contar las cuentas
> mueve el número que se está midiendo.

---

#### QA-02 — Precios inventados publicados sin salvedad, y seis notas técnicas firmadas con los nombres de tres personas reales

**Severidad: Alto** · *hallazgo de negocio, no de código*

**Evidencia**

**(a) Precios.** Cuatro números que un cliente lee y sobre los que decide, todos
placeholder:

| Dónde | Precio | ¿Lleva salvedad? |
|---|---|---|
| `data/services.ts:31` — alquiler de cabina | `$18.000 / hora` | Sí: *"Precio de referencia — se confirma al reservar"* (`:32`) |
| `data/services.ts:49` — grabación de sets | `$65.000 / hora` | Sí (`:50`) |
| `data/programs.ts:70` — Convertite en DJ | `Desde $85.000/mes` | **No** |
| `data/programs.ts:151` — Producción Musical | `Desde $110.000/mes` | **No** |

La cabecera de `data/services.ts:2` lo dice: *"placeholder, confirmar precios y qué
incluye"*. Los dos servicios se protegieron con una nota al pie; **los dos programas, que
son las decisiones de plata más grandes del catálogo, no**. Y son las páginas con
prioridad 0,9 en el sitemap.

**(b) Las seis notas del blog.** `data/posts.ts` firma cuatro de las seis con nombres de
personas reales e identificables, que son los mismos tres profesores que
`data/teachers.ts` presenta con foto y biografía: **Ghezz** (`:69` y `:312`), **Najles**
(`:133`) y **Chapa Castelo** (`:218`); las otras dos van como "Equipo La Juanita".

Lo que la Fase 3 agrega, y que no estaba anotado en ningún lado: **la atribución no es
solo texto en pantalla, es dato estructurado.** Cada nota emite un `BlogPosting` con:

```json
"author": { "@type": "Person", "name": "Ghezz" },
"publisher": { "@id": "https://lajuanitastudio.com/#organization" }
```

O sea que el sitio declara, en formato legible por máquina, que esa persona escribió ese
artículo técnico. Y en `/profesores` emite además un `Person` para cada uno con
`worksFor` apuntando a la misma organización: las dos entidades se enlazan solas.

**(c) Los formularios.** Los cuatro envían a ningún lado y contestan "listo"
(`Fields.tsx:9-17`). Es la razón declarada por la que la landing no se publica, así que
no se cuenta como hallazgo nuevo — se lista acá porque es la tercera pata del mismo
problema: **contenido que se comporta como real sin serlo.**

**Impacto concreto.** Los tres tienen dueño distinto y ninguno es técnico. Los precios:
alguien decide gastar $85.000 por mes con un número inventado, y el reclamo cuando el
precio real sea otro no lo recibe el desarrollador. Las notas: es la **reputación
profesional de tres personas**, a quienes se les atribuyen opiniones técnicas que no
escribieron, en un rubro donde el criterio propio *es* el activo. No hay constancia de
que ninguno de los tres lo sepa. Y lo que lo empeora respecto de un texto de marketing
inventado es que el `BlogPosting` con `author` es exactamente el marcado que Google usa
para atribuir autoría y que un motor de respuesta cita como *"según Ghezz, de La Juanita
Studio…"*.

**Recomendación.** Tres decisiones, ninguna de código, y las tres antes de publicar:

1. **Precios**: o se confirman con el cliente, o los dos programas llevan la misma
   salvedad que ya tienen los servicios. Lo que no puede quedar es la asimetría actual,
   donde el número chico está protegido y el grande no.
2. **Notas**: la vía limpia es preguntarles a los tres si las firman. Si dicen que sí,
   que las revisen y queda registrado. Si no hay tiempo para eso antes de publicar, se
   pasan a "Equipo La Juanita" —que es lo que las otras dos ya hacen— o se despublica el
   blog hasta tener contenido propio. Cambiar el `author` del `BlogPosting` es parte de la
   corrección, no un detalle aparte.
3. Sumar las dos al checklist de pre-publicación, que hoy vive repartido entre
   `apps/landing/CLAUDE.md` y `requirements/landing.md`.

**Esfuerzo: M** (casi todo es tiempo del cliente, no de desarrollo)

---

#### QA-03 — Las 109 pruebas SQL no están en el build: se corren a mano copiando nueve comandos de un comentario

**Severidad: Medio**

**Evidencia.** Las dos suites son archivos `.sql` en `src/test/resources/db/`, y la única
forma de correrlas es el procedimiento que está escrito en su propia cabecera
(`pruebas-adversariales.sql:15-30`): crear una base descartable, copiar seis migraciones
con `docker cp`, aplicarlas una por una y después copiar y ejecutar el `.sql`. Son nueve
comandos. `pom.xml` no tiene ninguna configuración de `surefire` que las incluya, y
`mvn test` no las toca — verificado en la corrida de la Fase 4, donde los 57 casos que
corrieron fueron todos de Java.

Que eso se paga ya está demostrado en este mismo informe: DOC-03 documenta que la
cabecera de `pruebas-reglas-negocio.sql` sigue diciendo `V1..V5` cuando el esquema va por
V6, y el `plan:438-441` cuenta que las 69 pruebas ya se editaron una vez al aplicar `V4`
y **no se corrieron**. Un archivo que solo corre cuando alguien se acuerda se
desactualiza cuando alguien se olvida.

**Impacto concreto.** Es la asimetría que importa: **`mvn test` en verde no dice
absolutamente nada sobre las 55 CHECK, los 10 triggers y los 2 EXCLUDE** — que es donde
este proyecto decidió poner sus reglas de negocio. Toda la garantía de la capa más
cuidada del sistema depende de un procedimiento manual de nueve pasos. Y DB-03 es la
prueba de que el hueco se cuela: una contradicción entre un trigger y un EXCLUDE que las
109 pruebas no ven porque ningún caso usa la combinación que la expone.

**Recomendación.** Dos escalones, y el primero vale la pena aunque no se haga el segundo:

1. **Un script en el repo** (`scripts/pruebas-sql.sh`) con los nueve comandos adentro, en
   vez de en un comentario. Convierte "leer la cabecera y copiar" en "correr un comando",
   y de paso deja de haber dos cabeceras que mantener sincronizadas con la lista de
   migraciones.
2. **Testcontainers**, que el propio plan ya tiene anotado como *"hace falta pronto"*
   (`plan:512`): una base descartable por corrida, las migraciones aplicadas por Flyway y
   los dos `.sql` ejecutados desde un test de JUnit. Con eso las 109 pruebas entran en
   `mvn test` y en cualquier pipeline futuro sin trabajo extra, y se resuelve de paso la
   deuda #3 del plan —los tests de JPA corriendo contra la base de desarrollo—.

**Esfuerzo: M**

> **Remediado el 2026-08-14 — RESUELTO por el escalón 1, que es el que la recomendación
> decía que valía la pena aunque no se hiciera el segundo.** `scripts/pruebas-sql.sh`.
>
> Hace algo más que empaquetar los nueve comandos: **la lista de migraciones no se
> escribe, se lee del directorio** (`sort -V`, para que `V10` no se aplique antes que
> `V2`). Eso ataca la causa raíz que el hallazgo señala —la lista duplicada en las dos
> cabeceras, que se desactualizó con `V4` y con `V6`—, así que **las dos cabeceras dejaron
> de llevarla** y una migración nueva entra en la corrida sola.
>
> Y lo que lo hace usable desde un pipeline: **sale con código distinto de cero si algún
> caso falla**, nombrándolo. Las suites imprimen su resumen pero terminan en 0 pase lo que
> pase, así que sin esto el CI las habría corrido siempre en verde.
>
> Dos modos, para que el mismo script sirva local y en CI: `docker exec` contra el
> contenedor de desarrollo, o `psql` directo si hay `PGHOST` — en Actions Postgres es un
> servicio, no un contenedor al que se le pueda hacer `exec`.
>
> **Verificado en verde y en rojo**, que es lo que hay que verificar de un script así:
> 86/86 y 50/50 con exit 0; y dando vuelta a mano la expectativa del caso 84, reporta
> `#84 … PASO cuando debería haber fallado` y sale con exit 1. El modo `directo` se
> ejercitó aparte, dentro de un contenedor con cliente de Postgres, porque en esta máquina
> no hay `psql` en el `PATH`.
>
> **El escalón 2 (Testcontainers) sigue abierto**, y ahora es menos urgente: las 136
> pruebas ya corren en cada push. Lo que Testcontainers agregaría es sacarlas del `docker`
> del host y resolver la deuda #3 del plan.

---

#### QA-04 — No hay pipeline: nada corre nada salvo que alguien se acuerde

**Severidad: Medio**

**Evidencia.** `ls -a .github` → no existe. No hay `.gitlab-ci.yml`, ni `Jenkinsfile`, ni
ningún otro archivo de integración continua en el repositorio. Y no hay un script `test`
en **ninguno** de los tres `package.json` (raíz, `landing`, `platform`): `grep '"test'`
sobre los tres no devuelve nada.

Hoy el proyecto tiene **cuatro** cosas que se pueden verificar y **cuatro** formas
distintas de hacerlo, todas manuales: `mvn test` en `apps/backend`, el procedimiento de
nueve pasos de QA-03, `npm run build` en cada app, y `oxlint` / `eslint` en cada app.

**Impacto concreto.** Lo que un pipeline mínimo habría atajado, con nombre y apellido de
este informe: **que las seis migraciones apliquen limpio sobre una base vacía** —que
nadie había verificado hasta la Fase 1 de esta auditoría, y que la única forma de
comprobar es crear una base nueva, o sea justo lo que un pipeline hace en cada corrida—.
Y lo que no habría atajado, para no venderlo de más: ARQ-01, SEO-01 y DB-01 son huecos de
diseño, no regresiones, y ningún CI los encuentra.

El otro costo es de proceso y ya está medido en este informe: el último commit se llama
*"Documentacion al dia"* sobre un árbol donde el código que documenta no está commiteado
(DOC-09). Un pipeline no arregla eso, pero hace visible el desfasaje en cada push.

**Recomendación.** Un solo workflow de GitHub Actions, con cuatro pasos y un servicio de
Postgres —que Actions provee sin configurar nada—:

```yaml
services: { postgres: { image: postgres:16-alpine, env: { … } } }
steps:
  - mvn -f apps/backend test          # 57 casos + las migraciones sobre base limpia
  - bash scripts/pruebas-sql.sh       # las 109 (después de QA-03)
  - npm ci && npm run build:landing && npm run build:platform
  - npx oxlint (platform) && npx eslint (landing)
```

Los cuatro comandos ya existen y ya pasan —se verificó en esta auditoría—, así que el
trabajo es escribir el YAML, no arreglar nada. **Y hacerlo antes de EXT-02**: el día que
se commiteen los dos días de trabajo pendientes es cuando más falta hace que algo mire.

**Esfuerzo: M**

> **Remediado el 2026-08-14 — RESUELTO.** `.github/workflows/ci.yml`, dos jobs en
> paralelo, con los cuatro pasos de la recomendación más los tests de front que QA-05
> agregó.
>
> - **backend**: JDK 21 y un servicio de Postgres con los mismos valores que el compose de
>   desarrollo —que son los *defaults* del `application.properties`—, así el job no define
>   ninguna variable. `mvn test` prueba dos cosas a la vez, porque Flyway aplica al
>   arrancar el contexto: los 106 casos, **y que las ocho migraciones apliquen sobre una
>   base vacía**, que es exactamente el punto del hallazgo. Después, `scripts/pruebas-sql.sh`.
> - **front**: `npm ci` (no `install`: falla si el lock y el `package.json` no coinciden),
>   los 53 tests del panel, los dos builds y los dos linters.
>
> **Se verificó comando por comando en local**, no solo escribiendo el YAML: `mvn test`
> 106/106; el script SQL en su modo `directo` —el que **solo** usa el CI y en esta máquina
> nunca se había ejercitado, porque no hay `psql` en el `PATH`— corrido dentro de un
> contenedor con cliente de Postgres, 86/86 y 50/50, exit 0; los dos builds y los dos
> linters limpios; y `npm ci --dry-run` para confirmar que el lock está en sync.
>
> Node 22 y no 20: Vite 8 pide `^20.19 || >=22.12` y Vitest 4, `20 || 22 || >=24`.
>
> **Lo que queda sin verificar es el YAML corriendo en Actions**, que no se puede probar
> desde acá: se confirma en el primer push.

---

#### QA-05 — El frontend no tiene tests, ni infraestructura para tenerlos

**Severidad: Medio**

**Evidencia.** Cero archivos de test en `apps/platform/src` y en `apps/landing/src`, y
—lo que importa más— **cero dependencias de testing** en los dos `package.json`: no hay
Vitest, ni Jest, ni Testing Library, ni Playwright, ni un script `test`. No es que falten
tests: falta el andamio para escribir el primero. Está declarado como deuda en
`plan:514` (*"El frontend no tiene tests"*), sin evaluación de riesgo.

**Impacto concreto.** Esta auditoría encontró dos defectos del front que un test barato
habría atajado, y sirven para calibrar el riesgo real mejor que cualquier estimación:

- **ARQ-01** — los listados nunca mandan `pagina`, así que se ven 20 filas de 80. Un
  render con 25 filas simuladas lo muestra en un assert.
- **SEC-05** — un `DIRECTIVO` ve botones de escritura que el backend le niega. Un test de
  `menuPara()` y del render con `rol: 'DIRECTIVO'` lo detecta.

Las dos son de la misma familia: **el front decide algo sobre datos que en desarrollo no
existen** (81 filas, un rol que no es el propio). Es exactamente lo que no se descubre
probando a mano con el admin sembrado y dos usuarios.

**Recomendación.** El mínimo viable, no cobertura total. Vitest + Testing Library
—veinte minutos de configuración con Vite ya instalado— y **cinco tests**, elegidos
porque son funciones puras o componentes sin red:

1. `menuPara()` con los cuatro roles y las cuatro combinaciones de `esAlumno`/`esProfesor`
   — es la función de la que el proyecto está más orgulloso y la que nadie verifica.
2. `leerCredencial()` con un token vencido, uno válido y basura en `localStorage`.
3. `interpretarError()` con un ProblemDetail, con un cuerpo sin `detail` (ARQ-04) y con
   un cuerpo que no es JSON.
4. `RutaProtegida` con sesión anónima, cargando, y con `debeCambiarPassword`.
5. `AlumnosPagina` con una página simulada de 25 filas — el que atrapa ARQ-01.

Ninguno necesita backend. Con eso, las tres piezas donde una regresión es invisible
quedan cubiertas, y existe el andamio para que el sexto test cueste cinco minutos.

**Esfuerzo: S**

> **Remediado el 2026-08-14 — RESUELTO.** Vitest + Testing Library sobre jsdom, y los
> cinco archivos que la recomendación eligió: **53 casos, todos verdes**, ninguno necesita
> backend (los que hablan con la API mockean `fetch`).
>
> `menuPara()` (20), `leerCredencial()` (7), el cliente HTTP y su interpretación de
> errores (11), `RutaProtegida` (5) y `AlumnosPagina` (10). Los dos defectos que este
> hallazgo usa para calibrar el riesgo tienen su caso: **81 filas en 5 páginas** (ARQ-01) y
> **un `DIRECTIVO` sin botones de escritura** (SEC-05).
>
> Tres casos que no estaban en la lista y merecen nombre: el **caso Ghezz** (STAFF *y*
> profesor, que es la razón de que los dos ejes estén separados); un **rol inventado** que
> tiene que quedar afuera de los dos predicados, que es lo que fija que estén escritos por
> enumeración y no por negación; y que el **401 del login NO cierre la sesión** mientras el
> de un pedido con credencial sí.
>
> **Vitest 4.1 y no 3.x**: la 3 no soporta Vite 8 y npm instalaba una segunda copia de Vite
> anidada, con lo que `tsc -b` moría comparando dos tipos `Plugin` de dos árboles distintos.
>
> **Encontrado escribiéndolos, no arreglado por estar fuera del alcance de la tanda** — ver
> el hallazgo nuevo QA-08 más abajo: una credencial con `expiraEn` ilegible pasa por
> vigente para siempre. Queda anotado en `credencial.test.ts`, en el lugar donde iría el
> caso.
>
> **Sigue valiendo lo que este hallazgo dice de fondo:** esto es el andamio y las cinco
> piezas críticas, no cobertura. Las pantallas de `Usuarios`, los formularios de alta y
> `AuthProvider` no tienen tests; ahora el sexto cuesta cinco minutos.

---

#### QA-08 — Una credencial con fecha de vencimiento ilegible pasa por vigente para siempre

**Severidad: Bajo** · *hallazgo nuevo, encontrado el 2026-08-14 escribiendo los tests de QA-05*

**Evidencia.** `apps/platform/src/auth/credencial.ts`, en `leerCredencial()`:

```ts
if (Date.parse(credencial.expiraEn) <= Date.now()) {
  borrarCredencial()
  return null
}
```

`Date.parse` de algo que no es una fecha devuelve `NaN`, y **toda comparación con `NaN` es
`false`**. Así que `{"token":"x","expiraEn":"mañana"}` en `localStorage` pasa el chequeo de
vencimiento y `leerCredencial()` lo devuelve como válido. Medido: el test existía, falló, y
se sacó del archivo dejando la nota en su lugar.

**Qué pasa hoy.** Poco, y por eso es Bajo: el token igual lo valida el backend, que lo
rechaza con 401 y ahí el cliente cierra la sesión. El daño real es el que este mismo
archivo dice querer evitar en su javadoc — *"evita el caso feo de arrancar la app, mandar un
pedido con un token muerto y recién ahí enterarse"*—: con la fecha corrupta, la app arranca
creyendo que hay sesión y se entera por el camino largo.

**Impacto concreto.** El caso llega por un formato viejo de la credencial, no por un
ataque. Es exactamente lo que va a pasar el día que `expiraEn` cambie de forma y alguien
tenga la versión anterior guardada en el navegador.

**Recomendación.** Una línea, en el mismo `if`:

```ts
const vence = Date.parse(credencial.expiraEn)
if (Number.isNaN(vence) || vence <= Date.now()) { … }
```

y descomentar el caso que ya está escrito en `credencial.test.ts`.

**Esfuerzo: XS**

> **Remediado el 2026-08-15 (tanda 8) — RESUELTO.** `leerCredencial()` calcula el
> vencimiento una sola vez y rechaza `Number.isNaN(vence)` antes de compararlo, con el
> porqué escrito al lado: una comparación con NaN es siempre false, así que sin ese
> chequeo la credencial corrupta no la rechazaba nadie. El caso que faltaba **entró al
> archivo de tests** —la nota que lo explicaba se reemplazó por el test— y se verificó en
> los dos sentidos: con el arreglo, `npm run test:platform` da **54/54**; guardando el
> arreglo en un stash y volviendo a correr, ese caso **falla**
> (*"expected { token: 'x', expiraEn: 'mañana' } to be null"*) y el resto queda en 53.
> `oxlint` limpio.

---

#### QA-06 — Cuatro combinaciones de la paleta fallan el contraste AA, y una es el borde de los campos de formulario

**Severidad: Medio**

**Evidencia.** Contrastes calculados sobre los valores reales de la paleta, en los **dos**
temas que `ThemeScroller.tsx:31-46` interpola durante el scroll:

| Token | Uso | Tema oscuro | Tema claro | Mínimo | |
|---|---|---:|---:|---:|---|
| `--page-fg` | texto principal | 15,22:1 | 15,22:1 | 4,5:1 | ✅ |
| `--page-muted` | texto secundario (64 usos) | 5,18:1 | 5,14:1 | 4,5:1 | ✅ |
| **`--page-faint`** | **texto tenue (57 usos, incluidas las etiquetas de formulario)** | **2,25:1** | **2,20:1** | 4,5:1 | ❌ |
| **`--page-line`** | **borde inferior de los inputs** | **1,42:1** | **1,48:1** | 3,0:1 | ❌ |
| **`--red`** | acento y enlaces | **4,34:1** | **3,51:1** | 4,5:1 | ❌ |
| blanco sobre `--red` | bloques rojos (`/equipos`, Gear) | 4,56:1 | — | 4,5:1 | ✅ |

Que `--page-muted` dé 5,18 y 5,14 en los dos temas no es casualidad: la paleta **se
ajustó** para pasar en ese nivel. `--page-faint` es el que quedó afuera del ajuste, y es
el que se usa para las etiquetas de los campos (`Fields.tsx:46`,
`text-[color:var(--page-faint)]`) y los placeholders.

Y hay un segundo problema en el mismo lugar: `Fields.tsx:26` aplica **`outline-none`** a
todos los inputs, lo que anula el `:focus-visible` global —que está bien definido en
`globals.css:131-133`, con `outline: 2px solid var(--red)` y `outline-offset: 3px`— y lo
reemplaza por `focus:border-red`, o sea un cambio de color en un borde de 1px que en
reposo tiene 1,42:1. Navegando con teclado, saber en qué campo estás depende de notar que
una línea fina cambió de tono.

Tercero, menor: **no hay enlace de salto al contenido**. Con una barra de navegación en
las 21 páginas, quien navega con teclado la recorre entera en cada página.

**Lo que sí está bien**, y es lo más difícil de este sitio: **`prefers-reduced-motion` se
respeta**, en dos bloques de CSS (`globals.css:516` y `:645`) y en seis guardas de
JavaScript —`Preloader`, `Cursor`, `Magnetic`, `Navbar`, `Footer`, `EditorialRow`—. En un
sitio con esta cantidad de movimiento es la decisión de accesibilidad que más pesa, y
está tomada. El acordeón de FAQ usa `<button type="button">` con `aria-expanded`
(`FaqAccordion.tsx:18-21`) y el menú móvil tiene `aria-expanded` y `aria-label`
(`Navbar.tsx:207-211`). Y del lado de la plataforma, `Campo.tsx` asocia etiqueta e input
envolviéndolos, y marca los errores con `aria-invalid` y `role="alert"` — está mejor
resuelto que el de la landing.

**Impacto concreto.** No es teórico: el token que falla es el de las **etiquetas de los
formularios**, o sea el texto que hay que leer para saber qué escribir, en las cuatro
pantallas por las que entra un cliente. A pleno sol en un celular, 2,2:1 es ilegible. Y
el `--red` a 3,51:1 en las secciones claras afecta a los enlaces, que es donde se hace
clic.

**Recomendación.** Tres cambios, ninguno estructural: subir `--page-faint` a ~0,45 de
opacidad en los dos temas (llega a ~4,5:1 y sigue leyéndose como texto secundario);
subir `--page-line` a ~0,35 **solo para los bordes de formulario** —no hace falta tocar
las líneas decorativas, que no son componentes de interfaz—; y sacar el `outline-none`
de `Fields.tsx:26` para que valga el `:focus-visible` que ya está bien definido. Para el
`--red`, la salida más simple es usar `--red-hover` (#ff3a30, que da 5,56:1 en oscuro)
para texto y dejar el `--red` para fondos y elementos gráficos. Sumar el enlace de salto
es una línea en el layout.

**Esfuerzo: S**

> **Remediado el 2026-08-15 (tanda 8) — RESUELTO los cinco puntos**, y con **dos de las
> tres recomendaciones corregidas**: los números de este hallazgo estaban bien, pero los
> valores propuestos para arreglarlo no alcanzaban.
>
> | Qué | Antes | Ahora | |
> |---|---:|---:|---|
> | `--page-faint` (tinta / papel) | 2,25 / 2,20 | **4,62 / 4,81** | 0.52 y 0.60 |
> | `--page-field` — borde de input *(token nuevo)* | 1,42 / 1,48 | **3,16 / 3,29** | 0.40 y 0.48 |
> | `--page-accent` — rojo de texto *(token nuevo)* | 4,34 / 3,51 | **5,56 / 5,04** | `#ff3a30` / `#b81a1f` |
>
> **La recomendación de subir `faint` a ~0.45 no llegaba**: da 3,72:1, no 4,5. El valor que
> pasa es 0.52, y eso lo deja **casi pegado a `--page-muted` (0.56)** — la escala de tres
> tonos se convierte en dos. Se decidió aceptarlo: un `faint` accesible y a la vez distinto
> de `muted` no existe en esta paleta, y la jerarquía de este sitio la lleva la tipografía.
>
> **Y la salida de `--red-hover` para el rojo de texto era peor que el problema:** sobre
> papel `#ff3a30` da **2,74:1**, contra los 3,51 que ya tenía. Un solo valor no sirve para
> los dos temas, así que el rojo de texto pasó a ser un **sexto token interpolado por
> `ThemeScroller`** (claro sobre tinta, oscuro sobre papel), con `text-red` → `text-accent`
> en los 56 usos. **El rojo de superficie no se tocó**: botones sólidos, banda de Gear y
> `::selection` siguen en `#e52328`, donde el blanco encima ya daba 4,56:1.
>
> El `outline-none` salió de `Fields.tsx`, así que vuelve a valer el `:focus-visible`
> global; el borde de los inputs, los radios de la botonera y el checkbox del login pasaron
> a `--page-field`.
>
> **El enlace de salto NO era una línea en el layout, y ese fue el hallazgo de paso:** el
> interceptor de anclas de `SmoothScroll` hace `preventDefault()` —tiene que hacerlo, ver
> la trampa 12— y con eso se come también el movimiento del foco, que en un salto nativo va
> al destino. O sea que el enlace habría scrolleado dejando el teclado en la navegación:
> no habría salteado nada. El interceptor ahora mueve el foco después de scrollear, y
> `<main>` lleva `id="contenido"` y `tabIndex={-1}`. **Eso arregla de paso todas las anclas
> del sitio**, que hasta hoy movían el scroll y nunca el foco.
>
> **Verificado en el CSS y el HTML compilados**, no en el fuente: `--page-faint:#e8e1d485`
> (0.52), `--page-field:#e8e1d466` (0.40), `.text-accent{color:var(--page-accent)}`,
> `<main id="contenido" tabindex="-1">` y el `.skip-link` presentes; **cero `outline-none`
> y cero `text-red` en las 19 páginas generadas**. `npm run build:landing` y `eslint`,
> limpios. **Sin medición en navegador**: los contrastes están calculados sobre los valores
> de la paleta con la fórmula de WCAG, que es como se midieron los del hallazgo.

---

#### QA-07 — No hay forma de saber si el sistema está vivo

**Severidad: Bajo** · *complementa DOC-08 (sin backup ni deploy) y SEC-02 (sin logs)*

**Evidencia.** `grep -rn "actuator|health"` sobre `pom.xml`, `application.properties` y
`docker-compose.yml` no devuelve nada: **no hay dependencia de Actuator, no hay endpoint
de salud, y el `docker-compose.yml` no define `healthcheck` para ningún servicio.** El
único `restart: unless-stopped` que existe es el de Postgres; el backend todavía no está
en el compose.

**Qué pasa hoy.** Nada, porque no hay nada desplegado.

**Impacto concreto.** El plan pone backend y base en un VPS con Docker Compose
(`plan:159`) y dice explícitamente que *"levantarse si el servidor se cae un domingo a la
noche"* queda del lado de Ignacio (`:174`). Sin healthcheck no hay reinicio automático
—Docker no puede reiniciar lo que no sabe que está caído—, sin logs (SEC-02) no hay forma
de saber por qué se cayó, y sin monitoreo la notificación llega por WhatsApp de Micaela.
Los tres huecos son el mismo: **el sistema no puede contar su propio estado.**

**Recomendación.** Lo mínimo que cambia la situación, y es poco: agregar
`spring-boot-starter-actuator` con **solo** `/actuator/health` expuesto (el resto
deshabilitado, y el endpoint permitido en `SeguridadConfig` sin autenticación), un
`healthcheck` en el servicio del backend en el compose y `restart: unless-stopped`. Con
eso el contenedor se reinicia solo y existe una URL a la que un monitor externo gratuito
puede pegarle cada cinco minutos. Va en la misma tanda que `docs/operacion.md` (DOC-08),
porque son el mismo trabajo.

**Esfuerzo: S**

> **Remediado el 2026-08-14 — RESUELTO lo que se puede sin el compose de deploy.**
> Actuator agregado con **solo** `health` expuesto y `show-details=never`, permitido sin
> autenticación en `SeguridadConfig`; y el healthcheck de Postgres en el compose, con
> `start_period` para que los reintentos no se consuman durante la inicialización.
>
> **Verificado ejecutando las dos mitades**, no solo escribiéndolas: un caso nuevo en
> `PermisosPorRolTest` comprueba que `/actuator/health` responde 200 sin credencial, dice
> `UP` y **no** expone `components` —que traería el estado de la base con su URL—; y
> `docker inspect` sobre el contenedor recreado devuelve `healthy`, con los datos intactos.
>
> **Queda para DOC-08**, que es donde vive: el `restart: unless-stopped` y el healthcheck
> **del backend**, que no se pueden escribir todavía porque el backend no está en ningún
> compose. El endpoint que van a consultar ya existe.

---

### 3.7 DOC — Documentación

*Trece hallazgos verificados. Se transcriben con su evidencia; el detalle completo de
cada uno está en el cuerpo del informe de fase.*

| ID | Título | Sev | Esf |
|---|---|:--:|:--:|
| DOC-01 | `CLAUDE.md` desconoce `V6`, la migración que cierra 10 agujeros de integridad | Alto | XS |
| DOC-02 | La "fuente de verdad" no menciona la auditoría de base del 12/08, ni `V6`, ni el documento que la registra | Alto | S |
| DOC-03 | Las instrucciones de las pruebas SQL siguen aplicando solo `V1..V5` | Medio | XS |
| DOC-04 | `application.properties` describe el comportamiento de bajas **anterior** a la auditoría como vigente | Medio | XS |
| DOC-05 | El doc de alcance dice que el blog no se construyó; existe, con 6 notas inventadas firmadas por profesores reales | Medio | S |
| DOC-06 | `apps/landing/README.md` es boilerplate de `create-next-app`: datos falsos e invitación a deployar en Vercel | Medio | S |
| DOC-07 | El checklist de pre-deploy nombra solo `JWT_SECRET`; las credenciales de Postgres están commiteadas sin override | Alto | S |
| DOC-08 | No existe ningún procedimiento operativo: backup/restore, deploy, o falla de migración | Alto | M |
| DOC-09 | El repositorio no contiene lo que su documentación describe: todo el Módulo 1 sin commitear | Alto | XS |
| DOC-10 | Los cuatro roles se justifican citando una promesa comercial que nombra otros cuatro | Medio | XS |
| DOC-11 | Restos de estado superado: "20 tablas", "platform.md no existe", "21 URLs", "OG image pendiente" | Bajo | XS |
| DOC-12 | Secciones fuera de orden (2.6 antes de 2.5) y árbol de `docs/` incompleto en el README | Bajo | XS |
| DOC-13 | `prompt-auditoria-lajuanita.md` sin trackear en la raíz | Info | XS |

---

#### DOC-01 — `CLAUDE.md` desconoce `V6`, la migración que cierra 10 agujeros de integridad

**Severidad: Alto**

**Evidencia.** `CLAUDE.md:170`: *"…`V4__separar_nombre_apellido.sql` and
`V5__cambio_de_password_obligatorio.sql`. **As of 2026-08-12 all five apply cleanly** to
an empty database."* En disco hay seis: `V6__integridad_auditoria.sql`.
`docs/db/auditoria-2026-08-12.md:24,28`: *"CHECK | 55 (43 en V1..V5 + **12 en V6**)"*,
*"Triggers | 10 (7 de V1 + **3 de V6**)"*.

**Qué pasa hoy.** El archivo que gobierna cómo cualquiera toca el schema enumera cinco
migraciones y afirma haberlas validado todas. La sexta —12 CHECK, 3 triggers, un
EXCLUDE y un UNIQUE parcial— no figura.

**Impacto concreto.** Quien lea `CLAUDE.md` como inventario cree que el schema termina
en V5: puede reescribir constraints que V6 ya impone, o crear un `V6__` propio y
colisionar el número de versión de Flyway. Y la afirmación "las cinco aplican limpio"
nunca cubrió V6.

**Recomendación.** En `CLAUDE.md:170`, agregar `V6` con una línea de qué hace, cambiar
"all five" por "all six" y linkear `docs/db/auditoria-2026-08-12.md`. Sumar en el bloque
"Business rules are enforced in the database" (`:184`) que V6 es la otra mitad de esas
reglas.

**Esfuerzo: XS**

> **Remediado el 2026-08-14 — RESUELTO.** Las dos cosas, más el link a
> `docs/db/auditoria-2026-08-12.md` en los dos lugares y la regla de causa raíz que pide
> DOC-03 (toda migración nueva actualiza las cabeceras de las dos suites SQL).
> **Verificado:** las seis migraciones aplicadas sobre una base vacía y descartable, y
> las dos suites corridas encima — **69/69 y 40/40 sobre V1..V6**.

---

#### DOC-02 — La "fuente de verdad" no menciona la auditoría de base del 12/08, ni `V6`, ni el documento que la registra

**Severidad: Alto**

**Evidencia.** `docs/sistema-gestion-plan.md:6`: *"**Esta es la fuente de verdad**…"*.
Un `grep` de `auditoria-2026-08-12` sobre todos los `.md` del repo, fuera del propio
archivo, devuelve **cero resultados**: ningún documento apunta a ese informe de 450
líneas. La última migración que el plan conoce es `V5` (`:366`). §6d
(`:458`, *"última actualización 2026-08-12"*) no la nombra; §6c (`:407`) documenta la
auditoría **de la API** del mismo día, pero no la de base.

**Qué pasa hoy.** Existen dos auditorías del 12/08. La de la API está narrada; la de
base —10 ataques que funcionaban, `V6`, 40 casos adversariales nuevos— es un archivo
huérfano.

**Impacto concreto.** `CLAUDE.md:14` instruye empezar por §6d y darle prioridad sobre
todo lo demás. Quien siga esa instrucción se pierde qué garantiza la base y qué no, y en
particular las **cinco reglas de negocio que no están implementadas en ningún lado**
(`docs/db/auditoria-2026-08-12.md:65-69`), entre ellas *no consumir más clases que las
contratadas* — que es, textualmente, la razón por la que existe el Módulo 1.

**Recomendación.** Agregar `§6e — Auditoría adversarial de la base (2026-08-12)` con el
formato de §6c y link al informe. Sumar a "Deuda que hay que saldar antes del deploy"
(`:508`) las cinco reglas 🔴 sin dueño: hoy no están ahí y son reglas de negocio, no
deuda técnica.

**Esfuerzo: S**

---

#### DOC-03 — Las instrucciones de las pruebas SQL siguen aplicando solo `V1..V5`

**Severidad: Medio**

**Evidencia.** `apps/backend/src/test/resources/db/pruebas-reglas-negocio.sql:10-17`:
el loop de migraciones termina en `V5`. `:22`: *"Última corrida: 2026-08-12, 69/69 sobre
el esquema **V1..V5**."* Contra `docs/db/auditoria-2026-08-12.md:373`: *"69/69 sobre
**V1..V6**"*. El archivo hermano sí está al día: `pruebas-adversariales.sql:32`
(*"40/40 sobre V1..V6"*) y su loop incluye V6.

**Qué pasa hoy.** Dos afirmaciones incompatibles sobre la misma corrida, y quien siga la
cabecera levanta una base sin V6 y corre 69 casos contra un esquema que ya no es el del
proyecto.

**Impacto concreto.** Es exactamente el fallo de proceso que el plan declara haber
arreglado: `docs/sistema-gestion-plan.md:438-441` cuenta que las 69 pruebas se editaron
al aplicar `V4` y **no se corrieron**, y que se corrigieron sus instrucciones. La
corrección llegó hasta V5 y V6 volvió a dejarlas atrás. Un CHECK de V6 que rompa un caso
"ANDA" no lo detecta nadie.

**Recomendación.** Agregar `V6` a los dos loops y corregir `:22`. Causa raíz: dejar
escrito en `CLAUDE.md` que **toda migración nueva obliga a actualizar las cabeceras de
los dos archivos SQL de prueba**, como una sola unidad.

**Esfuerzo: XS**

> **Remediado el 2026-08-14 — RESUELTO.** `V6` en los dos loops, `:22` corregido a
> *"2026-08-14, 69/69 sobre V1..V6"*, y la regla de causa raíz escrita en los dos lados:
> en `CLAUDE.md` y en la propia cabecera, que es donde la va a leer quien corra las
> pruebas. **Verificado corriendo la suite**, no solo editando la instrucción: 69/69
> sobre una base descartable con las seis migraciones.

---

#### DOC-04 — `application.properties` describe el comportamiento de bajas anterior a la auditoría como si fuera el vigente

**Severidad: Medio**

**Evidencia.** `apps/backend/src/main/resources/application.properties:30-35`: *"…no hay
forma de revocar un token antes de que venza, **asi que dar de baja a alguien tarda hasta
8 horas en cerrarle la sesion** (GET /api/me si lo corta enseguida…)"*. Contra
`CLAUDE.md:164`, `README.md:139`, `docs/requirements/platform.md:88-92` y
`docs/sistema-gestion-plan.md:421-425`, que dicen que corta **en el acto**. Verificado en
código: `config/AutenticacionDesdeBase.java:58,92` resuelve las autoridades desde la base
en cada pedido, no solo en `/api/me`.

**Qué pasa hoy.** El comentario describe con precisión el bug que la auditoría del 12/08
midió y corrigió, y quedó vivo en el archivo de configuración.

**Impacto concreto.** Es la decisión superada conviviendo con la nueva, que la regla
del repo prohíbe. Peor: está en el archivo que se lee justo al configurar el deploy, y
sugiere una garantía más débil de la real — puede motivar a alguien a bajar
`lajuanita.jwt.duracion`, que es la salida que el propio proyecto desaconseja.

**Recomendación.** Reescribir `:30-35`: la baja corta en el acto en **todos** los
endpoints; lo que sigue abierto es solo el **token robado**, que vale hasta 8 h.

**Esfuerzo: XS**

> **Remediado el 2026-08-14 — RESUELTO.** Reescrito con esa distinción, y dejando dicho
> que el texto anterior describía un bug ya corregido, para que nadie lo "restaure".
> No se tocó el comentario sobre los dos formatos de error, que es ARQ-04 y sigue
> abierto.

---

#### DOC-05 — El documento de alcance dice que el blog no se construyó; existe, con seis notas inventadas firmadas por profesores reales

**Severidad: Medio**

**Evidencia.** `docs/requirements/landing.md:39-41`: *"**Blog no se construyó.**"*, y su
cabecera `:3-5` lo repite como corrección. Existe:
`apps/landing/src/app/blog/page.tsx` y `blog/[slug]/page.tsx`, seis posts en
`apps/landing/src/data/posts.ts`, y está en el sitemap (`sitemap.ts:40,66-71`). La tabla
de rutas `:16-28` tiene 11 filas y omite las dos del blog. `apps/landing/CLAUDE.md:31-32`
sí lo documenta, con la advertencia: las seis notas son inventadas y están firmadas con
los nombres reales de Ghezz, Chapa & Castelo y Najles.

**Qué pasa hoy.** El documento que fija qué se comprometió niega la existencia de la
sección de mayor riesgo de publicación del sitio.

**Impacto concreto.** Si el checklist de pre-publicación se arma leyendo
`requirements/landing.md`, el blog no entra, y se publican seis notas técnicas falsas
atribuidas a personas identificables. La advertencia existe, pero vive en otro archivo.

**Recomendación.** Agregar `/blog` y `/blog/[slug]` a la tabla; reemplazar `:39-41` por
el estado real; y subir a "Pendiente" (`:89-96`) el ítem *"reescribir o borrar las 6
notas antes de publicar"* como bloqueante.

**Esfuerzo: S**

---

#### DOC-06 — `apps/landing/README.md` es el boilerplate intacto de `create-next-app`

**Severidad: Medio**

**Evidencia.** `apps/landing/README.md:1` (*"bootstrapped with `create-next-app`"*, 36
líneas sin editar). `:22` afirma que el proyecto usa **Geist**; `src/app/layout.tsx:2`
importa `{ Archivo, Instrument_Serif, Space_Mono }`. `:19` apunta a `app/page.tsx`, ruta
que no existe (es `src/app/`). `:31-35` — *"## Deploy on Vercel"* — contra
`docs/sistema-gestion-plan.md:527`: *"**la landing NO se publica antes que el sistema de
gestión.**"*

**Qué pasa hoy.** El único README de la app terminada es plantilla: se equivoca sobre la
tipografía, apunta a una ruta inexistente e invita a hacer exactamente lo que el
proyecto decidió no hacer.

**Impacto concreto.** Es el hallazgo documental con más chance de causar daño por sí
solo: quien abra `apps/landing/` y lea su README no tiene forma de enterarse de que
publicar hoy pierde leads —los formularios contestan "listo" sin mandar nada—. Todos los
avisos viven en otros archivos.

**Recomendación.** Reescribirlo con el patrón de `apps/platform/README.md` (que está
bien mantenido): qué es, cómo correrlo, **un bloque destacado con la decisión del
2026-08-10**, y punteros a `apps/landing/CLAUDE.md` y `docs/requirements/landing.md`.
Borrar la sección de Vercel.

**Esfuerzo: S**

---

#### DOC-07 — El checklist de pre-deploy nombra solo `JWT_SECRET`; las credenciales de Postgres están commiteadas sin ninguna vía de override

**Severidad: Alto**

**Evidencia.** `README.md:173-181` menciona **exclusivamente** `JWT_SECRET`; ídem
`CLAUDE.md:157` y `docs/sistema-gestion-plan.md:344-345,511`. Contra
`application.properties:3-5`:
```
spring.datasource.url=jdbc:postgresql://localhost:5432/la_juanita
spring.datasource.username=la_juanita
spring.datasource.password=la_juanita
```
sin `${...}`. El único `${}` del archivo es el del JWT (`:26`). `docker-compose.yml` fija
los mismos literales y expone `5432:5432`. No existe `.env.example`.

**Qué pasa hoy.** La documentación presenta un checklist de un ítem con tono de
exhaustividad. Quien lo siga deja el backend con usuario y contraseña `la_juanita` y sin
siquiera una variable que pisar sin editar el `.properties`.

**Impacto concreto.** Deploy real en diciembre con los ~80 alumnos del Notion adentro:
nombre, apellido, email, teléfono. El plan (`:160`) pone backend y Postgres en el mismo
VPS con Docker Compose; contraseña por defecto más puerto 5432 expuesto es la
combinación estándar de base comprometida. Lo grave es la asimetría: el secreto JWT
tiene indirección por entorno **y** avisa por log; el de la base no tiene ninguna de las
dos.

**Recomendación.** (1) Parametrizar `:3-5` como `${DB_URL:…}` / `${DB_USER:…}` /
`${DB_PASSWORD:…}` con el mismo comentario de "solo desarrollo" que ya lleva el JWT.
(2) Reescribir `README.md:173-181` como **tabla de variables por ambiente** —`JWT_SECRET`,
`DB_URL`, `DB_USER`, `DB_PASSWORD` y `lajuanita.cors.origenes` (hoy fijo en
`http://localhost:5173`, `:44`)— con columna dev/producción, más el ítem ya escrito de
desactivar `admin@lajuanita.local`.

**Esfuerzo: S**

> **Remediado el 2026-08-14 — RESUELTO**, las dos partes. `DB_URL`, `DB_USER`,
> `DB_PASSWORD` y `CORS_ORIGENES` van por entorno con el default de desarrollo adentro,
> igual que el JWT; el `docker-compose.yml` hace lo mismo con `POSTGRES_*`. Y el README
> tiene la **tabla de variables por ambiente** de siete filas, con los dos ítems que no
> son variables: no publicar el 5432 en el VPS y desactivar el admin sembrado.
>
> Los defaults **siguen commiteados a propósito** —un clone tiene que arrancar—, pero
> ahora la tabla dice explícitamente que los siete son públicos y que la contraseña de la
> base tiene que ser otra, que era la asimetría que el hallazgo señalaba.

---

#### DOC-08 — No existe ningún procedimiento operativo: backup/restore, deploy, o qué hacer cuando falla una migración

**Severidad: Alto**

**Evidencia.** Un `grep` de `backup|restore|pg_dump` sobre todos los `.md` devuelve un
solo archivo, con dos menciones declarativas:
`docs/sistema-gestion-plan.md:29` (*"sube el estándar en tres cosas… **backups reales de
la base**"*) y `:162` (*"| Backups | Volcado diario de la base al mismo almacenamiento |
Gratis |"*). Cero apariciones de `pg_dump` o `pg_restore`. Sobre fallas de migración,
`CLAUDE.md:159` documenta la causa pero no la salida.

**Qué pasa hoy.** El plan identifica los backups como uno de los tres puntos donde este
proyecto sube el estándar respecto de un trabajo académico, y después nunca los define.
"Volcado diario" es una línea de presupuesto, no un procedimiento: no dice con qué,
cada cuánto, con qué retención, ni —lo que importa— **cómo se restaura y quién probó
que la restauración funciona.**

**Impacto concreto.** Diciembre incluye migrar el Notion de Micaela y correr en paralelo
con el sistema viejo. El día que haga falta restaurar, el procedimiento se improvisa
sobre datos reales de un negocio en uso. Falta además el runbook contiguo: qué hacer
cuando Flyway se planta con un checksum mismatch en producción — el proyecto ya se comió
ese error en desarrollo y la lección quedó como "no lo hagas", sin salida para cuando ya
pasó.

**Recomendación.** Crear `docs/operacion.md` con cuatro secciones, escritas cuando se
decida el hosting en octubre y no antes: (1) backup — comando `pg_dump` exacto,
frecuencia, retención, destino; (2) **restore probado**, con fecha del último ensayo;
(3) deploy — pasos del VPS con Docker Compose; (4) fallas de migración — checksum
mismatch, migración a medio aplicar, rollback.

**Esfuerzo: M**

> **Remediado el 2026-08-14 — RESUELTO en tres de las cuatro secciones; la de deploy
> queda deliberadamente abierta.** `docs/operacion.md`, y **todo lo que afirma se
> ejecutó**.
>
> **El restore está probado de punta a punta, que era el corazón del hallazgo.** Dump de
> la base de desarrollo → base descartable, y el catálogo coincide exacto: 23 tablas, 139
> constraints, 14 triggers, 55 índices, 8 migraciones en `flyway_schema_history`,
> `btree_gist` presente. Pero contar filas y tablas **no alcanza**, porque el modo de
> falla que importa es que el esquema vuelva **sin las reglas**: sobre la base restaurada
> se ejercitaron las tres clases de regla que usa el proyecto y las tres rechazaron —el
> `EXCLUDE` de solapamiento, la FK compuesta de la matriz sala × uso, y el trigger de V7
> que impide borrar historial de clases—. Y el cierre: **se levantó la aplicación real
> contra la base restaurada** y arrancó (`Successfully validated 8 migrations`, `Started
> BackendApplication`).
>
> **El runbook de migraciones también se probó**, el ciclo entero: se corrompió a mano el
> checksum de `V7`, la aplicación no arrancó con el error esperado, `flyway:repair`
> invocado por coordenadas recalculó el checksum desde el archivo (`123456789` →
> `456173863`), y la aplicación arrancó. El plugin **no va al `pom.xml`**: es una
> herramienta de emergencia, no del build de todos los días. El caso B —migración a medio
> aplicar— está escrito y **marcado como no probado**, que es la diferencia entre un
> runbook y una intención.
>
> `scripts/backup.sh` da al cron algo que llamar: nombra por fecha, retiene 7 diarios + 4
> semanales, y **verifica el dump antes de darlo por bueno** (rechaza si pesa menos de
> 50 KB o si `pg_restore -l` no lo puede leer). `backups/` y `*.dump` al `.gitignore`:
> desde diciembre esos archivos llevan datos reales del negocio y hashes de contraseñas.
>
> **La sección 3 (deploy) está incompleta y lo dice en su primer párrafo.** El hosting se
> decide en octubre; escribir pasos de un deploy que nadie corrió sería el mismo error que
> el documento vino a corregir. Lo que falta está listado *como lo que falta*: Dockerfiles,
> `docker-compose.prod.yml`, proxy HTTPS. Lo que sí está escrito y verificado es la tabla
> de **qué pasa si te olvidás de cada variable**, ordenada por lo que cuesta descubrirlo
> (el JWT no arranca; la contraseña de la base **no avisa nunca**).

---

#### DOC-09 — El repositorio no contiene lo que su documentación describe

**Severidad: Alto** · *ver EXT-02 para el eje de riesgo de continuidad*

**Evidencia.** `git log -1` → *"Fase 1 Backend + Auditoria inicial + **Documentacion al
dia**"*. `git ls-tree -r HEAD .../db/migration/` → solo `V1`, `V2`, `V3`.
`git show HEAD:README.md` línea 82 → *"# **25 casos**"*; el worktree dice 57.
`git show HEAD:CLAUDE.md` → *"**As of 2026-08-11** the app starts clean and both
migrations apply."*

**Qué pasa hoy.** La versión publicada de la documentación y la versión publicada del
código describen momentos distintos, y **no hay ningún commit donde `CLAUDE.md` y el
árbol coincidan**.

**Impacto concreto.** Para esta fase, el daño es de verificabilidad: la documentación
publicada no se puede contrastar contra el código publicado. (El riesgo de pérdida está
en EXT-02.)

**Recomendación.** Commitear la tanda, y adoptar como regla que la actualización
documental viaje en el mismo commit que el código que describe.

**Esfuerzo: XS**

---

#### DOC-10 — Los cuatro roles se justifican citando una promesa comercial que nombra otros cuatro

**Severidad: Medio**

**Evidencia.** `docs/requirements/platform.md:72-75`: *"La propuesta comercial promete
explícitamente **'cuatro roles diferenciados: administrador, directivo, profesor y
alumno'**… Queda:"* seguido de la tabla `ADMIN`/`DIRECTIVO`/`STAFF`/`USUARIO`. Once
líneas después, `:85-87`: *"Los profesores son `USUARIO` **con fila en `profesor`**"*.
`:1` declara contractual la propuesta.

**Qué pasa hoy.** El argumento que sostiene la corrección de 3→4 roles cita una
enumeración —administrador, directivo, profesor, alumno— cuyo conjunto **no es** el
implementado: `profesor` y `alumno` son relaciones, no roles, y `STAFF` no está en la
promesa. Lo que coincide es el número, no el conjunto.

**Esto no es un defecto de diseño** —el modelo de dos ejes es correcto y está bien
argumentado en todo el repo—. El defecto es la cadena de justificación: se usa un conteo
casual como si fuera una equivalencia, en un documento que declara contractual la fuente
citada.

**Impacto concreto.** Si el cliente relee la propuesta y pregunta por el rol "profesor",
la respuesta correcta está a once líneas de la cita, sin conectarla. Y el argumento que
sí cierra el caso —el Módulo 8 distingue `DIRECTIVO` de `STAFF` (`:461`)— queda debajo
de uno más débil.

**Recomendación.** Agregar en `:72-75` una línea explícita: *"Los cuatro de la propuesta
y los cuatro del sistema no son el mismo conjunto: `profesor` y `alumno` se implementan
como relaciones y no como valores de `usuario.rol`; `STAFF` es el rol operativo que la
propuesta no nombra. Lo que la propuesta compromete —cuatro niveles de acceso
diferenciados— se cumple."* Las otras tres copias pueden apuntar acá.

**Esfuerzo: XS**

> **Remediado el 2026-08-15 (tanda 8) — RESUELTO, y en las tres copias, no solo en la
> fuente.** `platform.md` §2.1 invierte el orden del argumento: **primero el Módulo 8**,
> que es el que cierra el caso —dos personas que administran con permisos distintos, y con
> tres valores no se puede expresar—, y después la propuesta, con la aclaración de que
> **coincide el número y no el conjunto**: nombra *profesor* y *alumno*, que acá son
> relaciones, y no nombra `STAFF`. Lo mismo en `sistema-gestion-plan.md` §3.2 y en
> `CLAUDE.md`, que repetían la cita como si fuera una equivalencia.
>
> El modelo no cambió: el defecto era la cadena de justificación, no el diseño.

---

#### DOC-11 — Restos menores de estado superado

**Severidad: Bajo**

| # | Evidencia | Realidad verificada |
|---|---|---|
| a | `docs/sistema-gestion-plan.md:65`: *"`V1__baseline.sql` crea las **20** tablas"* | 22 (`grep -c "^CREATE TABLE"` → 22). El mismo archivo dice 22 en `:50`, `:217`, `:233` |
| b | `docs/sistema-gestion-plan.md:10`: *"`docs/requirements/platform.md`, **que todavía no existe**"* | Existe, 527 líneas; `:230` del mismo archivo lo marca ✅ HECHO. Está en la cabecera del documento declarado fuente de verdad — es lo primero que se lee |
| c | `apps/landing/src/app/sitemap.ts:10`: *"En un sitio de **21 URLs**"* | 19: 10 estáticas + 3 programas + 6 posts. `apps/landing/CLAUDE.md:485` dice 19 y es el correcto |
| d | `docs/requirements/landing.md:91`: *"Pendiente: **OG image** y política de privacidad"* | La OG image existe (`app/opengraph-image.tsx`). La política de privacidad sí sigue pendiente |

**Recomendación.** Corregir los cuatro; en (b), reformular sin la coletilla temporal.

**Esfuerzo: XS**

---

#### DOC-12 — Secciones fuera de orden y árbol de `docs/` incompleto en el README

**Severidad: Bajo**

**Evidencia.** `docs/requirements/platform.md`: `### 2.6` (`:133`) aparece antes de
`### 2.5` (`:168`); `### 3.6` (`:226`) antes de `### 3.5` (`:246`). `README.md:18-23`
lista cinco subdirectorios de `docs/` y **omite `sistema-gestion-plan.md`**, que el
propio README referencia en `:94` y `:200`; `CLAUDE.md:23-29` sí lo incluye.

**Recomendación.** Renumerar y agregar la línea faltante al árbol.

**Esfuerzo: XS**

> **Remediado el 2026-08-15 (tanda 8) — RESUELTO, pero por reordenamiento y no por
> renumeración.** Los bloques se movieron a su lugar (2.5 antes de 2.6, 3.5 antes de 3.6)
> conservando su número. **Renumerar habría sido peor:** §2.6 está citada desde otros tres
> lugares —`platform.md:31`, `:325` y `:326`, las tres apuntando a la matriz sala×uso— y
> §3.5 desde `sistema-gestion-plan.md:178`. Cambiarles el número rompía cuatro referencias
> para arreglar un orden de lectura; moverlos arregla el orden y no rompe ninguna.
>
> El árbol del README suma `sistema-gestion-plan.md`, que era el archivo que el propio
> README referencia dos veces y su índice no listaba, con el puntero a §6d.

---

#### DOC-13 — `prompt-auditoria-lajuanita.md` sin trackear en la raíz

**Severidad: Informativo**

Sin trackear no contamina el repo. Vale decidir explícitamente si se commitea como
registro del proceso —documenta qué se auditó y con qué criterio— o se borra. Hoy está
en un limbo donde se pierde sin querer.

**Esfuerzo: XS**

---

## 4. Matriz de contradicciones documentales

| # | Afirmación | Fuente A | Fuente B | Cuál es correcta, según el código |
|---|---|---|---|---|
| 1 | Cantidad de migraciones | `CLAUDE.md:170` — cinco, *"all five apply cleanly"* | `dbml:7-14`, `auditoria-2026-08-12.md:9` — seis | **B.** `ls db/migration/` → 6 archivos. El DBML es el que está al día |
| 2 | Esquema de la corrida de las 69 pruebas | `pruebas-reglas-negocio.sql:22` — *"69/69 sobre V1..**V5**"* | `auditoria-2026-08-12.md:373` — *"69/69 sobre **V1..V6**"* | **RESUELTA en la Fase 1: B.** Se corrieron las 69 pruebas sobre una base nueva con V1..V6 y dan **69/69** (§6.2). La afirmación de la auditoría es correcta; la falsa es la cabecera del `.sql`, cuyo loop `:10-17` sigue copiando solo hasta V5. Ver DOC-03 |
| 3 | Tablas que crea `V1__baseline.sql` | `plan:65` — 20 | `CLAUDE.md:170`, `plan:50,217,233`, `auditoria:21` — 22 | **B.** `grep -c "^CREATE TABLE"` → **22** |
| 4 | Efecto de `usuario.activo = FALSE` | `application.properties:32` — *"tarda hasta 8 horas"* | `CLAUDE.md:164`, `README.md:139`, `platform.md:88-92`, `plan:421-425` — en el acto | **B.** `AutenticacionDesdeBase.java:58,92` resuelve desde la base en cada request. A describe el bug corregido el 12/08 |
| 5 | ¿Existe el blog? | `requirements/landing.md:39` — *"no se construyó"* | `CLAUDE.md:88`, `apps/landing/CLAUDE.md:31-32` — existe | **B.** `app/blog/page.tsx` y `blog/[slug]/page.tsx`; 6 slugs; en el sitemap |
| 6 | URLs del sitemap | `sitemap.ts:10` — 21 | `apps/landing/CLAUDE.md:485` — 19 | **B.** 10 + 3 + 6 = **19** |
| 7 | Tipografías de la landing | `apps/landing/README.md:22` — Geist | `apps/landing/CLAUDE.md` — Archivo / Instrument Serif / Space Mono | **B.** `layout.tsx:2`: `import { Archivo, Instrument_Serif, Space_Mono }` |
| 8 | ¿Se publica la landing? | `apps/landing/README.md:31-35` — *"Deploy on Vercel"* | `plan:527`, `README.md:190-193`, `CLAUDE.md:102` — no, hasta que la plataforma reciba formularios | **B.** Decisión del 2026-08-10 con motivo comercial. A es boilerplate |
| 9 | ¿Está pendiente la OG image? | `requirements/landing.md:91` — pendiente | `apps/landing/CLAUDE.md:486` — hecha | **B.** `app/opengraph-image.tsx` existe |
| 10 | Rutas de la landing | `requirements/landing.md:16-28` — 11 filas | `README.md:7`, `CLAUDE.md:83` — catorce | **Ninguna de las dos.** Son **13** archivos de ruta (contados en la Fase 3). A omite `/blog` y `/blog/[slug]`, que era el punto; el número de B está mal. Ver SEO-04 |
| 11 | ¿Existe `requirements/platform.md`? | `plan:10` — *"todavía no existe"* | `plan:230` — ✅ HECHO | **B.** Existe, 527 líneas. Contradicción **interna al mismo archivo** |
| 12 | Qué definir antes de deployar | `README.md:173-181`, `CLAUDE.md:157` — `JWT_SECRET` | *(nadie lo contradice; nadie lo completa)* | **Incompleta.** `application.properties:3-5` tiene usuario y contraseña de Postgres literales |
| 13 | Estado del repo vs. su documentación | `git log -1` — *"Documentacion al dia"*; HEAD tiene V1-V3 y 25 tests | Worktree — 6 migraciones, 57 tests, Módulo 1 | **El worktree.** Ver DOC-09 / EXT-02 |
| 14 | ¿Quién puede ver el repositorio? | `CLAUDE.md:157` — *"anyone with **repo access**"*, redactado para un repo privado | GitHub — badge **"Public"** | **GitHub.** El repositorio es público. Ver EXT-01 |
| 15 | ¿Existe un camino para resetear la contraseña de otro? | `README.md:129`, `EdicionUsuarioRequest.java:12-14`, `DatoDuplicadoException.java:33` — sí, *"administración le da una nueva temporal"* | *(nadie lo contradice; nadie lo implementa)* | **No existe.** El único endpoint de contraseña es `POST /api/me/password` y exige la actual. Ver SEC-03 |
| 16 | ¿Arrancar con el secreto de dev está bloqueado? | `README.md:175-181`, `CLAUDE.md:157` — *"se niega a arrancar"* | `SeguridadConfig.java:101-118` — solo si hay perfil `prod`/`produccion` activo | **Las dos, y ahí está el problema.** La afirmación es literalmente cierta y operativamente vacía: nada del deploy previsto activa un perfil. Ver SEC-01 |
| 17 | ¿Las consultas de búsqueda declaran `ESCAPE`? | `Busqueda.java:24` — *"hay que declarar en la consulta con ESCAPE"* | `UsuarioRepository.java:42-49`, `AlumnoRepository.java:30-38` — ninguna lo declara | **Ninguna.** Funciona por el default de Postgres, no por diseño. Ver SEC-09 |
| 18 | Efecto de la baja lógica, tercera vuelta | `application.properties:32` — *"tarda hasta 8 horas"* (ver fila 4) | — | **Ahora verificado en ejecución, no solo por lectura**: `CredencialVigenteTest` (5 casos) pasa, incluido `dar_de_baja_a_alguien_le_corta_el_acceso_en_el_pedido_siguiente` |
| 19 | ¿El DBML está desactualizado? | `dbml:8-13` — *"NO REFLEJA V3..V6"*, y enumera V4 y V5 entre las diferencias | El propio `dbml:76-88` — ya tiene `nombre`, `apellido` y `debe_cambiar_password`, con notas que citan V4 y V5 | **El contenido.** Comparación completa de las 22 tablas contra el catálogo: una sola columna de diferencia en todo el modelo (`bloqueo_sala.periodo`). La cabecera se desactualizó respecto del archivo que encabeza. Ver DB-06 |
| 20 | ¿Qué significa un bloqueo de sala? | `V1:676-682` (trigger) — una franja horaria **repetida cada día** del rango | `V6:411-415` (EXCLUDE) — **un intervalo continuo** de punta a punta | **Las dos conviven en la misma tabla.** La diaria es la que justifica el diseño de las columnas; la continua rechaza bloqueos legítimos. Medido en las dos direcciones. Ver DB-03 |
| 21 | "El historial de clases no se elimina" | `docs/requirements/platform.md:275` — regla dura ✅ confirmada con el cliente | El esquema — `DELETE FROM reserva_participante` devuelve `DELETE 1` | **El esquema.** La regla no está implementada; V6 §7 solo cubrió `pago` y `trabajo_mastering`. Ver DB-01 |
| 22 | ¿Hay un solo formato de error en la API? | `application.properties:10-16` — sí, para eso se activó `problemdetails` | La API corriendo — un POST sin `Content-Type` devuelve `{"timestamp":…,"error":"Bad Request"}`, sin `detail` | **La API.** Los dos formatos siguen conviviendo; lo que sale por el reenvío a `/error` no pasa por ProblemDetail. Ver ARQ-04 |
| 23 | ¿Cuántos lugares deciden en función del rol? | `CLAUDE.md:139` — cuatro, y hay que moverlos juntos | El código — `menu.ts:90-92` y `UsuariosPagina.tsx:9-14` son el quinto y el sexto | **El código.** Los cuatro de la lista están al día; los dos que faltan no figuran, y uno de ellos no da error de compilación si se desincroniza. Ver ARQ-05 |
| 25 | ¿Cuántas URLs tiene la landing? | `sitemap.ts:10` y `robots.ts:10` — 21 | `lib/seo.ts:75` — 22 páginas; `llms.txt:11` — catorce | **Ninguno.** El build genera **20** URLs de contenido y el sitemap emite **19**. `apps/landing/CLAUDE.md:485` es el único correcto. Ver SEO-04 |
| 26 | ¿Se publica algo sin confirmar en datos estructurados? | `data/business.ts:14-19` — regla dura: nada inventado, lo no confirmado va `null` | El HTML generado — se cumple para teléfono, dirección, horarios, año, precios y ratings; **no** para el email, ni para la existencia y duración de los cursos | **Las dos, según el campo.** La regla se aplicó a la identidad del negocio y no al catálogo. Ver SEO-01 y SEO-02 |
| 27 | ¿`Disallow` y `noindex` son complementarios? | `robots.ts:30-32` — *"esto es la otra mitad"* | La especificación — un `Disallow` impide leer el `noindex` | **La especificación.** Una anula a la otra, y 21 páginas enlazan `/ingresar`. Ver SEO-03 |
| 24 | ¿Los catorce endpoints son la superficie del módulo? | `README.md:96-111` — la tabla los lista como implementados, y lo están | `administracion.ts` — cinco no tienen forma de llamarse desde ninguna pantalla | **Las dos, y no se contradicen**: el backend los tiene, el front no los usa. La tabla del README describe la API, no la interfaz; vale aclararlo ahí. Ver ARQ-02 |

---

## 5. Riesgos conocidos y aceptados

Decisiones que la documentación ya declara tomadas. Se evalúa si la justificación sigue
en pie y si la mitigación prometida existe.

> **Los documentos del cliente en el control de versiones pasaron acá el 2026-08-14.**
> Ignacio pasó el repositorio a privado, rotó el secreto JWT, y **asumió expresamente lo
> que queda**: los PDF de `docs/propuesta/` y `docs/relevamiento/` siguen versionados y en
> el historial, y el aviso al cliente lo maneja él por fuera de este informe. Deja de
> contar como hallazgo abierto y deja de figurar en el backlog: **es una decisión tomada
> por el dueño del repositorio, no una tarea pendiente.** El texto original de EXT-01 se
> conserva en §3.1 como registro de lo que la auditoría encontró y cuándo.

| Decisión declarada | ¿Sigue en pie la justificación? | ¿Existe la mitigación? |
|---|---|---|
| **Los PDF del cliente quedan versionados** y el historial conserva el período en que el repositorio fue público (decisión de Ignacio, 2026-08-14) | Es una decisión sobre material propio y de su cliente, tomada con la información del hallazgo a la vista | ✅ **Repositorio privado** y ✅ **secreto JWT rotado**, que eran las dos mitigaciones técnicas. Lo demás —reescribir historial, avisarle al cliente— queda fuera de alcance por decisión suya |
| **Secreto JWT commiteado** para que un clone fresco arranque (`CLAUDE.md:157`) | ❌ **No, y cambió de naturaleza.** La justificación asume repositorio privado. Con el repo público, el secreto está publicado al mundo — ver EXT-01 | ⚠️ **Existe y es insuficiente.** El aviso por log está y se lo vio disparar (`SeguridadConfig.java:114`, corrida de esta sesión); la negativa a arrancar está (`:106-112`) pero **solo con perfil `prod` activo, y nada del deploy previsto activa un perfil** — ver SEC-01 |
| **El registro avisa que un email ya está en uso**, deshaciendo la protección anti-enumeración del login (`plan:380-384`) | ✅ Sí. El argumento —lo que se filtra es "esta dirección tiene cuenta en un estudio de música de Pilar", y la alternativa traba a quien se registró hace meses— sigue siendo razonable | ✅ Verificado en el código (`DatoDuplicadoException.java:31-34`) y con test (`RegistroTest:106`). ⚠️ **Pero se extendió sin decidirse al teléfono** — ver SEC-06 |
| **La landing no se publica antes que la plataforma** (`plan:527`) | ✅ Sí, y es la decisión más protectora del repo. Los formularios contestan "listo" sin mandar nada | ⚠️ **Parcialmente comprometida por DOC-06**: `apps/landing/README.md` invita a deployar en Vercel |
| **Comparación BCrypt señuelo** contra ataques de timing en el login | ✅ Sí | ✅ **Sigue en el código y nadie la "optimizó"**: `SesionService.java:47` (hash señuelo calculado al arrancar sobre un UUID) y `:79-82` (se compara aunque el usuario no exista). Con test que lo fija: `AutenticacionTest:233` |
| **Sin límite de intentos en login ni en registro**, diferido a antes de exponer a internet (`plan:510`) | ✅ Sí mientras no haya deploy. Pasa a bloqueante el día del deploy | Ninguna, por diseño. ⚠️ **La deuda está incompleta: tampoco hay ningún registro de eventos**, que no figura en esa lista — ver SEC-02 |
| **Token en `localStorage`**, con vencimiento corto como mitigación (`credencial.ts:1-9`) | ✅ Sí por ahora. La superficie de XSS del panel es chica y verificada: cero `dangerouslySetInnerHTML` en `apps/platform` | ⚠️ La mitigación declarada (8 h) existe y se aplica en los dos lados (`credencial.ts:34-37` y el `exp` del token). **Falta la segunda capa**: no hay CSP — ver SEC-07 |
| **Sin revocación de tokens**: un token robado vale hasta 8 h (`plan:515-516`) | ✅ Sí. Es el residuo correcto después de mover la autorización a la base, y el propio plan lo acota bien | Ninguna, por diseño. Sin logs (SEC-02) tampoco hay forma de saber si pasó |
| **Tests de JPA contra la base de desarrollo** (`plan:512`) | ⚠️ Se debilitó, y el propio plan lo reconoce: ahora insertan y borran, y Testcontainers pasó de "conviene" a "hace falta pronto" | ✅ **Confirmado ejecutando**: `mvn test` escribe en la base de desarrollo. Se resuelve junto con QA-03, que necesita Testcontainers por el mismo motivo |
| **El frontend no tiene tests** (`plan:514`) | ⚠️ Declarado como deuda **sin evaluación de riesgo**, que es lo que le faltaba. Esta auditoría le pone dos casos concretos: ARQ-01 y SEC-05, los dos detectables con un test barato | Ninguna. Ver QA-05 para el mínimo viable |
| **Ninguna FK usa `ON DELETE CASCADE`; todas quedan en NO ACTION** para que el historial no se arrastre (`V1:13-17`) | ✅ Sí, y es una de las decisiones más acertadas del esquema | ✅ **Verificado sobre el catálogo**: las **46** FK tienen `confupdtype = confdeltype = 'a'` (NO ACTION). Cero excepciones |
| **Solo se indexan las FK que respaldan una consulta concreta**, no las 46 "por las dudas" (`V1:911-917`) | ✅ Sí. Con borrados prohibidos o rarísimos, el costo habitual de una FK sin índice casi no aplica | ✅ Aplicada con criterio. ⚠️ **Una excepción cae dentro de la propia definición**: `pago.id_trabajo_mastering` respalda dos triggers ya activos — ver DB-09 |
| **`egreso` y `venta_equipo` quedan fuera de la prohibición de borrado** porque no tienen forma de anularse (`V6:222-226`) | ✅ Sí como razonamiento provisorio, y está anotado como decisión de negocio pendiente (`auditoria-2026-08-12.md:236-240`) | Ninguna, declarada. ⚠️ **`venta_equipo` suma un segundo hueco no declarado**: tampoco tiene sello de carga — ver DB-07 |
| **`usuario.especializacion` / `bio` duplican `profesor.especialidad`**, y `usuario.estado_presencia` es dato muerto (`auditoria-2026-08-12.md:290-330`) | ✅ El diagnóstico del desarrollador es correcto y está bien argumentado: verificado que las tres columnas **siguen existiendo** y que no hay un solo `setEspecializacion` / `setBio` / `setEstadoPresencia` en el backend | ⚠️ La acción recomendada (mover el dato a `profesor` al construir ese módulo) **no figura en ninguna lista de pendientes fuera de ese informe** — es un caso más de lo que DOC-02 señala |
| **`docs/branding/brand-guide.md` superado** por la identidad real | ✅ Sí | ✅ **Existe y es el modelo a copiar**: se declara superado en su **propia cabecera** (`:1-18`), con qué sigue vigente y a dónde ir. No depende de que alguien lea otro archivo |
| **`apps/landing/AGENTS.md`** auto-generado por Next.js | ✅ Sí. No es un defecto que exista ni que esté commiteado | — |
| **Los bots de IA se permiten explícitamente** para que el negocio pueda ser citado (`robots.ts:13-25`) | ✅ Sí, y bien argumentada: para una academia local sin tráfico orgánico, aparecer en la respuesta vale más que proteger textos de marketing | ✅ Verificado en el `robots.txt` generado: los 11 agentes con `Allow: /` |
| **`CCBot` bloqueado** porque *"es un dataset de entrenamiento a granel que no cita fuentes ni deriva tráfico… el único bloqueo que sale gratis"* (`robots.ts:27-28`) | ⚠️ **Casi.** La distinción entre crawler de cita y scraper de entrenamiento es correcta y la decisión es defendible. Lo que no se sostiene es *"sale gratis"*: Common Crawl es el corpus base de varios modelos abiertos y de algunos motores de respuesta, así que quedar afuera sí tiene un costo indirecto sobre el objetivo declarado | Ninguna, por diseño. Vale revisarlo si alguna vez se mide de dónde vienen las citas |

---

## 6. No verificado

### 6.1 Estado de las ocho fases

| Fase | Área | ID | Estado | Hallazgos |
|---|---|---|---|:--:|
| **0** | Contexto | — | ✅ hecha | — |
| **1** | Base de datos | `DB-nn` | ✅ hecha | 10 |
| **2** | Documentación | `DOC-nn` | ✅ hecha | 13 |
| **3** | SEO y GEO | `SEO-nn` | ✅ hecha | 6 |
| **4** | Seguridad | `SEC-nn` | ✅ hecha | 9 |
| **5** | Consistencia entre capas | `ARQ-nn` | ✅ hecha | 10 |
| **6** | Calidad, tests y operación | `QA-nn` | ✅ hecha | 7 |
| **7** | Fuera de categoría | `EXT-nn` | ✅ hecha | 4 |

**El encargo está cumplido.** Lo que sigue en §6.2 y §6.3 no son fases pendientes sino
los límites de lo que se pudo verificar dentro de cada una — que es información tan
utilizable como los hallazgos, porque marca dónde una segunda opinión todavía aportaría
algo.

### 6.2 Lo que sí se ejecutó

**Fase 6 — calidad, tests y operación**

- **Se mapearon los 57 tests contra los 14 endpoints**, contando llamadas HTTP reales en el código de test — que es la única forma válida de medir cobertura cuando todos los tests son `@SpringBootTest` con `MockMvc`. De ahí salen los cuatro endpoints sin ninguna llamada y el hecho de que ningún test pase `?buscar=`, `?estado=` ni `?pagina=`.
- **Se corrieron los dos linters y los dos pasan limpios**: `oxlint` sobre `apps/platform` y `eslint` sobre `apps/landing/src` con `--max-warnings 0`, los dos con exit 0 y sin una sola advertencia.
- **Se calcularon los contrastes de la paleta** con la fórmula de luminancia relativa de WCAG 2.1, sobre los valores reales de los dos temas que `ThemeScroller` interpola, componiendo los `rgba` sobre su fondo. Los números de QA-06 son calculados, no estimados.
- **Se verificó qué corre y qué no en el build**: `pom.xml` no tiene configuración de `surefire` que incluya los `.sql`, no existe `.github/`, y ninguno de los tres `package.json` tiene script `test` ni dependencia de testing.

**Fase 3 — SEO y GEO**

- **Se construyó la landing** (`npm run build`, exit 0): 27 entradas generadas, 20 de contenido. Toda la fase se auditó sobre esos HTML, no sobre el código que los produce.
- **Tabla de metadata completa, ruta por ruta**, extraída del HTML: las 20 URLs tienen `title`, `description`, `canonical`, `og:title`, `og:image` y `twitter:card`. **Cero faltantes, cero duplicados** — ni un título ni una descripción se repiten entre páginas. Un solo `<h1>` por página y jerarquía de encabezados sin saltos en las tres que se revisaron en detalle.
- **Los 60 bloques de JSON-LD, parseados y validados**: 9 tipos distintos (`LocalBusiness`+`EducationalOrganization`, `WebSite`, `BreadcrumbList`, `Course`, `Service`, `FAQPage`, `BlogPosting`, `Blog`, `Person`), `@id` estables, referencias cruzadas correctas, sin propiedades inventadas.
- **Se verificó la regla de veracidad campo por campo sobre el HTML final**: en los 20 documentos no aparece ni una vez `offers`, `price`, `priceCurrency`, `aggregateRating`, `ratingValue`, `reviewCount`, `telephone`, `openingHours`, `foundingDate` ni `geo`. Y `sameAs` publica solo el perfil real, con los dos placeholder correctamente excluidos.
- **Se comprobó que el schema coincide con lo visible**: las 9 preguntas y las 9 respuestas de la `FAQPage` están, palabra por palabra, en el texto renderizado de `/faq`.
- **`sitemap.xml` y `robots.txt` reales**: 19 URLs en el sitemap, las 20 del sitio menos `/ingresar`; ninguna URL indexable falta y ninguna sobra; el `robots.txt` no contradice al sitemap ni a los canonicals. La URL base sale de una sola constante (`SITE_URL`).
- **Se midió qué queda en el HTML sin ejecutar JavaScript**: 7.664 caracteres de texto en la home, 4.104 en una página de programa, 3.565 en la FAQ.

**Fase 5 — consistencia entre capas**

- **Se levantó el backend y se interrogó la API real.** El contrato se verificó contra el JSON que devuelve, no contra el código: `POST /api/auth/login`, `GET /api/me`, `GET /api/usuarios` (con paginado), `POST /api/usuarios`, `POST /api/me/password`, `GET /api/alumnos`, `POST /api/alumnos`, `PATCH /api/usuarios/{id}/activo` y `PUT /api/usuarios/{id}`. **Los seis tipos de respuesta coinciden campo por campo con TypeScript**, incluidos los `null` (`telefono`, `fotoPerfil`) y los formatos de fecha (`expiraEn` como ISO-8601, `fechaIngreso` como `YYYY-MM-DD`).
- **Se provocó cada código de error** y se comparó con lo que `cliente.ts` sabe interpretar: 400 de validación (con su mapa `errores`), 400 de JSON mal formado, 400 de conversión de parámetro, 401 sin credencial, 401 con token inventado, 403 por rol, 403 por regla de negocio, 404, 405 y 409. De ahí salen ARQ-03 y ARQ-04.
- **Se verificaron en vivo tres reglas de autorización** que hasta ahora solo tenían test: un `DIRECTIVO` lee (`GET /api/alumnos` → 200) y no escribe (`POST /api/alumnos` → 403, `PATCH .../activo` → 403); una cuenta con contraseña temporal sin cambiar no pasa de `/api/me` (→ 403); y el ADMIN no puede desactivarse a sí mismo (→ 403 con el mensaje correcto).
- **SEC-04 se confirmó ejecutándolo**, no leyéndolo: el ADMIN se quitó el rol a sí mismo con un 200 y el pedido siguiente vino 403, dejando el sistema sin administrador. Restaurado con un `UPDATE`.
- **Qué tocó en la base:** se creó una cuenta temporal (`auditoria.fase5@example.invalid`) para poder probar el rol `DIRECTIVO` y el flujo de contraseña temporal, y se borró al terminar. La base quedó con los mismos dos usuarios del principio y el ADMIN con su rol. Verificado con un `SELECT` final.

**Fase 1 — base de datos**

- **Las seis migraciones aplican limpio sobre una base vacía.** Se creó una base nueva y se aplicaron `V1`…`V6` con `ON_ERROR_STOP=1`: cero errores. **Esto cierra el ítem que la Fase 4 había dejado abierto** (allá solo se había verificado que los checksums cerraran sobre la base de desarrollo, que ya las tenía aplicadas desde el 11/08).
- **Las dos suites SQL pasan sobre el esquema real y completo**, cada una sobre su propia base descartable recién migrada a V1..V6:
  - `pruebas-reglas-negocio.sql` → **69 pasaron, 0 fallaron, 69 total**.
  - `pruebas-adversariales.sql` → **40 se defendió, 0 AGUJEROS, 40 total**.
  - Con esto queda **resuelta la fila 2 de la matriz de contradicciones**: la cifra correcta es la de `auditoria-2026-08-12.md`, y lo que está desactualizado es la cabecera del `.sql`.
- **Los conteos que declara la auditoría del desarrollador son exactos**, verificados contra `pg_constraint` y `pg_indexes`: **55** CHECK, **46** FK, **7** UNIQUE, **2** EXCLUDE, **23** PK, **10** triggers no internos, **54** índices, **22** tablas.
- **Comparación completa DBML ↔ esquema real**, tabla por tabla y columna por columna: 22 contra 22, una sola diferencia (DB-06).
- **Ataques propios contra el esquema**, todos dentro de transacciones revertidas y sobre la base descartable: bloqueo multi-día con franja parcial, borrado de historial de clases, edición de asistencia, retroceso de nivel, reserva sin pago y anulación de pago. Los resultados están citados en DB-01, DB-02, DB-03 y DB-04.

**Fase 4 — seguridad**

- **`mvn test` en `apps/backend`: 57/57 en verde, cero fallas, cero errores.** Reparto por clase (`target/surefire-reports/`): `AutenticacionTest` 14, `PermisosPorRolTest` 11, `TokenJwtTest` 10, `RegistroTest` 9, `PasswordTemporalTest` 7, `CredencialVigenteTest` 5, `BackendApplicationTests` 1. El conteo coincide con `README.md:82`. **Corrió contra la base de desarrollo**, como el propio proyecto declara en su deuda #3 (`plan:512`).
- **Flyway validó las seis migraciones** y reportó el esquema en la versión 6 (`Successfully validated 6 migrations`, `Current version of schema "public": 6`). **Ojo con lo que esto no dice:** el volumen `postgres_data` es del 2026-08-11, así que las migraciones ya estaban aplicadas — **se verificó que los seis checksums cierran, no que las seis apliquen limpio sobre una base vacía.** Eso sigue pendiente (crear un volumen nuevo).
- **`npm audit` sobre el workspace: una sola vulnerabilidad, alta, transitiva** — `nanoid <3.3.18` (GHSA-2v37-7h3g-55p8, bucle infinito con `size` cero), que entra por la cadena de build de PostCSS en las dos apps y **no llega a código de producción**. `fixAvailable: true`. No se levantó a hallazgo: se arregla con un `npm audit fix` y no hay nada que decidir. Lo que sí falta es que alguien lo corra periódicamente — no hay escaneo automatizado (`.github/` no existe), y eso es materia de la Fase 6.
- **Historial de git revisado en busca de secretos**: sobre los 20 commits, los únicos valores sensibles son los ya conocidos (el secreto JWT, siempre el mismo, y `la_juanita/la_juanita`). **No hay ningún secreto real filtrado y después borrado.**
- **Qué tocó esta auditoría, para que quede escrito.** Se respetó la regla de no modificar nada del repositorio: el único archivo escrito es este informe. Efectos colaterales de haber ejecutado: se levantó el contenedor de Postgres (`docker compose up -d`), Maven regeneró `apps/backend/target/` —ignorado por git— y **la suite de JPA insertó y borró filas en la base de desarrollo**, que es lo que el propio proyecto declara en su deuda #3. La Fase 1 trabajó sobre **dos bases descartables creadas para eso** (`auditoria_f1`, `auditoria_f1b`), ya eliminadas; los ataques propios sobre la base de desarrollo corrieron todos dentro de transacciones revertidas y esa base quedó como estaba: 2 usuarios, cero reservas, cero bloqueos. Las Fases 6 y 3 solo corrieron `npm run build` y los dos linters, que escribe en `apps/landing/.next/` —ignorado por git— y no toca ni la base ni el backend. La Fase 5 levantó el backend con `mvn spring-boot:run` —ya detenido— y sí escribió en la base de desarrollo: creó y borró una cuenta de prueba, y degradó y restauró el rol del ADMIN. **Estado final verificado con un `SELECT`: los mismos dos usuarios, `admin@lajuanita.local` con rol `ADMIN`.** Ningún archivo del proyecto cambió: `git status` da 62 entradas, que son las 61 de EXT-02 más `docs/auditoria/`, o sea este informe.

### 6.3 Lo que no se cubrió, fase por fase

**Fase 6**

- **No se midió cobertura con herramienta.** No se corrió JaCoCo ni ningún instrumentador: el mapeo de QA-01 es por endpoint y por comportamiento, leyendo los 57 casos. Sirve para afirmar qué **no** se ejercita nunca; no da un porcentaje de líneas, y no hacía falta uno.
- **No se auditó la accesibilidad con lector de pantalla ni con herramienta automática.** No se corrió axe, Lighthouse a11y ni se navegó con teclado: lo de QA-06 es análisis estático del marcado y de la paleta. Faltan por revisar el orden de foco real, el comportamiento del menú móvil al abrirse (si atrapa el foco) y el anuncio de los cambios de estado del acordeón.
- **No se revisó la accesibilidad de `apps/platform` más allá de `Campo.tsx`.** El panel es el que va a usar Micaela todos los días y merece su propia pasada cuando tenga más pantallas.
- **No se evaluó el contenido de las seis notas del blog como texto.** QA-02 es sobre la atribución y el estado de confirmación, no sobre si están bien escritas.

**Fase 3**

- **No se midió el rendimiento.** No se corrió Lighthouse, PageSpeed ni ninguna herramienta de campo. **LCP, INP y CLS son desconocidos** (SEO-06); lo que hay son las entradas del problema —peso del bundle, duración del preloader, estrategia de imágenes y fuentes—, medidas sobre el build.
- **No se validó el JSON-LD contra el Rich Results Test de Google ni contra el validador de schema.org.** Se validó a mano: se parsearon los 60 bloques, se revisaron tipos, propiedades y referencias `@id` contra la especificación. Es suficiente para afirmar que el marcado es correcto y coherente; no lo es para afirmar qué resultado enriquecido concede Google.
- **No se abrió el sitio en un navegador.** Todo lo visual —que el telón del preloader efectivamente tape, cómo se ve el sitio sin JavaScript, si las animaciones se sienten bien— está deducido del marcado y del CSS, no visto.
- **No se auditó el contenido de las seis notas del blog ni de los textos largos.** Su calidad como contenido citable, y el hecho de que sean inventadas y firmadas con nombres reales, son materia de la Fase 6, donde el propio encargo los ubica.
- **No hay datos de posicionamiento actual**: el sitio no está publicado, así que no existe Search Console, ni impresiones, ni backlinks que auditar. Toda la fase es sobre el estado del código, no sobre resultados.

**Fase 5**

- **No se abrió la aplicación en un navegador.** Todo lo del front es lectura de los 21 archivos de `apps/platform/src` más el contraste contra la API real. No se vio una pantalla renderizada, así que **nada de lo que se dice sobre lo visual está verificado**: ARQ-01 se apoya en que `totalPaginas` no aparece en ningún archivo, no en haber visto una lista cortada. Lo mismo vale para SEC-05.
- **No se ejerció el `landing`.** No hace llamadas a la API, así que no hay contrato que contrastar; su parte de la consistencia entre capas empieza a existir en septiembre (ARQ-10).
- **No se corrió `tsc` ni el linter** de ninguna de las dos apps. Que los tipos compilen se da por bueno; lo que se verificó es que **coincidan con el JSON real**, que es otra cosa y es la que importaba acá.
- **No se probó la recarga con token vencido ni la expiración en vivo.** El camino está leído (`credencial.ts:34-37` descarta el token vencido antes de mandarlo; `cliente.ts:79` cierra la sesión ante un 401 con credencial) y tiene sentido, pero esperar ocho horas o falsificar el reloj quedó fuera.

**Fase 1**

- **No se probó la concurrencia.** Los dos ataques concurrentes que la auditoría del desarrollador documenta (dos reservas solapadas simultáneas, bloqueo y reserva simultáneos) necesitan dos sesiones `psql` en paralelo, igual que los casos `G01`-`G04`, que sí corrieron pero desde una sola sesión. **La afirmación de que el `EXCLUDE` aguanta concurrencia real no se reverificó de forma independiente**; el razonamiento es correcto y el mecanismo es el adecuado, pero eso es análisis, no medición.
- **No se probó el rendimiento con volumen.** Todas las tablas tienen cero filas salvo `usuario` (2) y los catálogos de `V2`. DB-09 se apoya en qué consultan los triggers, no en un `EXPLAIN` sobre datos reales.
- **No se revisó `V2__datos_iniciales.sql` contra la realidad del negocio.** Que la matriz sala×uso tenga 11 filas y coincida con la tabla de `docs/requirements/platform.md` §2.6 se verificó; que esas once combinaciones sean las que el cliente confirmó el 2026-08-11 depende de los PDF de relevamiento, que no se abrieron.
- **No se auditó el impacto de la migración de diciembre.** Los ~80 alumnos del Notion entran por un camino que todavía no existe; qué pasa con los datos que el esquema exige y el Notion no tiene (apellido separado, teléfono único, email) es materia de ese trabajo y no de esta fase.

**Fase 4**

- **No se atacó la API corriendo.** Todo el análisis de seguridad es lectura de código más la suite de tests del proyecto. No se levantó el backend para lanzarle tokens forjados, ni se midió la diferencia de tiempos del login, ni se probó la fuerza bruta que SEC-02 describe. Los tests cubren buena parte de eso (token con `alg: none`, firmado con otra clave, sin `exp`, de otro emisor, `sub` no numérico), así que el hueco real es el comportamiento bajo carga y el timing.
- **No se auditó el CORS en condiciones reales.** `vite.config.ts:9-19` deja constancia de que en desarrollo el proxy hace que CORS no se ejerza nunca; el bean de `SeguridadConfig:188-200` se leyó y es correcto (orígenes explícitos, `allowCredentials=false`), pero **nunca se ejecutó**. El día que el front y la API vivan en dominios distintos hay que probarlo, no confiar en la lectura.
- **No se revisó `apps/landing` como superficie de ataque más allá del XSS.** Es un sitio estático sin backend; el formulario de `/ingresar` no manda nada a ningún lado (`LoginForm.tsx:28-31`), así que hoy no hay entrada que auditar. Cuando esos formularios se conecten al backend —septiembre, según el plan— **hay que volver sobre esta fase**: entran endpoints públicos nuevos, con los mismos problemas de límite de intentos.
- **No se evaluó el cifrado en reposo ni la retención de datos.** Depende del hosting, que se decide en octubre.

### 6.4 Dentro de las fases ejecutadas

- **`docs/db/auditoria-2026-08-12.md` se leyó ahora casi entero** (§2, §3, §6, §7). Sus conteos y su tabla de reglas se verificaron contra el esquema real y son correctos; lo que se le señala está en DB-01 y DB-04, y es lo que **no** está en esa lista.
- **No se leyeron los PDF de `docs/propuesta/` ni `docs/relevamiento/`.** Son la fuente declarada contractual, y **DOC-10 depende de ella**: se verificó que `platform.md:73` *cita* la promesa de cuatro roles, no que la propuesta la contenga. Tampoco se verificó P34 (duración real de los cursos: relevamiento vs. landing), que el propio proyecto marca como el pendiente más urgente porque son números que un cliente lee. Para EXT-01 no hizo falta abrirlos: alcanza con que estén rastreados en un repositorio público.
- **De `docs/db/auditoria-2026-08-12.md` quedaron sin leer §4, §5, §8 y §9**, que se conocen solo por referencias cruzadas. §5 es la de concurrencia, que además no se reverificó (§6.3).
- **No se verificaron las afirmaciones de `apps/landing/CLAUDE.md`** sobre el sistema de diseño, la arquitectura GSAP ni la tabla de contenido placeholder (678 líneas). Sí se verificaron sus 14 rutas, las 19 URLs del sitemap, la existencia de los cuatro archivos SEO que enumera y las tipografías.
- **La reescritura de historial de git no se intentó ni se recomienda hacerla sin backup.** EXT-01 punto 2 requiere decidir entre `git filter-repo` y repositorio nuevo.

---

## 7. Backlog priorizado

**57 entradas que cubren los 59 hallazgos** — algunas resuelven dos o tres a la vez, y
ninguno queda afuera. Los cuatro bloques están ordenados por *cuándo* hay que hacerlo, no por área ni
por severidad. Cada fila lleva el ID para volver al hallazgo, que es donde está la
evidencia y la recomendación completa.

### Cómo usar esto en una sesión de remediación

Tres cosas que conviene saber antes de empezar a tachar por orden:

**a) Cinco no son trabajo de código: son decisiones que le corresponden al cliente.**
Conviene mandarlas todas juntas en un mensaje y seguir con otra cosa mientras responde:

| Qué preguntar | ID |
|---|---|
| Duración real de los cursos, y si Mix & Mastering es programa o servicio (P34 / P31) | SEO-01 |
| Precios de programas y servicios: ¿se confirman o van con salvedad? | QA-02 |
| ¿Ghezz, Najles y Chapa Castelo firman las notas del blog? | QA-02 |
| ¿Existe y funciona `hola@lajuanitastudio.com`? | SEO-02 |
| Dirección, teléfono, horarios y año de fundación (siguen abiertos desde el 10/08) | — |

**b) Hay cinco pares donde el orden importa.** Hacerlos al revés significa rehacer:

| Primero | Después | Por qué |
|---|---|---|
| SEC-04 (auto-degradación) | ARQ-02 (pantalla de edición) | Si se construye el formulario antes, nace con el agujero puesto |
| DB-02, DB-01, DB-07 (migración `V7`) | la migración del Notion | Con las tablas vacías es una línea; con 80 alumnos adentro es una decisión sobre datos reales |
| QA-03 (script de pruebas SQL) | QA-04 (pipeline) | El pipeline necesita un comando que correr |
| DB-03 (definición de bloqueo) | el Módulo 2 | El `EXCLUDE` mal definido rechaza bloqueos legítimos en cuanto exista la pantalla |
| DB-05 / ARQ-03 (manejo de errores) | el primer endpoint que escriba `reserva` | Si no, el primer error de sala sale como "email duplicado" |

**c) Cuatro grupos tocan el mismo archivo y conviene hacerlos de una sola vez**, no en
cuatro pasadas:

- `ManejadorDeErrores.java` → **DB-05 + ARQ-03** (y mirar ARQ-04 de paso).
- Una sola migración `V7` → **DB-02 + DB-01 + DB-07**.
- `apps/landing/src/data/` + `llms.txt` → **SEO-01 + QA-02**, que son la misma corrección
  vista desde dos ángulos.
- `globals.css` + `Fields.tsx` → **QA-06** entero.

Y una advertencia sobre el orden general: **EXT-01 y EXT-02 van primero y no se negocian.**
Commitear antes de pasar el repo a privado es publicar dos días más de trabajo; y
cualquier arreglo que se haga hoy sobre un árbol sin commitear se puede perder igual.

### Antes del deploy — bloqueantes

| # | Qué | ID | Esf |
|---|---|---|:--:|
| 1 | **Pasar el repositorio a privado** y sacar `docs/propuesta/` y `docs/relevamiento/` del control de versiones. Avisarle al cliente | EXT-01 | S |
| 2 | **Commitear y pushear** el Módulo 1, `V4`–`V6`, los tests y la auditoría de base | EXT-02 / DOC-09 | XS |
| 3 | **Invertir el default del secreto de desarrollo**: que la aplicación se niegue a arrancar salvo que una propiedad del `application.properties` local lo autorice. Es lo que hace que el punto 4 no dependa de la memoria de nadie | SEC-01 | XS |
| 4 | **Rotar el secreto JWT** y documentar que en producción va un valor nuevo | EXT-01 | XS |
| 5 | **Parametrizar las credenciales de Postgres** y escribir la tabla de variables por ambiente | DOC-07 | S |
| 6 | **Escribir `docs/operacion.md`**: backup con comando concreto, **restore probado**, deploy, falla de migración | DOC-08 | M |
| 7 | **Límite de intentos + log de eventos de autenticación** en login, registro y cambio de contraseña | SEC-02 | M |
| 8 | **Una migración `V7` con los tres huecos que hay que tapar con las tablas todavía vacías**: auditoría de la anulación de un pago, prohibición de borrado sobre el historial de clases, y `fecha_registro` en `venta_equipo`. Con el Notion adentro, cada uno de estos pasa de ser una línea a ser una decisión sobre datos reales | DB-02 / DB-01 / DB-07 | M |
| 9 | Escribir la migración que desactiva `admin@lajuanita.local` y crea los usuarios reales | DOC-07 | S |
| 10 | **Healthcheck + `restart: unless-stopped`** en el compose, junto con `docs/operacion.md` (#6): sin eso, que el sistema esté caído lo descubre el cliente | QA-07 | S |

### Antes de publicar la landing — bloqueantes de esa entrega

La landing tiene su propia puerta: la decisión del 2026-08-10 dice que no se publica
antes que la plataforma. Estos son los que hay que cerrar antes de abrirla, y **el
primero es una pregunta al cliente, no trabajo de código**.

| # | Qué | ID | Esf |
|---|---|---|:--:|
| A | **Cerrar P34 y P31 con el cliente** (duración real de los cursos; si Mix & Mastering es programa o servicio) y corregir `data/programs.ts`, `data/faq.ts`, los títulos y `llms.txt` con la respuesta | SEO-01 | M |
| B | **Sacar el email del JSON-LD hasta confirmarlo**, o confirmarlo. Y limpiar el `?si=` del `sameAs` de Spotify | SEO-02 | XS |
| C | **Decidir qué pasa con las seis notas**: preguntarles a Ghezz, Najles y Chapa Castelo si las firman, o pasarlas a "Equipo La Juanita" — corrigiendo también el `author` del `BlogPosting` | QA-02 / DOC-05 | S |
| D | **Poner salvedad a los precios de los dos programas**, o confirmarlos. Los dos servicios ya la tienen; los programas no | QA-02 | XS |
| E | **Medir Lighthouse en móvil** sobre `/`, un programa y `/faq`, con caché fría | SEO-06 | M |
| F | Sacar el `Disallow: /ingresar` y dejar solo el `noindex` | SEO-03 | XS |
| G | Regla `<noscript>` que saque el telón del preloader | SEO-05 | XS |

### Antes de septiembre — antes de construir `inscripcion` encima

| # | Qué | ID | Esf |
|---|---|---|:--:|
| 11 | **Endpoint de reseteo de contraseña por administración** — bloquea la migración del Notion, así que en la práctica es "antes de diciembre", pero conviene hacerlo con el módulo todavía fresco | SEC-03 | S |
| 12 | **Paginar los dos listados** — hoy la pantalla dice "80 alumnos" y muestra 20. Bloquea la migración del Notion | ARQ-01 | S |
| 13 | **Elegir UNA definición de "bloqueo de sala"** y corregir el `EXCLUDE` de V6 §10, con un caso multi-día y horario parcial en cada suite. Bloquea el Módulo 2 | DB-03 | S |
| 14 | **Arreglar `ManejadorDeErrores` de una sola vez**: separar el grupo `23` por nombre de constraint, manejar el `P0001` de los triggers, y traducir al español los tres errores que hoy genera Spring en inglés. Un solo archivo, tres hallazgos | DB-05 / ARQ-03 | S |
| 15 | **Impedir que un ADMIN se saque a sí mismo el rol** —y hacerlo **antes** de construir la pantalla de edición, que es la que lo vuelve alcanzable | SEC-04 / ARQ-02 | S |
| 16 | Agregar `V6` a `CLAUDE.md` y §6e al plan, con link a la auditoría de base | DOC-01 / DOC-02 | S |
| 17 | Completar la lista de reglas sin dueño: a las cinco 🔴 que ya están, sumar **el historial de clases, "sin seña no hay reserva", el nivel que no retrocede** y la limpieza de `especializacion`/`bio`/`estado_presencia` | DOC-02 / DB-01 / DB-04 | XS |
| 18 | Agregar `V6` a las cabeceras de las pruebas SQL y fijar la regla de que toda migración las actualiza | DOC-03 | XS |
| 19 | Corregir `application.properties:30-35` (bajas: corta en el acto) y su comentario sobre los dos formatos de error | DOC-04 / ARQ-04 | XS |
| 20 | **Ocultar los botones de escritura a `DIRECTIVO`** y gatear las rutas `/admin/*` por rol | SEC-05 | S |
| 21 | **`AlumnoTest` con seis casos** — los dos caminos del alta, los dos juntos, alumno duplicado, `cambiarEstado` y un buscador con `%`. Antes de construir `inscripcion` encima | QA-01 | M |
| 22 | **El workflow de CI**, con los cuatro comandos que ya pasan | QA-04 | M |
| 23 | **Construir la edición y el alta con rol** — las cinco funciones que faltan en el cliente, juntas. Sin esto, en diciembre hay que dar de alta al equipo con `curl` | ARQ-02 | M |
| 24 | Reescribir `apps/landing/README.md` con la decisión de no publicar | DOC-06 | S |
| 25 | Corregir `requirements/landing.md`: el blog existe, y las 6 notas son bloqueante de publicación | DOC-05 | S |
| 26 | Agregar `LICENSE` / nota de titularidad y alcance de mantenimiento | EXT-03 | XS |

### Después

| # | Qué | ID | Esf |
|---|---|---|:--:|
| 27 | Subir BCrypt a costo 12 y darle vencimiento a la contraseña temporal (junto con el #11) | SEC-08 | S |
| 28 | Decidir explícitamente qué hacer con la enumeración de teléfonos en el registro | SEC-06 | XS |
| 29 | CSP y cabeceras de seguridad en la landing y en el proxy de la SPA | SEC-07 | S |
| 30 | Declarar `ESCAPE` en las dos consultas de búsqueda, o borrar la constante que nadie usa | SEC-09 | XS |
| 31 | Corregir la cabecera del DBML, que advierte sobre diferencias que ya no existen | DB-06 | XS |
| 32 | Índice `pago (id_trabajo_mastering)`, y revisar la clave de `pago_deudores` | DB-09 | XS |
| 33 | Fijar `fecha_creacion` como nombre único para toda tabla nueva, en `CLAUDE.md` | DB-08 | S |
| 34 | **Tipar `NOMBRE_DE_ROL` como `Record<Rol, string>`** y reescribir `puedeAdministrar` en positivo; sumar los dos archivos a la lista de `CLAUDE.md:139` | ARQ-05 | XS |
| 35 | Borrar los dos `package-lock.json` de las apps y dejar solo el de la raíz | ARQ-07 | XS |
| 36 | Mover `esAdmin` y `acotar` fuera de los dos controllers | ARQ-06 | S |
| 37 | Declarar los siete tipos de pedido en TypeScript, al lado de los de respuesta | ARQ-09 | S |
| 38 | Escribir la convención de idioma en `CLAUDE.md` (dominio en español, infraestructura en inglés) | ARQ-08 | S |
| 39 | Matizar la justificación de los cuatro roles en `platform.md:72-75` | DOC-10 | XS |
| 40 | Corregir los cuatro restos de estado superado (20 tablas, "no existe", 21 URLs, OG image) | DOC-11 | XS |
| 41 | Renumerar secciones y completar el árbol de `docs/` del README | DOC-12 | XS |
| 42 | Dejar escrito en `CLAUDE.md` que el hash de `V3` sí tiene test, con el nombre real de la clase | EXT-04 | XS |
| 43 | Reducir los pares duplicados de documentación al dueño único propuesto | DOC-02 | M |
| 44 | Decidir qué hacer con `prompt-auditoria-lajuanita.md` | DOC-13 | XS |
| 45 | Cuando se cierre P11 (horario del estudio), preguntar explícitamente por las reservas que cruzan medianoche | DB-10 | XS |
| 46 | Corregir los cinco conteos de rutas y URLs, y dejar de escribir la cifra a mano | SEO-04 | XS |
| 47 | Script `scripts/pruebas-sql.sh`, y después Testcontainers para meter las 109 pruebas en el build | QA-03 | M |
| 48 | Los cinco tests mínimos del frontend con Vitest, empezando por `menuPara()` | QA-05 | S |
| 49 | Subir `--page-faint` y el borde de los inputs, sacar el `outline-none`, agregar el enlace de salto | QA-06 | S |
| 50 | Decidir, antes de conectar los formularios de la landing, si el cliente HTTP se comparte o se duplica | ARQ-10 | S |

---

## 8. Estado de la remediación

**51 de los 61 hallazgos están resueltos** (al 2026-08-15), más uno cerrado como riesgo
asumido. Cada uno lleva su bloque *"Remediado el ..."* al pie del hallazgo, con qué se
hizo y cómo se verificó; esta sección es solo el índice y el orden propuesto para lo que
queda. **La cuenta fina, hallazgo por hallazgo, está en §8.1** — esta línea es lo primero
que envejece.

### Tanda 1 — 2026-08-14 · perímetro del backend y errores

| ID | Qué se hizo | Verificación |
|---|---|---|
| **SEC-01** | El secreto de desarrollo ahora falla cerrado: no arranca salvo permiso explícito en el `application.properties` local | `SecretoDeDesarrolloTest` (4) |
| **SEC-04** | Nadie se cambia el rol a sí mismo; con eso la invariante "queda al menos un ADMIN activo" se sostiene sin contar filas | `PermisosPorRolTest` 11 → 14 |
| **DB-05** | Mensaje por nombre de constraint, estado por SQLSTATE, y el texto del trigger (`P0001`) sale como 409 en vez de 500 | `ErroresDeLaBaseTest` (5), contra la base real |
| **ARQ-03** | Los tres errores que generaba Spring en inglés, en español y sin nombrar internals | `ErroresEnEspanolTest` (3) |
| **DOC-01** | `CLAUDE.md` conoce `V6` y la auditoría de base, y fija la regla de las cabeceras | 69/69 y 40/40 sobre V1..V6 |
| **DOC-03** | Las dos suites se instruyen sobre `V1..V6`, con la causa raíz escrita | idem, corrido |
| **DOC-04** | El comentario de bajas dice lo que el sistema hace: corta en el acto | lectura |
| **DB-06** | Cabecera del DBML reescrita y `bloqueo_sala.periodo` agregado | comparación contra el catálogo |
| **EXT-04** | El test del hash de `V3` queda registrado con su nombre real | nombre verificado |

Suite completa después de la tanda: **`mvn test` 72/72**, y las dos suites SQL **69/69 y
40/40** sobre las seis migraciones.

### Tanda 1b — 2026-08-14 · el repositorio, a medias

| ID | Estado | Detalle |
|---|---|---|
| **EXT-02 / DOC-09** | ✅ resuelto | Commit `870b0da` y **pusheado**: `main` local y remoto coinciden. Los dos días de trabajo, `V4`–`V6`, los tests y la auditoría de base dejaron de vivir en un solo disco |
| **EXT-01** | ⚪ **cerrado** | **Repositorio privado y secreto JWT rotado (2026-08-14)**, que eran las dos mitigaciones técnicas. El resto —los PDF versionados, el historial y el aviso al cliente— **Ignacio lo asumió como decisión propia**: pasó a §5 y sale del backlog |
| **EXT-03** | 🔴 abierto | Sin `LICENSE` ni nota de titularidad |

### Tanda 3 — 2026-08-14 · la migración `V7`, con las tablas todavía vacías

| ID | Qué se hizo | Verificación |
|---|---|---|
| **DB-02** | Anular un pago —y marcar un comprobante inválido— exige autor, fecha y motivo | 9 casos SQL nuevos |
| **DB-01** | `reserva` y `reserva_participante` no se borran, y editar la asistencia o mover una clase exige decir quién | 10 casos SQL nuevos |
| **DB-03** | El `EXCLUDE` de bloqueos pasó a dos dimensiones y ya no rechaza bloqueos legítimos | 7 casos SQL nuevos, con el escenario exacto del hallazgo |
| **DB-07** | `venta_equipo` tiene sello de carga | caso 84 |
| **DB-09** | Índice `pago (id_trabajo_mastering)` | catálogo |
| **DB-04** | Las dos reglas sin dueño, documentadas con lo que falta decidir | — *(sigue abierto como regla)* |
| **DB-11** | Evitado en `bloqueo_sala`, documentado en `reserva` | — *(parcial)* |
| **DOC-02** | §6e en el plan, con la auditoría de base, `V6`, `V7` y las reglas sin dueño | — |

Suite completa después de la tanda: **`mvn test` 72/72**, **86/86** reglas de negocio y
**50/50** adversariales sobre `V1..V7`. Los conteos subieron porque los casos nuevos
son parte del arreglo: 69 → 86 y 40 → 50.

**Dos errores propios que los tests atajaron**, y que quedaron fijados como caso:
un CHECK escrito como `btrim(x) <> ''` **no cierra** —evalúa a NULL con `x` en NULL, y un
CHECK solo rechaza en FALSE—; y una columna generada que explota **le roba el mensaje**
al CHECK que iba a explicar el problema, porque se computa antes.

### Tanda 4 — 2026-08-14 · el perímetro de la autenticación

| ID | Qué se hizo | Verificación |
|---|---|---|
| **SEC-02** | Límite de intentos por IP (filtro, antes de Spring Security) y por email (servicio, solo fallos), + log de eventos de autenticación bajo el logger `seguridad` | `LimiteDeIntentosTest`, 5 casos |
| **SEC-03** | `POST /api/usuarios/{id}/password-temporal`, con el guardia de cuentas administrativas | 3 casos en `PermisosPorRolTest` + el circuito en `PasswordTemporalTest` |
| **SEC-08** | BCrypt a costo 12 (medido: 78 → 253 ms) y vencimiento de la temporal a 7 días (`V8`) | 4 casos en `PasswordTemporalTest` |
| **EXT-01 pt3** | Secreto JWT de desarrollo **rotado**. El anterior estuvo público y hay que darlo por conocido para siempre | suite completa |

Suite después de la tanda: **`mvn test` 85/85** (eran 72), **86/86** y **50/50** sobre
`V1..V8`.

**Lo que la aplicación no tenía y ahora sí:** un log. Antes había **una sola línea**
—la advertencia del secreto— y un login fallido no dejaba rastro; a la pregunta
*"¿entraron a la cuenta de Micaela?"* la única respuesta honesta era "no hay forma de
saberlo".

**Dos cosas que aparecieron al hacerlo**, las dos anotadas donde corresponde: en Boot
4.1 `SecurityProperties` ya no expone `DEFAULT_FILTER_ORDER` (se mudó a
`SecurityFilterProperties`, verificado con `javap`), y el límite por IP hace fallar la
suite entera si no se apaga durante `mvn test` — una máquina haciendo cientos de logins
contra 127.0.0.1 es, para el filtro, exactamente un ataque.

### Tanda 5 — 2026-08-14 · el frontend

| ID | Qué se hizo | Verificación |
|---|---|---|
| **ARQ-01** | `componentes/Paginado.tsx` en las dos pantallas, y buscar/filtrar vuelve a la página 0 | build + lint |
| **SEC-05** | `puedeOperar` y `puedeAdministrar` en `menu.ts`: sin botones de escritura para `DIRECTIVO`, y `/admin/*` gateado por rol | build + lint |
| **ARQ-02** | Alta de cuenta **con rol**, edición de usuario, edición de alumno y el botón de reseteo de SEC-03. `altaUsuario` dejó de estar escrita sin que nadie la llamara | build + lint |
| **ARQ-09** | Los cuatro tipos de pedido de administración, declarados antes de escribir los formularios | tsc |
| **ARQ-05** | `Record<Rol, string>` y predicados por enumeración; `CLAUDE.md` dice seis lugares, no cuatro | tsc |

**La verificación de esta tanda es más débil que la de las anteriores, y conviene
decirlo:** `npm run build:platform` (tsc + vite) y `oxlint`, los dos limpios, pero
**nada se abrió en un navegador y el frontend no tiene tests** — QA-05, tanda 6. Lo
probado es que compila y tipa.

Con esto **la migración del Notion deja de estar bloqueada por el front**: se puede dar
de alta al equipo con su rol, corregir lo que venga mal, resetear contraseñas y ver más
allá de la fila 20.

### Tanda 6 — 2026-08-14 · **cerrada** · operación, tests y CI

| ID | Qué se hizo | Verificación |
|---|---|---|
| **DOC-07** | `DB_URL`/`DB_USER`/`DB_PASSWORD`/`CORS_ORIGENES` y los `POSTGRES_*` por entorno, + tabla de variables por ambiente en el README | `mvn test` 86/86 |
| **QA-07** | `/actuator/health` público y sin detalle, + healthcheck de Postgres con `start_period` | caso nuevo en `PermisosPorRolTest` y `docker inspect` → `healthy` |
| **DOC-08** | `docs/operacion.md`: backup, **restore probado de punta a punta**, runbook de migraciones probado, y deploy explícitamente incompleto. + `scripts/backup.sh` | el ensayo completo, abajo |
| **QA-01** | `AlumnoTest`, 20 casos: los dos caminos del alta, el duplicado, la promesa transaccional, `editar`, `cambiarEstado`, `GET /{id}` y los tres del buscador | `mvn test` **106/106** (eran 86) |
| **QA-03** | `scripts/pruebas-sql.sh`: lee las migraciones del directorio y **sale ≠ 0 si algún caso falla** | 86/86 y 50/50 en verde, y exit 1 forzando un fallo |
| **QA-05** | Vitest + Testing Library, cinco archivos | `npm test` **53/53** |
| **QA-04** | `.github/workflows/ci.yml`, dos jobs | los cuatro pasos, corridos a mano en local |

**El ensayo de restore, que era el corazón de DOC-08:** dump → base descartable →
catálogo idéntico (23 tablas, 139 constraints, 14 triggers, 55 índices, 8 migraciones) →
**las tres clases de regla del proyecto ejercitadas sobre la base restaurada, y las tres
rechazaron** (`EXCLUDE`, FK compuesta, trigger de V7) → **la aplicación real arrancó
contra ella**. Contar filas no habría probado lo que importa: que el esquema vuelva *con*
las reglas.

**Se probó también el checksum mismatch**, el ciclo entero: corromper, ver la aplicación
no arrancar, `flyway:repair`, verla arrancar.

**Lo que esta tanda deja abierto, y por qué:**

- **La sección de deploy de `docs/operacion.md`** (y con ella la mitad que le falta a
  QA-07: healthcheck del backend y `restart: unless-stopped`). Depende del hosting, que se
  decide en octubre. Está escrito *como lo que falta*, no disfrazado de procedimiento.
- **Testcontainers**, el escalón 2 de QA-03. Menos urgente ahora que las 136 pruebas
  corren en cada push.
- **El YAML corriendo en Actions**: los cuatro pasos se verificaron en local, uno por uno,
  pero el workflow en sí se confirma en el primer push.

**Un hallazgo nuevo salió de acá:** QA-08, la credencial con `expiraEn` ilegible.

### Tanda 7 — 2026-08-14/15 · **cerrada** · la landing

**Los nueve.**

| ID | Qué se hizo | Verificación |
|---|---|---|
| **SEO-01** | `/programas/mix-mastering` deja de existir —era un curso que no se dicta— y las duraciones pasan a ser **clases y no meses** | build: la ruta no existe, 0 apariciones en el HTML, 2 `Course` en vez de 3 |
| **QA-02** | `priceNote` **obligatorio** en el tipo `Program`; las seis notas firman "Equipo La Juanita" | build: la salvedad sale, 0 `Person` con nombres reales en `BlogPosting` |
| **SEO-02** | El email inventado sale del JSON-LD y de las 4 pantallas; entran dirección, teléfono, horario y año | build: `email` y `geo` **omitidos como clave**, no en null |
| **SEO-03** | Se saca el `Disallow: /ingresar`, que impedía leer su propio `noindex` | `robots.txt` generado |
| **SEO-05** | `<noscript>` + **red de seguridad del telón** a los 4 s | build: el `<noscript>` sale en la página |
| **SEO-04** | Los conteos, corregidos y —donde se pudo— eliminados | build + lint |

| **DOC-06** | El README de landing deja de ser el boilerplate de `create-next-app` | lectura |
| **DOC-05** | El alcance dice lo que el sitio es: blog incluido, dos programas, y *Pendiente* partido en "bloquea publicar" y "no bloquea" | lectura |
| **SEO-06** | **Primera medición de Core Web Vitals del proyecto** | Lighthouse móvil sobre el build de producción |

**Lo que dio la medición de SEO-06**, que era el hallazgo cuyo contenido era
justamente no tener números:

| Ruta | Score | LCP | CLS | TBT |
|---|:--:|:--:|:--:|:--:|
| `/` | 63 | 4,2 s | **0** | 670 ms |
| `/programas/convertite-en-dj` | 72 | 4,4 s | **0** | 330 ms |
| `/faq` | 80 | 3,7 s | **0** | 220 ms |

**El CLS es 0 en las tres** — el número difícil, y salió gratis por cómo están
puestas las imágenes. El LCP no llega: 3,7–4,4 s contra un umbral de 2,5 s, y el
desglose muestra que **el 90% es *render delay***, no red ni imágenes (TTFB
461 ms, la imagen del hero ya con `priority` y `Load Time` 0). La página tarda en
pintarse, no en llegar.

**Y una medición que el hallazgo no pedía y cambia la conclusión:** corriendo el
mismo build con `--force-prefers-reduced-motion` —que apaga preloader y reveals—
el LCP baja a 3,6 s y el TBT a la mitad. O sea que **el preloader cuesta ~600 ms
y apagarlo no alcanza**: el piso lo pone el bundle. La recomendación del hallazgo
era "acortar el preloader o diferir el motion"; los números dicen que lo primero
ayuda poco y lo segundo es lo que importa.

**Lo que NO se hizo, a propósito:** diferir el bundle de motion en las rutas
interiores. Es el cambio con más rendimiento y también el más delicado del repo
—toca la arquitectura de movimiento, que es la identidad del sitio, y varias de
las diecinueve trampas documentadas viven ahí—. Pide una sesión dedicada y volver
a medir. **No bloquea nada**: el sitio no se publica hasta que los formularios
estén conectados, y estos números son de un build sin el contenido real.

**Y se cerró el efecto colateral que había quedado abierto:** el *"desde 2019"* de
la home y la línea de tiempo de `/nosotros` contradecían el `foundingDate: 2021`
que el JSON-LD publica como hecho verificado. Los dos pasan a 2021. De paso
apareció otro que nadie había anotado: la home decía **"4 Programas activos"**
—eran cuatro hace dos refactors, y desde SEO-01 son dos—; ahora el número sale de
`PROGRAMS.length` y no se puede volver a desincronizar.

### Tanda 8 — 2026-08-15 · en curso · los cuatro defectos primero

La tanda 8 es limpieza y no bloquea nada, así que se atacó **por lo que cambia el
comportamiento del sistema**, no por lo que es más barato. Los cuatro defectos, cerrados:

| ID | Qué se hizo | Verificación |
|---|---|---|
| **QA-08** | La credencial con vencimiento ilegible se descarta en vez de darse por vigente | `npm run test:platform` **54/54**; el caso nuevo **falla** si se saca el arreglo |
| **SEC-09** | Las seis cláusulas `LIKE` declaran `ESCAPE '\'`; la constante que nadie referenciaba se borró | El **SQL generado**, con `logging.level.org.hibernate.SQL=DEBUG`. `mvn test` **107/107** |
| **QA-06** | `--page-faint` a 4,6:1, `--page-field` (token nuevo) a 3,2:1, `--page-accent` (token nuevo, por tema) a 5,0:1, fuera el `outline-none`, y el enlace de salto | CSS y HTML **compilados**: cero `outline-none` y cero `text-red` en las 19 páginas |
| **SEC-07** | CSP + cuatro cabeceras en la landing; CSP en el panel, inyectada sólo en el build | Las cabeceras leídas de un `next start` **corriendo** |

**Dos recomendaciones del informe resultaron estar mal, y se corrigieron en vez de
seguirse:** subir `--page-faint` a 0.45 da **3,72:1**, no 4,5; y usar `--red-hover` como
rojo de texto **empeora** el tema papel, de 3,51 a 2,74:1 (ver el bloque de QA-06). El
informe es una entrada, no una orden — y esta es la primera vez que esa cláusula del
prompt de remediación se ejerce.

**Tres cosas aparecieron haciéndolo**, las tres anotadas donde corresponde:

- **Un `ESCAPE` no se puede meter en un `@Query` sin partir el bloque de texto** en seis
  concatenaciones, así que la constante se borró en vez de "usarse": la opción que el
  hallazgo daba como alternativa era la única que dejaba el código legible.
- **El enlace de salto no era una línea en el layout.** El interceptor de anclas de
  `SmoothScroll` hace `preventDefault()`, y con eso se come el movimiento del foco: el
  enlace habría scrolleado dejando el teclado en la navegación. **Arreglarlo arregló de
  paso todas las anclas del sitio**, que movían el scroll y nunca el foco.
- **Una CSP en `<meta>` ignora `frame-ancestors`**, así que esa mitad del panel depende
  del proxy y no se puede cerrar hoy: quedó como punto 5 del deploy en `docs/operacion.md`.

#### Y después los cinco de código — mismo día

| ID | Qué se hizo | Verificación |
|---|---|---|
| **ARQ-07** | Un solo `package-lock.json`, el de la raíz; los dos de las apps salieron del repo y entraron al `.gitignore` | `npm ci --dry-run` desde la raíz |
| **ARQ-09** | Los tres tipos de pedido de autenticación, y **un cuarto tipo borrado** que era el mismo contrato con otro nombre (`DatosDeRegistro`) | `tsc` rechaza un campo mal escrito, a propósito |
| **ARQ-06** | `esAdmin` → `config/Autoridades`; `acotar` + `TAMANIO_MAXIMO` → `Pagina` | `mvn test` **107/107** sin tocar un test |
| **ARQ-04** | `web/ErrorPorDefecto` atiende `/error`, y el front trata un cuerpo sin `detail` como cuerpo inservible | `GET /error` contra la **API corriendo**; `mvn test` **108/108**, panel **55/55** |
| **ARQ-08** | La convención de idioma, escrita en `CLAUDE.md` como tabla + la regla de la frontera | lectura; no se renombró nada |

**Otras dos veces el informe resultó estar desactualizado o incompleto, y las dos se
corrigieron en vez de seguirse:**

- **ARQ-04 cambió de puerta.** El caso exacto que el informe midió —`POST` sin
  `Content-Type`— **hoy sale bien**. El formato viejo seguía saliendo por `GET /error`,
  que es peor: no hace falta ni un error previo, y `/error` es `permitAll`.
- **La regla de ARQ-08 no era la que el hallazgo enunciaba.** *"Infra en inglés, dominio en
  español"* describe los nombres de paquete y falla con las clases. La real es *"inglés
  sólo donde lo impone el framework o la URL"*, y con esa, las tres excepciones que el
  hallazgo listaba dejan de serlo.

**Lo que queda de la tanda 8 son cinco hallazgos, todos de documentación:** `EXT-03` (el
archivo `LICENSE`), `DB-08`, `DOC-10`, `DOC-11` y `DOC-12`.

### 8.1 Los 61 hallazgos, uno por uno

Leyenda de **Estado**: ✅ resuelto · 🔴 abierto · 🟡 abierto y **bloqueado por una decisión
que no es técnica** (del cliente, o de Ignacio) · ⚪ **cerrado como riesgo asumido**: no se
va a hacer, y está decidido así (ver §5). La columna **Tanda** es el orden propuesto en
§8.2; `1` es lo ya hecho.

| ID | Sev | Esf | Tanda | Estado | Qué falta |
|---|:--:|:--:|:--:|:--:|---|
| **EXT-01** | Crítico | S/M | — | ⚪ | **Cerrado como riesgo asumido (2026-08-14).** Repo privado y secreto rotado; lo que queda lo decidió Ignacio y pasó a §5. No es tarea pendiente |
| **EXT-02** | Alto | XS | 1b | ✅ | — |
| **EXT-03** | Medio | XS | 8 | 🔴 | **Desbloqueado por §13**: el código es de Ignacio, y la nota de titularidad y alcance ya está en el README. Falta solo el archivo `LICENSE` |
| **EXT-04** | Info | XS | 1 | ✅ | — |
| **DB-01** | Alto | M | 3 | ✅ | — |
| **DB-02** | Alto | S | 3 | ✅ | — |
| **DB-03** | Medio | S | 3 | ✅ | — |
| **DB-04** | Medio | M | 3→? | 🟡 | **Mitad resuelta en `V9`**: el nivel no retrocede sin firma. **La seña sigue sin dueño** — §13 dijo que no hay excepción, pero no a qué reservas alcanza, y una clase de una inscripción ya paga no lleva seña propia |
| **DB-05** | Medio | S | 1 | ✅ | — |
| **DB-06** | Bajo | XS | 1 | ✅ | — |
| **DB-07** | Bajo | S | 3 | ✅ | **Cerrado en `V9`**: `egreso` y `venta_equipo` se anulan con autor + fecha + motivo, y por eso ya no se borran — la condición que V6 §7 se había puesto a sí misma |
| **DB-08** | Bajo | S | 8 | ✅ | — |
| **DB-09** | Bajo | XS | 3 | ✅ | — |
| **DB-10** | Info | — | 8 | ✅ | **Cerrado por §13 (P11): 10:00 a 18:00 y no se usa después de medianoche.** El modelo `DATE` + dos `TIME` es el correcto y no hay que tocar nada |
| **DB-11** | Bajo | XS | 3 | 🟡 | *(nuevo, 2026-08-14)* Evitado en `bloqueo_sala`; en `reserva` queda validar el orden de las horas en el DTO del Módulo 2 |
| **SEC-01** | Alto | XS | 1 | ✅ | — |
| **SEC-02** | Alto | M | 4 | ✅ | — |
| **SEC-03** | Alto | S | 4 | ✅ | Backend hecho. El botón en `UsuariosPagina.tsx` va con ARQ-02 |
| **SEC-04** | Medio | S | 1 | ✅ | — |
| **SEC-05** | Medio | S | 5 | ✅ | — |
| **SEC-06** | Bajo | XS | 8 | ✅ | **Decidido en §13: se deja como está**, con el mismo argumento ya escrito para el email. El hallazgo pedía decidirlo explícitamente, y está decidido |
| **SEC-07** | Bajo | S | 8 | ✅ | Las dos apps. `frame-ancestors` y HSTS del panel van en el proxy — anotadas en el deploy de `operacion.md` |
| **SEC-08** | Bajo | S | 4 | ✅ | — |
| **SEC-09** | Bajo | XS | 8 | ✅ | — |
| **ARQ-01** | Alto | S | 5 | ✅ | — |
| **ARQ-02** | Medio | M | 5 | ✅ | Los dos `GET /{id}` siguen sin usarse a propósito: el listado ya trae esos campos |
| **ARQ-03** | Medio | S | 1 | ✅ | — |
| **ARQ-04** | Medio | S | 8 | ✅ | — |
| **ARQ-05** | Bajo | XS | 5 | ✅ | — |
| **ARQ-06** | Bajo | S | 8 | ✅ | Movidos. `normalizar` queda duplicado a propósito — ver el bloque del hallazgo |
| **ARQ-07** | Bajo | XS | 8 | ✅ | — |
| **ARQ-08** | Bajo | S | 8 | ✅ | — |
| **ARQ-09** | Bajo | S | 5→8 | ✅ | — |
| **ARQ-10** | Info | — | 8 | ✅ | **Decidido en §13: se duplica.** Son ~40 líneas; un `packages/` compartido a esta escala cuesta más de lo que ahorra |
| **SEO-01** | Alto | M | 7 | ✅ | — |
| **SEO-02** | Medio | XS | 7 | ✅ | — |
| **SEO-03** | Bajo | XS | 7 | ✅ | — |
| **SEO-04** | Bajo | XS | 7 | ✅ | — |
| **SEO-05** | Bajo | XS | 7 | ✅ | — |
| **SEO-06** | Bajo | M | 7 | ✅ | **Medido el 2026-08-15.** CLS 0; LCP 3,7–4,4 s, 90% *render delay*. La decisión y los números, en el `CLAUDE.md` de landing |
| **QA-01** | Alto | M | 6 | ✅ | — |
| **QA-02** | Alto | M | 7 | ✅ | — |
| **QA-03** | Medio | M | 6 | ✅ | Escalón 1 hecho. Testcontainers (escalón 2) queda como mejora, no como hueco |
| **QA-04** | Medio | M | 6 | ✅ | Falta verlo correr en Actions: se confirma en el primer push |
| **QA-05** | Medio | S | 6 | ✅ | El andamio y las cinco piezas críticas. No es cobertura, y no pretende serlo |
| **QA-06** | Medio | S | 8 | ✅ | — |
| **QA-07** | Bajo | S | 6 | 🟡 | Endpoint de salud y healthcheck de Postgres, hechos. Falta el del backend, que necesita el compose de deploy — bloqueado por el hosting, igual que DOC-08 |
| **QA-08** | Bajo | XS | 8 | ✅ | — |
| **DOC-01** | Alto | XS | 1 | ✅ | — |
| **DOC-02** | Alto | S | 3 | ✅ | — |
| **DOC-03** | Medio | XS | 1 | ✅ | — |
| **DOC-04** | Medio | XS | 1 | ✅ | — |
| **DOC-05** | Medio | S | 7 | ✅ | — |
| **DOC-06** | Medio | S | 7 | ✅ | — |
| **DOC-07** | Alto | S | 6 | ✅ | — |
| **DOC-08** | Alto | M | 6 | 🟡 | Backup, restore probado y runbook de migraciones, hechos. **El deploy depende del hosting (octubre)** |
| **DOC-09** | Alto | XS | 1b | ✅ | — |
| **DOC-10** | Medio | XS | 8 | ✅ | — |
| **DOC-11** | Bajo | XS | 8 | 🔴 | Cuatro restos de estado superado |
| **DOC-12** | Bajo | XS | 8 | ✅ | Reordenadas, no renumeradas: §2.6 y §3.5 están citadas desde otros cuatro lugares |
| **DOC-13** | Info | XS | 8 | ✅ | **Hecho**: movidos a `docs/auditoria/` (§13). Verificado — la raíz no tiene ningún `prompt-*.md` |

**De dónde sale el 61:** 59 hallazgos del informe original + 2 aparecidos durante la
remediación (DB-11 y QA-08). *(Las cuentas del 2026-08-14 —32 resueltos, 28 abiertos—
quedaron viejas dos veces en un día; el número que vale es el del párrafo de abajo, que se
actualiza al cerrar cada tanda.)*

> ### ⚠️ Esta cuenta cambió el 2026-08-14 por `docs/requirements/platform.md` §13
>
> **`platform.md` §13 — "Decisiones cerradas el 2026-08-14" — contesta veinte preguntas
> de una sola vez, incluidas las cinco del cliente**, y este informe no la conocía: hasta
> ahora marcaba como *"bloqueado por una decisión que no es de código"* diez hallazgos
> cuya decisión **ya estaba tomada y escrita**. Se sincronizó fila por fila.
>
> **Lo que eso cambió, y no es menor:**
>
> - **Los dos Altos que "bloqueaban publicar la landing" ya no bloquean nada**: SEO-01
>   (P34 y P31) y QA-02 (precios y firma) pasaron de 🟡 a 🔴. Son trabajo de código, hoy.
> - **Cuatro hallazgos se cerraron sin escribir una línea**, porque lo único que pedían
>   era una decisión que ya existe: DB-10 (P11 cierra la pregunta de la medianoche y
>   confirma que el modelo actual es el correcto), SEC-06, ARQ-10 y DOC-13.
> - **DB-04 y DB-07 dejaron de ser preguntas de negocio y pasaron a ser una migración**,
>   con la regla ya definida.
> - **EXT-03**: la titularidad está resuelta y la nota ya está en el README; queda solo el
>   archivo `LICENSE`.
>
> **`platform.md` §13 gana sobre este informe en todo lo que sea una decisión.** Si algo de
> acá la contradice, está viejo.

**Al 2026-08-15, con las tandas 6 y 7 cerradas y la 8 hasta su parte de código: 51
resueltos de 61**, 1 cerrado como riesgo asumido, **5 abiertos (🔴)** y 4 a medias (🟡).

**Queda UN SOLO Alto abierto en todo el proyecto: DOC-08**, y no se destraba
programando — es la sección de deploy, que espera el hosting de octubre. No queda ningún
Crítico desde la tanda 1. De los Medios quedan **tres**, y ninguno es de comportamiento:
EXT-03 (falta el archivo `LICENSE`), ARQ-04 (dos formatos de error conviviendo) y DOC-10
(una justificación mal citada).

**Los 9 🔴 son todos de la tanda 8**, o sea limpieza: nada bloquea nada y conviene
barrerlos de una sola pasada. **Ninguno cambia el comportamiento del sistema** — los
cuatro que sí lo cambiaban ya están hechos.

**De los 5 🟡, solo tres esperan una decisión**: QA-07 y DOC-08 (el hosting de octubre) y
DB-04 (a qué reservas alcanza la seña, que conviene cerrar antes del Módulo 2). Los otros
dos no están bloqueados, están programados: DB-11 espera al DTO del Módulo 2 y ARQ-09 se
barre con la tanda 8.

**Dicho de otra forma: el backlog de la auditoría dejó de ser trabajo de arreglar y pasó
a ser una pasada de limpieza más tres decisiones.**

### 8.2 Las tandas

El orden respeta las dependencias de §7 y los cinco pares donde hacerlo al revés
significa rehacer.

| Tanda | Hallazgos | Por qué van juntos |
|---|---|---|
| ~~**1**~~ | ~~SEC-01, SEC-04, DB-05, ARQ-03, DOC-01, DOC-03, DOC-04, DB-06, EXT-04~~ | **Hecha** |
| ~~**1b**~~ | ~~EXT-02, DOC-09~~ | **Hecha** — commit `870b0da`, pusheado |
| ~~**3**~~ | ~~DB-02, DB-01, DB-03, DB-07, DB-09, DB-11, DB-04, DOC-02~~ | **Hecha** — `V7`, con las tablas todavía vacías |
| ~~**4**~~ | ~~SEC-02, SEC-03, SEC-08~~ | **Hecha** — límite de intentos, log de eventos, reseteo de contraseña y vencimiento de la temporal |
| ~~**2**~~ | ~~EXT-01~~ | **Cerrada.** Repo privado ✅ y secreto rotado ✅; lo demás quedó como riesgo asumido (§5). EXT-03 —la nota de titularidad— se movió a la tanda 8 |
| ~~**5**~~ | ~~ARQ-01, SEC-05, ARQ-02, ARQ-05, ARQ-09~~ | **Hecha** — paginado, gateo por rol, y las pantallas de alta con rol, edición y reseteo |
| ~~**6**~~ | ~~DOC-07, DOC-08, QA-07, QA-01, QA-03, QA-04, QA-05~~ | **Hecha** — operación, los tests que faltaban y el pipeline. El orden resultó ser el correcto: el script de las SQL tenía que existir antes del CI, porque el CI necesita un comando que correr. Queda pendiente solo lo que depende del hosting de octubre |
| ~~**7 — Landing**~~ | ~~SEO-01, QA-02, SEO-02, SEO-03, SEO-05, SEO-06, SEO-04, DOC-05, DOC-06~~ | **Hecha** — los nueve. Las cinco preguntas al cliente que la abrían están contestadas en `platform.md` §13 |
| **8 — Resto documental y menor** | ~~QA-08, SEC-09, QA-06, SEC-07, ARQ-04, ARQ-06, ARQ-07, ARQ-08, ARQ-09~~ **hechos el 15/08**; quedan **EXT-03, DB-08, DOC-10, DOC-11, DOC-12** | Nada bloquea. Se hizo en dos partes y en ese orden a propósito: primero los cuatro que cambiaban el comportamiento del sistema, después los cinco de código. **Lo que queda es documentación y un archivo `LICENSE`**, y conviene hacerlo último porque registra todo lo anterior de una vez |

### 8.3 Lo que no se destraba programando

> **Esta sección quedó obsoleta el 2026-08-14 y se conserva tachada porque el resto del
> informe la referencia.** Las ocho preguntas que enumeraba **están contestadas** en
> `docs/requirements/platform.md` §13.

~~Cinco preguntas al cliente (§7.a: duraciones de los cursos, precios, firma de las notas,
el email, y dirección/teléfono/horarios/año) y tres decisiones de Ignacio: la titularidad
y el mantenimiento (EXT-03), P8 —qué significa "autorización explícita" para una seña—
(DB-04), y si el cliente HTTP se comparte entre las dos apps (ARQ-10).~~

**Lo que queda hoy que no se destraba programando es UNA sola cosa: elegir el hosting**,
que es una decisión de octubre y de la que dependen el deploy (DOC-08), el healthcheck del
backend (QA-07) y el destino de los backups.

**La otra cosa que estaba trabando el orden de trabajo se cerró el 2026-08-14: Ignacio
confirmó que NO tiene objeciones a la primera tanda del Módulo 1.** La nota del 12/08
—que nunca llegó a enumerar ninguna— queda sin efecto: **esa tanda está bendecida y se
puede construir encima.**

*(Tampoco hay una "tanda 9". El deploy no es una tanda: es lo que resta de DOC-08 y QA-07,
y ya figura en cada uno con su bloqueo. Agrupar en una tanda algo que no se puede empezar
sugiere trabajo que no existe.)*

---

## Anexo — Verificado y correcto

Vale tanto como los hallazgos, porque varias de estas son las que más fácil se rompen.

- **Los cuatro roles coinciden en las cuatro capas**, tal como `CLAUDE.md:139` exige: `V1__baseline.sql:53-54` (`CHECK (rol IN ('ADMIN','DIRECTIVO','STAFF','USUARIO'))`), `usuario/Rol.java`, `apps/platform/src/api/tipos.ts:13` y `dbml:79`. **No queda ningún rastro de "tres roles" escrito como vigente**: las dos apariciones son la corrección explícita, fechada.
- **La tabla de endpoints de `README.md:96-111` es exacta, fila por fila.** Se verificaron las 14 contra los cuatro controllers: rutas, verbos y permisos coinciden sin excepción. **No hay endpoints documentados que no existan, ni implementados sin documentar.** Es la parte mejor mantenida del repo.
- **Los conteos de tests son reales:** 57 `@Test` en `apps/backend/src/test/java/**` (coincide con `README.md:82` y con `plan:410`), sin tests parametrizados que inflen el número; 69 y 40 llamadas a `probar()` en los dos `.sql`.
- **Todos los comandos documentados existen**: `dev:landing`, `dev:platform`, `build:landing`, `build:platform` en el `package.json` raíz; `dev`/`build`/`lint` en ambos workspaces (`oxlint` en platform, `eslint` en landing, como dice `CLAUDE.md:45-46`); `docker compose up -d` levanta `postgres:16-alpine`.
- **Todos los archivos que `apps/platform/README.md` nombra existen** y hacen lo que dice. Es el README mejor mantenido del repo, y el patrón a copiar para el de la landing.
- ~~**El DBML sabe que quedó atrás y lo dice bien:** `dbml:7-14` avisa que no refleja V3..V6 **y enumera las diferencias que importan**, V6 incluida.~~ **Corregido por la Fase 1 (DB-06):** esta conclusión salió de leer la cabecera, no de comparar el contenido. Comparado tabla por tabla contra el esquema real, el diagrama **ya incorpora V4 y V5** y su cabecera advierte sobre diferencias que no existen. Lo que sigue en pie del elogio original: la cabecera **sí** explica bien lo que un DBML no puede mostrar (`:20-30`), y eso vale.
- **El índice de decisiones P1-P37 es consistente**: 37 filas, el estado de P18 coincide en los cuatro lugares donde aparece, y los dos bloqueantes que §6d manda preguntar antes de `inscripcion` (P4, P5) figuran como abiertos.
- **`target/` y `node_modules/` están correctamente ignorados**; no hay artefactos de build rastreados. Los 189 archivos rastreados y los 18 MB de `.git` son razonables — el peso está en los assets de marca, no en basura.

### Agregado por la Fase 6 — calidad, tests y operación

- **Los dos linters pasan limpios.** `oxlint` sobre `apps/platform` y `eslint` sobre `apps/landing/src` con `--max-warnings 0`: exit 0 los dos, sin una sola advertencia. En un repo con 21 archivos de front y una capa de motion compleja, eso no es gratis.
- **`prefers-reduced-motion` se respeta en serio**, que en este sitio es *la* decisión de accesibilidad: dos bloques de CSS y seis guardas de JavaScript, en el preloader, el cursor, el efecto magnético, la barra, el pie y las filas editoriales. Cada componente animado la consulta antes de animar.
- **El foco visible está bien definido a nivel global** (`globals.css:131-133`: `outline: 2px solid var(--red)` con `outline-offset: 3px`). El problema de QA-06 es un `outline-none` que lo pisa en un archivo, no la ausencia de la regla.
- **Los formularios de la plataforma están mejor resueltos que los de la landing**: `Campo.tsx` asocia etiqueta e input envolviéndolos, marca los errores con `aria-invalid` y los anuncia con `role="alert"`. Es el patrón correcto y no es el más frecuente.
- **El acordeón de FAQ y el menú móvil usan los roles nativos**: `<button type="button">` con `aria-expanded`, no `<div onClick>`. Es lo que hace que funcionen con teclado sin que nadie lo programe.
- **`--page-muted` da 5,18:1 y 5,14:1 en los dos temas**, prácticamente el mismo número: la paleta se ajustó para pasar el contraste en ese nivel, y se ajustó en los dos temas a la vez. El fallo de `--page-faint` es un token que quedó fuera de ese trabajo, no un descuido general.
- **Los 57 tests de Java son de calidad alta**, aunque cubran menos superficie de la que su cifra sugiere: son de integración de punta a punta, incluyen casos adversariales explícitos (token con `alg: none`, firmado con otra clave, sin `exp`) y varios están escritos para fijar un bug ya medido, con el motivo en el nombre del método. Es el estilo de test que sirve dentro de un año.

### Agregado por la Fase 3 — SEO y GEO

Todo lo de esta lista se verificó sobre el HTML generado por `npm run build`, no sobre el
código fuente.

- **La regla de veracidad se cumple, y no de palabra.** En los 20 documentos generados no aparece **ni una vez** `price`, `offers`, `priceCurrency`, `aggregateRating`, `ratingValue`, `reviewCount`, `telephone`, `openingHours`, `foundingDate` ni `geo`. Los campos que `data/business.ts` marca `PENDIENTE` se omiten de verdad, en las 20 páginas. Es la parte más difícil de sostener de una capa de SEO y está sostenida.
- **El mecanismo anti-placeholder funciona donde se lo diseñó**: `sameAs` publica únicamente la URL real de Spotify; el Instagram y el YouTube placeholder (`https://instagram.com`, `https://youtube.com`) quedan afuera, como corresponde. Su límite está en SEO-02, no en su diseño.
- **Cobertura de metadata perfecta y sin repeticiones.** Las 20 URLs tienen title, description, canonical, OG completo y Twitter card. **Ningún título y ninguna descripción se repite**, ninguna es genérica, y todas están redactadas con intención local ("en Pilar" aparece en seis títulos). Las dinámicas resuelven bien: los 6 posts y los 3 programas generan su propia metadata.
- **El `og:image` está en las 20 páginas**, incluida la trampa que `lib/seo.ts:47-57` documenta: declarar `openGraph` en una página reemplaza el del layout entero, y por eso la imagen por defecto va explícita en el helper. Verificado que funcionó.
- **Sitemap y robots no se contradicen.** 19 URLs en el sitemap = las 20 del sitio menos `/ingresar`; ninguna indexable falta, ninguna sobra. `lastModified` de las notas sale de la fecha real de cada nota y no de la fecha de build, que es la diferencia entre un sitemap útil y uno decorativo.
- **La URL base sale de una sola constante.** `SITE_URL` en `data/business.ts` alimenta `metadataBase`, los canonicals, el sitemap, el `robots.txt`, los `@id` del JSON-LD y el `llms.txt`. Cero URLs hardcodeadas.
- **El JSON-LD es un grafo, no una pila de fragmentos.** Nueve tipos, un solo `@context` por bloque, `@id` estables, y todo colgando de `#organization` por referencia. Los `BreadcrumbList` están en las 18 páginas interiores con `position` correcto desde 1.
- **El schema dice exactamente lo que dice la página**: las 9 preguntas y las 9 respuestas de la `FAQPage` están, palabra por palabra, en el texto visible de `/faq`. Es la regla que más se rompe en la práctica y acá se cumple.
- **El contenido está en el HTML del servidor.** 7.664 caracteres de texto en la home, con toda la jerarquía de encabezados, pese al GSAP, el preloader, el cursor propio y el smooth scroll. Un motor de respuesta que no ejecuta JavaScript se lleva la página entera.
- **`llms.txt` existe, es coherente con el sitio y está bien escrito para lo que es**: resumen autocontenido, entidades nombradas, secciones "Para quién es" y "Qué lo diferencia" en lenguaje natural, y una sección explícita de datos pendientes con la instrucción de no inferirlos. Su problema es lo que enumera como pendiente (SEO-01), no su forma.
- **Accesibilidad de imágenes correcta**: 16 de 16 con `alt`; las 8 vacías son texturas de fondo con opacidad 0,16, que es el uso correcto. Ninguna genera CLS: todas usan `fill` con contenedor dimensionado.
- **`lang="es-AR"`**, fuentes self-hosted con `next/font` y 5 preloads, sin dominios de terceros que resolver.

### Agregado por la Fase 5 — consistencia entre capas

- **El contrato de datos es exacto, verificado contra el JSON real y no contra el código.** Los seis records de respuesta y sus tipos de TypeScript coinciden campo por campo: nombres, tipos, opcionalidad y formato de fechas. `Instant` sale como ISO-8601 y no como número de época —que es el default de Jackson y el error clásico—, y `credencial.ts:34` lo parsea bien; `LocalDate` sale como `YYYY-MM-DD`. **Cero diferencias en los seis tipos.**
- **La forma de error propia es consistente en los siete códigos que la usan.** 400 de validación (con su mapa `errores` campo por campo), 401, 403 por rol, 403 por regla de negocio, 404 y 409 salen todos como ProblemDetail con `detail` en español y `title` útil. El front sabe leerlos y los muestra donde corresponde: los de campo en el input, el resto como cartel.
- **El front distingue el 401 del login del 401 de sesión vencida** (`cliente.ts:76-79`), que es la distinción que hace que una contraseña mal escrita no te expulse de la aplicación. Y cierra la sesión sola cuando el backend rechaza una credencial en cualquier pedido (`AuthProvider.tsx:75-80`), en vez de dejar la pantalla dibujada fallando de a un pedido por vez.
- **Las dos pantallas de listado tienen estado de carga y estado de error en cada llamada**, y los reinician antes de cada pedido (`UsuariosPagina.tsx:33-44`, `AlumnosPagina.tsx:27-38`). El buscador tiene *debounce* de 250 ms. No hay ninguna llamada sin manejo de error.
- **No hay lógica de negocio duplicada entre la base, el servicio y el front.** El único caso de tres capas —email y teléfono únicos— está deliberado y argumentado: pre-chequeo en el servicio por el mensaje, índice único en la base por la concurrencia, y traducción en el manejador de errores para que las dos den el mismo 409. La única validación que el front hace por su cuenta es que las dos contraseñas coincidan, y su comentario explica por qué no es una regla del sistema (`CambioPasswordObligatorio.tsx:35-36`).
- **El menú se arma enteramente desde `/api/me`**, como la arquitectura promete: `menu.ts` no tiene un solo usuario, rol ni ruta hardcodeada por persona, y las tres reglas están separadas y explicadas. Los ítems de módulos que no existen se dibujan apagados con `aria-disabled` en vez de navegar a una pantalla vacía.
- **El monorepo está limpio de duplicación de código**: `landing` y `platform` no comparten un solo archivo, cada una tiene su configuración de TypeScript y su linter, y el backend Maven está afuera del workspace npm, que es lo correcto. ~~Lo único que sobra son dos lockfiles (ARQ-07).~~ **Los dos lockfiles salieron el 2026-08-15.**

### Agregado por la Fase 1 — base de datos

Esta lista es el hallazgo principal de la fase. **Todo lo que el esquema declara que
impone, lo impone**: se corrieron sus 109 pruebas sobre el esquema real y se le sumaron
ataques propios, y ninguna de sus reglas se pudo violar.

- **La deriva entre las cuatro capas no existe.** Se comparó valor por valor: los cuatro enums Java (`Rol`, `EstadoAlumno`, `NivelIngreso`, `EstadoPresencia`) coinciden **exactamente** con sus CHECK en el esquema real, y los tres que están expuestos al front (`tipos.ts:13`, `tiposAdmin.ts:35-36`) coinciden con los dos anteriores. El cuarto no tiene tipo en TS porque no viaja en ningún DTO, que es lo correcto. Cero divergencias en las 22 tablas y en los 22 CHECK de tipo enumerado.
- **Las 46 claves foráneas están en `NO ACTION`, sin una sola excepción** (`confupdtype = confdeltype = 'a'` en las 46). Es la decisión declarada en `V1:13-17` y se cumple al pie de la letra: no hay forma de arrastrar historial borrando un padre.
- **La regla más importante del sistema aguanta lo que se le tira.** El `EXCLUDE` de solapamiento resistió los cinco ataques geométricos de la suite adversarial —reserva contenida, reserva que contiene, idéntica, solape de un minuto, borde exacto— más el esquive de resucitar una reserva `CANCELADA` sobre una franja ya ocupada. Elegir `EXCLUDE` en vez de un trigger es la decisión técnicamente correcta y está bien argumentada en `V1:263-267`.
- **Las seis migraciones aplican limpio sobre una base vacía**, verificado creando una base nueva y aplicándolas con `ON_ERROR_STOP=1`. Y `V2`/`V3` **no son re-ejecutables por accidente**: sus `INSERT` chocan contra `tipo_uso.codigo`, `sala.nombre_sala` y `usuario_email_unico`, así que una segunda corrida falla ruidosamente en vez de duplicar datos en silencio.
- **Los conteos que la auditoría del desarrollador declara son exactos**, verificados contra el catálogo: 55 CHECK, 46 FK, 10 triggers, 22 tablas. Es una afirmación falsable del repo que resultó cierta.
- **El dinero está bien tipado.** Todos los importes son `NUMERIC(14,2)` y todas las cotizaciones `NUMERIC(14,4)`: **no hay un solo `float` ni `double precision` en las 22 tablas**. Toda columna monetaria lleva su `moneda` con CHECK, y V6 cerró el hueco de la cotización en cero, que era el que hacía desaparecer importes del balance sin error.
- **Todos los timestamps son `TIMESTAMPTZ`**, sin un solo `TIMESTAMP` sin zona. La única excepción es deliberada y correcta: los dos `tsrange` generados (`reserva.periodo`, `bloqueo_sala.periodo`) trabajan en hora de pared, que es lo que corresponde para agendar salas.
- **Los constraints están nombrados**, los 55, con nombres que dicen qué regla imponen (`reserva_uso_permitido_en_sala`, `pago_descuento_justificado`, `trabajo_liberacion_justificada`). No hay un solo nombre autogenerado por Postgres salvo en los UNIQUE de columna, y eso es lo que hace viable la recomendación de DB-05.
- **La cobertura de las dos suites es buena de verdad**, no nominal: se cruzaron los 109 casos contra las constraints del catálogo y **todas las reglas de negocio no triviales tienen su caso**. Lo que quedó sin cubrir son unos pocos CHECK de valor de enum y dos UNIQUE de catálogo, cuyo test aportaría poco — más la combinación que sí importa y que señala DB-03.

### Agregado por la Fase 4 — seguridad

Esta lista es el hallazgo principal de la fase: **el núcleo de autenticación y
autorización resiste lo que se le probó.** Nada de lo que sigue es "no encontré nada";
cada punto es una hipótesis de ataque que se buscó y que estaba cerrada.

- **La autorización se resuelve contra la base en cada pedido, tal como el repo promete en cinco lugares.** `AutenticacionDesdeBase.java:77-97`: lee el usuario, corta si `activo = FALSE`, y arma las autoridades desde `usuario.getRol()`, **nunca desde el claim**. Los tres agujeros que la auditoría del 12/08 midió están cerrados y **fijados con test que pasa**: `CredencialVigenteTest` (baja inmediata, degradación de rol, contraseña temporal sin cambiar) y `TokenJwtTest:153`, `las_autoridades_salen_de_la_base_y_no_del_claim_del_token`.
- **El token está bien construido y bien validado.** `TokenJwtTest` (10 casos, todos pasan) cubre exactamente los ataques que corresponden: `alg: none`, firmado con otra clave, sin `exp`, de otro emisor, basura, y `sub` no numérico. La exigencia de `exp` e `iss` está explícita en `SeguridadConfig.java:137-150` porque el validador por defecto **no** exige `exp` — el proyecto lo sabe y lo dejó escrito.
- **No hay escalada de privilegios por el cuerpo del pedido.** `RegistroRequest` no tiene campo `rol` (`dto/RegistroRequest.java:10-13`, con el motivo escrito), y en el alta por administración el rol pedido se descarta si quien pide no es ADMIN (`UsuarioService.java:209-214`). Probado en los dos sentidos: `RegistroTest:84` y `PermisosPorRolTest:130,142`.
- **Cero mass assignment.** Ningún controller recibe ni devuelve una entidad JPA: los ocho endpoints de administración usan records de DTO, y `UsuarioResumen`/`UsuarioActual` documentan en su javadoc por qué no llevan `passwordHash`. Se revisaron los cuatro controllers uno por uno.
- **Cero superficie de inyección SQL.** No existe una sola consulta nativa en el backend (`grep nativeQuery|createNativeQuery` → nada); las dos únicas `@Query` son JPQL con parámetros ligados, y `Busqueda.patron()` además escapa los comodines de `LIKE`.
- **Nada sensible se escribe en ningún log — porque no hay logs.** Ningún `@Data` ni `@ToString` de Lombok sobre `Usuario` (usa `@Getter`/`@Setter`, `Usuario.java:28-29`), así que el `passwordHash` no puede colarse en un mensaje de excepción. Es correcto por resultado; que la causa sea la ausencia total de logging es el problema separado de SEC-02.
- **`@EnableMethodSecurity` está activo** (`SeguridadConfig.java:60`) — sin él las anotaciones compilarían sin hacer nada — y **los 14 endpoints tienen regla explícita**: dos públicos declarados por método (`POST` y solo `POST`), dos que exigen autenticación, y diez con `@PuedeLeerAdministracion` o `@PuedeOperar`. `anyRequest().authenticated()` cierra el resto. La matriz coincide fila por fila con `README.md:96-111` y con `docs/requirements/platform.md:77-82`.
- **No hay IDOR.** Los únicos endpoints que reciben un id de recurso son de administración y exigen rol. Lo que un usuario puede tocar de sí mismo —`/api/me`, `/api/me/password`— **saca el id del `sub` del token, nunca de la URL ni del cuerpo** (`MeController.java:42-43`, y el mismo criterio en `UsuarioController.java:109-112`).
- **La defensa contra el ataque de timing sigue viva** y con test que la fija: `SesionService.java:47,79-82` y `AutenticacionTest:233`. El javadoc es honesto sobre su alcance —*"no es tiempo constante: es un orden de magnitud menos de señal"*—, que es la forma correcta de documentar una mitigación parcial.
- **El estado `debeCambiarPassword` se impone en el servidor, no solo en la pantalla.** `AutenticacionDesdeBase.java:90-93` reemplaza el rol por `ROLE_PASSWORD_PENDIENTE`, que no pasa ningún `@PreAuthorize`; alcanza para `/api/me` y `/api/me/password` y nada más. Con test: `CredencialVigenteTest:107,123`.
- **El frontend cierra la sesión cuando el backend rechaza la credencial**, en cualquier pedido y no solo en el próximo login: `cliente.ts:79` distingue el 401 del login del 401 de sesión vencida, y `AuthProvider.tsx:75-80` la termina. `credencial.ts:34-37` además descarta el token vencido antes de mandarlo.
- **El cambio de contraseña exige la actual aunque haya sesión abierta** (`CambioPasswordRequest.java:9-11`), con el motivo escrito: la compu del estudio queda abierta. Probado en `PasswordTemporalTest:116`.

---

---

## Cierre

**Las ocho fases del encargo están ejecutadas: 59 hallazgos, 1 crítico, 15 altos.**

El dictamen general, en una línea: **es un proyecto bien pensado y mal resguardado.** La
calidad del criterio técnico está muy por encima de lo habitual —el modelo de datos, la
separación de los dos ejes de permisos, la resolución de la autorización contra la base,
la regla de veracidad en los datos estructurados, y sobre todo la costumbre de dejar
escrito *por qué* se tomó cada decisión— y aun así el hallazgo crítico es que el
repositorio es público con material del cliente adentro, y el segundo es que dos días de
trabajo viven sin commitear en un solo disco.

Ese contraste es el patrón que se repite en las seis áreas técnicas, y conviene nombrarlo
porque es lo único que hay que corregir de fondo: **lo que se decidió está bien hecho; lo
que no se decidió no tiene dueño.** El "nada se borra" se implementó para el dinero y no
para las clases. La regla de veracidad se aplicó a la identidad del negocio y no al
catálogo. La autorización se resolvió con rigor y el perímetro del login quedó abierto.
Los tests cubren la autenticación de punta a punta y no tocan el módulo en construcción.
En los seis casos el trabajo hecho es correcto y el recorte fue más chico que el problema.

Tres cosas para tener presentes al usar este informe:

- **Nada de lo que está acá es una opinión sobre el estilo del código.** Todos los
  hallazgos son verificables con la ruta y la línea que llevan al lado, y buena parte se
  midió ejecutando.
- **Los hallazgos no son todos del mismo tipo.** Hay defectos, hay decisiones pendientes
  que le corresponden al cliente (P34, P31, los precios, las notas del blog) y hay dos o
  tres que son de proceso y no de código. El backlog de §7 los ordena por cuándo hay que
  resolverlos, no por área.
- **Lo que no se verificó está en §6.3, fase por fase.** Es una lista larga a propósito.
  Lo más importante que quedó afuera: no se abrió ninguna de las dos aplicaciones en un
  navegador, no se midió rendimiento, no se probó concurrencia, y no se leyeron los PDF
  de propuesta y relevamiento, que son la fuente declarada contractual.

---

*Informe cerrado el 2026-08-13. Fases 0, 2 y 7 en la primera sesión; 4, 1, 5, 3 y 6 en
las siguientes, todas el mismo día. La única escritura sobre el repositorio fue este
archivo.*
