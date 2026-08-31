import type { ReactNode } from 'react'

import { Abanico } from './Abanico'

/**
 * Lo que se ve cuando una lista no tiene nada.
 *
 * Hoy hay trece de estos escritos a mano como un `<p>` gris suelto, y esa es
 * la razón de que exista: **una lista vacía sin diseño se lee como un error.**
 * Quien la mira no sabe si no hay datos, si filtró de más o si la pantalla no
 * cargó — y las tres cosas piden hacer algo distinto.
 *
 * ⚠️ **El texto lo pone la pantalla, siempre, y no hay uno por defecto.** Un
 * profesor sin alumnos asignados, una caja sin movimientos en el período y un
 * buscador sin resultados no son el mismo vacío ni piden la misma acción. Un
 * "No hay datos" genérico es lo que este componente viene a impedir, no a
 * facilitar.
 *
 * Es también uno de los tres lugares donde va el abanico —login, vacíos y
 * marca—: acá hay aire de sobra y el gesto de identidad no le compite a
 * ningún dato.
 */
export function EstadoVacio({
  titulo,
  children,
  accion,
  marca = true,
}: {
  /** Qué pasa, en una frase. "Todavía no hay alumnos cargados." */
  titulo: string
  /** Opcional: qué hacer al respecto, o por qué puede estar vacío. */
  children?: ReactNode
  /** Opcional: el botón que resuelve el vacío, cuando hay uno. */
  accion?: ReactNode
  /**
   * `false` para los vacíos chicos que viven dentro de un bloque de una
   * pantalla — ahí el abanico es ruido, no identidad.
   */
  marca?: boolean
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-linea bg-superficie px-6 py-12 text-center">
      {marca && <Abanico className="mb-5 h-10 w-auto text-linea" arco={false} />}

      <p className="t-seccion">{titulo}</p>

      {children && <p className="mt-2 max-w-prose text-sm text-tenue">{children}</p>}

      {accion && <div className="mt-5">{accion}</div>}
    </div>
  )
}
