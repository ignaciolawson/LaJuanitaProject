/**
 * Contenido placeholder — reemplazar los textos largos por los definitivos.
 * El FORMATO ya no es placeholder: sale de `platform.md` §13 (2026-08-14).
 *
 * ── EL FORMATO, CONFIRMADO ──
 *
 * Cada clase dura 1:30 y va UNA VEZ POR SEMANA. DJ son 8 clases y Producción
 * Musical, 16. La landing publicaba 6 y 8 MESES con DOS clases semanales: no
 * era una imprecisión, era otro producto.
 *
 * **No hay fecha de fin garantizada, y por eso acá no se publican meses.**
 * Ninguna clase se pierde (P2): si falta el alumno o falta el profesor, se
 * recupera. El curso termina cuando se dictaron las clases contratadas, y eso
 * depende de cada alumno. Si en algún texto se mencionan meses, tiene que ser
 * como estimación y decirlo.
 *
 * ── UN PROGRAMA MENOS ──
 *
 * "Mix & Mastering" ya no está acá: **es un servicio, no un curso** (§13, P31).
 * La landing lo había inventado como programa de 3 meses, con página propia y
 * un `Course` de schema.org declarando instancias que se dictan. Sigue siendo
 * una línea real del negocio y aparece como servicio en el sitio y en el
 * `llms.txt` — lo que se fue es el curso.
 *
 * Pasamos de cuatro programas a tres, y de tres a dos: "DJ Inicial" y "DJ Avanzado" eran el
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
  /**
   * Si es `false`, la tarjeta del riel de la home va sin foto (la imagen
   * se sigue usando en `/programas` y en la página de detalle).
   *
   * Está sólo en Producción Musical: es la única de las tres cuya foto es
   * de gente, así que en la fila era la única que se leía como "una foto"
   * mientras las otras dos (primeros planos de equipo y de paneles
   * acústicos) pasan por textura. Encima era el bloque flexible de la
   * tarjeta, así que absorbía el sobrante y le desalineaba el pie.
   */
  cardImage?: boolean;
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
   *
   * Hoy los dos programas son `apply`. `consult` queda para el caso de un
   * programa a medida o con cupo de sala, donde pedir los mismos datos que en
   * uno con fecha de arranque no tendría sentido.
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
    duration: "8 clases · 1 por semana · 1:30 cada una",
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
    duration: "16 clases · 1 por semana · 1:30 cada una",
    modality: "Presencial en Pilar o virtual en vivo",
    price: "Desde $110.000/mes",
    highlights: ["Ableton Live", "Diseño de sonido", "EP final incluido"],
    image: "/images/estudio/team.jpg",
    cardImage: false,
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
];

export function getProgram(slug: string) {
  return PROGRAMS.find((p) => p.slug === slug);
}
