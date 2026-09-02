import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import {
  agenda,
  estadoDeCuenta,
  listarInscripciones,
  materialesDelAlumno,
  notasDelAlumno,
  obtenerAlumno,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import type {
  AlumnoResumen,
  EstadoDeCuenta as EstadoDeCuentaResumen,
  EstadoInscripcion,
  InscripcionResumen,
  ReservaResumen,
} from '../api/tiposAdmin'
import type { MaterialResumen, NotaDeAlumno } from '../api/tiposDocencia'
import { Aviso } from '../componentes/Boton'
import { Paginado } from '../componentes/Paginado'
import { importe } from '../componentes/dinero'
import { NOMBRE_DE_DISCIPLINA, capitalizar } from '../componentes/presentacion'
import { hoy, sumarDias } from '../componentes/semana'
import { Tabla, Celda, FilaVacia } from '../componentes/Tabla'
import { Etiqueta } from '../componentes/Etiqueta'
import { Bloque } from '../componentes/Bloque'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { EstadoVacio } from '../componentes/EstadoVacio'

/**
 * Módulo 1, pantalla 3 — el perfil del alumno.
 *
 * **De los seis bloques que pide `platform.md` §4, esta pantalla construye
 * cinco** (2026-08-16). Eran dos cuando se escribió: historial de clases y
 * estado de cuenta se llenaron al llegar los módulos 2 y 3, que son los que
 * traen `reserva` y `pago`. El sexto —notas y materiales— necesita
 * `nota_profesor` y llega con el Módulo 5.
 *
 * El que falta **se dibuja igual, dicho**, en vez de omitirse. Es la misma
 * decisión que toma `menu.ts` con las secciones todavía no construidas: un
 * bloque ausente se lee como que el sistema perdió el dato, y uno que dice
 * "llega con el Módulo 5" se lee como lo que es.
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

      <CabeceraDePagina
        titulo={`${alumno.nombre} ${alumno.apellido}`}
        aclaracion={<><span>{capitalizar(alumno.estadoAlumno)} desde el {fecha(alumno.fechaIngreso)}</span>
          {/* Dos ejes distintos: el alumno puede estar activo y la cuenta dada
              de baja. Si no se dice, "activo" parece significar que entra. */}
          {!alumno.usuarioActivo && (
            <Etiqueta tono="atencion">Cuenta desactivada</Etiqueta>
          )}</>}
      />

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
            <EstadoVacio titulo="No tiene ninguna inscripción vigente." marca={false} />
          )}
        </Bloque>
      </div>

      <h3 className="t-seccion mb-3 mt-8">
        Inscripciones{' '}
        <span className="font-normal text-tenue">({totalInscripciones})</span>
      </h3>

      {/* Todas, no solo las vigentes: acá es donde vive el "recorrido formativo,
          niveles completados" que pide el Módulo 1. El listado de alumnos hace
          lo contrario y filtra por vigentes, porque contesta otra pregunta. */}
      <Tabla columnas={['Curso', 'Profesor', 'Clases', 'Inicio', 'Estado']}>
            {inscripciones.map((i) => (
              <tr key={i.idInscripcion}>
                <Celda>
                  <div>{NOMBRE_DE_DISCIPLINA[i.disciplina]}</div>
                  <div className="text-xs text-tenue">
                    {i.nivel ? capitalizar(i.nivel) : 'Sin nivel'}
                  </div>
                </Celda>
                <Celda className="text-tenue">
                  {i.profesor ?? <span className="text-apagado">Sin asignar</span>}
                </Celda>
                {/* Las clases restantes son POR INSCRIPCIÓN y no hay un total:
                    nadie "tiene 5 clases", tiene 5 de DJ y 3 de mentoría. Es el
                    mismo razonamiento de §3.3 con el estado de pago — un número
                    único de algo que vive abajo miente. */}
                <Celda className="whitespace-nowrap">
                  <div className="font-medium">{`${i.clasesRestantes} de ${i.clasesContratadas}`}</div>
                  <div className="text-xs text-tenue">clases restantes</div>
                </Celda>
                <Celda className="whitespace-nowrap text-tenue">
                  {i.fechaInicio ? fecha(i.fechaInicio) : <span className="text-apagado">A acordar</span>}
                </Celda>
                <Celda>
                  <EtiquetaEstado estado={i.estado} />
                </Celda>
              </tr>
            ))}

            {inscripciones.length === 0 && (
              <FilaVacia columnas={5}>
                Este alumno todavía no tiene ninguna inscripción.
              </FilaVacia>
            )}
          </Tabla>

      <Paginado
        pagina={pagina}
        totalPaginas={totalPaginas}
        totalElementos={totalInscripciones}
        onCambiar={setPagina}
      />

      {alumno && <HistorialDeClases idUsuario={alumno.idUsuario} />}
      {alumno && <EstadoDeCuenta idUsuario={alumno.idUsuario} />}

      <NotasYMateriales idAlumno={idAlumno} />
    </div>
  )
}

function Volver() {
  return (
    <Link
      to="/admin/alumnos"
      className="mb-4 inline-block text-sm text-tenue underline underline-offset-2 transition-colors hover:text-acento"
    >
      ← Volver a Alumnos
    </Link>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <p className="mb-2 text-sm last:mb-0">
      <span className="t-mono text-tenue">{etiqueta}: </span>
      {valor ?? <span className="text-apagado">—</span>}
    </p>
  )
}

function EtiquetaEstado({ estado }: { estado: EstadoInscripcion }) {
  const estilo = {
    ACTIVA: 'border-texto/20 text-texto',
    COMPLETADA: 'border-linea text-apagado',
    PAUSADA: 'border-linea text-apagado',
    CANCELADA: 'border-red/40 text-acento',
  }[estado]

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${estilo}`}>
      {capitalizar(estado)}
    </span>
  )
}

/**
 * Lo que al perfil todavía le falta, nombrado.
 *
 * <p>Se dice en vez de omitirse porque quien abre el perfil buscando las notas
 * del profesor y no las encuentra no puede distinguir "el sistema no las tiene
 * todavía" de "el sistema perdió el dato". Nombra el módulo que lo trae, así el
 * cartel también sirve de estado de avance.
 *
 * <p><b>Eran tres y quedó uno</b> (2026-08-16): historial de clases y estado de
 * cuenta se llenaron cuando llegaron los módulos 2 y 3. Cuando llegue el 5, este
 * bloque se borra entero.
 */
/**
 * <b>Bloque 6 del perfil — el último que faltaba, disponible desde el Módulo 5.</b>
 *
 * <p>Era un cartel de "todavía no disponible" hasta que existieron
 * {@code nota_profesor} y {@code material}. Con esto la ficha construye los seis
 * bloques que pide §4.
 *
 * <p><b>Que administración lea las notas privadas es una regla explícita de §8</b>
 * —<i>"no las ven ni el alumno ni otros profesores. Administración sí"</i>— y no
 * una filtración: es quien atiende al alumno cuando el profesor no está. Por eso
 * cada nota viene firmada: sin el autor, tres notas de tres profesores no se
 * pueden leer.
 *
 * <p><b>Es de solo lectura.</b> Corregir una nota es del autor y publicar un
 * material es del profesor que lo subió; los botones de eso viven en el portal
 * del profesor, no acá.
 */
function NotasYMateriales({ idAlumno }: { idAlumno: number }) {
  const [notas, setNotas] = useState<NotaDeAlumno[]>([])
  const [materiales, setMateriales] = useState<MaterialResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([notasDelAlumno(idAlumno), materialesDelAlumno(idAlumno)])
      .then(([sus, susMateriales]) => {
        setNotas(sus)
        setMateriales(susMateriales)
      })
      .catch((e: unknown) =>
        setError(
          e instanceof ApiError ? e.message : 'No se pudieron cargar las notas y materiales.',
        ),
      )
      .finally(() => setCargando(false))
  }, [idAlumno])

  return (
    <section className="mt-8">
      <h3 className="t-seccion mb-3">Notas de profesores y materiales</h3>

      {error && <Aviso>{error}</Aviso>}
      {!error && cargando && <p className="text-sm text-tenue">Cargando…</p>}

      {!error && !cargando && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Bloque titulo="Notas de sus profesores">
            {notas.length === 0 ? (
              <p className="text-sm text-apagado">Nadie anotó nada todavía.</p>
            ) : (
              <ul className="space-y-3">
                {notas.map((n) => (
                  <li key={n.idNota} className="border-b border-linea pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-wrap justify-between gap-2 text-xs text-tenue">
                      <span>{n.profesor}</span>
                      <span className="text-apagado">
                        {n.fechaDeLaClase ? `clase del ${fecha(n.fechaDeLaClase)}` : 'general'}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{n.contenido}</p>
                  </li>
                ))}
              </ul>
            )}
          </Bloque>

          <Bloque titulo="Materiales entregados">
            {materiales.length === 0 ? (
              <p className="text-sm text-apagado">Todavía no le entregaron material.</p>
            ) : (
              <ul className="space-y-3">
                {materiales.map((m) => (
                  <li
                    key={m.idMaterial}
                    className="border-b border-linea pb-3 last:border-0 last:pb-0"
                  >
                    <div className="text-sm font-medium">{m.titulo}</div>
                    <div className="text-xs text-tenue">
                      {m.profesor} · {m.curso}
                      {/* De qué clase es, si es de una: null significa que es
                          material de todo el curso (`V23`, §18 · P41). */}
                      {m.clase && ` · clase del ${m.clase.slice(0, 10)}`}
                      {/* Lo no publicado se muestra dicho: el alumno todavía no
                          lo tiene, y una ficha que lo liste sin aclararlo hace
                          creer que ya se lo entregaron. */}
                      {!m.visibleAlumno && (
                        <span className="text-apagado"> · sin publicar</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Bloque>
        </div>
      )}
    </section>
  )
}

/**
 * <b>Bloque 4 del perfil, disponible desde el Módulo 2.</b>
 *
 * <p>Las clases del alumno, de la más reciente a la más vieja, incluidas las que
 * se cayeron: una clase cancelada es parte del historial y además explica por
 * qué las clases restantes no bajaron.
 *
 * <p><b>Se filtra por participante del lado del cliente</b>, y eso es una
 * decisión con fecha de vencimiento: la agenda es por sala, no por persona, y un
 * endpoint "las clases de este alumno" es del portal del alumno (Módulo 4).
 * Mientras tanto el rango acotado es lo que lo hace barato — el backend rechaza
 * más de 62 días de agenda, y la pregunta del perfil es qué viene y qué pasó
 * hace poco, no el año entero.
 */
function HistorialDeClases({ idUsuario }: { idUsuario: number }) {
  const [clases, setClases] = useState<ReservaResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    agenda({ desde: sumarDias(hoy(), -45), hasta: sumarDias(hoy(), 15), incluirCanceladas: true })
      .then((todas) =>
        setClases(
          todas
            .filter((r) => r.participantes.some((p) => p.idUsuario === idUsuario))
            .sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
        ),
      )
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'No se pudo cargar el historial.'),
      )
      .finally(() => setCargando(false))
  }, [idUsuario])

  return (
    <section className="mt-8">
      <h3 className="t-seccion mb-3">
        Historial de clases{' '}
        <span className="text-sm font-normal text-tenue">(últimos 45 días)</span>
      </h3>

      {error && <Aviso>{error}</Aviso>}
      {!error && cargando && <p className="text-sm text-tenue">Cargando…</p>}
      {!error && !cargando && clases.length === 0 && (
        <p className="text-sm text-apagado">No tiene clases cargadas en este período.</p>
      )}

      {clases.length > 0 && (
        <ul className="divide-y divide-linea rounded-lg border border-linea bg-superficie shadow-tarjeta">
          {clases.map((clase) => {
            const suya = clase.participantes.find((p) => p.idUsuario === idUsuario)!
            const caida = clase.estado === 'CANCELADA' || clase.estado === 'REPROGRAMADA'

            return (
              <li
                key={clase.idReserva}
                className={`flex items-baseline justify-between gap-4 px-4 py-3 text-sm ${
                  caida ? 'text-apagado' : ''
                }`}
              >
                <div>
                  <span className={caida ? 'line-through' : 'font-medium'}>
                    {fecha(clase.fecha)}
                  </span>{' '}
                  <span className="text-tenue">
                    {clase.horaInicio.slice(0, 5)} · {clase.tipoUso} · {clase.sala}
                  </span>
                  {/* Sin inscripción la clase no le descontó nada del curso, y
                      eso es la mitad de la cuenta de clases restantes. */}
                  {suya.idInscripcion === null && (
                    <div className="text-xs text-apagado">no descuenta clases</div>
                  )}
                </div>
                <span className="whitespace-nowrap text-xs text-tenue">
                  {caida
                    ? capitalizar(clase.estado)
                    : capitalizar(suya.estadoAsistencia.replace('_', ' '))}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/**
 * <b>Bloque 5 del perfil, disponible desde el Módulo 3.</b>
 *
 * <p>El resumen, no la pantalla entera: saldos por moneda y lo que resta de cada
 * curso, con un enlace al estado de cuenta completo. <b>No hay un saldo único</b>
 * (§3.3) ni se resta entre monedas (§2.3) — acá tampoco, aunque entre en una
 * línea.
 */
function EstadoDeCuenta({ idUsuario }: { idUsuario: number }) {
  const [cuenta, setCuenta] = useState<EstadoDeCuentaResumen | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    estadoDeCuenta(idUsuario)
      .then(setCuenta)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'No se pudo cargar el estado de cuenta.'),
      )
  }, [idUsuario])

  if (error) return <Aviso>{error}</Aviso>
  if (!cuenta) return null

  const debiendo = cuenta.contratos.filter((c) => !c.saldado)

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h3 className="t-seccion">Estado de cuenta</h3>
        <Link
          to={`/admin/estado-de-cuenta/${idUsuario}`}
          className="text-xs text-tenue underline underline-offset-2 hover:text-acento"
        >
          Ver completo
        </Link>
      </div>

      {cuenta.saldos.length === 0 ? (
        <p className="text-sm text-apagado">Todavía no tiene movimientos.</p>
      ) : (
        <div className="rounded-lg border border-linea bg-superficie shadow-tarjeta p-5">
          <dl className="space-y-1.5 text-sm">
            {cuenta.saldos.map((s) => (
              <div key={s.moneda} className="flex items-baseline justify-between gap-3">
                <dt className="text-tenue">
                  Pagado en {s.moneda === 'USD' ? 'dólares' : 'pesos'}
                </dt>
                <dd className="tabular-nums">{importe(s.pagado, s.moneda)}</dd>
              </div>
            ))}
            {cuenta.saldos
              .filter((s) => s.adeudado > 0)
              .map((s) => (
                <div
                  key={`debe-${s.moneda}`}
                  className="flex items-baseline justify-between gap-3 text-acento"
                >
                  <dt>Debe</dt>
                  <dd className="tabular-nums">{importe(s.adeudado, s.moneda)}</dd>
                </div>
              ))}
          </dl>

          {debiendo.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-linea pt-3 text-xs text-tenue">
              {debiendo.map((c) => (
                <li key={c.idInscripcion} className="flex justify-between gap-3">
                  <span>
                    {NOMBRE_DE_DISCIPLINA[c.disciplina]}
                    {/* §13: con el 50% cubierto ya se puede reservar. Es el dato
                        previo a darle un horario. */}
                    {!c.senado && <span className="ml-2 text-acento">sin seña</span>}
                  </span>
                  <span className="tabular-nums">resta {importe(c.saldo, c.moneda)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

/** `2026-09-01` → `01/09/2026`, sin pasar por `Date` para no correr un día. */
function fecha(iso: string): string {
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}
