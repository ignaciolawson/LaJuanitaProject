import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { listarInscripciones, obtenerAlumno } from '../api/administracion'
import { ApiError } from '../api/cliente'
import type { AlumnoResumen, EstadoInscripcion, InscripcionResumen } from '../api/tiposAdmin'
import { Aviso } from '../componentes/Boton'
import { Paginado } from '../componentes/Paginado'
import { NOMBRE_DE_DISCIPLINA, capitalizar } from '../componentes/presentacion'

/**
 * Módulo 1, pantalla 3 — el perfil del alumno.
 *
 * **De los seis bloques que pide `platform.md` §4, esta pantalla puede construir
 * dos.** Datos e inscripciones se arman con endpoints que existen; historial de
 * clases, estado de cuenta y notas/materiales dependen de `reserva`, `pago` y
 * `nota_profesor`, que llegan con los módulos 2, 3 y 5.
 *
 * Los tres que faltan **se dibujan igual, dichos**, en vez de omitirse. Es la
 * misma decisión que toma `menu.ts` con las secciones todavía no construidas: un
 * bloque ausente se lee como que el sistema perdió el dato, y uno que dice
 * "llega con el Módulo 2" se lee como lo que es.
 */
export function AlumnoPerfilPagina() {
  const { id } = useParams()
  const idAlumno = Number(id)

  const [alumno, setAlumno] = useState<AlumnoResumen | null>(null)
  const [inscripciones, setInscripciones] = useState<InscripcionResumen[]>([])
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [totalInscripciones, setTotalInscripciones] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!Number.isInteger(idAlumno) || idAlumno <= 0) {
      setError('Esa dirección no corresponde a ningún alumno.')
      setCargando(false)
      return
    }

    setCargando(true)
    setError(null)
    try {
      // En paralelo: son dos preguntas independientes y encadenarlas solo suma
      // el tiempo de una a la otra.
      const [ficha, cursos] = await Promise.all([
        obtenerAlumno(idAlumno),
        listarInscripciones({ idAlumno, pagina }),
      ])
      setAlumno(ficha)
      setInscripciones(cursos.contenido)
      setTotalPaginas(cursos.totalPaginas)
      setTotalInscripciones(cursos.totalElementos)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el alumno.')
    } finally {
      setCargando(false)
    }
  }, [idAlumno, pagina])

  useEffect(() => {
    void cargar()
  }, [cargar])

  if (error) {
    return (
      <div>
        <Volver />
        <Aviso>{error}</Aviso>
      </div>
    )
  }

  if (cargando || !alumno) {
    return (
      <div>
        <Volver />
        <p className="text-sm text-tenue">Cargando…</p>
      </div>
    )
  }

  return (
    <div>
      <Volver />

      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">
          {alumno.nombre} {alumno.apellido}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-tenue">
          <span>{capitalizar(alumno.estadoAlumno)} desde el {fecha(alumno.fechaIngreso)}</span>
          {/* Dos ejes distintos: el alumno puede estar activo y la cuenta dada
              de baja. Si no se dice, "activo" parece significar que entra. */}
          {!alumno.usuarioActivo && (
            <span className="rounded-full border border-red/40 px-2 py-0.5 text-[11px] uppercase tracking-wide text-red">
              Cuenta desactivada
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Bloque titulo="Datos">
          <Dato etiqueta="Email" valor={alumno.email} />
          <Dato etiqueta="Teléfono" valor={alumno.telefono} />
          <Dato etiqueta="Instagram" valor={alumno.instagram} />
          <Dato
            etiqueta="Nivel de ingreso"
            valor={alumno.nivelIngreso ? capitalizar(alumno.nivelIngreso) : null}
          />
        </Bloque>

        <Bloque titulo="Cursando hoy">
          {alumno.disciplinas.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {alumno.disciplinas.map((d) => (
                <li key={d}>{NOMBRE_DE_DISCIPLINA[d]}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-apagado">
              No tiene ninguna inscripción vigente.
            </p>
          )}
        </Bloque>
      </div>

      <h3 className="mb-3 mt-8 font-semibold">
        Inscripciones{' '}
        <span className="font-normal text-tenue">({totalInscripciones})</span>
      </h3>

      {/* Todas, no solo las vigentes: acá es donde vive el "recorrido formativo,
          niveles completados" que pide el Módulo 1. El listado de alumnos hace
          lo contrario y filtra por vigentes, porque contesta otra pregunta. */}
      <div className="overflow-x-auto rounded-lg border border-linea bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linea text-left text-xs uppercase tracking-wider text-tenue">
              <th className="px-4 py-3 font-semibold">Curso</th>
              <th className="px-4 py-3 font-semibold">Profesor</th>
              <th className="px-4 py-3 font-semibold">Clases</th>
              <th className="px-4 py-3 font-semibold">Inicio</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {inscripciones.map((i) => (
              <tr key={i.idInscripcion}>
                <td className="px-4 py-3">
                  <div>{NOMBRE_DE_DISCIPLINA[i.disciplina]}</div>
                  <div className="text-xs text-tenue">
                    {i.nivel ? capitalizar(i.nivel) : 'Sin nivel'}
                  </div>
                </td>
                <td className="px-4 py-3 text-tenue">
                  {i.profesor ?? <span className="text-apagado">Sin asignar</span>}
                </td>
                {/* Las clases restantes son POR INSCRIPCIÓN y no hay un total:
                    nadie "tiene 5 clases", tiene 5 de DJ y 3 de mentoría. Es el
                    mismo razonamiento de §3.3 con el estado de pago — un número
                    único de algo que vive abajo miente. */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-medium">{`${i.clasesRestantes} de ${i.clasesContratadas}`}</div>
                  <div className="text-xs text-tenue">clases restantes</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-tenue">
                  {i.fechaInicio ? fecha(i.fechaInicio) : <span className="text-apagado">A acordar</span>}
                </td>
                <td className="px-4 py-3">
                  <EtiquetaEstado estado={i.estado} />
                </td>
              </tr>
            ))}

            {inscripciones.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-tenue">
                  Este alumno todavía no tiene ninguna inscripción.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginado
        pagina={pagina}
        totalPaginas={totalPaginas}
        totalElementos={totalInscripciones}
        onCambiar={setPagina}
      />

      <Pendientes />
    </div>
  )
}

function Volver() {
  return (
    <Link
      to="/admin/alumnos"
      className="mb-4 inline-block text-sm text-tenue underline underline-offset-2 transition-colors hover:text-red"
    >
      ← Volver a Alumnos
    </Link>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-linea bg-white p-5">
      <h3 className="mb-3 font-semibold">{titulo}</h3>
      {children}
    </section>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <p className="mb-2 text-sm last:mb-0">
      <span className="text-xs uppercase tracking-wider text-tenue">{etiqueta}: </span>
      {valor ?? <span className="text-apagado">—</span>}
    </p>
  )
}

function EtiquetaEstado({ estado }: { estado: EstadoInscripcion }) {
  const estilo = {
    ACTIVA: 'border-ink/20 text-ink',
    COMPLETADA: 'border-linea text-apagado',
    PAUSADA: 'border-linea text-apagado',
    CANCELADA: 'border-red/40 text-red',
  }[estado]

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${estilo}`}>
      {capitalizar(estado)}
    </span>
  )
}

/**
 * Los tres bloques del perfil que todavía no existen, nombrados.
 *
 * Se dicen en vez de omitirse porque quien abre el perfil buscando el historial
 * de clases y no lo encuentra no puede distinguir "el sistema no lo tiene
 * todavía" de "el sistema perdió el dato". Cada uno nombra el módulo que lo
 * trae, así el cartel también sirve de estado de avance.
 */
function Pendientes() {
  const faltan = [
    ['Historial de clases', 'Módulo 2 — Horarios y salas'],
    ['Estado de cuenta', 'Módulo 3 — Pagos'],
    ['Notas de profesores y materiales', 'Módulo 5 — Portal del profesor'],
  ]

  return (
    <section className="mt-8 rounded-lg border border-dashed border-linea p-5">
      <h3 className="mb-1 text-sm font-semibold text-tenue">Todavía no disponible</h3>
      <p className="mb-3 text-xs text-apagado">
        El perfil completo incluye estas tres secciones. Cada una necesita un módulo que
        todavía no se construyó.
      </p>
      <ul className="space-y-1 text-sm text-tenue">
        {faltan.map(([que, cuando]) => (
          <li key={que}>
            {que} <span className="text-xs text-apagado">— {cuando}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** `2026-09-01` → `01/09/2026`, sin pasar por `Date` para no correr un día. */
function fecha(iso: string): string {
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}
