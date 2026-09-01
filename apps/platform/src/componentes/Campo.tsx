import type { InputHTMLAttributes, ReactNode } from 'react'
import { CONTROL_DE_FORMULARIO } from './controles'

/**
 * Un campo de formulario con su etiqueta y su error.
 *
 * Existe para que los quince formularios que vienen no repitan el mismo
 * marcado, y sobre todo para que el error de un campo se muestre SIEMPRE
 * pegado a su input. El backend devuelve los errores como un mapa
 * campo → mensaje justamente para poder hacer esto.
 *
 * **El campo es una línea, no una caja** (Fase 3.1). Era una caja redondeada con
 * borde —el formulario genérico de cualquier panel— y ahora es el mismo lenguaje
 * que la landing: una línea inferior que se enciende en rojo al enfocarse, más
 * cerca de una planilla de estudio que de un formulario de SaaS. En una pantalla
 * de carga la caja además pesa de más: veinte bordes redondeados compiten con los
 * datos que uno vino a leer.
 */
type Props = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string
  error?: string
  ayuda?: ReactNode
}

/**
 * ⚠️ **Acá NO va `outline-none`, y antes iba.**
 *
 * `index.css` cierra con una regla escrita con todas las letras — *"el foco
 * visible no se saca nunca: esto lo van a usar personas que cargan datos con el
 * teclado todo el día"*— y define un `:focus-visible` de 2px. `outline-none` lo
 * anulaba y lo dejaba reemplazado por `focus:border-red`: navegando con teclado,
 * saber en qué campo estabas dependía de notar que una línea de 1px había
 * cambiado de tono.
 *
 * Es exactamente el mismo defecto que la landing ya había encontrado y corregido
 * en `Fields.tsx`; acá había sobrevivido. El cambio de borde se conserva, pero
 * como refuerzo del outline y no en su lugar.
 */
const BASE = `mt-1.5 ${CONTROL_DE_FORMULARIO}`

export function Campo({ etiqueta, error, ayuda, className, ...input }: Props) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="t-mono text-tenue">
        {etiqueta}
        {input.required && <span className="ml-0.5 text-acento">*</span>}
      </span>

      <input
        {...input}
        aria-invalid={error ? true : undefined}
        className={`${BASE} ${error ? 'border-red' : 'border-linea'}`}
      />

      {error && (
        <span role="alert" className="mt-1 block text-xs text-acento">
          {error}
        </span>
      )}
      {!error && ayuda && <span className="mt-1 block text-xs text-apagado">{ayuda}</span>}
    </label>
  )
}

/** Igual que Campo pero para un `<select>`. */
export function CampoSelect({
  etiqueta,
  error,
  children,
  className,
  ...select
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  etiqueta: string
  error?: string
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="t-mono text-tenue">{etiqueta}</span>
      <select
        {...select}
        aria-invalid={error ? true : undefined}
        className={`${BASE} ${error ? 'border-red' : 'border-linea'}`}
      >
        {children}
      </select>
      {error && (
        <span role="alert" className="mt-1 block text-xs text-acento">
          {error}
        </span>
      )}
    </label>
  )
}
