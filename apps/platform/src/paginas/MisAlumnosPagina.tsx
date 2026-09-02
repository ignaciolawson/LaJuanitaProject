import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/cliente'
import { misAlumnos } from '../api/docencia'
import type { AlumnoDelProfesor } from '../api/tiposDocencia'
import { Aviso } from '../componentes/Boton'
import { Semaforo } from '../componentes/Semaforo'
import { NOMBRE_DE_DISCIPLINA } from '../componentes/presentacion'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { EstadoVacio } from '../componentes/EstadoVacio'

/**
 * Módulo 5, pantalla 2 — mis alumnos.
 *
 * **Es una lista de trabajo, no una agenda de contactos.** Por eso no trae
 * teléfono ni email: los datos de contacto son de administración, que es quien
 * llama cuando alguien deja de venir. Acá el profesor mira dos cosas —cómo va
 * cada uno y cuánto le queda— y entra a la ficha a anotar.
 *
 * **Quién aparece son dos caminos**, y conviene que la pantalla lo diga: los de
 * una inscripción asignada a mí, **y** los de cualquier clase que yo haya
 * dictado. El segundo es el del suplente, que es justo cuando más falta hace
 * poder dejar la nota de esa clase.
 */
export function MisAlumnosPagina() {
  const [alumnos, setAlumnos] = useState<AlumnoDelProfesor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    misAlumnos()
      .then((datos) => {
        if (vigente) setAlumnos(datos)
      })
      .catch((e: unknown) => {
        if (vigente) {
          setError(e instanceof ApiError ? e.message : 'No se pudieron cargar tus alumnos.')
        }
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [])

  if (cargando) return <p className="text-sm text-tenue">Cargando…</p>
  if (error) return <Aviso>{error}</Aviso>

  return (
    <div>
      <CabeceraDePagina
        titulo="Mis alumnos"
        aclaracion={<>Los de tus cursos y los de las clases que diste. Entrá a cada uno para ver
          tus notas y marcar cómo viene.</>}
      />

      {alumnos.length === 0 && (
        <EstadoVacio titulo="Todavía no tenés alumnos.">
          Aparecen acá cuando te asignan una inscripción o cuando das una clase.
        </EstadoVacio>
      )}

      <ul className="space-y-3">
        {alumnos.map((a) => (
          <li key={a.idAlumno}>
            <Link
              to={`/mis-alumnos/${a.idAlumno}`}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-linea bg-superficie shadow-tarjeta px-5 py-4 transition-colors hover:border-red"
            >
              <div className="min-w-40 grow">
                <div className="font-medium">
                  {a.nombre} {a.apellido}
                </div>
                <div className="text-xs text-tenue">
                  {/* Sale de `cursos`, que desde `V23` trae el id de cada
                      inscripción además de su disciplina: es el mismo dato que
                      antes viajaba suelto como `disciplinas`. */}
                  {a.cursos.length === 0
                    ? 'Sin curso vigente'
                    : a.cursos.map((c) => NOMBRE_DE_DISCIPLINA[c.disciplina]).join(' · ')}
                </div>
              </div>

              <div className="w-40 shrink-0">
                <Semaforo estado={a.estadoSeguimiento} />
              </div>

              <div className="w-24 shrink-0 text-right">
                <div className="font-semibold tabular-nums">{a.clasesRestantes}</div>
                <div className="text-xs text-tenue">
                  {a.clasesRestantes === 1 ? 'clase restante' : 'clases restantes'}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
