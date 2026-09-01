import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Bloque, Grupo, Hueco } from './Bloque'

describe('Bloque', () => {
  it('el título es un encabezado de verdad, no un párrafo con estilo', () => {
    // Es lo que hace que la sección exista para quien navega por encabezados.
    // Antes eran 38 `<h3 className="t-seccion">` sueltos arriba de la tarjeta:
    // se veían igual y la pantalla se describía distinto.
    render(<Bloque titulo="Estado de cuenta">contenido</Bloque>)

    expect(screen.getByRole('heading', { name: 'Estado de cuenta', level: 2 })).toBeTruthy()
  })

  it('adentro de un Grupo baja a nivel 3', () => {
    // El Grupo ya gastó el `<h2>`. Sin esto, doce tarjetas repartidas en tres
    // grupos se describen como doce secciones hermanas.
    render(
      <Grupo titulo="Lo mío">
        <Bloque titulo="Mi próxima reserva" nivel={3}>
          contenido
        </Bloque>
      </Grupo>,
    )

    expect(screen.getByRole('heading', { name: 'Lo mío', level: 2 })).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Mi próxima reserva', level: 3 }),
    ).toBeTruthy()
  })

  it('sin título no dibuja la franja', () => {
    // Un bloque sin nombre es sólo el contenedor. Si la franja apareciera
    // vacía quedaría una banda gris que no dice nada arriba de cada tarjeta.
    render(<Bloque>contenido</Bloque>)

    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.getByText('contenido')).toBeTruthy()
  })

  it('la acción de la franja se muestra junto al título', () => {
    render(
      <Bloque titulo="Deudores" accion={<a href="/admin/deudores">Ver todos</a>}>
        contenido
      </Bloque>,
    )

    expect(screen.getByRole('link', { name: 'Ver todos' })).toBeTruthy()
  })

  it('el Grupo muestra su aclaración', () => {
    // ⚠️ No es decoración: es donde el Tablero dice "al día de hoy, no del
    // período". Sin esa línea alguien mira agosto, ve la deuda y cree que se
    // generó en agosto.
    render(
      <Grupo titulo="Al día de hoy" aclaracion="No depende del período elegido.">
        contenido
      </Grupo>,
    )

    expect(screen.getByText('No depende del período elegido.')).toBeTruthy()
  })

  it('el Hueco envuelve su contenido', () => {
    render(<Hueco>una contraseña temporal</Hueco>)

    expect(screen.getByText('una contraseña temporal')).toBeTruthy()
  })
})
