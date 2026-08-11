/**
 * Blog — contenido placeholder.
 *
 * TODO todos los textos de este archivo los escribió el equipo de desarrollo
 * para poder maquetar. Ninguna nota es del cliente. Antes de publicar hay que
 * reemplazarlas o borrarlas: publicar consejos técnicos firmados por los
 * profesores sin que ellos los hayan escrito es peor que tener el blog vacío.
 *
 * ── Por qué el cuerpo es un array de bloques y no un string de markdown ──
 *
 * El plan es que el equipo cargue las notas desde un CMS (Sanity o similar).
 * Sanity guarda el texto enriquecido como Portable Text: un array de bloques
 * tipados, no HTML ni markdown. `PostBlock` está modelado con esa forma a
 * propósito, así que migrar es reemplazar este módulo por un fetch y mapear
 * `_type` → `type`; `PostBody` no se toca.
 *
 * Si esto fuera un string de markdown habría que meter un parser, sanitizarlo,
 * y encima perderíamos los bloques que no son texto (el embed de video, que es
 * justamente el formato que el equipo quiere publicar).
 */

export type PostCategory = "tecnica" | "cultura" | "casa";

export const CATEGORY_LABEL: Record<PostCategory, string> = {
  tecnica: "Técnica",
  cultura: "Cultura",
  casa: "De la casa",
};

export type PostBlock =
  /** Párrafo. */
  | { type: "text"; text: string }
  /** Subtítulo dentro de la nota (h2). */
  | { type: "heading"; text: string }
  /** Lista simple con viñeta. */
  | { type: "list"; items: string[] }
  /** Lista numerada con título y detalle — el formato "Top 5". */
  | { type: "ranked"; items: { title: string; text: string }[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "image"; src: string; caption?: string }
  /**
   * Video o track embebido. `id` vacío = todavía no hay video cargado: se
   * renderiza una placa neutra en vez de un iframe roto (ver `PostBody`).
   * YouTube: el ID de 11 caracteres. Spotify: `track/xxx`, `album/xxx`, etc.
   */
  | { type: "embed"; provider: "youtube" | "spotify"; id: string; title: string };

export type Post = {
  slug: string;
  title: string;
  /** Bajada. Se usa en la tarjeta, en el hero y como meta description. */
  excerpt: string;
  category: PostCategory;
  author: string;
  /** ISO `YYYY-MM-DD`. Se ordena y se formatea con esto — ver `formatPostDate`. */
  date: string;
  cover: string;
  body: PostBlock[];
};

/** Notas, de la más nueva a la más vieja. `POSTS` ya sale ordenado. */
const ENTRIES: Post[] = [
  {
    slug: "top-5-efectos-para-tus-sets",
    title: "Top 5 efectos para tus sets",
    excerpt:
      "Los cinco efectos que más se usan arriba de la cabina, para qué sirve cada uno y en qué momento del tema conviene meterlos.",
    category: "tecnica",
    author: "Ghezz",
    date: "2026-08-05",
    cover: "/images/estudio/equipos.jpg",
    body: [
      {
        type: "text",
        text: "Los efectos son la parte del equipo que más se toca y la que peor se usa. La mayoría de los sets que escuchamos en clase tienen el mismo problema: el efecto está puesto para tapar algo, no para construir algo. Esta es la lista de los cinco que más sacamos en la cabina, con el criterio de cuándo entra cada uno.",
      },
      {
        type: "ranked",
        items: [
          {
            title: "Filtro pasa-altos",
            text: "El más obvio y el más maltratado. Sirve para sacar el cuerpo de un tema y dejarlo flotando arriba, no para arreglar una mezcla que choca en los graves. Si lo estás usando para que dos temas no se peleen, el problema es la selección, no el filtro.",
          },
          {
            title: "Echo / delay",
            text: "El que te salva la salida. Un echo de 1/4 sobre el último golpe del tema que se va te deja tiempo para acomodar el que entra sin que el silencio se note. Cortá el fader mientras el echo todavía suena, nunca después.",
          },
          {
            title: "Reverb",
            text: "El que más rápido ensucia todo. Va en momentos concretos, casi siempre sobre un elemento solo: un vocal, un clap, el final de una frase. Reverb sobre el tema entero es niebla.",
          },
          {
            title: "Roll",
            text: "Repite un pedazo del tema en loop cada vez más corto. Genera tensión sin subir volumen, que es exactamente lo que necesitás antes de un drop cuando ya estás arriba de todo.",
          },
          {
            title: "Noise / ruido blanco",
            text: "El más peligroso. Funciona una vez por set y solo si el resto del set no lo usó. Es un recurso de transición grande, no un condimento.",
          },
        ],
      },
      {
        type: "heading",
        text: "La regla que ordena todo",
      },
      {
        type: "text",
        text: "Un efecto por vez. Si querés meter un segundo, sacá el primero. La cabina te deja encadenar tres y suena tentador, pero lo que llega a la pista es una masa donde no se entiende qué está pasando. Cuando escuchás un set que te parece limpio, casi siempre es porque hay menos cosas prendidas, no más.",
      },
      {
        type: "quote",
        text: "Si el efecto no lo puede notar alguien que está bailando de espaldas a la cabina, no está haciendo nada.",
        attribution: "Ghezz",
      },
      {
        type: "embed",
        provider: "youtube",
        id: "",
        title: "Los cinco efectos en la cabina, uno por uno",
      },
      {
        type: "text",
        text: "Si querés practicarlos sobre el equipo real, la cabina se alquila por hora y podés venir a probar sin clase de por medio.",
      },
    ],
  },
  {
    slug: "sidechain-por-que-todo-suena-mejor",
    title: "Sidechain: por qué todo suena mejor con él",
    excerpt:
      "El truco de producción más viejo de la electrónica, explicado sin jerga: qué hace, por qué le da aire a la mezcla y cómo saber cuándo te pasaste.",
    category: "tecnica",
    author: "Najles",
    date: "2026-07-22",
    cover: "/images/estudio/sala-mastering.jpg",
    body: [
      {
        type: "text",
        text: "Sidechain es, en criollo, bajarle el volumen a una cosa cada vez que suena otra. En la electrónica se usa casi siempre igual: el bombo le baja el volumen a todo lo demás durante el golpe. El resultado es que el bombo se escucha limpio y el resto respira alrededor.",
      },
      {
        type: "heading",
        text: "Por qué hace falta",
      },
      {
        type: "text",
        text: "El bombo y el bajo viven en la misma zona de frecuencias. Cuando suenan juntos se suman y esa suma es lo que hace que la mezcla se escuche embarrada y que el bombo pierda pegada. Podrías resolverlo con ecualización, pero perdés cuerpo. El sidechain resuelve lo mismo en el tiempo en vez de en la frecuencia: no le sacás graves al bajo, le sacás graves solo durante los milisegundos en que suena el bombo.",
      },
      {
        type: "list",
        items: [
          "Empezá con un ratio de 4:1 y ataque lo más rápido que te permita el compresor.",
          "El release es el control que importa: tiene que soltar justo antes del próximo golpe.",
          "Si escuchás el efecto como un latido, ya te pasaste. Bajá el amount hasta que deje de ser audible como efecto.",
        ],
      },
      {
        type: "quote",
        text: "Un buen sidechain no se escucha, se extraña cuando lo sacás.",
      },
      {
        type: "text",
        text: "La prueba final es simple: apagalo y prendelo mientras suena el tema. Si al apagarlo la mezcla se cierra, está bien puesto. Si al prenderlo el tema empieza a bombear como si respirara, es demasiado.",
      },
    ],
  },
  {
    slug: "escena-electronica-zona-norte",
    title: "La escena electrónica de zona norte, en 2026",
    excerpt:
      "Dónde se está tocando, qué cambió desde la pandemia y por qué cada vez más fechas se arman fuera de Capital.",
    category: "cultura",
    author: "Equipo La Juanita",
    date: "2026-07-08",
    cover: "/images/espacio/tocando.jpg",
    body: [
      {
        type: "text",
        text: "Durante años, tocar en electrónica significaba tocar en Capital. Si vivías en Pilar, Escobar o Del Viso, la carrera era la misma para todos: viajar, esperar el horario que sobraba, volver a las siete de la mañana. Eso se está dando vuelta y no por nostalgia, sino por números.",
      },
      {
        type: "heading",
        text: "Qué cambió",
      },
      {
        type: "text",
        text: "Los espacios chicos de zona norte descubrieron que una fecha de electrónica bien producida les llena un jueves. No compiten con los clubes grandes: compiten con no pasar nada. Eso abrió una franja de fechas que antes no existía y que es, para alguien que recién arranca, el mejor lugar del mundo para aprender a leer una pista.",
      },
      {
        type: "image",
        src: "/images/espacio/GSet.jpg",
        caption: "Set en la sede de Pilar.",
      },
      {
        type: "heading",
        text: "Qué significa para vos si estás arrancando",
      },
      {
        type: "list",
        items: [
          "Hay más fechas disponibles, pero también más gente pidiéndolas.",
          "El horario de apertura dejó de ser un castigo: en un lugar chico es donde se define el tono de la noche.",
          "Un set grabado con registro audiovisual pesa más que un demo. Es lo primero que te van a pedir.",
        ],
      },
      {
        type: "text",
        text: "No es una escena consolidada todavía y conviene decirlo así. Es un momento donde hay lugar, que no es lo mismo que un momento donde hay carrera armada.",
      },
    ],
  },
  {
    slug: "armar-tu-primer-set-de-60-minutos",
    title: "Cómo armar tu primer set de 60 minutos",
    excerpt:
      "El paso que separa a alguien que mezcla dos temas de alguien que sostiene una hora: pensar el set como una curva y no como una playlist.",
    category: "tecnica",
    author: "Chapa Castelo",
    date: "2026-06-19",
    cover: "/images/espacio/sala-trabajo.jpg",
    body: [
      {
        type: "text",
        text: "Mezclar dos temas se aprende en un mes. Sostener una hora es otra cosa, y casi nadie lo practica hasta que lo tiene que hacer en vivo. La diferencia no está en la técnica: está en haber decidido de antemano hacia dónde va la hora.",
      },
      {
        type: "heading",
        text: "Pensalo en cuatro tramos",
      },
      {
        type: "ranked",
        items: [
          {
            title: "Los primeros diez minutos",
            text: "No son para lucirte. Son para instalar un pulso y dar tiempo a que la pista se llene. Temas con menos elementos, energía media, nada de golpes grandes.",
          },
          {
            title: "Del minuto 10 al 30",
            text: "Acá subís, pero de a poco y sin volver atrás. El error más común es meter el tema más fuerte que tenés en el minuto 15 y quedarte sin lugar para el resto.",
          },
          {
            title: "Del 30 al 50",
            text: "La zona alta. Es donde ponés lo que preparaste. Si llegaste hasta acá con la curva bien, casi cualquier cosa funciona.",
          },
          {
            title: "Los últimos diez",
            text: "Bajás o entregás. Si después de vos toca alguien, tu trabajo es dejarle la pista caliente y en un tempo que pueda tomar. Terminar con tu tema favorito y cortar es dejarle un problema.",
          },
        ],
      },
      {
        type: "heading",
        text: "Preparación real",
      },
      {
        type: "text",
        text: "Llevá el doble de temas de los que vas a usar, agrupados por energía y no por género. Y practicá la hora entera de una sentada, grabándola. La primera vez que la escuches vas a encontrar tres transiciones que en el momento te parecieron bien y no lo estaban: eso es exactamente lo que estás buscando.",
      },
      {
        type: "quote",
        text: "Nadie se acuerda de tu mejor mezcla. Se acuerdan de cómo se sintió la hora entera.",
      },
    ],
  },
  {
    slug: "nueva-sala-de-mastering",
    title: "Abrimos la sala de mix & mastering",
    excerpt:
      "Terminamos el acondicionamiento acústico de la sala nueva. Qué se puede hacer ahí y cómo se pide turno.",
    category: "casa",
    author: "Equipo La Juanita",
    date: "2026-05-30",
    cover: "/images/estudio/sala-mastering.jpg",
    body: [
      {
        type: "text",
        text: "Después de varios meses de obra terminamos la sala de mix & mastering. Era la pieza que nos faltaba: hasta ahora los alumnos producían acá y se llevaban el proyecto a terminar en otro lado, lo que en la práctica significaba terminarlo en auriculares.",
      },
      {
        type: "heading",
        text: "Qué hay",
      },
      {
        type: "list",
        items: [
          "Tratamiento acústico en las cuatro paredes y trampas de graves en las esquinas.",
          "Monitoreo de campo cercano calibrado para la sala.",
          "Puesto de trabajo para dos personas: el que masteriza y el que trajo el tema.",
        ],
      },
      {
        type: "text",
        text: "Ese último punto es el que más nos importaba. Mandar un tema por mail y recibirlo masterizado es un servicio; sentarte al lado y escuchar por qué se tomó cada decisión es una clase. La sala está armada para lo segundo.",
      },
      {
        type: "image",
        src: "/images/espacio/lounge.jpg",
        caption: "El lounge, camino a la sala nueva.",
      },
      {
        type: "text",
        text: "Los turnos se coordinan por WhatsApp o por el formulario de contacto. El programa de Mix & Mastering se arma a medida según el material, así que arranca siempre por una charla.",
      },
    ],
  },
  {
    slug: "cinco-discos-techno-melodico",
    title: "Cinco discos para entender el techno melódico",
    excerpt:
      "No es una lista de los mejores: son los cinco que mejor explican de dónde salió el sonido que hoy suena en todos lados.",
    category: "cultura",
    author: "Ghezz",
    date: "2026-05-12",
    cover: "/images/artistas/ghezz.webp",
    body: [
      {
        type: "text",
        text: "Cada vez que alguien entra al programa de producción y dice que quiere hacer techno melódico, la pregunta que sigue es de dónde sacó la referencia. Casi siempre la respuesta es un set de festival de los últimos dos años. Está bien como punto de partida, pero deja afuera veinte años de decisiones que explican por qué ese sonido suena así.",
      },
      {
        type: "text",
        text: "Esta lista es placeholder y hay que reemplazarla por la selección real del equipo antes de publicar: son recomendaciones firmadas, no relleno.",
      },
      {
        type: "embed",
        provider: "spotify",
        id: "",
        title: "Selección de La Juanita Records",
      },
      {
        type: "text",
        text: "Si querés que te armemos una lista de escucha según lo que estás produciendo, escribinos: es la parte del programa que más rinde y la que menos gente pide.",
      },
    ],
  },
];

export const POSTS: Post[] = [...ENTRIES].sort((a, b) => b.date.localeCompare(a.date));

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** Las otras notas, más nuevas primero. Para el bloque "Seguí leyendo". */
export function getRelatedPosts(slug: string, limit = 3): Post[] {
  const current = getPost(slug);
  if (!current) return POSTS.slice(0, limit);

  // Primero las de la misma categoría; después se completa con el resto, para
  // que el bloque no quede corto cuando una categoría tiene una sola nota.
  const others = POSTS.filter((p) => p.slug !== slug);
  const sameCategory = others.filter((p) => p.category === current.category);
  const rest = others.filter((p) => p.category !== current.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

/**
 * Fecha larga en castellano.
 *
 * Va con `timeZone: "UTC"` a propósito: `new Date("2026-08-05")` se parsea como
 * medianoche UTC, y formateado en la zona de Buenos Aires (UTC-3) eso cae el
 * día anterior. Sin esto toda nota se publica un día antes de su fecha.
 */
export function formatPostDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Minutos de lectura, redondeados para arriba. 200 palabras por minuto. */
export function readingMinutes(post: Post): number {
  const words = post.body.reduce((total, block) => {
    switch (block.type) {
      case "text":
      case "heading":
      case "quote":
        return total + block.text.split(/\s+/).length;
      case "list":
        return total + block.items.join(" ").split(/\s+/).length;
      case "ranked":
        return (
          total +
          block.items.map((i) => `${i.title} ${i.text}`).join(" ").split(/\s+/).length
        );
      default:
        return total;
    }
  }, 0);

  return Math.max(1, Math.ceil(words / 200));
}
