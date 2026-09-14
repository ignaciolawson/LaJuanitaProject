import { render, screen, waitFor, within } from '@testing-library/react'
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
 * 4. **Desde la §20 (P78–P81): el estado se mueve por acciones y cada una aparece
 *    sólo donde corresponde**; el cobro no pregunta a nombre de quién ni en qué
 *    moneda; el expediente se lee y se edita apretando *Editar*.
 */

vi.mock('../api/mastering', () => ({
  listarTrabajos: vi.fn(),
  asignarCuentaDelTrabajo: vi.fn(),
  registrarTrabajo: vi.fn(),
  editarTrabajo: vi.fn(),
  confirmarTrabajo: vi.fn(),
  entregarTrabajo: vi.fn(),
  cancelarTrabajo: vi.fn(),
  registrarRevision: vi.fn(),
  liberarPremaster: vi.fn(),
  cobrarTrabajo: vi.fn(),
}))
vi.mock('../api/administracion', () => ({ listarUsuarios: vi.fn(), listarProfesores: vi.fn() }))

const {
  asignarCuentaDelTrabajo,
  cancelarTrabajo,
  cobrarTrabajo,
  confirmarTrabajo,
  editarTrabajo,
  entregarTrabajo,
  liberarPremaster,
  listarTrabajos,
  registrarRevision,
} = await import('../api/mastering')
const { listarProfesores, listarUsuarios } = await import('../api/administracion')

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
  vi.mocked(listarProfesores).mockResolvedValue([])
})

function listar(...trabajos: TrabajoResumen[]) {
  vi.mocked(listarTrabajos).mockResolvedValue({
    contenido: trabajos,
    pagina: 0,
    tamanio: 20,
    totalElementos: trabajos.length,
    totalPaginas: 1,
  })
}

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

  /** P80: los dos entregables en la fila. Antes sólo se veía el premaster. */
  it('dice si la canción terminada (el master) está cargada', async () => {
    montar()

    expect(await screen.findByText('Master sin cargar')).toBeDefined()
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

describe('liberar el premaster', () => {
  /**
   * **El orden es la decisión.** Se intenta, el backend explica por qué no, y
   * recién entonces aparece la salida — que además cuesta escribir un motivo.
   */
  it('sin pago muestra el rechazo del backend y recién ahí ofrece la excepción', async () => {
    listar(trabajo({ estado: 'ENTREGADO', fechaEntregaReal: '2026-09-10' }))
    vi.mocked(liberarPremaster).mockRejectedValue(
      new ApiError(409, 'No se puede liberar el premaster del trabajo 1 sin un pago registrado.'),
    )
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))

    // Antes de intentar, la salida no está a la vista.
    expect(screen.queryByRole('button', { name: /Liberarlo igual/ })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Liberar el premaster' }))

    expect(await screen.findByText(/sin un pago registrado/)).toBeDefined()
    expect(screen.getByRole('button', { name: /Liberarlo igual/ })).toBeDefined()
  })

  it('con motivo escrito, se libera igual', async () => {
    listar(trabajo({ estado: 'ENTREGADO', fechaEntregaReal: '2026-09-10' }))
    vi.mocked(liberarPremaster)
      .mockRejectedValueOnce(new ApiError(409, 'sin un pago registrado'))
      .mockResolvedValueOnce(trabajo({ premasterLiberado: true, liberadoSinPago: true }))
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    await userEvent.click(screen.getByRole('button', { name: 'Liberar el premaster' }))
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

/**
 * P78: el cobro **no pregunta a nombre de quién**. Hasta la §20 el formulario
 * decía "este cliente no tiene cuenta, elegí a quién imputarlo", y tres trabajos
 * de clientes externos de la base de desarrollo quedaron cobrados a nombre de
 * tres empleados. Y P81: tampoco pregunta la moneda — es la del trabajo.
 */
describe('registrar cobro', () => {
  it('va a nombre del cliente del trabajo y en su moneda, sin preguntar', async () => {
    listar(trabajo({ estado: 'ENTREGADO', fechaEntregaReal: '2026-09-10' }))
    vi.mocked(cobrarTrabajo).mockResolvedValue(trabajo({ estado: 'PAGADO', cobrado: 150 }))
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    await userEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }))

    const formulario = screen.getByRole('heading', { name: 'Registrar cobro' }).closest('form')!
    expect(within(formulario).getByText('Fulano De Tal')).toBeDefined()
    expect(within(formulario).queryByLabelText('A nombre de')).toBeNull()
    expect(within(formulario).queryByLabelText('Moneda')).toBeNull()

    // El monto viene con lo que falta; en dólares pide la cotización.
    expect(within(formulario).getByLabelText(/Monto en USD/)).toHaveProperty('value', '150')
    await userEvent.type(within(formulario).getByLabelText(/Cotización/), '1400')
    await userEvent.click(within(formulario).getByRole('button', { name: 'Confirmar cobro' }))

    await waitFor(() =>
      expect(cobrarTrabajo).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ monto: 150, cotizacionDolar: 1400, medioPago: 'TRANSFERENCIA' }),
      ),
    )
    const enviado = vi.mocked(cobrarTrabajo).mock.calls[0][1]
    expect(enviado).not.toHaveProperty('idUsuario')
    expect(enviado).not.toHaveProperty('moneda')
  })

  it('en pesos no pide cotización', async () => {
    listar(trabajo({ moneda: 'ARS', precioAcordado: 150000 }))
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    await userEvent.click(screen.getByRole('button', { name: 'Registrar cobro' }))

    const formulario = screen.getByRole('heading', { name: 'Registrar cobro' }).closest('form')!
    expect(within(formulario).queryByLabelText(/Cotización/)).toBeNull()
  })
})

/**
 * P79: el estado se mueve por acciones, no por un `<select>`. Cada estado ofrece
 * lo que le sigue, y lo que no corresponde no está — con el "mover a" anterior,
 * "PAGADO sólo por un cobro" tenía puerta de atrás y `DEBE` lo elegía alguien a
 * mano.
 */
describe('las acciones según el estado', () => {
  it('a confirmar ofrece confirmar el presupuesto, y nada de entregar', async () => {
    listar(trabajo({ estado: 'A_CONFIRMAR' }))
    vi.mocked(confirmarTrabajo).mockResolvedValue(trabajo({ estado: 'EN_PROCESO' }))
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    expect(screen.queryByLabelText('Mover a')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Entregar el master' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar presupuesto' }))
    await waitFor(() => expect(confirmarTrabajo).toHaveBeenCalledWith(1))
  })

  /** Entregar pide la fecha —hoy por defecto— y la manda con el hecho. */
  it('en proceso ofrece entregar el master, con la fecha', async () => {
    listar(trabajo({ estado: 'EN_PROCESO', urlMaster: 'https://drive.example/master' }))
    vi.mocked(entregarTrabajo).mockResolvedValue(
      trabajo({ estado: 'ENTREGADO', fechaEntregaReal: '2026-09-12' }),
    )
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    await userEvent.click(screen.getByRole('button', { name: 'Entregar el master' }))

    const fecha = screen.getByLabelText('Fecha de entrega')
    await userEvent.clear(fecha)
    await userEvent.type(fecha, '2026-09-12')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }))

    await waitFor(() => expect(entregarTrabajo).toHaveBeenCalledWith(1, '2026-09-12'))
  })

  it('entregado ofrece cobrar y liberar, y ya no entregar', async () => {
    listar(trabajo({ estado: 'ENTREGADO', fechaEntregaReal: '2026-09-10' }))
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    expect(screen.getByRole('button', { name: 'Registrar cobro' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Liberar el premaster' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Entregar el master' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Confirmar presupuesto' })).toBeNull()
  })

  /** Con plata adentro no se ofrece cancelar: primero se anula el pago. */
  it('cancelar pide confirmación, y no aparece con cobros adentro', async () => {
    listar(trabajo({ estado: 'EN_PROCESO' }))
    vi.mocked(cancelarTrabajo).mockResolvedValue(trabajo({ estado: 'CANCELADO' }))
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar el trabajo' }))
    expect(cancelarTrabajo).not.toHaveBeenCalled()

    // El Hueco de confirmación repite el botón: se confirma en el segundo.
    const botones = screen.getAllByRole('button', { name: 'Cancelar el trabajo' })
    await userEvent.click(botones[botones.length - 1])
    await waitFor(() => expect(cancelarTrabajo).toHaveBeenCalledWith(1))
  })

  it('con cobros adentro no ofrece cancelar', async () => {
    listar(trabajo({ estado: 'ENTREGADO', fechaEntregaReal: '2026-09-10', cobrado: 50 }))
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    expect(screen.queryByRole('button', { name: 'Cancelar el trabajo' })).toBeNull()
  })

  it('un trabajo cancelado no ofrece nada', async () => {
    listar(trabajo({ estado: 'CANCELADO' }))
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    expect(screen.getByText(/Trabajo cancelado/)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Registrar cobro' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Registrar una revisión' })).toBeNull()
  })
})

/**
 * K3: el expediente se LEE. Antes eran once campos siempre abiertos con un
 * "Guardar cambios" abajo; ahora es una ficha, y *Editar* abre el formulario.
 */
describe('el expediente', () => {
  it('se abre como ficha, con las notas enteras y los links como links', async () => {
    listar(trabajo({ notasInternas: 'el bajo viene comprimido\ny el kick tapa la voz' }))
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))

    expect(screen.getByText(/el bajo viene comprimido/)).toBeDefined()
    expect(screen.getByRole('link', { name: 'https://drive.example/material' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull()
  })

  it('Editar abre el formulario, con las notas en una caja de texto', async () => {
    listar(trabajo({ estado: 'EN_PROCESO' }))
    vi.mocked(editarTrabajo).mockResolvedValue(trabajo({ notasInternas: 'ahora sí' }))
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))

    // Regex: el texto del label incluye el contenido del textarea y la ayuda.
    const notas = screen.getByLabelText(/Notas internas/)
    expect(notas.tagName).toBe('TEXTAREA')
    // Sin entregar, la fecha de entrega real no se ofrece: la pone Entregar (P79 · 7).
    expect(screen.queryByLabelText('Entrega real')).toBeNull()

    await userEvent.clear(notas)
    await userEvent.type(notas, 'ahora sí')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(editarTrabajo).toHaveBeenCalledWith(1, expect.objectContaining({ notasInternas: 'ahora sí' })),
    )
    // Guardado, vuelve a la ficha.
    expect(await screen.findByText('ahora sí')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull()
  })
})

/**
 * P82: la cuenta que se creó DESPUÉS del trabajo. Se elige con el buscador —nunca
 * se cruza por nombre— y el texto avisa que los cobros van con el trabajo.
 */
describe('asignarle una cuenta', () => {
  it('un trabajo a nombre escrito ofrece asignarle una cuenta, buscándola', async () => {
    listar(trabajo({ cobrado: 50 }))
    vi.mocked(listarUsuarios).mockResolvedValue({
      contenido: [
        { id: 77, nombre: 'Jeff', apellido: 'Beck', email: 'jeff@ejemplo.com', telefono: null, rol: 'USUARIO', activo: true, debeCambiarPassword: false, esAlumno: false, esProfesor: false },
      ],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    vi.mocked(asignarCuentaDelTrabajo).mockResolvedValue(
      trabajo({ idClienteUsuario: 77, cliente: 'Jeff Beck', clienteTieneCuenta: true, cobrado: 50 }),
    )
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    await userEvent.click(screen.getByRole('button', { name: 'Asignarle una cuenta' }))
    expect(screen.getByText(/junto con lo que ya pagó/)).toBeDefined()

    await userEvent.type(screen.getByLabelText('Cuenta'), 'Je')
    await userEvent.click(await screen.findByRole('button', { name: /Jeff Beck/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }))

    await waitFor(() => expect(asignarCuentaDelTrabajo).toHaveBeenCalledWith(1, 77))
    // Con cuenta, la oferta desaparece.
    expect(screen.queryByRole('button', { name: 'Asignarle una cuenta' })).toBeNull()
  })

  it('un trabajo con cuenta no lo ofrece', async () => {
    listar(trabajo({ idClienteUsuario: 30, cliente: 'Camila Ríos', clienteTieneCuenta: true }))
    montar()

    await userEvent.click(await screen.findByText('Nocturno'))
    expect(screen.queryByRole('button', { name: 'Asignarle una cuenta' })).toBeNull()
  })
})

describe('quién puede tocar', () => {
  /** DIRECTIVO lee todo el sistema y no escribe nada. */
  it('un directivo no ve ningún botón de escritura', async () => {
    montar('DIRECTIVO')

    await screen.findByText('Nocturno')
    expect(screen.queryByRole('button', { name: 'Nuevo trabajo' })).toBeNull()

    await userEvent.click(screen.getByText('Nocturno'))
    expect(screen.queryByRole('button', { name: 'Entregar el master' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Registrar cobro' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
  })
})
