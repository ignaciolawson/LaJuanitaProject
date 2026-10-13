"""Contenido del Manual de Usuario.

Los nombres de botones, campos y pantallas están tomados del código del panel
(apps/platform/src/paginas): si una pantalla cambia un texto, el manual tiene que
cambiar con ella. Va en voseo porque así le habla el sistema a quien lo usa."""

from libro import _numeracion

ADMIN = "administración (ADMIN o STAFF)"
ALUMNO = "una cuenta de alumno de prueba"
PROFE = "una cuenta de profesor de prueba"


def escribir(m):
    _introduccion(m)
    _numeracion(m.doc.sections[-1], "decimal", 1)
    _primeros_pasos(m)
    _portal(m)
    _profesor(m)
    _personas(m)
    _comercial(m)
    _salas(m)
    _dinero(m)
    _sello_mastering(m)
    _direccion(m)
    _avisos(m)
    _problemas(m)
    _glosario(m)


# =============================================================================== 1


def _introduccion(m):
    m.capitulo(1, "Introducción")
    m.titulo("Para qué sirve el sistema")
    m.parrafo(
        "El sistema de gestión de La Juanita Studio reúne en un solo lugar todo lo que el "
        "estudio hacía entre Notion, Excel y WhatsApp: los alumnos y sus cursos, la agenda de "
        "las salas, los cobros y los pagos, el mix & mastering, el sello discográfico y los "
        "números de la dirección. Además, cada persona que se relaciona con el estudio "
        "(alumnos, profesores y clientes) tiene su propio portal para ver lo suyo sin "
        "depender de un mensaje.")

    m.titulo("Cómo está organizado este manual")
    m.parrafo(
        "El manual está ordenado por **quién usa cada parte**. Los capítulos 2 a 4 son para "
        "todos: cómo entrar, el portal de alumnos y clientes, y el de profesores. Los "
        "capítulos 5 a 10 son para el equipo del estudio y siguen el orden del menú de "
        "administración. Al final hay un capítulo con los avisos automáticos, otro con "
        "problemas frecuentes y un glosario.")
    m.parrafo("En todo el manual se usan estas convenciones:", junto=True)
    m.vinetas([
        "**En negrita**, el texto exacto de un botón, un campo o una opción de la pantalla. "
        "Por ejemplo: tocá **Nueva reserva**.",
        "**Menú › Sección**, el camino en el menú de la izquierda. Por ejemplo: **Dinero › "
        "Deudores**.",
        "*En cursiva*, lo que el sistema muestra escrito.",
    ])

    m.titulo("Cómo se entra")
    m.parrafo(
        "El sistema funciona en el navegador; no hay que instalar nada. Se entra desde el "
        "sitio web del estudio, con el botón para ingresar, o directamente desde la dirección "
        "del panel, que termina en **/app**. Funciona en una computadora, una tableta o un "
        "celular, con cualquier navegador actualizado (Chrome, Edge, Firefox o Safari).")

    m.titulo("Quién ve qué")
    m.parrafo(
        "Lo que aparece en el menú depende de dos cosas: el **rol** de tu cuenta, que dice qué "
        "podés administrar, y tus **relaciones** con el estudio, que dicen si sos alumno o "
        "profesor. Una misma persona puede tener las dos cosas: un profesor que además es "
        "parte del equipo ve su agenda y las pantallas de administración.", junto=True)
    m.tabla(
        ["Quién", "Qué ve en el menú"],
        [
            ["Cualquier persona con cuenta",
             "**Mi cuenta**: Inicio, Mis reservas, Reservar cabina, Mis pedidos, Mis trabajos, "
             "Mis pagos, Notificaciones y Mi perfil."],
            ["Alumno", "Además, en **Mi formación**: Mis cursos y Mis materiales."],
            ["Profesor", "Además, en **Mi formación**: Mi agenda, Mis alumnos y Subir "
                         "material."],
            ["STAFF (equipo operativo)",
             "Además, todo el menú de administración: Personas, Comercial, Salas y agenda, "
             "Dinero, Sello y mastering, y el resumen financiero del Tablero."],
            ["DIRECTIVO (dirección)",
             "Ve todas las pantallas de administración y el tablero completo, pero **no puede "
             "modificar nada**: no le aparecen los botones de cargar, editar ni anular."],
            ["ADMIN (administración general)",
             "Todo lo anterior, y además es quien da y cambia roles y administra las cuentas "
             "del equipo."],
        ],
        [4.5, 10.5], titulo="Qué ve cada persona en el menú")


# =============================================================================== 2


def _primeros_pasos(m):
    m.capitulo(2, "Primeros pasos")

    m.titulo("Crear tu cuenta")
    m.parrafo(
        "Cualquiera puede crearse una cuenta, aunque no sea alumno: hace falta para pedir una "
        "cabina, ver tus pagos o seguir un trabajo de mix & mastering.", junto=True)
    m.numerada([
        "En la pantalla de ingreso, tocá **Creá una**.",
        "Completá **Nombre**, **Apellido**, **Email**, **Teléfono** y **Contraseña** (mínimo "
        "8 caracteres).",
        "Confirmá. Entrás directamente al sistema.",
    ])
    m.cap("01-registro", "Pantalla para crear una cuenta", "/app/registro",
          "nadie (sin sesión iniciada)", "Cerrá la sesión si tenías una abierta.",
          "El formulario completo de **Crear cuenta**, vacío o con datos inventados.")
    m.recuadro("Importante",
               "Si el sistema te dice que el email ya tiene una cuenta, es porque alguna vez te "
               "registraste o te dio de alta el estudio. No crees otra: pedile a la "
               "administración que te genere una contraseña nueva.")

    m.titulo("Ingresar")
    m.numerada([
        "Escribí tu **Email** y tu **Contraseña**.",
        "Si la computadora o el celular son tuyos, marcá **Recordarme**: la sesión queda "
        "abierta 30 días. Si no lo marcás, se cierra a las 8 horas o al cerrar el navegador.",
        "Tocá **Ingresá**.",
    ])
    m.cap("02-login", "Pantalla de ingreso", "/app/login", "nadie (sin sesión iniciada)",
          "Cerrá la sesión.", "Los campos Email y Contraseña, la casilla **Recordarme** y el "
          "enlace **Creá una**.")
    m.recuadro("Si olvidaste la contraseña",
               "No hay forma de recuperarla, porque el sistema la guarda encriptada. Pedile a "
               "la administración que te genere una nueva: te llega por WhatsApp.")

    m.titulo("Tu primera vez con una contraseña temporal")
    m.parrafo(
        "Cuando la administración te crea la cuenta o te resetea la contraseña, te manda por "
        "WhatsApp una **contraseña temporal**. Al entrar con ella, el sistema te pide elegir "
        "una propia antes de dejarte hacer cualquier otra cosa. La temporal **vence a los 7 "
        "días**: si no la usaste a tiempo, pedí otra.")
    m.cap("03-cambio-de-contrasena", "Cambio obligatorio de la contraseña temporal",
          "/app (primer ingreso)", "una cuenta recién creada por la administración",
          "Creá una cuenta de prueba desde **Personas › Directorio › Nueva cuenta**, anotá "
          "la contraseña temporal, cerrá sesión y entrá con ella.",
          "La pantalla que pide la contraseña nueva.")
    m.recuadro("Importante",
               "Cambiar la contraseña cierra la sesión en todos los demás dispositivos donde "
               "estuviera abierta.")

    m.titulo("La pantalla principal")
    m.parrafo(
        "A la izquierda está el **menú**, ordenado en grupos. Algunas secciones muestran un "
        "número al lado: son cosas esperando que alguien las mire, como notificaciones sin "
        "leer, pedidos de sala o consultas de la web. Al pie del menú están tu nombre, tu "
        "rol, el botón para pasar del **tema claro al oscuro** y **Cerrar sesión**.")
    m.parrafo(
        "La primera pantalla es **Inicio**, y lo que muestra depende de quién sos: tu próxima "
        "clase y lo que debés si sos alumno, las clases de hoy si sos profesor, y la agenda "
        "del día, los pedidos pendientes y los números del mes si sos del equipo.")
    m.cap("04-inicio-administracion", "Inicio de una persona del equipo", "/app/",
          "admin (ADMIN)", "Que haya alguna reserva hoy y algún pedido o consulta pendiente.",
          "El menú completo a la izquierda, con algún contador, y los bloques del Inicio.")

    m.titulo("Desde el celular")
    m.parrafo(
        "En un celular o una tableta vertical, el menú se esconde para dejar lugar a la "
        "pantalla. Se abre con el botón de la barra de arriba y se cierra solo al elegir una "
        "sección. Las tablas se muestran como tarjetas, una debajo de la otra, y cada dato "
        "lleva su nombre al lado.")
    m.cap("05-celular", "El sistema en un celular, con el menú abierto", "/app/",
          "admin (ADMIN)", "Modo celular de Chrome (F12, iPhone 12 Pro).",
          "El menú desplegado sobre la pantalla.", ancho_cm=7.0)

    m.titulo("Notificaciones")
    m.parrafo(
        "En **Mi cuenta › Notificaciones** llegan los avisos del sistema: la respuesta a un "
        "pedido, una clase que se movió, una deuda vencida. Tocá **Marcar leída** en cada una "
        "o **Marcar todas como leídas**. Si el aviso lleva a una pantalla, el botón **Ver** te "
        "lleva y lo marca como leído.")
    m.cap("06-notificaciones", "Bandeja de notificaciones", "/app/notificaciones",
          "admin (ADMIN)", "Que haya notificaciones leídas y sin leer.",
          "La lista, con al menos una sin leer (con el punto) y el botón **Marcar todas como "
          "leídas**.")

    m.titulo("Mi perfil")
    m.parrafo(
        "En **Mi cuenta › Mi perfil** podés corregir tu **Nombre**, **Apellido** y "
        "**Teléfono**. El email no se cambia desde acá porque es tu usuario para entrar: si "
        "necesitás cambiarlo, pedíselo a la administración.")
    m.cap("07-mi-perfil", "Pantalla de Mi perfil", "/app/mi-perfil", ALUMNO, "—",
          "Los campos editables y el email bloqueado con su aclaración.")


# =============================================================================== 3


def _portal(m):
    m.capitulo(3, "Portal del alumno y del cliente")
    m.parrafo(
        "Este capítulo es para alumnos y para cualquier persona que contrata un servicio del "
        "estudio: alquila una cabina, graba un set o encarga un mix & mastering. Las secciones "
        "de **Mi formación** solo aparecen si sos alumno.")

    m.titulo("Inicio")
    m.parrafo(
        "Muestra lo más importante de un vistazo: tu próxima reserva o clase, los pedidos que "
        "esperan respuesta, lo que debés y, si sos alumno, cuántas clases te quedan y el "
        "último material que te subieron.")
    m.cap("08-inicio-alumno", "Inicio de un alumno", "/app/", ALUMNO,
          "Que el alumno tenga un curso activo, una clase próxima y algún material.",
          "Los bloques *Mi próxima clase*, *Clases que me quedan* y *Lo que debo*.")

    m.titulo("Mis cursos")
    m.parrafo(
        "Cada curso que estás haciendo, con tu nivel y tu avance clase por clase: cada paso "
        "pintado es una clase tomada. Si te inscribiste pero todavía no pagaste la seña, el "
        "curso dice *Preinscripto · falta la seña*: tu lugar queda confirmado cuando entra el "
        "pago. Debajo están los materiales de clase.")
    m.cap("09-mis-cursos", "Mis cursos, con el avance por clase", "/app/mis-cursos", ALUMNO,
          "Que el alumno tenga algunas clases tomadas.",
          "Un curso con su barra de pasos (algunos pintados).")

    m.titulo("Mis reservas")
    m.parrafo(
        "Tus clases y tus alquileres de las próximas cuatro semanas, en dos grupos separados. "
        "Con **← Anterior** y **Siguiente →** te movés de período. En las clases ya dadas "
        "figura si *Asististe*, *Faltaste* o tuviste una *Falta justificada*.")
    m.titulo("Pedir otro día para una clase", nivel=2)
    m.numerada([
        "En la clase que no podés tomar, tocá **Pedir otro día**.",
        "Escribí **Por qué no podés** y, si querés, un **Día que te vendría bien**.",
        "Confirmá. La clase todavía no se mueve: la administración lo revisa y te confirma "
        "el horario nuevo por una notificación.",
    ])
    m.parrafo(
        "Mientras tanto, la clase muestra *Pediste moverla · esperando respuesta*. Si se "
        "aprueba, aparece en su nuevo horario con la marca *La movimos a pedido tuyo*.")
    m.cap("10-mis-reservas", "Mis reservas, pidiendo otro día", "/app/mis-reservas", ALUMNO,
          "Que el alumno tenga una clase futura.",
          "La lista de clases y el formulario **Pedir otro día** abierto en una de ellas.")

    m.titulo("Reservar una cabina")
    m.parrafo(
        "Desde **Mi cuenta › Reservar cabina** podés pedir una sala para practicar o la "
        "cabina de grabación para grabar un set.", junto=True)
    m.numerada([
        "Elegí **Qué querés hacer**, la **Sala** y el **Día**. La pantalla te muestra qué "
        "horarios ya están ocupados ese día.",
        "Elegí **Desde** y **Hasta** en un horario libre.",
        "Si querés, aclará algo en el último campo y enviá el pedido.",
    ])
    m.recuadro("Importante",
               "Enviar el pedido **todavía no reserva la sala**. La administración lo revisa, "
               "te escribe para coordinar la seña, y la reserva queda tomada cuando la abonás. "
               "El pedido se aprueba tal cual lo hiciste: si el horario ya no sirve, te lo "
               "rechazan con un motivo y pedís otro.")
    m.cap("11-reservar-cabina", "Pedido de una cabina", "/app/reservar", ALUMNO,
          "Elegí un día que tenga algún horario ocupado.",
          "El formulario con la sala y el día elegidos, y la franja *Ya ocupado ese día*.")

    m.titulo("Mis pedidos")
    m.parrafo(
        "El estado de cada cabina que pediste: esperando respuesta, confirmada, rechazada "
        "(con el motivo) o cancelada. Mientras está esperando podés **Cancelar** el pedido. "
        "Si se confirmó, el botón **Ver la reserva en mis reservas** te lleva a ella.")
    m.cap("12-mis-pedidos", "Mis pedidos de cabina", "/app/mis-solicitudes", ALUMNO,
          "Hacé un pedido y, desde administración, aprobá o rechazá otro.",
          "Un pedido esperando respuesta y uno resuelto.")

    m.titulo("Mis pagos")
    m.parrafo(
        "Tu estado de cuenta: lo que contrataste, lo que pagaste y lo que debés, separado por "
        "moneda, porque pesos y dólares no se suman. Desde cada pago podés **Ver comprobante** "
        "si la administración lo adjuntó. Los pagos los registra el estudio y desde acá no se "
        "editan: si algo no cuadra, escribí.")
    m.cap("13-mis-pagos", "Mis pagos (estado de cuenta)", "/app/mis-pagos", ALUMNO,
          "Que el alumno tenga una seña pagada y un saldo pendiente.",
          "Los saldos por moneda, lo contratado y la lista de movimientos.")

    m.titulo("Mis trabajos (mix & mastering)")
    m.parrafo(
        "Si encargaste una mezcla o una masterización, acá ves cómo viene cada trabajo y "
        "desde dónde bajarlo. La *canción terminada* (master) aparece cuando se entrega. El "
        "*archivo para discográficas* (premaster) se habilita una vez registrado el pago. Los "
        "trabajos se piden por WhatsApp y aparecen acá cuando el estudio los da de alta.")
    m.cap("14-mis-trabajos", "Mis trabajos de mix & mastering", "/app/mix-mastering",
          "una cuenta de cliente de prueba con un trabajo entregado",
          "Un trabajo entregado y sin pagar.",
          "El trabajo con el enlace del master y el aviso de que el premaster se entrega al "
          "pagar.")

    m.titulo("Mis materiales")
    m.parrafo(
        "Los materiales que te subieron tus profesores: packs de samples, proyectos, videos. "
        "Tocá **Abrir** para verlos. Los sube cada profesor cuando los tiene listos.")
    m.cap("15-mis-materiales", "Mis materiales", "/app/mis-materiales", ALUMNO,
          "Que un profesor le haya publicado algún material.", "La lista con el botón **Abrir**.")


# =============================================================================== 4


def _profesor(m):
    m.capitulo(4, "Portal del profesor")
    m.parrafo(
        "Estas secciones aparecen en **Mi formación** para quien da clases en el estudio.")

    m.titulo("Mi agenda")
    m.parrafo(
        "Tus clases de las próximas cuatro semanas, con la sala, el horario y los alumnos de "
        "cada una. Arriba figura cuántas clases diste en el período. Si no podés dar una "
        "clase, usá **Pedir otro día**, igual que un alumno (ver el capítulo 3).")
    m.cap("16-mi-agenda", "Mi agenda del profesor", "/app/mi-agenda", PROFE,
          "Que el profesor tenga clases cargadas en estas semanas.",
          "Las clases del período y el contador de clases dictadas.")

    m.titulo("Mis alumnos")
    m.parrafo(
        "Una tarjeta por curso: si es un grupo, se ve el número de grupo y sus integrantes "
        "adentro; si es individual, el alumno solo. Cada tarjeta dice cuántas clases le "
        "quedan al curso, y cada alumno tiene un **semáforo**: *va bien*, *requiere atención*, "
        "*en pausa* o *Sin marcar*. Aparecen los alumnos de tus cursos y también los de "
        "clases que diste como suplente.")
    m.cap("17-mis-alumnos", "Mis alumnos, con un grupo y el semáforo", "/app/mis-alumnos",
          PROFE, "Que el profesor tenga un curso grupal y uno individual.",
          "Una tarjeta de grupo con sus integrantes y semáforos de colores distintos.")

    m.titulo("La ficha de un alumno")
    m.parrafo(
        "Al entrar a un alumno ves su ficha, con tres partes:", junto=True)
    m.vinetas([
        "**Cómo viene**: el semáforo y unas **Observaciones**. Guardalo con **Guardar "
        "seguimiento**.",
        "**Mis notas**: notas sobre una clase en particular o una **Observación general**. "
        "Son privadas: no las ve el alumno ni otros profesores, pero sí la administración. "
        "Podés **Corregir** las tuyas.",
        "**Subir material**: el atajo para compartirle algo solo a ese alumno.",
    ])
    m.cap("18-ficha-alumno-profesor", "Ficha de un alumno vista por su profesor",
          "/app/mis-alumnos/(id)", PROFE, "Cargale una nota y un estado de seguimiento.",
          "El bloque *Cómo viene* con el semáforo y la lista *Mis notas*.")

    m.titulo("Subir material")
    m.numerada([
        "Poné un **Título** y, si querés, el **Tipo** (sample pack, proyecto, video…).",
        "Pegá el **Link** (tiene que empezar con http:// o https://). El archivo no se sube "
        "al sistema: se comparte el enlace de Drive, WeTransfer o donde esté.",
        "Elegí **¿Para qué curso?** y, si es de una clase puntual, **¿De qué clase?**; si no, "
        "queda **De todo el curso**.",
        "Marcá **Publicarlo ahora** para que lo vean, o dejalo sin publicar y habilitalo "
        "después.",
    ])
    m.parrafo(
        "El material de un curso grupal lo ven todos los integrantes del grupo. Abajo, **Lo "
        "que subiste** lista todo tu material.")
    m.cap("19-subir-material", "Subir material para un curso", "/app/material", PROFE, "—",
          "El formulario completo y la lista *Lo que subiste*.")


# =============================================================================== 5


def _personas(m):
    m.capitulo(5, "Personas")
    m.parrafo(
        "El grupo **Personas** del menú reúne a todos los que se relacionan con el estudio. "
        "Cada persona tiene una sola cuenta; ser alumno o profesor se le agrega a esa cuenta. "
        "Por eso, al dar de alta a alguien, lo primero que pregunta el sistema es si ya tiene "
        "cuenta.")

    m.titulo("Alumnos")
    m.parrafo(
        "La lista de alumnos, con buscador y filtros por estado, disciplina y nivel. El "
        "filtro de disciplina muestra a quienes **están cursando** esa disciplina hoy.")
    m.cap("20-alumnos", "Listado de alumnos con sus filtros", "/app/admin/alumnos", ADMIN,
          "Que haya alumnos de DJ y de Producción.", "La barra de filtros y la tabla.")
    m.titulo("Dar de alta un alumno", nivel=2)
    m.numerada([
        "Tocá **Nuevo alumno**.",
        "En **¿Ya tiene cuenta?**, elegí **Sí, ya se registró** y buscalo, o **No, es "
        "nueva** y completá Nombre, Apellido, Email y Teléfono.",
        "Completá el **Nivel de ingreso** y, si querés, el **Instagram**, y confirmá.",
        "Si se creó una cuenta nueva, aparece la **contraseña temporal**. Usá **Mandarle la "
        "clave por WhatsApp**: el mensaje ya va escrito.",
    ])
    m.recuadro("Importante",
               "La contraseña temporal **no se puede volver a ver** después de cerrar ese "
               "cuadro. Si se pierde, hay que generar otra desde **Directorio › Resetear "
               "contraseña**.")
    m.cap("21-contrasena-nueva", "Contraseña temporal recién creada, con el botón de WhatsApp",
          "/app/admin/alumnos", ADMIN,
          "Dá de alta un alumno con cuenta nueva (datos inventados).",
          "El bloque con la contraseña, el aviso *vence a los 7 días* y el botón **Mandarle la "
          "clave por WhatsApp**.")
    m.parrafo(
        "Para inscribir al alumno en un curso, seguí en **Comercial › Inscripciones** (ver el "
        "capítulo 6).")

    m.titulo("La ficha del alumno", nivel=2)
    m.parrafo(
        "Al tocar un alumno se abre su ficha completa: sus datos, los cursos que está "
        "haciendo con las clases restantes, el historial de clases, su estado de cuenta, y "
        "las notas y los materiales de todos sus profesores.")
    m.cap("22-ficha-alumno", "Ficha del alumno vista por la administración",
          "/app/admin/alumnos/(id)", ADMIN, "Un alumno con curso, clases y pagos.",
          "Los bloques de la ficha (si no entra en una pantalla, la parte de arriba).")

    m.titulo("Profesores")
    m.parrafo(
        "Se da de alta igual que un alumno: **Nuevo profesor**, **¿Ya tiene cuenta?** y, "
        "opcionalmente, la **Especialidad**. En cuanto se crea, la persona ve en su menú **Mi "
        "agenda**, **Mis alumnos** y **Subir material**. Desde cada profesor podés "
        "**Editar** o **Resetear contraseña**. Cuando alguien deja de dar clases, destildá "
        "**Sigue dando clases**: deja de ofrecerse en las inscripciones nuevas pero conserva "
        "su historial.")
    m.cap("23-profesores", "Listado de profesores", "/app/admin/profesores", ADMIN, "—",
          "La tabla, con algún profesor que tenga *contraseña sin cambiar*.")

    m.titulo("Equipo, Clientes y Directorio")
    m.vinetas([
        "**Equipo**: las cuentas con rol ADMIN, DIRECTIVO o STAFF.",
        "**Clientes**: quienes pagaron algún servicio sin ser alumnos ni profesores, con o "
        "sin cuenta. Tocando el nombre se ve su estado de cuenta.",
        "**Directorio**: todas las cuentas del sistema. Desde acá se crea una cuenta suelta "
        "(**Nueva cuenta**), se corrigen los datos de contacto (**Editar**), se genera una "
        "contraseña nueva (**Resetear contraseña**) y se desactiva a alguien.",
    ])
    m.cap("24-directorio", "Directorio de cuentas", "/app/admin/usuarios", ADMIN, "—",
          "La tabla con las acciones **Editar** y **Resetear contraseña** visibles.")
    m.recuadro("Reglas que conviene conocer",
               "Solo un ADMIN puede dar roles o tocar la cuenta de alguien del equipo. Nadie "
               "puede quitarse el rol ni desactivarse a sí mismo: así el sistema nunca se queda "
               "sin un administrador. Una cuenta no se borra nunca, se desactiva, y deja de "
               "poder entrar en ese mismo momento.")


# =============================================================================== 6


def _comercial(m):
    m.capitulo(6, "Comercial: consultas, programas e inscripciones")

    m.titulo("Buzón de la web")
    m.parrafo(
        "Cada formulario que alguien completa en el sitio web del estudio (inscribirse a un "
        "curso, reservar una cabina, grabar un set, consultar por equipos) llega acá como una "
        "**ficha**. El buzón es la lista de gente esperando respuesta, así que una ficha no "
        "desaparece hasta que se la atiende. El filtro de arriba muestra **Lo que falta "
        "hacer**, **Ya atendidas**, **Descartadas** o **Todas**.")
    m.cap("25-buzon", "Buzón de la web", "/app/admin/buzon", ADMIN,
          "Completá dos o tres formularios desde el sitio web con datos inventados.",
          "La lista con fichas de intereses distintos.")
    m.titulo("Atender una ficha", nivel=2)
    m.numerada([
        "Abrí la ficha. Se ve qué pidió la persona: el programa, su experiencia, la "
        "modalidad, el día y horario preferido o los equipos que le interesan.",
        "Tocá **Escribirle por WhatsApp**: se abre el chat con un mensaje ya redactado según "
        "lo que pidió.",
        "Cuando corresponda, cargale lo que pidió desde la misma ficha:",
    ])
    m.vinetas([
        "**Inscribirlo** (consultas de cursos): crea las cuentas que falten, incluidas las de "
        "los compañeros si viene en grupo, y la inscripción, con el programa, el nivel "
        "sugerido y el precio ya completos. Queda **preinscripto** hasta que pague la seña.",
        "**Apartar el horario** (cabina o grabación): crea la cuenta si hace falta y aparta "
        "la sala por **72 horas**. Si no abona antes, el horario se libera solo, y mientras "
        "tanto la deuda figura en Deudores.",
        "**Crearle la cuenta**, si todavía no la tiene y solo necesitás eso.",
    ])
    m.parrafo(
        "Cuando la cuenta se crea en ese momento, aparecen las contraseñas y el botón para "
        "mandarlas por WhatsApp en un solo mensaje al referente. Tocá **Listo** para volver "
        "al buzón.")
    m.cap("26-buzon-ficha", "Una ficha del buzón abierta, con sus acciones",
          "/app/admin/buzon", ADMIN, "Abrí una ficha de curso pendiente.",
          "Los datos de la ficha y los botones **Escribirle por WhatsApp**, **Inscribirlo** y "
          "**Descartar**.")
    m.cap("27-buzon-inscribir", "Inscribir desde el buzón, con todo precargado",
          "/app/admin/buzon", ADMIN, "En una ficha de curso, tocá **Inscribirlo**.",
          "El formulario con Programa, Nivel, Profesor, Clases y precio completos.")
    m.titulo("Cerrar o descartar una ficha", nivel=2)
    m.parrafo(
        "Una ficha queda atendida cuando **produjo algo**: una inscripción, una reserva o una "
        "venta. Si lo cargaste por otro lado, usá **Ya se lo cargué** y elegí de la lista qué "
        "se le cargó; la ficha queda apuntando a eso para siempre. Si la consulta no va a "
        "ningún lado, usá **Descartar** y escribí el motivo: *spam* y *llamé tres veces y no "
        "contesta* no son lo mismo para quien abra el buzón la semana siguiente.")

    m.titulo("Programas")
    m.parrafo(
        "El catálogo de lo que se vende como curso: un programa por disciplina (DJ, "
        "Producción y Mentoría). Cada uno tiene su precio individual, el **Precio de a 2** y el "
        "**Precio de a 3** (el total que paga el grupo entero), la moneda, las **Clases "
        "estándar** y si se cobra por paquete o por sesión. Cambiar un precio no afecta las "
        "inscripciones ya cargadas: cada una guarda el suyo. Un programa que se deja de dar se "
        "desactiva.")
    m.cap("28-programas", "Catálogo de programas", "/app/admin/programas", ADMIN, "—",
          "Los tres programas con sus precios, y uno abierto en **Editar**.")

    m.titulo("Inscripciones")
    m.parrafo(
        "Una inscripción es el contrato de un curso: quiénes lo cursan (uno, dos o tres), en "
        "qué disciplina y nivel, cuántas clases y a qué precio. La lista se filtra por "
        "disciplina y por estado.")
    m.titulo("Inscribir a un alumno o a un grupo", nivel=2)
    m.numerada([
        "Tocá **Nueva inscripción**.",
        "Elegí al alumno. Para un grupo, sumá a los compañeros (hasta tres en total) y marcá "
        "quién es el **Referente**: a esa persona se le escribe y a su nombre figura la deuda.",
        "Elegí la **Disciplina**. El sistema completa el precio según el catálogo y el tamaño "
        "del grupo, y las **Clases contratadas**.",
        "Completá el **Nivel**, el **Profesor** y, si ya la saben, la **Fecha de inicio**.",
        "Si el alumno pagó la seña en ese momento, marcá **La seña entró ahora**: el **Monto "
        "de la seña** viene con el 50 % del precio. Si no, el botón dice **Preinscribir**.",
    ])
    m.cap("29-inscripcion-grupal", "Alta de una inscripción grupal con seña",
          "/app/admin/inscripciones", ADMIN,
          "Tocá **Nueva inscripción** y armá un grupo de dos o tres.",
          "Los integrantes con el referente marcado, el precio del grupo y **La seña entró "
          "ahora** tildada.")
    m.titulo("Los estados de una inscripción", nivel=2)
    m.tabla(
        ["Estado", "Qué significa"],
        [
            ["Preinscripta", "Tiene el lugar reservado y le falta la seña. Pasa a activa sola "
                             "cuando se registra la seña en Pagos. Si a las 24 horas no pagó, "
                             "llega un aviso; a los 21 días sin seña se cancela sola."],
            ["Activa", "Está cursando: sus clases se descuentan del paquete."],
            ["Pausada", "Dejó de venir por un tiempo; conserva las clases que le quedan. No "
                        "recibe clases nuevas hasta reactivarla."],
            ["Completada", "Terminó el curso."],
            ["Cancelada", "Se dio de baja. No se puede reabrir."],
        ],
        [3.2, 11.8], titulo="Estados de una inscripción")
    m.recuadro("Reglas que conviene conocer",
               "Una persona no puede tener dos inscripciones abiertas en la misma disciplina. "
               "Los integrantes de un grupo quedan fijos: si el grupo cambia, se cancela la "
               "inscripción y se arma otra. Para bajar de nivel a un alumno, el sistema pide "
               "un motivo y registra quién lo hizo.")
    m.cap("30-inscripciones", "Listado de inscripciones", "/app/admin/inscripciones", ADMIN,
          "Que haya inscripciones individuales, grupales y alguna preinscripta.",
          "La tabla con un grupo y una preinscripta visibles.")


# =============================================================================== 7


def _salas(m):
    m.capitulo(7, "Salas y agenda")

    m.titulo("El calendario")
    m.parrafo(
        "**Salas y agenda › Calendario** muestra la semana completa: los días en columnas y "
        "las horas en filas. Cada reserva dice la sala, el tipo de uso y el profesor. Con "
        "**← Semana anterior** y **Semana siguiente →** te movés; con el filtro de sala ves "
        "una sola; **Ver canceladas** muestra también las que se cayeron. Las salas bloqueadas "
        "aparecen marcadas y no se ofrecen como libres. En el celular, la grilla se desliza "
        "hacia el costado.")
    m.cap("31-calendario", "Calendario semanal", "/app/admin/reservas", ADMIN,
          "Una semana con varias clases, un alquiler y alguna sala bloqueada.",
          "La grilla completa de la semana.")

    m.titulo("Cargar una clase", nivel=2)
    m.numerada([
        "Tocá **Nueva reserva** o el **+ reservar** de un horario libre.",
        "Elegí la **Sala**, **Para qué** (clase de DJ, producción o mentoría), la **Fecha** y "
        "el horario **Desde** / **Hasta**.",
        "En **Quién toma la clase**, buscá el curso: un alumno o un grupo (podés escribir "
        "*grupo 41*). Solo aparecen cursos activos de esa disciplina.",
        "Vienen todos los integrantes: destildá a quien no venga. El **Profesor** se completa "
        "con el del curso; cambialo si da la clase un suplente.",
        "Guardá. La clase se descuenta sola del curso.",
    ])
    m.cap("32-nueva-clase", "Cargar una clase eligiendo el curso", "/app/admin/reservas",
          ADMIN, "Tocá **Nueva reserva** y elegí una clase de DJ.",
          "El formulario con el curso elegido, sus integrantes tildados y el profesor "
          "precargado.")

    m.titulo("Cargar un alquiler o una grabación", nivel=2)
    m.numerada([
        "Igual que una clase, pero en **Para qué** elegí *Alquiler de cabina* o *Grabación de "
        "set*. La grabación solo se puede hacer en la cabina de grabación.",
        "Poné el **Precio total** y la **Moneda de la reserva**.",
        "Completá la seña: **Quién paga**, **Monto** (viene con el 50 %), **Cómo pagó** y, si "
        "hay, el **Comprobante**. Lo que falte después de la seña aparece en Deudores.",
    ])
    m.recuadro("Importante",
               "Sin seña no se aparta un horario. Si la persona todavía no pagó, el horario se "
               "aparta desde **Pedidos de sala** o desde el **Buzón de la web**, por 72 horas.")
    m.cap("33-nuevo-alquiler", "Cargar un alquiler con su seña", "/app/admin/reservas",
          ADMIN, "Tocá **Nueva reserva** y elegí *Alquiler de cabina*.",
          "Los campos de precio y el bloque de la seña.")

    m.titulo("Una reserva abierta", nivel=2)
    m.parrafo(
        "Al tocar una reserva se ve quiénes participan. Desde ahí se marca la **asistencia** "
        "de cada uno, se suma a alguien con **+ Anotar a alguien**, se cambia de día u horario "
        "con **Mover**, y se da de baja con **Cancelar la reserva**. Una clase cancelada no "
        "descuenta clases del curso.")
    m.cap("34-reserva-abierta", "Una clase abierta, con asistencia", "/app/admin/reservas",
          ADMIN, "Abrí una clase grupal ya dictada.",
          "Los participantes con su asistencia y los botones **Mover** y **Cancelar la "
          "reserva**.")

    m.titulo("Pedidos de sala")
    m.parrafo(
        "Los pedidos de cabina que la gente hace desde su portal. Cada uno se resuelve de una "
        "de tres formas:", junto=True)
    m.vinetas([
        "**Ya pagó: cobrar ahora**: cargás la seña y la reserva queda confirmada.",
        "**Apartar el horario**: la reserva se crea y queda apartada **72 horas** a la espera "
        "de la seña, con la deuda anotada en Deudores. Si no paga, se libera sola.",
        "**Rechazar**: escribí el motivo y qué puede hacer; le llega como notificación.",
    ])
    m.cap("35-pedidos-de-sala", "Resolver un pedido de sala", "/app/admin/solicitudes",
          ADMIN, "Hacé un pedido desde una cuenta de prueba.",
          "El pedido abierto con las opciones de **Cómo se resuelve**.")

    m.titulo("Pedidos de cambio de horario")
    m.parrafo(
        "Los pedidos de *otro día* de alumnos y profesores. Para aprobar uno tocá **Darle "
        "otro horario**, elegí sala, día y horas, y **Mover la clase**: la clase se mueve, se "
        "les avisa a todos diciendo de dónde a dónde, y la seña que la respaldaba queda igual. "
        "Si no se puede, **Rechazar** con un mensaje que diga qué sí se puede.")
    m.cap("36-pedidos-de-cambio", "Darle otro horario a una clase",
          "/app/admin/reprogramaciones", ADMIN,
          "Pedí otro día desde la cuenta de un alumno de prueba.",
          "El pedido con su motivo y el formulario **Darle otro horario** abierto.")

    m.titulo("Salas bloqueadas")
    m.parrafo(
        "Para sacar una sala de servicio (mantenimiento, refacción, un evento), tocá "
        "**Bloquear una sala**, elegí la sala, el motivo y el rango de días. Por defecto se "
        "bloquea el día entero; con **Solo una franja horaria** se bloquea un horario.")
    m.recuadro("Importante",
               "La franja **se repite todos los días del rango**: *de 9 a 13 toda la semana "
               "que viene* deja la sala libre de 13 en adelante todos esos días. Para "
               "devolverla al uso, **Desbloquear**.")
    m.cap("37-bloqueos", "Bloquear una sala", "/app/admin/bloqueos", ADMIN, "—",
          "El formulario con **Solo una franja horaria** marcada y su aclaración.")

    m.titulo("Uso de las salas")
    m.parrafo(
        "Cuántas horas se usó cada sala en un período, con las reservas canceladas y "
        "reprogramadas aparte (no suman horas). Una sala que no se usó aparece en cero.")
    m.cap("38-uso-de-salas", "Reporte de uso de las salas", "/app/admin/uso-salas", ADMIN,
          "Elegí **Últimos 30 días**.", "Las tres salas con sus horas.")


# =============================================================================== 8


def _dinero(m):
    m.capitulo(8, "Dinero")
    m.parrafo(
        "Todo el dinero se registra en **pesos (ARS) o dólares (USD)**, y las dos monedas "
        "nunca se suman entre sí. Un pago en dólares pide la **Cotización del dólar** del día, "
        "porque sin ella el importe no se puede reconstruir después. Ningún movimiento se "
        "borra: si algo se cargó mal, se **anula** con un motivo y queda registrado quién lo "
        "hizo.")

    m.titulo("Deudores: dónde se cobra")
    m.parrafo(
        "**Dinero › Deudores** muestra todo lo que falta cobrar, **una fila por deudor** y "
        "ordenadas por antigüedad, porque la pregunta es a quién hay que llamar primero. "
        "Adentro de cada fila están todas sus deudas: la seña de un curso, el resto de un "
        "alquiler, un trabajo de mix & mastering entregado, una venta. Una deuda de un grupo "
        "figura a nombre del grupo, con el referente como contacto.")
    m.cap("39-deudores", "Deudores, una fila por persona", "/app/admin/deudores", ADMIN,
          "Que haya al menos dos deudores, uno con dos deudas.",
          "La lista, con una fila que tenga varias deudas adentro.")
    m.titulo("Cobrar", nivel=2)
    m.numerada([
        "En la deuda, tocá **Registrar el pago** (o **Cobrar**, si era una deuda anotada).",
        "El formulario ya viene completo: qué se salda, la persona, la moneda y el saldo. "
        "Corregí el **Monto** si pagó una parte.",
        "Elegí **Cómo pagó** y adjuntá el **Comprobante** si lo hay (una foto de la "
        "transferencia o un PDF).",
        "Confirmá. Si cubrió el saldo, la deuda sale de la lista. Si era la seña de una "
        "preinscripción, la inscripción pasa a activa.",
    ])
    m.cap("40-cobrar", "Cobrar desde Deudores con el formulario precargado",
          "/app/admin/deudores", ADMIN, "Tocá **Registrar el pago** en una deuda.",
          "El formulario abierto con el destino, la persona y el monto completos.")

    m.titulo("Pagos")
    m.parrafo(
        "**Dinero › Pagos** es lo ya cerrado: cada pago cuyo saldo quedó cubierto, separado "
        "en solapas por línea de negocio. Desde cada pago se puede:", junto=True)
    m.vinetas([
        "**Corregir** el monto, la moneda, la fecha o el medio. Quién pagó y qué salda no se "
        "corrigen: si eso está mal, el pago es otro, así que se anula y se carga el correcto.",
        "**Anular**, con un motivo. Deja de contar en la caja.",
        "Ver, sumar o **Invalidar** sus comprobantes. Un comprobante equivocado no se borra: "
        "queda marcado como inválido con tu nombre, y se adjunta el correcto al lado.",
    ])
    m.cap("41-pagos", "Listado de pagos por línea de negocio", "/app/admin/pagos", ADMIN,
          "—", "Las solapas, la tabla y las acciones **Corregir** y **Anular** de una fila.")
    m.cap("42-anular", "Anular un pago con su motivo", "/app/admin/pagos", ADMIN,
          "Tocá **Anular** en un pago de prueba.", "El cuadro que pide el motivo.")

    m.titulo("Estado de cuenta")
    m.parrafo(
        "Desde el nombre de una persona (en Pagos, Deudores, Clientes o la ficha del alumno) "
        "se llega a su estado de cuenta: saldos por moneda, lo que contrató y todos sus "
        "movimientos. Es lo mismo que la persona ve en **Mis pagos**.")
    m.cap("43-estado-de-cuenta", "Estado de cuenta de una persona",
          "/app/admin/estado-de-cuenta/(id)", ADMIN, "Una persona con pagos y deuda.",
          "Saldos, contratos y movimientos.")

    m.titulo("Caja")
    m.parrafo(
        "Los ingresos, los egresos y el saldo de un período, **por moneda**, y por dónde "
        "entró la plata (efectivo, transferencia, PayPal, cuenta en EE. UU.). Los atajos "
        "**Últimos 30 días** y **Este mes** eligen el período más usado.")
    m.cap("44-caja", "Caja del mes", "/app/admin/caja", ADMIN, "Elegí **Este mes**.",
          "Las dos monedas, cada una con sus ingresos, egresos y neto.")

    m.titulo("Egresos")
    m.parrafo(
        "La plata que sale. Tocá **Registrar egreso** y completá el **Concepto**, el **Monto** "
        "y la **Moneda**. Si es un sueldo, elegí el **Profesor**; si no, marcá **No es un pago "
        "a un profesor** y escribí **A quién**. Adjuntá el comprobante: es la única prueba de "
        "que el pago se hizo. La lista se separa en **Pagos a profesores** y **Otros gastos**.")
    m.cap("45-egresos", "Registrar un egreso", "/app/admin/egresos", ADMIN, "—",
          "El formulario abierto y la lista con las dos solapas.")

    m.titulo("Venta de equipos")
    m.parrafo(
        "Registra una venta de equipo Pioneer, que ya se hizo: el estudio no tiene stock "
        "propio. Tocá **Registrar venta**, completá el **Modelo** (lo único obligatorio del "
        "equipo), el **Comprador** (con o sin cuenta) y el **Precio**. Si se cobró en el "
        "momento, marcá **Ya se cobró**. Si no, la venta queda *sin cobrar* y aparece en "
        "Deudores.")
    m.cap("46-ventas", "Registrar una venta de equipo", "/app/admin/ventas", ADMIN, "—",
          "El formulario con un comprador sin cuenta.")


# =============================================================================== 9


def _sello_mastering(m):
    m.capitulo(9, "Mix & Mastering y Sello")

    m.titulo("Mix & Mastering")
    m.parrafo(
        "Cada trabajo de mezcla o masterización, de la confirmación al cobro. Los audios "
        "**no pasan por el sistema**: se guardan los enlaces (WeTransfer, Drive). La lista se "
        "busca por track o cliente y se filtra por estado.")
    m.cap("47-mix-mastering", "Trabajos de mix & mastering", "/app/admin/mix-mastering",
          ADMIN, "Trabajos en estados distintos.", "La lista con sus estados.")
    m.titulo("Cargar un trabajo", nivel=2)
    m.parrafo(
        "Tocá **Nuevo trabajo**. El **Cliente** puede tener cuenta o no: si no la tiene, "
        "escribí su nombre y un **Contacto**. Completá el **Track**, el **Tipo** (mezcla, "
        "master o ambas), el **Precio acordado** (se puede dejar vacío mientras se "
        "presupuesta), las **Revisiones incluidas** y el **Link del material del cliente**. "
        "Las **Notas internas** no las ve el cliente.")
    m.titulo("El ciclo del trabajo", nivel=2)
    m.parrafo("Al abrir un trabajo, las acciones aparecen según en qué estado esté:",
              junto=True)
    m.numerada([
        "**Confirmar presupuesto**: pide que tenga precio. Pasa a *en proceso*.",
        "**Registrar una revisión** cada vez que el cliente pide un cambio. Si se superan las "
        "incluidas, queda a la vista para cobrar el extra.",
        "**Entregar el master**: con el enlace de la canción terminada y la fecha. Desde ahí "
        "corren 7 días para cobrarlo; si no se paga, pasa a *debe* y llega un aviso.",
        "**Registrar cobro**: el pago va a nombre del cliente del trabajo. Cuando cubre el "
        "precio, el trabajo pasa a *pagado*.",
        "**Liberar el premaster**: el archivo para discográficas.",
    ])
    m.cap("48-trabajo", "Un trabajo abierto con sus acciones", "/app/admin/mix-mastering",
          ADMIN, "Abrí un trabajo entregado y sin pagar.",
          "El expediente y los botones **Registrar cobro** y **Liberar el premaster**.")
    m.recuadro("La regla del premaster",
               "El premaster se libera **solo con el precio cubierto**, en la moneda del "
               "trabajo. Si se intenta antes, el sistema lo rechaza y explica cuánto falta. "
               "Recién entonces aparece **Liberarlo igual, con motivo**: es la excepción, "
               "queda registrada con tu nombre y la fecha, y existe para no tener que esquivar "
               "el sistema, no para usarla siempre.")
    m.cap("49-premaster", "El premaster rechazado y la excepción con motivo",
          "/app/admin/mix-mastering", ADMIN,
          "En un trabajo sin pagar, tocá **Liberar el premaster**.",
          "El mensaje de rechazo y el botón **Liberarlo igual, con motivo**.")
    m.parrafo(
        "Un trabajo se puede cancelar con **Cancelar el trabajo** si no tiene pagos vigentes "
        "(anulalos primero). Un trabajo cancelado no se reabre. Si el cliente se crea una "
        "cuenta después, **Asignarle una cuenta** le pasa el trabajo y sus pagos, y lo empieza "
        "a ver en su portal.")

    m.titulo("Sello")
    m.parrafo(
        "El catálogo del sello: cada lanzamiento (*release*) con su código (LJ020, LJ021…), "
        "su artista, su tipo (single, EP, remix o álbum), su fecha estimada y su estado. Antes "
        "de crear un release tiene que existir su artista (**Sello y mastering › "
        "Artistas**).")
    m.cap("50-sello", "Catálogo del sello", "/app/admin/sello", ADMIN,
          "Releases en estados distintos.", "La lista con códigos, artistas y estados.")
    m.titulo("Un release por dentro", nivel=2)
    m.vinetas([
        "**Contratos**: **Adjuntar contrato** sube el PDF o la imagen firmada. Puede ser del "
        "release o **general del artista**, que respalda todos sus lanzamientos.",
        "**Temas**: para un EP o un álbum, **Agregar tema** con el **Título**, la "
        "**Duración**, el **Artista invitado** y el **ISRC**. El orden se cambia con las "
        "flechas.",
        "**Dónde sonó**: después del lanzamiento, **Anotar** cada aparición en una radio, un "
        "set o una playlist.",
        "**Mover el estado**: a confirmar, confirmado, en distribución. Una semana antes de "
        "la fecha estimada llega un aviso.",
    ])
    m.cap("51-release", "Un release abierto: contrato, temas y dónde sonó",
          "/app/admin/sello", ADMIN, "Un EP con contrato y tres temas cargados.",
          "Los bloques **Contratos**, **Temas** y **Dónde sonó**.")
    m.recuadro("Para publicar",
               "**Publicar** exige un contrato adjunto y, si es un EP, entre 3 y 6 temas (un "
               "álbum, entre 8 y 15). Sin contrato, el sistema lo rechaza y ofrece "
               "**Publicarlo igual, con motivo**, que queda registrado. Un release que no va "
               "a salir se retira con **Cancelar release**, que no tiene vuelta atrás.")

    m.titulo("Artistas")
    m.parrafo(
        "La ficha de cada artista del sello: **Nombre artístico**, nombre real, contacto, "
        "Instagram y bio. Los artistas no entran al sistema; el email es solo para "
        "contactarlos. Desde la ficha se puede **Adjuntar contrato general**.")
    m.cap("52-artistas", "Ficha de un artista", "/app/admin/artistas", ADMIN, "—",
          "Un artista abierto con su contrato general.")


# ============================================================================== 10


def _direccion(m):
    m.capitulo(10, "Tablero de dirección")
    m.parrafo(
        "**Dirección › Tablero** reúne los números del negocio. Arriba se elige el período "
        "(**Desde** / **Hasta**, o los atajos **Este mes** y **90 días**). Algunos bloques "
        "son del período elegido (la caja, los ingresos por línea, la ocupación) y otros "
        "son una foto de hoy (los alumnos cursando, los cobros pendientes, la retención), y "
        "cada uno lo dice.")
    m.tabla(
        ["Bloque", "Qué muestra"],
        [
            ["La caja del período", "Ingresos, egresos y neto, por moneda."],
            ["Cobros pendientes", "Lo que falta cobrar hoy, lo mismo que suma Deudores."],
            ["De dónde salió la plata", "Los ingresos por línea de negocio."],
            ["Alumnos cursando", "Los alumnos activos por disciplina."],
            ["Cuándo se llena el estudio", "Un mapa de calor de la ocupación por día y hora."],
            ["Retención", "Quiénes contrataron un segundo servicio dentro de los 10 meses del "
                          "primero."],
            ["Conversión", "Quiénes llegaron por un servicio suelto y después se inscribieron "
                           "a un curso."],
            ["Mix & Mastering · El sello", "Trabajos entregados y lanzamientos del período."],
        ],
        [4.8, 10.2], titulo="Bloques del tablero")
    m.cap("53-tablero", "Tablero de dirección completo", "/app/admin/tablero",
          "admin (ADMIN) o un directivo de prueba", "Elegí **90 días**.",
          "Los bloques de números y el mapa de calor (si no entra, dos capturas).")
    m.titulo("Exportar", nivel=2)
    m.parrafo(
        "Los botones **Excel** y **PDF** descargan exactamente lo que se está viendo, con el "
        "mismo período. Cada hoja y cada página llevan un encabezado con el período, la "
        "fecha y quién lo generó, para que se sepa de dónde salió cada número.")
    m.recuadro("Para el equipo operativo",
               "Una cuenta STAFF ve el **resumen financiero básico** del tablero. La ocupación, "
               "la retención y la actividad del sello son de la dirección.")


# ============================================================================== 11


def _avisos(m):
    m.capitulo(11, "Avisos automáticos")
    m.parrafo(
        "Todos los días el sistema revisa la situación y deja avisos en las **Notificaciones** "
        "de la administración (ADMIN y STAFF). Cada aviso llega **una sola vez por hecho**: "
        "una deuda vieja no avisa todos los días, para que la bandeja no se llene de "
        "repeticiones. Lo pendiente sigue a la vista en su pantalla.", junto=True)
    m.tabla(
        ["Aviso", "Cuándo llega"],
        [
            ["Deuda vencida", "Una deuda anotada cumple 7 días sin pagarse."],
            ["Trabajo entregado sin pagar", "Un trabajo de mix & mastering lleva 7 días "
                                            "entregado y sin cobrar."],
            ["Lanzamiento próximo", "Falta una semana para la fecha estimada de un release."],
            ["Preinscripción vencida", "Pasaron 24 horas sin la seña de una preinscripción."],
            ["Preinscripción cancelada", "Pasaron 21 días sin seña: se cancela sola."],
            ["Consultas sin responder", "Hay fichas del buzón con más de 48 horas sin "
                                        "atender."],
            ["Prerreserva vencida", "Una cabina apartada no se señó en 72 horas y se liberó."],
        ],
        [5.0, 10.0], titulo="Avisos automáticos del sistema")
    m.parrafo(
        "A alumnos y clientes les llegan, en su bandeja, las respuestas a sus pedidos y los "
        "cambios de horario de sus clases. El sistema no manda correos: lo urgente se les "
        "escribe por WhatsApp con los mensajes prearmados.")


# ============================================================================== 12


def _problemas(m):
    m.capitulo(12, "Problemas frecuentes")
    m.parrafo(
        "Cuando el sistema rechaza algo, el mensaje dice por qué. Estos son los más "
        "habituales y qué hacer con cada uno.", junto=True)
    m.tabla(
        ["Situación", "Qué hacer"],
        [
            ["No puedo entrar.",
             "Verificá que el email sea el de tu cuenta. Si no recordás la contraseña, pedile "
             "a la administración que la resetee."],
            ["La contraseña temporal no funciona.", "Vence a los 7 días. Pedí una nueva."],
            ["Me sacó del sistema en el celular.",
             "Si cambiaste la contraseña en otro dispositivo, se cierran todas las sesiones. "
             "Volvé a entrar."],
            ["No me aparece una sección del menú.",
             "El menú depende del rol y de las relaciones. Si sos alumno o profesor y no ves "
             "tus secciones, la administración tiene que darte la relación."],
            ["La sala está ocupada en ese horario.",
             "Otra reserva ya lo tiene. Mirá el calendario y elegí otro horario u otra sala."],
            ["La sala no admite ese uso.",
             "Por ejemplo, grabación fuera de la cabina de grabación, o producción en la "
             "cabina de grabación. Elegí la sala correcta."],
            ["Un alumno o profesor ya está en otra sala a esa hora.",
             "Nadie puede estar en dos reservas al mismo tiempo. Revisá su agenda."],
            ["No encuentro el curso al cargar una clase.",
             "Solo aparecen cursos activos de esa disciplina. Si está preinscripto, falta "
             "registrar la seña; si está pausado, hay que reactivarlo."],
            ["Ya tiene una inscripción abierta en esa disciplina.",
             "No se pueden tener dos a la vez. Revisá la que ya existe en Inscripciones."],
            ["No me deja liberar el premaster.",
             "Falta cubrir el precio. Registrá el cobro, o usá **Liberarlo igual, con motivo** "
             "si corresponde la excepción."],
            ["No me deja publicar un release.",
             "Falta el contrato o la cantidad de temas no es la de un EP o un álbum."],
            ["No me deja anular una venta o cancelar un trabajo.",
             "Tiene un pago vigente. Anulá primero el pago."],
            ["Me equivoqué al cargar un pago.",
             "Si el error es de monto, fecha o medio, **Corregir**. Si es de persona o de qué "
             "salda, **Anular** y cargarlo de nuevo."],
            ["La pantalla muestra un recuadro de error con un texto técnico.",
             "Copiá ese texto y mandáselo a quien da soporte: dice exactamente qué falló y "
             "dónde."],
        ],
        [5.6, 9.4], titulo="Problemas frecuentes y cómo resolverlos")


# ============================================================================== 13


def _glosario(m):
    m.capitulo(13, "Glosario")
    m.tabla(
        ["Término", "Significado"],
        [
            ["Cuenta", "El usuario con el que una persona entra al sistema. Cada persona tiene "
                       "una sola."],
            ["Rol", "Qué puede administrar una cuenta: ADMIN, DIRECTIVO, STAFF o USUARIO."],
            ["Inscripción", "El contrato de un curso, de uno a tres alumnos, con su programa, "
                            "nivel, precio y clases."],
            ["Grupo", "Una inscripción de dos o tres alumnos. Tiene un número y un referente."],
            ["Referente", "El integrante del grupo al que se le escribe y a cuyo nombre figura "
                          "la deuda."],
            ["Preinscripción", "Una inscripción que espera la seña. Ocupa el lugar pero todavía "
                               "no cursa."],
            ["Seña", "El pago adelantado que reserva un lugar: el 50 % del precio, por "
                     "defecto."],
            ["Prerreserva", "Un horario de cabina apartado 72 horas mientras se espera la "
                            "seña."],
            ["Reserva", "Una ocupación de una sala en un día y horario: una clase, un alquiler "
                        "o una grabación."],
            ["Bloqueo", "Un período en que una sala no puede usarse."],
            ["Ficha", "Una consulta que llegó desde el sitio web, en el buzón."],
            ["Master", "La canción terminada de un trabajo de mix & mastering."],
            ["Premaster", "El archivo para presentar el tema a una discográfica. Se entrega "
                          "con el pago."],
            ["Release", "Un lanzamiento del sello: single, EP, remix o álbum."],
            ["ISRC", "El código internacional que identifica una grabación."],
            ["Comprobante", "La foto o el PDF que respalda un pago o un egreso."],
            ["Anular", "Dejar sin efecto un pago, egreso o venta. No se borra: queda registrado "
                       "quién, cuándo y por qué."],
        ],
        [3.6, 11.4], titulo="Glosario")
