import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

import type { EstadoDeCuenta } from '../api/tiposAdmin'
import { EstadoDeCuentaPagina } from './EstadoDeCuentaPagina'

/**
 * Módulo 3, pantalla 2 — el estado de cuenta.
 *
 * <p>Lo que esta pantalla <b>no</b> tiene que hacer es tan importante como lo que
 * hace: **no hay un saldo único** (§3.3) y **las monedas no se restan entre sí**
 * (§2.3). Los casos fijan las dos cosas, porque las dos son fáciles de "arreglar"
 * después con un total que parecería más prolijo y sería mentira.
 */

vi.mock('../api/administracion', () => ({
  estadoDeCuenta: vi.fn(),
  abrirComprobante: vi.fn(),
}))

const { estadoDeCuenta, abrirComprobante } = await import('../api/administracion')

function cuenta(cambios: Partial<EstadoDeCuenta> = {}): EstadoDeCuenta {
  return {
    idUsuario: 10,
    nombre: 'Camila',
    apellido: 'Ríos',
    email: 'camila@ejemplo.com',
    saldos: [{ moneda: 'ARS', pagado: 90000, adeudado: 0 }],
    contratos: [
      {
        idInscripcion: 5,
        disciplina: 'DJ',
        nivel: 'INICIAL',
        estado: 'ACTIVA',
        moneda: 'ARS',
        precioTotal: 180000,
        pagado: 90000,
        saldo: 90000,
        senado: true,
        saldado: false,
      },
    ],
    pagos: [],
    ...cambios,
  }
}

function montar() {
  return render(
    <MemoryRouter initialEntries={['/admin/estado-de-cuenta/10']}>
      <Routes>
        <Route path="/admin/estado-de-cuenta/:idUsuario" element={<EstadoDeCuentaPagina />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(estadoDeCuenta).mockResolvedValue(cuenta())
})

describe('los saldos', () => {
  it('muestra lo pagado por moneda', async () => {
    montar()

    expect(await screen.findByText('Ríos, Camila')).toBeDefined()
    expect(screen.getByText('Pesos')).toBeDefined()
    expect(screen.getAllByText('$ 90.000,00').length).toBeGreaterThan(0)
  })

  /** §2.3: dos monedas son dos renglones, nunca una resta. */
  it('los pesos y los dólares van en renglones separados', async () => {
    vi.mocked(estadoDeCuenta).mockResolvedValue(
      cuenta({
        saldos: [
          { moneda: 'ARS', pagado: 90000, adeudado: 0 },
          { moneda: 'USD', pagado: 150, adeudado: 0 },
        ],
      }),
    )

    montar()

    expect(await screen.findByText('Pesos')).toBeDefined()
    expect(screen.getByText('Dólares')).toBeDefined()
    expect(screen.getByText('US$ 150,00')).toBeDefined()
  })

  it('lo adeudado se muestra en su moneda', async () => {
    vi.mocked(estadoDeCuenta).mockResolvedValue(
      cuenta({ saldos: [{ moneda: 'ARS', pagado: 90000, adeudado: 40000 }] }),
    )

    montar()

    expect(await screen.findByText('Debe $ 40.000,00')).toBeDefined()
  })
})

describe('los contratos', () => {
  /** §13: con el 50% cubierto ya se puede reservar. Es el dato previo al horario. */
  it('avisa si la seña está cubierta', async () => {
    montar()

    expect(await screen.findByText('Seña cubierta')).toBeDefined()
  })

  it('avisa cuando todavía no hay seña', async () => {
    vi.mocked(estadoDeCuenta).mockResolvedValue(
      cuenta({
        contratos: [
          {
            idInscripcion: 5,
            disciplina: 'DJ',
            nivel: null,
            estado: 'ACTIVA',
            moneda: 'ARS',
            precioTotal: 180000,
            pagado: 10000,
            saldo: 170000,
            senado: false,
            saldado: false,
          },
        ],
      }),
    )

    montar()

    expect(await screen.findByText('Sin seña')).toBeDefined()
  })

  it('un curso saldado lo dice', async () => {
    vi.mocked(estadoDeCuenta).mockResolvedValue(
      cuenta({
        contratos: [
          {
            idInscripcion: 5,
            disciplina: 'DJ',
            nivel: 'INICIAL',
            estado: 'ACTIVA',
            moneda: 'ARS',
            precioTotal: 180000,
            pagado: 180000,
            saldo: 0,
            senado: true,
            saldado: true,
          },
        ],
      }),
    )

    montar()

    expect(await screen.findByText('Saldado')).toBeDefined()
  })

  /**
   * <b>No hay un semáforo, y no puede haberlo</b> (§3.3): alguien puede tener DJ
   * al día y producción con deuda. Cada contrato lleva su propio saldo.
   */
  it('dos cursos con distinto estado se muestran por separado', async () => {
    vi.mocked(estadoDeCuenta).mockResolvedValue(
      cuenta({
        contratos: [
          {
            idInscripcion: 5,
            disciplina: 'DJ',
            nivel: 'INICIAL',
            estado: 'ACTIVA',
            moneda: 'ARS',
            precioTotal: 180000,
            pagado: 180000,
            saldo: 0,
            senado: true,
            saldado: true,
          },
          {
            idInscripcion: 6,
            disciplina: 'PRODUCCION',
            nivel: null,
            estado: 'ACTIVA',
            moneda: 'ARS',
            precioTotal: 300000,
            pagado: 0,
            saldo: 300000,
            senado: false,
            saldado: false,
          },
        ],
      }),
    )

    montar()

    expect(await screen.findByText('Saldado')).toBeDefined()
    expect(screen.getByText('Sin seña')).toBeDefined()
    expect(screen.getByText('Producción')).toBeDefined()
  })

  it('alguien sin inscripciones no ve una tabla vacía sino una frase', async () => {
    vi.mocked(estadoDeCuenta).mockResolvedValue(cuenta({ contratos: [], saldos: [] }))
    montar()

    expect(await screen.findByText('No tiene inscripciones.')).toBeDefined()
    expect(screen.getByText('Todavía no tiene movimientos.')).toBeDefined()
  })
})

describe('errores', () => {
  it('si falla lo dice y no deja media pantalla', async () => {
    const { ApiError } = await import('../api/cliente')
    vi.mocked(estadoDeCuenta).mockRejectedValue(new ApiError(404, 'No existe el usuario 10.'))

    montar()

    expect(await screen.findByText('No existe el usuario 10.')).toBeDefined()
    expect(screen.queryByText('Qué contrató')).toBeNull()
  })
})

/**
 * Los comprobantes, que hasta `V21` no se podían bajar de ningún lado: el campo
 * era una ruta escrita a mano y no había archivo detrás.
 */
describe('los comprobantes', () => {
  it('el comprobante se abre por el endpoint de ese pago', async () => {
    const user = userEvent.setup()
    vi.mocked(estadoDeCuenta).mockResolvedValue(
      cuenta({
        pagos: [
          {
            idPago: 3,
            idUsuario: 10,
            nombre: 'Camila',
            apellido: 'Ríos',
            email: 'camila@ejemplo.com',
            pagador: 'Camila Ríos',
            pagadorSinCuenta: false,
            destino: 'INSCRIPCION',
            lineaDeNegocio: 'CURSOS',
            idDestino: 5,
            queSalda: 'DJ · INICIAL',
            concepto: null,
            monto: 90000,
            moneda: 'ARS',
            cotizacionDolar: null,
            medioPago: 'TRANSFERENCIA',
            descuentoPorcentaje: 0,
            motivoDescuento: null,
            estadoPago: 'PAGADO',
            entro: true,
            comprobantes: [
              {
                idComprobante: 8,
                nombreOriginal: 'transferencia.pdf',
                cargadoPor: 'Micaela Gómez',
                fechaCreacion: '2026-08-30T14:00:00Z',
                invalido: false,
                invalidadoPor: null,
                fechaInvalidacion: null,
                motivoInvalidacion: null,
              },
            ],
            motivoAnulacion: null,
            fechaAnulacion: null,
            fechaPago: '2026-08-16',
            fechaRegistro: '2026-08-16T14:00:00Z',
          },
        ],
      }),
    )

    montar()
    await user.click(await screen.findByRole('button', { name: 'Ver comprobante' }))

    // Con el id del pago y el del comprobante: la ruta está anidada, y el backend
    // verifica que ese comprobante sea de ese pago.
    expect(abrirComprobante).toHaveBeenCalledWith(3, 8)
  })
})
