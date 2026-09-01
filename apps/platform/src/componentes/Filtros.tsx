import type { ReactNode } from 'react'

import { CONTROL_DE_FILTRO } from './controles'

/**
 * La barra de filtros de una pantalla de listado.
 *
 * **Estaba escrita a mano 30 veces en 16 pantallas** — el mismo `<input>` y el
 * mismo `<select>` con la misma cadena de clases copiada carácter por carácter,
 * flotando sueltos sobre el papel sin nada que los contenga. Es lo que más se
 * leía como "default" en administración: tres controles colgados en el aire
 * arriba de una tabla, sin ninguna señal de que sean lo que la filtra.
 *
 * **La franja es `--superficie-2`, igual que el título de un `Bloque` y que el
 * encabezado de una `Tabla`.** Eso es el sistema y no una coincidencia: en toda
 * la plataforma ese tono significa **"esto califica lo que sigue"**. Un filtro
 * con su propio tratamiento sería un tercer idioma para la misma idea.
 *
 * ⚠️ **Ningún control de acá decide nada solo.** Filtrar es del backend: estos
 * mandan el valor y la pantalla vuelve a pedir. Si alguna vez alguien filtra en
 * el cliente, el total del paginado empieza a mentir.
 */
export function Filtros({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-x-5 gap-y-3 rounded-lg border border-linea bg-superficie-2 px-4 py-3">
      {children}
    </div>
  )
}

/**
 * El buscador. Va primero y crece: es el filtro que más se usa y el único cuyo
 * valor no se puede adivinar de una lista.
 */
export function FiltroTexto({
  etiqueta,
  valor,
  onCambio,
  placeholder,
  className = 'min-w-64 flex-1',
}: {
  /** Se dice en voz alta para el lector de pantalla; en pantalla lo dice el placeholder. */
  etiqueta: string
  valor: string
  onCambio: (valor: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={className}>
      <input
        type="search"
        aria-label={etiqueta}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        className={CONTROL_DE_FILTRO}
      />
    </div>
  )
}

/**
 * Un filtro de lista.
 *
 * **La primera opción es siempre "todos", y es la que se ve cuando no hay nada
 * filtrado.** Por eso el control no lleva rótulo visible: la opción elegida ya
 * dice qué es ("Todos los estados", "Las dos monedas"). El nombre va en
 * `etiqueta` para quien no ve la pantalla.
 */
export function FiltroSelect({
  etiqueta,
  valor,
  onCambio,
  children,
  className = 'min-w-44',
}: {
  etiqueta: string
  valor: string
  onCambio: (valor: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <select
        aria-label={etiqueta}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        className={CONTROL_DE_FILTRO}
      >
        {children}
      </select>
    </div>
  )
}

/**
 * Un filtro de fecha, con su rótulo visible.
 *
 * Acá el rótulo SÍ va: un campo de fecha vacío no dice si es "desde" o "hasta",
 * y con dos al lado la única forma de saber cuál es cuál es probando. Es la
 * excepción a la regla de arriba y la razón está en la diferencia: una lista
 * muestra su opción elegida, una fecha vacía no muestra nada.
 */
export function FiltroFecha({
  etiqueta,
  valor,
  onCambio,
}: {
  etiqueta: string
  valor: string
  onCambio: (valor: string) => void
}) {
  return (
    <label className="block">
      <span className="t-mono text-tenue">{etiqueta}</span>
      <input
        type="date"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        className={`mt-1 ${CONTROL_DE_FILTRO}`}
      />
    </label>
  )
}
