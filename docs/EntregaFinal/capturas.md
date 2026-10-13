# Capturas del Manual de Usuario

Son **53 capturas**; hay 0 cargadas. Esta lista la genera `fuente/manual.py`: no la edites a mano, se pisa.

## Cómo sacarlas

1. **Datos de prueba, no reales.** El manual se imprime y se entrega: que no aparezcan nombres, teléfonos ni emails de alumnos de verdad. Revisá que la base de desarrollo no tenga datos reales cargados, y si los tiene, creá personas inventadas para las capturas.
2. **Dónde abrirlo:** con el sistema levantado en tu máquina, cada ruta de la lista va después de `http://localhost:5173` (por ejemplo, `http://localhost:5173/app/login`).
3. **Tema claro**, zoom del navegador al **100 %** y ventana de unos **1440 × 900**.
4. **Solo la ventana del sistema**: sin la barra del navegador ni la barra de tareas (en Windows, `Win + Shift + S` y recortás).
5. Las que dicen **celular**: en Chrome, `F12` → ícono de dispositivo → *iPhone 12 Pro* (390 px de ancho).
6. Guardala en `docs/EntregaFinal/fuente/capturas/` con el **nombre exacto** del título (por ejemplo `02-login.png`) y regenerá el manual: entra sola en su lugar.

## La lista

### 2. Primeros pasos

- [ ] **`01-registro.png`** — Figura 1: *Pantalla para crear una cuenta*
  - **Dónde:** `/app/registro` · **Entrar como:** nadie (sin sesión iniciada)
  - **Antes:** Cerrá la sesión si tenías una abierta.
  - **Que se vea:** El formulario completo de **Crear cuenta**, vacío o con datos inventados.

- [ ] **`02-login.png`** — Figura 2: *Pantalla de ingreso*
  - **Dónde:** `/app/login` · **Entrar como:** nadie (sin sesión iniciada)
  - **Antes:** Cerrá la sesión.
  - **Que se vea:** Los campos Email y Contraseña, la casilla **Recordarme** y el enlace **Creá una**.

- [ ] **`03-cambio-de-contrasena.png`** — Figura 3: *Cambio obligatorio de la contraseña temporal*
  - **Dónde:** `/app (primer ingreso)` · **Entrar como:** una cuenta recién creada por la administración
  - **Antes:** Creá una cuenta de prueba desde **Personas › Directorio › Nueva cuenta**, anotá la contraseña temporal, cerrá sesión y entrá con ella.
  - **Que se vea:** La pantalla que pide la contraseña nueva.

- [ ] **`04-inicio-administracion.png`** — Figura 4: *Inicio de una persona del equipo*
  - **Dónde:** `/app/` · **Entrar como:** admin (ADMIN)
  - **Antes:** Que haya alguna reserva hoy y algún pedido o consulta pendiente.
  - **Que se vea:** El menú completo a la izquierda, con algún contador, y los bloques del Inicio.

- [ ] **`05-celular.png`** — Figura 5: *El sistema en un celular, con el menú abierto*
  - **Dónde:** `/app/` · **Entrar como:** admin (ADMIN)
  - **Antes:** Modo celular de Chrome (F12, iPhone 12 Pro).
  - **Que se vea:** El menú desplegado sobre la pantalla.

- [ ] **`06-notificaciones.png`** — Figura 6: *Bandeja de notificaciones*
  - **Dónde:** `/app/notificaciones` · **Entrar como:** admin (ADMIN)
  - **Antes:** Que haya notificaciones leídas y sin leer.
  - **Que se vea:** La lista, con al menos una sin leer (con el punto) y el botón **Marcar todas como leídas**.

- [ ] **`07-mi-perfil.png`** — Figura 7: *Pantalla de Mi perfil*
  - **Dónde:** `/app/mi-perfil` · **Entrar como:** una cuenta de alumno de prueba
  - **Antes:** —
  - **Que se vea:** Los campos editables y el email bloqueado con su aclaración.

### 3. Portal del alumno y del cliente

- [ ] **`08-inicio-alumno.png`** — Figura 8: *Inicio de un alumno*
  - **Dónde:** `/app/` · **Entrar como:** una cuenta de alumno de prueba
  - **Antes:** Que el alumno tenga un curso activo, una clase próxima y algún material.
  - **Que se vea:** Los bloques *Mi próxima clase*, *Clases que me quedan* y *Lo que debo*.

- [ ] **`09-mis-cursos.png`** — Figura 9: *Mis cursos, con el avance por clase*
  - **Dónde:** `/app/mis-cursos` · **Entrar como:** una cuenta de alumno de prueba
  - **Antes:** Que el alumno tenga algunas clases tomadas.
  - **Que se vea:** Un curso con su barra de pasos (algunos pintados).

- [ ] **`10-mis-reservas.png`** — Figura 10: *Mis reservas, pidiendo otro día*
  - **Dónde:** `/app/mis-reservas` · **Entrar como:** una cuenta de alumno de prueba
  - **Antes:** Que el alumno tenga una clase futura.
  - **Que se vea:** La lista de clases y el formulario **Pedir otro día** abierto en una de ellas.

- [ ] **`11-reservar-cabina.png`** — Figura 11: *Pedido de una cabina*
  - **Dónde:** `/app/reservar` · **Entrar como:** una cuenta de alumno de prueba
  - **Antes:** Elegí un día que tenga algún horario ocupado.
  - **Que se vea:** El formulario con la sala y el día elegidos, y la franja *Ya ocupado ese día*.

- [ ] **`12-mis-pedidos.png`** — Figura 12: *Mis pedidos de cabina*
  - **Dónde:** `/app/mis-solicitudes` · **Entrar como:** una cuenta de alumno de prueba
  - **Antes:** Hacé un pedido y, desde administración, aprobá o rechazá otro.
  - **Que se vea:** Un pedido esperando respuesta y uno resuelto.

- [ ] **`13-mis-pagos.png`** — Figura 13: *Mis pagos (estado de cuenta)*
  - **Dónde:** `/app/mis-pagos` · **Entrar como:** una cuenta de alumno de prueba
  - **Antes:** Que el alumno tenga una seña pagada y un saldo pendiente.
  - **Que se vea:** Los saldos por moneda, lo contratado y la lista de movimientos.

- [ ] **`14-mis-trabajos.png`** — Figura 14: *Mis trabajos de mix & mastering*
  - **Dónde:** `/app/mix-mastering` · **Entrar como:** una cuenta de cliente de prueba con un trabajo entregado
  - **Antes:** Un trabajo entregado y sin pagar.
  - **Que se vea:** El trabajo con el enlace del master y el aviso de que el premaster se entrega al pagar.

- [ ] **`15-mis-materiales.png`** — Figura 15: *Mis materiales*
  - **Dónde:** `/app/mis-materiales` · **Entrar como:** una cuenta de alumno de prueba
  - **Antes:** Que un profesor le haya publicado algún material.
  - **Que se vea:** La lista con el botón **Abrir**.

### 4. Portal del profesor

- [ ] **`16-mi-agenda.png`** — Figura 16: *Mi agenda del profesor*
  - **Dónde:** `/app/mi-agenda` · **Entrar como:** una cuenta de profesor de prueba
  - **Antes:** Que el profesor tenga clases cargadas en estas semanas.
  - **Que se vea:** Las clases del período y el contador de clases dictadas.

- [ ] **`17-mis-alumnos.png`** — Figura 17: *Mis alumnos, con un grupo y el semáforo*
  - **Dónde:** `/app/mis-alumnos` · **Entrar como:** una cuenta de profesor de prueba
  - **Antes:** Que el profesor tenga un curso grupal y uno individual.
  - **Que se vea:** Una tarjeta de grupo con sus integrantes y semáforos de colores distintos.

- [ ] **`18-ficha-alumno-profesor.png`** — Figura 18: *Ficha de un alumno vista por su profesor*
  - **Dónde:** `/app/mis-alumnos/(id)` · **Entrar como:** una cuenta de profesor de prueba
  - **Antes:** Cargale una nota y un estado de seguimiento.
  - **Que se vea:** El bloque *Cómo viene* con el semáforo y la lista *Mis notas*.

- [ ] **`19-subir-material.png`** — Figura 19: *Subir material para un curso*
  - **Dónde:** `/app/material` · **Entrar como:** una cuenta de profesor de prueba
  - **Antes:** —
  - **Que se vea:** El formulario completo y la lista *Lo que subiste*.

### 5. Personas

- [ ] **`20-alumnos.png`** — Figura 20: *Listado de alumnos con sus filtros*
  - **Dónde:** `/app/admin/alumnos` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Que haya alumnos de DJ y de Producción.
  - **Que se vea:** La barra de filtros y la tabla.

- [ ] **`21-contrasena-nueva.png`** — Figura 21: *Contraseña temporal recién creada, con el botón de WhatsApp*
  - **Dónde:** `/app/admin/alumnos` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Dá de alta un alumno con cuenta nueva (datos inventados).
  - **Que se vea:** El bloque con la contraseña, el aviso *vence a los 7 días* y el botón **Mandarle la clave por WhatsApp**.

- [ ] **`22-ficha-alumno.png`** — Figura 22: *Ficha del alumno vista por la administración*
  - **Dónde:** `/app/admin/alumnos/(id)` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Un alumno con curso, clases y pagos.
  - **Que se vea:** Los bloques de la ficha (si no entra en una pantalla, la parte de arriba).

- [ ] **`23-profesores.png`** — Figura 23: *Listado de profesores*
  - **Dónde:** `/app/admin/profesores` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** —
  - **Que se vea:** La tabla, con algún profesor que tenga *contraseña sin cambiar*.

- [ ] **`24-directorio.png`** — Figura 24: *Directorio de cuentas*
  - **Dónde:** `/app/admin/usuarios` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** —
  - **Que se vea:** La tabla con las acciones **Editar** y **Resetear contraseña** visibles.

### 6. Comercial: consultas, programas e inscripciones

- [ ] **`25-buzon.png`** — Figura 25: *Buzón de la web*
  - **Dónde:** `/app/admin/buzon` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Completá dos o tres formularios desde el sitio web con datos inventados.
  - **Que se vea:** La lista con fichas de intereses distintos.

- [ ] **`26-buzon-ficha.png`** — Figura 26: *Una ficha del buzón abierta, con sus acciones*
  - **Dónde:** `/app/admin/buzon` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Abrí una ficha de curso pendiente.
  - **Que se vea:** Los datos de la ficha y los botones **Escribirle por WhatsApp**, **Inscribirlo** y **Descartar**.

- [ ] **`27-buzon-inscribir.png`** — Figura 27: *Inscribir desde el buzón, con todo precargado*
  - **Dónde:** `/app/admin/buzon` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** En una ficha de curso, tocá **Inscribirlo**.
  - **Que se vea:** El formulario con Programa, Nivel, Profesor, Clases y precio completos.

- [ ] **`28-programas.png`** — Figura 28: *Catálogo de programas*
  - **Dónde:** `/app/admin/programas` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** —
  - **Que se vea:** Los tres programas con sus precios, y uno abierto en **Editar**.

- [ ] **`29-inscripcion-grupal.png`** — Figura 29: *Alta de una inscripción grupal con seña*
  - **Dónde:** `/app/admin/inscripciones` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Tocá **Nueva inscripción** y armá un grupo de dos o tres.
  - **Que se vea:** Los integrantes con el referente marcado, el precio del grupo y **La seña entró ahora** tildada.

- [ ] **`30-inscripciones.png`** — Figura 30: *Listado de inscripciones*
  - **Dónde:** `/app/admin/inscripciones` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Que haya inscripciones individuales, grupales y alguna preinscripta.
  - **Que se vea:** La tabla con un grupo y una preinscripta visibles.

### 7. Salas y agenda

- [ ] **`31-calendario.png`** — Figura 31: *Calendario semanal*
  - **Dónde:** `/app/admin/reservas` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Una semana con varias clases, un alquiler y alguna sala bloqueada.
  - **Que se vea:** La grilla completa de la semana.

- [ ] **`32-nueva-clase.png`** — Figura 32: *Cargar una clase eligiendo el curso*
  - **Dónde:** `/app/admin/reservas` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Tocá **Nueva reserva** y elegí una clase de DJ.
  - **Que se vea:** El formulario con el curso elegido, sus integrantes tildados y el profesor precargado.

- [ ] **`33-nuevo-alquiler.png`** — Figura 33: *Cargar un alquiler con su seña*
  - **Dónde:** `/app/admin/reservas` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Tocá **Nueva reserva** y elegí *Alquiler de cabina*.
  - **Que se vea:** Los campos de precio y el bloque de la seña.

- [ ] **`34-reserva-abierta.png`** — Figura 34: *Una clase abierta, con asistencia*
  - **Dónde:** `/app/admin/reservas` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Abrí una clase grupal ya dictada.
  - **Que se vea:** Los participantes con su asistencia y los botones **Mover** y **Cancelar la reserva**.

- [ ] **`35-pedidos-de-sala.png`** — Figura 35: *Resolver un pedido de sala*
  - **Dónde:** `/app/admin/solicitudes` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Hacé un pedido desde una cuenta de prueba.
  - **Que se vea:** El pedido abierto con las opciones de **Cómo se resuelve**.

- [ ] **`36-pedidos-de-cambio.png`** — Figura 36: *Darle otro horario a una clase*
  - **Dónde:** `/app/admin/reprogramaciones` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Pedí otro día desde la cuenta de un alumno de prueba.
  - **Que se vea:** El pedido con su motivo y el formulario **Darle otro horario** abierto.

- [ ] **`37-bloqueos.png`** — Figura 37: *Bloquear una sala*
  - **Dónde:** `/app/admin/bloqueos` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** —
  - **Que se vea:** El formulario con **Solo una franja horaria** marcada y su aclaración.

- [ ] **`38-uso-de-salas.png`** — Figura 38: *Reporte de uso de las salas*
  - **Dónde:** `/app/admin/uso-salas` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Elegí **Últimos 30 días**.
  - **Que se vea:** Las tres salas con sus horas.

### 8. Dinero

- [ ] **`39-deudores.png`** — Figura 39: *Deudores, una fila por persona*
  - **Dónde:** `/app/admin/deudores` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Que haya al menos dos deudores, uno con dos deudas.
  - **Que se vea:** La lista, con una fila que tenga varias deudas adentro.

- [ ] **`40-cobrar.png`** — Figura 40: *Cobrar desde Deudores con el formulario precargado*
  - **Dónde:** `/app/admin/deudores` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Tocá **Registrar el pago** en una deuda.
  - **Que se vea:** El formulario abierto con el destino, la persona y el monto completos.

- [ ] **`41-pagos.png`** — Figura 41: *Listado de pagos por línea de negocio*
  - **Dónde:** `/app/admin/pagos` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** —
  - **Que se vea:** Las solapas, la tabla y las acciones **Corregir** y **Anular** de una fila.

- [ ] **`42-anular.png`** — Figura 42: *Anular un pago con su motivo*
  - **Dónde:** `/app/admin/pagos` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Tocá **Anular** en un pago de prueba.
  - **Que se vea:** El cuadro que pide el motivo.

- [ ] **`43-estado-de-cuenta.png`** — Figura 43: *Estado de cuenta de una persona*
  - **Dónde:** `/app/admin/estado-de-cuenta/(id)` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Una persona con pagos y deuda.
  - **Que se vea:** Saldos, contratos y movimientos.

- [ ] **`44-caja.png`** — Figura 44: *Caja del mes*
  - **Dónde:** `/app/admin/caja` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Elegí **Este mes**.
  - **Que se vea:** Las dos monedas, cada una con sus ingresos, egresos y neto.

- [ ] **`45-egresos.png`** — Figura 45: *Registrar un egreso*
  - **Dónde:** `/app/admin/egresos` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** —
  - **Que se vea:** El formulario abierto y la lista con las dos solapas.

- [ ] **`46-ventas.png`** — Figura 46: *Registrar una venta de equipo*
  - **Dónde:** `/app/admin/ventas` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** —
  - **Que se vea:** El formulario con un comprador sin cuenta.

### 9. Mix & Mastering y Sello

- [ ] **`47-mix-mastering.png`** — Figura 47: *Trabajos de mix & mastering*
  - **Dónde:** `/app/admin/mix-mastering` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Trabajos en estados distintos.
  - **Que se vea:** La lista con sus estados.

- [ ] **`48-trabajo.png`** — Figura 48: *Un trabajo abierto con sus acciones*
  - **Dónde:** `/app/admin/mix-mastering` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Abrí un trabajo entregado y sin pagar.
  - **Que se vea:** El expediente y los botones **Registrar cobro** y **Liberar el premaster**.

- [ ] **`49-premaster.png`** — Figura 49: *El premaster rechazado y la excepción con motivo*
  - **Dónde:** `/app/admin/mix-mastering` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** En un trabajo sin pagar, tocá **Liberar el premaster**.
  - **Que se vea:** El mensaje de rechazo y el botón **Liberarlo igual, con motivo**.

- [ ] **`50-sello.png`** — Figura 50: *Catálogo del sello*
  - **Dónde:** `/app/admin/sello` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Releases en estados distintos.
  - **Que se vea:** La lista con códigos, artistas y estados.

- [ ] **`51-release.png`** — Figura 51: *Un release abierto: contrato, temas y dónde sonó*
  - **Dónde:** `/app/admin/sello` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** Un EP con contrato y tres temas cargados.
  - **Que se vea:** Los bloques **Contratos**, **Temas** y **Dónde sonó**.

- [ ] **`52-artistas.png`** — Figura 52: *Ficha de un artista*
  - **Dónde:** `/app/admin/artistas` · **Entrar como:** administración (ADMIN o STAFF)
  - **Antes:** —
  - **Que se vea:** Un artista abierto con su contrato general.

### 10. Tablero de dirección

- [ ] **`53-tablero.png`** — Figura 53: *Tablero de dirección completo*
  - **Dónde:** `/app/admin/tablero` · **Entrar como:** admin (ADMIN) o un directivo de prueba
  - **Antes:** Elegí **90 días**.
  - **Que se vea:** Los bloques de números y el mapa de calor (si no entra, dos capturas).
