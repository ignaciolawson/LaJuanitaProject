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
> Estado al 2026-08-11: esqueleto completo de los 8 módulos, profundidad alta en 1–3
> (septiembre/octubre), trazo grueso en 6–8 (se detallan en octubre).

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

**⚠️ Corrección al plan del 2026-08-10: vuelven a ser cuatro roles, no tres.**
El plan había colapsado los permisos en `ADMIN` / `STAFF` / `USUARIO`. La propuesta
comercial promete explícitamente **"cuatro roles diferenciados: administrador,
directivo, profesor y alumno"**, y el Módulo 8 distingue: *"Solo directivos y socios
tienen acceso al dashboard completo. Micaela puede ver el resumen financiero básico."*
Eso es una diferencia real de permisos, no un matiz. Queda:

| Rol | Quién | Puede |
|---|---|---|
| `ADMIN` | Ignacio, dirección técnica | Todo, incluida la administración de usuarios y roles |
| `DIRECTIVO` | Chapa & Castelo, familia Oppel, Najles | **Lee todo** (dashboard completo, cualquier alumno, catálogo del sello). **No escribe nada.** |
| `STAFF` | Micaela, Ghezz | Opera: alumnos, reservas, pagos, M&M, sello. Ve el resumen financiero **básico**, no el dashboard ejecutivo completo |
| `USUARIO` | Alumnos, clientes ocasionales, profesores | Solo lo propio |

Los profesores son `USUARIO` **con fila en `profesor`** — su acceso a "mis alumnos"
viene de la relación, no del rol. Ghezz es `STAFF` **y** `profesor` **y** puede
reservarse una cabina para él: las tres cosas a la vez, sin contradicción.

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

Comprobantes, contratos, material de clase, entregas de M&M, fotos de perfil.
Todos pasan por la misma pieza intercambiable (`StorageService`), en disco local
durante el desarrollo. **Los comprobantes no se eliminan: se marcan como inválidos.**

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

### 2.5 Auditoría

- El historial de clases **no se borra**, se edita dejando registro.
- Toda modificación de reserva guarda **quién** y **cuándo**.
- Los estados de M&M y de release **solo avanzan, no retroceden**.

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

### 3.6 ⚠️ Lo que la landing vende y el modelo no contempla

Revisión de `apps/landing/src/data/` contra los 8 módulos, hecha el 2026-08-11.
**Ojo: gran parte de la copy y todos los precios de la landing son placeholder
inventado** (ver `apps/landing/CLAUDE.md`), así que algunas de estas diferencias
pueden ser invención mía de cuando escribí la landing, no realidad del negocio.
Por eso varias quedan como pregunta y no como hecho.

| Lo que vende la landing | Estado en el modelo |
|---|---|
| **Mix & Mastering como *curso*** (3 meses, 1 clase semanal) | 🔴 El modelo solo tiene M&M como *servicio* (Módulo 6). **Son dos cosas distintas con el mismo nombre.** Ver ❓P31 |
| **Modalidad "virtual en vivo"** en los dos programas grandes | 🔴 Todo el modelo asume sala física; `reserva.id_sala` es obligatorio. Ver ❓P32 |
| **Precios mensuales** ("Desde $85.000/mes") | 🔴 El relevamiento dice seña + saldo total antes de arrancar, no cuotas. Ver ❓P33 |
| **Duración de los cursos** (DJ: 6 meses, 2 clases semanales) | ⚠️ Contradice el relevamiento y lo que Ignacio confirmó (DJ = 8 clases, 1 por semana). Ver ❓P34 |
| **"Práctica libre incluida"** en el programa de DJ | 🟡 Es uso de sala gratuito para alumnos, distinto del alquiler pago. Ver ❓P35 |
| **Alquiler $18.000/h y Grabación $65.000/h**, en bloques de 1 a 4 horas | ✅ Cubierto: son `reserva` + `pago` directo, **sin inscripción**. El precio sale de las horas |
| **Eventos, clases abiertas, showcases, release parties** (`dates.ts`) | 🟡 No hay módulo de eventos en los 8, y el relevamiento menciona eventos en Argentina, Uruguay y Brasil. Ver ❓P36 |
| **Catálogo del sello con género y portada** | 🟡 `release` no tiene ni género ni imagen. Trivial de agregar, hace falta si algún día la landing lee el catálogo del backend |
| **Equipos por categoría** (controladores, monitores, auriculares, accesorios) | 🟡 `venta_equipo` tiene modelo y marca, no categoría. Trivial |

### 3.5 Falta la asignación **profesor ↔ alumno**

El Módulo 1 lista `profesor_asignado` y el Módulo 5 habla de "alumnos asignados", pero
el DBML solo relaciona profesor y alumno a través de cada `reserva`. Ver **❓P6**.

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

### Pantallas
1. **Calendario semanal** tipo grilla: salas en columnas, franjas horarias en filas, colores por tipo de uso. Vista semanal y mensual.
2. **Alta / edición de reserva** — sala, fecha, horario, tipo de uso, alumno, profesor.
3. **Bloqueo de sala** — mantenimiento o uso especial, por rango de fechas.
4. **Historial de uso por sala** y por período.

### Quién puede qué
| | ADMIN | DIRECTIVO | STAFF | Profesor | Alumno |
|---|---|---|---|---|---|
| Ver el calendario completo | ✅ | ✅ | ✅ | ✅ | Solo sus reservas |
| Crear / modificar / cancelar reserva | ✅ | — | ✅ | — | — |
| Bloquear sala | ✅ | — | ✅ | — | — |
| Solicitar reprogramación | — | — | — | ❓P9 | ✅ |

### Reglas duras ✅
- **Nunca dos reservas solapadas en la misma sala.** Se garantiza en la base de datos, no solo en la pantalla. *(Esta es la regla más importante del sistema entero.)*
- Una sala **bloqueada** no acepta reservas mientras dure el bloqueo.
- Toda modificación de reserva registra **quién y cuándo**.
- **El profesor afectado recibe notificación inmediata** ante cualquier cambio que lo toque. Es el problema #1 de Ghezz — si esto no funciona, el módulo no sirve.
- Los profesores **visualizan, no modifican**.

### Pendientes
- **✅P6 — RESUELTO (2026-08-11). Asignación explícita**: cada profe con su/s alumno/s. Vive en `inscripcion.id_profesor`, no en el alumno — así el mismo alumno puede tener a un profe para DJ y a otro para mentoría, y *Mis Alumnos* sale de ahí. Que otro profesor cubra una clase suelta **no** le transfiere el alumno.
- **❓P7 — ¿El sistema genera las 8 clases semanales de una?** El curso es 1 clase por semana durante 8 semanas. ¿Micaela carga 8 reservas a mano o el sistema las crea solo al inscribir? **Recomiendo generarlas**, y que después se puedan mover de a una.
- **❓P8 — "sin autorización manual" — ¿de quién y cómo?** La propuesta dice que no se puede reservar con estado 'debe' *"sin autorización manual"*. ¿Quién autoriza (solo ADMIN?) y queda registrado con motivo?
- **❓P9 — ¿Un profesor puede pedir mover su propia clase?** Hoy todo pasa por Micaela. ¿Le damos al profesor el mismo botón de "solicitar reprogramación" que al alumno, o sigue siendo un mensaje a Mica?
- **✅P10 — RESUELTO (2026-08-11).** Son **tres salas: Sala 1, Sala 2 y Cabina de grabación.** No existe una "Sala de Producción" — el relevamiento está mal. La matriz de qué se puede hacer en cada una está en §2.6.
- **✅P29 — RESUELTO (2026-08-11).** El **alquiler de cabina** es un uso propio y va en **Sala 1 y Sala 2** (no en la de grabación). Es un servicio **distinto** de la grabación de set. Ambos están en la matriz de §2.6.
- **❓P30 — ¿Una clase puede tener más de un alumno?** Todo el relevamiento habla de "el alumno" en singular, pero `material.es_grupal` existe en el modelo y la entrevista menciona *"si hay más alumnos, a veces se reasignan salas"*. **Es una pregunta estructural**: si las clases pueden ser grupales, una reserva se relaciona con *varios* alumnos y eso cambia la tabla. Barato ahora, caro después.
- **❓P11 — ¿Horario de apertura del estudio?** El calendario necesita saber de qué hora a qué hora se puede reservar. Ghezz llega 8–9 AM; hay profes hasta la noche.

---

## 6. Módulo 3 — Pagos y Cobros

*Unifica el Excel financiero con el Notion operativo.*

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
- **❓P12 — ¿Cómo se modela la seña?** ¿Es un pago parcial contra la inscripción (y el saldo es otro pago), o un registro aparte? **Recomiendo: pagos parciales contra la inscripción**, y el estado sale de la suma.
- **❓P13 — ¿Los precios viven en el sistema?** ¿Hay una lista de precios por servicio que Micaela mantiene, o cada inscripción lleva el precio escrito a mano? Con inflación y dos monedas, esto importa.
- **❓P14 — Descuento de ex alumno: ¿porcentaje fijo o caso por caso?**
- **❓P15 — ¿Alguien tiene que poder anular un pago mal cargado?** Micaela va a equivocarse alguna vez. ¿Se anula (dejando rastro) o se edita?
- **❓P16 — Venta de equipos:** ¿el sistema registra la venta después de hecha, o hay que gestionar el pedido a Pioneer? (El relevamiento dice que no hay stock propio.)

---

## 7. Módulo 4 — Portal del Alumno

### Pantallas
Mis próximas clases · Mi estado de cuenta (con descarga de comprobantes) · Solicitar
reprogramación · Mis materiales · Mi progreso (nivel actual, clases tomadas, clases
restantes) · Mis notificaciones · Mi perfil.

### Reglas duras ✅
- El alumno **solo ve lo suyo**.
- **Las solicitudes de reprogramación no son automáticas: las aprueba administración.**
- El alumno **no modifica** su horario ni su estado de pago.
- Los materiales se ven **solo si el profesor los habilitó**.
- El alumno **no ve las notas internas** de los profesores.

### Pendientes
- **❓P17 — ¿Hasta dónde llega la autogestión, realmente?** Hay una tensión entre lo que Mica dijo querer en la entrevista (*"que los alumnos puedan anotarse solos, elegir horarios, profesores, cancelar clases"*) y lo que la propuesta promete (solicitar y que Micaela apruebe). Mica además dudó en voz alta: *"puede que los alumnos prefieran el trato personalizado"*. **La propuesta es lo contractual, así que por defecto vamos con solicitud + aprobación** — pero conviene confirmárselo, porque puede estar esperando otra cosa.
- **❓P18 — ¿Cómo obtiene el alumno su contraseña la primera vez?** Micaela lo da de alta, no él. ¿Se le manda un mail de activación? ¿Un link por WhatsApp?
- **❓P19 — ¿Un alumno inactivo pierde el acceso al portal?** La propuesta dice que el acceso requiere estar activo. Pero alguien que terminó el curso quizá quiera seguir viendo sus materiales.

---

## 8. Módulo 5 — Portal del Profesor

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

### Pendientes
- **❓P20 — "Registrar automáticamente cuántas clases doy"** — Ghezz lo pidió textual, y se conecta con el pago a profesores del Módulo 3. ¿La liquidación al profesor se calcula sola a partir de las clases dictadas, o se carga a mano?
- **❓P21 — Mentorías:** son el servicio con más necesidad de seguimiento y sin estructura fija. ¿La nota por sesión alcanza, o hace falta algo distinto (un hilo por alumno, objetivos)?

---

## 9. Módulo 6 — Mix & Mastering · *trazo grueso, se detalla en octubre*

**Lo esencial:** registrar cada trabajo, contar las revisiones, y **retener el archivo
final hasta que el pago esté registrado**. Es el único servicio que puede quedar en debe.

Estados: `a confirmar → en proceso → entregado → pagado`, más `debe`.

### Reglas duras ✅
- **El archivo final no se libera sin el pago registrado.** Es la regla que le resuelve a Ghezz el "estar fiando el servicio".
- Alerta al superar las revisiones incluidas.
- Alerta si pasan más de 7 días desde la entrega sin pago.
- Los clientes externos se registran **con nombre y contacto, sin cuenta**.

### Pendientes
- **⚠️❓P22 — ¿Qué se entrega antes de cobrar y qué se retiene?** Los documentos se contradicen. La transcripción completa dice, dos veces y textual: *"Yo entrego el **master**. Cuando me pagan, recién ahí les doy el **premaster**, que es lo que necesitan para discográficas."* El Módulo 6 de la propuesta dice en cambio: *"Ghezz entrega el **premix** al cliente para revisión."* Son tres nombres para dos archivos. **Gana la entrevista** (es la palabra de Ghezz, la propuesta la reinterpretó), pero conviene confirmárselo antes de codificarlo, porque el sistema va a bloquear un archivo concreto.
- **❓P23 — ¿Los archivos de audio pasan por el sistema?** ¿El cliente sube el track y descarga el resultado desde la plataforma, o se sigue mandando por WeTransfer y el sistema solo lleva el registro? Cambia el costo de almacenamiento y el alcance del módulo.
- **❓P28 — El cobro de M&M es deliberadamente flexible.** Ghezz: *"Con gente cercana soy más flexible, pero con clientes externos pongo límites"* y *"clientes con mucha exposición no les podés exigir el pago de la misma forma, ahí tenés que tener cintura."* Si el sistema bloquea el archivo sin excepción posible, Ghezz lo va a esquivar y volvemos al WhatsApp. **¿Hace falta una excepción registrada** ("liberar sin pago, con motivo"), igual que la autorización del ❓P8?

---

## 10. Módulo 7 — Sello Discográfico · *trazo grueso*

Catálogo de releases con ID correlativo (LJ020…), artistas, contratos, estados
(`a confirmar → confirmado → en distribución → publicado`), registro del envío al
sistema de promoción internacional, alertas 7 días antes de la fecha de lanzamiento.

### Reglas duras ✅
- ID de release **único y correlativo**.
- No se publica un release **sin contrato adjunto** (o con justificación explícita).
- Los estados solo avanzan.
- Acceso: Ghezz y administración total; dirección solo consulta; **profesores y alumnos sin acceso**.

### Pendientes
- **❓P24 — ¿Los artistas tienen login?** El DBML lo deja preparado pero anulado. Confirmar que en esta versión **no**.
- **❓P25 — ¿El seguimiento post-lanzamiento entra?** Ghezz busca a mano si algún DJ tocó los temas, revisa sets y radios. ¿El sistema registra eso o queda afuera?

---

## 11. Módulo 8 — Dashboard de Dirección · *trazo grueso*

Solo lectura. Indicadores: alumnos activos por servicio · ingresos del período en ARS y
USD por línea de negocio · ocupación de salas por día y franja · cobros pendientes ·
tasa de retención · ingresos por M&M · actividad del sello. Exportable a PDF y Excel.

### Reglas duras ✅
- **Es solo lectura.** No modifica nada.
- Cada indicador permite abrir el detalle (drill-down) en su módulo.
- Sin datos en el período ⇒ muestra cero, no vacío.
- Acceso completo solo `DIRECTIVO` y `ADMIN`; `STAFF` ve el resumen financiero básico.

### Pendientes
- **❓P26 — "Tasa de retención": ¿cómo se define exactamente?** ¿Alumnos que empezaron un segundo curso? ¿En qué ventana de tiempo? Es el único indicador que no se calcula solo sin una definición del negocio.

---

## 12. Índice de decisiones pendientes

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
| P9 | ¿El profesor puede pedir mover su clase? | Módulo 2 |
| ~~P10~~ | ✅ Sala 1, Sala 2, Cabina de grabación | — |
| P11 | Horario de apertura del estudio | Módulo 2 |
| P12 | Modelo de la seña | Módulo 3 |
| P13 | ¿Lista de precios en el sistema? | Módulo 3 |
| P14 | Descuento de ex alumno | Módulo 3 |
| P15 | Anular un pago mal cargado | Módulo 3 |
| P16 | Alcance de venta de equipos | Módulo 3 |
| P17 | Alcance real de la autogestión | Módulo 4 |
| P18 | Primera contraseña del alumno | Módulo 4 |
| P19 | Acceso del alumno inactivo | Módulo 4 |
| P20 | Liquidación automática a profesores | Módulo 5 |
| P21 | Seguimiento de mentorías | Módulo 5 |
| P22 | ⚠️ Premix / master / premaster | Módulo 6 |
| P23 | ¿Los audios pasan por el sistema? | Módulo 6 |
| P24 | Login de artistas | Módulo 7 |
| P25 | Seguimiento post-lanzamiento | Módulo 7 |
| P26 | Definición de tasa de retención | Módulo 8 |
| ~~P27~~ | ✅ "Grabación" se suma, solo en la Cabina | — |
| P28 | Excepción para liberar M&M sin pago | Módulo 6 |
| ~~P29~~ | ✅ Alquiler de cabina: Sala 1 y 2, servicio propio | — |
| **P30** | **¿Las clases pueden ser grupales?** | **`V1__baseline.sql`** |
| **P31** | **M&M como curso, además de servicio** | **`V1__baseline.sql`** |
| **P32** | **¿Existen las clases virtuales?** | **`V1__baseline.sql`** |
| **P33** | **¿Se cobra en cuotas mensuales?** | **`V1__baseline.sql`** |
| P34 | ⚠️ Duración real de los cursos (landing ≠ relevamiento) | Módulo 1 |
| P35 | "Práctica libre" como uso de sala gratuito | Módulo 2 |
| P36 | ¿Entran los eventos / clases abiertas / showcases? | Alcance general |

**Bloquean el `V1__baseline.sql`: P30, P31, P32, P33.**
El resto se contesta mientras se construye el módulo correspondiente.

### Detalle de las nuevas

- **❓P31 — "Mix & Mastering" es dos cosas distintas.** La landing lo vende como **curso** (3 meses, 1 clase semanal, cupo reducido) y el Módulo 6 lo trata como **servicio** (Ghezz masteriza tu track). Comparten nombre y nada más: uno es una inscripción con clases, el otro es un trabajo con revisiones y entrega. Hay que nombrarlos distinto en el sistema para que nadie los confunda.
- **❓P32 — ¿Existen las clases virtuales?** La landing dice *"Presencial en Pilar o virtual en vivo"* en los dos programas grandes. El relevamiento **no las menciona nunca**. Si existen, una clase virtual **no ocupa sala**, y hoy `reserva.id_sala` es obligatorio. Es la diferencia entre una columna que admite vacío y una que no — barata ahora, migración después.
- **❓P33 — ¿Se cobra en cuotas mensuales?** La landing dice *"Desde $85.000/mes"*. El relevamiento dice seña para reservar + saldo total **antes de empezar a cursar**. Son dos modelos de cobro distintos: uno necesita vencimientos mensuales y alertas de cuota impaga; el otro no.
- **❓P34 — La duración de los cursos no coincide.** Relevamiento y confirmación de Ignacio: DJ = 2 meses, 8 clases, 1 por semana. Landing: DJ = 6 meses, **2 clases semanales**. Producción: 4 meses vs. 8 meses. **Alguno de los dos está mal y hay que corregirlo antes de publicar la landing**, porque son números que un cliente lee y sobre los que decide.
- **❓P35 — "Práctica libre incluida"** aparece como beneficio del programa de DJ. Es un uso de sala **gratuito y solo para alumnos**, distinto del alquiler pago. ¿Se reserva por el sistema? Si sí, es un `tipo_uso` más.
- **❓P36 — Eventos.** `dates.ts` anuncia clases abiertas, showcases y release parties, y el relevamiento habla de eventos en Argentina, Uruguay y Brasil. No hay módulo de eventos entre los 8 y **no está en la propuesta**, así que por defecto queda **fuera de alcance** — pero un evento ocupa una sala, así que como mínimo debería poder bloquearla.
