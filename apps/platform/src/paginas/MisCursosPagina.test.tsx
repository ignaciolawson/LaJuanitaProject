import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProgresoDelCurso } from '../api/tiposPortal'
import { MisCursosPagina } from './MisCursosPagina'

/**
 * Módulo 4 — mi progreso.
 *
 * **Las clases restantes vienen calculadas del servidor y esta pantalla no las
 * recalcula.** Es la misma cuenta que hace administración y la misma que hace la
 * base al rechazar la novena clase de un curso de ocho; una tercera versión acá
 * sería la que le dice al alumno que le quedan clases que no tiene.
 */

vi.mock('../api/portal', () => ({ misCursos: vi.fn() }))

const { misCursos } = await import('../api/portal')

function curso(cambios: Partial<ProgresoDelCurso> = {}): ProgresoDelCurso {
  return {
    idInscripcion: 1,
    disciplina: 'DJ',
    nivel: 'INICIAL',
    profesor: 'Ghezz Pérez',
    clasesContratadas: 8,
    clasesConsumidas: 3,
    clasesRestantes: 5,
    fechaInicio: '2026-08-01',
    estado: 'ACTIVA',
    ...cambios,
  }
}

/** La pantalla enlaza a Mis materiales, así que necesita un router alrededor. */
function montar() {
  return render(
    <MemoryRouter>
      <MisCursosPagina />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(misCursos).mockResolvedValue([curso()])
})

describe('el progreso', () => {
  it('muestra cuántas clases quedan y cuántas se tomaron', async () => {
    montar()

    expect(await screen.findByText('5')).toBeDefined()
    expect(screen.getByText(/Tomaste 3 de 8/)).toBeDefined()
    expect(screen.getByText(/con Ghezz Pérez/)).toBeDefined()
  })

  it('la fila de pasos dice lo mismo que el texto, para quien no la ve', async () => {
    // Los ocho pasos van `aria-hidden` bajo un solo `role="img"` con su
    // etiqueta: sin eso serían ocho elementos sin nombre, que es peor que no
    // dibujar nada.
    montar()

    expect(await screen.findByRole('img', { name: '3 de 8 clases tomadas' })).toBeDefined()
  })

  /**
   * Una pausada tiene clases debidas: esconderla le esconde a la persona lo que
   * le queda por cursar, que es la misma razón por la que cuenta en el listado
   * de alumnos por disciplina.
   */
  it('una inscripción pausada se muestra, con su estado', async () => {
    vi.mocked(misCursos).mockResolvedValue([curso({ estado: 'PAUSADA' })])
    montar()

    expect(await screen.findByText('Pausada')).toBeDefined()
  })

  /** Tener cuenta y ser alumno son cosas distintas (P18). */
  it('el que no cursa nada ve un mensaje y no un error', async () => {
    vi.mocked(misCursos).mockResolvedValue([])
    montar()

    expect(await screen.findByText(/Todavía no estás inscripto/)).toBeDefined()
  })
})

/**
 * Este bloque decía "todavía no disponible — Módulo 5" y ahora lleva a la
 * pantalla real. **Sigue existiendo**: el cartel se reemplazó por el camino, no
 * se borró, porque quien lo leyó alguna vez sigue buscando sus materiales acá.
 */
describe('los materiales', () => {
  it('el bloque de materiales lleva a Mis materiales', async () => {
    montar()

    expect(await screen.findByText('Materiales de clase')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Mis materiales' }).getAttribute('href')).toBe(
      '/mis-materiales',
    )
  })
})
