import { useEffect, useState } from 'react'

import { listarVentas } from '../api/administracion'
import { ApiError } from '../api/cliente'
import type { VentaResumen } from '../api/tiposAdmin'
import { Boton } from './Boton'
import { Campo } from './Campo'
import { importe } from './dinero'
import { fecha } from './semana'

/**
 * Elegir **qué venta de equipos salda** un pago. Gemelo de
 * {@link SelectorDeTrabajo}; el molde es el de `SelectorDeCurso`.
 *
 * <p>Cierra el segundo de los dos `<select>` de `pagina: 0` que la §17 dejó
 * anotados — veinte filas, y la venta veintiuna no existía para este formulario
 * sin que nada avisara. `VentaEquipoRepository.listar` ya busca por equipo y por
 * comprador desde que la pantalla existe.
 *
 * <p><b>La fila dice si la venta ya está cobrada, y no la esconde.</b> Es el
 * dato que evita el error que este formulario hace posible —cobrar dos veces la
 * misma venta— y esconderla sería peor: una venta cobrada cuyo pago se anuló
 * tiene que poder volver a cobrarse, y `VentaResumen.cobrada` no distingue ese
 * caso. Marcarla deja la decisión donde se puede tomar; filtrarla la haría
 * desaparecer sin explicación.
 *
 * <p>Va la fecha porque el mismo modelo se vende muchas veces: *"XDJ-RR —
 * Pérez"* se repite, *"XDJ-RR — Pérez · 14/03/2026"* no.
 */
export function SelectorDeVenta({
  elegida,
  onElegir,
  error,
  etiqueta = 'Cuál venta',
}: {
  elegida: VentaResumen | null
  onElegir: (venta: VentaResumen | null) => void
  error?: string
  etiqueta?: string
}) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<VentaResumen[]>([])
  const [total, setTotal] = useState(0)
  const [fallo, setFallo] = useState<string | null>(null)

  useEffect(() => {
    if (elegida) return

    // La guarda de carrera de `BuscadorDePersonas`: ver `SelectorDeTrabajo`.
    let vigente = true
    const id = setTimeout(async () => {
      try {
        const pagina = await listarVentas({ buscar: texto })
        if (!vigente) return
        setResultados(pagina.contenido)
        setTotal(pagina.totalElementos)
        setFallo(null)
      } catch (e) {
        if (!vigente) return
        setFallo(e instanceof ApiError ? e.message : 'No se pudieron buscar las ventas.')
      }
    }, 250)

    return () => {
      vigente = false
      clearTimeout(id)
    }
  }, [texto, elegida])

  if (elegida) {
    return (
      <div>
        <span className="t-mono text-tenue">
          {etiqueta}
          <span className="ml-0.5 text-acento">*</span>
        </span>
        <div className="mt-1.5 flex items-center justify-between gap-3 rounded-md border border-linea bg-superficie-2 px-3 py-2.5 text-sm">
          <span className="min-w-0">
            <strong className="font-medium">{elegida.modeloEquipo}</strong>
            <span className="ml-2 text-xs text-tenue">{elegida.comprador}</span>
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
        placeholder="Buscar por equipo o por comprador…"
        error={error ?? fallo ?? undefined}
        required
      />

      <ul className="mt-2 max-h-48 overflow-y-auto rounded-md border border-linea">
        {resultados.map((v) => (
          <li key={v.idVenta}>
            <button
              type="button"
              onClick={() => onElegir(v)}
              className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-superficie-2"
            >
              <span className="font-medium">{v.modeloEquipo}</span>
              <span className="ml-2 text-xs text-tenue">
                {v.comprador} · {fecha(v.fechaVenta)} · {importe(v.precio, v.moneda)}
              </span>
              {v.cobrada && <span className="ml-2 text-xs text-apagado">ya cobrada</span>}
            </button>
          </li>
        ))}

        {resultados.length === 0 && (
          <li className="px-3 py-3 text-sm text-tenue">
            No hay ventas que coincidan. Se cargan desde Ventas.
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
