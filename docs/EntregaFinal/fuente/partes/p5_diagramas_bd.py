"""Los tres diagramas grandes de la base no entran en una hoja A4: van en láminas
aparte. Esta parte deja dicho dónde están y qué muestra cada uno."""


def escribir(libro):
    libro.titulo("Láminas de la base de datos")
    libro.parrafo(
        "Por su tamaño, los tres diagramas que describen la base de datos completa no se "
        "reproducen en estas páginas: se entregan impresos en láminas aparte, que acompañan "
        "a este documento. Reflejan el esquema tal como quedó al cierre del desarrollo, "
        "con sus 31 tablas.")
    libro.tabla(
        ["Lámina", "Diagrama", "Qué muestra"],
        [
            ["1", "Diagrama relacional",
             "Las 31 tablas con todas sus columnas, claves primarias y foráneas, y sus "
             "relaciones en notación pata de gallo."],
            ["2", "Diagrama entidad-relación",
             "El modelo conceptual en notación de Chen: 28 entidades y 49 relaciones con su "
             "cardinalidad mínima y máxima."],
            ["3", "Diagrama de clases",
             "Las 30 clases de entidad del sistema, con sus atributos y métodos de dominio, "
             "y las 26 enumeraciones que usan."],
        ],
        [1.6, 4.0, 9.4],
        titulo="Láminas que acompañan a este documento",
        nota="Las claves foráneas de auditoría (quién registró, anuló o modificó un dato) "
             "aparecen como columnas pero no se dibujan como líneas: todas apuntan a la "
             "tabla de usuarios y no aportan información de negocio. El detalle de cada "
             "columna está en la Parte VIII, Diccionario de Datos.")
