import type { InputHTMLAttributes, ReactNode } from 'react'

/**
 * Un campo de formulario con su etiqueta y su error.
 *
 * Existe para que los quince formularios que vienen no repitan el mismo
 * marcado, y sobre todo para que el error de un campo se muestre SIEMPRE
 * pegado a su input. El backend devuelve los errores como un mapa
 * campo → mensaje justamente para poder hacer esto.
 */
type Props = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string
  error?: string
  ayuda?: ReactNode
}

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
        className={`mt-1.5 w-full rounded-md border bg-superficie px-3 py-2.5 text-sm outline-none transition-colors ${
          error ? 'border-red' : 'border-linea focus:border-red'
        }`}
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
        className={`mt-1.5 w-full rounded-md border bg-superficie px-3 py-2.5 text-sm outline-none transition-colors ${
          error ? 'border-red' : 'border-linea focus:border-red'
        }`}
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
