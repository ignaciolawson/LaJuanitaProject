import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsuarioActual as Actual } from '../api/tipos'
import type { ReprogramacionResumen } from '../api/tiposPortal'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { ReprogramacionesPagina } from './ReprogramacionesPagina'

/**
 * La bandeja de "no puedo ese día" (Fase 2.4).
 *
 * Lo que los casos cuidan:
 *
 * - **Aprobar es mover**: el "sí" es un formulario con la franja nueva, no un
 *   botón. Un pedido marcado como aprobado con la clase todavía en el día que la
 *   persona dijo que no podía no aprobó nada.
 * - **El horario viene prellenado con el que la clase tiene hoy**, y el día con
 *   el que la persona pidió. Prellenar la duración no es comodidad: acortarle una
 *   clase sin querer le cambia el curso al alumno.
 * - **El día pedido es una preferencia y la pantalla lo dice**, porque acá —al
 *   revés que en Pedidos de sala— no se aprueba tal como se pidió: quien pide no
 *   puede saber qué sala queda libre.
 * - Que un DIRECTIVO mire la bandeja sin poder resolverla.
 */

vi.mock('../api/portal', () => ({
  listarReprogramaciones: vi.fn(),
  aprobarReprogramacion: vi.fn(),
  rechazarReprogramacion: vi.fn(),
}))
vi.mock('../api/administracion', () => ({ listarSalas: vi.fn() }))

const { listarReprogramaciones, aprobarReprogramacion, rechazarReprogramacion } = await import(
  '../api/portal'
)
const { listarSalas } = await import('../api/administracion')

function pedido(cambios: Partial<ReprogramacionResumen> = {}): ReprogramacionResumen {
  return {
    idSolicitud: 7,
    idUsuario: 30,
    nombre: 'Camila',
    apellido: 'Ríos',
    idReserva: 12,
    sala: 'Sala 1',
    tipoUso: 'Clase de DJ',
    fecha: '2026-09-10',
    horaInicio: '16:00:00',
    horaFin: '17:30:00',
    motivo: 'Me cambiaron el turno del trabajo',
    fechaAlternativaSolicitada: '2026-09-17',
    estado: 'PENDIENTE',
    respuesta: null,
    resueltaPor: null,
    fechaSolicitud: '2026-08-29T10:00:00-03:00',
    fechaResolucion: null,
    ...cambios,
  }
}

function montar(rol: Actual['rol'] = 'STAFF') {
  const contexto: ContextoAuth = {
    sesion: {
      estado: 'autenticado',
      usuario: {
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
      },
    },
    iniciarSesion: async () => {},
    registrarse: async () => {},
    cerrarSesion: () => {},
    refrescarUsuario: async () => {},
  }

  return render(
    <AuthContext value={contexto}>
      <ReprogramacionesPagina />
    </AuthContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarReprogramaciones).mockResolvedValue({
    contenido: [pedido()],
    pagina: 0,
    tamanio: 20,
    totalElementos: 1,
    totalPaginas: 1,
  })
  vi.mocked(listarSalas).mockResolvedValue([
    {
      idSala: 1,
      nombre: 'Sala 1',
      descripcion: null,
      activa: true,
      orden: 1,
      usosPermitidos: [],
    },
    {
      idSala: 2,
      nombre: 'Sala 2',
      descripcion: null,
      activa: true,
      orden: 2,
      usosPermitidos: [],
    },
  ])
})

describe('la bandeja', () => {
  it('abre en lo que está esperando respuesta', async () => {
    montar()

    expect(await screen.findByText('Ríos, Camila')).toBeDefined()
    expect(vi.mocked(listarReprogramaciones).mock.calls[0][0]).toBe('PENDIENTE')
  })

  it('muestra qué clase se quiere mover y por qué', async () => {
    montar()

    expect(await screen.findByText(/Clase de DJ en Sala 1/)).toBeDefined()
    expect(screen.getByText(/16:00 a 17:30/)).toBeDefined()
    expect(screen.getByText(/Me cambiaron el turno del trabajo/)).toBeDefined()
  })

  /**
   * El día pedido no es una reserva: no trae hora ni sala. Decirlo en la pantalla
   * es lo que evita que alguien lo lea como un compromiso.
   */
  it('el día que pidió se muestra como preferencia', async () => {
    montar()

    expect(await screen.findByText(/es una\s+preferencia, no una reserva/)).toBeDefined()
  })

  it('un directivo mira la bandeja y no la resuelve', async () => {
    montar('DIRECTIVO')

    expect(await screen.findByText('Ríos, Camila')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Darle otro horario' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rechazar' })).toBeNull()
  })
})

describe('aprobar es mover', () => {
  /**
   * <b>El caso que sostiene la forma entera de la pantalla.</b> Si esto alguna
   * vez se convierte en un botón de "aprobar", el pedido queda resuelto con la
   * clase en el día que la persona dijo que no podía.
   */
  it('el sí es un formulario con la franja nueva, no un botón', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Darle otro horario' }))

    expect(screen.getByLabelText('Día')).toBeDefined()
    expect(vi.mocked(aprobarReprogramacion)).not.toHaveBeenCalled()
  })

  it('viene prellenado con el horario de la clase y el día pedido', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Darle otro horario' }))

    expect(screen.getByLabelText<HTMLInputElement>('Día').value).toBe('2026-09-17')
    expect(screen.getByLabelText<HTMLInputElement>('Hora de inicio').value).toBe('16:00')
    expect(screen.getByLabelText<HTMLInputElement>('Hora de fin').value).toBe('17:30')
  })

  it('mueve la clase con lo que quedó en el formulario', async () => {
    vi.mocked(aprobarReprogramacion).mockResolvedValue(pedido({ estado: 'APROBADA' }))
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Darle otro horario' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mover la clase' }))

    await waitFor(() => expect(aprobarReprogramacion).toHaveBeenCalled())
    expect(vi.mocked(aprobarReprogramacion).mock.calls[0][1]).toMatchObject({
      idSala: 1,
      fecha: '2026-09-17',
      horaInicio: '16:00',
      horaFin: '17:30',
    })
  })

  it('no manda un horario dado vuelta', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Darle otro horario' }))
    await userEvent.clear(screen.getByLabelText('Hora de fin'))
    await userEvent.type(screen.getByLabelText('Hora de fin'), '15:00')
    await userEvent.click(screen.getByRole('button', { name: 'Mover la clase' }))

    expect(screen.getByText(/posterior a la de inicio/)).toBeDefined()
    expect(vi.mocked(aprobarReprogramacion)).not.toHaveBeenCalled()
  })
})

describe('rechazar', () => {
  it('no rechaza sin motivo', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(vi.mocked(rechazarReprogramacion)).not.toHaveBeenCalled()
  })

  it('rechaza con el motivo, que es lo que le llega a la persona', async () => {
    vi.mocked(rechazarReprogramacion).mockResolvedValue(
      pedido({ estado: 'RECHAZADA', respuesta: 'Esa semana no hay sala libre' }),
    )
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))
    await userEvent.type(screen.getByLabelText(/Motivo/), 'Esa semana no hay sala libre')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(rechazarReprogramacion).toHaveBeenCalledWith(7, 'Esa semana no hay sala libre'),
    )
  })
})
