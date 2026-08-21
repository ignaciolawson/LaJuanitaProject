import type { ReactNode } from 'react'

/**
 * La tabla de las pantallas de administración.
 *
 * Diez pantallas dibujan hoy exactamente el mismo marcado a mano —el
 * envoltorio con `overflow-x-auto`, el `thead` en mono, el `divide-y` del
 * cuerpo—, y esa repetición es la razón de que existan tres anchos de
 * columna distintos para la misma clase de dato.
 *
 * **Es composable y no manejada por datos**, y eso es deliberado: las celdas
 * de este sistema llevan enlaces, etiquetas de estado, botones de anulación y
 * semáforos. Una `<Tabla columnas={...} filas={...} />` obligaría a pasar JSX
 * dentro de un array de datos, que es la forma larga de escribir lo mismo.
 *
 * **El `overflow-x-auto` no es opcional.** Una tabla ancha sin él empuja el
 * scroll horizontal al body y rompe la pantalla entera, no sólo la tabla.
 */

export type Columna = {
  etiqueta: string
  /**
   * `derecha` para plata y cantidades.
   *
   * Un importe alineado a la izquierda no se puede comparar con el de la fila
   * de abajo, que es para lo único que se mira una columna de plata. Va junto
   * con `numerica` en la celda.
   */
  alineacion?: 'izquierda' | 'derecha'
  /** Clases extra para el `<th>`, por ejemplo un ancho fijo. */
  className?: string
}

export function Tabla({
  columnas,
  children,
}: {
  columnas: (string | Columna)[]
  children: ReactNode
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-linea bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-linea text-left text-tenue">
            {columnas.map((columna) => {
              const c: Columna = typeof columna === 'string' ? { etiqueta: columna } : columna
              return (
                <th
                  key={c.etiqueta}
                  scope="col"
                  className={`t-mono px-4 py-3 font-normal ${
                    c.alineacion === 'derecha' ? 'text-right' : ''
                  } ${c.className ?? ''}`}
                >
                  {c.etiqueta}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-linea">{children}</tbody>
      </table>
    </div>
  )
}

/**
 * Una celda.
 *
 * `numerica` aplica `tabular-nums` y alinea a la derecha: las dos cosas van
 * juntas siempre, y separarlas es cómo termina existiendo una columna de
 * pesos alineada a la derecha cuyos dígitos igual bailan.
 */
export function Celda({
  numerica,
  className,
  children,
}: {
  numerica?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <td
      className={`px-4 py-3 ${numerica ? 't-cifra text-right' : ''} ${className ?? ''}`}
    >
      {children}
    </td>
  )
}

/**
 * La fila de "no hay nada", **dentro** de la tabla.
 *
 * Existe aparte de `EstadoVacio` porque una tabla vacía tiene que conservar
 * sus encabezados: sin ellos, quien mira no sabe si filtró de más o si la
 * pantalla no cargó. Con ellos, se ve qué columnas hay y que ninguna tiene
 * filas — que es la información que hace falta.
 */
export function FilaVacia({ columnas, children }: { columnas: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={columnas} className="px-4 py-10 text-center text-sm text-apagado">
        {children}
      </td>
    </tr>
  )
}
