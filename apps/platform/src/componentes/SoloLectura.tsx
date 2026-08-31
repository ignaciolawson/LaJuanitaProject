import { useUsuario } from '../auth/contexto'
import { puedeOperar } from '../layout/menu'

/**
 * El modo solo lectura — lo que ve DIRECTIVO en las dieciocho pantallas de
 * administración.
 *
 * **No es una pantalla aparte ni un layout distinto**: es la misma pantalla
 * sin sus botones de escritura. Trece pantallas ya lo resuelven bien,
 * repitiendo estas dos líneas:
 *
 * ```
 * const puedeEscribir = puedeOperar(useUsuario())
 * ```
 *
 * Lo que falta no es esa línea, es **la otra mitad**: hoy un DIRECTIVO abre
 * Alumnos, no encuentra "Nuevo alumno" y no hay nada que le diga por qué. Se
 * lee como un sistema a medio hacer o como una falla, que es el mismo defecto
 * que tienen los estados vacíos sin diseño — y es exactamente lo contrario de
 * lo que `puedeOperar` vino a arreglar. Ese predicado nació porque un socio
 * completaba un formulario y recibía *"No tenés permiso para hacer esto"*;
 * dejarlo sin explicación cambia una mentira por un silencio.
 *
 * ⚠️ **Nada de esto autoriza nada.** El backend resuelve el rol contra la base
 * en cada pedido. Borrar este archivo no abriría ningún agujero: volvería a
 * dejar al usuario sin saber qué puede hacer.
 */

/**
 * Si esta persona puede escribir. Reemplaza a las dos líneas repetidas.
 *
 * Se llama `usePuedeEscribir` y no `usePuedeOperar` porque en la pantalla la
 * pregunta es *"¿dibujo el botón?"*; el nombre del predicado del backend
 * (`@PuedeOperar`) ya lo lleva `menu.ts`, que es donde la correspondencia
 * importa.
 */
export function usePuedeEscribir(): boolean {
  return puedeOperar(useUsuario())
}

/**
 * La línea que explica por qué esta pantalla no tiene botones.
 *
 * Se dibuja sola cuando corresponde: si quien mira puede escribir, no
 * devuelve nada. Así la pantalla la pone una vez y no vuelve a preguntarse
 * por el rol.
 */
export function AvisoSoloLectura() {
  const puedeEscribir = usePuedeEscribir()

  if (puedeEscribir) return null

  return (
    <p className="mb-6 rounded-lg border border-linea bg-superficie px-4 py-3 text-sm text-tenue">
      Estás viendo el sistema en <strong className="font-semibold">solo lectura</strong>: podés
      consultar todo y no modificar nada.
    </p>
  )
}
