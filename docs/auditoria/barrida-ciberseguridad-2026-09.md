# Barrida de ciberseguridad — septiembre 2026

> **Estado: EN CURSO.** Fase 0 cerrada el 2026-09-23. **Fase 2 arrancada el
> 2026-09-24 y a mitad de camino (§8).** La 1 quedó cortada; las 3 a 9 sin
> ejecutar. **Este documento es el estado de la barrida, no su informe**: el
> informe final va a ser `docs/auditoria/informe-ciberseguridad-2026-09.md`, que
> todavía no existe y no hay que crear hasta terminar la Fase 9.
>
> **Si estás retomando esto en una sesión nueva, andá directo al bloque
> "DÓNDE RETOMAR" del final.** Lo de arriba es contexto que ya está resuelto.
>
> ---
>
> ## 📍 ESTE ES EL PUNTO DE ENTRADA DEL REPO MIENTRAS LA BARRIDA ESTÉ EN CURSO
>
> **Mientras el estado de arriba diga EN CURSO, éste es el primer documento que
> hay que leer en el proyecto — antes que `docs/mejoras.md` y antes que
> `docs/pendientes.md`.** Pedido de Ignacio el 2026-09-24.
>
> ⚠️ **Por qué, y costó una sesión:** los otros dos terminan diciendo —con
> razón— que **no queda producto por construir**, porque las catorce barridas de
> mejoras y la de responsive están cerradas. Quien los lee primero concluye *"no
> hay nada pendiente"*, que es falso: **el trabajo que queda se mudó acá y
> ninguno de los tres enlazaba al otro**. El 2026-09-24 una sesión entera arrancó
> por `mejoras.md`, sacó esa conclusión y se puso a cerrar una deuda vieja de
> §17 · H8 (real, pero no era lo pendiente). **Un documento completo sobre su
> propio alcance igual te manda para el lado equivocado cuando el alcance se
> mudó.**
>
> **El cableado quedó hecho ese mismo día** y hay que mantenerlo: `CLAUDE.md`
> manda acá en su bloque *WHERE TO RESUME*, y `mejoras.md` y `pendientes.md`
> tienen un cartel arriba de todo que apunta acá. ⚠️ **Cuando esta barrida
> cierre, hay que sacar los tres**, o el próximo va a venir a buscar trabajo
> terminado — que es este mismo error con el signo cambiado.

---

## 0. Qué es esto y por qué existe

Ignacio da el sistema por terminado en funcionalidad —los ocho módulos, la Fase 3
de rediseño y catorce barridas de mejoras están cerradas— y quiere el cierre
final antes del deploy de octubre: **ciberseguridad, optimización y deploy**.
Esta es la primera de las tres.

El encargo está escrito en **`prompt-ciberseguridad-lajuanita.md`, en la raíz del
repo**. Ese archivo es la fuente del alcance, las reglas y el formato de salida;
este documento no lo reemplaza ni lo resume: registra **qué se hizo, qué se
decidió y qué falta**.

> ⚠️ **Corregido el 2026-09-24: el prompt YA ESTÁ COMMITEADO** —entró en
> `36ba4f4 "Documentacion"`—, así que la mitad de este aviso envejeció. Lo que
> sigue siendo cierto es que **está en la raíz y no en `docs/auditoria/`**, donde
> viven sus dos hermanos (`prompt-auditoria-lajuanita.md` y
> `prompt-remediacion-lajuanita.md`). Conviene moverlo: es la convención que el
> propio repo estableció en agosto. **No se movió sin permiso**, porque la regla 1
> del encargo prohíbe modificar nada. (Verificado con `git log` antes de
> corregirlo, no de memoria — es la lección de `pendientes.md` §3.5, donde una
> entrada mintió sobre sí misma trece días.)

### La regla que gobierna esta barrida

**Es de solo lectura.** El único archivo que se escribe es el informe final (y
este documento de estado, que Ignacio pidió expresamente el 2026-09-23). Si algo
es trivial de arreglar, **va al informe, no al archivo**. Nada de código,
migraciones, configuración ni docs se toca durante la barrida.

---

## 1. La diferencia con la auditoría de agosto

No se arranca de cero. `docs/auditoria/informe-auditoria-2026-08.md` ya auditó
seguridad (sección **3.3 SEC**, nueve hallazgos) y su remediación **se dio por
cerrada el 2026-08-15** con 56 de 61 hallazgos resueltos.

El trabajo de esta barrida con ese documento es **doble**:

1. **No repetir lo resuelto.** Levantar de nuevo SEC-02 o SEC-07 como hallazgos
   nuevos es ruido.
2. **Verificar que la mitigación siga viva.** Una defensa escrita en agosto puede
   haber quedado sin efecto por el código de septiembre. **Esa es la parte que
   más valor tiene y la más fácil de saltear.**

Si un hallazgo viejo reabrió, se reporta **citando su ID original** ("regresión
de SEC-01"), no como descubrimiento.

Los IDs nuevos llevan prefijo **`CS-nn`** (Cyber-Security) para no colisionar con
los `SEC-nn`, `DB-nn`, `ARQ-nn`, `QA-nn`, `DOC-nn`, `SEO-nn` y `EXT-nn` de
agosto.

---

## 2. Fase 0 — Contexto · CERRADA (2026-09-23)

### 2.a — Lo que agosto dio por cerrado: a revalidar, no a repetir

| ID | Qué era | Mitigación que hay que encontrar viva |
|---|---|---|
| **SEC-01** | El candado del secreto JWT dependía de un perfil `prod` que nada activaba | `lajuanita.jwt.permitir-secreto-de-desarrollo`, que falla cerrado. **Ver §5: esta es la que se sospecha envejecida** |
| **SEC-02** | Login y registro sin límite de intentos y **sin ningún log** | `FiltroDeFrecuencia` (por IP, antes de la cadena de Security) + límite por email en `SesionService` + `RegistroDeEventos` bajo el logger `seguridad` |
| **SEC-03** | No existía ningún camino para resetear una contraseña | `POST /api/usuarios/{id}/password-temporal`, con `@PuedeOperar` y pasando por `verificarQuePuedeTocarEstaCuenta` |
| **SEC-04** | Un ADMIN podía quitarse el rol a sí mismo | `editar()` recibe el id del solicitante y rechaza el cambio de rol sobre uno mismo |
| **SEC-05** | El front no implementaba el eje de escritura | `puedeOperar` / `puedeAdministrar` en `menu.ts`, usados para el menú **y** para gatear las rutas |
| **SEC-06** | El registro confirma si un **teléfono** ya tiene cuenta | ⚠️ **Es el único SEC sin bloque de "Remediado" en el informe de agosto.** Verificar contra el código si se cerró, se decidió o quedó colgado |
| **SEC-07** | Ninguna app declaraba CSP ni cabeceras propias | Landing: bloque `headers()` en `next.config.ts`. Panel: CSP en un `<meta>` inyectado **solo en el build** por un plugin de `vite.config.ts`. `frame-ancestors` y HSTS quedaron para el proxy (`operacion.md` §3, punto 5) |
| **SEC-08** | BCrypt en costo 10 y la temporal no vencía nunca | `BCryptPasswordEncoder(12)` + `password_temporal_desde` (`V8`), 7 días |
| **SEC-09** | `Busqueda` escapaba comodines y ninguna consulta declaraba `ESCAPE` | Las seis cláusulas `LIKE` declaran `ESCAPE '\'` y la constante se borró |

**Riesgos que agosto dejó explícitamente asumidos** (§5 del informe) y que **no
son hallazgos** salvo que hayan cambiado de naturaleza: secreto JWT commiteado,
comparación BCrypt señuelo, `/error` y `/actuator/health` en `permitAll`, sin
CSRF (la credencial va en header, no en cookie), token en `localStorage` con
vencimiento de 8 h y sin revocación, el registro confirmando el email, y que
nada se borra físicamente en el esquema.

### 2.b — La superficie nueva: lo que nunca pasó por seguridad

Todo lo posterior a `V6` (la migración que cerró agosto) es superficie no
auditada. **Son 30 migraciones —de `V7` a `V36`— y 19 de los 25 paquetes del
backend.**

Los paquetes que no existían o no fueron revisados en agosto:

```
portal/     docencia/    archivo/     mastering/   sello/
solicitante/ bandeja/    cliente/     tablero/     aviso/
programa/   venta/       dinero/      notificacion/ solicitud/
reserva/    sala/        inscripcion/ pago/
```

Lo que el encargo marca como corazón de la barrida, por orden de peso:

1. **Dos portales autenticados** (`portal/` del alumno, `docencia/` del profesor)
   donde cada uno ve *lo suyo* — terreno natural del IDOR.
2. **Subida y descarga de archivos** (`archivo/`): contratos del sello,
   comprobantes de pago y de egreso, portadas.
3. **Exportación a Excel y PDF** (`tablero/informe/`) con datos que entran por
   formularios públicos → CSV/Formula Injection.
4. **Mix & Mastering, Sello, Buzón** — endpoints nuevos con reglas propias.
5. **Las consultas nativas.**
6. **`POST /api/solicitantes`** — el único endpoint público que escribe en la
   base, llamable por cualquiera en internet.

### 2.c — La medición, que corrigió tres números del encargo

⚠️ **Este proyecto ya pagó cuatro veces que un número salido de un grep no es una
medición** (`CLAUDE.md`, §26). Así que los números del prompt se contaron contra
el repo antes de usarlos:

| | El prompt decía | Medido el 2026-09-23 |
|---|---|---|
| Controllers | ~29 | **28** |
| Mappings (`@Get/Post/Put/Patch/DeleteMapping`) | ~148 | **148** ✅ |
| Migraciones | "entre `V6` y `V36`" | **36 en total, `V36` la última** ✅ |
| Consultas nativas | "~30" en un lado, "~20" en otro | **20** (`nativeQuery = true`); **0** `createNativeQuery` |
| Paquetes del backend | — | **25** |

Los comandos, para repetir la medición:

```bash
find apps/backend/src/main/java -name '*Controller.java' | wc -l
grep -rhoE "@(Get|Post|Put|Patch|Delete)Mapping" --include=*.java apps/backend/src/main/java | wc -l
ls apps/backend/src/main/resources/db/migration/ | sort -V
grep -rn "nativeQuery = true" --include=*.java apps/backend/src/main/java | wc -l
```

---

## 3. Decisión sobre herramientas: qué skill se usa y qué parte de ella

Ignacio pidió instalar y usar una skill si servía. Se buscaron con
`npx skills find` y se instalaron dos. **La decisión fue usar una a medias y
descartar la otra como guía**, y el porqué importa más que el qué:

### `ghostsecurity/skills@ghost-scan-code` — se usan sus criterios, NO su pipeline

Instalada en `~/.agents/skills/ghost-scan-code/`.

- **Lo que NO se usa: el orquestador.** `SKILL.md` define un pipeline de
  sub-agentes (planner → nominator → analyzer → verifier vía `scripts/loop.sh`)
  que escribe su propio formato en `~/.ghost/repos/`. **Esos sub-agentes
  arrancarían sin la Fase 0**, así que reportarían como hallazgos las cuatro
  cosas que el encargo dice explícitamente que son decisiones deliberadas: el
  secreto JWT commiteado, `/error` en `permitAll`, la ausencia de CSRF y el token
  en `localStorage`. Sería exactamente el "pensá como linter" que el prompt
  prohíbe, en inglés y en otro formato.
- **Lo que SÍ se usa: `criteria/*.yaml`.** Es la parte valiosa. Cada vector trae
  condiciones de triage que son mejores que las de memoria, en particular para la
  Fase 2:
  - *"El identificador que determina el recurso viene del input del usuario — no
    derivado server-side de la sesión, los claims del JWT o un lookup del token"*
  - *"El recurso es privado de un usuario o tenant — no datos de referencia
    compartidos, entradas de catálogo ni documentos idénticos para todos"*
  - *"El camino vulnerable es alcanzable remotamente por HTTP sin requerir acceso
    directo al server, al contenedor o al filesystem"*

  Esas tres condiciones son lo que separa un IDOR real de un falso positivo, y
  son el criterio con el que hay que filtrar los ~148 mappings.

**Cinco vectores que su taxonomía trae y el prompt no nombra** — van a la Fase 9
("lo que yo no te pedí"):

| Vector | Dónde mirar en este repo |
|---|---|
| `sourcemap-exposure` | ¿El build de Vite (`apps/platform/dist`) y el de Next publican sourcemaps? Publicarlos entrega el código fuente del panel |
| `missing-sri` | Subresource Integrity en cualquier script de tercero de la landing |
| `client-open-redirect` | Cualquier redirect que tome destino de un parámetro |
| `debug-endpoints` | Más allá de `/actuator/health`; también el plugin de CSP de Vite, que se comporta distinto en dev |
| `zip-slip` | Solo si algo descomprime archivos subidos (a verificar: probablemente no aplica) |

### `affaan-m/ecc@springboot-security` — instalada y descartada como guía

Es una lista de buenas prácticas genérica de Spring Security. Este backend ya
está por encima de casi todo lo que pide, y sus recomendaciones empujan a
reportar CSRF deshabilitado y el secreto commiteado — las dos decisiones
deliberadas. **Queda solo como contra-chequeo del checklist final**, no como
driver de ninguna fase.

---

## 4. Estado por fase

| Fase | Qué cubre | Estado | Hallazgos |
|:--:|---|---|:--:|
| **0** | Contexto: auditoría de agosto, decisiones deliberadas, medición de la superficie | ✅ **CERRADA** 2026-09-23 | — |
| **1** | Autenticación y sesión | ⛔ **NO EJECUTADA** — ver §5 | — |
| **2** | Autorización, IDOR y multi-tenencia — **máxima prioridad** | 🔄 **EN CURSO** 2026-09-24 — ver §8 | 0 hasta ahora |
| **3** | Manejo de archivos: path traversal, tipo, acceso | ⬜ pendiente | — |
| **4** | Inyección: SQL y fórmulas (CSV injection en las exportaciones) | ⬜ pendiente | — |
| **5** | Entrada, DTOs y superficie pública | ⬜ pendiente | — |
| **6** | Transporte, cabeceras y CORS de cara al deploy | ⬜ pendiente | — |
| **7** | Secretos, dependencias y datos personales (Ley 25.326) | ⬜ pendiente | — |
| **8** | Operación y respuesta a incidentes | ⬜ pendiente | — |
| **9** | Fuera de las categorías anteriores | ⬜ pendiente | — |

**Las fases 1 a 8 son en gran medida independientes una vez hecha la Fase 0.** Se
pueden correr en el orden que convenga, o en sesiones distintas, siempre que cada
una arranque con §2 y §3 de este documento como contexto.

---

## 5. La Fase 1 quedó sin ejecutar, y lo que se abrió en ella

**El 2026-09-23 Ignacio la cortó a mitad** (*"nono no hagas la 1"*) para preservar
contexto. **No cuenta como hecha**: de la Fase 1 solo se abrieron cinco archivos,
y las verificaciones que el encargo pide —token manipulado, sin firma, firmado
con otra clave; el flujo de la temporal en los caminos nuevos; si algún portal
guarda estado de sesión que contradiga el modelo stateless— **no se hicieron**.

Lo que sí se leyó, que sirve como punto de partida y no hay que volver a abrir:

- `config/SeguridadConfig.java` (completo)
- `config/PropiedadesJwt.java` (completo)
- `config/FiltroDeFrecuencia.java` (completo)
- `apps/backend/src/main/resources/application.properties`
- `docker-compose.yml`
- `README.md` §"Antes de desplegar esto en algún lado" (líneas 226-256)
- `docs/operacion.md` §3 "Deploy"

### Pista sin confirmar — candidata a `CS-01`

> ⚠️ **Esto NO es un hallazgo todavía.** Está acá para que la Fase 1 arranque por
> ahí, no para que se copie al informe. Necesita que alguien complete la
> verificación: reproducir el arranque con el jar empaquetado y sin `JWT_SECRET`.

**Título provisorio:** regresión de SEC-01 — el candado del secreto JWT falla
**abierto** en la forma de deploy decidida.

**Lo que se observó.** El javadoc de la defensa
(`config/SeguridadConfig.java:110-126`) justifica el candado así:

> *"el secreto commiteado solo se acepta si alguien lo autorizó explícitamente, y
> ese permiso vive en el `application.properties` del repo — **que es exactamente
> lo que un deploy no copia**"*

Esa premisa es la que hay que atacar: **el deploy decidido es Docker Compose**
(`operacion.md:347-352`), y un jar de Spring Boot **empaqueta**
`src/main/resources/application.properties` adentro del artefacto. El permiso no
se queda en el repo: viaja con la imagen.

La tabla de verdad, que es lo que hay que confirmar corriéndolo:

| `JWT_SECRET` | La línea `permitir-secreto-de-desarrollo=true` | Resultado esperado |
|---|---|---|
| definido | presente | arranca, firma con el secreto propio — **bien** |
| definido | borrada | arranca, firma con el secreto propio — **bien** |
| **sin definir** | **borrada** | **no arranca** — es el caso que la defensa busca |
| **sin definir** | **presente** | **arranca y firma con la clave pública** ← el agujero |

**Y la documentación empeora el caso en vez de cubrirlo.** La tabla de
`operacion.md:358` junta dos olvidos en una sola fila:

> | Si te olvidás de… `JWT_SECRET` (valor **nuevo**) **y borrar**
> `lajuanita.jwt.permitir-secreto-de-desarrollo` | **La aplicación no arranca.**
> Es a propósito y falla cerrado |

Describe la consecuencia del **caso bueno**. Olvidarse solo de `JWT_SECRET` —que
es el olvido probable, porque todo el resto del deploy son variables de entorno y
esta es la única fila de la tabla del README que pide **editar un archivo
versionado**— arranca perfecto con la clave publicada. Y el párrafo siguiente
dice que *"la primera se descubre sola"*, que sería falso.

**Por qué es una regresión y no un hallazgo nuevo.** El texto de SEC-01 de agosto
criticaba el candado anterior con esta frase exacta: *"el escenario que hay que
atrapar es el del que se olvidó de configurar algo, y el candado exige haber
configurado otra cosa"*. El candado nuevo exige **desconfigurar** algo. Es el
mismo defecto con el signo cambiado, y solo se ve mirando la forma del deploy,
que en agosto todavía no estaba decidida.

**Severidad tentativa: Alto.** No abre un agujero por sí mismo —requiere un error
del operador— pero elimina la red que existe justamente para ese error, y la
consecuencia del error es crítica: con el secreto público se fabrica un token de
`ADMIN` sin saber ninguna contraseña.

**Recomendación tentativa (a validar en la Fase 6, que es donde cae el deploy):**
el `Dockerfile` del backend **no existe todavía** (`operacion.md:382-384` lo
lista como pendiente), así que el arreglo sale gratis y no toca el repo de
desarrollo: que la imagen declare
`ENV LAJUANITA_JWT_PERMITIR_SECRETO_DE_DESARROLLO=false`. El artefacto viaja
cerrado con candado, un clone fresco sigue arrancando con `mvn spring-boot:run`,
y la defensa deja de depender de que alguien se acuerde de borrar una línea.
**Esfuerzo: XS.**

### Lo otro que quedó anotado de la Fase 1

- **El límite por IP vigila cuatro rutas** (`FiltroDeFrecuencia:42-51`):
  `/api/auth/login`, `/api/auth/registro`, `/api/me/password` y
  `/api/solicitantes`, **solo POST**. Falta contrastarlo con las rutas nacidas
  después de agosto — lo que el encargo pregunta textualmente: *"¿sigue cubriendo
  TODAS las rutas sensibles, incluidas las nacidas después (portales, mastering,
  sello)?"*.
- **El límite por IP se apaga durante `mvn test`** desde el `pom.xml`
  (`intentos-por-ip`, default 120). El de email queda activo. Hay que tenerlo
  presente al interpretar cualquier test de la suite como evidencia.

---

## 6. Convenciones de salida, para que el informe salga igual en cualquier sesión

- **Un solo archivo final:** `docs/auditoria/informe-ciberseguridad-2026-09.md`.
  **No crearlo hasta terminar la Fase 9**, salvo que haya que cortar por
  contexto, en cuyo caso se escribe lo que haya **con las fases pendientes
  marcadas explícitamente**.
- **IDs `CS-01`, `CS-02`, …** correlativos, sin reiniciar por fase.
- **Campos exactos de cada hallazgo:** título en una línea · severidad ·
  evidencia (`ruta:línea` + cita mínima) · qué pasa hoy (con el paso a paso del
  ataque si aplica) · impacto concreto (técnico y legal/PII) · recomendación
  accionable y específica de este repo · esfuerzo (XS/S/M/L).
- **Escala:** Crítico (explotable hoy, bloquea el deploy) · Alto (explotable tras
  el deploy, o expone datos personales, o rompe el modelo de autorización) ·
  Medio (deuda que va a costar caro, regresión de una mitigación) · Bajo
  (endurecimiento) · Informativo.
- **Secciones del informe:** resumen ejecutivo (≤15 líneas) · tabla de conteo por
  fase × severidad · **relación con la auditoría de agosto** · hallazgos por fase
  · **verificado y correcto** · **no verificado** · backlog priorizado en tres
  bloques (bloqueantes del deploy / antes de exponer a internet / endurecimiento
  posterior).
- **Español rioplatense**, prosa técnica y directa. Sin teatro de hacker.
- ⚠️ **"Verificado y correcto" vale tanto como los hallazgos.** El encargo lo pide
  explícitamente: *"si el IDOR está bien tapado, si las nativas están todas
  parametrizadas, decilo con la misma claridad que un hallazgo"*. Le dice a
  Ignacio qué **no** tiene que volver a mirar.
- ⚠️ **Un hallazgo afirmado sin evidencia es peor que uno omitido.** Está
  permitido y es deseable escribir *"no verificado: requiere levantar la app /
  dos cuentas de prueba"*.

---

## 7. Lo que esta barrida NO va a poder cerrar

Decidido con Ignacio antes de arrancar, el 2026-09-23:

- **Es estática.** El IDOR se sigue hasta la query leyendo el código, **no se
  prueba con dos cuentas**. Todo lo que solo se pueda afirmar con la app
  levantada va a la sección "No verificado" con el procedimiento para cubrirlo.
  La confirmación en caliente, si se quiere, es otra sesión.
- **La parte legal se nombra, no se dictamina.** La Ley 25.326 se trata como
  obligación a nombrar (falta política de privacidad, no hay mecanismo de
  supresión), no como opinión jurídica.
- **Las dependencias necesitan red.** `npm audit` y `mvn dependency:tree` salen a
  internet. Ignacio no objetó, pero si en alguna sesión no se quiere tráfico
  saliente, se listan las versiones y se marcan como "verificar contra CVE" sin
  inventar números.


---

## 8. Fase 2 — autorización e IDOR · EN CURSO (arrancada 2026-09-24)

**Cero hallazgos hasta acá, y eso es un resultado, no una fase vacía.** Todo lo
de abajo va a *"Verificado y correcto"* del informe: le dice a Ignacio qué **no**
tiene que volver a mirar.

### 8.a — La enumeración, y el número que había que corregir

⚠️ **Son 147 mappings, no 148.** El conteo de la Fase 0 salió de un `grep` sobre
`--include=*.java` de todo el backend, y **una de las 148 ocurrencias es una
mención en un javadoc**: `profesor/ProfesorService.java:23`, la frase que cuenta
que `ProfesorController` *"tenía un único `@GetMapping`"* hasta que P77 le puso
el alta. **Sexta vez en este proyecto que un número de un grep no era una
medición.** Los 28 controllers sí están bien contados.

| | Mappings |
|---|---:|
| Con regla de rol explícita | **112** |
| — de ésos, `@PuedeOperar` | 65 |
| — `@PuedeLeerAdministracion` | 44 |
| — `@PuedeVerElTableroCompleto` | 3 |
| — `@PreAuthorize` | **0** |
| Sin anotación → caen en `anyRequest().authenticated()` (`SeguridadConfig:220`) | **35** |
| **Total real** | **147** |

⚠️ **Los tres números de la izquierda también hubo que medirlos dos veces, y es
el mismo error otra vez.** El `grep` de las anotaciones sobre `*Controller.java`
devuelve **70 · 49 · 1**; las que están **pegadas a un mapping** son **65 · 44 ·
0**. La diferencia son **los `import` —uno por archivo— y las menciones en
javadoc**, que en este repo son muchas porque cada controller explica por qué
eligió una y no la otra. Contadas crudas, dan un total de 123 anotaciones para
112 mappings anotados.

✅ **Y eso deja un resultado con nombre propio: este backend no tiene un solo
`@PreAuthorize` en código.** La única ocurrencia es una línea de javadoc en
`docencia/DocenciaController.java:47` que explica **por qué no sirve** — *"es una
relación, no un permiso (§2.1), así que un `@PreAuthorize` no puede"*. Todo el
eje de permisos pasa por las tres meta-anotaciones, que es exactamente la
propiedad que `CLAUDE.md` declara (*"mantener la regla en dos lugares en vez de
`@PreAuthorize` sueltos es lo que hace exigible el modelo de cuatro roles"*).
**Confirmada viva.**

⚠️ **Y un descuadre del propio método, anotado porque se repite:** el script que
pega anotaciones con firmas veía 146 y no 147. El que faltaba es
`TableroController:97`, un `@GetMapping(value = "/exportacion.xlsx", produces =
"…")` **partido en dos líneas**: la segunda no empieza con `@`, así que cortaba
el bloque. **No era un agujero — tiene `@PuedeVerElTableroCompleto`.** La regla
para quien siga: un parser de anotaciones que no contemple la anotación
multilínea **subcuenta en silencio**, que es la dirección peligrosa acá (una
ruta sin regla que no aparece en la lista de rutas sin regla).

### 8.b — Las 35 sin anotación, abiertas una por una

No son 35 agujeros. Abiertas una por una, dan exactamente dos grupos:

- **3 son públicas por regla de ruta** (`SeguridadConfig:204-206`), y son
  decisiones deliberadas que agosto ya dejó asumidas: `POST /api/auth/login`,
  `POST /api/auth/registro` y `POST /api/solicitantes` — la única escritura
  pública del sistema.
- **32 cuelgan de `/api/me/**`**: `portal/` 17, `docencia/` 11, `auth/MeController`
  3 (`GET /api/me`, `POST /api/me/password`, `PUT /api/me/perfil`) y
  `mastering/MasteringDelPortalController` 1. **Ahí la ausencia de anotación es
  el diseño, no un olvido**: la identidad sale del `sub` del token, y ninguna
  anotación de rol puede decidir *"lo mío"*. Es lo que el Módulo 4 dejó escrito
  —*"no hay `@PuedeVerLoSuyo`; un alcance que se puede olvidar no es un
  alcance"*— y lo que había que confirmar vivo.

⚠️ **`OPTIONS /**`, `/error` y `/actuator/health` NO están en estos 35**, aunque
también son `permitAll`: no son mappings de ningún controller. Siguen siendo
decisiones asumidas de agosto, pero contarlas acá inflaría el denominador.

### 8.c — Los siete que sí reciben un id, seguidos hasta la query

**Ésta es la superficie de IDOR real** — los únicos `/api/me/**` donde un
identificador viaja por la URL. Filtrados con los tres criterios de
`ghost-scan-code` (§3), los siete califican como candidatos legítimos: el id
viene del input, el recurso es privado de una persona y el camino es alcanzable
por HTTP. **Los siete están correctamente acotados.**

| Endpoint | Dónde se corta | Verificado |
|---|---|:--:|
| `GET /api/me/comprobantes/{id}` | `ComprobanteRepository.mioPorId` — `WHERE c.id = :id AND c.pago.usuario.id = :idUsuario` | ✅ |
| `PATCH /api/me/solicitudes/{id}/cancelacion` | `SolicitudService.cancelar` — `.filter(s -> s.getUsuario().getId().equals(idQuienPide))` | ✅ |
| `PATCH /api/me/notificaciones/{id}/lectura` | `marcarLeida` — `.filter(n -> n.getDestino().getId().equals(idUsuario))` | ✅ |
| `GET /api/me/profesor/alumnos/{idAlumno}/notas` | `miDocencia` + `verificarQueEsMiAlumno` | ✅ |
| `PUT /api/me/profesor/alumnos/{idAlumno}/seguimiento` | `miDocencia` + `verificarQueEsMiAlumno` | ✅ |
| `PUT /api/me/profesor/notas/{idNota}` | `NotaProfesorRepository.suya(idNota, yo.getId())` | ✅ |
| `PATCH /api/me/profesor/materiales/{idMaterial}/visibilidad` | `MaterialRepository.suyo(idMaterial, yo.getId())` | ✅ |

⚠️ **Dos detalles que valen más que el ✅, porque son lo que se rompe al
refactorizar:**

**(1) El corte va ANTES de la regla de negocio, y ese orden es el que no
confirma nada.** En `cancelar`, el `.filter` de propiedad corre antes del
`estaPendiente()`. Invertidos, pedir cancelar la solicitud de otro contestaría
*"esa solicitud ya fue resuelta"* — que es un **oráculo de existencia**: no deja
hacer nada, y confirma que la fila está ahí y en qué estado. Los tres del portal
contestan *"no existe"*, que es la respuesta que el Módulo 4 fijó.

**(2) `mioPorId` deja afuera los pagos sin cuenta, y está bien.** `c.pago.usuario.id`
navega una relación, o sea **INNER JOIN implícito** — la trampa que `V19`
documenta y que costó siete casos rojos en su momento. Desde `V19` un pago puede
no tener cuenta, y esos quedan fuera de la consulta por la comparación misma: un
pago a nombre escrito no es de nadie del portal. **El javadoc ya lo dice**, o sea
que no es una coincidencia afortunada.

### 8.d — La excepción documentada: verificada y bien puesta

`DocenciaDelAlumnoService` salta a propósito `miDocencia` y
`verificarQueEsMiAlumno`, porque administración no es profesor de nadie (§8 del
alcance: *"sus notas privadas… **Administración sí**"*). Había que confirmar que
no fuera alcanzable por un profesor: **lo es sólo por administración**. Su
controller vive en `/api/alumnos/{idAlumno}` —**fuera de `/api/me/**`**— y sus
dos mappings llevan `@PuedeLeerAdministracion`.

Que Ghezz —STAFF **y** profesor— sí pueda leer por ahí las notas de otro profesor
**no es un hallazgo: es la regla**. Lo decide su rol, no su relación.

### 8.e — Lo que le falta a la Fase 2 para cerrar

1. **Contrastar los 112 anotados contra la matriz de `platform.md`.** Lo hecho
   responde *"¿tiene regla?"*; falta *"¿es la regla correcta?"* — un
   `@PuedeLeerAdministracion` donde correspondía `@PuedeOperar` tiene regla y
   está mal.
2. **`GET /api/me/catalogo`** — no recibe id, pero hay que confirmar que devuelve
   catálogo compartido (salas, tipos de uso) y ninguna fila privada. Por los
   criterios de `ghost-scan-code` un catálogo no es recurso privado, pero eso hay
   que verlo, no asumirlo.
3. **El lado de administración**: que SEC-04 siga vivo
   (`verificarQuePuedeTocarEstaCuenta`, nadie se saca a sí mismo) y la superficie
   IDOR de los controllers de admin, donde el id **sí** viaja por la URL por
   diseño y lo que protege es el rol.
4. ~~El único `@PreAuthorize` suelto del backend~~ — **cerrado acá mismo: no
   existe.** Era una mención en javadoc; ver §8.a.

---

## DÓNDE RETOMAR

**Fase 0 cerrada. Fase 2 a mitad de camino (§8), con CERO hallazgos hasta acá.
Nada escrito todavía en el informe final.**

⚠️ **El próximo paso ya no es "empezar la Fase 2" sino terminarla: la lista
exacta de lo que le falta está en §8.e.** Lo que ya está verificado —la
enumeración de los 147 mappings, las 35 sin anotación abiertas una por una y
los siete endpoints con id seguidos hasta su query— **no hay que rehacerlo**.

Para arrancar una sesión nueva:

1. **Leer este documento entero** (es el contexto de la Fase 0, ya destilado) y
   **`prompt-ciberseguridad-lajuanita.md` de la raíz** (el encargo completo:
   reglas, fases, formato).
2. **No hace falta releer `docs/auditoria/informe-auditoria-2026-08.md`** salvo
   para un hallazgo puntual: §2.a de acá tiene los nueve SEC con su mitigación.
3. **No hace falta releer `CLAUDE.md`**: se carga solo y ya trae la historia de
   módulos y las barridas.

**El próximo paso es la Fase 2 — autorización, IDOR y multi-tenencia.** Es la de
máxima prioridad del encargo y la que cubre la superficie más nueva. Lo que pide,
concretamente:

- **Enumerar los 28 controllers y sus 148 mappings** y, para cada uno, quién
  puede llamarlo según `@PreAuthorize` / `@PuedeOperar` /
  `@PuedeLeerAdministracion` / `@PuedeVerElTableroCompleto`, contrastado con la
  matriz de `docs/requirements/platform.md`.
- **Marcar todo mapping sin regla explícita**, que cae en
  `anyRequest().authenticated()` (`SeguridadConfig:220`) — es decir: **cualquier
  usuario logueado, incluido un alumno**. Es la falla más probable en los módulos
  nuevos.
- **Los testigos que el encargo nombra por su nombre:**
  `PortalController.miComprobante(id)`, `PortalController.cancelarSolicitud(id)`,
  `marcarLeida(id)`, `DocenciaDelAlumnoController.notas(idAlumno)` y
  `materiales(idAlumno)`. La pregunta para cada uno: *¿un alumno autenticado puede
  pasar el id de OTRO y leer sus notas, su comprobante, su ficha?*
  **Seguir el hilo hasta la query, no asumir en ninguna dirección.**
- **Filtrar con los tres criterios de `ghost-scan-code`** (§3 de este documento),
  para no inflar la fase con falsos positivos.

Dos cosas que el propio repo ya documenta y que conviene tener presentes al
juzgar, porque son defensas reales que hay que confirmar vivas:

- **`PortalService` no tiene ninguna consulta capaz de devolver filas de otro**:
  el id sale del `sub` del token y ningún endpoint de `/api/me/**` toma una
  identidad. Si eso sigue siendo cierto, es material para "Verificado y
  correcto", no para un hallazgo.
- **"Ser profesor" es una relación, no un rol**: ningún `@PreAuthorize` puede
  decidirlo, y `DocenciaService` va a buscar la fila. Su propiedad declarada es
  que *todo* pasa por `miDocencia` y `verificarQueEsMiAlumno`. **La excepción
  documentada es `DocenciaDelAlumnoService`**, que salta los dos a propósito
  porque administración no es profesor de nadie — hay que verificar que esa clase
  esté detrás de `@PuedeLeerAdministracion` y no alcanzable por un profesor.

**Dejado explícitamente para después, sin perder:** la Fase 1 completa, con la
candidata `CS-01` de §5 como primer paso.
