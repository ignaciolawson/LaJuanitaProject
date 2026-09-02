import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EgresoResumen, ProfesorResumen } from '../api/tiposAdmin'
import type { UsuarioActual as Actual } from '../api/tipos'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { EgresosPagina } from './EgresosPagina'
import { elegir } from '../pruebas/elegir'

/** Módulo 3, pantalla 5 — la plata que sale. */

vi.mock('../api/administracion', () => ({
  listarEgresos: vi.fn(),
  registrarEgreso: vi.fn(),
  anularEgreso: vi.fn(),
  listarProfesores: vi.fn(),
}))

const { anularEgreso, listarEgresos, listarProfesores, registrarEgreso } =
  await import('../api/administracion')

const PROFESORES: ProfesorResumen[] = [
  { idProfesor: 2, idUsuario: 20, nombreCompleto: 'Tomás Ghezzi', activo: true },
] as never

function egreso(cambios: Partial<EgresoResumen> = {}): EgresoResumen {
  return {
    idEgreso: 1,
    monto: 150000,
    moneda: 'ARS',
    cotizacionDolar: null,
    concepto: 'Clases de marzo',
    destinatario: 'Tomás Ghezzi',
    idUsuarioDestino: 20,
    esPagoAProfesor: true,
    comprobantePath: null,
    fechaEgreso: '2026-08-16',
    fechaRegistro: '2026-08-16T14:00:00Z',
    anulado: false,
    motivoAnulacion: null,
    fechaAnulacion: null,
    ...cambios,
  }
}

function pagina(contenido: EgresoResumen[]) {
  return { contenido, pagina: 0, tamanio: 20, totalElementos: contenido.length, totalPaginas: 1 }
}

function montar(rol: Actual['rol'] = 'STAFF') {
  const contexto: ContextoAuth = {
    sesion: {
      estado: 'autenticado',
      usuario: {
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
      },
    },
    iniciarSesion: async () => {},
    registrarse: async () => {},
    cerrarSesion: () => {},
    refrescarUsuario: async () => {},
  }

  return render(
    <AuthContext value={contexto}>
      <EgresosPagina />
    </AuthContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarEgresos).mockResolvedValue(pagina([egreso()]))
  vi.mocked(listarProfesores).mockResolvedValue(PROFESORES)
  vi.mocked(anularEgreso).mockResolvedValue({} as never)
})

/**
 * **El único camino para corregir un egreso mal cargado** (2026-08-17): `V9`
 * prohíbe el DELETE, así que se anula, queda firmado, y se vuelve a cargar.
 *
 * Lo que este bloque no puede probar —y es lo que más importa— es que anular lo
 * saque de la caja: eso vive en la consulta del backend y lo pinea
 * `CajaTest.un_egreso_anulado_deja_de_estar_en_la_caja`.
 */
describe('anular un egreso', () => {
  it('pide el motivo y avisa que deja de contar en la caja', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))

    expect(screen.getByRole('heading', { name: 'Anular el egreso' })).toBeDefined()
    expect(screen.getByText(/Deja de contar en la caja/)).toBeDefined()
    expect(anularEgreso).not.toHaveBeenCalled()
  })

  it('anula con el motivo escrito', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))
    await user.type(screen.getByLabelText(/^Motivo/), 'Se cargó dos veces')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(anularEgreso).toHaveBeenCalledWith(1, 'Se cargó dos veces'))
  })

  it('sin motivo no anula', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Escribí el motivo.')).toBeDefined()
    expect(anularEgreso).not.toHaveBeenCalled()
  })

  /** Anulado se queda en el listado: es la fila que explica por qué cambió el total. */
  it('un egreso anulado se muestra tachado y sin botón', async () => {
    vi.mocked(listarEgresos).mockResolvedValue(
      pagina([egreso({ anulado: true, motivoAnulacion: 'Se cargó dos veces' })]),
    )
    montar()

    expect(await screen.findByText(/Anulado · Se cargó dos veces/)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull()
  })
})

describe('el listado', () => {
  it('muestra el concepto, a quién y cuánto', async () => {
    montar()

    expect(await screen.findByText('Clases de marzo')).toBeDefined()
    expect(screen.getByText('Tomás Ghezzi')).toBeDefined()
    expect(screen.getByText('$ 150.000,00')).toBeDefined()
  })

  /**
   * La fila dice de qué lado del corte está (`mejoras.md` §12 · C3).
   *
   * Antes decía *"tiene cuenta en el sistema"*, que es el dato técnico y no lo
   * que significa. **Usa la misma palabra que el filtro**, para que el
   * desplegable y la fila no nombren distinto la misma cosa.
   */
  it('marca los pagos a profesores', async () => {
    montar()

    expect(await screen.findByText('Pago a profesor')).toBeDefined()
  })

  it('un gasto a un proveedor no lleva esa marca', async () => {
    vi.mocked(listarEgresos).mockResolvedValue(
      pagina([
        egreso({
          destinatario: 'Inmobiliaria Pilar',
          idUsuarioDestino: null,
          esPagoAProfesor: false,
        }),
      ]),
    )

    montar()

    expect(await screen.findByText('Inmobiliaria Pilar')).toBeDefined()
    expect(screen.queryByText('Pago a profesor')).toBeNull()
  })
})

describe('dividir los egresos por dentro (§12 · C3)', () => {
  it('⚠️ filtrar por tipo de gasto le pide al servidor, no recorta lo ya traído', async () => {
    // Es la decisión del punto. El listado pagina de a veinte: filtrar en la
    // pantalla mostraría un subconjunto de esas veinte como si fuera el total,
    // que es el mismo defecto que B1 evitó en Pagos y no falla nunca — la
    // pantalla anda y el número miente.
    const user = userEvent.setup()
    montar()
    await screen.findByText('Clases de marzo')

    await elegir(user, 'Filtrar por tipo de gasto', 'PROFESOR')

    await waitFor(() =>
      expect(vi.mocked(listarEgresos)).toHaveBeenCalledWith(
        expect.objectContaining({ destino: 'PROFESOR' }),
      ),
    )
  })

  it('al filtrar se vuelve a la primera página', async () => {
    // Sin esto, filtrar estando en la página 3 devuelve vacío y se lee como que
    // no hay gastos de ese tipo.
    const user = userEvent.setup()
    montar()
    await screen.findByText('Clases de marzo')

    await elegir(user, 'Filtrar por tipo de gasto', 'OTRO')

    await waitFor(() =>
      expect(vi.mocked(listarEgresos)).toHaveBeenCalledWith(
        expect.objectContaining({ destino: 'OTRO', pagina: 0 }),
      ),
    )
  })
})

describe('el alta', () => {
  async function abrir() {
    const user = userEvent.setup()
    montar()
    await user.click(await screen.findByRole('button', { name: 'Registrar egreso' }))
    return user
  }

  /** "Todo egreso queda con usuario, fecha y motivo": el motivo es el concepto. */
  it('sin concepto no se manda', async () => {
    const user = await abrir()

    await user.type(screen.getByLabelText('Monto'), '80000')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText('Escribí a qué corresponde el egreso.')).toBeDefined()
    expect(registrarEgreso).not.toHaveBeenCalled()
  })

  it('en dólares pide la cotización', async () => {
    const user = await abrir()

    await user.type(screen.getByLabelText('Concepto'), 'Plugin')
    await user.type(screen.getByLabelText('Monto'), '500')
    await elegir(user, 'Moneda', 'USD')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(
      await screen.findByText('Un egreso en dólares necesita la cotización del día.'),
    ).toBeDefined()
    expect(registrarEgreso).not.toHaveBeenCalled()
  })

  /** El pago a un profesor viaja con su `idUsuario`, no con su `idProfesor`. */
  it('un egreso a un profesor lo manda por su usuario', async () => {
    const user = await abrir()
    vi.mocked(registrarEgreso).mockResolvedValue(egreso())

    await user.type(screen.getByLabelText('Concepto'), 'Clases de marzo')
    await user.type(screen.getByLabelText('Monto'), '150000')
    await elegir(user, 'Profesor', '2')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(registrarEgreso).toHaveBeenCalled())
    expect(vi.mocked(registrarEgreso).mock.calls[0][0].idUsuarioDestino).toBe(20)
  })

  /** Los dos campos juntos invitan a llenar los dos, y el nombre gana igual. */
  it('el destinatario libre desaparece al elegir un profesor', async () => {
    const user = await abrir()

    expect(screen.getByLabelText('A quién')).toBeDefined()
    await elegir(user, 'Profesor', '2')
    expect(screen.queryByLabelText('A quién')).toBeNull()
  })
})

describe('eje de escritura', () => {
  it('un DIRECTIVO ve los egresos y no los carga', async () => {
    montar('DIRECTIVO')

    expect(await screen.findByText('Clases de marzo')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Registrar egreso' })).toBeNull()
  })
})
