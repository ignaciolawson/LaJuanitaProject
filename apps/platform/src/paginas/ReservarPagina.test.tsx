import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SalaResumen, TipoUsoResumen } from '../api/tiposAdmin'
import { ReservarPagina } from './ReservarPagina'

/**
 * Módulo 4 — pedir una sala.
 *
 * Los casos cuidan las tres cosas que esta pantalla no puede equivocar:
 *
 * 1. **No dice que reserva.** Lo que crea es un pedido; la reserva nace cuando
 *    administración carga la seña. Un botón que dijera "Reservar" prometería
 *    algo que la base no deja pasar.
 * 2. **Solo ofrece lo que se puede pedir** (P17) y solo en las salas donde ese
 *    uso está permitido (§2.6). Ofrecer lo imposible es ofrecer un rechazo.
 * 3. **No manda quién pide.** Sale del token.
 */

vi.mock('../api/portal', () => ({
  catalogoParaPedir: vi.fn(),
  disponibilidad: vi.fn(),
  pedirSala: vi.fn(),
}))

const { catalogoParaPedir, disponibilidad, pedirSala } = await import('../api/portal')

const ALQUILER: TipoUsoResumen = {
  idTipoUso: 5,
  codigo: 'ALQUILER_CABINA',
  nombre: 'Alquiler de cabina',
  esClase: false,
  color: '#f4a261',
  activo: true,
  solicitablePorUsuario: true,
}

const GRABACION: TipoUsoResumen = {
  idTipoUso: 6,
  codigo: 'GRABACION_SET',
  nombre: 'Grabación de set',
  esClase: false,
  color: '#264653',
  activo: true,
  solicitablePorUsuario: true,
}

/** Sala 1 alquila y no graba; la cabina graba y no alquila. Es la matriz real. */
const SALAS: SalaResumen[] = [
  {
    idSala: 1,
    nombre: 'Sala 1',
    descripcion: null,
    activa: true,
    orden: 1,
    usosPermitidos: [{ idTipoUso: 5, advertencia: null }],
  },
  {
    idSala: 3,
    nombre: 'Cabina de grabación',
    descripcion: null,
    activa: true,
    orden: 3,
    usosPermitidos: [
      { idTipoUso: 6, advertencia: null },
      { idTipoUso: 5, advertencia: 'Esta cabina no tiene silla ni escritorio.' },
    ],
  },
]

function montar() {
  return render(
    <MemoryRouter>
      <ReservarPagina />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(catalogoParaPedir).mockResolvedValue({ salas: SALAS, usos: [ALQUILER, GRABACION] })
  vi.mocked(disponibilidad).mockResolvedValue([])
})

describe('lo que la pantalla promete', () => {
  it('dice que confirma después, no que reserva', async () => {
    montar()

    expect(await screen.findByRole('button', { name: 'Mandar pedido' })).toBeDefined()
    expect(screen.getByText(/Todavía no reserva la sala/)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Reservar' })).toBeNull()
  })
})

describe('el catálogo', () => {
  /**
   * El filtrado real lo hace el backend, que solo devuelve lo solicitable. Acá
   * se pinea que la pantalla dibuja lo que le mandan y no una lista propia: si
   * mañana Mix & Mastering se vuelve solicitable, no hay nada que tocar acá.
   */
  it('ofrece los usos que vinieron del catálogo del portal', async () => {
    montar()

    const usos = await screen.findByLabelText('Qué querés hacer')
    expect(usos.textContent).toContain('Alquiler de cabina')
    expect(usos.textContent).toContain('Grabación de set')
    expect(usos.textContent).not.toContain('Clase de DJ')
  })

  /** §2.6: no se graba en la Sala 1, así que no se ofrece. */
  it('solo ofrece las salas donde ese uso está permitido', async () => {
    montar()
    await screen.findByLabelText('Sala')

    await userEvent.selectOptions(screen.getByLabelText('Qué querés hacer'), '6')

    await waitFor(() => {
      expect(screen.getByLabelText('Sala').textContent).not.toContain('Sala 1')
    })
    expect(screen.getByLabelText('Sala').textContent).toContain('Cabina de grabación')
  })

  /** "Se puede, pero ojo": bloquearlo sería rígido de más, callarlo sería peor. */
  it('muestra la advertencia de la matriz cuando la hay', async () => {
    montar()
    await screen.findByLabelText('Sala')
    await userEvent.selectOptions(screen.getByLabelText('Sala'), '3')

    expect(await screen.findByText(/no tiene silla ni escritorio/)).toBeDefined()
  })
})

describe('el pedido', () => {
  it('manda lo elegido y no dice quién pide', async () => {
    vi.mocked(pedirSala).mockResolvedValue({} as never)
    montar()

    await screen.findByLabelText('Sala')
    await userEvent.selectOptions(screen.getByLabelText('Sala'), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Mandar pedido' }))

    const enviado = vi.mocked(pedirSala).mock.calls[0][0]
    expect(enviado.idSala).toBe(1)
    expect(enviado.idTipoUso).toBe(5)
    expect(enviado).not.toHaveProperty('idUsuario')
  })

  it('no manda nada sin sala elegida', async () => {
    montar()
    await screen.findByLabelText('Sala')

    await userEvent.click(screen.getByRole('button', { name: 'Mandar pedido' }))

    expect(vi.mocked(pedirSala)).not.toHaveBeenCalled()
    expect(screen.getByText('Elegí la sala.')).toBeDefined()
  })
})

describe('la disponibilidad', () => {
  /**
   * Es una ayuda para elegir, no la agenda: viene sin dueño porque quién tiene
   * clase con quién es información de los otros alumnos.
   */
  it('muestra las franjas tomadas sin decir de quién son', async () => {
    vi.mocked(disponibilidad).mockResolvedValue([
      { fecha: '2026-09-10', horaInicio: '10:00:00', horaFin: '11:30:00', motivo: 'RESERVADA' },
      { fecha: '2026-09-10', horaInicio: '14:00:00', horaFin: '18:00:00', motivo: 'BLOQUEADA' },
    ])

    montar()
    await screen.findByLabelText('Sala')
    await userEvent.selectOptions(screen.getByLabelText('Sala'), '1')

    expect(await screen.findByText('10:00–11:30')).toBeDefined()
    expect(screen.getByText(/14:00–18:00 · sala no disponible/)).toBeDefined()
  })

  it('avisa cuando el día está libre', async () => {
    montar()
    await screen.findByLabelText('Sala')
    await userEvent.selectOptions(screen.getByLabelText('Sala'), '1')

    expect(await screen.findByText('La sala está libre todo el día.')).toBeDefined()
  })
})
