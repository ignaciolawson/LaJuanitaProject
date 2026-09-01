import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { Puerta } from './Puerta'

/**
 * Las puertas: login, registro y cambio obligatorio de contraseña.
 *
 * Lo que estos casos cuidan es **el interruptor de tema de §12 · A6**, y en
 * particular la única forma en que ese pedido se puede implementar mal sin que
 * nada falle: escribiendo otra clave. Con dos claves, alguien elige el tema
 * oscuro en la puerta, entra, y la aplicación se lo cambia sola — la pantalla
 * anda perfecto y la preferencia se pierde en el único momento en que se la
 * acaba de expresar.
 *
 * ⚠️ **Por eso la clave se escribe a mano acá y no se importa de `tema.ts`.**
 * Es el mismo criterio que `credencial.test.ts` sostiene para el formato de la
 * credencial: importando la constante, el caso seguiría en verde después de un
 * renombre, que es exactamente lo que existe para agarrar.
 */
const CLAVE = 'lajuanita.tema'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-tema')
})

function abrir() {
  return render(
    <Puerta titulo="Sistema de gestión" bajada="Una línea con voz.">
      <input aria-label="Email" />
    </Puerta>,
  )
}

describe('el interruptor de tema de la puerta', () => {
  it('está, y dice a dónde va y no dónde está', () => {
    abrir()

    // Sin nada guardado, `temaPorDefecto(null)` contesta claro: la acción
    // ofrecida es ir al oscuro.
    expect(screen.getByRole('button', { name: 'Tema oscuro' })).toBeDefined()
  })

  it('⚠️ guarda en la MISMA clave que el interruptor del sidebar', async () => {
    abrir()

    await userEvent.click(screen.getByRole('button', { name: 'Tema oscuro' }))

    expect(localStorage.getItem(CLAVE)).toBe('oscuro')
    expect(document.documentElement.dataset.tema).toBe('oscuro')
  })

  it('arranca con lo que la persona ya había elegido', () => {
    localStorage.setItem(CLAVE, 'oscuro')

    abrir()

    // Ya está en oscuro, así que lo que ofrece es volver al claro.
    expect(screen.getByRole('button', { name: 'Tema claro' })).toBeDefined()
    expect(document.documentElement.dataset.tema).toBe('oscuro')
  })

  it('no se mete en la columna donde se escribe', () => {
    // Es una preferencia de la pantalla, no un paso de entrar: si quedara entre
    // los campos, se lee como parte del formulario.
    abrir()

    const interruptor = screen.getByRole('button', { name: /^Tema/ })
    const campo = screen.getByLabelText('Email')

    expect(interruptor.closest('form')).toBeNull()
    expect(interruptor.contains(campo)).toBe(false)
  })
})
