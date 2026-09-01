import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/cliente'
import { misCursos } from '../api/portal'
import type { ProgresoDelCurso } from '../api/tiposPortal'
import { Aviso } from '../componentes/Boton'
import { NOMBRE_DE_DISCIPLINA, capitalizar } from '../componentes/presentacion'
import { Bloque } from '../componentes/Bloque'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { EstadoVacio } from '../componentes/EstadoVacio'
import { Progreso } from '../componentes/Progreso'

/**
 * Módulo 4 — mi progreso.
 *
 * **Las clases restantes no salen de ninguna columna**: son una resta contra las
 * clases efectivamente dictadas, y la cuenta la hace el servidor con la misma
 * consulta que usa la pantalla de administración. Si acá se calculara aparte,
 * habría dos números para lo mismo y el alumno leería que le quedan tres clases
 * mientras la base rechaza la próxima.
 *
 * **Una inscripción PAUSADA se muestra igual**, con su estado a la vista: sigue
 * teniendo clases debidas, y esconderla es esconderle a la persona lo que le
 * queda por cursar.
 */
export function MisCursosPagina() {
  const [cursos, setCursos] = useState<ProgresoDelCurso[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    misCursos()
      .then((datos) => {
        if (vigente) setCursos(datos)
      })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof ApiError ? e.message : 'No se pudieron cargar tus cursos.')
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
        titulo="Mis cursos"
        aclaracion={<>Tu nivel y cuántas clases te quedan.</>}
      />

      {cursos.length === 0 && (
        <EstadoVacio titulo="Todavía no estás inscripto en ningún curso." />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {cursos.map((c) => (
          <Bloque
            key={c.idInscripcion}
            titulo={NOMBRE_DE_DISCIPLINA[c.disciplina]}
            accion={
              c.estado !== 'ACTIVA' ? (
                <span className="t-mono text-tenue">{capitalizar(c.estado)}</span>
              ) : undefined
            }
          >
            {/* El número grande es LO QUE FALTA y no lo que se hizo: la
                pregunta con la que un alumno entra acá es "¿cuánto me queda?".
                Lo tomado va abajo, chico, porque es el contexto de esa cifra. */}
            <p className="t-dato">{c.clasesRestantes}</p>
            <p className="mt-1 text-sm text-tenue">
              {c.clasesRestantes === 1 ? 'clase por delante' : 'clases por delante'}
            </p>

            <Progreso
              className="mt-5"
              hechas={c.clasesConsumidas}
              total={c.clasesContratadas}
            />

            <p className="mt-2.5 text-xs text-tenue">
              Tomaste {c.clasesConsumidas} de {c.clasesContratadas}
            </p>

            <p className="mt-4 border-t border-linea pt-3 text-xs text-tenue">
              {c.nivel ? capitalizar(c.nivel) : 'Sin nivel asignado'}
              {c.profesor && ` · con ${c.profesor}`}
            </p>
          </Bloque>
        ))}
      </div>

      {/* Esto era el bloque "todavía no disponible" que el Módulo 4 dejó
          nombrado. Llegó el Módulo 5 y ahora apunta a la pantalla real: el
          cartel se reemplaza por el camino, no se borra —el alumno que lo leyó
          alguna vez sigue buscando sus materiales acá. */}
      <Bloque titulo="Materiales de clase" className="mt-8">
        <p className="text-sm text-tenue">
          Los que subieron tus profesores están en{' '}
          <Link to="/mis-materiales" className="underline underline-offset-2 hover:text-acento">
            Mis materiales
          </Link>
          .
        </p>
      </Bloque>
    </div>
  )
}
