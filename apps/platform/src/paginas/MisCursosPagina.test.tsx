import { render, screen } from '@testing-library/react'
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(misCursos).mockResolvedValue([curso()])
})

describe('el progreso', () => {
  it('muestra cuántas clases quedan y cuántas se tomaron', async () => {
    render(<MisCursosPagina />)

    expect(await screen.findByText('5')).toBeDefined()
    expect(screen.getByText(/tomaste 3 de 8/)).toBeDefined()
    expect(screen.getByText(/con Ghezz Pérez/)).toBeDefined()
  })

  /**
   * Una pausada tiene clases debidas: esconderla le esconde a la persona lo que
   * le queda por cursar, que es la misma razón por la que cuenta en el listado
   * de alumnos por disciplina.
   */
  it('una inscripción pausada se muestra, con su estado', async () => {
    vi.mocked(misCursos).mockResolvedValue([curso({ estado: 'PAUSADA' })])
    render(<MisCursosPagina />)

    expect(await screen.findByText('Pausada')).toBeDefined()
  })

  /** Tener cuenta y ser alumno son cosas distintas (P18). */
  it('el que no cursa nada ve un mensaje y no un error', async () => {
    vi.mocked(misCursos).mockResolvedValue([])
    render(<MisCursosPagina />)

    expect(await screen.findByText(/Todavía no estás inscripto/)).toBeDefined()
  })
})

/**
 * El bloque de materiales se dibuja apagado y con nombre, igual que las secciones
 * del menú que todavía no existen: un bloque ausente se lee como "el sistema
 * perdió los datos", uno etiquetado se lee como "todavía no está".
 */
describe('lo que falta', () => {
  it('nombra los materiales como pendientes del Módulo 5', async () => {
    render(<MisCursosPagina />)

    expect(await screen.findByText('Materiales de clase')).toBeDefined()
    expect(screen.getByText(/Módulo 5/)).toBeDefined()
  })
})
