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
 *
 * Y desde el 2026-09-12, **lo mismo que Equipo**: buscar, editar a la persona,
 * resetear la contraseña —con el WhatsApp que dice que vence— y desactivar la
 * cuenta. Lo que fijan esos casos es que las acciones de cuenta van a la cuenta
 * (`idUsuario`) y no al profesor, y que editar manda cada pedido sólo si lo suyo
 * cambió.
 */

vi.mock('../api/administracion', () => ({
  listarProfesores: vi.fn(),
  altaProfesor: vi.fn(),
  editarProfesor: vi.fn(),
  editarUsuario: vi.fn(),
  listarUsuarios: vi.fn(),
  resetearPasswordUsuario: vi.fn(),
  cambiarActivoUsuario: vi.fn(),
}))

const {
  listarProfesores,
  altaProfesor,
  editarProfesor,
  editarUsuario,
  listarUsuarios,
  resetearPasswordUsuario,
  cambiarActivoUsuario,
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

function profesor(extra: Partial<ProfesorResumen> = {}): ProfesorResumen {
  return {
    idProfesor: 7,
    idUsuario: 70,
    nombre: 'Ghezz',
    apellido: 'Prueba',
    nombreCompleto: 'Ghezz Prueba',
    email: 'ghezz@lajuanita.local',
    telefono: '11 5555-5555',
    especialidad: 'DJ',
    activo: true,
    cuentaActiva: true,
    debeCambiarPassword: false,
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
    expect(screen.queryByRole('button', { name: 'Resetear contraseña' })).toBeNull()
    expect(screen.queryByRole('button', { name: /cuenta$/ })).toBeNull()
  })

  it('la fila dice las dos cosas: si da clases y si la cuenta entra', async () => {
    vi.mocked(listarProfesores).mockResolvedValue([
      profesor({ activo: false, cuentaActiva: false, debeCambiarPassword: true }),
    ])
    montar()

    const fila = (await screen.findByText('Prueba, Ghezz')).closest('tr')!
    expect(within(fila).getByText('De baja')).toBeDefined()
    expect(within(fila).getByText('· cuenta desactivada')).toBeDefined()
    expect(within(fila).getByText('· contraseña sin cambiar')).toBeDefined()
    expect(within(fila).getByText('11 5555-5555')).toBeDefined()
    expect(within(fila).getByRole('button', { name: 'Reactivar cuenta' })).toBeDefined()
  })

  it('busca por nombre, email o especialidad, sin acentos, y lo dice cuando nadie coincide', async () => {
    vi.mocked(listarProfesores).mockResolvedValue([
      profesor(),
      profesor({ idProfesor: 8, idUsuario: 80, nombre: 'Lucas', apellido: 'Ferreyra', email: 'lucas@x.com', especialidad: 'Producción' }),
    ])
    montar()
    await screen.findByText('Ferreyra, Lucas')

    const busqueda = screen.getByPlaceholderText(/Buscar por nombre/)
    await userEvent.type(busqueda, 'produccion')
    expect(screen.queryByText('Prueba, Ghezz')).toBeNull()
    expect(screen.getByText('Ferreyra, Lucas')).toBeDefined()

    await userEvent.clear(busqueda)
    await userEvent.type(busqueda, 'nadie')
    expect(screen.getByText('No hay profesores que coincidan con la búsqueda.')).toBeDefined()
    // Sin pedirle nada nuevo al servidor: la lista ya está entera acá.
    expect(listarProfesores).toHaveBeenCalledTimes(1)
  })
})

describe('las acciones sobre la cuenta, iguales a las de Equipo', () => {
  it('resetear la contraseña la muestra una vez, con el WhatsApp que dice que vence', async () => {
    vi.mocked(resetearPasswordUsuario).mockResolvedValue({
      usuario: {
        id: 70, nombre: 'Ghezz', apellido: 'Prueba', email: 'ghezz@lajuanita.local',
        telefono: '11 5555-5555', rol: 'STAFF', activo: true, debeCambiarPassword: true,
        esAlumno: false, esProfesor: true,
      },
      passwordTemporal: 'clave-reseteada-9',
    })
    montar()
    await screen.findByText('Prueba, Ghezz')

    await userEvent.click(screen.getByRole('button', { name: 'Resetear contraseña' }))

    // A la cuenta, no al profesor: son ids distintos y el 7 sería otra persona.
    expect(resetearPasswordUsuario).toHaveBeenCalledWith(70)
    expect(await screen.findByText('clave-reseteada-9')).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Contraseña nueva de Ghezz Prueba' })).toBeDefined()

    const link = screen.getByRole('link', { name: 'Mandarle la clave por WhatsApp' })
    const href = link.getAttribute('href')!
    expect(href.startsWith('https://wa.me/5491155555555?text=')).toBe(true)
    const texto = decodeURIComponent(href.split('text=')[1])
    expect(texto).toContain('clave-reseteada-9')
    expect(texto).toContain('ghezz@lajuanita.local')
    expect(texto).toContain('vence')
    expect(texto).toContain('7 días')
  })

  it('sin teléfono legible no ofrece el link y lo dice', async () => {
    vi.mocked(resetearPasswordUsuario).mockResolvedValue({
      usuario: {
        id: 70, nombre: 'Ghezz', apellido: 'Prueba', email: 'ghezz@lajuanita.local',
        telefono: null, rol: 'STAFF', activo: true, debeCambiarPassword: true,
        esAlumno: false, esProfesor: true,
      },
      passwordTemporal: 'clave-reseteada-9',
    })
    montar()
    await screen.findByText('Prueba, Ghezz')

    await userEvent.click(screen.getByRole('button', { name: 'Resetear contraseña' }))

    expect(await screen.findByText('clave-reseteada-9')).toBeDefined()
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull()
    expect(screen.getByText(/No tiene teléfono cargado/)).toBeDefined()
  })

  it('desactivar la cuenta va a la cuenta, y recarga', async () => {
    vi.mocked(cambiarActivoUsuario).mockResolvedValue({} as never)
    montar()
    await screen.findByText('Prueba, Ghezz')

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar cuenta' }))
    expect(cambiarActivoUsuario).toHaveBeenCalledWith(70, false)
    await waitFor(() => expect(listarProfesores).toHaveBeenCalledTimes(2))
  })

  it('sobre mi propia fila no hay "Desactivar cuenta"', async () => {
    // El que mira (id 1) es también el profesor de la fila.
    vi.mocked(listarProfesores).mockResolvedValue([profesor({ idUsuario: 1 })])
    montar()

    const fila = (await screen.findByText('Prueba, Ghezz')).closest('tr')!
    expect(within(fila).getByText('(vos)')).toBeDefined()
    expect(within(fila).queryByRole('button', { name: /cuenta$/ })).toBeNull()
    expect(within(fila).getByRole('button', { name: 'Resetear contraseña' })).toBeDefined()
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
    expect(screen.getByRole('heading', { name: 'Profesor creado' })).toBeDefined()
    expect(screen.getByText(/Mi agenda/)).toBeDefined()
    // Con teléfono (el del fixture), el WhatsApp con el mensaje de profe.
    const href = screen.getByRole('link', { name: 'Mandarle la clave por WhatsApp' }).getAttribute('href')!
    expect(decodeURIComponent(href)).toContain('cuenta de profe')
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
    expect(editarUsuario).not.toHaveBeenCalled()
  })

  it('corregir el teléfono va a la cuenta, y no toca la relación', async () => {
    vi.mocked(editarUsuario).mockResolvedValue({} as never)
    montar()
    await screen.findByText('Prueba, Ghezz')

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    const telefono = screen.getByLabelText(/^Teléfono/)
    await userEvent.clear(telefono)
    await userEvent.type(telefono, '11 6666-6666')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(editarUsuario).toHaveBeenCalledWith(70, {
      nombre: 'Ghezz',
      apellido: 'Prueba',
      email: 'ghezz@lajuanita.local',
      telefono: '11 6666-6666',
    })
    expect(editarProfesor).not.toHaveBeenCalled()
    await waitFor(() => expect(listarProfesores).toHaveBeenCalledTimes(2))
  })
})
