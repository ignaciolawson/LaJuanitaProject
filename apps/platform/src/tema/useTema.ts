import { useCallback, useState } from 'react'

import type { UsuarioActual } from '../api/tipos'
import { aplicarTema, guardarTema, temaGuardado, temaPorDefecto, type Tema } from './tema'

/**
 * El tema vigente y el interruptor que lo cambia.
 *
 * **El estado inicial se resuelve una sola vez, en el inicializador de
 * `useState`, y no en un efecto.** Con un efecto habría un frame pintado con
 * el tema equivocado antes de la corrección: en una pantalla entera eso es un
 * flash blanco, que es justo lo que alguien que eligió el tema oscuro no
 * quiere ver cada vez que entra.
 *
 * `elegido` es lo que la persona guardó alguna vez; si no hay nada guardado
 * manda el perfil (ver `temaPorDefecto`). El orden importa y es el del
 * comentario de `tema.ts`: la elección le gana al default, siempre.
 */
export function useTema(usuario: UsuarioActual | null) {
  const [tema, setTema] = useState<Tema>(() => {
    const inicial = temaGuardado() ?? temaPorDefecto(usuario)
    aplicarTema(inicial)
    return inicial
  })

  const alternar = useCallback(() => {
    setTema((actual) => {
      const proximo: Tema = actual === 'claro' ? 'oscuro' : 'claro'
      // Se guarda al alternar y no al calcular el default: guardar el default
      // convertiría "todavía no elegí" en "elegí esto", y a partir de ahí el
      // perfil dejaría de decidir para alguien que nunca tocó nada.
      guardarTema(proximo)
      aplicarTema(proximo)
      return proximo
    })
  }, [])

  return { tema, alternar }
}
