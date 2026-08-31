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

**3.1 · Primero el sistema, no las pantallas.** El grueso está en `componentes/`
— son **13**: `Boton`, `Campo`, `CampoSelect`, `Tabla`, `EstadoVacio`,
`Paginado`, `PedirMotivo`, `CabeceraDePagina`, `Etiqueta`, `Semaforo`,
`DetalleDeCuenta`, `SoloLectura`, `Abanico`. Las 34 pantallas se componen casi
enteramente de ahí. No arranca de cero: `index.css` ya tiene los tokens y la
decisión tomada — **la landing es oscura y teatral porque vende; la plataforma es
clara y densa porque se mira ocho horas por día.**

**3.2 · La pantalla de Inicio, de verdad.** Hoy `InicioPagina` es una pantalla de
diagnóstico de Fase 0: su propio comentario dice *"deliberadamente no hace nada
útil todavía… se reemplaza por el panel real cuando exista el módulo de
alumnos"*. Existen los ocho. **Sacar el texto de testing no alcanza** — abajo
queda un volcado de `GET /api/me`. Es la primera pantalla que ve todo el mundo al
entrar y necesita una decisión de producto por perfil, no una pasada de CSS.

✅ **Ya está decidido qué ve cada perfil: §11.** Ignacio delegó la decisión el
2026-08-28 y quedó tomada, con los endpoints verificados uno por uno — **no falta
ninguno**, así que es armado y no desarrollo.

**3.3 · La recorrida por rol.** El inventario real, de `menu.ts`:

| Perfil | Mi cuenta | Mi formación | Administración |
|---|---|---|---|
| **USUARIO** puro | 8 | — | — |
| **USUARIO + alumno** | 8 | 2 (Mis cursos, Mis materiales) | — |
| **USUARIO + profesor** | 8 | 3 (Mi agenda, Mis alumnos, Subir material) | — |
| **STAFF** | 8 | según relación | 16 · **Tablero reducido** |
| **DIRECTIVO** | 8 | según relación | 16 · **sin botones de escritura** |
| **ADMIN** | 8 | según relación | 16 · completo |

Las combinaciones son reales, no teóricas: **Ghezz es STAFF *y* profesor *y*
puede alquilarse una cabina.** El menú no se arma por rol sino por tres reglas
distintas —sección siempre visible, sección por relación, sección por rol—, así
que *"el diseño del perfil X"* no existe: existe el diseño de los componentes,
que se combinan distinto según quién entra.

> ⚠️ **La variante riesgosa es DIRECTIVO, y ya está diagnosticada en el propio
> código.** El header de `SoloLectura.tsx` lo dice: *"hoy un DIRECTIVO abre
> Alumnos, no encuentra 'Nuevo alumno' y no hay nada que le diga por qué. Se lee
> como un sistema a medio hacer o como una falla."* Una pantalla diseñada con sus
> botones se ve rota sin ellos. **Cada pantalla de administración hay que mirarla
> en sus dos variantes.**

> ⚠️ **Lo único que el rediseño no puede borrar** (§6f): el texto que no es
> decoración sino la explicación de una regla — *"Todavía no reserva la sala:
> primero lo confirmamos"*, *"no se aparta un horario sin pago por adelantado"*.
> Se reescriben, no se eliminan.

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
