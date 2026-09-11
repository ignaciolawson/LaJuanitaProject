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
 * ── Y DE DOS A TRES: LA MENTORÍA (2026-09-11, `mejoras.md` §16 · A7) ──
 *
 * `grep -i mentor` sobre toda la landing daba CERO coincidencias mientras el
 * sistema la tenía como disciplina desde `V1` y la inscribía. La copia sale de
 * P67, textual de Ignacio: *"charlas mano a mano con algún DJ que te aconseja,
 * te explica… te hace de mentor para tu carrera de DJ. Duración 1:30, formato
 * virtual o presencial, apunta a DJs que ya tienen recorrido y están
 * estancados, precio a confirmar."* **El texto largo es a validar como toda la
 * copia larga**; lo que NO es placeholder es el formato (sesiones de 1:30), el
 * público (quien ya toca) y que el precio no existe todavía (P63: se cobra por
 * sesión, y la lista de precios llega con `V28`).
 *
 * No es un curso y por eso no tiene cantidad de clases: el sistema rechaza
 * adivinarle un estándar (P34, P65) y acá tampoco se inventa uno. Y tiene
 * **formulario propio** (`cta: "mentoring"`): a alguien que ya toca no se le
 * pregunta si arranca de cero.
 *
 * Cada programa tiene página propia (`/programas/[slug]`) con el detalle
 * largo: qué es, por qué acá, para quién, temario y formulario.
 */

import type { Disciplina } from "@/lib/api";

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
  /**
   * Salvedad del precio, y NO es opcional.
   *
   * Los dos servicios de `services.ts` la tenían desde el principio y los dos
   * programas no, que son las decisiones de plata más grandes del catálogo:
   * el número chico estaba protegido y el grande no. §13 confirmó que los
   * precios de la landing se publican **como referencia**, no cerrados, hasta
   * que se validen uno por uno.
   */
  priceNote: string;
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
   * `apply` abre el formulario de solicitud de un curso; `mentoring` abre el
   * de la mentoría, que pregunta otra cosa (P67: *"el suyo"*); `consult` manda
   * a contacto.
   *
   * `consult` queda para el caso de un programa a medida o con cupo de sala,
   * donde pedir los mismos datos que en uno con fecha de arranque no tendría
   * sentido. Hoy ninguno lo usa.
   */
  cta: "apply" | "mentoring" | "consult";
  /**
   * Cómo se llama este programa **en el sistema**: es lo que el formulario
   * manda como `disciplina` (`V29`) para que el buzón sepa qué inscribir sin
   * parsear el nombre de marketing. Los tres valores son los del CHECK de
   * `inscripcion` y `programa`; el tipo vive en `lib/api.ts`.
   */
  disciplina: Disciplina;
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
    priceNote: "Precio de referencia — se confirma al inscribirte",
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
    disciplina: "DJ",
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
    priceNote: "Precio de referencia — se confirma al inscribirte",
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
    disciplina: "PRODUCCION",
  },
  {
    slug: "mentoria",
    name: "Mentoría para DJs",
    shortName: "Mentoría",
    tagline: "Mano a mano con alguien que ya pasó por ahí",
    description:
      "Charlas uno a uno con un DJ de la casa que te aconseja, te explica y te hace de mentor para tu carrera. Para quien ya toca y siente que se estancó.",
    // Sin cantidad de sesiones a propósito: no es un curso con un estándar de
    // clases (P65), se coordina según lo que cada uno necesite.
    duration: "Sesiones de 1:30 · las que necesites",
    modality: "Presencial en Pilar o virtual",
    price: "A confirmar",
    priceNote: "Se cobra por sesión — el precio se confirma al coordinar",
    highlights: ["Uno a uno", "Para DJs con recorrido", "Presencial o virtual"],
    image: "/images/estudio/sala-mastering.jpg",
    level: 100,
    levelLabel: "Para quien ya toca",
    intro: [
      "No es un curso: es sentarte una hora y media con alguien que ya tocó en los lugares a los que querés llegar, y hablar de vos. De tu set, de tus grabaciones, de cómo te estás moviendo y de por qué sentís que no avanzás.",
      "Está pensada para el momento que casi todos los DJs atraviesan: ya tocás, ya tenés algo de recorrido, y sin embargo estás en el mismo lugar hace un año. Ahí un tutorial no ayuda. Lo que ayuda es que alguien mire lo que hacés y te diga qué cambiaría.",
      "Cada sesión se arma alrededor de lo que traés. Podés venir con un set grabado, con dudas de sonido, con preguntas sobre cómo conseguir fechas o con las tres cosas juntas. Se coordina una sesión, y después las que hagan falta.",
    ],
    reasons: [
      {
        title: "Es sobre vos, no sobre un temario",
        detail:
          "No hay un programa que seguir. Lo que se trabaja en cada sesión sale de tu material y de lo que querés destrabar.",
      },
      {
        title: "Mentores que están en fecha",
        detail:
          "Los DJs de la casa tocan y publican hoy. Los consejos vienen de lo que les pasa a ellos ahora, no de lo que les pasaba hace diez años.",
      },
      {
        title: "Una sesión a la vez",
        detail:
          "No hay paquete que comprar de antemano. Arrancás con una sesión y seguís si te sirvió.",
      },
      {
        title: "Presencial o virtual",
        detail:
          "En el estudio en Pilar, con el equipo a mano para mostrar lo que sea, o por videollamada si estás lejos.",
      },
    ],
    forWho: [
      "Tocás hace un tiempo y sentís que te estancaste.",
      "Tenés sets grabados y nadie con criterio que te los escuche.",
      "Conseguís alguna fecha suelta pero no sabés cómo pasar a la siguiente.",
      "Querés una opinión honesta de alguien que está tocando.",
    ],
    modules: [
      {
        title: "Dónde estás",
        detail: "Escuchamos tu material y repasamos cómo te venís moviendo. Sin diagnóstico previo: se arma en la charla.",
      },
      {
        title: "Qué destrabar",
        detail: "Sonido, selección, lectura de pista, cómo te presentás, cómo buscás fechas. Lo que haga falta.",
      },
      {
        title: "Qué hacer esta semana",
        detail: "Salís con cosas concretas para probar antes de la próxima, si hay próxima.",
      },
    ],
    outcomes: [
      "Una mirada externa con criterio sobre lo que hacés.",
      "Un plan concreto para las semanas que siguen.",
      "Contacto directo con un DJ de la casa.",
    ],
    cta: "mentoring",
    disciplina: "MENTORIA",
  },
];

export function getProgram(slug: string) {
  return PROGRAMS.find((p) => p.slug === slug);
}
