import type { ButtonHTMLAttributes } from 'react'

/**
 * El botón del sistema.
 *
 * Tenía dos variantes y el sistema usa tres. La que faltaba —la **acción en
 * línea**, la de *Anular*, *Ver ficha*, *Cerrar sesión*— estaba escrita a mano
 * **13 veces con cuatro grafías distintas**: algunas con `transition-colors`,
 * otras sin `underline-offset-2`, otras en `font-medium` sin `text-tenue`. No
 * es una diferencia que alguien haya elegido, es la que aparece sola cuando el
 * componente no cubre el caso y cada pantalla lo resuelve de nuevo.
 *
 * **Las tres son la misma jerarquía que ya tenía el sistema**, nombrada:
 *
 *   principal   una por pantalla: lo que la pantalla vino a hacer
 *   secundario  las otras acciones del encabezado
 *   enlace      la acción de UNA fila, adentro de una tabla o una tarjeta
 *
 * `enlace` no lleva relleno ni borde a propósito: en una tabla de treinta
 * filas, treinta botones con caja compiten con los datos que la tabla existe
 * para mostrar. Sigue siendo un `<button>` y no un `<a>` —no navega, ejecuta—,
 * que es lo que ya hacían las trece.
 */
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'principal' | 'secundario' | 'enlace'
  /** `chico` para lo que va dentro de una fila o una tarjeta. */
  tamaño?: 'normal' | 'chico'
}

const CAJA: Record<'normal' | 'chico', string> = {
  normal: 'rounded-md px-4 py-2.5 text-sm',
  chico: 'rounded-md px-3 py-1.5 text-xs',
}

export function Boton({
  variante = 'principal',
  tamaño = 'normal',
  className,
  children,
  ...boton
}: Props) {
  const estilo =
    variante === 'principal'
      ? // ⚠️ `bg-accion`, no `bg-ink`: la acción principal es la máxima
        // inversión contra el LIENZO, y cuál es depende del tema. En tinta fija
        // el botón medía 1,11:1 sobre una tarjeta oscura — se leía su texto
        // flotando, sin forma. El texto del hover se fija en hueso porque el
        // fondo pasa a ser rojo en los dos temas.
        `bg-accion text-accion-texto hover:bg-red hover:text-bone ${CAJA[tamaño]}`
      : variante === 'secundario'
        ? // El borde es la única forma de este botón, así que es un control y
          // no una separación: va `--linea-control` (3,3:1) y no `--linea`
          // (1,3:1). Ver el token en `index.css`.
          `border border-linea-control bg-superficie text-texto hover:border-red hover:text-acento ${CAJA[tamaño]}`
        : // La acción en línea. Sin caja, sin relleno: el subrayado es todo el
          // affordance, y alcanza porque vive pegada al dato sobre el que actúa.
          'text-xs text-tenue underline underline-offset-2 hover:text-acento'

  return (
    <button
      {...boton}
      className={`font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${estilo} ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

/** Cartel de error general, para lo que no corresponde a un campo puntual. */
export function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-acento"
    >
      {children}
    </p>
  )
}
