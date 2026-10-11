"""Esqueleto: el contenido llega en la Fase 1."""

TITULOS = [
    'Prólogo',
    'La empresa',
    'Informe de relevamiento',
    'Problemas detectados en el contexto actual',
    'Necesidades relevadas',
    'Actores involucrados',
    'Limitaciones del relevamiento',
    'Procesos actuales',
    'Conclusión del informe de relevamiento',
]


def escribir(libro):
    for t in TITULOS:
        libro.titulo(t)
        libro.pendiente('Contenido: Fase 1')
