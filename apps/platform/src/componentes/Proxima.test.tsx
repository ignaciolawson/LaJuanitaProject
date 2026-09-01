import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Progreso } from './Progreso'
import { Proxima } from './Proxima'
import { cuandoEnPalabras } from './semana'

describe('cuándo, en palabras', () => {
  it('hoy, mañana y ayer se dicen por su nombre', () => {
    expect(cuandoEnPalabras('2026-09-01', '2026-09-01')).toBe('Hoy')
    expect(cuandoEnPalabras('2026-09-02', '2026-09-01')).toBe('Mañana')
    expect(cuandoEnPalabras('2026-08-31', '2026-09-01')).toBe('Ayer')
  })

  it('dentro de la semana dice el día', () => {
    // "El jueves" ubica; "en 3 días" obliga a contar.
    expect(cuandoEnPalabras('2026-09-03', '2026-09-01')).toBe('El jueves')
    expect(cuandoEnPalabras('2026-09-06', '2026-09-01')).toBe('El domingo')
  })

  it('más lejos vuelve a los días, porque el nombre del día ya no ubica', () => {
    expect(cuandoEnPalabras('2026-09-08', '2026-09-01')).toBe('En 7 días')
    expect(cuandoEnPalabras('2026-09-20', '2026-09-01')).toBe('En 19 días')
  })

  it('cruza el fin de mes sin equivocarse', () => {
    // La resta es entre fechas armadas a mano, no entre strings.
    expect(cuandoEnPalabras('2026-10-01', '2026-09-30')).toBe('Mañana')
    expect(cuandoEnPalabras('2027-01-01', '2026-12-31')).toBe('Mañana')
  })

  it('⚠️ no se corre un día por la zona horaria', () => {
    // `new Date('2026-09-03')` es medianoche UTC y, leída en Buenos Aires
    // (UTC−3), cae el día anterior: toda clase se anunciaría un día antes.
    // Es el mismo error que la landing documentó para las fechas de sus notas.
    // Marzo y octubre son los meses del cambio de hora en el hemisferio norte,
    // que es donde más fácil se rompe una resta hecha con timestamps.
    expect(cuandoEnPalabras('2026-03-15', '2026-03-15')).toBe('Hoy')
    expect(cuandoEnPalabras('2026-10-25', '2026-10-25')).toBe('Hoy')
    expect(cuandoEnPalabras('2026-11-01', '2026-10-31')).toBe('Mañana')
  })
})

describe('la pieza de lo próximo', () => {
  it('dice cuándo, a qué hora, qué y dónde', () => {
    render(
      <Proxima
        hoy="2026-09-01"
        fecha="2026-09-02"
        horaInicio="18:00:00"
        horaFin="19:30:00"
        titulo="Clase de DJ"
        detalle="Sala 1 · con Ghezz"
      />,
    )

    expect(screen.getByText('Mañana')).toBeDefined()
    expect(screen.getByText('18:00 a 19:30')).toBeDefined()
    expect(screen.getByText(/Clase de DJ/)).toBeDefined()
    expect(screen.getByText(/Sala 1/)).toBeDefined()
    // La fecha exacta va igual: es la confirmación de lo que dice la palabra.
    expect(screen.getByText('2 de septiembre')).toBeDefined()
  })
})

describe('el progreso del curso', () => {
  it('dibuja un paso por clase contratada', () => {
    render(<Progreso hechas={3} total={8} />)

    expect(screen.getByRole('img', { name: '3 de 8 clases tomadas' })).toBeDefined()
  })

  it('⚠️ un curso sin clases contratadas no dibuja una barra vacía', () => {
    // Dividir por cero daba `width: NaN%`, que el navegador descarta sin decir
    // nada: un curso sin clases se veía igual que uno recién empezado.
    render(<Progreso hechas={0} total={0} />)

    expect(screen.getByText('Sin clases contratadas.')).toBeDefined()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('nunca marca más pasos que los que hay', () => {
    // Un dato inconsistente no puede dibujar nueve de ocho.
    render(<Progreso hechas={99} total={8} />)

    expect(screen.getByRole('img', { name: '8 de 8 clases tomadas' })).toBeDefined()
  })

  it('con muchas clases cambia a barra, porque los pasos dejan de distinguirse', () => {
    render(<Progreso hechas={10} total={40} />)

    expect(screen.getByRole('img', { name: '10 de 40 clases tomadas' })).toBeDefined()
  })
})
