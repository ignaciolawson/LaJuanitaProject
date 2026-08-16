import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SalaResumen, UsoDeSala } from '../api/tiposAdmin'
import { UsoDeSalasPagina } from './UsoDeSalasPagina'

/**
 * Módulo 2, pantalla 4 — el uso de las salas.
 *
 * <p>Acá no hay reglas de negocio que romper: lo que se puede romper es
 * <b>la lectura de un número</b>, y esos errores no tiran excepción, dan otra
 * cifra. Los casos apuntan a los tres que importan — que una sala sin uso
 * desaparezca en vez de salir en cero, que lo cancelado se lea como uso, y que
 * un informe que falló deje en pantalla los números del período anterior.
 */

vi.mock('../api/administracion', () => ({
  usoDeSalas: vi.fn(),
  listarSalas: vi.fn(),
}))

const { listarSalas, usoDeSalas } = await import('../api/administracion')

const SALAS: SalaResumen[] = [
  { idSala: 1, nombre: 'Sala 1', descripcion: null, activa: true, orden: 1, usosPermitidos: [] },
  { idSala: 2, nombre: 'Sala 2', descripcion: null, activa: true, orden: 2, usosPermitidos: [] },
]

function uso(cambios: Partial<UsoDeSala> = {}): UsoDeSala {
  return {
    idSala: 1,
    sala: 'Sala 1',
    activa: true,
    reservas: 2,
    horas: 3,
    canceladas: 0,
    reprogramadas: 0,
    porTipo: [
      { idTipoUso: 1, tipoUso: 'Clase de DJ', color: '#e63946', reservas: 2, horas: 3 },
    ],
    ...cambios,
  }
}

/**
 * La tarjeta de una sala, por su encabezado. `findByText` no sirve: el nombre
 * está también en el `<option>` del filtro, y los dos casan.
 */
function tarjeta(nombre: string) {
  return screen.findByRole('heading', { name: new RegExp(nombre) })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarSalas).mockResolvedValue(SALAS)
  vi.mocked(usoDeSalas).mockResolvedValue([uso()])
})

describe('los números', () => {
  it('muestra las horas y las reservas de cada sala', async () => {
    render(<UsoDeSalasPagina />)

    expect(await tarjeta('Sala 1')).toBeDefined()
    expect(screen.getAllByText('3 h').length).toBeGreaterThan(0)
    expect(screen.getByText('2 reservas')).toBeDefined()
  })

  /** Un "1,5 h" obliga a hacer la cuenta de cabeza; el horario del estudio es en minutos. */
  it('las horas con fracción se dicen en horas y minutos', async () => {
    vi.mocked(usoDeSalas).mockResolvedValue([
      uso({ horas: 1.5, porTipo: [{ idTipoUso: 1, tipoUso: 'Clase de DJ', color: null, reservas: 1, horas: 1.5 }] }),
    ])

    render(<UsoDeSalasPagina />)

    expect(await screen.findAllByText('1 h 30 min')).toBeDefined()
    expect(screen.queryByText(/1\.5/)).toBeNull()
  })

  it('menos de una hora se dice en minutos', async () => {
    vi.mocked(usoDeSalas).mockResolvedValue([
      uso({ horas: 0.5, porTipo: [{ idTipoUso: 1, tipoUso: 'Clase de DJ', color: null, reservas: 1, horas: 0.5 }] }),
    ])

    render(<UsoDeSalasPagina />)

    expect(await screen.findAllByText('30 min')).toBeDefined()
  })

  it('desglosa por tipo de uso', async () => {
    vi.mocked(usoDeSalas).mockResolvedValue([
      uso({
        horas: 7,
        porTipo: [
          { idTipoUso: 3, tipoUso: 'Alquiler de cabina', color: '#457b9d', reservas: 1, horas: 4 },
          { idTipoUso: 1, tipoUso: 'Clase de DJ', color: '#e63946', reservas: 2, horas: 3 },
        ],
      }),
    ])

    render(<UsoDeSalasPagina />)

    expect(await screen.findByText('Alquiler de cabina')).toBeDefined()
    expect(screen.getByText('Clase de DJ')).toBeDefined()
  })
})

/**
 * <b>El cero es el dato.</b> La pregunta que trae a esta pantalla es si conviene
 * alquilar la sala, y una fila ausente se lee como que el sistema perdió el dato.
 */
describe('una sala sin uso', () => {
  it('aparece igual y dice que no se usó', async () => {
    vi.mocked(usoDeSalas).mockResolvedValue([
      uso(),
      uso({ idSala: 2, sala: 'Sala 2', reservas: 0, horas: 0, porTipo: [] }),
    ])

    render(<UsoDeSalasPagina />)

    expect(await tarjeta('Sala 2')).toBeDefined()
    expect(screen.getByText('No se usó en este período.')).toBeDefined()
  })

  it('una sala inactiva se muestra marcada, no escondida', async () => {
    vi.mocked(usoDeSalas).mockResolvedValue([uso({ activa: false })])

    render(<UsoDeSalasPagina />)

    expect(await screen.findByText('(inactiva)')).toBeDefined()
  })
})

/**
 * Veinte clases dictadas y veinte canceladas no son el mismo uso. Se muestran,
 * porque una sala con muchas cancelaciones es un dato — pero aparte.
 */
describe('lo que se cayó', () => {
  it('se cuenta aparte y se aclara que no es uso', async () => {
    vi.mocked(usoDeSalas).mockResolvedValue([uso({ canceladas: 3, reprogramadas: 1 })])

    render(<UsoDeSalasPagina />)

    const nota = await screen.findByText(/3 canceladas/)
    expect(nota.textContent).toContain('1 reprogramada')
    expect(nota.textContent).toContain('no cuentan como uso')
  })

  it('sin nada caído no dibuja la nota', async () => {
    render(<UsoDeSalasPagina />)

    await tarjeta('Sala 1')
    expect(screen.queryByText(/no cuentan como uso/)).toBeNull()
  })
})

describe('los filtros', () => {
  it('filtrar por sala se lo pide al backend', async () => {
    const user = userEvent.setup()
    render(<UsoDeSalasPagina />)

    await tarjeta('Sala 1')
    await user.selectOptions(screen.getByLabelText('Filtrar por sala'), '2')

    await waitFor(() => expect(vi.mocked(usoDeSalas).mock.calls.at(-1)?.[0].idSala).toBe(2))
  })

  it('el atajo de 90 días mueve el desde y deja el hasta en hoy', async () => {
    const user = userEvent.setup()
    render(<UsoDeSalasPagina />)

    await tarjeta('Sala 1')
    const anterior = vi.mocked(usoDeSalas).mock.calls[0][0]

    await user.click(screen.getByRole('button', { name: '90 días' }))

    await waitFor(() => {
      const ahora = vi.mocked(usoDeSalas).mock.calls.at(-1)?.[0]
      expect(ahora?.desde).not.toBe(anterior.desde)
      expect(ahora?.hasta).toBe(anterior.hasta)
    })
  })
})

describe('errores', () => {
  /**
   * Si falla, el informe viejo <b>no</b> puede quedar en pantalla: se leería como
   * si esos números fueran los del período pedido. Un informe equivocado es peor
   * que ninguno.
   */
  it('un informe que falla no deja los números del período anterior', async () => {
    const { ApiError } = await import('../api/cliente')
    const user = userEvent.setup()

    render(<UsoDeSalasPagina />)
    expect(await tarjeta('Sala 1')).toBeDefined()

    vi.mocked(usoDeSalas).mockRejectedValue(
      new ApiError(400, 'El informe se pide de a un año como máximo.'),
    )
    await user.click(screen.getByRole('button', { name: '90 días' }))

    expect(await screen.findByText('El informe se pide de a un año como máximo.')).toBeDefined()
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Sala 1/ })).toBeNull())
  })
})
