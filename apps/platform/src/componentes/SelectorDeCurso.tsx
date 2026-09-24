import { useEffect, useState } from 'react'

import { listarInscripciones } from '../api/administracion'
import { ApiError } from '../api/cliente'
import {
  enUnaLinea,
  nombreDeLaInscripcion,
  type Disciplina,
  type InscripcionResumen,
} from '../api/tiposAdmin'
import { Boton } from './Boton'
import { Campo } from './Campo'
import { NOMBRE_DE_DISCIPLINA } from './presentacion'

/**
 * Elegir **el curso que toma la clase**: un alumno solo, o un grupo.
 *
 * ⚠️ **Esto reemplaza a `SelectorDeAlumno` en el calendario, y la diferencia es
 * el modelo, no la ergonomía** (P101, Ignacio 2026-09-20: *"no quiero anotar a
 * Alvarez Julian — Grupo 41, quiero anotar AL GRUPO 41"*).
 *
 * <p>La versión anterior hacía elegir **una persona** y después ofrecía un
 * checkbox *"anotar a todo el grupo"*. Anotaba a los tres, así que el resultado
 * era el mismo — y aun así estaba mal, porque **decía otra cosa de la que
 * hacía**: presentaba al grupo como una propiedad de Julián en vez de como lo
 * que es. `V35` decidió que **el grupo ES el alumno** (P87); una pantalla que
 * obliga a entrar por uno de sus integrantes es la lectura vieja sobreviviendo
 * en la única parte del sistema donde todavía se la podía escribir.
 *
 * <p>Lo que se busca acá son **inscripciones**, que es exactamente la entidad
 * que `V35` definió: el contrato de 1 a 3 personas. Por eso una fila es
 * *"Grupo 41 · Álvarez Julián, Sosa Julieta y Rios Manuel"* o *"Pérez Juan"*,
 * con el mismo `nombreDeLaInscripcion()` que ya usan Inscripciones, el estado de
 * cuenta y el buzón: **un solo lugar decide cómo se llama un curso.**
 *
 * <p><b>Filtra por disciplina</b>, que es lo que el tipo de uso de la reserva
 * decide (`V22`), y sólo trae las **ACTIVA**: una pausada no recibe clases
 * (§12 · C1) y una terminada no descuenta nada. Eso hace desaparecer un caso
 * entero de la pantalla anterior —*"no tiene una inscripción vigente de DJ"*—
 * porque ahora **no se puede elegir lo que el backend iba a rechazar** (P39).
 * El vacío del buscador es el que lo dice.
 *
 * <p>Busca contra el servidor, que es lo que pagina, y **encuentra por el número
 * del grupo** además de por los nombres de sus integrantes (`Busqueda.numeroDeGrupo`).
 */
export function SelectorDeCurso({
  disciplina,
  elegido,
  onElegir,
  error,
  etiqueta = 'Quién',
  autoFocus = false,
}: {
  /** La del tipo de uso de la reserva. Sin ella no se ofrece nada: no es una clase. */
  disciplina: Disciplina | null
  elegido: InscripcionResumen | null
  onElegir: (curso: InscripcionResumen | null) => void
  error?: string
  etiqueta?: string
  autoFocus?: boolean
}) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<InscripcionResumen[]>([])
  const [total, setTotal] = useState(0)
  const [fallo, setFallo] = useState<string | null>(null)

  useEffect(() => {
    if (elegido || disciplina === null) return

    // La guarda de carrera: ver `SelectorDeAlumno`.
    let vigente = true
    const id = setTimeout(async () => {
      try {
        const pagina = await listarInscripciones({
          buscar: texto,
          disciplina,
          estado: 'ACTIVA',
        })
        if (!vigente) return
        setResultados(pagina.contenido)
        setTotal(pagina.totalElementos)
        setFallo(null)
      } catch (e) {
        if (!vigente) return
        setFallo(e instanceof ApiError ? e.message : 'No se pudo buscar el curso.')
      }
    }, 250)

    return () => {
      vigente = false
      clearTimeout(id)
    }
  }, [texto, elegido, disciplina])

  if (elegido) {
    return (
      <div>
        <span className="t-mono text-tenue">
          {etiqueta}
          <span className="ml-0.5 text-acento">*</span>
        </span>
        <div className="mt-1.5 flex items-center justify-between gap-3 rounded-md border border-linea bg-superficie-2 px-3 py-2.5 text-sm">
          <span className="min-w-0">
            <strong className="font-medium">{tituloDe(elegido)}</strong>
            {elegido.numeroGrupo !== null && (
              <span className="ml-2 text-xs text-tenue">{integrantesDe(elegido)}</span>
            )}
          </span>
          <Boton variante="enlace" type="button" onClick={() => onElegir(null)}>
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
        placeholder="Buscar por nombre o por «grupo 41»…"
        error={error ?? fallo ?? undefined}
        required
        autoFocus={autoFocus}
        disabled={disciplina === null}
      />

      <ul className="mt-2 max-h-48 overflow-y-auto rounded-md border border-linea">
        {resultados.map((i) => (
          <li key={i.idInscripcion}>
            <button
              type="button"
              onClick={() => onElegir(i)}
              className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-superficie-2"
            >
              <span className="font-medium">{tituloDe(i)}</span>
              <span className="ml-2 text-xs text-tenue">
                {/* Lo que decide si es el curso buscado: quiénes son y cuánto les
                    queda. El nivel va porque dos grupos de DJ se distinguen por
                    ahí antes que por el número. */}
                {i.numeroGrupo !== null && `${integrantesDe(i)} · `}
                {i.nivel ? `${i.nivel.toLowerCase()} · ` : ''}
                le{i.numeroGrupo !== null ? 's' : ''} quedan {i.clasesRestantes}
              </span>
            </button>
          </li>
        ))}

        {resultados.length === 0 && (
          <li className="px-3 py-3 text-sm text-tenue">
            {disciplina === null
              ? 'Elegí primero para qué se usa la sala.'
              : `No hay cursos de ${NOMBRE_DE_DISCIPLINA[disciplina]} que coincidan. Se inscriben desde Inscripciones.`}
          </li>
        )}
      </ul>

      {/* La misma lección del paginado: una lista corta no se reporta como rota. */}
      {total > resultados.length && (
        <p className="mt-1 text-xs text-apagado">
          Se muestran {resultados.length} de {total}. Afiná la búsqueda para ver el resto.
        </p>
      )}
    </div>
  )
}

/** "Grupo 41" o "Pérez, Juan": el nombre corto, para el renglón principal. */
function tituloDe(i: InscripcionResumen): string {
  if (i.numeroGrupo !== null) return `Grupo ${i.numeroGrupo}`
  const uno = i.integrantes[0]
  return uno ? `${uno.apellido}, ${uno.nombre}` : nombreDeLaInscripcion(i)
}

/** "Álvarez Julián, Sosa Julieta y Rios Manuel". */
function integrantesDe(i: InscripcionResumen): string {
  return enUnaLinea(i.integrantes.map((x) => `${x.nombre} ${x.apellido}`))
}
