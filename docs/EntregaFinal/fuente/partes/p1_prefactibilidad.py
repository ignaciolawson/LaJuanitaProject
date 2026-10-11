"""Parte I — Estudio de Prefactibilidad.

Es el texto de marzo de 2026, corregido donde los datos resultaron falsos: una sola
sede (Pilar, no CABA ni Córdoba), el año de fundación y la grabación de sets como
servicio. Describe el negocio ANTES del sistema, y así tiene que seguir leyéndose."""


def escribir(libro):
    libro.titulo("Introducción")
    libro.parrafo(
        "El presente documento tiene como objetivo analizar la prefactibilidad de implementar "
        "un sistema integral de gestión para La Juanita Music, con el fin de optimizar sus "
        "operaciones, mejorar la experiencia de alumnos y clientes, y acompañar su crecimiento "
        "sostenido dentro de la industria de la música electrónica.")

    libro.titulo("¿Qué es La Juanita?")
    libro.parrafo(
        "La Juanita es un sello discográfico dedicado a recibir música de artistas de todo el "
        "mundo, realizar una curaduría y comercializar aquellos proyectos que estén alineados "
        "con su sonido en cada momento.")
    libro.parrafo(
        "El proyecto fue impulsado por la familia Oppel como principal inversora, junto a "
        "Federico Castelo y “Chapa” Ruiz, conocidos como *Chapa & Castelo*, dos DJ y "
        "productores con el sueño de montar un sello discográfico propio. Funciona desde 2021.")
    libro.parrafo(
        "Hoy La Juanita, desde su sede en el Office Park Quatro de Pilar, provincia de Buenos "
        "Aires, dicta cursos de DJ y de producción musical para todos los niveles, y mentorías "
        "para quienes quieren profundizar en el mundo de la música electrónica. También "
        "organiza eventos en Argentina, Uruguay y Brasil, donde difunde su música, conecta con "
        "profesionales de otros países y da espacio a la comunidad.")
    libro.parrafo(
        "A esos servicios suma el alquiler de cabinas para practicar, la grabación de sets en "
        "su cabina de grabación, el servicio de mezcla y masterización (*mix & mastering*) y la "
        "venta de equipos de música.")

    libro.titulo("¿Cuál es la situación actual?")
    libro.parrafo(
        "En el último tiempo el sello creció de forma notable, impulsado por el auge de la "
        "cultura electrónica y por el interés de cada vez más jóvenes en convertirse en DJ y "
        "productores. Esto produjo un aumento marcado de la demanda de todos sus servicios: "
        "cursos, mentorías, alquileres y eventos.")

    libro.titulo("¿Cuál es el proceso actual?")
    libro.parrafo(
        "La Juanita cuenta con un único canal de contacto, WhatsApp, por el que centraliza "
        "todos los servicios que ofrece. Organiza las clases y las reservas en planillas de "
        "cálculo y en Notion, y se apoya en Linktree para derivar a sus redes sociales, a sus "
        "nuevos lanzamientos y a las fechas de sus eventos.")
    libro.parrafo(
        "Linktree es una plataforma que permite crear una página con múltiples enlaces en un "
        "solo lugar: el sitio web, la tienda en línea, las redes sociales, videos, formularios, "
        "WhatsApp o cualquier otro contenido de la marca. Es, en la práctica, la única "
        "presencia web propia que tiene hoy el estudio.")

    libro.titulo("Problemas detectados")
    libro.vinetas([
        "Falta de centralización real de la información.",
        "Dependencia de la comunicación manual.",
        "Baja escalabilidad de la operación.",
        "Falta de trazabilidad sobre alumnos, pagos y servicios.",
        "Pérdida de oportunidades por la fricción en el primer contacto.",
    ])
