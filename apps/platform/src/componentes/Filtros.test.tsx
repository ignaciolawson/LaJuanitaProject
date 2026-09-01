import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CONTROL_DE_FILTRO, CONTROL_DE_FORMULARIO } from './controles'
import { FiltroFecha, FiltroSelect, FiltroTexto, Filtros } from './Filtros'

describe('la barra de filtros', () => {
  it('cada control tiene nombre para quien no ve la pantalla', async () => {
    // En pantalla el nombre lo dice la opción elegida ("Todos los estados") o
    // el placeholder. Para un lector de pantalla eso no alcanza, y es lo que
    // sostienen los 34 casos de Pagos: buscan por `aria-label`.
    render(
      <Filtros>
        <FiltroTexto etiqueta="Buscar" valor="" onCambio={() => {}} placeholder="Buscar…" />
        <FiltroSelect etiqueta="Filtrar por estado" valor="" onCambio={() => {}}>
          <option value="">Todos los estados</option>
        </FiltroSelect>
      </Filtros>,
    )

    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Filtrar por estado' })).toBeTruthy()
  })

  it('avisa el valor nuevo, no el evento', async () => {
    const onCambio = vi.fn()
    render(<FiltroTexto etiqueta="Buscar" valor="" onCambio={onCambio} />)

    await userEvent.type(screen.getByRole('searchbox'), 'a')

    expect(onCambio).toHaveBeenCalledWith('a')
  })

  it('un filtro de fecha SÍ lleva rótulo visible', () => {
    // Es la excepción, y la razón está en la diferencia: una lista muestra su
    // opción elegida, una fecha vacía no muestra nada. Con dos al lado, la
    // única forma de saber cuál es "desde" sería probando.
    render(<FiltroFecha etiqueta="Desde" valor="2026-09-01" onCambio={() => {}} />)

    expect(screen.getByText('Desde')).toBeTruthy()
  })
})

describe('el control de línea', () => {
  it('⚠️ nunca pierde el foco visible', () => {
    // Los 30 controles escritos a mano llevaban `outline-none` copiado y
    // ninguno lo reemplazaba: navegando con teclado, saber en qué campo estabas
    // dependía de notar que una línea de 1px había cambiado de tono.
    for (const clase of [CONTROL_DE_FILTRO, CONTROL_DE_FORMULARIO]) {
      expect(clase).toContain('focus:border-red')
      expect(clase).not.toContain('outline-none')
    }
  })

  it('las dos variantes salen de la misma base', () => {
    // Lo único que las separa es el relleno: el de formulario respira más
    // porque abajo lleva su mensaje de error. Si empiezan a diferir en otra
    // cosa, volvieron a ser dos definiciones de la misma cosa.
    const sinRelleno = (c: string) =>
      c
        .split(' ')
        .filter((clase) => !clase.startsWith('py-') && clase !== 'border-linea-control')
        .join(' ')

    expect(sinRelleno(CONTROL_DE_FILTRO)).toBe(sinRelleno(CONTROL_DE_FORMULARIO))
  })

  it('⚠️ el borde de un control no es el de una tarjeta', () => {
    // §12 · A3. `--linea` mide 1,3:1 y separa superficies; el borde de un campo
    // es la ÚNICA señal de que ahí se escribe —estos campos son líneas, no
    // cajas—, así que es un control y WCAG le pide 3:1. `--linea-control` da
    // 3,3:1 en claro y 3,9:1 en oscuro.
    //
    // Se afirma sobre la palabra exacta a propósito: `border-linea` es prefijo
    // de `border-linea-control`, así que un `toContain` pasaría con el token
    // equivocado puesto.
    for (const clase of [CONTROL_DE_FILTRO, CONTROL_DE_FORMULARIO]) {
      expect(clase.split(' ')).not.toContain('border-linea')
    }
    expect(CONTROL_DE_FILTRO.split(' ')).toContain('border-linea-control')
  })
})
