import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'principal' | 'secundario'
}

export function Boton({ variante = 'principal', className, children, ...boton }: Props) {
  const estilo =
    variante === 'principal'
      ? 'bg-ink text-bone hover:bg-red'
      : 'border border-linea bg-white text-ink hover:border-red hover:text-acento'

  return (
    <button
      {...boton}
      className={`rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${estilo} ${className ?? ''}`}
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
