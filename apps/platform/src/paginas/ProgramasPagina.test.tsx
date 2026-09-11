import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsuarioActual } from '../api/tipos'
import type { ProgramaResumen } from '../api/tiposAdmin'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { ProgramasPagina } from './ProgramasPagina'

/**
 * El catálogo de programas (`V28`, §16 · C1, P63 — cierra P13).
 *
 * Lo que los casos sostienen:
 *
 * 1. **"A confirmar" es un dato, no un hueco.** La mentoría nace sin precio y
 *    la pantalla lo dice así — no dibuja $0, que sería una beca.
 * 2. **Un precio vacío viaja como `null`.** Borrar el precio tiene que poder
 *    decirse; si el formulario mandara 0 o se lo comiera, "a confirmar" no se
 *    podría volver a poner nunca.
 * 3. **Un paquete sin clases no se manda.** El backend lo rechaza igual (`V28`
 *    §2); acá se dice antes, sobre el campo.
 * 4. **Un DIRECTIVO lee y no tiene botones**, como en todo lo administrativo.
 */

vi.mock('../api/administracion', () => ({
  listarProgramas: vi.fn(),
  editarPrograma: vi.fn(),
}))

const { listarProgramas, editarPrograma } = await import('../api/administracion')

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

function programa(cambios: Partial<ProgramaResumen> = {}): ProgramaResumen {
  return {
    idPrograma: 1,
    disciplina: 'DJ',
    nombre: 'Convertite en DJ',
    descripcion: null,
    precio: 170000,
    moneda: 'ARS',
    cobro: 'PAQUETE',
    clasesEstandar: 8,
    duracionMinutos: 90,
    activo: true,
    ...cambios,
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
    <AuthContext value={contexto}>
      <ProgramasPagina />
    </AuthContext>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listarProgramas).mockResolvedValue([
    programa(),
    programa({ idPrograma: 2, disciplina: 'PRODUCCION', nombre: 'Producción Musical Electrónica', precio: 440000, clasesEstandar: 16 }),
    programa({ idPrograma: 3, disciplina: 'MENTORIA', nombre: 'Mentoría para DJs', precio: null, cobro: 'SESION', clasesEstandar: null }),
  ])
})

describe('el catálogo', () => {
  it('muestra las tres filas con su precio, y "a confirmar" donde no hay', async () => {
    montar()

    expect(await screen.findByText('Convertite en DJ')).toBeDefined()
    expect(screen.getByText('Mentoría para DJs')).toBeDefined()
    expect(screen.getByText('A confirmar')).toBeDefined()
    expect(screen.getByText('a medida')).toBeDefined()
    // Sin precio no se dibuja un cero: cero es una beca.
    expect(screen.queryByText(/\$\s?0[,.]00/)).toBeNull()
  })

  it('un programa desactivado lo dice', async () => {
    vi.mocked(listarProgramas).mockResolvedValue([programa({ activo: false })])
    montar()

    expect(await screen.findByText('Desactivado')).toBeDefined()
  })

  it('un DIRECTIVO lee y no tiene botones', async () => {
    montar('DIRECTIVO')

    await screen.findByText('Convertite en DJ')
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
    expect(screen.getByText(/solo lectura/)).toBeDefined()
  })
})

describe('editar', () => {
  it('manda la fila entera, con el precio nuevo', async () => {
    const user = userEvent.setup()
    vi.mocked(editarPrograma).mockResolvedValue(programa({ precio: 200000 }))
    montar()

    await screen.findByText('Convertite en DJ')
    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0])
    const precio = screen.getByLabelText(/Precio del paquete/)
    await user.clear(precio)
    await user.type(precio, '200000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(editarPrograma).toHaveBeenCalled())
    expect(vi.mocked(editarPrograma).mock.calls[0]).toEqual([
      1,
      {
        nombre: 'Convertite en DJ',
        descripcion: null,
        precio: 200000,
        moneda: 'ARS',
        cobro: 'PAQUETE',
        clasesEstandar: 8,
        duracionMinutos: 90,
        activo: true,
      },
    ])
  })

  /**
   * **Un precio vacío viaja como `null`**, que es "todavía no hay". Si el
   * formulario lo convirtiera en 0 o lo omitiera, "a confirmar" no se podría
   * volver a poner después de haber cargado un número.
   */
  it('borrar el precio lo manda como null, no como cero', async () => {
    const user = userEvent.setup()
    vi.mocked(editarPrograma).mockResolvedValue(programa({ precio: null }))
    montar()

    await screen.findByText('Convertite en DJ')
    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0])
    await user.clear(screen.getByLabelText(/Precio del paquete/))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(editarPrograma).toHaveBeenCalled())
    expect(vi.mocked(editarPrograma).mock.calls[0][1]).toMatchObject({ precio: null })
  })

  /** Un paquete sin cantidad de clases no es un precio (`V28` §2). */
  it('un paquete sin clases no se manda y lo dice sobre el campo', async () => {
    const user = userEvent.setup()
    montar()

    await screen.findByText('Convertite en DJ')
    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0])
    await user.clear(screen.getByLabelText(/Clases estándar/))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText(/por paquete tiene que decir de cuántas clases/)).toBeDefined()
    expect(editarPrograma).not.toHaveBeenCalled()
  })

  it('por sesión sí se puede guardar sin clases estándar', async () => {
    const user = userEvent.setup()
    vi.mocked(editarPrograma).mockResolvedValue(programa({ idPrograma: 3, precio: 45000 }))
    montar()

    await screen.findByText('Mentoría para DJs')
    await user.click(screen.getAllByRole('button', { name: 'Editar' })[2])
    await user.type(screen.getByLabelText(/Precio por sesión/), '45000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(editarPrograma).toHaveBeenCalled())
    expect(vi.mocked(editarPrograma).mock.calls[0][1]).toMatchObject({
      cobro: 'SESION',
      precio: 45000,
      clasesEstandar: null,
    })
  })
})
