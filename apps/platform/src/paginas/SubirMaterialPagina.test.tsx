import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AlumnoDelProfesor, MaterialResumen } from '../api/tiposDocencia'
import { SubirMaterialPagina } from './SubirMaterialPagina'
import { elegir } from '../pruebas/elegir'

/**
 * Módulo 5, pantalla 4 — subir material.
 *
 * **El caso que importa es el del destinatario, y es de forma antes que de
 * validación.** Un solo control decide entre grupal y de un alumno: ausencia de
 * `idAlumno` significa grupal, y esa traducción la hace el backend. Con dos
 * controles —un checkbox "grupal" más un selector de alumno— se puede escribir
 * un pedido contradictorio que la base rechaza y que el formulario nunca debió
 * dejar armar.
 *
 * El otro: **lo no publicado se ve acá y no en la pantalla del alumno**. El
 * profesor necesita ver qué tiene preparado.
 */

vi.mock('../api/docencia', () => ({
  misAlumnos: vi.fn(),
  misMaterialesSubidos: vi.fn(),
  subirMaterial: vi.fn(),
  cambiarVisibilidad: vi.fn(),
}))

const { cambiarVisibilidad, misAlumnos, misMaterialesSubidos, subirMaterial } = await import(
  '../api/docencia'
)

const ALUMNOS: AlumnoDelProfesor[] = [
  {
    idAlumno: 7,
    idUsuario: 42,
    nombre: 'Juan',
    apellido: 'Pérez',
    disciplinas: ['DJ'],
    estadoSeguimiento: null,
    observaciones: null,
    clasesRestantes: 5,
  },
]

function material(cambios: Partial<MaterialResumen> = {}): MaterialResumen {
  return {
    idMaterial: 1,
    idProfesor: 3,
    profesor: 'Ghezz Pérez',
    idAlumno: null,
    alumno: null,
    esGrupal: true,
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
  vi.mocked(misAlumnos).mockResolvedValue(ALUMNOS)
  vi.mocked(misMaterialesSubidos).mockResolvedValue([material()])
  vi.mocked(subirMaterial).mockResolvedValue(material({ idMaterial: 2, titulo: 'Proyecto base' }))
})

async function completarElFormulario() {
  await userEvent.type(await screen.findByLabelText(/Título/), 'Proyecto base')
  await userEvent.type(screen.getByLabelText(/^Link/), 'https://drive.example/proyecto')
}

describe('el destinatario', () => {
  it('sin elegir alumno el material queda grupal', async () => {
    render(<SubirMaterialPagina />)
    await completarElFormulario()

    await userEvent.click(screen.getByRole('button', { name: 'Subir material' }))

    await waitFor(() => {
      expect(subirMaterial).toHaveBeenCalledWith({
        idAlumno: undefined,
        titulo: 'Proyecto base',
        tipo: undefined,
        urlExterna: 'https://drive.example/proyecto',
        visibleAlumno: true,
      })
    })
  })

  it('eligiendo a un alumno viaja su id', async () => {
    render(<SubirMaterialPagina />)
    await completarElFormulario()

    await elegir(userEvent, /Para quién/, '7')
    await userEvent.click(screen.getByRole('button', { name: 'Subir material' }))

    await waitFor(() => {
      expect(vi.mocked(subirMaterial).mock.calls[0][0].idAlumno).toBe(7)
    })
  })

  /**
   * La prueba de que el control es uno solo: si hubiera dos, existiría una
   * combinación que dice "para todos" y "para Juan" al mismo tiempo.
   */
  it('hay un solo control de destinatario', async () => {
    render(<SubirMaterialPagina />)
    await screen.findByLabelText(/Para quién/)

    expect(screen.queryByLabelText(/grupal/i)).toBeNull()
  })
})

describe('publicar o no', () => {
  it('se puede dejar preparado sin publicar', async () => {
    render(<SubirMaterialPagina />)
    await completarElFormulario()

    await userEvent.click(screen.getByLabelText('Publicarlo ahora'))
    await userEvent.click(screen.getByRole('button', { name: 'Subir material' }))

    await waitFor(() => {
      expect(vi.mocked(subirMaterial).mock.calls[0][0].visibleAlumno).toBe(false)
    })
  })

  it('lo no publicado se ve en la lista del profesor, dicho', async () => {
    vi.mocked(misMaterialesSubidos).mockResolvedValue([material({ visibleAlumno: false })])
    render(<SubirMaterialPagina />)

    expect(await screen.findByText('Pack de samples')).toBeDefined()
    expect(screen.getByText('No publicado')).toBeDefined()
  })

  it('el interruptor publica', async () => {
    vi.mocked(misMaterialesSubidos).mockResolvedValue([material({ visibleAlumno: false })])
    vi.mocked(cambiarVisibilidad).mockResolvedValue(material({ visibleAlumno: true }))
    render(<SubirMaterialPagina />)

    await userEvent.click(await screen.findByRole('button', { name: 'Publicar' }))

    await waitFor(() => {
      expect(cambiarVisibilidad).toHaveBeenCalledWith(1, true)
    })
  })
})
