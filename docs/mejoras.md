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

---

## 12. La primera barrida de correcciones — abierta el 2026-09-01

> **Las siete etapas del rediseño están cerradas (§10) y esto es lo que sigue**, que es
> la metodología que fijó Ignacio: *"terminar las 7 etapas y luego la barrida de
> correcciones"*. Miró el sistema andando y volvió con once puntos.
>
> ⚠️ **Es la PRIMERA barrida y va a haber más.** Palabras de Ignacio: *"pueden haber más
> conforme pase el tiempo, no te puedo dar un plazo definido"*. O sea que esto **no es
> una lista que se cierra**: es un modo de trabajo. La consecuencia práctica: no hay que
> esperar a tenerla completa para empezar —esa espera ya se descartó una vez al adelantar
> la Fase 3— y conviene que cada punto quede cerrado por su cuenta.

### ⚠️ DÓNDE RETOMAR (sesión del 2026-09-01)

**Lo que sigue, en orden, es esto:**

✅ **LA PRIMERA BARRIDA ESTÁ CERRADA: once de once.** Grupo A (8 puntos), B1 y C1
(`V22`) el 2026-09-01; C3 y C2 (`V23`) el 2026-09-02.

**Suites: 564 backend · 492 front · 216 + 56 SQL**, sobre **23 migraciones**.
Build y linters limpios. Nada quedó a medias en el árbol.

**Lo que sigue no es de esta barrida:**

1. **Desactivar el admin sembrado por `V3`** — una migración propia, antes del
   deploy. *(Decía `V24`; **desde el 2026-09-02 es `V25`**, porque `V24` se la
   llevó la prereserva de §13 · C1.)*
2. **El deploy de octubre** (`operacion.md` §3).
3. **Y la próxima barrida**, cuando Ignacio vuelva a usar el sistema: §12 es *"la
   PRIMERA"* y él lo dijo con todas las letras — *"pueden haber más conforme pase
   el tiempo"*. **No es una lista que se cierra, es un modo de trabajo.**
   *(Efectivamente vino la segunda, §13, y también está cerrada.)*

⚠️ **Y las dos advertencias de método que costaron tiempo esta sesión**, las dos
anotadas también en `CLAUDE.md`:

- **`mvn compile` miente.** Dio verde sobre dos errores reales —un componente
  borrado de un record y un método que no existe— y sólo `mvn clean compile` los
  mostró. En este proyecto, un compile verde sin `clean` no prueba nada.
- **Los contrastes se miden, no se estiman.** Tres valores que "se veían bien"
  estaban debajo del piso de WCAG y uno que parecía el peor estaba bien. A ojo no
  se distingue 2,0:1 de 4,5:1 sobre fondo claro.

---

### El triage, con los grupos de §4

| Grupo | Qué significa | Cuántos | Estado |
|---|---|---|---|
| 🟢 **A** | Pantalla, texto y estilo. No toca reglas ni schema | **8** | ✅ cerrado el 2026-09-01 |
| 🟡 **B** | Funcionalidad nueva o cambiada, sin tocar el schema | **1** | ✅ cerrado el 2026-09-01, salvo lo que se mudó a C |
| 🔴 **C** | Toca una regla del negocio o el schema. **No se apura** | **1 → 3** | ✅ los tres cerrados: C1 (`V22`) el 09-01, C3 y C2 (`V23`) el 09-02 |

**Orden de ejecución: A → B → C.** Dentro de A, primero el Inicio (que ya tiene su causa
encontrada) y después el bloque de tema y contraste, porque **cuatro de los puntos de
Ignacio se resuelven en una sola pasada sobre la paleta** (A3, A4, A6 y parte de A1).

---

### 🟢 Grupo A — pantalla y estilo

> ✅ **CERRADO el 2026-09-01, los ocho puntos.** Suite en **479** (eran 470): los
> nueve casos nuevos están donde una decisión de este grupo se puede deshacer sin
> que nada falle.
>
> **Lo que la barrida encontró y no estaba en la lista de Ignacio** —tres cosas, y
> las tres explican más de un punto suyo a la vez:
>
> 1. ⚠️ **Faltaba el token del color del texto.** `body` escribía `--ink` y el
>    tema oscuro lo pisaba con una regla aparte; los doce lugares que necesitaron
>    nombrar ese color escribieron `text-ink`, que es una **tinta de marca** y no
>    sigue al tema. En oscuro esos doce miden **1,11:1** — negro sobre casi
>    negro—, e incluyen `Boton variante="secundario"`, o sea todos los botones
>    secundarios del sistema. Es literalmente *"botones o palabras que no se
>    notan bien"*. Se resolvió con `--texto`, que es lo que faltaba.
> 2. ⚠️ **`--apagado` no era decorativo y estaba PEOR en claro que en oscuro.**
>    §12 lo señalaba sólo en oscuro (2,64:1); en claro medía **2,01:1**. Y son
>    cien usos que dicen *"Sin comprobante"*, *"A acordar"*, *"Sin asignar"*, la
>    ayuda de un campo y la fila vacía de una tabla: **es texto que hay que leer,
>    con nombre de texto que no.**
> 3. ⚠️ **A9 no era falta de semántica: Tailwind v4 sacó `cursor: pointer` del
>    preflight.** Ver el punto.
>
> **Y la regla de método que dejó**: los contrastes se **midieron**, no se
> estimaron — como QA-06 en la landing. Tres de los valores que "se veían bien"
> estaban debajo del piso y uno que parecía el peor (`--linea`) está bien donde
> está. A ojo no se distingue 2,0:1 de 4,5:1 sobre fondo claro; con un número sí.

#### A7 · El mojibake — ✅ **RESUELTO el 2026-09-01**

*"Revisar el UTF-8, hay mojibake en ciertos lugares donde se usan acentos o ñ's."*

**Era mío**, de la etapa 2: reescribí `LoginPagina.tsx` con `.encode().decode('unicode_escape')`
y quedó doble-codificado. Se veía en pantalla como *"Sistema de gestiÃ³n"* y
*"Â¿No tenÃ©s cuenta?"*.

⚠️ **El archivo tenía TRES codificaciones mezcladas** —UTF-8 correcto en la parte vieja,
doble-codificado en la parte reescrita, y bytes latin-1 sueltos—, así que se reparó
**secuencia por secuencia y no byte por byte**: reemplazar `A1` suelto rompe todos los
`á` que ya estaban bien, porque `á` es `C3 A1`. Probado y descartado antes de dar con la
forma correcta.

**La barrida completa dio limpio**: mojibake 0, archivos que no son UTF-8 válido 0,
archivos con BOM 0, y el build de producción 0. `LoginPagina.tsx` era el único archivo
afectado de todo el repositorio.

> ⚠️ **Y lo que costó más que el arreglo: `TaskStop` mata el shell, no el proceso `node`
> hijo.** El archivo en disco estaba bien y el build salía limpio, pero el dev server
> seguía sirviendo la versión rota. Reinicié dos veces y las dos veces el Vite viejo
> siguió escuchando en :5173 con su transformación vieja en memoria — el proceso nuevo ni
> podía tomar el puerto. Hubo que matar el PID a mano.
>
> **La regla que queda: si tocás un archivo y el navegador no lo refleja, verificá que el
> `node` del puerto sea el nuevo ANTES de buscar el bug en otro lado.** Se fue una vuelta
> entera de diagnóstico en eso.

#### A1 · El Inicio — causa encontrada, falta la distribución nueva

*"Esos rectángulos están como superpuestos, está raro, rediseñar el inicio."*

**Es una regresión de la etapa 4 y era literal.** Al fusionar el saludo con la frase metí
`FraseDelDia` **adentro** de la portada nueva — y `FraseDelDia` seguía dibujando su
propia banda completa: mismo `bg-shell`, su propio abanico en la esquina y su propio
grano. Dos rectángulos de tinta, uno dentro del otro, con los dos abanicos pisándose.

**Ya está corregido**: la frase dejó de ser una pieza y pasó a ser un `<blockquote>`
dentro de la portada. **La lección para la próxima fusión de dos piezas: una de las dos
tiene que dejar de ser una pieza.** Anidar dos contenedores que se dibujan igual no
compone nada — los superpone.

✅ **La distribución nueva se hizo el 2026-09-01, y encontró la otra mitad del
problema: el Inicio no tenía grilla.** Cada `Bloque` es un `<section>` de ancho
completo, así que las tarjetas se apilaban una abajo de la otra — un ADMIN que
además da clase abría la pantalla con **doce rectángulos en una sola columna** y
una cifra de 30 px sola en el medio de mil píxeles de ancho. El Tablero, la otra
pantalla hecha de tarjetas, siempre tuvo la suya; a ésta le faltó desde el
principio y el solapamiento la tapaba.

Dos cambios, los dos de distribución y ninguno de color:

- **Grilla de tarjetas por grupo** (`sm:grid-cols-2 xl:grid-cols-3`). **Tres
  columnas y no cuatro**, y el caso que lo decide es "Operación", que tiene
  cuatro tarjetas: en cuatro entra justo y la cuarta es *Deudores*, la
  destacada — la línea roja quedaría escondida al final de una fila pareja en
  vez de abriendo la suya. La definición vive en la pantalla y no en `Grupo`,
  porque la grilla no es del grupo: el Tablero mete seis grillas distintas
  dentro de los suyos.
- **La portada, en dos columnas**: el saludo a la izquierda, la frase al lado.
  Apilada —saludo, rol, link, y recién abajo la frase en serif a 24 px— medía
  casi un tercio del alto útil, así que la primera tarjeta empezaba **abajo del
  pliegue**: el Inicio abría con una cita y no con el trabajo. Al costado, la
  frase ocupa el ancho que igual estaba vacío y la portada mide la mitad.

Dos casos lo sostienen, y el primero es el que importa: **la portada dibuja UNA
sola banda de tinta**. Volver a anidar dos piezas que se dibujan igual no falla,
se ve mal y compila.

#### A4 · El sidebar sigue al tema

*"Al poner light mode, que también se cambie el sidebar."*

⚠️ **Revierte una decisión explícita mía de la etapa 1**, que está escrita en
`index.css` y en `tema.ts`: *"el shell NO sigue al tema, y eso es la identidad"*. El
argumento era que la navegación no se lee, se recorre, y que la tinta permanente es lo
que deja entrar la marca.

**Ignacio decidió lo contrario y es su llamada.**

✅ **Hecho el 2026-09-01**, y el argumento viejo está **borrado** de `index.css` y
`tema.ts` — no puesto al lado del nuevo, que es la regla del proyecto para cuando
una decisión cambia.

**La marca no se pierde, y eso es lo que hizo que la decisión fuera barata: el
shell claro es hueso.** `--bone-2` es una de las tres tintas de la marca, no un
gris nuevo, así que sigue siendo una paleta de tres tintas y el shell sigue
siendo la superficie que la lleva. Lo que se conserva de la decisión vieja es lo
único que valía: que la navegación y el lienzo sean **dos** superficies, que es
lo que separa de un vistazo "dónde estoy" de "qué estoy mirando".

⚠️ **Y obligó a partir el rojo por tercera vez.** Sobre el hueso del shell claro,
`--red` mide **2,98:1** — y la barra del ítem activo es un indicador de estado, o
sea información, que pide 3:1. Existe `--shell-acento`: `--acento` en claro
(4,28:1), `--red` en oscuro. Es exactamente la partición que `index.css` ya
declaraba para el rojo entre superficie y texto, aplicada al tercer fondo del
sistema. Por lo mismo, **el anillo de foco pasó de `--red` a `--acento`**: tiene
que rendir contra las tres superficies y contra el shell claro no rendía.

**La única superficie que se queda en tinta pase lo que pase es la mitad de foto
de `Puerta`**, y está escrito ahí: no es una superficie de trabajo, es la marca.

#### A3 · Contraste en oscuro

*"Al poner el fondo negro hay botones o palabras en menúes desplegables y en otras
secciones que no se notan bien, recorrer todo y mejorar el contraste."*

✅ **Hecho el 2026-09-01, con todo medido.** La lista de sospechosos era correcta
y **la causa era una sola y estaba más abajo**: faltaban tokens. Los cinco
cambios, con los números:

| Qué | Antes | Ahora |
|---|---|---|
| `--texto` (nuevo) | no existía; doce lugares escribían `text-ink` → **1,11:1** en oscuro | sigue al tema |
| `--tenue` | ink@0,56 → 4,39:1 sobre el papel | ink@0,66 → **6,20:1** · bone@0,66 → **6,56:1** |
| `--apagado` | ink@0,30 → **2,01:1** · bone@0,34 → 2,64:1 | ink@0,58 → **4,72:1** · bone@0,52 → **4,56:1** |
| `--linea-control` (nuevo) | los campos usaban `--linea` → **1,30:1** | 0,46 → **3,27:1** claro · **3,85:1** oscuro |
| `--accion` / `--accion-texto` (nuevos) | `bg-ink` fijo → **1,11:1** en oscuro | se invierte con el tema |

Cuatro cosas que la recorrida decidió y conviene no deshacer:

- ⚠️ **`--apagado` sube al piso de lectura, no al de la decoración.** Son cien
  usos y dicen *"Sin comprobante"*, *"A acordar"*, *"Sin asignar"*, *"no
  descuenta clases"*, la ayuda de un campo y la fila vacía de una tabla. Siguen
  siendo tres escalones perceptibles (18,9 · 6,2 · 4,7) y ahora los tres se leen.
  **Quien quiera un cuarto nivel más apagado que esto no lo va a conseguir con
  gris**: lo que queda abajo de 4,5 no es jerarquía, es texto que alguien no
  puede leer.
- ⚠️ **El borde de un control no es el borde de una tarjeta.** `--linea` mide
  1,30:1 y está bien donde está: separa superficies, no informa nada. Pero un
  campo de este sistema **es una línea**, así que ese borde de 1px es toda la
  señal de que ahí se escribe — es un control, y pide 3:1. Lo mismo el borde del
  botón secundario, que es su única forma, y **el pulgar de la barra de scroll**,
  que la etapa 1 se acordó de pintar con la paleta propia y no de que se viera.
- **Los `<option>` se pintan explícitamente.** `color-scheme` orienta al
  navegador, pero el popup de un `<select>` hereda el `background-color` del
  control — y los de este sistema son `bg-transparent`, porque el campo es una
  línea. Son dos declaraciones y sacan del medio al primer sospechoso.
- **`Etiqueta` y `Boton variante="enlace"` no necesitaron nada propio**: los dos
  se apoyaban en `--tenue` / `--apagado` y se arreglaron solos al arreglarse los
  tokens. Es la prueba de que la 3.1 valió: **la corrección de contraste de toda
  la aplicación fue editar una paleta, no treinta y seis pantallas.**

#### A6 · Interruptor de tema en el login

*"Que el iniciar sesión también tenga botón de light y dark mode."*

Va en la mitad de papel de `Puerta`, no en la de tinta —esa es marca y no cambia—. Y
**tiene que escribir la misma clave `lajuanita.tema`** que usa `useTema`, o alguien elige
el tema en la puerta y al entrar le cambia solo.

✅ **Hecho el 2026-09-01**, y salió más barato de lo previsto: `useTema(null)` ya
andaba sin sesión, porque `temaPorDefecto(null)` contesta claro para quien
todavía no entró. Es la misma función, así que la clave es la misma por
construcción y no por acordarse.

Dos cosas que decidió:

- **`SelectorDeTema` ahora tiene dos tonos**, shell y lienzo. Es la partición que
  `Boton` documenta —sus variantes están calibradas contra el papel y sobre el
  shell no se ven—, con la diferencia de que acá son dos juegos de **un solo
  control** y no la promesa de duplicar cada variante futura.
- **Va arriba a la derecha, fuera de la columna del formulario**: es una
  preferencia de la pantalla, no un paso de entrar. Entre los campos se leería
  como parte del formulario, y hay un caso que lo sostiene.

⚠️ **El caso que importa escribe `'lajuanita.tema'` a mano en vez de importar la
constante**, por la misma razón que los dos de `credencial.test.ts`: importándola,
el caso seguiría en verde después de un renombre — que es exactamente lo que
existe para agarrar.

#### A8 · El favicon

*"Cambiar el ícono del sistema, ahora tiene un rayito violeta, ponele el abanico u otra
cosa de identidad."*

Es el `favicon.svg` que vino con la plantilla de Vite. Va el abanico, que ya existe
dibujado en SVG (`componentes/Abanico.tsx`) y **no se puede importar desde ahí**: el
favicon es un archivo estático que pide el navegador antes de que corra un solo módulo.

✅ **Hecho el 2026-09-01.** Se generó con **el mismo algoritmo** del componente
—mismo pivote, misma apertura de 156°, mismas varillas del medio un poco más
largas—, así que es la tercera copia del dibujo y está escrito en el archivo:
`Abanico.tsx` ya era copia del `Fan.tsx` de la landing, y ésta no puede salir de
ninguna de las dos. Si el dibujo de la marca cambia, cambia en los **tres** lados.

Dos adaptaciones al tamaño, las dos deliberadas: **nueve varillas y no trece**
(a 16 px, trece se empastan en una mancha) y el arco interior afuera. Y va sobre
un cuadrado de tinta y no suelto — **una pestaña puede ser clara u oscura y el
rojo de marca no rinde contra las dos**, que es el mismo problema que A4 acaba de
resolver del otro lado.

#### A9 · El cursor

*"Que el cursor se ponga modo pointer cuando hay algo clickeable; por ejemplo en
artistas, al apretar el nombre se abre su info pero el cursor no está pointer,
cualquier persona no sabría que hay que hacerle click."*

⚠️ **No es cosmético: es la afordancia.** Un `<div>` o un `<td>` con `onClick` no le dice
a nadie que se puede tocar. Y el diagnóstico de Ignacio apunta a algo más profundo — **si
hace falta `cursor-pointer`, probablemente ese elemento debería ser un `<button>` o un
`<a>`**, que además lo hace alcanzable con teclado. La recorrida tiene que distinguir los
dos casos y no tapar el segundo con una clase.

✅ **Hecho el 2026-09-01, y la causa era una sola línea que nadie escribió.**

⚠️ **Tailwind v4 sacó del preflight el `cursor: pointer` de los botones**, y nada
avisa: la hoja del navegador les da `cursor: default`, así que **todos los
`<button>` de las 36 pantallas** dejaron de decir que se pueden apretar. El
ejemplo de Ignacio lo prueba desde el otro lado: la tarjeta de artista **ya era un
`<button>`** — no faltaba semántica, faltaba la regla. Son cuatro líneas en
`index.css` y arreglan el sistema entero de una vez.

**La segunda mitad de su diagnóstico se fue a buscar y no había nada que
arreglar**: en todo el repo no existe un solo `onClick` sobre un `<div>`, un
`<td>` ni un `<li>` — todo lo clickeable ya es `<button>` o `<a>`. O sea que
**nada se está tapando con una clase**, que era el riesgo real del punto. Vale la
pena dejarlo dicho: la próxima recorrida no tiene que volver a barrer eso, tiene
que cuidar que siga siendo cierto.

#### A5 · Las frases

*"Que la frase de algún DJ cambie por día, podríamos armarnos un lugar en el repo para
almacenar muchas e ir poniéndolas."*

**La rotación por día ya está construida** (§10, etapa 2): `fraseDelDia(fecha)` rota por
fecha y no al azar, justamente para que sea la misma para toda la gente todo el día. Lo
que falta es **volumen**: hoy son cuatro (dos citas verificadas y dos de la casa), así
que la rotación se nota poco.

⚠️ **Y el cuello de botella no es el código: es conseguir las citas.** El tipo de
`datos/frases.ts` impide agregar una frase atribuida sin `fuente`, a propósito — este
proyecto ya tiene abierto el problema de las seis notas del blog firmadas con los nombres
reales de los profesores. Cada cita nueva es trabajo de búsqueda y verificación, no de
programación.

✅ **Volumen cargado el 2026-09-01: de 4 frases a 14.** La rotación ya se nota
—antes la frase volvía cada cuatro días— y `fraseDelDia` no tiene tope, así que el
techo no es el código.

⚠️ **Pero mirá la proporción, que es el punto que queda abierto: doce de la casa y
siguen siendo sólo dos citas.** Las de la casa se pueden escribir porque la casa
es el cliente y él las confirma o las cambia (van marcadas como placeholder,
igual que el resto de la copia larga). **Una cita no se puede escribir, se tiene
que ir a buscar**: autor real, dicho real, y una URL donde verificarlo. Ese
trabajo sigue pendiente y es de búsqueda, no de programación — está anotado en el
encabezado del propio archivo para que nadie lo dé por cerrado al ver catorce.

---

### 🟡 Grupo B — funcionalidad, sin tocar el schema

#### B1 · Divisiones por sección

*"Intentar hacer divisiones por donde se pueda; por ejemplo en pagos, dividir esa sección
por dentro: pagos de equipos, de servicios, de programas. Mismo con materiales que le
subieron al alumno, dividirlo por programa, por clase. Ahí te tiré ejemplos, quizás hay
más."*

**El dato para dividir ya existe en los dos casos**, así que es agrupar en la pantalla y
no cambiar la base:

- **Pagos**: un pago apunta a una inscripción, a una reserva o a una venta de equipo, y
  de ahí sale su línea de negocio. **Esa definición ya está escrita y probada**: es la
  que usa el Tablero para no decir que el estudio factura por alquilar lo que cobró por
  enseñar. ⚠️ **Hay que reusarla, no escribir una segunda** — sería la tercera copia de
  una definición en este proyecto.
- **Materiales**: `material` cuelga de la inscripción y puede colgar de una clase, así
  que agrupar por curso y por clase sale del dato.

**Y el pedido tiene una parte abierta a propósito** (*"quizás hay más"*): antes de
construir hay que recorrer las pantallas de listado buscando las que mezclan cosas de
distinta naturaleza en una sola lista.

---

✅ **Hecho el 2026-09-01 — dos de las tres partes. Y la tercera no es B.**

#### Pagos ✅

La pantalla gana **un filtro por tipo de pago** —Programas · Salas y cabina · Mix &
Mastering · Equipos— y **cada fila dice a qué negocio pertenece esa plata**.

⚠️ **El filtro es por DESTINO y la etiqueta es por LÍNEA, y no son lo mismo.** Vale
la pena entender la diferencia antes de "unificarlos":

- El **destino** es a qué apunta el pago: cuatro columnas de `pago`, una sola con
  valor. Es un hecho de la fila.
- La **línea** cruza además el tipo de uso de la reserva. **La seña de una clase
  apunta a una RESERVA y es plata de CURSOS.** Sin ese cruce la pantalla diría que
  el estudio cobró por alquilar lo que cobró por enseñar.

El filtro va por el destino **porque filtrar por línea obligaría a escribir la
deducción una segunda vez**: el listado es una consulta JPQL y la definición vive
en SQL nativo. O sea, exactamente lo que este punto pedía no hacer.

⚠️ **Y reusar la definición costó más que escribirla, que era el punto.** Estaba
adentro de la consulta del tablero, agregada con `GROUP BY`. Se intentó primero
pasar las dos a JPQL —para compartir el texto— y **no se puede: Hibernate 7 no
acepta un `CASE` dentro de un `GROUP BY`** (*"mismatched input 'WHEN'"*). Así que
el `CASE` salió a `LineaDeNegocio.EXPRESION`, en SQL nativo, y las dos consultas lo
pegan. Lo que hace verificable que sigan siendo una sola: **si discreparan, el
mismo pago caería en un negocio en el listado y en otro en el Tablero**, y nada
fallaría.

#### Materiales ⚠️ **La premisa de este documento era falsa**

Arriba dice que *"`material` cuelga de la inscripción y puede colgar de una clase,
así que agrupar por curso y por clase sale del dato"*. **No es cierto, y se
verificó contra la base y no contra el modelo**: `material` tiene `id_profesor` e
`id_alumno`, y **ninguna columna de inscripción ni de reserva** — `V1` la creó así
y sólo `V14` la volvió a tocar, sin agregarlas.

**Entonces la mitad "materiales" de B1 no es grupo B: es grupo C.** Dividir por
programa o por clase necesita columnas nuevas en `material`, o sea una migración,
o sea el grupo que no se apura. Queda anotado abajo, en C.

Lo que sí se hizo, porque sale del dato: **los materiales del alumno se agrupan por
quién los subió**, con la cantidad de cada uno y **el grupo más reciente primero**
(alfabético haría que quien no sube nada hace tres meses encabece la pantalla por
llamarse Álvarez). El encabezado dice **el nombre de la persona y no el de un
programa**: es exactamente lo que se sabe, ni más ni menos.

#### La parte abierta: *"quizás hay más"* ✅ recorrida

De las pantallas de listado, la que más mezclaba cosas de distinta naturaleza no
era ninguna de las dos que Ignacio nombró:

- ✅ **`/mis-reservas`** — una clase de DJ y una cabina alquilada para practicar
  **no se cancelan igual, no se pagan igual y no descuentan lo mismo**, y estaban
  en una sola lista por fecha donde la única forma de distinguirlas era leer el
  nombre del tipo de uso. Ahora son dos listas. El dato ya estaba (`esClase`).
  ⚠️ **`Proxima` sigue siendo una sola y mira las dos**: la pregunta que contesta
  es "cuándo tengo que venir al estudio", y venir a una clase o a la cabina que
  reservaste es venir igual.
- 🔴 **`/admin/egresos`** — mezcla sueldos de profesores con gastos del estudio y
  **no tiene con qué separarlos**: `egreso` tiene `concepto` (texto libre) y
  `destinatario`, sin rubro. Mismo caso que materiales: es C, no B. Anotado abajo.
- Las demás ya venían divididas por donde correspondía: inscripciones filtra por
  disciplina y nivel, el buzón por interés, ventas por categoría.

---

### 🔴 Grupo C — toca una regla del negocio

> ⚠️ **B1 le dejó dos puntos a este grupo el 2026-09-01**, y los dos por el mismo
> motivo: **el dato para dividir no existe**. No son cambios de pantalla mal
> triados — son columnas que hay que agregar, o sea migraciones, o sea el grupo
> que no se apura.
>
> - **C2 · Materiales por programa y por clase** — ✅ **HECHO el 2026-09-02**,
>   con `V23__el_material_es_de_un_curso.sql`. Contestado en `platform.md` §18 ·
>   P41: *"el profe sube el material para su alumno de su programa de esa clase,
>   punto"*, y **sí puede ser del curso entero**.
>
>   **El material ahora cuelga de la inscripción** (obligatoria: dice el programa
>   Y el alumno, porque una inscripción es el contrato de un alumno) **y
>   opcionalmente de una reserva** (la clase). `id_alumno` y `es_grupal` se
>   fueron: eran el par que definía el destinatario, y la inscripción los
>   reemplaza a los dos.
>
>   ⚠️ **Lo que había era peor que "falta una columna", y conviene que quede
>   escrito**: el material "grupal" **no se filtraba por nada** —le llegaba a
>   todos los alumnos del estudio, incluidos los que nunca tuvieron a ese
>   profesor— y las tres pantallas lo llamaban de tres formas distintas. Nadie
>   mintió: **nadie lo había decidido nunca.**
>
> - **C3 · Egresos** — ✅ **HECHO el 2026-09-02.** Contestado como ***profesores
>   vs. resto, ya***, y **sin migración**: salió de `egreso.id_usuario_destino`,
>   que existe desde `V1` con su comentario escrito y que **no usaba ninguna
>   pantalla**. O sea que este punto, triado como C, terminó siendo B. Ver
>   `platform.md` §18 · P42.
>
>   La pantalla gana un filtro *Pagos a profesores / Otros gastos*, filtrado **en
>   el servidor** —`EgresosPagina` pagina, así que recortar lo ya traído mostraría
>   un subconjunto como si fuera el total—, y cada fila dice de qué lado está.
>
>   ⚠️ **El corte es "tiene destinatario con cuenta", NO "esa cuenta tiene
>   relación de profesor"**, y la diferencia es deliberada: mirar la relación
>   haría que **un sueldo pagado en marzo dejara de contar como sueldo el día que
>   esa persona deje de dar clases**. La historia de la plata no puede cambiar
>   hacia atrás — es el mismo criterio por el que en este esquema nada se borra.
>   Hoy las dos lecturas dan igual porque el alta sólo ofrece profesores; si eso
>   cambia, el corte hay que revisarlo (está anotado en la consulta).
>
>   **De paso, la pantalla adoptó la barra `Filtros`** del sistema de diseño: era
>   una de las que se había quedado con un `<input type="search">` suelto de antes
>   de la 3.1.
>
>   Los rubros de verdad (alquiler, servicios, equipamiento) quedan afuera por
>   ahora: necesitan la lista confirmada con el cliente, y es el tipo de dato que
>   si se inventa se usa mal para siempre.

#### C1 · Que la clase se descuente sola

*"Al agendar algún tipo de programa como mentoría, DJ o producción, que no haya el botón
de selección de 'descuenta de' sino que se descuente solo; si se cancela se vuelve a
sumar y todas las funcionalidades demás que tiene. Pero si no, uno podría reservar sala
para producción y descontar de clase de DJ sin querer."*

**El riesgo que describe es real y está en el código**: `CamposDeParticipante` ofrece
*todas* las inscripciones vigentes del alumno, sin mirar para qué es la reserva.

✅ **Las dos preguntas que lo bloqueaban están contestadas** (Ignacio, 2026-09-01) y
viven en `docs/requirements/platform.md` §17:

- **P39** — sin inscripción vigente en esa disciplina, **el alta se rechaza**: *"que el
  admin lo inscriba, para eso está"*. Y el error tiene que decir dónde ir a arreglarlo.
- **P40** — **la mentoría descuenta igual que las otras dos**. Lo que no tiene es un
  valor por defecto, no la capacidad de descontar: el admin pone las clases contratadas
  al dar de alta el programa y se descuenta contra ese número.

**Lo que hay que construir**, en orden:

1. **`V22`: `tipo_uso.disciplina`**, nullable, con CHECK contra los tres valores. ⚠️ La
   correspondencia hoy no vive en ninguna capa —está implícita en los nombres— y va como
   columna y no como `Map` en Java, por el precedente que escribió la propia `V1` para la
   matriz sala×uso. Con esto, desactivar el admin sembrado pasa a ser **`V23`**.
2. **El backend deriva la inscripción** del tipo de uso de la reserva y rechaza con
   mensaje propio si no hay una vigente.
3. **El `<select>` "Descuenta de" desaparece de la pantalla.** El alta muestra contra qué
   curso va a descontar, como dato y no como control.
4. **Lo que NO cambia y hay que verificar que siga andando**: cancelar la participación
   devuelve la clase (ya lo hace — es `reserva_participante` cancelada, que `V9` §5 no
   cuenta como consumida), y los tres usos que no son clase siguen sin descontar nada.

---

✅ **HECHO el 2026-09-01.** `V22` aplicada, los cuatro pasos construidos, y las
suites en **558 backend / 489 front / 212 + 56 SQL**.

**Lo que encontró, y es lo que hay que leer antes de tocar esto de nuevo:**

⚠️ **1. "La inscripción vigente de esa disciplina" puede no ser una.** El índice
único de `V1` es `WHERE estado = 'ACTIVA'` — **sólo ACTIVA**—, mientras que
"vigente" en este sistema es `ACTIVA + PAUSADA`. O sea que alguien que cursó,
pausó y se reinscribió tiene **dos vigentes de DJ**, y "la vigente" no sería una
sino dos. **Elegir entre ellas en silencio es el mismo bug de C1 con otro
disfraz**, así que el servidor busca sólo la ACTIVA: eso es lo único que el índice
garantiza único.

La consecuencia es una regla nueva y conviene que esté dicha: **un curso pausado
no recibe clases.** Es la lectura estricta de P39 aplicada al otro estado —dar una
clase contra un curso pausado lo reactiva de hecho, sin que nadie lo decida ni lo
firme—, y tiene **su propio mensaje**: *"tiene el curso de DJ pausado… reactivale
la inscripción en Inscripciones y volvé"*. Sin ese mensaje, a quien pausó un curso
el sistema le diría "no tiene inscripción" y lo mandaría a cargar una segunda, que
el índice único después le rechaza.

⚠️ **2. Un caso viejo dejó de poder existir, y no se borró: se movió de capa.**
`no_se_puede_descontarle_la_clase_a_la_inscripcion_de_otro` mandaba la inscripción
ajena en el pedido y esperaba el 409 de `V1` §8.2. **Ahora el pedido no tiene
dónde poner una inscripción**, así que por la API el error no se puede ni
expresar. La regla de la base sigue siendo la que manda, y ahora se la ataca **con
SQL crudo** — el mismo recurso que `InscripcionTest` usa con la firma de la baja de
nivel. Borrar el caso hubiera dejado sin vigilancia un trigger que sigue vivo.

⚠️ **3. Seis casos de `ReservaTest` empezaron a fallar, y todos por la razón
correcta**: anotaban alumnos **sin inscripción** en clases de DJ, que es
exactamente lo que P39 vino a prohibir. Es la señal de cuánto tapaba el `<select>`:
seis pruebas del módulo de reservas daban por normal una clase que no descontaba de
ningún lado.

**Y una decisión de forma que conviene no deshacer:** el CHECK de `V22` va en los
**dos** sentidos. Que un alquiler no descuente es lo obvio; la mitad que importa es
que **una clase no pueda quedarse sin disciplina** — un `tipo_uso` nuevo con
`es_clase = TRUE` y la columna en NULL no fallaría nunca y produciría clases
fantasma. Si algún día existe una clase que no descuenta (una charla abierta, una
clase de prueba), esto se revisa **a propósito** en otra migración: eso es lo que se
quiere, una decisión explícita y no un NULL que alguien se olvidó.

**En la pantalla**, el `<select>` "Descuenta de" ya no existe: en su lugar hay un
dato que dice contra qué curso va a descontar, con cuántas clases le quedan — y
cuando el alumno no tiene ese curso, **lo avisa antes de mandar el pedido**, con el
mismo texto que devolvería el backend.

---

## 13. La SEGUNDA barrida de correcciones — abierta el 2026-09-01

> §12 era *"la PRIMERA"* y quedó dicho que iban a venir más. Vino la segunda, y
> lo primero que hay que anotar es lo que Ignacio dijo al traerla:
>
> *"Hallazgos nuevos, cada vez encuentro menos, vamos por el camino correcto,
> todo empezó a tomar forma de manera descomunal."*
>
> **Que cada barrida encuentre menos es el resultado esperado**, y vale saber por
> qué: las reglas viven en la base, así que lo que se arregla no se vuelve a
> romper por el costado. Lo que sí cambia de tanda en tanda es el **tamaño** de lo
> que aparece — esta trajo tres cosas de pantalla y **un cambio de regla de
> negocio**, que es el hallazgo más grande desde que se cerró el MVP.

### ⚠️ DÓNDE RETOMAR (sesión del 2026-09-02)

✅ **LA SEGUNDA BARRIDA ESTÁ CERRADA: cuatro de cuatro.** A1 (las frases), B1 (los
contadores del sidebar), B2 (las solapas de pagos) y **C1 (la prereserva, `V24`)**.

**Suites: 584 backend · 515 front · 226 + 56 SQL**, sobre **24 migraciones**.
`tsc -b` y los dos linters limpios. Nada quedó a medias en el árbol.

**Lo que sigue no es de esta barrida:**

1. **Desactivar el admin sembrado por `V3`** — ahora es **`V25`**, porque `V24` se
   la llevó la prereserva.
2. **El deploy de octubre** (`operacion.md` §3).
3. **Y la próxima barrida.** Ya van dos, y la lectura de Ignacio sobre ésta fue
   *"cada vez encuentro menos, vamos por el camino correcto"* — que es lo que se
   espera cuando las reglas viven en la base: lo que se arregla no se vuelve a
   romper por el costado. Lo que cambia de tanda en tanda es el **tamaño** de lo
   que aparece.

⚠️ **Y una cosa que esta barrida dejó abierta a propósito**: el vencimiento de una
prereserva firma la cancelación con **quien preconfirmó**, porque `V7` exige autor
y acá el autor es un reloj. Está argumentado —esa persona puso el plazo y su
consecuencia— pero es la clase de decisión que alguien va a querer revisar. Si
algún día este sistema necesita una identidad para actos automáticos, **éste es el
primer lugar donde mirar**.

---

### Las advertencias de método de esta barrida

Las cinco costaron tiempo y las cinco se repiten solas si nadie las anota:

- ⚠️ **Una consulta derivada por nombre no la valida el compilador.** Los tres
  `countByEstado` de B1 los valida Spring al armar el contexto: `mvn clean compile`
  en verde no prueba nada sobre ellos. Es el primo del `mvn compile` que mintió
  en §12.
- ⚠️ **El nombre accesible de un elemento concatena sin espacios.** Una solapa que
  dice "Servicios" con una pastilla "7" al lado se llama **`Servicios7`** — el
  `gap` es CSS y no un nodo de texto. Cuatro casos de B2 fallaron por eso y el
  error no lo dice. Van con expresión regular.
- ⚠️ **Un importe nuevo en pantalla rompe los casos que buscaban el viejo por
  texto.** Se acota con `within(la tabla)`, no se afloja la aserción — y cuando el
  que se busca es el nuevo, el fixture usa **un número distinto** del de la fila,
  para que la aserción no pueda pasar mirando el equivocado.
- ⚠️ **Navegar una relación en JPQL genera un INNER JOIN implícito.**
  `p.reserva.estado` descartó todas las deudas sin reserva —o sea casi todas— y
  costó siete casos rojos. La consulta anda y la lista viene corta: **es el modo de
  falla que `V19` documentó**, ahora puesto por el ORM en vez de escrito a mano.
- ⚠️ **Un trigger nuevo puede rechazar tu propio código, y eso es lo que tiene que
  pasar.** La escalera de `V24` §5 rechazó nueve casos porque el servicio insertaba
  la reserva y la marcaba apartada **después**. La regla es que tiene que **nacer**
  apartada; el trigger se escribió contra un esquive malicioso y atajó un error
  honesto el mismo día.

### El triage, con los grupos de §4

| Grupo | Qué significa | Cuántos |
|---|---|---|
| 🟢 **A** | Pantalla, texto y estilo. No toca reglas ni schema | **1** |
| 🟡 **B** | Funcionalidad nueva o cambiada, sin tocar el schema | **2** |
| 🔴 **C** | Toca una regla del negocio o el schema. **No se apura** | **1** |

**Orden de ejecución: A → B → C**, el mismo de siempre.

**Las cinco preguntas de negocio que abrió esta tanda se contestaron antes de
codear** y están en `docs/requirements/platform.md` §19 (P43 a P47). Es la cuarta
vez que ese orden paga.

---

### 🟢 A1 — Frases reales de DJ, con autor

> ✅ **CERRADO el 2026-09-01.** De 14 frases a 29; de 2 citas a 17.

Ignacio: *"tener muchas frases reales de dj y poner quién lo dijo, poner 1 por
día, tampoco tener 365 frases, tener muchas y vamos variándolas"*.

**El mecanismo ya existía y no se tocó** — `fraseDelDia(fecha)` rota por fecha y
no al azar, y el Inicio ya dibujaba el autor **como link a la fuente**. Lo que
faltaba eran las citas, que es exactamente lo que §12 · A5 había dejado anotado:
*"una cita no se puede escribir, se tiene que ir a buscar"*.

Las diecisiete son de **diez personas**: Frankie Knuckles, Jeff Mills, Carl Cox,
Laurent Garnier, Honey Dijon, Kerri Chandler, Jackmaster, **Hernán Cattáneo**,
Jayda G y Ellen Allien.

**Tres cosas que este punto decidió y conviene no deshacer:**

⚠️ **1. Las tres de Cattáneo no se traducen, y valen doble.** Las dijo en
castellano, en medios argentinos. *"Pasar música sin gente es como jugar al tenis
solo"* no necesita nota al pie en un estudio de Pilar.

⚠️ **2. El buscador parafrasea; cada cita se leyó en su página.** Los resúmenes de
búsqueda devolvieron frases *casi* textuales — y "casi" acá es todo el problema,
porque lo que se firma es el nombre de una persona real. Las diecisiete se
verificaron abriendo la nota y copiando palabra por palabra. Dos medios (Mixmag
entre ellos) contestan **403 a un fetch** y hubo que ir por el espejo de
`mixmag.asia`; si una fuente no se puede abrir, la frase no entra.

⚠️ **3. EL ORDEN DEL ARREGLO ES UNA DECISIÓN, y tiene su prueba.** `fraseDelDia`
avanza de a una por día, así que **dos frases pegadas en el arreglo son dos días
seguidos**. Las citas salen de la búsqueda agrupadas por autor —tres de Chandler,
tres de Cattáneo, dos de Cox, dos de Honey Dijon, dos de Allien— y así ordenadas
el Inicio mostraría a la misma persona **tres días en fila**, que es lo contrario
exacto de la variedad que se pidió. Están intercaladas a mano, y el caso
"no hay dos citas seguidas del mismo autor" es lo único que lo sostiene: sin él,
agregar la número dieciocho al final junto a otra del mismo autor **no rompe nada
y nadie se entera hasta verlo en pantalla, dos días después**.

**Lo que sigue abierto**: el techo no es el código. `fraseDelDia` no tiene tope y
las frases de la casa siguen siendo placeholder hasta que las confirme el cliente,
igual que el resto de la copia larga.

---

### 🟡 B1 — Contadores de pendientes en el sidebar

> ✅ **CERRADO el 2026-09-02.** Backend en **569** (eran 564) y front en **500**
> (eran 493).

Ignacio: *"cuando tengas una notificación que diga (1) pero en el sidebar (…) en
caso de admin aparte de eso, también en lo que es pedidos de sala, pedidos de
cambio, buzón de la web, todo lo que sea notificación; obviamente cuando se marque
como leída, baja"*.

**Son cuatro contadores y dos endpoints, no uno.** Las notificaciones son de cada
persona y **su endpoint ya existía** (`GET /api/me/notificaciones/sin-leer`, del
Módulo 4). Las tres bandejas son de administración y son el endpoint nuevo.

⚠️ **Dos endpoints y no uno que conteste distinto según quién llame.** Es la misma
decisión que tomó el Módulo 8 con el tablero y la propiedad que se impuso el
Módulo 4: *ningún endpoint de este sistema cambia de significado según quién lo
llama*. Con uno solo, un `USUARIO` —que no tiene ninguna de las tres bandejas—
tendría que llamar a un endpoint de administración para saber cuántos avisos
tiene.

**Lo ve también `DIRECTIVO`**: son las mismas pantallas que ya ve. Esconderle el
número de una sección que sí puede abrir sería mentirle sobre lo que hay adentro.

⚠️ **Y una que casi se escribe mal: `countByEstado` es una consulta derivada por
nombre, y el compilador no la valida.** La valida Spring al levantar el contexto.
Un `mvn clean compile` verde no prueba nada sobre estos tres métodos; hay que
correr algo que arranque la aplicación. Es el primo del `mvn compile` que mintió
en §12.

**Cómo quedó construido**, y las tres decisiones de forma que conviene no
deshacer:

- **`ItemMenu.contador` guarda una CLAVE, no un número.** `menu.ts` sigue siendo
  una función pura de `UsuarioActual` —sin red, sin estado, testeable de un
  plumazo—; el número lo trae `usePendientes` y lo dibuja `Layout`. Meterle el
  número volvería asincrónico al módulo del que este proyecto está más orgulloso.
- **Se refresca al montar y en cada cambio de ruta**, y eso es lo que hace honesto
  el *"cuando se marque como leída, baja"* sin cablear cuatro pantallas para que
  avisen: **navegar es justo lo que pasa después de resolver algo** —se aprueba un
  pedido de sala y se vuelve al calendario, se atiende una ficha del buzón y se va
  a crear la inscripción—. Para el caso que eso no cubre (resolver y quedarse
  quieto) el hook expone `refrescar`.
- **Cero no se dibuja, y lo que no llegó tampoco.** Son dos motivos distintos y
  los dos importan: un `(0)` fijo en cuatro ítems de las 36 pantallas es ruido
  permanente que enseña a no mirar ese lugar; y un contador que no volvió —el
  pedido falló— queda sin pastilla en vez de inventar un cero, que sería afirmar
  que la bandeja está vacía sin haberla podido mirar. Un error acá **no rompe el
  menú**: es el mismo criterio del Inicio, donde un bloque caído no vacía la
  pantalla.
- **La pastilla no usa el rojo de la marca.** En este sistema el rojo es un
  bisturí —un acento por pantalla— y cuatro pastillas rojas fijas en la columna se
  comerían al único rojo que tiene que resaltar.

---

### 🟡 B2 — Pagos, subdividido por línea de negocio

> ✅ **CERRADO el 2026-09-02.** Backend en **573** y front en **506**.

Ignacio: *"no basta con saber de qué sección es, tener todo en una lista gigante
para abajo, más allá de los filtros; estaría bueno subdividir en grupos de alguna
forma — programas, servicios y venta de equipos. Siento que está todo en la misma
bolsa"*.

**El diagnóstico que la barrida agrega, y no estaba en su lista**: hoy la pantalla
habla **dos vocabularios sobre la misma fila**. El filtro es por `destino` —las
cuatro columnas nullable de `pago`— y la etiqueta de cada fila es por **línea de
negocio**, que sale de `LineaDeNegocio.EXPRESION`. Así, el filtro dice *"Reserva de
sala"* y la etiqueta de esa misma fila dice *"Cursos"*. **Unificar en la línea
arregla eso de paso**, y es lo correcto además porque la línea es la que sabe que
la seña de una clase es plata del curso y no del alquiler.

Las solapas, y **son cuatro y no las tres que pidió** (P47):

| Solapa | Líneas |
|---|---|
| Todos | — |
| **Programas** | `CURSOS` |
| **Servicios** | `ALQUILER_CABINA`, `GRABACION_SET`, `MIX_MASTERING` |
| **Venta de equipos** | `VENTA_EQUIPOS` |
| **Sin destino** | `OTRO` — sólo si tiene filas |

⚠️ **La deducción NO se reescribe.** `LineaDeNegocio.EXPRESION` + `JOINS` ya la
tienen, compartida con el tablero, y §12 · B1 lo pidió con todas las letras:
*"hay que reusarla, no escribir una segunda"*. Lo único nuevo es el mapa
grupo → líneas, en Java.

⚠️ **La trampa técnica, y cómo se resolvió.** `PagoRepository.listar` era JPQL y
`EXPRESION` es SQL, así que **no se podía filtrar por línea sin duplicar la
definición** — el javadoc de esa consulta ya lo tenía anotado con todas las letras
desde §12 · B1. Las dos salidas eran reescribir el `CASE` en JPQL (la copia que
§12 vino a evitar, y que **se desincroniza sin que nada falle**: el mismo pago
caería en una solapa en el listado y en otra línea en el tablero) o traer la
consulta al dialecto donde la definición ya existe. **Se hizo lo segundo, y eso
partió la consulta en dos:**

- **`idsListados` es nativa y devuelve ids.** Las dos cosas son la misma decisión:
  una consulta nativa no puede `JOIN FETCH`, así que mapear a entidades ahí dejaría
  las asociaciones perezosas y **pintar veinte filas costaría decenas de viajes** —
  exactamente lo que `lineasDe` y `ventasConPago` existen para no hacer.
- **`porIdsConDetalle` es JPQL y trae el detalle** con sus `JOIN FETCH`, en una
  consulta más. **No ordena a propósito**: el orden lo decidió la consulta de ids y
  lo repone el servicio, porque pedirlo dos veces sería una segunda definición del
  orden de la pantalla — y la que nadie se acordaría de cambiar.
- ⚠️ **`:lineas` siempre llega con elementos.** Sin solapa elegida se le pasan las
  seis líneas, no `null` ni una lista vacía: un `IN ()` vacío es un error de
  sintaxis en Postgres y sobre una colección no se puede escribir el `IS NULL` que
  usan los demás filtros. Hay un caso que lo cuida, porque "simplificarlo" rompe el
  listado entero o —peor— lo devuelve vacío.
- ⚠️ **Los parámetros que pueden venir en null van con `CAST`.** Sin el cast el
  driver no puede inferir el tipo de un null y Postgres falla con un mensaje que
  habla de `bytea`: el mismo pozo que `Busqueda.patron` documenta del lado del
  `LIKE`.

⚠️ **Y una decisión que se tomó al revés primero: el grupo de cada línea lo dice
el servidor.** La primera versión devolvía sólo la línea y dejaba que la pantalla
agrupara — con el argumento de que agrupar es presentación. **Es falso, y el modo
de falla es concreto**: el mapa línea→solapa quedaría escrito dos veces, y una
solapa terminaría mostrando un número que no coincide con lo que lista, porque
cuenta con un mapa y filtra con el otro. `TotalDeLinea` viaja con su `grupo` ya
resuelto por `Grupo.de(...)`, que es el mismo que arma el filtro.

**Y el total de cada solapa es lo que ENTRÓ**, no la suma de la columna: sumar
todo mezclaría deuda anotada y plata anulada con plata real. Hay un caso que
carga un pago, lo anula, y verifica que la fila siga contando en `cantidad` y
desaparezca de `entraron`.

**En la pantalla**, dos cosas más:

- **La barra se pide aparte del listado y no depende de la solapa ni de la
  página.** De la solapa porque muestra **todas** —cada una con su número, sin que
  haya que entrar a verla, que es lo que se pidió—; de la página porque un total
  que cambia al pasar de página no es un total.
- **Si los números no vuelven, la pantalla sigue andando.** La barra es un dato de
  más, no el contenido: un endpoint caído no puede dejar sin listado justo a la
  pantalla donde se ve la plata.

---

### 🔴 C1 — La prereserva

> ✅ **CERRADO el 2026-09-02**, con `V24__la_prereserva.sql`. Suites SQL en
> **226 + 56** (eran 216 + 56), backend en **584** y front en **515**.

**Lo que quedó construido**, en el orden en que pasa:

1. **Llega el pedido** (portal) o **el admin carga la reserva** (calendario, P45).
2. **Apartar el horario**, que es lo que la pantalla ofrece **primero**: monto,
   moneda, cómo se va a cobrar y un mensaje. Nace la reserva en `PRECONFIRMADA`
   con su vencimiento, y un `pago` en `DEBE` apuntándole. **La sala queda tomada.**
3. La persona lo ve en *Mis reservas* —*"Falta abonarla · Vence el …"*, en rojo— y
   le llega una notificación con el monto y el plazo. Administración lo ve en
   **Deudores**.
4. **Se cobra** desde `/admin/pagos` con el botón *Cobrar*, que sólo aparece sobre
   una deuda. **La reserva pasa a CONFIRMADA sola**, en el mismo movimiento.
5. **O se vence**: cada diez minutos una tarea la cancela, libera el horario y
   avisa a las dos partes.

---

#### Lo que la migración decidió

`V24` hace cinco cosas y ninguna sobra:

1. El estado `PRECONFIRMADA`.
2. `reserva.vence_preconfirmacion`.
3. Un CHECK **bidireccional**: el estado es `PRECONFIRMADA` si y sólo si hay
   vencimiento. La mitad obvia es que una prereserva no se quede sin plazo; **la
   que importa es la otra**, que un plazo vivo no sobreviva en una reserva ya
   paga, donde le diría a quien mire la pantalla *"vence en 3hs"*.
4. `reserva_sin_plata_detras()` reescrita — es su cuarta versión (`V10` la
   escribió, `V11` la extrajo, `V12` le corrigió la lista de estados).
5. **La escalera**: a `PRECONFIRMADA` se entra sólo al nacer y se sale sólo a
   `CONFIRMADA` o `CANCELADA`.

⚠️ **El punto 5 es el que hace que los otros cuatro valgan algo.** Sin él queda
abierto el rodeo *confirmar → volver a preconfirmada → anular el pago*: sala
tomada, cero plata, y ningún trigger se queja — porque al volver, la condición
vuelve a aceptar una deuda. **Es el mismo agujero que `V18` §1b encontró en el
sello**, y es la segunda vez que este proyecto lo aprende: desde adentro de *"a la
prereserva se entra al nacer"* no se ve que la salida también hay que cerrarla.

⚠️ **Y del lado SQL no hubo que tocar NADA para que la prereserva ocupe la
franja**, que es el punto entero de la funcionalidad. Es un regalo de cómo `V1`
escribió la definición canónica —por lo que queda **afuera**— y así la repiten el
EXCLUDE de solapamiento, los dos triggers de bloqueo y los dos usos de `V9`: un
estado nuevo que ocupa entra solo en los cinco. Del lado de Java sí hubo que
editarlo, porque `EstadoReserva.OCUPAN_LA_SALA` está escrito por enumeración.

---

#### Las cuatro cosas que aparecieron construyéndolo

Ninguna estaba en el plan, y las cuatro son de las que se repiten si nadie las
anota.

⚠️ **1. Una deuda anotada no se podía cobrar, y el circuito entero dependía de
eso.** `estadoPago` no es editable —y por buenos motivos, están escritos en
`EdicionPagoRequest`— así que el único camino para una fila en `DEBE` era anularla
y volver a cargarla. Con una inscripción eso alcanza; **con una prereserva no puede
funcionar**, porque anular su deuda la deja sin nada detrás y `V24` la rechaza. Va
como `PATCH /api/pagos/{id}/cobro`, su propio endpoint —igual que la anulación,
porque son transiciones con regla propia— y **confirma la reserva en el mismo
movimiento**: separarlo deja reservas pagas que nadie confirmó, con el vencimiento
corriendo igual.

⚠️ **2. El vencimiento automático choca con `V7`, que exige autor.** Cambiar el
estado de una reserva pide `id_usuario_modifico`, y acá el autor es un reloj.
**Firma quien preconfirmó**, y el argumento hay que poder darlo: *no es una
decisión nueva* — esa persona puso el plazo y su consecuencia, y la cancelación es
esa firma cumpliéndose. Es distinto de inventar un autor para anular un pago, que
es lo que P46 rechazó: allá el acto era ajeno a lo que el admin había decidido, y
acá es literalmente lo que decidió.

⚠️ **3. Un INNER JOIN implícito de JPQL, que costó siete casos rojos.** Para sacar
de Deudores las deudas de reservas canceladas (P46) se escribió lo obvio —
`p.reserva.estado <> CANCELADA`— y **Hibernate agrega un join que descarta todas
las filas sin reserva**, o sea casi todas las deudas, que son de inscripción. La
consulta anda y la lista viene corta: **es el modo de falla que `V19` documentó**,
con la diferencia de que ahí el INNER estaba escrito y acá lo pone el ORM solo. Va
como subconsulta, y las dos redacciones —JPQL y SQL, porque el tablero es nativo—
viven juntas en `DeudaCobrable`.

⚠️ **4. El trigger de la escalera encontró un bug en el propio servicio, y ésa es
la mejor noticia de la tanda.** `ReservaService.alta` insertaba la reserva y
**después** la marcaba apartada, así que el UPDATE entraba como *"volver a
preconfirmar"* y `V24` §5 lo rechazaba: nueve casos en rojo. La regla es que **tiene
que nacer apartada, no pasar a estarlo**, y el estado se escribe antes del `save`.
Vale anotarlo porque el trigger no se escribió para eso: se escribió contra un
esquive malicioso y atajó un error honesto el mismo día.

---

#### Decisiones de pantalla

- **Apartar es lo que se ofrece primero, y eso es la respuesta al problema.** Si
  cobrar fuera el default, el admin seguiría necesitando la plata en la mano para
  sacar el pedido de la bandeja — que es exactamente lo que se pidió cambiar.
  **Cobrar en el momento no se sacó**: quien ya transfirió antes de que le
  contesten no tiene por qué pasar por un plazo que no necesita.
- **Son dos opciones y no una casilla de "ya pagó"**, porque no son un campo del
  pago sino **dos actos distintos**: uno crea una reserva confirmada y el otro
  aparta un horario con un reloj corriendo. Una casilla entre los campos deja que
  alguien apriete confirmar creyendo que cobró.
- ⚠️ **Apartando no hay campo de comprobante, y no es que sea opcional: no
  existe.** Nadie pagó todavía, así que ofrecerlo invita a subir cualquier cosa
  contra una deuda — el defecto que el hallazgo #5 cerró del otro lado.
- **En el portal la prereserva va en rojo.** En el resto del sistema el acento es
  un bisturí, pero acá lo que se dice es *tenés algo que hacer y hay un reloj*: es
  el caso para el que ese color existe. Sin eso, una prereserva se lee igual que
  una confirmada y la persona se entera de que no lo estaba cuando el horario ya
  se liberó.
- **El plazo se dice con la hora**, no sólo con el día: es el menor entre 24hs y el
  inicio de la franja, así que puede vencer esta misma tarde.

---

#### Y una advertencia para cuando se toque

⚠️ **El aviso de la aprobación dice cosas distintas según el camino, y no es
cosmética.** Un *"está confirmado"* sobre un horario que se cae en 24hs deja
tranquila a la persona equivocada: el estudio pierde la venta y el horario. Como
no hay mail ni WhatsApp, **la notificación es el canal** y su texto tiene que
aguantar solo.

---

#### El planteo original y el detalle técnico

**El hallazgo más grande desde que cerró el MVP, y el único de esta tanda que
toca el esquema.** El planteo completo de Ignacio, la regla nueva y las cuatro
respuestas que lo destraban están en `docs/requirements/platform.md` §19
(P43–P46). Acá va sólo lo que hay que tener a mano para construirlo.

⚠️ **Lo primero: esto reabre, a propósito y con límites, el agujero que cerró
`V12`.** El 2026-08-17 se verificó contra el esquema corriendo que *"se conseguía
un horario anotando una deuda"* —un alquiler cuyo único `pago` estaba en `DEBE`
pasaba el chequeo— y se cerró. La prereserva **es** eso. Lo que la hace legítima
es que aquella deuda no vencía nunca y ésta vence en 24hs, con una fecha que la
base obliga a poner. **Quien retome esto tiene que poder defender esa
diferencia**, porque el próximo que lea `V12` va a preguntar.

#### `V24__la_prereserva.sql`

1. `reserva_estado_valido` acepta `PRECONFIRMADA`.
2. Columna `reserva.vence_preconfirmacion TIMESTAMPTZ NULL`.
3. CHECK **bidireccional** `reserva_preconfirmada_vence`: el estado es
   `PRECONFIRMADA` si y sólo si hay vencimiento. Las dos direcciones a propósito,
   como el CHECK de `V22`: que una preconfirmada no se quede sin vencimiento es la
   mitad obvia; la que importa es que un vencimiento no sobreviva en una reserva
   ya confirmada, donde leería como un plazo vivo que no lo es.
4. **`reserva_sin_plata_detras()` reescrita**: si el estado es `PRECONFIRMADA`,
   alcanza un `pago` apuntando a la reserva que no esté anulado; en cualquier otro
   estado, sigue exigiendo `EstadoPago.ENTRARON` como hasta hoy.
   ⚠️ **Sí, es una excepción por estado, y hay que argumentarla en la cabecera.**
   §13 de `platform.md` rechazó las excepciones *inventadas para una regla*
   (*"salvo que esté vacía"*, *"salvo que sea una clase"*). `PRECONFIRMADA` no es
   eso: es un estado del ciclo de vida de la propia reserva, **que se vence solo**
   y que la base obliga a fechar. **La excepción tiene plazo, no criterio.**
5. **Trigger de escalera**: a `PRECONFIRMADA` sólo se entra al nacer, y de ahí se
   sale sólo a `CONFIRMADA` o `CANCELADA`. Sin esto queda abierto el rodeo que
   `V18` §1b ya encontró en el sello: confirmar, volver a preconfirmada, anular el
   pago → sala tomada y cero plata. **Desde adentro de "no se puede deshacer" no
   se ve que la marca tampoco se puede deshacer.**

⚠️ **6. `PRECONFIRMADA` ocupa la franja, y del lado SQL no hay NADA que tocar.**
Vale anotar por qué, porque es un regalo de cómo `V1` escribió la definición
canónica: está por **lo que queda afuera** (una reserva ocupa salvo que esté
cancelada o reprogramada) y así la repiten el EXCLUDE de solapamiento, los dos
triggers de bloqueo y los dos usos de `V9`. **Un estado nuevo que ocupa entra solo
en los cinco.** Del lado de Java sí hay que tocarlo: `EstadoReserva.OCUPAN_LA_SALA`
está escrito por enumeración.

#### El vencimiento automático

`AvisosAutomaticos` ya existe, con `@EnableScheduling` y cron diario a las 08:00.
**Esto necesita otra cadencia** —cada 10 minutos, en un `@Scheduled` propio con su
propia propiedad—, porque un plazo de 24hs verificado una vez por día se vence
hasta 24hs tarde. Cancela la reserva, **no toca el pago** (P46) y escribe dos
avisos: al que pidió y a administración.

#### Lo que se toca

**Backend**: `EstadoReserva` · `ReservaService.alta` (`AltaReservaRequest` acepta
**o** seña **o** preconfirmación, excluyentes) y `cambiarEstado` ·
`SolicitudReservaService.aprobar` (gana modo: preconfirmar, el nuevo y primero, o
cobrar ahora, el de hoy, que se conserva para quien ya pagó) · `PagoService` (al
entrar un pago de una reserva preconfirmada, confirmarla — **es un acto y no dos**)
· `AvisosAutomaticos` · `TipoNotificacion` · **`ManejadorDeErrores`, sin el cual
los triggers nuevos salen 500 en vez de 409** · `ReservaResumen` y
`ReservaDelPortal`.

**Front**: rótulos y colores del estado nuevo · `SolicitudesPagina` ·
`ReservasPagina` (el calendario, por P45) · `MisReservasPagina` · el tipo
`EstadoReserva` de TypeScript.

**Y la definición nueva de "deuda cobrable"** (P46), escrita **una sola vez** y
usada en los tres lugares que hoy leen `EstadoPago.ADEUDADOS`: `/admin/deudores`,
la deuda viva del tablero y el aviso de los 7 días.

#### Las dos trampas de prueba que este punto reactiva

⚠️ **El trigger de `V10` es diferido, así que no se dispara en una transacción que
revierte.** `ReservaTest` es `@Transactional`: hay que forzarlo con
`SET CONSTRAINTS ... IMMEDIATE` **después de un `em.flush()`**, o la suite queda
verde sin haber verificado nada.

⚠️ **Las suites SQL tienen el problema espejo**: psql está en autocommit, así que
un rechazo diferido salta afuera del `EXCEPTION` de `probar()` y el caso **no
falla: desaparece del resumen**. Las reservas que sobreviven al COMMIT entran con
su pago en un CTE. Y todo caso de rechazo contra un trigger va con
`probar_mensaje`, que es lo que distingue una regla que anda de un trigger que
revienta antes de llegar a su propio mensaje.


---

## 14. La TERCERA barrida de correcciones — abierta el 2026-09-05

> Ignacio la trajo con la misma consigna de siempre: *"las ordenas segun te
> convenga, armamos plan de accion por fases y una por una las mitigamos, tmb como
> siempre, si hay alguna duda de negocio me consultas."*
>
> **Trece hallazgos.** Es la barrida más grande de las tres, y no porque el
> sistema haya empeorado: varios de los trece son cosas que **no estaban en
> ninguna capa** o que **una capa decía y otra desmentía**. Aparecen ahora porque
> Ignacio está usando el sistema de punta a punta, no porque se hayan roto.

### ⚠️ DÓNDE RETOMAR (sesión del 2026-09-06)

✅ **LA TERCERA BARRIDA ESTÁ CERRADA: trece de trece.** C2 —las canciones de un
EP/álbum— se cerró el 2026-09-06 con **`V26__las_canciones_de_un_ep.sql`**.

**Suites: 625 backend · 534 front · 253 + 66 SQL**, sobre **26 migraciones**.
`tsc -b`, el build y los dos linters limpios. Nada quedó a medias en el árbol.

**⚠️ NO QUEDA NADA DE PRODUCTO POR CONSTRUIR.** Lo que sigue no es una lista de
features:

1. **Desactivar el admin sembrado por `V3`** — ahora sería **`V27`**. Se corrió de
   número tres veces (`V24` la prereserva, `V25` el comprobante del egreso, `V26`
   C2), así que **no anotarla con número fijo en ningún lado**: lo que hay que
   recordar es que existe y va antes del deploy.
2. **El deploy de octubre** (`operacion.md` §3).
3. **La próxima barrida**, que va a existir — Ignacio dijo que iba a haber más y
   ya hubo tres.

⚠️ **Un pendiente de infraestructura que ESTA barrida creó.** `V25` guarda archivos
en una carpeta nueva (`comprobantes-egreso/`). `scripts/backup.sh` ya hace el tar
de `lajuanita.archivos.raiz` entera, así que **la copia funciona sin tocar nada** —
pero el ensayo de restore de `operacion.md` §2 verifica contratos y comprobantes de
pago, y ahora hay un tercer tipo de archivo que nadie probó recuperar. No es
urgente y no es gratis olvidarlo.

---

### Las advertencias de método de esta barrida

- ⚠️ **Un atajo que rellena un campo con un valor plausible no falla: miente.**
  `ReleaseResumen.de(r)` —el overload de un argumento— pasaba `contratos = 0`, y el
  listado lo alcanzaba con una referencia a método. Resultado: **todo el catálogo
  del sello decía "Sin contrato"**, incluidos los que sí lo tenían. El atajo se
  borró: hay una sola fábrica y toma el conteo.
- ⚠️ **Un comentario que justifica una decisión puede volverse falso sin que nada
  falle.** El de `ReleaseService.listar` decía que el conteo era *"un número que la
  fila del catálogo ni usa"*. Era cierto el día que se escribió; la fila empezó a
  usarlo después. **Es la tercera vez en este proyecto** (`V16`, la mitad de §8 del
  Módulo 5, y ahora esto).
- ⚠️ **Un caso nuevo se verifica poniendo el bug de vuelta.** Los cuatro casos del
  listado del sello se probaron revirtiendo el arreglo: tres se pusieron en rojo.
  Un caso verde no prueba nada si también sería verde con el bug puesto — es el
  primo del *"un 'ANDA' tiene que afectar filas"* de las suites SQL.
- ⚠️ **`findByLabelText` espera al `select`, NO a sus `option`.** Es la **tercera
  cara** del flake de §9.6. La primera fueron los dos techos de tiempo; la segunda,
  `userEvent.selectOptions` que no reintenta (cerrada con `pruebas/elegir.ts` en 58
  lugares); ésta es un caso que **afirma sobre `textContent`** y por eso quedó
  afuera de aquella barrida. No hay espera que agrandar: se espera la **opción**.
- ⚠️ **Un `perl -0pi` sobre seis archivos acertó en dos.** La expresión pedía una
  línea en blanco antes y cuatro archivos no la tenían. No corrompió nada —se
  verificó con `cat -A`— pero es exactamente el terreno donde §10 se quemó: **para
  editar archivos de este repo va la herramienta de edición, no un script.**

---

### El triage, con los grupos de §4

| Grupo | Qué significa | Cuántos | Estado |
|---|---|---|---|
| 🟢 **A** | Pantalla, texto y estilo | **6** | ✅ 6 de 6 |
| 🟡 **B** | Funcionalidad, sin tocar el schema | **5** | ✅ 5 de 5 |
| 🔴 **C** | Toca una regla del negocio o el schema | **2** | ✅ 2 de 2 |

**El orden fue A → B → C con una excepción deliberada**: B1 (el bug del sello) se
hizo **primero de los trece**, porque no era una mejora sino una pantalla que
mentía sobre todos los releases.

**Las decisiones de negocio se tomaron antes de codear**, como siempre, y están en
`requirements/platform.md` §20 (P48 a P53). Es la quinta vez que ese orden paga.

---

### 🟢 A1 — El login no dice "Sistema de gestión"

> ✅ **CERRADO.** Ignacio: *"en el login que no diga 'Sistema de gestión' que diga
> no se, otra cosa... y con otra letra"*.

Dice **"Ingresá"**, en la serif de la marca (`.t-serif`, Instrument Serif).

**Lo que hizo obvia la corrección fue mirar las otras dos puertas**: "Crear cuenta"
y "Elegí tu contraseña" dicen **qué hacés acá**. El login era el único que se
presentaba en vez de invitar — y encima nombraba a la marca en el único lugar del
sistema donde la marca ya ocupa media pantalla.

**La serif es del título de una puerta y no del resto del sistema.** Adentro,
`t-titulo` es lo correcto: son nombres largos que hay que barrer arriba de una
tabla. En una puerta no hay nada que barrer todavía. Es el criterio de cuentagotas
que `.t-serif` ya declaraba en su propio comentario.

⚠️ **Y por eso la bajada de abajo de `lg` dejó de ser serif**: apiladas eran dos
itálicas seguidas compitiendo. Arriba de `lg` no se cruzan nunca — la bajada vive
en la otra mitad.

---

### 🟢 A2 — Las frases del Inicio, todas firmadas

> ✅ **CERRADO.** Ignacio: *"te falto en las frases de dj diarias poner quien la
> dijo"*.

**Faltaba, y el que faltaba era La Juanita.** De las 31 frases, **13 son de tipo
`casa`** —voz propia del estudio— y por diseño no llevaban autor: casi la mitad de
los días salía una cita sin nadie abajo, que se lee como un olvido.

**Decisión de Ignacio (P48): firmarlas "La Juanita".** Ahora todas llevan pie.

⚠️ **La firma de las `casa` vive en el componente, no repetida en cada fila del
arreglo.** Es una propiedad del tipo y no de cada frase: trece copias del mismo
string son trece lugares donde puede quedar distinto. Va **sin link** a propósito —
no hay fuente que ir a verificar, que es justo lo que separa a los dos tipos.

---

### 🟢 A3 — Pagos deja de sumar plata

> ✅ **CERRADO.** Ignacio: *"en la parte de pagos, sacar eso de entraron:
> nosecuanta plata"*.

La barra de solapas cuenta pagos y ya no suma importes.

**El argumento, más allá del pedido: cuánto entró es la pregunta de
`/admin/caja`**, que es la pantalla hecha para contestarla. Dos lugares que suman
plata del mismo período son dos lugares que en algún momento no van a coincidir —
es el mismo motivo por el que el Tablero del Módulo 8 **no recalcula la caja sino
que se la pide** a Pagos.

⚠️ **El caso que lo probaba se dio vuelta en vez de borrarse**: ahora afirma la
**ausencia** del importe. `entraron` sigue viajando en la respuesta, así que volver
a dibujarlo es una línea — y sin ese caso nada recordaría por qué no está.

---

### 🟢 A4 — "Ver comprobante" en vez del nombre del archivo

> ✅ **CERRADO.** Ignacio: *"que no figure el nombre del pdf o del archivo ahí
> largo... que diga 'Ver comprobante' asi es mas corto"*.

Estos archivos llegan como los nombró el teléfono o el banco de quien pagó, así que
la celda mostraba nombres de ochenta caracteres y la fila se iba a tres renglones.
**El nombre no es el dato: el dato es que hay respaldo y se puede abrir.**

⚠️ **El nombre no se tiró: va en el `title`.** Con varios comprobantes en una misma
fila es la única forma de saber cuál es cuál sin abrirlos de a uno. El caso que
verificaba los dos comprobantes se reescribió para afirmar sobre el `title` y sobre
el texto de la invalidación, que es lo que de verdad prueba `V21` §3.

---

### 🟢 A5 — Todas las fechas en DD/MM/AAAA

> ✅ **CERRADO.** Ignacio: *"Fechas, todo lo que es fecha formato DD/MM/AAAA"*.

**No era "falta un helper": había seis dialectos** para la misma idea.

| Dialecto | Dónde |
|---|---|
| `fecha()` local | `AlumnoPerfilPagina`, `MisTrabajosPagina` |
| `fechaCorta()` local | `BloqueosPagina`, `DeudoresPagina`, `PagosPagina` |
| `.split('-').reverse().join('/')` a mano | `EgresosPagina`, `VentasPagina`, `DetalleDeCuenta` |
| **ISO crudo** (`2026-09-01`) | `SelloPagina` ×4, `ArtistasPagina` ×1 |
| `diaYMes()` (DD/MM) | 14 lugares |
| `cuando()` (DD/MM HH:MM) | notificaciones y notas |

Es exactamente la forma de §12 con el control de línea: una idea, seis dialectos.
Ahora hay **una definición**, `fecha()` en `componentes/semana.ts`.

⚠️ **Y había una trampa latente.** De los cinco helpers locales, **sólo el de
Bloqueos hacía `slice(0, 10)`** —era el único al que le llegaba un `TIMESTAMPTZ`—.
A cualquiera de los otros cuatro, pasarle un timestamp le devolvía
`19T14:33:12Z/08/2026` **sin fallar**. Con seis copias, la corrección de una no
llega a las otras cinco.

⚠️ **UN LUGAR QUEDÓ SIN AÑO A PROPÓSITO, Y ES REVISABLE.** La regla aplicada: **el
año va salvo donde la pantalla ya lo fijó arriba.** Las siete columnas del
calendario semanal y las cabeceras "Del X al Y" siguen en DD/MM, porque ahí el año
lo establece el contexto visible y repetirlo siete veces arriba de la grilla
ensancha las columnas sin agregar nada. **Todo lo demás lleva DD/MM/AAAA**,
incluidas las filas de tablas y el historial de clases, donde el año sí importa.
**Si Ignacio lo quiere literal en todo, es cambiar dos llamadas** — todo pasa por
`semana.ts`.

---

### 🟢 A6 — El horario tomado, dicho entero

> ✅ **CERRADO.** Ignacio: *"ya el sistema tiene eso porque dice 'ese dia 16-18'
> como que alguien ya la tiene, pero es un poco confuso"*.

Antes decía *"Ese día · 16:00–18:00"* y nada más: un dato sin la frase que lo
vuelve útil. Le faltaban **dos mitades**, y la segunda no estaba escrita en ninguna
pantalla del sistema:

1. **Ocupado no es para siempre**: si quien lo tiene cancela —o si es una
   prereserva de `V24` y se le vence el plazo— la franja se libera sola.
2. ⚠️ **Pero el pedido se aprueba TAL CUAL**, que es la regla de `V13`:
   administración no lo mueve a otro horario, aprueba lo que pediste o lo rechaza.
   Pedir un horario ocupado no es anotarse en una fila, es casi seguro un rechazo.

**Sin la segunda, la primera invita justo a lo que no funciona**, que es lo que
Ignacio pidió evitar.

⚠️ **El aviso se dibuja sólo si hay alguna franja `RESERVADA`.** Un bloqueo de sala
no se libera porque nadie lo cancele —es la sala que no se usa ese rato—, así que
con un día enteramente bloqueado la frase sería falsa.

---

### 🟡 B1 — El catálogo del sello decía "Sin contrato" para todos

> ✅ **CERRADO, y se hizo PRIMERO de los trece.** Ignacio: *"en los releases, todos
> figuran 'Sin contrato' aunque tenga contrato como nacho scoppa"*.

**No era un problema de datos: el listado mandaba cero siempre.**
`ReleaseService.listar` mapeaba con `ReleaseResumen::de`, el overload de un
argumento, que hace `de(r, 0)`. Y la fila dibuja "Sin contrato" cuando ese número
es cero.

**El agujero nunca estuvo abierto** — el trigger de `V18` siguió rechazando igual.
Lo que se rompió fue **el aviso**: existe para que nadie se sorprenda al apretar
publicar, y saltaba para todo el catálogo, o sea que no avisaba de nada. **Es el
ámbar del §11 otra vez**: un aviso que no distingue deja de ser un aviso.

**Tres cosas que no estaban en el punto de Ignacio:**

- ⚠️ **El alta tenía el mismo error**: pasaba `0` fijo, y un release de un artista
  que ya tiene contrato general **nace respaldado**.
- ⚠️ **Se borró el atajo de un argumento**, que quedó sin usuarios. Era la trampa
  misma: se alcanzaba con una referencia a método.
- ⚠️ **Ninguno de los 24 casos de `SelloTest` miraba el listado.** Todos entran por
  el trigger. Por eso sobrevivió: **la regla estaba probada, el aviso no.**

**Se agregaron 4 casos y se verificaron poniendo el bug de vuelta: 3 en rojo.** El
segundo es el que importa — dos releases del mismo artista y uno solo con contrato:
contar mal parejo (cero para todos, o uno para todos) pasa el primero y muere ahí.

**Una consulta por página, no una por fila** (`ReleaseRepository.contarContratosDe`).
El camino corto era llamar a `cuantosContratos` adentro del `map`, que son veinte
consultas más por página — justo lo que el `JOIN FETCH` del artista evita tres
métodos más arriba.

---

### 🟡 B2 — Cómo se hace alumno o profesor alguien que ya tiene cuenta

> ✅ **CERRADO.** Ignacio: *"pepe no es alumno ni profe pero tiene cuenta por
> reserva de cabina, quiere hacer un curso, ¿cómo se lo inscribe como alumno? lo
> mismo con profe"*.

**Son dos huecos muy distintos, y el segundo es el hallazgo de la barrida.**

**Del lado del alumno faltaba media pantalla.** `AltaAlumnoRequest` tiene los dos
caminos **desde el primer día**, y su javadoc describe el caso con las palabras
casi exactas de Ignacio: *"se registró sola, quizá para alquilar una cabina, y
ahora se inscribe"*. El formulario decía en su propio comentario *"se agrega cuando
exista el buscador de personas. El backend ya lo soporta"*. Era medio circuito
escrito esperando la otra mitad.

⚠️ **Del lado del profesor NO EXISTÍA EN NINGUNA CAPA.** `ProfesorController` tenía
**un solo `@GetMapping`**. Seis pantallas del Módulo 5, el selector de la
inscripción y la agenda del profesor leían una tabla que **ninguna capa del sistema
sabía poblar**: la única forma de que alguien fuera profesor era un INSERT a mano.

**Nada estaba fallando, porque una capacidad que no existe no tiene nada que
romper.** Es la **quinta vez** que este proyecto encuentra algo así (`V16`, la mitad
de §8 del Módulo 5, la regla dura del Módulo 7, `MaterialRepository` de §12·C2, y
esto). Y el comentario del controller decía *"el alta y la baja llegan con el
Módulo 2, junto con la agenda del profesor"* — **el Módulo 2 cerró el 2026-08-16,
el 5 construyó la agenda, y el alta nunca llegó.**

**Dónde vive el alta de profesor: en `/admin/usuarios`, no en una pantalla
propia.** No hizo falta preguntarlo — el modelo de este proyecto lo dice desde el
principio: *permisos y relaciones de negocio son dos ejes independientes*, y una
fila de `profesor` se crea **dándole la relación a un `usuario`**. Ésa es la
pantalla de las personas, la misma donde se otorga el rol. Por eso "Rol" y
"Profesor" son **dos columnas** y no una: juntas se leerían como valores de la
misma cosa, que es el modelo equivocado que este proyecto corrigió al empezar.

**Lo construido:**

- `POST /api/profesores` y `PUT /api/profesores/{id}`, más `ProfesorService`, que
  no existía. **No hay DELETE y no va a haberlo**: dar de baja es `activo = false`,
  porque `existsByUsuarioId` —la puerta del portal del profesor— pregunta por la
  existencia de la fila, para que quien dejó de dar clases siga viendo el historial
  de lo que dictó.
- `componentes/BuscadorDePersonas.tsx`, que **es la pieza que el comentario de
  `AlumnosPagina` estaba esperando por escrito**. Es un componente y no código
  adentro de una pantalla porque lo necesitan dos: hacerse alumno y hacerse
  profesor son la misma pregunta —*¿quién de los que ya están?*—.
- El alta de alumno ahora pregunta **primero** si ya tiene cuenta, y esa pregunta
  va arriba a propósito: puesta al final, alguien completa cinco campos y recién
  ahí se entera de que había otro camino.

⚠️ **El caso que dice para qué sirve todo esto** es
`darle_la_relacion_le_abre_el_portal_del_profesor`: `/api/me` contesta `esProfesor`
preguntando por la existencia de la fila, así que el menú del portal —Mi agenda,
Mis alumnos, Subir material— **le aparece a esa persona en su pedido siguiente**.
No hay un segundo lugar donde "habilitarlo", y si algún día lo hubiera, ese caso
avisa que se rompió el circuito.

⚠️ **Queda una asimetría conocida**: no hay pantalla de profesores como la hay de
alumnos. Es deliberado —`GET /api/profesores` no pagina justamente porque lo acota
la nómina— pero si alguna vez se quiere "quién enseña qué" en una sola vista, eso
es una pantalla nueva y no un endpoint que falte.

---

### 🟡 B3 — Los errores en rojo se van solos

> ✅ **CERRADO.** Ignacio: *"los msj de error en rojo que desaparzecan nose, a los
> 20seg"*. Alcance decidido (P50): **los de acción sí, los de campo no.**

La pieza es `componentes/aviso.ts` → `useErrorPasajero()`, que reemplaza a
`useState<string | null>(null)`. **Una línea por pantalla, 61 declaraciones, sin
tocar una sola línea de JSX.**

⚠️ **EL RELOJ VIVE EN EL ESTADO, NO EN EL COMPONENTE `Aviso`, y ésa es la decisión
que hay que entender antes de tocar esto.** Adentro de `Aviso`, el componente se
escondería a sí mismo mientras el estado del dueño sigue en el mensaje viejo — y
entonces **el mismo error dos veces seguidas no se vuelve a mostrar**: la segunda
vez el padre escribe el mismo string, React no re-renderiza porque el valor no
cambió, y el aviso queda escondido. **Es la forma exacta de §8.1** (el `enviando`
que sobrevivía porque el componente no se desmontaba), y se ve recién al segundo
intento, que es justo cuando alguien está peleando con un error de verdad. Hay un
caso que lo fija (`aviso.test.ts`), y es el único archivo de la suite que usa
relojes falsos — porque no hay `userEvent` de por medio.

⚠️ **DIEZ ESTADOS QUEDARON AFUERA, Y DOS SON UN HALLAZGO.** La regla, en una línea:
**un aviso se va solo cuando la pantalla tiene otra cosa para mostrar.**

| Cuántos | Cuáles | Por qué |
|---|---|---|
| 7 | Los que se dibujan como `if (error) return <Aviso>` | El mensaje **no acompaña** al contenido, lo **reemplaza**. Limpiarlo deja una página en blanco |
| 1 | `CalendarioPagina.errorDeCarga` | Si el catálogo no cargó, el `select` queda vacío y esto es la única explicación |
| **2** | **`SelloPagina.rechazo` y `MixMasteringPagina.rechazoDeLiberacion`** | **No son avisos: son estados del flujo** |

**Los dos últimos son el hallazgo.** El estado del rechazo **habilita el botón de la
salida con motivo**: mientras vale, y sólo mientras vale, aparece *"Publicarlo
igual, con motivo"* / *"Liberarlo igual, con motivo"*. Con reloj, **la salida
desaparecería sola mientras alguien está leyendo la regla y decidiendo** — y la
forma entera de esas dos pantallas es *"el backend rechaza → se muestran sus
palabras → recién ahí la salida"*. Son las dos reglas duras del sistema con esa
forma y las dos quedan afuera, con el motivo escrito en el código.

---

### 🟡 B4 — El código del release lo pone siempre el sistema

> ✅ **CERRADO.** Ignacio: *"el slot de 'código' de releases saquémoslo, que lo
> ponga el sistema solo siempre"*.

⚠️ **Esto REVIERTE la ratificación 5 de `platform.md` §15**, que dejó el campo a
propósito para cargar lanzamientos viejos con el número que tuvieron. Se le presentó
el costo —*"si alguien busca LJ007 en Spotify y en el sistema es otro número, no
cierran"*— y eligió igual. **La decisión posterior gana**: está registrada como P49
en §20.

**El pedido HTTP sigue aceptando `codigoRelease`, y no es un resto olvidado**: es
por dónde entraría una carga histórica si alguna vez hace falta, y es lo que
ejercitan tres casos de `SelloTest` —incluido el del correlativo, que necesita
sembrar un código alto para significar algo—. **Se sacó el camino de pantalla, no la
capacidad**, y está dicho así en el javadoc de `AltaReleaseRequest`.

---

### 🟡 B5 — El slot de comprobante en ventas

> ✅ **CERRADO.** Es la mitad de *"todo lo que sea pagos o cobros con slot de
> comprobante"* que **no necesitaba migración**.

**La aclaración de Ignacio convirtió dos features en una regla:** *"que haya un slot
de comprobante en pago (la juanita le pago a alguien y se adjunta el comprobante de
esa transferencia) o cobro (la juanita cobro y se adjunta el comprobante de pago de
la persona que compro/contrato algo)"*.

Dicho así: **toda plata que se mueve tiene dónde adjuntar su papel.**

| | Dónde vive | Estado |
|---|---|---|
| Plata que **entra** | `pago` → `comprobante_pago` | Existía desde `V21`. **Faltaba la pantalla de ventas** |
| Plata que **sale** | `egreso` | No existía → **C1, `V25`** |

**La venta no mueve plata: la mueve su pago**, así que no necesitó ni una línea de
SQL. `VentaResumen` ganó `idPago` y `comprobantes`, y la consulta que los trae
reemplazó a `ventasConPago` en vez de sumarse a ella.

⚠️ **`idPago` puede venir con `cobrada` en falso y no es una contradicción**: son
las dos lecturas que `V12` enseñó a no confundir.

- **Si la venta está cobrada** lo decide `EstadoPago.ENTRARON` — plata que entró de
  verdad. Una deuda anotada no es una venta cobrada.
- **A qué pago se le adjunta el comprobante** lo decide *no anulado*, porque a una
  deuda anotada **sí** se le adjunta el respaldo de la transferencia: es justo el
  papel con el que después se la cobra.

Teniéndolas juntas en la misma fila es especialmente fácil mezclarlas, así que está
escrito en el javadoc de la consulta.

**Invalidar no se ofrece desde ventas**: pide un motivo que queda firmado (`V7`), y
ese flujo vive en Pagos. Dos lugares para firmar el mismo acto son dos formas de
firmarlo.

---

### 🔴 C1 — Los comprobantes de un egreso (`V25`)

> ✅ **CERRADO.** Ignacio: *"en los egresos, slot para adjuntar comprobante de pago
> hacia esa persona"*.

**No hizo falta ninguna pregunta de negocio: es `V21` aplicada a la otra tabla**, y
esa simetría es el punto — si las dos se separan, "adjuntar un comprobante"
significa una cosa en Pagos y otra en Egresos.

⚠️ **Lo que había era peor que no tener nada.** `egreso.comprobante_path` existe
desde `V1` y es **exactamente la columna que `V21` le sacó a `pago`**: texto que
alguien tipeaba. El formulario tenía un campo con placeholder `/comprobantes/…`, o
sea que la pantalla le pedía a alguien que **escribiera una ruta** y después la
mostraba como si hubiera un archivo detrás.

⚠️ **Y del lado del egreso pesa más que del lado del pago**, que es el argumento que
conviene no perder: un cobro sin comprobante **lo reclama el que pagó**; una salida
de plata sin comprobante **no la reclama nadie** — el que la cobró está contento y
el que la firmó es el mismo que la cargó. Ese archivo es la única prueba de que ese
sueldo se pagó.

**El mapa, para no releer `V21`:**

| `V21` | `V25` |
|---|---|
| §1 la tabla, con la firma de la invalidación | §1 |
| §2 `prohibir_borrado_historico` | §2 |
| §3 inmutable, y la marca tampoco se deshace | §3 |
| §4 la columna vieja se va, sin migrar valores | §4 |

⚠️ **§3 es la mitad que es fácil no escribir**, y `V21` la aprendió de `V18` §1b:
desde adentro de *"no se borra, se marca"* **no se ve que la marca tampoco se
borra**. Sin ese trigger la tabla no compra nada — pisar `archivo_path` es la
columna de siempre con más pasos, y poner `invalido = FALSE` deshace un acto
firmado sin dejar rastro.

**Los valores viejos NO se migran** y la migración imprime un NOTICE con los ids
afectados: eran texto tipeado, así que copiarlos fabricaría respaldo inexistente —
el modo de falla que el ensayo de restore del 2026-08-20 probó desde el otro lado.

**Un extra que salió de acá:** el saneo del nombre del archivo era un método privado
de `ComprobanteService`, y el egreso necesitaba lo mismo. Se extrajo a
`archivo/NombreDeArchivo`, **en vez de copiarlo**: dos copias de un saneo se
despegan sin que nada falle — un lado empieza a aceptar un carácter que el otro
rechaza y nadie se entera hasta que una descarga sale rota.

⚠️ **No hay `/api/me/...` para bajarlo, al revés que del lado del pago**, y es una
decisión y no un olvido: un egreso **no tiene dueño del lado del portal** — el
destinatario de un sueldo no entra al sistema a descargar su recibo. Si algún día lo
hiciera, es una decisión de negocio nueva.

**Cobertura:** 14 casos en `ComprobanteEgresoTest` (tres atacan la base por SQL,
salteando el servicio), 7 casos en la suite de reglas (211–217) y 5 ataques
adversariales (sección I).

---

### ✅ C2 — Las canciones de un EP o un álbum (`V26`) — **HECHO el 2026-09-06**

> Ignacio: *"en los releases vi que hay opción de EP o Album y esta bueno, pero
> podríamos hacer que si selecciona esa opción que puedas cargar las canciones de
> ese álbum o ep según que tipo sea, ep entre 3 y 6 temas, álbum de 8 a 15"*.

**Las tres decisiones de negocio se tomaron ANTES de escribir una línea** (§20 ·
P51, P52, P53). Es la sexta vez que ese orden evita que algo se trabe a la mitad, y
esta vez se notó de entrada: la primera pregunta que había que contestar —*¿el rango
se exige al cargar o al publicar?*— es la que le da forma a todo lo demás, y
contestarla mal habría hecho **imposible cargar el primer tema**.

| | Decisión | Palabras de Ignacio |
|---|---|---|
| **Cuándo se exige el rango** | **Al PUBLICAR, no al cargar**, guardando el progreso | *"si la opcion 1... y se guarda el progreso, esa"* |
| **Qué tipos llevan temas** | **Sólo EP y ÁLBUM** | *"Sólo EP y álbum"* |
| **Qué lleva cada tema** | Orden y título, **más duración, artista invitado (feat.) e ISRC** | *"todo"* |

**Lo que se construyó:**

- **`V26__las_canciones_de_un_ep.sql`** — la tabla `cancion_release` y **cuatro
  triggers**, que son tres reglas y una contracara (ver abajo).
- `CancionRelease`, `CancionRepository`, `CancionResumen`, `AltaCancionRequest`, y
  cinco endpoints anidados bajo el release.
- La sección **Temas** en `SelloPagina`, visible sólo con EP o álbum elegido, con el
  selector de formato adentro.
- **16 casos nuevos en `SelloTest`** (44 en total), **20 en la suite de reglas**
  (218–237), **5 ataques adversariales** (sección J) y **14 casos de front**.

---

#### Las cuatro puertas, que son tres reglas y la mitad que no se ve

**Ésta es la parte que vale más que el módulo**, y es la lección que este proyecto
ya aprendió tres veces —`V6` §6 con el premaster, `V18` §3 con el contrato, `V23`
con el material—: **una regla que se verifica en UN ACTO se esquiva deshaciendo la
condición después.** Acá el acto es publicar, y las puertas son cuatro:

| § | Qué cierra | Cómo se esquivaba sin ella |
|---|---|---|
| §2 | Un tema no cuelga de algo que no sea EP ni álbum | — |
| §2 | Un release **con temas** no cambia de formato | cargarlos como EP y pasarlo a single |
| §3 | El rango se verifica al publicar **y si cambia el tipo** | publicar un EP de 3 y convertirlo en álbum |
| §4 | No se saca un tema que sostiene un release publicado | publicar con 3 y borrar 2 |

⚠️ **§4 es la que hace que la regla dure más que un DELETE**, y §2-desde-el-release
es la que no se ve desde adentro de la primera: las dos filas quedan válidas por
separado y la situación miente igual.

---

#### ⚠️ La trampa central: el trigger mira la TRANSICIÓN, no el estado

Estaba anotada antes de escribir la migración y **se verificó poniéndola de
vuelta**. El trigger de `V18` §2 dispara en cualquier UPDATE de un release
publicado, y ahí funciona porque un publicado sí tiene contrato. **Todos los
releases publicados que existían antes de `V26` tienen cero temas**, así que un
trigger con esa forma haría que corregirle una nota a un lanzamiento de 2023 lo
rechace **para siempre**.

La condición correcta es:

```sql
IF NOT (TG_OP = 'INSERT'
        OR OLD.estado IS DISTINCT FROM NEW.estado
        OR OLD.tipo_release IS DISTINCT FROM NEW.tipo_release) THEN
    RETURN NEW;
END IF;
```

**El caso 225 de la suite de reglas fabrica esa fila desactivando el trigger un
momento** — es la única forma de tener un release publicado que no cumple la regla
nueva, o sea exactamente lo que hay en la base el día que la migración se aplique.
Con la condición escrita a la manera de `V18`, ese caso se pone en rojo con el
mensaje entero. **Se comprobó.**

Y se comprobó también la segunda trampa, la de `V18` §3: **en un BEFORE DELETE la
fila todavía está en la tabla**, así que contar sin excluirla contesta de más y la
regla no se dispara nunca. Sin el `AND c.id_cancion <> OLD.id_cancion` caen cinco
casos, dos de ellos con *"EL AGUJERO VOLVIO"*.

---

#### Tres decisiones que no estaban en la pregunta

- **El `UNIQUE (id_release, orden)` es `DEFERRABLE INITIALLY DEFERRED`, y eso es lo
  que hace posible reordenar.** Intercambiar dos posiciones pasa por un estado
  intermedio con dos temas en el mismo lugar: con un unique inmediato el primer
  UPDATE choca antes de que exista el estado final. Sale gratis porque **el orden lo
  asigna siempre el servidor** (`max + 1` al agregar, intercambio al mover) — un
  duplicado sólo puede venir de un bug nuestro, nunca de algo que alguien tipeó, así
  que que el rechazo llegue al COMMIT no le cuesta nada a nadie. Es el reparto
  contrario al de `V18` §2, que es inmediato justamente porque lo que rechaza lo
  escribió una persona y tiene que leer por qué.
  ⚠️ **Consecuencia para las suites SQL**: un caso que ataque ese unique tiene que
  hacer `SET CONSTRAINTS cancion_orden_unico IMMEDIATE` adentro de la sentencia, o
  el rechazo llega **después** de que `probar` inserte su fila y el caso no falla:
  **desaparece del resumen**. Es la trampa de `V10`, con otra ropa.
- **`max + 1`, nunca `count + 1`.** Es la misma distinción que `maximoNumeroDeCodigo`
  y por el mismo motivo: borrar el tema 2 de tres deja las posiciones 1 y 3, y
  contar daría 3, que está tomado.
- **El ISRC lleva CHECK de forma y NO es único.** Lo primero porque es el código que
  leen las distribuidoras y uno que no es un ISRC se publica como si lo fuera —con
  la salida de dejarlo en blanco, que P53 permite expresamente, así que la regla no
  encierra a nadie. Lo segundo porque **la misma grabación sale como single y como
  tema de un álbum con el mismo código**, que es justamente para lo que sirve: un
  índice único ahí rechazaría el caso normal.

---

#### Lo que la pantalla decidió

- **El selector de formato vive DENTRO del bloque de temas.** Es el campo que decide
  si el bloque existe, y sin él quien creó el release como "Sin definir" no tendría
  dónde arreglarlo: la base le pediría elegir el tipo y la pantalla no ofrecería
  dónde. Es el hueco que este proyecto encuentra una y otra vez —una capa pide algo
  que otra no ofrece— cerrado antes de que apareciera.
- **El rango NO está escrito en el front.** Viaja en `minimoDeTemas` /
  `maximoDeTemas` de cada `ReleaseResumen`, calculados por el servidor desde
  `TipoRelease`. Escribirlo en TypeScript sería la **tercera** copia de una
  definición que ya vive en `V26` §3 (que decide) y en Java (que muestra) — y la más
  fácil de que quede vieja, porque nada la ata a las otras dos. **Un caso lo protege
  mandando 2 y 4, que no son los de ningún formato real**: si alguien copiara la
  tabla acá, ese caso se pondría en rojo.
- **El aviso rojo de la fila sigue siendo el del contrato.** El del tracklist va en
  tenue: el rojo es un bisturí, y el contrato es lo que hay que ir a buscar afuera
  mientras que los temas se cargan ahí mismo. El aviso que pesa —*"faltan 2 para
  poder publicarlo"*— está en el detalle, que es donde está la acción.
- ⚠️ **Una duración mal escrita se rechaza, no se manda vacía.** Guardarla como
  `null` era lo cómodo y es lo peor: el tema entra sin duración y **nadie se entera
  de que se perdió lo que alguien había escrito**. `leerDuracion` devuelve el error
  como valor, justamente para que no se confunda con "no cargó ninguna".
- **La duración de cada fila la escribe el servidor** (`CancionResumen.duracion`),
  no la pantalla: `mm:ss` escrito en dos lados termina con uno mostrando `3:04` y el
  otro `3:4`.

---

#### Dos cosas que se dejaron afuera a propósito

- ⚠️ **NO hay salida firmada tipo `publicado_sin_contrato`.** Se le ofreció a Ignacio
  la alternativa —el aviso que no frena— y eligió la regla dura sabiendo el costo.
  La tensión es real: **un EP de 2 temas existe en el mundo**. Si aparece un caso
  legítimo, **se revisa deliberadamente en otra migración** —como `V22` dejó anotado
  para la clase que no descuenta— y no se inventa la excepción sobre la marcha, que
  es lo que `V15` tuvo que venir a corregir del lado de las revisiones de M&M.
- **La duración total del EP/álbum no se muestra**, aunque P53 la nombra como uno de
  los usos del campo. Las dos formas de hacerlo hoy son malas: sumar y formatear en
  el front es una **segunda** manera de escribir `mm:ss`, y mandarla desde el
  servidor obliga a ensanchar la consulta por página para un dato que la fila no
  muestra. Y hay una decisión de negocio adentro que nadie tomó: **si un tema no
  tiene duración cargada, el total es parcial y se lee como si fuera el entero.**
  Cuando haga falta, se hace bien y con esa pregunta contestada.

---

#### La lección de método, y es nueva

⚠️ **En un test `@Transactional`, un caso puede provocar UN SOLO rechazo de la
base.** Un trigger o una constraint que rechaza aborta la transacción de Postgres, y
todo lo que venga después contesta *"current transaction is aborted"* — incluso un
INSERT que no tiene nada que ver. El caso que probaba los dos formatos prohibidos
(`SINGLE` y "sin tipo") en una sola prueba **falló en el segundo con un error que no
hablaba de la regla sino de un usuario que no se pudo crear**. Va partido en dos.

Y una que ya estaba escrita y volvió a cobrar: **el `*` de un campo requerido se
concatena al nombre accesible sin espacio.** `getByLabelText('Título')` no encuentra
nada porque el campo se llama `Título*`. Tres casos cayeron por eso, con un error
que no lo insinúa. Es §14 · B1 otra vez, del lado del formulario en vez del de las
solapas.

---

## 15. La mejora del circuito del buzón — abierta el 2026-09-06

> **NO es una barrida.** Las barridas (§12, §13, §14) son listas de hallazgos
> sueltos que Ignacio trae de usar el sistema. Esto es **un solo circuito
> repensado de punta a punta**: *formulario de la web → ficha → cuenta → reserva*.
>
> **El disparador fue una sensación, no un bug**, y resultó exacta. Ignacio,
> usando el sistema: *"siento que en este proceso se pierde mucho… una vez que
> ponés dar cuenta desaparece el coso, entonces quizás ya te olvidaste qué
> quería"*.
>
> ⚠️ **El código ya lo sabía.** El comentario del estado `recienConvertida` en
> `SolicitantesPagina` decía textual que al convertir *"la ficha desaparece del
> filtro por defecto"*, y por eso rescataba **la contraseña** mostrándola aparte.
> Alguien vio el problema, salvó lo único que no se puede volver a ver, y dejó
> hundirse el resto. **El parche era la evidencia del bug.**
>
> **La causa de fondo:** `CONVERTIDO` se usaba como estado terminal y no lo es.
> Crear la cuenta no es atender la ficha — la persona sigue sin su reserva, y la
> ficha ya se fue de la lista **y del contador del sidebar** (`Pendientes.buzon`
> también contaba sólo `PENDIENTE`). Las dos cosas que existen para que no se
> pierda nadie dejaban de mirar justo antes de lo principal.

### Las decisiones, cerradas antes de codear

Están en **`docs/requirements/platform.md` §21 · P54–P58**. En una frase cada una:

- **P54** — La cuenta es una **comodidad del cliente, no un requisito del
  servicio**. Se sigue creando siempre, pero deja de ser un trámite que va
  primero. El botón deja de llamarse *"Darle cuenta"* y pasa a nombrarse por el
  trabajo.
- **P55** — Una ficha está **atendida cuando produjo lo que pedían** (una reserva,
  una inscripción, una venta). "Se le escribió por WhatsApp" **no es observable** —
  `wa.me` abre otra app y ahí termina — así que no puede ser el criterio.
  `CONVERTIDO` desaparece; entra `ATENDIDO`.
- **P56** — La ficha **guarda una FK a lo que produjo**, escrita en el mismo
  movimiento. Es el patrón de `pago` desde `V1`. Da las dos cosas de una: se
  cierra sola (no hay botón que olvidar) y trazabilidad real.
- **P57** — El plazo de la prereserva **no cambia** (24hs, `V24`/P44 intactos).
  Cuatro motivos en §21; el principal: soltar un horario lejano casi no cuesta
  nada.
- **P58** — El formulario de la web pide **día, horario y duración**, y los tres
  **opcionales**. Reabre a propósito una decisión de `V20` (la premisa cambió:
  ahora esos datos SÍ se usan para crear algo). Duración y no hora de fin.

### El plan por fases

| Fase | Qué | Estado |
|---|---|---|
| **1** | Contacto en un clic: teléfono grande y copiable, botón de WhatsApp con el mensaje armado (saludo que nombra lo pedido; y el que lleva la clave temporal escrita) | ✅ **CERRADA (commit `29faa4b`, "Fase 1 rediseño" — mal etiquetado)** |
| **2** | La ficha guarda qué produjo · `CONVERTIDO`→`ATENDIDO` · `FichaAbierta` (contador y lista dejan de definir "lo que falta" por separado) · el formulario con los 3 campos de preferencia (`V27`) · **la UI de atender** | ✅ **CERRADA (2026-09-06)** |
| **3** | Apartar la cabina desde la ficha: cuenta + prereserva + deuda en una transacción, sin salir del buzón | ✅ **CERRADA (2026-09-06)** |
| **4** | El formulario de la landing con los 3 campos + el alta precargada con ellos | ✅ **CERRADA (2026-09-06)** |
| **5** | Aviso del scheduler: *"N fichas sin atender hace +48hs"*, sobre `V17` | ✅ **CERRADA (2026-09-06)** |

⚠️ **Fases 2 y 4 comparten la migración `V27`** — mismo argumento que `V19`: una
revisión de las reglas de `solicitante`, no dos.

### La Fase 2, cerrada (2026-09-06)

Suites: **635 backend · 557 front · 256 + 66 SQL**, sobre **27 migraciones**.
`tsc -b`, los dos linters y los dos builds limpios.

**Lo que ya estaba** (commit `29ba09d`): `V27` con las 3 FK, el CHECK de doble
sentido `solicitante_atendido_produjo_algo`, `CONVERTIDO`→`ATENDIDO`, la
migración de datos y los 3 campos de preferencia; `DestinoDeLaFicha` (sealed),
`FichaAbierta` (el JPQL compartido entre lista y contador), `DestinoRequest`;
`POST /{id}/cuenta` + `PATCH /{id}/atencion`; y del lado del front
`etapaDeLaFicha()`, el filtro `ABIERTAS` y el botón *"Crearle la cuenta"*.

**Lo que cerró la fase: elegir en vez de tipear un id.**

`atenderSolicitante` existía y ninguna pantalla podía llamarla. Lo mínimo que
esta sección tenía anotado era *un `<select>` de tipo + un campo de id*, y **eso
es lo que no se hizo**, por una razón que el sistema ya sostiene en todas las
demás pantallas: **acá no se muestran ids**. El profesor elige *"12/08 10:00 ·
Clase de DJ"*; el pago elige la inscripción por `queSalda`. Un campo numérico
sería el único lugar donde alguien tiene que copiar un id de otra pantalla, o sea
el único donde se puede pegar el equivocado — y **una ficha mal cerrada es peor
que una abierta**: la abierta la vuelve a mirar alguien, la cerrada contra la
reserva de otro se ve resuelta.

- **`GET /api/solicitantes/{id}/candidatos`** devuelve lo que esa persona tiene,
  ya legible. **No inventa consultas**: entra por `ReservaRepository.deLaPersona`
  e `InscripcionRepository.deLaPersona` —las que ya definen "lo suyo"— más un
  `VentaEquipoRepository.deLaPersona` nuevo, que es la única que faltaba.
- **El texto lo arma el servidor y la fecha no.** Lo primero es lo que hace
  `PagoResumen.queSalda` desde el Módulo 3, y por lo mismo: son tres tablas y la
  pantalla tendría que saber describir cada una — una cuarta forma de escribir una
  reserva. Lo segundo es lo que **no** se copia de ahí: `cuando` viaja `LocalDate`
  para que lo escriba `fecha()`, que es la única forma en que este sistema escribe
  una fecha desde §14 · A5.
- **La llave de la opción lleva el tipo, no sólo el id** (`INSCRIPCION:77`). Los
  ids son de tres tablas: la reserva 7 y la venta 7 existen las dos, y el CHECK de
  `V27` no puede ver la diferencia porque **las dos filas son válidas**. Es el
  único lugar de este circuito donde equivocarse no produce ningún error.
- **Lo anulado y lo cancelado se ofrecen igual, con el reparo escrito.**
  Esconderlo deja a quien atiende buscando algo que está y no aparece, y el final
  de esa búsqueda es cerrar la ficha contra cualquier otra cosa.
- **El botón *"Ya se lo cargué"* aparece tenga cuenta o no.** Condicionarlo a la
  cuenta la volvería un requisito para cerrar la ficha, que es exactamente lo que
  P54 sacó del medio. Sin cuenta no hay candidatos, y el panel **dice por qué**
  con la salida al lado, en vez de mostrar una lista vacía — que se lee como *el
  sistema perdió los datos*.

⚠️ **La limitación que queda escrita y no escondida**: los candidatos salen de la
cuenta, así que una venta cargada a nombre escrito (sin cuenta) no aparece.
Cruzar por nombre sería la alternativa y es peor — **dos "Juan Pérez" son dos
personas**, y una ficha cerrada contra la compra del otro se ve resuelta. P54
sostiene que la cuenta se crea siempre, así que el caso es el de alguien que se
salteó ese paso: la salida es crearle la cuenta.

**Los textos que decían "convertir"** se corrigieron en las cinco partes que
quedaban (`SolicitanteService`, `SolicitanteController`, `DONDE_SIGUE`,
`ConversionRealizada` y el estado `recienConvertida` → `cuentaRecienCreada`), y
`CuentaLista` ahora **cierra la frase**: *"…y volvé al buzón a cerrar la ficha
con Ya se lo cargué"*. Antes el link era el final del trámite; desde `V27` hay un
paso más, y sin decirlo el link manda a alguien a otra pantalla y la ficha se
queda esperando. De paso salió el ternario de tres ramas que traducía ruta →
nombre, ahora `NOMBRE_DE_PANTALLA`.

**Casos nuevos: 4 de backend y 11 de front**, y **los cuatro que sostienen una
regla se verificaron poniendo el bug** —la regla de §14: un caso verde no prueba
nada si también estaría verde con el error presente. Con `deLaPersona` de ventas
sin su filtro, `no_se_ofrece_lo_de_otra_persona` va a rojo; con la llave sin el
tipo, va a rojo el que cierra la ficha; con el botón condicionado a la cuenta, va
a rojo el de la ficha sin cuenta.

⚠️ **Lo que NO entró en esta fase, a propósito**: `docs/db/la_juanita_schema.dbml.txt`
sigue atrasado. Estaba anotado en la lista de la Fase 2 y **no es de esta fase** —
es tarea propia, §3.5 de `pendientes.md`, y ya venía atrasado siete migraciones
antes de `V27`.

### La Fase 3, cerrada (2026-09-06)

`POST /api/solicitantes/{id}/reserva` hace **las tres cosas en una transacción**:
crea la cuenta si no la tenía, aparta el horario con la deuda anotada, y cierra
la ficha apuntando a esa reserva. Suites: **639 backend · 561 front**.

- **Es un endpoint y no tres llamadas de la pantalla**, y el argumento es el
  opuesto al de `atender`. Allá partirlo es barato: el segundo pedido que no sale
  deja la ficha abierta y alguien la vuelve a mirar. **Acá lo que puede fallar es
  la reserva** —la franja se ocupó mientras tanto— y lo que quedaría es una cuenta
  creada, con su contraseña temporal ya mostrada, para alguien que no tiene nada.
  Fallar entero deja el buzón como estaba.
- **Y la transacción es una por una razón de la base, no de prolijidad**: el
  `CONSTRAINT TRIGGER` de `V10` corre al COMMIT y busca el dinero detrás de la
  reserva. La deuda de la prereserva **es** ese dinero (`V24`).
- **El orden importa: la cuenta primero.** No por P54 —que dice justamente que la
  cuenta no es un peaje— sino porque la deuda necesita a quién anotársela: sin
  nombre no aparece en Deudores y no se le cobra a nadie. La cuenta es *comodidad
  del cliente y condición de la plata a la vez*, sin volver a ser un paso previo.
- ⚠️ **Los dos UPDATE sobre la ficha son legales en ese orden y no al revés.**
  `darleCuenta` escribe `id_usuario` con la ficha todavía `PENDIENTE`; `atender`
  la saca de `PENDIENTE`. El trigger `solicitante_resuelto_es_final` (`V13` §4)
  rechaza cualquier UPDATE sobre una ficha ya resuelta, así que cerrarla antes de
  vincular la cuenta haría fallar el segundo — es la congelación que P56 eligió a
  propósito.
- **El alta se DELEGA en `ReservaService.alta`**, igual que hace el pedido de
  sala: las reglas de una reserva son suyas, y una segunda copia es la que se
  olvida de una. Entre ellas la que `V24` enseñó a los golpes — **la reserva tiene
  que NACER apartada**, no pasar a estarlo.
- **Desde el buzón no se aparta una CLASE**, y la lista que lo decide no es nueva:
  es `tipo_uso.solicitable_por_usuario`, la misma que ya define qué se puede pedir
  desde el portal (P17). El agujero es concreto: una clase apartada acá nacería sin
  la inscripción que la descuenta —el participante va sin inscripción— y P39
  prohíbe exactamente eso. **La base no lo vería**, porque la deuda de la
  prereserva ya satisface a `V10`.
- **Siempre aparta, nunca cobra.** Quien ya transfirió se carga desde el
  calendario. Meter las dos con una bandera haría que la misma estructura
  signifique dos cosas según un campo — por lo mismo que `AltaSenaRequest` y
  `AltaPreconfirmacionRequest` son dos records.
- **La duración va en minutos y la hora de fin la calcula el servidor** (P58).
  Este pedido *transcribe lo que la persona pidió*, y su preferencia está guardada
  justamente así. Con hora de fin, la precarga tendría que hacer esa cuenta en la
  pantalla: un segundo lugar donde se decide qué significa "dos horas desde las
  18". Que la suma se pase de medianoche no necesita regla propia — lo rechaza el
  `@AssertTrue` de `AltaReservaRequest`, que ya dice esa frase (DB-11).

**Del lado de la pantalla**, tres decisiones:

- ⚠️ **El formulario precarga las tres preferencias y lo dice en voz alta**:
  *"Confirmalo contra la agenda antes de apartar: desde la web no se ve qué está
  ocupado"*. Sin esa línea una fecha ya escrita se lee como *el sistema decidió
  esto*, cuando es una preferencia sin confirmar — y la landing **no puede** ver
  disponibilidad, que es lo que se decidió al dar de baja el retoque §6f.5. La
  ficha las muestra con el mismo cuidado: *"Le vendría bien"*, nunca como reserva.
  **Estaban guardadas desde `V27` y ninguna pantalla las mostraba.**
- **El botón principal se llama por el trabajo** (P54) y sólo donde el trabajo
  existe: *"Apartarle la cabina"* / *"Apartarle la sala"*. Curso y equipos siguen
  con *"Crearle la cuenta"* + *"Ya se lo cargué"*, porque ponerles el nombre del
  trabajo sin hacer el trabajo sería un botón que miente.
- **El panel de resultado muestra el plazo sí o sí**, y arma **dos** mensajes de
  WhatsApp: el de la reserva habla de lo que hay que hacer ahora —abonar, antes de
  tal día— y el de la cuenta, de algo que se puede mirar cuando quiera. Juntos, el
  que importa se lee como un trámite más. `CabinaApartada` lleva el monto aunque la
  pantalla lo acabe de mandar: para armar ese mensaje su propio formulario ya se
  cerró, y **una reserva no tiene precio en este esquema** (P13).

**Casos: 4 de backend y 4 de front**, verificados poniendo el bug — sin la guarda
del uso solicitable va a rojo el de la clase; sin la precarga, el de las
preferencias.

### La Fase 4, cerrada (2026-09-06)

**Lo que había que descubrir primero: la landing YA pedía los tres datos.**
`BookingForm` preguntaba fecha, hora y duración desde que existe — y los metía
dentro de `detalle`, como texto, **exactamente como `V20` había decidido**
(*"ninguno de esos datos se usa para crear nada"*). Así que la fase no fue
agregar preguntas: fue **dejar de tirar la respuesta**.

- **Los tres viajan como campos y salieron de `detalle`.** Repetirlos en los dos
  lados sería guardar dos veces el mismo dato; `detalle` queda con lo que no tiene
  columna (el servicio y si van solos o en dupla). `AltaSolicitanteRequest` los
  acepta y `recibir` los escribe.
- ⚠️ **La mitad que faltaba de P58 y que tiene consecuencia comercial: dejaron de
  ser obligatorios.** Estaban `required` en el formulario. **Exigir día y hora
  pierde a quien sólo quería preguntar cuánto sale**, o sea justo a la gente que
  estos formularios existen para captar — publicar la landing sin ellos era perder
  clientes reales, que es lo que `V20` dice de sí misma. Tiene su propio caso,
  porque un `@NotNull` agregado sin pensar convierte un formulario que capta en uno
  que filtra **y no falla en ningún lado**.
- ⚠️ **Se preguntan como preferencia y no como reserva**, y eso cambió el texto:
  la leyenda es *"¿Qué día y horario te vendría bien?"* con *"Opcional. Lo
  confirmamos con vos por WhatsApp"*. Esta página **no ve disponibilidad** —quien
  pide no puede saber si la franja está ocupada, que es lo que se decidió al dar de
  baja el retoque §6f.5—, así que un formulario que se lea como una reserva hace
  creer a la persona que ya la tiene. **Esa mentira es peor que la de no
  preguntar.**
- **`fechaPreferida` no lleva `@Future`, a propósito.** Una fecha pasada acá es
  alguien que se equivocó de año en un selector, y contestarle 400 es perder ese
  cliente por un tipeo. No decide nada: quien atiende la ve y el buzón la precarga
  para que la corrija mirando la agenda.
- **Un `""` no es "no lo dijo".** Mandar la cadena vacía hace que Jackson intente
  leer un `DATE` de la nada y conteste 400 — un formulario que no responde, por el
  campo que justamente se decidió que se puede dejar en blanco. De ahí
  `textoOVacio`.

**Los otros dos formularios no cambian**, y no es un olvido: un aspirante a un
curso no tiene franja que preferir —su camino es la inscripción— y una consulta
por equipos tampoco. Preguntarles el horario sería pedir un dato que nadie va a
usar.

**Casos: 2 de backend.** La landing no tiene suite, así que la cobertura va donde
vive el contrato — que además es el lugar correcto: lo que hay que defender es que
el endpoint los acepte **y que los acepte ausentes**.

### La Fase 5, cerrada (2026-09-06) — y con ella la §15 entera

**No necesitó migración**: `notificacion.tipo` es `VARCHAR(50)` sin CHECK, así que
un tipo nuevo es Java más el tipo de TypeScript. La cuarta regla del disparador
automático, sobre la máquina que `V17` dejó armada.

**Es la respuesta a una pregunta que `V20` ya había contestado que no**, y las dos
se leen juntas: el buzón deliberadamente **no** escribe una notificación por cada
formulario que entra —es el único escritor público del sistema, así que sería un
aviso por cada bot × cada ADMIN y STAFF—. Lo que `SolicitanteService` dejó anotado
como la forma correcta es exactamente ésta, con estas palabras: *"un aviso por
hecho y no uno por formulario"*.

⚠️ **Es UNO agrupado y no uno por ficha**, que es la diferencia con las otras tres
reglas, y el motivo es de dónde vienen las filas: un deudor, una entrega y un
lanzamiento **los crea administración**, así que no puede haber cincuenta de
golpe. **Una ficha la crea cualquiera desde internet.** Uno por ficha sería la
misma inundación que `V20` evitó, corrida cuarenta y ocho horas.

⚠️ **Y la clave es la ficha MÁS VIEJA sin contestar, que es lo que lo hace
funcionar.** `V17` exige que la clave describa *el hecho y nunca la corrida*, y
las dos formas obvias fallan cada una para un lado:

| Clave | Qué pasa |
|---|---|
| `dia=2026-09-06` | Sale **todos los días**: el recordatorio diario que vuelve ruido la bandeja |
| `n=3` | Sale de nuevo **cada vez que entra un formulario más** — cuanto peor anda el buzón, más ruido hace |
| **`desde=<id de la más vieja>`** | Mientras nadie conteste no cambia, lleguen mil formularios; en cuanto se contesta esa, la siguiente hereda el problema y el aviso vuelve a salir |

**Y esa clave no puede repetirse nunca**, que es lo que hace que el índice parcial
de `V17` alcance: una ficha nace `PENDIENTE` y sólo sale de ahí —atender y
descartar son finales (`V13` §4)—, así que **el id más chico sin contestar sólo
puede crecer**.

⚠️ **Cuenta `PENDIENTE` y NO `FichaAbierta`, y es el único lugar del sistema donde
las dos difieren a propósito.** Una ficha con la sala apartada y la seña sin
cobrar **está abierta** —le debemos algo— pero **fue contestada**: alguien la
atendió, apartó el horario y le escribió. De lo que falta ahí avisa la deuda, con
su propio plazo. Contarla acá sería avisar dos veces del mismo hecho diciendo dos
cosas distintas, y la segunda —*"nadie contestó"*— sería falsa.

**El plazo se mide en horas y tiene su propia constante** (`HORAS_SIN_CONTESTAR`),
como `DIAS_ANTES_DEL_LANZAMIENTO`: los otros tres cuentan plazos de negocio —una
deuda, una entrega, un lanzamiento— y éste cuenta **tiempo de respuesta a una
persona que está esperando**. Dos días es mucho para contestar un formulario; dos
días de una deuda no es nada.

⚠️ **Lo que costó dos rondas, y es una lección de la suite: ésta es la primera
regla de aviso cuyo hecho es un CONJUNTO y no una fila.** Los otros 23 casos
ignoran los datos de la base de desarrollo sin pensarlo —un aviso de deuda se
identifica por su deudor, y que haya otras veinte deudas no lo toca—. Acá el aviso
es uno para todo el buzón y su clave sale de la ficha más vieja, así que **las seis
fichas que `V27` devolvió a PENDIENTE se llevaban la clave puesta** y los cinco
casos daban números que no eran los del fixture. De ahí `vaciarElBuzon()`, que las
resuelve dentro de la transacción del caso (no las borra: `V20` §3 no deja).

**Y de paso: el tipo `TipoNotificacion` del front estaba atrasado en cuatro
valores**, no en uno. Faltaban las dos de la prereserva (`V24`), la del sello y la
del buzón. **Esta lista se atrasa sola y nunca falla**, porque la pantalla no
decide nada por el tipo — muestra título y contenido.

**Casos: 5 de backend**, y los tres que sostienen la decisión de la clave se
verificaron poniendo la clave obvia (`n=<cantidad>`): los tres van a rojo.

---

## 16. La CUARTA barrida de correcciones — abierta el 2026-09-10

> Ignacio la trajo con una consigna **distinta a la de las tres anteriores**:
> *"Son cambios muy bruscos algunos y pueden que cambien mucho los planes, ni
> siquiera antes de armar las fases de implementación me gustaría conocer tu
> opinión y tus consultas."*
>
> **Doce hallazgos**, y el cambio de consigna no es un detalle de forma: en §12,
> §13 y §14 la lista llegaba y se triangulaba. Acá **dos de los puntos no son
> correcciones sino cambios de política del negocio** —programas con seña, y el
> alta completa desde el buzón—, y uno de ellos reabre una decisión que el
> cliente ya había tomado al revés. Pedir opinión antes de las fases es la
> lectura correcta: **un plan armado sobre una premisa equivocada cuesta más que
> no tenerlo.**

### ⚠️ DÓNDE RETOMAR (sesión del 2026-09-10)

🟢 **ESTADO: DESTRABADA. Nada ejecutado todavía; el plan está armado.**

**Las quince preguntas se contestaron el mismo día** y están cerradas en
`requirements/platform.md` §22 (P59–P71, y P13 con ellas). Cinco llevan una ⏳
con la lectura adoptada — ninguna traba. **El plan por fases está al final de esta
sección**: seis fases, A6 primero, después A → B → C, con tres migraciones
(`V28` catálogo · `V29` ficha · `V30` preinscripción).

~~**Lo próximo es ejecutar la Fase 0 (A6).**~~ **Las seis fases cerradas: 0 a 4 el 2026-09-11, 5 y 6 el 2026-09-12.** La barrida está cerrada. El estado vivo está en el bloque final de este documento.

⚠️ **B2 2.1 (grupos de a 3) quedó FUERA de esta barrida por decisión de Ignacio**:
*"todo esto dejando afuera B2 2.1 — grupos de a 3. Cuando terminamos esta barrida
nos enfocamos en esto."* Se documenta igual —abajo, con las cinco preguntas que va
a necesitar— porque lo que se aprendió analizándolo no conviene volver a aprenderlo.

---

### El triage

| Grupo | Qué significa | Cuántos | Estado |
|---|---|---|---|
| 🟢 **A** | Pantalla, texto y estilo | **5** | ✅ 5 de 5 · cerrado el 2026-09-11 (Fases 0 y 1) |
| 🟡 **B** | Funcionalidad, sin tocar el schema | **4** | 🟨 3 de 4 · A3 · A5 · A7 el 2026-09-11 (Fase 2); B2 1.1/1.2 es la Fase 6 |
| 🔴 **C** | Toca una regla del negocio o el schema | **2** | ✅ C1 (`V28`) y C2 (`V29`) el 2026-09-11; C3 (`V30`) y C4/C5 (sin migración) el 2026-09-12 |
| ⏸️ | Diferido a la barrida siguiente | **1** | B2 2.1 |

⚠️ **Tres de los puntos que Ignacio anotó como A no lo son**, y conviene saberlo
antes de estimar: **A5** no se arregla sumando en la pantalla (la consulta cuenta
`DISTINCT` dentro de cada nivel), **A6** es un `null` que viaja del backend, y
**A7** necesita contenido del cliente además de código.

---

### Punto por punto — lo que se verificó en el código

#### ✅ A1 · "Lo próximo" en la agenda del profesor — **cerrado el 2026-09-11**

**Verificado, y el caso común es peor que el reportado.** La agenda del profesor
pide **una semana** (`desde = lunesDe(hoy)`, `hasta = desde + 6`) y calcula
`proxima` sobre esa ventana — `MiAgendaPagina.tsx:83`. La del alumno pide
**cuatro** — `MisReservasPagina.tsx:60`.

⚠️ **Consecuencia concreta: un sábado, el profesor que da clase el lunes no ve "lo
próximo"**, porque el lunes cae en la ventana siguiente. No es el caso raro del que
se va de vacaciones: es todos los fines de semana.

**Igualar a cuatro semanas es una línea y tapa el 99%.** Lo que **no** da —ni en el
profesor ni en el alumno, que tiene el mismo techo— es el *"desde siempre"* literal:
si la próxima clase está a seis semanas, ninguna de las dos la ve. Eso sería una
consulta propia (*"mi próxima clase"*, sin ventana) y pasa a grupo B.

**Cerrado el 2026-09-11 (Fase 1).** `MiAgendaPagina` pide `desde + 27` como Mis
reservas, los botones saltan de a 28 y *"Esta semana"* pasó a *"Hoy"*; el vacío
dice *"en estas cuatro semanas"*. `misClasesDictadas` acompaña el rango (el techo
del backend, `DocenciaService.MAXIMO_DE_DIAS`, es 366). Un caso nuevo pinea que las
dos consultas van del mismo rango: `pide cuatro semanas, y el resumen del mismo
período`.

#### ✅ A2 · Sacar el enlace al artículo del nombre del DJ — **cerrado el 2026-09-11**

⚠️ **`fuente` NO se reemplaza por el link al perfil: se le agrega un campo al
lado.** Ese campo es lo que sostiene la regla del archivo, escrita en su propia
cabecera: *"una cita atribuida exige `fuente`, así que agregar una sin link no
compila. Es deliberado: un comentario que pide fuentes se ignora, un tipo no."* Es
lo único que impide firmar con el nombre de una persona real algo que no dijo — el
problema que este proyecto **ya tiene abierto** con las seis notas del blog.

La forma: `perfil` opcional, el nombre linkea ahí, y `fuente` sigue existiendo.
**Queda por decidir si `fuente` se sigue viendo** (pregunta 18).

**Resident Advisor (`ra.co/dj/…`) antes que Wikipedia**: tiene a los diez autores,
con fechas y discografía. ⚠️ **Cada slug hay que abrirlo**: un RA mal escrito es un
404, que se lee como sistema roto. Es el mismo cuello de botella de §13 · A1 —
trabajo de búsqueda, no de código.

**Cerrado el 2026-09-11 (Fase 1), con dos desvíos del plan que conviene saber:**

- ⚠️ **Resident Advisor quedó afuera, y es una limitación medida.** `ra.co`
  contesta **403 a cualquier fetch** —probado con `curl` y un User-Agent de
  navegador, y también con un slug inventado: 403 igual—, así que **no hay forma
  de distinguir un perfil real de un 404** sin abrirlo en un navegador de verdad.
  La regla de §13 · A1 es que lo que no se puede abrir no entra. Los diez perfiles
  son de **Wikipedia**, cada uno abierto y leído: los diez describen a esa persona
  como DJ/productor en la primera oración, ninguno es desambiguación ni stub. En
  castellano los siete que tienen artículo (Cox, Allien, Knuckles, Cattáneo, Dijon,
  Mills, Garnier), en inglés Jackmaster, Jayda G y Chandler.
- **No es `perfil?: string` por frase: es un mapa `PERFILES` por persona, y
  `autor` se tipa contra sus claves** (`type Autor = keyof typeof PERFILES`). El
  perfil es de la persona y la fuente es de la cita: Chandler tiene tres frases de
  dos artículos y un perfil, y tres copias de una URL son tres lugares donde
  puede quedar distinta. Con el tipo, citar a alguien sin perfil **no compila** —
  la misma forma en que `fuente` sostiene su regla. `fuente` sigue obligatoria y
  deja de dibujarse.
- Dos casos: el de datos (cada autor citado tiene un perfil, y es de Wikipedia) y
  el de pantalla (`InicioPagina.test`: la firma linkea al perfil y **no** contiene
  `djmag.com`), con `fraseDelDia` fijado a una cita para que no dependa del día.

#### ✅ A3 · ¿Puede un usuario mover su clase más de una vez? — **cerrado el 2026-09-11**

**Hoy sí, sin tope.** El único límite es que no haya **dos pedidos PENDIENTES**
sobre la misma reserva — `SolicitudReprogramacionService.java:116`. Aprobado uno,
puede pedir de nuevo indefinidamente.

**Lo que NO es riesgo**, y es lo que uno teme primero:

- **La plata no se entera.** Aprobar mueve la reserva **en el lugar** (misma fila,
  otro día), no crea una nueva — la decisión de `platform.md` §16 · P9. Por eso no
  hay devolución ni segunda seña. `SolicitudReprogramacionTest` lo pinea forzando
  el chequeo diferido de `V10`.
- **No se consumen clases**: la clase se consume cuando se toma.
- **No hay doble reserva**: cada movimiento revuelve a chequear el solapamiento.

**Lo que SÍ es riesgo, y es de otra naturaleza:**

1. **El curso se estira sin techo** — no hay fecha de fin de inscripción.
2. ⚠️ **Nadie ve el patrón.** El `motivo` de cada pedido se guarda desde `V1` y
   **ninguna pantalla los cuenta**: el que movió cuatro veces se ve igual que el que
   movió una.
3. El costo operativo cae sobre administración, que rehace el trabajo cada vez.

**Opinión: el problema no es que se pueda, es que no se vea.** Un límite duro
—*"dos por inscripción"*— es una regla de negocio, va a la base, y el día que
alguien tiene una razón legítima para la tercera no hay salida. Primero el contador
visible; el número, si el contador muestra abuso real (pregunta 19).

**Cerrado el 2026-09-11 (Fase 2), y el plan se corrigió antes de escribirlo.** El
plan decía que el portal contara sobre los pedidos que ya tiene cargados, y **eso
daba un número falso**: `deLaPersona` trae lo que pidió *esa* persona, y una clase
la puede mover el alumno o el profesor (P9) — cada uno habría visto 1 donde la
clase se movió dos veces. *"Movida N veces" es un hecho de la reserva, no de quien
mira.* Así que hay **una sola definición**, en SQL:
`SolicitudReprogramacionRepository.aprobadasPorReserva` (APROBADA, agrupado por
reserva) con un `default movidasDe(ids)` que resuelve el `IN ()` vacío, y la
consumen los tres servicios que arman una reserva —`ReservaService`,
`DocenciaService`, `PortalService`— en un campo nuevo, `vecesMovida`, de
`ReservaResumen` y de `ReservaDelPortal`. Los cinco lugares que construían
`ReservaResumen.de` pasan el número; el alta pasa 0 con el comentario de por qué
(acaba de nacer). Lo rechazado y lo pendiente no cuentan.

- **Front**: `componentes/Movida.tsx`, una `Etiqueta` neutra que **con cero no
  dibuja nada** (lo normal es no haberla movido; *"movida 0 veces"* en cada fila
  tapa la que sí). La usan Mis reservas, Mi agenda, el detalle del calendario y el
  historial de la ficha del alumno, que además **suma** en el título — *"movió 3
  veces"*— sobre las clases listadas, o sea los mismos 45 días que el título ya
  declara. Un total "desde siempre" sería otra consulta; hoy la pregunta es si
  esta persona mueve seguido, no cuántas en su vida.
- **Casos**: dos en `SolicitudReprogramacionTest` (la misma cuenta para los tres
  que la miran; rechazado y pendiente dan cero) y tres en el front.

#### ✅ A4 · Colores del tablero de indicadores — **cerrado el 2026-09-11**

**Verificado: el tablero es monocromo.** `text-tenue`, `text-apagado`, negrita, y
**un solo color escrito a mano**: `rgba(214, 40, 40, reservas/maximo)` en el heatmap
— `TableroPagina.tsx:520`. Por eso en oscuro no se ve: un rojo opaco con alfa bajo
sobre fondo oscuro no existe. Y no sigue el tema, que es exactamente lo que §14 · A
arregló en el resto del sistema.

⚠️ **Hay una tensión con una regla vigente y conviene resolverla a propósito.** La
regla es *"el rojo es un bisturí: un acento por pantalla"* (§10). El tablero es **la
única pantalla del sistema donde eso no alcanza**: un heatmap necesita una escala y
ocho indicadores necesitan distinguirse entre sí.

**La propuesta es que el tablero sea la excepción DECLARADA** —una escala secuencial
propia, derivada de la paleta, con contraste medido como en §14 · A— y no que se
afloje la regla para todas. Si se afloja, en tres pantallas más hay tres acentos y
ninguno.

**Cerrado el 2026-09-11 (Fase 1). La excepción está DECLARADA en `index.css`**, en
un bloque propio con sus medidas, y son **dos escalas y no una**, porque el
tablero tenía dos problemas y el hallazgo nombraba uno:

- **El calor**: `--calor-1..4`, rojo mezclado con la superficie del tema en cuatro
  escalones (22 · 45 · 70 · 100 %), medidos contra la superficie de cada tema
  (claro 1,42 · 2,08 · 3,15 · 4,56 — oscuro 1,28 · 1,89 · 3,00 · 5,03). El cero es
  `--superficie-2`, la celda apagada del sistema. **Escalones y no alfa continuo**:
  `rgba(214,40,40,α)` daba una casilla distinta por cada cantidad, ruido en un
  mapa de 7×10, y en oscuro directamente no existía.
- **Las series**: `--serie-1..6`, del rojo a la tinta del tema. Esto no estaba en
  el hallazgo y era peor: `graficos.tsx` tenía una rampa de opacidad sobre `--ink`
  **fija**, es decir tinta sobre tinta en oscuro — la dona, las barras y el anillo
  de retención eran invisibles con el tema oscuro. Ahora `colorDeSerie` devuelve
  `var(--serie-N)` y **no escribe ningún color**; el anillo lleno toma `--serie-1`.
- Los dos primeros escalones del calor y el sexto de las series quedan bajo 3:1 a
  propósito y está escrito por qué: lo que se mira en un mapa de calor es el
  escalón alto, y el sexto de una serie es la categoría más chica de seis.
- Un caso en `TableroPagina.test` pinea que la casilla llena lleva `var(--calor-4)`
  y la vacía `var(--superficie-2)`: si alguien vuelve a escribir un color a mano,
  lo ve.

⚠️ **No se verificó en el navegador, sólo con las medidas.** Si Ignacio lo ve raro
en oscuro, lo primero a mirar son `--serie-5` y `--serie-6`.

#### ✅ A5 · El indicador de alumnos, sin dividir por nivel — **cerrado el 2026-09-11**

**Confirmado el síntoma que Ignacio describe** —*"figura 2 mentorías, una avanzada y
otra gral"*—: `nivel` es nullable y mentoría no tiene nivel estándar, así que sale
una fila `AVANZADO` y otra `SIN_NIVEL`.

⚠️ **Pero NO se arregla sumando las filas en la pantalla.** La consulta agrupa por
`(disciplina, nivel)` y cuenta `DISTINCT` el alumno **dentro de cada grupo** —
`TableroRepository.java:61`. Sumar en el front cuenta dos veces a quien tiene DJ
inicial y DJ avanzado. **Hay que cambiar el `GROUP BY` en SQL**, y eso arrastra el
DTO, el tipo TS y **el informe de Excel/PDF**, que leen las mismas hojas (Módulo 8:
una sola armada, dos formatos — si se toca una sola, los dos archivos dejan de
coincidir).

Falta decidir si el nivel se pierde del todo o sobrevive en el export (pregunta 20).

**Cerrado el 2026-09-11 (Fase 2), como P70 lo decidió: dos consultas.**
`TableroRepository.alumnosPorDisciplina` (`DISTINCT` sobre la disciplina entera)
alimenta `Tablero.alumnos`, ahora `AlumnosPorDisciplina` —las tres siempre, en el
orden del enum, con cero—; la vieja `alumnosPorServicio` pasa a
`Tablero.alumnosPorNivel` y **sólo la lee el informe**, en una hoja nueva,
*"Alumnos por nivel"*, separada a propósito de *"Alumnos cursando"*: sumar sus
filas NO da la de arriba, y en una sola hoja alguien iba a sumarlas. La pantalla
dejó de dibujar el nivel; el caso nuevo del front pinea que dice 4 y no 5.

⚠️ **El caso del backend pisó dos trampas ya documentadas, una detrás de otra.**
Para tener a alguien con dos niveles vigentes de la misma disciplina hay que
pausar el primero antes de insertar el segundo, y **Hibernate escribe los INSERT
antes que los UPDATE**: sin `saveAndFlush` el índice parcial rechazó la segunda
inscripción con la primera todavía ACTIVA en la base — `ReservaService`, otra vez.
Y después, `jsonPath("$.alumnos[?(...)].alumnos").value(7)` falló diciendo
*"expected 7 but was 7"*: un filtro devuelve una LISTA y el JSON trae `Integer`;
se compara con `Matchers.contains(Math.toIntExact(n))`. El número esperado se
cuenta en SQL sobre la misma base (la de desarrollo tiene alumnos propios), con el
`DISTINCT` que es justamente la definición que se prueba.

#### ✅ A6 · La pantalla en negro al cerrar la ficha — **BUG, cerrado el 2026-09-11**

**Es el hallazgo más concreto de la barrida y no depende de ninguna decisión.** La
cadena, verificada capa por capa:

1. **`inscripcion.fecha_inicio` es nullable** — `V1__baseline.sql:188`. No tiene
   `NOT NULL`, y el alta la manda opcional: `fechaInicio: datos.fechaInicio ||
   undefined` (`InscripcionesPagina.tsx:589`).
2. `CandidatoDeLaFicha.de(Inscripcion)` la copia tal cual —
   `CandidatoDeLaFicha.java:96`— así que viaja `"cuando": null`.
3. ⚠️ **El tipo de TypeScript miente**: dice `cuando: string`, no `string | null` —
   `tiposAdmin.ts:838`.
4. El `<option>` hace `fecha(c.cuando)`, y `fecha()` es `iso.slice(0, 10)` —
   `semana.ts:72`. **`null.slice` tira `TypeError`.**

**Y se ve negro, y no roto, por una segunda causa independiente: no hay un solo
`ErrorBoundary` en toda la SPA** (grepeado: cero). Cualquier throw de render
desmonta el árbol entero y queda el fondo del tema, que en oscuro es negro.

⚠️ **Sólo pasa con inscripciones**, y por eso Ignacio lo encontró justo
inscribiendo: `reserva.fecha` y `venta_equipo.fecha_venta` son **`NOT NULL`**. Los
otros dos tipos de candidato no pueden disparar esto.

**Son dos arreglos distintos y van los dos.** El `null` es el bug; el
`ErrorBoundary` es por qué se vio negro en vez de mostrar algo, y sin él **el
próximo throw de cualquier pantalla también se lleva la aplicación entera puesta**.

⚠️ **La lección es la de §14 · A5 mirada al revés.** `fecha()` existe porque había
seis dialectos y uno devolvía `19T14:33:12Z/08/2026` **sin fallar**. Acá el tipo
dice que el `null` no puede pasar y **la base dice que sí**: unificar la escritura
de fechas no sirve de nada si el tipo que la alimenta no describe la columna.

**Cerrado el 2026-09-11 (Fase 0), con los dos arreglos:**

- **El tipo dice la verdad**: `CandidatoDeLaFicha.cuando` es `string | null` en
  `tiposAdmin.ts`, con el porqué escrito al lado, y el javadoc del record de Java
  dice lo mismo desde su lado. La opción escribe *"sin fecha de inicio · DJ ·
  INICIAL"* cuando no hay. `fecha()` **no** aprendió a tolerar `null` a propósito:
  un `null` en cualquier otro lugar sigue siendo un tipo que miente, y conviene
  que falle ahí y no que se escriba *"sin fecha"* en una columna `NOT NULL`.
- **`LimiteDeError`** (`componentes/LimiteDeError.tsx`), una clase porque
  `getDerivedStateFromError` no tiene hook y el `errorElement` de react-router es
  del router de datos, que este sistema no usa. Dos alcances: **`pantalla`** en el
  `Layout` alrededor del `<Outlet />`, con `key={pathname}` para que navegar a otra
  ruta lo reinicie solo —sin el `key`, quien vuelve al inicio desde el sidebar
  sigue viendo el error de la pantalla que dejó—; y **`aplicacion`** en `App`,
  **fuera del router** porque el router puede ser lo que se rompió, con las dos
  salidas como navegaciones del navegador. **Los dos muestran el path y el
  `name: message` del error en un `<pre>` para copiar**: es para el reporte, no
  para quien usa el sistema.
- **Siete casos**, y el del buzón se verificó **poniendo el bug de vuelta**: con
  `fecha(c.cuando!)` va a rojo. Los otros seis cubren el límite: mensaje y path,
  que no se lleva lo de afuera, *Intentar de nuevo*, *Volver al inicio*, el de la
  aplicación sin router, y en `Layout.test` que el sidebar sigue y que cambiar de
  ruta deja la pantalla rota atrás.

⚠️ **Una trampa de test que apareció escribiendo el caso de "Intentar de nuevo"**:
un componente que *"tira la primera vez y anda la segunda"* nunca llega al límite.
React, ante un throw en un render concurrente, **reintenta el árbol entero de forma
síncrona antes de entregárselo al `ErrorBoundary`**, así que el reintento ya andaba,
el límite no se enteraba, y encima el throw descartado salía por `reportError` y
vitest lo reportaba como *Uncaught Exception* de un caso que no era. El componente
de prueba tira **mientras una bandera esté en `true`**, y el caso la baja antes de
apretar el botón.

⚠️ **Y un rojo que no era de A6**: cinco casos de `MisReservasPagina.test` caían en
el árbol sin tocar. Sus fixtures decían *"la próxima es el 07/09"* y eso fue cierto
hasta el 07/09; desde el 11 la pantalla la leía como pasada y no había *"Lo
próximo"*. Es §9.6 del almanaque, la misma especie que `CajaPagina` ya había pagado
el 31 de cada mes; se fijó `hoy()` igual que allá. **Doce suites más de pantallas
que leen `hoy()` no lo fijan** (`AlumnoPerfil`, `Bloqueos`, `Calendario`, `Egresos`,
`FichaDeAlumno`, `Inicio`, `Pagos`, `Reservar`, `SubirMaterial`, `Tablero`,
`UsoDeSalas`, `Ventas`) — hoy pasan, y cualquiera de ellas puede ponerse roja sola
el día que un fixture "futuro" quede atrás. No se tocaron: es un barrido propio,
no parte de A6.

#### ✅ A7 · Mentorías en la landing — **cerrado el 2026-09-11**

⚠️ **Es peor que "falta en programas": `grep -i mentor` sobre toda la landing
devuelve CERO coincidencias.** No está en el home, no está en programas, no está en
el FAQ, no está en los datos. Sólo existen dos programas: DJ y Producción.

**Del lado del sistema no hace falta migración.** `InteresDelSolicitante.CURSO` ya
la cubre —su javadoc dice *"DJ o Producción"* y habría que corregirlo, pero el valor
sirve: la disciplina se elige recién en la inscripción, y `MENTORIA` ya está en el
CHECK de `inscripcion_disciplina_valida` desde `V1`.

⚠️ **Lo que sí falta es contenido, y toca un bloqueante que ya existe.** Mentoría
**no tiene cantidad de clases estándar** (P34: DJ 8, Producción 16, y para mentoría
el alta **rechaza en vez de adivinar**), así que la página tiene que decir un formato
y un precio que hoy no existen en ninguna capa. Y los precios inventados **ya son
bloqueante para publicar la landing** (`pendientes.md` §1). Preguntas 10 y 11, y se
cruza con la 6 / P13.

**Cerrado el 2026-09-11 (Fase 2), con P67 y sin migración.** Un tercer programa en
`data/programs.ts` (`slug: mentoria`), con la copia armada a partir de la frase de
Ignacio —**el texto largo es a validar como todo el resto**; lo que no es
placeholder es el formato (sesiones de 1:30), el público (quien ya toca), la
modalidad (presencial o virtual) y que el precio dice *"a confirmar"*, porque no
existe hasta `V28` (P63: se cobra por sesión). **Sin cantidad de sesiones**: no es
un curso con estándar (P65) y acá tampoco se inventa uno. Lo que decidió:

- **`cta: "mentoring"`, un tercer valor y no un flag**: es el campo que decide
  qué formulario se monta al pie del detalle. `MentoringApplyForm` pregunta
  modalidad, *hace cuánto tocás* (tres franjas) y **un mensaje obligatorio** —
  *"dónde estás y qué querés destrabar"*—, en vez de si arranca de cero. `TextArea`
  ganó `required` para eso. Manda `interes: CURSO` con el programa primero en
  `detalle`, como los otros dos; **los campos estructurados llegan con `V29`** y
  ahí se actualizan los tres formularios de una.
- **Aparece sola donde `PROGRAMS` se lee**: el riel de la home, `/programas`, el
  sitemap y el `Course` del JSON-LD. Lo que estaba escrito a mano se corrigió:
  la nota de `Numbers` (*"DJ, producción y mentoría"*), la descripción de
  `/programas`, el FAQ de *"¿tengo que saber algo?"* (la mentoría es al revés) y
  `llms.txt`, que la lista con el precio como PENDIENTE — la regla de ese archivo.
- **El build pasó de 19 a 20 páginas** (19 en el sitemap); los dos `CLAUDE.md`
  lo dicen. `InteresDelSolicitante.CURSO` corrigió su javadoc, que decía *"DJ o
  Producción"*.
- **Foto**: reusa `sala-mastering.jpg`; no hay una de la mentoría y no se
  inventa. Cuando el cliente valide la copia, conviene pedirle una.

#### ✅ A8 · Un solo botón de WhatsApp al apartar la cabina — **cerrado el 2026-09-11**

**Ignacio tiene razón, y conviene registrar que revierte una decisión escrita a
propósito.** El comentario de `whatsapp.ts` dice: *"No lleva la contraseña. Son dos
mensajes distintos a propósito: éste habla de lo que hay que hacer ahora —abonar— y
el otro de una cuenta que se puede mirar cuando quiera. **Juntos, el que importa se
lee como un trámite más.**"*

**El miedo era real** —que el plazo de 24hs se hunda entre la contraseña y el resto—
**y la decisión igual se revierte**, por un motivo mecánico que la discusión original
no tuvo en cuenta:

⚠️ **Un `wa.me` es UNA URL con UN mensaje.** "Un botón para todo" es necesariamente
*un* mensaje, no dos. No hay una tercera forma.

**Así que lo que salva las dos cosas es el orden**: plazo y monto en las dos primeras
líneas, la cuenta abajo de un separador. Es la misma decisión de orden que ya tomaron
el premaster y la publicación sin contrato — **primero lo que hay que hacer, después
la salida**. Qué más dice el mensaje: pregunta 21.

**Cerrado el 2026-09-11 (Fase 1), con el borrador de P71 tal cual.**
`mensajeDeCabinaApartada` toma un objeto con `cuenta: {email, passwordTemporal} |
null` y arma los tres bloques; `CabinaLista` perdió el segundo botón y el único
dice *"Avisarle por WhatsApp, con la clave"* cuando la cuenta es nueva. Lo que
conviene saber del código:

- **El bloque de la cuenta y la descripción del portal se escriben UNA vez**
  (`bloqueDeLaCuenta`, `QUE_PUEDE_HACER`) y los usan los dos mensajes —el de la
  cabina y `mensajeConLaClave`, que sigue existiendo para *"Crearle la cuenta"*
  sin reserva y ahora también cierra con el portal. Escritos dos veces, dirían
  una cosa en un lado y otra en el otro.
- **El caso de `whatsapp.test` mira POSICIONES, no presencia**: `indexOf(plazo) <
  indexOf(clave) < indexOf('Desde tu cuenta')`. Un caso que sólo mire que las
  cosas estén no protege la decisión, que es el orden.
- La segunda variante tiene su caso en la pantalla: con `cuentaNueva: false` el
  link no contiene *"Contraseña"* y la clave no se dibuja.
- El molde para la inscripción a un programa (P71, segundo párrafo) **no se
  escribió**: es de la Fase 6, cuando exista el alta desde el buzón.

---

### 🔴 B1 · Seña para los programas — **la decisión central de la barrida**

Ignacio lo trajo así: *"(No me mates) … al igual que las reservas, los programas
también tengan señas … la tenemos más fácil porque sería lo mismo que los servicios,
crear una pre-reserva para guardar el lugar."*

⚠️ **NO es lo mismo que los servicios, y la diferencia es la que decide todo el
diseño.**

Una prereserva de cabina aparta **un recurso escaso e identificable**: sala × día ×
hora. Y lo que lo aparta de verdad **no es el estado, es el `EXCLUDE` de `V1`** — hay
una fila de `reserva` ocupando ese hueco y nadie más lo puede tomar. Por eso `V24`
salió barato: el mecanismo de *ocupar* ya existía y sólo hubo que agregarle un estado
y un vencimiento.

**Un programa no tiene hueco que apartar.** No hay cupo, no hay comisión, no hay
cohorte. `V23` lo dejó escrito con todas las letras: *"«el curso» no es una entidad
compartida en este schema"* — una `inscripcion` es el contrato de **una** persona.

Entonces *"guardar el lugar"* puede significar dos cosas incompatibles:

- **Sentido débil** — la inscripción no es formal hasta que se abona. Es un
  **estado**, no una reserva: no le saca el lugar a nadie, sirve para que figure en
  Deudores con plazo y para que no se cuente como alumno activo hasta que pague. **Es
  todo lo que B2 1.1 necesita.**
- **Sentido fuerte** — hay un cupo real que se agota: un horario semanal con un profe
  y una sala que aguanta N alumnos. Ahí sí hay algo que apartar, y **eso no existe hoy
  en ninguna capa del sistema**. Es, además, lo que B2 2.1 (grupos) da por supuesto.

**Hay que elegir antes de escribir nada** (pregunta 1). El sentido fuerte no es una
migración: es un módulo.

#### ⚠️ B1 cambia la política de cobro, y eso no estaba en el pedido

El scope dice que **el curso se paga completo antes de empezar** (§1), y **P33** cerró
que este negocio cobra por adelantado y **no en cuotas**. Una seña es cobrar **una
parte**: los programas pasan de un pago a dos.

Eso mueve Deudores, Estado de cuenta, Caja y la línea "programas" del tablero. No es
caro — **es que hay que decidirlo, no derivarlo de "hagamos como con la cabina"**
(preguntas 2 y 3).

#### La forma recomendada, y la que se descarta

**Recomendado: un estado nuevo de `inscripcion`** (`PREINSCRIPTA` o como se llame),
**dentro** del índice único parcial y **fuera** de `VIGENTES`. Así:

- no cuenta como alumno cursando —ni en el listado, ni en el filtro por disciplina, ni
  en el número del tablero—,
- **sí** aparece en Deudores, que es donde tiene que estar hasta que pague,
- y no se pueden acumular tres preinscripciones a DJ abiertas, que es lo que pasa si
  se deja el índice como está (`WHERE estado = 'ACTIVA'`, `V1:210`).

⚠️ **El costo real: son seis lugares que se mueven juntos** — el CHECK
`inscripcion_estado_valido`, el enum `EstadoInscripcion`, el tipo TS, el DBML, el
conjunto `VIGENTES` y el índice parcial. Es **exactamente la forma de los cuatro roles
y de los estados de reserva**: conocida, no gratis, y el que se olvida uno no se entera
(Java deja de estar de acuerdo con la base y nada falla).

**Descartada: que nazca `ACTIVA` con una deuda a plazo.** Es más barata y es el
agujero que **`V12` cerró del otro lado** —*"un cupo se podía conseguir anotando una
deuda"*—. Acá además haría mentir al contador de alumnos del tablero, que es justo el
número que A5 viene a arreglar.

---

### 🟡 B2 1.1 y 1.2 · El alta completa desde el buzón

**Es la parte más clara de todo el pedido y el molde ya está escrito y probado.**
`POST /api/solicitantes/{id}/reserva` (§15 · Fase 3) hace cuenta + prereserva + deuda
+ cierre de la ficha **en una transacción**. B2 1.1 es eso mismo aplicado a `CURSO`,
con un paso más: el alta de la relación `alumno`.

⚠️ **El argumento de por qué es UNA transacción se traslada igual, y es el opuesto al
de `atender`.** Lo que puede fallar acá es **la inscripción** —el índice único parcial
la rechaza si esa persona ya tiene una `ACTIVA` en esa disciplina— y lo que quedaría es
**una cuenta creada, con la contraseña temporal ya mostrada, para alguien que no tiene
nada**. Es literalmente el escenario que §15 · Fase 3 usó para justificar la
transacción única.

**B2 1.2 (el que ya tiene cuenta) está medio hecho**: `darleCuenta` resuelve los dos
caminos desde §15 —crea, o encuentra al usuario existente— y esa bifurcación fue la que
evitó que la ficha quedara trabada para siempre contra `usuario_email_unico`. Lo que
falta es que el botón de curso **haga el trabajo** en vez de sólo crear la cuenta.

⚠️ **B2 1.1 depende de B1**: sin seña no hay deuda que mandar a Deudores ni qué decir
por WhatsApp. **El orden es B1 → B2 1.1.**

⚠️ **Y depende de cuatro datos que hoy los tipea una persona**, porque una inscripción
los exige:

| Dato | Estado hoy | Pregunta |
|---|---|---|
| **`precio_total`** | `NOT NULL` + `@NotNull` — **no hay lista de precios en el sistema** | 6 — **es P13**, que `pendientes.md` §4 ya marca como *"la más consecuente de las que quedan"* |
| **`nivel`** | El formulario de la landing **no lo pregunta** | 7 |
| **`clases_contratadas`** | Lo pone el servidor (DJ 8 / Producción 16), pero **mentoría no tiene estándar y el alta rechaza** (P34) | 8 |
| `id_profesor` | Acepta vacío (P37) | 9 |

---

### ⏸️ B2 2.1 · Grupos de a 3 — **DIFERIDO por decisión de Ignacio**

Fuera de esta barrida: *"Cuando terminamos esta barrida nos enfocamos en esto."* Se
deja escrito lo que salió del análisis, que es lo caro de volver a hacer.

**Ignacio ya identificó el caso incómodo** —*"se enquilomba si 2 tienen cuenta y 1
no"*— y **ése es el fácil**: se resuelve aplicando tres veces el camino doble que
`darleCuenta` ya tiene. **Los difíciles son otros tres:**

1. ⚠️ **El grupo no existe como entidad, y la plata es el problema.** Existen clases
   grupales (varios `reserva_participante` en una `reserva`), pero eso es *"tres
   personas en una clase"*, no *"tres personas que cursan juntas"*. Y si la seña es
   **una sola**, `pago` apunta a **un** `id_usuario` y a **una** `id_inscripcion` — y
   hay tres. Si son tres, ¿el lugar se aparta con el primer pago o con el último? ¿Y si
   pagan dos y el tercero no?
2. ⚠️ **Reabre P7.** Hoy las clases se cargan **a mano, de a una**, y eso fue una
   decisión explícita: *autogenerar las 8 semanales fue lo que el documento recomendó y
   el cliente rechazó*. Con grupos, cargar 8 clases × cada grupo a mano es exactamente
   el trabajo que la función viene a evitar. **O se revisa P7, o el grupo no compra
   casi nada.**
3. ⚠️ **La landing y `V20`.** Hoy el formulario manda **una** ficha con un nombre, un
   mail y un teléfono. Un grupo de 3 es o tres fichas hermanadas o una ficha con tres
   personas adentro, y `V20` no puede guardar ninguna de las dos. **Y una ficha no se
   puede borrar** (`solicitante_no_se_borra`, `V20` §3), así que una forma mal elegida
   **se acumula en el buzón para siempre**.

---

### ✅ Las quince preguntas — contestadas el mismo día, y P13 con ellas

Ignacio las contestó el 2026-09-10 (*"te respondo las preguntas cosa que no se
trabe nada"*) y **las respuestas están en `requirements/platform.md` §22, P59 a
P71**, escritas antes de tocar código. La correspondencia, para no ir a buscarla:

| Pregunta | Decisión | En una línea |
|---|---|---|
| 1 · ¿Hay cupo? | **P60** | No por ahora → la preinscripción es un **estado**, no una reserva |
| 2 · ¿Seña + saldo? | **P59** | 50% y el resto antes de empezar · ⏳ plazo: se adoptan las 24 hs de `V24` |
| 3 · ¿Se cursa con la seña sola? | **P59** | La seña la hace formal; el saldo va antes de la primera clase · ⏳ **visible, no candado** |
| 4 · ¿Vencida se cancela? | **P61** | **No**: avisa a administración y Mica decide · ⏳ lectura adoptada |
| 5 · ¿Mentoría también? | **P62** | A todo |
| 6 · ¿Lista de precios? | **P63 — cierra P13** | Sí: tabla `programa`, editable · ⏳ mentoría por sesión |
| 7 · ¿Con qué nivel entra? | **P64** | ⚠️ el formulario pregunta **experiencia**, no nivel, a propósito → se prellena y Mica lo cambia · ⏳ |
| 8 · ¿Cuántas clases una mentoría? | **P65** | Sin estándar: lo escribe quien inscribe, obligatorio |
| 9 · ¿Profesor al inscribir? | **P66** | Sí, opcional, y **todo editable después desde las pantallas de siempre** |
| 10 · ¿Qué es la mentoría? | **P67** | 1:1 con un DJ, 1:30, para quien ya toca y está estancado · ⏳ **virtual no cabe en la agenda** |
| 11 · ¿Formulario propio? | **P67** | Sí |
| 18 · ¿La fuente sigue visible? | **P68** | No: deja la pantalla, **se queda en el dato** (sostiene la regla) |
| 19 · ¿Contador o límite? | **P69** | Contador |
| 20 · ¿El nivel dónde queda? | **P70** | En el export |
| 21 · ¿Qué más dice el mensaje? | **P71** | Tres bloques: lo confirmado y lo que se debe · la cuenta · **el portal descrito por lo que hace** |

⚠️ **Dos respuestas chocaron con algo que ya estaba escrito en la landing, y las
dos se resolvieron respetando las dos cosas** (P64 y P67): el formulario de
programas **no pregunta el nivel** —pregunta experiencia, para que la persona no
se autodiagnostique antes de leer nada— y **ya pregunta modalidad presencial /
virtual para los tres programas**, no sólo para la mentoría. Ninguna de las dos
estaba en la lista de Ignacio ni en la mía: aparecieron al abrir el formulario.
*Chequeá el código, no la frase sobre el código*, otra vez.

**Las cinco ⏳ no traban nada**: cada una tiene una lectura adoptada y escrita, y
cambiarla es un ajuste, no un rediseño. Están enumeradas en la cabecera de §22.

---

### El plan por fases

**Seis fases, en el orden de siempre — A → B → C — con A6 primero porque es un
bug y no una mejora**, la misma excepción que §14 hizo con el bug del sello.
Cada fase termina con las seis verificaciones en verde (`mvn test`,
`pruebas-sql.sh`, vitest, `tsc -b`, los dos builds, los dos linters) y **cada
punto se cierra por separado**.

⚠️ **Tres migraciones nuevas, y la del admin sembrado se corre por QUINTA vez**:
ya no es `V28`. Va a ser `V31`. No la anotes con número.

#### Fase 0 · A6 — el bug de la pantalla en negro

- `CandidatoDeLaFicha.cuando` pasa a `string | null` en el tipo TS (la columna lo
  es); la opción escribe *"sin fecha de inicio"* cuando no hay.
- **Un `ErrorBoundary` en el shell** con un mensaje legible y la salida (volver
  al inicio / recargar), y **uno por ruta** para que una pantalla rota no se
  lleve el sidebar. Hoy no hay ninguno.
- Caso nuevo con una inscripción sin fecha; **se verifica poniendo el bug de
  vuelta** — el caso tiene que ir a rojo con `cuando: string`.

#### Fase 1 · Grupo A — A1 · A2 · A4 · A8

- **A1** — la agenda del profesor pasa de 1 a **4 semanas**, igual que la del
  alumno. `misClasesDictadas` acompaña el período (las dos preguntas son del
  mismo rango a propósito y siguen siéndolo).
- **A2** — `Frase` gana `perfil?: string`; el nombre linkea ahí; `fuente` deja de
  dibujarse y sigue siendo obligatoria en el tipo. **Diez perfiles a buscar y
  abrir uno por uno** (Resident Advisor, con Wikipedia de respaldo) — es trabajo
  de búsqueda, como las diecisiete citas.
- **A4** — el tablero es la **excepción declarada** a "un acento por pantalla":
  una escala secuencial de la paleta para el heatmap, medida en claro y oscuro
  como en §14 · A, y tono en las tarjetas de indicadores. El `rgba(214,40,40)`
  escrito a mano desaparece.
- **A8** — **un botón, un mensaje, dos variantes** (P71): `mensajeDeCabinaApartada`
  absorbe a `mensajeConLaClave`; sin cuenta nueva no va el bloque 2. La pantalla
  pierde el segundo botón. Los casos que buscaban los dos se reescriben.

#### Fase 2 · Grupo B — A3 · A5 · A7

- **A3** — *"movida N veces"* en la clase. Mis reservas y Mi agenda ya tienen los
  pedidos cargados: cuentan los aprobados por reserva. Para administración
  (calendario y ficha del alumno) el conteo viaja en el resumen de la reserva,
  agrupado en la consulta y no por fila.
- **A5** — **dos consultas**: alumnos por disciplina (pantalla) y por disciplina
  y nivel (una hoja aparte del export). `DISTINCT` sobre la disciplina entera en
  la primera. DTO, tipo TS y las hojas del informe cambian juntas — un armado,
  dos formatos.
- **A7** — la página de mentoría en la landing (`programs.ts`, copia de P67 a
  validar, precio *a confirmar* como los otros), **formulario propio** con las
  preguntas de alguien que ya toca, en el home y en `/programas`. Manda
  `interes: CURSO` con el programa en `detalle` como hoy; **los campos
  estructurados llegan con C2** y ahí se actualizan los tres formularios de una.

#### ✅ Fase 3 · C1 — el catálogo de programas (`V28`, cierra P13) — **cerrada el 2026-09-11**

- Tabla `programa`: una fila por disciplina — nombre, **precio y moneda**,
  `cobro` (por paquete / por sesión, P63), `clases_estandar` (8 · 16 · NULL),
  duración, `activa`, `fecha_creacion`. Sembrada con lo que hoy dice la landing.
- `GET/PUT /api/programas` y la pantalla `/admin/programas` — tres filas
  editables, `@PuedeOperar`; `DIRECTIVO` la lee.
- **`CLASES_ESTANDAR` se borra de Java y del front**: el alta lee el catálogo.
  Una definición, no tres.
- El alta de inscripción **prellena el precio** desde el catálogo; la inscripción
  sigue guardando el suyo.

**Lo que decidió al escribirse, y no estaba en el plan:**

- ⚠️ **`precio` es NULLABLE y el NULL significa "todavía no hay precio".** La
  mentoría nace así (P63: *"a confirmar"*). La alternativa era un 0, y 0 en este
  esquema ya quiere decir otra cosa —en `inscripcion`, una beca—. Un catálogo que
  dice $0 donde no se decidió nada miente; uno que dice "a confirmar" se muestra.
  La pantalla lo escribe así y el alta no prellena nada: lo tipea quien inscribe,
  como antes. **Y el PUT manda la fila entera** para que un precio borrado viaje
  como `null` — si el formulario lo omitiera o lo volviera 0, "a confirmar" no se
  podría volver a poner nunca. Hay un caso que lo pinea.
- **Sin FK de `inscripcion` a `programa`, a propósito.** La unión es
  `disciplina`, con el mismo CHECK en las dos tablas: la inscripción no depende
  de que la fila del catálogo exista para seguir siendo válida — es su precio, no
  el del catálogo (P63, el criterio de `V19`).
- **`cobro` = PAQUETE exige `clases_estandar`** (CHECK `programa_paquete_con_clases`):
  un precio de paquete sin saber de cuántas clases es no se puede señar (¿el 50%
  de qué?). La inversa se deja libre: por sesión puede tener estándar o no.
- **No se borra: se desactiva**, con trigger propio (`programa_no_se_borra`) y
  no con `prohibir_borrado_historico()`, porque aquél dice *"es historial de un
  negocio real"* y esto no lo es. El motivo acá es otro y el mensaje lo dice: el
  alta lee de esta fila. **`activo = FALSE` significa algo**: `ProgramaService.
  paraInscribir` rechaza, y el `<select>` del alta deja de ofrecerlo.
- ⚠️ **La siembra deriva un placeholder de otro placeholder, y está escrito.** La
  landing publica *"$85.000/mes"* y el catálogo guarda el precio del paquete: 8
  clases semanales ≈ 2 meses → 170.000; 16 ≈ 4 → 440.000. La migración lo dice en
  su cabecera y en un `RAISE NOTICE`. Son números a reemplazar desde
  `/admin/programas`, y ya estaban bloqueando publicar la landing por lo mismo.
- **El alta de inscripción ahora también valida contra el catálogo**: el mensaje
  *"se arma a medida: decí cuántas clases son"* sale para cualquier programa sin
  estándar, no por el nombre `MENTORIA`. Y el precio se prellena con la moneda
  del catálogo.
- **`Disciplina` volvió a ser un enum pelado** — la lista del CHECK. Su javadoc
  cuenta por qué.

**Casos**: 6 en `ProgramaTest` (la siembra con el `null` de la mentoría, editar,
paquete sin clases, por sesión sin estándar, DIRECTIVO, no se borra), 2 en
`InscripcionTest` que pinean que el estándar es el del catálogo (con el 8 todavía
en el enum, *"el estándar es el del catálogo y se edita"* entraría con 8) y que un
programa desactivado no se inscribe, **8 en la suite SQL** (238–244) y 9 en el
front (7 de `ProgramasPagina`, 2 en Inscripciones). El diagrama DBML tiene la
tabla (29 tablas).

⚠️ **Dos trampas conocidas, pisadas otra vez.** `jsonPath` con filtro devuelve
una lista (*"expected 200000.0 but was 200000"*): `Matchers.contains`. Y una
etiqueta de `Campo` con `ayuda` concatena la ayuda al nombre accesible, así que
`getByLabelText('Precio del paquete')` no lo encuentra: regex.

#### ✅ Fase 4 · C2 — la ficha dice qué programa (`V29`) — **cerrada el 2026-09-11**

- `solicitante.disciplina`, `solicitante.experiencia`, `solicitante.modalidad`,
  las tres **nullable y con CHECK**, sin atarlas a `interes` (el buzón está vacío
  en desarrollo y no hay producción, pero atarlas obliga a desplegar landing y
  backend a la vez). Es la Fase 4 de §15 otra vez: **lo que la web sabe viaja
  como campo, no enterrado en `detalle`**.
- Los tres formularios de programas de la landing mandan los tres campos; el
  buzón los muestra.

**Cerrado el 2026-09-11 (Fase 4), tal como estaba planeado, con tres
decisiones que el plan no explicitaba:**

- **`experiencia` guarda lo que el formulario PREGUNTA, no un nivel** — el CHECK
  es `CERO / ALGO / TOCA`, y `INTERMEDIO` no entra (caso SQL 248, escrito para
  eso). La traducción de P64 vive en **un solo lugar**, `Experiencia.
  nivelSugerido()` (cero/algo → INICIAL, toca → INTERMEDIO), con su caso; la
  Fase 6 la llama desde el alta. El buzón muestra *"ya toca o produce"* y no
  *"intermedio"*: lo primero lo dijo la persona, lo segundo es una sugerencia
  del sistema, y presentarla como dato de la persona sería mentir.
- **La mentoría manda `experiencia: TOCA` fijo y su recorrido sigue en
  `detalle`.** Su formulario no pregunta experiencia previa —su público ya toca
  (P67)— sino hace cuánto (menos de un año / 1 a 3 / más de 3). Meter esas
  respuestas en la misma columna la volvería una columna cuyo significado
  depende de la disciplina, que es exactamente lo que `V20` rechazó.
- **CHECK y no FK a `programa`**, aunque `programa.disciplina` es UNIQUE desde
  `V28` y el FK era posible: es la tercera copia de la misma lista
  (`inscripcion`, `programa`, ésta), con el enum de Java como cuarta. Una
  disciplina nueva es una migración que toca los tres CHECKs. La cabecera de
  `V29` lo dice, punto 5.

Y lo que dejó de viajar: **`ProgramApplyForm` ya no manda `detalle`** — decir
lo mismo dos veces es tener dos definiciones de lo que la persona pidió. La
landing gana `Program.disciplina` en `data/programs.ts`, así que el nombre de
sistema de cada programa es un dato del programa y no un `if` sobre el slug.

**Casos**: 5 en `SolicitanteTest` (los tres campos, curso sin programa entra
igual, experiencia inventada 400, modalidad inventada la frena la base,
`nivelSugerido`), **5 en la suite SQL** (245–249, incluido *"un nivel donde va
la experiencia"*), 2 en `SolicitantesPagina.test` (la frase sin traducir a
nivel; sin los campos no dibuja el renglón). Probado además contra el backend
levantado: la ficha #808 de la base de desarrollo es esa prueba. El DBML tiene
las tres columnas.

⚠️ **Una trampa nueva de entorno, no de código: `next build` con `next dev`
corriendo al lado.** El `tsconfig` de la landing incluye `.next/dev/types/**`,
que el dev server reescribe; correr el build mientras lo hace dejó
`routes.d.ts` con la cola duplicada (*"TS1109: Expression expected"* en un
archivo que no está en el repo), y borrarlo produjo un 404 transitorio en
`/programas/[slug]` que parecía del cambio y era del dev server recompilando.
**Si el build de la landing falla en `.next/`, mirá primero si hay un `next
dev` en :3000** — se verifica con `git stash` y una request, no leyendo el diff.

#### ✅ Fase 5 · C3 — la preinscripción (`V30`, P59–P62 · P72) — **cerrada el 2026-09-12**

- `PREINSCRIPTA` en el CHECK; `inscripcion.vence_preinscripcion` con el CHECK de
  ida y vuelta contra el estado (la forma de `V24`).
- El índice único parcial se **amplía** a `estado IN ('ACTIVA', 'PREINSCRIPTA')`.
- **La escalera**: se nace preinscripta y se sale sólo a `ACTIVA` o `CANCELADA`;
  **a `ACTIVA` sólo con un pago en `SENADO`/`PAGADO` detrás**. Inmediato, con
  mensaje propio para `ManejadorDeErrores`. Sin la vuelta de `V11` (P60 dice por
  qué).
- Los seis lugares que se mueven juntos: CHECK, `EstadoInscripcion`, tipo TS,
  DBML, `VIGENTES` (**afuera**), índice.
- Casos en las dos suites SQL — con `probar_mensaje`, y **una sola rechazada por
  caso** (la lección de `V26`).

**Cerrado el 2026-09-12 (Fase 5), y antes de escribirla se preguntó — y la
respuesta cambió la Fase 6.** Las tres ⏳ (plazo de la seña, saldo visible o
candado, vencida cancela o avisa) se le preguntaron a Ignacio antes de la
migración, y la segunda respuesta reescribió el modelo de la plata: es **P72**
en §22. Lo que `V30` quedó siendo:

- **Tal como estaba planeada**: estado, columna con CHECK de ida y vuelta,
  índice ampliado, escalera de tres reglas (`verificar_escalera_de_preinscripcion`),
  sin la vuelta de `V11`. La (c) —a ACTIVA sólo con plata cobrada— mira
  `EstadoPago.ENTRARON` por nombre, no `<> 'ANULADO'`.
- **`EstadoInscripcion.ABIERTAS`** (ACTIVA + PREINSCRIPTA) al lado de `VIGENTES`
  (ACTIVA + PAUSADA): dos listas distintas a propósito — PAUSADA cursa y no
  ocupa, PREINSCRIPTA ocupa y no cursa. El pre-chequeo del alta y el mensaje del
  índice dicen *"abierta (activa o preinscripta)"*.
- **El único camino a ACTIVA es registrar la seña**: `PagoService.registrar`, ante
  un `SENADO`/`PAGADO` sobre una preinscripta, la activa en el mismo movimiento
  y el plazo se va con el estado (`Inscripcion.pasarA`, las escrituras que van
  juntas). El `<select>` de estados no ofrece ACTIVA desde PREINSCRIPTA ni
  PREINSCRIPTA desde nada (`estadosPosibles`) — la escalera leída desde la
  pantalla, no una segunda copia.
- **Ningún alta escribe PREINSCRIPTA todavía**: llega con la Fase 6 (la seña
  opcional del alta y el alta desde el buzón). Los casos nacen por SQL, como la
  fila legada del caso 225. Es un estado con lector y sin escritor por una fase,
  a sabiendas — no el `VENCIDO` de `V17`, que lo fue por dos meses sin que nadie
  lo decidiera.
- **Y un contador de Deudores en el sidebar** (pedido de Ignacio del mismo día,
  fuera de la lista): `Pendientes.deudores`, contado sobre **la misma lista de
  la pantalla** (`PagoService.deudores().size()`) para que cuando la Fase 6 le
  sume las preinscriptas, el número las traiga solo.

**Casos**: 8 en `InscripcionTest` (activar a mano → 409 con el texto del
trigger; cobrar la seña activa y saca el plazo; una deuda anotada no activa;
cancelar sin plata; no se pausa; no se vuelve; ocupa el lugar; no es vigente),
**15 en la suite SQL** (250–264), 3 en `InscripcionesPagina.test`, 1 más en
`BandejaTest` y 2 tocados en `Layout.test`. El DBML tiene la columna.

⚠️ **Una trampa de la suite SQL, atrapada por su propio guardián**: un `UPDATE`
no ve la fila que un CTE `INSERT … RETURNING` de la misma sentencia acaba de
insertar. El caso 263 escrito así pasó *"sin afectar filas"* y el guardián de
*"un ANDA afecta filas"* lo dijo. Son dos casos ahora.

#### ✅ Fase 6 · C4 + C5 — la seña de los programas y el alta desde el buzón (B1 · B2 1.1 · B2 1.2) — **reescrita por P72 y cerrada el 2026-09-12**

⚠️ **Lo tachado es lo que P72 cambió**: la plata de un programa **se calcula
desde la inscripción** (`precio_total − cobrado`, lo que el estado de cuenta ya
hace) y **no se anota como fila `DEBE`** — porque Deudores define *"vencida"*
como 7 días desde la fila más vieja, y el saldo de un programa no tiene fecha.

- **`AltaInscripcionRequest.sena` opcional**, el molde exacto de
  `AltaReservaRequest`: con seña nace `ACTIVA` y el pago `SENADO`; sin seña nace
  `PREINSCRIPTA` ~~con una deuda del 50% que vence en 24 hs~~ **con
  `vence_preinscripcion = ahora + 24 hs`** (`lajuanita.preinscripcion.vigencia`)
  y **ninguna fila de `pago`**.
- ~~**`PATCH /api/pagos/{id}/cobro` se extiende**~~ **Ya está**: registrar un
  `SENADO`/`PAGADO` sobre una preinscripta la activa (Fase 5). No se crea deuda
  del saldo: el saldo se lee.
- **Deudores gana una segunda fuente** (P72 · 3): además de las filas
  `DEBE`/`VENCIDO` de siempre, **las inscripciones con plata pendiente** —
  preinscriptas (*"sin señar"*, vencida cuando `vence_preinscripcion` pasó) y
  activas con `cobrado < precio_total` (*"seña abonada, falta el resto"*, nunca
  vencida). `Deudor` gana un `motivo`/etiqueta; el contador del sidebar las
  cuenta solo porque cuenta la lista.
- **La quinta regla del scheduler**: preinscripción vencida → alerta a
  administración, clave `PREINSCRIPCION_VENCIDA:i=<id>`, **no cancela** (P61).
  Sin `marcarVencidos` de por medio: no hay pago que marcar.
- **`POST /api/solicitantes/{id}/inscripcion`**, el molde de `/reserva`: cuenta
  si falta (los dos caminos de `darleCuenta`) + relación `alumno` si falta +
  inscripción preinscripta (precio y clases del catálogo, **nivel prellenado con
  `Experiencia.nivelSugerido()`**, profesor opcional) ~~+ deuda de la seña~~ +
  cierre de la ficha con `id_inscripcion` + notificación. **Una transacción**,
  por el argumento de §15 · Fase 3: lo que puede fallar es la inscripción (el
  índice único) y lo que quedaría es una cuenta con contraseña ya mostrada para
  alguien sin nada.
- Pantallas: el buzón gana *"Inscribirlo"* para `CURSO` (`SE_APARTA` deja de ser
  sólo de cabina), el formulario y el panel de resultado con el mensaje de P71 en
  sus dos variantes; `/admin/inscripciones` ~~muestra el estado y el
  vencimiento~~ (ya lo hace desde la Fase 5) **ofrece la seña en el alta**; la
  ficha del alumno y `Mis cursos` dicen *"Preinscripto · falta la seña"* en vez
  de dibujar un progreso de cero.

**Cerrado el 2026-09-12 (Fase 6), sin migración, tal como P72 lo reescribió.**
Lo que quedó hecho, en el orden del plan:

- **La seña en el alta** — `AltaInscripcionRequest.sena` opcional
  (`SenaDeInscripcionRequest`: sin pagador, es el alumno). Con seña nace
  ACTIVA con el pago SENADO en la misma transacción; **sin seña nace
  PREINSCRIPTA** con `vence = ahora + 24 hs` (`lajuanita.preinscripcion.horas`) y
  ninguna fila de `pago`; **en cero nace activa** (una beca no tiene qué señar).
  El alta devuelve `InscripcionCreada` (fila + `idPagoSena`), el molde de
  `ReservaCreada`, y la pantalla tiene la casilla *"La seña entró ahora"* con el
  50% prellenado — y dice al lado qué significa no marcarla. ⚠️ **Es un cambio
  de política**: toda alta sin seña es una preinscripción. Los tests que
  inscribían por la API y esperaban ACTIVA ganaron su seña (`SENA` en
  `InscripcionTest`, el helper de `AlumnoTest`).
- **Deudores con dos fuentes** (`MotivoDeDeuda`): las filas anotadas de siempre
  y **las inscripciones con plata pendiente, calculadas** —
  `InscripcionRepository.conPlataPosiblementePendiente` (ACTIVA + PREINSCRIPTA
  con precio; PAUSADA afuera, a propósito) contra `cobradoPorInscripcion` en la
  moneda del contrato, la misma cuenta que el estado de cuenta. *"Sin señar"*
  vence con `vence_preinscripcion`; *"Seña abonada, falta el resto"* **nunca**.
  La pantalla gana la columna *"Por qué"* y el contador del sidebar las trae
  solo. ⚠️ **El tablero NO cambió**: su *"deuda viva"* sigue leyendo sólo las
  filas anotadas (`TableroRepository.cobrosPendientes`). Anotado para la
  barrida siguiente — es una decisión de Módulo 8, no de ésta.
- **La quinta regla del scheduler**: `agregarPreinscripcionesVencidas`, clave
  `PREINSCRIPCION_VENCIDA:i=<id>`, a administración, **sin cancelar** (P61). Lee
  la misma lista que Deudores y la regla de deudas **filtra su propia fuente**
  — sin eso, una preinscripta vencida avisaba dos veces con dos claves.
  `TipoNotificacion.PREINSCRIPCION_VENCIDA` en Java y en el tipo TS.
- **`POST /api/solicitantes/{id}/inscripcion`** (`SolicitanteService.inscribir`):
  `darleCuenta` (los dos caminos) + `AlumnoService.altaDeLaRelacion` si falta +
  `InscripcionService.alta` sin seña + `atender(DeUnaInscripcion)` +
  notificación, **una transacción**. El nivel, si no viene, sale de
  `Experiencia.nivelSugerido()` — y `SolicitanteResumen` lo trae como
  `nivelSugerido` para que el formulario arranque de ahí sin copiar la tabla.
  Sólo fichas de CURSO (el espejo de *"desde el buzón no se aparta una clase"*).
  Devuelve `AlumnoInscripto` con la seña sugerida (50%) y el plazo.
- **Pantallas**: el buzón gana *"Inscribirlo"* (`InscribirForm`, todo prellenado
  y editable — P66) y el panel `InscripcionLista` con **el mensaje de P71 en su
  variante de programa** (`mensajeDeInscripcion`: seña y plazo primero, la clave
  después, el portal al final, más *"seguir el curso clase por clase y ver el
  material"*); `Mis cursos` y la ficha del alumno dicen *"Preinscripto · falta
  la seña"* en vez de un progreso en cero.

**Casos**: 4 + 7 en `InscripcionTest` y `SolicitanteTest` (alta con/sin seña,
en cero, dólares sin cotización; inscribir desde la ficha, el nivel de la
experiencia, `nivelSugerido`, quien ya era alumno, el choque, el alta rechazada
después de crear la cuenta, la cabina no se inscribe), 6 en `CajaTest` (las dos
fuentes), 4 en `AvisosTest` (la quinta regla y que no avise dos veces), 1 en
`BandejaTest`; en el front 2 en Inscripciones, 3 en Deudores, 2 en el buzón, 2
en `whatsapp.test`, 1 en Mis cursos, 1 en el perfil. **691 backend · 603 front ·
284 + 66 SQL.**

⚠️ **Cinco trampas de esta fase, y ninguna estaba en el plan:**

- **Un retorno temprano escondió la segunda fuente entera.** `deudores()` hacía
  `if (filas.isEmpty()) return List.of()` sobre las deudas anotadas, y la base
  de desarrollo no tiene ninguna — así que las preinscriptas no aparecieron en
  la primera corrida de los casos y **en producción, con el estudio al día,
  tampoco habrían aparecido nunca**. Cuando una lista pasa a tener dos fuentes,
  buscá el atajo de la primera.
- **`Inscripcion.fechaCreacion` era `insertable = false` sin `@Generated`**: la
  séptima vez de la trampa del `CLAUDE.md`, y la primera en esta entidad porque
  ningún DTO la exponía. Deudores la lee en la misma transacción que la creó.
- **Un test `@Transactional` no puede VER un rollback**: el `SELECT` posterior
  lee la misma transacción todavía abierta. Lo que sí puede afirmar es que
  quedó marcada — `TestTransaction.isFlaggedForRollback()` — que es exactamente
  *"cuenta y alta viven en una"*.
- **Un filtro de jsonPath devuelve una lista**: un `vence` en null aparece como
  `[null]`, no ausente. `contains((Object) null)`, no `doesNotExist()`.
- **Una fixture con mail nuevo hizo pasar el caso del choque por otra razón**:
  la cuenta creada era otra persona, sin inscripción abierta, y el 200 era
  legítimo. El choque real necesita la ficha con el mail de quien ya cursa.

**Qué queda afuera de las seis fases, a propósito**: B2 2.1 (grupos), P7, el
cupo, el candado duro del saldo, y la sala "Virtual". Todos anotados al final de
§22 con la condición que los reabre. **Y dos que esta fase dejó para la barrida
siguiente**: el precio de las reservas (P72: sin él no hay *"falta el resto"* de
una cabina) y la *"deuda viva"* del tablero, que no ve los saldos de programas.

---

### Lo que esta barrida ya enseñó, antes de ejecutar nada

- ⚠️ **"Es lo mismo que X" es una hipótesis, no un dato.** B1 llegó como *"la tenemos
  más fácil, es lo mismo que los servicios"* y no lo es: lo que hace barata a la
  prereserva es que **hay un `EXCLUDE` que ya ocupaba el hueco**, y un programa no tiene
  hueco. La analogía era de la pantalla, no del schema.
- ⚠️ **Un tipo de TypeScript no describe la columna: describe lo que alguien creyó de la
  columna.** A6 es exactamente eso —`cuando: string` sobre un `DATE` nullable— y es la
  enésima vez que este proyecto encuentra una regla que una capa afirma y otra desmiente.
  *Chequeá el schema, no la frase sobre el schema.*
- ⚠️ **Sin `ErrorBoundary`, todo bug de render se ve igual: negro.** Eso no sólo arruina
  el diagnóstico, **arruina el reporte**: Ignacio no podía decir más que *"se pone todo
  en negro"* porque no había más para ver. Una pantalla que explica el error convierte un
  reporte inservible en uno accionable.
- ⚠️ **Dos puntos de esta lista reabren decisiones que este proyecto ya tomó** —A8
  revierte el mensaje partido, B2 2.1 revierte P7— y en los dos casos **la decisión
  original tenía un buen argumento**. Que se reviertan no las invalida: las escribió
  alguien que no había usado el sistema todavía. **Lo que no se puede es revertirlas sin
  leerlas**, porque el argumento viejo suele señalar el modo de falla que la versión
  nueva tiene que evitar igual.

---

### ⚠️ DÓNDE RETOMAR (sesión del 2026-09-11) — Fases 0 a 3 cerradas en un día

**Se ejecutaron cuatro de las seis fases de la §16 en una sesión, en el orden del
plan, con nueve de los doce hallazgos cerrados y `V28` aplicada.** Cada fase tiene
su cierre escrito dentro del hallazgo que resolvió (buscar *"Cerrado el
2026-09-11"*), y el bloque final de este documento dice dónde se sigue. Lo que
conviene leer antes de la Fase 4 son las lecciones transversales del día, que
ninguna fase puede reclamar como propia:

- ⚠️ **El plan decía "lo cuenta el portal sobre los pedidos que ya tiene", y
  estaba mal** (A3). Una clase la mueve el alumno *o* el profesor, y cada uno
  habría visto 1 donde se movió dos veces. *"Movida N veces" es un hecho de la
  reserva, no de quien mira.* Un plan escrito antes de abrir el código es una
  hipótesis: se corrige cuando el código la desmiente, no se ejecuta igual.
- ⚠️ **Tres suites se pusieron rojas solas o casi, y las tres eran de la misma
  familia**: `MisReservasPagina.test` cayó por el almanaque (fixtures que decían
  "la próxima es el 07/09"); el caso del `ErrorBoundary` con un componente que
  "tira la primera vez" nunca llegaba al límite porque React reintenta el
  render antes de entregárselo; y `jsonPath` con filtro contestó *"expected 7
  but was 7"* dos veces en el día (A5 y C1). **Doce suites de pantallas que leen
  `hoy()` no lo fijan** y pueden repetir la primera cualquier día.
- ⚠️ **Hibernate escribe los INSERT antes que los UPDATE, otra vez** (A5): pausar
  una inscripción y crear la segunda en la misma transacción chocó contra el
  índice parcial. Es la trampa de `ReservaService`, en un test.
- **Resident Advisor contesta 403 a todo**, incluso a un slug inventado (A2). Lo
  que no se puede abrir no entra: los perfiles son de Wikipedia.
- **El tablero se cambió con medidas y sin verlo en el navegador** (A4). Si
  Ignacio lo ve raro en oscuro, `--serie-5/6` es lo primero.
- **"A confirmar" es un dato y no un hueco** (C1): `programa.precio` es NULL para
  la mentoría, no 0 — cero en este esquema es una beca.

**Para arrancar la próxima sesión**: `docker compose up -d` (Docker Desktop
suele estar apagado), `mvn spring-boot:run` **reiniciado** —el proceso viejo no
conoce `/api/solicitantes/{id}/inscripcion` ni `Pendientes.deudores`—,
`npm run dev:platform` desde la raíz. `V30` ya está aplicada en la base de
desarrollo. Todo commiteado, suites verdes, `tsc -b`, builds y linters limpios.

## 17. La QUINTA barrida de correcciones — abierta el 2026-09-12

> Ignacio la trajo el mismo día que cerró la §16, con la consigna de siempre:
> *"analizar las correcciones y armar un plan de fases antes de arrancar"*.
> **Nueve hallazgos**, todos de usar el circuito que la §16 acaba de construir
> —la preinscripción, la seña, el buzón que inscribe— más dos de la agenda.
> Ninguno cambia una política del negocio como pasó en §16; pero **uno es un
> bug de regla** (la moneda de la seña) y **otro es una ficha que no tiene
> salida** (la prereserva vencida), y los dos se verificaron contra la base de
> desarrollo antes de escribir una línea.

### ⚠️ DÓNDE RETOMAR (sesión del 2026-09-12)

✅ **ESTADO: CERRADA el 2026-09-12, el mismo día que se abrió — las tres
fases, nueve de nueve.** Las cuatro ⏳ se contestaron en el día (`platform.md`
§23, P73–P75) y H3 creció con P73 (72 hs para la cabina, cancelación
automática a las 3 semanas para los programas). Una migración, **`V31`,
aplicada**; la del admin sembrado pasa a **`V32`** (sexto corrimiento). Suites
al cierre: **699 backend · 617 front · 290 + 68 SQL** sobre 31 migraciones;
`tsc -b`, el build y el linter del panel limpios. **Lo que dejó para la
siguiente está al final de la sección.**

---

### El triage

| Grupo | Qué significa | Cuántos | Cuáles | Estado |
|---|---|---|---|---|
| 🟢 **A** | Pantalla, texto y estilo | **3** | H5 · H6 · H9 | ✅ Fase 1, 2026-09-12 |
| 🟡 **B** | Funcionalidad, sin tocar el schema | **5** | H1 · H2 · H3 · H7 · H8 | ✅ Fase 2, 2026-09-12 |
| 🔴 **C** | Toca una regla del negocio o el schema | **1** | H4 (`V31`) | ✅ Fase 3, 2026-09-12 |

⚠️ **Dos de los puntos son más grandes que como llegaron, y conviene saberlo
antes de estimar.** **H8** (*"un buscador arriba de las listas largas"*) no es
comodidad: los seis `<select>` de personas cargan **la página 0 del listado,
que son veinte filas** — con 36 cuentas en la base, dieciséis personas no
existen para el formulario de pagos, el de la seña de una reserva ni el de Mix
& Mastering, y nada avisa. **H4** (*"no salgo de Deudores"*) no es un bug de
pantalla: es que **`V30` y Deudores tienen dos definiciones de "la seña
entró"** — el trigger acepta un `SENADO` en cualquier moneda y Deudores cuenta
sólo lo cobrado en la moneda del contrato.

Y uno es **más chico**: **H9** (*"Duarte debía cinco cosas y me enteré de
una"*) — el backend ya devuelve todas y la pantalla ya las pinta todas, una
fila por deuda; lo que pasa es que las filas de una misma persona quedan
lejos entre sí porque la lista ordena por fuente y antigüedad, no por
persona. Es agruparlas, no buscarlas.

---

### Punto por punto — lo que se verificó en el código

#### 🟡 H1 · "Lo próximo" sin ventana — agenda del profesor, Mis reservas y el Inicio

**Verificado, y la §16 · A1 lo había dejado anotado**: *"lo que no da es el
'desde siempre' literal: si la próxima clase está a seis semanas, ninguna de
las dos la ve. Eso sería una consulta propia y pasa a grupo B."* Es este punto.

Hoy `proxima` se calcula **sobre la ventana que la pantalla pidió**
(`MiAgendaPagina.tsx:89`, `MisReservasPagina.tsx:101`, y el Inicio con
`misReservas(hoy, hoy + 28)` en `InicioPagina.tsx:72`). Y **no se arregla
agrandando la ventana**: el endpoint del alumno tiene techo de **62 días**
(`PortalService.MAXIMO_DE_DIAS`), el del profesor de 366. *"A 3000 días"* no se
puede ni pedir.

**Lo que se hace**: una consulta propia, *"mi próxima"*, sin ventana — la
primera reserva que ocupa su lugar (`OCUPAN_LA_SALA`) con fecha ≥ hoy, ordenada
por fecha y hora. **Dos caminos, los que ya existen**: para el alumno,
`ReservaRepository.deLaPersona` (participante o pagador, `V12`'s two paths);
para el profesor, por `id_profesor`. Endpoints `GET /api/me/proxima` y
`GET /api/me/profesor/proxima`, y **las tres pantallas leen de ahí** — la
agenda sigue mostrando sus cuatro semanas, pero el cuadro de arriba ya no
depende de ellas. El Inicio separa clase de alquiler (dos tarjetas), así que el
endpoint del alumno acepta `?esClase=`.

#### 🟡 H2 · El cuadro del profesor dice quiénes vienen, de qué nivel y por qué clase van

**Verificado.** `ReservaResumen.participantes` ya trae nombre, apellido,
`idInscripcion` y `disciplina` (`ParticipanteResumen`), pero **ni el nivel ni el
número de clase**. `AlumnoDelProfesor.cursos[]` trae el nivel y las clases que
quedan, pero no cuál es *esta*.

**"Por qué clase van" es un ordinal dentro de la inscripción**: cuántas
participaciones de esa inscripción hay con fecha y hora ≤ la de esta clase,
contadas **con la misma definición que `contarClasesConsumidas`** (no
canceladas, en reservas que ocupan su lugar) — si se contara distinto, el
cuadro diría "clase 3" y el contador de clases restantes diría otra cosa. Se
calcula en el backend, en la respuesta de H1 (`ProximaClase`: por cada alumno,
nombre, nivel, *"clase 3 de 8"*), y `Proxima` gana un renglón por alumno. No se
mete en `ParticipanteResumen` — ahí lo pagarían las 28×N filas del calendario
para un dato que sólo pide el cuadro.

#### 🟡 H3 · El portal del alumno no muestra la seña pendiente en "Lo que debo"

**Verificado.** La tarjeta del Inicio lee `cuenta.saldos` (`InicioPagina.tsx:167`),
y `saldos` se arma **sólo con filas de `pago`** en estado `DEBE`/`VENCIDO`
(`PagoService.estadoDeCuenta`). Desde P72 la seña **no es una fila de pago**: es
`precio_total − cobrado` sobre la inscripción. Así que un preinscripto ve
*"Estás al día"* mientras Deudores lo lista como *"sin señar"* — dos pantallas
diciendo lo contrario de la misma persona.

**Lo que se hace**: **la misma cuenta que alimenta Deudores, acotada a la
persona.** `PagoService.inscripcionesConPlataPendiente` se parte en una función
que recibe las inscripciones a mirar, y `EstadoDeCuenta` gana `pendientes[]`
(motivo, disciplina, importe, plazo) — el DTO compartido entre el estado de
cuenta de administración y el del portal, así que **las dos lo ven igual**. La
tarjeta lista *"Seña de Producción · $220.000 · hasta el 13/09 12:41"* y
*"Resto de DJ · $85.000"*, y sólo si no hay nada dice *"Estás al día"*.

⏳ → ✅ **P73 — y la respuesta cambió la pregunta.** Se preguntó qué pasa a las
24 horas con la tarjeta, e Ignacio contestó con los plazos: **la cabina se
cancela sola a las 72 hs** (era 24; `lajuanita.prereserva.horas`, P44 intacto),
**el programa lo cancela Mica** (P61 intacto) **y a las tres semanas del alta se
cancela solo** (`lajuanita.preinscripcion.cancelacion-dias`, default 21 — la
**sexta regla del scheduler**, `PREINSCRIPTA → CANCELADA` por la escalera de
`V30`, con aviso `PREINSCRIPCION_CANCELADA:i=<id>`). La tarjeta: la seña sigue
visible entre las 24 hs y las tres semanas, marcada *"venció el 13/09 — hablá
con el estudio"*, y desaparece con la cancelación. **Esto suma trabajo a H3**:
el número de la cabina y sus tres textos, y la regla nueva del scheduler.

#### 🔴 H4 · "Abono el resto y no salgo de Deudores" — la seña en otra moneda

**Verificado con los datos, y no es intermitente: es la moneda.** La
inscripción de Lawson Ignacio (`ignaciolawson0@gmail.com`) en Mentoría es la
**13231: $200 ARS**. Sus tres pagos: **USD 100** (SENADO, la seña), **$100 ARS**
(PAGADO), **USD 100** (PAGADO). Deudores cuenta *"sólo lo cobrado en la moneda
del contrato"* (`contratosDe`, `inscripcionesConPlataPendiente`, la regla de
§2.3 — el sistema nunca convierte), así que cobrado = $100 de $200 y el saldo
es **$100 ARS**. Con Perez Urbizu anduvo porque los tres movimientos fueron en
pesos. Ignacio pensó la mentoría en dólares (*"ponele que sale 200usd"*) y la
inscripción nació en pesos: el catálogo (`programa.moneda`) dice ARS y el alta
lo copia.

**Pero el bug de fondo no es ése — es que el sistema se contradice a sí
mismo.** `V30` §4 (c) activa la preinscripta con *un pago SENADO/PAGADO detrás*
**sin mirar la moneda**, y `PagoService.registrar:306` la pasa a `ACTIVA` con
la misma condición. Así que **la seña en USD activó una inscripción cuyo
cobrado en su moneda era cero**: el estado dice "señada" y la aritmética dice
"sin señar". Dos definiciones de un hecho — el patrón de `V12` (*"un conjunto
escrito por lo que excluye parece el mismo que el escrito por lo que incluye, y
no lo es"*), ahora entre el estado y la cuenta.

⏳ **Pregunta — ¿un pago sobre una inscripción tiene que ser en la moneda del
contrato?** Las dos salidas: **(a) prohibirlo** — un pago con `id_inscripcion`
lleva la moneda de la inscripción, y el formulario la fija al elegir el curso
(no se elige); o **(b) convertir** con la `cotizacionDolar` que el pago en USD
ya carga. La (b) rompe §2.3 (*"un número que no corresponde a ninguna caja
real"*) y todo lo que se apoya en ella. **Lectura adoptada: (a), como regla de
la base** — un trigger sobre `pago` (`V31`), porque la regla que hoy falla es
la de `V30` y una regla de la base sólo se cierra desde la base; el servicio la
repite para el mensaje y `ManejadorDeErrores` la traduce. Si alguien paga en
pesos un programa en dólares, **el contrato se carga en pesos**, al cambio del
día, y el sistema sigue sin convertir nada.

**Lo que hace `V31` además de la regla**: un `NOTICE` con las filas existentes
que la violan (hay al menos tres: 7154, 7158, 7159), sin tocarlas — `V21` y
`V23` no inventaron respaldo y esto no inventa cobros. **Y el dato de Ignacio
se arregla sin migración**: editar la inscripción 13231 a USD (el formulario de
edición ya lo permite) deja cobrado USD 200 de 200, y sale de Deudores sola.

**Lo que se aprende**: `V30` se escribió mirando *que hubiera plata* (`V10`'s
shape) y Deudores mirando *cuánta*; ninguno estaba mal solo. **Cuando dos
capas responden la misma pregunta con dos consultas, probarlas con una moneda
distinta es la prueba barata que las separa.**

#### 🟢 H5 · El buzón pierde tres botones — "Escribirle", "Crearle la cuenta", "Ya se lo cargué"

**Verificado.** *"Escribirle"* vive en `Telefono` (`SolicitantesPagina.tsx:1354`,
§15 · Fase 1); *"Crearle la cuenta"* y *"Ya se lo cargué"* en la fila de
acciones (`:403`, `:417`). Los dos últimos existían porque cuando se escribieron
**no había camino de un click para curso ni para equipos** (el propio comentario
lo dice: *"Para curso y equipos todavía no existe ese camino"*); la §16 lo
construyó para curso.

⚠️ **Para EQUIPOS no lo construyó, y ahí "Ya se lo cargué" es la única forma de
cerrar la ficha**: la venta se carga en `/admin/ventas` y la ficha se cierra
eligiéndola. Sin ese botón, una consulta de equipos sólo se puede descartar —
y descartar una ficha que produjo una venta es mentir en el historial (la
CHECK `solicitante_atendido_produjo_algo` distingue las dos cosas a propósito).

⏳ **Pregunta**: ¿*"Ya se lo cargué"* se va del todo, o se queda **sólo donde
no hay gemelo de un click** (EQUIPOS, y CURSO/CABINA si el catálogo o las salas
no cargaron)? **Lectura adoptada: se queda sólo ahí**, como botón secundario.
La alternativa completa —*"Venderle"*, el tercer gemelo, venta + ficha cerrada
en un movimiento— es un punto de grupo B para otra barrida; se anota.

*"Escribirle"* se va sin condición: el WhatsApp con el mensaje entero ya está
en el bloque de resultado. *"Crearle la cuenta"* se va **de la fila de
acciones** — la cuenta la crea el alta — pero ⚠️ **no puede desaparecer del
todo mientras exista "Ya se lo cargué"**: el panel de cerrar busca los
candidatos por `id_usuario` y a una ficha sin cuenta le dice *"creale la cuenta
primero"* (`:1240`) — sin el botón, eso es una instrucción sin cómo. Pasa a
vivir **adentro de ese panel**, sólo en esa rama.

#### 🟢 H6 · El resultado de "Preinscribir" aparece donde estaba el formulario

**Verificado.** Los tres bloques de resultado (`CabinaLista`, `InscripcionLista`,
`CuentaLista`) se pintan **arriba de la lista** (`SolicitantesPagina.tsx:292-310`);
el formulario está adentro de la tarjeta, que con veinte fichas queda a una
pantalla de distancia. Se aprieta *"Preinscribir"*, la tarjeta se cierra y el
mensaje con la seña, el plazo y la contraseña quedó arriba sin que nada lo diga.

⚠️ **Y hay una razón por la que estaba arriba**: al inscribir, la ficha pasa a
`ATENDIDO`, la lista se recarga y **la tarjeta desaparece del filtro por
defecto** — no hay "en el lugar del formulario" donde dejarlo. **Lo que se
hace**: el resultado **reemplaza al formulario adentro de la tarjeta**, y la
recarga se difiere hasta que se cierra el resultado (*"Listo"*). Aplica a los
dos que quedan (cabina e inscripción; `CuentaLista` se va con H5).

#### 🟡 H7 · Las fichas que se vencieron sin señar no tienen salida

**Verificado, y es peor que "se acumulan": están trabadas.** Una ficha con la
cabina apartada cuya prereserva venció queda `ATENDIDO` con `reserva.estado =
CANCELADA`. `FichaAbierta` la cuenta como **abierta** (P56: *"necesita una
decisión: apartar de nuevo, o descartar"*), la pantalla le pone *"Se venció sin
señar"*… **y no le ofrece ningún botón**, porque las acciones se dibujan sólo
con `estado === 'PENDIENTE'` (`:358`). Y aunque se ofreciera, **el trigger
`solicitante_resuelto_es_final` (`V13` §4) rechaza cualquier UPDATE sobre una
ficha resuelta**: ni descartarla ni apartarle de nuevo. Las fichas 699 y 700 de
la base de desarrollo están así hoy. P56 pidió una decisión y no
dejó cómo tomarla.

⚠️ **La preinscripción NO tiene este problema, y es asimetría a propósito**: la
inscripción cierra la ficha en el acto (`FichaAbierta` sólo mira `s.reserva`),
y la preinscripta vencida vive en Deudores como *"sin señar · venció"* hasta que
Mica cobra o cancela (P61). Lo que Ignacio ve acumularse son cabinas.

**Dos salidas**, y son sus dos opciones textuales:
- **(a) "descartalos solos"** — `FichaAbierta` deja de contar la prereserva
  `CANCELADA` como abierta. La ficha queda en *"Ya atendidas"* con la etiqueta
  gris *"Se venció sin señar"*: historia intacta, nadie tiene que hacer nada, y
  quien quiera volver manda el formulario de nuevo (que es lo que el trigger
  dice en su propio mensaje: *"se pide de nuevo"*). El aviso de prereserva
  vencida (P57) ya le avisó a administración. **Sin migración; reabre P56.**
- **(b) "dejales el botón de descartar"** — `V31` afloja el trigger para
  `ATENDIDO → DESCARTADO` sólo cuando lo producido murió, y aparece el botón.
  Una migración más, un click más por ficha, y el descarte pide un motivo que
  en el 100% de los casos va a decir *"se venció"*.

**Lectura adoptada: (a).** Es grupo B. Se documenta en `platform.md` como P73
porque cambia lo que P56 decidió.

#### 🟡 H8 · Las listas de personas son buscadores — y hoy muestran veinte

**Verificado, y es un bug que nadie reportó porque no falla.** Seis `<select>`
cargan `pagina: 0` y se quedan con `contenido`: alumnos y personas en Pagos
(`PagosPagina.tsx:892`, `:932`), alumnos del participante y personas de la
seña en el calendario (`CalendarioPagina.tsx:623`, `:949`), cliente y pagador
en Mix & Mastering (`MixMasteringPagina.tsx:328`, `:859`). El listado pagina de
a **veinte** (`Pagina.TAMANIO_POR_DEFECTO`). La base tiene 36 cuentas y 14
alumnos: **hoy dieciséis personas no se pueden elegir como pagador**, y el día
que haya ochenta alumnos serán sesenta. `BuscadorDePersonas` lo describe en su
propia cabecera como el modo de falla que existe para evitar: *"mostraría los
primeros veinte y diría que el resto no existe."*

**Lo que se hace**: los seis pasan a los buscadores que ya existen —
`BuscadorDePersonas` para cuentas (§14 · B2) y `SelectorDeAlumno`, que hoy es
privado de `InscripcionesPagina`, **sale a `componentes/`** para los tres de
alumnos. Buscan contra el servidor, que es lo que pagina. Los de profesores y
salas no cambian: están acotados por la nómina, no por el negocio.

#### 🟢 H9 · Deudores, agrupado por persona

**Verificado, y la lista ya trae todo**: el endpoint devuelve una fila por deuda
anotada (persona × moneda) más una por inscripción con saldo, y la pantalla las
pinta todas — Benítez Sofía aparece hoy dos veces, con DJ y con Mentoría. Lo
que Ignacio vio es el **orden**: las anotadas primero por antigüedad, después
los programas por fecha de alta, así que las deudas de una persona quedan
separadas por diez filas de otros. Se paga una, la de al lado desaparece, y la
otra —que siempre estuvo— parece recién llegada.

**Lo que se hace**: **una fila por persona**, con todo lo que debe adentro
(cada deuda con su motivo, importe y plazo) y un total por moneda; la persona
se ordena por su deuda más vieja. El encabezado dice *"5 personas · 8
deudas"*. El contador del sidebar (`Pendientes.deudores`) sigue contando deudas,
que es lo que hay que ir a cobrar. Sin backend.

---

### Las cuatro preguntas — con la lectura adoptada

**Contestadas el mismo día — `platform.md` §23, P73–P75.**

| # | Pregunta | Respuesta |
|---|---|---|
| H3 | A las 24 hs, ¿la seña pendiente sigue en "Lo que debo" o desaparece? | **P73**: cabina 72 hs y se cancela sola; programa lo cancela Mica y a las 3 semanas solo; la tarjeta la muestra *vencida* hasta entonces |
| H4 | ¿Un pago sobre una inscripción va en la moneda del contrato (`V31`), o se convierte? | **P74**: se prohíbe, regla de la base |
| H5 | *"Ya se lo cargué"*: ¿se va del todo, o queda sólo donde no hay botón de un click? | **P75**: queda sólo ahí; *"Crearle la cuenta"* vive adentro del panel de cerrar |
| H7 | Las cabinas vencidas sin señar: ¿dejan de estar abiertas solas o ganan *Descartar* (`V31`)? | **P75**: solas — reabre P56 |

---

### El plan por fases

**Tres fases, A → B → C.** Cada fase termina con las seis verificaciones en
verde (`mvn test`, `pruebas-sql.sh`, vitest, `tsc -b`, los dos builds, los dos
linters) y **cada punto se cierra por separado**.

⚠️ **Una migración, `V31`, y la del admin sembrado se corre por SEXTA vez**: ya
no es `V31`. Va a ser `V32`. No la anotes con número.

#### ✅ Fase 1 · Grupo A — H5 · H6 · H9 — cerrada el 2026-09-12

- **H5** — se van *"Escribirle"* y *"Crearle la cuenta"*; *"Ya se lo cargué"*
  queda sólo donde no hay gemelo de un click (⏳). Los casos que buscaban los
  tres botones se reescriben.
- **H6** — el resultado reemplaza al formulario **adentro de la tarjeta** y la
  recarga espera al *"Listo"*. Caso nuevo: después de preinscribir, la tarjeta
  sigue en pantalla con la seña, el plazo y la clave; al cerrar, se va.
- **H9** — `DeudoresPagina` agrupa por persona (id de usuario, o nombre para el
  externo): una fila, sus deudas adentro, total por moneda, ordenada por la más
  vieja. Encabezado *"N personas · M deudas"*. Los casos que contaban filas
  cuentan personas o deudas según lo que afirman.

#### ✅ Fase 2 · Grupo B — H1 + H2 · H3 · H7 · H8 — cerrada el 2026-09-12

- **H1 + H2, juntos** porque es un endpoint: `GET /api/me/proxima[?esClase=]` y
  `GET /api/me/profesor/proxima`, sin ventana, la primera reserva que ocupa su
  lugar desde hoy. La del profesor viene con sus alumnos: nombre, nivel y
  *"clase N de M"* (N con la definición de `contarClasesConsumidas`; M es
  `clasesContratadas`). Mi agenda, Mis reservas y las tres tarjetas del Inicio
  leen de ahí; `Proxima` gana el renglón por alumno. Casos en pares (PortalTest
  / DocenciaTest): la mía y la del vecino, y una a 90 días que la ventana no ve.
- **H3** — `EstadoDeCuenta.pendientes[]` desde la función que alimenta Deudores,
  acotada a la persona; la tarjeta del Inicio y `DetalleDeCuenta` la listan,
  la vencida marcada. **Más P73**: `lajuanita.prereserva.horas` a 72 con sus
  tres textos, y la sexta regla del scheduler —la preinscripta con más de
  `cancelacion-dias` (21) desde el alta pasa a `CANCELADA` y avisa— con su
  caso en `AvisoTest` y la clave por hecho.
- **H7** — `FichaAbierta` deja de contar la prereserva `CANCELADA` (P75). Las
  fichas 699 y 700 salen solas. El caso que pineaba
  *"vencida sigue abierta"* se invierte, y uno nuevo pinea que el contador y la
  lista siguen de acuerdo.
- **H8** — `SelectorDeAlumno` sale a `componentes/`; los seis `<select>` pasan a
  los buscadores. **Caso que pone el bug de vuelta**: una persona en la página 2
  del listado tiene que ser elegible.

#### ✅ Fase 3 · Grupo C — H4 (`V31`) — cerrada el 2026-09-12

- **`V31__el_pago_de_un_programa_va_en_su_moneda.sql`**: trigger `BEFORE INSERT
  OR UPDATE` sobre `pago` — con `id_inscripcion`, `moneda` = la de la
  inscripción; mensaje propio para `ManejadorDeErrores`. `NOTICE` con las filas
  existentes que no cumplen, sin tocarlas. Caso 'FALLA' con `probar_mensaje` en
  las dos suites, y uno 'ANDA' con la moneda correcta.
- `PagoService.registrar` lo verifica antes (el 409 con el texto de la regla) y
  **el formulario de Pagos fija la moneda al elegir el curso**; el de la seña
  del alta ya la manda igual que la inscripción.
- Deudores y el estado de cuenta muestran *"cobrado en otra moneda: USD 200"*
  en las filas viejas que lo tengan, para que la 13231 y las como ella se
  entiendan hasta que se corrijan.
- **La 13231 se corrige a mano**: editar la inscripción a USD. No es migración.

---

### Lo que decidió al ejecutarse, y no estaba en el plan

- **H6 — el resultado en la tarjeta obligó a diferir la recarga.** Apartar e
  inscribir cierran la ficha en el servidor, y la lista se recargaba en el
  mismo `await`: la tarjeta desaparecía del filtro por defecto con el resultado
  adentro. Ahora **el "Listo" es lo que recarga**; los bloques de arriba quedan
  sólo de respaldo, para cuando la ficha ya no está en la lista (se cambió de
  filtro o de página con el resultado abierto). Un caso pinea que después de
  preinscribir `listarSolicitantes` se llamó una sola vez.
- **H5 — "Crearle la cuenta" no pudo irse del todo.** El panel de "Ya se lo
  cargué" busca candidatos por `id_usuario` y a una ficha sin cuenta le decía
  *"creale la cuenta primero"*: sin el botón era una instrucción sin cómo.
  Vive adentro de esa rama, y el panel vuelve a buscar candidatos cuando la
  ficha gana la cuenta (`ficha.idUsuario` en las dependencias del efecto).
- **H1 + H2 — "todavía no terminó" mira el reloj, no sólo el día.** La clase
  de hoy a las 10, a las 15 ya pasó; el front comparaba fechas. El reloj entra
  por parámetro a los dos servicios para poder ponerlo en la prueba (la lección
  de `CajaPagina`, del lado del servidor). Y el número de clase se cuenta con
  la definición de `contarClasesConsumidas` cortada por fecha y hora
  (`ReservaParticipanteRepository.numeroDeClase`), no con otra.
- **H3 — "Lo que debo" es literalmente Deudores acotado a la persona.**
  `PagoService.deudores(Long idUsuario)` es la misma función con un filtro
  (`null` = todos), y `EstadoDeCuenta.pendientes` la llama. `saldos` sigue
  siendo historia por moneda (P46: el estado de cuenta muestra lo que ya no se
  cobra); la tarjeta del Inicio dejó de leerlo.
- **P73 — la sexta regla del scheduler va en su propio método**, como el
  vencimiento de las prereservas: cambia estado, y una excepción escribiendo
  avisos no puede impedir que se cancele ni al revés. Corre a las 8:05, después
  de la corrida de avisos, para que la alerta de la quinta regla llegue antes
  que el final. Sin firma: la inscripción no tiene autor de cambio de estado.
- **H7 — el caso nuevo cancela la reserva por SQL y necesita `em.clear()`.**
  La primera lectura (`?abiertas=true`) ve el UPDATE porque es JPQL contra la
  base; la segunda (`?estado=ATENDIDO`) traía la entidad de la sesión y decía
  `PRECONFIRMADA`. Es la misma trampa de las entidades en sesión que `V21`
  encontró del otro lado.
- **H8 — eran SIETE `<select>`, no seis, y dos más de otra familia.** El
  séptimo era el comprador y el vendedor de Ventas (`listarUsuarios({ pagina:
  0 })`, dos controles en un formulario). Y **quedan dos de la misma forma que
  NO son de personas**: *"qué trabajo salda"* y *"qué venta salda"* en Pagos
  cargan `listarTrabajos`/`listarVentas` página 0 — un trabajo o una venta más
  vieja que veinte no se puede saldar desde ahí. Necesitan una búsqueda por
  texto que esos endpoints no tienen; queda anotado para la siguiente.
- **V31 — cuatro casos de las suites SQL pagaban en USD un contrato en pesos**
  (34, 35, C04, C05: la cotización del dólar). Con el trigger, dos habrían
  pasado por el motivo equivocado —el trigger rechaza antes que el CHECK— y uno
  habría ido a FALLA. Se movieron a una reserva, donde no hay contrato que
  mirar. Y **tres casos Java hacían lo mismo** (`PagoTest`, `CajaTest` ×2): los
  dos que afirmaban *"en otra moneda no cancela"* ahora fabrican la fila legada
  **apagando el trigger un instante** (el precedente del caso 225), porque es lo
  que la base de producción va a tener el día que corra la migración.
- **V31 — el estado de cuenta dice lo cobrado en la otra moneda**
  (`ContratoDelAlumno.cobradoEnOtraMoneda`): desde la regla sólo puede ser una
  fila anterior a ella, y sin decirlo un contrato "sin seña" al lado de tres
  pagos que entraron no se entiende. La 13231 es exactamente eso.

### Lo que esta barrida deja para la siguiente

- **Los dos `<select>` de Pagos que no son de personas** (trabajo y venta que
  salda un pago): página 0, veinte filas. Piden búsqueda por texto en
  `listarTrabajos` y `listarVentas`.
- **"Venderle" desde el buzón** — el tercer gemelo de un click (venta + ficha
  cerrada). Hasta que exista, EQUIPOS cierra por "Ya se lo cargué" (P75).
- **La inscripción 13231 de la base de desarrollo**: editarla a USD desde
  Inscripciones y sale sola de Deudores. No es código.
- ⚠️ **El backend de desarrollo que estaba levantado durante la barrida es
  anterior a todo esto**: sin reiniciarlo, `/api/me/proxima` contesta *"No
  static resource"* y Mi agenda, Mis reservas y el Inicio se rompen.

### Lo que esta barrida ya enseñó, antes de ejecutar nada

- **Una regla escrita mirando *que haya* no es la misma que la escrita mirando
  *cuánto*.** `V30` preguntó si había un pago; Deudores cuánto había en la
  moneda del contrato. Ninguna estaba mal sola, y juntas dejaron una
  inscripción activa con cobrado cero. **Probar con la otra moneda** es la
  prueba de un minuto que las separa, y no se hizo.
- **Una decisión que pide "una decisión" tiene que dejar el botón.** P56 dijo
  que la cabina vencida *"necesita una decisión: apartar de nuevo, o
  descartar"* y el trigger de `V13` §4 impide las dos. Se cerró la definición
  de "abierta" y no se probó la salida. Un caso que afirme *"de esta ficha se
  sale"* la hubiera encontrado el mismo día.
- **`pagina: 0` sin paginar es un listado que miente a los veintiuno.**
  Seis veces en tres pantallas, ninguna con error. El componente que lo evita
  existía desde §14 con la advertencia escrita en su cabecera.

---

## ⚠️ DÓNDE RETOMAR (la §17 cerrada, 2026-09-12 — arrastra el estado de la §16)

✅ **LA QUINTA BARRIDA (§17) ESTÁ CERRADA: nueve de nueve el 2026-09-12, el
mismo día que se abrió** — Fase 1 (A: H5 · H6 · H9), Fase 2 (B: H1+H2 · H3 ·
H7 · H8) y Fase 3 (C: H4). Las decisiones son `platform.md` §23, P73–P75.
**`V31` es la última migración, aplicada**; la próxima libre es `V32` y **el
admin sembrado pasa a `V32`** (sexto corrimiento). Suites: **699 backend · 617
front · 290 + 68 SQL** sobre 31 migraciones. Lo que dejó para la siguiente
está al final de la §17: los dos `<select>` de Pagos que no son de personas,
"Venderle" desde el buzón, y la 13231 a mano. ✅ **El circuito completo se
reinició el mismo 2026-09-12** (Postgres, backend, landing en :3000, plataforma
en :5173) — `/api/me/proxima` ya contesta `200`. La próxima sesión arranca con
todo levantado y validado; si se cerró la terminal, es el único paso que falta.
Lo que sigue abajo es el estado en que la §16 dejó todo, y sigue siendo cierto
salvo los números de las suites y de la migración.

✅ **LA CUARTA BARRIDA (§16) ESTÁ CERRADA: once de doce el 2026-09-12** — las
Fases 0 a 4 el 2026-09-11, la 5 y la 6 el 2026-09-12; el doceavo (B2 2.1, grupos
de a 3) quedó **diferido por decisión de Ignacio** a la barrida siguiente. Las
decisiones son `requirements/platform.md` §22, P59–P72. **No queda ninguna fase
por ejecutar.** ⚠️ En git, el commit `8fa22c7 "Fase 6"` contiene la Fase 5; la
Fase 6 es el commit siguiente.

**Lo primero al volver: leer la §16 y la §22 antes de tocar nada.** Cada hallazgo
dice qué se verificó y en qué archivo; cada decisión dice qué se adopta y por qué.
El diagnóstico y las decisiones no hay que rehacerlos.

**El orden, y por qué:**

| Fase | Qué | Migración |
|---|---|---|
| ✅ 0 | **A6** — el bug de la pantalla en negro + el `ErrorBoundary` que no existe · **cerrada el 2026-09-11** | — |
| ✅ 1 | **A1 · A2 · A4 · A8** — la agenda a 4 semanas, los perfiles de los DJs, la paleta del tablero, el mensaje único · **cerrada el 2026-09-11** | — |
| ✅ 2 | **A3 · A5 · A7** — el contador de movidas, el total por disciplina, la mentoría en la landing · **cerrada el 2026-09-11** | — |
| ✅ 3 | **C1** — el catálogo de programas, cierra P13 · **cerrada el 2026-09-11** | `V28` ✅ aplicada |
| ✅ 4 | **C2** — la ficha guarda programa, experiencia y modalidad · **cerrada el 2026-09-11** | `V29` ✅ aplicada |
| ✅ 5 | **C3** — la preinscripción: estado, vencimiento, índice, escalera · **cerrada el 2026-09-12**, con P72 decidida antes | `V30` ✅ aplicada |
| ✅ 6 | **C4 + C5** — la seña de los programas (B1) y el alta completa desde el buzón (B2 1.1 · 1.2) · **cerrada el 2026-09-12** | — |

**No hay próxima fase: la §16 cerró.** Lo que sigue es lo de siempre entre
barridas — Ignacio usa el sistema y trae hallazgos — y la lista de lo que esta
barrida dejó anotado para la siguiente: **los grupos de a 3** (B2 2.1, que
reabre P7), **el precio de las reservas** (P72: la mitad de P13 que falta), y
**la "deuda viva" del tablero**, que no ve los saldos de programas. ⚠️ **`V30`
es la última migración**; la próxima libre es `V31`, y **el admin sembrado
sigue siendo `V31`** — por primera vez en cinco corrimientos, el número no se
movió en una sesión. ⚠️ La ficha **#808** ya NO sigue en el buzón: una prueba
en caliente contra el backend levantado (pensada para otra cosa, un 403) la
inscribió de verdad — quedó **ATENDIDO**, con la inscripción **13228**
(PRODUCCION, $440.000, PREINSCRIPTA, vence 13/09 14:50) y una cuenta nueva
(`prueba.v29@ejemplo.local`). Es el circuito de *"Inscribirlo"* de punta a
punta, ya hecho, y sirve igual de prueba: registrale la seña en Pagos y mirala
activarse sola, o cancelala desde el `<select>` de Inscripciones si se prefiere
la base limpia. ⚠️ Y de la Fase 3 queda una cosa para la landing: **la mentoría dice "precio a confirmar"
y `llms.txt` lo lista PENDIENTE** — ahora que existe `/admin/programas`, lo que
falta es que Mica cargue el número, no código. ⚠️ Desde la Fase 0 el
sistema tiene `LimiteDeError`: **si una pantalla tira, ahora se ve el path y el
mensaje en un `<pre>`** — pedirle eso a Ignacio cuando reporte algo, en vez de
*"se pone en negro"*. ⚠️ Y de la Fase 1: **el tablero se cambió con medidas y sin
mirarlo en el navegador** — si Ignacio lo ve raro en oscuro, `--serie-5/6`.

⚠️ **La migración del admin sembrado se corre por QUINTA vez: ya no es `V28`,
va a ser `V31`.** Sigue sin anotarse con número en ningún lado. (Al 2026-09-12:
`V31` es la próxima libre y la Fase 6 no trae migración, así que **sigue `V31`**
salvo que aparezca otra.)

⚠️ **De las cinco ⏳ de §22, tres se cerraron el 2026-09-12 con P72** — P59 (24 hs
confirmadas · saldo visible, sin fecha, y en Deudores) y P61 (avisa, no cancela).
Quedan P63 (mentoría por sesión), P64 (nivel prellenado — ejecutada en `V29`) y
P67 (virtual se carga en sala — ejecutada en `V29`), con su lectura adoptada.

⚠️ **B2 2.1 (grupos de a 3) sigue diferido** a la barrida siguiente, con su
análisis en la §16 y lo que va a reabrir (P7, el cupo) anotado al final de §22.

---

**El estado del producto**: las §15 y §16 están cerradas, suites en **691
backend · 603 front · 284 + 66 SQL** sobre **30 migraciones**, `tsc -b`, los dos
builds y los dos linters limpios (los cuarenta y dos casos nuevos del front, los
cuarenta y cinco del backend y los veintiocho de SQL son de las Fases 0 a 6). La
landing genera **20 páginas** desde A7. **Vuelve a ser cierto que no queda
producto por construir** — hasta la próxima barrida. Lo que sigue abierto en todo el proyecto está en
`docs/pendientes.md`:

1. ~~**La §17**~~ — cerrada el 2026-09-12, el mismo día. Lo que dejó: los dos `<select>` de Pagos (trabajo/venta) a página 0, "Venderle" desde el buzón, la 13231 a mano. (Y lo de la §16 sigue: grupos de a 3, el precio de las reservas, la deuda viva del tablero.)
2. **Desactivar el admin sembrado**, ahora `V32`.
3. **El deploy de octubre**, que espera la decisión de hosting.

⚠️ **Y una cosa que la §15 dejó anotada y la §16 agrava** (`platform.md` §21 ·
P57): el aviso de prereserva vencida le llega a **todos** los ADMIN y STAFF
(`ReservaService.avisarQueSeVencio` recorre `activosConRol`). La Fase 6 suma a
esas mismas bandejas el aviso de preinscripción vencida (P61). Es el modo de
falla que `AvisoService` documenta en su propia cabecera. No se tocó, y es **lo
primero a mirar si el buzón empieza a hacer ruido**.
