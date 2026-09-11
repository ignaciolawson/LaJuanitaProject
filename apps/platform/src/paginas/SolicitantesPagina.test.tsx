import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsuarioActual as Actual } from '../api/tipos'
import type {
  CabinaApartada,
  CandidatoDeLaFicha,
  ConversionRealizada,
  SolicitanteResumen,
} from '../api/tiposAdmin'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { elegir } from '../pruebas/elegir'
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
  candidatosDeLaFicha: vi.fn(),
  apartarleLaCabina: vi.fn(),
  listarSalas: vi.fn(),
  listarTiposUso: vi.fn(),
  darleCuentaAlSolicitante: vi.fn(),
  atenderSolicitante: vi.fn(),
  descartarSolicitante: vi.fn(),
}))

const {
  listarSolicitantes,
  candidatosDeLaFicha,
  apartarleLaCabina,
  listarSalas,
  listarTiposUso,
  darleCuentaAlSolicitante,
  atenderSolicitante,
  descartarSolicitante,
} = await import('../api/administracion')

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
    idReserva: null,
    idInscripcion: null,
    idVentaEquipo: null,
    estadoDeLaReserva: null,
    fechaPreferida: null,
    horaPreferida: null,
    duracionMinutos: null,
    fechaResolucion: null,
    fechaCreacion: '2026-08-28T10:00:00-03:00',
    ...cambios,
  }
}

function conversion(cambios: Partial<ConversionRealizada> = {}): ConversionRealizada {
  return {
    // ⚠️ Sigue PENDIENTE: crear la cuenta ya no resuelve la ficha (`V27`, P55).
    solicitante: ficha({ idUsuario: 40 }),
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

/** Un candidato: lo que se le ofrece a quien cierra la ficha. */
function candidato(cambios: Partial<CandidatoDeLaFicha> = {}): CandidatoDeLaFicha {
  return {
    tipo: 'INSCRIPCION',
    id: 77,
    descripcion: 'DJ · INICIAL',
    cuando: '2026-09-15',
    reparo: null,
    ...cambios,
  }
}

/** El catálogo mínimo: una sala que admite alquiler de cabina. */
const SALA = {
  idSala: 1,
  nombre: 'Sala 1',
  descripcion: null,
  activa: true,
  orden: 1,
  usosPermitidos: [{ idTipoUso: 5, advertencia: null }],
}

const USO_CABINA = {
  idTipoUso: 5,
  codigo: 'ALQUILER_CABINA',
  nombre: 'Alquiler de cabina',
  esClase: false,
  disciplina: null,
  color: '#f4a261',
  activo: true,
  solicitablePorUsuario: true,
}

function cabinaApartada(cambios: Partial<CabinaApartada> = {}): CabinaApartada {
  return {
    ficha: ficha({ estado: 'ATENDIDO', idUsuario: 40, idReserva: 12 }),
    reserva: {
      idReserva: 12,
      idSala: 1,
      sala: 'Sala 1',
      idTipoUso: 5,
      tipoUso: 'Alquiler de cabina',
      color: '#f4a261',
      esClase: false,
      idProfesor: null,
      profesor: null,
      fecha: '2026-10-10',
      horaInicio: '18:00:00',
      horaFin: '20:00:00',
      estado: 'PRECONFIRMADA',
      venceEn: '2026-09-07T10:00:00-03:00',
      notas: null,
      idReservaRecupera: null,
      motivoReprogramacion: null,
      participantes: [],
    },
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
    idPagoDeuda: 88,
    monto: 15000,
    moneda: 'ARS',
    ...cambios,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(candidatosDeLaFicha).mockResolvedValue([])
  vi.mocked(listarSalas).mockResolvedValue([SALA])
  vi.mocked(listarTiposUso).mockResolvedValue([USO_CABINA])
  vi.mocked(listarSolicitantes).mockResolvedValue({
    contenido: [ficha()],
    pagina: 0,
    tamanio: 20,
    totalElementos: 1,
    totalPaginas: 1,
  })
})

describe('el buzón', () => {
  /**
   * ⚠️ **Abre en "lo que falta hacer", que no es un estado.** Antes abría en
   * `PENDIENTE`, y ése era el bug: al crear la cuenta la ficha salía de esa lista
   * con la persona todavía sin su reserva. Ahora el filtro por defecto junta lo
   * que nadie contestó con lo que se apartó y no se señó (`FichaAbierta`).
   */
  it('abre en lo que falta hacer', async () => {
    montar()

    expect(await screen.findByText('Ríos, Camila')).toBeDefined()
    expect(vi.mocked(listarSolicitantes).mock.calls[0][0].abiertas).toBe(true)
    expect(vi.mocked(listarSolicitantes).mock.calls[0][0].estado).toBeUndefined()
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
    expect(screen.queryByRole('button', { name: 'Crearle la cuenta' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Descartar' })).toBeNull()
  })
})

describe('convertir la ficha en cuenta', () => {
  it('muestra la contraseña temporal, que no se puede volver a ver', async () => {
    vi.mocked(darleCuentaAlSolicitante).mockResolvedValue(conversion())
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Crearle la cuenta' }))

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
    vi.mocked(darleCuentaAlSolicitante).mockResolvedValue(
      conversion({ passwordTemporal: null, cuentaNueva: false }),
    )
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Crearle la cuenta' }))

    await waitFor(() => expect(screen.getByText(/ya tenía cuenta/)).toBeDefined())
    expect(screen.getByText(/No hay contraseña que mandarle/)).toBeDefined()
  })

  /**
   * La ficha existe para que el trámite siga en la pantalla que corresponde, y
   * cuál es depende de qué pidió. Sin esto, quien atiende tiene que adivinar
   * entre dieciséis pantallas.
   */
  it('dice a dónde sigue el trámite según qué pidió', async () => {
    vi.mocked(darleCuentaAlSolicitante).mockResolvedValue(conversion())
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Crearle la cuenta' }))

    await waitFor(() => expect(screen.getByText(/Cargale la inscripción/)).toBeDefined())
    expect(screen.getByRole('link', { name: 'Inscripciones' }).getAttribute('href')).toBe(
      '/admin/inscripciones',
    )
  })

  it('una consulta por equipos manda a la pantalla de ventas', async () => {
    vi.mocked(darleCuentaAlSolicitante).mockResolvedValue(
      conversion({ solicitante: ficha({ idUsuario: 40, interes: 'EQUIPOS' }) }),
    )
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Crearle la cuenta' }))

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
    vi.mocked(darleCuentaAlSolicitante).mockResolvedValue(conversion())
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Crearle la cuenta' }))

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

  // == Apartar la cabina: las tres cosas en un movimiento ===================

  /**
   * ⚠️ **El caso central de la Fase 3.** Un formulario, y quedan hechas las tres
   * cosas que antes eran tres pantallas — y que es lo que abrió esta sección:
   * *"una vez que ponés dar cuenta desaparece el coso, entonces quizás ya te
   * olvidaste qué quería"*.
   *
   * **La duración va en minutos y la hora de fin no viaja**: es lo que P58
   * decidió —*"2 horas" es lo que la persona piensa*— y la cuenta la hace el
   * servidor, para que no haya un segundo lugar donde se decida qué significa
   * "dos horas desde las 18".
   */
  it('aparta la cabina desde la ficha, con la duración en minutos', async () => {
    vi.mocked(listarSolicitantes).mockResolvedValue({
      contenido: [ficha({ interes: 'ALQUILER_CABINA' })],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    vi.mocked(apartarleLaCabina).mockResolvedValue(cabinaApartada())
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Apartarle la cabina' }))
    await userEvent.type(await screen.findByLabelText('Día'), '2026-10-10')
    await userEvent.type(screen.getByLabelText('Hora de inicio'), '18:00')
    await elegir(userEvent, 'Duración', '120')
    await userEvent.type(screen.getByLabelText('Monto a abonar'), '15000')
    await userEvent.click(screen.getByRole('button', { name: 'Apartar el horario' }))

    await waitFor(() =>
      expect(apartarleLaCabina).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          idSala: 1,
          idTipoUso: 5,
          fecha: '2026-10-10',
          horaInicio: '18:00',
          duracionMinutos: 120,
          monto: 15000,
          moneda: 'ARS',
        }),
      ),
    )
  })

  /**
   * ⚠️ **El plazo se muestra, y esto es lo que cuida que se muestre.**
   *
   * Lo que se acabó de crear no es una reserva confirmada: es un horario tomado
   * que se libera solo en 24 horas. Un panel que diga *"listo"* sin decir hasta
   * cuándo deja tranquilo a quien atiende, y el que pierde es el cliente que
   * nunca se enteró — la misma razón por la que la notificación del sistema lo
   * dice.
   */
  it('después de apartar muestra el plazo y la clave, y ofrece UN WhatsApp con todo', async () => {
    vi.mocked(listarSolicitantes).mockResolvedValue({
      contenido: [ficha({ interes: 'ALQUILER_CABINA' })],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    vi.mocked(apartarleLaCabina).mockResolvedValue(cabinaApartada())
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Apartarle la cabina' }))
    await userEvent.type(await screen.findByLabelText('Día'), '2026-10-10')
    await userEvent.type(screen.getByLabelText('Hora de inicio'), '18:00')
    await userEvent.type(screen.getByLabelText('Monto a abonar'), '15000')
    await userEvent.click(screen.getByRole('button', { name: 'Apartar el horario' }))

    expect(await screen.findByText(/07\/09\/2026 10:00/)).toBeDefined()
    expect(screen.getByText('lluvia-42-roja')).toBeDefined()

    // Un solo botón (P71, §16 · A8): el plazo, la clave y el portal en un mensaje,
    // en ese orden. Antes eran dos y quien atendía tenía que mandar los dos.
    const enlaces = screen.getAllByRole('link', { name: /WhatsApp/ })
    expect(enlaces).toHaveLength(1)
    const mensaje = mensajeDe(enlaces[0])
    expect(mensaje).toContain('07/09/2026 10:00')
    expect(mensaje).toContain('lluvia-42-roja')
    expect(mensaje).toContain('camila@ejemplo.com')
    expect(mensaje.indexOf('07/09/2026 10:00')).toBeLessThan(mensaje.indexOf('lluvia-42-roja'))
  })

  /**
   * ⚠️ **La persona que ya tenía cuenta no recibe una contraseña.** Es la segunda
   * variante del mensaje único: sin `passwordTemporal` no hay bloque de cuenta,
   * ni en pantalla ni en el WhatsApp — y el botón sigue estando, porque el plazo
   * hay que mandarlo igual.
   */
  it('si ya tenía cuenta, el WhatsApp va sin clave', async () => {
    vi.mocked(listarSolicitantes).mockResolvedValue({
      contenido: [ficha({ interes: 'ALQUILER_CABINA', idUsuario: 40 })],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    vi.mocked(apartarleLaCabina).mockResolvedValue(
      cabinaApartada({ cuentaNueva: false, passwordTemporal: null }),
    )
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Apartarle la cabina' }))
    await userEvent.type(await screen.findByLabelText('Día'), '2026-10-10')
    await userEvent.type(screen.getByLabelText('Hora de inicio'), '18:00')
    await userEvent.type(screen.getByLabelText('Monto a abonar'), '15000')
    await userEvent.click(screen.getByRole('button', { name: 'Apartar el horario' }))

    const enlace = await screen.findByRole('link', { name: 'Avisarle por WhatsApp' })
    expect(mensajeDe(enlace)).toContain('07/09/2026 10:00')
    expect(mensajeDe(enlace)).not.toContain('Contraseña')
    expect(screen.queryByText('lluvia-42-roja')).toBeNull()
  })

  /**
   * ⚠️ **El formulario viene precargado con lo que la persona pidió, y lo dice.**
   *
   * Sin ese aviso una fecha ya escrita se lee como *el sistema decidió esto*,
   * cuando es *esto es lo que pidió* — y la web **no ve disponibilidad** (P58), así
   * que confirmarla sin mirar la agenda es exactamente el error que puede
   * producir.
   */
  it('precarga lo que pidió y avisa que hay que confirmarlo contra la agenda', async () => {
    vi.mocked(listarSolicitantes).mockResolvedValue({
      contenido: [
        ficha({
          interes: 'ALQUILER_CABINA',
          fechaPreferida: '2026-10-10',
          horaPreferida: '18:00:00',
          duracionMinutos: 120,
        }),
      ],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    montar()

    // La ficha lo muestra como preferencia, nunca como reserva.
    expect(await screen.findByText(/Le vendría bien/)).toBeDefined()

    await userEvent.click(screen.getByRole('button', { name: 'Apartarle la cabina' }))

    expect(await screen.findByLabelText('Día')).toHaveProperty('value', '2026-10-10')
    expect(screen.getByLabelText('Hora de inicio')).toHaveProperty('value', '18:00')
    expect(screen.getByText(/Confirmalo contra la agenda/)).toBeDefined()
  })

  /**
   * **Sólo se aparta lo que se aparta.** Un curso no tiene botón de apartar: el
   * camino equivalente —cargar la inscripción— todavía se hace en su pantalla, y
   * ponerle el nombre del trabajo sin hacer el trabajo sería un botón que miente.
   */
  it('una ficha de curso no ofrece apartar', async () => {
    montar()

    expect(await screen.findByRole('button', { name: 'Crearle la cuenta' })).toBeDefined()
    expect(screen.queryByRole('button', { name: /Apartarle/ })).toBeNull()
  })

  // == Cerrar la ficha: lo único que la resuelve ============================

  /**
   * ⚠️ **El caso central de `V27`: se elige de una lista, no se tipea un id.**
   *
   * Sin esto la pantalla sería el único lugar del sistema donde hay que copiar un
   * número de otra —o sea el único donde se puede pegar el equivocado—, y una
   * ficha cerrada contra la reserva de otro **se ve resuelta**, que es lo único
   * que este buzón no puede permitirse.
   */
  it('cierra la ficha eligiendo lo que se le cargó, sin tipear ningún id', async () => {
    vi.mocked(listarSolicitantes).mockResolvedValue({
      contenido: [ficha({ idUsuario: 40 })],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    vi.mocked(candidatosDeLaFicha).mockResolvedValue([candidato()])
    vi.mocked(atenderSolicitante).mockResolvedValue(ficha({ estado: 'ATENDIDO' }))
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Ya se lo cargué' }))
    await elegir(userEvent, 'Lo que se le cargó', 'INSCRIPCION:77')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar la ficha' }))

    await waitFor(() =>
      expect(atenderSolicitante).toHaveBeenCalledWith(3, { tipo: 'INSCRIPCION', id: 77 }),
    )
  })

  /**
   * La opción se lee por su fecha y su descripción — **nunca por su id**, que es
   * lo que hace que se pueda reconocer *"la cabina del viernes"*.
   *
   * La fecha la escribe `fecha()`, la única forma en que este sistema escribe
   * una: el servidor la manda typed justamente para eso (§14 · A5).
   */
  it('la opción se lee por su fecha y lo que es', async () => {
    vi.mocked(listarSolicitantes).mockResolvedValue({
      contenido: [ficha({ idUsuario: 40 })],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    vi.mocked(candidatosDeLaFicha).mockResolvedValue([candidato()])
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Ya se lo cargué' }))
    const select = await screen.findByLabelText('Lo que se le cargó')

    expect(
      await within(select).findByRole('option', { name: '15/09/2026 · DJ · INICIAL' }),
    ).toBeDefined()
  })

  /**
   * **Una inscripción sin fecha de inicio se ofrece igual, dicha así** — y este es
   * el caso de la pantalla en negro (§16 · A6). `inscripcion.fecha_inicio` es
   * nullable, el alta la manda opcional, y el tipo decía `string`: la opción le
   * hacía `fecha(null)`, `null.slice` tiraba, y sin `ErrorBoundary` se iba el
   * árbol entero. Ignacio lo encontró justo inscribiendo porque sólo pasa con
   * inscripciones: la reserva y la venta tienen la fecha `NOT NULL`.
   *
   * Se verificó poniendo el bug de vuelta: con `fecha(c.cuando)` a secas este
   * caso va a rojo.
   */
  it('ofrece la inscripción sin fecha de inicio, en vez de romper la pantalla', async () => {
    vi.mocked(listarSolicitantes).mockResolvedValue({
      contenido: [ficha({ idUsuario: 40 })],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    vi.mocked(candidatosDeLaFicha).mockResolvedValue([candidato({ cuando: null })])
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Ya se lo cargué' }))
    const select = await screen.findByLabelText('Lo que se le cargó')

    expect(
      await within(select).findByRole('option', { name: 'sin fecha de inicio · DJ · INICIAL' }),
    ).toBeDefined()
  })

  /**
   * **Lo anulado se ofrece igual, con el reparo escrito.** Esconderlo deja a
   * quien atiende buscando algo que está y no aparece, y el final de esa búsqueda
   * es cerrar la ficha contra cualquier otra cosa.
   */
  it('ofrece lo anulado, marcado', async () => {
    vi.mocked(listarSolicitantes).mockResolvedValue({
      contenido: [ficha({ idUsuario: 40, interes: 'EQUIPOS' })],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    vi.mocked(candidatosDeLaFicha).mockResolvedValue([
      candidato({ tipo: 'VENTA', id: 9, descripcion: 'Pioneer DDJ-400', reparo: 'anulada' }),
    ])
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Ya se lo cargué' }))
    const select = await screen.findByLabelText('Lo que se le cargó')

    expect(await within(select).findByRole('option', { name: /anulada/ })).toBeDefined()
  })

  /**
   * ⚠️ **Sin cuenta no hay candidatos, y la pantalla lo dice con la salida al
   * lado.** Una lista vacía sin explicación se lee como *el sistema perdió los
   * datos*; es el mismo criterio que los bloques con aviso de la ficha del alumno.
   */
  it('una ficha sin cuenta explica por qué no hay nada para elegir', async () => {
    vi.mocked(candidatosDeLaFicha).mockResolvedValue([])
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Ya se lo cargué' }))

    expect(await screen.findByText(/todavía no tiene cuenta/)).toBeDefined()
    expect(screen.getByRole('button', { name: 'Cerrar la ficha' })).toHaveProperty('disabled', true)
  })

  /**
   * Con cuenta pero sin nada cargado, el mensaje es **el otro**: no falta la
   * cuenta, falta cargarle lo que pidió — y dice dónde.
   */
  it('con cuenta y sin nada cargado manda a la pantalla que sigue', async () => {
    vi.mocked(listarSolicitantes).mockResolvedValue({
      contenido: [ficha({ idUsuario: 40 })],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    vi.mocked(candidatosDeLaFicha).mockResolvedValue([])
    montar()

    await userEvent.click(await screen.findByRole('button', { name: 'Ya se lo cargué' }))

    expect(await screen.findByText(/todavía no se le cargó nada/)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Inscripciones' })).toBeDefined()
  })

  // == La etapa: lo que la etiqueta dice ====================================

  /**
   * ⚠️ **Las cinco ramas de `etapaDeLaFicha`, que es la lectura de `FichaAbierta`
   * del lado del cliente.**
   *
   * La que importa es la tercera: *"Atendida"* sobre una ficha cuya sala se
   * apartó y nadie señó es **cierto y no sirve** — la persona sigue sin su
   * cabina. Antes de `V27` la ficha ni siquiera aparecía en la lista.
   */
  it.each([
    [{}, 'Sin contestar'],
    [{ idUsuario: 40 }, 'Tiene cuenta · falta cargarle lo que pidió'],
    [
      { estado: 'ATENDIDO' as const, estadoDeLaReserva: 'PRECONFIRMADA' as const },
      'Apartada · falta la seña',
    ],
    [
      { estado: 'ATENDIDO' as const, estadoDeLaReserva: 'CANCELADA' as const },
      'Se venció sin señar',
    ],
    [{ estado: 'ATENDIDO' as const, idInscripcion: 77 }, 'Atendida'],
    [{ estado: 'DESCARTADO' as const, respuesta: 'Spam' }, 'Descartada'],
  ])('la etiqueta dice la etapa: %o → %s', async (cambios, texto) => {
    vi.mocked(listarSolicitantes).mockResolvedValue({
      contenido: [ficha(cambios)],
      pagina: 0,
      tamanio: 20,
      totalElementos: 1,
      totalPaginas: 1,
    })
    montar()

    expect(await screen.findByText(texto)).toBeDefined()
  })
})
