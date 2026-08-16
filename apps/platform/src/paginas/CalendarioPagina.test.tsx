import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReservaResumen, SalaResumen, TipoUsoResumen } from '../api/tiposAdmin'
import type { UsuarioActual as Actual } from '../api/tipos'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { filasDeHoras, lunesDe } from '../componentes/semana'
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
  listarSalas: vi.fn(),
  listarTiposUso: vi.fn(),
  listarProfesores: vi.fn(),
  altaReserva: vi.fn(),
  editarReserva: vi.fn(),
  cambiarEstadoReserva: vi.fn(),
  cambiarAsistencia: vi.fn(),
}))

const { agenda, listarProfesores, listarSalas, listarTiposUso } = await import(
  '../api/administracion'
)

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

const SALAS: SalaResumen[] = [
  {
    idSala: 1,
    nombre: 'Sala 1',
    descripcion: null,
    activa: true,
    orden: 1,
    usosPermitidos: [{ idTipoUso: 1, advertencia: null }],
  },
]

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
