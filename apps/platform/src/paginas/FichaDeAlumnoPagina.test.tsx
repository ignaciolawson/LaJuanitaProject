import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReservaResumen } from '../api/tiposAdmin'
import type { AlumnoDelProfesor, MaterialResumen, NotaResumen } from '../api/tiposDocencia'
import { FichaDeAlumnoPagina } from './FichaDeAlumnoPagina'

/**
 * Módulo 5, pantalla 3 — la ficha de un alumno mío.
 *
 * Tres decisiones que los casos protegen, y ninguna es visual:
 *
 * 1. **La nota viaja con el id de la PARTICIPACIÓN, no con el de la reserva.**
 *    Los dos son números, los dos existen en la misma pantalla y mandar el
 *    equivocado vuelve como 409 desde la base —o, peor, sería una nota colgada
 *    de la clase de otro si la base no lo atajara (`V1` §8.3).
 * 2. **Un alumno que no es mío no se muestra.** La lista de Mis alumnos es la
 *    que decide, y un id que no está ahí no aparece: es la misma respuesta que
 *    da el backend, que contesta "no existe" y nunca "no podés".
 * 3. **El semáforo arranca vacío si nadie lo marcó.** Preseleccionar "va bien"
 *    convierte no haberlo mirado en haberlo aprobado.
 */

vi.mock('../api/docencia', () => ({
  misAlumnos: vi.fn(),
  misNotas: vi.fn(),
  misMaterialesSubidos: vi.fn(),
  miAgenda: vi.fn(),
  anotar: vi.fn(),
  corregirNota: vi.fn(),
  fijarSeguimiento: vi.fn(),
  cambiarVisibilidad: vi.fn(),
}))

const {
  anotar,
  cambiarVisibilidad,
  corregirNota,
  fijarSeguimiento,
  miAgenda,
  misAlumnos,
  misMaterialesSubidos,
  misNotas,
} = await import('../api/docencia')

const ID_ALUMNO = 7
const ID_USUARIO = 42
/** El de la participación de Juan en esa clase. NO es el de la reserva. */
const ID_PARTICIPACION = 900

function alumno(cambios: Partial<AlumnoDelProfesor> = {}): AlumnoDelProfesor {
  return {
    idAlumno: ID_ALUMNO,
    idUsuario: ID_USUARIO,
    nombre: 'Juan',
    apellido: 'Pérez',
    disciplinas: ['DJ'],
    estadoSeguimiento: null,
    observaciones: null,
    clasesRestantes: 5,
    ...cambios,
  }
}

/** Hoy, para que caiga adentro de la ventana de clases recientes. */
function hoyIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function clase(cambios: Partial<ReservaResumen> = {}): ReservaResumen {
  return {
    idReserva: 1556,
    idSala: 1,
    sala: 'Sala 1',
    idTipoUso: 1,
    tipoUso: 'Clase de DJ',
    color: '#e63946',
    esClase: true,
    idProfesor: 3,
    profesor: 'Ghezz Pérez',
    fecha: hoyIso(),
    horaInicio: '10:00:00',
    horaFin: '11:30:00',
    estado: 'FINALIZADA',
    notas: null,
    idReservaRecupera: null,
    motivoReprogramacion: null,
    participantes: [
      {
        idParticipacion: ID_PARTICIPACION,
        idUsuario: ID_USUARIO,
        nombre: 'Juan',
        apellido: 'Pérez',
        idInscripcion: 10,
        disciplina: 'DJ',
        estadoAsistencia: 'PRESENTE',
        observaciones: null,
      },
    ],
    ...cambios,
  }
}

function nota(cambios: Partial<NotaResumen> = {}): NotaResumen {
  return {
    idNota: 1,
    idAlumno: ID_ALUMNO,
    idParticipacion: null,
    fechaDeLaClase: null,
    contenido: 'Le cuesta el beatmatch a oído.',
    fechaCreacion: '2026-08-19T14:00:00Z',
    fechaModificacion: null,
    ...cambios,
  }
}

function material(cambios: Partial<MaterialResumen> = {}): MaterialResumen {
  return {
    idMaterial: 1,
    idProfesor: 3,
    profesor: 'Ghezz Pérez',
    idAlumno: ID_ALUMNO,
    alumno: 'Juan Pérez',
    esGrupal: false,
    titulo: 'Pack de samples',
    tipo: 'sample pack',
    urlExterna: 'https://drive.example/pack',
    visibleAlumno: false,
    fechaSubida: '2026-08-19T14:00:00Z',
    ...cambios,
  }
}

function montar(id: number = ID_ALUMNO) {
  return render(
    <MemoryRouter initialEntries={[`/mis-alumnos/${id}`]}>
      <Routes>
        <Route path="/mis-alumnos/:idAlumno" element={<FichaDeAlumnoPagina />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(misAlumnos).mockResolvedValue([alumno()])
  vi.mocked(misNotas).mockResolvedValue([nota()])
  vi.mocked(misMaterialesSubidos).mockResolvedValue([material()])
  vi.mocked(miAgenda).mockResolvedValue([clase()])
})

describe('de quién es la ficha', () => {
  it('muestra al alumno con lo suyo', async () => {
    montar()

    expect(await screen.findByText('Juan Pérez')).toBeDefined()
    expect(screen.getByText(/5 clases restantes/)).toBeDefined()
  })

  it('un alumno que no es mío no se muestra', async () => {
    montar(999)

    expect(await screen.findByText('Ese alumno no está en tu lista.')).toBeDefined()
    expect(screen.queryByText('Juan Pérez')).toBeNull()
  })
})

describe('el semáforo', () => {
  it('arranca sin marcar y no en "va bien"', async () => {
    montar()

    const estado = (await screen.findByLabelText(/Estado/)) as HTMLSelectElement
    expect(estado.value).toBe('')
  })

  it('guarda el estado que se elige', async () => {
    vi.mocked(fijarSeguimiento).mockResolvedValue({
      idSeguimiento: 1,
      idAlumno: ID_ALUMNO,
      estado: 'REQUIERE_ATENCION',
      observaciones: 'Faltó tres veces seguidas.',
      fechaActualizacion: '2026-08-19T15:00:00Z',
    })
    montar()

    await userEvent.selectOptions(await screen.findByLabelText(/Estado/), 'REQUIERE_ATENCION')
    await userEvent.type(
      screen.getByLabelText(/Observaciones/),
      'Faltó tres veces seguidas.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Guardar seguimiento' }))

    await waitFor(() => {
      expect(fijarSeguimiento).toHaveBeenCalledWith(ID_ALUMNO, {
        estado: 'REQUIERE_ATENCION',
        observaciones: 'Faltó tres veces seguidas.',
      })
    })
  })
})

describe('las notas', () => {
  it('lista lo que anoté', async () => {
    montar()

    // "Observación general" aparece dos veces en la pantalla —como opción del
    // desplegable y como etiqueta de la nota— y está bien que sea la misma
    // frase: es el mismo concepto. Por eso el caso mira adentro de la nota.
    const item = (await screen.findByText('Le cuesta el beatmatch a oído.')).closest('li')
    expect(item).not.toBeNull()
    expect(within(item as HTMLElement).getByText('Observación general')).toBeDefined()
  })

  /**
   * El caso central del módulo: lo que viaja es la participación (900) y no la
   * reserva (1556). Con el número equivocado la base contesta 409 y la nota se
   * pierde, o peor: sin el trigger de `V1` §8.3 quedaría colgada de la clase de
   * otra persona.
   */
  it('una nota de clase manda el id de la participación, no el de la reserva', async () => {
    vi.mocked(anotar).mockResolvedValue(
      nota({ idNota: 2, idParticipacion: ID_PARTICIPACION, fechaDeLaClase: hoyIso() }),
    )
    montar()

    await userEvent.type(await screen.findByLabelText('Nota'), 'Mejoró mucho el mixeo.')
    await userEvent.selectOptions(
      screen.getByLabelText(/Sobre qué clase/),
      String(ID_PARTICIPACION),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Guardar nota' }))

    await waitFor(() => {
      expect(anotar).toHaveBeenCalledWith({
        idAlumno: ID_ALUMNO,
        idParticipacion: ID_PARTICIPACION,
        contenido: 'Mejoró mucho el mixeo.',
      })
    })
  })

  it('sin elegir clase la nota es general y no lleva participación', async () => {
    vi.mocked(anotar).mockResolvedValue(nota({ idNota: 3 }))
    montar()

    await userEvent.type(await screen.findByLabelText('Nota'), 'Viene bien en general.')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar nota' }))

    await waitFor(() => {
      expect(anotar).toHaveBeenCalledWith({
        idAlumno: ID_ALUMNO,
        idParticipacion: undefined,
        contenido: 'Viene bien en general.',
      })
    })
  })

  /**
   * Una clase cancelada no se dictó, así que no puede haber una nota sobre ella
   * — y ofrecerla en el desplegable es ofrecer un error.
   */
  it('una clase cancelada no se ofrece para anotar', async () => {
    vi.mocked(miAgenda).mockResolvedValue([clase({ estado: 'CANCELADA' })])
    montar()

    await screen.findByText('Juan Pérez')
    expect(screen.getByText(/No diste clases con este alumno/)).toBeDefined()
  })

  it('corrige una nota ya escrita', async () => {
    vi.mocked(corregirNota).mockResolvedValue(
      nota({ contenido: 'Corregido.', fechaModificacion: '2026-08-19T16:00:00Z' }),
    )
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    const caja = screen.getByLabelText('Corregir la nota')
    await userEvent.clear(caja)
    await userEvent.type(caja, 'Corregido.')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar corrección' }))

    await waitFor(() => {
      expect(corregirNota).toHaveBeenCalledWith(1, 'Corregido.')
    })
  })
})

describe('el material', () => {
  /**
   * Acá se ve lo no publicado y en la pantalla del alumno no: el profesor
   * necesita ver qué tiene preparado.
   */
  it('muestra lo no publicado, dicho', async () => {
    montar()

    expect(await screen.findByText('Pack de samples')).toBeDefined()
    expect(screen.getByText('No publicado')).toBeDefined()
  })

  it('publicarlo es lo que lo hace visible para el alumno', async () => {
    vi.mocked(cambiarVisibilidad).mockResolvedValue(material({ visibleAlumno: true }))
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Publicar' }))

    await waitFor(() => {
      expect(cambiarVisibilidad).toHaveBeenCalledWith(1, true)
    })
    expect(await screen.findByText('Lo ve el alumno')).toBeDefined()
  })
})
