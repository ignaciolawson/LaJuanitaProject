import { describe, expect, it } from 'vitest'

import { FRASES, fraseDelDia } from './frases'

describe('las frases del Inicio', () => {
  it('una cita atribuida siempre trae su fuente', () => {
    // Es la regla que el tipo ya impide romper al compilar. El caso existe
    // igual porque el día que alguien afloje el tipo —o agregue una frase con
    // un `as`— esto es lo que lo dice. Lo que se protege no es un formato: es
    // no firmar con el nombre de una persona real algo que no dijo.
    for (const frase of FRASES) {
      if (frase.tipo === 'cita') {
        expect(frase.autor.trim()).not.toBe('')
        expect(frase.fuente).toMatch(/^https:\/\//)
      }
    }
  })

  it('la misma fecha da siempre la misma frase', () => {
    // Lo que se fija acá es que NO sea al azar. Con `Math.random` la frase
    // cambiaría en cada render —al navegar a otra pantalla y volver al Inicio—
    // y una frase que parpadea deja de leerse: pasa a ser un elemento que se
    // mueve.
    expect(fraseDelDia('2026-09-01')).toBe(fraseDelDia('2026-09-01'))
  })

  it('cambia de un día al siguiente', () => {
    const dias = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']
    const distintas = new Set(dias.map((d) => fraseDelDia(d).texto))

    // Cuatro días consecutivos contra cuatro frases: si dos días seguidos
    // cayeran en la misma, la rotación no estaría rotando.
    expect(distintas.size).toBe(dias.length)
  })

  it('siempre devuelve una frase, sea cual sea la fecha', () => {
    // El índice sale de la fecha convertida a número, así que un cambio de mes
    // o de año no puede dejarlo fuera del arreglo. Sin esto, el Inicio —la
    // primera pantalla que ve todo el mundo— reventaría un día puntual.
    for (const fecha of ['2026-01-01', '2026-12-31', '2027-02-28', '2030-06-15']) {
      expect(fraseDelDia(fecha).texto.length).toBeGreaterThan(0)
    }
  })
})
