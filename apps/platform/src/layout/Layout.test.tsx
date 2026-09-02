import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Rol, UsuarioActual } from '../api/tipos'
import { Layout } from './Layout'

/**
 * Los contadores del sidebar (`mejoras.md` §13 · B1).
 *
 * Lo que cuidan estos casos no es el dibujo sino las tres decisiones que se
 * pueden deshacer sin que nada falle: que un cero no se dibuje, que un contador
 * que no llegó tampoco, y que a quien no administra **no se le pida** el endpoint
 * de las bandejas — que le contestaría 403.
 */

vi.mock('../api/administracion', () => ({ pendientes: vi.fn() }))
vi.mock('../api/portal', () => ({ notificacionesSinLeer: vi.fn() }))
vi.mock('../auth/contexto', () => ({ useAuth: vi.fn(), useUsuario: vi.fn() }))

const { pendientes } = await import('../api/administracion')
const { notificacionesSinLeer } = await import('../api/portal')
const { useAuth, useUsuario } = await import('../auth/contexto')

function usuario(rol: Rol): UsuarioActual {
  return {
    id: 1,
    nombre: 'Micaela',
    apellido: 'Prueba',
    email: 'micaela@lajuanita.local',
    telefono: null,
    rol,
    fotoPerfil: null,
    esAlumno: false,
    esProfesor: false,
    debeCambiarPassword: false,
  }
}

function montar(rol: Rol = 'ADMIN') {
  vi.mocked(useUsuario).mockReturnValue(usuario(rol))
  return render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>,
  )
}

/** El ítem del menú con esa etiqueta, para poder mirar lo que tiene al lado. */
function item(etiqueta: string): HTMLElement {
  return screen.getByRole('link', { name: new RegExp(etiqueta) })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuth).mockReturnValue({
    cerrarSesion: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>)
  vi.mocked(notificacionesSinLeer).mockResolvedValue(0)
  vi.mocked(pendientes).mockResolvedValue({
    pedidosDeSala: 0,
    pedidosDeCambio: 0,
    buzon: 0,
  })
})

describe('los contadores del menú', () => {
  it('muestra el número al lado de cada bandeja que tiene algo esperando', async () => {
    vi.mocked(notificacionesSinLeer).mockResolvedValue(1)
    vi.mocked(pendientes).mockResolvedValue({
      pedidosDeSala: 3,
      pedidosDeCambio: 2,
      buzon: 5,
    })
    montar('ADMIN')

    expect(await screen.findByLabelText('1 sin resolver')).toBeTruthy()
    expect(item('Notificaciones').textContent).toContain('1')
    expect(item('Pedidos de sala').textContent).toContain('3')
    expect(item('Pedidos de cambio').textContent).toContain('2')
    expect(item('Buzón de la web').textContent).toContain('5')
  })

  it('no dibuja nada cuando el contador está en cero', async () => {
    // Un `(0)` fijo en cuatro ítems de las 36 pantallas es ruido permanente, y
    // además entrena a no mirar el lugar donde después aparece el número que sí
    // importa. La ausencia de pastilla ya dice que no hay nada.
    vi.mocked(notificacionesSinLeer).mockResolvedValue(4)
    montar('ADMIN')

    await screen.findByLabelText('4 sin resolver')
    expect(item('Pedidos de sala').textContent).toBe('Pedidos de sala')
    expect(item('Buzón de la web').textContent).toBe('Buzón de la web')
  })

  it('un contador que no se pudo traer deja el ítem como estaba, sin romper el menú', async () => {
    // El menú está en las 36 pantallas: si un contador caído lo rompiera, un
    // endpoint muerto dejaría a todo el mundo sin navegación. Mismo criterio que
    // el Inicio, donde un bloque caído no vacía la pantalla.
    vi.mocked(pendientes).mockRejectedValue(new Error('se cayó'))
    vi.mocked(notificacionesSinLeer).mockResolvedValue(2)
    montar('ADMIN')

    expect(await screen.findByLabelText('2 sin resolver')).toBeTruthy()
    expect(item('Pedidos de sala').textContent).toBe('Pedidos de sala')
    expect(item('Calendario')).toBeTruthy()
  })

  it('a quien no administra no se le pide el endpoint de las bandejas', async () => {
    // Le contestaría 403. Es la misma cosmética honesta que `puedeOperar` hace
    // con los botones: no se ofrece —ni se pide— lo que va a ser rechazado.
    montar('USUARIO')

    await waitFor(() => expect(notificacionesSinLeer).toHaveBeenCalled())
    expect(pendientes).not.toHaveBeenCalled()
  })

  it('a quien administra sí se le piden las dos cosas', async () => {
    montar('DIRECTIVO')

    await waitFor(() => expect(pendientes).toHaveBeenCalled())
    expect(notificacionesSinLeer).toHaveBeenCalled()
  })
})
