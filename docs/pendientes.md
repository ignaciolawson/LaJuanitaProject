# Lo que queda abierto

> **Abierto el 2026-08-20, al cerrar el Módulo 7.** Es el inventario de todo lo
> pendiente del proyecto en un solo lugar: hasta hoy estaba repartido en cinco
> documentos, y eso ya costó una vez —el informe de auditoría pasó un día listando
> como *"bloqueado por una decisión"* diez hallazgos que ya estaban decididos, solo
> porque la sección que los contestaba no estaba enlazada desde ningún lado.
>
> **Este archivo no reemplaza a los otros: los indexa.** Cada punto dice dónde vive
> el detalle. Si algo se cierra, se tacha acá **y** se corrige donde vive.
>
> **⚠️ Al 2026-08-20 el MVP está completo y se abrió una etapa nueva.** Lo que viene
> no es construir módulos sino mejorar por uso: Ignacio testea y vuelve con una lista.
> Eso vive en [`mejoras.md`](mejoras.md), que además fija **el triage con el que esa
> lista se va a ordenar** — acordado antes de tenerla, a propósito. Los puntos 3.1 y
> 3.2 de acá son los primeros que entran ahí.
>
> **⚠️ Al 2026-08-29 la etapa de mejoras ya está en marcha y produjo su primera
> migración.** `mejoras.md` §9 tiene **las decisiones cerradas** y §10 **el plan de
> fases**, que es lo que gobierna qué se hace ahora. Estado: **Fase 1 cerrada
> (`V19`), Fase 2 con 3 de 4 hechos** — el buzón de solicitantes cerró el mismo
> 2026-08-29 (`V20`, §9.10). Los hallazgos 1, 4, 5, 6 y **la mitad del 7** de su
> §8 están construidos; del 7 falta conectar los formularios de la landing, que
> es trabajo de esa otra app contra un endpoint que ya existe.
>
> **Orden de autoridad, para cuando dos documentos se contradigan:**
> `mejoras.md` §9 y §10 (lo más nuevo, y lo que decide qué se hace) ·
> después `platform.md` §13 → §14 → §15 (gana el último) · después
> `sistema-gestion-plan.md` §6d · después el resto.

---

## 🔴 1. Lo que bloquea la entrega

Eran cuatro. **Al 2026-08-20 quedan dos**: ese día se cerraron el Módulo 8 —el MVP
está completo, ocho de ocho— y el ensayo de restore. Lo que sigue abierto no es
construcción: es **el deploy (1.3), que espera la decisión de hosting de octubre, y
desactivar el admin sembrado (1.4)**, que se hace junto con él.

### 1.1 · ~~El Módulo 8 — Dashboard de dirección~~ — **CERRADO el 2026-08-20**

**El MVP está completo: ocho de ocho módulos.**

`/admin/tablero`, paquete `com.lajuanita.backend.tablero`, sin migración —el tablero
solo lee—. Los ocho indicadores, el drill-down a cada módulo con el período puesto, y
la exportación a Excel y PDF con su cabecera de trazabilidad. El detalle está en
`platform.md` §11.

Las dos cosas que quedaban abiertas adentro se cerraron al construirlo:

- **El denominador de la retención** quedó como la lectura por defecto que §15
  anticipaba: los que contrataron hace más de 10 meses. ⚠️ **Y construirlo encontró una
  segunda trampa que no estaba anotada y es peor**: las clases de un curso no son
  servicios contratados. Una inscripción de DJ son ocho reservas; contarlas daría que
  todo alumno queda retenido a la semana de empezar y la tasa daría casi 100% — un
  número que nadie discutiría porque suena bien.
- **La exportación entró completa**, con las dos librerías elegidas al planificar como
  §15 pedía: **Apache POI** y **OpenPDF**. OpenPDF y no iText porque iText 7 es AGPL, que
  para una entrega comercial obliga a publicar el sistema entero o a comprar licencia.

> **Ya no hace falta el plan B de octubre.** Este documento decía que la exportación era
> lo único diferible de todo el proyecto si el calendario apretaba. Entró, así que esa
> carta queda sin usar.

### 1.2 · ~~El ensayo de restore quedó incompleto~~ — **CERRADO el 2026-08-20**

**`docs/operacion.md` §1 y §2.** Se rehizo entero, con las dos piezas, y pasó.

Lo que probó, que es más de lo que probaba el del 2026-08-14: el catálogo vuelve
igual (25 tablas, 163 constraints, 33 triggers, 65 índices, 18 migraciones), **el
PDF del contrato volvió byte a byte** —mismo `sha256`—, cada fila encontró su
archivo y cada archivo su fila, y **cinco reglas rechazaron con su propio
mensaje** sobre la base restaurada, incluidas las dos que el Módulo 7 agregó: no
se publica un release sin contrato, y no se saca el contrato que respalda uno
publicado. El cierre fue levantar la aplicación real contra la base restaurada
**y los archivos restaurados** y bajar el contrato por la API: 200, 1.621.643
bytes, idéntico.

> **Y quedó probado el modo de falla al revés**, que es el que justificaba la
> urgencia: con la fila intacta y el archivo ausente la API contesta *"No está el
> archivo pedido."* — o sea que **el sistema solo se entera cuando alguien lo
> pide**. Una base restaurada sin los archivos arranca perfecta y no se queja de
> nada hasta el día que alguien abre un contrato.

**Lo que queda de esto no es trabajo, es cadencia**: reensayar cuando haya datos
reales (después de migrar el Notion) y después una vez por cuatrimestre. Un tar
de 120 KB y uno de varios GB no fallan por las mismas razones.

### 1.3 · El deploy

**`docs/operacion.md` §3 — la única sección incompleta del documento, a propósito.**
Espera la decisión de hosting de **octubre**.

Lo que ya está decidido: VPS con Docker Compose, los tres servicios en la misma
red interna, y un compose distinto del de desarrollo.

**Lo que el Módulo 7 le agregó y no estaba:** hace falta **disco persistente**. Un
contenedor efímero se lleva los contratos en el primer reinicio y la base sigue
diciendo que están.

**Y lo que falla si te olvidás** (la tabla completa está en §3 y en el README):

| Si te olvidás de… | Qué pasa |
|---|---|
| `JWT_SECRET` nuevo + sacar `permitir-secreto-de-desarrollo` | **No arranca.** Falla cerrado a propósito |
| `DB_PASSWORD` | Arranca perfecto con la contraseña pública. **No avisa nada** |
| Sacar `ports: 5432:5432` | La base queda publicada al mundo |
| `LAJUANITA_ARCHIVOS_DIR` alineado con `lajuanita.archivos.raiz` | El backup respalda una carpeta vacía. Avisa, pero hay que leer el log |
| `server.forward-headers-strategy` | `RegistroDeEventos` loguea la IP del proxy y no la real. **Todos los eventos de seguridad quedan con la misma IP** |

### 1.4 · Desactivar el admin sembrado por `V3`

`admin@lajuanita.local` / `lajuanita2026` es una credencial **de desarrollo,
commiteada**, y está agendada para desactivarse **en una migración nueva antes del
deploy real**. No se edita `V3` (Flyway le guarda el checksum): va una migración nueva — **`V21`+, porque `V19` ya se usó** para los pagos sin cuenta y **`V20`** para el buzón de solicitantes.

---

## 🟡 2. La landing, que espera al sistema

**Decidido el 2026-08-10: la landing no publica antes que la plataforma.** Los
formularios contestan *"listo"* sin que el pedido llegue a nadie, así que publicar
temprano es perder leads reales. **No hay parche intermedio** (ni relay de mail ni
servicio de formularios de terceros): se conectan al backend cuando el sistema esté.

Lo que hay que hacer antes de publicar, y **ninguno depende de código**:

| Qué | Dónde | Por qué importa |
|---|---|---|
| **Conectar los formularios** | `components/forms/Fields.tsx` y `LoginForm.tsx` | Son los dos `onSubmit`. Hoy no mandan nada. ⚠️ **Ya tienen a dónde ir**: `POST /api/solicitantes` existe desde el 2026-08-29 (`mejoras.md` §9.10 tiene el contrato). Ojo que obliga a **partir "Nombre y apellido" en dos campos** y a hacer el teléfono obligatorio |
| ⚠️ **Los precios inventados** | `data/services.ts` | Son **números sobre los que un cliente decide**. Es el ítem de más riesgo de toda la landing |
| ⚠️ **P34 — la duración de los cursos no coincide** | landing vs. relevamiento | Landing: DJ 6 meses / 2 clases semanales. Confirmado: DJ 8 clases, 1 por semana. **Alguno de los dos está mal** |
| ⚠️ **Mix & Mastering aparece como programa de 3 meses** | landing | **No existe como programa** (P31): es un servicio. Lo inventó la landing |
| **Los 6 posts del blog son inventados y están firmados con los nombres reales de los profesores** | `data/posts.ts` | Hay que reescribirlos o borrarlos antes de publicar |
| **Sacar `hola@lajuanitastudio.com` del JSON-LD** | `data/business.ts` (SEO-02) | **Esa dirección no existe**, la inventó el modelo. En JSON-LD se publica como hecho verificado |
| **Instagram y YouTube reales** | `data/business.ts` | Son los dos únicos campos que siguen en `null`. El resto del `LocalBusiness` ya se puede publicar entero (§13) |
| **El resto de la copia larga** | tabla en el `CLAUDE.md` de la landing | File-by-file de lo que falta validar con el cliente |

---

## 🟢 3. Deuda técnica conocida, ordenada por lo que cuesta ignorarla

### 3.1 · Los cinco retoques de §6f

**`sistema-gestion-plan.md` §6f. Decidido el 2026-08-20: van DESPUÉS de los ocho
módulos, de a uno.** No se hacen mientras se espera nada.

> ⚠️ **Y los ocho módulos están, desde el 2026-08-20.** O sea que esta lista dejó de
> estar esperando. **Pero no se hace sola: entra en la lista del testeo**
> ([`mejoras.md`](mejoras.md)), porque hacer estos cinco antes de saber el resto es
> arreglar pantallas que después se rehacen.
>
> **⚠️ Al 2026-08-29 quedan TRES vivas de las cinco, y solo UNA para construir**
> (`mejoras.md` §5): la #2 fue descartada por Ignacio, la #4 (cotización del dólar)
> quedó pospuesta hasta que se decida qué cotización, y la #5 se dio de baja entera
> —ni filtrar ni avisar— con el argumento de que **quien pide no puede saber si está
> ocupado** y el EXCLUDE al aprobar ya es la autoridad. La #1 se convirtió en trabajo
> de diseño. **Queda solo la #3, solicitar reprogramación.**
>
> **Y una corrección que `mejoras.md` §5 detalla: dos de las cinco NO son retoques.**
> *Solicitar reprogramación* es una pantalla y un endpoint que el Módulo 4 se debe, y
> *cotización del dólar* es una integración nueva con una pregunta de negocio adentro
> (¿oficial, blue o MEP?). Anotadas como "retoques" parecen más baratas de lo que son.

1. **El admin no debería cambiarse el nombre ni el mail** → el mail ya no lo cambia
   nadie; sobre el nombre, la pregunta es si la regla es del rol o de la cuenta de
   `V3` — y si es de esa cuenta, el arreglo ya existe (1.4).
2. **Que el rol ADMIN no use los servicios** → **como MENÚ, no como permiso.** Es
   la recomendación más importante de la lista: como permiso rompe la separación
   de los dos ejes. Es un cambio en `menu.ts` y en ningún otro lado.
3. **Solicitar reprogramación** → es una pantalla que el Módulo 4 se debe. La tabla
   existe desde `V1` y hasta tiene su trigger; falta el endpoint y la pantalla.
4. **Cotización del dólar por API** → **solo como prellenado**, nunca fuente de
   verdad, nunca tocando filas viejas. Y una pregunta que es del negocio: **¿qué
   cotización — oficial, blue o MEP?**
5. **No poder pedir un horario ya tomado** → la maquinaria ya está. **Avisar, no
   bloquear**, y es un pre-chequeo, nunca la autoridad.

### 3.2 · El rediseño del front entero

**En una sola pasada, al final, con los ocho módulos cerrados.** Es afordable
**solo porque las reglas de negocio viven en la base y no en las pantallas**: un
rediseño no puede romper que una reserva necesite seña. La landing no se toca.

> ⚠️ **No arranca con media lista** (2026-08-20). Un rediseño hecho dos veces es el
> caro. Espera a que el testeo cierre — con fecha de corte, porque una lista sin corte
> crece para siempre. Ver [`mejoras.md`](mejoras.md) §6.
>
> **Y hay una distinción que sostener mientras se junta la lista: "aburrido" y "poco
> intuitivo" no son el mismo problema.** Lo primero es una pasada de diseño; lo segundo
> puede destapar funcionalidad faltante, y mezclados hacen que la pasada de diseño se
> coma meses sin resolver el segundo.

### 3.3 · La descarga de comprobantes (Módulo 3)

Abierta desde agosto. **Ya no está bloqueada**: el `StorageService` existe desde el
Módulo 7. Pasó de ser infraestructura a ser trabajo de pantalla.

### 3.4 · Dos copias de una misma definición

Este proyecto tiene **dos**, y las dos están anotadas donde viven:

- **`contarClasesConsumidas` (Java) vs `V9` §5 (SQL)** — qué cuenta como clase
  consumida. Si se separan, la pantalla dice que quedan tres clases y la base
  rechaza la siguiente.
- **`ContratoRepository.queRespaldanAlRelease` vs `release_tiene_contrato()`** —
  qué respalda a un release. **Esta es acotada a propósito**: la de la base
  *decide* y la de Java solo *muestra*. Si se separan, la pantalla lista un
  contrato de menos y la publicación sigue siendo imposible sin respaldo.

### 3.5 · Cosas chicas de la base, para cuando algo toque esas tablas

- **`trabajo_liberacion_justificada` acepta un motivo de un solo espacio.** Es
  anterior a la lección de `V7` (un CHECK que evalúa a NULL no rechaza nada, y
  `btrim(x) <> ''` sobre NULL da NULL). `V18` lo escribió bien para el sello.
  **Se corrige cuando una migración toque `trabajo_mastering`.**
- **DB-08 — seis nombres distintos para la fecha de creación.** El acordado para lo
  nuevo es `fecha_creacion`. No vale una migración de renombre por sí sola; si otra
  migración toca una de esas tablas, se renombra ahí.
- **`alumno` y `profesor` no tienen fecha de creación**, y es un hueco real: nada
  registra cuándo se creó la relación. ⚠️ **No usar `alumno.fecha_ingreso`** para
  taparlo — es un `DATE` del negocio, editable, y contesta otra pregunta.
- **El relleno del código de release** (`LJ01` vs `LJ020`): el alcance escribe tres
  dígitos y la ratificación dos. Cosmético — la columna acepta los dos porque los
  viejos se cargan a mano; lo único que decide es cómo se ve el próximo generado.
- **Archivos huérfanos.** Si una transacción se cae después de escribir el archivo,
  `ContratoService` lo borra; si ese borrado también falla, queda el huérfano —
  **el error barato de los dos, a propósito**. No hay tarea de limpieza y no urge.

### 3.6 · Seguridad: lo que se sabe y se aceptó

- **Un token robado no se puede revocar** antes de que venza (8 horas). La solución
  es una lista de revocados, **no bajar el vencimiento a minutos**.
- **El registro dice si un email ya está tomado.** Es un trade-off documentado en
  `DatoDuplicadoException`: lo que se filtra es *"esta dirección tiene cuenta en un
  estudio de música en Pilar"*, y la alternativa deja colgado a quien se registró
  hace meses y se olvidó.

---

## ⚪ 4. Decisiones que siguen sin contestar

**Ninguna traba nada hoy.** Están en el índice de `platform.md` §12 y se contestan
cuando el módulo correspondiente las necesite.

| # | Qué | De qué módulo |
|---|---|---|
| P4 | Alumnos informales de Ghezz | 1 |
| P5 | Nivelación dentro del sistema | 1 |
| P7 | Generación automática de clases semanales | 2 — *el documento lo recomendó y Ignacio lo rechazó; se cargan a mano* |
| P8 | Quién autoriza reservar con deuda | 2 |
| P9 | ¿El profesor puede pedir mover su clase? | 2 |
| **P13** | **¿Lista de precios en el sistema?** | 3 — **la más consecuente de las que quedan**: ver abajo |
| P17 | Alcance real de la autogestión | 4 |
| P19 | Acceso del alumno inactivo | 4 |
| P20 | Liquidación automática a profesores | 5 — *el M5 entregó el insumo y no la respuesta: contar clases no es calcular un total* |
| P21 | Seguimiento de mentorías | 5 |
| P35 | "Práctica libre" como uso de sala gratuito | 2 |
| P36 | ¿Entran eventos / clases abiertas / showcases? | Alcance — *por defecto **fuera**, pero un evento ocupa una sala* |
| P37 | ¿Una clase exige profesor asignado? | 2 — *interpretación **abierta a propósito**: no se exige* |

> **P13 es la que arrastra algo concreto.** La seña es el **50% del total** y hoy
> eso **es verificable sobre una inscripción y no sobre una reserva**:
> `inscripcion.precio_total` existe, `reserva` **no tiene precio** — el de un
> alquiler sale de horas × una tarifa que no está en el sistema. Por eso la base
> exige *que exista un pago*, no *que sea la mitad*, y **la pantalla sostiene el
> 50% hasta que `reserva` tenga precio**.

---

## 🔵 5. Fuera de alcance, y por qué vale tenerlo escrito

- **WhatsApp Business API.** Excluida del alcance comercial inicial **a propósito**,
  y marcada como **el fast-follow de mayor valor después de la entrega**: ataca el
  dolor N.º 1 del cliente (contestar a mano por WhatsApp turnos y pagos).
  **Los tres avisos automáticos ya construidos son exactamente lo que tendría para
  mandar** — el disparador ya decide *qué hecho, a quién y una sola vez*, que es la
  parte que haría falta igual.
- **Integraciones con plataformas de música** (Spotify, SoundCloud) para el
  seguimiento post-lanzamiento. Descartado explícitamente en la misma frase en que
  se confirmó que la sección entra cargada a mano (P25).
- **El CMS de la landing.** El blog está construido para migrar: los cuerpos de los
  posts son arrays de bloques tipados —la forma del Portable Text de Sanity— así
  que migrar es reemplazar `data/posts.ts` por un fetch, no reescribir las páginas.
  ⚠️ `generateStaticParams` va a necesitar revalidación.
