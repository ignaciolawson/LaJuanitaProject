import { describe, expect, it } from 'vitest'

import { antiguedad, importe } from './dinero'

/**
 * Las dos cuentas que se ven en cinco pantallas del Módulo 3. Son chicas y por
 * eso mismo se copian mal: un listado que dice `$ 180.000,00` al lado de una
 * caja que dice `180000` se lee como dos sistemas.
 */
describe('el formato de la plata', () => {
  it('usa el formato argentino: punto para miles, coma para decimales', () => {
    expect(importe(180000, 'ARS')).toBe('$ 180.000,00')
  })

  /** §2.3: ARS y USD son cajas distintas, y un importe sin moneda no se puede usar. */
  it('distingue las dos monedas', () => {
    expect(importe(300, 'USD')).toBe('US$ 300,00')
    expect(importe(300, 'ARS')).toBe('$ 300,00')
  })

  it('siempre muestra los centavos', () => {
    expect(importe(1500.5, 'ARS')).toBe('$ 1.500,50')
    expect(importe(0, 'ARS')).toBe('$ 0,00')
  })

  /** El neto de la caja puede ser negativo, y tiene que leerse como tal. */
  it('un neto negativo se muestra con signo', () => {
    expect(importe(-40000, 'ARS')).toBe('$ -40.000,00')
  })
})

describe('la antigüedad de una deuda', () => {
  /** "Hace 1 días" es el detalle que hace parecer un sistema hecho a las apuradas. */
  it('un solo día va en singular', () => {
    expect(antiguedad(1)).toBe('hace 1 día')
  })

  it('varios días van en plural', () => {
    expect(antiguedad(30)).toBe('hace 30 días')
  })

  it('una deuda de hoy no dice "hace 0 días"', () => {
    expect(antiguedad(0)).toBe('hoy')
  })
})
