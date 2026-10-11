"""Esqueleto: el contenido llega en la Fase 5."""

TITULOS = [
    'Prólogo',
    'Carta de presentación',
    'Presentación de la necesidad detectada',
    'Objetivos de la propuesta',
    'Módulos funcionales del sistema',
    'Alcance del proyecto',
    'Propuesta económica y plan de pagos',
    'Beneficios esperados',
    'Condiciones generales',
    'Soporte, garantía y mantenimiento',
    'Términos y condiciones contractuales',
    'Consideraciones finales',
    'Validez de la propuesta y firmas',
]


def escribir(libro):
    for t in TITULOS:
        libro.titulo(t)
        libro.pendiente('Contenido: Fase 5')
