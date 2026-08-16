import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EgresoResumen, ProfesorResumen } from '../api/tiposAdmin'
import type { UsuarioActual as Actual } from '../api/tipos'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { EgresosPagina } from './EgresosPagina'

/** Módulo 3, pantalla 5 — la plata que sale. */

vi.mock('../api/administracion', () => ({
  listarEgresos: vi.fn(),
  registrarEgreso: vi.fn(),
  listarProfesores: vi.fn(),
}))

const { listarEgresos, listarProfesores, registrarEgreso } = await import('../api/administracion')

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
    comprobantePath: null,
    fechaEgreso: '2026-08-16',
    fechaRegistro: '2026-08-16T14:00:00Z',
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
})

describe('el listado', () => {
  it('muestra el concepto, a quién y cuánto', async () => {
    montar()

    expect(await screen.findByText('Clases de marzo')).toBeDefined()
    expect(screen.getByText('Tomás Ghezzi')).toBeDefined()
    expect(screen.getByText('$ 150.000,00')).toBeDefined()
  })

  /** Un egreso a alguien con cuenta se puede cruzar contra sus clases; uno libre, no. */
  it('distingue al destinatario que tiene cuenta', async () => {
    montar()

    expect(await screen.findByText('tiene cuenta en el sistema')).toBeDefined()
  })

  it('un egreso a un proveedor no lo dice', async () => {
    vi.mocked(listarEgresos).mockResolvedValue(
      pagina([egreso({ destinatario: 'Inmobiliaria Pilar', idUsuarioDestino: null })]),
    )

    montar()

    expect(await screen.findByText('Inmobiliaria Pilar')).toBeDefined()
    expect(screen.queryByText('tiene cuenta en el sistema')).toBeNull()
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
    await user.selectOptions(screen.getByLabelText('Moneda'), 'USD')
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
    await user.selectOptions(screen.getByLabelText('Profesor'), '2')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(registrarEgreso).toHaveBeenCalled())
    expect(vi.mocked(registrarEgreso).mock.calls[0][0].idUsuarioDestino).toBe(20)
  })

  /** Los dos campos juntos invitan a llenar los dos, y el nombre gana igual. */
  it('el destinatario libre desaparece al elegir un profesor', async () => {
    const user = await abrir()

    expect(screen.getByLabelText('A quién')).toBeDefined()
    await user.selectOptions(screen.getByLabelText('Profesor'), '2')
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
