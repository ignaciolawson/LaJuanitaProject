import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MaterialResumen } from '../api/tiposDocencia'
import { MisMaterialesPagina } from './MisMaterialesPagina'

/**
 * Módulo 5, pantalla 6 — mis materiales, como alumno.
 *
 * **Lo que esta pantalla no tiene es lo que la define**: ningún interruptor de
 * visibilidad. El alumno recibe material, no lo administra, y lo que le llega es
 * solo lo publicado —condición que vive en la consulta del backend, así que no
 * hay forma de pedir esto sin ella—.
 *
 * Es también la que salda la deuda del Módulo 4: `MisCursosPagina` dibujaba un
 * bloque "todavía no disponible" que ahora apunta acá.
 */

vi.mock('../api/portal', () => ({ misMateriales: vi.fn() }))

const { misMateriales } = await import('../api/portal')

function material(cambios: Partial<MaterialResumen> = {}): MaterialResumen {
  return {
    idMaterial: 1,
    idProfesor: 3,
    profesor: 'Ghezz Pérez',
    idAlumno: 7,
    alumno: 'Juan Pérez',
    esGrupal: false,
    titulo: 'Pack de samples',
    tipo: 'sample pack',
    urlExterna: 'https://drive.example/pack',
    visibleAlumno: true,
    fechaSubida: '2026-08-19T14:00:00Z',
    ...cambios,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(misMateriales).mockResolvedValue([material()])
})

describe('el listado', () => {
  it('muestra el material con quién lo subió y cómo abrirlo', async () => {
    render(<MisMaterialesPagina />)

    expect(await screen.findByText('Pack de samples')).toBeDefined()
    expect(screen.getByText(/Ghezz Pérez/)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Abrir' }).getAttribute('href')).toBe(
      'https://drive.example/pack',
    )
  })

  /** Saber que algo es para todo el curso y no para uno cambia cómo se lee. */
  it('dice cuándo el material es para todo el curso', async () => {
    vi.mocked(misMateriales).mockResolvedValue([
      material({ esGrupal: true, idAlumno: null, alumno: null }),
    ])
    render(<MisMaterialesPagina />)

    expect(await screen.findByText(/para todo el curso/)).toBeDefined()
  })

  it('sin materiales explica que los sube el profesor', async () => {
    vi.mocked(misMateriales).mockResolvedValue([])
    render(<MisMaterialesPagina />)

    expect(await screen.findByText(/Los sube tu profesor/)).toBeDefined()
  })
})

describe('la división por dentro (§12 · B1)', () => {
  it('agrupa por quién lo subió y cuenta cuántos hay de cada uno', async () => {
    vi.mocked(misMateriales).mockResolvedValue([
      material({ idMaterial: 1, titulo: 'Pack A', profesor: 'Ghezz Pérez' }),
      material({ idMaterial: 2, titulo: 'Pack B', profesor: 'Ghezz Pérez' }),
      material({ idMaterial: 3, titulo: 'Guía de mezcla', profesor: 'Najles' }),
    ])
    render(<MisMaterialesPagina />)

    expect(await screen.findByRole('heading', { name: 'Ghezz Pérez' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Najles' })).toBeDefined()
    expect(screen.getByText('2 materiales')).toBeDefined()
    expect(screen.getByText('1 material')).toBeDefined()
  })

  it('⚠️ el grupo con lo más reciente va primero, no el primero del abecedario', async () => {
    // Alfabético haría que quien no sube nada hace tres meses encabece la
    // pantalla por llamarse Álvarez.
    vi.mocked(misMateriales).mockResolvedValue([
      material({ idMaterial: 1, profesor: 'Álvarez', fechaSubida: '2026-06-01T10:00:00Z' }),
      material({ idMaterial: 2, profesor: 'Zabala', fechaSubida: '2026-08-30T10:00:00Z' }),
    ])
    render(<MisMaterialesPagina />)

    await screen.findByRole('heading', { name: 'Zabala' })
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)

    expect(titulos).toEqual(['Zabala', 'Álvarez'])
  })
})

describe('lo que el alumno no puede hacer', () => {
  it('no hay interruptor de visibilidad', async () => {
    render(<MisMaterialesPagina />)

    await screen.findByText('Pack de samples')
    expect(screen.queryByRole('button', { name: 'Publicar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ocultar' })).toBeNull()
  })
})
