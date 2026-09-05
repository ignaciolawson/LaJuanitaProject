/**
 * Las frases del Inicio.
 *
 * **La regla es la misma que gobierna `data/business.ts` en la landing: acá
 * sólo entra lo verificado.** Y por el mismo motivo, que allá está escrito con
 * todas las letras: una frase inventada y firmada con el nombre de una persona
 * real no es un detalle de contenido, es ponerle en la boca algo que no dijo.
 * Este proyecto ya tiene ese problema abierto en otro lado —las seis notas del
 * blog están firmadas con los nombres de Ghezz, Najles y Chapa Castelo, y
 * figuran en `docs/pendientes.md` como bloqueante para publicar—. No se repite
 * acá.
 *
 * ⚠️ **La regla la sostiene el TIPO, no la buena memoria de quien edite.** Una
 * cita atribuida exige `fuente`, así que agregar una sin link no compila. Es
 * deliberado: un comentario que pide fuentes se ignora, un tipo no.
 *
 * Las dos formas:
 *
 * - `cita` — dicho por alguien de afuera. Exige autor **y** una URL donde se
 *   pueda ir a verificar. Si no la encontrás, la frase no entra.
 * - `casa` — voz de La Juanita. **No lleva campo `autor` y sin embargo se firma**:
 *   la pantalla escribe "La Juanita" para todo este tipo, porque la atribución es
 *   una propiedad del tipo y no de cada fila. Ponerla acá serían trece copias del
 *   mismo string, o sea trece lugares donde puede quedar distinta. Va sin link
 *   porque no hay fuente que ir a chequear, que es exactamente lo que separa a los
 *   dos tipos. ⚠️ Estas son **placeholder** hasta que las confirme el cliente,
 *   igual que el resto de la copia larga de la landing.
 *
 * ⚠️ **Las traducciones son nuestras.** Cuando el original es en inglés, el
 * texto que se muestra es una traducción de la casa y el sentido es literal: la
 * `fuente` lleva al original para que cualquiera pueda comparar. Las tres de
 * Hernán Cattáneo no se traducen — las dijo en castellano.
 *
 * ⚠️ **EL ORDEN NO ES DECORATIVO.** `fraseDelDia` avanza de a una por día, así
 * que **dos frases pegadas en este arreglo son dos días seguidos**: si las tres
 * de Kerri Chandler estuvieran juntas, el Inicio mostraría al mismo tipo tres
 * días en fila, que es exactamente lo contrario de la variedad que se buscaba.
 * Están intercaladas para que ningún autor aparezca dos veces seguidas. **Si
 * agregás una cita, fijate dónde la ponés** — no la pegues al final junto a otra
 * del mismo autor.
 *
 * ⚠️ **Estado de §13 · A1 (2026-09-01).** Ignacio pidió *"muchas frases reales
 * de dj y poner quién lo dijo, tampoco tener 365"*. Se pasó de **14 frases a
 * 29**: las citas fueron de **2 a 17**, de **diez personas distintas**.
 *
 * **Lo que sigue siendo cierto es de dónde salen**: una cita no se puede
 * escribir, hay que ir a buscarla. Cada una de estas se leyó en su página —no en
 * el resumen del buscador, que parafrasea— y se copió palabra por palabra. Ése
 * es el cuello de botella del que hablaba §12 · A5, y no lo destraba el código:
 * agregar la número dieciocho es trabajo de búsqueda.
 *
 * El techo no es el código: `fraseDelDia` no tiene tope.
 */
export type Frase =
  | { tipo: 'cita'; texto: string; autor: string; fuente: string }
  | { tipo: 'casa'; texto: string }

const DJMAG_CHANDLER =
  'https://djmag.com/content/kerri-chandler-i%E2%80%99ve-never-tried-copy-anyone%E2%80%99s-style-never-tried-be-anyone-else-me'
const DJMAG_HONEY =
  'https://djmag.com/features/honey-dijon-i-want-people-feel-they-stepped-another-world'
const EL_DIARIO_CATTANEO =
  'https://www.eldiarioar.com/sociedad/hernan-cattaneo-identidad-antialgoritmo_130_8077539.html'
const DJTECHTOOLS_ALLIEN =
  'https://djtechtools.com/2020/11/13/interview-ellen-allien-shares-a-great-dj-mixes-the-people-into-a-dream/'

export const FRASES: Frase[] = [
  {
    tipo: 'cita',
    texto:
      'Siempre me mantuve curioso. Me divierto mucho. Escucho mucho. No actúo como si supiera todo, porque no lo sé.',
    autor: 'Kerri Chandler',
    fuente: DJMAG_CHANDLER,
  },
  {
    tipo: 'cita',
    texto: 'Trato de liderar, no de seguir. Trato de no ceder.',
    autor: 'Carl Cox',
    fuente: 'https://djmag.com/news/carl-cox-speaks-out-how-make-it-dj',
  },
  {
    tipo: 'cita',
    // Las tres de Cattáneo van sin traducir: las dijo así.
    texto: 'Pasar música sin gente es como jugar al tenis solo.',
    autor: 'Hernán Cattáneo',
    fuente: EL_DIARIO_CATTANEO,
  },
  {
    tipo: 'cita',
    texto:
      'Para mí se trata de contar una historia, de emoción, de tensión. No tocás igual a las dos que a las seis.',
    autor: 'Honey Dijon',
    fuente: DJMAG_HONEY,
  },
  {
    tipo: 'cita',
    // La que mejor le queda a una escuela: el que sabe no se guarda nada.
    texto:
      'A los que vienen atrás les muestro cómo hago muchas de las cosas que hago. No tengo ningún problema en pasar lo que sé.',
    autor: 'Kerri Chandler',
    fuente: DJMAG_CHANDLER,
  },
  {
    tipo: 'cita',
    texto: 'Un gran DJ es más creativo: mezcla a la gente adentro de un sueño.',
    autor: 'Ellen Allien',
    fuente: DJTECHTOOLS_ALLIEN,
  },
  {
    tipo: 'cita',
    texto: 'Lo que me salvó fue la pasión y ser cabeza dura.',
    autor: 'Hernán Cattáneo',
    fuente:
      'https://www.lanacion.com.ar/espectaculos/musica/hernan-cattaneo-su-regreso-a-buenos-aires-la-frase-historica-de-pappo-sobre-los-dj-y-la-pasion-que-nid18032026/',
  },
  {
    tipo: 'cita',
    texto:
      'Cuando ves a un DJ tocando sin sonreír, no está cómodo y está pensando de más. Está tratando de armar el set perfecto, y el set perfecto no existe.',
    autor: 'Carl Cox',
    fuente:
      'https://6amgroup.com/articles/all/in-interview-chef-carl-cox-cooks-up-industry-wisdom-and-dj-advice',
  },
  {
    tipo: 'cita',
    texto:
      'El día que no lo disfrute como la primera vez que puse un disco en una bandeja, tengo que parar.',
    autor: 'Kerri Chandler',
    fuente: DJMAG_CHANDLER,
  },
  {
    tipo: 'cita',
    texto: 'Si hay algo que puedo aprender de Larry Levan es a conocer tu equipo y el sonido.',
    autor: 'Honey Dijon',
    fuente: DJMAG_HONEY,
  },
  {
    tipo: 'cita',
    texto: 'La identidad es antialgoritmo.',
    autor: 'Hernán Cattáneo',
    fuente: EL_DIARIO_CATTANEO,
  },
  {
    tipo: 'cita',
    texto: 'Lo importante es encontrar tu estilo y sostenerlo bien alto. No copies la copia.',
    autor: 'Ellen Allien',
    fuente: DJTECHTOOLS_ALLIEN,
  },
  {
    tipo: 'cita',
    texto: 'El house es la venganza de la disco.',
    autor: 'Frankie Knuckles',
    fuente: 'https://en.wikipedia.org/wiki/Disco%27s_Revenge',
  },
  {
    tipo: 'cita',
    // Es la mejor frase que puede leer alguien que está aprendiendo a mezclar:
    // la dice uno de los mejores del mundo y dice que se equivoca todas las
    // noches.
    texto:
      'Me equivoco mezclando casi todas las noches. Con el tiempo uno se vuelve mejor para resolverlo y seguir, y que nadie se dé cuenta.',
    autor: 'Jeff Mills',
    fuente:
      'https://www.hkclubbing.com/articles/interviews/jeff-mills-interview-i-make-mixing-mistakes-almost-every-night.html',
  },
  {
    tipo: 'cita',
    texto: 'Si sólo tocara clásicos, me sentiría una máquina de discos.',
    autor: 'Laurent Garnier',
    fuente: 'https://mixmag.asia/feature/laurent-garnier-interview-dj-film-off-the-record-france',
  },
  {
    tipo: 'cita',
    texto: 'Pasar música te recorre desde la punta de los pies hasta la cabeza.',
    autor: 'Jackmaster',
    fuente: 'https://djmag.com/content/jackmaster-djing-gives-you-rush-tip-your-toes-right-your-head',
  },
  {
    tipo: 'cita',
    texto:
      'Si tratás de sonar como otro, vas a estar persiguiéndote la cola y sintiendo que no alcanzás.',
    autor: 'Jayda G',
    fuente: 'https://musictech.com/features/interviews/jayda-g-studio-interview-guy/',
  },
  {
    tipo: 'casa',
    texto: 'Una hora de cabina rinde más que tres de tutoriales.',
  },
  {
    tipo: 'casa',
    texto: 'El set que te sale sin pensar es el que ensayaste cincuenta veces.',
  },
  {
    tipo: 'casa',
    texto: 'Nadie se acuerda de la mezcla perfecta. Se acuerdan de cómo los dejaste.',
  },
  {
    tipo: 'casa',
    texto: 'La pista te contesta enseguida: si mirás para abajo, la perdiste.',
  },
  {
    tipo: 'casa',
    texto: 'Antes de agregar otra capa, fijate qué le sacarías.',
  },
  {
    tipo: 'casa',
    texto: 'Un tema termina cuando lo escuchás en el auto y no querés tocar nada.',
  },
  {
    tipo: 'casa',
    texto: 'El equipo caro no arregla una selección floja.',
  },
  {
    tipo: 'casa',
    texto: 'Guardá el proyecto con fecha. Tu yo de la semana que viene te lo agradece.',
  },
  {
    tipo: 'casa',
    texto: 'Escuchá el tema entero antes de meterlo en el set: el final también existe.',
  },
  {
    tipo: 'casa',
    texto: 'Bajá el volumen. Si sigue sonando bien, está bien mezclado.',
  },
  {
    tipo: 'casa',
    texto: 'Se aprende a mezclar mezclando mal, muchas veces, con alguien al lado.',
  },
  {
    tipo: 'casa',
    texto: 'El silencio también es un recurso, y es el que menos se usa.',
  },
]

/**
 * La frase del día.
 *
 * **Rota por fecha y no al azar**, y ésa es toda la decisión. Con `Math.random`
 * la frase cambia en cada render —al navegar entre pantallas y al volver al
 * Inicio—, y una frase que parpadea deja de leerse: pasa a ser un elemento que
 * se mueve. Con la fecha, es la misma frase durante todo el día para toda la
 * gente, que además es lo que la vuelve algo de lo que se puede hablar.
 *
 * Y por eso mismo es testeable: dada una fecha, la frase es una sola.
 */
export function fraseDelDia(fecha: string): Frase {
  // La fecha llega como `YYYY-MM-DD`, así que los dígitos alcanzan: no hace
  // falta construir un Date ni pensar en zonas horarias, que es de donde salen
  // los errores de "un día antes" que la landing ya documentó.
  const semilla = Number(fecha.replaceAll('-', ''))
  return FRASES[semilla % FRASES.length]
}
