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

  // NOTA: falta un caso, y falta a propósito. Una credencial con `expiraEn`
  // ilegible ("mañana") HOY pasa por vigente: `Date.parse` de algo que no es
  // fecha da NaN, y `NaN <= Date.now()` es false, así que el chequeo de
  // vencimiento no la rechaza. Se descubrió escribiendo estos tests y quedó
  // anotado como hallazgo nuevo en vez de arreglarse acá, porque el arreglo es
  // de `credencial.ts` y esta tanda no lo tiene en alcance. Cuando se corrija,
  // el caso va acá.
})

describe('borrarCredencial', () => {
  it('deja el storage sin nada', () => {
    guardarCredencial({ token: 'x', expiraEn: dentroDe(8) })
    borrarCredencial()

    expect(localStorage.getItem(CLAVE)).toBeNull()
    expect(leerCredencial()).toBeNull()
  })
})
