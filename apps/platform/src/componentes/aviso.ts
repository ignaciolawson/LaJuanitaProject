import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Cuánto dura en pantalla un aviso de error antes de irse solo.
 *
 * Es el número que pidió Ignacio (§14 · B3). Vive acá y no escrito en cada
 * pantalla por lo mismo que `SEGUNDOS_DEL_AVISO` existe en vez de un `20_000`
 * suelto: si alguna vez son quince o treinta, se cambia una vez.
 */
export const SEGUNDOS_DEL_AVISO = 20

/**
 * Un estado de error que se limpia solo a los {@link SEGUNDOS_DEL_AVISO}.
 *
 * <p>Reemplaza a `useState<string | null>(null)` y **nada más cambia**: devuelve
 * el mismo par, así que las pantallas siguen escribiendo `setError(mensaje)` y
 * `{error && <Aviso>{error}</Aviso>}` igual que antes.
 *
 * ⚠️ **El reloj vive en el estado y no en el componente `Aviso`, y esa es la
 * decisión.** Poniéndolo adentro de `Aviso` el componente se escondería a sí
 * mismo mientras el estado del dueño sigue en el mensaje viejo — y entonces
 * **el mismo error dos veces seguidas no se vuelve a mostrar**: la segunda vez
 * el padre escribe el mismo string, React no re-renderiza, y `Aviso` se queda
 * escondido. Es exactamente el modo de falla de §8.1 (`enviando` que sobrevivía
 * porque el componente no se desmontaba), y se ve recién al segundo intento,
 * que es cuando alguien está peleando con un error de verdad.
 *
 * Acá, en cambio, `setError` cancela el reloj anterior y arranca uno nuevo
 * **corra o no corra React**, así que repetir el mismo mensaje reinicia los
 * veinte segundos.
 *
 * ⚠️ **NO va donde el error ES la pantalla.** Siete pantallas hacen
 * `if (error) return <Aviso>{error}</Aviso>`: ahí el mensaje no acompaña al
 * contenido, lo reemplaza, y limpiarlo a los veinte segundos deja una página en
 * blanco sin ninguna explicación. La regla es esa y se puede decir en una línea:
 * **un aviso se va solo cuando la pantalla tiene otra cosa para mostrar.** Esas
 * siete siguen con `useState` pelado, a propósito.
 *
 * <p>El error de un campo tampoco entra acá y por otro motivo: lo dibuja
 * {@code Campo} y se limpia cuando se corrige el campo, que es cuando deja de
 * ser cierto. Un reloj ahí borraría la marca del campo que está mal mientras la
 * persona lo está mirando.
 */
export function useErrorPasajero(): [string | null, (mensaje: string | null) => void] {
  const [error, escribir] = useState<string | null>(null)
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelar = useCallback(() => {
    if (reloj.current !== null) {
      clearTimeout(reloj.current)
      reloj.current = null
    }
  }, [])

  // Al desmontar. Sin esto, cerrar un formulario con un error a medio camino
  // deja un `setState` programado contra un componente que ya no existe.
  useEffect(() => cancelar, [cancelar])

  const setError = useCallback(
    (mensaje: string | null) => {
      cancelar()
      escribir(mensaje)
      if (mensaje !== null) {
        reloj.current = setTimeout(() => escribir(null), SEGUNDOS_DEL_AVISO * 1000)
      }
    },
    [cancelar],
  )

  return [error, setError]
}
