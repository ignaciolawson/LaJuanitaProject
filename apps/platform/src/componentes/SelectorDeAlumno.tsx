import { useEffect, useState } from 'react'

import { listarAlumnos } from '../api/administracion'
import { ApiError } from '../api/cliente'
import type { AlumnoResumen } from '../api/tiposAdmin'
import { Boton } from './Boton'
import { Campo } from './Campo'

/**
 * Buscador de alumno: elegir a uno que ya es alumno.
 *
 * Es un buscador y no un `<select>` con todos los alumnos adentro por lo mismo
 * que el listado pagina: con los ~80 del Notion una lista desplegable ya es
 * incómoda, y el día que sean 300 sería inusable **sin que nada se rompa** —
 * exactamente el modo de falla que la auditoría encontró en el listado (ARQ-01).
 *
 * ⚠️ **Salió de `InscripcionesPagina` a `componentes/` en §17 · H8, y el motivo
 * es un bug que nadie reportó porque no falla.** Tres formularios más —el pago
 * de un curso, el participante de una clase, el cliente de Mix & Mastering—
 * tenían un `<select>` cargado con `listarAlumnos({ pagina: 0 })`: **la primera
 * página, veinte filas**, y el alumno veintiuno no existía para ellos. Nada
 * avisaba: la lista se veía completa. Es el gemelo de `BuscadorDePersonas`,
 * para la otra tabla: éste busca alumnos, aquél cuentas.
 *
 * Busca contra el servidor, que es lo que pagina; arranca con la lista sin
 * filtrar para que el caso común —pocos alumnos— sea un click.
 *
 * ⚠️ **Esto elige PERSONAS, y por eso el calendario ya no lo usa** (P101).
 * Ahí lo que se elige es *quién toma la clase*, que desde `V35` es un curso —un
 * alumno solo o un grupo— y para eso está {@link SelectorDeCurso}. Acá quedan
 * los dos formularios donde lo que se elige **es** una persona: quién paga un
 * curso (Pagos) y a quiénes se inscribe (el alta de inscripción).
 *
 * <p>La fila dice **en qué grupo cursa** esa persona, y «grupo 8» es una
 * búsqueda válida. Eso viene de P96 y sobrevive a su corrección porque acá no
 * sustituye a nada: saber que alguien ya cursa en un grupo es justamente lo que
 * hace falta antes de inscribirlo otra vez —una sola abierta por disciplina,
 * `V35` §3— o de imputarle un pago que es del grupo.
 */
export function SelectorDeAlumno({
  elegido,
  onElegir,
  error,
  etiqueta = 'Alumno',
  autoFocus = true,
}: {
  elegido: AlumnoResumen | null
  onElegir: (alumno: AlumnoResumen | null) => void
  error?: string
  etiqueta?: string
  /** El alta de inscripción arranca acá y se lo lleva; un formulario más largo, no. */
  autoFocus?: boolean
}) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<AlumnoResumen[]>([])
  const [total, setTotal] = useState(0)
  const [fallo, setFallo] = useState<string | null>(null)

  useEffect(() => {
    if (elegido) return

    // `vigente`: el `clearTimeout` sólo cancela lo que todavía no salió, así que
    // con dos pedidos en vuelo el primero puede volver último y pisar los
    // resultados del texto que sí está escrito. Se ve como una lista que
    // parpadea y miente, sin error en ningún lado. Es la guarda que
    // `BuscadorDePersonas` tenía y este molde no.
    let vigente = true
    const id = setTimeout(async () => {
      try {
        const pagina = await listarAlumnos({ buscar: texto })
        if (!vigente) return
        setResultados(pagina.contenido)
        setTotal(pagina.totalElementos)
        setFallo(null)
      } catch (e) {
        if (!vigente) return
        setFallo(e instanceof ApiError ? e.message : 'No se pudo buscar el alumno.')
      }
    }, 250)

    return () => {
      vigente = false
      clearTimeout(id)
    }
  }, [texto, elegido])

  if (elegido) {
    return (
      <div>
        <span className="t-mono text-tenue">
          {etiqueta}<span className="ml-0.5 text-acento">*</span>
        </span>
        <div className="mt-1.5 flex items-center justify-between gap-3 rounded-md border border-linea bg-superficie-2 px-3 py-2.5 text-sm">
          <span>
            <strong className="font-medium">
              {elegido.apellido}, {elegido.nombre}
            </strong>
            <EtiquetaDeGrupo alumno={elegido} />
            <span className="ml-2 text-xs text-tenue">{elegido.email}</span>
          </span>
          <Boton variante="enlace"
            type="button"
            onClick={() => onElegir(null)}>
            Cambiar
          </Boton>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Campo
        etiqueta={etiqueta}
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar por nombre, apellido, email o «grupo 8»…"
        error={error ?? fallo ?? undefined}
        required
        autoFocus={autoFocus}
      />

      <ul className="mt-2 max-h-48 overflow-y-auto rounded-md border border-linea">
        {resultados.map((a) => (
          <li key={a.idAlumno}>
            <button
              type="button"
              onClick={() => onElegir(a)}
              className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-superficie-2"
            >
              <span className="font-medium">
                {a.apellido}, {a.nombre}
              </span>
              <EtiquetaDeGrupo alumno={a} />
              <span className="ml-2 text-xs text-tenue">{a.email}</span>
            </button>
          </li>
        ))}

        {resultados.length === 0 && (
          <li className="px-3 py-3 text-sm text-tenue">
            No hay alumnos que coincidan. Se dan de alta desde Alumnos.
          </li>
        )}
      </ul>

      {/* Sin este aviso, buscar "mar" y ver 20 resultados parece la lista
          completa. Es la misma lección del paginado: una lista corta no se
          reporta como rota. */}
      {total > resultados.length && (
        <p className="mt-1 text-xs text-apagado">
          Se muestran {resultados.length} de {total}. Afiná la búsqueda para ver el resto.
        </p>
      )}
    </div>
  )
}

/**
 * "Grupo 8" al lado del nombre, cuando el alumno cursa en grupo (P96).
 *
 * <p>Va con el nombre y no en una línea aparte porque **es parte de quién es**
 * para esta decisión: elegirlo a él es elegir a los tres. Con dos grupos —DJ y
 * producción— se dicen los dos: cuál descuenta lo decide el tipo de uso de la
 * reserva (`V22`) y la pantalla lo muestra un campo más abajo.
 */
function EtiquetaDeGrupo({ alumno }: { alumno: AlumnoResumen }) {
  if (alumno.grupos.length === 0) {
    return null
  }
  return (
    <span className="ml-2 rounded bg-superficie-2 px-1.5 py-0.5 text-xs text-tenue">
      {alumno.grupos.map((n) => `Grupo ${n}`).join(' · ')}
    </span>
  )
}
