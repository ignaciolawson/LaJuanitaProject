import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AlumnoResumen, InscripcionResumen } from '../api/tiposAdmin'
import { AlumnoPerfilPagina } from './AlumnoPerfilPagina'

/**
 * Módulo 1, pantalla 3 — el perfil del alumno.
 *
 * Lo que estos casos sostienen es sobre todo **qué muestra y qué no**: el perfil
 * lista TODAS las inscripciones (ahí vive el "recorrido formativo, niveles
 * completados" del alcance) mientras que el listado de alumnos filtra por
 * vigentes, y **nombra las tres secciones que todavía no existen** en vez de
 * omitirlas.
 */

vi.mock('../api/administracion', () => ({
  obtenerAlumno: vi.fn(),
  listarInscripciones: vi.fn(),
}))

const { listarInscripciones, obtenerAlumno } = await import('../api/administracion')

function alumno(cambios: Partial<AlumnoResumen> = {}): AlumnoResumen {
  return {
    idAlumno: 10,
    idUsuario: 100,
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan@lajuanita.local',
    telefono: '11-5555-5555',
    nivelIngreso: 'INICIAL',
    estadoAlumno: 'ACTIVO',
    fechaIngreso: '2026-03-01',
    instagram: '@juan.dj',
    usuarioActivo: true,
    disciplinas: ['DJ'],
    ...cambios,
  }
}

function inscripcion(cambios: Partial<InscripcionResumen> = {}): InscripcionResumen {
  return {
    idInscripcion: 1,
    idAlumno: 10,
    idUsuario: 100,
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan@lajuanita.local',
    idProfesor: 5,
    profesor: 'Tomás Ghezzi',
    disciplina: 'DJ',
    nivel: 'INICIAL',
    clasesContratadas: 8,
    clasesConsumidas: 3,
    clasesRestantes: 5,
    precioTotal: 180000,
    moneda: 'ARS',
    cotizacionDolar: null,
    fechaInicio: '2026-09-01',
    estado: 'ACTIVA',
    notas: null,
    ...cambios,
  }
}

function paginaDe(contenido: InscripcionResumen[], totalPaginas = 1) {
  return {
    contenido,
    pagina: 0,
    tamanio: 20,
    totalElementos: contenido.length,
    totalPaginas,
  }
}

function montar(id: string | number = 10) {
  return render(
    <MemoryRouter initialEntries={[`/admin/alumnos/${id}`]}>
      <Routes>
        <Route path="/admin/alumnos/:id" element={<AlumnoPerfilPagina />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(obtenerAlumno).mockResolvedValue(alumno())
  vi.mocked(listarInscripciones).mockResolvedValue(paginaDe([inscripcion()]))
})

describe('los datos del alumno', () => {
  it('muestra la ficha y lo que está cursando hoy', async () => {
    montar()

    expect(await screen.findByText('Juan Pérez')).toBeDefined()
    expect(screen.getByText('juan@lajuanita.local')).toBeDefined()
    expect(screen.getByText('11-5555-5555')).toBeDefined()
    expect(screen.getByText('@juan.dj')).toBeDefined()
  })

  /** Dos ejes distintos: el alumno puede estar activo y la cuenta dada de baja. */
  it('avisa cuando la cuenta está desactivada', async () => {
    vi.mocked(obtenerAlumno).mockResolvedValue(alumno({ usuarioActivo: false }))

    montar()

    expect(await screen.findByText('Cuenta desactivada')).toBeDefined()
  })

  it('sin nada vigente lo dice en vez de dejar el bloque vacío', async () => {
    vi.mocked(obtenerAlumno).mockResolvedValue(alumno({ disciplinas: [] }))

    montar()

    expect(await screen.findByText('No tiene ninguna inscripción vigente.')).toBeDefined()
  })
})

describe('las inscripciones', () => {
  it('pide las de este alumno y ninguna más', async () => {
    montar(42)

    await waitFor(() => expect(listarInscripciones).toHaveBeenCalled())
    expect(vi.mocked(listarInscripciones).mock.calls[0][0]).toMatchObject({ idAlumno: 42 })
    expect(obtenerAlumno).toHaveBeenCalledWith(42)
  })

  /**
   * <b>La diferencia con el listado de alumnos.</b> Ese filtra por inscripciones
   * vigentes porque contesta "¿quién está cursando DJ?"; el perfil las trae
   * todas porque contesta "¿qué hizo esta persona?" — que es el *recorrido
   * formativo, niveles completados* que pide el Módulo 1. Por eso el pedido va
   * sin filtro de estado.
   */
  it('trae también las terminadas: el perfil es el recorrido completo', async () => {
    vi.mocked(listarInscripciones).mockResolvedValue(
      paginaDe([
        inscripcion(),
        inscripcion({
          idInscripcion: 2,
          disciplina: 'PRODUCCION',
          estado: 'COMPLETADA',
          clasesRestantes: 0,
          clasesConsumidas: 16,
          clasesContratadas: 16,
        }),
      ]),
    )

    montar()

    expect(await screen.findByText('Completada')).toBeDefined()
    expect(screen.getByText('Producción')).toBeDefined()
    // El pedido no lleva estado: filtrarlo escondería justo lo que se busca acá.
    expect(vi.mocked(listarInscripciones).mock.calls[0][0]).not.toHaveProperty('estado')
  })

  /**
   * Las clases restantes son por inscripción y no hay un total. Nadie "tiene 5
   * clases": tiene 5 de DJ y 3 de mentoría. Es el mismo razonamiento de §3.3 con
   * el estado de pago.
   */
  it('muestra las clases restantes de cada curso por separado', async () => {
    vi.mocked(listarInscripciones).mockResolvedValue(
      paginaDe([
        inscripcion(),
        inscripcion({
          idInscripcion: 2,
          disciplina: 'MENTORIA',
          clasesContratadas: 4,
          clasesRestantes: 3,
        }),
      ]),
    )

    montar()

    expect(await screen.findByText('5 de 8')).toBeDefined()
    expect(screen.getByText('3 de 4')).toBeDefined()
  })

  it('sin inscripciones lo dice con palabras', async () => {
    vi.mocked(listarInscripciones).mockResolvedValue(paginaDe([]))

    montar()

    expect(
      await screen.findByText('Este alumno todavía no tiene ninguna inscripción.'),
    ).toBeDefined()
  })
})

describe('lo que todavía no existe', () => {
  /**
   * El alcance pide seis bloques y esta pantalla puede construir dos. Los otros
   * tres se dibujan **dichos**: quien abre el perfil buscando el historial de
   * clases y no lo encuentra no puede distinguir "no está todavía" de "el
   * sistema perdió el dato".
   */
  it('nombra las tres secciones que faltan y el módulo que las trae', async () => {
    montar()

    expect(await screen.findByText('Todavía no disponible')).toBeDefined()
    expect(screen.getByText('Historial de clases')).toBeDefined()
    expect(screen.getByText('Estado de cuenta')).toBeDefined()
    expect(screen.getByText(/Módulo 2 — Horarios y salas/)).toBeDefined()
  })
})

describe('errores', () => {
  it('una dirección con un id que no es número no rompe la pantalla', async () => {
    montar('abc')

    expect(
      await screen.findByText('Esa dirección no corresponde a ningún alumno.'),
    ).toBeDefined()
    expect(obtenerAlumno).not.toHaveBeenCalled()
  })

  it('un alumno inexistente muestra el mensaje del backend', async () => {
    const { ApiError } = await import('../api/cliente')
    vi.mocked(obtenerAlumno).mockRejectedValue(new ApiError(404, 'No existe el alumno 99.'))

    montar(99)

    expect(await screen.findByText('No existe el alumno 99.')).toBeDefined()
  })

  /** Aun con error, la salida hacia el listado tiene que seguir estando. */
  it('el error deja el camino de vuelta', async () => {
    const { ApiError } = await import('../api/cliente')
    vi.mocked(obtenerAlumno).mockRejectedValue(new ApiError(404, 'No existe el alumno 99.'))

    montar(99)

    expect(await screen.findByRole('link', { name: /Volver a Alumnos/ })).toBeDefined()
  })
})
