import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReservaDelPortal } from '../api/tiposPortal'
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

vi.mock('../api/portal', () => ({ misReservas: vi.fn() }))

const { misReservas } = await import('../api/portal')

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
})

describe('el listado', () => {
  it('muestra qué, cuándo, dónde y con quién', async () => {
    render(<MisReservasPagina />)

    expect(await screen.findByText('Clase de DJ')).toBeDefined()
    expect(screen.getByText('10:00 a 11:30')).toBeDefined()
    expect(screen.getByText(/Sala 1/)).toBeDefined()
    expect(screen.getByText(/con Ghezz Pérez/)).toBeDefined()
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

    expect(await screen.findByText('Alquiler de cabina')).toBeDefined()
    expect(screen.queryByText('Asististe')).toBeNull()
    expect(screen.queryByText('Faltaste')).toBeNull()
  })
})
