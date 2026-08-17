import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsuarioResumen, VentaResumen } from '../api/tiposAdmin'
import type { UsuarioActual as Actual } from '../api/tipos'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { VentasPagina } from './VentasPagina'

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
  listarUsuarios: vi.fn(),
}))

const { listarUsuarios, listarVentas, registrarVenta } = await import('../api/administracion')

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
    await user.selectOptions(await screen.findByLabelText('Quién compró'), '30')
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
   * <b>`pago.id_usuario` es NOT NULL</b>, así que un cobro necesita alguien a
   * quien colgárselo. La pantalla lo dice antes en vez de dejar mandar un pedido
   * que la base rechaza.
   */
  it('sin cuenta no ofrece cobrar, y lo explica', async () => {
    const user = await abrirAlta()

    await user.click(screen.getByLabelText('No tiene cuenta'))

    expect(screen.getByLabelText('Ya se cobró')).toHaveProperty('disabled', true)
    expect(screen.getByText(/el comprador tiene que tener cuenta/)).toBeDefined()
    expect(screen.queryByLabelText('Cómo pagó')).toBeNull()
  })

  it('sin cuenta la venta se manda sin medio de pago', async () => {
    const user = await abrirAlta()

    await user.click(screen.getByLabelText('No tiene cuenta'))
    await user.type(screen.getByLabelText('Nombre del comprador'), 'Joaco')
    await user.type(screen.getByLabelText(/^Modelo/), 'CDJ-3000')
    await user.type(screen.getByLabelText('Precio'), '2400000')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(registrarVenta).toHaveBeenCalled())
    expect(vi.mocked(registrarVenta).mock.calls[0][0].medioPago).toBeUndefined()
  })

  /** Una venta que se cobra después: destildar el cobro es válido. */
  it('se puede cargar una venta sin cobrar', async () => {
    const user = await abrirAlta()

    await user.type(screen.getByLabelText(/^Modelo/), 'DDJ-FLX4')
    await user.type(screen.getByLabelText('Precio'), '450000')
    await user.selectOptions(await screen.findByLabelText('Quién compró'), '30')
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
    await user.selectOptions(await screen.findByLabelText('Quién compró'), '30')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText('Poné el modelo del equipo.')).toBeDefined()
    expect(registrarVenta).not.toHaveBeenCalled()
  })

  /** Espeja `venta_usd_con_cotizacion`: sin ella el importe no se reconstruye. */
  it('una venta en dólares sin cotización no se manda', async () => {
    const user = await abrirAlta()

    await user.type(screen.getByLabelText(/^Modelo/), 'CDJ-3000')
    await user.type(screen.getByLabelText('Precio'), '2400')
    await user.selectOptions(screen.getByLabelText('Moneda'), 'USD')
    await user.selectOptions(await screen.findByLabelText('Quién compró'), '30')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText(/necesita la cotización del día/)).toBeDefined()
    expect(registrarVenta).not.toHaveBeenCalled()
  })
})

describe('eje de escritura (SEC-05)', () => {
  it('un DIRECTIVO ve las ventas y ningún botón de escritura', async () => {
    montar('DIRECTIVO')

    expect(await screen.findByText('DDJ-FLX4')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Registrar venta' })).toBeNull()
  })
})
