# Preguntas abiertas — Módulos 7 y 8

*Preparadas el 2026-08-19, al cerrar el Módulo 6. Para mandarle a Ghezz (y a
Micaela lo que sea de administración) antes de empezar el Módulo 7.*

> **Por qué existe este archivo.** Con el Módulo 6 pasó algo que conviene repetir:
> **se contestaron sus tres preguntas antes de escribir una línea** y el módulo no
> se trabó nunca. También pasó algo que conviene no repetir: esas preguntas se
> redactaron en una conversación y no quedaron en ningún archivo, así que la
> respuesta hubo que volver a explicarla al documentarla. Acá quedan la pregunta y,
> abajo, el lugar donde va la respuesta.
>
> **Las respuestas se escriben en `docs/requirements/platform.md` §14** (o en una
> §15 nueva si son muchas), que es donde vive la autoridad sobre las decisiones.
> Este archivo guarda la pregunta, no la decisión.

---

## Cómo leerlas

**Tres traban el Módulo 7 y una traba el 8.** El resto son ratificaciones baratas:
el esquema ya apostó por una respuesta y confirmarlas ahora no cuesta nada, mientras
que descubrir que estaban mal dentro de dos meses cuesta una migración sobre tablas
que ya tienen datos.

**La primera no está en el índice de pendientes y es la más cara**: la descubrí
mirando el esquema al preparar esto.

---

> ## ✅ LAS CUATRO ROJAS ESTÁN CONTESTADAS — 2026-08-20
>
> Ignacio las contestó las cuatro de una sola vez, antes de escribir una línea del
> Módulo 7. **Las respuestas, con su razonamiento y sus consecuencias, están en
> [`docs/requirements/platform.md` §15](../requirements/platform.md)**, que es la
> sección que gana. En resumen:
>
> | | Respuesta |
> |---|---|
> | **Contrato del sello (P38)** | **Archivo, se sube.** El M7 construye el `StorageService` — y hay que sumarle los archivos al backup |
> | **P24 — login de artistas** | **No entran.** Todo administrativo; el módulo es la mitad de grande |
> | **P25 — post-lanzamiento** | **Entra, cargado a mano** ("dónde sonó", ordenable por popularidad). **Cero integraciones** |
> | **P26 — retención** | Segundo servicio dentro de **10 meses**; venta de equipos no cuenta; pausar y volver no es retención |
>
> **Y las cuatro ratificaciones también se contestaron el mismo día.** Las dos que
> podían obligar a una migración quedaron resueltas antes de arrancar, que era el
> punto:
>
> | | Respuesta |
> |---|---|
> | **5 — código de release** | Lo genera el sistema (`LJ01`, `LJ02`…) **y se cargan los viejos** → el correlativo arranca por encima del más alto, y el código se puede escribir a mano |
> | **6 — ¿un release se puede caer?** | **Sí.** Es una migración del Módulo 7: `CANCELADO` fuera de la escalera, igual que en M&M |
> | **7 — el aviso previo** | ⏳ **Sin cerrar: la pregunta estaba mal hecha.** Ver abajo |
> | **8 — exportar** | **PDF y Excel, con vara alta**: filtros de la pantalla + cabecera de trazabilidad |
>
> ### ⏳ La única que queda, y hay que repreguntarla mejor
>
> La 7 se preguntó en abstracto —*"¿te sirve verlo cuando entrás?"*— y la respuesta
> *"esperá a que le llegue, cuando sale ahí va en el sistema"* se puede leer de las
> dos formas que la pregunta quería separar. **Con un ejemplo concreto en vez de en
> abstracto:**
>
> > *"El lunes a la mañana falta una semana para un lanzamiento. Dos formas de que te
> > enteres: (a) entrás al sistema y ahí está el aviso esperándote, o (b) te llega
> > algo al celular sin que entres — un mail o un WhatsApp. La (a) ya está hecha. La
> > (b) es construir un envío que hoy el sistema no tiene. ¿Con la (a) te alcanza?"*
>
> **No traba el Módulo 7**: el aviso adentro del sistema ya se escribe solo, y es el
> sustrato de las dos respuestas.
>
> El texto original de las cuatro queda abajo sin tocar: sirve para ver qué se
> preguntó y por qué, que es lo que hace falta la próxima vez.

---

## 🔴 1 · El contrato del sello, ¿es un archivo o un link? *(no tiene número: es nueva)*

**Por qué traba:** la regla dura del Módulo 7 es *"no se publica un release sin
contrato adjunto"*, y `contrato_sello.archivo_path` es **`VARCHAR(500) NOT NULL`**.
La columna se llama *path*, no *url*: el esquema asumió desde `V1` que el PDF **se
sube al sistema**.

Si es así, **el Módulo 7 es el que finalmente obliga a construir el
`StorageService` de §2.4** — la pieza que el Módulo 5 esquivó mandando el material
por link y que el 6 esquivó por decisión del cliente (P23). Y acá el argumento para
esquivarla otra vez es mucho más débil: **un contrato es el documento que respalda
legalmente un lanzamiento**, y un link al Drive de otro se puede caer, mover o
revocar sin que el estudio se entere.

> **Para preguntar así:**
> *"Los contratos con los artistas, ¿los tenés vos en PDF y querés subirlos al
> sistema, o los guardás en un Drive y alcanza con que el sistema tenga el link?
> Te pregunto porque el sistema va a bloquear la publicación de un release que no
> tenga contrato, y si es un link, el día que ese link se caiga el sistema va a
> decir que está todo bien igual."*

**Qué cambia cada respuesta:**

| | |
|---|---|
| **Se sube el archivo** | Hay que construir el `StorageService` (subida, almacenamiento, descarga autenticada) **antes** del resto del módulo. Suma trabajo real y entra en la decisión de hosting de octubre — los PDF pesan poco, así que no rompe el presupuesto. |
| **Alcanza el link** | Migración chica para relajar la columna, y el módulo entra sin infraestructura de archivos. Pero la regla dura pasa a ser *"hay un link cargado"*, que es más débil de lo que el documento promete. |

---

## 🔴 2 · P24 — ¿Los artistas entran al sistema?

`artista.id_usuario` existe y es nullable: *"los artistas hoy no tienen login, queda
preparado a futuro"*. El alcance dice que **profesores y alumnos no tienen acceso al
sello**, y de los artistas no dice nada.

> **Para preguntar así:**
> *"Los artistas del sello, ¿tienen que poder entrar al sistema a ver cómo viene su
> release, o eso se lo contás vos por WhatsApp como ahora?"*

**Qué cambia:** si entran, el Módulo 7 necesita un portal propio —con la misma
decisión de identidad del portal del alumno— y hay que definir qué ven de su
release. Si no entran, `artista` es una ficha que administra el estudio y el módulo
es la mitad de grande. **La respuesta esperada es que no**, y con confirmarlo alcanza.

---

## 🔴 3 · P25 — ¿El seguimiento post-lanzamiento entra al sistema?

Hoy Ghezz busca a mano si algún DJ tocó los temas: revisa sets, radios, playlists.

> **Para preguntar así:**
> *"Cuando sale un release, vos después buscás a mano si alguien lo tocó —sets,
> radios—. ¿Querés que eso quede anotado en el sistema (una lista de 'dónde sonó',
> cargada a mano), o lo dejamos afuera por ahora?"*

**Qué cambia:** anotarlo a mano es una tabla y una pantalla chicas, y se puede hacer
dentro del módulo. **Lo que no entra de ninguna manera es buscarlo automáticamente**
—eso son integraciones con plataformas que no están en el alcance— y conviene
decirlo en la misma frase para que la respuesta no signifique dos cosas distintas.

---

## 🔴 4 · P26 — ¿Cómo se define la tasa de retención?

Es el único indicador del Módulo 8 que **no se calcula solo**: todos los demás salen
de datos que ya existen.

> **Para preguntar así:**
> *"En el tablero de dirección querías una 'tasa de retención'. Necesito que me
> digas qué contás como alumno retenido: ¿el que arrancó un segundo curso después de
> terminar el primero? ¿En qué plazo — tres meses, seis? ¿El que pausa y vuelve
> cuenta como retenido o como perdido?"*

**Qué cambia:** con la definición, el indicador es una consulta. Sin ella, **no se
puede construir**, y es la única parte del Módulo 8 en esa situación. No conviene
inventarla: es un número que la dirección va a mirar para tomar decisiones.

---

## 🟡 Las ratificaciones baratas (Módulo 7)

Todas tienen ya una respuesta asumida en el esquema. Confirmarlas es un minuto.

**5 · El código de release.** El alcance dice *"ID único y correlativo, LJ020…"*.
Tres preguntas en una:

> *"El código de cada release, ¿lo genera el sistema solo o lo escribís vos? Si lo
> genera solo, ¿desde qué número arranca — el próximo sería LJ020? Y los releases
> que ya salieron, ¿los cargamos al sistema o arrancamos desde el próximo?"*

Importa porque **si se cargan los anteriores, el correlativo tiene que empezar más
abajo** y hay que poder escribir el código a mano para los viejos.

**6 · Los estados del release.** `a confirmar → confirmado → en distribución →
publicado`, y **solo avanzan** (ya hay un trigger en `V1`).

> *"¿Un release puede caerse después de confirmado? Hoy el sistema no tiene un
> estado 'cancelado' para releases —sí para los trabajos de M&M— y si pasa, no
> habría cómo anotarlo."*

Es el mismo agujero que M&M no tiene porque `CANCELADO` sí existe ahí. Si la
respuesta es que sí puede caerse, **es una migración y se hace dentro del módulo**,
no después.

**7 · El aviso 7 días antes del lanzamiento.** Lo pide el alcance del Módulo 7.

> *"El aviso de 'falta una semana para el lanzamiento', ¿te sirve verlo cuando
> entrás al sistema, o esperás que te llegue por algún lado?"*

Importa porque **es el tercer módulo que pide un aviso automático** —el 4 lo pide
para la deuda a 7 días, el 6 para la entrega impaga— y ninguno se construyó. Si los
tres alcanzan con verse adentro del sistema, es una consulta. Si tienen que
*llegar*, hay que construir el scheduler, y entonces conviene hacerlo una sola vez
para los tres.

---

## 🟡 Y una del Módulo 8, que no es del cliente sino de alcance

**8 · Exportar a PDF y Excel.** El alcance lo pide. Es una dependencia nueva (una
librería de generación) y bastante trabajo para un tablero que se mira en pantalla.

**No es una pregunta para Ghezz, es una para vos**: si el tablero se mira adentro
del sistema, la exportación puede quedar para después de diciembre sin que el módulo
deje de servir. Conviene decidirlo antes de empezarlo y no a mitad de camino.

---

## Dónde se escriben las respuestas

1. La decisión, con su razonamiento, en **`docs/requirements/platform.md` §14** —
   la sección que gana sobre todo lo demás.
2. El pendiente correspondiente, tachado en la tabla de **§12**.
3. Si toca el esquema (la 1 y la 6 pueden), **la migración se hace dentro del
   módulo**: es el triage de §6f, y las migraciones son inmutables.
