"""Planilla de horas: los tiempos los pasó Ignacio el 2026-10-10, tal cual."""

FILAS = [
    ("1", "Estudio de Prefactibilidad", "2 h", "1:30 h"),
    ("2", "Relevamiento (todo lo que contempla)", "8 h", "20 h"),
    ("3", "Redacción del Informe de Relevamiento", "13 h", "12 h"),
    ("4", "Revisión del Informe de Relevamiento", "2 h", "2 h"),
    ("5", "Elaboración de la Hoja de Horas", "1 h", "0,6 h"),
    ("6", "Elaboración del Diagrama de Gantt", "1 h", "1 h"),
    ("7", "Desarrollo de la Propuesta Técnica", "20 h", "13 h"),
    ("8", "Desarrollo de la Propuesta Comercial", "10 h", "7 h"),
    ("9", "Revisión y correcciones de la Propuesta Comercial y Técnica", "3 h", "3 h"),
    ("10", "Elaboración de diagramas", "15 h", "4:30 h"),
    ("11", "Implementación en Base de Datos", "10 h", "9:35 h"),
    ("12", "Desarrollo Módulo 1 – Alumnos", "48 h", "1 h"),
    ("13", "Desarrollo Módulo 2 – Horarios y Salas", "24 h", "6:23 h"),
    ("14", "Desarrollo Módulo 3 – Pagos", "15 h", "2:44 h"),
    ("15", "Desarrollo Módulo 4 – Portal del Alumno", "72 h", "5:44 h"),
    ("16", "Desarrollo Módulo 5 – Portal del Profesor", "72 h", "4:56 h"),
    ("17", "Desarrollo Módulo 6 – Mix & Mastering", "48 h", "0,6 h"),
    ("18", "Desarrollo Módulo 7 – Sello", "24 h", "1:06 h"),
    ("19", "Desarrollo Módulo 8 – Tablero", "48 h", "1 h"),
    ("20", "Pruebas funcionales", "48 h", "32 h"),
    ("21", "Desarrollo del Manual de Usuario", "15 h", "—"),
    ("22", "Presentación del proyecto terminado", "2 h", "—"),
    ("", "**Total**", "**501 h**", "—"),
]


def escribir(libro):
    libro.titulo("Hoja de horas")
    libro.parrafo(
        "La siguiente planilla compara, para cada actividad del proyecto, el tiempo que se "
        "estimó al planificarlo con el que efectivamente llevó.")
    libro.tabla(["N.º", "Actividad", "Tiempo estimado", "Tiempo real"],
                FILAS, [1.2, 8.8, 2.5, 2.5],
                titulo="Tiempos estimados y reales por actividad")
