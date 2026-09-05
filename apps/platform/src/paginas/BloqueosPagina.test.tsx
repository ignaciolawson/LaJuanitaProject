import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BloqueoResumen, SalaResumen } from '../api/tiposAdmin'
import type { UsuarioActual as Actual } from '../api/tipos'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { BloqueosPagina } from './BloqueosPagina'
import { elegir } from '../pruebas/elegir'

/**
 * Módulo 2, pantalla 3 — salas fuera de servicio.
 *
 * <p>Los casos apuntan a lo que esta pantalla puede decir <b>mal</b> sin que
 * nadie lo note: cómo se lee un bloqueo. Una fila es una franja que se repite
 * todos los días del rango, y mostrarla como si fuera un intervalo continuo es
 * exactamente el error que `V6` cometió en la base y que `V7` tuvo que
 * deshacer. Acá no rompe nada, y por eso es peor: alguien lee "del 1 al 10 de 9
 * a 13", entiende otra cosa, y programa una clase donde no va.
 */

vi.mock('../api/administracion', () => ({
  listarBloqueos: vi.fn(),
  listarSalas: vi.fn(),
  altaBloqueo: vi.fn(),
  eliminarBloqueo: vi.fn(),
}))

const { altaBloqueo, eliminarBloqueo, listarBloqueos, listarSalas } = await import(
  '../api/administracion'
)

const SALAS: SalaResumen[] = [
  { idSala: 1, nombre: 'Sala 1', descripcion: null, activa: true, orden: 1, usosPermitidos: [] },
  { idSala: 2, nombre: 'Sala 2', descripcion: null, activa: true, orden: 2, usosPermitidos: [] },
]

function bloqueo(cambios: Partial<BloqueoResumen> = {}): BloqueoResumen {
  return {
    idBloqueo: 1,
    idSala: 1,
    sala: 'Sala 1',
    fechaInicio: '2026-09-01',
    fechaFin: '2026-09-10',
    horaInicio: '00:00:00',
    horaFin: '23:59:00',
    diaCompleto: true,
    motivo: 'Refacción del piso',
    vigente: true,
    registradoPor: 'Micaela Pérez',
    fechaRegistro: '2026-08-16T14:00:00Z',
    ...cambios,
  }
}

function usuario(rol: Actual['rol']): Actual {
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

function montar(rol: Actual['rol'] = 'STAFF') {
  const contexto: ContextoAuth = {
    sesion: { estado: 'autenticado', usuario: usuario(rol) },
    iniciarSesion: async () => {},
    registrarse: async () => {},
    cerrarSesion: () => {},
    refrescarUsuario: async () => {},
  }

  return render(
    <AuthContext value={contexto}>
      <BloqueosPagina />
    </AuthContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarSalas).mockResolvedValue(SALAS)
  vi.mocked(listarBloqueos).mockResolvedValue([bloqueo()])
})

describe('el listado', () => {
  it('muestra la sala, el rango y el motivo', async () => {
    montar()

    expect(await screen.findByText('Refacción del piso')).toBeDefined()
    // Con año desde §14 · A5: esto es una fila de una tabla, no una vista
    // semanal, así que nada en pantalla dice de qué año se habla — y un bloqueo
    // se carga para el futuro.
    expect(screen.getByText('01/09/2026 al 10/09/2026')).toBeDefined()
    expect(screen.getByText('Micaela Pérez')).toBeDefined()
  })

  it('un bloqueo de un solo día no se escribe como rango', async () => {
    vi.mocked(listarBloqueos).mockResolvedValue([
      bloqueo({ fechaInicio: '2026-09-01', fechaFin: '2026-09-01' }),
    ])

    montar()

    expect(await screen.findByText('01/09/2026')).toBeDefined()
  })

  it('sin bloqueos lo dice', async () => {
    vi.mocked(listarBloqueos).mockResolvedValue([])

    montar()

    expect(await screen.findByText('Las tres salas están disponibles.')).toBeDefined()
  })

  it('un bloqueo vencido se marca como tal', async () => {
    vi.mocked(listarBloqueos).mockResolvedValue([bloqueo({ vigente: false })])

    montar()

    expect(await screen.findByText('vencido')).toBeDefined()
  })

  /** Por defecto el backend arranca en hoy; el histórico se pide bajando `desde`. */
  it('ver los vencidos pide un rango que arranca antes', async () => {
    const user = userEvent.setup()
    montar()

    await waitFor(() => expect(listarBloqueos).toHaveBeenCalled())
    expect(vi.mocked(listarBloqueos).mock.calls[0][0]?.desde).toBeUndefined()

    await user.click(screen.getByLabelText('Ver también los vencidos'))

    await waitFor(() =>
      expect(vi.mocked(listarBloqueos).mock.calls.at(-1)?.[0]?.desde).toBeDefined(),
    )
  })
})

/**
 * <b>Lo que `V7` tuvo que rescatar.</b> Una fila es una franja que se repite
 * todos los días del rango, no un intervalo continuo.
 */
describe('cómo se lee un bloqueo', () => {
  it('el día entero se dice "Todo el día", no "00:00 a 23:59"', async () => {
    montar()

    expect(await screen.findByText('Todo el día')).toBeDefined()
    expect(screen.queryByText(/23:59/)).toBeNull()
  })

  it('una franja en un rango de varios días aclara que se repite', async () => {
    vi.mocked(listarBloqueos).mockResolvedValue([
      bloqueo({ horaInicio: '09:00:00', horaFin: '13:00:00', diaCompleto: false }),
    ])

    montar()

    expect(await screen.findByText('09:00 a 13:00, todos los días')).toBeDefined()
  })

  it('una franja de un solo día no necesita la aclaración', async () => {
    vi.mocked(listarBloqueos).mockResolvedValue([
      bloqueo({
        fechaInicio: '2026-09-01',
        fechaFin: '2026-09-01',
        horaInicio: '09:00:00',
        horaFin: '13:00:00',
        diaCompleto: false,
      }),
    ])

    montar()

    expect(await screen.findByText('09:00 a 13:00')).toBeDefined()
  })
})

describe('el alta', () => {
  async function abrirFormulario() {
    const user = userEvent.setup()
    montar()
    await user.click(await screen.findByRole('button', { name: 'Bloquear una sala' }))
    return user
  }

  /**
   * Sin horas, el backend pone el día entero. Mandar 00:00/23:59 desde acá
   * sería copiar un default que ya vive en `V1` y en el servicio.
   */
  it('sin franja manda las horas en null', async () => {
    vi.mocked(altaBloqueo).mockResolvedValue(bloqueo())
    const user = await abrirFormulario()

    await elegir(user, 'Sala', '1')
    await user.type(screen.getByLabelText('Motivo'), 'Mantenimiento')
    await user.click(screen.getByRole('button', { name: 'Bloquear' }))

    await waitFor(() => expect(altaBloqueo).toHaveBeenCalled())
    const enviado = vi.mocked(altaBloqueo).mock.calls[0][0]
    expect(enviado.horaInicio).toBeNull()
    expect(enviado.horaFin).toBeNull()
    expect(enviado.motivo).toBe('Mantenimiento')
  })

  it('con franja manda las horas', async () => {
    vi.mocked(altaBloqueo).mockResolvedValue(bloqueo())
    const user = await abrirFormulario()

    await elegir(user, 'Sala', '2')
    await user.type(screen.getByLabelText('Motivo'), 'Obra')
    await user.click(screen.getByLabelText('Solo una franja horaria'))
    await user.click(screen.getByRole('button', { name: 'Bloquear' }))

    await waitFor(() => expect(altaBloqueo).toHaveBeenCalled())
    expect(vi.mocked(altaBloqueo).mock.calls[0][0].horaInicio).toBe('09:00')
  })

  /** La aclaración solo aparece cuando hay franja que aclarar. */
  it('al pedir una franja avisa que se repite todos los días', async () => {
    const user = await abrirFormulario()

    expect(screen.queryByText(/se repite/)).toBeNull()
    await user.click(screen.getByLabelText('Solo una franja horaria'))
    expect(screen.getByText(/todos los días/)).toBeDefined()
  })

  it('un bloqueo sin motivo no se manda', async () => {
    const user = await abrirFormulario()

    await elegir(user, 'Sala', '1')
    await user.click(screen.getByRole('button', { name: 'Bloquear' }))

    expect(await screen.findByText('Escribí por qué se bloquea la sala.')).toBeDefined()
    expect(altaBloqueo).not.toHaveBeenCalled()
  })

  /**
   * El rechazo más frecuente del trigger: la sala todavía tiene clases adentro
   * del rango. El mensaje que se muestra es el que escribió la base, con la
   * cantidad — decir "no se pudo" sería quitarle a Micaela el dato que necesita.
   */
  it('muestra el rechazo de la base tal como viene', async () => {
    const { ApiError } = await import('../api/cliente')
    vi.mocked(altaBloqueo).mockRejectedValue(
      new ApiError(409, 'No se puede bloquear: hay 3 reserva(s) activa(s) en ese rango'),
    )
    const user = await abrirFormulario()

    await elegir(user, 'Sala', '1')
    await user.type(screen.getByLabelText('Motivo'), 'Refacción')
    await user.click(screen.getByRole('button', { name: 'Bloquear' }))

    expect(
      await screen.findByText('No se puede bloquear: hay 3 reserva(s) activa(s) en ese rango'),
    ).toBeDefined()
  })
})

describe('desbloquear', () => {
  it('pide confirmación y recarga el listado', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(eliminarBloqueo).mockResolvedValue(undefined)

    montar()
    await user.click(await screen.findByRole('button', { name: 'Desbloquear' }))

    await waitFor(() => expect(eliminarBloqueo).toHaveBeenCalledWith(1))
    expect(listarBloqueos).toHaveBeenCalledTimes(2)
  })

  it('cancelar la confirmación no borra nada', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    montar()
    await user.click(await screen.findByRole('button', { name: 'Desbloquear' }))

    expect(eliminarBloqueo).not.toHaveBeenCalled()
  })
})

/** §5: bloquear sala es ADMIN·STAFF. El DIRECTIVO mira. */
describe('eje de escritura', () => {
  it('un DIRECTIVO ve los bloqueos y ningún botón', async () => {
    montar('DIRECTIVO')

    expect(await screen.findByText('Refacción del piso')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Bloquear una sala' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Desbloquear' })).toBeNull()
  })

  it.each(['ADMIN', 'STAFF'] as const)('un %s sí puede bloquear', async (rol) => {
    montar(rol)

    expect(await screen.findByRole('button', { name: 'Bloquear una sala' })).toBeDefined()
  })
})
