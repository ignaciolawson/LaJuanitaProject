import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReservaResumen } from '../api/tiposAdmin'
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
  // Desde `V23` la pantalla necesita las clases dictadas: de ahí sale la lista
  // de "¿de qué clase?", filtrada por la inscripción del curso elegido.
  miAgenda: vi.fn(),
}))

const { cambiarVisibilidad, miAgenda, misAlumnos, misMaterialesSubidos, subirMaterial } =
  await import('../api/docencia')

const ALUMNOS: AlumnoDelProfesor[] = [
  {
    idAlumno: 7,
    idUsuario: 42,
    nombre: 'Juan',
    apellido: 'Pérez',
    // Dos cursos del MISMO alumno: es lo que hace que el filtro de clases tenga
    // algo que demostrar. Con uno solo, filtrar por curso y por alumno darían lo
    // mismo y el caso no probaría nada.
    cursos: [
      { idInscripcion: 7, disciplina: 'DJ', nivel: 'INICIAL', clasesRestantes: 5 },
      { idInscripcion: 9, disciplina: 'PRODUCCION', nivel: null, clasesRestantes: 12 },
    ],
    estadoSeguimiento: null,
    observaciones: null,
    clasesRestantes: 17,
  },
]

/** Una clase dictada, como la trae la agenda del profesor. */
function clase(idReserva: number, idInscripcion: number): ReservaResumen {
  return {
    idReserva,
    idSala: 1,
    sala: 'Sala 1',
    idTipoUso: 1,
    tipoUso: 'Clase de DJ',
    color: '#e63946',
    esClase: true,
    idProfesor: 3,
    profesor: 'Ghezz Pérez',
    fecha: '2026-08-12',
    horaInicio: '10:00:00',
    horaFin: '11:30:00',
    estado: 'CONFIRMADA',
    venceEn: null,
    notas: null,
    idReservaRecupera: null,
    motivoReprogramacion: null,
    fechaCreacion: '2026-08-01T10:00:00Z',
    participantes: [
      {
        idParticipacion: idReserva * 10,
        idUsuario: 42,
        nombre: 'Juan',
        apellido: 'Pérez',
        idInscripcion,
        disciplina: 'DJ',
        estadoAsistencia: 'PENDIENTE',
        observaciones: null,
      },
    ],
  } as ReservaResumen
}

function material(cambios: Partial<MaterialResumen> = {}): MaterialResumen {
  return {
    idMaterial: 1,
    idProfesor: 3,
    profesor: 'Ghezz Pérez',
    idAlumno: 3,
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
  vi.mocked(misAlumnos).mockResolvedValue(ALUMNOS)
  // La 50 es del curso de DJ; la 60, del de producción del mismo alumno.
  vi.mocked(miAgenda).mockResolvedValue([clase(50, 7), clase(60, 9)])
  vi.mocked(misMaterialesSubidos).mockResolvedValue([material()])
  vi.mocked(subirMaterial).mockResolvedValue(material({ idMaterial: 2, titulo: 'Proyecto base' }))
})

async function completarElFormulario() {
  await userEvent.type(await screen.findByLabelText(/Título/), 'Proyecto base')
  await userEvent.type(screen.getByLabelText(/^Link/), 'https://drive.example/proyecto')
}

describe('a qué curso va el material (§12 · C2)', () => {
  /**
   * ⚠️ **Este bloque reemplaza a "el destinatario", cuyos casos defendían el
   * agujero.** Aquéllos afirmaban que sin elegir alumno el material quedaba
   * "grupal" — y grupal no filtraba por nada: le llegaba a todos los alumnos del
   * estudio, incluidos los que nunca tuvieron a este profesor. Estaban en verde y
   * describían bien lo que el código hacía; lo que faltaba era que alguien
   * decidiera qué tenía que hacer.
   */
  it('el curso es obligatorio y viaja en el pedido', async () => {
    render(<SubirMaterialPagina />)
    await completarElFormulario()

    await elegir(userEvent, /Para qué curso/, '7')
    await userEvent.click(screen.getByRole('button', { name: 'Subir material' }))

    await waitFor(() => {
      expect(subirMaterial).toHaveBeenCalledWith({
        idInscripcion: 7,
        // Sin clase: material de todo el curso, que §18 · P41 admite.
        idReserva: undefined,
        titulo: 'Proyecto base',
        tipo: undefined,
        urlExterna: 'https://drive.example/proyecto',
        visibleAlumno: true,
      })
    })
  })

  it('se puede colgar de una clase de ese curso', async () => {
    render(<SubirMaterialPagina />)
    await completarElFormulario()

    await elegir(userEvent, /Para qué curso/, '7')
    await elegir(userEvent, /De qué clase/, '50')
    await userEvent.click(screen.getByRole('button', { name: 'Subir material' }))

    await waitFor(() => {
      expect(vi.mocked(subirMaterial).mock.calls[0][0].idReserva).toBe(50)
    })
  })

  /**
   * ⚠️ **La lista de clases sale del CURSO, no del alumno.** Filtrar por alumno
   * ofrecería sus clases de DJ cuando el material es de producción — la misma
   * mezcla que `V22` eliminó del otro lado, y que el backend rechaza.
   */
  it('sólo ofrece las clases del curso elegido', async () => {
    render(<SubirMaterialPagina />)
    await screen.findByLabelText(/Para qué curso/)

    await elegir(userEvent, /Para qué curso/, '7')

    const clases = screen.getByLabelText(/De qué clase/) as HTMLSelectElement
    const valores = [...clases.options].map((o) => o.value)

    expect(valores).toContain('50')
    // La clase de la otra inscripción del mismo alumno no aparece.
    expect(valores).not.toContain('60')
  })

  it('cambiar de curso limpia la clase elegida', async () => {
    // Dejarla puesta arma un pedido que el backend rechaza y que nadie escribió
    // a propósito: esa clase es del curso anterior.
    render(<SubirMaterialPagina />)
    await screen.findByLabelText(/Para qué curso/)

    await elegir(userEvent, /Para qué curso/, '7')
    await elegir(userEvent, /De qué clase/, '50')
    await elegir(userEvent, /Para qué curso/, '9')

    expect((screen.getByLabelText(/De qué clase/) as HTMLSelectElement).value).toBe('')
  })
})

describe('publicar o no', () => {
  it('se puede dejar preparado sin publicar', async () => {
    render(<SubirMaterialPagina />)
    await completarElFormulario()

    // El curso es obligatorio desde `V23`: sin él el formulario no envía.
    await elegir(userEvent, /Para qué curso/, '7')
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
