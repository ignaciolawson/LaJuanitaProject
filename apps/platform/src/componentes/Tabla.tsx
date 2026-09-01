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
 *
 * **El encabezado es la MISMA franja que la de `Bloque`** (`--superficie-2` con
 * una línea abajo), y eso es el sistema y no una coincidencia: en toda la
 * plataforma, una franja de ese tono significa *"esto nombra lo que sigue"*. Un
 * `thead` con su propio tratamiento sería un segundo idioma para la misma idea.
 *
 * **Y el encabezado se pega arriba al scrollear.** En una tabla de treinta
 * filas por seis columnas, a la fila diez ya no se ve qué columna es cuál, y
 * quien carga datos ocho horas por día hace ese scroll cien veces al día. Es la
 * mejora que más se nota de esta etapa y cuesta dos clases.
 *
 * ⚠️ `sticky` se ancla al ancestro que scrollea. Acá ese es el DOCUMENTO —el
 * `overflow-x-auto` del envoltorio no scrollea en vertical— y la aplicación no
 * tiene barra superior, así que `top-0` es el borde de la ventana. Si alguna vez
 * vuelve una barra fija arriba, este `top-0` hay que correrlo o el encabezado se
 * va a meter abajo de ella.
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
    <div className="overflow-x-auto rounded-lg border border-linea bg-superficie shadow-tarjeta">
      {/* `hover:bg-superficie-2` en las filas: en una tabla de treinta filas y
          seis columnas, seguir una fila con la vista de punta a punta es el
          movimiento que mas se repite, y es donde se salta de renglon sin
          darse cuenta. */}
      <table className="w-full text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-superficie-2">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-linea bg-superficie-2 text-left text-tenue">
            {columnas.map((columna) => {
              const c: Columna = typeof columna === 'string' ? { etiqueta: columna } : columna
              return (
                <th
                  key={c.etiqueta}
                  scope="col"
                  className={`t-mono px-4 py-2.5 font-normal ${
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
      className={`px-4 py-2.5 ${numerica ? 't-cifra text-right' : ''} ${className ?? ''}`}
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
