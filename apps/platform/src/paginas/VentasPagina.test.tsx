import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsuarioResumen, VentaResumen } from '../api/tiposAdmin'
import type { UsuarioActual as Actual } from '../api/tipos'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { VentasPagina } from './VentasPagina'
import { elegir } from '../pruebas/elegir'

/**
 * Módulo 3, pantalla 6 — la venta de equipamiento.
 *
 * Lo que persiguen estos casos no son cuentas: es **una operación que puede
 * quedar sin dueño**. El comprador puede no tener cuenta, el cobro puede no
 * existir todavía, y la fila no se puede borrar nunca — así que lo caro es que la
 * pantalla deje cargar algo que después nadie pueda reclamar, o que esconda una
 * venta sin cobrar.
 */

vi.mock('../api/administracion', () => ({
  listarVentas: vi.fn(),
  registrarVenta: vi.fn(),
  anularVenta: vi.fn(),
  listarUsuarios: vi.fn(),
}))

const { anularVenta, listarUsuarios, listarVentas, registrarVenta } =
  await import('../api/administracion')

const PERSONAS: UsuarioResumen[] = [
  {
    id: 1, nombre: 'Micaela', apellido: 'Prueba', email: 'm@e.com', telefono: null,
    rol: 'STAFF', activo: true, debeCambiarPassword: false,
  },
  {
    id: 30, nombre: 'Camila', apellido: 'Ríos', email: 'c@e.com', telefono: null,
    rol: 'USUARIO', activo: true, debeCambiarPassword: false,
  },
]

function venta(cambios: Partial<VentaResumen> = {}): VentaResumen {
  return {
    idVenta: 1,
    comprador: 'Camila Ríos',
    idUsuarioComprador: 30,
    contactoCompradorExterno: null,
    vendedor: 'Micaela Prueba',
    idUsuarioVendedor: 1,
    categoria: 'Controladora',
    marca: 'Pioneer',
    modeloEquipo: 'DDJ-FLX4',
    precio: 450000,
    moneda: 'ARS',
    cotizacionDolar: null,
    fechaVenta: '2026-08-17',
    notas: null,
    fechaRegistro: '2026-08-17T14:00:00Z',
    cobrada: true,
    anulada: false,
    motivoAnulacion: null,
    fechaAnulacion: null,
    ...cambios,
  }
}

function pagina<T>(contenido: T[]) {
  return { contenido, pagina: 0, tamanio: 20, totalElementos: contenido.length, totalPaginas: 1 }
}

function montar(rol: Actual['rol'] = 'STAFF') {
  const contexto: ContextoAuth = {
    sesion: {
      estado: 'autenticado',
      usuario: {
        id: 1,
        nombre: 'Micaela',
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
      <VentasPagina />
    </AuthContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarVentas).mockResolvedValue(pagina([venta()]) as never)
  vi.mocked(listarUsuarios).mockResolvedValue(pagina(PERSONAS) as never)
  vi.mocked(registrarVenta).mockResolvedValue({} as never)
  vi.mocked(anularVenta).mockResolvedValue({} as never)
})

describe('el listado', () => {
  it('muestra el equipo con su marca y categoría', async () => {
    montar()

    expect(await screen.findByText('DDJ-FLX4')).toBeDefined()
    expect(screen.getByText('Pioneer · Controladora')).toBeDefined()
  })

  /**
   * <b>Una venta sin cobrar que no se ve es una venta que nadie reclama.</b> Se
   * marca lo que falta y no lo normal: casi todas están cobradas.
   */
  it('avisa cuando una venta no está cobrada', async () => {
    vi.mocked(listarVentas).mockResolvedValue(pagina([venta({ cobrada: false })]) as never)
    montar()

    expect(await screen.findByText('sin cobrar')).toBeDefined()
  })

  it('una venta cobrada no lleva ninguna etiqueta', async () => {
    montar()

    await screen.findByText('DDJ-FLX4')
    expect(screen.queryByText('sin cobrar')).toBeNull()
  })

  /** A un comprador con cuenta se le puede cruzar el estado de cuenta; a un nombre suelto, no. */
  it('distingue al comprador sin cuenta y muestra su contacto', async () => {
    vi.mocked(listarVentas).mockResolvedValue(
      pagina([
        venta({
          comprador: 'Joaco (amigo de Ghezz)',
          idUsuarioComprador: null,
          contactoCompradorExterno: '11-5555-4444',
        }),
      ]) as never,
    )
    montar()

    expect(await screen.findByText(/sin cuenta · 11-5555-4444/)).toBeDefined()
  })

  it('sin ventas lo dice en vez de mostrar una tabla vacía', async () => {
    vi.mocked(listarVentas).mockResolvedValue(pagina([]) as never)
    montar()

    expect(await screen.findByText('No hay ventas cargadas.')).toBeDefined()
  })
})

describe('registrar una venta', () => {
  async function abrirAlta() {
    const user = userEvent.setup()
    montar()
    await user.click(await screen.findByRole('button', { name: 'Registrar venta' }))
    return user
  }

  it('carga una venta a alguien con cuenta y la cobra en el mismo gesto', async () => {
    const user = await abrirAlta()

    await user.type(screen.getByLabelText(/^Modelo/), 'DDJ-FLX4')
    await user.type(screen.getByLabelText('Precio'), '450000')
    await elegir(user, 'Quién compró', '30')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(registrarVenta).toHaveBeenCalled())
    const cuerpo = vi.mocked(registrarVenta).mock.calls[0][0]
    expect(cuerpo).toMatchObject({
      idUsuarioComprador: 30,
      modeloEquipo: 'DDJ-FLX4',
      precio: 450000,
      medioPago: 'EFECTIVO',
    })
    // Quien carga es quien vendió, salvo que se cambie: viene puesto.
    expect(cuerpo.idUsuarioVendedor).toBe(1)
  })

  /**
   * <b>El caso que justifica los dos caminos del comprador.</b> Mucha gente llega
   * por el acuerdo con Pioneer y no se registra en el sistema por comprar un CDJ.
   */
  it('carga una venta a alguien sin cuenta, con su contacto', async () => {
    const user = await abrirAlta()

    await user.click(screen.getByLabelText('No tiene cuenta'))
    await user.type(screen.getByLabelText('Nombre del comprador'), 'Joaco')
    await user.type(screen.getByLabelText(/^Contacto/), '11-5555-4444')
    await user.type(screen.getByLabelText(/^Modelo/), 'CDJ-3000')
    await user.type(screen.getByLabelText('Precio'), '2400000')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(registrarVenta).toHaveBeenCalled())
    const cuerpo = vi.mocked(registrarVenta).mock.calls[0][0]
    expect(cuerpo.nombreCompradorExterno).toBe('Joaco')
    expect(cuerpo.contactoCompradorExterno).toBe('11-5555-4444')
    expect(cuerpo.idUsuarioComprador).toBeUndefined()
  })

  /**
   * **Estos dos casos decían lo contrario hasta `V19`, y vale contar la vuelta.**
   *
   * Defendían que la pantalla deshabilitara el cobro para un comprador sin cuenta,
   * con un texto que explicaba por qué: `pago.id_usuario` era NOT NULL y no había
   * dónde colgar esa plata. Estaban bien escritos y eran correctos *para esa
   * versión del esquema*.
   *
   * Lo que no era, es una regla del negocio: era una **consecuencia técnica de una
   * columna**, y en el uso real resultó ser el hallazgo #1 de `docs/mejoras.md` —
   * **una venta a un comprador sin cuenta no se podía cobrar nunca**, y el que
   * compra un CDJ por el acuerdo con Pioneer no se registra en un estudio de
   * música por eso.
   *
   * Es el mismo tipo de test que el Módulo 8 encontró en `menu.test.ts`:
   * **defendía una interpretación, no un hecho.**
   */
  it('sin cuenta también se puede cobrar', async () => {
    const user = await abrirAlta()

    await user.click(screen.getByLabelText('No tiene cuenta'))

    expect(screen.getByLabelText('Ya se cobró')).toHaveProperty('disabled', false)
    expect(screen.queryByText(/el comprador tiene que tener cuenta/)).toBeNull()
  })

  it('sin cuenta la venta se manda CON su medio de pago', async () => {
    const user = await abrirAlta()

    await user.click(screen.getByLabelText('No tiene cuenta'))
    await user.type(screen.getByLabelText('Nombre del comprador'), 'Joaco')
    await user.type(screen.getByLabelText(/^Modelo/), 'CDJ-3000')
    await user.type(screen.getByLabelText('Precio'), '2400000')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(registrarVenta).toHaveBeenCalled())

    const cuerpo = vi.mocked(registrarVenta).mock.calls[0][0]
    // El cobro viaja, y el comprador sigue identificado por su nombre: son las
    // dos mitades de `pago_pagador_identificado`.
    expect(cuerpo.medioPago).toBe('EFECTIVO')
    expect(cuerpo.nombreCompradorExterno).toBe('Joaco')
    expect(cuerpo.idUsuarioComprador).toBeUndefined()
  })

  /** Una venta que se cobra después: destildar el cobro es válido. */
  it('se puede cargar una venta sin cobrar', async () => {
    const user = await abrirAlta()

    await user.type(screen.getByLabelText(/^Modelo/), 'DDJ-FLX4')
    await user.type(screen.getByLabelText('Precio'), '450000')
    await elegir(user, 'Quién compró', '30')
    await user.click(screen.getByLabelText('Ya se cobró'))
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(registrarVenta).toHaveBeenCalled())
    expect(vi.mocked(registrarVenta).mock.calls[0][0].medioPago).toBeUndefined()
  })

  /** Espeja `venta_comprador_identificado`: sin comprador la fila no se reclama. */
  it('una venta sin comprador no se manda', async () => {
    const user = await abrirAlta()

    await user.type(screen.getByLabelText(/^Modelo/), 'DDJ-FLX4')
    await user.type(screen.getByLabelText('Precio'), '450000')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText('Elegí al comprador.')).toBeDefined()
    expect(registrarVenta).not.toHaveBeenCalled()
  })

  it('una venta sin modelo no se manda', async () => {
    const user = await abrirAlta()

    await user.type(screen.getByLabelText('Precio'), '450000')
    await elegir(user, 'Quién compró', '30')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText('Poné el modelo del equipo.')).toBeDefined()
    expect(registrarVenta).not.toHaveBeenCalled()
  })

  /** Espeja `venta_usd_con_cotizacion`: sin ella el importe no se reconstruye. */
  it('una venta en dólares sin cotización no se manda', async () => {
    const user = await abrirAlta()

    await user.type(screen.getByLabelText(/^Modelo/), 'CDJ-3000')
    await user.type(screen.getByLabelText('Precio'), '2400')
    await elegir(user, 'Moneda', 'USD')
    await elegir(user, 'Quién compró', '30')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText(/necesita la cotización del día/)).toBeDefined()
    expect(registrarVenta).not.toHaveBeenCalled()
  })
})

/**
 * **El único camino para corregir una venta mal cargada** (2026-08-17): no se edita
 * y no se borra, porque `V9` prohíbe el DELETE. Se anula, queda firmada, y se
 * vuelve a cargar.
 */
describe('anular una venta', () => {
  it('pide el motivo antes de anular y avisa que no se borra', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))

    expect(screen.getByRole('heading', { name: 'Anular la venta' })).toBeDefined()
    expect(screen.getByText(/no se borra/)).toBeDefined()
    // Todavía no se anuló nada: el motivo es obligatorio.
    expect(anularVenta).not.toHaveBeenCalled()
  })

  it('anula con el motivo escrito', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))
    await user.type(screen.getByLabelText(/^Motivo/), 'Se cargó dos veces')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(anularVenta).toHaveBeenCalledWith(1, 'Se cargó dos veces'))
  })

  it('sin motivo no anula', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Escribí el motivo.')).toBeDefined()
    expect(anularVenta).not.toHaveBeenCalled()
  })

  /**
   * **El rechazo que importa**: una venta anulada con su pago vivo dejaría la
   * plata contada contra una operación que se declara inexistente. El mensaje
   * nombra la salida y tiene que llegar tal cual.
   */
  it('muestra el rechazo del backend tal como viene', async () => {
    const { ApiError } = await import('../api/cliente')
    const user = userEvent.setup()
    vi.mocked(anularVenta).mockRejectedValue(
      new ApiError(400, 'Esa venta tiene un cobro registrado. Anulá primero el pago, desde Pagos.'),
    )
    montar()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))
    await user.type(screen.getByLabelText(/^Motivo/), 'Se cargó dos veces')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText(/Anulá primero el pago/)).toBeDefined()
  })

  /** Una anulada se queda en el listado —es historial— pero no se vuelve a anular. */
  it('una venta anulada se muestra tachada y sin botón', async () => {
    vi.mocked(listarVentas).mockResolvedValue(
      pagina([venta({ anulada: true, motivoAnulacion: 'Se cargó dos veces' })]) as never,
    )
    montar()

    expect(await screen.findByText(/Anulada · Se cargó dos veces/)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull()
  })

  /** Anulada no hay nada que cobrar: la etiqueta "sin cobrar" sobra y confunde. */
  it('una venta anulada no dice además que está sin cobrar', async () => {
    vi.mocked(listarVentas).mockResolvedValue(
      pagina([venta({ anulada: true, cobrada: false, motivoAnulacion: 'Error' })]) as never,
    )
    montar()

    await screen.findByText(/Anulada · Error/)
    expect(screen.queryByText('sin cobrar')).toBeNull()
  })
})

describe('eje de escritura (SEC-05)', () => {
  it('un DIRECTIVO ve las ventas y ningún botón de escritura', async () => {
    montar('DIRECTIVO')

    expect(await screen.findByText('DDJ-FLX4')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Registrar venta' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull()
  })
})
