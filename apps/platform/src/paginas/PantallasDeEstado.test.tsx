import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { NoEncontradaPagina } from './NoEncontradaPagina'
import { SinPermisoPagina } from './SinPermisoPagina'

/**
 * El 404 y el 403 del panel (2026-10-18). Hasta entonces los dos eran un salto
 * silencioso al Inicio, que se leía como "el link me llevó a cualquier lado".
 *
 * Lo que se fija acá no es el chiste —que puede cambiar— sino que **cada
 * pantalla diga qué pasó en palabras llanas** y ofrezca la salida. El titular
 * gracioso acompaña a la explicación; nunca la reemplaza.
 */

function montar(pantalla: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/cualquier-cosa']}>
      <Routes>
        <Route path="/" element={<p>El inicio</p>} />
        <Route path="*" element={pantalla} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('404', () => {
  it('dice que la dirección no existe y lleva al inicio', async () => {
    montar(<NoEncontradaPagina />)

    expect(screen.getByRole('heading', { name: /no está en la crate/ })).toBeDefined()
    expect(screen.getByText(/La dirección que abriste no existe en el sistema/)).toBeDefined()

    await userEvent.click(screen.getByRole('button', { name: 'Volver al inicio' }))
    expect(screen.getByText('El inicio')).toBeDefined()
  })
})

describe('403', () => {
  it('administración: dice que la cuenta no tiene acceso', () => {
    montar(<SinPermisoPagina para="administracion" />)

    expect(screen.getByRole('heading', { name: /no estás ni en el line-up/ })).toBeDefined()
    expect(screen.getByText(/Tu cuenta no tiene acceso a esta sección/)).toBeDefined()
  })

  it('profesores: dice que es para quienes dan clases y cómo pedirlo', () => {
    montar(<SinPermisoPagina para="profesores" />)

    expect(screen.getByText(/para quienes dan clases en el estudio/)).toBeDefined()
    expect(screen.getByText(/dé de alta como profesor/)).toBeDefined()
  })
})
