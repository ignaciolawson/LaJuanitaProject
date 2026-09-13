import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ClienteResumen } from '../api/tiposAdmin'
import { ClientesPagina } from './ClientesPagina'

/**
 * Clientes (P77 · 3): quien gastó plata y no es alumno, profe ni equipo.
 *
 * La definición vive en el backend; lo que la pantalla decide es cómo se lee
 * cada fila —con cuenta lleva al estado de cuenta, sin cuenta se marca— y qué
 * dice cuando no hay nadie.
 */

vi.mock('../api/administracion', () => ({
  listarClientes: vi.fn(),
}))

const { listarClientes } = await import('../api/administracion')

function cliente(extra: Partial<ClienteResumen>): ClienteResumen {
  return {
    idUsuario: 30,
    nombre: 'Camila',
    apellido: 'Ríos',
    email: 'cami@ejemplo.com',
    telefono: '11-5555-1111',
    contacto: null,
    pagos: 2,
    primeraCompra: '2026-03-01',
    ultimaCompra: '2026-09-10',
    lineas: ['ALQUILER_CABINA', 'VENTA_EQUIPOS'],
    ...extra,
  }
}

function montar() {
  return render(
    <MemoryRouter>
      <ClientesPagina />
    </MemoryRouter>,
  )
}

function pagina(contenido: ClienteResumen[]) {
  return { contenido, pagina: 0, tamanio: 20, totalElementos: contenido.length, totalPaginas: 1 }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('cada fila', () => {
  it('con cuenta, el nombre lleva al estado de cuenta y dice qué compró', async () => {
    vi.mocked(listarClientes).mockResolvedValue(pagina([cliente({})]))
    montar()

    const link = await screen.findByRole('link', { name: 'Ríos, Camila' })
    expect(link.getAttribute('href')).toBe('/admin/estado-de-cuenta/30')

    const fila = link.closest('tr')!
    expect(within(fila).getByText('Alquiler de cabina · Venta de equipos')).toBeDefined()
    expect(within(fila).getByText('2')).toBeDefined()
    expect(within(fila).getByText('10/09/2026')).toBeDefined()
  })

  it('sin cuenta se marca, no hay link, y el contacto es el que se anotó al cobrar', async () => {
    vi.mocked(listarClientes).mockResolvedValue(
      pagina([
        cliente({
          idUsuario: null,
          nombre: 'Hugo Externo',
          apellido: null,
          email: null,
          telefono: null,
          contacto: '11-4444-0000',
          lineas: ['VENTA_EQUIPOS'],
        }),
      ]),
    )
    montar()

    const fila = (await screen.findByText('Hugo Externo')).closest('tr')!
    expect(within(fila).getByText('sin cuenta')).toBeDefined()
    expect(within(fila).queryByRole('link')).toBeNull()
    expect(within(fila).getByText('11-4444-0000')).toBeDefined()
  })
})

describe('lo que dice la pantalla', () => {
  it('la aclaración avisa que los sin cuenta se agrupan por nombre', async () => {
    vi.mocked(listarClientes).mockResolvedValue(pagina([]))
    montar()

    expect(await screen.findByText(/se lo agrupa por ese nombre/)).toBeDefined()
  })

  it('sin clientes lo dice con palabras, y no como una tabla en blanco', async () => {
    vi.mocked(listarClientes).mockResolvedValue(pagina([]))
    montar()

    expect(await screen.findByText(/Todavía nadie le pagó al estudio/)).toBeDefined()
  })

  it('no hay botón de alta: un cliente se vuelve cliente pagando', async () => {
    vi.mocked(listarClientes).mockResolvedValue(pagina([cliente({})]))
    montar()

    await screen.findByText('Ríos, Camila')
    expect(screen.queryByRole('button', { name: /nuev/i })).toBeNull()
  })
})
