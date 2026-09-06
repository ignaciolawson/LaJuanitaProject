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
   * ⚠️ **El teléfono dejó de ir pegado al mail en gris chico.** Este caso decía
   * antes que los dos iban juntos en un renglón, y era cierto — pero el teléfono
   * es el único dato de la ficha que se usa **con las manos**: hay que leerlo y
   * tipearlo en otra aplicación. Ahora va solo, grande y con su botón.
   */
  it('muestra qué pidió, por dónde contestarle y qué escribió', async () => {
    montar()

    expect(await screen.findByText('camila@ejemplo.com')).toBeDefined()
    expect(screen.getByText('11-5555-4444')).toBeDefined()
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

/**
 * Escribirle por WhatsApp (Fase 1 de la mejora del buzón).
 *
 * **Lo que estos casos cuidan no es el link: es que el sistema deje de hacer
 * tipear lo que ya sabe.** El teléfono y la contraseña temporal están los dos en
 * la pantalla, y hasta ahora había que leerlos y volver a escribirlos en otra
 * aplicación. Con la contraseña eso no es una molestia sino un error: **no se
 * puede volver a ver**, así que un dígito mal copiado es una cuenta que hay que
 * resetear.
 *
 * ⚠️ **Y el caso que más pesa es el del número ilegible.** Un `wa.me` mal armado
 * abre WhatsApp diciendo *"número no válido"*: parece que el sistema hizo algo y
 * deja a quien atiende peor que antes. La pantalla tiene que **decirlo y no
 * ofrecer el botón**.
 */
describe('escribirle por WhatsApp', () => {
  /** El texto del mensaje, ya desarmado del link. */
  function mensajeDe(enlace: HTMLElement): string {
    const url = new URL(enlace.getAttribute('href') as string)
    return url.searchParams.get('text') ?? ''
  }

  it('ofrece escribirle, con el saludo que nombra lo que pidió', async () => {
    montar()

    const enlace = await screen.findByRole('link', { name: 'Escribirle' })

    expect(enlace.getAttribute('href')).toContain('wa.me/5491155554444')
    expect(mensajeDe(enlace)).toContain('Camila')
    // "Un curso" en la ficha, "un curso" adentro de la oración.
    expect(mensajeDe(enlace)).toContain('un curso')
  })

  /**
   * **El que evita el error caro.** La clave viaja escrita por el sistema, junto
   * con el mail con el que se entra: las dos cosas que, mal copiadas, terminan en
   * la misma repregunta.
   */
  it('manda la clave temporal escrita, sin tipearla', async () => {
    vi.mocked(convertirSolicitante).mockResolvedValue(conversion())
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Darle cuenta' }))

    const enlace = await screen.findByRole('link', { name: 'Mandarle la clave por WhatsApp' })
    expect(mensajeDe(enlace)).toContain('lluvia-42-roja')
    expect(mensajeDe(enlace)).toContain('camila@ejemplo.com')
  })

  /**
   * ⚠️ **La mitad que importa: con un número que no se puede leer NO hay botón.**
   * Si acá apareciera un link, abriría WhatsApp con un número inválido y quien
   * atiende creería que escribió.
   */
  it('con un teléfono ilegible lo dice y no ofrece el link', async () => {
    vi.mocked(listarSolicitantes).mockResolvedValue({
      contenido: [ficha({ telefono: 'no tengo, escribime por Instagram' })],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    montar()

    expect(await screen.findByText(/no se puede abrir en WhatsApp/)).toBeDefined()
    expect(screen.queryByRole('link', { name: 'Escribirle' })).toBeNull()
  })

  it('copia el número al portapapeles', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: escribir },
      configurable: true,
    })
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Copiar' }))

    expect(escribir).toHaveBeenCalledWith('11-5555-4444')
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeDefined()
  })
})
