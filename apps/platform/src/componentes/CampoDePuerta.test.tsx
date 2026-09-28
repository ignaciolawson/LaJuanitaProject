import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { CampoDePuerta } from './CampoDePuerta'

describe('CampoDePuerta', () => {
  it('el ojo muestra y vuelve a ocultar la contraseña', async () => {
    render(<CampoDePuerta etiqueta="Contraseña" type="password" defaultValue="secreta" />)
    const campo = screen.getByLabelText('Contraseña')
    expect(campo.getAttribute('type')).toBe('password')

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(campo.getAttribute('type')).toBe('text')

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(campo.getAttribute('type')).toBe('password')
  })

  /** Si el botón quedara dentro del `<label>`, el campo se llamaría "ContraseñaMostrar contraseña". */
  it('el nombre del campo es solo su etiqueta', () => {
    render(<CampoDePuerta etiqueta="Contraseña" type="password" />)
    expect(screen.getByLabelText('Contraseña')).toBeDefined()
  })

  it('un campo que no es contraseña no tiene ojo', () => {
    render(<CampoDePuerta etiqueta="Email" type="email" />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
