import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReprogramacionResumen, ReservaDelPortal } from '../api/tiposPortal'
import { MisReservasPagina } from './MisReservasPagina'

/**
 * Módulo 4 — mis clases y mis cabinas.
 *
 * Dos decisiones que los casos protegen:
 *
 * 1. **Las canceladas se muestran.** Enterarse de que se cayó una clase es para
 *    lo que se abre esta pantalla; esconderla hace que desaparezca sin que nadie
 *    explique nada.
 * 2. **La asistencia puede no existir.** Una cabina alquilada es tuya porque la
 *    pagaste, no porque estés anotado, y ahí no hay lista que tomar.
 */

vi.mock('../api/portal', () => ({
  misReservas: vi.fn(),
  misReprogramaciones: vi.fn(),
  pedirMoverLaClase: vi.fn(),
}))

const { misReservas, misReprogramaciones, pedirMoverLaClase } = await import('../api/portal')

function reserva(cambios: Partial<ReservaDelPortal> = {}): ReservaDelPortal {
  return {
    idReserva: 1,
    sala: 'Sala 1',
    tipoUso: 'Clase de DJ',
    color: '#e63946',
    esClase: true,
    profesor: 'Ghezz Pérez',
    fecha: '2026-09-07',
    horaInicio: '10:00:00',
    horaFin: '11:30:00',
    estado: 'CONFIRMADA',
    miAsistencia: 'PENDIENTE',
    ...cambios,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(misReservas).mockResolvedValue([reserva()])
  vi.mocked(misReprogramaciones).mockResolvedValue([])
})

describe('el listado', () => {
  it('muestra qué, cuándo, dónde y con quién', async () => {
    render(<MisReservasPagina />)

    // ⚠️ Las búsquedas van acotadas a la LISTA, no a la pantalla: arriba está
    // la pieza de "Lo próximo", que muestra la misma reserva en otro formato.
    // Ese duplicado es deliberado —la fila lleva los controles y la pieza no—
    // y está explicado en `MisReservasPagina`.
    const lista = within(await screen.findByRole('list'))

    expect(lista.getByText('Clase de DJ')).toBeDefined()
    expect(lista.getByText('10:00 a 11:30')).toBeDefined()
    expect(lista.getByText(/Sala 1/)).toBeDefined()
    expect(lista.getByText(/con Ghezz Pérez/)).toBeDefined()
  })

  it('destaca la próxima arriba, en palabras', async () => {
    // "El lunes" se lee sin pensar; "07/09" obliga a acordarse de qué día es hoy.
    render(<MisReservasPagina />)

    expect(await screen.findByText('Lo próximo')).toBeDefined()
  })

  it('avisa cuando no hay nada agendado', async () => {
    vi.mocked(misReservas).mockResolvedValue([])
    render(<MisReservasPagina />)

    expect(await screen.findByText(/No tenés nada agendado/)).toBeDefined()
  })
})

describe('lo que pasó con cada una', () => {
  it('una clase cancelada se muestra, marcada', async () => {
    vi.mocked(misReservas).mockResolvedValue([reserva({ estado: 'CANCELADA' })])
    render(<MisReservasPagina />)

    expect(await screen.findByText('Cancelada')).toBeDefined()
    // Una cancelada NO es "lo próximo": no sale de la lista y no se destaca.
    expect(screen.getByText('Clase de DJ')).toBeDefined()
  })

  it('dice si faltaste', async () => {
    vi.mocked(misReservas).mockResolvedValue([reserva({ miAsistencia: 'AUSENTE' })])
    render(<MisReservasPagina />)

    expect(await screen.findByText('Faltaste')).toBeDefined()
  })

  /**
   * El caso del alquiler: la reserva es mía por la plata y no por estar anotado,
   * así que no hay asistencia que mostrar. Que no rompa es la mitad; la otra es
   * que no invente un "pendiente" que nadie va a resolver.
   */
  it('una cabina que pagué no muestra asistencia', async () => {
    vi.mocked(misReservas).mockResolvedValue([
      reserva({ tipoUso: 'Alquiler de cabina', esClase: false, profesor: null, miAsistencia: null }),
    ])
    render(<MisReservasPagina />)

    const lista = within(await screen.findByRole('list'))

    expect(lista.getByText('Alquiler de cabina')).toBeDefined()
    expect(screen.queryByText('Asististe')).toBeNull()
    expect(screen.queryByText('Faltaste')).toBeNull()
  })
})


/**
 * Pedir que muevan una clase (Fase 2.4).
 *
 * Los casos cuidan tres cosas, y las tres son de la misma familia: **el botón
 * dice la verdad sobre lo que va a pasar**.
 */
describe('pedir otro día', () => {
  function pedido(cambios: Partial<ReprogramacionResumen> = {}): ReprogramacionResumen {
    return {
      idSolicitud: 5,
      idUsuario: 3,
      nombre: 'Ana',
      apellido: 'Pérez',
      idReserva: 1,
      sala: 'Sala 1',
      tipoUso: 'Clase de DJ',
      fecha: '2026-09-07',
      horaInicio: '10:00:00',
      horaFin: '11:30:00',
      motivo: 'Me cambiaron el turno',
      fechaAlternativaSolicitada: null,
      estado: 'PENDIENTE',
      respuesta: null,
      resueltaPor: null,
      fechaSolicitud: '2026-08-29T10:00:00-03:00',
      fechaResolucion: null,
      ...cambios,
    }
  }

  it('se puede pedir sobre una clase que todavía no pasó', async () => {
    render(<MisReservasPagina />)

    expect(await screen.findByRole('button', { name: 'Pedir otro día' })).toBeDefined()
  })

  /**
   * No hay nada que mover en una clase caída, y el backend lo rechaza. Ofrecer
   * el botón sería ofrecer algo que va a fallar.
   */
  it('no se ofrece sobre una clase cancelada', async () => {
    vi.mocked(misReservas).mockResolvedValue([reserva({ estado: 'CANCELADA' })])
    render(<MisReservasPagina />)

    await screen.findByText('Cancelada')
    expect(screen.queryByRole('button', { name: 'Pedir otro día' })).toBeNull()
  })

  /** El motivo es obligatorio: es lo único que administración tiene para evaluar. */
  it('no manda el pedido sin motivo', async () => {
    render(<MisReservasPagina />)
    await userEvent.click(await screen.findByRole('button', { name: 'Pedir otro día' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mandar el pedido' }))

    expect(vi.mocked(pedirMoverLaClase)).not.toHaveBeenCalled()
  })

  it('manda el motivo y el día preferido', async () => {
    vi.mocked(pedirMoverLaClase).mockResolvedValue(pedido())
    render(<MisReservasPagina />)

    await userEvent.click(await screen.findByRole('button', { name: 'Pedir otro día' }))
    await userEvent.type(screen.getByLabelText(/Por qué no podés/), 'Me cambiaron el turno')
    await userEvent.click(screen.getByRole('button', { name: 'Mandar el pedido' }))

    await waitFor(() =>
      expect(pedirMoverLaClase).toHaveBeenCalledWith({
        idReserva: 1,
        motivo: 'Me cambiaron el turno',
        fechaAlternativa: undefined,
      }),
    )
  })

  /**
   * **La pantalla dice en qué quedó el pedido, y por eso no hay una pantalla
   * "mis pedidos de cambio"**: un pedido de mover algo no se entiende sin la cosa
   * que se quiere mover.
   */
  it('con un pedido pendiente muestra el estado en vez del botón', async () => {
    vi.mocked(misReprogramaciones).mockResolvedValue([pedido()])
    render(<MisReservasPagina />)

    expect(await screen.findByText(/esperando respuesta/)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Pedir otro día' })).toBeNull()
  })

  /** Un "no" sin el porqué no sirve para nada: con el motivo se pide otro día. */
  it('un pedido rechazado muestra el motivo', async () => {
    vi.mocked(misReprogramaciones).mockResolvedValue([
      pedido({ estado: 'RECHAZADA', respuesta: 'Esa semana no hay sala libre' }),
    ])
    render(<MisReservasPagina />)

    expect(await screen.findByText(/No se pudo mover/)).toBeDefined()
    expect(screen.getByText(/Esa semana no hay sala libre/)).toBeDefined()
  })
})
