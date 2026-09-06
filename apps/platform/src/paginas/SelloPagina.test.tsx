import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../api/cliente'
import type { UsuarioActual } from '../api/tipos'
import type {
  AparicionResumen,
  CancionResumen,
  ContratoResumen,
  ReleaseResumen,
} from '../api/tiposSello'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { elegir } from '../pruebas/elegir'
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
  editarRelease: vi.fn(),
  temasDelRelease: vi.fn(),
  agregarTema: vi.fn(),
  editarTema: vi.fn(),
  moverTema: vi.fn(),
  borrarTema: vi.fn(),
}))

const {
  agregarTema,
  aparicionesDelRelease,
  borrarTema,
  contratosDelRelease,
  editarRelease,
  listarArtistas,
  listarReleases,
  moverTema,
  publicarRelease,
  temasDelRelease,
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
    temas: 0,
    minimoDeTemas: null,
    maximoDeTemas: null,
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

function tema(cambios: Partial<CancionResumen> = {}): CancionResumen {
  return {
    idCancion: 11,
    idRelease: 1,
    orden: 1,
    titulo: 'Primero',
    duracionSegundos: 214,
    // Ya viene escrita del servidor: la pantalla no formatea `mm:ss`, para que no
    // haya dos maneras de escribirlo según qué componente lo dibuje.
    duracion: '3:34',
    artistaInvitado: null,
    isrc: null,
    ...cambios,
  }
}

/** Un EP, que es lo único —con el álbum— que lleva tracklist (P52). */
function ep(cambios: Partial<ReleaseResumen> = {}): ReleaseResumen {
  return release({ tipoRelease: 'EP', minimoDeTemas: 3, maximoDeTemas: 6, ...cambios })
}

function conElReleaseEnLista(r: ReleaseResumen) {
  vi.mocked(listarReleases).mockResolvedValue({
    contenido: [r],
    pagina: 0,
    tamanio: 20,
    totalElementos: 1,
    totalPaginas: 1,
  })
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
  vi.mocked(temasDelRelease).mockResolvedValue([])
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

/**
 * El tracklist de un EP o de un álbum (P51–P53, `V26`).
 *
 * **Lo que se prueba acá no es el rango**: eso lo sostienen `V26` §3 y sus casos en
 * `SelloTest` y en las dos suites SQL. Lo que la pantalla puede arruinar sin que
 * nada falle es otra cosa:
 *
 * 1. **Que se pueda guardar el progreso.** La decisión de P51 —*se exige al
 *    publicar, no al cargar*— se ve únicamente en que, faltando temas, la pantalla
 *    igual deje agregar. Si el formulario bloqueara, la decisión estaría deshecha
 *    del lado del front y la base no se enteraría.
 * 2. **Que avise cuántos faltan antes de apretar Publicar.**
 * 3. **Que el bloque no exista donde no corresponde** (P52): un single es el
 *    release mismo.
 * 4. **Que el rango no esté escrito en el front.** El caso lo verifica mandando
 *    números distintos de los reales y esperando que la pantalla muestre ESOS: si
 *    alguien copiara la tabla de rangos acá, ese caso se pondría en rojo.
 */
describe('el tracklist', () => {
  it('un single dice que no lleva lista de temas', async () => {
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))

    expect(await screen.findByText(/no lleva lista de temas/)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Agregar tema' })).toBeNull()
  })

  it('un release sin formato pide elegirlo antes que nada', async () => {
    conElReleaseEnLista(release({ tipoRelease: null }))
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))

    expect(await screen.findByText(/Elegí el formato/)).toBeDefined()
  })

  /**
   * **El rango sale del backend, no de este repo.** El fixture manda 2 y 4 —que no
   * son los de ningún formato real— y la pantalla los muestra tal cual. Con una
   * tabla de rangos escrita en el front, acá diría "3 a 6" y el caso caería.
   */
  it('muestra el rango que manda el servidor, no uno propio', async () => {
    conElReleaseEnLista(ep({ minimoDeTemas: 2, maximoDeTemas: 4 }))
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))

    // Dos textos distintos a propósito: la fila del listado anuncia el tracklist
    // y el bloque dice qué falta. Buscar el fragmento suelto encuentra los dos.
    expect(await screen.findByText('0 de 2 a 4 temas')).toBeDefined()
    expect(screen.getByText('0 de 2 a 4 · faltan 2 para poder publicarlo')).toBeDefined()
  })

  /**
   * **La decisión de P51 en pantalla.** Con un tema de tres, el aviso dice cuántos
   * faltan **y el botón de agregar sigue estando**: se guarda el progreso. Un
   * formulario que se bloqueara hasta llegar al mínimo haría imposible el primer
   * tema, que es exactamente el argumento por el que la regla vive en el publicar.
   */
  it('avisa cuántos faltan y deja seguir cargando igual', async () => {
    conElReleaseEnLista(ep({ temas: 1 }))
    vi.mocked(temasDelRelease).mockResolvedValue([tema()])
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))

    expect(await screen.findByText(/faltan 2 para poder publicarlo/)).toBeDefined()
    expect(screen.getByRole('button', { name: 'Agregar tema' })).toBeDefined()
  })

  it('con el tracklist completo deja de avisar', async () => {
    conElReleaseEnLista(ep({ temas: 3 }))
    vi.mocked(temasDelRelease).mockResolvedValue([
      tema(),
      tema({ idCancion: 12, orden: 2, titulo: 'Segundo' }),
      tema({ idCancion: 13, orden: 3, titulo: 'Tercero' }),
    ])
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))

    expect(await screen.findByText('3 de 3 a 6')).toBeDefined()
    expect(screen.queryByText(/faltan/)).toBeNull()
    expect(screen.queryByText(/son más de los que entran/)).toBeNull()
  })

  /** La duración viene escrita del servidor; el feat. y el ISRC, cuando están. */
  it('dibuja cada tema con lo que tiene cargado', async () => {
    conElReleaseEnLista(ep({ temas: 1 }))
    vi.mocked(temasDelRelease).mockResolvedValue([
      tema({ artistaInvitado: 'Otro', isrc: 'AR-ABC-26-00001' }),
    ])
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))

    expect(await screen.findByText('Primero')).toBeDefined()
    expect(screen.getByText('3:34')).toBeDefined()
    expect(screen.getByText('feat. Otro')).toBeDefined()
    expect(screen.getByText('AR-ABC-26-00001')).toBeDefined()
  })

  /**
   * **El formulario no tiene campo de posición**, y eso es lo que hace imposible
   * que dos temas queden en el mismo lugar: el orden lo pone el servidor. Un campo
   * "Orden" acá volvería a abrir esa puerta.
   */
  it('el alta de un tema no pide la posición', async () => {
    conElReleaseEnLista(ep())
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar tema' }))

    expect(await screen.findByLabelText(/^Título/)).toBeDefined()
    expect(screen.queryByLabelText('Orden')).toBeNull()
    expect(screen.queryByLabelText('Posición')).toBeNull()
  })

  /** La duración se escribe `mm:ss` y viaja en segundos. */
  it('manda la duración en segundos', async () => {
    conElReleaseEnLista(ep())
    vi.mocked(agregarTema).mockResolvedValue(tema())
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar tema' }))
    await userEvent.type(await screen.findByLabelText(/^Título/), 'Nuevo')
    await userEvent.type(screen.getByLabelText(/^Duración/), '3:34')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    await waitFor(() => {
      expect(vi.mocked(agregarTema)).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ titulo: 'Nuevo', duracionSegundos: 214 }),
      )
    })
  })

  /**
   * ⚠️ **Una duración mal escrita se rechaza y no se manda vacía.** Guardarla como
   * `null` sería lo cómodo y es lo peor: el tema entra sin duración y nadie se
   * entera de que se perdió lo que alguien había escrito.
   */
  it('rechaza una duración mal escrita en vez de mandarla vacía', async () => {
    conElReleaseEnLista(ep())
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar tema' }))
    await userEvent.type(await screen.findByLabelText(/^Título/), 'Nuevo')
    await userEvent.type(screen.getByLabelText(/^Duración/), '3:70')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }))

    expect(await screen.findByText(/se escribe como 3:34/)).toBeDefined()
    expect(vi.mocked(agregarTema)).not.toHaveBeenCalled()
  })

  it('mover un tema reemplaza la lista con la que devuelve el backend', async () => {
    conElReleaseEnLista(ep({ temas: 2 }))
    vi.mocked(temasDelRelease).mockResolvedValue([
      tema(),
      tema({ idCancion: 12, orden: 2, titulo: 'Segundo' }),
    ])
    vi.mocked(moverTema).mockResolvedValue([
      tema({ idCancion: 12, orden: 1, titulo: 'Segundo' }),
      tema({ orden: 2 }),
    ])
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))
    await userEvent.click(await screen.findByRole('button', { name: 'Subir Segundo' }))

    await waitFor(() => {
      expect(vi.mocked(moverTema)).toHaveBeenCalledWith(12, true)
    })
    const titulos = screen.getAllByText(/^(Primero|Segundo)$/).map((e) => e.textContent)
    expect(titulos).toEqual(['Segundo', 'Primero'])
  })

  /** El primero no se sube más: el botón está, apagado, y no miente. */
  it('no deja subir el primero ni bajar el último', async () => {
    conElReleaseEnLista(ep({ temas: 2 }))
    vi.mocked(temasDelRelease).mockResolvedValue([
      tema(),
      tema({ idCancion: 12, orden: 2, titulo: 'Segundo' }),
    ])
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))

    const subirElPrimero = await screen.findByRole('button', { name: 'Subir Primero' })
    expect(subirElPrimero.hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Bajar Segundo' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Bajar Primero' }).hasAttribute('disabled')).toBe(false)
  })

  /**
   * **El rechazo de `V26` §4 se muestra con las palabras del trigger.** Es la mitad
   * que hace que la regla dure más que un borrado: publicar con tres y sacar dos.
   */
  it('muestra el texto del backend cuando no se puede sacar un tema', async () => {
    conElReleaseEnLista(ep({ temas: 3, estado: 'PUBLICADO' }))
    vi.mocked(temasDelRelease).mockResolvedValue([
      tema(),
      tema({ idCancion: 12, orden: 2, titulo: 'Segundo' }),
      tema({ idCancion: 13, orden: 3, titulo: 'Tercero' }),
    ])
    vi.mocked(borrarTema).mockRejectedValue(
      new ApiError(
        409,
        'El release LJ021 ya esta publicado y es un EP: un EP lleva por lo menos 3.',
      ),
    )
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))
    const sacar = await screen.findAllByRole('button', { name: 'Sacar' })
    await userEvent.click(sacar[0])

    expect(await screen.findByText(/lleva por lo menos 3/)).toBeDefined()
  })

  /**
   * **El selector de formato vive en este bloque porque es el campo que decide si
   * el bloque existe.** Sin él, quien creó el release como "Sin definir" no tendría
   * dónde arreglarlo, y la pantalla no ofrecería lo que el backend le pide.
   */
  it('deja cambiar el formato sin pisar el resto del expediente', async () => {
    conElReleaseEnLista(release({ tipoRelease: null, genero: 'Techno', notas: 'algo' }))
    vi.mocked(editarRelease).mockResolvedValue(ep())
    montar()

    await userEvent.click(await screen.findByText('Horizonte'))
    await elegir(userEvent, 'Formato', 'EP')

    await waitFor(() => {
      expect(vi.mocked(editarRelease)).toHaveBeenCalledWith(1, {
        nombreRelease: 'Horizonte',
        tipoRelease: 'EP',
        genero: 'Techno',
        fechaEstimada: '2026-09-15',
        fechaReal: null,
        sistemaPromo: false,
        notas: 'algo',
      })
    })
  })

  /** DIRECTIVO lee el tracklist y no toca nada. */
  it('un directivo no ve los controles del tracklist', async () => {
    conElReleaseEnLista(ep({ temas: 1 }))
    vi.mocked(temasDelRelease).mockResolvedValue([tema()])
    montar('DIRECTIVO')

    await userEvent.click(await screen.findByText('Horizonte'))

    expect(await screen.findByText('Primero')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Agregar tema' })).toBeNull()
    expect(screen.queryByLabelText('Formato')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sacar' })).toBeNull()
  })
})
