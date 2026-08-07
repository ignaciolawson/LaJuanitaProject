/**
 * Contenido placeholder — reemplazar los textos por los definitivos.
 *
 * Pasamos de cuatro programas a tres: "DJ Inicial" y "DJ Avanzado" eran el
 * mismo camino partido en dos y obligaban a la persona a autodiagnosticarse
 * el nivel antes de entender qué se enseña. Ahora es un solo programa
 * ("Convertite en DJ") y el nivel se resuelve dentro de la solicitud, con
 * la pregunta de experiencia previa.
 *
 * Cada programa tiene página propia (`/programas/[slug]`) con el detalle
 * largo: qué es, por qué acá, para quién, temario y formulario.
 */

export type ProgramModule = {
  title: string;
  detail: string;
};

export type Program = {
  slug: string;
  name: string;
  /** Nombre corto para navegación y tarjetas angostas. */
  shortName: string;
  tagline: string;
  description: string;
  duration: string;
  modality: string;
  price: string;
  highlights: string[];
  image: string;
  /** "Fader" decorativo (0–100) de la tarjeta — no es una métrica real. */
  level: number;
  levelLabel: string;

  // ── Contenido de la página de detalle ──
  intro: string[];
  reasons: { title: string; detail: string }[];
  forWho: string[];
  modules: ProgramModule[];
  outcomes: string[];
  /**
   * `apply` abre el formulario de solicitud; `consult` manda a contacto.
   * Mix & Mastering es a medida y con cupo de sala, así que pedir los mismos
   * datos que en un programa con fecha de arranque no tendría sentido.
   */
  cta: "apply" | "consult";
};

export const PROGRAMS: Program[] = [
  {
    slug: "convertite-en-dj",
    name: "Convertite en DJ",
    shortName: "DJ",
    tagline: "De no tocar nada a tener tu primer set",
    description:
      "El camino completo detrás de las bandejas: desde poner dos temas en tiempo hasta leer una pista y sostener una hora sin que se te caiga.",
    duration: "6 meses · 2 clases semanales",
    modality: "Presencial en Pilar o virtual en vivo",
    price: "Desde $85.000/mes",
    highlights: ["CDJ-3000 y mixer DJM", "Grupos reducidos", "Práctica libre incluida"],
    image: "/images/estudio/equipos.jpg",
    level: 55,
    levelLabel: "Desde cero hasta tocar",
    intro: [
      "Es un solo camino, no dos cursos separados. Arrancás donde estés: si nunca tocaste, empezamos por ahí; si ya venís mezclando en casa, salteamos lo que tenés resuelto y vamos directo a lo que te falta.",
      "La mitad del programa pasa con las manos en el equipo. No hay una hora de teoría y quince minutos de práctica: se aprende tocando, equivocándose y volviendo a empezar sobre las mismas CDJ-3000 que vas a encontrar en cualquier cabina.",
      "Y desde el primer mes trabajamos sobre lo que casi nadie enseña: qué hacer cuando la pista no responde. Elegir el tema siguiente, sostener la energía, salir de un momento incómodo. Eso es lo que separa a alguien que mezcla de alguien que toca.",
    ],
    reasons: [
      {
        title: "Equipo real, no simuladores",
        detail:
          "CDJ-3000 y mixers DJM, el estándar de cualquier club. Nada de aprender en un controlador que después no vas a volver a ver.",
      },
      {
        title: "Práctica libre incluida",
        detail:
          "Reservás cabina fuera del horario de clase sin costo extra mientras dure el programa. Tocar dos horas por semana no alcanza.",
      },
      {
        title: "Profes que están tocando",
        detail:
          "Los que dan clase están en fecha y publicando. Lo que te cuentan de una cabina lo vivieron el fin de semana pasado.",
      },
      {
        title: "Salida real",
        detail:
          "Cierre con showcase abierto y, si el material da, la puerta del sello abierta para publicar.",
      },
    ],
    forWho: [
      "Nunca tocaste y no sabés por dónde empezar.",
      "Mezclás en casa hace un tiempo y sentís que te estancaste solo.",
      "Ya tocás en algún lado pero te falta criterio para leer la pista.",
      "Producís y querés poder presentar tu propia música en vivo.",
    ],
    modules: [
      {
        title: "Fundamentos",
        detail: "Anatomía del equipo, estructura de un track, tiempo y fraseo. Tu primera mezcla.",
      },
      {
        title: "Beatmatching y control",
        detail: "Sincronía a oído, ecualización en la mezcla, transiciones limpias.",
      },
      {
        title: "Mezcla armónica",
        detail: "Tonalidades y camelot: por qué dos temas en tiempo pueden sonar mal juntos.",
      },
      {
        title: "Efectos y looping",
        detail: "FX del mixer, loops en vivo y hot cues. Recursos para construir, no para tapar.",
      },
      {
        title: "Lectura de pista",
        detail: "Curva de energía, selección en tiempo real, cómo levantar y cómo bajar.",
      },
      {
        title: "Set y showcase",
        detail: "Armado de un set propio de una hora y presentación en vivo ante público.",
      },
    ],
    outcomes: [
      "Un set propio de una hora, armado y tocado en vivo.",
      "Grabación de tu showcase para mandar a bookers.",
      "Manejo autónomo de CDJ y mixer en cualquier cabina.",
      "Criterio para elegir qué poner y cuándo.",
    ],
    cta: "apply",
  },
  {
    slug: "produccion-musical",
    name: "Producción Musical Electrónica",
    shortName: "Producción",
    tagline: "De la idea suelta al track terminado",
    description:
      "Diseño de sonido, arreglo y mezcla en DAW. Salís con un EP propio terminado y listo para masterizar.",
    duration: "8 meses · 2 clases semanales",
    modality: "Presencial en Pilar o virtual en vivo",
    price: "Desde $110.000/mes",
    highlights: ["Ableton Live", "Diseño de sonido", "EP final incluido"],
    image: "/images/estudio/team.jpg",
    level: 85,
    levelLabel: "El más extenso",
    intro: [
      "El problema de casi todo el que empieza a producir no es técnico: es que tiene cuarenta proyectos empezados y ninguno terminado. Este programa está armado alrededor de eso — todo lo que aprendés se aplica sobre tracks tuyos que avanzan mes a mes.",
      "Trabajamos en Ableton Live, pero lo que se enseña no es el software: es qué hace que un kick empuje, por qué un arreglo se cae en el minuto tres y cómo tomar la decisión de sacar en vez de agregar.",
      "Terminás con un EP propio. No con ejercicios sueltos ni con un proyecto de ejemplo: material tuyo, terminado, en condiciones de que alguien lo escuche.",
    ],
    reasons: [
      {
        title: "Terminás cosas",
        detail:
          "La estructura está pensada para que salgas con material cerrado, que es justo lo que no pasa aprendiendo solo con tutoriales.",
      },
      {
        title: "Escucha antes que plugins",
        detail:
          "Se enseña a decidir. La cadena de efectos importa mucho menos que saber qué le falta a lo que estás escuchando.",
      },
      {
        title: "Sala de referencia",
        detail:
          "Escuchás tus mezclas en una sala tratada. Es la diferencia entre creer que tu track está bien y saberlo.",
      },
      {
        title: "El sello atrás",
        detail:
          "Lo que produzcas tiene dónde salir: si el material está, se publica por La Juanita Records con distribución y arte.",
      },
    ],
    forWho: [
      "Tenés ideas pero no lográs terminar ningún track.",
      "Venís de tocar y querés producir tu propia música.",
      "Producís hace rato y no llegás al nivel de sonido que buscás.",
      "Querés publicar y no sabés qué te falta para estar listo.",
    ],
    modules: [
      { title: "El DAW y el flujo", detail: "Ableton Live a fondo, plantillas propias, organización." },
      { title: "Diseño de sonido", detail: "Síntesis, sampleo y procesado. Construir tus propios sonidos." },
      { title: "Ritmo y groove", detail: "Percusión y swing: por qué dos patrones iguales no suenan igual." },
      { title: "Armonía aplicada", detail: "Acordes, bajos y melodía para electrónica, sin partitura." },
      { title: "Arreglo y estructura", detail: "Tensión, liberación y el minuto tres. Dónde se cae un track." },
      { title: "Mezcla en el DAW", detail: "Balance, ecualización, dinámica y espacio dentro del proyecto." },
      { title: "Tu EP", detail: "Producción acompañada de tres tracks propios, de la idea al bounce final." },
    ],
    outcomes: [
      "Un EP propio de tres tracks terminados.",
      "Plantilla y flujo de trabajo propios en Ableton.",
      "Criterio de mezcla para seguir trabajando solo.",
      "Postulación al sello con material real.",
    ],
    cta: "apply",
  },
  {
    slug: "mix-mastering",
    name: "Mix & Mastering",
    shortName: "Mix & Mastering",
    tagline: "El último paso, hecho bien",
    description:
      "Intensivo de mezcla y masterización en sala tratada, para productores que ya tienen tracks propios y quieren que suenen a la par.",
    duration: "3 meses · 1 clase semanal",
    modality: "Presencial — sede Pilar",
    price: "A consultar",
    highlights: ["Sala tratada acústicamente", "Monitoreo profesional", "1 track masterizado"],
    image: "/images/estudio/sala-mastering.jpg",
    level: 70,
    levelLabel: "Para productores activos",
    intro: [
      "Este no es un programa para empezar. Es para el que ya produce, ya termina tracks, y se choca siempre con lo mismo: en los auriculares suena bien y en el auto o en el club se cae.",
      "Se trabaja sobre tu propio material en la sala de mastering, con monitoreo de referencia. Vas a escuchar por primera vez lo que tus mezclas realmente tienen, que suele ser bastante distinto de lo que creías.",
      "Es a medida y con cupo muy limitado, porque el tiempo de sala es finito. Por eso el arranque se coordina por consulta y no por inscripción abierta.",
    ],
    reasons: [
      {
        title: "Sala que no te miente",
        detail: "Tratamiento acústico y monitoreo de referencia. Sin eso, mezclar es adivinar con confianza.",
      },
      {
        title: "Sobre tu material",
        detail: "Se trabaja con tus tracks, no con stems de ejercicio. Lo que corregís queda corregido.",
      },
      {
        title: "Cupo muy reducido",
        detail: "Pocas personas por camada para que cada una tenga tiempo real de sala.",
      },
      {
        title: "Un track masterizado",
        detail: "Terminás con al menos un tema tuyo masterizado y listo para distribuir.",
      },
    ],
    forWho: [
      "Producís y terminás tracks, pero no llegás al volumen ni a la claridad que buscás.",
      "Tus mezclas cambian demasiado entre sistemas.",
      "Vas a publicar y querés entender qué le estás entregando a un mastering.",
      "Trabajás con música y necesitás profesionalizar tu salida.",
    ],
    modules: [
      { title: "Escucha crítica", detail: "Acústica, monitoreo y cómo entrenar el oído para decidir." },
      { title: "Ganancia y balance", detail: "El orden correcto antes de tocar un solo ecualizador." },
      { title: "Ecualización y dinámica", detail: "Compresión, saturación y control en la mezcla." },
      { title: "Profundidad y espacio", detail: "Reverb, delay y ubicación en el campo estéreo." },
      { title: "Mastering", detail: "Cadena, loudness real, targets de plataformas y entrega." },
    ],
    outcomes: [
      "Un track tuyo masterizado y listo para distribuir.",
      "Cadena de mastering propia, entendida y no copiada.",
      "Criterio de escucha crítica aplicable a todo lo que hagas después.",
    ],
    cta: "consult",
  },
];

export function getProgram(slug: string) {
  return PROGRAMS.find((p) => p.slug === slug);
}
