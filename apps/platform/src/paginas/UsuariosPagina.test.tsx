import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsuarioActual } from '../api/tipos'
import type { GrupoDeCuentas, UsuarioResumen } from '../api/tiposAdmin'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { UsuariosPagina } from './UsuariosPagina'

/**
 * El Directorio y el Equipo (P77 · 2 y 4): la misma pantalla con otro grupo.
 *
 * Lo que fijan estos casos: que el grupo lo filtra **el servidor** (la
 * pantalla lo pide, no lo recorta), que cada fila dice las dos cosas que una
 * persona es —rol y relaciones—, y que el alta en Equipo sólo se le ofrece a
 * quien puede dar un rol.
 */

vi.mock('../api/administracion', () => ({
  listarUsuarios: vi.fn(),
  altaUsuario: vi.fn(),
  editarUsuario: vi.fn(),
  cambiarActivoUsuario: vi.fn(),
  resetearPasswordUsuario: vi.fn(),
}))

const { listarUsuarios } = await import('../api/administracion')

function yo(rol: UsuarioActual['rol']): UsuarioActual {
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

function cuenta(extra: Partial<UsuarioResumen>): UsuarioResumen {
  return {
    id: 50,
    nombre: 'Nico',
    apellido: 'Arce',
    email: 'nico@ejemplo.com',
    telefono: null,
    rol: 'USUARIO',
    activo: true,
    debeCambiarPassword: false,
    esAlumno: false,
    esProfesor: false,
    ...extra,
  }
}

function montar(rol: UsuarioActual['rol'] = 'STAFF', grupo?: GrupoDeCuentas) {
  const contexto: ContextoAuth = {
    sesion: { estado: 'autenticado', usuario: yo(rol) },
    iniciarSesion: async () => {},
    registrarse: async () => {},
    cerrarSesion: () => {},
    refrescarUsuario: async () => {},
  }
  return render(
    <MemoryRouter>
      <AuthContext value={contexto}>
        <UsuariosPagina grupo={grupo} />
      </AuthContext>
    </MemoryRouter>,
  )
}

function pagina(contenido: UsuarioResumen[]) {
  return { contenido, pagina: 0, tamanio: 20, totalElementos: contenido.length, totalPaginas: 1 }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('el Directorio', () => {
  it('cada fila dice el rol y las relaciones, que son dos ejes', async () => {
    vi.mocked(listarUsuarios).mockResolvedValue(
      pagina([
        cuenta({ id: 11, nombre: 'Ghezz', apellido: 'Prueba', rol: 'STAFF', esProfesor: true }),
        cuenta({ id: 2, nombre: 'Cami', apellido: 'Ríos', esAlumno: true, esProfesor: true }),
        cuenta({ id: 3, nombre: 'Solo', apellido: 'Cuenta' }),
      ]),
    )
    montar()

    expect(await screen.findByRole('heading', { name: 'Directorio' })).toBeDefined()

    const ghezz = (await screen.findByText('Prueba, Ghezz')).closest('tr')!
    expect(within(ghezz).getByText('Staff')).toBeDefined()
    expect(within(ghezz).getByText('Profesor')).toBeDefined()

    const cami = screen.getByText('Ríos, Cami').closest('tr')!
    expect(within(cami).getByText('Alumno · Profesor')).toBeDefined()

    // Sólo tiene cuenta: no es "nada", es alguien que alquiló o se registró.
    const solo = screen.getByText('Cuenta, Solo').closest('tr')!
    expect(within(solo).getByText('—')).toBeDefined()
  })

  it('ya no ofrece "Hacer profesor": la relación se da en Profesores', async () => {
    vi.mocked(listarUsuarios).mockResolvedValue(pagina([cuenta({})]))
    montar()

    await screen.findByText('Arce, Nico')
    expect(screen.queryByRole('button', { name: /profesor/i })).toBeNull()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeDefined()
  })

  it('pide el Directorio entero sin grupo', async () => {
    vi.mocked(listarUsuarios).mockResolvedValue(pagina([]))
    montar()

    await waitFor(() => expect(listarUsuarios).toHaveBeenCalled())
    expect(vi.mocked(listarUsuarios).mock.lastCall?.[0]).toMatchObject({ grupo: 'TODOS' })
  })
})

describe('el Equipo', () => {
  it('le pide al servidor el grupo EQUIPO y se titula así', async () => {
    vi.mocked(listarUsuarios).mockResolvedValue(pagina([cuenta({ rol: 'ADMIN' })]))
    montar('STAFF', 'EQUIPO')

    expect(await screen.findByRole('heading', { name: 'Equipo' })).toBeDefined()
    await waitFor(() => expect(listarUsuarios).toHaveBeenCalled())
    expect(vi.mocked(listarUsuarios).mock.lastCall?.[0]).toMatchObject({ grupo: 'EQUIPO' })
  })

  it('el alta en Equipo sólo se le ofrece al ADMIN, que es quien puede dar un rol', async () => {
    vi.mocked(listarUsuarios).mockResolvedValue(pagina([cuenta({ rol: 'ADMIN' })]))

    const { unmount } = montar('STAFF', 'EQUIPO')
    await screen.findByText('Arce, Nico')
    expect(screen.queryByRole('button', { name: 'Nueva cuenta' })).toBeNull()
    unmount()

    montar('ADMIN', 'EQUIPO')
    await screen.findByText('Arce, Nico')
    expect(screen.getByRole('button', { name: 'Nueva cuenta' })).toBeDefined()
  })
})
