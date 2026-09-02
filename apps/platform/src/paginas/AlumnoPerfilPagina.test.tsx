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
 * vigentes.
 *
 * **Los seis bloques de §4 están, desde el 2026-08-19.** Eran dos cuando se
 * escribió esta suite y los otros llegaron con sus módulos: historial de clases
 * y estado de cuenta con el 2 y el 3, notas y materiales con el 5. Cada uno tuvo
 * su caso de "todavía no disponible" hasta el día que se construyó, que es
 * exactamente para lo que servían esos casos.
 */

vi.mock('../api/administracion', () => ({
  obtenerAlumno: vi.fn(),
  listarInscripciones: vi.fn(),
  agenda: vi.fn(),
  estadoDeCuenta: vi.fn(),
  notasDelAlumno: vi.fn(),
  materialesDelAlumno: vi.fn(),
}))

const {
  agenda,
  estadoDeCuenta,
  listarInscripciones,
  materialesDelAlumno,
  notasDelAlumno,
  obtenerAlumno,
} = await import('../api/administracion')

/** El de hoy, para que el historial —que pide los últimos 45 días— lo alcance. */
function hoyIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function claseDe(idUsuario: number, cambios: Record<string, unknown> = {}) {
  return {
    idReserva: 1,
    idSala: 1,
    sala: 'Sala 1',
    idTipoUso: 1,
    tipoUso: 'Clase de DJ',
    color: '#e63946',
    esClase: true,
    idProfesor: null,
    profesor: null,
    fecha: hoyIso(),
    horaInicio: '10:00:00',
    horaFin: '11:30:00',
    estado: 'FINALIZADA',
    notas: null,
    idReservaRecupera: null,
    motivoReprogramacion: null,
    participantes: [
      {
        idParticipacion: 1,
        idUsuario,
        nombre: 'Juan',
        apellido: 'Pérez',
        idInscripcion: 7,
        disciplina: 'DJ',
        estadoAsistencia: 'PRESENTE',
        observaciones: null,
      },
    ],
    ...cambios,
  }
}

const CUENTA_VACIA = {
  idUsuario: 100,
  nombre: 'Juan',
  apellido: 'Pérez',
  email: 'juan@lajuanita.local',
  saldos: [],
  contratos: [],
  pagos: [],
}

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
  vi.mocked(agenda).mockResolvedValue([])
  vi.mocked(estadoDeCuenta).mockResolvedValue(CUENTA_VACIA as never)
  vi.mocked(obtenerAlumno).mockResolvedValue(alumno())
  vi.mocked(listarInscripciones).mockResolvedValue(paginaDe([inscripcion()]))
  vi.mocked(notasDelAlumno).mockResolvedValue([])
  vi.mocked(materialesDelAlumno).mockResolvedValue([])
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

/**
 * <b>Bloque 6, el último que faltaba.</b> Hasta el Módulo 5 esta sección era un
 * cartel de "todavía no disponible" con el módulo que la traía; el caso que lo
 * exigía es el que avisó, al construirse el módulo, que había que reemplazarlo.
 * Con esto la ficha construye los seis bloques de §4 y no queda ninguno dicho.
 */
describe('las notas y los materiales', () => {
  /**
   * <b>La regla de §8 vista desde el otro lado</b>: las notas privadas no las ve
   * el alumno ni otro profesor, y administración sí. Firmadas, porque acá
   * conviven las de todos sus profesores y sin autor no se pueden leer.
   */
  it('muestra las notas de todos sus profesores, con quién las escribió', async () => {
    vi.mocked(notasDelAlumno).mockResolvedValue([
      {
        idNota: 1,
        idProfesor: 3,
        profesor: 'Ghezz Pérez',
        fechaDeLaClase: '2026-08-12',
        contenido: 'Le cuesta la mezcla.',
        fechaCreacion: '2026-08-12T14:00:00Z',
        fechaModificacion: null,
      },
    ])
    montar()

    expect(await screen.findByText('Le cuesta la mezcla.')).toBeDefined()
    expect(screen.getByText('Ghezz Pérez')).toBeDefined()
  })

  /**
   * Un material sin publicar todavía no lo tiene el alumno. Listarlo sin decirlo
   * hace creer que ya se lo entregaron, que es la única lectura equivocada que
   * este bloque puede provocar.
   */
  it('marca el material que el profesor todavía no publicó', async () => {
    vi.mocked(materialesDelAlumno).mockResolvedValue([
      {
        idMaterial: 1,
        idProfesor: 3,
        profesor: 'Ghezz Pérez',
        idAlumno: 7,
        alumno: 'Juan Pérez',
        idInscripcion: 7,
    curso: 'DJ · INICIAL',
    idReserva: null,
    clase: null,
        titulo: 'Proyecto de la clase 4',
        tipo: null,
        urlExterna: 'https://drive.example/x',
        visibleAlumno: false,
        fechaSubida: '2026-08-19T14:00:00Z',
      },
    ])
    montar()

    expect(await screen.findByText('Proyecto de la clase 4')).toBeDefined()
    expect(screen.getByText(/sin publicar/)).toBeDefined()
  })

  it('sin nada anotado lo dice, en vez de dejar el bloque vacío', async () => {
    montar()

    expect(await screen.findByText('Nadie anotó nada todavía.')).toBeDefined()
    expect(screen.getByText('Todavía no le entregaron material.')).toBeDefined()
  })

  /** Y ninguno de los seis bloques se sigue anunciando como pendiente. */
  it('ya no queda ninguna sección dicha como pendiente', async () => {
    montar()

    await screen.findByText('Notas de profesores y materiales')
    expect(screen.queryByText('Todavía no disponible')).toBeNull()
  })
})

/** Bloque 4, disponible desde el Módulo 2. */
describe('el historial de clases', () => {
  it('muestra las clases del alumno con su asistencia', async () => {
    vi.mocked(agenda).mockResolvedValue([claseDe(100)] as never)

    montar()

    expect(await screen.findByText('Historial de clases')).toBeDefined()
    expect(await screen.findByText(/Clase de DJ/)).toBeDefined()
    expect(screen.getByText('Presente')).toBeDefined()
  })

  /** La agenda es por sala: las clases de otro no son de este alumno. */
  it('no muestra las clases de otra persona', async () => {
    vi.mocked(agenda).mockResolvedValue([claseDe(999)] as never)

    montar()

    expect(await screen.findByText('No tiene clases cargadas en este período.')).toBeDefined()
  })

  /** Una cancelada es parte del historial: explica por qué no bajaron las clases. */
  it('muestra también las que se cayeron', async () => {
    vi.mocked(agenda).mockResolvedValue([claseDe(100, { estado: 'CANCELADA' })] as never)

    montar()

    expect(await screen.findByText('Cancelada')).toBeDefined()
  })

  it('avisa cuando una clase no descuenta del curso', async () => {
    vi.mocked(agenda).mockResolvedValue([
      claseDe(100, {
        participantes: [
          {
            idParticipacion: 1,
            idUsuario: 100,
            nombre: 'Juan',
            apellido: 'Pérez',
            idInscripcion: null,
            disciplina: null,
            estadoAsistencia: 'PRESENTE',
            observaciones: null,
          },
        ],
      }),
    ] as never)

    montar()

    expect(await screen.findByText('no descuenta clases')).toBeDefined()
  })
})

/** Bloque 5, disponible desde el Módulo 3. */
describe('el estado de cuenta', () => {
  it('muestra lo pagado por moneda', async () => {
    vi.mocked(estadoDeCuenta).mockResolvedValue({
      ...CUENTA_VACIA,
      saldos: [{ moneda: 'ARS', pagado: 90000, adeudado: 0 }],
    } as never)

    montar()

    expect(await screen.findByText('Pagado en pesos')).toBeDefined()
    expect(screen.getByText('$ 90.000,00')).toBeDefined()
  })

  /** §2.3: dos monedas son dos renglones, nunca una resta. */
  it('no mezcla pesos con dólares', async () => {
    vi.mocked(estadoDeCuenta).mockResolvedValue({
      ...CUENTA_VACIA,
      saldos: [
        { moneda: 'ARS', pagado: 90000, adeudado: 0 },
        { moneda: 'USD', pagado: 150, adeudado: 0 },
      ],
    } as never)

    montar()

    expect(await screen.findByText('Pagado en pesos')).toBeDefined()
    expect(screen.getByText('Pagado en dólares')).toBeDefined()
  })

  /** §13: sin el 50% cubierto no se le puede dar un horario. */
  it('avisa cuando a un curso le falta la seña', async () => {
    vi.mocked(estadoDeCuenta).mockResolvedValue({
      ...CUENTA_VACIA,
      saldos: [{ moneda: 'ARS', pagado: 10000, adeudado: 0 }],
      contratos: [
        {
          idInscripcion: 7,
          disciplina: 'DJ',
          nivel: 'INICIAL',
          estado: 'ACTIVA',
          moneda: 'ARS',
          precioTotal: 180000,
          pagado: 10000,
          saldo: 170000,
          senado: false,
          saldado: false,
        },
      ],
    } as never)

    montar()

    expect(await screen.findByText('sin seña')).toBeDefined()
    expect(screen.getByText('resta $ 170.000,00')).toBeDefined()
  })

  it('sin movimientos lo dice en vez de mostrar ceros', async () => {
    montar()

    expect(await screen.findByText('Todavía no tiene movimientos.')).toBeDefined()
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
