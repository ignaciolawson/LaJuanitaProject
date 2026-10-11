"""Esqueleto: el contenido llega en la Fase 6."""

TITULOS = [
    'Diagrama de Gantt',
]


def escribir(libro):
    for t in TITULOS:
        libro.titulo(t)
        libro.pendiente('Contenido: Fase 6')
