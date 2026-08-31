import type { ReactNode } from 'react'

/**
 * El título de una pantalla, su aclaración y sus acciones.
 *
 * Está repetido a mano en las treinta y cuatro, con tres separaciones
 * distintas y dos formas de acomodar los botones. No es un problema estético:
 * cuando el título se mueve dos píxeles entre una pantalla y la siguiente, la
 * navegación entre ellas se siente entrecortada sin que nadie sepa por qué.
 *
 * **La aclaración es parte del contrato de esta pantalla, no decoración.** Es
 * donde el tablero dice *"al día de hoy, no del período"* y los cobros
 * pendientes dicen *"toda la deuda viva"*. Sin esa línea, alguien mira agosto,
 * ve la deuda y cree que se generó en agosto — que es la forma más barata que
 * tiene una pantalla de mentir sin que falle nada.
 *
 * **Es el `<h1>` de la pantalla**, desde que la barra superior de la aplicación
 * salió (Fase 3.1). Antes era `<h2>`, porque el `<h1>` del documento lo gastaba
 * un "Hola, Ignacio" que estaba fijo en las 36 pantallas: el nombre de la
 * pantalla —lo único que cambia y lo único que alguien busca— quedaba un nivel
 * más abajo que un saludo. Este archivo pedía revisar esa jerarquía "de una vez,
 * no de a una", y eso es lo que se hizo.
 */
export function CabeceraDePagina({
  titulo,
  aclaracion,
  acciones,
}: {
  titulo: string
  /** Qué contesta esta pantalla, o de qué período habla. */
  aclaracion?: ReactNode
  /** Los botones de la derecha. Ya vienen filtrados por quien la usa. */
  acciones?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="t-titulo">{titulo}</h1>
        {aclaracion && <p className="mt-1.5 text-sm text-tenue">{aclaracion}</p>}
      </div>

      {acciones && <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>}
    </div>
  )
}
