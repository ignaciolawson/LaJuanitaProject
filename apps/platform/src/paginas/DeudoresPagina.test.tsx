import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import type { Deudor } from '../api/tiposAdmin'
import { DeudoresPagina } from './DeudoresPagina'

/**
 * Módulo 3, pantalla 4 — deudores.
 *
 * <p>La pregunta que trae a esta pantalla es <b>a quién hay que llamar
 * primero</b>, y la respuesta es la deuda más vieja, no la más grande. Los casos
 * cuidan eso y las dos cosas que la hacen accionable: el teléfono a la vista
 * —el reclamo va por WhatsApp— y que una deuda en dos monedas se lea como dos
 * deudas, porque se reclaman por separado.
 */

vi.mock('../api/administracion', () => ({ listarDeudores: vi.fn() }))

const { listarDeudores } = await import('../api/administracion')

function deudor(cambios: Partial<Deudor> = {}): Deudor {
  return {
    idUsuario: 10,
    nombre: 'Camila',
    apellido: 'Ríos',
    email: 'camila@ejemplo.com',
    telefono: '11 5555 5555',
    moneda: 'ARS',
    adeudado: 40000,
    cantidadDePagos: 2,
    desde: '2026-06-01',
    diasDeAtraso: 30,
    vencido: true,
    motivo: 'DEUDA_ANOTADA',
    idInscripcion: null,
    disciplina: null,
    vence: null,
    ...cambios,
  }
}

function montar() {
  return render(
    <MemoryRouter>
      <DeudoresPagina />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarDeudores).mockResolvedValue([deudor()])
})

describe('el listado', () => {
  it('muestra cuánto debe y desde cuándo', async () => {
    montar()

    expect(await screen.findByText('Ríos, Camila')).toBeDefined()
    expect(screen.getByText('$ 40.000,00')).toBeDefined()
    expect(screen.getByText('hace 30 días')).toBeDefined()
    expect(screen.getByText('2 pagos pendientes')).toBeDefined()
  })

  /** El reclamo se hace por WhatsApp: el teléfono es el dato accionable. */
  it('muestra el teléfono', async () => {
    montar()

    expect(await screen.findByText('11 5555 5555')).toBeDefined()
  })

  it('avisa cuando alguien no tiene teléfono cargado', async () => {
    vi.mocked(listarDeudores).mockResolvedValue([deudor({ telefono: null })])
    montar()

    expect(await screen.findByText('Sin teléfono')).toBeDefined()
  })

  /**
   * Deber en pesos y en dólares son dos deudas: se reclaman por separado y
   * sumarlas exigiría una cotización que no corresponde a ninguna caja real.
   */
  it('quien debe en las dos monedas aparece dos veces', async () => {
    vi.mocked(listarDeudores).mockResolvedValue([
      deudor(),
      deudor({ moneda: 'USD', adeudado: 150 }),
    ])

    montar()

    expect(await screen.findAllByText('Ríos, Camila')).toHaveLength(2)
    expect(screen.getByText('US$ 150,00')).toBeDefined()
  })

  it('sin deudas lo dice', async () => {
    vi.mocked(listarDeudores).mockResolvedValue([])
    montar()

    expect(await screen.findByText('Nadie debe nada. Todo al día.')).toBeDefined()
  })
})

/** La regla dura de §6: pasados los 7 días, la deuda está vencida. */
describe('el vencimiento', () => {
  it('cuenta cuántas están vencidas', async () => {
    vi.mocked(listarDeudores).mockResolvedValue([
      deudor(),
      deudor({ idUsuario: 11, diasDeAtraso: 2, vencido: false }),
    ])

    montar()

    expect(await screen.findByText(/2 pendientes · 1 vencido/)).toBeDefined()
  })

  /**
   * P72: la segunda fuente. Una preinscripta dice "sin señar" y hasta cuándo;
   * pasado el plazo lo dice en rojo; y el saldo de una activa se lee como
   * "falta el resto" y **nunca** como vencido, por viejo que sea.
   */
  it('una preinscripta dice sin señar y hasta cuándo', async () => {
    vi.mocked(listarDeudores).mockResolvedValue([
      deudor({
        motivo: 'SIN_SENIAR',
        idInscripcion: 5,
        disciplina: 'DJ',
        vence: '2099-01-15T18:00:00-03:00',
        vencido: false,
        cantidadDePagos: 0,
        diasDeAtraso: 0,
      }),
    ])
    montar()

    expect(await screen.findByText('Sin señar')).toBeDefined()
    expect(screen.getByText('Hasta el 15/01 18:00')).toBeDefined()
    expect(screen.getByText('Programa de DJ')).toBeDefined()
    expect(screen.getByText(/1 pendiente · 1 sin señar/)).toBeDefined()
  })

  it('una preinscripta con el plazo pasado lo dice', async () => {
    vi.mocked(listarDeudores).mockResolvedValue([
      deudor({
        motivo: 'SIN_SENIAR',
        idInscripcion: 5,
        disciplina: 'DJ',
        vence: '2020-01-15T18:00:00-03:00',
        vencido: true,
        cantidadDePagos: 0,
      }),
    ])
    montar()

    expect(await screen.findByText('Venció el 15/01 18:00')).toBeDefined()
  })

  it('el saldo de un programa activo se lee como falta el resto, sin vencer', async () => {
    vi.mocked(listarDeudores).mockResolvedValue([
      deudor({
        motivo: 'FALTA_EL_RESTO',
        idInscripcion: 5,
        disciplina: 'PRODUCCION',
        vence: null,
        vencido: false,
        cantidadDePagos: 0,
        diasDeAtraso: 60,
      }),
    ])
    montar()

    expect(await screen.findByText('Seña abonada, falta el resto')).toBeDefined()
    expect(screen.getByText('Programa de Producción')).toBeDefined()
    expect(screen.queryByText(/vencid/)).toBeNull()
  })

  it('una deuda de hoy no dice "hace 0 días"', async () => {
    vi.mocked(listarDeudores).mockResolvedValue([deudor({ diasDeAtraso: 0, vencido: false })])
    montar()

    expect(await screen.findByText('hoy')).toBeDefined()
  })
})
