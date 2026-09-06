import { useEffect, useState } from 'react'

import { listarUsuarios } from '../api/administracion'
import type { UsuarioResumen } from '../api/tiposAdmin'
import { Boton } from './Boton'
import { Campo } from './Campo'

/**
 * Elegir a una persona que ya tiene cuenta.
 *
 * ⚠️ **Es la pieza que `AlumnosPagina` venía esperando por escrito.** Su
 * formulario de alta decía, en su propio comentario: *"El otro camino —una
 * persona que ya tiene cuenta y ahora se inscribe— usa el mismo endpoint mandando
 * `idUsuario`, y se agrega cuando exista el buscador de personas. El backend ya lo
 * soporta."* El backend lo soportaba desde el primer día —`AltaAlumnoRequest`
 * tiene los dos caminos, y su javadoc describe el ejemplo textual de Ignacio:
 * *"se registró sola, quizá para alquilar una cabina, y ahora se inscribe"*— y
 * faltaba esta mitad.
 *
 * **Existe como componente y no adentro de una pantalla porque lo necesitan dos**
 * (§14 · B2): hacerse alumno y hacerse profesor son la misma pregunta —*¿quién de
 * los que ya están?*— y escribirla dos veces son dos buscadores que se van a ir
 * pareciendo cada vez menos.
 *
 * ⚠️ **Busca contra el servidor y no filtra una lista traída entera.** El
 * listado de usuarios pagina porque su tamaño lo decide el negocio creciendo, así
 * que traer todo para filtrar en el navegador funciona con ochenta personas y
 * deja de funcionar sin avisar — mostraría los primeros veinte y diría que el
 * resto no existe. Es la misma razón por la que el listado de alumnos es un
 * buscador y el de profesores no.
 *
 * **No ofrece crear una cuenta**: quien no está se crea en `/admin/usuarios`, que
 * es la pantalla de las personas. Meter un alta acá sería un segundo lugar donde
 * nacen cuentas.
 */
export function BuscadorDePersonas({
  elegida,
  onElegir,
  etiqueta = 'Buscar a la persona',
  ayuda,
}: {
  /** La persona ya elegida, o `null` mientras se busca. */
  elegida: UsuarioResumen | null
  onElegir: (persona: UsuarioResumen | null) => void
  etiqueta?: string
  /** Una línea que diga a quién hay que buscar en esta pantalla. */
  ayuda?: string
}) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<UsuarioResumen[]>([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    // Con la persona ya elegida no se busca más: la lista de abajo ya no es una
    // opción sino ruido debajo de una decisión tomada.
    if (elegida) return

    const termino = texto.trim()
    if (termino.length < 2) {
      setResultados([])
      return
    }

    // Los mismos 250 ms que los diez listados de administración. Sin esto, cada
    // tecla es un pedido y las respuestas pueden volver desordenadas: se ve como
    // una lista que parpadea y termina mostrando los resultados de un texto que
    // ya no está escrito.
    let vigente = true
    setBuscando(true)
    const reloj = setTimeout(() => {
      listarUsuarios({ buscar: termino })
        .then((pagina) => {
          if (vigente) setResultados(pagina.contenido)
        })
        // Que la búsqueda no encuentre nada no es un error de la pantalla: el
        // formulario que la contiene ya tiene dónde avisar si el alta falla.
        .catch(() => {
          if (vigente) setResultados([])
        })
        .finally(() => {
          if (vigente) setBuscando(false)
        })
    }, 250)

    return () => {
      vigente = false
      clearTimeout(reloj)
    }
  }, [texto, elegida])

  if (elegida) {
    return (
      <div className="rounded-md border border-linea bg-superficie-2 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium">
              {elegida.nombre} {elegida.apellido}
            </div>
            <div className="text-xs text-tenue">{elegida.email}</div>
          </div>
          <Boton
            variante="enlace"
            type="button"
            onClick={() => {
              onElegir(null)
              setTexto('')
            }}
          >
            Cambiar
          </Boton>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Campo
        etiqueta={etiqueta}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Nombre, apellido o email"
        ayuda={ayuda}
      />

      {texto.trim().length >= 2 && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-linea">
          {buscando && resultados.length === 0 && (
            <p className="px-3 py-2 text-xs text-tenue">Buscando…</p>
          )}

          {/* ⚠️ Que no haya resultados NO se dibuja como una lista vacía: dice
              qué hacer. Sin esta línea, alguien que busca a una persona sin
              cuenta se queda mirando un recuadro vacío sin saber que el paso
              siguiente está en otra pantalla. */}
          {!buscando && resultados.length === 0 && (
            <p className="px-3 py-2 text-xs text-tenue">
              Nadie con ese nombre tiene cuenta. Creásela primero en{' '}
              <span className="font-medium">Usuarios</span>.
            </p>
          )}

          <ul>
            {resultados.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => onElegir(u)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-superficie-2"
                >
                  <span className="font-medium">
                    {u.nombre} {u.apellido}
                  </span>
                  <span className="ml-2 text-xs text-tenue">{u.email}</span>
                  {/* Una cuenta desactivada no se esconde: se marca. Escondida,
                      alguien la busca, no la encuentra, y crea una segunda que
                      el índice único va a rechazar por el email. */}
                  {!u.activo && <span className="ml-2 text-xs text-acento">desactivada</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
