import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { UsuarioActual } from '../api/tipos'
import type { AlumnoResumen } from '../api/tiposAdmin'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { AlumnosPagina } from './AlumnosPagina'

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

  return render(
    <AuthContext value={contexto}>
      <AlumnosPagina />
    </AuthContext>,
  )
}

/** Una página del backend: 20 filas de un total de 81. */
function paginaDe(contenido: AlumnoResumen[], totalElementos: number, totalPaginas: number) {
  return { contenido, pagina: 0, tamanio: 20, totalElementos, totalPaginas }
}

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
