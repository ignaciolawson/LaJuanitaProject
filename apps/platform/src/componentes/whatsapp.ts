/**
 * Escribirle por WhatsApp desde el sistema.
 *
 * ⚠️ **Esto NO es la WhatsApp Business API.** Esa está fuera de alcance a
 * propósito —es el fast-follow de mayor valor después de la entrega— y sigue
 * estándolo. Un `wa.me/…` es **una URL**: abre el chat con el mensaje escrito y
 * ahí termina. No hay integración, ni credenciales, ni servicio que se pueda caer.
 *
 * Existe porque el sistema sabe el número **y** sabe el mensaje —a quién saluda,
 * qué pidió esa persona, cuál es su contraseña temporal— y hasta hoy le hacía
 * tipear las dos cosas a quien atiende. Con la contraseña eso no es una molestia
 * sino un error: **no se puede volver a ver**, así que un dígito mal copiado es
 * alguien que no entra y vuelve a escribir preguntando por qué.
 */

/** Argentina (54) + el 9 que WhatsApp exige para los móviles. */
const MOVIL_ARGENTINO = '549'

/**
 * El número en la forma que WhatsApp entiende, o `null` si no se puede afirmar.
 *
 * ⚠️ **Devolver `null` es la mitad importante de esta función.** Un `wa.me` mal
 * armado no falla en silencio: abre WhatsApp diciendo *"número no válido"*, que
 * es **peor** que no ofrecer el botón — parece que el sistema hizo algo y encima
 * manda a quien atiende a un callejón. Así que acá sólo se contesta cuando el
 * número es inequívoco; con la duda, la pantalla muestra el número grande para
 * copiar y no ofrece el link.
 *
 * `telefono` es texto libre desde `V20` —lo escribe quien llena el formulario de
 * la web— así que llega de seis maneras distintas: `11 5555-5555`,
 * `011 15 5555-5555`, `+54 9 11 5555 5555`, `1155555555`. Todas menos la
 * ambigua se resuelven acá.
 */
export function numeroParaWhatsapp(telefono: string | null | undefined): string | null {
  if (!telefono) {
    return null
  }

  let digitos = telefono.replace(/\D/g, '')
  if (digitos === '') {
    return null
  }

  // El prefijo internacional escrito a la vieja usanza.
  if (digitos.startsWith('00')) {
    digitos = digitos.slice(2)
  }

  // Ya viene con país: se le saca, y también el 9 de móvil si está. Así el
  // número vuelve a la forma nacional y se valida con la misma vara que
  // cualquier otro, en vez de tener dos caminos que puedan discrepar.
  if (digitos.startsWith('54')) {
    digitos = digitos.slice(2)
    if (digitos.startsWith('9')) {
      digitos = digitos.slice(1)
    }
  }

  // El 0 de larga distancia.
  if (digitos.startsWith('0')) {
    digitos = digitos.slice(1)
  }

  digitos = sacarElQuince(digitos)

  // Un número argentino sin el 0 y sin el 15 son **exactamente diez dígitos**
  // (código de área + abonado). Cualquier otra cosa es algo que no sabemos leer,
  // y adivinar es justamente lo que no hay que hacer acá.
  return digitos.length === 10 ? MOVIL_ARGENTINO + digitos : null
}

/**
 * `11 15 5555-5555` → `11 5555-5555`.
 *
 * ⚠️ **Sólo cuando no hay ambigüedad, y por eso mira una ventana en vez de una
 * posición.** Los códigos de área argentinos tienen 2, 3 o 4 dígitos —`11` para
 * CABA y el conurbano, `230` para Pilar, que es donde está el estudio— así que el
 * `15` puede caer en tres lugares distintos y no hay forma de saber cuál sin una
 * tabla de códigos de área que habría que mantener.
 *
 * Lo que sí se puede afirmar: **si en esa ventana aparece una sola vez, no hay
 * duda de cuál es.** Con dos apariciones —o con ninguna— devuelve lo que le
 * dieron y el número termina sin link, que es la salida correcta.
 *
 * La aritmética que lo sostiene: con el `15` adentro son 12 dígitos, y sacarlo
 * tiene que dejar los 10 de siempre.
 */
function sacarElQuince(digitos: string): string {
  if (digitos.length !== 12) {
    return digitos
  }

  const posibles = [2, 3, 4].filter((desde) => digitos.slice(desde, desde + 2) === '15')
  if (posibles.length !== 1) {
    return digitos
  }

  const donde = posibles[0]
  return digitos.slice(0, donde) + digitos.slice(donde + 2)
}

/**
 * El link que abre el chat con el mensaje ya escrito, o `null` si el número no se
 * pudo leer.
 *
 * Quien lo llame tiene que contemplar el `null`: **no hay un link de descarte**.
 * Ver {@link numeroParaWhatsapp}.
 */
export function linkDeWhatsapp(
  telefono: string | null | undefined,
  mensaje: string,
): string | null {
  const numero = numeroParaWhatsapp(telefono)
  if (numero === null) {
    return null
  }
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}

/**
 * A dónde entra la persona. Sale de la configuración del build y no de una
 * constante escrita a mano: la plataforma vive en `/app` desde que comparte
 * origen con la landing, y ese valor ya está declarado una vez en `vite.config`.
 */
function dondeSeEntra(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  return window.location.origin + (import.meta.env.BASE_URL ?? '/')
}

/**
 * El primer contacto, para una ficha que nadie atendió todavía.
 *
 * **Nombra el servicio que la persona pidió**, que es justamente lo que quien
 * atiende tendría que ir a buscar a la ficha antes de escribir. No cierra nada ni
 * promete nada: es la puerta de la conversación, y sigue a mano.
 */
export function saludoDeContacto(nombre: string, queQuiere: string): string {
  return (
    `¡Hola ${nombre}! Te escribimos de La Juanita Studio por tu consulta ` +
    `sobre ${queQuiere.toLowerCase()}.`
  )
}

/**
 * El mensaje que lleva la contraseña temporal.
 *
 * **Éste es el que justifica todo el archivo.** La contraseña no se puede volver
 * a ver: si se tipea mal, la persona no entra, escribe de nuevo, y hay que
 * generarle otra desde Personas. Acá la escribe el sistema.
 *
 * Dice las tres cosas que evitan la repregunta —con qué mail entra, que se la va
 * a pedir cambiar, y que vence— porque cada una de ellas, sin decirla, es un
 * mensaje más de ida y vuelta.
 */
export function mensajeConLaClave(
  nombre: string,
  email: string,
  passwordTemporal: string,
): string {
  return [
    `¡Hola ${nombre}! Te creamos tu cuenta en La Juanita Studio para que puedas ` +
      'ver tus reservas y tus pagos.',
    '',
    `Entrás en ${dondeSeEntra()}`,
    `Usuario: ${email}`,
    `Contraseña: ${passwordTemporal}`,
    '',
    'Te la va a pedir cambiar la primera vez que entres, y vence a los 7 días.',
  ].join('\n')
}

/**
 * El mensaje de la cabina apartada.
 *
 * ⚠️ **Éste es el que cierra el circuito de la Fase 3**, y la razón es la misma
 * por la que existe `mensajeConLaClave`: el sistema sabe las cuatro cosas que hay
 * que decir —qué sala, cuándo, cuánto y hasta cuándo— y hasta ahora se las hacía
 * tipear a quien atiende, en el momento en que más caro sale equivocarse.
 *
 * **El plazo va sí o sí, y va escrito como fecha y hora.** Un *"te apartamos la
 * sala"* sin vencimiento deja tranquilo a quien lo lee sobre un horario que se
 * libera solo en 24 horas: es la peor forma de perder una venta, porque nadie se
 * entera hasta que ya pasó. Es la misma razón por la que la notificación del
 * sistema dice las dos cosas juntas.
 *
 * **No lleva la contraseña.** Son dos mensajes distintos a propósito: éste habla
 * de lo que hay que hacer ahora —abonar— y el otro de una cuenta que se puede
 * mirar cuando quiera. Juntos, el que importa se lee como un trámite más.
 */
export function mensajeDeCabinaApartada(
  nombre: string,
  sala: string,
  cuando: string,
  importe: string,
  vence: string,
): string {
  return [
    `¡Hola ${nombre}! Te apartamos ${sala} para el ${cuando}.`,
    '',
    `Para confirmarla hay que abonar ${importe} antes del ${vence}.`,
    'Pasado ese plazo el horario se libera.',
  ].join('\n')
}
