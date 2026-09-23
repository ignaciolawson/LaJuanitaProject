import type { ReactNode } from 'react'

/**
 * Lo que no se puede volver tarjeta y por eso sigue deslizándose al costado.
 *
 * Después de la Etapa 1 quedan **exactamente dos** envoltorios con scroll
 * horizontal en toda la plataforma, y los dos son mapas y no listados: la
 * grilla semanal de `/admin/reservas` y la de ocupación del tablero. Una tabla
 * se pudo apilar en tarjetas porque cada fila es una cosa; acá las columnas
 * *son* el dato —los días de la semana, las franjas del día—, así que apilarlas
 * destruye lo que la pantalla viene a mostrar.
 *
 * ⚠️ **El problema no era que desbordaran: es que nada lo decía.** Los dos ya
 * tenían su `overflow-x-auto` con un ancho mínimo adentro, así que en un
 * teléfono se arrastran perfecto — pero un scroll anidado dentro de una página
 * que ya scrollea en vertical, sin barra visible (los navegadores de teléfono
 * la ocultan) y con el borde de la tarjeta cortando el contenido, se lee como
 * *"la pantalla está cortada"* y no como *"hay más para este lado"*. La medición
 * de la §26 lo había anotado al revés —decía que las columnas se encogían a
 * 44px— porque nunca miró el `min-w` del envoltorio.
 *
 * ⚠️ **La aclaración se dice con palabras y no con una sombra en el borde**, y
 * eso es a propósito. Una sombra que no sigue la posición del scroll sigue
 * diciendo *"hay más"* cuando ya llegaste al final, o sea miente; seguirla pide
 * medir `scrollWidth` contra `clientWidth`, y **jsdom devuelve 0 en los dos**,
 * así que sería justo la clase de affordance que ninguna prueba puede mirar y
 * que en las pruebas se renderiza al revés que en el navegador.
 *
 * ⚠️ **`hasta` no es decorativo: cada deslizable desborda a un ancho distinto**,
 * y una aclaración que aparece donde no hay nada que arrastrar es tan mala como
 * la que falta. Se calcula contra el ancho útil, que es el viewport menos el
 * `px-4`/`sm:px-6`/`lg:px-8` del `Layout` (y, desde `lg`, menos los 240px de la
 * columna).
 *
 * <p>⚠️ Y el `tabIndex={0}` tampoco es de más: una región que scrollea tiene que
 * poder recibir el foco o con el teclado no hay forma de llegar a la mitad
 * derecha de la semana (WCAG 2.1.1). Es la misma razón por la que el hueco del
 * calendario es un `<button>` y no un `onClick` sobre la celda.
 */
type Props = {
  /**
   * El primer breakpoint en el que este deslizable **deja de desbordar**, o sea
   * donde la aclaración se oculta porque ya no es cierta.
   *
   * <p>`lg` es el calendario: `min-w-3xl` son 768px, y el contenido llega a eso
   * recién a los ~1072px de viewport (768 + los 240 de la columna + los 64 del
   * `lg:px-8`). ⚠️ O sea que **entre 1024 y 1071 todavía desborda sin decirlo**;
   * se acepta a sabiendas porque ahí ya hay mouse y barra de scroll visible, y
   * la alternativa —un `min-[1072px]:hidden`— es un número calculado a mano que
   * queda desincronizado el día que alguien toque el `min-w` o el ancho de la
   * columna. El breakpoint del sistema no se desincroniza.
   *
   * <p>`sm` es la grilla del tablero: `min-w-[32rem]` son 512px contra los ~560
   * que quedan a los 640px de viewport.
   */
  hasta: 'sm' | 'lg'
  /** Qué hay para este lado, en dos palabras: *"la semana"*, *"el día entero"*. */
  que: string
  /** El chrome de la tarjeta, que lo pone quien lo usa: no todos son iguales. */
  className?: string
  children: ReactNode
}

/**
 * Tailwind necesita la clase escrita entera para emitirla, así que esto es una
 * tabla y no un `` `${hasta}:hidden` ``. Un template literal acá compila, pasa
 * las pruebas y **no genera ninguna regla**: la aclaración no se ocultaría nunca.
 */
const OCULTA_DESDE: Record<Props['hasta'], string> = {
  sm: 'sm:hidden',
  lg: 'lg:hidden',
}

export function DeslizableAlCostado({ hasta, que, className, children }: Props) {
  const aclaracion = `Deslizá al costado para ver ${que}`

  return (
    <div>
      <p className={`t-mono mb-2 text-tenue ${OCULTA_DESDE[hasta]}`}>↔ {aclaracion}</p>
      <div
        role="region"
        aria-label={aclaracion}
        tabIndex={0}
        className={`overflow-x-auto ${className ?? ''}`}
      >
        {children}
      </div>
    </div>
  )
}
