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
 *
 * ⚠️ **Los tres miden 44px de alto en pantalla chica y vuelven a lo suyo desde
 * `lg`** (P108, §26 · Etapa 2). Medido antes de tocar nada: `normal` daba 40px,
 * `chico` 28 y **`enlace` unos 16** — y `enlace` es *Cobrar*, *Editar*,
 * *Anular*, o sea **la acción de casi toda fila del sistema**, 38 usos. Con el
 * dedo, 16px no es un control: es una posibilidad de errarle.
 *
 * **Va como `min-h-11` y no como más relleno**, que es lo que evita la cuenta
 * que este archivo ya hacía mal de memoria: `py-2.5` con `text-sm` da 40 y no
 * 44, y con `text-xs` da 36. La altura se pide, no se deduce. El `inline-flex`
 * es lo que centra el texto dentro de esa altura; desde `lg` el `min-h-0` la
 * devuelve al relleno de siempre y **en escritorio no cambia un píxel**.
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

/**
 * El área tocable mínima, sólo donde se toca con el dedo. `inline-flex` para
 * centrar el texto dentro de ella sin sacar al botón del flujo en línea, que es
 * donde viven los `enlace`.
 */
const TOCABLE = 'inline-flex items-center justify-center min-h-11 lg:min-h-0'

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
      className={`font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${TOCABLE} ${estilo} ${className ?? ''}`}
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
