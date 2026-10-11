"""Parte IV — Propuesta Comercial, alineada con el alcance construido.

El precio es ficticio (proyecto académico). Respecto del original suma el sitio web
público con el buzón de consultas, que no estaba cotizado, sin inflar el resto."""

DESGLOSE = [
    ("Análisis y diseño final", 450_000),
    ("Desarrollo — Módulos principales (1, 2 y 3)", 1_950_000),
    ("Desarrollo — Portales del alumno y del profesor (4 y 5)", 1_800_000),
    ("Desarrollo — Mix & Mastering y Sello (6 y 7)", 1_350_000),
    ("Desarrollo — Tablero de dirección (8) y avisos automáticos", 600_000),
    ("Sitio web público y buzón de consultas", 900_000),
    ("Pruebas funcionales y correcciones", 450_000),
    ("Implementación y puesta en marcha", 300_000),
    ("Capacitación inicial al personal", 150_000),
    ("Soporte inicial (90 días)", 300_000),
]


def _pesos(n):
    return "$" + f"{n:,}".replace(",", ".")


def escribir(libro):
    total = sum(m for _, m in DESGLOSE)

    libro.titulo("Prólogo")
    libro.parrafo(
        "La presente propuesta comercial presenta la solución de software diseñada para La "
        "Juanita Studio y complementa la propuesta técnica elaborada a partir del "
        "relevamiento realizado con el equipo directivo y operativo del estudio.")
    libro.parrafo(
        "La Juanita Studio es un emprendimiento con múltiples líneas de negocio activas: "
        "cursos de DJ y de producción musical, mentorías, mix & mastering, alquiler de cabina, "
        "grabación de sets, venta de equipos y un sello discográfico propio. Toda esa "
        "actividad la gestiona hoy un equipo pequeño, muy dependiente de herramientas "
        "manuales y de la disponibilidad de Micaela como punto único de operación.")
    libro.parrafo(
        "El sistema propuesto busca transformar esa realidad: centralizar la gestión en una "
        "plataforma web, darle al estudio un sitio propio que reciba las consultas, liberar "
        "al equipo de tareas repetitivas y dar visibilidad sobre el negocio para que la "
        "operación pueda crecer de forma ordenada.")

    libro.titulo("Carta de presentación")
    for linea in ("La Juanita Studio", "*Sello discográfico y estudio de formación musical*",
                  "Pilar, provincia de Buenos Aires"):
        libro.parrafo(linea, sangria=False)
    libro.parrafo("A la Dirección de La Juanita Studio:", sangria=False)
    libro.parrafo(
        "A través del presente documento se desarrolla la propuesta comercial correspondiente "
        "al sistema de gestión integral, como complemento de la propuesta técnica ya "
        "presentada.")
    libro.parrafo(
        "A partir del relevamiento fue posible identificar un conjunto de problemas concretos: "
        "la gestión de alumnos, el control de horarios y salas, el seguimiento financiero, la "
        "informalidad del mix & mastering, la desintegración del sello, la pérdida de "
        "consultas en el primer contacto y la sobrecarga concentrada en una sola persona. "
        "Esta propuesta responde a esas necesidades de manera organizada y progresiva.")
    libro.parrafo(
        "El objetivo de este documento es presentar la solución, su alcance, una estimación "
        "de costos y las condiciones de la implementación. Se invita a la dirección a "
        "considerar su viabilidad, teniendo en cuenta que permitiría mejorar de forma "
        "significativa la eficiencia operativa del estudio y contar con información "
        "centralizada y confiable en tiempo real.")
    libro.parrafo("Sin otro particular, saluda atentamente,", sangria=False)
    libro.parrafo("**Ignacio Lawson**", sangria=False)

    libro.titulo("Presentación de la necesidad detectada")
    libro.titulo("Problemas observados", nivel=2)
    libro.vinetas([
        "Toda la gestión operativa (alumnos, pagos, horarios y comunicaciones) está "
        "concentrada en Micaela, lo que genera un cuello de botella crítico.",
        "Notion y Excel están desconectados: la misma información se carga en varios lugares "
        "y aumenta el riesgo de inconsistencias.",
        "Los alumnos no tienen ninguna autogestión: cada consulta, cambio de clase o "
        "comprobante requiere la intervención de Micaela, que responde WhatsApp a toda hora.",
        "Los cambios de sala no llegan a tiempo a todos, lo que genera conflictos en la "
        "planificación de clases y trabajos de mix & mastering.",
        "El mix & mastering opera sin registro formal: sin seguimiento de trabajos, sin "
        "control de revisiones y sin alertas de cobros pendientes.",
        "El sello se gestiona fuera del estudio, con herramientas externas y sin visibilidad "
        "para el resto del equipo.",
        "La dirección no cuenta con reportes consolidados para tomar decisiones.",
        "La venta de equipos no tiene un registro diferenciado del resto de los cobros.",
        "Los profesores no tienen un espacio propio para seguir a sus alumnos y compartirles "
        "material.",
        "El estudio no tiene un sitio web propio: las consultas dependen de que alguien "
        "conteste un mensaje a tiempo, y las que no se responden se pierden.",
    ])
    libro.titulo("Limitaciones operativas actuales", nivel=2)
    libro.vinetas([
        "**Notion:** no permite automatizaciones ni avisos, ni controla reglas como la "
        "superposición de reservas.",
        "**Excel:** no tiene control de accesos por rol, no genera alertas y requiere "
        "actualización constante.",
        "**WhatsApp:** es un canal de atención que no escala y duplica el trabajo entre la "
        "community manager y Micaela.",
        "**Linktree:** solo deriva a otros sitios; no presenta los servicios ni recibe "
        "consultas.",
        "**Sistemas paralelos de Ghezz:** dejan información crítica fuera del sistema oficial.",
    ])
    libro.titulo("Oportunidades de mejora", nivel=2)
    libro.vinetas([
        "Centralizar la gestión en una plataforma única, accesible para cada actor según su "
        "rol.",
        "Automatizar avisos de deudas, vencimientos y lanzamientos.",
        "Dar autonomía a alumnos y clientes para consultar sus clases, pagos y materiales.",
        "Dar a los profesores un espacio propio para el seguimiento de sus alumnos.",
        "Formalizar el mix & mastering y el sello dentro del sistema.",
        "Recibir las consultas en un sitio propio y no perder ninguna.",
        "Proveer a la dirección indicadores en tiempo real.",
    ])

    libro.titulo("Objetivos de la propuesta")
    libro.titulo("Objetivo general", nivel=2)
    libro.parrafo(
        "Desarrollar e implementar un sistema web integral de gestión que centralice la "
        "administración de alumnos e inscripciones, los horarios y las salas, los cobros y "
        "los pagos, los servicios especializados (mix & mastering, alquiler, grabación y venta "
        "de equipos), los portales del alumno y del profesor, la operación del sello y la "
        "visibilidad gerencial, junto con un sitio web público que reciba las consultas.")
    libro.titulo("Objetivos específicos", nivel=2)
    libro.vinetas([
        "Centralizar la gestión de alumnos e inscripciones, eliminando la dependencia de "
        "Notion y Excel.",
        "Implementar un calendario único de salas que impida superposiciones y usos no "
        "permitidos.",
        "Unificar el registro financiero en pesos y dólares, con seguimiento de deudores y "
        "comprobantes.",
        "Proveer un portal de autogestión para alumnos y clientes.",
        "Implementar un portal del profesor con agenda, seguimiento, notas privadas y "
        "materiales.",
        "Formalizar el mix & mastering con registro de trabajos, revisiones, entregas y "
        "cobros.",
        "Integrar la gestión del sello al sistema institucional.",
        "Proveer a la dirección un tablero de indicadores exportable.",
        "Publicar un sitio web propio cuyas consultas lleguen al sistema.",
    ])

    libro.titulo("Módulos funcionales del sistema")
    libro.parrafo(
        "La solución se compone de ocho módulos funcionales, más el sitio web público. Cada "
        "componente fue diseñado para resolver las ineficiencias detectadas en el "
        "relevamiento.", junto=True)
    libro.tabla(
        ["N.º", "Módulo", "Área que resuelve"],
        [
            ["1", "Gestión de Alumnos e Inscripciones",
             "Personas, programas, inscripciones individuales y grupales, y el buzón de "
             "consultas."],
            ["2", "Horarios y Salas", "Calendario único, reservas, prerreservas, bloqueos y "
                                      "pedidos de cambio."],
            ["3", "Pagos y Cobros", "Registro multimoneda, deudores, caja, egresos, ventas de "
                                    "equipos y comprobantes."],
            ["4", "Portal del Alumno", "Autogestión de clases, pedidos, pagos y materiales."],
            ["5", "Portal del Profesor", "Agenda, seguimiento de alumnos, notas privadas y "
                                         "materiales."],
            ["6", "Mix & Mastering", "Trabajos, revisiones, entregas y retención del premaster "
                                     "hasta el pago."],
            ["7", "Sello Discográfico", "Lanzamientos, canciones, artistas, contratos y "
                                        "difusión."],
            ["8", "Tablero de Dirección", "Indicadores en tiempo real y exportación a Excel y "
                                          "PDF."],
            ["—", "Sitio web público", "Presentación del estudio y formularios de consulta "
                                       "conectados al buzón."],
        ],
        [1.2, 5.0, 8.8], titulo="Módulos funcionales del sistema")
    libro.parrafo(
        "El sistema contará con cuatro roles de acceso: administrador, directivo, staff y "
        "usuario. A ellos se suman las relaciones de alumno y de profesor, que habilitan los "
        "portales correspondientes, de modo que cada persona acceda únicamente a la "
        "información y las funciones que le corresponden.")

    libro.titulo("Alcance del proyecto")
    libro.parrafo(
        "Con el propósito de delimitar con claridad los límites del proyecto y evitar "
        "interpretaciones ambiguas, se detalla a continuación el alcance de la solución.")
    libro.titulo("Prestaciones incluidas", nivel=2)
    libro.tabla(
        ["Componente", "Detalle"],
        [
            ["Análisis y diseño final", "Relevamiento, diseño de la base de datos y de la "
                                        "arquitectura del sistema."],
            ["Desarrollo del sistema", "Los ocho módulos funcionales descriptos en la "
                                       "propuesta técnica y los avisos automáticos."],
            ["Sitio web público", "Presentación del estudio, programas, servicios y sello, "
                                  "con formularios conectados al buzón del sistema."],
            ["Parametrización inicial", "Carga de salas, tipos de uso, programas y precios del "
                                        "estudio."],
            ["Pruebas funcionales", "Pruebas automáticas y verificación con el personal en "
                                    "condiciones reales de uso."],
            ["Capacitación inicial", "Formación de Micaela, Ghezz y la dirección en el uso del "
                                     "sistema."],
            ["Implementación", "Puesta en marcha en un servidor en la nube, con HTTPS y "
                               "respaldos diarios."],
            ["Soporte inicial", "Acompañamiento técnico durante los primeros 90 días."],
            ["Documentación", "Manual de usuario, modelo de base de datos, diccionario de "
                              "datos y código fuente."],
        ],
        [4.2, 10.8], titulo="Prestaciones incluidas")
    libro.titulo("Prestaciones no incluidas", nivel=2)
    libro.tabla(
        ["Componente", "Detalle"],
        [
            ["Equipamiento", "No incluye computadoras, tabletas ni otros dispositivos."],
            ["Servidor y dominio", "El costo mensual del servidor en la nube y el registro del "
                                   "dominio quedan a cargo del estudio."],
            ["Integración con WhatsApp e Instagram", "El sistema arma los mensajes de WhatsApp "
                                                      "y los abre con un clic, pero no se "
                                                      "conecta a la API de WhatsApp Business ni "
                                                      "a Instagram."],
            ["Correo electrónico", "El sistema no envía correos; las comunicaciones salen por "
                                   "WhatsApp y por su bandeja de notificaciones."],
            ["Cobros en línea", "No se integra una pasarela de pago; los cobros se registran "
                                "a mano."],
            ["Plataformas musicales", "No se integran sistemas de distribución ni de "
                                      "estadísticas musicales."],
            ["Aplicación móvil nativa", "El acceso desde el celular es por el navegador, con "
                                        "un diseño adaptado."],
            ["Licencias de terceros", "La solución se construye sobre tecnologías de código "
                                      "abierto."],
        ],
        [4.2, 10.8], titulo="Prestaciones no incluidas")
    libro.parrafo(
        "Cualquier funcionalidad, integración o módulo no contemplado en este alcance podrá "
        "desarrollarse como una extensión del proyecto, sujeta a una cotización "
        "independiente que se acordará oportunamente entre las partes.")

    libro.titulo("Propuesta económica y plan de pagos")
    libro.parrafo(
        "A continuación se presenta la estimación de costos del desarrollo y la "
        "implementación. Considera el trabajo de un desarrollador universitario con "
        "conocimientos intermedios en las tecnologías propuestas, sin personal adicional ni "
        "licencias de terceros.")
    libro.titulo("Desglose de la inversión", nivel=2)
    libro.tabla(
        ["Etapa o componente", "Costo estimado (ARS)"],
        [[c, _pesos(m)] for c, m in DESGLOSE] + [["**Total**", f"**{_pesos(total)}**"]],
        [10.5, 4.5], titulo="Desglose de la inversión")
    libro.titulo("Condiciones de pago", nivel=2)
    cuotas = [("1.ª", "Inicio del proyecto (firma de conformidad)", 30),
              ("2.ª", "Entrega de los módulos principales (1, 2 y 3)", 40),
              ("3.ª", "Implementación y puesta en marcha", 30)]
    libro.parrafo("Se propone un esquema de pago en tres cuotas vinculadas al avance del "
                  "proyecto:", junto=True)
    libro.tabla(["Cuota", "Momento", "Porcentaje", "Monto (ARS)"],
                [[c, mo, f"{p} %", _pesos(total * p // 100)] for c, mo, p in cuotas],
                [1.6, 7.6, 2.4, 3.4], titulo="Plan de pagos")
    libro.titulo("Método de pago", nivel=2)
    libro.vinetas([
        "Transferencia bancaria a la cuenta indicada por el desarrollador.",
        "El anticipo del 30 % se acredita al firmar la presente propuesta para dar inicio al "
        "desarrollo.",
        "El 40 % se abona tras la entrega y validación de los módulos principales.",
        "El 30 % final se abona tras la puesta en marcha del sistema, con un plazo máximo de "
        "cinco días hábiles para acreditar los fondos.",
    ])

    libro.titulo("Beneficios esperados")
    beneficios = [
        ("Reducción de la dependencia operativa",
         "Al centralizar la gestión en una plataforma accesible para cada actor según su rol, "
         "deja de ser necesario que toda operación pase por Micaela. Los portales del alumno y "
         "del profesor, junto con los avisos automáticos, liberan tiempo del equipo para "
         "tareas de mayor valor."),
        ("Ninguna consulta perdida",
         "Las consultas del sitio web quedan registradas en el buzón hasta ser atendidas, y el "
         "sistema avisa cuando alguna lleva más de 48 horas sin respuesta."),
        ("Eliminación de la doble carga de datos",
         "Una operación registrada en un lugar se refleja en todos los que corresponde: un "
         "pago saldado sale de deudores, activa una preinscripción o libera un premaster, sin "
         "actualizar nada a mano."),
        ("Mayor control financiero",
         "El registro en pesos y dólares, los deudores calculados contra el precio de cada "
         "servicio y los comprobantes adjuntos permiten conocer el estado financiero real en "
         "todo momento."),
        ("Espacio propio para el profesor",
         "Los profesores ven su agenda, siguen a sus alumnos, dejan notas privadas y "
         "comparten material sin depender de la administración."),
        ("Formalización de servicios informales",
         "El mix & mastering y el sello quedan integrados al flujo del estudio, lo que mejora "
         "la trazabilidad, reduce los cobros perdidos y da visibilidad a la dirección."),
        ("Decisiones basadas en datos",
         "El tablero ofrece en tiempo real los indicadores clave: alumnos activos, ingresos "
         "por línea, ocupación de salas, deuda viva y retención."),
        ("Mejor experiencia para el alumno",
         "El alumno consulta su estado de cuenta, sus próximas clases y sus materiales, y pide "
         "un cambio de día, sin depender de la disponibilidad de Micaela."),
    ]
    for titulo, texto in beneficios:
        libro.titulo(titulo, nivel=2)
        libro.parrafo(texto)

    libro.titulo("Condiciones generales")
    libro.vinetas([
        "El relevamiento funcional se considera la base de referencia del desarrollo. Una "
        "modificación significativa de los procesos del estudio podría requerir ajustes en el "
        "alcance o el cronograma.",
        "Se asume que el estudio cuenta con conexión a internet estable donde el personal usará "
        "el sistema.",
        "El cronograma es orientativo y puede verse afectado por la disponibilidad del "
        "personal para las instancias de validación.",
        "La integración con WhatsApp Business, Instagram o plataformas de distribución musical "
        "queda fuera del alcance y deberá evaluarse como extensión futura.",
        "Los módulos se entregan de manera progresiva, con una validación del personal clave "
        "antes de avanzar con cada etapa.",
        "La documentación generada (código fuente, modelo de base de datos, diccionario de "
        "datos y manual de usuario) quedará a disposición del estudio al finalizar el "
        "proyecto.",
        "Toda la información relevada se tratará con carácter confidencial y no se compartirá "
        "con terceros sin autorización de la dirección.",
    ])

    libro.titulo("Soporte, garantía y mantenimiento")
    libro.titulo("Soporte técnico sin cargo (90 días)", nivel=2)
    libro.parrafo(
        "A partir de la entrega definitiva y la firma del acta de conformidad, se brinda un "
        "período de soporte técnico sin cargo de noventa días corridos, en el que se atienden "
        "las consultas funcionales del personal y las incidencias propias del sistema.")
    libro.titulo("Garantía de corrección de errores", nivel=2)
    libro.parrafo(
        "Dentro del mismo período se corrigen sin costo los errores atribuibles al software "
        "que impidan el funcionamiento de lo acordado en la propuesta técnica. La garantía no "
        "alcanza a fallas de la infraestructura de terceros, de la conexión a internet del "
        "estudio ni de modificaciones hechas por personas ajenas al desarrollador.")
    libro.titulo("Plan de mantenimiento mensual opcional", nivel=2)
    libro.parrafo(
        "Finalizado el soporte sin cargo, el estudio podrá contratar un plan de mantenimiento "
        "mensual que comprende la atención de incidencias, la corrección de errores, los "
        "ajustes menores, el seguimiento de los respaldos y la actualización de las "
        "dependencias de seguridad. Su valor se acuerda por separado y su contratación es "
        "voluntaria: el sistema funciona de forma autónoma sin él.")
    libro.titulo("Alcance de las nuevas funcionalidades", nivel=2)
    libro.parrafo(
        "El desarrollo de módulos, integraciones o funcionalidades no contempladas en la "
        "propuesta técnica no forma parte del soporte ni de la garantía, y se cotiza de "
        "manera independiente como una extensión del proyecto.")

    libro.titulo("Términos y condiciones contractuales")
    libro.parrafo("Las siguientes condiciones rigen la relación entre La Juanita Studio, en "
                  "adelante “el Cliente”, y el desarrollador.")
    terminos = [
        ("Propiedad intelectual",
         "Completado el pago total, el código fuente, el modelo de base de datos y la "
         "documentación quedan en propiedad del Cliente, que podrá usarlos, modificarlos o "
         "ampliarlos. El desarrollador conserva el derecho de reutilizar el conocimiento "
         "técnico y los componentes genéricos, y de mencionar el proyecto en su portfolio "
         "académico y profesional sin revelar información confidencial."),
        ("Confidencialidad y protección de datos",
         "El desarrollador mantendrá la confidencialidad de toda la información a la que "
         "acceda, en particular los datos de alumnos, la información financiera y los datos de "
         "los artistas del sello, que se usarán exclusivamente para los fines del proyecto."),
        ("Gestión de cambios en el alcance",
         "Toda solicitud de funcionalidad adicional o modificación sustancial de las reglas de "
         "negocio se evaluará como un requerimiento de cambio, que puede implicar un ajuste en "
         "el cronograma, el presupuesto o ambos, y se acordará por escrito antes de "
         "implementarse."),
        ("Validación y aceptación por etapas",
         "Al finalizar cada etapa, los entregables se presentan al personal clave para su "
         "validación. La aprobación de cada etapa habilita la siguiente; las observaciones se "
         "corrigen dentro del alcance acordado."),
        ("Responsabilidades del Cliente",
         "El Cliente se compromete a disponer del personal clave para las validaciones, a "
         "proveer la información y los accesos necesarios, y a contratar el servidor y el "
         "dominio donde operará el sistema."),
        ("Plazos y demoras",
         "El cronograma es orientativo. Las demoras atribuibles a la disponibilidad del "
         "personal, a la entrega tardía de información o a cambios de alcance no se "
         "considerarán incumplimiento del desarrollador."),
    ]
    for titulo, texto in terminos:
        libro.titulo(titulo, nivel=2)
        libro.parrafo(texto)

    libro.titulo("Consideraciones finales")
    libro.parrafo(
        "La Juanita Studio es un estudio con un modelo de negocio sólido, múltiples líneas de "
        "ingresos y un claro potencial de crecimiento, hoy limitado por la falta de "
        "herramientas tecnológicas adecuadas.")
    libro.parrafo(
        "El sistema propuesto no es solo una herramienta de gestión: es la infraestructura que "
        "permite que el estudio escale su operación de forma ordenada, sin que el crecimiento "
        "dependa de la capacidad de respuesta de una sola persona. Su organización modular "
        "permite empezar por los módulos de mayor impacto y avanzar hacia los más "
        "especializados.")
    libro.parrafo(
        "Se invita a la dirección a evaluar esta propuesta y a comunicar cualquier consulta, "
        "modificación de alcance o requerimiento adicional.")

    libro.titulo("Validez de la propuesta y firmas")
    libro.parrafo(
        "La presente propuesta tiene una validez de treinta días corridos desde su emisión. "
        "Pasado ese plazo, los valores y el cronograma podrán revisarse según las condiciones "
        "del mercado. Para dar inicio al proyecto, se solicita su aceptación mediante la firma "
        "de ambas partes.", junto=True)
    raya = "______________________________"
    libro.tabla(
        ["Firma del Cliente", "Firma del Desarrollador"],
        [[" ", " "], [raya, raya], ["Aclaración:", "Aclaración: Ignacio Lawson"],
         ["Cargo:", "Cargo: Desarrollador"], ["Fecha:", "Fecha:"]],
        [7.5, 7.5])
