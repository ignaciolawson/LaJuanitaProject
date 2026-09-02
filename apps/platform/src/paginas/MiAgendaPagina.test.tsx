import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReservaResumen } from '../api/tiposAdmin'
import type { ClasesDictadas } from '../api/tiposDocencia'
import { MiAgendaPagina } from './MiAgendaPagina'

/**
 * Módulo 5, pantallas 1 y 5 — mi agenda y mis clases dictadas.
 *
 * Lo que los casos sostienen:
 *
 * 1. **El resumen cuenta y no liquida.** No hay total ni tarifa, y no es una
 *    omisión visual: si la liquidación al profesor sale de esta cuenta o se carga
 *    a mano es P20, abierta con el cliente. Un número de plata acá la contestaría
 *    por él.
 * 2. **Una clase cancelada se muestra, marcada.** Es la misma decisión que toma
 *    el portal del alumno: enterarse de que se cayó una clase es para lo que se
 *    abre esto.
 * 3. **Quien se dio de baja no figura entre los que van.** Mandar al profesor a
 *    buscar a alguien que avisó que no venía es peor que no listarlo.
 */

vi.mock('../api/docencia', () => ({ miAgenda: vi.fn(), misClasesDictadas: vi.fn() }))
// El profesor pide mover su clase con el mismo componente que el alumno (P9),
// así que esta pantalla llama al portal aunque no sea suya.
vi.mock('../api/portal', () => ({ misReprogramaciones: vi.fn(), pedirMoverLaClase: vi.fn() }))

const { miAgenda, misClasesDictadas } = await import('../api/docencia')
const { misReprogramaciones, pedirMoverLaClase } = await import('../api/portal')

function clase(cambios: Partial<ReservaResumen> = {}): ReservaResumen {
  return {
    idReserva: 1,
    idSala: 1,
    sala: 'Sala 1',
    idTipoUso: 1,
    tipoUso: 'Clase de DJ',
    color: '#e63946',
    esClase: true,
    idProfesor: 3,
    profesor: 'Ghezz Pérez',
    fecha: '2026-08-19',
    horaInicio: '10:00:00',
    horaFin: '11:30:00',
    estado: 'CONFIRMADA',
    venceEn: null,
    notas: null,
    idReservaRecupera: null,
    motivoReprogramacion: null,
    participantes: [
      {
        idParticipacion: 900,
        idUsuario: 42,
        nombre: 'Juan',
        apellido: 'Pérez',
        idInscripcion: 10,
        disciplina: 'DJ',
        estadoAsistencia: 'PENDIENTE',
        observaciones: null,
      },
    ],
    ...cambios,
  }
}

const RESUMEN: ClasesDictadas = {
  desde: '2026-08-17',
  hasta: '2026-08-23',
  clases: 4,
  alumnosAtendidos: 3,
  porTipo: [
    { tipoUso: 'Clase de DJ', clases: 2 },
    { tipoUso: 'Mentoría', clases: 2 },
  ],
}

/**
 * El tipo de uso aparece en la lista y en el desglose del resumen, así que cada
 * zona se pregunta por su nombre. No es un rodeo del test: son dos lecturas del
 * mismo dato y las dos tienen que estar.
 */
function laAgenda() {
  return within(screen.getByRole('list', { name: 'Clases de la semana' }))
}

function elResumen() {
  return within(screen.getByRole('region', { name: /Clases dictadas/ }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(miAgenda).mockResolvedValue([clase()])
  vi.mocked(misClasesDictadas).mockResolvedValue(RESUMEN)
  vi.mocked(misReprogramaciones).mockResolvedValue([])
})

describe('la agenda', () => {
  it('muestra qué, cuándo, dónde y con quién', async () => {
    render(<MiAgendaPagina />)

    await screen.findByText('10:00 a 11:30')
    expect(laAgenda().getByText('Clase de DJ')).toBeDefined()
    expect(laAgenda().getByText(/Sala 1/)).toBeDefined()
    expect(laAgenda().getByText(/Juan Pérez/)).toBeDefined()
  })

  it('una clase cancelada se muestra, marcada', async () => {
    vi.mocked(miAgenda).mockResolvedValue([clase({ estado: 'CANCELADA' })])
    render(<MiAgendaPagina />)

    expect(await screen.findByText('Cancelada')).toBeDefined()
    expect(laAgenda().getByText('Clase de DJ')).toBeDefined()
  })

  it('quien se dio de baja no aparece entre los que van', async () => {
    vi.mocked(miAgenda).mockResolvedValue([
      clase({
        participantes: [
          {
            idParticipacion: 900,
            idUsuario: 42,
            nombre: 'Juan',
            apellido: 'Pérez',
            idInscripcion: 10,
            disciplina: 'DJ',
            estadoAsistencia: 'CANCELADA',
            observaciones: null,
          },
        ],
      }),
    ])
    render(<MiAgendaPagina />)

    await screen.findByText('10:00 a 11:30')
    expect(laAgenda().getByText('Clase de DJ')).toBeDefined()
    expect(laAgenda().queryByText(/Juan Pérez/)).toBeNull()
  })

  it('una semana sin clases lo dice', async () => {
    vi.mocked(miAgenda).mockResolvedValue([])
    render(<MiAgendaPagina />)

    expect(await screen.findByText(/No tenés clases en esta semana/)).toBeDefined()
  })
})

describe('las clases dictadas', () => {
  it('cuenta clases y personas distintas', async () => {
    render(<MiAgendaPagina />)

    await screen.findByRole('region', { name: /Clases dictadas/ })
    expect(elResumen().getByText('4')).toBeDefined()
    expect(elResumen().getByText('3')).toBeDefined()
    expect(elResumen().getByText('alumnos atendidos')).toBeDefined()
  })

  /**
   * P20 sigue abierta: acá no puede aparecer plata. El caso mira que no haya
   * signo de pesos en ningún lado, que es la forma más directa de que nadie
   * "complete" el resumen con una tarifa inventada.
   */
  it('no muestra ni total ni tarifa', async () => {
    const { container } = render(<MiAgendaPagina />)

    await screen.findByRole('region', { name: /Clases dictadas/ })
    expect(container.textContent).not.toContain('$')
  })

  it('pide el resumen del mismo período que la lista', async () => {
    render(<MiAgendaPagina />)

    await screen.findByText('10:00 a 11:30')
    const rangoDeLaAgenda = vi.mocked(miAgenda).mock.calls[0]
    const rangoDelResumen = vi.mocked(misClasesDictadas).mock.calls[0]
    expect(rangoDelResumen).toEqual(rangoDeLaAgenda)
  })
})


/**
 * P9, contestada el 2026-08-29: **el profesor pide mover su clase con el mismo
 * botón que el alumno.** Es el que más veces lo necesita —se enferma, se le
 * superpone algo— y hasta ahora eso viajaba por WhatsApp y no quedaba escrito.
 *
 * Lo que sigue sin poder hacer es moverla él: mover una clase revisa
 * solapamientos y arrastra la seña. Pide; mueve administración.
 */
describe('pedir que muevan una clase (P9)', () => {
  it('el profesor puede pedirlo sobre una clase que todavía no pasó', async () => {
    vi.mocked(miAgenda).mockResolvedValue([clase({ fecha: '2030-04-08' })])
    render(<MiAgendaPagina />)

    expect(await screen.findByRole('button', { name: 'Pedir otro día' })).toBeDefined()
  })

  it('manda el pedido con su motivo', async () => {
    vi.mocked(miAgenda).mockResolvedValue([clase({ fecha: '2030-04-08' })])
    vi.mocked(pedirMoverLaClase).mockResolvedValue({
      idSolicitud: 1,
      idUsuario: 9,
      nombre: 'Lucas',
      apellido: 'Gómez',
      idReserva: 1,
      sala: 'Sala 1',
      tipoUso: 'Clase de DJ',
      fecha: '2030-04-08',
      horaInicio: '10:00:00',
      horaFin: '11:30:00',
      motivo: 'Tengo una fecha ese día',
      fechaAlternativaSolicitada: null,
      estado: 'PENDIENTE',
      respuesta: null,
      resueltaPor: null,
      fechaSolicitud: '2026-08-29T10:00:00-03:00',
      fechaResolucion: null,
    })
    render(<MiAgendaPagina />)

    await userEvent.click(await screen.findByRole('button', { name: 'Pedir otro día' }))
    await userEvent.type(screen.getByLabelText(/Por qué no podés/), 'Tengo una fecha ese día')
    await userEvent.click(screen.getByRole('button', { name: 'Mandar el pedido' }))

    await waitFor(() => expect(pedirMoverLaClase).toHaveBeenCalled())
    expect(vi.mocked(pedirMoverLaClase).mock.calls[0][0].motivo).toBe('Tengo una fecha ese día')
  })
})
