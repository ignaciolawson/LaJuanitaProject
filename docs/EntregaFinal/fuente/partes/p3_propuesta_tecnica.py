"""Esqueleto: el contenido llega en la Fases 2 a 4."""

TITULOS = [
    'Introducción',
    'Arquitectura general del sistema',
    'Módulo 1 – Gestión de Alumnos',
    'Módulo 2 – Horarios y Salas',
    'Módulo 3 – Pagos y Cobros',
    'Módulo 4 – Portal del Alumno',
    'Módulo 5 – Portal del Profesor',
    'Módulo 6 – Mix & Mastering',
    'Módulo 7 – Sello Discográfico',
    'Módulo 8 – Tablero de Dirección',
    'Consideraciones finales',
]


def escribir(libro):
    for t in TITULOS:
        libro.titulo(t)
        libro.pendiente('Contenido: Fases 2 a 4')
