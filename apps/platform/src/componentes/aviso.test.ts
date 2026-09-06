import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SEGUNDOS_DEL_AVISO, useErrorPasajero } from './aviso'

/**
 * El aviso que se va solo (§14 · B3).
 *
 * ⚠️ **Este archivo SÍ usa relojes falsos, a diferencia del resto de la suite.**
 * `CajaPagina` documentó por qué no se usan en las pantallas: `userEvent` los
 * necesita de verdad, y congelarlos cuelga los casos que tipean. Acá no hay
 * pantalla ni `userEvent` — se prueba un hook contra un `setTimeout`— así que es
 * el único lugar donde adelantar veinte segundos es lo correcto. Sin ellos, el
 * caso central tendría que esperar veinte segundos reales, o sea que estaría
 * arriba del `testTimeout` de la suite.
 */
describe('useErrorPasajero', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('el mensaje se va solo pasados los segundos del aviso', () => {
    const { result } = renderHook(() => useErrorPasajero())

    act(() => result.current[1]('No se pudo guardar.'))
    expect(result.current[0]).toBe('No se pudo guardar.')

    // Un segundo antes todavía está: si se fuera antes, alguien que mira la
    // pantalla lo perdería mientras lo lee.
    act(() => void vi.advanceTimersByTime((SEGUNDOS_DEL_AVISO - 1) * 1000))
    expect(result.current[0]).toBe('No se pudo guardar.')

    act(() => void vi.advanceTimersByTime(1000))
    expect(result.current[0]).toBeNull()
  })

  /**
   * ⚠️ **El caso que justifica que el reloj viva en el estado y no en `Aviso`.**
   *
   * Si el componente se escondiera a sí mismo, el estado del dueño seguiría en el
   * mensaje viejo: la segunda vez el padre escribe el mismo string, React no
   * re-renderiza porque el valor no cambió, y **el aviso no vuelve a aparecer**.
   * Es la forma exacta de §8.1 —el `enviando` que sobrevivía porque el componente
   * no se desmontaba— y se ve recién al segundo intento, que es justo cuando
   * alguien está peleando con un error de verdad.
   */
  it('⚠️ el MISMO mensaje otra vez vuelve a mostrarse y reinicia el reloj', () => {
    const { result } = renderHook(() => useErrorPasajero())

    act(() => result.current[1]('No se pudo guardar.'))
    act(() => void vi.advanceTimersByTime(SEGUNDOS_DEL_AVISO * 1000))
    expect(result.current[0]).toBeNull()

    // Segundo intento, mismo error.
    act(() => result.current[1]('No se pudo guardar.'))
    expect(result.current[0]).toBe('No se pudo guardar.')

    // Y los veinte segundos arrancan de cero, no siguen los del primero.
    act(() => void vi.advanceTimersByTime((SEGUNDOS_DEL_AVISO - 1) * 1000))
    expect(result.current[0]).toBe('No se pudo guardar.')
  })

  it('un mensaje nuevo mientras hay uno viejo reinicia el reloj', () => {
    const { result } = renderHook(() => useErrorPasajero())

    act(() => result.current[1]('El primero.'))
    act(() => void vi.advanceTimersByTime((SEGUNDOS_DEL_AVISO - 2) * 1000))
    act(() => result.current[1]('El segundo.'))

    // Si el reloj del primero siguiera corriendo, el segundo duraría dos
    // segundos en pantalla.
    act(() => void vi.advanceTimersByTime(3000))
    expect(result.current[0]).toBe('El segundo.')
  })

  it('limpiarlo a mano cancela el reloj', () => {
    const { result } = renderHook(() => useErrorPasajero())

    act(() => result.current[1]('Algo falló.'))
    act(() => result.current[1](null))
    expect(result.current[0]).toBeNull()

    // Sin cancelar, el reloj del mensaje viejo seguiría vivo y limpiaría de nuevo
    // encima de lo que haya escrito después.
    act(() => result.current[1]('Otra cosa.'))
    act(() => void vi.advanceTimersByTime((SEGUNDOS_DEL_AVISO - 1) * 1000))
    expect(result.current[0]).toBe('Otra cosa.')
  })

  /**
   * Desmontar con un error a medio camino —cerrar un formulario— no puede dejar
   * un `setState` programado contra un componente que ya no existe.
   */
  it('desmontar cancela el reloj pendiente', () => {
    const { result, unmount } = renderHook(() => useErrorPasajero())

    act(() => result.current[1]('Algo falló.'))
    unmount()

    expect(() => vi.advanceTimersByTime(SEGUNDOS_DEL_AVISO * 1000)).not.toThrow()
  })
})
