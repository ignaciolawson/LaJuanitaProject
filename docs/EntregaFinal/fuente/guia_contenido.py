"""Contenido de la Guía de Buenas Prácticas de Uso.

Los plazos y las reglas están tomados del sistema (backend y base de datos); si una regla
cambia, esta guía tiene que cambiar con ella. Va en voseo, como el manual."""

from libro import _numeracion


def escribir(g):
    _introduccion(g)
    _numeracion(g.doc.sections[-1], "decimal", 1)
    _rutina(g)
    _cobros(g)
    _buzon(g)
    _reservas(g)
    _alumnos(g)
    _mastering(g)
    _sello(g)
    _profesores(g)
    _clientes(g)
    _direccion(g)
    _cuentas(g)
    _problemas(g)


def _introduccion(g):
    g.capitulo(1, "Cómo usar esta guía")
    g.parrafo(
        "El sistema hace cumplir por sí solo las reglas importantes, pero **no limpia por "
        "vos**: las deudas, las fichas del buzón y las preinscripciones se acumulan si nadie "
        "las mira. Esta guía no explica dónde está cada botón, eso lo hace el Manual de "
        "Usuario. Explica los hábitos que mantienen la información confiable.")
    g.parrafo(
        "Cada capítulo es corto y se puede leer por separado. Los capítulos 2 a 6 son para el "
        "equipo de administración; el 7 y el 8 son para el sello y el mix & mastering; el 9 es "
        "para los profesores; el 10 se le puede pasar a alumnos y clientes; el resto es para "
        "dirección y para quien cuida las cuentas y los respaldos.")
    g.titulo("Cinco principios para todo el sistema")
    g.numerada([
        "**Cargá en el momento.** Un pago, una clase o una ficha cargados al día siguiente ya "
        "son un dato de memoria. Lo que no está en el sistema, para el sistema no pasó.",
        "**Anular no es borrar, y está bien.** Casi nada se elimina: se anula con motivo y "
        "firma. Si algo se cargó mal, anulá y volvé a cargar.",
        "**Una sola fuente.** Si algo está en el sistema, no lo lleves además en Notion, en "
        "una planilla o en un cuaderno: dos listas de lo mismo terminan diciendo cosas "
        "distintas.",
        "**Las alertas son para actuar.** Una notificación se atiende o se descarta con "
        "criterio. Si hay decenas sin leer, ya no avisan de nada.",
        "**Un motivo es una frase real.** Cuando el sistema pide escribir por qué (anular, "
        "liberar un premaster, publicar sin contrato), esa frase la va a leer otra persona "
        "dentro de tres meses. Escribila para esa persona.",
    ])


def _rutina(g):
    g.capitulo(2, "La rutina del equipo")
    g.parrafo(
        "Quince minutos bien ubicados por día evitan una hora de limpieza al mes. Esta es la "
        "rutina mínima.", junto=True)
    g.tabla(
        ["Cuándo", "Qué mirar", "Para qué"],
        [
            ["Todos los días", "Buzón de la web y Notificaciones",
             "Que nadie espere respuesta más de 48 horas y que no se acumulen alertas."],
            ["Todos los días", "Solicitudes del portal (reservas y reprogramaciones)",
             "Cada pedido sin resolver es una persona esperando."],
            ["Una vez por semana", "Deudores",
             "Cobrar, reclamar o cancelar lo que ya no va a entrar."],
            ["Una vez por semana", "Inscripciones preinscriptas y pausadas",
             "Que ninguna quede en el limbo."],
            ["Una vez por semana", "Calendario de la semana siguiente",
             "Salas bloqueadas, clases sin profesor, reservas sin seña."],
            ["Fin de mes", "Caja y Egresos",
             "Que los comprobantes estén adjuntos y los montos cierren con la realidad."],
            ["Fin de mes", "Tablero de dirección y exportación",
             "Guardar el Excel o el PDF del mes: queda con fecha, filtros y quién lo generó."],
        ],
        [3.2, 5.6, 6.2], titulo="Rutina mínima del equipo")
    g.recuadro("Consejo",
               "Los contadores del menú lateral (Buzón, Deudores) son el tablero de control de "
               "la rutina. Si un número crece semana a semana, ahí está el problema.")


def _cobros(g):
    g.capitulo(3, "Cobros y deudores")
    g.parrafo(
        "Una lista de deudores corta es señal de buena salud. Una larga rara vez es por gente "
        "que no quiere pagar: suele ser por cosas que nadie cerró.")
    g.vinetas([
        "**Cobrá desde Deudores**, con el botón **Registrar el pago** o **Cobrar**. Ya viene "
        "con la persona, el concepto, la moneda y el saldo cargados. Hacerlo desde otra "
        "pantalla es la forma más fácil de dejar un pago suelto.",
        "**Cobrá en la moneda del contrato.** Un pago de un programa, una reserva o un trabajo "
        "va en la moneda pactada y el sistema rechaza lo contrario. Si el alumno pagó en otra, "
        "hablalo antes y corregí el contrato, no el pago.",
        "**Adjuntá el comprobante en el momento.** La transferencia está en el celular hoy; "
        "dentro de un mes nadie la encuentra. Un comprobante equivocado no se pisa: se marca "
        "inválido y se agrega el correcto.",
        "**Cada deuda tiene que terminar en una de tres cosas:** cobrada, reclamada con fecha "
        "o cancelada. Una deuda de meses sin movimiento ensucia el tablero de dirección, que "
        "la suma como plata por cobrar.",
        "**Si una seña no va a entrar, no la dejes colgada.** Cancelá la inscripción o la "
        "reserva: la sala o el cupo se liberan y la deuda sale de la lista.",
        "**Anulá siempre con una frase útil.** *Error de monto, se recarga* sirve; *error* "
        "no. Quien revise el mes tiene que entender qué pasó sin preguntarte.",
        "**Los egresos, igual que los ingresos, con comprobante.** Es la plata que sale y nadie "
        "reclama después: ese archivo es el único respaldo.",
    ])


def _buzon(g):
    g.capitulo(4, "Buzón de la web y preinscripciones")
    g.parrafo(
        "El buzón es lo único del sistema que cualquiera en internet puede llenar. Es donde "
        "más rápido se acumula la basura y donde más duele dejar a alguien sin respuesta.")
    g.vinetas([
        "**Contestá dentro de las 48 horas.** Pasado ese plazo el sistema avisa a "
        "administración con una sola alerta, no una por ficha.",
        "**Una ficha se cierra cuando produjo algo** (una reserva, una inscripción o una "
        "venta), no cuando le creaste la cuenta. Crear la cuenta no es atenderla.",
        "**Descartá lo que no sirve** (spam, pruebas, duplicados) en vez de dejarlo abierto. "
        "El contador del menú es el número que tiene que tender a cero.",
        "**Usá el botón de WhatsApp de la ficha.** El mensaje sale redactado con lo que la "
        "persona pidió y, si corresponde, con la clave temporal y los datos para transferir.",
        "**La clave temporal se ve una sola vez.** Antes de cerrar la ventana, mandala por "
        "WhatsApp. Si se pierde se genera otra, pero la persona queda esperando.",
    ])
    g.titulo("Plazos que hay que tener presentes", 2)
    g.tabla(
        ["Qué", "Plazo", "Qué pasa"],
        [
            ["Prereserva de cabina", "72 horas", "Vence sola si no entra la seña."],
            ["Preinscripción sin seña", "24 horas",
             "Figura como vencida y avisa; no se cancela sola."],
            ["Preinscripción abandonada", "21 días desde el alta", "Se cancela sola."],
        ],
        [5.0, 4.0, 6.0], titulo="Plazos del buzón y de las reservas")
    g.recuadro("Importante",
               "Entre las 24 horas y las tres semanas, **la decisión es de Mica**: esperar, "
               "reclamar o cancelar. Conviene que sea siempre la misma persona y que cada caso "
               "termine decidido, no olvidado.")


def _reservas(g):
    g.capitulo(5, "Reservas y calendario")
    g.parrafo(
        "El calendario es la verdad sobre qué sala está ocupada. Si alguien alquila o da clase "
        "por fuera de él, la próxima persona que reserve va a chocar con algo que el sistema no "
        "sabe.")
    g.vinetas([
        "**Nada se reserva sin seña.** Es una regla del sistema, sin excepciones (salvo mix & "
        "mastering, que decide Ghezz caso por caso).",
        "**Cargales el precio total a las reservas pagas.** Sin precio, el sistema no sabe "
        "cuánto falta cobrar y la reserva nunca aparece como deuda.",
        "**Las clases se cargan una por una** y se marca la asistencia al terminar. Una clase "
        "solo se descuenta del curso cuando efectivamente se dio.",
        "**Si una clase cambia de día, movela; no la cancelés para crearla de nuevo.** Moverla "
        "mantiene la seña y el historial; cancelar y recrear devuelve y vuelve a cobrar.",
        "**Bloqueá las salas** por mantenimiento, feriados o eventos en Bloqueos. El bloqueo "
        "se repite todos los días del rango, en ese horario.",
        "**Resolvé las reprogramaciones con una fecha concreta**, no con un *ya vemos*. Si no "
        "se puede, rechazala con un motivo: le llega a la persona dentro de la notificación.",
        "**Mirá el informe de Uso de salas una vez al mes.** Una sala en cero horas es el "
        "dato más útil del informe.",
    ])


def _alumnos(g):
    g.capitulo(6, "Alumnos e inscripciones")
    g.vinetas([
        "**Antes de crear una persona, buscala.** Un alumno duplicado parte su historial, sus "
        "pagos y sus clases en dos fichas. El buscador funciona por nombre, email o teléfono.",
        "**Un curso es un contrato.** Cargale el precio real y la moneda en el alta. Si el "
        "catálogo de Programas tiene el precio por cantidad de personas, el formulario lo "
        "completa solo: mantenelo al día.",
        "**Los grupos se arman una vez y no cambian.** Un grupo es un solo contrato de hasta "
        "tres personas. Si alguien se suma o se va, se cancela el grupo y se rehace. Pensalo "
        "antes de cargarlo.",
        "**Pausar no es cancelar.** Un curso pausado no recibe clases, y su alumno sigue en la "
        "lista porque tiene clases pendientes. Si no vuelve, cancelalo.",
        "**El nivel baja con motivo.** Bajar a un alumno de nivel pide una razón escrita, que "
        "queda firmada.",
        "**Leé la ficha completa antes de una charla difícil con un alumno.** Ahí está el "
        "seguimiento y las notas de cada profesor, que administración sí puede ver.",
    ])


def _mastering(g):
    g.capitulo(7, "Mix & mastering")
    g.parrafo(
        "Es el servicio con más dinero por trabajo y más clientes sin cuenta. El sistema sigue "
        "cada trabajo por estados; lo importante es moverlos con las acciones y a tiempo.")
    g.vinetas([
        "**Un trabajo por cada pedido, desde el primer día.** Aunque el pedido llegue por "
        "WhatsApp, cargalo con el cliente y el precio apenas se acuerda.",
        "**Confirmá con precio.** Sin precio acordado no se puede confirmar, y sin precio el "
        "sistema no sabe cuánto falta cobrar.",
        "**Usá los botones, no el estado a mano.** Confirmar, Entregar y Cancelar tienen reglas "
        "propias. Al entregar se guarda la fecha real: sin ella, la alerta de *entregado hace 7 "
        "días sin cobrar* no se dispara.",
        "**La canción terminada y el premaster son dos cosas distintas.** La canción terminada "
        "se entrega para revisión. El premaster es el archivo para discográficas y queda "
        "retenido hasta que el precio esté cubierto.",
        "**Liberar el premaster sin pago es una excepción firmada.** Primero se intenta la "
        "entrega normal; solo si el sistema la rechaza aparece **Liberarlo igual, con "
        "motivo**. Escribí algo concreto: *cliente habitual, paga el viernes*, no *autorizado*.",
        "**Cobrá desde el trabajo.** El cobro hereda al cliente, con cuenta o con nombre "
        "escrito, y el trabajo pasa a Pagado solo cuando lo cobrado cubre el precio en su "
        "moneda.",
        "**Si el cliente se registra después, asignale la cuenta al trabajo.** Sus pagos se "
        "mudan con él y ve en su portal lo que hizo y lo que pagó.",
        "**Registrá las revisiones de más** aunque se pasen de las incluidas: es el dato que "
        "avisa que el trabajo se está alargando.",
        "**No canceles un trabajo con plata adentro.** Primero se anula el pago, con motivo, y "
        "después se cancela.",
    ])


def _sello(g):
    g.capitulo(8, "Sello discográfico")
    g.parrafo(
        "El sello tiene una regla dura: **no se publica un lanzamiento sin su contrato "
        "firmado**. Casi todos los hábitos de este capítulo salen de ahí.")
    g.vinetas([
        "**Subí el contrato apenas se firma.** Es un archivo PDF, no un link: un link a un "
        "Drive ajeno puede morir sin avisar. Puede ser el del lanzamiento o uno general del "
        "artista.",
        "**Cargá el lanzamiento en cuanto está confirmado**, no cuando sale. La alerta de *una "
        "semana para el lanzamiento* se calcula desde la fecha que cargues.",
        "**Elegí bien el formato antes de cargar canciones.** Un EP lleva de 3 a 6 temas y un "
        "álbum de 8 a 15; el rango se exige al publicar. Un lanzamiento con canciones no puede "
        "cambiar de formato.",
        "**Completá cada canción** con duración, invitados e ISRC: es lo que piden las "
        "plataformas y es lo más difícil de reconstruir después.",
        "**Publicar sin contrato es una excepción con motivo escrito.** El sistema primero "
        "rechaza y después ofrece **Publicarlo igual, con motivo**. Tiene que ser raro: si pasa "
        "seguido, el problema no es el sistema.",
        "**Un lanzamiento que se cae se cancela**, no se deja colgado. Cancelar no pide motivo, "
        "pero no se puede deshacer.",
        "**Registrar dónde sonaron los temas es opcional.** Si no lo usan, la sección puede "
        "quedar vacía.",
    ])
    g.recuadro("Importante",
               "Los artistas no tienen cuenta propia en el sistema. Todo lo que necesiten ver o "
               "corregir pasa por el equipo.")


def _profesores(g):
    g.capitulo(9, "Para los profesores")
    g.parrafo(
        "Lo que cada profesor carga es lo que después usa administración para decidir. Tres "
        "minutos después de cada clase alcanzan.")
    g.vinetas([
        "**Marcá la asistencia el mismo día.** Una clase solo se descuenta del curso cuando se "
        "registra que se dio. Si no se marca, el alumno parece tener clases de más.",
        "**Dejá una nota después de cada clase**, aunque sea de una línea. Las notas son "
        "privadas: no las ven los alumnos ni otros profesores, pero **administración sí**.",
        "**Usá el semáforo con criterio y dejá en gris lo que no evaluaste.** *Sin marcar* es un "
        "dato honesto; un verde que nadie puso hace que un alumno que lo necesita pase "
        "desapercibido.",
        "**Si cubrís una clase ajena, dejá la nota de esa sesión.** Quien reemplaza es quien "
        "mejor sabe cómo anduvo.",
        "**Si no podés dar una clase, usá *No puedo ese día* en tu agenda** y proponé una fecha "
        "concreta. Queda escrito por qué se movió y administración lo resuelve sin ir y venir "
        "por WhatsApp.",
        "**Subí el material al curso correcto.** El material pertenece al curso de un alumno o "
        "de un grupo, no a *todos*.",
        "**Podés usar el sistema desde el celular.** El menú se abre desde la barra de arriba.",
    ])


def _clientes(g):
    g.capitulo(10, "Para alumnos y clientes")
    g.parrafo("Este capítulo se le puede pasar suelto a quien usa el portal.")
    g.vinetas([
        "**Entrá con tu cuenta y cambiá la clave temporal enseguida.** Vence a los 7 días; si "
        "venció, pedí otra al estudio.",
        "**Tu email es tu usuario** y no se cambia solo desde el portal. Si cambió, avisale al "
        "estudio.",
        "**Mirá tu estado de cuenta antes de preguntar.** Ahí está lo que pagaste, lo que "
        "falta y tus comprobantes para descargar.",
        "**Si no podés ir a una clase, usá *No puedo ese día* con tiempo** y proponé otra "
        "fecha. Avisar el mismo día por WhatsApp no deja nada registrado.",
        "**Pedí la cabina desde el portal.** Te muestra los horarios libres y el estudio la "
        "confirma cuando entra la seña. No hay reserva sin seña.",
        "**Las clases se descuentan cuando se dan.** Si faltás sin avisar, igual cuenta como "
        "dada.",
        "**En mix & mastering, mirá tu trabajo en el portal.** Ves el estado y los links de "
        "entrega; el archivo para discográficas se libera cuando el trabajo está cubierto.",
    ])


def _direccion(g):
    g.capitulo(11, "Dirección y tablero")
    g.parrafo(
        "El tablero es tan bueno como lo cargado. Antes de sacar conclusiones, conviene saber "
        "qué se está mirando.")
    g.vinetas([
        "**Distinguí lo del período de lo de hoy.** Ingresos, ocupación, entregas y "
        "lanzamientos son del período elegido. Alumnos activos, deuda viva y retención son una "
        "foto de hoy y no cambian al mover el filtro.",
        "**Retención en blanco no es 0 %.** Significa que todavía no se cerró la ventana de 10 "
        "meses de nadie.",
        "**La deuda viva es la suma de Deudores.** Si el número asusta, la solución es limpiar "
        "esa lista, no el tablero.",
        "**Pesos y dólares no se suman.** Aparecen separados a propósito: el sistema no inventa "
        "una cotización.",
        "**Exportá al cierre de cada mes.** Cada hoja y cada página del archivo lleva los "
        "filtros, la fecha y quién lo generó, para que un fragmento suelto siga siendo "
        "rastreable.",
        "**Los socios ven el tablero completo; administración ve el resumen básico.** Es a "
        "propósito.",
    ])


def _cuentas(g):
    g.capitulo(12, "Cuentas, claves y respaldos")
    g.titulo("Cuentas y claves")
    g.vinetas([
        "**Una cuenta por persona, siempre.** Nunca reutilices una cuenta para otra persona: "
        "las firmas de anulaciones, notas y excepciones dejan de significar algo.",
        "**Entregá las claves temporales por WhatsApp, directo a la persona**, nunca en un "
        "grupo.",
        "**Cuando alguien se va del equipo, desactivá su cuenta ese mismo día.** Saca el acceso "
        "de inmediato y conserva todo su historial.",
        "**Si alguien cambia de función, cambiá su rol.** Un rol de más es un riesgo.",
        "**Cambiar o resetear una clave cierra todas las sesiones abiertas.** Si sospechás "
        "que alguien entró sin permiso, reseteá la clave.",
        "**Marcá *Recordarme* solo en tu equipo personal.** Mantiene la sesión 30 días.",
        "**Cuando estén cargados los usuarios reales, desactivá la cuenta de desarrollo** que "
        "venía con el sistema. Es una credencial conocida y no debe quedar activa.",
    ])
    g.titulo("Respaldos")
    g.parrafo(
        "Un respaldo que nadie probó restaurar es una suposición. El sistema guarda dos cosas "
        "distintas y las dos se respaldan juntas: la base de datos y los archivos (contratos y "
        "comprobantes).")
    g.vinetas([
        "**Verificá una vez por semana que existe el respaldo del día** y que tiene un tamaño "
        "razonable. Uno de pocos kilobytes indica que falló.",
        "**Guardá una copia fuera del servidor.** Si el servidor se pierde, los respaldos que "
        "estaban dentro se pierden con él.",
        "**Probá una restauración al menos una vez**, y de nuevo cada vez que cambie el "
        "servidor. La prueba tiene que incluir abrir un contrato y un comprobante: una base "
        "restaurada sin sus archivos parece sana hasta que alguien intenta abrirlos.",
    ])


def _problemas(g):
    g.capitulo(13, "Cuando algo no cuadra")
    g.parrafo(
        "La mayoría de las cosas raras se explican por una regla del sistema que conviene "
        "conocer antes de pensar que hay un error.")
    g.vinetas([
        "**Si el sistema rechaza algo, leé el mensaje.** Dice la regla en palabras: falta una "
        "seña, la moneda no coincide, la sala ya está ocupada.",
        "**Si un número del tablero te parece mal, mirá la pantalla de origen.** La deuda viva "
        "sale de Deudores y la caja sale de Caja. Si ahí está bien, el tablero está bien.",
        "**Si no encontrás un pago, una reserva o una persona, probá con otros filtros** antes "
        "de cargarla de nuevo. Cargar dos veces es peor que tardar un minuto más.",
        "**Si una pantalla se pone en negro o muestra un recuadro con texto técnico, copiá ese "
        "texto.** Incluye la ruta y el mensaje, y es lo que hace falta para encontrar el "
        "problema.",
    ])
    g.titulo("Al reportar un problema, pasá estos cuatro datos", 2)
    g.numerada([
        "La pantalla donde estabas, o su dirección.",
        "Qué querías hacer y qué pasó en cambio.",
        "El texto exacto del error, si lo hubo.",
        "La hora aproximada y la cuenta con la que estabas.",
    ])
    g.recuadro("Regla final",
               "Ante la duda, no borres ni *arregles* a mano. Anulá con motivo, avisá y dejá "
               "que el historial cuente lo que pasó.")
