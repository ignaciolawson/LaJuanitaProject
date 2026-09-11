import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LimiteDeError } from './LimiteDeError'

/**
 * El límite de error (`mejoras.md` §16 · A6).
 *
 * Lo que cuidan estos casos es lo que no existía: que un throw de render **se
 * vea como un error y no como una pantalla negra**, que diga qué se rompió y
 * dónde —para que el reporte sirva—, y que tenga una salida. Antes de esto un
 * `null` en una fecha desmontaba la aplicación entera.
 */

/** Una pantalla que tira al dibujarse, como hacía el buzón con `fecha(null)`. */
function Rota(): never {
  throw new TypeError("Cannot read properties of null (reading 'slice')")
}

/**
 * Tira mientras `rota` esté en `true`: lo que "Intentar de nuevo" necesita.
 *
 * ⚠️ No es un contador de intentos a propósito. React, ante un throw en un
 * render concurrente, **reintenta el árbol entero de forma síncrona antes de
 * entregárselo al límite**; con "tira la primera vez" el reintento ya andaba,
 * el límite nunca se enteraba y el caso fallaba buscando un alerta que no hubo.
 */
let rota = true
function RotaMientras() {
  if (rota) throw new Error('mientras esté rota')
  return <p>Ahora anduvo</p>
}

beforeEach(() => {
  rota = true
  // React loguea el error atrapado igual, y acá es esperado: sin esto cada caso
  // imprime un stack que tapa el resultado de la suite.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('el límite de una pantalla', () => {
  it('muestra el error con su mensaje y el path, en vez de una pantalla en negro', () => {
    render(
      <MemoryRouter initialEntries={['/admin/buzon']}>
        <LimiteDeError alcance="pantalla">
          <Rota />
        </LimiteDeError>
      </MemoryRouter>,
    )

    const alerta = screen.getByRole('alert')
    expect(alerta.textContent).toContain('Esta pantalla se rompió')
    expect(alerta.textContent).toContain('/admin/buzon')
    expect(alerta.textContent).toContain(
      "TypeError: Cannot read properties of null (reading 'slice')",
    )
  })

  it('no se lleva puesto lo que está afuera', () => {
    render(
      <MemoryRouter>
        <nav>El sidebar</nav>
        <LimiteDeError alcance="pantalla">
          <Rota />
        </LimiteDeError>
      </MemoryRouter>,
    )

    expect(screen.getByText('El sidebar')).toBeDefined()
    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('"Intentar de nuevo" vuelve a montar la pantalla', async () => {
    render(
      <MemoryRouter>
        <LimiteDeError alcance="pantalla">
          <RotaMientras />
        </LimiteDeError>
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toBeDefined()
    rota = false
    await userEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }))

    expect(screen.getByText('Ahora anduvo')).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('"Volver al inicio" navega y deja la pantalla rota atrás', async () => {
    render(
      <MemoryRouter initialEntries={['/rota']}>
        <Routes>
          <Route
            path="/"
            element={<p>El inicio</p>}
          />
          <Route
            path="/rota"
            element={
              <LimiteDeError alcance="pantalla">
                <Rota />
              </LimiteDeError>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Volver al inicio' }))

    expect(screen.getByText('El inicio')).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('el límite de la aplicación', () => {
  it('funciona sin router y ofrece recargar', () => {
    render(
      <LimiteDeError alcance="aplicacion">
        <Rota />
      </LimiteDeError>,
    )

    const alerta = screen.getByRole('alert')
    expect(alerta.textContent).toContain('El sistema se rompió')
    expect(alerta.textContent).toContain("reading 'slice'")
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeDefined()
  })
})
