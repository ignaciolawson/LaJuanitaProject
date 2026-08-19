import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NotificacionResumen } from '../api/tiposPortal'
import { NotificacionesPagina } from './NotificacionesPagina'

/**
 * Módulo 4 — la bandeja de avisos.
 *
 * **El aviso tiene que bastarse solo.** No hay mail ni WhatsApp detrás de esto:
 * la persona lo lee cuando entra, así que el motivo de un rechazo viaja adentro
 * del texto y no como un "entrá a ver". El caso que lo pinea es el segundo.
 */

vi.mock('../api/portal', () => ({
  misNotificaciones: vi.fn(),
  marcarLeida: vi.fn(),
  marcarTodasLeidas: vi.fn(),
}))

const { misNotificaciones, marcarLeida, marcarTodasLeidas } = await import('../api/portal')

function aviso(cambios: Partial<NotificacionResumen> = {}): NotificacionResumen {
  return {
    idNotificacion: 1,
    tipo: 'SOLICITUD_APROBADA',
    titulo: 'Te confirmamos la sala',
    contenido: 'Tu pedido de alquiler de cabina en Sala 1 para el 10/09 a las 16:00 está confirmado.',
    urlDestino: '/mis-reservas',
    leida: false,
    fechaCreacion: '2026-08-19T10:20:00-03:00',
    ...cambios,
  }
}

function montar() {
  return render(
    <MemoryRouter>
      <NotificacionesPagina />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(misNotificaciones).mockResolvedValue([aviso()])
  vi.mocked(marcarLeida).mockResolvedValue(aviso({ leida: true }))
  vi.mocked(marcarTodasLeidas).mockResolvedValue(1)
})

describe('la bandeja', () => {
  it('cuenta las que no se leyeron', async () => {
    montar()

    expect(await screen.findByText('1 sin leer')).toBeDefined()
    expect(screen.getByText('Te confirmamos la sala')).toBeDefined()
  })

  it('el motivo del rechazo viene adentro del aviso', async () => {
    vi.mocked(misNotificaciones).mockResolvedValue([
      aviso({
        tipo: 'SOLICITUD_RECHAZADA',
        titulo: 'No pudimos confirmarte la sala',
        contenido: 'Tu pedido para el 10/09 no se pudo confirmar: esa tarde hay mantenimiento.',
        urlDestino: '/mis-solicitudes',
      }),
    ])
    montar()

    expect(await screen.findByText(/esa tarde hay mantenimiento/)).toBeDefined()
  })

  it('lleva a donde pasó la cosa', async () => {
    montar()

    const enlace = await screen.findByRole('link', { name: 'Ver' })
    expect(enlace.getAttribute('href')).toBe('/mis-reservas')
  })

  it('avisa cuando no hay nada', async () => {
    vi.mocked(misNotificaciones).mockResolvedValue([])
    montar()

    expect(await screen.findByText('No tenés notificaciones.')).toBeDefined()
  })
})

describe('marcar como leídas', () => {
  it('de a una', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar leída' }))

    expect(vi.mocked(marcarLeida)).toHaveBeenCalledWith(1)
  })

  it('todas juntas', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar todas como leídas' }))

    expect(vi.mocked(marcarTodasLeidas)).toHaveBeenCalled()
  })

  it('sin nada sin leer no ofrece el botón', async () => {
    vi.mocked(misNotificaciones).mockResolvedValue([aviso({ leida: true })])
    montar()

    expect(await screen.findByText('Nada sin leer')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Marcar todas como leídas' })).toBeNull()
  })
})
