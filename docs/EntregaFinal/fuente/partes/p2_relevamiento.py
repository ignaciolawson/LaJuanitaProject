"""Parte II — Informe de Relevamiento.

Describe el negocio ANTES del sistema. Se corrigieron los datos que la entrevista
dio mal y el cliente corrigió después (las salas, Córdoba, la dirección), y se
sumaron dos cosas que el relevamiento original no nombraba y el sistema sí resolvió:
el alquiler y la grabación como proceso propio, y la necesidad de un canal de entrada
propio. La entrevista no va: los anexos quedan fuera del libro."""

from libro import AQUI


def escribir(libro):
    # ------------------------------------------------------------------ Prólogo
    libro.titulo("Prólogo")
    libro.parrafo(
        "El presente informe detalla el proceso de análisis y relevamiento realizado para "
        "La Juanita Studio, un estudio de música electrónica con sede en el Office Park "
        "Quatro de Pilar, provincia de Buenos Aires.")
    libro.parrafo(
        "Ante el crecimiento sostenido que experimentó el estudio en el último tiempo, "
        "producto del auge de la cultura electrónica y del aumento de la demanda de formación "
        "en DJ y producción musical, se detectó la necesidad de reemplazar la gestión manual "
        "actual por procesos centralizados, automatizados y escalables.")
    libro.parrafo(
        "Esta iniciativa responde a los cuellos de botella operativos que hoy recaen casi por "
        "completo sobre una única persona, Micaela, que administra alumnos, horarios, pagos, "
        "comunicaciones y registros al mismo tiempo y sin el apoyo de un sistema integrado. "
        "El relevamiento busca documentar con precisión cómo funciona hoy el negocio, "
        "identificar sus problemas y necesidades, y sentar las bases para diseñar una solución "
        "tecnológica adecuada.")

    # --------------------------------------------------------------- La empresa
    libro.titulo("La empresa")
    libro.titulo("Datos de la empresa", nivel=2)
    libro.tabla(
        ["Dato", "Detalle"],
        [
            ["Cliente", "La Juanita Studio (escuela) y La Juanita Music (sello discográfico)"],
            ["Razón social", "La Juanita"],
            ["País", "Argentina"],
            ["Sede", "Office Park Quatro, Colectora Oeste Ramal Pilar 209, locales 5 y 6, "
                     "B1669 Pilar, provincia de Buenos Aires"],
            ["Año de fundación", "2021"],
            ["Horario de atención", "De 10 a 18 h"],
            ["Personal", "Entre 10 y 20 personas: dirección, administración, profesores, "
                         "producción y community manager"],
            ["Herramientas actuales", "Notion, Excel, Google Sheets y WhatsApp"],
            ["Canal de contacto", "WhatsApp (+54 9 11 5310-8738), único canal de entrada"],
        ],
        [4.0, 11.0], titulo="Datos de La Juanita Studio")

    libro.titulo("Reseña", nivel=2)
    libro.parrafo(
        "La Juanita es un sello discográfico y estudio de formación musical dedicado a la "
        "música electrónica. Fue fundado por la familia Oppel como principal inversora, junto "
        "a Federico Castelo y Chapa Ruiz (*Chapa & Castelo*), dos DJ y productores con la "
        "visión de construir un espacio integral para artistas emergentes.")
    libro.parrafo(
        "Desde su sede en Pilar, La Juanita ofrece cursos de DJ y de producción musical para "
        "todos los niveles, mentorías personalizadas, alquiler de cabina, grabación de sets, "
        "mezcla y masterización, venta de equipos y organización de eventos en Argentina, "
        "Uruguay y Brasil. El sello, además, recibe y comercializa proyectos musicales de "
        "distintos países bajo una curaduría orientada a su sonido característico.")
    libro.parrafo(
        "El estudio cuenta con tres espacios físicos, a los que internamente llaman "
        "*cabinas* porque en todos se toca: la **Sala 1** y la **Sala 2**, de práctica, y la "
        "**Cabina de grabación**, equipada con cámara para grabar sets. Las dos salas sirven "
        "para cualquier actividad que se dé sentado frente a una pantalla. La cabina de "
        "grabación, en cambio, no tiene silla, escritorio ni televisor: sirve para grabar "
        "sets y, como mucho, para las clases de DJ que son solo de práctica.", junto=True)
    libro.tabla(
        ["Uso", "Sala 1", "Sala 2", "Cabina de grabación"],
        [
            ["Clase de DJ", "Sí", "Sí", "Solo clases de práctica"],
            ["Clase de producción musical", "Sí", "Sí", "No"],
            ["Mentoría", "Sí", "Sí", "No"],
            ["Mix & mastering", "Sí", "Sí", "No"],
            ["Alquiler de cabina", "Sí", "Sí", "No"],
            ["Grabación de set", "No", "No", "Sí"],
        ],
        [5.5, 2.4, 2.4, 4.7], titulo="Usos posibles de cada espacio del estudio",
        nota="La entrevista describió una “sala de producción” dedicada; en la validación "
             "posterior con la administración se aclaró que no existe como tal y que los usos "
             "son los de esta tabla.")

    # --------------------------------------------------- Informe de relevamiento
    libro.titulo("Informe de relevamiento")
    libro.titulo("Objetivo del relevamiento", nivel=2)
    libro.parrafo(
        "El relevamiento tiene como objetivo principal identificar, comprender y documentar el "
        "funcionamiento actual de La Juanita Studio en sus dimensiones administrativa, "
        "operativa y comunicacional. Se busca conocer en profundidad las prácticas cotidianas, "
        "los problemas existentes, las necesidades no cubiertas y las limitaciones de las "
        "herramientas actuales, tanto desde la administración como desde la docencia y la "
        "producción.")
    libro.parrafo(
        "Para ello se releva el contexto real en el que trabajan los distintos actores del "
        "negocio (administración, profesores, dirección y alumnos), a partir de la "
        "observación del flujo de trabajo, del análisis del estudio de prefactibilidad y de "
        "la consulta directa a los actores clave mediante una entrevista.")

    libro.titulo("Alcance del relevamiento", nivel=2)
    libro.parrafo(
        "El relevamiento se centra en cómo La Juanita Studio gestiona hoy sus servicios "
        "(cursos, mentorías, mix & mastering, alquiler de cabina, grabación de sets y venta de "
        "equipos), la comunicación con alumnos y clientes, y la organización interna de "
        "horarios, salas, pagos y seguimiento.")
    libro.parrafo(
        "Se considera el comportamiento de todos los actores que intervienen en la prestación "
        "de los servicios, el registro de alumnos y cobros, la gestión de las salas y la "
        "operación diaria del estudio. El análisis tiene un alcance descriptivo y "
        "exploratorio: releva el contexto real sin proponer todavía una solución de software "
        "concreta ni anticipar decisiones técnicas.")

    libro.titulo("Fuentes consultadas", nivel=2)
    libro.vinetas([
        "Entrevista virtual con Micaela (Administración) y Ghezz (Director de Profesores y "
        "Producción), del 17 de abril de 2026.",
        "Estudio de prefactibilidad de La Juanita Studio, de marzo de 2026.",
        "Observación del flujo de trabajo descripto por los entrevistados (Notion, Excel, "
        "Google Sheets y WhatsApp).",
        "Experiencia propia como cliente del estudio.",
        "Validaciones posteriores con la administración, que confirmaron o corrigieron datos "
        "de la entrevista: los espacios del estudio, la sede, la dirección y los horarios.",
    ])

    # ---------------------------------------------------------------- Problemas
    libro.titulo("Problemas detectados en el contexto actual")
    problemas = [
        ("Concentración operativa en una única persona", [
            "Micaela es el único nexo entre los alumnos y el estudio. Toda consulta, "
            "inscripción, cambio de horario, registro de pago y comunicación pasa "
            "exclusivamente por ella, sin ningún mecanismo de autogestión para los alumnos. "
            "Esto genera una dependencia crítica: si Micaela no está disponible, el estudio "
            "se detiene.",
            "La administradora atiende WhatsApp de forma ininterrumpida, incluso de noche, lo "
            "que representa una carga operativa insostenible a medida que el negocio crece."]),
        ("Falta de integración entre herramientas", [
            "La Juanita usa varias herramientas en paralelo y a mano: Notion para organizar "
            "clases y horarios, Excel para el control financiero y el seguimiento de pagos, y "
            "WhatsApp para la comunicación y la entrada de consultas. No están conectadas "
            "entre sí, lo que duplica la carga de datos, genera inconsistencias y hace perder "
            "información.",
            "El estado de pago de un alumno, por ejemplo, se registra en Excel pero no se "
            "refleja en Notion, donde se reservan los horarios. Esto obliga a Micaela a cruzar "
            "datos entre plataformas antes de confirmar cada clase."]),
        ("Ausencia de autogestión del alumno", [
            "Los alumnos no tienen acceso a ningún portal propio. No pueden consultar sus "
            "horarios, ver el estado de sus pagos ni pedir un cambio de clase sin pasar por "
            "Micaela. Toda interacción requiere intervención humana directa, lo que genera "
            "demoras y frustración de ambos lados.",
            "La administración reconoce como urgente que los alumnos puedan gestionar parte "
            "de su cursada por su cuenta, aunque todavía no sabe si preferirán mantener el "
            "trato personalizado actual."]),
        ("Gestión de salas sin visibilidad en tiempo real", [
            "La asignación de salas es una fuente de conflictos internos. La Sala 1 y la Sala 2 "
            "se usan para clases de DJ y de producción, mentorías y trabajos de mix & "
            "mastering, y la cabina de grabación para grabar sets. Sin un sistema que muestre "
            "el estado de cada espacio en tiempo real, los cambios de último momento no llegan "
            "a tiempo a todos los involucrados.",
            "Ghezz, como director de producción, lleva su propio sistema paralelo porque el "
            "Notion general no le resulta suficientemente accesible para planificar sus "
            "sesiones. Esto genera información duplicada y desincronizada."]),
        ("Falta de trazabilidad en el seguimiento de alumnos y servicios", [
            "No existe un historial unificado por alumno que muestre su recorrido dentro del "
            "estudio: clases tomadas, nivel actual, pagos realizados, materiales recibidos y "
            "progreso en el programa. Cada profesor lleva su propio seguimiento (hojas, "
            "anotaciones personales o un Excel propio), lo que impide tener una visión "
            "institucional del alumno.",
            "El control de asistencia consiste en marcas manuales en la planilla del profesor, "
            "sin fecha ni observaciones. No queda registro de si un alumno faltó, si recuperó "
            "la clase ni de cuántas clases le quedan de su paquete."]),
        ("Informalidad en el servicio de mix & mastering", [
            "El servicio de mix & mastering se gestiona de forma completamente autónoma, al "
            "margen del resto del estudio. No hay un registro formal de los trabajos "
            "entregados, las revisiones realizadas ni los pagos pendientes: el seguimiento se "
            "hace a mano por WhatsApp.",
            "El registro que existe es una planilla mínima con fecha, cliente, valor y un "
            "estado básico (*paid*, *debe*, *hacer*). No distingue el tipo de trabajo (solo "
            "mezcla, solo masterización o ambos), ni registra las revisiones incluidas, ni el "
            "archivo final entregado. Los clientes de este servicio vienen mayormente de fuera "
            "del estudio, no son alumnos.",
            "La dirección reconoce la necesidad de formalizar el servicio e integrarlo al resto "
            "del estudio, con estados de trabajo definidos: *a confirmar*, *en proceso*, "
            "*hecho*, *pagado* y *debe*."]),
        ("Gestión del sello discográfico desintegrada", [
            "La operación del sello se gestiona de forma personal, con herramientas externas y "
            "sin integración con el resto del estudio. El sello tiene un catálogo con códigos "
            "propios (LJ020, LJ021…), artistas confirmados, fechas de lanzamiento planificadas "
            "y artistas *a confirmar* por lanzamiento.",
            "Este proceso, que incluye la recepción de música, la curaduría, la subida a "
            "plataformas de distribución, los contratos, la coordinación de pagos y el "
            "seguimiento de reproducciones en sets y radios internacionales, no tiene ningún "
            "punto de contacto formal con el resto del estudio."]),
        ("Ausencia de reportes para la dirección", [
            "Los directores y socios no reciben ningún reporte estructurado sobre el desempeño "
            "del negocio. No existen registros históricos formales de alumnos activos, "
            "retención, ingresos por línea de servicio ni ocupación de salas.",
            "La dirección necesita ver indicadores clave: alumnos por servicio, ingresos "
            "mensuales en pesos y en dólares, ocupación de salas por día y franja horaria, y "
            "cobros pendientes. Hoy esa información no puede obtenerse sin consolidar a mano "
            "varias fuentes."]),
        ("Pérdida de consultas en el primer contacto", [
            "Las consultas llegan por Instagram y por WhatsApp y dependen de que alguien las "
            "conteste a tiempo. El estudio no tiene un sitio web propio donde un interesado "
            "pueda conocer los programas, los precios o los servicios, ni dejar su pedido por "
            "escrito: la única presencia web es un Linktree.",
            "Una consulta que no se responde en el momento no queda registrada en ningún lugar, "
            "y no hay forma de saber cuántos interesados se pierden por esa fricción."]),
    ]
    for i, (titulo, parrafos) in enumerate(problemas, 1):
        libro.titulo(f"Problema {i}: {titulo}", nivel=2)
        for p in parrafos:
            libro.parrafo(p)

    # --------------------------------------------------------------- Necesidades
    libro.titulo("Necesidades relevadas")
    libro.parrafo(
        "A partir de los problemas detectados y de la información obtenida en la entrevista "
        "se identifican las siguientes necesidades de La Juanita Studio. Describen lo que el "
        "negocio requiere para operar de forma eficiente, sin anticipar todavía cómo se "
        "resolverán técnicamente.")
    necesidades = [
        ("Centralización y unificación de la información operativa", [
            "El estudio necesita una fuente única de verdad que reemplace la fragmentación "
            "entre Notion, Excel y WhatsApp. Hoy cada herramienta tiene una parte de la "
            "información y ninguna refleja el estado completo de una situación: el pago de un "
            "alumno está en Excel, su horario en Notion y la conversación que los vincula en "
            "WhatsApp.",
            "El negocio necesita que cualquier persona autorizada pueda consultar el estado "
            "real de un alumno, una sala o un cobro en un solo lugar."]),
        ("Reducción de la dependencia operativa de Micaela", [
            "La Juanita necesita distribuir la carga que hoy recae por completo sobre Micaela, "
            "único punto de contacto para inscripciones, pagos, cambios de horario y consultas "
            "de todo tipo. Esto no es sostenible a medida que el estudio crece.",
            "El negocio necesita que los alumnos puedan acceder a la información de sus clases, "
            "sus pagos y sus materiales sin la intervención de Micaela, y que los profesores "
            "tengan acceso directo a sus horarios y a sus alumnos."]),
        ("Visibilidad en tiempo real sobre el uso de las salas", [
            "Los tres espacios del estudio se usan para múltiples propósitos: clases de DJ y "
            "de producción, mentorías, mix & mastering, alquiler y grabación de sets. Hoy no "
            "hay ningún mecanismo para ver qué sala está ocupada, por quién y hasta qué hora. "
            "Los cambios se comunican de palabra o por WhatsApp, lo que genera conflictos "
            "frecuentes, sobre todo cuando Ghezz necesita una sala para un trabajo de mezcla y "
            "no se enteró de un cambio de horario.",
            "El negocio necesita conocer en todo momento el estado de cada espacio, quién lo "
            "usa y para qué, y que no se pueda asignar un espacio a un uso para el que no "
            "sirve."]),
        ("Seguimiento del recorrido formativo del alumno", [
            "El programa de La Juanita está pensado como un recorrido largo y progresivo: el "
            "alumno empieza en DJ inicial, avanza por niveles hasta DJ avanzado, puede seguir "
            "con producción musical y, eventualmente, con mentorías. Ese recorrido puede durar "
            "un año o más e involucrar a varios profesores.",
            "No existe ningún mecanismo para saber en qué etapa está cada alumno, cuántas "
            "clases tomó, qué materiales recibió ni qué observaciones dejaron sus profesores. "
            "El estudio necesita seguir al alumno a lo largo de todo su trayecto, sin importar "
            "qué profesor lo atienda en cada momento."]),
        ("Formalización y seguimiento del servicio de mix & mastering", [
            "El mix & mastering es una línea de negocio con alto potencial: Ghezz estima que, "
            "con volumen, una sala dedicada podría generar entre 200 y 300 dólares diarios. "
            "Sin embargo, opera por fuera del estudio: los trabajos se coordinan por WhatsApp, "
            "no hay registro de entregas ni revisiones, y el cobro queda pendiente hasta que "
            "el cliente aprueba el resultado, lo que genera deudas difíciles de seguir.",
            "El negocio necesita registrar cada trabajo, seguir su estado, controlar las "
            "revisiones incluidas y ordenar el cobro, de forma integrada al resto del estudio."]),
        ("Integración del sello discográfico", [
            "La operación del sello (recepción de demos, curaduría, distribución, contratos y "
            "seguimiento de lanzamientos) la gestiona Ghezz con herramientas personales. El "
            "estudio necesita que la información del sello (artistas, lanzamientos, contratos "
            "y su estado) esté disponible en un sistema centralizado, accesible para la "
            "dirección y la administración, sin depender de la memoria de una sola persona."]),
        ("Visibilidad gerencial sobre el desempeño del negocio", [
            "Los directores y socios no tienen acceso a información consolidada. Para conocer "
            "los alumnos activos, los ingresos del mes o los cobros pendientes deben preguntarle "
            "a Micaela o revisar las planillas a mano. El negocio necesita que la dirección "
            "acceda a esa información de forma autónoma."]),
        ("Un canal de entrada propio para las consultas", [
            "El estudio necesita una presencia web propia donde un interesado pueda conocer los "
            "programas y servicios y dejar su consulta por escrito, de modo que ningún pedido "
            "dependa de que alguien conteste un mensaje en el momento y que cada consulta quede "
            "registrada hasta ser atendida."]),
    ]
    for i, (titulo, parrafos) in enumerate(necesidades, 1):
        libro.titulo(f"Necesidad {i}: {titulo}", nivel=2)
        for p in parrafos:
            libro.parrafo(p)

    # ------------------------------------------------------------------ Actores
    libro.titulo("Actores involucrados")
    libro.parrafo("Los actores que intervienen en la operación de La Juanita Studio son los "
                  "siguientes:", junto=True)
    libro.tabla(
        ["Actor", "Descripción y rol"],
        [
            ["Dirección general (Chapa & Castelo, familia Oppel y Bautista Najles)",
             "Inversores y fundadores. Toman las decisiones estratégicas y definen la visión "
             "del negocio. Necesitan visibilidad sobre sus indicadores clave."],
            ["Micaela — Administración",
             "Principal usuaria del futuro sistema. Gestiona toda la operación: altas de "
             "alumnos, horarios, pagos, comunicación con alumnos y coordinación de profesores. "
             "Es el principal cuello de botella del negocio."],
            ["Ghezz — Director de Profesores y Producción",
             "Dicta clases avanzadas y mentorías, coordina a los demás profesores, gestiona el "
             "sello discográfico y presta el servicio de mix & mastering. Lleva un sistema de "
             "seguimiento propio, paralelo al del estudio."],
            ["Profesores de DJ y producción",
             "Dictan las clases según el programa. Consultan en Notion sus horarios y alumnos, "
             "con permisos de solo lectura. Algunos llevan registros propios."],
            ["Malena — Community manager",
             "Responde el primer contacto en Instagram y deriva la consulta a Micaela."],
            ["Alumnos",
             "Destinatarios de los cursos y mentorías. No tienen acceso a ningún sistema: toda "
             "interacción pasa por Micaela. Son los más afectados por la falta de autogestión."],
            ["Clientes externos",
             "Personas que contratan un servicio sin ser alumnos: alquilan una cabina, graban "
             "un set, encargan un mix & mastering o compran un equipo. Varios vienen del "
             "exterior."],
            ["Artistas del sello",
             "Envían su música, firman contratos y publican con el sello. No participan de la "
             "operación diaria del estudio."],
            ["Staff general",
             "Da soporte a eventos y a otras actividades del estudio."],
            ["Ignacio Lawson — Estudiante",
             "Responsable del relevamiento, del diseño y de la implementación de la solución."],
        ],
        [5.0, 10.0], titulo="Actores involucrados en la operación del estudio")

    # ------------------------------------------------------------- Limitaciones
    libro.titulo("Limitaciones del relevamiento")
    limitaciones = [
        ("Ausencia de métricas documentadas",
         "No existen registros históricos formales de alumnos activos, retención, ingresos por "
         "línea de servicio ni ocupación de salas. Toda la información cuantitativa depende del "
         "testimonio de los entrevistados y de sus estimaciones, lo que puede introducir "
         "imprecisiones en el análisis."),
        ("Sistema de comunicación no estructurado",
         "Como WhatsApp es el canal único de contacto, buena parte de la información operativa "
         "existe solo en conversaciones de chat, sin registro formal ni exportable. Esto "
         "dificulta reconstruir flujos de trabajo históricos y conocer la demanda real."),
        ("Datos de la entrevista que hubo que corregir",
         "Algunos datos dichos en la entrevista resultaron inexactos y se corrigieron en "
         "validaciones posteriores: los espacios físicos del estudio y sus usos, y la apertura "
         "de una segunda sede en Córdoba, que finalmente se descartó. Este informe ya refleja "
         "esas correcciones."),
    ]
    for i, (titulo, texto) in enumerate(limitaciones, 1):
        libro.titulo(f"Limitación {i}: {titulo}", nivel=2)
        libro.parrafo(texto)

    # ------------------------------------------------------- Procesos actuales
    libro.titulo("Procesos actuales")
    libro.parrafo(
        "A continuación se detalla el funcionamiento actual de cada proceso operativo del "
        "estudio, tal como lo describieron los entrevistados y complementado con el análisis "
        "de las planillas que utilizan.")

    libro.titulo("Proceso 1: Gestión de alumnos e inscripciones", nivel=2)
    libro.parrafo(
        "La incorporación de un alumno nuevo es completamente manual y está centralizada en "
        "Micaela. El flujo es el siguiente (ver Figura 1):", junto=True)
    libro.numerada([
        "El interesado contacta al estudio por Instagram o WhatsApp.",
        "La community manager responde el primer contacto por Instagram y, cuando la consulta "
        "avanza, Micaela retoma la conversación por WhatsApp.",
        "Micaela pregunta qué disciplina le interesa (DJ o producción) y su nivel de "
        "experiencia.",
        "Según la respuesta, le envía el PDF del programa correspondiente, con modalidad, "
        "duración y precio.",
        "Micaela consulta la disponibilidad en Notion y ofrece opciones de horario.",
        "El alumno elige un horario y paga una seña para reservarlo.",
        "Micaela registra la seña en la planilla y reserva el horario en Notion con un "
        "indicador visual de estado.",
        "El alumno abona el saldo antes de comenzar a cursar.",
        "Recién con el pago total confirmado, el alumno accede al servicio.",
    ])
    libro.parrafo(
        "Los cursos se dictan en clases de una hora y media, una vez por semana: el curso de "
        "DJ tiene 8 clases (unos dos meses) y el de producción musical, 16 (unos cuatro "
        "meses). Las mentorías son un servicio aparte, con otro precio, y puede dictarlas "
        "cualquier profesor.")
    libro.parrafo(
        "Se aplican descuentos a ex alumnos. Los cursos y los alquileres no se dan sin pago: "
        "para reservar un lugar se requiere al menos la seña. Si Micaela no está disponible "
        "para responder, el proceso se detiene, y toda la información queda en conversaciones "
        "de WhatsApp y en planillas a las que el alumno no tiene acceso.")
    libro.figura(AQUI / "figuras/proceso-actual-inscripcion.png",
                 "Proceso actual de inscripción de un alumno", ancho_cm=12.5,
                 nota="Elaboración propia a partir de la entrevista del 17 de abril de 2026. "
                      "Describe el proceso anterior al sistema.")

    libro.titulo("Proceso 2: Gestión de horarios y salas", nivel=2)
    libro.parrafo(
        "Los horarios y las salas se organizan íntegramente en Notion. Micaela es la única con "
        "permisos de modificación; los profesores solo pueden ver. Por cada clase se registra "
        "la sala, el horario, el alumno y el profesor.")
    libro.parrafo(
        "Los conflictos aparecen cuando se reasigna un espacio por necesidades de último "
        "momento (más alumnos, un trabajo de mix & mastering urgente) sin que todos los "
        "involucrados se enteren a tiempo. Ghezz, en particular, mantiene un Excel propio con "
        "su semana porque el Notion general no le alcanza para planificar sus sesiones.")

    libro.titulo("Proceso 3: Control de pagos y cobros", nivel=2)
    libro.parrafo(
        "Toda la información financiera se registra en Excel: nombre del alumno, servicio "
        "contratado, precio, descuentos, moneda (pesos o dólares), cotización y estado de "
        "pago. El archivo está vinculado a dos cajas, una en pesos y otra en dólares. Se "
        "cobra por transferencia en pesos, en efectivo en pesos o en dólares, y por PayPal o "
        "a través de una cuenta en Estados Unidos que administra un socio, para los clientes "
        "del exterior. Los comprobantes se suben a Notion como referencia, pero la fuente de "
        "verdad financiera es el Excel.")
    libro.parrafo(
        "Los indicadores de Notion se actualizan a mano: si el alumno no pagó, Micaela le "
        "coloca un signo de exclamación; si pagó, un indicador de confirmación. No hay "
        "sincronización entre el estado de pago del Excel y el de Notion. En el mismo Excel "
        "se registran los egresos, como los pagos a profesores.")
    libro.parrafo(
        "Los servicios regulares (cursos, alquiler, mentorías) no pueden quedar en deuda: se "
        "requiere al menos la seña para reservar el lugar. La excepción es el mix & "
        "mastering, que opera de manera más informal y sí puede quedar con saldo pendiente.")

    libro.titulo("Proceso 4: Gestión del servicio de mix & mastering", nivel=2)
    libro.parrafo("Ghezz gestiona el servicio de forma autónoma. El flujo actual es:", junto=True)
    libro.numerada([
        "El cliente contacta a Ghezz directamente, por contactos personales, boca en boca o "
        "referidos.",
        "El cliente envía el tema a trabajar.",
        "Ghezz realiza el trabajo (mezcla, masterización o ambos) y entrega el resultado.",
        "El cliente puede pedir dos o tres revisiones incluidas en el precio; a partir de ahí "
        "se cobra un extra.",
        "Cuando el cliente aprueba el trabajo, Ghezz le pide el pago, y recién al cobrar le "
        "entrega el *premaster*, el archivo que necesita para presentar el tema a una "
        "discográfica.",
        "Si el cliente demora el pago, Ghezz hace el seguimiento por WhatsApp o le deriva el "
        "cobro a Micaela.",
    ])
    libro.parrafo(
        "Los trabajos, las revisiones y los pagos existen solo en conversaciones de WhatsApp y "
        "en los apuntes de Ghezz, más una planilla con fecha, cliente, valor y estado, sin "
        "distinguir el tipo de trabajo ni registrar las revisiones. Ghezz estima que, con "
        "volumen, una persona puede hacer cinco o seis trabajos por día, lo que equivale a "
        "entre 200 y 300 dólares diarios por sala con un costo casi nulo; la falta de "
        "estructura limita esa escalabilidad.")

    libro.titulo("Proceso 5: Sello discográfico y gestión de lanzamientos", nivel=2)
    libro.parrafo(
        "Ghezz coordina también la operación del sello: recibe música de artistas de "
        "distintos países, hace la curaduría, sube los lanzamientos a plataformas a través de "
        "un sistema internacional de distribución, gestiona los contratos, coordina los pagos "
        "y sigue la difusión en sets de DJ y radios internacionales.")
    libro.parrafo(
        "El sello tiene un catálogo con códigos propios (LJ020, LJ021…), artistas "
        "confirmados, fechas de lanzamiento planificadas y artistas *a confirmar*. El flujo "
        "incluye la recepción y el filtrado de demos, la curaduría, el contrato con el "
        "artista, la subida a la distribuidora, la coordinación de pagos y el seguimiento "
        "posterior al lanzamiento. Nada de esto está integrado al resto del estudio.")

    libro.titulo("Proceso 6: Comunicación interna y canales de entrada", nivel=2)
    libro.parrafo(
        "Las consultas de potenciales alumnos y clientes ingresan por Instagram y por "
        "WhatsApp. La community manager responde el primer contacto en Instagram y, cuando la "
        "consulta avanza, Micaela la retoma por WhatsApp para concretar la inscripción. No hay "
        "un protocolo para ese traspaso: Micaela tiene que releer toda la conversación antes "
        "de continuar.")
    libro.parrafo(
        "Las novedades internas (cambios de horario, de sala o sobre alumnos) se comunican de "
        "palabra o por WhatsApp entre el equipo, y Micaela atiende WhatsApp de forma "
        "ininterrumpida, incluso de noche.")

    libro.titulo("Proceso 7: Gestión de mentorías", nivel=2)
    libro.parrafo(
        "Las mentorías son un servicio independiente de la cursada regular, para quienes "
        "quieren profundizar en aspectos específicos de la producción o del DJ. Puede "
        "dictarlas cualquier profesor, tienen un precio distinto y se coordinan igual que "
        "cualquier otro servicio: el alumno contacta a Micaela, se consulta la disponibilidad "
        "en Notion y se confirma con el pago de la seña.")
    libro.parrafo(
        "Son el servicio más variable: no tienen una estructura fija de contenido y se adaptan "
        "por completo a cada alumno. Ghezz señala que a veces el rol del mentor trasciende lo "
        "técnico, y que por eso el seguimiento es especialmente importante para no perder el "
        "hilo de lo trabajado en cada sesión.")

    libro.titulo("Proceso 8: Venta de equipos", nivel=2)
    libro.parrafo(
        "La Juanita tiene un acuerdo de distribución con Pioneer (AlphaTheta) que le permite "
        "revender equipos de la marca a sus alumnos y clientes. No maneja stock propio: vende "
        "contra el stock de Pioneer en cada momento. La venta no es frecuente ni está "
        "estandarizada; se resuelve caso por caso, y muchos alumnos compran su equipo después "
        "del curso inicial. El cobro entra en el mismo flujo que el resto, sin un registro "
        "diferenciado.")

    libro.titulo("Proceso 9: Alquiler de cabina y grabación de sets", nivel=2)
    libro.parrafo(
        "El estudio alquila la Sala 1 y la Sala 2 a DJ que quieren practicar con sus equipos, "
        "y la cabina de grabación a quienes quieren grabar un set en video. El pedido llega "
        "por WhatsApp, Micaela ofrece los horarios libres según Notion y el lugar queda "
        "reservado con el pago de la seña, igual que una clase. La grabación de sets es una "
        "de las líneas de negocio que menciona Ghezz, pero no tiene ningún registro propio: "
        "se mezcla con el resto de las reservas.")

    # ---------------------------------------------------------------- Conclusión
    libro.titulo("Conclusión del informe de relevamiento")
    libro.parrafo(
        "El relevamiento permite concluir que el principal problema de La Juanita Studio no "
        "es la falta de herramientas, sino la fragmentación y desconexión de las que ya usa. "
        "Notion, Excel y WhatsApp cumplen cada uno una función, pero al no estar integrados "
        "generan una carga operativa insostenible que recae casi por completo sobre una sola "
        "persona.")
    libro.parrafo(
        "El crecimiento reciente del estudio, impulsado por el auge de la cultura electrónica, "
        "expuso con claridad los límites de este modelo manual: cada alumno o cliente nuevo "
        "suma mensajes, planillas y controles que alguien tiene que hacer a mano.")
    libro.parrafo(
        "La necesidad más crítica es la de un sistema que funcione como columna vertebral de "
        "toda la operación: que centralice la información de alumnos, horarios, salas y "
        "pagos, que permita a alumnos y profesores autogestionar parte de su actividad, y que "
        "dé visibilidad en tiempo real a la dirección, a los profesores y a la administración. "
        "A eso se suma la necesidad de un canal de entrada propio, para que ninguna consulta "
        "dependa de un mensaje respondido a tiempo.")
    libro.parrafo(
        "En segundo lugar, el servicio de mix & mastering, la venta de equipos y la operación "
        "del sello discográfico necesitan un registro formal, ya que hoy son procesos "
        "invisibles para el resto del estudio.")
