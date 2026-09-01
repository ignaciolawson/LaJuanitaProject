import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { ApiError } from '../api/cliente'
import {
  anotar,
  cambiarVisibilidad,
  corregirNota,
  fijarSeguimiento,
  miAgenda,
  misAlumnos,
  misMaterialesSubidos,
  misNotas,
} from '../api/docencia'
import type { ReservaResumen } from '../api/tiposAdmin'
import {
  NOMBRE_DE_SEGUIMIENTO,
  type AlumnoDelProfesor,
  type EstadoSeguimiento,
  type MaterialResumen,
  type NotaResumen,
} from '../api/tiposDocencia'
import { Aviso, Boton } from '../componentes/Boton'
import { CONTROL_DE_FILTRO } from '../componentes/controles'
import { CampoSelect } from '../componentes/Campo'
import { Semaforo } from '../componentes/Semaforo'
import { NOMBRE_DE_DISCIPLINA, cuando } from '../componentes/presentacion'
import { diaYMes, hhmm, hoy, sumarDias } from '../componentes/semana'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { EstadoVacio } from '../componentes/EstadoVacio'

/** Cuánto atrás se buscan clases para poder colgarles una nota. */
const DIAS_DE_CLASES_RECIENTES = 60

/**
 * Módulo 5, pantalla 3 — la ficha de un alumno mío.
 *
 * Tres bloques sobre la misma persona: **el semáforo**, **mis notas** y **el
 * material que le subí**. Están juntos porque se usan juntos: se mira cómo
 * viene, se anota lo de la clase de hoy y se le deja el track.
 *
 * **De dónde sale el alumno**: no hay endpoint de "traeme la ficha de este
 * alumno", y no falta — la lista de Mis alumnos ya trae todo lo que este
 * encabezado necesita, y buscar ahí adentro tiene la propiedad de que **un id
 * que no es mío no aparece**, que es exactamente la respuesta correcta. El
 * backend contesta igual por su lado: pedir las notas de un alumno ajeno vuelve
 * como "no existe", nunca como "no podés" — confirmar que existe ya diría algo.
 *
 * ⚠️ **Las notas son privadas de quien las escribe.** Esta pantalla es la única
 * que las muestra; no las ve el alumno ni otro profesor. Si algún día aparece un
 * `NotaResumen` importado desde una pantalla del portal del alumno, es un error.
 */
export function FichaDeAlumnoPagina() {
  const { idAlumno: parametro } = useParams()
  const idAlumno = Number(parametro)

  const [alumno, setAlumno] = useState<AlumnoDelProfesor | null>(null)
  const [clases, setClases] = useState<ReservaResumen[]>([])
  const [notas, setNotas] = useState<NotaResumen[]>([])
  const [materiales, setMateriales] = useState<MaterialResumen[]>([])
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
      const hasta = hoy()
      const [mios, sus, susMateriales, agendaReciente] = await Promise.all([
        misAlumnos(),
        misNotas(idAlumno),
        misMaterialesSubidos(idAlumno),
        miAgenda(sumarDias(hasta, -DIAS_DE_CLASES_RECIENTES), hasta),
      ])

      const mio = mios.find((a) => a.idAlumno === idAlumno)
      if (!mio) {
        setError('Ese alumno no está en tu lista.')
        return
      }

      setAlumno(mio)
      setNotas(sus)
      setMateriales(susMateriales)
      // Se cruza por `idUsuario` y no por `idAlumno`: la participación en una
      // clase cuelga del usuario, no de la relación de alumno.
      // `AlumnoDelProfesor` trae los dos ids justamente para este cruce.
      setClases(agendaReciente.filter((r) => participa(r, mio.idUsuario)))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el alumno.')
    } finally {
      setCargando(false)
    }
  }, [idAlumno])

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
    <div className="max-w-3xl">
      <Volver />

      <CabeceraDePagina
        titulo={`${alumno.nombre} ${alumno.apellido}`}
        aclaracion={<>{alumno.disciplinas.length === 0
            ? 'Sin curso vigente'
            : alumno.disciplinas.map((d) => NOMBRE_DE_DISCIPLINA[d]).join(' · ')}
          {' · '}
          {alumno.clasesRestantes}{' '}
          {alumno.clasesRestantes === 1 ? 'clase restante' : 'clases restantes'}</>}
      />

      <Seguimiento
        alumno={alumno}
        alGuardar={(estado, observaciones) =>
          setAlumno({ ...alumno, estadoSeguimiento: estado, observaciones })
        }
      />

      <Notas
        idAlumno={idAlumno}
        notas={notas}
        clases={clases}
        idUsuarioDelAlumno={alumno.idUsuario}
        alCambiar={setNotas}
      />

      <Materiales
        materiales={materiales}
        nombre={alumno.nombre}
        alCambiar={(cambiado) =>
          setMateriales(
            materiales.map((m) => (m.idMaterial === cambiado.idMaterial ? cambiado : m)),
          )
        }
      />
    </div>
  )
}

function participa(reserva: ReservaResumen, idUsuario: number): boolean {
  // Una clase caída no se dictó, así que no hay nada que anotar sobre ella, y
  // quien se dio de baja de la participación no estuvo. Es la misma definición
  // de "clase que ocupó la sala" que usa todo el resto del sistema.
  if (reserva.estado === 'CANCELADA' || reserva.estado === 'REPROGRAMADA') return false

  return reserva.participantes.some(
    (p) => p.idUsuario === idUsuario && p.estadoAsistencia !== 'CANCELADA',
  )
}

function Volver() {
  return (
    <Link
      to="/mis-alumnos"
      className="mb-4 inline-block text-sm text-tenue underline underline-offset-2 hover:text-acento"
    >
      ← Mis alumnos
    </Link>
  )
}

// == El semáforo ============================================================

/**
 * Cómo viene el alumno.
 *
 * **Es un PUT y hay uno solo por par profesor-alumno**, así que la pantalla no
 * distingue "poner" de "mover": es un formulario que muestra lo que hay y lo
 * pisa. Por eso tampoco hay botón de borrar — un semáforo no se saca, se cambia.
 *
 * ⚠️ El `select` arranca **vacío** cuando nadie lo marcó todavía. Preseleccionar
 * "Va bien" convertiría no haberlo mirado en haberlo aprobado, a un click de
 * distancia.
 */
function Seguimiento({
  alumno,
  alGuardar,
}: {
  alumno: AlumnoDelProfesor
  alGuardar: (estado: EstadoSeguimiento, observaciones: string | null) => void
}) {
  const [estado, setEstado] = useState<EstadoSeguimiento | ''>(alumno.estadoSeguimiento ?? '')
  const [observaciones, setObservaciones] = useState(alumno.observaciones ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  async function guardar() {
    if (estado === '') return

    setGuardando(true)
    setError(null)
    try {
      const resultado = await fijarSeguimiento(alumno.idAlumno, {
        estado,
        observaciones: observaciones.trim() === '' ? undefined : observaciones.trim(),
      })
      alGuardar(resultado.estado, resultado.observaciones)
      setGuardado(true)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar el seguimiento.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-linea bg-superficie shadow-tarjeta p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="t-seccion">Cómo viene</h3>
        <Semaforo estado={alumno.estadoSeguimiento} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelect
          etiqueta="Estado"
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as EstadoSeguimiento | '')
            setGuardado(false)
          }}
        >
          <option value="">Sin marcar</option>
          {(Object.keys(NOMBRE_DE_SEGUIMIENTO) as EstadoSeguimiento[]).map((v) => (
            <option key={v} value={v}>
              {NOMBRE_DE_SEGUIMIENTO[v]}
            </option>
          ))}
        </CampoSelect>

        <label className="block">
          <span className="t-mono text-tenue">
            Observaciones
          </span>
          <textarea
            value={observaciones}
            onChange={(e) => {
              setObservaciones(e.target.value)
              setGuardado(false)
            }}
            rows={2}
            placeholder="Por qué. Es lo que hace útil un requiere atención."
            className={`mt-1.5 w-full ${CONTROL_DE_FILTRO}`}
          />
        </label>
      </div>

      {error && (
        <div className="mt-3">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Boton
          onClick={() => {
            void guardar()
          }}
          disabled={guardando || estado === ''}
        >
          Guardar seguimiento
        </Boton>
        {guardado && <span className="text-xs text-tenue">Guardado.</span>}
      </div>
    </section>
  )
}

// == Las notas ==============================================================

/**
 * Mis notas sobre este alumno.
 *
 * **Una nota puede colgar de una clase o ser general**, y el desplegable de
 * clase es el que lo decide. El valor que viaja es el **id de la participación**,
 * no el de la reserva: la nota es sobre *este alumno en esa clase*, y por eso el
 * de otro alumno vuelve rechazado desde la base.
 *
 * Solo se ofrecen las clases de los últimos {@link DIAS_DE_CLASES_RECIENTES}
 * días, que es de lo que uno se acuerda para anotar. Para lo demás está la
 * observación general.
 */
function Notas({
  idAlumno,
  notas,
  clases,
  idUsuarioDelAlumno,
  alCambiar,
}: {
  idAlumno: number
  notas: NotaResumen[]
  clases: ReservaResumen[]
  idUsuarioDelAlumno: number
  alCambiar: (notas: NotaResumen[]) => void
}) {
  const [contenido, setContenido] = useState('')
  const [idParticipacion, setIdParticipacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<number | null>(null)
  const [textoEditado, setTextoEditado] = useState('')

  async function agregar() {
    setGuardando(true)
    setError(null)
    try {
      const nueva = await anotar({
        idAlumno,
        idParticipacion: idParticipacion === '' ? undefined : Number(idParticipacion),
        contenido: contenido.trim(),
      })
      alCambiar([nueva, ...notas])
      setContenido('')
      setIdParticipacion('')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar la nota.')
    } finally {
      setGuardando(false)
    }
  }

  async function corregir(idNota: number) {
    setGuardando(true)
    setError(null)
    try {
      const corregida = await corregirNota(idNota, textoEditado.trim())
      alCambiar(notas.map((n) => (n.idNota === idNota ? corregida : n)))
      setEditando(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo corregir la nota.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-linea bg-superficie shadow-tarjeta p-5">
      <h3 className="t-seccion">Mis notas</h3>
      <p className="mt-1 text-sm text-tenue">
        Privadas: no las ve el alumno ni otro profesor.
      </p>

      <div className="mt-4 space-y-3">
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          rows={3}
          placeholder="Qué pasó en la clase, qué practicar, cómo viene."
          aria-label="Nota"
          className={`w-full ${CONTROL_DE_FILTRO}`}
        />

        <div className="flex flex-wrap items-end gap-3">
          <CampoSelect
            etiqueta="Sobre qué clase"
            value={idParticipacion}
            onChange={(e) => setIdParticipacion(e.target.value)}
            className="min-w-64 grow"
          >
            <option value="">Observación general</option>
            {clases.map((c) => {
              const suya = c.participantes.find((p) => p.idUsuario === idUsuarioDelAlumno)
              if (!suya) return null
              return (
                <option key={suya.idParticipacion} value={suya.idParticipacion}>
                  {diaYMes(c.fecha)} {hhmm(c.horaInicio)} · {c.tipoUso}
                </option>
              )
            })}
          </CampoSelect>

          <Boton
            onClick={() => {
              void agregar()
            }}
            disabled={guardando || contenido.trim() === ''}
          >
            Guardar nota
          </Boton>
        </div>

        {clases.length === 0 && (
          <p className="text-xs text-apagado">
            No diste clases con este alumno en los últimos {DIAS_DE_CLASES_RECIENTES} días,
            así que la nota queda como observación general.
          </p>
        )}
      </div>

      {error && (
        <div className="mt-3">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {notas.length === 0 ? (
        <p className="mt-5 text-sm text-tenue">Todavía no anotaste nada sobre este alumno.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {notas.map((n) => (
            <li key={n.idNota} className="rounded-md border border-linea px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-tenue">
                <span>
                  {n.fechaDeLaClase
                    ? `Clase del ${diaYMes(n.fechaDeLaClase)}`
                    : 'Observación general'}
                </span>
                <span className="text-apagado">
                  {cuando(n.fechaCreacion)}
                  {n.fechaModificacion && ' · editada'}
                </span>
              </div>

              {editando === n.idNota ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={textoEditado}
                    onChange={(e) => setTextoEditado(e.target.value)}
                    rows={3}
                    aria-label="Corregir la nota"
                    className={`w-full ${CONTROL_DE_FILTRO}`}
                  />
                  <div className="flex gap-2">
                    <Boton
                      onClick={() => {
                        void corregir(n.idNota)
                      }}
                      disabled={guardando || textoEditado.trim() === ''}
                    >
                      Guardar corrección
                    </Boton>
                    <Boton variante="secundario" onClick={() => setEditando(null)}>
                      Cancelar
                    </Boton>
                  </div>
                </div>
              ) : (
                <div className="mt-1 flex items-start justify-between gap-3">
                  <p className="whitespace-pre-wrap text-sm">{n.contenido}</p>
                  <Boton variante="enlace"
                    type="button"
                    onClick={() => {
                      setEditando(n.idNota)
                      setTextoEditado(n.contenido)
                    }} className="shrink-0">
                    Corregir
                  </Boton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// == El material ============================================================

/**
 * Lo que le subí a este alumno.
 *
 * **Muestra también lo no publicado**, que es la diferencia con lo que ve el
 * alumno: el profesor necesita ver qué tiene preparado. El interruptor es la
 * regla dura *"el alumno lo ve solo si el profesor lo habilitó"*, así que dice
 * en qué estado está y no solo qué hace.
 *
 * Lo grupal no aparece acá: se pide por alumno y el material de todos no es de
 * nadie en particular. Está entero en *Subir material*.
 */
function Materiales({
  materiales,
  nombre,
  alCambiar,
}: {
  materiales: MaterialResumen[]
  nombre: string
  alCambiar: (material: MaterialResumen) => void
}) {
  const [error, setError] = useState<string | null>(null)

  async function alternar(material: MaterialResumen) {
    setError(null)
    try {
      alCambiar(await cambiarVisibilidad(material.idMaterial, !material.visibleAlumno))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cambiar la visibilidad.')
    }
  }

  return (
    <section className="rounded-lg border border-linea bg-superficie shadow-tarjeta p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="t-seccion">Material para {nombre}</h3>
        <Link
          to="/material"
          className="text-sm text-tenue underline underline-offset-2 hover:text-acento"
        >
          Subir material
        </Link>
      </div>

      {error && (
        <div className="mt-3">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {materiales.length === 0 ? (
        <EstadoVacio titulo="Todavía no le subiste nada." marca={false}>
          Lo que subas para todo el grupo no aparece acá.
        </EstadoVacio>
      ) : (
        <ul className="mt-4 space-y-2">
          {materiales.map((m) => (
            <li
              key={m.idMaterial}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-linea px-4 py-3"
            >
              <div className="min-w-40 grow">
                <div className="text-sm font-medium">{m.titulo}</div>
                <div className="text-xs text-tenue">
                  {m.tipo ?? 'Sin tipo'} · {cuando(m.fechaSubida)}
                  {m.urlExterna && (
                    <>
                      {' · '}
                      <a
                        href={m.urlExterna}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:text-acento"
                      >
                        Abrir
                      </a>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-xs ${m.visibleAlumno ? 'text-tenue' : 'text-apagado'}`}>
                  {m.visibleAlumno ? 'Lo ve el alumno' : 'No publicado'}
                </span>
                <Boton
                  variante="secundario"
                  onClick={() => {
                    void alternar(m)
                  }}
                >
                  {m.visibleAlumno ? 'Ocultar' : 'Publicar'}
                </Boton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
