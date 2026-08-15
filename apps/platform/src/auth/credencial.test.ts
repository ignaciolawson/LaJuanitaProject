import { beforeEach, describe, expect, it } from 'vitest'

import { borrarCredencial, guardarCredencial, leerCredencial } from './credencial'

/**
 * La credencial guardada, que es lo primero que la app lee al arrancar.
 *
 * Si `leerCredencial()` devolviera algo inválido, la app arrancaría creyendo
 * que hay sesión y fallaría de a un pedido por vez, que es la forma más
 * confusa de romperse.
 */

const CLAVE = 'lajuanita.credencial'

function dentroDe(horas: number): string {
  return new Date(Date.now() + horas * 3600_000).toISOString()
}

describe('leerCredencial', () => {
  beforeEach(() => localStorage.clear())

  it('sin nada guardado devuelve null', () => {
    expect(leerCredencial()).toBeNull()
  })

  it('devuelve la credencial vigente tal cual se guardó', () => {
    const credencial = { token: 'un.token.firmado', expiraEn: dentroDe(8) }
    guardarCredencial(credencial)

    expect(leerCredencial()).toEqual(credencial)
  })

  /**
   * Chequear el vencimiento acá evita arrancar la app, mandar un pedido con un
   * token muerto y recién ahí enterarse.
   */
  it('una credencial vencida devuelve null Y se borra del storage', () => {
    guardarCredencial({ token: 'viejo', expiraEn: dentroDe(-1) })

    expect(leerCredencial()).toBeNull()
    expect(localStorage.getItem(CLAVE))
      .toBeNull()
  })

  it('una credencial que vence justo ahora ya no vale', () => {
    guardarCredencial({ token: 'al.limite', expiraEn: new Date(Date.now()).toISOString() })

    expect(leerCredencial()).toBeNull()
  })

  it('basura en localStorage no rompe la app: se descarta y se pide login', () => {
    localStorage.setItem(CLAVE, 'esto no es json {{{')

    expect(leerCredencial()).toBeNull()
    expect(localStorage.getItem(CLAVE)).toBeNull()
  })

  /** Un formato viejo, de una versión anterior de la app. */
  it('un objeto sin token o sin vencimiento se descarta', () => {
    localStorage.setItem(CLAVE, JSON.stringify({ expiraEn: dentroDe(8) }))
    expect(leerCredencial()).toBeNull()

    localStorage.setItem(CLAVE, JSON.stringify({ token: 'suelto' }))
    expect(leerCredencial()).toBeNull()
  })

  /**
   * El caso de QA-08. `Date.parse` de algo que no es fecha da NaN, y toda
   * comparación con NaN es false: sin el chequeo explícito, esta credencial
   * pasaba por vigente para siempre. Llega por un formato viejo guardado en el
   * navegador, no por un ataque — que es exactamente lo que va a pasar el día
   * que `expiraEn` cambie de forma.
   */
  it('una credencial con vencimiento ilegible se descarta, no se da por vigente', () => {
    localStorage.setItem(CLAVE, JSON.stringify({ token: 'x', expiraEn: 'mañana' }))

    expect(leerCredencial()).toBeNull()
    expect(localStorage.getItem(CLAVE)).toBeNull()
  })
})

describe('borrarCredencial', () => {
  it('deja el storage sin nada', () => {
    guardarCredencial({ token: 'x', expiraEn: dentroDe(8) })
    borrarCredencial()

    expect(localStorage.getItem(CLAVE)).toBeNull()
    expect(leerCredencial()).toBeNull()
  })
})
