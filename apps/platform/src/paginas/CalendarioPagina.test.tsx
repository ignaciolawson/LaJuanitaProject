import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReservaResumen, SalaResumen, TipoUsoResumen } from '../api/tiposAdmin'
import type { UsuarioActual as Actual } from '../api/tipos'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { diaYMes, filasDeHoras, lunesDe, ocupaLaHora, sumarDias } from '../componentes/semana'
import { CalendarioPagina } from './CalendarioPagina'

/**
 * Módulo 2 — la grilla semanal.
 *
 * Los casos apuntan a lo que **se rompe en silencio** en un calendario: una
 * reserva que existe y no se dibuja, y una fecha corrida un día. Las dos fallan
 * sin error, y las dos terminan con dos personas en la misma sala.
 */

vi.mock('../api/administracion', () => ({
  agenda: vi.fn(),
  agregarParticipante: vi.fn(),
  listarAlumnos: vi.fn(),
  listarInscripciones: vi.fn(),
  listarSalas: vi.fn(),
  listarTiposUso: vi.fn(),
  listarProfesores: vi.fn(),
  listarUsuarios: vi.fn(),
  altaReserva: vi.fn(),
  editarReserva: vi.fn(),
  cambiarEstadoReserva: vi.fn(),
  cambiarAsistencia: vi.fn(),
}))

const {
  agenda,
  agregarParticipante,
  altaReserva,
  listarAlumnos,
  listarInscripciones,
  listarProfesores,
  listarSalas,
  listarTiposUso,
  listarUsuarios,
} = await import('../api/administracion')

function pagina<T>(contenido: T[]) {
  return { contenido, pagina: 0, tamanio: 20, totalElementos: contenido.length, totalPaginas: 1 }
}

// El lunes de la semana que usan los casos que renderizan.
const LUNES = lunesDe(hoyIso())

function hoyIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function reserva(cambios: Partial<ReservaResumen> = {}): ReservaResumen {
  return {
    idReserva: 1,
    idSala: 1,
    sala: 'Sala 1',
    idTipoUso: 1,
    tipoUso: 'Clase de DJ',
    color: '#e63946',
    esClase: true,
    idProfesor: 5,
    profesor: 'Lucas Ferreyra',
    fecha: LUNES,
    horaInicio: '10:00:00',
    horaFin: '11:30:00',
    estado: 'CONFIRMADA',
    notas: null,
    idReservaRecupera: null,
    motivoReprogramacion: null,
    participantes: [],
    ...cambios,
  }
}

function sala(idSala: number, nombre: string, cambios: Partial<SalaResumen> = {}): SalaResumen {
  return {
    idSala,
    nombre,
    descripcion: null,
    activa: true,
    orden: idSala,
    usosPermitidos: [{ idTipoUso: 1, advertencia: null }],
    ...cambios,
  }
}

const SALAS: SalaResumen[] = [sala(1, 'Sala 1'), sala(2, 'Sala 2')]

const TIPOS: TipoUsoResumen[] = [
  { idTipoUso: 1, codigo: 'CLASE_DJ', nombre: 'Clase de DJ', esClase: true, color: '#e63946', activo: true },
]

function usuario(rol: Actual['rol']): Actual {
  return {
    id: 1,
    nombre: 'Prueba',
    apellido: 'Prueba',
    email: 'prueba@lajuanita.local',
    telefono: null,
    rol,
    fotoPerfil: null,
    esAlumno: false,
    esProfesor: false,
    debeCambiarPassword: false,
  }
}

function montar(rol: Actual['rol'] = 'STAFF') {
  const contexto: ContextoAuth = {
    sesion: { estado: 'autenticado', usuario: usuario(rol) },
    iniciarSesion: async () => {},
    registrarse: async () => {},
    cerrarSesion: () => {},
    refrescarUsuario: async () => {},
  }

  return render(
    <AuthContext value={contexto}>
      <CalendarioPagina />
    </AuthContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarSalas).mockResolvedValue(SALAS)
  vi.mocked(listarTiposUso).mockResolvedValue(TIPOS)
  vi.mocked(listarProfesores).mockResolvedValue([])
  vi.mocked(listarAlumnos).mockResolvedValue(pagina([]) as never)
  vi.mocked(listarInscripciones).mockResolvedValue(pagina([]) as never)
  vi.mocked(listarUsuarios).mockResolvedValue(pagina([]) as never)
  vi.mocked(agenda).mockResolvedValue([reserva()])
})

describe('las filas de la grilla', () => {
  /** Con la agenda vacía, la grilla es el horario del estudio: 10 a 18. */
  it('sin reservas dibuja el horario del estudio', () => {
    expect(filasDeHoras([])).toEqual([10, 11, 12, 13, 14, 15, 16, 17])
  })

  /**
   * <b>El peor error posible en un calendario.</b> Una reserva cargada a las 8 de
   * la mañana —fuera del horario del estudio— no puede quedar invisible: nadie
   * reporta lo que no ve, y el resultado es dos personas en la misma sala.
   */
  it('una reserva antes de la apertura agrega su fila', () => {
    const filas = filasDeHoras([{ horaInicio: '08:00:00', horaFin: '09:30:00' }])

    expect(filas[0]).toBe(8)
    expect(filas).toContain(9)
  })

  it('una reserva que termina después del cierre agrega su fila', () => {
    expect(filasDeHoras([{ horaInicio: '19:00:00', horaFin: '20:30:00' }])).toContain(20)
  })

  /** La hora de fin es exclusiva: 17:00–18:00 no necesita una fila 18. */
  it('una reserva que termina en punto no agrega una fila de más', () => {
    expect(filasDeHoras([{ horaInicio: '17:00:00', horaFin: '18:00:00' }])).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17,
    ])
  })
})

describe('el lunes de la semana', () => {
  /**
   * `new Date('2026-08-16')` se interpreta como UTC y en Argentina devuelve el
   * día anterior. Un calendario corrido un día es un calendario roto, y no avisa.
   */
  it('un domingo pertenece a la semana que empezó el lunes anterior', () => {
    expect(lunesDe('2026-08-16')).toBe('2026-08-10') // 16/08/2026 es domingo
  })

  it('un lunes es su propio lunes', () => {
    expect(lunesDe('2026-08-10')).toBe('2026-08-10')
  })

  it('cruza el cambio de mes sin correrse', () => {
    expect(lunesDe('2026-09-02')).toBe('2026-08-31')
  })
})

describe('la grilla', () => {
  it('pide la semana completa al backend', async () => {
    montar()

    await waitFor(() => expect(agenda).toHaveBeenCalled())
    const pedido = vi.mocked(agenda).mock.calls[0][0]
    expect(pedido.desde).toBe(LUNES)
    // Siete días: de lunes a domingo.
    expect(pedido.hasta).not.toBe(LUNES)
  })

  it('dibuja la reserva con su horario y su sala', async () => {
    montar()

    expect(await screen.findByText('10:00–11:30')).toBeDefined()
    expect(screen.getAllByText('Sala 1').length).toBeGreaterThan(0)
  })

  /** Al abrir un bloque se ve quién viene y con qué estado. */
  it('al elegir una reserva muestra sus participantes', async () => {
    const user = userEvent.setup()
    vi.mocked(agenda).mockResolvedValue([
      reserva({
        participantes: [
          {
            idParticipacion: 1,
            idUsuario: 100,
            nombre: 'Camila',
            apellido: 'Ríos',
            idInscripcion: 7,
            disciplina: 'DJ',
            estadoAsistencia: 'PENDIENTE',
            observaciones: null,
          },
        ],
      }),
    ])

    montar()
    await user.click(await screen.findByText('10:00–11:30'))

    expect(await screen.findByText('Ríos, Camila')).toBeDefined()
    expect(screen.getByText(/Quiénes vienen/)).toBeDefined()
  })

  /** Sin inscripción, la clase no le descuenta nada — y hay que verlo. */
  it('avisa cuando un participante no descuenta clases', async () => {
    const user = userEvent.setup()
    vi.mocked(agenda).mockResolvedValue([
      reserva({
        participantes: [
          {
            idParticipacion: 1,
            idUsuario: 100,
            nombre: 'Suelto',
            apellido: 'Alquiler',
            idInscripcion: null,
            disciplina: null,
            estadoAsistencia: 'PENDIENTE',
            observaciones: null,
          },
        ],
      }),
    ])

    montar()
    await user.click(await screen.findByText('10:00–11:30'))

    expect(await screen.findByText('(no descuenta clases)')).toBeDefined()
  })
})

/**
 * <b>El bug que reportó Ignacio el 2026-08-16:</b> *"solamente dejaba tener 1
 * reserva por día"*. No era una regla del backend —la API acepta las dos— sino
 * la grilla, y eran dos defectos que se sumaban: una celda con una sala ocupada
 * no ofrecía cargar en las otras, y una clase de 1:30 se dibujaba solo en la
 * fila donde arranca.
 */
describe('varias reservas el mismo día', () => {
  function hueco(dia: string, hora: number) {
    return `Cargar reserva el ${diaYMes(dia)} a las ${String(hora).padStart(2, '0')}:00`
  }

  /** La celda es un día por una hora, y adentro hay tres salas. */
  it('con la Sala 1 ocupada, la celda sigue ofreciendo cargar', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByLabelText(hueco(LUNES, 10)))

    expect(await screen.findByRole('heading', { name: 'Nueva reserva' })).toBeDefined()
    // Y la única sala libre viene puesta: ofrecer la ocupada es ofrecer un 409.
    expect(screen.getByLabelText<HTMLSelectElement>('Sala').value).toBe('2')
  })

  it('sin ninguna sala libre a esa hora no ofrece el hueco', async () => {
    vi.mocked(agenda).mockResolvedValue([
      reserva({ idReserva: 1, idSala: 1, sala: 'Sala 1' }),
      reserva({ idReserva: 2, idSala: 2, sala: 'Sala 2' }),
    ])

    montar()
    await screen.findAllByText('10:00–11:30')

    expect(screen.queryByLabelText(hueco(LUNES, 10))).toBeNull()
  })

  /** Misma definición canónica que el EXCLUDE: una cancelada no ocupa nada. */
  it('una reserva cancelada no bloquea la sala', async () => {
    const user = userEvent.setup()
    vi.mocked(agenda).mockResolvedValue([
      reserva({ idReserva: 1, idSala: 1, sala: 'Sala 1', estado: 'CANCELADA' }),
      reserva({ idReserva: 2, idSala: 2, sala: 'Sala 2' }),
    ])

    montar()
    await user.click(await screen.findByLabelText(hueco(LUNES, 10)))

    expect(screen.getByLabelText<HTMLSelectElement>('Sala').value).toBe('1')
  })

  /**
   * El segundo defecto, y el que hacía ver el sistema como si no dejara cargar:
   * con el formulario ya abierto, clickear otro hueco no cambiaba nada en
   * pantalla. Se guardaba contra la franja del primer clic y la base la
   * rechazaba por solapamiento.
   */
  it('clickear otro hueco con el formulario abierto lo reapunta', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByLabelText(hueco(LUNES, 12)))
    expect(screen.getByLabelText<HTMLInputElement>('Fecha').value).toBe(LUNES)
    expect(screen.getByLabelText<HTMLInputElement>('Desde').value).toBe('12:00')

    const martes = sumarDias(LUNES, 1)
    await user.click(screen.getByLabelText(hueco(martes, 15)))

    expect(screen.getByLabelText<HTMLInputElement>('Fecha').value).toBe(martes)
    expect(screen.getByLabelText<HTMLInputElement>('Desde').value).toBe('15:00')
  })
})

describe('una reserva ocupa todas sus filas, no solo la de arranque', () => {
  it('una clase de 1:30 ocupa también la fila siguiente', () => {
    const clase = { horaInicio: '10:00:00', horaFin: '11:30:00' }

    expect(ocupaLaHora(clase, 10)).toBe(true)
    expect(ocupaLaHora(clase, 11)).toBe(true)
    expect(ocupaLaHora(clase, 12)).toBe(false)
  })

  it('el fin es exclusivo: 10:00–11:00 no ocupa la fila 11', () => {
    expect(ocupaLaHora({ horaInicio: '10:00:00', horaFin: '11:00:00' }, 11)).toBe(false)
  })

  /** Sin esto la fila 11 parecía libre, y era la Sala 1 a las 11 dada dos veces. */
  it('la grilla dibuja la continuación en la fila que la reserva sigue ocupando', async () => {
    montar()

    expect(await screen.findByText('10:00–11:30')).toBeDefined()
    expect(screen.getByTitle(/sigue desde 10:00/)).toBeDefined()
  })
})

/**
 * <b>La pieza que le faltaba al Módulo 2 y que se agregó el 2026-08-16.</b> El
 * backend expone `POST /api/reservas/{id}/participantes` desde que se construyó
 * el módulo, pero ninguna pantalla lo usaba: no se podía anotar a nadie en una
 * clase, así que no se podía tomar lista, las clases restantes nunca bajaban y
 * el historial del alumno quedaba vacío para siempre.
 */
describe('anotar a alguien en una clase', () => {
  const ALUMNOS = [
    { idAlumno: 3, idUsuario: 30, nombre: 'Camila', apellido: 'Ríos', email: 'c@e.com' },
  ]

  async function abrirDetalle() {
    const user = userEvent.setup()
    vi.mocked(listarAlumnos).mockResolvedValue(pagina(ALUMNOS) as never)
    montar()
    await user.click(await screen.findByText('10:00–11:30'))
    return user
  }

  it('el detalle ofrece anotar', async () => {
    await abrirDetalle()

    expect(screen.getByRole('button', { name: '+ Anotar a alguien' })).toBeDefined()
  })

  /** La inscripción es lo que hace que la clase descuente del curso. */
  it('anota al alumno descontando de su curso', async () => {
    const user = await abrirDetalle()
    vi.mocked(listarInscripciones).mockResolvedValue(
      pagina([{ idInscripcion: 7, disciplina: 'DJ', clasesRestantes: 5 }]) as never,
    )
    vi.mocked(agregarParticipante).mockResolvedValue({} as never)

    await user.click(screen.getByRole('button', { name: '+ Anotar a alguien' }))
    await user.selectOptions(await screen.findByLabelText('Quién'), '3')
    await user.click(screen.getByRole('button', { name: 'Anotar' }))

    await waitFor(() => expect(agregarParticipante).toHaveBeenCalled())
    const [idReserva, cuerpo] = vi.mocked(agregarParticipante).mock.calls[0]
    expect(idReserva).toBe(1)
    // El usuario, no el alumno: `usuario` es la identidad raíz.
    expect(cuerpo.idUsuario).toBe(30)
    // Con un solo curso vigente viene puesto: no hay nada que elegir.
    expect(cuerpo.idInscripcion).toBe(7)
  })

  /** Un alquiler de cabina no descuenta de ningún curso, y eso es válido. */
  it('se puede anotar a alguien sin descontar clases', async () => {
    const user = await abrirDetalle()
    vi.mocked(listarInscripciones).mockResolvedValue(pagina([]) as never)
    vi.mocked(agregarParticipante).mockResolvedValue({} as never)

    await user.click(screen.getByRole('button', { name: '+ Anotar a alguien' }))
    await user.selectOptions(await screen.findByLabelText('Quién'), '3')
    await user.click(screen.getByRole('button', { name: 'Anotar' }))

    await waitFor(() => expect(agregarParticipante).toHaveBeenCalled())
    expect(vi.mocked(agregarParticipante).mock.calls[0][1].idInscripcion).toBeNull()
  })

  /**
   * El rechazo más caro del módulo: `V9` §5 impide consumir más clases que las
   * contratadas, y su mensaje nombra la salida. Tiene que llegar tal cual.
   */
  it('muestra el rechazo de la base tal como viene', async () => {
    const { ApiError } = await import('../api/cliente')
    const user = await abrirDetalle()
    vi.mocked(listarInscripciones).mockResolvedValue(
      pagina([{ idInscripcion: 7, disciplina: 'DJ', clasesRestantes: 0 }]) as never,
    )
    vi.mocked(agregarParticipante).mockRejectedValue(
      new ApiError(409, 'Esa inscripcion ya consumio sus 8 clases contratadas'),
    )

    await user.click(screen.getByRole('button', { name: '+ Anotar a alguien' }))
    await user.selectOptions(await screen.findByLabelText('Quién'), '3')
    await user.click(screen.getByRole('button', { name: 'Anotar' }))

    expect(
      await screen.findByText('Esa inscripcion ya consumio sus 8 clases contratadas'),
    ).toBeDefined()
  })

  it('un DIRECTIVO no puede anotar a nadie', async () => {
    const user = userEvent.setup()
    montar('DIRECTIVO')
    await user.click(await screen.findByText('10:00–11:30'))

    expect(screen.queryByRole('button', { name: '+ Anotar a alguien' })).toBeNull()
  })
})

/**
 * <b>Paso 2 de la seña (P8 / DB-04a), 2026-08-17.</b>
 *
 * El alta de una clase carga al alumno en el mismo pedido que la reserva. No es
 * comodidad: el `CONSTRAINT TRIGGER` de `V10` corre al COMMIT y busca el dinero
 * detrás de la reserva, que para una clase es la inscripción del que asiste — con
 * el alta vacía, ese COMMIT no tiene nada que mirar y rechaza toda alta de clase.
 *
 * <b>Y estos casos existen porque `altaReserva` estaba mockeado y ningún caso lo
 * ejercía</b>: el formulario de alta no tenía una sola prueba que lo enviara. Es
 * el mismo agujero que el 2026-08-16 dejó al Módulo 2 sin poder anotar a nadie —
 * cada mitad probaba su lado de un puente que nadie cruzaba.
 */
describe('el alta carga la clase junto con su alumno', () => {
  const GRABACION: TipoUsoResumen = {
    idTipoUso: 9,
    codigo: 'GRABACION_SET',
    nombre: 'Grabación de set',
    esClase: false,
    color: '#457b9d',
    activo: true,
  }
  /** La única excepción de la seña (§13), y por eso está en las fixtures. */
  const MIX: TipoUsoResumen = {
    idTipoUso: 4,
    codigo: 'MIX_MASTERING',
    nombre: 'Mix & Mastering',
    esClase: false,
    color: '#8d5a97',
    activo: true,
  }
  const TODOS = [
    { idTipoUso: 1, advertencia: null },
    { idTipoUso: 9, advertencia: null },
    { idTipoUso: 4, advertencia: null },
  ]
  const ALUMNOS = [
    { idAlumno: 3, idUsuario: 30, nombre: 'Camila', apellido: 'Ríos', email: 'c@e.com' },
  ]
  // Quien alquila puede no ser alumno de nada: la seña lista usuarios, no alumnos.
  const PERSONAS = [
    { id: 30, nombre: 'Camila', apellido: 'Ríos', email: 'c@e.com', telefono: null,
      rol: 'USUARIO' as const, activo: true, debeCambiarPassword: false },
  ]

  /** Por el hueco de la grilla, que ya deja puestas la sala, la fecha y la hora. */
  async function abrirAlta() {
    const user = userEvent.setup()
    vi.mocked(agenda).mockResolvedValue([])
    vi.mocked(listarSalas).mockResolvedValue([sala(1, 'Sala 1', { usosPermitidos: TODOS })])
    vi.mocked(listarTiposUso).mockResolvedValue([...TIPOS, GRABACION, MIX])
    vi.mocked(listarAlumnos).mockResolvedValue(pagina(ALUMNOS) as never)
    vi.mocked(listarUsuarios).mockResolvedValue(pagina(PERSONAS) as never)
    vi.mocked(listarInscripciones).mockResolvedValue(
      pagina([{ idInscripcion: 7, disciplina: 'DJ', clasesRestantes: 5 }]) as never,
    )
    vi.mocked(altaReserva).mockResolvedValue({} as never)

    montar()
    await user.click(
      await screen.findByLabelText(`Cargar reserva el ${diaYMes(LUNES)} a las 10:00`),
    )
    return user
  }

  it('una clase manda al alumno y su inscripción en el mismo pedido', async () => {
    const user = await abrirAlta()

    await user.selectOptions(screen.getByLabelText('Para qué'), '1')
    await user.selectOptions(await screen.findByLabelText('Quién'), '3')
    // Con un solo curso vigente viene puesto; sin esperarlo, el click puede salir
    // antes de que llegue y la clase no descontaría de nada.
    await waitFor(() =>
      expect(screen.getByLabelText<HTMLSelectElement>('Descuenta de').value).toBe('7'),
    )

    await user.click(screen.getByRole('button', { name: 'Reservar' }))

    await waitFor(() => expect(altaReserva).toHaveBeenCalled())
    const cuerpo = vi.mocked(altaReserva).mock.calls[0][0]
    // El usuario, no el alumno: `usuario` es la identidad raíz.
    expect(cuerpo.participantes).toEqual([{ idUsuario: 30, idInscripcion: 7 }])
  })

  /**
   * <b>La otra mitad de la decisión, y la fácil de romper "arreglando" la
   * primera:</b> una grabación de set no tiene a quién anotar. Pero **sí tiene
   * que pagar**: su plata llega por `pago.id_reserva`, que es el otro camino de
   * `V10`. Pedirle un alumno dejaría incargable medio calendario; no pedirle nada
   * lo dejaría incargable igual, contra el trigger.
   */
  it('una grabación de set pide seña en vez de participantes', async () => {
    const user = await abrirAlta()

    await user.selectOptions(screen.getByLabelText('Para qué'), '9')

    expect(screen.queryByLabelText('Quién')).toBeNull()
    expect(await screen.findByLabelText('Quién paga')).toBeDefined()

    await user.selectOptions(screen.getByLabelText('Quién paga'), '30')
    await user.type(screen.getByLabelText('Monto'), '45000')
    await user.click(screen.getByRole('button', { name: 'Reservar' }))

    await waitFor(() => expect(altaReserva).toHaveBeenCalled())
    const cuerpo = vi.mocked(altaReserva).mock.calls[0][0]
    expect(cuerpo.participantes).toBeUndefined()
    expect(cuerpo.sena).toMatchObject({
      idUsuario: 30,
      monto: 45000,
      moneda: 'ARS',
      medioPago: 'EFECTIVO',
    })
  })

  /** El espejo del caso de la clase sin alumno, por el otro camino del dinero. */
  it('una grabación sin seña no se manda', async () => {
    const user = await abrirAlta()

    await user.selectOptions(screen.getByLabelText('Para qué'), '9')
    await screen.findByLabelText('Quién paga')
    await user.click(screen.getByRole('button', { name: 'Reservar' }))

    expect(await screen.findByText(/Decí quién paga la seña/)).toBeDefined()
    expect(altaReserva).not.toHaveBeenCalled()
  })

  /**
   * La única excepción de la regla, y va por catálogo y no por estado: lo decide
   * Ghezz caso por caso, y el relevamiento ya lo mostraba fiado.
   */
  it('mix & mastering no pide seña: es la excepción de Ghezz', async () => {
    const user = await abrirAlta()

    await user.selectOptions(screen.getByLabelText('Para qué'), '4')

    expect(screen.queryByLabelText('Quién paga')).toBeNull()
    expect(screen.queryByLabelText('Quién')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Reservar' }))

    await waitFor(() => expect(altaReserva).toHaveBeenCalled())
    expect(vi.mocked(altaReserva).mock.calls[0][0].sena).toBeUndefined()
  })

  /**
   * La mitad de la seña que impone la pantalla (§13). Hasta que exista `V10` esta
   * es la única que la sostiene, y después sigue siendo la que la explica: el
   * trigger rechaza al COMMIT con un mensaje de base, no con este.
   */
  it('una clase sin alumno no se manda', async () => {
    const user = await abrirAlta()

    await user.selectOptions(screen.getByLabelText('Para qué'), '1')
    await user.click(screen.getByRole('button', { name: 'Reservar' }))

    expect(await screen.findByText(/una clase se carga junto con quién la toma/)).toBeDefined()
    expect(altaReserva).not.toHaveBeenCalled()
  })

  /** El listado de alumnos no se pide hasta que haga falta: son ~80 filas. */
  it('no trae el listado de alumnos para cargar una grabación', async () => {
    const user = await abrirAlta()

    await user.selectOptions(screen.getByLabelText('Para qué'), '9')

    await waitFor(() => expect(screen.queryByLabelText('Quién')).toBeNull())
    expect(listarAlumnos).not.toHaveBeenCalled()
  })

  /** Mover una reserva no toca a los participantes: el PUT no los lleva. */
  it('mover una reserva no pide participantes', async () => {
    const user = userEvent.setup()
    vi.mocked(listarSalas).mockResolvedValue([sala(1, 'Sala 1', { usosPermitidos: TODOS })])
    vi.mocked(listarTiposUso).mockResolvedValue([...TIPOS, GRABACION, MIX])
    montar()

    await user.click(await screen.findByText('10:00–11:30'))
    await user.click(screen.getByRole('button', { name: 'Mover' }))

    expect(await screen.findByRole('heading', { name: 'Mover la reserva' })).toBeDefined()
    expect(screen.queryByLabelText('Quién')).toBeNull()
  })
})

describe('eje de escritura (SEC-05)', () => {
  it('un DIRECTIVO ve el calendario y ningún botón de escritura', async () => {
    montar('DIRECTIVO')

    expect(await screen.findByText('10:00–11:30')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Nueva reserva' })).toBeNull()
  })

  it.each(['ADMIN', 'STAFF'] as const)('un %s sí puede reservar', async (rol) => {
    montar(rol)

    expect(await screen.findByRole('button', { name: 'Nueva reserva' })).toBeDefined()
  })
})

describe('errores', () => {
  it('si la agenda falla se muestra el mensaje', async () => {
    const { ApiError } = await import('../api/cliente')
    vi.mocked(agenda).mockRejectedValue(new ApiError(500, 'La base no responde.'))

    montar()

    expect(await screen.findByText('La base no responde.')).toBeDefined()
  })

  it('sin nada reservado lo dice', async () => {
    vi.mocked(agenda).mockResolvedValue([])

    montar()

    expect(await screen.findByText('No hay nada reservado esta semana.')).toBeDefined()
  })
})
