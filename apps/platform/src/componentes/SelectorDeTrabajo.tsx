import { useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import { listarTrabajos } from '../api/mastering'
import { NOMBRE_DE_ESTADO, type TrabajoResumen } from '../api/tiposMastering'
import { Boton } from './Boton'
import { Campo } from './Campo'
import { importe } from './dinero'

/**
 * Elegir **qué trabajo de Mix & Mastering salda** un pago.
 *
 * ⚠️ **Es el último de los `<select>` de `pagina: 0` que quedaban** (§17 · H8).
 * Los otros siete eran de personas y se cerraron ahí; estos dos —*"qué trabajo
 * salda"* y *"qué venta salda"*— quedaron anotados para después **con la premisa
 * de que sus endpoints no tenían búsqueda por texto**. Medido: la tienen desde
 * que la pantalla existe. `TrabajoMasteringRepository.listar` cruza track y
 * cliente, que son las dos formas en que alguien nombra un trabajo. O sea que
 * esto era front y nada más — **el quinto número de este proyecto que al mirarlo
 * de cerca pedía más trabajo del que había**.
 *
 * <p>El modo de falla que cierra es el mismo de los otros siete y no avisa: con
 * veinte filas, el trabajo veintiuno **no existía para este formulario**. La
 * lista se veía completa, así que nadie lo iba a reportar como un bug; se
 * reporta como *"el pago de Fulano no lo puedo cargar"*, meses después.
 *
 * <p><b>No esconde los cancelados ni los ya pagados, los marca.</b> El backend
 * no los rechaza —`PagoService` guarda el id sin mirar el estado—, así que
 * filtrarlos sería una regla inventada acá, y de las caras: lo que la base
 * acepta y la pantalla no ofrece se convierte en *"no aparece"*, que no tiene
 * dónde explicarse. La fila dice el estado y cuánto se cobró de cuánto, que es
 * exactamente lo que decide si es éste el trabajo o no.
 *
 * <p>Busca contra el servidor, que es lo que pagina. Gemelo de
 * {@link SelectorDeVenta}; el molde es el de {@link SelectorDeCurso}.
 */
export function SelectorDeTrabajo({
  elegido,
  onElegir,
  error,
  etiqueta = 'Cuál trabajo',
}: {
  elegido: TrabajoResumen | null
  onElegir: (trabajo: TrabajoResumen | null) => void
  error?: string
  etiqueta?: string
}) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<TrabajoResumen[]>([])
  const [total, setTotal] = useState(0)
  const [fallo, setFallo] = useState<string | null>(null)

  useEffect(() => {
    if (elegido) return

    // `vigente` es la guarda de carrera de `BuscadorDePersonas`: el `clearTimeout`
    // sólo cancela lo que todavía no salió, así que con dos pedidos en vuelo el
    // primero puede volver último y pisar los resultados del texto que sí está
    // escrito. Se ve como una lista que parpadea y miente, sin error en ningún lado.
    let vigente = true
    const id = setTimeout(async () => {
      try {
        const pagina = await listarTrabajos({ buscar: texto })
        if (!vigente) return
        setResultados(pagina.contenido)
        setTotal(pagina.totalElementos)
        setFallo(null)
      } catch (e) {
        if (!vigente) return
        setFallo(e instanceof ApiError ? e.message : 'No se pudieron buscar los trabajos.')
      }
    }, 250)

    return () => {
      vigente = false
      clearTimeout(id)
    }
  }, [texto, elegido])

  if (elegido) {
    return (
      <div>
        <span className="t-mono text-tenue">
          {etiqueta}
          <span className="ml-0.5 text-acento">*</span>
        </span>
        <div className="mt-1.5 flex items-center justify-between gap-3 rounded-md border border-linea bg-superficie-2 px-3 py-2.5 text-sm">
          <span className="min-w-0">
            <strong className="font-medium">{elegido.nombreTrack}</strong>
            <span className="ml-2 text-xs text-tenue">{elegido.cliente}</span>
          </span>
          <Boton variante="enlace" type="button" onClick={() => onElegir(null)}>
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
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar por track o por cliente…"
        error={error ?? fallo ?? undefined}
        required
      />

      <ul className="mt-2 max-h-48 overflow-y-auto rounded-md border border-linea">
        {resultados.map((t) => (
          <li key={t.idTrabajo}>
            <button
              type="button"
              onClick={() => onElegir(t)}
              className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-superficie-2"
            >
              <span className="font-medium">{t.nombreTrack}</span>
              <span className="ml-2 text-xs text-tenue">
                {t.cliente} · {NOMBRE_DE_ESTADO[t.estado].toLowerCase()}
                {t.precioAcordado !== null && ` · ${plata(t)}`}
              </span>
            </button>
          </li>
        ))}

        {resultados.length === 0 && (
          <li className="px-3 py-3 text-sm text-tenue">
            No hay trabajos que coincidan. Se cargan desde Mix &amp; Mastering.
          </li>
        )}
      </ul>

      {/* La misma lección del paginado: una lista corta no se reporta como rota. */}
      {total > resultados.length && (
        <p className="mt-1 text-xs text-apagado">
          Se muestran {resultados.length} de {total}. Afiná la búsqueda para ver el resto.
        </p>
      )}
    </div>
  )
}

/**
 * "USD 100 de USD 300", o el precio solo si no entró nada.
 *
 * <p>Las dos cifras van **en la moneda del trabajo** y no se convierten: es la
 * misma regla que `V32` puso en la base y la que decide, un campo más abajo, en
 * qué moneda se carga este pago.
 */
function plata(t: TrabajoResumen): string {
  const precio = importe(t.precioAcordado ?? 0, t.moneda)
  return t.cobrado !== null ? `${importe(t.cobrado, t.moneda)} de ${precio}` : precio
}
