import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TrabajoDelPortal } from '../api/tiposMastering'
import { MisTrabajosPagina } from './MisTrabajosPagina'

/**
 * Módulo 6, el lado del cliente.
 *
 * **El caso que importa es el del premaster que todavía no está**: la pantalla no
 * puede ofrecer el link, y tiene que decir por qué falta. Que el link no llegue es
 * cosa del backend —viaja `null` hasta que se libera— pero **que la pantalla
 * explique la condición es lo único que evita que el cliente lea un botón roto**
 * donde hay una regla del negocio.
 */

vi.mock('../api/mastering', () => ({ misTrabajos: vi.fn() }))

const { misTrabajos } = await import('../api/mastering')

function trabajo(cambios: Partial<TrabajoDelPortal> = {}): TrabajoDelPortal {
  return {
    idTrabajo: 1,
    tipoTrabajo: 'MIX_MASTER',
    nombreTrack: 'Nocturno',
    estado: 'ENTREGADO',
    profesorAsignado: 'Ghezz Pérez',
    precioAcordado: 150,
    moneda: 'USD',
    revisionesIncluidas: 3,
    revisionesRealizadas: 1,
    fechaEstimada: '2026-09-01',
    fechaEntregaReal: null,
    urlMaster: 'https://drive.example/master',
    // Así llega mientras no esté liberado: el backend no lo manda.
    urlPremaster: null,
    premasterLiberado: false,
    ...cambios,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(misTrabajos).mockResolvedValue([trabajo()])
})

describe('el listado', () => {
  it('muestra el trabajo, su estado y las revisiones usadas', async () => {
    render(<MisTrabajosPagina />)

    expect(await screen.findByText('Nocturno')).toBeDefined()
    expect(screen.getByText('Entregado')).toBeDefined()
    expect(screen.getByText(/1 de 3 revisiones/)).toBeDefined()
  })

  it('sin trabajos dice cómo se piden', async () => {
    vi.mocked(misTrabajos).mockResolvedValue([])
    render(<MisTrabajosPagina />)

    expect(await screen.findByText(/Se piden por WhatsApp/)).toBeDefined()
  })
})

describe('el premaster', () => {
  /**
   * **La regla del módulo, vista desde el cliente.** El master se baja apenas
   * está; el premaster no, y la pantalla dice qué falta para que esté. Esa frase
   * no es decoración: sin ella el cliente ve que falta algo y no sabe qué hacer.
   */
  it('sin liberar no ofrece el link y explica qué falta', async () => {
    render(<MisTrabajosPagina />)

    expect(await screen.findByRole('link', { name: 'Bajar el master' })).toBeDefined()
    expect(screen.queryByRole('link', { name: 'Bajar el premaster' })).toBeNull()
    expect(screen.getByText(/se entrega una vez registrado el pago/i)).toBeDefined()
  })

  it('liberado, se puede bajar', async () => {
    vi.mocked(misTrabajos).mockResolvedValue([
      trabajo({ premasterLiberado: true, urlPremaster: 'https://drive.example/premaster' }),
    ])
    render(<MisTrabajosPagina />)

    const enlace = await screen.findByRole('link', { name: 'Bajar el premaster' })
    expect(enlace.getAttribute('href')).toBe('https://drive.example/premaster')
  })

  /**
   * El caso raro que conviene tener escrito: si el backend dijera "liberado" pero
   * no mandara el link, la pantalla no puede inventar un enlace vacío.
   */
  it('liberado pero sin link no dibuja un enlace roto', async () => {
    vi.mocked(misTrabajos).mockResolvedValue([
      trabajo({ premasterLiberado: true, urlPremaster: null }),
    ])
    render(<MisTrabajosPagina />)

    await screen.findByText('Nocturno')
    expect(screen.queryByRole('link', { name: 'Bajar el premaster' })).toBeNull()
  })
})

describe('lo que el cliente no ve', () => {
  /** Un trabajo cancelado se muestra tachado: enterarse es para lo que se abre esto. */
  it('un trabajo cancelado se muestra, marcado', async () => {
    vi.mocked(misTrabajos).mockResolvedValue([trabajo({ estado: 'CANCELADO' })])
    render(<MisTrabajosPagina />)

    expect(await screen.findByText('Cancelado')).toBeDefined()
    expect(screen.getByText('Nocturno')).toBeDefined()
  })
})
