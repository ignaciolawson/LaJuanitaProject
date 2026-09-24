# Barrida de ciberseguridad — septiembre 2026

> **Estado: las NUEVE FASES están CERRADAS y el informe está escrito.** No queda
> ninguna fase por recorrer. Lo único pendiente son **confirmaciones en caliente
> opcionales**, listadas con su procedimiento en la §6 del informe.
>
> **Siete hallazgos: `CS-01` y `CS-03` (Altos; el segundo, bloqueante del
> deploy), y `CS-02`, `CS-04`, `CS-05`, `CS-06` y `CS-07` (Medios)**, más cinco
> entre bajo e informativo (`CS-08`–`CS-12`).
>
> ➡️ **El entregable es
> [`informe-ciberseguridad-2026-09.md`](informe-ciberseguridad-2026-09.md).**
> **Este documento es el estado de la barrida, no su informe**: es la cocina —
> qué se midió, con qué evidencia y qué se decidió en el camino.
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
| **1** | Autenticación y sesión | ✅ **CERRADA** 2026-09-24 — §12 y §17 | **1** (`CS-03`, Alto) |
| **2** | Autorización, IDOR y multi-tenencia — **máxima prioridad** | ✅ **CERRADA** 2026-09-24 — §8 | **1** (`CS-01`, Alto) |
| **3** | Manejo de archivos: path traversal, tipo, acceso | ✅ **CERRADA** 2026-09-24 — §9 | 0 (+1 informativo) |
| **4** | Inyección: SQL y fórmulas (CSV injection en las exportaciones) | ✅ **CERRADA** 2026-09-24 — §10 | 0 (+1 bajo, +1 informativo) |
| **5** | Entrada, DTOs y superficie pública | ✅ **CERRADA** 2026-09-24 — §11 | **1** (`CS-02`, Medio) |
| **6** | Transporte, cabeceras y CORS de cara al deploy | ✅ **CERRADA** 2026-09-24 — §13 | **1** (`CS-04`, Medio) |
| **7** | Secretos, dependencias y datos personales (Ley 25.326) | ✅ **CERRADA** 2026-09-24 — §14 | **2** (`CS-05`, `CS-06`, Medios) |
| **8** | Operación y respuesta a incidentes | ✅ **CERRADA** 2026-09-24 — §15 | **1** (`CS-07`, Medio) |
| **9** | Fuera de las categorías anteriores | ✅ **CERRADA** 2026-09-24 — §16 | 0 (+1 informativo) |

**Las fases 1 a 8 son en gran medida independientes una vez hecha la Fase 0.** Se
pueden correr en el orden que convenga, o en sesiones distintas, siempre que cada
una arranque con §2 y §3 de este documento como contexto.

---

## 5. La Fase 1 quedó sin ejecutar ese día (⚠️ **YA NO**: se cerró el 2026-09-24 — su candidata es `CS-03`, §12, y el resto del checklist está en §17)

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

### Pista sin confirmar — candidata a hallazgo (⚠️ **ya NO es `CS-01`**: ese número lo tomó la Fase 2, §8.f. Toma el suyo al confirmarse)

> ✅ **YA SE CONFIRMÓ, el 2026-09-24: es `CS-03` y está redactada en la §12.**
> La verificación que este bloque pedía —empaquetar el jar y mirar si el permiso
> viaja adentro— se hizo, y **viaja**. Lo de abajo se conserva como quedó escrito
> el 2026-09-23, porque el razonamiento que llevó a sospecharlo sigue siendo
> válido; **el hallazgo redactado es el de la §12.**

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
  ✅ **Escrito el 2026-09-24, con las nueve fases CERRADAS.** No hizo falta usar
  la salida de emergencia que esta convención preveía (escribirlo con fases
  marcadas como pendientes): la Fase 1, que era la que faltaba, se cerró antes.
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

## 8. Fase 2 — autorización e IDOR · CERRADA (2026-09-24)

**Un hallazgo, `CS-01` (Alto, §8.f), y mucho material de "Verificado y
correcto"** — que el encargo pide con la misma claridad que un hallazgo, porque
le dice a Ignacio qué **no** tiene que volver a mirar.

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

### 8.f — 🔴 `CS-01` · La contraseña temporal abre los 32 endpoints del portal, no dos

**Severidad: Alto.** Confirmado por lectura; la confirmación en caliente es un
`curl` de dos minutos (procedimiento al final).

**Qué dice la defensa.** `config/AutenticacionDesdeBase.java:52-58` explica por
qué a quien debe cambiar la contraseña se le da una autoridad en lugar de su rol:

> *"Al no tener `ROLE_ADMIN` ni ninguno de los otros, no pasa ningún
> `@PreAuthorize` — pero sigue autenticada, así que puede usar `/api/me` para
> saber quién es y `/api/me/password` para arreglarlo. **Justo lo necesario para
> salir del estado, y nada más.**"*

**Qué pasa hoy.** Las dos primeras frases son ciertas; **la última no**. El
catch-all es `anyRequest().authenticated()` (`SeguridadConfig:220`) y **ningún
matcher cubre `/api/me/**`**. Un `JwtAuthenticationToken` con
`ROLE_PASSWORD_PENDIENTE` está autenticado, así que satisface el catch-all. La
cadena, entera, es estática y no depende de ningún dato:

1. `SeguridadConfig:204-219` sólo nombra rutas `permitAll`; ninguna regla toca
   `/api/me/**`.
2. Los **32** mappings de `/api/me/**` no llevan ninguna de las tres
   meta-anotaciones (§8.b).
3. Por lo tanto caen en `authenticated()`, que `ROLE_PASSWORD_PENDIENTE`
   satisface.

**No son dos endpoints: son 32** (20 GET · 5 POST · 4 PATCH · 3 PUT). Descontando
los dos abiertos a propósito, **quedan 30 alcanzables que no deberían serlo, y 11
de ellos escriben**:

| | Lo que puede hacer alguien con la temporal sin cambiar |
|---|---|
| **Leer lo suyo** | `GET /api/me/estado-de-cuenta` (pagos, deudas y saldos), `/cursos`, `/reservas`, `/mastering`, `/materiales`, `/notificaciones`, `/comprobantes/{id}` |
| **Escribir lo suyo** | `PUT /api/me/perfil`, `POST /api/me/solicitudes` (pedir sala), `POST /api/me/reprogramaciones`, `PATCH /api/me/solicitudes/{id}/cancelacion`, las dos de lectura de notificaciones |
| ⚠️ **Si además es profesor** | `GET /api/me/profesor/alumnos` (los alumnos, con su nivel y su semáforo), `POST /api/me/profesor/notas` y `PUT .../notas/{idNota}` (**escribir notas privadas sobre alumnos**), `PUT .../alumnos/{idAlumno}/seguimiento`, `POST .../materiales`, `PATCH .../materiales/{id}/visibilidad` |

**Por qué importa, y no es "total es su propia cuenta".** La temporal es
**deliberadamente una credencial débil**: la genera administración, la ve
Micaela, **viaja por WhatsApp** y vale 7 días (`V8`). Todo el sentido de
`debe_cambiar_password` es que esa credencial de bajo nivel de garantía **no
valga como acceso real hasta ser reemplazada**. Hoy vale por siete días para
todo el portal. Y por el tramo `/profesor` **alcanza datos de terceros**: quien
intercepte el WhatsApp de un profesor nuevo lee la lista de sus alumnos y puede
escribir notas privadas sobre ellos — que es exactamente lo que §8 del alcance
protege.

**Por qué es `CS-01` y no una regresión de agosto.** Agosto encontró que el
bloqueo *vivía sólo en el frontend* y que quien tenía la temporal **operaba
entero por API**. La corrección redujo la superficie de *todo el sistema* a
*los 32 del portal* — es una mejora real, no una regresión. Lo que quedó es
**una corrección parcial cuyo docstring se declara completa**, que es la forma
exacta que este proyecto ya encontró cinco veces.

⚠️ **Y los tests lo dejan pasar sin estar mal escritos.**
`CredencialVigenteTest.con_password_temporal_sin_cambiar_no_se_puede_operar_ni_por_api`
prueba `GET /api/alumnos` y el alta de alumno: **las dos son del eje de
administración**, donde el candado sí funciona. El caso hermano afirma que
`/api/me` y `/api/me/password` se alcanzan. **Ninguno de los dos mira los otros
30**, así que el nombre del caso —*"ni por API"*— promete más de lo que prueba.

**Recomendación.** Una regla de ruta en `SeguridadConfig`, **antes** del
`anyRequest()`, y no 32 anotaciones: el propio Módulo 4 ya argumentó que *"un
alcance que se puede olvidar no es un alcance"*, y acá olvidarla en un endpoint
nuevo del portal no falla en ningún lado.

```java
// Las dos únicas puertas de quien todavía no eligió contraseña. Exactas, no
// por prefijo: `/api/me/perfil` también cuelga de MeController y NO va acá.
.requestMatchers(HttpMethod.GET,  "/api/me").authenticated()
.requestMatchers(HttpMethod.POST, "/api/me/password").authenticated()
// Todo el resto del portal exige haber salido del estado.
.requestMatchers("/api/me/**").access((auth, ctx) -> new AuthorizationDecision(
        auth.get().getAuthorities().stream().noneMatch(a -> a.getAuthority()
                .equals(AutenticacionDesdeBase.AUTORIDAD_PASSWORD_PENDIENTE))))
```

⚠️ **Se pide por la AUSENCIA de la autoridad y no enumerando los cuatro roles**,
a propósito: enumerarlos convertiría a `SeguridadConfig` en el **séptimo** lugar
que hay que tocar para agregar un rol, y `CLAUDE.md` ya lleva la cuenta de los
seis. Y el orden importa: los matchers específicos van antes que el comodín.

**Esfuerzo: S.** Tres líneas, más ampliar el caso de `CredencialVigenteTest`
para que pruebe un endpoint del portal —`GET /api/me/estado-de-cuenta` es el más
elocuente— y no sólo los de administración.

**Confirmación en caliente, si se quiere antes de tocar nada:** crear una cuenta
desde `/admin/usuarios` (nace con temporal), loguearse con ella, y con ese token
pedir `GET /api/me/estado-de-cuenta`. **Hoy tiene que contestar 200**; con el
arreglo, 403.

### 8.e — Lo que le falta a la Fase 2 para cerrar

**Los cuatro puntos que esta sección listaba se cerraron todos.** Quedan
anotados con su resultado, porque el resultado *es* el entregable:

1. ✅ **Los 112 anotados contra la matriz.** Se buscaron las cuatro formas en que
   una regla puede existir y estar mal, y **tres dieron cero**: ninguna escritura
   (`POST`/`PUT`/`PATCH`/`DELETE`) protegida sólo por `@PuedeLeerAdministracion`
   —o sea que **el invariante "DIRECTIVO lee todo y no escribe nada" se sostiene
   en los 147**—, ninguna lectura innecesariamente restringida a `@PuedeOperar`,
   y ningún `@PuedeVerElTableroCompleto` fuera de `tablero/`. **El único desvío
   es `GET /api/tablero/resumen`**, con `@PuedeLeerAdministracion`, y es la regla
   de §11 (*"STAFF ve el resumen financiero básico"*): devuelve un DTO propio,
   `ResumenFinanciero`, que es la decisión del Módulo 8 de **dos DTOs en vez de
   un endpoint que contesta distinto según quién llama**. Correcto.
2. ✅ **`GET /api/me/catalogo`** no recibe nada y devuelve salas + tipos de uso
   filtrados por `solicitablePorUsuario`: dato de referencia compartido, ninguna
   fila privada. Por los criterios de `ghost-scan-code`, ni siquiera califica
   como recurso.
3. ✅ **SEC-04 sigue vivo.** `verificarQuePuedeTocarEstaCuenta` existe y lo
   llaman los tres caminos que tocan una cuenta ajena
   (`UsuarioService:140, 153, 203`), y las dos mitades de *"nadie se saca a sí
   mismo"* están puestas: `:192` (*"No podés cambiarte el rol a vos mismo"*) y
   `:208` (*"No podés desactivar tu propia cuenta"*).
4. ✅ ~~El único `@PreAuthorize` suelto~~ — **no existe**; era javadoc (§8.a).

✅ **Y la pieza de la que depende todo lo anterior, verificada por separado,
porque si falla no falla nada:** `@EnableMethodSecurity` está puesta
(`SeguridadConfig:60`) —sin ella los 112 `@PreAuthorize` **compilan y no hacen
nada**—, las tres meta-anotaciones listan los roles correctos (`PuedeOperar` =
ADMIN·STAFF, `PuedeLeerAdministracion` suma DIRECTIVO, `PuedeVerElTableroCompleto`
= ADMIN·DIRECTIVO) y el prefijo que escribe `AutenticacionDesdeBase:97`
(`"ROLE_" + rol`) es el que `hasAnyRole` espera.

**Lo único que la Fase 2 deja sin cerrar** es la superficie IDOR del lado de
administración, y con un argumento, no por falta de tiempo: ahí el id viaja por
la URL **por diseño** y lo que protege es el rol, no la propiedad. Administración
ve todo el estudio; por el segundo criterio de `ghost-scan-code` —*"el recurso es
privado de un usuario o tenant"*— este sistema es **un solo tenant**, así que no
hay multi-tenencia que romper. Se deja dicho en el informe en vez de listar 112
endpoints que contestan lo que tienen que contestar.

---

## 9. Fase 3 — archivos · CERRADA (2026-09-24)

**Cero hallazgos.** Es la fase que el encargo ponía tercera en peso y el paquete
`archivo/` está bien construido. Lo verificado, con su evidencia:

| Vector | Qué se encontró | |
|---|---|:--:|
| **Path traversal al leer** | `AlmacenamientoEnDisco.resolver:162-170` — `raiz.resolve(clave).normalize()` y después `destino.startsWith(raiz)`. Es el patrón canónico, y el `normalize()` **antes** de comparar es lo que hace el trabajo | ✅ |
| **Nombre elegido por quien sube** | No pasa: la clave es `carpeta/AAAA-MM/UUID.ext`, **generada entera por el servidor** (`guardar:103-105`). El nombre original se guarda sólo como metadato | ✅ |
| **Tipo declarado por el cliente** | No se le cree: `reconocer()` mira los **primeros bytes**. Tres tipos y nada más — PDF (`%PDF`), PNG (header completo) y JPEG (`FF D8 FF`). El `Content-Type` que se sirve sale de ahí, no del upload | ✅ |
| **XSS almacenado por `inline`** | Los archivos se sirven `ContentDisposition.inline()`, así que **el tipo aceptado es lo que decide**: sin SVG ni HTML en la lista, no hay nada que el navegador ejecute como documento | ✅ |
| **Inyección de cabecera en `Content-Disposition`** | `NombreDeArchivo.sano` es una **allowlist** (`[^a-z0-9._-]` → `_`): comillas, `;`, CR y LF **no pueden existir** en el nombre | ✅ |
| **Tamaño** | En dos capas: Spring corta en 12 MB (`max-file-size`) y la aplicación en 10 (`tamano-maximo-mb`), así que el corte duro es del contenedor y el mensaje lindo es nuestro | ✅ |
| **Zip slip** | **No aplica**, como el §3 anticipaba: cero `ZipInputStream`/`ZipFile` en el backend. Nada descomprime nada | ✅ |
| **Acceso a la descarga** | Contratos, `@PuedeLeerAdministracion`. Comprobantes de pago y de egreso, anidados bajo su padre y resueltos con la consulta acotada (`delPago(idComprobante, idPago)`, `delEgreso(...)`), **nunca un `findById` suelto** — que es el riesgo que el propio javadoc del repo nombra. El del portal, `mioPorId` (§8.c) | ✅ |

⚠️ **El caso políglota queda cerrado, pero por un default.** Un archivo con
`%PDF` al principio y HTML adentro se sirve como `application/pdf` e `inline`;
lo que impide que el navegador lo re-interprete es `X-Content-Type-Options:
nosniff`. **`SeguridadConfig` no configura cabeceras**, así que aplican los
defaults de Spring Security — que la incluyen. Funciona, y **depende de no
tocar**: un `.headers(h -> h.disable())` futuro la apaga sin que falle nada.
Anotado para la Fase 6, que es la de cabeceras.

⚠️ **Y un vector que no es de `archivo/` y cae acá igual: el material de clase
viaja como LINK, no como archivo.** O sea que un profesor guarda una URL que el
portal del alumno renderiza en un `<a href>` — que es la puerta de un
`javascript:` almacenado. **Está cerrada**: `AltaMaterialRequest.isUrlConEsquema`
exige que empiece con `http://` o `https://`. ⚠️ **Pero la cierra de rebote**:
su propio javadoc dice que es *"una validación floja a propósito"* puesta para
atajar a quien pega el nombre de un archivo en vez de su URL. **Nadie escribió
que además es la defensa contra `javascript:`**, así que el día que alguien la
"mejore" para aceptar más esquemas, abre un XSS sin que nada avise. Va al
informe como **Informativo**: no hay que cambiar el código, hay que cambiar el
comentario.

✅ Los 9 `target="_blank"` del panel llevan `rel="noreferrer"`, que **implica
`noopener`** por spec: no hay tabnabbing.

---

## 10. Fase 4 — inyección · CERRADA (2026-09-24)

**Cero hallazgos, y la mitad SQL se puede afirmar estructuralmente**, que es más
fuerte que haber mirado consulta por consulta.

### 10.a — SQL: la superficie es cero, no "está parametrizada"

| Superficie | Medido |
|---|---:|
| `createNativeQuery` | **0** |
| `createQuery` | **0** |
| Declaraciones de `EntityManager` | **0** |
| `JdbcTemplate` en `src/main` | **0** (las 2 ocurrencias son menciones en el javadoc de `ManejadorDeErrores`; los usos reales son de tests) |

**No queda ningún lugar donde se arme SQL en runtime.** Todo pasa por `@Query`, y
ahí la inmunidad es del lenguaje: **el valor de una anotación en Java tiene que
ser una constante de compilación**, así que un dato del usuario no se puede
concatenar aunque alguien quiera. Las 14 concatenaciones que aparecen en las
consultas nativas son con `static final String` del propio código
(`LineaDeNegocio.EXPRESION`, `LineaDeNegocio.JOINS`, `SaldoPendiente.COSAS`,
`DeudaCobrable.SQL`, `ClienteRepository.CLIENTES`) — fragmentos de SQL escritos
a mano para no duplicar una definición, nunca entrada.

**SEC-09 sigue cumplido, y el matiz está escrito en el código y no hace falta
reportarlo como si fuera nuevo.** Medidas: **53 cláusulas `LIKE :`**, de las que
**29 no declaran `ESCAPE`** — y las 29 ligan `:patron`, o sea
`Busqueda.patron()`, que escapa `\`, `%` y `_` **en ese orden** (el backslash
primero, o se re-escaparían los que agrega él mismo). Funciona porque **la barra
invertida es el carácter de escape por defecto de `LIKE` en Postgres**. El
javadoc de `Busqueda` dice exactamente esto, incluido por qué se borró la
constante `ESCAPE` que nadie referenciaba. **Va al informe como Bajo**: no es un
agujero, es una dependencia de un default del motor, y el argumento para
declararlo sigue siendo el que esa clase ya escribió.

### 10.b — Fórmulas: no aplica, y por una decisión vieja

El encargo sospechaba de las exportaciones porque **sus datos entran por
formularios públicos**. Medido:

- **Cero `setCellFormula`** en todo el backend.
- **Cero exportación CSV** — ni `text/csv` ni un `.csv` en ninguna parte.
- Las celdas se escriben con `setCellValue`, que en POI produce una celda de
  **tipo string**, y Excel **no evalúa** una celda string como fórmula.

**La inyección de fórmulas es un problema de CSV**, donde no hay tipo y el `=`
inicial lo decide todo. Acá no existe porque el Módulo 8 decidió *"un xlsx de
verdad, con fechas y montos tipados, no un CSV renombrado"* — y el tipado lo
sostiene el sealed type `informe/Celda.java` (`Texto`, `Monto`, `Numero`,
`Cantidad`, `Fecha`). ⚠️ **Lo que hay que dejar escrito para el futuro**: el día
que alguien agregue una exportación CSV, `Celda.Texto` necesita una regla de
escapado (prefijar `'` ante `= + - @`), y **no la tiene hoy porque no la
necesita**. Informativo.

### 10.c — XSS: el panel no tiene por dónde

- **`dangerouslySetInnerHTML`: 2 en todo el monorepo, las dos en la landing, las
  dos correctas.** `JsonLd.tsx` hace
  `JSON.stringify(data).replace(/</g, "\u003c")` —el patrón canónico contra el
  breakout de `</script>`, con el porqué en su propio comentario— y el
  `<noscript>` de `layout.tsx:125` inyecta **un literal**, sin interpolación.
- **El panel tiene cero.** Todo lo que viene del servidor se renderiza como texto
  de React, que escapa.

### 10.d — La pregunta abierta de la Fase 1, contestada de paso

El encargo preguntaba textualmente si el límite por IP *"sigue cubriendo TODAS
las rutas sensibles, incluidas las nacidas después (portales, mastering,
sello)"*. **Sí, y el conjunto es exacto.** `FiltroDeFrecuencia.RUTAS_VIGILADAS`
tiene cuatro: las **tres únicas rutas públicas del sistema** (`login`,
`registro`, `solicitantes` — §8.b) más `POST /api/me/password`, que es la otra
que toca una credencial. **Todo lo nacido después de agosto exige autenticación**,
así que ahí el actor está identificado y el control correcto es el rol, no la
frecuencia. No falta ninguna.

---

## 11. Fase 5 — entrada, DTOs y superficie pública · CERRADA (2026-09-24)

**Un hallazgo: `CS-02`.** Lo demás está bien y vale decirlo.

### 11.a — Lo verificado y correcto

- ⚠️ **No hay mass assignment en el alta pública, y está defendido en el código.**
  `UsuarioService:77-79` hace `usuario.setRol(Rol.USUARIO)` **en duro**, con el
  comentario al lado: *"El rol NO sale de la solicitud. Este endpoint es público:
  aceptar un rol del cliente sería regalar una forma de darse ADMIN a uno
  mismo."* Mandar `"rol":"ADMIN"` en el registro no hace nada.
- **El DTO del formulario público tiene techo en todos sus campos.**
  `AltaSolicitanteRequest`: nombre y apellido 80, email 150 + `@Email`, teléfono
  40, `detalle` y `mensaje` 2000, y los compañeros acotados a 2 con las mismas
  reglas. Su propio javadoc lo declara como invariante.
- **CORS no tiene comodín.** `SeguridadConfig:231-241`: orígenes desde
  configuración (default, las dos de localhost), métodos y headers enumerados
  (`Authorization`, `Content-Type`), registrado sólo en `/api/**` y
  **`setAllowCredentials(false)`** — correcto, porque la credencial va en un
  header y no en una cookie, así que el navegador no tiene nada que mandar solo.

### 11.b — 🟠 `CS-02` · Ningún techo para el cuerpo de un pedido

**Severidad: Medio.** Confirmado por lectura de la configuración.

**Qué pasa hoy.** Son **dos hechos que por separado no molestan y juntos sí**:

1. **El único límite de tamaño configurado es el de multipart**
   (`application.properties:146-147`, 12 MB por archivo y 13 por pedido). **Un
   cuerpo `application/json` no tiene techo**: el `max-http-form-post-size` de
   Tomcat sólo aplica a `x-www-form-urlencoded`, y Spring Boot no pone ninguno
   para JSON. El cuerpo se deserializa **entero en memoria** antes de que corra
   una sola anotación de Bean Validation, así que los `@Size` de §11.a **no
   frenan nada**: rechazan después de haber materializado el String.
2. **33 de los 103 componentes `String` de los DTOs de entrada no tienen
   `@Size`**, y las columnas que los reciben son **`TEXT`** —sin límite en
   Postgres—: `notas`, `observaciones`, `notas_internas`, `motivo_descuento`.

**El peor caso es público y no necesita cuenta:** `POST /api/solicitantes`. El
límite por IP de `FiltroDeFrecuencia` acota **cuántos** pedidos, no **cuán
grandes**: con el default de 120 por ventana, alcanza para presionar la memoria
de un VPS chico hasta el OOM. **El segundo caso es de adentro**: cualquiera con
`@PuedeOperar` puede dejar un `notas` de tamaño arbitrario, y eso no se borra
—este esquema no borra nada— así que crece la base y crecen los backups.

⚠️ **Lo que NO es:** no es escalada ni fuga. Es disponibilidad y crecimiento, que
es exactamente por qué va Medio y no Alto.

**Recomendación, en dos niveles y el primero es el que importa:**

1. **El techo va en el proxy**, que es donde este deploy ya iba a tener uno
   (`operacion.md` §3). `client_max_body_size 15m;` en nginx, o el equivalente
   en Caddy, corta el cuerpo **antes** de que llegue a la JVM — que es la única
   defensa que funciona, porque cualquier chequeo en Java ya pagó la memoria.
   El 15 sale de dejar pasar el multipart de 13 con aire.
2. **Y `@Size` en los 33 componentes**, para que un texto largo se rechace con
   un mensaje en vez de con un 500, y para que la columna `TEXT` tenga un tope
   real en algún lado. Es cosmético al lado del punto 1, y es el que cierra el
   caso de adentro.

**Esfuerzo: S** (el proxy, una línea) **+ M** (los 33 `@Size`).

---

## 12. Fase 1 — la candidata de §5 quedó CONFIRMADA: 🔴 `CS-03`

⚠️ **Esto reemplaza a la "pista sin confirmar" de §5.** La verificación que ahí
se pedía —*"reproducir el arranque con el jar empaquetado y sin `JWT_SECRET`"*—
se hizo el 2026-09-24, en su mitad estática y en su mitad empírica, y **la
sospecha era correcta**.

### 🔴 `CS-03` · Regresión de **SEC-01**: el candado del secreto JWT falla ABIERTO en el artefacto que se despliega

**Severidad: Alto. Bloqueante del deploy.**

**La premisa de la defensa, citada de su propio javadoc**
(`config/SeguridadConfig.java:110-113`):

> *"Falla CERRADO: el secreto commiteado solo se acepta si alguien lo autorizó
> explícitamente, y ese permiso vive en el `application.properties` del repo —
> **que es exactamente lo que un deploy no copia**."*

**Esa última frase es falsa para un jar de Spring Boot**, y es toda la defensa.

**La evidencia, medida y no razonada.** Se empaquetó el backend
(`mvn package -DskipTests`, artefacto en `target/`, que está gitignorado — no se
tocó el repo) y se miró adentro:

```
$ jar tf target/backend-0.0.1-SNAPSHOT.jar | grep application.properties
BOOT-INF/classes/application.properties

$ unzip -p target/backend-0.0.1-SNAPSHOT.jar BOOT-INF/classes/application.properties
53:lajuanita.jwt.secreto=${JWT_SECRET:QwlFr0vrNFMCnzl24JRPUyKC/bVZ+R9c...}
65:lajuanita.jwt.permitir-secreto-de-desarrollo=true
```

**El permiso viaja adentro del artefacto.** Con eso, la rama del candado
(`SeguridadConfig:136-144`) se resuelve sola:

| `JWT_SECRET` | La línea 65 | Qué pasa |
|---|---|---|
| definido | presente | arranca con secreto propio — bien |
| definido | borrada | arranca con secreto propio — bien |
| **sin definir** | **borrada** | **no arranca** — el caso que la defensa busca |
| **sin definir** | **presente (lo que el jar trae)** | **arranca y firma con la clave pública** ← acá |

**El impacto.** El secreto está commiteado en un repo, o sea que es público para
cualquiera que lo lea. Con él se fabrica un token HS256 con `rol: ADMIN` y
cualquier `sub` **sin saber ninguna contraseña**. Y no lo salva que la
autorización relea la base (`AutenticacionDesdeBase`): esa relectura protege
contra un rol viejo en el claim, no contra una firma válida — el token se
acepta, se resuelve el usuario del `sub`, y si ese id es el del admin sembrado,
el atacante **es** el admin.

**Por qué es regresión y no hallazgo nuevo.** SEC-01 criticó el candado anterior
con esta frase: *"el escenario que hay que atrapar es el del que se olvidó de
configurar algo, y el candado exige haber configurado otra cosa"*. El candado
nuevo **exige desconfigurar** algo —borrar una línea de un archivo versionado—
y falla igual, por el mismo motivo con el signo cambiado. ⚠️ **Y el olvido que
deja pasar es el probable**: todo el resto del deploy son variables de entorno;
ésta es la única fila de la tabla del README que además pide **editar un archivo
del repo**.

⚠️ **La documentación lo empeora en vez de cubrirlo.** `operacion.md:358` junta
los dos olvidos en una fila —*"`JWT_SECRET` **y** borrar
`permitir-secreto-de-desarrollo` → la aplicación no arranca, es a propósito y
falla cerrado"*— y describe la consecuencia del **caso bueno**. El párrafo
siguiente dice que *"la primera se descubre sola"*: **no se descubre**, arranca
perfecto.

**Recomendación.** El `Dockerfile` del backend **todavía no existe**
(`operacion.md:382-384` lo lista como pendiente), así que el arreglo sale gratis
y **no toca el repo de desarrollo**: que la imagen declare

```dockerfile
ENV LAJUANITA_JWT_PERMITIR_SECRETO_DE_DESARROLLO=false
```

Una variable de entorno gana sobre el `application.properties` empaquetado, así
que el artefacto viaja **cerrado con candado**, un clone fresco sigue arrancando
con `mvn spring-boot:run`, y la defensa deja de depender de que alguien se
acuerde de borrar una línea. **Y corregir la fila de `operacion.md`**, que hoy
promete un fallo cerrado que no ocurre. **Esfuerzo: XS.**

⚠️ **Lo que sigue sin verificar de la Fase 1**, y queda para su sesión: token
manipulado / sin firma / firmado con otra clave, y si algún portal guarda estado
de sesión que contradiga el modelo stateless. `CS-03` era lo que la fase tenía
señalado; el resto de su checklist está intacto.

---

## 13. Fase 6 — transporte, cabeceras y CORS · CERRADA (2026-09-24)

**Un hallazgo: `CS-04`**, y es el que más cambia de naturaleza al desplegar.

### 13.a — Lo verificado y correcto

- **La landing manda las cabeceras** (`next.config.ts:123-130`): CSP,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y
  `Permissions-Policy`.
- **El panel lleva su CSP en un `<meta>` inyectado en el build**
  (`vite.config.ts`), y **el propio archivo dice por qué y qué le falta**:
  `frame-ancestors` y HSTS **se ignoran en un `<meta>`** y tienen que ir como
  cabecera, o sea en el proxy. Está bien planteado: cubre lo que se puede cubrir
  sin servidor y deja escrito lo que no.
- **La API hereda los defaults de cabeceras de Spring Security** —incluido
  `nosniff`, que es lo que cierra el caso políglota de §9— porque
  `SeguridadConfig` **no toca** `.headers(...)`. ⚠️ Funciona y depende de no
  tocarlo: un `.headers(h -> h.disable())` futuro lo apaga **sin que falle
  nada**. Va al informe como Informativo: conviene declararlas explícitamente,
  aunque hoy el efecto sea idéntico.
- **CORS ya quedó verificado en §11.a** — sin comodín,
  `allowCredentials(false)`, headers y métodos enumerados.
- **HSTS no está, y es correcto que no esté**: lo emite quien termina el TLS.
  `operacion.md` §3 punto 5 ya lo tiene anotado como parte de levantar el proxy.

### 13.b — 🟠 `CS-04` · Sin `forward-headers-strategy`, el límite por IP deja de ser por IP

**Severidad: Medio** (hoy no aplica; **aplica el día del deploy**).

**Qué pasa.** `server.forward-headers-strategy` **no está configurado** en
`application.properties`, y los dos lugares que miran quién pide usan
`getRemoteAddr()`:

- `FiltroDeFrecuencia:85` — el límite por IP.
- `RegistroDeEventos:90` — el registro de eventos de seguridad.

Detrás del proxy HTTPS que el deploy va a tener (`operacion.md` §3),
`getRemoteAddr()` devuelve **la IP del proxy para todos los pedidos**.

**La consecuencia que sí está documentada**, en `RegistroDeEventos:82` y en
`CLAUDE.md`: los eventos de seguridad quedan registrados con la IP del proxy, o
sea que **el único rastro de auditoría de logins fallidos y altas de cuenta deja
de servir para una investigación**. Dice *"la IP del proxy salvo que el proxy
mande `X-Forwarded-For` y Spring esté configurado"*, y Spring no lo está.

⚠️ **La consecuencia que NO está documentada en ninguna parte, y es peor: el
límite por IP se convierte en un único balde global.** Los 120 pedidos por
ventana dejan de ser *por visitante* y pasan a ser *del sitio entero*, lo que lo
da vuelta: de control protectivo pasa a **palanca de denegación de servicio**.
Quien quiera dejar a todo el estudio afuera del login sólo tiene que gastar el
balde compartido desde una sola máquina — y encima sus pedidos son
indistinguibles de los legítimos, porque todos vienen de la misma IP aparente.
**Un control pensado para frenar fuerza bruta termina siendo el arma.**

**Lo que lo atenúa y por qué no alcanza:** el límite **por email** de
`SesionService` sigue funcionando —la dirección viene del cuerpo, no de la capa
de red— así que la fuerza bruta contra *una cuenta* sigue frenada. Lo que se
pierde es el control volumétrico y la trazabilidad.

**Recomendación.** Una línea, más la mitad del proxy:

```properties
server.forward-headers-strategy=framework
```

y que el proxy mande `X-Forwarded-For` y `X-Forwarded-Proto`. ⚠️ **Y las dos
mitades van juntas o ninguna**: con la propiedad puesta y un proxy que **no**
sanea el header, cualquiera manda su propio `X-Forwarded-For` y **se evade el
límite eligiendo una IP falsa por pedido** — que es peor que el problema que se
venía a arreglar. Por eso esto es una tarea del deploy y no un cambio suelto en
el repo, y por eso va en el bloque *"antes de exponer a internet"* del backlog y
no en el de endurecimiento.

**Esfuerzo: S**, y no se puede probar hasta que el proxy exista.

---

## 14. Fase 7 — secretos, dependencias y datos personales · CERRADA (2026-09-24)

**Dos hallazgos: `CS-05` y `CS-06`.**

### 14.a — Secretos: nada nuevo, y lo que hay está bien encuadrado

- **Ningún `.env` versionado** (`git ls-files` no devuelve uno) y `.gitignore`
  cubre `.env`, `.env.local` y `.env.*.local`.
- **Las dos credenciales commiteadas son defaults de desarrollo con override por
  entorno**: `spring.datasource.password=${DB_PASSWORD:la_juanita}` y el secreto
  JWT (que es `CS-03`, §12).
- ⚠️ **`docker-compose.yml` publica `5432:5432` con la contraseña pública, y NO
  es un hallazgo**, aunque tenga la forma exacta de `CS-03`: su propio bloque
  avisa (*"En el VPS esto NO va así"*), `operacion.md` §3 dice que **el compose
  del deploy es otro archivo** —`docker-compose.prod.yml`, todavía por escribir—
  y su tabla de riesgos ya enumera el puerto y la contraseña.

⚠️ **Y ahí aparece la evidencia que le da más fuerza a `CS-03`.** Esa tabla de
`operacion.md` §3 describe **bien** el olvido de la contraseña de la base
(*"Arranca perfecto con la contraseña pública `la_juanita`. **No avisa nada**"*)
y **mal** el del JWT (*"La aplicación no arranca. Es a propósito y falla
cerrado"*). **La única fila de la tabla que promete un fallo cerrado es
justamente la que no lo cumple**, y está al lado de otra que describe con
precisión el mismo modo de falla. No es que no supieran pensarlo: es esa fila.

### 14.b — 🟠 `CS-05` · Dos dependencias del front con CVE conocida

**Severidad: Medio.** Medido con `npm audit --omit=dev` el 2026-09-24.

| Paquete | Instalado | Aviso |
|---|---|---|
| `next` | **16.3.0** (rango vulnerable 16.0.0–16.3.2) | **Crítico**: RCE no autenticada en servidores **Windows** (GHSA-p293-qw3h-jr36) y RCE no autenticada en la **Image Optimization API cuando se usan AVIF** (GHSA-2xp9-vwfh-vxw4) |
| `sharp` | **0.35.3** (vulnerable `< 0.35.4`) | **Alto**: vulnerabilidades de libheif (GHSA-g89c-p67h-r497, GHSA-2jg2-4ch7-h545) |

⚠️ **La severidad baja de Crítico a Medio porque se midió si este repo toca el
camino vulnerable, y en producción no lo toca:**

- **La RCE de AVIF no aplica.** `next.config.ts:148` fija
  `formats: ["image/webp"]` —AVIF deshabilitado— y en `public/` **no hay un solo
  archivo AVIF ni HEIC** (10 jpg, 3 webp, 2 png, 1 jpeg). ⚠️ **Y otra vez está
  cerrada de rebote**: el comentario que la cierra argumenta **rendimiento**
  (*"codificar AVIF es MUCHO más lento que WebP"*), no seguridad. Es la tercera
  vez en esta barrida que una defensa real existe por otro motivo y nadie lo
  anotó — como la validación de la URL del material (§9).
- **La RCE de Windows no aplica a producción**: el deploy es un VPS Linux.
- **Las de libheif prácticamente tampoco**: `sharp` sólo procesa los locales de
  `public/`, y no hay HEIF; no hay `remotePatterns`.

⚠️ **Pero hay un camino vivo, y es el que importa: la máquina de desarrollo es
Windows.** `pendientes.md` y `mejoras.md` §26 le indican a Ignacio levantar el
front **y exponerlo a la red** (`npm run dev -- --host`, entrar por la IP) para
la verificación en dispositivo que quedó pendiente. Eso pone **un Next
vulnerable a una RCE no autenticada de Windows escuchando en la Wi-Fi de la
casa**. El riesgo es bajo porque la red es de confianza; la consecuencia es
ejecución de código en la máquina donde vive el repo.

**Recomendación.** `npm update next sharp` —`next@16.3.6` y `sharp@0.35.4`
cierran las dos— y **rehacer el lockfile con
`python scripts/completar-lockfile.py`**, que es obligatorio en este repo después
de cualquier `npm update` (npm en Windows omite los binarios nativos de las otras
plataformas y `npm ci` en el runner de Linux se cae). **Esfuerzo: S**, más correr
las suites. **Hacerlo antes de la próxima sesión de verificación en dispositivo**,
que es cuando el camino de Windows se abre.

### 14.c — 🟠 `CS-06` · Ley 25.326: no hay aviso de privacidad ni vía de supresión

**Severidad: Medio.** Se **nombra la obligación**, no se dictamina — es la regla
de §7 de este documento.

**Qué se recoge y de quién.** La landing tiene **cuatro formularios públicos**
(programas, cabina, equipos, mentoría) que piden **nombre, apellido, email y
teléfono** —y desde `V36`, los mismos datos de hasta dos compañeros, o sea **de
terceros que no completaron nada**—. Todo eso entra por `POST /api/solicitantes`
y queda en `solicitante`. Un alumno además acumula pagos, deudas, asistencias y
notas privadas de sus profesores.

**Los dos huecos:**

1. **No hay aviso de privacidad.** No existe página legal en la landing —`app/`
   no tiene ninguna— ni aparece la palabra *privacidad* o *datos personales* en
   ningún archivo. Los formularios no dicen para qué se usan los datos, quién
   los trata ni qué derechos tiene quien los deja.
2. **No hay forma de suprimir**, y esto no es un olvido sino **una tensión de
   diseño que nadie escribió**. El esquema **no borra nada a propósito** —es uno
   de sus principios, y por buenas razones: historial de clases, plata, firmas—
   y `solicitante` lo lleva al extremo con un trigger que **rechaza todo
   DELETE** (`V20` §3). La salida que el sistema ofrece es `DESCARTADO`, que es
   **un estado, no una supresión**: la fila con el nombre, el mail y el teléfono
   sigue ahí. Que borrar una ficha en desarrollo haya requerido **apagar un
   trigger a mano** (`pendientes.md` §3.8) es exactamente la medida del
   problema.

⚠️ **Lo que hay que decidir es de negocio, no de código**, y por eso va acá y no
como una tarea: **hasta dónde llega "no se borra nada"**. Una respuesta
razonable y barata es separar los dos casos —*el historial de plata y clases no
se toca; una ficha del buzón que nunca produjo nada se anonimiza a los N
meses*—, que además resuelve el crecimiento que `CS-02` describe por el otro
lado. Pero es una decisión de Ignacio.

**Recomendación mínima y accionable ya:** una página de privacidad en la landing
y una línea en los cuatro formularios diciendo para qué se piden los datos y a
dónde escribir para pedir acceso o baja — **con una dirección que exista**,
⚠️ porque `hola@lajuanitastudio.com` **no existe** (§13 de `platform.md`) y
poner un contacto que nadie lee es peor que no ponerlo. **Esfuerzo: S** la
página; **M** la decisión de retención y lo que salga de ella.

### 14.d — Verificado y correcto

- **El backend está al día**: Spring Boot **4.1.1** (el BOM gestiona casi todo),
  y sólo tres versiones explícitas — `poi-ooxml` 5.4.1 y `openpdf` 2.0.3, las
  dos recientes. **No se corrió un escáner de CVE contra Maven**: se listan las
  versiones y se deja anotado, sin inventar números, que es la regla de §7.
- **OpenPDF y no iText** sigue siendo la elección correcta y está argumentada en
  el `pom`: iText 7 es AGPL.

---

## 15. Fase 8 — operación y respuesta a incidentes · CERRADA (2026-09-24)

**Un hallazgo: `CS-07`.**

### 15.a — Lo verificado y correcto, que en esta fase es lo más fuerte del proyecto

- **El backup existe, cubre las dos cosas y tiene retención**: `scripts/backup.sh`
  hace `pg_dump -Fc` **y** un tar de los archivos subidos, porque desde el Módulo
  7 hay contratos en disco que el dump no ve. El script lo argumenta él mismo:
  restaurar sólo la base deja cada `contrato_sello` apuntando a un PDF que no
  está, y *"se descubre el día que alguien abre un contrato, que es tarde"*.
- **El restore fue ENSAYADO, no escrito**: `operacion.md` §2, rehecho el
  2026-08-20 con los archivos. Verificó que la base restaurada **conserva sus
  reglas**, que la aplicación real arranca contra ella y sirve el contrato por
  la API, y **probó el modo de falla desde el otro lado** (fila sin archivo → la
  API contesta *"No está el archivo pedido"*). Es más de lo que la mayoría de los
  proyectos de este tamaño tiene.
- **Hay rastro de seguridad, y cubre lo que hay que cubrir**: `RegistroDeEventos`
  registra ocho hechos —login exitoso y fallido, límite excedido, cuenta creada,
  contraseña cambiada y reseteada, rol cambiado, cuenta activada/desactivada—.
  La lista es la correcta: es todo lo que toca una credencial o un permiso.

### 15.b — 🟠 `CS-07` · El rastro de auditoría no sobrevive al despliegue

**Severidad: Medio.**

**Qué pasa.** `application.properties` **no tiene una sola línea de
`logging.*`**. Sin `logging.file.name`, Spring Boot escribe **sólo a stdout**,
sin archivo, sin rotación y sin retención. En el deploy previsto —Docker
Compose— stdout lo captura el driver `json-file`, que **por defecto no tiene
límite de tamaño ni rotación**. De ahí salen dos cosas:

1. **El log crece sin techo hasta llenar el disco del VPS.** Es el traspié
   clásico de Compose, y acá tiene un acelerador propio: `RegistroDeEventos`
   escribe una línea **por cada login**, y `FiltroDeFrecuencia` una por cada
   límite excedido — o sea que **un ataque de fuerza bruta escribe el log que
   llena el disco**. El control y la munición son el mismo.
2. **El rastro no es durable.** Recrear el contenedor —que es lo que hace
   cualquier actualización— se lleva el log. `backup.sh` **no lo respalda**, y
   está bien que no lo haga: un log no va adentro de un `pg_dump`. Pero eso deja
   al único registro forense sin ninguna historia de durabilidad.

⚠️ **Y se combina con `CS-04` de la peor manera: juntos, el rastro queda
equivocado Y efímero.** `CS-04` hace que cada evento se anote con la IP del
proxy en vez de la del visitante; `CS-07` hace que ese registro ya equivocado
desaparezca al recrear el contenedor. **Después de un incidente no hay con qué
contestar ni "desde dónde" ni "cuándo".** Ninguno de los dos es explotable por
sí mismo; los dos juntos son la diferencia entre investigar y no poder.

**Recomendación**, y de nuevo **sale gratis porque `docker-compose.prod.yml`
todavía no existe**:

```yaml
logging:
  driver: json-file
  options: { max-size: "10m", max-file: "5" }
```

en los servicios del compose de producción — eso solo cierra el punto 1. Para el
2, `logging.file.name` con
`logging.logback.rollingpolicy.max-history`, en un volumen montado, y **que el
logger `seguridad` salga a su propio archivo**: hoy sus ocho eventos están
mezclados con todo lo que loguea Spring, así que revisarlos es `grep` sobre un
log que no existe más. **Esfuerzo: S.**

⚠️ **Lo que esta barrida NO evalúa, y hay que decirlo**: no hay plan de
respuesta a incidentes escrito (quién se entera, qué se apaga, a quién se avisa,
en qué orden se restaura). `operacion.md` cubre backup, restore y fallos de
migración — que es el 80% de lo que hace falta — pero **"nos entraron" no es un
caso que ese documento contemple**. No se reporta como hallazgo técnico porque
no lo es; se deja nombrado para el informe.

---

## 16. Fase 9 — fuera de las categorías anteriores · CERRADA (2026-09-24)

**Cero hallazgos.** Se recorrieron los cinco vectores que la taxonomía de
`ghost-scan-code` trae y el encargo no nombraba (§3), más lo que fue apareciendo.

| Vector | Resultado |
|---|---|
| **`sourcemap-exposure`** | ✅ **No aplica.** Ni Vite ni Next publican sourcemaps: el panel no declara `build.sourcemap` (default `false`) y la landing no declara `productionBrowserSourceMaps` (default `false`). El código del panel no viaja |
| **`missing-sri`** | ✅ **No aplica, y por una razón mejor que tener SRI: no hay scripts de terceros.** Ni analytics, ni CDN, ni tag manager. No hay nada que integrar |
| **`client-open-redirect`** | ✅ **No existe.** Ningún redirect toma su destino de un parámetro; la única lectura de `searchParams` en todo el monorepo está **en un test** |
| **`debug-endpoints`** | ✅ **Mínimo y deliberado.** `management.endpoints.web.exposure.include=health` y `show-details=never`: `/actuator/health` contesta UP o DOWN y nada más. Es el riesgo que agosto ya dejó asumido, y sigue siendo del tamaño que decía |
| **`zip-slip`** | ✅ **No aplica** (ya en §9): nada descomprime nada |

**Dos cosas más que aparecieron y no son hallazgos, pero conviene que estén
escritas:**

- ⚠️ **Los dos `<iframe>` de la landing son seguros hoy por dónde vienen sus
  datos, no por cómo están escritos.** El del blog arma su `src` como
  **origen fijo + id** (`https://www.youtube-nocookie.com/embed/${block.id}`,
  o Spotify), así que el id no puede cambiar el origen. **Pero el blog está
  construido explícitamente para mudarse a un CMS** (`data/posts.ts` con la
  forma de Portable Text), y el día que ese id lo escriba un editor en vez de
  estar a mano en el repo, conviene que esté validado como alfanumérico. Es una
  línea, y hoy no hace falta. **Informativo, con destinatario: la migración al
  CMS.**
- ✅ **La landing ya resolvía tres cosas táctiles que la plataforma tuvo que
  aprender después** (§26 de `mejoras.md`); no es seguridad, pero confirma que
  ese código está cuidado.

---

## 17. Fase 1 — autenticación y sesión · CERRADA (2026-09-24)

**Sin hallazgos nuevos.** El único de esta fase es `CS-03` (§12), que ya estaba
redactado. Los otros tres puntos del encargo se recorrieron entero y **los tres
dan verificado y correcto** — uno de ellos con evidencia **ejecutada**, no leída.

### 17.a — JWT: verificado corriendo los casos, no razonándolos

**La configuración** (`SeguridadConfig.jwtDecoder`): `NimbusJwtDecoder
.withSecretKey(clave).macAlgorithm(MacAlgorithm.HS256)` — **el algoritmo está
fijado**, así que no hay `alg: none` ni degradación a otro MAC ni confusión con
RS256 (un decodificador simétrico no tiene verificador asimétrico que ofrecer).
Los validadores son tres: `JwtTimestampValidator`, `JwtIssuerValidator(emisor)`
y un `exigeVencimiento()` propio — **`exp` e `iss` son obligatorios**, que es lo
que la auditoría de agosto declaraba y había que confirmar. Duración: `8h`
(`application.properties:83`).

⚠️ **Y no hizo falta razonar el comportamiento: ya estaba probado.**
`auth/TokenJwtTest` tiene un caso por cada ataque que el encargo nombra, y **se
corrieron**:

```
Tests run: 10, Failures: 0, Errors: 0  -- TokenJwtTest
Tests run:  5, Failures: 0, Errors: 0  -- CredencialVigenteTest
Tests run: 14, Failures: 0, Errors: 0  -- AutenticacionTest
```

- `rechaza_un_token_con_algoritmo_none` — arma el token a mano en Base64URL con
  `{"alg":"none"}`, `rol: ADMIN` y firma vacía.
- `rechaza_un_token_firmado_con_otra_clave` — el token fabricado por un tercero.
- `rechaza_un_token_sin_vencimiento`, `rechaza_un_token_vencido`,
  `rechaza_un_token_de_otro_emisor`, `rechaza_basura`.
- `las_autoridades_salen_de_la_base_y_no_del_claim_del_token` — **firma un token
  válido que MIENTE** (`rol: USUARIO` para el `sub` del admin) y comprueba que
  la autoridad que sale es `ROLE_ADMIN`, la de la base.
- `el_token_emitido_no_lleva_datos_sensibles` — `containsOnlyKeys("iss", "iat",
  "exp", "sub", "rol")`. Un JWT va firmado pero **no encriptado**, y este caso es
  el que impide que alguien le agregue el email o algo peor con el tiempo.

⚠️ **La primera corrida dio 10 errores y no era la suite: era el entorno.**
`ApplicationContext failure` → `PSQLException` → Docker Desktop abajo. Vale
anotarlo porque el mensaje de Maven no nombra la base por ningún lado y son diez
errores idénticos de 40 líneas cada uno: **mirar el `Caused by` del
surefire-report antes de creerle a la pantalla.**

### 17.b — Revocación y baja: ⚠️ la premisa del encargo es falsa, y para bien

El encargo dice: *"Un token vale hasta 8 h post-baja: es decisión asumida"*.
**No es así.** `AutenticacionDesdeBase.convert` relee al usuario de la base en
**cada** pedido autenticado y corta antes de mirar nada más:

```java
if (!usuario.isActivo()) {
    throw new InvalidBearerTokenException("La cuenta está desactivada.");
}
```

**Dar de baja a alguien tiene efecto en el pedido siguiente**, no a las 8 horas,
y `CredencialVigenteTest` lo fija con tres casos (baja, degradación de rol y
temporal sin cambiar). La ventana de 8 h que sí existe es otra y es la
documentada: **un token robado de una cuenta que sigue activa** no se puede
revocar antes de que venza. Esa sigue siendo la decisión asumida de agosto, y no
se reabre.

**Ningún flujo nuevo amplía la ventana ni guarda estado de sesión.** Medido:
**cero** `HttpSession`, `@SessionAttributes`, `SecurityContextRepository` o
`setSession` en todo el backend, con `SessionCreationPolicy.STATELESS` puesto.
Los portales del Módulo 4 y 5 no agregaron nada: leen el `sub` del token y
consultan.

### 17.c — La contraseña temporal: el vencimiento no se puede esquivar

**Se aplica en el login** (`SesionService.verificarQueLaTemporalNoVencio`), y
⚠️ **está ubicado después de comparar la contraseña, a propósito**: quien llega
ahí ya demostró conocerla, así que decirle que venció no le informa nada a un
desconocido — los tres rechazos anónimos (email inexistente, contraseña
equivocada, cuenta de baja) siguen siendo indistinguibles entre sí.

**La pregunta del encargo era si el vencimiento se aplica de verdad en los
caminos nuevos, y la respuesta es que no se puede NO aplicar.** El riesgo
concreto sería una cuenta con `debeCambiarPassword = true` y
`passwordTemporalDesde = NULL`: ahí el chequeo sale por el `return` temprano y
**la temporal no vencería nunca**. Medido, eso no se puede construir:

- **Cero `setDebeCambiarPassword` y cero `setPasswordTemporalDesde` en todo el
  backend.** Las dos columnas se mueven **sólo** por `Usuario
  .marcarPasswordTemporal` / `marcarPasswordElegida`, que las escriben juntas.
- **Los cinco caminos que crean cuentas delegan en uno solo**:
  `AlumnoService:74`, `ProfesorService:92` y `SolicitanteService:257` llaman a
  `UsuarioService.altaPorAdministracion`, que es el `marcarPasswordTemporal` de
  `UsuarioService:113`. El reseteo es el `:143`. No hay un sexto.
- Y si alguien escribiera las columnas por afuera, **`V8` las rechaza**:
  `usuario_password_temporal_coherente` exige que las dos digan lo mismo.

**Nada loguea la contraseña.** `RegistroDeEventos` anota
`passwordCambiada(idUsuario)` y `passwordReseteada(idQuienPide, idObjetivo)` —
**sólo ids**. Ningún `log.*` del backend menciona una contraseña o una clave.
(`limiteExcedido` sí anota la `clave` del limitador, que para el límite por
email **es el email**: es dato personal en el log, no una credencial, y es
práctica normal registrar contra qué cuenta se intentó.)

⚠️ **Dos matices honestos, ninguno de los cuales es un hallazgo aparte:**

1. **El vencimiento controla el LOGIN, no un token ya emitido.** Quien entra el
   día 6 con la temporal se lleva 8 h de token que siguen valiendo el día 7 y
   pico. Es la misma ventana asumida de §17.b, no una fuga nueva.
2. ⚠️ **La temporal viaja en la URL de `wa.me`**, que es el diseño —no hay
   infraestructura de mail, y pasarla por WhatsApp es la decisión— pero implica
   que queda en el **historial del navegador** de quien la manda y pasa por un
   tercero. No se reporta aparte **porque el arreglo es `CS-01`**: mientras esa
   credencial débil no pueda hacer más que cambiarse a sí misma, dónde estuvo
   importa poco. Es el argumento de `CS-01` visto desde el otro lado.

---

## DÓNDE RETOMAR

✅ **LAS NUEVE FASES ESTÁN CERRADAS Y EL INFORME ESTÁ ESCRITO:**
**[`informe-ciberseguridad-2026-09.md`](informe-ciberseguridad-2026-09.md)**.
Ése es el entregable; este documento es su cocina.

**Siete hallazgos con ID, más cinco entre bajo e informativo:**

| | | |
|---|---|---|
| 🔴 `CS-03` | **Alto · bloquea el deploy** | El candado del secreto JWT falla **abierto** en el jar (§12) |
| 🔴 `CS-01` | **Alto** | La contraseña temporal abre los 32 endpoints del portal, no dos (§8.f) |
| 🟠 `CS-02` | Medio | Sin techo para el cuerpo de un pedido (§11.b) |
| 🟠 `CS-04` | Medio | Sin `forward-headers-strategy`, el límite por IP se vuelve un balde global (§13.b) |
| 🟠 `CS-05` | Medio | `next` 16.3.0 y `sharp` 0.35.3 con CVE (§14.b) |
| 🟠 `CS-06` | Medio | Ley 25.326: sin aviso de privacidad ni vía de supresión (§14.c) |
| 🟠 `CS-07` | Medio | El rastro de auditoría no sobrevive al despliegue (§15.b) |
| ⚪ `CS-08`–`CS-12` | Bajo/Info | El `ESCAPE` de los `LIKE` y cuatro comentarios que faltan (§4.8 del informe) |

### Lo que falta, y es poco

1. ✅ ~~La Fase 1 seguía parcial.~~ **Se cerró el 2026-09-24 (§17), y sin
   hallazgos nuevos.** Su mitad JWT es **la única parte de toda la barrida
   verificada CORRIENDO los casos** —`TokenJwtTest` 10/10, `CredencialVigenteTest`
   5/5, `AutenticacionTest` 14/14—, incluido el `alg: none` armado a mano y el
   token válido que miente en su claim `rol`. ⚠️ **Y corrigió una premisa del
   encargo**: dar de baja a alguien **no** deja un token vivo 8 h; pega en el
   pedido siguiente.
2. **Las confirmaciones en caliente** que el informe lista en su §6 — **todas
   opcionales**, todas con su procedimiento escrito. La de `CS-01` son dos
   minutos y es la que más paga. **Es lo único que queda.**
3. ⚠️ **Nada de esto está arreglado.** La barrida es de solo lectura: **no se
   tocó una línea de código, de configuración ni de migración.** El backlog
   priorizado en tres bloques está en la §7 del informe.

### Dos cosas de higiene que dejó esta sesión

- ⚠️ **Se empaquetó el backend** (`mvn package -DskipTests`) para confirmar
  `CS-03`. Quedó un jar de ~85 MB en `apps/backend/target/`, que **está
  gitignorado** — no tocó el repo, y se borra con `mvn clean` cuando moleste.
- ⚠️ **Cuando esta barrida cierre del todo, hay que sacar los tres punteros** que
  se pusieron el 2026-09-24 para que nadie vuelva a arrancar por el documento
  equivocado: el bloque *WHERE TO RESUME* de `CLAUDE.md` y los carteles de
  `mejoras.md` y `pendientes.md`. Si quedan, el próximo va a venir a buscar
  trabajo terminado — el mismo error con el signo cambiado.
