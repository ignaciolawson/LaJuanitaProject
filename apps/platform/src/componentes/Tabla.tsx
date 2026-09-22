import { Children, createContext, isValidElement, cloneElement, useContext } from 'react'
import type { ReactElement, ReactNode } from 'react'

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
 * `overflow-x-auto` del envoltorio no scrollea en vertical— y en escritorio la
 * aplicación no tiene barra superior, así que `top-0` es el borde de la ventana.
 *
 * ⚠️ **Eso que el párrafo de arriba anticipaba ya pasó**: la Etapa 0 (P106) trajo
 * una barra fija en pantalla chica. No hay que correr ningún `top-0` **porque
 * debajo de `lg` el encabezado no se dibuja** — la tabla es una pila de tarjetas
 * y no tiene `thead`. Si alguna vez aparece una barra fija en escritorio, ahí sí.
 *
 * **En pantalla chica esto no es una tabla: es una pila de tarjetas** (P107,
 * §26 · Etapa 1). Una tabla de ocho columnas en un teléfono se puede scrollear
 * al costado —que es lo que hacía, y por eso no rompía nada— pero leer una fila
 * obliga a barrer de izquierda a derecha perdiendo de vista de quién era. Apilada,
 * cada fila es una tarjeta y **cada celda dice su encabezado al lado del dato**.
 *
 * ⚠️ **Esas etiquetas salen de `columnas`, no se escriben de nuevo.** `Fila`
 * recorre sus celdas y a cada una le pasa la etiqueta que le toca por posición.
 * Escribirlas a mano en cada `Celda` serían ~90 lugares donde el encabezado de
 * arriba y el de la tarjeta pueden decir cosas distintas, que es exactamente la
 * clase de copia que este proyecto paga cara. La consecuencia es que **las
 * celdas de una fila tienen que ser tantas como las columnas, y en orden** — hoy
 * lo son en las trece tablas, y ninguna tiene celdas condicionales.
 */

/** Las etiquetas de las columnas, para que `Fila` se las reparta a sus celdas. */
const ColumnasDeLaTabla = createContext<string[]>([])

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
  const etiquetas = columnas.map((c) => (typeof c === 'string' ? c : c.etiqueta))

  return (
    <ColumnasDeLaTabla.Provider value={etiquetas}>
      {/* El marco de tarjeta se apaga en chico: ahí el marco lo lleva cada fila,
          y dos bordes anidados sobre 375px son doce píxeles que no sobran.
          `overflow-x-auto` también se apaga — apilado no hay a dónde scrollear,
          y dejarlo puesto hace que un contenido ancho arrastre la tarjeta. */}
      <div className="max-lg:contents overflow-x-auto rounded-lg border border-linea bg-superficie shadow-tarjeta">
        {/* `hover:bg-superficie-2` en las filas: en una tabla de treinta filas y
            seis columnas, seguir una fila con la vista de punta a punta es el
            movimiento que mas se repite, y es donde se salta de renglon sin
            darse cuenta. */}
        <table className="w-full text-sm max-lg:block [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-superficie-2">
          {/* Debajo de `lg` el encabezado no se dibuja: lo dice cada celda. */}
          <thead className="sticky top-0 z-10 max-lg:hidden">
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
          {/* En columna, la línea que divide filas la reemplaza la separación
              entre tarjetas: un `divide-y` sobre bloques apilados dibuja una
              raya que no separa nada de lo que se está leyendo. */}
          <tbody className="divide-y divide-linea max-lg:block max-lg:space-y-3 max-lg:divide-y-0">
            {children}
          </tbody>
        </table>
      </div>
    </ColumnasDeLaTabla.Provider>
  )
}

/**
 * Una fila. **Reemplaza al `<tr>` escrito a mano** y existe por una sola razón:
 * es quien sabe en qué posición va cada celda, y por lo tanto qué encabezado le
 * corresponde en pantalla chica.
 *
 * ⚠️ Cuenta **sólo los hijos que son elementos**, así que un salto de línea o un
 * `{' '}` entre celdas no corre las etiquetas. Lo que sí las correría es una
 * celda condicional (`{hay && <Celda/>}`), que hoy no existe en ninguna de las
 * trece tablas — y si alguna vez hace falta, la salida es renderizar la `Celda`
 * siempre y poner el condicional adentro.
 */
export function Fila({ className, children }: { className?: string; children: ReactNode }) {
  const etiquetas = useContext(ColumnasDeLaTabla)
  const celdas = Children.toArray(children).filter(isValidElement).length
  // ⚠️ **Si no son tantas como columnas, no se rotula NADA.** Las etiquetas van
  // por posición, así que una celda de menos las corre y la tarjeta empieza a
  // decir "Monto: Pérez, Juan" — con total aplomo y sin que nada falle. Una
  // etiqueta equivocada es peor que ninguna, que es el mismo criterio por el
  // que acá un contador que no llegó no se dibuja como cero.
  const rotula = celdas === etiquetas.length
  let posicion = 0

  return (
    <tr
      className={`max-lg:block max-lg:rounded-lg max-lg:border max-lg:border-linea max-lg:bg-superficie max-lg:px-3 max-lg:py-2 max-lg:shadow-tarjeta ${className ?? ''}`}
    >
      {Children.map(children, (hijo) => {
        if (!isValidElement(hijo)) return hijo
        const etiqueta = rotula ? etiquetas[posicion] : undefined
        posicion += 1
        return cloneElement(hijo as ReactElement<{ etiqueta?: string }>, { etiqueta })
      })}
    </tr>
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
  etiqueta,
  children,
}: {
  numerica?: boolean
  className?: string
  /**
   * El encabezado de esta columna, para decirlo al lado del dato cuando la
   * tabla está apilada. **Lo pone `Fila` por posición**: no se escribe a mano.
   */
  etiqueta?: string
  children: ReactNode
}) {
  // Una columna sin encabezado —la de los botones— no lleva rótulo y ocupa el
  // ancho entero de la tarjeta: "Acciones: [Anular]" no le dice nada a nadie.
  const conRotulo = Boolean(etiqueta?.trim())

  return (
    <td
      className={`px-4 py-2.5 max-lg:px-0 max-lg:py-1.5 ${
        conRotulo ? 'max-lg:flex max-lg:items-baseline max-lg:justify-between max-lg:gap-4' : 'max-lg:block'
      } ${numerica ? 't-cifra text-right' : ''} ${className ?? ''}`}
    >
      {/* ⚠️ **No lleva `aria-hidden`, y es a propósito.** Debajo de `lg` el
          `thead` está en `display:none`, así que los `<th>` salen del árbol de
          accesibilidad y la tabla se queda sin encabezados: este rótulo es el
          único que dice qué es el dato. Y no se duplica en escritorio, porque
          ahí el oculto es él (`lg:hidden`) y el que habla es el `<th>`. */}
      {conRotulo ? (
        <>
          <span className="t-mono shrink-0 text-tenue lg:hidden">{etiqueta}</span>
          {/* El dato va envuelto **sólo donde hay rótulo**, porque ahí el `<td>`
              es un flex de dos: sin este envoltorio, una celda con dos `<div>`
              —nombre arriba, mail abajo— se abriría en dos columnas al lado del
              rótulo. `contents` lo desaparece desde `lg`, así que en escritorio
              el `<td>` sigue siendo el contenedor de siempre.

              Donde NO hay rótulo no se envuelve nada: no hay flex que armar, y
              un `<span>` de más cambiaría el DOM de la columna de botones sin
              que nadie lo necesite. */}
          <span className="contents max-lg:block max-lg:min-w-0 max-lg:text-right">{children}</span>
        </>
      ) : (
        children
      )}
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
    // No usa `Fila`: no tiene columnas que rotular, y en chico tampoco es una
    // tarjeta —no hay fila que representar—, sino el aviso de que no hay ninguna.
    <tr className="max-lg:block max-lg:rounded-lg max-lg:border max-lg:border-linea max-lg:bg-superficie">
      <td
        colSpan={columnas}
        className="px-4 py-10 text-center text-sm text-apagado max-lg:block"
      >
        {children}
      </td>
    </tr>
  )
}
