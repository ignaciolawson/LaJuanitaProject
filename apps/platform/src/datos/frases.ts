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
 * - `casa` — voz de La Juanita. No lleva autor porque no lo necesita: es la
 *   casa hablando. ⚠️ Estas son **placeholder** hasta que las confirme el
 *   cliente, igual que el resto de la copia larga de la landing.
 *
 * ⚠️ **Estado de §12 · A5, para que nadie lo dé por cerrado.** Ignacio pidió
 * volumen —*"armarnos un lugar en el repo para almacenar muchas e ir
 * poniéndolas"*—; el lugar ya existía y lo que faltaba eran frases. Son
 * catorce: **doce de la casa y sólo dos citas**, y esa proporción es el punto.
 * Las de la casa se pueden escribir acá porque la casa es el cliente y él las
 * confirma o las cambia; **una cita no se puede escribir, se tiene que ir a
 * buscar** — autor real, dicho real, y una URL donde verificarlo. Ése es el
 * cuello de botella que el §12 anticipó y sigue abierto: cada cita nueva es
 * trabajo de búsqueda, no de programación.
 *
 * Con catorce la rotación ya se nota (antes eran cuatro y la frase volvía cada
 * cuatro días). El techo no es el código: `fraseDelDia` no tiene tope.
 */
export type Frase =
  | { tipo: 'cita'; texto: string; autor: string; fuente: string }
  | { tipo: 'casa'; texto: string }

export const FRASES: Frase[] = [
  {
    tipo: 'cita',
    texto: 'El house es la venganza de la disco.',
    autor: 'Frankie Knuckles',
    fuente: 'https://en.wikipedia.org/wiki/Disco%27s_Revenge',
  },
  {
    tipo: 'cita',
    // La traducción es nuestra y el sentido es literal. Es la mejor frase que
    // puede leer alguien que está aprendiendo a mezclar: la dice uno de los
    // mejores del mundo y dice que se equivoca todas las noches.
    texto:
      'Me equivoco mezclando casi todas las noches. Con el tiempo uno se vuelve mejor para resolverlo y seguir, y que nadie se dé cuenta.',
    autor: 'Jeff Mills',
    fuente:
      'https://www.hkclubbing.com/articles/interviews/jeff-mills-interview-i-make-mixing-mistakes-almost-every-night.html',
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
