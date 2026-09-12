import { describe, expect, it } from 'vitest'

import {
  linkDeWhatsapp,
  mensajeConLaClave,
  mensajeDeCabinaApartada,
  mensajeDeInscripcion,
  numeroParaWhatsapp,
  saludoDeContacto,
} from './whatsapp'

/**
 * El número que se le manda a WhatsApp.
 *
 * **Esta suite existe por una asimetría: acá equivocarse no falla, miente.** Un
 * `wa.me` mal armado abre WhatsApp diciendo *"número no válido"*, o —peor— abre
 * el chat de otra persona. No hay excepción, no hay 409, no hay nada que avise:
 * quien atiende cree que escribió y del otro lado no llegó nadie.
 *
 * Por eso los casos vienen en dos mitades y la segunda pesa más que la primera:
 * las formas que **sí** se saben leer, y las que hay que **negarse** a adivinar.
 *
 * El teléfono es texto libre desde `V20` —lo tipea quien llena el formulario de
 * la web— así que las seis formas de abajo son las que realmente llegan.
 */
describe('el número para WhatsApp', () => {
  /** La forma canónica: código de área + abonado, diez dígitos. */
  it('lee un número escrito de las seis maneras habituales', () => {
    const esperado = '5491155555555'

    expect(numeroParaWhatsapp('1155555555')).toBe(esperado)
    expect(numeroParaWhatsapp('11 5555-5555')).toBe(esperado)
    expect(numeroParaWhatsapp('(011) 5555-5555')).toBe(esperado)
    expect(numeroParaWhatsapp('+54 9 11 5555 5555')).toBe(esperado)
    expect(numeroParaWhatsapp('54 11 5555 5555')).toBe(esperado)
    expect(numeroParaWhatsapp('0054 11 5555 5555')).toBe(esperado)
  })

  /**
   * El `15` de los móviles, que es la forma más común de todas y la única que
   * obliga a razonar: puede estar en tres posiciones según cuánto mida el código
   * de área, y no hay tabla de códigos de área en este sistema.
   */
  it('saca el 15 cuando la posición es inequívoca', () => {
    // Código de área de dos dígitos: CABA y el conurbano.
    expect(numeroParaWhatsapp('011 15 5555-5555')).toBe('5491155555555')
    // De tres: Pilar, que es donde está el estudio.
    expect(numeroParaWhatsapp('0230 15 4555555')).toBe('5492304555555')
    // Y el mismo número de Pilar sin el 15, para que las dos formas coincidan.
    expect(numeroParaWhatsapp('0230 4555555')).toBe('5492304555555')
  })

  /**
   * ⚠️ **La mitad que importa.** Con dos `15` posibles en la ventana no se puede
   * saber cuál es el prefijo de móvil, así que **no se contesta**. Devolver algo
   * plausible acá es exactamente lo que este archivo existe para no hacer.
   */
  it('se niega a adivinar cuando el 15 puede estar en dos lugares', () => {
    expect(numeroParaWhatsapp('231515234567')).toBeNull()
  })

  it('se niega con cualquier cosa que no sea un número argentino', () => {
    expect(numeroParaWhatsapp('')).toBeNull()
    expect(numeroParaWhatsapp('   ')).toBeNull()
    expect(numeroParaWhatsapp('no tengo')).toBeNull()
    expect(numeroParaWhatsapp('1234')).toBeNull()
    expect(numeroParaWhatsapp('11 5555-5555 int. 4')).toBeNull()
    expect(numeroParaWhatsapp(null)).toBeNull()
    expect(numeroParaWhatsapp(undefined)).toBeNull()
  })
})

describe('el link', () => {
  it('escapa el mensaje, que lleva saltos de línea y acentos', () => {
    const link = linkDeWhatsapp('11 5555-5555', '¡Hola Juan!\nTu clave: A7K2M9')

    expect(link).toBe(
      'https://wa.me/5491155555555?text=%C2%A1Hola%20Juan!%0ATu%20clave%3A%20A7K2M9',
    )
  })

  /**
   * ⚠️ **No hay link de descarte, y es la decisión de todo esto.** Sin número
   * legible la pantalla tiene que mostrar el número para copiar y **no** ofrecer
   * el botón: un link roto parece que el sistema hizo algo y deja a quien atiende
   * peor que antes.
   */
  it('no inventa un link cuando el número no se pudo leer', () => {
    expect(linkDeWhatsapp('no tengo', 'hola')).toBeNull()
    expect(linkDeWhatsapp(null, 'hola')).toBeNull()
  })
})

describe('los mensajes', () => {
  it('el saludo nombra el servicio que la persona pidió', () => {
    const saludo = saludoDeContacto('Juan', 'Alquilar la cabina')

    expect(saludo).toContain('Juan')
    expect(saludo).toContain('alquilar la cabina')
  })

  /**
   * **El caso que justifica el archivo entero.** La contraseña no se puede volver
   * a ver: si se tipea mal, la persona no entra y hay que generarle otra. Acá la
   * escribe el sistema, con las tres cosas que evitan la repregunta.
   */
  it('el de la clave la lleva textual, con el mail y las dos advertencias', () => {
    const mensaje = mensajeConLaClave('Juan', 'juan@mail.com', 'A7K2M9')

    expect(mensaje).toContain('A7K2M9')
    expect(mensaje).toContain('juan@mail.com')
    expect(mensaje).toContain('cambiar')
    expect(mensaje).toContain('7 días')
  })

  /**
   * **Un mensaje, tres bloques, y el orden es la decisión** (P71, §16 · A8).
   * Eran dos mensajes por miedo a que el plazo se hundiera entre la contraseña y
   * el resto; lo que lo salva es que el plazo y el monto van ANTES de la cuenta.
   * Un caso que sólo mire que las cosas estén no protege eso: mira posiciones.
   */
  it('el de la cabina dice el plazo antes que la clave, y cierra con el portal', () => {
    const mensaje = mensajeDeCabinaApartada({
      nombre: 'Juan',
      sala: 'Sala 1',
      cuando: '10/10/2026 a las 18:00',
      importe: '$ 15000',
      vence: '07/09/2026 10:00',
      cuenta: { email: 'juan@mail.com', passwordTemporal: 'A7K2M9' },
    })

    const plazo = mensaje.indexOf('07/09/2026 10:00')
    const clave = mensaje.indexOf('A7K2M9')
    const portal = mensaje.indexOf('Desde tu cuenta')
    expect(plazo).toBeGreaterThan(-1)
    expect(clave).toBeGreaterThan(plazo)
    expect(portal).toBeGreaterThan(clave)
    expect(mensaje).toContain('$ 15000')
    expect(mensaje).toContain('juan@mail.com')
    expect(mensaje).toContain('7 días')
  })

  /**
   * ⚠️ **Con cuenta previa no va el bloque de la cuenta** — mandarle una
   * contraseña temporal a alguien que ya entra con la suya es el modo de falla
   * que `passwordTemporal = null` existe para evitar. El portal sí se describe:
   * que ya tenga cuenta no quiere decir que sepa qué puede hacer desde ella.
   */
  it('sin cuenta nueva no lleva clave ni usuario, pero sí el portal', () => {
    const mensaje = mensajeDeCabinaApartada({
      nombre: 'Juan',
      sala: 'Sala 1',
      cuando: '10/10/2026 a las 18:00',
      importe: '$ 15000',
      vence: '07/09/2026 10:00',
      cuenta: null,
    })

    expect(mensaje).not.toContain('Contraseña')
    expect(mensaje).not.toContain('Usuario:')
    expect(mensaje).toContain('07/09/2026 10:00')
    expect(mensaje).toContain('Desde tu cuenta')
  })

  /**
   * La variante de programa (P71, Fase 6): el mismo orden —seña y plazo
   * primero, la clave después, el portal al final— con lo que un alumno puede
   * hacer y quien alquila no: seguir el curso y ver el material.
   */
  it('el de la inscripción dice programa, profe, seña y plazo, y que el resto va antes de empezar', () => {
    const mensaje = mensajeDeInscripcion({
      nombre: 'Juan',
      programa: 'DJ',
      profesor: 'Tomás Ghezzi',
      importe: '$ 85.000',
      vence: '13/09/2026 10:00',
      cuenta: { email: 'juan@mail.com', passwordTemporal: 'A7K2M9' },
    })

    expect(mensaje).toContain('Te anotamos en DJ con Tomás Ghezzi')
    const plazo = mensaje.indexOf('13/09/2026 10:00')
    const clave = mensaje.indexOf('A7K2M9')
    const portal = mensaje.indexOf('Desde tu cuenta')
    expect(plazo).toBeGreaterThan(-1)
    expect(clave).toBeGreaterThan(plazo)
    expect(portal).toBeGreaterThan(clave)
    expect(mensaje).toContain('$ 85.000')
    expect(mensaje).toContain('El resto se paga antes de la primera clase')
    expect(mensaje).toContain('clase por clase')
  })

  it('el de la inscripción sin plazo (una beca) no pide plata ni lleva clave si ya tenía cuenta', () => {
    const mensaje = mensajeDeInscripcion({
      nombre: 'Juan',
      programa: 'DJ',
      profesor: null,
      importe: '$ 0',
      vence: null,
      cuenta: null,
    })

    expect(mensaje).toContain('Te anotamos en DJ.')
    expect(mensaje).toContain('No hay nada que abonar')
    expect(mensaje).not.toContain('seña')
    expect(mensaje).not.toContain('Contraseña')
  })
})
