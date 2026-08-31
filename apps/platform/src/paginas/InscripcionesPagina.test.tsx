import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsuarioActual } from '../api/tipos'
import type { AlumnoResumen, InscripcionResumen } from '../api/tiposAdmin'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { InscripcionesPagina } from './InscripcionesPagina'
import { elegir } from '../pruebas/elegir'

/**
 * El curso contratado de cada alumno.
 *
 * Los casos apuntan a lo que esta pantalla decide y ninguna otra prueba cubre:
 * **el número de clases restantes** (lo que el relevamiento marca como faltante),
 * **las clases de fábrica al elegir disciplina**, y **el motivo que hace falta
 * para bajar de nivel**. Los dos últimos son reglas que el backend también
 * impone; acá se prueba que la pantalla las anticipe en vez de mandar un pedido
 * que va a rebotar.
 */

vi.mock('../api/administracion', () => ({
  listarInscripciones: vi.fn(),
  listarAlumnos: vi.fn(),
  listarProfesores: vi.fn(),
  altaInscripcion: vi.fn(),
  editarInscripcion: vi.fn(),
  cambiarEstadoInscripcion: vi.fn(),
}))

const {
  altaInscripcion,
  cambiarEstadoInscripcion,
  editarInscripcion,
  listarAlumnos,
  listarInscripciones,
  listarProfesores,
} = await import('../api/administracion')

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

function inscripcion(cambios: Partial<InscripcionResumen> = {}): InscripcionResumen {
  return {
    idInscripcion: 1,
    idAlumno: 10,
    idUsuario: 100,
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan@lajuanita.local',
    idProfesor: 5,
    profesor: 'Tomás Ghezzi',
    disciplina: 'DJ',
    nivel: 'INICIAL',
    clasesContratadas: 8,
    clasesConsumidas: 3,
    clasesRestantes: 5,
    precioTotal: 180000,
    moneda: 'ARS',
    cotizacionDolar: null,
    fechaInicio: '2026-09-01',
    estado: 'ACTIVA',
    notas: null,
    ...cambios,
  }
}

function alumno(cambios: Partial<AlumnoResumen> = {}): AlumnoResumen {
  return {
    idAlumno: 10,
    idUsuario: 100,
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan@lajuanita.local',
    telefono: null,
    nivelIngreso: 'INICIAL',
    estadoAlumno: 'ACTIVO',
    fechaIngreso: '2026-03-01',
    instagram: null,
    usuarioActivo: true,
    disciplinas: [],
    ...cambios,
  }
}

function paginaDe<T>(contenido: T[], totalElementos = contenido.length, totalPaginas = 1) {
  return { contenido, pagina: 0, tamanio: 20, totalElementos, totalPaginas }
}

function montar(rol: UsuarioActual['rol']) {
  const contexto: ContextoAuth = {
    sesion: { estado: 'autenticado', usuario: usuario(rol) },
    iniciarSesion: async () => {},
    registrarse: async () => {},
    cerrarSesion: () => {},
    refrescarUsuario: async () => {},
  }

  return render(
    <AuthContext value={contexto}>
      <InscripcionesPagina />
    </AuthContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarProfesores).mockResolvedValue([
    {
      idProfesor: 5,
      idUsuario: 50,
      nombre: 'Tomás',
      apellido: 'Ghezzi',
      nombreCompleto: 'Tomás Ghezzi',
      email: 'tomas@lajuanita.local',
      especialidad: null,
      activo: true,
    },
  ])
  vi.mocked(listarAlumnos).mockResolvedValue(paginaDe([alumno()]))
  vi.mocked(listarInscripciones).mockResolvedValue(paginaDe([inscripcion()]))
})

describe('las clases restantes', () => {
  /**
   * El número por el que existe este módulo. El backend lo calcula contra las
   * clases efectivamente dictadas; la pantalla lo muestra y no lo recalcula.
   */
  it('muestra cuántas clases le quedan sobre las contratadas', async () => {
    expect(await montarYEsperar('STAFF', '5 de 8')).toBeDefined()
    expect(screen.getByText('clases restantes')).toBeDefined()
  })

  it('una inscripción sin profe asignado lo dice, no lo deja en blanco', async () => {
    vi.mocked(listarInscripciones).mockResolvedValue(
      paginaDe([inscripcion({ idProfesor: null, profesor: null })]),
    )

    montar('STAFF')

    expect(await screen.findByText('Sin asignar')).toBeDefined()
  })
})

describe('eje de escritura (SEC-05)', () => {
  it('un DIRECTIVO ve el listado y ningún botón de escritura', async () => {
    montar('DIRECTIVO')

    expect(await screen.findByText('Pérez, Juan')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Nueva inscripción' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
  })

  it.each(['ADMIN', 'STAFF'] as const)('un %s sí ve el alta y la edición', async (rol) => {
    montar(rol)

    expect(await screen.findByRole('button', { name: 'Nueva inscripción' })).toBeDefined()
    expect(await screen.findAllByRole('button', { name: 'Editar' })).toHaveLength(1)
  })
})

describe('las clases de fábrica del curso (§13, P34)', () => {
  it('elegir DJ completa las 8 clases del curso cerrado', async () => {
    const user = userEvent.setup()
    await montarYEsperar('STAFF', 'Pérez, Juan')

    await user.click(screen.getByRole('button', { name: 'Nueva inscripción' }))
    await elegir(user, 'Disciplina', 'DJ')

    expect(screen.getByLabelText(/Clases contratadas/)).toHaveProperty('value', '8')
  })

  it('elegir Producción completa las 16', async () => {
    const user = userEvent.setup()
    await montarYEsperar('STAFF', 'Pérez, Juan')

    await user.click(screen.getByRole('button', { name: 'Nueva inscripción' }))
    await elegir(user, 'Disciplina', 'PRODUCCION')

    expect(screen.getByLabelText(/Clases contratadas/)).toHaveProperty('value', '16')
  })

  /**
   * La mentoría se arma a medida y no tiene número de fábrica. El backend
   * rechaza el alta sin clases; la pantalla lo pide antes en vez de mandar un
   * pedido que ya se sabe que va a rebotar.
   */
  it('la mentoría queda vacía y no se envía sin decir cuántas clases son', async () => {
    const user = userEvent.setup()
    await montarYEsperar('STAFF', 'Pérez, Juan')

    await user.click(screen.getByRole('button', { name: 'Nueva inscripción' }))
    await user.click(await screen.findByRole('button', { name: /Pérez, Juan/ }))
    await elegir(user, 'Disciplina', 'MENTORIA')

    expect(screen.getByLabelText(/Clases contratadas/)).toHaveProperty('value', '')

    await user.type(screen.getByLabelText(/Precio total/), '90000')
    await user.click(screen.getByRole('button', { name: 'Crear inscripción' }))

    expect(
      await screen.findByText('La mentoría se arma a medida: decí cuántas clases son.'),
    ).toBeDefined()
    expect(altaInscripcion).not.toHaveBeenCalled()
  })

  it('con las clases dichas a mano, la mentoría sí se envía', async () => {
    const user = userEvent.setup()
    vi.mocked(altaInscripcion).mockResolvedValue(inscripcion())
    await montarYEsperar('STAFF', 'Pérez, Juan')

    await user.click(screen.getByRole('button', { name: 'Nueva inscripción' }))
    await user.click(await screen.findByRole('button', { name: /Pérez, Juan/ }))
    await elegir(user, 'Disciplina', 'MENTORIA')
    await user.type(screen.getByLabelText(/Clases contratadas/), '4')
    await user.type(screen.getByLabelText(/Precio total/), '90000')
    await user.click(screen.getByRole('button', { name: 'Crear inscripción' }))

    await waitFor(() => expect(altaInscripcion).toHaveBeenCalled())
    expect(vi.mocked(altaInscripcion).mock.calls[0][0]).toMatchObject({
      idAlumno: 10,
      disciplina: 'MENTORIA',
      clasesContratadas: 4,
      precioTotal: 90000,
    })
  })
})

describe('la firma de una baja de nivel (V9)', () => {
  /**
   * Bajar el nivel es decirle a alguien "no estás para intermedio". La base
   * exige quién, cuándo y por qué; el quién y el cuándo los pone el servidor,
   * así que la pantalla solo tiene que conseguir el motivo — y conseguirlo
   * *antes*, porque el backend devuelve 400 sobre un formulario ya completo.
   */
  it('bajar el nivel pide el motivo y no manda nada hasta tenerlo', async () => {
    const user = userEvent.setup()
    vi.mocked(listarInscripciones).mockResolvedValue(
      paginaDe([inscripcion({ nivel: 'AVANZADO' })]),
    )
    await montarYEsperar('STAFF', 'Pérez, Juan')

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await elegir(user, 'Nivel', 'INICIAL')

    expect(screen.getByText(/Estás bajando el nivel de Avanzado a Inicial/)).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(
      await screen.findByText('Bajar el nivel queda firmado: escribí el motivo.'),
    ).toBeDefined()
    expect(editarInscripcion).not.toHaveBeenCalled()
  })

  it('con el motivo escrito, la baja se manda con él', async () => {
    const user = userEvent.setup()
    vi.mocked(listarInscripciones).mockResolvedValue(
      paginaDe([inscripcion({ nivel: 'AVANZADO' })]),
    )
    vi.mocked(editarInscripcion).mockResolvedValue(inscripcion({ nivel: 'INICIAL' }))
    await montarYEsperar('STAFF', 'Pérez, Juan')

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await elegir(user, 'Nivel', 'INICIAL')
    await user.type(screen.getByLabelText(/Motivo/), 'No llegó con la práctica final')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(editarInscripcion).toHaveBeenCalled())
    expect(vi.mocked(editarInscripcion).mock.calls[0][1]).toMatchObject({
      nivel: 'INICIAL',
      motivoBajaNivel: 'No llegó con la práctica final',
    })
  })

  /** Subir de nivel no se firma: no es una decisión discutible. */
  it('subir el nivel no pide ningún motivo', async () => {
    const user = userEvent.setup()
    vi.mocked(editarInscripcion).mockResolvedValue(inscripcion({ nivel: 'AVANZADO' }))
    await montarYEsperar('STAFF', 'Pérez, Juan')

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await elegir(user, 'Nivel', 'AVANZADO')

    expect(screen.queryByText(/Estás bajando el nivel/)).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(editarInscripcion).toHaveBeenCalled())
    expect(vi.mocked(editarInscripcion).mock.calls[0][1]).toMatchObject({
      nivel: 'AVANZADO',
      motivoBajaNivel: undefined,
    })
  })
})

describe('estados vacíos y de error', () => {
  it('sin inscripciones y sin filtros lo dice con las palabras correctas', async () => {
    vi.mocked(listarInscripciones).mockResolvedValue(paginaDe([], 0, 0))

    montar('STAFF')

    expect(await screen.findByText('Todavía no hay inscripciones cargadas.')).toBeDefined()
  })

  it('si el backend falla se muestra el mensaje y no una tabla en blanco', async () => {
    const { ApiError } = await import('../api/cliente')
    vi.mocked(listarInscripciones).mockRejectedValue(new ApiError(500, 'La base no responde.'))

    montar('STAFF')

    expect(await screen.findByText('La base no responde.')).toBeDefined()
  })

  /**
   * El rechazo real de esta pantalla: reactivar una inscripción vieja cuando el
   * alumno ya tiene otra activa de la misma disciplina (P3). Lo decide el índice
   * único de la base y llega como 409 — tragarlo dejaría el select cambiado y la
   * fila sin cambiar, que se lee como que el sistema perdió el dato.
   */
  it('un estado rechazado por el backend muestra el motivo', async () => {
    const user = userEvent.setup()
    const { ApiError } = await import('../api/cliente')
    vi.mocked(cambiarEstadoInscripcion).mockRejectedValue(
      new ApiError(409, 'Ese alumno ya tiene una inscripción activa en esa disciplina.'),
    )
    await montarYEsperar('STAFF', 'Pérez, Juan')

    await elegir(user, /Cambiar estado de la inscripción/, 'COMPLETADA')

    expect(
      await screen.findByText('Ese alumno ya tiene una inscripción activa en esa disciplina.'),
    ).toBeDefined()
  })
})

describe('paginado', () => {
  it('con 81 inscripciones en 5 páginas aparece el control', async () => {
    const filas = Array.from({ length: 20 }, (_, i) => inscripcion({ idInscripcion: i + 1 }))
    vi.mocked(listarInscripciones).mockResolvedValue(paginaDe(filas, 81, 5))

    montar('STAFF')

    expect(await screen.findByText('81 inscripciones')).toBeDefined()
    expect(await screen.findByText(/Página 1 de 5/)).toBeDefined()
  })

  it('una sola inscripción se escribe en singular', async () => {
    montar('STAFF')

    expect(await screen.findByText('1 inscripción')).toBeDefined()
  })
})

/** Monta y espera a que la tabla haya cargado, que es lo que habilita los clics. */
async function montarYEsperar(rol: UsuarioActual['rol'], textoEsperado: string) {
  montar(rol)
  return await screen.findByText(textoEsperado)
}
