import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import type { PagoResumen } from '../api/tiposAdmin'
import type { UsuarioActual as Actual } from '../api/tipos'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { PagosPagina } from './PagosPagina'

/**
 * Módulo 3, pantalla 1 — registrar pagos.
 *
 * <p>Los casos apuntan a lo que esta pantalla puede hacer mal <b>con la plata de
 * alguien</b>: ofrecer borrar lo que solo se anula, dejar pasar un descuento sin
 * justificar, o mandar un pago en dólares sin cotización — los tres terminan en
 * una fila que la base rechaza o, peor, en un registro que nadie puede explicar
 * después.
 */

vi.mock('../api/administracion', () => ({
  listarPagos: vi.fn(),
  registrarPago: vi.fn(),
  anularPago: vi.fn(),
  invalidarComprobante: vi.fn(),
  listarAlumnos: vi.fn(),
  listarInscripciones: vi.fn(),
}))

const { anularPago, invalidarComprobante, listarAlumnos, listarInscripciones, listarPagos, registrarPago } =
  await import('../api/administracion')

function pago(cambios: Partial<PagoResumen> = {}): PagoResumen {
  return {
    idPago: 1,
    idUsuario: 10,
    nombre: 'Camila',
    apellido: 'Ríos',
    email: 'camila@ejemplo.com',
    destino: 'INSCRIPCION',
    idDestino: 5,
    queSalda: 'DJ · INICIAL',
    concepto: 'Seña del curso',
    monto: 90000,
    moneda: 'ARS',
    cotizacionDolar: null,
    medioPago: 'TRANSFERENCIA',
    descuentoPorcentaje: 0,
    motivoDescuento: null,
    estadoPago: 'SENADO',
    entro: true,
    comprobantePath: null,
    comprobanteInvalido: false,
    motivoInvalidacion: null,
    motivoAnulacion: null,
    fechaAnulacion: null,
    fechaPago: '2026-08-16',
    fechaRegistro: '2026-08-16T14:00:00Z',
    ...cambios,
  }
}

/** Genérica: el mismo envoltorio sirve para pagos, alumnos e inscripciones. */
function pagina<T>(contenido: T[]) {
  return { contenido, pagina: 0, tamanio: 20, totalElementos: contenido.length, totalPaginas: 1 }
}

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
      <MemoryRouter>
        <PagosPagina />
      </MemoryRouter>
    </AuthContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarPagos).mockResolvedValue(pagina([pago()]))
  vi.mocked(listarAlumnos).mockResolvedValue(
    pagina([]) as never,
  )
  vi.mocked(listarInscripciones).mockResolvedValue(pagina([]) as never)
})

describe('el listado', () => {
  /** La columna que justifica el módulo: todo pago dice qué salda. */
  it('cada fila dice qué salda y cuánto', async () => {
    montar()

    expect(await screen.findByText('DJ · INICIAL')).toBeDefined()
    expect(screen.getByText('$ 90.000,00')).toBeDefined()
    expect(within(screen.getByRole('table')).getByText('Señado')).toBeDefined()
  })

  it('un descuento se muestra con su porcentaje', async () => {
    vi.mocked(listarPagos).mockResolvedValue(
      pagina([pago({ descuentoPorcentaje: 20, motivoDescuento: 'Ex alumno' })]),
    )

    montar()

    expect(await screen.findByText('20% de descuento')).toBeDefined()
  })

  /**
   * Una fila anulada sin explicación obliga a preguntarle a quien la anuló, que
   * es exactamente lo que `V7` quiso evitar al exigir el motivo.
   */
  it('un pago anulado muestra por qué', async () => {
    vi.mocked(listarPagos).mockResolvedValue(
      pagina([pago({ estadoPago: 'ANULADO', entro: false, motivoAnulacion: 'Se cargó dos veces' })]),
    )

    montar()

    // Se espera el motivo, no la tabla: la tabla se dibuja vacía enseguida y
    // `findByRole` resolvería antes de que lleguen las filas.
    expect(await screen.findByText('Se cargó dos veces')).toBeDefined()
    expect(within(screen.getByRole('table')).getByText('Anulado')).toBeDefined()
  })

  it('un comprobante invalidado se avisa', async () => {
    vi.mocked(listarPagos).mockResolvedValue(
      pagina([pago({ comprobantePath: '/c/1.pdf', comprobanteInvalido: true })]),
    )

    montar()

    expect(await screen.findByText('Comprobante inválido')).toBeDefined()
  })
})

/**
 * <b>En este esquema la plata no se borra</b> (`V6`), y el comprobante tampoco
 * (§6). Los dos caminos de reversa piden motivo, y el autor lo pone el servidor.
 */
describe('las dos operaciones de reversa', () => {
  it('no ofrece borrar un pago: ofrece anularlo', async () => {
    montar()

    expect(await screen.findByRole('button', { name: 'Anular' })).toBeDefined()
    expect(screen.queryByRole('button', { name: /Eliminar|Borrar/ })).toBeNull()
  })

  it('anular pide un motivo y lo manda', async () => {
    const user = userEvent.setup()
    vi.mocked(anularPago).mockResolvedValue(pago({ estadoPago: 'ANULADO' }))

    montar()
    await user.click(await screen.findByRole('button', { name: 'Anular' }))
    await user.type(screen.getByLabelText('Motivo'), 'Se cargó dos veces')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(anularPago).toHaveBeenCalledWith(1, 'Se cargó dos veces'))
  })

  it('sin motivo no anula nada', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Escribí el motivo.')).toBeDefined()
    expect(anularPago).not.toHaveBeenCalled()
  })

  /** Y el cartel dice qué va a pasar: que no se borra, y que sale de la caja. */
  it('avisa que el pago no se borra', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))

    expect(screen.getByText(/no se borra/)).toBeDefined()
  })

  it('invalidar el comprobante solo se ofrece si hay comprobante', async () => {
    vi.mocked(listarPagos).mockResolvedValue(pagina([pago({ comprobantePath: null })]))
    montar()

    await screen.findByRole('button', { name: 'Anular' })
    expect(screen.queryByRole('button', { name: 'Invalidar comprobante' })).toBeNull()
  })

  it('invalidar el comprobante manda el motivo', async () => {
    const user = userEvent.setup()
    vi.mocked(listarPagos).mockResolvedValue(pagina([pago({ comprobantePath: '/c/1.pdf' })]))
    vi.mocked(invalidarComprobante).mockResolvedValue(pago())

    montar()
    await user.click(await screen.findByRole('button', { name: 'Invalidar comprobante' }))
    await user.type(screen.getByLabelText('Motivo'), 'Era de otra transferencia')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(invalidarComprobante).toHaveBeenCalledWith(1, 'Era de otra transferencia'),
    )
  })

  /** Un pago ya anulado no se vuelve a anular: el backend lo rechaza y acá ni se ofrece. */
  it('un pago anulado no ofrece anularse de nuevo', async () => {
    vi.mocked(listarPagos).mockResolvedValue(pagina([pago({ estadoPago: 'ANULADO' })]))
    montar()

    await waitFor(() =>
      expect(within(screen.getByRole('table')).getByText('Anulado')).toBeDefined(),
    )
    expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull()
  })
})

describe('el alta', () => {
  async function abrir() {
    const user = userEvent.setup()
    vi.mocked(listarAlumnos).mockResolvedValue(
      pagina([
        {
          idAlumno: 3,
          idUsuario: 10,
          nombre: 'Camila',
          apellido: 'Ríos',
          email: 'camila@ejemplo.com',
        },
      ]) as never,
    )
    vi.mocked(listarInscripciones).mockResolvedValue(
      pagina([
        {
          idInscripcion: 5,
          disciplina: 'DJ',
          nivel: 'INICIAL',
          precioTotal: 180000,
          moneda: 'ARS',
        },
      ]) as never,
    )

    montar()
    await user.click(await screen.findByRole('button', { name: 'Registrar pago' }))
    return user
  }

  /** La regla del esquema: sin cotización, un importe en dólares no se reconstruye. */
  it('en dólares pide la cotización y no manda sin ella', async () => {
    const user = await abrir()

    await user.selectOptions(await screen.findByLabelText('Alumno'), '3')
    await user.selectOptions(await screen.findByLabelText('Qué salda'), '5')
    await user.type(screen.getByLabelText('Monto'), '150')
    await user.selectOptions(screen.getByLabelText('Moneda'), 'USD')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(
      await screen.findByText('Un pago en dólares necesita la cotización del día.'),
    ).toBeDefined()
    expect(registrarPago).not.toHaveBeenCalled()
  })

  /** El campo de cotización solo aparece cuando hace falta: casi todo se cobra en pesos. */
  it('la cotización no molesta cuando el pago es en pesos', async () => {
    const user = await abrir()

    expect(screen.queryByLabelText(/Cotización del dólar/)).toBeNull()
    await user.selectOptions(screen.getByLabelText('Moneda'), 'USD')
    expect(screen.getByLabelText(/Cotización del dólar/)).toBeDefined()
  })

  it('un descuento sin justificación no se manda', async () => {
    const user = await abrir()

    await user.selectOptions(await screen.findByLabelText('Alumno'), '3')
    await user.selectOptions(await screen.findByLabelText('Qué salda'), '5')
    await user.type(screen.getByLabelText('Monto'), '90000')
    await user.type(screen.getByLabelText(/Descuento/), '20')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText('Un descuento necesita una justificación escrita.')).toBeDefined()
    expect(registrarPago).not.toHaveBeenCalled()
  })

  /** El pago se acredita al `usuario` del alumno, no al `alumno`: es la identidad raíz. */
  it('manda el pago contra la inscripción elegida', async () => {
    const user = await abrir()
    vi.mocked(registrarPago).mockResolvedValue(pago())

    await user.selectOptions(await screen.findByLabelText('Alumno'), '3')
    await user.selectOptions(await screen.findByLabelText('Qué salda'), '5')
    await user.type(screen.getByLabelText('Monto'), '90000')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(registrarPago).toHaveBeenCalled())
    const enviado = vi.mocked(registrarPago).mock.calls[0][0]
    expect(enviado.idUsuario).toBe(10)
    expect(enviado.idInscripcion).toBe(5)
    expect(enviado.monto).toBe(90000)
  })

  /** Un pago no se registra ya anulado: el backend lo rechaza y acá ni se ofrece. */
  it('no ofrece cargar un pago anulado', async () => {
    await abrir()

    const estados = screen.getByLabelText<HTMLSelectElement>('Estado')
    expect([...estados.options].map((o) => o.value)).not.toContain('ANULADO')
  })
})

describe('eje de escritura', () => {
  it('un DIRECTIVO ve los pagos y no toca nada', async () => {
    montar('DIRECTIVO')

    expect(await screen.findByText('DJ · INICIAL')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull()
  })

  it.each(['ADMIN', 'STAFF'] as const)('un %s sí puede registrar', async (rol) => {
    montar(rol)

    expect(await screen.findByRole('button', { name: 'Registrar pago' })).toBeDefined()
  })
})
