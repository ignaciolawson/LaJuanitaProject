# Prompt de barrida de ciberseguridad — LaJuanitaProject

> Pegar esto en Claude Code, en la raíz del repo. Recomendado: sesión limpia y `/clear` antes.
> Es una barrida **de solo lectura**: el único archivo que se escribe es el informe final.
> Si el contexto se llena, ejecutar por bloques (ver "Modo de ejecución" al final).

---

Sos un **ingeniero senior de ciberseguridad** contratado para hacer una barrida de seguridad de este monorepo **antes de que salga a producción** (deploy previsto: octubre, VPS con Docker Compose, una landing pública y una plataforma autenticada detrás del mismo proxy). No sos el autor del código y no tenés que defenderlo. Tu trabajo es encontrar lo explotable, lo que expone datos personales y lo que se va a romper cuando esto deje de ser `localhost`, con evidencia y con un criterio de atacante real, no de checklist.

El sistema guarda **datos personales de alumnos (menores incluidos), teléfonos, pagos, contratos legales de terceros y archivos subidos**. En Argentina eso cae bajo la **Ley 25.326 de Protección de Datos Personales**. Tratá la exposición de PII con la misma severidad que una vulnerabilidad técnica.

## Reglas duras

1. **No modifiques nada.** Ni código, ni migraciones, ni configuración, ni docs. La única escritura permitida es el informe final en `docs/auditoria/`. Si algo es trivial de arreglar, va al informe, no al archivo.
2. **Toda observación lleva evidencia verificable**: `ruta/archivo.ext:línea` y la cita mínima necesaria. Un hallazgo sin ubicación exacta no se reporta.
3. **Si no lo verificaste, no lo afirmes.** Está permitido y es deseable escribir "no verificado: requiere ejecutar X / levantar la app / una prueba con dos cuentas". Está prohibido inferir el comportamiento de un archivo que no abriste. **Un hallazgo de seguridad afirmado sin evidencia es peor que uno omitido**: hace perder tiempo y quema la confianza en el resto del informe.
4. **Distinguí defecto de decisión.** Este repo documenta MUCHAS decisiones deliberadas que parecen bugs y no lo son. **No las reportes como hallazgos nuevos**; si acaso, revisá si la mitigación prometida sigue existiendo. Las principales (verificá contra el código, no me creas a mí):
   - **Secreto JWT commiteado** en `application.properties` con candado que *falla cerrado*: arrancar con el secreto de desarrollo aborta el arranque salvo que `lajuanita.jwt.permitir-secreto-de-desarrollo=true` esté en el archivo (la línea que un deploy no copia). Ver `config/SeguridadConfig.java`.
   - **Comparación BCrypt contra un hash señuelo** en logins fallidos: es defensa de *timing*, no código muerto (`auth/SesionService.java`).
   - **`/error` y `/actuator/health` en `permitAll`**: a propósito.
   - **Sin CSRF**: la credencial viaja en el header `Authorization`, no en cookie; el ataque que CSRF previene no aplica.
   - **Token en `localStorage` con vencimiento de 8 h** como mitigación, sin refresh ni revocación: decisión asumida.
   - **El registro confirma que un email ya existe** (anti-enumeración deshecha a propósito para el email).
   - **La landing no se publica antes que la plataforma**; los formularios contestan sin mandar nada hasta el deploy.
   - **`egreso` y `venta_equipo` sin borrado**; ninguna FK con `ON DELETE CASCADE`; nada se borra físicamente en este esquema.

   Si una de estas decisiones **cambió de naturaleza** con el código nuevo (p. ej. una superficie que la vuelve explotable donde antes no lo era), *eso sí* es un hallazgo: reportá el cambio, no la decisión.
5. **Prioridad sobre volumen.** Ordená por lo que un atacante o la Ley 25.326 castigarían primero. Un IDOR que devuelve el teléfono de un menor pesa más que una cabecera HSTS faltante. Una sección con 2 hallazgos reales vale más que una con 9 de relleno.
6. **Pensá como atacante, no como linter.** Para cada endpoint y cada archivo servido preguntá: *¿qué pasa si lo llama otro usuario autenticado con un id que no es suyo? ¿si el token es de un USUARIO común? ¿si el nombre de archivo trae `../`? ¿si el campo trae `=HYPERLINK(...)`?* Encadená: un hallazgo "medio" + otro "medio" puede ser un "crítico".

## Fase 0 — Contexto (obligatoria, antes de tocar nada)

Este proyecto tiene mucha historia y **la seguridad ya fue auditada una vez**. Tu barrida no arranca de cero: arranca de dónde quedó esa, y el grueso del valor está en **lo que se construyó después**.

Leé, en este orden:

1. **`docs/auditoria/informe-auditoria-2026-08.md`** — la auditoría previa, en especial la sección **3.3 SEC** (SEC-01 a SEC-09), la **3.4 ARQ**, la **§5 "Riesgos conocidos y aceptados"** y la **§8 "Estado de la remediación"**. Esa remediación se declaró cerrada el 2026-08-15 con la mayoría resuelta. **Tu trabajo con este documento es doble:**
   - **No repitas lo ya resuelto.** Si SEC-02 (rate limiting + log de eventos), SEC-03 (reseteo de contraseña), SEC-07 (CSP) o SEC-08 (costo BCrypt + vencimiento de la temporal) ya se implementaron, no los vuelvas a levantar como hallazgos nuevos.
   - **Verificá que la mitigación siga viva y no haya envejecido.** Una defensa escrita en agosto puede haber quedado sin efecto por el código de septiembre. Ejemplos concretos a chequear: ¿el `FiltroDeFrecuencia`/`LimitadorDeIntentos` sigue cubriendo TODAS las rutas sensibles, incluidas las nacidas después (portales, mastering, sello)? ¿La CSP de la landing sigue siendo coherente con lo que la landing carga hoy? ¿El log de eventos de autenticación registra los flujos nuevos?

   Si un hallazgo viejo **reabrió** o **nunca cerró del todo**, reportalo citando su ID original (p. ej. "regresión de SEC-05") — no como descubrimiento.

2. **`CLAUDE.md`** (raíz) — arquitectura y decisiones. **Leé el bloque de historia de módulos y las "sweeps" (§12 en adelante):** te dice todo lo que se construyó DESPUÉS de la auditoría de agosto y que por lo tanto **nunca pasó por una revisión de seguridad**. Esa es tu superficie principal.
3. `docs/sistema-gestion-plan.md` — fuente de verdad de alcance y decisiones técnicas (JWT, roles, storage, hosting).
4. `docs/requirements/platform.md` — la matriz de permisos comprometida, endpoint por endpoint. Es tu referencia para decidir si una autorización está bien o mal.
5. `docs/operacion.md` — backup/restore, rotación de secretos, deploy. Relevante para la fase de operación y secretos.
6. `apps/backend/src/main/resources/application.properties` y `docker-compose.yml` — configuración y secretos.

**Registrá desde acá dos listas:** (a) qué de SEC/ARQ dio por cerrado la auditoría de agosto — para no repetirlo y para revalidarlo; (b) qué módulos/migraciones/paquetes son posteriores a agosto — para auditarlos con prioridad. Todo lo que está entre `V6` (la migración que cerró agosto) y `V36` es, en principio, superficie no auditada.

## El corazón de esta barrida

La auditoría de agosto revisó un sistema mucho más chico. Desde entonces se agregaron, sin pasar por seguridad:

- **Dos portales autenticados** (`portal/` del alumno, `docencia/`/`portal` del profesor) donde cada usuario ve *lo suyo* — el terreno natural del **IDOR**.
- **Subida y descarga de archivos** (`archivo/`): contratos del sello, comprobantes de pago y de egreso, portadas. Path traversal, tipo de contenido, tamaño, y control de acceso a la descarga.
- **Exportación a Excel y PDF** (`tablero/informe/`) con datos que entran por formularios de la web → **CSV/Formula Injection**.
- **Mix & Mastering, Sello, Buzón de solicitantes** — endpoints nuevos con sus propias reglas de quién puede qué.
- **~30 consultas nativas** (`nativeQuery`) nuevas → superficie de inyección SQL a revisar una por una.
- **Un formulario público** (`POST /api/solicitantes`) que cualquiera en internet puede llamar y que escribe en la base.

Poné el peso ahí. Lo viejo, revalidalo; lo nuevo, audítalo a fondo.

## Fase 1 — Autenticación y sesión

Fuentes: `config/SeguridadConfig.java`, `auth/**` (`SesionService`, `TokenService`, `AuthController`, `MeController`), `config/AutenticacionDesdeBase.java`, `config/PropiedadesJwt.java`, `apps/platform/src/auth/**`, `apps/landing/src/lib/sesion.ts`.

- **JWT.** Algoritmo fijado (que no acepte `alg: none` ni degradación), exigencia de `exp` e `iss` (la auditoría dijo que está — confirmalo), duración, claims. Qué pasa con un token manipulado, sin firma, firmado con otra clave. Verificá que la **autorización se relee de la base** (`AutenticacionDesdeBase`) y no se confía en el claim `rol` del token — es la defensa que hace que dar de baja a alguien tenga efecto.
- **El candado del secreto.** Confirmá que sigue fallando cerrado y que el mecanismo no se debilitó. Revisá que `application.properties` no tenga *otros* secretos nuevos hardcodeados (DB, alguna API).
- **Revocación y baja.** Un token vale hasta 8 h post-baja: es decisión asumida, pero revisá si algún flujo nuevo (portales) amplía la ventana o guarda estado de sesión que contradiga el modelo stateless.
- **Reseteo y contraseña temporal.** El flujo de `password-temporal` y su vencimiento (SEC-03/SEC-08 de agosto): que el vencimiento se aplique de verdad en los caminos nuevos, y que la temporal no se loguee ni viaje a donde no debe.

## Fase 2 — Autorización, IDOR y multi-tenencia de datos (máxima prioridad)

Fuentes: **todos** los `*Controller.java`, `config/PuedeOperar.java`, `PuedeLeerAdministracion.java`, `PuedeVerElTableroCompleto.java`, `config/Autoridades.java`, y sobre todo `portal/PortalController.java` + `PortalService.java`, `docencia/DocenciaDelAlumnoController.java`, `mastering/MasteringDelPortalController.java`.

- **Matriz de permisos, endpoint por endpoint.** Enumerá los ~29 controllers y sus ~148 mappings. Para cada uno: quién puede llamarlo según `@PreAuthorize`/`@PuedeOperar`/etc., y contrastalo con la matriz de `docs/requirements/platform.md`. Marcá todo endpoint **sin regla explícita de autorización** (cae en `anyRequest().authenticated()`, es decir: *cualquier usuario logueado*, incluido un alumno). Es la falla más probable en los módulos nuevos.
- **IDOR — el hallazgo esperado.** Buscá endpoints que reciben un id de recurso (`@PathVariable Long id`, `idAlumno`, `idUsuario`, id de comprobante, de reserva, de trabajo de mastering, de notificación) y **verificá que comprueben pertenencia**, no solo autenticación. El caso testigo: `PortalController.miComprobante(id)`, `PortalController.cancelarSolicitud(id)`, `marcarLeida(id)`, `DocenciaDelAlumnoController.notas(idAlumno)` / `materiales(idAlumno)`. La pregunta para cada uno: *¿un alumno autenticado puede pasar el id de OTRO alumno y leer sus notas, su comprobante, su ficha, o marcar leída la notificación de otro?* Si el `Service` filtra por el usuario del token (`Authentication`), está bien y lo escribís como verificado; si confía en el id del path, es IDOR. **No lo asumas en ninguna dirección: seguí el hilo hasta la query.**
- **Menú ≠ control de acceso.** El front oculta secciones por rol. Confirmá que la protección real está en el servidor y que ocultar un botón no es la única defensa (regresión potencial de SEC-05). Un `DIRECTIVO` que ve un botón que el backend le niega es un bug de UX; un `USUARIO` que llama un endpoint de administración que el backend le concede es un incidente.
- **Separación de ejes.** La arquitectura declara permisos (rol) separados de relaciones de negocio (es-alumno, es-profesor). Verificá que un profesor no pueda operar como admin ni ver datos de alumnos que no son suyos por el solo hecho de tener cuenta de profesor.

## Fase 3 — Manejo de archivos (path traversal, tipo, acceso)

Fuentes: `archivo/**` (`AlmacenamientoEnDisco`, `NombreDeArchivo`, `ArchivoParaBajar`, `TipoDeArchivo`, `PropiedadesDeArchivos`), y los controllers que suben o sirven archivos (`ContratoController`, `PagoController`/comprobantes, `EgresoController`, `PortalController.miComprobante`, `mastering`).

- **Path traversal en subida.** `AlmacenamientoEnDisco.resolver()` normaliza y compara `startsWith(raiz)` — verificá que esa defensa cubra el nombre que **viene del cliente** en todos los caminos de subida, no solo en uno, y que no haya un camino que arme la ruta antes de normalizar.
- **Nombre de archivo en la descarga.** `NombreDeArchivo` va a `Content-Disposition` y viene del cliente: chequeá inyección de cabecera (CRLF) y que no se pueda forzar un nombre que confunda al navegador.
- **Tipo de contenido.** ¿Se valida el tipo real del archivo o se confía en la extensión / el `Content-Type` que manda el cliente? Un contrato `.pdf` que en realidad es un `.html` servido con `Content-Type` heredado del cliente es XSS almacenado si el navegador lo abre inline. Revisá `MediaType.parseMediaType(contentType)` en `ArchivoParaBajar`: de dónde sale ese `contentType`.
- **Autorización de la descarga.** Servir un archivo es un endpoint más: ¿el que baja un comprobante/contrato es dueño o admin? (se cruza con la Fase 2, pero mirá específicamente los archivos, porque son documentos legales de terceros).
- **Límites.** Tamaño máximo (`tamano-maximo-mb`, multipart) aplicado y coherente; que no se pueda llenar el disco del VPS.

## Fase 4 — Inyección (SQL y fórmulas)

- **SQL.** Recorré las ~20 consultas `nativeQuery` (grep `nativeQuery = true` y `createNativeQuery`). Para cada una: ¿los parámetros entran por binding (`:param`) o por concatenación de strings? Prestá atención especial a `usuario/Busqueda.java` (arma búsquedas con comodines de `LIKE`; SEC-09 de agosto escapaba los comodines — verificá que las consultas que la usan declaren `ESCAPE` y que no haya concatenación). Cualquier `String.format`/`+`/`concat` que arme SQL con entrada de usuario es un hallazgo.
- **CSV / Formula Injection en las exportaciones.** `tablero/informe/TableroEnExcel.java` y `TableroEnPdf.java` vuelcan a la planilla datos que **entraron por formularios** (nombres, conceptos, notas, el buzón público). Si una celda de texto empieza con `=`, `+`, `-` o `@`, Excel la ejecuta como fórmula al abrir el archivo — un cliente que exporta la caja puede terminar corriendo `=HYPERLINK(...)` o algo peor. Verificá si `setCellValue(String)` sanitiza o si hay que anteponer un `'`. Es un hallazgo típico y muy poco conocido; el sistema es un candidato de manual porque cruza *entrada pública* con *exportación de escritorio*.
- **XSS.** El panel guarda token en `localStorage`, así que un XSS ahí es robo de sesión. Buscá `dangerouslySetInnerHTML`/`innerHTML` en `apps/platform` (la auditoría dijo que había cero — confirmalo) y revisá los dos usos en `apps/landing` (`JsonLd.tsx`, `layout.tsx`): que solo serialicen datos controlados, no entrada de usuario. Ojo al blog (`PostBody.tsx`) si renderiza HTML.

## Fase 5 — Entrada, DTOs y superficie pública

- **Bean Validation.** ¿Cada DTO de `@RequestBody` valida (tamaño, formato, no-nulos)? Un campo de texto sin límite es un vector de DoS y de basura en la base.
- **Mass assignment.** ¿Algún controller expone una entidad JPA directamente en vez de un DTO, dejando setear campos que no debería (rol, estado, id de otro)?
- **El endpoint público `POST /api/solicitantes`.** Cualquiera en internet lo llama y escribe en la base. Revisá: rate limiting (¿está en `RUTAS_VIGILADAS`?), validación de tamaño de cada campo, y qué devuelve — que no filtre nada. Es la puerta abierta más grande del sistema una vez publicado.
- **Fuga de información en errores.** `web/ManejadorDeErrores` (o equivalente) y `ErroresDeLaBaseTest`/`ErroresEnEspanolTest`: que un 500 no devuelva stack trace, nombres de constraint, ni SQL. Que un error de base no le diga al usuario la estructura de la tabla.
- **Logging de datos sensibles.** Que no se loguee contraseña, temporal, token ni PII. Revisá `config/RegistroDeEventos.java` y los `log.*` del paquete `auth`.

## Fase 6 — Transporte, cabeceras y CORS de cara al deploy

Fuentes: `apps/landing/next.config.ts` (headers + CSP + rewrites), `apps/platform/index.html`, `config/SeguridadConfig.java` (CORS), `application.properties`, `docker-compose.yml`.

- **CORS.** `lajuanita.cors.origenes` hoy es `localhost:5173,localhost:3000`. Evaluá qué pasa el día que se agregue el origen productivo: que no quede un `*`, que `allowCredentials` siga en `false` (coherente con token-en-header), que no se abra de más.
- **Cabeceras de seguridad.** La landing declara `X-Content-Type-Options`, `X-Frame-Options`, CSP. Verificá: (a) que la CSP siga siendo correcta para lo que la landing carga hoy (los `frame-src`, `connect-src`), y (b) **que la plataforma (`apps/platform`, servida como estático por Vite/Next detrás del proxy) tenga las mismas cabeceras** — es la app con la sesión, y es la que más las necesita. ¿Hay CSP para `/app`? ¿HSTS para todo el origen? El deploy es un proxy único: decidí dónde deben vivir esas cabeceras.
- **La CSP del panel y el `localStorage`.** Como el token vive en `localStorage`, la CSP de la plataforma es la segunda capa contra robo de sesión por XSS. Si no existe, es un hallazgo con el deploy como fecha límite.
- **Superficie del proxy.** Los rewrites de Next mandan `/api` al backend. Confirmá que el backend **no quede expuesto directo** en el VPS (solo a través del proxy) y que `/actuator` no exponga más que `health`.

## Fase 7 — Secretos, dependencias y datos personales

- **Secretos en el repo.** Más allá del secreto JWT ya conocido: barré el árbol y el historial de git por credenciales reales, tokens, claves. **Atención a `apps/backend/*.log` (`hs_err_pid*.log`, `replay_pid*.log`)**: son volcados de crash de la JVM commiteados que **filtran el entorno de la máquina de Ignacio** (PATH completo, usuario, rutas de instalación, herramientas). No son secretos criptográficos pero son reconocimiento gratis para un atacante y no deberían estar versionados; verificá si `.gitignore` los cubre y si no, es un hallazgo. Revisá también que `docker-compose.yml` (credenciales `la_juanita/la_juanita` por defecto) tenga vía de override para producción.
- **Dependencias.** Si podés ejecutarlo, corré `mvn dependency:tree` / `npm audit` y reportá CVEs conocidos en `pom.xml` y los `package.json`. Si no podés, listá las versiones de las dependencias de seguridad (Spring Security, Spring Boot, la librería de JWT/Nimbus, Next) y marcalas como "verificar contra CVE" sin inventar números.
- **Datos personales (Ley 25.326).** El sistema guarda PII de alumnos (menores incluidos), pagos y contratos. Evaluá:
  - **Exposición en respuestas de API**: ¿los DTOs de listado/portal devuelven más PII de la necesaria? ¿un endpoint devuelve el teléfono/email de terceros a quien no corresponde? (se cruza con IDOR).
  - **Cifrado en reposo y en tránsito**: qué hay hoy (nada, probablemente, en `localhost`) y qué exige el deploy — al menos TLS terminado en el proxy.
  - **Retención y baja**: el esquema no borra nada nunca. Eso es bueno para auditoría e íntegro para el negocio, pero la Ley 25.326 da derecho de supresión. No es un bug de código, pero es una obligación legal a nombrar: ¿hay algún mecanismo (aunque sea manual/operativo) para atender un pedido de baja de datos?
  - **Landing**: política de privacidad y aviso de cookies. La auditoría de agosto tocó la landing (SEO/veracidad); revisá específicamente si existe la política de privacidad que la Ley exige para un formulario que recolecta datos personales.

## Fase 8 — Operación y respuesta

- **Qué pasa cuando algo sale mal.** ¿Hay logging suficiente para reconstruir un incidente? ¿El healthcheck (`/actuator/health`) y el monitoreo permiten notar que algo está caído o siendo atacado?
- **Backup y restore ante ransomware/borrado.** `docs/operacion.md` describe backup/restore de la base y los archivos. Evaluá desde seguridad: ¿los backups están fuera del alcance de quien compromete el VPS? ¿el restore está ensayado con TODOS los tipos de archivo (la propia doc admite que comprobantes de pago y de egreso nunca se probaron)?
- **Rotación de secretos post-deploy.** ¿El procedimiento para rotar `JWT_SECRET` y la contraseña de Postgres existe y es ejecutable? (rotar el JWT invalida todas las sesiones — que esté dicho).

## Fase 9 — Lo que yo no te pedí

Cerrá con hallazgos de seguridad fuera de las categorías anteriores: cualquier cosa que un pentester con criterio marcaría y que este prompt no anticipó (condiciones de carrera en pagos/reservas explotables, lógica de negocio salteable que tenga impacto de seguridad, cualquier "gadget" de deserialización, SSRF si algún endpoint hace fetch de una URL del usuario, etc.). Si no encontrás nada, decilo.

## Escala de severidad

| Nivel | Criterio |
|---|---|
| **Crítico** | Explotable hoy por un atacante remoto: RCE, robo de sesión, IDOR que expone PII de terceros, inyección con impacto, secreto real filtrado y usable. Bloquea el deploy. |
| **Alto** | Explotable bajo condiciones normales tras el deploy, o expone datos personales, o incumple la Ley 25.326 de forma material, o rompe el modelo de autorización. |
| **Medio** | Deuda de seguridad que va a costar caro: falta de defensa en profundidad (CSP en el panel, HSTS), validación floja, regresión de una mitigación previa. |
| **Bajo** | Endurecimiento, higiene, cabeceras faltantes de bajo impacto. |
| **Informativo** | Observación sin acción inmediata requerida. |

## Formato de salida

Escribí **un solo archivo**: `docs/auditoria/informe-ciberseguridad-2026-09.md`.

Estructura:

1. **Resumen ejecutivo** — máximo 15 líneas. Postura de seguridad general, los hallazgos que bloquean el deploy, una frase por fase. Escrito para quien no va a leer el resto.
2. **Tabla de conteo** por fase × severidad.
3. **Relación con la auditoría de agosto** — tabla corta: qué mitigación previa se revalidó y sigue en pie, cuál envejeció o regresó (con su ID original), y qué superficie nueva (post-`V6`) se audita por primera vez acá.
4. **Hallazgos**, agrupados por fase, cada uno con ID estable con prefijo nuevo para no colisionar con la auditoría de agosto — **`CS-01`, `CS-02`, …** (Cyber-Security) — y estos campos exactos:
   - Título en una línea
   - Severidad
   - Evidencia: `ruta:línea` + cita mínima
   - Qué pasa hoy (comportamiento observable, no teoría) — y si aplica, **el paso a paso del ataque** (qué manda el atacante, qué recibe)
   - Impacto concreto (técnico y, cuando corresponda, legal/PII)
   - Recomendación accionable y específica de este repo — el cambio mínimo que lo cierra
   - Esfuerzo estimado: XS / S / M / L
5. **Verificado y correcto** — lo que revisaste y está bien, con por qué lo verificaste. Da tanta información como los hallazgos: le dice a Ignacio qué NO tiene que volver a mirar.
6. **No verificado** — qué quedó fuera de alcance y qué haría falta para cubrirlo (levantar la app, dos cuentas de prueba, un scanner de dependencias, TLS real, datos productivos).
7. **Backlog priorizado** — ordenado por impacto/esfuerzo, dividido en: **bloqueantes del deploy** / **antes de exponer a internet** / **endurecimiento posterior**.

Escribí en **español rioplatense**, prosa técnica y directa. Sin relleno, sin repetir el enunciado del hallazgo en la recomendación, sin adjetivos de valor sobre el código, sin teatro de hacker. Un hallazgo bien escrito se puede arreglar leyéndolo una vez.

## Modo de ejecución

Ejecutá la Fase 0 completa y después las fases en orden. **Al terminar cada fase, imprimí en el chat un resumen de una línea por hallazgo (ID + título + severidad) antes de seguir**, para que pueda cortarte si vas en la dirección equivocada. Escribí el archivo final recién al terminar la Fase 9.

Si el contexto se te llena antes de terminar, no degrades: pará, escribí al informe lo que tengas con las fases pendientes marcadas explícitamente, y avisame qué fase falta para correrla en sesión nueva. Las fases 1 a 8 son en gran medida independientes una vez hecha la Fase 0; si podés lanzar sub-agentes en paralelo, hacelo por fase, pasándole a cada uno la Fase 0 (incluida la lista de decisiones deliberadas y la auditoría de agosto) como contexto y exigiéndole el mismo formato de hallazgo.

Una última cosa: **si un problema que esperabas encontrar no está —si el IDOR está bien tapado, si las nativas están todas parametrizadas, si el path traversal está cubierto— decilo con la misma claridad que un hallazgo.** Un "esto lo miré a fondo y está bien" tuyo vale, y en seguridad es la mitad del entregable.
