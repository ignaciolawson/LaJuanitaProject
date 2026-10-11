"""Parte III — Propuesta Técnica, alineada con el sistema construido (esquema hasta V38).

Cada módulo conserva la estructura del documento original (objetivo, funcionalidades,
circuito, datos, acciones, tecnología, validaciones), pero describe lo que el sistema
hace hoy. Los diagramas de proceso van en el módulo al que pertenecen; los tres de base
de datos van en láminas (Parte V)."""

from libro import AQUI

FIG = AQUI / "figuras"


# =========================================================================== intro


def _introduccion(libro):
    libro.titulo("Introducción")
    libro.parrafo(
        "La presente propuesta técnica describe la solución integral de gestión para La "
        "Juanita Studio, tomando como base la información obtenida en el relevamiento "
        "realizado con el equipo directivo y operativo del estudio.")
    libro.parrafo(
        "El análisis de los procesos diarios permitió identificar problemas y oportunidades "
        "de mejora en la gestión de alumnos, el control de horarios y salas, el seguimiento "
        "financiero, la formalización del mix & mastering, la integración del sello "
        "discográfico, la atención de las consultas y la automatización de tareas que hoy se "
        "hacen completamente a mano.")
    libro.parrafo(
        "La solución está formada por tres piezas que trabajan juntas: un **sitio web "
        "público** que reemplaza al Linktree y recibe las consultas, un **panel de gestión** "
        "al que entra cada persona con su cuenta, y una **API** que concentra las reglas del "
        "negocio y los datos. El panel se organiza en ocho módulos funcionales, cada uno "
        "orientado a resolver un área crítica detectada en el relevamiento.")


# ===================================================================== arquitectura


def _arquitectura(libro):
    libro.titulo("Arquitectura general del sistema")
    libro.parrafo(
        "El sistema es una aplicación web accesible desde cualquier dispositivo con conexión "
        "a internet, tanto desde una computadora como desde un celular o una tableta. Se "
        "organiza en tres capas con responsabilidades separadas, lo que facilita el "
        "mantenimiento y permite que cada parte crezca sin afectar a las demás.")

    libro.titulo("Componentes", nivel=2)
    libro.parrafo(
        "Los cuatro componentes se publican bajo un mismo dominio, detrás de un proxy inverso "
        "que atiende las conexiones seguras (HTTPS) y reparte cada pedido según su ruta: la "
        "raíz lleva al sitio público, “/app” al panel de gestión y “/api” a la API (ver "
        "Figura 2). Compartir un único origen permite que una sesión iniciada en el sitio "
        "público siga abierta al pasar al panel.", junto=True)
    libro.figura(FIG / "arquitectura.png", "Arquitectura del sistema y su despliegue",
                 nota="Las flechas punteadas son llamadas a la API desde el navegador. La base "
                      "de datos no se expone fuera del servidor.")

    libro.titulo("Capa de presentación", nivel=2)
    libro.parrafo(
        "La componen dos aplicaciones. El **sitio web público** (*landing*), hecho con "
        "Next.js, presenta el estudio, sus programas, servicios y sello, y ofrece los "
        "formularios para inscribirse, reservar una cabina o consultar por equipos. Se genera "
        "de forma estática para cargar rápido y posicionarse bien en buscadores. El **panel "
        "de gestión** es una aplicación de una sola página hecha con React, a la que cada "
        "persona entra con su cuenta y ve solo lo que le corresponde. Ambas son responsivas: "
        "en un celular, el menú pasa a un panel desplegable y las tablas se muestran como "
        "tarjetas.")

    libro.titulo("Capa de lógica de negocio", nivel=2)
    libro.parrafo(
        "Es una API REST desarrollada en Java con Spring Boot. Recibe los pedidos de ambas "
        "aplicaciones, autentica a cada persona, verifica sus permisos, aplica las reglas de "
        "negocio y se comunica con la base de datos. También ejecuta los procesos "
        "automáticos (avisos y vencimientos), guarda los archivos subidos y genera las "
        "exportaciones en Excel y PDF.")

    libro.titulo("Capa de datos", nivel=2)
    libro.parrafo(
        "Es una base de datos relacional PostgreSQL con 31 tablas. Una decisión central del "
        "diseño es que **las reglas de negocio importantes no viven solo en el código, sino "
        "en la propia base**: restricciones de verificación, disparadores (*triggers*) y "
        "restricciones de exclusión impiden, por ejemplo, que dos reservas ocupen la misma "
        "sala al mismo tiempo, que una reserva exista sin una seña que la respalde o que se "
        "borre un pago. Así, ningún error de una pantalla ni un acceso directo a la API puede "
        "dejar los datos en un estado inválido.")
    libro.parrafo(
        "La estructura de la base evoluciona mediante migraciones versionadas (Flyway): cada "
        "cambio es un archivo numerado que se aplica una sola vez y nunca se modifica (Red "
        "Gate Software, s.f.). Al "
        "cierre del desarrollo son 38. El detalle de cada tabla y columna está en la Parte "
        "VIII y las relaciones, en las láminas de la Parte V.")

    libro.titulo("Stack tecnológico", nivel=2)
    libro.tabla(
        ["Componente", "Tecnología", "Justificación"],
        [
            ["Sitio público", "Next.js 16, React 19, TypeScript, Tailwind CSS",
             "Páginas generadas de antemano: carga rápida y buen posicionamiento en buscadores."],
            ["Panel de gestión", "React 19, Vite, TypeScript, Tailwind CSS",
             "Componentes reutilizables y tipado estático, que detecta errores antes de "
             "publicar."],
            ["API", "Java 21, Spring Boot 4.1, Spring Security, Spring Data JPA",
             "Robusto, tipado, con un ecosistema maduro para APIs de larga vida."],
            ["Base de datos", "PostgreSQL 16, migraciones con Flyway",
             "Relacional, con restricciones avanzadas para hacer cumplir las reglas del "
             "negocio."],
            ["Autenticación", "JWT firmado, contraseñas con BCrypt",
             "Sesión sin estado en el servidor, compatible con permisos por rol."],
            ["Exportaciones", "Apache POI (Excel) y OpenPDF (PDF)",
             "Bibliotecas de código abierto; OpenPDF evita la licencia AGPL de iText."],
            ["Despliegue", "Docker Compose y Caddy, en un servidor en la nube",
             "El mismo despliegue funciona en cualquier proveedor; HTTPS automático."],
            ["Calidad", "JUnit, Vitest y pruebas SQL; integración continua en GitHub Actions",
             "Cada cambio se verifica de forma automática antes de llegar a producción."],
            ["Control de versiones", "Git y GitHub", "Trazabilidad del desarrollo."],
        ],
        [3.0, 5.0, 7.0], titulo="Stack tecnológico del sistema",
        nota="Elaboración propia a partir de la documentación oficial de cada tecnología "
             "(Broadcom, s.f.; Meta Open Source, s.f.; PostgreSQL Global Development Group, "
             "s.f.; Vercel, s.f.; Vite, s.f.).")

    libro.titulo("Identidad, roles y relaciones", nivel=2)
    libro.parrafo(
        "Toda persona que usa el sistema tiene una única **cuenta de usuario**, sea alumno, "
        "profesor, cliente o parte del equipo. Esta decisión permite atender a quien solo "
        "alquila una cabina, compra un equipo o encarga un mix & mastering sin estar inscripto "
        "en ningún curso. Cualquiera puede crearse una cuenta desde el sistema, y la "
        "administración también puede crearlas: en ese caso el sistema genera una contraseña "
        "temporal que se le envía por WhatsApp y que la persona debe cambiar al entrar.")
    libro.parrafo(
        "Sobre esa cuenta se combinan dos ejes independientes. El **rol** define qué puede "
        "administrar la persona; las **relaciones** definen qué es para el estudio. Ser "
        "alumno o profesor no es un rol, sino una relación que se agrega a la cuenta. Así, "
        "una misma persona puede ser parte del equipo, dar clases y alquilar una cabina para "
        "sí misma, sin contradicción.", junto=True)
    libro.tabla(
        ["Rol", "Quién", "Nivel de acceso"],
        [
            ["ADMIN", "Administración general",
             "Acceso total. Es el único que puede otorgar roles y administrar las cuentas "
             "del equipo."],
            ["DIRECTIVO", "Dirección y socios",
             "Ve todas las pantallas de administración y el tablero completo, pero no "
             "modifica datos."],
            ["STAFF", "Micaela y equipo operativo",
             "Opera el día a día: alumnos, reservas, pagos y servicios. Ve el resumen "
             "financiero básico del tablero."],
            ["USUARIO", "Alumnos, profesores y clientes",
             "Accede a su propio portal. Lo que ve depende de sus relaciones."],
        ],
        [2.4, 4.2, 8.4], titulo="Roles del sistema")
    libro.parrafo(
        "El menú de cada persona se arma a partir de esos dos ejes con tres reglas: las "
        "secciones de servicios que cualquiera puede contratar (reservar una cabina, ver sus "
        "pagos, sus trabajos de mix & mastering) aparecen siempre; las de formación aparecen "
        "solo si existe la relación (alumno o profesor); y las de administración, solo para "
        "los roles que pueden verlas. La Figura 3 muestra los casos de uso principales de "
        "cada actor.")
    libro.figura(FIG / "casos-de-uso.png", "Diagrama de casos de uso del sistema",
                 ancho_cm=9.0,
                 nota="“Usuario” es cualquier persona con cuenta; alumno y profesor heredan "
                      "sus casos. Los avisos automáticos son un proceso programado del "
                      "sistema, no una persona.")

    libro.titulo("Perfil de usuario", nivel=2)
    libro.parrafo(
        "Cada persona tiene un perfil con su nombre, apellido, teléfono y correo electrónico. "
        "Puede editar sus datos de contacto, salvo el correo: es su credencial de acceso y, "
        "como el sistema no envía correos, un error de tipeo la dejaría sin poder entrar, por "
        "lo que se cambia a través de la administración. Desde el perfil también cambia su "
        "contraseña. La base de datos ya reserva lugar para una foto de perfil, una "
        "biografía y un estado de presencia, que quedan disponibles para una extensión "
        "futura orientada a la comunidad del estudio.")

    libro.titulo("Seguridad", nivel=2)
    libro.parrafo(
        "El acceso se resuelve con un inicio de sesión por correo y contraseña que entrega un "
        "token firmado (JWT), válido por 8 horas, o por 30 días si la persona elige "
        "“Recordarme” (Jones et al., 2015; ver Figura 4). Las medidas principales, "
        "orientadas a los riesgos más frecuentes de las aplicaciones web (OWASP Foundation, "
        "2021), son:", junto=True)
    libro.vinetas([
        "Las contraseñas se guardan cifradas con BCrypt, nunca en texto plano.",
        "Los intentos de inicio de sesión se limitan por dirección y por cuenta, para "
        "frenar ataques de fuerza bruta. Los tres rechazos posibles (correo inexistente, "
        "contraseña incorrecta y cuenta desactivada) responden con el mismo mensaje y en el "
        "mismo tiempo, para no revelar qué correos tienen cuenta.",
        "Los permisos se verifican contra la base de datos en cada pedido, no contra el "
        "token: desactivar una cuenta o cambiar un rol tiene efecto inmediato.",
        "La contraseña temporal vence a los 7 días y, mientras no se cambie, la cuenta solo "
        "puede cambiarla. Cambiar la contraseña cierra todas las sesiones abiertas.",
        "Cada persona solo puede ver lo suyo: el portal toma la identidad del token y nunca "
        "de un dato que envía el navegador.",
        "Las cabeceras de seguridad del navegador (política de contenido, protección contra "
        "incrustación) se aplican en todo el sitio, y la base de datos no es accesible desde "
        "afuera del servidor.",
    ])
    libro.figura(FIG / "secuencia-login.png", "Diagrama de secuencia del inicio de sesión",
                 ancho_cm=14.0)

    libro.titulo("Avisos y notificaciones", nivel=2)
    libro.parrafo(
        "El sistema tiene una bandeja de notificaciones interna para cada persona. Algunas "
        "las genera una acción (por ejemplo, la aprobación de un pedido de sala) y otras un "
        "proceso automático que corre todos los días y avisa a la administración sobre:",
        junto=True)
    libro.vinetas([
        "deudas que llevan más de 7 días vencidas;",
        "trabajos de mix & mastering entregados y sin pagar después de 7 días;",
        "lanzamientos del sello que salen dentro de una semana;",
        "preinscripciones cuya seña no llegó a tiempo;",
        "consultas de la web que llevan más de 48 horas sin respuesta.",
    ])
    libro.parrafo(
        "Además, el proceso vence las prerreservas de cabina que no se señaron y cancela las "
        "preinscripciones abandonadas. Cada aviso se escribe una sola vez por hecho, aunque "
        "el proceso corra muchas veces, para que la bandeja no se llene de repeticiones. Las "
        "comunicaciones con alumnos y clientes salen por WhatsApp mediante mensajes "
        "prearmados que el sistema redacta y la administración envía con un clic.")

    libro.titulo("Archivos y respaldos", nivel=2)
    libro.parrafo(
        "Los contratos del sello y los comprobantes de pagos y egresos se suben como archivos "
        "al servidor. El sistema les asigna el nombre y valida su tipo por su contenido, no "
        "por la extensión que trae. Un respaldo diario guarda la base de datos y la carpeta "
        "de archivos juntas, con una política de retención; la restauración completa se "
        "ensayó y se verificó que los datos, las reglas y los archivos vuelven intactos.")

    libro.titulo("Calidad y pruebas", nivel=2)
    libro.parrafo(
        "El sistema cuenta con pruebas automáticas en sus tres capas: cerca de 780 casos en "
        "la API, más de 700 en el panel y más de 400 casos que atacan directamente las "
        "reglas de la base de datos. Cada cambio que se sube al repositorio dispara un "
        "proceso de integración continua que aplica todas las migraciones sobre una base "
        "vacía, corre las tres suites, compila ambas aplicaciones y revisa el código con "
        "analizadores estáticos.")

    libro.titulo("Despliegue", nivel=2)
    libro.parrafo(
        "El sistema se despliega con Docker Compose en un único servidor en la nube: cuatro "
        "contenedores para el proxy con el panel, el sitio público, la API y la base de "
        "datos (Docker Inc., s.f.), con Caddy como proxy y certificados HTTPS automáticos "
        "(Caddy, s.f.). La configuración no depende del proveedor; se evaluaron Oracle Cloud (capa "
        "gratuita) y DigitalOcean (un servidor de unos 6 dólares mensuales). Se descartaron "
        "las plataformas gratuitas sin disco persistente, porque perderían los contratos y "
        "comprobantes en cada reinicio.")


# ========================================================================== módulos


def _modulo(libro, n, nombre, m):
    # En un libro, cada módulo arranca en página nueva.
    libro.titulo(f"Módulo {n} – {nombre}").paragraph_format.page_break_before = True

    libro.titulo("Objetivo del módulo", nivel=2)
    for p in m["objetivo"]:
        libro.parrafo(p)

    libro.titulo("Funcionalidades principales", nivel=2)
    libro.vinetas(m["funcionalidades"])

    libro.titulo("Circuito descriptivo", nivel=2)
    libro.numerada(m["circuito"])
    for fig in m.get("figuras_circuito", []):
        libro.figura(*fig[:2], **fig[2] if len(fig) > 2 else {})

    libro.titulo("Datos principales", nivel=2)
    libro.parrafo(
        "Las tablas de la base de datos que sostienen este módulo son las siguientes; el "
        "detalle de sus columnas está en la Parte VIII.", junto=True)
    libro.tabla(["Tabla", "Qué guarda"], m["datos"], [4.2, 10.8],
                titulo=f"Tablas del módulo {n}")

    libro.titulo("Acciones disponibles", nivel=2)
    libro.tabla(["Pantalla", "Quién", "Qué permite"], m["acciones"], [3.8, 2.8, 8.4],
                titulo=f"Pantallas y acciones del módulo {n}")

    libro.titulo("Tecnología", nivel=2)
    libro.tabla(["Capa", "Detalle"], m["tecnologia"], [3.0, 12.0],
                titulo=f"Implementación del módulo {n}")

    libro.titulo("Validaciones y lógica", nivel=2)
    libro.vinetas(m["validaciones"])
    for fig in m.get("figuras_final", []):
        libro.figura(*fig[:2], **fig[2] if len(fig) > 2 else {})


ADMIN = "Administración"
LECT = "Administración y dirección"

MODULOS = [
    ("Gestión de Alumnos e Inscripciones", {
        "objetivo": [
            "Centraliza la información de cada alumno desde la primera consulta hasta el final "
            "de su recorrido formativo, y la de todas las personas que se relacionan con el "
            "estudio. Reemplaza el Notion de acceso exclusivo de Micaela y elimina la "
            "dependencia de una sola persona para saber quién cursa qué.",
            "El centro del módulo es la **inscripción**: el contrato de un alumno, o de un "
            "grupo de dos o tres, con un programa (DJ, Producción o Mentoría), su nivel, su "
            "precio y la cantidad de clases contratadas. El módulo también recibe las "
            "consultas que llegan desde el sitio web.",
        ],
        "funcionalidades": [
            "Listados separados de alumnos, profesores, equipo, clientes y un directorio con "
            "todas las cuentas, con búsqueda y filtros.",
            "Alta de alumnos y profesores, creando la cuenta en el mismo paso si la persona no "
            "la tenía.",
            "Catálogo de programas con su precio individual y para grupos de dos y tres, y la "
            "cantidad de clases del paquete.",
            "Inscripciones individuales o grupales (hasta tres integrantes, con un referente "
            "que recibe los mensajes y a cuyo nombre queda la deuda).",
            "Preinscripción: quien todavía no pagó la seña ocupa su lugar por 24 horas.",
            "Ficha del alumno con sus cursos, clases restantes, historial de clases, estado de "
            "cuenta, y las notas y materiales de sus profesores.",
            "Clasificación por nivel (inicial, intermedio, avanzado), con firma obligatoria "
            "para bajar de nivel.",
            "Buzón de la web: las consultas de los formularios del sitio público, que se "
            "atienden creando la cuenta, la inscripción o la reserva desde la propia ficha.",
        ],
        "circuito": [
            "El interesado completa un formulario en el sitio web, o consulta por WhatsApp.",
            "La consulta llega al buzón con los datos que dejó: programa, experiencia, "
            "modalidad y, si viene en grupo, los datos de sus compañeros.",
            "Administración lo contacta por WhatsApp con un mensaje prearmado y, desde la "
            "ficha, lo inscribe: el sistema crea las cuentas que falten y propone el nivel y "
            "el precio según el catálogo y el tamaño del grupo.",
            "Si la seña entró en ese momento, la inscripción nace activa; si no, queda "
            "preinscripta por 24 horas. Un programa con precio cero (beca) nace activo.",
            "El alumno recibe por WhatsApp su contraseña temporal y el enlace al portal.",
            "Cada clase que toma descuenta una del paquete contratado, y queda en su historial.",
            "Los profesores agregan notas y materiales; la dirección puede consultar el "
            "recorrido completo de cualquier alumno.",
        ],
        "figuras_circuito": [
            (FIG / "flujo-inscripcion.png", "Diagrama de flujo de la inscripción a un curso",
             {"ancho_cm": 11.5}),
        ],
        "datos": [
            ["usuario", "La cuenta de cada persona: datos de contacto, rol y credenciales."],
            ["alumno", "La relación “es alumno” de una cuenta, con su estado."],
            ["profesor", "La relación “es profesor” de una cuenta, con su especialidad."],
            ["programa", "El catálogo: un programa por disciplina, con sus precios y clases."],
            ["inscripcion", "El contrato de un curso: disciplina, nivel, precio, moneda, "
                            "clases contratadas, estado y profesor asignado."],
            ["inscripcion_integrante", "Quiénes cursan cada inscripción (uno a tres) y quién "
                                       "es el referente."],
            ["solicitante", "Las consultas que llegan desde el sitio web y lo que produjo "
                            "cada una."],
            ["solicitante_companero", "Los compañeros de grupo que declara una consulta."],
        ],
        "acciones": [
            ["Alumnos", LECT, "Buscar y filtrar por disciplina y nivel; dar de alta un alumno."],
            ["Ficha del alumno", LECT, "Ver cursos, clases restantes, historial, estado de "
                                       "cuenta, notas y materiales."],
            ["Profesores", LECT, "Dar de alta y de baja profesores; editar sus datos."],
            ["Equipo · Clientes · Directorio", LECT,
             "Ver las cuentas por grupo; editar, resetear contraseñas y desactivar."],
            ["Programas", ADMIN, "Mantener el catálogo y sus precios."],
            ["Inscripciones", LECT, "Inscribir alumnos o grupos, cambiar el estado y el "
                                    "nivel."],
            ["Buzón de la web", ADMIN, "Atender consultas: escribir por WhatsApp, crear la "
                                       "cuenta, inscribir o apartar una cabina, descartar."],
        ],
        "tecnologia": [
            ["Base de datos", "Tablas usuario, alumno, profesor, programa, inscripcion, "
                              "inscripcion_integrante, solicitante y solicitante_companero."],
            ["API", "Paquetes usuario, alumno, profesor, programa, inscripcion, solicitante y "
                    "cliente. La consulta del sitio web es el único alta pública."],
            ["Panel", "Listados con búsqueda, formularios de alta, ficha del alumno y buzón."],
            ["Permisos", "Administración opera; dirección solo consulta; el profesor ve a sus "
                         "propios alumnos (Módulo 5) y el alumno, su propio perfil (Módulo 4)."],
        ],
        "validaciones": [
            "Una persona no puede tener dos inscripciones abiertas en la misma disciplina.",
            "Un grupo tiene entre uno y tres integrantes y exactamente un referente; sus "
            "integrantes quedan fijos al inscribirse. La mentoría no es grupal.",
            "Una preinscripción solo pasa a activa con una seña cobrada; si vence, se avisa a "
            "la administración, y a los 21 días sin seña se cancela sola.",
            "Una inscripción no puede consumir más clases de las contratadas.",
            "Bajar de nivel exige autor y motivo, que el sistema registra.",
            "Un pago de una inscripción debe estar en la moneda de esa inscripción.",
            "Una cuenta nunca se borra: se desactiva, y su historial se conserva.",
        ],
    }),
    ("Horarios y Salas", {
        "objetivo": [
            "Da visibilidad en tiempo real sobre el uso de los tres espacios del estudio y "
            "garantiza que nunca haya dos actividades en el mismo lugar y horario. Reemplaza "
            "la grilla de Notion y los sistemas paralelos de cada profesor por un calendario "
            "único.",
        ],
        "funcionalidades": [
            "Calendario semanal de las tres salas, con cada reserva, su tipo de uso, su "
            "profesor y sus participantes.",
            "Seis tipos de uso (clase de DJ, producción, mentoría, mix & mastering, alquiler "
            "de cabina y grabación de set) y una matriz que define cuáles admite cada sala.",
            "Alta de clases una por una, eligiendo el curso (alumno o grupo) que la toma; la "
            "clase se descuenta sola del curso.",
            "Prerreserva: una cabina queda apartada 72 horas mientras se espera la seña.",
            "Registro de asistencia por participante.",
            "Bloqueo de salas por un rango de fechas y una franja horaria.",
            "Pedidos de sala hechos desde el portal y pedidos de cambio de día de alumnos y "
            "profesores.",
            "Reporte de uso de salas por período.",
        ],
        "circuito": [
            "Administración elige la sala, el día, el horario y el tipo de uso.",
            "El sistema ofrece solo las combinaciones posibles: no muestra como libre una sala "
            "bloqueada ni ofrece un uso que esa sala no admite.",
            "Para una clase, se elige el curso; el profesor se propone a partir de la "
            "inscripción y puede cambiarse por un suplente.",
            "Para un alquiler o una grabación, se carga el precio y la seña (el 50 % por "
            "defecto), o se deja prerreservada por 72 horas.",
            "Al confirmar, la base verifica que no haya superposición, que nadie esté en dos "
            "salas a la vez y que la reserva tenga plata detrás.",
            "Si alguien pide otro día, el pedido llega a administración, que lo aprueba "
            "eligiendo el nuevo horario o lo rechaza con un motivo.",
        ],
        "figuras_circuito": [
            (FIG / "flujo-reserva.png", "Diagrama de flujo de la reserva de una sala",
             {"ancho_cm": 15.0}),
        ],
        "datos": [
            ["sala", "Los tres espacios del estudio y si están activos."],
            ["tipo_uso", "Los seis usos posibles y, para las clases, a qué disciplina "
                         "descuentan."],
            ["sala_tipo_uso", "La matriz: qué usos admite cada sala, con una advertencia "
                              "opcional."],
            ["reserva", "Cada ocupación de una sala: día, horario, tipo de uso, profesor, "
                        "estado, precio y vencimiento de la prerreserva."],
            ["reserva_participante", "Quiénes participan de cada reserva, con qué inscripción "
                                     "y su asistencia."],
            ["bloqueo_sala", "Los períodos en que una sala no puede usarse."],
            ["solicitud_reserva", "Los pedidos de sala hechos desde el portal."],
            ["solicitud_reprogramacion", "Los pedidos de cambio de día de una clase."],
        ],
        "acciones": [
            ["Calendario", LECT, "Ver la semana; crear, editar, mover y cancelar reservas; "
                                 "anotar participantes y tomar asistencia."],
            ["Pedidos de sala", ADMIN, "Aprobar un pedido del portal cobrando la seña, o "
                                       "rechazarlo con motivo."],
            ["Pedidos de cambio", ADMIN, "Aprobar un cambio de día eligiendo el nuevo horario, "
                                         "o rechazarlo."],
            ["Salas bloqueadas", ADMIN, "Bloquear y desbloquear salas."],
            ["Uso de salas", LECT, "Ver horas usadas, canceladas y reprogramadas por sala."],
        ],
        "tecnologia": [
            ["Base de datos", "Restricción de exclusión contra la superposición de reservas, "
                              "disparadores para bloqueos, para “nadie en dos salas” y para la "
                              "seña obligatoria."],
            ["API", "Paquetes reserva, sala y solicitud. La agenda se consulta por rango de "
                    "fechas."],
            ["Panel", "Grilla semanal deslizable en el celular, formularios de reserva y "
                      "bandejas de pedidos."],
            ["Permisos", "Administración opera; dirección consulta; el alumno y el profesor ven "
                         "solo sus reservas y piden cambios desde su portal."],
        ],
        "validaciones": [
            "Dos reservas activas no pueden superponerse en la misma sala.",
            "Una sala solo admite los tipos de uso que habilita la matriz; la grabación de "
            "sets, solo en la cabina de grabación.",
            "Ni un alumno ni un profesor pueden estar en dos salas al mismo tiempo.",
            "Una reserva no puede caer sobre una sala bloqueada ni en una sala inactiva.",
            "Toda reserva que ocupa su lugar tiene plata detrás: la inscripción de la clase o "
            "una seña cobrada. La excepción es el mix & mastering.",
            "Una prerreserva vence a las 72 horas sin seña y libera la sala.",
            "Una clase solo puede tomarla un curso activo de esa disciplina.",
            "El historial de clases no se borra, y la asistencia solo se corrige con autor.",
        ],
        "figuras_final": [
            (FIG / "secuencia-alta-reserva.png",
             "Diagrama de secuencia del alta de una reserva con seña", {"ancho_cm": 15.0,
              "nota": "El caso dibujado es un alquiler de cabina, que lleva seña. Una clase no "
                      "la lleva: su respaldo es la inscripción."}),
        ],
    }),
    ("Pagos y Cobros", {
        "objetivo": [
            "Unifica el registro financiero del estudio en pesos y en dólares, reemplazando el "
            "Excel y los indicadores manuales de Notion. Permite saber en todo momento qué "
            "entró, qué salió y quién debe, y respalda cada movimiento con su comprobante.",
        ],
        "funcionalidades": [
            "Registro de pagos asociados a lo que saldan: una inscripción, una reserva, un "
            "trabajo de mix & mastering o una venta de equipo.",
            "Pagos de personas sin cuenta, registrados a nombre escrito.",
            "Monedas ARS y USD con cotización, y cinco medios de pago: efectivo, "
            "transferencia, PayPal, cuenta en EE. UU. y otro.",
            "Comprobantes adjuntos como archivos (imagen o PDF), que no se borran: se marcan "
            "como inválidos con firma.",
            "Anulación de pagos, egresos y ventas con autor y motivo.",
            "Caja por moneda y por período.",
            "Deudores: lo que falta cobrar de cada inscripción, reserva, trabajo o venta, "
            "calculado contra su precio, más las deudas anotadas.",
            "Egresos (sueldos y gastos) y ventas de equipos.",
            "Estado de cuenta de cada persona.",
        ],
        "circuito": [
            "Desde Deudores, administración ve qué falta cobrar y a quién, con los días de "
            "atraso.",
            "Al cobrar, el formulario ya sabe qué se salda, la persona, la moneda y el saldo.",
            "Se registra el pago, con su medio y su cotización si es en dólares, y se adjunta "
            "el comprobante.",
            "Si el pago cubre el saldo, la deuda sale de Deudores y el pago pasa al listado de "
            "Pagos. Si era la seña de una preinscripción, la inscripción se activa.",
            "La caja refleja el movimiento en su moneda, y el estado de cuenta de la persona, "
            "su saldo actualizado.",
        ],
        "datos": [
            ["pago", "Cada movimiento de plata que entra o se espera: monto, moneda, "
                     "cotización, medio, estado y a qué apunta."],
            ["comprobante_pago", "Los archivos que respaldan un pago."],
            ["egreso", "La plata que sale: sueldos y gastos."],
            ["comprobante_egreso", "Los archivos que respaldan un egreso."],
            ["venta_equipo", "Las ventas de equipos, con comprador con o sin cuenta."],
        ],
        "acciones": [
            ["Pagos", LECT, "Listar los pagos cerrados por línea de negocio; corregir o "
                            "anular; adjuntar comprobantes."],
            ["Deudores", LECT, "Ver lo que falta cobrar, una fila por deudor, y cobrar."],
            ["Caja", LECT, "Ver ingresos, egresos y saldo por moneda y período."],
            ["Estado de cuenta", LECT, "Ver todo lo que una persona pagó y debe."],
            ["Egresos", LECT, "Registrar sueldos y gastos con su comprobante; anular."],
            ["Venta de equipos", LECT, "Registrar una venta y su cobro; anular."],
        ],
        "tecnologia": [
            ["Base de datos", "Disparadores que exigen autor y motivo para anular, que impiden "
                              "borrar plata y que fijan la moneda de cada pago a la de lo que "
                              "salda."],
            ["API", "Paquetes pago, egreso y venta. “Lo que falta cobrar” es una única "
                    "definición en SQL, que leen Deudores, Pagos y el tablero."],
            ["Panel", "Listados con solapas por línea de negocio, formulario de cobro "
                      "precargado y descarga de comprobantes."],
            ["Permisos", "Administración opera; dirección consulta; cada persona ve su propio "
                         "estado de cuenta (Módulo 4)."],
        ],
        "validaciones": [
            "Un pago, un egreso o un comprobante nunca se borran: se anulan o se invalidan "
            "con autor, fecha y motivo.",
            "Un pago apunta a una sola cosa y debe estar en su moneda.",
            "Los servicios se señan con el 50 % antes de reservar el lugar; el mix & "
            "mastering puede quedar en deuda.",
            "Una deuda anotada vence a los 7 días y genera un aviso.",
            "Una venta con un pago vigente no puede anularse sin anular primero el pago.",
            "Pesos y dólares nunca se suman entre sí: cada total va en su moneda.",
        ],
    }),
    ("Portal del Alumno", {
        "objetivo": [
            "Da a alumnos y clientes autonomía para consultar su información sin depender de "
            "Micaela: sus cursos, sus clases, sus pagos y sus materiales. Es el mismo portal "
            "para cualquier persona con cuenta; las secciones de formación aparecen solo para "
            "quien es alumno.",
        ],
        "funcionalidades": [
            "Inicio con la próxima clase o reserva y lo que la persona debe.",
            "Mis cursos: el progreso de cada curso, clase por clase.",
            "Mis reservas, separadas en clases y alquileres, con el botón para pedir otro día.",
            "Reservar cabina: un pedido sobre la disponibilidad real de las salas.",
            "Mis pedidos, Mis pagos (estado de cuenta y descarga de comprobantes) y Mis "
            "trabajos de mix & mastering.",
            "Mis materiales, notificaciones y perfil.",
            "Registro propio desde la web y cambio obligatorio de la contraseña temporal.",
        ],
        "circuito": [
            "La persona entra con su correo y contraseña; si es temporal, primero la cambia.",
            "El inicio le muestra su próxima clase y sus deudas.",
            "Para alquilar una cabina, elige un horario libre y envía el pedido.",
            "Administración lo aprueba cobrando la seña, y la reserva aparece en Mis reservas "
            "con una notificación.",
            "Si no puede asistir a una clase, pide otro día con un motivo y espera la "
            "respuesta en la misma pantalla.",
        ],
        "datos": [
            ["solicitud_reserva", "Los pedidos de sala del portal y su resolución."],
            ["solicitud_reprogramacion", "Los pedidos de cambio de día."],
            ["notificacion", "La bandeja de avisos de cada persona."],
            ["material", "El material que los profesores le compartieron."],
        ],
        "acciones": [
            ["Inicio", "Cualquier usuario", "Ver lo próximo y lo que debe."],
            ["Mis cursos · Mis materiales", "Alumno", "Ver el progreso y abrir los materiales."],
            ["Mis reservas", "Cualquier usuario", "Ver sus reservas y pedir otro día."],
            ["Reservar cabina · Mis pedidos", "Cualquier usuario",
             "Pedir una sala y seguir el estado del pedido."],
            ["Mis pagos", "Cualquier usuario", "Ver su estado de cuenta y descargar "
                                               "comprobantes."],
            ["Mis trabajos", "Cualquier usuario", "Ver el estado de sus trabajos de mix & "
                                                  "mastering."],
            ["Notificaciones · Mi perfil", "Cualquier usuario",
             "Leer avisos; editar sus datos y su contraseña."],
        ],
        "tecnologia": [
            ["Base de datos", "Una resolución de pedido es definitiva: no puede volver a "
                              "pendiente."],
            ["API", "Paquetes portal, solicitud y notificacion, bajo /api/me: ningún "
                    "endpoint del portal recibe la identidad, la toma del token."],
            ["Panel", "Pantallas propias del portal, con proyecciones que no exponen datos de "
                      "otros participantes ni notas internas."],
            ["Permisos", "Cada persona ve únicamente lo suyo; lo ajeno responde “no existe”."],
        ],
        "validaciones": [
            "El portal no crea reservas: crea pedidos, porque una reserva necesita una seña "
            "cobrada y el cobro lo registra la administración.",
            "Solo se pueden pedir los usos habilitados para el público: alquiler de cabina y "
            "grabación de set.",
            "Un pedido se aprueba tal como se hizo; si el horario no sirve, se rechaza con "
            "motivo.",
            "El correo no se cambia desde el perfil: es la credencial de acceso.",
        ],
    }),
    ("Portal del Profesor", {
        "objetivo": [
            "Da a cada profesor un espacio propio para organizar su semana, seguir a sus "
            "alumnos y compartirles material, sin depender de la administración para cada "
            "consulta. Responde al sistema paralelo que hoy lleva Ghezz por su cuenta.",
        ],
        "funcionalidades": [
            "Mi agenda: sus clases de las próximas cuatro semanas.",
            "Mis alumnos: una tarjeta por curso o grupo, con las clases restantes y un "
            "semáforo de seguimiento por alumno.",
            "Ficha del alumno con notas privadas por clase.",
            "Estado de seguimiento: va bien, requiere atención o en pausa.",
            "Subir material para todo un curso o para una clase puntual, como enlace.",
            "Pedir otro día para una clase, con el mismo circuito que el alumno.",
        ],
        "circuito": [
            "El profesor ve su agenda y la próxima clase con el nivel de cada alumno.",
            "Después de la clase, deja una nota sobre lo trabajado.",
            "Marca el estado de seguimiento del alumno si algo cambió.",
            "Sube el material de la clase o del curso, y decide si el alumno lo ve.",
            "Administración puede leer las notas de todos los profesores desde la ficha del "
            "alumno.",
        ],
        "datos": [
            ["nota_profesor", "Las notas privadas de un profesor sobre un alumno, por clase."],
            ["seguimiento_alumno", "El estado de seguimiento que cada profesor le asigna a "
                                   "cada alumno."],
            ["material", "El material de un curso o de una clase, como enlace."],
        ],
        "acciones": [
            ["Mi agenda", "Profesor", "Ver sus clases y pedir otro día."],
            ["Mis alumnos", "Profesor", "Ver sus cursos y grupos con el semáforo."],
            ["Ficha del alumno", "Profesor", "Escribir notas y cambiar el seguimiento."],
            ["Subir material · Mis materiales", "Profesor",
             "Compartir material y administrar lo que subió."],
        ],
        "tecnologia": [
            ["Base de datos", "El estado de seguimiento registra solo su fecha de cambio; un "
                              "material se cuelga de un curso y, opcionalmente, de una clase de "
                              "ese curso."],
            ["API", "Paquete docencia, bajo /api/me/profesor. Ser profesor es una relación: "
                    "el sistema la verifica en cada pedido."],
            ["Panel", "Agenda, tarjetas por curso y ficha del alumno."],
            ["Permisos", "Un profesor ve a los alumnos de sus inscripciones y a quienes estuvo "
                         "en una clase que dictó, incluso como suplente."],
        ],
        "validaciones": [
            "Las notas privadas no las ven el alumno ni otros profesores; la administración sí.",
            "Una nota solo puede referirse a una clase en la que estuvo ese alumno.",
            "El material de un curso llega solo a quienes cursan ese curso.",
            "Corregir una nota le corresponde solo a su autor.",
        ],
    }),
    ("Mix & Mastering", {
        "objetivo": [
            "Formaliza el servicio de mezcla y masterización, hoy gestionado por Ghezz por "
            "WhatsApp, con registro de cada trabajo, sus revisiones, su entrega y su cobro. "
            "Los audios no pasan por el sistema: se intercambian por enlaces.",
        ],
        "funcionalidades": [
            "Tablero de trabajos por estado: a confirmar, en proceso, entregado, debe, pagado "
            "y cancelado.",
            "Tipo de trabajo (mezcla, masterización o ambas), precio acordado y moneda.",
            "Revisiones incluidas y realizadas, señalando cuándo se superan las incluidas.",
            "Acciones explícitas: confirmar, entregar y cancelar.",
            "Entrega diferenciada: el *master* (la canción terminada) se entrega al terminar; "
            "el *premaster* (el archivo para discográficas) se retiene hasta el pago.",
            "Clientes con o sin cuenta; un trabajo puede asignarse después a la cuenta que se "
            "cree.",
            "Vista de solo lectura para el cliente en su portal.",
        ],
        "circuito": [
            "Ghezz carga el trabajo con el cliente, el tipo y el precio.",
            "Lo confirma y lo pasa a en proceso.",
            "Registra cada revisión; si se supera lo incluido, queda registrado para cobrar el extra.",
            "Lo entrega cargando el enlace del master.",
            "El cliente paga; cuando el precio queda cubierto, el trabajo pasa a pagado y el "
            "premaster se libera.",
            "Si a los 7 días de entregado no se pagó, pasa a debe y se avisa a la "
            "administración.",
        ],
        "figuras_circuito": [
            (FIG / "flujo-mix-mastering.png",
             "Diagrama de flujo de un trabajo de mix & mastering", {"ancho_cm": 11.0}),
        ],
        "datos": [
            ["trabajo_mastering", "Cada trabajo: cliente, tipo, precio, moneda, revisiones, "
                                  "enlaces del master y premaster, fechas y estado."],
            ["pago", "Los cobros del trabajo (Módulo 3)."],
        ],
        "acciones": [
            ["Mix & Mastering", LECT, "Cargar, confirmar, entregar, cobrar, liberar el "
                                      "premaster, cancelar y asignar la cuenta del cliente."],
            ["Mis trabajos", "Cliente", "Ver el estado de sus trabajos y lo que pagó."],
        ],
        "tecnologia": [
            ["Base de datos", "Disparadores que exigen el precio cubierto para liberar el "
                              "premaster, que impiden retroceder de estado y que protegen el "
                              "pago que respalda una liberación."],
            ["API", "Paquete mastering, con una acción por cada paso del ciclo en lugar de un "
                    "cambio de estado libre."],
            ["Panel", "Tablero por estado, expediente del trabajo y vista del portal."],
            ["Permisos", "Administración opera; el cliente ve sus trabajos sin el enlace del "
                         "premaster ni las notas internas."],
        ],
        "validaciones": [
            "El premaster se libera solo con el precio cubierto en la moneda del trabajo, o "
            "con una excepción escrita y firmada.",
            "Para confirmar hace falta un precio; para entregar, el enlace del master.",
            "Un trabajo con pagos vigentes no puede cancelarse sin anularlos primero.",
            "El estado solo avanza; cancelado es definitivo.",
            "El cobro va a nombre del cliente del trabajo, nunca de otra persona.",
        ],
    }),
    ("Sello Discográfico", {
        "objetivo": [
            "Integra la operación del sello al sistema del estudio: artistas, lanzamientos, "
            "canciones, contratos y la difusión posterior. La información deja de depender de "
            "las herramientas personales de una sola persona.",
        ],
        "funcionalidades": [
            "Catálogo de lanzamientos con código correlativo propio (LJ020, LJ021…), "
            "incluidos los anteriores al sistema.",
            "Tipos de lanzamiento: single, EP, remix y álbum.",
            "Estados: a confirmar, confirmado, en distribución, publicado y cancelado.",
            "Lista de canciones de un EP o un álbum, con duración, artista invitado e ISRC.",
            "Contratos subidos como archivo PDF, por lanzamiento o generales del artista.",
            "Seguimiento posterior: dónde sonó cada lanzamiento (radio, set, playlist).",
            "Aviso una semana antes de cada lanzamiento.",
        ],
        "circuito": [
            "Ghezz da de alta al artista y el lanzamiento, que nace a confirmar.",
            "Carga las canciones y sube el contrato firmado.",
            "Lo confirma y lo pasa a distribución.",
            "Al publicarlo, el sistema verifica que tenga contrato y, si es EP o álbum, la "
            "cantidad de canciones correcta.",
            "Después del lanzamiento, registra dónde sonó.",
        ],
        "datos": [
            ["artista", "Los artistas del sello. No tienen acceso al sistema."],
            ["release", "Cada lanzamiento: código, tipo, fechas, estado y artista."],
            ["cancion_release", "Las canciones de un EP o un álbum."],
            ["contrato_sello", "Los contratos, como archivos subidos."],
            ["aparicion_release", "Dónde sonó cada lanzamiento."],
        ],
        "acciones": [
            ["Sello", LECT, "Crear lanzamientos, cargar canciones y contratos, publicar, "
                            "cancelar y registrar apariciones."],
            ["Artistas", LECT, "Dar de alta y editar artistas."],
        ],
        "tecnologia": [
            ["Base de datos", "Disparadores que exigen contrato para publicar, que controlan "
                              "el rango de canciones y que protegen lo que sostiene un "
                              "lanzamiento publicado."],
            ["API", "Paquetes sello y archivo. El archivo se guarda con un nombre que elige el "
                    "sistema."],
            ["Panel", "Catálogo, ficha del lanzamiento y listado de artistas."],
            ["Permisos", "Administración opera; dirección consulta. Los artistas no entran."],
        ],
        "validaciones": [
            "Ningún lanzamiento se publica sin contrato adjunto, salvo una excepción escrita "
            "y firmada.",
            "Un EP lleva de 3 a 6 canciones y un álbum de 8 a 15; se controla al publicar.",
            "Un lanzamiento con canciones no puede cambiar de formato.",
            "Un contrato no se borra; un lanzamiento se retira cancelándolo.",
            "El orden de “dónde sonó” sigue una jerarquía fija: radio, set, playlist y otro.",
        ],
    }),
    ("Tablero de Dirección", {
        "objetivo": [
            "Da a la dirección acceso autónomo a los indicadores clave del negocio, sin pedirle "
            "a la administración que consolide planillas. Sus números salen de las mismas "
            "definiciones que usan las demás pantallas, para que dos personas nunca vean dos "
            "totales distintos del mismo mes.",
        ],
        "funcionalidades": [
            "Alumnos activos por disciplina.",
            "Ingresos y egresos por línea de negocio y por moneda.",
            "Ocupación de salas por día y franja horaria, como mapa de calor.",
            "Deuda viva, entregas de mix & mastering y lanzamientos del sello.",
            "Tasa de retención.",
            "Exportación a Excel y PDF de lo que se está viendo.",
        ],
        "circuito": [
            "La persona elige el período a analizar.",
            "El tablero muestra los indicadores del período y, aparte, los que son una foto "
            "del día (alumnos activos, deuda viva y retención).",
            "Si lo necesita, exporta el tablero en Excel o PDF.",
        ],
        "datos": [
            ["(todas)", "El tablero no tiene tablas propias: solo lee las de los demás "
                        "módulos."],
        ],
        "acciones": [
            ["Tablero (completo)", "ADMIN y DIRECTIVO", "Ver todos los indicadores y "
                                                        "exportarlos."],
            ["Tablero (resumen)", "STAFF", "Ver el resumen financiero básico."],
        ],
        "tecnologia": [
            ["Base de datos", "Consultas de agregación; ninguna migración propia."],
            ["API", "Paquete tablero, con un endpoint para el tablero completo y otro para el "
                    "resumen, y la exportación con Apache POI y OpenPDF."],
            ["Panel", "Indicadores, gráficos y mapa de calor de ocupación."],
            ["Permisos", "El tablero completo, solo para dirección y administración general."],
        ],
        "validaciones": [
            "La retención cuenta a quien contrató un segundo servicio dentro de los 10 meses "
            "del primero, y solo sobre quienes ya cumplieron esa ventana; sin datos, se "
            "muestra vacía y no como cero.",
            "La caja del tablero es la misma que la del Módulo 3, no un cálculo aparte.",
            "Una sala sin uso aparece con cero, no desaparece del reporte.",
            "Cada archivo exportado lleva un encabezado con los filtros, la fecha y quién lo "
            "generó, en cada hoja y en cada página.",
        ],
    }),
]


def _consideraciones(libro):
    libro.titulo("Consideraciones finales")
    libro.parrafo(
        "El sistema propuesto es una solución integral diseñada para las necesidades "
        "operativas de La Juanita Studio, tal como surgieron del relevamiento con Micaela, "
        "Ghezz y la dirección. La organización en ocho módulos permitió un desarrollo "
        "progresivo, empezando por los de mayor impacto operativo, sin afectar el "
        "funcionamiento de lo ya construido.")
    libro.titulo("Orden de desarrollo", nivel=2)
    libro.vinetas([
        "**Primera etapa:** Módulo 1 (Alumnos e inscripciones), Módulo 2 (Horarios y salas) "
        "y Módulo 3 (Pagos y cobros).",
        "**Segunda etapa:** Módulo 4 (Portal del alumno), Módulo 5 (Portal del profesor) y "
        "Módulo 6 (Mix & Mastering).",
        "**Tercera etapa:** Módulo 7 (Sello discográfico), Módulo 8 (Tablero de dirección) "
        "y los avisos automáticos.",
        "**Etapa de mejoras:** con el sistema completo, el estudio lo usó y sus observaciones "
        "se incorporaron por rondas: el rediseño visual, el sitio público conectado al buzón, "
        "la preinscripción, los grupos y la adaptación al celular.",
    ])
    libro.titulo("Extensiones futuras", nivel=2)
    libro.parrafo(
        "Quedan fuera del alcance actual y se identifican como posibles extensiones: la "
        "integración con la API de WhatsApp Business para automatizar las respuestas (la de "
        "mayor valor, porque ataca el principal problema relevado), el envío de correos "
        "electrónicos, el cobro en línea mediante una pasarela de pago, la integración con "
        "plataformas de distribución musical y el perfil social de la comunidad (foto, "
        "biografía y estado de presencia), para el que la base de datos ya reserva lugar.")


def escribir(libro):
    _introduccion(libro)
    _arquitectura(libro)
    for n, (nombre, m) in enumerate(MODULOS, 1):
        _modulo(libro, n, nombre, m)
    _consideraciones(libro)
