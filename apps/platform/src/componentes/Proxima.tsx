import { cuandoEnPalabras, fechaLarga, hhmm } from './semana'

/**
 * Lo próximo que tenés: la pieza de arriba del portal.
 *
 * **Un renglón más de una lista no contesta la pregunta con la que alguien
 * entra.** Un alumno abre "Mis reservas" para saber *cuándo es la próxima*, no
 * para leer catorce filas ordenadas por fecha — y eso, en la versión anterior,
 * era la primera fila de una lista donde todas pesaban igual. Acá la respuesta
 * está antes que la lista y en el tamaño que le corresponde.
 *
 * **Lo más grande es cuándo, en palabras.** "Mañana" se lee sin pensar; "03/09"
 * obliga a acordarse de qué día es hoy. La fecha exacta va abajo, chica, porque
 * es la confirmación y no la respuesta.
 */
export function Proxima({
  fecha,
  horaInicio,
  horaFin,
  titulo,
  detalle,
  hoy,
  className = '',
}: {
  fecha: string
  horaInicio: string
  horaFin: string
  /** Qué es: "Clase de DJ", "Alquiler de cabina". */
  titulo: string
  /** Sala, profesor, con quién. */
  detalle?: string
  /**
   * El día de hoy, en ISO.
   *
   * ⚠️ **Entra por parámetro y no se calcula acá adentro.** Es la lección de
   * `CajaPagina`: una pantalla que lee el reloj por su cuenta tiene un caso que
   * sólo falla algunos días del año, y no hay forma de escribirle una prueba.
   */
  hoy: string
  className?: string
}) {
  return (
    <section
      className={`grano-shell relative overflow-hidden rounded-lg bg-shell px-6 py-5 text-shell-texto ${className}`}
    >
      <p className="t-mono relative text-shell-tenue">Lo próximo</p>

      <div className="relative mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="t-titulo text-2xl">{cuandoEnPalabras(fecha, hoy)}</p>
        <p className="t-cifra text-lg text-shell-texto">
          {hhmm(horaInicio)} a {hhmm(horaFin)}
        </p>
      </div>

      <p className="relative mt-3 text-sm">
        {titulo}
        {detalle && <span className="text-shell-tenue"> · {detalle}</span>}
      </p>

      <p className="t-mono relative mt-1.5 text-shell-tenue">{fechaLarga(fecha)}</p>
    </section>
  )
}
