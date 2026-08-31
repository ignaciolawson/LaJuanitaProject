import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsuarioActual } from '../api/tipos'
import type { AlumnoResumen } from '../api/tiposAdmin'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { AlumnosPagina } from './AlumnosPagina'
import { elegir } from '../pruebas/elegir'

/**
 * El listado que reemplaza el Notion de Micaela.
 *
 * Los dos casos de acá son los dos defectos que la auditoría encontró en el
 * front, y los dos son de la misma familia: **la pantalla decide algo sobre
 * datos que en desarrollo no existen** — 81 filas, y un rol que no es el
 * propio. Es exactamente lo que no se descubre probando a mano con el admin
 * sembrado y dos usuarios.
 */

vi.mock('../api/administracion', () => ({
  listarAlumnos: vi.fn(),
  altaAlumno: vi.fn(),
  editarAlumno: vi.fn(),
  cambiarEstadoAlumno: vi.fn(),
}))

const { listarAlumnos } = await import('../api/administracion')

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

function alumnos(cantidad: number): AlumnoResumen[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    idAlumno: i + 1,
    idUsuario: i + 100,
    nombre: `Nombre${i + 1}`,
    apellido: `Apellido${i + 1}`,
    email: `alumno${i + 1}@lajuanita.local`,
    telefono: null,
    nivelIngreso: 'INICIAL',
    estadoAlumno: 'ACTIVO',
    fechaIngreso: '2026-03-01',
    instagram: null,
    usuarioActivo: true,
    disciplinas: ['DJ'],
  }))
}

function montar(rol: UsuarioActual['rol']) {
  const contexto: ContextoAuth = {
    sesion: { estado: 'autenticado', usuario: usuario(rol) },
    iniciarSesion: async () => {},
    registrarse: async () => {},
    cerrarSesion: () => {},
    refrescarUsuario: async () => {},
  }

  // El nombre de cada fila es un `Link` al perfil, y un Link sin Router
  // arriba explota. No es decorado del test: es la navegación de la pantalla.
  return render(
    <MemoryRouter>
      <AuthContext value={contexto}>
        <AlumnosPagina />
      </AuthContext>
    </MemoryRouter>,
  )
}

/** Una página del backend: 20 filas de un total de 81. */
function paginaDe(contenido: AlumnoResumen[], totalElementos: number, totalPaginas: number) {
  return { contenido, pagina: 0, tamanio: 20, totalElementos, totalPaginas }
}

// Los casos de filtros miran `mock.lastCall`, así que las llamadas de un caso no
// pueden sobrevivir al siguiente.
beforeEach(() => {
  vi.clearAllMocks()
})

describe('paginado (ARQ-01)', () => {
  /**
   * El defecto exacto: el encabezado decía "81 alumnos" y la tabla listaba 20,
   * sin ningún control y sin ningún error. Con dos usuarios de desarrollo no se
   * notaba; con los ~80 del Notion la lista no se veía rota, se veía **corta**,
   * que es peor porque nadie la reporta.
   */
  it('con 81 alumnos en 5 páginas aparece el control de paginado', async () => {
    vi.mocked(listarAlumnos).mockResolvedValue(paginaDe(alumnos(20), 81, 5))

    montar('STAFF')

    expect(await screen.findByText('81 alumnos')).toBeDefined()
    expect(await screen.findByText(/Página 1 de 5/)).toBeDefined()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDefined()
  })

  it('en la primera página, "Anterior" está deshabilitado', async () => {
    vi.mocked(listarAlumnos).mockResolvedValue(paginaDe(alumnos(20), 81, 5))

    montar('STAFF')

    const anterior = await screen.findByRole('button', { name: 'Anterior' })
    expect(anterior).toHaveProperty('disabled', true)
  })

  /** Con una sola página el control no aporta nada y ocupa lugar. */
  it('con una sola página no se dibuja el control', async () => {
    vi.mocked(listarAlumnos).mockResolvedValue(paginaDe(alumnos(3), 3, 1))

    montar('STAFF')

    expect(await screen.findByText('3 alumnos')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull()
  })

  it('el listado pide la página al backend, no la recorta en el cliente', async () => {
    vi.mocked(listarAlumnos).mockResolvedValue(paginaDe(alumnos(20), 81, 5))

    montar('STAFF')

    await waitFor(() => expect(listarAlumnos).toHaveBeenCalled())
    expect(vi.mocked(listarAlumnos).mock.calls[0][0]).toMatchObject({ pagina: 0 })
  })

  it('un alumno solo se escribe en singular', async () => {
    vi.mocked(listarAlumnos).mockResolvedValue(paginaDe(alumnos(1), 1, 1))

    montar('STAFF')

    expect(await screen.findByText('1 alumno')).toBeDefined()
  })
})

describe('eje de escritura (SEC-05)', () => {
  /**
   * `DIRECTIVO` lee todo el sistema y no modifica nada. Antes de esto, un socio
   * entraba a Alumnos, veía "Nuevo alumno", completaba el formulario entero y
   * recibía *"No tenés permiso para hacer esto"*.
   *
   * Ocultar el botón **no autoriza nada** —quien autoriza es el backend, que
   * relee el rol de la base en cada pedido—: solo deja de ofrecer lo que va a
   * ser rechazado.
   */
  it('un DIRECTIVO ve el listado y ningún botón de escritura', async () => {
    vi.mocked(listarAlumnos).mockResolvedValue(paginaDe(alumnos(3), 3, 1))

    montar('DIRECTIVO')

    expect(await screen.findByText('Apellido1, Nombre1')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Nuevo alumno' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
  })

  it.each(['ADMIN', 'STAFF'] as const)('un %s sí ve el alta y la edición', async (rol) => {
    vi.mocked(listarAlumnos).mockResolvedValue(paginaDe(alumnos(3), 3, 1))

    montar(rol)

    expect(await screen.findByRole('button', { name: 'Nuevo alumno' })).toBeDefined()
    // Hay que esperar a las FILAS: "Nuevo alumno" no depende de los datos y se
    // dibuja en el primer render, así que buscar "Editar" justo después llega
    // con la tabla todavía vacía.
    expect(await screen.findAllByRole('button', { name: 'Editar' })).toHaveLength(3)
  })
})

describe('qué cursa cada alumno', () => {
  /**
   * Se muestra siempre, no solo al filtrar: una lista filtrada que no dice de
   * qué es cada fila obliga a confiar en que el filtro hizo lo que dijo.
   */
  it('la columna dice las disciplinas vigentes', async () => {
    const [uno] = alumnos(1)
    vi.mocked(listarAlumnos).mockResolvedValue(
      paginaDe([{ ...uno, disciplinas: ['DJ', 'MENTORIA'] }], 1, 1),
    )

    montar('STAFF')

    expect(await screen.findByText('DJ, Mentoría')).toBeDefined()
  })

  /** Sin nada vigente se dice, no se deja la celda en blanco. */
  it('quien no cursa nada lo dice con palabras', async () => {
    const [uno] = alumnos(1)
    vi.mocked(listarAlumnos).mockResolvedValue(paginaDe([{ ...uno, disciplinas: [] }], 1, 1))

    montar('STAFF')

    expect(await screen.findByText('Nada vigente')).toBeDefined()
  })

  /**
   * Los dos filtros viajan al backend, que es donde está la semántica: miran
   * inscripciones vigentes y, combinados, exigen una misma inscripción. La
   * pantalla no recorta nada por su cuenta.
   */
  it('filtrar por disciplina y nivel del curso se lo pide al backend', async () => {
    const user = userEvent.setup()
    vi.mocked(listarAlumnos).mockResolvedValue(paginaDe(alumnos(3), 3, 1))

    montar('STAFF')
    await screen.findByText('Apellido1, Nombre1')

    await elegir(user, 'Filtrar por disciplina', 'DJ')
    await elegir(user, 'Filtrar por nivel del curso', 'AVANZADO')

    await waitFor(() =>
      expect(vi.mocked(listarAlumnos).mock.lastCall?.[0]).toMatchObject({
        disciplina: 'DJ',
        nivel: 'AVANZADO',
      }),
    )
  })

  /** Filtrar desde la página 3 devuelve vacío y parece que no hay resultados. */
  it('cambiar un filtro vuelve a la primera página', async () => {
    const user = userEvent.setup()
    vi.mocked(listarAlumnos).mockResolvedValue(paginaDe(alumnos(20), 81, 5))

    montar('STAFF')
    await screen.findByText('Apellido1, Nombre1')

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() =>
      expect(vi.mocked(listarAlumnos).mock.lastCall?.[0]).toMatchObject({ pagina: 1 }),
    )

    await elegir(user, 'Filtrar por disciplina', 'DJ')

    await waitFor(() =>
      expect(vi.mocked(listarAlumnos).mock.lastCall?.[0]).toMatchObject({
        disciplina: 'DJ',
        pagina: 0,
      }),
    )
  })
})

describe('estados vacíos y de error', () => {
  it('sin alumnos y sin búsqueda lo dice con las palabras correctas', async () => {
    vi.mocked(listarAlumnos).mockResolvedValue(paginaDe([], 0, 0))

    montar('STAFF')

    expect(await screen.findByText('Todavía no hay alumnos cargados.')).toBeDefined()
  })

  it('si el backend falla se muestra el mensaje y no una tabla en blanco', async () => {
    const { ApiError } = await import('../api/cliente')
    vi.mocked(listarAlumnos).mockRejectedValue(new ApiError(500, 'La base no responde.'))

    montar('STAFF')

    expect(await screen.findByText('La base no responde.')).toBeDefined()
  })
})
