import { useEffect, useRef } from 'react'

/**
 * Envuelve al panel que se abre por una acción y **lo trae a la vista**.
 *
 * ⚠️ **El problema que resuelve es que una acción parezca no haber hecho nada**
 * (Ignacio, 2026-09-20: *"pongo editar y se abre un layout arriba y no me doy
 * cuenta, tengo que subir para verlo"*). En este sistema el formulario de alta y
 * el de edición se dibujan **arriba del listado**, y el botón que los abre puede
 * estar veinte filas más abajo: el click cambia el estado, React dibuja el
 * formulario fuera de la pantalla, y quien lo apretó ve exactamente lo mismo que
 * antes. Es el peor modo de falla de una acción — no falla, no avisa, y lo
 * siguiente que hace la persona es volver a apretar.
 *
 * <p>Se resolvió una vez a mano en Deudores (§21 · L2 bis) y esto es esa misma
 * corrección **hecha una sola vez para todo el sistema**: son veinte pantallas
 * con la misma forma, y veinte copias de un `useEffect` son diecinueve que
 * alguien olvida.
 *
 * <p><b>Se apoya en el montaje y no en una dependencia</b>: en todas estas
 * pantallas el panel está detrás de un condicional (`{editando && …}`), así que
 * montarse **es** abrirse. Donde el panel se queda montado y sólo cambia de
 * contenido —el calendario, que reusa el formulario para otra reserva— ya hay un
 * `key` que lo vuelve a montar, puesto por otra razón y que acá sirve igual.
 *
 * <p><b>`block: 'nearest'` y no `'start'`</b>: mueve lo mínimo para que el panel
 * se vea y **no mueve nada si ya estaba a la vista**. Eso es lo que hace que
 * sirva también para los paneles que se abren en el lugar (el expediente de Mix
 * & Mastering, que reemplaza a la ficha donde estaba), donde un salto al tope
 * sería un tirón sin motivo.
 *
 * <p>⚠️ `scrollIntoView` no existe en jsdom: el `?.` no es defensivo de más, es
 * lo que hace que las suites no caigan.
 */
export function TraerALaVista({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const donde = useRef<HTMLDivElement>(null)

  useEffect(() => {
    donde.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  }, [])

  return (
    <div ref={donde} className={className}>
      {children}
    </div>
  )
}
