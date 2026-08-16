import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CajaDelPeriodo } from '../api/tiposAdmin'
import { CajaPagina } from './CajaPagina'

/**
 * Módulo 3, pantalla 3 — la caja.
 *
 * <p>Acá no hay reglas que romper: hay <b>una cifra que alguien va a usar para
 * decidir</b>. Los casos apuntan a las tres formas de que engañe — que los pesos
 * y los dólares se lean como una sola caja, que lo adeudado parezca haber
 * entrado, y que un período que falló deje en pantalla los números del anterior.
 */

vi.mock('../api/administracion', () => ({ caja: vi.fn() }))

const { caja } = await import('../api/administracion')

function moneda(cambios: Partial<CajaDelPeriodo> = {}): CajaDelPeriodo {
  return {
    moneda: 'ARS',
    ingresos: 100000,
    egresos: 30000,
    neto: 70000,
    adeudado: 0,
    cantidadDePagos: 4,
    cantidadDeEgresos: 1,
    porMedio: [{ medioPago: 'TRANSFERENCIA', monto: 100000, cantidad: 4 }],
    ...cambios,
  }
}

const VACIA: CajaDelPeriodo = {
  moneda: 'USD',
  ingresos: 0,
  egresos: 0,
  neto: 0,
  adeudado: 0,
  cantidadDePagos: 0,
  cantidadDeEgresos: 0,
  porMedio: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(caja).mockResolvedValue([moneda(), VACIA])
})

describe('las dos cajas', () => {
  it('muestra el neto, los ingresos y los egresos', async () => {
    render(<CajaPagina />)

    expect(await screen.findByText('$ 70.000,00')).toBeDefined()
    // Dos veces: como total de ingresos y como el único medio de pago.
    expect(screen.getAllByText('$ 100.000,00')).toHaveLength(2)
    expect(screen.getByText('− $ 30.000,00')).toBeDefined()
  })

  /** §2.3: no hay un total unificado, y no puede haberlo. */
  it('no muestra un total que sume pesos y dólares', async () => {
    vi.mocked(caja).mockResolvedValue([
      moneda(),
      moneda({ moneda: 'USD', ingresos: 300, egresos: 0, neto: 300, porMedio: [] }),
    ])

    render(<CajaPagina />)

    expect(await screen.findByText('Pesos')).toBeDefined()
    expect(screen.getByText('Dólares')).toBeDefined()
    // 70.000 + 300 no aparece en ninguna parte, ni en pesos ni en dólares.
    expect(screen.queryByText(/70\.300/)).toBeNull()
  })

  /** Una moneda sin movimientos sale igual: "en dólares no entró nada" es un dato. */
  it('una moneda sin movimientos aparece y lo dice', async () => {
    render(<CajaPagina />)

    expect(await screen.findByText('Dólares')).toBeDefined()
    expect(screen.getByText('Sin movimientos en este período.')).toBeDefined()
  })

  it('un neto negativo se muestra', async () => {
    vi.mocked(caja).mockResolvedValue([
      moneda({ ingresos: 10000, egresos: 50000, neto: -40000 }),
      VACIA,
    ])

    render(<CajaPagina />)

    expect(await screen.findByText('$ -40.000,00')).toBeDefined()
  })

  /** Contarlo como ingreso es decir que hay plata que nadie pagó. */
  it('lo adeudado se muestra aparte y aclarado', async () => {
    vi.mocked(caja).mockResolvedValue([moneda({ adeudado: 40000 }), VACIA])

    render(<CajaPagina />)

    expect(await screen.findByText('Adeudado')).toBeDefined()
    expect(screen.getByText(/no entró todavía/)).toBeDefined()
  })

  it('desglosa por dónde entró la plata', async () => {
    render(<CajaPagina />)

    expect(await screen.findByText('Transferencia (4)')).toBeDefined()
  })
})

describe('el período', () => {
  it('el atajo del mes cambia el rango pedido', async () => {
    const user = userEvent.setup()
    render(<CajaPagina />)

    await screen.findByText('Pesos')
    const anterior = vi.mocked(caja).mock.calls[0]

    await user.click(screen.getByRole('button', { name: 'Este mes' }))

    await waitFor(() => expect(vi.mocked(caja).mock.calls.at(-1)?.[0]).not.toBe(anterior[0]))
  })

  /**
   * Si falla, los números del período anterior <b>no</b> pueden quedar: se leen
   * como si fueran los pedidos, y una caja equivocada es peor que ninguna.
   */
  it('una caja que falla no deja los números viejos en pantalla', async () => {
    const { ApiError } = await import('../api/cliente')
    const user = userEvent.setup()

    render(<CajaPagina />)
    expect(await screen.findByText('$ 70.000,00')).toBeDefined()

    vi.mocked(caja).mockRejectedValue(new ApiError(400, 'La caja se pide de a un año como máximo.'))
    await user.click(screen.getByRole('button', { name: 'Este mes' }))

    expect(await screen.findByText('La caja se pide de a un año como máximo.')).toBeDefined()
    await waitFor(() => expect(screen.queryByText('$ 70.000,00')).toBeNull())
  })
})
