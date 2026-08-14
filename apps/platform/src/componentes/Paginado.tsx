import { Boton } from './Boton'

/**
 * El control que faltaba: el backend paginaba y el front nunca pedía la página
 * siguiente.
 *
 * Las dos pantallas mostraban el TOTAL en el encabezado y las primeras 20 filas
 * en la tabla, sin ningún control y sin ningún error. Con dos usuarios no se
 * notaba; con los ~80 alumnos del Notion, la pantalla iba a decir "80 alumnos"
 * y listar 20 — no como una lista rota, sino como una lista corta, que es peor
 * porque nadie la reporta.
 *
 * Sale como componente desde el principio porque Reservas y Pagos lo van a
 * necesitar igual.
 */
export function Paginado({
  pagina,
  totalPaginas,
  totalElementos,
  onCambiar,
}: {
  pagina: number
  totalPaginas: number
  totalElementos: number
  onCambiar: (pagina: number) => void
}) {
  // Con una sola página el control no aporta nada y ocupa lugar.
  if (totalPaginas <= 1) return null

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-sm text-tenue">
        Página {pagina + 1} de {totalPaginas} · {totalElementos} en total
      </p>

      <div className="flex gap-2">
        <Boton
          variante="secundario"
          onClick={() => onCambiar(pagina - 1)}
          disabled={pagina === 0}
        >
          Anterior
        </Boton>
        <Boton
          variante="secundario"
          onClick={() => onCambiar(pagina + 1)}
          disabled={pagina >= totalPaginas - 1}
        >
          Siguiente
        </Boton>
      </div>
    </div>
  )
}
