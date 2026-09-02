import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsuarioActual as Actual } from '../api/tipos'
import type { SolicitudResumen } from '../api/tiposPortal'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { SolicitudesPagina } from './SolicitudesPagina'
import { elegir } from '../pruebas/elegir'

/**
 * Módulo 4 — la bandeja de pedidos de sala.
 *
 * Lo que estos casos cuidan es lo que hace que el circuito cierre: que
 * **aprobar sea cobrar** —la reserva no existe sin seña, así que el "sí" es un
 * formulario de pago y no un botón—, que **rechazar obligue a decir por qué**
 * —del otro lado hay alguien que necesita saber qué hacer— y que un DIRECTIVO
 * vea la bandeja sin poder tocarla.
 */

vi.mock('../api/portal', () => ({
  listarSolicitudes: vi.fn(),
  aprobarSolicitud: vi.fn(),
  rechazarSolicitud: vi.fn(),
}))

vi.mock('../api/administracion', () => ({ adjuntarComprobante: vi.fn() }))

const { listarSolicitudes, aprobarSolicitud, rechazarSolicitud } = await import('../api/portal')
const { adjuntarComprobante } = await import('../api/administracion')

/** Lo que devuelve aprobar desde `V21`: la solicitud y el pago de la seña. */
function aprobada(cambios: Partial<SolicitudResumen> = {}) {
  return { solicitud: solicitud({ estado: 'APROBADA', idReserva: 99, ...cambios }), idPagoSena: 55 }
}

function solicitud(cambios: Partial<SolicitudResumen> = {}): SolicitudResumen {
  return {
    idSolicitud: 7,
    idUsuario: 30,
    nombre: 'Camila',
    apellido: 'Ríos',
    email: 'camila@ejemplo.com',
    idSala: 1,
    sala: 'Sala 1',
    idTipoUso: 5,
    tipoUso: 'Alquiler de cabina',
    fecha: '2026-09-10',
    horaInicio: '16:00:00',
    horaFin: '18:00:00',
    comentario: 'quiero practicar',
    estado: 'PENDIENTE',
    respuesta: null,
    resueltaPor: null,
    idReserva: null,
    fechaResolucion: null,
    fechaCreacion: '2026-08-19T10:00:00-03:00',
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
    <AuthContext value={contexto}>
      <SolicitudesPagina />
    </AuthContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarSolicitudes).mockResolvedValue({
    contenido: [solicitud()],
    pagina: 0,
    tamanio: 20,
    totalElementos: 1,
    totalPaginas: 1,
  })
})

describe('la bandeja', () => {
  it('abre en lo que está esperando respuesta', async () => {
    montar()

    expect(await screen.findByText('Ríos, Camila')).toBeDefined()
    expect(vi.mocked(listarSolicitudes).mock.calls[0][0]).toBe('PENDIENTE')
  })

  it('muestra qué pidió, cuándo y con qué comentario', async () => {
    montar()

    expect(await screen.findByText(/Alquiler de cabina en Sala 1/)).toBeDefined()
    expect(screen.getByText(/16:00 a 18:00/)).toBeDefined()
    expect(screen.getByText(/quiero practicar/)).toBeDefined()
  })
})

describe('aprobar es cobrar', () => {
  /**
   * La reserva no puede existir sin plata detrás (`V10`) y el usuario no tiene
   * cómo ponerla. Si esto alguna vez se convierte en un botón suelto, el alta
   * de la reserva se cae al cerrar la transacción.
   */
  it('confirmar cobrando pide la seña antes de crear la reserva', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar el pedido' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Ya pagó: cobrar ahora' }))

    expect(screen.getByText(/no se aparta un horario sin pago por adelantado/i)).toBeDefined()
    expect(vi.mocked(aprobarSolicitud)).not.toHaveBeenCalled()
  })

  /**
   * **El comprobante de la seña se adjunta al aprobar** (hallazgo #5 de
   * `docs/mejoras.md`). Este es el circuito donde más importa: la persona pidió
   * por el portal, transfirió, y quien aprueba está mirando esa transferencia —
   * si no se puede adjuntar ahí, el respaldo se pierde en el momento en que existe.
   *
   * **Son dos pedidos y no uno**, y eso lo trajo `V21`: el respaldo dejó de ser
   * una ruta escrita a mano para ser un archivo, y un archivo no viaja en el JSON.
   * El segundo va contra el pago que el primero devuelve.
   */
  it('el comprobante se adjunta al pago que crea la aprobación', async () => {
    vi.mocked(aprobarSolicitud).mockResolvedValue(aprobada())
    const archivo = new File(['%PDF-1.4'], 'transferencia.pdf', { type: 'application/pdf' })

    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar el pedido' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Ya pagó: cobrar ahora' }))
    await userEvent.type(screen.getByLabelText(/Monto de la seña/), '25000')
    await userEvent.upload(screen.getByLabelText('Comprobante'), archivo)
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar y crear la reserva' }))

    await waitFor(() => expect(adjuntarComprobante).toHaveBeenCalledWith(55, archivo))
  })

  /** Y es opcional: una seña en efectivo no tiene comprobante. */
  it('sin comprobante la aprobación sale igual', async () => {
    vi.mocked(aprobarSolicitud).mockResolvedValue(aprobada())

    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar el pedido' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Ya pagó: cobrar ahora' }))
    await userEvent.type(screen.getByLabelText(/Monto de la seña/), '25000')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar y crear la reserva' }))

    await waitFor(() => expect(aprobarSolicitud).toHaveBeenCalled())
    expect(adjuntarComprobante).not.toHaveBeenCalled()
  })

  it('no deja confirmar sin monto', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar el pedido' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Ya pagó: cobrar ahora' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar y crear la reserva' }))

    expect(screen.getByRole('alert').textContent).toContain('Poné el monto de la seña')
    expect(vi.mocked(aprobarSolicitud)).not.toHaveBeenCalled()
  })

  /** Espeja `pago_usd_con_cotizacion`: sin ella el importe no se reconstruye. */
  it('un pago en dólares exige la cotización', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar el pedido' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Ya pagó: cobrar ahora' }))
    await userEvent.type(screen.getByLabelText(/Monto de la seña/), '100')
    await elegir(userEvent, 'Moneda', 'USD')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar y crear la reserva' }))

    expect(screen.getByRole('alert').textContent).toContain('cotización')
    expect(vi.mocked(aprobarSolicitud)).not.toHaveBeenCalled()
  })

  /**
   * <b>Quién paga no viaja en el pedido.</b> Es el que pidió, y lo pone el
   * servidor: aceptarlo acá sería poder acreditar la seña de uno contra la
   * cuenta de otro.
   */
  it('manda la seña sin decir quién paga', async () => {
    vi.mocked(aprobarSolicitud).mockResolvedValue(aprobada())
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar el pedido' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Ya pagó: cobrar ahora' }))
    await userEvent.type(screen.getByLabelText(/Monto de la seña/), '15000')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar y crear la reserva' }))

    const [id, sena] = vi.mocked(aprobarSolicitud).mock.calls[0]
    expect(id).toBe(7)
    expect(sena).toEqual({
      monto: 15000,
      moneda: 'ARS',
      cotizacionDolar: undefined,
      medioPago: 'TRANSFERENCIA',
      preconfirmar: false,
      respuesta: undefined,
    })
    expect(sena).not.toHaveProperty('idUsuario')
  })
})

describe('rechazar', () => {
  it('no manda el rechazo sin motivo', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(vi.mocked(rechazarSolicitud)).not.toHaveBeenCalled()
  })

  it('manda el motivo, que es lo que le llega a la persona', async () => {
    vi.mocked(rechazarSolicitud).mockResolvedValue(solicitud({ estado: 'RECHAZADA' }))
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))
    await userEvent.type(screen.getByLabelText('Motivo'), 'esa tarde hay mantenimiento')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(vi.mocked(rechazarSolicitud)).toHaveBeenCalledWith(7, 'esa tarde hay mantenimiento')
  })
})

/**
 * La razón de ser del cuarto rol: los socios leen todo el sistema y no escriben
 * nada. Ocultarles la bandeja sería mentir sobre lo que pueden ver; ofrecerles
 * los botones sería ofrecerles un 403.
 */
describe('permisos', () => {
  it('un DIRECTIVO ve los pedidos y no los puede resolver', async () => {
    montar('DIRECTIVO')

    expect(await screen.findByText('Ríos, Camila')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Confirmar el pedido' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rechazar' })).toBeNull()
  })
})

/**
 * La prereserva (`mejoras.md` §13 · C1).
 *
 * El problema que resuelve, en las palabras de Ignacio: *"el admin está obligado
 * a tener ya el cobro de la reserva para ponerle 'confirmar y cobrar', entonces va
 * a tener eso ahí en pendiente"*. Apartar el horario saca el pedido de la bandeja
 * sin obligar a cobrar en ese momento.
 */
describe('apartar el horario sin cobrar (§13 · C1)', () => {
  it('⚠️ apartar es lo que ofrece primero, no cobrar', async () => {
    // **Es la respuesta al problema, no una preferencia de orden.** Si cobrar
    // fuera el default, el admin seguiría teniendo que tener la plata en la mano
    // para sacar el pedido de la bandeja — que es exactamente lo que se pidió
    // cambiar.
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar el pedido' }))

    expect(screen.getByRole('radio', { name: 'Apartar el horario' }).getAttribute('aria-checked'))
      .toBe('true')
    expect(screen.getByRole('button', { name: 'Apartar el horario' })).toBeDefined()
  })

  it('apartando manda preconfirmar y no adjunta ningún comprobante', async () => {
    vi.mocked(aprobarSolicitud).mockResolvedValue(aprobada())
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar el pedido' }))
    await userEvent.type(screen.getByLabelText(/Monto a abonar/), '45000')
    await userEvent.click(screen.getByRole('button', { name: 'Apartar el horario' }))

    await waitFor(() => expect(aprobarSolicitud).toHaveBeenCalled())
    const [, sena] = vi.mocked(aprobarSolicitud).mock.calls[0]
    expect(sena.preconfirmar).toBe(true)
    expect(adjuntarComprobante).not.toHaveBeenCalled()
  })

  it('⚠️ apartando no hay campo de comprobante, porque no existe', async () => {
    // No es que sea opcional: nadie pagó todavía. Un campo para adjuntarlo invita
    // a subir cualquier cosa contra una deuda, que es el defecto que el hallazgo
    // #5 vino a cerrar del otro lado.
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar el pedido' }))

    expect(screen.queryByLabelText('Comprobante')).toBeNull()

    await userEvent.click(screen.getByRole('radio', { name: 'Ya pagó: cobrar ahora' }))
    expect(screen.getByLabelText('Comprobante')).toBeDefined()
  })

  it('dice el plazo y qué pasa si no se abona', async () => {
    // La persona del otro lado tiene que saber que hay un reloj corriendo, y quien
    // aparta también: sin esto, "apartar" se lee como una reserva más.
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar el pedido' }))

    expect(screen.getByText(/24 horas/)).toBeDefined()
    expect(screen.getByText(/el horario se libera solo/)).toBeDefined()
  })
})
