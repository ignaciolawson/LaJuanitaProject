# Plataforma de gestión — requisitos funcionales

> **Fuentes.** `docs/propuesta/entrega-final-acumulativa.pdf` (relevamiento + propuesta
> técnica + propuesta comercial, entregado y firmado con el cliente) y
> `docs/relevamiento/transcripcion-entrevista-2026-04-17.pdf`. Las decisiones técnicas
> y el calendario viven en `docs/sistema-gestion-plan.md`.
>
> **La propuesta es contractual.** Lo que promete se entrega. Cuando este documento se
> aparta de ella, lo dice explícitamente y explica por qué.
>
> **Cómo leerlo:**
> - **✅** — confirmado por el relevamiento o la propuesta. No se discute, se construye.
> - **❓Pn** — decisión pendiente. Necesita respuesta de Ignacio o del cliente.
> - **⚠️** — contradicción o hueco detectado entre documentos.
>
> Estado de ESTE DOCUMENTO al 2026-08-11: los 8 módulos descritos, profundidad alta
> en 1–3 (septiembre/octubre), trazo grueso en 6–8 (se detallan en octubre).
>
> Estado del CÓDIGO: no está acá. Vive en `docs/sistema-gestion-plan.md` §6d, que es
> el único lugar donde se lleva la cuenta de qué está construido.

---

## 1. Hechos del negocio (confirmados) ✅

Datos duros del relevamiento. Todo el resto del documento se apoya en esto.

| | |
|---|---|
| **Sedes** | Solo Pilar (Office Park). ⚠️ El relevamiento anuncia Córdoba, pero **Ignacio lo dio de baja el 2026-08-11** ("ya fue Córdoba"). El sistema es de una sola ubicación y **no modela sede**. |
| **Espacios** | ⚠️ **Corregido por Ignacio el 2026-08-11 — el relevamiento está mal en este punto.** No son "Sala 1, Sala 2 y Sala de Producción". Son **Sala 1, Sala 2 y Cabina de grabación**, y el uso es mucho más flexible de lo que dice el PDF. Ver la matriz en §2.6. |
| **Equipo** | 10 a 20 personas. Micaela (administración, cuello de botella actual), Ghezz (director de profesores/producción, M&M, sello), Malena (community manager), profesores de DJ y producción, dirección (Chapa & Castelo, familia Oppel, Bautista Najles). |
| **Curso de DJ** | 2 meses · 8 clases · 1h30 · una vez por semana. |
| **Curso de Producción** | 4 meses · misma frecuencia semanal (⇒ 16 clases). |
| **Mentorías** | Servicio independiente, precio distinto, sin estructura fija de contenido, puede dictarla cualquier profesor. **Es donde más seguimiento hace falta.** |
| **Recorrido formativo** | DJ inicial → niveles → DJ avanzado → producción → mentorías. **Puede durar un año o más** e involucrar varios profesores. |
| **Niveles** | Inicial / Intermedio / Avanzado. Se asignan con preguntas de nivelación ("¿usaste Ableton?", "¿tus temas suenan profesionales?"). Poner un avanzado en un curso inicial "es una mala experiencia para él y para nosotros". |
| **Medios de pago** | Transferencia en ARS · efectivo en ARS o USD · PayPal (exterior) · cuenta en EE.UU. administrada por un socio (exterior). |
| **Regla de cobro** | **Sin pago o seña no hay reserva.** "Si no hay seña, el horario queda libre." El saldo se abona antes de empezar a cursar. |
| **Excepción a esa regla** | **Mix & Mastering sí puede quedar en debe.** Ghezz entrega primero y cobra después ("básicamente estoy fiando el servicio"). |
| **Descuentos** | Se aplican a ex alumnos. |
| **Monedas** | ARS y USD, con cotización registrada al momento del pago. Cajas separadas. |
| **Egresos** | Pagos a profesores y otros. Hoy en el mismo Excel. |
| **M&M — revisiones** | 2 o 3 incluidas en el precio. A partir de ahí se cobra extra ("si no, el cliente pide cambios infinitos por cuestiones subjetivas"). |
| **M&M — clientes** | Mayormente externos al estudio, no alumnos. Llegan por contactos, boca en boca, referidos. |
| **M&M — potencial** | 5–6 trabajos por día, USD 200–300 diarios por sala, costo casi nulo. |
| **Sello — catálogo** | IDs correlativos propios: LJ020, LJ021, LJ022… |
| **Sello — proceso** | Recepción de demos → curaduría → contrato → distribución internacional → promoción (envío a DJs) → seguimiento en sets y radios. |
| **Venta de equipos** | Acuerdo con Pioneer (AlphaTheta). **Sin stock propio** — se vende contra el stock de Pioneer. Proceso ad hoc, no frecuente. Muchos alumnos compran después del curso inicial. |
| **Líneas de negocio (Ghezz, textual)** | Mix y mastering · cursos de DJ · cursos de producción · mentorías · alquiler de cabina · venta de equipos · **grabación**. ⚠️ *"Grabación" no aparece en ninguno de los 8 módulos ni entre los `tipo_uso` de reserva, pero la landing la vende como servicio ("grabación de set"). Ver ❓P27.* |
| **Notificaciones** | **Internas al sistema.** WhatsApp e Instagram quedan explícitamente fuera del alcance (propuesta, "Prestaciones No Incluidas"). |
| **Acceso móvil** | Navegador responsivo. **No** hay app nativa (fuera de alcance). |

---

## 2. Reglas transversales

Aplican a todos los módulos. Si un módulo contradice esto, gana esta sección.

### 2.1 Identidad y roles

`usuario` es la identidad de login única. `alumno` y `profesor` son relaciones que
cuelgan de `usuario`, no lo reemplazan (ver `docs/sistema-gestion-plan.md` §3.2).

**Cualquiera se crea su cuenta** (P18, resuelto el 2026-08-12), sea alumno o no:
para ver tus reservas necesitás una. Administración también puede crearla, con
contraseña temporal. Tener cuenta **no** te hace alumno — eso es una fila en
`alumno` que agrega administración al inscribirte.

**⚠️ Corrección al plan del 2026-08-10: vuelven a ser cuatro roles, no tres.**
El plan había colapsado los permisos en `ADMIN` / `STAFF` / `USUARIO`.

**El argumento que cierra el caso es el Módulo 8**, que distingue: *"Solo directivos y
socios tienen acceso al dashboard completo. Micaela puede ver el resumen financiero
básico."* Eso es una diferencia real de permisos entre dos personas que administran, no
un matiz — y sin un cuarto valor no se puede expresar.

**La propuesta comercial también promete "cuatro roles diferenciados: administrador,
directivo, profesor y alumno", pero ojo: no son estos cuatro.** Lo que coincide es el
número, no el conjunto. `profesor` y `alumno` **no son roles acá**: se implementan como
relaciones (una fila en `profesor` o en `alumno`), por el motivo que explica el párrafo de
arriba — quien alquila una cabina una vez no es ninguna de las dos cosas y necesita
cuenta igual. Y `STAFF`, que es el rol operativo del día a día, la propuesta no lo nombra.
**Lo que la propuesta compromete —cuatro niveles de acceso diferenciados— se cumple**; la
enumeración literal no se puede mapear uno a uno, y citarla como si fuera equivalente es
un argumento más débil que el del Módulo 8. Queda:

| Rol | Quién | Puede |
|---|---|---|
| `ADMIN` | Ignacio, dirección técnica | Todo, incluida la administración de usuarios y roles |
| `DIRECTIVO` | Chapa & Castelo, familia Oppel, Najles | **Lee todo** (dashboard completo, cualquier alumno, catálogo del sello). **No escribe nada.** |
| `STAFF` | Micaela, Ghezz | Opera: alumnos, reservas, pagos, M&M, sello. Ve el resumen financiero **básico**, no el dashboard ejecutivo completo |
| `USUARIO` | Alumnos, clientes ocasionales, profesores | Solo lo propio |

Los profesores son `USUARIO` **con fila en `profesor`** — su acceso a "mis alumnos"
viene de la relación, no del rol. Ghezz es `STAFF` **y** `profesor` **y** puede
reservarse una cabina para él: las tres cosas a la vez, sin contradicción.

**Tres reglas más sobre los permisos, todas impuestas en el backend** (2026-08-12):

1. **Los permisos se resuelven contra la base en cada pedido, nunca contra el token.**
   Desactivar a alguien (`usuario.activo = FALSE`) le corta el acceso **en el acto**, y
   bajarle el rol pega en el pedido siguiente. Sin esto, la credencial seguía valiendo
   hasta 8 horas: se comprobó que un usuario dado de baja seguía operando y llegó a
   crear una fila.
2. **Solo un `ADMIN` puede editar o desactivar una cuenta que tenga rol
   administrativo** (`ADMIN`, `DIRECTIVO` o `STAFF`). Micaela da de alta alumnos todo
   el día, pero no puede tocar la cuenta de un socio ni la de Ignacio. Sin esta regla
   un `STAFF` podía desactivar al único `ADMIN` y dejar el sistema sin nadie capaz de
   administrarlo — porque además solo un `ADMIN` otorga roles.
3. **Nadie puede sacarse a sí mismo del sistema**: ni desactivando su propia cuenta ni
   cambiándose el rol. Son las dos puertas al mismo desastre, y la segunda estuvo
   abierta hasta el 2026-08-14: el único `ADMIN` podía ponerse `USUARIO` a sí mismo, la
   API contestaba 200 y el pedido siguiente ya venía 403, sin nadie capaz de deshacerlo
   (solo un `ADMIN` otorga roles). Con las dos cerradas, la invariante *"siempre queda al
   menos un `ADMIN` activo"* se sostiene sin contar filas: uno puede degradar o
   desactivar a otro, nunca a sí mismo, así que el último no se puede ir.

**Y una que no es de rol sino de estado:** quien tiene una contraseña generada por
administración y todavía no la cambió **no puede operar nada** hasta hacerlo, ni por
pantalla ni llamando la API directamente. Solo puede ver quién es y cambiar su
contraseña.

### 2.2 Menú del portal

Dos reglas, no una:

- Secciones atadas a **quién sos** → aparecen solo si la relación existe.
  *Mis Cursos* (alumno), *Mis Alumnos* / *Subir Material* (profesor).
- Secciones atadas a **un servicio que cualquiera contrata** → aparecen **siempre**.
  *Reservar cabina*, *Mix & Mastering*, *Mis Pagos*. Si se ocultaran hasta tener la
  primera fila, nadie podría hacer su primera reserva jamás.

Todo se arma con la respuesta de `GET /api/me` (usuario + rol + qué relaciones tiene).
Nada hardcodeado.

### 2.3 Dinero

- Todo importe lleva **moneda** (`ARS` / `USD`) y, si es USD, la **cotización al
  momento del pago**. Nunca se guarda un monto sin moneda.
- Cajas separadas por moneda.
- Los descuentos se registran **con justificación escrita** (propuesta, Módulo 3).

### 2.4 Archivos

Comprobantes, contratos y fotos de perfil pasan por la misma pieza intercambiable
(`StorageService`), en disco local durante el desarrollo. **Los comprobantes no se
eliminan: se marcan como inválidos.**

> ⚠️ **Corrección del 2026-08-19 (§14).** Esta lista incluía *"material de clase"* y
> *"entregas de M&M"*, y ninguna de las dos pasa por acá: **las dos viajan como link.**
> El material de clase quedó así al construirse el Módulo 5 (`material.archivo_path`
> espera a esta pieza, el CHECK de `V1` acepta las dos formas) y las entregas de M&M
> por decisión del cliente — P23. La frase original **se contradecía con `V1`**, que
> modela los tres entregables de `trabajo_mastering` como `VARCHAR(500)`, desde el
> primer día y sin que nadie lo marcara.
>
> **El `StorageService` existe desde el 2026-08-20** (`com.lajuanita.backend.archivo`),
> construido por el Módulo 7: el contrato del sello es el primer archivo que entra al
> sistema, y `contrato_sello.archivo_path` es `NOT NULL` desde `V1`. Lo único que le
> queda debiendo a esta sección es **la descarga de comprobantes** del Módulo 3, que
> ahora es trabajo de pantalla y no de infraestructura.
>
> **Y una consecuencia que no es de §2.4 pero se decide acá:** con archivos en disco,
> `scripts/backup.sh` dejó de alcanzar solo. Respalda las dos cosas desde el mismo
> día — ver `docs/operacion.md` §1, y el ensayo de restore que quedó pendiente de
> rehacer.

### 2.5 Auditoría

- El historial de clases **no se borra**, se edita dejando registro.
- Toda modificación de reserva guarda **quién** y **cuándo**.
- Los estados de M&M y de release **solo avanzan, no retroceden**.

### 2.6 Salas y usos — matriz de compatibilidad ✅

Confirmado por Ignacio el 2026-08-11. **Sustituye lo que dice el relevamiento.**

**Vocabulario, porque es fuente de confusión:** una **cabina** es *un lugar donde se
toca*, no un espacio específico. **Las tres salas son cabinas.** Dos son de práctica
(Sala 1 y Sala 2) y la tercera además graba.

| Tipo de uso | Sala 1 | Sala 2 | Cabina de grabación |
|---|:---:|:---:|:---:|
| Clase de DJ | ✅ | ✅ | ⚠️ solo prácticas |
| Producción musical | ✅ | ✅ | ❌ |
| Mentoría | ✅ | ✅ | ❌ |
| Mix & Mastering | ✅ | ✅ | ❌ |
| **Alquiler de cabina** | ✅ | ✅ | ❌ |
| **Grabación de set** | ❌ | ❌ | ✅ |

**Por qué la cabina de grabación no sirve para todo, si tiene equipos:** *no tiene
silla, ni tele, ni escritorio.* Es solo para tocar y grabarse. Por eso admite las
clases de DJ **finales, que son solo de práctica**, y la grabación de sets — pero no
mentorías, producción musical ni mix & mastering, que se dan sentado y con pantalla.

Tres consecuencias de modelado:

1. **No es un campo `tipo_sala`, es una matriz.** Va como tabla `tipo_uso` + tabla
   puente `sala_tipo_uso`. Así, el día que compren una tele y una silla para la cabina
   de grabación, **la regla se cambia desde una pantalla**, sin migración de base de
   datos ni cambios de código.
2. El sistema **rechaza** una reserva cuyo tipo de uso no esté habilitado para esa sala.
3. El caso "clase de DJ en la cabina de grabación" es un **permitido con advertencia**,
   no un bloqueo: `sala_tipo_uso` lleva una nota opcional que la pantalla muestra al
   reservar (*"esta cabina no tiene silla, tele ni escritorio — solo apta para clases
   de práctica"*). Bloquearlo sería rígido de más para un caso legítimo; no avisar nada
   deja que Micaela mande una clase teórica a una sala sin escritorio.

---

## 3. ⚠️ Huecos del modelo de datos detectados al leer la propuesta

Cinco cosas que el DBML actual no cubre y que hacen falta para cumplir lo prometido.
Se resuelven al escribir `V1__baseline.sql`.

### 3.1 Falta la tabla `inscripcion` — el hueco más grande

El modelo tiene `reserva` (una clase suelta: sala, fecha, hora) pero **no tiene dónde
vive "Juan compró el curso de DJ inicial: 8 clases, $X, arranca el 1/9"**. Sin eso no
se puede cumplir nada de esto, que está pedido explícitamente:

- Relevamiento: *"No hay registro de si un alumno faltó, si recuperó la clase, ni
  **cuántas clases le quedan pendientes dentro de su paquete contratado**."*
- Módulo 1: *"Seguimiento del recorrido formativo: niveles completados."*
- Módulo 3: saber qué está saldando cada pago.

Además, hoy `alumno.disciplina` y `alumno.nivel_actual` son campos sueltos en el
alumno — lo que rompe apenas alguien cursa DJ y producción a la vez, o hace un segundo
curso al año siguiente.

**Propuesta:** tabla `inscripcion` — usuario, tipo de servicio (curso DJ / curso
producción / mentoría), disciplina, nivel, cantidad de clases contratadas, precio
total, moneda, fecha de inicio, estado. `reserva` y `pago` ganan un
`id_inscripcion` opcional. Las clases restantes se calculan, no se guardan.

### 3.2 ~~No existe el concepto de **sede**~~ — DESCARTADO

Se había detectado que `sala` no tiene sede y que eso rompería al abrir Córdoba.
**Ignacio dio de baja Córdoba el 2026-08-11**, así que **no se modela `sede`**: el
sistema es de una sola ubicación.

Queda anotado el costo de revertirlo: si Córdoba vuelve al plan una vez que el sistema
esté en producción con datos reales, agregar sede deja de ser un campo y pasa a ser una
migración con datos adentro.

### 3.3 `estado_pago` no puede vivir en el alumno

El Módulo 1 lo lista como campo calculado del alumno, pero una misma persona puede
tener el curso pagado, un alquiler impago y un equipo comprado. "El estado de pago de
Juan" no es un valor único.

**Propuesta:** el estado de pago es **por inscripción / por transacción**. El perfil
del alumno muestra un resumen ("debe $X en total"), pero el dato vive abajo.

### 3.4 No hay modelo de **recuperación de clase**

El relevamiento pide saber "si recuperó la clase". `historial_clase` tiene
`estado_asistencia` pero nada que vincule una clase de recuperación con la que
reemplaza. **Propuesta:** `reserva.id_reserva_recupera` (opcional).

### 3.5 Falta la asignación **profesor ↔ alumno**

El Módulo 1 lista `profesor_asignado` y el Módulo 5 habla de "alumnos asignados", pero
el DBML solo relaciona profesor y alumno a través de cada `reserva`. Ver **❓P6**.

### 3.6 ⚠️ Lo que la landing vende y el modelo no contempla

Revisión de `apps/landing/src/data/` contra los 8 módulos, hecha el 2026-08-11.
**Ojo: gran parte de la copy y todos los precios de la landing son placeholder
inventado** (ver `apps/landing/CLAUDE.md`), así que algunas de estas diferencias
pueden ser invención mía de cuando escribí la landing, no realidad del negocio.
Por eso varias quedan como pregunta y no como hecho.

| Lo que vende la landing | Estado en el modelo |
|---|---|
| **Mix & Mastering como *curso*** (3 meses, 1 clase semanal) | ✅ **Resuelto: el curso no existe.** M&M es solo un servicio. La landing lo inventó. |
| **Modalidad "virtual en vivo"** en los dos programas grandes | ✅ **Resuelto: no hay clases virtuales.** Y aunque las hubiera, la sala se ocupa igual porque el profesor está ahí usando los equipos ⇒ `reserva.id_sala` queda obligatorio. |
| **Precios mensuales** ("Desde $85.000/mes") | ✅ **Resuelto: no hay cuotas.** Se paga todo antes de empezar; la única excepción es Mix & Mastering. |
| **Duración de los cursos** (DJ: 6 meses, 2 clases semanales) | ⚠️ Contradice el relevamiento y lo que Ignacio confirmó (DJ = 8 clases, 1 por semana). Ver ❓P34 |
| **"Práctica libre incluida"** en el programa de DJ | 🟡 Es uso de sala gratuito para alumnos, distinto del alquiler pago. Ver ❓P35 |
| **Alquiler $18.000/h y Grabación $65.000/h**, en bloques de 1 a 4 horas | ✅ Cubierto: son `reserva` + `pago` directo, **sin inscripción**. El precio sale de las horas |
| **Eventos, clases abiertas, showcases, release parties** (`dates.ts`) | 🟡 No hay módulo de eventos en los 8, y el relevamiento menciona eventos en Argentina, Uruguay y Brasil. Ver ❓P36 |
| **Catálogo del sello con género y portada** | 🟡 `release` no tiene ni género ni imagen. Trivial de agregar, hace falta si algún día la landing lee el catálogo del backend |
| **Equipos por categoría** (controladores, monitores, auriculares, accesorios) | 🟡 `venta_equipo` tiene modelo y marca, no categoría. Trivial |

---

## 4. Módulo 1 — Gestión de Alumnos

*Reemplaza el Notion de acceso exclusivo de Micaela.*

### Pantallas
1. **Listado de alumnos** — buscador y filtros por nombre, disciplina, nivel, estado de pago, estado del alumno. Indicador visual: activo / inactivo / con deuda.
2. **Alta / edición de alumno** — datos personales, disciplina, nivel de ingreso.
3. **Perfil del alumno** — datos + inscripciones + historial de clases + estado de cuenta + notas de profesores + materiales entregados.
4. **Alta de inscripción** — qué servicio contrató, precio, fecha de inicio (§3.1).

### Quién puede qué
| | ADMIN | DIRECTIVO | STAFF | Profesor | El propio alumno |
|---|---|---|---|---|---|
| Ver listado completo | ✅ | ✅ (lectura) | ✅ | Solo sus alumnos | — |
| Crear / editar alumno | ✅ | — | ✅ | — | Solo sus datos de contacto |
| Ver historial y notas | ✅ | ✅ | ✅ | Solo de sus alumnos | Su historial, **no** las notas |
| Cargar nota interna | ✅ | — | ✅ | ✅ sobre sus alumnos | — |
| Desactivar alumno | ✅ | — | ✅ | — | — |

### Reglas duras ✅
- **No se permiten alumnos duplicados por teléfono o email.**
- **No se asigna horario sin seña o pago registrado** (excepto autorización explícita — ver ❓P8).
- El nivel actual **no puede retroceder** sin autorización de un administrador.
- El historial de clases no se elimina; se edita con auditoría.
- Las **notas internas del profesor no las ve el alumno**, ni otros profesores. Sí las ve administración.
- Desactivar un alumno **conserva** todo su historial.

### Pendientes
- **✅P1 — RESUELTO (2026-08-11).** Es **un curso cerrado de 8 clases**, no un paquete de clases sueltas.
- **✅P2 — RESUELTO (2026-08-11). Ninguna clase se pierde jamás.** Si falta el alumno **o** falta el profesor, la clase **se recupera en otra fecha**. Siempre queda trazabilidad de por qué se movió. *Consecuencia: el curso no tiene fecha de fin fija — se termina cuando se dictaron las 8 clases.*
- **✅P3 — RESUELTO (2026-08-11).** Varias inscripciones activas a la vez **sí** (ej. DJ inicial + mentoría), pero **nunca dos niveles de la misma disciplina** (no DJ inicial + DJ avanzado). Se impone en la base con un índice único parcial por disciplina sobre inscripciones activas.
- **❓P4 — Los "alumnos por fuera del sistema formal" de Ghezz** (los que vienen por contactos personales) — ¿entran al sistema como alumnos normales, o quedan afuera a propósito?
- **❓P5 — ¿El sistema tiene que cubrir la nivelación?** El relevamiento describe preguntas concretas para ubicar al alumno. ¿Es un formulario del sistema o Micaela lo sigue haciendo por WhatsApp y solo carga el resultado?

---

## 5. Módulo 2 — Horarios y Salas

*El corazón operativo. Resuelve el conflicto recurrente de Ghezz enterándose tarde de los cambios de sala.*

> ## ✅ MÓDULO CERRADO el 2026-08-16
>
> Backend (`backend/reserva`, `backend/sala`) y las cuatro pantallas. Lo único
> que este módulo no entregó es **la seña**, que se movió al Módulo 3 con
> decisión de Ignacio: su trigger exige un `pago` apuntando a la reserva y esa
> tabla no tiene módulo hasta el 3. Sigue siendo **la última regla del sistema
> que vive en un documento y no en el código**.
>
> Suites: 229 en el backend, 139 en el front, más las dos SQL (121 + 50).

### Pantallas
1. ✅ **Calendario semanal** — `/admin/reservas`. **Días en columnas y horas en filas**, no salas en columnas: con tres salas la versión del alcance entraba, pero la vista quedaba de un día y lo que hay que ver para no pisarse es la semana. La sala va dentro de cada bloque y el filtro da la vista "la semana de la Sala 1". Si alguna vez son diez salas, la decisión se da vuelta.
2. ✅ **Alta / edición de reserva** — sobre la misma grilla; los participantes se anotan aparte, porque una clase puede ser grupal (P30).
3. ✅ **Bloqueo de sala** — `/admin/bloqueos`. Por rango de fechas, con franja horaria opcional. **Una fila es una franja que se repite todos los días del rango**, no un intervalo continuo, y la pantalla lo dice así.
4. ✅ **Historial de uso por sala** — `/admin/uso-salas`. Por período, con desglose por tipo de uso. Una sala sin uso sale en cero; lo cancelado y lo reprogramado se cuentan aparte y no suman horas.

### Quién puede qué
| | ADMIN | DIRECTIVO | STAFF | Profesor | Alumno |
|---|---|---|---|---|---|
| Ver el calendario completo | ✅ | ✅ | ✅ | ✅ | Solo sus reservas |
| Crear / modificar / cancelar reserva | ✅ | — | ✅ | — | — |
| Bloquear sala | ✅ | — | ✅ | — | — |
| Solicitar reprogramación | — | — | — | ✅ **P9, resuelta el 2026-08-29 (§16)** | ✅ |

### ⚠️ Dos reglas que este módulo tiene que traer consigo

**Están decididas y escritas, y son las únicas dos del sistema que viven hoy en un
documento y no en el código.** Vinieron de la auditoría, no se pudieron implementar antes
por falta de este módulo, y **son parte de darlo por terminado**:

| Regla | Estado |
|---|---|
| **El orden de las horas (DB-11)** | ✅ **HECHO (2026-08-16).** Es un `@AssertTrue` en `AltaReservaRequest` y `EdicionReservaRequest`. `reserva.periodo` es una columna generada que se computa **antes que los CHECK**, así que 20:00→19:00 explota en `tsrange()` con un error sin nombre de constraint y el mensaje bueno (`reserva_horas_validas`) no se alcanza nunca. No se arregla en la base: la columna viene de `V1` y una migración aplicada no se edita. El CHECK queda como defensa en profundidad |
| **La seña (DB-04 / P8)** | ✅ **CERRADA el 2026-08-17, `V10` + `V11`.** `V11` agrega la devolución: *si se cancela una reserva, la seña se devuelve* (Ignacio, 2026-08-17), y con eso la regla queda "toda reserva que ocupa su franja tiene plata detrás". Las tres advertencias que decía esta fila se cumplieron todas y se resolvieron: el alquiler de cabina quedaba incargable (lo arregla `AltaSenaRequest`, que entra en la misma transacción) y las suites SQL se rompieron (21 sentencias adaptadas). Ver `sistema-gestion-plan.md` §6d |

**Ya no queda ninguna regla del sistema viviendo en un documento y no en el código
(2026-08-17).** La seña era la última.

### Reglas duras ✅
- **Nunca dos reservas solapadas en la misma sala.** Se garantiza en la base de datos, no solo en la pantalla. *(Esta es la regla más importante del sistema entero.)*
- Una sala **bloqueada** no acepta reservas mientras dure el bloqueo.
- Toda modificación de reserva registra **quién y cuándo**.
- **El profesor afectado recibe notificación inmediata** ante cualquier cambio que lo toque. Es el problema #1 de Ghezz — si esto no funciona, el módulo no sirve.
- Los profesores **visualizan, no modifican**.

### Pendientes
- **✅P6 — RESUELTO (2026-08-11). Asignación explícita**: cada profe con su/s alumno/s. Vive en `inscripcion.id_profesor`, no en el alumno — así el mismo alumno puede tener a un profe para DJ y a otro para mentoría, y *Mis Alumnos* sale de ahí. Que otro profesor cubra una clase suelta **no** le transfiere el alumno.
- **✅P7 — RESUELTO (2026-08-16): se cargan A MANO, de a una.** Se evaluó que el sistema generara las ocho semanales al inscribir —era la recomendación de este documento— y **Ignacio lo descartó**. Queda anotado el costo, porque es real y se paga en diciembre: son 8 cargas por alumno, y la migración del Notion trae ~80. Si al usarlo se vuelve insoportable, la generación se puede agregar después sin tocar nada de lo construido: es un endpoint que llama ocho veces al alta que ya existe. Lo que **no** se puede agregar después barato es lo contrario.
- **✅P8 — RESUELTO (2026-08-14 y 2026-08-15). No hay autorización manual: no existe la excepción.** No se reserva sin seña, y la seña es el **50% del total**, para todos los tipos de uso menos `MIX_MASTERING` —que Ghezz decide caso por caso y el sistema no exige—. La ficha completa está en §13; lo que falta es la migración, arriba.
- **✅P9 — RESUELTA (Ignacio, 2026-08-29). Sí: el mismo botón que el alumno.** Mismo endpoint y mismo componente; lo único que cambia es la pantalla desde la que se entra. Sigue sin poder mover la clase él — pide, y mueve administración. El detalle está en §16.
- **✅P10 — RESUELTO (2026-08-11).** Son **tres salas: Sala 1, Sala 2 y Cabina de grabación.** No existe una "Sala de Producción" — el relevamiento está mal. La matriz de qué se puede hacer en cada una está en §2.6.
- **✅P29 — RESUELTO (2026-08-11).** El **alquiler de cabina** es un uso propio y va en **Sala 1 y Sala 2** (no en la de grabación). Es un servicio **distinto** de la grabación de set. Ambos están en la matriz de §2.6.
- **✅P30 — RESUELTO (2026-08-11). Las clases SÍ pueden ser grupales.** Por eso una reserva no lleva un alumno sino una tabla de participantes (`reserva_participante`), donde cada uno trae su propia inscripción y su propia asistencia. Esa tabla además reemplazó a `historial_clase` del modelo viejo.
- **✅P11 — RESUELTO (2026-08-14, §13): de 10:00 a 18:00**, y nada después de medianoche. Es lo que dibuja la grilla (`HORA_APERTURA` / `HORA_CIERRE`), pero **no es un límite**: una reserva cargada fuera de horario se dibuja igual, porque una reserva que existe y no se ve es el peor error posible acá. Esto además cerró DB-10 — el modelo `DATE` + dos `TIME` es el correcto. *(La respuesta estaba en §13 desde el 14 y esta línea siguió diciendo que estaba abierta hasta el 16: es el mismo problema que el informe de auditoría tuvo con las otras diez.)*

---

## 6. Módulo 3 — Pagos y Cobros

*Unifica el Excel financiero con el Notion operativo.*

> **✅ CERRADO el 2026-08-17.** Las seis pantallas, la seña entera (`V10` + `V11`)
> y la anulación de egresos y ventas. **Queda una sola cosa abierta a propósito**:
> una venta cargada sin cobro no tiene después por dónde cobrarse — se anula y se
> vuelve a cargar. Está explicado en `sistema-gestion-plan.md` §6d.

### Pantallas
1. **Registrar pago** — a qué corresponde, monto, moneda, cotización, medio, descuento + justificación, comprobante.
2. **Estado de cuenta por persona** — qué contrató, qué pagó, qué debe.
3. **Caja por moneda y período** — ARS y USD por separado.
4. **Deudores** — quién debe, cuánto y hace cuántos días.
5. **Registrar egreso** — pagos a profesores y otros.
6. **Venta de equipos** — sub-sección: modelo, marca, precio, comprador (con o sin cuenta), vendedor.

### Quién puede qué
| | ADMIN | DIRECTIVO | STAFF | Alumno / cliente |
|---|---|---|---|---|
| Registrar / modificar pago | ✅ | — | ✅ | — |
| Ver caja y deudores | ✅ | ✅ (lectura) | ✅ | — |
| Registrar egreso | ✅ | — | ✅ | — |
| Ver su propio estado de cuenta | ✅ | ✅ | ✅ | ✅ |
| Descargar su comprobante | — | — | — | ✅ |

### Reglas duras ✅
- Un pago siempre dice **qué salda** (inscripción, reserva, trabajo de M&M o venta de equipo).
- Pago en USD ⇒ **cotización obligatoria**.
- **Los comprobantes no se borran**, se marcan como inválidos.
- Todo egreso queda con usuario, fecha y motivo.
- Todo descuento queda con **justificación escrita**.
- **Alerta automática si alguien lleva más de 7 días en estado 'debe'.**
- Registrar el pago **habilita automáticamente** la reserva (elimina la doble carga Excel↔Notion — es el beneficio central prometido).

### Pendientes
> **Revisados los cinco el 2026-08-16, al arrancar el módulo: ninguno lo
> bloquea.** Tres ya estaban contestados —dos en §13 y en el esquema, y esta
> lista no se había actualizado—, uno no cambia lo que hay que construir, y del
> último §13 ya decidió cómo seguir sin él. Es el mismo patrón que con P11 y con
> los diez hallazgos que la auditoría listó como trabados: **la respuesta estaba
> escrita en otro lado.**

- **✅P12 — RESUELTO en §13 (P8 / DB-04a).** La seña es **un pago parcial contra
  la inscripción**, no un registro aparte, y el estado sale de la suma — que era
  la recomendación de esta misma línea. El dinero detrás de una reserva llega por
  uno de dos caminos: un `pago` que la apunta (`pago.id_reserva`), o la
  inscripción que cubre esa clase (`reserva_participante.id_inscripcion`). El
  esquema ya lo acompaña con `estado_pago = 'SENADO'`.
- **❓P13 — ¿Los precios viven en el sistema?** El único realmente abierto, **y
  §13 ya decidió cómo seguir sin él**: `reserva` no tiene precio, así que la base
  exige *que haya un pago* y no *que sea el 50%*; esa mitad la impone la pantalla
  y la base la toma cuando `reserva` tenga precio. **Módulo 3 no construye tabla
  de tarifas** — no está entre sus seis pantallas. Si Micaela la quiere, es un
  módulo aparte y hay que decidirlo como tal.
- **✅P14 — No bloquea: se construye caso por caso**, que es el superconjunto. El
  esquema acepta cualquier porcentaje (0–100) y **exige justificación escrita**
  (`pago_descuento_justificado`). Si mañana se fija un porcentaje de ex alumno,
  es un valor por defecto en el formulario, no un cambio de modelo.
- **✅P15 — RESUELTO por el código, desde `V6` y `V7`. Se anula dejando rastro;
  no se edita y no se borra.** `ANULADO` es un estado válido desde `V1`, `V6`
  prohíbe el DELETE sobre `pago`, y `V7` exige **autor, fecha y motivo** para
  anular (`pago_anulacion_justificada`) — era la única excepción del esquema que
  no exigía nada. El comprobante tiene su propio mecanismo, con las mismas tres
  exigencias: se marca inválido, no se borra.
- **✅P16 — RESUELTO por el esquema.** El comentario de `venta_equipo` en `V1` lo
  dice: **sin stock propio, se registra la venta, no el pedido a Pioneer.** Desde
  `V9` además lleva estado de anulación, igual que `pago`.

---

## 7. Módulo 4 — Portal del Alumno ✅ *construido el 2026-08-19*

### Pantallas
Mis próximas clases · Mi estado de cuenta (con descarga de comprobantes) · Solicitar
reprogramación · Mis materiales · Mi progreso (nivel actual, clases tomadas, clases
restantes) · Mis notificaciones · Mi perfil.

### Lo que se construyó, y lo que quedó afuera a propósito

**Siete pantallas del portal** —`/mis-reservas`, `/reservar`, `/mis-solicitudes`,
`/mis-cursos`, `/mis-pagos`, `/notificaciones`, `/mi-perfil`— **y una octava de
administración, `/admin/solicitudes`**, que es la que hace que el portal exista:
sin alguien que lea los pedidos, el portal escribiría en una tabla que nadie mira.

**El módulo empezó con una migración (`V13`) y no con una pantalla**, y la razón
es la consecuencia de P17 que está anotada más abajo: el portal no puede crear una
`reserva`. Se creó `solicitud_reserva` en vez de generalizar
`solicitud_reprogramacion` — son dos ciclos de vida distintos, una pide mover algo
que existe y la otra pide crear algo que no.

**El eje de permisos "solo lo mío"** quedó como un `WHERE` y no como una
anotación: no es un permiso que se concede sino un filtro que no se puede omitir.
Todo el portal cuelga de `/api/me/**`, ningún endpoint de ahí recibe una
identidad, y el id sale del `sub` del token. `PortalService` no tiene una sola
consulta capaz de devolver lo de otro.

**Tres cosas quedaron afuera, y las tres se dicen en pantalla en vez de omitirse:**

- **Los materiales de clase.** Los sube el profesor y esa pantalla es del Módulo
  5; hoy `material` no tiene quién le escriba una fila. Aparece como bloque
  nombrado en Mis cursos.
- **La descarga de comprobantes.** Necesita el `StorageService` de §2.4, que
  todavía no existe. El estado de cuenta muestra los pagos.
- ~~**El aviso automático a los 7 días de deuda.**~~ ✅ **Construido el 2026-08-20**
  (`V17`, paquete `com.lajuanita.backend.aviso`), junto con el de M&M y la
  infraestructura que va a usar el Módulo 7. Le llega a administración —no al
  deudor: la deuda la persigue el estudio— y **de paso arregla algo que nadie había
  notado: `estado_pago = 'VENCIDO'` existía desde `V1` y ninguna línea del sistema
  lo escribía nunca.** La pantalla de deudores recalcula los días al vuelo, así que
  se veía bien y el dato guardado no lo estaba. Ver §15.

**Y una decisión de alcance que conviene no reabrir sin pensarla:** una solicitud
se aprueba **tal como se pidió**. No se puede aprobar "pero a las 18". Si la franja
no sirve, se rechaza diciendo por qué y la persona pide de nuevo — así lo que quedó
aprobado es siempre algo que alguien eligió, y no algo que nadie eligió.

### Reglas duras ✅
- El alumno **solo ve lo suyo**.
- **Las solicitudes de reprogramación no son automáticas: las aprueba administración.**
- El alumno **no modifica** su horario ni su estado de pago.
- Los materiales se ven **solo si el profesor los habilitó**.
- El alumno **no ve las notas internas** de los profesores.

### Pendientes
- **✅P17 — RESUELTO (Ignacio, 2026-08-17). La línea no la marca el rol: la marca si hay un profesor del otro lado.**
  - **Cursada (clases, horarios, profesores): la decide administración.** El alumno no elige nada. Esto zanja la tensión con la entrevista —lo que Mica describió era sobre clases— y coincide con lo contractual.
  - **Lo que no depende de un profe SÍ lo elige el usuario:** alquiler de cabina, grabación. Y ojo que es *usuario*, no *alumno*: quien alquila una cabina puede no cursar nada.

  > **⚠️ Consecuencia que hay que resolver antes de construir el portal, y sale de una regla del propio cliente.** Una reserva no existe sin plata detrás, verificada al COMMIT (P8, `V10`–`V12`), y esa plata tiene que estar en estado `SENADO` o `PAGADO`. **Un `USUARIO` no tiene cómo poner plata en el sistema**: registrar un pago es `@PuedeOperar` (ADMIN·STAFF), los cinco medios de pago son todos de carga manual y no hay pasarela de pago en ningún lado del alcance. Entonces, tal como está, **un alumno no puede crear su reserva de cabina** — la crearía sin seña y el trigger la rechaza.
  >
  > La salida natural, y la única que no toca la regla: **el portal genera una SOLICITUD, y la reserva nace cuando administración confirma y carga la seña.** El alumno igual "elige" —fecha, sala, horario— y no depende de que alguien le arme la agenda; lo que no puede es saltear el cobro.
  >
  > **Eso implica que el Módulo 4 empieza con una migración, no con una pantalla:** la única tabla de solicitudes que existe es `solicitud_reprogramacion`; no hay ninguna para pedir una reserva. **Queda por decidir** si se crea una `solicitud_reserva` o se generaliza la que hay.
- **✅P18 — RESUELTO (2026-08-12). Cada uno se crea su cuenta, y Micaela puede crearla con contraseña temporal.** Son dos caminos, y los dos hacen falta:
  1. **Registro propio** (`POST /api/auth/registro`, público): nombre, apellido, email, teléfono y contraseña. **Lo puede usar cualquiera, sea alumno o no** — para ver tus reservas necesitás cuenta, y quien alquila una cabina una vez nunca va a cursar nada. Esto confirma la decisión de `usuario` como raíz del modelo: *crear una cuenta* y *ser alumno* son cosas distintas, y la segunda la agrega administración al inscribirte.
  2. **Alta por administración**: para los ~80 alumnos que hoy viven en el Notion y para quien se anota por WhatsApp. El sistema genera una contraseña temporal, Micaela se la pasa por WhatsApp (como ya trabaja hoy) y `usuario.debe_cambiar_password` obliga a cambiarla en el primer ingreso.

  **Por qué no un mail de activación:** no hay infraestructura de correo ni la va a haber pronto (`sistema-gestion-plan.md` §7 descarta el relay de mails). WhatsApp es el canal que el estudio ya usa para todo.
- **✅P19 — RESUELTO (Ignacio, 2026-08-17). NO: nadie pierde nunca su cuenta.** *"Quizás en un futuro quiere retomar, reservar cabina, etc."*

  Es la confirmación más directa que tuvo el modelo de `usuario` como raíz: **dar de baja al alumno no da de baja a la persona.** Son dos cosas distintas y el esquema ya las tiene separadas — `alumno.estado_alumno = INACTIVO` (terminó de cursar) contra `usuario.activo = FALSE` (la cuenta no entra más). La segunda queda reservada para bajas reales, no para el fin de un curso, y el portal se le sigue mostrando: sus materiales, su historial y la posibilidad de alquilar una cabina.

---

## 8. Módulo 5 — Portal del Profesor · ✅ *cerrado el 2026-08-19*

*Necesidad levantada por Ghezz. Hoy lleva un Excel paralelo porque el Notion no le alcanza.*

### Pantallas
Mi agenda (día / semana) · Mis alumnos · Perfil de un alumno mío · Cargar nota privada
por sesión · Subir material (a un alumno o grupal) · Estado de seguimiento · Mis
notificaciones · Mi historial de clases dictadas · Mi perfil.

### Reglas duras ✅
- Un profesor accede **solo a sus propios alumnos**.
- Sus notas privadas **no las ven ni el alumno ni otros profesores**. Administración sí.
- El material es de un alumno, salvo que se marque **grupal**.
- El profesor **no modifica reservas**, solo las ve.
- Las notificaciones de cambio de sala **llegan solas**.
- Estados de seguimiento: **va bien / requiere atención / en pausa**, con fecha de cambio.

### Estado ✅ *cerrado*

**Backend y front, los dos** (`docencia`, `V14`, 25 casos de backend y 36 de front).
El backend se construyó el 2026-08-19 por la mañana y las pantallas esa misma tarde;
en el medio el módulo pasó medio día partido al medio, que es el único de los cinco
al que le pasó.

Están las seis pantallas: **mi agenda con el historial de clases dictadas**
(`/mi-agenda`), **mis alumnos** con el semáforo (`/mis-alumnos`), **la ficha de un
alumno mío** con notas, semáforo y su material (`/mis-alumnos/:idAlumno`), **subir
material** (`/material`), **mis materiales** del lado del alumno (`/mis-materiales`,
que llena el bloque que el M4 dejó nombrado) y **el bloque de notas y materiales en
la ficha de administración**.

**Ese último cerró una regla dura que estaba escrita a medias**: *"administración
sí"* ve las notas privadas no existía en ninguna capa —ni endpoint ni pantalla—
hasta el cierre del módulo. Ahora son `GET /api/alumnos/{id}/notas` y
`/materiales`, los dos de solo lectura: corregir una nota es del autor (la firma
*es* el dato) y publicar un material es del profesor que lo subió. **Con eso la
ficha del alumno construye los seis bloques de §4.**

Dos reglas duras quedan sostenidas por el service y no por la base, con la razón
escrita en la cabecera de `V14`: *"solo mis alumnos"* y *"las notas privadas no las
ve otro profesor"*. Lo que sí sostiene la base: que una nota no se cuelgue de la
clase de otro alumno (`V1` §8.3, que ya existía) y que el seguimiento selle su
fecha de cambio (`V14`).

**El material va por link**: `archivo_path` espera al `StorageService` de §2.4.

### Pendientes
- **❓P20 — "Registrar automáticamente cuántas clases doy"** — Ghezz lo pidió textual, y se conecta con el pago a profesores del Módulo 3. ¿La liquidación al profesor se calcula sola a partir de las clases dictadas, o se carga a mano? **El M5 entregó el insumo y no la respuesta**: `GET /api/me/profesor/clases` cuenta las clases dictadas del período y no calcula ningún total — poner ahí una tarifa sería decidir por el cliente algo que le cuesta plata.
- **❓P21 — Mentorías:** son el servicio con más necesidad de seguimiento y sin estructura fija. ¿La nota por sesión alcanza, o hace falta algo distinto (un hilo por alumno, objetivos)?

---

## 9. Módulo 6 — Mix & Mastering · ✅ *cerrado el 2026-08-19*

**Lo esencial:** registrar cada trabajo, contar las revisiones, y **retener el archivo
final hasta que el pago esté registrado**. Es el único servicio que puede quedar en debe.

Estados: `a confirmar → en proceso → entregado → pagado`, más `debe`.

### Reglas duras ✅
- **El archivo final no se libera sin el pago registrado.** Es la regla que le resuelve a Ghezz el "estar fiando el servicio". **Lo que se retiene es el link del premaster** (P23, §14): el sistema no lo muestra hasta que el pago esté cargado. Bloquea mientras el sistema sea donde se publica el link, y para el resto está la excepción registrada de P28 — que existe porque el cliente avisó que la iba a necesitar.
- Alerta al superar las revisiones incluidas.
- Alerta si pasan más de 7 días desde la entrega sin pago.
- Los clientes externos se registran **con nombre y contacto, sin cuenta**.

### Estado ✅ *cerrado*

**Backend, front y las dos migraciones** (`mastering`, `V15`, `V16`, 18 casos de
backend y 15 de front). El tablero de administración está en `/admin/mix-mastering`
y el del cliente en `/mix-mastering`.

**Casi todo el esquema estaba desde `V1`**: la tabla, el candado del premaster
(§8.4), la escalera de estados (§8.5), y de `V6` la protección del pago que
respalda una liberación (§6) y la prohibición de borrar (§7). El módulo puso la
forma —cinco operaciones, no un PUT genérico— y encontró dos cosas:

- **`V15`** saca el techo de revisiones que `V6` §3 había puesto, porque hacía
  imposible la alerta que este mismo documento pide. Ver §14.
- **`V16`** arregla el trigger de `V6` §6, que **estaba roto y no podía saberse**:
  reventaba con `column reference "id_pago" is ambiguous` antes de llegar a su
  propio mensaje. Bloqueaba igual —por eso el agujero nunca estuvo abierto— pero
  contestaba 500 en vez de 409, y **también rechazaba el caso que debía permitir**
  (que exista otro pago que sostenga la liberación). Los casos D02 y D03 de la
  suite adversarial estuvieron en verde todo ese tiempo: `probar(...,'FALLA',...)`
  verifica que falle, no por qué. La suite ganó un `probar_mensaje(...)` y D02 pasa
  a exigir el texto.

**Lo que la pantalla decide, y no es visual:** la regla dura tiene **una sola forma
en pantalla** — se intenta entregar el premaster, el backend explica por qué no, y
recién ahí aparece la salida, que cuesta escribir un motivo que queda firmado. Al
revés (un checkbox "liberar sin pago" siempre a mano) la regla sería una sugerencia.

**Los tres entregables van como link** (P23): el `StorageService` de §2.4 no hizo
falta y sigue debiéndose solo para los comprobantes del Módulo 3.

**Lo único que este módulo pide y no existe** es el disparador automático de la
alerta a los 7 días de entregado sin pago: corre sin que nadie pida nada, necesita
un scheduler y decidir qué pasa si corre dos veces el mismo día. **Es la segunda
vez que un módulo la pide** —el 4 la dejó anotada para el aviso de deuda— y la
constante ya vive en un solo lugar (`PagoService.DIAS_PARA_VENCER`). La otra
alerta, la de revisiones excedidas, no la necesita: se ve en el tablero.

### Pendientes
**Ninguno pendiente de decisión. Las tres se cerraron el 2026-08-19 — ver §14.**

- ~~**P22**~~ ✅ Se entrega el **master**, se retiene el **premaster**. Gana la
  entrevista sobre la propuesta comercial, que hablaba de un *"premix"*: eran tres
  nombres para dos archivos.
- ~~**P23**~~ ✅ Los audios **no pasan por el sistema**: van por WeTransfer/Drive y el
  sistema guarda el link. **La retención es del link**, que es lo que `V1` modela desde
  el primer día. Con esto **el `StorageService` de §2.4 deja de trabar este módulo** —
  sigue debiéndose para los comprobantes del Módulo 3— y **§2.4 queda corregida**: las
  entregas de M&M no pasan por esa pieza.
- ~~**P28**~~ ✅ La excepción existe: se libera sin pago **escribiendo el motivo**, y
  queda el autor. La puede usar administración (`@PuedeOperar`), no solo un ADMIN.

~~**Lo que sí queda por construir y no es una decisión:**~~ ✅ **La alerta de los 7 días
desde la entrega sin pago está construida** (2026-08-20, `V17`). Era la misma pieza que
el Módulo 4 había dejado anotada para el aviso de deuda y que el 7 iba a pedir para el
aviso previo al lanzamiento: se hizo una vez, para los tres. Le llega a administración,
que acá **no podría ser de otra forma** — la mitad de los clientes de M&M son externos
sin cuenta y una notificación necesita un `usuario` destino. Ver §15.

La otra alerta, la de revisiones excedidas, **nunca la necesitó**: se dispara al
registrar una revisión.

---

## 10. Módulo 7 — Sello Discográfico · ✅ *cerrado el 2026-08-20*

Catálogo de releases con ID correlativo (LJ020…), artistas, contratos, estados
(`a confirmar → confirmado → en distribución → publicado`), registro del envío al
sistema de promoción internacional, alertas 7 días antes de la fecha de lanzamiento.

### Reglas duras ✅
- ID de release **único y correlativo**.
- No se publica un release **sin contrato adjunto** (o con justificación explícita).
- Los estados solo avanzan.
- Acceso: Ghezz y administración total; dirección solo consulta; **profesores y alumnos sin acceso**.

### Lo construido

| Qué | Dónde |
|---|---|
| Catálogo de releases, con búsqueda y filtro por estado | `/admin/sello` |
| Contratos, apariciones, estado y publicación | la misma pantalla, al abrir un release |
| Fichas de artistas y contratos generales | `/admin/artistas` |
| Backend | `com.lajuanita.backend.sello` (tres controllers) + `com.lajuanita.backend.archivo` |
| Reglas de la base | `V18__el_sello.sql` |

**Y el `StorageService` de §2.4 existe** (`com.lajuanita.backend.archivo`), después de
que tres módulos lo esquivaran. Sigue debiéndose **solo** para la descarga de
comprobantes del Módulo 3, que ahora es trabajo de pantalla y no de infraestructura.

### Pendientes

**Ninguno pendiente de decisión. Las cuatro se cerraron el 2026-08-20 — ver §15.**

- ~~**P38**~~ ✅ El contrato es un **archivo que se sube**. Este módulo construyó el
  `StorageService`, y el respaldo dejó de ser solo `pg_dump`: los archivos entran al
  backup (`docs/operacion.md` §1).
- ~~**P24**~~ ✅ Los artistas **no entran al sistema**. `artista.id_usuario` queda
  nullable y sin usar; sin portal propio, el módulo es la mitad de grande.
- ~~**P25**~~ ✅ El seguimiento post-lanzamiento **entra, cargado a mano**, y sin
  ninguna integración con plataformas. Es `aparicion_release`.
- ~~**Ratificación 6**~~ ✅ Un release **sí puede caerse**: `CANCELADO` fuera de la
  escalera (`V18` §1), y de cancelado no se vuelve (`V18` §1b).

**Lo que este módulo encontró y no era suyo:** `CANCELADO` se podía deshacer, en el
sello **y en Mix & Mastering**, por la misma línea de `V1` §8.5 — al quedar fuera de
la escalera cae en el `ELSE 0` y salir de él nunca se veía como un retroceso. Es el
retroceso en dos pasos que `V6` ya había cerrado en las demás tablas. Se arregló para
las dos en `V18` §1b.

---

## 11. Módulo 8 — Dashboard de Dirección · ✅ *cerrado el 2026-08-20*

Solo lectura. Indicadores: alumnos activos por servicio · ingresos del período en ARS y
USD por línea de negocio · ocupación de salas por día y franja · cobros pendientes ·
tasa de retención · ingresos por M&M · actividad del sello. Exportable a PDF y Excel.

### Reglas duras ✅
- **Es solo lectura.** No modifica nada.
- Cada indicador permite abrir el detalle (drill-down) en su módulo.
- Sin datos en el período ⇒ muestra cero, no vacío.
- Acceso completo solo `DIRECTIVO` y `ADMIN`; `STAFF` ve el resumen financiero básico.

### Lo construido

`GET /api/tablero` (ADMIN·DIRECTIVO) y `GET /api/tablero/resumen` (además STAFF), más
`exportacion.xlsx` y `exportacion.pdf`. Pantalla en `/admin/tablero`, paquete
`com.lajuanita.backend.tablero`. **Sin migración**: el tablero solo lee.

**Las cuatro reglas duras se implementaron así, y cada una tiene su porqué:**

- **`STAFF` ve menos porque llama a OTRO endpoint**, no porque el mismo devuelva menos.
  Un endpoint que contesta distinto según el rol rompe la propiedad que el Módulo 4 se
  impuso —ningún endpoint cambia de significado según quién lo llame— y hace que un
  indicador nuevo pueda filtrarse a STAFF por olvido. Con dos DTOs hay que agregarlo a
  mano al segundo.
- **Cero y no vacío lo sostiene el backend**, no la pantalla: la grilla de ocupación
  viaja completa y cubre siempre el horario del estudio. Puesto en el front, sería un
  detalle de dibujo que se pierde en el rediseño que viene al final.
- **El drill-down lleva el período puesto**, para que el detalle no conteste sobre otro
  mes que el que estabas mirando.
- **Aparece el tercer eje de rol del sistema**, `@PuedeVerElTableroCompleto`: el único
  lugar donde la línea no separa leer de escribir sino a dos clases de administrador —
  o sea, la razón concreta por la que los roles son cuatro y no tres.

**Y una distinción que el módulo tuvo que hacer explícita: no todos los indicadores son
del período.** Alumnos activos, deuda viva y retención son fotos de hoy; ingresos,
ocupación, entregas y publicaciones son del período elegido. Filtrar una foto por el
período contesta otra pregunta con el mismo título — mirar agosto haría desaparecer la
deuda de marzo, que es justo la plata que hay que ir a buscar. La pantalla lo aclara al
lado de cada bloque y el archivo exportado, adentro de cada hoja.

### ✅ P26 — el denominador, ratificado al construirlo

§15 dejó cerrada la definición —segundo servicio dentro de los 10 meses del primero— y
anotó que faltaba el denominador. **Queda como la lectura por defecto que §15
anticipaba: los que contrataron su primer servicio hace más de 10 meses**, o sea
aquellos cuya ventana ya cerró y sobre los que la respuesta es definitiva.

**Y construirlo encontró una segunda trampa, que no estaba anotada y es peor que la
del denominador: las clases de un curso no son servicios contratados.** Una inscripción
de DJ son ocho reservas. Contarlas daría que todo alumno queda retenido a la semana de
empezar y la tasa daría casi 100% — un número que nadie discutiría porque *suena bien*.
La consulta excluye las participaciones que cuelgan de una inscripción: ya las
representa la inscripción.

**Con denominador cero la tasa es `null` y no cero**, en el JSON, en la pantalla y en la
planilla. Un 0% se lee como que se fueron todos; lo que pasa es que nadie cerró todavía
su ventana. Es exactamente lo que da hoy la base de desarrollo.

### La exportación (§15, ratificación 8)

Entró completa y con la vara que pedía. **Apache POI** para el xlsx y **OpenPDF** para el
PDF — OpenPDF y no iText porque iText 7 es AGPL y obligaría a publicar el sistema entero
o a comprar licencia; es la razón principal de la elección y está escrita en el `pom`.

- **Se exporta lo que estás mirando**: hereda los tres filtros de la pantalla.
- **Cabecera de trazabilidad** —qué filtros, cuándo, quién— y va **en cada hoja del
  Excel y en el pie de cada página del PDF**, no una sola vez. El escenario que lo
  justifica: alguien copia una hoja a otro libro y la manda por mail, o imprime una
  página suelta. Sin la cabecera adentro, ese pedazo perdió de dónde salió.
- **El "quién" se lee de la base por el id del token**, nunca de algo que mande el
  cliente: una cabecera que se puede escribir desde afuera no traza nada.
- **Excel de verdad**: cada celda se escribe con su tipo, y los importes llevan formato
  de moneda de Excel en vez de venir como texto ya formateado. Un `"$ 180.000,00"` se ve
  idéntico a un número y rompe el primer `SUM` que alguien haga.
- **Se exporta lo que se puede ver**: la exportación es ADMIN·DIRECTIVO, igual que el
  tablero completo. Un endpoint de exportación más flojo que su pantalla es la forma más
  silenciosa de filtrar datos, porque nadie revisa dos veces un `.xlsx`.

---

## 12. Índice de decisiones pendientes

> Esta sección es **solo las decisiones** (las "P"). El inventario completo de lo
> que queda abierto —módulos, deuda técnica, la landing, operación— está en
> [`docs/pendientes.md`](../pendientes.md).

| # | Tema | Bloquea |
|---|---|---|
| ~~P1~~ | ✅ Curso cerrado de 8 clases | — |
| ~~P2~~ | ✅ Ninguna clase se pierde: se recupera | — |
| ~~P3~~ | ✅ Varias sí, dos niveles de la misma disciplina no | — |
| P4 | Alumnos informales de Ghezz | Módulo 1 |
| P5 | Nivelación dentro del sistema | Módulo 1 |
| ~~P6~~ | ✅ Profesor asignado explícito, en la inscripción | — |
| P7 | Generación automática de clases semanales | Módulo 2 |
| P8 | Quién autoriza reservar con deuda | Módulo 2 |
| ~~P9~~ | ✅ **Sí, el mismo botón que el alumno** (§16) | — |
| ~~P10~~ | ✅ Sala 1, Sala 2, Cabina de grabación | — |
| ~~P11~~ | ✅ De 10:00 a 18:00, nada después de medianoche (§13) | — |
| ~~P12~~ | ✅ Pago parcial contra la inscripción; el estado sale de la suma (§13) | — |
| P13 | ¿Lista de precios en el sistema? | Módulo 3 |
| ~~P39~~ | ✅ **No.** El aviso se ve adentro del sistema; no se construye ningún envío hacia afuera (§15) | — |
| ~~P14~~ | ✅ Caso por caso, con justificación escrita obligatoria | — |
| ~~P15~~ | ✅ Se anula con autor, fecha y motivo (`V7`). No se edita ni se borra | — |
| ~~P16~~ | ✅ Registra la venta, no el pedido: no hay stock propio (`V1`) | — |
| P17 | Alcance real de la autogestión | Módulo 4 |
| ~~P18~~ | ✅ Se registra solo, o alta con contraseña temporal | — |
| P19 | Acceso del alumno inactivo | Módulo 4 |
| P20 | Liquidación automática a profesores | Módulo 5 |
| P21 | Seguimiento de mentorías | Módulo 5 |
| ~~P22~~ | ✅ Se entrega el master, se retiene el premaster (§14) | — |
| ~~P23~~ | ✅ No: siguen por WeTransfer/Drive, el sistema guarda el link (§14) | — |
| ~~P38~~ | ✅ **Archivo, se sube.** El Módulo 7 construye el `StorageService` de §2.4 — y el backup deja de alcanzar solo (§15) | — |
| ~~P24~~ | ✅ No entran: `artista` es una ficha administrativa. Sin portal propio (§15) | — |
| ~~P25~~ | ✅ Entra, **cargado a mano**. Ninguna conexión a plataformas (§15) | — |
| ~~P26~~ | ✅ Segundo servicio dentro de 10 meses; venta de equipos no cuenta; pausar y volver no es retención (§15). **El denominador quedó ratificado al construir el Módulo 8** (§11): los que contrataron hace más de 10 meses | — |
| ~~P27~~ | ✅ "Grabación" se suma, solo en la Cabina | — |
| ~~P28~~ | ✅ Sí, con motivo escrito y autor registrado (§14) | — |
| ~~P29~~ | ✅ Alquiler de cabina: Sala 1 y 2, servicio propio | — |
| ~~P30~~ | ✅ Sí, hay clases grupales → `reserva_participante` | — |
| ~~P31~~ | ✅ M&M es servicio, no curso | — |
| ~~P32~~ | ✅ No hay virtual; la sala se ocupa igual | — |
| ~~P33~~ | ✅ Todo antes de empezar, sin cuotas | — |
| P34 | ⚠️ Duración real de los cursos (landing ≠ relevamiento) | Módulo 1 · **corregir antes de publicar la landing** |
| P35 | "Práctica libre" como uso de sala gratuito | Módulo 2 |
| P36 | ¿Entran los eventos / clases abiertas / showcases? | Alcance general |
| P37 | ⚠️ ¿Una reserva de tipo clase exige profesor asignado? | Módulo 2 (interpretación abierta, **no impuesta a propósito**) |

**Nada bloquea el `V1__baseline.sql`: el esquema está escrito, probado y commiteado
(2026-08-11).** Los pendientes que quedan se contestan mientras se construye el módulo
correspondiente. El más urgente es **P34**, porque son números que un cliente lee.

> **Decisiones cerradas en la auditoría de base de datos** (además de las P de arriba):
> `pago.descuento_porcentaje` es un **porcentaje 0-100**, y en consecuencia `monto` es
> lo **efectivamente cobrado**, con el descuento ya aplicado. El usuario administrador
> inicial se siembra en `V3`, junto con el login. Detalle en `docs/sistema-gestion-plan.md`.

### Detalle de las nuevas

- **✅P31 — RESUELTO (2026-08-11).** El curso de Mix & Mastering **no existe**: es un servicio y nada más. La landing lo inventó como programa de 3 meses. *(Ver P34: hay que sacarlo de la landing antes de publicar.)*
- **✅P32 — RESUELTO (2026-08-11). Todo presencial, no hay clases virtuales.** Y el razonamiento que las descarta del modelo aunque algún día existan: **la sala se ocupa igual, porque el profesor está ahí usando los equipos.** Por eso `reserva.id_sala` es NOT NULL sin excepciones.
- **✅P33 — RESUELTO (2026-08-11). No hay cuotas mensuales**: se paga todo antes de empezar a cursar, como dice el relevamiento. El "$85.000/mes" de la landing es placeholder. Única excepción: Mix & Mastering, que se cobra después de entregar.
- **✅P37 — RESUELTO (2026-08-16): NO se exige.** Confirmado por Ignacio: se puede cargar una clase en el calendario antes de saber qué profe la toma. El campo existe y queda vacío hasta que se decida. Consecuencia útil y no obvia: un `id_profesor` en NULL tampoco choca contra la EXCLUDE de `V9` que impide que el mismo profe esté en dos salas a la vez, que es exactamente lo que se quiere — un alquiler de cabina no ocupa la agenda de nadie.
- **❓P34 — La duración de los cursos no coincide.** Relevamiento y confirmación de Ignacio: DJ = 2 meses, 8 clases, 1 por semana. Landing: DJ = 6 meses, **2 clases semanales**. Producción: 4 meses vs. 8 meses. **Alguno de los dos está mal y hay que corregirlo antes de publicar la landing**, porque son números que un cliente lee y sobre los que decide.
- **❓P35 — "Práctica libre incluida"** aparece como beneficio del programa de DJ. Es un uso de sala **gratuito y solo para alumnos**, distinto del alquiler pago. ¿Se reserva por el sistema? Si sí, es un `tipo_uso` más.
- **❓P36 — Eventos.** `dates.ts` anuncia clases abiertas, showcases y release parties, y el relevamiento habla de eventos en Argentina, Uruguay y Brasil. No hay módulo de eventos entre los 8 y **no está en la propuesta**, así que por defecto queda **fuera de alcance** — pero un evento ocupa una sala, así que como mínimo debería poder bloquearla.

---

## 13. Decisiones cerradas el 2026-08-14

**Veinte preguntas que estaban trabando la remediación de la auditoría y el arranque de
`inscripcion`, contestadas de una sola vez por Ignacio (las del cliente, ya validadas con
él).** Esta sección gana sobre cualquier cosa que la contradiga más arriba en este
documento.

> **Hay una segunda tanda: [§14](#14-decisiones-cerradas-el-2026-08-19--mix--mastering),
> del 2026-08-19, con las tres del Módulo 6.** El enlace está acá porque el error que
> costó un día fue justamente que §13 no estuviera enlazada desde ningún lado, y el
> informe de auditoría pasó una jornada listando como *"bloqueado por una decisión"*
> diez hallazgos que ya estaban decididos. **Las dos secciones se leen juntas y ganan
> sobre el resto del documento.**

> ### ✅ Estado de implementación — 2026-08-14
>
> **Las seis decisiones de "Reglas de negocio que faltaban en la base" ya están escritas
> en `V9__reglas_cerradas_en_la_seccion_13.sql`**, con 35 casos nuevos en
> `pruebas-reglas-negocio.sql` (86 → **121**, todos verdes): los dos "nadie en dos salas a
> la vez", la anulación de `egreso` y `venta_equipo` —que habilita prohibirles el
> borrado—, el nivel que no retrocede sin firma, `sala.activa` con significado, y el tope
> de clases contratadas.
>
> **Excepción, y es la única: la seña (P8). ✅ CERRADA el 2026-08-15** — ver abajo.
>
> Lo demás de esta sección —producto, landing, Módulo 1— es trabajo de la tanda 7 y de
> `inscripcion`, todavía pendiente.

### ✅ P8 / DB-04 — La seña. Cerrada el 2026-08-15

**La regla, como la dio Ignacio:** *"Todo se debe señar antes, todo. Menos mix y
mastering, que eso lo va decidiendo Ghezz. La seña es el 50% del total."*

| | |
|---|---|
| **Alcance** | **Todos los tipos de uso**, con una excepción |
| **Excepción** | `MIX_MASTERING`. Lo decide Ghezz caso por caso; **el sistema no exige seña** para ese tipo de uso (respuesta por defecto: *no*) |
| **Monto** | **50% del total** |
| **Momento** | Antes de que exista la reserva. No hay autorización que lo saltee (P8) |

**Cómo se traduce eso a la base, que es donde la regla vive:**

- **"Todo se seña antes" = ninguna `reserva` existe sin dinero detrás**, verificado al
  COMMIT. El dinero puede llegar por dos caminos, y los dos cuentan:
  1. Un `pago` que apunta a la reserva (`pago.id_reserva`) — el caso del alquiler de
     cabina y de la grabación de set.
  2. La **inscripción que cubre esa clase**, a través de
     `reserva_participante.id_inscripcion`. **Un alumno que ya pagó su curso no paga una
     seña por cada clase**: eso sería cobrarle dos veces, y contradice que el curso se
     paga entero por adelantado. La plata entró antes, que es lo que la regla pide.
- **El 50% se puede verificar en la inscripción y todavía no en la reserva.**
  `inscripcion.precio_total` existe, así que ahí el 50% es una cuenta. **`reserva` no
  tiene precio** —el de un alquiler sale de las horas por una tarifa que todavía no está
  en el sistema (P13, Módulo 3)—, así que hasta que exista ese precio, la base puede
  exigir *que haya un pago* pero no *que sea el 50%*. Esa mitad la impone la pantalla, y
  la base la toma cuando `reserva` tenga su precio.

**Qué falta hacer, y cuándo:** la migración (`CONSTRAINT TRIGGER … DEFERRABLE INITIALLY
DEFERRED` sobre `reserva`, la herramienta que ya dejó anotada la cabecera de `V9`).

> ### ⚠️ Corrección del 2026-08-16 — la premisa de arriba no se cumplió
>
> Esta ficha decía que la migración iba *"con el arranque del Módulo 2"* porque el
> trigger **obliga a que la reserva y su pago entren en la misma transacción**. El
> Módulo 2 se construyó, y **no** se construyó así: el alta crea la `reserva` sin
> participantes y la gente se anota después, en otro pedido. Está decidido y escrito
> en `AltaReservaRequest` — *"cargar la reserva y anotar a la gente son dos gestos
> distintos también en la pantalla"*.
>
> Con ese flujo, un trigger que al COMMIT exija dinero detrás de la reserva **rechaza
> todas las altas de clase**: en ese instante no hay participante, así que no hay ni
> inscripción que la cubra ni pago que la apunte. Se detectó **antes** de escribir la
> migración, no después.
>
> ### ✅ DECIDIDO el 2026-08-16: el alta de una clase crea la reserva y su participante juntos
>
> De las tres salidas posibles se elige **adaptar el flujo, no la regla**. Las otras
> dos —correr el trigger al anotar al participante, o exigir seña solo a los usos que
> no son clase— convierten la invariante en condicional: *"toda reserva tiene plata
> detrás, salvo que esté vacía"* / *"salvo que sea una clase"*. **Una regla con
> excepciones que dependen del estado es la que después nadie sabe si se está
> cumpliendo**, y esta regla existe justamente porque el cliente dijo *"no hay
> excepción"* (P8).
>
> **Qué hay que hacer, en este orden:**
>
> 1. **✅ HECHO el 2026-08-17. `AltaReservaRequest` acepta una lista de participantes
>    opcional**, y `ReservaService.alta` los inserta en la misma transacción.
>    Opcional y no obligatoria: un alquiler de cabina no tiene participantes y su
>    plata llega por `pago.id_reserva`.
> 2. **✅ HECHO el 2026-08-17. El alta del calendario carga alumno + inscripción
>    junto con la clase.** El selector salió del formulario de "Anotar a alguien" a
>    un hook que usan los dos. Pide alumno **solo si el tipo de uso es clase y solo
>    en el alta**, y esa es la mitad de la seña que impone la pantalla.
> 3. **✅ HECHO el 2026-08-17: `V10__sena_obligatoria.sql`.** El
>    `CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED` sobre `reserva`.
>
> **Y este plan estaba incompleto en un punto que casi cuesta caro:** hablaba solo
> de las clases. Un **alquiler de cabina o una grabación de set no tienen
> inscripción que los cubra**, así que `V10` los dejaba incargables — el pago tiene
> que apuntar a la reserva y no puede apuntar a algo que todavía no existe. Se
> resolvió simétrico al paso 2: `AltaReservaRequest` acepta también una `sena`
> (`AltaSenaRequest`), que entra en la misma transacción como `SENADO`.
>
> **El otro tropiezo, para no repetirlo:** un trigger diferido **no se dispara en
> una transacción que se revierte**, así que `mvn test` lo ignoraba por completo y
> la suite quedaba verde con la regla sin verificar. Se fuerza con
> `SET CONSTRAINTS reserva_con_sena IMMEDIATE` tras un `flush()`. Las suites SQL
> tenían el problema espejo y hubo que darle plata a 21 sentencias. Todo el detalle
> está en `docs/sistema-gestion-plan.md` §6d.

> ### ✅ Y LA OTRA MITAD, decidida el 2026-08-17: **la seña SE DEVUELVE**
>
> `V10` cerraba solo el nacimiento de la reserva y dejaba anotado como hueco
> deliberado que la invariante se podía romper después, anulando el pago —
> *"cerrarlo es una decisión del Módulo 3 sobre devoluciones"*. Ignacio la tomó:
> **si se cancela una reserva, la seña se devuelve.**
>
> Con eso la regla se termina de escribir (`V11`): **toda reserva que OCUPA SU
> FRANJA tiene dinero detrás.** Y no es la excepción por estado que esta misma
> ficha rechazó doce líneas más arriba: `NOT IN ('CANCELADA','REPROGRAMADA')` no es
> una categoría inventada para esta regla, es la **definición canónica de `V1`** que
> ya usan el EXCLUDE de solapamiento, los triggers de bloqueo y el informe de uso.
> La prueba de que es la lectura correcta: con la otra, **cancelar sería imposible**
> — la base obligaría a no devolver nunca, decidiendo por su cuenta una política
> comercial que el cliente decidió al revés.
>
> El orden queda **cancelar primero, devolver después**; al revés el trigger lo
> rechaza y el mensaje dice qué hacer. `V11` agrega además el esquive: cancelar,
> cobrar la devolución y descancelar.
>
> **Ojo con el orden de escritura de Hibernate**, que en este módulo ya mordió cuatro
> veces: el trigger es `DEFERRABLE INITIALLY DEFERRED` justamente para que corra al
> COMMIT y no le importe si el `reserva_participante` se insertó antes o después que
> la `reserva`. Eso es lo que hace que la opción 1 sea implementable.

### Producto y landing

- **P34 — Duración de los cursos. RESUELTO, y coincide con §1:** el formato es
  **1:30 por clase, una vez por semana**. DJ son 8 clases (≈2 meses) y Producción 16
  (≈4 meses). Lo que **no** existe es una fecha de fin garantizada: como ninguna clase se
  pierde (P2), el curso termina cuando se dictaron las clases contratadas y eso depende
  del alumno. La landing tiene que publicar **el formato y la cantidad de clases**, y si
  menciona meses, que sea como estimación. Las duraciones que publica hoy contradicen
  §1 y salen.
- **P31 — Mix & Mastering. RESUELTO: es un SERVICIO, no un programa.** La landing lo
  publica como un curso que no existe: sale de los programas, de los títulos, del
  `llms.txt` y del JSON-LD.
- **Precios. RESUELTO: van los de la landing, con salvedad**, hasta que se confirmen.
  Se publican como referencia ("desde"), no como precio cerrado.
- **Firma del blog. RESUELTO: "Equipo La Juanita".** Las seis notas están inventadas y no
  las firma ninguna persona real — hay que corregir también el `author` del `BlogPosting`.
- **Email `hola@lajuanitastudio.com`. RESUELTO: NO EXISTE.** Es un placeholder inventado
  por la IA. Sale del JSON-LD y de todos lados hasta que haya una casilla real.
- **Datos del negocio. CONFIRMADOS:**
  | Dato | Valor |
  |---|---|
  | Dirección | **Office Park Quatro — Colectora Oeste Ramal Pilar 209, locales 5 y 6, B1669 Pilar, Provincia de Buenos Aires** |
  | Teléfono | **+54 9 11 5310-8738** |
  | Año de fundación | **2021** |
  | Horario de atención | **10:00 a 18:00** |

  **Dirección completa, confirmada el 2026-08-14.** El nombre del complejo es *Office Park
  **Quatro***; "Office Park Pilar" del §1 es la forma corta y queda superada por esta.
  Desglosada para el `PostalAddress` del JSON-LD:

  | Campo | Valor |
  |---|---|
  | `streetAddress` | Colectora Oeste Ramal Pilar 209, locales 5 y 6 (Office Park Quatro) |
  | `addressLocality` | Pilar |
  | `postalCode` | B1669 |
  | `addressRegion` | Provincia de Buenos Aires |
  | `addressCountry` | AR |

  Con esto **ya no queda ningún dato del negocio sin confirmar**: el `LocalBusiness` se
  puede publicar entero, sin campos en `null`.

### Módulo 1 e `inscripcion`

- **P4 — Los alumnos informales de Ghezz. RESUELTO: ENTRAN al sistema** como alumnos
  normales. Tenerlos afuera reproduce el problema que el sistema viene a resolver.
- **P5 — Nivelación. RESUELTO: la hace el formulario de la landing**, y **Micaela puede
  modificar el nivel después** (el alumno termina DJ inicial y pasa a intermedio).
  *Dependencia:* hoy los formularios de la landing no envían nada; esto se completa cuando
  se conecten al backend (~septiembre).
- **P11 — Horario del estudio. RESUELTO: 10:00 a 18:00**, y **no se usa después de
  medianoche**. Esto cierra DB-10: el modelo `DATE` + dos `TIME`, que impide que una
  reserva cruce la medianoche, es el correcto y no hay que tocar nada.
- **Clases consumidas. RESUELTO:** son 8 clases y **una clase solo se consume cuando se
  toma**. Si no se dictó, se recupera y sigue habiendo 8. Implementación: cuentan las
  participaciones cuya reserva **no** esté `CANCELADA` ni `REPROGRAMADA`. Con esto se puede
  escribir por fin la regla *"no consumir más clases que las contratadas"*.

### Reglas de negocio que faltaban en la base

- **Dos salas a la vez. RESUELTO: NADIE**, ni profesor ni alumno. Cada profe con su
  reserva, en su sala, con su alumno. Van dos `EXCLUDE` más, uno por `(profesor, período)`
  y otro por `(alumno, período)`. *(Más estricto que lo que se había propuesto: se había
  sugerido dejar el del profesor como advertencia.)*
- **`sala.activa = FALSE`. RESUELTO por decisión técnica:** significa **que la sala no
  acepta reservas nuevas a futuro**; las reservas ya cargadas siguen valiendo. Hoy la
  columna no hace nada. *(Viene del modelo original del cliente y nunca se le había
  asignado significado — de ahí la pregunta.)*
- **`egreso` y `venta_equipo`. RESUELTO: llevan estado de anulación**, mismo patrón que
  `pago` (autor + fecha + motivo obligatorios). Recién con eso se les puede prohibir el
  borrado, que es lo que V6 §7 dejó pendiente.
- **Quién paga. RESUELTO: el pagador NO tiene que ser el titular.** Un padre puede pagar
  el curso del hijo. Queda documentado, no se impone nada.
- **P8 — Reservar sin seña. RESUELTO, y más fuerte de lo que decía la propuesta: NO HAY
  EXCEPCIÓN.** *"Si no se paga la seña, no se reserva."* La cláusula *"excepto autorización
  explícita"* del §4 queda **sin efecto**: no existe tal autorización. La reserva se crea
  junto con su seña, en una transacción.
- **El nivel que no retrocede. RESUELTO por decisión técnica:** mismo patrón que la
  anulación de un pago — columnas de autor y motivo, exigidas por un trigger cuando el
  nivel baja. Es el molde que el esquema ya usa cuatro veces.

### Proyecto

- **Titularidad. RESUELTA: el código es de Ignacio Lawson.** Si la propuesta firmada dice
  otra cosa, gana la propuesta.
- **Enumeración de teléfonos en el registro. RESUELTA: se deja como está**, con el mismo
  argumento que ya está escrito para el email.
- **Cliente HTTP compartido entre landing y platform. RESUELTO por decisión técnica: se
  duplica.** Son ~40 líneas; un `packages/` compartido a esta escala cuesta más de lo que
  ahorra.
- **Los dos `prompt-*.md` de la raíz. RESUELTO: movidos a `docs/auditoria/`.**

---

## 14. Decisiones cerradas el 2026-08-19 — Mix & Mastering

**Las tres preguntas que trababan el Módulo 6, contestadas por Ignacio antes de
arrancarlo, más tres ratificaciones de cosas que el esquema ya había asumido.** Esta
sección gana sobre lo que diga §9 más arriba, igual que §13 gana sobre el resto.

### ✅ P23 — Los audios NO pasan por el sistema

**Siguen yendo por WeTransfer / Drive / lo que Ghezz use. El sistema guarda el link.**

Es la respuesta que el esquema ya había asumido: `trabajo_mastering` modela los tres
entregables como `VARCHAR(500)` —`url_material_cliente`, `url_master`,
`url_premaster`— desde `V1`. **No hay migración que hacer.**

**Lo que esta respuesta cambia de verdad, y hay que tenerlo escrito:**

- **La retención es del link, no del archivo.** El sistema no muestra `url_premaster`
  hasta que el pago esté registrado. Eso es un bloqueo real **mientras el sistema sea
  donde se publica el link**; lo que no puede es impedir que el archivo salga por otro
  canal. Para eso está la salida registrada de P28, que existe justamente porque el
  cliente dijo que la iba a necesitar.
- **El `StorageService` de §2.4 deja de trabar este módulo.** Sigue debiéndose —lo
  necesitan la descarga de comprobantes (Módulo 3) y el material de clase (Módulo 5,
  que hoy también va por link)— pero **ya no es un prerrequisito del M6**, que era la
  única razón por la que este módulo parecía caro.
- **Corrige a §2.4**, que decía que las entregas de M&M pasan por el `StorageService`.
  No pasan. Esa frase y `V1` se contradecían desde el primer día y nadie lo había
  marcado; gana `V1`, que es donde la decisión está implementada.
- **Y saca al M6 de la decisión de hosting de octubre.** El presupuesto de ~US$10/mes
  contaba con almacenamiento en capa gratuita, que no aguanta audio; sin audio
  adentro, el módulo no depende de esa decisión.

### ✅ P22 — Se entrega el master, se retiene el premaster

**Confirmado lo que decía la entrevista, textual:** *"Yo entrego el master. Cuando me
pagan, recién ahí les doy el premaster, que es lo que necesitan para discográficas."*

**Gana sobre la propuesta comercial**, que hablaba de entregar un *"premix"* para
revisión. Eran tres nombres para dos archivos, y quedan dos: **master** (se entrega) y
**premaster** (se retiene). El archivo de revisión durante el proceso es el master.

Esto ratifica lo que `V1:531-537` ya había escrito y lo que `V6 §6` construyó encima
—el trigger `pago_sostiene_premaster`, que impide anular el único pago que respalda un
premaster ya liberado—. **Era la respuesta más cara si salía al revés**: las columnas
tienen un trigger encima y las migraciones no se editan.

### ✅ P28 — La excepción existe, y deja rastro

**Se puede liberar el premaster sin el pago cargado, escribiendo el motivo, y queda
registrado quién lo hizo.** Es lo que `V1` ya modela con `liberado_sin_pago`,
`motivo_liberacion` e `id_usuario_libera`, más el CHECK `trabajo_liberacion_justificada`
que exige el motivo.

El razonamiento, que conviene no perder: **un bloqueo sin salida se esquiva por
afuera.** Ghezz dijo *"con gente cercana soy más flexible"* y *"a clientes con mucha
exposición no les podés exigir el pago de la misma forma"*. Si el sistema no tuviera
salida, la salida sería volver al WhatsApp y el módulo entero dejaría de reflejar la
realidad. La salida existe **y cuesta una frase escrita**, que es exactamente el
diseño de la anulación de pagos (`V7`) y de la baja de nivel (`V9`).

**Quién puede usarla: administración** — el mismo `@PuedeOperar` que registra un pago.
Ghezz la usa como STAFF y Micaela también. No se restringe a ADMIN: quien puede
cobrar puede decidir no cobrar todavía, y lo que hace auditable la decisión no es el
rol sino la firma.

### ✅ La revisión de más se registra — decidido al construir el módulo

**Dos reglas del propio proyecto se contradecían y había que elegir una.** §9
tiene, entre las reglas duras confirmadas: *"alerta al superar las revisiones
incluidas"*. `V6` §3 había puesto un CHECK que lo hace imposible:
`revisiones_realizadas <= revisiones_incluidas`. **No se puede avisar de algo que
la base rechaza.**

Gana §9, por la misma razón por la que P22 se resolvió a favor de la entrevista:
**`V6` §3 es una inferencia de la auditoría y §9 es una regla que el cliente
confirmó.** La auditoría leyó el campo como un contador que no puede dar un número
imposible; el negocio lo usa para contestar otra cosa —*"¿este trabajo se pasó de
lo que se vendió?"*— y esa pregunta no se puede contestar si el hecho no se puede
registrar.

Y encaja con lo que el módulo ya decide dos veces: **Ghezz trabaja con
flexibilidad deliberada según el cliente**. Una cuarta revisión a un cliente
cercano es el mismo caso que liberar sin pago — pasa, y lo que el sistema tiene
que hacer es dejarlo escrito, no negar que pasó.

`V15__la_revision_de_mas_se_registra.sql` saca el techo. Queda en pie
`trabajo_revisiones_no_negativas` (`V1`): un número negativo sigue siendo un dato
imposible. La alerta la da la pantalla, que pinta *"4 de 3 revisiones"* en rojo.

### ✅ El portal de M&M es de solo lectura

La sección *Mix & Mastering* del portal existe en el menú desde el día uno, en
`disponible: false`. Con el módulo construido pasa a `true` y muestra **mis
trabajos**: estado, revisiones usadas, el master, y **el premaster cuando está
liberado**.

**No pide trabajos, y es una decisión, no una etapa.** El canal real es WhatsApp y
**la mayoría de los clientes de M&M son externos sin cuenta** (§9: se registran con
nombre y contacto). Un formulario de pedido serviría a una minoría y agregaría un
segundo ciclo de vida —como el de `solicitud_reserva`— para sostenerlo. Si algún
día se construye, el estado `A_CONFIRMAR` ya existe para eso.

**La entrada del menú se llama ahora "Mis trabajos"**, no "Mix & Mastering":
administración ganó una sección con ese nombre y dos etiquetas iguales en grupos
distintos se leen como la misma pantalla. El título adentro sigue diciendo Mix &
Mastering, que es como el cliente conoce el servicio.

### ✅ Las tres ratificaciones

| | Lo confirmado | Dónde ya estaba |
|---|---|---|
| **Revisiones incluidas** | **3**, iguales para los tres tipos de trabajo | `trabajo_mastering.revisiones_incluidas DEFAULT 3` |
| **Moneda** | Se cotiza en **USD**; se puede cobrar en pesos, y la cotización que vale es la del día del cobro | `moneda DEFAULT 'USD'`, sin exigir cotización al presupuestar |
| **Tipos de trabajo** | **mix / master / mix+master**, no falta ninguno | `CHECK (tipo_trabajo IN ('MIX','MASTER','MIX_MASTER'))` |

**Ninguna de las seis decisiones necesita una migración**: el esquema de `V1` había
apostado por todas y acertó. Lo que queda del Módulo 6 es construcción.

---

## 15. Decisiones cerradas el 2026-08-20 — Módulos 7 y 8

**Las cuatro preguntas que trababan el Módulo 7 y el Módulo 8, contestadas por
Ignacio antes de arrancar el 7.** Se leen junto con §13 y §14: las tres secciones
ganan sobre lo que digan §10 y §11 más arriba, y esta gana sobre las otras dos
donde se contradigan.

Es la tercera vez que se hace lo mismo —contestar antes de escribir código— y es lo
que hizo que el Módulo 6 no se frenara nunca.

### ✅ P38 — El contrato del sello es un ARCHIVO que se sube

**Es la respuesta cara y es la correcta**, y el esquema la venía asumiendo desde
`V1`: `contrato_sello.archivo_path` es `VARCHAR(500) NOT NULL` y la columna se llama
*path*, no *url*.

La regla dura del módulo es *"no se publica un release sin contrato adjunto"*. Con un
link, esa regla se degrada a *"hay un link cargado"* — y un contrato es el respaldo
legal de un lanzamiento: un link al Drive de otro se cae, se mueve o se revoca sin
que el estudio se entere, y el sistema seguiría diciendo que está todo bien. Es
justamente la diferencia que P23 pudo ignorar (un audio que ya viajó por WeTransfer
no necesita quedar guardado) y que acá no se puede.

**El peso no es el problema y conviene decirlo, porque fue la duda al preguntarlo:**
un contrato firmado escaneado pesa entre 100 KB y 2 MB; doscientos contratos no
llegan a 500 MB. El costo está en otras tres cosas, y las tres hay que saberlas
**antes** de planificar el módulo:

1. **El `StorageService` de §2.4 se construye ANTES del resto del Módulo 7.** Subida,
   almacenamiento y —lo que de verdad importa— **descarga autenticada**: un contrato
   tiene datos de un tercero y no puede quedar colgado de una URL adivinable.
2. **⚠️ El backup deja de alcanzar solo, y esto es lo más fácil de olvidar.**
   `scripts/backup.sh` hace `pg_dump` y nada más. Con archivos en disco, la base queda
   respaldada y los contratos no — y eso se descubre el día que hay que restaurar. Hay
   que sumarle los archivos al script **y volver a ensayar el restore**
   (`docs/operacion.md` §2), porque un backup que nunca se restauró es una intención.
3. **Entra en la decisión de hosting de octubre**: hace falta disco persistente, no un
   contenedor efímero que se reinicia y se lleva los PDF.

**Y se amortiza en dos módulos, no en uno:** el `StorageService` le paga además la
deuda abierta del Módulo 3 —la descarga de comprobantes— que sigue pendiente desde
agosto por esta misma pieza.

### ✅ P24 — Los artistas NO entran al sistema

**Todo administrativo.** `artista` es una ficha que administra el estudio; lo que pasa
con un release se lo cuenta Ghezz al artista como hasta ahora.

`artista.id_usuario` existe y es nullable desde `V1` —*"queda preparado a futuro"*— y
**se queda así**: no hay migración que hacer y no hay portal que construir. El Módulo
7 es, por esta respuesta sola, **la mitad de grande** de lo que podía haber sido: sin
portal propio, sin decidir qué ve un artista de su release, y sin un tercer eje de
autorización por identidad.

### ✅ P25 — El seguimiento post-lanzamiento SÍ entra, cargado a mano

Entra una sección de **"dónde sonó"**: una lista por release de apariciones —sets,
radios, playlists— **cargadas a mano**, ordenables por popularidad.

**Y la mitad que la respuesta descarta explícitamente, que es la que importa que esté
escrita: nada de conexión a otras plataformas.** No hay integración con Spotify, ni
con SoundCloud, ni con nada que busque solo. Eso son integraciones que no están en el
alcance ni en la propuesta, y la pregunta se hizo con las dos mitades juntas
justamente para que la respuesta no significara dos cosas distintas.

Es una tabla chica y una pantalla chica, y se construye dentro del Módulo 7.

**Ratificado el 2026-08-20**, con una condición de alcance que conviene tener escrita:
*"si en el futuro no lo usan, que no lo usen y fue"*. O sea que **es una sección que
puede quedar vacía sin que eso sea una falla del sistema** — la pantalla tiene que
leerse bien con cero filas, como el informe de uso de salas con una sala sin uso.

**Y la sub-pregunta de qué mide "popularidad" queda cerrada acá, por decisión
técnica y no del negocio** (Ignacio: *"no te hagas mucho la cabeza con eso"*): el
orden sale de un **tipo de aparición con jerarquía fija** —radio > set > playlist >
otro— y después por fecha. Es data, no una métrica inventada, y no obliga a nadie a
estimar un número de alcance a ojo que después nadie va a poder defender. Si algún día
hace falta un número, se agrega; ordenar por un campo que existe es más barato que
mantener uno que se llena mal.

### ✅ P26 — La tasa de retención

**Retenido es quien contrata un segundo servicio o programa dentro de los 10 meses de
haber contratado el primero.**

- **Cuenta cualquier cosa contratada** —curso, mentoría, alquiler de cabina, Mix &
  Mastering— **menos la venta de equipos**, que es una operación de mostrador y no una
  relación con el estudio.
- **Pausar y volver NO es retención.** Y es coherente con lo anterior sin necesidad de
  una regla aparte: retomar una inscripción pausada es *la misma* inscripción, no un
  segundo contrato. La definición ya lo deja afuera sola.

**Los 10 meses se cuentan desde la FECHA DEL PRIMER SERVICIO CONTRATADO**
(ratificado el 2026-08-20), no desde que terminó. Para un curso de producción de 16
clases que dura cuatro meses, eso deja unos seis meses de ventana efectiva después de
terminar — es la lectura literal y es la que queda.

> **Lo único que falta y es del Módulo 8, no de ahora: el denominador.** Un porcentaje
> necesita saber sobre quiénes se calcula, y hay una trampa concreta que conviene no
> pisar: **quien contrató hace tres meses todavía no puede contar como perdido**, su
> ventana de 10 meses sigue abierta. Si entra al denominador, la tasa de retención
> baja sola cada vez que el estudio suma alumnos nuevos — o sea que **crecer se vería
> como empeorar**, que es exactamente lo contrario de lo que ese número tiene que
> decirle a la dirección.
>
> La lectura por defecto, entonces: **el denominador son los que contrataron su primer
> servicio hace más de 10 meses**, o sea aquellos cuya ventana ya cerró y sobre los que
> la respuesta ya es definitiva. ~~Se ratifica al construir el Módulo 8.~~ **Ratificado
> el 2026-08-20 al construirlo, tal cual estaba anticipado — y construirlo encontró una
> segunda trampa que acá no estaba: las clases de un curso no son servicios contratados,
> o la tasa daría casi 100%. Ver §11.**

### 📌 Y dos cosas más que se decidieron el mismo día

**1 · Los retoques técnicos de §6f van después del MVP completo, no de a uno por
módulo.** Decidido por Ignacio: primero los ocho módulos, después se retoca de a uno.
Esto **extiende** la decisión del 2026-08-19 —que ya mandaba el rediseño del front al
final— y ahora cubre también los cinco pendientes de esa lista, que hasta hoy podían
hacerse "mientras se espera algo". No se hacen mientras se espera nada.

Sigue en pie el triage que sí importa y que esta decisión **no** toca: **lo que toca el
esquema o una regla se hace en su módulo y no se pospone**, porque las migraciones son
inmutables y se acumulan.

**2 · El disparador automático de avisos se construyó** (2026-08-20, `V17`, paquete
`com.lajuanita.backend.aviso`). Era la pieza que pedían el Módulo 4, el 6 y el 7 por
separado. Se hizo **antes** del Módulo 7 y no adentro, para que el aviso de los 7 días
previos al lanzamiento sea una regla más y no infraestructura a mitad de camino — que
es exactamente lo que pasó dos módulos seguidos con el `StorageService`.

### ✅ Las ratificaciones, contestadas el mismo día

**Las cuatro se contestaron el 2026-08-20**, y dos de ellas cambian el trabajo de
verdad. Quedan en este orden porque así se preguntaron.

**5 · El código de release lo genera el sistema, y los releases viejos se cargan.**
Correlativo, formato `LJ` + número (`LJ01`, `LJ02`, `LJ03`…). Las dos consecuencias
son de implementación y no de negocio, pero hay que respetarlas:

- **El correlativo no puede arrancar en 1.** Si se cargan los lanzamientos anteriores,
  el próximo generado tiene que salir por encima del más alto que exista, no por
  encima de cuántas filas hay. Contar filas rompe el día que se borre o falte una.
- **El código tiene que poder escribirse a mano para los viejos.** Un release de 2023
  tiene el número que tuvo, no el que le tocaría hoy. O sea: la columna es libre y la
  generación es una ayuda del alta, no una restricción de la tabla.

> Detalle cosmético sin cerrar, y no traba nada: **cuántos dígitos**. El alcance
> escribe `LJ020` (tres) y la ratificación `LJ01` (dos). Como los viejos se cargan a
> mano, la columna acepta cualquiera de los dos igual; lo único que decide el relleno
> es cómo se ve el próximo que genere el sistema.

**6 · Un release SÍ puede caerse después de confirmado.** *"Podría, no es lo usual,
pero sí."*

**Esto es una migración y se hace dentro del Módulo 7**, no después: hoy el estado de
un release solo avanza (trigger de `V1`) y no existe un `CANCELADO`. La forma correcta
es **la misma que ya tiene M&M**: `CANCELADO` **fuera de la escalera**, alcanzable
desde cualquier estado, y sin volver — no es un paso atrás en el ciclo de vida, es
salirse de él. Y como en M&M, **cancelar es la única forma de dar de baja un release**,
porque borrar no es una opción en este esquema.

Que sea raro es un argumento a favor de tenerlo, no en contra: lo que pasa una vez por
año es justamente lo que nadie va a poder anotar en ningún lado el día que pase.

**7 · ✅ El aviso se ve adentro del sistema. No se construye ningún envío hacia
afuera.** (Repreguntado con un ejemplo concreto el 2026-08-20 y confirmado: la
pregunta original estaba mal hecha y su respuesta admitía las dos lecturas.)

**Con esto los tres avisos automáticos quedan definidos igual y la bandeja es el único
canal**, que es lo que el Módulo 4 ya había decidido para las notificaciones y ahora
vale también para lo que dispara la máquina. La consecuencia de diseño es una y hay
que sostenerla: **el texto del aviso tiene que bastarse solo**. Nadie lo va a recibir
en el celular con un "entrá a ver", así que dice el hecho completo — *"Juan debe
$50.000 desde hace 12 días"*, no *"tenés una deuda para revisar"*.

**Lo que esta respuesta NO cierra para siempre**: el canal real del estudio sigue
siendo WhatsApp, y la integración con WhatsApp Business API sigue siendo el
fast-follow de mayor valor después de la entrega. El día que exista, estos tres avisos
son exactamente lo que tiene para mandar — el disparador ya decide *qué hecho, a
quién y una sola vez*, que es la parte que haría falta igual.

**8 · Exportar a PDF y Excel: entra, y con una vara alta.** Ignacio: *"exportar a
ambos, intentemos que esa parte sea buena, tipo poder exportar datos específicos, que
sea bien trazable"*.

Es la respuesta que más agranda el Módulo 8, así que conviene escribir qué significa
antes de construirlo:

- **Se exporta lo que estás mirando, no "todo".** *"Datos específicos"* quiere decir
  que la exportación hereda los filtros de la pantalla —período, sala, disciplina, lo
  que sea— y no un volcado fijo que después hay que recortar a mano en Excel.
- **"Trazable" es una cabecera, y es la parte que casi siempre se olvida.** Cada
  archivo exportado dice **qué filtros lo generaron, cuándo y quién lo pidió**. Sin
  eso, dos exportaciones del mismo tablero con un mes de diferencia son dos planillas
  que no se pueden comparar ni explicar — y ese archivo va a terminar en una reunión
  de socios, que es el único lugar donde importa poder decir de dónde salió cada
  número.
- **Es una dependencia nueva y hay que elegirla al planificar el módulo**, no a mitad:
  Excel y PDF no se generan con la misma librería.
- **Excel de verdad, no un CSV con otro nombre.** Si va a haber una sola exportación
  buena, tiene que abrirse con los tipos bien (fechas como fechas, importes como
  números) o el primer `SUM` que alguien haga da cualquier cosa.


---

## 16. Decisiones cerradas el 2026-08-29 — la etapa de mejoras

> **Esta sección gana sobre §13, §14 y §15**, por lo mismo que aquellas ganan sobre el
> plan: es posterior. Y **`docs/mejoras.md` §9 y §10 ganan sobre esta** en lo que sea
> *qué se hace ahora*; acá vive lo que es una **decisión del negocio**.

### ✅P9 — Sí: el profesor pide mover su clase, con el mismo botón que el alumno

Estaba abierta desde el alcance del Módulo 2 —*"¿le damos al profesor el mismo botón de
solicitar reprogramación que al alumno, o sigue siendo un mensaje a Mica?"*— y era la
única que bloqueaba construir esa pantalla. **Contestada por Ignacio: el mismo botón.**

La tabla de "quién puede qué" del Módulo 2 queda así, con el ❓ resuelto:

| | ADMIN | DIRECTIVO | STAFF | Profesor | Alumno |
|---|---|---|---|---|---|
| Solicitar reprogramación | — | — | — | **✅** | ✅ |

Tres cosas que la respuesta arrastra y conviene tener escritas:

- **Es el mismo endpoint y el mismo componente**, no un circuito paralelo. Lo único que
  cambia es desde qué pantalla se entra: el alumno desde *Mis reservas*, el profesor
  desde *Mi agenda*. Un segundo circuito habría duplicado la regla de quién puede pedir.
- **El profesor sigue sin mover reservas**, y eso no cambió: mover una clase revisa
  solapamientos y arrastra la seña. Pide; mueve administración. La regla dura del
  Módulo 4 —*"las solicitudes de reprogramación no son automáticas: las aprueba
  administración"*— vale igual para él.
- **Lo que la respuesta destraba no es una pantalla, es un dato.** Hoy el profesor le
  avisa a Micaela por WhatsApp y **por qué se movió una clase no queda escrito en
  ningún lado**. El motivo es exactamente lo que `solicitud_reprogramacion` guarda desde
  `V1`, y hasta ahora esa columna no la escribía nadie.

### ✅ Y una decisión de alcance que este circuito obligó a tomar: acá NO se aprueba "tal como se pidió"

El Módulo 4 dejó escrito, para los pedidos de sala, que **una solicitud se aprueba tal
como se pidió** — no se puede aprobar *"pero a las 18"*. **Para las reprogramaciones la
regla es la contraria, y no es una excepción inventada: la impone la tabla.**
`solicitud_reprogramacion.fecha_alternativa_solicitada` es un `DATE` **opcional**, sin
hora y sin sala. No alcanza para crear nada.

La diferencia de fondo es **quién puede saber qué**: el que pide una cabina elige una
franja libre que el portal le muestra (`GET /api/me/disponibilidad`); el que pide mover
su clase **no puede saber** qué sala queda libre ni de qué profesor depende. Pide un día,
o ni eso, y el horario lo pone administración al aprobar.

> Por eso **aprobar es mover**: el "sí" es la franja nueva, no un botón. Un pedido
> marcado como aprobado con la clase todavía en el día que la persona dijo que no podía
> no aprobó nada, y nadie se entera — porque el aviso de que la clase se movió solo sale
> si la clase se movió.
