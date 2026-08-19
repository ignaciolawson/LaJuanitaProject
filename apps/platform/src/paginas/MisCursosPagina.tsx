import { useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import { misCursos } from '../api/portal'
import type { ProgresoDelCurso } from '../api/tiposPortal'
import { Aviso } from '../componentes/Boton'
import { NOMBRE_DE_DISCIPLINA, capitalizar } from '../componentes/presentacion'

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
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Mis cursos</h2>
        <p className="mt-1 text-sm text-tenue">Tu nivel y cuántas clases te quedan.</p>
      </div>

      {cursos.length === 0 && (
        <p className="rounded-lg border border-linea bg-white px-5 py-8 text-center text-sm text-tenue">
          Todavía no estás inscripto en ningún curso.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {cursos.map((c) => (
          <article key={c.idInscripcion} className="rounded-lg border border-linea bg-white p-5">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{NOMBRE_DE_DISCIPLINA[c.disciplina]}</h3>
                <p className="text-xs text-tenue">
                  {c.nivel ? capitalizar(c.nivel) : 'Sin nivel asignado'}
                  {c.profesor && ` · con ${c.profesor}`}
                </p>
              </div>
              {c.estado !== 'ACTIVA' && (
                <span className="rounded-full border border-linea px-2 py-0.5 text-xs text-tenue">
                  {capitalizar(c.estado)}
                </span>
              )}
            </header>

            <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums">
              {c.clasesRestantes}
            </p>
            <p className="text-xs text-tenue">
              {c.clasesRestantes === 1 ? 'clase por delante' : 'clases por delante'} · tomaste{' '}
              {c.clasesConsumidas} de {c.clasesContratadas}
            </p>

            <div
              className="mt-4 h-1.5 overflow-hidden rounded-full bg-linea"
              role="presentation"
            >
              <div
                className="h-full bg-ink"
                style={{
                  width: `${Math.round((c.clasesConsumidas / c.clasesContratadas) * 100)}%`,
                }}
              />
            </div>
          </article>
        ))}
      </div>

      {/* Módulo 5. Se nombra en vez de omitirse: un bloque que falta se lee como
          "el sistema perdió los datos", uno etiquetado se lee como "todavía no
          está". Es el mismo criterio de la ficha del alumno. */}
      <section className="mt-8 rounded-lg border border-dashed border-linea px-5 py-6">
        <h3 className="text-sm font-semibold">Materiales de clase</h3>
        <p className="mt-1 text-sm text-tenue">
          Todavía no disponible. Los sube tu profesor y llega con el portal del
          profesor (Módulo 5).
        </p>
      </section>
    </div>
  )
}
