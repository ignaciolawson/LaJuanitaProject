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
    idInscripcion: 7,
    curso: 'DJ · INICIAL',
    idReserva: null,
    clase: null,
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

  /**
   * Material del programa y no de un día: §18 · P41 lo admite explícitamente
   * (*"puede ser del curso entero"*), y la pantalla lo dice con esas palabras.
   */
  it('el material sin clase se agrupa como de todo el curso', async () => {
    vi.mocked(misMateriales).mockResolvedValue([material({ idReserva: null, clase: null })])
    render(<MisMaterialesPagina />)

    expect(await screen.findByText('De todo el curso')).toBeDefined()
  })

  it('sin materiales explica que los sube el profesor', async () => {
    vi.mocked(misMateriales).mockResolvedValue([])
    render(<MisMaterialesPagina />)

    expect(await screen.findByText(/Los sube tu profesor/)).toBeDefined()
  })
})

describe('la división por dentro (§12 · C2)', () => {
  it('agrupa por curso y, dentro, por clase', async () => {
    vi.mocked(misMateriales).mockResolvedValue([
      material({
        idMaterial: 1,
        titulo: 'Pack A',
        curso: 'DJ · INICIAL',
        idReserva: 50,
        clase: '2026-08-12 10:00',
      }),
      material({
        idMaterial: 2,
        titulo: 'Pack B',
        curso: 'DJ · INICIAL',
        idReserva: 51,
        clase: '2026-08-19 10:00',
      }),
      material({
        idMaterial: 3,
        titulo: 'Plantilla',
        curso: 'PRODUCCION',
        idReserva: null,
        clase: null,
      }),
    ])
    render(<MisMaterialesPagina />)

    expect(await screen.findByRole('heading', { name: 'DJ · INICIAL' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'PRODUCCION' })).toBeDefined()
    expect(screen.getByText('Clase del 2026-08-12')).toBeDefined()
    expect(screen.getByText('Clase del 2026-08-19')).toBeDefined()
    expect(screen.getByText('2 materiales')).toBeDefined()
  })

  it('⚠️ "De todo el curso" va al final, aunque su material sea el más nuevo', async () => {
    // No es un día: es el material que vale para el programa entero. Ordenado por
    // fecha entre las clases quedaría escondido entre ellas.
    vi.mocked(misMateriales).mockResolvedValue([
      material({
        idMaterial: 1,
        titulo: 'De una clase vieja',
        idReserva: 50,
        clase: '2026-06-01 10:00',
        fechaSubida: '2026-06-01T10:00:00Z',
      }),
      material({
        idMaterial: 2,
        titulo: 'Bibliografia',
        idReserva: null,
        clase: null,
        fechaSubida: '2026-08-30T10:00:00Z',
      }),
    ])
    render(<MisMaterialesPagina />)

    await screen.findByText('De todo el curso')
    const franjas = screen
      .getAllByText(/^(Clase del|De todo el curso)/)
      .map((e) => e.textContent)

    expect(franjas[franjas.length - 1]).toBe('De todo el curso')
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
