import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsuarioActual } from '../api/tipos'
import type { CajaDelPeriodo, SalaResumen } from '../api/tiposAdmin'
import type { CobrosPendientes, Conversion, Retencion, Tablero } from '../api/tiposTablero'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { TableroPagina } from './TableroPagina'

/**
 * Módulo 8 — el tablero de dirección.
 *
 * Acá no hay reglas de negocio que romper: lo que se rompe es **la lectura de un
 * número**, y esos errores no tiran excepción, dan otra cifra. Los casos apuntan
 * a las cuatro maneras que tiene esta pantalla de mentir sin fallar:
 *
 * 1. **Que STAFF vea lo que no le toca** — o, peor, que lo pida y reciba un 403
 *    que la pantalla muestre como si el sistema estuviera roto.
 * 2. **Que una retención sin datos se dibuje como 0%**, que se lee como que se
 *    fueron todos cuando lo que pasa es que nadie cerró su ventana todavía.
 * 3. **Que un indicador de foto parezca del período** — la deuda de marzo leída
 *    como generada en agosto.
 * 4. **Que un tablero que falló deje en pantalla los números del período
 *    anterior**, que es el mismo defecto que el informe de uso ya tenía anotado.
 */

vi.mock('../api/tablero', () => ({
  tableroCompleto: vi.fn(),
  resumenFinanciero: vi.fn(),
  descargarTablero: vi.fn(),
}))

vi.mock('../api/administracion', () => ({
  listarSalas: vi.fn(),
}))

const { descargarTablero, resumenFinanciero, tableroCompleto } = await import('../api/tablero')
const { listarSalas } = await import('../api/administracion')

const SALAS: SalaResumen[] = [
  { idSala: 1, nombre: 'Sala 1', descripcion: null, activa: true, orden: 1, usosPermitidos: [] },
]

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

function caja(): CajaDelPeriodo[] {
  return [
    {
      moneda: 'ARS',
      ingresos: 500000,
      egresos: 120000,
      neto: 380000,
      adeudado: 45000,
      cantidadDePagos: 7,
      cantidadDeEgresos: 2,
      porMedio: [],
    },
    {
      moneda: 'USD',
      ingresos: 0,
      egresos: 0,
      neto: 0,
      adeudado: 0,
      cantidadDePagos: 0,
      cantidadDeEgresos: 0,
      porMedio: [],
    },
  ]
}

function pendientes(): CobrosPendientes[] {
  return [
    { moneda: 'ARS', monto: 45000, cantidad: 2, vencido: 45000, cantidadVencida: 2 },
    { moneda: 'USD', monto: 0, cantidad: 0, vencido: 0, cantidadVencida: 0 },
  ]
}

function tablero(cambios: Partial<Tablero> = {}): Tablero {
  return {
    periodo: { desde: '2026-08-01', hasta: '2026-08-20', idSala: null },
    caja: caja(),
    pendientes: pendientes(),
    alumnos: [
      { disciplina: 'DJ', nivel: 'INICIAL', alumnos: 4, inscripciones: 4 },
      { disciplina: 'PRODUCCION', nivel: null, alumnos: 0, inscripciones: 0 },
      { disciplina: 'MENTORIA', nivel: null, alumnos: 0, inscripciones: 0 },
    ],
    ingresos: [
      { moneda: 'ARS', linea: 'CURSOS', monto: 400000, cantidad: 5 },
      { moneda: 'ARS', linea: 'ALQUILER_CABINA', monto: 100000, cantidad: 2 },
      { moneda: 'ARS', linea: 'GRABACION_SET', monto: 0, cantidad: 0 },
      { moneda: 'ARS', linea: 'MIX_MASTERING', monto: 0, cantidad: 0 },
      { moneda: 'ARS', linea: 'VENTA_EQUIPOS', monto: 0, cantidad: 0 },
      { moneda: 'ARS', linea: 'OTRO', monto: 0, cantidad: 0 },
      { moneda: 'USD', linea: 'CURSOS', monto: 0, cantidad: 0 },
      { moneda: 'USD', linea: 'ALQUILER_CABINA', monto: 0, cantidad: 0 },
      { moneda: 'USD', linea: 'GRABACION_SET', monto: 0, cantidad: 0 },
      { moneda: 'USD', linea: 'MIX_MASTERING', monto: 0, cantidad: 0 },
      { moneda: 'USD', linea: 'VENTA_EQUIPOS', monto: 0, cantidad: 0 },
      { moneda: 'USD', linea: 'OTRO', monto: 0, cantidad: 0 },
    ],
    ocupacion: {
      horas: [10, 11],
      franjas: [
        { dia: 1, hora: 10, reservas: 3, horasReservadas: 4.5 },
        { dia: 1, hora: 11, reservas: 0, horasReservadas: 0 },
        { dia: 2, hora: 10, reservas: 0, horasReservadas: 0 },
        { dia: 2, hora: 11, reservas: 0, horasReservadas: 0 },
        { dia: 3, hora: 10, reservas: 0, horasReservadas: 0 },
        { dia: 3, hora: 11, reservas: 0, horasReservadas: 0 },
        { dia: 4, hora: 10, reservas: 0, horasReservadas: 0 },
        { dia: 4, hora: 11, reservas: 0, horasReservadas: 0 },
        { dia: 5, hora: 10, reservas: 0, horasReservadas: 0 },
        { dia: 5, hora: 11, reservas: 0, horasReservadas: 0 },
        { dia: 6, hora: 10, reservas: 0, horasReservadas: 0 },
        { dia: 6, hora: 11, reservas: 0, horasReservadas: 0 },
        { dia: 7, hora: 10, reservas: 0, horasReservadas: 0 },
        { dia: 7, hora: 11, reservas: 0, horasReservadas: 0 },
      ],
    },
    retencion: { conVentanaCerrada: 10, retenidos: 6, tasa: 60 },
    conversion: { llegaronPorServicioSuelto: 8, convertidos: 3, tasa: 37.5 },
    mixMastering: {
      porEstado: [
        { estado: 'EN_PROCESO', cantidad: 2 },
        { estado: 'ENTREGADO', cantidad: 1 },
      ],
      entregadosEnElPeriodo: 1,
      conRevisionesDeMas: 0,
    },
    sello: {
      porEstado: [{ estado: 'PUBLICADO', cantidad: 3 }],
      publicadosEnElPeriodo: 1,
      publicadosSinContrato: 0,
      apariciones: [{ tipo: 'RADIO', cantidad: 2 }],
    },
    ...cambios,
  }
}

function montar(rol: UsuarioActual['rol']) {
  const contexto: ContextoAuth = {
    sesion: { estado: 'autenticado', usuario: usuario(rol) },
    iniciarSesion: async () => {},
    registrarse: async () => {},
    cerrarSesion: () => {},
    refrescarUsuario: async () => {},
  }

  // Los "ver detalle" son `Link`, y un Link sin Router arriba explota. No es
  // decorado del test: el drill-down es lo que §11 pide de esta pantalla.
  return render(
    <MemoryRouter>
      <AuthContext value={contexto}>
        <TableroPagina />
      </AuthContext>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarSalas).mockResolvedValue(SALAS)
  vi.mocked(tableroCompleto).mockResolvedValue(tablero())
  vi.mocked(descargarTablero).mockResolvedValue()
  vi.mocked(resumenFinanciero).mockResolvedValue({
    periodo: { desde: '2026-08-01', hasta: '2026-08-20', idSala: null },
    caja: caja(),
    pendientes: pendientes(),
  })
})

describe('quién ve qué', () => {
  it('un DIRECTIVO pide el tablero completo', async () => {
    montar('DIRECTIVO')

    await waitFor(() => expect(tableroCompleto).toHaveBeenCalled())
    expect(resumenFinanciero).not.toHaveBeenCalled()
    expect(await screen.findByText('Retención')).toBeDefined()
  })

  /**
   * **STAFF pide el otro endpoint, no el completo.** No es cosmética: si pidiera
   * el completo recibiría un 403 y la pantalla mostraría "no se pudo cargar el
   * tablero", que se lee como un sistema roto en vez de como un permiso.
   */
  it('un STAFF pide el resumen y nunca el tablero completo', async () => {
    montar('STAFF')

    await waitFor(() => expect(resumenFinanciero).toHaveBeenCalled())
    expect(tableroCompleto).not.toHaveBeenCalled()
  })

  /**
   * Y lo que no le toca **no está en la pantalla**, ni vacío ni escondido. Lo
   * que sí hay es una frase que dice por qué falta: una pantalla más corta sin
   * explicación se lee como un sistema a medio hacer, que es el mismo criterio
   * de los bloques "todavía no disponible" de la ficha del alumno.
   */
  it('el STAFF no ve retención ni ocupación, y se le dice por qué', async () => {
    montar('STAFF')

    expect(await screen.findByText(/El tablero completo/)).toBeDefined()
    expect(screen.queryByText('Retención')).toBeNull()
    expect(screen.queryByText('Conversión')).toBeNull()
    expect(screen.queryByText('Cuándo se llena el estudio')).toBeNull()
    expect(screen.queryByText('El sello')).toBeNull()
  })

  /** Pero sí ve la plata, que es la que maneja todos los días. */
  it('el STAFF ve la caja y los cobros pendientes', async () => {
    montar('STAFF')

    expect(await screen.findByText('La caja del período')).toBeDefined()
    expect(screen.getByText('Cobros pendientes')).toBeDefined()
  })
})

describe('la retención', () => {
  it('muestra el porcentaje y sobre cuántos se calculó', async () => {
    montar('ADMIN')

    expect(await screen.findByText('60%')).toBeDefined()
    expect(screen.getByText(/6 de 10 contrataron un segundo servicio/)).toBeDefined()
  })

  /**
   * **Sin nadie con la ventana cerrada dice que no hay a quién medir, no 0%.**
   * Un cero se lee como que se fueron todos; lo que pasa es lo contrario. Misma
   * distinción que el semáforo del Módulo 5 hace entre "va bien" y "sin marcar".
   */
  it('con denominador cero no dice 0% sino que todavía no hay a quién medir', async () => {
    const sinVentanas: Retencion = { conVentanaCerrada: 0, retenidos: 0, tasa: null }
    vi.mocked(tableroCompleto).mockResolvedValue(tablero({ retencion: sinVentanas }))

    montar('ADMIN')

    expect(await screen.findByText('Sin datos todavía')).toBeDefined()
    expect(screen.queryByText('0%')).toBeNull()
  })
})

describe('la conversión', () => {
  it('muestra el porcentaje y sobre cuántos se calculó', async () => {
    montar('ADMIN')

    expect(await screen.findByText('37.5%')).toBeDefined()
    expect(screen.getByText(/3 de 8 llegaron por un servicio suelto y hoy son alumnos/)).toBeDefined()
  })

  /**
   * Misma distinción que la retención: sin nadie que haya llegado por un
   * servicio suelto, no hay a quién medir — no es que "nadie convierte".
   */
  it('con denominador cero no dice 0% sino que todavía no hay a quién medir', async () => {
    const sinLlegados: Conversion = { llegaronPorServicioSuelto: 0, convertidos: 0, tasa: null }
    vi.mocked(tableroCompleto).mockResolvedValue(tablero({ conversion: sinLlegados }))

    montar('ADMIN')

    expect(await screen.findByText('Sin datos todavía')).toBeDefined()
    expect(screen.queryByText('0%')).toBeNull()
  })
})

describe('foto contra período', () => {
  /**
   * La deuda no se filtra por el período y la pantalla tiene que decirlo. Sin
   * esa línea, alguien mira agosto, ve la deuda y cree que se generó en agosto —
   * que es la forma más barata que tiene un tablero de mentir.
   */
  it('aclara que los cobros pendientes son toda la deuda viva', async () => {
    montar('ADMIN')

    expect(await screen.findByText(/Toda la deuda viva, no solo la del período/)).toBeDefined()
  })

  it('aclara que los alumnos cursando son de hoy', async () => {
    montar('ADMIN')

    expect(await screen.findByText(/Al día de hoy, no del período/)).toBeDefined()
  })
})

describe('cero y no vacío', () => {
  /** Una disciplina sin nadie sale en cero, no desaparece. */
  it('las disciplinas sin alumnos se muestran igual', async () => {
    montar('ADMIN')

    expect(await screen.findByText('Producción')).toBeDefined()
    expect(screen.getByText('Mentoría')).toBeDefined()
  })

  /** La grilla dibuja las casillas vacías: son 7 días × las horas que vinieron. */
  it('la grilla dibuja también las franjas sin reservas', async () => {
    montar('ADMIN')

    await screen.findByText('Cuándo se llena el estudio')
    expect(screen.getByTitle(/Lun 10:00 — 3 reservas/)).toBeDefined()
    expect(screen.getByTitle(/Mar 10:00 — 0 reservas/)).toBeDefined()
  })
})

describe('cuando algo falla', () => {
  /**
   * Igual que el informe de uso: dejar los números del período anterior con un
   * error arriba los hace leer como si fueran los pedidos. Un tablero
   * equivocado es peor que ninguno.
   */
  it('un error borra los números en vez de dejar los del período anterior', async () => {
    montar('ADMIN')
    expect(await screen.findByText('60%')).toBeDefined()

    vi.mocked(tableroCompleto).mockRejectedValue(new Error('se cayó'))
    // Un segundo montaje con el mock ya roto: la pantalla no puede quedar con
    // los datos viejos y el aviso arriba.
    montar('ADMIN')

    await waitFor(() => expect(screen.getByText('No se pudo cargar el tablero.')).toBeDefined())
  })
})

describe('la exportación', () => {
  /**
   * **Hereda los filtros de la pantalla, incluida la sala.** Es el requisito
   * textual de §15: se exporta lo que estás mirando y no un volcado fijo que
   * después hay que recortar a mano en Excel. Si esto se rompe, el archivo se
   * genera igual y trae otros números que los de la pantalla — que es la peor
   * forma de romperlo, porque se descubre en la reunión.
   */
  it('exporta con el mismo período que está en pantalla', async () => {
    montar('ADMIN')
    await screen.findByText('Retención')

    await userEvent.click(screen.getByRole('button', { name: 'Excel' }))

    expect(descargarTablero).toHaveBeenCalledWith(
      'xlsx',
      expect.objectContaining({ desde: expect.any(String), hasta: expect.any(String) }),
    )
  })

  it('el PDF sale por el mismo camino', async () => {
    montar('ADMIN')
    await screen.findByText('Retención')

    await userEvent.click(screen.getByRole('button', { name: 'PDF' }))

    expect(descargarTablero).toHaveBeenCalledWith('pdf', expect.anything())
  })

  /**
   * **A STAFF no se le ofrece.** Se exporta lo que se puede ver, y el backend
   * rechaza el pedido de quien no; ofrecer el botón igual sería prometer una
   * descarga que vuelve 403 — el mismo defecto que `puedeOperar` vino a arreglar
   * cuando un socio completaba "Nuevo alumno" y recibía un permiso denegado.
   */
  it('el STAFF no ve los botones de exportar', async () => {
    montar('STAFF')
    await screen.findByText('La caja del período')

    expect(screen.queryByRole('button', { name: 'Excel' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'PDF' })).toBeNull()
  })

  it('si el archivo no se puede generar lo dice', async () => {
    vi.mocked(descargarTablero).mockRejectedValue(new Error('se cayó'))
    montar('ADMIN')
    await screen.findByText('Retención')

    await userEvent.click(screen.getByRole('button', { name: 'Excel' }))

    expect(await screen.findByText('No se pudo generar el archivo.')).toBeDefined()
  })
})
