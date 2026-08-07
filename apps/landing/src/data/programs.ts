// Contenido placeholder — nombres, duraciones y precios a confirmar con el cliente.
export type Program = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  duration: string;
  modality: string;
  price: string;
  highlights: string[];
  image: string;
  /** Decorative "fader" level (0–100) for the channel-strip UI — not a real metric. */
  level: number;
  levelLabel: string;
};

export const PROGRAMS: Program[] = [
  {
    slug: "dj-inicial",
    name: "DJ — Nivel Inicial",
    tagline: "Arrancá desde cero",
    description:
      "Fundamentos de mezcla, beatmatching, lectura de pista y armado de sets sobre equipamiento Pioneer DJ profesional.",
    duration: "3 meses · 2 clases semanales",
    modality: "Presencial — sede Pilar",
    price: "Desde $85.000/mes",
    highlights: ["CDJ-3000 y mixer DJM", "Grupos reducidos", "Práctica libre incluida"],
    image: "/images/estudio/equipos.jpg",
    level: 30,
    levelLabel: "Nivel · desde cero",
  },
  {
    slug: "dj-avanzado",
    name: "DJ — Nivel Avanzado",
    tagline: "Llevá tus sets al próximo nivel",
    description:
      "Técnicas avanzadas de mezcla armónica, efectos, looping en vivo y armado de sets para eventos reales.",
    duration: "4 meses · 2 clases semanales",
    modality: "Presencial — sede Pilar",
    price: "Desde $95.000/mes",
    highlights: ["Mezcla armónica", "Práctica en cabina real", "Showcase final"],
    image: "/images/estudio/sala-mastering.jpg",
    level: 65,
    levelLabel: "Nivel · requiere base",
  },
  {
    slug: "produccion-musical",
    name: "Producción Musical Electrónica",
    tagline: "De la idea al track terminado",
    description:
      "Diseño de sonido, arreglo y mezcla en DAW. Terminá el programa con un EP propio listo para mastering.",
    duration: "6 meses · 2 clases semanales",
    modality: "Presencial — sede Pilar",
    price: "Desde $110.000/mes",
    highlights: ["Ableton Live", "Diseño de sonido", "EP final incluido"],
    image: "/images/estudio/team.jpg",
    level: 85,
    levelLabel: "Nivel · el más extenso",
  },
  {
    slug: "mix-mastering",
    name: "Mix & Mastering",
    tagline: "Sonido de nivel profesional",
    description:
      "Curso intensivo de mezcla y masterización en nuestra sala tratada acústicamente, pensado para productores que ya tienen tracks propios.",
    duration: "2 meses · 1 clase semanal",
    modality: "Presencial — sede Pilar",
    price: "Desde $70.000/mes",
    highlights: ["Sala tratada acústicamente", "Referencia en monitores profesionales", "1 track masterizado incluido"],
    image: "/images/estudio/sala-mastering.jpg",
    level: 50,
    levelLabel: "Nivel · para productores activos",
  },
];
