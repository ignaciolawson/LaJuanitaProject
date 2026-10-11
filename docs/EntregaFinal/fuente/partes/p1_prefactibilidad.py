"""Esqueleto: el contenido llega en la Fase 1."""

TITULOS = [
    'Introducción',
    '¿Qué es La Juanita?',
    '¿Cuál es la situación actual?',
    '¿Cuál es el proceso actual?',
    'Problemas detectados',
]


def escribir(libro):
    for t in TITULOS:
        libro.titulo(t)
        libro.pendiente('Contenido: Fase 1')
