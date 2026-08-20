import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../api/cliente'
import type { UsuarioActual } from '../api/tipos'
import type { TrabajoResumen } from '../api/tiposMastering'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { MixMasteringPagina } from './MixMasteringPagina'

/**
 * Módulo 6 — el tablero de Mix & Mastering.
 *
 * **Los casos protegen la forma de la regla, no la regla.** Que el premaster no
 * salga sin pago lo sostiene la base, y ya tiene sus casos en `MasteringTest`.
 * Acá se prueba lo que la pantalla puede arruinar sin que nada falle:
 *
 * 1. **El rechazo se muestra con las palabras del backend**, y la salida aparece
 *    recién después. Si el botón de "liberar sin motivo" estuviera a mano desde el
 *    principio, la regla sería una sugerencia.
 * 2. **Pasarse de revisiones se pinta y no se bloquea.** Es la alerta de §9, que
 *    fue imposible de escribir hasta `V15`.
 * 3. **Un DIRECTIVO no ve ningún botón de escritura.** Lee todo y no toca nada.
 */

vi.mock('../api/mastering', () => ({
  listarTrabajos: vi.fn(),
  registrarTrabajo: vi.fn(),
  editarTrabajo: vi.fn(),
  cambiarEstadoDelTrabajo: vi.fn(),
  registrarRevision: vi.fn(),
  liberarPremaster: vi.fn(),
  cobrarTrabajo: vi.fn(),
}))
vi.mock('../api/administracion', () => ({ listarUsuarios: vi.fn() }))

const { liberarPremaster, listarTrabajos, registrarRevision } = await import('../api/mastering')
const { listarUsuarios } = await import('../api/administracion')

function trabajo(cambios: Partial<TrabajoResumen> = {}): TrabajoResumen {
  return {
    idTrabajo: 1,
    idClienteUsuario: null,
    cliente: 'Fulano De Tal',
    contactoClienteExterno: 'fulano@mail.com',
    clienteTieneCuenta: false,
    idProfesorAsignado: null,
    profesorAsignado: null,
    tipoTrabajo: 'MIX_MASTER',
    nombreTrack: 'Nocturno',
    precioAcordado: 150,
    moneda: 'USD',
    cobrado: null,
    revisionesIncluidas: 3,
    revisionesRealizadas: 1,
    fechaEstimada: '2026-09-01',
    fechaEntregaReal: null,
    estado: 'EN_PROCESO',
    urlMaterialCliente: 'https://drive.example/material',
    urlMaster: null,
    urlPremaster: 'https://drive.example/premaster',
    premasterLiberado: false,
    liberadoSinPago: false,
    motivoLiberacion: null,
    notasInternas: 'el bajo viene comprimido',
    fechaCreacion: '2026-08-19T14:00:00Z',
    ...cambios,
  }
}

function usuario(rol: UsuarioActual['rol']): UsuarioActual {
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

function montar(rol: UsuarioActual['rol'] = 'STAFF') {
  const contexto = {
    sesion: { estado: 'autenticado', usuario: usuario(rol) },
    entrar: vi.fn(),
    salir: vi.fn(),
    refrescar: vi.fn(),
  } as unknown as ContextoAuth

  return render(
    <AuthContext.Provider value={contexto}>
      <MixMasteringPagina />
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarTrabajos).mockResolvedValue({
    contenido: [trabajo()],
    pagina: 0,
    tamanio: 20,
    totalElementos: 1,
    totalPaginas: 1,
  })
  vi.mocked(listarUsuarios).mockResolvedValue({
    contenido: [],
    pagina: 0,
    tamanio: 20,
    totalElementos: 0,
    totalPaginas: 0,
  })
})

describe('el tablero', () => {
  it('muestra el trabajo con su cliente y su estado', async () => {
    montar()

    expect(await screen.findByText('Nocturno')).toBeDefined()
    expect(screen.getByText(/Fulano De Tal/)).toBeDefined()
    // El nombre del estado está dos veces en la pantalla —la etiqueta de la fila
    // y la opción del filtro— y las dos tienen que estar. Se pregunta por la
    // etiqueta, que es un `span`.
    expect(screen.getByText('En proceso', { selector: 'span' })).toBeDefined()
  })

  /** Se marca lo que falta, no lo normal: un trabajo cobrado no lleva etiqueta. */
  it('avisa cuando un trabajo no está cobrado', async () => {
    montar()

    expect(await screen.findByText('sin cobrar')).toBeDefined()
  })

  it('dice cuándo el premaster todavía está retenido', async () => {
    montar()

    expect(await screen.findByText('Premaster retenido')).toBeDefined()
  })

  /** La excepción se dice siempre: una excepción que no se ve deja de serlo. */
  it('marca el trabajo que se liberó sin pago', async () => {
    vi.mocked(listarTrabajos).mockResolvedValue({
      contenido: [
        trabajo({ premasterLiberado: true, liberadoSinPago: true, motivoLiberacion: 'Cliente viejo' }),
      ],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    montar()

    expect(await screen.findByText('Liberado sin pago')).toBeDefined()
  })
})

describe('las revisiones', () => {
  /**
   * **El caso de `V15`, del lado de la pantalla.** Cuatro de tres es un dato, no
   * un error: la base lo acepta desde esa migración y acá se pinta. Si alguien
   * "arregla" esto bloqueando el número, se pierde la alerta que §9 pide.
   */
  it('pasarse de las incluidas se muestra, no se esconde', async () => {
    vi.mocked(listarTrabajos).mockResolvedValue({
      contenido: [trabajo({ revisionesRealizadas: 4 })],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    montar()

    expect(await screen.findByText('4 de 3 revisiones')).toBeDefined()
  })

  it('se suma de a una', async () => {
    vi.mocked(registrarRevision).mockResolvedValue(trabajo({ revisionesRealizadas: 2 }))
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    await userEvent.click(screen.getByRole('button', { name: 'Registrar una revisión' }))

    await waitFor(() => expect(registrarRevision).toHaveBeenCalledWith(1))
  })
})

describe('entregar el premaster', () => {
  /**
   * **El orden es la decisión.** Se intenta, el backend explica por qué no, y
   * recién entonces aparece la salida — que además cuesta escribir un motivo.
   */
  it('sin pago muestra el rechazo del backend y recién ahí ofrece la excepción', async () => {
    vi.mocked(liberarPremaster).mockRejectedValue(
      new ApiError(409, 'No se puede liberar el premaster del trabajo 1 sin un pago registrado.'),
    )
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))

    // Antes de intentar, la salida no está a la vista.
    expect(screen.queryByRole('button', { name: /Liberarlo igual/ })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Entregar premaster' }))

    expect(await screen.findByText(/sin un pago registrado/)).toBeDefined()
    expect(screen.getByRole('button', { name: /Liberarlo igual/ })).toBeDefined()
  })

  it('con motivo escrito, se libera igual', async () => {
    vi.mocked(liberarPremaster)
      .mockRejectedValueOnce(new ApiError(409, 'sin un pago registrado'))
      .mockResolvedValueOnce(trabajo({ premasterLiberado: true, liberadoSinPago: true }))
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    await userEvent.click(screen.getByRole('button', { name: 'Entregar premaster' }))
    await userEvent.click(await screen.findByRole('button', { name: /Liberarlo igual/ }))

    await userEvent.type(
      screen.getByLabelText(/Motivo/i),
      'Cliente de mucha exposición, paga en el mes',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(liberarPremaster).toHaveBeenLastCalledWith(
        1,
        'Cliente de mucha exposición, paga en el mes',
      ),
    )
  })
})

describe('quién puede tocar', () => {
  /** DIRECTIVO lee todo el sistema y no escribe nada. */
  it('un directivo no ve ningún botón de escritura', async () => {
    montar('DIRECTIVO')

    await screen.findByText('Nocturno')
    expect(screen.queryByRole('button', { name: 'Nuevo trabajo' })).toBeNull()

    await userEvent.click(screen.getByText('Nocturno'))
    expect(screen.queryByRole('button', { name: 'Entregar premaster' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Registrar cobro' })).toBeNull()
  })
})
