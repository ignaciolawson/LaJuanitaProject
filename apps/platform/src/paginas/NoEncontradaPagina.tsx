import { useNavigate } from 'react-router'

import { Boton } from '../componentes/Boton'
import { PantallaDeEstado } from '../componentes/PantallaDeEstado'

/**
 * Una dirección que no existe en el sistema.
 *
 * Hasta el 2026-10-18 la ruta comodín devolvía al Inicio sin decir nada, y eso
 * se leía como "el link me llevó a cualquier lado": la persona no sabía si se
 * había equivocado ella o el sistema. Ahora se dice, y se ofrece la salida.
 */
export function NoEncontradaPagina() {
  const navegar = useNavigate()

  return (
    <PantallaDeEstado
      codigo="404"
      pista="PISTA NO ENCONTRADA"
      titular="Este track no está en la crate."
      remate="Lo buscamos por BPM, por tonalidad y por artista."
      acciones={
        <>
          <Boton type="button" onClick={() => navegar('/')}>
            Volver al inicio
          </Boton>
          <Boton type="button" variante="secundario" onClick={() => navegar(-1)}>
            Volver atrás
          </Boton>
        </>
      }
    >
      La dirección que abriste no existe en el sistema. Puede que el link esté mal copiado o que
      la pantalla haya cambiado de lugar: desde el menú llegás a todo lo que tenés habilitado.
    </PantallaDeEstado>
  )
}
