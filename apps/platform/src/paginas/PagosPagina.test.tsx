import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import type { ComprobanteResumen, PagoResumen, TotalDeLinea } from '../api/tiposAdmin'
import type { UsuarioActual as Actual } from '../api/tipos'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { PagosPagina } from './PagosPagina'
import { elegir } from '../pruebas/elegir'

/**
 * Módulo 3, pantalla 1 — registrar pagos.
 *
 * <p>Los casos apuntan a lo que esta pantalla puede hacer mal <b>con la plata de
 * alguien</b>: ofrecer borrar lo que solo se anula, dejar pasar un descuento sin
 * justificar, o mandar un pago en dólares sin cotización — los tres terminan en
 * una fila que la base rechaza o, peor, en un registro que nadie puede explicar
 * después.
 */

vi.mock('../api/administracion', () => ({
  listarPagos: vi.fn(),
  registrarPago: vi.fn(),
  adjuntarComprobante: vi.fn(),
  abrirComprobante: vi.fn(),
  editarPago: vi.fn(),
  anularPago: vi.fn(),
  invalidarComprobante: vi.fn(),
  listarAlumnos: vi.fn(),
  listarInscripciones: vi.fn(),
  // Los tres destinos que el alta acepta desde el 2026-08-29, además del curso.
  agenda: vi.fn(),
  listarUsuarios: vi.fn(),
  listarVentas: vi.fn(),
  totalesPorLinea: vi.fn(),
}))

vi.mock('../api/mastering', () => ({ listarTrabajos: vi.fn() }))

const {
  adjuntarComprobante,
  agenda,
  anularPago,
  editarPago,
  invalidarComprobante,
  listarAlumnos,
  listarInscripciones,
  listarPagos,
  listarUsuarios,
  listarVentas,
  registrarPago,
  totalesPorLinea,
} = await import('../api/administracion')
const { listarTrabajos } = await import('../api/mastering')

function pago(cambios: Partial<PagoResumen> = {}): PagoResumen {
  return {
    idPago: 1,
    idUsuario: 10,
    nombre: 'Camila',
    apellido: 'Ríos',
    email: 'camila@ejemplo.com',
    pagador: 'Camila Ríos',
    pagadorSinCuenta: false,
    destino: 'INSCRIPCION',
    lineaDeNegocio: 'CURSOS',
    idDestino: 5,
    queSalda: 'DJ · INICIAL',
    concepto: 'Seña del curso',
    monto: 90000,
    moneda: 'ARS',
    cotizacionDolar: null,
    medioPago: 'TRANSFERENCIA',
    descuentoPorcentaje: 0,
    motivoDescuento: null,
    estadoPago: 'SENADO',
    entro: true,
    comprobantes: [],
    motivoAnulacion: null,
    fechaAnulacion: null,
    fechaPago: '2026-08-16',
    fechaRegistro: '2026-08-16T14:00:00Z',
    ...cambios,
  }
}

function comprobante(cambios: Partial<ComprobanteResumen> = {}): ComprobanteResumen {
  return {
    idComprobante: 7,
    nombreOriginal: 'transferencia.pdf',
    cargadoPor: 'Micaela Gómez',
    fechaCreacion: '2026-08-30T14:00:00Z',
    invalido: false,
    invalidadoPor: null,
    fechaInvalidacion: null,
    motivoInvalidacion: null,
    ...cambios,
  }
}

/** Genérica: el mismo envoltorio sirve para pagos, alumnos e inscripciones. */
function pagina<T>(contenido: T[]) {
  return { contenido, pagina: 0, tamanio: 20, totalElementos: contenido.length, totalPaginas: 1 }
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
      <MemoryRouter>
        <PagosPagina />
      </MemoryRouter>
    </AuthContext>,
  )
}

/** Una fila de la barra de solapas. Espeja `TotalDeLinea`. */
function total(cambios: Partial<TotalDeLinea> = {}): TotalDeLinea {
  return {
    linea: 'CURSOS',
    grupo: 'PROGRAMAS',
    moneda: 'ARS',
    cantidad: 1,
    entraron: 90000,
    ...cambios,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(totalesPorLinea).mockResolvedValue([total()])
  vi.mocked(listarPagos).mockResolvedValue(pagina([pago()]))
  vi.mocked(listarAlumnos).mockResolvedValue(
    pagina([]) as never,
  )
  vi.mocked(listarInscripciones).mockResolvedValue(pagina([]) as never)
  vi.mocked(agenda).mockResolvedValue([] as never)
  vi.mocked(listarUsuarios).mockResolvedValue(pagina([]) as never)
  vi.mocked(listarVentas).mockResolvedValue(pagina([]) as never)
  vi.mocked(listarTrabajos).mockResolvedValue(pagina([]) as never)
})

describe('el listado', () => {
  /** La columna que justifica el módulo: todo pago dice qué salda. */
  it('cada fila dice qué salda y cuánto', async () => {
    montar()

    expect(await screen.findByText('DJ · INICIAL')).toBeDefined()
    // Acotado a la tabla: desde §13 · B2 la barra de solapas también muestra un
    // importe, y sin acotar esto encuentra dos.
    expect(within(screen.getByRole('table')).getByText('$ 90.000,00')).toBeDefined()
    expect(within(screen.getByRole('table')).getByText('Señado')).toBeDefined()
  })

  it('un descuento se muestra con su porcentaje', async () => {
    vi.mocked(listarPagos).mockResolvedValue(
      pagina([pago({ descuentoPorcentaje: 20, motivoDescuento: 'Ex alumno' })]),
    )

    montar()

    expect(await screen.findByText('20% de descuento')).toBeDefined()
  })

  /**
   * Una fila anulada sin explicación obliga a preguntarle a quien la anuló, que
   * es exactamente lo que `V7` quiso evitar al exigir el motivo.
   */
  it('un pago anulado muestra por qué', async () => {
    vi.mocked(listarPagos).mockResolvedValue(
      pagina([pago({ estadoPago: 'ANULADO', entro: false, motivoAnulacion: 'Se cargó dos veces' })]),
    )

    montar()

    // Se espera el motivo, no la tabla: la tabla se dibuja vacía enseguida y
    // `findByRole` resolvería antes de que lleguen las filas.
    expect(await screen.findByText('Se cargó dos veces')).toBeDefined()
    expect(within(screen.getByRole('table')).getByText('Anulado')).toBeDefined()
  })

  /**
   * **El inválido no se esconde, y dice por qué.** Una fila que desaparece se lee
   * como que el sistema perdió el dato; que esté tachada y explicada es la
   * información: alguien miró ese archivo y dijo que no servía.
   */
  it('un comprobante invalidado se muestra con su motivo y su autor', async () => {
    vi.mocked(listarPagos).mockResolvedValue(
      pagina([
        pago({
          comprobantes: [
            comprobante({
              invalido: true,
              invalidadoPor: 'Micaela Gómez',
              motivoInvalidacion: 'Era de otra transferencia',
            }),
          ],
        }),
      ]),
    )

    montar()

    expect(await screen.findByText(/Era de otra transferencia/)).toBeDefined()
    expect(screen.getByText(/Micaela Gómez/)).toBeDefined()
  })

  /** Sin ninguno lo dice: el hueco se lee como un dato perdido. */
  it('un pago sin comprobante lo dice', async () => {
    montar()
    expect(await screen.findByText('Sin comprobante')).toBeDefined()
  })
})

/**
 * <b>En este esquema la plata no se borra</b> (`V6`), y el comprobante tampoco
 * (§6). Los dos caminos de reversa piden motivo, y el autor lo pone el servidor.
 */
describe('dividir la sección por dentro (§12 · B1)', () => {
  it('la fila dice a qué negocio pertenece esa plata', async () => {
    // Y dice la LÍNEA, no el destino: la seña de una clase apunta a una reserva
    // y es plata de cursos. La resuelve el servidor con la misma expresión que
    // usa el Tablero, así que acá sólo se comprueba que se muestre.
    vi.mocked(listarPagos).mockResolvedValue(
      pagina([pago({ destino: 'RESERVA', queSalda: 'Sala 2 · 14/08 10:00', lineaDeNegocio: 'CURSOS' })]),
    )

    montar()

    expect(await screen.findByText('Cursos')).toBeDefined()
  })

  it('un pago sin línea lo dice, no lo esconde', async () => {
    // Es plata que entró y no apunta a nada. Si la fila no dijera nada, la única
    // forma de encontrarla para corregirla sería dar con ella de casualidad.
    vi.mocked(listarPagos).mockResolvedValue(pagina([pago({ lineaDeNegocio: 'OTRO' })]))

    montar()

    expect(await screen.findByText('Sin línea asignada')).toBeDefined()
  })

  it('⚠️ elegir una solapa le pide al servidor, no recorta lo ya traído', async () => {
    // **Es la decisión entera del punto.** El listado pagina de a veinte: filtrar
    // en la pantalla mostraría un subconjunto de esas veinte como si fuera el
    // total. Es el mismo defecto que buscar desde la página 3 —que este proyecto
    // ya corrigió una vez— y no falla: la pantalla anda y el número miente.
    const user = userEvent.setup()
    montar()
    await screen.findByText('DJ · INICIAL')

    await user.click(await screen.findByRole('tab', { name: /Venta de equipos/ }))

    await waitFor(() =>
      expect(vi.mocked(listarPagos)).toHaveBeenCalledWith(
        expect.objectContaining({ grupo: 'EQUIPOS' }),
      ),
    )
  })

  it('al elegir una solapa se vuelve a la primera página', async () => {
    // Sin esto, filtrar estando en la página 3 devuelve vacío y se lee como que
    // no hay pagos de ese tipo.
    const user = userEvent.setup()
    montar()
    await screen.findByText('DJ · INICIAL')

    await user.click(await screen.findByRole('tab', { name: /Servicios/ }))

    await waitFor(() =>
      expect(vi.mocked(listarPagos)).toHaveBeenCalledWith(
        expect.objectContaining({ grupo: 'SERVICIOS', pagina: 0 }),
      ),
    )
  })
})

describe('la barra de solapas (§13 · B2)', () => {
  it('cada solapa trae su número sin que haya que entrar a verla', async () => {
    // Es lo que se pidió: *"siento que está todo en la misma bolsa"*. Un número
    // que sólo apareciera al elegir la solapa no resolvería eso.
    vi.mocked(totalesPorLinea).mockResolvedValue([
      total({ linea: 'CURSOS', grupo: 'PROGRAMAS', cantidad: 12 }),
      total({ linea: 'ALQUILER_CABINA', grupo: 'SERVICIOS', cantidad: 5, entraron: 20000 }),
      total({ linea: 'GRABACION_SET', grupo: 'SERVICIOS', cantidad: 2, entraron: 8000 }),
    ])

    montar()

    // Servicios junta dos líneas: 5 + 2. Si el agrupamiento se perdiera, esta
    // solapa diría 5 y listaría 7.
    expect(await screen.findByRole('tab', { name: /Servicios\s*7/ })).toBeDefined()
    expect(screen.getByRole('tab', { name: /Programas\s*12/ })).toBeDefined()
  })

  it('"Sin destino" no se dibuja cuando no hay ninguno', async () => {
    // Es la solapa que no se puede esconder cuando existe —un pago que no apunta
    // a nada es plata que entró— y que no tiene por qué estar cuando no existe:
    // una solapa permanente en cero enseña a no mirar la barra.
    montar()

    await screen.findByRole('tab', { name: /Programas/ })
    expect(screen.queryByRole('tab', { name: /Sin destino/ })).toBeNull()
  })

  it('⚠️ "Sin destino" SÍ se dibuja cuando hay pagos que no apuntan a nada', async () => {
    // Si se filtrara, la suma de las solapas dejaría de dar la caja y nadie
    // podría ver por qué. Es el mismo criterio que `LineaDeNegocio.OTRO`.
    vi.mocked(totalesPorLinea).mockResolvedValue([
      total(),
      total({ linea: 'OTRO', grupo: 'SIN_DESTINO', cantidad: 3, entraron: 1000 }),
    ])

    montar()

    expect(await screen.findByRole('tab', { name: /Sin destino\s*3/ })).toBeDefined()
  })

  it('⚠️ el total dice lo que ENTRÓ, no la suma de la columna', async () => {
    // Dos filas por la misma cantidad de pagos: una con plata adentro y otra sin
    // nada, que es lo que pasa con una deuda anotada o un pago anulado. Si el
    // total sumara la columna, diría que entró plata que no entró.
    // El importe es distinto del de la fila a propósito: si fuera el mismo, la
    // aserción encontraría dos y no distinguiría cuál de los dos números miró.
    vi.mocked(totalesPorLinea).mockResolvedValue([
      total({ cantidad: 2, entraron: 123456 }),
      total({ linea: 'VENTA_EQUIPOS', grupo: 'EQUIPOS', cantidad: 4, entraron: 0 }),
    ])

    montar()

    expect(await screen.findByText(/123\.456/)).toBeDefined()
    expect(screen.getByRole('tab', { name: /Venta de equipos\s*4/ })).toBeDefined()
  })

  it('los números no se piden de nuevo al cambiar de solapa', async () => {
    // La barra muestra TODAS las solapas: si dependiera de la elegida, elegir una
    // dejaría a las otras en cero y la barra dejaría de servir para decidir a
    // cuál entrar.
    const user = userEvent.setup()
    montar()
    await screen.findByRole('tab', { name: /Programas/ })

    // Esperar a que los números hayan llegado una vez: la barra se dibuja antes
    // que ellos, así que sin esto el conteo de partida sería cero y la aserción
    // pasaría por el motivo equivocado.
    await waitFor(() => expect(vi.mocked(totalesPorLinea)).toHaveBeenCalled())
    const pedidosAntes = vi.mocked(totalesPorLinea).mock.calls.length
    await user.click(screen.getByRole('tab', { name: /Programas/ }))

    await waitFor(() =>
      expect(vi.mocked(listarPagos)).toHaveBeenCalledWith(
        expect.objectContaining({ grupo: 'PROGRAMAS' }),
      ),
    )
    expect(vi.mocked(totalesPorLinea).mock.calls.length).toBe(pedidosAntes)
  })

  it('si los números no vuelven, la pantalla sigue andando', async () => {
    // La barra es un dato de más, no el contenido: un endpoint caído no puede
    // dejar sin listado a la pantalla donde se ve la plata.
    vi.mocked(totalesPorLinea).mockRejectedValue(new Error('se cayó'))

    montar()

    expect(await screen.findByText('DJ · INICIAL')).toBeDefined()
    expect(screen.getByRole('tab', { name: 'Todos' })).toBeDefined()
  })
})

describe('las dos operaciones de reversa', () => {
  it('no ofrece borrar un pago: ofrece anularlo', async () => {
    montar()

    expect(await screen.findByRole('button', { name: 'Anular' })).toBeDefined()
    expect(screen.queryByRole('button', { name: /Eliminar|Borrar/ })).toBeNull()
  })

  it('anular pide un motivo y lo manda', async () => {
    const user = userEvent.setup()
    vi.mocked(anularPago).mockResolvedValue(pago({ estadoPago: 'ANULADO' }))

    montar()
    await user.click(await screen.findByRole('button', { name: 'Anular' }))
    await user.type(screen.getByLabelText('Motivo'), 'Se cargó dos veces')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(anularPago).toHaveBeenCalledWith(1, 'Se cargó dos veces'))
  })

  it('sin motivo no anula nada', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('Escribí el motivo.')).toBeDefined()
    expect(anularPago).not.toHaveBeenCalled()
  })

  /** Y el cartel dice qué va a pasar: que no se borra, y que sale de la caja. */
  it('avisa que el pago no se borra', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('button', { name: 'Anular' }))

    expect(screen.getByText(/no se borra/)).toBeDefined()
  })

  it('invalidar solo se ofrece si hay un comprobante válido', async () => {
    vi.mocked(listarPagos).mockResolvedValue(pagina([pago({ comprobantes: [] })]))
    montar()

    await screen.findByRole('button', { name: 'Anular' })
    expect(screen.queryByRole('button', { name: 'Invalidar' })).toBeNull()
  })

  /**
   * **El motivo va contra UN comprobante, no contra el pago.** Es la diferencia
   * que trajo `V21`: un pago puede tener varios y el que no sirve es uno solo.
   */
  it('invalidar manda el motivo y dice cuál comprobante', async () => {
    const user = userEvent.setup()
    vi.mocked(listarPagos).mockResolvedValue(
      pagina([pago({ comprobantes: [comprobante({ idComprobante: 42 })] })]),
    )
    vi.mocked(invalidarComprobante).mockResolvedValue(comprobante({ invalido: true }))

    montar()
    await user.click(await screen.findByRole('button', { name: 'Invalidar' }))
    await user.type(screen.getByLabelText('Motivo'), 'Era de otra transferencia')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(invalidarComprobante).toHaveBeenCalledWith(1, 42, 'Era de otra transferencia'),
    )
  })

  /**
   * Un comprobante ya marcado no se vuelve a marcar: `V21` §3 no deja deshacerlo
   * ni reescribir la firma, así que la pantalla tampoco lo ofrece.
   */
  it('un comprobante ya invalidado no se puede volver a invalidar', async () => {
    vi.mocked(listarPagos).mockResolvedValue(
      pagina([
        pago({
          comprobantes: [comprobante({ invalido: true, motivoInvalidacion: 'No servía' })],
        }),
      ]),
    )

    montar()
    await screen.findByRole('button', { name: 'Anular' })
    expect(screen.queryByRole('button', { name: 'Invalidar' })).toBeNull()
  })

  /** Un pago ya anulado no se vuelve a anular: el backend lo rechaza y acá ni se ofrece. */
  it('un pago anulado no ofrece anularse de nuevo', async () => {
    vi.mocked(listarPagos).mockResolvedValue(pagina([pago({ estadoPago: 'ANULADO' })]))
    montar()

    await waitFor(() =>
      expect(within(screen.getByRole('table')).getByText('Anulado')).toBeDefined(),
    )
    expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull()
  })
})

describe('el alta', () => {
  async function abrir() {
    const user = userEvent.setup()
    vi.mocked(listarAlumnos).mockResolvedValue(
      pagina([
        {
          idAlumno: 3,
          idUsuario: 10,
          nombre: 'Camila',
          apellido: 'Ríos',
          email: 'camila@ejemplo.com',
        },
      ]) as never,
    )
    vi.mocked(listarInscripciones).mockResolvedValue(
      pagina([
        {
          idInscripcion: 5,
          disciplina: 'DJ',
          nivel: 'INICIAL',
          precioTotal: 180000,
          moneda: 'ARS',
        },
      ]) as never,
    )

    montar()
    await user.click(await screen.findByRole('button', { name: 'Registrar pago' }))
    return user
  }

  /** La regla del esquema: sin cotización, un importe en dólares no se reconstruye. */
  it('en dólares pide la cotización y no manda sin ella', async () => {
    const user = await abrir()

    await elegir(user, 'Alumno', '3')
    await elegir(user, 'Cuál curso', '5')
    await user.type(screen.getByLabelText('Monto'), '150')
    await elegir(user, 'Moneda', 'USD')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(
      await screen.findByText('Un pago en dólares necesita la cotización del día.'),
    ).toBeDefined()
    expect(registrarPago).not.toHaveBeenCalled()
  })

  /** El campo de cotización solo aparece cuando hace falta: casi todo se cobra en pesos. */
  it('la cotización no molesta cuando el pago es en pesos', async () => {
    const user = await abrir()

    expect(screen.queryByLabelText(/Cotización del dólar/)).toBeNull()
    await elegir(user, 'Moneda', 'USD')
    expect(screen.getByLabelText(/Cotización del dólar/)).toBeDefined()
  })

  it('un descuento sin justificación no se manda', async () => {
    const user = await abrir()

    await elegir(user, 'Alumno', '3')
    await elegir(user, 'Cuál curso', '5')
    await user.type(screen.getByLabelText('Monto'), '90000')
    await user.type(screen.getByLabelText(/Descuento/), '20')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText('Un descuento necesita una justificación escrita.')).toBeDefined()
    expect(registrarPago).not.toHaveBeenCalled()
  })

  /** El pago se acredita al `usuario` del alumno, no al `alumno`: es la identidad raíz. */
  it('manda el pago contra la inscripción elegida', async () => {
    const user = await abrir()
    vi.mocked(registrarPago).mockResolvedValue(pago())

    await elegir(user, 'Alumno', '3')
    await elegir(user, 'Cuál curso', '5')
    await user.type(screen.getByLabelText('Monto'), '90000')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(registrarPago).toHaveBeenCalled())
    const enviado = vi.mocked(registrarPago).mock.calls[0][0]
    expect(enviado.idUsuario).toBe(10)
    expect(enviado.idInscripcion).toBe(5)
    expect(enviado.monto).toBe(90000)
  })

  /** Un pago no se registra ya anulado: el backend lo rechaza y acá ni se ofrece. */
  it('no ofrece cargar un pago anulado', async () => {
    await abrir()

    const estados = screen.getByLabelText<HTMLSelectElement>('Estado')
    expect([...estados.options].map((o) => o.value)).not.toContain('ANULADO')
  })
})

describe('eje de escritura', () => {
  it('un DIRECTIVO ve los pagos y no toca nada', async () => {
    montar('DIRECTIVO')

    expect(await screen.findByText('DJ · INICIAL')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Registrar pago' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Anular' })).toBeNull()
  })

  it.each(['ADMIN', 'STAFF'] as const)('un %s sí puede registrar', async (rol) => {
    montar(rol)

    expect(await screen.findByRole('button', { name: 'Registrar pago' })).toBeDefined()
  })
})

describe('el pagador sin cuenta y la corrección (V19)', () => {
  /**
   * **El pago de alguien sin cuenta se muestra igual, y no se linkea.** Aparece
   * porque `pagador` siempre tiene valor —una fila de plata sin nombre es el
   * problema que este sistema resuelve—; no se linkea porque no hay estado de
   * cuenta al que llevar.
   */
  it('el pago sin cuenta se muestra con su nombre y sin link', async () => {
    vi.mocked(listarPagos).mockResolvedValue(
      pagina([
        pago({
          idUsuario: null,
          nombre: null,
          apellido: null,
          email: null,
          pagador: 'Comprador de Paso',
          pagadorSinCuenta: true,
          destino: 'VENTA_EQUIPO',
          queSalda: 'CDJ-3000',
        }),
      ]),
    )
    montar()

    expect(await screen.findByText('Comprador de Paso')).toBeDefined()
    expect(screen.getByText('sin cuenta')).toBeDefined()
    // Lo que importa: no hay link roto a `/estado-de-cuenta/null`.
    expect(screen.queryByRole('link', { name: /Comprador de Paso/ })).toBeNull()
  })

  it('el pago con cuenta sigue linkeando al estado de cuenta', async () => {
    montar()

    const link = await screen.findByRole('link', { name: 'Ríos, Camila' })
    expect(link.getAttribute('href')).toBe('/admin/estado-de-cuenta/10')
  })

  it('corregir manda los campos editados', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('button', { name: 'Corregir' }))

    const monto = screen.getByLabelText('Monto')
    await user.clear(monto)
    await user.type(monto, '95000')
    await user.click(screen.getByRole('button', { name: 'Guardar la corrección' }))

    await waitFor(() => expect(editarPago).toHaveBeenCalled())
    expect(vi.mocked(editarPago).mock.calls[0][0]).toBe(1)
    expect(vi.mocked(editarPago).mock.calls[0][1].monto).toBe(95000)
  })

  /**
   * **Que el pagador y el destino no se editen es una decisión, no un olvido**, y
   * la pantalla lo dice antes de que alguien los busque. Este caso lo fija: si
   * algún día se agregan esos campos, hay que venir acá y decidirlo a conciencia.
   */
  it('corregir no ofrece cambiar de quién es ni qué salda', async () => {
    const user = userEvent.setup()
    montar()

    await user.click(await screen.findByRole('button', { name: 'Corregir' }))

    expect(screen.queryByLabelText('Alumno')).toBeNull()
    expect(screen.queryByLabelText('Qué salda')).toBeNull()
    expect(screen.getByText(/no se editan/)).toBeDefined()
  })

  it('un pago anulado no ofrece corregirse', async () => {
    vi.mocked(listarPagos).mockResolvedValue(pagina([pago({ estadoPago: 'ANULADO' })]))
    montar()

    expect(await screen.findByText('DJ · INICIAL')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Corregir' })).toBeNull()
  })

  it('un DIRECTIVO no ve el botón de corregir', async () => {
    montar('DIRECTIVO')

    expect(await screen.findByText('DJ · INICIAL')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Corregir' })).toBeNull()
  })
})

/**
 * **El alta acepta los cuatro destinos desde el 2026-08-29** (hallazgo #4 de
 * `docs/mejoras.md`). Antes era alumno → sus cursos y nada más, y la consecuencia
 * estaba escrita en el propio código: una venta cargada sin cobro no tenía después
 * por dónde cobrarse.
 */
describe('los cuatro destinos y el pagador libre', () => {
  it('ofrece los cuatro destinos, no solo cursos', async () => {
    const user = userEvent.setup()
    montar()
    await user.click(await screen.findByRole('button', { name: 'Registrar pago' }))

    const destinos = screen.getByLabelText<HTMLSelectElement>('Qué salda')
    expect([...destinos.options].map((o) => o.value)).toEqual([
      'INSCRIPCION',
      'RESERVA',
      'TRABAJO_MASTERING',
      'VENTA_EQUIPO',
    ])
  })

  /**
   * **Un curso solo se salda a nombre del alumno**, y la pantalla ni lo pregunta.
   * No es una comodidad: una `inscripcion` cuelga de un `alumno`, que cuelga de un
   * `usuario`, así que un pago externo se acreditaría en una cuenta que no es de
   * nadie — el backend lo rechaza con ese mismo argumento.
   */
  it('para un curso no pregunta quién paga', async () => {
    const user = userEvent.setup()
    montar()
    await user.click(await screen.findByRole('button', { name: 'Registrar pago' }))

    expect(screen.queryByLabelText('Tiene cuenta')).toBeNull()
    expect(screen.getByText(/va a nombre del alumno/)).toBeDefined()
  })

  it('para una venta sí pregunta quién paga, y acepta que no tenga cuenta', async () => {
    const user = userEvent.setup()
    vi.mocked(listarVentas).mockResolvedValue(
      pagina([
        {
          idVenta: 7,
          comprador: 'Joaco',
          modeloEquipo: 'CDJ-3000',
          precio: 900000,
          moneda: 'ARS',
        },
      ]) as never,
    )
    montar()
    await user.click(await screen.findByRole('button', { name: 'Registrar pago' }))
    await elegir(user, 'Qué salda', 'VENTA_EQUIPO')

    await user.click(await screen.findByLabelText('No tiene cuenta'))
    await elegir(user, 'Cuál venta', '7')
    await user.type(screen.getByLabelText('Nombre de quien paga'), 'Comprador de Paso')
    await user.type(screen.getByLabelText('Monto'), '900000')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(registrarPago).toHaveBeenCalled())

    const cuerpo = vi.mocked(registrarPago).mock.calls[0][0]
    expect(cuerpo.idVentaEquipo).toBe(7)
    expect(cuerpo.nombrePagadorExterno).toBe('Comprador de Paso')
    expect(cuerpo.idUsuario).toBeUndefined()
    // Un pago salda UNA cosa: `pago_tiene_destino`. Si el formulario dejara
    // colgado el destino anterior al cambiar de tipo, el backend lo rechazaría.
    expect(cuerpo.idInscripcion).toBeUndefined()
  })

  it('sin decir quién paga no manda nada', async () => {
    const user = userEvent.setup()
    vi.mocked(listarVentas).mockResolvedValue(
      pagina([
        { idVenta: 7, comprador: 'Joaco', modeloEquipo: 'CDJ-3000', precio: 900000, moneda: 'ARS' },
      ]) as never,
    )
    montar()
    await user.click(await screen.findByRole('button', { name: 'Registrar pago' }))
    await elegir(user, 'Qué salda', 'VENTA_EQUIPO')
    await elegir(user, 'Cuál venta', '7')
    await user.type(screen.getByLabelText('Monto'), '900000')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText('Elegí quién paga.')).toBeDefined()
    expect(registrarPago).not.toHaveBeenCalled()
  })
})

/**
 * Los comprobantes (`V21`).
 *
 * Hasta esta tanda esto era un campo de texto: alguien escribía
 * "transferencia.pdf" y **no había ningún archivo detrás, en ningún lado**. Lo
 * que estos casos cuidan es que el archivo llegue y que el pago pueda tener más
 * de uno — que es lo que hace que adjuntar el correcto no borre la firma de quien
 * rechazó el anterior.
 */
describe('los comprobantes', () => {
  it('adjuntar sube el archivo contra ese pago', async () => {
    const user = userEvent.setup()
    const archivo = new File(['%PDF-1.4'], 'transferencia.pdf', { type: 'application/pdf' })
    vi.mocked(adjuntarComprobante).mockResolvedValue(comprobante())

    montar()
    await user.upload(await screen.findByLabelText('Adjuntar'), archivo)

    await waitFor(() => expect(adjuntarComprobante).toHaveBeenCalledWith(1, archivo))
  })

  /**
   * **El pago admite varios, y por eso el segundo no reemplaza al primero.** Es la
   * razón entera de que `V21` sea una tabla: con la columna de `V1`, adjuntar el
   * correcto obligaba a pisar al equivocado y se llevaba puesta la firma de quien
   * lo había rechazado.
   */
  it('un pago con dos comprobantes los muestra a los dos', async () => {
    vi.mocked(listarPagos).mockResolvedValue(
      pagina([
        pago({
          comprobantes: [
            comprobante({
              idComprobante: 1,
              nombreOriginal: 'equivocado.pdf',
              invalido: true,
              motivoInvalidacion: 'Era de otra transferencia',
            }),
            comprobante({ idComprobante: 2, nombreOriginal: 'el-que-va.pdf' }),
          ],
        }),
      ]),
    )

    montar()

    expect(await screen.findByRole('button', { name: 'equivocado.pdf' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'el-que-va.pdf' })).toBeDefined()
    // Y el que ya no vale no ofrece invalidarse de nuevo: solo hay un "Invalidar".
    expect(screen.getAllByRole('button', { name: 'Invalidar' })).toHaveLength(1)
  })

  /** Un DIRECTIVO lee todo y no escribe nada: ve el comprobante, no los botones. */
  it('un DIRECTIVO ve los comprobantes y no puede adjuntar ni invalidar', async () => {
    vi.mocked(listarPagos).mockResolvedValue(
      pagina([pago({ comprobantes: [comprobante()] })]),
    )

    montar('DIRECTIVO')

    expect(await screen.findByRole('button', { name: 'transferencia.pdf' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Invalidar' })).toBeNull()
    expect(screen.queryByLabelText('Adjuntar')).toBeNull()
  })
})
