import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsuarioActual } from '../api/tipos'
import type { ProfesorResumen } from '../api/tiposAdmin'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { ProfesoresPagina } from './ProfesoresPagina'

/**
 * Profesores con pantalla propia (P77 · 1).
 *
 * Hasta la §19 esta relación se otorgaba con *"Hacer profesor"*, un botón en la
 * fila del listado de cuentas. Lo que estos casos fijan es que ahora hay un
 * índice con el molde de Alumnos: alta con los dos caminos, la baja que no
 * borra, y el default que esconde a quien ya no da clases.
 */

vi.mock('../api/administracion', () => ({
  listarProfesores: vi.fn(),
  altaProfesor: vi.fn(),
  editarProfesor: vi.fn(),
  listarUsuarios: vi.fn(),
}))

const { listarProfesores, altaProfesor, editarProfesor, listarUsuarios } = await import(
  '../api/administracion'
)

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

function profesor(extra: Partial<ProfesorResumen> = {}): ProfesorResumen {
  return {
    idProfesor: 7,
    idUsuario: 70,
    nombre: 'Ghezz',
    apellido: 'Prueba',
    nombreCompleto: 'Ghezz Prueba',
    email: 'ghezz@lajuanita.local',
    especialidad: 'DJ',
    activo: true,
    ...extra,
  }
}

function montar(rol: UsuarioActual['rol'] = 'STAFF') {
  const contexto: ContextoAuth = {
    sesion: { estado: 'autenticado', usuario: usuario(rol) },
    iniciarSesion: async () => {},
    registrarse: async () => {},
    cerrarSesion: () => {},
    refrescarUsuario: async () => {},
  }
  return render(
    <MemoryRouter>
      <AuthContext value={contexto}>
        <ProfesoresPagina />
      </AuthContext>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarProfesores).mockResolvedValue([profesor()])
})

describe('el listado', () => {
  it('por defecto pide sólo a quienes dan clases, y con la casilla pide a todos', async () => {
    montar()

    await screen.findByText('Prueba, Ghezz')
    expect(listarProfesores).toHaveBeenLastCalledWith(false)

    await userEvent.click(screen.getByLabelText(/ya no dan clases/))
    await waitFor(() => expect(listarProfesores).toHaveBeenLastCalledWith(true))
  })

  it('un profesor de baja lo dice, y no desaparece', async () => {
    vi.mocked(listarProfesores).mockResolvedValue([profesor({ activo: false })])
    montar()

    const fila = (await screen.findByText('Prueba, Ghezz')).closest('tr')!
    expect(within(fila).getByText('De baja')).toBeDefined()
  })

  it('un DIRECTIVO ve el listado y ningún botón de escritura', async () => {
    montar('DIRECTIVO')

    await screen.findByText('Prueba, Ghezz')
    expect(screen.queryByRole('button', { name: 'Nuevo profesor' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
  })
})

describe('el alta, con los dos caminos', () => {
  it('con cuenta nueva manda usuarioNuevo y muestra la contraseña una vez', async () => {
    vi.mocked(altaProfesor).mockResolvedValue({
      profesor: profesor({ idProfesor: 8, nombre: 'Lucas', apellido: 'Ferreyra' }),
      passwordTemporal: 'clave-temporal-1',
    })
    montar()
    await screen.findByText('Prueba, Ghezz')

    await userEvent.click(screen.getByRole('button', { name: 'Nuevo profesor' }))
    await userEvent.type(screen.getByLabelText(/^Nombre/), 'Lucas')
    await userEvent.type(screen.getByLabelText(/^Apellido/), 'Ferreyra')
    await userEvent.type(screen.getByLabelText(/^Email/), 'lucas@ejemplo.com')
    await userEvent.type(screen.getByLabelText(/^Especialidad/), 'Ableton')
    await userEvent.click(screen.getByRole('button', { name: 'Crear profesor' }))

    expect(altaProfesor).toHaveBeenCalledWith({
      usuarioNuevo: { nombre: 'Lucas', apellido: 'Ferreyra', email: 'lucas@ejemplo.com', telefono: undefined },
      especialidad: 'Ableton',
    })
    expect(await screen.findByText('clave-temporal-1')).toBeDefined()
  })

  it('con cuenta existente elige a la persona, manda idUsuario y no muestra contraseña', async () => {
    vi.mocked(listarUsuarios).mockResolvedValue({
      contenido: [
        {
          id: 41, nombre: 'Nico', apellido: 'Arce', email: 'nico@ejemplo.com', telefono: null,
          rol: 'USUARIO', activo: true, debeCambiarPassword: false, esAlumno: false, esProfesor: false,
        },
      ],
      pagina: 0, tamanio: 20, totalElementos: 1, totalPaginas: 1,
    })
    vi.mocked(altaProfesor).mockResolvedValue({
      profesor: profesor({ idProfesor: 9, idUsuario: 41, nombre: 'Nico', apellido: 'Arce' }),
      passwordTemporal: null,
    })
    montar()
    await screen.findByText('Prueba, Ghezz')

    await userEvent.click(screen.getByRole('button', { name: 'Nuevo profesor' }))
    await userEvent.click(screen.getByLabelText('Sí, ya se registró'))
    await userEvent.type(screen.getByLabelText(/^Buscar a la persona/), 'Nico')
    await userEvent.click(await screen.findByRole('button', { name: /Nico Arce/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Hacer profesor' }))

    expect(altaProfesor).toHaveBeenCalledWith({ idUsuario: 41, especialidad: undefined })
    // Sin cuenta nueva no hay contraseña: el formulario se cierra y la lista se recarga.
    await waitFor(() => expect(listarProfesores).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('Profesor creado')).toBeNull()
  })
})

describe('la edición', () => {
  it('dar de baja manda activo=false y nada más se toca', async () => {
    vi.mocked(editarProfesor).mockResolvedValue(profesor({ activo: false }))
    montar()
    await screen.findByText('Prueba, Ghezz')

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    await userEvent.click(screen.getByLabelText(/Sigue dando clases/))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(editarProfesor).toHaveBeenCalledWith(7, { especialidad: 'DJ', activo: false })
  })
})
