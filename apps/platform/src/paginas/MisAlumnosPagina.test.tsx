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
    cursos: [{ idInscripcion: 7, disciplina: 'DJ', nivel: 'INICIAL', clasesRestantes: 5, numeroGrupo: null }],
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

/**
 * Los grupos (P95). **El caso que importa es el número de clases**: con tres
 * filas sueltas cada una decía "6 clases restantes" y no hay forma de que quien
 * mira sepa que son las mismas seis.
 */
describe('un grupo', () => {
  /** Tres alumnos que comparten la inscripción 90, o sea el Grupo 8. */
  function elGrupo(): AlumnoDelProfesor[] {
    const curso = {
      idInscripcion: 90,
      disciplina: 'DJ' as const,
      nivel: 'INICIAL' as const,
      clasesRestantes: 6,
      numeroGrupo: 8,
    }
    return [
      alumno({ idAlumno: 1, nombre: 'Mati', apellido: 'Grupo', cursos: [curso], clasesRestantes: 6 }),
      alumno({ idAlumno: 2, nombre: 'Facu', apellido: 'Gómez', cursos: [curso], clasesRestantes: 6 }),
      alumno({ idAlumno: 3, nombre: 'Gonza', apellido: 'Ruiz', cursos: [curso], clasesRestantes: 6 }),
    ]
  }

  it('es una tarjeta con los tres adentro y las clases dichas una sola vez', async () => {
    vi.mocked(misAlumnos).mockResolvedValue(elGrupo())
    montar()

    expect(await screen.findByText('Grupo 8')).toBeDefined()
    expect(screen.getByText('DJ · 3 alumnos, cursan juntos')).toBeDefined()
    expect(screen.getByText('Mati Grupo')).toBeDefined()
    expect(screen.getByText('Facu Gómez')).toBeDefined()
    expect(screen.getByText('Gonza Ruiz')).toBeDefined()
    // Seis, una vez. Con tres filas sueltas apareciía tres veces.
    expect(screen.getAllByText('6')).toHaveLength(1)
  })

  it('cada integrante sigue llevando a SU ficha: las notas son por persona', async () => {
    vi.mocked(misAlumnos).mockResolvedValue(elGrupo())
    montar()

    const facu = await screen.findByRole('link', { name: /Facu Gómez/ })
    expect(facu.getAttribute('href')).toBe('/mis-alumnos/2')
  })

  it('un grupo del que sólo tengo a uno se muestra igual, con el que tengo', async () => {
    vi.mocked(misAlumnos).mockResolvedValue([elGrupo()[1]])
    montar()

    expect(await screen.findByText('Grupo 8')).toBeDefined()
    expect(screen.getByText('DJ · 1 alumno tuyo')).toBeDefined()
  })
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
