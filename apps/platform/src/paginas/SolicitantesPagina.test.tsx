import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsuarioActual as Actual } from '../api/tipos'
import type { ConversionRealizada, SolicitanteResumen } from '../api/tiposAdmin'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { SolicitantesPagina } from './SolicitantesPagina'

/**
 * El buzón de la web (hallazgo #7).
 *
 * Lo que estos casos cuidan es lo que hace que la ficha sirva para algo:
 *
 * - Que **la contraseña temporal se vea** cuando la cuenta se creó. Es la única
 *   del sistema que no se puede volver a consultar, y al convertir la ficha
 *   desaparece del filtro por defecto: si se muestra dentro de la fila, se va con
 *   ella y hay que resetear una cuenta recién creada.
 * - Que **cuando la persona ya tenía cuenta la pantalla lo diga**, en vez de
 *   dejar el hueco donde iba la contraseña. Un campo vacío ahí hace que quien
 *   atiende espere un dato que no existe.
 * - Que **descartar pida el motivo**, que es lo que la base exige.
 * - Que un DIRECTIVO vea el buzón y no lo pueda resolver.
 */

vi.mock('../api/administracion', () => ({
  listarSolicitantes: vi.fn(),
  convertirSolicitante: vi.fn(),
  descartarSolicitante: vi.fn(),
}))

const { listarSolicitantes, convertirSolicitante, descartarSolicitante } = await import(
  '../api/administracion'
)

function ficha(cambios: Partial<SolicitanteResumen> = {}): SolicitanteResumen {
  return {
    idSolicitante: 3,
    nombre: 'Camila',
    apellido: 'Ríos',
    email: 'camila@ejemplo.com',
    telefono: '11-5555-4444',
    interes: 'CURSO',
    detalle: 'Programa DJ · presencial',
    mensaje: 'Quiero arrancar en marzo',
    estado: 'PENDIENTE',
    respuesta: null,
    resueltaPor: null,
    idUsuario: null,
    fechaResolucion: null,
    fechaCreacion: '2026-08-28T10:00:00-03:00',
    ...cambios,
  }
}

function conversion(cambios: Partial<ConversionRealizada> = {}): ConversionRealizada {
  return {
    solicitante: ficha({ estado: 'CONVERTIDO', idUsuario: 40 }),
    usuario: {
      id: 40,
      nombre: 'Camila',
      apellido: 'Ríos',
      email: 'camila@ejemplo.com',
      telefono: '11-5555-4444',
      rol: 'USUARIO',
      activo: true,
      debeCambiarPassword: true,
    },
    passwordTemporal: 'lluvia-42-roja',
    cuentaNueva: true,
    ...cambios,
  }
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
    <MemoryRouter>
      <AuthContext value={contexto}>
        <SolicitantesPagina />
      </AuthContext>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarSolicitantes).mockResolvedValue({
    contenido: [ficha()],
    pagina: 0,
    tamanio: 20,
    totalElementos: 1,
    totalPaginas: 1,
  })
})

describe('el buzón', () => {
  it('abre en lo que nadie contestó', async () => {
    montar()

    expect(await screen.findByText('Ríos, Camila')).toBeDefined()
    expect(vi.mocked(listarSolicitantes).mock.calls[0][0].estado).toBe('PENDIENTE')
  })

  /**
   * El teléfono se muestra junto al mail y no escondido: es el canal por el que
   * se contesta y por el que va a viajar la contraseña.
   */
  it('muestra qué pidió, por dónde contestarle y qué escribió', async () => {
    montar()

    expect(await screen.findByText(/camila@ejemplo.com · 11-5555-4444/)).toBeDefined()
    expect(screen.getByText('Un curso')).toBeDefined()
    expect(screen.getByText(/Programa DJ/)).toBeDefined()
    expect(screen.getByText(/Quiero arrancar en marzo/)).toBeDefined()
  })

  it('un directivo mira el buzón y no lo resuelve', async () => {
    montar('DIRECTIVO')

    expect(await screen.findByText('Ríos, Camila')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Darle cuenta' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull()
  })
})

describe('convertir la ficha en cuenta', () => {
  it('muestra la contraseña temporal, que no se puede volver a ver', async () => {
    vi.mocked(convertirSolicitante).mockResolvedValue(conversion())
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Darle cuenta' }))

    await waitFor(() => expect(screen.getByText('lluvia-42-roja')).toBeDefined())
    expect(screen.getByText(/Cuenta creada para Camila Ríos/)).toBeDefined()
    expect(screen.getByText(/No se puede volver a ver/)).toBeDefined()
  })

  /**
   * **El otro camino, que no es un borde raro**: un alumno que cursa hace un año
   * y pide la cabina desde la web llega exactamente así. Lo que se prueba es que
   * la pantalla lo cuente, en vez de dejar vacío el lugar de la contraseña.
   */
  it('cuando la persona ya tenía cuenta lo dice, en vez de dejar el hueco', async () => {
    vi.mocked(convertirSolicitante).mockResolvedValue(
      conversion({ passwordTemporal: null, cuentaNueva: false }),
    )
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Darle cuenta' }))

    await waitFor(() => expect(screen.getByText(/ya tenía cuenta/)).toBeDefined())
    expect(screen.getByText(/No hay contraseña que mandarle/)).toBeDefined()
  })

  /**
   * La ficha existe para que el trámite siga en la pantalla que corresponde, y
   * cuál es depende de qué pidió. Sin esto, quien atiende tiene que adivinar
   * entre dieciséis pantallas.
   */
  it('dice a dónde sigue el trámite según qué pidió', async () => {
    vi.mocked(convertirSolicitante).mockResolvedValue(conversion())
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Darle cuenta' }))

    await waitFor(() => expect(screen.getByText(/Cargale la inscripción/)).toBeDefined())
    expect(screen.getByRole('link', { name: 'Inscripciones' }).getAttribute('href')).toBe(
      '/admin/inscripciones',
    )
  })

  it('una consulta por equipos manda a la pantalla de ventas', async () => {
    vi.mocked(convertirSolicitante).mockResolvedValue(
      conversion({ solicitante: ficha({ estado: 'CONVERTIDO', interes: 'EQUIPOS' }) }),
    )
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Darle cuenta' }))

    await waitFor(() => expect(screen.getByText(/Cargale la venta/)).toBeDefined())
  })
})

describe('descartar', () => {
  it('no descarta sin motivo', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(vi.mocked(descartarSolicitante)).not.toHaveBeenCalled()
  })

  it('descarta con el motivo escrito', async () => {
    vi.mocked(descartarSolicitante).mockResolvedValue(
      ficha({ estado: 'DESCARTADO', respuesta: 'Spam' }),
    )
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }))
    await userEvent.type(screen.getByLabelText(/Motivo/), 'Spam')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(descartarSolicitante).toHaveBeenCalledWith(3, 'Spam'))
  })
})
