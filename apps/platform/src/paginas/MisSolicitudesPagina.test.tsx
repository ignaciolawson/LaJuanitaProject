import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SolicitudResumen } from '../api/tiposPortal'
import { MisSolicitudesPagina } from './MisSolicitudesPagina'

/**
 * Módulo 4 — mis pedidos de sala.
 *
 * **Lo que rechazaron, y por qué, es la mitad útil de esta pantalla.** Sin el
 * motivo a la vista la persona vuelve a pedir lo mismo, que es exactamente lo
 * que la regla de la base —un rechazo no pasa sin explicación— existe para
 * evitar.
 */

vi.mock('../api/portal', () => ({ misSolicitudes: vi.fn(), cancelarSolicitud: vi.fn() }))

const { misSolicitudes, cancelarSolicitud } = await import('../api/portal')

function solicitud(cambios: Partial<SolicitudResumen> = {}): SolicitudResumen {
  return {
    idSolicitud: 3,
    idUsuario: 30,
    nombre: 'Camila',
    apellido: 'Ríos',
    email: 'camila@ejemplo.com',
    idSala: 1,
    sala: 'Sala 1',
    idTipoUso: 5,
    tipoUso: 'Alquiler de cabina',
    fecha: '2026-09-10',
    horaInicio: '16:00:00',
    horaFin: '18:00:00',
    comentario: null,
    estado: 'PENDIENTE',
    respuesta: null,
    resueltaPor: null,
    idReserva: null,
    fechaResolucion: null,
    fechaCreacion: '2026-08-19T10:00:00-03:00',
    ...cambios,
  }
}

function montar() {
  return render(
    <MemoryRouter>
      <MisSolicitudesPagina />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(misSolicitudes).mockResolvedValue([solicitud()])
})

describe('el listado', () => {
  it('dice que está esperando respuesta', async () => {
    montar()

    expect(await screen.findByText('Esperando respuesta')).toBeDefined()
    expect(screen.getByText(/16:00 a 18:00/)).toBeDefined()
  })

  it('muestra el motivo del rechazo y quién contestó', async () => {
    vi.mocked(misSolicitudes).mockResolvedValue([
      solicitud({
        estado: 'RECHAZADA',
        respuesta: 'esa tarde hay mantenimiento',
        resueltaPor: 'Micaela Gómez',
      }),
    ])
    montar()

    expect(await screen.findByText(/esa tarde hay mantenimiento/)).toBeDefined()
    expect(screen.getByText(/Micaela Gómez/)).toBeDefined()
  })

  it('una aprobada lleva a la reserva', async () => {
    vi.mocked(misSolicitudes).mockResolvedValue([
      solicitud({ estado: 'APROBADA', idReserva: 88 }),
    ])
    montar()

    expect(await screen.findByText('Confirmada')).toBeDefined()
    expect(screen.getByRole('link', { name: /Ver la reserva/ })).toBeDefined()
  })
})

describe('cancelar', () => {
  it('se puede cancelar lo que todavía está pendiente', async () => {
    vi.mocked(cancelarSolicitud).mockResolvedValue(solicitud({ estado: 'CANCELADA' }))
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(vi.mocked(cancelarSolicitud)).toHaveBeenCalledWith(3)
  })

  /**
   * Una resuelta no se toca — lo impide un trigger de `V13`, y ofrecer el botón
   * sería ofrecer un rechazo. Lo cancelado se sigue viendo porque una solicitud
   * no se borra nunca.
   */
  it('lo resuelto ya no se cancela', async () => {
    vi.mocked(misSolicitudes).mockResolvedValue([
      solicitud({ estado: 'CANCELADA' }),
      solicitud({ idSolicitud: 4, estado: 'APROBADA', idReserva: 12 }),
    ])
    montar()

    expect(await screen.findByText('Cancelada')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull()
  })
})
