import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../api/cliente'
import type { UsuarioActual } from '../api/tipos'
import type { AparicionResumen, ContratoResumen, ReleaseResumen } from '../api/tiposSello'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { SelloPagina } from './SelloPagina'

/**
 * Módulo 7 — el catálogo del sello.
 *
 * **Los casos protegen la forma de la regla, no la regla.** Que no se publique un
 * release sin contrato lo sostiene `V18` y ya tiene sus casos en `SelloTest`. Acá
 * se prueba lo que la pantalla puede arruinar sin que nada falle:
 *
 * 1. **El rechazo se muestra con las palabras del backend**, y la salida —publicar
 *    igual, con motivo— aparece recién después. Si el botón estuviera a mano desde
 *    el principio, la regla sería una sugerencia.
 * 2. **La falta de contrato se avisa ANTES de intentar publicar.** Enterarse al
 *    apretar el botón es enterarse tarde: el PDF hay que ir a buscarlo.
 * 3. **`PUBLICADO` no está en el desplegable de estados.** Si estuviera, la regla
 *    dura del módulo se cruzaría eligiendo una opción de una lista.
 * 4. **Un DIRECTIVO no ve ningún botón de escritura.** Lee todo y no toca nada.
 * 5. **Sin apariciones el bloque se lee bien**: "si no lo usan, que no lo usen y
 *    fue" — vacío no es una falla.
 */

vi.mock('../api/sello', () => ({
  listarReleases: vi.fn(),
  listarArtistas: vi.fn(),
  registrarRelease: vi.fn(),
  cambiarEstadoDelRelease: vi.fn(),
  publicarRelease: vi.fn(),
  contratosDelRelease: vi.fn(),
  cargarContrato: vi.fn(),
  borrarContrato: vi.fn(),
  abrirContrato: vi.fn(),
  aparicionesDelRelease: vi.fn(),
  anotarAparicion: vi.fn(),
  borrarAparicion: vi.fn(),
}))

const {
  aparicionesDelRelease,
  contratosDelRelease,
  listarArtistas,
  listarReleases,
  publicarRelease,
} = await import('../api/sello')

function release(cambios: Partial<ReleaseResumen> = {}): ReleaseResumen {
  return {
    idRelease: 1,
    codigoRelease: 'LJ021',
    idArtista: 7,
    artista: 'Ghezz',
    nombreRelease: 'Horizonte',
    tipoRelease: 'SINGLE',
    genero: 'Techno',
    tienePortada: false,
    fechaEstimada: '2026-09-15',
    fechaReal: null,
    estado: 'CONFIRMADO',
    sistemaPromo: false,
    notas: null,
    contratos: 0,
    tieneContrato: false,
    publicadoSinContrato: false,
    motivoPublicacion: null,
    publicadoPor: null,
    fechaCreacion: '2026-08-20T14:00:00Z',
    ...cambios,
  }
}

function contrato(cambios: Partial<ContratoResumen> = {}): ContratoResumen {
  return {
    idContrato: 5,
    idArtista: 7,
    artista: 'Ghezz',
    idRelease: 1,
    codigoRelease: 'LJ021',
    general: false,
    fechaFirma: '2026-08-01',
    observaciones: null,
    fechaCarga: '2026-08-20T14:00:00Z',
    ...cambios,
  }
}

function aparicion(cambios: Partial<AparicionResumen> = {}): AparicionResumen {
  return {
    idAparicion: 3,
    idRelease: 1,
    tipoAparicion: 'RADIO',
    donde: 'Radio Metro',
    quien: 'Fulano',
    fecha: '2026-09-20',
    url: null,
    ordenRelevancia: 1,
    notas: null,
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
      <SelloPagina />
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarReleases).mockResolvedValue({
    contenido: [release()],
    pagina: 0,
    tamanio: 20,
    totalElementos: 1,
    totalPaginas: 1,
  })
  vi.mocked(listarArtistas).mockResolvedValue([
    {
      idArtista: 7,
      idUsuario: null,
      nombreArtistico: 'Ghezz',
      nombreReal: null,
      emailContacto: null,
      telefono: null,
      instagram: null,
      confirmado: true,
      bio: null,
      releases: 1,
      fechaAlta: '2026-08-20T14:00:00Z',
    },
  ])
  vi.mocked(contratosDelRelease).mockResolvedValue([])
  vi.mocked(aparicionesDelRelease).mockResolvedValue([])
})

describe('el catálogo', () => {
  it('muestra el release con su código y su artista', async () => {
    montar()

    expect(await screen.findByText('Horizonte')).toBeDefined()
    expect(screen.getByText('LJ021')).toBeDefined()
    expect(screen.getByText(/Ghezz/)).toBeDefined()
  })

  /**
   * **El aviso llega antes de que alguien intente publicar.** Es la diferencia
   * entre "andá a buscar el PDF" y "apretaste y no se pudo".
   */
  it('avisa en la fila que el release no tiene contrato', async () => {
    montar()

    expect(await screen.findByText('Sin contrato')).toBeDefined()
  })

  it('cuenta los contratos cuando los hay', async () => {
    vi.mocked(listarReleases).mockResolvedValue({
      contenido: [release({ contratos: 2, tieneContrato: true })],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    montar()

    expect(await screen.findByText('2 contratos')).toBeDefined()
  })
})

describe('la regla del módulo', () => {
  /**
   * **El caso central, y el orden es lo que prueba.** Antes de apretar no hay
   * ninguna salida a la vista; después del rechazo aparece, con el texto del
   * backend arriba.
   */
  it('muestra el rechazo del backend y recién ahí ofrece la salida', async () => {
    vi.mocked(publicarRelease).mockRejectedValue(
      // El orden es (status, mensaje): así lo declara `ApiError`.
      new ApiError(
        409,
        'El release LJ021 no se puede publicar sin un contrato adjunto: no hay contrato de este release ni contrato general de su artista.',
      ),
    )
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))

    // Antes de intentar, la salida no está en ningún lado.
    expect(screen.queryByText('Publicarlo igual, con motivo')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByText(/sin un contrato adjunto/)).toBeDefined()
    expect(screen.getByText('Publicarlo igual, con motivo')).toBeDefined()
  })

  /**
   * **`PUBLICADO` no es una opción del desplegable de estados.** Si lo fuera, la
   * regla dura se cruzaría eligiendo un valor de una lista, sin pasar por la
   * pregunta de si hay contrato.
   */
  it('no ofrece publicar desde el selector de estados', async () => {
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))

    const selector = screen.getByLabelText('Mover el estado')
    const opciones = Array.from(selector.querySelectorAll('option')).map((o) => o.value)

    expect(opciones).not.toContain('PUBLICADO')
    expect(opciones).not.toContain('CANCELADO')
  })

  /** Publicado con la excepción: se dice quién lo hizo y por qué, no se esconde. */
  it('muestra la firma de un release publicado sin contrato', async () => {
    vi.mocked(listarReleases).mockResolvedValue({
      contenido: [
        release({
          estado: 'PUBLICADO',
          fechaReal: '2026-09-15',
          publicadoSinContrato: true,
          motivoPublicacion: 'Firmado en papel, lo escanea Ghezz',
          publicadoPor: 'Micaela Gomez',
        }),
      ],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    montar()

    expect(await screen.findByText('Publicado sin contrato')).toBeDefined()

    await userEvent.click(screen.getByText('Horizonte'))

    expect(await screen.findByText(/Micaela Gomez/)).toBeDefined()
    expect(screen.getByText(/Firmado en papel/)).toBeDefined()
  })

  /** De cancelado no se vuelve, y la pantalla lo dice en vez de ofrecer un botón muerto. */
  it('avisa que un release cancelado no se reabre', async () => {
    vi.mocked(listarReleases).mockResolvedValue({
      contenido: [release({ estado: 'CANCELADO' })],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))

    expect(await screen.findByText(/No se puede reabrir/)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Publicar' })).toBeNull()
  })
})

describe('los contratos y las apariciones', () => {
  it('distingue un contrato general del artista', async () => {
    vi.mocked(contratosDelRelease).mockResolvedValue([contrato({ general: true, idRelease: null })])
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))

    expect(await screen.findByText(/General de Ghezz/)).toBeDefined()
  })

  /** "Si en el futuro no lo usan, que no lo usen y fue": vacío no es una falla. */
  it('se lee bien sin ninguna aparición cargada', async () => {
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))

    expect(await screen.findByText('Todavía no se anotó ninguna.')).toBeDefined()
  })

  it('muestra las apariciones en el orden que las trae el backend', async () => {
    vi.mocked(aparicionesDelRelease).mockResolvedValue([
      aparicion(),
      aparicion({ idAparicion: 4, tipoAparicion: 'PLAYLIST', donde: 'Techno Bunker', quien: null }),
    ])
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))

    const items = await screen.findAllByText(/Radio Metro|Techno Bunker/)
    expect(items[0].textContent).toContain('Radio Metro')
  })
})

describe('los permisos', () => {
  /** DIRECTIVO lee todo y no escribe nada (§2.1). */
  it('un directivo no ve ningún botón de escritura', async () => {
    montar('DIRECTIVO')

    expect(await screen.findByText('Horizonte')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Nuevo release' })).toBeNull()

    await userEvent.click(screen.getByText('Horizonte'))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Publicar' })).toBeNull()
    })
    expect(screen.queryByText('Adjuntar contrato')).toBeNull()
    expect(screen.queryByText('Anotar')).toBeNull()
  })

  /** Un release cuelga de un artista: sin ninguno, el alta no tiene de dónde elegir. */
  it('sin artistas cargados, explica que hay que cargarlos primero', async () => {
    vi.mocked(listarArtistas).mockResolvedValue([])
    montar()

    expect(await screen.findByText(/un release cuelga de uno/)).toBeDefined()
  })
})
