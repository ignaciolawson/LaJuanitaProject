"""Generador de la Guía de buenas prácticas de uso: mismo formato que el Manual de Usuario.

    python docs/EntregaFinal/fuente/guia.py
    pwsh docs/EntregaFinal/fuente/exportar.ps1 Guia-de-Buenas-Practicas

El manual dice dónde está cada botón; esta guía dice qué hábitos mantienen limpios los datos.
"""

import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))

from libro import Libro  # noqa: E402
from manual import Manual  # noqa: E402

SALIDA = AQUI.parent / "Guia-de-Buenas-Practicas.docx"


class Guia(Manual):
    def __init__(self):
        Libro.__init__(self, "La Juanita Studio · Guía de buenas prácticas")
        self.capturas = []
        self.capitulo_actual = ""


def armar():
    import guia_contenido
    g = Guia()
    g.portada("Guía de Buenas Prácticas de Uso",
              "Sistema de Gestión Integral para La Juanita Studio")
    g.indice()
    guia_contenido.escribir(g)
    g.doc.core_properties.author = "Ignacio Lawson"
    g.doc.core_properties.title = "Guía de Buenas Prácticas de Uso — La Juanita Studio"
    g.doc.save(SALIDA)
    print(f"{SALIDA} · {g.tablas} tablas")


if __name__ == "__main__":
    armar()
