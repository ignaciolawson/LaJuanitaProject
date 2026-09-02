import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AlumnoDelProfesor } from '../api/tiposDocencia'
import { MisAlumnosPagina } from './MisAlumnosPagina'

/**
 * Módulo 5, pantalla 2 — mis alumnos.
 *
 * **El caso que sostiene la pantalla es el del semáforo sin marcar.** `null` y
 * `VA_BIEN` son estados distintos y se parecen tanto que una pantalla los pinta
 * igual sin que nadie lo note: un verde que nadie puso dice que el alumno está
 * bien, cuando lo que pasa es que nadie lo miró — y encontrar a los que nadie
 * miró es para lo que se abre este listado.
 */

vi.mock('../api/docencia', () => ({ misAlumnos: vi.fn() }))

const { misAlumnos } = await import('../api/docencia')

function alumno(cambios: Partial<AlumnoDelProfesor> = {}): AlumnoDelProfesor {
  return {
    idAlumno: 7,
    idUsuario: 42,
    nombre: 'Juan',
    apellido: 'Pérez',
    cursos: [{ idInscripcion: 7, disciplina: 'DJ', nivel: 'INICIAL', clasesRestantes: 5 }],
    estadoSeguimiento: null,
    observaciones: null,
    clasesRestantes: 5,
    ...cambios,
  }
}

function montar() {
  return render(
    <MemoryRouter>
      <MisAlumnosPagina />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(misAlumnos).mockResolvedValue([alumno()])
})

describe('el listado', () => {
  it('muestra quién es, qué cursa y cuánto le queda', async () => {
    montar()

    expect(await screen.findByText('Juan Pérez')).toBeDefined()
    expect(screen.getByText('DJ')).toBeDefined()
    expect(screen.getByText('5')).toBeDefined()
  })

  it('cada alumno lleva a su ficha', async () => {
    montar()

    const enlace = await screen.findByRole('link', { name: /Juan Pérez/ })
    expect(enlace.getAttribute('href')).toBe('/mis-alumnos/7')
  })

  /**
   * Un profesor recién asignado no tiene alumnos, y eso no es un error: la lista
   * vacía tiene que explicar por dónde se llena.
   */
  it('sin alumnos explica de dónde salen', async () => {
    vi.mocked(misAlumnos).mockResolvedValue([])
    montar()

    expect(await screen.findByText(/Todavía no tenés alumnos/)).toBeDefined()
  })
})

describe('el semáforo', () => {
  it('sin marcar dice sin marcar, y no "va bien"', async () => {
    montar()

    expect(await screen.findByText('Sin marcar')).toBeDefined()
    expect(screen.queryByText('Va bien')).toBeNull()
  })

  it('marcado muestra el estado que el profesor puso', async () => {
    vi.mocked(misAlumnos).mockResolvedValue([
      alumno({ estadoSeguimiento: 'REQUIERE_ATENCION' }),
    ])
    montar()

    expect(await screen.findByText('Requiere atención')).toBeDefined()
    expect(screen.queryByText('Sin marcar')).toBeNull()
  })
})
