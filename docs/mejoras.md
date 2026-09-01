# La etapa de mejoras — después del MVP

> **Abierta el 2026-08-20, el día que cerró el Módulo 8.** Con los ocho módulos
> terminados, el proyecto deja de construir funcionalidad nueva por catálogo y
> pasa a mejorarse por uso: **Ignacio va a usar el sistema como usuario durante
> los próximos días y va a volver con una lista.**
>
> Este archivo es el lugar donde esa lista vive, y —más importante— **las reglas
> con las que se va a triagear, acordadas ANTES de tenerla.** Acordarlas antes es
> lo único que evita que una lista larga se convierta en meses de trabajo sin
> orden.

---

## 1. Por qué existe esta etapa

El veredicto de Ignacio al ver el sistema entero funcionando, y es el que la
abre: *"lo veo muy aburrido, poco intuitivo y demás"*.

**No es un hallazgo, es el plan cumpliéndose.** El front se construyó
función primero y nunca tuvo una pasada de diseño; el rediseño estaba agendado
desde el 2026-08-19 para el final, en una sola pasada, y §6f explica por qué se
podía posponer sin riesgo: **las reglas de negocio viven en la base y no en las
pantallas**, así que un rediseño no puede romper que una reserva necesite seña.

Lo que cambia ahora es que la etapa llegó.

---

## 2. La distinción que hay que sostener: "aburrido" ≠ "poco intuitivo"

Son dos problemas distintos, con costos y riesgos distintos, y **si entran
mezclados en la misma lista la pasada de diseño se come meses sin resolver el
segundo.**

| | **Aburrido** | **Poco intuitivo** |
|---|---|---|
| Qué es | Visual: tipografía, color, densidad, jerarquía | De flujo: no encuentro cómo hacer algo, o lo hago y no entiendo qué pasó |
| Cómo se arregla | Una pasada de diseño | Reordenar un flujo, cambiar textos, **o construir lo que falta** |
| Riesgo | Bajo. Las reglas están en la base | **Alto**: puede destapar funcionalidad faltante |
| Decisiones que necesita | De gusto | **Del negocio**, a veces |

*"No entiendo cómo hacer X"* casi nunca se arregla con estilos. Es el hallazgo
caro y el más valioso de testear en serio.

---

## 3. Cómo anotar un hallazgo

**Cuatro cosas, y la tercera es la que hace la diferencia:**

1. **En qué pantalla estabas.**
2. **Qué querías hacer.**
3. **Qué esperabas que pasara.**
4. **Qué pasó.**

Sin la 3, un *"esto es poco intuitivo"* obliga a adivinar un rediseño. Con la 3
se puede decidir si es un botón mal puesto, un texto que miente, o un endpoint
que no existe — que son tres trabajos completamente distintos.

No hace falta que sea prolijo ni que esté ordenado: eso lo hace el triage.

---

## 4. El triage: tres grupos, y uno no se puede postergar

| Grupo | Qué entra | Cómo se hace |
|---|---|---|
| **A · Front puro** | Estilos, textos, orden de una pantalla, qué se ve primero | Entra en la pasada de rediseño, todo junto |
| **B · Backend sin tocar el esquema** | Un endpoint nuevo que solo lee, un filtro, un cálculo | Ordenado y con tests, de a uno |
| **C · ⚠️ Backend que toca una regla o el esquema** | Una columna nueva, un CHECK, un trigger, cambiar qué es válido | **Migración nueva (`V21`+ — `V19` y `V20` ya se usaron), y la disciplina completa** |

**El grupo C es el que no se puede hacer a las apuradas, y la razón es la misma
que rigió todo el proyecto: las migraciones son inmutables y se acumulan.** Una
regla mal escrita hoy no se corrige editando el archivo — se corrige con otra
migración encima, y el error queda en la historia para siempre. `V18` ya
enseñó lo barato que es pisarse: editarlo después de aplicado dejó a Flyway con
el checksum viejo y la aplicación sin arrancar.

Para el grupo C vale lo que funcionó tres veces seguidas (Módulos 6, 7 y 8):
**contestar las preguntas de negocio ANTES de escribir código.** Es lo que hizo
que ninguno de los tres se frenara a mitad de camino.

---

## 5. ⚠️ Las cinco de §6f ya están en la lista, y dos NO son retoques

`sistema-gestion-plan.md` §6f las tiene anotadas como *"retoques técnicos
pospuestos"*. **Dos de las cinco son funcionalidad, y si entran como retoques van
a parecer más baratas de lo que son:**

| # | Qué | Grupo real | Estado |
|---|---|---|---|
| 1 | El admin no debería cambiarse el nombre ni el mail | ~~B~~ → **A** | ✅ **Cerrada · §9.5** — sí puede cambiarse el nombre; lo que falta es que la pantalla diga que es admin |
| ~~2~~ | ~~Que el rol ADMIN no use los servicios~~ | ~~A~~ | **❌ Descartada (Ignacio, 2026-08-28)** |
| ~~3~~ | ~~**Solicitar reprogramación**~~ | ~~B, y es funcionalidad faltante, no un retoque~~ | ✅ **HECHA el 2026-08-29 · §9.11.** Era la última viva de las cinco |
| ~~4~~ | ~~Cotización del dólar por API~~ | ~~B/C~~ | **⏸️ Pospuesta por ahora (Ignacio, 2026-08-28)** |
| ~~5~~ | ~~No poder pedir un horario ya tomado~~ | ~~B~~ | ❌ **Se cae · §9.2** — ni filtrar ni avisar: queda como está. Se cayó junto con el hallazgo #3 |

**#2 sale de la lista, no queda pospuesta como #4.** No es que se pueda seguir
usando el servicio hasta que llegue el momento del retoque —§6f ya explicaba que
el ADMIN pidiéndose una cabina a sí mismo era un síntoma raro— es que Ignacio la
descartó directamente: no se hace.

**#4 queda pospuesta "por ahora"**, no descartada: sigue arrastrando la pregunta
de negocio sin contestar (¿oficial, blue o MEP?) y es la única de las cinco que
toca una integración externa nueva. Vuelve a entrar cuando esa pregunta tenga
respuesta.

`sistema-gestion-plan.md` §6f **no se reescribe** —su propia cabecera lo dice: es
una lista que crece, no que se pisa—, así que el texto original de las cinco
sigue ahí tal cual se decidió el 2026-08-19. **Esta tabla es la que gobierna qué
está activo hoy**, y gana sobre §6f si difieren, igual que ya pasaba con la 3 y
la 4.

> **Al 2026-08-28 quedan tres vivas de las cinco, y solo una para construir:** la
> **#3** (reprogramación, que es el hallazgo #2 de §8 y lo más grande de la Fase
> 2), la **#1** convertida en trabajo de diseño (§9.5), y nada más. Las otras
> tres se cayeron: la #2 descartada, la #4 pospuesta, la #5 dada de baja por
> §9.2. **A su vez §9 gana sobre esta tabla.**

---

## 6. El timing, y por qué conviene un corte

**La lista se junta entera antes de que empiece el rediseño.** Un rediseño hecho
dos veces es el caro: si se arranca con la mitad de los hallazgos, se rehacen
pantallas que recién se habían hecho.

**Pero la lista necesita una fecha de corte.** *"Voy a volver con más"* sin fecha
es la forma en que una lista crece para siempre y no sale nada. La referencia:
**una semana de uso**, y después se congela en un plan. Lo que aparezca más tarde
entra en una segunda tanda, no en la primera.

> ✅ **Fijada el 2026-08-28: una a dos semanas** (Ignacio). O sea que la lista se
> congela **alrededor del 2026-09-11**. No es una fecha dura y no hace falta que
> lo sea — lo que importaba era que existiera una, para que la Fase 3 tenga de
> dónde arrancar en vez de esperar indefinidamente.
>
> **Y no bloquea nada mientras tanto:** las Fases 0, 1 y 2 se pueden hacer con la
> lista abierta, porque arreglar un bug no es rediseñar. El único que necesita la
> lista cerrada es el rediseño.

El calendario que la rodea no se mueve: **octubre** tiene la decisión de hosting
(de la que dependen el deploy y el destino de los backups) y **diciembre** es la
meta, con piloto de uso real y migración del Notion de Micaela.

---

## 7. Dos cosas que conviene saber ANTES de testear

**⚠️ Nada se borra en este sistema, se anula.** Un pago mal cargado, una venta, un
egreso, una clase: la base rechaza el `DELETE` a propósito (`V6` y `V7` — es
historial de un negocio real y plata). **La primera vez se va a sentir como un
bug y no lo es.** Pero anotalo igual si te pasa: puede ser que el mensaje no lo
explique bien, y *eso* sí sería un hallazgo.

**Si querés empezar de cero**, es `docker compose down -v` **y** borrar
`apps/backend/archivos` — **las dos cosas juntas o ninguna**. Borrar solo una deja
la base apuntando a un PDF que no existe, que es exactamente el modo de falla que
el ensayo de restore del 2026-08-20 vino a cubrir.

Y para mirar las pantallas de cada rol, los usuarios de demostración están en
[`sistema-gestion-plan.md` §6d](sistema-gestion-plan.md) — todos con la
contraseña de desarrollo.

---

## 8. La lista

> Se llena a medida que Ignacio testea. Cada hallazgo con las cuatro cosas de §3;
> el grupo lo asigna el triage, no quien lo anota.
>
> **La columna Estado manda sobre la de Grupo.** Lo decidido el 2026-08-28 está
> en §9, con el detalle de cada uno.

| # | Pantalla | Qué querías hacer | Qué pasó | Grupo | Estado |
|---|---|---|---|---|---|
| 1 | `/admin/ventas` | Marcar como cobrada una venta a un comprador **sin cuenta** | No existe — y tampoco había forma de cargarla cobrada | **C** | ✅ **HECHO** · `V19` §1 |
| 2 | `/admin/reservas` o portal | Que el alumno pueda modificar/reprogramar su reserva | No existe — confirma §5 #3, el Módulo 4 se la debe | **B** | ✅ **HECHO** · §9.11 |
| 3 | `ReservarPagina` (portal) | Que un pedido para un horario ocupado no llegue a la bandeja | No hay chequeo de disponibilidad al pedir | ~~B~~ | ❌ **Se cae** · §9.2 |
| 4 | `/admin/pagos` | Registrar un pago de un usuario que no es alumno | El formulario solo permite alumno → inscripción; la API ya acepta los cuatro destinos | **B** | ✅ **HECHO** · §9.8 |
| 5 | `/admin/pagos` (aprobar solicitud) | Adjuntar el comprobante al confirmar un pedido con seña | `pago.comprobante_path` existe desde `V1`; `AltaSenaRequest` nunca lo tuvo | **B** | ✅ **HECHO** · §9.9 |
| 6 | `/admin/pagos` | Editar un pago mal cargado en vez de anularlo | No existe | **C** | ✅ **HECHO** · `V19` §2 |
| 7 | Landing | Registro propio + que los formularios lleguen a Micaela | Login y formularios sin conectar | **B** | ✅ **HECHO** · buzón `V20` (§9.10) + formularios y `/ingresar` (§9.12) |
| 8 | `/admin/reservas`, anotar participante | Anotar a alguien en una clase | El botón queda trabado en "Anotando…" | Bug | ✅ **HECHO** el 2026-08-30 · §8.1 |
| 9 | — (no es una pantalla) | — | **Un test del suite es flaky**: falló 1 de 10 corridas | Infra | ✅ **HECHO** el 2026-08-30 · §9.6 |

### 8.1 · El botón "Anotando…" trabado — **RESUELTO el 2026-08-30**

**No era intermitente y no era la red: era determinista, y estaba a la vista.**

Lo que decía esta sección hasta hoy —*"el `catch` sí resetea `enviando`, así que un
rechazo normal de la API debería destrabar el botón; la causa no se ve leyendo el
código"*— era cierto **y miraba el camino equivocado**. El `catch` estaba bien. El
que no reseteaba nada era **el camino feliz**:

```
setEnviando(true)
try {
  await agregarParticipante(...)
  selector.limpiar()
  setAbierto(false)     // "cierra" el formulario
  onAnotado()
} catch (e) {
  setError(...)
  setEnviando(false)    // el UNICO lugar donde volvia a false
}
```

`setAbierto(false)` **no desmonta el componente**: `FormularioParticipante` sigue
montado y solo cambia lo que dibuja, así que el `true` sobrevivía. Por eso parecía
un cuelgue de red: **la primera vez anda siempre**, y el botón aparece trabado
recién al abrir el formulario de nuevo — o sea al anotar al segundo alumno de una
clase grupal, que es el caso más común de esa pantalla.

**El arreglo es mover el reseteo al `finally`.** Y el caso que lo pinta anota a
**dos** personas: los cuatro casos que ya existían anotaban a una sola, que es
exactamente por qué la suite nunca lo vio.

> **La lección de método, que vale más que el arreglo:** la nota decía *"sin el
> error real no conviene tocar el código a ciegas"* y eso frenó la búsqueda tres
> días. Era buena regla para un cuelgue de red y mala para esto: **el bug estaba
> escrito en doce líneas que nadie volvió a leer completas**, porque la primera
> lectura había encontrado un `catch` correcto y dio el asunto por revisado.
> Antes de esperar una reproducción, conviene leer el camino que NO falla.

**Y apareció un segundo defecto en el mismo click**, que nadie había reportado:
el panel abierto es su propio estado con una copia de la reserva, así que anotar a
alguien recargaba la agenda **y dejaba la lista de participantes vieja**. Se anota
a una persona y no aparece — que se lee como que no entró. Tomar lista ya
refrescaba el detalle; anotar, no. Ahora los dos usan el mismo `refrescar()`, y de
paso el fetch de la agenda dejó de estar duplicado en dos lugares.

---

## 9. Decisiones cerradas el 2026-08-28

> Ignacio contestó las preguntas que bloqueaban la Fase 1. **Esta sección gana
> sobre §5 y §8 si difieren** — mismo criterio que `platform.md` §13/§14/§15.

### 9.1 · Cómo se cobra una venta a un comprador sin cuenta (hallazgo #1)

**`pago.id_usuario` pasa a ser opcional, con un CHECK que exija identificar al
pagador por uno de dos caminos** —cuenta o nombre externo—, la misma forma que
`venta_comprador_identificado` y que los dos caminos de la seña en `V10`.

**Se descartó la alternativa** —que el cobro de una venta dejara de ser un
`pago`— y el argumento es del negocio: **el Tablero calcula los ingresos por
línea de negocio leyendo `pago`.** Si el cobro de una venta no fuera un `pago`,
la venta de equipos desaparecería del tablero.

⚠️ **Cinco lugares asumen hoy que todo pago tiene dueño y hay que revisarlos uno
por uno** — es lo que hace que esto sea grupo C y no se pueda apurar:

1. `PagoRepository.deLaPersona` — la definición de "mío" del portal, que hace `JOIN` con usuario
2. El estado de cuenta (`/admin/estado-de-cuenta/:id`)
3. La pantalla de deudores
4. El agrupamiento del Tablero
5. La clave de deduplicación del scheduler de avisos (`DEUDA:u=42:…`)

El riesgo no es que sean difíciles: es **olvidarse de uno y que un pago sin dueño
se caiga en silencio de un total.**

### 9.2 · Disponibilidad al pedir una sala — SE CAE, no se construye

**Ni filtrar ni avisar. Queda como está.** Se dan de baja **dos** ítems: el
hallazgo #3 y la §5 #5 ("avisar, no bloquear").

El razonamiento de Ignacio, que es el correcto: **quien pide no puede saber si
está ocupado** —el caso testigo es el visitante de la landing, que no tiene
ninguna pantalla de disponibilidad—, **bloquearlo pierde el pedido**, y el
EXCLUDE al aprobar ya es la autoridad de verdad.

Verificado que la premisa se sostiene: al aprobar sobre una franja tomada, el
backend responde **409 con *"Esa sala ya está ocupada en ese horario."***
(`ManejadorDeErrores`, `reserva_sin_solapamiento`). No es un 500.

> Matiz que no cambia la decisión: **en el portal el usuario SÍ ve la
> disponibilidad** — `ReservarPagina` ya dibuja las franjas ocupadas con
> `GET /api/me/disponibilidad`. El que está a ciegas es el visitante de la
> landing. La decisión es correcta para el caso nuevo y no empeora el viejo.

### 9.3 · Editar un pago (hallazgo #6)

**Se edita directo, y un trigger exige el autor.** Es el molde de `V7` §2, con el
mismo argumento: si cambiar un PRESENTE por un AUSENTE decide cuántas clases le
quedan a un alumno, cambiar un monto decide la caja. Quien edita no escribe una
firma: el sistema anota solo quién y cuándo.

Se descartó el otro patrón —anular y recargar, el de `venta_equipo`/`egreso`—
porque Ignacio pidió edición directa.

**Va en la misma migración que 9.1**: las dos tocan `pago`, y una sola `V19`
significa una revisión de las reglas de esa tabla en vez de dos.

### 9.4 · Las solicitudes de la landing (hallazgo #7)

**Tres flujos distintos, y solo uno se construye.**

| Servicio | Cómo llega | Qué hay que hacer |
|---|---|---|
| **Mix & Mastering** | WhatsApp a Ghezz, que lo maneja; después se carga al sistema a mano | **Nada.** Ya es la decisión vigente del Módulo 6 |
| **Curso DJ / Producción** | Formulario de la landing → **buzón de solicitantes** | Tabla + bandeja |
| **Cabina / grabación** | Formulario de la landing → **el mismo buzón** | — |

**Es un solo buzón, no dos.** Los dos flujos son idénticos hasta el final:
formulario → ficha de solicitante → Micaela crea la cuenta. Lo único que cambia
es el último paso, y **ese ya está construido**: ella carga la inscripción en
`/admin/inscripciones` o la reserva en `/admin/reservas`, con las pantallas que
ya usa. La ficha solo tiene que decir *qué pidió* para que sepa a cuál ir.

**Es una TABLA, no una notificación**, y esa es la corrección de diseño que
importa. Una notificación se lee y se va; un solicitante es **una ficha con
ciclo de vida** —pendiente → convertido en usuario → o descartado—. Como
notificación, el día que Micaela la lee y no actúa se le va en el scroll y no
queda ninguna lista de "gente que no contesté". El sistema ya tiene resuelta esa
distinción: `solicitud_reserva` es una tabla con estados y la notificación es lo
que la **anuncia**. Mismo par acá.

**⚠️ La contraseña se comunica por WhatsApp, no por mail (decidido: "wpp por
ahora").** El sistema genera la temporal y **se la muestra a Micaela**; ella la
manda. Es exactamente lo que ya hace con los ~80 alumnos del Notion.

Esto sostiene la decisión que ya estaba tomada en cinco lugares del proyecto
—*"no hay infraestructura de correo ni la va a haber pronto"*, y §7 del plan
descarta el relay de mails—. Verificado: no hay nada de mail, ni en el `pom.xml`
ni en una línea de código.

**El mail queda como proyecto aparte, y desacoplado a propósito.** El envío es un
detalle de entrega, no parte del núcleo: acoplados, una feature barata y lista
queda esperando una infraestructura que depende de la decisión de hosting de
octubre. Separados, el buzón sale ya y el mail se enchufa después sin tocar nada.
Si algún día entra, destraba de regalo el "olvidé mi contraseña", que hoy no
puede existir.

> 🔒 **El formulario de la landing es un endpoint público sin autenticación** —
> hoy solo lo son el login y el registro. Va a recibir spam de bots. La defensa
> ya está construida (`FiltroDeFrecuencia`, límite por IP antes de la cadena de
> seguridad); hay que acordarse de aplicársela.

❓ **Queda abierto:** anotarse en un **programa** desde la landing genera una
ficha de solicitante, pero un interesado que nunca contesta no es lo mismo que
uno que se anotó. Si con el uso aparece la necesidad de distinguirlos, es un
estado más en la misma tabla, no una tabla nueva.

### 9.10 · El buzón, construido el 2026-08-29 — y las tres cosas que decidió

**`V20__el_buzon_de_solicitantes.sql`, paquete `com.lajuanita.backend.solicitante`,
pantalla `/admin/buzon`.** Suites al cerrar esa tanda: **518 backend · 393 front ·
198 + 51 SQL** sobre 20 migraciones. (Al cierre de la Fase 2, el 2026-08-30, son
**536 · 411 · 198 + 51**.) Lo que §9.4 dejaba dicho se respetó entero —tabla y no
notificación, un solo buzón, la contraseña por WhatsApp— y lo que hubo que
decidir arriba de eso es esto:

**1 · El formulario de equipos entra también** (Ignacio, 2026-08-29). §9.4 nombraba
tres flujos y la landing tiene **cuatro** formularios: el de consulta de equipos
existía y era igual de mudo. El circuito es idéntico hasta el final, que es
`/admin/ventas`. Costó un valor más en el enum y cierra el hallazgo #7 entero en
vez de dejar un formulario sin destino.

**2 · No se escribe una notificación por cada ficha que entra.** §9.4 usaba el par
*"tabla + notificación que la anuncia"* de `V13` como modelo, y la segunda mitad
quedó afuera **a propósito**: este es el único escritor público del sistema, así
que un aviso por formulario es un aviso por cada bot, multiplicado por cada ADMIN
y STAFF — exactamente el modo de falla que `AvisoService` tiene escrito en su
cabecera. Y no hace falta para lo que el buzón garantiza: §9.4 dice que lo que
evita perder gente es **que quede la lista**. Si con el uso resulta que hay que
avisar, la forma correcta es un aviso del disparador —*"hay 3 fichas sin contestar
hace más de 48 horas"*—, que es uno por hecho y no uno por formulario. **Está
anotado acá para que no se lea como un olvido.**

**3 · Convertir tiene dos caminos, y el segundo no es un borde raro.** Un alumno
que cursa hace un año y pide la cabina desde la web llega con una ficha cuyo mail
**ya tiene cuenta**. Con un solo camino esa ficha choca contra
`usuario_email_unico` y queda trabada para siempre, o se descarta como si el
pedido no valiera. Los dos terminan igual —ficha CONVERTIDA apuntando a una
cuenta—, y lo único que cambia es si hay contraseña para pasar por WhatsApp:
`passwordTemporal` viene **null** en el segundo y la pantalla lo dice, porque un
campo vacío ahí deja a quien atiende esperando un dato que no existe.

> ⚠️ **Lo que la landing tiene que mandar, para la tanda que sigue.**
> `POST /api/solicitantes`, público, sin credencial:
> `nombre`, `apellido`, `email`, `telefono` (**los cuatro obligatorios**),
> `interes` (`CURSO` · `ALQUILER_CABINA` · `GRABACION_SET` · `EQUIPOS` · `OTRO`),
> y opcionales `detalle` —el resto del formulario armado en texto por la landing,
> *"Programa DJ · presencial · sin experiencia"*— y `mensaje`.
>
> **Dos cosas que obligan a tocar los formularios y no solo el `onSubmit`:**
> hoy piden *"Nombre y apellido"* en **un** campo y acá son dos (es la lección de
> `V4`: partir después es adivinar dónde termina el nombre), y el teléfono
> **es obligatorio** — la contraseña temporal viaja por WhatsApp, así que una
> ficha sin teléfono no se puede convertir, y enterarse al querer atenderla es
> tarde.

### 9.8 · El alta de pagos acepta los cuatro destinos (hallazgo #4) — HECHO

**Construido el 2026-08-29, junto con el front de `V19` y no después.** Son la
misma pantalla: rehacer el formulario de pago para aceptar un pagador externo
(`V19`) y para aceptar los cuatro destinos (#4) es un solo trabajo, y separarlos
habría significado rehacerlo dos veces — exactamente lo que §6 dice del rediseño.

**Lo que faltaba era la pantalla, no la API.** `pago_tiene_destino` pide *uno* de
los cuatro desde `V1`, y `AltaPagoRequest` los aceptaba todos. El formulario era
alumno → sus cursos, y la consecuencia estaba escrita en el propio código: *"una
venta cargada sin cobro no tiene después por dónde cobrarse"*.

**"Qué salda" va primero porque decide el resto del formulario**, y en un caso
decide una regla:

| Destino | Quién paga |
|---|---|
| **Un curso** | El alumno, y **no se pregunta** |
| Una reserva · un trabajo de M&M · una venta | Libre: cuenta **o** nombre escrito |

Que un curso solo se salde a nombre del alumno no es una comodidad de la pantalla:
una `inscripcion` cuelga de un `alumno`, que cuelga de un `usuario`, así que un
pago externo se acreditaría en una cuenta que no es de nadie. El backend lo
rechaza con ese mismo argumento, y la pantalla lo dice en una línea en vez de
dejar mandar un pedido que va a fallar.

**El picker de reservas usa una ventana de 60 días** (45 atrás, 15 adelante),
porque la agenda del backend corta en 62. No es una limitación de esta pantalla:
es la del endpoint, y conviene saberlo antes de que alguien busque una reserva de
hace tres meses y no la encuentre.

### 9.9 · El comprobante de la seña (hallazgo #5) — HECHO

**Construido el 2026-08-29.** Sin migración: `pago.comprobante_path` existe desde
`V1` y el alta manual de `/admin/pagos` ya lo usaba. Lo que faltaba era el campo
en `AltaSenaRequest` y en `AprobacionRequest`, así que **este camino dejaba la
columna siempre en NULL**.

**Toca los dos lugares donde nace una seña**, no uno:

| Dónde | Por qué importa |
|---|---|
| `/admin/reservas` — alta con seña | Un alquiler que se paga por transferencia entraba sin respaldo |
| `/admin/solicitudes` — aprobar un pedido | **Es el que más importa**: la persona pidió por el portal, transfirió, y quien aprueba está mirando esa transferencia. El respaldo se perdía en el momento mismo en que existía |

**Es opcional a propósito.** Una seña en efectivo no tiene comprobante, y
exigirlo dejaría media caja sin poder cargarse. Hay un caso por cada lado —que
llega cuando se manda, y que la carga entra igual cuando no—, porque un campo
opcional mal escrito rompe el camino común y no el nuevo.

### 9.5 · El admin puede cambiarse el nombre (§5 #1) — CERRADO

**Sí puede.** Micaela es una persona y puede cambiarse el apellido. Lo que falta
es otra cosa: **que la pantalla diga que es admin.** Eso es front puro —
**grupo A**, entra en la pasada de diseño, no antes.

El mail sigue sin cambiarse, y eso ya estaba resuelto desde el Módulo 4: es la
credencial de acceso y no hay forma de verificar una nueva.

### 9.6 · El suite tenía tests flaky — **RESUELTO el 2026-08-30**

**No era un test: eran dos techos de tiempo, y ninguno tenía que ver con la
aplicación.** La suite no tenía margen bajo carga.

**Lo primero que hubo que corregir fue el método.** Este documento decía *"no se
persigue a mano: a 1 de 10, correr el suite localmente sale más caro que
esperarlo"*, y era cierto **mientras el rediseño estuviera lejos**. Con la Fase 3
arrancando la cuenta se da vuelta: quince minutos de CPU contra semanas leyendo
rojos ambiguos. Pero repetir la suite no alcanzaba —**8 corridas seguidas dieron
8 verdes**— y el dato que explicaba por qué ya estaba anotado acá sin que nadie lo
usara: la corrida que falló aquel día tardó **232,95 s** contra **179,35 s** de una
que pasó, mientras que estas ocho tardaron **59–91 s**. **La máquina estaba
demasiado descargada para reproducir nada.**

Con `mvn test` del backend corriendo encima y los workers al doble
(`--maxWorkers=16`), el 1-de-10 pasó a ser **4 de 5 corridas en rojo**, y las
fallas cambiaban de nombre en cada una — la firma de un problema de tiempo global,
no de un caso mal escrito. Los dos techos:

| Familia | Cómo falla | Quién corta |
|---|---|---|
| **~1,3 s** | `EgresosPagina`: *"Unable to find role=button name=Anular"* | El **`asyncUtilTimeout` de Testing Library: 1000 ms**, contra el `setTimeout(cargar, 250)` que comparten **diez pantallas de listado** |
| **~5 s** | `SubirMaterialPagina`, `InscripcionesPagina`: *"Test timed out in 5000ms"* | El **`testTimeout` de vitest**, comido por `userEvent` completando un formulario |

**El arreglo son dos líneas y no toca ningún caso**: `configure({ asyncUtilTimeout:
5000 })` en `src/pruebas/preparar.ts` y `testTimeout: 20_000` en
`vite.config.ts`. Va en el setup compartido y no en los casos que fallaron porque
**la causa es estructural** — diez pantallas comparten el debounce, así que
arreglar los tres que cayeron hoy deja a los otros esperando su turno.

⚠️ **La relación entre los dos números es parte del arreglo.** El techo asíncrono
tiene que quedar bien por debajo del techo del caso: si se igualaran, un elemento
que no aparece nunca se comería el timeout entero y el reporte diría *"Test timed
out"* en vez de *"Unable to find role=button name=Anular"* con el DOM impreso al
lado. Ese mensaje es la mitad del valor de estos tests **justo cuando la Fase 3
empiece a romperlos a propósito**.

**Y lo que no se hizo, que es lo que §6f prohíbe**: ni un `data-testid`, ni una
aserción aflojada. Cada caso sigue preguntando por el mismo texto visible; solo
espera más antes de rendirse. Un test que de verdad se cuelga sigue fallando, 15 s
más tarde.

**Verificado invirtiendo el experimento**: bajo la misma carga que había dado 4 de
5 en rojo, **5 de 5 en verde**, 417/417.

> **Lo que queda para la próxima vez que algo sea "flaky": el resultado de repetir
> no sirve si no reproducís las condiciones.** Ocho verdes seguidas parecían
> descartar el problema y solo probaban que la máquina estaba libre. El dato que
> lo destrabó fue una duración anotada al pasar meses antes.

### 9.7 · La seña para inscribirse NO es una regla del sistema

Se descubrió escribiendo esto que **`inscripcion` no exige ningún pago**: `V10`
obliga a que toda *reserva* tenga plata detrás, pero hoy se puede crear una
inscripción con cero pesos y nada la frena.

**Decisión de Ignacio: queda así, es una regla de negocio y no del sistema.**
Micaela puede hacer alumno a quien quiera; lo que define a un alumno *oficial* es
estar inscripto.

Y el esquema ya expresa eso sin necesitar nada: **`alumno` es una relación e
`inscripcion` es el curso**, así que se puede tener la relación sin ninguna
inscripción — `demo-julieta` en la base de demo es exactamente ese caso.

> Queda escrito acá **para que no se "descubra" de nuevo dentro de seis meses y
> alguien la implemente creyendo que es un olvido.** Es el mismo patrón que ya
> pasó tres veces en este proyecto (`V16`, la regla de §8 del Módulo 5, el
> contrato del sello): una regla que nadie implementó no tiene nada que fallar.
> La diferencia es que esta **no se quiere** implementar.

---

### 9.11 · Solicitar reprogramación, construida el 2026-08-29

**Sin migración**: `solicitud_reprogramacion` existe desde `V1` y su candado de *"una
solicitud resuelta es final"* desde `V13` — que se lo puso **antes de que existiera
nadie que escribiera en ella**. Este es su primer escritor, dos etapas después.

**P9 se contestó primero, como en los Módulos 6, 7 y 8** — es la cuarta vez que ese
orden evita frenar a mitad de camino. Ignacio: **el profesor pide con el mismo botón que
el alumno.** El detalle está en `platform.md` §16, que es donde viven las decisiones.

**Lo que decidió, y el orden importa porque cada una sale de la anterior:**

**1 · Aprobar mueve la clase EN EL LUGAR.** Este sistema tiene dos formas de mover una
reserva y no son sinónimos: *editarla* —la misma fila cambia de día, lo que hace el
calendario— y *reemplazarla* —la original pasa a REPROGRAMADA y nace otra que la apunta,
que es el modelo de **recuperación** de P2, para la clase que **no se dictó**—. Un pedido
de reprogramación es lo primero: nadie faltó, la clase se corre.

> ⚠️ **Y elegir lo segundo habría creado un problema de plata que no tiene por qué
> existir.** Una reserva REPROGRAMADA deja de deber seña (`V11`) y la nueva la debe, así
> que **mover un alquiler de cabina pasaría a ser cobrar de nuevo y devolver lo
> cobrado**: dos movimientos de caja por una mudanza. Moviéndola en el lugar, la plata ni
> se entera. Hay un caso de la suite que fuerza el chequeo diferido de `V10` después de
> mover un alquiler — si alguien cambia el enfoque, ese caso se cae, que es para lo que
> está.

**2 · Acá NO se aprueba "tal como se pidió", y lo impone la tabla.** El pedido de sala se
aprueba exactamente como llegó; `fecha_alternativa_solicitada` es un `DATE` **opcional**,
sin hora y sin sala, así que no alcanza para crear nada. La diferencia de fondo es quién
puede saber qué: el que pide una cabina elige una franja libre que el portal le muestra;
el que pide mover su clase no puede saber qué sala queda libre ni de qué profesor
depende. **Por eso aprobar es un formulario con la franja nueva y no un botón** — y el
backend rechaza aprobar dejando el mismo horario, porque un pedido resuelto sin
movimiento no le avisa a nadie y deja a la persona esperando.

**3 · Al aprobar llega un solo aviso, y es el de que la clase se movió.** Mover ya avisa
por su cuenta, diciendo de dónde a dónde. Un segundo aviso por el mismo hecho es lo que
entrena a la gente a ignorarlos. **El rechazo sí avisa** (`REPROGRAMACION_RECHAZADA`), con
el motivo adentro: ahí no se movió nada, así que sin el aviso la persona no se entera.

**4 · "Mía" son tres caminos.** Estar anotado, haberla pagado —los dos que ya usan el
portal y `V12` para encontrar la plata detrás de una reserva— **o ser el profesor de esa
clase**. El tercero vive en el servicio y **no** se agregó a `ReservaRepository.deLaPersona`:
ahí haría que las clases que dicta le aparezcan entre "sus reservas" como si fuera el
cliente de ellas.

**5 · No hay pantalla "mis pedidos de cambio".** El estado del pedido se muestra sobre la
clase, en las dos pantallas, con el mismo componente (`PedirOtroDia`): un pedido de mover
algo no se entiende sin la cosa que se quiere mover, y una lista aparte obligaría a
cruzar dos pantallas para saber si el martes sigue siendo el martes.

**6 · Y una que quedó afuera, anotada para que no parezca olvido:** el enum tiene **tres**
estados y no cuatro. `solicitud_reprogramacion` no acepta CANCELADA desde `V1`, así que el
que se arrepiente avisa y administración rechaza. Agregarla es una migración para algo que
el alcance nunca pidió.

---

### 9.12 · Los formularios de la landing, conectados el 2026-08-30

**Cierra el hallazgo #7 y la Fase 2 entera.** Los tres formularios de captación
—programa, cabina/grabación, equipos— mandan a `POST /api/solicitantes` y del otro
lado son una ficha en `/admin/buzon`. Verificado de punta a punta contra el
backend real, con el `Origin` de la landing: preflight 200 y alta 201, con los
acentos y el `·` del detalle intactos.

**1 · La trampa que casi hace fallar todo en silencio: la CSP.** Este sitio
declara `connect-src 'self'`, así que un `fetch` a otro origen lo **bloquea el
navegador sin mostrar nada en la página** — se ve idéntico a un backend caído. El
origen de la API entró en la CSP, y **se saca de la misma variable de entorno que
usa el cliente** (`NEXT_PUBLIC_API_URL`) a propósito: escritas por separado, el día
que la API cambie de dominio el síntoma es un formulario que no responde y nadie
sabe por qué. Son tres piezas que tienen que estar de acuerdo —la variable, la CSP
y `CORS_ORIGENES` del backend— y están anotadas juntas en el `CLAUDE.md` de la
landing.

**2 · El "listo" ahora sale sólo si el envío salió bien.** Era el agujero: durante
tres semanas el formulario contestaba *"listo, lo recibimos"* sin mandar nada. El
envío vive en `FormShell` —una sola vez, no cuatro— y si falla muestra el mensaje
que vino de la API **y deja el formulario como estaba**, con lo que la persona
escribió adentro.

**3 · "Nombre y apellido" se partió en dos campos**, en los tres formularios. Es la
lección de `V4` aplicada a tiempo: allá hubo que partir una columna adivinando
dónde terminaba el nombre. Y el teléfono quedó obligatorio, que ya lo era en la
API por una razón de negocio: la contraseña temporal viaja por WhatsApp.

**4 · `/ingresar` resultó no ser un formulario, y esa es la decisión de la tanda.**
El plan decía "conectar el login". Al ir a hacerlo apareció el problema de fondo:
**una sesión iniciada en la landing no se le puede entregar a la plataforma** —son
dos apps en orígenes distintos y `localStorage` no se comparte, así que el token
quedaría de un lado sin ninguna pantalla que lo use—. Las dos salidas conocidas son
peores que el problema:

- **Pasar el token por la URL**: queda en el historial, en el `Referer` y en
  cualquier extensión. Es el patrón que la industria abandonó, y no es coherente en
  un sistema que se toma el trabajo de que las tres formas de fallar un login
  tarden lo mismo.
- **Apostar a que las dos apps queden en el mismo dominio**: es exactamente la
  decisión de hosting de octubre, que no está tomada.

Así que `/ingresar` quedó como **la puerta**: dos accesos a la plataforma —iniciar
sesión y crear cuenta—, que funcionan con cualquier forma de deploy. **Y se fue el
"olvidé mi contraseña"**, que no existe ni puede existir sin correo: ofrecerlo
mandaba a la persona a una puerta que no abre.

> Si en octubre se decide mismo origen, convertir la puerta en un formulario de
> verdad es un cambio chico. Desarmar un login que ya entrega mal la sesión no lo es.

⚠️ **Publicar la landing sigue bloqueado, y ya no por código**: los precios
inventados, las seis notas del blog y los perfiles reales de Instagram y YouTube.

### 9.13 · Los comprobantes, construidos el 2026-08-30 — y por qué son una tabla

**`V21__los_comprobantes_de_un_pago.sql`, `ComprobanteService`, y las tres
pantallas que los muestran.** No sale de la lista del testeo sino de
[`pendientes.md`](pendientes.md) §3.3: **la deuda más vieja del Módulo 3**, abierta
desde agosto, que dejó de estar bloqueada el 2026-08-20 cuando el Módulo 7
construyó el `StorageService` que §2.4 declaraba desde el primer día.

**Lo que había era peor de lo que parecía en la lista.** `pago.comprobante_path`
era un campo de texto del formulario: alguien escribía *"transferencia.pdf"* y **no
había ningún archivo en ninguna parte**. O sea que el sistema mostraba respaldo
donde no lo había — el mismo modo de falla que el ensayo de restore del 2026-08-20
probó desde el otro lado.

**La pregunta de negocio se contestó antes de escribir código** (Ignacio,
2026-08-30), que es lo que el grupo C de §4 pide y la quinta vez que ese orden
paga. La pregunta: *si se adjunta el comprobante equivocado y se marca inválido
—que es la regla dura de §6—, ¿dónde va el correcto?* Con una sola columna no hay
lugar: hay que pisar el que está, y **pisarlo borra la firma de `V7`**, o sea que
el mecanismo que existe para dejar rastro se convierte en el que lo borra.

**Respuesta: varios comprobantes por pago.** El equivocado queda listado como
inválido con quién lo marcó y por qué, y el correcto se suma al lado. Es el mismo
criterio con el que en este esquema no se borra ni un pago, ni una clase, ni un
contrato que respalda algo publicado: **lo que alguien firmó no lo pisa la
operación siguiente.**

Lo que decidió, además de la tabla:

- **`V21` §3 es la mitad que estuvo a punto de faltar**, y es la forma exacta de lo
  que `V18` §1b encontró en el sello: una tabla de comprobantes no compra nada si
  la fila se puede editar. Cambiar `archivo_path` es la columna pisada con más
  pasos, y volver `invalido` a FALSE deshace una firma sin dejar rastro. **Desde
  adentro de "no se borra, se marca" no se ve la otra mitad: que la marca tampoco
  se borre.**
- **Los cinco campos viejos de `pago` se van, no se dejan al lado.** Dos columnas
  que contestan *¿este pago tiene comprobante?* son dos lugares donde mirar y uno
  que se va a quedar viejo — la deuda que este proyecto ya paga dos veces y tiene
  anotada. **Y los valores no se migran**: eran texto tipeado, así que copiarlos
  fabricaría respaldo inexistente. La migración imprime un NOTICE con los ids en
  vez de descartarlos en silencio.
- **Adjuntar es un segundo pedido, y por eso dos altas cambiaron de respuesta.** Un
  archivo no viaja en un JSON, así que el alta de una reserva con seña y la
  aprobación de un pedido de sala ahora devuelven **el id del pago que crearon**
  (`ReservaCreada`, `AprobacionRealizada` — el molde de `ConversionRealizada`). Sin
  eso, §9.9 se caía: el respaldo se vuelve a perder en el momento en que existe,
  que es el argumento entero de aquel hallazgo. **No se le agregó un campo opcional
  a `ReservaResumen`**: ese record también dibuja la agenda, donde vendría siempre
  en null y *"null"* se leería como "esta reserva no tiene seña".
- **El `Content-Type` sale del archivo y no de un valor fijo.** `ContratoController`
  contesta siempre `application/pdf`, que alcanzaba mientras el único archivo del
  sistema fuera un contrato escaneado; **la mitad de los comprobantes son fotos de
  una transferencia**, y bajarlas como PDF le deja al alumno un archivo que no abre
  nada. `TipoDeArchivo.porClave` lo deduce de la clave que escribió el sistema.
- **El alumno baja el suyo por `/api/me/comprobantes/{id}`**, no por el endpoint de
  administración con un permiso más flojo: el id del dueño sale del token y el
  ajeno contesta *"no existe"*. Cierra la tercera de las tres cosas que el Módulo 4
  dejó dichas en pantalla en vez de omitidas.
- **Editar un pago no toca su respaldo.** El comprobante salió del formulario de
  corrección: es un archivo con su propia firma, no un campo.

**Y una trampa de Hibernate que costó dos casos rojos**: colgar el comprobante solo
del lado dueño guarda bien la fila, pero **el pago que ya está en la sesión sigue
mostrando la lista vieja** — adjuntar y volver a leer el pago en la misma
transacción devolvía cero comprobantes. `Pago.agregarComprobante` pone las dos
puntas.

Suites al cierre: **549 backend · 419 front · 205 + 56 SQL**, sobre 21 migraciones.

---

## 10. El plan de acción

> Acordado el 2026-08-28. **El orden no es "bugs → diseño" sino "esquema →
> backend → diseño"**, y el argumento es de §6: un rediseño hecho dos veces es el
> caro. Los hallazgos #4, #5 y #6 **le agregan campos y controles** a
> `/admin/pagos`; diseñar esa pantalla y después meterle destino libre,
> comprobante y edición es diseñarla dos veces. Los arreglos cambian *qué hay* en
> la pantalla; el diseño cambia *cómo se ve*. En ese orden, cada pantalla se toca
> una vez.

### Fase 0 · Congelar y preparar

| | Qué | Estado |
|---|---|---|
| 0.1 | **Fecha de corte de la lista** | ✅ Una a dos semanas → ~2026-09-11 (§6) |
| 0.2 | Contestar las preguntas de negocio | ✅ Hecho — §9 |
| 0.3 | Reproducir el hallazgo #8 ("Anotando…") | ✅ **HECHO el 2026-08-30** — no hizo falta reproducirlo: estaba en el código. §8.1 |
| 0.4 | El test flaky | ✅ **HECHO el 2026-08-30** — eran dos techos de tiempo, no un test. §9.6 |

### Fase 1 · `V19` — una sola migración

Las dos cosas tocan `pago`, así que van juntas: **una revisión de las reglas de
esa tabla en vez de dos, y una migración en vez de dos.** En un esquema donde las
migraciones son inmutables y se acumulan, eso no es prolijidad.

1. **9.1** — `pago.id_usuario` opcional + CHECK, y **los cinco lugares a revisar**
2. **9.3** — editar un pago, con trigger de autor (molde `V7` §2)

> ✅ **CERRADA el 2026-08-29.** Migración, backend (los cinco lugares revisados; tres
> tenían el modo de falla que §9.1 anticipaba) y front. Suites: **500 backend /
> 189+51 SQL / 382 platform.** El front se hizo junto con el hallazgo #4 (§9.8),
> que es la misma pantalla.

### Fase 2 · Backend sin tocar el esquema

> ✅ **CERRADA ENTERA el 2026-08-30.** Suites al cerrarla: **536 backend · 411
> front · 198 + 51 SQL** (después crecieron con `V21` — ver §9.13). Lo único que
> queda del plan es la Fase 3.

De más barato a más caro:

| Orden | Qué | Tamaño |
|---|---|---|
| ~~2.3~~ | ~~**#4** pago de un no-alumno~~ | ✅ **HECHO el 2026-08-29** — se hizo junto con el front de `V19`, porque son la misma pantalla (§9.8) |
| ~~2.1~~ | ~~**#5** comprobante al aprobar seña~~ | ✅ **HECHO el 2026-08-29** (§9.9) |
| ~~2.2a~~ | ~~**9.4** buzón de solicitantes~~ | ✅ **HECHO el 2026-08-29** — `V20`, paquete `solicitante`, `/admin/buzon`. Ver §9.10 |
| ~~2.2b~~ | ~~**9.4** conectar los formularios de la landing~~ | ✅ **HECHO el 2026-08-30** — y con él `/ingresar`, que resultó no ser un formulario. Ver §9.12 |
| ~~2.4~~ | ~~**#2 + §5 #3** solicitar reprogramación~~ | ✅ **HECHO el 2026-08-29** — sin migración: la tabla y el trigger estaban desde `V1` y `V13` esperando su primer escritor. Ver §9.11 |

*(La vieja 2.3 —disponibilidad al pedir— se cayó por §9.2.)*

> ⚠️ **El título de esta fase quedó a medias y conviene saberlo:** el buzón **sí
> tocó el esquema** (`V20`, tabla nueva) — ya estaba anotado como *"tabla nueva"*
> cuando se planificó, así que no fue una sorpresa, pero por el triage de §4 era
> grupo **C** y no B. Se hizo con la disciplina completa que el grupo C pide:
> preguntas de negocio contestadas antes de escribir código, y casos en las dos
> suites. Lo que queda de la fase (2.2b y 2.4) sí es backend sin esquema.

### Fase 3 · El diseño, una sola pasada

> **Es lo único que queda del plan.** Las fases 0, 1 y 2 están cerradas enteras
> (2026-08-30), y el punto 3.3 de [`pendientes.md`](pendientes.md) —los
> comprobantes— también. **No falta backend, ni infraestructura, ni decisiones de
> negocio**: lo que sigue es diseño.
>
> ⚠️ **Esto decía "arranca cuando se congele la lista (~2026-09-11), no antes", y
> quedó superado el 2026-08-31**: Ignacio adelantó el rediseño y canceló lo que
> quedaba del testeo, así que **ese corte no va a existir**. Se conserva escrito
> porque el argumento sigue en pie y es el costo que se asumió: un rediseño hecho
> dos veces es el caro, y si más adelante aparece un hallazgo de grupo B o C sobre
> una pantalla ya rediseñada, esa pantalla se toca de nuevo. **Es una deuda
> aceptada, no un olvido.**

#### Lo que hay hoy, contado de verdad

| | |
|---|---|
| **Componentes** | **22 exportados en 15 archivos** de `componentes/` |
| **Pantallas** | **36** en `paginas/` |
| **Tokens** | `index.css`, ya con la decisión tomada y con la trampa del rojo documentada adentro |
| **Suites que lo cuidan** | 419 casos de front, 549 de backend, 205 + 56 de SQL |

Los 22, agrupados por lo que son —que es como conviene rediseñarlos, no de a uno:

- **Acción y formulario:** `Boton`, `Aviso`, `Campo`, `CampoSelect`
- **Tabla:** `Tabla`, `Celda`, `FilaVacia`
- **Estructura de pantalla:** `CabeceraDePagina`, `Paginado`, `EstadoVacio`, `Etiqueta`
- **Diálogos que piden algo escrito:** `PedirMotivo`, `PedirOtroDia`
- **De dominio:** `DetalleDeCuenta`, `Comprobantes`, `AdjuntarComprobante`, `Semaforo`, `Abanico`
- **Permisos:** `AvisoSoloLectura` (+ el hook `usePuedeEscribir`)
- **Gráficos:** `BarrasHorizontales`, `Dona`, `Medidor`

> Este inventario ya estuvo desactualizado una vez —decía 13 componentes y 34
> pantallas, de antes de las tandas del 29 y el 30 de agosto—. **Si volvés a
> tocarlo, contá los archivos en vez de copiar el número.**

#### ✅ Estado al 2026-08-31 — 3.1 y 3.2 cerradas; queda la 3.3

> **Ignacio decidió adelantar la Fase 3 y cancelar lo que quedaba del testeo**
> (2026-08-31). Queda dicho para que nadie busque la lista congelada del 11/09:
> no va a existir. El costo asumido es el que §6 anticipaba — si más adelante
> aparece un hallazgo de grupo B o C sobre una pantalla ya rediseñada, esa
> pantalla se toca dos veces.

**Lo que apareció al arrancar reordenó la fase: el sistema de diseño estaba
escrito y nunca se había adoptado.** Los componentes existían, cada uno con su
docstring diciendo *"esto hoy está repetido a mano en diez pantallas"* — y la
migración no había ocurrido nunca. `Tabla`, `Celda` y `FilaVacia` tenían **cero**
usuarios contra 11 tablas escritas a mano; `usePuedeEscribir`, cero contra 12
repeticiones del predicado; `CabeceraDePagina`, 2 de 36.

Así que la 3.1 no fue "repintar los componentes": fue **adoptarlos**. Que es
exactamente lo que hace que el rediseño sea una sola pasada — cambiar `Tabla` una
vez cambia 11 tablas.

| | Antes | Ahora |
|---|---|---|
| `Tabla` · `Celda` · `FilaVacia` | 0 | **11 tablas · 61 celdas · 5 filas vacías** |
| `CabeceraDePagina` | 2 | **35 de 36** |
| `EstadoVacio` | 2 | **16** |
| `AvisoSoloLectura` | 0 | **14** |
| `usePuedeEscribir` | 0 | **14** |
| `Boton` | 29 | 34, con la variante `enlace` que faltaba |
| `Etiqueta` | 4 | 11 |
| `bg-white` sueltos | 122 | **0** — token `--superficie` |
| colores fuera de paleta | 14 | **0** |
| `uppercase` a mano | 46 | 4, y son el logotipo |
| `<h3 … font-semibold>` a mano | 35 | **0** — es `.t-seccion` |

Tokens nuevos: `--superficie`, `--superficie-2`, `--sombra-flotante` y `.t-dato`.
**`--superficie-2` ES el papel y no un cuarto tono** —un hueco hundido en la
tarjeta deja ver el fondo—, así que la paleta sigue siendo de tres tintas.

**La barra superior salió** (era la decisión pendiente). Contenía sólo *"Hola, X"*
y el chip de rol: una franja fija en las 36 pantallas para dos datos que nadie
mira dos veces. El saludo pasó al Inicio, donde §11 lo puso; el rol, al pie del
sidebar. **La consecuencia es de jerarquía y es la que importa: el título de cada
pantalla es ahora el `<h1>` de verdad**, en vez de un `<h2>` bajo un `<h1>` que
decía "Hola, Ignacio". `CabeceraDePagina` pedía revisar eso "de una vez, no de a
una", y eso se hizo.

**La 3.2 está construida**: `InicioPagina` ya no es la pantalla de diagnóstico de
la Fase 0 —que además mentía: decía *"todavía no hay módulos"* con los ocho
cerrados—. Está armada contra §11, con los once endpoints verificados, y suma
**13 casos** que fijan sus decisiones: qué ve cada perfil, las tarjetas vacías que
se muestran, y **que un bloque que falla no vacía la pantalla**. Ese último es el
que más importa: son hasta nueve pedidos en paralelo y, con un solo estado de
error, un endpoint caído dejaría la primera pantalla del sistema en blanco para
todo el mundo.

**Cuatro cosas que encontró la pasada, ninguna cosmética:**

1. **Había columnas de pesos alineadas a la izquierda** — Deudores, Egresos,
   Ventas y las dos tablas del estado de cuenta. Es el defecto exacto contra el
   que `Celda` fue escrita.
2. **El ámbar de `SelloPagina` caía sobre 3 de los 5 estados de un release**, dos
   de los cuales no le piden nada a nadie. No era paleta: el sistema decía
   "atención" cuatro veces por pantalla, que es cómo el rojo del que sí importa
   deja de saltar.
3. **Un test rojo que aparecía siete días al año.** `CajaPagina` compara el rango
   por defecto (`hoy() − 30`) contra el atajo *"Este mes"*: los 31 de enero,
   marzo, mayo, julio, agosto, octubre y diciembre **dan la misma fecha**, no
   cambia el estado, no se dispara el pedido y los dos casos que verifican eso se
   caen solos. Arreglado fijando el `hoy()` que ve la pantalla.
4. **⚠️ El flaky de §9.6 no estaba del todo cerrado, y la mitad que faltaba es de
   otra especie.** Ver abajo.

##### El flaky que quedaba: `findByLabelText` espera el `<select>`, no sus opciones

Reproducido con `--maxWorkers=16` en `ReservarPagina`, `SubirMaterialPagina` y
`VentasPagina` — **y también sobre el árbol sin tocar**, así que no lo trajo el
rediseño. Falla 1 de cada 2 corridas bajo carga y ninguna con la máquina libre.

La causa: estos `<select>` se renderizan **vacíos** desde el primer frame y se
llenan cuando vuelve el catálogo. `findByLabelText` espera a que exista el
elemento, que existe enseguida; entonces `userEvent.selectOptions` **no
reintenta** y tira `Value "6" not found in options` de una.

**Por eso §9.6 no lo alcanzaba: aquello eran techos de tiempo, y acá no hay
ninguna espera que agrandar.** Los casos que se colgaban 20 s eran el mismo
problema con otra cara — al no poder elegir, el formulario nunca se completaba y
el caso moría contra el `testTimeout`.

Arreglado con `src/pruebas/elegir.ts`, que espera **la opción** y no el select, y
los **58** llamados migrados. Verificación: 3 de 3 corridas verdes bajo carga,
contra 2 de 4 rojas antes en la misma condición.

> Un apunte que queda abierto: usar `head` sobre la salida de vitest corta el
> resumen y muestra un render intermedio. Dos veces leí "32 archivos / 348 casos"
> y lo tomé por truncamiento; el `Errors 3 errors` estaba abajo. **Para el
> resumen de vitest va `tail`.**

**Suites al cerrar: 432 de front** (419 + 13 del Inicio), 549 backend, 205 + 56
SQL. Typecheck, los dos linters y el build, limpios.

**Lo que queda de la fase es la 3.3, la recorrida por rol** — con el inventario de
`menu.ts` que está más abajo. Y dos cosas chicas anotadas a propósito: la grilla
de ocupación del Tablero **no usa `Tabla` y no es deuda** (es un mapa de calor, no
un listado), y el vacío del calendario **no es un `EstadoVacio`** porque la grilla
de la semana ya está dibujada y la frase aclara en vez de rescatar.

#### ⏸ Sesión del 2026-08-31 (noche) — el rediseño de verdad, a mitad

> **Ignacio vio el sistema andando y el veredicto fue: *"le falta diseño, un
> montón, sigue el blanco de antes, como que sigue re default, nada que ver con
> la landing"*.** Es correcto y era esperable: **lo que la 3.1 hizo fue ADOPTAR el
> sistema de diseño, no repintarlo.** Los tokens eran los mismos de antes; lo que
> cambió es que ahora hay un solo lugar donde tocarlos. Antes, repintar eran 122
> `bg-white` a mano, 11 tablas cada una a su manera y 46 estilos tipográficos
> sueltos. **No se empieza de 0: la adopción es exactamente la palanca que hace
> barata esta pasada.**

**Por qué se veía "default", diagnosticado — y ninguna de las tres razones era
"porque es claro":** no había profundidad ni jerarquía (todo tarjeta blanca sobre
papel casi blanco con un borde de 1px), la marca no aparecía en ningún lado (el
abanico sólo en estados vacíos, el wordmark nunca), y el rojo sólo salía en
errores, así que el sistema no tenía acento — tenía alarmas.

##### Las tres decisiones que tomó Ignacio

1. **Shell oscuro + lienzo claro.** La decisión vieja escrita en `index.css`
   —todo claro porque se mira ocho horas por día— **valía para la superficie de
   trabajo y no para la navegación, que no se lee: se recorre.** Partirlo deja
   entrar la marca por el shell, donde no le compite a ningún dato, y deja el
   lienzo claro, que es lo que no cansa cargando alumnos.
2. **El menú se agrupa por dominio.** "Administración" eran **18 ítems corridos
   bajo un solo título, en orden de construcción de los módulos** — el orden en
   que se fueron agregando, no en el que alguien los usa. Nadie navega "el módulo
   6": navega "necesito cobrar".
3. **Login en la landing, con mismo origen.** Ver más abajo: la parte difícil no
   es el formulario.

##### Hecho y verde (432/432, ambos typechecks, ambos linters, build)

- **Tokens del shell** en `index.css`: `--shell`, `--shell-texto`,
  `--shell-tenue`, `--shell-linea`, `--shell-activo`, más `--sombra-tarjeta` para
  la profundidad del lienzo (aplicada en **61** superficies). Los tonos sobre
  tinta salen de la misma medición que la landing (QA-06): 0,56 de hueso sobre
  `#0a0a0b` da 4,9:1 y pasa AA; por debajo de 0,52 no. Y como allá, **hay UN solo
  tono apagado y no tres casi iguales**: la jerarquía la lleva la tipografía.
- **`Layout.tsx` reescrito**: sidebar en tinta, con el abanico y el wordmark — la
  marca aparece por primera vez fuera de los estados vacíos. Ítem activo con
  barra roja a la izquierda (el rojo como bisturí, uno solo por pantalla). El
  borde va siempre, transparente cuando no está activo, **para que el texto no se
  corra dos píxeles al navegar**. La columna es `sticky h-screen`: con siete
  grupos, un ADMIN tiene más menú que pantalla.
- **`menu.ts` en 5 dominios**, no 6 como se había dibujado. Dos ajustes que
  aparecieron al agruparlo de verdad: **el buzón de la web no va en "Servicios"
  sino primero en "Personas"** —su propio comentario dice que es lo primero que se
  mira a la mañana, y conceptualmente es de donde salen las personas nuevas— y
  **Mix & Mastering solo quedaba como grupo de uno**, así que va con el Sello (son
  las dos patas de disco contra la pata de academia). Los grupos siguen las
  líneas del negocio y **no la numeración de los módulos**: por eso Venta de
  equipos cae en Dinero.

  | Grupo | Ítems |
  |---|---|
  | Personas | Buzón de la web, Alumnos, Inscripciones, Personas |
  | Salas y agenda | Calendario, Pedidos de sala, Pedidos de cambio, Salas bloqueadas, Uso de salas |
  | Dinero | Pagos, Caja, Deudores, Egresos, Venta de equipos |
  | Sello y mastering | Mix & Mastering, Sello, Artistas |
  | Dirección | Tablero |

  Los 21 casos de `menu.test.ts` pasaron sin tocarlos: prueban predicados, no
  estructura.
- **⚠️ Un `<button>` a mano volvió a `Layout.tsx`, y es deliberado.** Las
  variantes de `Boton` están calibradas contra el papel (`text-tenue`,
  `hover:text-acento`) y sobre tinta no se ven. Darle a `Boton` un juego de
  colores para el shell obligaría a que **cada variante futura tenga su gemela
  oscura**, para un solo control. El shell tiene paleta propia y ése es su único
  botón.

##### Mismo origen — cerrado entero (el formulario se hizo el 2026-09-01)

**La decisión de hosting de octubre se adelantó a hoy**, porque es lo único que
destraba el login en la landing. `AccesoAlCampus` ya decía que las dos salidas
eran *pasar el token por la URL* (queda en historial y `Referer` — descartado) **o
apostar a que las dos apps queden en el mismo dominio**. El pedido de Ignacio es
esa apuesta, tomada.

```
/       →  landing
/app    →  plataforma
/api    →  backend
```

- **`vite.config.ts` → `base: '/app/'`** y **`App.tsx` → `<BrowserRouter
  basename="/app">`**. Son gemelos: si uno se mueve sin el otro, o cargan los
  assets y no resuelve ninguna ruta, o al revés.
  ⚠️ **En desarrollo la plataforma ahora está en `http://localhost:5173/app/`**,
  no en la raíz.
- **`next.config.ts` → `rewrites()` sólo en desarrollo**, que hacen de proxy para
  las tres rutas. **No es comodidad: es lo único que permite PROBAR el login.**
  Con landing en :3000 y plataforma en :5173 son orígenes distintos y la entrega
  de sesión no puede funcionar; sin el proxy, el login sería código que se prueba
  recién el día del deploy.
  ⚠️ **El HMR de la plataforma no viaja por los rewrites** (Next no pasa
  websockets). Para desarrollar la plataforma se sigue usando **:5173/app/**;
  **:3000 es para probar el circuito entero**.
- **`src/lib/api.ts` → `API_URL` por defecto vacío** (mismo origen). Con eso
  desaparecen CORS y el origen extra en `connect-src`.
- **`AccesoAlCampus` apunta a `/app/login` y `/app/registro`** — siguen siendo dos
  links, pero ya al lugar definitivo.

##### ⚠️ LO QUE QUEDA — por acá se retoma

> **Actualizado el 2026-09-01.** De las tres decisiones de Ignacio, **las tres
> están construidas**: shell oscuro, menú en 5 dominios y login en la landing.
> Lo que sigue abierto, en orden de lo que más cambia lo que se ve:
>
> | # | Qué | Tamaño |
> |---|---|---|
> | 1 | **El componente que le falta a los filtros.** Hay **30 controles de filtro escritos a mano** en 16 pantallas: es el mismo control repetido, exactamente lo que le pasaba a `Tabla` antes de la 3.1. Ya comparten estilo (se unificaron al arreglar el `outline-none`), pero no componente — así que el próximo cambio de estilo vuelve a ser 30 ediciones | mediano, mecánico |
> | 2 | **Dónde entra el rojo fuera de los errores.** Hoy el acento sólo aparece en fallas, así que el sistema no tiene acento: tiene alarmas. Es la tercera de las tres razones por las que se veía "default" y la única que sigue sin resolverse | decisión + chico |
> | 3 | **La 3.3, la recorrida por rol.** Nunca se hizo. El inventario está más abajo en esta misma sección; hay usuarios de demostración de cada perfil en `sistema-gestion-plan.md` §6d | mediano |
> | 4 | **`operacion.md` §3, la config del reverse proxy.** Las tres rutas ya están decididas y probadas en desarrollo; falta escribirlas para producción | chico |
> | 5 | **`CORS_ORIGENES`**: deja de ejercerse en producción. Revisar que el default de desarrollo no confunda | chico |
>
> **Lo que NO hay que hacer**: empezar el diseño de nuevo. La adopción de la 3.1
> es lo que hace que cada cambio de estilo toque un archivo en vez de treinta, y
> es la única razón por la que esta fase es barata.
>
> **Cómo mirarlo**: `docker compose up -d`, `mvn spring-boot:run`,
> `npm run dev:platform` **desde la raíz**, `npm run dev:landing`. Después
> **http://localhost:3000/ingresar** para el circuito entero (login incluido) y
> **http://localhost:5173/app/** para desarrollar la plataforma con HMR.


1. ~~**El formulario de login en la landing.**~~ ✅ **CERRADO el 2026-09-01.**
   `apps/landing/src/lib/sesion.ts` + `AccesoAlCampus` ahora es un formulario de
   verdad. **Probado de punta a punta contra `:3000`**, que es lo único que podía
   probarlo: `POST /api/auth/login` por el mismo origen devuelve el token, se
   guarda en `lajuanita.credencial` y `location.assign('/app')` entra.

   Tres cosas que decidió al construirse:

   - **El acoplamiento entre las dos apps ahora tiene una red**, no sólo
     comentarios. `credencial.test.ts` gana dos casos —*"lo que la landing
     escribe de este lado"*— que escriben la clave **a mano, sin importar la
     constante**: importarla haría que el caso siguiera pasando después de
     renombrarla, que es justo lo que tiene que detectar. Sin eso, cambiar el
     formato dejaba el login devolviendo 200 y a la persona rebotando al login
     **sin un solo error visible**.
   - **`location.assign` y no el router de Next**, con su `eslint-disable`
     explicado: `/app` no es una página de Next sino otra aplicación servida por
     el proxy. Si alguien "arregla" ese warning con `useRouter().push()`, la
     plataforma deja de cargar.
   - **`enviando` NO se baja en el camino feliz**, y sí en el `catch`. Al salir
     bien el navegador ya está yendo a `/app` y el botón tiene que quedar
     deshabilitado hasta que la página desaparezca; bajarlo abriría una ventana
     para mandar el formulario dos veces. Es §8.1 leído al derecho.

   El contrato original, para referencia:
   - `POST` a `/api/auth/login` (relativo, mismo origen) con `{ email, password }`.
   - La respuesta es `LoginResponse` = `{ token, expiraEn, usuario }`.
   - Escribir en `localStorage` la clave **`lajuanita.credencial`** con
     `JSON.stringify({ token, expiraEn })` — exactamente la forma que lee
     `apps/platform/src/auth/credencial.ts`.
   - Redirigir a `/app`. El `debeCambiarPassword` lo maneja la plataforma sola.
   - Reemplaza el botón "Iniciar sesión" de `AccesoAlCampus`; "Crear mi cuenta"
     se queda como link a `/app/registro`.
   - ⚠️ **Ese formato de credencial queda acoplado entre las dos apps.** Si la
     plataforma cambia cómo guarda el token, el login de la landing sigue
     "andando" y rebota a la persona al login, **sin ningún error visible**. La
     advertencia hay que escribirla en los DOS archivos.
   - ⚠️ **Los tres modos de falla del login tardan lo mismo a propósito** (el
     backend compara contra un hash señuelo cuando el mail no existe). El
     formulario **no puede diferenciar los mensajes**: un solo texto para los
     tres.
2. **`docs/operacion.md` §3**: escribir la configuración del reverse proxy con las
   tres rutas. Es la sección que estaba en blanco esperando octubre, y ya no
   espera.
3. **`CORS_ORIGENES` del backend** deja de ejercerse en producción. Queda como red
   de seguridad; revisar que el default de desarrollo no confunda.
4. **La pincelada del lienzo — primera pasada hecha el 2026-09-01, falta el
   resto.** Lo que se hizo: **los campos dejaron de ser cajas y pasaron a ser
   líneas**, el mismo lenguaje que la landing (*"más cerca de una planilla de
   estudio que de un formulario de SaaS"*). En una pantalla de carga la caja pesa
   de más: veinte bordes redondeados compiten con los datos que uno vino a leer.
   Y las filas de tabla ganaron `hover`, que es lo que evita saltar de renglón en
   una tabla de treinta filas por seis columnas.

   ⚠️ **Y eso destapó un bug real, no estético: `outline-none` estaba en 31
   lugares.** `index.css` cierra con una regla escrita con todas las letras —*"el
   foco visible no se saca nunca: esto lo van a usar personas que cargan datos con
   el teclado todo el día"*— y define un `:focus-visible` de 2px. `Campo` lo
   anulaba, y **30 inputs escritos a mano lo habían copiado**: navegando con
   teclado, saber en qué campo estabas dependía de notar que una línea de 1px
   había cambiado de tono. Es el mismo defecto que la landing ya había encontrado
   y corregido en su `Fields.tsx`; acá había sobrevivido en 16 pantallas. Los 31
   están arreglados (los 30 inputs más una celda del calendario).

   **Lo que todavía falta de la pincelada**: los 30 controles de filtro siguen
   siendo marcado a mano —son el mismo control repetido y les falta su
   componente, igual que le faltaba a `Tabla` antes de la 3.1—, y falta decidir
   dónde más entra el acento rojo fuera de los errores.
5. **La 3.3, la recorrida por rol**, que sigue pendiente desde la sesión anterior.

#### El orden

**3.1 · Primero el sistema, no las pantallas.** Las 36 pantallas se componen casi
enteramente de esos 22 componentes, así que el sistema es lo que multiplica. No
arranca de cero: `index.css` ya tiene los tokens y la decisión tomada — **la
landing es oscura y teatral porque vende; la plataforma es clara y densa porque se
mira ocho horas por día**, sin una sola animación decorativa.

⚠️ **Y adentro de `index.css` está la trampa que ya costó 81 usos**: el rojo está
partido en dos porque `--red` no llega a AA como texto. `bg-red`/`border-red` para
superficie, `text-acento` para texto. `text-red` no existe en este repo. Es el
mismo hallazgo que en la landing obligó a renombrar 56 usos.

**3.2 · La pantalla de Inicio, de verdad.** Hoy `InicioPagina` es una pantalla de
diagnóstico de la Fase 0 — su propio comentario lo dice— y abajo queda un volcado
de `GET /api/me`. **Sacar el texto de testing no alcanza**: es la primera pantalla
que ve todo el mundo y necesita una decisión de producto por perfil.

✅ **Esa decisión ya está tomada: §11.** Qué ve cada perfil, con qué regla, y con
**los once endpoints verificados uno por uno**. Es armado, no desarrollo.

**3.3 · La recorrida por rol**, con el inventario de `menu.ts` que está más abajo
en esta misma sección.

#### Las cinco cosas que el rediseño no puede romper

1. **El texto que explica una regla no es decoración.** *"Todavía no reserva la
   sala: primero lo confirmamos"*, *"no se aparta un horario sin pago por
   adelantado"*, *"el comprobante no se borra: queda marcado como inválido"*. Se
   reescriben, **no se eliminan** (§6f).
2. **Cada pantalla de administración tiene dos variantes y hay que mirar las dos.**
   La riesgosa es `DIRECTIVO`, y está diagnosticada en el header de
   `SoloLectura.tsx`: *"abre Alumnos, no encuentra 'Nuevo alumno' y no hay nada que
   le diga por qué"*. Una pantalla diseñada con sus botones se ve rota sin ellos.
3. **Las tarjetas y bloques vacíos se muestran, no se esconden.** Es la misma regla
   en cinco lugares del sistema: el informe de uso de salas, la grilla de ocupación
   del tablero, los bloques del perfil del alumno, el "sin comprobante" de un pago y
   el semáforo gris del Módulo 5. **Un hueco se lee como que el sistema perdió el
   dato.**
4. **Los predicados de permiso no se tocan.** `puedeAdministrar`, `puedeOperar` y
   `puedeVerElTableroCompleto` viven en `menu.ts` y los comparte toda la SPA. No
   autorizan nada —el backend resuelve el rol contra la base en cada pedido— pero
   son lo que evita mentirle al usuario. Nada de `rol === …` suelto en un
   componente.
5. **La landing no se toca.** Va por carril separado y está bloqueada esperando
   datos del cliente.

#### Cómo saber que no rompiste nada

**Los tests van a romperse a propósito, y eso está bien**: los casos preguntan por
texto visible porque prueban decisiones de producto, no píxeles. Cuando un caso
falla porque cambió una palabra, **se actualiza el caso**; lo que no se hace es
esquivarlo con `data-testid` ni aflojar la aserción, que es cambiar la pregunta
para que dé la respuesta que uno quiere.

⚠️ **Esto recién ahora es confiable.** Hasta el 2026-08-30 la suite fallaba 1 de
cada 10 corridas por dos techos de tiempo (§9.6), y con ese ruido de fondo no se
distingue *"rompí esto"* de *"es lo de siempre"*. Ya está arreglado y verificado
bajo carga: **un rojo hoy significa algo.**

Y lo que **no** puede romper un rediseño, que es la razón por la que esta fase es
afordable: **las reglas de negocio viven en la base**. Ninguna pasada de CSS puede
hacer que una reserva exista sin seña.

#### 3.3 · La recorrida por rol

El inventario real de `menu.ts` — **8 + 5 + 18 ítems**, repartidos por tres reglas
distintas y no por rol:

| Perfil | Mi cuenta | Mi formación | Administración |
|---|---|---|---|
| **USUARIO** puro | 8 | — | — |
| **USUARIO + alumno** | 8 | 2 (Mis cursos, Mis materiales) | — |
| **USUARIO + profesor** | 8 | 3 (Mi agenda, Mis alumnos, Subir material) | — |
| **STAFF** | 8 | según relación | 18 · **Tablero reducido** |
| **DIRECTIVO** | 8 | según relación | 18 · **sin botones de escritura** |
| **ADMIN** | 8 | según relación | 18 · completo |

Las combinaciones son reales, no teóricas: **Ghezz es STAFF *y* profesor *y* puede
alquilarse una cabina.** El menú se arma por tres reglas —sección siempre visible,
sección por relación, sección por rol—, así que **"el diseño del perfil X" no
existe**: existe el diseño de los componentes, que se combinan distinto según quién
entra.

Para recorrerlo hay usuarios de demostración de cada perfil, todos con la
contraseña de desarrollo, en [`sistema-gestion-plan.md`](sistema-gestion-plan.md)
§6d.

#### 🔄 Sesión del 2026-09-01 — el rediseño de verdad, replanteado

> **Ignacio vio el sistema entero y el veredicto fue más duro que el anterior:**
> *"el sidebar está bueno, pero todo en conjunto es horrible — el contraste entre
> el negro puro del sidebar, la barra de scroll default del navegador y la
> pantalla blanca es un asco"*. Y la frase que ordena la etapa: *"da bronca
> porque el backend está flama y la persistencia está épica, pero estamos
> fallando en el user experience"*.
>
> **Y una corrección de rumbo explícita: se levanta la regla de "no rediseñar dos
> veces".** Estaba escrita para no arrancar con media lista de testeo; el testeo
> se canceló, así que la regla ya no protege nada y estaba frenando lo único que
> falta. Lo que se asume es el costo, no la duda.

##### Por qué "van tres veces y no queda": las tres pasadas no fueron de diseño

Es la lectura que faltaba y explica el resto de esta sección. La **3.1** adoptó el
sistema (11 tablas a mano → un componente): infraestructura. La **3.2** armó el
Inicio contra §11: contenido. La sesión del **31/08** pintó **el shell** — esa sí
fue diseño, y es exactamente la mitad que a Ignacio le gusta. **El lienzo, o sea
las 36 pantallas, nunca tuvo una pasada de diseño propia**, y la lista que lo
describía como "los 30 filtros y dónde entra el rojo" lo subestimaba: eran dos
piezas de un trabajo que no existía.

##### Lo que el diagnóstico encontró, todo verificado contra el código

| Síntoma | Causa real |
|---|---|
| El contraste negro/blanco | La costura no existía: shell `#0a0a0b` y lienzo `#f4f1ea` pegados, sin transición. **Y la barra de scroll nunca se estilizó** — gris del sistema, corriendo al lado del negro |
| "Falta identidad" | **La serif de la marca tenía CERO usos.** `.t-serif` estaba definida, la familia se descargaba en cada carga y no la usaba ni una pantalla. El eje de ancho de Archivo sí estaba activo (vía `CabeceraDePagina`) |
| "Faltan rectángulos que digan la sección" | Literal: las secciones se separaban con un `.t-mono` de 11px y nada más |
| "Los mensajes se ven chicos" | En Notificaciones el cuerpo es `text-sm text-tenue`: **más chico y más gris que el título**, o sea lo que hay que leer tipografiado como metadato |
| "El login es horrible y no tiene el logo" | Se salteaba el sistema entero: `<form>` centrado sobre blanco, sin marca, con "La Juanita" en 11px |
| — | **Cero de los assets de marca estaba en la plataforma**: ni el wordmark ni una sola foto del local, de las salas o del equipo |

##### Las decisiones que tomó Ignacio

1. **Tema claro/oscuro con interruptor real, y default por perfil.** No es
   cosmética: son dos públicos con dos usos. Micaela mira esto ocho horas
   cargando datos; un alumno entra cinco minutos. La decisión vieja —todo claro
   porque se mira ocho horas por día— era correcta para la primera y **nunca se
   le preguntó nada a la segunda**.
2. **Identidad para todos los perfiles**, no sólo el portal. Sobria en las
   pantallas de administración, linda en las del alumno — *misma familia, no
   misma fiesta*.
3. **Las frases de inspiración van, y son reales o no van.**
4. **Las fotos reales del estudio entran.**
5. ⚠️ **Nada de GSAP, cursor propio ni animación pesada** (explicitado por
   Ignacio). Sólo transiciones CSS. **La landing es teatral porque vende; esto se
   usa** — y además evita sumarle una dependencia y peso de bundle a una
   aplicación que se abre todos los días.

##### El plan, en siete etapas — ✅ **LAS SIETE CERRADAS el 2026-09-01**

Ordenadas por cuánto cambian lo que se ve, no por dificultad.

> **Lo que sigue es la barrida de correcciones**, que es la metodología que
> Ignacio fijó al arrancar: primero las siete etapas, después la pasada de
> ajustes sobre el conjunto ya armado. Lo que quedó anotado a propósito para esa
> barrida está al final de cada etapa; lo más concreto son las **36 tarjetas sin
> título** que no se migraron a `Bloque` (contenedores donde la franja no aplica,
> valor de centralización y no visual) y los `t-seccion` que sobrevivieron
> usados como escala tipográfica y no como título de tarjeta.

| # | Etapa | Estado |
|---|---|---|
| 1 | **La base y la costura** — barra de scroll propia, el borde shell↔lienzo, grano, `color-scheme`, y el tema oscuro entero | ✅ **hecha** |
| 2 | **Las puertas** — login, registro y cambio obligatorio de contraseña, partidas en dos con foto y marca | ✅ **hecha** |
| 3 | **El sistema de bloques** — los "rectángulos que dicen la sección" y la jerarquía de tarjetas | ✅ **hecha** |
| 4 | **El Inicio, redistribuido** — tarjetas por urgencia y no por módulo | ✅ **hecha** |
| 5 | **El portal (alumno y profesor)** — la mitad linda | ✅ **hecha** |
| 6 | **Administración** — identidad sin ruido, densidad alta, cero animación | ✅ **hecha** |
| 7 | **Notificaciones y la recorrida por rol (3.3)** — *los 30 filtros se adelantaron a la etapa 6, que es donde estaba el problema* | ✅ **hecha** |

##### Etapas 1 y 2, construidas — lo que decidieron

**El tema** (`src/tema/`, `index.css`):

- **El shell NO sigue al tema, y eso es la identidad.** El sidebar es tinta en
  los dos. Lo que el interruptor cambia es el lienzo. En oscuro el shell se hunde
  un tono más (`#08080a` contra `#101012`) para que *dónde estoy* y *qué estoy
  mirando* sigan siendo dos superficies distintas — si comparten el negro, la
  pantalla vuelve a ser un solo bloque y el shell deja de hacer lo que vino a
  hacer.
- **El rojo cambia de valor por tema**, medido: `#e52328` sobre `#101012` da
  4,17:1 — pasa como superficie y **no** como texto; `#ff3a30` da 5,34:1. Es la
  misma partición que ya existía en claro, con los valores al revés, y es
  exactamente lo que la landing resuelve interpolando por tema (QA-06).
- **El default sale del perfil y la elección de la persona le gana siempre.** Se
  guarda al alternar y **no** al calcular el default: guardar el default
  convertiría *"todavía no elegí"* en *"elegí esto"*, y el perfil dejaría de
  decidir para alguien que nunca tocó nada.
- ⚠️ **`lajuanita.tema` es una clave distinta de `lajuanita.credencial` a
  propósito**: el tema sobrevive a cerrar sesión —es de la persona y de este
  navegador, no de la sesión— mientras que la credencial se borra.
- ⚠️ **El tema se aplica con un script bloqueante en `index.html`, no en un
  efecto de React.** Si se aplicara al montar, quien eligió oscuro vería un flash
  blanco a pantalla completa en cada carga. Es el único JavaScript de ese archivo,
  y **la clave está escrita dos veces** (ahí no hay módulos todavía): si cambia,
  cambia en los dos lados.

**La costura** — las tres cosas que hacían que el conjunto se viera roto aunque
cada mitad estuviera bien:

- **`color-scheme`**, que es lo que hace que los controles nativos sigan al tema.
  Sin eso, en oscuro el calendario de un `<input type="date">` y el desplegable de
  un `<select>` se abren en blanco. **Acá pesa más que en otras aplicaciones: hay
  treinta controles de fecha y selección repartidos en dieciséis pantallas.**
- **Barra de scroll propia, en dos paletas** (`.zona-shell` para el menú), con
  `scrollbar-gutter: stable` — sin eso, una tabla que crece y empieza a scrollear
  corre el contenido 15px de golpe.
- **La costura como sombra proyectada y no como borde**, para que el shell se lea
  como una capa por encima del lienzo. Va como sombra y no como degradado en el
  lienzo **porque el lienzo scrollea y el shell no**: un degradado pintado en el
  contenido se iría con él.
- **El grano va sólo sobre el shell.** Sobre el lienzo ensuciaría justo lo que hay
  que leer.

**Las puertas** (`componentes/Puerta.tsx`, usada por las tres):

- **La mitad de tinta no sigue al tema**: es marca, no superficie de trabajo — el
  mismo criterio que el shell.
- ⚠️ **Abajo de `lg` la foto no se acomoda: se saca.** Apoyada arriba del
  formulario en un teléfono empuja los campos abajo del pliegue, y una puerta
  donde no se ve dónde escribir es peor puerta que una sin foto.
- El velo sobre la foto **carga hacia abajo**, que es donde está el texto: sin él
  el wordmark cae sobre el brillo del jog y desaparece.

**Las frases** (`datos/frases.ts`):

- ⚠️ **La regla la sostiene el TIPO, no la memoria de quien edite.** Una cita
  atribuida exige `fuente`, así que **agregar una sin link no compila**. Es la
  misma regla de `data/business.ts` en la landing —sólo entra lo verificado— y
  existe porque este proyecto **ya tiene ese problema abierto**: las seis notas
  del blog están firmadas con los nombres de Ghezz, Najles y Chapa Castelo y
  figuran en `pendientes.md` como bloqueante para publicar.
- **Rota por FECHA y no al azar.** Con `Math.random` la frase cambia en cada
  render —al navegar y volver al Inicio— y una frase que parpadea deja de leerse:
  pasa a ser un elemento que se mueve. Por fecha es la misma para toda la gente
  todo el día, que además es lo que la vuelve algo de lo que se puede hablar. Y
  así es testeable.
- **Van dos citas verificadas** (Frankie Knuckles y Jeff Mills, cada una con su
  URL) **y dos de la casa**, que son placeholder hasta que las confirme el
  cliente. ⚠️ **Sumar citas es trabajo de búsqueda, no de código**: el mecanismo
  no acepta una frase atribuida sin fuente.
- Es **el primer uso de `.t-serif` en toda la plataforma**. La familia estaba
  declarada, se descargaba en cada carga y no la usaba ni una pantalla.

##### Etapa 3 · El sistema de bloques — construida el 2026-09-01

**El pedido de Ignacio era *"que haya ahí rectángulos que te digan la sección"*, y
el diagnóstico era literal.** Una sección se anunciaba con un `<h3>` de once
píxeles de texto gris suelto arriba de la tarjeta, así que cada pantalla era una
sucesión de rectángulos blancos indistinguibles.

**Y abajo había el mismo problema que la 3.1 encontró con `Tabla`:** la tarjeta
estaba dibujada a mano **60 veces**, con seis rellenos distintos (`p-5`,
`px-5 py-4`, `px-5 py-6`, `p-4`, `px-4 py-3`…) y el título con cuatro
separaciones diferentes (`mb-1`, `mb-3`, `mb-4`, ninguna).

Tres componentes, en `componentes/Bloque.tsx`, y **son dos niveles que conviene
no confundir**:

| | Qué es | Dónde va el título |
|---|---|---|
| **`Bloque`** | La tarjeta con nombre | **Adentro**, sobre una franja en `--superficie-2` |
| **`Grupo`** | Lo que agrupa tarjetas | **Afuera**, sobre una regla que cruza la pantalla |
| **`Hueco`** | El relleno hundido dentro de un bloque | — |

**La franja resuelve de paso la falta de profundidad, y sale gratis**: son dos
tonos dentro de la misma tarjeta (`--superficie-2` sobre `--superficie`), o sea
la paleta que ya existía, sin sumar un color.

###### Lo que encontró, que es más interesante que lo que construyó

- ⚠️ **Dos pantallas ya habían inventado el componente por su cuenta, y una lo
  había llamado igual.** `AlumnoPerfilPagina` tenía un `Bloque` local con la
  **misma API exacta** (`titulo` + `children`); `TableroPagina` tenía un
  `Seccion` que era el `Grupo`, escrito distinto. **Es la mejor prueba posible
  de que el componente iba en `componentes/`**: no hubo que convencer a nadie
  del diseño, ya estaba, dos veces y sin enterarse una de la otra.
- ⚠️ **`Bloque` era el nombre de tres cosas distintas en el Calendario**, que es
  la pantalla que las muestra a las tres juntas: la tarjeta de sección, una
  reserva dibujada en la grilla, y `bloqueo_sala` —cuando una sala no se puede
  usar—. El local pasó a llamarse `ReservaEnGrilla`; el de la base ya tenía su
  nombre. Apareció como un choque de imports, no como un bug.
- **La jerarquía de encabezados estaba salteada en las 38 secciones.** Eran
  `<h3>` bajo el `<h1>` de `CabeceraDePagina`: para quien navega por
  encabezados, una sección que cuelga de algo que no está. `Bloque` es `<h2>`,
  y **`nivel={3}` cuando vive dentro de un `Grupo`**, porque el grupo ya gastó
  el `<h2>` — sin eso, doce tarjetas en tres grupos se describen como doce
  secciones hermanas. Es la misma corrección que la 3.1 hizo al sacar la barra
  superior, terminada del otro lado.

###### La jerarquía del Inicio, que era el otro síntoma

Las doce tarjetas pesaban igual. `Bloque` tiene `destacado`, que dibuja una
línea roja de 2px arriba — el mismo gesto que la barra del ítem activo del
sidebar, del otro lado de la costura.

⚠️ **Y la regla que lo hace funcionar: una por pantalla, y ninguna es válido.**
En el Inicio eso obligó a una **cadena de prioridad y no a tres banderas
sueltas**: quien opera ve destacado *Deudores*, quien da clase *Clases de hoy*,
el resto *Mi próxima reserva*. Con tres condiciones independientes, Ghezz —que
es STAFF *y* profesor *y* alquila cabina— abriría el Inicio con **tres líneas
rojas, o sea con ninguna**.

###### Adopción, contada de verdad

| | Antes | Ahora |
|---|---|---|
| Usos de `Bloque` | 0 | **33 en 16 archivos** |
| Usos de `Grupo` | 0 (escrito a mano, distinto, en 2 pantallas) | **2 pantallas, un componente** |
| Usos de `Hueco` | 0 | **4** |
| `t-seccion` suelto | 38 | **16** |
| Tarjetas dibujadas a mano | 60 | **36** |

⚠️ **Los 36 que quedan no son deuda escondida: son tarjetas SIN título**, o sea
contenedores donde la franja no aplica y migrarlos no cambia un píxel. El valor
que queda ahí es de centralización, no visual, y entra en la barrida de
correcciones. De los 16 `t-seccion`, varios tampoco son títulos de tarjeta —
`EstadoVacio`, `PedirMotivo` y la fecha de una reserva en el Inicio lo usan como
escala tipográfica, que es para lo que está.

###### Una lección de método, cara y corta

**Migrar JSX con regex no se hace.** El primer intento fue un script que
convirtió `Contraseña de {de}` en el texto literal `"Contraseña de {de}"` — la
expresión JSX se volvió un string, compilaba, y la pantalla habría mostrado
llaves a la persona que tiene que leer una contraseña. Se revirtió entero. Lo
que sí funcionó fue el mismo script con **balanceo de etiquetas por profundidad**
(no regex para encontrar el cierre) y **títulos literales o marcados como
expresión**, revisando el diff de cada archivo. El balanceo nunca falló; el
patrón del título, tres veces.

##### Etapa 4 · El Inicio redistribuido — construida el 2026-09-01

Dos cambios, y **el segundo es el que importa aunque no se vea tanto**.

###### El saludo y la frase pasan a ser una sola pieza

Estaban apilados: un título chico sobre papel y debajo una banda de tinta con la
frase. Junta, la tinta abre la pantalla y le da a la marca el único lugar del
sistema donde puede ocupar espacio sin competirle a un dato — **acá todavía nadie
vino a leer nada**. El abanico entra como marca de agua recortada por el borde y
el `<h1>` sube de escala.

`InicioPagina` deja de usar `CabeceraDePagina`, que es correcto: no es una
pantalla de listado con título y acciones, es una portada. El `<h1>` sigue siendo
"Hola, X" y el caso que lo fija sigue verde.

###### ⚠️ El orden de los grupos estaba fijo, y era el orden de construcción de los módulos

**Es exactamente el mismo defecto que tenía "Administración" en el menú con sus
18 ítems corridos, repetido en el Inicio sin que nadie lo viera** — y encima
después de haberlo diagnosticado y arreglado del otro lado.

La consecuencia concreta: **Micaela abría el Inicio y lo primero era *su propia*
próxima reserva y *su propia* deuda**, mientras que a quién hay que cobrarle —lo
único que viene a buscar— quedaba cuarto, abajo del pliegue.

Ahora el orden sale del perfil, con la misma cadena de prioridad que elige la
tarjeta destacada y por la misma razón: **primero el trabajo que tenés con otra
gente, lo tuyo al final.**

| Perfil | Arranca por |
|---|---|
| Opera (ADMIN · STAFF) | **Operación**, después los números |
| DIRECTIVO | **Los números del mes** — no opera, así que "Operación" no existe para él |
| Profesor | **Mis clases** |
| Alumno / USUARIO puro | **Mi formación** / **Lo mío** |

"Lo mío" está siempre y siempre al final: es el único grupo que no depende de
ninguna relación ni de ningún rol.

###### ⚠️ Un grupo puede cambiar de lugar; no puede desaparecer

**La primera versión escribía la lista de orden entera a mano, y un `DIRECTIVO`
perdía el bloque de números completo** — que es justo lo único que esa persona
entra a ver. `veLosNumeros` es verdadero para él y `opera` es falso, así que la
clave `numeros` no estaba en ninguna de las tres listas.

Lo agarró **un caso que ya existía** de la 3.2. Sin él, la pantalla se veía
perfecta y le faltaba todo: no hay error, no hay hueco, no hay nada que mirar —
simplemente un bloque que no está.

El arreglo no es corregir la lista, es hacer que el error no se pueda cometer:
**la prioridad se COMPLETA con las claves que no nombra**, en vez de ser la lista
final.

```ts
const ORDEN = [...prioridad, ...CLAVES.filter((c) => !prioridad.includes(c))]
```

Cualquier permutación parcial sigue mostrando los cinco. Es la misma familia de
decisión que "las tarjetas vacías se muestran, no se esconden": **lo que no se
puede permitir es que falte algo sin que nadie se entere.**

Cuatro casos nuevos lo fijan, incluido uno que monta un ADMIN que además es
alumno y profesor —las cinco claves a la vez— y verifica que estén los cinco
grupos.

##### Etapa 5 · El portal — construida el 2026-09-01

La mitad que se mira cinco minutos y tiene que dar ganas de volver. **Dos piezas
nuevas, las dos compartidas entre el portal del alumno y el del profesor**, y
las dos de puro CSS: no entró ninguna librería de animación (decisión de
Ignacio, 2026-09-01).

###### `Progreso` — el avance del curso, en pasos y no en barra

Los cursos de esta academia son de **8 clases (DJ) y 16 (Producción)**: números
chicos y contables. Una barra al 62% obliga a hacer la cuenta para saber cuántas
clases quedan, que es *la* pregunta con la que un alumno entra; **ocho
cuadraditos con cinco llenos se leen sin contar**. Arriba de 24 pasos vuelve a
ser barra, porque ahí los pasos ya no se distinguen — ningún curso del catálogo
llega, así que el tope es una red y no un caso.

Y de paso se parece a la fila de pasos de un secuenciador, que es lo que esta
gente mira todo el día. No es un chiste visual: **la forma ya significa "avance
por unidades" para quien entra acá.**

Dos cosas que arregló al escribirse:

- ⚠️ **`total` en cero daba `width: NaN%`**, que el navegador descarta sin decir
  nada: **un curso sin clases contratadas se veía igual que uno recién
  empezado**. Ahora lo dice con todas las letras.
- **Los pasos van `aria-hidden` bajo un solo `role="img"` con su etiqueta**
  ("3 de 8 clases tomadas"). Sin eso serían ocho elementos sin nombre, que para
  un lector de pantalla es peor que no dibujar nada.

La tarjeta además invierte la jerarquía: **el número grande es lo que FALTA**, no
lo que se hizo. Lo tomado va abajo y chico, porque es el contexto de esa cifra.

###### `Proxima` — lo que viene, como pieza y no como renglón

Un alumno abre "Mis reservas" para saber *cuándo es la próxima*, no para leer
catorce filas ordenadas por fecha donde todas pesan igual. Ahora la respuesta
está antes que la lista, en tinta, y **lo más grande es cuándo en palabras**:
"Mañana" se lee sin pensar, "03/09" obliga a acordarse de qué día es hoy. La
fecha exacta va abajo, chica, porque es la confirmación y no la respuesta.

La misma pieza sirve del otro lado: en **Mi agenda** el profesor ve cuándo es su
próxima clase y dónde.

⚠️ **`hoy` entra por parámetro y la pieza no lee el reloj.** Es la lección de
`CajaPagina`: una pantalla que consulta la fecha mientras dibuja tiene un caso
que sólo falla algunos días del año. De paso, las dos pantallas que la usan
pasaron a fijar el día una sola vez con `useState(hoy)` en vez de llamar `hoy()`
en cada render.

⚠️ **Las fechas se parsean a mano y NO con `new Date(iso)`.**
`new Date('2026-09-03')` es medianoche **UTC** y, leída en Buenos Aires (UTC−3),
cae el día anterior: **toda clase se anunciaría un día antes de cuando es**. Es
el mismo error que la landing ya documentó para las fechas de sus notas, del otro
lado del repositorio. Hay casos que lo fijan, incluidos los cruces de fin de mes
y de año.

###### ⚠️ El hallazgo de la etapa: la fila lleva los controles

Al poner la pieza arriba, la próxima reserva quedaba dibujada **dos veces** —qué,
cuándo, dónde y con quién, una pegada a la otra—. La reacción obvia fue sacarla
de la lista y dejar la pieza como su reemplazo.

**Eso rompió seis casos, todos por la misma causa: los controles viven en el
renglón.** "Pedir otro día", el estado de ese pedido y la asistencia están en la
fila, no en la pieza. Sacar la fila destacada **le sacaba a la persona el botón
para pedir que muevan justo la clase que tiene más cerca** — que es la única
sobre la que alguien lo pide de verdad.

Así que la pieza es un **resumen y no un reemplazo**, y el duplicado es el precio
elegido. Los casos de la lista pasaron a acotar sus búsquedas con `within(lista)`
en vez de a la pantalla entera, que además es lo que estaban queriendo decir.

**La lección general: antes de sacar algo de una lista por estar destacado
arriba, fijate qué acciones cuelgan de esa fila.** Un resumen puede mostrar los
mismos datos; lo que no puede es heredar los botones sin que alguien los ponga
ahí.

###### Lo chico

Las filas del portal ganaron respuesta al pasar por encima (`hover:border-tenue`,
transición CSS). En una lista de quince renglones es lo que evita saltar de
renglón — la misma razón por la que las filas de tabla ya la tenían.

Y **`cuandoEnPalabras` y `fechaLarga` viven en `semana.ts`**, no en el archivo
del componente: es donde están los helpers de fecha, evita el warning de
`only-export-components` y, sobre todo, el próximo que necesite "cuándo, en
palabras" lo busca ahí.

##### Etapa 6 · Administración — construida el 2026-09-01

La mitad de Micaela: ocho horas por día cargando datos. **Identidad sin ruido,
densidad alta y cero animación** — se ve de la misma familia que el portal, no
de la misma fiesta.

###### La franja de `--superficie-2` pasa a ser el idioma del sistema

Es lo que unifica la etapa y no se ve como "un cambio": en toda la plataforma,
**una franja de ese tono significa *"esto califica lo que sigue"***. La usan el
título de un `Bloque`, el encabezado de una `Tabla` y ahora la barra de filtros.
Antes cada una tenía su propio tratamiento — tres idiomas para la misma idea.

###### El encabezado de la tabla se pega arriba

**Es la mejora que más se nota de la etapa y cuesta dos clases.** En una tabla
de treinta filas por seis columnas, a la fila diez ya no se ve qué columna es
cuál, y quien carga datos ocho horas por día hace ese scroll cien veces al día.

⚠️ `sticky` se ancla al ancestro que scrollea, que acá es el **documento** —el
`overflow-x-auto` del envoltorio no scrollea en vertical—. La aplicación no tiene
barra superior, así que `top-0` es el borde de la ventana: **si alguna vez vuelve
una barra fija arriba, ese `top-0` hay que correrlo** o el encabezado se mete
abajo de ella.

Y la fila bajó de `py-3` a `py-2.5`: son 4px por fila, o sea dos filas más de las
treinta que entran en pantalla.

###### La barra de filtros, que era lo que más se leía como "default"

Tres controles colgados en el aire arriba de una tabla, **sin nada que los
contenga ni ninguna señal de que fueran lo que la filtra**. Ahora es un `Filtros`
con la franja del sistema.

Y adentro estaban **30 controles escritos a mano en 16 pantallas**, la misma
cadena de clases copiada carácter por carácter. Hoy: **cero.**

| | Antes | Ahora |
|---|---|---|
| Controles de línea escritos a mano | 30 | **0** |
| Pantallas con barra de filtros propia | 0 | **7** |
| Definiciones de "el control de línea" | 2 | **1** |

###### ⚠️ Había DOS definiciones del mismo control y no se sabía

`Campo` tenía su `BASE` para los formularios y los filtros llevaban la cadena
copiada, con otro relleno. Es la deuda que este proyecto ya paga en la base
(`contarClasesConsumidas` contra `V9` §5) y no hacía falta sumarle una en el CSS.

Ahora hay una sola base en `componentes/controles.ts` y dos variantes que sólo
difieren en el relleno: `CONTROL_DE_FORMULARIO` respira más porque abajo lleva su
mensaje de error; `CONTROL_DE_FILTRO` va apretado porque son tres en una fila.
**Un caso compara las dos ignorando el `py-` y falla si empiezan a diferir en
otra cosa** — o sea, si vuelven a ser dos definiciones de la misma cosa.

###### ⚠️ Una trampa de Windows que en Linux no existe

El módulo iba a llamarse `filtros.ts`, que era el nombre obvio al lado de
`Filtros.tsx`. **En Windows el sistema de archivos no distingue mayúsculas, así
que para la resolución de módulos son el mismo archivo.** TypeScript lo dice con
todas las letras —*"differs from file name only in casing"*— pero recién al
compilar, y **en Linux (o sea, en CI y en el deploy) el mismo código andaría**:
es un error que aparece o no según la máquina. Se llama `controles.ts`.

###### Lo que la migración conservó, y por qué no hubo que tocar un caso

Los 34 casos de `PagosPagina` pasaron sin una sola edición porque **los
`aria-label` viajaron con el control**. En pantalla el nombre de un filtro lo
dice la opción elegida ("Todos los estados"), que es por lo que no lleva rótulo
visible; para un lector de pantalla eso no alcanza, y es lo que esos casos
sostienen. `FiltroFecha` es la excepción y sí lleva rótulo: **una lista muestra
su opción elegida, una fecha vacía no muestra nada**, y con dos al lado la única
forma de saber cuál es "desde" sería probando.

###### Un apunte de método

Los handlers de los filtros son bloques de varias líneas en cuatro pantallas, así
que la migración fue en dos pasos: **el contenedor se cambió por componente
—seguro, sólo toca la apertura y el cierre— y los controles conservaron su
handler tal cual, cambiando sólo la clase.** Reescribir handlers con regex es
cirugía sobre JSX, que ya salió mal una vez en la etapa 3.

##### Etapa 7 · Notificaciones y la recorrida por rol — construida el 2026-09-01

**Con esto las siete etapas están cerradas.**

###### Las notificaciones: el mensaje estaba tipografiado como metadato

Ignacio lo dijo como *"los msj se ven chicos"* y era literal. El cuerpo del aviso
—`a.contenido`— era `text-sm text-tenue`: **más chico y más gris que el título**.
O sea que lo único que hay que leer estaba dibujado como un dato al margen.

**Y acá pesa más que en cualquier otra pantalla, por una razón del sistema:
esto no es una notificación que se entrega.** No hay mail ni WhatsApp — es un
buzón adentro del sistema, así que el texto tiene que sostenerse solo. Los avisos
automáticos están escritos justamente así (*"Juan debe $50.000 desde hace 12
días"*, no *"tenés una deuda para revisar"*), y el título es apenas de qué clase
de aviso se trata.

Así que la jerarquía se dio vuelta: **el título pasa a ser un rótulo mono** —lo
que es— y el mensaje pasa a `text-base` con interlineado de lectura. Leído, se
apaga a `--superficie-2` y `text-tenue`; sin leer, queda en la superficie que se
lee, con su sombra.

⚠️ **El punto rojo es la única excepción a "un rojo por pantalla", y lo que la
sostiene es el tamaño: seis píxeles.** Acá el marcador es por ítem por naturaleza
—hay diez sin leer o ninguno— y a esa escala una columna de puntos se lee como
una lista de marcas, no como diez alarmas. Cualquier cosa más grande (el borde
negro que había, un fondo) sí rompería la regla. Antes el "sin leer" era
`border-ink`: un borde negro completo, que es exactamente el tipo de marca que a
diez ítems grita.

###### La recorrida por rol (3.3), hecha contra el sistema andando

**Se recorrieron los seis perfiles con los usuarios de demostración de
`sistema-gestion-plan.md` §6d, con el backend, la base y el front levantados**, y
la matriz de permisos contestó exactamente lo que tenía que contestar:

| Perfil | Lee administración | Escribe | Tablero completo |
|---|:--:|:--:|:--:|
| ADMIN | 200 | 400¹ | 200 |
| DIRECTIVO | 200 | **403** | 200 |
| STAFF | 200 | 400¹ | **403** |
| USUARIO / alumna / profesor | **403** | **403** | **403** |

¹ 400 y no 200 porque el pedido iba con cuerpo vacío: **pasó el permiso y falló
la validación**, que es la respuesta correcta.

Y el portal, que se autoriza por identidad y no por rol: `/me/cursos` abre para
los tres, y `/me/profesor/agenda` **sólo** para quien tiene la relación de
profesor.

###### Pero la recorrida a mano se vence sola, así que quedó escrita

Una mirada se hace una vez; lo que sigue valiendo dentro de seis meses es un
caso. `menu.test.ts` gana **cinco** que fijan el inventario real:

| Perfil | Mi cuenta | Mi formación | Administración |
|---|:--:|:--:|:--:|
| USUARIO puro | 8 | — | — |
| + alumno | 8 | 2 | — |
| + profesor | 8 | 3 | — |
| + las dos | 8 | 5 | — |
| STAFF · DIRECTIVO · ADMIN | 8 | según relación | **18** en 5 dominios |

⚠️ **Uno de esos casos verifica que los tres perfiles que administran vean los
MISMOS cinco dominios.** Lo que separa a `DIRECTIVO` de los otros dos no es qué
pantallas ve —ve todas— sino que no tiene botones de escritura adentro. Si alguna
vez alguien "arregla" el menú escondiéndole secciones, ese caso cae.

Otro fija que los grupos vayan **en orden de negocio y no de construcción de los
módulos** (Personas antes que Dinero, Dinero antes que Dirección), que es el
defecto que ya apareció dos veces en esta fase: en el menú y en el Inicio.

Y otro monta a Ghezz —**STAFF *y* profesor *y* alquila cabina**— porque es lo que
muestra que *"el diseño del perfil X" no existe*: el menú se arma por tres reglas
que se combinan, no por rol.

###### Cobertura que ya estaba y conviene saber que está

**Catorce pantallas de administración ya tenían caso de `DIRECTIVO`** de fases
anteriores, o sea que la variante de sólo lectura —la riesgosa, la que
`SoloLectura.tsx` diagnostica en su header— está cubierta pantalla por pantalla.
La recorrida no encontró ninguna sin su par.

##### ⚠️ Una trampa de TypeScript que produce un bug silencioso

**`aria-hidden` sobre un componente propio compila y no hace nada.** TypeScript
exime del chequeo de props a los atributos con guión, así que
`<Abanico aria-hidden />` pasa el typecheck **y se descarta**: `Abanico` no lo
reenvía al SVG. Compila, se ve igual, y el lector de pantalla lee el dibujo
decorativo. Va en un `<span aria-hidden>` que lo envuelve. Vale para cualquier
`aria-*` y `data-*` sobre un componente de este repo.

### En paralelo, sin frenar nada

**La landing.** Va por carril separado: está fuera del rediseño ("la landing no
se toca") y bloqueada esperando datos del cliente. Lo único que la cruza con este
plan es el formulario de §9.4, que es trabajo de backend.

**El mail.** Proyecto aparte, desacoplado a propósito (§9.4).

---

## 11. El Inicio, por perfil — la decisión de contenido

> **Decidido el 2026-08-28.** Ignacio delegó la decisión (*"lo que vos veas
> mejor"*), así que queda tomada acá para que la Fase 3 no arranque en blanco.
> **Es una decisión de contenido, no de estética**: el tratamiento visual lo
> define la Fase 3.1 junto con el resto del sistema.
>
> ⚠️ **Esto NO se construye ahora.** Es Fase 3. Se escribe hoy porque decidirlo
> es gratis y desbloquea; construirlo antes de la Fase 2 sería diseñar la
> pantalla dos veces.

### La regla que gobierna todo

**El Inicio contesta *"¿qué tengo que hacer ahora?"*, no *"¿cómo viene el
negocio?"*.** Lo segundo es el Tablero y ya existe.

> ⚠️ **El Inicio no puede volverse un segundo Tablero.** El Módulo 8 ya decidió
> qué es foto de hoy y qué es del período; el Inicio muestra **solo hoy/ahora**,
> sin selector de período y sin gráficos. Si no, quedan dos pantallas con números
> solapados que pueden discrepar — exactamente lo que el Módulo 8 evitó al **no
> recalcular la caja** y traerla de `PagoService.caja`.

### No hace falta ninguna regla de permisos nueva

**El Inicio se compone con los tres predicados que ya existen**, igual que
`menu.ts`, y con las mismas tres reglas:

| Bloque | Aparece si… | Predicado |
|---|---|---|
| Lo mío (reservas, pedidos, deuda) | siempre | — |
| Mi formación | tengo la relación | `esAlumno` / `esProfesor` |
| Lo operativo (agenda, bandeja, deudores) | puedo escribir | `puedeOperar` |
| Los números | veo el tablero completo | `puedeVerElTableroCompleto` |

**Nada de esto autoriza nada** — el backend resuelve el rol contra la base en
cada pedido. Acá solo se elige qué pedir.

Consecuencia: **un ADMIN ve lista de tareas Y números; un DIRECTIVO ve solo
números; un STAFF ve solo tareas.** Y Ghezz —STAFF *y* profesor— ve el bloque
operativo *y* el suyo de docencia, sin contradicción. Es el mismo caso testigo de
siempre.

### Qué ve cada perfil

**Todos, arriba de todo:** el saludo con **quién sos y qué sos** — *"Hola,
Micaela · Administradora"*. Esto **cierra §9.5**: es el lugar natural donde la
pantalla dice que sos admin.

| Perfil | Bloques, en orden |
|---|---|
| **USUARIO** puro | Mi próxima reserva · Mis pedidos esperando respuesta · Lo que debo |
| **+ alumno** | agrega: **Clases que me quedan** (por curso) · Mi próxima clase · Material nuevo |
| **+ profesor** | agrega: Mis clases de hoy · **Alumnos sin marcar** |
| **STAFF** | La agenda de hoy · Pedidos de sala sin responder · **Solicitantes nuevos** · Deudores |
| **DIRECTIVO** | Los números del período — **no tiene lista de tareas** |
| **ADMIN** | Lo de STAFF **+** los números |

**Las dos cifras que mandan, y por qué esas:**

- **"Clases que te quedan"** es *el* número que este sistema existe para llevar —
  `V9` §5 lo dice con todas las letras: *"es la cuenta que el sistema existe para
  llevar: ¿cuántas clases le quedan a Juan?"*. Si el alumno entra y no lo ve, el
  Inicio no sirve.
- **"Alumnos sin marcar"** es el semáforo gris del Módulo 5. `null` no es
  `VA_BIEN`: **encontrar a los alumnos que nadie miró es para lo que se abre esa
  lista.** El Inicio del profesor es el mejor lugar para que aparezcan solos.

### Las tarjetas vacías se muestran, no desaparecen

Una tarjeta sin contenido dice **"no hay pedidos sin responder"**, no se esfuma.

Es la misma regla que el proyecto ya aplica dos veces: los bloques *"todavía no
disponible"* del perfil del alumno (*"un bloque que falta se lee como que el
sistema perdió el dato"*) y el **"cero, no vacío"** del informe de uso de salas y
de la grilla de ocupación del Módulo 8. `EstadoVacio.tsx` ya existe para esto.

Y tiene un beneficio operativo: **"todo al día" es información**, y es la que
Micaela quiere ver de un vistazo a la mañana.

### Todo esto ya se puede construir — no falta ni un endpoint

Verificado contra el backend:

| Bloque | De dónde sale |
|---|---|
| Próxima reserva / clase | `GET /api/me/reservas` |
| Clases restantes | `GET /api/me/cursos` — `ProgresoDelCurso.clasesRestantes` ya viene |
| Lo que debo | `GET /api/me/estado-de-cuenta` |
| Pedidos propios | `GET /api/me/solicitudes` |
| Material nuevo | `GET /api/me/materiales` |
| Clases de hoy (profe) | `GET /api/me/profesor/agenda` |
| Alumnos sin marcar | `GET /api/me/profesor/alumnos` — `estadoSeguimiento` en `null` |
| Agenda de hoy (admin) | `GET /api/reservas` |
| Bandeja de pedidos | `GET /api/solicitudes` |
| Deudores | `GET /api/pagos/deudores` |
| Solicitantes nuevos | `GET /api/solicitantes?estado=PENDIENTE` |
| Números | `GET /api/tablero` · `GET /api/tablero/resumen` |

**Es armado, no desarrollo, y ahora sin ninguna excepción.** Cuando esto se
escribió, *"solicitantes nuevos"* era la única pieza que no existía y por eso el
bloque iba anotado como futuro; **el buzón se construyó el 2026-08-29** (§9.10),
así que ese bloque tiene su endpoint como todos los demás. **La Fase 3 no espera
ningún desarrollo de backend.**
